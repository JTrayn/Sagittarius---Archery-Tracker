(function () {
  const App = window.ArcheryApp;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(x, y) {
    return Math.hypot(x, y);
  }

  function nearlyEqual(a, b, epsilon = 0.000001) {
    return Math.abs(a - b) <= epsilon;
  }

  App.Geometry = { clamp, distance, nearlyEqual };
})();
