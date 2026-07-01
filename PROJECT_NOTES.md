# Project Notes

## v0.7.12 Export zoom viewport and grouping marker refinement

- `GroupingRenderer.drawMeanPoint()` now renders a small yellow circle again instead of the v0.7.11 twinkle marker.
- End-coloured target exports also use a small yellow centre marker via `drawEndGroupCentreMarker()`.
- `renderTargetImage()` and `renderEndColourTargetImage()` now call `getTargetViewportPadding()` so `zoomToGroup` renders non-end-sheet target exports through a square clipped viewport.
- Regular non-zoom target exports keep the existing full-target fitted layout.
- End sheet mini-targets keep their existing per-cell zoom/focus rendering behavior from v0.7.11.
- End-coloured grouping rings were softened with thinner strokes, lower fill opacity, lower stroke alpha, and reduced glow to avoid noisy all-end overlays.
- No scoring, analytics, storage, or migration changes are included.

## v0.7.11 Export grouping focus and twinkle marker

- `GroupingRenderer.drawMeanPoint()` now renders a four-point twinkle marker instead of the previous crosshair plus yellow centre dot.
- The shared grouping marker uses the Dispersion cyan colour so it reads as part of the grouping overlay system.
- `ExportRenderer` now applies the persistent grouping focus treatment to target-style exports by drawing a clipped target-area scrim and passing `focusAmount: 1` into `GroupingRenderer.drawGroupingOverlay()`.
- End sheet mini-targets receive the same clipped scrim and focused shared grouping overlay treatment.
- End-coloured exports use stronger per-end ring fills/glows and draw a matching per-end twinkle marker at each end group's centroid.
- Export scrims are clipped to the target drawing area so export headers and optional scorecard panels are not dimmed.
- No scoring, analytics, storage, or migration changes are included.

## v0.7.10 Persistent grouping focus

- `TargetViewport.draw()` now sets `groupFocusTarget` from visible enabled grouping overlays rather than `hoverState.any`.
- The grouping focus scrim is stronger and applies after target rendering but before arrows/grouping overlays, so the target/background is darkened while arrows and overlays stay readable.
- `GroupingRenderer` separates hover state from focus state: hover still controls tooltips, while enabled overlays receive persistent focused ring/ellipse/MPI styling.
- Dispersion and Enclosing theme values were brightened, and focused glass fills/glows were strengthened.
- The focus effect only appears when the selected visible-end scope has at least two plotted arrows, because grouping rings cannot render below that threshold.
- No scoring, analytics, storage, or migration changes are included.

## v0.7.9 Export group zoom and overlay layering

- `TargetViewport.draw()` now renders arrows before `GroupingRenderer.drawGroupingOverlay()` so Dispersion, Enclosing, confidence ellipse, and MPI overlays sit above plotted arrows and labels.
- Target-style exports now use the same target -> arrows -> grouping overlay order.
- The Export Image modal adds a `Zoom to plotted group` option. It is read into `exportOptions.zoomToGroup`.
- `ExportRenderer.makeFitTransform()` can now accept derived focus bounds. When `zoomToGroup` is enabled, it fits plotted arrow positions plus enabled grouping bounds, including the radial confidence ellipse.
- Zoom-to-group uses a minimum 160mm world span, 26mm padding, and a max export scale cap so tight groups remain readable without over-zooming.
- End-coloured exports calculate focus bounds from per-end plotted groups; end sheet mini-targets fit each end independently.
- No scorecard data, scoring, storage, or migration changes are included.

## v0.7.8 Trends vertical balance polish

- Trends layout now gives the chart a larger middle row via `trends-view` grid sizing.
- `trends-records` and `trends-record-dashboard` now stretch to fill the lower region instead of leaving unused space below the cards.
- The right-side Records column uses `trends-record-side` rows so the Arrows shot card fills the space beneath Global records on desktop.
- Global records cards use dedicated spacing and typography rules for cleaner label, value, and date placement.
- No scoring, analytics, storage, or migration changes are included.

## v0.7.7 Trends arrow volume counter

- `TrendsView` now stacks Global records with a new Arrows shot counter in the right-side Records column.
- Global records no longer renders the explanatory text block for 70m-equivalent stats; the compact record cards remain unchanged.
- The Arrows shot counter derives counts from saved trend records using `recordedArrows`, falling back to `totalArrows` for older data.
- Current-week arrows use the local Monday-start calendar week, and current-month arrows use the local calendar month.
- No storage migration is required because the counter is derived from existing saved scorecard metadata.

## v0.7.6 Trends layout and explanations

- `TrendsView` now renders the Top 5 totals leaderboard inside `trends-record-section-selected`, keeping the selected face/distance/arrow-count records together.
- The Records dashboard keeps the selected-records component on the left and Global records on the right.
- Global records replaced the previous Comparable records label and explains the three 70m-equivalent stats: Centre, Group, and MPI.
- The chart subtitle now uses each metric's `description` from `HistoryAnalytics` instead of generic lower/higher-is-better text.
- The Trends metric dropdown order now groups raw and 70m-equivalent physical metrics together, with Avg Arrow last.
- The leaderboard rank badges use gold/silver/bronze styling for ranks 1-3.

## v0.7.5 Trends records and leaderboard refinement

- Removed percentage-based trend/PB metrics (`scorePercent` and `averageArrowPercent`) from `HistoryAnalytics` and the Trends UI.
- The Trends metric selector now exposes physical and 70m-equivalent physical metrics: Avg centre, 70m eq centre, Avg arrow, Group size, 70m eq group, MPI offset, and 70m eq MPI.
- Selected Records now filter by target face, distance, and recorded arrow count. Totals and the Top 5 list are therefore compared only within matching scorecard lengths.
- The Top 5 totals leaderboard sorts by `totalScore` descending, then by `averageCentreMm` ascending for identical totals.
- Target Face Manager is now an app-level topbar action rather than a button attached to the scorecard target-face field.
- MPI means mean point of impact. Trends derive MPI from all plotted arrows in a saved scorecard; the target viewport HUD derives MPI from currently visible arrows, so it changes when the Show filter is scoped to one end.

## v0.7.4 Trends records layout and cache

- The Trends view grid now gives less vertical weight to the chart and more to Records.
- The selected target-face/distance controls and same-face/distance PB cards now render inside one `trends-record-section-selected` component.
- Timeline x-axis labels use a year-aware formatter while compact PB card dates remain month/day only.
- `HistoryAnalytics.getTrendRecords()` now keeps an in-memory derived-record cache keyed by saved-scorecard summary fields and target-face zone definitions. This avoids reloading and recalculating every saved scorecard during filter, spacing, and Records selector changes.
- No storage migration is required because the cache is derived at runtime and discarded on page reload.

## v0.7.3 Trends records refinement

- `DevDataGenerator` now creates 200 scorecards and models group spread from a 70m-equivalent accuracy curve scaled by actual scorecard distance.
- Dummy data now uses plausible target-face weighting by distance, random session conditions, non-linear improvement, plateaus, and off-days.
- Timeline x-axis labels now render multiple evenly spaced date ticks.
- Records now use explicit face and distance selectors instead of showing every distance at once.
- Records show a compact SVG target preview for the selected target face.
- Records are split into same-face/distance PBs and cross-context comparable PBs using normalized/percentage metrics.

## v0.7.2 Trends records and distance-adjusted accuracy

- Added `normalizedAverageCentreMm`, labelled 70m eq centre, calculated as `averageCentreMm * (70 / distanceM)` when a scorecard has plotted arrows and a valid distance.
- Trends chart spacing now supports `timeline` mode using real scorecard timestamps and `scorecards` mode using even scorecard order spacing.
- The Trends distance filter always includes standard distances: 10, 18, 20, 30, 40, 50, 60, 70, 80, 90, and 100m. Non-standard saved distances are appended.
- Replaced the recent-scorecard list with a Records panel. Records are grouped by distance for the selected target face and include Total, Score %, Avg Arrow, Avg Centre, 70m eq, Group, and MPI.
- Trend tooltips now choose right- or left-of-cursor placement based on available space.
- The temporary dummy-data generator now samples from the expanded standard distance list.

## v0.7.1 Trends polish and dummy data

- Increased the Trends canvas header gutter so the chart title/subtitle no longer overlap the plot area.
- Anchored the Target / Trends display cluster in the viewport toolbar so it does not shift when target controls are swapped for trend filters.
- Custom select menus detect right-edge overflow and align inward with `.align-right`.
- Added temporary `DevDataGenerator.generateScorecards()` for local Trends testing. It clears saved scorecards, creates 50 plotted scorecards over roughly two years, randomly uses built-in target faces/distances, and improves group consistency over time.
- Added `Storage.clearAllScorecards()` for the temporary generator. It clears saved scorecards and last-open scorecard references without changing custom target faces.

## v0.7.0 Trends view

- Added `HistoryAnalytics` as a derived analytics layer over saved scorecards.
- Added `TrendsView`, a canvas-based right-panel view for saved-scorecard progress graphs.
- `state.viewport.displayMode` switches the right panel between `target` and `trends`.
- Trends currently support Avg Centre, Score %, Group Size, and MPI Offset.
- Score % is normalized as `scorecardTotal / possibleTotal * 100`, making it more comparable across target faces and scorecard lengths than raw totals.
- Physical metrics use plotted arrows only and remain in millimetres: Avg Centre, Enclosing group diameter, and MPI offset.
- Filters include date range, distance, and target face.
- Trend records are derived on render from saved scorecards via `Storage.listScorecards()` and `Storage.loadScorecard()`. No schema or storage migration is required.

## v0.6.7 export scorecard side layout

- Optional scorecard tables now sit in a left-side export panel, with the target face fitted into the right-side canvas area.
- Target exports widen the canvas when `includeScorecard` is enabled instead of increasing canvas height below the target.
- Exported arrow score columns use `SCORECARD_PANEL.scoreCellSize` so the coloured arrow score cells are square.
- Wider summary columns remain rectangular for Total, Run, Avg Arrow, and Avg Centre.

## v0.6.6 export scorecard table option

- Added an `includeScorecard` export option from the Export Image modal.
- Target-style exports pass the option through to `ExportRenderer`; the end sheet export remains unchanged because it already lays out one target per end with score badges.
- `renderTargetImage()` and `renderEndColourTargetImage()` reserve scorecard panel space when enabled.
- The scorecard export panel mirrors the on-screen scorecard columns: End, arrow scores, Total, Run, Avg Arrow, and Avg Centre.
- Current target exports scoped to a single visible end render only that end row while keeping the real running total for that end.
- No storage migration is required because this is a per-export display option.

## v0.6.5 end-coloured target export

- Added `ExportRenderer.exportEndColourTarget()` and `renderEndColourTargetImage()` for a complete-target PNG that plots all positioned arrows by end colour.
- Manual-only arrows are skipped because they do not have `{ xMm, yMm }` positions to render on the target face.
- The export uses the existing grouping math per end. Dispersion rings are dashed; Enclosing rings are solid; both use the plotted-arrow colour for that end.
- A compact end-colour key is rendered in the export footer.
- No storage migration is required because this is a derived export view.

## v0.6.4 per-end scoresheet averages

- Added `ScoringEngine.calculateEndStats(end, targetFace)` for end-scoped total, recorded arrow count, plotted arrow count, average arrow score, and average plotted distance from centre.
- The scoresheet now shows `Avg Arrow` and `Avg Centre` after Total and Run for each end.
- `Avg Arrow` includes plotted and manual scores in that end.
- `Avg Centre` uses plotted arrows only because manual scores have no `{ xMm, yMm }` position.

## v0.6.2 per-zone target labels

- Custom target-face label position remains target-level because it describes where ring labels are placed on the face.
- Custom target-face auto-contrast is target-level and switches all ring labels between automatic black/white contrast and explicit per-zone colours.
- Custom zone data now includes `labelSize` and `labelFill` alongside the existing scoring and rendering fields.
- The editor disables per-zone `labelFill` colour inputs while auto-contrast is enabled.
- Derived custom target-face diameter is shown as a read-only metadata field and is still calculated from the largest zone radius during normalization.
- Existing custom faces with the previous shared `labels.size` / `labels.fill` shape are normalized by inheriting those values into zones where practical.

## v0.6.1 custom target-face editor refinement

- Custom target-face diameter is now derived from the largest zone radius and is no longer edited as separate user input.
- Custom target faces no longer expose default distance in the editor. Distance remains scorecard metadata; built-in faces may still provide default distances for convenience.
- Custom target faces use the shape `{ id, name, shortName, family, description, diameterMm, labels, zones }`, where `diameterMm` is derived during normalization.
- `labels` stores shared target-ring label rendering settings. v0.6.2 keeps `position` and `autoContrast` at target level while moving size/colour to individual zones.
- Custom zone order is preserved in storage and editor/manual-score presentation. Scoring and rendering continue to sort by `radiusMm` where physical order matters.
- Existing custom faces with saved `diameterMm` or `defaultDistanceM` still load; normalization derives the active diameter from zones and drops custom default distance from the saved face shape on next save.
- New Scorecard distance auto-fill now only applies when the selected target face has a built-in/default distance.

## v0.6.0 custom target faces

- Added custom target-face storage using `sagittarius.customTargetFaces.index.v1` and `sagittarius.customTargetFace.v1.<id>`.
- `TargetFaces` now merges built-in faces with locally saved custom faces for `getTargetFace()`, `listTargetFaces()`, and grouped selector rendering.
- Built-in target faces are read-only. The Target Faces manager duplicates built-ins/current faces into editable custom faces.
- Custom zones are edited as diameters in the UI and stored as `radiusMm` internally.
- Custom target faces use the existing target-face rendering shape, with `diameterMm` available for viewport/export scaling.
- Custom zones support `label`, `score`, `radiusMm`, `fill`, `stroke`, `strokeWidthMm`, `labelSize`, and `labelFill`.
- The editor validates required metadata, numeric zone diameter/score values, valid colours, and duplicate labels.
- The editor preview uses `TargetRenderer.drawTarget()` so saved custom faces match viewport/export rendering.
- Scorecard JSON export adds `customTargetFaces` when the current scorecard references custom faces; import saves those bundled faces before loading the scorecard.
- No scorecard schema migration is required because scorecards still reference target faces by id.

## v0.5.9 viewport controls and export visibility

- Reworked the viewport toolbar into grouped control clusters: View, Mode, Canvas, Overlays, and Export.
- The live target visibility slider remains viewport UI state at `state.viewport.targetFaceVisibility`.
- The Export Image modal now includes an independent target visibility slider that defaults to the live viewport value.
- `readExportOptions()` passes `targetFaceVisibility` to `ExportRenderer`.
- `ExportRenderer` passes target visibility to `TargetRenderer.drawTarget()` for current target, full target, and end sheet mini-target PNGs.
- No storage migration is needed because export visibility is a per-export display option.

## v0.5.8 viewport analysis overlays

- `GroupingRenderer.calculatePlottedArrowAnalysis()` derives mean point of impact, centre offset, horizontal/vertical spread, extreme spread, and confidence-ellipse parameters from plotted `{ xMm, yMm }` arrows.
- The Dispersion overlay now draws the existing radial dispersion circle plus a dashed covariance ellipse.
- Grouping overlays now share a gold mean point of impact marker based on the plotted-arrow centroid.
- The viewport HUD shows MPI offset from target centre and horizontal x vertical spread for the currently visible arrows.
- No storage migration is needed because the analysis is calculated from existing plotted arrow positions.

## v0.5.7 restore header mark

- Restored the previous text-based header brand mark because the supplied logo did not read clearly at the current small header size.
- Removed the temporary `assets/logo.png` app asset.

## v0.5.6 header and viewport label polish

- Replaced the header text glyph brand mark with `assets/logo.png`.
- Renamed the live grouping buttons from Radial/Simple to Dispersion/Enclosing while leaving the existing internal radial/simple state names in place.
- Changed Export Image back to the normal viewport button style so it is not visually promoted by default.
- Shot on and Scoring as metadata now render full target-face names; existing CSS ellipsis handles overflow.

## v0.5.5 target fade viewport control

- Added a compact Target slider to the viewport toolbar.
- The slider stores `state.viewport.targetFaceVisibility` as viewport-only UI state from `0.35` to `1`.
- Live target rendering applies a combined saturation, brightness, and opacity filter to the target face pass only, so arrows, labels, grouping overlays, scale, and HUD remain full strength.
- Target fade does not alter scorecard data. v0.5.9 later added a separate target visibility option for exported PNG images.

## v0.5.4 manual-score target lock

- The target-face selector is disabled whenever the current scorecard contains one or more manual score entries.
- Target-face changes are also blocked in the action layer while manual scores exist, preventing impossible score labels/values from appearing on target faces that do not support them.
- Clearing manual scores unlocks target-face comparison again.
- No scorecard schema or storage migration change is needed; the lock is derived from existing arrow data.

## v0.5.3 scorecard average stats

- Added derived scorecard footer stats for average arrow score and average plotted-arrow distance from target centre.
- Average arrow score uses all recorded arrows, including plotted arrows scored against the active target face and manual score entries.
- Average centre distance uses plotted arrows only, because manual scores do not have physical positions.
- No scorecard schema or storage migration change is needed; both values are calculated live from existing scorecard data.

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
  defaultDistanceM, // built-ins only; custom face distance belongs to the scorecard
  labels,
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

Custom target faces derive `diameterMm` from the largest zone radius during normalization.

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
- New-scorecard distance auto-updates to a selected built-in target face's default unless manually edited. Custom target faces leave scorecard distance unchanged.

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
