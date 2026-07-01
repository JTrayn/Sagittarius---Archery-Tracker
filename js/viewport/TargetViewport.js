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
      this.state = null;
      this.targetFace = null;
      this.raf = null;
      this.needsDraw = true;
      this.scoreFeedback = [];
      this.pointerScreen = null;
      this.groupFocusAmount = 0;
      this.groupFocusTarget = 0;
      this.groupHoverState = null;
      this.transform = {
        currentPxPerMm: 0.62,
        targetPxPerMm: 0.62,
        currentPanX: 0,
        currentPanY: 0,
        targetPanX: 0,
        targetPanY: 0
      };

      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
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
      this.requestDraw();
      this.updateHud();
    }

    resizeCanvas() {
      const parent = this.canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      const cssWidth = `${rect.width}px`;
      const cssHeight = `${rect.height}px`;

      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      if (this.canvas.style.width !== cssWidth) this.canvas.style.width = cssWidth;
      if (this.canvas.style.height !== cssHeight) this.canvas.style.height = cssHeight;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    fitTarget(immediate = false) {
      if (!this.targetFace) return;
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

    resetView() {
      this.transform.targetPanX = 0;
      this.transform.targetPanY = 0;
      this.requestDraw();
    }

    requestDraw() {
      this.needsDraw = true;
    }

    startLoop() {
      const tick = () => {
        this.animateTransform();
        this.animateGroupFocus();
        if (this.scoreFeedback.length) {
          this.needsDraw = true;
        }
        if (this.needsDraw) {
          this.draw();
          this.needsDraw = false;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    animateTransform() {
      const t = this.transform;
      const scaleDelta = t.targetPxPerMm - t.currentPxPerMm;
      const panXDelta = t.targetPanX - t.currentPanX;
      const panYDelta = t.targetPanY - t.currentPanY;

      if (Math.abs(scaleDelta) > 0.0001) {
        t.currentPxPerMm += scaleDelta * VIEWPORT.ZOOM_EASE;
        this.needsDraw = true;
      } else {
        t.currentPxPerMm = t.targetPxPerMm;
      }

      if (Math.abs(panXDelta) > 0.05 || Math.abs(panYDelta) > 0.05) {
        t.currentPanX += panXDelta * VIEWPORT.PAN_EASE;
        t.currentPanY += panYDelta * VIEWPORT.PAN_EASE;
        this.needsDraw = true;
      } else {
        t.currentPanX = t.targetPanX;
        t.currentPanY = t.targetPanY;
      }
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

    draw() {
      this.resizeCanvas();
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);
      drawGrid(this.ctx, rect, this.transform);

      if (!this.state || !this.state.scorecard || !this.targetFace) {
        drawEmptyMessage(this.ctx, rect);
        return;
      }

      const hoverState = App.GroupingRenderer.getGroupingHoverState(this.canvas, this.transform, this.state.scorecard, {
        visibleEndIndex: this.state.viewport.visibleEndIndex,
        showRadial: this.state.viewport.showRadialGrouping,
        showSimple: this.state.viewport.showSimpleGrouping,
        pointerScreen: this.pointerScreen
      });
      this.groupHoverState = hoverState;
      this.groupFocusTarget = hoverState.any ? 1 : 0;

      App.TargetRenderer.drawTarget(this.ctx, this.canvas, this.transform, this.targetFace);
      drawGroupFocusScrim(this.ctx, rect, this.groupFocusAmount);
      if (this.state.viewport.showRadialGrouping || this.state.viewport.showSimpleGrouping) {
        App.GroupingRenderer.drawGroupingOverlay(this.ctx, this.canvas, this.transform, this.state.scorecard, {
          visibleEndIndex: this.state.viewport.visibleEndIndex,
          showRadial: this.state.viewport.showRadialGrouping,
          showSimple: this.state.viewport.showSimpleGrouping,
          pointerScreen: this.pointerScreen,
          hoverState,
          focusAmount: this.groupFocusAmount
        });
      }
      App.ArrowRenderer.drawArrows(
        this.ctx,
        this.canvas,
        this.transform,
        this.state.scorecard,
        this.targetFace,
        this.state.selected,
        this.state.viewport.showArrowLabels,
        this.state.viewport.hoveredArrow,
        { visibleEndIndex: this.state.viewport.visibleEndIndex }
      );
      this.drawScoreFeedback(performance.now());
      App.ScaleRenderer.drawScale(this.ctx, this.canvas, this.transform);
      this.updateHud();
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
        this.hud.innerHTML = "No active scorecard";
        this.zoomHud.innerHTML = "";
        return;
      }
      const scorecard = this.state.scorecard;
      const summary = App.ScoreFormatting.formatSummary(scorecard, this.targetFace);
      const originalFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
      const comparisonText = originalFace.id !== this.targetFace.id
        ? `<br><span>Shot on ${originalFace.shortName || originalFace.name}</span>`
        : "";
      const visibleText = this.state.viewport.visibleEndIndex === null
        ? "All ends"
        : `End ${this.state.viewport.visibleEndIndex + 1}`;
      this.hud.innerHTML = `<strong>${this.targetFace.shortName || this.targetFace.name}</strong><br>${scorecard.distanceM}m · ${summary.arrowsText}<br><span>Showing ${visibleText}</span>${comparisonText}`;
      this.zoomHud.innerHTML = `Zoom <strong>${Math.round(this.transform.currentPxPerMm * 100)}%</strong>`;
      if (this.modeHud) {
        const mode = this.state.viewport.interactionMode;
        const modeText = {
          plot: "Plot mode · left click to plot selected empty arrow · drag empty space to pan",
          edit: "Edit mode · click arrows to inspect · drag arrows to move",
          locked: "Locked mode · safe review · click arrows to inspect only"
        };
        this.modeHud.innerHTML = modeText[mode] || modeText.plot;
        this.canvas.dataset.mode = mode;
      }
    }
  }


  function drawGroupFocusScrim(ctx, rect, amount) {
    const alpha = App.Geometry.clamp(amount || 0, 0, 1);
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(1, 7, 13, 0.34)";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const gradient = ctx.createRadialGradient(
      rect.width / 2,
      rect.height / 2,
      0,
      rect.width / 2,
      rect.height / 2,
      Math.max(rect.width, rect.height) * 0.72
    );
    gradient.addColorStop(0, "rgba(12, 22, 30, 0.08)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.26)");
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
