(function () {
  const App = window.ArcheryApp;

  document.addEventListener("DOMContentLoaded", () => {
    App.Modal.init();
    App.Toast.init();
    App.TopControls.init();
    App.CustomSelect.init(document);

    let scorecardPanelSizer = null;
    const scorecard = new App.ScorecardView(document.getElementById("scorecardContainer"), {
      onLayoutChange: layoutMode => scorecardPanelSizer?.handleScorecardLayoutChange(layoutMode)
    });
    scorecard.bindEvents();

    const viewport = new App.TargetViewport({
      canvas: document.getElementById("targetCanvas"),
      hud: document.getElementById("viewportHud"),
      zoomHud: document.getElementById("zoomHud"),
      modeHud: document.getElementById("viewportModeHint"),
      modeBadge: document.getElementById("viewportModeBadge"),
      extrapolationWarning: document.getElementById("extrapolationWarning"),
      targetSwapWarning: document.getElementById("targetSwapWarning"),
      onPlot: worldPoint => {
        const state = App.State.getState();
        if (!state.scorecard) {
          App.Toast.show("Create a scorecard before plotting arrows", "danger");
          return;
        }
        App.Actions.plotSelectedArrow(worldPoint);
      }
    });

    const trendsView = new App.TrendsView({
      root: document.getElementById("trendsView"),
      canvas: document.getElementById("trendsCanvas"),
      summary: document.getElementById("trendsSummary"),
      records: document.getElementById("trendsRecords"),
      tooltip: document.getElementById("trendsTooltip"),
      metricSelect: document.getElementById("trendMetricSelect"),
      rangeSelect: document.getElementById("trendRangeSelect"),
      distanceSelect: document.getElementById("trendDistanceSelect"),
      targetSelect: document.getElementById("trendTargetSelect"),
      spacingTimelineBtn: document.getElementById("trendSpacingTimelineBtn"),
      spacingScorecardsBtn: document.getElementById("trendSpacingScorecardsBtn"),
      modeHint: document.getElementById("viewportModeHint")
    });

    const targetViewBtn = document.getElementById("targetViewBtn");
    const trendsViewBtn = document.getElementById("trendsViewBtn");
    const targetControlClusters = Array.from(document.querySelectorAll(".target-control-cluster"));
    const trendsControlCluster = document.querySelector(".trends-control-cluster");
    const targetCanvas = document.getElementById("targetCanvas");
    const trendsViewEl = document.getElementById("trendsView");
    const viewportHud = document.getElementById("viewportHud");
    const zoomHud = document.getElementById("zoomHud");
    const plotModeBtn = document.getElementById("plotModeBtn");
    const editModeBtn = document.getElementById("editModeBtn");
    const lockedModeBtn = document.getElementById("lockedModeBtn");
    const visibleEndSelect = document.getElementById("visibleEndSelect");
    const overlayDropdown = document.getElementById("overlayDropdown");
    const overlayMenuBtn = document.getElementById("overlayMenuBtn");
    const overlayMenu = document.getElementById("overlayMenu");
    const overlayMenuItems = Array.from(document.querySelectorAll("[data-overlay-toggle]"));
    const openIntelligenceBtn = document.getElementById("openIntelligenceBtn");
    const exportTargetImageBtn = document.getElementById("exportTargetImageBtn");
    const toggleExtrapolateBtn = document.getElementById("toggleExtrapolateBtn");
    const extrapolateDistanceRange = document.getElementById("extrapolateDistanceRange");
    const extrapolateDistanceValue = document.getElementById("extrapolateDistanceValue");
    const toggleTimelineBtn = document.getElementById("toggleTimelineBtn");
    const targetSwapDropdown = document.getElementById("targetSwapDropdown");
    const targetSwapMenuBtn = document.getElementById("targetSwapMenuBtn");
    const targetSwapMenu = document.getElementById("targetSwapMenu");
    const timelinePanel = document.getElementById("timelinePanel");
    const timelinePlayPauseBtn = document.getElementById("timelinePlayPauseBtn");
    const timelineResetBtn = document.getElementById("timelineResetBtn");
    const timelineViewModeSelect = document.getElementById("timelineViewModeSelect");
    const timelineEndZoomFitBtn = document.getElementById("timelineEndZoomFitBtn");
    const timelineSpeedSelect = document.getElementById("timelineSpeedSelect");
    const scorePanelEl = document.querySelector(".score-panel");
    scorecardPanelSizer = createWorkspaceSizer({
      workspace: document.querySelector(".workspace"),
      splitter: document.getElementById("workspaceSplitter"),
      scorePanel: scorePanelEl,
      scorecardContainer: document.getElementById("scorecardContainer"),
      viewport
    });

    targetViewBtn.addEventListener("click", () => App.Actions.setViewportDisplayMode("target"));
    trendsViewBtn.addEventListener("click", () => App.Actions.setViewportDisplayMode("trends"));
    plotModeBtn.addEventListener("click", () => App.Actions.setViewportMode("plot"));
    editModeBtn.addEventListener("click", () => App.Actions.setViewportMode("edit"));
    lockedModeBtn.addEventListener("click", () => App.Actions.setViewportMode("locked"));

    visibleEndSelect.addEventListener("change", event => {
      App.Actions.setVisibleEndIndex(event.target.value === "all" ? null : Number(event.target.value));
    });

    document.getElementById("fitTargetBtn").addEventListener("click", () => viewport.fitTarget(false));
    document.getElementById("resetViewBtn").addEventListener("click", () => viewport.resetView());
    overlayMenuBtn.addEventListener("click", event => {
      event.stopPropagation();
      setOverlayMenuOpen(overlayDropdown, overlayMenuBtn, overlayMenu, overlayMenu.hidden);
    });
    overlayMenu.addEventListener("click", event => event.stopPropagation());
    overlayMenuItems.forEach(item => {
      item.addEventListener("click", () => {
        handleOverlayMenuToggle(item.dataset.overlayToggle);
      });
    });
    document.addEventListener("click", event => {
      if (overlayDropdown && !overlayDropdown.contains(event.target)) {
        setOverlayMenuOpen(overlayDropdown, overlayMenuBtn, overlayMenu, false);
      }
      if (targetSwapDropdown && !targetSwapDropdown.contains(event.target)) {
        setTargetSwapMenuOpen(targetSwapDropdown, targetSwapMenuBtn, targetSwapMenu, false);
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      setOverlayMenuOpen(overlayDropdown, overlayMenuBtn, overlayMenu, false);
      setTargetSwapMenuOpen(targetSwapDropdown, targetSwapMenuBtn, targetSwapMenu, false);
    });
    openIntelligenceBtn.addEventListener("click", openIntelligenceModal);
    exportTargetImageBtn.addEventListener("click", openExportImageModal);
    toggleExtrapolateBtn.addEventListener("click", () => {
      const state = App.State.getState();
      App.Actions.setExtrapolationEnabled(!state.viewport.extrapolation.enabled);
    });
    extrapolateDistanceRange.addEventListener("input", event => {
      updateExtrapolateDistanceControl(extrapolateDistanceRange, extrapolateDistanceValue, Number(event.target.value));
      App.Actions.setExtrapolationDistance(Number(event.target.value));
    });
    targetSwapMenuBtn.addEventListener("click", event => {
      event.stopPropagation();
      setTargetSwapMenuOpen(targetSwapDropdown, targetSwapMenuBtn, targetSwapMenu, targetSwapMenu.hidden);
    });
    targetSwapMenu.addEventListener("click", event => {
      event.stopPropagation();
      const item = event.target.closest("[data-target-swap-id]");
      if (!item || item.disabled) return;
      const targetId = item.dataset.targetSwapId === "original" ? "original" : item.dataset.targetSwapId;
      if (App.Actions.setTargetSwapFace(targetId)) {
        const state = App.State.getState();
        const originalFace = App.TargetFaces.getTargetFace(state.scorecard?.originalTargetFaceId || state.scorecard?.activeViewTargetFaceId);
        const activeFace = App.TargetFaces.getTargetFace(state.scorecard?.activeViewTargetFaceId || originalFace.id);
        App.Toast.show(activeFace.id === originalFace.id ? "Returned to original target" : `Target swap: ${activeFace.shortName || activeFace.name}`, "success");
      }
      setTargetSwapMenuOpen(targetSwapDropdown, targetSwapMenuBtn, targetSwapMenu, false);
    });
    toggleTimelineBtn.addEventListener("click", () => {
      const state = App.State.getState();
      const enabled = Boolean(state.viewport.timeline?.enabled);
      const total = App.TimelineRenderer.countTimelineFrames(state.scorecard, state.viewport);
      if (!enabled && total <= 0) {
        App.Toast.show("Record at least one arrow before using Timeline", "danger");
        return;
      }
      App.Actions.setTimelineEnabled(!enabled);
    });
    timelinePlayPauseBtn.addEventListener("click", () => {
      const state = App.State.getState();
      const timeline = state.viewport.timeline || {};
      App.Actions.setTimelinePlaying(!timeline.playing);
    });
    timelineResetBtn.addEventListener("click", () => App.Actions.resetTimeline());
    timelineViewModeSelect.addEventListener("change", event => App.Actions.setTimelineViewMode(event.target.value));
    timelineEndZoomFitBtn.addEventListener("click", () => {
      const state = App.State.getState();
      App.Actions.setTimelineEndZoomToFit(!state.viewport.timeline?.endZoomToFit);
    });
    timelineSpeedSelect.addEventListener("change", event => App.Actions.setTimelineSpeed(Number(event.target.value)));

    App.State.subscribe((state, reason) => {
      plotModeBtn.classList.toggle("is-active", state.viewport.interactionMode === "plot");
      editModeBtn.classList.toggle("is-active", state.viewport.interactionMode === "edit");
      lockedModeBtn.classList.toggle("is-active", state.viewport.interactionMode === "locked");
      renderOverlayMenu(state, {
        overlayDropdown,
        overlayMenuBtn,
        overlayMenu,
        overlayMenuItems
      });
      updateViewportDisplayMode(state, {
        targetViewBtn,
        trendsViewBtn,
        targetControlClusters,
        trendsControlCluster,
        targetCanvas,
        trendsViewEl,
        viewportHud,
        zoomHud
      });
      renderVisibleEndSelect(state, visibleEndSelect);
      renderExtrapolationControls(state, {
        toggleExtrapolateBtn,
        extrapolateDistanceRange,
        extrapolateDistanceValue
      });
      renderTargetSwapMenu(state, {
        targetSwapDropdown,
        targetSwapMenuBtn,
        targetSwapMenu
      });
      renderTimelineControls(state, {
        toggleTimelineBtn,
        timelinePanel,
        timelinePlayPauseBtn,
        timelineResetBtn,
        timelineViewModeSelect,
        timelineEndZoomFitBtn,
        timelineSpeedSelect,
        visibleEndSelect,
        plotModeBtn,
        editModeBtn
      });
      App.TopControls.render(state);
      scorecard.render(state);
      viewport.setState(state);
      trendsView.render(state);
      if (reason === "setScorecard") {
        window.requestAnimationFrame(() => viewport.fitTarget(true));
      }
    });

    const lastScorecard = App.Storage.loadLastOpenScorecard();
    if (lastScorecard) {
      App.State.setScorecard(lastScorecard, { dirty: false });
      App.Toast.show(`Opened last scorecard: ${lastScorecard.name || "Untitled Scorecard"}`, "success");
    } else {
      const starter = App.ScorecardFactory.createScorecard(App.Constants.DEFAULT_SCORECARD);
      App.State.setScorecard(starter, { dirty: true });
      App.Toast.show("New starter scorecard ready", "success");
    }

    window.addEventListener("beforeunload", event => {
      if (!App.State.getState().dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

  });


  function handleOverlayMenuToggle(kind) {
    const state = App.State.getState();
    const timelineActive = Boolean(state.viewport.timeline?.enabled);
    if (kind === "labels") {
      state.viewport.showArrowLabels = !state.viewport.showArrowLabels;
      App.State.notify("viewportLabels");
      return;
    }

    if (timelineActive) {
      App.Toast.show("Analysis overlays are disabled during Timeline replay", "danger");
      return;
    }

    if (kind === "radial") {
      App.Actions.setGroupingOverlay("radial", !state.viewport.showRadialGrouping);
      return;
    }
    if (kind === "simple") {
      App.Actions.setGroupingOverlay("simple", !state.viewport.showSimpleGrouping);
      return;
    }
    if (kind === "dna") {
      const plottedCount = countPlottedArrows(state.scorecard);
      if (!state.viewport.showIntelligenceOverlay && plottedCount <= 0) {
        App.Toast.show("Plot at least one arrow before showing the DNA overlay", "danger");
        return;
      }
      App.Actions.setIntelligenceOverlay(!state.viewport.showIntelligenceOverlay);
      return;
    }
    if (kind === "ringBreakLuck") {
      const plottedCount = countPlottedArrows(state.scorecard);
      if (!state.viewport.showRingBreakLuckOverlay && plottedCount <= 0) {
        App.Toast.show("Plot at least one arrow before showing Ring Break Luck", "danger");
        return;
      }
      App.Actions.setRingBreakLuckOverlay(!state.viewport.showRingBreakLuckOverlay);
    }
  }

  function setOverlayMenuOpen(dropdown, trigger, menu, open) {
    if (!dropdown || !trigger || !menu) return;
    const next = Boolean(open);
    menu.hidden = !next;
    dropdown.classList.toggle("is-open", next);
    trigger.setAttribute("aria-expanded", next ? "true" : "false");
  }

  function setTargetSwapMenuOpen(dropdown, trigger, menu, open) {
    if (!dropdown || !trigger || !menu) return;
    const next = Boolean(open);
    menu.hidden = !next;
    dropdown.classList.toggle("is-open", next);
    trigger.setAttribute("aria-expanded", next ? "true" : "false");
  }

  function renderTargetSwapMenu(state, elements) {
    const { targetSwapDropdown, targetSwapMenuBtn, targetSwapMenu } = elements;
    if (!targetSwapMenuBtn || !targetSwapMenu) return;

    const scorecard = state.scorecard;
    const disabled = !scorecard || Boolean(state.viewport.displayMode === "trends");
    targetSwapMenuBtn.disabled = disabled;

    if (!scorecard) {
      targetSwapMenu.innerHTML = "";
      targetSwapMenuBtn.classList.remove("is-active");
      setTargetSwapMenuOpen(targetSwapDropdown, targetSwapMenuBtn, targetSwapMenu, false);
      return;
    }

    const originalFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
    const activeFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId || originalFace.id);
    const swapped = activeFace.id !== originalFace.id;
    targetSwapMenuBtn.innerHTML = `<span class="dropdown-trigger-label">Target swap</span><span class="dropdown-trigger-chevron" aria-hidden="true">⌄</span>`;
    targetSwapMenuBtn.classList.toggle("is-active", swapped);
    targetSwapMenuBtn.setAttribute("aria-label", swapped
      ? `Target swap active: viewing ${activeFace.name}. Original target is ${originalFace.name}.`
      : `Target swap inactive. Viewing original target: ${originalFace.name}.`);

    const groups = App.TargetFaces.getTargetFaceGroups();
    const rows = [];
    rows.push(renderTargetSwapItem({
      id: "original",
      label: "Original target",
      detail: originalFace.name,
      active: !swapped
    }));
    Object.entries(groups).forEach(([family, faces]) => {
      rows.push(`<div class="target-swap-menu-heading">${escapeHtml(family)}</div>`);
      faces.forEach(face => {
        rows.push(renderTargetSwapItem({
          id: face.id,
          label: face.name,
          detail: face.id === originalFace.id ? "Scorecard target" : (face.shortName || face.family || "Target face"),
          active: activeFace.id === face.id
        }));
      });
    });
    const html = rows.join("");
    if (targetSwapMenu.innerHTML !== html) targetSwapMenu.innerHTML = html;
    if (disabled) setTargetSwapMenuOpen(targetSwapDropdown, targetSwapMenuBtn, targetSwapMenu, false);
  }

  function renderTargetSwapItem({ id, label, detail, active }) {
    return `<button class="viewport-overlay-menu-item target-swap-menu-item ${active ? "is-active" : ""}" type="button" role="menuitemradio" data-target-swap-id="${escapeHtml(id)}" aria-checked="${active ? "true" : "false"}">
      <span class="overlay-menu-check" aria-hidden="true"></span>
      <span class="overlay-menu-copy"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail || "")}</small></span>
    </button>`;
  }

  function renderOverlayMenu(state, elements) {
    const { overlayDropdown, overlayMenuBtn, overlayMenu, overlayMenuItems } = elements;
    if (!overlayMenuBtn || !overlayMenuItems?.length) return;

    const activeMap = {
      labels: Boolean(state.viewport.showArrowLabels),
      radial: Boolean(state.viewport.showRadialGrouping),
      simple: Boolean(state.viewport.showSimpleGrouping),
      dna: Boolean(state.viewport.showIntelligenceOverlay),
      ringBreakLuck: Boolean(state.viewport.showRingBreakLuckOverlay)
    };
    const analysisOverlayActive = Boolean(activeMap.radial || activeMap.simple || activeMap.dna || activeMap.ringBreakLuck);
    overlayMenuBtn.innerHTML = `<span class="dropdown-trigger-label">Overlays</span><span class="dropdown-trigger-chevron" aria-hidden="true">⌄</span>`;
    overlayMenuBtn.classList.toggle("is-active", analysisOverlayActive);

    const timelineActive = Boolean(state.viewport.timeline?.enabled);
    overlayMenuItems.forEach(item => {
      const kind = item.dataset.overlayToggle;
      const active = Boolean(activeMap[kind]);
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-checked", active ? "true" : "false");
      item.disabled = timelineActive && kind !== "labels";
    });
    if (timelineActive) setOverlayMenuOpen(overlayDropdown, overlayMenuBtn, overlayMenu, false);
  }

  function createWorkspaceSizer({ workspace, splitter, scorePanel, scorecardContainer, viewport }) {
    if (!workspace || !splitter || !scorePanel || !scorecardContainer) {
      return {
        fitScorecardTable() {},
        handleScorecardLayoutChange() {},
        resetToDefault() {},
        setWidth() {}
      };
    }

    let dragging = false;
    let pointerOffsetX = 0;
    let resizeFrame = 0;

    const DEFAULT_SPLIT_RATIO = 0.35;
    const MIN_SPLIT_RATIO = 0.35;
    const MAX_SPLIT_RATIO = 0.6;
    let splitRatio = DEFAULT_SPLIT_RATIO;

    const splitterWidth = () => splitter.getBoundingClientRect().width || 8;
    const availableWidth = () => Math.max(1, workspace.getBoundingClientRect().width - splitterWidth());
    const clampRatio = value => App.Geometry.clamp(Number(value) || DEFAULT_SPLIT_RATIO, MIN_SPLIT_RATIO, MAX_SPLIT_RATIO);
    const widthFromRatio = ratio => Math.round(availableWidth() * clampRatio(ratio));

    function syncViewportAfterSnap() {
      if (!viewport || typeof viewport.flushResizeDraw !== "function") return;
      // Force the new grid width to resolve before repainting the target canvas.
      workspace.getBoundingClientRect();
      viewport.flushResizeDraw();
    }

    function applySplitRatio(value, options = {}) {
      splitRatio = clampRatio(value);
      const width = widthFromRatio(splitRatio);
      workspace.style.setProperty("--score-panel-width", `${width}px`);
      workspace.style.setProperty("--score-panel-ratio", String(splitRatio));
      if (options.syncViewport) syncViewportAfterSnap();
      return width;
    }

    function setWidth(value, options = {}) {
      const numericWidth = Number(value);
      const nextRatio = Number.isFinite(numericWidth)
        ? numericWidth / availableWidth()
        : splitRatio;
      return applySplitRatio(nextRatio, options);
    }

    function getCurrentWidth() {
      return widthFromRatio(splitRatio);
    }

    function resetToDefault() {
      applySplitRatio(DEFAULT_SPLIT_RATIO, { syncViewport: true });
    }

    function fitScorecardTable() {
      const table = scorecardContainer.querySelector(".scorecard-table");
      if (!table) {
        resetToDefault();
        return;
      }
      const scrollStyle = window.getComputedStyle(scorecardContainer);
      const horizontalPadding = parseFloat(scrollStyle.paddingLeft || "0") + parseFloat(scrollStyle.paddingRight || "0");
      const desired = Math.ceil(table.scrollWidth + horizontalPadding + 2);
      setWidth(desired, { syncViewport: true });
    }

    function handleScorecardLayoutChange(layoutMode) {
      if (layoutMode === "arrows") {
        fitScorecardTable();
      } else {
        resetToDefault();
      }
    }

    function startDrag(event) {
      dragging = true;
      pointerOffsetX = event.clientX - scorePanel.getBoundingClientRect().right;
      workspace.classList.add("is-resizing");
      splitter.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }

    function updateDrag(event) {
      if (!dragging) return;
      const workspaceLeft = workspace.getBoundingClientRect().left;
      const desired = event.clientX - pointerOffsetX - workspaceLeft;
      setWidth(desired);
    }

    function endDrag(event) {
      if (!dragging) return;
      dragging = false;
      workspace.classList.remove("is-resizing");
      splitter.releasePointerCapture?.(event.pointerId);
    }

    splitter.addEventListener("pointerdown", startDrag);
    window.addEventListener("pointermove", updateDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        applySplitRatio(splitRatio, { syncViewport: true });
      });
    });

    splitter.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      if (event.key === "Home") {
        applySplitRatio(MIN_SPLIT_RATIO, { syncViewport: true });
      } else if (event.key === "End") {
        applySplitRatio(MAX_SPLIT_RATIO, { syncViewport: true });
      } else {
        const direction = event.key === "ArrowRight" ? 1 : -1;
        setWidth(getCurrentWidth() + direction * 24, { syncViewport: true });
      }
    });

    applySplitRatio(DEFAULT_SPLIT_RATIO);

    return { fitScorecardTable, handleScorecardLayoutChange, resetToDefault, setWidth };
  }

  function renderVisibleEndSelect(state, select) {
    const scorecard = state.scorecard;
    const current = state.viewport.visibleEndIndex === null ? "all" : String(state.viewport.visibleEndIndex);
    const options = [`<option value="all">All ends</option>`];
    if (scorecard) {
      scorecard.ends.forEach((end, index) => {
        options.push(`<option value="${index}">End ${index + 1}</option>`);
      });
    }
    const html = options.join("");
    if (select.innerHTML !== html) select.innerHTML = html;
    select.value = current;
    if (App.CustomSelect) App.CustomSelect.enhance(select);
  }

  function renderExtrapolationControls(state, elements) {
    const scorecard = state.scorecard;
    const extrapolation = App.Extrapolation.getTransform(scorecard, state.viewport);
    const rawDistance = state.viewport.extrapolation?.targetDistanceM ?? App.Extrapolation.getScorecardDistanceM(scorecard) ?? 70;
    const targetDistance = App.Extrapolation.clampDistance(rawDistance);
    const enabled = Boolean(extrapolation.enabled);

    elements.toggleExtrapolateBtn.classList.toggle("is-active", enabled);
    elements.toggleExtrapolateBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    elements.extrapolateDistanceRange.disabled = !enabled;
    const control = elements.extrapolateDistanceRange.closest(".extrapolate-distance-control");
    if (control) control.classList.toggle("is-disabled", !enabled);
    updateExtrapolateDistanceControl(elements.extrapolateDistanceRange, elements.extrapolateDistanceValue, targetDistance);
  }

  function renderTimelineControls(state, elements) {
    const scorecard = state.scorecard;
    const timeline = App.TimelineRenderer.normalizeState(state.viewport.timeline);
    const active = Boolean(timeline.enabled);
    const total = App.TimelineRenderer.countTimelineFrames(scorecard, state.viewport);
    const status = App.TimelineRenderer.formatTimelineStatus(scorecard, state.viewport);
    const revealAtEnd = total > 0 && status.reveal >= total;

    elements.toggleTimelineBtn.classList.toggle("is-active", active);
    elements.toggleTimelineBtn.setAttribute("aria-pressed", active ? "true" : "false");
    elements.toggleTimelineBtn.textContent = active ? "Timeline On" : "Timeline";
    elements.timelinePanel.classList.toggle("hidden", !active || state.viewport.displayMode === "trends");
    elements.timelinePlayPauseBtn.textContent = timeline.playing
      ? "Pause"
      : revealAtEnd
        ? "Replay"
        : "Play";
    elements.timelinePlayPauseBtn.disabled = !active || total <= 0;
    elements.timelineResetBtn.disabled = !active;
    elements.timelineViewModeSelect.value = timeline.viewMode;
    elements.timelineViewModeSelect.disabled = !active;
    const showEndFit = active && timeline.viewMode === "ends";
    if (elements.timelineEndZoomFitBtn) {
      elements.timelineEndZoomFitBtn.classList.toggle("hidden", !showEndFit);
      elements.timelineEndZoomFitBtn.classList.toggle("is-active", Boolean(timeline.endZoomToFit));
      elements.timelineEndZoomFitBtn.setAttribute("aria-pressed", timeline.endZoomToFit ? "true" : "false");
      elements.timelineEndZoomFitBtn.disabled = !showEndFit;
    }
    elements.timelineSpeedSelect.value = String(timeline.speed);
    elements.timelineSpeedSelect.disabled = !active;
    elements.visibleEndSelect.disabled = active;
    elements.plotModeBtn.disabled = active;
    elements.editModeBtn.disabled = active;
    if (App.CustomSelect) {
      App.CustomSelect.refresh(elements.visibleEndSelect);
      App.CustomSelect.refresh(elements.timelineViewModeSelect);
      App.CustomSelect.refresh(elements.timelineSpeedSelect);
    }
  }

  function formatGroupOffset(offset) {
    const x = Number(offset?.xMm) || 0;
    const y = Number(offset?.yMm) || 0;
    const parts = [];
    if (Math.abs(x) >= 0.05) parts.push(`${x < 0 ? "Left" : "Right"} ${formatMm(Math.abs(x))}`);
    if (Math.abs(y) >= 0.05) parts.push(`${y < 0 ? "High" : "Low"} ${formatMm(Math.abs(y))}`);
    return parts.length ? parts.join(", ") : "centred";
  }

  function formatMm(value) {
    if (!Number.isFinite(value)) return "-";
    if (value >= 100) return `${Math.round(value)}mm`;
    return `${Math.round(value * 10) / 10}mm`;
  }

  function updateExtrapolateDistanceControl(range, output, distanceM) {
    if (!range || !output) return;
    const config = App.Constants.EXTRAPOLATION;
    const normalized = App.Extrapolation.clampDistance(distanceM);
    const rounded = Math.round(normalized * 10) / 10;
    const rangeValue = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    if (range.value !== rangeValue) range.value = rangeValue;
    const percent = ((normalized - config.MIN_DISTANCE_M) / (config.MAX_DISTANCE_M - config.MIN_DISTANCE_M)) * 100;
    range.style.setProperty("--range-progress", `${App.Geometry.clamp(percent, 0, 100)}%`);
    output.textContent = App.Extrapolation.formatDistance(normalized);
  }

  function updateViewportDisplayMode(state, elements) {
    const showTrends = state.viewport.displayMode === "trends";
    elements.targetViewBtn.classList.toggle("is-active", !showTrends);
    elements.trendsViewBtn.classList.toggle("is-active", showTrends);
    elements.targetControlClusters.forEach(cluster => cluster.classList.toggle("hidden", showTrends));
    elements.trendsControlCluster.classList.toggle("hidden", !showTrends);
    elements.targetCanvas.classList.toggle("hidden", showTrends);
    elements.trendsViewEl.classList.toggle("hidden", !showTrends);
    elements.viewportHud?.classList.toggle("hidden", showTrends);
    elements.zoomHud.classList.toggle("hidden", showTrends);
  }

  function updateDarkeningStrengthControl(range, output, percent) {
    if (!range || !output) return;
    const normalized = App.Geometry.clamp(Number(percent) || 0, 0, 100);
    if (range.value !== String(normalized)) range.value = String(normalized);
    range.style.setProperty("--range-progress", `${normalized}%`);
    output.textContent = `${normalized}%`;
  }

  function countPlottedArrows(scorecard) {
    if (!scorecard || !Array.isArray(scorecard.ends)) return 0;
    return scorecard.ends.reduce((total, end) => total + (end.arrows || []).filter(arrow => arrow?.position).length, 0);
  }


  function openIntelligenceModal() {
    const state = App.State.getState();
    const scorecard = state.scorecard;
    if (!scorecard) {
      App.Toast.show("Create or load a scorecard before opening Intelligence", "danger");
      return;
    }

    App.Modal.open("Performance Intelligence", renderIntelligenceLoadingModal(), modalBody => {
      modalBody.querySelector("[data-close-modal]")?.addEventListener("click", App.Modal.close);
    });

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const modalBackdrop = document.getElementById("modalBackdrop");
        if (modalBackdrop?.classList.contains("hidden")) return;

        const latestState = App.State.getState();
        const latestScorecard = latestState.scorecard;
        if (!latestScorecard) {
          App.Modal.close();
          App.Toast.show("Create or load a scorecard before opening Intelligence", "danger");
          return;
        }

        const targetFace = App.TargetFaces.getTargetFace(latestScorecard.activeViewTargetFaceId);
        const analysis = App.SessionIntelligence.analyse(latestScorecard, targetFace, {
          viewport: latestState.viewport,
          simulationCount: 5000
        });

        if (analysis.status === "no-plotted-arrows") {
          App.Modal.close();
          App.Toast.show("Plot at least one arrow before opening Intelligence", "danger");
          return;
        }

        App.Modal.open("Performance Intelligence", renderIntelligenceModal(analysis), bindIntelligenceModalActions);
      }, 25);
    });
  }

  function bindIntelligenceModalActions(modalBody) {
    attachIntelligenceHeaderHelp();
    modalBody.querySelector("[data-close-modal]")?.addEventListener("click", App.Modal.close);
    modalBody.querySelectorAll("[data-toggle-intelligence-overlay]").forEach(button => {
      button.addEventListener("click", () => {
        const next = !App.State.getState().viewport.showIntelligenceOverlay;
        App.Actions.setViewportDisplayMode("target");
        App.Actions.setIntelligenceOverlay(next);
        App.Modal.close();
        App.Toast.show(next ? "Shot DNA overlay enabled" : "Shot DNA overlay hidden", next ? "success" : "default");
      });
    });
  }

  function attachIntelligenceHeaderHelp() {
    const title = document.getElementById("modalTitle");
    if (!title || title.querySelector(".intelligence-help-wrap")) return;
    title.classList.add("modal-title-with-help");
    title.insertAdjacentHTML("beforeend", renderPerformanceIntelligenceHelp());
  }

  function renderIntelligenceLoadingModal() {
    return `
      <div class="intelligence-loading-panel" role="status" aria-live="polite">
        <div class="intelligence-loading-orb" aria-hidden="true"></div>
        <div>
          <span class="panel-eyebrow">Running Monte Carlo</span>
          <h3>Building your session forecast…</h3>
          <p>Generating 5,000 simulated scorecards from your plotted shot pattern.</p>
        </div>
        <div class="form-actions">
          <button class="btn" type="button" data-close-modal>Cancel</button>
        </div>
      </div>
    `;
  }

  function renderIntelligenceModal(analysis) {
    const forecast = analysis.forecast;
    const pattern = analysis.pattern;
    const actual = analysis.totals.scorecardTotal;
    const possible = analysis.totals.possibleTotal;
    const expected = Math.round(forecast.expectedScore);
    const scoreConversion = getScoreConversionLuck(actual, forecast, possible);
    const actualScoreText = `${formatScoreNumber(actual)}${possible ? ` / ${formatScoreNumber(possible)}` : ""}`;
    const luckRating = getLuckRating(forecast);
    const expectedOutcomeText = scoreConversion.message;
    const actualScenario = analysis.scenarios.find(scenario => scenario.id === "actual");
    const bestRealisticScenario = analysis.scenarios.find(scenario => scenario.id === "combined-realistic") || analysis.bestScenario;
    const tableScenarios = analysis.scenarios.filter(scenario => scenario.id !== "combined-realistic");
    const largestUpliftScenario = getLargestUpliftScenario(tableScenarios, actualScenario);
    const scenarioRows = tableScenarios.map(scenario => renderScenarioRow(scenario, actualScenario, largestUpliftScenario));
    const probabilityRows = renderProbabilityRows(forecast.chances);
    const ellipse95 = pattern.confidenceEllipses.find(ellipse => ellipse.level === 95) || pattern.confidenceEllipses[pattern.confidenceEllipses.length - 1];
    const overlayActive = Boolean(App.State.getState().viewport.showIntelligenceOverlay);
    const modelScopeText = analysis.forecastArrowCount === analysis.recordedBreakdown.plotted
      ? `${analysis.forecastArrowCount} plotted arrows`
      : `${analysis.recordedBreakdown.plotted} plotted arrows · ${analysis.forecastArrowCount} simulated-arrow round`;
    const coreCentre = pattern.coreFit ? { xMm: pattern.coreFit.meanX, yMm: pattern.coreFit.meanY } : pattern.groupCentre;
    const coreCentreText = App.SessionIntelligence.formatDirection(coreCentre);
    const outlierText = `${pattern.outliers.majorCount} major outlier${pattern.outliers.majorCount === 1 ? "" : "s"}`;
    const bestGain = bestRealisticScenario && actualScenario
      ? bestRealisticScenario.result.expectedScore - actualScenario.result.expectedScore
      : null;

    return `
      <div class="intelligence-modal intelligence-modal-v2">
        <section class="intelligence-hero intelligence-hero-v2">
          <div class="intelligence-hero-copy">
            <div class="intelligence-title-row">
              <span class="panel-eyebrow">Performance Intelligence · current selected scorecard</span>
            </div>
            <h3>${escapeHtml(analysis.scorecard.name || "Untitled Scorecard")}</h3>
            <p>${escapeHtml(analysis.targetFace.shortName || analysis.targetFace.name)} · ${modelScopeText} · ${analysis.simulationCount.toLocaleString()} Monte Carlo runs</p>
            <div class="intelligence-hero-pills" aria-label="Model context">
              ${renderIntelPill(pattern.reliability.label, `${analysis.recordedBreakdown.plotted} plotted arrows`)}
              ${renderIntelPill("Shot Pattern DNA", "Feeds the simulation")}
            </div>
          </div>
          <div class="intelligence-hero-stat-row">
            <div class="intelligence-hero-score">
              <span class="expected-score-heading">Expected score ${renderExpectedScoreHelp()}</span>
              <strong>${formatScoreNumber(forecast.expectedScore)}</strong>
              <small>Actual score ${actualScoreText}</small>
            </div>
            <div class="intelligence-hero-score intelligence-hero-luck ${escapeHtml(luckRating.visualClass)}" style="${escapeHtml(luckRating.visualStyle)}" data-luck-rating="${escapeHtml(luckRating.display)}" aria-label="${escapeHtml(luckRating.explanation)}">
              <span class="luck-rating-heading">Luck rating ${renderLuckRatingHelp()}</span>
              <strong>${luckRating.display}</strong>
              <small>${escapeHtml(luckRating.label)}</small>
            </div>
          </div>
        </section>

        <section class="intelligence-summary-strip" aria-label="Quick interpretation">
          <div class="intelligence-summary-copy">
            <span class="panel-eyebrow">Quick read</span>
            <p>${escapeHtml(makeIntelligenceSummary({ analysis, expected, actual, possible, expectedOutcomeText, scoreConversion, luckRating, coreCentreText, outlierText, bestRealisticScenario, bestGain }))}</p>
          </div>
          <button class="btn btn-small" type="button" data-toggle-intelligence-overlay>${overlayActive ? "Hide DNA Overlay" : "Show DNA Overlay"}</button>
        </section>

        <section class="intelligence-section intelligence-forecast-section">
          <div class="intelligence-section-title">
            <div>
              <span class="panel-eyebrow">1. Score forecast</span>
              <h4>What this session pattern would usually score</h4>
            </div>
            <p>The simulator generates x/y impacts from your plotted group model, then scores them through the normal target scoring engine.</p>
          </div>
          <div class="intelligence-grid intelligence-grid-primary">
            ${renderIntelMetric("Actual score", `${formatScoreNumber(actual)}${possible ? ` / ${formatScoreNumber(possible)}` : ""}`, `${analysis.recordedBreakdown.recorded}/${analysis.totals.totalArrows} arrows recorded`, "", "The real score currently recorded on this scorecard.")}
            ${renderIntelMetric("Expected score", formatScoreNumber(forecast.expectedScore), "Mean of simulated scorecards", "", "The average score from the 5,000 simulated repeats of this session pattern.")}
            ${renderIntelMetric("Likely range", `${formatScoreNumber(forecast.p10)}–${formatScoreNumber(forecast.p90)}`, "10th to 90th percentile", "", "A central range that most simulated repeats landed inside.")}
            ${renderIntelMetric("Best realistic", formatScoreNumber(forecast.p95), "95th percentile result", "", "A strong but still realistic repeat of this same actual pattern.")}
            ${renderIntelMetric("Worst realistic", formatScoreNumber(forecast.p05), "5th percentile result", "", "A weak but still realistic repeat of this same actual pattern.")}
            ${renderIntelMetric("Best simulated score", formatScoreNumber(forecast.maxScore), `Highest of ${analysis.simulationCount.toLocaleString()} simulated scorecards`, "", "The single highest score produced by this Monte Carlo run. This is not a prediction of your normal result; it is the best outcome that appeared in this simulation batch.")}
          </div>
        </section>

        <section class="intelligence-split intelligence-split-v2">
          <div class="intelligence-panel intelligence-probability-panel">
            <div class="intelligence-section-head">
              <span>Forecast probabilities</span>
              <small>Targets adapt to scorecard max and score ceiling.</small>
            </div>
            <p class="intelligence-panel-intro">Each percentage counts how often the 5,000 simulated scorecards reached that target or higher. The target scores adapt to the scorecard maximum: normal rounds use broader 10-point milestones, while near-perfect rounds switch to tighter 5/2/1-point milestones where small gains matter more.</p>
            <div class="intelligence-table">
              ${probabilityRows || `<div class="intelligence-empty">No higher target scores fit inside this scorecard's possible total.</div>`}
            </div>
          </div>

          <div class="intelligence-panel intelligence-dna-panel">
            <div class="intelligence-section-head">
              <span>Shot Pattern DNA</span>
              <small>Actual plotted arrows, core group model.</small>
            </div>
            <p class="intelligence-panel-intro">Shot Pattern DNA is derived from your actual plotted group. This DNA is then utilized in a Monte Carlo simulation.</p>
            <div class="intelligence-dna-grid intelligence-dna-grid-v2">
              ${renderDnaItem("MPI / group centre", escapeHtml(coreCentreText), "The centre of your normal/core plotted group.")}
              ${renderDnaItem("Offset", formatMm(pattern.offsetDistanceMm), "Distance from bullseye to the session's average plotted impact.")}
              ${renderDnaItem("Shape", escapeHtml(pattern.shape.label), "Whether the group is round, vertical, horizontal, or diagonal.")}
              ${renderDnaItem("Horizontal spread", formatMm(pattern.horizontalSpreadMm), "Approximate left/right width of the core group model.")}
              ${renderDnaItem("Vertical spread", formatMm(pattern.verticalSpreadMm), "Approximate high/low height of the core group model.")}
              ${renderDnaItem("Major outliers", String(pattern.outliers.majorCount), "Shots far outside the normal group shape, based on robust distance.")}
              ${renderDnaItem("95% ellipse", ellipse95 ? `${formatMm(ellipse95.majorRadiusMm * 2)} × ${formatMm(ellipse95.minorRadiusMm * 2)}` : "—", "The oval where about 95% of normal/core arrows are predicted to land.")}
              ${renderDnaItem("Group angle", Number.isFinite(pattern.shape.angleDeg) ? `${pattern.shape.angleDeg.toFixed(0)}°` : "—", "The direction of the ellipse's long axis.")}
            </div>
          </div>
        </section>

        <section class="intelligence-section intelligence-whatif-section">
          <div class="intelligence-section-title">
            <div>
              <span class="panel-eyebrow">2. What-if forecast</span>
              <h4>Best realistic version of this round</h4>
            </div>
            <p>The same Monte Carlo engine reruns your session pattern after controlled changes. The gain column compares each scenario to the Actual Pattern simulation.</p>
          </div>

          ${renderBestRealisticCard(bestRealisticScenario, actualScenario, actual, bestGain)}

          <div class="intelligence-panel intelligence-scenarios">
            <div class="intelligence-section-head">
              <span>Scenario table</span>
              <small>Each row is a modified version of the same session pattern.</small>
            </div>
            <div class="intelligence-scenario-table">
              <div class="intelligence-scenario-row intelligence-scenario-head">
                <span>Scenario</span>
                <span>Expected</span>
                <span>Gain</span>
                <span>Likely range</span>
              </div>
              ${scenarioRows.join("")}
            </div>
          </div>

        </section>

        <div class="form-actions">
          <button class="btn" type="button" data-close-modal>Close</button>
        </div>
      </div>
    `;
  }

  function makeIntelligenceSummary({ analysis, expected, actual, possible, scoreConversion, luckRating, coreCentreText, outlierText, bestRealisticScenario, bestGain }) {
    const pattern = analysis.pattern;
    const scoreText = `${formatScoreNumber(actual)}${possible ? `/${formatScoreNumber(possible)}` : ""}`;
    const expectedText = formatScoreNumber(expected);
    const absGap = Math.abs(Math.round(Number(scoreConversion.gap) || 0));
    const luckIntro = makeLuckSentence(luckRating.label, scoreConversion.gap, absGap, scoreText, expectedText);
    const dnaPhrase = `Your core group centre was ${coreCentreText}, with a ${pattern.shape.label} pattern and ${outlierText}.`;
    const bestPhrase = bestRealisticScenario && Number.isFinite(bestGain)
      ? `The best realistic scenario was ${formatScoreNumber(bestRealisticScenario.result.expectedScore)}, a ${formatPositiveGap(bestGain)} lift over the actual-pattern forecast.`
      : "The best realistic scenario needs more plotted arrows.";
    return `${luckIntro} ${dnaPhrase} ${bestPhrase}`;
  }

  function makeLuckSentence(label, gap, absGap, actualScoreText, expectedScoreText) {
    const safeLabel = String(label || "neutral");
    if (gap > 0) {
      return `You were ${safeLabel}, exceeding the expected score by ${absGap} point${absGap === 1 ? "" : "s"}. Your actual score was ${actualScoreText}, compared with an expected score of ${expectedScoreText}.`;
    }
    if (gap < 0) {
      return `You were ${safeLabel}, falling below the expected score by ${absGap} point${absGap === 1 ? "" : "s"}. Your actual score was ${actualScoreText}, compared with an expected score of ${expectedScoreText}.`;
    }
    return `Your score-conversion luck was neutral. Your actual score was ${actualScoreText}, matching the expected score of ${expectedScoreText}.`;
  }

  function renderBestRealisticCard(bestScenario, actualScenario, actualScore, bestGain) {
    if (!bestScenario || !actualScenario) {
      return "";
    }
    return `
      <div class="intelligence-best-card">
        <div class="intelligence-best-copy">
          <span class="panel-eyebrow">Best possible round preview</span>
          <h5>${escapeHtml(bestScenario.label)}</h5>
          <p>${escapeHtml(bestScenario.description)} This is an improved scenario, not a guaranteed maximum.</p>
        </div>
        <div class="intelligence-best-stats">
          <div>
            <span>Expected</span>
            <strong>${formatScoreNumber(bestScenario.result.expectedScore)}</strong>
          </div>
          <div>
            <span>Gain vs model</span>
            <strong class="positive">${formatSignedScore(bestGain)}</strong>
          </div>
          <div>
            <span>Likely range</span>
            <strong>${formatScoreNumber(bestScenario.result.p10)}–${formatScoreNumber(bestScenario.result.p90)}</strong>
          </div>
        </div>
      </div>
    `;
  }

  function getLargestUpliftScenario(scenarios, actualScenario) {
    if (!actualScenario) return null;
    const baseExpected = actualScenario.result.expectedScore;
    return scenarios
      .filter(scenario => scenario.id !== "actual")
      .map(scenario => ({ scenario, gain: scenario.result.expectedScore - baseExpected }))
      .sort((a, b) => b.gain - a.gain)[0]?.scenario || null;
  }

  function renderPerformanceIntelligenceHelp() {
    return `
      <span class="intelligence-help-wrap">
        <button class="intelligence-help-button" type="button" aria-label="About Performance Intelligence">?</button>
        <span class="intelligence-help-popover" role="tooltip">
          <strong>How Performance Intelligence works</strong>
          <span>First, the app reads your actual plotted arrow positions from the selected scorecard. Manual score-only arrows still count in your real score, but they cannot shape the geometry model because they have no x/y impact point.</span>
          <span>It then builds your Shot Pattern DNA: group centre/MPI, bullseye offset, horizontal and vertical spread, group shape, group angle, 95% shot prediction ellipse, and major-outlier rate.</span>
          <span>That DNA feeds a Monte Carlo simulation. Monte Carlo means repeatedly testing thousands of random-but-realistic versions of the same pattern. In this app, each run generates 5,000 simulated scorecards as x/y impacts and scores every simulated arrow through the normal target scoring engine.</span>
          <span>The expected score is the average score produced by those simulated repeats. It is not a separate judgement of your skill; it is what this actual shot pattern usually converts into on the target face.</span>
          <span>Actual score versus expected score is therefore shown as score-conversion luck. The Luck Rating is the actual score's percentile rank inside the simulated score distribution: 50 is average conversion, above 50 means the full score converted better than the model average, and below 50 means it converted worse. It may loosely correlate with Ring Break Luck, but Ring Break Luck separately measures only close ring-boundary touches and near-misses.</span>
          <span>Forecast probabilities count how often the 5,000 simulated scorecards reached each target score. The what-if rows rerun the same simulator after controlled changes, such as re-centring the group, removing major outliers, or tightening vertical/horizontal spread.</span>
        </span>
      </span>
    `;
  }

  function getScoreConversionLuck(actualScore, forecast, possibleScore) {
    const actual = Math.round(Number(actualScore) || 0);
    const expected = Math.round(Number(forecast?.expectedScore) || 0);
    const possibleSuffix = possibleScore ? `/${formatScoreNumber(possibleScore)}` : "";
    const gap = actual - expected;
    const luckRating = getLuckRating(forecast);
    const scoreText = `${formatScoreNumber(actual)}${possibleSuffix}`;
    const gapText = formatPositiveGap(Math.abs(gap));

    if (gap > 0) {
      return {
        gap,
        label: luckRating,
        message: `Score-conversion luck: ${luckRating.label} (${gapText} above model average). Actual score ${scoreText}.`,
        shortMessage: `${gapText} above the model average.`
      };
    }
    if (gap < 0) {
      return {
        gap,
        label: luckRating,
        message: `Score-conversion luck: ${luckRating.label} (${gapText} below model average). Actual score ${scoreText}.`,
        shortMessage: `${gapText} below the model average.`
      };
    }
    return {
      gap,
      label: luckRating,
      message: `Score-conversion luck: neutral. Actual score matched the model average at ${scoreText}.`,
      shortMessage: `matched the model average.`
    };
  }

  function getLuckRating(forecast) {
    const raw = Number(forecast?.luckRating);
    const rating = Number.isFinite(raw) ? App.Geometry.clamp(raw, 0, 100) : 50;
    const display = String(Math.round(rating));
    const label = classifyLuckRating(rating);
    const visual = getLuckRatingVisual(rating);
    return {
      rating,
      display,
      label,
      visualClass: visual.className,
      visualStyle: visual.style,
      explanation: `Luck Rating is score-conversion luck: the actual score's percentile rank among this 5,000-run Monte Carlo batch. ${display}/100 means the actual score converted better than about ${display}% of simulated repeats of the same Shot Pattern DNA. It may loosely correlate with Ring Break Luck, but Ring Break Luck only measures close line touches and near-misses, while this rating considers the full simulated score distribution for the whole shot pattern.`
    };
  }

  function getLuckRatingVisual(rating) {
    const numeric = Number(rating);
    const value = App.Geometry.clamp(Number.isFinite(numeric) ? numeric : 50, 0, 100);
    const direction = value >= 50 ? 1 : -1;
    const distanceFromNeutral = Math.abs(value - 50) / 50;
    const intensity = Math.max(0, Math.min(1, distanceFromNeutral));
    const sideProgress = direction > 0 ? (value - 50) / 50 : (50 - value) / 50;
    const progress = Math.max(0, Math.min(1, sideProgress));

    let className = "luck-neutral";
    const luckyHue = 142;
    const unluckyHue = 354;
    const neutralHue = 171;
    const hue = direction > 0
      ? neutralHue + (luckyHue - neutralHue) * progress
      : neutralHue + (unluckyHue - neutralHue) * progress;
    const sat = direction > 0 ? 70 + progress * 12 : 70 + progress * 16;
    const glow = 0.10 + intensity * (direction > 0 ? 0.34 : 0.37);

    if (value > 50) {
      className = "luck-fortunate";
      if (value >= 60) className += " luck-tier-60";
      if (value >= 70) className += " luck-tier-70";
      if (value >= 80) className += " luck-tier-80 luck-strong";
      if (value >= 90) className += " luck-tier-90 luck-magical";
      if (value >= 95) className += " luck-tier-95 luck-prismatic luck-aura";
      if (value >= 98) className += " luck-tier-98 luck-mythic luck-sparkle";
      if (value >= 99) className += " luck-tier-99";
    } else if (value < 50) {
      className = "luck-unfortunate";
      if (value <= 40) className += " luck-tier-60";
      if (value <= 30) className += " luck-tier-70";
      if (value <= 20) className += " luck-tier-80 luck-strong";
      if (value <= 10) className += " luck-tier-90 luck-cursed";
      if (value <= 5) className += " luck-tier-95 luck-prismatic luck-aura";
      if (value <= 2) className += " luck-tier-98 luck-mythic luck-sparkle";
      if (value <= 1) className += " luck-tier-99";
    }

    return {
      className,
      style: [
        `--luck-rating: ${value.toFixed(2)}`,
        `--luck-hue: ${hue.toFixed(1)}`,
        `--luck-saturation: ${sat.toFixed(1)}%`,
        `--luck-intensity: ${intensity.toFixed(3)}`,
        `--luck-glow: ${glow.toFixed(3)}`,
        `--luck-edge: ${Math.max(0, (intensity - 0.36) / 0.64).toFixed(3)}`,
        `--luck-gleam: ${(0.08 + intensity * 0.92).toFixed(3)}`,
        `--luck-sparkle: ${Math.max(0, (intensity - 0.94) / 0.06).toFixed(3)}`
      ].join("; ")
    };
  }

  function classifyLuckRating(rating) {
    const numeric = Number(rating);
    const value = App.Geometry.clamp(Number.isFinite(numeric) ? numeric : 50, 0, 100);
    if (value >= 99) return "almost impossibly lucky";
    if (value >= 98) return "extraordinarily lucky";
    if (value >= 95) return "exceptionally lucky";
    if (value >= 90) return "extremely lucky";
    if (value >= 80) return "very lucky";
    if (value >= 70) return "lucky";
    if (value >= 60) return "slightly lucky";
    if (value >= 40) return "neutral";
    if (value >= 30) return "slightly unlucky";
    if (value >= 20) return "unlucky";
    if (value >= 10) return "very unlucky";
    if (value >= 5) return "extremely unlucky";
    if (value >= 2) return "exceptionally unlucky";
    if (value >= 1) return "extraordinarily unlucky";
    return "almost impossibly unlucky";
  }


  function renderExpectedScoreHelp() {
    return `
      <span class="expected-score-help-wrap luck-rating-help-wrap">
        <button class="expected-score-help-button luck-rating-help-button" type="button" aria-label="About expected score">?</button>
        <span class="expected-score-help-popover luck-rating-help-popover" role="tooltip">
          <strong>Expected score</strong>
          <span>The average score from the 5,000 Monte Carlo repeats of this same plotted shot pattern.</span>
          <span>It is not your predicted next score and it is not a skill grade. It shows what this exact Shot Pattern DNA usually converts into when replayed many times through the normal scoring engine.</span>
          <span>Actual score compared with expected score is what drives the broader Luck Rating.</span>
        </span>
      </span>
    `;
  }
  function renderLuckRatingHelp() {
    return `
      <span class="luck-rating-help-wrap">
        <button class="luck-rating-help-button" type="button" aria-label="About luck rating">?</button>
        <span class="luck-rating-help-popover" role="tooltip">
          <strong>Luck Rating</strong>
          <span>This is Monte Carlo score-conversion luck, not skill. It compares your real score with 5,000 simulated scorecards generated from the same Shot Pattern DNA.</span>
          <span>The number is percentile-based: 50/100 means your score converted around the middle of the simulation batch, 80/100 means it beat about 80% of simulated repeats, and 20/100 means it beat about 20%.</span>
          <span>It can loosely correlate with Ring Break Luck because close line-cutters and near-misses can move the real score above or below the model average.</span>
          <span>It is still different: Ring Break Luck only looks at arrows close to ring boundaries, while Luck Rating measures the whole score against the full simulated score distribution.</span>
        </span>
      </span>
    `;
  }

  function formatPositiveGap(value) {
    const numeric = Math.abs(Math.round(Number(value) || 0));
    return `+${numeric}`;
  }

  function renderIntelPill(label, value) {
    return `
      <span class="intelligence-pill">
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(value)}</small>
      </span>
    `;
  }

  function renderIntelMetric(label, value, subtext, extraClass = "", explanation = "") {
    return `
      <div class="intelligence-metric ${extraClass}" title="${escapeHtml(explanation || subtext || label)}">
        <span>${escapeHtml(label)}</span>
        <strong>${value}</strong>
        <small>${escapeHtml(subtext || "")}</small>
      </div>
    `;
  }

  function renderDnaItem(label, value, explanation = "") {
    return `
      <div class="intelligence-dna-item" title="${escapeHtml(explanation || label)}">
        <span>${escapeHtml(label)}</span>
        <strong>${value}</strong>
        ${explanation ? `<small>${escapeHtml(explanation)}</small>` : ""}
      </div>
    `;
  }

  function renderProbabilityRows(chances) {
    return (chances || []).map(chance => `
      <div class="intelligence-table-row" title="Chance that this session-level model reaches ${formatScoreNumber(chance.target)} or higher.">
        <span>Chance of ${formatScoreNumber(chance.target)}+</span>
        <strong>${formatPercent(chance.probability)}</strong>
      </div>
    `).join("");
  }

  function renderScenarioGuideItem(label, text) {
    return `
      <div class="intelligence-guide-item">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(text)}</span>
      </div>
    `;
  }

  function renderScenarioRow(scenario, actualScenario, largestUpliftScenario) {
    const baseExpected = actualScenario?.result?.expectedScore ?? scenario.result.expectedScore;
    const gain = scenario.result.expectedScore - baseExpected;
    const isFeatured = scenario.id === "combined-realistic";
    const isLargest = largestUpliftScenario && scenario.id === largestUpliftScenario.id && gain > 0.05;
    const rowClass = [isFeatured ? "is-featured" : "", isLargest ? "is-largest-uplift" : ""].filter(Boolean).join(" ");
    return `
      <div class="intelligence-scenario-row ${rowClass}" title="${escapeHtml(scenario.description)}">
        <span>
          <strong>${escapeHtml(scenario.label)}${isLargest ? `<em>Largest uplift</em>` : ""}</strong>
          <small>${escapeHtml(scenario.description)}</small>
        </span>
        <span>${formatScoreNumber(scenario.result.expectedScore)}</span>
        <span class="${gain >= 0.05 ? "positive" : gain <= -0.05 ? "negative" : ""}">${formatSignedScore(gain)}</span>
        <span>${formatScoreNumber(scenario.result.p10)}–${formatScoreNumber(scenario.result.p90)}</span>
      </div>
    `;
  }

  function formatScoreNumber(value) {
    if (!Number.isFinite(Number(value))) return "—";
    return String(Math.round(Number(value)));
  }

  function formatSignedScore(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    const rounded = Math.round(numeric);
    if (rounded === 0) return "±0";
    return `${rounded > 0 ? "+" : ""}${rounded}`;
  }

  function formatPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    return `${(numeric * 100).toFixed(2)}%`;
  }

  function openExportImageModal() {
    const state = App.State.getState();
    const scorecard = state.scorecard;
    if (!scorecard) {
      App.Toast.show("No scorecard to export", "danger");
      return;
    }
    const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
    const visibleText = state.viewport.visibleEndIndex === null ? "All ends" : `End ${state.viewport.visibleEndIndex + 1}`;
    const targetDarkeningStrengthPercent = 100;
    const body = `<div class="export-modal-copy">
      <p>Export clean PNG images using the active target face and current scoring rules.</p>
      <div class="export-option-panel">
        <strong>Export image appearance</strong>
        <label class="export-check">
          <input type="checkbox" name="darkenTarget" />
          <span>Darken target face</span>
        </label>
        <label class="viewport-fade-control export-target-visibility-control" for="exportTargetDarkeningStrengthRange" title="Choose how strongly the target face is darkened when darkening is enabled">
          <span>Strength</span>
          <input id="exportTargetDarkeningStrengthRange" type="range" name="targetDarkeningStrength" min="0" max="100" step="5" value="${targetDarkeningStrengthPercent}" disabled />
          <output id="exportTargetDarkeningStrengthValue" for="exportTargetDarkeningStrengthRange">${targetDarkeningStrengthPercent}%</output>
        </label>
        <label class="export-check">
          <input type="checkbox" name="showLabels" ${state.viewport.showArrowLabels ? "checked" : ""} />
          <span>Arrow labels</span>
        </label>
        <label class="export-check">
          <input type="checkbox" name="showRadial" ${state.viewport.showRadialGrouping ? "checked" : ""} />
          <span>Dispersion grouping ring</span>
        </label>
        <label class="export-check">
          <input type="checkbox" name="showSimple" ${state.viewport.showSimpleGrouping ? "checked" : ""} />
          <span>Enclosing grouping ring</span>
        </label>
        <label class="export-check">
          <input type="checkbox" name="includeScorecard" />
          <span>Scorecard table</span>
        </label>
        <label class="export-check">
          <input type="checkbox" name="zoomToGroup" />
          <span>Zoom to plotted group</span>
        </label>
      </div>
      <div class="export-choice-list export-choice-grid" aria-label="Export image type">
        <button class="export-choice export-choice-card" type="button" data-export-kind="full">
          <canvas class="export-choice-preview" data-export-preview="full" aria-hidden="true"></canvas>
          <strong>Standard</strong>
        </button>
        <button class="export-choice export-choice-card" type="button" data-export-kind="visible">
          <canvas class="export-choice-preview" data-export-preview="visible" aria-hidden="true"></canvas>
          <strong>Current view</strong>
        </button>
        <button class="export-choice export-choice-card" type="button" data-export-kind="end-colour">
          <canvas class="export-choice-preview" data-export-preview="end-colour" aria-hidden="true"></canvas>
          <strong>Aggregated Ends</strong>
        </button>
        <button class="export-choice export-choice-card" type="button" data-export-kind="sheet">
          <canvas class="export-choice-preview" data-export-preview="sheet" aria-hidden="true"></canvas>
          <strong>End sheet</strong>
        </button>
      </div>
      <div class="form-actions">
        <button class="btn" type="button" data-close-modal>Cancel</button>
      </div>
    </div>`;

    App.Modal.open("Export Image", body, modalBody => {
      const exportDarkeningStrengthRange = modalBody.querySelector("input[name='targetDarkeningStrength']");
      const exportDarkeningStrengthValue = modalBody.querySelector("#exportTargetDarkeningStrengthValue");
      const darkenTargetInput = modalBody.querySelector("input[name='darkenTarget']");
      const syncDarkenControls = () => updateDarkenTargetControl(exportDarkeningStrengthRange, darkenTargetInput);
      updateDarkeningStrengthControl(exportDarkeningStrengthRange, exportDarkeningStrengthValue, targetDarkeningStrengthPercent);
      syncDarkenControls();
      darkenTargetInput.addEventListener("change", syncDarkenControls);
      exportDarkeningStrengthRange.addEventListener("input", event => {
        updateDarkeningStrengthControl(exportDarkeningStrengthRange, exportDarkeningStrengthValue, Number(event.target.value) || 0);
      });
      modalBody.querySelector("[data-close-modal]").addEventListener("click", App.Modal.close);
      renderExportChoicePreviews(modalBody, scorecard, targetFace, state.viewport.visibleEndIndex);
      modalBody.querySelectorAll("[data-export-kind]").forEach(button => {
        button.addEventListener("click", () => {
          const kind = button.dataset.exportKind;
          const exportOptions = readExportOptions(modalBody);
          App.Modal.close();
          window.requestAnimationFrame(() => {
            if (kind === "visible") {
              App.ExportRenderer.exportVisibleTarget(scorecard, targetFace, state.viewport.visibleEndIndex, exportOptions);
            } else if (kind === "full") {
              App.ExportRenderer.exportFullScorecardTarget(scorecard, targetFace, exportOptions);
            } else if (kind === "end-colour") {
              App.ExportRenderer.exportEndColourTarget(scorecard, targetFace, exportOptions);
            } else if (kind === "sheet") {
              App.ExportRenderer.exportEndSheet(scorecard, targetFace, exportOptions);
            }
          });
        });
      });
    });
  }


  const EXPORT_PREVIEW_END_COLOURS = [
    "#55d6be",
    "#ff7a90",
    "#7ab7ff",
    "#ffd166",
    "#b98cff",
    "#7ee787",
    "#ff9f43",
    "#f472d0",
    "#22d3ee",
    "#c4f25f",
    "#ff6b6b",
    "#a78bfa"
  ];

  function renderExportChoicePreviews(modalBody, scorecard, targetFace, visibleEndIndex) {
    const canvases = Array.from(modalBody.querySelectorAll(".export-choice-preview"));
    const render = () => canvases.forEach(canvas => drawExportChoicePreview(canvas, canvas.dataset.exportPreview, scorecard, targetFace, visibleEndIndex));
    window.requestAnimationFrame(render);
  }

  function drawExportChoicePreview(canvas, kind, scorecard, targetFace, visibleEndIndex) {
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const width = Math.max(160, Math.round(rect?.width || canvas.clientWidth || 260));
    const height = Math.max(118, Math.round(rect?.height || canvas.clientHeight || 150));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.__archeryExportRect = { width, height, left: 0, top: 0 };

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(dpr, dpr);
    drawExportPreviewBackground(ctx, width, height);

    if (kind === "sheet") {
      drawExportSheetPreview(ctx, canvas, width, height, scorecard, targetFace);
    } else {
      drawExportTargetPreview(ctx, canvas, width, height, scorecard, targetFace, {
        visibleEndIndex: kind === "visible" ? visibleEndIndex : null,
        colourByEnd: kind === "end-colour",
        compactTarget: kind === "visible" && visibleEndIndex !== null
      });
    }

    ctx.restore();
    delete canvas.__archeryExportRect;
  }

  function drawExportPreviewBackground(ctx, width, height) {
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.42, 8, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
    gradient.addColorStop(0, "rgba(37, 76, 93, 0.38)");
    gradient.addColorStop(1, "rgba(3, 10, 17, 0.96)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let x = -height; x < width + height; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }
  }

  function drawExportTargetPreview(ctx, canvas, width, height, scorecard, targetFace, options = {}) {
    const targetDiameterMm = Math.max(1, Number(targetFace?.diameterMm) || 1);
    const targetScale = options.compactTarget ? 0.74 : 0.68;
    const pxPerMm = Math.min(width, height) * targetScale / targetDiameterMm;
    const transform = makePreviewTransform(pxPerMm, 0, -height * 0.01);

    App.TargetRenderer.drawTarget(ctx, canvas, transform, targetFace, { visibility: 0.98 });

    const entries = collectExportPreviewEntries(scorecard, options.visibleEndIndex);
    drawPreviewArrowEntries(ctx, canvas, transform, entries, {
      colourByEnd: options.colourByEnd,
      maxEntries: 96
    });

    if (options.colourByEnd && entries.length) {
      drawPreviewEndLegend(ctx, width, height, scorecard.ends.length);
    }
  }

  function drawExportSheetPreview(ctx, canvas, width, height, scorecard, targetFace) {
    const endCount = scorecard.ends.length;
    if (!endCount) return;

    const columns = chooseExportPreviewColumns(endCount);
    const rows = Math.ceil(endCount / columns);
    const gap = Math.max(4, Math.min(width, height) * 0.035);
    const padding = Math.max(8, Math.min(width, height) * 0.06);
    const usableWidth = width - padding * 2 - gap * (columns - 1);
    const usableHeight = height - padding * 2 - gap * (rows - 1);
    const cellWidth = usableWidth / columns;
    const cellHeight = usableHeight / rows;

    scorecard.ends.forEach((end, endIndex) => {
      const col = endIndex % columns;
      const row = Math.floor(endIndex / columns);
      const x = padding + col * (cellWidth + gap);
      const y = padding + row * (cellHeight + gap);
      drawPreviewEndTile(ctx, canvas, x, y, cellWidth, cellHeight, scorecard, targetFace, endIndex);
    });
  }

  function drawPreviewEndTile(ctx, canvas, x, y, width, height, scorecard, targetFace, endIndex) {
    const radius = Math.min(12, width * 0.12, height * 0.12);
    ctx.save();
    ctx.beginPath();
    roundPreviewRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(85, 214, 190, 0.22)";
    ctx.stroke();
    ctx.clip();

    const targetDiameterMm = Math.max(1, Number(targetFace?.diameterMm) || 1);
    const pxPerMm = Math.min(width, height) * 0.68 / targetDiameterMm;
    const centreX = x + width / 2;
    const centreY = y + height / 2 + height * 0.03;
    const transform = makePreviewTransform(pxPerMm, centreX - canvas.__archeryExportRect.width / 2, centreY - canvas.__archeryExportRect.height / 2);
    App.TargetRenderer.drawTarget(ctx, canvas, transform, targetFace, { visibility: 0.95 });

    const entries = collectExportPreviewEntries(scorecard, endIndex);
    drawPreviewArrowEntries(ctx, canvas, transform, entries, {
      colourByEnd: true,
      maxEntries: 12,
      forceColour: getExportPreviewEndColour(endIndex),
      markerScale: 0.78
    });
    ctx.restore();
  }

  function drawPreviewArrowEntries(ctx, canvas, transform, entries, options = {}) {
    const limited = entries.slice(0, Math.max(0, options.maxEntries || entries.length));
    limited.forEach(entry => {
      if (!entry.arrow?.position) return;
      const screen = App.ViewportMath.worldToScreen(entry.arrow.position, canvas, transform);
      const radius = App.Geometry.clamp((options.markerScale || 1) * (2.8 + transform.currentPxPerMm * 1.1), 2.3, 5.8);
      const fill = options.forceColour || (options.colourByEnd ? getExportPreviewEndColour(entry.endIndex) : "rgba(238, 247, 255, 0.96)");

      ctx.save();
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius + 1.9, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(4, 12, 20, 0.92)";
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawPreviewEndLegend(ctx, width, height, endCount) {
    const count = Math.min(endCount, 8);
    const dotSize = 5;
    const gap = 5;
    const totalWidth = count * dotSize + (count - 1) * gap;
    let x = width - totalWidth - 12;
    const y = height - 12;

    for (let index = 0; index < count; index += 1) {
      ctx.beginPath();
      ctx.arc(x + dotSize / 2, y, dotSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = getExportPreviewEndColour(index);
      ctx.fill();
      x += dotSize + gap;
    }
  }

  function collectExportPreviewEntries(scorecard, visibleEndIndex = null) {
    return App.ArrowRenderer.getVisibleArrowEntries(scorecard, visibleEndIndex).filter(entry => Boolean(entry.arrow?.position));
  }

  function chooseExportPreviewColumns(endCount) {
    return Math.max(1, Math.ceil(Math.sqrt(Math.max(1, endCount))));
  }

  function makePreviewTransform(pxPerMm, panX = 0, panY = 0) {
    return {
      currentPxPerMm: pxPerMm,
      currentPanX: panX,
      currentPanY: panY,
      targetPxPerMm: pxPerMm,
      targetPanX: panX,
      targetPanY: panY
    };
  }

  function getExportPreviewEndColour(endIndex) {
    return EXPORT_PREVIEW_END_COLOURS[endIndex % EXPORT_PREVIEW_END_COLOURS.length];
  }

  function roundPreviewRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }


  function readExportOptions(modalBody) {
    const darkeningStrengthPercent = Number(modalBody.querySelector("input[name='targetDarkeningStrength']")?.value) || 0;
    const darkenTarget = Boolean(modalBody.querySelector("input[name='darkenTarget']")?.checked);
    return {
      showArrowLabels: Boolean(modalBody.querySelector("input[name='showLabels']")?.checked),
      showRadialGrouping: Boolean(modalBody.querySelector("input[name='showRadial']")?.checked),
      showSimpleGrouping: Boolean(modalBody.querySelector("input[name='showSimple']")?.checked),
      includeScorecard: Boolean(modalBody.querySelector("input[name='includeScorecard']")?.checked),
      zoomToGroup: Boolean(modalBody.querySelector("input[name='zoomToGroup']")?.checked),
      darkenTarget,
      targetDarkeningStrength: darkenTarget ? App.Geometry.clamp(darkeningStrengthPercent, 0, 100) : 0
    };
  }

  function updateDarkenTargetControl(range, checkbox) {
    if (!range || !checkbox) return;
    range.disabled = !checkbox.checked;
    const control = range.closest(".export-target-visibility-control");
    if (control) control.classList.toggle("is-disabled", !checkbox.checked);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
