import {
  Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint,
} from '../nape-js.esm.js';
import { addWalls } from '../demo-runner.js';
import { drawBody, drawGrid } from '../renderer.js';

// ── Layout helpers ────────────────────────────────────────────────────────────
const T = 20; // wall thickness

function cellCenter(col, row, W, H) {
  const cw = (W - 2 * T) / 3;
  const ch = (H - 2 * T) / 2;
  return {
    x: T + col * cw + cw / 2,
    y: T + row * ch + ch / 2,
    cw,
    ch,
    left: T + col * cw,
    top: T + row * ch,
  };
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawSpring(ctx, x1, y1, x2, y2, coils = 8, amp = 5) {
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
  ctx.strokeStyle = '#d2992299';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawPin(ctx, x, y, color = '#f85149') {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────

export default {
  id: 'constraints',
  label: 'Constraints Showcase',
  tags: ['PivotJoint', 'DistanceJoint', 'AngleJoint', 'WeldJoint', 'MotorJoint', 'LineJoint'],
  featured: true,
  featuredOrder: 4,
  desc: 'All 6 built-in constraint types in a 2×3 grid. <b>Drag</b> any body to feel how each constraint reacts.',

  // Stored refs for custom rendering
  _pAnchor: null,
  _pBar: null,
  _dAnchor: null,
  _dBall: null,
  _aAnchor: null,
  _aBar: null,
  _aLimits: null,
  _w1: null,
  _w2: null,
  _mAnchor: null,
  _lAnchor: null,
  _lLimits: null,

  // Mouse-drag state
  _mouseBody: null,
  _mouseJoint: null,
  _dragTarget: null,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 300);
    addWalls(space, W, H);

    // ── PivotJoint (col=0, row=0) — pendulum bar ────────────────────────────
    {
      const { x, top } = cellCenter(0, 0, W, H);
      const ay = top + 28;

      const anchor = new Body(BodyType.STATIC, new Vec2(x, ay));
      anchor.shapes.add(new Circle(4));
      anchor.space = space;

      // Pivot at bar's left end (local offset -40,0) so it hangs like a pendulum
      const bar = new Body(BodyType.DYNAMIC, new Vec2(x + 40, ay));
      bar.shapes.add(new Polygon(Polygon.box(80, 10)));
      try { bar.userData._colorIdx = 0; } catch (_) {}
      bar.angularVel = 1.5;
      bar.space = space;

      new PivotJoint(anchor, bar, new Vec2(0, 0), new Vec2(-40, 0)).space = space;

      this._pAnchor = anchor;
      this._pBar = bar;
    }

    // ── DistanceJoint (col=1, row=0) — bouncy spring ────────────────────────
    {
      const { x, top } = cellCenter(1, 0, W, H);
      const ay = top + 30;

      const anchor = new Body(BodyType.STATIC, new Vec2(x, ay));
      anchor.shapes.add(new Circle(4));
      anchor.space = space;

      const ball = new Body(BodyType.DYNAMIC, new Vec2(x, ay + 100));
      ball.shapes.add(new Circle(18));
      try { ball.userData._colorIdx = 1; } catch (_) {}
      ball.space = space;

      const dj = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 75, 125);
      dj.stiff = false;
      dj.frequency = 2.5;
      dj.damping = 0.2;
      dj.space = space;

      this._dAnchor = anchor;
      this._dBall = ball;
    }

    // ── AngleJoint (col=2, row=0) — rotation-limited pendulum ───────────────
    {
      const { x, top } = cellCenter(2, 0, W, H);
      const ay = top + 28;
      const limits = { min: -Math.PI / 3, max: Math.PI / 3 };

      const anchor = new Body(BodyType.STATIC, new Vec2(x, ay));
      anchor.shapes.add(new Circle(4));
      anchor.space = space;

      const bar = new Body(BodyType.DYNAMIC, new Vec2(x + 40, ay));
      bar.shapes.add(new Polygon(Polygon.box(80, 10)));
      try { bar.userData._colorIdx = 2; } catch (_) {}
      bar.angularVel = 2;
      bar.space = space;

      new PivotJoint(anchor, bar, new Vec2(0, 0), new Vec2(-40, 0)).space = space;

      const aj = new AngleJoint(anchor, bar, limits.min, limits.max);
      aj.stiff = false;
      aj.frequency = 4;
      aj.damping = 0.4;
      aj.space = space;

      this._aAnchor = anchor;
      this._aBar = bar;
      this._aLimits = limits;
    }

    // ── WeldJoint (col=0, row=1) — two bodies glued as one ──────────────────
    {
      const { x, top } = cellCenter(0, 1, W, H);
      const cy = top + 55;

      const w1 = new Body(BodyType.DYNAMIC, new Vec2(x - 20, cy));
      w1.shapes.add(new Polygon(Polygon.box(34, 34)));
      try { w1.userData._colorIdx = 4; } catch (_) {}
      w1.space = space;

      const w2 = new Body(BodyType.DYNAMIC, new Vec2(x + 22, cy));
      w2.shapes.add(new Circle(19));
      try { w2.userData._colorIdx = 5; } catch (_) {}
      w2.space = space;

      new WeldJoint(w1, w2, new Vec2(17, 0), new Vec2(-19, 0)).space = space;

      this._w1 = w1;
      this._w2 = w2;
    }

    // ── MotorJoint (col=1, row=1) — constant angular velocity ───────────────
    {
      const { x, y } = cellCenter(1, 1, W, H);

      const anchor = new Body(BodyType.STATIC, new Vec2(x, y));
      anchor.shapes.add(new Circle(4));
      anchor.space = space;

      const wheel = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      wheel.shapes.add(new Polygon(Polygon.regular(38, 38, 8)));
      try { wheel.userData._colorIdx = 3; } catch (_) {}
      wheel.space = space;

      new PivotJoint(anchor, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
      new MotorJoint(anchor, wheel, 3).space = space;

      this._mAnchor = anchor;
    }

    // ── LineJoint (col=2, row=1) — horizontal slider ─────────────────────────
    {
      const { x, y } = cellCenter(2, 1, W, H);
      const limits = { min: -90, max: 90 };

      const anchor = new Body(BodyType.STATIC, new Vec2(x, y));
      anchor.shapes.add(new Circle(4));
      anchor.space = space;

      const slider = new Body(BodyType.DYNAMIC, new Vec2(x + 50, y));
      slider.shapes.add(new Polygon(Polygon.box(38, 22)));
      try { slider.userData._colorIdx = 1; } catch (_) {}
      slider.space = space;

      new LineJoint(
        anchor, slider,
        new Vec2(0, 0), new Vec2(0, 0),
        new Vec2(1, 0), limits.min, limits.max,
      ).space = space;

      this._lAnchor = anchor;
      this._lLimits = limits;
    }
  },

  // Drive the kinematic cursor body toward the drag target each step
  step(_space) {
    if (this._mouseBody && this._dragTarget) {
      this._mouseBody.kinematicVel.x = (this._dragTarget.x - this._mouseBody.position.x) * 60;
      this._mouseBody.kinematicVel.y = (this._dragTarget.y - this._mouseBody.position.y) * 60;
    }
  },

  // Pointerdown: find nearest dynamic body, create a mouse joint
  click(x, y, space) {
    let closest = null, minDist = Infinity;
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = body.position.x - x, dy = body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 80 && d < minDist) { minDist = d; closest = body; }
    }
    if (!closest) return;

    this._mouseBody = new Body(BodyType.KINEMATIC, new Vec2(x, y));
    this._mouseBody.space = space;
    this._dragTarget = { x, y };

    // Convert click position to body-local anchor
    const cos = Math.cos(-closest.rotation), sin = Math.sin(-closest.rotation);
    const rx = x - closest.position.x, ry = y - closest.position.y;

    this._mouseJoint = new PivotJoint(
      this._mouseBody, closest,
      new Vec2(0, 0),
      new Vec2(rx * cos - ry * sin, rx * sin + ry * cos),
    );
    this._mouseJoint.stiff = false;
    this._mouseJoint.frequency = 15;
    this._mouseJoint.damping = 0.9;
    this._mouseJoint.space = space;
  },

  drag(x, y) {
    if (this._dragTarget) {
      this._dragTarget.x = x;
      this._dragTarget.y = y;
    }
  },

  release() {
    if (this._mouseJoint) { this._mouseJoint.space = null; this._mouseJoint = null; }
    if (this._mouseBody) { this._mouseBody.space = null; this._mouseBody = null; }
    this._dragTarget = null;
  },

  render(ctx, space, W, H, debugDraw) {
    drawGrid(ctx, W, H);

    ctx.save();

    // ── Subtle cell dividers ──────────────────────────────────────────────────
    const cw = (W - 2 * T) / 3;
    const ch = (H - 2 * T) / 2;
    ctx.strokeStyle = '#ffffff09';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    for (let c = 1; c < 3; c++) {
      const lx = T + c * cw;
      ctx.beginPath(); ctx.moveTo(lx, T); ctx.lineTo(lx, H - T); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(T, T + ch); ctx.lineTo(W - T, T + ch); ctx.stroke();
    ctx.setLineDash([]);

    // ── PivotJoint: faint line from pin to bar center ─────────────────────────
    if (this._pAnchor && this._pBar) {
      ctx.beginPath();
      ctx.moveTo(this._pAnchor.position.x, this._pAnchor.position.y);
      ctx.lineTo(this._pBar.position.x, this._pBar.position.y);
      ctx.strokeStyle = '#58a6ff22';
      ctx.lineWidth = 1;
      ctx.stroke();
      drawPin(ctx, this._pAnchor.position.x, this._pAnchor.position.y);
    }

    // ── DistanceJoint: animated spring coils ─────────────────────────────────
    if (this._dAnchor && this._dBall) {
      drawSpring(
        ctx,
        this._dAnchor.position.x, this._dAnchor.position.y,
        this._dBall.position.x, this._dBall.position.y,
      );
      drawPin(ctx, this._dAnchor.position.x, this._dAnchor.position.y, '#d29922');
    }

    // ── AngleJoint: sector showing allowed rotation range ────────────────────
    if (this._aAnchor && this._aBar && this._aLimits) {
      const ax = this._aAnchor.position.x, ay = this._aAnchor.position.y;
      const { min, max } = this._aLimits;
      const r = 38;
      // Filled sector: allowed range
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.arc(ax, ay, r, min, max);
      ctx.closePath();
      ctx.fillStyle = 'rgba(63,185,80,0.10)';
      ctx.fill();
      ctx.strokeStyle = '#3fb95055';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Current bar angle indicator
      const angle = this._aBar.rotation;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(angle) * r, ay + Math.sin(angle) * r);
      ctx.strokeStyle = '#3fb95099';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawPin(ctx, ax, ay, '#3fb950');
    }

    // ── WeldJoint: dashed connection line + X marker at weld point ───────────
    if (this._w1 && this._w2) {
      ctx.beginPath();
      ctx.moveTo(this._w1.position.x, this._w1.position.y);
      ctx.lineTo(this._w2.position.x, this._w2.position.y);
      ctx.strokeStyle = '#a371f744';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      // X marker at the weld point (w1 local anchor (17,0) in world space)
      const rot = this._w1.rotation;
      const wx = this._w1.position.x + Math.cos(rot) * 17;
      const wy = this._w1.position.y + Math.sin(rot) * 17;
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(wx - s, wy - s); ctx.lineTo(wx + s, wy + s);
      ctx.moveTo(wx + s, wy - s); ctx.lineTo(wx - s, wy + s);
      ctx.strokeStyle = '#a371f7';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── MotorJoint: circular arrow indicating spin direction ─────────────────
    if (this._mAnchor) {
      const ax = this._mAnchor.position.x, ay = this._mAnchor.position.y;
      const r = 52;
      ctx.beginPath();
      ctx.arc(ax, ay, r, -Math.PI * 0.85, Math.PI * 0.35);
      ctx.strokeStyle = '#f8514955';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Arrowhead at arc end
      const ea = Math.PI * 0.35;
      const ex = ax + Math.cos(ea) * r, ey = ay + Math.sin(ea) * r;
      const ta = ea + Math.PI / 2;
      const hs = 8;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(ta - 0.5) * hs, ey + Math.sin(ta - 0.5) * hs);
      ctx.lineTo(ex + Math.cos(ta + 0.5) * hs, ey + Math.sin(ta + 0.5) * hs);
      ctx.closePath();
      ctx.fillStyle = '#f85149';
      ctx.fill();
      drawPin(ctx, ax, ay, '#f85149');
    }

    // ── LineJoint: dashed rail with limit tick marks ──────────────────────────
    if (this._lAnchor && this._lLimits) {
      const ax = this._lAnchor.position.x, ay = this._lAnchor.position.y;
      const { min, max } = this._lLimits;
      ctx.beginPath();
      ctx.moveTo(ax + min, ay);
      ctx.lineTo(ax + max, ay);
      ctx.strokeStyle = '#d2992266';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const lx of [ax + min, ax + max]) {
        ctx.beginPath();
        ctx.moveTo(lx, ay - 10); ctx.lineTo(lx, ay + 10);
        ctx.strokeStyle = '#d29922';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      drawPin(ctx, ax, ay, '#d29922');
    }

    // ── Bodies (skip the invisible mouse-drag cursor body) ────────────────────
    for (const body of space.bodies) {
      if (body === this._mouseBody) continue;
      drawBody(ctx, body, debugDraw);
    }

    // ── Drag indicator: dashed line from cursor to grabbed body ──────────────
    if (this._mouseBody && this._mouseJoint) {
      const mx = this._mouseBody.position.x, my = this._mouseBody.position.y;
      const grabbed = this._mouseJoint.body2;
      if (grabbed) {
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(grabbed.position.x, grabbed.position.y);
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(mx, my, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff66';
        ctx.fill();
      }
    }

    // ── Cell labels ───────────────────────────────────────────────────────────
    const LABELS = [
      { col: 0, row: 0, name: 'PivotJoint',    desc: 'pin / hinge pivot point' },
      { col: 1, row: 0, name: 'DistanceJoint', desc: 'spring distance constraint' },
      { col: 2, row: 0, name: 'AngleJoint',    desc: 'rotation range limit' },
      { col: 0, row: 1, name: 'WeldJoint',     desc: 'rigid weld (glue)' },
      { col: 1, row: 1, name: 'MotorJoint',    desc: 'angular velocity motor' },
      { col: 2, row: 1, name: 'LineJoint',     desc: 'linear rail / slider' },
    ];
    for (const { col, row, name, desc } of LABELS) {
      const c = cellCenter(col, row, W, H);
      const lx = c.left + 8, ly = c.top + 17;
      ctx.fillStyle = '#58a6ffdd';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(name, lx, ly);
      ctx.fillStyle = '#8b949eaa';
      ctx.font = '10px monospace';
      ctx.fillText(desc, lx, ly + 14);
    }

    ctx.restore();
  },

  code2d: `// Constraints Showcase — all 6 built-in joint types
const space = new Space(new Vec2(0, 300));

// 1. PivotJoint — two bodies pinned at a shared point (pivot at bar's left end)
const anchor1 = new Body(BodyType.STATIC, new Vec2(163, 48));
anchor1.space = space;
const bar = new Body(BodyType.DYNAMIC, new Vec2(203, 48));
bar.shapes.add(new Polygon(Polygon.box(80, 10)));
bar.angularVel = 1.5; // start swinging
bar.space = space;
new PivotJoint(anchor1, bar, new Vec2(0, 0), new Vec2(-40, 0)).space = space;

// 2. DistanceJoint — soft spring between anchor and ball
const anchor2 = new Body(BodyType.STATIC, new Vec2(450, 50));
anchor2.space = space;
const ball = new Body(BodyType.DYNAMIC, new Vec2(450, 150));
ball.shapes.add(new Circle(18));
ball.space = space;
const spring = new DistanceJoint(anchor2, ball, new Vec2(0,0), new Vec2(0,0), 75, 125);
spring.stiff = false; spring.frequency = 2.5; spring.damping = 0.2;
spring.space = space;

// 3. AngleJoint — limits relative rotation to ±60°
//    (combined with PivotJoint so the bar can only swing in a range)
const aj = new AngleJoint(anchor1, bar, -Math.PI / 3, Math.PI / 3);
aj.stiff = false; aj.frequency = 4; aj.damping = 0.4;
aj.space = space;

// 4. WeldJoint — glues two bodies into one rigid compound shape
const box = new Body(BodyType.DYNAMIC, new Vec2(143, 305));
box.shapes.add(new Polygon(Polygon.box(34, 34)));
box.space = space;
const circ = new Body(BodyType.DYNAMIC, new Vec2(185, 305));
circ.shapes.add(new Circle(19));
circ.space = space;
new WeldJoint(box, circ, new Vec2(17, 0), new Vec2(-19, 0)).space = space;

// 5. MotorJoint — drives a constant angular velocity (needs PivotJoint too)
const hub = new Body(BodyType.STATIC, new Vec2(450, 365));
hub.space = space;
const wheel = new Body(BodyType.DYNAMIC, new Vec2(450, 365));
wheel.shapes.add(new Polygon(Polygon.regular(38, 38, 8)));
wheel.space = space;
new PivotJoint(hub, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
new MotorJoint(hub, wheel, 3 /* rad/s */).space = space;

// 6. LineJoint — body can only slide along an axis, within limits
const rail = new Body(BodyType.STATIC, new Vec2(737, 365));
rail.space = space;
const slider = new Body(BodyType.DYNAMIC, new Vec2(787, 365));
slider.shapes.add(new Polygon(Polygon.box(38, 22)));
slider.space = space;
// axis=(1,0) → horizontal, limits ±90 px from anchor
new LineJoint(
  rail, slider, new Vec2(0,0), new Vec2(0,0), new Vec2(1,0), -90, 90,
).space = space;

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawConstraintLines();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,

  code3d: `// Setup Three.js scene
const container = document.getElementById("container");
const W = 900, H = 500;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);
const fov = 45;
const camZ = (W / 2) / Math.tan((fov / 2) * Math.PI / 180) / (W / H);
const camera = new THREE.PerspectiveCamera(fov, W / H, 1, camZ * 6);
camera.position.set(W / 2, -H / 2, camZ);
camera.lookAt(W / 2, -H / 2, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
container.appendChild(renderer.domElement);
const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.0); keyLight.position.set(-W*0.3, H*0.6, 800); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xadd8ff, 0.6); fillLight.position.set(W*1.2, -H*0.3, 400); scene.add(fillLight);
scene.add(new THREE.AmbientLight(0x1a1a2e, 1.5));

const space = new Space(new Vec2(0, 300));
const COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0x4dd0e1];
const meshes = [];

function addMesh(body, color) {
  const shape = body.shapes.at(0);
  let geom;
  if (shape.isCircle()) {
    geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
  } else {
    const verts = shape.castPolygon.localVerts;
    const pts = [];
    for (let i = 0; i < verts.length; i++) pts.push(new THREE.Vector2(verts.at(i).x, verts.at(i).y));
    geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 28, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 1 });
    geom.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1));
    geom.translate(0, 0, -14);
  }
  const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x444444, side: THREE.DoubleSide }));
  scene.add(mesh);
  meshes.push({ mesh, body });
}

const T = 20;
function cell(col, row) {
  const cw = (W - 2*T) / 3, ch = (H - 2*T) / 2;
  return { x: T + col*cw + cw/2, y: T + row*ch + ch/2, top: T + row*ch };
}

// PivotJoint — pendulum
const c0 = cell(0, 0);
const pAnchor = new Body(BodyType.STATIC, new Vec2(c0.x, c0.top + 28)); pAnchor.shapes.add(new Circle(4)); pAnchor.space = space;
const pBar = new Body(BodyType.DYNAMIC, new Vec2(c0.x + 40, c0.top + 28));
pBar.shapes.add(new Polygon(Polygon.box(80, 10))); pBar.angularVel = 1.5; pBar.space = space;
new PivotJoint(pAnchor, pBar, new Vec2(0,0), new Vec2(-40,0)).space = space;
addMesh(pAnchor, 0x455a64); addMesh(pBar, COLORS[0]);

// DistanceJoint — spring
const c1 = cell(1, 0);
const dAnchor = new Body(BodyType.STATIC, new Vec2(c1.x, c1.top + 30)); dAnchor.shapes.add(new Circle(4)); dAnchor.space = space;
const ball = new Body(BodyType.DYNAMIC, new Vec2(c1.x, c1.top + 130));
ball.shapes.add(new Circle(18)); ball.space = space;
const spring = new DistanceJoint(dAnchor, ball, new Vec2(0,0), new Vec2(0,0), 75, 125);
spring.stiff = false; spring.frequency = 2.5; spring.damping = 0.2; spring.space = space;
addMesh(dAnchor, 0x455a64); addMesh(ball, COLORS[1]);

// MotorJoint — spinning wheel
const c4 = cell(1, 1);
const mAnchor = new Body(BodyType.STATIC, new Vec2(c4.x, c4.y)); mAnchor.shapes.add(new Circle(4)); mAnchor.space = space;
const wheel = new Body(BodyType.DYNAMIC, new Vec2(c4.x, c4.y));
wheel.shapes.add(new Polygon(Polygon.regular(38, 38, 8))); wheel.space = space;
new PivotJoint(mAnchor, wheel, new Vec2(0,0), new Vec2(0,0)).space = space;
new MotorJoint(mAnchor, wheel, 3).space = space;
addMesh(mAnchor, 0x455a64); addMesh(wheel, COLORS[3]);

function loop() {
  space.step(1 / 60, 8, 3);
  for (const { mesh, body } of meshes) {
    mesh.position.set(body.position.x, -body.position.y, 0);
    mesh.rotation.z = -body.rotation;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();`,
};
