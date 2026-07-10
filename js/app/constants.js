(function () {
  window.ArcheryApp = window.ArcheryApp || {};

  window.ArcheryApp.Constants = {
    APP_VERSION: "0.9.21",
    SCHEMA_VERSION: 1,
    DEFAULT_TARGET_FACE_ID: "wa_122cm_full",
    DEFAULT_SCORECARD: {
      name: "Olympic Recurve Practice",
      ends: 12,
      arrowsPerEnd: 6,
      distanceM: 70
    },
    STORAGE_KEYS: {
      SCORECARD_INDEX: "sagittarius.scorecards.index.v1",
      SCORECARD_PREFIX: "sagittarius.scorecard.v1.",
      LAST_SCORECARD_ID: "sagittarius.lastScorecardId.v1",
      CUSTOM_TARGET_FACE_INDEX: "sagittarius.customTargetFaces.index.v1",
      CUSTOM_TARGET_FACE_PREFIX: "sagittarius.customTargetFace.v1.",
      LEGACY_INDEX: "archeryScore.sessions.index.v1",
      LEGACY_PREFIX: "archeryScore.session.v1.",
      LEGACY_LAST_ID: "archeryScore.lastSessionId.v1"
    },
    VIEWPORT: {
      MIN_PX_PER_MM: 0.12,
      MAX_PX_PER_MM: 8,
      ZOOM_EASE: 0.24,
      PAN_EASE: 0.32,
      DRAG_THRESHOLD_PX: 4,
      FIT_PADDING_PX: 78,
      ARROW_REAL_RADIUS_MM: 2.4,
      ARROW_SCORING_RADIUS_MM: 2.4,
      ARROW_MIN_RADIUS_PX: 5.5,
      ARROW_HIT_EXTRA_PX: 10
    },
    EXTRAPOLATION: {
      MIN_DISTANCE_M: 10,
      MAX_DISTANCE_M: 100,
      STEP_M: 0.1,
      SCALE_EASE: 0.18
    },
    RING_BREAK_LUCK: {
      SENSITIVITY_WINDOW_MM: 3,
      EVIDENCE_WEIGHT_CAP: 8
    }
  };
})();
