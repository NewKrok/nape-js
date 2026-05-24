import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType, Ray,
} from "../nape-js.esm.js";

// Tinywheels Cup — top-down kart-racer with one player + three waypoint-driven AI
// opponents racing three laps on a closed Catmull-Rom track. The car controller
// (PIXEL_RATIO, the CAR tuning block, updateFriction / updateDrive / updateTurn)
// is the same iforce2d-style model used in `docs/demos/car-topdown.js`; the
// new pieces here are the multi-car field, the AI controller, the lap sensors,
// the boost pads, and the HUD / race-end screen. Renderer-agnostic — the
// default body draw handles cars + walls + sensors across canvas2d / threejs /
// pixi, and `render3dOverlay` paints the HUD on top.
const PIXEL_RATIO = 10;

// Verbatim car tuning from car-topdown.js. Each car (player + AI) gets the
// same physics — the difference is purely in how throttle/steer/brake are
// produced (keyboard for the player, AI controller for opponents).
const CAR = {
  WIDTH: 1.32,
  LENGTH: 2.64,
  MAX_FORWARD_SPEED: 1050,
  MAX_REVERSE_SPEED: 175,
  MAX_DRIVE_FORCE: 250,
  BRAKE_FORCE: 120,
  MAX_LATERAL_IMPULSE: 3.5,
  DRAG_MODIFIER: 0.08,
  ENGINE_BRAKE: 0.25,
  ANGULAR_FRICTION: 0.3,
  STEER_TORQUE: 1320,
  STEER_LOCK_SPEED: 40,
  STEER_LOCK_POWER: 2.5,
  DRIFT_LATERAL_IMPULSE: 1.2,
  DRIFT_ANGULAR_FRICTION: 0.18,
  DRIFT_STEER_TORQUE: 1600,
  DRIFT_BRAKE_FACTOR: 0.3,
  DRIFT_MAX_ANGULAR_VEL: 3.5,
};

const DT = 1 / 60;
const SHAKE_MIN_SPEED = 80;

// World in nape pixel units (PIXEL_RATIO * world units).
const WORLD_W = 280 * PIXEL_RATIO;   // 2800 px
const WORLD_H = 170 * PIXEL_RATIO;   // 1700 px

// Track ribbon — wider than car-topdown's 13 so four cars can wheel-to-wheel.
const TRACK_ROAD_WIDTH_UNITS = 22;
const TRACK_SPLINE_SEGMENTS = 360;
const WALL_THICK = 2 * PIXEL_RATIO;

// Closed-loop control points (world units, relative to world center). The
// start/finish line sits at index 0 — a wide-ish straight along the top of
// the layout so four cars can grid up side-by-side. The spline winds through
// a mix of long sweepers and one tight chicane (right side) so the AI has
// to actually slow for the turn rather than just plowing through.
const TRACK_CONTROL_POINTS = [
  { x:    0, y:  -65 },
  { x:   40, y:  -67 },
  { x:   80, y:  -60 },
  { x:  108, y:  -42 },
  { x:  118, y:  -15 },
  { x:  108, y:   12 },
  { x:   85, y:   28 },
  { x:  100, y:   55 },
  { x:   75, y:   72 },
  { x:   35, y:   62 },
  { x:    0, y:   68 },
  { x:  -40, y:   60 },
  { x:  -80, y:   62 },
  { x: -110, y:   40 },
  { x: -124, y:    5 },
  { x: -114, y:  -28 },
  { x:  -85, y:  -50 },
  { x:  -45, y:  -58 },
];

// ── Race rules ────────────────────────────────────────────────────────────
const LAP_TARGET = 3;
const RACER_COUNT = 4;              // 1 player + 3 AI
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
const AI_HARD_TURN_RADIUS_PX = 95;  // below this → cut throttle hard
const AI_SOFT_TURN_RADIUS_PX = 180; // below this → modest throttle cut

// ── Boost pads ────────────────────────────────────────────────────────────
const BOOST_COUNT = 5;
const BOOST_RADIUS = 18;
const BOOST_IMPULSE = 90;           // forward impulse on pickup (in mass*pxFrames)
const BOOST_RESPAWN_FRAMES = 360;   // 6 s before a pad respawns
const BOOST_OFFSET_UNITS = 2.8;     // lateral offset off centerline (world units)

// ── Collision groups ──────────────────────────────────────────────────────
// 1 = default (track walls, in case any escape this scheme), 2 = wall,
// 4 = player, 8 = AI, 16 = sensor (lap / boost). Sensors are SENSOR-only —
// callbacks fire on overlap but no collision response. Player+AI both collide
// with each other and with walls; sensors pass through everything.
const GROUP_WALL    = 2;
const GROUP_PLAYER  = 4;
const GROUP_AI      = 8;
const GROUP_SENSOR  = 16;

// Cars must also "see" the sensor group, otherwise the filter pair check
// (carMask & sensorGroup) fails and the lap / boost callbacks never fire.
const CAR_MASK = GROUP_WALL | GROUP_PLAYER | GROUP_AI | GROUP_SENSOR;
const WALL_MASK = -1;                              // walls collide with anything
const SENSOR_MASK = GROUP_PLAYER | GROUP_AI;       // sensors only see cars
const RAY_WALL_FILTER = new InteractionFilter(1, GROUP_WALL);

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _runnerRef = null;

let _centerline = null;             // [{x,y}] in pixel units
let _normals = null;                // [{x,y}] right-hand normal per index
let _trackLength = 0;               // sum of segment lengths (pixels)
let _trackBody = null;
let _trackHalfWidth = 0;

let _lapSensorBody = null;          // start/finish line trigger
let _midSensorBody = null;          // half-lap checkpoint trigger

let _cars = [];                     // [{ body, name, isPlayer, colorIdx, ... }]
let _carByBody = null;              // WeakMap from Body → car state

const _boosts = [];                 // [{ body, active, respawnTimer, idx }]

// Race control
let _raceState = "countdown";       // "countdown" | "running" | "finished"
let _countdown = COUNTDOWN_FRAMES;
let _finishHold = 0;
let _frame = 0;
let _raceStartFrame = 0;

// Per-frame pending mutations (applied between physics + callbacks).
const _pending = {
  boostHits: [],                    // { car, boostIdx }
};

// Lap-line cross detection — wall-contact rising edge for shake
let _prevContactCount = 0;
let _steerVisualAngle = 0;

// Callback types
let _cbCar = null;
let _cbLapLine = null;
let _cbMidLine = null;
let _cbBoost = null;

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

// Tight curves in the ribbon can collapse a quad to concave; nape rejects
// those, so we filter them out before adding to the track body.
function isConvexQuad(v) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = v[i];
    const b = v[(i + 1) % 4];
    const c = v[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 0.5) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
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
function buildTrack(space) {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const wallMat = new Material(0.4, 0.05, 0.05, 1);

  const centerline = generateSpline(TRACK_CONTROL_POINTS, TRACK_SPLINE_SEGMENTS).map(p => ({
    x: cx + p.x * PIXEL_RATIO,
    y: cy + p.y * PIXEL_RATIO,
  }));
  const n = centerline.length;
  const halfWidth = (TRACK_ROAD_WIDTH_UNITS * PIXEL_RATIO) / 2;
  _trackHalfWidth = halfWidth;

  // Per-segment right-hand normals (forward tangent rotated +90°). The
  // tangent at index i is the central difference between i-1 and i+1, which
  // gives a smoother normal field than the per-edge tangent and matters when
  // we use these normals for waypoint offset and boost placement.
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

  const inner = [];
  const outer = [];
  for (let i = 0; i < n; i++) {
    inner.push({
      x: centerline[i].x - normals[i].x * halfWidth,
      y: centerline[i].y - normals[i].y * halfWidth,
    });
    outer.push({
      x: centerline[i].x + normals[i].x * halfWidth,
      y: centerline[i].y + normals[i].y * halfWidth,
    });
  }

  const trackBody = new Body(BodyType.STATIC);
  try { trackBody.userData._colorIdx = 4; } catch (_) {}

  const ribbon = (edge, normalSign) => {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const e0 = edge[i];
      const e1 = edge[j];
      const nm0 = normals[i];
      const nm1 = normals[j];
      const ox0 = nm0.x * WALL_THICK * normalSign;
      const oy0 = nm0.y * WALL_THICK * normalSign;
      const ox1 = nm1.x * WALL_THICK * normalSign;
      const oy1 = nm1.y * WALL_THICK * normalSign;
      const verts = normalSign > 0
        ? [
            new Vec2(e0.x, e0.y),
            new Vec2(e1.x, e1.y),
            new Vec2(e1.x + ox1, e1.y + oy1),
            new Vec2(e0.x + ox0, e0.y + oy0),
          ]
        : [
            new Vec2(e0.x + ox0, e0.y + oy0),
            new Vec2(e1.x + ox1, e1.y + oy1),
            new Vec2(e1.x, e1.y),
            new Vec2(e0.x, e0.y),
          ];
      if (!isConvexQuad(verts)) continue;
      const poly = new Polygon(verts, wallMat);
      poly.filter = new InteractionFilter(GROUP_WALL, WALL_MASK);
      trackBody.shapes.add(poly);
    }
  };
  ribbon(outer, +1);
  ribbon(inner, -1);
  trackBody.space = space;

  _centerline = centerline;
  _normals = normals;
  _trackBody = trackBody;
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
  const step = Math.floor(cl.length / BOOST_COUNT);
  for (let i = 0; i < BOOST_COUNT; i++) {
    // Skip the few indices right around the start/finish line so the boosts
    // never overlap the lap sensor or the grid.
    const idx = ((i * step) + Math.floor(step / 2)) % cl.length;
    const c = cl[idx];
    const nm = _normals[idx];
    const sideSign = i % 2 === 0 ? +1 : -1;
    const offset = BOOST_OFFSET_UNITS * PIXEL_RATIO * sideSign;
    const x = c.x + nm.x * offset;
    const y = c.y + nm.y * offset;
    const body = new Body(BodyType.STATIC, new Vec2(x, y));
    const shape = new Circle(BOOST_RADIUS);
    shape.sensorEnabled = true;
    shape.filter = new InteractionFilter(GROUP_SENSOR, SENSOR_MASK);
    body.shapes.add(shape);
    try {
      body.userData._colorIdx = 1; // yellow-ish in the default palette
      body.userData._kind = "boost";
      body.userData._boostIdx = i;
    } catch (_) {}
    body.cbTypes.add(_cbBoost);
    body.space = space;
    _boosts.push({ body, active: true, respawnTimer: 0, idx: i, x, y });
  }
}

// ── Cars ──────────────────────────────────────────────────────────────────
const AI_NAMES = ["Mira", "Kato", "Echo"];

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
    const carMat = new Material(0.2, 0.3, 0.3, 1.5);
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

    // Map color index to renderer palette: player=blue (0), AI=orange/green/red
    const colorIdx = isPlayer ? 0 : (i === 1 ? 1 : (i === 2 ? 2 : 3));
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
      // Track progress used for ordering (centerline index + lap count).
      progressIdx: gridBaseIdx,
      // AI controller state — irrelevant for the player but cheap to carry.
      ai: {
        boostTimer: 0,
        avoidHold: 0,
        avoidSide: 0,
        steerNoiseFrame: 0,
        steerNoise: 0,
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
// Strategy:
//   1. Pick target = centerline[progress + AI_LOOKAHEAD] (where to go right
//      now) and turn-horizon = centerline[progress + AI_TURN_LOOKAHEAD] (used
//      to detect upcoming corners and lift the throttle).
//   2. Steer = clamp(signed angle to target, -1, +1), plus a small per-car
//      noise so they don't all hug the exact same racing line.
//   3. Throttle starts at (1 - speed / MAX) — fast cars naturally back off.
//      Then lower it more if the turn-horizon curvature is tight.
//   4. Forward raycast against walls. If something's close ahead, sweep
//      ±AI_PROBE_SIDE feelers and steer toward the clearer side.
function aiControl(car) {
  const cl = _centerline;
  const n = cl.length;
  const body = car.body;
  const pos = body.position;
  const rot = body.rotation;

  // 1) Target waypoint.
  updateProgressIdx(car);
  const targetIdx = (car.progressIdx + AI_LOOKAHEAD) % n;
  const horizonIdx = (car.progressIdx + AI_TURN_LOOKAHEAD) % n;
  const target = cl[targetIdx];

  // Bias toward the inside of the upcoming corner — cheaper "racing line".
  // We sample the centerline normal at the horizon index and pull the target
  // a fraction of half-width toward whichever side opens the corner.
  const horizon = cl[horizonIdx];
  const innerBiasX = (horizon.x - target.x);
  const innerBiasY = (horizon.y - target.y);
  const biasLen = Math.hypot(innerBiasX, innerBiasY) || 1;
  const aimX = target.x + (innerBiasX / biasLen) * _trackHalfWidth * 0.25;
  const aimY = target.y + (innerBiasY / biasLen) * _trackHalfWidth * 0.25;

  // 2) Steering — signed angle delta between car heading and aim direction.
  const dx = aimX - pos.x;
  const dy = aimY - pos.y;
  const targetAngle = Math.atan2(dy, dx);
  let angleDiff = targetAngle - rot;
  // Wrap to [-PI, PI]
  while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  // Map to [-1, 1] with a soft response (turn harder when far off-line)
  let steer = Math.max(-1, Math.min(1, angleDiff * 1.8));

  // Roll a fresh noise sample every ~12 frames so the wobble is slow.
  car.ai.steerNoiseFrame++;
  if (car.ai.steerNoiseFrame >= 12) {
    car.ai.steerNoiseFrame = 0;
    car.ai.steerNoise = (Math.random() * 2 - 1) * AI_STEER_NOISE;
  }
  steer += car.ai.steerNoise;
  steer = Math.max(-1, Math.min(1, steer));

  // 3) Throttle: scale down from "full-on" by current speed AND by the
  // tightness of the next corner. Sample 3 centerline points around the
  // horizon to estimate curvature radius (rough but cheap).
  const speed = Math.abs(getForwardSpeed(body));
  let throttle = 1 - speed / CAR.MAX_FORWARD_SPEED;
  if (throttle < AI_THROTTLE_MIN) throttle = AI_THROTTLE_MIN;

  const a = cl[(horizonIdx - 4 + n) % n];
  const b = cl[horizonIdx];
  const c = cl[(horizonIdx + 4) % n];
  const radius = circleRadiusOfThree(a, b, c);
  if (radius < AI_HARD_TURN_RADIUS_PX) {
    throttle *= 0.35;
  } else if (radius < AI_SOFT_TURN_RADIUS_PX) {
    throttle *= 0.7;
  }

  // 4) Wall-feeler nudge — cast forward + side probes; if blocked, steer to
  // the clearer side and kill throttle while we're recovering.
  const fwd = getForwardVec(body);
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
    throttle *= 0.55;
    car.ai.avoidHold--;
    if (car.ai.avoidHold === 0) car.ai.avoidSide = 0;
  }

  // Boost decay — if the AI picked up a pad recently, the impulse already
  // bumped their velocity; the timer is purely for the HUD effect (no extra
  // per-frame force needed).
  if (car.ai.boostTimer > 0) car.ai.boostTimer--;

  return { throttle, steer, brake: false, handbrake: false };
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

  // Boost pickup — queue for deferred application (don't mutate the body
  // graph mid-callback). The pending entry resolves in step() before the
  // physics tick.
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbBoost, _cbCar,
    (cb) => {
      if (_raceState !== "running") return;
      const car = bodyFromCb(cb);
      const state = car && _carByBody.get(car);
      if (!state) return;
      // Identify which boost. The sensor in cb.int1 is the boost (it has
      // _cbBoost); the car is the other.
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

const CAR_HUD_COLORS = ["#58a6ff", "#d29922", "#3fb950", "#f85149"];

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
  // Boost respawn timers reset too.
  for (const c of _cars) {
    if (c.body && c.body.space) c.body.space = null;
  }
  _cars = [];
  _carByBody = null;

  for (const b of _boosts) {
    b.active = true;
    b.respawnTimer = 0;
    // Re-enable the sensor shape if it was disabled on pickup. The sensor
    // body stays in the space throughout — we only toggle a hidden flag for
    // rendering, so this is a no-op for shapes.
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
  tags: ["Top-Down", "Zero Gravity", "AI", "Waypoints", "Sensor", "Camera", "Race"],
  desc:
    "Top-down kart-racer — you (blue) vs. three waypoint-driven AI opponents " +
    "on a closed three-lap track. Same arcade car controller as " +
    "<code>car-topdown</code>; the new pieces are the multi-car field, the AI, " +
    "the lap sensors, and the boost pads. Use <b>↑ ↓ ← →</b> (or WASD), " +
    "<b>Space</b> to drift, <b>Shift</b> to brake. " +
    "Pick up yellow pads for a speed burst; first to three laps wins.",
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
      if (e.code === "Space") keys.handbrake = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.brake = true;
      if ([
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "Space", "ShiftLeft", "ShiftRight",
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
      if (e.code === "Space") keys.handbrake = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.brake = false;
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

    // Resolve pending interactions (boost pickups) BEFORE running car physics
    // so the impulse takes effect on this tick.
    if (_pending.boostHits.length) {
      for (const hit of _pending.boostHits) {
        const pad = _boosts[hit.boostIdx];
        if (!pad || !pad.active) continue;
        pad.active = false;
        pad.respawnTimer = BOOST_RESPAWN_FRAMES;
        try { pad.body.userData._hidden = true; pad.body.userData._hidden3d = true; } catch (_) {}
        // Apply forward impulse on the picking car
        const fwd = getForwardVec(hit.car.body);
        const mass = hit.car.body.mass;
        hit.car.body.applyImpulse(new Vec2(fwd.x * BOOST_IMPULSE * mass, fwd.y * BOOST_IMPULSE * mass));
        hit.car.ai.boostTimer = 30;
      }
      _pending.boostHits.length = 0;
    }

    // Tick boost respawns
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

    // ── Drive every car ────────────────────────────────────────────────
    for (const c of _cars) {
      const body = c.body;
      if (c.finishFrame >= 0) {
        // Finished — let the car coast / damp, no driver input. Lateral
        // friction still runs so they don't snake off into the wall.
        updateFriction(body, DT, 0, false);
        continue;
      }
      let throttle, steer, brake, handbrake;
      if (c.isPlayer) {
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

  render3dOverlay(ctx) {
    drawHUD(ctx);
    drawCountdown(ctx);
    drawFinish(ctx);
  },
};
