(function () {
  const App = window.ArcheryApp;
  const { STORAGE_KEYS } = App.Constants;

  function readIndex() {
    migrateLegacyStorageIfNeeded();
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SCORECARD_INDEX);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn("Could not read scorecard index", error);
      return [];
    }
  }

  function writeIndex(index) {
    localStorage.setItem(STORAGE_KEYS.SCORECARD_INDEX, JSON.stringify(index));
  }

  function migrateLegacyStorageIfNeeded() {
    if (localStorage.getItem(STORAGE_KEYS.SCORECARD_INDEX)) return;

    const legacyRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_INDEX);
    if (!legacyRaw) return;

    try {
      const legacyIndex = JSON.parse(legacyRaw);
      if (!Array.isArray(legacyIndex)) return;

      legacyIndex.forEach(item => {
        if (!item || !item.id) return;
        const legacyData = localStorage.getItem(STORAGE_KEYS.LEGACY_PREFIX + item.id);
        if (legacyData && !localStorage.getItem(STORAGE_KEYS.SCORECARD_PREFIX + item.id)) {
          localStorage.setItem(STORAGE_KEYS.SCORECARD_PREFIX + item.id, legacyData);
        }
      });

      localStorage.setItem(STORAGE_KEYS.SCORECARD_INDEX, JSON.stringify(legacyIndex));

      const legacyLastId = localStorage.getItem(STORAGE_KEYS.LEGACY_LAST_ID);
      if (legacyLastId && !localStorage.getItem(STORAGE_KEYS.LAST_SCORECARD_ID)) {
        localStorage.setItem(STORAGE_KEYS.LAST_SCORECARD_ID, legacyLastId);
      }
    } catch (error) {
      console.warn("Could not migrate older saved scorecards", error);
    }
  }

  function setLastOpenScorecardId(scorecardId) {
    if (!scorecardId) return;
    localStorage.setItem(STORAGE_KEYS.LAST_SCORECARD_ID, scorecardId);
  }

  function getLastOpenScorecardId() {
    migrateLegacyStorageIfNeeded();
    return localStorage.getItem(STORAGE_KEYS.LAST_SCORECARD_ID);
  }

  function clearLastOpenScorecardId(scorecardId) {
    const current = getLastOpenScorecardId();
    if (!current || (scorecardId && current !== scorecardId)) return;
    localStorage.removeItem(STORAGE_KEYS.LAST_SCORECARD_ID);
  }

  function loadLastOpenScorecard() {
    const lastId = getLastOpenScorecardId();
    if (lastId) {
      const scorecard = loadScorecard(lastId);
      if (scorecard) return scorecard;
      clearLastOpenScorecardId(lastId);
    }

    const fallback = listScorecards()[0];
    return fallback ? loadScorecard(fallback.id) : null;
  }

  function makeSummary(scorecard) {
    const activeFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
    const originalFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
    const totals = App.ScoringEngine.calculateScorecardTotals(scorecard, activeFace);
    return {
      id: scorecard.id,
      name: scorecard.name,
      createdAt: scorecard.createdAt,
      updatedAt: scorecard.updatedAt,
      shotAt: scorecard.shotAt || scorecard.createdAt,
      targetFaceId: activeFace.id,
      targetFaceName: activeFace.name,
      originalTargetFaceId: originalFace.id,
      originalTargetFaceName: originalFace.name,
      isComparisonView: originalFace.id !== activeFace.id,
      distanceM: scorecard.distanceM,
      roundType: scorecard.roundType || "Custom",
      arrows: totals.recordedArrows,
      totalArrows: totals.totalArrows,
      total: totals.scorecardTotal,
      possibleTotal: totals.possibleTotal,
      xCount: totals.xCount,
      missCount: totals.missCount,
      notes: scorecard.notes || ""
    };
  }

  function saveScorecard(scorecard) {
    const clone = structuredCloneSafe(scorecard);
    clone.updatedAt = App.Dates.nowIso();
    localStorage.setItem(STORAGE_KEYS.SCORECARD_PREFIX + clone.id, JSON.stringify(clone));

    const index = readIndex().filter(item => item.id !== clone.id);
    index.unshift(makeSummary(clone));
    writeIndex(index);
    return clone;
  }

  function loadScorecard(scorecardId) {
    migrateLegacyStorageIfNeeded();
    const raw = localStorage.getItem(STORAGE_KEYS.SCORECARD_PREFIX + scorecardId)
      || localStorage.getItem(STORAGE_KEYS.LEGACY_PREFIX + scorecardId);
    if (!raw) return null;
    return normalizeScorecard(JSON.parse(raw));
  }

  function listScorecards() {
    const index = readIndex();
    let changed = false;
    const hydrated = index.map(item => {
      const needsRefresh = !("possibleTotal" in item) || !("targetFaceName" in item) || !("shotAt" in item) || !("originalTargetFaceName" in item) || !("isComparisonView" in item);
      if (!needsRefresh) return item;
      const scorecard = loadScorecard(item.id);
      if (!scorecard) return item;
      changed = true;
      return makeSummary(scorecard);
    });

    if (changed) writeIndex(hydrated);
    return hydrated.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function deleteScorecard(scorecardId) {
    localStorage.removeItem(STORAGE_KEYS.SCORECARD_PREFIX + scorecardId);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_PREFIX + scorecardId);
    writeIndex(readIndex().filter(item => item.id !== scorecardId));
    clearLastOpenScorecardId(scorecardId);
  }

  function clearAllScorecards() {
    readIndex().forEach(item => {
      if (!item || !item.id) return;
      localStorage.removeItem(STORAGE_KEYS.SCORECARD_PREFIX + item.id);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_PREFIX + item.id);
    });
    writeIndex([]);
    clearLastOpenScorecardId();
    localStorage.removeItem(STORAGE_KEYS.LEGACY_INDEX);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_LAST_ID);
  }

  function renameScorecard(scorecardId, name) {
    const scorecard = loadScorecard(scorecardId);
    if (!scorecard) return null;
    scorecard.name = String(name || "Untitled Scorecard").trim() || "Untitled Scorecard";
    return saveScorecard(scorecard);
  }

  function duplicateScorecard(scorecardId) {
    const source = loadScorecard(scorecardId);
    if (!source) return null;
    const copy = structuredCloneSafe(source);
    const now = App.Dates.nowIso();
    copy.id = App.Ids.makeId("scorecard");
    copy.createdAt = now;
    copy.updatedAt = now;
    copy.shotAt = source.shotAt || source.createdAt || now;
    copy.name = makeCopyName(source.name || "Untitled Scorecard");
    return saveScorecard(copy);
  }

  function normalizeScorecard(scorecard) {
    if (!scorecard) return scorecard;
    scorecard.schemaVersion = scorecard.schemaVersion || 1;
    scorecard.shotAt = scorecard.shotAt || scorecard.createdAt || App.Dates.nowIso();
    scorecard.notes = scorecard.notes || "";
    scorecard.roundType = scorecard.roundType || "Custom";
    scorecard.equipment = scorecard.equipment || { bow: "", arrows: "", sightMark: "", notes: "" };
    scorecard.originalTargetFaceId = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId).id;
    scorecard.activeViewTargetFaceId = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId || scorecard.originalTargetFaceId).id;
    return scorecard;
  }

  function makeCopyName(name) {
    const base = String(name || "Untitled Scorecard").replace(/\s+\(Copy(?: \d+)?\)$/i, "");
    return `${base} (Copy)`;
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  App.Storage = {
    saveScorecard,
    loadScorecard,
    listScorecards,
    deleteScorecard,
    clearAllScorecards,
    renameScorecard,
    duplicateScorecard,
    setLastOpenScorecardId,
    getLastOpenScorecardId,
    clearLastOpenScorecardId,
    loadLastOpenScorecard,
    normalizeScorecard,
    structuredCloneSafe
  };
})();
