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
  ];

  function getTargetFace(targetFaceId) {
    return TARGET_FACES.find(face => face.id === targetFaceId) || TARGET_FACES[0];
  }

  function listTargetFaces() {
    return TARGET_FACES.slice();
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

  App.TargetFaces = {
    TARGET_FACES,
    getTargetFace,
    listTargetFaces,
    getTargetFaceGroups,
    getManualScoreOptions
  };
})();
