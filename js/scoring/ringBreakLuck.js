(function () {
  const App = window.ArcheryApp;

  const EPSILON_MM = 0.000001;

  function getSensitivityWindowMm() {
    const configured = Number(App.Constants?.RING_BREAK_LUCK?.SENSITIVITY_WINDOW_MM);
    return Number.isFinite(configured) && configured > 0 ? configured : 3;
  }

  function getEvidenceWeightCap() {
    const configured = Number(App.Constants?.RING_BREAK_LUCK?.EVIDENCE_WEIGHT_CAP);
    return Number.isFinite(configured) && configured > 0 ? configured : 8;
  }

  function getZoneLineHalfWidthMm(zone) {
    return Math.max(0, Number(zone?.strokeWidthMm) || 0) / 2;
  }

  function getBoundaries(targetFace) {
    if (!targetFace || !Array.isArray(targetFace.zones)) return [];
    const zones = targetFace.zones
      .filter(zone => Number.isFinite(Number(zone?.radiusMm)))
      .slice()
      .sort((a, b) => Number(a.radiusMm) - Number(b.radiusMm));

    return zones.map((zone, index) => {
      const score = Number(zone.score) || 0;
      const lowerZone = zones[index + 1] || null;
      const lowerScore = lowerZone ? Number(lowerZone.score) || 0 : 0;
      return {
        zoneId: zone.id,
        label: zone.label,
        score,
        lowerScore,
        scoreDelta: Math.max(0, score - lowerScore),
        radiusMm: Number(zone.radiusMm) + getZoneLineHalfWidthMm(zone)
      };
    });
  }

  function getScoringPosition(arrow, options = {}) {
    if (!arrow?.position) return null;
    const position = options.extrapolation
      ? App.Extrapolation.transformPosition(arrow.position, options.extrapolation)
      : arrow.position;
    const xMm = Number(position?.xMm);
    const yMm = Number(position?.yMm);
    if (!Number.isFinite(xMm) || !Number.isFinite(yMm)) return null;
    return { xMm, yMm };
  }

  function findNearestBoundary(innerEdgeMm, boundaries) {
    let nearest = null;
    boundaries.forEach(boundary => {
      const marginMm = boundary.radiusMm - innerEdgeMm;
      const absMarginMm = Math.abs(marginMm);
      if (!nearest || absMarginMm < nearest.absMarginMm) {
        nearest = {
          ...boundary,
          marginMm,
          absMarginMm
        };
      }
    });
    return nearest;
  }

  function calculateArrowBreak(arrow, targetFace, options = {}) {
    const boundaries = getBoundaries(targetFace);
    if (!boundaries.length) return null;
    const position = getScoringPosition(arrow, options);
    if (!position) return null;

    const arrowRadiusMm = App.ScoringEngine.getArrowScoringRadiusMm();
    const distanceMm = Math.hypot(position.xMm, position.yMm);
    const innerEdgeMm = distanceMm - arrowRadiusMm;
    const nearest = findNearestBoundary(innerEdgeMm, boundaries);
    if (!nearest) return null;

    return {
      ...nearest,
      distanceMm,
      innerEdgeMm,
      arrowRadiusMm,
      isLuckySide: nearest.marginMm >= -EPSILON_MM
    };
  }

  function calculateScorecardLuck(scorecard, targetFace, options = {}) {
    const windowMm = getSensitivityWindowMm();
    const boundaries = getBoundaries(targetFace);
    if (!scorecard || !Array.isArray(scorecard.ends) || !boundaries.length) return null;

    let plottedCount = 0;
    let qualifyingBreakCount = 0;
    let luckyBreakCount = 0;
    let unluckyBreakCount = 0;
    let weightedBreakTotal = 0;
    let luckyWeightTotal = 0;
    let unluckyWeightTotal = 0;
    let contributionTotal = 0;
    let closestBreak = null;

    const visibleEndIndex = Number.isInteger(options.visibleEndIndex) && options.visibleEndIndex >= 0
      ? options.visibleEndIndex
      : null;

    scorecard.ends.forEach((end, endIndex) => {
      if (visibleEndIndex !== null && endIndex !== visibleEndIndex) return;
      (end?.arrows || []).forEach((arrow, arrowIndex) => {
        const position = getScoringPosition(arrow, options);
        if (!position) return;
        plottedCount += 1;

        const arrowRadiusMm = App.ScoringEngine.getArrowScoringRadiusMm();
        const distanceMm = Math.hypot(position.xMm, position.yMm);
        const innerEdgeMm = distanceMm - arrowRadiusMm;
        const nearest = findNearestBoundary(innerEdgeMm, boundaries);
        if (!nearest || nearest.absMarginMm > windowMm + EPSILON_MM) return;

        const weight = Math.max(0, 1 - (nearest.absMarginMm / windowMm));
        const direction = nearest.marginMm >= -EPSILON_MM ? 1 : -1;
        const contribution = direction * weight;
        weightedBreakTotal += weight;
        contributionTotal += contribution;
        qualifyingBreakCount += 1;
        if (direction > 0) {
          luckyBreakCount += 1;
          luckyWeightTotal += weight;
        } else {
          unluckyBreakCount += 1;
          unluckyWeightTotal += weight;
        }

        const breakEntry = {
          endIndex,
          arrowIndex,
          zoneId: nearest.zoneId,
          label: nearest.label,
          score: nearest.score,
          marginMm: nearest.marginMm,
          absMarginMm: nearest.absMarginMm,
          weight,
          contribution,
          isLuckySide: direction > 0
        };
        if (!closestBreak || breakEntry.absMarginMm < closestBreak.absMarginMm) {
          closestBreak = breakEntry;
        }
      });
    });

    if (!plottedCount) return null;

    const evidenceWeightCap = getEvidenceWeightCap();
    const averageContribution = contributionTotal / plottedCount;
    const breakBalance = weightedBreakTotal > EPSILON_MM
      ? contributionTotal / weightedBreakTotal
      : 0;
    const evidenceFactor = weightedBreakTotal > EPSILON_MM
      ? Math.min(1, weightedBreakTotal / evidenceWeightCap)
      : 0;
    const score = clamp(Math.round(50 + (breakBalance * evidenceFactor * 50)), 0, 100);

    return {
      score,
      label: describeLuck(score),
      plottedCount,
      qualifyingBreakCount,
      luckyBreakCount,
      unluckyBreakCount,
      neutralCount: Math.max(0, plottedCount - qualifyingBreakCount),
      sensitivityWindowMm: windowMm,
      evidenceWeightCap,
      weightedBreakTotal,
      luckyWeightTotal,
      unluckyWeightTotal,
      averageContribution,
      breakBalance,
      evidenceFactor,
      closestBreak
    };
  }

  function calculateLuckAdjustedScore(scorecard, targetFace, options = {}) {
    if (!scorecard || !targetFace || !App.ScoringEngine) return null;
    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, targetFace, options);
    if (!totals || totals.recordedArrows <= 0) return null;

    const windowMm = getSensitivityWindowMm();
    const boundaries = getBoundaries(targetFace);
    if (!boundaries.length) {
      return {
        score: totals.scorecardTotal,
        displayScore: totals.scorecardTotal,
        actualScore: totals.scorecardTotal,
        netLuckPoints: 0,
        qualifyingScoreBreakCount: 0,
        luckyScoreBreakCount: 0,
        unluckyScoreBreakCount: 0,
        ignoredSameScoreBreakCount: 0
      };
    }

    let netLuckPoints = 0;
    let qualifyingScoreBreakCount = 0;
    let luckyScoreBreakCount = 0;
    let unluckyScoreBreakCount = 0;
    let ignoredSameScoreBreakCount = 0;

    scorecard.ends.forEach(end => {
      (end?.arrows || []).forEach(arrow => {
        const position = getScoringPosition(arrow, options);
        if (!position) return;
        const arrowRadiusMm = App.ScoringEngine.getArrowScoringRadiusMm();
        const distanceMm = Math.hypot(position.xMm, position.yMm);
        const innerEdgeMm = distanceMm - arrowRadiusMm;
        const nearest = findNearestBoundary(innerEdgeMm, boundaries);
        if (!nearest || nearest.absMarginMm > windowMm + EPSILON_MM) return;

        const scoreDelta = Math.max(0, Number(nearest.scoreDelta) || 0);
        if (scoreDelta <= 0) {
          ignoredSameScoreBreakCount += 1;
          return;
        }

        const weight = Math.max(0, 1 - (nearest.absMarginMm / windowMm));
        const direction = nearest.marginMm >= -EPSILON_MM ? 1 : -1;
        netLuckPoints += direction * weight * scoreDelta;
        qualifyingScoreBreakCount += 1;
        if (direction > 0) luckyScoreBreakCount += 1;
        else unluckyScoreBreakCount += 1;
      });
    });

    const adjustedScore = totals.scorecardTotal - netLuckPoints;
    return {
      score: adjustedScore,
      displayScore: Math.round(adjustedScore),
      actualScore: totals.scorecardTotal,
      netLuckPoints,
      qualifyingScoreBreakCount,
      luckyScoreBreakCount,
      unluckyScoreBreakCount,
      ignoredSameScoreBreakCount,
      sensitivityWindowMm: windowMm
    };
  }

  function describeLuck(score) {
    if (!Number.isFinite(Number(score))) return "Unknown";
    if (score <= 20) return "Very unlucky";
    if (score <= 40) return "Unlucky";
    if (score < 60) return "Neutral";
    if (score < 80) return "Lucky";
    return "Very lucky";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  App.RingBreakLuck = {
    calculateArrowBreak,
    calculateScorecardLuck,
    calculateLuckAdjustedScore,
    describeLuck,
    getSensitivityWindowMm,
    getEvidenceWeightCap
  };
})();
