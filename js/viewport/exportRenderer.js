(function () {
  const App = window.ArcheryApp;

  const EXPORT = {
    targetWidth: 1800,
    targetHeight: 2100,
    sheetWidth: 2400,
    sheetHeight: 3200,
    margin: 110,
    headerHeight: 220,
    groupFitMinSpanMm: 160,
    groupFitPaddingMm: 26,
    groupFitMaxPxPerMm: 12,
    groupFocusAmount: 1
  };

  const SCORECARD_PANEL = {
    gap: 44,
    padding: 28,
    titleHeight: 48,
    headerHeight: 34,
    rowHeight: 46,
    scoreCellSize: 34,
    columnGap: 8,
    radius: 30
  };

  const END_COLOURS = [
    "#55d6be",
    "#ff7a90",
    "#7ab7ff",
    "#ffd166",
    "#b98cff",
    "#7ee787",
    "#ff9f43",
    "#f472d0",
    "#22d3ee",
    "#c4f25f",
    "#ff6b6b",
    "#a78bfa",
    "#4ade80",
    "#facc15",
    "#fb7185",
    "#38bdf8"
  ];

  function exportVisibleTarget(scorecard, targetFace, visibleEndIndex, options = {}) {
    const label = visibleEndIndex === null ? "visible-target" : `end-${visibleEndIndex + 1}`;
    const title = visibleEndIndex === null ? "Visible target" : `End ${visibleEndIndex + 1}`;
    const canvas = renderTargetImage(scorecard, targetFace, {
      visibleEndIndex,
      title,
      subtitle: options.subtitle || makeSubtitle(scorecard, targetFace),
      showArrowLabels: options.showArrowLabels !== false,
      showRadialGrouping: options.showRadialGrouping !== false,
      showSimpleGrouping: options.showSimpleGrouping === true,
      includeScorecard: options.includeScorecard === true,
      targetFaceVisibility: normalizeTargetVisibility(options.targetFaceVisibility)
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
      showSimpleGrouping: options.showSimpleGrouping === true,
      includeScorecard: options.includeScorecard === true,
      targetFaceVisibility: normalizeTargetVisibility(options.targetFaceVisibility)
    });
    downloadCanvas(canvas, `${safeFileName(scorecard.name || "archery-scorecard")}-full-target.png`);
  }

  function exportEndColourTarget(scorecard, targetFace, options = {}) {
    const canvas = renderEndColourTargetImage(scorecard, targetFace, {
      title: "End-coloured target",
      subtitle: makeSubtitle(scorecard, targetFace),
      showArrowLabels: options.showArrowLabels !== false,
      showRadialGrouping: options.showRadialGrouping !== false,
      showSimpleGrouping: options.showSimpleGrouping === true,
      includeScorecard: options.includeScorecard === true,
      targetFaceVisibility: normalizeTargetVisibility(options.targetFaceVisibility)
    });
    downloadCanvas(canvas, `${safeFileName(scorecard.name || "archery-scorecard")}-end-coloured-target.png`);
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
    const scorecardLayout = makeScorecardExportLayout(scorecard, targetFace, options.visibleEndIndex ?? null, options.includeScorecard === true);
    const exportLayout = makeTargetExportLayout(scorecardLayout);
    canvas.width = exportLayout.width;
    canvas.height = exportLayout.height;
    canvas.__archeryExportRect = { width: canvas.width, height: canvas.height, left: 0, top: 0 };
    const ctx = canvas.getContext("2d");
    drawExportBackground(ctx, canvas.width, canvas.height);
    drawTargetHeader(ctx, canvas, scorecard, targetFace, options);

    const targetPadding = getTargetViewportPadding(canvas, {
      top: EXPORT.headerHeight + 76,
      right: EXPORT.margin,
      bottom: EXPORT.margin,
      left: exportLayout.targetLeft
    }, options);
    const transform = makeFitTransform(canvas, targetFace, targetPadding, getExportFocusBounds(scorecard, targetFace, options.visibleEndIndex ?? null, options));
    const targetRect = getPaddedRect(canvas, targetPadding);

    drawInsideRect(ctx, targetRect, () => {
      App.TargetRenderer.drawTarget(ctx, canvas, transform, targetFace, {
        visibility: normalizeTargetVisibility(options.targetFaceVisibility)
      });
      if (hasVisibleGrouping(scorecard, options.visibleEndIndex ?? null, options)) {
        drawExportGroupFocusScrim(ctx, targetRect, EXPORT.groupFocusAmount);
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
      if (options.showRadialGrouping || options.showSimpleGrouping) {
        App.GroupingRenderer.drawGroupingOverlay(ctx, canvas, transform, scorecard, {
          visibleEndIndex: options.visibleEndIndex ?? null,
          showRadial: options.showRadialGrouping,
          showSimple: options.showSimpleGrouping,
          showLabel: false,
          focusAmount: EXPORT.groupFocusAmount
        });
      }
    });

    if (scorecardLayout) {
      drawExportScorecardPanel(ctx, scorecardLayout, EXPORT.margin, getSideScorecardY(scorecardLayout));
    }

    delete canvas.__archeryExportRect;
    return canvas;
  }

  function renderEndColourTargetImage(scorecard, targetFace, options = {}) {
    const canvas = document.createElement("canvas");
    const scorecardLayout = makeScorecardExportLayout(scorecard, targetFace, null, options.includeScorecard === true);
    const exportLayout = makeTargetExportLayout(scorecardLayout);
    canvas.width = exportLayout.width;
    canvas.height = exportLayout.height;
    canvas.__archeryExportRect = { width: canvas.width, height: canvas.height, left: 0, top: 0 };
    const ctx = canvas.getContext("2d");
    const endGroups = getPlottedEndGroups(scorecard);

    drawExportBackground(ctx, canvas.width, canvas.height);
    drawTargetHeader(ctx, canvas, scorecard, targetFace, options);

    const targetPadding = getTargetViewportPadding(canvas, {
      top: EXPORT.headerHeight + 76,
      right: EXPORT.margin,
      bottom: EXPORT.margin + 185,
      left: exportLayout.targetLeft
    }, options);
    const transform = makeFitTransform(canvas, targetFace, targetPadding, getExportFocusBounds(scorecard, targetFace, null, { ...options, perEndGrouping: true }));
    const targetRect = getPaddedRect(canvas, targetPadding);

    drawInsideRect(ctx, targetRect, () => {
      App.TargetRenderer.drawTarget(ctx, canvas, transform, targetFace, {
        visibility: normalizeTargetVisibility(options.targetFaceVisibility)
      });
      if (hasVisibleEndColourGrouping(endGroups, options)) {
        drawExportGroupFocusScrim(ctx, targetRect, EXPORT.groupFocusAmount);
      }
      drawEndColourArrows(ctx, canvas, transform, endGroups, options.showArrowLabels !== false);
      drawEndColourGrouping(ctx, canvas, transform, endGroups, options);
    });
    drawEndColourLegend(ctx, endGroups, canvas.height - EXPORT.margin - 112, exportLayout.targetLeft, EXPORT.targetWidth - EXPORT.margin * 2);
    if (scorecardLayout) {
      drawExportScorecardPanel(ctx, scorecardLayout, EXPORT.margin, getSideScorecardY(scorecardLayout));
    }

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
    const transform = makeFitTransform(tempCanvas, targetFace, { top: 16, right: 16, bottom: 16, left: 16 }, getExportFocusBounds(scorecard, targetFace, endIndex, options));
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.clearRect(0, 0, targetBox.width, targetBox.height);
    App.TargetRenderer.drawTarget(tempCtx, tempCanvas, transform, targetFace, {
      visibility: normalizeTargetVisibility(options.targetFaceVisibility)
    });
    if (hasVisibleGrouping(scorecard, endIndex, options)) {
      drawExportGroupFocusScrim(tempCtx, getPaddedRect(tempCanvas, { top: 16, right: 16, bottom: 16, left: 16 }), EXPORT.groupFocusAmount);
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
    if (options.showRadialGrouping !== false || options.showSimpleGrouping === true) {
      App.GroupingRenderer.drawGroupingOverlay(tempCtx, tempCanvas, transform, scorecard, {
        visibleEndIndex: endIndex,
        showRadial: options.showRadialGrouping !== false,
        showSimple: options.showSimpleGrouping === true,
        showLabel: false,
        focusAmount: EXPORT.groupFocusAmount
      });
    }
    delete tempCanvas.__archeryExportRect;
    ctx.drawImage(tempCanvas, targetBox.x, targetBox.y);
  }

  function getPlottedEndGroups(scorecard) {
    if (!scorecard || !Array.isArray(scorecard.ends)) return [];
    return scorecard.ends
      .map((_end, endIndex) => {
        const entries = App.GroupingRenderer.getVisiblePlottedEntries(scorecard, endIndex);
        return {
          endIndex,
          label: `End ${endIndex + 1}`,
          colour: getEndColour(endIndex),
          entries
        };
      })
      .filter(group => group.entries.length > 0);
  }

  function getEndColour(endIndex) {
    return END_COLOURS[endIndex % END_COLOURS.length];
  }

  function drawEndColourGrouping(ctx, canvas, transform, endGroups, options = {}) {
    if (!endGroups.length || (!options.showRadialGrouping && !options.showSimpleGrouping)) return;

    ctx.save();
    endGroups.forEach(group => {
      if (group.entries.length < 2) return;
      let centrePoint = null;

      if (options.showSimpleGrouping) {
        const simple = App.GroupingRenderer.calculateSimpleGroupStats(group.entries);
        if (simple) {
          centrePoint = simple.centroid;
          drawEndGroupCircle(ctx, canvas, transform, simple.circle, group.colour, {
            alpha: 0.66,
            fillAlpha: 0.052,
            lineWidth: 4.1,
            dash: []
          });
        }
      }

      if (options.showRadialGrouping) {
        const radial = App.GroupingRenderer.calculateRadialGroupStats(group.entries);
        if (radial) {
          centrePoint = radial.centroid;
          drawEndGroupCircle(ctx, canvas, transform, radial.circle, group.colour, {
            alpha: 0.68,
            fillAlpha: 0.045,
            lineWidth: 3.4,
            dash: [22, 12]
          });
        }
      }

      if (centrePoint) drawEndGroupCentreMarker(ctx, canvas, transform, centrePoint);
    });
    ctx.restore();
  }

  function drawEndGroupCircle(ctx, canvas, transform, circle, colour, style) {
    const centre = App.ViewportMath.worldToScreen(circle.center, canvas, transform);
    const radiusPx = Math.max(3, circle.radiusMm * transform.currentPxPerMm);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radiusPx, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(colour, style.fillAlpha);
    ctx.fill();
    ctx.lineWidth = style.lineWidth + 1.8;
    ctx.setLineDash(style.dash);
    ctx.strokeStyle = "rgba(1, 8, 13, 0.46)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 9;
    ctx.stroke();
    ctx.lineWidth = style.lineWidth;
    ctx.setLineDash(style.dash);
    ctx.strokeStyle = hexToRgba(colour, style.alpha);
    ctx.shadowColor = hexToRgba(colour, 0.24);
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 0.85;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.30)";
    ctx.stroke();
    ctx.restore();
  }

  function drawEndGroupCentreMarker(ctx, canvas, transform, point) {
    const screen = App.ViewportMath.worldToScreen(point, canvas, transform);
    const radius = 4.8;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.44)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(1, 8, 13, 0.72)";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 209, 102, 0.96)";
    ctx.fill();
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.70)";
    ctx.stroke();
    ctx.restore();
  }

  function drawEndColourArrows(ctx, canvas, transform, endGroups, showLabels) {
    const markerRadius = Math.max(9.5, App.Constants.VIEWPORT.ARROW_REAL_RADIUS_MM * transform.currentPxPerMm);

    ctx.save();
    endGroups.forEach(group => {
      group.entries.forEach(entry => {
        const screen = App.ViewportMath.worldToScreen(entry.point, canvas, transform);
        drawEndColourArrowMarker(ctx, screen, markerRadius, group.colour, {
          label: `${group.endIndex + 1}.${entry.arrowIndex + 1}`,
          showLabel: showLabels
        });
      });
    });
    ctx.restore();
  }

  function drawEndColourArrowMarker(ctx, screen, radius, colour, options = {}) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(colour, 0.22);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "rgba(5, 14, 22, 0.92)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, Math.max(2.4, radius * 0.25), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(5, 14, 22, 0.92)";
    ctx.fill();

    if (options.showLabel) {
      drawEndColourArrowLabel(ctx, screen, radius, colour, options.label);
    }
    ctx.restore();
  }

  function drawEndColourArrowLabel(ctx, screen, radius, colour, label) {
    const text = String(label || "");
    if (!text) return;

    const x = screen.x + radius + 9;
    const y = screen.y - radius - 4;
    ctx.save();
    ctx.font = "850 17px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const width = Math.max(34, ctx.measureText(text).width + 18);
    const height = 28;
    ctx.beginPath();
    roundRect(ctx, x - 9, y - height / 2, width, height, 12);
    ctx.fillStyle = hexToRgba(colour, 0.94);
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(5, 14, 22, 0.56)";
    ctx.stroke();
    ctx.fillStyle = readableTextColor(colour);
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  function drawEndColourLegend(ctx, endGroups, startY, startX = EXPORT.margin, maxWidth = EXPORT.targetWidth - EXPORT.margin * 2) {
    if (!endGroups.length) return;

    const itemWidth = 128;
    const rowHeight = 38;
    const perRow = Math.max(1, Math.floor(maxWidth / itemWidth));

    ctx.save();
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(180, 201, 219, 0.86)";
    ctx.font = "760 21px Inter, system-ui, sans-serif";
    ctx.fillText("End colours", startX, startY - 36);

    endGroups.forEach((group, index) => {
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      const x = startX + col * itemWidth;
      const y = startY + row * rowHeight;

      ctx.beginPath();
      ctx.arc(x + 12, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = group.colour;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(5, 14, 22, 0.75)";
      ctx.stroke();

      ctx.fillStyle = "rgba(238, 247, 255, 0.92)";
      ctx.font = "820 20px Inter, system-ui, sans-serif";
      ctx.fillText(group.label, x + 31, y + 0.5);
    });
    ctx.restore();
  }

  function makeScorecardExportLayout(scorecard, targetFace, visibleEndIndex, includeScorecard) {
    if (!includeScorecard || !scorecard || !Array.isArray(scorecard.ends) || !scorecard.ends.length) return null;

    const arrowsPerEnd = Math.max(...scorecard.ends.map(end => end.arrows.length));
    const rows = [];
    let runningTotal = 0;

    scorecard.ends.forEach((end, endIndex) => {
      const endStats = App.ScoringEngine.calculateEndStats(end, targetFace);
      runningTotal += endStats.total;
      if (visibleEndIndex !== null && endIndex !== visibleEndIndex) return;

      rows.push({
        endIndex,
        end,
        stats: endStats,
        runningTotal,
        scores: Array.from({ length: arrowsPerEnd }, (_unused, arrowIndex) => {
          const arrow = end.arrows[arrowIndex];
          return arrow ? App.ScoringEngine.scoreArrow(arrow, targetFace) : null;
        })
      });
    });

    if (!rows.length) return null;

    const width = getScorecardExportPanelWidth(arrowsPerEnd);
    const height = SCORECARD_PANEL.padding * 2
      + SCORECARD_PANEL.titleHeight
      + SCORECARD_PANEL.headerHeight
      + rows.length * SCORECARD_PANEL.rowHeight;

    return {
      width,
      height,
      rows,
      arrowsPerEnd,
      targetFace,
      title: visibleEndIndex !== null ? `End ${visibleEndIndex + 1} scorecard` : "Scorecard",
      isSingleEnd: visibleEndIndex !== null
    };
  }

  function drawExportScorecardPanel(ctx, layout, x, y) {
    const width = layout.width;
    const height = layout.height;
    const pad = SCORECARD_PANEL.padding;
    const tableX = x + pad;
    const tableTop = y + pad + SCORECARD_PANEL.titleHeight;
    const columns = getScorecardExportColumns(layout.arrowsPerEnd);

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, SCORECARD_PANEL.radius);
    ctx.fillStyle = "rgba(8, 20, 32, 0.92)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(151, 184, 212, 0.24)";
    ctx.stroke();

    ctx.fillStyle = "rgba(238, 247, 255, 0.98)";
    ctx.font = "900 31px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(layout.title, tableX, y + pad - 2);

    ctx.fillStyle = "rgba(180, 201, 219, 0.86)";
    ctx.font = "760 18px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${layout.rows.length} ${layout.rows.length === 1 ? "end" : "ends"}`, x + width - pad, y + pad + 7);

    drawExportScorecardHeader(ctx, tableX, tableTop, columns);

    layout.rows.forEach((row, rowIndex) => {
      drawExportScorecardRow(
        ctx,
        row,
        tableX,
        tableTop + SCORECARD_PANEL.headerHeight + rowIndex * SCORECARD_PANEL.rowHeight,
        columns,
        layout.targetFace,
        rowIndex
      );
    });

    ctx.restore();
  }

  function getScorecardExportPanelWidth(arrowsPerEnd) {
    const columns = getScorecardExportColumns(arrowsPerEnd);
    const lastColumn = columns[columns.length - 1];
    return SCORECARD_PANEL.padding * 2 + lastColumn.x + lastColumn.width;
  }

  function getScorecardExportColumns(arrowsPerEnd) {
    const gap = SCORECARD_PANEL.columnGap;
    const fixed = {
      end: 76,
      total: 88,
      run: 88,
      averageArrow: 126,
      averageCentre: 144
    };
    const arrowWidth = SCORECARD_PANEL.scoreCellSize;
    const columns = [];
    let cursor = 0;

    columns.push({ key: "end", label: "End", x: cursor, width: fixed.end });
    cursor += fixed.end + gap;
    for (let i = 0; i < arrowsPerEnd; i += 1) {
      columns.push({ key: `arrow-${i}`, label: `A${i + 1}`, x: cursor, width: arrowWidth, arrowIndex: i });
      cursor += arrowWidth + gap;
    }
    columns.push({ key: "total", label: "Total", x: cursor, width: fixed.total });
    cursor += fixed.total + gap;
    columns.push({ key: "run", label: "Run", x: cursor, width: fixed.run });
    cursor += fixed.run + gap;
    columns.push({ key: "avgArrow", label: "Avg Arrow", x: cursor, width: fixed.averageArrow });
    cursor += fixed.averageArrow + gap;
    columns.push({ key: "avgCentre", label: "Avg Centre", x: cursor, width: fixed.averageCentre });

    return columns;
  }

  function drawExportScorecardHeader(ctx, x, y, columns) {
    ctx.save();
    ctx.font = "850 15px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(180, 201, 219, 0.78)";

    columns.forEach(column => {
      ctx.fillText(column.label, x + column.x + column.width / 2, y + SCORECARD_PANEL.headerHeight / 2);
    });
    ctx.restore();
  }

  function drawExportScorecardRow(ctx, row, x, y, columns, targetFace, rowIndex) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x - 8, y + 3, columns[columns.length - 1].x + columns[columns.length - 1].width + 16, SCORECARD_PANEL.rowHeight - 6, 16);
    ctx.fillStyle = rowIndex % 2 === 0 ? "rgba(255, 255, 255, 0.045)" : "rgba(255, 255, 255, 0.025)";
    ctx.fill();

    columns.forEach(column => {
      const cellX = x + column.x;
      const cellY = y + 6;
      const cellHeight = SCORECARD_PANEL.rowHeight - 12;
      if (column.key === "end") {
        drawExportTextCell(ctx, String(row.endIndex + 1), cellX, cellY, column.width, cellHeight, {
          fill: "rgba(255, 209, 102, 0.16)",
          stroke: "rgba(255, 209, 102, 0.24)",
          text: "rgba(255, 223, 141, 0.98)"
        });
      } else if (column.key.startsWith("arrow-")) {
        drawExportScoreCell(ctx, row.scores[column.arrowIndex], targetFace, cellX, cellY, column.width, cellHeight);
      } else if (column.key === "total") {
        drawExportTextCell(ctx, String(row.stats.total), cellX, cellY, column.width, cellHeight, { emphasis: true });
      } else if (column.key === "run") {
        drawExportTextCell(ctx, String(row.runningTotal), cellX, cellY, column.width, cellHeight);
      } else if (column.key === "avgArrow") {
        drawExportTextCell(ctx, formatAverageScore(row.stats.averageArrowScore), cellX, cellY, column.width, cellHeight);
      } else if (column.key === "avgCentre") {
        drawExportTextCell(ctx, formatAverageDistance(row.stats.averageDistanceFromCentreMm), cellX, cellY, column.width, cellHeight);
      }
    });

    ctx.restore();
  }

  function drawExportScoreCell(ctx, score, targetFace, x, y, width, height) {
    const colors = getScoreBadgeColors(score, targetFace);
    drawExportTextCell(ctx, App.ScoreFormatting.arrowDisplay(score), x, y, width, height, {
      fill: colors.fill,
      stroke: colors.stroke,
      text: colors.text
    });
  }

  function drawExportTextCell(ctx, text, x, y, width, height, options = {}) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, width, height, 13);
    ctx.fillStyle = options.fill || (options.emphasis ? "rgba(85, 214, 190, 0.18)" : "rgba(180, 201, 219, 0.11)");
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = options.stroke || (options.emphasis ? "rgba(85, 214, 190, 0.34)" : "rgba(180, 201, 219, 0.14)");
    ctx.stroke();

    ctx.fillStyle = options.text || "rgba(238, 247, 255, 0.92)";
    ctx.font = options.emphasis ? "900 17px Inter, system-ui, sans-serif" : "820 16px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(text), x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
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

  function hexToRgba(hexColor, alpha) {
    const rgb = parseHexColor(hexColor);
    if (!rgb) return `rgba(238, 247, 255, ${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function makeVirtualCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    canvas.__archeryExportRect = { width: canvas.width, height: canvas.height, left: 0, top: 0 };
    return canvas;
  }

  function makeTargetExportLayout(scorecardLayout) {
    if (!scorecardLayout) {
      return {
        width: EXPORT.targetWidth,
        height: EXPORT.targetHeight,
        targetLeft: EXPORT.margin
      };
    }

    return {
      width: EXPORT.targetWidth + scorecardLayout.width + SCORECARD_PANEL.gap,
      height: EXPORT.targetHeight,
      targetLeft: EXPORT.margin + scorecardLayout.width + SCORECARD_PANEL.gap
    };
  }

  function getSideScorecardY(scorecardLayout) {
    const mainTop = EXPORT.headerHeight + 76;
    const mainHeight = EXPORT.targetHeight - mainTop - EXPORT.margin;
    return mainTop + Math.max(0, (mainHeight - scorecardLayout.height) / 2);
  }

  function getPaddedRect(canvas, padding) {
    const rect = App.ViewportMath.getCanvasRect(canvas);
    return {
      x: padding.left,
      y: padding.top,
      width: Math.max(1, rect.width - padding.left - padding.right),
      height: Math.max(1, rect.height - padding.top - padding.bottom)
    };
  }

  function getTargetViewportPadding(canvas, padding, options = {}) {
    if (options.zoomToGroup !== true) return padding;

    const rect = App.ViewportMath.getCanvasRect(canvas);
    const availableWidth = Math.max(1, rect.width - padding.left - padding.right);
    const availableHeight = Math.max(1, rect.height - padding.top - padding.bottom);
    const size = Math.max(100, Math.min(availableWidth, availableHeight));
    const extraX = Math.max(0, (availableWidth - size) / 2);
    const extraY = Math.max(0, (availableHeight - size) / 2);
    return {
      top: padding.top + extraY,
      right: padding.right + extraX,
      bottom: padding.bottom + extraY,
      left: padding.left + extraX
    };
  }

  function drawInsideRect(ctx, rect, draw) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    draw();
    ctx.restore();
  }

  function drawExportGroupFocusScrim(ctx, rect, amount) {
    const alpha = App.Geometry.clamp(amount || 0, 0, 1);
    if (alpha <= 0.01) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(1, 6, 12, 0.48)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    const gradient = ctx.createRadialGradient(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      0,
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      Math.max(rect.width, rect.height) * 0.72
    );
    gradient.addColorStop(0, "rgba(5, 14, 23, 0.16)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.38)");
    ctx.fillStyle = gradient;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  function makeFitTransform(canvas, targetFace, padding, focusBounds = null) {
    const rect = App.ViewportMath.getCanvasRect(canvas);
    const availableWidth = Math.max(100, rect.width - padding.left - padding.right);
    const availableHeight = Math.max(100, rect.height - padding.top - padding.bottom);
    const focus = focusBounds || {
      center: { xMm: 0, yMm: 0 },
      widthMm: targetFace.diameterMm,
      heightMm: targetFace.diameterMm
    };
    const scale = Math.min(
      Math.min(availableWidth / focus.widthMm, availableHeight / focus.heightMm),
      focusBounds ? EXPORT.groupFitMaxPxPerMm : Number.POSITIVE_INFINITY
    );
    const centreX = padding.left + availableWidth / 2;
    const centreY = padding.top + availableHeight / 2;
    const panX = centreX - rect.width / 2 - focus.center.xMm * scale;
    const panY = centreY - rect.height / 2 - focus.center.yMm * scale;
    return {
      currentPxPerMm: scale,
      targetPxPerMm: scale,
      currentPanX: panX,
      currentPanY: panY,
      targetPanX: panX,
      targetPanY: panY
    };
  }

  function getExportFocusBounds(scorecard, targetFace, visibleEndIndex, options = {}) {
    if (options.zoomToGroup !== true || !scorecard) return null;

    const bounds = createWorldBounds();
    const addEntries = entries => {
      entries.forEach(entry => {
        if (entry.point) addCircleToBounds(bounds, entry.point, App.Constants.VIEWPORT.ARROW_REAL_RADIUS_MM);
      });
    };

    if (options.perEndGrouping === true) {
      scorecard.ends.forEach((_end, endIndex) => {
        const entries = App.GroupingRenderer.getVisiblePlottedEntries(scorecard, endIndex);
        if (!entries.length) return;
        addEntries(entries);
        addGroupingBounds(bounds, entries, options);
      });
    } else {
      const entries = App.GroupingRenderer.getVisiblePlottedEntries(scorecard, visibleEndIndex);
      if (!entries.length) return null;
      addEntries(entries);
      addGroupingBounds(bounds, entries, options);
    }

    if (!bounds.hasValue) return null;
    const targetRadius = (Number(targetFace.diameterMm) || 0) / 2;
    const rawWidth = Math.max(1, bounds.maxX - bounds.minX);
    const rawHeight = Math.max(1, bounds.maxY - bounds.minY);
    const widthMm = Math.min(targetFace.diameterMm, Math.max(EXPORT.groupFitMinSpanMm, rawWidth + EXPORT.groupFitPaddingMm * 2));
    const heightMm = Math.min(targetFace.diameterMm, Math.max(EXPORT.groupFitMinSpanMm, rawHeight + EXPORT.groupFitPaddingMm * 2));
    const center = {
      xMm: clampFocusCenter((bounds.minX + bounds.maxX) / 2, targetRadius, widthMm),
      yMm: clampFocusCenter((bounds.minY + bounds.maxY) / 2, targetRadius, heightMm)
    };

    return { center, widthMm, heightMm };
  }

  function hasVisibleGrouping(scorecard, visibleEndIndex, options = {}) {
    if (!scorecard || (!options.showRadialGrouping && !options.showSimpleGrouping)) return false;
    return App.GroupingRenderer.getVisiblePlottedEntries(scorecard, visibleEndIndex).length >= 2;
  }

  function hasVisibleEndColourGrouping(endGroups, options = {}) {
    if (!endGroups.length || (!options.showRadialGrouping && !options.showSimpleGrouping)) return false;
    return endGroups.some(group => group.entries.length >= 2);
  }

  function clampFocusCenter(value, targetRadius, spanMm) {
    const limit = Math.max(0, targetRadius - spanMm / 2);
    return App.Geometry.clamp(value, -limit, limit);
  }

  function addGroupingBounds(bounds, entries, options = {}) {
    if (entries.length < 2) return;

    if (options.showSimpleGrouping === true) {
      const simple = App.GroupingRenderer.calculateSimpleGroupStats(entries);
      if (simple) addCircleToBounds(bounds, simple.circle.center, simple.circle.radiusMm);
    }

    if (options.showRadialGrouping !== false) {
      const radial = App.GroupingRenderer.calculateRadialGroupStats(entries);
      if (radial) {
        addCircleToBounds(bounds, radial.circle.center, radial.circle.radiusMm);
        addEllipseToBounds(bounds, radial.analysis.confidenceEllipse);
      }
    }
  }

  function createWorldBounds() {
    return {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      hasValue: false
    };
  }

  function addPointToBounds(bounds, point) {
    bounds.minX = Math.min(bounds.minX, point.xMm);
    bounds.minY = Math.min(bounds.minY, point.yMm);
    bounds.maxX = Math.max(bounds.maxX, point.xMm);
    bounds.maxY = Math.max(bounds.maxY, point.yMm);
    bounds.hasValue = true;
  }

  function addCircleToBounds(bounds, center, radiusMm) {
    const radius = Math.max(0, Number(radiusMm) || 0);
    addPointToBounds(bounds, { xMm: center.xMm - radius, yMm: center.yMm - radius });
    addPointToBounds(bounds, { xMm: center.xMm + radius, yMm: center.yMm + radius });
  }

  function addEllipseToBounds(bounds, ellipse) {
    if (!ellipse || ellipse.count < 2) return;
    const steps = 24;
    const cosRotation = Math.cos(ellipse.rotationRad);
    const sinRotation = Math.sin(ellipse.rotationRad);
    for (let index = 0; index < steps; index += 1) {
      const angle = (Math.PI * 2 * index) / steps;
      const x = Math.cos(angle) * ellipse.radiusXMm;
      const y = Math.sin(angle) * ellipse.radiusYMm;
      addPointToBounds(bounds, {
        xMm: ellipse.center.xMm + x * cosRotation - y * sinRotation,
        yMm: ellipse.center.yMm + x * sinRotation + y * cosRotation
      });
    }
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

  function drawTargetHeader(ctx, canvas, scorecard, targetFace, options) {
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
    ctx.fillText(summary.scoreText, canvas.width - EXPORT.margin, 72);
    ctx.font = "760 22px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(180, 201, 219, 0.84)";
    ctx.fillText(`${summary.totals.xCount} X · ${summary.totals.missCount} miss · ${summary.arrowsText}`, canvas.width - EXPORT.margin, 138);
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

  function normalizeTargetVisibility(value) {
    return App.Geometry.clamp(Number(value) || 1, 0.35, 1);
  }

  function formatAverageScore(value) {
    return value === null ? "-" : value.toFixed(1);
  }

  function formatAverageDistance(value) {
    return value === null ? "-" : `${value.toFixed(1)}mm`;
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
    exportEndColourTarget,
    exportEndSheet,
    renderEndColourTargetImage,
    renderTargetImage
  };
})();
