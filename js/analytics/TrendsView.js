(function () {
  const App = window.ArcheryApp;

  const CHART = {
    top: 54,
    right: 36,
    bottom: 40,
    left: 72
  };
  const STANDARD_DISTANCES_M = [10, 18, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const DEFAULT_RECORD_TARGET_FACE_ID = "wa_122cm_full";
  const DEFAULT_RECORD_DISTANCE_M = 70;
  const DEFAULT_RECORD_ARROW_COUNT = 72;
  const FACE_DISTANCE_METRICS = [
    { key: "totalScore", label: "Total", lowerIsBetter: false, format: value => String(Math.round(value)) },
    { key: "averageArrowScore", label: "Avg arrow", lowerIsBetter: false },
    { key: "averageCentreMm", label: "Avg centre", lowerIsBetter: true },
    { key: "normalizedAverageCentreMm", label: "70m eq", lowerIsBetter: true },
    { key: "enclosingDiameterMm", label: "Group", lowerIsBetter: true },
    { key: "mpiOffsetMm", label: "MPI", lowerIsBetter: true }
  ];
  const AGNOSTIC_METRICS = [
    { key: "normalizedAverageCentreMm", label: "70m eq centre", lowerIsBetter: true },
    { key: "normalizedEnclosingDiameterMm", label: "70m eq group", lowerIsBetter: true },
    { key: "normalizedMpiOffsetMm", label: "70m eq MPI", lowerIsBetter: true }
  ];

  class TrendsView {
    constructor(options) {
      this.root = options.root;
      this.canvas = options.canvas;
      this.ctx = this.canvas.getContext("2d");
      this.summaryEl = options.summary;
      this.recordsEl = options.records;
      this.tooltip = options.tooltip;
      this.metricSelect = options.metricSelect;
      this.rangeSelect = options.rangeSelect;
      this.distanceSelect = options.distanceSelect;
      this.targetSelect = options.targetSelect;
      this.spacingTimelineBtn = options.spacingTimelineBtn;
      this.spacingScorecardsBtn = options.spacingScorecardsBtn;
      this.modeHint = options.modeHint;
      this.filters = {
        metricKey: this.metricSelect.value || "averageCentreMm",
        rangeDays: this.rangeSelect.value || "all",
        distanceM: "all",
        targetFaceId: "all",
        spacingMode: "timeline",
        recordsTargetFaceId: "",
        recordsDistanceM: "",
        recordsArrowCount: ""
      };
      this.records = [];
      this.filteredRecords = [];
      this.points = [];
      this.hoveredPoint = null;

      this.bindEvents();
      this.resizeObserver = new ResizeObserver(() => this.render(App.State.getState()));
      this.resizeObserver.observe(this.root);
    }

    bindEvents() {
      this.metricSelect.addEventListener("change", () => {
        this.filters.metricKey = this.metricSelect.value;
        this.render(App.State.getState());
      });
      this.rangeSelect.addEventListener("change", () => {
        this.filters.rangeDays = this.rangeSelect.value;
        this.render(App.State.getState());
      });
      this.distanceSelect.addEventListener("change", () => {
        this.filters.distanceM = this.distanceSelect.value;
        this.render(App.State.getState());
      });
      this.targetSelect.addEventListener("change", () => {
        this.filters.targetFaceId = this.targetSelect.value;
        this.render(App.State.getState());
      });
      this.spacingTimelineBtn.addEventListener("click", () => this.setSpacingMode("timeline"));
      this.spacingScorecardsBtn.addEventListener("click", () => this.setSpacingMode("scorecards"));

      this.canvas.addEventListener("mousemove", event => this.handlePointerMove(event));
      this.canvas.addEventListener("mouseleave", () => this.clearHover());
      this.canvas.addEventListener("click", event => this.handleClick(event));
    }

    setSpacingMode(mode) {
      const nextMode = mode === "scorecards" ? "scorecards" : "timeline";
      if (this.filters.spacingMode === nextMode) return;
      this.filters.spacingMode = nextMode;
      this.render(App.State.getState());
    }

    render(state) {
      this.records = App.HistoryAnalytics.getTrendRecords();
      this.syncFilterOptions();
      this.filteredRecords = App.HistoryAnalytics.filterRecords(this.records, this.filters);
      this.renderSummary();
      this.renderSpacingButtons();
      this.renderRecords();
      this.drawChart();

      if (state.viewport.displayMode === "trends" && this.modeHint) {
        const metric = App.HistoryAnalytics.getMetricConfig(this.filters.metricKey);
        const spacing = this.filters.spacingMode === "timeline" ? "timeline" : "scorecard order";
        this.modeHint.textContent = `Trends view - ${metric.label} by ${spacing}`;
      }
    }

    syncFilterOptions() {
      const recordedDistances = uniqueSorted(this.records.map(record => record.distanceM).filter(Boolean));
      const extraDistances = recordedDistances.filter(distance => !STANDARD_DISTANCES_M.includes(Number(distance)));
      const distanceOptions = [{ value: "all", label: "All" }]
        .concat(STANDARD_DISTANCES_M.concat(extraDistances)
          .map(distance => ({ value: String(distance), label: `${distance}m` })));
      const targetOptions = [{ value: "all", label: "All" }]
        .concat(uniqueBy(this.records, record => record.targetFaceId)
          .map(record => ({ value: record.targetFaceId, label: record.targetFaceShortName })));

      if (!distanceOptions.some(option => option.value === this.filters.distanceM)) {
        this.filters.distanceM = "all";
      }
      if (!targetOptions.some(option => option.value === this.filters.targetFaceId)) {
        this.filters.targetFaceId = "all";
      }

      setSelectOptions(this.distanceSelect, distanceOptions, this.filters.distanceM);
      setSelectOptions(this.targetSelect, targetOptions, this.filters.targetFaceId);
    }

    renderSpacingButtons() {
      const timeline = this.filters.spacingMode === "timeline";
      this.spacingTimelineBtn.classList.toggle("is-active", timeline);
      this.spacingScorecardsBtn.classList.toggle("is-active", !timeline);
    }

    renderSummary() {
      const summary = App.HistoryAnalytics.summarize(this.filteredRecords, this.filters.metricKey);
      const metricKey = this.filters.metricKey;
      const currentValue = summary.latest ? summary.latest[metricKey] : null;
      const mixedDistance = new Set(this.filteredRecords.map(record => record.distanceM)).size > 1;
      const mixedTarget = new Set(this.filteredRecords.map(record => record.targetFaceId)).size > 1;

      this.summaryEl.innerHTML = [
        renderStat("Scorecards", String(summary.count), mixedDistance || mixedTarget ? "Mixed conditions" : "Filtered set"),
        renderStat("Current", App.HistoryAnalytics.formatMetric(currentValue, metricKey), summary.latest ? App.Dates.formatDateOnly(summary.latest.shotAt) : "No data"),
        renderStat("Best", App.HistoryAnalytics.formatMetric(summary.bestValue, metricKey), summary.metric.lowerIsBetter ? "Lowest" : "Highest"),
        renderStat("Average", App.HistoryAnalytics.formatMetric(summary.averageValue, metricKey), `${summary.valueCount} plotted`)
      ].join("");
    }

    renderRecords() {
      const targetOptions = uniqueBy(this.records, record => record.targetFaceId)
        .map(record => ({ value: record.targetFaceId, label: record.targetFaceName }));
      if (!targetOptions.length) {
        this.filters.recordsTargetFaceId = "";
        this.filters.recordsDistanceM = "";
        this.filters.recordsArrowCount = "";
        this.recordsEl.innerHTML = `<div class="trends-empty"><strong>No records yet</strong><span>Save plotted scorecards to build personal bests.</span></div>`;
        return;
      }

      if (!targetOptions.some(option => option.value === this.filters.recordsTargetFaceId)) {
        const requestedTarget = this.filters.targetFaceId !== "all" && targetOptions.some(option => option.value === this.filters.targetFaceId)
          ? this.filters.targetFaceId
          : null;
        this.filters.recordsTargetFaceId = requestedTarget
          || pickDefaultOption(targetOptions, DEFAULT_RECORD_TARGET_FACE_ID)
          || targetOptions[0].value;
      }

      const targetFace = App.TargetFaces.getTargetFace(this.filters.recordsTargetFaceId);
      const faceRecords = this.records.filter(record => record.targetFaceId === this.filters.recordsTargetFaceId);
      const distanceOptions = uniqueSorted(faceRecords.map(record => record.distanceM).filter(Boolean));
      if (!distanceOptions.some(distance => String(distance) === String(this.filters.recordsDistanceM))) {
        this.filters.recordsDistanceM = pickDefaultNumber(distanceOptions, DEFAULT_RECORD_DISTANCE_M)
          || (distanceOptions.length ? String(distanceOptions[0]) : "");
      }

      const distanceRecords = faceRecords.filter(record => String(record.distanceM) === String(this.filters.recordsDistanceM));
      const arrowOptions = uniqueSorted(distanceRecords.map(record => getRecordArrowCount(record)).filter(Boolean));
      if (!arrowOptions.some(count => String(count) === String(this.filters.recordsArrowCount))) {
        this.filters.recordsArrowCount = pickDefaultNumber(arrowOptions, DEFAULT_RECORD_ARROW_COUNT)
          || (arrowOptions.length ? String(arrowOptions[arrowOptions.length - 1]) : "");
      }

      const selectedRecords = distanceRecords.filter(record => String(getRecordArrowCount(record)) === String(this.filters.recordsArrowCount));
      const selectedDistanceText = this.filters.recordsDistanceM ? `${this.filters.recordsDistanceM}m` : "No distance";
      const selectedArrowText = this.filters.recordsArrowCount ? `${this.filters.recordsArrowCount} arrows` : "No arrows";

      this.recordsEl.innerHTML = `
        <div class="trends-record-dashboard">
          <section class="trends-record-section trends-record-section-selected">
            <div class="trends-selected-records-main">
              <div class="trends-record-hero">
                <div class="trends-target-preview" aria-hidden="true">${renderTargetPreviewSvg(targetFace)}</div>
                <div class="trends-record-title">
                  <span>Selected records</span>
                  <strong>${escapeHtml(targetFace.name)}</strong>
                  <small>${escapeHtml(selectedDistanceText)} - ${escapeHtml(selectedArrowText)} - ${selectedRecords.length} scorecard${selectedRecords.length === 1 ? "" : "s"}</small>
                </div>
                <div class="trends-record-controls">
                  <label class="viewport-select-label trends-record-select-label" for="trendRecordsTargetSelect">
                    <span>Face</span>
                    <select id="trendRecordsTargetSelect" class="viewport-select">
                      ${targetOptions.map(option => `<option value="${escapeHtml(option.value)}" ${option.value === this.filters.recordsTargetFaceId ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                    </select>
                  </label>
                  <label class="viewport-select-label trends-record-select-label trends-record-distance-label" for="trendRecordsDistanceSelect">
                    <span>Distance</span>
                    <select id="trendRecordsDistanceSelect" class="viewport-select">
                      ${distanceOptions.map(distance => `<option value="${escapeHtml(distance)}" ${String(distance) === String(this.filters.recordsDistanceM) ? "selected" : ""}>${escapeHtml(distance)}m</option>`).join("")}
                    </select>
                  </label>
                  <label class="viewport-select-label trends-record-select-label trends-record-arrow-label" for="trendRecordsArrowSelect">
                    <span>Arrows</span>
                    <select id="trendRecordsArrowSelect" class="viewport-select">
                      ${arrowOptions.map(count => `<option value="${escapeHtml(count)}" ${String(count) === String(this.filters.recordsArrowCount) ? "selected" : ""}>${escapeHtml(count)}</option>`).join("")}
                    </select>
                  </label>
                </div>
              </div>
              <div class="trends-record-metrics">
                ${renderRecordMetrics(FACE_DISTANCE_METRICS, selectedRecords)}
              </div>
            </div>
            ${renderTopFiveLeaderboard(selectedRecords)}
          </section>
          <div class="trends-record-side">
            <section class="trends-record-section trends-record-section-agnostic">
              <div class="trends-record-section-head">
                <strong>Global records</strong>
                <span>Best 70m-equivalent results across all saved scorecards.</span>
              </div>
              <div class="trends-record-metrics">
                ${renderRecordMetrics(AGNOSTIC_METRICS, this.records)}
              </div>
            </section>
            ${renderArrowVolumeCounter(this.records)}
          </div>
        </div>
      `;

      const targetSelect = this.recordsEl.querySelector("#trendRecordsTargetSelect");
      const distanceSelect = this.recordsEl.querySelector("#trendRecordsDistanceSelect");
      const arrowSelect = this.recordsEl.querySelector("#trendRecordsArrowSelect");
      [targetSelect, distanceSelect, arrowSelect].filter(Boolean).forEach(select => {
        if (App.CustomSelect) App.CustomSelect.enhance(select);
      });
      if (targetSelect) {
        targetSelect.addEventListener("change", event => {
          this.filters.recordsTargetFaceId = event.target.value;
          this.filters.recordsDistanceM = "";
          this.filters.recordsArrowCount = "";
          this.render(App.State.getState());
        });
      }
      if (distanceSelect) {
        distanceSelect.addEventListener("change", event => {
          this.filters.recordsDistanceM = event.target.value;
          this.filters.recordsArrowCount = "";
          this.render(App.State.getState());
        });
      }
      if (arrowSelect) {
        arrowSelect.addEventListener("change", event => {
          this.filters.recordsArrowCount = event.target.value;
          this.render(App.State.getState());
        });
      }

      this.recordsEl.querySelectorAll("[data-scorecard-id]").forEach(button => {
        button.addEventListener("click", () => this.openScorecard(button.dataset.scorecardId));
      });
    }

    drawChart() {
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.max(1, Math.floor(width * dpr));
      this.canvas.height = Math.max(1, Math.floor(height * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.clearRect(0, 0, width, height);

      const metricKey = this.filters.metricKey;
      const metric = App.HistoryAnalytics.getMetricConfig(metricKey);
      const drawable = this.filteredRecords
        .filter(record => Number.isFinite(record[metricKey]));

      drawChartBackground(this.ctx, width, height);
      drawChartFrame(this.ctx, width, height, metric);

      if (!drawable.length) {
        drawChartEmpty(this.ctx, width, height);
        this.points = [];
        return;
      }

      const domain = getChartDomain(drawable, metricKey);
      const timeDomain = getTimeDomain(drawable);
      const plot = {
        x: CHART.left,
        y: CHART.top,
        width: width - CHART.left - CHART.right,
        height: height - CHART.top - CHART.bottom
      };
      this.points = drawable.map((record, index) => {
        const x = getPointX(record, index, drawable, plot, timeDomain, this.filters.spacingMode);
        const y = plot.y + (1 - normalize(record[metricKey], domain.min, domain.max)) * plot.height;
        return { x, y, record };
      });

      drawGridLines(this.ctx, plot, domain, metricKey);
      drawTrendLine(this.ctx, this.points, plot);
      drawTrendPoints(this.ctx, this.points, this.hoveredPoint);
      drawAxisLabels(this.ctx, plot, domain, metricKey, drawable, this.filters.spacingMode, timeDomain);
    }

    handlePointerMove(event) {
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      const hit = findNearestPoint(point, this.points);
      if (!hit) {
        this.clearHover();
        return;
      }
      this.hoveredPoint = hit;
      this.drawChart();
      this.showTooltip(hit, point);
    }

    handleClick(event) {
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      const hit = findNearestPoint(point, this.points);
      if (hit) this.openScorecard(hit.record.id);
    }

    async openScorecard(scorecardId) {
      if (!scorecardId) return;
      const confirmed = await App.Actions.confirmDiscardUnsaved("Open this saved scorecard from Trends?");
      if (!confirmed) return;
      const scorecard = App.Actions.loadScorecard(scorecardId);
      if (scorecard) {
        App.Actions.setViewportDisplayMode("target");
        App.Toast.show("Scorecard loaded", "success");
      }
    }

    showTooltip(point, pointer) {
      const record = point.record;
      const metricKey = this.filters.metricKey;
      this.tooltip.innerHTML = `
        <strong>${escapeHtml(record.name)}</strong>
        <span>${escapeHtml(App.Dates.formatDateOnly(record.shotAt))}</span>
        <span>${escapeHtml(record.distanceM ? `${record.distanceM}m` : "-")} - ${escapeHtml(record.targetFaceShortName)}</span>
        <b>${escapeHtml(App.HistoryAnalytics.getMetricConfig(metricKey).label)} ${escapeHtml(App.HistoryAnalytics.formatMetric(record[metricKey], metricKey))}</b>
        <span>Score ${escapeHtml(record.totalScore)}/${escapeHtml(record.possibleScore)} - Avg centre ${escapeHtml(App.HistoryAnalytics.formatMetric(record.averageCentreMm, "averageCentreMm"))}</span>
        <span>70m eq ${escapeHtml(App.HistoryAnalytics.formatMetric(record.normalizedAverageCentreMm, "normalizedAverageCentreMm"))}</span>
      `;
      this.tooltip.classList.remove("hidden");
      const chartRect = this.canvas.parentElement.getBoundingClientRect();
      const tooltipWidth = this.tooltip.offsetWidth || 248;
      const tooltipHeight = this.tooltip.offsetHeight || 138;
      const rightX = pointer.x + 18;
      const leftX = pointer.x - tooltipWidth - 18;
      const x = rightX + tooltipWidth > chartRect.width - 12
        ? App.Geometry.clamp(leftX, 12, Math.max(12, chartRect.width - tooltipWidth - 12))
        : App.Geometry.clamp(rightX, 12, Math.max(12, chartRect.width - tooltipWidth - 12));
      const y = App.Geometry.clamp(pointer.y - 16, 12, Math.max(12, chartRect.height - tooltipHeight - 12));
      this.tooltip.style.left = `${x}px`;
      this.tooltip.style.top = `${y}px`;
    }

    clearHover() {
      if (!this.hoveredPoint && this.tooltip.classList.contains("hidden")) return;
      this.hoveredPoint = null;
      this.tooltip.classList.add("hidden");
      this.drawChart();
    }
  }

  function setSelectOptions(select, options, value) {
    const html = options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("");
    if (select.innerHTML !== html) select.innerHTML = html;
    select.value = value;
    if (App.CustomSelect) App.CustomSelect.enhance(select);
  }

  function renderStat(label, value, meta) {
    return `<div class="trends-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(meta)}</small></div>`;
  }

  function renderRecordMetrics(metrics, records) {
    return metrics.map(metric => renderRecordMetric(metric, records)).join("");
  }

  function renderRecordMetric(metric, records) {
    const record = getBestRecord(records, metric);
    if (!record) {
      return `<div class="trends-record-metric is-empty"><span>${escapeHtml(metric.label)}</span><strong>-</strong><small>No plotted data</small></div>`;
    }
    return `
      <button class="trends-record-metric" type="button" data-scorecard-id="${escapeHtml(record.id)}" title="${escapeHtml(record.name)} - ${escapeHtml(App.Dates.formatDateOnly(record.shotAt))}">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(formatRecordValue(record[metric.key], metric))}</strong>
        <small>${escapeHtml(record.distanceM)}m - ${escapeHtml(shortDate(record.shotAt))}</small>
      </button>
    `;
  }

  function renderTopFiveLeaderboard(records) {
    const leaders = records
      .filter(record => Number.isFinite(record.totalScore))
      .slice()
      .sort((a, b) => {
        const scoreDelta = b.totalScore - a.totalScore;
        if (scoreDelta !== 0) return scoreDelta;
        const aCentre = Number.isFinite(a.averageCentreMm) ? a.averageCentreMm : Number.POSITIVE_INFINITY;
        const bCentre = Number.isFinite(b.averageCentreMm) ? b.averageCentreMm : Number.POSITIVE_INFINITY;
        return aCentre - bCentre;
      })
      .slice(0, 5);

    if (!leaders.length) {
      return `
        <div class="trends-leaderboard">
          <div class="trends-leaderboard-head">
            <strong>Top 5 totals</strong>
            <span>Same face, distance, and arrows</span>
          </div>
          <div class="trends-leaderboard-empty">No matching totals yet</div>
        </div>
      `;
    }

    return `
      <div class="trends-leaderboard">
        <div class="trends-leaderboard-head">
          <strong>Top 5 totals</strong>
          <span>Same face, distance, and arrows</span>
        </div>
        <div class="trends-leaderboard-list">
          ${leaders.map((record, index) => `
            <button class="trends-leaderboard-row" type="button" data-scorecard-id="${escapeHtml(record.id)}" title="${escapeHtml(record.name)} - ${escapeHtml(App.Dates.formatDateOnly(record.shotAt))}">
              <span class="trends-leaderboard-rank rank-${index + 1}">${index + 1}</span>
              <span class="trends-leaderboard-main">
                <strong>${escapeHtml(record.totalScore)} / ${escapeHtml(record.possibleScore)}</strong>
                <small>${escapeHtml(record.name)}</small>
              </span>
              <span class="trends-leaderboard-meta">
                <strong>${escapeHtml(App.HistoryAnalytics.formatMetric(record.averageCentreMm, "averageCentreMm"))}</strong>
                <small>${escapeHtml(shortDate(record.shotAt))}</small>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderArrowVolumeCounter(records) {
    const volume = getArrowVolume(records);
    const monthly = getMonthlyArrowVolume(records);
    const axisMax = getArrowVolumeAxisMax(monthly);
    const axisTicks = getArrowVolumeAxisTicks(axisMax);
    return `
      <section class="trends-arrow-volume" aria-label="Arrows shot">
        <div class="trends-arrow-volume-head">
          <span>Arrows shot</span>
          <strong>${escapeHtml(formatInteger(volume.total))}</strong>
        </div>
        <div class="trends-arrow-volume-chart" aria-label="Monthly arrows shot">
          <div class="trends-arrow-volume-y-axis" aria-hidden="true">
            ${axisTicks.map(value => `<span>${escapeHtml(formatInteger(value))}</span>`).join("")}
          </div>
          <div class="trends-arrow-volume-plot-scroll">
            <div class="trends-arrow-volume-plot" style="--month-count: ${monthly.length}; --axis-max: ${axisMax};">
              <div class="trends-arrow-volume-gridlines" aria-hidden="true">
                ${axisTicks.map(() => `<span></span>`).join("")}
              </div>
              <div class="trends-arrow-volume-bars">
                ${monthly.map((item, index) => renderMonthlyArrowBar(item, axisMax, index, monthly.length)).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderMonthlyArrowBar(item, axisMax, index, totalMonths) {
    const level = axisMax > 0 ? Math.max(0, item.total / axisMax) : 0;
    const tickLabel = getMonthlyArrowTickLabel(item, index, totalMonths);
    const tooltip = `${item.longLabel}: ${formatInteger(item.total)} arrows`;
    const safeTooltip = escapeHtml(tooltip);
    return `
      <div class="trends-arrow-volume-bar" title="${safeTooltip}" data-tooltip="${safeTooltip}" style="--bar-level: ${roundCssNumber(level)}">
        <span class="trends-arrow-volume-bar-fill"></span>
        <small>${escapeHtml(tickLabel)}</small>
      </div>
    `;
  }

  function getArrowVolume(records) {
    return records.reduce((totals, record) => {
      const arrowCount = getRecordArrowCount(record);
      if (!arrowCount) return totals;
      totals.total += arrowCount;
      return totals;
    }, { total: 0 });
  }

  function getMonthlyArrowVolume(records) {
    const now = new Date();
    const validRecords = records
      .map(record => ({ record, shotAt: new Date(record.shotAt) }))
      .filter(item => !Number.isNaN(item.shotAt.getTime()));
    const firstDate = validRecords.length
      ? validRecords.reduce((earliest, item) => item.shotAt < earliest ? item.shotAt : earliest, validRecords[0].shotAt)
      : now;
    const start = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthKeys = [];

    for (let date = new Date(start); date <= end; date.setMonth(date.getMonth() + 1)) {
      monthKeys.push({
        key: getMonthKey(date),
        date: new Date(date),
        total: 0
      });
    }

    const lookup = new Map(monthKeys.map(item => [item.key, item]));
    validRecords.forEach(({ record, shotAt }) => {
      const arrowCount = getRecordArrowCount(record);
      if (!arrowCount) return;
      const item = lookup.get(getMonthKey(shotAt));
      if (item) item.total += arrowCount;
    });

    return monthKeys.map(item => ({
      ...item,
      label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(item.date),
      yearLabel: new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(item.date),
      longLabel: new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(item.date)
    }));
  }

  function getArrowVolumeAxisMax(monthly) {
    const maxValue = Math.max(0, ...monthly.map(item => Number(item.total) || 0));
    if (maxValue <= 0) return 100;
    const roughStep = maxValue / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;
    const stepMultiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    const step = stepMultiplier * magnitude;
    return Math.max(step * 4, Math.ceil(maxValue / step) * step);
  }

  function getArrowVolumeAxisTicks(axisMax) {
    const step = axisMax / 4;
    return [axisMax, axisMax - step, axisMax - step * 2, axisMax - step * 3, 0]
      .map(value => Math.max(0, Math.round(value)));
  }

  function getMonthlyArrowTickLabel(item, index, totalMonths) {
    if (totalMonths <= 6) return item.label;
    if (index === 0) return item.label;
    if (index === totalMonths - 1) return item.label;
    if (item.date.getMonth() === 0) return item.yearLabel;
    if (totalMonths <= 18 && index % 3 === 0) return item.label;
    if (totalMonths <= 36 && index % 6 === 0) return item.label;
    return "";
  }

  function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }


  function getBestRecord(records, metric) {
    return records
      .filter(record => Number.isFinite(record[metric.key]))
      .reduce((best, record) => {
        if (!best) return record;
        return metric.lowerIsBetter
          ? (record[metric.key] < best[metric.key] ? record : best)
          : (record[metric.key] > best[metric.key] ? record : best);
      }, null);
  }

  function formatRecordValue(value, metric) {
    if (!Number.isFinite(value)) return "-";
    if (metric.format) return metric.format(value);
    return App.HistoryAnalytics.formatMetric(value, metric.key);
  }

  function renderTargetPreviewSvg(targetFace) {
    const zones = targetFace.zones.slice().sort((a, b) => b.radiusMm - a.radiusMm);
    const outerRadius = zones.reduce((max, zone) => Math.max(max, Number(zone.radiusMm) || 0), 0) || 1;
    const circles = zones.map(zone => {
      const radius = (Number(zone.radiusMm) || 0) / outerRadius * 46;
      const strokeWidth = Math.max(0.35, ((Number(zone.strokeWidthMm) || 0.8) / outerRadius) * 46);
      return `<circle cx="50" cy="50" r="${roundSvg(radius)}" fill="${escapeHtml(zone.fill)}" stroke="${escapeHtml(zone.stroke)}" stroke-width="${roundSvg(strokeWidth)}" />`;
    }).join("");
    const centreZone = getCentreLabelZone(targetFace);
    const centre = centreZone
      ? `<text x="50" y="54" text-anchor="middle" font-size="15" font-weight="900" fill="${escapeHtml(getPreviewLabelColour(centreZone, targetFace))}">${escapeHtml(centreZone.targetLabel || centreZone.label)}</text>`
      : targetFace.centreLabel
        ? `<text x="50" y="54" text-anchor="middle" font-size="15" font-weight="900" fill="${escapeHtml(targetFace.centreLabel.fill || "#ff3347")}">${escapeHtml(targetFace.centreLabel.text || "X")}</text>`
        : `<path d="M45 50h10M50 45v10" stroke="rgba(4,12,18,0.7)" stroke-width="1.1" stroke-linecap="round" />`;
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(targetFace.shortName || targetFace.name)} preview">${circles}${centre}</svg>`;
  }

  function getCentreLabelZone(targetFace) {
    if (!Array.isArray(targetFace?.zones)) return null;
    return targetFace.zones.find(zone => zone.labelPosition === "center" && String(zone.label || "").trim()) || null;
  }

  function getPreviewLabelColour(zone, targetFace) {
    const autoContrast = targetFace?.labels?.autoContrast !== false;
    return autoContrast ? previewLabelTextColour(zone.fill) : (zone.labelFill || previewLabelTextColour(zone.fill));
  }

  function previewLabelTextColour(fill) {
    const normalized = String(fill || "").toLowerCase();
    const darkFills = ["#20252b", "#2684d9", "#e44242", "#080b0f", "#000000", "#111111"];
    return darkFills.includes(normalized) ? "#f8fbff" : "#121820";
  }

  function pickDefaultOption(options, preferredValue) {
    const match = options.find(option => String(option.value) === String(preferredValue));
    return match ? match.value : null;
  }

  function pickDefaultNumber(values, preferredValue) {
    return values.some(value => Number(value) === Number(preferredValue)) ? String(preferredValue) : null;
  }

  function roundCssNumber(value) {
    return Math.round(Number(value || 0) * 1000) / 1000;
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values)).sort((a, b) => Number(a) - Number(b));
  }

  function getRecordArrowCount(record) {
    return Number(record.recordedArrows) || Number(record.totalArrows) || 0;
  }

  function formatInteger(value) {
    return new Intl.NumberFormat().format(Math.max(0, Math.round(Number(value) || 0)));
  }

  function uniqueBy(records, getter) {
    const seen = new Set();
    const result = [];
    records.forEach(record => {
      const key = getter(record);
      if (seen.has(key)) return;
      seen.add(key);
      result.push(record);
    });
    return result.sort((a, b) => String(a.targetFaceShortName).localeCompare(String(b.targetFaceShortName)));
  }

  function getChartDomain(records, metricKey) {
    const values = records.map(record => record[metricKey]);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (Math.abs(max - min) < 0.0001) {
      const pad = Math.max(1, Math.abs(max) * 0.08);
      min -= pad;
      max += pad;
    } else {
      const pad = (max - min) * 0.12;
      min -= pad;
      max += pad;
    }
    min = Math.max(0, min);
    return { min, max };
  }

  function getTimeDomain(records) {
    const timestamps = records.map(record => record.timestamp);
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps)
    };
  }

  function getPointX(record, index, records, plot, timeDomain, spacingMode) {
    if (records.length === 1) return plot.x + plot.width / 2;
    if (spacingMode === "scorecards" || Math.abs(timeDomain.max - timeDomain.min) < 1) {
      return plot.x + (index / (records.length - 1)) * plot.width;
    }
    return plot.x + normalize(record.timestamp, timeDomain.min, timeDomain.max) * plot.width;
  }

  function normalize(value, min, max) {
    if (Math.abs(max - min) < 0.0001) return 0.5;
    return App.Geometry.clamp((value - min) / (max - min), 0, 1);
  }

  function drawChartBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "rgba(94, 167, 255, 0.075)");
    gradient.addColorStop(0.62, "rgba(122, 183, 255, 0.032)");
    gradient.addColorStop(1, "rgba(85, 214, 190, 0.014)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawChartFrame(ctx, width, height, metric) {
    ctx.save();
    ctx.fillStyle = "rgba(238, 247, 255, 0.96)";
    ctx.font = "900 20px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(metric.label, 24, 10);
    ctx.fillStyle = "rgba(180, 201, 219, 0.72)";
    ctx.font = "760 12px Inter, system-ui, sans-serif";
    ctx.fillText(metric.description || "Saved scorecard trend over time.", 24, 32);
    ctx.strokeStyle = "rgba(151, 184, 212, 0.13)";
    ctx.lineWidth = 1;
    ctx.strokeRect(CHART.left, CHART.top, width - CHART.left - CHART.right, height - CHART.top - CHART.bottom);
    ctx.restore();
  }

  function drawGridLines(ctx, plot, domain, metricKey) {
    ctx.save();
    ctx.strokeStyle = "rgba(151, 184, 212, 0.095)";
    ctx.fillStyle = "rgba(180, 201, 219, 0.72)";
    ctx.font = "760 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i += 1) {
      const y = plot.y + (plot.height / 4) * i;
      const value = domain.max - ((domain.max - domain.min) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.width, y);
      ctx.stroke();
      ctx.fillText(App.HistoryAnalytics.formatMetric(value, metricKey), plot.x - 10, y);
    }
    ctx.restore();
  }

  function drawTrendLine(ctx, points, plot) {
    if (!points.length) return;
    ctx.save();
    if (points.length > 1) {
      const areaGradient = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.height);
      areaGradient.addColorStop(0, "rgba(94, 167, 255, 0.145)");
      areaGradient.addColorStop(1, "rgba(94, 167, 255, 0)");
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.lineTo(points[points.length - 1].x, plot.y + plot.height);
      ctx.lineTo(points[0].x, plot.y + plot.height);
      ctx.closePath();
      ctx.fillStyle = areaGradient;
      ctx.fill();

      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = "rgba(105, 174, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(94, 167, 255, 0.12)";
      ctx.shadowBlur = 6;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrendPoints(ctx, points, hoveredPoint) {
    ctx.save();
    points.forEach(point => {
      const isHovered = hoveredPoint && hoveredPoint.record.id === point.record.id;
      ctx.beginPath();
      ctx.arc(point.x, point.y, isHovered ? 5.5 : 3.25, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? "#ffd166" : "rgba(105, 174, 255, 0.95)";
      ctx.fill();
      ctx.lineWidth = isHovered ? 2.25 : 1.35;
      ctx.strokeStyle = "rgba(4, 14, 22, 0.9)";
      ctx.stroke();
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 209, 102, 0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawAxisLabels(ctx, plot, domain, metricKey, records, spacingMode, timeDomain) {
    ctx.save();
    ctx.fillStyle = "rgba(180, 201, 219, 0.76)";
    ctx.font = "760 11px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    const tickCount = plot.width > 620 ? 5 : 3;
    for (let index = 0; index < tickCount; index += 1) {
      const progress = tickCount === 1 ? 0 : index / (tickCount - 1);
      const x = plot.x + progress * plot.width;
      const label = spacingMode === "scorecards"
        ? getScorecardAxisLabel(progress)
        : axisDate(timeDomain.min + (timeDomain.max - timeDomain.min) * progress);
      ctx.textAlign = index === 0 ? "left" : index === tickCount - 1 ? "right" : "center";
      ctx.fillText(label, x, plot.y + plot.height + 18);
    }
    ctx.textAlign = "right";
    ctx.fillText(App.HistoryAnalytics.formatMetric(domain.min, metricKey), plot.x + plot.width, plot.y + plot.height + 38);
    ctx.restore();
  }

  function getScorecardAxisLabel(progress) {
    if (progress <= 0) return "First";
    if (progress >= 1) return "Latest";
    return `${Math.round(progress * 100)}%`;
  }

  function drawChartEmpty(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = "rgba(238, 247, 255, 0.92)";
    ctx.font = "900 19px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No matching saved scorecards", width / 2, height / 2 - 12);
    ctx.fillStyle = "rgba(180, 201, 219, 0.78)";
    ctx.font = "760 13px Inter, system-ui, sans-serif";
    ctx.fillText("Saved plotted scorecards appear here.", width / 2, height / 2 + 18);
    ctx.restore();
  }

  function findNearestPoint(pointer, points) {
    let nearest = null;
    points.forEach(point => {
      const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
      if (distance <= 14 && (!nearest || distance < nearest.distance)) {
        nearest = { ...point, distance };
      }
    });
    return nearest;
  }

  function shortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }

  function axisDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function roundSvg(value) {
    return Math.round(value * 100) / 100;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  App.TrendsView = TrendsView;
})();
