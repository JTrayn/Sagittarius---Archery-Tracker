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
- Test World Archery and Indoor Archery WA score colours.

### Viewport filters

- Use the Show dropdown to switch between All ends and individual ends.
- Confirm hidden arrows cannot be selected/moved in Edit mode.

### Grouping

- Toggle Radial grouping.
- Toggle Simple grouping.
- Hover group rings and confirm tooltips/focus effects appear.
- Confirm tooltips disappear when not hovering rings.

### Export images

- Export current target view PNG.
- Export complete scorecard target PNG.
- Export end sheet PNG.
- Test labels/radial/simple export options.
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
