(function () {
  const App = window.ArcheryApp;
  const { DEFAULT_SCORECARD, DEFAULT_TARGET_FACE_ID, SCHEMA_VERSION } = App.Constants;

  function createArrow(index) {
    return {
      id: App.Ids.makeId("arrow"),
      index,
      position: null,
      manualScore: null,
      notes: ""
    };
  }

  function createEnd(index, arrowsPerEnd) {
    return {
      id: App.Ids.makeId("end"),
      index,
      arrows: Array.from({ length: arrowsPerEnd }, (_, arrowIndex) => createArrow(arrowIndex + 1))
    };
  }

  function createScorecard(options = {}) {
    const now = App.Dates.nowIso();
    const endCount = Math.max(1, Number(options.ends || DEFAULT_SCORECARD.ends));
    const arrowsPerEnd = Math.max(1, Number(options.arrowsPerEnd || DEFAULT_SCORECARD.arrowsPerEnd));
    const requestedTargetFaceId = options.targetFaceId || DEFAULT_TARGET_FACE_ID;
    const face = App.TargetFaces.getTargetFace(requestedTargetFaceId);
    const targetFaceId = face.id;

    return {
      id: App.Ids.makeId("scorecard"),
      schemaVersion: SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
      shotAt: options.shotAt || now,
      name: options.name || DEFAULT_SCORECARD.name,
      roundType: options.roundType || "Custom",
      originalTargetFaceId: targetFaceId,
      activeViewTargetFaceId: targetFaceId,
      distanceM: Number(options.distanceM || DEFAULT_SCORECARD.distanceM),
      ends: Array.from({ length: endCount }, (_, endIndex) => createEnd(endIndex + 1, arrowsPerEnd)),
      equipment: {
        bow: "",
        arrows: "",
        sightMark: "",
        notes: ""
      },
      notes: options.notes || ""
    };
  }

  App.ScorecardFactory = { createScorecard };
})();
