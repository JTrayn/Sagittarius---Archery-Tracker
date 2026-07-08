(function () {
  const App = window.ArcheryApp;

  const METRIC_TOOLTIPS = {
    avgArrow: "The average score of each arrow. Manually recorded arrows are included as plot data is not relevant.",
    avgCentre: "The average distance to the centre of the target. Manually recorded arrows are ignored due to lack of plot data.",
    mpi: "Mean point of impact. The average physical landing position of the arrows. The value represents the distance from the centre of the target, and the arrow represents the direction of the offset. Manually recorded arrows are ignored due to lack of plot data."
  };

  function findZoneForScore(score, targetFace) {
    if (!score || !targetFace || !Array.isArray(targetFace.zones)) return null;
    if (score.zoneId) {
      const byId = targetFace.zones.find(zone => zone.id === score.zoneId);
      if (byId) return byId;
    }
    const label = String(score.label || "").toLowerCase();
    return targetFace.zones.find(zone => String(zone.label || "").toLowerCase() === label) || null;
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return null;
    const normalized = hex.trim().replace(/^#/, "");
    const short = normalized.length === 3
      ? normalized.split("").map(char => char + char).join("")
      : normalized;
    if (!/^[0-9a-f]{6}$/i.test(short)) return null;
    return {
      r: parseInt(short.slice(0, 2), 16),
      g: parseInt(short.slice(2, 4), 16),
      b: parseInt(short.slice(4, 6), 16)
    };
  }

  function relativeLuminance(rgb) {
    if (!rgb) return 0.5;
    const channel = value => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function contrastRatio(lumA, lumB) {
    const light = Math.max(lumA, lumB);
    const dark = Math.min(lumA, lumB);
    return (light + 0.05) / (dark + 0.05);
  }

  function alphaMix(foreground, background, alpha) {
    return {
      r: Math.round(foreground.r * alpha + background.r * (1 - alpha)),
      g: Math.round(foreground.g * alpha + background.g * (1 - alpha)),
      b: Math.round(foreground.b * alpha + background.b * (1 - alpha))
    };
  }

  function rgbToCss(rgb) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  function scoreStyle(score, targetFace) {
    if (!score || score.isMiss) return "";
    const zone = findZoneForScore(score, targetFace);
    const colour = zone?.fill;
    const rgb = hexToRgb(colour);
    if (!colour || !rgb) return "";

    const black = hexToRgb("#050b12");
    const white = hexToRgb("#ffffff");
    const bgLuminance = relativeLuminance(rgb);
    const blackContrast = contrastRatio(bgLuminance, relativeLuminance(black));
    const whiteContrast = contrastRatio(bgLuminance, relativeLuminance(white));
    const textColour = blackContrast >= whiteContrast ? "#050b12" : "#ffffff";
    const borderRgb = textColour === "#050b12"
      ? alphaMix(black, rgb, 0.28)
      : alphaMix(white, rgb, 0.24);

    return [
      `--score-zone-bg: ${colour}`,
      `--score-zone-text: ${textColour}`,
      `--score-zone-border: ${rgbToCss(borderRgb)}`
    ].join("; ");
  }

  class ScorecardView {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options;
      this.layoutMode = "ends";
      this.lastState = null;
    }

    render(state) {
      this.lastState = state;
      if (!state.scorecard) {
        this.container.innerHTML = `<div class="empty-state"><div><strong>No scorecard yet</strong><p>Create a new scorecard to begin scoring.</p></div></div>`;
        return;
      }

      const html = this.layoutMode === "arrows"
        ? this.renderArrowPositionLayout(state)
        : this.renderEndLayout(state);

      this.container.innerHTML = `${html}
        <div class="scorecard-layout-controls">
          <button class="btn btn-small scorecard-layout-toggle" type="button" aria-pressed="${this.layoutMode === "arrows" ? "true" : "false"}" title="Invert scorecard rows and columns">
            <span class="scorecard-layout-toggle-icon" aria-hidden="true">⇄</span>
            <span>Invert</span>
          </button>
        </div>`;
    }

    renderEndLayout(state) {
      const scorecard = state.scorecard;
      const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
      const scoringOptions = App.Extrapolation.getProjectedScoreOptions(scorecard, state.viewport);
      const timelineActive = App.TimelineRenderer.isActive(state.viewport);
      const revealLookup = timelineActive ? App.TimelineRenderer.buildRevealLookup(scorecard, state.viewport) : null;
      const scoringScorecard = timelineActive ? App.TimelineRenderer.getScorecardForScoring(scorecard, state.viewport) : scorecard;
      const arrowsPerEnd = getArrowsPerEnd(scorecard);
      const bestHighlights = calculateBestHighlights({
        scorecard,
        scoringScorecard,
        targetFace,
        scoringOptions,
        timelineActive,
        revealLookup,
        arrowsPerEnd
      });
      const scorecardFocus = state.viewport.scorecardFocus || null;
      let runningTotal = 0;

      const headers = Array.from({ length: arrowsPerEnd }, (_, index) => {
        const isFocused = isScorecardFocusActive(scorecardFocus, "arrow", index);
        const classes = ["arrow-score-header", "scorecard-focus-trigger", isFocused ? "scorecard-focus-active" : ""].filter(Boolean).join(" ");
        const label = `A${index + 1}`;
        return `<th class="${classes}" role="button" tabindex="0" data-scorecard-focus-type="arrow" data-scorecard-focus-index="${index}" aria-label="Highlight ${label} arrows on target" title="Highlight ${label} arrows on target">${label}</th>`;
      }).join("");
      const rows = scorecard.ends.map((end, endIndex) => {
        const scoringEnd = scoringScorecard.ends[endIndex] || end;
        const endStats = App.ScoringEngine.calculateEndStats(scoringEnd, targetFace, scoringOptions);
        const endTotal = endStats.total;
        runningTotal += endTotal;
        const averageArrowText = formatAverageScore(endStats.averageArrowScore);
        const averageCentreText = formatAverageDistance(endStats.averageDistanceFromCentreMm);
        const endMpi = calculateEndMpi(scoringEnd, scoringOptions);
        const endMpiHtml = renderEndMpi(endMpi, `End ${endIndex + 1}`);

        const isBestEnd = bestHighlights.bestEndIndex === endIndex;
        const isEndFocused = isScorecardFocusActive(scorecardFocus, "end", endIndex);
        const arrowCells = Array.from({ length: arrowsPerEnd }, (_, arrowIndex) => {
          const arrow = end.arrows[arrowIndex];
          if (!arrow) return `<td class="arrow-score-slot"></td>`;
          const revealEntry = revealLookup ? revealLookup.get(`${endIndex}:${arrowIndex}`) : null;
          return renderArrowCell({
            state,
            arrow,
            targetFace,
            scoringOptions,
            timelineActive,
            revealEntry,
            endIndex,
            arrowIndex,
            title: `End ${endIndex + 1}, Arrow ${arrowIndex + 1}`
          });
        }).join("");

        return `<tr class="${isBestEnd ? "best-scorecard-row best-end-row" : ""}">
          <td class="end-label scorecard-focus-trigger ${isEndFocused ? "scorecard-focus-active" : ""}" role="button" tabindex="0" data-scorecard-focus-type="end" data-scorecard-focus-index="${endIndex}" aria-label="Highlight End ${endIndex + 1} arrows on target" title="Highlight End ${endIndex + 1} arrows on target">${endIndex + 1}</td>
          ${arrowCells}
          <td class="average-arrow-cell">${averageArrowText}</td>
          <td class="average-centre-cell">${averageCentreText}</td>
          <td class="mpi-cell">${endMpiHtml}</td>
          <td class="total-cell score-highlight-cell">${endTotal}</td>
          <td class="running-cell score-highlight-cell">${runningTotal}</td>
        </tr>`;
      }).join("");

      return `<div class="scorecard-table-stage" data-scorecard-layout="ends">
        <table class="scorecard-table">
          <thead>
            <tr>
              <th>End</th>
              ${headers}
              ${renderMetricHeader("Avg Arrow", METRIC_TOOLTIPS.avgArrow)}
              ${renderMetricHeader("Avg Centre", METRIC_TOOLTIPS.avgCentre)}
              ${renderMetricHeader("MPI", METRIC_TOOLTIPS.mpi)}
              <th class="score-highlight-header">Total</th>
              <th class="score-highlight-header">Run</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    renderArrowPositionLayout(state) {
      const scorecard = state.scorecard;
      const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
      const scoringOptions = App.Extrapolation.getProjectedScoreOptions(scorecard, state.viewport);
      const timelineActive = App.TimelineRenderer.isActive(state.viewport);
      const revealLookup = timelineActive ? App.TimelineRenderer.buildRevealLookup(scorecard, state.viewport) : null;
      const scoringScorecard = timelineActive ? App.TimelineRenderer.getScorecardForScoring(scorecard, state.viewport) : scorecard;
      const arrowsPerEnd = getArrowsPerEnd(scorecard);
      const bestHighlights = calculateBestHighlights({
        scorecard,
        scoringScorecard,
        targetFace,
        scoringOptions,
        timelineActive,
        revealLookup,
        arrowsPerEnd
      });
      const scorecardFocus = state.viewport.scorecardFocus || null;
      let runningTotal = 0;

      const endHeaders = scorecard.ends.map((end, endIndex) => {
        const isFocused = isScorecardFocusActive(scorecardFocus, "end", endIndex);
        const classes = ["arrow-score-header", "inverted-end-header", "scorecard-focus-trigger", isFocused ? "scorecard-focus-active" : ""].filter(Boolean).join(" ");
        const label = `E${endIndex + 1}`;
        return `<th class="${classes}" role="button" tabindex="0" data-scorecard-focus-type="end" data-scorecard-focus-index="${endIndex}" aria-label="Highlight End ${endIndex + 1} arrows on target" title="Highlight End ${endIndex + 1} arrows on target">${label}</th>`;
      }).join("");
      const rows = Array.from({ length: arrowsPerEnd }, (_, arrowIndex) => {
        const rowStats = calculateArrowPositionStats(scorecard, targetFace, scoringOptions, timelineActive, revealLookup, arrowIndex);
        const isBestArrow = bestHighlights.bestArrowIndex === arrowIndex;
        const isArrowFocused = isScorecardFocusActive(scorecardFocus, "arrow", arrowIndex);
        runningTotal += rowStats.total;
        const cells = scorecard.ends.map((end, endIndex) => {
          const arrow = end.arrows[arrowIndex];
          if (!arrow) return `<td class="arrow-score-slot"></td>`;
          const revealEntry = revealLookup ? revealLookup.get(`${endIndex}:${arrowIndex}`) : null;
          return renderArrowCell({
            state,
            arrow,
            targetFace,
            scoringOptions,
            timelineActive,
            revealEntry,
            endIndex,
            arrowIndex,
            title: `End ${endIndex + 1}, Arrow ${arrowIndex + 1}`
          });
        }).join("");

        return `<tr class="${isBestArrow ? "best-scorecard-row best-arrow-row" : ""}">
          <td class="end-label arrow-position-label scorecard-focus-trigger ${isArrowFocused ? "scorecard-focus-active" : ""}" role="button" tabindex="0" data-scorecard-focus-type="arrow" data-scorecard-focus-index="${arrowIndex}" aria-label="Highlight A${arrowIndex + 1} arrows on target" title="Highlight A${arrowIndex + 1} arrows on target">A${arrowIndex + 1}</td>
          ${cells}
          <td class="average-arrow-cell">${formatAverageScore(rowStats.averageArrowScore)}</td>
          <td class="average-centre-cell">${formatAverageDistance(rowStats.averageDistanceFromCentreMm)}</td>
          <td class="mpi-cell">${renderEndMpi(rowStats.mpi, `A${arrowIndex + 1}`)}</td>
          <td class="total-cell score-highlight-cell">${rowStats.total}</td>
          <td class="running-cell score-highlight-cell">${runningTotal}</td>
        </tr>`;
      }).join("");

      return `<div class="scorecard-table-stage is-inverted" data-scorecard-layout="arrows">
        <table class="scorecard-table scorecard-table-inverted">
          <thead>
            <tr>
              <th>Arrow</th>
              ${endHeaders}
              ${renderMetricHeader("Avg Arrow", METRIC_TOOLTIPS.avgArrow)}
              ${renderMetricHeader("Avg Centre", METRIC_TOOLTIPS.avgCentre)}
              ${renderMetricHeader("MPI", METRIC_TOOLTIPS.mpi)}
              <th class="score-highlight-header">Total</th>
              <th class="score-highlight-header">Run</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    bindEvents() {
      this.container.addEventListener("click", event => {
        const layoutToggle = event.target.closest(".scorecard-layout-toggle");
        if (layoutToggle) {
          this.toggleLayoutMode();
          return;
        }

        const focusTrigger = event.target.closest("[data-scorecard-focus-type]");
        if (focusTrigger) {
          this.handleScorecardFocusTrigger(focusTrigger);
          return;
        }

        const button = event.target.closest(".arrow-cell");
        if (!button) return;
        const state = App.State.getState();
        if (state.viewport.timeline?.enabled) return;
        App.Actions.selectArrow(Number(button.dataset.endIndex), Number(button.dataset.arrowIndex));
      });

      this.container.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const focusTrigger = event.target.closest("[data-scorecard-focus-type]");
        if (!focusTrigger) return;
        event.preventDefault();
        this.handleScorecardFocusTrigger(focusTrigger);
      });

      this.container.addEventListener("contextmenu", event => {
        const button = event.target.closest(".arrow-cell");
        if (!button) return;
        event.preventDefault();
        const state = App.State.getState();
        if (state.viewport.timeline?.enabled) {
          App.Toast.show("Exit Timeline before clearing arrows", "danger");
          return;
        }
        App.Actions.selectArrow(Number(button.dataset.endIndex), Number(button.dataset.arrowIndex));
        App.Actions.clearSelectedArrow();
        App.Toast.show("Arrow cleared", "success");
      });
    }

    handleScorecardFocusTrigger(trigger) {
      const type = trigger.dataset.scorecardFocusType;
      const index = Number(trigger.dataset.scorecardFocusIndex);
      const state = App.State.getState();
      const current = state.viewport.scorecardFocus;
      if (current && current.type === type && current.index === index) {
        App.Actions.clearScorecardFocus();
        return;
      }
      App.Actions.setScorecardFocus(type, index);
    }

    toggleLayoutMode() {
      this.layoutMode = this.layoutMode === "arrows" ? "ends" : "arrows";
      this.render(this.lastState || App.State.getState());
      this.options.onLayoutChange?.(this.layoutMode, this.container);
    }

    getLayoutMode() {
      return this.layoutMode;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderMetricHeader(label, tooltip) {
    const safeTooltip = escapeHtml(tooltip);
    return `<th class="metric-tooltip-header" tabindex="0" aria-label="${safeTooltip}" data-tooltip="${safeTooltip}"><span>${escapeHtml(label)}</span><span class="metric-info-dot" aria-hidden="true">?</span></th>`;
  }

  function isScorecardFocusActive(focus, type, index) {
    return Boolean(focus && focus.type === type && focus.index === index);
  }

  function renderArrowCell({ state, arrow, targetFace, scoringOptions, timelineActive, revealEntry, endIndex, arrowIndex, title, slotClass = "", slotStyle = "" }) {
    const isTimelineUnrevealed = timelineActive && revealEntry && !revealEntry.isRevealed;
    const scoringArrow = isTimelineUnrevealed
      ? { ...arrow, position: null, manualScore: null }
      : arrow;
    const score = App.ScoringEngine.scoreArrow(scoringArrow, targetFace, scoringOptions);
    const selected = !timelineActive && state.selected && state.selected.endIndex === endIndex && state.selected.arrowIndex === arrowIndex;
    const classes = [
      "arrow-cell",
      selected ? "selected" : "",
      revealEntry?.isCurrent ? "timeline-current" : "",
      isTimelineUnrevealed ? "timeline-unrevealed" : "",
      score ? App.ScoreFormatting.scoreClass(score) : "empty",
      !isTimelineUnrevealed && arrow.position ? "plotted" : "",
      !isTimelineUnrevealed && arrow.manualScore ? "manual" : ""
    ].filter(Boolean).join(" ");

    const style = isTimelineUnrevealed ? "" : scoreStyle(score, targetFace);
    const titlePrefix = timelineActive && revealEntry
      ? `${revealEntry.isRevealed ? "Revealed" : "Waiting"} · `
      : "";

    const slotClasses = ["arrow-score-slot", slotClass].filter(Boolean).join(" ");
    return `<td class="${slotClasses}"${slotStyle ? ` style="${slotStyle}"` : ""}>
      <button class="${classes}" type="button" data-end-index="${endIndex}" data-arrow-index="${arrowIndex}" data-cell-key="${endIndex}:${arrowIndex}" ${style ? `style="${style}"` : ""} title="${titlePrefix}${title}">${App.ScoreFormatting.arrowDisplay(score)}</button>
    </td>`;
  }

  function getArrowsPerEnd(scorecard) {
    if (!scorecard?.ends?.length) return 0;
    return Math.max(...scorecard.ends.map(end => (end.arrows || []).length));
  }

  function calculateBestHighlights({ scorecard, scoringScorecard, targetFace, scoringOptions, timelineActive, revealLookup, arrowsPerEnd }) {
    if (!isScorecardFullyRecorded(scoringScorecard, arrowsPerEnd)) {
      return { bestEndIndex: null, bestArrowIndex: null };
    }

    const zoneQualityOrder = buildZoneQualityOrder(targetFace);
    const bestEnd = pickBestCandidate((scoringScorecard?.ends || []).map((end, endIndex) => {
      const endStats = App.ScoringEngine.calculateEndStats(end, targetFace, scoringOptions);
      const mpi = calculateEndMpi(end, scoringOptions);
      const zoneQualityCounts = calculateEndZoneQualityCounts(end, targetFace, scoringOptions, zoneQualityOrder);
      return buildHighlightCandidate(endIndex, endStats, mpi, zoneQualityCounts);
    }));

    const arrowCandidates = Array.from({ length: arrowsPerEnd }, (_, arrowIndex) => {
      const stats = calculateArrowPositionStats(scorecard, targetFace, scoringOptions, timelineActive, revealLookup, arrowIndex, zoneQualityOrder);
      return buildHighlightCandidate(arrowIndex, stats, stats.mpi, stats.zoneQualityCounts);
    });
    const bestArrow = pickBestCandidate(arrowCandidates);

    return {
      bestEndIndex: bestEnd ? bestEnd.index : null,
      bestArrowIndex: bestArrow ? bestArrow.index : null
    };
  }

  function isScorecardFullyRecorded(scorecard, arrowsPerEnd) {
    const ends = Array.isArray(scorecard?.ends) ? scorecard.ends : [];
    const expectedArrowsPerEnd = Math.max(0, Number(arrowsPerEnd) || getArrowsPerEnd(scorecard));
    if (!ends.length || expectedArrowsPerEnd <= 0) return false;
    return ends.every(end => {
      const arrows = Array.isArray(end?.arrows) ? end.arrows : [];
      if (arrows.length < expectedArrowsPerEnd) return false;
      return arrows.slice(0, expectedArrowsPerEnd).every(arrow =>
        App.TimelineRenderer.isRecordedArrow(arrow)
      );
    });
  }

  function buildHighlightCandidate(index, stats, mpi, zoneQualityCounts) {
    if (!stats || stats.recordedArrows <= 0) return null;
    return {
      index,
      total: Number(stats.total) || 0,
      zoneQualityCounts: Array.isArray(zoneQualityCounts) ? zoneQualityCounts : [],
      averageCentreMm: Number.isFinite(stats.averageDistanceFromCentreMm) ? stats.averageDistanceFromCentreMm : null,
      mpiDistanceMm: mpi && Number.isFinite(mpi.distanceMm) ? mpi.distanceMm : null
    };
  }

  function pickBestCandidate(candidates) {
    return (candidates || []).filter(Boolean).reduce((best, candidate) => {
      if (!best) return candidate;
      return compareHighlightCandidates(candidate, best) > 0 ? candidate : best;
    }, null);
  }

  function compareHighlightCandidates(candidate, currentBest) {
    const scoreDiff = candidate.total - currentBest.total;
    if (scoreDiff !== 0) return scoreDiff;

    const zoneQualityDiff = compareZoneQualityCounts(candidate.zoneQualityCounts, currentBest.zoneQualityCounts);
    if (zoneQualityDiff !== 0) return zoneQualityDiff;

    const centreDiff = compareLowerNullableMetric(candidate.averageCentreMm, currentBest.averageCentreMm);
    if (centreDiff !== 0) return centreDiff;

    return compareLowerNullableMetric(candidate.mpiDistanceMm, currentBest.mpiDistanceMm);
  }

  function compareZoneQualityCounts(candidateCounts, currentBestCounts) {
    const candidate = Array.isArray(candidateCounts) ? candidateCounts : [];
    const currentBest = Array.isArray(currentBestCounts) ? currentBestCounts : [];
    const length = Math.max(candidate.length, currentBest.length);
    for (let index = 0; index < length; index += 1) {
      const diff = (candidate[index] || 0) - (currentBest[index] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function compareLowerNullableMetric(candidateValue, currentBestValue) {
    const candidateFinite = Number.isFinite(candidateValue);
    const currentFinite = Number.isFinite(currentBestValue);
    if (candidateFinite && currentFinite) {
      const diff = currentBestValue - candidateValue;
      return Math.abs(diff) < 0.000001 ? 0 : diff;
    }
    if (candidateFinite && !currentFinite) return 1;
    if (!candidateFinite && currentFinite) return -1;
    return 0;
  }

  function buildZoneQualityOrder(targetFace) {
    const zones = Array.isArray(targetFace?.zones) ? targetFace.zones : [];
    return zones
      .slice()
      .sort((a, b) => {
        const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const radiusDiff = (Number(a.radiusMm) || 0) - (Number(b.radiusMm) || 0);
        if (Math.abs(radiusDiff) > 0.000001) return radiusDiff;
        return String(a.label || a.id || "").localeCompare(String(b.label || b.id || ""));
      })
      .map((zone, rank) => ({
        id: zone.id,
        label: String(zone.label || "").toLowerCase(),
        score: Number(zone.score) || 0,
        rank
      }));
  }

  function makeZoneQualityCounts(zoneQualityOrder) {
    return Array.from({ length: (zoneQualityOrder?.length || 0) + 1 }, () => 0);
  }

  function calculateEndZoneQualityCounts(end, targetFace, scoringOptions, zoneQualityOrder) {
    const counts = makeZoneQualityCounts(zoneQualityOrder);
    (end?.arrows || []).forEach(arrow => {
      const score = App.ScoringEngine.scoreArrow(arrow, targetFace, scoringOptions);
      if (!score) return;
      addScoreToZoneQualityCounts(score, targetFace, zoneQualityOrder, counts);
    });
    return counts;
  }

  function addScoreToZoneQualityCounts(score, targetFace, zoneQualityOrder, counts) {
    const rank = getScoreZoneQualityRank(score, targetFace, zoneQualityOrder);
    if (!Number.isFinite(rank)) return;
    counts[rank] = (counts[rank] || 0) + 1;
  }

  function getScoreZoneQualityRank(score, targetFace, zoneQualityOrder) {
    if (!score) return null;
    if (score.isMiss) return zoneQualityOrder.length;

    const zone = findZoneForScore(score, targetFace);
    if (zone) {
      const byId = zoneQualityOrder.find(item => item.id === zone.id);
      if (byId) return byId.rank;
    }

    const label = String(score.label || "").toLowerCase();
    const byLabel = zoneQualityOrder.find(item => item.label === label);
    if (byLabel) return byLabel.rank;

    const value = Number(score.value);
    const byValue = zoneQualityOrder.find(item => item.score === value);
    return byValue ? byValue.rank : zoneQualityOrder.length;
  }

  function calculateArrowPositionStats(scorecard, targetFace, scoringOptions, timelineActive, revealLookup, arrowIndex, zoneQualityOrder = buildZoneQualityOrder(targetFace)) {
    let total = 0;
    let recordedArrows = 0;
    let plottedArrows = 0;
    let recordedScoreTotal = 0;
    let plottedDistanceTotalMm = 0;
    const positions = [];
    const zoneQualityCounts = makeZoneQualityCounts(zoneQualityOrder);

    (scorecard.ends || []).forEach((end, endIndex) => {
      const arrow = end.arrows?.[arrowIndex];
      if (!arrow) return;
      const revealEntry = revealLookup ? revealLookup.get(`${endIndex}:${arrowIndex}`) : null;
      if (timelineActive && revealEntry && !revealEntry.isRevealed) return;
      const score = App.ScoringEngine.scoreArrow(arrow, targetFace, scoringOptions);
      if (!score) return;
      recordedArrows += 1;
      total += score.value;
      recordedScoreTotal += score.value;
      addScoreToZoneQualityCounts(score, targetFace, zoneQualityOrder, zoneQualityCounts);
      if (arrow.position && typeof score.distanceMm === "number") {
        plottedArrows += 1;
        plottedDistanceTotalMm += score.distanceMm;
        const point = scoringOptions.extrapolation
          ? App.Extrapolation.transformPosition(arrow.position, scoringOptions.extrapolation)
          : arrow.position;
        positions.push(point);
      }
    });

    return {
      total,
      recordedArrows,
      plottedArrows,
      averageArrowScore: recordedArrows > 0 ? recordedScoreTotal / recordedArrows : null,
      averageDistanceFromCentreMm: plottedArrows > 0 ? plottedDistanceTotalMm / plottedArrows : null,
      mpi: calculateMpiFromPositions(positions),
      zoneQualityCounts
    };
  }

  function calculateEndMpi(end, options = {}) {
    const positions = (end?.arrows || [])
      .filter(arrow => arrow?.position)
      .map(arrow => options.extrapolation
        ? App.Extrapolation.transformPosition(arrow.position, options.extrapolation)
        : arrow.position);
    return calculateMpiFromPositions(positions);
  }

  function calculateMpiFromPositions(rawPositions) {
    const positions = (rawPositions || [])
      .filter(position => position && Number.isFinite(Number(position.xMm)) && Number.isFinite(Number(position.yMm)))
      .map(position => ({ xMm: Number(position.xMm), yMm: Number(position.yMm) }));

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

  function renderEndMpi(mpi, label) {
    if (!mpi) return `<span class="mpi-empty" title="${label} has no plotted arrows">—</span>`;
    const distanceText = formatMpiDistance(mpi.distanceMm);
    const offsetTitle = `${label} MPI: ${distanceText} from centre · ${formatAxisOffset(mpi.xMm, "right", "left")} · ${formatAxisOffset(mpi.yMm, "low", "high")} · ${mpi.count} plotted arrow${mpi.count === 1 ? "" : "s"}`;
    if (mpi.distanceMm < 0.5) {
      return `<span class="mpi-value" title="${offsetTitle}"><span>${distanceText}</span><span class="mpi-centre-dot" aria-hidden="true"></span></span>`;
    }
    const angle = Number.isFinite(mpi.angleDeg) ? mpi.angleDeg.toFixed(2) : "0";
    return `<span class="mpi-value" title="${offsetTitle}"><span>${distanceText}</span><span class="mpi-direction" style="--mpi-angle: ${angle}deg" aria-hidden="true">${renderMpiArrowSvg()}</span></span>`;
  }

  function renderMpiArrowSvg() {
    return `<svg viewBox="0 0 18 18" focusable="false" aria-hidden="true"><path d="M3 9h10.2M9.7 5.4 13.3 9l-3.6 3.6"/></svg>`;
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

  function formatAverageScore(value) {
    return value === null ? "-" : value.toFixed(1);
  }

  function formatAverageDistance(value) {
    return value === null ? "-" : `${value.toFixed(1)}mm`;
  }

  App.ScorecardView = ScorecardView;
})();
