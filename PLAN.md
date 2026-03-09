# Docs Demo Architecture Refactor Plan

## Jelenlegi állapot (problémák)

| Fájl | Méret | Probléma |
|------|-------|----------|
| `docs/app.js` | 2 670 sor | 9 demo inline, Three.js, render loop, pointer events, stats – mind itt |
| `docs/examples.js` | 1 416 sor | 14 demo inline, duplikált helpers, nincs stats/code preview |
| `docs/renderer.js` | 234 sor | ✅ megosztott, jó állapot |

**Konkrét duplikációk:**
- `addWalls()` — mindkét fájlban
- `spawnRandomShape()` — mindkét fájlban
- Three.js setup/teardown — mindkét fájlban
- pointer event handling — mindkét fájlban (különböző hibákkal)
- canvas scaling helper (`getCanvasScale` / `getCanvasPos`) — mindkét fájlban
- rAF render loop — mindkét fájlban
- `strandbeast` demo — kód duplikálva mindkét fájlban

---

## Célállapot

```
docs/
  demos/                        # ÚJ: egy fájl / demo
    falling.js
    pyramid.js
    chain.js
    explosion.js
    constraints.js
    gravity.js
    stacking.js
    ragdoll.js
    strandbeast.js              # featured=true, egyszer szerepel
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
  demo-runner.js                # ÚJ: megosztott runtime osztály
  renderer.js                   # változatlan
  app.js                        # ~200 sorra csökken
  examples.js                   # ~150 sorra csökken
  style.css                     # play overlay + view-code stílusok
  index.html                    # kisebb módosítás
  examples.html                 # kisebb módosítás
```

---

## Demo definíció formátum

Minden `docs/demos/*.js` fájl egy default exportot ad:

```javascript
// docs/demos/falling.js
export default {
  id: 'falling',
  label: 'Falling Shapes',
  featured: true,          // megjelenik a homepage tabokban
  featuredOrder: 0,        // 0–8, homepage tab sorrend
  tags: ['basics', 'spawning'],
  desc: `<p>Click or drag to spawn shapes.</p>`,

  setup(space, W, H) {
    addWalls(space, W, H);
    // ...
  },

  // Opcionális interakció-callbackek:
  click(x, y, space, W, H) { spawnRandomShape(space, x, y); },
  drag(x, y, space, W, H)  { spawnRandomShape(space, x, y); },
  release(space)            { /* opcionális */ },

  // Csak featured demoknál szükséges (homepage code preview):
  code2d: `const space = new Space(...);\n// ...`,
  code3d: `// Three.js verzió\n// ...`,
}
```

**`featured: true`** → homepage tabban jelenik meg
**`featured` nélkül / `false`** → csak az examples gridben
**`featuredOrder`** → 0–8 közötti szám, homepage tab sorrend

---

## DemoRunner osztály (`docs/demo-runner.js`)

```javascript
export class DemoRunner {
  // Konstruktor
  constructor(canvas, { W = 900, H = 500 } = {})

  // Demo betöltés (teardown + setup)
  load(demoDef)

  // Loop vezérlés
  start()
  stop()
  get isRunning()

  // Render mód
  setMode(mode)   // '2d' | '3d'

  // DOM összekötések (opcionális, sorrendtől független)
  wireStats({ fps, bodies, step })      // DOM elemek live frissítése
  wireInteraction(element)              // pointer events az adott elemen
  wireCodePanel(panelEl, getCode)       // syntax-highlighted kód megjelenítése

  // Aktuális állapot olvasása (app.js CodePen-hez használja)
  get currentDemo()
  get currentCode()

  // Megosztott helperek (exportálva, hogy a demo fájlok importálhassák)
  // Ezeket a demo-runner.js exportálja, nem a renderer.js
}

// Megosztott helperek export:
export function addWalls(space, W, H) { ... }
export function spawnRandomShape(space, x, y) { ... }
```

**DemoRunner belső felelőssége:**
- Space létrehozás/teardown (`space.clear()`)
- rAF loop (FPS számítás 60 frame rolling average, step ms mérés)
- 2D canvas rajzolás (renderer.js `drawBody`, `drawConstraints`, `drawGrid` hívások)
- Three.js 3D renderelés (app.js jelenlegi Three.js kódja ide kerül)
- Pointer event kezelés (`pointerdown/move/up/cancel`, `setPointerCapture`)
- Demo callback továbbítás (`click`, `drag`, `release`)

---

## `app.js` refaktorált struktúra (~200 sor)

```javascript
import { DemoRunner, addWalls, spawnRandomShape } from './demo-runner.js';
import falling    from './demos/falling.js';
import pyramid    from './demos/pyramid.js';
// ... mind a 23 demo

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

// Tab-ok generálása FEATURED-ből
buildTabs(FEATURED);

// Tab kattintás
function startDemo(id) {
  const demo = FEATURED.find(d => d.id === id);
  runner.load(demo);
  runner.start();
  updateCodePreview();
}

// Render mód toggle
modeToggle.addEventListener('change', () => runner.setMode(...));

// CodePen / Copy — runner.currentCode-ot olvassák
// Benchmark suite — változatlan, inline marad
// startDemo(FEATURED[0].id) — kezdő demo
```

---

## `examples.js` refaktorált struktúra (~150 sor)

```javascript
import { DemoRunner, addWalls, spawnRandomShape } from './demo-runner.js';
import falling from './demos/falling.js';
// ... mind a 23 demo

const ALL_DEMOS = [...];

function createCard(demo) {
  // DOM építés
  const card    = document.createElement('div');
  const canvas  = document.createElement('canvas');
  const overlay = createPlayOverlay();   // ▶ gomb
  const stats   = createStatsBar();     // FPS / Bodies / Step
  const codeBtn = createCodeToggle();   // { } Code gomb
  const codePanel = createCodePanel();  // <pre> panel, hidden

  const runner = new DemoRunner(canvas, { W: CW, H: CH });
  runner.wireStats(stats);
  runner.wireInteraction(canvas);

  // Play overlay kattintás
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

// Grid feltöltés
const grid = document.getElementById('examplesGrid');
const cards = ALL_DEMOS.map(demo => {
  const { card, runner } = createCard(demo);
  grid.append(card);
  return { runner };
});

// IntersectionObserver — csak futó demo-kat pause-ol/resume-ol
// (auto-start NINCS — az overlay kezeli az indítást)
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const { runner } = cards[entry.target.dataset.idx];
    if (!runner.isRunning) continue;  // még nem indult el, skip
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
│           ▶  Play               │  ← félszellős overlay, kattintásra tűnik el
│                                 │
│                                 │
└─────────────────────────────────┘
  FPS: --  Bodies: --  Step: --ms    ← stats sor (rejtett indulásig)
  { } Code                           ← toggle gomb
```

- Overlay: `position: absolute`, teljes canvas területet fed, `backdrop-filter: blur(2px)`
- ▶ gomb: nagy, centírozott, hover effekt
- Kattintás után: `overlay.hidden = true`, stats megjelenik, demo fut
- Reset gomb (kártyán): `runner.load(demo)` → újraindítás, overlay NEM jelenik vissza

---

## View Code panel UX (examples oldal)

- `{ } Code` gomb a kártya alján
- Toggle-öl egy `<pre class="code-panel">` elemet a canvas alatt
- Ugyanaz a `highlightCode()` függvény mint a homepage-en (kerül a `demo-runner.js`-be vagy marad `app.js`-ben és újraexportálódik)
- `demo.code2d`-t mutatja, ha nincs: `// Source not included for this demo.`
- CodePen gomb **nincs** az examples oldalon

---

## Stats megjelenítés (examples kártyákon)

Kompakt, a canvas alatt:
```
FPS: 60   Bodies: 12   Step: 1.2ms
```
- Indulásig rejtett (`hidden`)
- Ugyanaz a rolling-average FPS számítás mint a homepage-en (DemoRunner csinálja)

---

## CSS változások (`style.css`)

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
  /* ▶ ikon */
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

/* Kártya stats sor */
.card-stats {
  font-size: 0.8rem;
  color: var(--muted);
  padding: 4px 8px;
}
```

---

## Migráció lépései

### 1. fázis — Infrastruktúra (blokkolás nélkül tesztelhető)
1. Létrehozni `docs/demos/` könyvtárat
2. Megírni `docs/demo-runner.js`-t (DemoRunner osztály + `addWalls` + `spawnRandomShape` export)
3. Átmozgatni a Three.js logikát `app.js`-ből → `DemoRunner`-be
4. Hozzáadni a play overlay + view-code CSS-t `style.css`-be

### 2. fázis — Demo fájlok kiszervezése
5. Kiszervezni a 9 featured demót `app.js`-ből → `docs/demos/falling.js` stb. (egyenként, tesztelve)
6. Kiszervezni a 14 examples demót `examples.js`-ből → `docs/demos/` (egyenként)
7. `strandbeast.js` egységesítése: `featured: true`, törlés `examples.js`-ből

### 3. fázis — `app.js` refaktor
8. `app.js` átírása: DemoRunner + demo importok, FEATURED szűrés, tab generálás

### 4. fázis — `examples.js` refaktor
9. `examples.js` átírása: DemoRunner + createCard() + play overlay + view-code + stats

### 5. fázis — Ellenőrzés
10. `npm test` — minden 2269 teszt zöld
11. `npm run build` — DTS generálás sikeres
12. Manuális tesztelés: homepage, examples oldal, 2D/3D toggle, CodePen export, mobile

---

## Mi marad változatlan

- `renderer.js` — nem változik
- Minden fizikai logika (a demo fájlokba kerül, de a kód maga változatlan)
- Homepage UI struktúra (tab-ok, kód panel, benchmark, CodePen)
- A 2269 unit teszt — ezek a `src/` könyvtárat tesztelik, a `docs/` módosítása nem érinti

---

## Várható eredmény

| Metrika | Előtte | Utána |
|---------|--------|-------|
| `app.js` méret | 2 670 sor | ~200 sor |
| `examples.js` méret | 1 416 sor | ~150 sor |
| Duplikált `addWalls` | 2× | 0× |
| Duplikált `spawnRandomShape` | 2× | 0× |
| Duplikált pointer event kód | 2× | 0× |
| Duplikált Three.js setup | 2× | 0× |
| `strandbeast` kód | 2× | 1× |
| Új demo hozzáadása | 2 fájl szerkesztése | 1 új fájl + 2 import sor |
| Examples page: stats | ✗ | ✓ |
| Examples page: code preview | ✗ | ✓ (View Code) |
| Examples page: auto-start | mindenhol | sehol (play gomb) |
