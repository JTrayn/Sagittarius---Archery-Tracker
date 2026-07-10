(function () {
  const App = window.ArcheryApp;
  const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function openScorecardBrowser() {
    const scorecards = App.Storage.listScorecards();
    const body = scorecards.length ? renderBrowser(scorecards) : `<div class="empty-state"><div><strong>No saved scorecards</strong><p>Save your current scorecard and it will appear here.</p></div></div>`;
    App.Modal.open("Scorecard manager", body, modalBody => bindScorecardBrowserEvents(modalBody, scorecards));
  }

  function renderBrowser(scorecards) {
    const today = new Date();
    const selectedDateKey = App.Dates.getDateKey(today);
    const dateIndex = buildDateIndex(scorecards);

    return `<div class="scorecard-browser" data-scorecard-browser>
      <div class="scorecard-browser-toolbar">
        <label class="scorecard-search-label">
          <span>Search scorecards</span>
          <input class="scorecard-search-input" type="search" placeholder="Name, target, notes..." autocomplete="off" />
        </label>
        <div class="scorecard-browser-count"><strong>${scorecards.length}</strong> saved</div>
      </div>
      <div class="scorecard-browser-grid">
        <aside class="scorecard-calendar-panel" aria-label="Scorecard calendar">
          <div class="scorecard-calendar" data-scorecard-calendar>
            ${renderCalendar(today, dateIndex, selectedDateKey)}
          </div>
        </aside>
        <section class="scorecard-list-panel" aria-label="Saved scorecard list">
          <div class="scorecard-list-scroll" data-scorecard-list-scroll>
            <div class="scorecard-list" data-scorecard-list>
              ${renderList(scorecards)}
            </div>
          </div>
        </section>
      </div>
    </div>`;
  }

  function renderList(scorecards) {
    if (!scorecards.length) {
      return `<div class="empty-state compact"><div><strong>No matching scorecards</strong><p>Try a different search term.</p></div></div>`;
    }

    return groupScorecardsByDate(scorecards).map(group => `
      <section class="scorecard-date-group" data-date-key="${escapeHtml(group.key)}">
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
    const targetPreview = renderTargetPreviewSvg(scorecard);
    const shotAt = scorecard.shotAt || scorecard.createdAt;
    const dateText = formatDateCompact(shotAt);
    const timeText = formatTimeOnly(shotAt);
    const distanceText = formatDistance(scorecard.distanceM);
    const arrowText = formatArrowCount(scorecard.arrows, scorecard.totalArrows);
    const scoreText = formatScore(scorecard.total, scorecard.possibleTotal);

    return `<div class="scorecard-list-item ${isCurrent ? "current" : ""}" data-scorecard-id="${scorecard.id}">
      <div class="scorecard-card-main">
        <div class="scorecard-entry-topline">
          <div class="scorecard-card-title-row">
            <h3>${escapeHtml(scorecard.name || "Untitled Scorecard")}</h3>
            ${isCurrent ? `<span class="mini-badge">Open</span>` : ""}
            ${scorecard.isComparisonView ? `<span class="mini-badge compare">Comparison</span>` : ""}
          </div>
          <div class="scorecard-row-actions" aria-label="Scorecard actions">
            <button class="btn btn-small load-scorecard scorecard-action-text" type="button">Open</button>
            <button class="btn btn-small rename-scorecard scorecard-action-text" type="button">Rename</button>
            <button class="btn btn-small scorecard-action-icon duplicate-scorecard" type="button" title="Duplicate scorecard" aria-label="Duplicate scorecard">${renderActionIcon("duplicate")}</button>
            <button class="btn btn-small scorecard-action-icon export-scorecard" type="button" title="Export scorecard" aria-label="Export scorecard">${renderActionIcon("export")}</button>
            <button class="btn btn-small scorecard-action-icon scorecard-action-danger delete-scorecard" type="button" title="Delete scorecard" aria-label="Delete scorecard">${renderActionIcon("delete")}</button>
          </div>
        </div>
        <div class="scorecard-entry-layout">
          <div class="scorecard-visual-card" aria-label="Scorecard details">
            <div class="scorecard-visual-target" aria-hidden="true">${targetPreview}</div>
            <div class="scorecard-visual-details">
              <span class="scorecard-visual-kicker">Scorecard</span>
              <strong class="scorecard-visual-title" title="${targetText}">${targetText}</strong>
              <div class="scorecard-visual-metrics" aria-label="Distance and arrows">
                <span><strong>${escapeHtml(distanceText)}</strong><small>Distance</small></span>
                <span><strong>${escapeHtml(arrowText)}</strong><small>Arrows</small></span>
              </div>
            </div>
          </div>
          <div class="scorecard-entry-facts" aria-label="Date, time and score">
            <div class="scorecard-entry-fact"><span>Date</span><strong>${escapeHtml(dateText)}</strong></div>
            <div class="scorecard-entry-fact"><span>Time</span><strong>${escapeHtml(timeText)}</strong></div>
            <div class="scorecard-entry-fact score"><span>Score</span><strong>${escapeHtml(scoreText)}</strong></div>
          </div>
        </div>
        ${notePreview}
      </div>
    </div>`;
  }

  function renderActionIcon(type) {
    if (type === "duplicate") {
      return `<svg class="scorecard-action-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="7" width="11" height="11" rx="2.4"></rect><path d="M6 14H5.7A2.7 2.7 0 0 1 3 11.3V5.7A2.7 2.7 0 0 1 5.7 3h5.6A2.7 2.7 0 0 1 14 5.7V6"></path></svg>`;
    }
    if (type === "export") {
      return `<svg class="scorecard-action-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v11"></path><path d="m8 10 4 4 4-4"></path><path d="M5 15v2.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V15"></path></svg>`;
    }
    return `<svg class="scorecard-action-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 6.5 17.5 17.5"></path><path d="m17.5 6.5-11 11"></path></svg>`;
  }

  function bindScorecardBrowserEvents(body, initialScorecards) {
    if (!initialScorecards.length) return;

    let scorecards = initialScorecards.slice();
    let visibleScorecards = scorecards.slice();
    let calendarMonth = getMonthStart(new Date());
    let selectedDateKey = App.Dates.getDateKey(new Date());
    let dateJumpTimer = null;

    const list = body.querySelector("[data-scorecard-list]");
    const listScroll = body.querySelector("[data-scorecard-list-scroll]");
    const calendar = body.querySelector("[data-scorecard-calendar]");
    const searchInput = body.querySelector(".scorecard-search-input");
    const countEl = body.querySelector(".scorecard-browser-count");

    function refreshBrowser() {
      visibleScorecards = filterScorecards(scorecards, searchInput ? searchInput.value : "");
      if (list) list.innerHTML = renderList(visibleScorecards);
      renderCalendarForCurrentState();
      updateCount(countEl, visibleScorecards.length, scorecards.length, searchInput ? searchInput.value : "");
    }

    function renderCalendarForCurrentState() {
      if (!calendar) return;
      calendar.innerHTML = renderCalendar(calendarMonth, buildDateIndex(visibleScorecards), selectedDateKey);
    }

    if (searchInput) {
      searchInput.addEventListener("input", refreshBrowser);
    }

    body.addEventListener("click", async event => {
      const calendarNav = event.target.closest("[data-calendar-nav]");
      if (calendarNav) {
        const direction = calendarNav.dataset.calendarNav === "next" ? 1 : -1;
        calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + direction, 1);
        renderCalendarForCurrentState();
        return;
      }

      const dayButton = event.target.closest(".scorecard-calendar-day");
      if (dayButton) {
        const dateKey = dayButton.dataset.dateKey;
        if (!dateKey) return;
        selectedDateKey = dateKey;
        const clickedDate = parseDateKey(dateKey);
        if (clickedDate) calendarMonth = getMonthStart(clickedDate);
        renderCalendarForCurrentState();
        scrollListToDate(dateKey, { showEmptyToast: true });
        return;
      }

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
        refreshBrowser();
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
        selectedDateKey = App.Dates.getDateKey(copy.shotAt || copy.createdAt);
        const copyDate = parseDateKey(selectedDateKey);
        if (copyDate) calendarMonth = getMonthStart(copyDate);
        refreshBrowser();
        requestAnimationFrame(() => scrollListToDate(selectedDateKey));
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
        refreshBrowser();
        App.Toast.show("Scorecard deleted", "success");
      }
    });

    function scrollListToDate(dateKey, options = {}) {
      if (!list || !listScroll) return;
      const group = list.querySelector(`.scorecard-date-group[data-date-key="${dateKey}"]`);
      if (!group) {
        if (options.showEmptyToast) App.Toast.show("No matching scorecards for that day", "warning");
        return;
      }

      const listBounds = listScroll.getBoundingClientRect();
      const groupBounds = group.getBoundingClientRect();
      const targetTop = groupBounds.top - listBounds.top + listScroll.scrollTop - 6;
      listScroll.scrollTo({ top: Math.max(targetTop, 0), behavior: "smooth" });

      if (dateJumpTimer) window.clearTimeout(dateJumpTimer);
      list.querySelectorAll(".scorecard-date-group.is-calendar-jump").forEach(node => node.classList.remove("is-calendar-jump"));
      group.classList.add("is-calendar-jump");
      dateJumpTimer = window.setTimeout(() => {
        group.classList.remove("is-calendar-jump");
        dateJumpTimer = null;
      }, 1000);
    }
  }

  function renderCalendar(monthDate, dateIndex, selectedDateKey) {
    const month = getMonthStart(monthDate);
    const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month);
    const cells = getCalendarCells(month);

    return `<div class="scorecard-calendar-shell">
      <div class="scorecard-calendar-header">
        <button class="icon-btn scorecard-calendar-nav" type="button" data-calendar-nav="prev" aria-label="Previous month">‹</button>
        <div class="scorecard-calendar-title">${escapeHtml(monthLabel)}</div>
        <button class="icon-btn scorecard-calendar-nav" type="button" data-calendar-nav="next" aria-label="Next month">›</button>
      </div>
      <div class="scorecard-calendar-weekdays" aria-hidden="true">
        ${WEEKDAY_LABELS.map(label => `<span>${label}</span>`).join("")}
      </div>
      <div class="scorecard-calendar-grid">
        ${cells.map(cell => cell ? renderCalendarDay(cell, dateIndex, selectedDateKey) : renderCalendarBlank()).join("")}
      </div>
    </div>`;
  }

  function renderCalendarDay(date, dateIndex, selectedDateKey) {
    const dateKey = App.Dates.getDateKey(date);
    const count = dateIndex.get(dateKey) || 0;
    const classes = [
      "scorecard-calendar-day",
      "is-current-month",
      count ? "has-scorecards" : "",
      dateKey === selectedDateKey ? "is-selected" : ""
    ].filter(Boolean).join(" ");
    const label = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
    const scorecardText = count ? `${count} saved ${count === 1 ? "scorecard" : "scorecards"}` : "No saved scorecards";

    return `<button class="${classes}" type="button" data-date-key="${dateKey}" aria-label="${escapeHtml(`${label}. ${scorecardText}.`)}">
      <span class="scorecard-calendar-number">${date.getDate()}</span>
      ${count ? `<span class="scorecard-calendar-marker" aria-hidden="true">${count > 1 ? count : ""}</span>` : ""}
    </button>`;
  }

  function renderCalendarBlank() {
    return `<span class="scorecard-calendar-empty" aria-hidden="true"></span>`;
  }

  function getCalendarCells(monthDate) {
    const firstOfMonth = getMonthStart(monthDate);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
    const leadingBlanks = Array.from({ length: startOffset }, () => null);
    const monthDays = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(firstOfMonth);
      date.setDate(index + 1);
      return date;
    });
    return leadingBlanks.concat(monthDays);
  }

  function getMonthStart(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return getMonthStart(new Date());
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function parseDateKey(value) {
    const parts = String(value || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function buildDateIndex(scorecards) {
    const index = new Map();
    scorecards.forEach(scorecard => {
      const key = App.Dates.getDateKey(scorecard.shotAt || scorecard.createdAt);
      index.set(key, (index.get(key) || 0) + 1);
    });
    return index;
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

  function updateCount(element, visibleCount, totalCount, query) {
    if (!element) return;
    const hasQuery = Boolean(String(query || "").trim());
    if (hasQuery) {
      element.innerHTML = `<strong>${visibleCount}</strong> matching · ${totalCount} saved`;
      return;
    }
    element.innerHTML = `<strong>${totalCount}</strong> saved`;
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

  function renderTargetPreviewSvg(scorecard) {
    const targetFace = App.TargetFaces.getTargetFace(scorecard.originalTargetFaceId || scorecard.targetFaceId);
    const zones = Array.isArray(targetFace?.zones)
      ? targetFace.zones.slice().filter(zone => Number(zone.radiusMm) > 0)
      : [];
    if (!zones.length) return `<span class="scorecard-target-preview-fallback">?</span>`;

    zones.sort((a, b) => Number(b.radiusMm) - Number(a.radiusMm));
    const outerRadius = zones.reduce((max, zone) => Math.max(max, Number(zone.radiusMm) || 0), 0) || 1;
    const circles = zones.map(zone => {
      const radius = (Number(zone.radiusMm) || 0) / outerRadius * 46;
      const strokeWidth = Math.max(0.34, ((Number(zone.strokeWidthMm) || 0.8) / outerRadius) * 46);
      return `<circle cx="50" cy="50" r="${roundSvg(radius)}" fill="${escapeHtml(zone.fill || "#f6f1de")}" stroke="${escapeHtml(zone.stroke || "rgba(4,12,18,0.75)")}" stroke-width="${roundSvg(strokeWidth)}" />`;
    }).join("");

    const centreZone = getCentreLabelZone(targetFace);
    const centre = centreZone
      ? `<text x="50" y="54" text-anchor="middle" font-size="15" font-weight="950" fill="${escapeHtml(getPreviewLabelColour(centreZone, targetFace))}">${escapeHtml(centreZone.targetLabel || centreZone.label)}</text>`
      : targetFace?.centreLabel
        ? `<text x="50" y="54" text-anchor="middle" font-size="15" font-weight="950" fill="${escapeHtml(targetFace.centreLabel.fill || "#ff3347")}">${escapeHtml(targetFace.centreLabel.text || "X")}</text>`
        : `<path d="M45 50h10M50 45v10" stroke="rgba(4,12,18,0.72)" stroke-width="1.15" stroke-linecap="round" />`;

    return `<svg class="scorecard-target-preview-svg" viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(targetFace.shortName || targetFace.name || "Target face")} preview">${circles}${centre}</svg>`;
  }

  function getCentreLabelZone(targetFace) {
    if (!Array.isArray(targetFace?.zones)) return null;
    return targetFace.zones.find(zone => zone.labelPosition === "center" && String(zone.label || "").trim()) || null;
  }

  function getPreviewLabelColour(zone, targetFace) {
    const autoContrast = targetFace?.labels?.autoContrast !== false;
    return autoContrast ? previewLabelTextColour(zone.fill) : (zone.labelFill || previewLabelTextColour(zone.fill));
  }

  function previewLabelTextColour(fill) {
    const normalized = String(fill || "").toLowerCase();
    const darkFills = ["#20252b", "#2684d9", "#e44242", "#080b0f", "#000000", "#111111"];
    return darkFills.includes(normalized) ? "#f8fbff" : "#121820";
  }

  function roundSvg(value) {
    return Number(value).toFixed(3).replace(/\.?0+$/, "");
  }

  function formatDateCompact(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit"
    }).format(date);
  }

  function formatTimeOnly(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatDistance(value) {
    const distance = Number(value);
    if (!Number.isFinite(distance) || distance <= 0) return "?m";
    return `${Number.isInteger(distance) ? distance : distance.toFixed(1)}m`;
  }

  function formatArrowCount(arrows, totalArrows) {
    const shot = Number(arrows) || 0;
    const total = Number(totalArrows) || 0;
    return total ? `${shot}/${total}` : `${shot}`;
  }

  function formatScore(total, possibleTotal) {
    const value = Number(total) || 0;
    const max = Number(possibleTotal) || 0;
    return max ? `${value}/${max}` : `${value}`;
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
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  App.ScorecardBrowser = { openScorecardBrowser };
})();
