(function () {
  const App = window.ArcheryApp;

  const els = {};

  function init() {
    els.newScorecardBtn = document.getElementById("newScorecardBtn");
    els.saveScorecardBtn = document.getElementById("saveScorecardBtn");
    els.editScorecardBtn = document.getElementById("editScorecardBtn");
    els.loadScorecardBtn = document.getElementById("loadScorecardBtn");
    els.exportScorecardBtn = document.getElementById("exportScorecardBtn");
    els.generateDummyDataBtn = document.getElementById("generateDummyDataBtn");
    els.importScorecardInput = document.getElementById("importScorecardInput");
    els.manageTargetFacesBtn = document.getElementById("manageTargetFacesBtn");
    els.topbarSaveStatus = document.getElementById("topbarSaveStatus");
    els.scorecardInfoGrid = document.getElementById("scorecardInfoGrid");
    els.scorecardTopMeta = document.getElementById("scorecardTopMeta");
    els.scorecardFooter = document.getElementById("scorecardFooter");
    els.manualScorePanel = document.getElementById("manualScorePanel");
    els.scorecardTotalPill = document.getElementById("scorecardTotalPill");
    els.scorecardPbBadgeSlot = document.getElementById("scorecardPbBadgeSlot");
    els.scorecardPanelTitle = document.getElementById("scorecardPanelTitle");
    els.scorecardDisplayName = document.getElementById("scorecardDisplayName");
    els.appVersionLabel = document.getElementById("appVersionLabel");
    els.appVersionLabel.textContent = `v${App.Constants.APP_VERSION}`;

    bindEvents();
  }

  function bindEvents() {
    els.newScorecardBtn.addEventListener("click", openNewScorecardModal);
    els.saveScorecardBtn.addEventListener("click", saveScorecardFromPanel);
    els.editScorecardBtn.addEventListener("click", openEditScorecardModal);
    els.loadScorecardBtn.addEventListener("click", App.ScorecardBrowser.openScorecardBrowser);
    els.exportScorecardBtn.addEventListener("click", exportCurrentScorecard);
    els.generateDummyDataBtn.addEventListener("click", generateDummyData);
    els.importScorecardInput.addEventListener("change", importScorecardFile);
    els.manageTargetFacesBtn.addEventListener("click", () => {
      const scorecard = App.State.getState().scorecard;
      const currentFaceId = scorecard?.originalTargetFaceId || scorecard?.activeViewTargetFaceId || App.Constants.DEFAULT_TARGET_FACE_ID;
      App.TargetFaceManager.open({
        sourceFaceId: currentFaceId,
        onChange: () => {
          App.State.notify("targetFacesChanged");
        }
      });
    });

    els.manualScorePanel.addEventListener("click", event => {
      const button = event.target.closest(".manual-score-btn");
      if (!button) return;
      const option = JSON.parse(button.dataset.scoreOption);
      if (App.Actions.setManualScore(option)) {
        App.Toast.show(`Recorded ${option.label}`, "success");
      }
    });
  }

  function saveScorecardFromPanel() {
    const saved = App.Actions.saveCurrentScorecard();
    App.Toast.show(saved ? "Scorecard saved" : "No scorecard to save", saved ? "success" : "danger");
  }

  function render(state) {
    const scorecard = state.scorecard;
    if (!scorecard) {
      if (els.editScorecardBtn) els.editScorecardBtn.disabled = true;
      if (els.saveScorecardBtn) els.saveScorecardBtn.disabled = true;
      updateTopbarSaveStatus(true);
      if (els.scorecardInfoGrid) els.scorecardInfoGrid.innerHTML = "";
      if (els.scorecardTopMeta) els.scorecardTopMeta.innerHTML = "";
      els.scorecardFooter.innerHTML = "";
      els.manualScorePanel.innerHTML = "";
      els.scorecardDisplayName.textContent = "No scorecard loaded";
      els.scorecardPanelTitle.textContent = "Create or load a scorecard to begin.";
      updateScoreTotalPill(null);
      return;
    }

    const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
    const scoringOptions = App.Extrapolation.getProjectedScoreOptions(scorecard, state.viewport);
    const scoringScorecard = App.TimelineRenderer.isActive(state.viewport)
      ? App.TimelineRenderer.getScorecardForScoring(scorecard, state.viewport)
      : scorecard;
    const summary = App.ScoreFormatting.formatSummary(scoringScorecard, targetFace, scoringOptions);
    const originalFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
    const isComparisonView = originalFace.id !== targetFace.id;

    if (els.editScorecardBtn) els.editScorecardBtn.disabled = false;
    if (els.saveScorecardBtn) els.saveScorecardBtn.disabled = false;
    els.scorecardDisplayName.textContent = (scorecard.name || "Untitled Scorecard").trim() || "Untitled Scorecard";
    els.scorecardPanelTitle.textContent = buildScorecardSummaryLine(scorecard, targetFace);

    updateScoreTotalPill(summary, getScorecardPbStatus(scorecard, targetFace, originalFace, state));
    updateTopbarSaveStatus(state.dirty);
    renderScorecardInfoGrid(scorecard, targetFace, originalFace, summary, state.dirty);
    renderTopMeta(scorecard, targetFace, originalFace, isComparisonView, state.dirty);
    renderManualScoreButtons(state, targetFace);
    renderFooter(scorecard, scoringScorecard, summary, scoringOptions, targetFace);
  }

  function buildScorecardSummaryLine(scorecard, targetFace) {
    const faceName = targetFace.name || targetFace.shortName || "Target face";
    const distance = Number(scorecard.distanceM || 0);
    const distanceText = distance > 0 ? `${distance}m` : "Unknown distance";
    const dateText = App.Dates.formatDateOnly(scorecard.shotAt || scorecard.createdAt);
    return `${faceName} · ${distanceText} · ${dateText}`;
  }

  function renderScorecardInfoGrid(scorecard, targetFace, originalFace, summary, isDirty) {
    // v0.8.76: the separate date/distance/target-face/status cards were removed.
    // The same session metadata now lives in the compact subtitle under the scorecard title,
    // while saved/unsaved state lives in the top application toolbar.
    if (els.scorecardInfoGrid) els.scorecardInfoGrid.innerHTML = "";
  }

  function updateScoreTotalPill(summary, pbStatus = null) {
    if (!els.scorecardTotalPill) return;
    if (!summary) {
      els.scorecardTotalPill.innerHTML = `<span class="score-total-value">0</span><span class="score-total-max">/ 0</span>`;
      renderPbBadgeSlot(null);
      return;
    }

    els.scorecardTotalPill.innerHTML = `
      <span class="score-total-main">
        <span class="score-total-value">${summary.totals.scorecardTotal}</span>
        <span class="score-total-max">/ ${summary.totals.possibleTotal}</span>
      </span>
    `;
    renderPbBadgeSlot(pbStatus);
  }

  function renderPbBadgeSlot(pbStatus) {
    if (!els.scorecardPbBadgeSlot) return;
    const pbBadge = pbStatus?.isPb ? renderPbBadge(pbStatus) : "";
    els.scorecardPbBadgeSlot.classList.toggle("has-pb", Boolean(pbBadge));
    els.scorecardPbBadgeSlot.innerHTML = pbBadge;
  }

  function getScorecardPbStatus(scorecard, targetFace, originalFace, state) {
    if (!scorecard || !App.PersonalBests) return null;
    const isTimeline = App.TimelineRenderer.isActive(state.viewport);
    const isExtrapolated = Boolean(state.viewport.extrapolation?.enabled);
    const isComparisonView = targetFace.id !== originalFace.id;
    if (isTimeline || isExtrapolated || isComparisonView) return null;
    const status = App.PersonalBests.getScorecardPbStatus(scorecard);
    return status?.isPb ? status : null;
  }

  function renderPbBadge(pbStatus) {
    const title = escapeHtml(pbStatus.title || "Personal best for this scorecard category");
    const label = pbStatus.isTied ? "Tied personal best" : "Personal best";
    return `<span class="score-pb-badge" title="${title}" aria-label="${escapeHtml(label)}"><span class="score-pb-text">PB</span></span>`;
  }

  function renderTopMeta(scorecard, targetFace, originalFace, isComparisonView, isDirty) {
    if (els.scorecardTopMeta) els.scorecardTopMeta.innerHTML = "";
  }

  function updateTopbarSaveStatus(isDirty) {
    if (!els.topbarSaveStatus) return;
    const dirty = Boolean(isDirty);
    els.topbarSaveStatus.textContent = dirty ? "Unsaved" : "Saved";
    els.topbarSaveStatus.classList.toggle("is-unsaved", dirty);
    els.topbarSaveStatus.classList.toggle("is-saved", !dirty);
    els.topbarSaveStatus.setAttribute("aria-label", dirty ? "Scorecard has unsaved changes" : "Scorecard saved locally");
  }

  function renderFooter(scorecard, scoringScorecard, summary, scoringOptions, targetFace) {
    const notes = (scorecard.notes || "").trim();
    const mpi = calculateScorecardMpi(scoringScorecard, scoringOptions);
    const mpiTitle = formatScorecardMpiTitle(mpi);
    const ringBreakLuck = App.RingBreakLuck?.calculateScorecardLuck(scoringScorecard, targetFace, scoringOptions);
    const luckAdjustedScore = App.RingBreakLuck?.calculateLuckAdjustedScore(scoringScorecard, targetFace, scoringOptions);
    els.scorecardFooter.innerHTML = `
      <div class="scorecard-footer-heading">Scorecard analysis</div>
      <div class="scorecard-footer-stats">
        <div class="footer-stat" title="Average score across recorded plotted and manual arrows">
          <span>Avg score</span>
          <strong>${summary.averageScoreText}</strong>
        </div>
        <div class="footer-stat" title="Average plotted-arrow distance from target centre">
          <span>Avg centre</span>
          <strong>${summary.averageDistanceText}</strong>
        </div>
        <div class="footer-stat" title="${escapeHtml(mpiTitle)}">
          <span>MPI</span>
          <strong class="footer-mpi-value">${renderFooterMpi(mpi)}</strong>
        </div>
        <div class="footer-stat">
          <span>X count</span>
          <strong>${summary.totals.xCount}</strong>
        </div>
        <div class="footer-stat">
          <span>Misses</span>
          <strong>${summary.totals.missCount}</strong>
        </div>
        <div class="footer-stat" title="${escapeHtml(formatRingBreakLuckTitle(ringBreakLuck))}">
          <span>Ring Break Luck</span>
          <strong>${formatRingBreakLuckValue(ringBreakLuck)}</strong>
        </div>
        <div class="footer-stat" title="${escapeHtml(formatLuckAdjustedScoreTitle(luckAdjustedScore))}">
          <span>Luck adjusted score</span>
          <strong>${formatLuckAdjustedScoreValue(luckAdjustedScore)}</strong>
        </div>
      </div>
      <div class="scorecard-note-preview ${notes ? "" : "is-empty"}">
        <span>Notes</span>
        <p>${notes ? escapeHtml(notes) : "No notes yet. Use Edit to add conditions, focus points, or observations."}</p>
      </div>
    `;
  }

  function calculateScorecardMpi(scorecard, scoringOptions = {}) {
    const positions = [];
    (scorecard?.ends || []).forEach(end => {
      (end.arrows || []).forEach(arrow => {
        if (!arrow?.position) return;
        const point = scoringOptions.extrapolation
          ? App.Extrapolation.transformPosition(arrow.position, scoringOptions.extrapolation)
          : arrow.position;
        if (!point || !Number.isFinite(Number(point.xMm)) || !Number.isFinite(Number(point.yMm))) return;
        positions.push({ xMm: Number(point.xMm), yMm: Number(point.yMm) });
      });
    });
    if (!positions.length) return null;
    const centroid = positions.reduce((sum, position) => ({
      xMm: sum.xMm + position.xMm,
      yMm: sum.yMm + position.yMm
    }), { xMm: 0, yMm: 0 });
    centroid.xMm /= positions.length;
    centroid.yMm /= positions.length;
    return {
      count: positions.length,
      xMm: centroid.xMm,
      yMm: centroid.yMm,
      distanceMm: Math.hypot(centroid.xMm, centroid.yMm),
      angleDeg: Math.atan2(centroid.yMm, centroid.xMm) * 180 / Math.PI
    };
  }

  function renderFooterMpi(mpi) {
    if (!mpi) return "—";
    const distanceText = formatMpiDistance(mpi.distanceMm);
    if (mpi.distanceMm < 0.5) {
      return `<span class="footer-mpi-inline"><span>${distanceText}</span><span class="footer-mpi-dot" aria-hidden="true"></span></span>`;
    }
    const angle = Number.isFinite(mpi.angleDeg) ? mpi.angleDeg.toFixed(2) : "0";
    return `<span class="footer-mpi-inline"><span>${distanceText}</span><span class="footer-mpi-arrow" style="--mpi-angle: ${angle}deg" aria-hidden="true">${renderMpiArrowSvg()}</span></span>`;
  }

  function formatRingBreakLuckValue(ringBreakLuck) {
    if (!ringBreakLuck) return "—";
    return String(ringBreakLuck.score);
  }

  function formatRingBreakLuckTitle(ringBreakLuck) {
    if (!ringBreakLuck) {
      return "Ring Break Luck requires plotted arrows. Manual-only scores are ignored because there is no arrow position to compare against a ring boundary.";
    }
    const windowText = formatSmallMm(ringBreakLuck.sensitivityWindowMm);
    const breakWord = ringBreakLuck.qualifyingBreakCount === 1 ? "borderline arrow" : "borderline arrows";
    const arrowWord = ringBreakLuck.plottedCount === 1 ? "plotted arrow" : "plotted arrows";
    return `Ring Break Luck: ${ringBreakLuck.score}/100 (${ringBreakLuck.label}). 50 is neutral. It measures line-cutter luck by checking whether plotted arrows landed just inside or just outside a ring boundary. Only arrows within ${windowText} of a line affect the lucky/unlucky balance; other plotted arrows are neutral. ${ringBreakLuck.luckyBreakCount} barely in, ${ringBreakLuck.unluckyBreakCount} barely out, ${ringBreakLuck.qualifyingBreakCount} ${breakWord} from ${ringBreakLuck.plottedCount} ${arrowWord}.`;
  }

  function formatLuckAdjustedScoreValue(adjusted) {
    if (!adjusted || !Number.isFinite(Number(adjusted.displayScore))) return "—";
    return String(adjusted.displayScore);
  }

  function formatLuckAdjustedScoreTitle(adjusted) {
    if (!adjusted) {
      return "Luck Adjusted Score requires recorded arrows and uses plotted close-boundary arrows when available. Manual-only arrows remain scored as recorded.";
    }
    const net = Number(adjusted.netLuckPoints) || 0;
    const direction = net > 0.05
      ? `removing ${formatScorePoints(Math.abs(net))} of net favourable line-break value`
      : net < -0.05
        ? `adding ${formatScorePoints(Math.abs(net))} of net unfavourable line-break value`
        : "no meaningful net line-break adjustment";
    const breakWord = adjusted.qualifyingScoreBreakCount === 1 ? "score-changing borderline arrow" : "score-changing borderline arrows";
    const sameScoreText = adjusted.ignoredSameScoreBreakCount > 0
      ? ` Same-score boundaries such as X/10 ignored for score adjustment: ${adjusted.ignoredSameScoreBreakCount}.`
      : "";
    return `Luck Adjusted Score: ${adjusted.displayScore} from actual ${adjusted.actualScore}, ${direction}. It estimates the score with neutral 50/100 Ring Break Luck by weighting only close boundary arrows that change score value. ${adjusted.qualifyingScoreBreakCount} ${breakWord}: ${adjusted.luckyScoreBreakCount} favourable, ${adjusted.unluckyScoreBreakCount} unfavourable.${sameScoreText}`;
  }

  function formatScorePoints(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0 points";
    const text = amount >= 10 ? amount.toFixed(1) : amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `${text} point${Math.abs(amount - 1) < 0.0001 ? "" : "s"}`;
  }

  function formatSmallMm(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return `${amount.toFixed(amount % 1 === 0 ? 0 : 1)}mm`;
  }

  function formatScorecardMpiTitle(mpi) {
    if (!mpi) return "Mean Point of Impact requires plotted arrows and ignores manual-only scores.";
    return `Mean Point of Impact: ${formatMpiDistance(mpi.distanceMm)} from centre · ${formatAxisOffset(mpi.xMm, "right", "left")} · ${formatAxisOffset(mpi.yMm, "low", "high")} · based on ${mpi.count} plotted arrow${mpi.count === 1 ? "" : "s"}.`;
  }

  function formatMpiDistance(value) {
    if (!Number.isFinite(value)) return "—";
    if (value >= 100) return `${Math.round(value)}mm`;
    return `${value.toFixed(1)}mm`;
  }

  function formatAxisOffset(value, positiveLabel, negativeLabel) {
    const amount = Number(value) || 0;
    const label = amount >= 0 ? positiveLabel : negativeLabel;
    return `${Math.abs(amount).toFixed(1)}mm ${label}`;
  }

  function renderMpiArrowSvg() {
    return `<svg viewBox="0 0 18 18" focusable="false" aria-hidden="true"><path d="M3 9h10.2M9.7 5.4 13.3 9l-3.6 3.6"/></svg>`;
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
        ${options.map(option => `<button class="manual-score-btn ${option.isMiss ? "miss" : ""}" type="button" data-score-option='${JSON.stringify(option)}' title="${option.label} = ${option.value}" ${state.viewport.timeline?.enabled ? "disabled" : ""}>${option.label}</button>`).join("")}
      </div>
    `;
  }

  function getSelectedArrowText(state, targetFace) {
    const arrow = App.State.getSelectedArrow();
    if (state.viewport.timeline?.enabled) {
      return "Timeline replay · manual scoring disabled";
    }
    if (!arrow || !state.selected) {
      return state.viewport.interactionMode === "locked"
        ? "Locked mode · no arrow selected"
        : "No arrow selected";
    }
    const endIndex = state.selected.endIndex;
    const arrowIndex = state.selected.arrowIndex;
    const score = App.ScoringEngine.scoreArrow(arrow, targetFace, App.Extrapolation.getProjectedScoreOptions(App.State.getState().scorecard, App.State.getState().viewport));
    const scoreText = score ? ` · currently ${score.label}` : " · empty";
    return `Selected End ${endIndex + 1}, Arrow ${arrowIndex + 1}${scoreText}`;
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
      // Distance is independent from target face. Changing the target face must not
      // overwrite the distance field; the user changes distance explicitly.

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

  function openEditScorecardModal() {
    const state = App.State.getState();
    const scorecard = state.scorecard;
    if (!scorecard) {
      App.Toast.show("No scorecard to edit", "danger");
      return;
    }
    const targetFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId);
    const hasManualScores = App.ScoringEngine.hasManualScores(scorecard);
    const body = `<form class="modal-form edit-scorecard-form" id="editScorecardForm">
      <div class="edit-scorecard-intro">
        <strong>Edit scorecard</strong>
        <span>Update the details shown at the top of the scorecard.</span>
      </div>
      <label>
        <span>Scorecard name</span>
        <input name="name" type="text" value="${escapeHtml(scorecard.name || "Untitled Scorecard")}" autocomplete="off" />
      </label>
      <div class="form-grid">
        <label>
          <span>Distance</span>
          <input name="distanceM" type="number" min="1" step="1" value="${Number(scorecard.distanceM || 1)}" />
        </label>
        <label>
          <span>Scorecard date/time</span>
          <input name="shotAt" type="datetime-local" value="${App.Dates.toDateTimeLocalValue(scorecard.shotAt || scorecard.createdAt)}" />
        </label>
      </div>
      <label class="edit-target-face-field ${hasManualScores ? "is-locked" : ""}">
        <span>Target face</span>
        <select name="targetFaceId" ${hasManualScores ? "disabled" : ""}>
          ${renderTargetFaceOptions(scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId)}
        </select>
        ${hasManualScores ? `<small>Target face is locked while manual scores are recorded.</small>` : ""}
      </label>
      <label>
        <span>Notes</span>
        <textarea name="notes" rows="5" placeholder="Conditions, focus points, quick observations...">${escapeHtml(scorecard.notes || "")}</textarea>
      </label>
      <div class="form-actions">
        <button class="btn" type="button" data-close-modal>Cancel</button>
        <button class="btn btn-primary" type="submit">Save changes</button>
      </div>
    </form>`;

    App.Modal.open("Edit scorecard", body, modalBody => {
      if (App.CustomSelect) App.CustomSelect.enhanceAll(modalBody);
      const formEl = modalBody.querySelector("#editScorecardForm");
      const targetSelect = formEl.querySelector("select[name='targetFaceId']");
      // Distance is independent from target face. Changing target face in the edit
      // modal preserves the current distance unless the distance field itself is edited.
      modalBody.querySelector("[data-close-modal]").addEventListener("click", App.Modal.close);
      formEl.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const nextName = String(form.get("name") || "Untitled Scorecard").trim() || "Untitled Scorecard";
        const nextDistance = Math.max(1, Number(form.get("distanceM")) || 1);
        const nextShotAt = App.Dates.fromDateTimeLocalValue(String(form.get("shotAt") || ""));
        const nextNotes = String(form.get("notes") || "").trim();
        const actualTargetFaceId = scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId;
        const nextTargetFaceId = hasManualScores
          ? actualTargetFaceId
          : String(form.get("targetFaceId") || actualTargetFaceId);

        const updates = {
          name: nextName,
          distanceM: nextDistance,
          shotAt: nextShotAt,
          notes: nextNotes
        };
        App.Actions.updateScorecardMeta(updates);
        if (nextTargetFaceId !== (scorecard.originalTargetFaceId || scorecard.activeViewTargetFaceId)) {
          App.Actions.changeTargetFace(nextTargetFaceId);
        }
        App.Actions.saveCurrentScorecard();
        App.Modal.close();
        App.Toast.show("Scorecard details updated and saved", "success");
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

  async function generateDummyData() {
    const value = await App.Modal.prompt({
      title: "Generate dummy data",
      message: "Enter how many dummy scorecards to create from 0 to 200. This clears all saved scorecards first. Enter 0 to clear saved scorecards without generating replacements.",
      defaultValue: "200",
      placeholder: "0-200",
      confirmText: "Apply",
      cancelText: "Cancel"
    });

    if (value === null) return;

    const count = Number(String(value).trim());
    if (!Number.isInteger(count) || count < 0 || count > 200) {
      App.Toast.show("Enter a whole number from 0 to 200", "danger");
      return;
    }

    try {
      const generated = App.DevDataGenerator.generateScorecards(count);
      const newest = generated[generated.length - 1] || null;
      if (newest) {
        App.Storage.setLastOpenScorecardId(newest.id);
        App.State.setScorecard(newest, { dirty: false });
        App.Toast.show(`Generated ${generated.length} dummy scorecards`, "success");
      } else {
        const starter = App.ScorecardFactory.createScorecard(App.Constants.DEFAULT_SCORECARD);
        App.State.setScorecard(starter, { dirty: true });
        App.Toast.show("Cleared saved scorecards", "success");
      }
    } catch (error) {
      console.error(error);
      App.Toast.show("Could not generate dummy data", "danger");
    }
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
        importBundledCustomTargetFaces(scorecard);
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
    const exportData = App.Storage.structuredCloneSafe(scorecard);
    const actualFace = App.TargetFaces.getTargetFace(exportData.originalTargetFaceId || exportData.activeViewTargetFaceId);
    exportData.originalTargetFaceId = actualFace.id;
    exportData.activeViewTargetFaceId = actualFace.id;
    const customTargetFaces = getReferencedCustomTargetFaces(exportData);
    if (customTargetFaces.length) exportData.customTargetFaces = customTargetFaces;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
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

  function getReferencedCustomTargetFaces(scorecard) {
    const ids = new Set([
      scorecard.originalTargetFaceId,
      scorecard.activeViewTargetFaceId
    ].filter(Boolean));
    return Array.from(ids)
      .map(id => App.TargetFaces.getTargetFace(id))
      .filter(face => face && face.isCustom)
      .map(face => App.Storage.structuredCloneSafe(face));
  }

  function importBundledCustomTargetFaces(scorecard) {
    if (!Array.isArray(scorecard.customTargetFaces)) return;
    scorecard.customTargetFaces.forEach(face => {
      try {
        App.TargetFaces.saveCustomTargetFace(face);
      } catch (error) {
        console.warn("Could not import custom target face", error);
      }
    });
    delete scorecard.customTargetFaces;
  }

  function renderTargetFaceOptions(selectedId) {
    const groups = App.TargetFaces.getTargetFaceGroups();
    return Object.entries(groups).map(([family, faces]) => {
      const options = faces.map(face => `<option value="${escapeHtml(face.id)}" ${face.id === selectedId ? "selected" : ""}>${escapeHtml(face.name)}</option>`).join("");
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
