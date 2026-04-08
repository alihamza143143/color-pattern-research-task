# Color Pattern Research Task — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cognitive research task where participants fill in abstract color patterns using a hidden color key, with full data recording and Qualtrics integration.

**Architecture:** Static HTML5 app with SVG-based clickable Voronoi pattern regions, Canvas-based procedural glyph generation, CSS masking for the key/pattern window toggle, and vanilla JS for all logic. No frameworks or dependencies — single folder of static files.

**Tech Stack:** HTML5, SVG, Canvas API, Vanilla JS (ES6 modules), CSS Grid/Flexbox

---

## File Structure

```
index.html              — Entry point, loads all modules
css/
  styles.css            — All styles: layout, masks, buttons, colors, transitions
js/
  app.js                — Main controller: screen flow, trial orchestration, state machine
  voronoi.js            — Voronoi pattern generation → SVG paths
  glyphs.js             — Procedural abstract glyph generation via Canvas
  data.js               — Data recording, CSV export, server POST
  config.js             — Color definitions, trial configuration constants
```

---

### Task 1: Project Scaffold + HTML Structure

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/config.js`
- Create: `js/app.js`

- [ ] **Step 1: Create `js/config.js` with color definitions and trial constants**

```js
// js/config.js
export const COLORS = [
  { name: 'blue', hex: '#2196F3' },
  { name: 'orange', hex: '#FF9800' },
  { name: 'red', hex: '#F44336' },
  { name: 'cyan', hex: '#00BCD4' },
  { name: 'green', hex: '#4CAF50' },
  { name: 'darkgreen', hex: '#1B5E20' },
  { name: 'yellow', hex: '#FFEB3B' },
  { name: 'bisque', hex: '#FFE4C4' },
  { name: 'sienna', hex: '#A0522D' },
  { name: 'purple', hex: '#9C27B0' },
  { name: 'pink', hex: '#E91E63' },
  { name: 'gray', hex: '#9E9E9E' },
];

export const PRACTICE_TRIALS = 2;
export const TEST_TRIALS = 10;
export const PRACTICE_COLOR_COUNT = 4; // 3-4 colors for practice
export const TEST_COLOR_COUNT_MIN = 10;
export const TEST_COLOR_COUNT_MAX = 12;

export const SCREENS = {
  SETUP: 'setup',
  INSTRUCTIONS: 'instructions',
  TRIAL: 'trial',
  COMPLETION: 'completion',
};
```

- [ ] **Step 2: Create `index.html` with all screen containers**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Color Pattern Task</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <!-- Setup Screen -->
  <div id="screen-setup" class="screen active">
    <div class="setup-container">
      <h1>Color Pattern Task — Setup</h1>
      <label for="input-pid">Participant ID:</label>
      <input type="text" id="input-pid" placeholder="Enter participant ID" required>
      <label for="input-delay">Key Window Delay (ms):</label>
      <input type="number" id="input-delay" value="0" min="0" step="100" required>
      <label for="input-server">Server Endpoint URL (optional):</label>
      <input type="url" id="input-server" placeholder="https://example.com/api/data">
      <button id="btn-start">Start Task</button>
    </div>
  </div>

  <!-- Instructions Screen -->
  <div id="screen-instructions" class="screen">
    <div class="instructions-container">
      <h1>Instructions</h1>
      <div id="instructions-content"></div>
      <button id="btn-begin">Begin Practice Trials</button>
    </div>
  </div>

  <!-- Trial Screen -->
  <div id="screen-trial" class="screen">
    <div class="trial-layout">
      <!-- Left: Key Window -->
      <div class="panel panel-left">
        <div class="panel-header">
          <span>Color Key</span>
          <button id="btn-open-key" class="btn-open">Open Key</button>
        </div>
        <div class="panel-content" id="key-window">
          <div id="key-content"></div>
        </div>
        <div class="mask" id="mask-left"></div>
        <div class="delay-overlay" id="delay-overlay">
          <div class="delay-spinner"></div>
          <span id="delay-text">Opening...</span>
        </div>
      </div>

      <!-- Right: Pattern + Resource Windows -->
      <div class="panel panel-right">
        <div class="panel-header">
          <span>Pattern</span>
          <button id="btn-open-pattern" class="btn-open">Open Pattern</button>
        </div>
        <div class="panel-content" id="pattern-window">
          <svg id="pattern-svg" width="100%" height="100%"></svg>
        </div>
        <div class="resource-window" id="resource-window">
          <div id="color-palette"></div>
        </div>
        <div class="mask" id="mask-right"></div>
      </div>
    </div>

    <!-- Trial Controls -->
    <div class="trial-controls">
      <span id="trial-label"></span>
      <div id="trial-message"></div>
      <button id="btn-end-trial">End Trial</button>
    </div>
  </div>

  <!-- Completion Screen -->
  <div id="screen-completion" class="screen">
    <div class="completion-container">
      <h1>Task Complete</h1>
      <p>Thank you for participating.</p>
      <p id="completion-status"></p>
    </div>
  </div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `css/styles.css` with full layout and masking styles**

```css
/* css/styles.css */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f5f5f5;
  overflow: hidden;
}

/* Screen management */
.screen {
  display: none;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.screen.active {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Setup Screen */
.setup-container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 400px;
}

.setup-container h1 {
  font-size: 1.4rem;
  margin-bottom: 8px;
}

.setup-container label {
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 4px;
}

.setup-container input {
  padding: 10px 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

.setup-container button,
.instructions-container button,
.trial-controls button {
  padding: 12px 24px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 8px;
}

.setup-container button:hover,
.instructions-container button:hover,
.trial-controls button:hover {
  background: #1976D2;
}

/* Instructions Screen */
.instructions-container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.instructions-container h1 {
  margin-bottom: 20px;
}

.instructions-container h2 {
  font-size: 1.1rem;
  margin: 16px 0 8px;
}

.instructions-container p, .instructions-container li {
  line-height: 1.6;
  margin-bottom: 8px;
}

/* Trial Layout */
.trial-layout {
  display: flex;
  width: 100%;
  height: calc(100% - 60px);
}

.panel {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 2px solid #ddd;
}

.panel-left {
  border-right: 1px solid #ddd;
}

.panel-right {
  border-left: 1px solid #ddd;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #fafafa;
  border-bottom: 1px solid #ddd;
  z-index: 10;
}

.panel-header span {
  font-weight: 600;
  font-size: 0.95rem;
}

.btn-open {
  padding: 6px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-open:hover {
  background: #388E3C;
}

.btn-open:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.panel-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Key Window Content */
#key-content {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px;
  justify-content: center;
  align-items: center;
  height: 100%;
  align-content: center;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fafafa;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #eee;
}

.key-item .glyph-container {
  width: 40px;
  height: 40px;
}

.key-item .color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

/* Masks */
.mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #999;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.mask.hidden {
  display: none;
}

/* Delay Overlay */
.delay-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 15;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: white;
  font-size: 1.1rem;
}

.delay-overlay.active {
  display: flex;
}

.delay-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Resource Window */
.resource-window {
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #ddd;
  z-index: 1;
}

#color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 3px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: #333;
  transform: scale(1.15);
  box-shadow: 0 0 8px rgba(0,0,0,0.3);
}

/* SVG Pattern */
#pattern-svg {
  width: 100%;
  height: 100%;
}

#pattern-svg .region {
  stroke: #333;
  stroke-width: 2;
  fill: white;
  cursor: pointer;
  transition: fill 0.15s;
}

#pattern-svg .region:hover {
  stroke-width: 3;
  filter: brightness(0.95);
}

#pattern-svg .region-label {
  pointer-events: none;
  text-anchor: middle;
  dominant-baseline: central;
}

/* Trial Controls */
.trial-controls {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: white;
  border-top: 2px solid #ddd;
  padding: 0 20px;
}

#trial-label {
  font-weight: 600;
  font-size: 0.95rem;
}

#trial-message {
  color: #d32f2f;
  font-size: 0.9rem;
}

#btn-end-trial {
  background: #FF5722;
  margin-top: 0;
}

#btn-end-trial:hover {
  background: #E64A19;
}

/* Completion Screen */
.completion-container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  text-align: center;
}

.completion-container h1 {
  margin-bottom: 16px;
}
```

- [ ] **Step 4: Create minimal `js/app.js` that shows the setup screen**

```js
// js/app.js
import { SCREENS } from './config.js';

const state = {
  currentScreen: SCREENS.SETUP,
  participantId: '',
  delayMs: 0,
  serverUrl: '',
};

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screenId}`).classList.add('active');
  state.currentScreen = screenId;
}

function init() {
  // Check URL params for Qualtrics integration
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('pid');
  const delay = params.get('delay');

  if (pid && delay !== null) {
    state.participantId = pid;
    state.delayMs = parseInt(delay, 10) || 0;
    showScreen(SCREENS.INSTRUCTIONS);
    return;
  }

  showScreen(SCREENS.SETUP);

  document.getElementById('btn-start').addEventListener('click', () => {
    const pid = document.getElementById('input-pid').value.trim();
    const delay = document.getElementById('input-delay').value;
    const server = document.getElementById('input-server').value.trim();

    if (!pid) {
      alert('Please enter a Participant ID.');
      return;
    }

    state.participantId = pid;
    state.delayMs = parseInt(delay, 10) || 0;
    state.serverUrl = server;
    showScreen(SCREENS.INSTRUCTIONS);
  });
}

document.addEventListener('DOMContentLoaded', init);

export { state, showScreen };
```

- [ ] **Step 5: Open `index.html` in browser, verify setup screen renders**

Open the file in a browser. Verify: setup form with Participant ID, Delay, Server URL fields, and Start button. Clicking Start with a PID should switch to a blank instructions screen.

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css js/config.js js/app.js
git commit -m "feat: scaffold project with HTML structure, styles, and setup screen"
```

---

### Task 2: Voronoi Pattern Generator

**Files:**
- Create: `js/voronoi.js`

- [ ] **Step 1: Create `js/voronoi.js` with Voronoi region generation**

This generates random seed points, computes Voronoi regions via Fortune's algorithm (simplified), and returns SVG path data for each region. We use a relaxed Voronoi (Lloyd's relaxation) for visually pleasing regions.

```js
// js/voronoi.js

/**
 * Generate Voronoi-style mosaic regions for a given bounding box.
 * Returns array of { path: "M... Z", centroid: {x, y} } objects.
 */
export function generateVoronoiRegions(width, height, regionCount, padding = 20) {
  // Generate random seed points with padding from edges
  let points = [];
  for (let i = 0; i < regionCount; i++) {
    points.push({
      x: padding + Math.random() * (width - 2 * padding),
      y: padding + Math.random() * (height - 2 * padding),
    });
  }

  // Lloyd's relaxation — 3 iterations for more even regions
  for (let iter = 0; iter < 3; iter++) {
    const cells = computeVoronoiCells(points, width, height);
    points = cells.map(cell => centroid(cell));
  }

  // Final computation
  const cells = computeVoronoiCells(points, width, height);

  return cells.map((cell, i) => ({
    path: cellToSVGPath(cell),
    centroid: centroid(cell),
    index: i,
  }));
}

/**
 * Compute Voronoi cells using a pixel-sampling approach.
 * For research-task region counts (3-12), this is fast and robust.
 */
function computeVoronoiCells(points, width, height) {
  const step = 2; // Sample every 2 pixels for speed
  const assignments = new Array(points.length).fill(null).map(() => []);

  // Assign grid points to nearest seed
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      let minDist = Infinity;
      let nearest = 0;
      for (let i = 0; i < points.length; i++) {
        const dx = x - points[i].x;
        const dy = y - points[i].y;
        const dist = dx * dx + dy * dy;
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      assignments[nearest].push({ x, y });
    }
  }

  // Convert pixel assignments to convex hull outlines
  return assignments.map(pixels => convexHull(pixels));
}

/**
 * Convex hull via Graham scan — gives clean region outlines.
 */
function convexHull(points) {
  if (points.length < 3) return points;

  // Find bottom-most point (then left-most)
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y > points[start].y ||
       (points[i].y === points[start].y && points[i].x < points[start].x)) {
      start = i;
    }
  }
  [points[0], points[start]] = [points[start], points[0]];
  const pivot = points[0];

  // Sort by polar angle
  const sorted = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    if (angleA !== angleB) return angleA - angleB;
    return distance(pivot, a) - distance(pivot, b);
  });

  const hull = [pivot, sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    while (hull.length > 1 && cross(hull[hull.length - 2], hull[hull.length - 1], sorted[i]) <= 0) {
      hull.pop();
    }
    hull.push(sorted[i]);
  }

  return hull;
}

function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function centroid(polygon) {
  if (polygon.length === 0) return { x: 0, y: 0 };
  const sum = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / polygon.length, y: sum.y / polygon.length };
}

function cellToSVGPath(polygon) {
  if (polygon.length === 0) return '';
  return 'M ' + polygon.map(p => `${p.x},${p.y}`).join(' L ') + ' Z';
}
```

- [ ] **Step 2: Quick visual test — add temporary test to `app.js`**

Add to the end of the `init()` function in `app.js`, temporarily:

```js
// TEMP TEST — remove after verifying
import { generateVoronoiRegions } from './voronoi.js';
window._testVoronoi = () => {
  const svg = document.getElementById('pattern-svg');
  const rect = svg.getBoundingClientRect();
  const regions = generateVoronoiRegions(rect.width, rect.height, 10);
  regions.forEach(r => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', r.path);
    path.setAttribute('class', 'region');
    svg.appendChild(path);
  });
  console.log('Generated', regions.length, 'regions');
};
```

Open browser console, navigate to trial screen manually, call `_testVoronoi()`. Verify 10 distinct colored-border regions appear in the SVG.

- [ ] **Step 3: Remove temp test code, commit**

Remove the temporary test code from `app.js`.

```bash
git add js/voronoi.js js/app.js
git commit -m "feat: add Voronoi pattern generator with Lloyd's relaxation"
```

---

### Task 3: Procedural Glyph Generator

**Files:**
- Create: `js/glyphs.js`

- [ ] **Step 1: Create `js/glyphs.js` with abstract glyph generation**

Generates non-identifiable abstract symbols using randomized Canvas drawing operations (bezier curves, arcs, lines). Each glyph is rendered to a small offscreen canvas, then exported as a data URL for use in SVG `<image>` elements.

```js
// js/glyphs.js

/**
 * Generate a set of unique abstract glyphs.
 * @param {number} count — number of glyphs to generate
 * @param {number} size — pixel size of each glyph canvas
 * @returns {string[]} — array of data URLs (PNG) for each glyph
 */
export function generateGlyphs(count, size = 48) {
  const glyphs = [];
  for (let i = 0; i < count; i++) {
    glyphs.push(generateOneGlyph(size, i * 1000 + Date.now()));
  }
  return glyphs;
}

function generateOneGlyph(size, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Use a seeded-ish random for variety
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw 3-5 random strokes
  const strokeCount = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < strokeCount; i++) {
    ctx.beginPath();

    const type = Math.floor(rand() * 4);

    if (type === 0) {
      // Bezier curve
      const x1 = cx + (rand() - 0.5) * r * 2;
      const y1 = cy + (rand() - 0.5) * r * 2;
      const cp1x = cx + (rand() - 0.5) * r * 2;
      const cp1y = cy + (rand() - 0.5) * r * 2;
      const cp2x = cx + (rand() - 0.5) * r * 2;
      const cp2y = cy + (rand() - 0.5) * r * 2;
      const x2 = cx + (rand() - 0.5) * r * 2;
      const y2 = cy + (rand() - 0.5) * r * 2;
      ctx.moveTo(x1, y1);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    } else if (type === 1) {
      // Arc segment
      const arcR = r * (0.3 + rand() * 0.5);
      const startAngle = rand() * Math.PI * 2;
      const endAngle = startAngle + (0.5 + rand() * 1.5);
      ctx.arc(
        cx + (rand() - 0.5) * r * 0.8,
        cy + (rand() - 0.5) * r * 0.8,
        arcR, startAngle, endAngle
      );
    } else if (type === 2) {
      // Quadratic curve
      const x1 = cx + (rand() - 0.5) * r * 2;
      const y1 = cy + (rand() - 0.5) * r * 2;
      const cpx = cx + (rand() - 0.5) * r * 2;
      const cpy = cy + (rand() - 0.5) * r * 2;
      const x2 = cx + (rand() - 0.5) * r * 2;
      const y2 = cy + (rand() - 0.5) * r * 2;
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    } else {
      // Polyline with 3-4 points
      const pointCount = 3 + Math.floor(rand() * 2);
      for (let j = 0; j < pointCount; j++) {
        const px = cx + (rand() - 0.5) * r * 2;
        const py = cy + (rand() - 0.5) * r * 2;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  }

  // Optional: add a small dot or loop for extra distinctiveness
  if (rand() > 0.5) {
    ctx.beginPath();
    const dotR = r * (0.08 + rand() * 0.12);
    ctx.arc(
      cx + (rand() - 0.5) * r,
      cy + (rand() - 0.5) * r,
      dotR, 0, Math.PI * 2
    );
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generate a high-contrast version of a glyph for use on colored backgrounds.
 * Returns both black and white versions so the caller can pick based on fill color.
 * @param {string} dataUrl — original glyph data URL
 * @param {number} size — pixel size
 * @returns {{ black: string, white: string }}
 */
export function generateContrastGlyphs(dataUrl, size = 48) {
  // The default glyphs are black — for dark backgrounds we need white.
  // We invert by drawing to a new canvas with globalCompositeOperation.
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      // White version
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      const white = canvas.toDataURL('image/png');

      resolve({ black: dataUrl, white });
    };
    img.src = dataUrl;
  });
}

/**
 * Determine if a color is "dark" (needs white text/glyph overlay).
 * @param {string} hex — hex color string like '#FF0000'
 * @returns {boolean}
 */
export function isDarkColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
```

- [ ] **Step 2: Verify in browser — generate and display some glyphs in console**

Temporarily in `app.js`:

```js
import { generateGlyphs } from './glyphs.js';
window._testGlyphs = () => {
  const glyphs = generateGlyphs(12);
  glyphs.forEach((url, i) => {
    const img = new Image();
    img.src = url;
    img.style.border = '1px solid #ccc';
    img.style.margin = '4px';
    document.body.appendChild(img);
  });
};
```

Call `_testGlyphs()` in console. Verify 12 distinct abstract symbols appear — none should look like recognizable letters or shapes.

- [ ] **Step 3: Remove temp test, commit**

```bash
git add js/glyphs.js
git commit -m "feat: add procedural abstract glyph generator"
```

---

### Task 4: Data Recording Module

**Files:**
- Create: `js/data.js`

- [ ] **Step 1: Create `js/data.js` with data recording, CSV export, and server POST**

```js
// js/data.js

const sessionData = {
  participantId: '',
  delayMs: 0,
  sessionStart: null,
  trials: [],
};

export function initSession(participantId, delayMs) {
  sessionData.participantId = participantId;
  sessionData.delayMs = delayMs;
  sessionData.sessionStart = new Date().toISOString();
  sessionData.trials = [];
}

export function recordTrial(trialData) {
  sessionData.trials.push({
    trialNumber: trialData.trialNumber,
    trialType: trialData.trialType,
    keyOpenings: trialData.keyOpenings,
    firstKeyOpenDuration: trialData.firstKeyOpenDuration,
    totalCompletionTime: trialData.totalCompletionTime,
    attempts: trialData.attempts,
  });
}

export function getSessionData() {
  return { ...sessionData };
}

/**
 * Export all trial data as CSV and trigger download.
 */
export function downloadCSV() {
  const headers = [
    'participant_id',
    'delay_ms',
    'session_start',
    'trial_number',
    'trial_type',
    'key_openings',
    'first_key_open_duration_ms',
    'total_completion_time_ms',
    'attempts',
  ];

  const rows = sessionData.trials.map(t => [
    sessionData.participantId,
    sessionData.delayMs,
    sessionData.sessionStart,
    t.trialNumber,
    t.trialType,
    t.keyOpenings,
    t.firstKeyOpenDuration,
    t.totalCompletionTime,
    t.attempts,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `color-task_${sessionData.participantId}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * POST session data as JSON to server endpoint.
 * @param {string} serverUrl
 * @returns {Promise<boolean>} — true if successful
 */
export async function postToServer(serverUrl) {
  if (!serverUrl) return false;

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to POST data:', err);
    return false;
  }
}

/**
 * Send postMessage to parent window (for Qualtrics iframe integration).
 */
export function notifyParent() {
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'color-pattern-task-complete',
      participantId: sessionData.participantId,
      trialCount: sessionData.trials.length,
    }, '*');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/data.js
git commit -m "feat: add data recording module with CSV export and server POST"
```

---

### Task 5: Instructions Screen

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add instructions content generation to `app.js`**

Add this function to `app.js` and call it when navigating to the instructions screen:

```js
function setupInstructions() {
  const content = document.getElementById('instructions-content');
  content.innerHTML = `
    <p>In this task, you will fill in color patterns by matching symbols to colors.</p>

    <h2>How it works:</h2>
    <ol>
      <li><strong>Pattern Window (right side):</strong> You will see an abstract pattern divided into regions. Each region contains a unique symbol.</li>
      <li><strong>Color Key (left side):</strong> The key shows which color corresponds to each symbol. Click "Open Key" to view it.</li>
      <li><strong>Color Palette (bottom right):</strong> Select a color by clicking on it, then click a region in the pattern to fill it with that color.</li>
    </ol>

    <h2>Important:</h2>
    <ul>
      <li>Only one side of the screen is visible at a time. When you open the key, the pattern is hidden, and vice versa.</li>
      <li>You can switch between the key and the pattern as many times as you need.</li>
      <li>To correct a mistake, simply select the right color and click the region again.</li>
      <li>When you have filled in all regions, click <strong>"End Trial"</strong> to check your work.</li>
      <li>If your pattern is not correct, you will be asked to continue editing. You will not be told which colors are wrong.</li>
    </ul>

    <h2>Practice:</h2>
    <p>You will start with 2 practice trials using fewer colors, followed by 10 test trials.</p>

    <p><strong>Click "Begin Practice Trials" when you are ready.</strong></p>
  `;

  document.getElementById('btn-begin').addEventListener('click', () => {
    startTrials();
  });
}
```

- [ ] **Step 2: Wire up the instructions screen in the `init()` flow**

Update the `showScreen` transitions so that after setup, `setupInstructions()` is called:

```js
// In the btn-start click handler and URL param branch:
showScreen(SCREENS.INSTRUCTIONS);
setupInstructions();
```

- [ ] **Step 3: Verify instructions appear, commit**

```bash
git add js/app.js
git commit -m "feat: add instructions screen content"
```

---

### Task 6: Trial Engine — Core Loop

**Files:**
- Modify: `js/app.js`

This is the main task — orchestrating trials, generating patterns/glyphs, handling mask toggling, recording data.

- [ ] **Step 1: Add trial state and generation logic to `app.js`**

Add imports and trial state:

```js
import { COLORS, PRACTICE_TRIALS, TEST_TRIALS, PRACTICE_COLOR_COUNT, TEST_COLOR_COUNT_MIN, TEST_COLOR_COUNT_MAX, SCREENS } from './config.js';
import { generateVoronoiRegions } from './voronoi.js';
import { generateGlyphs, generateContrastGlyphs, isDarkColor } from './glyphs.js';
import { initSession, recordTrial, downloadCSV, postToServer, notifyParent } from './data.js';

const trialState = {
  trials: [],            // Array of trial configs
  currentTrialIndex: 0,
  // Per-trial tracking
  keyOpenings: 0,
  firstKeyOpenDuration: null,
  keyOpenStartTime: null,
  isFirstKeyOpen: true,
  trialStartTime: null,
  attempts: 0,
  selectedColor: null,
  regionColors: {},      // { regionIndex: hexColor }
  correctMapping: {},    // { regionIndex: hexColor }
  glyphContrasts: [],    // contrast versions of glyphs
  keyVisible: false,
};
```

- [ ] **Step 2: Add `generateTrials()` function**

```js
function generateTrials() {
  const trials = [];

  // 2 practice trials
  for (let i = 0; i < PRACTICE_TRIALS; i++) {
    const colorCount = PRACTICE_COLOR_COUNT;
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
    const trialColors = shuffled.slice(0, colorCount);
    trials.push({
      trialNumber: i + 1,
      trialType: 'practice',
      colorCount,
      colors: trialColors,
    });
  }

  // 10 test trials
  for (let i = 0; i < TEST_TRIALS; i++) {
    const colorCount = TEST_COLOR_COUNT_MIN + Math.floor(Math.random() * (TEST_COLOR_COUNT_MAX - TEST_COLOR_COUNT_MIN + 1));
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
    const trialColors = shuffled.slice(0, colorCount);
    trials.push({
      trialNumber: PRACTICE_TRIALS + i + 1,
      trialType: 'test',
      colorCount,
      colors: trialColors,
    });
  }

  // Randomize test trial order (keep practice trials first)
  const practice = trials.slice(0, PRACTICE_TRIALS);
  const test = trials.slice(PRACTICE_TRIALS);
  test.sort(() => Math.random() - 0.5);

  return [...practice, ...test];
}
```

- [ ] **Step 3: Add `startTrials()` and `loadTrial()` functions**

```js
function startTrials() {
  initSession(state.participantId, state.delayMs);
  trialState.trials = generateTrials();
  trialState.currentTrialIndex = 0;
  showScreen(SCREENS.TRIAL);
  loadTrial();
}

async function loadTrial() {
  const trial = trialState.trials[trialState.currentTrialIndex];
  const svg = document.getElementById('pattern-svg');
  const rect = svg.getBoundingClientRect();

  // Reset per-trial state
  trialState.keyOpenings = 0;
  trialState.firstKeyOpenDuration = null;
  trialState.keyOpenStartTime = null;
  trialState.isFirstKeyOpen = true;
  trialState.trialStartTime = Date.now();
  trialState.attempts = 0;
  trialState.selectedColor = null;
  trialState.regionColors = {};
  trialState.correctMapping = {};
  trialState.keyVisible = false;
  document.getElementById('trial-message').textContent = '';

  // Update trial label
  document.getElementById('trial-label').textContent =
    `${trial.trialType === 'practice' ? 'Practice' : 'Test'} Trial ${trial.trialNumber} of ${PRACTICE_TRIALS + TEST_TRIALS}`;

  // Generate pattern regions
  const regions = generateVoronoiRegions(rect.width, rect.height, trial.colorCount);

  // Generate glyphs for this trial
  const glyphUrls = generateGlyphs(trial.colorCount);
  const contrastPromises = glyphUrls.map(url => generateContrastGlyphs(url));
  trialState.glyphContrasts = await Promise.all(contrastPromises);

  // Shuffle color assignment to regions
  const shuffledColors = [...trial.colors].sort(() => Math.random() - 0.5);

  // Clear SVG and render regions
  svg.innerHTML = '';
  regions.forEach((region, i) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', region.path);
    path.setAttribute('class', 'region');
    path.setAttribute('data-index', i);
    path.addEventListener('click', () => onRegionClick(i));
    svg.appendChild(path);

    // Add glyph image at centroid
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', glyphUrls[i]);
    img.setAttribute('x', region.centroid.x - 18);
    img.setAttribute('y', region.centroid.y - 18);
    img.setAttribute('width', 36);
    img.setAttribute('height', 36);
    img.setAttribute('class', 'region-label');
    img.setAttribute('data-glyph-index', i);
    svg.appendChild(img);

    // Store correct mapping
    trialState.correctMapping[i] = shuffledColors[i].hex;
  });

  // Render key window
  renderKeyWindow(glyphUrls, shuffledColors);

  // Render color palette
  renderColorPalette(trial.colors);

  // Set initial mask state: pattern visible, key hidden
  showPatternSide();
}
```

- [ ] **Step 4: Add mask toggling and delay logic**

```js
function showPatternSide() {
  trialState.keyVisible = false;
  document.getElementById('mask-right').classList.add('hidden');
  document.getElementById('mask-left').classList.remove('hidden');
  document.getElementById('btn-open-pattern').disabled = true;
  document.getElementById('btn-open-key').disabled = false;

  // If key was open, record the closing
  if (trialState.keyOpenStartTime !== null) {
    const duration = Date.now() - trialState.keyOpenStartTime;
    if (trialState.isFirstKeyOpen) {
      trialState.firstKeyOpenDuration = duration;
      trialState.isFirstKeyOpen = false;
    }
    trialState.keyOpenStartTime = null;
  }
}

function showKeySide() {
  trialState.keyVisible = true;
  trialState.keyOpenings++;
  trialState.keyOpenStartTime = Date.now();

  document.getElementById('mask-left').classList.add('hidden');
  document.getElementById('mask-right').classList.remove('hidden');
  document.getElementById('btn-open-key').disabled = true;
  document.getElementById('btn-open-pattern').disabled = false;
}

function onOpenKeyClick() {
  const delay = state.delayMs;
  const overlay = document.getElementById('delay-overlay');
  const delayText = document.getElementById('delay-text');

  document.getElementById('btn-open-key').disabled = true;

  if (delay <= 0) {
    showKeySide();
    return;
  }

  // Show countdown overlay
  overlay.classList.add('active');
  let remaining = delay;
  delayText.textContent = `Opening in ${(remaining / 1000).toFixed(1)}s...`;

  const interval = setInterval(() => {
    remaining -= 100;
    if (remaining <= 0) {
      clearInterval(interval);
      overlay.classList.remove('active');
      showKeySide();
    } else {
      delayText.textContent = `Opening in ${(remaining / 1000).toFixed(1)}s...`;
    }
  }, 100);
}
```

- [ ] **Step 5: Add key window rendering, color palette, and region click handlers**

```js
function renderKeyWindow(glyphUrls, colorAssignments) {
  const container = document.getElementById('key-content');
  container.innerHTML = '';

  // Shuffle key display order so it doesn't match spatial layout
  const indices = colorAssignments.map((_, i) => i).sort(() => Math.random() - 0.5);

  indices.forEach(i => {
    const item = document.createElement('div');
    item.className = 'key-item';

    const glyphImg = document.createElement('img');
    glyphImg.src = glyphUrls[i];
    glyphImg.className = 'glyph-container';
    glyphImg.alt = `Symbol ${i + 1}`;

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = colorAssignments[i].hex;

    item.appendChild(glyphImg);
    item.appendChild(swatch);
    container.appendChild(item);
  });
}

function renderColorPalette(colors) {
  const palette = document.getElementById('color-palette');
  palette.innerHTML = '';

  // Shuffle palette order
  const shuffled = [...colors].sort(() => Math.random() - 0.5);

  shuffled.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-option';
    swatch.style.backgroundColor = color.hex;
    swatch.title = color.name;
    swatch.setAttribute('data-hex', color.hex);

    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      trialState.selectedColor = color.hex;
    });

    palette.appendChild(swatch);
  });
}

function onRegionClick(index) {
  if (!trialState.selectedColor) return;

  trialState.regionColors[index] = trialState.selectedColor;

  // Update region fill
  const path = document.querySelector(`#pattern-svg .region[data-index="${index}"]`);
  if (path) {
    path.style.fill = trialState.selectedColor;
  }

  // Update glyph contrast
  const glyphImg = document.querySelector(`#pattern-svg image[data-glyph-index="${index}"]`);
  if (glyphImg && trialState.glyphContrasts[index]) {
    const contrast = trialState.glyphContrasts[index];
    glyphImg.setAttribute('href', isDarkColor(trialState.selectedColor) ? contrast.white : contrast.black);
  }
}
```

- [ ] **Step 6: Add end trial logic and trial progression**

```js
function onEndTrialClick() {
  trialState.attempts++;
  const trial = trialState.trials[trialState.currentTrialIndex];

  // Check if all regions are filled correctly
  let allCorrect = true;
  for (let i = 0; i < trial.colorCount; i++) {
    if (trialState.regionColors[i] !== trialState.correctMapping[i]) {
      allCorrect = false;
      break;
    }
  }

  if (!allCorrect) {
    document.getElementById('trial-message').textContent = 'Please keep editing the pattern.';
    return;
  }

  // Record trial data
  const completionTime = Date.now() - trialState.trialStartTime;

  // If key was never opened, firstKeyOpenDuration stays null (record as 0)
  recordTrial({
    trialNumber: trial.trialNumber,
    trialType: trial.trialType,
    keyOpenings: trialState.keyOpenings,
    firstKeyOpenDuration: trialState.firstKeyOpenDuration || 0,
    totalCompletionTime: completionTime,
    attempts: trialState.attempts,
  });

  // Advance to next trial or completion
  trialState.currentTrialIndex++;
  if (trialState.currentTrialIndex < trialState.trials.length) {
    loadTrial();
  } else {
    finishTask();
  }
}

async function finishTask() {
  showScreen(SCREENS.COMPLETION);

  // Export data
  downloadCSV();

  const serverSuccess = await postToServer(state.serverUrl);
  const statusEl = document.getElementById('completion-status');
  if (state.serverUrl) {
    statusEl.textContent = serverSuccess
      ? 'Data saved successfully.'
      : 'Data downloaded as CSV. Server upload failed — please send the CSV file manually.';
  } else {
    statusEl.textContent = 'Data downloaded as CSV.';
  }

  // Notify parent (Qualtrics)
  notifyParent();
}
```

- [ ] **Step 7: Wire up all event listeners in `init()`**

Add to the `init()` function:

```js
document.getElementById('btn-open-key').addEventListener('click', onOpenKeyClick);
document.getElementById('btn-open-pattern').addEventListener('click', showPatternSide);
document.getElementById('btn-end-trial').addEventListener('click', onEndTrialClick);
```

- [ ] **Step 8: Test full flow in browser**

1. Open `index.html`, enter PID and delay
2. Read instructions, click Begin
3. Verify practice trial loads with 4 regions, glyphs, and color palette
4. Toggle key window — verify delay countdown, mask toggling
5. Select color, click region — verify fill and glyph contrast
6. Complete pattern correctly, click End Trial — verify advance
7. Complete all 12 trials — verify CSV download and completion screen

- [ ] **Step 9: Commit**

```bash
git add js/app.js
git commit -m "feat: implement trial engine with mask toggling, data recording, and full flow"
```

---

### Task 7: Polish + Edge Cases

**Files:**
- Modify: `js/app.js`
- Modify: `css/styles.css`

- [ ] **Step 1: Add SVG viewBox sizing to handle dynamic container sizes**

In `loadTrial()`, after getting the SVG bounding rect, set the viewBox:

```js
svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
```

- [ ] **Step 2: Add visual feedback when all regions are filled**

After `onRegionClick`, check if all regions have been colored:

```js
function checkAllFilled() {
  const trial = trialState.trials[trialState.currentTrialIndex];
  const filledCount = Object.keys(trialState.regionColors).length;
  if (filledCount === trial.colorCount) {
    document.getElementById('btn-end-trial').style.animation = 'pulse 1s infinite';
  }
}
```

Add to CSS:
```css
@keyframes pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 12px rgba(255, 87, 34, 0.6); }
}
```

Call `checkAllFilled()` at the end of `onRegionClick()`.

- [ ] **Step 3: Handle window resize — re-render pattern if needed**

```js
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (state.currentScreen === SCREENS.TRIAL) {
      // SVG viewBox handles scaling, no need to regenerate
    }
  }, 250);
});
```

Since SVG with a viewBox scales automatically, no action needed — but add the listener as a safety net for future needs.

- [ ] **Step 4: Ensure delay overlay only appears over the key panel, not globally**

Verify the delay overlay is a child of `.panel-left` (it already is in the HTML). Check it renders correctly with the spinner.

- [ ] **Step 5: Test Qualtrics URL params**

Open `index.html?pid=TEST001&delay=3000` — verify it skips setup and goes straight to instructions.

- [ ] **Step 6: Commit**

```bash
git add js/app.js css/styles.css
git commit -m "feat: add polish, viewBox scaling, and visual feedback"
```

---

### Task 8: Final Integration Test + Cleanup

**Files:**
- All files (review pass)

- [ ] **Step 1: Full end-to-end test — standalone mode**

1. Open `index.html` fresh
2. Enter PID "P001", delay 2000ms
3. Complete instructions
4. Practice trial 1: verify 3-4 regions, toggle key (check 2s delay with spinner), fill correctly
5. Practice trial 2: fill incorrectly first, verify "Please keep editing" message, then fix
6. Test trials 1-10: verify unique patterns and glyphs each time, all 10-12 regions
7. Completion: verify CSV downloads with correct columns and data
8. Open CSV, verify: participant_id, delay_ms, all trial rows, correct data

- [ ] **Step 2: Full end-to-end test — Qualtrics param mode**

Open `index.html?pid=QUALTRICS_TEST&delay=0` — verify instant key reveal, no setup screen.

- [ ] **Step 3: Verify data accuracy**

Check CSV:
- `key_openings` count matches actual opens
- `first_key_open_duration_ms` is reasonable (not 0 if opened, 0 if never opened)
- `total_completion_time_ms` matches elapsed time
- `attempts` count matches End Trial clicks

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration test pass and cleanup"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-08-color-pattern-task.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**