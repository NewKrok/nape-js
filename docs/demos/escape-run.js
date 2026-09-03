import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, CbEvent, InteractionType, InteractionListener,
  buildTilemapBody,
} from "../nape-js.esm.js?v=3.40.0";

// ---------------------------------------------------------------------------
// Escape Run — homage to the Warcraft 3 custom-map "escape" genre
// (Run Kitty Run, Impossible Escape, …). One touch from a patrol kills;
// checkpoints are circles of power; the exit portal waits behind a locked
// gate whose key is guarded in a dead-end alcove.
//
// Four sections, one loop around the map:
//   1. Patrol Hall   — weave down between sweeping blades
//   2. Gate Run      — timed portcullises that crush the slow
//   3. Frozen Ascent — ice floor: you steer, the ice decides
//   4. Crusher Row   — kinematic pistons shove you into lava; key + gate
// ---------------------------------------------------------------------------

const TILE = 50;
const MAP_COLS = 36;
const MAP_ROWS = 20;
const WORLD_W = MAP_COLS * TILE; // 1800
const WORLD_H = MAP_ROWS * TILE; // 1000

// Tile legend: '#' wall · '.' floor · 'I' ice floor · 'L' lava (deadly floor).
// Gates, patrols, pistons, checkpoints, key and exit are pixel-space bodies
// defined in the data tables below — the map only carries static terrain.
const MAP = [
  "####################################",
  "#.....#...........LL..LL..LL.......#",
  "#.....#............................#",
  "#.....#.......................##III#",
  "#..####.......................IIIII#",
  "#.....#######...##LL##LL##LL##IIIII#",
  "#.....#######...##############III###",
  "####..#######...##############IIIII#",
  "#.....#######...##############IIIII#",
  "#.....##########################III#",
  "#..###########################IIIII#",
  "#.....########################IIIII#",
  "#.....########################III###",
  "####..########################IIIII#",
  "#.....########################IIIII#",
  "#..................................#",
  "#..................................#",
  "#..................................#",
  "#..................................#",
  "####################################",
];

// Progression order matters: dying returns you to the LAST one touched.
// Grid coords; world position is the tile centre.
const CHECKPOINTS = [
  { gx: 3, gy: 2, hint: "Slip past the patrols — reach the first circle of power" },
  { gx: 3, gy: 17, hint: "Time the gates — sprint through while they are raised" },
  { gx: 32, gy: 17, hint: "The ice gives no grip — drift the switchbacks" },
  { gx: 32, gy: 2, hint: "Crushers ahead — steal the key from its guardian" },
];
const HINT_KEYED = "The gate is open — run for the portal!";
const CHECKPOINT_R = 26;

const EXIT_POS = { x: 8 * TILE + 25, y: 2 * TILE + 25 };
const EXIT_R = 30;

const KEY_POS = { x: 14 * TILE + 25, y: 385 };
const KEY_R = 16;

// Locked gate before the exit chamber (opens when the key is picked up).
const DOOR_RECT = { x: 525, y: 150, w: 16, h: 200 };

// ── Patrols ──────────────────────────────────────────────────────────────
// type "line":  ping-pongs between (x0,y0) and (x1,y1); `period` is seconds
//               for a full out-and-back.
// type "orbit": circles (cx,cy) at radius r; `dir` sets spin direction.
// Positions are driven analytically from the section clock, so patrols are
// perfectly periodic and deterministic — the player learns the rhythm.
const PATROLS = [
  // Section 1 — Patrol Hall (horizontal sweeps between the wall stubs)
  { type: "line", x0: 75, y0: 300, x1: 275, y1: 300, period: 2.6, phase: 0.0, r: 14 },
  { type: "line", x0: 75, y0: 450, x1: 275, y1: 450, period: 2.2, phase: 0.5, r: 14 },
  { type: "line", x0: 75, y0: 600, x1: 275, y1: 600, period: 2.6, phase: 0.25, r: 14 },
  { type: "line", x0: 75, y0: 725, x1: 275, y1: 725, period: 2.0, phase: 0.7, r: 14 },
  // Section 2 — Gate Run (orbits between the portcullises)
  { type: "orbit", cx: 425, cy: 850, r: 15, orbitR: 62, period: 3.0, phase: 0.0, dir: 1 },
  { type: "orbit", cx: 725, cy: 850, r: 15, orbitR: 62, period: 2.6, phase: 0.3, dir: -1 },
  { type: "line", x0: 1025, y0: 780, x1: 1025, y1: 920, period: 1.8, phase: 0.0, r: 14 },
  { type: "orbit", cx: 1325, cy: 850, r: 15, orbitR: 62, period: 2.8, phase: 0.6, dir: 1 },
  // Section 3 — Frozen Ascent (sweeps you must drift around)
  { type: "line", x0: 1522, y0: 700, x1: 1728, y1: 700, period: 2.4, phase: 0.0, r: 14 },
  { type: "line", x0: 1522, y0: 550, x1: 1728, y1: 550, period: 2.0, phase: 0.5, r: 14 },
  { type: "line", x0: 1522, y0: 400, x1: 1728, y1: 400, period: 2.4, phase: 0.25, r: 14 },
  { type: "orbit", cx: 1625, cy: 250, r: 14, orbitR: 52, period: 2.4, phase: 0.0, dir: -1 },
  // Section 4 — Crusher Row (door sentry + key guardian)
  { type: "line", x0: 625, y0: 80, x1: 625, y1: 220, period: 1.6, phase: 0.0, r: 14 },
  { type: "orbit", cx: 725, cy: 350, r: 12, orbitR: 45, period: 2.8, phase: 0.0, dir: 1 },
];

// ── Timed portcullises (Section 2) ───────────────────────────────────────
// Each gate cycles open → warning blink → closed. Closing on top of the
// player kills ("crushed"). While closed the gate is a solid static body.
const GATES = [
  { x: 575, y: 850, phase: 0.0 },
  { x: 875, y: 850, phase: 1.33 },
  { x: 1175, y: 850, phase: 2.67 },
];
const GATE_W = 16;
const GATE_H = 200;
const GATE_PERIOD = 4.0; // seconds for a full open+closed cycle
const GATE_OPEN = 2.2;   // seconds of the cycle spent open
const GATE_WARN = 0.7;   // final seconds of the open phase blink a warning

// ── Crusher pistons (Section 4) ──────────────────────────────────────────
// Kinematic 100×100 blocks oscillating vertically across the corridor.
// They push with real contacts — get caught on the moving side and you are
// shoved into the lava strip above or the lava pocket below.
const PISTONS = [
  { cx: 950, phase: 0.0 },
  { cx: 1150, phase: 0.33 },
  { cx: 1350, phase: 0.66 },
];
const PISTON_SIZE = 100;
const PISTON_MID = 175;  // corridor mid-line the piston oscillates around
const PISTON_AMP = 75;   // ±75px → sweeps y 100 (rows 1-2) … 250 (rows 4-5)
const PISTON_PERIOD = 3.2;

// Lava sensor rects (match the 'L' tiles): strips along the top wall and
// pockets under each piston's low position.
const LAVA_RECTS = [
  { x: 900, y: 50, w: 100, h: 50 }, { x: 1100, y: 50, w: 100, h: 50 }, { x: 1300, y: 50, w: 100, h: 50 },
  { x: 900, y: 250, w: 100, h: 50 }, { x: 1100, y: 250, w: 100, h: 50 }, { x: 1300, y: 250, w: 100, h: 50 },
];

// ── Player ───────────────────────────────────────────────────────────────
const PLAYER_R = 12;
const PLAYER_SPEED = 195;
const STEER_NORMAL = 0.45; // per-frame velocity lerp on stone
const STEER_ICE = 0.035;   // on ice: barely any grip — you drift
const INVULN_FRAMES = 60;  // grace after respawn so a lingering blade can't chain-kill

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
let _player = null;
let _wallBody = null;
let _doorBody = null;
let _keyBody = null;
let _patrolBodies = [];   // parallel to PATROLS
let _gateBodies = [];     // parallel to GATES
let _gateClosed = [];     // current solid state per gate
let _pistonBodies = [];   // parallel to PISTONS

let _cbPlayer = null;
let _cbDeadly = null;
let _cbCheckpoint = null;
let _cbKey = null;
let _cbExit = null;

let _time = 0;            // running clock (seconds) — drives every hazard
let _runTime = 0;         // stopwatch shown on the HUD
let _started = false;     // stopwatch starts on the first movement input
let _deaths = 0;
let _checkpointIdx = 0;   // last checkpoint reached (respawn target)
let _hasKey = false;
let _complete = false;
let _invuln = 0;
let _deathFlash = 0;      // frames of red overlay after dying
let _cpFlash = 0;         // frames of green pulse after a new checkpoint
let _keyFlash = 0;        // frames of gold pulse after grabbing the key

const _keys = Object.create(null);
let _onKeyDown = null;
let _onKeyUp = null;
let _pointerActive = false;
let _pointerPos = { x: 0, y: 0 };

// Listener callbacks fire mid-step, when the space can't be mutated — queue
// consequences here and drain them from step().
const _pending = { die: false, checkpoint: -1, key: false, exit: false, reset: false };

// ---------------------------------------------------------------------------
// Tile helpers
// ---------------------------------------------------------------------------

function tileAt(x, y) {
  const gx = Math.floor(x / TILE);
  const gy = Math.floor(y / TILE);
  if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) return "#";
  return MAP[gy][gx];
}

function cpWorld(cp) {
  return { x: cp.gx * TILE + TILE / 2, y: cp.gy * TILE + TILE / 2 };
}

// ---------------------------------------------------------------------------
// Analytic patrol motion — perfectly periodic, no drift.
// ---------------------------------------------------------------------------

function patrolPos(p, t) {
  if (p.type === "orbit") {
    const a = p.dir * Math.PI * 2 * (t / p.period + p.phase);
    return { x: p.cx + Math.cos(a) * p.orbitR, y: p.cy + Math.sin(a) * p.orbitR };
  }
  // Triangle wave 0→1→0 over one period gives constant-speed ping-pong.
  let f = (t / p.period + p.phase) % 1;
  if (f < 0) f += 1;
  const k = f < 0.5 ? f * 2 : 2 - f * 2;
  return { x: p.x0 + (p.x1 - p.x0) * k, y: p.y0 + (p.y1 - p.y0) * k };
}

function pistonY(p, t) {
  return PISTON_MID + PISTON_AMP * Math.sin(Math.PI * 2 * (t / PISTON_PERIOD + p.phase));
}

// Gate cycle: [0, GATE_OPEN) open, [GATE_OPEN, GATE_PERIOD) closed.
function gatePhase(g, t) {
  let f = (t + g.phase) % GATE_PERIOD;
  if (f < 0) f += GATE_PERIOD;
  return f;
}
function gateIsClosed(g, t) { return gatePhase(g, t) >= GATE_OPEN; }
function gateWarning(g, t) {
  const f = gatePhase(g, t);
  return f >= GATE_OPEN - GATE_WARN && f < GATE_OPEN;
}

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

function buildWorld(space) {
  // Walls — one static tilemap body, greedily merged into few boxes.
  const grid = MAP.map((row) => [...row].map((c) => (c === "#" ? 1 : 0)));
  _wallBody = buildTilemapBody(grid, { tileSize: TILE, merge: "greedy" });
  try { _wallBody.userData._colorIdx = 4; } catch (_) {}
  _wallBody.space = space;

  // Lava — one static sensor body carrying every deadly floor rect.
  const lava = new Body(BodyType.STATIC, new Vec2(0, 0));
  for (const r of LAVA_RECTS) {
    const s = new Polygon(Polygon.rect(r.x, r.y, r.w, r.h));
    s.sensorEnabled = true;
    s.cbTypes.add(_cbDeadly);
    lava.shapes.add(s);
  }
  lava.userData._colorIdx = 3;
  lava.userData._isZone = true;
  lava.space = space;

  // Checkpoints — sensor circles of power.
  for (let i = 0; i < CHECKPOINTS.length; i++) {
    const { x, y } = cpWorld(CHECKPOINTS[i]);
    const b = new Body(BodyType.STATIC, new Vec2(x, y));
    const s = new Circle(CHECKPOINT_R);
    s.sensorEnabled = true;
    s.cbTypes.add(_cbCheckpoint);
    b.shapes.add(s);
    b.userData._cpIdx = i;
    b.userData._colorIdx = 2;
    b.userData._isZone = true;
    b.space = space;
  }

  // Exit portal.
  const exit = new Body(BodyType.STATIC, new Vec2(EXIT_POS.x, EXIT_POS.y));
  const exitShape = new Circle(EXIT_R);
  exitShape.sensorEnabled = true;
  exitShape.cbTypes.add(_cbExit);
  exit.shapes.add(exitShape);
  exit.userData._colorIdx = 2;
  exit.userData._isZone = true;
  exit.space = space;

  // Key.
  _keyBody = new Body(BodyType.STATIC, new Vec2(KEY_POS.x, KEY_POS.y));
  const keyShape = new Circle(KEY_R);
  keyShape.sensorEnabled = true;
  keyShape.cbTypes.add(_cbKey);
  _keyBody.shapes.add(keyShape);
  _keyBody.userData._colorIdx = 1;
  _keyBody.userData._isZone = true;
  _keyBody.space = space;

  // Locked gate before the exit.
  _doorBody = new Body(BodyType.STATIC, new Vec2(DOOR_RECT.x, DOOR_RECT.y));
  _doorBody.shapes.add(new Polygon(Polygon.box(DOOR_RECT.w, DOOR_RECT.h)));
  _doorBody.userData._colorIdx = 1;
  _doorBody.space = space;

  // Patrols — kinematic sensor blades, positions driven from step().
  _patrolBodies = PATROLS.map((p) => {
    const pos = patrolPos(p, 0);
    const b = new Body(BodyType.KINEMATIC, new Vec2(pos.x, pos.y));
    const s = new Circle(p.r);
    s.sensorEnabled = true;
    s.cbTypes.add(_cbDeadly);
    b.shapes.add(s);
    b.userData._colorIdx = 3;
    b.space = space;
    return b;
  });

  // Timed portcullises — solid static bodies toggled in and out of the space.
  _gateBodies = GATES.map((g) => {
    const b = new Body(BodyType.STATIC, new Vec2(g.x, g.y));
    b.shapes.add(new Polygon(Polygon.box(GATE_W, GATE_H)));
    b.userData._colorIdx = 1;
    return b;
  });
  _gateClosed = GATES.map(() => false);

  // Crusher pistons — kinematic, velocity-driven so contacts really push.
  _pistonBodies = PISTONS.map((p) => {
    const b = new Body(BodyType.KINEMATIC, new Vec2(p.cx, pistonY(p, 0)));
    b.shapes.add(new Polygon(Polygon.box(PISTON_SIZE, PISTON_SIZE)));
    b.userData._colorIdx = 3;
    b.space = space;
    return b;
  });

  // Player — the kitty. Bullet-flagged so a fast piston can't tunnel past it.
  const spawn = cpWorld(CHECKPOINTS[0]);
  _player = new Body(BodyType.DYNAMIC, new Vec2(spawn.x, spawn.y));
  const ps = new Circle(PLAYER_R, undefined, new Material(0, 0.05, 0.05, 1.5));
  ps.cbTypes.add(_cbPlayer);
  _player.shapes.add(ps);
  _player.allowRotation = false;
  _player.isBullet = true;
  _player.userData._colorIdx = 0;
  _player.space = space;
}

function respawn() {
  const { x, y } = cpWorld(CHECKPOINTS[_checkpointIdx]);
  _player.position = new Vec2(x, y);
  _player.velocity = new Vec2(0, 0);
  _invuln = INVULN_FRAMES;
}

function resetRun() {
  _time = 0;
  _runTime = 0;
  _started = false;
  _deaths = 0;
  _checkpointIdx = 0;
  _complete = false;
  _invuln = 0;
  _deathFlash = 0;
  _cpFlash = 0;
  _keyFlash = 0;
  if (_hasKey) {
    _hasKey = false;
    if (_keyBody && !_keyBody.space) _keyBody.space = _space;
    if (_doorBody && !_doorBody.space) _doorBody.space = _space;
  }
  respawn();
  _invuln = 0;
}

// ---------------------------------------------------------------------------
// Movement input
// ---------------------------------------------------------------------------

function moveDir() {
  let x = 0, y = 0;
  if (_keys["KeyW"] || _keys["ArrowUp"]) y -= 1;
  if (_keys["KeyS"] || _keys["ArrowDown"]) y += 1;
  if (_keys["KeyA"] || _keys["ArrowLeft"]) x -= 1;
  if (_keys["KeyD"] || _keys["ArrowRight"]) x += 1;
  if (x === 0 && y === 0 && _pointerActive && _player) {
    const dx = _pointerPos.x - _player.position.x;
    const dy = _pointerPos.y - _player.position.y;
    const d = Math.hypot(dx, dy);
    if (d > 18) { x = dx / d; y = dy / d; }
  }
  const len = Math.hypot(x, y);
  if (len > 0) { x /= len; y /= len; }
  return { x, y };
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "escape-run",
  label: "Escape Run",
  tags: ["Gameplay", "Sensor", "Kinematic", "Camera", "Mobile", "Maze"],
  desc:
    "Homage to the Warcraft 3 <b>escape map</b> genre (<i>Run Kitty Run</i> and friends): " +
    "one touch from a patrol kills, checkpoints are circles of power, deaths are unlimited " +
    "— only the clock judges you. Weave the <b>Patrol Hall</b>, sprint the timed " +
    "portcullises of the <b>Gate Run</b>, drift the frictionless <b>Frozen Ascent</b>, " +
    "then survive <b>Crusher Row</b>, where kinematic pistons shove you into lava, to " +
    "steal the key and reach the exit portal. Move with <b>WASD</b>/arrows — or <b>hold</b> " +
    "the pointer to steer on any device. <b>R</b> restarts the run. Patrols are " +
    "sensor-only kinematic bodies on analytic paths, gates toggle in and out of the " +
    "Space, pistons push with real kinematic contacts, and the ice is just a lower " +
    "steering lerp — one <code>InteractionListener</code> per game rule.",
  walls: false,
  workerCompatible: false,

  camera: null,

  setup(space, W, H) {
    _space = space;
    space.gravity = new Vec2(0, 0);

    _time = 0;
    _runTime = 0;
    _started = false;
    _deaths = 0;
    _checkpointIdx = 0;
    _hasKey = false;
    _complete = false;
    _invuln = 0;
    _deathFlash = 0;
    _cpFlash = 0;
    _keyFlash = 0;
    _pointerActive = false;
    for (const k in _keys) delete _keys[k];
    _pending.die = false;
    _pending.checkpoint = -1;
    _pending.key = false;
    _pending.exit = false;
    _pending.reset = false;

    _cbPlayer = new CbType();
    _cbDeadly = new CbType();
    _cbCheckpoint = new CbType();
    _cbKey = new CbType();
    _cbExit = new CbType();

    buildWorld(space);

    // Camera follows the kitty across the 1800×1000 dungeon.
    this.camera = {
      follow: () => ({ x: _player.position.x, y: _player.position.y }),
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.16,
    };

    // Touching anything deadly (patrol blade, lava) → die at the last
    // checkpoint. ONGOING as well as BEGIN: if the overlap starts during
    // the respawn grace frames, BEGIN alone would never re-fire and the
    // player could stand in lava unharmed.
    const onDeadly = () => {
      if (_complete || _invuln > 0) return;
      _pending.die = true;
    };
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbDeadly, _cbPlayer, onDeadly,
    ));
    space.listeners.add(new InteractionListener(
      CbEvent.ONGOING, InteractionType.SENSOR, _cbDeadly, _cbPlayer, onDeadly,
    ));

    // Circle of power → advance the respawn point (never regress).
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbCheckpoint, _cbPlayer,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        const cp = b1?.userData?._cpIdx !== undefined ? b1 : b2;
        const idx = cp?.userData?._cpIdx;
        if (idx !== undefined && idx > _checkpointIdx) _pending.checkpoint = idx;
      },
    ));

    // Key pickup → the locked gate rumbles open.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbKey, _cbPlayer,
      () => { if (!_hasKey) _pending.key = true; },
    ));

    // Exit portal → run complete.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbExit, _cbPlayer,
      () => { if (!_complete) _pending.exit = true; },
    ));

    // Keyboard — window-scoped, guarded against firing after teardown.
    _onKeyDown = (e) => {
      if (!_space) return;
      _keys[e.code] = true;
      if (e.code === "KeyR") _pending.reset = true;
    };
    _onKeyUp = (e) => {
      if (!_space) return;
      _keys[e.code] = false;
    };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
    void W; void H;
  },

  step(space) {
    const dt = 1 / 60;

    // Drain queued listener consequences first (space is mutable here).
    if (_pending.reset) {
      _pending.reset = false;
      _pending.die = false;
      _pending.checkpoint = -1;
      _pending.key = false;
      _pending.exit = false;
      resetRun();
    }
    if (_pending.checkpoint >= 0) {
      _checkpointIdx = _pending.checkpoint;
      _pending.checkpoint = -1;
      _cpFlash = 40;
    }
    if (_pending.key) {
      _pending.key = false;
      _hasKey = true;
      _keyFlash = 50;
      if (_keyBody?.space) _keyBody.space = null;
      if (_doorBody?.space) _doorBody.space = null;
    }
    if (_pending.exit) {
      _pending.exit = false;
      _complete = true;
      _player.velocity = new Vec2(0, 0);
    }
    if (_pending.die) {
      _pending.die = false;
      if (!_complete && _invuln <= 0) {
        _deaths++;
        _deathFlash = 30;
        respawn();
      }
    }

    if (_invuln > 0) _invuln--;
    if (_deathFlash > 0) _deathFlash--;
    if (_cpFlash > 0) _cpFlash--;
    if (_keyFlash > 0) _keyFlash--;

    // The hazard clock never stops — patrols keep their rhythm even on the
    // victory screen, exactly like a WC3 map still ticking behind the banner.
    _time += dt;

    // Patrol blades — analytic positions, zero drift.
    for (let i = 0; i < PATROLS.length; i++) {
      const pos = patrolPos(PATROLS[i], _time);
      const b = _patrolBodies[i];
      b.position = new Vec2(pos.x, pos.y);
      b.velocity = new Vec2(0, 0);
    }

    // Pistons — velocity-tracked toward the analytic target so their
    // contacts genuinely push the player.
    for (let i = 0; i < PISTONS.length; i++) {
      const b = _pistonBodies[i];
      const targetY = pistonY(PISTONS[i], _time + dt);
      b.velocity = new Vec2(0, (targetY - b.position.y) / dt);
    }

    // Portcullises — toggle solid state; closing on the player crushes.
    for (let i = 0; i < GATES.length; i++) {
      const closed = gateIsClosed(GATES[i], _time);
      if (closed && !_gateClosed[i]) {
        const g = GATES[i];
        const px = _player.position.x, py = _player.position.y;
        if (
          Math.abs(px - g.x) < GATE_W / 2 + PLAYER_R &&
          Math.abs(py - g.y) < GATE_H / 2 + PLAYER_R
        ) {
          if (!_complete && _invuln <= 0) {
            _deaths++;
            _deathFlash = 30;
            respawn();
          }
        }
        _gateBodies[i].space = space;
      } else if (!closed && _gateClosed[i]) {
        _gateBodies[i].space = null;
      }
      _gateClosed[i] = closed;
    }

    // Player steering — the ice only changes how much of your intent lands.
    if (!_complete) {
      const dir = moveDir();
      if (!_started && (dir.x !== 0 || dir.y !== 0)) _started = true;
      const onIce = tileAt(_player.position.x, _player.position.y) === "I";
      const k = onIce ? STEER_ICE : STEER_NORMAL;
      const v = _player.velocity;
      _player.velocity = new Vec2(
        v.x + (dir.x * PLAYER_SPEED - v.x) * k,
        v.y + (dir.y * PLAYER_SPEED - v.y) * k,
      );
      if (_started) _runTime += dt;
    } else {
      _player.velocity = new Vec2(0, 0);
    }
  },

  // Hold-to-steer pointer controls (mobile parity with WASD).
  click(x, y) {
    if (_complete) { _pending.reset = true; return; }
    _pointerActive = true;
    _pointerPos = { x, y };
  },
  drag(x, y) {
    _pointerPos = { x, y };
  },
  release() {
    _pointerActive = false;
  },

  // ---- Canvas2D rendering — camera-transformed world ----
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);

    // Dungeon floor.
    ctx.fillStyle = "#0b0a10";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    drawFloor(ctx);
    drawWalls(ctx);
    drawGates(ctx);
    drawDoor(ctx);
    drawPistons(ctx);
    drawPatrols(ctx);
    drawKitty(ctx);

    ctx.restore();
    void space; void W; void H; void showOutlines;
  },

  // World-space gameplay overlays + screen-space HUD — runs in ALL render
  // modes (the canvas2d adapter calls it after render(), the pixijs/threejs
  // adapters call it after their body rendering).
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    for (let i = 0; i < CHECKPOINTS.length; i++) drawCircleOfPower(ctx, i);
    drawExitPortal(ctx);
    drawKey(ctx);
    drawGateWarnings(ctx);
    ctx.restore();

    drawHud(ctx, W, H);
    void space;
  },
};

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawFloor(ctx) {
  ctx.save();
  const now = performance.now();
  for (let gy = 0; gy < MAP_ROWS; gy++) {
    for (let gx = 0; gx < MAP_COLS; gx++) {
      const c = MAP[gy][gx];
      if (c === "#") continue;
      const x = gx * TILE, y = gy * TILE;
      if (c === "I") {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? "#1c3347" : "#1a2f42";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = "rgba(150,210,255,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + TILE - 10);
        ctx.lineTo(x + TILE - 12, y + 8);
        ctx.stroke();
      } else if (c === "L") {
        const glow = 0.75 + 0.25 * Math.sin(now / 300 + gx * 1.7 + gy);
        ctx.fillStyle = `rgba(196,60,18,${glow})`;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = `rgba(255,170,40,${0.35 * glow})`;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.22 + 3 * Math.sin(now / 210 + gx * 2.3), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? "#16141f" : "#141220";
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  ctx.restore();
}

function drawWalls(ctx) {
  if (!_wallBody) return;
  ctx.save();
  ctx.fillStyle = "#2c3040";
  ctx.strokeStyle = "#4a5068";
  ctx.lineWidth = 2;
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

function drawGates(ctx) {
  ctx.save();
  for (let i = 0; i < GATES.length; i++) {
    const g = GATES[i];
    const closed = _gateClosed[i];
    const top = g.y - GATE_H / 2;
    // Frame posts.
    ctx.fillStyle = "#3a4054";
    ctx.fillRect(g.x - 14, top - 8, 28, 8);
    ctx.fillRect(g.x - 14, top + GATE_H, 28, 8);
    if (closed) {
      // Portcullis bars.
      ctx.fillStyle = "#8a6d3b";
      ctx.fillRect(g.x - GATE_W / 2, top, GATE_W, GATE_H);
      ctx.strokeStyle = "#c9a45c";
      ctx.lineWidth = 2;
      for (let k = 0; k <= 4; k++) {
        const yy = top + (GATE_H / 4) * k;
        ctx.beginPath();
        ctx.moveTo(g.x - GATE_W / 2, yy);
        ctx.lineTo(g.x + GATE_W / 2, yy);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(g.x, top);
      ctx.lineTo(g.x, top + GATE_H);
      ctx.stroke();
    } else {
      // Raised — faint slot so the player can see where it will slam down.
      ctx.strokeStyle = "rgba(201,164,92,0.28)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(g.x - GATE_W / 2, top, GATE_W, GATE_H);
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

function drawGateWarnings(ctx) {
  // Blink drawn in the overlay pass so pixi/three modes see it too.
  ctx.save();
  for (let i = 0; i < GATES.length; i++) {
    const g = GATES[i];
    if (!gateWarning(g, _time)) continue;
    const blink = Math.sin(performance.now() / 60) > 0;
    if (!blink) continue;
    ctx.fillStyle = "rgba(248,81,73,0.35)";
    ctx.fillRect(g.x - GATE_W / 2 - 4, g.y - GATE_H / 2, GATE_W + 8, GATE_H);
  }
  ctx.restore();
}

function drawDoor(ctx) {
  if (!_doorBody?.space) return;
  ctx.save();
  const { x, y, w, h } = DOOR_RECT;
  ctx.fillStyle = "#6b5a2e";
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = "#d4b45e";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  // Lock badge.
  ctx.fillStyle = "#d4b45e";
  ctx.beginPath();
  ctx.arc(x, y - 6, 7, Math.PI, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#d4b45e";
  ctx.stroke();
  ctx.fillRect(x - 8, y - 6, 16, 16);
  ctx.fillStyle = "#3a3018";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPistons(ctx) {
  ctx.save();
  for (const b of _pistonBodies) {
    const p = b.position;
    const s = PISTON_SIZE;
    ctx.fillStyle = "#43364a";
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    ctx.strokeStyle = "#7a5f86";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
    // Spikes on the top and bottom faces — it crushes both ways.
    ctx.fillStyle = "#9b8aa5";
    for (let k = 0; k < 5; k++) {
      const sx = p.x - s / 2 + 10 + k * 20;
      ctx.beginPath();
      ctx.moveTo(sx - 6, p.y - s / 2);
      ctx.lineTo(sx, p.y - s / 2 - 9);
      ctx.lineTo(sx + 6, p.y - s / 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - 6, p.y + s / 2);
      ctx.lineTo(sx, p.y + s / 2 + 9);
      ctx.lineTo(sx + 6, p.y + s / 2);
      ctx.closePath();
      ctx.fill();
    }
    // Rune on the face.
    ctx.strokeStyle = "rgba(230,200,255,0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 14, p.y - 14, 28, 28);
  }
  ctx.restore();
}

function drawPatrols(ctx) {
  ctx.save();
  const spin = performance.now() / 150;
  for (let i = 0; i < _patrolBodies.length; i++) {
    const b = _patrolBodies[i];
    const r = PATROLS[i].r;
    const p = b.position;
    // Spinning blade ring.
    ctx.fillStyle = "#8f1d22";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8434a";
    for (let k = 0; k < 6; k++) {
      const a = spin + (Math.PI * 2 * k) / 6;
      const tipX = p.x + Math.cos(a) * (r + 7);
      const tipY = p.y + Math.sin(a) * (r + 7);
      const b1 = a + 0.45, b2 = a - 0.45;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(b1) * r * 0.85, p.y + Math.sin(b1) * r * 0.85);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(p.x + Math.cos(b2) * r * 0.85, p.y + Math.sin(b2) * r * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    // Glowing eye.
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawKitty(ctx) {
  if (!_player) return;
  const p = _player.position;
  const blink = _invuln > 0 && Math.floor(_invuln / 5) % 2 === 0;
  ctx.save();
  ctx.globalAlpha = blink ? 0.35 : 1;
  // Body.
  ctx.fillStyle = "#f3f0ea";
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8f877a";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Ears.
  for (const sx of [-1, 1]) {
    ctx.fillStyle = "#f3f0ea";
    ctx.beginPath();
    ctx.moveTo(p.x + sx * 4, p.y - PLAYER_R + 2);
    ctx.lineTo(p.x + sx * 10, p.y - PLAYER_R - 8);
    ctx.lineTo(p.x + sx * 11, p.y - PLAYER_R + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e8a7b3";
    ctx.beginPath();
    ctx.moveTo(p.x + sx * 6, p.y - PLAYER_R + 2);
    ctx.lineTo(p.x + sx * 9, p.y - PLAYER_R - 4);
    ctx.lineTo(p.x + sx * 9.5, p.y - PLAYER_R + 3);
    ctx.closePath();
    ctx.fill();
  }
  // Face.
  ctx.fillStyle = "#2b2b33";
  ctx.beginPath();
  ctx.arc(p.x - 4, p.y - 2, 1.8, 0, Math.PI * 2);
  ctx.arc(p.x + 4, p.y - 2, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8a7b3";
  ctx.beginPath();
  ctx.moveTo(p.x - 2.5, p.y + 3);
  ctx.lineTo(p.x + 2.5, p.y + 3);
  ctx.lineTo(p.x, p.y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCircleOfPower(ctx, idx) {
  const { x, y } = cpWorld(CHECKPOINTS[idx]);
  const reached = idx <= _checkpointIdx;
  const current = idx === _checkpointIdx;
  const now = performance.now();
  const pulse = current ? 1 + 0.07 * Math.sin(now / 260) : 1;
  ctx.save();
  const col = reached ? "63,185,80" : "110,130,170";
  ctx.strokeStyle = `rgba(${col},0.9)`;
  ctx.fillStyle = `rgba(${col},0.14)`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, CHECKPOINT_R * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, CHECKPOINT_R * 0.62 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  // Four slow-orbiting runes.
  const a0 = now / 1400;
  ctx.fillStyle = `rgba(${col},0.95)`;
  for (let k = 0; k < 4; k++) {
    const a = a0 + (Math.PI / 2) * k;
    const rx = x + Math.cos(a) * CHECKPOINT_R * 0.82;
    const ry = y + Math.sin(a) * CHECKPOINT_R * 0.82;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(a);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  // Fresh-checkpoint pulse.
  if (current && _cpFlash > 0) {
    ctx.strokeStyle = `rgba(63,185,80,${_cpFlash / 40})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, CHECKPOINT_R + (40 - _cpFlash) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExitPortal(ctx) {
  const now = performance.now();
  const pulse = 1 + 0.1 * Math.sin(now / 220);
  ctx.save();
  ctx.strokeStyle = "rgba(247,201,72,0.95)";
  ctx.fillStyle = "rgba(247,201,72,0.15)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(EXIT_POS.x, EXIT_POS.y, EXIT_R * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Star.
  ctx.fillStyle = "#f7c948";
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (Math.PI * k) / 5;
    const rr = k % 2 === 0 ? 12 : 5;
    const px = EXIT_POS.x + Math.cos(a) * rr;
    const py = EXIT_POS.y + Math.sin(a) * rr;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawKey(ctx) {
  if (_hasKey || !_keyBody) return;
  const now = performance.now();
  const bob = Math.sin(now / 340) * 4;
  const x = KEY_POS.x, y = KEY_POS.y + bob;
  ctx.save();
  ctx.strokeStyle = "#f7c948";
  ctx.fillStyle = "#f7c948";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  // Bow.
  ctx.beginPath();
  ctx.arc(x - 5, y, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  // Shaft + teeth.
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 12, y);
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + 8, y + 5);
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x + 12, y + 6);
  ctx.stroke();
  // Sparkle.
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 200);
  ctx.fillRect(x + 4, y - 12, 3, 3);
  ctx.restore();
}

function drawHud(ctx, W, H) {
  ctx.save();
  ctx.font = "bold 14px ui-monospace, monospace";
  const text = (str, x, y, align, color = "#e6edf3") => {
    ctx.textAlign = align;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  };

  text(`Time ${_runTime.toFixed(1)}s`, 12, 22, "start");
  text(`Deaths ${_deaths}`, 12, 42, "start", _deaths > 0 ? "#f85149" : "#e6edf3");
  text(
    _hasKey ? "Key ✓" : "Key —",
    W - 12, 22, "end",
    _hasKey ? "#f7c948" : "#8b949e",
  );

  // Objective hint.
  ctx.font = "12px ui-monospace, monospace";
  const hint = _complete
    ? ""
    : _hasKey ? HINT_KEYED : CHECKPOINTS[_checkpointIdx].hint;
  if (hint) text(hint, W / 2, H - 14, "center", "#9fb3c8");

  // Key-grab flash.
  if (_keyFlash > 0) {
    ctx.font = "bold 16px ui-monospace, monospace";
    text("The gate rumbles open…", W / 2, H / 2 - 60, "center", `rgba(247,201,72,${_keyFlash / 50})`);
  }

  // Death flash.
  if (_deathFlash > 0) {
    ctx.fillStyle = `rgba(248,81,73,${(_deathFlash / 30) * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Victory banner.
  if (_complete) {
    ctx.fillStyle = "rgba(13,17,23,0.78)";
    ctx.fillRect(0, H / 2 - 64, W, 128);
    ctx.fillStyle = "#3fb950";
    ctx.fillRect(0, H / 2 - 64, W, 3);
    ctx.fillRect(0, H / 2 + 61, W, 3);
    ctx.font = "bold 26px ui-monospace, monospace";
    text("YOU ESCAPED!", W / 2, H / 2 - 18, "center", "#3fb950");
    ctx.font = "bold 15px ui-monospace, monospace";
    text(
      `Time ${_runTime.toFixed(1)}s   ·   Deaths ${_deaths}`,
      W / 2, H / 2 + 12, "center",
    );
    ctx.font = "12px ui-monospace, monospace";
    text("Click or press R to run it again", W / 2, H / 2 + 40, "center", "#9fb3c8");
  }

  ctx.restore();
}
