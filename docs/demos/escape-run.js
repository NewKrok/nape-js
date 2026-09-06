import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, CbEvent, InteractionType, InteractionListener,
  buildTilemapBody,
} from "../nape-js.esm.js?v=3.42.0";

// ---------------------------------------------------------------------------
// Escape Run — homage to the Warcraft 3 custom-map "escape" genre
// (Run Kitty Run, Impossible Escape, …). One touch from a patrol kills;
// checkpoints are circles of power; the exit portal waits behind a gate whose
// key must be forged from three shards, one stashed off the fast line in each
// hazard section — so the loop cannot be run start-to-finish in one pass.
//
// Four sections, one loop around the map:
//   1. Patrol Hall   — interleaved counter-phase sweeps + a roaming stalker
//   2. Gate Run      — timed portcullises, punch-up spikes, crumbling plates
//   3. Frozen Ascent — ice floor: you steer, the ice decides; a stalker too
//   4. Crusher Row   — pistons shove you into lava or crush you flat; spikes
//
// Hazard vocabulary, cheapest to nastiest:
//   patrol   analytic path, perfectly periodic — learnable rhythm
//   gate     periodic solid body, toggled in/out of the Space
//   piston   kinematic contact that genuinely pushes you into lava
//   spike    periodic sensor, telegraphed before it can bite
//   plate    collapses under dwell time — punishes hesitation, re-forms on death
//   hunter   steers at you inside its aggro ring, but is slower than you
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
  "#.....#...........LL..LL..LL..LL...#",
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
  { gx: 3, gy: 2, hint: "Weave the sweeps — and the shard is BEHIND you, at the top of the hall" },
  { gx: 3, gy: 17, hint: "Gates, spikes and crumbling plates — do not stand still" },
  { gx: 32, gy: 17, hint: "The ice gives no grip — drift the switchbacks, a stalker hunts here" },
  { gx: 32, gy: 2, hint: "Crushers ahead — the last shard sits in the guarded alcove" },
];
const HINT_KEYED = "Key forged, gate open — run for the portal!";
const CHECKPOINT_R = 26;

const EXIT_POS = { x: 8 * TILE + 25, y: 2 * TILE + 25 };
const EXIT_R = 30;

// ── Key shards ───────────────────────────────────────────────────────────
// The gate takes three shards, one per hazard section, each parked off the
// fast line: you cannot run the loop once and leave. Every detour doubles
// back through hazards you already passed, which is the whole point.
const SHARDS = [
  { x: 275, y: 90, section: "Patrol Hall" },   // top of the hall, above the sweeps
  { x: 1600, y: 930, section: "Gate Run" },    // far corner past the last gate
  { x: 725, y: 385, section: "Crusher Row" },  // the old guarded alcove
];
const SHARD_R = 16;

// Locked gate before the exit chamber (opens once all shards are held).
const DOOR_RECT = { x: 525, y: 150, w: 16, h: 200 };

// ── Patrols ──────────────────────────────────────────────────────────────
// type "line":  ping-pongs between (x0,y0) and (x1,y1); `period` is seconds
//               for a full out-and-back.
// type "orbit": circles (cx,cy) at radius r; `dir` sets spin direction.
// Positions are driven analytically from the section clock, so patrols are
// perfectly periodic and deterministic — the player learns the rhythm.
const PATROLS = [
  // Section 1 — Patrol Hall. Two interleaved sweeps per corridor band at
  // opposite phase: the safe pocket is the moving gap between them, so you
  // cannot simply hug one wall and walk down.
  // Wide bands (cols 1-5). One blade per band, alternating direction, at a
  // deliberately awkward period ratio so the pattern takes several cycles to
  // repeat — you cannot ride one rhythm all the way down.
  //
  // A counter-phase PAIR inside one band was tried and measured as a wall:
  // two 28px blades in a 50px band leave less than a kitty's width between
  // them. Diagonal blades that CROSS bands do the same job safely — they
  // narrow the pocket without ever sealing it.
  { type: "line", x0: 75, y0: 285, x1: 275, y1: 285, period: 1.7, phase: 0.0, r: 14 },
  { type: "line", x0: 275, y0: 440, x1: 75, y1: 440, period: 1.45, phase: 0.35, r: 14 },
  { type: "line", x0: 75, y0: 600, x1: 275, y1: 600, period: 1.6, phase: 0.7, r: 14 },
  { type: "line", x0: 75, y0: 775, x1: 375, y1: 775, period: 1.8, phase: 0.2, r: 14 },
  // One diagonal drifter, in the middle band only. Three of them (one per
  // band) plus the band sweeps and the neck blades left NO standing-still
  // survival anywhere in the hall — measured under a second at every sampled
  // spot, which is past "hard" and into "unreadable".
  { type: "line", x0: 270, y0: 415, x1: 90, y1: 480, period: 2.9, phase: 0.15, r: 13 },
  // The serpentine's forced turns need care: a neck is only two tiles (100px)
  // wide, so a blade centred in it leaves 12px either side for a 24px kitty —
  // measured as a stand-still kill. These run lengthwise but hug ONE side of
  // the neck, leaving a real lane on the other: you commit to the far side and
  // time the pass, rather than waiting for a gap that never comes.
  { type: "line", x0: 68, y0: 470, x1: 68, y1: 580, period: 1.9, phase: 0.0, r: 13 },   // row10 neck, left lane
  { type: "line", x0: 282, y0: 620, x1: 282, y1: 730, period: 1.9, phase: 0.35, r: 13 }, // row13 neck, right lane
  { type: "line", x0: 218, y0: 320, x1: 218, y1: 430, period: 2.0, phase: 0.6, r: 13 },  // row7 neck, left lane
  { type: "line", x0: 132, y0: 175, x1: 132, y1: 285, period: 2.0, phase: 0.2, r: 13 },  // row4 neck, right lane
  // Section 2 — Gate Run. Orbits sit in front of each portcullis, so the
  // timing window is "gate open AND orbit clear", not just "gate open".
  { type: "orbit", cx: 425, cy: 850, r: 15, orbitR: 74, period: 2.2, phase: 0.0, dir: 1 },
  { type: "orbit", cx: 725, cy: 850, r: 15, orbitR: 74, period: 2.0, phase: 0.3, dir: -1 },
  { type: "line", x0: 1025, y0: 770, x1: 1025, y1: 930, period: 1.4, phase: 0.0, r: 14 },
  { type: "orbit", cx: 1325, cy: 850, r: 15, orbitR: 74, period: 2.1, phase: 0.6, dir: 1 },
  { type: "orbit", cx: 1075, cy: 875, r: 12, orbitR: 34, period: 1.6, phase: 0.5, dir: -1 },
  // Section 3 — Frozen Ascent. Sweeps you must drift around, plus a slow
  // orbit at the top of the switchbacks where grip is worst.
  { type: "line", x0: 1522, y0: 760, x1: 1728, y1: 760, period: 2.0, phase: 0.0, r: 14 },
  { type: "line", x0: 1650, y0: 675, x1: 1530, y1: 675, period: 1.9, phase: 0.4, r: 14 },
  { type: "line", x0: 1522, y0: 520, x1: 1728, y1: 520, period: 1.7, phase: 0.15, r: 14 },
  { type: "line", x0: 1728, y0: 400, x1: 1522, y1: 400, period: 1.9, phase: 0.55, r: 14 },
  { type: "orbit", cx: 1640, cy: 245, r: 14, orbitR: 44, period: 2.0, phase: 0.0, dir: -1 },
  { type: "orbit", cx: 1640, cy: 245, r: 12, orbitR: 22, period: 1.5, phase: 0.5, dir: 1 },
  // Section 4 — Crusher Row (door sentry + key guardian + shard alcoves)
  { type: "line", x0: 625, y0: 70, x1: 625, y1: 230, period: 1.3, phase: 0.0, r: 14 },
  { type: "orbit", cx: 725, cy: 350, r: 12, orbitR: 45, period: 2.2, phase: 0.0, dir: 1 },
  { type: "line", x0: 1480, y0: 215, x1: 1700, y1: 215, period: 1.8, phase: 0.2, r: 13 },
  { type: "orbit", cx: 1250, cy: 175, r: 12, orbitR: 42, period: 2.0, phase: 0.25, dir: -1 },
];

// ── Timed portcullises (Section 2) ───────────────────────────────────────
// Each gate cycles open → warning blink → closed. Closing on top of the
// player kills ("crushed"). While closed the gate is a solid static body.
const GATES = [
  { x: 575, y: 850, phase: 0.0 },
  { x: 875, y: 850, phase: 1.05 },
  { x: 1175, y: 850, phase: 2.1 },
  { x: 1475, y: 850, phase: 0.5 },
];
const GATE_W = 16;
const GATE_H = 200;
const GATE_PERIOD = 3.1; // seconds for a full open+closed cycle
const GATE_OPEN = 1.35;  // seconds of the cycle spent open
const GATE_WARN = 0.45;  // final seconds of the open phase blink a warning

// ── Crusher pistons (Section 4) ──────────────────────────────────────────
// Kinematic 100×100 blocks oscillating vertically across the corridor.
// They push with real contacts — get caught on the moving side and you are
// shoved into the lava strip above or the lava pocket below.
//
// Geometry matters here. The corridor's free span is y 50…250 (rows 1-4), so
// its true mid-line is y=150 — and a 100px block travelling ±50px from there
// closes flush against each wall without ever entering it. Overshooting that
// (an earlier ±88 from a mid-line of 175) drove the block 13px into the wall
// above and 63px into the wall below, which let the solver squeeze a stalled
// player 26px INSIDE the wall and leave them alive in there. A flush close is
// the honest version: no room left means you are crushed, and CRUSH_MARGIN
// below turns that into a clean death rather than a wall-squeeze.
const PISTONS = [
  { cx: 950, phase: 0.0 },
  { cx: 1100, phase: 0.28 },
  { cx: 1250, phase: 0.56 },
  { cx: 1400, phase: 0.84 },
];
const PISTON_SIZE = 100;
const PISTON_MID = 150;  // true mid-line of the free corridor span (y 50…250)
const PISTON_AMP = 50;   // ±50px → the block closes flush on each wall
const PISTON_PERIOD = 2.3;

// Crush detection. A player with less than this much clearance between a
// piston face and the surface behind them is being crushed, not pushed — the
// piston kills instead of pressing them into geometry.
const CRUSH_MARGIN = 3;
const CORRIDOR_TOP = 50;   // y of the Crusher Row ceiling (row 0 / row 1 line)
const CORRIDOR_BOT = 250;  // y of its floor line (row 5)

// ── Hunters (Sections 1 & 3) ─────────────────────────────────────────────
// Unlike the analytic patrols, a hunter steers toward the player — but only
// while the player is inside `aggro`, and it is slower than the kitty. It
// always loses a straight footrace; it only kills you if you stall or let it
// cut a corner. Outside aggro it drifts home, so a section restart is clean.
const HUNTERS = [
  { home: { x: 175, y: 470 }, speed: 96, aggro: 175, r: 15 },   // Patrol Hall mid
  // Frozen Ascent. Toned down from speed 124 / aggro 260: on ice the player's
  // steering authority is a fraction of normal (STEER_ICE vs STEER_NORMAL), so
  // a leash that reads as "generous" on stone is nearly inescapable there —
  // you cannot turn out of it. Slower than the hall's stalker, and a shorter
  // leash, so there is always ice left to slide away across.
  { home: { x: 1625, y: 620 }, speed: 88, aggro: 165, r: 15 },  // Frozen Ascent
];
const HUNTER_TURN = 0.055;   // velocity lerp — a wide turning circle
const HUNTER_RETURN = 0.02;  // lazier lerp when drifting home

// ── Spike rows (Sections 2 & 4) ──────────────────────────────────────────
// Floor spikes that punch up on a cycle: retracted → telegraph → extended
// (deadly) → retracted. Telegraph is the fair part: the plate rattles for
// `SPIKE_TELL` seconds before anything can hurt you.
const SPIKES = [
  { x: 700, y: 800, w: 100, h: 34, phase: 0.0 },
  { x: 1000, y: 800, w: 100, h: 34, phase: 0.9 },
  { x: 1300, y: 900, w: 100, h: 34, phase: 1.8 },
  { x: 700, y: 250, w: 90, h: 34, phase: 0.6 },
  { x: 1250, y: 120, w: 90, h: 34, phase: 1.4 },
];
const SPIKE_PERIOD = 2.7;
const SPIKE_TELL = 0.55;  // rattle window before the spikes bite
const SPIKE_UP = 0.85;    // seconds spent extended and deadly

// ── Collapsing floor plates (Section 2) ──────────────────────────────────
// Step on one and it starts to crumble; after `PLATE_HOLD` seconds it drops
// out and the hole is deadly. They re-form on respawn, never mid-run, so a
// dithering player really can burn their own route away.
// Only two, and both deliberately clear of every other hazard. A plate
// promises "you have PLATE_HOLD seconds on this stone"; a blade sweeping over
// it breaks that promise and reads as an instant, unexplained death. The two
// big Gate Run orbits (x 425 and x 1325) each covered ~30% of a plate face,
// and the Gate Run is too crowded to fit a third plate anywhere clear.
const PLATES = [
  { x: 950, y: 895, w: 90, h: 90 },   // mid-corridor, between gates 2 and 3
  { x: 1580, y: 895, w: 90, h: 90 },  // on the run-up to the ice checkpoint
];
const PLATE_HOLD = 0.85;    // seconds of standing on it before it drops out
const PLATE_RECOVER = 0.5;  // dwell decays at half speed once you step off

// Lava sensor rects (match the 'L' tiles): strips along the top wall and
// pockets under each piston's low position.
const LAVA_RECTS = [
  { x: 900, y: 50, w: 100, h: 50 }, { x: 1100, y: 50, w: 100, h: 50 },
  { x: 1300, y: 50, w: 100, h: 50 }, { x: 1500, y: 50, w: 100, h: 50 },
  { x: 900, y: 250, w: 100, h: 50 }, { x: 1100, y: 250, w: 100, h: 50 },
  { x: 1300, y: 250, w: 100, h: 50 },
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
let _shardBodies = [];    // parallel to SHARDS
let _patrolBodies = [];   // parallel to PATROLS
let _gateBodies = [];     // parallel to GATES
let _gateClosed = [];     // current solid state per gate
let _pistonBodies = [];   // parallel to PISTONS
let _hunterBodies = [];   // parallel to HUNTERS
let _spikeBodies = [];    // parallel to SPIKES — sensors toggled in and out
let _spikeUp = [];        // current extended state per spike row
let _plateBodies = [];    // parallel to PLATES — solid floor while intact
let _plateHoleBodies = []; // deadly sensor revealed once a plate collapses
let _plateTouched = [];   // seconds of contact so far, or -1 once collapsed

let _cbPlayer = null;
let _cbDeadly = null;
let _cbCheckpoint = null;
let _cbShard = null;
let _cbExit = null;
let _cbPlate = null;

let _time = 0;            // running clock (seconds) — drives every hazard
let _runTime = 0;         // stopwatch shown on the HUD
let _started = false;     // stopwatch starts on the first movement input
let _deaths = 0;
let _checkpointIdx = 0;   // last checkpoint reached (respawn target)
let _shardsHeld = [];     // parallel to SHARDS
let _complete = false;
let _invuln = 0;
let _deathFlash = 0;      // frames of red overlay after dying
let _cpFlash = 0;         // frames of green pulse after a new checkpoint
let _keyFlash = 0;        // frames of gold pulse after grabbing a shard
let _plateOnNow = -1;     // plate index the player is standing on this step

const _keys = Object.create(null);
let _onKeyDown = null;
let _onKeyUp = null;
let _pointerActive = false;
let _pointerPos = { x: 0, y: 0 };

// Listener callbacks fire mid-step, when the space can't be mutated — queue
// consequences here and drain them from step().
const _pending = { die: false, checkpoint: -1, shard: -1, exit: false, reset: false };

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

// Spike cycle: [0, SPIKE_TELL) rattling tell, [SPIKE_TELL, +SPIKE_UP)
// extended and deadly, remainder retracted.
function spikePhase(sp, t) {
  let f = (t + sp.phase) % SPIKE_PERIOD;
  if (f < 0) f += SPIKE_PERIOD;
  return f;
}
function spikeIsUp(sp, t) {
  const f = spikePhase(sp, t);
  return f >= SPIKE_TELL && f < SPIKE_TELL + SPIKE_UP;
}
function spikeIsTelling(sp, t) { return spikePhase(sp, t) < SPIKE_TELL; }

// How far out of the floor the spikes stand, 0..1 — drives the drawing only.
function spikeExtension(sp, t) {
  const f = spikePhase(sp, t);
  if (f < SPIKE_TELL) return 0;
  const up = f - SPIKE_TELL;
  if (up < SPIKE_UP) return Math.min(1, up / 0.12);
  return Math.max(0, 1 - (up - SPIKE_UP) / 0.18);
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

  // Key shards — one sensor per shard, each tagged with its index.
  _shardBodies = SHARDS.map((sh, i) => {
    const b = new Body(BodyType.STATIC, new Vec2(sh.x, sh.y));
    const shape = new Circle(SHARD_R);
    shape.sensorEnabled = true;
    shape.cbTypes.add(_cbShard);
    b.shapes.add(shape);
    b.userData._shardIdx = i;
    b.userData._colorIdx = 1;
    b.userData._isZone = true;
    b.space = space;
    return b;
  });

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

  // Hunters — kinematic sensor stalkers, steered from step().
  _hunterBodies = HUNTERS.map((h) => {
    const b = new Body(BodyType.KINEMATIC, new Vec2(h.home.x, h.home.y));
    const shape = new Circle(h.r);
    shape.sensorEnabled = true;
    shape.cbTypes.add(_cbDeadly);
    b.shapes.add(shape);
    b.userData._colorIdx = 3;
    b.space = space;
    return b;
  });

  // Spike rows — deadly sensors toggled in and out of the Space so they only
  // exist while extended. Drawing reads the cycle directly.
  _spikeBodies = SPIKES.map((sp) => {
    const b = new Body(BodyType.STATIC, new Vec2(sp.x, sp.y));
    const shape = new Polygon(Polygon.box(sp.w, sp.h));
    shape.sensorEnabled = true;
    shape.cbTypes.add(_cbDeadly);
    b.shapes.add(shape);
    b.userData._colorIdx = 3;
    b.userData._isZone = true;
    return b;
  });
  _spikeUp = SPIKES.map(() => false);

  // Collapsing plates — this is a top-down map with no gravity, so "floor" is
  // tiles, not bodies: an intact plate is a harmless sensor that only reports
  // that you are standing on it, and collapsing swaps it for a deadly sensor.
  // Exactly one of each pair is in the Space at any time.
  _plateBodies = [];
  _plateHoleBodies = [];
  PLATES.forEach((pl, i) => {
    const solid = new Body(BodyType.STATIC, new Vec2(pl.x, pl.y));
    const ps2 = new Polygon(Polygon.box(pl.w, pl.h));
    ps2.sensorEnabled = true;
    ps2.cbTypes.add(_cbPlate);
    solid.shapes.add(ps2);
    solid.userData._plateIdx = i;
    solid.userData._colorIdx = 4;
    solid.userData._isZone = true;
    solid.space = space;
    _plateBodies.push(solid);

    const hole = new Body(BodyType.STATIC, new Vec2(pl.x, pl.y));
    const hs = new Polygon(Polygon.box(pl.w, pl.h));
    hs.sensorEnabled = true;
    hs.cbTypes.add(_cbDeadly);
    hole.shapes.add(hs);
    hole.userData._colorIdx = 3;
    hole.userData._isZone = true;
    _plateHoleBodies.push(hole);
  });
  _plateTouched = PLATES.map(() => 0);

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

  // Collapsed plates re-form, so a burnt route is never permanent — the
  // pressure is "do not dither *this* attempt", not a dead run.
  for (let i = 0; i < PLATES.length; i++) {
    _plateTouched[i] = 0;
    if (_plateHoleBodies[i]?.space) _plateHoleBodies[i].space = null;
    if (_plateBodies[i] && !_plateBodies[i].space) _plateBodies[i].space = _space;
  }

  // Hunters go back to their posts, so they cannot camp the checkpoint.
  for (let i = 0; i < HUNTERS.length; i++) {
    const h = HUNTERS[i];
    _hunterBodies[i].position = new Vec2(h.home.x, h.home.y);
    _hunterBodies[i].velocity = new Vec2(0, 0);
  }
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
  _shardsHeld = SHARDS.map(() => false);
  for (const b of _shardBodies) if (b && !b.space) b.space = _space;
  if (_doorBody && !_doorBody.space) _doorBody.space = _space;
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
    "one touch kills, checkpoints are circles of power, deaths are unlimited — only the " +
    "clock judges you. The exit gate takes <b>three key shards</b>, one stashed off the " +
    "fast line in each hazard section, so you cannot run the loop just once. Weave the " +
    "counter-timed sweeps of the <b>Patrol Hall</b> while a stalker paces its floor, " +
    "sprint the timed portcullises of the <b>Gate Run</b> between punch-up spikes and " +
    "flagstones that crumble if you hesitate on them, drift the frictionless " +
    "<b>Frozen Ascent</b>, then thread <b>Crusher Row</b>, where kinematic pistons shove " +
    "you into lava — or flatten you outright if you let one close on you. Move with <b>WASD</b>/arrows — or <b>hold</b> the pointer to steer on " +
    "any device. <b>R</b> restarts the run. Patrols are sensor-only kinematic bodies on " +
    "analytic paths, gates and spikes toggle in and out of the Space, pistons push with " +
    "real kinematic contacts, hunters steer at you inside an aggro ring but are slower " +
    "than you, and the ice is just a lower steering lerp — one " +
    "<code>InteractionListener</code> per game rule.",
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
    _shardsHeld = SHARDS.map(() => false);
    _complete = false;
    _invuln = 0;
    _deathFlash = 0;
    _cpFlash = 0;
    _keyFlash = 0;
    _pointerActive = false;
    for (const k in _keys) delete _keys[k];
    _pending.die = false;
    _pending.checkpoint = -1;
    _pending.shard = -1;
    _pending.exit = false;
    _pending.reset = false;
    _plateOnNow = -1;

    _cbPlayer = new CbType();
    _cbDeadly = new CbType();
    _cbCheckpoint = new CbType();
    _cbShard = new CbType();
    _cbExit = new CbType();
    _cbPlate = new CbType();

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

    // Shard pickup → tally it; the gate opens on the third.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbShard, _cbPlayer,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        const sh = b1?.userData?._shardIdx !== undefined ? b1 : b2;
        const idx = sh?.userData?._shardIdx;
        if (idx !== undefined && !_shardsHeld[idx]) _pending.shard = idx;
      },
    ));

    // Standing on a collapsing plate — ONGOING so step() can accumulate the
    // dwell time; the plate itself is harmless until it drops away.
    const onPlate = (cb) => {
      const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
      const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
      const pl = b1?.userData?._plateIdx !== undefined ? b1 : b2;
      const idx = pl?.userData?._plateIdx;
      if (idx !== undefined) _plateOnNow = idx;
    };
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbPlate, _cbPlayer, onPlate,
    ));
    space.listeners.add(new InteractionListener(
      CbEvent.ONGOING, InteractionType.SENSOR, _cbPlate, _cbPlayer, onPlate,
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
    if (_pending.shard >= 0) {
      const idx = _pending.shard;
      _pending.shard = -1;
      if (!_shardsHeld[idx]) {
        _shardsHeld[idx] = true;
        _keyFlash = 50;
        if (_shardBodies[idx]?.space) _shardBodies[idx].space = null;
        // Third shard forges the key and the gate grinds open.
        if (_shardsHeld.every(Boolean) && _doorBody?.space) _doorBody.space = null;
      }
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

    // Crush check. The pistons close flush against the corridor walls, so a
    // player still under a closing face has nowhere left to go. Rather than
    // let the solver press them into the wall (which it will, and they would
    // survive it), treat "no clearance left" as a death.
    if (
      !_complete && _invuln <= 0 &&
      // Scoped to the Crusher Row corridor. Without this the check fires on a
      // player standing anywhere in the piston's COLUMN — including the Gate
      // Run, 700px below, where plate 2 shares x=950 with piston 1. That read
      // as "the second plate sometimes kills me instantly".
      _player.position.y > CORRIDOR_TOP - PLAYER_R &&
      _player.position.y < CORRIDOR_BOT + PLAYER_R
    ) {
      const px = _player.position.x, py = _player.position.y;
      for (let i = 0; i < PISTONS.length; i++) {
        const b = _pistonBodies[i];
        const bx = b.position.x, by = b.position.y;
        // Only the column the player is actually in can crush them.
        if (Math.abs(px - bx) > PISTON_SIZE / 2 + PLAYER_R) continue;
        const half = PISTON_SIZE / 2;
        // Fire as soon as the shrinking pocket is too small to hold a kitty
        // AND the kitty is inside it — waiting until they touch the wall lets
        // the solver bury them a body-width deep first.
        if (py < by) {
          // Player above the block: the pocket runs ceiling → block face.
          const face = by - half;
          if (face - CORRIDOR_TOP < 2 * PLAYER_R + CRUSH_MARGIN && py < face) {
            _pending.die = true;
            break;
          }
        } else {
          // Player below the block: the pocket runs block face → floor.
          const face = by + half;
          if (CORRIDOR_BOT - face < 2 * PLAYER_R + CRUSH_MARGIN && py > face) {
            _pending.die = true;
            break;
          }
        }
      }
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

    // Spike rows — the sensor only exists while the spikes are actually out,
    // so the telegraph window is genuinely safe to stand in.
    for (let i = 0; i < SPIKES.length; i++) {
      const up = spikeIsUp(SPIKES[i], _time);
      if (up !== _spikeUp[i]) {
        _spikeBodies[i].space = up ? space : null;
        _spikeUp[i] = up;
      }
    }

    // Hunters — steer toward the player inside aggro range, else drift home.
    // Capped below PLAYER_SPEED and given a wide turning circle, so keeping
    // your feet moving always beats them.
    for (let i = 0; i < HUNTERS.length; i++) {
      const h = HUNTERS[i];
      const b = _hunterBodies[i];
      const p = b.position;
      const dx = _player.position.x - p.x;
      const dy = _player.position.y - p.y;
      const dist = Math.hypot(dx, dy);
      const chasing = !_complete && dist < h.aggro && dist > 1;
      const tx = chasing ? p.x + (dx / dist) * h.speed : h.home.x;
      const ty = chasing ? p.y + (dy / dist) * h.speed : h.home.y;
      let vx, vy;
      if (chasing) {
        vx = (tx - p.x); vy = (ty - p.y);
      } else {
        // Drift home; stop dead once there so it does not jitter on the post.
        const hx = h.home.x - p.x, hy = h.home.y - p.y;
        const hd = Math.hypot(hx, hy);
        if (hd < 4) { vx = 0; vy = 0; }
        else { vx = (hx / hd) * h.speed * 0.6; vy = (hy / hd) * h.speed * 0.6; }
      }
      const k = chasing ? HUNTER_TURN : HUNTER_RETURN;
      const v = b.velocity;
      b.velocity = new Vec2(v.x + (vx - v.x) * k, v.y + (vy - v.y) * k);
    }

    // Collapsing plates — _plateOnNow was set by the listeners during the
    // step that just ran; accumulate dwell and drop the plate when it expires.
    // Stepping off lets the stone settle again (slower than it crumbles), so a
    // plate you crossed earlier does not collapse the instant you touch it
    // again — that read as "it killed me with no warning".
    for (let i = 0; i < PLATES.length; i++) {
      if (_plateTouched[i] < 0) continue; // already collapsed
      if (_plateOnNow === i) {
        _plateTouched[i] += dt;
        if (_plateTouched[i] >= PLATE_HOLD) {
          _plateTouched[i] = -1;
          if (_plateBodies[i]?.space) _plateBodies[i].space = null;
          _plateHoleBodies[i].space = space;
        }
      } else if (_plateTouched[i] > 0) {
        _plateTouched[i] = Math.max(0, _plateTouched[i] - dt * PLATE_RECOVER);
      }
    }
    _plateOnNow = -1;

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
    drawPlates(ctx);
    drawWalls(ctx);
    drawGates(ctx);
    drawDoor(ctx);
    drawPistons(ctx);
    drawSpikes(ctx);
    drawPatrols(ctx);
    drawHunters(ctx);
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
    drawShards(ctx);
    drawGateWarnings(ctx);
    drawSpikeTells(ctx);
    drawPlateCracks(ctx);
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

    // Crush tell: shade whichever pocket has shrunk below survivable, so the
    // "you are about to be flattened" state is visible, not a surprise.
    const half = s / 2;
    const topPocket = (p.y - half) - CORRIDOR_TOP;
    const botPocket = CORRIDOR_BOT - (p.y + half);
    const lethal = 2 * PLAYER_R + CRUSH_MARGIN;
    ctx.fillStyle = "rgba(248,81,73,0.30)";
    if (topPocket < lethal && topPocket > 0) {
      ctx.fillRect(p.x - half, CORRIDOR_TOP, s, topPocket);
    }
    if (botPocket < lethal && botPocket > 0) {
      ctx.fillRect(p.x - half, p.y + half, s, botPocket);
    }
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

function drawShards(ctx) {
  const now = performance.now();
  for (let i = 0; i < SHARDS.length; i++) {
    if (_shardsHeld[i]) continue;
    const sh = SHARDS[i];
    const bob = Math.sin(now / 340 + i * 1.7) * 4;
    const x = sh.x, y = sh.y + bob;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(now / 900 + i);
    // Shard — a tapered crystal sliver.
    ctx.fillStyle = "#f7c948";
    ctx.strokeStyle = "rgba(255,240,190,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(7, -2);
    ctx.lineTo(0, 13);
    ctx.lineTo(-7, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Halo so it reads as a pickup from across the room.
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / 260 + i);
    ctx.strokeStyle = "#f7c948";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, SHARD_R + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSpikes(ctx) {
  ctx.save();
  for (const sp of SPIKES) {
    const ext = spikeExtension(sp, _time);
    const left = sp.x - sp.w / 2;
    // Base plate is always visible, so the hazard is never a surprise.
    ctx.fillStyle = "#241f2c";
    ctx.fillRect(left, sp.y - sp.h / 2, sp.w, sp.h);
    ctx.strokeStyle = "#4a4058";
    ctx.lineWidth = 2;
    ctx.strokeRect(left, sp.y - sp.h / 2, sp.w, sp.h);
    if (ext <= 0) continue;
    // Spikes rise from the plate centre-line.
    const n = Math.max(3, Math.round(sp.w / 22));
    const tipH = (sp.h / 2 + 10) * ext;
    ctx.fillStyle = "#cfd6e4";
    for (let k = 0; k < n; k++) {
      const cx = left + (sp.w / n) * (k + 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - 8, sp.y + sp.h / 2 - 4);
      ctx.lineTo(cx, sp.y + sp.h / 2 - 4 - tipH);
      ctx.lineTo(cx + 8, sp.y + sp.h / 2 - 4);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSpikeTells(ctx) {
  // Telegraph pulse — drawn in the overlay pass so pixi/three modes get it.
  ctx.save();
  for (const sp of SPIKES) {
    if (!spikeIsTelling(sp, _time)) continue;
    const f = spikePhase(sp, _time) / SPIKE_TELL; // 0→1 over the tell
    ctx.strokeStyle = `rgba(248,81,73,${0.35 + 0.5 * f})`;
    ctx.lineWidth = 2 + 2 * f;
    ctx.strokeRect(sp.x - sp.w / 2 - 3, sp.y - sp.h / 2 - 3, sp.w + 6, sp.h + 6);
    // Rising nubs hint at what is about to come up.
    ctx.fillStyle = `rgba(207,214,228,${0.25 + 0.35 * f})`;
    const n = Math.max(3, Math.round(sp.w / 22));
    for (let k = 0; k < n; k++) {
      const cx = sp.x - sp.w / 2 + (sp.w / n) * (k + 0.5);
      ctx.beginPath();
      ctx.arc(cx, sp.y, 2 + 2 * f, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPlates(ctx) {
  ctx.save();
  for (let i = 0; i < PLATES.length; i++) {
    const pl = PLATES[i];
    const left = pl.x - pl.w / 2, top = pl.y - pl.h / 2;
    if (_plateTouched[i] < 0) {
      // Collapsed — a lava-lit hole.
      const glow = 0.7 + 0.3 * Math.sin(performance.now() / 260 + i);
      ctx.fillStyle = "#0a0509";
      ctx.fillRect(left, top, pl.w, pl.h);
      ctx.fillStyle = `rgba(196,60,18,${0.55 * glow})`;
      ctx.fillRect(left + 6, top + 6, pl.w - 12, pl.h - 12);
      continue;
    }
    // Intact — a fitted flagstone, darkening as it crumbles.
    const wear = _plateTouched[i] / PLATE_HOLD;
    ctx.fillStyle = wear > 0 ? "#2a2233" : "#1e1a28";
    ctx.fillRect(left, top, pl.w, pl.h);
    ctx.strokeStyle = "#5b4a6b";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(left + 3, top + 3, pl.w - 6, pl.h - 6);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawPlateCracks(ctx) {
  // Crack growth + shake, in the overlay pass for pixi/three parity.
  ctx.save();
  for (let i = 0; i < PLATES.length; i++) {
    const t = _plateTouched[i];
    if (t <= 0) continue; // untouched or already collapsed
    const pl = PLATES[i];
    const wear = Math.min(1, t / PLATE_HOLD);
    const shake = wear * 2.5;
    const ox = (Math.random() - 0.5) * shake;
    const oy = (Math.random() - 0.5) * shake;
    ctx.strokeStyle = `rgba(248,81,73,${0.35 + 0.55 * wear})`;
    ctx.lineWidth = 1 + 2 * wear;
    // Three cracks spreading from the centre as the dwell time runs out.
    for (let k = 0; k < 3; k++) {
      const a = (Math.PI * 2 * k) / 3 + i;
      const len = (pl.w / 2) * wear;
      ctx.beginPath();
      ctx.moveTo(pl.x + ox, pl.y + oy);
      ctx.lineTo(
        pl.x + ox + Math.cos(a) * len,
        pl.y + oy + Math.sin(a) * len,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawHunters(ctx) {
  ctx.save();
  const now = performance.now();
  for (let i = 0; i < _hunterBodies.length; i++) {
    const b = _hunterBodies[i];
    const h = HUNTERS[i];
    const p = b.position;
    const dist = _player
      ? Math.hypot(_player.position.x - p.x, _player.position.y - p.y)
      : Infinity;
    const chasing = dist < h.aggro;
    // Aggro ring — the player can see exactly where the leash ends.
    ctx.globalAlpha = chasing ? 0.16 : 0.08;
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, h.aggro, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // Body — a hooded stalker; the cowl leans into its heading.
    const v = b.velocity;
    const head = Math.hypot(v.x, v.y) > 6 ? Math.atan2(v.y, v.x) : 0;
    ctx.fillStyle = chasing ? "#7a1d5a" : "#4a2144";
    ctx.beginPath();
    ctx.arc(p.x, p.y, h.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = chasing ? "#e0518f" : "#8b5a80";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cowl.
    ctx.fillStyle = chasing ? "#e0518f" : "#8b5a80";
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(head) * (h.r + 6), p.y + Math.sin(head) * (h.r + 6));
    ctx.lineTo(p.x + Math.cos(head + 2.4) * h.r * 0.9, p.y + Math.sin(head + 2.4) * h.r * 0.9);
    ctx.lineTo(p.x + Math.cos(head - 2.4) * h.r * 0.9, p.y + Math.sin(head - 2.4) * h.r * 0.9);
    ctx.closePath();
    ctx.fill();
    // Eyes — brighten and narrow when locked on.
    const eyeA = chasing ? 1 : 0.55;
    ctx.fillStyle = `rgba(255,209,102,${eyeA})`;
    for (const side of [-0.4, 0.4]) {
      const ex = p.x + Math.cos(head + side) * h.r * 0.5;
      const ey = p.y + Math.sin(head + side) * h.r * 0.5;
      ctx.beginPath();
      ctx.arc(ex, ey, chasing ? 2.6 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Alert flare on lock-on.
    if (chasing) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now / 120 + i);
      ctx.strokeStyle = "#f85149";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, h.r + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
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
  const held = _shardsHeld.filter(Boolean).length;
  const allHeld = held === SHARDS.length;
  text(
    allHeld ? "Key ✓ forged" : `Shards ${held}/${SHARDS.length}`,
    W - 12, 22, "end",
    allHeld ? "#f7c948" : held > 0 ? "#d9a94a" : "#8b949e",
  );
  // Per-shard pips, so it is obvious which detours are still owed.
  for (let i = 0; i < SHARDS.length; i++) {
    const px = W - 12 - i * 14;
    ctx.fillStyle = _shardsHeld[i] ? "#f7c948" : "rgba(139,148,158,0.45)";
    ctx.beginPath();
    ctx.moveTo(px - 4, 32);
    ctx.lineTo(px, 27);
    ctx.lineTo(px + 4, 32);
    ctx.lineTo(px, 39);
    ctx.closePath();
    ctx.fill();
  }

  // Objective hint.
  ctx.font = "12px ui-monospace, monospace";
  const hint = _complete
    ? ""
    : allHeld ? HINT_KEYED
    : held > 0 ? `${SHARDS.length - held} shard(s) still out there — ${SHARDS.filter((_, i) => !_shardsHeld[i]).map((sh) => sh.section).join(", ")}`
    : CHECKPOINTS[_checkpointIdx].hint;
  if (hint) text(hint, W / 2, H - 14, "center", "#9fb3c8");

  // Key-grab flash.
  if (_keyFlash > 0) {
    ctx.font = "bold 16px ui-monospace, monospace";
    text(
      allHeld ? "The shards fuse — the gate grinds open…" : `Shard ${held}/${SHARDS.length} claimed`,
      W / 2, H / 2 - 60, "center", `rgba(247,201,72,${_keyFlash / 50})`,
    );
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
