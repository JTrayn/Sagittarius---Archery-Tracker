# Project Notes

## v0.5.2 Codex/repository preparation

- Added `AGENTS.md` with project architecture, terminology, UI preferences, scoring rules, viewport modes, and development guidance for Codex/AI coding agents.
- Added `CHANGELOG.md`, `ROADMAP.md`, `TESTING.md`, and `.gitignore`.
- Bumped `APP_VERSION` to `0.5.2`.
- No intended app functionality changes from v0.5.1.

## v0.5.1 scorecard panel refinement

- Restored the top `score-total-pill` inside the scorecard overview header.
- The Save button now sits immediately to the left of that total pill.
- The saved/unsaved status is rendered as a third `scorecard-meta-item` inside the Shot on / Scoring as row.
- `TopControls.renderFooter()` no longer renders round type or the lower total stat.
- The footer now contains only secondary stats plus a full-width notes textarea.
- Round type remains in the data model for backward compatibility and saved-scorecard summaries, but it is not shown in the main scorecard UI.

## v0.5.0 scorecard panel layout

- Removed the separate Details modal. Current scorecard metadata is now edited directly in the scorecard panel.
- Moved Save into the scorecard panel; v0.5.1 then moved it beside the restored top total pill.
- The top toolbar now only holds app-level actions: New Scorecard, Load, Export JSON, and Import JSON.
- Above the arrow grid, the scorecard panel now shows only core setup/identity fields: scorecard name, target face, distance, date, shot-on target, and scoring-as target.
- X count, misses, arrows recorded, and notes live below the scorecard cells. v0.5.1 restored the total pill to the top and removed visible round type editing.
- The selected-arrow status moved into the Manual score strip so the top scorecard identity block stays clean.

## v0.4.8 terminology and branding

- App name changed to **Sagittarius - Archery Tracker**.
- The saved record type is now called a **scorecard** throughout the UI, docs, and JavaScript data layer.
- Renamed data/UI modules to `scorecardFactory.js` and `scorecardBrowser.js`.
- State now stores the active record as `state.scorecard`.
- Storage API now uses `saveScorecard`, `loadScorecard`, `listScorecards`, `deleteScorecard`, `renameScorecard`, and `duplicateScorecard`.
- New storage keys use the `sagittarius.scorecards.*` namespace.
- Older browser localStorage data is copied forward on first startup so earlier saved scorecards are preserved.

## Current core decision

Use millimetres relative to target centre as the app's source-of-truth coordinate system.

- Target centre: `{ xMm: 0, yMm: 0 }`
- Right side of target: positive `xMm`
- Down from centre: positive `yMm`

This maps naturally to canvas coordinates and keeps scoring, target swapping, and later cluster analysis simple.

## Target face model

Each target face is pure data:

```js
{
  id,
  name,
  shortName,
  family,
  diameterMm,
  defaultDistanceM,
  zones: [
    { id, label, score, radiusMm, fill, stroke, strokeWidthMm }
  ]
}
```

Optional target-face properties now include:

```js
{
  centreLabel: {
    text,
    fill,
    fontWeight,
    minPx,
    maxPx,
    scaleMm
  }
}
```

Zones are scored from smallest radius to largest radius. Plotted-arrow scoring uses the configured physical shaft radius, so line cutters score the higher zone when any part of the arrow overlaps the scoring boundary.

## Built-in faces as of v0.3.0

- World Archery 122cm Full Face
- World Archery 40cm Full Face
- Indoor Archery WA Series 1
- Indoor Archery WA Series 2
- Indoor Archery WA Series 3

Indoor Archery WA zone diameters were interpreted as supplied zone diameters, not ring widths. They are converted from inches using `1 inch = 25.4mm`, then stored as zone radii.

## Scorecard model

A scorecard has many ends. Each end has many arrows.

A plotted arrow:

```js
{
  position: { xMm, yMm },
  manualScore: null
}
```

A manually scored arrow:

```js
{
  position: null,
  manualScore: { label, value, zoneId, isMiss }
}
```

Scorecard-level metadata includes:

```js
{
  shotAt,
  roundType,
  notes,
  equipment,
  originalTargetFaceId,
  activeViewTargetFaceId
}
```

`originalTargetFaceId` records what the scorecard was created as / shot on. `activeViewTargetFaceId` controls the currently rendered/scored comparison target.



## v0.4.7 notes

- Added a third viewport interaction mode: `locked`.
- `state.selected` can now be `null`; all renderers that read selected-arrow state must guard against null selection.
- `State.setScorecard()` now derives the opening mode from scorecard completeness unless explicitly overridden:
  - incomplete scorecard => first empty arrow selected, Plot mode;
  - complete scorecard => no arrow selected, Locked mode.
- `findFirstOpenArrow(scorecard)` now returns `null` when every arrow has either a plotted position or manual score.
- Locked mode permits inspection/selection of arrows but blocks destructive viewport operations.
- `plotSelectedArrow()` refuses to overwrite already-recorded arrows.
- `advanceSelection()` now searches for the next empty arrow; when none remain, it clears selection and switches to Locked mode.
- Manual score entry and right-click clearing are blocked while Locked mode is active.

## v0.4.6 notes

- Scorecard scored arrow cells now use `zone.fill` as the cell background, rather than using `zone.fill` as the text colour.
- `ScorecardView.scoreStyle()` now sets CSS variables for `--score-zone-bg`, `--score-zone-text`, and `--score-zone-border`.
- Text colour is chosen dynamically by comparing black/white contrast against the zone background.
- The previous text stroke/outline approach was removed.
- Cell borders are subtly mixed from the zone colour and selected text colour so very dark cells remain separated from the dark scorecard panel.
- The enlarged v0.4.4/v0.4.5 score text sizing was retained.

## v0.4.5 notes

- Removed scorecard text glow/halo styling from v0.4.4.
- Scorecard score text still uses the active target face zone colour.
- `ScorecardView.scoreStyle()` now calculates approximate contrast against the scorecard background and only enables a solid `-webkit-text-stroke` when the zone colour has low contrast.
- The outline is deliberately restrained and solid, not blurred or glowing.
- Larger score text sizing from v0.4.4 was retained.

## v0.4.4 notes

- `ScorecardView` now derives arrow-cell score colours from the active target face's `zone.fill` value via the scored arrow's `zoneId`.
- This avoids hardcoded score colour assumptions and supports custom target faces where score labels/values do not match World Archery colours.
- Scorecard buttons set CSS variables for the zone colour and conditional solid contrast outline.
- Dark zones retain dark score text and now use the v0.4.5 solid-outline contrast treatment when required.
- Arrow-cell score text was increased to approximately three-fifths of the cell height for faster visual scanning.

## v0.3.2 notes

- Updated `ScoringEngine.scorePosition()` from centre-point-only scoring to line-cutter scoring.
- Plotted scores now use `VIEWPORT.ARROW_SCORING_RADIUS_MM`, defaulting to `2.4mm`, with fallback to `VIEWPORT.ARROW_REAL_RADIUS_MM`.
- Zone scoring checks `distanceMm - arrowRadiusMm <= zone.radiusMm + lineHalfWidthMm`, so any part of the shaft reaching the scoring border receives the higher zone.
- The visible line half-width is derived from each zone's `strokeWidthMm`.
- Score results now include `arrowRadiusMm` and `isLineCutter` for future inspection/analysis features.
- Manual scores remain unchanged and do not use line-cutter calculations.
- Existing saved scorecards do not need migration because plotted arrows are stored as millimetre coordinates and scores are derived live.

## v0.3.1 notes

- Added viewport interaction modes:
  - `plot`: click plots selected arrow and auto-advances.
  - `edit`: click plotted arrows to inspect/select them, drag plotted arrows to move them, and never create new arrows from empty-space clicks.
- Empty-space dragging still pans the viewport in both modes.
- Wheel zoom still works in both modes.
- Arrow hit testing uses screen-space marker radius plus an extra hit padding value from `VIEWPORT.ARROW_HIT_EXTRA_PX`.
- Dragging a plotted arrow preserves the cursor-to-arrow offset so fine edits do not snap the marker centre to the pointer.
- `Actions.moveArrow()` updates an existing plotted arrow without auto-advancing selection.
- Scores are still derived from stored millimetre positions, so scorecard totals update immediately while dragging.

## v0.3.0 notes

- Added five total target faces.
- Target-face dropdowns are grouped by `family`.
- Swapping target face updates `activeViewTargetFaceId`, not `originalTargetFaceId`.
- Changing target face recalculates all derived scores and totals from the same stored millimetre arrow positions.
- Changing target face does not auto-fit the viewport. This preserves physical scale, so smaller faces look smaller compared with the original target unless the user manually presses Fit.
- Scorecard strip and viewport HUD now show comparison context when `originalTargetFaceId !== activeViewTargetFaceId`.
- Saved-scorecard summaries now include original target face fields and comparison status.
- New-scorecard distance auto-updates to the selected target face's default unless manually edited.

## Future-safe concepts already included

- `schemaVersion` on scorecards.
- Target face definitions are data-driven.
- Storage is behind a small adapter.
- Scoring is independent from rendering.
- Canvas drawing is split into target, arrow, scale, and interaction modules.
- Saved-scorecard summaries are generated from full scorecard data and can be refreshed for older saves.

## v0.2.1 notes

- Replaced in-app system confirm/prompt calls with custom centred dialogs.
- Added a separate dialog overlay so confirmations can appear above an already-open modal.
- Saved-scorecard browser now groups scorecards by local scorecard date using `shotAt` first and `createdAt` as fallback.
- Fixed backdrop-close behaviour by requiring the pointer interaction to start on the backdrop before backdrop-click closing is allowed.

## v0.2.0 notes

- Added richer saved-scorecard browser with search.
- Added saved-scorecard rename, duplicate, export, and delete actions.
- Added scorecard date/time, round type, and notes fields.
- Added scorecard date/time, round type, and notes fields. v0.5.0 later moved editing for these into the scorecard panel and removed the Details modal.
- Added unsaved-change confirmation before New, Load, Import, and before browser unload.
- Viewport labels now show only the arrow sequence number.
- Score total pill alignment has been adjusted to sit centred in its container.

## v0.4.3 notes

- `ExportRenderer` now accepts per-export display options:
  - `showArrowLabels`
  - `showRadialGrouping`
  - `showSimpleGrouping`
- The Export Image modal exposes those display options before choosing current target, full target, or end sheet export.
- End-sheet arrow score badges are rendered as individual coloured pills based on the scoring result's zone colour, with miss scores using the app's red miss styling.
- `GroupingRenderer.getGroupingHoverState()` calculates whether the pointer is near the radial or simple grouping ring.
- `TargetViewport` now eases a `groupFocusAmount` value toward the grouping hover state, allowing a smooth hover-focus animation.
- While hovering near a grouping ring, the live viewport draws a subtle dark target scrim before redrawing boosted grouping overlays. This makes the selected group easier to inspect without permanently increasing visual clutter.
- Group hover detection is ring-biased rather than whole-circle-biased for normal-sized group circles, so the focus effect is less intrusive.

## v0.4.2 notes

- Fixed the custom target-face dropdown appearing underneath the workspace by giving the scorecard strip and open custom selects explicit stacking priority.
- Replaced the single grouping toggle with independent `state.viewport.showRadialGrouping` and `state.viewport.showSimpleGrouping` flags.
- The Radial toggle draws the radial dispersion / σ-radius circle around the centroid.
- The Simple toggle draws the minimum enclosing circle, using the earlier simple grouping method and a red visual theme.
- `GroupingRenderer.drawGroupingOverlay()` now accepts `showRadial`, `showSimple`, and `pointerScreen` options.
- Group labels now behave as hover tooltips and are hidden unless the pointer is within/near the relevant group circle.
- Group labels have been simplified to only display the relevant radius statistic. Spread values are still calculable internally but no longer shown in the tooltip.
- Removed the prior hatch/checker visual from the group overlay and toned down fill/stroke intensity while retaining a dark outline for readability across target colours.
- Export rendering now respects the active Radial/Simple grouping toggles and suppresses hover labels in exported images.

## v0.4.1 notes

- Added `ui/customSelect.js`, a reusable custom select/dropdown wrapper for native `<select>` elements. The native select remains in the DOM for form submission and existing change handlers, while the custom UI provides a consistent app-styled dropdown.
- Applied custom dropdowns to the top target-face selector, New Scorecard target-face selector, and viewport Show selector.
- Plot/Edit are now visually grouped as a segmented viewport control.
- Labels and Groups are now simple toggle buttons whose active visual state communicates on/off.
- `GroupingRenderer.calculateGroupStats()` now uses radial dispersion around the centroid instead of the minimum enclosing circle as the primary grouping method.
- The visible group circle now represents the radial σ radius. Minimum enclosing circle support remains in the module for possible future comparison/export modes, but it is no longer the default overlay.
- The group overlay now uses a stronger cross-target visual style: screen + multiply fills, subtle hatch lines, dark outline, bright cyan stroke, and white dashed inner stroke. This makes it readable on black, yellow, red, blue, and white target zones.

## v0.4.0 notes

- Added `state.viewport.visibleEndIndex`, where `null` means all ends and a number means a specific end index.
- Added `state.viewport.showRadialGrouping` and `state.viewport.showSimpleGrouping` for independent grouping overlay toggles.
- `ArrowRenderer.getVisibleArrowEntries()` is now the shared filtering helper for viewport rendering, hit testing, grouping, and export.
- Edit-mode hit testing respects `visibleEndIndex`, so arrows hidden by the Show dropdown are not selectable.
- `GroupingRenderer` calculates a minimum enclosing circle around visible plotted arrow centres. It also calculates centroid, horizontal spread, vertical spread, and mean radius.
- The grouping overlay draws the minimum enclosing circle, a centroid marker, and a clean stats label in the main viewport.
- `ExportRenderer` creates fitted PNG exports independent of current pan/zoom:
  - current target view, using the active Show filter;
  - full scorecard target;
  - end sheet with one mini target per end.
- `ViewportMath.getCanvasRect()` now supports virtual/offscreen export canvases as well as the live browser canvas.

## Likely next milestone

Milestone 5 should move toward analysis/history features:

- Scorecard trend charts.
- Average score per arrow/end over time.
- Group-size trend over time.
- Group-centre offset analysis.
- Equipment metadata and equipment-based comparisons.


## v0.3.5 notes

- Added `STORAGE_KEYS.LAST_SCORECARD_ID` for remembering the last saved/loaded scorecard.
- `Storage.loadLastOpenScorecard()` first tries the remembered scorecard ID, then falls back to the most recently updated saved-scorecard summary.
- `Actions.saveCurrentScorecard()` and `Actions.loadScorecard()` update the remembered scorecard.
- Deleting the remembered scorecard clears the remembered ID.
- Startup now loads the remembered/fallback scorecard as clean (`dirty: false`) before creating a new starter scorecard.
- Unsaved new/imported scorecards are not automatically persisted; they must be saved before they become restorable.

## v0.3.4 notes

- Added viewport score-change feedback for arrow dragging in Edit mode.
- `TargetViewport` now maintains a small transient `scoreFeedback` queue and redraws while popups are active.
- Popups are drawn on the canvas after arrows and before the scale ruler.
- `InteractionController` compares the dragged arrow's previous score key against the score derived from the current rounded millimetre drag position.
- Feedback is only emitted on actual label/value/zone/miss changes, avoiding noisy repeated animation during normal dragging.
- `ArrowRenderer.getMarkerRadius()` is now exported so feedback placement stays aligned with the visual marker radius.

## v0.3.3 notes

- Adjusted arrow marker rendering so high-zoom visual size matches `ARROW_REAL_RADIUS_MM`.
- `ARROW_MAX_RADIUS_PX` was removed because it made arrows visually smaller than the scoring shaft at high zoom, causing apparent gaps while still scoring line-cutters.
- Low zoom still uses `ARROW_MIN_RADIUS_PX` as a usability floor; close inspection should be done at higher zoom where the marker is physically accurate.