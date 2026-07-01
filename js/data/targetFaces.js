(function () {
  const App = window.ArcheryApp;

  const COLOURS = {
    gold: "#f7d84a",
    red: "#e44242",
    blue: "#2684d9",
    black: "#20252b",
    white: "#f6f1de",
    indoorOrange: "#f28a21",
    indoorYellow: "#f6d441",
    indoorBlack: "#080b0f",
    indoorRedBorder: "#ff3347",
    indoorWhiteBorder: "#f7fbff"
  };

  function worldArcheryFullFace({ id, name, shortName, diameterMm, defaultDistanceM, description, innerTenRadiusMm }) {
    const ringWidth = diameterMm / 20;
    return {
      id,
      name,
      shortName,
      family: "World Archery",
      diameterMm,
      defaultDistanceM,
      description,
      zones: [
        { id: "x", label: "X", score: 10, radiusMm: innerTenRadiusMm, fill: COLOURS.gold, stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { id: "10", label: "10", score: 10, radiusMm: ringWidth, fill: COLOURS.gold, stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { id: "9", label: "9", score: 9, radiusMm: ringWidth * 2, fill: COLOURS.gold, stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { id: "8", label: "8", score: 8, radiusMm: ringWidth * 3, fill: COLOURS.red, stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { id: "7", label: "7", score: 7, radiusMm: ringWidth * 4, fill: COLOURS.red, stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { id: "6", label: "6", score: 6, radiusMm: ringWidth * 5, fill: COLOURS.blue, stroke: "#111111", strokeWidthMm: 0.8 },
        { id: "5", label: "5", score: 5, radiusMm: ringWidth * 6, fill: COLOURS.blue, stroke: "#111111", strokeWidthMm: 0.8 },
        { id: "4", label: "4", score: 4, radiusMm: ringWidth * 7, fill: COLOURS.black, stroke: "#d8dde3", strokeWidthMm: 0.8 },
        { id: "3", label: "3", score: 3, radiusMm: ringWidth * 8, fill: COLOURS.black, stroke: "#d8dde3", strokeWidthMm: 0.8 },
        { id: "2", label: "2", score: 2, radiusMm: ringWidth * 9, fill: COLOURS.white, stroke: "#1f1f1f", strokeWidthMm: 0.8 },
        { id: "1", label: "1", score: 1, radiusMm: ringWidth * 10, fill: COLOURS.white, stroke: "#1f1f1f", strokeWidthMm: 0.8 }
      ]
    };
  }

  const WA_122CM_FULL = worldArcheryFullFace({
    id: "wa_122cm_full",
    name: "World Archery 122cm Full Face",
    shortName: "WA 122cm",
    diameterMm: 1220,
    defaultDistanceM: 70,
    innerTenRadiusMm: 30.5,
    description: "Standard 122cm 10-zone target face used for Olympic recurve at 70m. The X ring scores 10 and is displayed separately."
  });

  const WA_40CM_FULL = worldArcheryFullFace({
    id: "wa_40cm_full",
    name: "World Archery 40cm Full Face",
    shortName: "WA 40cm",
    diameterMm: 400,
    defaultDistanceM: 18,
    innerTenRadiusMm: 10,
    description: "Standard 40cm indoor target face with 10 scoring rings. The X ring scores 10 and is displayed separately."
  });

  function inchesToRadiusMm(inches) {
    return inches * 25.4 / 2;
  }

  function indoorArcheryWaFace({ id, name, shortName, series, xIn, eightIn, sevenIn, fiveIn }) {
    return {
      id,
      name,
      shortName,
      family: "Indoor Archery WA",
      series,
      diameterMm: fiveIn * 25.4,
      defaultDistanceM: 18,
      description: `Indoor Archery WA Series ${series}. Zone diameters: X ${xIn}\", 8 ${eightIn}\", 7 ${sevenIn}\", 5 ${fiveIn}\". X scores 8.`,
      centreLabel: {
        text: "X",
        fill: "#ff243a",
        fontWeight: 950,
        minPx: 18,
        maxPx: 78,
        scaleMm: xIn <= 0.5 ? 10 : 13
      },
      zones: [
        { id: "x", label: "X", score: 8, radiusMm: inchesToRadiusMm(xIn), fill: COLOURS.indoorOrange, stroke: COLOURS.indoorWhiteBorder, strokeWidthMm: 0.9 },
        { id: "8", label: "8", score: 8, radiusMm: inchesToRadiusMm(eightIn), fill: COLOURS.indoorBlack, stroke: COLOURS.indoorWhiteBorder, strokeWidthMm: 0.9 },
        { id: "7", label: "7", score: 7, radiusMm: inchesToRadiusMm(sevenIn), fill: COLOURS.indoorYellow, stroke: COLOURS.indoorWhiteBorder, strokeWidthMm: 0.9 },
        { id: "5", label: "5", score: 5, radiusMm: inchesToRadiusMm(fiveIn), fill: COLOURS.indoorBlack, stroke: COLOURS.indoorRedBorder, strokeWidthMm: 1.2, outerBorder: true }
      ]
    };
  }

  const INDOOR_ARCHERY_WA_SERIES_1 = indoorArcheryWaFace({
    id: "indoor_archery_wa_series_1",
    name: "Indoor Archery WA Series 1",
    shortName: "IAWA S1",
    series: 1,
    xIn: 0.5,
    eightIn: 1,
    sevenIn: 2,
    fiveIn: 6
  });

  const INDOOR_ARCHERY_WA_SERIES_2 = indoorArcheryWaFace({
    id: "indoor_archery_wa_series_2",
    name: "Indoor Archery WA Series 2",
    shortName: "IAWA S2",
    series: 2,
    xIn: 1,
    eightIn: 2,
    sevenIn: 4,
    fiveIn: 6
  });

  const INDOOR_ARCHERY_WA_SERIES_3 = indoorArcheryWaFace({
    id: "indoor_archery_wa_series_3",
    name: "Indoor Archery WA Series 3",
    shortName: "IAWA S3",
    series: 3,
    xIn: 2,
    eightIn: 4,
    sevenIn: 8,
    fiveIn: 12
  });

  const TARGET_FACES = [
    WA_122CM_FULL,
    WA_40CM_FULL,
    INDOOR_ARCHERY_WA_SERIES_1,
    INDOOR_ARCHERY_WA_SERIES_2,
    INDOOR_ARCHERY_WA_SERIES_3
  ].map(face => ({ ...face, isBuiltIn: true, isCustom: false }));

  function getTargetFace(targetFaceId) {
    return listTargetFaces().find(face => face.id === targetFaceId) || TARGET_FACES[0];
  }

  function listTargetFaces() {
    return TARGET_FACES.concat(listCustomTargetFaces());
  }

  function listBuiltInTargetFaces() {
    return TARGET_FACES.slice();
  }

  function isBuiltInTargetFace(targetFaceId) {
    return TARGET_FACES.some(face => face.id === targetFaceId);
  }

  function getTargetFaceGroups() {
    return listTargetFaces().reduce((groups, face) => {
      const family = face.family || "Other";
      if (!groups[family]) groups[family] = [];
      groups[family].push(face);
      return groups;
    }, {});
  }

  function getManualScoreOptions(targetFace) {
    const options = [];
    const seenLabels = new Set();
    targetFace.zones.forEach(zone => {
      if (!seenLabels.has(zone.label)) {
        options.push({ label: zone.label, value: zone.score, zoneId: zone.id });
        seenLabels.add(zone.label);
      }
    });
    options.push({ label: "M", value: 0, zoneId: "miss", isMiss: true });
    return options;
  }

  function listCustomTargetFaces() {
    const index = readCustomFaceIndex();
    const faces = [];
    let changed = false;

    index.forEach(item => {
      const faceId = typeof item === "string" ? item : item && item.id;
      if (!faceId) return;
      const face = loadCustomTargetFace(faceId);
      if (face) {
        faces.push(face);
      } else {
        changed = true;
      }
    });

    if (changed) {
      writeCustomFaceIndex(faces.map(makeCustomFaceSummary));
    }

    return faces.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  function loadCustomTargetFace(targetFaceId) {
    try {
      const raw = localStorage.getItem(App.Constants.STORAGE_KEYS.CUSTOM_TARGET_FACE_PREFIX + targetFaceId);
      if (!raw) return null;
      return normalizeCustomTargetFace(JSON.parse(raw), { preserveId: true });
    } catch (error) {
      console.warn("Could not load custom target face", error);
      return null;
    }
  }

  function saveCustomTargetFace(face) {
    const normalized = {
      ...normalizeCustomTargetFace(face, { preserveId: true }),
      updatedAt: App.Dates.nowIso()
    };
    localStorage.setItem(App.Constants.STORAGE_KEYS.CUSTOM_TARGET_FACE_PREFIX + normalized.id, JSON.stringify(normalized));
    const index = readCustomFaceIndex().filter(item => (typeof item === "string" ? item : item.id) !== normalized.id);
    index.push(makeCustomFaceSummary(normalized));
    writeCustomFaceIndex(index);
    return normalized;
  }

  function deleteCustomTargetFace(targetFaceId) {
    if (isBuiltInTargetFace(targetFaceId)) return false;
    localStorage.removeItem(App.Constants.STORAGE_KEYS.CUSTOM_TARGET_FACE_PREFIX + targetFaceId);
    writeCustomFaceIndex(readCustomFaceIndex().filter(item => (typeof item === "string" ? item : item.id) !== targetFaceId));
    return true;
  }

  function normalizeCustomTargetFace(face, options = {}) {
    const source = face || {};
    const zones = Array.isArray(source.zones) ? source.zones : [];
    const inheritedLabelSettings = source.labels || source.labelSettings || {};
    const normalizedZones = zones
      .map((zone, index) => normalizeCustomZone(zone, index, inheritedLabelSettings))
      .filter(Boolean);
    if (!normalizedZones.length) {
      normalizedZones.push(normalizeCustomZone({
        label: "10",
        score: 10,
        radiusMm: 50,
        fill: COLOURS.gold,
        stroke: "#1f1f1f",
        strokeWidthMm: 0.8
      }, 0));
    }

    const outerRadiusMm = Math.max(...normalizedZones.map(zone => zone.radiusMm));
    const diameterMm = Math.max(outerRadiusMm * 2, 1);
    const id = options.preserveId && source.id && !isBuiltInTargetFace(source.id)
      ? String(source.id)
      : App.Ids.makeId("custom_target_face");

    return {
      id,
      name: String(source.name || "Custom Target Face").trim() || "Custom Target Face",
      shortName: String(source.shortName || source.name || "Custom").trim().slice(0, 18) || "Custom",
      family: String(source.family || "Custom target faces").trim() || "Custom target faces",
      description: String(source.description || "").trim(),
      diameterMm: roundMm(diameterMm),
      labels: normalizeLabelSettings(source.labels || source.labelSettings || inferLabelSettings(source)),
      ...(source.centreLabel ? { centreLabel: clonePlain(source.centreLabel) } : {}),
      zones: normalizedZones,
      isBuiltIn: false,
      isCustom: true,
      updatedAt: source.updatedAt || App.Dates.nowIso()
    };
  }

  function normalizeCustomZone(zone, index, inheritedLabelSettings = {}) {
    if (!zone) return null;
    const label = String(zone.label || index + 1).trim();
    const radiusMm = Math.max(0.1, Number(zone.radiusMm) || Number(zone.diameterMm) / 2 || 0);
    if (!label || !Number.isFinite(radiusMm) || radiusMm <= 0) return null;
    return {
      id: String(zone.id || makeZoneId(label, index)).trim() || makeZoneId(label, index),
      label,
      score: Number(zone.score) || 0,
      radiusMm: roundMm(radiusMm),
      fill: normalizeColor(zone.fill, COLOURS.white),
      stroke: normalizeColor(zone.stroke, "#1f1f1f"),
      strokeWidthMm: Math.max(0, Number(zone.strokeWidthMm) || 0),
      labelSize: normalizeLabelSize(zone.labelSize || inheritedLabelSettings.size),
      labelFill: normalizeColor(zone.labelFill || (inheritedLabelSettings.fill === "auto" ? "" : inheritedLabelSettings.fill), "#121820")
    };
  }

  function validateTargetFaceDraft(face) {
    const errors = [];
    if (!String(face?.name || "").trim()) errors.push("Name is required.");
    if (!Array.isArray(face?.zones) || !face.zones.length) errors.push("At least one scoring zone is required.");

    const zoneLabels = new Set();
    (face?.zones || []).forEach((zone, index) => {
      const row = `Zone ${index + 1}`;
      const label = String(zone.label || "").trim();
      if (!label) errors.push(`${row} needs a label.`);
      if (zoneLabels.has(label.toLowerCase())) errors.push(`${row} duplicates label ${label}.`);
      zoneLabels.add(label.toLowerCase());
      if (!(Number(zone.radiusMm) > 0)) errors.push(`${row} needs a diameter greater than 0mm.`);
      if (!(Number(zone.score) >= 0 || Number(zone.score) < 0)) errors.push(`${row} needs a numeric score.`);
      if (!isValidColor(zone.fill)) errors.push(`${row} needs a valid fill colour.`);
      if (!isValidColor(zone.stroke)) errors.push(`${row} needs a valid border colour.`);
      if (!isValidColor(zone.labelFill)) errors.push(`${row} needs a valid label colour.`);
    });

    return errors;
  }

  function readCustomFaceIndex() {
    try {
      const raw = localStorage.getItem(App.Constants.STORAGE_KEYS.CUSTOM_TARGET_FACE_INDEX);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Could not read custom target face index", error);
      return [];
    }
  }

  function writeCustomFaceIndex(index) {
    localStorage.setItem(App.Constants.STORAGE_KEYS.CUSTOM_TARGET_FACE_INDEX, JSON.stringify(index));
  }

  function makeCustomFaceSummary(face) {
    return {
      id: face.id,
      name: face.name,
      updatedAt: face.updatedAt || App.Dates.nowIso()
    };
  }

  function makeZoneId(label, index) {
    return `zone_${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || index + 1}`;
  }

  function normalizeColor(value, fallback) {
    const color = String(value || "").trim();
    return isValidColor(color) ? color : fallback;
  }

  function normalizeLabelSettings(settings) {
    const source = settings || {};
    const position = ["diagonal", "vertical", "horizontal", "diagonal-left"].includes(source.position)
      ? source.position
      : "diagonal";
    const autoContrast = source.autoContrast !== undefined
      ? source.autoContrast !== false
      : source.fill === "auto" || !source.fill;

    return { position, autoContrast };
  }

  function inferLabelSettings(face) {
    if (face?.labels) return face.labels;
    return {
      position: face?.family === "Indoor Archery WA" ? "vertical" : "diagonal",
      autoContrast: true
    };
  }

  function normalizeLabelSize(value) {
    return ["small", "medium", "large", "x-large"].includes(value) ? value : "medium";
  }

  function isValidColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "").trim());
  }

  function roundMm(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function clonePlain(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  App.TargetFaces = {
    TARGET_FACES,
    getTargetFace,
    listTargetFaces,
    listBuiltInTargetFaces,
    listCustomTargetFaces,
    loadCustomTargetFace,
    saveCustomTargetFace,
    deleteCustomTargetFace,
    normalizeCustomTargetFace,
    validateTargetFaceDraft,
    isBuiltInTargetFace,
    getTargetFaceGroups,
    getManualScoreOptions
  };
})();
