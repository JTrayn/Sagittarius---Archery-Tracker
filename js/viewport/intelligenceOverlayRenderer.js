(function () {
  const App = window.ArcheryApp;

  const THEME = {
    cyan: "rgba(113, 255, 225, 0.98)",
    cyanSoft: "rgba(232, 255, 249, 0.82)",
    cyanFill: "rgba(85, 214, 190, 0.12)",
    cyanGlow: "rgba(85, 214, 190, 0.58)",
    amber: "rgba(255, 209, 102, 0.98)",
    amberSoft: "rgba(255, 236, 176, 0.82)",
    amberGlow: "rgba(255, 209, 102, 0.44)",
    pink: "rgba(255, 127, 141, 0.98)",
    pinkSoft: "rgba(255, 230, 235, 0.80)",
    pinkFill: "rgba(255, 104, 119, 0.10)",
    pinkGlow: "rgba(255, 104, 119, 0.52)",
    panel: "rgba(5, 14, 23, 0.80)",
    text: "rgba(238, 247, 255, 0.94)",
    muted: "rgba(185, 199, 215, 0.88)",
    darkStroke: "rgba(1, 8, 13, 0.54)"
  };

  function drawIntelligenceOverlay(ctx, canvas, transform, scorecard, targetFace, options = {}) {
    if (!scorecard || !targetFace || !App.ShotPattern) return null;

    const entries = App.ShotPattern.collectPlottedEntries(scorecard, targetFace, {
      extrapolation: options.extrapolation || null,
      visibleEndIndex: options.visibleEndIndex
    });
    const pattern = App.ShotPattern.analyse(entries);
    if (!pattern.count) return null;

    const rect = App.ViewportMath.getCanvasRect(canvas);
    const fit = pattern.coreFit || pattern.allFit;
    const centrePoint = fit
      ? { xMm: fit.meanX, yMm: fit.meanY }
      : pattern.groupCentre;
    const centreScreen = App.ViewportMath.worldToScreen(centrePoint, canvas, transform);
    const bullseyeScreen = App.ViewportMath.worldToScreen({ xMm: 0, yMm: 0 }, canvas, transform);
    const ellipse95 = pattern.confidenceEllipses.find(ellipse => ellipse.level === 95) || pattern.confidenceEllipses[pattern.confidenceEllipses.length - 1];

    ctx.save();
    if (pattern.count >= 2 && ellipse95) {
      drawPredictionEllipse(ctx, canvas, transform, ellipse95, pattern);
      drawAngleAxis(ctx, canvas, transform, ellipse95, pattern);
    }
    drawOffsetLine(ctx, bullseyeScreen, centreScreen);
    drawBullseyeAnchor(ctx, bullseyeScreen);
    drawMpiMarker(ctx, centreScreen, transform, pattern);
    drawMajorOutliers(ctx, canvas, transform, pattern);
    ctx.restore();

    return pattern;
  }

  function drawPredictionEllipse(ctx, canvas, transform, ellipse, pattern) {
    const centre = App.ViewportMath.worldToScreen(ellipse.centre, canvas, transform);
    const majorPx = Math.max(2, ellipse.majorRadiusMm * transform.currentPxPerMm);
    const minorPx = Math.max(2, ellipse.minorRadiusMm * transform.currentPxPerMm);
    const angleRad = ((Number(ellipse.angleDeg) || 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.rotate(angleRad);

    ctx.beginPath();
    ctx.ellipse(0, 0, majorPx, minorPx, 0, 0, Math.PI * 2);
    ctx.fillStyle = THEME.cyanFill;
    ctx.fill();

    ctx.lineWidth = 5.2;
    ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = THEME.darkStroke;
    ctx.stroke();

    ctx.shadowColor = THEME.cyanGlow;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3.2;
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = THEME.cyan;
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = THEME.cyanSoft;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawAngleAxis(ctx, canvas, transform, ellipse, pattern) {
    const centre = App.ViewportMath.worldToScreen(ellipse.centre, canvas, transform);
    const angleRad = ((Number(ellipse.angleDeg) || 0) * Math.PI) / 180;
    const halfLength = Math.max(10, ellipse.majorRadiusMm * transform.currentPxPerMm);
    const dx = Math.cos(angleRad) * halfLength;
    const dy = Math.sin(angleRad) * halfLength;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = "rgba(1, 8, 13, 0.42)";
    ctx.beginPath();
    ctx.moveTo(centre.x - dx, centre.y - dy);
    ctx.lineTo(centre.x + dx, centre.y + dy);
    ctx.stroke();

    ctx.shadowColor = THEME.cyanGlow;
    ctx.shadowBlur = 13;
    ctx.lineWidth = 2.05;
    ctx.strokeStyle = THEME.cyanSoft;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(centre.x - dx, centre.y - dy);
    ctx.lineTo(centre.x + dx, centre.y + dy);
    ctx.stroke();
    ctx.restore();
  }

  function drawOffsetLine(ctx, from, to) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (distance < 3) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 3.6;
    ctx.strokeStyle = "rgba(1, 8, 13, 0.34)";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = THEME.amber;
    ctx.shadowColor = THEME.amberGlow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBullseyeAnchor(ctx, point) {
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.64)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawMpiMarker(ctx, point, transform, pattern) {
    const radius = App.Geometry.clamp(transform.currentPxPerMm * 2.7, 2.6, 5.4);
    const backplateRadius = radius + App.Geometry.clamp(radius * 0.55, 1.1, 2.4);

    ctx.save();
    ctx.shadowColor = THEME.amberGlow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(point.x, point.y, backplateRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(1, 8, 13, 0.58)";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = THEME.amber;
    ctx.fill();
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = THEME.amberSoft;
    ctx.stroke();
    ctx.restore();
  }

  function drawMajorOutliers(ctx, canvas, transform, pattern) {
    const outliers = pattern.outliers?.major || [];
    if (!outliers.length) return;
    const radius = App.Geometry.clamp(transform.currentPxPerMm * 6.8, 7, 13.5);

    ctx.save();
    outliers.forEach(entry => {
      const point = App.ViewportMath.worldToScreen(entry.position, canvas, transform);

      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = THEME.pinkFill;
      ctx.fill();

      ctx.shadowColor = THEME.pinkGlow;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = THEME.pink;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  function drawOverlayBadge(ctx, rect, pattern, centrePoint, ellipse95, options) {
    if (!rect || rect.width < 80 || rect.height < 80) return;
    const direction = App.SessionIntelligence?.formatDirection
      ? App.SessionIntelligence.formatDirection(centrePoint)
      : formatDirection(centrePoint);
    const ellipseText = ellipse95
      ? `95% ${formatMm(ellipse95.majorRadiusMm * 2)} × ${formatMm(ellipse95.minorRadiusMm * 2)}`
      : "95% ellipse pending";
    const outlierText = `${pattern.outliers.majorCount || 0} major outlier${pattern.outliers.majorCount === 1 ? "" : "s"}`;
    const scopeText = options.visibleEndIndex === null || options.visibleEndIndex === undefined
      ? "All visible arrows"
      : `End ${Number(options.visibleEndIndex) + 1}`;
    const title = `Shot DNA · ${scopeText}`;
    const detail = `MPI ${direction} · ${pattern.shape.label} · ${ellipseText} · ${outlierText}`;

    ctx.save();
    ctx.font = "900 11px Inter, system-ui, sans-serif";
    const titleWidth = ctx.measureText(title).width;
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    const detailWidth = ctx.measureText(detail).width;
    const width = Math.min(rect.width - 24, Math.max(236, titleWidth + 28, detailWidth + 28));
    const height = 46;
    const x = App.Geometry.clamp(18, 8, Math.max(8, rect.width - width - 8));
    const y = App.Geometry.clamp(rect.height - height - 78, 8, Math.max(8, rect.height - height - 8));

    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, 16);
    ctx.fillStyle = THEME.panel;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(85, 214, 190, 0.24)";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "900 11px Inter, system-ui, sans-serif";
    ctx.fillStyle = THEME.cyan;
    ctx.fillText(title, x + 14, y + 9);
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.fillStyle = THEME.muted;
    drawClampedText(ctx, detail, x + 14, y + 26, width - 28);
    ctx.restore();
  }

  function drawClampedText(ctx, text, x, y, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.fillText(text, x, y);
      return;
    }
    let clipped = text;
    while (clipped.length > 3 && ctx.measureText(`${clipped}…`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    ctx.fillText(`${clipped}…`, x, y);
  }

  function formatDirection(point) {
    if (!point) return "—";
    const x = Number(point.xMm) || 0;
    const y = Number(point.yMm) || 0;
    const parts = [];
    if (Math.abs(x) >= 0.5) parts.push(`${Math.abs(x).toFixed(1)}mm ${x < 0 ? "left" : "right"}`);
    if (Math.abs(y) >= 0.5) parts.push(`${Math.abs(y).toFixed(1)}mm ${y < 0 ? "high" : "low"}`);
    return parts.length ? parts.join(" · ") : "centred";
  }

  function formatMm(value) {
    if (!Number.isFinite(Number(value))) return "—";
    const numeric = Number(value);
    if (numeric >= 100) return `${Math.round(numeric)}mm`;
    return `${Math.round(numeric * 10) / 10}mm`;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }

  App.IntelligenceOverlayRenderer = {
    drawIntelligenceOverlay
  };
})();
