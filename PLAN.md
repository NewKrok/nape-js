# Docs Demo Architecture Refactor Plan

## Current state (problems)

| File | Size | Problem |
|------|------|---------|
| `docs/app.js` | 2,670 lines | 9 demos inline, Three.js, render loop, pointer events, stats — all here |
| `docs/examples.js` | 1,416 lines | 14 demos inline, duplicated helpers, no stats/code preview |
| `docs/renderer.js` | 234 lines | ✅ shared, good shape |

**Concrete duplications:**
- `addWalls()` — in both files
- `spawnRandomShape()` — in both files
- Three.js setup/teardown — in both files
- Pointer event handling — in both files (with different bugs)
- Canvas scaling helper (`getCanvasScale` / `getCanvasPos`) — in both files
- rAF render loop — in both files
- `strandbeast` demo — code duplicated across both files

---

## Target state

```
docs/
  demos/                        # NEW: one file per demo
    falling.js
    pyramid.js
    chain.js
    explosion.js
    constraints.js
    gravity.js
    stacking.js
    ragdoll.js
    strandbeast.js              # featured=true, lives here once
    car-sideview.js
    car-topdown.js
    platformer.js
    rope-bridge.js
    wrecking-ball.js
    newtons-cradle.js
    dominos.js
    conveyor-belts.js
    trebuchet.js
    seesaw.js
    pinball.js
    cloth.js
    funnel.js
    soft-body.js
    one-way-platforms.js
    collision-filtering.js
  demo-runner.js                # NEW: shared runtime class
  renderer.js                   # unchanged
  app.js                        # shrinks to ~200 lines
  examples.js                   # shrinks to ~150 lines
  style.css                     # additions: play overlay + view-code styles
  index.html                    # minor changes
  examples.html                 # minor changes
```

---

## Demo definition format

Each `docs/demos/*.js` file exports a single default object:

```javascript
// docs/demos/falling.js
export default {
  id: 'falling',
  label: 'Falling Shapes',
  featured: true,          // appears in homepage tabs
  featuredOrder: 0,        // 0–8, homepage tab order
  tags: ['basics', 'spawning'],
  desc: `<p>Click or drag to spawn shapes.</p>`,

  setup(space, W, H) {
    addWalls(space, W, H);
    // ...
  },

  // Optional interaction callbacks:
  click(x, y, space, W, H) { spawnRandomShape(space, x, y); },
  drag(x, y, space, W, H)  { spawnRandomShape(space, x, y); },
  release(space)            { /* optional */ },

  // Only needed for featured demos (homepage code preview):
  code2d: `const space = new Space(...);\n// ...`,
  code3d: `// Three.js version\n// ...`,
}
```

**`featured: true`** → shown in homepage tabs
**`featured` absent / `false`** → examples grid only
**`featuredOrder`** → 0–8, homepage tab order

---

## DemoRunner class (`docs/demo-runner.js`)

```javascript
export class DemoRunner {
  // Constructor
  constructor(canvas, { W = 900, H = 500 } = {})

  // Load a demo (teardown old space + run demoDef.setup)
  load(demoDef)

  // Loop control
  start()
  stop()
  get isRunning()

  // Render mode
  setMode(mode)   // '2d' | '3d'

  // DOM wiring (optional, order-independent)
  wireStats({ fps, bodies, step })      // live-update DOM elements
  wireInteraction(element)              // attach pointer events to element
  wireCodePanel(panelEl, getCode)       // render syntax-highlighted code

  // Read current state (used by app.js for CodePen)
  get currentDemo()
  get currentCode()
}

// Shared helpers — exported so demo files can import them
export function addWalls(space, W, H) { ... }
export function spawnRandomShape(space, x, y) { ... }
```

**DemoRunner internal responsibilities:**
- Space creation/destruction (`space.clear()`)
- rAF loop (60-frame rolling-average FPS, step-ms timing)
- 2D canvas drawing (via renderer.js `drawBody`, `drawConstraints`, `drawGrid`)
- Three.js 3D rendering (current app.js Three.js code moves here)
- Pointer event handling (`pointerdown/move/up/cancel`, `setPointerCapture`)
- Forwarding `click`, `drag`, `release` to the loaded demo definition

---

## `app.js` after refactor (~200 lines)

```javascript
import { DemoRunner, addWalls, spawnRandomShape } from './demo-runner.js';
import falling    from './demos/falling.js';
import pyramid    from './demos/pyramid.js';
// ... all 23 demos

const ALL_DEMOS = [falling, pyramid, chain, explosion, constraints,
                   gravity, stacking, ragdoll, strandbeast,
                   carSideview, carTopdown, /* ... */];

const FEATURED = ALL_DEMOS
  .filter(d => d.featured)
  .sort((a, b) => a.featuredOrder - b.featuredOrder);

// Canvas + runner
const runner = new DemoRunner(canvas, { W: 900, H: 500 });
runner.wireStats({ fps: fpsEl, bodies: bodiesEl, step: stepEl });
runner.wireInteraction(canvasWrap);
runner.wireCodePanel(codePanel, () => runner.currentCode);

// Build tabs from FEATURED
buildTabs(FEATURED);

// Tab click
function startDemo(id) {
  const demo = FEATURED.find(d => d.id === id);
  runner.load(demo);
  runner.start();
  updateCodePreview();
}

// Render mode toggle
modeToggle.addEventListener('change', () => runner.setMode(...));

// CodePen / Copy — read runner.currentCode
// Benchmark suite — unchanged, stays inline
// startDemo(FEATURED[0].id) — initial demo
```

---

## `examples.js` after refactor (~150 lines)

```javascript
import { DemoRunner, addWalls, spawnRandomShape } from './demo-runner.js';
import falling from './demos/falling.js';
// ... all 23 demos

const ALL_DEMOS = [...];

function createCard(demo) {
  // Build DOM
  const card      = document.createElement('div');
  const canvas    = document.createElement('canvas');
  const overlay   = createPlayOverlay();   // ▶ button
  const stats     = createStatsBar();      // FPS / Bodies / Step
  const codeBtn   = createCodeToggle();    // { } Code button
  const codePanel = createCodePanel();     // <pre> panel, hidden

  const runner = new DemoRunner(canvas, { W: CW, H: CH });
  runner.wireStats(stats);
  runner.wireInteraction(canvas);

  // Play overlay click
  overlay.addEventListener('click', () => {
    runner.load(demo);
    runner.start();
    overlay.hidden = true;
    stats.el.hidden = false;
  });

  // View Code toggle
  codeBtn.addEventListener('click', () => {
    codePanel.hidden = !codePanel.hidden;
    if (!codePanel.hidden && !codePanel._rendered) {
      codePanel.innerHTML = highlightCode(demo.code2d ?? '// Source not included for this demo.');
      codePanel._rendered = true;
    }
  });

  card.append(canvas, overlay, stats.el, codeBtn, codePanel,
              titleEl, descEl, tagsEl);
  return { card, runner };
}

// Populate grid
const grid = document.getElementById('examplesGrid');
const cards = ALL_DEMOS.map((demo, idx) => {
  const { card, runner } = createCard(demo);
  card.dataset.idx = idx;
  grid.append(card);
  return { runner };
});

// IntersectionObserver — only pause/resume already-started demos
// (no auto-start — the overlay handles that)
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const { runner } = cards[entry.target.dataset.idx];
    if (!runner.isRunning) continue;  // not started yet, skip
    entry.isIntersecting ? runner.start() : runner.stop();
  }
}, { threshold: 0.1 });
```

---

## Play overlay UX

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│           ▶  Play               │  ← semi-transparent overlay, disappears on click
│                                 │
│                                 │
└─────────────────────────────────┘
  FPS: --  Bodies: --  Step: --ms    ← stats row (hidden until started)
  { } Code                           ← toggle button
```

- Overlay: `position: absolute`, covers full canvas, `backdrop-filter: blur(2px)`
- ▶ button: large, centered, hover effect
- On click: `runner.load(demo)`, `runner.start()`, overlay disappears
- Reset button (on card): `runner.load(demo)` → restarts, overlay stays hidden

---

## View Code panel UX (examples page)

- `{ } Code` button in card footer
- Toggles a `<pre class="code-panel">` below the canvas
- Same `highlightCode()` function as homepage (moved into `demo-runner.js` or kept in `app.js` and re-exported)
- Shows `demo.code2d`; if absent: `// Source not included for this demo.`
- No CodePen button on examples page

---

## Stats display (examples cards)

Compact row below canvas:
```
FPS: 60   Bodies: 12   Step: 1.2ms
```
- Hidden until demo starts
- Same rolling-average FPS calculation as homepage (done inside DemoRunner)

---

## CSS additions (`style.css`)

```css
/* Play overlay */
.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 14, 20, 0.7);
  backdrop-filter: blur(2px);
  cursor: pointer;
  transition: opacity 0.2s;
}
.play-overlay[hidden] { display: none; }
.play-btn {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--green);
  /* ▶ icon */
}

/* View Code panel */
.code-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}
.code-panel:not([hidden]) {
  max-height: 400px;
  overflow-y: auto;
}

/* Card stats row */
.card-stats {
  font-size: 0.8rem;
  color: var(--muted);
  padding: 4px 8px;
}
```

---

## Migration steps

### Phase 1 — Infrastructure (testable independently)
1. Create `docs/demos/` directory
2. Write `docs/demo-runner.js` (DemoRunner class + `addWalls` + `spawnRandomShape` exports)
3. Move Three.js logic from `app.js` → `DemoRunner`
4. Add play overlay + view-code CSS to `style.css`

### Phase 2 — Extract demo files
5. Extract 9 featured demos from `app.js` → `docs/demos/falling.js` etc. (one at a time, verify each)
6. Extract 14 examples from `examples.js` → `docs/demos/` (one at a time)
7. Consolidate `strandbeast.js`: `featured: true`, remove from `examples.js`

### Phase 3 — Refactor `app.js`
8. Rewrite `app.js`: DemoRunner + demo imports, FEATURED filter, tab generation

### Phase 4 — Refactor `examples.js`
9. Rewrite `examples.js`: DemoRunner + createCard() + play overlay + view-code + stats

### Phase 5 — Verification
10. `npm test` — all 2,269 tests green
11. `npm run build` — DTS generation succeeds
12. Manual smoke test: homepage, examples page, 2D/3D toggle, CodePen export, mobile

---

## What stays unchanged

- `renderer.js` — no changes
- All physics logic (moves into demo files, code itself unchanged)
- Homepage UI structure (tabs, code panel, benchmark, CodePen)
- All 2,269 unit tests — they test `src/`, `docs/` changes don't affect them

---

## Expected outcome

| Metric | Before | After |
|--------|--------|-------|
| `app.js` size | 2,670 lines | ~200 lines |
| `examples.js` size | 1,416 lines | ~150 lines |
| Duplicate `addWalls` | 2× | 0× |
| Duplicate `spawnRandomShape` | 2× | 0× |
| Duplicate pointer event code | 2× | 0× |
| Duplicate Three.js setup | 2× | 0× |
| `strandbeast` code | 2× | 1× |
| Adding a new demo | edit 2 files | 1 new file + 2 import lines |
| Examples page: stats | ✗ | ✓ |
| Examples page: code preview | ✗ | ✓ (View Code) |
| Examples page: auto-start | everywhere | nowhere (play button) |
