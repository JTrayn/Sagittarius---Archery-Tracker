(function () {
  const App = window.ArcheryApp;

  function drawScale(ctx, canvas, transform) {
    const rect = canvas.getBoundingClientRect();
    const targetPx = 140;
    const rawMm = targetPx / transform.currentPxPerMm;
    const niceMm = niceLength(rawMm);
    const widthPx = niceMm * transform.currentPxPerMm;
    const x = 22;
    const y = rect.height - 28;

    ctx.save();
    ctx.strokeStyle = "rgba(238, 247, 255, 0.82)";
    ctx.fillStyle = "rgba(238, 247, 255, 0.86)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y);
    ctx.lineTo(x + widthPx, y);
    ctx.lineTo(x + widthPx, y - 8);
    ctx.stroke();

    ctx.font = "800 12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(formatLength(niceMm), x, y - 11);
    ctx.restore();
  }

  function niceLength(valueMm) {
    const steps = [1, 2, 5];
    const exponent = Math.floor(Math.log10(valueMm));
    const base = Math.pow(10, exponent);
    for (const step of steps) {
      const candidate = step * base;
      if (candidate >= valueMm) return candidate;
    }
    return 10 * base;
  }

  function formatLength(mm) {
    if (mm >= 1000) return `${formatNumber(mm / 1000)} m`;
    if (mm >= 10) return `${formatNumber(mm / 10)} cm`;
    return `${formatNumber(mm)} mm`;
  }

  function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  App.ScaleRenderer = { drawScale, formatLength };
})();
