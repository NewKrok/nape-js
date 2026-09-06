import {
  Body, BodyType, Vec2, AABB, Circle, Polygon, Material, PivotJoint, MotorJoint,
  InteractionFilter, MarchingSquares,
} from "../nape-js.esm.js?v=3.42.0";

import { drawBody, drawGrid } from "../renderer.js?v=3.42.0";

// ── Constants ──────────────────────────────────────────────────────────────
const WORLD_W = 3200;
const WORLD_H_EXTRA = 400; // dirt depth below visible canvas
const MOTOR_RATE = 14;
const WHEEL_R = 13;
const WHEEL_DX = 48;
const CHASSIS_HW = WHEEL_DX + 6;
const CHASSIS_HH = 9;
const TREAD_SEGMENTS = 32;
const TREAD_THICK = 3;

const TURRET_LEN = 32;
const TURRET_W = 6;
const SHELL_R = 4;
const SHELL_SPEED = 700;
const FIRE_COOLDOWN = 22; // frames
const BLAST_R = 50;
const BLAST_IMPULSE = 700;
const EXPLOSION_DURATION = 22; // frames

const CELL_SIZE = 32;
const SUB_SIZE = 6;
const ISO_QUAL = 3;

// ── Module-level refs ──────────────────────────────────────────────────────
let _chassis = null;
let _leftMotor = null;
let _rightMotor = null;
let _turret = null;
const _midMotors = [];
const _shells = [];
const _explosions = []; // { x, y, r, t } — t counts down each frame
const _tankBodies = []; // all bodies that move with the tank (for respawn)
const _tankInitialOffsets = []; // body-local offset from chassis center at spawn
let _spawnPos = null;
const keys = {};
let _fireTimer = 0;
let _space = null;
let _canvasH = 0;
let _canvasW = 0;
let _lastCamX = 0;
let _lastCamY = 0;

// Terrain bitmap state
let _bitmap = null;
let _bmpW = 0;
let _bmpH = 0;
let _terrainDirty = true;
let _cellsX = 0;
let _cellsY = 0;
let _cellBodies = null;
const _pendingBlasts = [];

// ── Terrain bitmap helpers ────────────────────────────────────────────────
function createTerrainBitmap(worldW, worldH, groundY) {
  _bmpW = worldW;
  _bmpH = worldH;
  _bitmap = new Uint8Array(worldW * worldH);
  for (let x = 0; x < worldW; x++) {
    const surfaceY = groundY + Math.sin(x * 0.006) * 28 + Math.sin(x * 0.017) * 10;
    const sy = Math.floor(surfaceY);
    for (let y = sy; y < worldH; y++) {
      _bitmap[y * worldW + x] = 255;
    }
  }
}

function sampleAlpha(x, y) {
  const ix = Math.max(0, Math.min(_bmpW - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(_bmpH - 1, Math.floor(y)));
  return _bitmap[iy * _bmpW + ix];
}

function terrainIso(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const a00 = sampleAlpha(ix, iy);
  const a10 = sampleAlpha(ix + 1, iy);
  const a01 = sampleAlpha(ix, iy + 1);
  const a11 = sampleAlpha(ix + 1, iy + 1);
  const fx = x - ix, fy = y - iy;
  const alpha = a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy)
              + a01 * (1 - fx) * fy + a11 * fx * fy;
  return 128 - alpha;
}

function initCells() {
  _cellsX = Math.ceil(_bmpW / CELL_SIZE);
  _cellsY = Math.ceil(_bmpH / CELL_SIZE);
  _cellBodies = new Array(_cellsX * _cellsY).fill(null);
}

function buildCell(cx, cy, space) {
  const x0 = cx * CELL_SIZE;
  const y0 = cy * CELL_SIZE;
  const x1 = Math.min(x0 + CELL_SIZE, _bmpW);
  const y1 = Math.min(y0 + CELL_SIZE, _bmpH);
  if (x1 <= x0 || y1 <= y0) return;

  const bounds = new AABB(x0, y0, x1 - x0, y1 - y0);
  const cellsize = Vec2.weak(SUB_SIZE, SUB_SIZE);
  let polys;
  try {
    polys = MarchingSquares.run(terrainIso, bounds, cellsize, ISO_QUAL);
  } catch (_) {
    return;
  }

  if (polys.length === 0) { polys.clear(); return; }

  const body = new Body(BodyType.STATIC);
  for (let i = 0; i < polys.length; i++) {
    const p = polys.at(i);
    let convexParts;
    try {
      convexParts = p.simplify(1.5).convexDecomposition(true);
    } catch (_) {
      p.dispose();
      continue;
    }
    for (let j = 0; j < convexParts.length; j++) {
      const q = convexParts.at(j);
      try { body.shapes.add(new Polygon(q)); } catch (_) {}
      q.dispose();
    }
    convexParts.clear();
    p.dispose();
  }
  polys.clear();

  if (body.shapes.length === 0) return;
  body.userData._isTerrain = true;
  body.space = space;
  _cellBodies[cy * _cellsX + cx] = body;
}

function buildAllCells(space) {
  for (let cy = 0; cy < _cellsY; cy++) {
    for (let cx = 0; cx < _cellsX; cx++) {
      buildCell(cx, cy, space);
    }
  }
}

function invalidateRegion(rx, ry, rr, space) {
  const cx0 = Math.max(0, Math.floor((rx - rr) / CELL_SIZE));
  const cy0 = Math.max(0, Math.floor((ry - rr) / CELL_SIZE));
  const cx1 = Math.min(_cellsX - 1, Math.floor((rx + rr) / CELL_SIZE));
  const cy1 = Math.min(_cellsY - 1, Math.floor((ry + rr) / CELL_SIZE));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const idx = cy * _cellsX + cx;
      if (_cellBodies[idx]) {
        _cellBodies[idx].space = null;
        _cellBodies[idx] = null;
      }
      buildCell(cx, cy, space);
    }
  }
}

function blastTerrain(bx, by, r) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(bx - r));
  const y0 = Math.max(0, Math.floor(by - r));
  const x1 = Math.min(_bmpW - 1, Math.ceil(bx + r));
  const y1 = Math.min(_bmpH - 1, Math.ceil(by + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - bx, dy = y - by;
      if (dx * dx + dy * dy <= r2) _bitmap[y * _bmpW + x] = 0;
    }
  }
}

function applyExplosion(bx, by, r) {
  const result = _space.bodiesInCircle(new Vec2(bx, by), r);
  for (let i = 0; i < result.length; i++) {
    const b = result.at(i);
    if (!b.isDynamic()) continue;
    if (b.userData._isTank) continue; // don't blast our own tank apart
    const dx = b.position.x - bx;
    const dy = b.position.y - by;
    const d = Math.hypot(dx, dy) || 1;
    const fall = 1 - d / r;
    const imp = BLAST_IMPULSE * fall;
    b.applyImpulse(new Vec2((dx / d) * imp, (dy / d) * imp));
  }
  result.clear();
}

// ── Offscreen terrain canvas ──────────────────────────────────────────────
let _terrainCanvas = null;
let _terrainCtx = null;

function ensureTerrainCanvas() {
  if (!_terrainCanvas || _terrainCanvas.width !== _bmpW || _terrainCanvas.height !== _bmpH) {
    _terrainCanvas = document.createElement("canvas");
    _terrainCanvas.width = _bmpW;
    _terrainCanvas.height = _bmpH;
    _terrainCtx = _terrainCanvas.getContext("2d");
    _terrainDirty = true;
  }
}

function updateTerrainImage() {
  ensureTerrainCanvas();
  if (!_terrainDirty) return;
  const imgData = _terrainCtx.createImageData(_bmpW, _bmpH);
  const d = imgData.data;
  for (let y = 0; y < _bmpH; y++) {
    for (let x = 0; x < _bmpW; x++) {
      const a = _bitmap[y * _bmpW + x];
      const i = (y * _bmpW + x) * 4;
      if (a > 128) {
        const depth = Math.min(1, y / _bmpH);
        d[i]     = Math.floor(70 + depth * 40);
        d[i + 1] = Math.floor(50 + depth * 30);
        d[i + 2] = Math.floor(25 + depth * 15);
        d[i + 3] = 230;
      } else {
        d[i + 3] = 0;
      }
    }
  }
  _terrainCtx.putImageData(imgData, 0, 0);
  _terrainDirty = false;
}

// ── Shells ────────────────────────────────────────────────────────────────
// Shell collision filter: group=16, mask=1 (only world/terrain — ignore tank parts)
const _shellFilter = new InteractionFilter(16, 1);
// Non-bouncy material so shells don't ricochet off terrain before we detect impact
const _shellMat = new Material(0, 0.5, 0.5, 1);

function fireShell(space) {
  if (!_turret || _fireTimer > 0) return;
  _fireTimer = FIRE_COOLDOWN;
  const ang = _turret.rotation;
  const dir = new Vec2(Math.cos(ang), Math.sin(ang));
  const muzzle = new Vec2(
    _turret.position.x + dir.x * (TURRET_LEN + SHELL_R + 2),
    _turret.position.y + dir.y * (TURRET_LEN + SHELL_R + 2),
  );
  const shell = new Body(BodyType.DYNAMIC, muzzle);
  shell.shapes.add(new Circle(SHELL_R, undefined, _shellMat, _shellFilter));
  shell.isBullet = true;
  shell.userData._colorIdx = 5;
  shell.userData._isShell = true;
  shell.space = space;
  shell.velocity = new Vec2(dir.x * SHELL_SPEED, dir.y * SHELL_SPEED);
  _shells.push(shell);
}

// Teleport the whole tank back at a random spot above the terrain.
// Resets velocities so it drops cleanly instead of carrying fall momentum.
function respawnTank() {
  if (!_spawnPos) return;
  const margin = 200;
  const sx = margin + Math.random() * (WORLD_W - 2 * margin);
  // Find first solid pixel from top at sx — drop in 200px above it.
  let surfaceY = _bmpH;
  for (let y = 0; y < _bmpH; y++) {
    if (_bitmap[y * _bmpW + Math.floor(sx)] > 128) { surfaceY = y; break; }
  }
  const sy = surfaceY - 200;
  for (let i = 0; i < _tankBodies.length; i++) {
    const b = _tankBodies[i];
    const off = _tankInitialOffsets[i];
    b.position = new Vec2(sx + off.dx, sy + off.dy);
    b.rotation = off.rot;
    b.velocity = new Vec2(0, 0);
    b.angularVel = 0;
  }
}

// Mobile control button layout in screen space.
// Returns null on non-touch devices so buttons stay hidden on desktop.
const _isTouchDevice = typeof window !== "undefined"
  && (("ontouchstart" in window) || (navigator.maxTouchPoints > 0));

function getMobileButtons() {
  if (!_isTouchDevice || !_canvasW || !_canvasH) return null;
  const r = 38;
  const pad = 18;
  return {
    left:  { x: pad + r,           y: _canvasH - pad - r, r, label: "◀" },
    right: { x: pad + r * 3 + 12,  y: _canvasH - pad - r, r, label: "▶" },
    up:    { x: _canvasW - pad - r * 3 - 12, y: _canvasH - pad - r,    r, label: "▲" },
    down:  { x: _canvasW - pad - r,          y: _canvasH - pad - r,    r, label: "▼" },
    fire:  { x: _canvasW / 2,      y: _canvasH - pad - r, r: r + 6, label: "FIRE" },
  };
}

function hitButton(btn, sx, sy) {
  const dx = sx - btn.x;
  const dy = sy - btn.y;
  return dx * dx + dy * dy <= btn.r * btn.r;
}

// Snap turret to chassis pose + aim. Called both in step() and render() so
// the turret renders in lockstep with the chassis (no visual lag).
function syncTurret() {
  if (!_turret || !_chassis) return;
  const aim = _turret.userData._aim;
  const cr = _chassis.rotation;
  const cs = Math.cos(cr), sn = Math.sin(cr);
  const lx = -5, ly = -CHASSIS_HH - 18;
  _turret.rotation = cr + aim;
  _turret.position = new Vec2(
    _chassis.position.x + lx * cs - ly * sn,
    _chassis.position.y + lx * sn + ly * cs,
  );
}

function detonateShell(shell) {
  const px = shell.position.x;
  const py = shell.position.y;
  console.log("[tank] detonate shell at", px.toFixed(1), py.toFixed(1));
  _pendingBlasts.push({ x: px, y: py, r: BLAST_R });
  _explosions.push({ x: px, y: py, r: BLAST_R, t: EXPLOSION_DURATION });
  shell.space = null;
  const idx = _shells.indexOf(shell);
  if (idx >= 0) _shells.splice(idx, 1);
}

// ── Demo ──────────────────────────────────────────────────────────────────
export default {
  id: "tracked-vehicle",
  label: "Tracked Vehicle",
  featured: false,
  tags: ["PivotJoint", "MotorJoint", "InteractionFilter", "Chain", "MarchingSquares"],
  velocityIterations: 18,
  positionIterations: 16,
  desc: "Tank-style tracked vehicle with a cannon. Drive with <b>← →</b> (or A/D), aim with <b>↑ ↓</b> (or W/S), fire with <b>Space</b>. Shells blast destructible terrain.",
  walls: false,
  camera: null,

  setup(space, W, H) {
    _space = space;
    _canvasH = H;
    _canvasW = W;
    _shells.length = 0;
    _pendingBlasts.length = 0;
    _fireTimer = 0;
    space.gravity = new Vec2(0, 700);
    const groundY = H - 40;
    const worldH = H + WORLD_H_EXTRA;

    // Terrain
    createTerrainBitmap(WORLD_W, worldH, groundY);
    _terrainDirty = true;
    initCells();
    buildAllCells(space);

    // Side + top walls (no bottom — terrain is the floor; respawn handles falls)
    const wallL = new Body(BodyType.STATIC, new Vec2(-10, worldH / 2));
    wallL.shapes.add(new Polygon(Polygon.box(20, worldH * 2)));
    wallL.space = space;
    const wallR = new Body(BodyType.STATIC, new Vec2(WORLD_W + 10, worldH / 2));
    wallR.shapes.add(new Polygon(Polygon.box(20, worldH * 2)));
    wallR.space = space;
    const wallT = new Body(BodyType.STATIC, new Vec2(WORLD_W / 2, -200));
    wallT.shapes.add(new Polygon(Polygon.box(WORLD_W * 2, 20)));
    wallT.space = space;

    // Collision filters: 1=world, 2=chassis, 4=wheels, 8=tread, 16=shell
    const fChassis = new InteractionFilter(2, 1);
    const fWheel   = new InteractionFilter(4, 1 | 8);
    const fTread   = new InteractionFilter(8, 1 | 4);

    const cx = 260;
    const cy = groundY - 120;

    // --- Chassis (hull + cabin) ---
    // Note: dynamic Polygon + explicit Material tunnels through static Polygons (engine bug),
    // so we omit Material on the hull and bump density via a manual setter below.
    const chassis = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
    chassis.shapes.add(new Polygon([
      new Vec2(-CHASSIS_HW, -CHASSIS_HH),
      new Vec2( CHASSIS_HW, -CHASSIS_HH),
      new Vec2( CHASSIS_HW,  CHASSIS_HH),
      new Vec2(-CHASSIS_HW,  CHASSIS_HH),
    ], undefined, undefined, fChassis));
    chassis.shapes.add(new Polygon([
      new Vec2(-30, -CHASSIS_HH - 18),
      new Vec2( 18, -CHASSIS_HH - 18),
      new Vec2( 24, -CHASSIS_HH),
      new Vec2(-30, -CHASSIS_HH),
    ], undefined, undefined, fChassis));
    try { chassis.userData._colorIdx = 0; } catch (_) {}
    chassis.userData._isTank = true;
    chassis.space = space;
    _chassis = chassis;

    // --- Turret (kinematic — pose driven from chassis pose + aim angle) ---
    const turret = new Body(BodyType.KINEMATIC, new Vec2(cx - 5, cy - CHASSIS_HH - 18));
    turret.shapes.add(new Polygon([
      new Vec2(0, -TURRET_W / 2),
      new Vec2(TURRET_LEN, -TURRET_W / 2),
      new Vec2(TURRET_LEN,  TURRET_W / 2),
      new Vec2(0,  TURRET_W / 2),
    ], undefined, undefined, new InteractionFilter(2, 0))); // turret doesn't collide
    turret.userData._aim = -Math.PI / 4; // aim angle relative to chassis (negative = up)
    turret.rotation = turret.userData._aim;
    turret.userData._colorIdx = 1;
    turret.userData._isTank = true;
    turret.space = space;
    _turret = turret;

    // --- Sprocket wheels ---
    const wheelMat = new Material(0.1, 2.0, 2.4, 1.2);
    const wheelY = cy + CHASSIS_HH + 2;

    const leftWheel = new Body(BodyType.DYNAMIC, new Vec2(cx - WHEEL_DX, wheelY));
    leftWheel.shapes.add(new Circle(WHEEL_R, undefined, wheelMat, fWheel));
    try { leftWheel.userData._colorIdx = 3; } catch (_) {}
    leftWheel.userData._isTank = true;
    leftWheel.space = space;

    const rightWheel = new Body(BodyType.DYNAMIC, new Vec2(cx + WHEEL_DX, wheelY));
    rightWheel.shapes.add(new Circle(WHEEL_R, undefined, wheelMat, fWheel));
    try { rightWheel.userData._colorIdx = 3; } catch (_) {}
    rightWheel.userData._isTank = true;
    rightWheel.space = space;

    new PivotJoint(chassis, leftWheel,  new Vec2(-WHEEL_DX, CHASSIS_HH + 2), new Vec2(0, 0)).space = space;
    new PivotJoint(chassis, rightWheel, new Vec2( WHEEL_DX, CHASSIS_HH + 2), new Vec2(0, 0)).space = space;

    _leftMotor  = new MotorJoint(chassis, leftWheel,  0);
    _rightMotor = new MotorJoint(chassis, rightWheel, 0);
    _leftMotor.space = space;
    _rightMotor.space = space;

    // --- Mid drive wheels ---
    _midMotors.length = 0;
    const midCount = 2;
    for (let i = 0; i < midCount; i++) {
      const t = (i + 1) / (midCount + 1);
      const localX = -WHEEL_DX + 2 * WHEEL_DX * t;
      const worldX = cx + localX;
      const midWheel = new Body(BodyType.DYNAMIC, new Vec2(worldX, wheelY));
      midWheel.shapes.add(new Circle(WHEEL_R, undefined, wheelMat, fWheel));
      try { midWheel.userData._colorIdx = 3; } catch (_) {}
      midWheel.userData._isTank = true;
      midWheel.space = space;

      new PivotJoint(chassis, midWheel, new Vec2(localX, CHASSIS_HH + 2), new Vec2(0, 0)).space = space;
      const motor = new MotorJoint(chassis, midWheel, 0);
      motor.space = space;
      _midMotors.push(motor);
    }

    // --- Tread loop ---
    const w1 = leftWheel.position;
    const w2 = rightWheel.position;
    const wheelDist = Math.hypot(w2.x - w1.x, w2.y - w1.y);
    const straightAng = Math.atan2(w2.y - w1.y, w2.x - w1.x);
    const arcLen = Math.PI * WHEEL_R;
    const perim = 2 * wheelDist + 2 * arcLen;
    const segSpacing = perim / TREAD_SEGMENTS;
    const segHalfLen = (segSpacing / 2) * 0.92;

    function pathAt(s) {
      s = ((s % perim) + perim) % perim;
      if (s < wheelDist) {
        const t = s / wheelDist;
        return { x: w1.x + (w2.x - w1.x) * t, y: w1.y - WHEEL_R + (w2.y - w1.y) * t, ang: straightAng };
      }
      s -= wheelDist;
      if (s < arcLen) {
        const a = -Math.PI / 2 + (s / arcLen) * Math.PI;
        return { x: w2.x + WHEEL_R * Math.cos(a), y: w2.y + WHEEL_R * Math.sin(a), ang: a + Math.PI / 2 };
      }
      s -= arcLen;
      if (s < wheelDist) {
        const t = s / wheelDist;
        return { x: w2.x + (w1.x - w2.x) * t, y: w2.y + WHEEL_R + (w1.y - w2.y) * t, ang: straightAng + Math.PI };
      }
      s -= wheelDist;
      const a = Math.PI / 2 + (s / arcLen) * Math.PI;
      return { x: w1.x + WHEEL_R * Math.cos(a), y: w1.y + WHEEL_R * Math.sin(a), ang: a + Math.PI / 2 };
    }

    const treadMat = new Material(0.05, 1.8, 2.2, 0.25);
    const segments = [];
    for (let i = 0; i < TREAD_SEGMENTS; i++) {
      const p = pathAt((i + 0.5) * segSpacing);
      const seg = new Body(BodyType.DYNAMIC, new Vec2(p.x, p.y));
      seg.rotation = p.ang;
      seg.shapes.add(new Polygon(Polygon.box(segHalfLen * 2, TREAD_THICK), undefined, treadMat, fTread));
      try { seg.userData._colorIdx = 2; } catch (_) {}
      seg.userData._isTank = true;
      seg.space = space;
      segments.push(seg);
    }

    for (let i = 0; i < TREAD_SEGMENTS; i++) {
      const a = segments[i];
      const b = segments[(i + 1) % TREAD_SEGMENTS];
      new PivotJoint(a, b, new Vec2(segHalfLen, 0), new Vec2(-segHalfLen, 0)).space = space;
    }

    // Snapshot tank bodies + their initial offset from chassis (for respawn).
    _spawnPos = new Vec2(cx, cy);
    _tankBodies.length = 0;
    _tankInitialOffsets.length = 0;
    const allTankBodies = [chassis, turret, leftWheel, rightWheel, ...segments];
    // Mid wheels were created in their own loop — collect them via space iteration.
    for (const b of space.bodies) {
      if (b.userData._isTank && !allTankBodies.includes(b)) allTankBodies.push(b);
    }
    for (const b of allTankBodies) {
      _tankBodies.push(b);
      _tankInitialOffsets.push({
        dx: b.position.x - cx,
        dy: b.position.y - cy,
        rot: b.rotation,
      });
    }

    this.camera = {
      follow: chassis,
      offsetX: 0,
      offsetY: -20,
      bounds: { minX: 0, minY: -200, maxX: WORLD_W, maxY: worldH + 200 },
      lerp: 0.08,
    };

    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  },

  step(space, _W, _H) {
    if (!_leftMotor || !_rightMotor || !_turret || !_chassis) return;

    // Respawn tank if it falls off the world (e.g. dug a hole under itself)
    if (_chassis.position.y > _bmpH + 100 || _chassis.position.x < -100 || _chassis.position.x > WORLD_W + 100) {
      respawnTank();
    }

    const left = keys["ArrowLeft"] || keys["KeyA"] || keys._touchLeft;
    const right = keys["ArrowRight"] || keys["KeyD"] || keys._touchRight;
    let rate = 0;
    if (left) rate = -MOTOR_RATE;
    else if (right) rate = MOTOR_RATE;
    _leftMotor.rate = rate;
    _rightMotor.rate = rate;
    for (const m of _midMotors) m.rate = rate;

    // Turret aim — _aim is chassis-relative (negative = upward, 0 = horizontal forward)
    const aimUp = keys["ArrowUp"] || keys["KeyW"] || keys._touchUp;
    const aimDown = keys["ArrowDown"] || keys["KeyS"] || keys._touchDown;
    let aim = _turret.userData._aim;
    if (aimUp) aim -= 0.025;
    if (aimDown) aim += 0.025;
    // Clamp from straight up (~-85°) down to ~+28° so you can shoot the ground in front.
    aim = Math.max(-Math.PI / 2 + 0.08, Math.min(0.5, aim));
    _turret.userData._aim = aim;

    syncTurret();

    // Fire
    if (_fireTimer > 0) _fireTimer--;
    if (keys["Space"] || keys._touchFire) fireShell(space);

    // Shell lifecycle — detonate on contact or when out of bounds
    for (let i = _shells.length - 1; i >= 0; i--) {
      const s = _shells[i];
      const p = s.position;
      if (p.x < 0 || p.x > WORLD_W || p.y > _bmpH + 50 || p.y < -500) {
        s.space = null;
        _shells.splice(i, 1);
        continue;
      }
      // Detect impact via velocity drop (most reliable across CCD/normal collisions)
      const v = s.velocity;
      const speed = Math.hypot(v.x, v.y);
      const lastSpeed = s.userData._lastSpeed;
      if (lastSpeed != null && speed < lastSpeed - 80) {
        detonateShell(s);
        continue;
      }
      s.userData._lastSpeed = speed;
      // Also detonate if shell pos is inside the terrain bitmap (penetrated)
      if (sampleAlpha(p.x, p.y) > 128) {
        detonateShell(s);
        continue;
      }
      // Or any other contact
      const others = s.interactingBodies();
      const hit = others.length > 0;
      others.clear();
      if (hit) detonateShell(s);
    }

    // Apply pending blasts (after physics step to avoid mid-iteration mutations)
    if (_pendingBlasts.length) {
      for (const b of _pendingBlasts) {
        blastTerrain(b.x, b.y, b.r);
        invalidateRegion(b.x, b.y, b.r, space);
        applyExplosion(b.x, b.y, b.r);
      }
      _pendingBlasts.length = 0;
      _terrainDirty = true;
    }

    // Tick explosion effects
    for (let i = _explosions.length - 1; i >= 0; i--) {
      _explosions[i].t--;
      if (_explosions[i].t <= 0) _explosions.splice(i, 1);
    }
  },

  click(x, y, _space, _W, _H) {
    if (!_chassis) return;
    // Convert world → screen for mobile button hit-testing.
    const sx = x - _lastCamX;
    const sy = y - _lastCamY;
    const btns = getMobileButtons();
    if (btns) {
      if (hitButton(btns.left,  sx, sy)) { keys._touchLeft = true;  return; }
      if (hitButton(btns.right, sx, sy)) { keys._touchRight = true; return; }
      if (hitButton(btns.up,    sx, sy)) { keys._touchUp = true;    return; }
      if (hitButton(btns.down,  sx, sy)) { keys._touchDown = true;  return; }
      if (hitButton(btns.fire,  sx, sy)) { keys._touchFire = true;  return; }
    }
    // Fallback: click left/right of tank to drive (desktop tap).
    if (x < _chassis.position.x) keys._touchLeft = true;
    else keys._touchRight = true;
  },

  release() {
    keys._touchLeft = false;
    keys._touchRight = false;
    keys._touchUp = false;
    keys._touchDown = false;
    keys._touchFire = false;
  },

  render(ctx, space, W, H, debugDraw, camX, camY) {
    syncTurret(); // resync after physics step so the turret tracks the chassis exactly
    _lastCamX = camX;
    _lastCamY = camY;
    _canvasW = W;
    _canvasH = H;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);

    updateTerrainImage();
    if (_terrainCanvas) ctx.drawImage(_terrainCanvas, 0, 0);

    for (const body of space.bodies) {
      if (body.userData._isTerrain) continue;
      drawBody(ctx, body, debugDraw);
    }

    drawExplosionsWorld(ctx);
    ctx.restore();

    drawMobileUi(ctx);
  },

  // Pixi: render bodies via adapter; overlay terrain bitmap as a stage sprite.
  renderPixi(adapter, space, _W, _H, _showOutlines, camX, camY) {
    syncTurret();
    _lastCamX = camX;
    _lastCamY = camY;
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;

    adapter.syncBodies(space);

    const wasDirty = _terrainDirty;
    updateTerrainImage();
    if (_terrainCanvas) {
      if (!app.stage._tankTerrainSprite) {
        const texture = PIXI.Texture.from(_terrainCanvas);
        const sprite = new PIXI.Sprite(texture);
        app.stage.addChildAt(sprite, 0); // behind body sprites
        app.stage._tankTerrainSprite = sprite;
      } else if (wasDirty) {
        app.stage._tankTerrainSprite.texture.source.update();
      }
    }

    app.stage.x = -camX;
    app.stage.y = -camY;
    app.render();
  },

  // 2D overlay drawn on top of 3D / Pixi scenes
  render3dOverlay(ctx, _space, W, H, camX = 0, camY = 0) {
    _canvasW = W;
    _canvasH = H;
    _lastCamX = camX;
    _lastCamY = camY;
    // Explosion effects are in world coordinates — translate by camera offset.
    ctx.save();
    ctx.translate(-camX, -camY);
    drawExplosionsWorld(ctx);
    ctx.restore();
    drawMobileUi(ctx);
  },
};

// --- Shared draw helpers ---------------------------------------------------

function drawExplosionsWorld(ctx) {
  for (const ex of _explosions) {
    const k = 1 - ex.t / EXPLOSION_DURATION;
    const radius = ex.r * (0.4 + k * 0.9);
    const alpha = 1 - k;
    const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, radius);
    grad.addColorStop(0, `rgba(255,240,180,${0.85 * alpha})`);
    grad.addColorStop(0.4, `rgba(255,140,40,${0.7 * alpha})`);
    grad.addColorStop(1, `rgba(120,30,10,0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,200,100,${0.6 * alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, radius * 1.05, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMobileUi(ctx) {
  const btns = getMobileButtons();
  if (!btns) return;
  ctx.save();
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const drawBtn = (b, active) => {
    ctx.fillStyle = active ? "rgba(255,180,80,0.7)" : "rgba(20,20,30,0.55)";
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fillText(b.label, b.x, b.y);
  };
  drawBtn(btns.left,  keys._touchLeft);
  drawBtn(btns.right, keys._touchRight);
  drawBtn(btns.up,    keys._touchUp);
  drawBtn(btns.down,  keys._touchDown);
  drawBtn(btns.fire,  keys._touchFire);
  ctx.restore();
}
