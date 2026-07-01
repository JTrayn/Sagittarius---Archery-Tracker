(function () {
  const App = window.ArcheryApp;

  document.addEventListener("DOMContentLoaded", () => {
    App.Modal.init();
    App.Toast.init();
    App.TopControls.init();
    App.CustomSelect.init(document);

    const scorecard = new App.ScorecardView(document.getElementById("scorecardContainer"));
    scorecard.bindEvents();

    const viewport = new App.TargetViewport({
      canvas: document.getElementById("targetCanvas"),
      hud: document.getElementById("viewportHud"),
      zoomHud: document.getElementById("zoomHud"),
      modeHud: document.getElementById("viewportModeHint"),
      onPlot: worldPoint => {
        const state = App.State.getState();
        if (!state.scorecard) {
          App.Toast.show("Create a scorecard before plotting arrows", "danger");
          return;
        }
        App.Actions.plotSelectedArrow(worldPoint);
      }
    });

    const plotModeBtn = document.getElementById("plotModeBtn");
    const editModeBtn = document.getElementById("editModeBtn");
    const lockedModeBtn = document.getElementById("lockedModeBtn");
    const visibleEndSelect = document.getElementById("visibleEndSelect");
    const toggleLabelsBtn = document.getElementById("toggleLabelsBtn");
    const toggleRadialGroupingBtn = document.getElementById("toggleRadialGroupingBtn");
    const toggleSimpleGroupingBtn = document.getElementById("toggleSimpleGroupingBtn");
    const exportTargetImageBtn = document.getElementById("exportTargetImageBtn");

    plotModeBtn.addEventListener("click", () => App.Actions.setViewportMode("plot"));
    editModeBtn.addEventListener("click", () => App.Actions.setViewportMode("edit"));
    lockedModeBtn.addEventListener("click", () => App.Actions.setViewportMode("locked"));

    visibleEndSelect.addEventListener("change", event => {
      App.Actions.setVisibleEndIndex(event.target.value === "all" ? null : Number(event.target.value));
    });

    document.getElementById("fitTargetBtn").addEventListener("click", () => viewport.fitTarget(false));
    document.getElementById("resetViewBtn").addEventListener("click", () => viewport.resetView());
    toggleLabelsBtn.addEventListener("click", event => {
      const state = App.State.getState();
      state.viewport.showArrowLabels = !state.viewport.showArrowLabels;
      App.State.notify("viewportLabels");
    });
    toggleRadialGroupingBtn.addEventListener("click", () => {
      const state = App.State.getState();
      App.Actions.setGroupingOverlay("radial", !state.viewport.showRadialGrouping);
    });
    toggleSimpleGroupingBtn.addEventListener("click", () => {
      const state = App.State.getState();
      App.Actions.setGroupingOverlay("simple", !state.viewport.showSimpleGrouping);
    });
    exportTargetImageBtn.addEventListener("click", openExportImageModal);

    App.State.subscribe((state, reason) => {
      plotModeBtn.classList.toggle("is-active", state.viewport.interactionMode === "plot");
      editModeBtn.classList.toggle("is-active", state.viewport.interactionMode === "edit");
      lockedModeBtn.classList.toggle("is-active", state.viewport.interactionMode === "locked");
      toggleLabelsBtn.textContent = "Labels";
      toggleLabelsBtn.classList.toggle("is-active", state.viewport.showArrowLabels);
      toggleRadialGroupingBtn.textContent = "Radial";
      toggleRadialGroupingBtn.classList.toggle("is-active", state.viewport.showRadialGrouping);
      toggleSimpleGroupingBtn.textContent = "Simple";
      toggleSimpleGroupingBtn.classList.toggle("is-active", state.viewport.showSimpleGrouping);
      renderVisibleEndSelect(state, visibleEndSelect);
      App.TopControls.render(state);
      scorecard.render(state);
      viewport.setState(state);
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

  function openExportImageModal() {
    const state = App.State.getState();
    const scorecard = state.scorecard;
    if (!scorecard) {
      App.Toast.show("No scorecard to export", "danger");
      return;
    }
    const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
    const visibleText = state.viewport.visibleEndIndex === null ? "All ends" : `End ${state.viewport.visibleEndIndex + 1}`;
    const body = `<div class="export-modal-copy">
      <p>Export clean PNG images using the active target face and current scoring rules.</p>
      <div class="export-option-panel">
        <strong>Include in exported image</strong>
        <label class="export-check">
          <input type="checkbox" name="showLabels" ${state.viewport.showArrowLabels ? "checked" : ""} />
          <span>Arrow labels</span>
        </label>
        <label class="export-check">
          <input type="checkbox" name="showRadial" ${state.viewport.showRadialGrouping ? "checked" : ""} />
          <span>Radial grouping ring</span>
        </label>
        <label class="export-check">
          <input type="checkbox" name="showSimple" ${state.viewport.showSimpleGrouping ? "checked" : ""} />
          <span>Simple grouping ring</span>
        </label>
      </div>
      <div class="export-choice-list">
        <button class="export-choice" type="button" data-export-kind="visible">
          <strong>Current target view</strong>
          <span>${escapeHtml(visibleText)} · target and plotted arrows</span>
        </button>
        <button class="export-choice" type="button" data-export-kind="full">
          <strong>Complete scorecard target</strong>
          <span>All plotted arrows on one full target image</span>
        </button>
        <button class="export-choice" type="button" data-export-kind="sheet">
          <strong>End sheet</strong>
          <span>One separate mini target for each end</span>
        </button>
      </div>
      <div class="form-actions">
        <button class="btn" type="button" data-close-modal>Cancel</button>
      </div>
    </div>`;

    App.Modal.open("Export Image", body, modalBody => {
      modalBody.querySelector("[data-close-modal]").addEventListener("click", App.Modal.close);
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
            } else if (kind === "sheet") {
              App.ExportRenderer.exportEndSheet(scorecard, targetFace, exportOptions);
            }
          });
        });
      });
    });
  }


  function readExportOptions(modalBody) {
    return {
      showArrowLabels: Boolean(modalBody.querySelector("input[name='showLabels']")?.checked),
      showRadialGrouping: Boolean(modalBody.querySelector("input[name='showRadial']")?.checked),
      showSimpleGrouping: Boolean(modalBody.querySelector("input[name='showSimple']")?.checked)
    };
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
