import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.42.1";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.1";

// ── Flipper Fray — a six-player pinball brawl ────────────────────────────
//
// One round table, six pockets, a pair of flippers guarding each of them.
// Balls drift outward from the centre, pop bumpers and slingshots throw them
// around, a spinning cross launches every new ball, and any ball that gets
// past your flippers costs you a life. Five lives each; the last pocket
// standing wins, or the most lives when the three minutes run out. You hold
// the bottom pocket, five AI keepers hold the rest. Multiball drops extra
// balls on a schedule and every half minute a bomb ball rolls out: it costs
// two lives if it drains, and if nobody swallows it before the fuse runs out
// it detonates and scatters every ball around it.
//
// Physics: the flippers are kinematic bodies driven through
// setVelocityFromTarget, so a slap carries the flipper's real angular speed
// into the ball; every ball is a bullet-flagged dynamic circle so the fast
// ones never tunnel through the thin ring walls. Bumpers and slingshots are
// static shapes with CbTypes, and their kicks arrive through
// InteractionListeners on the collision BEGIN event — the same listener
// stamps the last flipper that touched a ball, which is how goals are
// credited. The outward drift and the damping are applied per step; the
// table itself has no gravity.
//
// 3D: a neon arena — a graphite star table with lane lights in each keeper's
// colour, glowing pocket boxes with life lamps, chrome balls that reflect an
// environment map, bumpers that flash, a spinning launcher and a ring of
// light panels around the hall — framed from behind your own pocket.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;

// ── Table ────────────────────────────────────────────────────────────────
const N_PLAYERS = 6;
const RX = 272;                 // pocket mouth ellipse
const RY = 178;
const MID_K = 0.66;             // how far the ring dips inward between pockets
const RING_SEGS = 10;           // straight segments per curved ring wall
const PW = 118;                 // pocket mouth width
const PD = 54;                  // pocket depth behind the flippers
const WALL_T = 10;
const FL = 42;                  // flipper length
const FLIP_INSET = 6;           // pivot distance from the pocket side wall
const FLIP_REST = -0.40;        // droop into the pocket
const FLIP_ACTIVE = 0.66;       // raised toward the table
const FLIP_W = 22;              // rad/s
const FLIP_HOLD_AI = 7;         // frames an AI holds a flipper up
const BALL_R = 7;
const BOMB_R = 9;
const MAX_SPEED = 950;
const DRIFT = 38;               // outward acceleration, px/s²
const DAMP = 0.22;              // linear damping, 1/s
const BUMP_KICK = 240;
const SLING_KICK = 200;
const FLIP_BOOST = 90;          // extra push when a moving flipper connects
const BUMPER_RING_R = 84;
const BUMPER_R = 15;
const CROSS_ARM = 50;
const CROSS_SPIN = 1.1;         // rad/s

// ── Match ────────────────────────────────────────────────────────────────
const START_LIVES = 5;
const MATCH_FRAMES = 180 * 60;
const RESPAWN_DELAY = 70;
const BOMB_FUSE = 9 * 60;
const BOMB_EVERY = 30 * 60;
const MULTIBALL_AT = [40 * 60, 95 * 60, 145 * 60];
const GOAL_CREDIT_FRAMES = 10 * 60;
const FAST_FORWARD = 4;         // time-lapse factor once the human is out

const PLAYER_DEFS = [
  { name: "P1", color: "#ff5c5c", hex: 0xff5c5c, dark: "#7a1f1f" },
  { name: "P2", color: "#ffd23f", hex: 0xffd23f, dark: "#7a5f10" },
  { name: "P3", color: "#4cd36e", hex: 0x4cd36e, dark: "#1d6b33" },
  { name: "P4", color: "#4c8dff", hex: 0x4c8dff, dark: "#1d3f80" },
  { name: "P5", color: "#b56bff", hex: 0xb56bff, dark: "#552a80" },
  { name: "P6", color: "#ff9a3c", hex: 0xff9a3c, dark: "#80460f" },
];

// `react` is how many seconds before the ball reaches the flipper line the
// keeper commits; the later the better (a flipper that is already up and
// waiting just parks the ball), so skill here means flipping late.
const DIFFICULTIES = [
  { name: "Easy",   react: 0.10,  jitter: 0.03, miss: 0.30, delay: 2, delayJit: 3 },
  { name: "Normal", react: 0.075, jitter: 0.02, miss: 0.15, delay: 2, delayJit: 2 },
  { name: "Hard",   react: 0.05,  jitter: 0.01, miss: 0.05, delay: 1, delayJit: 1 },
];

// ── Module state ─────────────────────────────────────────────────────────
let _space = null;
let _frame = 0;
let _clock = 0;
let _phase = "title";           // title | play | over
let _phaseT = 0;
let _difficulty = 1;
let _players = [];
let _balls = [];
let _bumpers = [];
let _slings = [];
let _ringWalls = [];            // { ax, ay, bx, by } world segments
let _outline = [];              // table outline polygon (world coords)
let _cross = null;
let _crossDir = 1;
let _pendingSpawns = [];        // frames at which a ball respawns
let _nextBombAt = 0;
let _multiballIdx = 0;
let _banners = [];
let _parts = [];
let _fx = [];
let _keys = {};
let _onKeyDown = null;
let _onKeyUp = null;
let _pointerSide = 0;           // -1 left, +1 right, 0 none
let _autopilot = false;
let _mode3d = false;
let _frame3d = -1;
let _drawFrame = 0;
let _camProj = null;
let _stats = { drains: 0, escapes: 0, goals: 0, bombs: 0, flips: 0, byPocket: [0, 0, 0, 0, 0, 0], approaches: [0, 0, 0, 0, 0, 0] };
let _result = null;
let _cbBall = null, _cbFlipper = null, _cbBumper = null, _cbSling = null;
let _seed = 12345;

function rnd() {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 4294967296;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ── Geometry ─────────────────────────────────────────────────────────────
// Every pocket has a local frame: origin at the mouth centre M, `u` pointing
// inward (toward the table centre) and `v` along the mouth. The bottom
// pocket (i = 0) has u = (0, -1) and v = (1, 0), so the keeper's "left"
// flipper is the one at negative v for every pocket.
function pocketFrame(i) {
  const a = Math.PI / 2 + i * (Math.PI / 3);
  const mx = CX + RX * Math.cos(a);
  const my = CY + RY * Math.sin(a);
  let ux = CX - mx, uy = CY - my;
  const l = Math.hypot(ux, uy);
  ux /= l; uy /= l;
  return { i, a, mx, my, ux, uy, vx: -uy, vy: ux };
}
function toWorld(f, lu, lv) {
  return { x: f.mx + f.ux * lu + f.vx * lv, y: f.my + f.uy * lu + f.vy * lv };
}
function toLocal(f, x, y) {
  const rx = x - f.mx, ry = y - f.my;
  return { u: rx * f.ux + ry * f.uy, v: rx * f.vx + ry * f.vy };
}

function segVerts(ax, ay, bx, by, t, ext = 0) {
  let dx = bx - ax, dy = by - ay;
  const l = Math.hypot(dx, dy) || 1;
  dx /= l; dy /= l;
  const nx = -dy * t / 2, ny = dx * t / 2;
  ax -= dx * ext; ay -= dy * ext; bx += dx * ext; by += dy * ext;
  return [
    new Vec2(ax + nx, ay + ny), new Vec2(bx + nx, by + ny),
    new Vec2(bx - nx, by - ny), new Vec2(ax - nx, ay - ny),
  ];
}

function buildTable(space) {
  _players = [];
  _bumpers = [];
  _slings = [];
  _ringWalls = [];
  _outline = [];

  const frames = [];
  for (let i = 0; i < N_PLAYERS; i++) frames.push(pocketFrame(i));

  // Ring walls: from pocket i's -v front corner, dipping inward, to pocket
  // i+1's +v front corner. A quadratic Bézier through the dip point.
  const ring = new Body(BodyType.STATIC);
  const ringMat = new Material(0.72, 0.1, 0.15, 1, 0.001);
  const front = FLIP_INSET - 2;
  for (let i = 0; i < N_PLAYERS; i++) {
    const f = frames[i], g = frames[(i + 1) % N_PLAYERS];
    const A = toWorld(f, front, -PW / 2);
    const B = toWorld(g, front, PW / 2);
    const am = f.a + Math.PI / 6;
    const px = CX + MID_K * RX * Math.cos(am), py = CY + MID_K * RY * Math.sin(am);
    const qx = 2 * px - 0.5 * (A.x + B.x), qy = 2 * py - 0.5 * (A.y + B.y);
    const pts = [];
    for (let s = 0; s <= RING_SEGS; s++) {
      const t = s / RING_SEGS, it = 1 - t;
      pts.push({ x: it * it * A.x + 2 * it * t * qx + t * t * B.x, y: it * it * A.y + 2 * it * t * qy + t * t * B.y });
    }
    for (let s = 0; s < RING_SEGS; s++) {
      const p = pts[s], q = pts[s + 1];
      ring.shapes.add(new Polygon(segVerts(p.x, p.y, q.x, q.y, WALL_T, 1.5), ringMat));
      _ringWalls.push({ ax: p.x, ay: p.y, bx: q.x, by: q.y });
    }
    f.ringPts = pts;

    // Slingshot at the dip: a triangular kicker facing the centre.
    const m = pts[RING_SEGS / 2];
    let nx = CX - m.x, ny = CY - m.y;
    const nl = Math.hypot(nx, ny);
    nx /= nl; ny /= nl;
    const tx = -ny, ty = nx;
    const sling = new Body(BodyType.STATIC);
    const half = 30, bulge = 15;
    sling.shapes.add(new Polygon([
      new Vec2(m.x - tx * half - nx * 2, m.y - ty * half - ny * 2),
      new Vec2(m.x + tx * half - nx * 2, m.y + ty * half - ny * 2),
      new Vec2(m.x + nx * bulge, m.y + ny * bulge),
    ], new Material(0.9, 0, 0, 1, 0.001)));
    sling.shapes.at(0).cbTypes.add(_cbSling);
    sling.userData._color = { fill: "rgba(120,220,255,0.25)", stroke: "#7fdcff" };
    const srec = { body: sling, x: m.x, y: m.y, nx, ny, tx, ty, half, bulge, flash: 0 };
    sling.userData._sling = srec;
    sling.space = space;
    _slings.push(srec);
  }
  ring.userData._color = { fill: "rgba(120,160,200,0.18)", stroke: "#6f8ca8" };
  ring.space = space;

  // Pockets and keepers.
  for (let i = 0; i < N_PLAYERS; i++) {
    const f = frames[i];
    const def = PLAYER_DEFS[i];
    const pocket = new Body(BodyType.STATIC);
    const pm = new Material(0.4, 0.08, 0.1, 1, 0.001);
    const cFL = toWorld(f, front, -PW / 2), cFR = toWorld(f, front, PW / 2);
    const cBL = toWorld(f, -PD, -PW / 2), cBR = toWorld(f, -PD, PW / 2);
    pocket.shapes.add(new Polygon(segVerts(cFL.x, cFL.y, cBL.x, cBL.y, WALL_T, WALL_T / 2), pm));
    pocket.shapes.add(new Polygon(segVerts(cFR.x, cFR.y, cBR.x, cBR.y, WALL_T, WALL_T / 2), pm));
    pocket.shapes.add(new Polygon(segVerts(cBL.x, cBL.y, cBR.x, cBR.y, WALL_T, WALL_T / 2), pm));
    pocket.userData._color = { fill: hexToRgba(def.color, 0.16), stroke: def.color };
    pocket.space = space;

    const pl = {
      id: i, def, frame: f, body: pocket,
      lives: START_LIVES, goals: 0, alive: true,
      flippers: [], seal: null,
      hitFlash: 0, goalFlash: 0, outT: 0,
      ai: { pressAt: [-1, -1], ignoreUntil: 0, react: 0.1 },
      rank: 0,
    };
    pl.flippers.push(makeFlipper(space, pl, -1));
    pl.flippers.push(makeFlipper(space, pl, 1));
    _players.push(pl);
  }

  // Table outline for the 3D platform: pocket boxes and ring curves.
  for (let i = 0; i < N_PLAYERS; i++) {
    const f = frames[i];
    const o = 12;
    _outline.push(toWorld(f, front, PW / 2 + o));
    _outline.push(toWorld(f, -PD - o, PW / 2 + o));
    _outline.push(toWorld(f, -PD - o, -PW / 2 - o));
    _outline.push(toWorld(f, front, -PW / 2 - o));
    const pts = f.ringPts;
    for (let s = 1; s < RING_SEGS; s++) {
      const p = pts[s];
      const dx = p.x - CX, dy = p.y - CY;
      const d = Math.hypot(dx, dy) || 1;
      _outline.push({ x: p.x + dx / d * o, y: p.y + dy / d * o });
    }
  }

  // Pop bumpers on a ring between the pocket lanes.
  const bumperMat = new Material(1.25, 0, 0, 1, 0.001);
  for (let i = 0; i < N_PLAYERS; i++) {
    const a = Math.PI / 2 + i * (Math.PI / 3) + Math.PI / 6;
    const x = CX + Math.cos(a) * BUMPER_RING_R * 1.15, y = CY + Math.sin(a) * BUMPER_RING_R * 0.92;
    const b = new Body(BodyType.STATIC, new Vec2(x, y));
    b.shapes.add(new Circle(BUMPER_R, undefined, bumperMat));
    b.shapes.at(0).cbTypes.add(_cbBumper);
    b.userData._color = { fill: "rgba(90,230,255,0.25)", stroke: "#5ce6ff" };
    const rec = { body: b, x, y, flash: 0, hits: 0 };
    b.userData._bumper = rec;
    b.space = space;
    _bumpers.push(rec);
  }

  // Spinning cross in the centre: launcher and randomiser in one.
  _cross = new Body(BodyType.KINEMATIC, new Vec2(CX, CY));
  _cross.shapes.add(new Polygon(Polygon.box(CROSS_ARM * 2, 8), CROSS_MAT));
  _cross.shapes.add(new Polygon(Polygon.rect(-4, -CROSS_ARM, 8, CROSS_ARM * 2), CROSS_MAT));
  _cross.shapes.add(new Circle(11, undefined, CROSS_MAT));
  _cross.userData._color = { fill: "rgba(255,210,120,0.25)", stroke: "#ffd166" };
  _cross.angularVel = CROSS_SPIN;
  _cross.space = space;
  _crossDir = 1;
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Flipper: kinematic body whose origin *is* the pivot, so the polygon's local
// +x axis is the paddle. Rotation = base + side * ang, where ang > 0 raises
// the paddle toward the table.
const FLIPPER_MAT = new Material(0.55, 0.06, 0.08, 1, 0.001);
const CROSS_MAT = new Material(0.7, 0.06, 0.08, 1, 0.001);

function makeFlipper(space, pl, side) {
  const f = pl.frame;
  const pivot = toWorld(f, 0, side * (PW / 2 - FLIP_INSET));
  const dirx = side < 0 ? f.vx : -f.vx, diry = side < 0 ? f.vy : -f.vy;
  const base = Math.atan2(diry, dirx);
  const body = new Body(BodyType.KINEMATIC, new Vec2(pivot.x, pivot.y));
  body.shapes.add(new Polygon([
    new Vec2(0, -5.5), new Vec2(FL, -3.4), new Vec2(FL, 3.4), new Vec2(0, 5.5),
  ], FLIPPER_MAT));
  body.shapes.add(new Circle(5.5, undefined, FLIPPER_MAT));
  body.shapes.add(new Circle(3.4, new Vec2(FL, 0), FLIPPER_MAT));
  for (let s = 0; s < 3; s++) body.shapes.at(s).cbTypes.add(_cbFlipper);
  body.rotation = base + side * FLIP_REST;
  body.userData._color = { fill: hexToRgba(pl.def.color, 0.45), stroke: pl.def.color };
  const rec = {
    pl, side, body, base, pivot, ang: FLIP_REST, pressed: false,
    hold: 0, cooldown: 0, hitFlash: 0, moving: false,
  };
  body.userData._flipper = rec;
  body.space = space;
  return rec;
}

function flipperRot(fl, ang) {
  return fl.base + fl.side * ang;
}

function tickFlipper(fl) {
  const target = fl.pressed ? FLIP_ACTIVE : FLIP_REST;
  const diff = target - fl.ang;
  const w = clamp(diff * 40, -FLIP_W, FLIP_W);
  const next = clamp(fl.ang + w * DT, FLIP_REST, FLIP_ACTIVE);
  fl.moving = Math.abs(next - fl.ang) > 0.02;
  fl.ang = next;
  fl.body.setVelocityFromTarget(new Vec2(fl.pivot.x, fl.pivot.y), flipperRot(fl, next), DT);
  if (fl.hitFlash > 0) fl.hitFlash--;
  if (fl.cooldown > 0) fl.cooldown--;
}

// ── Balls ────────────────────────────────────────────────────────────────
const BALL_MAT = new Material(0.86, 0.12, 0.18, 4, 0.006);

function spawnBall(bomb = false) {
  // Between two arms of the cross so the launcher flings it out.
  const k = Math.floor(rnd() * 4);
  const a = _cross.rotation + Math.PI / 4 + k * (Math.PI / 2);
  const r = 30;
  const body = new Body(BodyType.DYNAMIC, new Vec2(CX + Math.cos(a) * r, CY + Math.sin(a) * r));
  body.shapes.add(new Circle(bomb ? BOMB_R : BALL_R, undefined, BALL_MAT));
  body.shapes.at(0).cbTypes.add(_cbBall);
  body.isBullet = true;
  body.userData._color = bomb
    ? { fill: "rgba(40,40,48,0.9)", stroke: "#ff4d4d" }
    : { fill: "rgba(225,232,240,0.85)", stroke: "#ffffff" };
  const rec = {
    body, bomb, fuse: bomb ? BOMB_FUSE : 0, alive: true, lastHit: null, lastHitT: -1e9,
    age: 0, sinkT: 0, sinkX: 0, sinkY: 0, sinkAng: 0, x: body.position.x, y: body.position.y, near: -1,
    speed: 0,
  };
  body.userData._ball = rec;
  body.space = _space;
  body.velocity.setxy(Math.cos(a) * 140, Math.sin(a) * 140);
  _balls.push(rec);
  return rec;
}

function removeBall(rec) {
  if (!rec.alive) return;
  rec.alive = false;
  rec.sinkX = rec.body.position.x;
  rec.sinkY = rec.body.position.y;
  rec.body.space = null;
}

function liveBallCount() {
  let n = 0;
  for (const b of _balls) if (b.alive) n++;
  return n;
}

function targetBallCount() {
  if (_phase !== "play") return 3;
  const s = _clock / 60;
  if (s < 30) return 2;
  if (s < 75) return 3;
  if (s < 130) return 4;
  return 5;
}

function tickBalls() {
  for (const rec of _balls) {
    if (!rec.alive) { rec.sinkT++; continue; }
    const b = rec.body;
    const p = b.position;
    let vx = b.velocity.x, vy = b.velocity.y;
    // The table is an elliptical hill: the drift follows its gradient so the
    // wide side pockets see as many balls as the near top and bottom ones.
    const gx = (p.x - CX) / (RX * RX), gy = (p.y - CY) / (RY * RY);
    const gl = Math.hypot(gx, gy) || 1;
    vx += gx / gl * DRIFT * DT;
    vy += gy / gl * DRIFT * DT;
    const damp = 1 - DAMP * DT;
    vx *= damp; vy *= damp;
    const sp = Math.hypot(vx, vy);
    if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vy *= MAX_SPEED / sp; }
    b.velocity.setxy(vx, vy);
    rec.speed = sp;
    rec.x = p.x; rec.y = p.y;
    rec.age++;

    // Escaped the table (should not happen — CCD guards the thin walls).
    if (p.x < -20 || p.x > VIEW_W + 20 || p.y < -20 || p.y > VIEW_H + 20) {
      _stats.escapes++;
      removeBall(rec);
      rec.sinkT = 999;
      _pendingSpawns.push(_frame + 10);
      continue;
    }

    if (rec.bomb) {
      rec.fuse--;
      if (rec.fuse <= 0) { detonate(rec); continue; }
    }

    // Drain test against every live pocket (and approach bookkeeping for
    // the balance harness).
    for (const pl of _players) {
      if (!pl.alive) continue;
      const lc = toLocal(pl.frame, p.x, p.y);
      if (Math.abs(lc.v) < PW / 2) {
        if (lc.u < 40 && rec.near !== pl.id) { rec.near = pl.id; _stats.approaches[pl.id]++; }
        else if (lc.u > 70 && rec.near === pl.id) rec.near = -1;
      }
      if (lc.u < -18 && Math.abs(lc.v) < PW / 2) { drain(rec, pl); break; }
    }
  }
  // Drop finished sink animations.
  for (let i = _balls.length - 1; i >= 0; i--) {
    if (!_balls[i].alive && _balls[i].sinkT > 40) _balls.splice(i, 1);
  }
  // Respawns.
  for (let i = _pendingSpawns.length - 1; i >= 0; i--) {
    if (_frame >= _pendingSpawns[i]) {
      _pendingSpawns.splice(i, 1);
      if (liveBallCount() < targetBallCount() + 3) spawnBall(false);
    }
  }
  if (liveBallCount() + _pendingSpawns.length < targetBallCount()) _pendingSpawns.push(_frame + 30);
}

function drain(rec, pl) {
  const cost = rec.bomb ? 2 : 1;
  const m = toWorld(pl.frame, -PD * 0.55, 0);
  burst(m.x, m.y, rec.bomb ? 26 : 14, rec.bomb ? "#ff4d4d" : pl.def.color, rec.bomb ? 3.2 : 2.2);
  removeBall(rec);
  _stats.drains++;
  _stats.byPocket[pl.id]++;
  if (_phase === "play") {
    pl.lives = Math.max(0, pl.lives - cost);
    pl.hitFlash = 40;
    addFloat(m.x, m.y, `-${cost}`, "#ff6b6b");
    const shooter = rec.lastHit;
    if (shooter && shooter !== pl && shooter.alive && _frame - rec.lastHitT < GOAL_CREDIT_FRAMES) {
      shooter.goals++;
      shooter.goalFlash = 40;
      _stats.goals++;
      const sm = toWorld(shooter.frame, -PD * 0.5, 0);
      addFloat(sm.x, sm.y, "GOAL", shooter.def.color);
    }
    if (pl.lives <= 0) eliminate(pl);
  }
  _pendingSpawns.push(_frame + RESPAWN_DELAY);
}

function eliminate(pl) {
  pl.alive = false;
  pl.outT = _frame;
  for (const fl of pl.flippers) { fl.body.space = null; fl.pressed = false; }
  // Seal the mouth with a static bar.
  const f = pl.frame;
  const a = toWorld(f, 2, -PW / 2), b = toWorld(f, 2, PW / 2);
  // The bar is a kicker: a dead pocket throws balls back at the table instead
  // of collecting them against the drift.
  const seal = new Body(BodyType.STATIC);
  seal.shapes.add(new Polygon(segVerts(a.x, a.y, b.x, b.y, 10, 2), new Material(0.9, 0, 0, 1, 0.001)));
  seal.shapes.at(0).cbTypes.add(_cbSling);
  const sm = toWorld(f, 2, 0);
  seal.userData._sling = { x: sm.x, y: sm.y, nx: f.ux, ny: f.uy, tx: f.vx, ty: f.vy, half: PW / 2, bulge: 5, flash: 0, seal: true };
  seal.userData._color = { fill: "rgba(140,150,170,0.35)", stroke: "#8b93b8" };
  seal.space = _space;
  pl.seal = seal;
  pushBanner(`${pl.id === 0 ? "YOU ARE" : pl.def.name + " IS"} OUT`, pl.def.color, 150);
  // Any ball already inside the sealed pocket is pulled out.
  for (const rec of _balls) {
    if (!rec.alive) continue;
    const lc = toLocal(f, rec.body.position.x, rec.body.position.y);
    if (lc.u < 6 && Math.abs(lc.v) < PW / 2 + 4) { removeBall(rec); _pendingSpawns.push(_frame + 20); }
  }
  checkMatchEnd();
}

function detonate(rec) {
  const x = rec.body.position.x, y = rec.body.position.y;
  removeBall(rec);
  rec.sinkT = 999;
  _stats.bombs++;
  const R = 150;
  for (const o of _balls) {
    if (!o.alive) continue;
    const dx = o.body.position.x - x, dy = o.body.position.y - y;
    const d = Math.hypot(dx, dy);
    if (d > R || d < 1e-3) continue;
    const k = (1 - d / R) * 520;
    o.body.velocity.setxy(o.body.velocity.x + dx / d * k, o.body.velocity.y + dy / d * k);
    o.lastHit = null;
  }
  burst(x, y, 40, "#ff8a4d", 4.5);
  _fx.push({ kind: "ring", x, y, t: 0, life: 32, r: R, color: "#ff6b3d" });
  pushBanner("BOOM", "#ff8a4d", 70);
  _pendingSpawns.push(_frame + RESPAWN_DELAY);
}

// ── Listeners ────────────────────────────────────────────────────────────
function installListeners(space) {
  _cbBall = new CbType();
  _cbFlipper = new CbType();
  _cbBumper = new CbType();
  _cbSling = new CbType();

  const bodiesOf = (cb) => {
    const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
    const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
    return [b1, b2];
  };

  space.listeners.add(new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, _cbBumper, _cbBall, (cb) => {
    const [b1, b2] = bodiesOf(cb);
    const ballB = b1?.userData?._ball ? b1 : b2;
    const bumpB = ballB === b1 ? b2 : b1;
    const rec = ballB?.userData?._ball, bump = bumpB?.userData?._bumper;
    if (!rec || !bump || !rec.alive) return;
    const dx = ballB.position.x - bump.x, dy = ballB.position.y - bump.y;
    const d = Math.hypot(dx, dy) || 1;
    ballB.velocity.setxy(ballB.velocity.x + dx / d * BUMP_KICK, ballB.velocity.y + dy / d * BUMP_KICK);
    bump.flash = 18;
    bump.hits++;
    burst(bump.x + dx / d * BUMPER_R, bump.y + dy / d * BUMPER_R, 5, "#5ce6ff", 1.6);
  }));

  space.listeners.add(new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, _cbSling, _cbBall, (cb) => {
    const [b1, b2] = bodiesOf(cb);
    const ballB = b1?.userData?._ball ? b1 : b2;
    const slingB = ballB === b1 ? b2 : b1;
    const rec = ballB?.userData?._ball, s = slingB?.userData?._sling;
    if (!rec || !s || !rec.alive) return;
    ballB.velocity.setxy(ballB.velocity.x + s.nx * SLING_KICK, ballB.velocity.y + s.ny * SLING_KICK);
    s.flash = 14;
    burst(s.x + s.nx * s.bulge, s.y + s.ny * s.bulge, 4, "#7fdcff", 1.4);
  }));

  space.listeners.add(new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, _cbFlipper, _cbBall, (cb) => {
    const [b1, b2] = bodiesOf(cb);
    const ballB = b1?.userData?._ball ? b1 : b2;
    const flB = ballB === b1 ? b2 : b1;
    const rec = ballB?.userData?._ball, fl = flB?.userData?._flipper;
    if (!rec || !fl || !rec.alive) return;
    rec.lastHit = fl.pl;
    rec.lastHitT = _frame;
    if (fl.moving && fl.pressed) {
      const f = fl.pl.frame;
      ballB.velocity.setxy(ballB.velocity.x + f.ux * FLIP_BOOST, ballB.velocity.y + f.uy * FLIP_BOOST);
      fl.hitFlash = 10;
      _stats.flips++;
    }
  }));
}

// ── Effects ──────────────────────────────────────────────────────────────
function burst(x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const s = (0.4 + rnd() * 0.8) * speed * 60;
    _parts.push({
      x, y, z: 6 + rnd() * 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 60 + rnd() * 160,
      life: 22 + Math.floor(rnd() * 18), t: 0, color, size: 1.5 + rnd() * 2,
    });
  }
  if (_parts.length > 600) _parts.splice(0, _parts.length - 600);
}

function addFloat(x, y, text, color) {
  _fx.push({ kind: "float", x, y, t: 0, life: 70, text, color });
}

function pushBanner(text, color, life) {
  _banners.push({ text, color, t: 0, life });
  if (_banners.length > 3) _banners.shift();
}

function tickEffects() {
  for (let i = _parts.length - 1; i >= 0; i--) {
    const p = _parts[i];
    p.t++;
    if (p.t >= p.life) { _parts.splice(i, 1); continue; }
    p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT;
    p.vz -= 420 * DT;
    if (p.z < 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.7; p.vy *= 0.7; }
    p.vx *= 0.97; p.vy *= 0.97;
  }
  for (let i = _fx.length - 1; i >= 0; i--) {
    const f = _fx[i];
    f.t++;
    if (f.t >= f.life) _fx.splice(i, 1);
  }
  for (let i = _banners.length - 1; i >= 0; i--) {
    const b = _banners[i];
    b.t++;
    if (b.t >= b.life) _banners.splice(i, 1);
  }
  for (const b of _bumpers) if (b.flash > 0) b.flash--;
  for (const s of _slings) if (s.flash > 0) s.flash--;
  for (const pl of _players) {
    if (pl.hitFlash > 0) pl.hitFlash--;
    if (pl.goalFlash > 0) pl.goalFlash--;
  }
}

// ── AI keepers ───────────────────────────────────────────────────────────
// For every ball heading at the mouth, predict where along the mouth it will
// cross the flipper line and how soon. If it is within the reaction window
// the keeper schedules a press for the flipper on that side (both when the
// ball is near the middle), with a delay and a miss chance set by the
// difficulty. Slow balls crawling on a resting flipper get cleared too.
function tickAI(pl) {
  const diff = DIFFICULTIES[_difficulty];
  const f = pl.frame;
  let wantL = false, wantR = false;
  for (const rec of _balls) {
    if (!rec.alive) continue;
    const p = rec.body.position, v = rec.body.velocity;
    const lc = toLocal(f, p.x, p.y);
    if (lc.u < -6 || lc.u > 220 || Math.abs(lc.v) > PW) continue;
    const vu = v.x * f.ux + v.y * f.uy;
    const vv = v.x * f.vx + v.y * f.vy;
    if (vu < -25) {
      const t = (lc.u - 12) / (-vu);
      if (t < pl.ai.react && t > -0.03) {
        const lvp = lc.v + vv * Math.max(0, t);
        if (Math.abs(lvp) < PW / 2 + 6) {
          if (lvp < 14) wantL = true;
          if (lvp > -14) wantR = true;
        }
      }
    } else if (lc.u < 34 && Math.hypot(vu, vv) < 75 && Math.abs(lc.v) < PW / 2) {
      if (lc.v < 0) wantL = true; else wantR = true;
    }
  }
  const wants = [wantL, wantR];
  for (let s = 0; s < 2; s++) {
    const fl = pl.flippers[s];
    const want = wants[s];
    if (want && !fl.pressed && fl.cooldown === 0 && pl.ai.pressAt[s] < 0) {
      if (_frame < pl.ai.ignoreUntil) continue;
      if (rnd() < diff.miss) { pl.ai.ignoreUntil = _frame + 14; continue; }
      pl.ai.pressAt[s] = _frame + diff.delay + Math.floor(rnd() * (diff.delayJit + 1));
    }
    if (pl.ai.pressAt[s] >= 0 && _frame >= pl.ai.pressAt[s]) {
      pl.ai.pressAt[s] = -1;
      fl.pressed = true;
      fl.hold = FLIP_HOLD_AI;
      pl.ai.react = diff.react + (rnd() * 2 - 1) * diff.jitter;
    }
    if (fl.pressed && fl.hold > 0) {
      fl.hold--;
      if (fl.hold === 0) { fl.pressed = false; fl.cooldown = 5; }
    }
  }
}

function tickHuman(pl) {
  const left = !!(_keys.ArrowLeft || _keys.KeyA || _keys.KeyZ || _pointerSide < 0);
  const right = !!(_keys.ArrowRight || _keys.KeyD || _keys.KeyM || _pointerSide > 0);
  const both = !!(_keys.Space);
  pl.flippers[0].pressed = left || both;
  pl.flippers[1].pressed = right || both;
}

// ── Match flow ───────────────────────────────────────────────────────────
function resetMatch() {
  for (const rec of _balls) if (rec.alive) rec.body.space = null;
  _balls = [];
  _pendingSpawns = [];
  _parts = [];
  _fx = [];
  _banners = [];
  for (const pl of _players) {
    if (pl.seal) { pl.seal.space = null; pl.seal = null; }
    if (!pl.alive) for (const fl of pl.flippers) fl.body.space = _space;
    pl.alive = true;
    pl.lives = START_LIVES;
    pl.goals = 0;
    pl.hitFlash = 0; pl.goalFlash = 0; pl.outT = 0; pl.rank = 0;
    pl.ai.pressAt = [-1, -1]; pl.ai.ignoreUntil = 0;
    pl.ai.react = DIFFICULTIES[_difficulty].react;
    for (const fl of pl.flippers) { fl.pressed = false; fl.hold = 0; fl.cooldown = 0; }
  }
  _clock = 0;
  _nextBombAt = BOMB_EVERY;
  _multiballIdx = 0;
  _result = null;
  _stats = { drains: 0, escapes: 0, goals: 0, bombs: 0, flips: 0, byPocket: [0, 0, 0, 0, 0, 0], approaches: [0, 0, 0, 0, 0, 0] };
}

function startMatch() {
  resetMatch();
  _phase = "play";
  _phaseT = 0;
  spawnBall(false);
  spawnBall(false);
  pushBanner("GUARD YOUR POCKET", PLAYER_DEFS[0].color, 130);
}

function goTitle() {
  resetMatch();
  _phase = "title";
  _phaseT = 0;
  spawnBall(false);
  spawnBall(false);
  spawnBall(false);
}

function rankPlayers() {
  const order = _players.slice().sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.lives !== b.lives) return b.lives - a.lives;
    if (a.goals !== b.goals) return b.goals - a.goals;
    return b.outT - a.outT;
  });
  order.forEach((pl, i) => { pl.rank = i + 1; });
  return order;
}

function checkMatchEnd() {
  if (_phase !== "play") return;
  const alive = _players.filter((p) => p.alive);
  if (alive.length <= 1 || _clock >= MATCH_FRAMES) {
    const order = rankPlayers();
    _result = { order, winner: order[0], timeout: _clock >= MATCH_FRAMES };
    _phase = "over";
    _phaseT = 0;
    const w = order[0];
    pushBanner(w.id === 0 ? "YOU WIN" : `${w.def.name} WINS`, w.def.color, 240);
    for (const pl of _players) for (const fl of pl.flippers) fl.pressed = false;
  }
}

function tickSchedule() {
  if (_clock >= _nextBombAt) {
    _nextBombAt += BOMB_EVERY;
    spawnBall(true);
    pushBanner("BOMB BALL", "#ff4d4d", 100);
  }
  if (_multiballIdx < MULTIBALL_AT.length && _clock >= MULTIBALL_AT[_multiballIdx]) {
    _multiballIdx++;
    spawnBall(false);
    _pendingSpawns.push(_frame + 25);
    pushBanner("MULTIBALL", "#ffd166", 110);
  }
}

function tickCross() {
  if (_frame % (20 * 60) === 0 && _frame > 0) _crossDir = -_crossDir;
  const target = CROSS_SPIN * _crossDir;
  _cross.angularVel += (target - _cross.angularVel) * 0.04;
}

function primaryAction() {
  if (_phase === "title") { startMatch(); return true; }
  if (_phase === "over" && _phaseT > 40) { goTitle(); return true; }
  return false;
}

function tickGame() {
  _frame++;
  tickCross();
  for (const pl of _players) {
    if (!pl.alive) continue;
    if (pl.id === 0 && !_autopilot && _phase === "play") tickHuman(pl);
    else if (_phase !== "over") tickAI(pl);
    for (const fl of pl.flippers) tickFlipper(fl);
  }
  if (_phase === "play") {
    _clock++;
    tickSchedule();
    tickBalls();
    checkMatchEnd();
  } else {
    tickBalls();
  }
  tickEffects();
  _phaseT++;
}

// ── Overlay (every render mode) ──────────────────────────────────────────
const HUD_FONT = "'Segoe UI', system-ui, sans-serif";
const CARD_W = 140, CARD_H = 40;
// Tuned by eye against the flat table: clear of the pockets, the clock and
// the renderer buttons the page draws over the canvas' top right corner.
const CARD_SLOTS_2D = [
  [640, 462], [110, 455], [95, 100], [300, 40], [810, 92], [805, 452],
];
const DIFF_BTNS = [0, 1, 2].map((i) => ({ i, x: CX - 150 + i * 150, y: 326, w: 120, h: 30 }));

let _projV = null;

// World (x, y, z-up) → overlay canvas. Under the 3D camera this projects
// through the stored camera; in 2D the table fills the viewport unscaled.
function toScreen(x, y, z = 0) {
  if (_mode3d && _camProj && _frame3d === _drawFrame && _projV) {
    _projV.set(x, -y, z).project(_camProj);
    const dist = _camProj.position.distanceTo(_projV.set(x, -y, z));
    _projV.set(x, -y, z).project(_camProj);
    return { x: (_projV.x + 1) / 2 * VIEW_W, y: (1 - _projV.y) / 2 * VIEW_H, s: clamp(560 / dist, 0.5, 1.4) };
  }
  return { x, y, s: 1 };
}

function fmtTime(frames) {
  const s = Math.max(0, Math.ceil(frames / 60));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The play camera is fixed, so the 3D slots are tuned by eye to sit beside
// each pocket box without covering it.
const CARD_SLOTS_3D = [
  [640, 462], [78, 466], [78, 150], [450, 118], [822, 150], [822, 466],
];
function cardAnchor(pl) {
  const s = (_mode3d ? CARD_SLOTS_3D : CARD_SLOTS_2D)[pl.id];
  return { x: s[0], y: s[1] };
}

function drawCard(ctx, pl) {
  const a = cardAnchor(pl);
  const x = a.x - CARD_W / 2, y = a.y - CARD_H / 2;
  const c = pl.def.color;
  ctx.save();
  ctx.globalAlpha = pl.alive ? 0.92 : 0.6;
  roundRect(ctx, x, y, CARD_W, CARD_H, 6);
  ctx.fillStyle = pl.hitFlash > 0 ? hexToRgba("#ff5c5c", 0.35 + 0.4 * (pl.hitFlash / 40)) : "rgba(8,12,22,0.78)";
  ctx.fill();
  ctx.lineWidth = pl.goalFlash > 0 ? 3 : 1.5;
  ctx.strokeStyle = pl.goalFlash > 0 ? "#ffffff" : c;
  ctx.stroke();
  // Colour tab.
  ctx.fillStyle = c;
  ctx.fillRect(x, y + 6, 4, CARD_H - 12);
  ctx.fillStyle = "#e8eef8";
  ctx.font = `bold 13px ${HUD_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(pl.id === 0 ? "YOU" : pl.def.name, x + 12, y + 12);
  if (!pl.alive) {
    ctx.fillStyle = "#ff8a8a";
    ctx.font = `bold 11px ${HUD_FONT}`;
    ctx.fillText("OUT", x + 48, y + 12);
  }
  // Goals.
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd166";
  ctx.font = `bold 12px ${HUD_FONT}`;
  ctx.fillText(`${pl.goals} ⚑`, x + CARD_W - 8, y + 12);
  // Life pips.
  for (let i = 0; i < START_LIVES; i++) {
    const px = x + 14 + i * 24, py = y + 29;
    roundRect(ctx, px, py - 4, 18, 8, 3);
    ctx.fillStyle = i < pl.lives ? c : "rgba(255,255,255,0.10)";
    ctx.fill();
  }
  ctx.restore();
}

function drawTimer(ctx) {
  const x = 14, y = 12, w = 150, h = 46;
  ctx.save();
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = "rgba(8,12,22,0.78)";
  ctx.fill();
  ctx.strokeStyle = "#5ce6ff";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#8fb8c8";
  ctx.font = `bold 10px ${HUD_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const ff = _phase === "play" && !_players[0].alive && !_autopilot;
  ctx.fillText(_phase === "title" ? "ATTRACT MODE" : ff ? `TIME-LAPSE ×${FAST_FORWARD}` : "MATCH TIME", x + 10, y + 7);
  ctx.fillStyle = "#5ce6ff";
  ctx.font = `bold 22px ${HUD_FONT}`;
  ctx.fillText(_phase === "play" ? fmtTime(MATCH_FRAMES - _clock) : _phase === "over" ? fmtTime(MATCH_FRAMES - _clock) : "03:00", x + 10, y + 19);
  // Ball count and difficulty on the right.
  ctx.textAlign = "right";
  ctx.fillStyle = "#c9d6e2";
  ctx.font = `bold 10px ${HUD_FONT}`;
  ctx.fillText(`${DIFFICULTIES[_difficulty].name.toUpperCase()} AI`, x + w - 10, y + 7);
  ctx.fillText(`${liveBallCount()} BALL${liveBallCount() === 1 ? "" : "S"}`, x + w - 10, y + 30);
  ctx.restore();
}

function drawWorldCues(ctx) {
  ctx.save();
  // Bomb fuses.
  for (const rec of _balls) {
    if (!rec.alive || !rec.bomb) continue;
    const s = toScreen(rec.x, rec.y, BOMB_R);
    const k = rec.fuse / BOMB_FUSE;
    const r = (BOMB_R + 8) * s.s;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.strokeStyle = rec.fuse < 120 && (_frame >> 2) % 2 === 0 ? "#ffffff" : "#ff4d4d";
    ctx.lineWidth = 3 * s.s;
    ctx.stroke();
  }
  if (!_mode3d) {
    // Bumper and slingshot flashes, particles.
    for (const b of _bumpers) {
      if (b.flash <= 0) continue;
      const k = b.flash / 18;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BUMPER_R + 4 + (1 - k) * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(92,230,255,${k})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (const s of _slings) {
      if (s.flash <= 0) continue;
      const k = s.flash / 14;
      ctx.beginPath();
      ctx.moveTo(s.x - s.tx * s.half, s.y - s.ty * s.half);
      ctx.lineTo(s.x + s.tx * s.half, s.y + s.ty * s.half);
      ctx.strokeStyle = `rgba(127,220,255,${k})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    for (const p of _parts) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.z * 0.4, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Sink animation for drained balls.
    for (const rec of _balls) {
      if (rec.alive || rec.sinkT > 30) continue;
      const k = 1 - rec.sinkT / 30;
      ctx.globalAlpha = k;
      ctx.fillStyle = rec.bomb ? "#333" : "#dfe6ee";
      ctx.beginPath();
      ctx.arc(rec.sinkX, rec.sinkY, (rec.bomb ? BOMB_R : BALL_R) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Rings and floating text.
  for (const f of _fx) {
    const k = f.t / f.life;
    if (f.kind === "ring") {
      const s = toScreen(f.x, f.y, 4);
      ctx.beginPath();
      ctx.arc(s.x, s.y, f.r * k * s.s, 0, Math.PI * 2);
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 4 * s.s;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.kind === "float") {
      const s = toScreen(f.x, f.y, 20 + k * 40);
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = f.color;
      ctx.font = `bold ${Math.round(16 * s.s)}px ${HUD_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(f.text, s.x, s.y - (_mode3d ? 0 : k * 30));
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

function drawBanners(ctx) {
  let y = 92;
  for (const b of _banners) {
    const k = b.t / b.life;
    const a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `bold 30px ${HUD_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.strokeText(b.text, CX, y);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, CX, y);
    ctx.restore();
    y += 36;
  }
}

function drawHints(ctx) {
  if (_phase !== "play" || _clock > 8 * 60) return;
  const a = _clock > 6 * 60 ? 1 - (_clock - 6 * 60) / 120 : 1;
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  ctx.font = `bold 12px ${HUD_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const x = 268, y = 462;
  roundRect(ctx, x - 100, y - 18, 200, 36, 6);
  ctx.fillStyle = "rgba(8,12,22,0.78)";
  ctx.fill();
  ctx.fillStyle = "#c9d6e2";
  ctx.fillText("← / A  left flipper   → / D  right", x, y - 7);
  ctx.fillStyle = "#8fb8c8";
  ctx.fillText("SPACE both · touch left / right half", x, y + 8);
  ctx.restore();
}

function drawTitle(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(4,6,14,0.40)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 58px ${HUD_FONT}`;
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.strokeText("FLIPPER FRAY", CX, 150);
  const g = ctx.createLinearGradient(CX - 220, 0, CX + 220, 0);
  g.addColorStop(0, "#5ce6ff");
  g.addColorStop(0.5, "#ffffff");
  g.addColorStop(1, "#ff5c5c");
  ctx.fillStyle = g;
  ctx.fillText("FLIPPER FRAY", CX, 150);
  ctx.font = `bold 16px ${HUD_FONT}`;
  ctx.fillStyle = "#c9d6e2";
  ctx.fillText("Six pockets. Five lives each. Every ball that gets past your flippers is yours to pay for.", CX, 200);
  ctx.fillStyle = "#8fb8c8";
  ctx.font = `13px ${HUD_FONT}`;
  ctx.fillText("Bomb balls cost two and detonate if nobody swallows them · multiball every so often · last pocket standing wins", CX, 226);

  ctx.font = `bold 12px ${HUD_FONT}`;
  ctx.fillStyle = "#c9d6e2";
  ctx.fillText("AI KEEPERS", CX, 296);
  for (const b of DIFF_BTNS) {
    const on = b.i === _difficulty;
    roundRect(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 6);
    ctx.fillStyle = on ? "rgba(92,230,255,0.25)" : "rgba(8,12,22,0.7)";
    ctx.fill();
    ctx.strokeStyle = on ? "#5ce6ff" : "#3a4a5c";
    ctx.lineWidth = on ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = on ? "#ffffff" : "#8fb8c8";
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.fillText(`${b.i + 1}  ${DIFFICULTIES[b.i].name}`, b.x, b.y);
  }
  const blink = (_frame >> 5) % 2 === 0;
  ctx.fillStyle = blink ? "#ffffff" : "#c9d6e2";
  ctx.font = `bold 18px ${HUD_FONT}`;
  ctx.fillText("SPACE  or click to start", CX, 385);
  ctx.fillStyle = "#8fb8c8";
  ctx.font = `12px ${HUD_FONT}`;
  ctx.fillText("← → / A D flip · SPACE both flippers · touch: left or right half of the screen", CX, 415);
  ctx.restore();
}

function drawOver(ctx) {
  if (!_result) return;
  const k = clamp(_phaseT / 30, 0, 1);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = "rgba(4,6,14,0.62)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = _result.winner;
  ctx.font = `bold 46px ${HUD_FONT}`;
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  const title = w.id === 0 ? "YOU WIN" : `${w.def.name} TAKES THE TABLE`;
  ctx.strokeText(title, CX, 70);
  ctx.fillStyle = w.def.color;
  ctx.fillText(title, CX, 70);
  ctx.font = `13px ${HUD_FONT}`;
  ctx.fillStyle = "#8fb8c8";
  ctx.fillText(_result.timeout ? "Time is up — ranked by lives, then goals." : "Last pocket standing.", CX, 104);

  const rows = _result.order;
  const x0 = CX - 190, y0 = 132, rh = 34;
  ctx.font = `bold 11px ${HUD_FONT}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#8fb8c8";
  ctx.fillText("RANK", x0 + 12, y0 - 8);
  ctx.fillText("KEEPER", x0 + 70, y0 - 8);
  ctx.textAlign = "right";
  ctx.fillText("LIVES", x0 + 270, y0 - 8);
  ctx.fillText("GOALS", x0 + 360, y0 - 8);
  rows.forEach((pl, i) => {
    const y = y0 + 6 + i * rh;
    roundRect(ctx, x0, y, 380, rh - 6, 5);
    ctx.fillStyle = pl.id === 0 ? "rgba(255,92,92,0.18)" : "rgba(8,12,22,0.7)";
    ctx.fill();
    ctx.strokeStyle = pl.def.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#e8eef8";
    ctx.font = `bold 14px ${HUD_FONT}`;
    ctx.fillText(`#${i + 1}`, x0 + 12, y + (rh - 6) / 2);
    ctx.fillStyle = pl.def.color;
    ctx.fillText(pl.id === 0 ? "YOU" : pl.def.name, x0 + 70, y + (rh - 6) / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#e8eef8";
    ctx.fillText(pl.alive ? String(pl.lives) : "OUT", x0 + 270, y + (rh - 6) / 2);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(String(pl.goals), x0 + 360, y + (rh - 6) / 2);
  });
  ctx.textAlign = "center";
  const blink = (_frame >> 5) % 2 === 0;
  ctx.fillStyle = blink ? "#ffffff" : "#c9d6e2";
  ctx.font = `bold 15px ${HUD_FONT}`;
  ctx.fillText("SPACE  or click for the title", CX, 372);
  ctx.restore();
}

function drawOverlay(ctx) {
  drawWorldCues(ctx);
  // The result table repeats every keeper's lives and goals, so the cards and
  // the clock step aside for it.
  if (_phase === "play") {
    drawTimer(ctx);
    for (const pl of _players) drawCard(ctx, pl);
  }
  drawHints(ctx);
  drawBanners(ctx);
  if (_phase === "title") drawTitle(ctx);
  else if (_phase === "over") drawOver(ctx);
}

function diffButtonAt(x, y) {
  for (const b of DIFF_BTNS) {
    if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.h / 2) return b.i;
  }
  return -1;
}

// ── 3D ───────────────────────────────────────────────────────────────────
let _THREE = null;
let _scene3d = null;
let _g3 = null;
let _camPos = null;
let _camTgt = null;
let _lookM = null;
let _upZ = null;
let _dummy = null;
let _colTmp = null;

const WALL_H = 22;
const BALL_POOL = 14;
const PART_CAP = 600;

function ensureScene(adapter, scene, renderer) {
  if (_scene3d === scene) return;
  const T = _THREE;
  // Re-load of the demo while the 3D adapter stayed attached: drop what the
  // previous play left in the scene.
  if (_g3 && _g3.scene === scene) {
    for (const m of _g3.all) adapter.removeSceneMesh(m);
  }
  _scene3d = scene;
  _projV = new T.Vector3();
  _lookM = new T.Matrix4();
  _upZ = new T.Vector3(0, 0, 1);
  _dummy = new T.Object3D();
  _colTmp = new T.Color();
  _camPos = null;
  _camTgt = null;
  const g = { scene, all: [], pockets: [], flippers: new Map(), bumpers: [], slings: [], balls: [], rings: [] };
  _g3 = g;
  const add = (m) => { adapter.addSceneMesh(m); g.all.push(m); return m; };

  scene.background = new T.Color(0x04060c);
  scene.fog = new T.Fog(0x04060c, 1000, 2600);
  let di = 0;
  for (const c of scene.children) {
    if (c.isLineSegments) c.visible = false;
    if (c.isDirectionalLight) {
      if (di === 0) { c.color.setHex(0xdfe8ff); c.intensity = 1.5; c.position.set(-300, 500, 900); }
      else if (di === 1) { c.color.setHex(0x4c8dff); c.intensity = 0.45; c.position.set(1400, -200, 500); }
      else { c.color.setHex(0xff9a6a); c.intensity = 0.35; c.position.set(450, 900, 300); }
      di++;
    }
    if (c.isAmbientLight) { c.color.setHex(0x2b3b54); c.intensity = 2.0; }
  }
  const lamp = add(new T.PointLight(0x9fe8ff, 2.1, 1200, 1.35));
  lamp.position.set(CX, -CY, 300);
  g.lamp = lamp;

  // Environment map for the chrome. Without one a fully metallic material
  // renders black, so the fallback is a brighter, less metallic finish.
  g.envOk = false;
  if (renderer && T.PMREMGenerator) {
    try {
      const pm = new T.PMREMGenerator(renderer);
      const envTex = makeEnvTexture();
      const env = pm.fromEquirectangular(envTex).texture;
      if (env) { scene.environment = env; g.envOk = true; }
      envTex.dispose();
      pm.dispose();
    } catch (_) { g.envOk = false; }
  }

  // Hall: light-panel ring and floor.
  const hallGeo = new T.CylinderGeometry(1500, 1500, 900, 72, 1, true);
  hallGeo.rotateX(Math.PI / 2);
  const hall = add(new T.Mesh(hallGeo, new T.MeshBasicMaterial({ map: makePanelTexture(), side: T.BackSide, fog: false })));
  hall.position.set(CX, -CY, 330);
  const floorTex = makeFloorTexture();
  const floor = add(new T.Mesh(new T.CircleGeometry(1500, 72), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.05 })));
  floor.position.set(CX, -CY, -46);
  for (const [r, w, hex, op] of [[560, 10, 0x36c9e8, 0.8], [760, 6, 0x36c9e8, 0.45], [980, 6, 0xd35cff, 0.3]]) {
    const ring = add(new T.Mesh(new T.RingGeometry(r, r + w, 96), new T.MeshBasicMaterial({ color: hex, transparent: true, opacity: op })));
    ring.position.set(CX, -CY, -45);
  }
  // Plinth under the table.
  const plinth = add(new T.Mesh(new T.CylinderGeometry(330, 380, 46, 48), new T.MeshStandardMaterial({ color: 0x141a26, roughness: 0.8, metalness: 0.3 })));
  plinth.geometry.rotateX(Math.PI / 2);
  plinth.scale.set(1.28, 1, 1);
  plinth.position.set(CX, -CY, -23 - 8);

  // Table platform: the star outline extruded, lane-light texture on top.
  const shape = new T.Shape(_outline.map((p) => new T.Vector2(p.x, -p.y)));
  const depth = 30, bevelT = 4;
  const tableGeo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 6, bevelThickness: bevelT, bevelSegments: 3 });
  tableGeo.translate(0, 0, -(depth + bevelT));
  tableGeo.computeVertexNormals();
  const tableTex = makeTableTexture();
  tableTex.wrapS = tableTex.wrapT = T.RepeatWrapping;
  tableTex.repeat.set(1 / VIEW_W, 1 / VIEW_H);
  const topMat = new T.MeshStandardMaterial({ map: tableTex, roughness: 0.62, metalness: 0.25 });
  const sideMat = new T.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.5, metalness: 0.55 });
  add(new T.Mesh(tableGeo, [topMat, sideMat]));

  // Ring walls (instanced) with a glowing rubber strip on top.
  const box = new T.BoxGeometry(1, 1, 1);
  g.box = box;
  const wallMat = new T.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.5, metalness: 0.6 });
  const stripMat = new T.MeshStandardMaterial({ color: 0x0b2a33, emissive: 0x36c9e8, emissiveIntensity: 0.9, roughness: 0.4 });
  const walls = add(new T.InstancedMesh(box, wallMat, _ringWalls.length));
  const strips = add(new T.InstancedMesh(box, stripMat, _ringWalls.length));
  _ringWalls.forEach((s, i) => {
    const mx = (s.ax + s.bx) / 2, my = (s.ay + s.by) / 2;
    const len = Math.hypot(s.bx - s.ax, s.by - s.ay) + 3;
    const ang = -Math.atan2(s.by - s.ay, s.bx - s.ax);
    _dummy.position.set(mx, -my, WALL_H / 2);
    _dummy.rotation.set(0, 0, ang);
    _dummy.scale.set(len, WALL_T, WALL_H);
    _dummy.updateMatrix();
    walls.setMatrixAt(i, _dummy.matrix);
    _dummy.position.z = WALL_H + 1;
    _dummy.scale.set(len, WALL_T * 0.55, 2.2);
    _dummy.updateMatrix();
    strips.setMatrixAt(i, _dummy.matrix);
  });

  // Slingshots: a low dark wedge with a glowing rubber cap along its face.
  for (const s of _slings) {
    const tri = new T.Shape([
      new T.Vector2(-s.half, 0), new T.Vector2(s.half, 0), new T.Vector2(0, s.bulge + 2),
    ]);
    const grp = new T.Group();
    const body = new T.Mesh(new T.ExtrudeGeometry(tri, { depth: 12, bevelEnabled: false }), wallMat);
    grp.add(body);
    const mat = new T.MeshStandardMaterial({ color: 0x0b2a33, emissive: 0x36c9e8, emissiveIntensity: 0.6, roughness: 0.4 });
    const cap = new T.Mesh(new T.ExtrudeGeometry(tri, { depth: 2.4, bevelEnabled: false }), mat);
    cap.position.z = 12;
    cap.scale.set(0.92, 0.92, 1);
    grp.add(cap);
    // Local +y (toward the tip) must point along the inward normal; three's y
    // is world -y, so the tangent basis is mirrored.
    const ang = Math.atan2(-s.ny, s.nx) - Math.PI / 2;
    grp.position.set(s.x - s.nx * 2, -(s.y - s.ny * 2), 0);
    grp.rotation.z = ang;
    add(grp);
    g.slings.push({ rec: s, mesh: grp, mat });
  }

  // Pockets: coloured box walls, floor plate, life lamps, seal panel.
  for (const pl of _players) {
    const f = pl.frame;
    const hex = pl.def.hex;
    const wallM = new T.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.45, roughness: 0.45, metalness: 0.3 });
    const grp = new T.Group();
    const H = WALL_H + 6;
    const mk = (lu, lv, len, along, t) => {
      const w = toWorld(f, lu, lv);
      const m = new T.Mesh(box, wallM);
      m.position.set(w.x, -w.y, H / 2);
      const ang = along === "u" ? -Math.atan2(f.uy, f.ux) : -Math.atan2(f.vy, f.vx);
      m.rotation.z = ang;
      m.scale.set(len, t, H);
      grp.add(m);
      return m;
    };
    const front = FLIP_INSET - 2;
    const sideLen = PD + front + WALL_T;
    mk((front - PD) / 2, -PW / 2, sideLen, "u", WALL_T);
    mk((front - PD) / 2, PW / 2, sideLen, "u", WALL_T);
    mk(-PD, 0, PW + WALL_T, "v", WALL_T);
    // Floor plate, slightly sunk and dark.
    const plateM = new T.MeshStandardMaterial({ color: 0x0c1018, emissive: hex, emissiveIntensity: 0.08, roughness: 0.7, metalness: 0.3 });
    const plate = new T.Mesh(box, plateM);
    const pc = toWorld(f, -(PD - front) / 2 + front, 0);
    plate.position.set(pc.x, -pc.y, 0.6);
    plate.rotation.z = -Math.atan2(f.uy, f.ux);
    plate.scale.set(PD - front, PW - WALL_T, 1.2);
    grp.add(plate);
    // Life lamps on the back wall.
    const lamps = [];
    const lampOff = new T.MeshStandardMaterial({ color: 0x141820, roughness: 0.5 });
    for (let i = 0; i < START_LIVES; i++) {
      const lv = (i - (START_LIVES - 1) / 2) * 18;
      const w = toWorld(f, -PD, lv);
      const lm = new T.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 1.6, roughness: 0.3 });
      const m = new T.Mesh(box, lm);
      m.position.set(w.x, -w.y, H + 3);
      m.rotation.z = -Math.atan2(f.vy, f.vx);
      m.scale.set(10, WALL_T + 2, 5);
      grp.add(m);
      lamps.push({ mesh: m, on: lm, off: lampOff });
    }
    // Seal panel, hidden until the keeper is out.
    const sealM = new T.MeshStandardMaterial({ color: 0x8b93b8, emissive: 0x8b93b8, emissiveIntensity: 0.3, transparent: true, opacity: 0.85, roughness: 0.3, metalness: 0.6 });
    const seal = new T.Mesh(box, sealM);
    const sw = toWorld(f, 2, 0);
    seal.position.set(sw.x, -sw.y, -20);
    seal.rotation.z = -Math.atan2(f.vy, f.vx);
    seal.scale.set(PW + 2, 10, 26);
    seal.visible = false;
    grp.add(seal);
    add(grp);
    g.pockets.push({ pl, grp, wallM, plateM, lamps, seal });

    // Flippers.
    for (const fl of pl.flippers) {
      const fg = new T.Group();
      const flM = new T.MeshStandardMaterial({ color: 0xe3e8ef, metalness: 0.85, roughness: 0.22, emissive: hex, emissiveIntensity: 0.18 });
      const cap = new T.CapsuleGeometry(5.2, FL - 6, 4, 14);
      cap.rotateZ(-Math.PI / 2);
      cap.translate(FL / 2 - 1, 0, 0);
      const paddle = new T.Mesh(cap, flM);
      paddle.scale.set(1, 1, 0.8);
      fg.add(paddle);
      const pivot = new T.Mesh(new T.CylinderGeometry(6.5, 7.5, 16, 16).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: 0x2a3344, metalness: 0.7, roughness: 0.4 }));
      pivot.position.z = 8;
      fg.add(pivot);
      const band = new T.Mesh(new T.CylinderGeometry(6.2, 6.2, 3, 16).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.9 }));
      band.position.z = 16.5;
      fg.add(band);
      fg.position.set(fl.pivot.x, -fl.pivot.y, 8.5);
      add(fg);
      g.flippers.set(fl, { grp: fg, mat: flM });
    }
  }

  // Bumpers.
  const capGeo = new T.CylinderGeometry(1, 1, 1, 24).rotateX(Math.PI / 2);
  for (const b of _bumpers) {
    const grp = new T.Group();
    const base = new T.Mesh(capGeo, new T.MeshStandardMaterial({ color: 0x1c2532, roughness: 0.5, metalness: 0.6 }));
    base.scale.set(BUMPER_R, BUMPER_R, 9);
    base.position.z = 4.5;
    grp.add(base);
    const capM = new T.MeshStandardMaterial({ color: 0x0b2a33, emissive: 0x36c9e8, emissiveIntensity: 0.8, roughness: 0.3 });
    const cap = new T.Mesh(capGeo, capM);
    cap.scale.set(BUMPER_R - 1.5, BUMPER_R - 1.5, 5);
    cap.position.z = 11.5;
    grp.add(cap);
    const top = new T.Mesh(capGeo, new T.MeshStandardMaterial({ color: 0x1c2532, roughness: 0.4, metalness: 0.7 }));
    top.scale.set(BUMPER_R - 4, BUMPER_R - 4, 4);
    top.position.z = 16;
    grp.add(top);
    const dome = new T.Mesh(new T.SphereGeometry(5, 16, 12), capM);
    dome.position.z = 19;
    grp.add(dome);
    const glowM = new T.MeshBasicMaterial({ color: 0x5ce6ff, transparent: true, opacity: 0, depthWrite: false });
    const glow = new T.Mesh(new T.CircleGeometry(BUMPER_R * 2.6, 32), glowM);
    glow.position.z = 0.5;
    grp.add(glow);
    grp.position.set(b.x, -b.y, 0);
    add(grp);
    g.bumpers.push({ rec: b, grp, capM, glowM, cap, dome });
  }

  // Spinning cross.
  {
    const grp = new T.Group();
    const armM = new T.MeshStandardMaterial({ color: 0x3a4456, metalness: 0.75, roughness: 0.3 });
    const tipM = new T.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.9 });
    for (let k = 0; k < 2; k++) {
      const arm = new T.Mesh(box, armM);
      arm.scale.set(CROSS_ARM * 2, 8, 8);
      arm.position.z = 5;
      arm.rotation.z = k * Math.PI / 2;
      grp.add(arm);
      for (const sgn of [-1, 1]) {
        const tip = new T.Mesh(box, tipM);
        tip.scale.set(9, 9, 10);
        tip.position.set(k === 0 ? sgn * (CROSS_ARM - 3) : 0, k === 1 ? sgn * (CROSS_ARM - 3) : 0, 6);
        grp.add(tip);
      }
    }
    const hub = new T.Mesh(capGeo, new T.MeshStandardMaterial({ color: 0x1c2532, metalness: 0.7, roughness: 0.35 }));
    hub.scale.set(11, 11, 16);
    hub.position.z = 8;
    grp.add(hub);
    const hubTop = new T.Mesh(capGeo, tipM);
    hubTop.scale.set(6, 6, 3);
    hubTop.position.z = 17;
    grp.add(hubTop);
    grp.position.set(CX, -CY, 0);
    add(grp);
    g.cross = grp;
  }

  // Ball pool.
  g.sphere = new T.SphereGeometry(1, 28, 20);
  g.shadowGeo = new T.CircleGeometry(1, 20);
  g.chromeM = g.envOk
    ? new T.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.12 })
    : new T.MeshStandardMaterial({ color: 0xe6ecf4, metalness: 0.45, roughness: 0.25 });
  g.bombM = new T.MeshStandardMaterial({ color: 0x0a0a0d, metalness: 0.6, roughness: 0.35, emissive: 0xff2020, emissiveIntensity: 0.4 });
  g.shadowM = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });
  for (let i = 0; i < BALL_POOL; i++) {
    const m = add(new T.Mesh(g.sphere, g.chromeM));
    const sh = add(new T.Mesh(g.shadowGeo, g.shadowM));
    sh.position.z = 0.4;
    m.visible = false; sh.visible = false;
    g.balls.push({ mesh: m, shadow: sh });
  }

  // Particles and shock rings.
  g.parts = add(new T.InstancedMesh(box, new T.MeshBasicMaterial({ color: 0xffffff }), PART_CAP));
  g.parts.count = 0;
  for (let i = 0; i < 4; i++) {
    const m = add(new T.Mesh(new T.RingGeometry(0.9, 1, 56), new T.MeshBasicMaterial({ color: 0xff6b3d, transparent: true, opacity: 0, depthWrite: false })));
    m.position.z = 3;
    m.visible = false;
    g.rings.push(m);
  }
  void adapter;
}

// ── 3D: textures ─────────────────────────────────────────────────────────
function texCanvas(w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  return [cv, cv.getContext("2d")];
}

function makeEnvTexture() {
  const T = _THREE;
  const [cv, c] = texCanvas(512, 256);
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#c8d8ff");
  g.addColorStop(0.18, "#1a2030");
  g.addColorStop(0.5, "#0a0d16");
  g.addColorStop(0.62, "#05070c");
  g.addColorStop(1, "#02030a");
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 256);
  // Panel strips along the horizon, the way the hall looks.
  for (let x = 0; x < 512; x += 32) {
    c.fillStyle = (x / 32) % 3 === 0 ? "rgba(92,230,255,0.85)" : "rgba(40,60,90,0.5)";
    c.fillRect(x + 4, 96, 14, 60);
  }
  c.fillStyle = "rgba(255,255,255,0.9)";
  c.fillRect(120, 10, 90, 22);
  c.fillRect(330, 14, 60, 18);
  const tex = new T.CanvasTexture(cv);
  tex.mapping = T.EquirectangularReflectionMapping;
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

function makePanelTexture() {
  const T = _THREE;
  const [cv, c] = texCanvas(2048, 512);
  c.fillStyle = "#0b0f18";
  c.fillRect(0, 0, 2048, 512);
  const cols = 36;
  const cw = 2048 / cols;
  for (let i = 0; i < cols; i++) {
    const x = i * cw;
    c.fillStyle = "#182030";
    c.fillRect(x + 3, 0, cw - 6, 512);
    c.fillStyle = "#0a0e16";
    c.fillRect(x + 3, 0, cw - 6, 4);
    // Glass strip.
    const lit = i % 3 !== 1;
    const gg = c.createLinearGradient(0, 120, 0, 400);
    gg.addColorStop(0, lit ? "#6fefff" : "#1c2a3a");
    gg.addColorStop(0.5, lit ? "#2ac4e8" : "#182535");
    gg.addColorStop(1, lit ? "#5ce6ff" : "#1c2a3a");
    c.fillStyle = gg;
    c.fillRect(x + cw * 0.22, 120, cw * 0.56, 280);
    c.fillStyle = "rgba(255,255,255,0.25)";
    c.fillRect(x + cw * 0.22, 120, cw * 0.56, 6);
    c.fillStyle = "#1d2636";
    c.fillRect(x + 3, 400, cw - 6, 112);
    c.fillStyle = i % 4 === 0 ? "#d35cff" : "#36c9e8";
    c.fillRect(x + cw * 0.3, 440, cw * 0.4, 5);
  }
  c.fillStyle = "rgba(0,0,0,0.35)";
  c.fillRect(0, 0, 2048, 60);
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = T.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

function makeFloorTexture() {
  const T = _THREE;
  const S = 1024;
  const [cv, c] = texCanvas(S, S);
  c.fillStyle = "#171c26";
  c.fillRect(0, 0, S, S);
  const rr = srand(99);
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = `rgba(${rr() < 0.5 ? "255,255,255" : "0,0,0"},${0.02 + rr() * 0.05})`;
    c.fillRect(rr() * S, rr() * S, 2 + rr() * 6, 2 + rr() * 6);
  }
  // Radial tile seams.
  const cx = S / 2, cy = S / 2;
  c.strokeStyle = "rgba(0,0,0,0.5)";
  c.lineWidth = 3;
  for (let r = 90; r < S; r += 70) {
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  }
  for (let k = 0; k < 36; k++) {
    const a = k / 36 * Math.PI * 2;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
    c.lineTo(cx + Math.cos(a) * S, cy + Math.sin(a) * S); c.stroke();
  }
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

function srand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function makeTableTexture() {
  const T = _THREE;
  const k = 2;
  const [cv, c] = texCanvas(VIEW_W * k, VIEW_H * k);
  c.scale(k, k);
  c.fillStyle = "#262c38";
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  const rr = srand(2024);
  for (let i = 0; i < 5000; i++) {
    c.fillStyle = `rgba(${rr() < 0.5 ? "255,255,255" : "0,0,0"},${0.02 + rr() * 0.05})`;
    c.fillRect(rr() * VIEW_W, rr() * VIEW_H, 1 + rr() * 3, 1 + rr() * 3);
  }
  // Hex grid.
  c.strokeStyle = "rgba(255,255,255,0.045)";
  c.lineWidth = 1;
  const hr = 16;
  for (let row = -1; row < VIEW_H / (hr * 1.5) + 1; row++) {
    for (let col = -1; col < VIEW_W / (hr * 1.732) + 1; col++) {
      const x = col * hr * 1.732 + (row % 2 ? hr * 0.866 : 0);
      const y = row * hr * 1.5;
      c.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = Math.PI / 6 + s * Math.PI / 3;
        const px = x + Math.cos(a) * hr, py = y + Math.sin(a) * hr;
        if (s === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
      c.stroke();
    }
  }
  // Lane lights toward each pocket, in the keeper's colour.
  for (const pl of _players) {
    const f = pl.frame;
    const a = toWorld(f, 150, 0), b = toWorld(f, 44, 0);
    const gr = c.createLinearGradient(a.x, a.y, b.x, b.y);
    gr.addColorStop(0, hexToRgba(pl.def.color, 0));
    gr.addColorStop(1, hexToRgba(pl.def.color, 0.75));
    c.strokeStyle = gr;
    c.lineWidth = 4;
    c.shadowColor = pl.def.color;
    c.shadowBlur = 14;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.shadowBlur = 0;
    // Arrow chevrons.
    for (let s = 60; s <= 130; s += 24) {
      const p = toWorld(f, s, 0);
      c.fillStyle = hexToRgba(pl.def.color, 0.55);
      c.beginPath();
      const l1 = toWorld(f, s + 7, -9), l2 = toWorld(f, s + 7, 9), tip = toWorld(f, s - 4, 0);
      c.moveTo(l1.x, l1.y); c.lineTo(tip.x, tip.y); c.lineTo(l2.x, l2.y);
      c.lineWidth = 3;
      c.strokeStyle = hexToRgba(pl.def.color, 0.6);
      c.stroke();
      void p;
    }
    // Mouth apron.
    const m1 = toWorld(f, 2, -PW / 2), m2 = toWorld(f, 2, PW / 2);
    c.strokeStyle = hexToRgba(pl.def.color, 0.9);
    c.lineWidth = 3;
    c.shadowColor = pl.def.color;
    c.shadowBlur = 10;
    c.beginPath(); c.moveTo(m1.x, m1.y); c.lineTo(m2.x, m2.y); c.stroke();
    c.shadowBlur = 0;
  }
  // Centre medallion.
  c.strokeStyle = "rgba(92,230,255,0.55)";
  c.lineWidth = 3;
  c.shadowColor = "#5ce6ff";
  c.shadowBlur = 12;
  c.beginPath(); c.arc(CX, CY, 70, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(CX, CY, 22, 0, Math.PI * 2); c.stroke();
  c.shadowBlur = 0;
  c.strokeStyle = "rgba(92,230,255,0.18)";
  c.lineWidth = 1.5;
  c.beginPath(); c.ellipse(CX, CY, BUMPER_RING_R * 1.15, BUMPER_RING_R * 0.92, 0, 0, Math.PI * 2); c.stroke();
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ── 3D: per-frame sync ───────────────────────────────────────────────────
function syncScene3d() {
  const g = _g3;
  const T = _THREE;
  // Flippers.
  for (const [fl, e] of g.flippers) {
    e.grp.visible = fl.pl.alive;
    e.grp.rotation.z = -fl.body.rotation;
    e.mat.emissiveIntensity = fl.hitFlash > 0 ? 0.18 + 1.2 * (fl.hitFlash / 10) : 0.18;
  }
  // Pockets: lamps, hit flash, seal.
  for (const p of g.pockets) {
    const pl = p.pl;
    p.wallM.emissiveIntensity = pl.alive ? 0.45 + (pl.hitFlash > 0 ? 1.1 * (pl.hitFlash / 40) : 0) + (pl.goalFlash > 0 ? 0.5 * (pl.goalFlash / 40) : 0) : 0.06;
    p.plateM.emissiveIntensity = pl.alive ? 0.08 + (pl.hitFlash > 0 ? 0.6 * (pl.hitFlash / 40) : 0) : 0;
    p.lamps.forEach((l, i) => {
      const on = pl.alive && i < pl.lives;
      l.mesh.material = on ? l.on : l.off;
    });
    if (!pl.alive) {
      p.seal.visible = true;
      const k = clamp((_frame - pl.outT) / 30, 0, 1);
      p.seal.position.z = -20 + 33 * k;
    } else {
      p.seal.visible = false;
    }
  }
  // Bumpers.
  for (const b of g.bumpers) {
    const k = b.rec.flash / 18;
    b.capM.emissiveIntensity = 0.8 + 2.2 * k;
    b.glowM.opacity = 0.55 * k;
    const s = 1 + 0.18 * k;
    b.cap.scale.set((BUMPER_R - 1.5) * s, (BUMPER_R - 1.5) * s, 5);
    b.dome.position.z = 19 - 4 * k;
  }
  for (const s of g.slings) s.mat.emissiveIntensity = 0.6 + 1.8 * (s.rec.flash / 14);
  // Cross.
  g.cross.rotation.z = -_cross.rotation;
  // Balls.
  let bi = 0;
  const pulse = 0.4 + 0.35 * Math.sin(_frame * 0.25);
  for (const rec of _balls) {
    if (bi >= g.balls.length) break;
    const e = g.balls[bi];
    const r = rec.bomb ? BOMB_R : BALL_R;
    if (rec.alive) {
      e.mesh.visible = true; e.shadow.visible = true;
      e.mesh.material = rec.bomb ? g.bombM : g.chromeM;
      e.mesh.position.set(rec.x, -rec.y, r);
      e.mesh.scale.setScalar(r);
      e.shadow.position.set(rec.x + 3, -rec.y - 3, 0.4);
      e.shadow.scale.setScalar(r * 1.15);
      bi++;
    } else if (rec.sinkT <= 30) {
      const k = rec.sinkT / 30;
      e.mesh.visible = true; e.shadow.visible = false;
      e.mesh.material = rec.bomb ? g.bombM : g.chromeM;
      e.mesh.position.set(rec.sinkX, -rec.sinkY, r - k * (r + 30));
      e.mesh.scale.setScalar(r * (1 - k * 0.4));
      bi++;
    }
  }
  g.bombM.emissiveIntensity = pulse;
  for (; bi < g.balls.length; bi++) { g.balls[bi].mesh.visible = false; g.balls[bi].shadow.visible = false; }
  // Particles.
  const n = Math.min(_parts.length, PART_CAP);
  for (let i = 0; i < n; i++) {
    const p = _parts[i];
    const k = 1 - p.t / p.life;
    _dummy.position.set(p.x, -p.y, p.z + 1);
    _dummy.rotation.set(p.t * 0.2, p.t * 0.13, 0);
    _dummy.scale.setScalar(p.size * 1.6 * (0.3 + 0.7 * k));
    _dummy.updateMatrix();
    g.parts.setMatrixAt(i, _dummy.matrix);
    g.parts.setColorAt(i, _colTmp.set(p.color));
  }
  g.parts.count = n;
  if (n > 0) {
    g.parts.instanceMatrix.needsUpdate = true;
    if (g.parts.instanceColor) g.parts.instanceColor.needsUpdate = true;
  }
  // Shock rings.
  let ri = 0;
  for (const f of _fx) {
    if (f.kind !== "ring" || ri >= g.rings.length) continue;
    const m = g.rings[ri++];
    const k = f.t / f.life;
    m.visible = true;
    m.position.set(f.x, -f.y, 3);
    m.scale.setScalar(Math.max(1, f.r * k));
    m.material.opacity = 1 - k;
  }
  for (; ri < g.rings.length; ri++) g.rings[ri].visible = false;
  // Lamp flicker with the bombs.
  g.lamp.intensity = 2.1 + (_banners.length ? 0.18 * Math.sin(_frame * 0.5) : 0);
  void T;
}

function placeCamera3d(cam) {
  const T = _THREE;
  let ex, ey, ez, tx, ty, tz;
  if (_phase === "title") {
    // A slow sway around the player's side rather than a full orbit, so the
    // whole table is in frame at every moment (the poster is shot here).
    const a = -Math.PI / 2 + Math.sin(_frame * 0.004) * 0.30;
    ex = CX + Math.cos(a) * 500;
    ey = -CY + Math.sin(a) * 500;
    ez = 440 + Math.sin(_frame * 0.0028) * 25;
    tx = CX; ty = -CY; tz = 0;
  } else {
    ex = CX; ey = -(CY + 452); ez = 424;
    tx = CX; ty = -(CY - 24); tz = 0;
  }
  if (!_camPos) {
    _camPos = new T.Vector3(ex, ey, ez);
    _camTgt = new T.Vector3(tx, ty, tz);
  } else {
    _camPos.lerp(_projV.set(ex, ey, ez), 0.05);
    _camTgt.lerp(_projV.set(tx, ty, tz), 0.05);
  }
  cam.position.copy(_camPos);
  cam.quaternion.setFromRotationMatrix(_lookM.lookAt(_camPos, _camTgt, _upZ));
  cam.updateMatrixWorld();
  _camProj = cam;
  _frame3d = _drawFrame;
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "flipper-fray",
  label: "Flipper Fray",
  tags: ["Gameplay", "Pinball", "AI", "Kinematic", "CCD", "Listeners", "Mobile"],
  desc:
    "A <b>six-player pinball brawl</b>: one round table, six pockets, a pair of flippers guarding each. Balls drift outward, bumpers and slingshots throw them around, and every ball that gets past your flippers costs you a life — <b>five lives</b>, last pocket standing wins, or the most lives when three minutes run out. You hold the bottom pocket against <b>five AI keepers</b>; <b>multiball</b> drops extra balls on a schedule and a <b>bomb ball</b> rolls out every half minute — two lives if it drains, a blast if nobody swallows it. <b>← →</b> / <b>A D</b> flip, <b>SPACE</b> both; on touch, hold the left or right half of the screen. Physics: the flippers are <b>kinematic bodies</b> driven with <code>setVelocityFromTarget</code>, so a slap carries real angular speed into the ball; balls are <b>bullet-flagged</b> circles, so nothing tunnels through the thin ring walls; bumper and slingshot kicks and goal credit come through <code>InteractionListener</code>s. In <b>3D</b> a neon arena with chrome balls, glowing pockets and lane lights, seen from behind your own pocket.",
  walls: false,
  workerCompatible: false,
  camera: null,
  velocityIterations: 8,
  positionIterations: 3,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);
    _frame = 0;
    _keys = {};
    _pointerSide = 0;
    _mode3d = false;
    _camProj = null;
    _scene3d = null;
    _seed = 12345;
    _balls = [];
    _parts = [];
    _fx = [];
    _banners = [];

    installListeners(space);
    buildTable(space);
    goTitle();

    // The runner calls step() once per rendered frame but advances the Space
    // in fixed 1/60 s slices (several per frame on a slow display, none on a
    // fast one). Flipper drive, drift and the AI belong to the physics clock,
    // so the game tick runs from the Space's own step instead.
    // Once you are out the rest of the match plays out in time-lapse.
    const spaceStep = space.step.bind(space);
    space.step = (dt, velIter, posIter) => {
      const n = _phase === "play" && !_players[0].alive && !_autopilot ? FAST_FORWARD : 1;
      for (let i = 0; i < n; i++) {
        tickGame();
        spaceStep(dt, velIter, posIter);
      }
    };

    // Re-entrant setup: drop listeners left from a previous play of this demo.
    if (typeof window !== "undefined") {
      if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
      if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
      _onKeyDown = (e) => {
        if (!_space) return;
        _keys[e.code] = true;
        if (e.code === "Space" || e.code === "Enter") {
          if (primaryAction()) e.preventDefault();
        }
        if (_phase === "title") {
          const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
          if (n !== undefined) _difficulty = n;
        }
        if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
      };
      _onKeyUp = (e) => {
        if (!_space) return;
        _keys[e.code] = false;
      };
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  click(x, y) {
    if (_phase === "title") {
      const d = diffButtonAt(x, y);
      if (d >= 0) { _difficulty = d; return; }
      primaryAction();
      return;
    }
    if (_phase === "over") { primaryAction(); return; }
    _pointerSide = x < CX ? -1 : 1;
  },

  drag(x) {
    if (_phase === "play" && _pointerSide !== 0) _pointerSide = x < CX ? -1 : 1;
  },

  release() {
    _pointerSide = 0;
  },

  step() {
    // Visual bookkeeping only — see the Space.step wrapper in setup().
  },

  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter) {
    if (!_THREE) {
      loadThree().then((mod) => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    _mode3d = true;
    ensureScene(adapter, scene, renderer);
    syncScene3d();
    placeCamera3d(camera);
    renderer.render(scene, camera);
    void space; void W; void H; void camX; void camY;
  },

  // Every render mode: world cues, the HUD, then the title / result screens.
  render3dOverlay(ctx, space, W, H) {
    if (_frame3d !== _drawFrame) _mode3d = false;
    drawOverlay(ctx);
    _drawFrame++;
    void space; void W; void H;
  },

  // Harness access (not used by the site).
  _debug() {
    return {
      players: _players, balls: _balls, stats: _stats, phase: _phase, clock: _clock, result: _result,
      setAutopilot: (v) => { _autopilot = v; },
      setDifficulty: (d) => { _difficulty = d; },
      start: () => startMatch(),
      setThree: (T) => { _THREE = T; },
      setSeed: (v) => { _seed = v >>> 0; },
      difficulties: DIFFICULTIES,
      local: (pl, x, y) => toLocal(pl.frame, x, y),
      frame: () => _frame,
    };
  },
};
