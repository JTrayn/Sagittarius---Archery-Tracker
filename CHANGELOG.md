# Changelog

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
