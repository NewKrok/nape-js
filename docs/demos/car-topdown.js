import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.40.0";

// 1:1 port of a known-good iforce2d-style top-down car model.
// Uses a PIXEL_RATIO of 10 (same as the reference): all world geometry is
// expressed in "world units", multiplied by PIXEL_RATIO when sent to the
// engine. Physics constants (force/impulse/torque) are imported verbatim
// because the body mass scale matches the reference.
const PIXEL_RATIO = 10;

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
// World expressed in nape pixel units (PIXEL_RATIO * world units).
const WORLD_W = 270 * PIXEL_RATIO;   // 2700 px
const WORLD_H = 150 * PIXEL_RATIO;   // 1500 px
const TRACK_ROAD_WIDTH_UNITS = 13;   // narrower than before (22) — tighter feel
const TRACK_SPLINE_SEGMENTS = 360;   // smoothness of the racing line
const WALL_THICK = 2 * PIXEL_RATIO;
// Catmull-Rom control points for a winding closed loop, expressed in
// "world units" relative to the world center. Scaled into the 270×150 unit
// world. Modeled after the reference rally circuit but condensed.
const TRACK_CONTROL_POINTS = [
  { x:    0, y:  -55 },
  { x:   30, y:  -58 },
  { x:   60, y:  -52 },
  { x:   85, y:  -38 },
  { x:   95, y:  -15 },
  { x:   85, y:   10 },
  { x:  100, y:   30 },
  { x:  120, y:   38 },
  { x:  115, y:   58 },
  { x:   90, y:   62 },
  { x:   60, y:   45 },
  { x:   35, y:   55 },
  { x:    5, y:   60 },
  { x:  -25, y:   50 },
  { x:  -50, y:   58 },
  { x:  -80, y:   50 },
  { x: -110, y:   30 },
  { x: -120, y:    0 },
  { x: -110, y:  -25 },
  { x:  -85, y:  -40 },
  { x:  -55, y:  -32 },
  { x:  -35, y:  -55 },
];

let _car = null;
let _prevContactCount = 0;
let _steerVisualAngle = 0;
const _obstacles = [];
const OBSTACLE_LINEAR_DRAG = 0.04;   // per-frame drag — 0=no drag, 1=instant stop
const OBSTACLE_ANGULAR_DRAG = 0.08;
const keys = {};

// Forward / right unit-vectors — iforce2d convention: rotation=0 points +X.
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

// Convex check for a 4-vertex polygon: every consecutive turn must have the
// same sign (all CCW or all CW) and a non-trivial magnitude. Tight curves
// in the spline ribbon can produce concave quads that nape rejects.
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

// 1:1 port of updateFriction from the reference iforce2d model.
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

// 1:1 port of updateDrive.
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

// 1:1 port of updateTurn.
function updateTurn(body, steer, dt, handbrake) {
  const forwardSpeed = getForwardSpeed(body);
  const absSpeed = Math.abs(forwardSpeed);
  const rawFactor = Math.min(1, absSpeed / CAR.STEER_LOCK_SPEED);
  const speedFactor = Math.pow(rawFactor, CAR.STEER_LOCK_POWER);
  const direction = forwardSpeed >= 0 ? 1 : -1;
  const torque = handbrake ? CAR.DRIFT_STEER_TORQUE : CAR.STEER_TORQUE;
  const angImpulse = steer * torque * speedFactor * direction * dt;
  body.applyAngularImpulse(angImpulse);
  _steerVisualAngle += (steer * 0.75 - _steerVisualAngle) * 0.35;
}

function updateCarPhysics(body, throttle, steer, brake, dt, handbrake) {
  updateFriction(body, dt, throttle, handbrake);
  updateDrive(body, throttle, brake, dt);
  updateTurn(body, steer, dt, handbrake);
}

// Catmull-Rom spline interpolation (1:1 from reference Track).
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

function buildTrack(space) {
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  const wallMat = new Material(0.4, 0.05, 0.05, 1);

  // Spline the centerline (in pixel units).
  const centerline = generateSpline(TRACK_CONTROL_POINTS, TRACK_SPLINE_SEGMENTS).map(p => ({
    x: cx + p.x * PIXEL_RATIO,
    y: cy + p.y * PIXEL_RATIO,
  }));
  const n = centerline.length;
  const halfWidth = (TRACK_ROAD_WIDTH_UNITS * PIXEL_RATIO) / 2;

  // Compute per-segment normals (right-hand normal of forward tangent).
  const normals = [];
  for (let i = 0; i < n; i++) {
    const prev = centerline[(i - 1 + n) % n];
    const next = centerline[(i + 1) % n];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / len, y: dx / len });
  }

  // Inner / outer edge points.
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

  // Build wall ribbon — quad per segment, thickening outward from each edge.
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
      trackBody.shapes.add(new Polygon(verts, wallMat));
    }
  };
  ribbon(outer, +1);   // outer wall thickens outward
  ribbon(inner, -1);   // inner wall thickens inward
  trackBody.space = space;

  return { cx, cy, centerline, normals };
}

export default {
  id: "car-topdown",
  label: "2D Car — Top Down",
  featured: false,
  tags: ["Top-Down", "Zero Gravity", "Friction", "Camera", "Camera Shake"],
  desc: "Top-down racing car with arcade physics on a winding rally track. Use <b>↑ ↓ ← →</b> arrow keys (or WASD), <b>Space</b> for handbrake/drift, <b>Shift</b> to brake. On touch: tap front/back to throttle/brake, left/right to steer.",
  walls: false,
  moduleState: `const PIXEL_RATIO = 10;
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
const WORLD_W = 270 * PIXEL_RATIO;
const WORLD_H = 150 * PIXEL_RATIO;
const TRACK_ROAD_WIDTH_UNITS = 13;
const TRACK_SPLINE_SEGMENTS = 360;
const WALL_THICK = 2 * PIXEL_RATIO;
const TRACK_CONTROL_POINTS = [
  { x: 0, y: -55 }, { x: 30, y: -58 }, { x: 60, y: -52 }, { x: 85, y: -38 },
  { x: 95, y: -15 }, { x: 85, y: 10 }, { x: 100, y: 30 }, { x: 120, y: 38 },
  { x: 115, y: 58 }, { x: 90, y: 62 }, { x: 60, y: 45 }, { x: 35, y: 55 },
  { x: 5, y: 60 }, { x: -25, y: 50 }, { x: -50, y: 58 }, { x: -80, y: 50 },
  { x: -110, y: 30 }, { x: -120, y: 0 }, { x: -110, y: -25 }, { x: -85, y: -40 },
  { x: -55, y: -32 }, { x: -35, y: -55 },
];
let _car = null;
let _prevContactCount = 0;
let _steerVisualAngle = 0;
const _obstacles = [];
const OBSTACLE_LINEAR_DRAG = 0.04;   // per-frame drag — 0=no drag, 1=instant stop
const OBSTACLE_ANGULAR_DRAG = 0.08;
const keys = {};
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
  const desiredSpeed = throttle > 0 ? CAR.MAX_FORWARD_SPEED * throttle : -CAR.MAX_REVERSE_SPEED * Math.abs(throttle);
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
  _steerVisualAngle += (steer * 0.75 - _steerVisualAngle) * 0.35;
}
function updateCarPhysics(body, throttle, steer, brake, dt, handbrake) {
  updateFriction(body, dt, throttle, handbrake);
  updateDrive(body, throttle, brake, dt);
  updateTurn(body, steer, dt, handbrake);
}
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
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
      result.push(catmullRom(p0, p1, p2, p3, j / segsPerSection));
    }
  }
  return result;
}
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
  const normals = [];
  for (let i = 0; i < n; i++) {
    const prev = centerline[(i - 1 + n) % n];
    const next = centerline[(i + 1) % n];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / len, y: dx / len });
  }
  const inner = [], outer = [];
  for (let i = 0; i < n; i++) {
    inner.push({ x: centerline[i].x - normals[i].x * halfWidth, y: centerline[i].y - normals[i].y * halfWidth });
    outer.push({ x: centerline[i].x + normals[i].x * halfWidth, y: centerline[i].y + normals[i].y * halfWidth });
  }
  const trackBody = new Body(BodyType.STATIC);
  try { trackBody.userData._colorIdx = 4; } catch (_) {}
  const ribbon = (edge, normalSign) => {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const e0 = edge[i], e1 = edge[j];
      const nm0 = normals[i], nm1 = normals[j];
      const ox0 = nm0.x * WALL_THICK * normalSign, oy0 = nm0.y * WALL_THICK * normalSign;
      const ox1 = nm1.x * WALL_THICK * normalSign, oy1 = nm1.y * WALL_THICK * normalSign;
      const verts = normalSign > 0
        ? [new Vec2(e0.x, e0.y), new Vec2(e1.x, e1.y), new Vec2(e1.x + ox1, e1.y + oy1), new Vec2(e0.x + ox0, e0.y + oy0)]
        : [new Vec2(e0.x + ox0, e0.y + oy0), new Vec2(e1.x + ox1, e1.y + oy1), new Vec2(e1.x, e1.y), new Vec2(e0.x, e0.y)];
      if (!isConvexQuad(verts)) continue;
      trackBody.shapes.add(new Polygon(verts, wallMat));
    }
  };
  ribbon(outer, +1);
  ribbon(inner, -1);
  trackBody.space = space;
  return { cx, cy, centerline, normals };
}
function isConvexQuad(v) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = v[i], b = v[(i + 1) % 4], c = v[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 0.5) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}`,

  camera: null,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0);

    const track = buildTrack(space);

    // Spawn on the centerline at index 0, facing along its tangent.
    const cl = track.centerline;
    const spawnPt = cl[0];
    const aheadPt = cl[Math.min(8, cl.length - 1)];
    const spawnAngle = Math.atan2(aheadPt.y - spawnPt.y, aheadPt.x - spawnPt.x);
    const car = new Body(BodyType.DYNAMIC, new Vec2(spawnPt.x, spawnPt.y));
    // Body sized in pixel units (CAR.LENGTH * pr × CAR.WIDTH * pr) so the
    // resulting mass matches the reference model and the imported physics
    // constants apply 1:1. density=1.5 (from reference).
    const carMat = new Material(0.2, 0.3, 0.3, 1.5);
    car.shapes.add(new Polygon(
      Polygon.box(CAR.LENGTH * PIXEL_RATIO, CAR.WIDTH * PIXEL_RATIO),
      carMat,
    ));
    car.rotation = spawnAngle;
    try { car.userData._colorIdx = 0; } catch (_) {}
    car.space = space;

    // Cones + boxes scattered along the racing line (offset randomly to either side).
    _obstacles.length = 0;
    const halfWidthPx = (TRACK_ROAD_WIDTH_UNITS * PIXEL_RATIO) / 2;
    const obstacleSlots = 40;
    const step = Math.floor(cl.length / obstacleSlots);
    const obstacleMat = new Material(0.3, 0.8, 0.3, 0.4);
    for (let i = 0; i < obstacleSlots; i++) {
      const idx = (i * step + Math.floor(Math.random() * step)) % cl.length;
      const c = cl[idx];
      const nrm = track.normals[idx];
      const lateral = (Math.random() * 2 - 1) * halfWidthPx * 0.6;
      const x = c.x + nrm.x * lateral;
      const y = c.y + nrm.y * lateral;
      const obstacle = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      const isBox = i % 2 === 0;
      if (isBox) {
        obstacle.shapes.add(new Polygon(Polygon.box(14, 14), obstacleMat));
        try { obstacle.userData._colorIdx = 2; } catch (_) {}
      } else {
        obstacle.shapes.add(new Circle(7, undefined, obstacleMat));
        try { obstacle.userData._colorIdx = 1; } catch (_) {}
      }
      obstacle.rotation = Math.random() * Math.PI * 2;
      obstacle.space = space;
      _obstacles.push(obstacle);
    }

    _car = car;
    _prevContactCount = 0;
    _steerVisualAngle = 0;

    this.camera = {
      follow: car,
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

    // 1:1 port of the reference InputManager keydown/keyup handling.
    this._onKeyDown = (e) => {
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
    this._onKeyUp = (e) => {
      keys[e.code] = false;
      if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
      if (e.code === "Space") keys.handbrake = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.brake = false;
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  },

  step(space, W, H) {
    if (!_car) return;
    const body = _car;

    // ---- Wall-contact detection (camera shake on collision rising-edge) ----
    let staticContacts = 0;
    try {
      const arbs = space.arbiters;
      const arbCount = arbs.zpp_gl();
      for (let i = 0; i < arbCount; i++) {
        const a = arbs.at(i);
        if (a.body1 === body || a.body2 === body) {
          const other = a.body1 === body ? a.body2 : a.body1;
          if (other.isStatic && other.isStatic()) staticContacts++;
        }
      }
    } catch (_) {}
    if (staticContacts > _prevContactCount) {
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > SHAKE_MIN_SPEED && this._runner) {
        const norm = Math.min(1, (speed - SHAKE_MIN_SPEED) / (CAR.MAX_FORWARD_SPEED - SHAKE_MIN_SPEED));
        const amp = 4 + norm * 12;
        this._runner.shakeCamera(amp, 0.22);
      }
    }
    _prevContactCount = staticContacts;

    // ---- Read input — exact mapping from the reference InputManager.
    // Reference uses Y-up (steer +1 = left), but in nape Y-down a positive
    // angularVel rotates the car clockwise (toward +Y), so to keep "left
    // arrow turns the car left on screen" we flip the steer sign here.
    let throttle = 0, steer = 0;
    if (keys.up || keys._touchUp) throttle += 1;
    if (keys.down || keys._touchDown) throttle -= 1;
    if (keys.left || keys._touchLeft) steer -= 1;
    if (keys.right || keys._touchRight) steer += 1;
    const brake = keys.brake;
    const handbrake = keys.handbrake;

    updateCarPhysics(body, throttle, steer, brake, DT, handbrake);

    // Manual drag on cones/boxes — zero-gravity has no friction surface,
    // so velocity would otherwise persist forever after a collision.
    for (const o of _obstacles) {
      if (!o.space) continue;
      const v = o.velocity;
      o.velocity = new Vec2(v.x * (1 - OBSTACLE_LINEAR_DRAG), v.y * (1 - OBSTACLE_LINEAR_DRAG));
      o.angularVel *= (1 - OBSTACLE_ANGULAR_DRAG);
    }
  },

  click(x, y, space, W, H) {
    if (!_car) return;
    const cx = _car.position.x;
    const cy = _car.position.y;
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

  drag(x, y, space, W, H) {
    if (!_car) return;
    keys._touchUp = false;
    keys._touchDown = false;
    keys._touchLeft = false;
    keys._touchRight = false;
    const cx = _car.position.x;
    const cy = _car.position.y;
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
};
