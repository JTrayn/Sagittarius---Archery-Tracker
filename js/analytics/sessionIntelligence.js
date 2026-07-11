(function () {
  const App = window.ArcheryApp;

  const DEFAULT_SIMULATION_COUNT = 5000;
  const MIN_SESSION_TREND_ENDS = 6;
  const MIN_IN_END_ENDS = 6;
  const MIN_EFFECT_PER_ARROW = 0.25;
  const MIN_POSITION_EFFECT = 0.30;

  function getEligibility(scorecard) {
    const breakdown = countRecordedTypes(scorecard);
    const totalArrows = breakdown.total;

    if (!scorecard || totalArrows <= 0) {
      return {
        eligible: false,
        code: "no-scorecard",
        reason: "Create or load a scorecard before opening Performance Intelligence.",
        breakdown
      };
    }

    if (breakdown.manual > 0) {
      return {
        eligible: false,
        code: "manual-entries",
        reason: "Performance Intelligence is unavailable for scorecards containing manual score entries. Every arrow must be plotted on the target.",
        breakdown
      };
    }

    if (breakdown.plotted !== totalArrows) {
      return {
        eligible: false,
        code: "incomplete",
        reason: `Complete the scorecard before opening Performance Intelligence (${breakdown.plotted}/${totalArrows} arrows plotted).`,
        breakdown
      };
    }

    return {
      eligible: true,
      code: "eligible",
      reason: "Complete, fully plotted scorecard.",
      breakdown
    };
  }

  function analyse(scorecard, targetFace, options = {}) {
    const eligibility = getEligibility(scorecard);
    const simulationCount = Math.max(100, Math.floor(Number(options.simulationCount) || DEFAULT_SIMULATION_COUNT));
    const scoringOptions = App.Extrapolation.getProjectedScoreOptions(scorecard, options.viewport || {});
    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, targetFace, scoringOptions);
    const plottedEntries = App.ShotPattern.collectPlottedEntries(scorecard, targetFace, scoringOptions);
    const pattern = App.ShotPattern.analyse(plottedEntries);
    const recordedBreakdown = countRecordedTypes(scorecard);
    const arrowCount = Math.max(1, totals.totalArrows || pattern.count || 1);
    const possiblePerArrow = getHighestScore(targetFace);
    const possibleModelledScore = arrowCount * possiblePerArrow;
    const targets = makeDefaultTargets(totals.scorecardTotal, totals.possibleTotal || possibleModelledScore);

    if (!eligibility.eligible) {
      return {
        status: "ineligible",
        eligibility,
        scorecard,
        targetFace,
        totals,
        recordedBreakdown,
        scoringOptions,
        pattern,
        simulationCount,
        targets,
        scenarios: [],
        progression: null,
        notes: [eligibility.reason]
      };
    }

    if (!pattern.count) {
      return {
        status: "no-plotted-arrows",
        eligibility,
        scorecard,
        targetFace,
        totals,
        recordedBreakdown,
        scoringOptions,
        pattern,
        simulationCount,
        targets,
        scenarios: [],
        progression: null,
        notes: ["Performance Intelligence needs plotted arrow positions."]
      };
    }

    const progression = buildSessionProgression(scorecard, targetFace, scoringOptions, pattern, { arrowCount });
    const seedBase = makeSeedBase(scorecard, targetFace, scoringOptions, pattern.count, simulationCount);
    const scenarios = buildScenarios(pattern, targetFace, {
      simulationCount,
      arrowCount,
      targets,
      seedBase,
      actualScore: totals.scorecardTotal
    });
    const actualScenario = scenarios[0]?.result || null;
    const modelStability = assessPatternStability(progression);
    const notes = buildNotes({ pattern, scoringOptions, modelStability });

    return {
      status: "ok",
      eligibility,
      scorecard,
      targetFace,
      totals,
      actualPlottedScore: totals.scorecardTotal,
      possibleModelledScore,
      recordedBreakdown,
      scoringOptions,
      pattern,
      modelStability,
      simulationCount,
      forecastArrowCount: arrowCount,
      targets,
      scenarios,
      forecast: actualScenario,
      bestScenario: chooseBestScenario(scenarios),
      progression,
      notes
    };
  }

  function buildScenarios(pattern, targetFace, context) {
    const base = [
      {
        id: "actual",
        label: "Actual pattern",
        description: "The fitted core group plus this session's major-outlier rate.",
        transform: {}
      },
      {
        id: "recentered",
        label: "Re-centred group",
        description: "The same group shape moved so its core centre is on the bullseye.",
        transform: { centreMode: "zero" }
      },
      {
        id: "core",
        label: "Core group only",
        description: "Major geometric outliers removed. This can be neutral or negative when an outlier happened to score better than the core group.",
        transform: { includeOutliers: false }
      },
      {
        id: "vertical-10",
        label: "Vertical spread -10%",
        description: "The same group centre with high/low variation tightened by 10%.",
        transform: { scaleY: 0.9 }
      },
      {
        id: "horizontal-10",
        label: "Horizontal spread -10%",
        description: "The same group centre with left/right variation tightened by 10%.",
        transform: { scaleX: 0.9 }
      },
      {
        id: "combined-realistic",
        label: "Combined improvement",
        description: "A re-centred group with 10% tighter spread and half the major-outlier rate.",
        transform: { centreMode: "zero", scaleX: 0.9, scaleY: 0.9, outlierRateMultiplier: 0.5 }
      }
    ];

    const pairedSeed = `${context.seedBase}:paired-what-if`;
    return base.map(scenario => ({
      ...scenario,
      result: App.MonteCarlo.runScenario(pattern, targetFace, {
        simulationCount: context.simulationCount,
        arrowCount: context.arrowCount,
        targets: context.targets,
        transform: scenario.transform,
        seed: pairedSeed,
        actualScore: context.actualScore
      })
    }));
  }

  function buildWeakestEndScenario(endSeries, actualScore) {
    const ends = (endSeries || []).filter(end =>
      Number.isFinite(Number(end.averageArrow)) && Number(end.arrowCount) > 0
    );
    if (ends.length < 2) return null;
    const weakest = ends.slice().sort((a, b) => Number(a.averageArrow) - Number(b.averageArrow))[0];
    const peers = ends.filter(end => end !== weakest);
    const benchmarkAverage = average(peers.map(end => end.averageArrow));
    return makeConsistencyScenario({
      id: "weakest-end",
      label: "Weakest end normalised",
      subjectLabel: `End ${weakest.endNumber}`,
      currentAverage: Number(weakest.averageArrow),
      benchmarkAverage,
      affectedArrowCount: Number(weakest.arrowCount),
      actualScore: Number(actualScore) || 0,
      benchmarkLabel: "Average of the remaining ends",
      description: "Recalculates the lowest-scoring end at the average performance of the remaining ends."
    });
  }

  function buildWeakestArrowPositionScenario(positions, actualScore) {
    const usable = (positions || []).filter(position =>
      Number.isFinite(Number(position.actualAverageArrow)) && Number(position.arrowCount) > 0
    );
    if (usable.length < 2) return null;
    const weakest = usable.slice().sort((a, b) => Number(a.actualAverageArrow) - Number(b.actualAverageArrow))[0];
    const peers = usable.filter(position => position !== weakest);
    const benchmarkAverage = average(peers.map(position => position.actualAverageArrow));
    return makeConsistencyScenario({
      id: "weakest-arrow-position",
      label: "Weakest arrow position normalised",
      subjectLabel: weakest.label || "Weakest arrow position",
      currentAverage: Number(weakest.actualAverageArrow),
      benchmarkAverage,
      affectedArrowCount: Number(weakest.arrowCount),
      actualScore: Number(actualScore) || 0,
      benchmarkLabel: "Average of the remaining arrow positions",
      description: "Recalculates the lowest-scoring repeated arrow position at the average performance of the remaining positions."
    });
  }

  function makeConsistencyScenario(options) {
    const currentAverage = Number(options.currentAverage) || 0;
    const benchmarkAverage = Number(options.benchmarkAverage) || 0;
    const affectedArrowCount = Math.max(0, Number(options.affectedArrowCount) || 0);
    const change = Math.max(0, benchmarkAverage - currentAverage) * affectedArrowCount;
    return {
      id: options.id,
      label: options.label,
      subjectLabel: options.subjectLabel,
      description: options.description,
      benchmarkLabel: options.benchmarkLabel,
      currentAverage,
      benchmarkAverage,
      affectedArrowCount,
      change,
      adjustedScore: (Number(options.actualScore) || 0) + change
    };
  }

  function buildSessionProgression(scorecard, targetFace, scoringOptions, globalPattern, context) {
    const entries = collectRecordedEntries(scorecard, targetFace, scoringOptions);
    const roundArrowCount = Math.max(1, Math.floor(Number(context.arrowCount) || entries.length || 1));
    const endSeries = buildEndSeries(entries);
    const sessionPhases = buildSessionPhases(entries, targetFace, { roundArrowCount });
    const arrowSeries = buildProjectedScoreByArrowSeries(entries, { roundArrowCount });
    const sessionSummary = classifySessionTrajectory(endSeries, sessionPhases);
    const inEnd = buildInEndPerformance(scorecard, entries, targetFace);
    const actualScore = entries.reduce((sum, entry) => sum + (Number(entry.score?.value) || 0), 0);
    const endNormalisationScenario = buildWeakestEndScenario(endSeries, actualScore);
    const arrowPositionNormalisationScenario = buildWeakestArrowPositionScenario(inEnd.positions, actualScore);

    return {
      status: "ok",
      eligibleEndCount: endSeries.length,
      plottedArrowCount: entries.length,
      recordedArrowCount: entries.length,
      roundArrowCount,
      isComplete: entries.length === roundArrowCount,
      session: {
        phases: sessionPhases,
        arrowSeries,
        endSeries,
        summary: sessionSummary,
        normalisationScenario: endNormalisationScenario
      },
      inEnd: {
        ...inEnd,
        normalisationScenario: arrowPositionNormalisationScenario
      },
      caution: "Progression Intelligence reports patterns in the recorded result. It cannot identify a single cause such as fatigue, technique, concentration, equipment, or conditions."
    };
  }

  function collectRecordedEntries(scorecard, targetFace, scoringOptions) {
    const entries = [];
    (scorecard?.ends || []).forEach((end, endIndex) => {
      (end.arrows || []).forEach((arrow, arrowIndex) => {
        const score = App.ScoringEngine.scoreArrow(arrow, targetFace, scoringOptions);
        if (!score) return;
        const projected = scoringOptions?.extrapolation
          ? App.Extrapolation.transformPosition(arrow.position, scoringOptions.extrapolation)
          : arrow.position;
        if (!projected || !Number.isFinite(Number(projected.xMm)) || !Number.isFinite(Number(projected.yMm))) return;
        entries.push({
          endIndex,
          arrowIndex,
          arrow,
          score,
          position: { xMm: Number(projected.xMm), yMm: Number(projected.yMm) }
        });
      });
    });
    return orderEntries(entries);
  }

  function orderEntries(entries) {
    return entries.slice().sort((a, b) => {
      const endDelta = Number(a.endIndex) - Number(b.endIndex);
      if (endDelta) return endDelta;
      return Number(a.arrowIndex) - Number(b.arrowIndex);
    }).map((entry, index) => ({ ...entry, sequenceIndex: index }));
  }

  function buildEndSeries(entries) {
    const groups = groupEntriesByEnd(entries);
    return groups.map((group, index) => {
      const score = group.entries.reduce((sum, entry) => sum + (Number(entry.score?.value) || 0), 0);
      return {
        endIndex: group.endIndex,
        endNumber: group.endIndex + 1,
        phaseId: getSequencePhaseId(index, groups.length),
        arrowCount: group.entries.length,
        score,
        averageArrow: group.entries.length ? score / group.entries.length : null,
        entries: group.entries
      };
    });
  }

  function groupEntriesByEnd(entries) {
    const groups = new Map();
    orderEntries(entries || []).forEach(entry => {
      const key = Number(entry.endIndex) || 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });
    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([endIndex, groupEntries]) => ({ endIndex, entries: groupEntries }));
  }

  function buildSessionPhases(entries, targetFace, context) {
    const endGroups = groupEntriesByEnd(entries);
    const groupedPhases = splitEndGroupsIntoPhases(endGroups);
    const definitions = [
      { id: "early", label: "Early session", shortLabel: "Early" },
      { id: "middle", label: "Middle session", shortLabel: "Middle" },
      { id: "late", label: "Late session", shortLabel: "Late" }
    ];

    return groupedPhases.map((phaseEnds, index) => {
      const group = phaseEnds.flatMap(end => end.entries);
      return analyseEntryGroup(group, definitions[index], targetFace, {
        rangeText: makeEndRangeText(phaseEnds, group),
        roundArrowCount: context.roundArrowCount
      });
    });
  }

  function splitEndGroupsIntoPhases(endGroups) {
    const count = endGroups.length;
    if (count < 3) {
      const entries = endGroups.flatMap(end => end.entries);
      const firstCut = Math.max(1, Math.round(entries.length / 3));
      const secondCut = Math.max(firstCut, Math.round(entries.length * 2 / 3));
      return [
        [{ endIndex: endGroups[0]?.endIndex || 0, entries: entries.slice(0, firstCut) }],
        [{ endIndex: endGroups[Math.min(1, count - 1)]?.endIndex || 0, entries: entries.slice(firstCut, secondCut) }],
        [{ endIndex: endGroups[count - 1]?.endIndex || 0, entries: entries.slice(secondCut) }]
      ];
    }
    const firstCut = Math.max(1, Math.round(count / 3));
    const secondCut = Math.min(count - 1, Math.max(firstCut + 1, Math.round(count * 2 / 3)));
    return [endGroups.slice(0, firstCut), endGroups.slice(firstCut, secondCut), endGroups.slice(secondCut)];
  }

  function buildProjectedScoreByArrowSeries(entries, options) {
    let actualScoreSoFar = 0;
    return entries.map((entry, index) => {
      actualScoreSoFar += Number(entry.score?.value) || 0;
      const recordedCount = index + 1;
      const actualAverageSoFar = actualScoreSoFar / recordedCount;
      const projectedFinalScore = actualAverageSoFar * options.roundArrowCount;
      return {
        arrowNumber: recordedCount,
        endIndex: entry.endIndex,
        endNumber: Number(entry.endIndex) + 1,
        arrowIndex: entry.arrowIndex,
        arrowInEnd: Number(entry.arrowIndex) + 1,
        phaseId: getSequencePhaseId(index, entries.length),
        expectedFinalScore: projectedFinalScore,
        projectedFinalScore,
        actualScoreSoFar,
        actualAverageSoFar,
        isFinalPoint: index === entries.length - 1
      };
    });
  }

  function getSequencePhaseId(index, total) {
    const position = (Number(index) + 0.5) / Math.max(1, Number(total) || 1);
    if (position <= 1 / 3) return "early";
    if (position <= 2 / 3) return "middle";
    return "late";
  }

  function classifySessionTrajectory(endSeries, phases) {
    const usableEnds = (endSeries || []).filter(end => Number.isFinite(Number(end.averageArrow)));
    const early = (phases || []).find(phase => phase.id === "early") || phases?.[0];
    const late = (phases || []).find(phase => phase.id === "late") || phases?.[phases.length - 1];
    const earlyAverage = Number(early?.actualAverageArrow);
    const lateAverage = Number(late?.actualAverageArrow);
    const averageArrowDelta = lateAverage - earlyAverage;
    const projectedDelta = Number(late?.projectedFinalScore) - Number(early?.projectedFinalScore);
    const regression = linearRegression(usableEnds.map((end, index) => ({ x: index + 1, y: Number(end.averageArrow) })));
    const critical = criticalT95(Math.max(1, usableEnds.length - 2));
    const statisticallyReliable = usableEnds.length >= MIN_SESSION_TREND_ENDS
      && Number.isFinite(regression.tStatistic)
      && Math.abs(regression.tStatistic) >= critical;
    const practicallyMeaningful = Number.isFinite(averageArrowDelta) && Math.abs(averageArrowDelta) >= MIN_EFFECT_PER_ARROW;
    const reliable = statisticallyReliable && practicallyMeaningful;
    const strong = reliable && Math.abs(averageArrowDelta) >= 0.5 && Math.abs(regression.tStatistic) >= critical + 0.75;

    const base = {
      earlyExpected: Number(early?.projectedFinalScore),
      lateExpected: Number(late?.projectedFinalScore),
      finalExpected: usableEnds.reduce((sum, end) => sum + end.score, 0),
      delta: projectedDelta,
      averageArrowDelta,
      reliable,
      stats: {
        endCount: usableEnds.length,
        slopePerEnd: regression.slope,
        tStatistic: regression.tStatistic,
        criticalT: critical,
        rSquared: regression.rSquared,
        standardErrorSlope: regression.standardErrorSlope
      },
      evidence: []
    };

    if (usableEnds.length < MIN_SESSION_TREND_ENDS) {
      return {
        ...base,
        id: "limited-session-evidence",
        label: "Limited session trend evidence",
        tone: "insufficient",
        summary: `The phase averages are descriptive, but at least ${MIN_SESSION_TREND_ENDS} ends are needed before a repeated session trend is called reliable.`
      };
    }

    if (!reliable) {
      return {
        ...base,
        id: "no-reliable-session-trend",
        label: "No reliable session trend",
        tone: "stable",
        summary: "The early, middle, and late differences are within the normal variation seen from end to end."
      };
    }

    if (averageArrowDelta < 0) {
      return {
        ...base,
        id: strong ? "strong-reliable-decline" : "reliable-decline",
        label: strong ? "Strong late-session decline" : "Reliable late-session decline",
        tone: strong ? "strong-fade" : "possible-fade",
        summary: `Scoring declined consistently across ends, with the late phase ${Math.abs(averageArrowDelta).toFixed(2)} points per arrow below the early phase.`
      };
    }

    return {
      ...base,
      id: strong ? "strong-reliable-improvement" : "reliable-improvement",
      label: strong ? "Strong late-session improvement" : "Reliable late-session improvement",
      tone: "improvement",
      summary: `Scoring improved consistently across ends, with the late phase ${averageArrowDelta.toFixed(2)} points per arrow above the early phase.`
    };
  }

  function buildInEndPerformance(scorecard, orderedEntries, targetFace) {
    const entries = orderedEntries.filter(entry => Number.isFinite(Number(entry.arrowIndex)));
    const endRows = buildCompleteEndRows(entries);
    const maxArrowsPerEnd = endRows.length ? Math.min(...endRows.map(row => row.scores.length)) : 0;
    const phaseBuckets = [
      { id: "early", label: "Early in-end", shortLabel: "Early" },
      { id: "middle", label: "Middle in-end", shortLabel: "Middle" },
      { id: "late", label: "Late in-end", shortLabel: "Late" }
    ].map(definition => ({ definition, entries: [] }));
    const positionBuckets = new Map();

    entries.forEach(entry => {
      const end = scorecard?.ends?.[entry.endIndex];
      const endSize = Math.max(1, (end?.arrows || []).length || maxArrowsPerEnd || 1);
      const phaseId = getInEndPhaseId(entry.arrowIndex, endSize);
      const phaseBucket = phaseBuckets.find(bucket => bucket.definition.id === phaseId) || phaseBuckets[1];
      phaseBucket.entries.push(entry);
      const key = Number(entry.arrowIndex) || 0;
      if (!positionBuckets.has(key)) positionBuckets.set(key, []);
      positionBuckets.get(key).push(entry);
    });

    const phases = phaseBuckets.map(bucket => analyseEntryGroup(bucket.entries, bucket.definition, targetFace, {
      rangeText: `${bucket.entries.length} plotted arrows`
    }));
    const residualMeans = calculatePositionResidualMeans(endRows, maxArrowsPerEnd);
    const positions = Array.from(positionBuckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([arrowIndex, group]) => ({
        ...analyseEntryGroup(group, {
          id: `arrow-${arrowIndex + 1}`,
          label: `Arrow ${arrowIndex + 1}`,
          shortLabel: `A${arrowIndex + 1}`
        }, targetFace, {
          rangeText: `${group.length} plotted arrows`,
          arrowIndex
        }),
        withinEndAdjustedAverage: residualMeans[arrowIndex] ?? null
      }));

    return {
      status: endRows.length >= MIN_IN_END_ENDS && maxArrowsPerEnd >= 3 ? "ok" : "limited-data",
      maxArrowsPerEnd,
      eligibleEndCount: endRows.length,
      phases,
      positions,
      finding: classifyInEndPerformance(endRows, phases, positions, maxArrowsPerEnd)
    };
  }

  function buildCompleteEndRows(entries) {
    return groupEntriesByEnd(entries).map(group => ({
      endIndex: group.endIndex,
      entries: group.entries.slice().sort((a, b) => a.arrowIndex - b.arrowIndex),
      scores: group.entries.slice().sort((a, b) => a.arrowIndex - b.arrowIndex).map(entry => Number(entry.score?.value) || 0)
    })).filter(row => row.scores.length > 0);
  }

  function getInEndPhaseId(arrowIndex, endSize) {
    const position = (Number(arrowIndex) + 0.5) / Math.max(1, Number(endSize) || 1);
    if (position <= 1 / 3) return "early";
    if (position <= 2 / 3) return "middle";
    return "late";
  }

  function classifyInEndPerformance(endRows, phases, positions, positionCount) {
    const usableRows = (endRows || []).filter(row => row.scores.length >= positionCount && positionCount >= 3);
    const slopes = usableRows.map(row => simpleSlope(row.scores.slice(0, positionCount))).filter(Number.isFinite);
    const slopeTest = oneSampleT(slopes);
    const slopeCritical = criticalT95(Math.max(1, slopes.length - 1));
    const endToEndEffect = Number.isFinite(slopeTest.mean) ? slopeTest.mean * Math.max(0, positionCount - 1) : 0;
    const linearReliable = usableRows.length >= MIN_IN_END_ENDS
      && Math.abs(slopeTest.tStatistic) >= slopeCritical
      && Math.abs(endToEndEffect) >= MIN_EFFECT_PER_ARROW;

    const friedman = friedmanTest(usableRows.map(row => row.scores.slice(0, positionCount)));
    const residuals = (positions || []).map(position => Number(position.withinEndAdjustedAverage)).filter(Number.isFinite);
    const residualRange = residuals.length ? Math.max(...residuals) - Math.min(...residuals) : 0;
    const positionReliable = usableRows.length >= MIN_IN_END_ENDS
      && friedman.statistic >= chiSquare95(Math.max(1, positionCount - 1))
      && residualRange >= MIN_POSITION_EFFECT;

    const stats = {
      endCount: usableRows.length,
      positionCount,
      meanSlope: slopeTest.mean,
      slopeTStatistic: slopeTest.tStatistic,
      slopeCriticalT: slopeCritical,
      endToEndEffect,
      friedmanStatistic: friedman.statistic,
      friedmanCritical: chiSquare95(Math.max(1, positionCount - 1)),
      residualRange
    };

    if (usableRows.length < MIN_IN_END_ENDS || positionCount < 3) {
      return {
        id: "limited-in-end-evidence",
        label: "Limited in-end evidence",
        tone: "insufficient",
        reliable: false,
        summary: `At least ${MIN_IN_END_ENDS} complete ends with three or more arrows are needed before an arrow-order pattern is called reliable.`,
        stats,
        evidence: []
      };
    }

    if (linearReliable) {
      const declining = endToEndEffect < 0;
      return {
        id: declining ? "reliable-in-end-decline" : "reliable-in-end-improvement",
        label: declining ? "Reliable decline within ends" : "Reliable improvement within ends",
        tone: "pattern",
        reliable: true,
        summary: declining
          ? `Scores repeatedly fell as ends progressed, by about ${Math.abs(endToEndEffect).toFixed(2)} points from the first to last arrow position.`
          : `Scores repeatedly improved as ends progressed, by about ${endToEndEffect.toFixed(2)} points from the first to last arrow position.`,
        stats,
        evidence: []
      };
    }

    if (positionReliable) {
      const usablePositions = (positions || []).filter(position => Number.isFinite(Number(position.withinEndAdjustedAverage)));
      const sorted = usablePositions.slice().sort((a, b) => Number(b.withinEndAdjustedAverage) - Number(a.withinEndAdjustedAverage));
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      return {
        id: "reliable-arrow-position-pattern",
        label: "Reliable arrow-position pattern",
        tone: "pattern",
        reliable: true,
        summary: `${best?.label || "One arrow position"} repeatedly outperformed ${worst?.label || "another position"} after accounting for each end's overall strength.`,
        stats,
        bestPositionId: best?.id,
        worstPositionId: worst?.id,
        evidence: []
      };
    }

    return {
      id: "no-reliable-in-end-pattern",
      label: "No reliable in-end pattern",
      tone: "stable",
      reliable: false,
      summary: "The observed arrow-position differences are not consistent enough across ends to distinguish from normal scoring variation.",
      stats,
      evidence: []
    };
  }

  function analyseEntryGroup(entries, definition, targetFace, options = {}) {
    const groupEntries = orderEntries(entries || []);
    const plottedEntries = groupEntries.filter(entry => entry.position);
    const pattern = App.ShotPattern.analyse(plottedEntries);
    const actualScore = groupEntries.reduce((sum, entry) => sum + (Number(entry.score?.value) || 0), 0);
    const actualAverageArrow = groupEntries.length ? actualScore / groupEntries.length : null;
    const averageDistanceMm = plottedEntries.length
      ? plottedEntries.reduce((sum, entry) => sum + Math.hypot(Number(entry.position.xMm) || 0, Number(entry.position.yMm) || 0), 0) / plottedEntries.length
      : null;
    const fit = pattern.coreFit || pattern.allFit;
    const centre = fit ? { xMm: fit.meanX, yMm: fit.meanY } : pattern.groupCentre;
    const observedSpread = calculateObservedSpread(plottedEntries);

    return {
      id: definition.id,
      label: definition.label,
      shortLabel: definition.shortLabel || definition.label,
      rangeText: options.rangeText || "",
      arrowCount: groupEntries.length,
      plottedArrowCount: plottedEntries.length,
      firstArrowNumber: groupEntries.length ? groupEntries[0].sequenceIndex + 1 : null,
      lastArrowNumber: groupEntries.length ? groupEntries[groupEntries.length - 1].sequenceIndex + 1 : null,
      arrowIndex: options.arrowIndex,
      entries: groupEntries,
      pattern,
      actualScore,
      actualAverageArrow,
      projectedFinalScore: Number.isFinite(Number(options.roundArrowCount)) && actualAverageArrow !== null
        ? actualAverageArrow * Number(options.roundArrowCount)
        : null,
      averageDistanceMm,
      centre,
      centreOffsetMm: centre ? Math.hypot(Number(centre.xMm) || 0, Number(centre.yMm) || 0) : null,
      horizontalSpreadMm: observedSpread.horizontalSpreadMm,
      verticalSpreadMm: observedSpread.verticalSpreadMm,
      coreHorizontalWidthMm: pattern.horizontalSpreadMm,
      coreVerticalWidthMm: pattern.verticalSpreadMm,
      majorOutlierCount: pattern.outliers.majorCount,
      majorOutlierRate: pattern.outliers.majorRate
    };
  }

  function calculateObservedSpread(entries) {
    const points = (entries || []).filter(entry => entry?.position);
    if (!points.length) return { horizontalSpreadMm: null, verticalSpreadMm: null };
    const xs = points.map(entry => Number(entry.position.xMm)).filter(Number.isFinite);
    const ys = points.map(entry => Number(entry.position.yMm)).filter(Number.isFinite);
    return {
      horizontalSpreadMm: xs.length ? Math.max(...xs) - Math.min(...xs) : null,
      verticalSpreadMm: ys.length ? Math.max(...ys) - Math.min(...ys) : null
    };
  }

  function assessPatternStability(progression) {
    const phases = progression?.session?.phases || [];
    const candidates = [];
    for (let firstIndex = 0; firstIndex < phases.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < phases.length; secondIndex += 1) {
        const first = phases[firstIndex];
        const second = phases[secondIndex];
        const firstFit = first?.pattern?.coreFit || first?.pattern?.allFit;
        const secondFit = second?.pattern?.coreFit || second?.pattern?.allFit;
        if (!firstFit || !secondFit || first.plottedArrowCount < 8 || second.plottedArrowCount < 8) continue;
        const dx = Number(secondFit.meanX) - Number(firstFit.meanX);
        const dy = Number(secondFit.meanY) - Number(firstFit.meanY);
        const distanceMm = Math.hypot(dx, dy);
        const seX2 = Math.max(0.01, Number(firstFit.varianceX) / first.plottedArrowCount + Number(secondFit.varianceX) / second.plottedArrowCount);
        const seY2 = Math.max(0.01, Number(firstFit.varianceY) / first.plottedArrowCount + Number(secondFit.varianceY) / second.plottedArrowCount);
        const standardizedShift = Math.sqrt((dx * dx) / seX2 + (dy * dy) / seY2);
        const pooledRadialStd = Math.sqrt(Math.max(0.01, (Number(firstFit.varianceX) + Number(firstFit.varianceY) + Number(secondFit.varianceX) + Number(secondFit.varianceY)) / 2));
        const physicalThresholdMm = Math.max(8, pooledRadialStd * 0.35);
        candidates.push({ first, second, distanceMm, standardizedShift, physicalThresholdMm });
      }
    }

    const strongest = candidates.sort((a, b) => b.standardizedShift - a.standardizedShift)[0];
    const material = Boolean(strongest && strongest.standardizedShift >= 3.25 && strongest.distanceMm >= strongest.physicalThresholdMm);
    if (!material) {
      return {
        status: "stable",
        material: false,
        message: "No material phase-to-phase movement was detected in the group centre."
      };
    }

    return {
      status: "changing-pattern",
      material: true,
      shiftMm: strongest.distanceMm,
      standardizedShift: strongest.standardizedShift,
      fromLabel: strongest.first.shortLabel || strongest.first.label,
      toLabel: strongest.second.shortLabel || strongest.second.label,
      message: `The group centre moved ${strongest.distanceMm.toFixed(1)}mm between the ${String(strongest.first.shortLabel || strongest.first.label).toLowerCase()} and ${String(strongest.second.shortLabel || strongest.second.label).toLowerCase()} phases. The overall forecast combines these changing patterns and may be less representative than usual.`
    };
  }

  function makeEndRangeText(phaseEnds, entries) {
    if (!entries?.length) return "No arrows";
    const firstEnd = phaseEnds[0]?.endIndex + 1;
    const lastEnd = phaseEnds[phaseEnds.length - 1]?.endIndex + 1;
    const endText = firstEnd === lastEnd ? `End ${firstEnd}` : `Ends ${firstEnd}–${lastEnd}`;
    const firstArrow = entries[0].sequenceIndex + 1;
    const lastArrow = entries[entries.length - 1].sequenceIndex + 1;
    return `${endText} · arrows ${firstArrow}–${lastArrow}`;
  }

  function calculatePositionResidualMeans(endRows, positionCount) {
    const totals = Array.from({ length: positionCount }, () => ({ sum: 0, count: 0 }));
    (endRows || []).forEach(row => {
      const scores = row.scores.slice(0, positionCount);
      if (scores.length < positionCount) return;
      const mean = average(scores);
      scores.forEach((score, index) => {
        totals[index].sum += score - mean;
        totals[index].count += 1;
      });
    });
    return totals.map(item => item.count ? item.sum / item.count : null);
  }

  function linearRegression(points) {
    const usable = (points || []).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (usable.length < 2) return { slope: 0, intercept: 0, tStatistic: 0, standardErrorSlope: Infinity, rSquared: 0 };
    const meanX = average(usable.map(point => point.x));
    const meanY = average(usable.map(point => point.y));
    const sxx = usable.reduce((sum, point) => sum + Math.pow(point.x - meanX, 2), 0);
    const sxy = usable.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
    const slope = sxx > 0 ? sxy / sxx : 0;
    const intercept = meanY - slope * meanX;
    const residuals = usable.map(point => point.y - (intercept + slope * point.x));
    const sse = residuals.reduce((sum, value) => sum + value * value, 0);
    const sst = usable.reduce((sum, point) => sum + Math.pow(point.y - meanY, 2), 0);
    const residualVariance = usable.length > 2 ? sse / (usable.length - 2) : 0;
    const standardErrorSlope = sxx > 0 ? Math.sqrt(residualVariance / sxx) : Infinity;
    const tStatistic = standardErrorSlope === 0 ? (slope === 0 ? 0 : Math.sign(slope) * Infinity) : slope / standardErrorSlope;
    return {
      slope,
      intercept,
      tStatistic,
      standardErrorSlope,
      rSquared: sst > 0 ? Math.max(0, Math.min(1, 1 - sse / sst)) : 0
    };
  }

  function simpleSlope(values) {
    const points = (values || []).map((value, index) => ({ x: index + 1, y: Number(value) })).filter(point => Number.isFinite(point.y));
    return linearRegression(points).slope;
  }

  function oneSampleT(values) {
    const usable = (values || []).map(Number).filter(Number.isFinite);
    if (!usable.length) return { mean: 0, standardDeviation: 0, standardError: Infinity, tStatistic: 0 };
    const mean = average(usable);
    const sd = standardDeviation(usable);
    const se = usable.length > 0 ? sd / Math.sqrt(usable.length) : Infinity;
    const tStatistic = se === 0 ? (mean === 0 ? 0 : Math.sign(mean) * Infinity) : mean / se;
    return { mean, standardDeviation: sd, standardError: se, tStatistic };
  }

  function friedmanTest(rows) {
    const usable = (rows || []).filter(row => Array.isArray(row) && row.length >= 2 && row.every(Number.isFinite));
    if (!usable.length) return { statistic: 0, endCount: 0, positionCount: 0 };
    const positionCount = Math.min(...usable.map(row => row.length));
    const rankTotals = Array.from({ length: positionCount }, () => 0);
    let tieTerm = 0;
    usable.forEach(row => {
      const values = row.slice(0, positionCount);
      const ranks = rankWithTies(values);
      ranks.forEach((rank, index) => { rankTotals[index] += rank; });
      const frequencies = new Map();
      values.forEach(value => frequencies.set(value, (frequencies.get(value) || 0) + 1));
      frequencies.forEach(count => { if (count > 1) tieTerm += count ** 3 - count; });
    });
    const n = usable.length;
    const k = positionCount;
    const raw = (12 / (n * k * (k + 1))) * rankTotals.reduce((sum, total) => sum + total * total, 0) - 3 * n * (k + 1);
    const correction = 1 - tieTerm / (n * (k ** 3 - k));
    return {
      statistic: correction > 0 ? raw / correction : 0,
      rawStatistic: raw,
      tieCorrection: correction,
      endCount: n,
      positionCount: k
    };
  }

  function rankWithTies(values) {
    const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const ranks = Array(values.length).fill(0);
    let cursor = 0;
    while (cursor < indexed.length) {
      let end = cursor + 1;
      while (end < indexed.length && indexed[end].value === indexed[cursor].value) end += 1;
      const averageRank = ((cursor + 1) + end) / 2;
      for (let index = cursor; index < end; index += 1) ranks[indexed[index].index] = averageRank;
      cursor = end;
    }
    return ranks;
  }

  function criticalT95(df) {
    if (df <= 1) return 12.706;
    if (df === 2) return 4.303;
    if (df === 3) return 3.182;
    if (df === 4) return 2.776;
    if (df === 5) return 2.571;
    if (df === 6) return 2.447;
    if (df === 7) return 2.365;
    if (df === 8) return 2.306;
    if (df === 9) return 2.262;
    if (df === 10) return 2.228;
    if (df <= 12) return 2.179;
    if (df <= 15) return 2.131;
    if (df <= 20) return 2.086;
    if (df <= 30) return 2.042;
    return 1.96;
  }

  function chiSquare95(df) {
    const values = { 1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070, 6: 12.592, 7: 14.067, 8: 15.507, 9: 16.919, 10: 18.307 };
    return values[Math.min(10, Math.max(1, Math.round(df)))] || 18.307;
  }

  function chooseBestScenario(scenarios) {
    return scenarios.slice().sort((a, b) => b.result.expectedScore - a.result.expectedScore)[0] || null;
  }

  function makeDefaultTargets(actualScore, possibleTotal) {
    const actual = Math.max(0, Math.floor(Number(actualScore) || 0));
    const possible = Math.max(0, Math.floor(Number(possibleTotal) || 0));
    const desiredCount = 5;
    if (possible && actual >= possible) return [];
    if (!possible) {
      const firstMajorAbove = ceilToStep(actual + 1, 10);
      return uniqueTargets([firstMajorAbove, firstMajorAbove + 10, firstMajorAbove + 20, firstMajorAbove + 30, firstMajorAbove + 40], actual, possible, desiredCount);
    }
    const ratio = possible ? actual / possible : 0;
    const remaining = possible - actual;
    if (ratio >= 0.985 || remaining <= 10) return uniqueTargets([actual + 1, actual + 2, actual + 3, actual + 5, possible], actual, possible, desiredCount);
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
      if (!Number.isFinite(value) || value <= actual || (possible && value > possible)) return;
      if (!result.includes(value)) result.push(value);
    });
    if (possible && !result.includes(possible) && possible > actual && result.length < desiredCount) result.push(possible);
    const fallbackStep = possible && actual / possible >= 0.96 ? 1 : possible && actual / possible >= 0.9 ? 5 : 10;
    let next = result.length ? result[result.length - 1] + fallbackStep : actual + fallbackStep;
    while (result.length < desiredCount && (!possible || next <= possible)) {
      if (next > actual && !result.includes(next)) result.push(next);
      next += fallbackStep;
    }
    return result.slice(0, desiredCount).sort((a, b) => a - b);
  }

  function buildNotes({ pattern, scoringOptions, modelStability }) {
    const notes = [pattern.reliability.message];
    if (scoringOptions.extrapolation) {
      notes.push(`Extrapolated Distance is active, so the model uses projected ${App.Extrapolation.formatDistance(scoringOptions.extrapolation.targetDistanceM)} positions and scores without changing stored arrows.`);
    }
    if (pattern.outliers.majorCount > 0) {
      notes.push(`${pattern.outliers.majorCount} major outlier${pattern.outliers.majorCount === 1 ? "" : "s"} detected. The actual-pattern simulation keeps a capped repeat-outlier rate; Core group only removes them.`);
    }
    if (modelStability?.material) notes.push(modelStability.message);
    return notes;
  }

  function countRecordedTypes(scorecard) {
    const result = { plotted: 0, manual: 0, empty: 0, recorded: 0, total: 0 };
    (scorecard?.ends || []).forEach(end => {
      (end.arrows || []).forEach(arrow => {
        result.total += 1;
        const hasManual = arrow?.manualScore !== null && arrow?.manualScore !== undefined && arrow?.manualScore !== "";
        if (hasManual) result.manual += 1;
        if (arrow?.position) {
          result.plotted += 1;
          result.recorded += 1;
        } else if (hasManual) {
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
      if (!arrow?.position) return "empty";
      return `${Math.round(Number(arrow.position.xMm) * 10)}:${Math.round(Number(arrow.position.yMm) * 10)}`;
    })).join("|");
    const targetSignature = [
      targetFace?.id || "target",
      Number(targetFace?.diameterMm) || 0,
      ...((targetFace?.zones || []).map(zone => `${Number(zone.radiusMm) || 0}:${Number(zone.score) || 0}:${zone.label || ""}`))
    ].join("|");
    const extrapolationKey = scoringOptions.extrapolation
      ? `${scoringOptions.extrapolation.sourceDistanceM}>${scoringOptions.extrapolation.targetDistanceM}`
      : "native";
    return [targetSignature, extrapolationKey, plottedCount, simulationCount, compactPositions].join("::");
  }

  function makeInEndBarScale(values, maximumArrowScore) {
    const maximum = Math.max(1, Number(maximumArrowScore) || 1);
    const usable = (values || []).map(Number).filter(Number.isFinite);
    if (!usable.length) {
      return { minimum: 0, maximum, range: maximum, toPercent: () => 0 };
    }
    const minimumObserved = Math.min(...usable);
    const observedRange = Math.max(0, Math.max(...usable) - minimumObserved);
    const desiredMargin = Math.max(0.5, observedRange * 0.75);
    const roundedCandidate = Math.floor((minimumObserved - desiredMargin) * 2) / 2;
    const minimum = Math.max(0, Math.min(maximum * 0.6, roundedCandidate));
    const range = Math.max(0.5, maximum - minimum);
    return {
      minimum,
      maximum,
      range,
      toPercent(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 0;
        return App.Geometry.clamp(((numeric - minimum) / range) * 100, 0, 100);
      }
    };
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

  function average(values) {
    const usable = (values || []).map(Number).filter(Number.isFinite);
    return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
  }

  function standardDeviation(values) {
    const usable = (values || []).map(Number).filter(Number.isFinite);
    if (usable.length < 2) return 0;
    const mean = average(usable);
    return Math.sqrt(usable.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (usable.length - 1));
  }

  App.SessionIntelligence = {
    analyse,
    getEligibility,
    makeDefaultTargets,
    formatDirection,
    buildSessionProgression,
    classifySessionTrajectory,
    classifyInEndPerformance,
    friedmanTest,
    buildWeakestEndScenario,
    buildWeakestArrowPositionScenario,
    makeInEndBarScale
  };
})();
