import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType,
  ParticleEmitter, fractureBody,
} from "../nape-js.esm.js?v=3.40.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.40.0";

// Arena Defense — top-down survival mash-up (large camera-followed map):
//   - Top-down shooter (player WASD + auto-fire + drop-powerups)
//   - Tower-defense corridors: 4 winding paths converge into a big central
//     arena room where the base sits. Walls are real polygons, so bullets
//     and particles collide with them.
//   - Central base body the player must keep alive.
//   - Portals: paired sensors that teleport bodies (lightweight — no
//     UserConstraint needed since enemies/bullets are simple bodies).
//   - On every kill, the enemy is fractured via `fractureBody` (proper
//     Voronoi shards) plus a particle-emitter spark burst whose particles
//     collide with walls and decelerate via per-frame linear damping.
//
// Each enemy kind has an active ability on a cooldown:
//   melee     → periodic charge rush
//   ranged    → burst-fire
//   speeder   → short dashes through the arena
//   healer    → AoE heal nearest wounded ally
//   boss      → multi-ability rotation: shotgun, mine drop, summon,
//               and shockwave AoE that knocks player + bullets back.
//
// Most patterns are copied verbatim from top-down-shooter.js / tower-defense.js
// to keep this an "example" rather than a full game.

// ── Collision groups ──────────────────────────────────────────────────────
// 2=projectile, 4=base, 8=wall, 16=player, 32=enemy, 64=powerup,
// 128=fragment (Voronoi pieces), 256=debris (cosmetic emitter sparks).
const GROUP_PROJECTILE = 2;
const GROUP_BASE       = 4;
const GROUP_WALL       = 8;
const GROUP_PLAYER     = 16;
const GROUP_ENEMY      = 32;
const GROUP_POWERUP    = 64;
const GROUP_FRAGMENT   = 128;
const GROUP_DEBRIS     = 256;

const PLAYER_BULLET_MASK = GROUP_WALL | GROUP_ENEMY | GROUP_BASE;
const ENEMY_BULLET_MASK  = GROUP_WALL | GROUP_PLAYER | GROUP_BASE;

// ── World layout ──────────────────────────────────────────────────────────
// Big rectangular world with a square central arena room and 4 winding
// corridors leading in from each corner. Camera follows the player.
const WORLD_W = 1800;
const WORLD_H = 1200;
const VIEW_W = 900;
const VIEW_H = 500;
const HUD_H = 28;
const WT = 8;                  // wall thickness
const HW = 38;                 // corridor half-width

const CENTER = { x: WORLD_W / 2, y: WORLD_H / 2 };

// Arena room — a big square chamber in the middle. Corridors plug into the
// midpoint of each side. Walls are built from `ARENA_RECT` minus the four
// 2*HW-wide gaps where corridors meet.
const ARENA_HALF = 280; // half-width of the central room

// Corridor waypoint chains — one corridor approaches the arena from each
// side. Each path lives entirely in its own world stripe (top / right /
// bottom / left of the arena), so corridors never overlap each other.
// Every turn is 90° — diagonals would make `buildSide`'s offset-line
// intersection overshoot, producing the cross-hatched mess seen earlier.
//
// Each path is a single forward zigzag (no self-loops, no doubling back),
// but each zigzags in a different way so the four lanes look distinct.
//
//   TOP    — Z-zigzag (3 corridor turns, all heading downward)
//   RIGHT  — descending staircase (5 small steps, each going down-left)
//   BOTTOM — long S-curve (2 big lateral sweeps as it rises)
//   LEFT   — wide U-bend with a hook approaching the gap
//
// The final segment of every path approaches the arena gap straight along
// the matching axis (vertical for top/bottom, horizontal for left/right).
const ARENA_TOP    = CENTER.y - ARENA_HALF; // 320
const ARENA_BOTTOM = CENTER.y + ARENA_HALF; // 880
const ARENA_LEFT   = CENTER.x - ARENA_HALF; // 620
const ARENA_RIGHT  = CENTER.x + ARENA_HALF; // 1180

// Margin from the world edge to the first waypoint.
const EDGE_MARGIN = 140;

// Each corridor lives in a "stripe": the area between the world edge and
// the corresponding arena side. The stripes are:
//   TOP stripe:    y ∈ [0,  ARENA_TOP]     (320 px tall)
//   BOTTOM stripe: y ∈ [ARENA_BOTTOM, WORLD_H]  (320 px tall)
//   LEFT stripe:   x ∈ [0,  ARENA_LEFT]     (620 px wide)
//   RIGHT stripe:  x ∈ [ARENA_RIGHT, WORLD_W]   (620 px wide)
//
// All path waypoints clamp inside their stripe — no path encroaches on
// another's stripe. Top/bottom only zigzag horizontally (since the stripe
// is short); left/right have room to zigzag vertically too.

const PATHS = [
  // ─── TOP (compact L → straight in) ──────────────────────────────────
  // Spawn near the top-left of the top stripe; sweep right; turn down
  // into the arena gap. Just two corners — short and readable.
  [
    { x: 240,      y: 140 },                                  // spawn
    { x: CENTER.x, y: 140 },                                  // sweep right
    { x: CENTER.x, y: ARENA_TOP - 4 },                        // straight in
  ],

  // ─── RIGHT (compact L → straight in, opposite-corner approach) ──────
  // Spawn near top-right; descend; turn left into the arena gap.
  [
    { x: WORLD_W - 140, y: 240 },                             // spawn
    { x: WORLD_W - 140, y: CENTER.y },                        // descend
    { x: ARENA_RIGHT + 4, y: CENTER.y },                      // straight in
  ],

  // ─── BOTTOM (compact L, mirror of TOP) ──────────────────────────────
  // Spawn near bottom-right; sweep left; rise into the arena gap.
  [
    { x: WORLD_W - 240, y: WORLD_H - 140 },                   // spawn
    { x: CENTER.x,      y: WORLD_H - 140 },                   // sweep left
    { x: CENTER.x,      y: ARENA_BOTTOM + 4 },                // straight in
  ],

  // ─── LEFT (compact L, mirror of RIGHT) ──────────────────────────────
  // Spawn near bottom-left; rise; turn right into the arena gap.
  [
    { x: 140,            y: WORLD_H - 240 },                  // spawn
    { x: 140,            y: CENTER.y },                       // ascend
    { x: ARENA_LEFT - 4, y: CENTER.y },                       // straight in
  ],
];

// ── Portals — paired teleport sensors near the arena corners ─────────────
// Pushed far from the base (≈85% out toward the arena wall) so they're
// not crowded around the base body. Player has to deliberately leave
// the base to use them, which makes the trip feel like a commitment.
const PORTAL_R = 22;
const PORTAL_OFFSET = ARENA_HALF * 0.85; // 238 px from center
const PORTAL_DEFS = [
  { id: "A",  x: CENTER.x - PORTAL_OFFSET, y: CENTER.y - PORTAL_OFFSET,
    out: { x: -1, y: -1 }, partner: "A2" },
  { id: "A2", x: CENTER.x + PORTAL_OFFSET, y: CENTER.y + PORTAL_OFFSET,
    out: { x:  1, y:  1 }, partner: "A"  },
  { id: "B",  x: CENTER.x + PORTAL_OFFSET, y: CENTER.y - PORTAL_OFFSET,
    out: { x:  1, y: -1 }, partner: "B2" },
  { id: "B2", x: CENTER.x - PORTAL_OFFSET, y: CENTER.y + PORTAL_OFFSET,
    out: { x: -1, y:  1 }, partner: "B"  },
];
const PORTAL_COOLDOWN_FRAMES = 25;

// ── Player ────────────────────────────────────────────────────────────────
const PLAYER_R = 14;
const PLAYER_SPEED = 230;
const PLAYER_DASH_SPEED = 720;     // px/s while dashing
const PLAYER_DASH_DURATION = 10;   // frames (~0.17s)
const PLAYER_DASH_COOLDOWN = 50;   // frames (~0.83s) — feels snappy
const PLAYER_DASH_IFRAMES = 14;    // brief invuln during/after dash
const PLAYER_MAX_HP = 100;
const PLAYER_SHOT_COOLDOWN = 12;
const RAPID_SHOT_COOLDOWN = 5;
const PLAYER_INVULN_FRAMES = 22;
// Auto-aim is constrained to the visible viewport (a rectangle centered
// on the player, matching the camera follow). VIEW_W/VIEW_H are the
// canvas dimensions, with a small inset so the player doesn't snipe
// enemies that are a single pixel from the screen edge.
const AIM_INSET = 20;

// ── Base ──────────────────────────────────────────────────────────────────
const BASE_R = 38;
const BASE_MAX_HP = 800;
const BASE_DAMAGE_FROM_CONTACT = 1; // per ONGOING tick
const BASE_FIRE_COOLDOWN = 30;      // frames (~0.5s — slower than player)
const BASE_BULLET_SPEED = 520;
const BASE_BULLET_DAMAGE = 2;
const BASE_AIM_RANGE = 360;         // shorter than player auto-aim

// ── Enemy tunables ────────────────────────────────────────────────────────
const ENEMY_BULLET_SPEED = 280;
const ENEMY_BULLET_DAMAGE = 5;
const ENEMY_MELEE_DAMAGE = 8;
const ENEMY_BOSS_CONTACT_DAMAGE = 14;
const ENEMY_RANGED_HOLD_DIST = 200;

const MELEE_CHARGE_DURATION = 90;
const MELEE_CHARGE_COOLDOWN = 240;
const MELEE_CHARGE_MULT = 2.0;

const SPEEDER_DASH_DURATION = 22;
const SPEEDER_DASH_COOLDOWN = 90;
const SPEEDER_DASH_MULT = 3.4;
const SPEEDER_BASE_SPEED = 110;

const RANGED_FIRE_COOLDOWN = 90;

const HEALER_HEAL_COOLDOWN = 180;
const HEALER_HEAL_RANGE = 160;
const HEALER_HEAL_AMOUNT = 0.35;

const BOSS_FIRE_COOLDOWN = 140;
const BOSS_CHARGE_INTERVAL = 320;
const BOSS_CHARGE_DURATION = 60;
const BOSS_CHARGE_MULT = 2.4;
const BOSS_MINE_INTERVAL = 280;
const BOSS_MINE_FUSE = 180;
const BOSS_MINE_PELLETS = 6;
const BOSS_SUMMON_INTERVAL = 540;
const BOSS_SHOCKWAVE_INTERVAL = 360;
const BOSS_SHOCKWAVE_RADIUS = 180;
const BOSS_SHOCKWAVE_IMPULSE = 460;
const BOSS_SHOCKWAVE_DAMAGE = 12;

// ── Power-ups ─────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.40;
const POWERUP_DURATION = 600;
const POWERUP_LIFETIME = 720;
const POWERUP_TYPES = ["double", "triple", "explode", "rapid", "heal", "shield", "homing"];
const POWERUP_COLORS = {
  double: "#58a6ff", triple: "#3fb950", explode: "#ff8c42",
  rapid: "#bc8cff", heal: "#d29922", shield: "#79c0ff",
  homing: "#ff7eb6",
};
const POWERUP_LABELS = {
  double: "2x", triple: "3x", explode: "EX",
  rapid: "RF", heal: "HP", shield: "SH",
  homing: "HM",
};

// ── Homing-missile tunables ──────────────────────────────────────────────
const HOMING_SPEED = 360;        // constant speed (orientation steers each frame)
const HOMING_TURN_RATE = 0.18;   // radians per frame max — gentle so missiles arc visibly
const HOMING_ACQUIRE_RANGE = 520; // px — beyond this, missile flies straight
const HOMING_LIFE = 150;         // frames (~2.5s) before despawn
const EX_RADIUS = 80;
const EX_DAMAGE = 3;
const EX_IMPULSE = 160;

// ── Fragments + debris (proper top-down "splat" feel) ────────────────────
// Tuning is calibrated against destructible-arena.js. That demo runs in
// side-view with gravity, so its debris lifetime can stay long (1.4s) —
// the particles fall offscreen on their own. We're top-down zero-g, so
// long-lived particles linger visibly. Solution: shorter lifetimes plus
// strong damping so the burst is a quick flash, then gone.
const FRAGMENT_LIFE = 0.7;       // seconds before despawn (was 1.6)
const FRAGMENT_DAMPING = 0.85;   // per-frame velocity multiplier (was 0.92 — slower)
const DEBRIS_DAMPING = 0.82;     // sparks decelerate quickly (was 0.90)
const DEBRIS_PER_KILL_BASE = 12; // small enemies; bosses scale up

// ── Waves ────────────────────────────────────────────────────────────────
// Waves run on a fixed cadence — the timer keeps ticking while a wave is
// active, so a slow wave doesn't delay the next one. This produces
// natural pile-ups when the player can't clear fast enough, which is the
// point of an "arena defense" mode.
const WAVE_INTERVAL = 12 * 60;   // 12s between wave starts
const FIRST_WAVE_DELAY = 3 * 60; // 3s grace period before wave 1

// Joystick (mobile)
const STICK_ZONE_W = VIEW_W * 0.45;
const STICK_ZONE_Y = HUD_H + VIEW_H * 0.5;
const STICK_MAX_R = 60;

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _player = null;
let _base = null;
let _baseHP = 0;
let _baseFireCooldown = 0;
let _playerHP = 0;
let _playerInvuln = 0;
let _playerShotCooldown = 0;
let _wave = 0;
let _waveActive = false;
let _waveType = "normal";
// Frames until the next wave starts. Counts down even while the previous
// wave is still active — see WAVE_INTERVAL. Initialised to FIRST_WAVE_DELAY.
let _waveTimer = 0;
let _toSpawn = 0;
let _spawnTimer = 0;
let _spawnInterval = 0;
let _bossPending = false;
let _score = 0;
let _gameOver = false;
let _victory = false;
let _portals = [];
let _portalById = Object.create(null);
let _debris = null;
let _isTouch = false;

let _playerMod = { type: null, timer: 0 };
let _shieldFrames = 0;

// Dash state
let _dashTimer = 0;     // > 0 while dashing (kept at PLAYER_DASH_SPEED)
let _dashCdTimer = 0;   // > 0 while on cooldown
let _dashDir = { x: 0, y: 0 }; // direction frozen at dash start
let _dashRequested = false;    // edge-trigger flag set by keydown

const _keys = Object.create(null);
let _stickActive = false;
let _stickOrigin = { x: 0, y: 0 };
let _stickVec = { x: 0, y: 0 };
const _moveDir = { x: 0, y: 0 };

let _onKeyDown = null;
let _onKeyUp = null;

let _cbPlayer, _cbEnemy, _cbPlayerBullet, _cbEnemyBullet, _cbWall, _cbPowerup,
    _cbBase, _cbPortal;

const _pending = {
  enemyHit: [],
  removeBullet: [],
  aoeDetonate: [],
  playerHit: [],
  baseHit: [],
  pickupPowerup: [],
  removePowerup: [],
  detonateMine: [],
  teleport: [],
};

// Track this demo's runner so we can call shakeCamera() without coupling to
// the host page directly. Set in setup() via the runner-injected `_runner`.
let _runnerRef = null;

// ── Helpers ───────────────────────────────────────────────────────────────
function bodyFromInt(intObj) {
  return intObj.castBody ?? intObj.castShape?.body ?? null;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

// Thin axis-rotated quad wall — no Material (P53 Polygon+Material tunneling
// workaround). Verbatim from top-down-shooter / tower-defense.
function addWallSegment(space, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const hl = len / 2, hw = WT / 2;
  const cx = (ax + bx) / 2, cy = (ay + by) / 2;
  const verts = [
    new Vec2(-ux * hl - nx * hw, -uy * hl - ny * hw),
    new Vec2( ux * hl - nx * hw,  uy * hl - ny * hw),
    new Vec2( ux * hl + nx * hw,  uy * hl + ny * hw),
    new Vec2(-ux * hl + nx * hw, -uy * hl + ny * hw),
  ];
  const wall = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const wallShape = new Polygon(verts);
  wallShape.filter = new InteractionFilter(GROUP_WALL, -1);
  wall.shapes.add(wallShape);
  wall.cbTypes.add(_cbWall);
  wall.userData._wall = true;
  wall.space = space;
}

// Build one continuous offset wall chain along a corridor path.
// Verbatim algorithm from tower-defense.js — corner vertices are the
// intersection of the two parallel-offset lines so corners stay tight.
function buildSide(space, path, side) {
  const pts = [];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const prev = i > 0 ? path[i - 1] : null;
    const next = i < path.length - 1 ? path[i + 1] : null;

    let inUx = 0, inUy = 0, outUx = 0, outUy = 0;
    if (prev) {
      const d = Math.hypot(p.x - prev.x, p.y - prev.y) || 1;
      inUx = (p.x - prev.x) / d;
      inUy = (p.y - prev.y) / d;
    }
    if (next) {
      const d = Math.hypot(next.x - p.x, next.y - p.y) || 1;
      outUx = (next.x - p.x) / d;
      outUy = (next.y - p.y) / d;
    }
    const inNx = -inUy * side, inNy = inUx * side;
    const outNx = -outUy * side, outNy = outUx * side;

    if (!prev) {
      pts.push({ x: p.x + outNx * HW, y: p.y + outNy * HW });
    } else if (!next) {
      pts.push({ x: p.x + inNx * HW, y: p.y + inNy * HW });
    } else {
      const Ax = p.x + inNx * HW, Ay = p.y + inNy * HW;
      const Bx = p.x + outNx * HW, By = p.y + outNy * HW;
      const det = inUx * (-outUy) - inUy * (-outUx);
      if (Math.abs(det) < 1e-6) {
        pts.push({ x: Ax, y: Ay });
      } else {
        const rhsX = Bx - Ax, rhsY = By - Ay;
        const t = (rhsX * (-outUy) - rhsY * (-outUx)) / det;
        pts.push({ x: Ax + inUx * t, y: Ay + inUy * t });
      }
    }
  }

  // Push the start cap "behind" the spawn point so the perpendicular cap
  // wall doesn't sit on top of the spawn position. Same trick as
  // tower-defense.js — without this, freshly spawned enemies are wedged
  // between the cap wall and the corridor sleeve and can't move forward.
  if (path.length >= 2) {
    const u0 = { x: path[1].x - path[0].x, y: path[1].y - path[0].y };
    const len0 = Math.hypot(u0.x, u0.y) || 1;
    u0.x /= len0; u0.y /= len0;
    const capBack = WT * 4;
    pts[0] = { x: pts[0].x - u0.x * capBack, y: pts[0].y - u0.y * capBack };
  }

  for (let i = 0; i < pts.length - 1; i++) {
    addWallSegment(space, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  return pts;
}

// Build the central arena box, with a corridor-sized gap on each side where
// the corresponding path enters. Side gap centers are the last waypoint of
// each path.
function buildArenaWalls(space) {
  const cx = CENTER.x, cy = CENTER.y;
  const top = cy - ARENA_HALF, bot = cy + ARENA_HALF;
  const lt = cx - ARENA_HALF,  rt = cx + ARENA_HALF;
  const gap = HW + 4; // half-gap each side of the corridor centerline

  // Each side has one gap centered on a fixed midpoint:
  //   top-side gap → path 0 entry x = cx
  //   right-side gap → path 1 entry y = cy
  //   left-side gap → path 2 entry y = cy
  //   bottom-side gap → path 3 entry x = cx
  // Top
  addWallSegment(space, lt, top, cx - gap, top);
  addWallSegment(space, cx + gap, top, rt, top);
  // Right
  addWallSegment(space, rt, top, rt, cy - gap);
  addWallSegment(space, rt, cy + gap, rt, bot);
  // Bottom
  addWallSegment(space, lt, bot, cx - gap, bot);
  addWallSegment(space, cx + gap, bot, rt, bot);
  // Left
  addWallSegment(space, lt, top, lt, cy - gap);
  addWallSegment(space, lt, cy + gap, lt, bot);
}

function buildWorld(space) {
  // Outer world bounds — sealed perimeter, in case fragments fly outward.
  addWallSegment(space, 0, 0, WORLD_W, 0);
  addWallSegment(space, WORLD_W, 0, WORLD_W, WORLD_H);
  addWallSegment(space, WORLD_W, WORLD_H, 0, WORLD_H);
  addWallSegment(space, 0, WORLD_H, 0, 0);

  // Corridors — left and right offset chains for each path. Cap each
  // corridor's start with a perpendicular plug so enemies/bullets can't
  // escape the spawn end.
  for (const path of PATHS) {
    const left  = buildSide(space, path, +1);
    const right = buildSide(space, path, -1);
    addWallSegment(space, left[0].x, left[0].y, right[0].x, right[0].y);
  }

  // Central arena chamber walls.
  buildArenaWalls(space);
}

// ── Base ──────────────────────────────────────────────────────────────────
function spawnBase(space) {
  const body = new Body(BodyType.STATIC, new Vec2(CENTER.x, CENTER.y));
  const shape = new Circle(BASE_R);
  // Base is a solid physical obstacle — collides with everything,
  // including the player (you have to navigate around it).
  shape.filter = new InteractionFilter(GROUP_BASE, -1);
  body.shapes.add(shape);
  body.userData._base = true;
  body.userData._colorIdx = 1;
  body.cbTypes.add(_cbBase);
  body.space = space;
  return body;
}

// ── Portals ───────────────────────────────────────────────────────────────
function buildPortals(space) {
  _portals = [];
  _portalById = Object.create(null);
  for (const def of PORTAL_DEFS) {
    const body = new Body(BodyType.STATIC, new Vec2(def.x, def.y));
    const sensor = new Circle(PORTAL_R);
    sensor.sensorEnabled = true;
    // Portal sensor mask must catch every dynamic actor (player, enemies,
    // bullets, fragments). collisionGroup uses POWERUP slot purely as a tag
    // — the sensor masks against everything anyway.
    sensor.filter = new InteractionFilter(GROUP_POWERUP, -1);
    sensor.cbTypes.add(_cbPortal);
    sensor.userData._portalId = def.id;
    body.shapes.add(sensor);
    body.userData._portalId = def.id;
    body.space = space;
    const entry = { ...def, body };
    _portals.push(entry);
    _portalById[def.id] = entry;
  }
}

function teleportBody(body, fromId) {
  const from = _portalById[fromId];
  if (!from) return;
  const to = _portalById[from.partner];
  if (!to) return;
  // Carry over velocity rotated by relative output direction.
  const a1 = Math.atan2(from.out.y, from.out.x);
  const a2 = Math.atan2(to.out.y, to.out.x);
  const a = a2 - a1 + Math.PI;
  const c = Math.cos(a), s = Math.sin(a);
  const vx0 = body.velocity.x, vy0 = body.velocity.y;
  const vx = vx0 * c - vy0 * s;
  const vy = vx0 * s + vy0 * c;
  // Place just outside the destination portal in its `out` direction.
  const offX = to.out.x, offY = to.out.y;
  const offLen = Math.hypot(offX, offY) || 1;
  const off = PORTAL_R + 8;
  body.position = new Vec2(to.x + (offX / offLen) * off, to.y + (offY / offLen) * off);
  body.velocity = new Vec2(vx, vy);
  body.userData._portalCd = PORTAL_COOLDOWN_FRAMES;
}

// ── Player ────────────────────────────────────────────────────────────────
function spawnPlayer(space) {
  // Spawn just below the base so the camera centers on the action.
  const body = new Body(BodyType.DYNAMIC, new Vec2(CENTER.x, CENTER.y + 100));
  const shape = new Circle(PLAYER_R, undefined, new Material(0.3, 0.3, 0.4, 1));
  shape.filter = new InteractionFilter(GROUP_PLAYER, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.isBullet = true;
  body.userData._colorIdx = 2;
  body.userData._player = true;
  body.cbTypes.add(_cbPlayer);
  body.space = space;
  return body;
}

// ── Enemies ───────────────────────────────────────────────────────────────
// Enemies follow their assigned path's waypoints toward the central arena.
// Once they enter the arena, they switch to free-pursuit of player or base
// (`_wp = -1` flag).
function spawnEnemy(kind, pathIdx) {
  const path = PATHS[pathIdx ?? Math.floor(Math.random() * PATHS.length)];
  const sp = path[0];
  // Bias the spawn jitter "behind" the spawn point along the first segment
  // (away from the corridor's interior) so freshly-spawned enemies don't
  // pile up on top of each other right at the corridor's first turn.
  // Same trick as tower-defense.js's `jitterX = -Math.random() * 24`.
  const u = { x: path[1].x - sp.x, y: path[1].y - sp.y };
  const ulen = Math.hypot(u.x, u.y) || 1;
  u.x /= ulen; u.y /= ulen;
  const back = -Math.random() * 22;
  // Perpendicular jitter — small, so enemies don't spawn against the wall.
  const perp = (Math.random() - 0.5) * (HW - 14) * 0.8;
  const jx = u.x * back + (-u.y) * perp;
  const jy = u.y * back + ( u.x) * perp;
  const w = Math.max(0, _wave - 1);
  const fiveTier = Math.floor(w / 5);
  let r, baseHp, hpBonus, speed, contactDmg, colorIdx;
  if (kind === "boss") {
    r = 24; baseHp = 80; hpBonus = fiveTier * 30;
    speed = 65; contactDmg = ENEMY_BOSS_CONTACT_DAMAGE; colorIdx = 4;
  } else if (kind === "ranged") {
    r = 11; baseHp = 4; hpBonus = w * 2;
    speed = 80; contactDmg = ENEMY_MELEE_DAMAGE; colorIdx = 5;
  } else if (kind === "speeder") {
    r = 10; baseHp = 3; hpBonus = w * 1;
    speed = SPEEDER_BASE_SPEED; contactDmg = ENEMY_MELEE_DAMAGE; colorIdx = 5;
  } else if (kind === "healer") {
    r = 12; baseHp = 6; hpBonus = w * 2;
    speed = 60; contactDmg = ENEMY_MELEE_DAMAGE; colorIdx = 0;
  } else {
    r = 11; baseHp = 5; hpBonus = w * 2;
    speed = 95; contactDmg = ENEMY_MELEE_DAMAGE; colorIdx = 3;
  }
  const speedMul = 1 + w * 0.01;
  const hp = baseHp + hpBonus;

  const body = new Body(BodyType.DYNAMIC, new Vec2(sp.x + jx, sp.y + jy));
  const shape = new Circle(r, undefined, new Material(0.3, 0.3, 0.4, 1));
  shape.filter = new InteractionFilter(GROUP_ENEMY, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.userData._enemy = true;
  body.userData._kind = kind;
  body.userData._colorIdx = colorIdx;
  body.userData._hp = hp;
  body.userData._maxHp = hp;
  body.userData._speed = speed * speedMul;
  body.userData._contactDmg = contactDmg;
  body.userData._fireCooldown = kind === "ranged" ? 30 + Math.floor(Math.random() * 60)
                              : kind === "boss"   ? 90
                              : 0;
  body.userData._chargeTimer = 0;
  body.userData._chargeCdTimer = kind === "melee"
    ? 60 + Math.floor(Math.random() * MELEE_CHARGE_COOLDOWN)
    : 0;
  body.userData._dashTimer = 0;
  body.userData._dashCdTimer = kind === "speeder" ? 30 + Math.floor(Math.random() * SPEEDER_DASH_COOLDOWN) : 0;
  body.userData._healCdTimer = kind === "healer" ? 90 + Math.floor(Math.random() * HEALER_HEAL_COOLDOWN) : 0;
  body.userData._healPulse = 0;
  body.userData._bossChargeCd    = kind === "boss" ? BOSS_CHARGE_INTERVAL    : 0;
  body.userData._bossMineCd      = kind === "boss" ? BOSS_MINE_INTERVAL      : 0;
  body.userData._bossSummonCd    = kind === "boss" ? BOSS_SUMMON_INTERVAL    : 0;
  body.userData._bossShockwaveCd = kind === "boss" ? BOSS_SHOCKWAVE_INTERVAL : 0;
  body.userData._portalCd = 0;
  body.userData._path = path;
  body.userData._wp = 1;             // next waypoint index (0 is spawn)
  body.userData._inArena = false;
  // Once in the arena, prefer player (70%) or base (30%). Healers always
  // follow allies; bosses always pursue the player.
  body.userData._targetBase = kind === "boss" || kind === "healer"
    ? false
    : Math.random() < 0.30;
  body.cbTypes.add(_cbEnemy);
  body.space = _space;
}

function inArena(x, y) {
  return Math.abs(x - CENTER.x) < ARENA_HALF && Math.abs(y - CENTER.y) < ARENA_HALF;
}

function findNearestWoundedAlly(self) {
  let best = null, bestD2 = HEALER_HEAL_RANGE * HEALER_HEAL_RANGE;
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy || body === self) continue;
    if (ud._hp >= ud._maxHp) continue;
    const d2 = distSq(self.position.x, self.position.y, body.position.x, body.position.y);
    if (d2 < bestD2) { bestD2 = d2; best = body; }
  }
  return best;
}

function steerEnemies() {
  const px = _player?.space ? _player.position.x : CENTER.x;
  const py = _player?.space ? _player.position.y : CENTER.y;
  const bx = _base?.space ? _base.position.x : CENTER.x;
  const by = _base?.space ? _base.position.y : CENTER.y;

  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy) continue;

    if (ud._portalCd > 0) ud._portalCd--;

    // ── Pick steering target ────────────────────────────────────────────
    let tx, ty;
    if (!ud._inArena && ud._path && ud._wp < ud._path.length) {
      // Still walking the corridor — chase the next waypoint. Use a
      // generous reach radius (HW = corridor half-width) so enemies cut
      // corners cleanly instead of overshooting into the sleeve wall.
      const wpt = ud._path[ud._wp];
      tx = wpt.x; ty = wpt.y;
      const d2 = distSq(body.position.x, body.position.y, tx, ty);
      const reach = HW - 6; // 32 px — well inside the 38-px corridor
      if (d2 < reach * reach) {
        ud._wp++;
        if (ud._wp >= ud._path.length || inArena(body.position.x, body.position.y)) {
          ud._inArena = true;
        }
      }
    } else {
      ud._inArena = true;
      // Free pursuit inside arena.
      if (ud._kind === "healer") {
        const ally = findNearestWoundedAlly(body);
        if (ally) { tx = ally.position.x; ty = ally.position.y; }
        else { tx = px; ty = py; }
      } else if (ud._targetBase) {
        tx = bx; ty = by;
      } else {
        tx = _player?.space ? px : bx;
        ty = _player?.space ? py : by;
      }
    }

    const dx = tx - body.position.x;
    const dy = ty - body.position.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;

    // ── Charge / dash transitions ───────────────────────────────────────
    if (ud._kind === "melee") {
      if (ud._chargeTimer > 0) ud._chargeTimer--;
      else {
        ud._chargeCdTimer--;
        if (ud._chargeCdTimer <= 0) {
          ud._chargeTimer = MELEE_CHARGE_DURATION;
          ud._chargeCdTimer = MELEE_CHARGE_COOLDOWN;
        }
      }
    } else if (ud._kind === "boss") {
      if (ud._chargeTimer > 0) ud._chargeTimer--;
      else {
        ud._bossChargeCd--;
        if (ud._bossChargeCd <= 0) {
          ud._chargeTimer = BOSS_CHARGE_DURATION;
          ud._bossChargeCd = BOSS_CHARGE_INTERVAL;
        }
      }
    } else if (ud._kind === "speeder") {
      if (ud._dashTimer > 0) ud._dashTimer--;
      else {
        ud._dashCdTimer--;
        if (ud._dashCdTimer <= 0) {
          ud._dashTimer = SPEEDER_DASH_DURATION;
          ud._dashCdTimer = SPEEDER_DASH_COOLDOWN;
        }
      }
    }

    const charging = ud._chargeTimer > 0;
    const dashing  = ud._dashTimer > 0;
    let speed = ud._speed;
    if (charging) speed *= (ud._kind === "boss" ? BOSS_CHARGE_MULT : MELEE_CHARGE_MULT);
    if (dashing)  speed *= SPEEDER_DASH_MULT;

    let tvx, tvy;
    if (ud._kind === "ranged" && ud._inArena && d < ENEMY_RANGED_HOLD_DIST && !charging) {
      tvx = -nx * speed * 0.6;
      tvy = -ny * speed * 0.6;
    } else {
      tvx = nx * speed;
      tvy = ny * speed;
    }
    const vx0 = body.velocity.x, vy0 = body.velocity.y;
    const blend = (charging || dashing) ? 0.16 : 0.08;
    body.velocity = new Vec2(vx0 + (tvx - vx0) * blend, vy0 + (tvy - vy0) * blend);

    // ── Active abilities (only fire after entering the arena) ──────────
    if (!ud._inArena) continue;

    if (ud._kind === "ranged") {
      ud._fireCooldown--;
      if (ud._fireCooldown <= 0 && _player?.space) {
        const ddx = px - body.position.x;
        const ddy = py - body.position.y;
        const dd = Math.hypot(ddx, ddy) || 1;
        fireEnemyBullet(body, ddx / dd, ddy / dd);
        ud._fireCooldown = RANGED_FIRE_COOLDOWN;
      }
    } else if (ud._kind === "healer") {
      ud._healCdTimer--;
      if (ud._healPulse > 0) ud._healPulse--;
      if (ud._healCdTimer <= 0) {
        const r2 = HEALER_HEAL_RANGE * HEALER_HEAL_RANGE;
        let healed = false;
        for (const other of _space.bodies) {
          const oud = other.userData;
          if (!oud?._enemy || other === body) continue;
          if (oud._hp >= oud._maxHp) continue;
          if (distSq(body.position.x, body.position.y, other.position.x, other.position.y) > r2) continue;
          oud._hp = Math.min(oud._maxHp, oud._hp + oud._maxHp * HEALER_HEAL_AMOUNT);
          healed = true;
        }
        if (healed) ud._healPulse = 28;
        ud._healCdTimer = HEALER_HEAL_COOLDOWN;
      }
    } else if (ud._kind === "boss") {
      ud._fireCooldown--;
      if (ud._fireCooldown <= 0 && _player?.space) {
        fireBossShotgun(body, 5);
        ud._fireCooldown = BOSS_FIRE_COOLDOWN;
      }
      ud._bossMineCd--;
      if (ud._bossMineCd <= 0) {
        spawnBossMine(body);
        ud._bossMineCd = BOSS_MINE_INTERVAL;
      }
      ud._bossSummonCd--;
      if (ud._bossSummonCd <= 0) {
        for (let i = 0; i < 2; i++) summonNearBoss(body);
        ud._bossSummonCd = BOSS_SUMMON_INTERVAL;
      }
      ud._bossShockwaveCd--;
      if (ud._bossShockwaveCd <= 0) {
        bossShockwave(body);
        ud._bossShockwaveCd = BOSS_SHOCKWAVE_INTERVAL;
      }
    }
  }
}

// ── Boss abilities ────────────────────────────────────────────────────────
function fireBossShotgun(boss, pellets) {
  if (!_player?.space) return;
  const dx = _player.position.x - boss.position.x;
  const dy = _player.position.y - boss.position.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  const halfFan = Math.min(0.9, 0.12 * (pellets - 1));
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0 : (i / (pellets - 1)) * 2 - 1;
    const ang = t * halfFan;
    const c = Math.cos(ang), s = Math.sin(ang);
    fireEnemyBullet(boss, nx * c - ny * s, nx * s + ny * c);
  }
}

function spawnBossMine(boss) {
  const body = new Body(BodyType.STATIC, new Vec2(boss.position.x, boss.position.y));
  const shape = new Circle(8);
  shape.filter = new InteractionFilter(GROUP_POWERUP, 0);
  shape.sensorEnabled = true;
  body.shapes.add(shape);
  body.userData._mine = true;
  body.userData._fuse = BOSS_MINE_FUSE;
  body.space = _space;
}

function detonateMine(mine) {
  const bx = mine.position.x, by = mine.position.y;
  for (let i = 0; i < BOSS_MINE_PELLETS; i++) {
    const ang = (i / BOSS_MINE_PELLETS) * Math.PI * 2;
    const nx = Math.cos(ang), ny = Math.sin(ang);
    const bullet = new Body(BodyType.DYNAMIC, new Vec2(bx + nx * 10, by + ny * 10));
    const shape = new Circle(3, undefined, new Material(0.1, 0.1, 0.1, 0.01));
    shape.filter = new InteractionFilter(GROUP_PROJECTILE, ENEMY_BULLET_MASK);
    bullet.shapes.add(shape);
    bullet.isBullet = true;
    bullet.userData._colorIdx = 4;
    bullet.userData._enemyBullet = true;
    bullet.userData._damage = ENEMY_BULLET_DAMAGE;
    bullet.userData._life = 120;
    bullet.cbTypes.add(_cbEnemyBullet);
    bullet.velocity = new Vec2(nx * ENEMY_BULLET_SPEED, ny * ENEMY_BULLET_SPEED);
    bullet.space = _space;
  }
  mine.space = null;
}

function summonNearBoss(boss) {
  const ang = Math.random() * Math.PI * 2;
  const px = boss.position.x + Math.cos(ang) * 40;
  const py = boss.position.y + Math.sin(ang) * 40;
  const body = new Body(BodyType.DYNAMIC, new Vec2(px, py));
  const shape = new Circle(9, undefined, new Material(0.3, 0.3, 0.4, 1));
  shape.filter = new InteractionFilter(GROUP_ENEMY, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  const w = Math.max(0, _wave - 1);
  const hp = 3 + w;
  body.userData._enemy = true;
  body.userData._kind = "melee";
  body.userData._colorIdx = 3;
  body.userData._hp = hp;
  body.userData._maxHp = hp;
  body.userData._speed = 110;
  body.userData._contactDmg = ENEMY_MELEE_DAMAGE;
  body.userData._chargeTimer = 0;
  body.userData._chargeCdTimer = 60 + Math.floor(Math.random() * MELEE_CHARGE_COOLDOWN);
  body.userData._fireCooldown = 0;
  body.userData._dashTimer = 0;
  body.userData._dashCdTimer = 0;
  body.userData._healCdTimer = 0;
  body.userData._healPulse = 0;
  body.userData._bossChargeCd = 0;
  body.userData._bossMineCd = 0;
  body.userData._bossSummonCd = 0;
  body.userData._bossShockwaveCd = 0;
  body.userData._portalCd = 0;
  body.userData._path = null;
  body.userData._wp = -1;
  body.userData._inArena = true; // summoned right inside the arena
  body.userData._targetBase = false;
  body.userData._summoned = true;
  body.cbTypes.add(_cbEnemy);
  body.space = _space;
}

function bossShockwave(boss) {
  const bx = boss.position.x, by = boss.position.y;
  const r = BOSS_SHOCKWAVE_RADIUS;
  const r2 = r * r;
  if (_player?.space) {
    const d2 = distSq(bx, by, _player.position.x, _player.position.y);
    if (d2 < r2) {
      const d = Math.sqrt(d2) || 1;
      const falloff = 1 - d / r;
      const dx = _player.position.x - bx, dy = _player.position.y - by;
      _player.applyImpulse(new Vec2(dx / d * BOSS_SHOCKWAVE_IMPULSE * falloff,
                                    dy / d * BOSS_SHOCKWAVE_IMPULSE * falloff));
      _pending.playerHit.push({ damage: BOSS_SHOCKWAVE_DAMAGE * falloff });
    }
  }
  for (const body of _space.bodies) {
    if (!body.userData?._playerBullet) continue;
    if (distSq(bx, by, body.position.x, body.position.y) > r2) continue;
    _pending.removeBullet.push(body);
  }
  emitDebrisAt(bx, by, 24, 60, 180); // visual only — settles fast on walls
  boss.userData._shockwavePulse = 24;
  if (_runnerRef?.shakeCamera) _runnerRef.shakeCamera(8, 0.25);
}

// ── Bullets ───────────────────────────────────────────────────────────────
// Pick the nearest enemy whose center lies inside the visible viewport
// rectangle. The viewport is approximated as a box centered on the
// player (camera follow), inset by AIM_INSET. This caps auto-aim at the
// visible screen — enemies in the next corridor over are no longer
// targetable, which prevents off-screen sniping.
function findNearestEnemy() {
  if (!_player?.space) return null;
  const px = _player.position.x, py = _player.position.y;
  const halfW = VIEW_W / 2 - AIM_INSET;
  const halfH = VIEW_H / 2 - AIM_INSET;
  let best = null, bestD = Infinity;
  for (const body of _space.bodies) {
    if (!body.userData?._enemy) continue;
    const ex = body.position.x, ey = body.position.y;
    if (Math.abs(ex - px) > halfW) continue;
    if (Math.abs(ey - py) > halfH) continue;
    const d2 = distSq(px, py, ex, ey);
    if (d2 < bestD) { bestD = d2; best = body; }
  }
  return best;
}

function spawnPlayerBullet(dx, dy) {
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  const off = PLAYER_R + 4;
  const sx = _player.position.x + nx * off;
  const sy = _player.position.y + ny * off;
  const bullet = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  const shape = new Circle(3, undefined, new Material(0.1, 0.1, 0.1, 0.01));
  shape.filter = new InteractionFilter(GROUP_PROJECTILE, PLAYER_BULLET_MASK);
  bullet.shapes.add(shape);
  bullet.rotation = Math.atan2(dy, dx);
  bullet.isBullet = true;
  bullet.userData._colorIdx = _playerMod.type === "explode" ? 1 : 2;
  bullet.userData._playerBullet = true;
  bullet.userData._damage = 1;
  bullet.userData._life = 90;
  bullet.userData._explode = _playerMod.type === "explode";
  bullet.userData._portalCd = 0;
  bullet.cbTypes.add(_cbPlayerBullet);
  bullet.velocity = new Vec2(nx * 600, ny * 600);
  bullet.space = _space;
}

// Base auto-fire: finds nearest enemy within BASE_AIM_RANGE and spawns a
// bullet that reuses the player-bullet cbType + flag, so existing
// listeners (player bullet → enemy / wall) handle it without extra
// plumbing. Bullet just deals more damage and is colored differently.
// Pick the N nearest enemies to the base within BASE_AIM_RANGE.
function findNearestEnemiesToBase(n) {
  if (!_base?.space) return [];
  const bx = _base.position.x, by = _base.position.y;
  const r2 = BASE_AIM_RANGE * BASE_AIM_RANGE;
  const candidates = [];
  for (const body of _space.bodies) {
    if (!body.userData?._enemy) continue;
    const d2 = distSq(bx, by, body.position.x, body.position.y);
    if (d2 < r2) candidates.push({ body, d2 });
  }
  candidates.sort((a, b) => a.d2 - b.d2);
  return candidates.slice(0, n).map(c => c.body);
}

function spawnBaseBullet(nx, ny) {
  const bx = _base.position.x, by = _base.position.y;
  const off = BASE_R + 6;
  const bullet = new Body(BodyType.DYNAMIC, new Vec2(bx + nx * off, by + ny * off));
  const shape = new Circle(3.5, undefined, new Material(0.1, 0.1, 0.1, 0.01));
  shape.filter = new InteractionFilter(GROUP_PROJECTILE, PLAYER_BULLET_MASK);
  bullet.shapes.add(shape);
  bullet.rotation = Math.atan2(ny, nx);
  bullet.isBullet = true;
  bullet.userData._colorIdx = 1;
  bullet.userData._playerBullet = true; // existing listeners apply damage
  bullet.userData._damage = BASE_BULLET_DAMAGE;
  bullet.userData._life = 75;
  bullet.userData._explode = false;
  bullet.userData._portalCd = 0;
  bullet.cbTypes.add(_cbPlayerBullet);
  bullet.velocity = new Vec2(nx * BASE_BULLET_SPEED, ny * BASE_BULLET_SPEED);
  bullet.space = _space;
}

// Base fires two bullets per cooldown — one at each of the two nearest
// enemies. If only one enemy is within range, both bullets target it
// with a small spread angle so the second isn't wasted.
function fireBaseShot() {
  if (!_base?.space) return false;
  const targets = findNearestEnemiesToBase(2);
  if (targets.length === 0) return false;

  const bx = _base.position.x, by = _base.position.y;
  if (targets.length >= 2) {
    for (const t of targets) {
      const dx = t.position.x - bx, dy = t.position.y - by;
      const d = Math.hypot(dx, dy) || 1;
      spawnBaseBullet(dx / d, dy / d);
    }
  } else {
    // Only one target — fire two bullets ±6° apart at it.
    const t = targets[0];
    const dx = t.position.x - bx, dy = t.position.y - by;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    const a = 0.10; // ~6 degrees
    const c = Math.cos(a), s = Math.sin(a);
    spawnBaseBullet(nx * c - ny * s, nx * s + ny * c);
    spawnBaseBullet(nx * c + ny * s, -nx * s + ny * c);
  }
  return true;
}

function firePlayerShot() {
  const target = findNearestEnemy();
  if (!target) return false;
  const dx = target.position.x - _player.position.x;
  const dy = target.position.y - _player.position.y;
  const mod = _playerMod.type;

  if (mod === "homing") {
    // Single homing missile per shot — costs cooldown, but it tracks.
    spawnHomingMissile(dx, dy);
    return true;
  }

  let angles;
  if (mod === "triple")      angles = [-0.26, 0, 0.26];
  else if (mod === "double") angles = [-0.08, 0.08];
  else                       angles = [0];
  for (const ang of angles) {
    const c = Math.cos(ang), s = Math.sin(ang);
    spawnPlayerBullet(dx * c - dy * s, dx * s + dy * c);
  }
  return true;
}

function spawnHomingMissile(dx, dy) {
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  const off = PLAYER_R + 4;
  const sx = _player.position.x + nx * off;
  const sy = _player.position.y + ny * off;
  const bullet = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  // Slightly bigger than a normal bullet so the trail reads clearly.
  const shape = new Circle(4, undefined, new Material(0.1, 0.1, 0.1, 0.05));
  shape.filter = new InteractionFilter(GROUP_PROJECTILE, PLAYER_BULLET_MASK);
  bullet.shapes.add(shape);
  bullet.rotation = Math.atan2(ny, nx);
  bullet.isBullet = true;
  bullet.userData._colorIdx = 1;
  bullet.userData._playerBullet = true;
  bullet.userData._homing = true;     // step loop steers it
  bullet.userData._damage = 2;        // worth more than a default bullet
  bullet.userData._life = HOMING_LIFE;
  bullet.userData._explode = false;
  bullet.userData._portalCd = 0;
  bullet.cbTypes.add(_cbPlayerBullet);
  bullet.velocity = new Vec2(nx * HOMING_SPEED, ny * HOMING_SPEED);
  bullet.space = _space;
}

function fireEnemyBullet(enemy, nx, ny) {
  const r = enemy.shapes.at(0).castCircle.radius;
  const off = r + 4;
  const sx = enemy.position.x + nx * off;
  const sy = enemy.position.y + ny * off;
  const bullet = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  const shape = new Circle(3, undefined, new Material(0.1, 0.1, 0.1, 0.01));
  shape.filter = new InteractionFilter(GROUP_PROJECTILE, ENEMY_BULLET_MASK);
  bullet.shapes.add(shape);
  bullet.isBullet = true;
  bullet.userData._colorIdx = 4;
  bullet.userData._enemyBullet = true;
  bullet.userData._damage = ENEMY_BULLET_DAMAGE;
  bullet.userData._life = 120;
  bullet.userData._portalCd = 0;
  bullet.cbTypes.add(_cbEnemyBullet);
  bullet.velocity = new Vec2(nx * ENEMY_BULLET_SPEED, ny * ENEMY_BULLET_SPEED);
  bullet.space = _space;
}

function explodeBullet(bullet, radius, damage, impulse) {
  const bx = bullet.position.x, by = bullet.position.y;
  const r2 = radius * radius;
  const affected = [];
  for (const body of _space.bodies) {
    if (body.isStatic()) continue;
    if (body === bullet) continue;
    const dx = body.position.x - bx, dy = body.position.y - by;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    affected.push({ body, dx, dy, d: Math.sqrt(d2) });
  }
  for (const { body, dx, dy, d } of affected) {
    const dd = d || 1;
    const falloff = 1 - dd / radius;
    if (impulse > 0) {
      body.applyImpulse(new Vec2((dx / dd) * impulse * falloff, (dy / dd) * impulse * falloff));
    }
    if (body.userData?._enemy && damage > 0) {
      body.userData._hp -= damage * falloff;
      if (body.userData._hp <= 0) killEnemy(body);
    }
  }
  bullet.space = null;
  emitDebrisAt(bx, by, 14, 50, 160);
}

// ── Enemy death — proper Voronoi shatter via fractureBody ────────────────
// The enemy is a Circle (movement-safe). On death we substitute a transient
// regular polygon at the same pos/vel and pass it to fractureBody, which
// computes Voronoi sites and clips the polygon into clean shards. Each
// fragment inherits `_fragmentLife` so the step loop fades it out.
function shatterEnemy(enemy) {
  const x = enemy.position.x, y = enemy.position.y;
  const vx = enemy.velocity.x, vy = enemy.velocity.y;
  const r = enemy.shapes.at(0).castCircle.radius;
  const colorIdx = enemy.userData._colorIdx;

  // Build a regular octagon (`fractureBody` requires a polygon shape).
  const verts = [];
  const SIDES = 8;
  for (let i = 0; i < SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2;
    verts.push(new Vec2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const corpse = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // No explicit Material → default (avoids P53 tunneling), and we kill the
  // body in the same frame anyway via fractureBody. Zero starting velocity
  // — we don't want fragments to inherit the enemy's lunge speed, which
  // would scatter them across the arena. The radial explosion impulse
  // alone gives the burst its kick.
  const corpseShape = new Polygon(verts);
  corpseShape.filter = new InteractionFilter(GROUP_FRAGMENT,
    GROUP_WALL | GROUP_BASE | GROUP_FRAGMENT);
  corpse.shapes.add(corpseShape);
  corpse.velocity = new Vec2(0, 0);
  corpse.space = _space;
  void vx; void vy;

  const count = enemy.userData._kind === "boss" ? 12
              : enemy.userData._kind === "ranged" ? 6
              : 7;
  let result = null;
  try {
    result = fractureBody(corpse, new Vec2(x, y), {
      fragmentCount: count,
      // Tiny impulse — fragments should land within roughly twice the
      // enemy's own radius. With FRAGMENT_DAMPING=0.85, 30 px/s impulse
      // travels ≈ 100 px before stopping; perfect for a contained splat.
      explosionImpulse: enemy.userData._kind === "boss" ? 35 : 20,
      filter: new InteractionFilter(GROUP_FRAGMENT,
        GROUP_WALL | GROUP_BASE | GROUP_FRAGMENT),
    });
  } catch (_) {
    if (corpse.space) corpse.space = null;
  }

  if (result) {
    for (const f of result.fragments) {
      try {
        f.userData._fragment = true;
        f.userData._colorIdx = colorIdx;
        f.userData._fragmentLife = FRAGMENT_LIFE;
      } catch (_) {}
    }
  }
}

function killEnemy(enemy) {
  if (!enemy.space) return;
  const x = enemy.position.x, y = enemy.position.y;
  const ud = enemy.userData;
  _score += 1;

  // Voronoi shatter BEFORE we remove the enemy so we can read its current
  // velocity / shape size cleanly. shatterEnemy spawns the corpse + fragments
  // at (x,y) — they don't interfere with the still-live enemy because the
  // corpse is dynamic and resolves through fractureBody on the same frame.
  shatterEnemy(enemy);

  enemy.space = null;
  if (!ud._summoned && Math.random() < POWERUP_DROP_CHANCE) {
    spawnPowerup(x, y);
  }

  // Particle-emitter spark burst — sparks collide with walls and decelerate
  // (top-down "ground-friction" feel, not "infinity flight").
  const burst = ud._kind === "boss" ? DEBRIS_PER_KILL_BASE * 2
              : DEBRIS_PER_KILL_BASE;
  emitDebrisAt(x, y, burst, 70, 200);

  if (_runnerRef?.shakeCamera) {
    if (ud._kind === "boss") _runnerRef.shakeCamera(14, 0.4);
    else _runnerRef.shakeCamera(3, 0.12);
  }
}

function emitDebrisAt(x, y, count, speedMin, speedMax) {
  if (!_debris) return;
  if (_debris.origin instanceof Vec2) {
    _debris.origin.x = x; _debris.origin.y = y;
  } else {
    _debris.origin = new Vec2(x, y);
  }
  // Override speed pattern for this burst.
  const v = _debris.velocity;
  if (v && v.kind === "radial") {
    v.speedMin = speedMin;
    v.speedMax = speedMax;
  }
  _debris.emit(count);
}

// ── Power-ups ─────────────────────────────────────────────────────────────
function spawnPowerup(x, y) {
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  const body = new Body(BodyType.STATIC, new Vec2(x, y));
  const shape = new Circle(9);
  shape.filter = new InteractionFilter(GROUP_POWERUP, GROUP_PLAYER);
  shape.sensorEnabled = true;
  body.shapes.add(shape);
  body.userData._powerup = true;
  body.userData._type = type;
  body.userData._life = POWERUP_LIFETIME;
  body.cbTypes.add(_cbPowerup);
  body.space = _space;
}

function applyPowerup(type) {
  if (type === "heal") {
    _playerHP = Math.min(PLAYER_MAX_HP, _playerHP + Math.round(PLAYER_MAX_HP * 0.25));
    return;
  }
  if (type === "shield") {
    _shieldFrames = 360;
    _playerMod.type = "shield";
    _playerMod.timer = 360;
    return;
  }
  _playerMod.type = type;
  _playerMod.timer = POWERUP_DURATION;
}

// ── Deferred queue drain ──────────────────────────────────────────────────
function processPending() {
  for (const { enemy, damage } of _pending.enemyHit) {
    if (!enemy.space) continue;
    enemy.userData._hp -= damage;
    if (enemy.userData._hp <= 0) killEnemy(enemy);
  }
  _pending.enemyHit.length = 0;

  for (const bullet of _pending.removeBullet) {
    if (bullet.space) bullet.space = null;
  }
  _pending.removeBullet.length = 0;

  for (const bullet of _pending.aoeDetonate) {
    if (!bullet.space) continue;
    explodeBullet(bullet, EX_RADIUS, EX_DAMAGE, EX_IMPULSE);
  }
  _pending.aoeDetonate.length = 0;

  if (_pending.playerHit.length > 0 && _player?.space && _playerInvuln <= 0
      && _shieldFrames <= 0 && !_gameOver && !_victory) {
    let dmg = 0;
    for (const { damage } of _pending.playerHit) dmg += damage;
    _playerHP -= dmg;
    _playerInvuln = PLAYER_INVULN_FRAMES;
    if (_playerHP <= 0) {
      _playerHP = 0;
      _gameOver = true;
    }
  }
  _pending.playerHit.length = 0;

  if (_pending.baseHit.length > 0 && _baseHP > 0) {
    let dmg = 0;
    for (const { damage } of _pending.baseHit) dmg += damage;
    _baseHP = Math.max(0, _baseHP - dmg);
    if (_baseHP <= 0) _gameOver = true;
  }
  _pending.baseHit.length = 0;

  for (const p of _pending.pickupPowerup) {
    if (!p.space) continue;
    applyPowerup(p.userData._type);
    p.space = null;
  }
  _pending.pickupPowerup.length = 0;

  for (const p of _pending.removePowerup) {
    if (p.space) p.space = null;
  }
  _pending.removePowerup.length = 0;

  for (const mine of _pending.detonateMine) {
    if (mine.space) detonateMine(mine);
  }
  _pending.detonateMine.length = 0;

  for (const { body, fromId } of _pending.teleport) {
    if (!body.space) continue;
    if (body.userData._portalCd > 0) continue;
    teleportBody(body, fromId);
  }
  _pending.teleport.length = 0;
}

// ── Wave flow ─────────────────────────────────────────────────────────────
function startWave() {
  _wave++;
  _waveActive = true;
  if (_wave % 5 === 0) _waveType = "boss";
  else if (_wave % 4 === 0) _waveType = "healer";
  else if (_wave % 3 === 0) _waveType = "speed";
  else _waveType = "normal";

  const fiveTier = Math.floor((_wave - 1) / 5);
  if (_waveType === "boss") {
    _toSpawn = 8 + fiveTier + 1;
    _spawnInterval = Math.max(35, 70 - _wave * 2);
    _bossPending = true;
  } else if (_waveType === "speed") {
    _toSpawn = 9 + Math.floor(_wave / 2) + fiveTier;
    _spawnInterval = Math.max(20, 45 - _wave);
  } else if (_waveType === "healer") {
    _toSpawn = 8 + Math.floor(_wave / 2) + fiveTier;
    _spawnInterval = Math.max(40, 75 - _wave * 2);
  } else {
    _toSpawn = 8 + Math.floor(_wave / 2) + fiveTier;
    _spawnInterval = Math.max(30, 70 - _wave * 2);
  }
  _spawnTimer = 30;
}

function spawnForWave() {
  if (_toSpawn <= 0) return;
  _spawnTimer--;
  if (_spawnTimer > 0) return;
  _spawnTimer = _spawnInterval;

  if (_bossPending && _toSpawn === 1) {
    spawnEnemy("boss");
    _bossPending = false;
    _toSpawn = 0;
    return;
  }

  let kind;
  if (_waveType === "speed") {
    kind = Math.random() < 0.7 ? "speeder" : (Math.random() < 0.5 ? "ranged" : "melee");
  } else if (_waveType === "healer") {
    const r = Math.random();
    if (r < 0.25) kind = "healer";
    else if (r < 0.55) kind = "ranged";
    else kind = "melee";
  } else if (_waveType === "boss") {
    kind = Math.random() < 0.30 ? "ranged" : "melee";
  } else {
    kind = Math.random() < 0.45 ? "ranged" : "melee";
  }
  spawnEnemy(kind);
  _toSpawn--;
}

function resetGame() {
  const toKill = [];
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (ud?._enemy || ud?._playerBullet || ud?._enemyBullet || ud?._powerup
        || ud?._player || ud?._mine || ud?._fragment || ud?._base) {
      toKill.push(body);
    }
  }
  for (const b of toKill) b.space = null;

  _player = spawnPlayer(_space);
  _base = spawnBase(_space);
  _baseHP = BASE_MAX_HP;
  _playerHP = PLAYER_MAX_HP;
  _playerInvuln = 0;
  _playerShotCooldown = 0;
  _baseFireCooldown = 0;
  _playerMod = { type: null, timer: 0 };
  _shieldFrames = 0;
  _dashTimer = 0;
  _dashCdTimer = 0;
  _dashRequested = false;
  _wave = 0;
  _waveActive = false;
  _waveTimer = FIRST_WAVE_DELAY;
  _toSpawn = 0;
  _bossPending = false;
  _score = 0;
  _gameOver = false;
  _victory = false;
  _stickActive = false;
  _stickVec = { x: 0, y: 0 };
  _moveDir.x = 0; _moveDir.y = 0;
  for (const k in _pending) _pending[k].length = 0;

  // Re-aim camera at the player and snap.
  if (_runnerRef) {
    _runnerRef.updateCamera({ follow: _player });
    _runnerRef.snapCamera();
  }
}

// ── Input ─────────────────────────────────────────────────────────────────
function computeMoveDir() {
  if (_stickActive && (_stickVec.x !== 0 || _stickVec.y !== 0)) {
    _moveDir.x = _stickVec.x;
    _moveDir.y = _stickVec.y;
    return;
  }
  let x = 0, y = 0;
  if (_keys["KeyW"] || _keys["ArrowUp"])    y -= 1;
  if (_keys["KeyS"] || _keys["ArrowDown"])  y += 1;
  if (_keys["KeyA"] || _keys["ArrowLeft"])  x -= 1;
  if (_keys["KeyD"] || _keys["ArrowRight"]) x += 1;
  const len = Math.hypot(x, y);
  if (len > 0) { x /= len; y /= len; }
  _moveDir.x = x;
  _moveDir.y = y;
}

function applyPlayerVelocity() {
  if (!_player?.space) return;

  // ── Dash state machine ─────────────────────────────────────────────
  // - keydown sets _dashRequested
  // - request triggers a dash if cooldown clear and there's a direction
  // - while dashing, player velocity is locked at PLAYER_DASH_SPEED in
  //   the captured direction (movement keys ignored — the dash is fixed)
  // - dash also grants i-frames (set _playerInvuln so existing damage
  //   guards skip)
  if (_dashCdTimer > 0) _dashCdTimer--;
  if (_dashTimer > 0)   _dashTimer--;

  if (_dashRequested) {
    _dashRequested = false;
    if (_dashCdTimer <= 0 && _dashTimer <= 0) {
      // Use the current input direction; if none, use facing-toward-aim.
      let dx = _moveDir.x, dy = _moveDir.y;
      if (dx === 0 && dy === 0) {
        const t = findNearestEnemy();
        if (t) {
          dx = t.position.x - _player.position.x;
          dy = t.position.y - _player.position.y;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
        }
      }
      if (dx !== 0 || dy !== 0) {
        _dashDir.x = dx;
        _dashDir.y = dy;
        _dashTimer = PLAYER_DASH_DURATION;
        _dashCdTimer = PLAYER_DASH_COOLDOWN;
        if (_playerInvuln < PLAYER_DASH_IFRAMES) _playerInvuln = PLAYER_DASH_IFRAMES;
      }
    }
  }

  if (_dashTimer > 0) {
    // Hard-set velocity during dash — no blend, no input override.
    _player.velocity = new Vec2(_dashDir.x * PLAYER_DASH_SPEED,
                                _dashDir.y * PLAYER_DASH_SPEED);
    return;
  }

  const tvx = _moveDir.x * PLAYER_SPEED;
  const tvy = _moveDir.y * PLAYER_SPEED;
  const vx = _player.velocity.x, vy = _player.velocity.y;
  const blend = 0.3;
  _player.velocity = new Vec2(vx + (tvx - vx) * blend, vy + (tvy - vy) * blend);
}

function inStickZone(sx, sy) {
  // Joystick zone is in *screen* space (canvas coords), but click handlers
  // get *world* coords. Convert back via the camera offset.
  const camX = _runnerRef?.camera?.x ?? 0;
  const camY = _runnerRef?.camera?.y ?? 0;
  const screenX = sx - camX;
  const screenY = sy - camY;
  return screenX <= STICK_ZONE_W && screenY >= STICK_ZONE_Y;
}

// ── Rendering ─────────────────────────────────────────────────────────────
// canvas2d uses its own custom render() for world-space drawing (so we can
// use our own grid + body draw); 3D + Pixi go through render3dOverlay which
// translates by -cam itself for world-space content and resets for HUD.

function drawHpBar(ctx, body) {
  const ud = body.userData;
  const hp = ud._hp, max = ud._maxHp;
  if (hp >= max) return;
  const r = body.shapes.at(0).castCircle.radius;
  const x = body.position.x, y = body.position.y - r - 5;
  const w = Math.max(14, r * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - w / 2, y, w, 3);
  ctx.fillStyle = ud._kind === "healer" ? "#3fb950" : "#f85149";
  ctx.fillRect(x - w / 2, y, w * Math.max(0, hp / max), 3);
}

function drawPortals(ctx) {
  for (let i = 0; i < _portals.length; i++) {
    const p = _portals[i];
    if (!p.body.space) continue;
    const color = i < 2 ? "#58a6ff" : "#f85149";
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PORTAL_R, 0, Math.PI * 2);
    ctx.stroke();
    const t = performance.now() * 0.004;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.4) {
      const rr = 6 + 6 * Math.sin(a * 2 + t + i);
      const cx = p.x + Math.cos(a + t) * rr;
      const cy = p.y + Math.sin(a + t) * rr;
      if (a === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawBaseRing(ctx) {
  if (!_base?.space) return;
  const x = _base.position.x, y = _base.position.y;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, BASE_R + 6, 0, Math.PI * 2);
  ctx.stroke();
  const pct = _baseHP / BASE_MAX_HP;
  ctx.strokeStyle = pct < 0.3 ? "#f85149" : pct < 0.6 ? "#d29922" : "#3fb950";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, BASE_R + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BASE", x, y);
  ctx.restore();
}

function drawPlayerRing(ctx) {
  if (!_player?.space) return;
  const x = _player.position.x, y = _player.position.y;
  const pct = _playerHP / PLAYER_MAX_HP;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.strokeStyle = _playerHP <= 25 ? "#f85149" : "#3fb950";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (_playerInvuln > 0 && Math.floor(_playerInvuln / 3) % 2 === 0) {
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }
  if (_shieldFrames > 0) {
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R + 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(121,192,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Dash cooldown ring — small ticking arc just outside the HP ring,
  // sweeping back to full as the cooldown drains. Bright while ready.
  if (_dashCdTimer > 0) {
    const cdPct = 1 - _dashCdTimer / PLAYER_DASH_COOLDOWN;
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdPct);
    ctx.strokeStyle = "rgba(255,200,80,0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Ready — full dim ring as a "Space available" hint.
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,200,80,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Dash trail — quick fading streak along dash direction.
  if (_dashTimer > 0) {
    const trailLen = 22;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - _dashDir.x * trailLen, y - _dashDir.y * trailLen);
    ctx.strokeStyle = "rgba(255,200,80,0.85)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
  }
}

function drawAimLine(ctx) {
  if (!_player?.space || _gameOver || _victory) return;
  const target = findNearestEnemy();
  if (!target) return;
  ctx.beginPath();
  ctx.moveTo(_player.position.x, _player.position.y);
  ctx.lineTo(target.position.x, target.position.y);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPowerups(ctx) {
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._powerup) continue;
    const x = body.position.x, y = body.position.y;
    const color = POWERUP_COLORS[ud._type];
    const label = POWERUP_LABELS[ud._type];
    const pulse = 1 + Math.sin(ud._life * 0.15) * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, 10 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.font = "bold 9px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + 0.5);
    if (ud._life < 120 && Math.floor(ud._life / 6) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawMines(ctx) {
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._mine) continue;
    const x = body.position.x, y = body.position.y;
    const pulse = 1 + Math.sin(ud._fuse * 0.4) * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#30363d";
    ctx.fill();
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 12 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(248,81,73,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    const pct = ud._fuse / BOSS_MINE_FUSE;
    ctx.beginPath();
    ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawAbilityRings(ctx) {
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy) continue;
    const r = body.shapes.at(0).castCircle.radius;
    const x = body.position.x, y = body.position.y;
    if (ud._chargeTimer > 0 || ud._dashTimer > 0) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = ud._dashTimer > 0 ? "#79c0ff" : "#f85149";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (ud._healPulse > 0) {
      const a = ud._healPulse / 28;
      ctx.beginPath();
      ctx.arc(x, y, HEALER_HEAL_RANGE * (1 - a), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(63,185,80,${0.5 * a + 0.1})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (ud._shockwavePulse > 0) {
      const a = ud._shockwavePulse / 24;
      ctx.beginPath();
      ctx.arc(x, y, BOSS_SHOCKWAVE_RADIUS * (1 - a), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,140,66,${0.6 * a + 0.1})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ud._shockwavePulse--;
    }
  }
}

// Particle-emitter sparks rendered as fading orange dots.
function drawDebris(ctx) {
  if (!_debris) return;
  const live = _debris.active;
  const ages = _debris.ages;
  const lts = _debris.lifetimes;
  for (let i = 0; i < live.length; i++) {
    const t = Math.min(1, ages[i] / lts[i]);
    const a = (1 - t).toFixed(2);
    ctx.fillStyle = `rgba(245,180,80,${a})`;
    const b = live[i];
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, _debris.particleRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTopHUD(ctx) {
  ctx.fillStyle = "rgba(13,17,23,0.82)";
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Wave ${_wave}`, 10, 14);
  ctx.fillStyle = "#58a6ff";
  ctx.fillText(`Score: ${_score}`, 90, 14);
  ctx.fillStyle = _playerHP <= 25 ? "#f85149" : "#3fb950";
  ctx.fillText(`HP: ${_playerHP}`, 180, 14);
  ctx.fillStyle = _baseHP <= BASE_MAX_HP * 0.25 ? "#f85149" : "#d29922";
  ctx.fillText(`Base: ${Math.ceil(_baseHP)}`, 240, 14);

  if (_playerMod.type) {
    const sec = Math.ceil(_playerMod.timer / 60);
    const col = POWERUP_COLORS[_playerMod.type] ?? "#fff";
    const label = `${_playerMod.type.toUpperCase()} ${sec}s`;
    ctx.fillStyle = col;
    ctx.fillText(label, 320, 14);
  }

  // Wave timer always shown — the next wave starts on cadence regardless
  // of whether this one finished, so the player can plan around it.
  if (!_gameOver && !_victory) {
    const s = Math.max(0, Math.ceil(_waveTimer / 60));
    const next = _wave + 1;
    const nextType = next % 5 === 0 ? "BOSS"
                   : next % 4 === 0 ? "HEALERS"
                   : next % 3 === 0 ? "SPEED"
                   : "Next wave";
    const isBoss = next % 5 === 0;

    if (_waveActive) {
      // Show the active wave label first, then the next-wave countdown.
      const activeLabel = _waveType === "boss" ? "⚠ BOSS WAVE"
                        : _waveType === "speed" ? "⚡ SPEED WAVE"
                        : _waveType === "healer" ? "+ HEALER WAVE"
                        : "WAVE ACTIVE";
      ctx.fillStyle = _waveType === "boss" ? "#f85149"
                    : _waveType === "speed" ? "#79c0ff"
                    : _waveType === "healer" ? "#3fb950"
                    : "rgba(255,255,255,0.85)";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(activeLabel, VIEW_W - 110, 14);
      ctx.fillStyle = isBoss ? "#f85149" : "rgba(255,255,255,0.6)";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(`${nextType} in ${s}s`, VIEW_W - 10, 14);
    } else {
      ctx.fillStyle = isBoss ? "#f85149" : "rgba(255,255,255,0.7)";
      ctx.textAlign = "right";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(`${nextType} in ${s}s`, VIEW_W - 10, 14);
    }
  }
}

function drawJoystick(ctx) {
  if (!_isTouch) return;
  if (!_stickActive) {
    const cx = 70, cy = VIEW_H - 70;
    ctx.beginPath();
    ctx.arc(cx, cy, STICK_MAX_R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("move", cx, cy);
    return;
  }
  // Stick origin/vec are stored in world coords; convert to screen for the
  // overlay (HUD layer is screen-space, no camera translation).
  const camX = _runnerRef?.camera?.x ?? 0;
  const camY = _runnerRef?.camera?.y ?? 0;
  const ox = _stickOrigin.x - camX;
  const oy = _stickOrigin.y - camY;
  const kx = ox + _stickVec.x * STICK_MAX_R;
  const ky = oy + _stickVec.y * STICK_MAX_R;
  ctx.beginPath();
  ctx.arc(ox, oy, STICK_MAX_R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(kx, ky, 18, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();
}

function drawGameOver(ctx) {
  if (!_gameOver && !_victory) return;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = _victory ? "#3fb950" : "#f85149";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(_victory ? "Victory" : "Game Over", VIEW_W / 2, VIEW_H / 2 - 18);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Survived ${_wave} wave${_wave === 1 ? "" : "s"} — Score ${_score}`,
               VIEW_W / 2, VIEW_H / 2 + 10);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Click / tap anywhere to restart", VIEW_W / 2, VIEW_H / 2 + 36);
}

// World-space layer: portals, debris sparks, HP bars, ability rings, base
// ring, player ring, mines, powerups, aim line. Translates by -cam internally
// so it works as both canvas2d render() world section AND inside the 3D/Pixi
// overlay (which receives camX/camY).
function drawWorldOverlay(ctx, camX, camY) {
  ctx.save();
  ctx.translate(-camX, -camY);
  drawPortals(ctx);
  drawDebris(ctx);
  drawAimLine(ctx);
  drawMines(ctx);
  drawPowerups(ctx);
  drawAbilityRings(ctx);
  drawBaseRing(ctx);
  drawPlayerRing(ctx);
  for (const body of _space.bodies) {
    if (body.userData?._enemy) drawHpBar(ctx, body);
  }
  ctx.restore();
}

// Screen-space layer: HUD + joystick + game-over banner.
function drawScreenHUD(ctx) {
  drawJoystick(ctx);
  drawTopHUD(ctx);
  drawGameOver(ctx);
}

// Age fragments + bullets + powerups + mines + portal cooldowns. Also
// applies linear damping to fragments so they settle (top-down feel),
// and steers any active homing missiles toward the nearest enemy.
//
// IMPORTANT: defined BEFORE the default export. The CodePen template
// extracts the module-level preamble between the last `import` and the
// `export default` statement; anything after the export is dropped, so
// the codepen sandbox would throw `ageVisualBodies is not defined`.
function ageVisualBodies(space) {
  const expired = [];
  for (const body of space.bodies) {
    const ud = body.userData;
    if (!ud) continue;
    if (ud._portalCd > 0 && (ud._playerBullet || ud._enemyBullet || ud._fragment || ud._player)) {
      ud._portalCd--;
    }
    if (ud._playerBullet || ud._enemyBullet) {
      ud._life--;
      if (ud._life <= 0) { expired.push(body); continue; }

      // Homing missile steering: each frame, rotate the missile's velocity
      // up to HOMING_TURN_RATE radians toward the nearest enemy (within
      // HOMING_ACQUIRE_RANGE). Speed is held constant so visuals stay
      // consistent and the missile arc is readable.
      if (ud._homing) {
        const px = body.position.x, py = body.position.y;
        let bestEnemy = null, bestD2 = HOMING_ACQUIRE_RANGE * HOMING_ACQUIRE_RANGE;
        for (const e of space.bodies) {
          if (!e.userData?._enemy) continue;
          const ex = e.position.x, ey = e.position.y;
          const d2 = (ex - px) * (ex - px) + (ey - py) * (ey - py);
          if (d2 < bestD2) { bestD2 = d2; bestEnemy = e; }
        }
        if (bestEnemy) {
          const tx = bestEnemy.position.x - px;
          const ty = bestEnemy.position.y - py;
          const desired = Math.atan2(ty, tx);
          const current = Math.atan2(body.velocity.y, body.velocity.x);
          let diff = desired - current;
          while (diff > Math.PI)  diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Math.max(-HOMING_TURN_RATE, Math.min(HOMING_TURN_RATE, diff));
          const ang = current + turn;
          body.velocity = new Vec2(Math.cos(ang) * HOMING_SPEED,
                                   Math.sin(ang) * HOMING_SPEED);
          body.rotation = ang;
        }
      }
    } else if (ud._powerup) {
      ud._life--;
      if (ud._life <= 0) _pending.removePowerup.push(body);
    } else if (ud._mine) {
      ud._fuse--;
      if (ud._fuse <= 0) _pending.detonateMine.push(body);
    } else if (ud._fragment) {
      ud._fragmentLife -= 1 / 60;
      if (ud._fragmentLife <= 0) { expired.push(body); continue; }
      body.velocity = new Vec2(body.velocity.x * FRAGMENT_DAMPING,
                               body.velocity.y * FRAGMENT_DAMPING);
      body.angularVel *= FRAGMENT_DAMPING;
    }
  }
  for (const b of expired) b.space = null;
}

// ── Demo definition ───────────────────────────────────────────────────────
export default {
  id: "arena-defense",
  label: "Arena Defense",
  tags: ["Gameplay", "Camera", "fractureBody", "Portals", "ParticleEmitter", "Callbacks", "Sensors"],
  featured: true,
  featuredOrder: 4,
  desc:
    "Mash-up of <b>top-down shooter</b> + <b>tower defense</b> + <b>portals</b> + <b>destructible bodies</b>. " +
    "Big <b>1800×1200</b> world with a <b>camera that follows the player</b>. Enemies enter from each side " +
    "along a short L-shaped corridor and converge on the central <b>base</b> (HP 800, solid obstacle, " +
    "auto-fires at the nearest enemy). " +
    "Waves run on a fixed <b>12s cadence</b> — a slow wave doesn't delay the next one, so pile-ups are part of the challenge. " +
    "<b>WASD</b> move, <b>Space</b> dash (i-frames), auto-fire targets the nearest enemy. Step into a coloured " +
    "<b>portal</b> to teleport. Every kill shatters the enemy via <code>fractureBody</code> (Voronoi shards) plus a " +
    "short particle-emitter spark burst. " +
    "Wave types: <b>speed</b> (dash-rushers), <b>healer</b> (green pulse-heals allies), and every 5th — a <b>boss</b> " +
    "with shotgun, mines, summoned minions, and an AoE <b>shockwave</b>. " +
    "Power-ups (40% drop): 2x/3x spread, EX explosive, RF rapid-fire, HP heal, SH shield, <b>HM homing missiles</b>.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);
    _runnerRef = this._runner ?? null;

    _cbPlayer = new CbType();
    _cbEnemy = new CbType();
    _cbPlayerBullet = new CbType();
    _cbEnemyBullet = new CbType();
    _cbWall = new CbType();
    _cbPowerup = new CbType();
    _cbBase = new CbType();
    _cbPortal = new CbType();

    buildWorld(space);
    buildPortals(space);
    _player = spawnPlayer(space);
    _base = spawnBase(space);

    // Camera: follow the player, clamp to world bounds.
    this.camera = {
      follow: _player,
      offsetX: 0,
      offsetY: -HUD_H / 2,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.1,
    };

    // Particle-emitter debris — sparks. Important details for the "top-down
    // dust on the floor" feel:
    //   - particleFilter mask includes WALL → sparks bounce off corridor
    //     walls instead of phasing through them.
    //   - non-zero density Material with high friction → engine resolves
    //     collisions cleanly.
    //   - onUpdate hook applies per-frame linear damping so particles
    //     decelerate (engine has no built-in linear drag for non-fluid
    //     bodies). This kills the "infinity flight" look.
    _debris = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      velocity: { kind: "radial", speedMin: 60, speedMax: 200 },
      maxParticles: 240,
      // Short lifetimes — calibrated against destructible-arena.js sparks
      // (0.15..0.45). Top-down zero-g particles linger visibly without
      // gravity pulling them away, so we cut their lifetime short.
      lifetimeMin: 0.18,
      lifetimeMax: 0.42,
      particleRadius: 1.6,
      particleMaterial: new Material(0.05, 0.9, 1.2, 0.6),
      // Debris collides with WALL only — passes through enemies/players/
      // bullets/base/fragments so it doesn't push gameplay around.
      particleFilter: new InteractionFilter(GROUP_DEBRIS, GROUP_WALL),
      selfCollision: false,
      onUpdate: (body /* age, dt */) => {
        // Apply damping each frame — top-down friction. Dynamic bodies in
        // 0-gravity space drift forever otherwise.
        body.velocity = new Vec2(body.velocity.x * DEBRIS_DAMPING,
                                 body.velocity.y * DEBRIS_DAMPING);
      },
    });

    _baseHP = BASE_MAX_HP;
    _playerHP = PLAYER_MAX_HP;
    _playerInvuln = 0;
    _playerShotCooldown = 0;
    _playerMod = { type: null, timer: 0 };
    _shieldFrames = 0;
    _wave = 0;
    _waveActive = false;
    _waveTimer = FIRST_WAVE_DELAY;
    _toSpawn = 0;
    _bossPending = false;
    _score = 0;
    _gameOver = false;
    _victory = false;
    _stickActive = false;
    _stickVec = { x: 0, y: 0 };
    _moveDir.x = 0; _moveDir.y = 0;
    for (const k in _keys) delete _keys[k];
    for (const k in _pending) _pending[k].length = 0;

    _isTouch = typeof window !== "undefined" && (
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );

    // Player bullet → enemy
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayerBullet, _cbEnemy,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        if (!b1 || !b2) return;
        const bullet = b1.userData?._playerBullet ? b1 : b2;
        const enemy = b1.userData?._enemy ? b1 : b2;
        if (!bullet.space || !enemy.space || bullet.userData._spent) return;
        bullet.userData._spent = true;
        if (bullet.userData._explode) _pending.aoeDetonate.push(bullet);
        else {
          _pending.removeBullet.push(bullet);
          _pending.enemyHit.push({ enemy, damage: bullet.userData._damage });
        }
      },
    ));

    const playerBulletWallOrBase = (cb) => {
      const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
      const bullet = b1?.userData?._playerBullet ? b1 : b2?.userData?._playerBullet ? b2 : null;
      if (!bullet?.space || bullet.userData._spent) return;
      bullet.userData._spent = true;
      if (bullet.userData._explode) _pending.aoeDetonate.push(bullet);
      else _pending.removeBullet.push(bullet);
    };
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayerBullet, _cbWall, playerBulletWallOrBase));
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayerBullet, _cbBase, playerBulletWallOrBase));

    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbEnemyBullet, _cbPlayer,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._enemyBullet ? b1 : b2?.userData?._enemyBullet ? b2 : null;
        if (!bullet?.space || bullet.userData._spent) return;
        bullet.userData._spent = true;
        _pending.removeBullet.push(bullet);
        _pending.playerHit.push({ damage: bullet.userData._damage });
      },
    ));

    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbEnemyBullet, _cbWall,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._enemyBullet ? b1 : b2?.userData?._enemyBullet ? b2 : null;
        if (!bullet?.space || bullet.userData._spent) return;
        bullet.userData._spent = true;
        _pending.removeBullet.push(bullet);
      },
    ));
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbEnemyBullet, _cbBase,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._enemyBullet ? b1 : b2?.userData?._enemyBullet ? b2 : null;
        if (!bullet?.space || bullet.userData._spent) return;
        bullet.userData._spent = true;
        _pending.removeBullet.push(bullet);
        _pending.baseHit.push({ damage: bullet.userData._damage });
      },
    ));

    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbEnemy, _cbPlayer,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const enemy = b1?.userData?._enemy ? b1 : b2?.userData?._enemy ? b2 : null;
        if (!enemy?.space) return;
        _pending.playerHit.push({ damage: enemy.userData._contactDmg });
      },
    ));

    space.listeners.add(new InteractionListener(
      CbEvent.ONGOING, InteractionType.COLLISION, _cbEnemy, _cbBase,
      () => { _pending.baseHit.push({ damage: BASE_DAMAGE_FROM_CONTACT }); },
    ));

    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbPowerup, _cbPlayer,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const p = b1?.userData?._powerup ? b1 : b2?.userData?._powerup ? b2 : null;
        if (!p?.space || p.userData._spent) return;
        p.userData._spent = true;
        _pending.pickupPowerup.push(p);
      },
    ));

    // Portal sensor — fires on every shape that enters. Defer the actual
    // teleport so we don't relocate bodies mid-substep.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbPortal, CbType.ANY_SHAPE,
      (cb) => {
        const s1 = cb.int1.castShape, s2 = cb.int2.castShape;
        if (!s1 || !s2) return;
        const portalShape = s1.userData?._portalId != null ? s1
                          : s2.userData?._portalId != null ? s2
                          : null;
        if (!portalShape) return;
        const otherShape = portalShape === s1 ? s2 : s1;
        const otherBody = otherShape.body;
        if (!otherBody || !otherBody.isDynamic()) return;
        const ud = otherBody.userData;
        if (!ud) return;
        // Skip cosmetic / static-ish actors and other portals.
        if (ud._fragment || ud._powerup || ud._mine) return;
        if (otherShape.userData?._portalId != null) return;
        if (ud._portalCd > 0) return;
        _pending.teleport.push({ body: otherBody, fromId: portalShape.userData._portalId });
      },
    ));

    _onKeyDown = (e) => {
      if (!_space) return;
      const wasDown = _keys[e.code];
      _keys[e.code] = true;
      // Edge-trigger dash on Space — only on the keydown transition, so
      // holding the key doesn't spam dashes once the cooldown clears.
      if (e.code === "Space" && !wasDown) {
        _dashRequested = true;
        e.preventDefault?.();
      }
    };
    _onKeyUp = (e) => { if (_space) _keys[e.code] = false; };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  cleanup() {
    if (_debris) { _debris.destroy(); _debris = null; }
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    _onKeyDown = _onKeyUp = null;
    _space = null;
    _player = _base = null;
    _portals = [];
    _runnerRef = null;
  },

  step(space) {
    // Ensure runner ref is captured even if setup() ran before injection.
    if (!_runnerRef) _runnerRef = this._runner ?? null;

    if (_gameOver || _victory) {
      processPending();
      // Still age out fragments + advance debris emitter so visuals settle.
      ageVisualBodies(space);
      if (_debris) _debris.update(1 / 60);
      return;
    }

    processPending();
    computeMoveDir();
    applyPlayerVelocity();
    steerEnemies();

    if (_playerInvuln > 0) _playerInvuln--;
    if (_shieldFrames > 0) _shieldFrames--;

    if (_playerMod.timer > 0) {
      _playerMod.timer--;
      if (_playerMod.timer <= 0) _playerMod.type = null;
    }

    if (_playerShotCooldown > 0) _playerShotCooldown--;
    if (_playerShotCooldown <= 0 && _player?.space) {
      if (firePlayerShot()) {
        _playerShotCooldown = _playerMod.type === "rapid"
          ? RAPID_SHOT_COOLDOWN
          : PLAYER_SHOT_COOLDOWN;
      }
    }

    // Base auto-fire — independent cooldown, shorter range, weaker but
    // adds chip damage that helps when the player is busy elsewhere.
    if (_baseFireCooldown > 0) _baseFireCooldown--;
    if (_baseFireCooldown <= 0 && _base?.space) {
      if (fireBaseShot()) _baseFireCooldown = BASE_FIRE_COOLDOWN;
    }

    // Wave timer ticks every frame, regardless of whether the previous
    // wave finished. When it hits zero, the next wave starts immediately
    // and the timer resets to WAVE_INTERVAL. If the previous wave hadn't
    // finished spawning yet, its remaining spawns are dropped — the
    // tighter cadence is more important than completing every wave.
    _waveTimer--;
    if (_waveTimer <= 0) {
      startWave();
      _waveTimer = WAVE_INTERVAL;
    }
    if (_waveActive) {
      spawnForWave();
      if (_toSpawn <= 0) {
        // Spawning complete — flip the HUD flag, but DON'T touch
        // _waveTimer (it keeps ticking toward the next wave).
        _waveActive = false;
      }
    }

    ageVisualBodies(space);
    if (_debris) _debris.update(1 / 60);
  },

  click(x, y) {
    if (_gameOver || _victory) {
      resetGame();
      return;
    }
    if (_isTouch && inStickZone(x, y)) {
      _stickActive = true;
      _stickOrigin = { x, y };
      _stickVec = { x: 0, y: 0 };
    }
  },

  drag(x, y) {
    if (!_stickActive) return;
    const dx = x - _stickOrigin.x;
    const dy = y - _stickOrigin.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) { _stickVec = { x: 0, y: 0 }; return; }
    const mag = Math.min(1, d / STICK_MAX_R);
    _stickVec = { x: (dx / d) * mag, y: (dy / d) * mag };
  },

  release() {
    _stickActive = false;
    _stickVec = { x: 0, y: 0 };
  },

  // canvas2d → custom render(). Draws background, grid, all bodies, then
  // calls the world+screen overlay layers. Mirrors destructible-arena.
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);

    // Draw bodies — apply per-body fade for fragments based on remaining life.
    for (let i = 0; i < space.bodies.length; i++) {
      const b = space.bodies.at(i);
      const ud = b.userData;
      // Fragment fade-out (both 2D and overlay path skip fragments below
      // a threshold since the demo runner draws bodies directly in canvas2d
      // mode, but in our custom render we control alpha here).
      if (ud?._fragment && typeof ud._fragmentLife === "number") {
        const t = Math.max(0, Math.min(1, ud._fragmentLife / FRAGMENT_LIFE));
        ctx.globalAlpha = 0.35 + t * 0.65;
      } else {
        ctx.globalAlpha = 1;
      }
      drawBody(ctx, b, showOutlines);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    drawWorldOverlay(ctx, camX, camY);
    drawScreenHUD(ctx);
    ctx.restore();
  },

  // 3D + Pixi → render bodies via adapter (default body sprites), then this
  // overlay paints world-space gameplay accents and screen-space HUD on top.
  render3dOverlay(ctx, _sp, _w, _h, camX = 0, camY = 0) {
    drawWorldOverlay(ctx, camX, camY);
    drawScreenHUD(ctx);
  },
};
