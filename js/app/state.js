(function () {
  const App = window.ArcheryApp;

  const listeners = new Set();
  let cleanSignature = null;

  const state = {
    scorecard: null,
    selected: {
      endIndex: 0,
      arrowIndex: 0
    },
    viewport: {
      showArrowLabels: false,
      interactionMode: "plot",
      hoveredArrow: null,
      scorecardFocus: null,
      visibleEndIndex: null,
      showRadialGrouping: false,
      showSimpleGrouping: false,
      showIntelligenceOverlay: false,
      showRingBreakLuckOverlay: false,
      displayMode: "target",
      targetFaceVisibility: 1,
      extrapolation: {
        enabled: false,
        sourceDistanceM: 70,
        targetDistanceM: 70
      },
      timeline: {
        enabled: false,
        playing: false,
        revealedCount: 0,
        speed: 2,
        lastStepAt: 0,
        viewMode: "scorecard",
        endPlaybackMode: "sequential",
        endZoomToFit: false
      }
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
    state.viewport.scorecardFocus = null;
    state.viewport.showIntelligenceOverlay = false;
    state.viewport.showRingBreakLuckOverlay = false;
    state.viewport.timeline = normalizeTimelineState({
      enabled: false,
      playing: false,
      revealedCount: 0,
      speed: state.viewport.timeline?.speed || 2,
      viewMode: state.viewport.timeline?.viewMode || "scorecard",
      endPlaybackMode: state.viewport.timeline?.endPlaybackMode || "sequential",
      endZoomToFit: Boolean(state.viewport.timeline?.endZoomToFit)
    });
    const scorecardDistanceM = App.Extrapolation.getScorecardDistanceM(scorecard) || state.viewport.extrapolation.sourceDistanceM;
    state.viewport.extrapolation = App.Extrapolation.makeStateForScorecard(scorecard, {
      enabled: false,
      sourceDistanceM: scorecardDistanceM,
      targetDistanceM: scorecardDistanceM
    });
    state.dirty = Boolean(options.dirty);
    if (!state.dirty && scorecard) {
      setCleanBaseline(scorecard);
    } else if (!scorecard) {
      cleanSignature = null;
    }
    notify("setScorecard");
  }

  function markDirty(isDirty = true) {
    state.dirty = isDirty;
    if (!isDirty && state.scorecard) {
      setCleanBaseline(state.scorecard);
    }
    notify("dirty");
  }

  function setCleanBaseline(scorecard = state.scorecard) {
    cleanSignature = scorecard ? makeDirtySignature(scorecard) : null;
  }

  function refreshDirtyFromBaseline() {
    if (!state.scorecard || !cleanSignature) {
      state.dirty = Boolean(state.scorecard);
      return state.dirty;
    }
    state.dirty = makeDirtySignature(state.scorecard) !== cleanSignature;
    return state.dirty;
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
    if (state.viewport.timeline?.enabled && nextMode !== "locked") {
      state.viewport.timeline.enabled = false;
      state.viewport.timeline.playing = false;
      state.viewport.timeline.revealedCount = 0;
    }
    state.viewport.interactionMode = nextMode;
    state.viewport.hoveredArrow = null;
    state.viewport.scorecardFocus = null;

    if (nextMode === "locked") {
      state.selected = null;
    } else if (!state.selected && state.scorecard) {
      state.selected = findFirstOpenArrow(state.scorecard);
    }

    notify("viewportMode");
  }

  function setVisibleEndIndex(endIndex) {
    if (state.viewport.timeline?.enabled) return;
    const normalized = endIndex === null || endIndex === "all" ? null : Number(endIndex);
    if (normalized !== null && (!Number.isInteger(normalized) || normalized < 0)) return;
    if (state.viewport.visibleEndIndex === normalized) return;
    state.viewport.visibleEndIndex = normalized;
    state.viewport.hoveredArrow = null;
    state.viewport.scorecardFocus = null;
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

  function setIntelligenceOverlay(enabled) {
    const next = Boolean(enabled);
    if (state.viewport.showIntelligenceOverlay === next) return;
    state.viewport.showIntelligenceOverlay = next;
    state.viewport.hoveredArrow = null;
    notify("intelligenceOverlay");
  }

  function setRingBreakLuckOverlay(enabled) {
    const next = Boolean(enabled);
    if (state.viewport.showRingBreakLuckOverlay === next) return;
    state.viewport.showRingBreakLuckOverlay = next;
    state.viewport.hoveredArrow = null;
    notify("ringBreakLuckOverlay");
  }

  function setTargetFaceVisibility(visibility) {
    const normalized = App.Geometry.clamp(Number(visibility) || 1, 0.35, 1);
    if (Math.abs(state.viewport.targetFaceVisibility - normalized) < 0.001) return;
    state.viewport.targetFaceVisibility = normalized;
    notify("targetFaceVisibility");
  }


  function setExtrapolationEnabled(enabled) {
    state.viewport.extrapolation = App.Extrapolation.makeStateForScorecard(state.scorecard, state.viewport.extrapolation);
    const next = Boolean(enabled);
    if (state.viewport.extrapolation.enabled === next) return;
    state.viewport.extrapolation.enabled = next;
    if (!next) {
      const source = App.Extrapolation.getScorecardDistanceM(state.scorecard) || state.viewport.extrapolation.sourceDistanceM;
      state.viewport.extrapolation.targetDistanceM = App.Extrapolation.clampDistance(source);
    }
    state.viewport.hoveredArrow = null;
    notify("extrapolation");
  }

  function setExtrapolationDistance(distanceM) {
    state.viewport.extrapolation = App.Extrapolation.makeStateForScorecard(state.scorecard, state.viewport.extrapolation);
    const next = App.Extrapolation.clampDistance(distanceM);
    if (Math.abs((Number(state.viewport.extrapolation.targetDistanceM) || 0) - next) < 0.001) return;
    state.viewport.extrapolation.targetDistanceM = next;
    state.viewport.hoveredArrow = null;
    notify("extrapolationDistance");
  }

  function resetExtrapolationDistanceToScorecard() {
    state.viewport.extrapolation = App.Extrapolation.makeStateForScorecard(state.scorecard, state.viewport.extrapolation);
    const source = App.Extrapolation.getScorecardDistanceM(state.scorecard) || state.viewport.extrapolation.sourceDistanceM;
    setExtrapolationDistance(source);
  }

  function setTimelineEnabled(enabled) {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    const next = Boolean(enabled);
    const total = countTimelineFrames(state.scorecard, state.viewport.timeline);
    if (next && (!state.scorecard || total <= 0)) {
      state.viewport.timeline.enabled = false;
      state.viewport.timeline.playing = false;
      state.viewport.timeline.revealedCount = 0;
      notify("timeline");
      return;
    }
    if (state.viewport.timeline.enabled === next) return;
    state.viewport.timeline.enabled = next;
    state.viewport.timeline.playing = next;
    state.viewport.timeline.revealedCount = 0;
    state.viewport.timeline.lastStepAt = 0;
    state.viewport.hoveredArrow = null;
    state.viewport.scorecardFocus = null;
    if (next) {
      state.viewport.displayMode = "target";
      state.viewport.visibleEndIndex = null;
      state.viewport.interactionMode = "locked";
      state.selected = null;
    }
    notify("timeline");
  }

  function setTimelinePlaying(playing) {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    if (!state.viewport.timeline.enabled) return;
    const total = countTimelineFrames(state.scorecard, state.viewport.timeline);
    const next = Boolean(playing) && total > 0;
    if (next && state.viewport.timeline.revealedCount >= total) {
      state.viewport.timeline.revealedCount = 0;
    }
    if (state.viewport.timeline.playing === next) return;
    state.viewport.timeline.playing = next;
    state.viewport.timeline.lastStepAt = 0;
    notify("timelinePlay");
  }

  function setTimelineRevealCount(count, options = {}) {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    if (!state.viewport.timeline.enabled) return;
    const total = countTimelineFrames(state.scorecard, state.viewport.timeline);
    const next = App.Geometry.clamp(Math.floor(Number(count) || 0), 0, total);
    const reachedEnd = next >= total;
    const shouldStop = reachedEnd && options.stopAtEnd !== false;
    if (state.viewport.timeline.revealedCount === next && (!shouldStop || !state.viewport.timeline.playing)) return;
    state.viewport.timeline.revealedCount = next;
    if (shouldStop) state.viewport.timeline.playing = false;
    notify(options.reason || "timelineFrame");
  }

  function resetTimeline() {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    if (!state.viewport.timeline.enabled) return;
    state.viewport.timeline.revealedCount = 0;
    state.viewport.timeline.playing = false;
    state.viewport.timeline.lastStepAt = 0;
    notify("timelineReset");
  }

  function setTimelineSpeed(speed) {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    const next = normalizeTimelineSpeed(speed);
    if (state.viewport.timeline.speed === next) return;
    state.viewport.timeline.speed = next;
    state.viewport.timeline.lastStepAt = 0;
    notify("timelineSpeed");
  }

  function setViewportDisplayMode(mode) {
    const nextMode = mode === "trends" ? "trends" : "target";
    if (nextMode === "trends" && state.viewport.timeline?.enabled) {
      state.viewport.timeline.enabled = false;
      state.viewport.timeline.playing = false;
      state.viewport.timeline.revealedCount = 0;
      state.viewport.timeline.lastStepAt = 0;
    }
    if (state.viewport.displayMode === nextMode) return;
    state.viewport.displayMode = nextMode;
    state.viewport.hoveredArrow = null;
    state.viewport.scorecardFocus = null;
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

  function setScorecardFocus(focus) {
    const normalized = normalizeScorecardFocus(focus);
    const current = state.viewport.scorecardFocus;
    const same = current && normalized
      && current.type === normalized.type
      && current.index === normalized.index;
    if (same || (!current && !normalized)) return;
    state.viewport.scorecardFocus = normalized;
    state.viewport.hoveredArrow = null;
    notify("scorecardFocus");
  }

  function clearScorecardFocus() {
    if (!state.viewport.scorecardFocus) return;
    state.viewport.scorecardFocus = null;
    notify("scorecardFocusClear");
  }

  function normalizeScorecardFocus(focus) {
    if (!focus || !["end", "arrow"].includes(focus.type)) return null;
    const index = Number(focus.index);
    if (!Number.isInteger(index) || index < 0) return null;
    return { type: focus.type, index };
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


  function setTimelineViewMode(mode) {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    const next = normalizeTimelineViewMode(mode);
    if (state.viewport.timeline.viewMode === next) return;
    state.viewport.timeline.viewMode = next;
    state.viewport.timeline.revealedCount = 0;
    state.viewport.timeline.playing = false;
    state.viewport.timeline.lastStepAt = 0;
    notify("timelineViewMode");
  }

  function setTimelineEndPlaybackMode(mode) {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    const next = normalizeTimelineEndPlaybackMode(mode);
    if (state.viewport.timeline.endPlaybackMode === next) return;
    state.viewport.timeline.endPlaybackMode = next;
    state.viewport.timeline.revealedCount = 0;
    state.viewport.timeline.playing = false;
    state.viewport.timeline.lastStepAt = 0;
    notify("timelineEndPlaybackMode");
  }

  function setTimelineEndZoomToFit(enabled) {
    state.viewport.timeline = normalizeTimelineState(state.viewport.timeline);
    const next = Boolean(enabled);
    if (state.viewport.timeline.endZoomToFit === next) return;
    state.viewport.timeline.endZoomToFit = next;
    notify("timelineEndZoomToFit");
  }

  function normalizeTimelineState(timeline = {}) {
    return {
      enabled: Boolean(timeline.enabled),
      playing: Boolean(timeline.playing),
      revealedCount: Math.max(0, Math.floor(Number(timeline.revealedCount) || 0)),
      speed: normalizeTimelineSpeed(timeline.speed),
      lastStepAt: Number(timeline.lastStepAt) || 0,
      viewMode: normalizeTimelineViewMode(timeline.viewMode),
      endPlaybackMode: normalizeTimelineEndPlaybackMode(timeline.endPlaybackMode),
      endZoomToFit: Boolean(timeline.endZoomToFit)
    };
  }

  function normalizeTimelineSpeed(speed) {
    const value = Number(speed) || 2;
    return [0.5, 1, 2].includes(value) ? value : 2;
  }

  function normalizeTimelineViewMode(mode) {
    return ["scorecard", "ends"].includes(mode) ? mode : "scorecard";
  }

  function normalizeTimelineEndPlaybackMode(mode) {
    return "sequential";
  }

  function countTimelineFrames(scorecard, timeline = state.viewport.timeline) {
    if (!scorecard || !Array.isArray(scorecard.ends)) return 0;
    return countRecordedArrows(scorecard);
  }

  function countRecordedArrows(scorecard) {
    if (!scorecard || !Array.isArray(scorecard.ends)) return 0;
    return scorecard.ends.reduce((total, end) => total + (end.arrows || []).filter(arrow => arrow && (arrow.position || arrow.manualScore)).length, 0);
  }


  function makeDirtySignature(value) {
    return JSON.stringify(sortForSignature(value));
  }

  function sortForSignature(value) {
    if (Array.isArray(value)) return value.map(sortForSignature);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value)
      .filter(key => key !== "updatedAt" && key !== "activeViewTargetFaceId")
      .sort()
      .reduce((result, key) => {
        result[key] = sortForSignature(value[key]);
        return result;
      }, {});
  }

  App.State = {
    getState,
    setScorecard,
    markDirty,
    setCleanBaseline,
    refreshDirtyFromBaseline,
    subscribe,
    notify,
    getSelectedArrow,
    findFirstOpenArrow,
    isScorecardComplete,
    setViewportMode,
    setVisibleEndIndex,
    setShowGrouping,
    setGroupingOverlay,
    setIntelligenceOverlay,
    setRingBreakLuckOverlay,
    setViewportDisplayMode,
    setTargetFaceVisibility,
    setExtrapolationEnabled,
    setExtrapolationDistance,
    resetExtrapolationDistanceToScorecard,
    setTimelineEnabled,
    setTimelinePlaying,
    setTimelineRevealCount,
    resetTimeline,
    setTimelineSpeed,
    setTimelineViewMode,
    setTimelineEndPlaybackMode,
    setTimelineEndZoomToFit,
    setHoveredArrow,
    setScorecardFocus,
    clearScorecardFocus
  };
})();
