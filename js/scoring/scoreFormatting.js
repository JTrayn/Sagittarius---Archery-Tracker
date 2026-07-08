(function () {
  const App = window.ArcheryApp;

  function arrowDisplay(score) {
    return score ? score.label : "·";
  }

  function scoreClass(score) {
    if (!score) return "empty";
    const label = String(score.label).toLowerCase();
    if (label === "x") return "score-x";
    if (label === "m") return "score-m";
    return `score-${label}`;
  }

  function formatSummary(scorecard, targetFace, options = {}) {
    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, targetFace, options);
    const arrowsText = `${totals.recordedArrows}/${totals.totalArrows} arrows`;
    const scoreText = `${totals.scorecardTotal}/${totals.possibleTotal}`;
    const averageScoreText = totals.averageArrowScore === null
      ? "-"
      : totals.averageArrowScore.toFixed(1);
    const averageDistanceText = totals.averageDistanceFromCentreMm === null
      ? "-"
      : `${totals.averageDistanceFromCentreMm.toFixed(1)}mm`;
    return { totals, arrowsText, scoreText, averageScoreText, averageDistanceText };
  }

  App.ScoreFormatting = {
    arrowDisplay,
    scoreClass,
    formatSummary
  };
})();
