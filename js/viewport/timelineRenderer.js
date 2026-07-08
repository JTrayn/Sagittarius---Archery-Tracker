(function () {
  const App = window.ArcheryApp;

  const DEFAULT_STEP_MS = 420;
  const TWEEN_DURATION_MS = 280;
  const SPEEDS = [0.5, 1, 2];
  const VIEW_MODES = ["scorecard", "ends"];
  const END_PLAYBACK_MODES = ["sequential"];

  const END_ACCENTS = [
    makeTheme("Cyan", "rgba(125, 226, 255, 0.98)", "rgba(125, 226, 255, 0.32)", "rgba(125, 226, 255, 0.075)", "rgba(125, 226, 255, 0.22)"),
    makeTheme("Magenta", "rgba(255, 105, 235, 0.98)", "rgba(255, 105, 235, 0.34)", "rgba(255, 105, 235, 0.07)", "rgba(255, 105, 235, 0.21)"),
    makeTheme("Lime", "rgba(173, 255, 92, 0.98)", "rgba(173, 255, 92, 0.30)", "rgba(173, 255, 92, 0.065)", "rgba(173, 255, 92, 0.20)"),
    makeTheme("Violet", "rgba(176, 129, 255, 0.98)", "rgba(176, 129, 255, 0.34)", "rgba(176, 129, 255, 0.07)", "rgba(176, 129, 255, 0.21)"),
    makeTheme("Orange", "rgba(255, 172, 79, 0.98)", "rgba(255, 172, 79, 0.31)", "rgba(255, 172, 79, 0.065)", "rgba(255, 172, 79, 0.20)"),
    makeTheme("Blue", "rgba(95, 156, 255, 0.98)", "rgba(95, 156, 255, 0.34)", "rgba(95, 156, 255, 0.07)", "rgba(95, 156, 255, 0.21)"),
    makeTheme("Pink", "rgba(255, 119, 167, 0.98)", "rgba(255, 119, 167, 0.32)", "rgba(255, 119, 167, 0.068)", "rgba(255, 119, 167, 0.205)"),
    makeTheme("Mint", "rgba(103, 255, 196, 0.98)", "rgba(103, 255, 196, 0.31)", "rgba(103, 255, 196, 0.066)", "rgba(103, 255, 196, 0.20)"),
    makeTheme("Amber", "rgba(255, 215, 100, 0.98)", "rgba(255, 215, 100, 0.30)", "rgba(255, 215, 100, 0.064)", "rgba(255, 215, 100, 0.20)"),
    makeTheme("Aqua", "rgba(83, 241, 255, 0.98)", "rgba(83, 241, 255, 0.33)", "rgba(83, 241, 255, 0.068)", "rgba(83, 241, 255, 0.21)"),
    makeTheme("Rose", "rgba(255, 94, 126, 0.98)", "rgba(255, 94, 126, 0.32)", "rgba(255, 94, 126, 0.066)", "rgba(255, 94, 126, 0.205)"),
    makeTheme("Green", "rgba(93, 255, 130, 0.98)", "rgba(93, 255, 130, 0.30)", "rgba(93, 255, 130, 0.064)", "rgba(93, 255, 130, 0.20)")
  ];

  function makeTheme(name, stroke, glow, fill, fillFocus) {
    return {
      name,
      title: "End dispersion",
      stroke,
      strokeSoft: "rgba(255, 255, 255, 0.52)",
      fill,
      fillFocus,
      glow,
      glowFocus: glow.replace(/,\s*0\.[0-9]+\)/, ", 0.62)"),
      marker: stroke
    };
  }

  function makeDefaultState(overrides = {}) {
    const speed = normalizeSpeed(overrides.speed);
    return {
      enabled: Boolean(overrides.enabled),
      playing: Boolean(overrides.playing),
      revealedCount: Math.max(0, Math.floor(Number(overrides.revealedCount) || 0)),
      speed,
      lastStepAt: Number(overrides.lastStepAt) || 0,
      viewMode: normalizeViewMode(overrides.viewMode),
      endPlaybackMode: normalizeEndPlaybackMode(overrides.endPlaybackMode),
      endZoomToFit: Boolean(overrides.endZoomToFit)
    };
  }

  function normalizeState(timeline) {
    return makeDefaultState(timeline || {});
  }

  function isActive(viewport) {
    return Boolean(viewport?.timeline?.enabled);
  }

  function normalizeViewMode(value) {
    return VIEW_MODES.includes(value) ? value : "scorecard";
  }

  function normalizeEndPlaybackMode(value) {
    return "sequential";
  }

  function isSeparatedEndsMode(viewport) {
    return isActive(viewport) && normalizeViewMode(viewport.timeline?.viewMode) === "ends";
  }

  function isSimultaneousEndsMode(viewport) {
    return false;
  }

  function normalizeSpeed(value) {
    const speed = Number(value) || 2;
    return SPEEDS.includes(speed) ? speed : 2;
  }

  function getStepMs(speed) {
    return DEFAULT_STEP_MS / normalizeSpeed(speed);
  }

  function getRecordedEntries(scorecard) {
    if (!scorecard || !Array.isArray(scorecard.ends)) return [];
    const entries = [];
    let sequence = 0;
    scorecard.ends.forEach((end, endIndex) => {
      let endRecordedIndex = 0;
      (end.arrows || []).forEach((arrow, arrowIndex) => {
        sequence += 1;
        if (!isRecordedArrow(arrow)) return;
        endRecordedIndex += 1;
        entries.push({
          endIndex,
          arrowIndex,
          sequence,
          recordedIndex: entries.length + 1,
          endRecordedIndex,
          arrowSlot: arrowIndex + 1,
          arrow,
          end
        });
      });
    });
    return entries;
  }

  function countRecorded(scorecard) {
    return getRecordedEntries(scorecard).length;
  }

  function countTimelineFrames(scorecard, viewportOrTimeline) {
    return countRecorded(scorecard);
  }

  function isRecordedArrow(arrow) {
    return Boolean(arrow && (arrow.position || arrow.manualScore));
  }

  function getRevealCount(scorecard, viewport) {
    if (!isActive(viewport)) return Infinity;
    const total = countTimelineFrames(scorecard, viewport);
    const value = Math.floor(Number(viewport.timeline?.revealedCount) || 0);
    return App.Geometry.clamp(value, 0, total);
  }

  function buildRevealLookup(scorecard, viewport) {
    const revealCount = getRevealCount(scorecard, viewport);
    const lookup = new Map();
    getRecordedEntries(scorecard).forEach(entry => {
      const isRevealed = !Number.isFinite(revealCount) || isEntryRevealedByCount(entry, viewport, revealCount);
      const isCurrent = Number.isFinite(revealCount) && isEntryCurrentByCount(entry, viewport, revealCount);
      lookup.set(makeKey(entry.endIndex, entry.arrowIndex), {
        ...entry,
        isRevealed,
        isCurrent
      });
    });
    return lookup;
  }

  function shouldRevealEntry(entry, viewport) {
    const realViewport = viewport?.timeline ? viewport : { timeline: viewport?.timeline || viewport };
    if (!isActive(realViewport)) return true;
    if (!entry || !isRecordedArrow(entry.arrow)) return true;
    const revealCount = Math.floor(Number(realViewport.timeline?.revealedCount) || 0);
    return isEntryRevealedByCount(entry, realViewport, revealCount);
  }

  function isEntryRevealedByCount(entry, viewport, revealCount) {
    if (Number.isFinite(entry.recordedIndex)) return entry.recordedIndex <= revealCount;
    return false;
  }

  function isEntryCurrentByCount(entry, viewport, revealCount) {
    if (revealCount <= 0) return false;
    return entry.recordedIndex === revealCount;
  }

  function getScorecardForScoring(scorecard, viewport) {
    if (!isActive(viewport) || !scorecard) return scorecard;
    const lookup = buildRevealLookup(scorecard, viewport);
    return {
      ...scorecard,
      ends: scorecard.ends.map((end, endIndex) => ({
        ...end,
        arrows: end.arrows.map((arrow, arrowIndex) => {
          if (!isRecordedArrow(arrow)) return arrow;
          const entry = lookup.get(makeKey(endIndex, arrowIndex));
          if (entry && entry.isRevealed) return arrow;
          return {
            ...arrow,
            position: null,
            manualScore: null
          };
        })
      }))
    };
  }

  function getRevealedPlottedEntries(scorecard, viewport, options = {}) {
    const revealCount = getRevealCount(scorecard, viewport);
    return getRecordedEntries(scorecard)
      .filter(entry => options.endIndex === undefined || entry.endIndex === options.endIndex)
      .filter(entry => entry.arrow && entry.arrow.position)
      .filter(entry => !Number.isFinite(revealCount) || isEntryRevealedByCount(entry, viewport, revealCount))
      .map(entry => {
        const point = options.extrapolation
          ? App.Extrapolation.transformPosition(entry.arrow.position, options.extrapolation)
          : entry.arrow.position;
        return {
          ...entry,
          point: {
            xMm: Number(point.xMm) || 0,
            yMm: Number(point.yMm) || 0
          }
        };
      });
  }

  function calculateOverlayFromEntries(entries) {
    const analysis = App.GroupingRenderer.calculatePlottedArrowAnalysis(entries);
    const radial = entries.length >= 2
      ? App.GroupingRenderer.calculateRadialGroupStats(entries)
      : null;
    return {
      entries,
      analysis,
      radial,
      count: entries.length
    };
  }

  function calculateTimelineOverlay(scorecard, viewport, options = {}) {
    const entries = getRevealedPlottedEntries(scorecard, viewport, options);
    return calculateOverlayFromEntries(entries);
  }

  function calculateSeparatedEndOverlays(scorecard, viewport, options = {}) {
    if (!scorecard || !Array.isArray(scorecard.ends)) return [];
    return scorecard.ends.map((end, endIndex) => {
      const entries = getRevealedPlottedEntries(scorecard, viewport, {
        ...options,
        endIndex
      });
      const overlay = calculateOverlayFromEntries(entries);
      const accent = getEndAccent(endIndex);
      return {
        endIndex,
        end,
        overlay,
        accent,
        revealedPlottedCount: entries.length,
        totalRecordedCount: (end.arrows || []).filter(isRecordedArrow).length,
        totalPlottedCount: (end.arrows || []).filter(arrow => arrow && arrow.position).length,
        isActive: isEndActive(scorecard, viewport, endIndex),
        isComplete: isEndComplete(scorecard, viewport, endIndex)
      };
    });
  }

  function isEndActive(scorecard, viewport, endIndex) {
    if (!isActive(viewport)) return false;
    const reveal = getRevealCount(scorecard, viewport);
    if (reveal <= 0 || reveal >= countTimelineFrames(scorecard, viewport)) return false;
    const entry = getRecordedEntries(scorecard)[reveal - 1];
    return Boolean(entry && entry.endIndex === endIndex);
  }

  function isEndComplete(scorecard, viewport, endIndex) {
    if (!isActive(viewport)) return false;
    const end = scorecard?.ends?.[endIndex];
    if (!end) return false;
    const recorded = (end.arrows || []).map((arrow, arrowIndex) => ({ arrow, arrowIndex })).filter(item => isRecordedArrow(item.arrow));
    if (!recorded.length) return false;
    const lookup = buildRevealLookup(scorecard, viewport);
    return recorded.every(item => lookup.get(makeKey(endIndex, item.arrowIndex))?.isRevealed);
  }

  function getCurrentEndOverlay(scorecard, viewport, options = {}) {
    const status = formatTimelineStatus(scorecard, viewport);
    const currentEndIndex = status.current?.endIndex;
    if (!Number.isInteger(currentEndIndex)) return null;
    return calculateTimelineOverlay(scorecard, viewport, {
      ...options,
      endIndex: currentEndIndex
    });
  }

  function buildMpiTrail(scorecard, viewport, options = {}) {
    return buildMpiTrailFromEntries(getRevealedPlottedEntries(scorecard, viewport, options));
  }

  function buildMpiTrailFromEntries(entries) {
    const points = [];
    const trail = [];

    entries.forEach(entry => {
      points.push(entry.point);
      const centroid = calculateCentroid(points);
      trail.push({
        point: centroid,
        entry,
        count: points.length
      });
    });

    return trail;
  }

  function drawMpiTrail(ctx, canvas, transform, scorecard, viewport, options = {}) {
    const trail = buildMpiTrail(scorecard, viewport, options);
    if (options.currentAnalysis?.centroid && trail.length) {
      trail[trail.length - 1] = {
        ...trail[trail.length - 1],
        point: options.currentAnalysis.centroid
      };
    }
    drawTrail(ctx, canvas, transform, trail, options);
    return trail;
  }

  function drawMpiTrailFromEntries(ctx, canvas, transform, entries, options = {}) {
    const trail = buildMpiTrailFromEntries(entries || []);
    if (options.currentAnalysis?.centroid && trail.length) {
      trail[trail.length - 1] = {
        ...trail[trail.length - 1],
        point: options.currentAnalysis.centroid
      };
    }
    drawTrail(ctx, canvas, transform, trail, options);
    return trail;
  }

  function drawTrail(ctx, canvas, transform, trail, options = {}) {
    if (trail.length < 2) return;
    const theme = options.theme || getEndAccent(-1);
    const screenPoints = trail.map(item => App.ViewportMath.worldToScreen(item.point, canvas, transform));
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    drawPolyline(ctx, screenPoints, {
      lineWidth: options.compact ? 6.4 : 9.5,
      strokeStyle: "rgba(0, 0, 0, 0.58)",
      shadowColor: "rgba(0, 0, 0, 0.34)",
      shadowBlur: options.compact ? 7 : 10
    });
    drawPolyline(ctx, screenPoints, {
      lineWidth: options.compact ? 3.7 : 5.2,
      strokeStyle: "rgba(3, 13, 22, 0.92)",
      shadowColor: "transparent",
      shadowBlur: 0
    });
    drawPolyline(ctx, screenPoints, {
      lineWidth: options.compact ? 1.8 : 2.2,
      strokeStyle: theme.stroke,
      shadowColor: theme.glow,
      shadowBlur: options.compact ? 6 : 8
    });

    drawTrailDots(ctx, trail, screenPoints, theme, { compact: Boolean(options.compact) });
    ctx.restore();
  }

  function drawPolyline(ctx, points, style) {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineWidth = style.lineWidth;
    ctx.strokeStyle = style.strokeStyle;
    ctx.shadowColor = style.shadowColor || "transparent";
    ctx.shadowBlur = style.shadowBlur || 0;
    ctx.stroke();
    ctx.restore();
  }

  function drawTrailDots(ctx, trail, screenPoints, theme, options = {}) {
    const lastIndex = screenPoints.length - 1;
    screenPoints.forEach((point, index) => {
      const entry = trail[index]?.entry;
      const isCurrent = index === lastIndex;
      const isEndBoundary = entry && (entry.arrowIndex === (entry.end?.arrows?.length || 0) - 1);
      if (!isCurrent && !isEndBoundary) return;

      const radius = options.compact ? (isCurrent ? 3.1 : 2.1) : (isCurrent ? 4.3 : 2.8);
      ctx.save();
      ctx.shadowColor = isCurrent ? theme.glowFocus : "rgba(0, 0, 0, 0.28)";
      ctx.shadowBlur = isCurrent ? (options.compact ? 8 : 12) : 5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(2, 10, 18, 0.88)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? theme.stroke : theme.stroke.replace(/,\s*0\.[0-9]+\)/, ", 0.74)");
      ctx.fill();
      ctx.restore();
    });
  }

  function drawSeparatedEnds(ctx, canvas, rect, scorecard, targetFace, viewport, options = {}) {
    const ends = scorecard?.ends || [];
    if (!ends.length) return;
    const overlaysByEnd = options.overlaysByEnd || new Map();
    const timeline = normalizeState(viewport.timeline);
    const reveal = getRevealCount(scorecard, viewport);
    const layoutItems = getSeparatedEndLayoutItems(rect, scorecard, targetFace, viewport, options);

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    layoutItems.forEach(layoutItem => {
      const { end, endIndex, tile, targetArea, tileTransform, fakeCanvas } = layoutItem;
      const item = overlaysByEnd.get(endIndex) || calculateSeparatedEndOverlays(scorecard, viewport, options)[endIndex];
      const accent = item?.accent || getEndAccent(endIndex);
      const active = Boolean(item?.isActive);
      const complete = Boolean(item?.isComplete);
      drawEndTileChrome(ctx, tile, endIndex, accent, { active, complete, timeline, reveal });

      const localScorecard = makeEndRevealScorecard(scorecard, viewport, endIndex);
      const overlay = item?.overlay || calculateOverlayFromEntries(getRevealedPlottedEntries(scorecard, viewport, { ...options, endIndex }));

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, targetArea.x, targetArea.y, targetArea.width, targetArea.height, Math.max(18, tile.size * 0.055));
      ctx.clip();
      ctx.translate(targetArea.x, targetArea.y);
      App.TargetRenderer.drawTarget(ctx, fakeCanvas, tileTransform, targetFace, {
        visibility: Math.min(1, Math.max(0.55, Number(viewport.targetFaceVisibility) || 1))
      });
      App.ArrowRenderer.drawArrows(ctx, fakeCanvas, tileTransform, localScorecard, targetFace, null, false, null, {
        extrapolation: options.extrapolation
      });
      drawMpiTrailFromEntries(ctx, fakeCanvas, tileTransform, overlay.entries || [], {
        theme: accent,
        compact: true,
        currentAnalysis: overlay.analysis || overlay.radial?.analysis || null
      });
      App.GroupingRenderer.drawGroupingOverlayStats(ctx, fakeCanvas, tileTransform, overlay, {
        showLabel: false,
        focusAmount: active ? 1 : complete ? 0.72 : 0.56,
        theme: accent
      });
      ctx.restore();
    });

    const hover = getSeparatedEndHover(options.pointerScreen, rect, scorecard, targetFace, viewport, {
      ...options,
      overlaysByEnd,
      layoutItems
    });
    if (hover) drawSeparatedEndTooltip(ctx, rect, hover);

    ctx.restore();
  }

  function getSeparatedEndLayoutItems(rect, scorecard, targetFace, viewport, options = {}) {
    const ends = scorecard?.ends || [];
    if (!ends.length) return [];
    const timeline = normalizeState(viewport?.timeline);
    const zoom = getSeparatedEndsZoom(rect, targetFace, options.transform);
    const panX = Number(options.transform?.currentPanX) || 0;
    const panY = Number(options.transform?.currentPanY) || 0;
    const layout = getEndGridLayout(rect, ends.length, { zoom, panX, panY });

    return ends.map((end, endIndex) => {
      const tile = layout.tiles[endIndex];
      const labelHeight = Math.max(24, Math.min(34, tile.size * 0.14));
      const gutter = Math.max(7, Math.min(12, tile.size * 0.05));
      const targetArea = {
        x: tile.x + gutter,
        y: tile.y + labelHeight,
        width: Math.max(1, tile.size - gutter * 2),
        height: Math.max(1, tile.size - labelHeight - gutter)
      };
      const diameter = Math.max(1, Number(targetFace.diameterMm) || 1);
      const baseScale = Math.max(0.02, Math.min(targetArea.width, targetArea.height) * 0.88 / diameter);
      const fakeCanvas = makeVirtualCanvas(targetArea.width, targetArea.height);
      const tileTransform = timeline.endZoomToFit
        ? makeEndZoomToFitTransform(fakeCanvas, targetFace, scorecard, endIndex, options, baseScale)
        : makeEndDefaultTransform(baseScale);
      return { end, endIndex, tile, targetArea, fakeCanvas, tileTransform, layout };
    });
  }

  function makeEndDefaultTransform(scale) {
    return {
      currentPxPerMm: scale,
      targetPxPerMm: scale,
      currentPanX: 0,
      currentPanY: 0,
      targetPanX: 0,
      targetPanY: 0
    };
  }

  function makeEndZoomToFitTransform(fakeCanvas, targetFace, scorecard, endIndex, options = {}, fallbackScale = 1) {
    const bounds = getEndFinalPlottedBounds(scorecard, endIndex, options.extrapolation);
    if (!bounds) return makeEndDefaultTransform(fallbackScale);

    const diameter = Math.max(1, Number(targetFace?.diameterMm) || 1);
    const arrowRadius = App.Constants?.VIEWPORT?.ARROW_REAL_RADIUS_MM || 2.4;
    const paddingMm = Math.max(18, Math.min(34, diameter * 0.035)) + arrowRadius;
    const minSpanMm = App.Geometry.clamp(diameter * 0.16, 90, 180);
    const widthMm = Math.max(minSpanMm, bounds.maxX - bounds.minX + paddingMm * 2);
    const heightMm = Math.max(minSpanMm, bounds.maxY - bounds.minY + paddingMm * 2);
    const availableWidth = Math.max(1, fakeCanvas.width * 0.90);
    const availableHeight = Math.max(1, fakeCanvas.height * 0.90);
    const maxScale = Math.min(App.Constants?.VIEWPORT?.MAX_PX_PER_MM || 8, Math.max(fallbackScale, fallbackScale * 5.5));
    const scale = App.Geometry.clamp(
      Math.min(availableWidth / widthMm, availableHeight / heightMm),
      App.Constants?.VIEWPORT?.MIN_PX_PER_MM || 0.02,
      maxScale
    );
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    return {
      currentPxPerMm: scale,
      targetPxPerMm: scale,
      currentPanX: -centerX * scale,
      currentPanY: -centerY * scale,
      targetPanX: -centerX * scale,
      targetPanY: -centerY * scale
    };
  }

  function getEndFinalPlottedBounds(scorecard, endIndex, extrapolation = null) {
    const end = scorecard?.ends?.[endIndex];
    if (!end) return null;
    const points = (end.arrows || [])
      .filter(arrow => arrow && arrow.position)
      .map(arrow => extrapolation
        ? App.Extrapolation.transformPosition(arrow.position, extrapolation)
        : arrow.position)
      .filter(point => point && Number.isFinite(Number(point.xMm)) && Number.isFinite(Number(point.yMm)))
      .map(point => ({ xMm: Number(point.xMm), yMm: Number(point.yMm) }));
    if (!points.length) return null;
    return points.reduce((bounds, point) => ({
      minX: Math.min(bounds.minX, point.xMm),
      maxX: Math.max(bounds.maxX, point.xMm),
      minY: Math.min(bounds.minY, point.yMm),
      maxY: Math.max(bounds.maxY, point.yMm)
    }), {
      minX: points[0].xMm,
      maxX: points[0].xMm,
      minY: points[0].yMm,
      maxY: points[0].yMm
    });
  }

  function getSeparatedEndsZoom(rect, targetFace, transform = {}) {
    const baseScale = getSeparatedEndsBaseScale(rect, targetFace);
    const currentScale = Number(transform.currentPxPerMm) || Number(transform.targetPxPerMm) || baseScale;
    return App.Geometry.clamp(currentScale / baseScale, 0.28, 4.25);
  }

  function getSeparatedEndsBaseScale(rect, targetFace) {
    const diameter = Math.max(1, Number(targetFace?.diameterMm) || 1);
    const padding = App.Constants?.VIEWPORT?.FIT_PADDING_PX || 48;
    const available = Math.max(120, Math.min(rect.width, rect.height) - padding * 2);
    return App.Geometry.clamp(available / diameter, App.Constants.VIEWPORT.MIN_PX_PER_MM, App.Constants.VIEWPORT.MAX_PX_PER_MM);
  }

  function getSeparatedEndHover(pointer, rect, scorecard, targetFace, viewport, options = {}) {
    if (!pointer || !scorecard || !targetFace || !isSeparatedEndsMode(viewport)) return null;
    const layoutItems = options.layoutItems || getSeparatedEndLayoutItems(rect, scorecard, targetFace, viewport, options);
    const overlaysByEnd = options.overlaysByEnd || new Map();

    for (const layoutItem of layoutItems) {
      const { endIndex, targetArea, fakeCanvas, tileTransform } = layoutItem;
      if (!pointInRect(pointer, targetArea)) continue;
      const item = overlaysByEnd.get(endIndex) || calculateSeparatedEndOverlays(scorecard, viewport, options)[endIndex];
      const overlay = item?.overlay;
      const analysis = overlay?.analysis || overlay?.radial?.analysis || null;
      if (!analysis || !overlay?.count) continue;
      const local = { x: pointer.x - targetArea.x, y: pointer.y - targetArea.y };
      const world = App.ViewportMath.screenToWorld(local, fakeCanvas, tileTransform);
      if (!hitsSeparatedEndGrouping(world, overlay, tileTransform)) continue;
      return {
        x: pointer.x,
        y: pointer.y,
        endIndex,
        accent: item?.accent || getEndAccent(endIndex),
        analysis,
        count: overlay.count
      };
    }
    return null;
  }

  function hitsSeparatedEndGrouping(world, overlay, transform) {
    const analysis = overlay?.analysis || overlay?.radial?.analysis || null;
    if (!world || !analysis?.centroid) return false;
    const toleranceMm = Math.max(3, 8 / Math.max(0.02, Number(transform.currentPxPerMm) || 1));
    const centroidDistance = distanceMm(world, analysis.centroid);
    if (centroidDistance <= toleranceMm * 1.2) return true;

    const circle = overlay.radial?.circle;
    const radiusMm = Number(overlay.radial?.radiusMm ?? circle?.radiusMm);
    if (circle?.center && Number.isFinite(radiusMm) && radiusMm > 0) {
      const ringDistance = Math.abs(distanceMm(world, circle.center) - radiusMm);
      if (ringDistance <= toleranceMm) return true;
    }

    const ellipse = analysis.confidenceEllipse;
    if (ellipse?.center && Number(ellipse.radiusXMm) > 0 && Number(ellipse.radiusYMm) > 0) {
      const dx = world.xMm - ellipse.center.xMm;
      const dy = world.yMm - ellipse.center.yMm;
      const cos = Math.cos(-(Number(ellipse.rotationRad) || 0));
      const sin = Math.sin(-(Number(ellipse.rotationRad) || 0));
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      const nx = rx / ellipse.radiusXMm;
      const ny = ry / ellipse.radiusYMm;
      const normalized = Math.sqrt(nx * nx + ny * ny);
      const avgRadius = (Math.abs(ellipse.radiusXMm) + Math.abs(ellipse.radiusYMm)) / 2;
      if (Math.abs(normalized - 1) * avgRadius <= toleranceMm) return true;
    }

    return false;
  }

  function drawSeparatedEndTooltip(ctx, rect, hover) {
    const analysis = hover.analysis;
    const line1 = `End ${hover.endIndex + 1} · ${hover.count} arrow${hover.count === 1 ? "" : "s"}`;
    const line2 = `MPI ${formatOffset(analysis.offsetMm)}`;
    const line3 = `Spread ${formatMm(analysis.horizontalSpreadMm)} × ${formatMm(analysis.verticalSpreadMm)}`;
    const lines = [line1, line2, line3];

    ctx.save();
    ctx.font = "900 11px Inter, system-ui, sans-serif";
    const width = Math.max(150, ...lines.map(line => ctx.measureText(line).width + 24));
    const height = 68;
    let x = hover.x + 14;
    let y = hover.y - height - 12;
    if (x + width > rect.width - 10) x = hover.x - width - 14;
    if (y < 10) y = hover.y + 14;
    x = App.Geometry.clamp(x, 10, Math.max(10, rect.width - width - 10));
    y = App.Geometry.clamp(y, 10, Math.max(10, rect.height - height - 10));

    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, 16);
    ctx.fillStyle = "rgba(4, 13, 22, 0.94)";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = hover.accent?.stroke || "rgba(125, 226, 255, 0.9)";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = hover.accent?.stroke || "#dff7ff";
    ctx.font = "950 11px Inter, system-ui, sans-serif";
    ctx.fillText(line1, x + 12, y + 17);
    ctx.fillStyle = "rgba(223, 240, 250, 0.92)";
    ctx.font = "850 11px Inter, system-ui, sans-serif";
    ctx.fillText(line2, x + 12, y + 38);
    ctx.fillStyle = "rgba(158, 184, 204, 0.92)";
    ctx.fillText(line3, x + 12, y + 55);
    ctx.restore();
  }

  function pointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function distanceMm(a, b) {
    return Math.hypot((Number(a.xMm) || 0) - (Number(b.xMm) || 0), (Number(a.yMm) || 0) - (Number(b.yMm) || 0));
  }

  function formatOffset(offset) {
    const x = Number(offset?.xMm) || 0;
    const y = Number(offset?.yMm) || 0;
    const parts = [];
    if (Math.abs(x) >= 0.05) parts.push(`${x < 0 ? "Left" : "Right"} ${formatMm(Math.abs(x))}`);
    if (Math.abs(y) >= 0.05) parts.push(`${y < 0 ? "High" : "Low"} ${formatMm(Math.abs(y))}`);
    return parts.length ? parts.join(", ") : "centred";
  }

  function formatMm(value) {
    if (!Number.isFinite(Number(value))) return "-";
    const mm = Number(value);
    if (Math.abs(mm) >= 100) return `${Math.round(mm)}mm`;
    return `${Math.round(mm * 10) / 10}mm`;
  }

  function drawEndTileChrome(ctx, tile, endIndex, accent, options = {}) {
    const chromeAccent = END_ACCENTS[0];
    const radius = Math.max(18, Math.min(28, tile.size * 0.085));
    ctx.save();
    ctx.shadowColor = options.active ? chromeAccent.glowFocus : "rgba(0, 0, 0, 0.24)";
    ctx.shadowBlur = options.active ? 20 : 9;
    ctx.shadowOffsetY = options.active ? 8 : 4;
    ctx.beginPath();
    roundRect(ctx, tile.x, tile.y, tile.size, tile.size, radius);
    ctx.fillStyle = "rgba(5, 15, 25, 0.74)";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = options.active ? 2.1 : options.complete ? 1.5 : 1;
    ctx.strokeStyle = options.active ? chromeAccent.stroke : options.complete ? chromeAccent.glow : "rgba(178, 213, 235, 0.13)";
    ctx.stroke();

    const label = `End ${endIndex + 1}`;
    ctx.font = `${options.active ? 950 : 900} ${Math.max(10, Math.min(13, tile.size * 0.047))}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = options.active || options.complete ? chromeAccent.stroke : "rgba(226, 238, 248, 0.76)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, tile.x + Math.max(12, tile.size * 0.055), tile.y + Math.max(15, tile.size * 0.073));

    const pill = options.active ? "ACTIVE" : options.complete ? "DONE" : "WAIT";
    ctx.font = `900 ${Math.max(8, Math.min(10, tile.size * 0.036))}px Inter, system-ui, sans-serif`;
    const textWidth = ctx.measureText(pill).width;
    const pillW = textWidth + 13;
    const pillH = Math.max(15, Math.min(19, tile.size * 0.07));
    const pillX = tile.x + tile.size - pillW - Math.max(9, tile.size * 0.045);
    const pillY = tile.y + Math.max(7, tile.size * 0.037);
    ctx.beginPath();
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = options.active
      ? chromeAccent.fillFocus
      : options.complete
        ? chromeAccent.fill
        : "rgba(255, 255, 255, 0.045)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = options.active || options.complete ? chromeAccent.glow : "rgba(255, 255, 255, 0.08)";
    ctx.stroke();
    ctx.fillStyle = options.active || options.complete ? chromeAccent.stroke : "rgba(155, 178, 197, 0.64)";
    ctx.textAlign = "center";
    ctx.fillText(pill, pillX + pillW / 2, pillY + pillH / 2 + 0.4);
    ctx.restore();
  }

  function makeEndRevealScorecard(scorecard, viewport, endIndex) {
    const end = scorecard.ends[endIndex];
    const arrows = (end?.arrows || []).map((arrow, arrowIndex) => {
      if (!isRecordedArrow(arrow)) return arrow;
      const entry = getRecordedEntries(scorecard).find(item => item.endIndex === endIndex && item.arrowIndex === arrowIndex);
      if (entry && isEntryRevealedByCount(entry, viewport, getRevealCount(scorecard, viewport))) return arrow;
      return {
        ...arrow,
        position: null,
        manualScore: null
      };
    });
    return {
      ...scorecard,
      ends: [{ ...end, arrows }]
    };
  }

  function getEndGridLayout(rect, count, options = {}) {
    const safeCount = Math.max(1, Math.floor(Number(count) || 1));
    const cols = Math.ceil(Math.sqrt(safeCount));
    const rows = Math.ceil(safeCount / cols);
    const outer = 18;
    const gap = App.Geometry.clamp(Math.min(rect.width, rect.height) * 0.018, 8, 18);
    const availableWidth = Math.max(1, rect.width - outer * 2 - gap * (cols - 1));
    const availableHeight = Math.max(1, rect.height - outer * 2 - gap * (rows - 1));
    const baseSize = Math.max(48, Math.min(availableWidth / cols, availableHeight / rows));
    const totalWidth = baseSize * cols + gap * (cols - 1);
    const totalHeight = baseSize * rows + gap * (rows - 1);
    const startX = (rect.width - totalWidth) / 2;
    const startY = (rect.height - totalHeight) / 2;
    const zoom = App.Geometry.clamp(Number(options.zoom) || 1, 0.28, 4.25);
    const panX = Number(options.panX) || 0;
    const panY = Number(options.panY) || 0;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiles = [];
    for (let index = 0; index < safeCount; index += 1) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const baseX = startX + col * (baseSize + gap);
      const baseY = startY + row * (baseSize + gap);
      tiles.push({
        x: centerX + (baseX - centerX) * zoom + panX,
        y: centerY + (baseY - centerY) * zoom + panY,
        size: baseSize * zoom,
        row,
        col
      });
    }
    return { rows, cols, size: baseSize * zoom, gap: gap * zoom, tiles, zoom, panX, panY };
  }

  function makeVirtualCanvas(width, height) {
    return {
      width,
      height,
      __archeryExportRect: { width, height, left: 0, top: 0 }
    };
  }

  function calculateCentroid(points) {
    const sum = points.reduce((acc, point) => ({
      xMm: acc.xMm + point.xMm,
      yMm: acc.yMm + point.yMm
    }), { xMm: 0, yMm: 0 });
    return {
      xMm: sum.xMm / points.length,
      yMm: sum.yMm / points.length
    };
  }

  function interpolateOverlay(from, to, progress) {
    const t = easeInOutCubic(App.Geometry.clamp(progress, 0, 1));
    if (!from) return withAlpha(to, t);
    if (!to) return withAlpha(from, 1 - t);

    return {
      entries: to.entries || [],
      count: Math.round(lerp(Number(from.count) || 0, Number(to.count) || 0, t)),
      analysis: interpolateAnalysis(from.analysis, to.analysis, t),
      radial: interpolateRadial(from.radial, to.radial, t),
      alpha: 1
    };
  }

  function withAlpha(overlay, alpha) {
    if (!overlay) return null;
    return {
      ...overlay,
      alpha: App.Geometry.clamp(alpha, 0, 1)
    };
  }

  function interpolateAnalysis(from, to, t) {
    if (!from) return to ? { ...to } : null;
    if (!to) return { ...from };
    return {
      ...to,
      count: Math.round(lerp(Number(from.count) || 0, Number(to.count) || 0, t)),
      centroid: lerpPoint(from.centroid, to.centroid, t),
      offsetMm: {
        xMm: lerpNumber(from.offsetMm?.xMm, to.offsetMm?.xMm, t),
        yMm: lerpNumber(from.offsetMm?.yMm, to.offsetMm?.yMm, t),
        distanceMm: lerpNumber(from.offsetMm?.distanceMm, to.offsetMm?.distanceMm, t)
      },
      horizontalSpreadMm: lerpNumber(from.horizontalSpreadMm, to.horizontalSpreadMm, t),
      verticalSpreadMm: lerpNumber(from.verticalSpreadMm, to.verticalSpreadMm, t),
      extremeSpreadMm: lerpNumber(from.extremeSpreadMm, to.extremeSpreadMm, t),
      confidenceEllipse: interpolateEllipse(from.confidenceEllipse, to.confidenceEllipse, t)
    };
  }

  function interpolateRadial(from, to, t) {
    if (!from) return to ? { ...to } : null;
    if (!to) return { ...from };
    const center = lerpPoint(from.circle?.center || from.centroid, to.circle?.center || to.centroid, t);
    const radiusMm = lerpNumber(from.radiusMm, to.radiusMm, t);
    return {
      ...to,
      count: Math.round(lerp(Number(from.count) || 0, Number(to.count) || 0, t)),
      centroid: lerpPoint(from.centroid, to.centroid, t),
      circle: {
        center,
        radiusMm: Math.max(0, radiusMm)
      },
      radiusMm: Math.max(0, radiusMm),
      radialStdMm: Math.max(0, lerpNumber(from.radialStdMm, to.radialStdMm, t)),
      radialStdDiameterMm: Math.max(0, lerpNumber(from.radialStdDiameterMm, to.radialStdDiameterMm, t)),
      meanRadiusMm: Math.max(0, lerpNumber(from.meanRadiusMm, to.meanRadiusMm, t)),
      maxRadiusMm: Math.max(0, lerpNumber(from.maxRadiusMm, to.maxRadiusMm, t)),
      extremeSpreadMm: Math.max(0, lerpNumber(from.extremeSpreadMm, to.extremeSpreadMm, t)),
      analysis: interpolateAnalysis(from.analysis, to.analysis, t)
    };
  }

  function interpolateEllipse(from, to, t) {
    if (!from) return to ? { ...to } : null;
    if (!to) return { ...from };
    return {
      ...to,
      count: Math.round(lerp(Number(from.count) || 0, Number(to.count) || 0, t)),
      center: lerpPoint(from.center, to.center, t),
      radiusXMm: Math.max(0, lerpNumber(from.radiusXMm, to.radiusXMm, t)),
      radiusYMm: Math.max(0, lerpNumber(from.radiusYMm, to.radiusYMm, t)),
      rotationRad: lerpAngle(from.rotationRad, to.rotationRad, t)
    };
  }

  function lerpPoint(from, to, t) {
    return {
      xMm: lerpNumber(from?.xMm, to?.xMm, t),
      yMm: lerpNumber(from?.yMm, to?.yMm, t)
    };
  }

  function lerpNumber(from, to, t) {
    const a = Number.isFinite(Number(from)) ? Number(from) : 0;
    const b = Number.isFinite(Number(to)) ? Number(to) : 0;
    return lerp(a, b, t);
  }

  function lerpAngle(from, to, t) {
    const a = Number.isFinite(Number(from)) ? Number(from) : 0;
    const b = Number.isFinite(Number(to)) ? Number(to) : 0;
    let delta = b - a;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return a + delta * t;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOutCubic(value) {
    const t = App.Geometry.clamp(value, 0, 1);
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function makeKey(endIndex, arrowIndex) {
    return `${endIndex}:${arrowIndex}`;
  }

  function formatTimelineStatus(scorecard, viewport) {
    const timeline = normalizeState(viewport?.timeline);
    const total = countTimelineFrames(scorecard, viewport);
    const reveal = Number.isFinite(getRevealCount(scorecard, viewport))
      ? getRevealCount(scorecard, viewport)
      : total;
    const entries = getRecordedEntries(scorecard);
    const current = reveal > 0 ? entries[Math.min(reveal, entries.length) - 1] : null;
    const progress = `${Math.min(reveal, total)} / ${total}`;
    const arrowText = current
      ? `End ${current.endIndex + 1} · Arrow ${current.arrowIndex + 1}`
      : "Ready";

    return { total, reveal, current, progress, arrowText, viewMode: timeline.viewMode, endPlaybackMode: timeline.endPlaybackMode };
  }

  function getHudOverlay(scorecard, viewport, options = {}) {
    const timeline = normalizeState(viewport?.timeline);
    if (timeline.viewMode === "ends") {
      return getCurrentEndOverlay(scorecard, viewport, options);
    }
    return calculateTimelineOverlay(scorecard, viewport, options);
  }

  function getEndAccent(index) {
    if (index < 0) return END_ACCENTS[0];
    return END_ACCENTS[index % END_ACCENTS.length];
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }

  App.TimelineRenderer = {
    DEFAULT_STEP_MS,
    TWEEN_DURATION_MS,
    SPEEDS,
    VIEW_MODES,
    END_PLAYBACK_MODES,
    makeDefaultState,
    normalizeState,
    normalizeViewMode,
    normalizeEndPlaybackMode,
    isActive,
    isSeparatedEndsMode,
    isSimultaneousEndsMode,
    normalizeSpeed,
    getStepMs,
    getRecordedEntries,
    countRecorded,
    countTimelineFrames,
    isRecordedArrow,
    getRevealCount,
    buildRevealLookup,
    shouldRevealEntry,
    getScorecardForScoring,
    getRevealedPlottedEntries,
    calculateTimelineOverlay,
    calculateSeparatedEndOverlays,
    getHudOverlay,
    buildMpiTrail,
    buildMpiTrailFromEntries,
    drawMpiTrail,
    drawMpiTrailFromEntries,
    drawSeparatedEnds,
    getSeparatedEndLayoutItems,
    getSeparatedEndHover,
    getSeparatedEndsBaseScale,
    interpolateOverlay,
    formatTimelineStatus,
    getEndAccent
  };
})();
