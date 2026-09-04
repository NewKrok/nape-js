import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType, Ray,
} from "../nape-js.esm.js?v=3.41.0";

// Tinywheels Cup — top-down kart-racer with one player + three waypoint-driven AI
// opponents racing three laps on a closed Catmull-Rom track. The car controller
// (PIXEL_RATIO, the CAR tuning block, updateFriction / updateDrive / updateTurn)
// is the same iforce2d-style model used in `docs/demos/car-topdown.js`; the
// new pieces here are the multi-car field, the AI controller, the lap sensors,
// the boost pads, and the HUD / race-end screen. Renderer-agnostic — the
// default body draw handles cars + walls + sensors across canvas2d / threejs /
// pixi, and `render3dOverlay` paints the HUD on top.
const PIXEL_RATIO = 10;

// Car tuning ported from /Users/somoraczkrisztian/work/cars
// (`shared/constants.js` CAR block), with top speed + drive force boosted by
// 50% per user request. Steer/drift values left at the cars defaults so the
// car still feels controllable at the higher speed.
const CAR = {
  WIDTH: 1.32,
  LENGTH: 2.64,
  MAX_FORWARD_SPEED: 702,   // 468 × 1.5
  MAX_REVERSE_SPEED: 117,   // 78 × 1.5
  MAX_DRIVE_FORCE: 165,     // 110 × 1.5
  BRAKE_FORCE: 120,
  MAX_LATERAL_IMPULSE: 2.3,
  DRAG_MODIFIER: 0.08,
  ENGINE_BRAKE: 0.25,
  ANGULAR_FRICTION: 0.22,
  STEER_TORQUE: 900,
  STEER_LOCK_SPEED: 40,
  STEER_LOCK_POWER: 2.5,
  DRIFT_LATERAL_IMPULSE: 1.38,
  DRIFT_ANGULAR_FRICTION: 0.18,
  DRIFT_STEER_TORQUE: 1600,
  DRIFT_BRAKE_FACTOR: 0.3,
  DRIFT_MAX_ANGULAR_VEL: 3.5,
};

const DT = 1 / 60;
const SHAKE_MIN_SPEED = 80;

// World in nape pixel units (PIXEL_RATIO * world units). Expanded so the
// new 3-lobed twisty track (span ≈ 322×256 units) fits with room to spare.
const WORLD_W = 420 * PIXEL_RATIO;   // 4200 px
const WORLD_H = 300 * PIXEL_RATIO;   // 3000 px

// Track ribbon. 20 world units ≈ 15× the car width — wide enough for 4
// cars wheel-to-wheel. The min centerline curvature radius (~11.5 units)
// stays just above halfWidth (10 units), so the `_cleanOffsetEdge` step
// never folds an offset edge.
const TRACK_ROAD_WIDTH_UNITS = 20;
const TRACK_SPLINE_SEGMENTS = 720; // dense enough that the _cleanOffsetEdge
                                   // doesn't leave large chords between kept
                                   // vertices on tight corners.
// Wall thickness in pixels. Matches cars/Track.js's TRACK.WALL_THICKNESS
// (0.5 world units × PIXEL_RATIO=10 → 5 px).
const WALL_THICK = 5;

// Closed-loop control points (world units, relative to world centre).
//
// Generated from a parametric polar curve r(θ) = R + A1·sin(k1·θ) + A2·sin(k2·θ)
// with R=100, A1=35 (k1=3), A2=6 (k2=5), and an x-stretch of 1.5. The
// two harmonics give 3 *big* lobes (the dominant cornering features) with
// finer ripples (subtle linking curves) — visually a flowing 3-corner
// circuit with a long sweeping right-hand section and a tighter twisty
// section on the left.
//
// 60 CPs sampled uniformly in θ; index 0 sits at the top (start/finish).
// Geometric guarantee: min centerline curvature radius ≈ 11.5 units, just
// above halfWidth (10 units), so the `_cleanOffsetEdge` cleaner doesn't
// drop a single vertex and the wall ribbon has no folds or gaps.
const TRACK_CONTROL_POINTS = [
  { x:     0, y:  -100 },
  { x:    18, y:  -113 },
  { x:    39, y:  -123 },
  { x:    62, y:  -128 },
  { x:    84, y:  -127 },
  { x:   103, y:  -120 },
  { x:   118, y:  -108 },
  { x:   126, y:   -93 },
  { x:   129, y:   -77 },
  { x:   127, y:   -62 },
  { x:   123, y:   -47 },
  { x:   118, y:   -35 },
  { x:   113, y:   -25 },
  { x:   110, y:   -16 },
  { x:   107, y:    -8 },
  { x:   107, y:     0 },
  { x:   107, y:     8 },
  { x:   110, y:    16 },
  { x:   113, y:    25 },
  { x:   118, y:    35 },
  { x:   123, y:    47 },
  { x:   127, y:    62 },
  { x:   129, y:    77 },
  { x:   126, y:    93 },
  { x:   118, y:   108 },
  { x:   103, y:   120 },
  { x:    84, y:   127 },
  { x:    62, y:   128 },
  { x:    39, y:   123 },
  { x:    18, y:   113 },
  { x:     0, y:   100 },
  { x:   -14, y:    86 },
  { x:   -23, y:    73 },
  { x:   -30, y:    62 },
  { x:   -38, y:    56 },
  { x:   -47, y:    54 },
  { x:   -59, y:    54 },
  { x:   -75, y:    56 },
  { x:   -94, y:    57 },
  { x:  -116, y:    56 },
  { x:  -137, y:    53 },
  { x:  -156, y:    46 },
  { x:  -172, y:    37 },
  { x:  -184, y:    26 },
  { x:  -191, y:    13 },
  { x:  -193, y:     0 },
  { x:  -191, y:   -13 },
  { x:  -184, y:   -26 },
  { x:  -172, y:   -37 },
  { x:  -156, y:   -46 },
  { x:  -137, y:   -53 },
  { x:  -116, y:   -56 },
  { x:   -94, y:   -57 },
  { x:   -75, y:   -56 },
  { x:   -59, y:   -54 },
  { x:   -47, y:   -54 },
  { x:   -38, y:   -56 },
  { x:   -30, y:   -62 },
  { x:   -23, y:   -73 },
  { x:   -14, y:   -86 },
];

// ── Race rules ────────────────────────────────────────────────────────────
const LAP_TARGET = 3;
const RACER_COUNT = 8;              // 1 player + 7 AI
const COUNTDOWN_FRAMES = 180;       // 3s pre-race countdown ("3 · 2 · 1 · GO")
const FINISH_HOLD_FRAMES = 240;     // 4s before letting the user restart
const STARTING_GRID_SPACING_UNITS = 4.2; // back-to-front gap in world units

// ── AI tuning ─────────────────────────────────────────────────────────────
// The controller targets a waypoint ~AI_LOOKAHEAD steps along the centerline
// from its current track-progress index. Throttle is `1 - speed / maxSpeed`
// modulated by upcoming turn curvature, so the AI lifts before tight corners
// instead of plowing into walls. Small per-frame steering jitter makes the
// pack feel less robotic and reduces rubber-banding on long straights.
const AI_LOOKAHEAD = 18;            // centerline indices ahead (≈ 5 % of loop)
const AI_TURN_LOOKAHEAD = 26;       // farther horizon used for slowdown bias
const AI_STEER_NOISE = 0.06;        // ±0.06 of [-1..1] steer range
const AI_THROTTLE_MIN = 0.35;       // never coast to a complete stop
const AI_PROBE_LEN = 6 * PIXEL_RATIO; // raycast probe length for wall nudge
const AI_PROBE_SIDE = Math.PI / 5;  // ±36° off-axis feelers
// Scaled up with the 50% speed bump — at higher top speed the AI needs to
// detect (and brake for) a turn at a longer radius to avoid plowing into a
// wall. Both thresholds bumped ~1.5×.
const AI_HARD_TURN_RADIUS_PX = 145;
const AI_SOFT_TURN_RADIUS_PX = 270;

// ── Item pads ─────────────────────────────────────────────────────────────
// Mario-Kart-style "?" boxes laid out around the loop. Pickup grants a
// random item into the car's single slot; Space (or AI controller) fires it.
const BOOST_COUNT = 6;              // GROUP count — each group is 3 boxes side-by-side
const BOOST_RADIUS = 18;
const BOOST_RESPAWN_FRAMES = 360;
const BOOST_OFFSET_UNITS = 2.8;

// Items + their pickup weights. The "speed" item is still the most common so
// the race retains its arcade flow; defensives/offensives appear less often.
const ITEM_TYPES = {
  speed:     { weight: 4, color: "#d29922", label: "BOOST", glyph: ">>" },
  lightning: { weight: 2, color: "#a371f7", label: "BOLT",  glyph: "Z"  },
  banana:    { weight: 3, color: "#7ec867", label: "TRAP",  glyph: "B"  },
  shell:     { weight: 3, color: "#3fb950", label: "SHELL", glyph: "O"  },
};
const ITEM_KEYS = Object.keys(ITEM_TYPES);
const ITEM_TOTAL_WEIGHT = ITEM_KEYS.reduce((s, k) => s + ITEM_TYPES[k].weight, 0);
function rollItem() {
  let r = Math.random() * ITEM_TOTAL_WEIGHT;
  for (const k of ITEM_KEYS) {
    r -= ITEM_TYPES[k].weight;
    if (r <= 0) return k;
  }
  return ITEM_KEYS[0];
}

// Status-effect durations.
// A mushroom now applies a sustained forward force for SPEED_BOOST_FRAMES,
// not just a single-tick impulse. SPEED_BOOST_IMPULSE is split across those
// frames as a per-frame impulse (the visual halo runs in sync).
const SPEED_BOOST_FRAMES = 45;      // 0.75 s of sustained boost
const SPEED_BOOST_IMPULSE = 450;    // total mass*pxFrames added over the whole boost
const SPEED_BOOST_VISUAL_FRAMES = SPEED_BOOST_FRAMES;
const LIGHTNING_SLOW_FRAMES = 180;  // 3 s
const LIGHTNING_SPIN_FRAMES = 30;   // tiny stagger
const BANANA_RADIUS = 14;
const BANANA_LIFETIME_FRAMES = 1200; // 20s before a dropped banana fades
const BANANA_DROP_BACK = 36;        // pixels behind the dropping car
const SHELL_RADIUS = 12;
const SHELL_SPEED = 480;            // px/s
const SHELL_LIFETIME_FRAMES = 600;  // 10s
const SHELL_FORWARD_OFFSET = 32;    // spawn this far in front of the firing car
const HIT_SPIN_FRAMES = 60;         // 1 s of mandatory spin on banana/shell hit
const HIT_SLOW_FRAMES = 60;         // 1 s of slowed throttle after a spin

// ── Collision groups ──────────────────────────────────────────────────────
// 1 = default, 2 = wall, 4 = player, 8 = AI, 16 = sensor (item / lap), 32 = shell (dynamic projectile).
// Sensors are sensorEnabled — callbacks fire on overlap but no impulse.
// Shells are dynamic Circles that bounce off walls and stop when they hit a car.
const GROUP_WALL    = 2;
const GROUP_PLAYER  = 4;
const GROUP_AI      = 8;
const GROUP_SENSOR  = 16;
const GROUP_SHELL   = 32;

// Cars must "see" sensors and shells so collisions report.
const CAR_MASK = GROUP_WALL | GROUP_PLAYER | GROUP_AI | GROUP_SENSOR | GROUP_SHELL;
const WALL_MASK = -1;
const SENSOR_MASK = GROUP_PLAYER | GROUP_AI;
const SHELL_MASK = GROUP_WALL | GROUP_PLAYER | GROUP_AI; // shells bounce off walls, hit cars
const RAY_WALL_FILTER = new InteractionFilter(1, GROUP_WALL);

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _runnerRef = null;

let _centerline = null;             // [{x,y}] in pixel units
let _normals = null;                // [{x,y}] right-hand normal per index
let _trackLength = 0;               // sum of segment lengths (pixels)
let _trackHalfWidth = 0;

let _lapSensorBody = null;          // start/finish line trigger
let _midSensorBody = null;          // half-lap checkpoint trigger

let _cars = [];                     // [{ body, name, isPlayer, colorIdx, ... }]
let _carByBody = null;              // WeakMap from Body → car state

const _boosts = [];                 // [{ body, active, respawnTimer, idx, x, y }]

// Dropped bananas (sensor circles) and active shells (dynamic circles).
const _bananas = []; // { body, ownerColorIdx, lifetime }
const _shells = [];  // { body, ownerColorIdx, lifetime }
const _obstacles = []; // { body, kind: "spinner" | "ball" } — static-ish track hazards

// Race control
let _raceState = "countdown";
let _countdown = COUNTDOWN_FRAMES;
let _finishHold = 0;
let _frame = 0;
let _raceStartFrame = 0;

// Per-frame pending mutations (applied between physics + callbacks).
const _pending = {
  boostHits: [],   // { car, boostIdx }
  bananaHits: [],  // { car, bananaIdx }
  shellHits: [],   // { car, shellIdx }
};

let _prevContactCount = 0;
let _steerVisualAngle = 0;

// Boost / hit visual feedback.
const _boostFlashes = []; // { x, y, age, ttl }
const _hitFlashes = [];   // { x, y, age, ttl, color } — banana/shell hit ring
let _playerBoostTimer = 0;
let _lightningFlashFrames = 0; // when a lightning fires, flash the whole screen briefly
const PLAYER_BOOST_FRAMES = SPEED_BOOST_FRAMES;

// Callback types
let _cbCar = null;
let _cbLapLine = null;
let _cbMidLine = null;
let _cbBoost = null;
let _cbBanana = null;
let _cbShell = null;

// Keyboard / touch input — same shape as car-topdown.js
const keys = {};
let _onKeyDown = null;
let _onKeyUp = null;

// ── Vector helpers (1:1 from car-topdown.js) ──────────────────────────────
function getForwardVec(body) {
  const r = body.rotation;
  return { x: Math.cos(r), y: Math.sin(r) };
}
function getRightVec(body) {
  const r = body.rotation;
  return { x: -Math.sin(r), y: Math.cos(r) };
}
function getForwardSpeed(body) {
  const f = getForwardVec(body);
  return body.velocity.x * f.x + body.velocity.y * f.y;
}
function getForwardVelocity(body) {
  const f = getForwardVec(body);
  const s = body.velocity.x * f.x + body.velocity.y * f.y;
  return { x: f.x * s, y: f.y * s };
}
function getLateralVelocity(body) {
  const r = getRightVec(body);
  const dot = body.velocity.x * r.x + body.velocity.y * r.y;
  return { x: r.x * dot, y: r.y * dot };
}


// ── Car physics — 1:1 port of updateFriction/Drive/Turn from car-topdown ──
function updateFriction(body, dt, throttle, handbrake) {
  const mass = body.mass;
  const latVel = getLateralVelocity(body);
  let ix = -latVel.x * mass;
  let iy = -latVel.y * mass;
  const lateralCap = handbrake ? CAR.DRIFT_LATERAL_IMPULSE : CAR.MAX_LATERAL_IMPULSE;
  const mag = Math.sqrt(ix * ix + iy * iy);
  if (mag > lateralCap) {
    const scale = lateralCap / mag;
    ix *= scale; iy *= scale;
  }
  body.applyImpulse(new Vec2(ix, iy));

  const absSpeed = Math.abs(getForwardSpeed(body));
  const lowSpeedRatio = Math.min(1, absSpeed / CAR.STEER_LOCK_SPEED);
  const baseAngFriction = handbrake ? CAR.DRIFT_ANGULAR_FRICTION : CAR.ANGULAR_FRICTION;
  const angFriction = baseAngFriction + (1 - lowSpeedRatio) * (0.85 - baseAngFriction);
  let angVel = body.angularVel * (1 - angFriction);
  if (handbrake && Math.abs(angVel) > CAR.DRIFT_MAX_ANGULAR_VEL) {
    angVel = Math.sign(angVel) * CAR.DRIFT_MAX_ANGULAR_VEL;
  }
  body.angularVel = angVel;

  const fwdVel = getForwardVelocity(body);
  body.applyImpulse(new Vec2(-CAR.DRAG_MODIFIER * fwdVel.x * dt, -CAR.DRAG_MODIFIER * fwdVel.y * dt));

  if (throttle === 0) {
    body.applyImpulse(new Vec2(-CAR.ENGINE_BRAKE * fwdVel.x * dt, -CAR.ENGINE_BRAKE * fwdVel.y * dt));
  }

  if (handbrake) {
    const hbDrag = CAR.DRIFT_BRAKE_FACTOR * dt;
    body.applyImpulse(new Vec2(-fwdVel.x * hbDrag, -fwdVel.y * hbDrag));
  }
}

function updateDrive(body, throttle, brake, dt) {
  const fwd = getForwardVec(body);
  const currentSpeed = getForwardSpeed(body);

  if (brake) {
    if (Math.abs(currentSpeed) > 5) {
      const brakeDir = currentSpeed > 0 ? -1 : 1;
      const brakeImp = CAR.BRAKE_FORCE * dt;
      body.applyImpulse(new Vec2(fwd.x * brakeDir * brakeImp, fwd.y * brakeDir * brakeImp));
    } else {
      const v = body.velocity;
      body.velocity = new Vec2(v.x * 0.9, v.y * 0.9);
    }
    return;
  }

  if (throttle === 0) return;

  const desiredSpeed = throttle > 0
    ? CAR.MAX_FORWARD_SPEED * throttle
    : -CAR.MAX_REVERSE_SPEED * Math.abs(throttle);
  const speedDiff = desiredSpeed - currentSpeed;
  if ((throttle > 0 && speedDiff <= 0) || (throttle < 0 && speedDiff >= 0)) return;

  const maxSpd = throttle > 0 ? CAR.MAX_FORWARD_SPEED : CAR.MAX_REVERSE_SPEED;
  const speedRatio = Math.min(Math.abs(currentSpeed) / maxSpd, 1);
  const forceMult = (1 - speedRatio) * (1 - speedRatio);
  const driveImp = CAR.MAX_DRIVE_FORCE * throttle * forceMult * dt;
  body.applyImpulse(new Vec2(fwd.x * driveImp, fwd.y * driveImp));
}

function updateTurn(body, steer, dt, handbrake) {
  const forwardSpeed = getForwardSpeed(body);
  const absSpeed = Math.abs(forwardSpeed);
  const rawFactor = Math.min(1, absSpeed / CAR.STEER_LOCK_SPEED);
  const speedFactor = Math.pow(rawFactor, CAR.STEER_LOCK_POWER);
  const direction = forwardSpeed >= 0 ? 1 : -1;
  const torque = handbrake ? CAR.DRIFT_STEER_TORQUE : CAR.STEER_TORQUE;
  const angImpulse = steer * torque * speedFactor * direction * dt;
  body.applyAngularImpulse(angImpulse);
}

function updateCarPhysics(body, throttle, steer, brake, dt, handbrake) {
  updateFriction(body, dt, throttle, handbrake);
  updateDrive(body, throttle, brake, dt);
  updateTurn(body, steer, dt, handbrake);
}

// ── Spline (Catmull-Rom, closed loop) ─────────────────────────────────────
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function generateSpline(pts, totalSegments) {
  const n = pts.length;
  const result = [];
  const segsPerSection = Math.ceil(totalSegments / n);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let j = 0; j < segsPerSection; j++) {
      const t = j / segsPerSection;
      result.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  return result;
}

// ── Track + walls ─────────────────────────────────────────────────────────
// Wall builder ported from /Users/somoraczkrisztian/work/cars/js/Track.js
// (`_getCleanedEdge` + `_buildBarrierPhysics`). That repo has battle-tested
// this approach across many circuits — the algorithm is:
//
//   1. Offset the centerline by ±halfWidth to get the raw inner/outer edge.
//   2. **Clean** the edge: at each vertex compare the edge's local tangent
//      to the centerline's tangent. Where the dot product goes negative the
//      offset has self-intersected (typical on hairpin corners where the
//      outer edge loops *backward* relative to the road) — drop those points
//      and their immediate neighbours.
//   3. Walk the cleaned edge by ARC LENGTH (not by index) at a fixed step,
//      emitting one rotated box per step. Boxes are slightly longer than the
//      step so they OVERLAP at their seams — no notches, no gaps.
//
// Constants chosen to match cars/Track.js translated into nape pixel units:
//   STEP  = 1.2 world units → 12 px between segment centres
//   OVERLAP = 0.25 world units → 2.5 px overlap each side
function buildTrack(space) {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;

  const centerline = generateSpline(TRACK_CONTROL_POINTS, TRACK_SPLINE_SEGMENTS).map(p => ({
    x: cx + p.x * PIXEL_RATIO,
    y: cy + p.y * PIXEL_RATIO,
  }));
  const n = centerline.length;
  const halfWidth = (TRACK_ROAD_WIDTH_UNITS * PIXEL_RATIO) / 2;
  _trackHalfWidth = halfWidth;

  const normals = [];
  let totalLen = 0;
  for (let i = 0; i < n; i++) {
    const prev = centerline[(i - 1 + n) % n];
    const next = centerline[(i + 1) % n];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / len, y: dx / len });
    const a = centerline[i];
    const b = centerline[(i + 1) % n];
    totalLen += Math.hypot(b.x - a.x, b.y - a.y);
  }
  _trackLength = totalLen;

  // ── Cleaned offset edge ──────────────────────────────────────────────────
  // Removes points where the offset has folded back on itself (which happens
  // on tight corners; the visible result of NOT cleaning is a "+"-shaped
  // tangle in the wall, exactly what the user kept screenshotting).
  const cleanedEdge = (side) => {
    const raw = new Array(n);
    for (let i = 0; i < n; i++) {
      raw[i] = {
        x: centerline[i].x + normals[i].x * halfWidth * side,
        y: centerline[i].y + normals[i].y * halfWidth * side,
      };
    }
    const reversed = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const ip = (i - 1 + n) % n;
      const iN = (i + 1) % n;
      const etx = raw[iN].x - raw[ip].x;
      const ety = raw[iN].y - raw[ip].y;
      const ctx = centerline[iN].x - centerline[ip].x;
      const cty = centerline[iN].y - centerline[ip].y;
      if (etx * ctx + ety * cty < 0) reversed[i] = 1;
    }
    // Dilate by ±1 — kills the boundary points that haven't quite gone
    // reversed yet but are near a fold.
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (reversed[i] || reversed[(i - 1 + n) % n] || reversed[(i + 1) % n]) {
        mask[i] = 1;
      }
    }
    const result = [];
    for (let i = 0; i < n; i++) if (!mask[i]) result.push(raw[i]);
    return result.length >= 3 ? result : raw;
  };

  // Arc-length walker over a cleaned-edge closed loop. Returns the {x,y}
  // sample at arc-length `s` mod the total perimeter.
  const buildEdgeSampler = (edge) => {
    const m = edge.length;
    const arc = new Float64Array(m);
    for (let i = 1; i < m; i++) {
      const dx = edge[i].x - edge[i - 1].x;
      const dy = edge[i].y - edge[i - 1].y;
      arc[i] = arc[i - 1] + Math.hypot(dx, dy);
    }
    const closeDx = edge[0].x - edge[m - 1].x;
    const closeDy = edge[0].y - edge[m - 1].y;
    const total = arc[m - 1] + Math.hypot(closeDx, closeDy);
    const sample = (s) => {
      const target = ((s % total) + total) % total;
      let lo = 0, hi = m - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arc[mid] < target) lo = mid + 1; else hi = mid;
      }
      const i0 = lo === 0 ? m - 1 : lo - 1;
      const i1 = lo % m;
      const s0 = i0 < i1 ? arc[i0] : arc[i0] - total;
      const s1 = arc[i1] || total;
      const t = s1 - s0 > 0.0001 ? (target - s0) / (s1 - s0) : 0;
      const e0 = edge[i0], e1 = edge[i1];
      return { x: e0.x + (e1.x - e0.x) * t, y: e0.y + (e1.y - e0.y) * t };
    };
    return { sample, total };
  };

  // Wall segments are coarse here (1.8 world units between centres) because
  // the new track's min curvature radius is well above halfWidth, so the
  // cleaner doesn't have to drop vertices and the box chord stays short.
  // ~1/3 the body count of the previous 6 px STEP, much lighter broadphase.
  const STEP = 1.8 * PIXEL_RATIO;     // 18 px
  const OVERLAP = 0.5 * PIXEL_RATIO;  // 5 px overlap so adjacent boxes meet

  for (const side of [-1, +1]) {
    const edge = cleanedEdge(side);
    const { sample, total } = buildEdgeSampler(edge);
    const segCount = Math.max(4, Math.round(total / STEP));
    const segLen = total / segCount;
    const boxLen = segLen + OVERLAP;
    for (let k = 0; k < segCount; k++) {
      const a = sample(k * segLen);
      const b = sample((k + 1) * segLen);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.1) continue;
      const angle = Math.atan2(dy, dx);
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const wallBody = new Body(BodyType.STATIC, new Vec2(mx, my));
      wallBody.rotation = angle;
      // Wall material matches the `cars` repo: low elasticity + medium
      // friction. Without this the wall used nape's default Material with
      // dynamic friction = 1.0, which made cars stick along the wall on
      // any wall-grazing contact.
      const wallMat = new Material(0.3, 0.5, 0.5, 2, 0);
      const shape = new Polygon(Polygon.box(boxLen, WALL_THICK), wallMat);
      shape.filter = new InteractionFilter(GROUP_WALL, WALL_MASK);
      wallBody.shapes.add(shape);
      try { wallBody.userData._colorIdx = 4; } catch (_) {}
      wallBody.space = space;
    }
  }

  _centerline = centerline;
  _normals = normals;
  return { cx, cy, centerline, normals };
}

// Lap-counting sensors: one at the start/finish line and one at the opposite
// side of the loop. Cars must trip the mid-checkpoint between successive
// start-line crossings, which prevents a backward-driven lap from counting.
function buildLapSensors(space) {
  const cl = _centerline;
  const halfW = _trackHalfWidth + 4;  // a hair wider so it spans the road
  const sensorThickness = 8;

  const make = (idx) => {
    const c = cl[idx];
    const nm = _normals[idx];
    // The body is placed at the centerline point and rotated so its local
    // +X axis aligns with the tangent. Then a thin Polygon.box (thickness
    // along X, road-spanning along Y) sits naturally across the road.
    const tangentAngle = Math.atan2(nm.x, -nm.y);
    const body = new Body(BodyType.STATIC, new Vec2(c.x, c.y));
    body.rotation = tangentAngle;
    const shape = new Polygon(Polygon.box(sensorThickness, halfW * 2));
    shape.sensorEnabled = true;
    shape.filter = new InteractionFilter(GROUP_SENSOR, SENSOR_MASK);
    body.shapes.add(shape);
    return body;
  };

  _lapSensorBody = make(0);
  try {
    _lapSensorBody.userData._colorIdx = 2;
    _lapSensorBody.userData._kind = "lapline";
  } catch (_) {}
  _lapSensorBody.cbTypes.add(_cbLapLine);
  _lapSensorBody.space = space;

  const midIdx = Math.floor(cl.length / 2);
  _midSensorBody = make(midIdx);
  try {
    _midSensorBody.userData._colorIdx = 3;
    _midSensorBody.userData._kind = "midline";
    _midSensorBody.userData._hidden = true;     // skip canvas2d body draw
    _midSensorBody.userData._hidden3d = true;   // skip threejs/pixi too
  } catch (_) {}
  _midSensorBody.cbTypes.add(_cbMidLine);
  _midSensorBody.space = space;
}

// Boost pads laid out at evenly-spaced centerline indices, offset off-line
// so they appear on alternating sides of the road. A pad is a SENSOR circle;
// when a car overlaps it, the BEGIN callback queues a forward impulse and
// flags the pad inactive for BOOST_RESPAWN_FRAMES.
function buildBoostPickups(space) {
  _boosts.length = 0;
  const cl = _centerline;
  // BOOST_COUNT here means GROUP count — at each group position we lay out
  // three `?` boxes across the road (left / centre / right). Mario-Kart-
  // style: pick any one of them and the others stay around for opponents.
  const groupCount = BOOST_COUNT;
  const step = Math.floor(cl.length / groupCount);
  const lateralUnits = [-4, 0, +4]; // 4-unit gaps across a 20-unit-wide road
  let runningIdx = 0;
  for (let g = 0; g < groupCount; g++) {
    // Skip the few indices right around the start/finish line so the boosts
    // never overlap the lap sensor or the grid.
    const idx = ((g * step) + Math.floor(step / 2)) % cl.length;
    const c = cl[idx];
    const nm = _normals[idx];
    for (const latUnits of lateralUnits) {
      const offset = latUnits * PIXEL_RATIO;
      const x = c.x + nm.x * offset;
      const y = c.y + nm.y * offset;
      const body = new Body(BodyType.STATIC, new Vec2(x, y));
      const shape = new Circle(BOOST_RADIUS);
      shape.sensorEnabled = true;
      shape.filter = new InteractionFilter(GROUP_SENSOR, SENSOR_MASK);
      body.shapes.add(shape);
      try {
        body.userData._colorIdx = 1;
        body.userData._kind = "boost";
        body.userData._boostIdx = runningIdx;
      } catch (_) {}
      body.cbTypes.add(_cbBoost);
      body.space = space;
      _boosts.push({ body, active: true, respawnTimer: 0, idx: runningIdx, x, y });
      runningIdx++;
    }
  }
}

// Track hazards: a couple of rotating bars (kinematic — constant angular
// velocity) and a few bouncy balls (dynamic Circles). The spinners sweep
// across the road so the player has to time their pass. Balls drift around
// the centerline and get knocked aside by cars.
const SPINNER_LENGTH_UNITS = 8;     // total bar length (fits in the 20-unit road)
const SPINNER_THICK_UNITS = 0.8;
const SPINNER_ANG_VEL = 1.2;        // rad/sec — moderate
const BALL_RADIUS_UNITS = 1.4;
const BALL_COUNT = 3;
const SPINNER_INDICES = [0.15, 0.45, 0.75]; // fraction-of-loop positions
const BALL_INDICES    = [0.30, 0.60, 0.90];

function buildObstacles(space) {
  _obstacles.length = 0;
  const cl = _centerline;
  const n = cl.length;
  const pr = PIXEL_RATIO;

  for (const frac of SPINNER_INDICES) {
    const idx = Math.floor(frac * n) % n;
    const c = cl[idx];
    const next = cl[(idx + 1) % n];
    const tangent = Math.atan2(next.y - c.y, next.x - c.x);
    const body = new Body(BodyType.KINEMATIC, new Vec2(c.x, c.y));
    body.rotation = tangent;
    body.angularVel = SPINNER_ANG_VEL * (Math.random() < 0.5 ? -1 : 1);
    // No Material — spinners are kinematic Polygons but we keep the default
    // material to dodge the Polygon+Material tunneling concern (cars do
    // collide with them, and they don't tunnel because the spinner moves
    // slowly).
    const shape = new Polygon(Polygon.box(SPINNER_LENGTH_UNITS * pr, SPINNER_THICK_UNITS * pr));
    shape.filter = new InteractionFilter(GROUP_WALL, WALL_MASK);
    body.shapes.add(shape);
    try {
      body.userData._colorIdx = 3; // red-orange tone
      body.userData._kind = "spinner";
    } catch (_) {}
    body.space = space;
    _obstacles.push({ body, kind: "spinner" });
  }

  for (const frac of BALL_INDICES) {
    const idx = Math.floor(frac * n) % n;
    const c = cl[idx];
    const body = new Body(BodyType.DYNAMIC, new Vec2(c.x, c.y));
    // Light + very bouncy so it ricochets off the walls and cars push it
    // around instead of bouncing back hard.
    const ballMat = new Material(0.9, 0.1, 0.1, 0.3, 0);
    const shape = new Circle(BALL_RADIUS_UNITS * pr, undefined, ballMat);
    shape.filter = new InteractionFilter(GROUP_WALL, WALL_MASK);
    body.shapes.add(shape);
    body.allowRotation = true;
    try {
      body.userData._colorIdx = 0; // blue-purple
      body.userData._kind = "ball";
    } catch (_) {}
    body.space = space;
    _obstacles.push({ body, kind: "ball" });
  }
}

// ── Cars ──────────────────────────────────────────────────────────────────
const AI_NAMES = ["Mira", "Kato", "Echo", "Zara", "Finn", "Nyx", "Orin"];

function spawnCars(space) {
  _cars = [];
  _carByBody = new WeakMap();

  const cl = _centerline;

  // Anchor the grid roughly one tangent-unit behind the start sensor so the
  // sensor still has road behind it (avoids cars spawning *on* the trigger
  // and registering a phantom lap on frame 1).
  const gridBaseIdx = Math.max(0, cl.length - 12);
  const base = cl[gridBaseIdx];
  const ahead = cl[(gridBaseIdx + 6) % cl.length];
  const gridAngle = Math.atan2(ahead.y - base.y, ahead.x - base.x);
  const tx = Math.cos(gridAngle);
  const ty = Math.sin(gridAngle);
  // Right-hand vector for lateral offset across the grid.
  const rx = -ty;
  const ry =  tx;

  const spacing = STARTING_GRID_SPACING_UNITS * PIXEL_RATIO;

  for (let i = 0; i < RACER_COUNT; i++) {
    const isPlayer = (i === 0);
    // Two columns, two rows: cols stagger lateral, rows stagger longitudinal.
    const col = i % 2 === 0 ? -0.5 : 0.5;
    const row = Math.floor(i / 2);
    const offsetAlong  = -row * spacing;
    const offsetLat    =  col * spacing * 0.85;
    const x = base.x + tx * offsetAlong + rx * offsetLat;
    const y = base.y + ty * offsetAlong + ry * offsetLat;

    const car = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    // Materials match the `cars` repo's tuning so cars don't stick to walls
    // or to each other. Player car has normal friction (0.3) for a solid
    // feel; AI cars get very low friction (0.05) so they slide apart on
    // contact instead of interlocking. The known "Polygon + Material"
    // tunneling bug doesn't fire at the speeds used here because
    // car.isBullet = true (set below) enables CCD on the dynamic shape.
    const carMat = isPlayer
      ? new Material(0.2, 0.3, 0.3, 1.5, 0)
      : new Material(0.3, 0.05, 0.05, 1.5, 0);
    const shape = new Polygon(
      Polygon.box(CAR.LENGTH * PIXEL_RATIO, CAR.WIDTH * PIXEL_RATIO),
      carMat,
    );
    shape.filter = new InteractionFilter(
      isPlayer ? GROUP_PLAYER : GROUP_AI,
      CAR_MASK,
    );
    car.shapes.add(shape);
    car.rotation = gridAngle;
    car.cbTypes.add(_cbCar);
    // Continuous collision check so fast cornering doesn't tunnel through
    // a wall corner between two physics steps.
    car.isBullet = true;

    // Map color index to renderer palette: player=0 (blue), AI gets 1..7
    // (orange/green/red/purple/pink/cyan/bronze, in order).
    const colorIdx = i;
    try {
      car.userData._colorIdx = colorIdx;
      car.userData._kind = "car";
    } catch (_) {}
    car.space = space;

    const state = {
      body: car,
      name: isPlayer ? "You" : AI_NAMES[i - 1],
      isPlayer,
      colorIdx,
      laps: 0,
      midPassed: false,
      lapStartFrame: 0,
      bestLap: Infinity,
      lapTimes: [],
      finishFrame: -1,
      finishOrder: -1,
      progressIdx: gridBaseIdx,
      // Mario-Kart-style single item slot.
      slotItem: null,          // key in ITEM_TYPES, or null
      // Status effects in frames.
      effects: {
        slowFrames: 0,         // capped max speed
        spinFrames: 0,         // forced spin-out — no driver input
        boostFrames: 0,        // active mushroom — visual halo only
      },
      // AI controller state — irrelevant for the player but cheap to carry.
      ai: {
        avoidHold: 0,
        avoidSide: 0,
        steerNoiseFrame: 0,
        steerNoise: 0,
        useItemCooldown: 0,
        // Stuck detection / recovery (ported from cars/AIController.js).
        // recoveryPhase: 0=normal, 1=reverse, 2=turn-forward
        stuckFrames: 0,
        recoveryPhase: 0,
        recoveryFrames: 0,
        recoverySteer: 0,
      },
    };
    _cars.push(state);
    _carByBody.set(car, state);
  }
}

// Project the car onto the closest centerline index (within a search window
// around its previous index). Used both for race-progress ordering and for
// the AI controller's lookahead.
function updateProgressIdx(car) {
  const cl = _centerline;
  const n = cl.length;
  const p = car.body.position;
  const range = 24;  // search ±24 indices from previous; cheap & robust
  let bestIdx = car.progressIdx;
  let bestD2 = Infinity;
  for (let k = -range; k <= range; k++) {
    const idx = ((car.progressIdx + k) % n + n) % n;
    const c = cl[idx];
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestIdx = idx;
    }
  }
  car.progressIdx = bestIdx;
  return bestIdx;
}

// Sum the segment lengths from a → b (modular over the closed loop). For
// race ordering we combine laps * loopLength + arcLength(0 → progressIdx).
function arcLengthFromZero(idx) {
  const cl = _centerline;
  const n = cl.length;
  let sum = 0;
  for (let i = 0; i < idx; i++) {
    const a = cl[i];
    const b = cl[(i + 1) % n];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

// ── AI controller ─────────────────────────────────────────────────────────
// Adapted from /Users/somoraczkrisztian/work/cars/js/AIController.js with the
// expensive parts (full speed-profile builder, corner-tuning learning, brake
// markers) dropped. What we keep is the *behaviour* that matters here:
//
//   1. **Full throttle by default**. The previous `1 - speed/MAX` rule meant
//      the AI was always backing off, even on long straights — that's why
//      the opponents felt sluggish. Now they hold throttle = 1.0 and only
//      lift for corners.
//   2. **Contact separation** — when another car is within a small radius,
//      steer perpendicular-away with urgency proportional to closeness, and
//      give a small throttle boost so we don't get pinned.
//   3. **Stuck recovery** — if our forward speed stays below a threshold for
//      0.5s, reverse for 0.5s then drive forward toward the target for 0.5s.
//      Prevents the "two AIs grinding against each other forever" problem.
function aiControl(car) {
  const cl = _centerline;
  const n = cl.length;
  const body = car.body;
  const pos = body.position;
  const rot = body.rotation;
  const fwd = getForwardVec(body);
  const right = getRightVec(body);
  const forwardSpeed = getForwardSpeed(body);
  const absSpeed = Math.abs(forwardSpeed);

  // ── Stuck detection + recovery ──────────────────────────────────────────
  // Phase 0 = normal driving. Phase 1 = reversing. Phase 2 = forward toward
  // target. Frames are at DT (1/60) — 30 frames = 0.5s.
  if (car.ai.recoveryPhase === 0) {
    if (absSpeed < 12) {
      car.ai.stuckFrames++;
      if (car.ai.stuckFrames > 30) {
        car.ai.recoveryPhase = 1;
        car.ai.recoveryFrames = 30;
        car.ai.stuckFrames = 0;
      }
    } else {
      car.ai.stuckFrames = Math.max(0, car.ai.stuckFrames - 3);
    }
  }
  if (car.ai.recoveryPhase === 1) {
    car.ai.recoveryFrames--;
    if (car.ai.recoveryFrames <= 0) {
      car.ai.recoveryPhase = 2;
      car.ai.recoveryFrames = 30;
      // Pick the side that points roughly toward the next waypoint.
      const tgt = cl[(car.progressIdx + AI_LOOKAHEAD) % n];
      const td = Math.atan2(tgt.y - pos.y, tgt.x - pos.x);
      let diff = td - rot;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.ai.recoverySteer = diff < 0 ? -1 : 1;
    } else {
      // Reverse with a slight steer the opposite of where we were aiming —
      // this peels the car off whatever it was stuck on.
      return { throttle: -0.7, steer: -0.5, brake: false, handbrake: false };
    }
  }
  if (car.ai.recoveryPhase === 2) {
    car.ai.recoveryFrames--;
    if (car.ai.recoveryFrames <= 0) {
      car.ai.recoveryPhase = 0;
    } else {
      return { throttle: 0.9, steer: car.ai.recoverySteer, brake: false, handbrake: false };
    }
  }

  // ── Target waypoint + racing-line bias ──────────────────────────────────
  updateProgressIdx(car);
  const targetIdx = (car.progressIdx + AI_LOOKAHEAD) % n;
  const horizonIdx = (car.progressIdx + AI_TURN_LOOKAHEAD) % n;
  const target = cl[targetIdx];
  const horizon = cl[horizonIdx];
  const innerBiasX = (horizon.x - target.x);
  const innerBiasY = (horizon.y - target.y);
  const biasLen = Math.hypot(innerBiasX, innerBiasY) || 1;
  const aimX = target.x + (innerBiasX / biasLen) * _trackHalfWidth * 0.25;
  const aimY = target.y + (innerBiasY / biasLen) * _trackHalfWidth * 0.25;

  // ── Steering ────────────────────────────────────────────────────────────
  const dx = aimX - pos.x;
  const dy = aimY - pos.y;
  const targetAngle = Math.atan2(dy, dx);
  let angleDiff = targetAngle - rot;
  while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  let steer = Math.max(-1, Math.min(1, angleDiff * 1.8));

  car.ai.steerNoiseFrame++;
  if (car.ai.steerNoiseFrame >= 12) {
    car.ai.steerNoiseFrame = 0;
    car.ai.steerNoise = (Math.random() * 2 - 1) * AI_STEER_NOISE;
  }
  steer += car.ai.steerNoise;
  steer = Math.max(-1, Math.min(1, steer));

  // ── Item-pad attraction ─────────────────────────────────────────────────
  // If we have nothing in our slot and there's an active pad roughly ahead of
  // us within grab range, blend our steer toward it. Limited reach + forward
  // cone so the AI doesn't pingpong toward a pad that's behind it or way off
  // the racing line.
  if (!car.slotItem) {
    const ITEM_ATTRACT_DIST = 32 * PIXEL_RATIO;    // ~3 car-lengths ahead
    const ITEM_ATTRACT_LATERAL = _trackHalfWidth * 1.1; // stay near the road
    let bestPad = null;
    let bestPadScore = 0;
    for (const pad of _boosts) {
      if (!pad.active) continue;
      const pdx = pad.x - pos.x;
      const pdy = pad.y - pos.y;
      const dist = Math.hypot(pdx, pdy);
      if (dist > ITEM_ATTRACT_DIST) continue;
      const fwdDot = pdx * fwd.x + pdy * fwd.y;
      if (fwdDot < 0) continue; // behind us
      const sideDist = Math.abs(pdx * right.x + pdy * right.y);
      if (sideDist > ITEM_ATTRACT_LATERAL) continue;
      // Score: close + straight-ahead pads beat far + off-angle pads.
      const score = (1 - dist / ITEM_ATTRACT_DIST) * (fwdDot / (dist || 1));
      if (score > bestPadScore) {
        bestPadScore = score;
        bestPad = pad;
      }
    }
    if (bestPad) {
      const pdx = bestPad.x - pos.x;
      const pdy = bestPad.y - pos.y;
      const padAngle = Math.atan2(pdy, pdx);
      let padDiff = padAngle - rot;
      while (padDiff >  Math.PI) padDiff -= Math.PI * 2;
      while (padDiff < -Math.PI) padDiff += Math.PI * 2;
      const padSteer = Math.max(-1, Math.min(1, padDiff * 1.8));
      // Blend strength scales with how close + on-line the pad is. Capped
      // at 0.5 so the racing-line target still dominates — the AI grabs
      // pads that are near its line, but doesn't veer off after distant ones.
      const blend = Math.min(0.5, bestPadScore * 1.5);
      steer = (1 - blend) * steer + blend * padSteer;
      steer = Math.max(-1, Math.min(1, steer));
    }
  }

  // ── Throttle: full by default, lift only for the next corner ────────────
  let throttle = 1.0;
  const a = cl[(horizonIdx - 4 + n) % n];
  const b = cl[horizonIdx];
  const c = cl[(horizonIdx + 4) % n];
  const radius = circleRadiusOfThree(a, b, c);
  if (radius < AI_HARD_TURN_RADIUS_PX) {
    throttle = 0.45;
  } else if (radius < AI_SOFT_TURN_RADIUS_PX) {
    throttle = 0.75;
  }

  // ── Wall feeler — only nudges when actually about to hit a wall ─────────
  const probe = probeDistance(pos.x, pos.y, fwd.x, fwd.y, AI_PROBE_LEN);
  if (probe < AI_PROBE_LEN * 0.85) {
    const cs = Math.cos(AI_PROBE_SIDE);
    const ss = Math.sin(AI_PROBE_SIDE);
    const leftX  =  fwd.x * cs - fwd.y * ss;
    const leftY  =  fwd.x * ss + fwd.y * cs;
    const rightX =  fwd.x * cs + fwd.y * ss;
    const rightY = -fwd.x * ss + fwd.y * cs;
    const lp = probeDistance(pos.x, pos.y, leftX, leftY, AI_PROBE_LEN);
    const rp = probeDistance(pos.x, pos.y, rightX, rightY, AI_PROBE_LEN);
    if (Math.abs(lp - rp) > 4) {
      car.ai.avoidSide = lp > rp ? -1 : +1;
    } else if (car.ai.avoidSide === 0) {
      car.ai.avoidSide = Math.random() < 0.5 ? -1 : +1;
    }
    car.ai.avoidHold = 30;
  }
  if (car.ai.avoidHold > 0) {
    steer = Math.max(-1, Math.min(1, steer + car.ai.avoidSide * 0.7));
    throttle *= 0.65;
    car.ai.avoidHold--;
    if (car.ai.avoidHold === 0) car.ai.avoidSide = 0;
  }

  // ── Contact separation (cars/AIController.js#_checkContactSeparation) ───
  // When another car is within ~CONTACT_DIST units, steer perpendicular-away
  // with urgency proportional to closeness. Small throttle boost so we don't
  // get pinned grinding against the other car.
  const CONTACT_DIST = 3.5 * PIXEL_RATIO; // 35 px ≈ a car-and-a-half
  let closestDist = Infinity;
  let separationDir = 0;
  for (const other of _cars) {
    if (other === car) continue;
    const op = other.body.position;
    const odx = op.x - pos.x;
    const ody = op.y - pos.y;
    const d = Math.hypot(odx, ody);
    if (d < CONTACT_DIST && d < closestDist) {
      closestDist = d;
      const sideDot = odx * right.x + ody * right.y;
      // sideDot > 0 → other is on our right → steer left (positive)
      separationDir = sideDot > 0 ? 1 : -1;
    }
  }
  if (closestDist < CONTACT_DIST) {
    const urgency = 1 - closestDist / CONTACT_DIST; // 0..1
    steer = Math.max(-1, Math.min(1, steer + separationDir * urgency));
    if (urgency > 0.5) throttle = Math.max(throttle, 0.8); // brief boost to pull clear
  }

  // ── Item firing strategy ────────────────────────────────────────────────
  if (car.ai.useItemCooldown > 0) car.ai.useItemCooldown--;
  if (car.slotItem && car.ai.useItemCooldown <= 0) {
    if (shouldAIFire(car)) {
      fireItem(car);
      car.ai.useItemCooldown = 90;
    }
  }

  return { throttle, steer, brake: false, handbrake: false };
}

// Heuristics for when an AI fires its slotted item. Cheap proxies: probe
// distance for straights, ahead/behind detection via track-progress index.
function shouldAIFire(car) {
  const it = car.slotItem;
  if (!it) return false;
  // Throttle the "let it fly" rate so AI doesn't burn items the instant they
  // pick them up.
  if (Math.random() < 0.02) return false; // hesitation each frame
  if (it === "speed") {
    const fwd = getForwardVec(car.body);
    const probe = probeDistance(car.body.position.x, car.body.position.y, fwd.x, fwd.y, 14 * PIXEL_RATIO);
    return probe > 12 * PIXEL_RATIO; // a clear straight ahead
  }
  if (it === "lightning") {
    // Fire if not in first place — counts how many cars have more total arc.
    const myTotal = car.laps * _trackLength + arcLengthFromZero(car.progressIdx);
    let ahead = 0;
    for (const o of _cars) {
      if (o === car) continue;
      const oTotal = o.laps * _trackLength + arcLengthFromZero(o.progressIdx);
      if (oTotal > myTotal) ahead++;
    }
    return ahead >= 1;
  }
  if (it === "banana") {
    // Drop if someone's close behind on the track.
    const n = _centerline.length;
    for (const o of _cars) {
      if (o === car) continue;
      let d = car.progressIdx - o.progressIdx;
      // mod into [-n/2, n/2]
      d = ((d % n) + n) % n;
      if (d > n / 2) d -= n;
      if (d > 0 && d < 12) return true; // 0..12 indices behind
    }
    return false;
  }
  if (it === "shell") {
    // Fire if someone's a bit ahead and approximately in our heading direction.
    const fwd = getForwardVec(car.body);
    const p = car.body.position;
    for (const o of _cars) {
      if (o === car) continue;
      const dx = o.body.position.x - p.x;
      const dy = o.body.position.y - p.y;
      const dot = dx * fwd.x + dy * fwd.y;
      if (dot < 0) continue;
      const dist = Math.hypot(dx, dy);
      if (dist < 40 * PIXEL_RATIO && dot / dist > 0.85) return true;
    }
    return false;
  }
  return false;
}

// Circumradius of three points — Infinity for collinear; small for tight
// corners. Used to grade the upcoming corner.
function circleRadiusOfThree(a, b, c) {
  const ax = a.x, ay = a.y;
  const bx = b.x, by = b.y;
  const cx = c.x, cy = c.y;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-3) return Infinity;
  const ux = ((ax * ax + ay * ay) * (by - cy) +
              (bx * bx + by * by) * (cy - ay) +
              (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) +
              (bx * bx + by * by) * (ax - cx) +
              (cx * cx + cy * cy) * (bx - ax)) / d;
  return Math.hypot(ux - ax, uy - ay);
}

// Single forward probe — returns the hit distance or `len + 1` if clear.
function probeDistance(ox, oy, dx, dy, len) {
  if (!_space) return len + 1;
  const ray = new Ray(new Vec2(ox, oy), new Vec2(dx, dy));
  ray.maxDistance = len;
  const hit = _space.rayCast(ray, false, RAY_WALL_FILTER);
  if (!hit) return len + 1;
  const dist = hit.distance ?? hit.zpp_inner?.distance ?? 0;
  return dist;
}

// ── Callbacks: lap sensors + boost pads ───────────────────────────────────
function bodyFromInt(intObj) {
  return intObj.castBody ?? intObj.castShape?.body ?? null;
}

function setupCallbacks(space) {
  _cbCar = new CbType();
  _cbLapLine = new CbType();
  _cbMidLine = new CbType();
  _cbBoost = new CbType();
  _cbBanana = new CbType();
  _cbShell = new CbType();

  // BEGIN on the start/finish line. Only counts if the car has tripped the
  // mid-checkpoint since its last line cross — that gates backward laps.
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbLapLine, _cbCar,
    (cb) => {
      const car = bodyFromCb(cb);
      const state = car && _carByBody.get(car);
      if (!state || _raceState === "finished" || state.finishFrame >= 0) return;
      if (_raceState !== "running") return;
      if (!state.midPassed) return;
      state.midPassed = false;
      state.laps++;
      const elapsedFrames = _frame - state.lapStartFrame;
      const seconds = elapsedFrames / 60;
      state.lapTimes.push(seconds);
      if (seconds < state.bestLap) state.bestLap = seconds;
      state.lapStartFrame = _frame;

      if (state.laps >= LAP_TARGET) {
        state.finishFrame = _frame;
        // Finish order = number of cars already finished + 1.
        let already = 0;
        for (const c of _cars) if (c.finishFrame >= 0 && c !== state) already++;
        state.finishOrder = already + 1;
      }
    },
  ));

  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbMidLine, _cbCar,
    (cb) => {
      const car = bodyFromCb(cb);
      const state = car && _carByBody.get(car);
      if (!state || _raceState !== "running") return;
      state.midPassed = true;
    },
  ));

  // Item-pad pickup — queue for deferred application (don't mutate the body
  // graph mid-callback). The pending entry resolves in step() before physics.
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbBoost, _cbCar,
    (cb) => {
      if (_raceState !== "running") return;
      const car = bodyFromCb(cb);
      const state = car && _carByBody.get(car);
      if (!state) return;
      const sensor = bodyFromInt(cb.int1)?.userData?._kind === "boost"
        ? bodyFromInt(cb.int1)
        : bodyFromInt(cb.int2);
      const boostIdx = sensor?.userData?._boostIdx;
      if (typeof boostIdx !== "number") return;
      const pad = _boosts[boostIdx];
      if (!pad || !pad.active) return;
      _pending.boostHits.push({ car: state, boostIdx });
    },
  ));

  // Banana hit — overlapping a banana sensor spins + slows the car. Owner
  // is immune for the first ~30 frames after drop (set per-banana via a tag).
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbBanana, _cbCar,
    (cb) => {
      if (_raceState !== "running") return;
      const car = bodyFromCb(cb);
      const state = car && _carByBody.get(car);
      if (!state) return;
      const bananaBody = bodyFromInt(cb.int1)?.userData?._kind === "banana"
        ? bodyFromInt(cb.int1)
        : bodyFromInt(cb.int2);
      const idx = bananaBody?.userData?._bananaIdx;
      if (typeof idx !== "number") return;
      _pending.bananaHits.push({ car: state, bananaIdx: idx });
    },
  ));

  // Shell hit on a car — dynamic collision (not sensor). We use a regular
  // collision listener with cbType so the car spins out and the shell dies.
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.COLLISION, _cbShell, _cbCar,
    (cb) => {
      if (_raceState !== "running") return;
      const car = bodyFromCb(cb);
      const state = car && _carByBody.get(car);
      if (!state) return;
      const shellBody = bodyFromInt(cb.int1)?.userData?._kind === "shell"
        ? bodyFromInt(cb.int1)
        : bodyFromInt(cb.int2);
      const idx = shellBody?.userData?._shellIdx;
      if (typeof idx !== "number") return;
      _pending.shellHits.push({ car: state, shellIdx: idx });
    },
  ));
}

// ── Item firing (player + AI use the same paths) ─────────────────────────
function fireItem(car) {
  const it = car.slotItem;
  if (!it) return false;
  car.slotItem = null;
  if (it === "speed") fireMushroom(car);
  else if (it === "lightning") fireLightning(car);
  else if (it === "banana") fireBanana(car);
  else if (it === "shell") fireShell(car);
  return true;
}

function fireMushroom(car) {
  // Sustained boost: the per-frame application happens in step() while
  // boostFrames > 0, so just flip the flag and trigger the player FX here.
  car.effects.boostFrames = SPEED_BOOST_FRAMES;
  if (car.isPlayer) {
    _playerBoostTimer = PLAYER_BOOST_FRAMES;
    if (_runnerRef) _runnerRef.shakeCamera(3, 0.18);
  }
}

function fireLightning(car) {
  _lightningFlashFrames = 18;
  for (const other of _cars) {
    if (other === car || other.finishFrame >= 0) continue;
    other.effects.slowFrames = Math.max(other.effects.slowFrames, LIGHTNING_SLOW_FRAMES);
    other.effects.spinFrames = Math.max(other.effects.spinFrames, LIGHTNING_SPIN_FRAMES);
    _hitFlashes.push({
      x: other.body.position.x, y: other.body.position.y,
      age: 0, ttl: 28, color: ITEM_TYPES.lightning.color,
    });
  }
  if (car.isPlayer && _runnerRef) _runnerRef.shakeCamera(5, 0.2);
}

function fireBanana(car) {
  if (!_space) return;
  const body = car.body;
  const fwd = getForwardVec(body);
  const p = body.position;
  const x = p.x - fwd.x * BANANA_DROP_BACK;
  const y = p.y - fwd.y * BANANA_DROP_BACK;
  const bBody = new Body(BodyType.STATIC, new Vec2(x, y));
  const shape = new Circle(BANANA_RADIUS);
  shape.sensorEnabled = true;
  shape.filter = new InteractionFilter(GROUP_SENSOR, SENSOR_MASK);
  bBody.shapes.add(shape);
  try {
    bBody.userData._kind = "banana";
    bBody.userData._bananaIdx = _bananas.length;
    bBody.userData._colorIdx = 2; // greenish in default palette
  } catch (_) {}
  bBody.cbTypes.add(_cbBanana);
  bBody.space = _space;
  _bananas.push({ body: bBody, ownerColorIdx: car.colorIdx, lifetime: BANANA_LIFETIME_FRAMES });
}

function fireShell(car) {
  if (!_space) return;
  const body = car.body;
  const fwd = getForwardVec(body);
  const p = body.position;
  const x = p.x + fwd.x * SHELL_FORWARD_OFFSET;
  const y = p.y + fwd.y * SHELL_FORWARD_OFFSET;
  const sBody = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // Very bouncy so it ricochets off walls cleanly.
  const sMat = new Material(0.95, 0.02, 0.02, 0.4);
  const shape = new Circle(SHELL_RADIUS, undefined, sMat);
  shape.filter = new InteractionFilter(GROUP_SHELL, SHELL_MASK);
  sBody.shapes.add(shape);
  sBody.allowRotation = false;
  sBody.isBullet = true;
  try {
    sBody.userData._kind = "shell";
    sBody.userData._shellIdx = _shells.length;
    sBody.userData._colorIdx = 2;
  } catch (_) {}
  sBody.cbTypes.add(_cbShell);
  sBody.space = _space;
  sBody.velocity = new Vec2(fwd.x * SHELL_SPEED, fwd.y * SHELL_SPEED);
  _shells.push({ body: sBody, ownerColorIdx: car.colorIdx, lifetime: SHELL_LIFETIME_FRAMES });
}

// Return the *car* body out of the int1/int2 pair (the one carrying _kind=="car").
function bodyFromCb(cb) {
  const b1 = bodyFromInt(cb.int1);
  const b2 = bodyFromInt(cb.int2);
  if (b1?.userData?._kind === "car") return b1;
  if (b2?.userData?._kind === "car") return b2;
  return null;
}

// ── Lap-time + position helpers ───────────────────────────────────────────
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "--:--.---";
  const totalMs = Math.floor(seconds * 1000);
  const mins = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  const m = String(mins).padStart(2, "0");
  const s = String(secs).padStart(2, "0");
  const u = String(ms).padStart(3, "0");
  return `${m}:${s}.${u}`;
}

// Race ordering — finished cars rank by finishFrame (ascending), running
// cars rank by total arc distance (laps * loopLength + arcLength to idx).
function computeStandings() {
  const enriched = _cars.map((c) => {
    const idx = c.progressIdx;
    const arc = arcLengthFromZero(idx);
    const total = c.laps * _trackLength + arc;
    return { car: c, total };
  });
  enriched.sort((a, b) => {
    const A = a.car, B = b.car;
    const aFinished = A.finishFrame >= 0;
    const bFinished = B.finishFrame >= 0;
    if (aFinished && bFinished) return A.finishFrame - B.finishFrame;
    if (aFinished) return -1;
    if (bFinished) return +1;
    return b.total - a.total; // farther along → higher rank
  });
  return enriched.map((e, i) => ({ car: e.car, place: i + 1 }));
}

function ordinal(n) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// ── HUD ───────────────────────────────────────────────────────────────────
const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 32;

const CAR_HUD_COLORS = [
  "#58a6ff", // player blue
  "#d29922", // orange
  "#3fb950", // green
  "#f85149", // red
  "#a371f7", // purple
  "#ec6cb9", // pink
  "#39c5cf", // cyan
  "#bf8b30", // bronze
];

// World-space FX drawn into the overlay canvas before the HUD strip. Takes
// `camX, camY` from demo-runner and maps world → screen via the demo runner's
// "center the camera target in the viewport" convention.
function drawWorldFx(ctx, W, H, camX, camY) {
  const tx = (x) => x - camX;
  const ty = (y) => y - camY;

  ctx.save();

  // Active item pads — "?" boxes with a rainbow shimmer so it reads as a
  // mystery item (not just a boost). Plain default body draw also renders
  // the Circle, this adds the box + glyph on top.
  const t = _frame * 0.12;
  for (const pad of _boosts) {
    if (!pad.active) continue;
    const sx = tx(pad.x);
    const sy = ty(pad.y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t + pad.idx);
    const r = BOOST_RADIUS + 4 + pulse * 4;
    // Rainbow stroke — cycle through the item colors so it reads as a
    // mystery item, not a specific pickup.
    const colorList = [
      ITEM_TYPES.speed.color, ITEM_TYPES.lightning.color,
      ITEM_TYPES.banana.color, ITEM_TYPES.shell.color,
    ];
    const c = colorList[(Math.floor(_frame / 8) + pad.idx) % colorList.length];
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${c}33`;
    ctx.beginPath();
    ctx.arc(sx, sy, BOOST_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(13,17,23,0.9)";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", sx, sy + 1);
  }

  // Dropped bananas — small pulsing dot in their colour.
  for (const ban of _bananas) {
    if (!ban) continue;
    const sx = tx(ban.body.position.x);
    const sy = ty(ban.body.position.y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    ctx.strokeStyle = ITEM_TYPES.banana.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, BANANA_RADIUS + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${ITEM_TYPES.banana.color}cc`;
    ctx.beginPath();
    ctx.arc(sx, sy, BANANA_RADIUS - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Active shells — small bullet ring (the body is already drawn by the
  // default renderer; this just adds a glow trail so it's spottable at speed).
  for (const sh of _shells) {
    if (!sh) continue;
    const sx = tx(sh.body.position.x);
    const sy = ty(sh.body.position.y);
    ctx.strokeStyle = ITEM_TYPES.shell.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, SHELL_RADIUS + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Pickup-flash expanding ring (any car that just grabbed a pad).
  for (const fx of _boostFlashes) {
    const sx = tx(fx.x);
    const sy = ty(fx.y);
    const k = fx.age / fx.ttl;
    const r = BOOST_RADIUS + k * 50;
    ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hit flashes (banana / shell / lightning splash on hit point).
  for (const fx of _hitFlashes) {
    const sx = tx(fx.x);
    const sy = ty(fx.y);
    const k = fx.age / fx.ttl;
    const r = 14 + k * 60;
    const a = (1 - k).toFixed(2);
    ctx.strokeStyle = `${fx.color}${alpha255ToHex(a)}`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Player boost trail.
  if (_playerBoostTimer > 0 && _cars[0]) {
    const pb = _cars[0].body;
    const sx = tx(pb.position.x);
    const sy = ty(pb.position.y);
    const k = _playerBoostTimer / PLAYER_BOOST_FRAMES;
    const r = 18 + (1 - k) * 35;
    ctx.strokeStyle = `rgba(255,210,80,${k})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Lightning full-screen flash — dim purple wash overlaid on everything.
  if (_lightningFlashFrames > 0) {
    const a = Math.min(0.45, _lightningFlashFrames / 18 * 0.45);
    ctx.fillStyle = `rgba(163,113,247,${a.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}

// Convert "0.85" → "d9" (255-scale hex pair) for inline rgba-in-hex colours.
function alpha255ToHex(aStr) {
  const v = Math.max(0, Math.min(255, Math.round(parseFloat(aStr) * 255)));
  return v.toString(16).padStart(2, "0");
}

function drawHUD(ctx) {
  // Top strip
  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.82)";
  ctx.fillRect(0, 0, SCREEN_W, HUD_H);

  ctx.fillStyle = "#c9d1d9";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const player = _cars[0];
  const lap = Math.min(LAP_TARGET, Math.max(1, player.laps + 1));
  ctx.fillText(`Lap ${player.finishFrame >= 0 ? LAP_TARGET : lap}/${LAP_TARGET}`, 10, HUD_H / 2);

  const standings = computeStandings();
  const pos = standings.findIndex(s => s.car === player) + 1;
  ctx.fillStyle = "#58a6ff";
  ctx.fillText(`Pos: ${ordinal(pos)}/${RACER_COUNT}`, 90, HUD_H / 2);

  const bestStr = isFinite(player.bestLap) ? formatTime(player.bestLap) : "--:--.---";
  ctx.fillStyle = "#3fb950";
  ctx.fillText(`Best: ${bestStr}`, 200, HUD_H / 2);

  // Current lap timer (running) — relative to lapStartFrame
  if (_raceState === "running" && player.finishFrame < 0) {
    const cur = (_frame - player.lapStartFrame) / 60;
    ctx.fillStyle = "#d29922";
    ctx.fillText(`Lap: ${formatTime(cur)}`, 330, HUD_H / 2);
  }

  // Total elapsed
  if (_raceState !== "countdown") {
    const elapsed = (_frame - _raceStartFrame) / 60;
    ctx.fillStyle = "#c9d1d9";
    ctx.textAlign = "right";
    ctx.fillText(`Total: ${formatTime(Math.max(0, elapsed))}`, SCREEN_W - 10, HUD_H / 2);
  }

  // BOOST! flash on the HUD strip while the player's boost is active.
  if (_playerBoostTimer > 0) {
    const k = _playerBoostTimer / PLAYER_BOOST_FRAMES;
    const alpha = 0.4 + 0.6 * k;
    ctx.textAlign = "center";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillStyle = `rgba(255, 210, 80, ${alpha})`;
    ctx.fillText("BOOST!", SCREEN_W / 2, HUD_H / 2);
  }

  // Player item slot — a 56×56 box just under the HUD strip on the LEFT.
  // Shows the current item (with its colour + glyph), or "?" if empty.
  // A faint "E" key hint is drawn under the box so the player learns the
  // binding without having to read the description.
  const slotX = 10;
  const slotY = HUD_H + 8;
  const slotW = 56;
  const slotH = 56;
  ctx.fillStyle = "rgba(13,17,23,0.75)";
  ctx.fillRect(slotX, slotY, slotW, slotH);
  ctx.strokeStyle = "rgba(201,209,217,0.4)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotW - 1, slotH - 1);

  const item = player.slotItem ? ITEM_TYPES[player.slotItem] : null;
  if (item) {
    ctx.fillStyle = `${item.color}33`;
    ctx.fillRect(slotX + 4, slotY + 4, slotW - 8, slotH - 8);
    ctx.fillStyle = item.color;
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.glyph, slotX + slotW / 2, slotY + slotH / 2 - 2);
    ctx.font = "9px system-ui, sans-serif";
    ctx.fillText(item.label, slotX + slotW / 2, slotY + slotH - 8);
  } else {
    ctx.fillStyle = "rgba(139,148,158,0.55)";
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", slotX + slotW / 2, slotY + slotH / 2);
  }
  // Key hint
  ctx.fillStyle = item ? "#c9d1d9" : "rgba(139,148,158,0.6)";
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("E to fire", slotX + slotW / 2, slotY + slotH + 12);

  // Mini standings list (top-right under the strip)
  ctx.textAlign = "left";
  ctx.font = "11px system-ui, sans-serif";
  const listX = SCREEN_W - 175;
  let listY = HUD_H + 6;
  ctx.fillStyle = "rgba(13,17,23,0.7)";
  ctx.fillRect(listX - 6, listY - 2, 170, RACER_COUNT * 16 + 6);
  for (const s of standings) {
    const isPlayer = s.car.isPlayer;
    ctx.fillStyle = CAR_HUD_COLORS[s.car.colorIdx % CAR_HUD_COLORS.length];
    ctx.fillRect(listX, listY + 4, 6, 6);
    ctx.fillStyle = isPlayer ? "#ffffff" : "#c9d1d9";
    ctx.fillText(`${s.place}. ${s.car.name}`, listX + 12, listY + 4);
    const lapStr = s.car.finishFrame >= 0
      ? "✓"
      : `${Math.min(LAP_TARGET, s.car.laps + 1)}/${LAP_TARGET}`;
    ctx.textAlign = "right";
    ctx.fillText(lapStr, listX + 158, listY + 4);
    ctx.textAlign = "left";
    listY += 16;
  }

  ctx.restore();
}

function drawCountdown(ctx) {
  if (_raceState !== "countdown") return;
  const t = _countdown;
  let txt;
  if (t > 120) txt = "3";
  else if (t > 60) txt = "2";
  else if (t > 0) txt = "1";
  else txt = "GO!";

  ctx.save();
  ctx.fillStyle = txt === "GO!" ? "#3fb950" : "#d29922";
  ctx.font = "bold 96px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Drop shadow for legibility against the track
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 12;
  ctx.fillText(txt, SCREEN_W / 2, SCREEN_H / 2);
  ctx.restore();
}

function drawFinish(ctx) {
  if (_raceState !== "finished") return;

  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.84)";
  ctx.fillRect(SCREEN_W / 2 - 220, SCREEN_H / 2 - 130, 440, 260);

  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Race Complete", SCREEN_W / 2, SCREEN_H / 2 - 100);

  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "left";
  let y = SCREEN_H / 2 - 60;
  // Sort cars by their finish order (1, 2, 3, 4 — DNF go last by big number)
  const ranked = _cars.slice().sort((a, b) => {
    const af = a.finishFrame >= 0 ? a.finishFrame : Number.POSITIVE_INFINITY;
    const bf = b.finishFrame >= 0 ? b.finishFrame : Number.POSITIVE_INFINITY;
    return af - bf;
  });
  for (let i = 0; i < ranked.length; i++) {
    const c = ranked[i];
    const place = i + 1;
    const time = c.finishFrame >= 0 ? formatTime((c.finishFrame - _raceStartFrame) / 60) : "DNF";
    const best = isFinite(c.bestLap) ? formatTime(c.bestLap) : "--:--.---";
    ctx.fillStyle = CAR_HUD_COLORS[c.colorIdx % CAR_HUD_COLORS.length];
    ctx.fillRect(SCREEN_W / 2 - 200, y - 6, 6, 12);
    ctx.fillStyle = c.isPlayer ? "#ffffff" : "#c9d1d9";
    ctx.fillText(`${ordinal(place)}  ${c.name}`, SCREEN_W / 2 - 186, y);
    ctx.fillText(time, SCREEN_W / 2 - 30, y);
    ctx.fillStyle = "#8b949e";
    ctx.fillText(`best ${best}`, SCREEN_W / 2 + 90, y);
    y += 24;
  }

  if (_finishHold <= 0) {
    ctx.fillStyle = "#58a6ff";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Click anywhere to race again", SCREEN_W / 2, SCREEN_H / 2 + 100);
  }
  ctx.restore();
}

// ── Reset / setup race ────────────────────────────────────────────────────
function resetRace(space) {
  // Tear down dynamic bodies (cars), keep the static track + sensors + boosts.
  for (const c of _cars) {
    if (c.body && c.body.space) c.body.space = null;
  }
  _cars = [];
  _carByBody = null;

  // Remove any in-flight bananas/shells.
  for (const b of _bananas) {
    if (b && b.body && b.body.space) b.body.space = null;
  }
  _bananas.length = 0;
  for (const s of _shells) {
    if (s && s.body && s.body.space) s.body.space = null;
  }
  _shells.length = 0;

  // Tear down obstacles and rebuild them so the balls return to their
  // starting positions and the spinners get a fresh randomised direction.
  for (const o of _obstacles) {
    if (o.body && o.body.space) o.body.space = null;
  }
  _obstacles.length = 0;
  buildObstacles(space);

  for (const b of _boosts) {
    b.active = true;
    b.respawnTimer = 0;
    try { b.body.userData._hidden = false; } catch (_) {}
  }

  spawnCars(space);

  _raceState = "countdown";
  _countdown = COUNTDOWN_FRAMES;
  _finishHold = 0;
  _frame = 0;
  _raceStartFrame = COUNTDOWN_FRAMES;
  _prevContactCount = 0;
  _steerVisualAngle = 0;
  _boostFlashes.length = 0;
  _hitFlashes.length = 0;
  _playerBoostTimer = 0;
  _lightningFlashFrames = 0;

  keys.up = false;
  keys.down = false;
  keys.left = false;
  keys.right = false;
  keys.brake = false;
  keys.handbrake = false;
  keys.useItemHeld = false;
  keys.useItemEdge = false;
  keys._touchUp = false;
  keys._touchDown = false;
  keys._touchLeft = false;
  keys._touchRight = false;

  // Move the camera onto the player right away — no lerp-in from world origin.
  if (_runnerRef) {
    _runnerRef.updateCamera({
      follow: _cars[0].body,
      offsetX: 0,
      offsetY: 0,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.12,
    });
    _runnerRef.snapCamera();
  }
}

// ── Demo definition ───────────────────────────────────────────────────────
export default {
  id: "tinywheels-cup",
  label: "Tinywheels Cup",
  featured: false,
  tags: ["Top-Down", "Zero Gravity", "AI", "Waypoints", "Sensor", "Camera", "Race", "Items"],
  desc:
    "Top-down kart-racer — you (blue) vs. three waypoint-driven AI opponents " +
    "on a closed three-lap track. Mario-Kart-style item boxes: pick up a <b>?</b>-pad " +
    "to roll a random item into your slot, then <b>E</b> to fire it. " +
    "<b>Mushroom</b> = speed burst, <b>Bolt</b> = slow all rivals, " +
    "<b>Banana</b> = drop trap behind, <b>Shell</b> = forward projectile. " +
    "Watch for rotating bars and bouncy balls — they'll knock you off-line. " +
    "Controls: <b>↑ ↓ ← →</b> (or WASD), <b>Space</b> brake, <b>Shift</b> drift, <b>E</b> use item. " +
    "First to three laps wins.",
  walls: false,

  camera: null,

  setup(space) {
    _space = space;
    _runnerRef = this._runner ?? null;
    space.gravity = new Vec2(0, 0);

    setupCallbacks(space);
    buildTrack(space);
    buildLapSensors(space);
    buildBoostPickups(space);
    buildObstacles(space);
    spawnCars(space);

    _raceState = "countdown";
    _countdown = COUNTDOWN_FRAMES;
    _finishHold = 0;
    _frame = 0;
    _raceStartFrame = COUNTDOWN_FRAMES;
    _prevContactCount = 0;
    _steerVisualAngle = 0;

    this.camera = {
      follow: _cars[0].body,
      offsetX: 0,
      offsetY: 0,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.12,
    };

    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    keys.brake = false;
    keys.handbrake = false;
    keys._touchUp = false;
    keys._touchDown = false;
    keys._touchLeft = false;
    keys._touchRight = false;

    _onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
      if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
      if (e.code === "Space") keys.brake = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.handbrake = true;
      if (e.code === "KeyE") {
        // Edge-trigger: only count one fire per keydown so holding doesn't
        // empty the slot in 60 fires/second.
        if (!keys.useItemHeld) {
          keys.useItemHeld = true;
          keys.useItemEdge = true;
        }
      }
      if ([
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "Space", "ShiftLeft", "ShiftRight", "KeyE",
      ].includes(e.code)) {
        e.preventDefault();
      }
    };
    _onKeyUp = (e) => {
      keys[e.code] = false;
      if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
      if (e.code === "Space") keys.brake = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.handbrake = false;
      if (e.code === "KeyE") keys.useItemHeld = false;
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  teardown() {
    if (typeof window !== "undefined") {
      if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
      if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    }
    _onKeyDown = null;
    _onKeyUp = null;
  },

  step(space) {
    _frame++;

    // Age visual effects.
    if (_playerBoostTimer > 0) _playerBoostTimer--;
    if (_lightningFlashFrames > 0) _lightningFlashFrames--;
    for (let i = _boostFlashes.length - 1; i >= 0; i--) {
      _boostFlashes[i].age++;
      if (_boostFlashes[i].age >= _boostFlashes[i].ttl) _boostFlashes.splice(i, 1);
    }
    for (let i = _hitFlashes.length - 1; i >= 0; i--) {
      _hitFlashes[i].age++;
      if (_hitFlashes[i].age >= _hitFlashes[i].ttl) _hitFlashes.splice(i, 1);
    }

    // Item-pad pickup → roll a random item into the slot (Mario-Kart "?-box"
    // behaviour). Cars that already have a queued item don't pick up again
    // until they fire — this avoids the slot churning over a single pad.
    if (_pending.boostHits.length) {
      for (const hit of _pending.boostHits) {
        const pad = _boosts[hit.boostIdx];
        if (!pad || !pad.active) continue;
        if (hit.car.slotItem) continue;
        pad.active = false;
        pad.respawnTimer = BOOST_RESPAWN_FRAMES;
        try { pad.body.userData._hidden = true; pad.body.userData._hidden3d = true; } catch (_) {}
        hit.car.slotItem = rollItem();
        _boostFlashes.push({ x: pad.x, y: pad.y, age: 0, ttl: 24 });
        if (hit.car.isPlayer && this._runner) this._runner.shakeCamera(2, 0.12);
      }
      _pending.boostHits.length = 0;
    }

    // Banana hit — only react if the car isn't currently spinning out (so a
    // single overlap doesn't keep re-triggering as the car slides over the
    // sensor). Removes the banana from the world on hit.
    if (_pending.bananaHits.length) {
      for (const hit of _pending.bananaHits) {
        const bIdx = hit.bananaIdx;
        const banana = _bananas[bIdx];
        if (!banana || !banana.body || banana.body.space === null) continue;
        if (hit.car.effects.spinFrames > 0) continue;
        // Apply hit
        hit.car.effects.spinFrames = HIT_SPIN_FRAMES;
        hit.car.effects.slowFrames = Math.max(hit.car.effects.slowFrames, HIT_SLOW_FRAMES);
        // Pop a colored ring at the hit point and remove the banana from the space
        _hitFlashes.push({ x: banana.body.position.x, y: banana.body.position.y, age: 0, ttl: 22, color: ITEM_TYPES.banana.color });
        banana.body.space = null;
        _bananas[bIdx] = null;
        if (hit.car.isPlayer && this._runner) this._runner.shakeCamera(6, 0.25);
      }
      _pending.bananaHits.length = 0;
    }

    // Shell hit — same idea: spin the car, kill the shell.
    if (_pending.shellHits.length) {
      for (const hit of _pending.shellHits) {
        const sIdx = hit.shellIdx;
        const shell = _shells[sIdx];
        if (!shell || !shell.body || shell.body.space === null) continue;
        if (hit.car.effects.spinFrames > 0) continue;
        hit.car.effects.spinFrames = HIT_SPIN_FRAMES;
        hit.car.effects.slowFrames = Math.max(hit.car.effects.slowFrames, HIT_SLOW_FRAMES);
        _hitFlashes.push({ x: shell.body.position.x, y: shell.body.position.y, age: 0, ttl: 22, color: ITEM_TYPES.shell.color });
        shell.body.space = null;
        _shells[sIdx] = null;
        if (hit.car.isPlayer && this._runner) this._runner.shakeCamera(6, 0.25);
      }
      _pending.shellHits.length = 0;
    }

    // Tick status effects (per car). Sustained mushroom boost applies its
    // share of the total impulse each frame it's active, so the boost
    // *physically* lasts SPEED_BOOST_FRAMES rather than being a single tick.
    for (const c of _cars) {
      if (c.effects.slowFrames > 0) c.effects.slowFrames--;
      if (c.effects.spinFrames > 0) c.effects.spinFrames--;
      if (c.effects.boostFrames > 0) {
        const body = c.body;
        const fwd = getForwardVec(body);
        const perFrameImpulse = (SPEED_BOOST_IMPULSE / SPEED_BOOST_FRAMES) * body.mass;
        body.applyImpulse(new Vec2(fwd.x * perFrameImpulse, fwd.y * perFrameImpulse));
        c.effects.boostFrames--;
      }
    }

    // Tick banana lifetimes (auto-clear after 20s).
    for (let i = 0; i < _bananas.length; i++) {
      const b = _bananas[i];
      if (!b) continue;
      b.lifetime--;
      if (b.lifetime <= 0) {
        if (b.body && b.body.space) b.body.space = null;
        _bananas[i] = null;
      }
    }

    // Tick shells: enforce constant speed (cap velocity to SHELL_SPEED so
    // bouncing off walls doesn't slow them) and lifetime.
    for (let i = 0; i < _shells.length; i++) {
      const s = _shells[i];
      if (!s) continue;
      s.lifetime--;
      if (s.lifetime <= 0) {
        if (s.body && s.body.space) s.body.space = null;
        _shells[i] = null;
        continue;
      }
      const v = s.body.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed > 0.1) {
        const k = SHELL_SPEED / speed;
        s.body.velocity = new Vec2(v.x * k, v.y * k);
      }
    }

    // Tick item-pad respawns.
    for (const pad of _boosts) {
      if (pad.active) continue;
      pad.respawnTimer--;
      if (pad.respawnTimer <= 0) {
        pad.active = true;
        try { pad.body.userData._hidden = false; pad.body.userData._hidden3d = false; } catch (_) {}
      }
    }

    // Countdown — freeze cars in place, just decrement the timer
    if (_raceState === "countdown") {
      _countdown--;
      // Zero out car velocity so any settling from the spawn pose doesn't drift them.
      for (const c of _cars) {
        c.body.velocity = new Vec2(0, 0);
        c.body.angularVel = 0;
      }
      if (_countdown <= -30) {
        // Hold "GO!" for half a second after the countdown hits zero, then
        // flip to running and start each car's lap timer.
        _raceState = "running";
        _raceStartFrame = _frame;
        for (const c of _cars) {
          c.lapStartFrame = _frame;
        }
      }
      return;
    }

    // Race finished? Check whether all cars are done.
    if (_raceState === "running") {
      // Update progress index for ordering
      for (const c of _cars) updateProgressIdx(c);
      const allDone = _cars.every(c => c.finishFrame >= 0);
      // End the race when the player finishes (and give AI 8 seconds to
      // wrap up). Mirrors how Mario-Kart-likes hand control back to the
      // player when their car is done.
      const player = _cars[0];
      const tooLongAfterPlayer = player.finishFrame >= 0 && (_frame - player.finishFrame) > 480;
      if (allDone || tooLongAfterPlayer) {
        _raceState = "finished";
        _finishHold = FINISH_HOLD_FRAMES;
        // Assign DNF order to anybody who hasn't crossed.
        const finishedOrder = [];
        for (const c of _cars) {
          if (c.finishFrame >= 0) finishedOrder.push({ c, t: c.finishFrame });
        }
        finishedOrder.sort((a, b) => a.t - b.t);
        finishedOrder.forEach((e, i) => { e.c.finishOrder = i + 1; });
        let nextPlace = finishedOrder.length + 1;
        // Order the still-running cars by total arc and assign DNF positions.
        const remaining = _cars.filter(c => c.finishFrame < 0);
        remaining.sort((a, b) => {
          const ad = a.laps * _trackLength + arcLengthFromZero(a.progressIdx);
          const bd = b.laps * _trackLength + arcLengthFromZero(b.progressIdx);
          return bd - ad;
        });
        for (const c of remaining) c.finishOrder = nextPlace++;
      }
    } else if (_raceState === "finished") {
      _finishHold--;
    }

    // Player can fire the slotted item with KeyE (edge-trigger so a held
    // key empties the slot just once). AI fires through aiControl().
    if (keys.useItemEdge) {
      keys.useItemEdge = false;
      if (_cars[0] && _cars[0].finishFrame < 0) fireItem(_cars[0]);
    }

    // ── Drive every car ────────────────────────────────────────────────
    for (const c of _cars) {
      const body = c.body;
      if (c.finishFrame >= 0) {
        updateFriction(body, DT, 0, false);
        continue;
      }
      // Spin-out from a banana/shell/lightning hit: no driver input, just
      // bleed velocity and impose a small angular wobble so it reads visually.
      if (c.effects.spinFrames > 0) {
        // Apply a one-time spin kick on the first frame of the spin
        if (c.effects.spinFrames === HIT_SPIN_FRAMES) {
          body.angularVel = (Math.random() < 0.5 ? -1 : 1) * 6;
        }
        // Bleed forward velocity hard during the spin
        const v = body.velocity;
        body.velocity = new Vec2(v.x * 0.92, v.y * 0.92);
        updateFriction(body, DT, 0, false);
        continue;
      }
      let throttle, steer, brake, handbrake;
      if (c.isPlayer) {
        // Pressing Left turns the car visually left; pressing Right turns it
        // right. The `cars` repo's InputManager uses the opposite sign
        // because its updateTurn applies the steer with the opposite sign —
        // here we apply it directly so we have to swap the input signs to
        // get the intuitive mapping.
        throttle = 0; steer = 0;
        if (keys.up   || keys._touchUp)    throttle += 1;
        if (keys.down || keys._touchDown)  throttle -= 1;
        if (keys.left || keys._touchLeft)  steer -= 1;
        if (keys.right|| keys._touchRight) steer += 1;
        brake = !!keys.brake;
        handbrake = !!keys.handbrake;
      } else {
        const ai = aiControl(c);
        throttle = ai.throttle;
        steer = ai.steer;
        brake = ai.brake;
        handbrake = ai.handbrake;
      }
      // Slow effect → halve the effective throttle for the duration.
      if (c.effects.slowFrames > 0) throttle *= 0.5;
      updateCarPhysics(body, throttle, steer, brake, DT, handbrake);
    }

    // ── Wall-contact rising edge → camera shake on the player ──────────
    const player = _cars[0].body;
    let staticContacts = 0;
    try {
      const arbs = space.arbiters;
      const arbCount = arbs.zpp_gl();
      for (let i = 0; i < arbCount; i++) {
        const a = arbs.at(i);
        if (a.body1 === player || a.body2 === player) {
          const other = a.body1 === player ? a.body2 : a.body1;
          if (other.isStatic && other.isStatic()) staticContacts++;
        }
      }
    } catch (_) {}
    if (staticContacts > _prevContactCount) {
      const speed = Math.hypot(player.velocity.x, player.velocity.y);
      if (speed > SHAKE_MIN_SPEED && this._runner) {
        const norm = Math.min(1, (speed - SHAKE_MIN_SPEED) / (CAR.MAX_FORWARD_SPEED - SHAKE_MIN_SPEED));
        const amp = 4 + norm * 12;
        this._runner.shakeCamera(amp, 0.22);
      }
    }
    _prevContactCount = staticContacts;
  },

  click(x, y, space) {
    // Restart on click once the post-race hold has elapsed.
    if (_raceState === "finished" && _finishHold <= 0) {
      resetRace(space);
      return;
    }
    // Touch steering — same scheme as car-topdown.
    if (!_cars[0]) return;
    const cx = _cars[0].body.position.x;
    const cy = _cars[0].body.position.y;
    const dx = x - cx;
    const dy = y - cy;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) keys._touchUp = true;
      else keys._touchDown = true;
    } else {
      if (dx < 0) keys._touchLeft = true;
      else keys._touchRight = true;
    }
  },

  drag(x, y) {
    if (!_cars[0]) return;
    keys._touchUp = false;
    keys._touchDown = false;
    keys._touchLeft = false;
    keys._touchRight = false;
    const cx = _cars[0].body.position.x;
    const cy = _cars[0].body.position.y;
    const dx = x - cx;
    const dy = y - cy;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) keys._touchUp = true;
      else keys._touchDown = true;
    } else {
      if (dx < 0) keys._touchLeft = true;
      else keys._touchRight = true;
    }
  },

  release() {
    keys._touchUp = false;
    keys._touchDown = false;
    keys._touchLeft = false;
    keys._touchRight = false;
  },

  render3dOverlay(ctx, _space, W, H, camX, camY) {
    drawWorldFx(ctx, W ?? SCREEN_W, H ?? SCREEN_H, camX ?? 0, camY ?? 0);
    drawHUD(ctx);
    drawCountdown(ctx);
    drawFinish(ctx);
  },
};
