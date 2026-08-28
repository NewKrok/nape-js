import {
  Body, BodyType, Vec2, Circle, Polygon, Material, TriggerZone,
} from "../nape-js.esm.js?v=3.40.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.40.0";

// ─────────────────────────────────────────────────────────────────────────────
// Minigolf — top-down minigolf
//
// Zero-gravity table. Aim by dragging from the resting ball; release to launch.
// Static walls bounce the ball. Sensor "slope" zones apply a constant force
// gradient: the demo's step() does an AABB hit-test against the ball BEFORE
// space.step() and writes body.force directly, so the integrator picks up the
// force on the same step. A sensor "hole" Circle wins the hole via
// TriggerZone.onEnter. Linear drag in step() emulates green friction.
// ─────────────────────────────────────────────────────────────────────────────

const SCREEN_W = 900;
const SCREEN_H = 500;

const BALL_R = 8;
const HOLE_R = 14;
const STOP_EPS = 6;          // |v| under which the ball is considered stopped
const STOP_FRAMES = 8;       // consecutive frames below STOP_EPS to "settle"
const DRAG = 0.018;          // per-step linear drag (0 = ice, 1 = instant stop)
const MAX_PULL = 140;        // max drag distance in px
// Sink detection — the ball drops into the hole only when
//   1. the ball center is fully inside the hole rim (distance test), AND
//   2. its speed is below MAX_SINK_SPEED, AND
//   3. both conditions held for SINK_FRAMES consecutive frames.
// A fast putt blows past the hole; a slow roll-up sinks. This matches real
// minigolf where a hot ball lips out.
const MAX_SINK_SPEED = 160;
const SINK_FRAMES = 2;
const LAUNCH_POWER = 9;      // impulse = pullVec * mass * LAUNCH_POWER
const MAX_SHOT_SPEED = 900;  // clamp on launch to keep CCD happy

// Render flags used by the canvas2d/threejs/pixi renderers
const KIND_BALL = "ball";
const KIND_WALL = "wall";
const KIND_SLOPE = "slope";
const KIND_HOLE = "hole";
const KIND_FLAG = "flag";
const KIND_SPINNER = "spinner"; // kinematic rotating blade

const COLOR_BALL = 7;        // bright (renderer palette index)
const COLOR_WALL = 5;
const COLOR_SLOPE_DOWN = 2;  // greenish — gentle slope (carrier, low strength)
const COLOR_SLOPE_FAST = 3;  // orange — strong gradient (kicker)
const COLOR_HOLE = 6;
const COLOR_FLAG = 4;
const COLOR_SPINNER = 1;     // red — moving hazard

// ── Course definition ───────────────────────────────────────────────────────
// Each hole is laid out around a "region → carrier → region" idea: rect
// slopes are *carriers* that transport the ball from one chamber to another
// along a forced direction; radial slopes are *hills/wells* that can sit
// anywhere as obstacles (repeller) or finishers (attractor). The pattern
// matches real minigolf where the table tilts toward an aim and bumps act
// as terrain features.
//
// Shapes:
//   { type: "rect",   x, y, w, h, gx, gy, strength, color } — carrier slope
//   { type: "radial", x, y, r, sign, strength, color }      — hill (+1) / well (−1)
//   Spinner (kinematic):
//   { x, y, len, w, omega, color } — cross-shaped blade rotating at `omega` rad/s
const COURSE = [
  {
    // Three regions enclosed in walls:
    //   left chamber (tee) → narrow corridor (rightward slope) → right chamber
    //   The right chamber has a hill in the middle with the hole on top;
    //   the hill repels outward, so you must climb the slope just enough to
    //   stall in the dead zone at the very center — classic minigolf hill putt.
    name: "1. Conveyor",
    tee: { x: 140, y: 250 },
    hole: { x: 700, y: 250 },
    walls: [
      // All walls are sized so adjacent segments meet edge-to-edge with no
      // overlap and no gap — the corridor's top wall starts exactly where
      // the tee chamber's right edge ends, etc.
      //
      // Tee chamber — outer box x=0-260, y=120-380. Inside x=12-248, y=132-368.
      { x: 6, y: 250, w: 12, h: 260 },     // left wall
      { x: 130, y: 126, w: 236, h: 12 },   // top wall
      { x: 130, y: 374, w: 236, h: 12 },   // bottom wall
      { x: 254, y: 172.5, w: 12, h: 105 }, // right edge upper (y=120-225)
      { x: 254, y: 327.5, w: 12, h: 105 }, // right edge lower (y=275-380)
      // Corridor — narrow channel x=260-500, inside y=225-275 (50px tall)
      { x: 380, y: 219, w: 240, h: 12 }, // top wall (y=213-225)
      { x: 380, y: 281, w: 240, h: 12 }, // bottom wall (y=275-287)
      // Hole chamber — outer box x=500-892, y=54-446 (square: 392×392 outer,
      // 368×368 inside, matches the chamber's width)
      { x: 506, y: 139.5, w: 12, h: 171 }, // left edge upper (y=54-225)
      { x: 506, y: 360.5, w: 12, h: 171 }, // left edge lower (y=275-446)
      { x: 886, y: 250, w: 12, h: 392 },   // right wall (y=54-446)
      { x: 696, y: 60, w: 392, h: 12 },    // top wall (y=54-66)
      { x: 696, y: 440, w: 392, h: 12 },   // bottom wall (y=434-446)
    ],
    slopes: [
      // Carrier in the corridor — pushes the ball rightward into the chamber
      { type: "rect", x: 386, y: 250, w: 240, h: 50, gx: 1, gy: 0, strength: 220, color: COLOR_SLOPE_DOWN },
      // The HILL in the right chamber — repels outward. The hole sits at
      // dead-center where the gradient force vanishes (k = d/r → 0 at d=0).
      // A ball arriving with the right speed climbs the hill and parks on
      // top; too fast and it rolls over; too slow and it can't reach.
      { type: "radial", x: 700, y: 250, r: 120, sign: 1, strength: 260, color: COLOR_SLOPE_FAST },
    ],
    spinners: [],
  },
  {
    // L-shaped course: tee chamber (bottom-left) → horizontal corridor with
    // a windmill in it → vertical hole chamber (right side, tall). The
    // corridor enters the hole chamber at the BOTTOM, so the ball must
    // travel up to reach the hole near the top. The hole chamber has no
    // carrier — only the hole-attractor pulls the ball up, so a slow putt
    // doesn't make it; you need enough power to push through the windmill
    // AND climb up to the hole.
    //
    // Walls are sized so adjacent segments share an edge with NO gap (in
    // the earlier version the tee chamber's right gate didn't touch the
    // corridor's left edge, letting the ball escape).
    name: "2. Windmill",
    tee: { x: 140, y: 380 },
    hole: { x: 700, y: 150 },
    walls: [
      // Adjacent walls overlap by 12×12 at every corner — same approach as
      // Hole 1 — so each L-joint is fully sealed (no T-joint visual gap).
      // The chamber edge segments extend INTO the corridor wall thickness
      // (y=334-346 above, y=414-426 below) instead of stopping at the
      // corridor's inner face.
      //
      // Tee chamber — outer x=54-246, y=296-464 (192×168 box)
      { x: 60, y: 380, w: 12, h: 168 },  // left wall
      { x: 150, y: 302, w: 192, h: 12 }, // top wall
      { x: 150, y: 458, w: 192, h: 12 }, // bottom wall
      { x: 240, y: 321, w: 12, h: 50 },  // right edge upper (y=296-346, overlaps corridor top)
      { x: 240, y: 439, w: 12, h: 50 },  // right edge lower (y=414-464, overlaps corridor bottom)
      // Corridor — between chambers, inside y=346-414. The top/bottom
      // walls extend slightly INTO each chamber's edge segment (12px on
      // each side) so the corners overlap 12×12 — same trick as Hole 1's
      // corridor-to-chamber joints.
      { x: 393, y: 340, w: 318, h: 12 }, // top wall (x=234-552, y=334-346)
      { x: 393, y: 420, w: 318, h: 12 }, // bottom wall (x=234-552, y=414-426)
      // Hole chamber — outer x=540-870, y=36-464 (tall 330×428 box)
      { x: 546, y: 191, w: 12, h: 310 }, // left wall upper (y=36-346, overlaps corridor top)
      { x: 546, y: 439, w: 12, h: 50 },  // left wall lower (y=414-464, overlaps corridor bottom)
      { x: 705, y: 42, w: 330, h: 12 },  // top wall
      { x: 705, y: 458, w: 330, h: 12 }, // bottom wall
      { x: 864, y: 250, w: 12, h: 428 }, // right wall
    ],
    slopes: [
      // Corridor carrier — pushes the ball rightward through the windmill
      // toward the hole chamber
      { type: "rect", x: 393, y: 380, w: 294, h: 70, gx: 1, gy: 0, strength: 220, color: COLOR_SLOPE_DOWN },
      // Hole-chamber up-carrier — a vertical rect slope ONLY in the lower
      // half of the chamber (y=260-450). Lifts the ball off the corridor
      // entry floor; once it's above y=260, no more force acts on it, so
      // it coasts to the hole on inertia + drag. Tune strength so a clean
      // corridor putt loses enough energy by the time it reaches the hole
      // to actually sink rather than blowing past.
      { type: "rect", x: 705, y: 380, w: 306, h: 132, gx: 0, gy: -1, strength: 200, color: COLOR_SLOPE_DOWN },
    ],
    spinners: [
      // Single blade in the corridor — must be timed to slip past. The bar
      // is ~75% of the corridor height when horizontal, so it forces a real
      // timing decision; faster omega makes the window narrower.
      { x: 393, y: 380, len: 30, w: 10, omega: 2.4, color: COLOR_SPINNER, kind: "bar" },
    ],
  },
  {
    // L+1 chain of 4 enclosed regions:
    //   T1 (tee, bottom-left) → T2 (horizontal corridor, bottom-middle, with
    //   a bar-spinner) → T3 (vertical corridor, right side, with a cross-
    //   spinner) → T4 (hole chamber, top, hole on the far left)
    //
    // Walls overlap 12×12 at every L-joint just like Hole 1/2.
    //
    // No radial slopes anywhere. T1 has no slope under the tee (ball stays
    // put); T4 has no slope either (momentum from T3 carries the ball into
    // the cup). Only T2 (rightward) and T3 (upward) are powered by rect
    // carriers.
    name: "3. Detour",
    tee: { x: 140, y: 380 },
    hole: { x: 320, y: 150 },
    walls: [
      // ── T1 tee chamber — outer x=20-260, y=280-450 ────────────────────
      { x: 26, y: 365, w: 12, h: 170 },  // left wall
      { x: 140, y: 286, w: 240, h: 12 }, // top wall
      { x: 140, y: 444, w: 240, h: 12 }, // bottom wall
      { x: 254, y: 306, w: 12, h: 52 },  // right upper (y=280-332, overlaps T2 top)
      { x: 254, y: 439, w: 12, h: 22 },  // right lower (y=428-450, overlaps T2 bottom)

      // ── T2 horizontal corridor — outer x=260-560, y=320-440 ──────────
      // Top/bottom walls extend 12px into T1 (left) and T3 (right) for
      // 12×12 corner overlaps.
      { x: 410, y: 326, w: 324, h: 12 }, // top wall (x=248-572, y=320-332)
      { x: 410, y: 434, w: 324, h: 12 }, // bottom wall (x=248-572, y=428-440)

      // ── T3 vertical corridor — outer x=560-740, y=80-440 ──────────────
      // Left wall covers only y=208-332 (above the T2 opening); the gap
      // y=332-428 is where the ball enters from T2.
      { x: 566, y: 270, w: 12, h: 124 }, // left wall (y=208-332)
      { x: 650, y: 434, w: 180, h: 12 }, // bottom wall (x=560-740, y=428-440)

      // ── T4 hole chamber — outer x=260-740, y=80-220 ───────────────────
      // T4 right wall is fused with T3 right wall into one tall segment
      // covering y=80-440 (no visual seam between the two chambers).
      { x: 500, y: 86, w: 480, h: 12 },  // top wall
      { x: 266, y: 150, w: 12, h: 140 }, // left wall
      { x: 416, y: 214, w: 324, h: 12 }, // bottom-left wall (x=254-578) — T3 opens at x=572-728
      { x: 734, y: 260, w: 12, h: 360 }, // fused right wall (T4+T3 right, y=80-440)
    ],
    slopes: [
      // T2 — rightward carrier through the horizontal corridor + bar spinner
      { type: "rect", x: 410, y: 380, w: 300, h: 96, gx: 1, gy: 0, strength: 220, color: COLOR_SLOPE_DOWN },
      // T3 — upward carrier through the vertical corridor. Stops at y=220
      // (just below the T4 floor) so the ball coasts into T4 on momentum.
      // T4 itself has NO slope — the ball reaches the hole on inertia + the
      // chamber walls, dropping straight in if the speed is right.
      { type: "rect", x: 650, y: 330, w: 156, h: 220, gx: 0, gy: -1, strength: 220, color: COLOR_SLOPE_FAST },
    ],
    spinners: [
      // T2 horizontal corridor — single bar (90° on/off blocker)
      { x: 410, y: 380, len: 30, w: 8, omega: 2.0, color: COLOR_SPINNER, kind: "bar" },
      // T3 vertical corridor — cross blade always blocks one axis
      { x: 650, y: 260, len: 28, w: 8, omega: -1.6, color: COLOR_SPINNER, kind: "cross" },
    ],
  },
];


// ── Module-level state (reset in setup) ─────────────────────────────────────
let _space = null;
let _ball = null;
let _ballMass = 1;
let _holeBody = null;
let _holeTrigger = null;
let _holeFlagBody = null;
let _slopeZones = [];   // [{ trigger, body, gx, gy, strength }]
let _slopeBodies = [];  // sensor bodies (for hit-testing)
let _spinners = [];     // [{ body, len, w }] — kinematic bodies, rotation handled by engine
let _stopFrameCount = 0;
let _settled = true;
let _aiming = false;
let _aimX = 0;
let _aimY = 0;
let _holeIdx = 0;
let _justSank = false;
let _winText = "";
let _sinkCooldown = 0; // frames before we accept input again after sinking
let _holeContactFrames = 0; // consecutive frames the ball met the sink conditions

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeWall(space, cx, cy, w, h, rot = 0) {
  const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
  body.shapes.add(new Polygon(Polygon.box(w, h)));
  body.rotation = rot;
  body.userData._kind = KIND_WALL;
  body.userData._colorIdx = COLOR_WALL;
  body.space = space;
  return body;
}

// We don't drive slope forces from TriggerZone.onStay — onStay fires *during*
// the sensor phase of space.step(), after the integrator has already consumed
// body.force, so the force lags one step. Instead, the demo's step()
// (which runs BEFORE space.step) hit-tests the ball against each zone and
// writes body.force directly. The integrator sees the right force immediately.
function makeRectSlope(space, cx, cy, w, h, gx, gy, strength, colorIdx) {
  const mag = Math.hypot(gx, gy) || 1;
  const nx = gx / mag, ny = gy / mag;

  const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const shape = new Polygon(Polygon.box(w, h));
  shape.sensorEnabled = true;
  body.shapes.add(shape);
  body.userData._kind = KIND_SLOPE;
  body.userData._colorIdx = colorIdx;
  body.userData._slopeType = "rect";
  body.userData._slopeW = w;
  body.userData._slopeH = h;
  body.userData._gx = nx;
  body.userData._gy = ny;
  body.userData._strength = strength;
  body.space = space;

  const halfW = w / 2, halfH = h / 2;
  _slopeZones.push({
    kind: "rect",
    body, cx, cy, gx: nx, gy: ny, strength, colorIdx,
    aabb: { x0: cx - halfW, y0: cy - halfH, x1: cx + halfW, y1: cy + halfH },
    w, h,
  });
  _slopeBodies.push(body);
}

function makeRadialSlope(space, cx, cy, r, sign, strength, colorIdx) {
  const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const shape = new Circle(r);
  shape.sensorEnabled = true;
  body.shapes.add(shape);
  body.userData._kind = KIND_SLOPE;
  body.userData._colorIdx = colorIdx;
  body.userData._slopeType = "radial";
  body.userData._slopeR = r;
  body.userData._sign = sign;
  body.userData._strength = strength;
  body.space = space;

  _slopeZones.push({
    kind: "radial",
    body, cx, cy, r, sign, strength, colorIdx,
  });
  _slopeBodies.push(body);
}

function makeSpinner(space, cx, cy, len, w, omega, colorIdx, kind = "bar") {
  // Kinematic blade: rotates forever via a fixed angularVel — no constraint
  // needed. The ball treats it as a moving wall and bounces off it.
  //   kind "bar"   — single bar (90° windmill: open when perpendicular to traffic)
  //   kind "cross" — two perpendicular bars (always blocking somewhere)
  const body = new Body(BodyType.KINEMATIC, new Vec2(cx, cy));
  body.shapes.add(new Polygon(Polygon.box(len * 2, w)));
  if (kind === "cross") {
    body.shapes.add(new Polygon(Polygon.box(w, len * 2)));
  }
  body.userData._kind = KIND_SPINNER;
  body.userData._colorIdx = colorIdx;
  body.userData._spinnerKind = kind;
  body.angularVel = omega;
  body.space = space;
  _spinners.push({ body, len, w, kind });
}

function makeHole(space, cx, cy) {
  // The hole stays a sensor body so the renderers still draw it, but we
  // don't rely on a TriggerZone callback to detect the sink — BEGIN fires
  // even when the ball is just clipping the rim at high speed. Instead,
  // step() runs a combined distance + velocity + dwell test (see SINK_FRAMES).
  const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const s = new Circle(HOLE_R);
  s.sensorEnabled = true;
  body.shapes.add(s);
  body.userData._kind = KIND_HOLE;
  body.userData._colorIdx = COLOR_HOLE;
  body.userData._holeR = HOLE_R;
  body.space = space;
  _holeBody = body;
  _holeTrigger = null;
}

function makeFlag(space, cx, cy) {
  // Visual-only marker next to the hole. Tiny static circle, no collision
  // (sensor) so the ball doesn't deflect off it — the look-and-feel is the
  // hole + a flag pole rendered on top.
  const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const s = new Circle(2);
  s.sensorEnabled = true;
  body.shapes.add(s);
  body.userData._kind = KIND_FLAG;
  body.userData._colorIdx = COLOR_FLAG;
  body.userData._hidden = true; // skip on canvas2d body draw — we draw the flag in overlay
  body.userData._hidden3d = true;
  body.space = space;
  _holeFlagBody = body;
}

function spawnBall(space, x, y) {
  // Material(elasticity=0.3, dynamicFriction=0.6, staticFriction=0.8, density=1)
  const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  ball.shapes.add(new Circle(BALL_R, undefined, new Material(0.3, 0.6, 0.8, 1.0)));
  ball.allowRotation = true;
  ball.isBullet = true; // CCD — short fast putts shouldn't tunnel
  ball.userData._kind = KIND_BALL;
  ball.userData._colorIdx = COLOR_BALL;
  ball.userData._ballR = BALL_R;
  ball.space = space;
  _ballMass = ball.mass;
  return ball;
}

function clearCourse(space) {
  // Remove every body except the outer walls created by walls:true
  _slopeZones = [];
  _slopeBodies = [];
  _spinners = [];
  if (_holeTrigger) _holeTrigger.dispose();
  _holeTrigger = null;

  const toRemove = [];
  for (const body of space.bodies) {
    const k = body.userData._kind;
    if (k === KIND_WALL || k === KIND_SLOPE || k === KIND_HOLE ||
        k === KIND_FLAG || k === KIND_BALL || k === KIND_SPINNER) {
      toRemove.push(body);
    }
  }
  for (const b of toRemove) b.space = null;

  _ball = null;
  _holeBody = null;
  _holeFlagBody = null;
}

function loadHole(space, idx) {
  clearCourse(space);
  const hole = COURSE[idx];

  // Walls
  for (const w of hole.walls) makeWall(space, w.x, w.y, w.w, w.h, w.rot || 0);

  // Slope zones
  for (const s of hole.slopes) {
    if (s.type === "radial") {
      makeRadialSlope(space, s.x, s.y, s.r, s.sign, s.strength, s.color);
    } else {
      makeRectSlope(space, s.x, s.y, s.w, s.h, s.gx, s.gy, s.strength, s.color);
    }
  }

  // Spinners (kinematic blades)
  if (hole.spinners) {
    for (const sp of hole.spinners) {
      makeSpinner(space, sp.x, sp.y, sp.len, sp.w, sp.omega, sp.color, sp.kind);
    }
  }

  // Hole + flag marker
  makeHole(space, hole.hole.x, hole.hole.y);
  makeFlag(space, hole.hole.x + 18, hole.hole.y - 22);

  // Ball at tee
  _ball = spawnBall(space, hole.tee.x, hole.tee.y);
  _stopFrameCount = 0;
  _settled = true;
  _aiming = false;
  _justSank = false;
  _sinkCooldown = 0;
  _holeContactFrames = 0;
}

// Ball helpers ---------------------------------------------------------------
function ballSpeed() {
  if (!_ball) return 0;
  const v = _ball.velocity;
  return Math.hypot(v.x, v.y);
}

function isPointNearBall(x, y) {
  if (!_ball) return false;
  const dx = x - _ball.position.x;
  const dy = y - _ball.position.y;
  return dx * dx + dy * dy <= (BALL_R * 4) * (BALL_R * 4);
}

// ── Demo definition ─────────────────────────────────────────────────────────
export default {
  id: "minigolf",
  label: "Minigolf",
  tags: ["Sensor", "Material", "TriggerZone", "Drag", "TopDown"],
  featured: false,
  desc:
    "Top-down minigolf — zero-gravity table, <b>drag</b> from the ball to aim, <b>release</b> to putt. " +
    "Slope zones (sensor-driven force fields) curve your shot; the hole is a <code>TriggerZone</code> sensor. " +
    "Press <b>R</b> to retry the hole.",
  walls: true,
  workerCompatible: false,

  setup(space, W, H) {
    _space = space;
    space.gravity = new Vec2(0, 0);
    _holeIdx = 0;
    _winText = "";
    _slopeZones = [];
    _slopeBodies = [];
    loadHole(space, 0);

    // Keyboard: R to retry the current hole
    if (typeof window !== "undefined") {
      const onKey = (e) => {
        if (e.key === "r" || e.key === "R") loadHole(_space, _holeIdx);
      };
      window.addEventListener("keydown", onKey);
      this._teardownKey = () => window.removeEventListener("keydown", onKey);
    }
  },

  teardown() {
    if (this._teardownKey) this._teardownKey();
    this._teardownKey = null;
  },

  step(space) {
    if (!_ball) return;

    // Slope zones — apply force per frame BEFORE space.step() so the
    // integrator sees it on this step (not the next). body.force persists
    // across steps, so we always start by clearing, then add a contribution
    // for every zone the ball is currently inside.
    let fx = 0, fy = 0;
    const bx = _ball.position.x, by = _ball.position.y;
    for (let i = 0; i < _slopeZones.length; i++) {
      const z = _slopeZones[i];
      if (z.kind === "rect") {
        const a = z.aabb;
        if (bx >= a.x0 && bx <= a.x1 && by >= a.y0 && by <= a.y1) {
          fx += z.gx * z.strength * _ballMass;
          fy += z.gy * z.strength * _ballMass;
        }
      } else {
        // radial: direction = (ball - center) * sign; magnitude falls off
        // linearly with distance so the force is strongest at the rim and
        // weakest near the center (avoids unbounded acceleration at r→0).
        const dx = bx - z.cx;
        const dy = by - z.cy;
        const d = Math.hypot(dx, dy);
        if (d < z.r && d > 0.5) {
          const ux = dx / d, uy = dy / d;
          // falloff: 1.0 at the rim, 0.0 at the center
          const k = d / z.r;
          const f = z.strength * k * z.sign * _ballMass;
          fx += ux * f;
          fy += uy * f;
        }
      }
    }
    _ball.force = new Vec2(fx, fy);

    // Apply linear drag — emulates green friction without modulating Material.
    if (DRAG > 0) {
      const v = _ball.velocity;
      _ball.velocity = new Vec2(v.x * (1 - DRAG), v.y * (1 - DRAG));
      _ball.angularVel *= 1 - DRAG;
    }

    // Settle detection — when the ball has been slow for STOP_FRAMES it
    // becomes "ready" for the next shot.
    if (ballSpeed() < STOP_EPS) {
      _stopFrameCount++;
      if (_stopFrameCount >= STOP_FRAMES) {
        _ball.velocity = new Vec2(0, 0);
        _ball.angularVel = 0;
        _settled = true;
      }
    } else {
      _stopFrameCount = 0;
      _settled = false;
    }

    // Sink test — only sink if (a) the ball center is fully inside the hole
    // rim and (b) the ball is slow enough not to fly past it. The trigger
    // must hold for SINK_FRAMES consecutive frames so a fast putt that
    // briefly clips the rim doesn't drop.
    if (!_justSank && _holeBody) {
      const hdx = _ball.position.x - _holeBody.position.x;
      const hdy = _ball.position.y - _holeBody.position.y;
      const hdist = Math.hypot(hdx, hdy);
      // "fully inside" — the ball's center must clear the rim by its radius
      const insideRim = hdist <= HOLE_R - BALL_R * 0.5;
      const slowEnough = ballSpeed() < MAX_SINK_SPEED;
      if (insideRim && slowEnough) {
        _holeContactFrames++;
        if (_holeContactFrames >= SINK_FRAMES) {
          _justSank = true;
          // Snap the ball to the hole center for a clean visual "drop"
          _ball.position = new Vec2(_holeBody.position.x, _holeBody.position.y);
          _ball.velocity = new Vec2(0, 0);
          _ball.angularVel = 0;
        }
      } else {
        _holeContactFrames = 0;
      }
    }

    // Sink → advance to the next hole (small grace period so the win text is
    // visible and the trigger doesn't fire mid-rebuild).
    if (_justSank) {
      _sinkCooldown++;
      if (_sinkCooldown > 30) {
        _holeIdx++;
        if (_holeIdx >= COURSE.length) {
          _winText = "Course complete!";
          _holeIdx = 0;
        }
        loadHole(_space, _holeIdx);
      }
    }
  },

  click(x, y) {
    if (!_ball || _justSank || _sinkCooldown > 0) return;
    if (!_settled) return; // only aim from a stopped ball
    if (!isPointNearBall(x, y)) return;
    _aiming = true;
    _aimX = x;
    _aimY = y;
  },

  drag(x, y) {
    if (!_aiming) return;
    const dx = x - _ball.position.x;
    const dy = y - _ball.position.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_PULL) {
      _aimX = _ball.position.x + (dx / d) * MAX_PULL;
      _aimY = _ball.position.y + (dy / d) * MAX_PULL;
    } else {
      _aimX = x;
      _aimY = y;
    }
  },

  release() {
    if (!_aiming || !_ball) return;
    _aiming = false;
    // Direction = from cursor back to ball (pull-back style)
    const dx = _ball.position.x - _aimX;
    const dy = _ball.position.y - _aimY;
    const d = Math.hypot(dx, dy);
    if (d < 6) return; // tap — no shot
    const power = Math.min(d, MAX_PULL) * LAUNCH_POWER;
    const ux = dx / d, uy = dy / d;
    let vx = ux * power, vy = uy * power;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SHOT_SPEED) {
      const k = MAX_SHOT_SPEED / speed;
      vx *= k; vy *= k;
    }
    _ball.applyImpulse(new Vec2(vx * _ballMass, vy * _ballMass));
    _settled = false;
    _stopFrameCount = 0;
  },

  // ── Canvas2D rendering ────────────────────────────────────────────────────
  render(ctx, space, W, H, showOutlines) {
    ctx.clearRect(0, 0, W, H);

    // Green felt background — drawn behind everything else
    ctx.save();
    ctx.fillStyle = "#0c2c1a";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    drawGrid(ctx, W, H);

    // Slope zone fills + outlines (canvas2d only — threejs/pixi render the
    // sensor body itself as a translucent shape). Arrows go in the overlay
    // step below so all three renderers show the gradient direction.
    drawSlopeFills(ctx);

    // Hole + flag — drawn before bodies so the ball sits on top visually
    drawHoleAndFlag(ctx);

    // Walls + ball (skip slope/hole/flag — they have custom overlays)
    for (const body of space.bodies) {
      const k = body.userData._kind;
      if (k === KIND_SLOPE || k === KIND_HOLE || k === KIND_FLAG) continue;
      drawBody(ctx, body, showOutlines);
    }

    // Gradient arrows, aim line, HUD (shared with threejs/pixi overlay)
    drawSlopeArrows(ctx);
    drawAimOverlay(ctx);
    drawHud(ctx, W, H);
  },

  // Threejs / PixiJS share an overlay for the HUD + aim arrows + slope
  // gradient arrows. Bodies (walls, sensor zones, hole, ball) are rendered
  // by the adapters via the `_colorIdx` / `_hidden` / `_kind` flags.
  render3dOverlay(ctx, space, W, H) {
    drawSlopeArrows(ctx);
    drawAimOverlay(ctx);
    drawHud(ctx, W, H);
  },

  // hover must exist so the runner keeps calling render3dOverlay each frame
  hover() {},
};

// ── Drawing helpers (module-level so render & render3dOverlay can share) ────
function drawArrow(ctx, x1, y1, x2, y2, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  const head = 8;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - ux * head, y2 - uy * head);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * head - uy * head * 0.5, y2 - uy * head + ux * head * 0.5);
  ctx.lineTo(x2 - ux * head + uy * head * 0.5, y2 - uy * head - ux * head * 0.5);
  ctx.closePath();
  ctx.fill();
}

function slopeStrokeColor(colorIdx) {
  return colorIdx === COLOR_SLOPE_FAST ? "#ffa83c" : "#50c878";
}
function slopeFillColor(colorIdx) {
  return colorIdx === COLOR_SLOPE_FAST
    ? "rgba(255,165,60,0.18)"
    : "rgba(80,200,120,0.18)";
}

function drawSlopeFills(ctx) {
  for (const z of _slopeZones) {
    const fill = slopeFillColor(z.colorIdx);
    const stroke = slopeStrokeColor(z.colorIdx);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    if (z.kind === "rect") {
      ctx.fillRect(z.cx - z.w / 2, z.cy - z.h / 2, z.w, z.h);
      ctx.strokeRect(z.cx - z.w / 2, z.cy - z.h / 2, z.w, z.h);
    } else {
      ctx.beginPath();
      ctx.arc(z.cx, z.cy, z.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawSlopeArrows(ctx) {
  for (const z of _slopeZones) {
    const stroke = slopeStrokeColor(z.colorIdx);
    if (z.kind === "rect") {
      const len = Math.min(z.w, z.h) * 0.4;
      drawArrow(ctx,
        z.cx - z.gx * len * 0.5, z.cy - z.gy * len * 0.5,
        z.cx + z.gx * len * 0.5, z.cy + z.gy * len * 0.5,
        stroke);
    } else {
      // Radial — draw 4 short arrows at cardinal points; sign controls direction
      const inner = z.r * 0.35;
      const outer = z.r * 0.8;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const ux = Math.cos(a), uy = Math.sin(a);
        if (z.sign > 0) {
          // Push outward
          drawArrow(ctx,
            z.cx + ux * inner, z.cy + uy * inner,
            z.cx + ux * outer, z.cy + uy * outer,
            stroke);
        } else {
          // Pull inward
          drawArrow(ctx,
            z.cx + ux * outer, z.cy + uy * outer,
            z.cx + ux * inner, z.cy + uy * inner,
            stroke);
        }
      }
    }
  }
}

function drawHoleAndFlag(ctx) {
  if (!_holeBody) return;
  const hx = _holeBody.position.x;
  const hy = _holeBody.position.y;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(hx, hy, HOLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9be9a8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(hx, hy, HOLE_R + 2, 0, Math.PI * 2);
  ctx.stroke();

  // Flag — vertical pole + triangular cloth
  const fx = hx + 14;
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(fx, hy);
  ctx.lineTo(fx, hy - 36);
  ctx.stroke();
  ctx.fillStyle = "#f85149";
  ctx.beginPath();
  ctx.moveTo(fx, hy - 36);
  ctx.lineTo(fx + 14, hy - 31);
  ctx.lineTo(fx, hy - 26);
  ctx.closePath();
  ctx.fill();
}

function drawAimOverlay(ctx) {
  if (!_aiming || !_ball) return;
  const bx = _ball.position.x, by = _ball.position.y;
  const dx = bx - _aimX, dy = by - _aimY;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const power = Math.min(d / MAX_PULL, 1);
  const ux = dx / d, uy = dy / d;

  // Backward shaft (drag line)
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(_aimX, _aimY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Forward indicator (where the ball will go)
  const aimLen = power * MAX_PULL;
  drawArrow(ctx, bx, by, bx + ux * aimLen, by + uy * aimLen,
            power > 0.7 ? "#f85149" : "#3fb950");
}

function drawHud(ctx, W) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, 28);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  const hole = COURSE[_holeIdx];
  ctx.fillText(`${hole.name}   (${_holeIdx + 1} / ${COURSE.length})`, 10, 19);

  if (_winText) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(W / 2 - 200, 36, 400, 28);
    ctx.fillStyle = "#9be9a8";
    ctx.textAlign = "center";
    ctx.fillText(_winText, W / 2, 55);
  } else if (_justSank) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(W / 2 - 90, 36, 180, 28);
    ctx.fillStyle = "#9be9a8";
    ctx.textAlign = "center";
    ctx.fillText("Hole in! →", W / 2, 55);
  } else if (_settled && !_aiming) {
    ctx.fillStyle = "#9da7b3";
    ctx.textAlign = "center";
    ctx.fillText("drag the ball to aim — R to retry", W / 2, 19);
  }
  ctx.restore();
}
