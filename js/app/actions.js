(function () {
  const App = window.ArcheryApp;

  async function confirmDiscardUnsaved(message) {
    const state = App.State.getState();
    if (!state.dirty) return true;
    return App.Modal.confirm({
      title: "Unsaved changes",
      message: message || "This scorecard has unsaved changes. Continue anyway?",
      confirmText: "Continue",
      cancelText: "Stay here",
      variant: "warning"
    });
  }

  function createNewScorecard(options) {
    const scorecard = App.ScorecardFactory.createScorecard(options);
    App.State.setScorecard(scorecard, { dirty: true });
    return scorecard;
  }

  function selectArrow(endIndex, arrowIndex) {
    const state = App.State.getState();
    if (!state.scorecard) return;
    const end = state.scorecard.ends[endIndex];
    if (!end || !end.arrows[arrowIndex]) return;
    state.selected = { endIndex, arrowIndex };
    App.State.notify("selectArrow");
  }

  function clearSelection() {
    const state = App.State.getState();
    if (!state.selected) return;
    state.selected = null;
    App.State.notify("clearSelection");
  }

  function plotSelectedArrow(position) {
    const state = App.State.getState();
    const arrow = App.State.getSelectedArrow();
    if (state.viewport.interactionMode !== "plot") {
      App.Toast.show("Switch to Plot mode before plotting arrows", "danger");
      return false;
    }
    if (!arrow) {
      App.Toast.show("Select an empty arrow before plotting", "danger");
      return false;
    }

    if (arrow.position || arrow.manualScore) {
      App.Toast.show("Arrow already recorded. Use Edit mode to move it, or clear it first.", "danger");
      return false;
    }

    arrow.position = {
      xMm: roundMm(position.xMm),
      yMm: roundMm(position.yMm)
    };
    arrow.manualScore = null;
    state.scorecard.updatedAt = App.Dates.nowIso();
    state.dirty = true;
    advanceSelection();
    App.State.notify("plotArrow");
    return true;
  }

  function moveArrow(endIndex, arrowIndex, position, options = {}) {
    const state = App.State.getState();
    if (!state.scorecard) return false;
    const end = state.scorecard.ends[endIndex];
    if (!end || !end.arrows[arrowIndex]) return false;
    if (state.viewport.interactionMode !== "edit") return false;

    const arrow = end.arrows[arrowIndex];
    arrow.position = {
      xMm: roundMm(position.xMm),
      yMm: roundMm(position.yMm)
    };
    arrow.manualScore = null;
    state.selected = { endIndex, arrowIndex };
    state.scorecard.updatedAt = App.Dates.nowIso();
    state.dirty = true;
    App.State.notify(options.reason || "moveArrow");
    return true;
  }

  function setViewportMode(mode) {
    App.State.setViewportMode(mode);
  }

  function setVisibleEndIndex(endIndex) {
    App.State.setVisibleEndIndex(endIndex);
  }

  function setShowGrouping(showGrouping) {
    App.State.setShowGrouping(showGrouping);
  }

  function setGroupingOverlay(kind, enabled) {
    App.State.setGroupingOverlay(kind, enabled);
  }

  function setViewportDisplayMode(mode) {
    App.State.setViewportDisplayMode(mode);
  }

  function setTargetFaceVisibility(visibility) {
    App.State.setTargetFaceVisibility(visibility);
  }

  function setManualScore(scoreOption) {
    const state = App.State.getState();
    const arrow = App.State.getSelectedArrow();
    if (state.viewport.interactionMode === "locked") {
      App.Toast.show("Switch out of Locked mode before editing scores", "danger");
      return false;
    }
    if (!arrow) {
      App.Toast.show("Select an arrow before entering a manual score", "danger");
      return false;
    }

    arrow.position = null;
    arrow.manualScore = {
      label: scoreOption.label,
      value: scoreOption.value,
      zoneId: scoreOption.zoneId,
      isMiss: Boolean(scoreOption.isMiss)
    };
    state.scorecard.updatedAt = App.Dates.nowIso();
    state.dirty = true;
    advanceSelection();
    App.State.notify("manualScore");
    return true;
  }

  function clearSelectedArrow() {
    const state = App.State.getState();
    const arrow = App.State.getSelectedArrow();
    if (state.viewport.interactionMode === "locked") {
      App.Toast.show("Switch out of Locked mode before clearing arrows", "danger");
      return;
    }
    if (!arrow) return;
    arrow.position = null;
    arrow.manualScore = null;
    state.dirty = true;
    App.State.notify("clearArrow");
  }

  function advanceSelection() {
    const state = App.State.getState();
    const scorecard = state.scorecard;
    if (!scorecard) return;

    const startEnd = state.selected ? state.selected.endIndex : 0;
    const startArrow = state.selected ? state.selected.arrowIndex + 1 : 0;

    for (let endIndex = startEnd; endIndex < scorecard.ends.length; endIndex += 1) {
      const arrowStart = endIndex === startEnd ? startArrow : 0;
      for (let arrowIndex = arrowStart; arrowIndex < scorecard.ends[endIndex].arrows.length; arrowIndex += 1) {
        const arrow = scorecard.ends[endIndex].arrows[arrowIndex];
        if (!arrow.position && !arrow.manualScore) {
          state.selected = { endIndex, arrowIndex };
          return;
        }
      }
    }

    for (let endIndex = 0; endIndex < startEnd; endIndex += 1) {
      for (let arrowIndex = 0; arrowIndex < scorecard.ends[endIndex].arrows.length; arrowIndex += 1) {
        const arrow = scorecard.ends[endIndex].arrows[arrowIndex];
        if (!arrow.position && !arrow.manualScore) {
          state.selected = { endIndex, arrowIndex };
          return;
        }
      }
    }

    state.selected = null;
    state.viewport.interactionMode = "locked";
  }

  function updateScorecardMeta(updates) {
    const state = App.State.getState();
    if (!state.scorecard) return;
    Object.assign(state.scorecard, updates, { updatedAt: App.Dates.nowIso() });
    state.dirty = true;
    App.State.notify("scorecardMeta");
  }

  function changeTargetFace(targetFaceId) {
    const state = App.State.getState();
    if (!state.scorecard) return false;
    const face = App.TargetFaces.getTargetFace(targetFaceId);
    if (state.scorecard.activeViewTargetFaceId === face.id) return false;
    if (App.ScoringEngine.hasManualScores(state.scorecard)) {
      App.Toast.show("Clear manual scores before changing target face", "danger");
      return false;
    }
    state.scorecard.activeViewTargetFaceId = face.id;
    state.scorecard.updatedAt = App.Dates.nowIso();
    state.dirty = true;
    App.State.notify("targetFace");
    return true;
  }

  function saveCurrentScorecard() {
    const state = App.State.getState();
    if (!state.scorecard) return null;
    const saved = App.Storage.saveScorecard(state.scorecard);
    state.scorecard = saved;
    App.Storage.setLastOpenScorecardId(saved.id);
    state.dirty = false;
    App.State.notify("save");
    return saved;
  }

  function loadScorecard(scorecardId) {
    const scorecard = App.Storage.loadScorecard(scorecardId);
    if (!scorecard) return null;
    App.Storage.setLastOpenScorecardId(scorecard.id);
    App.State.setScorecard(scorecard, { dirty: false });
    return scorecard;
  }



  function renameSavedScorecard(scorecardId, name) {
    const state = App.State.getState();
    let saved = null;

    if (state.scorecard && state.scorecard.id === scorecardId) {
      state.scorecard.name = String(name || "Untitled Scorecard").trim() || "Untitled Scorecard";
      saved = App.Storage.saveScorecard(state.scorecard);
      state.scorecard = saved;
      App.Storage.setLastOpenScorecardId(saved.id);
      state.dirty = false;
      App.State.notify("renameSavedScorecard");
      return saved;
    }

    saved = App.Storage.renameScorecard(scorecardId, name);
    App.State.notify("renameSavedScorecard");
    return saved;
  }

  function duplicateSavedScorecard(scorecardId) {
    const copy = App.Storage.duplicateScorecard(scorecardId);
    App.State.notify("duplicateSavedScorecard");
    return copy;
  }

  function deleteSavedScorecard(scorecardId) {
    const state = App.State.getState();
    App.Storage.deleteScorecard(scorecardId);
    if (state.scorecard && state.scorecard.id === scorecardId) {
      state.dirty = true;
      App.State.notify("deleteSavedScorecard");
    }
    return true;
  }

  function importScorecard(scorecard) {
    const imported = App.Storage.normalizeScorecard(App.Storage.structuredCloneSafe(scorecard));
    imported.id = App.Ids.makeId("scorecard");
    imported.name = `${imported.name || "Imported Scorecard"} (Imported)`;
    imported.createdAt = App.Dates.nowIso();
    imported.updatedAt = imported.createdAt;
    App.State.setScorecard(imported, { dirty: true });
    return imported;
  }

  function roundMm(value) {
    return Math.round(value * 10) / 10;
  }

  App.Actions = {
    confirmDiscardUnsaved,
    createNewScorecard,
    selectArrow,
    clearSelection,
    plotSelectedArrow,
    moveArrow,
    setViewportMode,
    setVisibleEndIndex,
    setShowGrouping,
    setGroupingOverlay,
    setViewportDisplayMode,
    setTargetFaceVisibility,
    setManualScore,
    clearSelectedArrow,
    advanceSelection,
    updateScorecardMeta,
    changeTargetFace,
    saveCurrentScorecard,
    loadScorecard,
    renameSavedScorecard,
    duplicateSavedScorecard,
    deleteSavedScorecard,
    importScorecard
  };
})();
