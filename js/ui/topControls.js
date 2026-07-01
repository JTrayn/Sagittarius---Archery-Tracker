(function () {
  const App = window.ArcheryApp;

  const els = {};

  function init() {
    els.newScorecardBtn = document.getElementById("newScorecardBtn");
    els.saveScorecardBtn = document.getElementById("saveScorecardBtn");
    els.loadScorecardBtn = document.getElementById("loadScorecardBtn");
    els.exportScorecardBtn = document.getElementById("exportScorecardBtn");
    els.importScorecardInput = document.getElementById("importScorecardInput");
    els.scorecardNameInput = document.getElementById("scorecardNameInput");
    els.targetFaceSelect = document.getElementById("targetFaceSelect");
    els.distanceInput = document.getElementById("distanceInput");
    els.shotAtInput = document.getElementById("shotAtInput");
    els.scorecardTopMeta = document.getElementById("scorecardTopMeta");
    els.scorecardFooter = document.getElementById("scorecardFooter");
    els.manualScorePanel = document.getElementById("manualScorePanel");
    els.scorecardTotalPill = document.getElementById("scorecardTotalPill");
    els.scorecardPanelTitle = document.getElementById("scorecardPanelTitle");
    els.appVersionLabel = document.getElementById("appVersionLabel");
    els.appVersionLabel.textContent = `Archery Tracker · v${App.Constants.APP_VERSION}`;

    populateTargetFaceSelect();
    if (App.CustomSelect) App.CustomSelect.enhance(els.targetFaceSelect);
    bindEvents();
  }

  function bindEvents() {
    els.newScorecardBtn.addEventListener("click", openNewScorecardModal);
    els.saveScorecardBtn.addEventListener("click", saveScorecardFromPanel);
    els.loadScorecardBtn.addEventListener("click", App.ScorecardBrowser.openScorecardBrowser);
    els.exportScorecardBtn.addEventListener("click", exportCurrentScorecard);
    els.importScorecardInput.addEventListener("change", importScorecardFile);

    els.scorecardNameInput.addEventListener("change", event => {
      App.Actions.updateScorecardMeta({ name: event.target.value.trim() || "Untitled Scorecard" });
    });

    els.distanceInput.addEventListener("change", event => {
      App.Actions.updateScorecardMeta({ distanceM: Math.max(1, Number(event.target.value) || 1) });
    });

    els.shotAtInput.addEventListener("change", event => {
      App.Actions.updateScorecardMeta({ shotAt: App.Dates.fromDateTimeLocalValue(event.target.value) });
    });

    els.targetFaceSelect.addEventListener("change", event => {
      const previous = App.State.getState().scorecard ? App.State.getState().scorecard.activeViewTargetFaceId : null;
      const changed = App.Actions.changeTargetFace(event.target.value);
      if (changed && previous !== event.target.value) {
        const face = App.TargetFaces.getTargetFace(event.target.value);
        App.Toast.show(`Viewing/scoring as ${face.shortName || face.name}`, "success");
      }
    });

    els.manualScorePanel.addEventListener("click", event => {
      const button = event.target.closest(".manual-score-btn");
      if (!button) return;
      const option = JSON.parse(button.dataset.scoreOption);
      if (App.Actions.setManualScore(option)) {
        App.Toast.show(`Recorded ${option.label}`, "success");
      }
    });

    els.scorecardFooter.addEventListener("change", event => {
      const target = event.target;
      if (target.id === "scorecardNotesInput") {
        App.Actions.updateScorecardMeta({ notes: target.value.trim() });
      }
    });
  }

  function saveScorecardFromPanel() {
    const saved = App.Actions.saveCurrentScorecard();
    App.Toast.show(saved ? "Scorecard saved" : "No scorecard to save", saved ? "success" : "danger");
  }

  function populateTargetFaceSelect() {
    els.targetFaceSelect.innerHTML = renderTargetFaceOptions(App.Constants.DEFAULT_TARGET_FACE_ID);
  }

  function render(state) {
    const scorecard = state.scorecard;
    if (!scorecard) {
      els.scorecardNameInput.value = "";
      els.distanceInput.value = "";
      els.shotAtInput.value = "";
      els.targetFaceSelect.value = App.Constants.DEFAULT_TARGET_FACE_ID;
      els.scorecardTopMeta.innerHTML = "";
      els.scorecardFooter.innerHTML = "";
      els.manualScorePanel.innerHTML = "";
      updateScoreTotalPill(null);
      return;
    }

    const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
    const summary = App.ScoreFormatting.formatSummary(scorecard, targetFace);
    const originalFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
    const isComparisonView = originalFace.id !== targetFace.id;

    els.scorecardPanelTitle.textContent = "Scorecard setup";
    setInputValuePreservingFocus(els.scorecardNameInput, scorecard.name || "");
    setInputValuePreservingFocus(els.distanceInput, scorecard.distanceM || targetFace.defaultDistanceM || "");
    setInputValuePreservingFocus(els.shotAtInput, App.Dates.toDateTimeLocalValue(scorecard.shotAt || scorecard.createdAt));
    els.targetFaceSelect.value = scorecard.activeViewTargetFaceId;
    if (App.CustomSelect) App.CustomSelect.enhance(els.targetFaceSelect);

    updateScoreTotalPill(summary);
    renderTopMeta(scorecard, targetFace, originalFace, isComparisonView, state.dirty);
    renderManualScoreButtons(state, targetFace);
    renderFooter(scorecard, summary);
  }

  function updateScoreTotalPill(summary) {
    if (!els.scorecardTotalPill) return;
    if (!summary) {
      els.scorecardTotalPill.innerHTML = `<span class="score-total-value">0</span><span class="score-total-max">/ 0</span>`;
      return;
    }
    els.scorecardTotalPill.innerHTML = `
      <span class="score-total-value">${summary.totals.scorecardTotal}</span>
      <span class="score-total-max">/ ${summary.totals.possibleTotal}</span>
    `;
  }

  function renderTopMeta(scorecard, targetFace, originalFace, isComparisonView, isDirty) {
    els.scorecardTopMeta.innerHTML = `
      <div class="scorecard-meta-item">
        <span>Shot on</span>
        <strong title="${escapeHtml(originalFace.name)}">${escapeHtml(originalFace.shortName || originalFace.name)}</strong>
      </div>
      <div class="scorecard-meta-item ${isComparisonView ? "compare" : ""}">
        <span>Scoring as</span>
        <strong title="${escapeHtml(targetFace.name)}">${escapeHtml(targetFace.shortName || targetFace.name)}</strong>
      </div>
      <div class="scorecard-meta-item save-status-inline ${isDirty ? "is-dirty" : "is-saved"}">
        <span>Status</span>
        <strong>${isDirty ? "Unsaved" : "Saved"}</strong>
      </div>
    `;
  }

  function renderFooter(scorecard, summary) {
    const notes = escapeHtml(scorecard.notes || "");
    els.scorecardFooter.innerHTML = `
      <div class="scorecard-footer-stats">
        <div class="footer-stat">
          <span>X count</span>
          <strong>${summary.totals.xCount}</strong>
        </div>
        <div class="footer-stat">
          <span>Misses</span>
          <strong>${summary.totals.missCount}</strong>
        </div>
        <div class="footer-stat">
          <span>Arrows</span>
          <strong>${summary.arrowsText}</strong>
        </div>
      </div>
      <div class="scorecard-footer-fields">
        <label class="scorecard-notes-field">
          <span>Notes</span>
          <textarea id="scorecardNotesInput" rows="3" placeholder="Conditions, focus points, quick observations...">${notes}</textarea>
        </label>
      </div>
    `;
  }

  function renderManualScoreButtons(state, targetFace) {
    const options = App.TargetFaces.getManualScoreOptions(targetFace);
    const selectionText = getSelectedArrowText(state, targetFace);
    els.manualScorePanel.innerHTML = `
      <div class="manual-score-label">
        <strong>Manual score</strong>
        <span>${escapeHtml(selectionText)}</span>
      </div>
      <div class="manual-score-buttons">
        ${options.map(option => `<button class="manual-score-btn ${option.isMiss ? "miss" : ""}" type="button" data-score-option='${JSON.stringify(option)}' title="${option.label} = ${option.value}">${option.label}</button>`).join("")}
      </div>
    `;
  }

  function getSelectedArrowText(state, targetFace) {
    const arrow = App.State.getSelectedArrow();
    if (!arrow || !state.selected) {
      return state.viewport.interactionMode === "locked"
        ? "Locked mode · no arrow selected"
        : "No arrow selected";
    }
    const endIndex = state.selected.endIndex;
    const arrowIndex = state.selected.arrowIndex;
    const score = App.ScoringEngine.scoreArrow(arrow, targetFace);
    const scoreText = score ? ` · currently ${score.label}` : " · empty";
    return `Selected End ${endIndex + 1}, Arrow ${arrowIndex + 1}${scoreText}`;
  }

  function setInputValuePreservingFocus(input, value) {
    const next = String(value ?? "");
    if (document.activeElement === input) return;
    if (input.value !== next) input.value = next;
  }

  async function openNewScorecardModal() {
    if (!(await App.Actions.confirmDiscardUnsaved("Current scorecard has unsaved changes. Create a new scorecard anyway?"))) return;

    const defaults = App.Constants.DEFAULT_SCORECARD;
    const body = `<form class="modal-form" id="newScorecardForm">
      <label>
        <span>Scorecard name</span>
        <input name="name" type="text" value="${escapeHtml(defaults.name)}" autocomplete="off" />
      </label>
      <div class="form-grid">
        <label>
          <span>Ends</span>
          <input name="ends" type="number" min="1" max="60" step="1" value="${defaults.ends}" />
        </label>
        <label>
          <span>Arrows per end</span>
          <input name="arrowsPerEnd" type="number" min="1" max="12" step="1" value="${defaults.arrowsPerEnd}" />
        </label>
        <label>
          <span>Distance</span>
          <input name="distanceM" type="number" min="1" step="1" value="${defaults.distanceM}" />
        </label>
        <label>
          <span>Target face</span>
          <select name="targetFaceId">
            ${renderTargetFaceOptions(App.Constants.DEFAULT_TARGET_FACE_ID)}
          </select>
        </label>
      </div>
      <label>
        <span>Scorecard date/time</span>
        <input name="shotAt" type="datetime-local" value="${App.Dates.toDateTimeLocalValue(App.Dates.nowIso())}" />
      </label>
      <label>
        <span>Notes</span>
        <textarea name="notes" rows="4" placeholder="Conditions, focus points, quick observations..."></textarea>
      </label>
      <div class="form-actions">
        <button class="btn" type="button" data-close-modal>Cancel</button>
        <button class="btn btn-primary" type="submit">Create Scorecard</button>
      </div>
    </form>`;

    App.Modal.open("New Scorecard", body, modalBody => {
      if (App.CustomSelect) App.CustomSelect.enhanceAll(modalBody);
      const targetSelect = modalBody.querySelector("select[name='targetFaceId']");
      const distanceInput = modalBody.querySelector("input[name='distanceM']");
      let distanceManuallyEdited = false;
      distanceInput.addEventListener("input", () => { distanceManuallyEdited = true; });
      targetSelect.addEventListener("change", event => {
        if (distanceManuallyEdited) return;
        const face = App.TargetFaces.getTargetFace(event.target.value);
        distanceInput.value = face.defaultDistanceM || defaults.distanceM;
      });

      modalBody.querySelector("[data-close-modal]").addEventListener("click", App.Modal.close);
      modalBody.querySelector("#newScorecardForm").addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        App.Actions.createNewScorecard({
          name: String(form.get("name") || defaults.name).trim(),
          ends: Number(form.get("ends")),
          arrowsPerEnd: Number(form.get("arrowsPerEnd")),
          distanceM: Number(form.get("distanceM")),
          targetFaceId: String(form.get("targetFaceId")),
          shotAt: App.Dates.fromDateTimeLocalValue(String(form.get("shotAt") || "")),
          notes: String(form.get("notes") || "").trim()
        });
        App.Modal.close();
        App.Toast.show("New scorecard created", "success");
      });
    });
  }

  function exportCurrentScorecard() {
    const scorecard = App.State.getState().scorecard;
    if (!scorecard) {
      App.Toast.show("No scorecard to export", "danger");
      return;
    }
    downloadScorecardJson(scorecard);
  }

  async function importScorecardFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!(await App.Actions.confirmDiscardUnsaved("Current scorecard has unsaved changes. Import this scorecard anyway?"))) {
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const scorecard = JSON.parse(String(reader.result));
        validateImportedScorecard(scorecard);
        App.Actions.importScorecard(scorecard);
        App.Toast.show("Scorecard imported", "success");
      } catch (error) {
        console.error(error);
        App.Toast.show("Could not import that JSON file", "danger");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function downloadScorecardJson(scorecard) {
    const blob = new Blob([JSON.stringify(scorecard, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (scorecard.name || "archery-scorecard").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    link.href = url;
    link.download = `${safeName || "archery-scorecard"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function validateImportedScorecard(scorecard) {
    if (!scorecard || !Array.isArray(scorecard.ends)) {
      throw new Error("Invalid scorecard file");
    }
  }

  function renderTargetFaceOptions(selectedId) {
    const groups = App.TargetFaces.getTargetFaceGroups();
    return Object.entries(groups).map(([family, faces]) => {
      const options = faces.map(face => `<option value="${face.id}" ${face.id === selectedId ? "selected" : ""}>${face.name}</option>`).join("");
      return `<optgroup label="${escapeHtml(family)}">${options}</optgroup>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  App.TopControls = { init, render, downloadScorecardJson };
})();
