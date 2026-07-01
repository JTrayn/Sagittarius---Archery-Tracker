(function () {
  const App = window.ArcheryApp;

  const THEMES = {
    radial: {
      name: "Radial",
      title: "Radial σ radius",
      stroke: "rgba(85, 214, 190, 0.86)",
      strokeSoft: "rgba(255, 255, 255, 0.30)",
      fill: "rgba(85, 214, 190, 0.055)",
      fillFocus: "rgba(85, 214, 190, 0.145)",
      glow: "rgba(85, 214, 190, 0.18)",
      glowFocus: "rgba(85, 214, 190, 0.38)",
      marker: "rgba(85, 214, 190, 0.96)"
    },
    simple: {
      name: "Simple",
      title: "Simple radius",
      stroke: "rgba(255, 104, 119, 0.84)",
      strokeSoft: "rgba(255, 255, 255, 0.27)",
      fill: "rgba(255, 104, 119, 0.045)",
      fillFocus: "rgba(255, 104, 119, 0.125)",
      glow: "rgba(255, 104, 119, 0.16)",
      glowFocus: "rgba(255, 104, 119, 0.34)",
      marker: "rgba(255, 104, 119, 0.96)"
    }
  };

  function getVisiblePlottedEntries(scorecard, visibleEndIndex = null) {
    return App.ArrowRenderer.getVisibleArrowEntries(scorecard, visibleEndIndex)
      .filter(entry => entry.arrow && entry.arrow.position)
      .map(entry => ({
        ...entry,
        point: {
          xMm: Number(entry.arrow.position.xMm) || 0,
          yMm: Number(entry.arrow.position.yMm) || 0
        }
      }));
  }

  function calculateGroupStats(entries) {
    return calculateRadialGroupStats(entries);
  }

  function calculateRadialGroupStats(entries) {
    const points = entries.map(entry => entry.point).filter(Boolean);
    if (!points.length) return null;

    const centroid = calculateCentroid(points);
    const radialDistances = points.map(point => Math.hypot(point.xMm - centroid.xMm, point.yMm - centroid.yMm));
    const radialStdMm = Math.sqrt(radialDistances.reduce((sum, value) => sum + value * value, 0) / points.length);
    const meanRadiusMm = radialDistances.reduce((sum, value) => sum + value, 0) / points.length;
    const maxRadiusMm = Math.max(...radialDistances);

    return {
      method: "radial-dispersion",
      count: points.length,
      centroid,
      circle: {
        center: centroid,
        radiusMm: radialStdMm
      },
      radiusMm: radialStdMm,
      radialStdMm,
      radialStdDiameterMm: radialStdMm * 2,
      meanRadiusMm,
      maxRadiusMm,
      extremeSpreadMm: calculateExtremeSpread(points)
    };
  }

  function calculateSimpleGroupStats(entries) {
    const points = entries.map(entry => entry.point).filter(Boolean);
    if (!points.length) return null;
    const circle = smallestEnclosingCircle(points);
    return {
      method: "minimum-enclosing-circle",
      count: points.length,
      centroid: circle.center,
      circle,
      radiusMm: circle.radiusMm,
      diameterMm: circle.radiusMm * 2,
      extremeSpreadMm: calculateExtremeSpread(points)
    };
  }

  function calculateCentroid(points) {
    const centroid = points.reduce((sum, point) => ({
      xMm: sum.xMm + point.xMm,
      yMm: sum.yMm + point.yMm
    }), { xMm: 0, yMm: 0 });
    centroid.xMm /= points.length;
    centroid.yMm /= points.length;
    return centroid;
  }

  function getGroupingHoverState(canvas, transform, scorecard, options = {}) {
    const pointer = options.pointerScreen || null;
    const result = {
      any: false,
      radial: false,
      simple: false,
      hoveredKind: null
    };
    if (!pointer || !scorecard) return result;

    const entries = getVisiblePlottedEntries(scorecard, options.visibleEndIndex);
    if (entries.length < 2) return result;

    if (options.showSimple === true) {
      const simple = calculateSimpleGroupStats(entries);
      if (simple && isPointerHoveringCircle(pointer, App.ViewportMath.worldToScreen(simple.circle.center, canvas, transform), Math.max(2, simple.circle.radiusMm * transform.currentPxPerMm))) {
        result.simple = true;
        result.any = true;
        result.hoveredKind = result.hoveredKind || "simple";
      }
    }

    if (options.showRadial !== false) {
      const radial = calculateRadialGroupStats(entries);
      if (radial && isPointerHoveringCircle(pointer, App.ViewportMath.worldToScreen(radial.circle.center, canvas, transform), Math.max(2, radial.circle.radiusMm * transform.currentPxPerMm))) {
        result.radial = true;
        result.any = true;
        result.hoveredKind = result.hoveredKind || "radial";
      }
    }

    return result;
  }

  function drawGroupingOverlay(ctx, canvas, transform, scorecard, options = {}) {
    const entries = getVisiblePlottedEntries(scorecard, options.visibleEndIndex);
    if (entries.length < 2) return null;

    const showRadial = options.showRadial !== false;
    const showSimple = options.showSimple === true;
    const showLabel = options.showLabel !== false;
    const pointer = options.pointerScreen || null;
    const hoverState = options.hoverState || getGroupingHoverState(canvas, transform, scorecard, {
      visibleEndIndex: options.visibleEndIndex,
      showRadial,
      showSimple,
      pointerScreen: pointer
    });
    const focusAmount = Number(options.focusAmount) || 0;
    const results = {};

    ctx.save();
    if (showSimple) {
      const simple = calculateSimpleGroupStats(entries);
      if (simple) {
        results.simple = simple;
        drawSingleOverlay(ctx, canvas, transform, simple, THEMES.simple, {
          pointer,
          showLabel,
          labelOffset: showRadial ? 34 : 0,
          isHovered: Boolean(hoverState.simple),
          focusAmount
        });
      }
    }

    if (showRadial) {
      const radial = calculateRadialGroupStats(entries);
      if (radial) {
        results.radial = radial;
        drawSingleOverlay(ctx, canvas, transform, radial, THEMES.radial, {
          pointer,
          showLabel,
          labelOffset: 0,
          isHovered: Boolean(hoverState.radial),
          focusAmount
        });
      }
    }
    ctx.restore();

    return results.radial || results.simple || null;
  }

  function drawSingleOverlay(ctx, canvas, transform, stats, theme, options = {}) {
    const centre = App.ViewportMath.worldToScreen(stats.circle.center, canvas, transform);
    const radiusPx = Math.max(2, stats.circle.radiusMm * transform.currentPxPerMm);
    drawGroupCircle(ctx, centre, radiusPx, theme, {
      isHovered: Boolean(options.isHovered),
      focusAmount: options.focusAmount || 0
    });
    drawCentroid(ctx, centre, theme, {
      isHovered: Boolean(options.isHovered),
      focusAmount: options.focusAmount || 0
    });

    if (options.showLabel && options.isHovered) {
      drawGroupLabel(ctx, canvas, centre, radiusPx, stats, theme, options.labelOffset || 0);
    }
  }

  function drawGroupCircle(ctx, centre, radiusPx, theme, options = {}) {
    const focus = options.isHovered ? App.Geometry.clamp(options.focusAmount || 0, 0, 1) : 0;

    ctx.save();

    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = focus > 0.01 ? blendRgba(theme.fill, theme.fillFocus, focus) : theme.fill;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radiusPx, 0, Math.PI * 2);
    ctx.lineWidth = 3.6 + focus * 1.8;
    ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
    ctx.shadowBlur = 7 + focus * 4;
    ctx.strokeStyle = `rgba(1, 8, 13, ${0.34 + focus * 0.18})`;
    ctx.stroke();

    ctx.shadowColor = focus > 0.01 ? blendRgba(theme.glow, theme.glowFocus, focus) : theme.glow;
    ctx.shadowBlur = 7 + focus * 9;
    ctx.lineWidth = 1.85 + focus * 1.15;
    ctx.strokeStyle = theme.stroke;
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.lineWidth = 0.9 + focus * 0.35;
    ctx.strokeStyle = theme.strokeSoft;
    ctx.stroke();

    ctx.restore();
  }

  function drawCentroid(ctx, point, theme, options = {}) {
    const focus = options.isHovered ? App.Geometry.clamp(options.focusAmount || 0, 0, 1) : 0;
    const arm = 5.8 + focus * 2.2;
    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0, 0, 0, 0.44)";
    ctx.shadowBlur = 6 + focus * 3;
    ctx.strokeStyle = "rgba(1, 8, 13, 0.62)";
    ctx.lineWidth = 2.7 + focus * 0.7;
    ctx.beginPath();
    ctx.moveTo(point.x - arm, point.y);
    ctx.lineTo(point.x + arm, point.y);
    ctx.moveTo(point.x, point.y - arm);
    ctx.lineTo(point.x, point.y + arm);
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.8 + focus * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = theme.marker;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.68)";
    ctx.stroke();
    ctx.restore();
  }

  function isPointerHoveringCircle(pointer, centre, radiusPx) {
    if (!pointer) return false;
    const distancePx = Math.hypot(pointer.x - centre.x, pointer.y - centre.y);
    if (radiusPx < 22) return distancePx <= radiusPx + 10;
    const tolerance = Math.max(10, Math.min(24, radiusPx * 0.085));
    return Math.abs(distancePx - radiusPx) <= tolerance;
  }

  function drawGroupLabel(ctx, canvas, centre, radiusPx, stats, theme, labelOffset) {
    const rect = App.ViewportMath.getCanvasRect(canvas);
    const label = `${theme.title}: ${formatMm(stats.radiusMm)}`;

    ctx.save();
    ctx.font = "900 12px Inter, system-ui, sans-serif";
    const width = Math.max(132, ctx.measureText(label).width + 24);
    const height = 36;
    const desiredX = centre.x - width / 2;
    const desiredY = centre.y - radiusPx - height - 13 - labelOffset;
    const x = App.Geometry.clamp(desiredX, 12, Math.max(12, rect.width - width - 12));
    const y = App.Geometry.clamp(desiredY, 12, Math.max(12, rect.height - height - 12));

    ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, 15);
    ctx.fillStyle = "rgba(7, 17, 27, 0.86)";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme.strokeSoft;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(238, 247, 255, 0.96)";
    ctx.fillText(label, x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
  }

  function calculateExtremeSpread(points) {
    let max = 0;
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        max = Math.max(max, distance(points[i], points[j]));
      }
    }
    return max;
  }

  function smallestEnclosingCircle(points) {
    if (!points.length) return { center: { xMm: 0, yMm: 0 }, radiusMm: 0 };

    let circle = null;
    const ordered = points.slice();
    ordered.sort((a, b) => a.xMm - b.xMm || a.yMm - b.yMm);

    for (let i = 0; i < ordered.length; i += 1) {
      const p = ordered[i];
      if (circle && contains(circle, p)) continue;
      circle = circleFromOnePoint(p);

      for (let j = 0; j < i; j += 1) {
        const q = ordered[j];
        if (contains(circle, q)) continue;
        circle = circleFromTwoPoints(p, q);

        for (let k = 0; k < j; k += 1) {
          const r = ordered[k];
          if (contains(circle, r)) continue;
          const candidate = circleFromThreePoints(p, q, r);
          circle = candidate || circleFromFarthestPair(p, q, r);
        }
      }
    }

    return circle || circleFromOnePoint(points[0]);
  }

  function circleFromOnePoint(point) {
    return { center: { xMm: point.xMm, yMm: point.yMm }, radiusMm: 0 };
  }

  function circleFromTwoPoints(a, b) {
    const center = {
      xMm: (a.xMm + b.xMm) / 2,
      yMm: (a.yMm + b.yMm) / 2
    };
    return { center, radiusMm: distance(center, a) };
  }

  function circleFromFarthestPair(a, b, c) {
    const pairs = [
      circleFromTwoPoints(a, b),
      circleFromTwoPoints(a, c),
      circleFromTwoPoints(b, c)
    ];
    pairs.sort((left, right) => left.radiusMm - right.radiusMm);
    return pairs.find(circle => contains(circle, a) && contains(circle, b) && contains(circle, c)) || pairs[pairs.length - 1];
  }

  function circleFromThreePoints(a, b, c) {
    const ax = a.xMm;
    const ay = a.yMm;
    const bx = b.xMm;
    const by = b.yMm;
    const cx = c.xMm;
    const cy = c.yMm;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 0.000001) return null;

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const center = { xMm: ux, yMm: uy };
    return { center, radiusMm: Math.max(distance(center, a), distance(center, b), distance(center, c)) };
  }

  function contains(circle, point) {
    return distance(circle.center, point) <= circle.radiusMm + 0.000001;
  }

  function distance(a, b) {
    return Math.hypot(a.xMm - b.xMm, a.yMm - b.yMm);
  }

  function formatMm(value) {
    if (!Number.isFinite(value)) return "—";
    if (value >= 100) return `${Math.round(value)}mm`;
    return `${Math.round(value * 10) / 10}mm`;
  }

  function blendRgba(from, to, amount) {
    const a = parseRgba(from);
    const b = parseRgba(to);
    if (!a || !b) return amount > 0.5 ? to : from;
    const t = App.Geometry.clamp(amount, 0, 1);
    return `rgba(${Math.round(lerp(a.r, b.r, t))}, ${Math.round(lerp(a.g, b.g, t))}, ${Math.round(lerp(a.b, b.b, t))}, ${roundAlpha(lerp(a.a, b.a, t))})`;
  }

  function parseRgba(value) {
    const match = String(value).match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1].split(",").map(part => Number(part.trim()));
    if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: Number.isFinite(parts[3]) ? parts[3] : 1
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function roundAlpha(value) {
    return Math.round(value * 1000) / 1000;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }

  App.GroupingRenderer = {
    getVisiblePlottedEntries,
    calculateGroupStats,
    calculateRadialGroupStats,
    calculateSimpleGroupStats,
    drawGroupingOverlay,
    getGroupingHoverState
  };
})();
