(function () {
  const App = window.ArcheryApp;
  let cachedFingerprint = "";
  let cachedRecords = null;

  const METRICS = {
    averageCentreMm: {
      label: "Avg centre",
      unit: "mm",
      lowerIsBetter: true,
      description: "Average plotted-arrow distance from the target centre.",
      format: value => formatMm(value)
    },
    normalizedAverageCentreMm: {
      label: "70m eq centre",
      unit: "mm",
      lowerIsBetter: true,
      description: "Average centre distance scaled to a 70m equivalent.",
      format: value => formatMm(value)
    },
    averageArrowScore: {
      label: "Avg arrow",
      unit: "",
      lowerIsBetter: false,
      description: "Average score per recorded arrow on the active scoring face.",
      format: value => formatScore(value)
    },
    enclosingDiameterMm: {
      label: "Group size",
      unit: "mm",
      lowerIsBetter: true,
      description: "Diameter of the minimum circle enclosing plotted arrows.",
      format: value => formatMm(value)
    },
    mpiOffsetMm: {
      label: "MPI offset",
      unit: "mm",
      lowerIsBetter: true,
      description: "Mean point of impact offset from the target centre.",
      format: value => formatMm(value)
    },
    normalizedEnclosingDiameterMm: {
      label: "70m eq group",
      unit: "mm",
      lowerIsBetter: true,
      description: "Enclosing group diameter scaled to a 70m equivalent.",
      format: value => formatMm(value)
    },
    normalizedMpiOffsetMm: {
      label: "70m eq MPI",
      unit: "mm",
      lowerIsBetter: true,
      description: "Mean point of impact offset scaled to a 70m equivalent.",
      format: value => formatMm(value)
    }
  };

  function getTrendRecords() {
    const summaries = App.Storage.listScorecards();
    const fingerprint = makeTrendFingerprint(summaries);
    if (cachedRecords && cachedFingerprint === fingerprint) return cachedRecords;

    cachedFingerprint = fingerprint;
    cachedRecords = summaries
      .map(summary => App.Storage.loadScorecard(summary.id))
      .filter(Boolean)
      .map(scorecard => deriveRecord(scorecard))
      .filter(Boolean)
      .sort((a, b) => a.timestamp - b.timestamp);
    return cachedRecords;
  }

  function deriveRecord(scorecard) {
    const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
    if (!targetFace || !scorecard.ends || !scorecard.ends.length) return null;

    const shotAt = scorecard.shotAt || scorecard.createdAt || scorecard.updatedAt;
    const timestamp = Date.parse(shotAt);
    if (!Number.isFinite(timestamp)) return null;

    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, targetFace);
    const entries = App.GroupingRenderer.getVisiblePlottedEntries(scorecard, null);
    const analysis = App.GroupingRenderer.calculatePlottedArrowAnalysis(entries);
    const enclosing = entries.length >= 2
      ? App.GroupingRenderer.calculateSimpleGroupStats(entries)
      : null;
    const radial = entries.length >= 2
      ? App.GroupingRenderer.calculateRadialGroupStats(entries)
      : null;
    const averageCentreMm = totals.averageDistanceFromCentreMm;
    const distanceM = Number(scorecard.distanceM) || 0;
    const enclosingDiameterMm = enclosing ? enclosing.radiusMm * 2 : null;
    const mpiOffsetMm = analysis ? analysis.offsetMm.distanceMm : null;
    const normalizedAverageCentreMm = Number.isFinite(averageCentreMm) && distanceM > 0
      ? averageCentreMm * (70 / distanceM)
      : null;
    const normalizedEnclosingDiameterMm = Number.isFinite(enclosingDiameterMm) && distanceM > 0
      ? enclosingDiameterMm * (70 / distanceM)
      : null;
    const normalizedMpiOffsetMm = Number.isFinite(mpiOffsetMm) && distanceM > 0
      ? mpiOffsetMm * (70 / distanceM)
      : null;

    return {
      id: scorecard.id,
      name: scorecard.name || "Untitled Scorecard",
      shotAt,
      timestamp,
      distanceM,
      targetFaceId: targetFace.id,
      targetFaceName: targetFace.name,
      targetFaceShortName: targetFace.shortName || targetFace.name,
      recordedArrows: totals.recordedArrows,
      plottedArrows: totals.plottedArrows,
      totalArrows: totals.totalArrows,
      totalScore: totals.scorecardTotal,
      possibleScore: totals.possibleTotal,
      averageArrowScore: totals.averageArrowScore,
      averageCentreMm,
      normalizedAverageCentreMm,
      enclosingDiameterMm,
      normalizedEnclosingDiameterMm,
      dispersionRadiusMm: radial ? radial.radiusMm : null,
      mpiOffsetMm,
      normalizedMpiOffsetMm,
      horizontalSpreadMm: analysis ? analysis.horizontalSpreadMm : null,
      verticalSpreadMm: analysis ? analysis.verticalSpreadMm : null,
      xCount: totals.xCount,
      missCount: totals.missCount
    };
  }

  function filterRecords(records, filters = {}) {
    const rangeDays = filters.rangeDays === "all" ? null : Number(filters.rangeDays);
    const newestTimestamp = records.reduce((max, record) => Math.max(max, record.timestamp), 0);
    const cutoff = rangeDays && newestTimestamp
      ? newestTimestamp - rangeDays * 24 * 60 * 60 * 1000
      : null;

    return records.filter(record => {
      if (cutoff && record.timestamp < cutoff) return false;
      if (filters.distanceM !== "all" && Number(record.distanceM) !== Number(filters.distanceM)) return false;
      if (filters.targetFaceId !== "all" && record.targetFaceId !== filters.targetFaceId) return false;
      return true;
    });
  }

  function getMetricConfig(metricKey) {
    return METRICS[metricKey] || METRICS.averageCentreMm;
  }

  function getMetricOptions() {
    return Object.entries(METRICS).map(([value, config]) => ({
      value,
      label: config.label
    }));
  }

  function summarize(records, metricKey) {
    const metric = getMetricConfig(metricKey);
    const values = records
      .map(record => record[metricKey])
      .filter(value => Number.isFinite(value));
    const latest = records.slice().reverse().find(record => Number.isFinite(record[metricKey])) || null;
    const bestValue = values.length
      ? (metric.lowerIsBetter ? Math.min(...values) : Math.max(...values))
      : null;
    const averageValue = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;

    return {
      count: records.length,
      valueCount: values.length,
      latest,
      bestValue,
      averageValue,
      metric
    };
  }

  function formatMetric(value, metricKey) {
    const metric = getMetricConfig(metricKey);
    if (!Number.isFinite(value)) return "-";
    return metric.format(value);
  }

  function formatMm(value) {
    if (!Number.isFinite(value)) return "-";
    if (Math.abs(value) >= 100) return `${Math.round(value)}mm`;
    return `${Math.round(value * 10) / 10}mm`;
  }

  function formatScore(value) {
    if (!Number.isFinite(value)) return "-";
    return String(Math.round(value * 10) / 10);
  }

  function makeTrendFingerprint(summaries) {
    const scorecardFingerprint = summaries
      .map(summary => [
        summary.id,
        summary.updatedAt,
        summary.shotAt,
        summary.targetFaceId,
        summary.originalTargetFaceId,
        summary.total,
        summary.possibleTotal,
        summary.arrows
      ].join(":"))
      .join("|");
    const targetFingerprint = App.TargetFaces.listTargetFaces()
      .map(face => [
        face.id,
        face.name,
        face.diameterMm,
        face.zones.map(zone => `${zone.id}:${zone.score}:${zone.radiusMm}:${zone.strokeWidthMm}`).join(",")
      ].join(":"))
      .join("|");
    return `${scorecardFingerprint}::${targetFingerprint}`;
  }

  App.HistoryAnalytics = {
    getTrendRecords,
    filterRecords,
    getMetricConfig,
    getMetricOptions,
    summarize,
    formatMetric,
    formatMm
  };
})();
