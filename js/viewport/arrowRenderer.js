(function () {
  const App = window.ArcheryApp;
  const { VIEWPORT } = App.Constants;

  function drawArrows(ctx, canvas, transform, scorecard, targetFace, selected, showLabels, hovered, options = {}) {
    if (!scorecard) return;
    const markerRadius = getMarkerRadius(transform);
    const entries = getVisibleArrowEntries(scorecard, options.visibleEndIndex);

    entries.forEach(entry => {
      const { endIndex, arrowIndex, sequence, arrow } = entry;
      if (!arrow.position) return;
      const screen = App.ViewportMath.worldToScreen(arrow.position, canvas, transform);
      if (!isNearCanvas(screen, canvas, 80)) return;
      const score = App.ScoringEngine.scoreArrow(arrow, targetFace);
      const isSelected = selected && selected.endIndex === endIndex && selected.arrowIndex === arrowIndex;
      const isHovered = hovered && hovered.endIndex === endIndex && hovered.arrowIndex === arrowIndex;
      drawArrowMarker(ctx, screen, markerRadius, sequence, score, isSelected, showLabels, isHovered);
    });
  }

  function getVisibleArrowEntries(scorecard, visibleEndIndex = null) {
    if (!scorecard) return [];
    const entries = [];
    let sequence = 0;

    scorecard.ends.forEach((end, endIndex) => {
      end.arrows.forEach((arrow, arrowIndex) => {
        sequence += 1;
        if (visibleEndIndex !== null && endIndex !== visibleEndIndex) return;
        entries.push({ endIndex, arrowIndex, sequence, arrow, end });
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

  function drawArrowMarker(ctx, screen, radius, sequence, score, isSelected, showLabels, isHovered) {
    ctx.save();
    const haloRadius = radius + (isSelected ? 4 : isHovered ? 3 : 1.5);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = isSelected
      ? "rgba(85, 214, 190, 0.24)"
      : isHovered
        ? "rgba(122, 183, 255, 0.20)"
        : "rgba(0, 0, 0, 0.18)";
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
    ctx.fillStyle = score && score.isMiss ? "rgba(255, 107, 122, 0.92)" : "rgba(238, 247, 255, 0.96)";
    ctx.fill();
    ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
    ctx.strokeStyle = isSelected ? "#55d6be" : isHovered ? "#7ab7ff" : "rgba(5, 14, 22, 0.92)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(1.7, radius * 0.28), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(4, 12, 20, 0.88)";
    ctx.fill();

    if (showLabels) {
      drawArrowLabel(ctx, screen, radius, sequence, score, isSelected, isHovered);
    }

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
    const entries = getVisibleArrowEntries(scorecard, options.visibleEndIndex);

    entries.forEach(entry => {
      const { endIndex, arrowIndex, sequence, arrow } = entry;
      if (!arrow.position) return;
      const screen = App.ViewportMath.worldToScreen(arrow.position, canvas, transform);
      const distancePx = Math.hypot(screenPoint.x - screen.x, screenPoint.y - screen.y);
      if (distancePx <= hitRadius) {
        hits.push({ endIndex, arrowIndex, sequence, distancePx, screen, arrow });
      }
    });

    hits.sort((a, b) => a.distancePx - b.distancePx || b.sequence - a.sequence);
    return hits[0] || null;
  }

  App.ArrowRenderer = { drawArrows, getArrowHitAt, getMarkerRadius, getVisibleArrowEntries };
})();
