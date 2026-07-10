(function () {
  const App = window.ArcheryApp;

  function getScorecardPbStatus(scorecard, options = {}) {
    const currentCandidate = buildCandidate(scorecard, { source: "current" });
    if (!currentCandidate?.isEligible) {
      return {
        isEligible: false,
        isPb: false,
        reason: currentCandidate?.reason || "not-eligible"
      };
    }

    const candidates = collectCandidates(scorecard, currentCandidate);
    const matching = candidates.filter(candidate => candidate.key === currentCandidate.key && candidate.isEligible);
    if (!matching.length) {
      return {
        isEligible: true,
        isPb: false,
        reason: "no-comparable-scorecards",
        current: currentCandidate
      };
    }

    const bestScore = Math.max(...matching.map(candidate => candidate.totalScore));
    const bestCandidates = matching.filter(candidate => candidate.totalScore === bestScore);
    const currentIsBest = currentCandidate.totalScore === bestScore;
    const previousBest = matching
      .filter(candidate => candidate.id !== currentCandidate.id)
      .reduce((best, candidate) => !best || candidate.totalScore > best.totalScore ? candidate : best, null);

    const isInitial = matching.length === 1 && matching[0].id === currentCandidate.id;
    const isTied = currentIsBest && bestCandidates.some(candidate => candidate.id !== currentCandidate.id);
    const margin = previousBest ? currentCandidate.totalScore - previousBest.totalScore : currentCandidate.totalScore;

    return {
      isEligible: true,
      isPb: currentIsBest,
      isInitial,
      isTied,
      current: currentCandidate,
      bestScore,
      previousBestScore: previousBest ? previousBest.totalScore : null,
      margin,
      matchingCount: matching.length,
      categoryLabel: currentCandidate.categoryLabel,
      title: makePbTitle({
        current: currentCandidate,
        bestScore,
        previousBest,
        isInitial,
        isTied,
        matchingCount: matching.length
      })
    };
  }

  function collectCandidates(currentScorecard, currentCandidate) {
    const candidates = [currentCandidate];
    let summaries = [];
    try {
      summaries = App.Storage.listScorecards();
    } catch (error) {
      console.warn("Could not read scorecards for PB comparison", error);
      return candidates;
    }

    summaries.forEach(summary => {
      if (!summary?.id || summary.id === currentScorecard?.id) return;
      const summaryCandidate = buildCandidateFromSummary(summary);
      if (summaryCandidate?.isEligible) {
        candidates.push(summaryCandidate);
        return;
      }

      try {
        const scorecard = App.Storage.loadScorecard(summary.id);
        const candidate = buildCandidate(scorecard, { source: "saved" });
        if (candidate?.isEligible) candidates.push(candidate);
      } catch (error) {
        console.warn("Could not load scorecard for PB comparison", summary.id, error);
      }
    });

    return candidates;
  }

  function buildCandidateFromSummary(summary) {
    if (!summary || !summary.id) return { isEligible: false, reason: "missing-summary" };
    const totalArrows = Number(summary.totalArrows) || 0;
    const recordedArrows = Number(summary.arrows) || 0;
    if (!totalArrows || recordedArrows !== totalArrows) {
      return { isEligible: false, reason: "incomplete-scorecard" };
    }

    const targetFaceId = summary.originalTargetFaceId || summary.targetFaceId;
    const targetFace = App.TargetFaces.getTargetFace(targetFaceId);
    if (!targetFace?.zones?.length) {
      return { isEligible: false, reason: "missing-target-face" };
    }

    const distanceM = normalizeDistance(summary.distanceM || 0);
    const highestScore = Math.max(...targetFace.zones.map(zone => Number(zone.score) || 0));
    const possibleTotal = Number(summary.possibleTotal) || highestScore * totalArrows;
    const categoryParts = [
      `face:${targetFace.id}`,
      `distance:${distanceM}`,
      `arrows:${totalArrows}`,
      `possible:${possibleTotal}`
    ];

    return {
      isEligible: true,
      id: summary.id,
      source: "summary",
      targetFaceId: targetFace.id,
      targetFaceName: targetFace.shortName || targetFace.name || "Target face",
      distanceM,
      totalArrows,
      totalScore: Number(summary.total) || 0,
      possibleTotal,
      shotAt: summary.shotAt || summary.createdAt || "",
      key: categoryParts.join("|"),
      categoryLabel: `${formatDistance(distanceM)} · ${targetFace.shortName || targetFace.name || "Target face"} · ${totalArrows} arrows`,
      totals: {
        recordedArrows,
        totalArrows,
        scorecardTotal: Number(summary.total) || 0,
        possibleTotal
      }
    };
  }

  function buildCandidate(scorecard, options = {}) {
    if (!scorecard || !Array.isArray(scorecard.ends) || !scorecard.ends.length) {
      return { isEligible: false, reason: "missing-scorecard" };
    }

    const targetFaceId = scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId;
    const targetFace = App.TargetFaces.getTargetFace(targetFaceId);
    if (!targetFace?.zones?.length) {
      return { isEligible: false, reason: "missing-target-face" };
    }

    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, targetFace);
    if (!totals.totalArrows || totals.recordedArrows !== totals.totalArrows) {
      return { isEligible: false, reason: "incomplete-scorecard", totals };
    }

    const distanceM = normalizeDistance(scorecard.distanceM || 0);
    const highestScore = Math.max(...targetFace.zones.map(zone => Number(zone.score) || 0));
    const possibleTotal = highestScore * totals.totalArrows;
    const categoryParts = [
      `face:${targetFace.id}`,
      `distance:${distanceM}`,
      `arrows:${totals.totalArrows}`,
      `possible:${possibleTotal}`
    ];

    return {
      isEligible: true,
      id: scorecard.id,
      source: options.source || "saved",
      scorecard,
      targetFaceId: targetFace.id,
      targetFaceName: targetFace.shortName || targetFace.name || "Target face",
      distanceM,
      totalArrows: totals.totalArrows,
      totalScore: totals.scorecardTotal,
      possibleTotal,
      shotAt: scorecard.shotAt || scorecard.createdAt || "",
      key: categoryParts.join("|"),
      categoryLabel: `${formatDistance(distanceM)} · ${targetFace.shortName || targetFace.name || "Target face"} · ${totals.totalArrows} arrows`,
      totals
    };
  }

  function makePbTitle({ current, bestScore, previousBest, isInitial, isTied, matchingCount }) {
    const scoreText = `${current.totalScore}/${current.possibleTotal}`;
    const categoryText = current.categoryLabel;
    const base = `PB category: ${categoryText}. Compared only with completed real scorecards using the same distance, target face, total arrows, and maximum score. Extrapolated and comparison-view scores are ignored.`;

    if (isInitial) {
      return `Personal best: ${scoreText}. This is the first completed scorecard in this category. ${base}`;
    }
    if (isTied) {
      return `Tied personal best: ${scoreText}. Current category best is ${bestScore}/${current.possibleTotal}. ${base}`;
    }
    const previousText = previousBest ? `${previousBest.totalScore}/${current.possibleTotal}` : "none";
    const margin = previousBest ? current.totalScore - previousBest.totalScore : current.totalScore;
    const marginText = previousBest && margin > 0 ? ` Beat the previous best by ${margin}.` : "";
    return `Personal best: ${scoreText}.${marginText} Previous best: ${previousText}. ${matchingCount} completed scorecard${matchingCount === 1 ? "" : "s"} in this category. ${base}`;
  }

  function normalizeDistance(distanceM) {
    const value = Number(distanceM) || 0;
    return Math.round(value * 100) / 100;
  }

  function formatDistance(distanceM) {
    const value = Number(distanceM) || 0;
    return Number.isInteger(value) ? `${value}m` : `${value.toFixed(1)}m`;
  }

  App.PersonalBests = {
    getScorecardPbStatus,
    buildCandidate
  };
})();
