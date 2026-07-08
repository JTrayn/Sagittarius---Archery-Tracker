(function () {
  const App = window.ArcheryApp;

  function getArrowScoringRadiusMm() {
    return App.Constants?.VIEWPORT?.ARROW_SCORING_RADIUS_MM
      ?? App.Constants?.VIEWPORT?.ARROW_REAL_RADIUS_MM
      ?? 0;
  }

  function getZoneLineHalfWidthMm(zone) {
    return Math.max(0, Number(zone?.strokeWidthMm) || 0) / 2;
  }

  function scorePosition(position, targetFace) {
    if (!position || typeof position.xMm !== "number" || typeof position.yMm !== "number") {
      return null;
    }

    const distanceMm = Math.hypot(position.xMm, position.yMm);
    const arrowRadiusMm = getArrowScoringRadiusMm();
    const zones = targetFace.zones.slice().sort((a, b) => a.radiusMm - b.radiusMm);

    // Line-cutter scoring: the arrow scores the higher zone if any part of
    // the shaft intersects that zone's scoring border. The stored arrow
    // position is the shaft centre, so we compare the arrow's inner edge
    // against the visible scoring line rather than scoring from centre-point
    // distance alone.
    const zone = zones.find(item => {
      const lineHalfWidthMm = getZoneLineHalfWidthMm(item);
      return distanceMm - arrowRadiusMm <= item.radiusMm + lineHalfWidthMm + 0.000001;
    });

    if (!zone) {
      return {
        label: "M",
        value: 0,
        zoneId: "miss",
        distanceMm,
        arrowRadiusMm,
        isMiss: true
      };
    }

    const lineHalfWidthMm = getZoneLineHalfWidthMm(zone);
    const isLineCutter = distanceMm > zone.radiusMm + lineHalfWidthMm + 0.000001;

    return {
      label: zone.label,
      value: zone.score,
      zoneId: zone.id,
      distanceMm,
      arrowRadiusMm,
      isLineCutter,
      isMiss: false
    };
  }

  function scoreArrow(arrow, targetFace, options = {}) {
    if (!arrow) return null;
    if (arrow.position) {
      const position = options.extrapolation
        ? App.Extrapolation.transformPosition(arrow.position, options.extrapolation)
        : arrow.position;
      return scorePosition(position, targetFace);
    }
    if (arrow.manualScore) {
      return {
        label: arrow.manualScore.label,
        value: Number(arrow.manualScore.value) || 0,
        zoneId: arrow.manualScore.zoneId || null,
        distanceMm: null,
        isMiss: arrow.manualScore.label === "M" || arrow.manualScore.isMiss === true,
        isManual: true
      };
    }
    return null;
  }

  function calculateEndTotal(end, targetFace, options = {}) {
    return calculateEndStats(end, targetFace, options).total;
  }

  function calculateEndStats(end, targetFace, options = {}) {
    let total = 0;
    let recordedArrows = 0;
    let plottedArrows = 0;
    let recordedScoreTotal = 0;
    let plottedDistanceTotalMm = 0;

    end.arrows.forEach(arrow => {
      const score = scoreArrow(arrow, targetFace, options);
      if (!score) return;
      recordedArrows += 1;
      total += score.value;
      recordedScoreTotal += score.value;
      if (arrow.position && typeof score.distanceMm === "number") {
        plottedArrows += 1;
        plottedDistanceTotalMm += score.distanceMm;
      }
    });

    return {
      total,
      recordedArrows,
      plottedArrows,
      averageArrowScore: recordedArrows > 0 ? recordedScoreTotal / recordedArrows : null,
      averageDistanceFromCentreMm: plottedArrows > 0 ? plottedDistanceTotalMm / plottedArrows : null
    };
  }

  function calculateScorecardTotals(scorecard, targetFace, options = {}) {
    let scorecardTotal = 0;
    let possibleTotal = 0;
    let recordedArrows = 0;
    let plottedArrows = 0;
    let recordedScoreTotal = 0;
    let plottedDistanceTotalMm = 0;
    let xCount = 0;
    let missCount = 0;
    const highestScore = Math.max(...targetFace.zones.map(zone => zone.score));

    scorecard.ends.forEach(end => {
      end.arrows.forEach(arrow => {
        possibleTotal += highestScore;
        const score = scoreArrow(arrow, targetFace, options);
        if (!score) return;
        recordedArrows += 1;
        scorecardTotal += score.value;
        recordedScoreTotal += score.value;
        if (arrow.position && typeof score.distanceMm === "number") {
          plottedArrows += 1;
          plottedDistanceTotalMm += score.distanceMm;
        }
        if (score.label === "X") xCount += 1;
        if (score.isMiss) missCount += 1;
      });
    });

    return {
      scorecardTotal,
      possibleTotal,
      recordedArrows,
      plottedArrows,
      totalArrows: scorecard.ends.reduce((sum, end) => sum + end.arrows.length, 0),
      averageArrowScore: recordedArrows > 0 ? recordedScoreTotal / recordedArrows : null,
      averageDistanceFromCentreMm: plottedArrows > 0 ? plottedDistanceTotalMm / plottedArrows : null,
      xCount,
      missCount
    };
  }

  function hasManualScores(scorecard) {
    return Boolean(scorecard?.ends?.some(end =>
      end.arrows.some(arrow => Boolean(arrow.manualScore))
    ));
  }

  App.ScoringEngine = {
    getArrowScoringRadiusMm,
    scorePosition,
    scoreArrow,
    calculateEndStats,
    calculateEndTotal,
    calculateScorecardTotals,
    hasManualScores
  };
})();
