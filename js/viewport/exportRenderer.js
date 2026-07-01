(function () {
  const App = window.ArcheryApp;

  const EXPORT = {
    targetWidth: 1800,
    targetHeight: 2100,
    sheetWidth: 2400,
    sheetHeight: 3200,
    margin: 110,
    headerHeight: 220
  };

  function exportVisibleTarget(scorecard, targetFace, visibleEndIndex, options = {}) {
    const label = visibleEndIndex === null ? "visible-target" : `end-${visibleEndIndex + 1}`;
    const title = visibleEndIndex === null ? "Visible target" : `End ${visibleEndIndex + 1}`;
    const canvas = renderTargetImage(scorecard, targetFace, {
      visibleEndIndex,
      title,
      subtitle: options.subtitle || makeSubtitle(scorecard, targetFace),
      showArrowLabels: options.showArrowLabels !== false,
      showRadialGrouping: options.showRadialGrouping !== false,
      showSimpleGrouping: options.showSimpleGrouping === true
    });
    downloadCanvas(canvas, `${safeFileName(scorecard.name || "archery-scorecard")}-${label}.png`);
  }

  function exportFullScorecardTarget(scorecard, targetFace, options = {}) {
    const canvas = renderTargetImage(scorecard, targetFace, {
      visibleEndIndex: null,
      title: "Full scorecard target",
      subtitle: makeSubtitle(scorecard, targetFace),
      showArrowLabels: options.showArrowLabels !== false,
      showRadialGrouping: options.showRadialGrouping !== false,
      showSimpleGrouping: options.showSimpleGrouping === true
    });
    downloadCanvas(canvas, `${safeFileName(scorecard.name || "archery-scorecard")}-full-target.png`);
  }

  function exportEndSheet(scorecard, targetFace, options = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT.sheetWidth;
    canvas.height = EXPORT.sheetHeight;
    canvas.__archeryExportRect = { width: canvas.width, height: canvas.height, left: 0, top: 0 };
    const ctx = canvas.getContext("2d");
    drawExportBackground(ctx, canvas.width, canvas.height);
    drawSheetHeader(ctx, scorecard, targetFace);

    const endCount = scorecard.ends.length;
    const columns = chooseColumnCount(endCount);
    const rows = Math.ceil(endCount / columns);
    const gap = 34;
    const top = 330;
    const usableWidth = canvas.width - EXPORT.margin * 2;
    const usableHeight = canvas.height - top - EXPORT.margin;
    const cellWidth = (usableWidth - gap * (columns - 1)) / columns;
    const cellHeight = (usableHeight - gap * (rows - 1)) / rows;

    scorecard.ends.forEach((end, endIndex) => {
      const col = endIndex % columns;
      const row = Math.floor(endIndex / columns);
      const x = EXPORT.margin + col * (cellWidth + gap);
      const y = top + row * (cellHeight + gap);
      drawEndCell(ctx, scorecard, targetFace, endIndex, x, y, cellWidth, cellHeight, options);
    });

    delete canvas.__archeryExportRect;
    downloadCanvas(canvas, `${safeFileName(scorecard.name || "archery-scorecard")}-end-sheet.png`);
  }

  function renderTargetImage(scorecard, targetFace, options = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT.targetWidth;
    canvas.height = EXPORT.targetHeight;
    canvas.__archeryExportRect = { width: canvas.width, height: canvas.height, left: 0, top: 0 };
    const ctx = canvas.getContext("2d");
    drawExportBackground(ctx, canvas.width, canvas.height);
    drawTargetHeader(ctx, scorecard, targetFace, options);

    const transform = makeFitTransform(canvas, targetFace, {
      top: EXPORT.headerHeight + 76,
      right: EXPORT.margin,
      bottom: EXPORT.margin,
      left: EXPORT.margin
    });

    App.TargetRenderer.drawTarget(ctx, canvas, transform, targetFace);
    if (options.showRadialGrouping || options.showSimpleGrouping) {
      App.GroupingRenderer.drawGroupingOverlay(ctx, canvas, transform, scorecard, {
        visibleEndIndex: options.visibleEndIndex ?? null,
        showRadial: options.showRadialGrouping,
        showSimple: options.showSimpleGrouping,
        showLabel: false
      });
    }
    App.ArrowRenderer.drawArrows(
      ctx,
      canvas,
      transform,
      scorecard,
      targetFace,
      { endIndex: -1, arrowIndex: -1 },
      options.showArrowLabels !== false,
      null,
      { visibleEndIndex: options.visibleEndIndex ?? null }
    );

    delete canvas.__archeryExportRect;
    return canvas;
  }

  function drawEndCell(ctx, scorecard, targetFace, endIndex, x, y, width, height, options = {}) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, 34);
    ctx.fillStyle = "rgba(12, 28, 42, 0.92)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(151, 184, 212, 0.22)";
    ctx.stroke();
    ctx.restore();

    const end = scorecard.ends[endIndex];
    const endTotal = App.ScoringEngine.calculateEndTotal(end, targetFace);
    const scoreItems = end.arrows.map(arrow => App.ScoringEngine.scoreArrow(arrow, targetFace));

    ctx.save();
    ctx.fillStyle = "rgba(238, 247, 255, 0.96)";
    ctx.font = "900 34px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(`End ${endIndex + 1}`, x + 30, y + 24);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 209, 102, 0.96)";
    ctx.fillText(`${endTotal}`, x + width - 30, y + 24);
    ctx.restore();

    drawScoreBadges(ctx, scoreItems, targetFace, x + 30, y + 67, width - 60);

    const inset = 54;
    const labelSpace = 105;
    const targetBox = {
      x: x + inset,
      y: y + labelSpace,
      width: width - inset * 2,
      height: height - labelSpace - inset
    };
    const tempCanvas = makeVirtualCanvas(targetBox.width, targetBox.height);
    const transform = makeFitTransform(tempCanvas, targetFace, { top: 16, right: 16, bottom: 16, left: 16 });
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.clearRect(0, 0, targetBox.width, targetBox.height);
    App.TargetRenderer.drawTarget(tempCtx, tempCanvas, transform, targetFace);
    if (options.showRadialGrouping !== false || options.showSimpleGrouping === true) {
      App.GroupingRenderer.drawGroupingOverlay(tempCtx, tempCanvas, transform, scorecard, {
        visibleEndIndex: endIndex,
        showRadial: options.showRadialGrouping !== false,
        showSimple: options.showSimpleGrouping === true,
        showLabel: false
      });
    }
    App.ArrowRenderer.drawArrows(
      tempCtx,
      tempCanvas,
      transform,
      scorecard,
      targetFace,
      { endIndex: -1, arrowIndex: -1 },
      options.showArrowLabels !== false,
      null,
      { visibleEndIndex: endIndex }
    );
    delete tempCanvas.__archeryExportRect;
    ctx.drawImage(tempCanvas, targetBox.x, targetBox.y);
  }


  function drawScoreBadges(ctx, scores, targetFace, x, y, maxWidth) {
    ctx.save();
    ctx.font = "900 15px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    let cursorX = x;
    let cursorY = y;
    const gap = 6;
    const badgeHeight = 25;

    scores.forEach(score => {
      const label = App.ScoreFormatting.arrowDisplay(score);
      const badgeWidth = Math.max(26, ctx.measureText(label).width + 16);
      if (cursorX + badgeWidth > x + maxWidth && cursorX > x) {
        cursorX = x;
        cursorY += badgeHeight + 5;
      }

      const colors = getScoreBadgeColors(score, targetFace);
      ctx.beginPath();
      roundRect(ctx, cursorX, cursorY, badgeWidth, badgeHeight, 11);
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = colors.stroke;
      ctx.stroke();
      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.fillText(label, cursorX + badgeWidth / 2, cursorY + badgeHeight / 2 + 0.5);

      cursorX += badgeWidth + gap;
    });

    ctx.restore();
  }

  function getScoreBadgeColors(score, targetFace) {
    if (!score) {
      return {
        fill: "rgba(180, 201, 219, 0.16)",
        stroke: "rgba(180, 201, 219, 0.24)",
        text: "rgba(238, 247, 255, 0.82)"
      };
    }
    if (score.isMiss) {
      return {
        fill: "rgba(255, 107, 122, 0.92)",
        stroke: "rgba(255, 255, 255, 0.52)",
        text: "#041018"
      };
    }
    const zone = targetFace.zones.find(item => item.id === score.zoneId || item.label === score.label);
    const fill = zone && zone.fill ? zone.fill : "#55d6be";
    return {
      fill,
      stroke: "rgba(255, 255, 255, 0.58)",
      text: readableTextColor(fill)
    };
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

  function makeVirtualCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    canvas.__archeryExportRect = { width: canvas.width, height: canvas.height, left: 0, top: 0 };
    return canvas;
  }

  function makeFitTransform(canvas, targetFace, padding) {
    const rect = App.ViewportMath.getCanvasRect(canvas);
    const availableWidth = Math.max(100, rect.width - padding.left - padding.right);
    const availableHeight = Math.max(100, rect.height - padding.top - padding.bottom);
    const scale = Math.min(availableWidth, availableHeight) / targetFace.diameterMm;
    const centreX = padding.left + availableWidth / 2;
    const centreY = padding.top + availableHeight / 2;
    return {
      currentPxPerMm: scale,
      targetPxPerMm: scale,
      currentPanX: centreX - rect.width / 2,
      currentPanY: centreY - rect.height / 2,
      targetPanX: centreX - rect.width / 2,
      targetPanY: centreY - rect.height / 2
    };
  }

  function drawExportBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#08121d");
    gradient.addColorStop(1, "#101f2f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    for (let x = 0; x < width; x += 80) ctx.fillRect(x, 0, 1, height);
    for (let y = 0; y < height; y += 80) ctx.fillRect(0, y, width, 1);
    ctx.restore();
  }

  function drawTargetHeader(ctx, scorecard, targetFace, options) {
    const summary = App.ScoreFormatting.formatSummary(scorecard, targetFace);
    ctx.save();
    ctx.fillStyle = "rgba(238, 247, 255, 0.98)";
    ctx.font = "950 58px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(options.title || "Target image", EXPORT.margin, 68);

    ctx.font = "760 25px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(180, 201, 219, 0.94)";
    ctx.fillText(options.subtitle || makeSubtitle(scorecard, targetFace), EXPORT.margin, 140);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 209, 102, 0.98)";
    ctx.font = "950 52px Inter, system-ui, sans-serif";
    ctx.fillText(summary.scoreText, EXPORT.targetWidth - EXPORT.margin, 72);
    ctx.font = "760 22px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(180, 201, 219, 0.84)";
    ctx.fillText(`${summary.totals.xCount} X · ${summary.totals.missCount} miss · ${summary.arrowsText}`, EXPORT.targetWidth - EXPORT.margin, 138);
    ctx.restore();
  }

  function drawSheetHeader(ctx, scorecard, targetFace) {
    const summary = App.ScoreFormatting.formatSummary(scorecard, targetFace);
    ctx.save();
    ctx.fillStyle = "rgba(238, 247, 255, 0.98)";
    ctx.font = "950 66px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("End sheet", EXPORT.margin, 74);
    ctx.font = "760 28px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(180, 201, 219, 0.94)";
    ctx.fillText(makeSubtitle(scorecard, targetFace), EXPORT.margin, 154);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 209, 102, 0.98)";
    ctx.font = "950 56px Inter, system-ui, sans-serif";
    ctx.fillText(summary.scoreText, EXPORT.sheetWidth - EXPORT.margin, 82);
    ctx.font = "760 24px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(180, 201, 219, 0.84)";
    ctx.fillText(`${summary.totals.xCount} X · ${summary.totals.missCount} miss`, EXPORT.sheetWidth - EXPORT.margin, 150);
    ctx.restore();
  }

  function chooseColumnCount(endCount) {
    if (endCount <= 4) return 2;
    if (endCount <= 12) return 3;
    return 4;
  }

  function makeSubtitle(scorecard, targetFace) {
    const date = App.Dates.formatDateTime(scorecard.shotAt || scorecard.createdAt);
    return `${scorecard.name || "Untitled Scorecard"} · ${targetFace.shortName || targetFace.name} · ${scorecard.distanceM}m · ${date}`;
  }

  function downloadCanvas(canvas, filename) {
    canvas.toBlob(blob => {
      if (!blob) {
        App.Toast.show("Could not export image", "danger");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      App.Toast.show("Image exported", "success");
    }, "image/png");
  }

  function safeFileName(value) {
    return String(value || "archery-scorecard")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "archery-scorecard";
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }

  App.ExportRenderer = {
    exportVisibleTarget,
    exportFullScorecardTarget,
    exportEndSheet,
    renderTargetImage
  };
})();
