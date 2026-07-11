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
      renderIntelligenceAvailability(state, openIntelligenceBtn);
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

  function renderIntelligenceAvailability(state, button) {
    if (!button || !App.SessionIntelligence?.getEligibility) return;
    const eligibility = App.SessionIntelligence.getEligibility(state?.scorecard);
    button.disabled = !eligibility.eligible;
    button.title = eligibility.eligible ? "Open Performance Intelligence" : eligibility.reason;
    button.setAttribute("aria-label", button.title);
  }


  function openIntelligenceModal() {
    const state = App.State.getState();
    const scorecard = state.scorecard;
    const eligibility = App.SessionIntelligence.getEligibility(scorecard);
    if (!eligibility.eligible) {
      App.Toast.show(eligibility.reason, "danger");
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
        const latestEligibility = App.SessionIntelligence.getEligibility(latestScorecard);
        if (!latestEligibility.eligible) {
          App.Modal.close();
          App.Toast.show(latestEligibility.reason, "danger");
          return;
        }

        const targetFace = App.TargetFaces.getTargetFace(latestScorecard.activeViewTargetFaceId);
        const analysis = App.SessionIntelligence.analyse(latestScorecard, targetFace, {
          viewport: latestState.viewport,
          simulationCount: 5000
        });

        if (analysis.status !== "ok") {
          App.Modal.close();
          App.Toast.show(analysis.eligibility?.reason || "Performance Intelligence is unavailable for this scorecard.", "danger");
          return;
        }

        App.Modal.open("Performance Intelligence", renderIntelligenceModal(analysis), bindIntelligenceModalActions);
      }, 25);
    });
  }

  function bindIntelligenceModalActions(modalBody) {
    attachIntelligenceHeaderHelp();
    modalBody.querySelector("[data-close-modal]")?.addEventListener("click", App.Modal.close);
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
    const scoreConversion = getScoreConversionLuck(actual, forecast, possible);
    const actualScoreText = `${formatScoreNumber(actual)}${possible ? ` / ${formatScoreNumber(possible)}` : ""}`;
    const luckRating = getLuckRating(forecast);
    const actualScenario = analysis.scenarios.find(scenario => scenario.id === "actual");
    const combinedScenario = analysis.scenarios.find(scenario => scenario.id === "combined-realistic");
    const tableScenarios = analysis.scenarios.filter(scenario => scenario.id !== "combined-realistic");
    const largestUpliftScenario = getLargestUpliftScenario(tableScenarios, actualScenario);
    const scenarioRows = tableScenarios.map(scenario => renderScenarioRow(scenario, actualScenario, largestUpliftScenario));
    const probabilityRows = renderProbabilityRows(forecast.chances, analysis.simulationCount);
    const ellipse95 = pattern.confidenceEllipses.find(ellipse => ellipse.level === 95) || pattern.confidenceEllipses[pattern.confidenceEllipses.length - 1];
    const coreCentre = pattern.coreCentre || (pattern.coreFit ? { xMm: pattern.coreFit.meanX, yMm: pattern.coreFit.meanY } : pattern.groupCentre);
    const coreCentreText = capitaliseFirst(App.SessionIntelligence.formatDirection(coreCentre));
    const coreOffset = Number(pattern.coreOffsetDistanceMm);
    const combinedChange = combinedScenario && actualScenario
      ? combinedScenario.result.expectedScore - actualScenario.result.expectedScore
      : null;
    const opportunity = makeIntelligenceOpportunity(largestUpliftScenario, actualScenario);
    const contextPills = renderIntelligenceContextPills(analysis);

    return `
      <div class="intelligence-modal intelligence-modal-v2 intelligence-modal-v3">
        <section class="intelligence-hero intelligence-hero-v2 intelligence-overview-hero">
          <div class="intelligence-hero-copy">
            <div class="intelligence-title-row">
              <span class="panel-eyebrow">Performance Intelligence · Complete plotted scorecard</span>
            </div>
            <h3>${escapeHtml(analysis.scorecard.name || "Untitled Scorecard")}</h3>
            <p>${escapeHtml(analysis.targetFace.shortName || analysis.targetFace.name)} · ${analysis.forecastArrowCount} plotted arrows · ${analysis.simulationCount.toLocaleString()} Monte Carlo runs</p>
            <div class="intelligence-hero-pills" aria-label="Analysis context">${contextPills}</div>
          </div>
          <div class="intelligence-overview-grid">
            <div class="intelligence-overview-metric">
              <span>Actual score</span>
              <strong>${actualScoreText}</strong>
              <small>Recorded result</small>
            </div>
            <div class="intelligence-overview-metric">
              <span class="expected-score-heading">Expected score ${renderExpectedScoreHelp()}</span>
              <strong>${formatScoreDetail(forecast.expectedScore)}</strong>
              <small>Monte Carlo mean</small>
            </div>
            <div class="intelligence-overview-metric">
              <span>Likely range</span>
              <strong>${formatScoreNumber(forecast.p10)}–${formatScoreNumber(forecast.p90)}</strong>
              <small>10th–90th percentile</small>
            </div>
            <div class="intelligence-hero-score intelligence-hero-luck ${escapeHtml(luckRating.visualClass)}" style="${escapeHtml(luckRating.visualStyle)}" data-luck-rating="${escapeHtml(luckRating.display)}" aria-label="${escapeHtml(luckRating.explanation)}">
              <span class="luck-rating-heading">Luck Rating ${renderLuckRatingHelp()}</span>
              <strong>${luckRating.display}</strong>
              <small>${escapeHtml(capitaliseFirst(luckRating.label))}</small>
            </div>
          </div>
        </section>

        <section class="intelligence-takeaway-strip is-two-up" aria-label="Key takeaways">
          ${renderIntelligenceTakeaway("Score conversion", `${capitaliseFirst(luckRating.label)}; ${capitaliseFirst(scoreConversion.shortMessage)}`)}
          ${renderIntelligenceTakeaway("Main opportunity", opportunity)}
        </section>

        ${renderSessionProgression(analysis.progression, analysis.targetFace)}

        <section class="intelligence-section intelligence-dna-section">
          <div class="intelligence-section-title">
            <div>
              <span class="panel-eyebrow">3. Shot Pattern DNA</span>
              <h4>The geometry behind the forecast</h4>
            </div>
            <p>The core group model describes where the normal pattern was centred, how it was shaped, and how widely it varied.</p>
          </div>
          ${analysis.modelStability?.material ? `<div class="intelligence-model-warning"><strong>Changing group pattern</strong><span>${escapeHtml(analysis.modelStability.message)}</span></div>` : ""}
          <div class="intelligence-dna-grid intelligence-dna-grid-v2 intelligence-dna-grid-standalone">
            ${renderDnaItem("Core MPI", escapeHtml(coreCentreText), "The centre of the normal/core plotted group.", "centre")}
            ${renderDnaItem("Core offset", formatMm(coreOffset), "Distance from the bullseye to the same core group centre shown as MPI.", "offset")}
            ${renderDnaItem("Shape", escapeHtml(capitaliseFirst(pattern.shape.label)), "Whether the fitted core group is round, vertical, horizontal, or diagonal.", "shape")}
            ${renderDnaItem("Core width (2σ)", formatMm(pattern.horizontalSpreadMm), "Two standard deviations of the core model from left to right. This is a model width, not the observed max-to-min spread.", "width")}
            ${renderDnaItem("Core height (2σ)", formatMm(pattern.verticalSpreadMm), "Two standard deviations of the core model from high to low. This is a model height, not the observed max-to-min spread.", "height")}
            ${renderDnaItem("Major outliers", String(pattern.outliers.majorCount), "Geometric outliers far outside the normal group shape.", "outliers")}
            ${renderDnaItem("95% prediction ellipse", ellipse95 ? `${formatMm(ellipse95.majorRadiusMm * 2)} × ${formatMm(ellipse95.minorRadiusMm * 2)}` : "—", "The fitted oval expected to contain about 95% of normal/core arrows.", "ellipse")}
            ${renderDnaItem("Group angle", Number.isFinite(pattern.shape.angleDeg) ? `${pattern.shape.angleDeg.toFixed(0)}°` : "—", "The direction of the fitted ellipse's long axis.", "angle")}
          </div>
        </section>

        <section class="intelligence-section intelligence-whatif-section">
          <div class="intelligence-section-title">
            <div>
              <span class="panel-eyebrow">4. Improvement forecast</span>
              <h4>How controlled pattern changes affect the score</h4>
            </div>
            <p>Paired Monte Carlo comparisons isolate how controlled geometric pattern changes affect the expected score.</p>
          </div>

          ${renderImprovedPatternCard(combinedScenario, actualScenario, combinedChange)}
          <div class="intelligence-panel intelligence-scenarios">
            <div class="intelligence-section-head">
              <span>Scenario comparison</span>
              <small>Paired Monte Carlo pattern comparisons.</small>
            </div>
            <div class="intelligence-scenario-table">
              <div class="intelligence-scenario-row intelligence-scenario-head">
                <span>Scenario</span>
                <span>Expected</span>
                <span>Change</span>
                <span>Likely range</span>
              </div>
              ${scenarioRows.join("")}
            </div>
          </div>
        </section>

        <details class="intelligence-section intelligence-probability-details" open>
          <summary>
            <span><small class="panel-eyebrow">5. Score probabilities</small><strong>Chances of reaching selected scores</strong></span>
            <small>Secondary forecast detail</small>
          </summary>
          <div class="intelligence-panel intelligence-probability-panel">
            <p class="intelligence-panel-intro">Each percentage is the share of simulated scorecards that reached the target or higher.</p>
            <div class="intelligence-table">
              ${probabilityRows || `<div class="intelligence-empty">No higher target scores fit inside this scorecard's possible total.</div>`}
            </div>
          </div>
        </details>

        <div class="form-actions">
          <button class="btn" type="button" data-close-modal>Close</button>
        </div>
      </div>
    `;
  }

  function renderIntelligenceContextPills(analysis) {
    const pills = [
      renderIntelPill(analysis.pattern.reliability.label, `${analysis.recordedBreakdown.plotted} plotted arrows`)
    ];
    const originalId = analysis.scorecard?.originalTargetFaceId || analysis.scorecard?.targetFaceId;
    const activeId = analysis.scorecard?.activeViewTargetFaceId || originalId;
    if (originalId && activeId && originalId !== activeId) pills.push(renderIntelPill("Target Swap active", analysis.targetFace.shortName || analysis.targetFace.name));
    if (analysis.scoringOptions?.extrapolation) pills.push(renderIntelPill("Extrapolated", App.Extrapolation.formatDistance(analysis.scoringOptions.extrapolation.targetDistanceM)));
    if (analysis.modelStability?.material) pills.push(renderIntelPill("Changing group", `${formatMm(analysis.modelStability.shiftMm)} shift`));
    return pills.join("");
  }

  function renderIntelligenceTakeaway(label, text) {
    return `<div class="intelligence-takeaway"><span>${escapeHtml(label)}</span><strong>${escapeHtml(text || "—")}</strong></div>`;
  }

  function makeIntelligenceOpportunity(scenario, actualScenario) {
    if (!scenario || !actualScenario) return "No improvement comparison is available.";
    const change = scenario.result.expectedScore - actualScenario.result.expectedScore;
    if (roundToDecimals(change, 2) <= 0) return "No controlled adjustment produced a clear positive uplift for this pattern.";
    return `${scenario.label} produced the largest isolated uplift: ${formatSignedScoreDetail(change)} expected points.`;
  }

  function renderSessionProgression(progression, targetFace) {
    if (!progression || progression.status !== "ok") {
      const requirement = progression?.requirement || "Progression analysis needs a complete plotted scorecard.";
      const current = `${Number(progression?.recordedArrowCount) || 0} recorded arrows · ${Number(progression?.plottedArrowCount) || 0} plotted`;
      return `
        <section class="progression-scope-group progression-scope-session">
          <div class="progression-scope-heading">
            <div>
              <span class="panel-eyebrow">1. Session performance</span>
              <h5>How scoring changed from end to end</h5>
            </div>
          </div>
          <div class="intelligence-progression-empty">
            <strong>Insufficient data</strong>
            <span>${escapeHtml(requirement)}</span>
            <small>${escapeHtml(current)}</small>
          </div>
        </section>
      `;
    }

    const session = progression.session || {};
    const inEnd = progression.inEnd || {};
    const sessionSummary = session.summary || {};
    const inEndFinding = inEnd.finding || {};
    const phases = session.phases || [];

    return `
      <section class="progression-scope-group progression-scope-session">
        <div class="progression-scope-heading">
          <div>
            <span class="panel-eyebrow">1. Session performance</span>
            <h5>How scoring changed from end to end</h5>
          </div>
          <small>${session.endSeries?.length || 0} completed ends</small>
        </div>

        <div class="intelligence-progression-charts">
          ${renderProgressionArrowChart(session.arrowSeries || [], {
            title: "Running projected score",
            valueKey: "expectedFinalScore",
            valueLabel: "projected score",
            formatValue: value => formatScoreNumber(value),
            formatTooltipValue: value => formatScoreDetail(value),
            className: "is-score"
          })}
        </div>

        <div class="intelligence-progression-subsection progression-bar-subsection">
          <div class="intelligence-section-head">
            <span>Average score by end</span>
            <small>Actual average arrow for every completed end.</small>
          </div>
          <div class="progression-bar-panel is-session-analysis">
            ${renderEndPerformanceBars(session.endSeries || [], targetFace)}
          </div>
          ${renderEmbeddedNormalisationScenario(session.normalisationScenario, "session")}
        </div>

        <div class="intelligence-progression-subsection">
          <div class="intelligence-section-head">
            <span>Session thirds</span>
            <small>Early, middle, and late sections, split on whole-end boundaries.</small>
          </div>
          <div class="intelligence-progression-phases is-flip-grid">
            ${phases.map(phase => renderProgressionFlipCard(phase, targetFace, "session")).join("")}
          </div>
        </div>

        ${renderProgressionAnalysisBox(buildEndPatternAnalysis(session), "session", sessionSummary.label)}
      </section>

      <div class="progression-scope-divider" aria-hidden="true"><span></span></div>

      <section class="progression-scope-group progression-scope-inend">
        <div class="progression-scope-heading">
          <div>
            <span class="panel-eyebrow">2. Within-end performance</span>
            <h5>How scoring changed from arrow to arrow</h5>
          </div>
          <small>${inEnd.eligibleEndCount || 0} comparable ends</small>
        </div>

        <div class="intelligence-progression-subsection progression-bar-subsection">
          <div class="intelligence-section-head">
            <span>Average score by arrow position</span>
            <small>Repeated position averages across comparable ends.</small>
          </div>
          <div class="progression-bar-panel is-inend-analysis">
            ${renderInEndPositionBars(inEnd.positions || [], targetFace)}
          </div>
          ${renderEmbeddedNormalisationScenario(inEnd.normalisationScenario, "in-end")}
        </div>

        <div class="intelligence-progression-subsection">
          <div class="intelligence-section-head">
            <span>Within-end thirds</span>
            <small>Early, middle, and late arrow positions inside each end.</small>
          </div>
          <div class="intelligence-progression-phases is-flip-grid inend-phase-card-grid">
            ${(inEnd.phases || []).map(phase => renderProgressionFlipCard(phase, targetFace, "in-end")).join("")}
          </div>
        </div>

        ${renderProgressionAnalysisBox(buildInEndArrowAnalysis(inEnd), "in-end", inEndFinding.label)}
      </section>
    `;
  }

  function renderProgressionFlipCard(phase, targetFace, scope) {
    const safeScope = String(scope || "progression").replace(/[^a-z0-9_-]/gi, "-");
    const safeId = String(phase.id || phase.label || "phase").replace(/[^a-z0-9_-]/gi, "-");
    const inputId = `progression-card-${safeScope}-${safeId}`;
    const centreText = phase.centre ? capitaliseFirst(App.SessionIntelligence.formatDirection(phase.centre)) : "—";
    const countText = phase.rangeText || `${phase.arrowCount} recorded arrows`;
    const plottedNote = phase.plottedArrowCount === phase.arrowCount
      ? `${phase.plottedArrowCount} plotted`
      : `${phase.plottedArrowCount}/${phase.arrowCount} plotted`;
    return `
      <article class="intelligence-progression-phase is-${escapeHtml(phase.id || "phase")} has-flip">
        <input class="progression-card-toggle" type="checkbox" id="${escapeHtml(inputId)}" aria-label="Toggle target view for ${escapeHtml(phase.label)}">
        <div class="intelligence-progression-phase-head">
          <div>
            <span>${escapeHtml(phase.label)}</span>
            <small>${escapeHtml(countText)}</small>
          </div>
          <label class="progression-card-toggle-label" for="${escapeHtml(inputId)}" title="Toggle target view" aria-label="Toggle target view">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7.5"></circle>
              <circle cx="12" cy="12" r="3.25"></circle>
              <path d="M12 1.75v3M12 19.25v3M1.75 12h3M19.25 12h3"></path>
            </svg>
          </label>
        </div>
        <div class="progression-card-flip-shell">
          <div class="progression-card-flip-inner">
            <div class="progression-card-face progression-card-front">
              <div class="intelligence-progression-phase-score">
                <strong>${formatAverageArrow(phase.actualAverageArrow)}</strong>
                <span>Average arrow</span>
                <small>${formatScoreNumber(phase.actualScore)} points · ${phase.arrowCount} arrows · ${escapeHtml(plottedNote)}</small>
              </div>
              <div class="intelligence-progression-phase-metrics">
                <div><span>Avg centre</span><strong>${formatMm(phase.averageDistanceMm)}</strong></div>
                <div><span>Observed spread</span><strong>${formatSpreadPair(phase.horizontalSpreadMm, phase.verticalSpreadMm)}</strong></div>
                <div><span>MPI</span><strong>${escapeHtml(centreText)}</strong></div>
                <div><span>Major outliers</span><strong>${phase.majorOutlierCount}</strong></div>
              </div>
            </div>
            <div class="progression-card-face progression-card-back">
              ${renderProgressionTargetVisual(phase, targetFace)}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderProgressionTargetVisual(phase, targetFace) {
    const entries = Array.isArray(phase.entries) ? phase.entries.filter(entry => entry.position) : [];
    const targetRadius = Math.max(1, Number(targetFace?.diameterMm) / 2 || Math.max(...((targetFace?.zones || []).map(zone => Number(zone.radiusMm) || 0)), 1));
    const groupingEntries = entries.map(entry => ({ point: { xMm: Number(entry.position.xMm) || 0, yMm: Number(entry.position.yMm) || 0 } }));
    const dispersion = groupingEntries.length && App.GroupingRenderer
      ? App.GroupingRenderer.calculateRadialGroupStats(groupingEntries)
      : null;
    const ellipse = dispersion?.analysis?.confidenceEllipse || null;
    const bounds = getProgressionTargetBounds(entries, targetRadius, dispersion, ellipse);
    const zones = (targetFace?.zones || []).slice().sort((a, b) => Number(b.radiusMm) - Number(a.radiusMm));
    const rings = zones.map(zone => `<circle class="mini-target-ring" cx="0" cy="0" r="${numAttr(zone.radiusMm)}" fill="${escapeHtml(zone.fill || "transparent")}" stroke="${escapeHtml(zone.stroke || "rgba(0,0,0,.45)")}" stroke-width="${numAttr(Math.max(0.7, Number(zone.strokeWidthMm) || 0.9))}"/>`).join("");
    const overlayMarkup = dispersion && entries.length >= 2 ? `
      <circle class="mini-target-dispersion-circle" cx="${numAttr(dispersion.circle.center.xMm)}" cy="${numAttr(dispersion.circle.center.yMm)}" r="${numAttr(dispersion.circle.radiusMm)}"/>
      ${ellipse ? `<ellipse class="mini-target-dispersion-ellipse" cx="${numAttr(ellipse.center.xMm)}" cy="${numAttr(ellipse.center.yMm)}" rx="${numAttr(ellipse.radiusXMm)}" ry="${numAttr(ellipse.radiusYMm)}" transform="rotate(${numAttr(ellipse.rotationRad * 180 / Math.PI)} ${numAttr(ellipse.center.xMm)} ${numAttr(ellipse.center.yMm)})"/>` : ""}
      <circle class="mini-target-dispersion-centre" cx="${numAttr(dispersion.circle.center.xMm)}" cy="${numAttr(dispersion.circle.center.yMm)}" r="${numAttr(Math.max(bounds.span * 0.008, targetRadius * 0.012))}"/>
    ` : "";
    const arrowRadius = Math.max(bounds.span * 0.009, targetRadius * 0.014);
    const arrows = entries.map((entry, index) => {
      const scoreLabel = entry.score?.label || String(entry.score?.value ?? "");
      return `<circle class="mini-target-arrow" cx="${numAttr(entry.position.xMm)}" cy="${numAttr(entry.position.yMm)}" r="${numAttr(arrowRadius)}"><title>Arrow ${index + 1}: ${escapeHtml(scoreLabel)}</title></circle>`;
    }).join("");
    const gradientId = `mini-target-scrim-${String(phase.label || phase.id || "phase").replace(/[^a-z0-9_-]/gi, "-")}-${phase.arrowCount || entries.length}-${Math.abs(Math.round(bounds.centreX + bounds.centreY + bounds.span))}`;

    return `
      <figure class="progression-mini-target-wrap">
        <svg class="progression-mini-target" viewBox="${numAttr(bounds.centreX - bounds.span / 2)} ${numAttr(bounds.centreY - bounds.span / 2)} ${numAttr(bounds.span)} ${numAttr(bounds.span)}" role="img" aria-label="${escapeHtml(phase.label)} plotted arrows with dispersion overlay">
          <defs>
            <radialGradient id="${escapeHtml(gradientId)}" cx="50%" cy="46%" r="72%">
              <stop offset="0%" stop-color="#050e17" stop-opacity="0.18"></stop>
              <stop offset="100%" stop-color="#000000" stop-opacity="0.52"></stop>
            </radialGradient>
          </defs>
          <rect x="${numAttr(bounds.centreX - bounds.span / 2)}" y="${numAttr(bounds.centreY - bounds.span / 2)}" width="${numAttr(bounds.span)}" height="${numAttr(bounds.span)}" class="mini-target-bg"/>
          <g class="mini-target-rings is-dimmed">${rings}</g>
          <line class="mini-target-crosshair" x1="${numAttr(-targetRadius)}" y1="0" x2="${numAttr(targetRadius)}" y2="0"/>
          <line class="mini-target-crosshair" x1="0" y1="${numAttr(-targetRadius)}" x2="0" y2="${numAttr(targetRadius)}"/>
          <rect x="${numAttr(bounds.centreX - bounds.span / 2)}" y="${numAttr(bounds.centreY - bounds.span / 2)}" width="${numAttr(bounds.span)}" height="${numAttr(bounds.span)}" fill="url(#${escapeHtml(gradientId)})" class="mini-target-focus-scrim"/>
          ${overlayMarkup}
          ${arrows}
          <circle class="mini-target-centre-dot" cx="0" cy="0" r="${numAttr(Math.max(bounds.span * 0.0055, targetRadius * 0.008))}"/>
        </svg>
        <figcaption>${entries.length ? `${entries.length} plotted · dispersion` : "No plotted arrows"}</figcaption>
      </figure>
    `;
  }

  function getProgressionTargetBounds(entries, targetRadius, dispersion, ellipse) {
    let minX = -targetRadius;
    let maxX = targetRadius;
    let minY = -targetRadius;
    let maxY = targetRadius;
    (entries || []).forEach(entry => {
      const x = Number(entry.position?.xMm) || 0;
      const y = Number(entry.position?.yMm) || 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    if (dispersion?.circle) {
      const cx = Number(dispersion.circle.center?.xMm) || 0;
      const cy = Number(dispersion.circle.center?.yMm) || 0;
      const r = Math.max(0, Number(dispersion.circle.radiusMm) || 0);
      minX = Math.min(minX, cx - r);
      maxX = Math.max(maxX, cx + r);
      minY = Math.min(minY, cy - r);
      maxY = Math.max(maxY, cy + r);
    }
    if (ellipse) {
      const rx = Math.max(0, Number(ellipse.radiusXMm) || 0);
      const ry = Math.max(0, Number(ellipse.radiusYMm) || 0);
      const rotation = Number(ellipse.rotationRad) || 0;
      const extentX = Math.sqrt(Math.pow(rx * Math.cos(rotation), 2) + Math.pow(ry * Math.sin(rotation), 2));
      const extentY = Math.sqrt(Math.pow(rx * Math.sin(rotation), 2) + Math.pow(ry * Math.cos(rotation), 2));
      const cx = Number(ellipse.center?.xMm) || 0;
      const cy = Number(ellipse.center?.yMm) || 0;
      minX = Math.min(minX, cx - extentX);
      maxX = Math.max(maxX, cx + extentX);
      minY = Math.min(minY, cy - extentY);
      maxY = Math.max(maxY, cy + extentY);
    }
    const rawWidth = Math.max(1, maxX - minX);
    const rawHeight = Math.max(1, maxY - minY);
    const span = Math.max(rawWidth, rawHeight) * 1.12;
    return {
      centreX: (minX + maxX) / 2,
      centreY: (minY + maxY) / 2,
      span
    };
  }

  function renderProgressionArrowChart(series, options) {
    const items = (series || []).filter(item => Number.isFinite(Number(item?.[options.valueKey])));
    if (!items.length) return `<div class="intelligence-progression-chart intelligence-empty">No recorded arrow data.</div>`;

    const width = 760;
    const height = 236;
    const left = 64;
    const right = 22;
    const top = 30;
    const bottom = 42;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const values = items.map(item => Number(item[options.valueKey]));
    let min = Math.min(...values);
    let max = Math.max(...values);
    const rawRange = max - min;
    const padding = rawRange > 0 ? rawRange * 0.12 : Math.max(5, Math.abs(max) * 0.02);
    min -= padding;
    max += padding;
    if (max - min < 12) {
      const midpoint = (max + min) / 2;
      min = midpoint - 6;
      max = midpoint + 6;
    }

    // Place arrows at the centre of equal-width slots. This keeps the one-third
    // guides exactly on the boundaries between the early, middle, and late thirds.
    const getX = index => left + ((index + 0.5) / items.length) * plotWidth;
    const getY = value => top + ((max - value) / (max - min)) * plotHeight;
    const gridValues = Array.from({ length: 4 }, (_, index) => max - ((max - min) * index / 3));
    const grid = gridValues.map(value => {
      const y = getY(value);
      return `<line x1="${left}" y1="${y.toFixed(2)}" x2="${width - right}" y2="${y.toFixed(2)}" class="progression-chart-grid"/><text x="${left - 10}" y="${(y + 4).toFixed(2)}" text-anchor="end" class="progression-chart-tick">${escapeHtml(options.formatValue(value))}</text>`;
    }).join("");
    const phaseGuides = [1 / 3, 2 / 3].map(ratio => {
      const x = left + plotWidth * ratio;
      return `<line x1="${x.toFixed(2)}" y1="${top}" x2="${x.toFixed(2)}" y2="${top + plotHeight}" class="progression-chart-phase-guide"/>`;
    }).join("");
    const phaseLabels = [
      { label: "Early", x: left + plotWidth / 6 },
      { label: "Middle", x: left + plotWidth / 2 },
      { label: "Late", x: left + plotWidth * 5 / 6 }
    ].map(item => `<text x="${item.x.toFixed(2)}" y="18" text-anchor="middle" class="progression-chart-phase-label">${item.label}</text>`).join("");
    const clipPrefix = "progression-running-score";
    const phaseClipDefs = buildProgressionPhaseClipDefs({ clipPrefix, left, top, plotWidth, plotHeight });
    const lineSegments = buildProgressionPhaseLineSegments(items, getX, getY, options.valueKey, clipPrefix);
    const endTicks = items.map((item, index) => {
      const next = items[index + 1];
      if (next && Number(next.endIndex) === Number(item.endIndex)) return "";
      const x = left + ((index + 1) / items.length) * plotWidth;
      return `<line x1="${x.toFixed(2)}" y1="${top + plotHeight}" x2="${x.toFixed(2)}" y2="${top + plotHeight + 5}" class="progression-chart-end-tick"/><text x="${x.toFixed(2)}" y="${height - 13}" text-anchor="middle" class="progression-chart-tick progression-chart-end-label">${escapeHtml(String(item.arrowNumber))}</text>`;
    }).join("");
    const pointMarkup = items.map((item, index) => {
      const x = getX(index);
      const y = getY(Number(item[options.valueKey]));
      const phaseClass = `is-${item.phaseId || "middle"}`;
      const tooltipValue = options.formatTooltipValue
        ? options.formatTooltipValue(Number(item[options.valueKey]))
        : options.formatValue(Number(item[options.valueKey]));
      const title = `Arrow ${item.arrowNumber}: ${tooltipValue} ${options.valueLabel}`;
      return `<g class="progression-chart-point-group ${phaseClass}"><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.85" class="progression-chart-point ${phaseClass}"/><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="7" class="progression-chart-point-hit"><title>${escapeHtml(title)}</title></circle></g>`;
    }).join("");

    return `
      <div class="intelligence-progression-chart ${escapeHtml(options.className || "")}">
        <div class="intelligence-section-head progression-chart-head">
          <span>${escapeHtml(options.title)}</span>
        </div>
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(options.title)}">
          ${phaseClipDefs}
          ${phaseLabels}
          ${grid}
          ${phaseGuides}
          ${lineSegments}
          ${pointMarkup}
          ${endTicks}
        </svg>
      </div>
    `;
  }

  function buildProgressionPhaseClipDefs({ clipPrefix, left, top, plotWidth, plotHeight }) {
    const thirdWidth = plotWidth / 3;
    const clipTop = top - 8;
    const clipHeight = plotHeight + 16;
    return `
      <defs>
        <clipPath id="${clipPrefix}-early"><rect x="${left}" y="${clipTop}" width="${thirdWidth}" height="${clipHeight}"/></clipPath>
        <clipPath id="${clipPrefix}-middle"><rect x="${left + thirdWidth}" y="${clipTop}" width="${thirdWidth}" height="${clipHeight}"/></clipPath>
        <clipPath id="${clipPrefix}-late"><rect x="${left + thirdWidth * 2}" y="${clipTop}" width="${thirdWidth}" height="${clipHeight}"/></clipPath>
      </defs>
    `;
  }

  function buildProgressionPhaseLineSegments(items, getX, getY, valueKey, clipPrefix) {
    const points = items.map((item, index) => `${getX(index).toFixed(2)},${getY(Number(item[valueKey])).toFixed(2)}`).join(" ");
    if (!points) return "";
    return ["early", "middle", "late"]
      .map(phaseId => `<polyline points="${points}" class="progression-chart-line is-${phaseId}" clip-path="url(#${clipPrefix}-${phaseId})"/>`)
      .join("");
  }

  function getTargetMaximumArrowScore(targetFace) {
    const scores = (targetFace?.zones || []).map(zone => Number(zone?.score)).filter(Number.isFinite);
    return scores.length ? Math.max(0, ...scores) : 10;
  }

  function buildEndPatternAnalysis(session) {
    const ends = (session?.endSeries || []).filter(end => Number.isFinite(Number(end.averageArrow)));
    if (!ends.length) return "There is no end-by-end scoring data to analyse.";

    const finding = session?.summary || {};
    if (!finding.reliable) {
      return "Taken together, the running score path, end averages, and session thirds show normal fluctuation rather than a consistent improvement or decline across the round.";
    }

    if (Number(finding.averageArrowDelta) < 0) {
      return "Taken together, the running score path, end averages, and session thirds show a progressive decline across the round. The repeated pattern supports a genuine late-session drop rather than one isolated weak end.";
    }

    return "Taken together, the running score path, end averages, and session thirds show progressive improvement across the round. The repeated pattern supports a genuine late-session lift rather than one isolated strong end.";
  }

  function buildInEndArrowAnalysis(inEnd) {
    const positions = (inEnd?.positions || []).filter(item => Number.isFinite(Number(item.actualAverageArrow)));
    if (!positions.length) return "There is no repeated arrow-position data to analyse.";

    const finding = inEnd?.finding || {};
    if (!finding.reliable) {
      return "Taken together, the arrow-position averages and within-end thirds show normal variation rather than a dependable arrow-order effect.";
    }

    if (finding.id === "reliable-in-end-decline") {
      return "Taken together, the arrow-position averages and within-end thirds show a repeated decline as each end progressed, indicating that later arrows were consistently weaker.";
    }

    if (finding.id === "reliable-in-end-improvement") {
      return "Taken together, the arrow-position averages and within-end thirds show repeated improvement as each end progressed, indicating that later arrows were consistently stronger.";
    }

    return "Taken together, the arrow-position averages and within-end thirds show a repeatable position-specific effect after accounting for each end's overall strength, rather than a simple first-to-last trend.";
  }

  function renderProgressionAnalysisBox(text, scope = "session", findingLabel = "") {
    const isInEnd = scope === "in-end";
    const scopeClass = isInEnd ? "is-inend" : "is-session";
    const heading = isInEnd ? "Within-end analysis" : "Session analysis";
    const fallbackLabel = isInEnd ? "No reliable within-end pattern" : "No reliable session trend";
    return `
      <div class="progression-pattern-analysis progression-final-analysis ${scopeClass}">
        <span>${heading}</span>
        <strong>${escapeHtml(capitaliseFirst(findingLabel || fallbackLabel))}</strong>
        <p>${escapeHtml(capitaliseFirst(text || "No interpretation is available."))}</p>
      </div>
    `;
  }

  function renderEndPerformanceBars(endSeries, targetFace) {
    const items = (endSeries || []).map(end => ({
      label: `End ${end.endNumber}`,
      actualAverageArrow: end.averageArrow,
      arrowCount: end.arrowCount,
      detail: "",
      phaseId: end.phaseId || "middle"
    }));
    return renderAveragePerformanceBars(items, targetFace, {
      emptyMessage: "No end-by-end data.",
      ariaLabel: "Average score by end",
      scopeClass: "is-end-bars",
      showDetail: false
    });
  }

  function renderInEndPositionBars(positions, targetFace) {
    const items = (positions || []).map(position => ({
      label: position.label,
      actualAverageArrow: position.actualAverageArrow,
      arrowCount: position.arrowCount,
      detail: `${position.arrowCount}x`
    }));
    return renderAveragePerformanceBars(items, targetFace, {
      emptyMessage: "No repeated arrow-position data.",
      ariaLabel: "Average score by arrow position",
      scopeClass: "is-arrow-bars"
    });
  }

  function renderAveragePerformanceBars(sourceItems, targetFace, options = {}) {
    const items = (sourceItems || []).filter(item => Number.isFinite(Number(item.actualAverageArrow)));
    if (!items.length) return `<div class="progression-average-bars intelligence-empty">${escapeHtml(options.emptyMessage || "No performance data.")}</div>`;
    const maximumArrowScore = Math.max(1, getTargetMaximumArrowScore(targetFace));
    const values = items.map(item => Number(item.actualAverageArrow));
    const scale = App.SessionIntelligence.makeInEndBarScale(values, maximumArrowScore);
    const scaleMinimum = scale.minimum;
    const showDetail = options.showDetail !== false;
    const detailClass = showDetail ? " has-detail" : " no-detail";
    return `
      <div class="progression-average-bars ${escapeHtml(options.scopeClass || "")}${detailClass}" aria-label="${escapeHtml(options.ariaLabel || "Average score bars")}, shown on a ${formatAverageArrow(scaleMinimum)} to ${formatAverageArrow(maximumArrowScore)} scale">
        <div class="progression-average-scale" aria-hidden="true"><span>${formatCompactScaleValue(scaleMinimum)}</span><span>${formatCompactScaleValue(maximumArrowScore)}</span></div>
        <div class="progression-average-rows">
        ${items.map(item => {
          const value = Number(item.actualAverageArrow);
          const width = scale.toPercent(value);
          const phaseClass = item.phaseId ? ` is-${item.phaseId}` : "";
          return `
            <div class="progression-average-row${escapeHtml(phaseClass)}">
              <span>${escapeHtml(item.label)}</span>
              <div class="progression-average-track" title="${escapeHtml(item.label)}: ${formatAverageArrow(value)} average; scale ${formatCompactScaleValue(scaleMinimum)}–${formatCompactScaleValue(maximumArrowScore)}"><i style="width:${numAttr(width)}%"></i></div>
              <strong>${formatAverageArrow(value)}</strong>
              ${showDetail ? `<small>${escapeHtml(item.detail || `${item.arrowCount || 0}x`)}</small>` : ""}
            </div>
          `;
        }).join("")}
        </div>
      </div>
    `;
  }

  function renderEmbeddedNormalisationScenario(scenario, scope = "in-end") {
    if (!scenario) return "";
    const scopeClass = scope === "session" ? "is-session" : "is-inend";
    return `
      <article class="progression-normalisation-card ${scopeClass}">
        <div class="progression-normalisation-copy">
          <span class="panel-eyebrow">Consistency comparison</span>
          <strong>${escapeHtml(scenario.label)}</strong>
          <p>${escapeHtml(scenario.description)}</p>
        </div>
        <div class="progression-normalisation-stats">
          <div><span>${escapeHtml(scenario.subjectLabel)}</span><strong>${formatAverageArrow(scenario.currentAverage)}</strong><small>Current average</small></div>
          <div><span>Normal value</span><strong>${formatAverageArrow(scenario.benchmarkAverage)}</strong><small>${escapeHtml(scenario.benchmarkLabel)}</small></div>
          <div><span>Adjusted score</span><strong>${formatScoreDetail(scenario.adjustedScore)}</strong><small class="${getScoreDeltaClass(scenario.change, 2)}">${formatSignedScoreDetail(scenario.change)}</small></div>
        </div>
      </article>
    `;
  }

  function formatCompactScaleValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  }

  function formatAverageArrow(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : "—";
  }

  function formatSignedAverage(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    if (Math.abs(numeric) < 0.005) return "±0.00";
    return `${numeric > 0 ? "+" : ""}${numeric.toFixed(2)}`;
  }

  function formatSpreadPair(horizontal, vertical) {
    const h = Number(horizontal);
    const v = Number(vertical);
    if (!Number.isFinite(h) || !Number.isFinite(v)) return "—";
    return `${h.toFixed(1)} × ${v.toFixed(1)}mm`;
  }

  function numAttr(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? String(Math.round(numeric * 1000) / 1000) : "0";
  }

  function renderImprovedPatternCard(scenario, actualScenario, change) {
    if (!scenario || !actualScenario) return "";
    return `
      <div class="intelligence-best-card intelligence-improved-card">
        <div class="intelligence-best-copy">
          <span class="panel-eyebrow">Improved pattern preview</span>
          <h5>${escapeHtml(scenario.label)}</h5>
          <p>${escapeHtml(scenario.description)} This is a controlled model comparison, not a guaranteed result.</p>
        </div>
        <div class="intelligence-best-stats">
          <div><span>Expected</span><strong>${formatScoreDetail(scenario.result.expectedScore)}</strong></div>
          <div><span>Change vs baseline</span><strong class="${getScoreDeltaClass(change, 2)}">${formatSignedScoreDetail(change)}</strong></div>
          <div><span>Likely range</span><strong>${formatScoreNumber(scenario.result.p10)}–${formatScoreNumber(scenario.result.p90)}</strong></div>
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
          <span>Performance Intelligence is available only for complete scorecards where every arrow has a plotted x/y position. This keeps the observed score, progression analysis, and geometry model on the same set of arrows.</span>
          <span>It then builds Shot Pattern DNA: the core group centre and offset, fitted core width and height, group shape and angle, a 95% prediction ellipse, and major-outlier rate.</span>
          <span>That DNA feeds a Monte Carlo simulation. Monte Carlo means repeatedly testing thousands of random-but-realistic versions of the same pattern. In this app, each run generates 5,000 simulated scorecards as x/y impacts and scores every simulated arrow through the normal target scoring engine.</span>
          <span>The expected score is the average score produced by those simulated repeats. It is not a separate judgement of your skill; it is what this actual shot pattern usually converts into on the target face.</span>
          <span>Actual score versus expected score is therefore shown as score-conversion luck. The Luck Rating is the actual score's percentile rank inside the simulated score distribution: 50 is average conversion, above 50 means the full score converted better than the model average, and below 50 means it converted worse. It may loosely correlate with Ring Break Luck, but Ring Break Luck separately measures only close ring-boundary touches and near-misses.</span>
          <span>Progression Intelligence is separate from the Monte Carlo forecast. Its running projected score uses the actual score recorded after every arrow. Trend labels require repeated evidence across ends, and in-end labels use paired comparisons within the same ends so ordinary random differences are not over-reported.</span>
          <span>The session and within-end bar sections include direct consistency comparisons for the weakest end and weakest repeated arrow position. These recalculate the observed score without simulation. The Improvement forecast separately reruns paired Monte Carlo trials after controlled geometric changes such as re-centring the group, removing major outliers, or tightening spread. Forecast probabilities show how often the simulated scorecards reached each selected target.</span>
        </span>
      </span>
    `;
  }

  function getScoreConversionLuck(actualScore, forecast, possibleScore) {
    const actual = Number(actualScore) || 0;
    const expected = Number(forecast?.expectedScore) || 0;
    const possibleSuffix = possibleScore ? `/${formatScoreNumber(possibleScore)}` : "";
    const gap = actual - expected;
    const roundedGap = roundToDecimals(gap, 2) || 0;
    const luckRating = getLuckRating(forecast);
    const scoreText = `${formatScoreNumber(actual)}${possibleSuffix}`;
    const gapText = formatScoreDetail(Math.abs(gap));

    if (roundedGap > 0) {
      return {
        gap,
        label: luckRating.label,
        message: `Score-conversion luck: ${luckRating.label} (${gapText} above model average). Actual score ${scoreText}.`,
        shortMessage: `${gapText} points above the model average.`
      };
    }
    if (roundedGap < 0) {
      return {
        gap,
        label: luckRating.label,
        message: `Score-conversion luck: ${luckRating.label} (${gapText} below model average). Actual score ${scoreText}.`,
        shortMessage: `${gapText} points below the model average.`
      };
    }
    return {
      gap,
      label: luckRating.label,
      message: `Score-conversion luck: Neutral. Actual score matched the model average at ${scoreText}.`,
      shortMessage: "Matched the model average."
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
    const neutral = value >= 40 && value < 60;
    const direction = value >= 60 ? 1 : value < 40 ? -1 : 0;
    const distanceFromNeutral = direction > 0 ? (value - 60) / 40 : direction < 0 ? (40 - value) / 40 : 0;
    const intensity = Math.max(0, Math.min(1, distanceFromNeutral));
    const progress = intensity;

    let className = "luck-neutral";
    const luckyHue = 142;
    const unluckyHue = 354;
    const neutralHue = 171;
    const hue = direction > 0
      ? neutralHue + (luckyHue - neutralHue) * progress
      : direction < 0
        ? neutralHue + (unluckyHue - neutralHue) * progress
        : neutralHue;
    const sat = direction > 0 ? 70 + progress * 12 : direction < 0 ? 70 + progress * 16 : 58;
    const glow = neutral ? 0.10 : 0.10 + intensity * (direction > 0 ? 0.34 : 0.37);

    if (value >= 60) {
      className = "luck-fortunate luck-tier-60";
      if (value >= 70) className += " luck-tier-70";
      if (value >= 80) className += " luck-tier-80 luck-strong";
      if (value >= 90) className += " luck-tier-90 luck-magical";
      if (value >= 95) className += " luck-tier-95 luck-prismatic luck-aura";
      if (value >= 98) className += " luck-tier-98 luck-mythic luck-sparkle";
      if (value >= 99) className += " luck-tier-99";
    } else if (value < 40) {
      className = "luck-unfortunate luck-tier-60";
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
    if (value >= 99) return "Almost impossibly lucky";
    if (value >= 98) return "Extraordinarily lucky";
    if (value >= 95) return "Exceptionally lucky";
    if (value >= 90) return "Extremely lucky";
    if (value >= 80) return "Very lucky";
    if (value >= 70) return "Lucky";
    if (value >= 60) return "Slightly lucky";
    if (value >= 40) return "Neutral";
    if (value >= 30) return "Slightly unlucky";
    if (value >= 20) return "Unlucky";
    if (value >= 10) return "Very unlucky";
    if (value >= 5) return "Extremely unlucky";
    if (value >= 2) return "Exceptionally unlucky";
    if (value >= 1) return "Extraordinarily unlucky";
    return "Almost impossibly unlucky";
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

  function renderIntelPill(label, value) {
    return `
      <span class="intelligence-pill">
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(value)}</small>
      </span>
    `;
  }

  function renderDnaItem(label, value, explanation = "", icon = "shape") {
    return `
      <article class="intelligence-dna-item dna-tone-blue" title="${escapeHtml(explanation || label)}">
        <div class="intelligence-dna-card-top">
          <div class="intelligence-dna-icon" aria-hidden="true">${renderDnaIcon(icon)}</div>
          <span>${escapeHtml(label)}</span>
        </div>
        <strong>${value}</strong>
        ${explanation ? `<small>${escapeHtml(explanation)}</small>` : ""}
      </article>
    `;
  }

  function renderDnaIcon(icon) {
    const common = 'viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
    const icons = {
      centre: `<svg ${common}><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,
      offset: `<svg ${common}><circle cx="7" cy="17" r="2"/><circle cx="17" cy="7" r="2"/><path d="M8.5 15.5 15.5 8.5M12.5 8.5h3v3"/></svg>`,
      shape: `<svg ${common}><ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(25 12 12)"/><path d="m6 17 12-10"/></svg>`,
      width: `<svg ${common}><path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3"/><path d="M7 6v12M17 6v12" opacity=".45"/></svg>`,
      height: `<svg ${common}><path d="M12 4v16M12 4 9 7M12 4l3 3M12 20l-3-3M12 20l3-3"/><path d="M6 7h12M6 17h12" opacity=".45"/></svg>`,
      outliers: `<svg ${common}><circle cx="9" cy="11" r="4"/><circle cx="18" cy="5" r="1.6"/><circle cx="18" cy="18" r="1.6"/><path d="M12 8.5 16.5 6M12.5 13.5l4 3" opacity=".55"/></svg>`,
      ellipse: `<svg ${common}><ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(-20 12 12)"/><circle cx="12" cy="12" r="1.5"/><path d="M4 12h16M12 5v14" opacity=".35"/></svg>`,
      angle: `<svg ${common}><path d="M5 18 18 5M5 18h13"/><path d="M10 18a5 5 0 0 1 1.5-3.5"/></svg>`
    };
    return icons[icon] || icons.shape;
  }

  function renderProbabilityRows(chances, simulationCount) {
    return (chances || []).map(chance => `
      <div class="intelligence-table-row" title="Chance that this session-level model reaches ${formatScoreNumber(chance.target)} or higher.">
        <span>Chance of ${formatScoreNumber(chance.target)}+</span>
        <strong>${formatSimulationProbability(chance.probability, simulationCount)}</strong>
      </div>
    `).join("");
  }

  function formatSimulationProbability(value, simulationCount) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    const count = Math.max(1, Math.floor(Number(simulationCount) || 1));
    if (numeric <= 0) return `&lt;${(100 / count).toFixed(2)}%`;
    return `${(numeric * 100).toFixed(2)}%`;
  }

  function renderScenarioRow(scenario, actualScenario, largestUpliftScenario) {
    const baseExpected = actualScenario?.result?.expectedScore ?? scenario.result.expectedScore;
    const gain = scenario.result.expectedScore - baseExpected;
    const isFeatured = scenario.id === "combined-realistic";
    const displayedGain = roundToDecimals(gain, 2);
    const gainClass = getScoreDeltaClass(gain, 2);
    const isLargest = largestUpliftScenario && scenario.id === largestUpliftScenario.id && displayedGain > 0;
    const rowClass = [isFeatured ? "is-featured" : "", isLargest ? "is-largest-uplift" : ""].filter(Boolean).join(" ");
    return `
      <div class="intelligence-scenario-row ${rowClass}" title="${escapeHtml(scenario.description)}">
        <span>
          <strong>${escapeHtml(scenario.label)}${isLargest ? `<em>Largest uplift</em>` : ""}</strong>
          <small>${escapeHtml(scenario.description)}</small>
        </span>
        <span>${formatScoreDetail(scenario.result.expectedScore)}</span>
        <span class="${gainClass}">${formatSignedScoreDetail(gain)}</span>
        <span>${formatScoreNumber(scenario.result.p10)}–${formatScoreNumber(scenario.result.p90)}</span>
      </div>
    `;
  }


  function formatScoreDetail(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    const rounded = Math.round(numeric * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  function formatScoreNumber(value) {
    if (!Number.isFinite(Number(value))) return "—";
    return String(Math.round(Number(value)));
  }

  function roundToDecimals(value, decimals = 2) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const factor = Math.pow(10, Math.max(0, Math.floor(Number(decimals) || 0)));
    return Math.round((numeric + Number.EPSILON) * factor) / factor;
  }

  function formatSignedScoreDetail(value, decimals = 2) {
    const rounded = roundToDecimals(value, decimals);
    if (rounded === null) return "—";
    if (rounded === 0) return `±${(0).toFixed(decimals)}`;
    return `${rounded > 0 ? "+" : ""}${rounded.toFixed(decimals)}`;
  }

  function getScoreDeltaClass(value, decimals = 2) {
    const rounded = roundToDecimals(value, decimals);
    if (rounded === null || rounded === 0) return "";
    return rounded > 0 ? "positive" : "negative";
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

  function capitaliseFirst(value) {
    const text = String(value ?? "").trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
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
