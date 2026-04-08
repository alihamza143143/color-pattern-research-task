# Color Pattern Matching Research Task — Design Spec

## Overview

A cognitive research task where participants fill in abstract color patterns (similar to "color by numbers" but with procedurally generated symbols). The color key and the pattern workspace are on opposite sides of the screen, separated by gray masks — only one side is visible at a time, forcing participants to memorize the key.

## Tech Stack

- **HTML5 + SVG** for pattern regions (Voronoi/mosaic clickable `<path>` elements)
- **Canvas** for procedural abstract glyph generation
- **Vanilla JS + CSS** for UI, layout, masks, transitions
- **No frameworks** — static files, hostable anywhere, Qualtrics iframe-compatible

## Application Flow

1. **Setup Screen** — Researcher manually enters:
   - Participant ID number
   - Delay length in milliseconds (including 0 for no delay)
2. **Instructions Page** — Explains the task with visual examples
3. **2 Practice Trials** — 3-4 color regions (simplified)
4. **10 Test Trials** — 10-12 color regions (full complexity)
5. **Completion Screen** — CSV auto-downloads + data POSTed to configurable server endpoint

## Screen Layout

Full browser window, split into two sides:

### Left Side — Key Window
- Displays symbol-to-color mapping (e.g., glyph A = blue, glyph B = orange)
- Covered by a gray mask by default
- "Open" button to reveal (with configurable delay + countdown indicator)
- When open: right side is completely hidden by gray mask

### Right Side — Pattern Window + Resource Window
- **Pattern Window (top-right):** Abstract Voronoi/mosaic pattern with regions, each labeled with a unique procedural glyph. Regions start uncolored (white/empty). Symbols remain visible after coloring.
- **Resource Window (bottom-right):** Row of small colored squares — the available color palette for that trial
- Covered by a gray mask when the key window is open
- "Open" button to reveal (switches back from key view)

### Masking Behavior
- Strict either/or: only the key window OR the pattern+resource windows are visible at any time
- Gray masks completely cover the hidden side
- Participants can switch between sides as often as they want

### Key Window Delay
- When participant clicks "Open" on key window, a countdown/loading indicator appears
- After the configured delay (in ms), the gray mask lifts and the key is revealed
- Delay of 0ms = instant reveal (still triggers the open)
- No delay on opening the pattern/resource side

## Pattern Generation

### Voronoi/Mosaic Regions
- Procedurally generated abstract, non-representational patterns
- Each trial generates a unique pattern
- Practice trials: 3-4 regions
- Test trials: 10-12 regions (matching available colors, no color repeated)
- Each region is an SVG `<path>` — clickable to apply selected color
- Regions are visually distinct with clear borders

### Procedural Glyph Generation
- Abstract, non-identifiable symbols generated via Canvas
- Cannot resemble letters, numbers, or easily named shapes (no stars, triangles, squares)
- Built from random combinations of curves, lines, and arcs
- Unique set of glyphs generated per trial — no glyph reused across trials
- Rendered at a size legible within pattern regions and in the key window

## Colors

12 available colors (subset used per trial):
- Blue, Orange, Red, Cyan, Green, Dark Green, Yellow, Bisque, Sienna, Purple, Pink, Gray

Rules:
- No color repeated within a single trial's pattern
- Practice trials use 3-4 colors (random subset)
- Test trials use 10-12 colors (random subset of the 12 available; region count matches color count)

## Randomization

- **Within trials:** Symbol placement in pattern regions is random; color-to-symbol assignment is random
- **Across trials:** Pattern order (which generated pattern appears when) is randomized
- **Glyphs:** Completely new set of procedural glyphs per trial

## Interaction

1. Participant views pattern+resource side (default open state)
2. Clicks a color square in the Resource Window to select it (visual highlight on selected color)
3. Clicks a region in the Pattern Window to fill it with the selected color
4. Symbol remains visible in the region after coloring
5. To check the key: clicks "Open" on the Key Window → countdown plays → key reveals, pattern hides
6. Clicks "Open" on the pattern side to return to coloring
7. Wrong placements corrected by selecting correct color and clicking the region again
8. Clicks "End Trial" button when done
9. If pattern is incorrect: message says "Please keep editing the pattern" (no specifics about errors)
10. If pattern is correct: advances to next trial

## Data Recording

### Per Trial:
- Trial number (1-12, including practice)
- Trial type (practice / test)
- Number of key window openings
- Duration of the very first key window opening (ms)
- Total completion time for the trial (ms)
- Number of attempts (times "End Trial" was clicked, including failed attempts)

### Session Metadata:
- Participant ID
- Delay length setting (ms)
- Timestamp of session start

### Export:
- **CSV download** — auto-downloads on completion screen
- **Server POST** — configurable endpoint URL, sends JSON payload with all trial data
- Both mechanisms fire on task completion

## Qualtrics Integration

- Accepts URL parameters: `?pid=PARTICIPANT_ID&delay=DELAY_MS`
  - When URL params are present, setup screen is skipped
- On task completion: sends `postMessage` to parent window with completion status + data summary
- Works standalone (with manual setup screen) or embedded in iframe
- No external dependencies — fully self-contained static files

## UI/UX Details

- Full browser window layout
- Clean, minimal research-task aesthetic
- Gray masks are solid gray overlays (not transparent)
- "Open" buttons are clearly labeled and positioned near their respective windows
- Selected color in resource window has a visible highlight/border
- Colored regions show the fill color with the symbol overlaid in a contrasting color
- End Trial button is prominent but positioned to avoid accidental clicks
- Instructions page includes a visual walkthrough of the interface
