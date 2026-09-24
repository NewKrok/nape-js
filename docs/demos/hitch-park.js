import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  PivotJoint, WeldJoint, AngleJoint,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.42.1";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.1";

// ── Hitch & Park — back a trailer into the bay ───────────────────────────
//
// A top-down parking game with a trailer on the hook. Five sites — a
// supermarket lot, a multi-storey deck, a marina slipway, a city street and
// a campsite — each with one marked bay the trailer has to end up in, nose
// out, square and stopped. Parked cars can be shoved (and complain about it
// with their hazard lights), cones topple, pillars, walls, bollards, hedges
// and trees do not move at all. Every bump costs points; the clock runs
// against a par time; stars at the end.
//
// Physics: the car is not one rectangle any more. The chassis is a dynamic
// polygon and each of its four wheels is a separate dynamic body. The rear
// wheels are held by WeldJoints; each front wheel hangs on a PivotJoint at
// its hub and is steered by an AngleJoint whose limits are rewritten every
// step (Ackermann geometry — the inner wheel turns harder). The tyre model
// lives on the wheels: each wheel cancels its own sideways velocity with a
// grip-limited impulse and only the two FRONT wheels get drive, so the
// car is literally pulled around by its steered front wheels and the
// turning circle falls out of the joints instead of being faked with a
// torque. The trailer is a third body on a PivotJoint at the tow ball with
// an AngleJoint limit for the jack-knife stop, riding on its own welded
// wheels with the same tyre model — so reversing it behaves like the real
// thing: steer the wrong way and it folds.
//
// 3D: sun-lit sites with real shadow maps, modelled cars (body shell,
// glass cabin, roof, lamps, mirrors) whose wheels spin and steer from the
// physics bodies, brake and reversing lights, hazard lights on shoved cars,
// a modelled box / boat / caravan trailer, water at the marina, and a
// picture-in-picture reversing camera with guide lines while in reverse.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;
const M = 12;                   // pixels per metre
const G = 9.81 * M;             // gravity in px/s² (tyre normal loads)

// ── Vehicle ──────────────────────────────────────────────────────────────
// Lengths in metres; converted with M when a body is built.
const CAR = {
  len: 4.4, wid: 1.8, wheelbase: 2.62, track: 1.64,
  wheelR: 0.33, wheelW: 0.24,
  hitch: 0.42,                  // tow ball behind the rear bumper
  maxSteer: 0.62,               // rad at the "centre" wheel
  steerRate: 1.9,               // rad/s at the steering rack
  steerReturn: 1.1,             // rad/s self-centring with no input
  drive: 4.2,                   // m/s² from the front wheels at standstill
  vmaxF: 9.0, vmaxR: 4.2,       // m/s
  brake: 7.5,                   // m/s² per braked wheel
  roll: 0.35, engineBrake: 1.4, // m/s² coasting losses
  mu: 1.0,                      // tyre grip coefficient
};

// Trailers: `len`/`wid` is the load bed (the collision box, and what has to
// fit in the bay); `bar` is the drawbar from the bed to the coupler; `axle`
// is the axle position from the bed centre (negative = behind it).
const TRAILERS = {
  box:     { name: "Box trailer", len: 2.7, wid: 1.62, bar: 1.35, axle: -0.12, wheelR: 0.28, wheelW: 0.2, wheelOut: 0.14, density: 0.75 },
  boat:    { name: "Boat trailer", len: 4.9, wid: 1.9, bar: 1.15, axle: -0.55, wheelR: 0.3, wheelW: 0.2, wheelOut: 0.12, density: 0.45 },
  caravan: { name: "Caravan", len: 5.3, wid: 2.24, bar: 1.2, axle: -0.2, wheelR: 0.32, wheelW: 0.22, wheelOut: -0.12, density: 0.4 },
};
const HITCH_LIMIT = 1.32;       // rad either way before the drawbar hits the bumper

// Parked-car body styles (top-down proportions along the length, measured
// from the front: windscreen foot, roof front, roof back, rear-glass foot).
const CAR_TYPES = {
  hatch:  { len: 4.0, wid: 1.76, h: 1.46, ws: 0.2,  rf: 0.35, rb: 0.8,  rg: 0.92, hood: 0.72 },
  sedan:  { len: 4.65, wid: 1.8, h: 1.44, ws: 0.24, rf: 0.38, rb: 0.66, rg: 0.8,  hood: 0.7 },
  wagon:  { len: 4.4, wid: 1.8,  h: 1.48, ws: 0.23, rf: 0.37, rb: 0.88, rg: 0.95, hood: 0.7 },
  suv:    { len: 4.7, wid: 1.95, h: 1.72, ws: 0.2,  rf: 0.32, rb: 0.88, rg: 0.95, hood: 0.78 },
  van:    { len: 5.0, wid: 2.0,  h: 2.0,  ws: 0.08, rf: 0.2,  rb: 0.97, rg: 0.99, hood: 0.62 },
  pickup: { len: 5.3, wid: 1.98, h: 1.8,  ws: 0.22, rf: 0.33, rb: 0.52, rg: 0.55, hood: 0.8, bed: true },
};
const PARKED_COLORS = [0x3d6fb6, 0xe8e8e4, 0x2b2d31, 0xb8bcc2, 0x8a1f24, 0x2f6b4a, 0xd9a13a, 0x5b4a8a, 0x1f3a5a, 0x9aa3ab, 0x6b3b2a, 0xf2f0e6];
const PLAYER_COLOR = 0xd9342b;

// ── Collision setup ──────────────────────────────────────────────────────
const MAT_BODY = new Material(0.12, 0.6, 0.8, 1, 0.001);
const MAT_WHEEL = new Material(0, 0.6, 0.8, 6, 0.001);
const MAT_STATIC = new Material(0.15, 0.6, 0.8, 1, 0.001);
const MAT_CONE = new Material(0.3, 0.5, 0.6, 0.35, 0.001);
// Wheels never collide: they live inside the body outline, and the body is
// what hits things.
const FILTER_GHOST = () => new InteractionFilter(0, 0);

// ── Match ────────────────────────────────────────────────────────────────
const PARK_HOLD = 1.1;          // seconds stopped inside the bay to count
const PARK_ANGLE = 0.2;         // rad heading tolerance
const PARK_SPEED = 4;           // px/s — "stopped"
const BUMP_SPEED = 9;           // px/s relative — slower touches are free
const BUMP_COOLDOWN = 0.7;      // s per obstacle
const HAZARD_TIME = 4.5;        // s of hazard lights on a shoved car
const PARKED_MU = 0.55;         // handbrake grip of a parked car
const CONE_MU = 0.35;

// ── Sites ────────────────────────────────────────────────────────────────
// Every level is plain data: a start pose for the car (the trailer is
// placed straight behind it), the target bay (`a` is the direction the
// trailer's nose points once parked), painted bays, parked cars, static
// obstacles and cones. The view is fixed at 900 × 500 px (75 × 42 m).
const BAY_W = 31, BAY_L = 60;   // a painted car bay, 2.6 × 5 m

function bayRow(x, y, a, n, step = BAY_W, l = BAY_L, w = BAY_W) {
  // Bays side by side, rightward for a horizontal row, downward for a
  // vertical one, starting at (x, y).
  const vertical = Math.abs(Math.cos(a)) > 0.5;
  const px = vertical ? 0 : 1, py = vertical ? 1 : 0;
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: x + px * step * i, y: y + py * step * i, a, w, l });
  return out;
}

// Deterministic pseudo-random for level dressing (same lot every time).
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function parkIn(bays, idxs, seed) {
  const rnd = lcg(seed);
  const types = ["hatch", "sedan", "wagon", "suv", "sedan", "hatch", "van", "suv", "pickup"];
  const out = [];
  for (const i of idxs) {
    const b = bays[i];
    if (!b) continue;
    const type = types[Math.floor(rnd() * types.length)];
    const flip = rnd() < 0.6 ? Math.PI : 0;
    out.push({
      x: b.x + (rnd() - 0.5) * 3, y: b.y + (rnd() - 0.5) * 3,
      a: b.a + flip + (rnd() - 0.5) * 0.06,
      type, color: PARKED_COLORS[Math.floor(rnd() * PARKED_COLORS.length)],
    });
  }
  return out;
}

function range(a, b) { const r = []; for (let i = a; i < b; i++) r.push(i); return r; }

function buildLevels() {
  const L = [];

  // 1 — Supermarket: straight back into a nose-out bay.
  {
    const left = bayRow(46, 95, 0, 11);
    const right = bayRow(854, 95, Math.PI, 11);
    const midL = bayRow(390, 126, Math.PI, 9);
    const midR = bayRow(450, 126, 0, 9);
    const target = 5;
    L.push({
      id: "market", name: "Supermarket", title: "Straight Back",
      brief: "Reverse straight into the bay by the trolley shelter. Small steering, early corrections.",
      trailer: "box", par: 35, ground: "lot", sun: "noon",
      start: { x: 318, y: 272, a: -0.06 },
      bay: { ...left[target], w: 34, l: 58 },
      bays: [...left, ...right, ...midL, ...midR],
      parked: [
        ...parkIn(left, [0, 2, 3, 4, 6, 7, 9, 10], 11),
        ...parkIn(right, [0, 1, 3, 4, 5, 6, 8, 10], 12),
        ...parkIn(midL, [0, 1, 3, 5, 6, 8], 13),
        ...parkIn(midR, [1, 2, 3, 4, 7, 8], 14),
      ],
      statics: [
        { kind: "planter", x: 420, y: 90, w: 132, h: 14 },
        { kind: "planter", x: 420, y: 410, w: 132, h: 14 },
        { kind: "shelter", x: 440, y: 452, w: 90, h: 22 },
        { kind: "pillar", x: 250, y: 40, s: 9 }, { kind: "pillar", x: 250, y: 460, s: 9 },
        { kind: "pillar", x: 640, y: 40, s: 9 }, { kind: "pillar", x: 640, y: 460, s: 9 },
        { kind: "lamp", x: 180, y: 118 }, { kind: "lamp", x: 180, y: 382 },
        { kind: "lamp", x: 690, y: 118 }, { kind: "lamp", x: 690, y: 382 },
        { kind: "bin", x: 100, y: 30 }, { kind: "bin", x: 118, y: 30 },
        { kind: "trolleys", x: 620, y: 250, w: 18, h: 48 },
      ],
      cones: [{ x: 132, y: 212 }, { x: 132, y: 290 }, { x: 205, y: 208 }, { x: 205, y: 294 }],
      walls: "full",
    });
  }

  // 2 — Multi-storey deck: 90° reverse between pillars.
  {
    const top = bayRow(60, 46, Math.PI / 2, 26);
    const bottom = bayRow(60, 454, -Math.PI / 2, 26);
    const midT = bayRow(165, 232, -Math.PI / 2, 19);
    const midB = bayRow(165, 292, Math.PI / 2, 19);
    const target = 13;
    const rnd = lcg(99);
    const topFull = range(0, 26).filter((i) => i !== target && rnd() < 0.8);
    const pillars = [];
    for (let k = 3; k < 26; k += 3) pillars.push({ kind: "pillar", x: 44.5 + 31 * k, y: 80, s: 9 });
    for (let k = 3; k < 26; k += 3) pillars.push({ kind: "pillar", x: 44.5 + 31 * k, y: 420, s: 9 });
    L.push({
      id: "deck", name: "Parking deck", title: "Ninety Degrees",
      brief: "Pull past the gap, then back the trailer round into the marked bay without clipping the pillars.",
      trailer: "box", par: 60, ground: "deck", sun: "deck",
      start: { x: 132, y: 142, a: 0 },
      bay: { ...top[target], w: 34, l: 58 },
      bays: [...top, ...bottom, ...midT, ...midB],
      parked: [
        ...parkIn(top, topFull, 21),
        ...parkIn(bottom, range(0, 26).filter(() => rnd() < 0.7), 22),
        ...parkIn(midT, range(0, 19).filter(() => rnd() < 0.65), 23),
        ...parkIn(midB, range(0, 19).filter(() => rnd() < 0.65), 24),
      ],
      statics: [
        ...pillars,
        { kind: "wall", x: 450, y: 262, w: 590, h: 4 },
        { kind: "pillar", x: 150, y: 262, s: 12 }, { kind: "pillar", x: 750, y: 262, s: 12 },
        { kind: "barrier", x: 842, y: 262, w: 8, h: 130 },
      ],
      cones: [{ x: 300, y: 150 }, { x: 610, y: 150 }, { x: 800, y: 120 }],
      walls: "full",
    });
  }

  // 3 — Marina: back the boat up the slipway.
  {
    const bottom = bayRow(90, 454, -Math.PI / 2, 24);
    const rnd = lcg(7);
    const bollards = [];
    for (let x = 40; x < 880; x += 56) if (x < 370 || x > 480) bollards.push({ kind: "bollard", x, y: 164, r: 3.2 });
    L.push({
      id: "marina", name: "Marina", title: "The Slipway",
      brief: "Swing round and reverse the boat up the slipway between the jetty walls. The long trailer answers slowly — lead early.",
      trailer: "boat", par: 70, ground: "marina", sun: "marina",
      start: { x: 610, y: 262, a: Math.PI },
      bay: { x: 428, y: 84, a: Math.PI / 2, w: 40, l: 78 },
      bays: bottom,
      water: { x0: 0, y0: 0, x1: 900, y1: 150 },
      ramp: { x0: 404, y0: 34, x1: 452, y1: 150 },
      parked: parkIn(bottom, range(0, 24).filter(() => rnd() < 0.62), 31),
      statics: [
        { kind: "quay", x: 199, y: 150, w: 410, h: 8 },
        { kind: "quay", x: 678, y: 150, w: 456, h: 8 },
        { kind: "jetty", x: 399, y: 92, w: 8, h: 124 },
        { kind: "jetty", x: 457, y: 92, w: 8, h: 124 },
        { kind: "jetty", x: 428, y: 30, w: 66, h: 8 },
        ...bollards,
        { kind: "crates", x: 120, y: 214, w: 34, h: 26 }, { kind: "crates", x: 160, y: 208, w: 22, h: 22 },
        { kind: "crates", x: 770, y: 206, w: 40, h: 24 },
        { kind: "kiosk", x: 840, y: 300, w: 60, h: 46 },
        { kind: "lamp", x: 300, y: 330 }, { kind: "lamp", x: 560, y: 330 },
        { kind: "barrel", x: 206, y: 222 }, { kind: "barrel", x: 214, y: 236 },
      ],
      cones: [{ x: 372, y: 188 }, { x: 486, y: 188 }],
      decor: [
        { kind: "boat", x: 150, y: 70, a: 0.1, len: 70 }, { kind: "boat", x: 260, y: 96, a: -0.05, len: 52 },
        { kind: "boat", x: 620, y: 80, a: 3.2, len: 64 }, { kind: "boat", x: 760, y: 66, a: 3.0, len: 80 },
        { kind: "pontoon", x: 700, y: 118, w: 260, h: 10 },
      ],
      walls: "sides",
    });
  }

  // 4 — City street: parallel-park the trailer at the kerb.
  {
    const kerbCars = [
      { x: 44, a: 0, type: "hatch", color: 0x2f6b4a },
      { x: 110, a: 0, type: "sedan", color: 0xe8e8e4 },
      { x: 241, a: 0, type: "wagon", color: 0x3d6fb6 },
      { x: 505, a: 0, type: "suv", color: 0x2b2d31 },
      { x: 576, a: 0, type: "hatch", color: 0xd9a13a },
      { x: 780, a: 0, type: "van", color: 0xf2f0e6 },
      { x: 855, a: 0, type: "sedan", color: 0x8a1f24 },
    ].map((c) => ({ ...c, y: 86 + (c.type === "van" ? 1 : 0) }));
    const farCars = [
      { x: 70, type: "suv", color: 0xb8bcc2 }, { x: 150, type: "hatch", color: 0x5b4a8a },
      { x: 330, type: "sedan", color: 0x1f3a5a }, { x: 405, type: "pickup", color: 0x6b3b2a },
      { x: 700, type: "wagon", color: 0x9aa3ab }, { x: 830, type: "hatch", color: 0x3d6fb6 },
    ].map((c) => ({ ...c, y: 414, a: Math.PI }));
    const lamps = [];
    for (let x = 60; x < 900; x += 150) lamps.push({ kind: "lamp", x, y: 56 }, { kind: "lamp", x: x + 75, y: 444 });
    L.push({
      id: "street", name: "High street", title: "Kerbside",
      brief: "Parallel-park the trailer in the gap behind the blue wagon. Drive past, then reverse in with a full swing and straighten.",
      trailer: "box", par: 75, ground: "street", sun: "dusk",
      start: { x: 116, y: 188, a: 0 },
      bay: { x: 299, y: 87, a: 0, w: 30, l: 52 },
      bays: [],
      parked: [...kerbCars, ...farCars],
      statics: [
        { kind: "kerb", x: 450, y: 68, w: 900, h: 8 },
        { kind: "kerb", x: 450, y: 432, w: 900, h: 8 },
        ...lamps,
        { kind: "barrier", x: 640, y: 262, w: 120, h: 6 },
        { kind: "barrier", x: 640, y: 318, w: 120, h: 6 },
        { kind: "barrier", x: 583, y: 290, w: 6, h: 62 },
        { kind: "barrier", x: 697, y: 290, w: 6, h: 62 },
        { kind: "hydrant", x: 400, y: 60 }, { kind: "tree", x: 190, y: 38, r: 16 }, { kind: "tree", x: 690, y: 36, r: 18 },
        { kind: "shelter", x: 450, y: 30, w: 80, h: 20 },
        { kind: "tree", x: 280, y: 466, r: 16 }, { kind: "tree", x: 560, y: 466, r: 15 },
      ],
      cones: [{ x: 560, y: 272 }, { x: 560, y: 308 }, { x: 720, y: 272 }, { x: 720, y: 308 }, { x: 520, y: 290 }],
      decor: [{ kind: "manhole", x: 360, y: 250 }, { kind: "manhole", x: 780, y: 320 }],
      walls: "ends",
    });
  }

  // 5 — Campsite: the caravan into a hedged pitch.
  {
    const trees = [
      { x: 250, y: 205, r: 22 }, { x: 330, y: 238, r: 16 }, { x: 440, y: 200, r: 24 },
      { x: 560, y: 226, r: 18 }, { x: 660, y: 196, r: 22 }, { x: 740, y: 250, r: 15 },
      { x: 120, y: 230, r: 20 }, { x: 60, y: 420, r: 22 }, { x: 160, y: 460, r: 16 },
      { x: 860, y: 470, r: 18 }, { x: 880, y: 40, r: 16 }, { x: 40, y: 40, r: 18 },
    ].map((t) => ({ kind: "tree", ...t }));
    L.push({
      id: "camp", name: "Campsite", title: "Pitch Perfect",
      brief: "Tour round to the lower lane, then reverse the caravan up into pitch 7 between the hedges.",
      trailer: "caravan", par: 110, ground: "camp", sun: "golden",
      start: { x: 150, y: 112, a: 0 },
      bay: { x: 560, y: 414, a: -Math.PI / 2, w: 40, l: 82 },
      bays: [],
      pitches: [{ x: 400, y: 414, n: 5 }, { x: 480, y: 414, n: 6 }, { x: 560, y: 414, n: 7 }, { x: 640, y: 414, n: 8 }, { x: 720, y: 414, n: 9 }],
      parked: [
        { x: 452, y: 360, a: Math.PI / 2 + 0.05, type: "suv", color: 0x2f6b4a },
        { x: 668, y: 362, a: -Math.PI / 2, type: "wagon", color: 0xb8bcc2 },
        { x: 300, y: 330, a: 0.1, type: "hatch", color: 0xd9a13a },
      ],
      statics: [
        ...trees,
        { kind: "hedge", x: 520, y: 416, w: 7, h: 90 }, { kind: "hedge", x: 600, y: 416, w: 7, h: 90 },
        { kind: "hedge", x: 440, y: 416, w: 7, h: 90 }, { kind: "hedge", x: 680, y: 416, w: 7, h: 90 },
        { kind: "hedge", x: 360, y: 416, w: 7, h: 90 }, { kind: "hedge", x: 760, y: 416, w: 7, h: 90 },
        { kind: "hedge", x: 560, y: 470, w: 420, h: 8 },
        { kind: "vancaravan", x: 480, y: 420, a: -Math.PI / 2 },
        { kind: "vancaravan", x: 640, y: 416, a: -Math.PI / 2 + 0.04 },
        { kind: "tent", x: 400, y: 420, w: 30, h: 36, a: 0.1 }, { kind: "tent", x: 720, y: 426, w: 26, h: 30, a: -0.2 },
        { kind: "table", x: 395, y: 372 }, { kind: "table", x: 735, y: 378 },
        { kind: "block", x: 160, y: 330, w: 70, h: 44 },
        { kind: "firepit", x: 245, y: 420 },
      ],
      cones: [{ x: 520, y: 356 }, { x: 600, y: 356 }],
      roads: [
        { x0: 20, y0: 84, x1: 880, y1: 138 },
        { x0: 800, y0: 84, x1: 860, y1: 336 },
        { x0: 190, y0: 286, x1: 860, y1: 336 },
      ],
      walls: "full",
    });
  }

  return L;
}
const LEVELS = buildLevels();

// ── Module state ─────────────────────────────────────────────────────────
let _space = null;
let _levelIdx = 0;
let _level = null;
let _levelGen = 0;              // bumps on every (re)build — the 3D scene watches it
let _phase = "title";           // title | intro | play | done
let _phaseT = 0;
let _clock = 0;                 // seconds on the current attempt
let _veh = null;                // { chassis, wheels, trailer, steer, gear, ... }
let _parked = [];               // { body, spec, color, type, hazard, lx... }
let _cones = [];                // { body, down, hit }
let _statics = [];              // { body, def }
let _hits = 0, _crashes = 0, _coneHits = 0;
let _hold = 0;                  // seconds the trailer has been parked
let _parkState = null;          // { inside, aligned, stopped, acc, corners }
let _result = null;
let _best = [];                 // best stars per level
let _banners = [];
let _floaters = [];             // world-space "BUMP" texts
let _cooldown = new Map();
let _keys = {};
let _joy = null;                // touch joystick { ox, oy, x, y }
let _onKeyDown = null, _onKeyUp = null;
let _showGuide = true;
let _showForces = false;
let _camMode = 0;               // 3D: 0 follow, 1 chase, 2 overview
let _rearCam = true;
let _autopilot = null;          // harness: fn(state) → input
let _cbVeh = null, _cbThing = null, _cbCone = null;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));
const wrapPi = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

try {
  const raw = typeof localStorage !== "undefined" && localStorage.getItem("hitch-park.best");
  if (raw) _best = JSON.parse(raw);
} catch (_) { _best = []; }
function saveBest() {
  try { if (typeof localStorage !== "undefined") localStorage.setItem("hitch-park.best", JSON.stringify(_best)); } catch (_) { /* private mode */ }
}

// ── Geometry helpers ─────────────────────────────────────────────────────
// Chamfered outline of a car / trailer bed in local metres → px vertices.
function carOutline(len, wid, ch = 0.32) {
  const l = len / 2 * M, w = wid / 2 * M, c = ch * M;
  return [
    [l, -w + c], [l, w - c], [l - c, w], [-l + c * 0.7, w],
    [-l, w - c * 0.7], [-l, -w + c * 0.7], [-l + c * 0.7, -w], [l - c, -w],
  ];
}
const toVecs = (pts) => pts.map(([x, y]) => new Vec2(x, y));

function localToWorld(x, y, a, lx, ly) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: x + lx * c - ly * s, y: y + lx * s + ly * c };
}

// ── Level build ──────────────────────────────────────────────────────────
function staticBody(space, def) {
  const b = new Body(BodyType.STATIC, new Vec2(def.x, def.y));
  const k = def.kind;
  const box = (w, h) => b.shapes.add(new Polygon(Polygon.box(w, h), MAT_STATIC));
  const circ = (r) => b.shapes.add(new Circle(r, undefined, MAT_STATIC));
  if (k === "pillar") box(def.s, def.s);
  else if (k === "bollard") circ(def.r ?? 3);
  else if (k === "lamp") circ(2.6);
  else if (k === "hydrant") circ(2.8);
  else if (k === "bin") circ(4.5);
  else if (k === "barrel") circ(4.2);
  else if (k === "tree") circ(Math.max(3, def.r * 0.24));
  else if (k === "firepit") circ(7);
  else if (k === "table") box(12, 20);
  else if (k === "vancaravan") {
    const t = TRAILERS.caravan;
    box(t.len * M, t.wid * M);
  } else box(def.w, def.h);
  if (def.a) b.rotation = def.a;
  b.userData._static = def;
  b.cbTypes.add(_cbThing);
  b.space = space;
  return b;
}

function boundaryWalls(space, mode) {
  const T = 14;
  const defs = [];
  if (mode === "full" || mode === "sides") {
    defs.push({ x: -T / 2 + 2, y: VIEW_H / 2, w: T, h: VIEW_H + 40 });
    defs.push({ x: VIEW_W + T / 2 - 2, y: VIEW_H / 2, w: T, h: VIEW_H + 40 });
    defs.push({ x: VIEW_W / 2, y: VIEW_H + T / 2 - 2, w: VIEW_W + 40, h: T });
  }
  if (mode === "full") defs.push({ x: VIEW_W / 2, y: -T / 2 + 2, w: VIEW_W + 40, h: T });
  if (mode === "ends") {
    defs.push({ x: -T / 2 + 2, y: VIEW_H / 2, w: T, h: VIEW_H + 40 });
    defs.push({ x: VIEW_W + T / 2 - 2, y: VIEW_H / 2, w: T, h: VIEW_H + 40 });
  }
  for (const d of defs) staticBody(space, { kind: "boundary", ...d });
}

function createParked(space, p) {
  const spec = CAR_TYPES[p.type];
  const b = new Body(BodyType.DYNAMIC, new Vec2(p.x, p.y));
  b.rotation = p.a;
  b.shapes.add(new Polygon(toVecs(carOutline(spec.len, spec.wid)), MAT_BODY));
  b.cbTypes.add(_cbThing);
  b.space = space;
  const rec = { body: b, spec, type: p.type, color: p.color, hazard: 0, shoved: 0, x0: p.x, y0: p.y };
  b.userData._parked = rec;
  return rec;
}

function createCone(space, c) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(c.x, c.y));
  b.shapes.add(new Circle(3.3, undefined, MAT_CONE));
  b.cbTypes.add(_cbCone);
  b.space = space;
  const rec = { body: b, down: false, hit: false, tip: 0, tipA: 0 };
  b.userData._cone = rec;
  return rec;
}

function makeWheel(space, parent, lx, ly, r, w, opts) {
  const p = parent.position, a = parent.rotation;
  const wp = localToWorld(p.x, p.y, a, lx, ly);
  const b = new Body(BodyType.DYNAMIC, new Vec2(wp.x, wp.y));
  b.rotation = a;
  b.shapes.add(new Polygon(Polygon.box(r * 2, w), MAT_WHEEL, FILTER_GHOST()));
  b.space = space;
  const rec = { body: b, lx, ly, r, w, front: !!opts.front, side: Math.sign(ly), spin: 0, steer: 0, fLong: 0, fLat: 0, skid: 0, joint: null };
  if (opts.front) {
    const pj = new PivotJoint(parent, b, new Vec2(lx, ly), new Vec2(0, 0));
    pj.ignore = true;
    pj.space = space;
    const aj = new AngleJoint(parent, b, 0, 0);
    aj.ignore = true;
    aj.space = space;
    rec.joint = aj;
  } else {
    const wj = new WeldJoint(parent, b, new Vec2(lx, ly), new Vec2(0, 0));
    wj.ignore = true;
    wj.space = space;
  }
  return rec;
}

function createVehicle(space, start, trailerKey) {
  const c = new Body(BodyType.DYNAMIC, new Vec2(start.x, start.y));
  c.rotation = start.a;
  c.shapes.add(new Polygon(toVecs(carOutline(CAR.len, CAR.wid)), MAT_BODY));
  c.cbTypes.add(_cbVeh);
  c.space = space;
  c.userData._veh = true;
  const ax = CAR.wheelbase / 2 * M, ty = CAR.track / 2 * M;
  const r = CAR.wheelR * M, w = CAR.wheelW * M;
  const wheels = [
    makeWheel(space, c, ax, -ty, r, w, { front: true }),
    makeWheel(space, c, ax, ty, r, w, { front: true }),
    makeWheel(space, c, -ax, -ty, r, w, {}),
    makeWheel(space, c, -ax, ty, r, w, {}),
  ];

  // Trailer, straight behind the tow ball.
  const t = TRAILERS[trailerKey];
  const hitchX = -(CAR.len / 2 + CAR.hitch) * M;
  const couplerX = (t.len / 2 + t.bar) * M;
  const hp = localToWorld(start.x, start.y, start.a, hitchX, 0);
  const tp = localToWorld(hp.x, hp.y, start.a, -couplerX, 0);
  const tb = new Body(BodyType.DYNAMIC, new Vec2(tp.x, tp.y));
  tb.rotation = start.a;
  const tmat = new Material(0.12, 0.6, 0.8, t.density, 0.001);
  tb.shapes.add(new Polygon(toVecs(carOutline(t.len, t.wid, trailerKey === "caravan" ? 0.35 : 0.08)), tmat));
  const bx = t.len / 2 * M;
  tb.shapes.add(new Polygon([new Vec2(bx - 1, -t.wid * 0.28 * M), new Vec2(couplerX, -1.2), new Vec2(couplerX, 1.2), new Vec2(bx - 1, t.wid * 0.28 * M)], tmat));
  const wOut = t.wid / 2 + t.wheelOut;
  if (t.wheelOut > 0) {
    // Fenders stick out past the bed: they are part of what can hit things.
    tb.shapes.add(new Polygon(Polygon.rect(t.axle * M - t.wheelR * 1.25 * M, -(wOut + t.wheelW / 2 + 0.04) * M, t.wheelR * 2.5 * M, (wOut + t.wheelW / 2 + 0.04) * 2 * M), tmat));
  }
  tb.cbTypes.add(_cbVeh);
  tb.space = space;
  tb.userData._veh = true;
  const twheels = [
    makeWheel(space, tb, t.axle * M, -wOut * M, t.wheelR * M, t.wheelW * M, {}),
    makeWheel(space, tb, t.axle * M, wOut * M, t.wheelR * M, t.wheelW * M, {}),
  ];
  const hj = new PivotJoint(c, tb, new Vec2(hitchX, 0), new Vec2(couplerX, 0));
  hj.ignore = true;
  hj.space = space;
  const lim = new AngleJoint(c, tb, -HITCH_LIMIT, HITCH_LIMIT);
  lim.ignore = true;
  lim.space = space;

  const massOf = (b, ws) => b.mass + ws.reduce((s, q) => s + q.body.mass, 0);
  return {
    chassis: c, wheels,
    carMass: massOf(c, wheels),
    trailer: { body: tb, spec: t, key: trailerKey, wheels: twheels, couplerX, mass: massOf(tb, twheels), hitchJ: hj },
    hitchX,
    steer: 0, gear: 1, throttle: 0, braking: false, holding: true, speed: 0, lamps: 0,
    odo: 0,
  };
}

function installListeners(space) {
  _cbVeh = new CbType();
  _cbThing = new CbType();
  _cbCone = new CbType();
  const pair = (cb) => {
    const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
    const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
    return b1?.userData?._veh ? [b1, b2] : [b2, b1];
  };
  const contactPoint = (cb, fallback) => {
    try {
      const arb = cb.arbiters.at(0)?.collisionArbiter;
      const ct = arb?.contacts.at(0);
      if (ct) return { x: ct.position.x, y: ct.position.y };
    } catch (_) { /* no contact data */ }
    return fallback;
  };
  space.listeners.add(new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, _cbVeh, _cbThing, (cb) => {
    const [vb, ob] = pair(cb);
    if (!vb || !ob) return;
    const pv = vb.userData._pv ?? { x: 0, y: 0 };
    const po = ob.userData._pv ?? { x: 0, y: 0 };
    const rel = Math.hypot(pv.x - po.x, pv.y - po.y);
    const pt = contactPoint(cb, { x: (vb.position.x + ob.position.x) / 2, y: (vb.position.y + ob.position.y) / 2 });
    registerBump(ob, rel, pt);
  }));
  space.listeners.add(new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, _cbVeh, _cbCone, (cb) => {
    const [vb, ob] = pair(cb);
    const rec = ob?.userData?._cone;
    if (!rec) return;
    const pv = vb.userData._pv ?? { x: 0, y: 0 };
    const rel = Math.hypot(pv.x, pv.y);
    if (!rec.hit && rel > 3 && _phase === "play") {
      rec.hit = true;
      _coneHits++;
      floater(ob.position.x, ob.position.y - 8, "CONE −25", "#ffb347");
    }
    if (rel > 14) { rec.down = true; rec.tipA = Math.atan2(pv.y, pv.x); }
  }));
}

function registerBump(ob, rel, pt) {
  if (_phase !== "play" && _phase !== "intro") return;
  if (rel < BUMP_SPEED) return;
  const now = _clock;
  const last = _cooldown.get(ob) ?? -99;
  _cooldown.set(ob, now);
  if (now - last < BUMP_COOLDOWN) return;
  const crash = rel > 45;
  if (crash) _crashes++; else _hits++;
  const pk = ob.userData._parked;
  if (pk) { pk.hazard = HAZARD_TIME; pk.shoved++; }
  floater(pt.x, pt.y, crash ? "CRASH −150" : "BUMP −60", crash ? "#ff5c5c" : "#ffd166");
  _shake = Math.max(_shake, crash ? 1 : 0.45);
  if (_veh) _veh.dent = 1;
}
let _shake = 0;

function floater(x, y, text, color) {
  _floaters.push({ x, y, text, color, t: 0, life: 1.4 });
  if (_floaters.length > 20) _floaters.shift();
}
function pushBanner(text, color, life = 1.6, sub = "") {
  _banners.push({ text, sub, color, t: 0, life });
  if (_banners.length > 3) _banners.shift();
}

function loadLevel(idx) {
  const space = _space;
  _levelIdx = clamp(idx, 0, LEVELS.length - 1);
  _level = LEVELS[_levelIdx];
  _levelGen++;
  space.clear();
  installListeners(space);
  _parked = [];
  _cones = [];
  _statics = [];
  _cooldown = new Map();
  _floaters = [];
  boundaryWalls(space, _level.walls);
  for (const s of _level.statics) _statics.push({ body: staticBody(space, s), def: s });
  for (const p of _level.parked) _parked.push(createParked(space, p));
  for (const c of _level.cones) _cones.push(createCone(space, c));
  _veh = createVehicle(space, _level.start, _level.trailer);
  _hits = 0; _crashes = 0; _coneHits = 0;
  _hold = 0;
  _clock = 0;
  _parkState = null;
  _result = null;
  _shake = 0;
}

// ── Vehicle dynamics ─────────────────────────────────────────────────────
function ackermann(steer, side) {
  // side: −1 = left wheel (y < 0 in a car facing +x), +1 = right wheel.
  if (Math.abs(steer) < 1e-4) return 0;
  const L = CAR.wheelbase, T = CAR.track;
  const R = L / Math.tan(Math.abs(steer));
  const inner = Math.sign(steer) === side;
  const a = Math.atan(L / (inner ? R - T / 2 : R + T / 2));
  return a * Math.sign(steer);
}

// One tyre: grip against sideways slip, drive / braking / rolling losses
// along the wheel, all inside one friction circle. Applied to the wheel
// body itself — the joints carry it into the chassis.
function tyre(w, share, drive, brake, engineBrake) {
  const b = w.body;
  const a = b.rotation, c = Math.cos(a), s = Math.sin(a);
  const vx = b.velocity.x, vy = b.velocity.y;
  const vLong = vx * c + vy * s;
  const vLat = -vx * s + vy * c;
  let jLat = -vLat * share * 0.85;
  let jLong;
  if (drive !== 0) {
    jLong = drive * DT;
  } else {
    let dec = CAR.roll * M + (engineBrake ? CAR.engineBrake * M : 0);
    if (brake) dec = CAR.brake * M;
    const kill = Math.min(Math.abs(vLong) * share, dec * share * DT);
    jLong = -Math.sign(vLong) * kill;
  }
  const cap = CAR.mu * share * G * DT;
  const mag = Math.hypot(jLat, jLong);
  w.skid = 0;
  if (mag > cap) {
    const k = cap / mag;
    jLat *= k; jLong *= k;
    w.skid = Math.min(1, (mag - cap) / cap);
  }
  b.applyImpulse(new Vec2(c * jLong - s * jLat, s * jLong + c * jLat));
  w.fLong = jLong / DT;
  w.fLat = jLat / DT;
  w.spin += vLong * DT / w.r;
  w.vLong = vLong;
}

function readInput() {
  if (_autopilot) return _autopilot(_debugState());
  const k = _keys;
  let throttle = 0, steer = 0;
  if (k.ArrowUp || k.KeyW) throttle += 1;
  if (k.ArrowDown || k.KeyS) throttle -= 1;
  if (k.ArrowLeft || k.KeyA) steer -= 1;
  if (k.ArrowRight || k.KeyD) steer += 1;
  let brake = !!k.Space;
  if (_joy) {
    const dx = _joy.x - _joy.ox, dy = _joy.y - _joy.oy;
    steer = clamp(dx / 55, -1, 1);
    if (Math.abs(steer) < 0.12) steer = 0;
    if (dy < -14) throttle = clamp(-dy / 60, 0, 1);
    else if (dy > 14) throttle = -clamp(dy / 60, 0, 1);
  }
  return { throttle, steer, brake };
}

function driveVehicle(input) {
  const v = _veh;
  const c = v.chassis;
  const a = c.rotation, fx = Math.cos(a), fy = Math.sin(a);
  const speed = c.velocity.x * fx + c.velocity.y * fy;
  v.speed = speed;

  // Steering rack: rate-limited, self-centring when you let go.
  const target = input.steer * CAR.maxSteer;
  v.steer = input.steer !== 0
    ? approach(v.steer, target, CAR.steerRate * DT)
    : approach(v.steer, 0, CAR.steerReturn * DT);
  for (const w of v.wheels) {
    if (!w.front) continue;
    const ang = ackermann(v.steer, w.side);
    w.steer = ang;
    w.joint.jointMin = ang;
    w.joint.jointMax = ang;
  }

  // Gearbox: ↑ drives forward (brakes first if rolling back), ↓ reverses.
  let dir = 0, brake = !!input.brake;
  if (!brake) {
    if (input.throttle > 0) { if (speed < -5) brake = true; else { dir = 1; v.gear = 1; } }
    else if (input.throttle < 0) { if (speed > 5) brake = true; else { dir = -1; v.gear = -1; } }
  }
  const hold = dir === 0 && !brake && Math.abs(speed) < 3;
  v.braking = brake;
  v.holding = hold;
  v.throttle = dir * Math.abs(input.throttle);

  const vmax = (dir > 0 ? CAR.vmaxF : CAR.vmaxR) * M;
  const ratio = clamp(Math.abs(speed) / vmax, 0, 1);
  const curve = dir !== 0 && Math.sign(speed) === dir ? Math.max(0, 1 - ratio * ratio) : 1;
  const driveF = dir * Math.abs(input.throttle) * CAR.drive * M * v.carMass * curve;
  const share = v.carMass / 4;
  for (const w of v.wheels) {
    tyre(w, share, w.front ? driveF / 2 : 0, brake || hold, w.front && dir === 0);
  }
  const t = v.trailer;
  const tshare = t.mass / 2 * 0.9;
  for (const w of t.wheels) tyre(w, tshare, 0, hold && Math.abs(speed) < 1.5, false);
  v.odo += Math.abs(speed) * DT;
}

function parkedFriction() {
  const dv = PARKED_MU * G * DT;
  for (const p of _parked) {
    const b = p.body;
    const vx = b.velocity.x, vy = b.velocity.y;
    const sp = Math.hypot(vx, vy);
    if (sp > 0) {
      const k = sp <= dv ? 0 : (sp - dv) / sp;
      b.velocity.setxy(vx * k, vy * k);
    }
    const dw = dv / (p.spec.len * M * 0.3);
    b.angularVel = approach(b.angularVel, 0, dw);
    if (p.hazard > 0) p.hazard = Math.max(0, p.hazard - DT);
  }
  const cv = CONE_MU * G * DT;
  for (const c of _cones) {
    const b = c.body;
    const vx = b.velocity.x, vy = b.velocity.y;
    const sp = Math.hypot(vx, vy);
    if (sp > 0) {
      const k = sp <= cv ? 0 : (sp - cv) / sp;
      b.velocity.setxy(vx * k, vy * k);
    }
    b.angularVel *= 0.9;
    if (c.down) c.tip = Math.min(1, c.tip + DT * 6);
  }
}

// ── Parking check ────────────────────────────────────────────────────────
function trailerCorners() {
  const t = _veh.trailer, b = t.body;
  const l = t.spec.len / 2 * M, w = t.spec.wid / 2 * M;
  const p = b.position, a = b.rotation;
  return [[l, -w], [l, w], [-l, w], [-l, -w]].map(([x, y]) => localToWorld(p.x, p.y, a, x, y));
}

function evalParking() {
  const bay = _level.bay;
  const tb = _veh.trailer.body;
  const corners = trailerCorners();
  const ca = Math.cos(-bay.a), sa = Math.sin(-bay.a);
  let inside = true, maxOut = 0;
  for (const q of corners) {
    const dx = q.x - bay.x, dy = q.y - bay.y;
    const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
    const ox = Math.abs(lx) - bay.l / 2, oy = Math.abs(ly) - bay.w / 2;
    const o = Math.max(ox, oy);
    if (o > 0) inside = false;
    maxOut = Math.max(maxOut, o);
  }
  const angErr = Math.abs(wrapPi(tb.rotation - bay.a));
  const aligned = angErr < PARK_ANGLE;
  const tsp = Math.hypot(tb.velocity.x, tb.velocity.y);
  const csp = Math.hypot(_veh.chassis.velocity.x, _veh.chassis.velocity.y);
  const stopped = tsp < PARK_SPEED && csp < PARK_SPEED;
  // Accuracy: how centred and how square.
  const dx = tb.position.x - bay.x, dy = tb.position.y - bay.y;
  const lat = Math.abs(dx * sa + dy * ca);
  const room = Math.max(1, bay.w / 2 - _veh.trailer.spec.wid / 2 * M);
  const acc = clamp(100 - (lat / room) * 45 - (angErr / PARK_ANGLE) * 55, 0, 100);
  const near = Math.hypot(dx, dy) < bay.l * 1.4;
  _parkState = { inside, aligned, stopped, acc, angErr, maxOut, near, corners };
  return _parkState;
}

// ── Game flow ────────────────────────────────────────────────────────────
function goTitle() {
  _phase = "title";
  _phaseT = 0;
  _banners = [];
}

function startLevel(idx) {
  loadLevel(idx);
  _phase = "intro";
  _phaseT = 0;
  _banners = [];
}

function finishLevel() {
  const ps = _parkState;
  const lvl = _level;
  const bumps = _hits + _crashes;
  const timeBonus = Math.max(0, Math.round((lvl.par - _clock) * 10));
  const accBonus = Math.round(ps.acc * 3);
  const penalty = _hits * 60 + _crashes * 150 + _coneHits * 25;
  const score = Math.max(0, 500 + timeBonus + accBonus - penalty);
  const stars = 1 + (bumps === 0 ? 1 : 0) + (_clock <= lvl.par ? 1 : 0);
  const prev = _best[_levelIdx] ?? { stars: 0, score: 0 };
  const isBest = score > prev.score;
  _best[_levelIdx] = { stars: Math.max(stars, prev.stars), score: Math.max(score, prev.score) };
  saveBest();
  _result = { score, stars, time: _clock, bumps, hits: _hits, crashes: _crashes, cones: _coneHits, acc: ps.acc, timeBonus, accBonus, penalty, isBest };
  _phase = "done";
  _phaseT = 0;
  pushBanner("PARKED!", "#7ee787", 2.2);
}

function primaryAction() {
  if (_phase === "title") { startLevel(_levelIdx); return true; }
  if (_phase === "done") {
    startLevel((_levelIdx + 1) % LEVELS.length);
    return true;
  }
  return false;
}

// The per-physics-step game tick (runs from the Space.step wrapper).
function tickGame() {
  if (!_veh) return;
  // Pre-step velocities for bump strength (BEGIN fires after the solver).
  for (const b of [_veh.chassis, _veh.trailer.body]) b.userData._pv = { x: b.velocity.x, y: b.velocity.y };
  for (const p of _parked) p.body.userData._pv = { x: p.body.velocity.x, y: p.body.velocity.y };

  _phaseT += DT;
  let input = { throttle: 0, steer: 0, brake: false };
  if (_phase === "play") {
    input = readInput();
    _clock += DT;
  } else if (_phase === "intro") {
    if (_phaseT > 1.6) { _phase = "play"; _phaseT = 0; pushBanner("GO", "#7ee787", 0.9); }
  } else if (_phase === "done" || _phase === "title") {
    input = { throttle: 0, steer: 0, brake: true };
  }
  driveVehicle(input);
  parkedFriction();

  const ps = evalParking();
  if (_phase === "play") {
    if (ps.inside && ps.aligned && ps.stopped) {
      _hold += DT;
      if (_hold >= PARK_HOLD) finishLevel();
    } else {
      _hold = Math.max(0, _hold - DT * 2);
    }
  }
  _shake = Math.max(0, _shake - DT * 2.5);
  if (_veh.dent) _veh.dent = Math.max(0, _veh.dent - DT * 2);
  for (const f of _floaters) f.t += DT;
  _floaters = _floaters.filter((f) => f.t < f.life);
  for (const bn of _banners) bn.t += DT;
  _banners = _banners.filter((bn) => bn.t < bn.life);
}

// Predicted path of the trailer axle for the current steering (kinematic
// car + trailer model, integrated a few seconds ahead in the gear you are in).
function predictPath(n = 26, dt = 0.12) {
  if (!_veh) return [];
  const v = _veh, c = v.chassis, t = v.trailer;
  const L = CAR.wheelbase * M;
  const b = -v.hitchX - CAR.wheelbase / 2 * M;        // rear axle → hitch
  const d = t.couplerX - t.spec.axle * M;             // hitch → trailer axle
  let th = c.rotation, ph = t.body.rotation;
  // Rear axle centre of the car.
  let x = c.position.x - Math.cos(th) * L / 2, y = c.position.y - Math.sin(th) * L / 2;
  const dir = v.gear;
  const sp = dir * Math.max(18, Math.abs(v.speed));
  const tanD = Math.tan(v.steer);
  const out = [];
  for (let i = 0; i < n; i++) {
    const w = sp / L * tanD;
    const rel = th - ph;
    const dph = (sp / d) * Math.sin(rel) - (b * w / d) * Math.cos(rel);
    x += Math.cos(th) * sp * dt;
    y += Math.sin(th) * sp * dt;
    th += w * dt;
    ph += dph * dt;
    const hx = x - Math.cos(th) * b, hy = y - Math.sin(th) * b;
    out.push({ x: hx - Math.cos(ph) * d, y: hy - Math.sin(ph) * d, a: ph, cx: x, cy: y });
  }
  return out;
}

// ── 2D drawing ───────────────────────────────────────────────────────────
// The flat renderers share one scene description. The ground (surface,
// paint, water) is baked once per level into a canvas that also becomes the
// 3D ground texture; the static obstacles and the overhead layer (tree
// canopies, roofs) are baked into two more canvases for the flat modes. Only
// the moving things are drawn every frame, through a tiny painter interface
// with a Canvas2D and a PixiJS Graphics implementation.

const hexCss = (h) => "#" + (h >>> 0).toString(16).padStart(6, "0");
function shade(hex, k) {
  // k < 0 darkens, k > 0 lightens.
  let r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return ((r | 0) << 16) | ((g | 0) << 8) | (b | 0);
}

class CanvasPainter {
  constructor(ctx) { this.ctx = ctx; }
  poly(pts, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    if (fill !== null) { c.globalAlpha = alpha; c.fillStyle = hexCss(fill); c.fill(); }
    if (stroke !== null) { c.globalAlpha = salpha; c.strokeStyle = hexCss(stroke); c.lineWidth = sw; c.stroke(); }
    c.globalAlpha = 1;
  }
  circle(x, y, r, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    if (fill !== null) { c.globalAlpha = alpha; c.fillStyle = hexCss(fill); c.fill(); }
    if (stroke !== null) { c.globalAlpha = salpha; c.strokeStyle = hexCss(stroke); c.lineWidth = sw; c.stroke(); }
    c.globalAlpha = 1;
  }
  line(pts, color, width = 1, alpha = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.globalAlpha = alpha;
    c.strokeStyle = hexCss(color);
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.stroke();
    c.globalAlpha = 1;
  }
}

class PixiPainter {
  constructor(g) { this.g = g; }
  poly(pts, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const g = this.g.poly(pts, true);
    if (fill !== null) g.fill({ color: fill, alpha });
    if (stroke !== null) g.stroke({ color: stroke, width: sw, alpha: salpha });
  }
  circle(x, y, r, fill, alpha = 1, stroke = null, sw = 1, salpha = 1) {
    const g = this.g.circle(x, y, r);
    if (fill !== null) g.fill({ color: fill, alpha });
    if (stroke !== null) g.stroke({ color: stroke, width: sw, alpha: salpha });
  }
  line(pts, color, width = 1, alpha = 1) {
    const g = this.g;
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke({ color, width, alpha, cap: "round", join: "round" });
  }
}

// Local shapes → flat world point arrays.
function xform(x, y, a, pts) {
  const c = Math.cos(a), s = Math.sin(a);
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    const lx = pts[i], ly = pts[i + 1];
    out[i] = x + lx * c - ly * s;
    out[i + 1] = y + lx * s + ly * c;
  }
  return out;
}
function rectPts(x0, y0, x1, y1) { return [x0, y0, x1, y0, x1, y1, x0, y1]; }
function rrectPts(cx, cy, l, w, r, seg = 3) {
  const out = [];
  const hl = l / 2, hw = w / 2;
  r = Math.min(r, hl, hw);
  const corners = [[hl - r, hw - r, 0], [-hl + r, hw - r, Math.PI / 2], [-hl + r, -hw + r, Math.PI], [hl - r, -hw + r, Math.PI * 1.5]];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * Math.PI / 2;
      out.push(cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r);
    }
  }
  return out;
}

// ── Car, top-down ────────────────────────────────────────────────────────
// `spec` in metres; drawn in px around (x, y, a). Front is +x.
function drawCarTop(p, spec, color, x, y, a, o = {}) {
  const L = spec.len * M, W = spec.wid * M;
  const X = (f) => L / 2 - f * L;                 // fraction from the front → local x
  const P = (pts) => xform(x, y, a, pts);
  // Shadow.
  p.poly(xform(x + 1.8, y + 2.6, a, rrectPts(0, 0, L + 1, W + 1, 4)), 0x000000, 0.28);
  const body = shade(color, o.dent ? -0.15 * o.dent : 0);
  p.poly(P(rrectPts(0, 0, L, W, 4.2, 3)), body, 1, shade(color, -0.45), 0.8);
  // Tyres sit in the arches, poking out past the body so steering reads —
  // the player's come straight from the wheel bodies, parked cars' are fixed.
  const wr = CAR.wheelR * M, ww = CAR.wheelW * M + 0.6;
  if (o.wheels) {
    for (const w of o.wheels) p.poly(xform(w.x, w.y, w.a, rrectPts(0, 0, wr * 2, ww, 1, 1)), 0x141416, 1, 0x3a3d42, 0.5);
  } else {
    const ax = (spec.len * 0.3) * M, ty = (spec.wid / 2 - 0.1) * M;
    for (const [lx, ly] of [[ax, -ty], [ax, ty], [-ax, -ty], [-ax, ty]]) p.poly(P(rrectPts(lx, ly, wr * 2, ww, 1, 1)), 0x141416);
  }
  // Shoulder highlight.
  p.poly(P(rrectPts(0, 0, L - 5, W * 0.62, 3, 2)), 0xffffff, 0.08);
  // Cabin glass (windscreen, side windows, rear glass) then the roof on top.
  const ws = X(spec.ws), rf = X(spec.rf), rb = X(spec.rb), rg = X(spec.rg);
  const gw = W * 0.86, rw = W * 0.74;
  p.poly(P([ws, -gw / 2 + 1.5, ws, gw / 2 - 1.5, rf, rw / 2 + 0.6, rb, rw / 2 + 0.6, rg, gw / 2 - 1.2, rg, -gw / 2 + 1.2, rb, -rw / 2 - 0.6, rf, -rw / 2 - 0.6]), 0x1b2430);
  p.poly(P([ws - 0.8, -gw / 2 + 3, ws - 0.8, -gw / 2 + 5, rf + 1, -rw / 2 + 2.5, rf + 1, -rw / 2 + 0.5]), 0xbcd3e6, 0.35);
  p.poly(P(rrectPts((rf + rb) / 2, 0, rf - rb, rw, 2.2, 2)), shade(color, spec === CAR_TYPES.van ? 0.08 : -0.08));
  if (spec.bed) p.poly(P(rrectPts(X(0.78), 0, (0.4) * L, W * 0.8, 1.5, 1)), 0x2a2c30, 1, shade(color, -0.4), 1);
  // Mirrors.
  const mx = ws - 1.4;
  p.poly(P([mx, -W / 2, mx - 2.4, -W / 2 - 2.2, mx - 3.4, -W / 2 - 1.6, mx - 2.4, -W / 2]), shade(color, -0.25));
  p.poly(P([mx, W / 2, mx - 2.4, W / 2 + 2.2, mx - 3.4, W / 2 + 1.6, mx - 2.4, W / 2]), shade(color, -0.25));
  // Lamps.
  const hl = L / 2 - 1.2;
  p.poly(P(rectPts(hl - 1.4, -W / 2 + 1.4, hl + 0.6, -W / 2 + 5)), 0xfff2c8);
  p.poly(P(rectPts(hl - 1.4, W / 2 - 5, hl + 0.6, W / 2 - 1.4)), 0xfff2c8);
  const tl = -L / 2 + 0.6;
  const tail = o.brake ? 0xff3030 : 0x8a1414;
  p.poly(P(rectPts(tl, -W / 2 + 1.4, tl + 1.8, -W / 2 + 5.2)), tail);
  p.poly(P(rectPts(tl, W / 2 - 5.2, tl + 1.8, W / 2 - 1.4)), tail);
  if (o.reverse) {
    p.poly(P(rectPts(tl, -W / 2 + 5.4, tl + 1.4, -W / 2 + 7.2)), 0xffffff);
    p.poly(P(rectPts(tl, W / 2 - 7.2, tl + 1.4, W / 2 - 5.4)), 0xffffff);
  }
  if (o.brake) {
    for (const [lx, ly] of [[tl - 5, -W / 2 + 3.3], [tl - 5, W / 2 - 3.3]]) {
      const q = xform(x, y, a, [lx, ly]);
      p.circle(q[0], q[1], 5, 0xff2020, 0.16);
    }
  }
  if (o.reverse) {
    const q = xform(x, y, a, [tl - 14, 0]);
    p.poly(xform(q[0], q[1], a, [12, -8, 12, 8, -14, 16, -14, -16]), 0xffffff, 0.07);
  }
  if (o.hazard && Math.floor(o.hazard * 3) % 2 === 0) {
    for (const [lx, ly] of [[hl, -W / 2 + 2], [hl, W / 2 - 2], [tl + 1, -W / 2 + 2], [tl + 1, W / 2 - 2]]) {
      const q = xform(x, y, a, [lx, ly]);
      p.circle(q[0], q[1], 4.5, 0xffa22a, 0.35);
      p.circle(q[0], q[1], 1.8, 0xffd27a, 1);
    }
  }
}

// ── Trailers, top-down ───────────────────────────────────────────────────
function drawTrailerTop(p, key, x, y, a, o = {}) {
  const t = TRAILERS[key];
  const L = t.len * M, W = t.wid * M;
  const P = (pts) => xform(x, y, a, pts);
  const cx = (L / 2 + t.bar * M);
  const ax = t.axle * M, wr = t.wheelR * M, ww = t.wheelW * M, wo = (t.wid / 2 + t.wheelOut) * M;
  p.poly(xform(x + 1.8, y + 2.6, a, rrectPts(0, 0, L + 1, W + 1, key === "caravan" ? 5 : 1.5)), 0x000000, 0.26);
  // Drawbar A-frame and coupler.
  p.line(P([L / 2 - 2, -W * 0.3, cx - 1.5, 0, L / 2 - 2, W * 0.3]), 0x2a2e35, 2.2);
  p.line(P([L / 2, 0, cx - 1, 0]), 0x2a2e35, 1.6);
  const cp = xform(x, y, a, [cx, 0]);
  p.circle(cp[0], cp[1], 2.1, 0x1c1f24, 1, 0x6b7280, 0.8);
  const jw = xform(x, y, a, [L / 2 + t.bar * M * 0.45, W * 0.12]);
  p.circle(jw[0], jw[1], 1.4, 0x4b5563);
  // Wheels (from the bodies when given).
  const tyres = () => {
    if (o.wheels) {
      for (const w of o.wheels) p.poly(xform(w.x, w.y, w.a, rrectPts(0, 0, wr * 2, ww, 1, 1)), 0x141416, 1, 0x3a3d42, 0.5);
    } else {
      for (const s of [-1, 1]) p.poly(P(rrectPts(ax, s * wo, wr * 2, ww, 1, 1)), 0x141416);
    }
  };
  if (key !== "caravan") {
    for (const s of [-1, 1]) p.poly(P(rrectPts(ax, s * wo, wr * 2.6, ww + 2.6, 1.2, 1)), 0x3b4048, 1, 0x1d2025, 0.6);
    tyres();
  } else tyres();
  if (key === "box") {
    p.poly(P(rectPts(-L / 2, -W / 2, L / 2, W / 2)), 0x59606a, 1, 0x2b3038, 1);
    p.poly(P(rectPts(-L / 2 + 1.6, -W / 2 + 1.6, L / 2 - 1.6, W / 2 - 1.6)), 0x8a6a45);
    for (let i = 1; i < 5; i++) {
      const yy = -W / 2 + 1.6 + (W - 3.2) * (i / 5);
      p.line(P([-L / 2 + 1.6, yy, L / 2 - 1.6, yy]), 0x6f5334, 0.6, 0.8);
    }
    // Tarp-covered load.
    p.poly(P(rrectPts(-1, 0, L * 0.72, W * 0.7, 3, 2)), 0x2f6d57, 1, 0x1d4536, 0.8);
    p.line(P([-L * 0.28, -W * 0.35, L * 0.26, W * 0.35]), 0xd6c38a, 0.7, 0.8);
    p.line(P([-L * 0.28, W * 0.35, L * 0.26, -W * 0.35]), 0xd6c38a, 0.7, 0.8);
    const tl = -L / 2 + 0.2;
    p.poly(P(rectPts(tl, -W / 2 + 0.4, tl + 1.4, -W / 2 + 3.6)), o.brake ? 0xff3030 : 0x8a1414);
    p.poly(P(rectPts(tl, W / 2 - 3.6, tl + 1.4, W / 2 - 0.4)), o.brake ? 0xff3030 : 0x8a1414);
  } else if (key === "boat") {
    p.line(P([-L / 2, -W * 0.28, L / 2 + 2, -W * 0.1]), 0x3a3f47, 1.6);
    p.line(P([-L / 2, W * 0.28, L / 2 + 2, W * 0.1]), 0x3a3f47, 1.6);
    p.poly(P(rectPts(L / 2 + 1, -1.8, L / 2 + 4, 1.8)), 0x2a2e35);
    // Hull: pointed bow at the front.
    const hull = [L / 2 + 2, 0, L * 0.28, W / 2, -L / 2 + 1, W / 2 - 0.6, -L / 2 + 1, -W / 2 + 0.6, L * 0.28, -W / 2];
    p.poly(P(hull), 0xf4f3ee, 1, 0x1f5a8a, 1.6);
    p.poly(P([L * 0.3, -W * 0.34, L * 0.3, W * 0.34, -L * 0.2, W * 0.34, -L * 0.2, -W * 0.34]), 0xd8d4c8);
    p.poly(P([L * 0.16, -W * 0.3, L * 0.22, 0, L * 0.16, W * 0.3, L * 0.1, W * 0.3, L * 0.14, 0, L * 0.1, -W * 0.3]), 0x2c4a63, 0.9);
    p.poly(P(rrectPts(-L * 0.08, 0, L * 0.22, W * 0.5, 1.5, 1)), 0x6c5a44);
    p.poly(P(rectPts(-L / 2 - 3.5, -2.4, -L / 2 + 1, 2.4)), 0x1c1d20);
  } else {
    // Caravan: rounded white box, roof lights, a stripe.
    p.poly(P(rrectPts(0, 0, L, W, 4.5, 3)), 0xf3f1ea, 1, 0x9a968c, 0.8);
    p.poly(P(rrectPts(L / 2 - 3, 0, 3.2, W - 6, 1.4, 1)), 0x28323d);
    p.poly(P(rrectPts(-L * 0.1, 0, L * 0.18, W * 0.42, 1.5, 1)), 0xd9dde2, 1, 0xa7adb5, 0.6);
    p.poly(P(rrectPts(L * 0.2, 0, L * 0.1, W * 0.3, 1.2, 1)), 0xd9dde2, 1, 0xa7adb5, 0.6);
    p.line(P([-L / 2 + 3, -W / 2 + 0.6, L / 2 - 4, -W / 2 + 0.6]), 0xc0392b, 1.2);
    p.line(P([-L / 2 + 3, W / 2 - 0.6, L / 2 - 4, W / 2 - 0.6]), 0xc0392b, 1.2);
    p.poly(P(rrectPts(L / 2 + 5, 0, 5, 7, 1, 1)), 0xe7e2d6, 1, 0x9a968c, 0.6);
    const tl = -L / 2 + 0.3;
    p.poly(P(rectPts(tl, -W / 2 + 1, tl + 1.4, -W / 2 + 4.6)), o.brake ? 0xff3030 : 0x8a1414);
    p.poly(P(rectPts(tl, W / 2 - 4.6, tl + 1.4, W / 2 - 1)), o.brake ? 0xff3030 : 0x8a1414);
  }
}

function coneTop(p, c) {
  const b = c.body, x = b.position.x, y = b.position.y;
  if (c.down) {
    const a = c.tipA;
    p.poly(xform(x, y, a, [-3, -3.2, -3, 3.2, 3, 3.2, 3, -3.2]), 0x222222, 0.6);
    p.poly(xform(x, y, a, [-2.6, -2.8, 7, -1, 7, 1, -2.6, 2.8]), 0xff7a1a);
    p.poly(xform(x, y, a, [1, -2.2, 3, -1.8, 3, 1.8, 1, 2.2]), 0xf7f7f2);
  } else {
    p.poly(xform(x, y, b.rotation, [-3.4, -3.4, 3.4, -3.4, 3.4, 3.4, -3.4, 3.4]), 0x2a2a2a);
    p.circle(x, y, 2.8, 0xff7a1a);
    p.circle(x, y, 1.9, 0xf7f7f2);
    p.circle(x, y, 1.1, 0xff7a1a);
  }
}

// ── Ground canvas (surface + paint) ──────────────────────────────────────
function speckle(ctx, rnd, n, x0, y0, x1, y1, colors, size = 1.4, alpha = 0.08) {
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.5 + rnd());
    ctx.fillStyle = colors[i % colors.length];
    const s = size * (0.5 + rnd());
    ctx.fillRect(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), s, s);
  }
  ctx.globalAlpha = 1;
}

function paintBay(ctx, b, color, width = 1.5) {
  // Two side lines and the back line (the open end faces `a`).
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.a);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(b.l / 2, -b.w / 2); ctx.lineTo(-b.l / 2, -b.w / 2); ctx.lineTo(-b.l / 2, b.w / 2); ctx.lineTo(b.l / 2, b.w / 2);
  ctx.stroke();
  ctx.restore();
}

function paintArrow(ctx, x, y, a, color, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(14, 0); ctx.lineTo(4, -8); ctx.lineTo(4, -3); ctx.lineTo(-12, -3); ctx.lineTo(-12, 3); ctx.lineTo(4, 3); ctx.lineTo(4, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGround(ctx, lvl) {
  const rnd = lcg(lvl.id.length * 7919 + 17);
  const g = lvl.ground;
  if (g === "lot" || g === "deck") {
    const base = g === "lot" ? "#45484d" : "#7a7d80";
    ctx.fillStyle = base;
    ctx.fillRect(-40, -40, VIEW_W + 80, VIEW_H + 80);
    speckle(ctx, rnd, 9000, 0, 0, VIEW_W, VIEW_H, g === "lot" ? ["#2c2e31", "#6a6d72", "#55585d"] : ["#5a5d60", "#9a9d9f", "#8a8a84"], 1.3, g === "lot" ? 0.18 : 0.12);
    if (g === "deck") {
      ctx.strokeStyle = "rgba(40,42,46,0.35)";
      ctx.lineWidth = 1;
      for (let x = 124; x < VIEW_W; x += 124) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 170); ctx.lineTo(VIEW_W, 170); ctx.moveTo(0, 354); ctx.lineTo(VIEW_W, 354); ctx.stroke();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#e8c547";
      ctx.font = "900 120px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("P2", 80, 338);
      ctx.globalAlpha = 1;
    }
    // Oil stains in the bays.
    for (const b of lvl.bays) {
      if (rnd() < 0.55) {
        ctx.globalAlpha = 0.1 + rnd() * 0.12;
        ctx.fillStyle = "#15161a";
        ctx.beginPath();
        ctx.ellipse(b.x + (rnd() - 0.5) * 8, b.y + (rnd() - 0.5) * 16, 5 + rnd() * 6, 4 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    const paint = g === "lot" ? "rgba(236,236,230,0.9)" : "rgba(236,200,70,0.95)";
    for (const b of lvl.bays) paintBay(ctx, b, paint);
    if (g === "lot") {
      for (const [x, y, a] of [[250, 250, Math.PI / 2], [680, 250, -Math.PI / 2], [250, 330, Math.PI / 2], [680, 170, -Math.PI / 2]]) paintArrow(ctx, x, y, a, "rgba(236,236,230,0.75)");
      // Zebra to the shelter.
      ctx.fillStyle = "rgba(236,236,230,0.8)";
      for (let i = 0; i < 7; i++) ctx.fillRect(398 + i * 12, 424, 6, 16);
      // Handicap bay symbol near the target row.
      ctx.fillStyle = "rgba(90,140,220,0.8)";
      ctx.fillRect(30, 390, 32, 26);
    } else {
      for (const [x, y, a] of [[300, 150, 0], [620, 150, 0], [300, 372, Math.PI], [620, 372, Math.PI]]) paintArrow(ctx, x, y, a, "rgba(236,200,70,0.8)", 1.1);
      // Hatched zones round the median ends.
      ctx.strokeStyle = "rgba(236,200,70,0.7)";
      ctx.lineWidth = 1.5;
      for (const cx of [110, 790]) {
        ctx.save(); ctx.beginPath(); ctx.rect(cx - 30, 238, 60, 48); ctx.clip();
        for (let k = -60; k < 60; k += 8) { ctx.beginPath(); ctx.moveTo(cx + k, 238); ctx.lineTo(cx + k + 48, 286); ctx.stroke(); }
        ctx.restore();
        ctx.strokeRect(cx - 30, 238, 60, 48);
      }
    }
  } else if (g === "marina") {
    ctx.fillStyle = "#99958b";
    ctx.fillRect(-40, -40, VIEW_W + 80, VIEW_H + 80);
    speckle(ctx, rnd, 7000, 0, 150, VIEW_W, VIEW_H, ["#7c786f", "#b5b1a7", "#8a857a"], 1.4, 0.16);
    ctx.strokeStyle = "rgba(60,58,52,0.25)";
    ctx.lineWidth = 1;
    for (let x = 0; x < VIEW_W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 154); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
    for (let y = 214; y < VIEW_H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke(); }
    // Water.
    const wg = ctx.createLinearGradient(0, 0, 0, 150);
    wg.addColorStop(0, "#1c5873");
    wg.addColorStop(1, "#2d7894");
    ctx.fillStyle = wg;
    ctx.fillRect(-40, -40, VIEW_W + 80, 190);
    ctx.strokeStyle = "rgba(200,235,245,0.18)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) {
      const x = rnd() * VIEW_W, y = rnd() * 140;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y - 2, x + 12, y); ctx.stroke();
    }
    // Slipway with grooves.
    const r = lvl.ramp;
    ctx.fillStyle = "#86826f";
    ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    const rg2 = ctx.createLinearGradient(0, r.y0, 0, r.y0 + 50);
    rg2.addColorStop(0, "rgba(40,90,110,0.55)");
    rg2.addColorStop(1, "rgba(40,90,110,0)");
    ctx.fillStyle = rg2;
    ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 50);
    ctx.strokeStyle = "rgba(50,48,40,0.45)";
    for (let y = r.y0 + 4; y < r.y1; y += 5) { ctx.beginPath(); ctx.moveTo(r.x0 + 2, y); ctx.lineTo(r.x1 - 2, y); ctx.stroke(); }
    ctx.fillStyle = "rgba(90,130,70,0.35)";
    ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, 12);
    for (const b of lvl.bays) paintBay(ctx, b, "rgba(236,236,230,0.85)");
    ctx.fillStyle = "rgba(236,200,70,0.9)";
    for (let x = 0; x < VIEW_W; x += 16) ctx.fillRect(x, 156, 9, 2.4);
    paintArrow(ctx, 428, 196, -Math.PI / 2, "rgba(236,236,230,0.6)", 1);
  } else if (g === "street") {
    ctx.fillStyle = "#a39e94";
    ctx.fillRect(-40, -40, VIEW_W + 80, VIEW_H + 80);
    ctx.strokeStyle = "rgba(90,86,78,0.35)";
    ctx.lineWidth = 0.8;
    for (let x = 0; x < VIEW_W; x += 16) { ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x, 64); ctx.moveTo(x, 436); ctx.lineTo(x, VIEW_H + 40); ctx.stroke(); }
    for (let y = 0; y < 64; y += 16) { ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(VIEW_W + 40, y); ctx.stroke(); }
    for (let y = 448; y < VIEW_H + 40; y += 16) { ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(VIEW_W + 40, y); ctx.stroke(); }
    ctx.fillStyle = "#3a3d42";
    ctx.fillRect(-40, 64, VIEW_W + 80, 372);
    speckle(ctx, rnd, 8000, 0, 64, VIEW_W, 436, ["#26282b", "#5d6065", "#4a4d52"], 1.3, 0.2);
    // Patched asphalt.
    ctx.fillStyle = "rgba(28,30,33,0.45)";
    ctx.fillRect(360, 180, 70, 30);
    ctx.fillRect(760, 350, 50, 60);
    ctx.fillStyle = "rgba(236,236,230,0.85)";
    for (let x = 10; x < VIEW_W; x += 44) ctx.fillRect(x, 248, 24, 3);
    ctx.fillStyle = "rgba(236,236,230,0.7)";
    for (let x = 0; x < VIEW_W; x += 20) { ctx.fillRect(x, 106, 10, 1.6); ctx.fillRect(x, 393, 10, 1.6); }
    ctx.fillStyle = "rgba(236,200,70,0.9)";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save(); ctx.translate(450, 84); ctx.fillText("BUS STOP", 0, 0); ctx.restore();
    ctx.fillRect(400, 104, 100, 2);
    for (const d of lvl.decor ?? []) {
      if (d.kind !== "manhole") continue;
      ctx.fillStyle = "#2b2d30"; ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(120,120,120,0.6)"; ctx.lineWidth = 0.8;
      for (let k = -5; k <= 5; k += 2.5) { ctx.beginPath(); ctx.moveTo(d.x - 5, d.y + k); ctx.lineTo(d.x + 5, d.y + k); ctx.stroke(); }
    }
    // Roadworks hatch.
    ctx.fillStyle = "rgba(200,120,40,0.18)";
    ctx.fillRect(583, 262, 114, 56);
  } else if (g === "camp") {
    ctx.fillStyle = "#5d8b3b";
    ctx.fillRect(-40, -40, VIEW_W + 80, VIEW_H + 80);
    speckle(ctx, rnd, 14000, -20, -20, VIEW_W + 20, VIEW_H + 20, ["#3f6d27", "#7aa84d", "#4d7c30", "#8fbf5a"], 2.2, 0.22);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = ["#f5f0d0", "#f2c94c", "#e8e1f5"][i % 3];
      ctx.globalAlpha = 0.7;
      ctx.fillRect(rnd() * VIEW_W, rnd() * VIEW_H, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
    // Worn pitches.
    for (const pt of lvl.pitches ?? []) {
      ctx.fillStyle = "rgba(160,150,90,0.25)";
      ctx.beginPath(); ctx.ellipse(pt.x, pt.y - 4, 28, 44, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Gravel lanes.
    for (const r of lvl.roads) {
      ctx.fillStyle = "#b2a27c";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, 16);
      else ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      ctx.fill();
    }
    for (const r of lvl.roads) speckle(ctx, rnd, Math.round((r.x1 - r.x0) * (r.y1 - r.y0) / 6), r.x0 + 3, r.y0 + 3, r.x1 - 3, r.y1 - 3, ["#8c7d5a", "#d2c49e", "#9d8f6a"], 1.6, 0.35);
    ctx.strokeStyle = "rgba(120,100,60,0.3)";
    ctx.lineWidth = 3;
    for (const r of lvl.roads) {
      const horiz = r.x1 - r.x0 > r.y1 - r.y0;
      ctx.beginPath();
      if (horiz) { const y = (r.y0 + r.y1) / 2; ctx.moveTo(r.x0 + 12, y - 9); ctx.lineTo(r.x1 - 12, y - 9); ctx.moveTo(r.x0 + 12, y + 9); ctx.lineTo(r.x1 - 12, y + 9); }
      else { const x = (r.x0 + r.x1) / 2; ctx.moveTo(x - 9, r.y0 + 12); ctx.lineTo(x - 9, r.y1 - 12); ctx.moveTo(x + 9, r.y0 + 12); ctx.lineTo(x + 9, r.y1 - 12); }
      ctx.stroke();
    }
    // Pitch number posts are painted on little boards.
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const pt of lvl.pitches ?? []) {
      ctx.fillStyle = "#6b4a2a"; ctx.fillRect(pt.x - 7, 346, 14, 11);
      ctx.fillStyle = "#f4ead0"; ctx.fillText(String(pt.n), pt.x, 352);
    }
  }
}

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined" && typeof document === "undefined") return new OffscreenCanvas(w, h);
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

// ── Static obstacle layers ───────────────────────────────────────────────
function drawStaticTop(p, def, lvl) {
  const k = def.kind, x = def.x, y = def.y, a = def.a ?? 0;
  const box = (w, h) => xform(x, y, a, rectPts(-w / 2, -h / 2, w / 2, h / 2));
  if (k === "boundary") {
    const col = lvl.ground === "camp" ? 0x6f5236 : lvl.ground === "street" ? 0xd84b3a : 0x8c8f94;
    p.poly(box(def.w, def.h), col, 1, shade(col, -0.35), 1);
    if (lvl.ground === "street") {
      for (let yy = -def.h / 2; yy < def.h / 2; yy += 16) p.poly(xform(x, y, 0, rectPts(-def.w / 2, yy, def.w / 2, yy + 8)), 0xf2f2ee);
    }
  } else if (k === "pillar") {
    p.poly(box(def.s + 2, def.s + 2), 0x1d1d1d);
    p.poly(box(def.s + 2, def.s + 2), 0xe8c547, 1);
    p.poly(box(def.s - 1, def.s - 1), 0xa3a6aa, 1, 0x6d7074, 0.8);
  } else if (k === "bollard") {
    p.circle(x + 1, y + 1.5, def.r + 0.6, 0x000000, 0.3);
    p.circle(x, y, def.r, 0xf2c230, 1, 0x3a3320, 0.8);
    p.circle(x, y, def.r * 0.45, 0x2b2b2b);
  } else if (k === "lamp") {
    p.circle(x + 1, y + 1.5, 3, 0x000000, 0.3);
    p.circle(x, y, 2.6, 0x3d434b, 1, 0x1b1e22, 0.8);
  } else if (k === "hydrant") {
    p.circle(x, y, 2.8, 0xc62d2d, 1, 0x5a1010, 0.8);
    p.circle(x, y, 1.1, 0xe0b0b0);
  } else if (k === "bin") {
    p.circle(x, y, 4.5, 0x2f5a3a, 1, 0x173020, 0.8);
    p.line([x - 3, y, x + 3, y], 0x173020, 0.8);
  } else if (k === "barrel") {
    p.circle(x, y, 4.2, 0x2b5aa0, 1, 0x132a50, 0.8);
    p.circle(x, y, 2.4, null, 1, 0x7fa4d8, 0.7);
  } else if (k === "tree") {
    p.circle(x, y, Math.max(3, def.r * 0.24), 0x5a3d24, 1, 0x2d1d10, 0.8);
  } else if (k === "firepit") {
    p.circle(x, y, 7, 0x6d6a64, 1, 0x3d3b37, 1.4);
    p.circle(x, y, 4.2, 0x2a211b);
    p.circle(x, y, 2, 0xd9702a, 0.8);
  } else if (k === "table") {
    p.poly(box(12, 20), 0x8a6238, 1, 0x4d351d, 0.8);
    p.poly(xform(x, y, a, rectPts(-9, -9, -7, 9)), 0x6b4a2a);
    p.poly(xform(x, y, a, rectPts(7, -9, 9, 9)), 0x6b4a2a);
  } else if (k === "planter") {
    p.poly(box(def.w, def.h), 0xa7a39a, 1, 0x6e6a62, 1);
    p.poly(box(def.w - 4, def.h - 4), 0x4b3a2a);
    for (let i = 0; i < def.w / 10; i++) p.circle(x - def.w / 2 + 6 + i * 10, y + ((i * 7) % 3) - 1, 4.2, i % 2 ? 0x4f8a36 : 0x3f7a2c);
  } else if (k === "shelter") {
    p.poly(box(def.w, def.h), 0x9fb8c8, 0.45, 0x5a6a78, 1);
  } else if (k === "trolleys") {
    p.poly(box(def.w, def.h), 0x5b6570, 1, 0x2e343a, 1);
    for (let i = 0; i < 6; i++) p.poly(xform(x, y, a, rectPts(-def.w / 2 + 2, -def.h / 2 + 3 + i * 7.3, def.w / 2 - 2, -def.h / 2 + 7 + i * 7.3)), 0xb9c2cc, 1, 0x6b737c, 0.5);
  } else if (k === "wall" || k === "jetty" || k === "quay") {
    const col = k === "wall" ? 0x9a9da2 : 0xb7b2a6;
    p.poly(box(def.w, def.h), col, 1, shade(col, -0.35), 1);
  } else if (k === "barrier") {
    p.poly(box(def.w, def.h), 0xf2f2ee, 1, 0x7a1d1d, 0.8);
    const horiz = def.w >= def.h;
    const n = Math.floor((horiz ? def.w : def.h) / 10);
    for (let i = 0; i < n; i += 2) {
      const o0 = -(horiz ? def.w : def.h) / 2 + i * 10;
      p.poly(horiz ? xform(x, y, a, rectPts(o0, -def.h / 2, o0 + 10, def.h / 2)) : xform(x, y, a, rectPts(-def.w / 2, o0, def.w / 2, o0 + 10)), 0xd33a2c);
    }
  } else if (k === "crates") {
    p.poly(box(def.w, def.h), 0x9a7040, 1, 0x4d3518, 1);
    for (let i = 1; i < 3; i++) p.line(xform(x, y, a, [-def.w / 2 + (def.w * i) / 3, -def.h / 2, -def.w / 2 + (def.w * i) / 3, def.h / 2]), 0x5a3f1e, 0.8);
    p.line(xform(x, y, a, [-def.w / 2, -def.h / 2, def.w / 2, def.h / 2]), 0x5a3f1e, 0.6, 0.6);
  } else if (k === "kiosk" || k === "block") {
    const col = k === "kiosk" ? 0x8b4a3c : 0x8a8176;
    p.poly(box(def.w + 2, def.h + 2), 0x000000, 0.25);
    p.poly(box(def.w, def.h), col, 1, shade(col, -0.35), 1);
    p.line(xform(x, y, a, [-def.w / 2, 0, def.w / 2, 0]), shade(col, -0.3), 1.2);
    p.poly(xform(x, y, a, rectPts(def.w / 2 - 14, -def.h / 2 + 4, def.w / 2 - 6, -def.h / 2 + 12)), 0x4a4f55);
  } else if (k === "kerb") {
    p.poly(box(def.w, def.h), 0xc9c5bc, 1, 0x8a867e, 0.8);
    for (let xx = -def.w / 2; xx < def.w / 2; xx += 12) p.line(xform(x, y, a, [xx, -def.h / 2, xx, def.h / 2]), 0x9a968e, 0.5);
  } else if (k === "hedge") {
    p.poly(box(def.w + 2, def.h + 2), 0x1f3d17, 1);
    p.poly(box(def.w, def.h), 0x2f5f22);
    const long = Math.max(def.w, def.h), horiz = def.w > def.h;
    for (let i = 0; i < long / 6; i++) {
      const o = -long / 2 + 3 + i * 6;
      const q = horiz ? xform(x, y, a, [o, ((i * 5) % 3) - 1]) : xform(x, y, a, [((i * 5) % 3) - 1, o]);
      p.circle(q[0], q[1], Math.min(def.w, def.h) * 0.55, i % 2 ? 0x3d7a2a : 0x356d25);
    }
  } else if (k === "vancaravan") {
    drawTrailerTop(p, "caravan", x, y, a);
  } else if (k === "tent") {
    const col = def.w > 28 ? 0xd9822b : 0x2f7fbf;
    p.poly(box(def.w + 4, def.h + 4), 0x000000, 0.22);
    p.poly(xform(x, y, a, [-def.w / 2, -def.h / 2, def.w / 2, -def.h / 2, def.w / 2, def.h / 2, -def.w / 2, def.h / 2]), col, 1, shade(col, -0.4), 1);
    p.poly(xform(x, y, a, [-def.w / 2, -def.h / 2, 0, -def.h / 2, 0, def.h / 2, -def.w / 2, def.h / 2]), shade(col, -0.18));
    p.line(xform(x, y, a, [0, -def.h / 2 - 4, 0, def.h / 2 + 4]), 0x2a2a2a, 1);
  }
}

function drawOverheadTop(p, def) {
  const k = def.kind, x = def.x, y = def.y, a = def.a ?? 0;
  if (k === "tree") {
    const r = def.r;
    p.circle(x + 4, y + 6, r, 0x000000, 0.22);
    const cols = [0x2f5f22, 0x3d7a2a, 0x4d8c34, 0x5f9e3f];
    for (let i = 0; i < 7; i++) {
      const ang = i * 2.3 + x * 0.01, d = i === 0 ? 0 : r * 0.45;
      p.circle(x + Math.cos(ang) * d, y + Math.sin(ang) * d, r * (i === 0 ? 0.8 : 0.55), cols[i % cols.length], 0.95);
    }
    p.circle(x - r * 0.25, y - r * 0.3, r * 0.3, 0x7fb257, 0.5);
  } else if (k === "lamp") {
    p.line([x, y, x + 9, y], 0x3d434b, 1.6);
    p.poly(xform(x + 10, y, a, rectPts(-3, -2.2, 3, 2.2)), 0x2b3036, 1, 0x111316, 0.6);
    p.circle(x + 10, y, 1.4, 0xfff0c0);
  } else if (k === "shelter") {
    p.poly(xform(x + 2, y + 3, a, rectPts(-def.w / 2, -def.h / 2, def.w / 2, def.h / 2)), 0x000000, 0.22);
    p.poly(xform(x, y, a, rectPts(-def.w / 2, -def.h / 2, def.w / 2, def.h / 2)), 0x3f4a55, 0.9, 0x20262c, 1);
    p.line(xform(x, y, a, [-def.w / 2 + 4, 0, def.w / 2 - 4, 0]), 0x6a7885, 1);
  }
}

// Baked layers for the current level, rebuilt when the level changes.
let _layers = null;           // { gen, ground, statics, overhead, scale }
function ensureLayers(scale = 2) {
  if (_layers && _layers.gen === _levelGen && _layers.scale === scale) return _layers;
  const W = VIEW_W * scale, H = VIEW_H * scale;
  const ground = makeCanvas(W, H), statics = makeCanvas(W, H), overhead = makeCanvas(W, H);
  if (!ground) return null;
  let ctx = ground.getContext("2d");
  ctx.scale(scale, scale);
  drawGround(ctx, _level);
  ctx = statics.getContext("2d");
  ctx.scale(scale, scale);
  const sp = new CanvasPainter(ctx);
  for (const s of _statics) drawStaticTop(sp, s.def, _level);
  // Boundary walls are bodies with no level def entry.
  for (let i = 0; i < _space.bodies.length; i++) {
    const b = _space.bodies.at(i);
    const d = b.userData?._static;
    if (d?.kind === "boundary") drawStaticTop(sp, d, _level);
  }
  for (const d of _level.decor ?? []) {
    if (d.kind === "pontoon") sp.poly(xform(d.x, d.y, 0, rectPts(-d.w / 2, -d.h / 2, d.w / 2, d.h / 2)), 0x8a6a45, 1, 0x4d3518, 1);
    if (d.kind === "boat") drawMooredBoatTop(sp, d);
  }
  ctx = overhead.getContext("2d");
  ctx.scale(scale, scale);
  const op = new CanvasPainter(ctx);
  for (const s of _statics) drawOverheadTop(op, s.def);
  _layers = { gen: _levelGen, ground, statics, overhead, scale, pixiTex: null };
  return _layers;
}

function drawMooredBoatTop(p, d) {
  const L = d.len, W = L * 0.34;
  const P = (pts) => xform(d.x, d.y, d.a, pts);
  p.poly(P([L / 2, 0, L * 0.2, W / 2, -L / 2, W / 2 - 1, -L / 2, -W / 2 + 1, L * 0.2, -W / 2]), 0xf4f3ee, 1, 0x1f3a5a, 1.4);
  p.poly(P(rrectPts(-L * 0.05, 0, L * 0.34, W * 0.56, 2, 1)), 0xd8d4c8, 1, 0x9a968c, 0.6);
  p.poly(P([L * 0.14, -W * 0.28, L * 0.2, 0, L * 0.14, W * 0.28]), 0x2c4a63, 0.9);
}

// ── Dynamic 2D pass (every frame) ────────────────────────────────────────
function wheelPoses(ws) {
  return ws.map((w) => ({ x: w.body.position.x, y: w.body.position.y, a: w.body.rotation }));
}

function drawBayHighlight(p, time) {
  const bay = _level.bay;
  const ps = _parkState;
  const ok = ps && ps.inside && ps.aligned;
  const col = ok ? 0x7ee787 : 0xffd166;
  const pulse = 0.55 + 0.45 * Math.sin(time * 4);
  const P = (pts) => xform(bay.x, bay.y, bay.a, pts);
  p.poly(P(rectPts(-bay.l / 2, -bay.w / 2, bay.l / 2, bay.w / 2)), col, ok ? 0.22 : 0.1 + 0.06 * pulse);
  const hl = bay.l / 2, hw = bay.w / 2, c = 7;
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    p.line(P([sx * hl, sy * (hw - c), sx * hl, sy * hw, sx * (hl - c), sy * hw]), col, 2, 0.95);
  }
  // Chevrons pointing into the bay (the trailer goes in back first).
  for (let i = 0; i < 3; i++) {
    const off = hl - 10 - i * 10;
    const al = ok ? 0.5 : (0.25 + 0.5 * ((Math.sin(time * 5 - i * 0.9) + 1) / 2));
    p.line(P([off - 4, -6, off - 10, 0, off - 4, 6]), col, 1.6, al);
  }
  if (_hold > 0) {
    const f = clamp(_hold / PARK_HOLD, 0, 1);
    p.poly(P(rectPts(-hl, hw + 2, -hl + bay.l * f, hw + 4.5)), 0x7ee787, 0.95);
  }
}

function drawGuide(p) {
  if (!_showGuide || !_veh || _phase !== "play") return;
  if (_veh.gear > 0) return;
  const path = predictPath();
  for (let i = 0; i < path.length; i++) {
    const q = path[i];
    p.circle(q.x, q.y, i % 3 === 0 ? 1.8 : 1.1, 0x7fd8ff, 0.75 - (i / path.length) * 0.55);
  }
  const last = path[Math.min(path.length - 1, 14)];
  if (last) {
    const t = _veh.trailer.spec;
    const off = t.axle * M;
    const cx = last.x - Math.cos(last.a) * off, cy = last.y - Math.sin(last.a) * off;
    p.poly(xform(cx, cy, last.a, rectPts(-t.len / 2 * M, -t.wid / 2 * M, t.len / 2 * M, t.wid / 2 * M)), null, 1, 0x7fd8ff, 1, 0.5);
  }
}

function drawForces(p) {
  if (!_veh) return;
  const all = [..._veh.wheels, ..._veh.trailer.wheels];
  for (const w of all) {
    const b = w.body, a = b.rotation, c = Math.cos(a), s = Math.sin(a);
    const x = b.position.x, y = b.position.y;
    // Newtons of tyre force → px of arrow, scaled by the car's weight.
    const k = 0.9 / _veh.carMass;
    const fl = clamp(w.fLong * k, -26, 26), ft = clamp(w.fLat * k, -26, 26);
    if (Math.abs(fl) > 0.6) p.line([x, y, x + c * fl, y + s * fl], 0x5eea8a, 1.6, 0.95);
    if (Math.abs(ft) > 0.6) p.line([x, y, x - s * ft, y + c * ft], 0xff6b6b, 1.6, 0.95);
    if (w.front) p.line([x, y, x + c * 9, y + s * 9], 0xffffff, 0.8, 0.6);
  }
}

function drawDynamic(p, time) {
  drawBayHighlight(p, time);
  for (const c of _cones) coneTop(p, c);
  for (const pk of _parked) {
    const b = pk.body;
    drawCarTop(p, pk.spec, pk.color, b.position.x, b.position.y, b.rotation, { hazard: pk.hazard > 0 ? pk.hazard : 0 });
  }
  if (_veh) {
    const v = _veh, t = v.trailer, tb = t.body, c = v.chassis;
    const braking = v.braking || (v.holding && _phase === "play");
    drawTrailerTop(p, t.key, tb.position.x, tb.position.y, tb.rotation, { wheels: wheelPoses(t.wheels), brake: braking });
    drawCarTop(p, CAR_TYPES.wagon, PLAYER_COLOR, c.position.x, c.position.y, c.rotation, {
      wheels: wheelPoses(v.wheels), brake: braking, reverse: v.gear < 0 && _phase === "play", dent: v.dent,
    });
    const hb = xform(c.position.x, c.position.y, c.rotation, [v.hitchX, 0]);
    p.circle(hb[0], hb[1], 1.5, 0xc9ced6);
    drawGuide(p);
    if (_showForces) drawForces(p);
  }
}

// ── Overlay: HUD, menus, world cues ──────────────────────────────────────
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const C_PANEL = "rgba(10,14,22,0.78)";
const C_EDGE = "rgba(255,255,255,0.10)";
const C_TEXT = "#e8edf4";
const C_DIM = "#9aa6b6";
const C_GOLD = "#ffd166";
const C_OK = "#7ee787";
const C_BAD = "#ff6b6b";

let _mode3d = false;
let _drawFrame = 0;
let _frame3d = -1;
let _project = null;            // (x, y, z) → { x, y } screen, or null in 2D
let _buttons = [];              // clickable overlay rects for this frame
let _time = 0;                  // render clock (s)
let _pipRect = null;            // reversing camera inset (overlay coords)

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function panel(ctx, x, y, w, h, r = 8, fill = C_PANEL) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = C_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function text(ctx, s, x, y, size, color = C_TEXT, align = "left", weight = 600, base = "middle") {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(s, x, y);
}
function wrapText(ctx, s, x, y, maxW, lh, size, color, align = "center") {
  ctx.font = `500 ${size}px ${FONT}`;
  const words = s.split(" ");
  let line = "", yy = y;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      text(ctx, line, x, yy, size, color, align, 500);
      line = w; yy += lh;
    } else line = t;
  }
  if (line) text(ctx, line, x, yy, size, color, align, 500);
  return yy;
}
const fmtTime = (t) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`;
};
function star(ctx, x, y, r, filled, color = C_GOLD) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  if (filled) { ctx.fillStyle = color; ctx.fill(); }
  ctx.strokeStyle = filled ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
function button(ctx, id, label, key, x, y, w, h, primary = false) {
  panel(ctx, x, y, w, h, 7, primary ? "rgba(255,209,102,0.92)" : "rgba(40,48,62,0.92)");
  text(ctx, label, x + w / 2, y + h / 2 - (key ? 5 : 0), 14, primary ? "#1b1f27" : C_TEXT, "center", 800);
  if (key) text(ctx, key, x + w / 2, y + h / 2 + 10, 10, primary ? "#3b3320" : C_DIM, "center", 600);
  _buttons.push({ id, x, y, w, h });
}
function buttonAt(x, y) {
  for (const b of _buttons) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  return null;
}

function toScreen(x, y, z = 0) {
  if (_mode3d && _project) return _project(x, y, z);
  return { x, y };
}

// Car + trailer rig, centred on (x, y) and scaled to fit `maxW`.
function drawTrailerIcon(ctx, key, x, y, maxW) {
  const t = TRAILERS[key];
  const total = (t.len + t.bar + CAR.hitch + CAR.len) * M;
  const s = Math.min(1, maxW / total);
  ctx.save();
  ctx.translate(x - (total / 2 - t.len / 2 * M) * s, y);
  ctx.scale(s, s);
  const p = new CanvasPainter(ctx);
  drawTrailerTop(p, key, 0, 0, 0);
  drawCarTop(p, CAR_TYPES.wagon, PLAYER_COLOR, (t.len / 2 + t.bar + CAR.hitch + CAR.len / 2) * M, 0, 0);
  ctx.restore();
}
const fmtPar = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;

function drawTitle(ctx) {
  // Dark at the top and bottom, clear in the middle so the site shows.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, "rgba(6,9,15,0.8)");
  g.addColorStop(0.28, "rgba(6,9,15,0.25)");
  g.addColorStop(0.5, "rgba(6,9,15,0.12)");
  g.addColorStop(0.66, "rgba(6,9,15,0.55)");
  g.addColorStop(1, "rgba(6,9,15,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 12;
  text(ctx, "HITCH & PARK", VIEW_W / 2, 58, 50, C_TEXT, "center", 900);
  ctx.restore();
  text(ctx, "Back the trailer into the bay — nose out, square, stopped.", VIEW_W / 2, 96, 15, "#c3ccd8", "center", 600);
  button(ctx, "start", "START", "ENTER / SPACE", VIEW_W / 2 - 80, 196, 160, 46, true);
  const cw = 156, ch = 118, gap = 12;
  const x0 = (VIEW_W - (cw * LEVELS.length + gap * (LEVELS.length - 1))) / 2;
  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    const x = x0 + i * (cw + gap), y = 300;
    const sel = i === _levelIdx;
    panel(ctx, x, y, cw, ch, 10, sel ? "rgba(34,44,62,0.94)" : "rgba(14,19,29,0.86)");
    if (sel) {
      roundRect(ctx, x - 1.5, y - 1.5, cw + 3, ch + 3, 11);
      ctx.strokeStyle = C_GOLD;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    text(ctx, String(i + 1), x + 14, y + 20, 22, sel ? C_GOLD : C_DIM, "left", 900);
    text(ctx, L.name.toUpperCase(), x + 36, y + 15, 10, C_DIM, "left", 700);
    text(ctx, L.title, x + 36, y + 29, 14, C_TEXT, "left", 800);
    drawTrailerIcon(ctx, L.trailer, x + cw / 2, y + 60, cw - 24);
    text(ctx, `${TRAILERS[L.trailer].name} · par ${fmtPar(L.par)}`, x + cw / 2, y + 86, 10.5, C_DIM, "center", 600);
    const best = _best[i];
    for (let k = 0; k < 3; k++) star(ctx, x + cw / 2 - 20 + k * 20, y + 104, 7.5, best && best.stars > k);
    _buttons.push({ id: "lvl" + i, x, y, w: cw, h: ch });
  }
  text(ctx, "↑ W drive  ·  ↓ S brake / reverse  ·  ← → steer  ·  SPACE brake  ·  R restart  ·  G path guide  ·  F tyre forces", VIEW_W / 2, 444, 12, C_DIM, "center", 500);
  text(ctx, "3D:  C camera  ·  V reversing camera  ·  wheel zoom        Touch: hold and drag — up / down drives, left / right steers", VIEW_W / 2, 463, 12, C_DIM, "center", 500);
  text(ctx, "1 – 5 or ← → pick a site", VIEW_W / 2, 484, 11, "#6f7b8c", "center", 500);
}

function drawHud(ctx) {
  const L = _level;
  // Level + clock.
  panel(ctx, 10, 10, 258, 50);
  text(ctx, `${_levelIdx + 1}/${LEVELS.length}  ${L.name.toUpperCase()}`, 22, 25, 10, C_DIM, "left", 700);
  text(ctx, L.title, 22, 43, 16, C_TEXT, "left", 800);
  const over = _clock > L.par;
  text(ctx, fmtTime(_clock), 256, 27, 18, over ? "#ffb347" : C_TEXT, "right", 800);
  text(ctx, `par ${fmtPar(L.par)}`, 256, 45, 10, C_DIM, "right", 600);
  // Penalties.
  const bumps = _hits + _crashes;
  panel(ctx, 276, 10, 108, 50);
  text(ctx, "BUMPS", 290, 25, 9, C_DIM, "left", 700);
  text(ctx, String(bumps), 290, 44, 18, bumps ? C_BAD : C_TEXT, "left", 800);
  text(ctx, "CONES", 340, 25, 9, C_DIM, "left", 700);
  text(ctx, String(_coneHits), 340, 44, 18, _coneHits ? "#ffb347" : C_TEXT, "left", 800);

  // Instruments: steering wheel, hitch angle, gear + speed.
  const v = _veh;
  if (v) {
    const bx = 10, by = VIEW_H - 94;
    panel(ctx, bx, by, 272, 84);
    // Steering wheel (the rack angle times a 14:1 steering ratio).
    const sx = bx + 44, sy = by + 42;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(v.steer * 4.2);
    ctx.strokeStyle = "#c9d1dc";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(-24, 3); ctx.lineTo(24, 3); ctx.moveTo(0, 3); ctx.lineTo(0, 24); ctx.stroke();
    ctx.fillStyle = "#c9d1dc"; ctx.beginPath(); ctx.arc(0, 3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C_GOLD; ctx.fillRect(-2, -28, 4, 7);
    ctx.restore();
    // Hitch angle gauge.
    const hx = bx + 148, hy = by + 60, hr = 40;
    const rel = wrapPi(v.chassis.rotation - v.trailer.body.rotation);
    ctx.lineWidth = 6;
    const arc = (a0, a1, col) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(hx, hy, hr, -Math.PI / 2 + a0, -Math.PI / 2 + a1); ctx.stroke(); };
    arc(-HITCH_LIMIT, -0.9, "rgba(255,107,107,0.8)");
    arc(-0.9, -0.45, "rgba(255,179,71,0.7)");
    arc(-0.45, 0.45, "rgba(126,231,135,0.55)");
    arc(0.45, 0.9, "rgba(255,179,71,0.7)");
    arc(0.9, HITCH_LIMIT, "rgba(255,107,107,0.8)");
    const na = -Math.PI / 2 - rel;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(na) * (hr + 4), hy + Math.sin(na) * (hr + 4)); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill();
    const jk = Math.abs(rel) > 0.9;
    text(ctx, jk ? "JACK-KNIFE!" : `HITCH ${Math.round(Math.abs(rel) * 57.3)}°`, hx, by + 72, 9, jk ? C_BAD : C_DIM, "center", 800);
    // Gear + speed.
    const gx = bx + 236;
    const rev = v.gear < 0;
    text(ctx, rev ? "R" : "D", gx, by + 32, 30, rev ? "#ffffff" : C_OK, "center", 900);
    const kmh = Math.abs(v.speed) / M * 3.6;
    text(ctx, `${kmh.toFixed(0)} km/h`, gx, by + 62, 11, C_DIM, "center", 700);
    if (v.holding && _phase === "play") text(ctx, "HOLD", gx, by + 76, 8, "#6f7b8c", "center", 800);
  }

  // Parking status chips once the trailer is near the bay.
  const ps = _parkState;
  if (ps && ps.near && _phase === "play") {
    const chips = [["IN BAY", ps.inside], ["SQUARE", ps.aligned], ["STOPPED", ps.stopped]];
    const w = 82, gap = 8, x0 = VIEW_W / 2 - (w * 3 + gap * 2) / 2, y = VIEW_H - 44;
    chips.forEach(([label, ok], i) => {
      panel(ctx, x0 + i * (w + gap), y, w, 28, 14, ok ? "rgba(46,120,70,0.9)" : "rgba(20,26,36,0.85)");
      text(ctx, (ok ? "✓ " : "") + label, x0 + i * (w + gap) + w / 2, y + 14, 11, ok ? "#eaffea" : C_DIM, "center", 800);
    });
  }
  text(ctx, "R restart  ·  Esc sites  ·  G guide", VIEW_W - 12, VIEW_H - 12, 10, "rgba(200,210,225,0.55)", "right", 600, "alphabetic");
}

function drawIntro(ctx) {
  const L = _level;
  const k = clamp(1 - Math.max(0, _phaseT - 1.2) / 0.4, 0, 1);
  ctx.globalAlpha = k;
  const w = 480, h = 132, x = (VIEW_W - w) / 2, y = 150;
  panel(ctx, x, y, w, h, 12, "rgba(10,14,22,0.9)");
  text(ctx, `SITE ${_levelIdx + 1} · ${L.name.toUpperCase()}`, VIEW_W / 2, y + 22, 11, C_GOLD, "center", 800);
  text(ctx, L.title, VIEW_W / 2, y + 48, 26, C_TEXT, "center", 900);
  wrapText(ctx, L.brief, VIEW_W / 2, y + 78, w - 50, 17, 13, C_DIM);
  text(ctx, `${TRAILERS[L.trailer].name}  ·  par ${fmtPar(L.par)}`, VIEW_W / 2, y + h - 14, 11, "#6f7b8c", "center", 700);
  ctx.globalAlpha = 1;
}

function drawResult(ctx) {
  const r = _result;
  if (!r) return;
  const k = clamp(_phaseT / 0.35, 0, 1);
  ctx.fillStyle = `rgba(4,6,10,${0.45 * k})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 400, h = 292, x = (VIEW_W - w) / 2, y = 96 + (1 - k) * 20;
  ctx.globalAlpha = k;
  panel(ctx, x, y, w, h, 14, "rgba(12,17,27,0.95)");
  text(ctx, "PARKED", VIEW_W / 2, y + 30, 26, C_OK, "center", 900);
  for (let i = 0; i < 3; i++) {
    const pop = clamp((_phaseT - 0.3 - i * 0.22) / 0.2, 0, 1);
    star(ctx, VIEW_W / 2 - 46 + i * 46, y + 72, 17 * (0.6 + 0.4 * pop), r.stars > i && pop > 0);
  }
  const rows = [
    ["Time", `${fmtTime(r.time)}  (par ${fmtPar(_level.par)})`, r.timeBonus ? `+${r.timeBonus}` : "0"],
    ["Accuracy", `${Math.round(r.acc)} %`, `+${r.accBonus}`],
    ["Bumps", `${r.hits} bump${r.hits === 1 ? "" : "s"}, ${r.crashes} crash${r.crashes === 1 ? "" : "es"}`, r.hits || r.crashes ? `−${r.hits * 60 + r.crashes * 150}` : "0"],
    ["Cones", String(r.cones), r.cones ? `−${r.cones * 25}` : "0"],
  ];
  rows.forEach(([a, b, c], i) => {
    const yy = y + 110 + i * 24;
    text(ctx, a, x + 28, yy, 13, C_DIM, "left", 700);
    text(ctx, b, x + 118, yy, 13, C_TEXT, "left", 600);
    text(ctx, c, x + w - 28, yy, 13, c.startsWith("−") ? C_BAD : c === "0" ? C_DIM : C_OK, "right", 800);
  });
  ctx.strokeStyle = C_EDGE;
  ctx.beginPath(); ctx.moveTo(x + 24, y + 206); ctx.lineTo(x + w - 24, y + 206); ctx.stroke();
  text(ctx, "Score", x + 28, y + 224, 15, C_TEXT, "left", 800);
  text(ctx, String(r.score), x + w - 28, y + 224, 20, C_GOLD, "right", 900);
  if (r.isBest) text(ctx, "NEW BEST", x + w - 90, y + 224, 10, C_OK, "right", 900);
  const bw = 110, by = y + h - 56;
  button(ctx, "menu", "Sites", "ESC", x + 20, by, bw, 40);
  button(ctx, "retry", "Retry", "R", x + 20 + bw + 15, by, bw, 40);
  button(ctx, "next", _levelIdx === LEVELS.length - 1 ? "Site 1" : "Next site", "ENTER", x + w - 20 - bw, by, bw, 40, true);
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx) {
  for (const f of _floaters) {
    const s = toScreen(f.x, f.y, 24);
    if (!s) continue;
    const k = f.t / f.life;
    ctx.globalAlpha = clamp(1.4 - k * 1.4, 0, 1);
    text(ctx, f.text, s.x, s.y - k * 26, 13, f.color, "center", 900);
  }
  ctx.globalAlpha = 1;
}

function drawBanners(ctx) {
  for (const b of _banners) {
    const k = b.t / b.life;
    const a = clamp(Math.min(k * 6, (1 - k) * 3), 0, 1);
    ctx.globalAlpha = a;
    const s = 1 + (1 - Math.min(1, k * 5)) * 0.3;
    ctx.save();
    ctx.translate(VIEW_W / 2, 96);
    ctx.scale(s, s);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.font = `900 40px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawJoystick(ctx) {
  if (!_joy) return;
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(_joy.ox, _joy.oy, 56, 0, Math.PI * 2); ctx.stroke();
  const dx = clamp(_joy.x - _joy.ox, -56, 56), dy = clamp(_joy.y - _joy.oy, -56, 56);
  ctx.fillStyle = "rgba(255,209,102,0.85)";
  ctx.beginPath(); ctx.arc(_joy.ox + dx, _joy.oy + dy, 16, 0, Math.PI * 2); ctx.fill();
  text(ctx, "▲", _joy.ox, _joy.oy - 42, 12, "rgba(255,255,255,0.7)", "center", 800);
  text(ctx, "R", _joy.ox, _joy.oy + 42, 12, "rgba(255,255,255,0.7)", "center", 800);
  ctx.globalAlpha = 1;
}

function drawPipFrame(ctx) {
  const r = _pipRect;
  if (!r) return;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 5;
  ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  ctx.strokeStyle = "rgba(220,230,240,0.85)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  // Guide lines of a reversing camera: fixed distance bands plus the
  // steering-dependent bend.
  const cx = r.x + r.w / 2, by = r.y + r.h;
  const bend = -(_veh ? _veh.steer : 0) * 60;
  const band = (t) => {
    const y = by - t * r.h * 0.62;
    const half = r.w * (0.36 - t * 0.2);
    return { y, l: cx - half + bend * t * t, r: cx + half + bend * t * t };
  };
  const cols = ["#ff5c5c", "#ffd166", "#7ee787"];
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = band(i / 3), b = band((i + 1) / 3);
    ctx.strokeStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(a.l, a.y); ctx.lineTo(b.l, b.y);
    ctx.moveTo(a.r, a.y); ctx.lineTo(b.r, b.y);
    ctx.moveTo(b.l, b.y); ctx.lineTo(b.l + 10, b.y);
    ctx.moveTo(b.r, b.y); ctx.lineTo(b.r - 10, b.y);
    ctx.stroke();
  }
  panel(ctx, r.x + 6, r.y + 6, 58, 18, 4, "rgba(0,0,0,0.55)");
  text(ctx, "● REAR", r.x + 35, r.y + 15, 10, "#ff6b6b", "center", 800);
}

function drawOverlay(ctx) {
  _buttons = [];
  if (_mode3d && _pipRect && _phase === "play") drawPipFrame(ctx);
  if (_phase !== "title") drawFloaters(ctx);
  if (_phase === "title") drawTitle(ctx);
  else {
    drawHud(ctx);
    if (_phase === "intro") drawIntro(ctx);
    if (_phase === "done") drawResult(ctx);
  }
  drawBanners(ctx);
  drawJoystick(ctx);
}

// ── Canvas2D + PixiJS passes ─────────────────────────────────────────────
function shakeOffset() {
  if (_shake <= 0) return [0, 0];
  const a = _shake * 3.2;
  return [(Math.sin(_time * 91) + Math.sin(_time * 53)) * a * 0.5, (Math.cos(_time * 77) + Math.sin(_time * 61)) * a * 0.5];
}

function renderCanvas(ctx) {
  const L = ensureLayers(2);
  const [sx, sy] = shakeOffset();
  ctx.save();
  ctx.translate(sx, sy);
  if (L) {
    ctx.drawImage(L.ground, 0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(L.statics, 0, 0, VIEW_W, VIEW_H);
  }
  const p = new CanvasPainter(ctx);
  drawDynamic(p, _time);
  if (L) ctx.drawImage(L.overhead, 0, 0, VIEW_W, VIEW_H);
  ctx.restore();
}

let _pixi = null;               // { app, root, ground, statics, dyn, over, gen }
function renderPixiScene(adapter) {
  const { PIXI, app } = adapter.getEngine();
  if (!PIXI || !app) return;
  const L = ensureLayers(2);
  if (!_pixi || _pixi.app !== app || _pixi.root.parent !== app.stage) {
    if (_pixi?.root?.parent) _pixi.root.parent.removeChild(_pixi.root);
    const root = new PIXI.Container();
    const dyn = new PIXI.Graphics();
    _pixi = { app, root, dyn, ground: null, statics: null, over: null, gen: -1 };
    app.stage.addChild(root);
  }
  if (_pixi.gen !== _levelGen && L) {
    for (const k of ["ground", "statics", "over"]) {
      if (_pixi[k]) { _pixi.root.removeChild(_pixi[k]); _pixi[k].texture.destroy(true); }
    }
    const spr = (c) => { const s = new PIXI.Sprite(PIXI.Texture.from(c)); s.width = VIEW_W; s.height = VIEW_H; return s; };
    _pixi.ground = spr(L.ground);
    _pixi.statics = spr(L.statics);
    _pixi.over = spr(L.overhead);
    _pixi.root.removeChildren();
    _pixi.root.addChild(_pixi.ground, _pixi.statics, _pixi.dyn, _pixi.over);
    _pixi.gen = _levelGen;
  }
  // The adapter's own debug bodies stay underneath, hidden by the ground.
  app.stage.setChildIndex(_pixi.root, app.stage.children.length - 1);
  _pixi.dyn.clear();
  drawDynamic(new PixiPainter(_pixi.dyn), _time);
  const [sx, sy] = shakeOffset();
  app.stage.position.set(sx, sy);
  app.render();
}

// ── 3D ───────────────────────────────────────────────────────────────────
// World (x, y) px maps to three (x, −y, z) with z up; a body's rotation a
// becomes rotation.z = −a. Everything static is built once per level into
// one group (parked cars are merged per material, so each is a handful of
// draw calls); the player's car keeps separate wheel groups so they can
// spin and steer from the wheel bodies.
let _THREE = null;
let _scene3d = null;
let _g3 = null;                 // scene-level resources
let _lv3 = null;                // level-level scene graph
let _camPos = null, _camTgt = null, _camYaw = 0;
let _camDist = 1;               // wheel zoom factor

const SUNS = {
  noon:   { dir: [-0.35, 0.5, 1], color: 0xfff1dc, i: 2.7, sky: 0xc4dcff, gnd: 0x6a6050, hemi: 1.15, top: "#6fa6e0", bot: "#dbe9f5", fog: 0xd6e2ec, lamps: false },
  deck:   { dir: [0.35, 0.55, 1], color: 0xffffff, i: 2.3, sky: 0xd2e0f0, gnd: 0x6a6a6a, hemi: 1.35, top: "#8fb0d4", bot: "#e8eef4", fog: 0xdfe6ee, lamps: false },
  marina: { dir: [-0.55, 0.25, 0.9], color: 0xfff0d8, i: 2.9, sky: 0xb8dcff, gnd: 0x5a6a70, hemi: 1.1, top: "#4f93dc", bot: "#cfe6f7", fog: 0xcfe2ee, lamps: false },
  dusk:   { dir: [0.9, 0.3, 0.26], color: 0xff9a5a, i: 1.5, sky: 0x46558a, gnd: 0x2a2424, hemi: 0.6, top: "#1d2447", bot: "#f0a066", fog: 0x6a5060, lamps: true },
  golden: { dir: [-0.8, -0.3, 0.45], color: 0xffc27a, i: 2.4, sky: 0x9ab8e0, gnd: 0x5a6a30, hemi: 0.95, top: "#6f9ad0", bot: "#f6d6a0", fog: 0xe8d8b8, lamps: false },
};

function owned(x) { x.userData.owned = true; return x; }

function canvasTex(w, h, draw, opts = {}) {
  const T = _THREE;
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new T.CanvasTexture(c);
  t.colorSpace = opts.linear ? T.NoColorSpace : T.SRGBColorSpace;
  if (opts.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}

// Minimal geometry merge (position / normal / uv), so a parked car or a
// batch of static props costs one draw call per material.
function mergeGeos(list, withColor = false) {
  const T = _THREE;
  let n = 0;
  const parts = list.map(({ geo, m }) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    if (!g.attributes.uv) g.setAttribute("uv", new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    n += g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const col = withColor ? new Float32Array(n * 3) : null;
  let o = 0;
  parts.forEach((g, i) => {
    const cnt = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
    if (col) {
      const c = list[i].mat.color;
      for (let k = 0; k < cnt; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; }
    }
    o += cnt;
    g.dispose();
  });
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.BufferAttribute(pos, 3));
  out.setAttribute("normal", new T.BufferAttribute(nor, 3));
  out.setAttribute("uv", new T.BufferAttribute(uv, 2));
  if (col) out.setAttribute("color", new T.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return owned(out);
}

class Parts {
  constructor() { this.list = []; }
  add(geo, mat, x = 0, y = 0, z = 0, rz = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0) {
    const T = _THREE;
    const m = new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz, "ZYX")),
      new T.Vector3(sx, sy, sz),
    );
    this.list.push({ geo, mat, m });
    return this;
  }
  merged(shadow = true) {
    const T = _THREE;
    const grp = new T.Group();
    const byMat = new Map();
    // Plain-coloured parts (tyres, trim, lamps, concrete, metal …) share one
    // vertex-coloured material, so a whole car or prop batch is a few draws.
    const vc = [];
    for (const p of this.list) {
      if (!Array.isArray(p.mat) && p.mat.userData.vc) { vc.push(p); continue; }
      if (Array.isArray(p.mat)) {
        const mesh = new T.Mesh(p.geo, p.mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(p.m);
        mesh.castShadow = shadow; mesh.receiveShadow = true;
        grp.add(mesh);
        continue;
      }
      if (!byMat.has(p.mat)) byMat.set(p.mat, []);
      byMat.get(p.mat).push(p);
    }
    if (vc.length) {
      const mesh = new T.Mesh(mergeGeos(vc, true), _g3.vcMat);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    for (const [mat, list] of byMat) {
      const mesh = new T.Mesh(mergeGeos(list), mat);
      mesh.castShadow = shadow && !mat.userData.noShadow;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    return grp;
  }
}

function roundedRectShape(l, w, r) {
  const T = _THREE;
  const s = new T.Shape();
  const hl = l / 2, hw = w / 2;
  r = Math.min(r, hl, hw);
  s.moveTo(-hl + r, -hw);
  s.lineTo(hl - r, -hw); s.quadraticCurveTo(hl, -hw, hl, -hw + r);
  s.lineTo(hl, hw - r); s.quadraticCurveTo(hl, hw, hl - r, hw);
  s.lineTo(-hl + r, hw); s.quadraticCurveTo(-hl, hw, -hl, hw - r);
  s.lineTo(-hl, -hw + r); s.quadraticCurveTo(-hl, -hw, -hl + r, -hw);
  return s;
}

// A box whose top is a smaller rectangle — car cabins and roofs.
function taperGeo(bx0, bx1, bw, tx0, tx1, tw, h) {
  const T = _THREE;
  const b = [[bx1, -bw / 2, 0], [bx1, bw / 2, 0], [bx0, bw / 2, 0], [bx0, -bw / 2, 0]];
  const t = [[tx1, -tw / 2, h], [tx1, tw / 2, h], [tx0, tw / 2, h], [tx0, -tw / 2, h]];
  const v = [];
  const quad = (a, bb, c, d) => v.push(...a, ...bb, ...c, ...a, ...c, ...d);
  quad(t[0], t[1], t[2], t[3]);
  quad(b[0], b[1], t[1], t[0]);
  quad(b[2], b[3], t[3], t[2]);
  quad(b[1], b[2], t[2], t[1]);
  quad(b[3], b[0], t[0], t[3]);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(new Float32Array(v), 3));
  g.setAttribute("uv", new T.BufferAttribute(new Float32Array((v.length / 3) * 2), 2));
  g.computeVertexNormals();
  return owned(g);
}

function ensureScene(adapter, scene, renderer) {
  if (_scene3d === scene && _g3) return;
  const T = _THREE;
  if (_g3 && _g3.scene === scene) {
    for (const m of _g3.all) scene.remove(m);
    if (_lv3) teardownLevel3d();
  }
  _lv3 = null;
  _scene3d = scene;
  _camPos = null; _camTgt = null;
  const g = { scene, all: [], renderer, mats: new Map(), v: new T.Vector3(), v2: new T.Vector3(), m4: new T.Matrix4(), up: new T.Vector3(0, 0, 1), dummy: new T.Object3D(), col: new T.Color() };
  _g3 = g;
  const add = (o) => { scene.add(o); g.all.push(o); return o; };

  // Take over the adapter's lighting: its grid goes, its lights go dark, and
  // one shadow-casting sun plus a sky/ground hemisphere light the sites.
  for (const c of scene.children) {
    if (c.isLineSegments) c.visible = false;
    if (c.isDirectionalLight || c.isAmbientLight) c.intensity = 0;
  }
  if (renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
  }
  const sun = add(new T.DirectionalLight(0xffffff, 2.5));
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -620; sc.right = 620; sc.top = 420; sc.bottom = -420; sc.near = 10; sc.far = 3200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.8;
  const tgt = add(new T.Object3D());
  tgt.position.set(VIEW_W / 2, -VIEW_H / 2, 0);
  sun.target = tgt;
  g.sun = sun;
  g.hemi = add(new T.HemisphereLight(0xc4dcff, 0x6a6050, 1.1));
  g.hemi.up.set(0, 0, 1);
  g.hemi.position.set(0, 0, 1);

  // Shared unit geometries.
  g.box = new T.BoxGeometry(1, 1, 1);
  g.cyl = new T.CylinderGeometry(1, 1, 1, 18);            // axis along y
  g.cylZ = new T.CylinderGeometry(1, 1, 1, 16).rotateX(Math.PI / 2);
  g.cylZ8 = new T.CylinderGeometry(1, 1, 1, 8).rotateX(Math.PI / 2);
  g.disc = new T.CircleGeometry(1, 18);
  g.sphere = new T.SphereGeometry(1, 14, 10);
  g.ico = new T.IcosahedronGeometry(1, 0);
  g.plane = new T.PlaneGeometry(1, 1);
  g.cone = new T.ConeGeometry(1, 1, 14).rotateX(Math.PI / 2);

  // Shared materials. `vcm` ones only lend their colour to the shared
  // vertex-coloured material when merged.
  const std = (key, o) => { const mt = new T.MeshStandardMaterial(o); g.mats.set(key, mt); return mt; };
  const vcm = (key, o) => { const mt = std(key, o); mt.userData.vc = true; return mt; };
  g.vcMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0.18 });
  g.glass = std("glass", { color: 0x121a24, metalness: 0.85, roughness: 0.12 });
  g.trim = vcm("trim", { color: 0x1d1f23, roughness: 0.7, metalness: 0.2 });
  g.chrome = vcm("chrome", { color: 0xd8dde3, roughness: 0.25, metalness: 0.9 });
  g.tire = vcm("tire", { color: 0x16171a, roughness: 0.92 });
  g.rim = std("rim", { color: 0xffffff, map: canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = "#23262b"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#c9ced6"; c.beginPath(); c.arc(32, 32, 30, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3a3f47";
    for (let i = 0; i < 5; i++) { c.save(); c.translate(32, 32); c.rotate(i * Math.PI * 2 / 5); c.beginPath(); c.moveTo(-5, 8); c.lineTo(5, 8); c.lineTo(3, 26); c.lineTo(-3, 26); c.fill(); c.restore(); }
    c.fillStyle = "#8a9099"; c.beginPath(); c.arc(32, 32, 6, 0, Math.PI * 2); c.fill();
  }), roughness: 0.35, metalness: 0.7 });
  g.rimFlat = vcm("rimFlat", { color: 0xb9bec6, roughness: 0.4, metalness: 0.6 });
  g.head = vcm("head", { color: 0xfff6dc, emissive: 0xfff2cc, emissiveIntensity: 0.4, roughness: 0.2 });
  g.tail = vcm("tail", { color: 0x5a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.25, roughness: 0.3 });
  g.plate = vcm("plate", { color: 0xf2f2ea, roughness: 0.5 });
  g.concrete = vcm("concrete", { color: 0xa9aba9, roughness: 0.92 });
  g.darkConcrete = vcm("darkConcrete", { color: 0x7d7f80, roughness: 0.95 });
  g.metal = vcm("metal", { color: 0x8b939c, roughness: 0.4, metalness: 0.75 });
  g.darkMetal = vcm("darkMetal", { color: 0x2c3036, roughness: 0.5, metalness: 0.6 });
  g.yellow = vcm("yellow", { color: 0xf2c230, roughness: 0.55 });
  g.white = vcm("white", { color: 0xf1f1ec, roughness: 0.55 });
  g.red = vcm("red", { color: 0xc62d2d, roughness: 0.5 });
  g.orange = vcm("orange", { color: 0xff6a12, roughness: 0.55 });
  g.wood = std("wood", { color: 0xffffff, roughness: 0.85, map: canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = "#9a7040"; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { c.fillStyle = y % 32 ? "#8a6236" : "#a57a48"; c.fillRect(0, y, w, 14); c.fillStyle = "#4d3518"; c.fillRect(0, y + 14, w, 2); }
    c.globalAlpha = 0.25; c.strokeStyle = "#5a3f1e";
    for (let i = 0; i < 40; i++) { const y = Math.random() * h; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + (Math.random() - 0.5) * 6); c.stroke(); }
  }, { repeat: true }) });
  g.hazardStripe = std("hazardStripe", { color: 0xffffff, roughness: 0.7, map: canvasTex(64, 64, (c, w, h) => {
    c.fillStyle = "#1b1b1b"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#f2c230";
    for (let k = -64; k < 128; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 16, 0); c.lineTo(k + 16 - 64, 64); c.lineTo(k - 64, 64); c.fill(); }
  }, { repeat: true }) });
  g.barrierStripe = std("barrierStripe", { color: 0xffffff, roughness: 0.6, map: canvasTex(64, 16, (c, w, h) => {
    c.fillStyle = "#f4f4ef"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#d33a2c"; c.fillRect(0, 0, 16, h); c.fillRect(32, 0, 16, h);
  }, { repeat: true }) });
  g.hedge = std("hedge", { color: 0xffffff, roughness: 0.95, map: canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = "#2f5f22"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.fillStyle = ["#3d7a2a", "#24501a", "#4d8c34", "#1d4015"][i % 4]; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 3, 0, Math.PI * 2); c.fill(); }
  }, { repeat: true }) });
  g.leaf = [0x3d7a2a, 0x4d8c34, 0x2f6a24, 0x5f9e3f].map((c, i) => std("leaf" + i, { color: c, roughness: 0.9, flatShading: true }));
  g.trunk = vcm("trunk", { color: 0x5a3d24, roughness: 0.95 });
  g.coneM = std("coneMat", { color: 0xff6a12, roughness: 0.5 });
  g.poolMat = new T.MeshBasicMaterial({ map: canvasTex(128, 128, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,226,170,0.9)"); gr.addColorStop(0.5, "rgba(255,200,120,0.35)"); gr.addColorStop(1, "rgba(255,190,110,0)");
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  }), transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  g.beamTex = canvasTex(64, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, "rgba(255,245,220,0.85)"); gr.addColorStop(1, "rgba(255,245,220,0)");
    c.fillStyle = gr;
    c.beginPath(); c.moveTo(w * 0.4, h); c.lineTo(w * 0.6, h); c.lineTo(w, 0); c.lineTo(0, 0); c.fill();
  });
  g.fadeTex = canvasTex(8, 64, (c, w, h) => {
    const gr = c.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });

  // Environment for the car paint and glass: a sky / horizon / ground
  // gradient through PMREM. Without it a metallic finish renders black.
  g.envOk = false;
  if (renderer && T.PMREMGenerator) {
    try {
      const pm = new T.PMREMGenerator(renderer);
      const envTex = canvasTex(256, 128, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, "#7fb0e8"); gr.addColorStop(0.46, "#e8f0f8"); gr.addColorStop(0.52, "#8a8c86"); gr.addColorStop(1, "#3a3c3a");
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        c.fillStyle = "rgba(255,255,255,0.9)"; c.fillRect(40, 20, 50, 16); c.fillRect(150, 30, 60, 12);
      });
      envTex.mapping = T.EquirectangularReflectionMapping;
      const env = pm.fromEquirectangular(envTex).texture;
      if (env) { scene.environment = env; g.envOk = true; g.env = env; }
      envTex.dispose();
      pm.dispose();
    } catch (_) { g.envOk = false; }
  }

  g.rearCam = new T.PerspectiveCamera(72, 16 / 9, 1, 3000);
  g.rearCam.up.set(0, 0, 1);
}

// Paint materials are cached per colour.
function paintMat(hex) {
  const g = _g3, key = "paint" + hex;
  let m = g.mats.get(key);
  if (!m) {
    m = new _THREE.MeshStandardMaterial({ color: hex, metalness: 0.45, roughness: 0.32 });
    g.mats.set(key, m);
  }
  return m;
}

// ── Car model ────────────────────────────────────────────────────────────
// Returns { body (merged), wheels: [{ pivot, spin, lx, ly, front }], mats }.
// Wheel groups are left out of the merge when `live` is set.
function buildCarModel(spec, color, o = {}) {
  const T = _THREE, g = _g3;
  const L = spec.len * M, W = spec.wid * M, H = spec.h * M;
  const X = (f) => L / 2 - f * L;
  const z0 = 2.6, zb = Math.min(H * 0.55, 10.6);
  const P = new Parts();
  const paint = paintMat(color);
  const bs = 1.4;
  const bodyGeo = owned(new T.ExtrudeGeometry(roundedRectShape(L - bs * 2, W - bs * 2, 4), { depth: zb - z0 - bs * 2, bevelEnabled: true, bevelThickness: bs, bevelSize: bs, bevelSegments: 2, curveSegments: 3 }));
  P.add(bodyGeo, paint, 0, 0, z0 + bs);
  // Cabin glass and roof.
  const cabTop = H - 1.1;
  P.add(taperGeo(X(spec.rg), X(spec.ws), W * 0.9, X(spec.rb), X(spec.rf), W * 0.74, cabTop - (zb - 0.5)), g.glass, 0, 0, zb - 0.5);
  const rl = X(spec.rf) - X(spec.rb);
  P.add(taperGeo(-rl / 2 - 0.3, rl / 2 + 0.3, W * 0.76, -rl / 2 + 0.6, rl / 2 - 0.6, W * 0.7, 1.2), paint, (X(spec.rf) + X(spec.rb)) / 2, 0, cabTop);
  if (spec.bed) {
    const bx0 = X(0.97), bx1 = X(0.58), bl = bx1 - bx0;
    P.add(g.box, g.trim, (bx0 + bx1) / 2, 0, zb + 0.2, 0, bl, W - 3, 0.6);
    for (const s of [-1, 1]) P.add(g.box, paint, (bx0 + bx1) / 2, s * (W / 2 - 1), zb + 1.8, 0, bl, 1.2, 3.6);
    P.add(g.box, paint, bx0 + 0.6, 0, zb + 1.8, 0, 1.2, W - 1, 3.6);
  }
  if (o.rails) for (const s of [-1, 1]) P.add(g.box, g.darkMetal, (X(spec.rf) + X(spec.rb)) / 2, s * W * 0.3, cabTop + 1.8, 0, rl * 0.9, 0.9, 0.9);
  // Bumpers, grille, lamps, plates, mirrors.
  for (const s of [-1, 1]) P.add(g.box, g.trim, s * (L / 2 - 0.4), 0, z0 + 2, 0, 1.8, W - 2.5, 3.2);
  P.add(g.box, g.trim, L / 2 + 0.25, 0, zb - 3, 0, 0.6, W * 0.45, 2.4);
  for (const s of [-1, 1]) P.add(g.box, o.headMat || g.head, L / 2 - 0.2, s * (W / 2 - 3.2), zb - 2, 0, 1, 4, 1.8);
  const tailMat = o.tailMat || g.tail;
  for (const s of [-1, 1]) P.add(g.box, tailMat, -L / 2 + 0.2, s * (W / 2 - 2.9), zb - 1.8, 0, 1, 4.2, 2);
  if (o.revMat) for (const s of [-1, 1]) P.add(g.box, o.revMat, -L / 2 + 0.15, s * (W / 2 - 5.9), zb - 1.8, 0, 0.9, 1.6, 1.4);
  if (o.hazardMat) {
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) P.add(g.box, o.hazardMat, sx * (L / 2 - 1.6), sy * (W / 2 + 0.05), zb - 1.9, 0, 2, 0.6, 1.2);
  }
  P.add(g.box, g.plate, -L / 2 - 0.15, 0, z0 + 3.4, 0, 0.3, 6, 1.6);
  P.add(g.box, g.plate, L / 2 + 0.15, 0, z0 + 2.4, 0, 0.3, 6, 1.4);
  for (const s of [-1, 1]) P.add(g.box, paint, X(spec.ws) - 1.2, s * (W / 2 + 1), zb + 1.1, 0, 2.2, 1.8, 1.4);
  // Wheels.
  const r = CAR.wheelR * M, ww = CAR.wheelW * M;
  const axF = L / 2 - 0.9 * M, axR = -(L / 2 - 0.95 * M);
  const wy = W / 2 - ww / 2 + 0.3;
  const wheels = [];
  const wheelParts = (PP, x, y) => {
    PP.add(g.cyl, g.tire, x, y, r, 0, r, ww, r);
    const side = Math.sign(y) || 1;
    PP.add(g.disc, g.rimFlat, x, y + side * (ww / 2 + 0.06), r, 0, r * 0.64, r * 0.64, 1, side > 0 ? -Math.PI / 2 : Math.PI / 2);
  };
  for (const [lx, ly, front] of [[axF, wy, true], [axF, -wy, true], [axR, wy, false], [axR, -wy, false]]) {
    if (o.live) wheels.push({ lx, ly, front });
    else wheelParts(P, lx, ly);
  }
  const body = P.merged();
  if (o.live) {
    for (const w of wheels) {
      const pivot = new T.Group();
      pivot.position.set(w.lx, w.ly, 0);
      const spin = new T.Group();
      spin.position.set(0, 0, r);
      // Tyre plus a rim disc facing outward on this side.
      const PP = new Parts();
      PP.add(g.cyl, g.tire, 0, 0, 0, 0, r, ww, r);
      const side = Math.sign(w.ly);
      PP.add(g.disc, g.rim, 0, side * (ww / 2 + 0.06), 0, 0, r * 0.64, r * 0.64, 1, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      for (const p of PP.list) {
        const mesh = new T.Mesh(p.geo, p.mat);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(p.m);
        mesh.castShadow = true;
        spin.add(mesh);
      }
      pivot.add(spin);
      body.add(pivot);
      w.pivot = pivot; w.spin = spin;
    }
  }
  return { body, wheels, L, W, H, zb };
}

// ── Trailer models ───────────────────────────────────────────────────────
function buildTrailerModel(key, o = {}) {
  const T = _THREE, g = _g3;
  const t = TRAILERS[key];
  const L = t.len * M, W = t.wid * M;
  const ax = t.axle * M, r = t.wheelR * M, ww = t.wheelW * M;
  const wo = (t.wid / 2 + t.wheelOut) * M;
  const cx = L / 2 + t.bar * M;
  const P = new Parts();
  const tail = o.tailMat || g.tail;
  const bedZ = r * 1.55;
  // Drawbar A-frame to the coupler.
  const barLen = Math.hypot(cx - L / 2, W * 0.3);
  const barA = Math.atan2(W * 0.3, cx - L / 2);
  for (const s of [-1, 1]) P.add(g.box, g.darkMetal, (L / 2 + cx) / 2, s * W * 0.15, bedZ - 1, -s * barA, barLen, 1.4, 1.6);
  P.add(g.box, g.darkMetal, cx - 1.5, 0, bedZ - 0.6, 0, 4, 2.2, 2.2);
  P.add(g.sphere, g.darkMetal, cx, 0, bedZ - 0.5, 0, 1.6, 1.6, 1.4);
  P.add(g.cylZ, g.darkMetal, L / 2 + t.bar * M * 0.45, -W * 0.12, bedZ / 2, 0, 0.8, 0.8, bedZ);
  P.add(g.cyl, g.tire, L / 2 + t.bar * M * 0.45, -W * 0.12, 1.2, 0, 1.2, 1, 1.2);
  const wheels = [];
  const addWheel = (y) => wheels.push({ lx: ax, ly: y });
  if (key === "box") {
    P.add(g.box, g.darkMetal, 0, W * 0.3, bedZ - 1.2, 0, L, 1.6, 1.8);
    P.add(g.box, g.darkMetal, 0, -W * 0.3, bedZ - 1.2, 0, L, 1.6, 1.8);
    P.add(g.box, g.wood, 0, 0, bedZ, 0, L, W, 1);
    const sideH = 4.2;
    for (const s of [-1, 1]) {
      P.add(g.box, g.metal, 0, s * (W / 2 - 0.4), bedZ + sideH / 2, 0, L, 0.8, sideH);
      P.add(g.box, g.metal, s * (L / 2 - 0.4), 0, bedZ + sideH / 2, 0, 0.8, W, sideH);
      // Fender over each wheel.
      P.add(g.box, g.darkMetal, ax, s * wo, r * 2.1, 0, r * 2.6, ww + 2.2, 0.8);
      P.add(g.box, g.darkMetal, ax, s * (wo + ww / 2 + 1), r * 1.3, 0, r * 2.6, 0.6, r * 1.6);
    }
    // Tarp-covered load with ropes.
    const tarp = owned(new T.ExtrudeGeometry(roundedRectShape(L * 0.72, W * 0.68, 3), { depth: 5, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.6, bevelSegments: 3, curveSegments: 4 }));
    P.add(tarp, paintMat(0x2f6d57), -1, 0, bedZ + 1.2);
    for (const k of [-0.25, 0.1]) P.add(g.box, g.mats.get("rope") || ropeMat(), k * L, 0, bedZ + 9.3, 0, 0.6, W * 0.74, 0.4);
    for (const s of [-1, 1]) P.add(g.box, tail, -L / 2 - 0.2, s * (W / 2 - 1.8), bedZ + 1.2, 0, 0.6, 3.2, 1.6);
    P.add(g.box, g.plate, -L / 2 - 0.3, 0, bedZ - 0.4, 0, 0.3, 5.5, 1.6);
    addWheel(wo); addWheel(-wo);
  } else if (key === "boat") {
    for (const s of [-1, 1]) {
      P.add(g.box, g.darkMetal, 0, s * W * 0.28, bedZ - 0.6, 0, L + 2, 1.4, 1.6);
      P.add(g.box, g.darkMetal, ax, s * wo, r * 2.1, 0, r * 2.5, ww + 2, 0.7);
    }
    P.add(g.box, g.darkMetal, L / 2 + 2, 0, bedZ + 3, 0, 1.4, 1.4, 7);
    P.add(g.cylZ, g.chrome, L / 2 + 2, 0, bedZ + 6.4, 0, 1.4, 1.4, 1.8, Math.PI / 2);
    for (let k = -2; k <= 2; k++) P.add(g.cyl, g.trim, k * L * 0.18, 0, bedZ + 0.6, 0, 0.9, W * 0.3, 0.9);
    for (const s of [-1, 1]) P.add(g.box, tail, -L / 2 - 0.5, s * (W / 2 - 1.2), bedZ, 0, 0.6, 2.6, 1.4);
    addWheel(wo); addWheel(-wo);
  } else {
    // Caravan: side profile extruded across the width, rounded at the front.
    const H = 2.35 * M, z0 = r * 1.3;
    const s = new T.Shape();
    const hl = L / 2;
    s.moveTo(-hl, z0);
    s.lineTo(hl - 6, z0);
    s.quadraticCurveTo(hl, z0, hl, z0 + 6);
    s.lineTo(hl, H - 12);
    s.quadraticCurveTo(hl - 1, H, hl - 14, H);
    s.lineTo(-hl + 3, H);
    s.quadraticCurveTo(-hl, H, -hl, H - 3);
    s.lineTo(-hl, z0);
    const shell = owned(new T.ExtrudeGeometry(s, { depth: W - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 5 }));
    shell.rotateX(Math.PI / 2);
    shell.translate(0, W / 2 - 1, 0);
    P.add(shell, g.white);
    P.add(g.box, paintMat(0xc0392b), 0, W / 2 + 0.2, z0 + 7, 0, L - 6, 0.4, 1.4);
    P.add(g.box, paintMat(0xc0392b), 0, -W / 2 - 0.2, z0 + 7, 0, L - 6, 0.4, 1.4);
    P.add(g.box, paintMat(0x3a4a5a), 0, W / 2 + 0.2, z0 + 5.6, 0, L - 6, 0.4, 0.6);
    P.add(g.box, paintMat(0x3a4a5a), 0, -W / 2 - 0.2, z0 + 5.6, 0, L - 6, 0.4, 0.6);
    for (const [x, w] of [[L * 0.25, 12], [-L * 0.22, 14]]) for (const sd of [-1, 1]) P.add(g.box, g.glass, x, sd * (W / 2 + 0.25), z0 + 14, 0, w, 0.5, 6);
    P.add(g.box, g.glass, hl + 0.3, 0, z0 + 13, 0, 0.6, W - 8, 5);
    P.add(g.box, paintMat(0xdad6ca), -L * 0.02, -W / 2 - 0.25, z0 + 9.5, 0, 6.5, 0.5, 15);
    P.add(g.box, paintMat(0xe0e3e7), -L * 0.1, 0, H + 0.8, 0, 12, 9, 1.6);
    P.add(g.box, paintMat(0xd0d4d8), L * 0.2, 0, H + 0.5, 0, 6, 6, 1);
    P.add(g.box, paintMat(0xe7e2d6), hl + 5, 0, bedZ + 2, 0, 5, 7, 4);
    for (const sd of [-1, 1]) P.add(g.box, tail, -hl - 0.3, sd * (W / 2 - 2.6), z0 + 3, 0, 0.6, 3.6, 2.2);
    P.add(g.box, g.trim, -hl - 0.1, 0, z0 + 0.6, 0, 1, W - 1, 1.4);
    addWheel(wo); addWheel(-wo);
  }
  const body = P.merged();
  const out = { body, wheels: [], L, W, bedZ };
  for (const w of wheels) {
    const pivot = new T.Group();
    pivot.position.set(w.lx, w.ly, r);
    const spin = new T.Group();
    const tire = new T.Mesh(g.cyl, g.tire);
    tire.scale.set(r, ww, r);
    tire.castShadow = true;
    const rim = new T.Mesh(g.disc, g.rim);
    const side = Math.sign(w.ly);
    rim.position.y = side * (ww / 2 + 0.06);
    rim.rotation.x = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    rim.scale.set(r * 0.62, r * 0.62, 1);
    spin.add(tire, rim);
    pivot.add(spin);
    body.add(pivot);
    out.wheels.push({ pivot, spin });
  }
  if (key === "boat") {
    const hull = buildBoatHull(L * 0.98, W * 0.96, 0x1f5a8a);
    hull.position.set(-L * 0.02, 0, bedZ + 1.4);
    body.add(hull);
  }
  return out;
}

function ropeMat() {
  const m = new _THREE.MeshStandardMaterial({ color: 0xd6c38a, roughness: 0.9 });
  _g3.mats.set("rope", m);
  return m;
}

// Boat hull: top-view outline with a pointed bow, deck white, sides coloured.
function buildBoatHull(L, W, hullHex) {
  const T = _THREE, g = _g3;
  const s = new T.Shape();
  s.moveTo(L / 2, 0);
  s.quadraticCurveTo(L * 0.3, W / 2, L * 0.05, W / 2);
  s.lineTo(-L / 2, W / 2 - 1);
  s.lineTo(-L / 2, -W / 2 + 1);
  s.lineTo(L * 0.05, -W / 2);
  s.quadraticCurveTo(L * 0.3, -W / 2, L / 2, 0);
  const geo = owned(new T.ExtrudeGeometry(s, { depth: 8, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.4, bevelSegments: 2, curveSegments: 8 }));
  const grp = new T.Group();
  const hull = new T.Mesh(geo, [g.white, paintMat(hullHex)]);
  hull.castShadow = true;
  hull.receiveShadow = true;
  grp.add(hull);
  const P = new Parts();
  P.add(g.box, paintMat(0xd8d4c8), -L * 0.12, 0, 10.2, 0, L * 0.4, W * 0.62, 0.6);
  P.add(g.box, g.white, L * 0.08, 0, 12, 0, 5, W * 0.38, 4);
  P.add(taperGeo(-1.5, 1.5, W * 0.44, -1.2, 0, W * 0.4, 4), g.glass, L * 0.08 + 3.6, 0, 11.4);
  P.add(g.box, paintMat(0x6c5a44), -L * 0.12, W * 0.16, 11.5, 0, 5, 4, 2.4);
  P.add(g.box, paintMat(0x6c5a44), -L * 0.12, -W * 0.16, 11.5, 0, 5, 4, 2.4);
  // Outboard motor on the transom.
  P.add(g.box, g.trim, -L / 2 - 1.8, 0, 10, 0, 3.4, 4, 6);
  P.add(g.box, g.darkMetal, -L / 2 - 2.2, 0, 4.5, 0, 1.4, 1.4, 7);
  P.add(g.box, g.chrome, L / 2 - 6, 0, 10.6, 0, 8, 0.5, 0.5);
  grp.add(P.merged());
  return grp;
}

// ── Level scene ──────────────────────────────────────────────────────────
function teardownLevel3d() {
  const lv = _lv3;
  if (!lv) return;
  _g3.scene.remove(lv.group);
  lv.group.traverse((o) => {
    if (o.geometry?.userData?.owned) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (!m.userData?.owned) continue;
      if (m.map?.userData?.owned) m.map.dispose();
      if (m.normalMap?.userData?.owned) m.normalMap.dispose();
      if (m.emissiveMap?.userData?.owned) m.emissiveMap.dispose();
      m.dispose();
    }
  });
  _lv3 = null;
}

function groundZAt(x, y) {
  const r = _level?.ramp;
  if (!r || x < r.x0 || x > r.x1 || y > r.y1 || y < r.y0 - 10) return 0;
  return -((r.y1 - y) / (r.y1 - r.y0)) * 9;
}

// Tree batch: instanced trunks and canopy blobs for any number of trees.
function buildTrees(list) {
  const T = _THREE, g = _g3;
  if (!list.length) return null;
  const grp = new T.Group();
  const trunks = new T.InstancedMesh(g.cylZ8, g.trunk, list.length);
  const blobs = list.length * 4;
  const perMat = g.leaf.map((m) => new T.InstancedMesh(g.ico, m, blobs));
  const counts = perMat.map(() => 0);
  const d = g.dummy;
  const rnd = lcg(list.length * 31 + 5);
  list.forEach((t, i) => {
    const h = t.h ?? (22 + t.r * 1.1);
    d.position.set(t.x, -t.y, h / 2);
    d.rotation.set(0, 0, 0);
    d.scale.set(Math.max(1.6, t.r * 0.12), Math.max(1.6, t.r * 0.12), h);
    d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    for (let k = 0; k < 4; k++) {
      const a = rnd() * Math.PI * 2, dd = k === 0 ? 0 : t.r * 0.45;
      const rr = t.r * (k === 0 ? 0.85 : 0.55 + rnd() * 0.2);
      d.position.set(t.x + Math.cos(a) * dd, -t.y + Math.sin(a) * dd, h + (k === 0 ? t.r * 0.35 : t.r * (0.05 + rnd() * 0.3)));
      d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      d.scale.set(rr, rr, rr * 0.85);
      d.updateMatrix();
      const mi = Math.floor(rnd() * perMat.length);
      perMat[mi].setMatrixAt(counts[mi]++, d.matrix);
    }
  });
  trunks.castShadow = true;
  grp.add(trunks);
  perMat.forEach((im, i) => {
    im.count = counts[i];
    im.castShadow = true;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    grp.add(im);
  });
  trunks.instanceMatrix.needsUpdate = true;
  return grp;
}

function facadeTex(seed, lit, base) {
  const rnd = lcg(seed);
  return owned(canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    const cols = 4, rows = 8;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const on = lit && rnd() < 0.45;
      c.fillStyle = on ? (rnd() < 0.5 ? "#ffd89a" : "#ffe9c4") : "#2a3440";
      c.fillRect(8 + k * 30, 10 + r * 30, 20, 18);
      c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(8 + k * 30, 10 + r * 30, 20, 4);
    }
  }, { repeat: true }));
}

function buildingMesh(x, y, w, d, h, seed, lit, base = "#8a8176") {
  const T = _THREE;
  const tex = facadeTex(seed, lit, base);
  tex.repeat.set(Math.max(1, Math.round(w / 40)), Math.max(1, Math.round(h / 80)));
  const side = owned(new T.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: lit ? 0xffffff : 0x000000, emissiveMap: lit ? tex : null, emissiveIntensity: lit ? 0.55 : 0 }));
  const roof = _g3.darkConcrete;
  const m = new T.Mesh(_g3.box, [side, side, side, side, roof, roof]);
  m.position.set(x, -y, h / 2);
  m.scale.set(w, d, h);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildStatic3d(P, def, lvl, trees, lamps) {
  const g = _g3;
  const k = def.kind, x = def.x, y = -def.y, rz = -(def.a ?? 0);
  if (k === "boundary") {
    const gr = lvl.ground;
    if (gr === "camp") {
      // Post-and-rail fence.
      const long = Math.max(def.w, def.h), horiz = def.w > def.h;
      for (let o = -long / 2; o <= long / 2; o += 24) P.add(g.box, g.wood, x + (horiz ? o : 0), y - (horiz ? 0 : o), 6, 0, 2, 2, 12);
      for (const z of [5, 10]) P.add(g.box, g.wood, x, y, z, 0, horiz ? long : 1.4, horiz ? 1.4 : long, 1.4);
    } else if (gr === "street") {
      // Road-closed barrier across the carriageway only.
      const cy = -250, len = 364;
      P.add(g.box, g.barrierStripe, x, cy, 8, 0, def.w * 0.5, len, 4);
      for (let o = -len / 2 + 6; o < len / 2; o += 60) P.add(g.box, g.darkMetal, x, cy + o, 3, 0, 2, 2, 6);
    } else if (gr === "marina") {
      P.add(g.box, g.concrete, x, y, -4, 0, def.w, def.h, 16);
    } else {
      const h = gr === "deck" ? 16 : 9;
      P.add(g.box, g.concrete, x, y, h / 2, 0, def.w, def.h, h);
      P.add(g.box, gr === "deck" ? g.yellow : g.darkConcrete, x, y, h + 0.6, 0, def.w + 1, def.h + 1, 1.2);
    }
  } else if (k === "pillar") {
    const h = lvl.ground === "deck" ? 42 : 30;
    P.add(g.box, g.concrete, x, y, h / 2 + 6, rz, def.s, def.s, h - 12);
    P.add(g.box, g.hazardStripe, x, y, 3.5, rz, def.s + 0.4, def.s + 0.4, 7);
    if (lvl.ground === "deck") P.add(g.box, g.concrete, x, y, h, rz, def.s + 6, def.s + 6, 3);
  } else if (k === "bollard") {
    P.add(g.cylZ, g.yellow, x, y, 5.5, 0, def.r, def.r, 11);
    P.add(g.cylZ, g.white, x, y, 8.5, 0, def.r + 0.1, def.r + 0.1, 1.6);
    P.add(g.sphere, g.darkMetal, x, y, 11, 0, def.r, def.r, def.r * 0.5);
  } else if (k === "lamp") {
    const H = 62;
    P.add(g.cylZ, g.darkMetal, x, y, H / 2, 0, 1.3, 1.3, H);
    P.add(g.cylZ, g.darkMetal, x, y, 2, 0, 3, 3, 4);
    P.add(g.box, g.darkMetal, x + 5, y, H, 0, 11, 1.4, 1.4);
    P.add(g.box, g.darkMetal, x + 10, y, H - 0.6, 0, 7, 4.4, 1.8);
    P.add(g.box, g.head, x + 10, y, H - 1.8, 0, 5.4, 3.2, 0.6);
    lamps.push({ x: def.x + 10, y: def.y });
  } else if (k === "hydrant") {
    P.add(g.cylZ, g.red, x, y, 4, 0, 2.4, 2.4, 8);
    P.add(g.sphere, g.red, x, y, 8, 0, 2.4, 2.4, 1.6);
    P.add(g.cylZ, g.chrome, x, y, 5.5, 0, 3.6, 0.9, 0.9, 0, Math.PI / 2);
  } else if (k === "bin") {
    P.add(g.cylZ, paintMat(0x2f5a3a), x, y, 6, 0, 4.5, 4.5, 12);
    P.add(g.cylZ, g.darkMetal, x, y, 12.4, 0, 4.8, 4.8, 1);
  } else if (k === "barrel") {
    P.add(g.cylZ, paintMat(0x2b5aa0), x, y, 5.5, 0, 4.2, 4.2, 11);
    for (const z of [3, 8]) P.add(g.cylZ, g.darkMetal, x, y, z, 0, 4.35, 4.35, 0.8);
  } else if (k === "tree") {
    trees.push({ x: def.x, y: def.y, r: def.r });
  } else if (k === "firepit") {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      P.add(g.ico, g.darkConcrete, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 1.5, a, 2.4, 2, 2);
    }
    for (let i = 0; i < 4; i++) P.add(g.box, g.trunk, x, y, 1.6 + i * 0.3, i * 0.8, 9, 1.4, 1.4);
  } else if (k === "table") {
    P.add(g.box, g.wood, x, y, 7.5, rz, 12, 20, 1.2);
    for (const s of [-1, 1]) {
      P.add(g.box, g.wood, x + Math.cos(-rz) * s * 8, y - Math.sin(-rz) * s * 8, 4.2, rz, 3, 20, 1);
      P.add(g.box, g.trunk, x + Math.cos(-rz) * s * 3, y - Math.sin(-rz) * s * 3, 3.6, rz, 1, 16, 7);
    }
  } else if (k === "planter") {
    P.add(g.box, g.concrete, x, y, 4.5, rz, def.w, def.h, 9);
    P.add(g.box, g.trunk, x, y, 9, rz, def.w - 3, def.h - 3, 0.6);
    for (let i = 0; i < def.w / 10; i++) P.add(g.ico, g.leaf[i % 4], x - def.w / 2 + 6 + i * 10, y + ((i * 7) % 3) - 1, 12, i, 5, 5, 4.5);
  } else if (k === "shelter") {
    const hw = def.w / 2, hh = def.h / 2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add(g.box, g.darkMetal, x + sx * (hw - 1), y + sy * (hh - 1), 13, 0, 1.4, 1.4, 26);
    P.add(g.box, g.darkMetal, x, y, 26.5, 0, def.w + 4, def.h + 4, 1.4);
    P.add(g.box, glassPanel(), x, y + hh - 1, 13, 0, def.w - 3, 0.6, 22);
    P.add(g.box, g.wood, x, y + hh - 5, 5, 0, def.w * 0.6, 4, 1);
  } else if (k === "trolleys") {
    for (let i = 0; i < 6; i++) {
      P.add(g.box, trolleyMat(), x, y + def.h / 2 - 4 - i * 7.3, 7, rz, def.w - 4, 7, 7);
      P.add(g.box, g.red, x + def.w / 2 - 2, y + def.h / 2 - 4 - i * 7.3, 10.5, rz, 1, 6, 1);
    }
    P.add(g.box, g.darkMetal, x, y, 0.6, rz, def.w, def.h, 1.2);
    for (const s of [-1, 1]) P.add(g.box, g.darkMetal, x + s * def.w / 2, y, 7, rz, 1, def.h, 14);
  } else if (k === "wall") {
    P.add(g.box, g.concrete, x, y, 5, rz, def.w, def.h, 10);
    P.add(g.box, g.yellow, x, y, 10.3, rz, def.w, def.h + 0.4, 0.6);
  } else if (k === "barrier") {
    const horiz = def.w >= def.h;
    P.add(g.box, g.barrierStripe, x, y, 9, rz, def.w, def.h * 0.35, 3.4);
    const long = horiz ? def.w : def.h;
    for (const o of [-long / 2 + 2, long / 2 - 2]) {
      P.add(g.box, g.darkMetal, x + (horiz ? o : 0), y - (horiz ? 0 : o), 4.5, rz, 1, 1, 9);
      P.add(g.box, g.darkMetal, x + (horiz ? o : 0), y - (horiz ? 0 : o), 0.5, rz, horiz ? 2 : 6, horiz ? 6 : 2, 1);
    }
  } else if (k === "quay") {
    P.add(g.box, g.concrete, x, y, -4.5, rz, def.w, def.h, 15);
    P.add(g.box, g.darkConcrete, x, y, 3.2, rz, def.w, def.h + 0.6, 0.6);
  } else if (k === "jetty") {
    P.add(g.box, g.concrete, x, y, -3, rz, def.w, def.h, 16);
  } else if (k === "crates") {
    const n = Math.max(1, Math.round(def.w / 12));
    for (let i = 0; i < n; i++) {
      const cw = def.w / n;
      const hh = 10 + ((i * 7 + def.x) % 3) * 5;
      P.add(g.box, g.wood, x - def.w / 2 + cw * (i + 0.5), y, hh / 2, rz, cw - 0.8, def.h, hh);
    }
  } else if (k === "kiosk" || k === "block") {
    const h = k === "kiosk" ? 28 : 32;
    P.add(g.box, k === "kiosk" ? paintMat(0xe8e0d0) : paintMat(0xcfc6b8), x, y, h / 2, rz, def.w, def.h, h);
    P.add(g.box, k === "kiosk" ? paintMat(0x8b4a3c) : g.darkConcrete, x, y, h + 1.2, rz, def.w + 5, def.h + 5, 2.4);
    P.add(g.box, g.glass, x - def.w / 2 - 0.3, y, 10, rz, 0.6, def.h * 0.6, 12);
    P.add(g.box, paintMat(0x4a4f55), x, y + def.h / 2 + 0.3, 8, rz, 8, 0.6, 16);
  } else if (k === "kerb") {
    P.add(g.box, paintMat(0xc9c5bc), x, y, 1.5, rz, def.w, def.h, 3);
  } else if (k === "hedge") {
    P.add(g.box, g.hedge, x, y, 7, rz, def.w + 1, def.h + 1, 14);
  } else if (k === "vancaravan") {
    const m = buildTrailerModel("caravan");
    m.body.position.set(x, y, 0);
    m.body.rotation.z = rz;
    return m.body;
  } else if (k === "tent") {
    const col = def.w > 28 ? 0xd9822b : 0x2f7fbf;
    const T = _THREE;
    const s = new T.Shape([new T.Vector2(-def.h / 2, 0), new T.Vector2(def.h / 2, 0), new T.Vector2(0, 16)]);
    const geo = owned(new T.ExtrudeGeometry(s, { depth: def.w, bevelEnabled: false }));
    geo.rotateX(Math.PI / 2);
    geo.rotateZ(Math.PI / 2);
    geo.translate(-def.w / 2, 0, 0);
    P.add(geo, paintMat(col), x, y, 0, rz);
  }
  return null;
}

function glassPanel() {
  let m = _g3.mats.get("glassPanel");
  if (!m) {
    m = new _THREE.MeshStandardMaterial({ color: 0xb8d4e4, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.3 });
    m.userData.noShadow = true;
    _g3.mats.set("glassPanel", m);
  }
  return m;
}
function trolleyMat() {
  let m = _g3.mats.get("trolley");
  if (!m) {
    m = new _THREE.MeshStandardMaterial({ color: 0xc9d1da, wireframe: true, metalness: 0.8, roughness: 0.3 });
    _g3.mats.set("trolley", m);
  }
  return m;
}

function buildScenery(P, lvl, trees, lit) {
  const T = _THREE, g = _g3;
  const grp = new T.Group();
  const gr = lvl.ground;
  const outside = { lot: 0x6d8a45, deck: 0x55595e, marina: 0x7d8a5a, street: 0x9a968e, camp: 0x55803a }[gr];
  const outer = new T.Mesh(g.plane, owned(new T.MeshStandardMaterial({ color: outside, roughness: 0.95 })));
  outer.scale.set(7000, 7000, 1);
  outer.position.set(VIEW_W / 2, -VIEW_H / 2, gr === "deck" ? -420 : -0.6);
  if (gr === "marina") {
    // Land only south of the quay line; the sea takes the rest.
    outer.scale.set(7000, 3500, 1);
    outer.position.set(VIEW_W / 2, -(lvl.water.y1 + 1750), -0.6);
  }
  outer.receiveShadow = true;
  grp.add(outer);
  const rnd = lcg(lvl.id.length * 131);
  if (gr === "lot") {
    grp.add(buildingMesh(450, -150, 640, 180, 70, 3, false, "#d9d2c4"));
    const sign = new T.Mesh(g.plane, owned(new T.MeshStandardMaterial({ map: owned(canvasTex(512, 96, (c, w, h) => {
      c.fillStyle = "#1f5a3a"; c.fillRect(0, 0, w, h);
      c.fillStyle = "#ffffff"; c.font = "900 64px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("FRESH MARKET", w / 2, h / 2 + 4);
    })), emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.6 })));
    sign.material.emissiveMap = sign.material.map;
    sign.scale.set(260, 48, 1);
    sign.rotation.x = Math.PI / 2;
    sign.position.set(450, 58.5, 50);
    grp.add(sign);
    P.add(g.box, g.glass, 450, 59.6, 16, 0, 120, 1, 30);
    for (let x = -300; x < 1300; x += 70) trees.push({ x, y: 560 + rnd() * 40, r: 16 + rnd() * 8 });
    for (let y = -40; y < 560; y += 60) { trees.push({ x: -60 - rnd() * 30, y, r: 16 + rnd() * 8 }); trees.push({ x: 960 + rnd() * 30, y, r: 16 + rnd() * 8 }); }
  } else if (gr === "deck") {
    // Rooftop deck: slab edge and a city far below.
    P.add(g.box, g.darkConcrete, VIEW_W / 2, -VIEW_H / 2, -16, 0, VIEW_W + 24, VIEW_H + 24, 30);
    for (let i = 0; i < 70; i++) {
      const bx = VIEW_W / 2 + (rnd() - 0.5) * 3400, by = VIEW_H / 2 + (rnd() - 0.5) * 2600;
      if (Math.abs(bx - VIEW_W / 2) < 560 && Math.abs(by - VIEW_H / 2) < 360) continue;
      const w = 80 + rnd() * 160, d = 80 + rnd() * 160, h = 120 + rnd() * 300;
      const b = buildingMesh(bx, by, w, d, h, i * 13 + 7, false, ["#8a8176", "#9aa3ab", "#7d8a9a", "#b0a590"][i % 4]);
      b.position.z = -420 + h / 2;
      grp.add(b);
    }
    P.add(g.box, g.concrete, 930, -120, 30, 0, 40, 60, 90);
  } else if (gr === "marina") {
    const water = new T.Mesh(g.plane, lvWaterMat());
    water.scale.set(6000, 3200 + 150, 1);
    water.position.set(VIEW_W / 2, -(150 - (3200 + 150) / 2), -3.6);
    water.receiveShadow = true;
    grp.add(water);
    _lv3.water = water;
    const floor = new T.Mesh(g.plane, owned(new T.MeshStandardMaterial({ color: 0x0f2e38, roughness: 1 })));
    floor.scale.set(6000, 3400, 1);
    floor.position.set(VIEW_W / 2, -(150 - 1700), -26);
    grp.add(floor);
    for (let x = -600; x < 1500; x += 110) grp.add(buildingMesh(x, 620 + rnd() * 40, 90, 60, 40 + rnd() * 40, x + 11, false, ["#e8e0d0", "#d8c8b0", "#c8d8e0"][Math.abs(x) % 3]));
    for (let y = 180; y < 560; y += 70) { trees.push({ x: -50, y, r: 15 }); trees.push({ x: 950, y, r: 15 }); }
  } else if (gr === "street") {
    // Raised pavements and a building row on either side.
    const pave = owned(new T.MeshStandardMaterial({ map: owned(canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = "#a39e94"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "rgba(80,76,68,0.5)"; c.lineWidth = 2; c.strokeRect(0, 0, 32, 32); c.strokeRect(32, 32, 32, 32); c.strokeRect(32, 0, 32, 32); c.strokeRect(0, 32, 32, 32);
    }, { repeat: true })), roughness: 0.9 }));
    pave.map.repeat.set(160, 12);
    for (const [cy, h] of [[-120, 368], [620, 368]]) {
      const m = new T.Mesh(g.box, pave);
      m.scale.set(5000, h, 2.4);
      m.position.set(VIEW_W / 2, -cy, 1.2);
      m.receiveShadow = true;
      grp.add(m);
    }
    let x = -500;
    while (x < 1400) {
      const w = 60 + rnd() * 70;
      grp.add(buildingMesh(x + w / 2, -20 - 40, w - 2, 80, 70 + rnd() * 90, Math.floor(x + 900), lit, ["#b8866a", "#c9b79c", "#8e9aa6", "#d6c8b0", "#a0705a"][Math.floor(rnd() * 5)]));
      x += w;
    }
    x = -500;
    while (x < 1400) {
      const w = 60 + rnd() * 70;
      grp.add(buildingMesh(x + w / 2, 520 + 40, w - 2, 80, 26 + rnd() * 18, Math.floor(x + 1900), lit, ["#b8866a", "#c9b79c", "#8e9aa6", "#d6c8b0"][Math.floor(rnd() * 4)]));
      x += w;
    }
  } else if (gr === "camp") {
    for (let i = 0; i < 150; i++) {
      const a = rnd() * Math.PI * 2, d = 560 + rnd() * 700;
      trees.push({ x: VIEW_W / 2 + Math.cos(a) * d * 1.1, y: VIEW_H / 2 + Math.sin(a) * d * 0.7, r: 16 + rnd() * 12 });
    }
    for (let x = -40; x < 960; x += 36) { trees.push({ x, y: -40 - rnd() * 30, r: 14 + rnd() * 8 }); trees.push({ x, y: 540 + rnd() * 30, r: 14 + rnd() * 8 }); }
  }
  return grp;
}

function lvWaterMat() {
  const T = _THREE;
  const n = owned(canvasTex(256, 256, (c, w, h) => {
    // A tileable normal map from a sum of sines.
    const img = c.createImageData(w, h);
    const H = (x, y) => Math.sin(x * 0.098) * 0.6 + Math.sin(y * 0.147 + x * 0.049) * 0.5 + Math.sin((x + y) * 0.245) * 0.25;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1);
      const i = (y * w + x) * 4;
      img.data[i] = 128 + dx * 70; img.data[i + 1] = 128 + dy * 70; img.data[i + 2] = 255; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, { repeat: true, linear: true }));
  n.repeat.set(60, 32);
  const m = owned(new T.MeshStandardMaterial({ color: 0x2a6f8c, roughness: 0.12, metalness: 0.25, normalMap: n, transparent: true, opacity: 0.88 }));
  m.normalScale.set(0.6, 0.6);
  return m;
}

function buildLevel3d() {
  const T = _THREE, g = _g3;
  if (_lv3) teardownLevel3d();
  const lvl = _level;
  const sun = SUNS[lvl.sun];
  const lv = { gen: _levelGen, group: new T.Group(), parked: [], cones: [], lamps: [], water: null, boats: [], beams: [] };
  _lv3 = lv;
  g.scene.add(lv.group);

  // Lighting and sky.
  g.sun.color.setHex(sun.color);
  g.sun.intensity = sun.i;
  const dv = new T.Vector3(...sun.dir).normalize();
  g.sun.position.set(VIEW_W / 2 + dv.x * 1400, -VIEW_H / 2 + dv.y * 1400, dv.z * 1400);
  g.hemi.color.setHex(sun.sky);
  g.hemi.groundColor.setHex(sun.gnd);
  g.hemi.intensity = sun.hemi;
  const sky = owned(canvasTex(4, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, sun.top); gr.addColorStop(1, sun.bot);
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  }));
  if (g.skyTex) g.skyTex.dispose();
  g.skyTex = sky;
  g.scene.background = sky;
  g.scene.fog = new T.Fog(sun.fog, 1500, 5200);

  // Ground: the same baked canvas the flat renderers use, at 3× resolution.
  const S = 3;
  const cv = makeCanvas(VIEW_W * S, VIEW_H * S);
  const cx = cv.getContext("2d");
  cx.scale(S, S);
  drawGround(cx, lvl);
  const gtex = owned(new T.CanvasTexture(cv));
  gtex.colorSpace = T.SRGBColorSpace;
  gtex.anisotropy = g.renderer?.capabilities?.getMaxAnisotropy?.() ?? 8;
  const gmat = owned(new T.MeshStandardMaterial({ map: gtex, roughness: 0.92, metalness: 0 }));
  const ground = new T.Mesh(owned(new T.PlaneGeometry(VIEW_W, VIEW_H)), gmat);
  ground.position.set(VIEW_W / 2, -VIEW_H / 2, 0);
  ground.receiveShadow = true;
  if (lvl.water) {
    // Land only south of the quay; the water sits lower, so the quay reads.
    const y0 = lvl.water.y1;
    ground.geometry.dispose();
    ground.geometry = owned(new T.PlaneGeometry(VIEW_W, VIEW_H - y0));
    ground.position.set(VIEW_W / 2, -(y0 + (VIEW_H - y0) / 2), 0);
    const tx = gtex.clone();
    tx.repeat.set(1, (VIEW_H - y0) / VIEW_H);
    tx.offset.set(0, 0);
    tx.needsUpdate = true;
    owned(tx);
    gmat.map = tx;
    gtex.dispose();
    // The slipway: a slab tipping into the water.
    const r = lvl.ramp;
    const rl = r.y1 - r.y0;
    const ramp = new T.Mesh(g.box, owned(new T.MeshStandardMaterial({ color: 0x8b8779, roughness: 0.9, map: owned(canvasTex(64, 256, (c, w, h) => {
      c.fillStyle = "#8b8779"; c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(50,48,40,0.5)";
      for (let yy = 0; yy < h; yy += 12) c.fillRect(0, yy, w, 3);
      c.fillStyle = "rgba(70,110,60,0.5)"; c.fillRect(0, 0, w, 60);
    })) })));
    const slope = Math.atan2(9, rl);
    ramp.scale.set(r.x1 - r.x0, Math.hypot(rl, 9), 2);
    ramp.position.set((r.x0 + r.x1) / 2, -(r.y0 + r.y1) / 2, -4.5 - 1);
    ramp.rotation.x = -slope;
    ramp.receiveShadow = true;
    lv.group.add(ramp);
  }
  lv.group.add(ground);

  // Statics, trees, scenery.
  const P = new Parts();
  const trees = [];
  const lamps = [];
  for (const s of _statics) {
    const extra = buildStatic3d(P, s.def, lvl, trees, lamps);
    if (extra) lv.group.add(extra);
  }
  for (let i = 0; i < _space.bodies.length; i++) {
    const d = _space.bodies.at(i).userData?._static;
    if (d?.kind === "boundary") buildStatic3d(P, d, lvl, trees, lamps);
  }
  for (const d of lvl.decor ?? []) {
    if (d.kind === "pontoon") P.add(g.box, g.wood, d.x, -d.y, -1.5, 0, d.w, d.h, 2.4);
    if (d.kind === "boat") {
      const b = buildBoatHull(d.len, d.len * 0.34, [0x8a1f24, 0x1f3a5a, 0x2f6b4a, 0x5b4a8a][lv.boats.length % 4]);
      b.position.set(d.x, -d.y, -8);
      b.rotation.z = -d.a;
      lv.group.add(b);
      lv.boats.push({ grp: b, ph: lv.boats.length * 1.7 });
    }
  }
  lv.group.add(buildScenery(P, lvl, trees, sun.lamps));
  lv.group.add(P.merged());
  const tg = buildTrees(trees);
  if (tg) lv.group.add(tg);
  if (sun.lamps) {
    for (const l of lamps) {
      const pool = new T.Mesh(g.plane, g.poolMat);
      pool.scale.set(90, 90, 1);
      pool.position.set(l.x, -l.y, 0.35);
      pool.renderOrder = 2;
      lv.group.add(pool);
    }
  }

  // Parked cars (merged, with their own hazard-lamp material).
  for (const pk of _parked) {
    const hz = owned(new T.MeshStandardMaterial({ color: 0x7a4a10, emissive: 0xffa22a, emissiveIntensity: 0.05, roughness: 0.3 }));
    hz.userData.noShadow = true;
    const m = buildCarModel(pk.spec, pk.color, { hazardMat: hz });
    lv.group.add(m.body);
    lv.parked.push({ rec: pk, grp: m.body, hz });
  }
  // Cones.
  for (const c of _cones) {
    const yaw = new T.Group();
    const tilt = new T.Group();
    const base = new T.Mesh(g.box, g.trim); base.scale.set(7, 7, 1); base.position.z = 0.5;
    const body = new T.Mesh(g.cone, g.coneM); body.scale.set(3, 3, 9); body.position.z = 5.4;
    const band = new T.Mesh(g.cylZ, g.white); band.scale.set(1.9, 1.9, 1.6); band.position.z = 6;
    for (const o of [base, body, band]) { o.castShadow = true; tilt.add(o); }
    yaw.add(tilt);
    lv.group.add(yaw);
    lv.cones.push({ rec: c, yaw, tilt });
  }

  // Target bay: tinted decal, glowing curtain, progress strip.
  const bay = lvl.bay;
  const bayGrp = new T.Group();
  const decal = new T.Mesh(g.plane, owned(new T.MeshBasicMaterial({ map: owned(canvasTex(256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "rgba(255,255,255,0.22)"; c.fillRect(0, 0, w, h);
    c.strokeStyle = "#ffffff"; c.lineWidth = 8;
    const k = 34;
    for (const [sx, sy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      c.beginPath(); c.moveTo(sx + (sx ? -k : k), sy + (sy ? -4 : 4)); c.lineTo(sx + (sx ? -4 : 4), sy + (sy ? -4 : 4)); c.lineTo(sx + (sx ? -4 : 4), sy + (sy ? -k : k)); c.stroke();
    }
    c.lineWidth = 7;
    for (let i = 0; i < 3; i++) { const x = w - 60 - i * 40; c.beginPath(); c.moveTo(x, h / 2 - 22); c.lineTo(x - 22, h / 2); c.lineTo(x, h / 2 + 22); c.stroke(); }
    c.font = "900 54px system-ui, sans-serif"; c.fillStyle = "rgba(255,255,255,0.8)"; c.textAlign = "center"; c.textBaseline = "middle";
    c.save(); c.translate(64, h / 2); c.rotate(Math.PI / 2); c.fillText("P", 0, 0); c.restore();
  })), transparent: true, depthWrite: false, color: 0xffd166 })));
  decal.scale.set(bay.l, bay.w, 1);
  decal.position.z = 0.45;
  decal.renderOrder = 3;
  bayGrp.add(decal);
  const curtainMat = owned(new T.MeshBasicMaterial({ map: g.fadeTex, color: 0xffd166, transparent: true, opacity: 0.45, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
  const CH = 22;
  for (const [px, py, len, rot] of [[0, bay.w / 2, bay.l, 0], [0, -bay.w / 2, bay.l, 0], [bay.l / 2, 0, bay.w, Math.PI / 2], [-bay.l / 2, 0, bay.w, Math.PI / 2]]) {
    const c = new T.Mesh(g.plane, curtainMat);
    c.scale.set(len, CH, 1);
    c.rotateZ(rot);
    c.rotateX(Math.PI / 2);
    c.position.set(px, py, CH / 2);
    c.renderOrder = 4;
    bayGrp.add(c);
  }
  const prog = new T.Mesh(g.plane, owned(new T.MeshBasicMaterial({ color: 0x7ee787, transparent: true, opacity: 0.95, depthWrite: false })));
  prog.position.set(0, -bay.w / 2 - 3.5, 0.5);
  prog.renderOrder = 5;
  bayGrp.add(prog);
  const zf = groundZAt(bay.x + Math.cos(bay.a) * bay.l / 2, bay.y + Math.sin(bay.a) * bay.l / 2);
  const zr = groundZAt(bay.x - Math.cos(bay.a) * bay.l / 2, bay.y - Math.sin(bay.a) * bay.l / 2);
  bayGrp.position.set(bay.x, -bay.y, (zf + zr) / 2);
  bayGrp.rotation.set(0, -Math.atan2(zf - zr, bay.l), -bay.a, "ZYX");
  lv.group.add(bayGrp);
  lv.bay = { grp: bayGrp, decal, curtainMat, prog };

  // Guide dots + ghost trailer outline.
  const dots = new T.InstancedMesh(g.disc, owned(new T.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.85, depthWrite: false })), 26);
  dots.renderOrder = 6;
  dots.frustumCulled = false;
  lv.group.add(dots);
  const ghost = new T.LineLoop(owned(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()])), owned(new T.LineBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.6 })));
  ghost.frustumCulled = false;
  lv.group.add(ghost);
  lv.guide = { dots, ghost };

  // The rig.
  const tailC = owned(new T.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.3, roughness: 0.3 }));
  const revC = owned(new T.MeshStandardMaterial({ color: 0xd8d8d8, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.3 }));
  const headC = owned(new T.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff2cc, emissiveIntensity: sun.lamps ? 2.4 : 0.5, roughness: 0.2 }));
  const car = buildCarModel(CAR_TYPES.wagon, PLAYER_COLOR, { live: true, tailMat: tailC, revMat: revC, headMat: headC, rails: true });
  lv.group.add(car.body);
  const tailT = owned(new T.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.3, roughness: 0.3 }));
  const trailer = buildTrailerModel(_veh.trailer.key, { tailMat: tailT });
  lv.group.add(trailer.body);
  // Night beams: headlights ahead, reversing light behind.
  const beamMat = owned(new T.MeshBasicMaterial({ map: g.beamTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: sun.lamps ? 0.55 : 0 }));
  const beam = new T.Mesh(g.plane, beamMat);
  beam.scale.set(70, 34, 1);
  beam.rotation.z = -Math.PI / 2;
  beam.position.set(CAR.len / 2 * M + 36, 0, 0.5);
  beam.renderOrder = 2;
  car.body.add(beam);
  const revPoolMat = owned(new T.MeshBasicMaterial({ map: g.beamTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
  const revPool = new T.Mesh(g.plane, revPoolMat);
  revPool.scale.set(44, 26, 1);
  revPool.rotation.z = Math.PI / 2;
  revPool.position.set(-(TRAILERS[_veh.trailer.key].len / 2) * M - 22, 0, 0.5);
  revPool.renderOrder = 2;
  trailer.body.add(revPool);
  lv.car = car;
  lv.trailer = trailer;
  lv.mats = { tailC, revC, tailT, beamMat, revPoolMat, night: sun.lamps };
  _camPos = null;
}

// Place a rigid model at a body: yaw from the body, pitch from the ground
// under its two ends (only the slipway is not flat).
function placeOnGround(obj, x, y, a, half) {
  const c = Math.cos(a), s = Math.sin(a);
  const zf = groundZAt(x + c * half, y + s * half), zr = groundZAt(x - c * half, y - s * half);
  obj.position.set(x, -y, (zf + zr) / 2);
  obj.rotation.set(0, -Math.atan2(zf - zr, half * 2), -a, "ZYX");
}

function sync3d() {
  const lv = _lv3, g = _g3;
  if (!lv || !_veh) return;
  const v = _veh, c = v.chassis, tb = v.trailer.body;
  // Player car: body pose, wheels from their bodies (steer = wheel angle
  // relative to the chassis, spin = distance rolled).
  placeOnGround(lv.car.body, c.position.x, c.position.y, c.rotation, CAR.len / 2 * M);
  for (let i = 0; i < 4; i++) {
    const w3 = lv.car.wheels[i];
    // car.wheels order: FL(+y three), FR, RL, RR; physics: [0] y<0 front … three y = −ly.
    const phys = v.wheels[w3.front ? (w3.ly > 0 ? 0 : 1) : (w3.ly > 0 ? 2 : 3)];
    w3.pivot.rotation.z = -wrapPi(phys.body.rotation - c.rotation);
    w3.spin.rotation.y = phys.spin;
  }
  placeOnGround(lv.trailer.body, tb.position.x, tb.position.y, tb.rotation, _veh.trailer.spec.len / 2 * M);
  for (let i = 0; i < lv.trailer.wheels.length; i++) {
    const phys = v.trailer.wheels[i];
    lv.trailer.wheels[i].spin.rotation.y = phys.spin;
  }
  // Lamps.
  const braking = v.braking || (v.holding && _phase === "play");
  const rev = v.gear < 0 && _phase === "play";
  lv.mats.tailC.emissiveIntensity = braking ? 2.6 : lv.mats.night ? 0.9 : 0.3;
  lv.mats.tailT.emissiveIntensity = lv.mats.tailC.emissiveIntensity;
  lv.mats.revC.emissiveIntensity = rev ? 2.2 : 0;
  lv.mats.revPoolMat.opacity = rev ? (lv.mats.night ? 0.5 : 0.22) : 0;
  // Parked cars.
  for (const p of lv.parked) {
    const b = p.rec.body;
    p.grp.position.set(b.position.x, -b.position.y, 0);
    p.grp.rotation.z = -b.rotation;
    const on = p.rec.hazard > 0 && Math.floor(p.rec.hazard * 3) % 2 === 0;
    p.hz.emissiveIntensity = on ? 3.2 : 0.05;
  }
  for (const cn of lv.cones) {
    const b = cn.rec.body;
    cn.yaw.position.set(b.position.x, -b.position.y, 0);
    if (cn.rec.down) {
      cn.yaw.rotation.z = -cn.rec.tipA;
      cn.tilt.rotation.y = cn.rec.tip * Math.PI / 2 * 0.92;
      cn.tilt.position.z = cn.rec.tip * 3;
    } else {
      cn.yaw.rotation.z = -b.rotation;
    }
  }
  // Bay.
  const ps = _parkState;
  const ok = ps && ps.inside && ps.aligned;
  const col = ok ? 0x7ee787 : 0xffd166;
  lv.bay.decal.material.color.setHex(col);
  lv.bay.curtainMat.color.setHex(col);
  lv.bay.curtainMat.opacity = (ok ? 0.55 : 0.28) + 0.15 * Math.sin(_time * 4);
  const f = clamp(_hold / PARK_HOLD, 0, 1);
  lv.bay.prog.visible = f > 0;
  lv.bay.prog.scale.set(Math.max(0.01, _level.bay.l * f), 2.6, 1);
  lv.bay.prog.position.x = -_level.bay.l / 2 + _level.bay.l * f / 2;
  // Guide.
  const show = _showGuide && _phase === "play" && v.gear < 0;
  lv.guide.dots.visible = show;
  lv.guide.ghost.visible = show;
  if (show) {
    const path = predictPath();
    const d = g.dummy;
    for (let i = 0; i < path.length; i++) {
      const q = path[i];
      const s = i % 3 === 0 ? 1.9 : 1.2;
      d.position.set(q.x, -q.y, groundZAt(q.x, q.y) + 0.7);
      d.rotation.set(0, 0, 0);
      d.scale.set(s, s, 1);
      d.updateMatrix();
      lv.guide.dots.setMatrixAt(i, d.matrix);
    }
    lv.guide.dots.count = path.length;
    lv.guide.dots.instanceMatrix.needsUpdate = true;
    const last = path[Math.min(path.length - 1, 14)];
    if (last) {
      const t = _veh.trailer.spec;
      const off = t.axle * M;
      const gx = last.x - Math.cos(last.a) * off, gy = last.y - Math.sin(last.a) * off;
      const pos = lv.guide.ghost.geometry.attributes.position;
      const pts = xform(gx, gy, last.a, rectPts(-t.len / 2 * M, -t.wid / 2 * M, t.len / 2 * M, t.wid / 2 * M));
      for (let i = 0; i < 4; i++) pos.setXYZ(i, pts[i * 2], -pts[i * 2 + 1], groundZAt(pts[i * 2], pts[i * 2 + 1]) + 0.9);
      pos.needsUpdate = true;
    }
  }
  // Water and moored boats.
  if (lv.water) {
    lv.water.material.normalMap.offset.set(_time * 0.012, _time * 0.02);
  }
  for (const b of lv.boats) {
    b.grp.position.z = -8.5 + Math.sin(_time * 1.3 + b.ph) * 0.8;
    b.grp.rotation.x = Math.sin(_time * 1.1 + b.ph) * 0.03;
  }
}

function placeCamera(camera) {
  const T = _THREE;
  const v = _veh;
  if (!v) return;
  const c = v.chassis.position;
  const bay = _level.bay;
  let ex, ey, ez, tx, ty, tz;
  const title = _phase === "title";
  if (title) {
    // Slow orbit around the site on the title screen.
    const a = _time * 0.08;
    tx = VIEW_W / 2; ty = -VIEW_H / 2 + 20; tz = 0;
    ex = tx + Math.cos(a) * 620; ey = ty + Math.sin(a) * 420 - 80; ez = 430;
  } else if (_camMode === 1) {
    const h = v.chassis.rotation;
    _camYaw += wrapPi(h - _camYaw) * clamp((performance.now() - (_g3.lastYaw || performance.now())) / 1000 * 3.5, 0, 1);
    _g3.lastYaw = performance.now();
    const fx = Math.cos(_camYaw), fy = Math.sin(_camYaw);
    const back = 185 * _camDist;
    tx = c.x + fx * 30; ty = -(c.y + fy * 30); tz = 6;
    ex = c.x - fx * back; ey = -(c.y - fy * back); ez = 118 * _camDist;
  } else if (_camMode === 2) {
    tx = VIEW_W / 2; ty = -VIEW_H / 2 + 10; tz = 0;
    ex = VIEW_W / 2; ey = -VIEW_H / 2 - 420 * _camDist; ez = 560 * _camDist;
  } else {
    const k = 0.3;
    const fx = c.x + (bay.x - c.x) * k, fy = c.y + (bay.y - c.y) * k;
    const D = 400 * _camDist, pitch = 0.95;
    tx = fx; ty = -fy; tz = 0;
    ex = tx; ey = ty - Math.cos(pitch) * D; ez = Math.sin(pitch) * D;
  }
  // Frame-rate independent smoothing (the render rate is not the physics rate).
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  const dt = clamp((now - (_g3.lastCam || now)) / 1000, 0, 0.1);
  _g3.lastCam = now;
  if (!_camPos) {
    _camPos = new T.Vector3(ex, ey, ez);
    _camTgt = new T.Vector3(tx, ty, tz);
    _camYaw = v.chassis.rotation;
  } else {
    const k = 1 - Math.exp(-dt * (title ? 4 : 4.5));
    _camPos.lerp(_g3.v.set(ex, ey, ez), k);
    _camTgt.lerp(_g3.v.set(tx, ty, tz), k);
  }
  const [sx, sy] = shakeOffset();
  camera.position.set(_camPos.x + sx * 0.6, _camPos.y - sy * 0.6, _camPos.z);
  camera.up.set(0, 0, 1);
  camera.lookAt(_camTgt);
  camera.updateMatrixWorld();
}

function renderPip(renderer, scene) {
  _pipRect = null;
  if (!_rearCam || _phase !== "play" || !_veh || _veh.gear > 0) return;
  const T = _THREE, g = _g3;
  const t = _veh.trailer, b = t.body;
  const a = b.rotation, c = Math.cos(a), s = Math.sin(a);
  const back = t.spec.len / 2 * M + (t.key === "boat" ? 7 : 1.5);
  const rx = b.position.x - c * back, ry = b.position.y - s * back;
  const cam = g.rearCam;
  const z0 = groundZAt(rx, ry);
  cam.position.set(rx, -ry, z0 + (t.key === "caravan" ? 22 : t.key === "boat" ? 20 : 15));
  cam.lookAt(rx - c * 60, -(ry - s * 60), z0);
  const size = renderer.getSize(g.size || (g.size = new T.Vector2()));
  const sc = Math.min(size.x / VIEW_W, size.y / VIEW_H);
  const ox = (size.x - VIEW_W * sc) / 2, oy = (size.y - VIEW_H * sc) / 2;
  const r = { x: VIEW_W - 250, y: 70, w: 240, h: 135 };
  _pipRect = r;
  const vx = ox + r.x * sc, vy = size.y - (oy + (r.y + r.h) * sc), vw = r.w * sc, vh = r.h * sc;
  cam.aspect = vw / vh;
  cam.updateProjectionMatrix();
  renderer.setScissorTest(true);
  renderer.setScissor(vx, vy, vw, vh);
  renderer.setViewport(vx, vy, vw, vh);
  renderer.render(scene, cam);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, size.x, size.y);
}

function render3dScene(renderer, scene, camera, adapter) {
  ensureScene(adapter, scene, renderer);
  if (!_lv3 || _lv3.gen !== _levelGen) buildLevel3d();
  sync3d();
  placeCamera(camera);
  renderer.render(scene, camera);
  renderPip(renderer, scene);
  // World → overlay projection for the floating texts.
  const T = _THREE;
  const size = renderer.getSize(new T.Vector2());
  const sc = Math.min(size.x / VIEW_W, size.y / VIEW_H);
  const ox = (size.x - VIEW_W * sc) / 2, oy = (size.y - VIEW_H * sc) / 2;
  const pv = new T.Vector3();
  _project = (x, y, z = 0) => {
    pv.set(x, -y, z).project(camera);
    if (pv.z > 1) return null;
    return { x: ((pv.x + 1) / 2 * size.x - ox) / sc, y: ((1 - pv.y) / 2 * size.y - oy) / sc };
  };
}

// ── Demo definition ──────────────────────────────────────────────────────
function _debugState() {
  return { veh: _veh, level: _level, park: _parkState, phase: _phase, clock: _clock };
}

function handleAction(id) {
  if (!id) return false;
  if (id.startsWith("lvl")) {
    const i = Number(id.slice(3));
    if (i === _levelIdx && _phase === "title") startLevel(i);
    else { _levelIdx = i; loadLevel(i); }
    return true;
  }
  if (id === "start") { startLevel(_levelIdx); return true; }
  if (id === "retry") { startLevel(_levelIdx); return true; }
  if (id === "next") { startLevel((_levelIdx + 1) % LEVELS.length); return true; }
  if (id === "menu") { loadLevel(_levelIdx); goTitle(); return true; }
  return false;
}

export default {
  id: "hitch-park",
  label: "Hitch & Park",
  tags: ["Gameplay", "Vehicle", "Joints", "Top-down", "Listeners", "Mobile"],
  desc:
    "A <b>trailer-parking game</b> seen from above: five sites — supermarket, parking deck, marina slipway, high street, campsite — each with one bay the trailer must end up in, <b>nose out, square and stopped</b>. Parked cars can be shoved (their hazard lights tell on you), cones topple, pillars, hedges and trees don't budge; every bump costs points against a par time. <b>↑ ↓</b> drive / reverse, <b>← →</b> steer, <b>SPACE</b> brake, <b>G</b> path guide; on touch, hold and drag. Physics: the car is a chassis plus <b>four wheel bodies</b> — rear ones on <code>WeldJoint</code>s, front ones on <code>PivotJoint</code>s steered by Ackermann <code>AngleJoint</code>s — and only the <b>front wheels drive</b>, so the steered wheels pull the car round; the trailer hangs on a <code>PivotJoint</code> at the tow ball and folds if you reverse it wrong. In <b>3D</b>: shadowed sites, spinning and steering wheels, brake and reversing lights, a reversing-camera inset.",
  walls: false,
  workerCompatible: false,
  camera: null,
  velocityIterations: 10,
  positionIterations: 4,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);
    _keys = {};
    _joy = null;
    _mode3d = false;
    _project = null;
    _layers = null;
    _banners = [];
    _floaters = [];
    loadLevel(_levelIdx);
    goTitle();

    // Tyre forces, steering and the parked cars' handbrakes belong to the
    // physics clock (the runner may run several fixed steps per frame, or
    // none), so the game tick runs from the Space's own step.
    const spaceStep = space.step.bind(space);
    space.step = (dt, velIter, posIter) => {
      tickGame();
      spaceStep(dt, velIter, posIter);
    };

    if (typeof window !== "undefined") {
      if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
      if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
      _onKeyDown = (e) => {
        if (!_space) return;
        const code = e.code;
        const typing = e.target && /input|textarea|select/i.test(e.target.tagName || "");
        if (typing) return;
        _keys[code] = true;
        if (_phase === "title") {
          const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4 }[code];
          if (n !== undefined) { _levelIdx = n; loadLevel(n); }
          if (code === "ArrowLeft" || code === "KeyA") { _levelIdx = (_levelIdx + LEVELS.length - 1) % LEVELS.length; loadLevel(_levelIdx); }
          if (code === "ArrowRight" || code === "KeyD") { _levelIdx = (_levelIdx + 1) % LEVELS.length; loadLevel(_levelIdx); }
          if (code === "Enter" || code === "Space") startLevel(_levelIdx);
        } else if (_phase === "done") {
          if (code === "Enter" || code === "Space") primaryAction();
          if (code === "KeyR") startLevel(_levelIdx);
          if (code === "Escape") handleAction("menu");
        } else {
          if (code === "KeyR") startLevel(_levelIdx);
          if (code === "Escape") handleAction("menu");
        }
        if (code === "KeyG") _showGuide = !_showGuide;
        if (code === "KeyF") _showForces = !_showForces;
        if (code === "KeyC") _camMode = (_camMode + 1) % 3;
        if (code === "KeyV") _rearCam = !_rearCam;
        if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(code)) e.preventDefault();
      };
      _onKeyUp = (e) => { _keys[e.code] = false; };
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  click(x, y) {
    const id = buttonAt(x, y);
    if (handleAction(id)) return;
    if (_phase === "title") return;
    if (_phase === "play" || _phase === "intro") _joy = { ox: x, oy: y, x, y };
  },

  drag(x, y) {
    if (_joy) { _joy.x = x; _joy.y = y; }
  },

  release() {
    _joy = null;
  },

  // Mouse wheel zooms the 3D cameras.
  wheel(dy) {
    _camDist = clamp(_camDist * (dy > 0 ? 1.08 : 1 / 1.08), 0.55, 1.7);
  },

  step() {
    // Visual clock only — the game runs from the Space.step wrapper.
    _time += 1 / 60;
  },

  render(ctx, space, W, H, showOutlines) {
    _mode3d = false;
    _project = null;
    void showOutlines;
    renderCanvas(ctx);
    void space; void W; void H;
  },

  renderPixi(adapter, space, W, H, showOutlines) {
    _mode3d = false;
    _project = null;
    void showOutlines;
    renderPixiScene(adapter);
    void space; void W; void H;
  },

  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter) {
    if (!_THREE) {
      loadThree().then((mod) => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    _mode3d = true;
    render3dScene(renderer, scene, camera, adapter);
    _frame3d = _drawFrame;
    void space; void W; void H; void camX; void camY;
  },

  // Every render mode: HUD, menus and world cues.
  render3dOverlay(ctx, space, W, H) {
    if (_frame3d !== _drawFrame) { _mode3d = false; _project = null; }
    drawOverlay(ctx);
    _drawFrame++;
    void space; void W; void H;
  },

  // Harness access (not used by the site).
  _debug() {
    return {
      get veh() { return _veh; }, get park() { return _parkState; }, get phase() { return _phase; },
      get hits() { return _hits + _crashes; }, get result() { return _result; }, get clock() { return _clock; },
      get parked() { return _parked; }, get cones() { return _cones; },
      start: (i) => { startLevel(i); _phase = "play"; },
      load: (i) => loadLevel(i),
      title: () => goTitle(),
      setAutopilot: (f) => { _autopilot = f; },
      setThree: (T) => { _THREE = T; },
      setCam: (m) => { _camMode = m; },
      predict: () => predictPath(),
      info: () => { const r = _g3?.renderer?.info?.render; return r ? { calls: r.calls, tris: r.triangles } : null; },
      setRearCam: (v) => { _rearCam = v; },
      levels: LEVELS,
    };
  },
};
