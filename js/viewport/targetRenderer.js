(function () {
  const App = window.ArcheryApp;
  const sortedZonesCache = new WeakMap();

  function drawTarget(ctx, canvas, transform, targetFace, options = {}) {
    const center = App.ViewportMath.getCanvasCenter(canvas);
    const x = center.x + transform.currentPanX;
    const y = center.y + transform.currentPanY;
    const zones = getSortedZones(targetFace);
    const visibility = normalizeTargetVisibility(options.visibility);

    ctx.save();
    applyTargetVisibility(ctx, visibility);
    if (options.drawShadow !== false) {
      drawSoftShadow(ctx, x, y, targetFace.diameterMm * transform.currentPxPerMm / 2);
    }

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
    drawCentreLabel(ctx, x, y, transform, targetFace);
    drawRingLabels(ctx, x, y, zones, transform, targetFace);
    ctx.restore();
  }

  function getSortedZones(targetFace) {
    if (!targetFace || !Array.isArray(targetFace.zones)) return [];
    const cached = sortedZonesCache.get(targetFace);
    if (cached && cached.source === targetFace.zones) return cached.zones;
    const zones = targetFace.zones.slice().sort((a, b) => b.radiusMm - a.radiusMm);
    sortedZonesCache.set(targetFace, { source: targetFace.zones, zones });
    return zones;
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
    if (targetFace.centreLabel || hasCentreZoneLabel(targetFace)) return;
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
    const labelSettings = getLabelSettings(targetFace);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    zones.forEach(zone => {
      const label = getZoneTargetLabel(zone);
      if (!label) return;

      const position = getZoneLabelPosition(zone, labelSettings);
      const fontSizePx = getLabelSizePx(zone.labelSize, targetFace, transform);
      if (fontSizePx < 2.5) return;

      ctx.font = `800 ${fontSizePx}px Inter, system-ui, sans-serif`;
      const point = getLabelPoint(centerX, centerY, zone, zones, position, labelSettings, transform);
      ctx.fillStyle = labelSettings.autoContrast ? labelTextColour(zone.fill) : (zone.labelFill || labelTextColour(zone.fill));
      ctx.globalAlpha = position === "center" ? 0.92 : 0.72;
      ctx.fillText(label, point.x, point.y + (position === "center" ? fontSizePx * 0.03 : 0));
    });
    ctx.restore();
  }

  function getZoneTargetLabel(zone) {
    return String(zone.targetLabel || zone.label || "").trim();
  }

  function getLabelSettings(targetFace) {
    const labels = targetFace.labels || {};
    return {
      position: normalizeSharedLabelPosition(labels.position) || "horizontal",
      depth: normalizeLabelDepth(labels.depth) || "middle",
      autoContrast: labels.autoContrast !== false
    };
  }

  function hasCentreZoneLabel(targetFace) {
    return Array.isArray(targetFace?.zones) && targetFace.zones.some(zone => zone.labelPosition === "center" && String(zone.label || "").trim());
  }

  function getZoneLabelPosition(zone, labelSettings) {
    return normalizeZoneLabelPosition(zone.labelPosition) || labelSettings.position;
  }

  function getLabelPoint(centerX, centerY, zone, zones, position, labelSettings, transform) {
    if (position === "center") return { x: centerX, y: centerY };

    const labelRadiusMm = getZoneLabelRadiusMm(zone, zones, getZoneLabelDepth(zone, labelSettings));
    const labelRadiusPx = labelRadiusMm * transform.currentPxPerMm;
    const angle = getLabelAngle(position);
    return {
      x: centerX + Math.cos(angle) * labelRadiusPx,
      y: centerY + Math.sin(angle) * labelRadiusPx
    };
  }

  function getZoneLabelRadiusMm(zone, zones, depth) {
    const outerRadiusMm = Math.max(0, Number(zone.radiusMm) || 0);
    const innerRadiusMm = getInnerRadiusMm(zone, zones);
    const bandWidthMm = Math.max(0, outerRadiusMm - innerRadiusMm);
    return innerRadiusMm + bandWidthMm * getLabelDepthRatio(depth);
  }

  function getInnerRadiusMm(zone, zones) {
    const outerRadiusMm = Number(zone.radiusMm) || 0;
    return zones.reduce((inner, candidate) => {
      const radiusMm = Number(candidate.radiusMm) || 0;
      return radiusMm < outerRadiusMm && radiusMm > inner ? radiusMm : inner;
    }, 0);
  }

  function getZoneLabelDepth(zone, labelSettings) {
    return normalizeLabelDepth(zone.labelDepth) || labelSettings.depth || "outer";
  }

  function getLabelDepthRatio(depth) {
    if (depth === "inner") return 0.28;
    if (depth === "middle") return 0.52;
    return 0.76;
  }

  function getLabelAngle(position) {
    if (position === "vertical") return -Math.PI / 2;
    if (position === "horizontal") return 0;
    if (position === "diagonal-left") return -Math.PI * 3 / 4;
    if (position === "vertical-down") return Math.PI / 2;
    if (position === "horizontal-left") return Math.PI;
    if (position === "diagonal-down-right") return Math.PI / 4;
    if (position === "diagonal-down-left") return Math.PI * 3 / 4;
    return -Math.PI / 4;
  }

  function normalizeSharedLabelPosition(position) {
    return [
      "diagonal",
      "vertical",
      "horizontal",
      "diagonal-left",
      "vertical-down",
      "horizontal-left",
      "diagonal-down-right",
      "diagonal-down-left"
    ].includes(position) ? position : "";
  }

  function normalizeZoneLabelPosition(position) {
    return position === "center" || normalizeSharedLabelPosition(position) ? position : "";
  }

  function normalizeLabelDepth(value) {
    return ["inner", "middle", "outer"].includes(value) ? value : "";
  }

  function getLabelSizePx(size, targetFace, transform) {
    return getLabelSizeMm(size, targetFace) * transform.currentPxPerMm;
  }

  function getLabelSizeMm(size, targetFace) {
    const diameterMm = Math.max(1, Number(targetFace?.diameterMm) || 1);
    const ratios = {
      small: 0.014,
      medium: 0.017,
      large: 0.021,
      "x-large": 0.026,
      "xx-large": 0.034,
      "xxx-large": 0.043,
      huge: 0.054
    };
    return diameterMm * (ratios[size] || ratios.medium);
  }

  function labelTextColour(fill) {
    const normalized = String(fill || "").toLowerCase();
    const darkFills = ["#20252b", "#2684d9", "#e44242", "#080b0f", "#000000", "#111111"];
    return darkFills.includes(normalized) ? "#f8fbff" : "#121820";
  }

  App.TargetRenderer = { drawTarget };
})();
