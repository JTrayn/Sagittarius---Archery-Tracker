(function () {
  const App = window.ArcheryApp;

  function runScenario(pattern, targetFace, options = {}) {
    const simulationCount = Math.max(100, Math.floor(Number(options.simulationCount) || 5000));
    const arrowCount = Math.max(1, Math.floor(Number(options.arrowCount) || pattern?.count || 1));
    const targets = Array.isArray(options.targets) ? options.targets.filter(Number.isFinite) : [];
    const actualScore = Number(options.actualScore);
    const hasActualScore = Number.isFinite(actualScore);
    const rng = createSeededRng(options.seed || "archery-intelligence");
    const model = createSimulationModel(pattern, options.transform || {});
    const scores = [];
    const labelTotals = new Map();
    const scoreValueTotals = new Map();
    const bucketTotals = new Map();
    let totalScore = 0;

    for (let simIndex = 0; simIndex < simulationCount; simIndex += 1) {
      let scoreTotal = 0;
      for (let arrowIndex = 0; arrowIndex < arrowCount; arrowIndex += 1) {
        const position = samplePosition(model, rng);
        const score = App.ScoringEngine.scorePosition(position, targetFace) || { label: "M", value: 0 };
        const label = score.label || String(score.value ?? 0);
        const value = Number(score.value) || 0;
        scoreTotal += value;
        labelTotals.set(label, (labelTotals.get(label) || 0) + 1);
        scoreValueTotals.set(value, (scoreValueTotals.get(value) || 0) + 1);
      }
      scores.push(scoreTotal);
      totalScore += scoreTotal;
      const bucket = Math.floor(scoreTotal / 10) * 10;
      bucketTotals.set(bucket, (bucketTotals.get(bucket) || 0) + 1);
    }

    scores.sort((a, b) => a - b);
    const expectedScore = totalScore / simulationCount;
    const varianceScore = scores.length
      ? scores.reduce((sum, score) => sum + Math.pow(score - expectedScore, 2), 0) / scores.length
      : 0;
    const stdDevScore = Math.sqrt(Math.max(0, varianceScore));
    const chances = targets.map(target => ({
      target,
      probability: scores.length ? scores.filter(score => score >= target).length / scores.length : 0
    }));
    const luckRating = hasActualScore ? percentileRankSorted(scores, actualScore) : null;

    return {
      simulationCount,
      arrowCount,
      expectedScore,
      stdDevScore,
      luckRating,
      medianScore: percentileSorted(scores, 0.5),
      p05: percentileSorted(scores, 0.05),
      p10: percentileSorted(scores, 0.10),
      p90: percentileSorted(scores, 0.90),
      p95: percentileSorted(scores, 0.95),
      minScore: scores[0] ?? 0,
      maxScore: scores[scores.length - 1] ?? 0,
      chances,
      expectedLabels: mapToExpectedEntries(labelTotals, simulationCount),
      expectedScoreValues: mapToExpectedEntries(scoreValueTotals, simulationCount),
      distributionBuckets: Array.from(bucketTotals.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([bucket, count]) => ({ bucket, count, probability: count / simulationCount })),
      modelSummary: {
        outlierRate: model.outlierRate,
        meanX: model.fit.meanX,
        meanY: model.fit.meanY,
        stdX: Math.sqrt(model.fit.varianceX),
        stdY: Math.sqrt(model.fit.varianceY),
        covarianceXY: model.fit.covarianceXY
      }
    };
  }

  function createSimulationModel(pattern, transform = {}) {
    const sourceFit = pattern?.coreFit || pattern?.allFit || {
      meanX: 0,
      meanY: 0,
      varianceX: 1,
      varianceY: 1,
      covarianceXY: 0
    };
    const scaleX = positiveOrDefault(transform.scaleX, 1);
    const scaleY = positiveOrDefault(transform.scaleY, 1);
    const centreMode = transform.centreMode || "actual";
    const sourceCentre = {
      xMm: Number(sourceFit.meanX) || 0,
      yMm: Number(sourceFit.meanY) || 0
    };
    const nextMean = centreMode === "zero"
      ? { xMm: 0, yMm: 0 }
      : { xMm: sourceCentre.xMm, yMm: sourceCentre.yMm };
    const fit = regularizeFit({
      meanX: nextMean.xMm,
      meanY: nextMean.yMm,
      varianceX: Math.max(0, Number(sourceFit.varianceX) || 0) * scaleX * scaleX,
      varianceY: Math.max(0, Number(sourceFit.varianceY) || 0) * scaleY * scaleY,
      covarianceXY: (Number(sourceFit.covarianceXY) || 0) * scaleX * scaleY
    });

    const majorOutliers = pattern?.outliers?.major || [];
    const includeOutliers = transform.includeOutliers !== false && majorOutliers.length > 0;
    const baseOutlierRate = includeOutliers ? App.Geometry.clamp(Number(pattern?.outliers?.majorRate) || 0, 0, 0.18) : 0;
    const outlierRate = App.Geometry.clamp(baseOutlierRate * positiveOrDefault(transform.outlierRateMultiplier, 1), 0, 0.18);
    const outliers = majorOutliers.map(entry => transformPoint(entry.position, sourceCentre, nextMean, scaleX, scaleY));

    return { fit, outliers, outlierRate };
  }

  function regularizeFit(fit) {
    const minVariance = 0.25;
    let varianceX = Math.max(minVariance, Number(fit.varianceX) || 0);
    let varianceY = Math.max(minVariance, Number(fit.varianceY) || 0);
    let covarianceXY = Number(fit.covarianceXY) || 0;
    const maxCovariance = Math.sqrt(varianceX * varianceY) * 0.985;
    covarianceXY = App.Geometry.clamp(covarianceXY, -maxCovariance, maxCovariance);
    return {
      meanX: Number(fit.meanX) || 0,
      meanY: Number(fit.meanY) || 0,
      varianceX,
      varianceY,
      covarianceXY
    };
  }

  function samplePosition(model, rng) {
    if (model.outliers.length && rng() < model.outlierRate) {
      const source = model.outliers[Math.floor(rng() * model.outliers.length)] || { xMm: 0, yMm: 0 };
      const jitter = Math.max(1, Math.min(Math.sqrt(model.fit.varianceX), Math.sqrt(model.fit.varianceY)) * 0.12);
      return {
        xMm: source.xMm + gaussian(rng) * jitter,
        yMm: source.yMm + gaussian(rng) * jitter
      };
    }

    return sampleGaussian(model.fit, rng);
  }

  function sampleGaussian(fit, rng) {
    const z1 = gaussian(rng);
    const z2 = gaussian(rng);
    const l11 = Math.sqrt(Math.max(0.000001, fit.varianceX));
    const l21 = fit.covarianceXY / l11;
    const l22 = Math.sqrt(Math.max(0.000001, fit.varianceY - l21 * l21));
    return {
      xMm: fit.meanX + l11 * z1,
      yMm: fit.meanY + l21 * z1 + l22 * z2
    };
  }

  function gaussian(rng) {
    let u = 0;
    let v = 0;
    while (u <= 0) u = rng();
    while (v <= 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function transformPoint(point, sourceCentre, nextMean, scaleX, scaleY) {
    return {
      xMm: nextMean.xMm + (Number(point.xMm) - sourceCentre.xMm) * scaleX,
      yMm: nextMean.yMm + (Number(point.yMm) - sourceCentre.yMm) * scaleY
    };
  }

  function mapToExpectedEntries(map, simulationCount) {
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, expectedCount: count / simulationCount }))
      .sort((a, b) => {
        const aNumber = Number(a.label);
        const bNumber = Number(b.label);
        if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) return bNumber - aNumber;
        return String(a.label).localeCompare(String(b.label));
      });
  }

  function percentileRankSorted(sortedValues, actualScore) {
    if (!sortedValues.length || !Number.isFinite(actualScore)) return null;
    let lower = 0;
    let upper = sortedValues.length;
    while (lower < upper) {
      const midpoint = Math.floor((lower + upper) / 2);
      if (sortedValues[midpoint] < actualScore) lower = midpoint + 1;
      else upper = midpoint;
    }
    const countLess = lower;
    lower = 0;
    upper = sortedValues.length;
    while (lower < upper) {
      const midpoint = Math.floor((lower + upper) / 2);
      if (sortedValues[midpoint] <= actualScore) lower = midpoint + 1;
      else upper = midpoint;
    }
    const countLessOrEqual = lower;
    const countEqual = countLessOrEqual - countLess;
    const centeredRank = countLess + countEqual * 0.5;
    return App.Geometry.clamp((centeredRank / sortedValues.length) * 100, 0, 100);
  }

  function percentileSorted(sortedValues, probability) {
    if (!sortedValues.length) return 0;
    const index = (sortedValues.length - 1) * App.Geometry.clamp(probability, 0, 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedValues[lower];
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  function positiveOrDefault(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
  }

  function createSeededRng(seedValue) {
    let seed = hashString(String(seedValue));
    return function random() {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  App.MonteCarlo = {
    runScenario,
    createSimulationModel,
    createSeededRng
  };
})();
