import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, CbEvent, InteractionType, InteractionListener,
  buildTilemapBody,
} from "../nape-js.esm.js";
import { drawGrid } from "../renderer.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TILE = 30;
const COLS = 30;
const ROWS = 16;
const MARBLE_R = 9;
const MAX_G = 420;           // gravity magnitude at full pointer tilt
const TILT_RADIUS = 280;     // pointer distance at which gravity hits MAX_G
const TILT_DEADZONE = 28;    // pixel radius around centre with zero gravity

const KIND_WALL = 1;
const KIND_GOAL = 2;
const KIND_PIT = 3;
const KIND_COIN = 4;
const KIND_MARBLE = 5;

// ---------------------------------------------------------------------------
// Level descriptions (module-level — picked up by CodePen extractor)
// ---------------------------------------------------------------------------
// Each level is a compact rect/point list rasterized into a COLS×ROWS grid
// at load time. Rect form `[x, y, w, h]` covers tile coordinates inclusive
// of `x` and exclusive of `x + w` (same as `meshTilemap`).
//
// `spawn`  marble start cell                  (tile coords)
// `goal`   green goal sensor cell             (tile coords)
// `walls`  list of solid wall rectangles      ([x, y, w, h])
// `pits`   single-tile red hazard sensors     ([x, y])
// `coins`  single-tile gold collectible sensors ([x, y])
//
// The outer perimeter is added automatically — levels only describe interior
// walls. Reachability of `goal`, all coins, and all pits from `spawn` is
// validated when each grid is built.

const LEVELS = [
  // L1 — Pillars. Five vertical pillar columns with a horizontal lip near
  // the bottom; the marble snakes between pillars and around the lip.
  {
    spawn: [1, 1],
    goal: [28, 14],
    walls: [
      [3, 2, 3, 9],
      [8, 3, 3, 9],
      [13, 3, 3, 9],
      [18, 3, 3, 9],
      [23, 3, 3, 9],
      [3, 12, 21, 1],
    ],
    pits: [[26, 1], [15, 7], [21, 6]],
    coins: [[4, 1], [10, 4], [17, 5], [10, 13], [25, 13]],
  },

  // L2 — Chambers. Two vertical dividers carve three rooms; a pit cluster
  // sits dead-centre, with the goal in a small alcove to the south.
  {
    spawn: [1, 1],
    goal: [20, 13],
    walls: [
      [10, 1, 1, 9],
      [19, 1, 1, 9],
      [3, 4, 4, 4],
      [12, 4, 5, 2],
      [12, 8, 5, 2],
      [22, 4, 4, 4],
      [3, 11, COLS - 3, 1],
    ],
    pits: [[13, 5], [14, 5], [15, 5], [13, 8], [14, 8], [15, 8], [4, 13], [5, 13]],
    coins: [[5, 2], [24, 2], [15, 10], [27, 12]],
  },

  // L3 — Serpentine. Four horizontal walls with alternating left/right gaps
  // force a snake path top-to-bottom-left to the goal.
  {
    spawn: [1, 1],
    goal: [1, 14],
    walls: [
      [1, 3, COLS - 3, 1],
      [3, 6, COLS - 3, 1],
      [1, 9, COLS - 3, 1],
      [3, 12, COLS - 3, 1],
    ],
    pits: [[14, 4], [8, 7], [20, 10], [22, 11]],
    coins: [[10, 2], [5, 5], [20, 5], [15, 8], [5, 11], [25, 11], [20, 14]],
  },
];

// Rasterize a level into a 2-D grid string ('#'=wall, '.'=floor, 'M'/'G'/'H'/'C'=markers).
// The outer perimeter is added automatically.
function rasterizeLevel(L) {
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  for (let x = 0; x < COLS; x++) { grid[0][x] = 1; grid[ROWS - 1][x] = 1; }
  for (let y = 0; y < ROWS; y++) { grid[y][0] = 1; grid[y][COLS - 1] = 1; }
  for (const [x, y, w, h] of L.walls) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx >= 0 && xx < COLS && yy >= 0 && yy < ROWS) grid[yy][xx] = 1;
      }
    }
  }
  // Clear the spawn / goal / coin / pit cells so they're never wall.
  const clear = (p) => { if (p) grid[p[1]][p[0]] = 0; };
  clear(L.spawn);
  clear(L.goal);
  for (const p of L.coins) clear(p);
  for (const p of L.pits) clear(p);
  return grid;
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _levelIdx = 0;
let _wallBody = null;
const _sensorBodies = []; // pits + coins + goal — destroyed on level rebuild
const _coinBodies = [];   // subset of _sensorBodies: still-collectible coins
let _marble = null;
let _marbleSpawn = new Vec2(0, 0);
let _wallCbType = null;
let _goalCbType = null;
let _pitCbType = null;
let _coinCbType = null;
let _marbleCbType = null;
let _ptrX = 0;
let _ptrY = 0;
let _tiltCx = 0;
let _tiltCy = 0;
let _stats = { deaths: 0, time: 0, coinsTotal: 0, coinsGot: 0, complete: false };
let _winFlash = 0;    // ms remaining of green tint after winning final level
let _hitFlash = 0;    // ms remaining of red tint after a pit hit
let _awaitingStart = false; // each level waits for a centre click to begin
const START_RADIUS = 80;    // click anywhere inside this radius (px) to start

// Sensor callbacks can't mutate the space mid-step, so we queue any
// follow-up work here and drain it from step().
let _pendingAction = null;
const _pendingCoinPickups = [];

// ---------------------------------------------------------------------------
// Build the per-level grid + sensor list from a LEVELS entry.
// ---------------------------------------------------------------------------

function parseLevel(L) {
  const grid = rasterizeLevel(L);
  const sensors = [
    { kind: KIND_GOAL, gx: L.goal[0], gy: L.goal[1] },
    ...L.pits.map(([x, y]) => ({ kind: KIND_PIT, gx: x, gy: y })),
    ...L.coins.map(([x, y]) => ({ kind: KIND_COIN, gx: x, gy: y })),
  ];
  return { grid, sensors, spawn: { gx: L.spawn[0], gy: L.spawn[1] } };
}

// ---------------------------------------------------------------------------
// Level (re)build
// ---------------------------------------------------------------------------

function tearDownLevel() {
  if (_wallBody) {
    _wallBody.space = null;
    _wallBody = null;
  }
  for (const b of _sensorBodies) b.space = null;
  _sensorBodies.length = 0;
  _coinBodies.length = 0;
  if (_marble) {
    _marble.space = null;
    _marble = null;
  }
}

function buildLevel(space, idx) {
  tearDownLevel();
  const { grid, sensors, spawn } = parseLevel(LEVELS[idx]);

  _wallBody = buildTilemapBody(grid, {
    tileSize: TILE,
    merge: "greedy",
  });
  for (const s of _wallBody.shapes) s.cbTypes.add(_wallCbType);
  try {
    _wallBody.userData._kind = KIND_WALL;
  } catch (_) {}
  _wallBody.space = space;

  let coinCount = 0;
  for (const s of sensors) {
    const cx = s.gx * TILE + TILE / 2;
    const cy = s.gy * TILE + TILE / 2;
    const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
    // Shape choices double as the visual "icon" for each role:
    //   GOAL — green circle
    //   PIT  — red square
    //   COIN — gold circle (smaller)
    let shape;
    if (s.kind === KIND_GOAL) {
      shape = new Circle(TILE * 0.48);
    } else if (s.kind === KIND_PIT) {
      shape = new Polygon(Polygon.box(TILE * 0.9, TILE * 0.9));
    } else {
      shape = new Circle(TILE * 0.3);
    }
    shape.sensorEnabled = true;
    body.shapes.add(shape);

    if (s.kind === KIND_GOAL) {
      shape.cbTypes.add(_goalCbType);
      body.userData._kind = KIND_GOAL;
      body.userData._colorIdx = 2; // green
      body.userData._isZone = true;
    } else if (s.kind === KIND_PIT) {
      shape.cbTypes.add(_pitCbType);
      body.userData._kind = KIND_PIT;
      body.userData._colorIdx = 3; // red
      body.userData._isZone = true;
    } else if (s.kind === KIND_COIN) {
      shape.cbTypes.add(_coinCbType);
      body.userData._kind = KIND_COIN;
      body.userData._colorIdx = 1; // gold
      body.userData._isZone = true;
      _coinBodies.push(body);
      coinCount++;
    }
    body.space = space;
    _sensorBodies.push(body);
  }

  // Marble — Circle with the issue-specified Material(0.3, 0.4, 0.6, 0.3)
  _marbleSpawn = new Vec2(
    spawn.gx * TILE + TILE / 2,
    spawn.gy * TILE + TILE / 2,
  );
  _marble = new Body(BodyType.DYNAMIC, _marbleSpawn.copy());
  const ms = new Circle(MARBLE_R, undefined, new Material(0.3, 0.4, 0.6, 0.3));
  ms.cbTypes.add(_marbleCbType);
  _marble.shapes.add(ms);
  _marble.allowRotation = true;
  _marble.isBullet = true;
  try {
    _marble.userData._kind = KIND_MARBLE;
    _marble.userData._colorIdx = 0; // blue
  } catch (_) {}
  _marble.space = space;

  _stats.coinsTotal = coinCount;
  _stats.coinsGot = 0;
  _awaitingStart = true;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

export default {
  id: "tiltrun",
  label: "Tilt-Run Marble Maze",
  featured: false,
  tags: ["Tilemap", "Sensor", "Gravity", "Pointer", "Game"],
  desc:
    "Top-down tilt-maze. Move the <b>pointer</b> away from the maze centre to tilt " +
    "the world — gravity points toward the cursor. Roll the marble through three " +
    "labyrinths to the green goal while collecting gold coins and avoiding red pits. " +
    "Showcases dynamic <code>space.gravity</code>, sensor-driven game state, and " +
    "the <code>buildTilemapBody</code> helper.",
  walls: false,
  workerCompatible: false,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0); // pointer-driven below
    _levelIdx = 0;
    _tiltCx = W / 2;
    _tiltCy = H / 2;
    _ptrX = _tiltCx;
    _ptrY = _tiltCy;
    _stats = { deaths: 0, time: 0, coinsTotal: 0, coinsGot: 0, complete: false };
    _winFlash = 0;
    _hitFlash = 0;

    _wallCbType = new CbType();
    _goalCbType = new CbType();
    _pitCbType = new CbType();
    _coinCbType = new CbType();
    _marbleCbType = new CbType();

    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR,
      _goalCbType, _marbleCbType,
      () => {
        if (_stats.complete) return;
        if (_levelIdx + 1 >= LEVELS.length) {
          _stats.complete = true;
          _winFlash = 1800;
          return;
        }
        _levelIdx++;
        // Defer rebuild to next step — Nape can't mutate during a callback.
        _pendingAction = "advance";
      },
    ));

    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR,
      _pitCbType, _marbleCbType,
      () => {
        if (_stats.complete) return;
        _stats.deaths++;
        _hitFlash = 600;
        _pendingAction = "respawn";
      },
    ));

    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR,
      _coinCbType, _marbleCbType,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        const coin = b1?.userData?._kind === KIND_COIN ? b1 : b2;
        if (!coin || coin.userData._collected) return;
        coin.userData._collected = true;
        coin.userData._hidden = true;
        _stats.coinsGot++;
        _pendingCoinPickups.push(coin);
      },
    ));

    buildLevel(space, _levelIdx);
  },

  step(space) {
    if (_stats.complete) {
      _winFlash = Math.max(0, _winFlash - 16);
      space.gravity = new Vec2(0, 0);
      return;
    }

    // Pre-start: lock the marble at spawn and zero gravity until the user
    // clicks the centre. Keeps the level deterministic on (re)load and
    // matches the "click to begin" hint.
    if (_awaitingStart) {
      space.gravity = new Vec2(0, 0);
      if (_marble) {
        _marble.velocity = new Vec2(0, 0);
        _marble.angularVel = 0;
        _marble.position = _marbleSpawn.copy();
      }
      return;
    }

    _stats.time += 1 / 60;
    _hitFlash = Math.max(0, _hitFlash - 16);

    // Tilt gravity from pointer offset (relative to maze centre). A small
    // deadzone around the centre keeps the marble still when the cursor is
    // parked there; beyond that a quadratic ramp gives finer control at
    // small tilts than a linear curve.
    const dx = _ptrX - _tiltCx;
    const dy = _ptrY - _tiltCy;
    const d = Math.hypot(dx, dy);
    if (d <= TILT_DEADZONE) {
      space.gravity = new Vec2(0, 0);
    } else {
      const t = Math.min((d - TILT_DEADZONE) / (TILT_RADIUS - TILT_DEADZONE), 1);
      const k = t * t * MAX_G;
      space.gravity = new Vec2((dx / d) * k, (dy / d) * k);
    }

    // Handle deferred actions queued from sensor callbacks.
    if (_pendingAction === "advance") {
      _pendingAction = null;
      buildLevel(space, _levelIdx);
    } else if (_pendingAction === "respawn") {
      _pendingAction = null;
      if (_marble) {
        _marble.position = _marbleSpawn.copy();
        _marble.velocity = new Vec2(0, 0);
        _marble.angularVel = 0;
      }
    }
    while (_pendingCoinPickups.length > 0) {
      const c = _pendingCoinPickups.pop();
      c.space = null;
      const idx = _coinBodies.indexOf(c);
      if (idx >= 0) _coinBodies.splice(idx, 1);
    }
  },

  // Pointer-only input: tilt follows the cursor.
  hover(x, y) {
    _ptrX = x;
    _ptrY = y;
  },

  // Click near the maze centre to start a level. While waiting, the cursor
  // is also snapped to the centre so any residual hover position can't
  // pre-tilt the level on the very first frame.
  click(x, y) {
    if (!_awaitingStart) return;
    const dx = x - _tiltCx;
    const dy = y - _tiltCy;
    if (Math.hypot(dx, dy) > START_RADIUS) return;
    _awaitingStart = false;
    _ptrX = _tiltCx;
    _ptrY = _tiltCy;
  },

  // ---- Canvas2D rendering ----
  render(ctx, space, W, H, showOutlines) {
    // Background — dark floor with a faint vignette at the maze centre to
    // hint where "neutral" tilt is.
    ctx.save();
    const bg = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, Math.max(W, H));
    bg.addColorStop(0, "#0d141c");
    bg.addColorStop(1, "#06090d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    drawGrid(ctx, W, H);

    // Walls — drawn as solid dark blue plates so they read like a maze.
    if (_wallBody) {
      ctx.save();
      ctx.fillStyle = "#1e3a5a";
      ctx.strokeStyle = "#4d7fb3";
      ctx.lineWidth = 1;
      for (const shape of _wallBody.shapes) {
        if (!shape.isPolygon()) continue;
        const verts = shape.castPolygon.localVerts;
        ctx.beginPath();
        for (let i = 0; i < verts.length; i++) {
          const v = verts.at(i);
          if (i === 0) ctx.moveTo(v.x, v.y);
          else ctx.lineTo(v.x, v.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // Sensors — drawn directly with saturated fills so the goal / pit /
    // coin reads at a glance instead of as a faint zone tint.
    for (const body of _sensorBodies) {
      if (body.userData?._hidden) continue;
      drawSensor(ctx, body);
    }

    // Marble
    if (_marble) {
      const p = _marble.position;
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, MARBLE_R, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, MARBLE_R);
      grad.addColorStop(0, "#cfe6ff");
      grad.addColorStop(1, "#58a6ff");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#0d3b66";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Tilt indicator + HUD live in render3dOverlay; canvas2d calls it too.
    drawTiltIndicator(ctx, W, H);
    drawHud(ctx, W, H);
  },

  // Shared HUD for threejs / pixi modes (canvas2d already calls draw helpers).
  render3dOverlay(ctx, space, W, H) {
    drawTiltIndicator(ctx, W, H);
    drawHud(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Sensor drawing — saturated fills so each role reads at a glance.
//   GOAL → green pulsing circle      PIT  → red square      COIN → gold disc
// ---------------------------------------------------------------------------

function drawSensor(ctx, body) {
  const kind = body.userData._kind;
  const p = body.position;
  if (kind === KIND_GOAL) {
    const r = TILE * 0.48;
    // Pulse — slow, subtle, ties to wall clock so it's renderer-agnostic.
    const pulse = 1 + 0.08 * Math.sin(performance.now() / 240);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(63,185,80,0.85)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#9af09c";
    ctx.stroke();
    // Inner highlight
    ctx.beginPath();
    ctx.arc(p.x - r * 0.25, p.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fill();
    ctx.restore();
  } else if (kind === KIND_PIT) {
    const s = TILE * 0.9;
    ctx.save();
    ctx.fillStyle = "#c73838";
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    ctx.strokeStyle = "#ffb0b0";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
    // X mark
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - s * 0.25, p.y - s * 0.25);
    ctx.lineTo(p.x + s * 0.25, p.y + s * 0.25);
    ctx.moveTo(p.x + s * 0.25, p.y - s * 0.25);
    ctx.lineTo(p.x - s * 0.25, p.y + s * 0.25);
    ctx.stroke();
    ctx.restore();
  } else if (kind === KIND_COIN) {
    const r = TILE * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#f7c948";
    ctx.fill();
    ctx.strokeStyle = "#a07a18";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// HUD drawing helpers (module-level so canvas2d render and render3dOverlay
// can share the same code path).
// ---------------------------------------------------------------------------

function drawTiltIndicator(ctx, W, H) {
  // Tiny compass at the bottom-right showing the gravity vector.
  const cx = W - 44;
  const cy = H - 44;
  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.55)";
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const dx = _ptrX - _tiltCx;
  const dy = _ptrY - _tiltCy;
  const d = Math.hypot(dx, dy);
  if (d > 1) {
    const k = Math.min(d / TILT_RADIUS, 1);
    const ux = dx / d, uy = dy / d;
    ctx.strokeStyle = "#f7c948";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + ux * 20 * k, cy + uy * 20 * k);
    ctx.stroke();
    // Arrowhead
    const ax = cx + ux * 20 * k, ay = cy + uy * 20 * k;
    const left = Math.atan2(uy, ux) + Math.PI - 0.5;
    const right = Math.atan2(uy, ux) + Math.PI + 0.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(left) * 6, ay + Math.sin(left) * 6);
    ctx.lineTo(ax + Math.cos(right) * 6, ay + Math.sin(right) * 6);
    ctx.closePath();
    ctx.fillStyle = "#f7c948";
    ctx.fill();
  }
  ctx.restore();
}

function drawHud(ctx, W, H) {
  ctx.save();
  ctx.font = "bold 14px ui-monospace, monospace";

  // Soft text shadow so the HUD remains readable over the maze without
  // needing a background plate that would cover gameplay.
  const text = (str, x, y, align) => {
    ctx.textAlign = align;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = "#e6edf3";
    ctx.fillText(str, x, y);
  };

  text(`Time ${_stats.time.toFixed(1)}s`, 12, 22, "start");
  text(`Level ${_levelIdx + 1} / ${LEVELS.length}`, W - 12, 22, "end");

  // Smaller secondary line for deaths + coin progress; right-aligned under
  // the level so it doesn't intrude on the top-left timer.
  ctx.font = "11px ui-monospace, monospace";
  text(
    `Deaths ${_stats.deaths}   Coins ${_stats.coinsGot}/${_stats.coinsTotal}`,
    W - 12, 40, "end",
  );

  // Start-state hint — pulsing ring at the maze centre plus a short call to
  // action below the timer so the player knows what to do.
  if (_awaitingStart) {
    const pulse = 1 + 0.12 * Math.sin(performance.now() / 220);
    ctx.save();
    ctx.beginPath();
    ctx.arc(_tiltCx, _tiltCy, START_RADIUS * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(88,166,255,0.10)";
    ctx.fill();
    ctx.strokeStyle = "rgba(140,196,255,0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.restore();
    ctx.font = "bold 16px ui-monospace, monospace";
    text("Click here to start", _tiltCx, _tiltCy + 4, "center");
  }

  // Completion banner
  if (_stats.complete) {
    const alpha = Math.min(1, _winFlash / 600);
    ctx.fillStyle = `rgba(63,185,80,${0.25 + 0.35 * alpha})`;
    ctx.fillRect(0, H / 2 - 40, W, 80);
    ctx.fillStyle = "#0d141c";
    ctx.font = "bold 24px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("Course complete!", W / 2, H / 2 + 8);
    ctx.textAlign = "start";
  }

  // Hit flash overlay
  if (_hitFlash > 0) {
    const a = (_hitFlash / 600) * 0.35;
    ctx.fillStyle = `rgba(248,81,73,${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}
