# Sagittarius - Archery Tracker

## v0.7.12 changes

v0.7.12 refines export zoom and grouping marker styling.

- Grouping centre markers are small yellow circles again.
- Zoom to plotted group now uses a large square viewport for non-end-sheet target exports.
- End-coloured target grouping rings are thinner and less visually noisy.

## v0.7.11 changes

v0.7.11 carries the stronger grouping focus style into exported images.

- Exported target images and end sheet mini-targets now use the darker target focus treatment when grouping overlays are enabled.
- Grouping centre markers now use a compact twinkle shape instead of the crosshair/yellow dot marker.
- End-coloured target exports use stronger per-end grouping rings and matching per-end twinkle markers.

## v0.7.10 changes

v0.7.10 experiments with stronger persistent grouping focus in the live viewport.

- Enabling Dispersion or Enclosing now keeps the target/background focus dim active until overlays are disabled.
- Grouping rings, the confidence ellipse, and the MPI marker are brighter and more pronounced.
- Grouping tooltips still appear only when hovering the actual ring.

## v0.7.9 changes

v0.7.9 improves grouping overlay visibility and target image exports.

- Dispersion and Enclosing overlays now render above plotted arrows and arrow labels.
- Target-style exports and end sheet mini-targets use the same overlay-above-arrows layering.
- Export Image now includes a **Zoom to plotted group** option for close-up PNGs of tight groups on large target faces.

## v0.7.8 changes

v0.7.8 polishes the Trends layout balance.

- The Trends chart now gets more vertical room.
- The lower Records dashboard stretches to fill the available space.
- Global records cards have cleaner label, value, and date formatting.

## v0.7.7 changes

v0.7.7 adds a compact arrow volume summary to Trends.

- Global records is cleaner, with the bulky explanation block removed.
- A new Arrows shot counter shows total saved arrows, arrows shot this week, and arrows shot this month.

## v0.7.6 changes

v0.7.6 polishes the Trends Records area and metric explanations.

- Top 5 totals now lives inside the selected Records component.
- Global records replaces Comparable records and explains the three 70m-equivalent stats.
- The Trends chart now describes the selected metric instead of using generic trend text.
- The metric dropdown is ordered by related raw/70m-equivalent physical metrics, with Avg Arrow last.
- Top 3 leaderboard rank badges are gold, silver, and bronze.

## v0.7.5 changes

v0.7.5 refines Trends records and removes noisy percentage metrics.

- Removed Score % and Avg arrow % from Trends/Records.
- Added 70m eq group and 70m eq MPI trend metrics.
- Added an Arrows filter to selected Records.
- Added a Top 5 totals leaderboard scoped to selected target face, distance, and arrow count.
- Moved Target Face Manager to the top header beside New Scorecard.
- Shifted the Trends chart styling toward the app's blue accent.

## v0.7.4 changes

v0.7.4 refines the Trends Records layout and improves trend-view responsiveness with larger saved-scorecard sets.

- Records now has more vertical room and a cleaner two-part layout.
- The target-face/distance selectors are grouped with the same-face/distance PB cards they control.
- Timeline x-axis labels now include the year.
- Trend analytics are cached in memory until saved scorecards or target-face definitions change.

## v0.7.3 changes

v0.7.3 refines Trends records, timeline labels, and generated test data.

- Dummy data now creates 200 scorecards with distance-scaled group sizes, noisier off-days, and more realistic long-term progression.
- Timeline charts now show multiple x-axis date labels instead of only start/end labels.
- Records now use a simpler face + distance selector layout.
- Records include a visual target-face preview plus same-face/distance PBs and cross-context comparable PBs.

## v0.7.2 changes

v0.7.2 expands Trends into a stronger progress and records view.

- Added a **Timeline / Scorecards** spacing toggle for the Trends chart.
- Added **70m eq centre**, a distance-adjusted accuracy metric based on average centre and shooting distance.
- Added standard distance filter options for 10, 18, 20, 30, 40, 50, 60, 70, 80, 90, and 100m.
- Replaced the bottom recent-scorecard list with target-face Records/PB cards grouped by distance.
- Trend tooltips now open to the left of the cursor when there is not enough room on the right.

## v0.7.1 changes

v0.7.1 polishes Trends view controls and adds a temporary dummy-data generator for graph testing.

- Moved the Trends chart title out of the graph plotting area.
- Kept the Target / Trends display toggle anchored while the surrounding controls change.
- Custom dropdown menus near the viewport edge now align inward.
- Added a temporary **Generate Dummy Data** topbar button that clears saved scorecards and creates 50 plotted scorecards over roughly two years.

## v0.7.0 changes

v0.7.0 adds the first saved-scorecard Trends view.

- Added a **Target / Trends** display toggle in the right panel.
- Trends view graphs saved scorecards over time.
- Added trend metrics for Avg Centre, Score %, Group Size, and MPI Offset.
- Added date range, distance, and target-face filters.
- Trend points show scorecard context on hover and can open the saved scorecard.
- Trend records are derived from saved scorecards; no storage migration is required.

## v0.6.7 changes

v0.6.7 refines the optional scorecard table in target image exports.

- Scorecard tables now render to the left of the exported target face.
- Target faces remain fitted in the right-side export area.
- Exported arrow score cells are fixed square cells instead of stretching horizontally.

## v0.6.6 changes

v0.6.6 adds an optional scorecard table to target image exports.

- Added a **Scorecard table** export option for target-style PNG exports.
- All-end target exports include the full scorecard with the target face.
- Single-end target exports include only that end's scorecard row.
- Exported scorecard cells use target-zone colours and include Total, Run, Avg Arrow, and Avg Centre.

## v0.6.5 changes

v0.6.5 adds an end-coloured complete target export.

- Added an **End-coloured target** PNG export.
- Plotted arrows are coloured by end on one complete target face.
- Dispersion and Enclosing export overlays render individual per-end rings using the same colours as the arrows.
- Added a compact end-colour key to the exported image.

## v0.6.4 changes

v0.6.4 adds per-end average stats to the scoresheet.

- Added **Avg Arrow** and **Avg Centre** columns after Total and Run.
- Avg Arrow includes plotted and manual scores recorded in that end.
- Avg Centre uses plotted arrows only, because manual scores do not have physical positions.

## v0.6.3 changes

v0.6.3 improves the custom target-face editor layout.

- The scoring-zones editor now spans the full modal width below the metadata/preview row.
- The scoring-zones table no longer needs horizontal scrolling at normal modal width.

## v0.6.2 changes

v0.6.2 makes target labels configurable per scoring zone.

- Moved label size and colour into each scoring-zone row.
- Kept label position and auto-contrast as shared target-label settings.
- Auto contrast now disables the per-zone label colour pickers while enabled.
- Moved derived target diameter into a read-only metadata field near name/short name/family.

## v0.6.1 changes

v0.6.1 refines the custom target-face editor.

- Removed overall target diameter and default distance from the custom-face editor; custom face diameter is now derived from the outermost zone, and distance remains scorecard metadata.
- Added target label controls for position, size, and colour/auto-contrast.
- Added drag-and-drop reordering for custom target-face zones.
- Custom target-face zone order is preserved for editor/manual-score presentation while scoring and rendering still use physical radii.

## v0.6.0 changes

v0.6.0 adds the first custom target-face workflow.

- Added a **Faces** manager beside the scorecard target selector.
- Built-in target faces remain read-only, but can be duplicated into editable custom faces.
- Custom faces are saved locally and appear in target-face selectors for new and existing scorecards.
- The editor supports target metadata, zone labels/scores, zone diameters, colours, border colours, border widths, target-label settings, validation, and a live preview.
- Scorecard JSON export now bundles referenced custom target-face definitions so custom-face scorecards can be imported on another browser.

## v0.5.9 changes

v0.5.9 refines viewport controls and export visibility.

- Regrouped viewport controls into clearer View, Mode, Canvas, Overlays, and Export clusters.
- Added target visibility to the Export Image options.
- Exported current target, full target, and end sheet PNGs now respect the export target visibility setting.

## v0.5.8 changes

v0.5.8 expands plotted-arrow viewport analysis.

- Added a confidence ellipse to the **Dispersion** grouping overlay.
- Added a gold mean point of impact marker for plotted arrows.
- The viewport HUD now shows mean point of impact offset from centre plus horizontal and vertical spread for the currently visible arrows.
- No saved-scorecard migration is required because these values are derived from plotted arrow positions.

## v0.5.7 changes

v0.5.7 restores the previous header mark for readability at the current app-header size.

- Restored the text-based Sagittarius brand mark.
- Removed the temporary supplied logo image from the app.

## v0.5.6 changes

v0.5.6 makes a small UI polish pass.

- Replaced the header text mark with the supplied Sagittarius logo image.
- Renamed grouping controls to **Dispersion** and **Enclosing**.
- Restyled **Export Image** as a normal viewport button.
- Shot on and Scoring as metadata now show full target-face names with ellipsis overflow.

## v0.5.5 changes

v0.5.5 adds a live viewport control for reducing target-face visual dominance while inspecting plotted arrows and grouping overlays.

- Added a Target slider to the viewport toolbar.
- The slider dims and desaturates the target face while keeping plotted arrows, labels, grouping overlays, scale, and HUD elements fully visible.
- Target fade is viewport-only UI state and does not alter scorecard data. Export Image has its own target visibility option.

## v0.5.4 changes

v0.5.4 prevents target-face comparisons from producing impossible manual scores.

- Locked the target-face selector while a scorecard contains manual score entries.
- Target-face comparison unlocks again after manual scores are cleared.
- No saved-scorecard migration is required because the lock is derived from existing arrow data.

## v0.5.3 changes

v0.5.3 adds two derived scorecard analysis stats to the scorecard footer.

- Added average arrow score, calculated from recorded plotted and manual arrows.
- Added average plotted-arrow distance from target centre, calculated from plotted arrows only.
- No saved-scorecard migration is required because both stats are derived from existing scorecard data.

## v0.5.2 changes

v0.5.2 prepares the project for GitHub/Codex-based development. App functionality is unchanged from v0.5.1.

Added repository context and workflow files:

- `AGENTS.md` - guidance and project context for AI coding agents.
- `CHANGELOG.md` - release history.
- `ROADMAP.md` - likely future feature directions.
- `TESTING.md` - manual smoke-test checklist and validation notes.
- `.gitignore` - ignores packaged ZIPs, OS clutter, dependencies, build output, and logs.

A vanilla HTML/CSS/JS Olympic recurve archery scoring web app.

## How to run

Open `index.html` in a modern desktop browser.

There is no build step and no package install. This version intentionally uses classic script files rather than ES modules so it can usually run directly from the folder.

If your browser behaves strangely with local files, run a simple local server from the project folder instead:

```bash
python -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

## v0.5.1 changes

v0.5.1 refines the scorecard panel layout after the v0.5.0 restructure.

- Restored the prominent score total pill to the top of the scorecard panel.
- Placed the **Save** button immediately to the left of the total pill.
- Moved saved/unsaved status into the same metadata row as **Shot on** and **Scoring as**.
- Removed round type from the visible scorecard UI.
- Let Notes take the full lower footer area beneath the scorecard table.
- Updated the small app version label to show the current app/version rather than the milestone label.

## v0.5.0 changes

v0.5.0 refines the scorecard panel so editable metadata and read-only summary data are placed where they make sense.

- Removed the **Details** button/modal.
- Moved the **Save** button into the scorecard panel; v0.5.1 places it beside the total score pill.
- The top toolbar now only contains primary app-level actions: New Scorecard, Load, Export JSON, and Import JSON.
- The area above the arrow grid now focuses on setup/identity data: name, target face, distance, date, shot-on target, and scoring-as target.
- Moved X count, misses, arrows recorded, and notes beneath the scorecard cells. v0.5.1 restored the total score pill to the top and removed visible round type editing.
- Notes are edited directly in the scorecard panel.
- The selected-arrow status now appears with the manual score controls.

## v0.4.9 changes

v0.4.9 refactors the main layout so scorecard metadata feels like part of the scorecard rather than a separate floating strip.

- Removed the separate top scorecard info strip.
- Moved scorecard name, target face, distance, total, selected-arrow state, status, date, shot-on target, scoring-as target, round type, and notes into the left scorecard panel. v0.5.0 then rearranged these so setup data stays above the arrow grid and stats/notes live below it.
- Restyled read-only scorecard data as labelled information cards instead of button-like pills.
- Preserved the top header for app branding and primary actions only.
- The workspace now starts directly below the header, giving the viewport and scorecard more vertical room.
- Custom dropdowns continue to use the unified v0.4.1 dropdown styling inside the new scorecard panel.

## v0.4.8 changes

v0.4.8 renames the app and standardises project terminology around **scorecards**.

- App title/brand changed to **Sagittarius - Archery Tracker**.
- User-facing text now refers to saved records as scorecards throughout the app.
- JavaScript data-layer naming was updated from the older terminology to scorecard terminology.
- Script files were renamed to `scorecardFactory.js` and `scorecardBrowser.js`.
- localStorage now uses `sagittarius.scorecards.*` keys.
- Existing saved data from earlier versions is automatically migrated into the new storage keys so previous saved scorecards remain available.

## v0.4.7 changes

v0.4.7 adds a safe **Locked** viewport mode to prevent accidental arrow re-plotting while reviewing completed scorecards.

- Interaction mode is now a three-part control: **Plot / Edit / Locked**.
- Completed saved scorecards open in Locked mode by default.
- Locked mode starts with no arrow selected.
- Incomplete scorecards open in Plot mode and select the first empty arrow.
- New scorecards open in Plot mode and select the first empty arrow.
- Locked mode allows safe inspection: click arrows to highlight them, pan empty space, and zoom normally.
- Locked mode prevents plotting, dragging arrows, manual-score edits, and right-click clearing.
- Plot mode now refuses to overwrite an already-recorded arrow; use Edit mode or clear the arrow first.
- When the final arrow is recorded, the scorecard automatically moves to Locked mode with no arrow selected.

## v0.4.6 changes

v0.4.6 changes scorecard colour treatment from coloured score text to coloured arrow cells.

- Scored arrow-cell backgrounds now use the active target face zone colour.
- Score text automatically switches between black and white for best contrast against the zone background.
- Removed the remaining text-outline/border treatment from score text.
- Added subtle solid cell borders derived from the zone colour, so dark cells still read clearly against the dark UI.
- Kept the larger score text sizing from v0.4.4/v0.4.5.

## v0.4.5 changes

v0.4.5 refines the scorecard target-colour styling.

- Kept the larger score text from v0.4.4.
- Removed the halo/glow effect from scorecard score text.
- Scorecard arrow-cell text still uses the active target face zone colour.
- Low-contrast score colours, such as black zones on the dark UI, now receive only a subtle solid text outline for readability.
- Higher-contrast score colours render without an outline.

## v0.4.4 changes

v0.4.4 is a scorecard readability and target-colour styling pass.

- Scorecard arrow-cell text now uses the active target face zone colour instead of hardcoded World Archery colour groups.
- Indoor Archery WA targets therefore show X as orange, 8/5 as black, 7 as yellow, and so on.
- Dark target-zone scores keep their true dark colour and use the refined v0.4.5 solid outline treatment when needed for readability.
- High-contrast target-zone scores render without glow; only low-contrast colours receive a solid outline.
- Score text in arrow cells is larger and more prominent.

## v0.4.3 changes

v0.4.3 is a Milestone 4 export/grouping polish pass.

- Added export-image options for:
  - arrow labels;
  - radial grouping ring;
  - simple grouping ring.
- The export modal defaults those options to the current viewport toggle state, but each export can override them.
- End sheet score badges are now coloured according to the relevant scoring zone.
- Hovering near a grouping ring now softly darkens the target/background and slightly boosts the relevant ring/glass effect.
- The hover-focus effect fades in/out smoothly and only applies while the pointer is near the ring.
- Grouping visuals remain subtler when not hovered.

## v0.4.2 changes

v0.4.2 is a Milestone 4 grouping/dropdown refinement pass.

- Fixed custom dropdown stacking so the target-face menu opens above the scorecard/workspace panels.
- Split grouping overlays into two independent viewport toggles:
  - **Radial**: radial dispersion / σ radius around the centroid.
  - **Simple**: minimum enclosing circle around the visible arrows.
- Simple grouping uses a red visual theme so it is distinct from the cyan radial overlay.
- Group labels/tooltips now show only the relevant radius value.
- Group labels now appear only while the mouse is hovering over that group circle.
- Toned down the grouping visuals by removing the hatch/checker treatment and using subtler fill/stroke styling.
- Exported target images respect the active Radial/Simple grouping toggles.

## v0.4.1 changes

v0.4.1 is a Milestone 4 polish pass.

- Made the grouping overlay much more visible across all target colours by using a glassy dual-composite fill, subtle hatching, a dark outer stroke, a bright cyan stroke, and a fine white dashed stroke.
- Replaced the minimum-enclosing-circle grouping visual with a radial dispersion / standard-deviation style circle centred on the group centroid.
- The grouping label now shows radial σ radius, arrow count, horizontal spread, and vertical spread.
- Added a reusable custom dropdown component and applied it to target-face selectors and the viewport Show selector.
- Grouped the Plot/Edit buttons visually into a connected segmented control.
- Changed the Labels and Groups buttons to simple toggle labels; active colour now indicates on/off state.

## v0.4.0 changes

v0.4.0 adds the main Milestone 4 viewport/export tools.

- Added a viewport **Show** dropdown with **All ends** and one entry for each end.
- The viewport can now render all plotted arrows or only a chosen end.
- Edit-mode arrow hit testing respects the current Show filter, so hidden-end arrows cannot be accidentally selected or moved.
- Added a **Group On/Off** viewport toggle.
- Added a grouping overlay for the currently visible arrows.
- The grouping overlay uses a minimum enclosing circle, plus a centroid marker and group stats label.
- Added **Export Image** options:
  - Current target view PNG, respecting the current Show dropdown and grouping toggle.
  - Complete scorecard target PNG with all plotted arrows.
  - End sheet PNG with a separate mini target for each end.
- Exported images use clean fitted target layouts rather than the current pan/zoom crop.

## v0.3.5 changes

v0.3.5 remembers the last saved/loaded scorecard and reopens it automatically when the app starts.

- The app stores the last opened saved-scorecard ID in localStorage.
- Saving the current scorecard or loading a saved scorecard updates the remembered scorecard.
- If the remembered scorecard no longer exists, the app falls back to the most recently updated saved scorecard.
- If there are no saved scorecards, the app starts with the normal new starter scorecard.
- Unsaved starter/imported scorecards are not silently persisted; they still need to be saved before they can be automatically restored.

## v0.3.4 changes

v0.3.4 adds animated score-change feedback while dragging arrows in Edit mode.

- When a dragged arrow crosses into a different score zone, a small score bubble appears above the arrow.
- The bubble uses the relevant target-zone colour where possible.
- Feedback is only shown when the score actually changes, avoiding noise during normal dragging.
- The popup is canvas-rendered so it stays aligned with the arrow while zooming and panning.

## v0.3.3 changes

v0.3.3 aligns high-zoom arrow marker size with the physical arrow shaft size.

- At close zoom levels, the visible arrow edge now matches the scoring shaft radius.
- The low-zoom minimum marker size remains, keeping arrows visible and easy to select when zoomed out.
- Removed the old high-zoom marker cap that caused score/visual mismatch around line-cutters.

## v0.3.2 changes

v0.3.2 updates plotted-arrow scoring to use line-cutter behaviour.

- Plotted arrows now score from the physical arrow shaft, not only the centre point.
- A plotted arrow receives the higher score if any part of the arrow touches/intersects the scoring border.
- The default scoring shaft radius is `2.4mm`, matching the existing arrow marker physical radius.
- Visible scoring-line half-width is included when calculating whether an arrow touches the line.
- Existing saved plotted arrows automatically use the new scoring behaviour because plotted scores are derived from stored millimetre positions.
- Manual scores are unchanged.

## v0.3.1 changes

v0.3.1 adds safe arrow inspection/editing before Milestone 4.

- Added **Plot** and **Edit** interaction modes to the viewport.
- Plot mode preserves the original fast workflow: click to plot the selected arrow, drag empty space to pan, wheel to zoom.
- Edit mode prevents accidental new plotting.
- In Edit mode, hovering over plotted arrows highlights them.
- Clicking a plotted arrow selects it in the scorecard.
- Dragging a plotted arrow moves it in real time.
- Scores, end totals, running totals, scorecard total, X count, and miss count update as the arrow is dragged.
- Empty-space dragging still pans the target in Edit mode.
- Arrow dragging preserves the pointer offset, so arrows do not snap their centre to the cursor when fine-tuning.

## Milestone 3 changes

Milestone 3 adds target-face flexibility and comparison scoring.

- Added multiple built-in target faces:
  - World Archery 122cm Full Face
  - World Archery 40cm Full Face
  - Indoor Archery WA Series 1
  - Indoor Archery WA Series 2
  - Indoor Archery WA Series 3
- Target-face dropdowns are now grouped by target family.
- The app preserves plotted arrow positions in millimetres when swapping target faces.
- Scores, end totals, running totals, scorecard total, X count, and miss count recalculate against the active target face.
- The UI now distinguishes the original target face the scorecard was created with from the active target face being used for comparison.
- When viewing/scoring against a different target face, the scorecard strip displays a **Scoring as** comparison chip.
- The viewport HUD also shows the original shot-on target when it differs from the active target.
- Target swapping no longer automatically fits the viewport. This preserves physical scale so smaller faces remain visibly smaller unless you intentionally press **Fit**.
- The New Scorecard modal auto-updates the distance to a selected built-in target face default unless the distance field has already been edited manually. Custom target faces leave the scorecard distance unchanged.
- Indoor Archery WA target faces include the custom X/8/7/5 scoring model:
  - X = 8 points
  - 8 = 8 points
  - 7 = 7 points
  - 5 = 5 points
  - Miss = 0 points
- Indoor Archery WA custom face sizes use the supplied zone diameters converted from inches to millimetres.

## Built-in target face dimensions

### World Archery 122cm Full Face

- Diameter: 1220mm
- Default distance: 70m
- Ring scoring: X, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
- X scores 10 and displays separately.

### World Archery 40cm Full Face

- Diameter: 400mm
- Default distance: 18m
- Ring scoring: X, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
- X scores 10 and displays separately.

### Indoor Archery WA Series 1

- Outer diameter: 6 inches / 152.4mm
- Zone diameters:
  - X: 0.5 inches / 12.7mm
  - 8: 1 inch / 25.4mm
  - 7: 2 inches / 50.8mm
  - 5: 6 inches / 152.4mm

### Indoor Archery WA Series 2

- Outer diameter: 6 inches / 152.4mm
- Zone diameters:
  - X: 1 inch / 25.4mm
  - 8: 2 inches / 50.8mm
  - 7: 4 inches / 101.6mm
  - 5: 6 inches / 152.4mm

### Indoor Archery WA Series 3

- Outer diameter: 12 inches / 304.8mm
- Zone diameters:
  - X: 2 inches / 50.8mm
  - 8: 4 inches / 101.6mm
  - 7: 8 inches / 203.2mm
  - 5: 12 inches / 304.8mm

## Milestone 2.1 retained features

- Custom in-app warning dialogs for unsaved-change checks.
- Custom in-app delete confirmation for saved scorecards.
- Custom in-app rename dialog for saved scorecards.
- Saved Scorecards groups saved scorecards by scorecard date.
- Modal backdrop behaviour avoids closing while selecting/highlighting text and dragging outside the modal.
- Browser tab close/reload still uses the browser-native before-unload warning because browsers do not allow custom UI for that case.

## Milestone 2 retained features

- Saved-scorecard browser renamed to **Saved Scorecards**.
- Search saved scorecards by name, target, distance, date, round type, or notes.
- Open saved scorecards from the browser.
- Rename saved scorecards.
- Duplicate saved scorecards.
- Delete saved scorecards with clearer confirmation text.
- Export any saved scorecard directly from the browser.
- Import/export current scorecard JSON.
- LocalStorage scorecard index stores richer summaries.
- Old saved-scorecard summaries are automatically refreshed when the browser opens.
- Scorecard metadata includes scorecard date/time, round type, and notes.
- New-scorecard modal includes scorecard date/time and notes.
- Unsaved-change confirmation before replacing the current scorecard via New, Load, or Import.
- Browser before-unload warning when the current scorecard has unsaved changes.
- Score total pill vertical alignment fix.
- Viewport arrow labels show only the arrow sequence number, not the score.

## Milestone 1 retained features

- Modern dark desktop UI.
- 35/65 scorecard and target viewport layout.
- Configurable new scorecards: scorecard name, ends, arrows per end, distance, target face.
- Default scorecard: 12 ends of 6 arrows.
- Canvas-rendered target face.
- Left-click target plotting.
- Drag to pan.
- Mouse wheel smooth zoom.
- Fit viewport and centre viewport controls.
- Dynamic scale ruler.
- Arrow labels toggle.
- Scorecard selection and auto-advance.
- Manual score entry, including X and M.
- Automatic end totals, running totals, scorecard total, X count, miss count.
- Save/load scorecards using localStorage.
- Right-click a scorecard cell to clear that arrow.

## Architecture notes

The app stores plotted arrows in real-world target coordinates:

```js
{ xMm: 12.4, yMm: -8.1 }
```

Scores are derived from the active target face. This lets the app swap target faces while preserving physical arrow positions. Plotted-arrow scoring uses line-cutter logic, so the physical arrow shaft radius is included when determining whether an arrow touches a higher scoring border.

Manual scores are stored separately from plotted positions:

```js
{
  position: null,
  manualScore: { label: "9", value: 9 }
}
```

## Important files

- `js/data/targetFaces.js` — built-in and locally saved custom target face definitions/APIs.
- `js/data/scorecardFactory.js` — creates new scorecard data.
- `js/data/storage.js` — localStorage persistence and saved-scorecard summaries.
- `js/scoring/scoringEngine.js` — scoring logic.
- `js/viewport/TargetViewport.js` — canvas viewport orchestration.
- `js/viewport/interactionController.js` — plot/edit modes, arrow dragging, panning, zooming.
- `js/viewport/groupingRenderer.js` — radial dispersion and simple minimum-enclosing-circle grouping overlays.
- `js/viewport/exportRenderer.js` — clean PNG exports for target images and end sheets.
- `js/scorecard/ScorecardView.js` — scorecard rendering and selection.
- `js/ui/topControls.js` — app-level controls, editable scorecard panel metadata, new scorecard modal, import/export.
- `js/ui/targetFaceManager.js` — custom target-face library/editor UI.
- `js/ui/scorecardBrowser.js` — saved-scorecard browser and saved-scorecard actions.

## Version

0.7.12

v0.7.12 - Square zoom viewport for non-end-sheet target exports, small yellow grouping centre markers, and quieter end-coloured grouping rings.

v0.7.11 - Export grouping focus styling and twinkle-style grouping centre markers.

v0.7.10 - Persistent grouping focus when Dispersion or Enclosing is enabled, with stronger dimming and brighter grouping overlays.

v0.7.9 - Grouping overlays above arrows and labels, plus Zoom to plotted group for target image exports.

v0.7.8 - Trends vertical balance polish, larger chart area, filled Records dashboard, and cleaner Global records card text.

v0.7.7 - Trends Arrows shot counter, with total, current-week, and current-month saved arrow counts.

v0.7.6 - Trends Records layout polish, Global records explanations, metric-specific chart subtitles, reordered metric dropdown, and medal-coloured leaderboard ranks.

v0.7.5 - Trends percentage metrics removed, Records arrow-count filter, scoped Top 5 totals leaderboard, topbar Target Face Manager, and bluer chart styling.

v0.7.4 - Larger Trends Records panel, grouped record selectors, year-aware timeline labels, and cached trend analytics.

v0.7.3 - Trends Records redesign, richer timeline labels, and more realistic 200-scorecard dummy data.

v0.7.2 - Trends chart spacing toggle, distance-adjusted accuracy, expanded distance filters, and Records/PB panel.

v0.7.1 - Trends control polish and temporary dummy scorecard data generator.

v0.7.0 - Saved-scorecard Trends view with filtered progress graphs.

v0.6.7 - Export scorecard tables render left of the target face with square arrow score cells.

v0.6.6 - Optional scorecard table on target image exports, scoped to the visible end for single-end exports.

v0.6.5 - End-coloured complete target export with matching per-end grouping rings.

v0.6.4 - Scoresheet end rows show Avg Arrow and Avg Centre columns.

v0.6.3 - Custom target-face scoring-zones editor uses the full modal width.

v0.6.2 - Per-zone target label size/colour controls and shared auto-contrast handling.

v0.6.1 - Custom target-face editor refinement: derived diameter, scorecard-owned distance, label controls, and drag-and-drop zone ordering.

v0.6.0 - Custom target-face manager/editor with local custom-face storage and scorecard JSON bundling.

v0.5.9 - Viewport control grouping and export target visibility slider.

v0.5.8 - Viewport analysis: confidence ellipse, mean point of impact marker, and visible-arrow offset/spread HUD stats.

v0.5.7 - Restored the previous text-based header mark.

v0.5.6 - UI polish: supplied header logo, clearer grouping labels, normal Export Image button, and full target-face names in metadata.

v0.5.5 - Target fade viewport control: live target-face dim/desaturate slider for easier arrow and grouping inspection.

v0.5.4 - Manual-score target lock: target-face comparison is disabled while manual score entries exist.

v0.5.3 - Scorecard footer average stats: average arrow score and average plotted-arrow distance from target centre.

v0.5.2 - Codex/repository preparation: added repository guidance and workflow documentation without app behaviour changes.

v0.5.1 - Scorecard panel refinement: restored the top total pill, moved Save beside it, moved status into the metadata row, and gave Notes the full lower footer.

v0.5.0 - Scorecard panel layout refinement: removed Details, moved Save into the scorecard panel, setup metadata above the arrow grid, and stats/notes/round type below it.

0.4.2

v0.4.2 — Milestone 4 polish: dropdown stacking fix, separate Radial/Simple grouping toggles, hover-only radius tooltips, and subtler grouping visuals.

v0.4.1 — Milestone 4 polish: radial dispersion grouping overlay, more visible group styling, custom dropdowns, and cleaner viewport toggle grouping.

0.4.0

v0.4.0 — Milestone 4: Show dropdown for all/individual ends, grouping overlay, current/full target PNG export, and end sheet PNG export.

v0.3.5 — Milestone 3 persistence polish: automatically reopens the last saved/loaded scorecard on app startup.

v0.3.4 — Milestone 3 interaction polish: added animated score-change feedback while dragging arrows in Edit mode, with target-zone coloured score bubbles.

v0.3.3 — Milestone 3 scoring/visual polish: high-zoom arrow marker size now matches physical shaft radius, keeping line-cutter scoring visually aligned during close inspection.

v0.3.2 — Milestone 3 scoring polish: plotted arrows now use line-cutter scoring based on arrow shaft radius, so touching a higher scoring border receives the higher score.

v0.3.1 — Milestone 3 polish: added Plot/Edit viewport modes, safe arrow selection, hover highlighting, and real-time plotted-arrow dragging/editing.

v0.3.0 — Milestone 3: multiple built-in target faces, Indoor Archery WA custom faces, target-face swapping, active-vs-original target indicators, and preserved viewport scale during comparisons.

v0.2.1 — Milestone 2 polish/fix pass: custom warning/confirmation/prompt dialogs, scorecard grouping by date, and modal text-selection/backdrop fix.

v0.2.0 — Milestone 2: scorecard browser/search, rename, duplicate, export/delete saved scorecards, metadata details, notes/date fields, unsaved-change protection, score pill alignment, and viewport label simplification.

v0.1.1 — Milestone 1 polish/fix pass: modal listener cleanup, deduped toasts, scorecard readability, max-score pill, centred-view control, and import button sizing.

v0.1.0 — Initial Milestone 1 build.

### v0.3.4

- Added animated score-change feedback while dragging arrows in Edit mode.
- Feedback appears only when the derived score actually changes.
- The score bubble appears above the arrow, uses the relevant target-zone colour where possible, and fades upward cleanly.
- The feedback uses rounded millimetre positions, matching the actual saved/moved arrow position precision.

### v0.3.3

- Removed the high-zoom cap on visual arrow marker size.
- Arrow markers now become physically accurate once zoomed in enough, including at 800%.
- Retained the minimum visible marker size at low zoom so arrows remain easy to see and select.
- This makes line-cutter scoring align with the visible arrow edge during close inspection.
