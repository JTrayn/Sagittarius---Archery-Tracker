(function () {
  const App = window.ArcheryApp;

  const DEFAULT_SIMULATION_COUNT = 5000;

  function analyse(scorecard, targetFace, options = {}) {
    const simulationCount = Math.max(100, Math.floor(Number(options.simulationCount) || DEFAULT_SIMULATION_COUNT));
    const scoringOptions = App.Extrapolation.getProjectedScoreOptions(scorecard, options.viewport || {});
    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, targetFace, scoringOptions);
    const plottedEntries = App.ShotPattern.collectPlottedEntries(scorecard, targetFace, scoringOptions);
    const pattern = App.ShotPattern.analyse(plottedEntries);
    const recordedBreakdown = countRecordedTypes(scorecard);
    const arrowCount = Math.max(1, totals.totalArrows || pattern.count || 1);
    const actualPlottedScore = plottedEntries.reduce((sum, entry) => sum + (Number(entry.score?.value) || 0), 0);
    const possiblePerArrow = getHighestScore(targetFace);
    const possibleModelledScore = arrowCount * possiblePerArrow;
    const targetReferenceScore = totals.recordedArrows > 0 && totals.recordedArrows < totals.totalArrows
      ? Math.round((totals.scorecardTotal / totals.recordedArrows) * totals.totalArrows)
      : totals.scorecardTotal;
    const targets = makeDefaultTargets(targetReferenceScore, totals.possibleTotal || possibleModelledScore);
    const seedBase = makeSeedBase(scorecard, targetFace, scoringOptions, pattern.count, simulationCount);

    if (!pattern.count) {
      return {
        status: "no-plotted-arrows",
        scorecard,
        targetFace,
        totals,
        recordedBreakdown,
        scoringOptions,
        pattern,
        simulationCount,
        targets,
        scenarios: [],
        notes: ["Performance Intelligence needs plotted arrow positions. Manual-only scores do not contain geometry for the shot-pattern model."]
      };
    }

    const scenarios = buildScenarios(pattern, targetFace, {
      simulationCount,
      arrowCount,
      targets,
      seedBase,
      actualScore: totals.scorecardTotal
    });
    const actualScenario = scenarios[0]?.result || null;
    const bestScenario = chooseBestScenario(scenarios);
    const notes = buildNotes({ pattern, totals, recordedBreakdown, scoringOptions, arrowCount, simulationCount });

    return {
      status: "ok",
      scorecard,
      targetFace,
      totals,
      actualPlottedScore,
      possibleModelledScore,
      targetReferenceScore,
      recordedBreakdown,
      scoringOptions,
      pattern,
      simulationCount,
      forecastArrowCount: arrowCount,
      targets,
      scenarios,
      forecast: actualScenario,
      bestScenario,
      notes
    };
  }

  function buildScenarios(pattern, targetFace, context) {
    const base = [
      {
        id: "actual",
        label: "Actual pattern",
        description: "Core group shape plus this session's major-outlier rate.",
        transform: {}
      },
      {
        id: "recentered",
        label: "Re-centred group",
        description: "Same group shape, moved so the normal group centre is on the bullseye.",
        transform: { centreMode: "zero" }
      },
      {
        id: "core",
        label: "Core group only",
        description: "Major outliers removed from the repeat-round model.",
        transform: { includeOutliers: false }
      },
      {
        id: "vertical-10",
        label: "Vertical spread -10%",
        description: "Same group centre with high/low variation tightened by 10%.",
        transform: { scaleY: 0.9 }
      },
      {
        id: "horizontal-10",
        label: "Horizontal spread -10%",
        description: "Same group centre with left/right variation tightened by 10%.",
        transform: { scaleX: 0.9 }
      },
      {
        id: "combined-realistic",
        label: "Best realistic version",
        description: "Re-centred group, 10% tighter spread, and half the major-outlier rate.",
        transform: { centreMode: "zero", scaleX: 0.9, scaleY: 0.9, outlierRateMultiplier: 0.5 }
      }
    ];

    return base.map((scenario, index) => ({
      ...scenario,
      result: App.MonteCarlo.runScenario(pattern, targetFace, {
        simulationCount: context.simulationCount,
        arrowCount: context.arrowCount,
        targets: context.targets,
        transform: scenario.transform,
        seed: `${context.seedBase}:${scenario.id}:${index}`,
        actualScore: context.actualScore
      })
    }));
  }

  function chooseBestScenario(scenarios) {
    return scenarios.slice().sort((a, b) => b.result.expectedScore - a.result.expectedScore)[0] || null;
  }

  function makeDefaultTargets(actualScore, possibleTotal) {
    const actual = Math.max(0, Math.floor(Number(actualScore) || 0));
    const possible = Math.max(0, Math.floor(Number(possibleTotal) || 0));
    const desiredCount = 5;

    if (possible && actual >= possible) {
      return [];
    }

    if (!possible) {
      const firstMajorAbove = ceilToStep(actual + 1, 10);
      return uniqueTargets([firstMajorAbove, firstMajorAbove + 10, firstMajorAbove + 20, firstMajorAbove + 30, firstMajorAbove + 40], actual, possible, desiredCount);
    }

    const ratio = possible ? actual / possible : 0;
    const remaining = possible - actual;

    if (ratio >= 0.985 || remaining <= 10) {
      return uniqueTargets([actual + 1, actual + 2, actual + 3, actual + 5, possible], actual, possible, desiredCount);
    }

    if (ratio >= 0.96 || remaining <= 25) {
      const nextFive = ceilToStep(actual + 1, 5);
      return uniqueTargets([nextFive, nextFive + 5, nextFive + 10, possible - 2, possible], actual, possible, desiredCount);
    }

    if (ratio >= 0.9 || remaining <= 80) {
      const nextFive = ceilToStep(actual + 1, 5);
      return uniqueTargets([nextFive, nextFive + 5, nextFive + 10, nextFive + 15, nextFive + 25], actual, possible, desiredCount);
    }

    const firstMajorAbove = ceilToStep(actual + 1, 10);
    return uniqueTargets([firstMajorAbove, firstMajorAbove + 10, firstMajorAbove + 20, firstMajorAbove + 30, firstMajorAbove + 40], actual, possible, desiredCount);
  }

  function ceilToStep(value, step) {
    const safeStep = Math.max(1, Math.floor(Number(step) || 1));
    return Math.ceil(Number(value) / safeStep) * safeStep;
  }

  function uniqueTargets(candidates, actual, possible, desiredCount) {
    const result = [];
    candidates.forEach(candidate => {
      const value = Math.round(Number(candidate));
      if (!Number.isFinite(value)) return;
      if (value <= actual) return;
      if (possible && value > possible) return;
      if (!result.includes(value)) result.push(value);
    });

    if (possible && !result.includes(possible) && possible > actual && result.length < desiredCount) {
      result.push(possible);
    }

    const fallbackStep = possible && actual / possible >= 0.96 ? 1 : possible && actual / possible >= 0.9 ? 5 : 10;
    let next = result.length ? result[result.length - 1] + fallbackStep : actual + fallbackStep;
    while (result.length < desiredCount && (!possible || next <= possible)) {
      if (next > actual && !result.includes(next)) result.push(next);
      next += fallbackStep;
    }

    return result.slice(0, desiredCount).sort((a, b) => a - b);
  }

  function buildNotes({ pattern, totals, recordedBreakdown, scoringOptions, arrowCount, simulationCount }) {
    const notes = [];
    notes.push(pattern.reliability.message);
    if (recordedBreakdown.manual > 0) {
      notes.push(`${recordedBreakdown.manual} manual score${recordedBreakdown.manual === 1 ? "" : "s"} are included in the actual score but ignored by the geometry model because they have no plotted position.`);
    }
    if (totals.recordedArrows < totals.totalArrows) {
      notes.push(`The scorecard is incomplete: ${totals.recordedArrows}/${totals.totalArrows} arrows are recorded. Forecasts still simulate the full scorecard length.`);
    }
    if (scoringOptions.extrapolation) {
      notes.push(`Extrapolated Distance is active, so the model uses projected ${App.Extrapolation.formatDistance(scoringOptions.extrapolation.targetDistanceM)} positions and scores without mutating stored arrows.`);
    }
    if (pattern.outliers.majorCount > 0) {
      notes.push(`${pattern.outliers.majorCount} major outlier${pattern.outliers.majorCount === 1 ? "" : "s"} detected. The actual-pattern simulation keeps a capped repeat-outlier rate; the Core Group scenario removes them.`);
    }
    return notes;
  }

  function countRecordedTypes(scorecard) {
    const result = { plotted: 0, manual: 0, empty: 0, recorded: 0 };
    (scorecard?.ends || []).forEach(end => {
      (end.arrows || []).forEach(arrow => {
        if (arrow?.position) {
          result.plotted += 1;
          result.recorded += 1;
        } else if (arrow?.manualScore) {
          result.manual += 1;
          result.recorded += 1;
        } else {
          result.empty += 1;
        }
      });
    });
    return result;
  }

  function getHighestScore(targetFace) {
    return Math.max(0, ...((targetFace?.zones || []).map(zone => Number(zone.score) || 0)));
  }

  function makeSeedBase(scorecard, targetFace, scoringOptions, plottedCount, simulationCount) {
    const compactPositions = (scorecard?.ends || []).flatMap(end => (end.arrows || []).map(arrow => {
      if (!arrow?.position) return "m";
      return `${Math.round(Number(arrow.position.xMm) * 10)}:${Math.round(Number(arrow.position.yMm) * 10)}`;
    })).join("|");
    const extrapolationKey = scoringOptions.extrapolation
      ? `${scoringOptions.extrapolation.sourceDistanceM}>${scoringOptions.extrapolation.targetDistanceM}`
      : "native";
    return [scorecard?.id, scorecard?.updatedAt, targetFace?.id, extrapolationKey, plottedCount, simulationCount, compactPositions].join("::");
  }

  function formatDirection(point) {
    if (!point) return "—";
    const x = Number(point.xMm) || 0;
    const y = Number(point.yMm) || 0;
    const parts = [];
    if (Math.abs(x) >= 0.5) parts.push(`${Math.abs(x).toFixed(1)}mm ${x < 0 ? "left" : "right"}`);
    if (Math.abs(y) >= 0.5) parts.push(`${Math.abs(y).toFixed(1)}mm ${y < 0 ? "high" : "low"}`);
    return parts.length ? parts.join(" · ") : "centred";
  }

  App.SessionIntelligence = {
    analyse,
    makeDefaultTargets,
    formatDirection
  };
})();
