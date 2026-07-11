const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
global.window = global;
global.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {}
};

function load(relativePath) {
  const filename = path.join(root, relativePath);
  vm.runInThisContext(fs.readFileSync(filename, 'utf8'), { filename });
}

[
  'js/app/constants.js',
  'js/utils/geometry.js',
  'js/data/targetFaces.js',
  'js/scoring/extrapolation.js',
  'js/scoring/scoringEngine.js',
  'js/analytics/shotPattern.js',
  'js/analytics/monteCarlo.js',
  'js/analytics/sessionIntelligence.js'
].forEach(load);

const App = global.ArcheryApp;
const targetFace = App.TargetFaces.getTargetFace('wa_122cm_full');

function makeScorecard({ ends = 12, arrowsPerEnd = 6, manualAt = null, emptyAt = null, updatedAt = '2026-07-10T00:00:00Z', centreShift = false } = {}) {
  let sequence = 0;
  return {
    id: 'test-scorecard',
    name: 'Test Scorecard',
    updatedAt,
    distanceM: 70,
    originalTargetFaceId: targetFace.id,
    activeViewTargetFaceId: targetFace.id,
    ends: Array.from({ length: ends }, (_, endIndex) => ({
      arrows: Array.from({ length: arrowsPerEnd }, (_, arrowIndex) => {
        const index = sequence++;
        if (emptyAt === index) return { position: null, manualScore: null };
        if (manualAt === index) return { position: null, manualScore: { label: '9', value: 9, zoneId: '9' } };
        const phaseShift = centreShift ? (endIndex < 4 ? -120 : endIndex >= 8 ? 120 : 0) : 0;
        const angle = index * 2.399963229728653;
        const radius = 90 + (index % 7) * 7;
        return {
          position: {
            xMm: phaseShift + Math.cos(angle) * radius,
            yMm: Math.sin(angle) * radius
          },
          manualScore: null
        };
      })
    }))
  };
}

function makeRng(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sampleScore(rng, mean = 8, spread = 1.35) {
  const u1 = Math.max(1e-9, rng());
  const u2 = Math.max(1e-9, rng());
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.min(10, Math.round(mean + z * spread)));
}

function sessionFinding(scoresByEnd) {
  const endSeries = scoresByEnd.map((scores, index) => ({
    endIndex: index,
    endNumber: index + 1,
    arrowCount: scores.length,
    score: scores.reduce((a, b) => a + b, 0),
    averageArrow: scores.reduce((a, b) => a + b, 0) / scores.length
  }));
  const groups = [endSeries.slice(0, 4), endSeries.slice(4, 8), endSeries.slice(8, 12)];
  const ids = ['early', 'middle', 'late'];
  const phases = groups.map((group, index) => {
    const avg = group.reduce((sum, end) => sum + end.averageArrow, 0) / group.length;
    return { id: ids[index], actualAverageArrow: avg, projectedFinalScore: avg * 72 };
  });
  return App.SessionIntelligence.classifySessionTrajectory(endSeries, phases);
}

function inEndFinding(scoresByEnd) {
  const endRows = scoresByEnd.map((scores, index) => ({ endIndex: index, scores }));
  const endMeans = scoresByEnd.map(scores => scores.reduce((a, b) => a + b, 0) / scores.length);
  const positions = Array.from({ length: 6 }, (_, arrowIndex) => {
    const actualAverageArrow = scoresByEnd.reduce((sum, scores) => sum + scores[arrowIndex], 0) / scoresByEnd.length;
    const withinEndAdjustedAverage = scoresByEnd.reduce((sum, scores, endIndex) => sum + scores[arrowIndex] - endMeans[endIndex], 0) / scoresByEnd.length;
    return { id: `arrow-${arrowIndex + 1}`, label: `Arrow ${arrowIndex + 1}`, arrowIndex, actualAverageArrow, withinEndAdjustedAverage };
  });
  return App.SessionIntelligence.classifyInEndPerformance(endRows, [], positions, 6);
}

// Eligibility gates.
assert.equal(App.SessionIntelligence.getEligibility(makeScorecard()).eligible, true);
assert.equal(App.SessionIntelligence.getEligibility(makeScorecard({ emptyAt: 71 })).code, 'incomplete');
assert.equal(App.SessionIntelligence.getEligibility(makeScorecard({ manualAt: 0 })).code, 'manual-entries');
const plottedWithManual = makeScorecard();
plottedWithManual.ends[0].arrows[0].manualScore = { label: '9', value: 9, zoneId: '9' };
assert.equal(App.SessionIntelligence.getEligibility(plottedWithManual).code, 'manual-entries');

// Completed running projection resolves exactly to the actual score.
const complete = makeScorecard();
const completeAnalysis = App.SessionIntelligence.analyse(complete, targetFace, { viewport: {}, simulationCount: 500 });
assert.equal(completeAnalysis.status, 'ok');
const lastPoint = completeAnalysis.progression.session.arrowSeries.at(-1);
assert.equal(lastPoint.projectedFinalScore, completeAnalysis.totals.scorecardTotal);


// Embedded consistency comparisons use direct score arithmetic.
const endConsistency = App.SessionIntelligence.buildWeakestEndScenario([
  { endNumber: 1, averageArrow: 9, arrowCount: 6 },
  { endNumber: 2, averageArrow: 7, arrowCount: 6 },
  { endNumber: 3, averageArrow: 8, arrowCount: 6 }
], 144);
assert.equal(endConsistency.subjectLabel, 'End 2');
assert.equal(endConsistency.benchmarkAverage, 8.5);
assert.equal(endConsistency.change, 9);
assert.equal(endConsistency.adjustedScore, 153);

const arrowConsistency = App.SessionIntelligence.buildWeakestArrowPositionScenario([
  { id: 'arrow-1', label: 'Arrow 1', actualAverageArrow: 8, arrowCount: 12 },
  { id: 'arrow-2', label: 'Arrow 2', actualAverageArrow: 7, arrowCount: 12 },
  { id: 'arrow-3', label: 'Arrow 3', actualAverageArrow: 9, arrowCount: 12 }
], 576);
assert.equal(arrowConsistency.subjectLabel, 'Arrow 2');
assert.equal(arrowConsistency.benchmarkAverage, 8.5);
assert.equal(arrowConsistency.change, 18);
assert.equal(arrowConsistency.adjustedScore, 594);

// Full analysis exposes the comparisons inside their respective progression scopes.
assert.equal(completeAnalysis.consistencyScenarios, undefined);
assert.equal(completeAnalysis.progression.session.normalisationScenario.id, 'weakest-end');
assert.equal(completeAnalysis.progression.inEnd.normalisationScenario.id, 'weakest-arrow-position');
assert.ok(completeAnalysis.progression.session.normalisationScenario.change >= 0);
assert.ok(completeAnalysis.progression.inEnd.normalisationScenario.change >= 0);

// Raised in-end bar scale keeps the target maximum while making close averages readable.
const barScale = App.SessionIntelligence.makeInEndBarScale([7.1, 7.3, 7.5, 7.7, 7.9, 8.1], 10);
assert.equal(barScale.maximum, 10);
assert.equal(barScale.minimum, 6);
assert.ok(Math.abs(barScale.toPercent(7.1) - 27.5) < 1e-9);
assert.ok(Math.abs(barScale.toPercent(8.1) - 52.5) < 1e-9);

// Save timestamps do not change Monte Carlo outputs.
const timestampVariant = makeScorecard({ updatedAt: '2030-01-01T00:00:00Z' });
const timestampAnalysis = App.SessionIntelligence.analyse(timestampVariant, targetFace, { viewport: {}, simulationCount: 500 });
assert.equal(completeAnalysis.forecast.expectedScore, timestampAnalysis.forecast.expectedScore);
assert.equal(completeAnalysis.forecast.luckRating, timestampAnalysis.forecast.luckRating);
const idVariant = makeScorecard();
idVariant.id = 'metadata-only-id-change';
const idAnalysis = App.SessionIntelligence.analyse(idVariant, targetFace, { viewport: {}, simulationCount: 500 });
assert.equal(completeAnalysis.forecast.expectedScore, idAnalysis.forecast.expectedScore);
assert.equal(completeAnalysis.forecast.luckRating, idAnalysis.forecast.luckRating);

// Core centre and core offset refer to the same point.
const core = completeAnalysis.pattern.coreCentre;
assert.ok(core);
assert.ok(Math.abs(Math.hypot(core.xMm, core.yMm) - completeAnalysis.pattern.coreOffsetDistanceMm) < 1e-9);

// Material phase movement is detected and warned about.
const shiftingAnalysis = App.SessionIntelligence.analyse(makeScorecard({ centreShift: true }), targetFace, { viewport: {}, simulationCount: 300 });
assert.equal(shiftingAnalysis.modelStability.material, true);

// Stationary false-positive audit.
const rng = makeRng(987654321);
let sessionFalsePositives = 0;
let inEndFalsePositives = 0;
const trials = 5000;
for (let trial = 0; trial < trials; trial += 1) {
  const round = Array.from({ length: 12 }, () => Array.from({ length: 6 }, () => sampleScore(rng, 8, 1.35)));
  if (sessionFinding(round).reliable) sessionFalsePositives += 1;
  if (inEndFinding(round).reliable) inEndFalsePositives += 1;
}
const sessionRate = sessionFalsePositives / trials;
const inEndRate = inEndFalsePositives / trials;
assert.ok(sessionRate < 0.10, `Session false-positive rate too high: ${sessionRate}`);
assert.ok(inEndRate < 0.10, `In-end false-positive rate too high: ${inEndRate}`);

// Known repeated declines are detected.
const sessionDecline = Array.from({ length: 12 }, (_, endIndex) => Array.from({ length: 6 }, (_, arrowIndex) => {
  const base = 9.4 - endIndex * 0.16;
  return Math.max(0, Math.min(10, Math.round(base + ((arrowIndex % 3) - 1) * 0.2)));
}));
assert.equal(sessionFinding(sessionDecline).reliable, true);
assert.ok(sessionFinding(sessionDecline).averageArrowDelta < 0);

const inEndDecline = Array.from({ length: 12 }, (_, endIndex) => {
  const endOffset = (endIndex % 3) - 1;
  return [10, 9, 9, 8, 7, 7].map(score => Math.max(0, Math.min(10, score + endOffset)));
});
const detectedInEnd = inEndFinding(inEndDecline);
assert.equal(detectedInEnd.reliable, true);
assert.equal(detectedInEnd.id, 'reliable-in-end-decline');

// A repeated nonlinear weak/strong arrow position is detected without being mistaken for a linear decline.
const nonlinearPositionPattern = Array.from({ length: 12 }, (_, endIndex) => {
  const endOffset = (endIndex % 3) - 1;
  return [8, 8, 10, 8, 8, 8].map(score => Math.max(0, Math.min(10, score + endOffset)));
});
const detectedNonlinear = inEndFinding(nonlinearPositionPattern);
assert.equal(detectedNonlinear.reliable, true);
assert.equal(detectedNonlinear.id, 'reliable-arrow-position-pattern');
assert.equal(detectedNonlinear.bestPositionId, 'arrow-3');

console.log(JSON.stringify({
  status: 'passed',
  stationaryTrials: trials,
  sessionFalsePositiveRate: sessionRate,
  inEndFalsePositiveRate: inEndRate,
  finalProjection: lastPoint.projectedFinalScore,
  actualScore: completeAnalysis.totals.scorecardTotal,
  timestampStableExpectedScore: completeAnalysis.forecast.expectedScore,
  patternShiftDetected: shiftingAnalysis.modelStability.material,
  nonlinearPatternDetected: detectedNonlinear.bestPositionId,
  endConsistencyChange: endConsistency.change,
  arrowConsistencyChange: arrowConsistency.change,
  inEndBarScale: `${barScale.minimum}-${barScale.maximum}`
}, null, 2));
