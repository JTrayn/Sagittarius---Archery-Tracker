(function () {
  const App = window.ArcheryApp;
  const { VIEWPORT } = App.Constants;

  function drawArrows(ctx, canvas, transform, scorecard, targetFace, selected, showLabels, hovered, options = {}) {
    if (!scorecard) return;
    const markerRadius = getMarkerRadius(transform);
    const entries = getVisibleArrowEntries(scorecard, options.visibleEndIndex, options);
    const scorecardFocus = normalizeScorecardFocus(options.scorecardFocus);

    entries.forEach(entry => {
      if (options.timeline && !App.TimelineRenderer.shouldRevealEntry(entry, { timeline: options.timeline })) return;
      const { endIndex, arrowIndex, sequence, arrow } = entry;
      if (!arrow.position) return;
      const displayPosition = options.extrapolation
        ? App.Extrapolation.transformPosition(arrow.position, options.extrapolation)
        : arrow.position;
      const screen = App.ViewportMath.worldToScreen(displayPosition, canvas, transform);
      if (!isNearCanvas(screen, canvas, 80)) return;
      const score = App.ScoringEngine.scoreArrow(arrow, targetFace, options);
      const isSelected = selected && selected.endIndex === endIndex && selected.arrowIndex === arrowIndex;
      const isHovered = hovered && hovered.endIndex === endIndex && hovered.arrowIndex === arrowIndex;
      const isFocusedByScorecard = isEntryInScorecardFocus(entry, scorecardFocus);
      const isDimmedByScorecardFocus = Boolean(scorecardFocus && !isFocusedByScorecard);
      const arrowStyle = typeof options.arrowStyleResolver === "function"
        ? options.arrowStyleResolver(entry, score, displayPosition, targetFace) || null
        : null;
      drawArrowMarker(ctx, screen, markerRadius, sequence, score, isSelected, showLabels, isHovered, {
        isFocusedByScorecard,
        isDimmedByScorecardFocus,
        style: arrowStyle
      });
    });
  }

  function normalizeScorecardFocus(focus) {
    if (!focus || !["end", "arrow"].includes(focus.type)) return null;
    const index = Number(focus.index);
    if (!Number.isInteger(index) || index < 0) return null;
    return { type: focus.type, index };
  }

  function isEntryInScorecardFocus(entry, focus) {
    if (!entry || !focus) return false;
    return focus.type === "end"
      ? entry.endIndex === focus.index
      : entry.arrowIndex === focus.index;
  }

  function getVisibleArrowEntries(scorecard, visibleEndIndex = null, options = {}) {
    if (!scorecard) return [];
    const entries = [];
    let sequence = 0;
    let recordedIndex = 0;

    scorecard.ends.forEach((end, endIndex) => {
      end.arrows.forEach((arrow, arrowIndex) => {
        sequence += 1;
        const isRecorded = Boolean(arrow && (arrow.position || arrow.manualScore));
        if (isRecorded) recordedIndex += 1;
        if (visibleEndIndex !== null && endIndex !== visibleEndIndex) return;
        entries.push({
          endIndex,
          arrowIndex,
          sequence,
          recordedIndex: isRecorded ? recordedIndex : null,
          arrow,
          end
        });
      });
    });

    return entries;
  }

  function getMarkerRadius(transform) {
    // The visual arrow marker should be physically accurate whenever the
    // current zoom makes the real shaft radius large enough to see. At low
    // zoom levels we still enforce a small minimum display size so arrows
    // remain usable, but at high zoom the drawn marker exactly matches the
    // scoring shaft radius. This keeps line-cutter scoring visually honest
    // when inspecting/fine-tuning arrows closely.
    const physicalRadiusPx = VIEWPORT.ARROW_REAL_RADIUS_MM * transform.currentPxPerMm;
    return Math.max(VIEWPORT.ARROW_MIN_RADIUS_PX, physicalRadiusPx);
  }

  function drawArrowMarker(ctx, screen, radius, sequence, score, isSelected, showLabels, isHovered, focusOptions = {}) {
    ctx.save();
    const style = focusOptions.style || {};
    if (focusOptions.isDimmedByScorecardFocus) {
      ctx.globalAlpha *= 0.24;
    }
    if (Number.isFinite(Number(style.alphaMultiplier))) {
      ctx.globalAlpha *= App.Geometry.clamp(Number(style.alphaMultiplier), 0, 1.4);
    }

    if (focusOptions.isFocusedByScorecard) {
      drawScorecardFocusHalo(ctx, screen, radius);
    }

    const haloRadius = radius + (isSelected ? 4 : isHovered ? 3 : focusOptions.isFocusedByScorecard ? 3.5 : 1.5) + (Number(style.haloExtraPx) || 0);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = style.haloFillStyle || (isSelected
      ? "rgba(85, 214, 190, 0.24)"
      : isHovered
        ? "rgba(122, 183, 255, 0.20)"
        : focusOptions.isFocusedByScorecard
          ? "rgba(255, 209, 102, 0.18)"
          : "rgba(0, 0, 0, 0.18)");
    ctx.fill();

    if (isHovered && !isSelected) {
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius + 5, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(122, 183, 255, 0.72)";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = style.fillStyle || (score && score.isMiss ? "rgba(255, 107, 122, 0.92)" : "rgba(238, 247, 255, 0.96)");
    if (style.shadowColor || style.shadowBlur) {
      ctx.shadowColor = style.shadowColor || "rgba(0, 0, 0, 0)";
      ctx.shadowBlur = Number(style.shadowBlur) || 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = (isSelected ? 2.5 : isHovered ? 2 : focusOptions.isFocusedByScorecard ? 2.25 : 1.5) + (Number(style.lineWidthExtraPx) || 0);
    ctx.strokeStyle = isSelected ? "#55d6be" : isHovered ? "#7ab7ff" : focusOptions.isFocusedByScorecard ? "rgba(255, 218, 128, 0.95)" : (style.strokeStyle || "rgba(5, 14, 22, 0.92)");
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(1.7, radius * 0.28), 0, Math.PI * 2);
    ctx.fillStyle = style.centreFillStyle || "rgba(4, 12, 20, 0.88)";
    ctx.fill();

    if (showLabels) {
      drawArrowLabel(ctx, screen, radius, sequence, score, isSelected, isHovered);
    }

    ctx.restore();
  }

  function drawScorecardFocusHalo(ctx, screen, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius + 7, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 209, 102, 0.18)";
    ctx.shadowColor = "rgba(255, 209, 102, 0.36)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius + 5, 0, Math.PI * 2);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "rgba(255, 224, 148, 0.78)";
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowLabel(ctx, screen, radius, sequence, score, isSelected, isHovered) {
    const label = String(sequence);
    const x = screen.x + radius + 7;
    const y = screen.y - radius - 2;
    ctx.font = "800 11px Inter, system-ui, sans-serif";
    const metrics = ctx.measureText(label);
    const width = metrics.width + 12;
    const height = 20;

    ctx.beginPath();
    roundRect(ctx, x - 6, y - 10, width, height, 9);
    ctx.fillStyle = isSelected
      ? "rgba(85, 214, 190, 0.88)"
      : isHovered
        ? "rgba(122, 183, 255, 0.84)"
        : "rgba(5, 14, 22, 0.76)";
    ctx.fill();

    ctx.fillStyle = (isSelected || isHovered) ? "#041018" : "#eef7ff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }

  function isNearCanvas(point, canvas, margin) {
    const rect = App.ViewportMath.getCanvasRect(canvas);
    return point.x > -margin && point.x < rect.width + margin && point.y > -margin && point.y < rect.height + margin;
  }

  function getArrowHitAt(screenPoint, canvas, transform, scorecard, options = {}) {
    if (!scorecard) return null;
    const markerRadius = getMarkerRadius(transform);
    const hitRadius = markerRadius + VIEWPORT.ARROW_HIT_EXTRA_PX;
    const hits = [];
    const entries = getVisibleArrowEntries(scorecard, options.visibleEndIndex, options);

    entries.forEach(entry => {
      if (options.timeline && !App.TimelineRenderer.shouldRevealEntry(entry, { timeline: options.timeline })) return;
      const { endIndex, arrowIndex, sequence, arrow } = entry;
      if (!arrow.position) return;
      const displayPosition = options.extrapolation
        ? App.Extrapolation.transformPosition(arrow.position, options.extrapolation)
        : arrow.position;
      const screen = App.ViewportMath.worldToScreen(displayPosition, canvas, transform);
      const distancePx = Math.hypot(screenPoint.x - screen.x, screenPoint.y - screen.y);
      if (distancePx <= hitRadius) {
        hits.push({ endIndex, arrowIndex, sequence, distancePx, screen, arrow, displayPosition });
      }
    });

    hits.sort((a, b) => a.distancePx - b.distancePx || b.sequence - a.sequence);
    return hits[0] || null;
  }

  App.ArrowRenderer = { drawArrows, getArrowHitAt, getMarkerRadius, getVisibleArrowEntries };
})();
