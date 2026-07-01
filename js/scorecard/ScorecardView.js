(function () {
  const App = window.ArcheryApp;

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
    constructor(container) {
      this.container = container;
    }

    render(state) {
      if (!state.scorecard) {
        this.container.innerHTML = `<div class="empty-state"><div><strong>No scorecard yet</strong><p>Create a new scorecard to begin scoring.</p></div></div>`;
        return;
      }

      const scorecard = state.scorecard;
      const targetFace = App.TargetFaces.getTargetFace(scorecard.activeViewTargetFaceId);
      const arrowsPerEnd = Math.max(...scorecard.ends.map(end => end.arrows.length));
      let runningTotal = 0;

      const headers = Array.from({ length: arrowsPerEnd }, (_, index) => `<th>A${index + 1}</th>`).join("");
      const rows = scorecard.ends.map((end, endIndex) => {
        const endTotal = App.ScoringEngine.calculateEndTotal(end, targetFace);
        runningTotal += endTotal;

        const arrowCells = Array.from({ length: arrowsPerEnd }, (_, arrowIndex) => {
          const arrow = end.arrows[arrowIndex];
          if (!arrow) return `<td></td>`;
          const score = App.ScoringEngine.scoreArrow(arrow, targetFace);
          const selected = state.selected && state.selected.endIndex === endIndex && state.selected.arrowIndex === arrowIndex;
          const classes = [
            "arrow-cell",
            selected ? "selected" : "",
            score ? App.ScoreFormatting.scoreClass(score) : "empty",
            arrow.position ? "plotted" : "",
            arrow.manualScore ? "manual" : ""
          ].filter(Boolean).join(" ");

          const style = scoreStyle(score, targetFace);

          return `<td>
            <button class="${classes}" type="button" data-end-index="${endIndex}" data-arrow-index="${arrowIndex}" ${style ? `style="${style}"` : ""} title="End ${endIndex + 1}, Arrow ${arrowIndex + 1}">${App.ScoreFormatting.arrowDisplay(score)}</button>
          </td>`;
        }).join("");

        return `<tr>
          <td class="end-label">${endIndex + 1}</td>
          ${arrowCells}
          <td class="total-cell">${endTotal}</td>
          <td class="running-cell">${runningTotal}</td>
        </tr>`;
      }).join("");

      this.container.innerHTML = `<table class="scorecard-table">
        <thead>
          <tr>
            <th>End</th>
            ${headers}
            <th>Total</th>
            <th>Run</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    bindEvents() {
      this.container.addEventListener("click", event => {
        const button = event.target.closest(".arrow-cell");
        if (!button) return;
        App.Actions.selectArrow(Number(button.dataset.endIndex), Number(button.dataset.arrowIndex));
      });

      this.container.addEventListener("contextmenu", event => {
        const button = event.target.closest(".arrow-cell");
        if (!button) return;
        event.preventDefault();
        App.Actions.selectArrow(Number(button.dataset.endIndex), Number(button.dataset.arrowIndex));
        App.Actions.clearSelectedArrow();
        App.Toast.show("Arrow cleared", "success");
      });
    }
  }

  App.ScorecardView = ScorecardView;
})();
