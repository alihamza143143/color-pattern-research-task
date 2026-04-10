// js/app.js
import {
  COLORS,
  PRACTICE_TRIALS,
  TEST_TRIALS,
  TEST_COLOR_COUNT_MIN,
  TEST_COLOR_COUNT_MAX,
  SCREENS,
} from './config.js';
import { generateVoronoiRegions } from './voronoi.js';
import { generateGlyphs, generateWhiteGlyph, isDarkColor } from './glyphs.js';
import {
  initSession,
  recordTrial,
  downloadCSV,
  postToServer,
  notifyParent,
} from './data.js';

// ── Global state ──
const state = {
  currentScreen: SCREENS.SETUP,
  participantId: '',
  delayMs: 0,
  serverUrl: '',
};

// ── Per-trial state ──
const trial = {
  list: [],
  currentIndex: 0,
  keyOpenings: 0,
  firstKeyOpenDuration: null,
  keyOpenStartTime: null,
  isFirstKeyOpen: true,
  trialStartTime: null,
  attempts: 0,
  selectedColor: null,
  regionColors: {},
  correctMapping: {},
  whiteGlyphs: [],
  blackGlyphs: [],
  keyVisible: false,
  colorCount: 0,
  delayInterval: null,
  correctAfterFirstKeyOpen: null, // tracks correct count after first key viewing
  hasReturnedFromFirstKey: false,
};

// ── Screen management ──
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screenId}`).classList.add('active');
  state.currentScreen = screenId;
}

// ── Setup ──
function init() {
  // Wire up trial controls first (needed for both standalone and Qualtrics modes)
  document.getElementById('btn-open-key').addEventListener('click', onOpenKeyClick);
  document.getElementById('btn-open-pattern').addEventListener('click', showPatternSide);
  document.getElementById('btn-end-trial').addEventListener('click', onEndTrialClick);

  const params = new URLSearchParams(window.location.search);
  const pid = params.get('pid');
  const delay = params.get('delay');
  const server = params.get('server');

  if (pid && delay !== null) {
    state.participantId = pid;
    state.delayMs = parseInt(delay, 10) || 0;
    state.serverUrl = server || '';
    showScreen(SCREENS.INSTRUCTIONS);
    setupInstructions();
    return;
  }

  showScreen(SCREENS.SETUP);

  document.getElementById('btn-start').addEventListener('click', () => {
    const pidVal = document.getElementById('input-pid').value.trim();
    const delayVal = document.getElementById('input-delay').value;
    const serverVal = document.getElementById('input-server').value.trim();

    if (!pidVal) {
      alert('Please enter a Participant ID.');
      return;
    }

    state.participantId = pidVal;
    state.delayMs = parseInt(delayVal, 10) || 0;
    state.serverUrl = serverVal;

    showScreen(SCREENS.INSTRUCTIONS);
    setupInstructions();
  });
}

// ── Instructions ──
function setupInstructions() {
  const content = document.getElementById('instructions-content');
  content.innerHTML = `
    <p>In this task, you will fill in color patterns by matching symbols to colors.</p>

    <h2>How it works:</h2>
    <ol>
      <li><strong>Pattern Window (right side):</strong> You will see an abstract pattern divided into regions. Each region contains a unique symbol.</li>
      <li><strong>Color Key (left side):</strong> The key shows which color corresponds to each symbol. Click <strong>"Open Key"</strong> to view it.</li>
      <li><strong>Color Palette (bottom right):</strong> Select a color by clicking on it, then click a region in the pattern to fill it with that color.</li>
    </ol>

    <h2>Important:</h2>
    <ul>
      <li>Only one side of the screen is visible at a time. When you open the key, the pattern is hidden, and vice versa.</li>
      <li>You can switch between the key and the pattern as many times as you need.</li>
      <li>The symbols will remain visible even after you color a region.</li>
      <li>To correct a mistake, simply select the correct color and click the region again.</li>
      <li>When you have filled in all regions, click <strong>"End Trial"</strong> to check your work.</li>
      <li>If your pattern is not correct, you will be asked to continue editing. You will <em>not</em> be told which colors are wrong.</li>
    </ul>

    <h2>Keyboard Shortcuts:</h2>
    <ul>
      <li>Press <strong>1&ndash;9, 0</strong> to quickly select a color from the palette.</li>
      <li>Press <strong>K</strong> to toggle the color key open/closed.</li>
      <li>Press <strong>Enter</strong> to submit your answer (same as clicking "End Trial").</li>
    </ul>

    <h2>Practice:</h2>
    <p>You will start with <strong>2 practice trials</strong> using fewer colors, followed by <strong>10 test trials</strong>.</p>

    <p><strong>Click "Begin Practice Trials" when you are ready.</strong></p>
  `;

  document.getElementById('btn-begin').addEventListener('click', () => {
    startTrials();
  }, { once: true });
}

// ── Trial generation ──
function generateTrials() {
  const trials = [];

  for (let i = 0; i < PRACTICE_TRIALS; i++) {
    const colorCount = 3 + Math.floor(Math.random() * 2); // 3 or 4
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
    trials.push({
      trialType: 'practice',
      colorCount,
      colors: shuffled.slice(0, colorCount),
    });
  }

  for (let i = 0; i < TEST_TRIALS; i++) {
    const colorCount =
      TEST_COLOR_COUNT_MIN +
      Math.floor(Math.random() * (TEST_COLOR_COUNT_MAX - TEST_COLOR_COUNT_MIN + 1));
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
    trials.push({
      trialType: 'test',
      colorCount,
      colors: shuffled.slice(0, colorCount),
    });
  }

  // Randomize test trial order (keep practice first)
  const practice = trials.slice(0, PRACTICE_TRIALS);
  const test = trials.slice(PRACTICE_TRIALS).sort(() => Math.random() - 0.5);
  const combined = [...practice, ...test];

  // Assign sequential display numbers AFTER randomization
  combined.forEach((t, i) => {
    t.displayNumber = i + 1;
  });

  return combined;
}

// ── Start trials ──
function startTrials() {
  initSession(state.participantId, state.delayMs);
  trial.list = generateTrials();
  trial.currentIndex = 0;
  showScreen(SCREENS.TRIAL);

  // Small delay to let the DOM settle before measuring SVG size
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loadTrial();
    });
  });
}

// ── Load a single trial ──
async function loadTrial() {
  const currentTrial = trial.list[trial.currentIndex];
  const svg = document.getElementById('pattern-svg');
  const container = document.getElementById('pattern-window');
  const rect = container.getBoundingClientRect();

  const svgW = Math.floor(rect.width);
  const svgH = Math.floor(rect.height);

  // Reset per-trial state
  trial.keyOpenings = 0;
  trial.firstKeyOpenDuration = null;
  trial.keyOpenStartTime = null;
  trial.isFirstKeyOpen = true;
  trial.trialStartTime = Date.now();
  trial.attempts = 0;
  trial.selectedColor = null;
  trial.regionColors = {};
  trial.correctMapping = {};
  trial.keyVisible = false;
  trial.colorCount = currentTrial.colorCount;
  trial.correctAfterFirstKeyOpen = null;
  trial.hasReturnedFromFirstKey = false;

  document.getElementById('trial-message').textContent = '';
  document.getElementById('btn-end-trial').classList.remove('pulse');
  document.getElementById('regions-counter').textContent = `0 / ${currentTrial.colorCount} filled`;

  // Update progress bar and trial label using sequential display numbers
  const totalTrials = PRACTICE_TRIALS + TEST_TRIALS;
  const progress = (trial.currentIndex / totalTrials) * 100;
  document.getElementById('progress-bar').style.width = `${progress}%`;

  const typeLabel = currentTrial.trialType === 'practice' ? 'Practice' : 'Test';
  document.getElementById('trial-label').textContent =
    `${typeLabel} Trial ${currentTrial.displayNumber} of ${totalTrials}`;

  // Generate pattern regions
  const regions = generateVoronoiRegions(svgW, svgH, currentTrial.colorCount);

  // Generate glyphs
  const glyphUrls = generateGlyphs(currentTrial.colorCount, 80);
  trial.blackGlyphs = glyphUrls;

  // Generate white variants for dark backgrounds
  const whitePromises = glyphUrls.map(url => generateWhiteGlyph(url, 80));
  trial.whiteGlyphs = await Promise.all(whitePromises);

  // Shuffle color assignment to regions
  const shuffledColors = [...currentTrial.colors].sort(() => Math.random() - 0.5);

  // Set SVG viewBox
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svg.innerHTML = '';

  // Render regions
  regions.forEach((region, i) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', region.path);
    path.setAttribute('class', 'region');
    path.setAttribute('data-index', i);
    path.addEventListener('click', () => onRegionClick(i));
    svg.appendChild(path);

    // Glyph image at centroid — larger for visibility
    const glyphSize = 56;
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', glyphUrls[i]);
    img.setAttribute('x', region.centroid.x - glyphSize / 2);
    img.setAttribute('y', region.centroid.y - glyphSize / 2);
    img.setAttribute('width', glyphSize);
    img.setAttribute('height', glyphSize);
    img.setAttribute('class', 'region-label');
    img.setAttribute('data-glyph-index', i);
    svg.appendChild(img);

    // Store correct mapping
    trial.correctMapping[i] = shuffledColors[i].hex;
  });

  // Render key window
  renderKeyWindow(glyphUrls, shuffledColors);

  // Render color palette
  renderColorPalette(currentTrial.colors);

  // Set initial mask state: pattern visible, key hidden
  showPatternSide();
}

// ── Mask toggling ──
function showPatternSide() {
  trial.keyVisible = false;
  document.getElementById('mask-right').classList.add('hidden');
  document.getElementById('mask-left').classList.remove('hidden');
  document.getElementById('btn-open-pattern').disabled = true;
  document.getElementById('btn-open-key').disabled = false;

  // Record key close duration
  if (trial.keyOpenStartTime !== null) {
    const duration = Date.now() - trial.keyOpenStartTime;
    if (trial.isFirstKeyOpen) {
      trial.firstKeyOpenDuration = duration;
      trial.isFirstKeyOpen = false;
      // Mark that we've returned from the first key open — snapshot will be taken on next color fill
      trial.hasReturnedFromFirstKey = true;
    }
    trial.keyOpenStartTime = null;
  }
}

function showKeySide() {
  trial.keyVisible = true;
  trial.keyOpenings++;
  trial.keyOpenStartTime = Date.now();

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

  // Hide the pattern side during countdown, keep key mask visible
  document.getElementById('mask-right').classList.remove('hidden');
  // Show countdown overlay over the key panel mask
  overlay.classList.add('active');

  let remaining = delay;
  delayText.textContent = `Opening in ${(remaining / 1000).toFixed(1)}s...`;

  trial.delayInterval = setInterval(() => {
    remaining -= 100;
    if (remaining <= 0) {
      clearInterval(trial.delayInterval);
      trial.delayInterval = null;
      overlay.classList.remove('active');
      showKeySide();
    } else {
      delayText.textContent = `Opening in ${(remaining / 1000).toFixed(1)}s...`;
    }
  }, 100);
}

// ── Key window rendering ──
function renderKeyWindow(glyphUrls, colorAssignments) {
  const container = document.getElementById('key-content');
  container.innerHTML = '';

  // Shuffle key display order
  const indices = colorAssignments.map((_, i) => i).sort(() => Math.random() - 0.5);

  indices.forEach(i => {
    const item = document.createElement('div');
    item.className = 'key-item';

    const glyphImg = document.createElement('img');
    glyphImg.src = glyphUrls[i];
    glyphImg.className = 'glyph-container';
    glyphImg.draggable = false;

    const equals = document.createElement('span');
    equals.className = 'key-equals';
    equals.textContent = '=';

    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = colorAssignments[i].hex;

    item.appendChild(glyphImg);
    item.appendChild(equals);
    item.appendChild(swatch);
    container.appendChild(item);
  });
}

// ── Color palette rendering ──
function renderColorPalette(colors) {
  const palette = document.getElementById('color-palette');
  palette.innerHTML = '';

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
      trial.selectedColor = color.hex;
    });

    palette.appendChild(swatch);
  });
}

// ── Region click handler ──
function onRegionClick(index) {
  if (!trial.selectedColor) return;

  trial.regionColors[index] = trial.selectedColor;

  // Update region fill
  const path = document.querySelector(`#pattern-svg .region[data-index="${index}"]`);
  if (path) {
    path.style.fill = trial.selectedColor;
  }

  // Update glyph contrast for readability
  const glyphImg = document.querySelector(
    `#pattern-svg image[data-glyph-index="${index}"]`
  );
  if (glyphImg) {
    const useWhite = isDarkColor(trial.selectedColor);
    glyphImg.setAttribute(
      'href',
      useWhite ? trial.whiteGlyphs[index] : trial.blackGlyphs[index]
    );
  }

  // Clear error message when participant resumes editing
  document.getElementById('trial-message').textContent = '';

  // Snapshot correct count after first key open (on the very first color placement after returning)
  if (trial.hasReturnedFromFirstKey && trial.correctAfterFirstKeyOpen === null) {
    trial.correctAfterFirstKeyOpen = countCorrectPlacements();
  }

  // Check if all regions filled — pulse the End Trial button
  checkAllFilled();
}

/**
 * Count how many regions currently have the correct color.
 */
function countCorrectPlacements() {
  let correct = 0;
  for (const [index, color] of Object.entries(trial.regionColors)) {
    if (trial.correctMapping[parseInt(index)] === color) {
      correct++;
    }
  }
  return correct;
}

function checkAllFilled() {
  const filledCount = Object.keys(trial.regionColors).length;
  const btn = document.getElementById('btn-end-trial');

  // Update regions counter
  document.getElementById('regions-counter').textContent =
    `${filledCount} / ${trial.colorCount} filled`;

  if (filledCount >= trial.colorCount) {
    btn.classList.add('pulse');
  } else {
    btn.classList.remove('pulse');
  }
}

// ── End trial ──
function onEndTrialClick() {
  trial.attempts++;
  const currentTrial = trial.list[trial.currentIndex];

  // Check correctness
  let allCorrect = true;
  for (let i = 0; i < currentTrial.colorCount; i++) {
    if (trial.regionColors[i] !== trial.correctMapping[i]) {
      allCorrect = false;
      break;
    }
  }

  if (!allCorrect) {
    document.getElementById('trial-message').textContent =
      'Please keep editing the pattern.';
    return;
  }

  // If key is still open, close timing
  if (trial.keyOpenStartTime !== null) {
    const duration = Date.now() - trial.keyOpenStartTime;
    if (trial.isFirstKeyOpen) {
      trial.firstKeyOpenDuration = duration;
      trial.isFirstKeyOpen = false;
    }
    trial.keyOpenStartTime = null;
  }

  const completionTime = Date.now() - trial.trialStartTime;

  recordTrial({
    trialNumber: currentTrial.displayNumber,
    trialType: currentTrial.trialType,
    colorCount: currentTrial.colorCount,
    keyOpenings: trial.keyOpenings,
    firstKeyOpenDuration: trial.firstKeyOpenDuration || 0,
    totalCompletionTime: completionTime,
    attempts: trial.attempts,
    correctAfterFirstKeyOpen: trial.correctAfterFirstKeyOpen !== null
      ? trial.correctAfterFirstKeyOpen : 0,
  });

  // Advance
  trial.currentIndex++;
  if (trial.currentIndex < trial.list.length) {
    // Show transition message when moving from practice to test
    const nextTrial = trial.list[trial.currentIndex];
    const justFinished = trial.list[trial.currentIndex - 1];
    if (justFinished.trialType === 'practice' && nextTrial.trialType === 'test') {
      showTransitionMessage('Practice complete. Test trials will now begin.', () => {
        loadTrial();
      });
    } else {
      loadTrial();
    }
  } else {
    finishTask();
  }
}

// ── Early termination (ESC key) ──
function endTaskEarly() {
  // Record current trial as incomplete if it was started
  if (trial.trialStartTime !== null && trial.list.length > 0) {
    const currentTrial = trial.list[trial.currentIndex];
    const completionTime = Date.now() - trial.trialStartTime;

    // Close key timing if open
    if (trial.keyOpenStartTime !== null) {
      const duration = Date.now() - trial.keyOpenStartTime;
      if (trial.isFirstKeyOpen) {
        trial.firstKeyOpenDuration = duration;
        trial.isFirstKeyOpen = false;
      }
      trial.keyOpenStartTime = null;
    }

    recordTrial({
      trialNumber: currentTrial.displayNumber,
      trialType: currentTrial.trialType,
      colorCount: currentTrial.colorCount,
      keyOpenings: trial.keyOpenings,
      firstKeyOpenDuration: trial.firstKeyOpenDuration || 0,
      totalCompletionTime: completionTime,
      attempts: trial.attempts,
      correctAfterFirstKeyOpen: trial.correctAfterFirstKeyOpen !== null
        ? trial.correctAfterFirstKeyOpen : 0,
    });
  }

  // Clear any running delay interval
  if (trial.delayInterval) {
    clearInterval(trial.delayInterval);
    trial.delayInterval = null;
    document.getElementById('delay-overlay').classList.remove('active');
  }

  finishTask();
}

// ── Transition message ──
function showTransitionMessage(message, onContinue) {
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);' +
    'display:flex;align-items:center;justify-content:center;z-index:1000;';

  const box = document.createElement('div');
  box.style.cssText =
    'background:white;padding:40px 48px;border-radius:12px;text-align:center;' +
    'box-shadow:0 4px 24px rgba(0,0,0,0.2);max-width:500px;';

  const msg = document.createElement('p');
  msg.textContent = message;
  msg.style.cssText = 'font-size:1.1rem;margin-bottom:20px;color:#333;font-weight:600;';

  const btn = document.createElement('button');
  btn.textContent = 'Continue';
  btn.className = 'btn-primary';
  btn.addEventListener('click', () => {
    document.body.removeChild(overlay);
    onContinue();
  });

  box.appendChild(msg);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// ── Completion ──
async function finishTask() {
  document.getElementById('progress-bar').style.width = '100%';
  showScreen(SCREENS.COMPLETION);

  downloadCSV();

  const statusEl = document.getElementById('completion-status');

  if (state.serverUrl) {
    const serverSuccess = await postToServer(state.serverUrl);
    statusEl.textContent = serverSuccess
      ? 'Data saved to server and downloaded as CSV.'
      : 'Data downloaded as CSV. Server upload failed — please send the CSV file manually.';
  } else {
    statusEl.textContent = 'Data downloaded as CSV.';
  }

  notifyParent();
}

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  if (state.currentScreen !== SCREENS.TRIAL) return;

  const key = e.key;

  // Number keys 1-9, 0 to select colors from palette
  if (key >= '0' && key <= '9') {
    const index = key === '0' ? 9 : parseInt(key) - 1;
    const swatches = document.querySelectorAll('.color-option');
    if (index < swatches.length) {
      swatches.forEach(s => s.classList.remove('selected'));
      swatches[index].classList.add('selected');
      trial.selectedColor = swatches[index].getAttribute('data-hex');
    }
  }

  // 'k' to toggle key window
  if (key === 'k' || key === 'K') {
    if (!trial.keyVisible && !document.getElementById('btn-open-key').disabled) {
      onOpenKeyClick();
    } else if (trial.keyVisible) {
      showPatternSide();
    }
  }

  // Enter to end trial
  if (key === 'Enter') {
    onEndTrialClick();
  }

  // ESC to end task early (hidden shortcut — not in instructions)
  if (key === 'Escape') {
    endTaskEarly();
  }
});

// ── Init ──
document.addEventListener('DOMContentLoaded', init);
