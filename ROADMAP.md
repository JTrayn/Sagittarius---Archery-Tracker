# Roadmap

This roadmap captures likely future directions. It is not a strict commitment or priority order.

## Near-term polish

- Add user-configurable arrow diameter for scoring and visual rendering.
- Add undo for plot/edit/clear/manual score actions.
- Refine keyboard shortcuts for fast scoring and editing.
- Improve validation around imported scorecard JSON.
- Add clearer onboarding/help tooltips for Plot, Edit, and Locked modes.

## Scorecard workflow

- Add scorecard templates/presets beyond 12 ends x 6 arrows.
- Add duplicate-as-template workflow.
- Add better scorecard filtering and sorting.
- Add archive/favourite tags for saved scorecards.

## Target faces

- Expand the custom target-face builder with richer presets.
- Add duplicate helpers for custom target-face zones.
- Allow import/export of target-face definitions.
- Add target-face preview in selection UI.

## Equipment tracking

- Store bow, arrows, sight mark, stabiliser/plunger notes, draw weight, and other setup information per scorecard.
- Allow saved equipment profiles.
- Analyse performance by equipment profile.

## Analysis

- Expand Trends view with more comparison modes.
- Deeper average score breakdowns by end, distance, and target face.
- End-by-end consistency.
- X count and miss trends.
- Horizontal/vertical dispersion trends.
- Compare scorecards by target face, distance, date, or equipment.

## Export/printing

- Printable report layout.
- PDF export.
- Export all scorecard data as CSV.
- Export target face images at configurable resolution.

## Platform/layout

- Keep desktop landscape as the primary target.
- Later consider tablet layout.
- Mobile is not a priority yet.

## Technical

- Keep the current static app/no-build workflow unless a change clearly improves the project.
- Consider IndexedDB if localStorage becomes too limited.
- Consider automated browser tests once the project has a stable local runner.
