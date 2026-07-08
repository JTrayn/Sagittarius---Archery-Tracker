(function () {
  const App = window.ArcheryApp;

  const DEFAULT_SCORECARD_COUNT = 200;
  const MAX_SCORECARD_COUNT = 200;
  const DISTANCES_M = [10, 18, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const DAY_MS = 24 * 60 * 60 * 1000;

  function generateScorecards(count = DEFAULT_SCORECARD_COUNT) {
    const scorecardCount = normalizeCount(count);
    const faces = App.TargetFaces.listBuiltInTargetFaces();
    const now = new Date();
    const startTime = now.getTime() - 730 * DAY_MS;
    const scorecards = [];

    App.Storage.clearAllScorecards();

    for (let index = 0; index < scorecardCount; index += 1) {
      const progress = scorecardCount <= 1 ? 1 : index / (scorecardCount - 1);
      const distanceM = DISTANCES_M[randomInt(0, DISTANCES_M.length - 1)];
      const targetFace = chooseTargetFace(faces, distanceM);
      const shotAt = makeShotDate(startTime, now.getTime(), progress);
      const conditions = chooseConditions();
      const scorecard = App.ScorecardFactory.createScorecard({
        name: `Dummy Progress ${String(index + 1).padStart(2, "0")}`,
        ends: 12,
        arrowsPerEnd: 6,
        distanceM,
        targetFaceId: targetFace.id,
        shotAt,
        notes: `Temporary generated scorecard for Trends testing. Conditions: ${conditions.label}.`
      });

      populateArrows(scorecard, targetFace, progress, distanceM, conditions);
      scorecard.createdAt = shotAt;
      scorecard.updatedAt = shotAt;
      scorecards.push(App.Storage.saveScorecard(scorecard));
    }

    return scorecards;
  }

  function normalizeCount(count) {
    const numeric = Number(count);
    if (!Number.isFinite(numeric)) return DEFAULT_SCORECARD_COUNT;
    return Math.min(MAX_SCORECARD_COUNT, Math.max(0, Math.trunc(numeric)));
  }

  function chooseTargetFace(faces, distanceM) {
    const indoorFaces = faces.filter(face => face.family === "Indoor Archery WA");
    const wa122 = faces.find(face => face.id === "wa_122cm_full") || faces[0];
    const wa40 = faces.find(face => face.id === "wa_40cm_full") || faces[0];
    const pool = distanceM <= 20
      ? indoorFaces.concat([wa40, wa40, wa122])
      : distanceM <= 50
        ? [wa40, wa40, wa122, wa122].concat(indoorFaces.slice(0, 1))
        : [wa122, wa122, wa122, wa40];
    return pool[randomInt(0, pool.length - 1)] || faces[randomInt(0, faces.length - 1)];
  }

  function chooseConditions() {
    const roll = Math.random();
    if (roll < 0.12) return { label: "rough", multiplier: randomBetween(1.28, 1.58), bias: 1.35 };
    if (roll < 0.34) return { label: "variable", multiplier: randomBetween(1.08, 1.24), bias: 1.12 };
    if (roll > 0.90) return { label: "excellent", multiplier: randomBetween(0.74, 0.88), bias: 0.82 };
    return { label: "normal", multiplier: randomBetween(0.92, 1.08), bias: 1 };
  }

  function populateArrows(scorecard, targetFace, progress, distanceM, conditions) {
    const outerRadius = Math.max(...targetFace.zones.map(zone => Number(zone.radiusMm) || 0));
    const skill = easeOutCubic(progress);
    const plateau = Math.sin(progress * Math.PI * 5.5) * 11;
    const trendNoise = gaussian() * lerp(24, 10, progress);
    const accuracy70Mm = Math.max(48, lerp(245, 68, skill) + plateau + trendNoise);
    const distanceScale = Math.max(0.18, distanceM / 70);
    const sessionSpread = accuracy70Mm * distanceScale * conditions.multiplier;
    const centerBiasSigma = sessionSpread * 0.46 * conditions.bias;
    const spreadSigma = sessionSpread * randomBetween(0.62, 0.86);
    const endDriftSigma = sessionSpread * randomBetween(0.13, 0.24);
    const aimPoint = {
      x: gaussian() * centerBiasSigma,
      y: gaussian() * centerBiasSigma
    };

    scorecard.ends.forEach(end => {
      const endDrift = {
        x: gaussian() * endDriftSigma,
        y: gaussian() * endDriftSigma
      };

      end.arrows.forEach(arrow => {
        const point = clampToTarget({
          x: aimPoint.x + endDrift.x + gaussian() * spreadSigma,
          y: aimPoint.y + endDrift.y + gaussian() * spreadSigma
        }, outerRadius * 1.6);

        arrow.position = {
          xMm: roundMm(point.x),
          yMm: roundMm(point.y)
        };
        arrow.manualScore = null;
      });
    });
  }

  function makeShotDate(startTime, endTime, progress) {
    const base = startTime + (endTime - startTime) * progress;
    const jitter = (Math.random() - 0.5) * 11 * DAY_MS;
    const date = new Date(clamp(base + jitter, startTime, endTime));
    date.setHours(randomInt(7, 19), randomInt(0, 59), 0, 0);
    if (date.getTime() > endTime) date.setTime(endTime);
    return date.toISOString();
  }

  function clampToTarget(point, maxRadius) {
    const distance = Math.hypot(point.x, point.y);
    if (distance <= maxRadius || distance === 0) return point;
    const scale = maxRadius / distance;
    return {
      x: point.x * scale,
      y: point.y * scale
    };
  }

  function gaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function easeOutCubic(value) {
    const inverse = 1 - clamp(value, 0, 1);
    return 1 - inverse * inverse * inverse;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function roundMm(value) {
    return Math.round(value * 10) / 10;
  }

  App.DevDataGenerator = { generateScorecards };
})();
