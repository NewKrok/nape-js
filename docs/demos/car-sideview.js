import { Body, BodyType, Vec2, Circle, Polygon, Material, SpringJoint, LineJoint, MotorJoint } from "../nape-js.esm.js?v=3.41.0";

import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

// ── Drawing helpers ────────────────────────────────────────────────────────
function drawSpring(ctx, x1, y1, x2, y2, color = '#d29922', coils = 8, amp = 5) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const n = coils * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * len * 0.08, y1 + uy * len * 0.08);
  for (let i = 1; i <= n; i++) {
    const t = 0.08 + (i / n) * 0.84;
    const sign = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x1 + ux * len * t + px * amp * sign, y1 + uy * len * t + py * amp * sign);
  }
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();
}

// ── Constants ──────────────────────────────────────────────────────────────
const WHEEL_OFFSET_X = 44;
const CHASSIS_H = 18;
const MOTOR_RATE = 13;
const WORLD_W = 4000;

// ── Module-level refs ──────────────────────────────────────────────────────
let _chassis = null;
let _fWheel = null;
let _rWheel = null;
let _rMotor = null;
const keys = {};

// ── Terrain generation ─────────────────────────────────────────────────────
function buildTerrain(space, worldW, groundY) {
  const segW = 40;
  const numSegs = Math.ceil(worldW / segW);

  for (let i = 0; i < numSegs; i++) {
    const x = i * segW;

    // Compose multiple sine waves for varied terrain
    const y0 = groundY
      + Math.sin(x * 0.008) * 30
      + Math.sin(x * 0.02) * 12
      + Math.sin(x * 0.05) * 5;
    const x1 = x + segW;
    const y1 = groundY
      + Math.sin(x1 * 0.008) * 30
      + Math.sin(x1 * 0.02) * 12
      + Math.sin(x1 * 0.05) * 5;

    // Build a quad from the two surface points down to a flat bottom
    const bottom = groundY + 80;
    const verts = [
      new Vec2(x, y0),
      new Vec2(x1, y1),
      new Vec2(x1, bottom),
      new Vec2(x, bottom),
    ];
    const seg = new Body(BodyType.STATIC);
    seg.shapes.add(new Polygon(verts));
    seg.space = space;
  }

}

export default {
  id: "car-sideview",
  label: "2D Car — Side View",
  featured: false,
  tags: ["SpringJoint", "LineJoint", "MotorJoint"],
  desc: "A car with SpringJoint suspension on wavy terrain. Use <b>← →</b> arrow keys or tap left/right to drive.",
  walls: false,
  moduleState: `const WHEEL_OFFSET_X = 44;
const CHASSIS_H = 18;
const MOTOR_RATE = 13;
const WORLD_W = 4000;
let _chassis = null;
let _fWheel = null;
let _rWheel = null;
let _rMotor = null;
const keys = {};
function buildTerrain(space, worldW, groundY) {
  const segW = 40;
  const numSegs = Math.ceil(worldW / segW);
  for (let i = 0; i < numSegs; i++) {
    const x = i * segW;
    const y0 = groundY + Math.sin(x * 0.008) * 30 + Math.sin(x * 0.02) * 12 + Math.sin(x * 0.05) * 5;
    const x1 = x + segW;
    const y1 = groundY + Math.sin(x1 * 0.008) * 30 + Math.sin(x1 * 0.02) * 12 + Math.sin(x1 * 0.05) * 5;
    const bottom = groundY + 80;
    const verts = [new Vec2(x, y0), new Vec2(x1, y1), new Vec2(x1, bottom), new Vec2(x, bottom)];
    const seg = new Body(BodyType.STATIC);
    seg.shapes.add(new Polygon(verts));
    seg.space = space;
  }
}`,

  camera: null,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const groundY = H - 40;

    // Build wavy terrain across full world width
    buildTerrain(space, WORLD_W, groundY);

    // Left / right world walls
    const wallL = new Body(BodyType.STATIC, new Vec2(-10, H / 2));
    wallL.shapes.add(new Polygon(Polygon.box(20, H * 2)));
    wallL.space = space;

    const wallR = new Body(BodyType.STATIC, new Vec2(WORLD_W + 10, H / 2));
    wallR.shapes.add(new Polygon(Polygon.box(20, H * 2)));
    wallR.space = space;

    // Car spawn
    const cx = 200, cy = groundY - 80;

    // Car body (chassis) — pickup truck, facing right (~1.15x)
    const chassis = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
    // Lower body — full-length base with rounded bumpers
    chassis.shapes.add(new Polygon([
      new Vec2(-58, -5), new Vec2(58, -5),
      new Vec2(60,  3),  new Vec2(58,  9),
      new Vec2(-58, 9),  new Vec2(-60, 3),
    ]));
    // Cabin — tall section with sloped windshield and vertical rear
    chassis.shapes.add(new Polygon([
      new Vec2(-21, -32), new Vec2(  5, -32),
      new Vec2( 18, -14), new Vec2( 18,  -5),
      new Vec2(-21,  -5),
    ]));
    // Hood — tapers down from windshield base to front
    chassis.shapes.add(new Polygon([
      new Vec2(18, -14), new Vec2(51, -9),
      new Vec2(51,  -5), new Vec2(18, -5),
    ]));
    // Bed — low cargo area behind cabin
    chassis.shapes.add(new Polygon([
      new Vec2(-53, -16), new Vec2(-21, -16),
      new Vec2(-21,  -5), new Vec2(-53,  -5),
    ]));
    try { chassis.userData._colorIdx = 0; } catch(_) {}
    chassis.space = space;

    // Front wheel
    const fWheel = new Body(BodyType.DYNAMIC, new Vec2(cx + WHEEL_OFFSET_X, cy + 45));
    fWheel.shapes.add(new Circle(14, undefined, new Material(0.8, 0.5, 0.5, 2)));
    try { fWheel.userData._colorIdx = 3; } catch(_) {}
    fWheel.space = space;

    // Rear wheel
    const rWheel = new Body(BodyType.DYNAMIC, new Vec2(cx - WHEEL_OFFSET_X, cy + 45));
    rWheel.shapes.add(new Circle(14, undefined, new Material(0.8, 0.5, 0.5, 2)));
    try { rWheel.userData._colorIdx = 3; } catch(_) {}
    rWheel.space = space;

    // SpringJoint suspension
    const fSusp = new SpringJoint(
      chassis, fWheel,
      new Vec2(WHEEL_OFFSET_X, CHASSIS_H / 2), new Vec2(0, 0),
      30,
    );
    fSusp.frequency = 2.5;
    fSusp.damping = 0.4;
    fSusp.space = space;

    const rSusp = new SpringJoint(
      chassis, rWheel,
      new Vec2(-WHEEL_OFFSET_X, CHASSIS_H / 2), new Vec2(0, 0),
      30,
    );
    rSusp.frequency = 2.5;
    rSusp.damping = 0.4;
    rSusp.space = space;

    // LineJoints to constrain wheels to vertical travel
    new LineJoint(
      chassis, fWheel,
      new Vec2(WHEEL_OFFSET_X, CHASSIS_H / 2), new Vec2(0, 0),
      new Vec2(0, 1), -5, 40,
    ).space = space;

    new LineJoint(
      chassis, rWheel,
      new Vec2(-WHEEL_OFFSET_X, CHASSIS_H / 2), new Vec2(0, 0),
      new Vec2(0, 1), -5, 40,
    ).space = space;

    // Motor on rear wheel (rate controlled in step)
    _rMotor = new MotorJoint(chassis, rWheel, 0);
    _rMotor.space = space;

    _chassis = chassis;
    _fWheel = fWheel;
    _rWheel = rWheel;

    // Camera follows the chassis
    this.camera = {
      follow: chassis,
      offsetX: 0,
      offsetY: -20,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: H + 200 },
      lerp: 0.08,
    };

    // Keyboard controls
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  },

  step(space, W, H) {
    if (!_rMotor) return;
    const left = keys["ArrowLeft"] || keys["KeyA"] || keys._touchLeft;
    const right = keys["ArrowRight"] || keys["KeyD"] || keys._touchRight;
    if (left) {
      _rMotor.rate = -MOTOR_RATE;
    } else if (right) {
      _rMotor.rate = MOTOR_RATE;
    } else {
      _rMotor.rate = 0;
    }
  },

  click(x, y, space, W, H) {
    // Touch: left half = drive left, right half = drive right
    if (x < _chassis.position.x) {
      keys._touchLeft = true;
    } else {
      keys._touchRight = true;
    }
  },

  release() {
    keys._touchLeft = false;
    keys._touchRight = false;
  },

  render(ctx, space, W, H, debugDraw, camX, camY) {
    ctx.save();
    ctx.translate(-camX, -camY);

    drawGrid(ctx, W, H, camX, camY);

    // Draw all bodies
    for (const body of space.bodies) drawBody(ctx, body, debugDraw);

    // Draw suspension springs
    if (_chassis && _fWheel && _rWheel) {
      const cp = _chassis.position;
      const ca = _chassis.rotation;
      const cos = Math.cos(ca), sin = Math.sin(ca);
      const offY = CHASSIS_H / 2;

      const fax = cp.x + (WHEEL_OFFSET_X * cos - offY * sin);
      const fay = cp.y + (WHEEL_OFFSET_X * sin + offY * cos);
      drawSpring(ctx, fax, fay, _fWheel.position.x, _fWheel.position.y, '#d2992288', 5, 6);

      const rax = cp.x + (-WHEEL_OFFSET_X * cos - offY * sin);
      const ray = cp.y + (-WHEEL_OFFSET_X * sin + offY * cos);
      drawSpring(ctx, rax, ray, _rWheel.position.x, _rWheel.position.y, '#d2992288', 5, 6);
    }

    ctx.restore();
  },

  renderPixi(adapter, space, W, H, showOutlines, camX, camY) {
    const { app } = adapter.getEngine();
    if (!app) return;
    adapter.syncBodies(space);
    app.stage.x = -camX;
    app.stage.y = -camY;
    app.render();
  },
};
