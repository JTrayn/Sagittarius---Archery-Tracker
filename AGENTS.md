# AGENTS.md

## Project

Sagittarius - Archery Tracker

This is a vanilla HTML / CSS / JavaScript web app for recording Olympic recurve archery scorecards. The app lets the user plot arrows on a rendered target face, calculate scores, save/load scorecards, compare scoring across target faces, export target images, and analyse shot grouping.

The project started as an iterative ChatGPT-built app. Preserve the existing UX style and architecture unless explicitly asked to refactor.

## Current version

v0.7.12

v0.7.12 refines export zoom viewports, restores small yellow grouping centre markers, and softens end-coloured grouping rings.

## Core terminology

Use **scorecard**, not session.

Older project history may refer to sessions, but all current user-facing terminology should say scorecard.

Examples:

- New Scorecard
- Load Scorecard
- Saved scorecards
- Scorecard name
- Scorecard metadata

Avoid reintroducing "session" in UI, docs, variable names, or comments unless referring to legacy migration code.

## Current architecture

The app is a client-side static web app.

Core concepts:

- Target faces are defined as real-world radial score zones.
- Custom target-face diameter is derived from the outermost zone, not edited separately.
- Scorecard distance is scorecard metadata, not custom target-face metadata.
- Arrow positions are stored in millimetres relative to the target centre.
- Scores are derived from arrow position and the active target face.
- Manual score entries are supported separately from plotted arrows.
- Scorecard data is saved locally in browser storage.
- Custom target faces are saved locally in browser storage and merged into target-face APIs.
- Existing saved data may require migration from older localStorage keys.

Important coordinate rule:

- Do not store arrow positions in screen pixels.
- Store plotted arrow positions as `{ xMm, yMm }`.
- Canvas pan/zoom transforms should only affect rendering and interaction.

## Scoring rules

- A plotted arrow is scored against the active target face.
- Scores are calculated from physical arrow position, target zone radii, visible line width, and arrow shaft radius.
- Line cutters score the higher value.
- Default arrow scoring radius is currently fixed.
- Future feature: allow the user to define arrow diameter.

## Target faces currently supported

- World Archery 122cm full target face
- World Archery 40cm full target face
- Indoor Archery WA Series 1
- Indoor Archery WA Series 2
- Indoor Archery WA Series 3
- Locally saved custom target faces

Custom target faces:

- Store zones as physical radii in millimetres.
- Preserve custom zone order for editor/manual-score presentation.
- Use radius sorting only where scoring/rendering needs physical inner-to-outer or outer-to-inner order.
- Store shared label settings for position and auto-contrast.
- Store per-zone label size and label colour for custom target faces.

Indoor Archery WA zones:

- X = orange, score 8
- 8 = black, score 8
- 7 = yellow, score 7
- 5 = black, score 5
- White borders except outermost red border
- X label is a large red X
- Supplied measurements were interpreted as zone diameters

## Viewport modes

The target viewport has three interaction modes.

### Plot

For actively recording arrows.

- Click target to plot the selected empty arrow.
- Do not silently overwrite already plotted arrows.
- Auto-advance to the next empty arrow.

### Edit

For moving existing plotted arrows.

- Click/drag existing arrows to fine-tune position.
- Scorecard updates in real time.
- Score-change feedback appears while dragging.

### Locked

For safe review.

- No arrow is selected by default when opening completed scorecards.
- No plotting.
- No dragging arrows.
- Panning and zooming still work.
- Used automatically when opening completed scorecards.

Default mode rules:

- New scorecards open in Plot mode.
- Incomplete saved scorecards open in Plot mode and select the first empty arrow.
- Completed saved scorecards open in Locked mode with no arrow selected.

## Viewport display

The right panel has two display surfaces.

- **Target** shows the plotted target face and existing plotting/editing controls.
- **Trends** replaces the target canvas with saved-scorecard progress graphs and trend filters.

Trends are derived from saved scorecards and cached in memory using a saved-scorecard/target-face fingerprint. Do not store separate persisted trend records unless a later performance need is proven.

## Current UI direction

The UI should remain modern, clean, dark, cohesive, and polished.

Current layout:

- Top app header contains brand and primary scorecard actions.
- Left panel contains scorecard metadata, score table, manual scoring, notes, and stats.
- Right panel contains the canvas viewport and viewport controls.

Important UI preferences:

- Avoid UI elements that look like buttons unless they are interactive.
- Read-only metadata should look like labelled information, not pill buttons.
- Scorecard arrow cells should use the active target face zone colour as the cell background.
- Score text should be black or white depending on contrast.
- Keep the larger score text size in the scorecard cells.
- Preserve the prominent total score pill at the top of the scorecard panel.
- Keep the Save button beside the total score pill.
- Scoresheet end rows include Total, Run, Avg Arrow, and Avg Centre columns.
- Status belongs in the same metadata row as Shot on / Scoring as.
- Do not show Round type in the current UI; notes should take the full lower notes area.

## Export features

Current export image features:

- Current target view PNG
- Complete scorecard target PNG
- End-coloured target PNG
- End sheet PNG
- Export options for labels, target visibility, dispersion/radial grouping, and enclosing/simple grouping
- Optional scorecard table on target image exports
- Optional Zoom to plotted group mode for target image and end sheet exports
- Grouping exports use the persistent target-focus styling without dimming export headers or scorecard panels
- Scorecard JSON export bundles referenced custom target-face definitions.
- End sheet score badges use target-zone colours

## Grouping features

Two grouping modes exist.

### Dispersion / Radial

- Cyan theme
- Uses centroid and radial standard deviation / dispersion circle
- Also draws a confidence ellipse based on plotted-arrow covariance
- Tooltip shows radius only
- Tooltip appears only when hovering over the group ring
- Renders above plotted arrows and arrow labels

### Enclosing / Simple

- Red theme
- Uses minimum enclosing circle
- Tooltip appears only when hovering over the group ring
- Renders above plotted arrows and arrow labels

Current user-facing viewport labels should say **Dispersion** and **Enclosing**. Internal code may still use radial/simple terminology for the existing state and renderer APIs.

Grouping overlays share a small yellow circular mean point of impact marker based on the plotted-arrow centroid. Keep the marker compact so it does not dominate zoomed-out views. The viewport HUD shows the visible arrows' MPI offset from target centre and horizontal/vertical spread.

When Dispersion or Enclosing is enabled and at least two plotted arrows are visible, the live viewport darkens the target/background and renders brighter grouping overlays until the overlays are disabled. Hovering over grouping rings should still only control ring tooltips and a subtle extra emphasis.

## Trends features

Current Trends metrics:

- Avg centre distance in millimetres.
- 70m-equivalent centre distance in millimetres.
- Enclosing group diameter in millimetres.
- 70m-equivalent enclosing group diameter in millimetres.
- Mean point of impact offset in millimetres.
- 70m-equivalent mean point of impact offset in millimetres.
- Average arrow score.

Prefer physical millimetre metrics and 70m-equivalent normalized physical metrics for cross-scorecard comparisons. Raw totals are useful only when target face, distance, and arrow count are controlled together.

## Development preferences

When making changes:

1. Preserve existing working behaviour unless the task explicitly changes it.
2. Keep UI polish high.
3. Prefer small, focused changes.
4. Update README.md and PROJECT_NOTES.md when behaviour changes.
5. Update CHANGELOG.md for user-visible changes.
6. Keep backwards compatibility for saved scorecards where practical.
7. Do not remove localStorage migration code unless explicitly asked.
8. Test scoring, storage, target switching, plotting, locked mode, exports, and dropdown/modal interactions after changes.
9. Avoid large framework migrations unless specifically requested.
10. Avoid adding build tooling unless it clearly improves the workflow.
11. Keep the app easy to run locally.

## Documentation discipline

When a change affects user-visible behaviour, UI, data models, scoring, storage/migration, or adds a feature, update the genuinely relevant docs in the same change. Consider `README.md`, `PROJECT_NOTES.md`, `CHANGELOG.md`, `ROADMAP.md`, `TESTING.md`, and `AGENTS.md`, but do not update files that are not materially affected.

## Suggested validation after edits

At minimum:

- Open `index.html` locally.
- Create a new scorecard.
- Plot arrows.
- Save scorecard.
- Reload app and confirm last scorecard opens.
- Load a completed scorecard and confirm Locked mode starts with no selected arrow.
- Load an incomplete scorecard and confirm Plot mode starts at the first empty arrow.
- Switch target faces and confirm arrows remain physically positioned.
- Export target image and end sheet.
- Test scorecard colour rendering on World Archery and Indoor Archery WA faces.
- Test custom dropdowns do not render under other UI panels.

## Current known future ideas

Potential future features include:

- User-defined arrow diameter.
- Equipment tracking.
- Custom target-face import/export and richer presets.
- More detailed scorecard history analysis.
- Trend charts.
- Shot grouping over time.
- Printing / PDF export.
- Better mobile/tablet layout later, but desktop landscape is the current priority.

## User preferences

The user prefers iterative development with visible changelogs and version bumps.

Use version numbers like:

- v0.5.2 for small patch changes
- v0.6.0 for a meaningful feature milestone
- v1.0.0 only when the app feels stable and complete enough for normal use
