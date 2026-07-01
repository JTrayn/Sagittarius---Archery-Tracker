(function () {
  const App = window.ArcheryApp;

  function drawTarget(ctx, canvas, transform, targetFace, options = {}) {
    const center = App.ViewportMath.getCanvasCenter(canvas);
    const x = center.x + transform.currentPanX;
    const y = center.y + transform.currentPanY;
    const zones = targetFace.zones.slice().sort((a, b) => b.radiusMm - a.radiusMm);
    const visibility = normalizeTargetVisibility(options.visibility);

    ctx.save();
    applyTargetVisibility(ctx, visibility);
    drawSoftShadow(ctx, x, y, targetFace.diameterMm * transform.currentPxPerMm / 2);

    zones.forEach(zone => {
      const radiusPx = zone.radiusMm * transform.currentPxPerMm;
      ctx.beginPath();
      ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
      ctx.fillStyle = zone.fill;
      ctx.fill();
      ctx.lineWidth = Math.max(1, zone.strokeWidthMm * transform.currentPxPerMm);
      ctx.strokeStyle = zone.stroke;
      ctx.stroke();
    });

    drawCentreCross(ctx, x, y, transform, targetFace);
    drawRingLabels(ctx, x, y, zones, transform, targetFace);
    drawCentreLabel(ctx, x, y, transform, targetFace);
    ctx.restore();
  }

  function normalizeTargetVisibility(value) {
    return App.Geometry.clamp(Number(value) || 1, 0.35, 1);
  }

  function applyTargetVisibility(ctx, visibility) {
    if (visibility >= 0.995) return;

    const progress = (visibility - 0.35) / 0.65;
    const saturation = 0.42 + progress * 0.58;
    const brightness = 0.68 + progress * 0.32;
    const opacity = 0.72 + progress * 0.28;

    if ("filter" in ctx) {
      ctx.filter = `saturate(${Math.round(saturation * 100)}%) brightness(${Math.round(brightness * 100)}%) opacity(${Math.round(opacity * 100)}%)`;
    } else {
      ctx.globalAlpha *= opacity;
    }
  }

  function drawSoftShadow(ctx, x, y, radiusPx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radiusPx + 4, 0, Math.PI * 2);
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "rgba(0,0,0,0.02)";
    ctx.fill();
    ctx.restore();
  }

  function drawCentreCross(ctx, x, y, transform, targetFace) {
    if (targetFace.centreLabel) return;
    const size = App.Geometry.clamp(5 * transform.currentPxPerMm, 5, 18);
    ctx.save();
    ctx.strokeStyle = "rgba(6, 12, 18, 0.58)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();
    ctx.restore();
  }

  function drawCentreLabel(ctx, centerX, centerY, transform, targetFace) {
    const label = targetFace.centreLabel;
    if (!label || transform.currentPxPerMm < 0.2) return;

    const size = App.Geometry.clamp(
      (label.scaleMm || 12) * transform.currentPxPerMm,
      label.minPx || 16,
      label.maxPx || 72
    );

    ctx.save();
    ctx.font = `${label.fontWeight || 900} ${size}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = label.fill || "#ff3347";
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = Math.max(2, size * 0.08);
    ctx.fillText(label.text || "X", centerX, centerY + size * 0.03);
    ctx.restore();
  }

  function drawRingLabels(ctx, centerX, centerY, zones, transform, targetFace) {
    if (transform.currentPxPerMm < 0.34) return;
    const labelSettings = getLabelSettings(targetFace);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    zones.forEach(zone => {
      if (zone.label === "X") return;
      const radiusPx = zone.radiusMm * transform.currentPxPerMm;
      if (radiusPx < 34) return;
      ctx.font = `800 ${getLabelSizePx(zone.labelSize)}px Inter, system-ui, sans-serif`;
      const labelRadiusPx = radiusPx - Math.min(24, Math.max(12, 16 * transform.currentPxPerMm));
      const angle = getLabelAngle(labelSettings.position);
      const x = centerX + Math.cos(angle) * labelRadiusPx;
      const y = centerY + Math.sin(angle) * labelRadiusPx;
      ctx.fillStyle = labelSettings.autoContrast ? labelTextColour(zone.fill) : (zone.labelFill || labelTextColour(zone.fill));
      ctx.globalAlpha = 0.72;
      ctx.fillText(zone.label, x, y);
    });
    ctx.restore();
  }

  function getLabelSettings(targetFace) {
    const labels = targetFace.labels || {};
    return {
      position: labels.position || (targetFace.family === "Indoor Archery WA" ? "vertical" : "diagonal"),
      autoContrast: labels.autoContrast !== false
    };
  }

  function getLabelAngle(position) {
    if (position === "vertical") return -Math.PI / 2;
    if (position === "horizontal") return 0;
    if (position === "diagonal-left") return -Math.PI * 3 / 4;
    return -Math.PI / 4;
  }

  function getLabelSizePx(size) {
    if (size === "small") return 10;
    if (size === "large") return 15;
    if (size === "x-large") return 18;
    return 12;
  }

  function labelTextColour(fill) {
    const normalized = String(fill || "").toLowerCase();
    const darkFills = ["#20252b", "#2684d9", "#e44242", "#080b0f", "#000000", "#111111"];
    return darkFills.includes(normalized) ? "#f8fbff" : "#121820";
  }

  App.TargetRenderer = { drawTarget };
})();
