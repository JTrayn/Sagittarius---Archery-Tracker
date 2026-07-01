(function () {
  const App = window.ArcheryApp;

  const listeners = new Set();

  const state = {
    scorecard: null,
    selected: {
      endIndex: 0,
      arrowIndex: 0
    },
    viewport: {
      showArrowLabels: true,
      interactionMode: "plot",
      hoveredArrow: null,
      visibleEndIndex: null,
      showRadialGrouping: true,
      showSimpleGrouping: false,
      displayMode: "target",
      targetFaceVisibility: 1
    },
    dirty: false
  };

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify(reason = "state") {
    listeners.forEach(listener => listener(state, reason));
  }

  function getState() {
    return state;
  }

  function setScorecard(scorecard, options = {}) {
    state.scorecard = scorecard;
    const firstOpen = findFirstOpenArrow(scorecard);
    const completed = Boolean(scorecard) && !firstOpen;

    if (Object.prototype.hasOwnProperty.call(options, "selected")) {
      state.selected = normalizeSelection(options.selected, scorecard);
    } else {
      state.selected = completed ? null : firstOpen;
    }

    if (options.interactionMode) {
      state.viewport.interactionMode = normalizeViewportMode(options.interactionMode) || state.viewport.interactionMode;
    } else {
      state.viewport.interactionMode = completed ? "locked" : "plot";
    }

    state.viewport.visibleEndIndex = null;
    state.viewport.hoveredArrow = null;
    state.dirty = Boolean(options.dirty);
    notify("setScorecard");
  }

  function markDirty(isDirty = true) {
    state.dirty = isDirty;
    notify("dirty");
  }

  function findFirstOpenArrow(scorecard) {
    if (!scorecard) return null;
    for (let endIndex = 0; endIndex < scorecard.ends.length; endIndex += 1) {
      const end = scorecard.ends[endIndex];
      for (let arrowIndex = 0; arrowIndex < end.arrows.length; arrowIndex += 1) {
        const arrow = end.arrows[arrowIndex];
        if (!arrow.position && !arrow.manualScore) return { endIndex, arrowIndex };
      }
    }
    return null;
  }

  function isScorecardComplete(scorecard) {
    return Boolean(scorecard) && !findFirstOpenArrow(scorecard);
  }

  function getSelectedArrow() {
    const scorecard = state.scorecard;
    if (!scorecard || !state.selected) return null;
    const end = scorecard.ends[state.selected.endIndex];
    if (!end) return null;
    return end.arrows[state.selected.arrowIndex] || null;
  }

  function setViewportMode(mode) {
    const nextMode = normalizeViewportMode(mode);
    if (!nextMode) return;
    state.viewport.interactionMode = nextMode;
    state.viewport.hoveredArrow = null;

    if (nextMode === "locked") {
      state.selected = null;
    } else if (!state.selected && state.scorecard) {
      state.selected = findFirstOpenArrow(state.scorecard);
    }

    notify("viewportMode");
  }

  function setVisibleEndIndex(endIndex) {
    const normalized = endIndex === null || endIndex === "all" ? null : Number(endIndex);
    if (normalized !== null && (!Number.isInteger(normalized) || normalized < 0)) return;
    if (state.viewport.visibleEndIndex === normalized) return;
    state.viewport.visibleEndIndex = normalized;
    state.viewport.hoveredArrow = null;
    notify("visibleEnd");
  }

  function setGroupingOverlay(kind, enabled) {
    if (!["radial", "simple"].includes(kind)) return;
    const key = kind === "radial" ? "showRadialGrouping" : "showSimpleGrouping";
    const next = Boolean(enabled);
    if (state.viewport[key] === next) return;
    state.viewport[key] = next;
    notify("grouping");
  }

  function setTargetFaceVisibility(visibility) {
    const normalized = App.Geometry.clamp(Number(visibility) || 1, 0.35, 1);
    if (Math.abs(state.viewport.targetFaceVisibility - normalized) < 0.001) return;
    state.viewport.targetFaceVisibility = normalized;
    notify("targetFaceVisibility");
  }

  function setViewportDisplayMode(mode) {
    const nextMode = mode === "trends" ? "trends" : "target";
    if (state.viewport.displayMode === nextMode) return;
    state.viewport.displayMode = nextMode;
    state.viewport.hoveredArrow = null;
    notify("viewportDisplay");
  }

  function setShowGrouping(showGrouping) {
    setGroupingOverlay("radial", showGrouping);
  }

  function setHoveredArrow(arrowRef) {
    const current = state.viewport.hoveredArrow;
    const same = current && arrowRef
      && current.endIndex === arrowRef.endIndex
      && current.arrowIndex === arrowRef.arrowIndex;
    if (same || (!current && !arrowRef)) return;
    state.viewport.hoveredArrow = arrowRef ? {
      endIndex: arrowRef.endIndex,
      arrowIndex: arrowRef.arrowIndex
    } : null;
    notify("hoverArrow");
  }

  function normalizeViewportMode(mode) {
    return ["plot", "edit", "locked"].includes(mode) ? mode : null;
  }

  function normalizeSelection(selection, scorecard) {
    if (!selection || !scorecard) return null;
    const end = scorecard.ends[selection.endIndex];
    if (!end || !end.arrows[selection.arrowIndex]) return null;
    return {
      endIndex: selection.endIndex,
      arrowIndex: selection.arrowIndex
    };
  }

  App.State = {
    getState,
    setScorecard,
    markDirty,
    subscribe,
    notify,
    getSelectedArrow,
    findFirstOpenArrow,
    isScorecardComplete,
    setViewportMode,
    setVisibleEndIndex,
    setShowGrouping,
    setGroupingOverlay,
    setViewportDisplayMode,
    setTargetFaceVisibility,
    setHoveredArrow
  };
})();
