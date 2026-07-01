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

  function formatSummary(scorecard, targetFace) {
    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, targetFace);
    const arrowsText = `${totals.recordedArrows}/${totals.totalArrows} arrows`;
    const scoreText = `${totals.scorecardTotal}/${totals.possibleTotal}`;
    return { totals, arrowsText, scoreText };
  }

  App.ScoreFormatting = {
    arrowDisplay,
    scoreClass,
    formatSummary
  };
})();
