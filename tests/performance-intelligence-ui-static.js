const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const session = fs.readFileSync(path.join(root, 'js/analytics/sessionIntelligence.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/controls.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const constants = fs.readFileSync(path.join(root, 'js/app/constants.js'), 'utf8');

assert.ok(html.includes('v0.9.36'));
assert.ok(constants.includes('APP_VERSION: "0.9.36"'));
assert.ok(main.includes('intelligence-probability-details" open'));
assert.ok(main.includes('intelligence-dna-grid-standalone'));
assert.ok(!main.includes('scenario.id === "actual";\n    const rowClass'));
assert.ok(!main.includes('isBaseline ? "is-baseline"'));

// Two direct numbered progression scopes remain.
assert.ok(!main.includes('<span class="panel-eyebrow">1. Progression Intelligence</span>'));
assert.ok(main.includes('<span class="panel-eyebrow">1. Session performance</span>'));
assert.ok(main.includes('<span class="panel-eyebrow">2. Within-end performance</span>'));
assert.ok(main.includes('<span class="panel-eyebrow">3. Shot Pattern DNA</span>'));
assert.ok(main.includes('<span class="panel-eyebrow">4. Improvement forecast</span>'));
assert.ok(main.includes('<small class="panel-eyebrow">5. Score probabilities</small>'));

// Exactly two final trend interpretations remain: one after each scope's raw evidence.
const sessionAnalysisCall = 'renderProgressionAnalysisBox(buildEndPatternAnalysis(session), "session", sessionSummary.label)';
const inEndAnalysisCall = 'renderProgressionAnalysisBox(buildInEndArrowAnalysis(inEnd), "in-end", inEndFinding.label)';
assert.ok(main.includes(sessionAnalysisCall));
assert.ok(main.includes(inEndAnalysisCall));
assert.equal((main.match(/renderProgressionAnalysisBox\(/g) || []).length, 3); // definition + two calls
assert.ok(main.includes('const heading = isInEnd ? "Within-end analysis" : "Session analysis"'));
assert.ok(!main.includes('renderIntelligenceTakeaway("Session progression"'));
assert.ok(main.includes('intelligence-takeaway-strip is-two-up'));
assert.ok(!main.includes('<span>Session trend</span>'));
assert.ok(!main.includes('renderProgressionSummaryBadge('));
assert.ok(!main.includes('renderProgressionAnalysisBox(buildEndPatternAnalysis(session), "session")'));
assert.ok(!main.includes('renderProgressionAnalysisBox(buildInEndArrowAnalysis(inEnd), "in-end")'));
assert.ok(!main.includes('End pattern analysis'));
assert.ok(!main.includes('Arrow-position analysis'));
assert.ok(!main.includes('was strongest at'));
assert.ok(!main.includes('point range.'));
assert.ok(main.includes('renderEmbeddedNormalisationScenario(session.normalisationScenario, "session")'));
assert.ok(main.includes('renderEmbeddedNormalisationScenario(inEnd.normalisationScenario, "in-end")'));
assert.ok(main.indexOf(sessionAnalysisCall) > main.indexOf('phases.map(phase => renderProgressionFlipCard(phase, targetFace, "session")'));
assert.ok(main.indexOf(inEndAnalysisCall) > main.indexOf('(inEnd.phases || []).map(phase => renderProgressionFlipCard(phase, targetFace, "in-end")'));

// End rows omit the redundant points column; consistency cards use neutral surfaces with scope accents.
assert.ok(main.includes('showDetail: false'));
assert.ok(main.includes('const detailClass = showDetail ? " has-detail" : " no-detail"'));
assert.ok(css.includes('.progression-average-bars.no-detail .progression-average-row'));
assert.ok(css.includes('.progression-normalisation-card.is-session'));
assert.ok(css.includes('.progression-normalisation-card.is-inend'));
assert.ok(css.includes('rgba(3, 10, 17, 0.24)'));

// User-facing standalone labels are capitalised.
assert.ok(main.includes('Luck Rating ${renderLuckRatingHelp()}'));
assert.ok(main.includes('return "Very lucky"'));
assert.ok(main.includes('return "Neutral"'));
assert.ok(main.includes('const heading = isInEnd ? "Within-end analysis" : "Session analysis"'));
assert.ok(main.includes('capitaliseFirst(pattern.shape.label)'));
assert.ok(main.includes('capitaliseFirst(App.SessionIntelligence.formatDirection(coreCentre))'));

// No duplicate modal DNA overlay control remains.
assert.ok(!main.includes('data-toggle-intelligence-overlay'));
assert.ok(!main.includes('intelligence-overlay-button'));
assert.ok(!css.includes('.intelligence-overlay-button'));

// DNA card presentation remains eight standalone icon-led metrics.
const dnaSectionStart = main.indexOf('<section class="intelligence-section intelligence-dna-section">');
const dnaSectionEnd = main.indexOf('</section>', dnaSectionStart);
const dnaSection = main.slice(dnaSectionStart, dnaSectionEnd);
assert.equal((dnaSection.match(/renderDnaItem\(/g) || []).length, 8);
assert.ok(main.includes('function renderDnaIcon(icon)'));
assert.ok(main.includes('intelligence-dna-icon'));
assert.ok(css.includes('.intelligence-dna-card-top'));
assert.ok(css.includes('aspect-ratio: 1.12 / 1'));
assert.ok(main.includes('class="intelligence-dna-item dna-tone-blue"'));
assert.ok(!main.includes('dna-tone-${escapeHtml(tone)}'));
assert.ok(css.includes('--dna-accent-rgb: 108, 169, 255'));
assert.ok(css.includes('background: rgba(3, 10, 17, 0.40)'));
assert.ok(!css.includes('.intelligence-dna-item.dna-tone-gold'));
assert.ok(!css.includes('.intelligence-dna-item.dna-tone-red'));
assert.ok(!css.includes('radial-gradient(circle at 88% 10%'));


// Final trend analyses use the normal shared-blue card presentation in every state.
assert.ok(!main.includes('const luckVisual = hasReliablePattern ? getLuckRatingVisual(100) : null'));
assert.ok(!main.includes('has-reliable-pattern intelligence-hero-luck'));
assert.ok(!main.includes('Boolean(sessionSummary.reliable)'));
assert.ok(!main.includes('Boolean(inEndFinding.reliable)'));
assert.ok(!css.includes('.progression-final-analysis.has-reliable-pattern.intelligence-hero-luck'));
assert.ok(css.includes('/* v0.9.36: unified Performance Intelligence blue accent and container system. */'));
assert.ok(css.includes('--intel-accent-rgb: 108, 169, 255'));
assert.ok(css.includes('.intelligence-modal-v3 .progression-scope-session,'));
assert.ok(css.includes('.intelligence-modal-v3 .progression-scope-inend'));
assert.ok(css.includes('border-color: var(--intel-border)'));
assert.ok(css.includes('.intelligence-modal-v3 .progression-final-analysis'));
assert.ok(css.includes('.intelligence-modal-v3 .progression-normalisation-card.is-session'));
assert.ok(css.includes('.intelligence-modal-v3 .progression-normalisation-card.is-inend'));
assert.ok(css.includes('.intelligence-modal-v3 .intelligence-scenario-row.is-featured'));
assert.ok(css.includes('.intelligence-modal-v3 .intelligence-scenario-row strong em'));
assert.ok(css.includes('.intelligence-modal-v3 .progression-chart-line.is-middle'));
assert.ok(css.includes('rgba(232, 195, 111, 0.78)'));
assert.ok(css.includes('.intelligence-modal-v3 .progression-chart-line.is-late'));
assert.ok(css.includes('rgba(232, 126, 139, 0.78)'));

// Existing required behaviour remains present.
assert.ok(css.includes('.intelligence-overview-grid .intelligence-hero-score:not(.intelligence-hero-luck)'));
assert.ok(css.includes('.intelligence-hero-luck::after'));
assert.ok(css.includes('animation: luckGleamSweep'));
assert.ok(css.includes('.intelligence-hero-luck.luck-magical::before'));
assert.ok(css.includes('.intelligence-hero-luck.luck-mythic'));
assert.ok(css.includes('.inend-position-scale'));
assert.ok(session.includes('maximum * 0.6'));
assert.ok(main.includes('scale.toPercent(value)'));
assert.ok(session.includes('weakest-end'));
assert.ok(session.includes('weakest-arrow-position'));
assert.ok(!main.includes('Observed consistency scenarios'));
assert.ok(css.includes('.progression-scope-session'));
assert.ok(css.includes('.progression-scope-inend'));
assert.ok(css.includes('.progression-scope-session .progression-scope-heading .panel-eyebrow'));
assert.ok(css.includes('.luck-rating-help-popover > strong'));

console.log(JSON.stringify({
  status: 'passed',
  directProgressionScopes: true,
  finalTrendInterpretations: 2,
  embeddedConsistencyComparisons: 2,
  endPointTotalsRemoved: true,
  neutralConsistencyCards: true,
  displayCapitalisation: true,
  modalDnaOverlayControlRemoved: true,
  dnaCards: 8,
  dnaIconCards: true,
  dnaUnifiedBlueAccent: true,
  unifiedModalBlueAccent: true,
  neutralTrendAnalyses: true,
  probabilityExpanded: true,
  luckTooltipTitleFixed: true,
  actualPatternHighlighted: false,
  raisedBarScale: true
}, null, 2));
