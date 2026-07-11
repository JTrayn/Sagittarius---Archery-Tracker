# Sagittarius Archery Tracker

**Sagittarius** is a prototype archery scorecard and shot-analysis app for plotting arrows, reviewing practice sessions, tracking records, and exporting clean target images.

It is designed for target archery practice: create a scorecard, plot arrows directly on a target face, review each end, and use analysis tools to understand how the session performed.

![Sagittarius overview](docs/assets/readme/overview.JPG)

## Highlights

- Plot arrows directly onto archery target faces and score them automatically from their positions.
- Record complete practice sessions with plotted arrows, manual scores, notes, equipment details, and independent target-face/distance metadata.
- Review total score, average arrow, X count, misses, average centre, MPI, Ring Break Luck, and Luck Adjusted Score.
- Use visual overlays for arrow labels, dispersion, enclosing group, Shot Pattern DNA, and Ring Break Luck.
- Run Performance Intelligence with a 5,000-run Monte Carlo simulation of the plotted shot pattern.
- Use Progression Intelligence to follow the running projected score through the round and compare early, middle, and late performance both across the session and within each end.
- Replay sessions chronologically with Timeline mode.
- Extrapolate a plotted group to different distances.
- Temporarily compare the same arrows against another target face with Target Swap without changing the saved scorecard category.
- Browse, duplicate, import, export, and manage saved scorecards through the calendar-assisted Scorecard Manager.
- Track trends, personal bests, records, and arrows shot across saved scorecards.
- Export clean target images and end sheets for sharing or coaching.
- Create and edit custom target faces.

## Quick start

Sagittarius is currently **prototype software**. It can be run in two simple ways:

1. Download or clone the project and open `index.html` in a modern browser.
2. Host the project as a static site, such as through GitHub Pages.

No account, server, or build step is required. Scorecards are saved locally in the browser and can be exported/imported as JSON so practice data remains portable.

## Scorecards

Target faces define target geometry and scoring zones. They do **not** lock the scorecard to a particular distance: any target face can be used at any distance.

![Scorecard](docs/assets/readme/scorecard.JPG)

The scorecard supports both plotted and manual scoring. Plotted arrows are scored from their target positions, while manual scores can record results without placing an arrow on the target.

The scorecard includes:

- **Total score** — the current score for the round.
- **Average arrow** — average points per recorded arrow.
- **X count** — X-ring hits where supported by the target face.
- **Misses** — recorded misses.
- **Average centre** — average plotted-arrow distance from the bullseye.
- **MPI** — mean point of impact, showing the location of the group centre.
- **Ring Break Luck** — whether close scoring-line decisions were mostly favourable or unfavourable.
- **Luck Adjusted Score** — an estimate of the score with neutral ring-break luck.

![Scorecard analysis](docs/assets/readme/scorecard-analysis.JPG)

When a completed scorecard is the best matching result for its target face, distance, arrow count, and possible score, Sagittarius shows a **PB** indicator.

![PB indicator](docs/assets/readme/PB-indicator.JPG)

## Scorecard Manager

The **Scorecard Manager** combines a saved-session list with a calendar. Days containing scorecards are highlighted, and sessions are grouped by date with target, distance, arrow count, time, and score details.

Selecting a date jumps to that date group rather than immediately loading a scorecard, which helps when several sessions were recorded on the same day.

![Scorecard manager](docs/assets/readme/scorecard-manager.JPG)

## Plotting arrows

Use the target viewport to place arrows directly on the target face. Sagittarius stores positions in real target-face millimetres, allowing the same arrows to be scored, analysed, replayed, exported, extrapolated, or viewed on another target face reliably.

The viewport includes plotting, editing, locking, target navigation, end filtering, overlays, Timeline, extrapolation, Target Swap, and image export tools.

## Viewport overlays

### Arrow labels

The labels overlay shows arrow numbering on the target so plotted impacts can be matched to scorecard rows and shot order.

![Labels overlay](docs/assets/readme/labels-overlay.JPG)

### Dispersion and enclosing group

**Dispersion** visualises how widely the arrows are spread around the group.

**Enclosing group** shows a simple circle containing the plotted group, providing an easy group-size reference.

![Dispersion and enclosing overlays](docs/assets/readme/dispersion-and-enclosing-overlays.JPG)

### Shot Pattern DNA

**Shot Pattern DNA** analyses the geometry of the plotted session.

![DNA overlay](docs/assets/readme/DNA-overlay.JPG)

It includes information such as:

- group centre and bullseye offset,
- horizontal and vertical spread,
- group shape and angle,
- confidence ellipses,
- and major outliers.

The same pattern model feeds Performance Intelligence.

### Ring Break Luck overlay

The Ring Break Luck overlay highlights arrows close to scoring boundaries. Green arrows are favourable line-cutters, red arrows are unfavourable near-misses, and neutral arrows are dimmed.

![Ring Break Luck overlay](docs/assets/readme/ring-breaker-overlay.JPG)

## Ring Break Luck and Luck Adjusted Score

**Ring Break Luck** estimates whether the score benefited from close line-cutters or was hurt by near-misses.

The app compares the outer edge of each plotted arrow with nearby scoring boundaries. The analysis uses a close boundary window extending about 3 mm either side of the higher-scoring line. Arrows well away from a scoring line are neutral: a clean 10 is simply a good shot, while a clear 8 is not treated as unlucky.

The rating uses a 0–100 scale:

- **50** is neutral ring-break luck.
- **Above 50** means close scoring decisions were mostly favourable.
- **Below 50** means close scoring decisions were mostly unfavourable.
- Very close line-cutters and near-misses carry more weight.

**Luck Adjusted Score** converts the same boundary evidence into an estimated score adjustment. It asks what the score may have looked like with neutral ring-break luck.

These are context tools and do not replace the official score.

## Performance Intelligence

Performance Intelligence analyses a completed plotted round. It is available only when every arrow in the scorecard has been plotted on the target; incomplete scorecards and scorecards containing manual score entries are excluded so every section is based on the same complete set of score and position data.

![Performance Intelligence overview](docs/assets/readme/intelligence-modal-1.JPG)

### Performance overview and Monte Carlo forecast

Sagittarius builds Shot Pattern DNA from the real plotted group, then runs **5,000 simulated scorecards**. Each simulation generates realistic x/y impacts from the model and scores them through the normal target scoring engine.

The overview shows:

- **Actual score** — the completed recorded result.
- **Expected score** — the average score across the simulated repeats.
- **Likely range** — the 10th-to-90th-percentile range for similar repeats.
- **Luck Rating** — the actual score's percentile within the simulated score distribution.

The Performance Intelligence **Luck Rating** is different from Ring Break Luck. Ring Break Luck only evaluates arrows close to scoring boundaries. Intelligence Luck Rating compares the complete score with the full simulated score distribution for the shot pattern.

### Progression Intelligence

Progression Intelligence uses observed scores rather than Monte Carlo values.

The **Running projected score** graph shows the full-round score implied by the recorded scoring pace after every arrow:

**running average arrow × total arrows in the round**

Because Performance Intelligence only opens for completed scorecards, the final point always equals the actual final score. The line is divided into blue Early, yellow Middle, and red Late sections, with completed ends labelled along the bottom.

The modal separates **Session performance** from **Within-end performance**. Session performance presents the running projected-score graph, a bar for every end, the weakest-end consistency comparison, and Early/Middle/Late session cards as raw evidence. One **Session analysis** box then appears at the end of the section and gives the app's overall interpretation. Trend labels require a meaningful difference and repeated evidence across ends; ordinary random differences are reported as **No reliable session trend** rather than being over-interpreted.

Within-end performance presents average-score bars for each repeated arrow position, its consistency comparison, and Early/Middle/Late within-end cards. One **Within-end analysis** box appears after those results. The calculation accounts for stronger and weaker ends before identifying a reliable decline, improvement, or position-specific pattern. The modal still shows all observed averages when no reliable pattern is detected.

When either final analysis detects a reliable trend, that conclusion receives a prismatic rainbow/gleam treatment so the finding is easy to spot. A scope with no reliable trend remains visually neutral; Session and Within-end results are highlighted independently.

The phase cards include average arrow, score, average centre, observed horizontal × vertical spread, MPI, major outliers, and a flippable target view with the dimmed **Dispersion** overlay. Target views automatically fit every plotted arrow, including misses outside the target face.

### Shot Pattern DNA

Shot Pattern DNA is presented as a restrained grid of blue-accented metric cards and explains the geometry used by the forecast:

- core MPI and core bullseye offset,
- fitted core width and height,
- group shape and angle,
- the 95% prediction ellipse,
- and major geometric outliers.

The modal warns when the group centre changes materially between session phases, because one overall Gaussian model may be less representative when the round contains distinctly different shot patterns.

### Improvement forecast

The session and within-end bar sections each include a direct consistency comparison. **Weakest end normalised** recalculates the lowest-scoring end at the average of the remaining ends. **Weakest arrow position normalised** does the same for the lowest repeated arrow position. These are arithmetic comparisons based on the recorded score, not Monte Carlo predictions.

The separate Improvement forecast reruns the same simulation after controlled geometric pattern changes such as:

- re-centring the group,
- removing major outliers,
- reducing horizontal spread,
- reducing vertical spread,
- and combining realistic improvements.

The Monte Carlo table reports each expected score and its signed **Change** from the Actual Pattern baseline to two decimal places. Every scenario reuses the same underlying random trials, preventing small differences from being caused by unrelated simulation noise.

These scenarios are comparisons, not guaranteed predictions. Major outliers are identified geometrically, so **Core group only** can occasionally be neutral or negative when an outlier happened to score better than the fitted core group.

Score probabilities remain expanded by default and show how often simulations reached selected score targets.

## Timeline replay

Timeline mode replays the session chronologically so the development of the group can be reviewed over time.

![Timeline standard view](docs/assets/readme/timeline-standard.JPG)

It can be used to inspect shot order, compare ends, identify group movement, and see when a strong or weak period affected the round.

![Timeline ends](docs/assets/readme/timeline-ends.JPG)

## Target Swap

Changing the target face through **Edit scorecard** is permanent: the scorecard is recategorised under the new target for scoring, PBs, records, and trends.

**Target Swap** is a temporary analysis tool. It displays and rescores the same plotted arrows on another target face without changing the saved scorecard category. Selecting **Original target** returns to the scorecard’s real target face.

## Extrapolated distance

Extrapolation projects the plotted group to another distance and recalculates the displayed score.

![Extrapolation](docs/assets/readme/extrapolation.JPG)

It can be used to explore how a group shot at one distance may look when geometrically scaled to another. Extrapolation does not modify the stored arrow positions.

## Trends, records, and arrow volume

The Trends view compares saved sessions over time.

![Trends view](docs/assets/readme/trends-view.JPG)

Available metrics include:

- total score,
- average arrow,
- average centre,
- group size,
- MPI offset,
- and 70 m equivalent grouping metrics.

**70 m equivalent** metrics scale distance-based measurements to a common 70 m reference, making grouping results from different shooting distances easier to compare.

Records can be grouped by target face, distance, arrow count, possible score, and relevant performance metric. Sagittarius also tracks arrows shot from saved scorecards.

## Saving, importing, and exporting scorecard data

Scorecards are saved in the browser and can be exported as JSON.

JSON import/export supports:

- backups,
- moving scorecards between browsers or computers,
- sharing sessions for review,
- and preserving custom target-face data used by a scorecard.

## Image export

Sagittarius can export target images for sharing, record keeping, and coaching review.

![Image export modal](docs/assets/readme/image-export-modal.JPG)

Standard view exports show the target and plotted arrows.

![Standard view image export](docs/assets/readme/standard-view-image-export.png)

End-sheet exports arrange ends in a printable or shareable layout.

![End sheet image export](docs/assets/readme/end-sheet-image-export.png)

## Custom target faces

Sagittarius can create and edit **custom target faces**.

![Target face creation](docs/assets/readme/scoreface-creation.JPG)

Custom faces can model club formats, practice faces, experimental targets, or target types not included with the built-in set.

## Current status

This README reflects **Sagittarius v0.9.36**, including plotted and manual scorecards, custom target faces, saved-scorecard management, PBs and records, Timeline, overlays, Ring Break Luck, Luck Adjusted Score, Monte Carlo Performance Intelligence, Progression Intelligence, what-if projections, Target Swap, distance extrapolation, trends, JSON portability, and image export.

Sagittarius remains a prototype browser-based app. Future versions may expand training-volume analysis, long-term performance modelling, and desktop packaging.
