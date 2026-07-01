(function () {
  const App = window.ArcheryApp;

  function makeId(prefix) {
    const random = Math.random().toString(36).slice(2, 9);
    return `${prefix}_${Date.now().toString(36)}_${random}`;
  }

  App.Ids = { makeId };
})();
