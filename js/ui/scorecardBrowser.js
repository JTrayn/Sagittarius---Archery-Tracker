(function () {
  const App = window.ArcheryApp;

  function openScorecardBrowser() {
    const scorecards = App.Storage.listScorecards();
    const body = scorecards.length ? renderBrowser(scorecards) : `<div class="empty-state"><div><strong>No saved scorecards</strong><p>Save your current scorecard and it will appear here.</p></div></div>`;
    App.Modal.open("Saved Scorecards", body, modalBody => bindScorecardBrowserEvents(modalBody, scorecards));
  }

  function renderBrowser(scorecards) {
    return `<div class="scorecard-browser">
      <div class="scorecard-browser-toolbar">
        <label class="scorecard-search-label">
          <span>Search scorecards</span>
          <input class="scorecard-search-input" type="search" placeholder="Name, target, notes..." autocomplete="off" />
        </label>
        <div class="scorecard-browser-count"><strong>${scorecards.length}</strong> saved</div>
      </div>
      <div class="scorecard-list" data-scorecard-list>
        ${renderList(scorecards)}
      </div>
    </div>`;
  }

  function renderList(scorecards) {
    if (!scorecards.length) {
      return `<div class="empty-state compact"><div><strong>No matching scorecards</strong><p>Try a different search term.</p></div></div>`;
    }

    return groupScorecardsByDate(scorecards).map(group => `
      <section class="scorecard-date-group">
        <div class="scorecard-date-heading">
          <h3>${escapeHtml(group.label)}</h3>
          <span>${group.scorecards.length} ${group.scorecards.length === 1 ? "scorecard" : "scorecards"}</span>
        </div>
        <div class="scorecard-date-items">
          ${group.scorecards.map(renderScorecardItem).join("")}
        </div>
      </section>
    `).join("");
  }

  function renderScorecardItem(scorecard) {
    const currentId = App.State.getState().scorecard && App.State.getState().scorecard.id;
    const isCurrent = currentId === scorecard.id;
    const notePreview = scorecard.notes ? `<p class="scorecard-note-preview">${escapeHtml(trimText(scorecard.notes, 120))}</p>` : "";
    const targetText = renderTargetSummary(scorecard);
    return `<div class="scorecard-list-item ${isCurrent ? "current" : ""}" data-scorecard-id="${scorecard.id}">
      <div class="scorecard-card-main">
        <div class="scorecard-card-title-row">
          <h3>${escapeHtml(scorecard.name || "Untitled Scorecard")}</h3>
          ${isCurrent ? `<span class="mini-badge">Open</span>` : ""}
          ${scorecard.isComparisonView ? `<span class="mini-badge compare">Comparison</span>` : ""}
        </div>
        <p>${App.Dates.formatDateTime(scorecard.shotAt || scorecard.createdAt)} · ${targetText} · ${scorecard.distanceM || "?"}m</p>
        <p>${scorecard.arrows || 0}/${scorecard.totalArrows || 0} arrows · ${scorecard.total || 0}/${scorecard.possibleTotal || 0} pts · ${scorecard.xCount || 0} X · ${scorecard.missCount || 0} miss</p>
        ${notePreview}
      </div>
      <div class="scorecard-row-actions">
        <button class="btn btn-small load-scorecard" type="button">Open</button>
        <button class="btn btn-small rename-scorecard" type="button">Rename</button>
        <button class="btn btn-small duplicate-scorecard" type="button">Duplicate</button>
        <button class="btn btn-small export-scorecard" type="button">Export</button>
        <button class="btn btn-small danger-btn delete-scorecard" type="button">Delete</button>
      </div>
    </div>`;
  }

  function bindScorecardBrowserEvents(body, initialScorecards) {
    let scorecards = initialScorecards.slice();
    const list = body.querySelector("[data-scorecard-list]");
    const searchInput = body.querySelector(".scorecard-search-input");
    const countEl = body.querySelector(".scorecard-browser-count");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        list.innerHTML = renderList(filterScorecards(scorecards, searchInput.value));
      });
    }

    body.addEventListener("click", async event => {
      const item = event.target.closest(".scorecard-list-item");
      if (!item) return;
      const scorecardId = item.dataset.scorecardId;
      const summary = scorecards.find(scorecard => scorecard.id === scorecardId);
      const scorecardName = summary ? summary.name || "Untitled Scorecard" : "Untitled Scorecard";

      if (event.target.closest(".load-scorecard")) {
        if (!(await App.Actions.confirmDiscardUnsaved("Current scorecard has unsaved changes. Open this saved scorecard anyway?"))) return;
        const scorecard = App.Actions.loadScorecard(scorecardId);
        if (scorecard) {
          App.Modal.close();
          App.Toast.show("Scorecard loaded", "success");
        } else {
          App.Toast.show("Could not load that scorecard", "danger");
        }
        return;
      }

      if (event.target.closest(".rename-scorecard")) {
        const nextName = await App.Modal.prompt({
          title: "Rename scorecard",
          message: "Enter a new name for this saved scorecard.",
          defaultValue: scorecardName,
          confirmText: "Rename",
          cancelText: "Cancel"
        });
        if (nextName === null) return;
        const saved = App.Actions.renameSavedScorecard(scorecardId, nextName);
        if (!saved) {
          App.Toast.show("Could not rename that scorecard", "danger");
          return;
        }
        scorecards = App.Storage.listScorecards();
        updateCount(countEl, scorecards.length);
        list.innerHTML = renderList(filterScorecards(scorecards, searchInput ? searchInput.value : ""));
        App.Toast.show("Scorecard renamed", "success");
        return;
      }

      if (event.target.closest(".duplicate-scorecard")) {
        const copy = App.Actions.duplicateSavedScorecard(scorecardId);
        if (!copy) {
          App.Toast.show("Could not duplicate that scorecard", "danger");
          return;
        }
        scorecards = App.Storage.listScorecards();
        updateCount(countEl, scorecards.length);
        list.innerHTML = renderList(filterScorecards(scorecards, searchInput ? searchInput.value : ""));
        App.Toast.show("Scorecard duplicated", "success");
        return;
      }

      if (event.target.closest(".export-scorecard")) {
        const scorecard = App.Storage.loadScorecard(scorecardId);
        if (!scorecard) {
          App.Toast.show("Could not export that scorecard", "danger");
          return;
        }
        App.TopControls.downloadScorecardJson(scorecard);
        App.Toast.show("Scorecard exported", "success");
        return;
      }

      if (event.target.closest(".delete-scorecard")) {
        const shouldDelete = await App.Modal.confirm({
          title: "Delete scorecard",
          message: `Delete "${scorecardName}"?\n\nThis removes the saved local copy. This cannot be undone.`,
          confirmText: "Delete",
          cancelText: "Cancel",
          variant: "danger"
        });
        if (!shouldDelete) return;
        App.Actions.deleteSavedScorecard(scorecardId);
        scorecards = App.Storage.listScorecards();
        updateCount(countEl, scorecards.length);
        list.innerHTML = renderList(filterScorecards(scorecards, searchInput ? searchInput.value : ""));
        App.Toast.show("Scorecard deleted", "success");
      }
    });
  }

  function groupScorecardsByDate(scorecards) {
    const sorted = scorecards.slice().sort((a, b) => {
      const aTime = new Date(a.shotAt || a.createdAt || 0).getTime() || 0;
      const bTime = new Date(b.shotAt || b.createdAt || 0).getTime() || 0;
      return bTime - aTime;
    });

    const groupsByKey = new Map();
    sorted.forEach(scorecard => {
      const value = scorecard.shotAt || scorecard.createdAt;
      const key = App.Dates.getDateKey(value);
      if (!groupsByKey.has(key)) {
        groupsByKey.set(key, {
          key,
          label: App.Dates.formatDateOnly(value),
          scorecards: []
        });
      }
      groupsByKey.get(key).scorecards.push(scorecard);
    });

    return Array.from(groupsByKey.values());
  }

  function updateCount(element, count) {
    if (!element) return;
    element.innerHTML = `<strong>${count}</strong> saved`;
  }

  function filterScorecards(scorecards, query) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return scorecards;
    return scorecards.filter(scorecard => {
      const haystack = [
        scorecard.name,
        scorecard.targetFaceName,
        scorecard.targetFaceId,
        scorecard.originalTargetFaceName,
        scorecard.originalTargetFaceId,
        scorecard.distanceM,
        scorecard.notes,
        App.Dates.formatDateOnly(scorecard.shotAt || scorecard.createdAt),
        App.Dates.formatDateTime(scorecard.shotAt || scorecard.createdAt)
      ].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }

  function renderTargetSummary(scorecard) {
    const active = escapeHtml(scorecard.targetFaceName || scorecard.targetFaceId || "Target");
    const original = escapeHtml(scorecard.originalTargetFaceName || scorecard.originalTargetFaceId || active);
    if (scorecard.isComparisonView && original !== active) {
      return `Shot ${original} · Scoring ${active}`;
    }
    return active;
  }

  function trimText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  App.ScorecardBrowser = { openScorecardBrowser };
})();
