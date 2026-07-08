(function () {
  const App = window.ArcheryApp;

  function resolveArrowStyle(arrow, targetFace, options = {}) {
    if (!App.RingBreakLuck || !arrow?.position || !targetFace) {
      return makeNeutralStyle();
    }

    const detail = App.RingBreakLuck.calculateArrowBreak(arrow, targetFace, options);
    const windowMm = App.RingBreakLuck.getSensitivityWindowMm();
    if (!detail || detail.absMarginMm > windowMm + 0.000001) {
      return makeNeutralStyle({ reason: "neutral" });
    }

    const intensity = App.Geometry.clamp(1 - (detail.absMarginMm / windowMm), 0, 1);
    const isLucky = detail.isLuckySide;
    return makeBreakStyle({ isLucky, intensity, marginMm: detail.marginMm, label: detail.label });
  }

  function makeNeutralStyle(extra = {}) {
    return {
      ...extra,
      ringBreakOverlay: true,
      isNeutralBreak: true,
      alphaMultiplier: 0.34,
      fillStyle: "rgba(18, 25, 34, 0.88)",
      strokeStyle: "rgba(5, 10, 16, 0.94)",
      haloFillStyle: "rgba(0, 0, 0, 0.22)",
      centreFillStyle: "rgba(1, 6, 10, 0.95)"
    };
  }

  function makeBreakStyle({ isLucky, intensity, marginMm, label }) {
    const clampedIntensity = App.Geometry.clamp(Number(intensity) || 0, 0, 1);
    const fill = isLucky
      ? colourFromIntensity(clampedIntensity, [48, 130, 92], [45, 245, 152], 0.78, 0.98)
      : colourFromIntensity(clampedIntensity, [142, 58, 65], [255, 73, 92], 0.78, 0.98);
    const stroke = isLucky
      ? colourFromIntensity(clampedIntensity, [118, 221, 169], [185, 255, 219], 0.78, 0.98)
      : colourFromIntensity(clampedIntensity, [255, 128, 138], [255, 207, 211], 0.78, 0.98);
    const halo = isLucky
      ? colourFromIntensity(clampedIntensity, [40, 190, 124], [60, 255, 166], 0.14, 0.34)
      : colourFromIntensity(clampedIntensity, [224, 58, 73], [255, 84, 101], 0.14, 0.36);

    return {
      ringBreakOverlay: true,
      isNeutralBreak: false,
      isLuckyBreak: Boolean(isLucky),
      intensity: clampedIntensity,
      marginMm,
      label,
      alphaMultiplier: 0.84 + clampedIntensity * 0.16,
      fillStyle: fill,
      strokeStyle: stroke,
      haloFillStyle: halo,
      centreFillStyle: "rgba(2, 10, 14, 0.86)",
      shadowColor: isLucky ? "rgba(45, 245, 152, 0.42)" : "rgba(255, 73, 92, 0.44)",
      shadowBlur: 5 + clampedIntensity * 14,
      haloExtraPx: 2 + clampedIntensity * 4,
      lineWidthExtraPx: clampedIntensity * 1.35
    };
  }

  function colourFromIntensity(intensity, lowRgb, highRgb, lowAlpha, highAlpha) {
    const t = App.Geometry.clamp(Number(intensity) || 0, 0, 1);
    const rgb = lowRgb.map((value, index) => Math.round(value + (highRgb[index] - value) * t));
    const alpha = lowAlpha + (highAlpha - lowAlpha) * t;
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
  }



  App.RingBreakLuckOverlayRenderer = {
    resolveArrowStyle
  };
})();
