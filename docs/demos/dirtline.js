import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  SpringJoint, LineJoint, MotorJoint, PivotJoint, AngleJoint, WeldJoint,
} from "../nape-js.esm.js";

// Dirtline — a side-view hill-climb / trials motorbike with an articulated
// ragdoll rider. A deliberately richer sibling of `car-sideview.js`: the bike
// has MotorJoint-driven wheels on SpringJoint suspension, and the rider is a
// PivotJoint+AngleJoint ragdoll WELDED to the chassis at the pelvis. As you
// pitch the bike (lean keys apply chassis torque) the welded pelvis drags the
// torso, so the rider visibly sways forward/back within its AngleJoint range.
// Flip the bike past a threshold (or smack the ground hard) and the seat weld
// breaks away — the rider detaches and ragdolls free off the back.
//
// Renderer-agnostic: the default body draw handles every part across
// canvas2d / threejs / pixi; `render3dOverlay` paints the springs + HUD on top.
// CodePen-safe: no imports inside setup/step, no module-level W/H — the screen
// dims come from SCREEN_W / SCREEN_H.

const SCREEN_W = 900;
const SCREEN_H = 500;

// ── World / terrain ─────────────────────────────────────────────────────────
const WORLD_W = 6000;
const SEG_W = 40;               // terrain sample spacing
const GRAVITY = 1100;

// Rolling hills are a sum of sines — same trick as car-sideview but longer and
// a touch tamer so the bike can actually climb. groundY is the baseline.
function terrainY(x, groundY) {
  return groundY
    + Math.sin(x * 0.0016) * 110   // long sweeping hills
    + Math.sin(x * 0.006) * 38     // medium rollers
    + Math.sin(x * 0.02) * 10      // small chatter
    + Math.sin(x * 0.045) * 4;     // fine bumps
}

// Build the terrain as a chain of static Polygon quads from each surface pair
// down to a flat skirt. NO explicit Material on the terrain — the known
// "Polygon + explicit Material → tunneling" bug bites static floors too, so we
// take engine defaults here and tune grip via the wheel materials instead.
function buildTerrain(space, groundY) {
  const numSegs = Math.ceil(WORLD_W / SEG_W);
  const bottom = groundY + 260;
  for (let i = 0; i < numSegs; i++) {
    const x0 = i * SEG_W;
    const x1 = x0 + SEG_W;
    const y0 = terrainY(x0, groundY);
    const y1 = terrainY(x1, groundY);
    const seg = new Body(BodyType.STATIC);
    seg.shapes.add(new Polygon([
      new Vec2(x0, y0),
      new Vec2(x1, y1),
      new Vec2(x1, bottom),
      new Vec2(x0, bottom),
    ]));
    try { seg.userData._colorIdx = 5; } catch (_) {}
    seg.space = space;
  }
}

// ── Bike tuning ─────────────────────────────────────────────────────────────
const WHEEL_R = 22;
const WHEEL_BASE = 52;          // half the axle-to-axle distance
const CHASSIS_H = 14;
const SUSP_REST = 34;           // spring rest length (chassis → wheel)
const SUSP_FREQ = 3.0;
const SUSP_DAMP = 0.5;
const SUSP_MIN = -8;            // LineJoint travel limits
const SUSP_MAX = 30;
const MOTOR_RATE = 26;          // rear-wheel motor angular rate
const LEAN_TORQUE = 9;          // chassis lean angular impulse per frame

// Flip / crash detection. If the chassis tilts past FLIP_ANGLE for
// FLIP_FRAMES consecutive steps, or takes a hard vertical impact, the rider's
// seat weld breaks away.
const FLIP_ANGLE = 2.2;         // radians from upright (~126°)
const FLIP_FRAMES = 18;         // ~0.3s sustained before bail
const CRASH_IMPACT_SPEED = 720; // downward speed that counts as a hard smack

// ── Module state ────────────────────────────────────────────────────────────
let _space = null;
let _chassis = null;
let _fWheel = null;
let _rWheel = null;
let _rMotor = null;
let _fSusp = null;
let _rSusp = null;

// Rider rig — the welded ragdoll. `_seatWeld` is the break-away joint; the rest
// are the articulation. `_riderParts` / `_riderJoints` are kept for teardown.
let _rider = null;            // { pelvis, torso, head, ... } refs for drawing
let _seatWeld = null;
let _riderParts = [];
let _riderJoints = [];
let _crashed = false;
let _flipFrames = 0;
let _maxDist = 0;             // furthest the bike has travelled (for HUD)
let _frame = 0;
let _stepped = false;        // set true each physics step; gates camera lerp

const keys = {};
let _onKeyDown = null;
let _onKeyUp = null;

// Spawn anchor — recomputed on reset so the bike always lands on the surface.
let _spawnX = 220;
let _spawnGroundY = 0;

// ── Rider ragdoll ───────────────────────────────────────────────────────────
// A compact seated ragdoll. The pelvis is the root: it gets WELDED to the
// chassis seat so the bike's lean transmits through. Every other joint is a
// PivotJoint (the physical hinge) plus a soft AngleJoint (the spring that gives
// the limb a rest pose + a sway range). The torso's AngleJoint window is the
// "lean transmission" — when the welded pelvis pitches with the bike, the
// torso sways forward/back inside that window.
function buildRider(space, seatX, seatY) {
  _riderParts = [];
  _riderJoints = [];

  const add = (body) => { _riderParts.push(body); return body; };
  const joint = (j) => { j.space = space; _riderJoints.push(j); return j; };

  // Soft angle hinge helper — rest pose with a sway range and a gentle spring.
  const hinge = (a, b, anchorA, anchorB, min, max, freq = 7, damp = 0.7) => {
    joint(new PivotJoint(a, b, anchorA, anchorB));
    const ang = new AngleJoint(a, b, min, max);
    ang.stiff = false;
    ang.frequency = freq;
    ang.damping = damp;
    return joint(ang);
  };

  // Pelvis — the root the bike weld attaches to.
  const pelvis = add(new Body(BodyType.DYNAMIC, new Vec2(seatX, seatY)));
  pelvis.shapes.add(new Polygon(Polygon.box(20, 14), new Material(0.1, 0.4, 0.5, 0.6)));
  try { pelvis.userData._colorIdx = 1; } catch (_) {}
  pelvis.space = space;

  // Torso — leans with the bike. Its AngleJoint window IS the lean transmission.
  const torso = add(new Body(BodyType.DYNAMIC, new Vec2(seatX, seatY - 24)));
  torso.shapes.add(new Polygon(Polygon.box(16, 34), new Material(0.1, 0.4, 0.5, 0.5)));
  try { torso.userData._colorIdx = 1; } catch (_) {}
  torso.space = space;
  hinge(pelvis, torso, new Vec2(0, -7), new Vec2(0, 17), -0.9, 0.9, 6, 0.5);

  // Head.
  const head = add(new Body(BodyType.DYNAMIC, new Vec2(seatX, seatY - 50)));
  head.shapes.add(new Circle(9, undefined, new Material(0.1, 0.4, 0.5, 0.5)));
  try { head.userData._colorIdx = 1; } catch (_) {}
  head.space = space;
  hinge(torso, head, new Vec2(0, -17), new Vec2(0, 9), -0.5, 0.5, 8, 0.7);

  // Arms — both reach forward toward the bars (handlebar offset is ahead of
  // the seat). Narrow ranges so they stay roughly on the grips while seated.
  const armLen = 18, armW = 6;
  const buildArm = (sx) => {
    const upper = add(new Body(BodyType.DYNAMIC, new Vec2(seatX + sx, seatY - 16)));
    upper.shapes.add(new Polygon(Polygon.box(armLen, armW), new Material(0.1, 0.4, 0.5, 0.4)));
    try { upper.userData._colorIdx = 2; } catch (_) {}
    upper.space = space;
    hinge(torso, upper, new Vec2(sx > 0 ? 8 : -8, -10), new Vec2(sx > 0 ? -9 : 9, 0), -1.2, 1.2, 5, 0.5);

    const lower = add(new Body(BodyType.DYNAMIC, new Vec2(seatX + sx + (sx > 0 ? armLen : -armLen), seatY - 16)));
    lower.shapes.add(new Polygon(Polygon.box(armLen, armW), new Material(0.1, 0.4, 0.5, 0.4)));
    try { lower.userData._colorIdx = 2; } catch (_) {}
    lower.space = space;
    hinge(upper, lower, new Vec2(sx > 0 ? 9 : -9, 0), new Vec2(sx > 0 ? -9 : 9, 0), -1.0, 1.0, 5, 0.5);
    return { upper, lower };
  };
  const lArm = buildArm(-2);
  const rArm = buildArm(2);

  // Legs — bent at the knee in a seated/pegged pose; thighs forward, shins down.
  const thighLen = 22, shinLen = 22, legW = 8;
  const buildLeg = (sx) => {
    const thigh = add(new Body(BodyType.DYNAMIC, new Vec2(seatX + sx + 10, seatY + 4)));
    thigh.shapes.add(new Polygon(Polygon.box(thighLen, legW), new Material(0.1, 0.4, 0.5, 0.5)));
    try { thigh.userData._colorIdx = 2; } catch (_) {}
    thigh.space = space;
    hinge(pelvis, thigh, new Vec2(sx, 5), new Vec2(-10, 0), -0.6, 0.6, 5, 0.5);

    const shin = add(new Body(BodyType.DYNAMIC, new Vec2(seatX + sx + 22, seatY + 18)));
    shin.shapes.add(new Polygon(Polygon.box(legW, shinLen), new Material(0.1, 0.4, 0.5, 0.5)));
    try { shin.userData._colorIdx = 2; } catch (_) {}
    shin.space = space;
    hinge(thigh, shin, new Vec2(10, 0), new Vec2(0, -10), -0.4, 0.8, 5, 0.5);
    return { thigh, shin };
  };
  const lLeg = buildLeg(-2);
  const rLeg = buildLeg(2);

  _rider = { pelvis, torso, head, lArm, rArm, lLeg, rLeg };
  return pelvis;
}

// ── Bike ────────────────────────────────────────────────────────────────────
// Chassis is a single low Polygon (no explicit Material → dodges the tunneling
// bug). Wheels are Circles with grippy Material (high friction, low bounce) on
// SpringJoint suspension constrained to vertical travel by a LineJoint. The
// rear wheel gets a MotorJoint = throttle. The rider's pelvis is WELDED to the
// chassis seat — that weld is the break-away joint.
function buildBike(space, spawnX, groundY) {
  const cy = groundY - 90;

  // Chassis — a stubby motorbike silhouette. Default material on purpose.
  const chassis = new Body(BodyType.DYNAMIC, new Vec2(spawnX, cy));
  chassis.shapes.add(new Polygon([
    new Vec2(-46, -2), new Vec2(40, -2),
    new Vec2(46, 4), new Vec2(40, 10),
    new Vec2(-46, 10), new Vec2(-52, 4),
  ]));
  // Seat hump at the back + a little tank up front for visual read.
  chassis.shapes.add(new Polygon([
    new Vec2(-44, -14), new Vec2(-14, -14),
    new Vec2(-10, -2), new Vec2(-44, -2),
  ]));
  chassis.shapes.add(new Polygon([
    new Vec2(8, -10), new Vec2(34, -6),
    new Vec2(36, -2), new Vec2(8, -2),
  ]));
  try { chassis.userData._colorIdx = 0; } catch (_) {}
  chassis.space = space;

  const wheelMat = new Material(0.2, 1.6, 1.8, 1.4);  // bouncy-low, very grippy
  const makeWheel = (dx) => {
    const w = new Body(BodyType.DYNAMIC, new Vec2(spawnX + dx, cy + 46));
    w.shapes.add(new Circle(WHEEL_R, undefined, wheelMat));
    try { w.userData._colorIdx = 3; } catch (_) {}
    w.space = space;
    return w;
  };
  const fWheel = makeWheel(WHEEL_BASE);
  const rWheel = makeWheel(-WHEEL_BASE);

  // Suspension: spring + vertical line constraint per wheel.
  const suspend = (wheel, dx) => {
    const spring = new SpringJoint(
      chassis, wheel,
      new Vec2(dx, CHASSIS_H / 2), new Vec2(0, 0),
      SUSP_REST,
    );
    spring.frequency = SUSP_FREQ;
    spring.damping = SUSP_DAMP;
    spring.space = space;
    new LineJoint(
      chassis, wheel,
      new Vec2(dx, CHASSIS_H / 2), new Vec2(0, 0),
      new Vec2(0, 1), SUSP_MIN, SUSP_MAX,
    ).space = space;
    return spring;
  };
  _fSusp = suspend(fWheel, WHEEL_BASE);
  _rSusp = suspend(rWheel, -WHEEL_BASE);

  // Rear-wheel motor = throttle (rate set per frame in step()).
  _rMotor = new MotorJoint(chassis, rWheel, 0);
  _rMotor.space = space;

  _chassis = chassis;
  _fWheel = fWheel;
  _rWheel = rWheel;

  // Rider welded to the seat. The pelvis sits just above the seat hump; the
  // WeldJoint's anchors lock the pelvis rigidly to that point so the chassis
  // lean drives the rider. Breaking this weld (`_seatWeld.space = null`) is the
  // break-away showcase on a crash.
  const seatLocalX = -28;       // over the seat hump
  const seatLocalY = -18;
  const seatX = chassis.position.x + seatLocalX;
  const seatY = chassis.position.y + seatLocalY;
  const pelvis = buildRider(space, seatX, seatY);
  _seatWeld = new WeldJoint(
    chassis, pelvis,
    new Vec2(seatLocalX, seatLocalY), new Vec2(0, 0),
  );
  _seatWeld.stiff = false;       // a touch of give so leans read as sway, not rigid
  _seatWeld.frequency = 9;
  _seatWeld.damping = 0.7;
  _seatWeld.space = space;
}

// ── Reset / respawn ─────────────────────────────────────────────────────────
// Detach joints BEFORE bodies (nape requires both endpoints share the joint's
// space; pulling a body first leaves a dangling constraint that throws on the
// next mutation — same ordering floppy-fists uses).
function teardownBikeAndRider() {
  if (_seatWeld && _seatWeld.space) _seatWeld.space = null;
  _seatWeld = null;
  for (const j of _riderJoints) { if (j.space) j.space = null; }
  _riderJoints = [];
  if (_fSusp && _fSusp.space) _fSusp.space = null;
  if (_rSusp && _rSusp.space) _rSusp.space = null;
  if (_rMotor && _rMotor.space) _rMotor.space = null;
  _fSusp = _rSusp = _rMotor = null;

  for (const b of _riderParts) { if (b.space) b.space = null; }
  _riderParts = [];
  for (const b of [_chassis, _fWheel, _rWheel]) { if (b && b.space) b.space = null; }
  _chassis = _fWheel = _rWheel = _rider = null;
}

function respawn() {
  teardownBikeAndRider();
  _crashed = false;
  _flipFrames = 0;
  buildBike(_space, _spawnX, _spawnGroundY);
  _maxDist = 0;
}

// ── Crash / break-away ──────────────────────────────────────────────────────
// On a sustained flip or a hard impact, break the seat weld so the rider
// ragdolls free. We only break once (the weld is gone afterward).
function bailRider() {
  if (_crashed || !_seatWeld) return;
  _crashed = true;
  if (_seatWeld.space) _seatWeld.space = null;
  _seatWeld = null;
  // A small backward+up kick on the pelvis so the rider visibly tumbles off
  // the back rather than sitting in place.
  if (_rider && _rider.pelvis && _rider.pelvis.space) {
    const v = _rider.pelvis.velocity;
    _rider.pelvis.velocity = new Vec2(v.x - 120, v.y - 160);
  }
  // Open the torso/head/limb angle windows so the freed rider flops loosely.
  for (const j of _riderJoints) {
    if (j.jointMin !== undefined && j.jointMax !== undefined) {
      j.jointMin = -Math.PI;
      j.jointMax = Math.PI;
      j.frequency = 2;
      j.damping = 0.3;
    }
  }
}

export default {
  id: "dirtline",
  label: "Dirtline",
  featured: false,
  tags: ["MotorJoint", "SpringJoint", "WeldJoint", "Ragdoll", "Vehicle", "Camera", "Break-away"],
  desc:
    "Hill-climb trials bike with an articulated ragdoll rider welded to the " +
    "seat. <b>→</b> / <b>D</b> throttle, <b>←</b> / <b>A</b> reverse, " +
    "<b>↑</b> / <b>W</b> lean back (pop the front), <b>↓</b> / <b>S</b> lean " +
    "forward (nose-down). Flip the bike or smack the ground hard and the rider " +
    "breaks away and tumbles off. <b>R</b> or click to respawn. " +
    "Showcases MotorJoint wheels on SpringJoint suspension, a ragdoll attached " +
    "to a moving vehicle, and a break-away WeldJoint.",
  walls: false,

  camera: null,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, GRAVITY);

    _frame = 0;
    const groundY = SCREEN_H - 60;
    _spawnGroundY = groundY;
    _spawnX = 220;

    buildTerrain(space, groundY);

    // Left / right world walls so the bike can't fall off the ends.
    const wallL = new Body(BodyType.STATIC, new Vec2(-30, 0));
    wallL.shapes.add(new Polygon(Polygon.box(40, SCREEN_H * 4)));
    wallL.space = space;
    const wallR = new Body(BodyType.STATIC, new Vec2(WORLD_W + 30, 0));
    wallR.shapes.add(new Polygon(Polygon.box(40, SCREEN_H * 4)));
    wallR.space = space;

    buildBike(space, _spawnX, groundY);

    _crashed = false;
    _flipFrames = 0;
    _maxDist = 0;

    // Function follow so the camera tracks whatever the *current* chassis is —
    // respawn() builds a fresh chassis body, and a static body ref would leave
    // the camera following the removed one.
    this.camera = {
      follow: () => {
        if (_chassis) return { x: _chassis.position.x, y: _chassis.position.y };
        return { x: _spawnX, y: _spawnGroundY - 90 };
      },
      offsetX: 0,
      offsetY: -30,
      bounds: { minX: 0, minY: -400, maxX: WORLD_W, maxY: SCREEN_H + 300 },
      lerp: 0.1,
    };

    for (const k of Object.keys(keys)) keys[k] = false;
    _onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === "KeyR") respawn();
      if ([
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "KeyA", "KeyD", "KeyW", "KeyS",
      ].includes(e.code)) {
        e.preventDefault();
      }
    };
    _onKeyUp = (e) => { keys[e.code] = false; };
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
    _onKeyDown = _onKeyUp = null;
  },

  step(space) {
    _frame++;
    _stepped = true;
    if (!_chassis) return;

    // ── Throttle (rear motor) ──────────────────────────────────────────────
    const fwd = keys.ArrowRight || keys.KeyD || keys._touchRight;
    const rev = keys.ArrowLeft || keys.KeyA || keys._touchLeft;
    if (_rMotor) {
      if (fwd) _rMotor.rate = MOTOR_RATE;
      else if (rev) _rMotor.rate = -MOTOR_RATE;
      else _rMotor.rate = 0;
    }

    // ── Lean (chassis angular impulse) ─────────────────────────────────────
    // Up/back = pop the front up (counter-clockwise = negative torque in
    // screen coords where +y is down). Down/forward = nose-down.
    const leanBack = keys.ArrowUp || keys.KeyW || keys._touchUp;
    const leanFwd = keys.ArrowDown || keys.KeyS || keys._touchDown;
    if (leanBack) _chassis.applyAngularImpulse(-LEAN_TORQUE);
    if (leanFwd) _chassis.applyAngularImpulse(LEAN_TORQUE);

    // ── Distance HUD ───────────────────────────────────────────────────────
    const dist = Math.max(0, (_chassis.position.x - _spawnX));
    if (dist > _maxDist) _maxDist = dist;

    // ── Crash detection: sustained flip OR hard ground impact ──────────────
    if (!_crashed) {
      // Normalise chassis rotation into [-π, π] and measure tilt from upright.
      let rot = _chassis.rotation % (Math.PI * 2);
      if (rot > Math.PI) rot -= Math.PI * 2;
      if (rot < -Math.PI) rot += Math.PI * 2;
      if (Math.abs(rot) > FLIP_ANGLE) {
        _flipFrames++;
        if (_flipFrames > FLIP_FRAMES) bailRider();
      } else {
        _flipFrames = 0;
      }

      // Hard impact: chassis is moving down fast while a wheel is in contact.
      const vy = _chassis.velocity.y;
      if (vy > CRASH_IMPACT_SPEED && wheelTouchingGround()) {
        bailRider();
        if (this._runner) this._runner.shakeCamera(8, 0.25);
      }
    }
  },

  click(x, y, space) {
    // Click respawns once crashed; otherwise tap-left / tap-right drives.
    if (_crashed) { respawn(); return; }
    if (!_chassis) return;
    if (x < _chassis.position.x) keys._touchLeft = true;
    else keys._touchRight = true;
  },

  drag(x, y) {
    if (!_chassis || _crashed) return;
    keys._touchLeft = keys._touchRight = false;
    if (x < _chassis.position.x) keys._touchLeft = true;
    else keys._touchRight = true;
  },

  release() {
    keys._touchLeft = keys._touchRight = false;
    keys._touchUp = keys._touchDown = false;
  },

  render3dOverlay(ctx, _ignored, W, H, camX, camY) {
    const sw = W ?? SCREEN_W;
    drawSuspension(ctx, camX ?? 0, camY ?? 0);
    drawHUD(ctx, sw);
  },
};

// ── Helpers (kept below export for readability; all module-level so the ──────
//    CodePen extractor picks them up as preamble) ────────────────────────────

// True if either wheel currently has a contact arbiter (ground touch).
function wheelTouchingGround() {
  if (!_space || !_rWheel) return false;
  try {
    const arbs = _space.arbiters;
    const count = arbs.zpp_gl();
    for (let i = 0; i < count; i++) {
      const a = arbs.at(i);
      if (a.body1 === _rWheel || a.body2 === _rWheel ||
          a.body1 === _fWheel || a.body2 === _fWheel) {
        return true;
      }
    }
  } catch (_) {}
  return false;
}

// Draw the suspension springs (chassis anchor → wheel hub) in world space.
function drawSpring(ctx, x1, y1, x2, y2, color, coils = 5, amp = 5) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const n = coils * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * len * 0.1, y1 + uy * len * 0.1);
  for (let i = 1; i <= n; i++) {
    const t = 0.1 + (i / n) * 0.8;
    const sign = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x1 + ux * len * t + px * amp * sign, y1 + uy * len * t + py * amp * sign);
  }
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawSuspension(ctx, camX, camY) {
  if (!_chassis || !_fWheel || !_rWheel) return;
  ctx.save();
  ctx.translate(-camX, -camY);
  const cp = _chassis.position;
  const ca = _chassis.rotation;
  const cos = Math.cos(ca), sin = Math.sin(ca);
  const offY = CHASSIS_H / 2;
  const anchor = (dx) => ({
    x: cp.x + (dx * cos - offY * sin),
    y: cp.y + (dx * sin + offY * cos),
  });
  const fa = anchor(WHEEL_BASE);
  const ra = anchor(-WHEEL_BASE);
  drawSpring(ctx, fa.x, fa.y, _fWheel.position.x, _fWheel.position.y, "#d2992299");
  drawSpring(ctx, ra.x, ra.y, _rWheel.position.x, _rWheel.position.y, "#d2992299");
  ctx.restore();
}

function drawHUD(ctx, sw) {
  ctx.save();
  ctx.textBaseline = "alphabetic";

  // Distance + speed readout.
  const meters = (_maxDist / 40).toFixed(1);
  let speed = 0;
  if (_chassis) speed = Math.hypot(_chassis.velocity.x, _chassis.velocity.y) / 40;
  ctx.fillStyle = "rgba(13,17,23,0.78)";
  ctx.fillRect(10, 10, 188, 60);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Distance: ${meters} m`, 22, 34);
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  ctx.fillText(`Speed: ${speed.toFixed(1)} m/s`, 22, 56);

  // Crashed banner + restart hint.
  if (_crashed) {
    ctx.fillStyle = "rgba(248,81,73,0.92)";
    ctx.fillRect(sw / 2 - 150, 18, 300, 56);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CRASHED!", sw / 2, 44);
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("Press R or click to respawn", sw / 2, 64);
  }
  ctx.restore();
}
