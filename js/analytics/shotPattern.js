(function () {
  const App = window.ArcheryApp;

  const CHI_SQUARE_2D = {
    50: 1.3862943611,
    80: 3.218875825,
    95: 5.9914645471
  };

  function collectPlottedEntries(scorecard, targetFace, options = {}) {
    const entries = [];
    if (!scorecard || !Array.isArray(scorecard.ends)) return entries;

    const visibleEndIndex = options.visibleEndIndex === null || options.visibleEndIndex === undefined
      ? null
      : Number(options.visibleEndIndex);

    scorecard.ends.forEach((end, endIndex) => {
      if (visibleEndIndex !== null && endIndex !== visibleEndIndex) return;
      (end.arrows || []).forEach((arrow, arrowIndex) => {
        if (!arrow?.position) return;
        const position = options.extrapolation
          ? App.Extrapolation.transformPosition(arrow.position, options.extrapolation)
          : arrow.position;
        if (!isFinitePoint(position)) return;
        const normalizedPosition = {
          xMm: Number(position.xMm),
          yMm: Number(position.yMm)
        };
        entries.push({
          endIndex,
          arrowIndex,
          arrow,
          position: normalizedPosition,
          score: App.ScoringEngine.scorePosition(normalizedPosition, targetFace)
        });
      });
    });

    return entries;
  }

  function analyse(entries) {
    const plotted = Array.isArray(entries) ? entries.filter(entry => isFinitePoint(entry?.position)) : [];
    const count = plotted.length;
    if (!count) {
      return {
        count: 0,
        entries: [],
        reliability: getReliability(0),
        groupCentre: null,
        coreCentre: null,
        offsetDistanceMm: null,
        coreOffsetDistanceMm: null,
        allFit: null,
        coreFit: null,
        outliers: { mild: [], major: [], count: 0, mildCount: 0, majorCount: 0, majorRate: 0 },
        confidenceEllipses: [],
        shape: { label: "No plotted arrows", ratio: null, angleDeg: null }
      };
    }

    const annotated = plotted.map(entry => ({ ...entry, outlierLevel: "normal" }));
    const groupCentre = calculateMean(annotated);
    const robustCentre = calculateMedianCentre(annotated);
    const outlierInfo = classifyOutliers(annotated, robustCentre);
    const usableCore = outlierInfo.major.length && count >= 12
      ? annotated.filter(entry => entry.outlierLevel !== "major")
      : annotated.slice();
    const coreEntries = usableCore.length >= Math.max(3, Math.ceil(count * 0.5)) ? usableCore : annotated.slice();
    const allFit = fitGaussian(annotated);
    const coreFit = fitGaussian(coreEntries);
    const shape = describeShape(coreFit);
    const coreCentre = coreFit ? { xMm: coreFit.meanX, yMm: coreFit.meanY } : groupCentre;

    return {
      count,
      entries: annotated,
      reliability: getReliability(count),
      groupCentre,
      coreCentre,
      robustCentre,
      offsetDistanceMm: Math.hypot(groupCentre.xMm, groupCentre.yMm),
      coreOffsetDistanceMm: Math.hypot(coreCentre.xMm, coreCentre.yMm),
      allFit,
      coreFit,
      outliers: outlierInfo,
      confidenceEllipses: makeConfidenceEllipses(coreFit),
      shape,
      horizontalSpreadMm: coreFit ? coreFit.stdX * 2 : null,
      verticalSpreadMm: coreFit ? coreFit.stdY * 2 : null
    };
  }

  function fitGaussian(entries) {
    const points = entries.filter(entry => isFinitePoint(entry?.position));
    const count = points.length;
    if (!count) return null;
    const mean = calculateMean(points);
    if (count === 1) {
      const minVariance = 0.25;
      return completeFit({
        count,
        meanX: mean.xMm,
        meanY: mean.yMm,
        varianceX: minVariance,
        varianceY: minVariance,
        covarianceXY: 0
      });
    }

    let varianceX = 0;
    let varianceY = 0;
    let covarianceXY = 0;
    points.forEach(entry => {
      const dx = entry.position.xMm - mean.xMm;
      const dy = entry.position.yMm - mean.yMm;
      varianceX += dx * dx;
      varianceY += dy * dy;
      covarianceXY += dx * dy;
    });

    const denominator = Math.max(1, count - 1);
    return completeFit({
      count,
      meanX: mean.xMm,
      meanY: mean.yMm,
      varianceX: varianceX / denominator,
      varianceY: varianceY / denominator,
      covarianceXY: covarianceXY / denominator
    });
  }

  function completeFit(fit) {
    const minVariance = 0.25;
    let varianceX = Math.max(minVariance, Number(fit.varianceX) || 0);
    let varianceY = Math.max(minVariance, Number(fit.varianceY) || 0);
    let covarianceXY = Number(fit.covarianceXY) || 0;

    const maxCovariance = Math.sqrt(varianceX * varianceY) * 0.985;
    covarianceXY = App.Geometry.clamp(covarianceXY, -maxCovariance, maxCovariance);

    const eigen = calculateEigen(varianceX, varianceY, covarianceXY);
    if (eigen.minorVariance < minVariance) {
      const add = minVariance - eigen.minorVariance;
      varianceX += add;
      varianceY += add;
    }

    const finalEigen = calculateEigen(varianceX, varianceY, covarianceXY);
    return {
      count: fit.count,
      meanX: fit.meanX,
      meanY: fit.meanY,
      varianceX,
      varianceY,
      covarianceXY,
      stdX: Math.sqrt(varianceX),
      stdY: Math.sqrt(varianceY),
      correlation: covarianceXY / Math.sqrt(varianceX * varianceY),
      majorStdMm: Math.sqrt(finalEigen.majorVariance),
      minorStdMm: Math.sqrt(finalEigen.minorVariance),
      angleDeg: finalEigen.angleDeg
    };
  }

  function calculateEigen(varianceX, varianceY, covarianceXY) {
    const trace = varianceX + varianceY;
    const delta = Math.sqrt(Math.max(0, (varianceX - varianceY) ** 2 + 4 * covarianceXY * covarianceXY));
    const majorVariance = Math.max(0, (trace + delta) / 2);
    const minorVariance = Math.max(0, (trace - delta) / 2);
    let angleRad = 0;

    if (Math.abs(covarianceXY) > 0.000001 || Math.abs(majorVariance - varianceX) > 0.000001) {
      const vx = covarianceXY;
      const vy = majorVariance - varianceX;
      angleRad = Math.atan2(vy, vx);
      if (Math.abs(vx) < 0.000001 && Math.abs(vy) < 0.000001) {
        angleRad = varianceX >= varianceY ? 0 : Math.PI / 2;
      }
    } else {
      angleRad = varianceX >= varianceY ? 0 : Math.PI / 2;
    }

    let angleDeg = angleRad * 180 / Math.PI;
    while (angleDeg <= -90) angleDeg += 180;
    while (angleDeg > 90) angleDeg -= 180;

    return { majorVariance, minorVariance, angleDeg };
  }

  function calculateMean(entries) {
    const count = entries.length || 1;
    const total = entries.reduce((sum, entry) => ({
      xMm: sum.xMm + Number(entry.position.xMm),
      yMm: sum.yMm + Number(entry.position.yMm)
    }), { xMm: 0, yMm: 0 });
    return { xMm: total.xMm / count, yMm: total.yMm / count };
  }

  function calculateMedianCentre(entries) {
    return {
      xMm: median(entries.map(entry => entry.position.xMm)),
      yMm: median(entries.map(entry => entry.position.yMm))
    };
  }

  function classifyOutliers(entries, centre) {
    const distances = entries.map(entry => Math.hypot(entry.position.xMm - centre.xMm, entry.position.yMm - centre.yMm));
    const q1 = quantile(distances, 0.25);
    const q3 = quantile(distances, 0.75);
    const iqr = Math.max(0, q3 - q1);
    const med = median(distances);
    const mad = median(distances.map(distance => Math.abs(distance - med)));
    const robustSigma = Math.max(1, mad * 1.4826, standardDeviation(distances));
    const mildThreshold = Math.max(q3 + 1.5 * iqr, med + 2.35 * robustSigma);
    const majorThreshold = Math.max(q3 + 2.6 * iqr, med + 3.25 * robustSigma);
    const mild = [];
    const major = [];

    entries.forEach((entry, index) => {
      const distance = distances[index];
      entry.robustDistanceMm = distance;
      if (entries.length >= 12 && distance > majorThreshold) {
        entry.outlierLevel = "major";
        major.push(entry);
      } else if (entries.length >= 8 && distance > mildThreshold) {
        entry.outlierLevel = "mild";
        mild.push(entry);
      }
    });

    return {
      mild,
      major,
      count: mild.length + major.length,
      mildCount: mild.length,
      majorCount: major.length,
      majorRate: entries.length ? major.length / entries.length : 0,
      thresholds: { mildMm: mildThreshold, majorMm: majorThreshold }
    };
  }

  function makeConfidenceEllipses(fit) {
    if (!fit) return [];
    return Object.entries(CHI_SQUARE_2D).map(([level, chiSquare]) => {
      const scale = Math.sqrt(chiSquare);
      return {
        level: Number(level),
        majorRadiusMm: fit.majorStdMm * scale,
        minorRadiusMm: fit.minorStdMm * scale,
        angleDeg: fit.angleDeg,
        centre: { xMm: fit.meanX, yMm: fit.meanY }
      };
    });
  }

  function describeShape(fit) {
    if (!fit) return { label: "No plotted arrows", ratio: null, angleDeg: null, axis: "none" };
    const ratio = fit.minorStdMm > 0 ? fit.majorStdMm / fit.minorStdMm : Infinity;
    const absAngle = Math.abs(fit.angleDeg);
    if (ratio < 1.22) {
      return { label: "compact / round", ratio, angleDeg: fit.angleDeg, axis: "round" };
    }
    if (absAngle <= 22.5) {
      return { label: "horizontally stretched", ratio, angleDeg: fit.angleDeg, axis: "horizontal" };
    }
    if (absAngle >= 67.5) {
      return { label: "vertically stretched", ratio, angleDeg: fit.angleDeg, axis: "vertical" };
    }
    return { label: fit.angleDeg > 0 ? "diagonal down-right" : "diagonal up-right", ratio, angleDeg: fit.angleDeg, axis: "diagonal" };
  }

  function getReliability(count) {
    if (count <= 0) {
      return { level: "none", label: "No plotted arrows", message: "Plot arrows before running Performance Intelligence." };
    }
    if (count < 12) {
      return { level: "very-low", label: "Very low confidence", message: "Useful only as a rough preview. More plotted arrows are needed before the forecast should be trusted." };
    }
    if (count < 24) {
      return { level: "very-low", label: "Very low confidence", message: "Enough for a rough session preview, but the model can move sharply as more arrows are added." };
    }
    if (count < 36) {
      return { level: "low", label: "Low confidence", message: "Usable for early session feedback, but not yet a stable round-quality estimate." };
    }
    if (count < 72) {
      return { level: "moderate", label: "Moderate confidence", message: "Good for analysing this session pattern, with some uncertainty remaining." };
    }
    if (count < 144) {
      return { level: "good", label: "Good session-level confidence", message: "Good for analysing this scorecard. This is still not a long-term ability model." };
    }
    return { level: "strong", label: "Strong session-level confidence", message: "Strong for this selected data set. Long-term form should still use multiple sessions later." };
  }

  function median(values) {
    return quantile(values, 0.5);
  }

  function quantile(values, probability) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const index = (sorted.length - 1) * App.Geometry.clamp(probability, 0, 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  function standardDeviation(values) {
    const valid = values.filter(Number.isFinite);
    if (valid.length < 2) return 0;
    const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
    const variance = valid.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (valid.length - 1);
    return Math.sqrt(Math.max(0, variance));
  }

  function isFinitePoint(point) {
    return point && Number.isFinite(Number(point.xMm)) && Number.isFinite(Number(point.yMm));
  }

  App.ShotPattern = {
    collectPlottedEntries,
    analyse,
    fitGaussian,
    getReliability,
    quantile,
    median
  };
})();
