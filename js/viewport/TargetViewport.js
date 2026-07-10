(function () {
  const App = window.ArcheryApp;
  const { VIEWPORT } = App.Constants;

  class TargetViewport {
    constructor(options) {
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.hud = options.hud;
      this.zoomHud = options.zoomHud;
      this.onPlot = options.onPlot;
      this.modeHud = options.modeHud;
      this.modeBadge = options.modeBadge;
      this.extrapolationWarning = options.extrapolationWarning;
      this.targetSwapWarning = options.targetSwapWarning;
      this.state = null;
      this.targetFace = null;
      this.raf = null;
      this.needsDraw = true;
      this.scoreFeedback = [];
      this.pointerScreen = null;
      this.groupFocusAmount = 0;
      this.groupFocusTarget = 0;
      this.groupHoverState = null;
      this.currentExtrapolationScale = 1;
      this.targetExtrapolationScale = 1;
      this.timelineOverlayKey = null;
      this.timelineOverlayCurrent = null;
      this.timelineOverlayAnimation = null;
      this.timelineEndOverlayCache = new Map();
      this.timelineFitKey = null;
      this.pointerInteractionActive = false;
      this.hudRevision = 0;
      this.hudStaticKey = "";
      this.zoomHudText = "";
      this.modeBadgeMode = "__unset__";
      this.extrapolationWarningKey = "__unset__";
      this.targetSwapWarningKey = "__unset__";
      this.transform = {
        currentPxPerMm: 0.62,
        targetPxPerMm: 0.62,
        currentPanX: 0,
        currentPanY: 0,
        targetPanX: 0,
        targetPanY: 0
      };

      // ResizeObserver can fire between animation frames while the split view is
      // dragged or snapped by Invert. Changing canvas.width/height immediately
      // clears the canvas backing store, which can show a one-frame black flash
      // before the next draw. Defer the backing-store resize to draw(), where
      // resize + repaint happen together in the same RAF tick. Keep the CSS size
      // controlled by #targetCanvas { width: 100%; height: 100%; } so the visible
      // canvas box follows the viewport immediately instead of holding a stale
      // inline pixel width for one frame.
      this.resizeObserver = new ResizeObserver(() => {
        this.requestDraw();
      });
      this.resizeObserver.observe(this.canvas.parentElement);
      App.InteractionController.attachInteractions(this);
      this.resizeCanvas();
      this.startLoop();
    }

    setState(state) {
      this.state = state;
      this.targetFace = state.scorecard ? App.TargetFaces.getTargetFace(state.scorecard.activeViewTargetFaceId) : null;
      this.hudRevision += 1;
      this.hudStaticKey = "";
      const extrapolation = App.Extrapolation.getTransform(state.scorecard, state.viewport);
      this.targetExtrapolationScale = extrapolation.enabled ? extrapolation.scale : 1;
      this.applyTimelineFitIfNeeded();
      this.requestDraw();
      this.updateHud();
    }

    resizeCanvas() {
      const parent = this.canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (this.canvas.style.width) this.canvas.style.width = "";
      if (this.canvas.style.height) this.canvas.style.height = "";
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    fitTarget(immediate = false) {
      if (!this.targetFace) return;
      if (App.TimelineRenderer.isSeparatedEndsMode(this.state?.viewport)) {
        this.fitSeparatedEndsGrid(immediate);
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const available = Math.max(120, Math.min(rect.width, rect.height) - VIEWPORT.FIT_PADDING_PX * 2);
      const scale = App.Geometry.clamp(available / this.targetFace.diameterMm, VIEWPORT.MIN_PX_PER_MM, VIEWPORT.MAX_PX_PER_MM);
      this.transform.targetPxPerMm = scale;
      this.transform.targetPanX = 0;
      this.transform.targetPanY = 0;
      if (immediate) {
        this.transform.currentPxPerMm = scale;
        this.transform.currentPanX = 0;
        this.transform.currentPanY = 0;
      }
      this.requestDraw();
    }

    fitSeparatedEndsGrid(immediate = false) {
      if (!this.targetFace) return;
      const rect = this.canvas.getBoundingClientRect();
      const scale = App.TimelineRenderer.getSeparatedEndsBaseScale(rect, this.targetFace);
      this.transform.targetPxPerMm = scale;
      this.transform.targetPanX = 0;
      this.transform.targetPanY = 0;
      if (immediate) {
        this.transform.currentPxPerMm = scale;
        this.transform.currentPanX = 0;
        this.transform.currentPanY = 0;
      }
      this.requestDraw();
    }

    applyTimelineFitIfNeeded() {
      if (!this.state || !this.targetFace) return;
      const timeline = App.TimelineRenderer.normalizeState(this.state.viewport.timeline);
      const modeKey = timeline.enabled ? timeline.viewMode : "off";
      const keyParts = [
        this.state.scorecard?.id || "scorecard",
        this.targetFace.id,
        modeKey
      ];

      // Only the separated-ends Timeline layout is a viewport-size-dependent
      // auto-fit. In the normal/full target view, including the canvas width in
      // this key caused the next unrelated state update after an Invert snap to
      // re-run fitTarget(true), wiping the user's custom zoom and pan.
      if (timeline.enabled && timeline.viewMode === "ends") {
        const rect = this.canvas.getBoundingClientRect();
        keyParts.push(Math.round(rect.width), Math.round(rect.height));
      }

      const key = keyParts.join(":");
      if (key === this.timelineFitKey) return;
      this.timelineFitKey = key;
      if (timeline.enabled && timeline.viewMode === "ends") {
        this.fitSeparatedEndsGrid(true);
      } else {
        this.fitTarget(true);
      }
    }

    resetView() {
      this.transform.targetPanX = 0;
      this.transform.targetPanY = 0;
      this.requestDraw();
    }

    requestDraw() {
      this.needsDraw = true;
    }

    flushResizeDraw() {
      // Programmatic workspace snaps can change the canvas CSS box before the
      // next RAF. Repaint synchronously after the layout has settled so the
      // browser never presents a stretched/cropped copy of the old backing
      // store for one frame.
      this.needsDraw = false;
      this.draw();
    }

    startLoop() {
      const tick = () => {
        const now = performance.now();
        this.advanceTimeline(now);
        this.animateTransform();
        this.animateExtrapolation();
        this.animateGroupFocus();
        if (this.scoreFeedback.length) {
          this.needsDraw = true;
        }
        if (this.needsDraw) {
          this.needsDraw = false;
          this.draw();
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    advanceTimeline(now) {
      const timeline = this.state?.viewport?.timeline;
      if (!timeline || !timeline.enabled || !timeline.playing || !this.state.scorecard) return;
      const total = App.TimelineRenderer.countTimelineFrames(this.state.scorecard, this.state.viewport);
      if (total <= 0) {
        App.State.setTimelinePlaying(false);
        return;
      }
      const revealed = Math.floor(Number(timeline.revealedCount) || 0);
      if (revealed >= total) {
        App.State.setTimelinePlaying(false);
        return;
      }
      const stepMs = App.TimelineRenderer.getStepMs(timeline.speed);
      if (!timeline.lastStepAt) timeline.lastStepAt = now - stepMs;
      if (now - timeline.lastStepAt < stepMs) return;
      timeline.lastStepAt = now;
      App.State.setTimelineRevealCount(revealed + 1, { reason: "timelineFrame" });
    }

    animateTransform() {
      const t = this.transform;
      const scaleDelta = t.targetPxPerMm - t.currentPxPerMm;
      const panXDelta = t.targetPanX - t.currentPanX;
      const panYDelta = t.targetPanY - t.currentPanY;

      if (Math.abs(scaleDelta) > 0.0001) {
        t.currentPxPerMm += scaleDelta * VIEWPORT.ZOOM_EASE;
        this.needsDraw = true;
      } else if (t.currentPxPerMm !== t.targetPxPerMm) {
        t.currentPxPerMm = t.targetPxPerMm;
        this.needsDraw = true;
      }

      if (Math.abs(panXDelta) > 0.05 || Math.abs(panYDelta) > 0.05) {
        t.currentPanX += panXDelta * VIEWPORT.PAN_EASE;
        t.currentPanY += panYDelta * VIEWPORT.PAN_EASE;
        this.needsDraw = true;
      } else if (t.currentPanX !== t.targetPanX || t.currentPanY !== t.targetPanY) {
        t.currentPanX = t.targetPanX;
        t.currentPanY = t.targetPanY;
        this.needsDraw = true;
      }
    }


    animateExtrapolation() {
      const config = App.Constants.EXTRAPOLATION || { SCALE_EASE: 0.18 };
      const delta = this.targetExtrapolationScale - this.currentExtrapolationScale;
      if (Math.abs(delta) > 0.0005) {
        this.currentExtrapolationScale += delta * (config.SCALE_EASE || 0.18);
        this.needsDraw = true;
      } else {
        this.currentExtrapolationScale = this.targetExtrapolationScale;
      }
    }

    getRenderExtrapolation() {
      const extrapolation = App.Extrapolation.getTransform(this.state?.scorecard, this.state?.viewport || {});
      if (!extrapolation.enabled) return null;
      return {
        ...extrapolation,
        scale: this.currentExtrapolationScale
      };
    }

    animateGroupFocus() {
      const delta = this.groupFocusTarget - this.groupFocusAmount;
      if (Math.abs(delta) > 0.01) {
        this.groupFocusAmount += delta * 0.18;
        this.needsDraw = true;
      } else {
        this.groupFocusAmount = this.groupFocusTarget;
      }
    }

    setPointerInteractionActive(active) {
      const next = Boolean(active);
      if (this.pointerInteractionActive === next) return;
      this.pointerInteractionActive = next;
      this.requestDraw();
    }

    isFastInteractionActive() {
      const t = this.transform;
      return this.pointerInteractionActive
        || Math.abs(t.targetPxPerMm - t.currentPxPerMm) > 0.0001
        || Math.abs(t.targetPanX - t.currentPanX) > 0.05
        || Math.abs(t.targetPanY - t.currentPanY) > 0.05;
    }

    draw() {
      this.resizeCanvas();
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.__archeryRenderRect = rect;

      try {
        this.ctx.clearRect(0, 0, rect.width, rect.height);
        drawGrid(this.ctx, rect, this.transform);

        if (!this.state || !this.state.scorecard || !this.targetFace) {
          drawEmptyMessage(this.ctx, rect);
          return;
        }

        const renderExtrapolation = this.getRenderExtrapolation();
        const timelineActive = App.TimelineRenderer.isActive(this.state.viewport);
        const timelineEndsMode = App.TimelineRenderer.isSeparatedEndsMode(this.state.viewport);

        if (timelineActive && timelineEndsMode) {
          const now = performance.now();
          const targetItems = App.TimelineRenderer.calculateSeparatedEndOverlays(this.state.scorecard, this.state.viewport, {
            extrapolation: renderExtrapolation
          });
          const overlaysByEnd = this.getTimelineEndOverlaysForDraw(targetItems, renderExtrapolation, now);
          this.groupHoverState = null;
          this.groupFocusTarget = 0;
          this.timelineOverlayKey = null;
          this.timelineOverlayCurrent = null;
          this.timelineOverlayAnimation = null;
          App.TimelineRenderer.drawSeparatedEnds(this.ctx, this.canvas, rect, this.state.scorecard, this.targetFace, this.state.viewport, {
            extrapolation: renderExtrapolation,
            overlaysByEnd,
            transform: this.transform,
            pointerScreen: this.pointerScreen
          });
          this.drawScoreFeedback(now);
          this.updateHud();
          return;
        }

        this.timelineEndOverlayCache.clear();
        const groupingEnabled = !timelineActive && (this.state.viewport.showRadialGrouping || this.state.viewport.showSimpleGrouping);
        const hoverState = groupingEnabled
          ? App.GroupingRenderer.getGroupingHoverState(this.canvas, this.transform, this.state.scorecard, {
              visibleEndIndex: this.state.viewport.visibleEndIndex,
              extrapolation: renderExtrapolation,
              showRadial: this.state.viewport.showRadialGrouping,
              showSimple: this.state.viewport.showSimpleGrouping,
              pointerScreen: this.pointerScreen
            })
          : null;
        const timelineOverlayTarget = timelineActive
          ? App.TimelineRenderer.calculateTimelineOverlay(this.state.scorecard, this.state.viewport, { extrapolation: renderExtrapolation })
          : null;
        const groupingVisible = timelineActive
          ? Boolean(timelineOverlayTarget && timelineOverlayTarget.count > 0)
          : groupingEnabled && App.GroupingRenderer.getVisiblePlottedEntries(this.state.scorecard, this.state.viewport.visibleEndIndex, { extrapolation: renderExtrapolation }).length >= 2;
        const scorecardFocus = this.state.viewport.scorecardFocus || null;
        const ringBreakLuckOverlayActive = !timelineActive && Boolean(this.state.viewport.showRingBreakLuckOverlay) && Boolean(App.RingBreakLuckOverlayRenderer);
        const intelligenceOverlayActive = !timelineActive && Boolean(this.state.viewport.showIntelligenceOverlay) && Boolean(App.IntelligenceOverlayRenderer);
        const overlayFocusVisible = groupingVisible || ringBreakLuckOverlayActive || intelligenceOverlayActive;
        this.groupHoverState = hoverState;
        this.groupFocusTarget = overlayFocusVisible ? 1 : 0;

        const targetVisibility = scorecardFocus
          ? Math.min(this.state.viewport.targetFaceVisibility, 0.48)
          : this.state.viewport.targetFaceVisibility;
        App.TargetRenderer.drawTarget(this.ctx, this.canvas, this.transform, this.targetFace, {
          visibility: targetVisibility,
          drawShadow: !this.isFastInteractionActive()
        });
        drawGroupFocusScrim(this.ctx, rect, this.groupFocusAmount);
        App.ArrowRenderer.drawArrows(
          this.ctx,
          this.canvas,
          this.transform,
          this.state.scorecard,
          this.targetFace,
          this.state.selected,
          this.state.viewport.showArrowLabels,
          this.state.viewport.hoveredArrow,
          {
            visibleEndIndex: this.state.viewport.visibleEndIndex,
            extrapolation: renderExtrapolation,
            timeline: timelineActive ? this.state.viewport.timeline : null,
            scorecardFocus,
            arrowStyleResolver: ringBreakLuckOverlayActive
              ? entry => App.RingBreakLuckOverlayRenderer.resolveArrowStyle(entry.arrow, this.targetFace, { extrapolation: renderExtrapolation })
              : null
          }
        );
        if (timelineActive) {
          const timelineOverlay = this.getTimelineOverlayForDraw(timelineOverlayTarget, renderExtrapolation, performance.now());
          App.TimelineRenderer.drawMpiTrail(this.ctx, this.canvas, this.transform, this.state.scorecard, this.state.viewport, {
            extrapolation: renderExtrapolation,
            currentAnalysis: timelineOverlay?.analysis || timelineOverlay?.radial?.analysis || null
          });
          App.GroupingRenderer.drawGroupingOverlayStats(this.ctx, this.canvas, this.transform, timelineOverlay, {
            showLabel: false,
            focusAmount: this.groupFocusAmount
          });
        } else if (groupingEnabled) {
          App.GroupingRenderer.drawGroupingOverlay(this.ctx, this.canvas, this.transform, this.state.scorecard, {
            visibleEndIndex: this.state.viewport.visibleEndIndex,
            extrapolation: renderExtrapolation,
            showRadial: this.state.viewport.showRadialGrouping,
            showSimple: this.state.viewport.showSimpleGrouping,
            pointerScreen: this.pointerScreen,
            hoverState,
            focusAmount: this.groupFocusAmount
          });
        }
        if (intelligenceOverlayActive) {
          App.IntelligenceOverlayRenderer.drawIntelligenceOverlay(this.ctx, this.canvas, this.transform, this.state.scorecard, this.targetFace, {
            visibleEndIndex: this.state.viewport.visibleEndIndex,
            extrapolation: renderExtrapolation
          });
        }
        this.drawScoreFeedback(performance.now());
        App.ScaleRenderer.drawScale(this.ctx, this.canvas, this.transform);
        this.updateHud();
      } finally {
        delete this.canvas.__archeryRenderRect;
      }
    }

    getTimelineEndOverlaysForDraw(targetItems, renderExtrapolation, now) {
      const result = new Map();
      if (!App.TimelineRenderer.isSeparatedEndsMode(this.state?.viewport)) {
        this.timelineEndOverlayCache.clear();
        return result;
      }

      const timeline = this.state.viewport.timeline;
      const scorecardId = this.state.scorecard?.id || "scorecard";
      const extrapolationKey = renderExtrapolation?.enabled
        ? `${renderExtrapolation.sourceDistanceM}:${renderExtrapolation.targetDistanceM}:${Number(renderExtrapolation.scale || 1).toFixed(3)}`
        : "actual";
      const liveKeys = new Set();

      (targetItems || []).forEach(item => {
        const cacheKey = `${scorecardId}:end:${item.endIndex}:${timeline.viewMode}:${timeline.endPlaybackMode}:${timeline.revealedCount}:${extrapolationKey}`;
        liveKeys.add(item.endIndex);
        const cached = this.timelineEndOverlayCache.get(item.endIndex) || { key: null, current: null, animation: null };
        if (cacheKey !== cached.key) {
          cached.animation = {
            from: cached.current,
            to: item.overlay,
            startedAt: now,
            durationMs: App.TimelineRenderer.TWEEN_DURATION_MS
          };
          cached.key = cacheKey;
        }

        let overlay = item.overlay;
        if (cached.animation) {
          const progress = App.Geometry.clamp((now - cached.animation.startedAt) / cached.animation.durationMs, 0, 1);
          overlay = App.TimelineRenderer.interpolateOverlay(cached.animation.from, cached.animation.to, progress);
          cached.current = overlay;
          if (progress < 1) {
            this.needsDraw = true;
          } else {
            cached.animation = null;
            cached.current = item.overlay;
            overlay = item.overlay;
          }
        } else {
          cached.current = item.overlay;
        }

        this.timelineEndOverlayCache.set(item.endIndex, cached);
        result.set(item.endIndex, {
          ...item,
          overlay: overlay || item.overlay
        });
      });

      Array.from(this.timelineEndOverlayCache.keys()).forEach(key => {
        if (!liveKeys.has(key)) this.timelineEndOverlayCache.delete(key);
      });
      return result;
    }

    getTimelineOverlayForDraw(targetOverlay, renderExtrapolation, now) {
      if (!App.TimelineRenderer.isActive(this.state?.viewport)) {
        this.timelineOverlayKey = null;
        this.timelineOverlayCurrent = null;
        this.timelineOverlayAnimation = null;
        return null;
      }

      const timeline = this.state.viewport.timeline;
      const scorecardId = this.state.scorecard?.id || "scorecard";
      const extrapolationKey = renderExtrapolation?.enabled
        ? `${renderExtrapolation.sourceDistanceM}:${renderExtrapolation.targetDistanceM}:${Number(renderExtrapolation.scale || 1).toFixed(3)}`
        : "actual";
      const key = `${scorecardId}:${timeline.viewMode || "scorecard"}:${timeline.endPlaybackMode || "sequential"}:${timeline.revealedCount}:${extrapolationKey}`;

      if (key !== this.timelineOverlayKey) {
        this.timelineOverlayAnimation = {
          from: this.timelineOverlayCurrent,
          to: targetOverlay,
          startedAt: now,
          durationMs: App.TimelineRenderer.TWEEN_DURATION_MS
        };
        this.timelineOverlayKey = key;
      }

      const animation = this.timelineOverlayAnimation;
      if (!animation) {
        this.timelineOverlayCurrent = targetOverlay;
        return targetOverlay;
      }

      const progress = App.Geometry.clamp((now - animation.startedAt) / animation.durationMs, 0, 1);
      const current = App.TimelineRenderer.interpolateOverlay(animation.from, animation.to, progress);
      this.timelineOverlayCurrent = current;
      if (progress < 1) {
        this.needsDraw = true;
      } else {
        this.timelineOverlayAnimation = null;
        this.timelineOverlayCurrent = targetOverlay;
      }
      return current;
    }


    showScoreChangeFeedback(position, score) {
      if (!position || !score) return;
      const now = performance.now();
      const zone = this.targetFace && !score.isMiss
        ? this.targetFace.zones.find(item => item.id === score.zoneId)
        : null;
      const color = score.isMiss ? "#ff6b7a" : (zone && zone.fill) || "#55d6be";
      const textColor = readableTextColor(color);

      this.scoreFeedback.push({
        position: {
          xMm: Number(position.xMm) || 0,
          yMm: Number(position.yMm) || 0
        },
        label: String(score.label || ""),
        color,
        textColor,
        createdAt: now,
        durationMs: 920
      });

      if (this.scoreFeedback.length > 8) {
        this.scoreFeedback.splice(0, this.scoreFeedback.length - 8);
      }
      this.requestDraw();
    }

    drawScoreFeedback(now) {
      if (!this.scoreFeedback.length) return;
      const markerRadius = App.ArrowRenderer.getMarkerRadius(this.transform);
      const active = [];

      this.ctx.save();
      this.scoreFeedback.forEach(item => {
        const age = now - item.createdAt;
        const progress = App.Geometry.clamp(age / item.durationMs, 0, 1);
        if (progress >= 1) return;
        active.push(item);

        const eased = easeOutCubic(progress);
        const screen = App.ViewportMath.worldToScreen(item.position, this.canvas, this.transform);
        const y = screen.y - markerRadius - 18 - eased * 24;
        const alpha = Math.max(0, 1 - Math.pow(progress, 1.45));
        const scale = 0.92 + Math.min(progress / 0.18, 1) * 0.08;
        const label = item.label;

        this.ctx.globalAlpha = alpha;
        this.ctx.font = "900 14px Inter, system-ui, sans-serif";
        const metrics = this.ctx.measureText(label);
        const width = Math.max(34, metrics.width + 24);
        const height = 28;
        const x = screen.x - width / 2;
        const drawY = y - height / 2;

        this.ctx.save();
        this.ctx.translate(screen.x, y);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-screen.x, -y);

        this.ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
        this.ctx.shadowBlur = 18;
        this.ctx.shadowOffsetY = 8;
        this.ctx.beginPath();
        roundRect(this.ctx, x, drawY, width, height, 14);
        this.ctx.fillStyle = item.color;
        this.ctx.fill();
        this.ctx.shadowColor = "transparent";
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.76)";
        this.ctx.stroke();

        this.ctx.fillStyle = item.textColor;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(label, screen.x, y + 0.5);
        this.ctx.restore();
      });
      this.ctx.restore();

      this.scoreFeedback = active;
    }

    updateHud() {
      if (!this.state || !this.state.scorecard || !this.targetFace) {
        this.updateStaticHud("empty", () => {
          setElementHtml(this.hud, "No active scorecard");
          setElementHtml(this.zoomHud, "");
          setElementText(this.modeHud, "");
          this.updateModeBadge(null);
          this.updateExtrapolationWarning(null);
          this.updateTargetSwapWarning(null, null);
        });
        return;
      }
      if (this.state.viewport.displayMode === "trends") {
        this.updateStaticHud(`trends:${this.hudRevision}`, () => {
          setElementHtml(this.hud, "");
          setElementHtml(this.zoomHud, "");
          setElementText(this.modeHud, "Trends view · saved scorecard history");
          this.updateModeBadge(null);
          this.updateExtrapolationWarning(null);
          this.updateTargetSwapWarning(null, null);
        });
        return;
      }

      const scorecard = this.state.scorecard;
      if (App.TimelineRenderer.isActive(this.state.viewport)) {
        const extrapolation = App.Extrapolation.getTransform(scorecard, this.state.viewport);
        this.updateStaticHud(`timeline:${this.hudRevision}`, () => {
          const timelineStatus = App.TimelineRenderer.formatTimelineStatus(scorecard, this.state.viewport);
          setElementHtml(this.hud, "");
          this.updateExtrapolationWarning(extrapolation);
          this.updateTargetSwapWarning(scorecard, this.targetFace);
          setElementText(this.modeHud, timelineStatus.viewMode === "ends"
            ? "Timeline replay · separated ends view · drag empty space to pan · wheel to zoom"
            : "Timeline replay · arrows reveal in scorecard order · drag empty space to pan");
          this.canvas.dataset.mode = "locked";
          this.updateModeBadge(null);
        });
        this.updateZoomHud();
        return;
      }

      const extrapolation = App.Extrapolation.getTransform(scorecard, this.state.viewport);
      this.updateStaticHud(`normal:${this.hudRevision}`, () => {
        const scoringOptions = App.Extrapolation.getProjectedScoreOptions(scorecard, this.state.viewport);
        const summary = App.ScoreFormatting.formatSummary(scorecard, this.targetFace, scoringOptions);
        const originalFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
        const comparisonText = originalFace.id !== this.targetFace.id
          ? `<br><span>Shot on ${originalFace.shortName || originalFace.name}</span>`
          : "";
        const visibleText = this.state.viewport.visibleEndIndex === null
          ? "All ends"
          : `End ${this.state.viewport.visibleEndIndex + 1}`;
        const analysisText = getAnalysisHudText(scorecard, this.state.viewport.visibleEndIndex, scoringOptions.extrapolation);
        const analysisLine = analysisText ? `<br><span>${analysisText}</span>` : "";
        const dnaText = this.state.viewport.showIntelligenceOverlay
          ? getShotDnaHudText(scorecard, this.targetFace, this.state.viewport.visibleEndIndex, scoringOptions.extrapolation)
          : "";
        const dnaLine = dnaText ? `<br><span>${dnaText}</span>` : "";
        const extrapolationLine = extrapolation.enabled
          ? `<br><span>Projected ${App.Extrapolation.formatDistance(extrapolation.sourceDistanceM)} → ${App.Extrapolation.formatDistance(extrapolation.targetDistanceM)} · ${App.Extrapolation.formatScale(extrapolation.scale)}</span>`
          : "";
        setElementHtml(this.hud, `<strong>${this.targetFace.shortName || this.targetFace.name}</strong><br>${scorecard.distanceM}m · ${summary.arrowsText}<br><span>Showing ${visibleText}</span>${analysisLine}${dnaLine}${comparisonText}${extrapolationLine}`);
        this.updateExtrapolationWarning(extrapolation);
        this.updateTargetSwapWarning(scorecard, this.targetFace);
        if (this.modeHud && this.state.viewport.displayMode !== "trends") {
          const mode = this.state.viewport.interactionMode;
          const modeText = {
            plot: "Plot mode · left click to plot selected empty arrow · drag empty space to pan",
            edit: "Edit mode · click arrows to inspect · drag arrows to move",
            locked: "Locked mode · safe review · click arrows to inspect only"
          };
          setElementHtml(this.modeHud, modeText[mode] || modeText.plot);
          this.canvas.dataset.mode = mode;
        }
        this.updateModeBadge(this.state.viewport.interactionMode);
      });
      this.updateZoomHud();
    }

    updateStaticHud(key, render) {
      if (this.hudStaticKey === key) return;
      this.hudStaticKey = key;
      render();
    }

    updateZoomHud() {
      const html = `Zoom <strong>${Math.round(this.transform.currentPxPerMm * 100)}%</strong>`;
      if (this.zoomHudText === html && this.zoomHud?.innerHTML === html) return;
      this.zoomHudText = html;
      setElementHtml(this.zoomHud, html);
    }

    updateModeBadge(mode) {
      if (!this.modeBadge) return;
      const normalized = ["plot", "edit", "locked"].includes(mode) ? mode : null;
      if (this.modeBadgeMode === normalized) return;
      this.modeBadgeMode = normalized;
      if (!normalized) {
        this.modeBadge.classList.add("hidden");
        return;
      }
      const labels = {
        plot: "Plot",
        edit: "Edit",
        locked: "Locked"
      };
      this.modeBadge.className = `viewport-mode-badge is-${normalized}`;
      this.modeBadge.textContent = labels[normalized];
      this.modeBadge.setAttribute("aria-label", `Viewport interaction mode: ${labels[normalized]}`);
    }

    updateExtrapolationWarning(extrapolation) {
      if (!this.extrapolationWarning) return;
      const active = Boolean(extrapolation && extrapolation.enabled);
      const key = active
        ? `${App.Extrapolation.formatDistance(extrapolation.sourceDistanceM)}:${App.Extrapolation.formatDistance(extrapolation.targetDistanceM)}:${App.Extrapolation.formatScale(extrapolation.scale)}`
        : "inactive";
      if (this.extrapolationWarningKey === key) return;
      this.extrapolationWarningKey = key;
      this.extrapolationWarning.classList.toggle("hidden", !active);
      this.canvas?.parentElement?.classList.toggle("has-extrapolation-warning", active);
      if (!active) {
        setElementHtml(this.extrapolationWarning, "");
        return;
      }
      setElementHtml(this.extrapolationWarning, `<strong>Extrapolated view</strong><span>${App.Extrapolation.formatDistance(extrapolation.sourceDistanceM)} → ${App.Extrapolation.formatDistance(extrapolation.targetDistanceM)} · ${App.Extrapolation.formatScale(extrapolation.scale)} · projected scores only</span>`);
    }

    updateTargetSwapWarning(scorecard, targetFace) {
      if (!this.targetSwapWarning) return;
      if (!scorecard || !targetFace) {
        this.targetSwapWarning.classList.add("hidden");
        this.canvas?.parentElement?.classList.remove("has-target-swap-warning");
        this.targetSwapWarningKey = "inactive";
        setElementHtml(this.targetSwapWarning, "");
        return;
      }
      const originalFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
      const active = originalFace.id !== targetFace.id;
      const key = active ? `${originalFace.id}:${targetFace.id}` : "inactive";
      if (this.targetSwapWarningKey === key) return;
      this.targetSwapWarningKey = key;
      this.targetSwapWarning.classList.toggle("hidden", !active);
      this.canvas?.parentElement?.classList.toggle("has-target-swap-warning", active);
      if (!active) {
        setElementHtml(this.targetSwapWarning, "");
        return;
      }
      setElementHtml(this.targetSwapWarning, `<strong>Target swap active</strong><span>Viewing ${escapeHtml(targetFace.shortName || targetFace.name)} · Original ${escapeHtml(originalFace.shortName || originalFace.name)} · view-only comparison</span>`);
    }
  }


  function setElementHtml(element, html) {
    if (!element || element.innerHTML === html) return;
    element.innerHTML = html;
  }

  function setElementText(element, text) {
    if (!element || element.textContent === text) return;
    element.textContent = text;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function getAnalysisHudText(scorecard, visibleEndIndex, extrapolation = null) {
    const entries = App.GroupingRenderer.getVisiblePlottedEntries(scorecard, visibleEndIndex, { extrapolation });
    const analysis = App.GroupingRenderer.calculatePlottedArrowAnalysis(entries);
    if (!analysis) return "";

    return `MPI ${formatGroupOffset(analysis.offsetMm)} · Spread ${formatMm(analysis.horizontalSpreadMm)} x ${formatMm(analysis.verticalSpreadMm)}`;
  }

  function getShotDnaHudText(scorecard, targetFace, visibleEndIndex, extrapolation = null) {
    if (!App.ShotPattern || !targetFace) return "";
    const entries = App.ShotPattern.collectPlottedEntries(scorecard, targetFace, {
      extrapolation,
      visibleEndIndex
    });
    const pattern = App.ShotPattern.analyse(entries);
    if (!pattern?.count) return "";

    const coreCentre = pattern.coreFit
      ? { xMm: pattern.coreFit.meanX, yMm: pattern.coreFit.meanY }
      : pattern.groupCentre;
    const direction = App.SessionIntelligence?.formatDirection
      ? App.SessionIntelligence.formatDirection(coreCentre)
      : formatGroupOffset(coreCentre);
    const ellipse95 = pattern.confidenceEllipses.find(ellipse => ellipse.level === 95) || pattern.confidenceEllipses[pattern.confidenceEllipses.length - 1];
    const ellipseText = ellipse95
      ? `95% ${formatMm(ellipse95.majorRadiusMm * 2)} x ${formatMm(ellipse95.minorRadiusMm * 2)}`
      : "95% ellipse pending";
    const outlierText = `${pattern.outliers.majorCount || 0} outlier${pattern.outliers.majorCount === 1 ? "" : "s"}`;
    return `DNA ${direction} · ${pattern.shape.label} · ${ellipseText} · ${outlierText}`;
  }



  function formatGroupOffset(offset) {
    const x = Number(offset?.xMm) || 0;
    const y = Number(offset?.yMm) || 0;
    const parts = [];
    if (Math.abs(x) >= 0.05) parts.push(`${x < 0 ? "Left" : "Right"} ${formatMm(Math.abs(x))}`);
    if (Math.abs(y) >= 0.05) parts.push(`${y < 0 ? "High" : "Low"} ${formatMm(Math.abs(y))}`);
    return parts.length ? parts.join(", ") : "centred";
  }

  function formatMm(value) {
    if (!Number.isFinite(value)) return "-";
    if (value >= 100) return `${Math.round(value)}mm`;
    return `${Math.round(value * 10) / 10}mm`;
  }


  function drawGroupFocusScrim(ctx, rect, amount) {
    const alpha = App.Geometry.clamp(amount || 0, 0, 1);
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(1, 6, 12, 0.48)";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const gradient = ctx.createRadialGradient(
      rect.width / 2,
      rect.height / 2,
      0,
      rect.width / 2,
      rect.height / 2,
      Math.max(rect.width, rect.height) * 0.72
    );
    gradient.addColorStop(0, "rgba(5, 14, 23, 0.16)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.38)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();
  }

  function drawGrid(ctx, rect, transform) {
    const spacing = niceGridSpacing(60 / transform.currentPxPerMm) * transform.currentPxPerMm;
    if (!Number.isFinite(spacing) || spacing < 18) return;

    const offsetX = ((rect.width / 2 + transform.currentPanX) % spacing + spacing) % spacing;
    const offsetY = ((rect.height / 2 + transform.currentPanY) % spacing + spacing) % spacing;

    ctx.save();
    ctx.strokeStyle = "rgba(151, 184, 212, 0.055)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offsetX; x < rect.width; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
    }
    for (let y = offsetY; y < rect.height; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function niceGridSpacing(valueMm) {
    const exponent = Math.floor(Math.log10(valueMm));
    const base = Math.pow(10, exponent);
    const steps = [1, 2, 5, 10];
    for (const step of steps) {
      const candidate = step * base;
      if (candidate >= valueMm) return candidate;
    }
    return 10 * base;
  }

  function drawEmptyMessage(ctx, rect) {
    ctx.save();
    ctx.fillStyle = "rgba(238, 247, 255, 0.86)";
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Create a scorecard to start plotting arrows", rect.width / 2, rect.height / 2);
    ctx.restore();
  }



  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function readableTextColor(hexColor) {
    const rgb = parseHexColor(hexColor);
    if (!rgb) return "#041018";
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return luminance > 0.58 ? "#041018" : "#eef7ff";
  }

  function parseHexColor(value) {
    if (typeof value !== "string") return null;
    const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
    if (!match) return null;
    const hex = match[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }

  App.TargetViewport = TargetViewport;
})();
