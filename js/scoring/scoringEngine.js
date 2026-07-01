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

  function scoreArrow(arrow, targetFace) {
    if (!arrow) return null;
    if (arrow.position) return scorePosition(arrow.position, targetFace);
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

  function calculateEndTotal(end, targetFace) {
    return end.arrows.reduce((total, arrow) => {
      const score = scoreArrow(arrow, targetFace);
      return total + (score ? score.value : 0);
    }, 0);
  }

  function calculateScorecardTotals(scorecard, targetFace) {
    let scorecardTotal = 0;
    let possibleTotal = 0;
    let recordedArrows = 0;
    let xCount = 0;
    let missCount = 0;
    const highestScore = Math.max(...targetFace.zones.map(zone => zone.score));

    scorecard.ends.forEach(end => {
      end.arrows.forEach(arrow => {
        possibleTotal += highestScore;
        const score = scoreArrow(arrow, targetFace);
        if (!score) return;
        recordedArrows += 1;
        scorecardTotal += score.value;
        if (score.label === "X") xCount += 1;
        if (score.isMiss) missCount += 1;
      });
    });

    return {
      scorecardTotal,
      possibleTotal,
      recordedArrows,
      totalArrows: scorecard.ends.reduce((sum, end) => sum + end.arrows.length, 0),
      xCount,
      missCount
    };
  }

  App.ScoringEngine = {
    getArrowScoringRadiusMm,
    scorePosition,
    scoreArrow,
    calculateEndTotal,
    calculateScorecardTotals
  };
})();
