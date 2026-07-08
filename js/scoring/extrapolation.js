(function () {
  const App = window.ArcheryApp;

  function getConfig() {
    return App.Constants.EXTRAPOLATION || {
      MIN_DISTANCE_M: 10,
      MAX_DISTANCE_M: 100,
      STEP_M: 0.1,
      SCALE_EASE: 0.18
    };
  }

  function clampDistance(distanceM) {
    const config = getConfig();
    const value = Number(distanceM);
    const fallback = Number.isFinite(value) ? value : config.MIN_DISTANCE_M;
    return App.Geometry.clamp(fallback, config.MIN_DISTANCE_M, config.MAX_DISTANCE_M);
  }

  function getScorecardDistanceM(scorecard) {
    const distance = Number(scorecard?.distanceM);
    return Number.isFinite(distance) && distance > 0 ? distance : null;
  }

  function makeStateForScorecard(scorecard, previous = {}) {
    const sourceDistanceM = getScorecardDistanceM(scorecard) || Number(previous.sourceDistanceM) || 70;
    const targetDistanceM = clampDistance(
      Number.isFinite(Number(previous.targetDistanceM))
        ? Number(previous.targetDistanceM)
        : sourceDistanceM
    );
    return {
      enabled: Boolean(previous.enabled),
      sourceDistanceM,
      targetDistanceM
    };
  }

  function getTransform(scorecard, viewport = {}) {
    const sourceDistanceM = getScorecardDistanceM(scorecard) || Number(viewport.extrapolation?.sourceDistanceM) || null;
    const targetDistanceM = clampDistance(viewport.extrapolation?.targetDistanceM ?? sourceDistanceM ?? 70);
    const enabled = Boolean(viewport.extrapolation?.enabled) && Boolean(sourceDistanceM) && sourceDistanceM > 0;
    const scale = enabled ? targetDistanceM / sourceDistanceM : 1;
    return {
      enabled,
      sourceDistanceM,
      targetDistanceM,
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1
    };
  }

  function transformPosition(position, transform) {
    if (!position) return null;
    const scale = transform && transform.enabled ? Number(transform.scale) || 1 : 1;
    return {
      xMm: (Number(position.xMm) || 0) * scale,
      yMm: (Number(position.yMm) || 0) * scale
    };
  }

  function inverseTransformPosition(position, transform) {
    if (!position) return null;
    const scale = transform && transform.enabled ? Number(transform.scale) || 1 : 1;
    const safeScale = Number.isFinite(scale) && Math.abs(scale) > 0.000001 ? scale : 1;
    return {
      xMm: (Number(position.xMm) || 0) / safeScale,
      yMm: (Number(position.yMm) || 0) / safeScale
    };
  }

  function getProjectedScoreOptions(scorecard, viewport = {}) {
    const transform = getTransform(scorecard, viewport);
    return transform.enabled ? { extrapolation: transform } : {};
  }

  function formatDistance(distanceM) {
    const value = Number(distanceM);
    if (!Number.isFinite(value)) return "?m";
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}m`;
  }

  function formatScale(scale) {
    const value = Number(scale);
    if (!Number.isFinite(value)) return "1.00x";
    return `${value.toFixed(2)}x`;
  }

  App.Extrapolation = {
    clampDistance,
    makeStateForScorecard,
    getScorecardDistanceM,
    getTransform,
    transformPosition,
    inverseTransformPosition,
    getProjectedScoreOptions,
    formatDistance,
    formatScale
  };
})();
