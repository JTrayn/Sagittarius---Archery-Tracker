# Changelog

## v0.7.6 - Trends layout and explanations

- Folded the Top 5 totals leaderboard into the selected Records component.
- Kept selected Records aligned on the left with Global records on the right.
- Styled the top three leaderboard rank badges as gold, silver, and bronze.
- Reordered the Trends metric dropdown into paired raw/70m-equivalent physical metrics, with Avg Arrow last.
- Replaced generic chart subtitles with metric-specific explanations.
- Renamed Comparable records to Global records and added short explanations for its three 70m-equivalent stats.

## v0.7.5 - Trends records and leaderboard refinement

- Removed Score % and Avg arrow % from Trends and Records.
- Added 70m eq group and 70m eq MPI to the Trends metric selector.
- Added an Arrows filter to selected Records so totals compare matching scorecard lengths.
- Added a Top 5 totals leaderboard for the selected target face, distance, and arrow count, with average centre as the tie-breaker.
- Moved Target Face Manager into the top header beside New Scorecard.
- Shifted the Trends chart styling toward the app's blue accent.

## v0.7.4 - Trends records layout and cache

- Gave the Trends Records panel more vertical room and reduced the chart's share of the view.
- Grouped the Records target-face/distance selectors with the PB cards they control.
- Removed the redundant selected-distance "target records" subheading.
- Added years to Timeline x-axis date labels.
- Cached derived trend analytics in memory so filtering and Records changes do not repeatedly reload and recalculate every saved scorecard.

## v0.7.3 - Trends records refinement

- Increased generated dummy data to 200 scorecards.
- Reworked dummy data generation to use distance-scaled group sizes, noisier session conditions, and a more realistic long-term improvement curve.
- Added more timeline x-axis date labels.
- Replaced the grouped-distance Records layout with face and distance selectors.
- Added a visual target-face preview to Records.
- Split Records into same-face/distance PBs and comparable cross-context PBs.

## v0.7.2 - Trends records and distance-adjusted accuracy

- Added a Timeline / Scorecards chart spacing toggle.
- Added 70m eq centre as a distance-adjusted accuracy metric.
- Added standard distance filter options for 10, 18, 20, 30, 40, 50, 60, 70, 80, 90, and 100m.
- Replaced the bottom recent-scorecard list with Records/PB cards grouped by distance for the selected target face.
- Improved trend point tooltip positioning so it flips left of the cursor near the right edge.
- Updated the dummy scorecard generator to use the expanded standard distance set.

## v0.7.1 - Trends polish and dummy data

- Moved the Trends chart title/subtitle above the plotting area so it no longer overlaps the graph.
- Kept the Target / Trends display toggle visually anchored while swapping between target controls and trend filters.
- Made custom dropdown menus near the right viewport edge align inward.
- Added a temporary Generate Dummy Data topbar button that clears saved scorecards and creates 50 plotted dummy scorecards for Trends testing.

## v0.7.0 - Trends view

- Added a Target / Trends display toggle in the right panel.
- Added a saved-scorecard Trends view with a clean canvas line chart, summary stats, hover details, and a recent scorecard list.
- Added trend metrics for Avg Centre, Score %, Group Size, and MPI Offset.
- Added trend filters for date range, distance, and target face.
- Trend points and table rows can open the associated saved scorecard.
- Trends are derived from saved scorecards at render time; no storage migration is required.

## v0.6.7 - Export scorecard side layout

- Moved optional target-export scorecard tables to the left of the target face.
- Kept the target face fitted in the right-side export area when the scorecard table is enabled.
- Changed exported arrow score columns to fixed square cells instead of horizontally stretched cells.

## v0.6.6 - Export scorecard table option

- Added a Scorecard table option to target image exports.
- Target exports can render a polished scorecard panel with the target when enabled.
- Single-end current target exports include only the selected end row instead of the full scorecard.
- Exported scorecard rows include arrow scores, Total, Run, Avg Arrow, and Avg Centre with target-zone score colours.

## v0.6.5 - End-coloured target export

- Added an End-coloured target PNG export that plots all positioned arrows on one complete target face.
- Colour-coded plotted arrows by end with a compact exported colour key.
- Dispersion and Enclosing export options now render matching per-end grouping rings for this export type.

## v0.6.4 - End average columns

- Added Avg Arrow and Avg Centre columns to each scoresheet end row after Total and Run.
- End averages use the same rules as the footer stats, scoped to the arrows in that end.

## v0.6.3 - Custom target-face editor layout

- Moved the scoring-zones editor below the metadata/preview row so it uses the full modal width.
- Removed the horizontal scroll requirement from the scoring-zones table at normal modal width.

## v0.6.2 - Per-zone target labels

- Moved custom target-face label size and colour controls into each scoring-zone row.
- Kept target label position and auto-contrast as shared target-face settings.
- Auto contrast now disables per-zone label colour pickers while enabled.
- Moved derived target diameter into a read-only metadata field near the face name fields.

## v0.6.1 - Custom target-face editor refinement

- Removed overall target diameter and default distance fields from the custom target-face editor.
- Custom target-face diameter is now derived from the outermost scoring zone.
- Added target label controls for position, size, and colour/auto-contrast.
- Added drag-and-drop reordering for custom target-face zones.
- Preserved custom zone order for editor/manual-score presentation while keeping radius-based scoring/rendering behaviour.
- Fixed Target Faces manager actions not opening the custom-face editor.

## v0.6.0 - Custom target faces

- Added a Target Faces manager opened from the scorecard setup target-face field.
- Added custom target-face localStorage persistence.
- Built-in target faces can be duplicated into editable custom faces.
- Custom target faces support metadata, zone labels/scores, zone diameters, colours, line colours, line widths, validation, and live preview.
- Custom target faces are merged into existing target-face selectors and scoring/rendering APIs.
- Scorecard JSON export/import bundles referenced custom target-face definitions.

## v0.5.9 - Viewport controls and export visibility

- Regrouped viewport controls into clearer View, Mode, Canvas, Overlays, and Export clusters.
- Added a target visibility slider to the Export Image modal.
- Exported target PNGs and end sheet mini-targets now respect the export target visibility setting.

## v0.5.8 - Viewport analysis overlays

- Added a confidence ellipse to the Dispersion grouping overlay.
- Added a mean point of impact marker for plotted arrows.
- Added viewport HUD stats for mean point offset from centre plus horizontal and vertical spread.
- Viewport analysis is derived from plotted arrow positions and does not require storage migration.

## v0.5.7 - Restore header mark

- Restored the previous text-based Sagittarius header mark.
- Removed the temporary supplied logo image from the app.

## v0.5.6 - Header and viewport label polish

- Replaced the text brand mark with the supplied Sagittarius logo image.
- Renamed grouping viewport controls to Dispersion and Enclosing.
- Restyled Export Image as a normal viewport button.
- Shot on and Scoring as metadata now display full target-face names with ellipsis overflow.

## v0.5.5 - Target fade viewport control

- Added a live viewport target fade slider.
- The slider dims and desaturates the target face while keeping arrows, grouping overlays, labels, and HUD elements at full strength.
- Target fade is viewport-only UI state and does not change scorecard data or exported images.

## v0.5.4 - Manual-score target lock

- Locked the target-face selector while a scorecard contains manual score entries.
- Prevented target-face changes from creating impossible manual scores on comparison target faces.
- Manual-score target locking is derived from existing arrow data and does not require storage migration.

## v0.5.3 - Scorecard average stats

- Added average arrow score to the scorecard footer stats.
- Added average plotted-arrow distance from target centre to the scorecard footer stats.
- Average score is calculated from recorded plotted and manual arrows.
- Average centre distance is calculated from plotted arrows only.

## v0.5.2 - Codex/repository preparation

- Added `AGENTS.md` so Codex has project context and development guidance.
- Added `CHANGELOG.md`.
- Added `ROADMAP.md`.
- Added `TESTING.md`.
- Added `.gitignore`.
- Updated documentation for repo-based development.
- App functionality is unchanged from v0.5.1.

## v0.5.1 - Scorecard panel refinement

- Restored the prominent total score pill at the top of the scorecard panel.
- Moved Save beside the total score pill.
- Moved Status into the same row as Shot on / Scoring as.
- Removed visible Round type info/editing.
- Gave Notes the full lower footer area beneath the scorecard cells.

## v0.5.0 - Scorecard metadata refactor

- Removed Current record.
- Removed the Details button and modal.
- Moved scorecard metadata editing into the scorecard panel.
- Moved secondary stats and notes beneath the scorecard cells.
- Reduced the top toolbar to primary scorecard actions.

## v0.4.9 - Integrated scorecard info panel

- Removed the separate top scorecard info strip.
- Moved scorecard metadata into the left scorecard panel.
- Restyled read-only scorecard data as labelled information rather than button-like pills.

## v0.4.8 - Sagittarius rename and scorecard terminology

- Renamed the app to Sagittarius - Archery Tracker.
- Replaced user-facing session terminology with scorecard terminology.
- Added localStorage migration from legacy session keys to new scorecard keys.

## v0.4.7 - Locked mode

- Added Plot / Edit / Locked viewport modes.
- Completed saved scorecards open in Locked mode with no arrow selected.
- Incomplete scorecards open in Plot mode at the first empty arrow.
- Plot mode refuses to overwrite already-recorded arrows.

## v0.4.6 - Scorecard cell zone colours

- Scorecard arrow-cell backgrounds use the active target face zone colour.
- Score text switches black/white for contrast.
- Removed outline/stroke scoring text approach.

## v0.4.5 - Removed score halo/glow

- Removed glow/halo effect from scorecard scores.
- Used a restrained solid outline only for low-contrast score text.

## v0.4.4 - Target-zone score colours

- Scorecard arrow scores use active target face zone colours.
- Increased score text size inside arrow cells.

## v0.4.3 - Export options and grouping hover focus

- Added export options for labels, radial grouping, and simple grouping.
- Colour-coded end sheet score badges.
- Added hover focus effect for grouping rings.

## v0.4.2 - Radial/simple grouping controls

- Added separate Radial and Simple grouping toggles.
- Radial uses dispersion/std-radius style grouping.
- Simple uses minimum enclosing circle grouping.
- Tooltips appear only when hovering group rings.
- Fixed custom dropdown stacking issue.

## v0.4.1 - Custom dropdowns and radial grouping

- Added reusable custom dropdown component.
- Added radial dispersion grouping method.
- Refined viewport mode/toggle controls.

## v0.4.0 - Milestone 4 exports and grouping

- Added viewport Show dropdown for All ends or individual ends.
- Added grouping overlay.
- Added export image options: current target, complete target, and end sheet.

## v0.3.5 - Reopen last scorecard

- Automatically reopens the last saved/loaded scorecard on launch.

## v0.3.4 - Score-change animation while dragging

- Added animated score-change feedback above dragged arrows in Edit mode.

## v0.3.3 - High-zoom arrow visual accuracy

- Removed high-zoom cap on arrow marker visual size.
- At high zoom, visible arrow radius matches physical scoring radius.

## v0.3.2 - Line-cutter scoring

- Plotted arrows use physical shaft radius and line width for line-cutter scoring.

## v0.3.1 - Edit mode

- Added Edit mode for selecting and dragging existing plotted arrows.

## v0.3.0 - Milestone 3 target faces and swapping

- Added multiple target faces.
- Added World Archery 40cm full face.
- Added Indoor Archery WA Series 1, 2, and 3 custom faces.
- Added target-face swapping while preserving arrow positions.

## v0.2.1 - Custom warnings and grouped saved scorecards

- Added custom warning modals.
- Grouped saved scorecards by date.
- Fixed modal drag-highlight close behaviour.

## v0.2.0 - Milestone 2 scorecard management

- Added saved scorecard browser.
- Added search, open, rename, duplicate, export, and delete actions.
- Added unsaved-change protection.

## v0.1.1 - Initial polish fixes

- Fixed duplicate modal listeners and notification stacking.
- Refined Fit/Centre viewport controls.
- Improved scorecard score size and max-score display.

## v0.1.0 - Initial scoring prototype

- Initial multi-file vanilla HTML/CSS/JS app.
- Canvas target viewport.
- Scorecard table.
- Plot arrows, score, save/load, export/import JSON.
