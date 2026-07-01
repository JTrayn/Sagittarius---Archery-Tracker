# Testing Guide

The app is currently a static vanilla HTML/CSS/JS project. There is no formal automated test runner yet.

## Basic local run

Open `index.html` in a modern desktop browser.

Recommended browsers:

- Chrome
- Edge
- Firefox

## Smoke test checklist

After meaningful changes, test the following manually.

### Launch and storage

- Open `index.html`.
- Confirm the app title/brand reads Sagittarius - Archery Tracker.
- Confirm the header displays the Sagittarius brand mark clearly.
- If saved scorecards exist, confirm the last saved/loaded scorecard reopens.
- If no saved scorecards exist, confirm a new starter scorecard opens.

### New scorecard

- Create a new scorecard.
- Confirm default is 12 ends x 6 arrows.
- Confirm World Archery 122cm is the default target.
- Confirm new scorecards start in Plot mode with the first empty arrow selected.

### Plotting

- Plot several arrows.
- Confirm auto-advance selects the next empty arrow.
- Confirm scorecard cells update.
- Confirm end totals and total score update.
- Confirm average arrow score updates as recorded arrows are added.
- Confirm average centre distance updates for plotted arrows.
- Confirm each end row updates Avg Arrow and Avg Centre after Total and Run.
- Confirm cell background colours match the active target face zone colours.

### Line cutters

- Zoom in close.
- Drag or plot arrows near a scoring line.
- Confirm score changes when the visible physical arrow edge touches/cuts the line.

### Edit mode

- Switch to Edit mode.
- Hover existing arrows and confirm highlighting works.
- Drag arrows and confirm scorecard updates in real time.
- Confirm score-change animation appears when score changes.

### Locked mode

- Complete a scorecard and save it.
- Reload/open it.
- Confirm it opens in Locked mode.
- Confirm no arrow is selected by default.
- Confirm clicks do not plot or move arrows.
- Confirm panning and zooming still work.

### Incomplete saved scorecard

- Save an incomplete scorecard.
- Reload/open it.
- Confirm it opens in Plot mode.
- Confirm the first empty arrow is selected.

### Target faces

- Switch between target faces.
- Confirm arrow positions remain physically consistent.
- Confirm scores recalculate against the active target face.
- Confirm average arrow score recalculates against the active target face.
- Confirm average centre distance remains physically consistent.
- Confirm per-end Avg Arrow recalculates against the active target face while Avg Centre remains physically consistent.
- Test World Archery and Indoor Archery WA score colours.
- Confirm Shot on and Scoring as show full target-face names, truncating with ellipsis when needed.
- Record a manual score and confirm the target-face selector becomes disabled.
- Clear the manual score and confirm the target-face selector becomes available again.

### Custom target faces

- Open **Target Face Manager** from the top header.
- Duplicate the current built-in target face and save it as a custom face.
- Confirm the custom face appears in the target-face selector and New Scorecard modal.
- Edit the custom face name, zone diameter, score, fill colours, line colours, label sizes, and label colours.
- Confirm the derived target diameter changes when the outermost zone diameter changes.
- Change shared target label position and confirm the preview updates.
- Toggle auto contrast and confirm per-zone label colour inputs are disabled/enabled appropriately.
- Drag custom target-face zones into a new order and confirm the order is preserved after saving/reopening.
- Confirm selecting a custom face in the New Scorecard modal does not overwrite the scorecard distance.
- Confirm the live preview updates while editing.
- Confirm invalid custom faces show validation messages and do not save.
- Select the custom face, plot arrows, and confirm scoring/manual score buttons use the custom zones.
- Export a scorecard JSON that uses a custom face and confirm the JSON includes `customTargetFaces`.
- Import that JSON and confirm the bundled custom face is available.
- Delete an unused custom face and confirm it disappears from selectors.

### Viewport filters

- Use the Target / Trends display toggle and confirm the right panel swaps between target canvas and Trends view.
- Confirm the Target / Trends display toggle stays visually anchored when switching views.
- Confirm the viewport toolbar groups controls into View, Mode, Canvas, Overlays, and Export areas without overlap.
- Use the Show dropdown to switch between All ends and individual ends.
- Open viewport dropdowns near the right edge and confirm their menus align inward without shifting the graph.
- Confirm hidden arrows cannot be selected/moved in Edit mode.
- Move the Target slider and confirm the target face dims/desaturates while arrows and labels remain fully visible.

### Trends

- Use Generate Dummy Data if more saved scorecards are needed for graph testing, and confirm it creates 200 saved plotted scorecards.
- Save several plotted scorecards with different dates/distances if needed.
- Switch to Trends view and confirm the summary stats, chart, filters, and Records panel render cleanly.
- Confirm the chart title/subtitle do not overlap the graph plot area.
- Confirm the Trends chart uses the available vertical space without leaving an oversized empty Records area.
- Confirm the Trends metric dropdown is ordered as Avg Centre, 70m eq centre, Group Size, 70m eq group, MPI Offset, 70m eq MPI, then Avg Arrow.
- Change Metric between Avg Centre, 70m eq centre, Group Size, 70m eq group, MPI Offset, 70m eq MPI, and Avg Arrow.
- Confirm the chart subtitle explains the selected metric.
- Confirm Score % and Avg arrow % are not shown in the Trends metric or Records controls.
- Toggle Timeline / Scorecards and confirm chart points switch between date-scaled and evenly spaced x positions.
- Confirm Timeline mode shows multiple x-axis date labels.
- Confirm Timeline x-axis date labels include the year.
- Confirm the Distance filter includes 10, 18, 20, 30, 40, 50, 60, 70, 80, 90, and 100m.
- Change Range, Distance, and Face filters and confirm the chart updates.
- Change the Records Face, Distance, and Arrows selectors and confirm PB cards update for that combination.
- Confirm the Top 5 totals leaderboard sits inside the selected Records component, is scoped to the selected Face/Distance/Arrows combination, and ranks equal totals by lower Avg centre.
- Confirm the top three leaderboard rank badges are gold, silver, and bronze.
- Confirm the right-side Global records component shows the three 70m-equivalent record cards without the old explanatory text block.
- Confirm Global records card labels, values, and dates are aligned cleanly and remain readable.
- Confirm the Arrows shot counter appears below Global records and shows total arrows, this week, and this month.
- Confirm the Arrows shot component fills the space beneath Global records on desktop.
- Confirm the Records panel has enough vertical room, groups the Face/Distance selectors with the associated PB cards, and shows Global records on the right.
- With 200 dummy scorecards, switch filters/record selectors repeatedly and confirm the Trends view remains responsive.
- Hover chart points and confirm the tooltip shows scorecard context.
- Hover chart points near the right edge and confirm the tooltip opens left of the cursor.
- Click a chart point or Records PB card and confirm the saved scorecard opens.

### Grouping

- Toggle Dispersion grouping.
- Confirm the Dispersion overlay shows the radial circle, confidence ellipse, and mean point of impact marker.
- Toggle Enclosing grouping.
- Confirm the mean point of impact marker remains based on the visible plotted arrows.
- Confirm the mean point of impact marker renders as a compact yellow circle.
- Confirm Dispersion and Enclosing overlays render above plotted arrows and arrow labels.
- Confirm enabling Dispersion or Enclosing persistently darkens the target/background and brightens grouping overlays until both overlays are disabled.
- Confirm the viewport HUD shows MPI offset and horizontal x vertical spread for All ends and individual end filters.
- Hover group rings and confirm tooltips and subtle extra ring emphasis appear.
- Confirm tooltips disappear when not hovering rings.
- Move the Target slider and confirm grouping rings remain prominent over the faded target.

### Export images

- Export current target view PNG.
- Export complete scorecard target PNG.
- Export end-coloured target PNG and confirm plotted arrows are coloured by end on one complete target face.
- With Dispersion and Enclosing enabled, confirm the end-coloured export renders per-end grouping rings in the matching end colours.
- Enable Scorecard table and confirm all-end target exports include the full scorecard to the left of the target.
- Confirm exported arrow score cells are square and not stretched horizontally.
- Filter the viewport to one end, export Current target view with Scorecard table enabled, and confirm only that end row is included.
- Export end sheet PNG.
- Test labels/Dispersion/Enclosing export options.
- Move the export Target slider and confirm exported target faces fade while arrows, labels, grouping overlays, and score badges remain readable.
- Enable Zoom to plotted group and export a target image from a large face with a tight centre group; confirm the PNG camera fits the plotted group instead of the full target.
- Confirm Zoom to plotted group uses a square clipped viewport for current target, complete target, and end-coloured target exports.
- With Zoom to plotted group enabled, confirm grouping overlays still render above arrows in current target, complete target, end-coloured target, and end sheet exports.
- With grouping enabled, confirm exported target images and end sheet mini-targets use the stronger grouping focus styling without dimming headers or scorecard panels.
- Confirm exported grouping centre markers render as compact yellow circles.
- Confirm end-coloured target grouping rings are thin enough to remain readable when many ends are shown at once.
- Confirm end sheet score badges are colour-coded.

### Scorecard browser

- Save multiple scorecards on the same date.
- Open Load Scorecard.
- Confirm scorecards are grouped by date.
- Test search, open, rename, duplicate, export, and delete.

### Modals/dropdowns

- Confirm custom dropdown menus render above scorecard/viewport panels.
- Confirm dragging text selection inside modals does not close the modal accidentally.
- Confirm custom warning modals appear for unsaved-change situations.

## Syntax check

A lightweight syntax check can be run with Node if available:

```bash
find js -name "*.js" -print0 | xargs -0 -n1 node --check
```

This only checks syntax, not browser behaviour.

## ZIP integrity check

When packaging a release ZIP:

```bash
unzip -t archery-score-app-vX.Y.Z.zip
```

## Future testing ideas

- Add a minimal Playwright smoke test.
- Add unit tests for scoring and grouping math.
- Add fixture-based tests for localStorage migration.
