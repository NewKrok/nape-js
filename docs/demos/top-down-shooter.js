import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType, Ray,
} from "../nape-js.esm.js?v=3.42.0";

// Collision groups: 1=default, 2=projectile, 8=wall, 16=player, 32=enemy, 64=powerup.
// Player bullets stop on walls AND enemies; enemy bullets stop on walls AND player
// (but not other enemies — friendly-fire filtered out via separate cb flag).
const GROUP_PROJECTILE = 2;
const GROUP_WALL = 8;
const GROUP_PLAYER = 16;
const GROUP_ENEMY = 32;
const GROUP_POWERUP = 64;

// Player bullets stop on walls AND enemies. Enemy bullets pass through other
// enemies (so clustered enemies don't block each other's shots) — they only
// collide with walls + player.
const PLAYER_BULLET_MASK = GROUP_WALL | GROUP_ENEMY;
const ENEMY_BULLET_MASK = GROUP_WALL | GROUP_PLAYER;

// Arena (matches CW×CH in examples.js). 28px top HUD reserved.
// Named SCREEN_W/SCREEN_H (not W/H) to avoid colliding with the CodePen
// runtime template, which declares `const W = canvas.width, H = canvas.height`
// at the top of its generated script and would throw SyntaxError otherwise.
const SCREEN_W = 900, SCREEN_H = 500;
const HUD_H = 28;
const WT = 6;

// Spawn points — 4 corners, inset from arena edge.
const SPAWN_POINTS = [
  { x: 60,             y: HUD_H + 40 },
  { x: SCREEN_W - 60,  y: HUD_H + 40 },
  { x: 60,             y: SCREEN_H - 40 },
  { x: SCREEN_W - 60,  y: SCREEN_H - 40 },
];

// Interior cover walls — short L-shapes + two straight walls.
// Each entry is a list of points; consecutive pairs get an addWallSegment.
const COVER_WALLS = [
  // Upper-left L
  [{ x: 180, y: 120 }, { x: 260, y: 120 }, { x: 260, y: 180 }],
  // Upper-right L
  [{ x: 640, y: 120 }, { x: 720, y: 120 }, { x: 720, y: 180 }],
  // Lower-left L
  [{ x: 180, y: 380 }, { x: 180, y: 320 }, { x: 260, y: 320 }],
  // Lower-right L
  [{ x: 720, y: 380 }, { x: 720, y: 320 }, { x: 640, y: 320 }],
  // Center horizontal slabs
  [{ x: 380, y: 220 }, { x: 520, y: 220 }],
  [{ x: 380, y: 280 }, { x: 520, y: 280 }],
];

// ── Player ───────────────────────────────────────────────────────────────
const PLAYER_R = 12;
const PLAYER_SPEED = 180;
const PLAYER_MAX_HP = 100;
const PLAYER_SHOT_COOLDOWN = 12;   // frames (~5 shots/sec at 60fps)
const PLAYER_INVULN_FRAMES = 20;   // brief i-frames after melee contact
const AUTO_AIM_RANGE = 420;

// ── Enemies ──────────────────────────────────────────────────────────────
const ENEMY_MELEE_SPEED = 80;
const ENEMY_RANGED_SPEED = 70;
const ENEMY_BOSS_SPEED = 55;
const ENEMY_RANGED_HOLD_DIST = 200; // back off when closer than this
const ENEMY_RANGED_FIRE_COOLDOWN = 90;
const ENEMY_BOSS_FIRE_COOLDOWN = 140;
const ENEMY_BULLET_SPEED = 260;
const ENEMY_MELEE_DAMAGE = 8;
const ENEMY_BULLET_DAMAGE = 5;
const ENEMY_BOSS_CONTACT_DAMAGE = 14;

// Melee charge — periodic burst where they rush at 2x speed for a bit.
// Tuning scales per 5-wave tier (see fiveTier usage in spawnEnemy).
const MELEE_CHARGE_DURATION = 90;   // frames
const MELEE_CHARGE_COOLDOWN = 240;  // frames, tier reduces this (floor 90)
const MELEE_CHARGE_MULT_BASE = 2.0; // +0.2 per 5-tier

// Boss abilities
const BOSS_CHARGE_INTERVAL = 300;   // frames (~5s) between charge attempts
const BOSS_CHARGE_DURATION = 60;    // 1s rush
const BOSS_CHARGE_MULT = 2.6;
const BOSS_CHARGE_CONTACT_DAMAGE = 22;
const BOSS_MINE_INTERVAL = 260;     // frames between mine drops
const BOSS_MINE_FUSE = 180;         // 3s
const BOSS_MINE_PELLETS = 6;        // radial burst count
const BOSS_MINE_DAMAGE_RADIUS = 70; // self-damage on ignition (visual only — bullets do the work)

// Feeler-based obstacle avoidance (raycast against walls).
// Each enemy casts a forward probe every frame; when blocked, casts ±45°
// feelers and steers toward the clearer side. Sticky per-enemy side bias
// prevents flip-flopping at concave corners.
const AVOID_PROBE_LEN = 55;
const AVOID_SIDE_ANGLE = Math.PI / 4;        // 45°
const AVOID_SIDE_ANGLE_WIDE = Math.PI / 2.2; // ~82° fallback when sides also blocked
const RAY_WALL_FILTER = new InteractionFilter(1, GROUP_WALL);

// ── Power-ups ────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.40;
const POWERUP_DURATION = 600;   // 10s @ 60fps
const POWERUP_LIFETIME = 720;   // despawn after 12s on ground
const POWERUP_TYPES = ["double", "triple", "knockback", "explode", "rapid", "heal"];
const POWERUP_COLORS = {
  double:    "#58a6ff",
  triple:    "#3fb950",
  knockback: "#f85149",
  explode:   "#ff8c42",
  rapid:     "#bc8cff",
  heal:      "#d29922",
};
const POWERUP_LABELS = {
  double:    "2x",
  triple:    "3x",
  knockback: "KB",
  explode:   "EX",
  rapid:     "RF",
  heal:      "HP",
};

// Knockback projectile config (replaces normal bullet while mod active)
const KB_RADIUS = 90;
const KB_IMPULSE = 60;

// Explosive projectile — damages every enemy in radius, small knockback only.
// Deals EX_DAMAGE at the center, tapering linearly to 0 at EX_RADIUS.
const EX_RADIUS = 75;
const EX_DAMAGE = 3;
const EX_IMPULSE = 144;

// Rapid-fire: player shot cooldown while this mod is active. Normal cooldown
// is PLAYER_SHOT_COOLDOWN (12 frames → ~5/sec); rapid drops it to ~12/sec.
const RAPID_SHOT_COOLDOWN = 5;

// ── Waves ────────────────────────────────────────────────────────────────
const WAVE_BREAK = 180;
const START_HP = PLAYER_MAX_HP;

// Virtual joystick (mobile) — bottom-left quadrant activates it.
const STICK_ZONE_W = SCREEN_W * 0.45;   // left 45% of canvas
const STICK_ZONE_Y = HUD_H + SCREEN_H * 0.5; // below vertical center
const STICK_MAX_R = 60;

// Detected once at setup — coarse pointer / touch-capable = show mobile stick.
let _isTouch = false;

// ── Module state ─────────────────────────────────────────────────────────
let _space = null;
let _player = null;
let _playerHP = 0;
let _playerInvuln = 0;
let _playerShotCooldown = 0;
let _wave = 0;
let _waveActive = false;
let _breakTimer = 0;
let _toSpawn = 0;
let _spawnTimer = 0;
let _spawnInterval = 0;
let _bossPending = false;
let _score = 0;
let _gameOver = false;

let _playerMod = { type: null, timer: 0 };

// Input — keyboard (desktop) + virtual stick (mobile/desktop drag).
const _keys = Object.create(null);
let _stickActive = false;
let _stickOrigin = { x: 0, y: 0 };
let _stickVec = { x: 0, y: 0 };       // normalized direction, magnitude 0..1
const _moveDir = { x: 0, y: 0 };      // final input dir fed to physics

let _onKeyDown = null;
let _onKeyUp = null;

let _cbPlayer, _cbEnemy, _cbPlayerBullet, _cbEnemyBullet, _cbWall, _cbPowerup;

// Deferred actions — mutate body graph between steps, never during.
const _pending = {
  enemyHit: [],        // { enemy, damage }
  removeBullet: [],    // bullet body
  aoeDetonate: [],     // player bullet body (knockback or explode)
  playerHit: [],       // { damage }
  pickupPowerup: [],   // powerup body
  removePowerup: [],   // powerup body (expired)
  detonateMine: [],    // mine body (fuse expired)
};

// ── Helpers ──────────────────────────────────────────────────────────────
function bodyFromInt(intObj) {
  return intObj.castBody ?? intObj.castShape?.body ?? null;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

// Copied verbatim from tower-defense.js — thin axis-rotated quad wall segment.
function addWallSegment(space, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const hl = len / 2;
  const hw = WT / 2;
  const cx = (ax + bx) / 2, cy = (ay + by) / 2;
  const verts = [
    new Vec2(-ux * hl - nx * hw, -uy * hl - ny * hw),
    new Vec2( ux * hl - nx * hw,  uy * hl - ny * hw),
    new Vec2( ux * hl + nx * hw,  uy * hl + ny * hw),
    new Vec2(-ux * hl + nx * hw, -uy * hl + ny * hw),
  ];
  const wall = new Body(BodyType.STATIC, new Vec2(cx, cy));
  // Omit Material for Polygon — P53 bug: Polygon + explicit Material tunnels.
  const wallShape = new Polygon(verts);
  wallShape.filter = new InteractionFilter(GROUP_WALL, -1);
  wall.shapes.add(wallShape);
  wall.cbTypes.add(_cbWall);
  wall.space = space;
}

function buildArena(space) {
  // Outer perimeter — sealed box inside the HUD strip.
  const top = HUD_H;
  addWallSegment(space, 0, top, SCREEN_W, top);
  addWallSegment(space, SCREEN_W, top, SCREEN_W, SCREEN_H);
  addWallSegment(space, SCREEN_W, SCREEN_H, 0, SCREEN_H);
  addWallSegment(space, 0, SCREEN_H, 0, top);

  // Interior cover pieces.
  for (const chain of COVER_WALLS) {
    for (let i = 0; i < chain.length - 1; i++) {
      addWallSegment(space, chain[i].x, chain[i].y, chain[i + 1].x, chain[i + 1].y);
    }
  }
}

function spawnPlayer(space) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(SCREEN_W / 2, HUD_H + (SCREEN_H - HUD_H) / 2));
  const shape = new Circle(PLAYER_R, undefined, new Material(0.3, 0.3, 0.4, 1));
  shape.filter = new InteractionFilter(GROUP_PLAYER, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.isBullet = true;
  body.userData._colorIdx = 2; // blue-ish
  body.userData._player = true;
  body.cbTypes.add(_cbPlayer);
  body.space = space;
  return body;
}

// ── Enemies ──────────────────────────────────────────────────────────────
function spawnEnemy(space, kind) {
  const sp = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  const jitterX = (Math.random() - 0.5) * 20;
  const jitterY = (Math.random() - 0.5) * 20;

  const w = Math.max(0, _wave - 1);
  const fiveTier = Math.floor(w / 5); // 0 on waves 1-5, 1 on 6-10, ...
  let r, baseHp, hpBonus, speed, contactDmg, colorIdx;
  if (kind === "boss") {
    r = 22;
    baseHp = 60;
    hpBonus = Math.floor(w / 5) * 30;
    speed = ENEMY_BOSS_SPEED;
    contactDmg = ENEMY_BOSS_CONTACT_DAMAGE;
    colorIdx = 4;
  } else if (kind === "ranged") {
    r = 10;
    baseHp = 4;
    hpBonus = w * 2;
    speed = ENEMY_RANGED_SPEED;
    contactDmg = ENEMY_MELEE_DAMAGE;
    colorIdx = 5;
  } else {
    r = 10;
    baseHp = 5;
    hpBonus = w * 2;
    speed = ENEMY_MELEE_SPEED;
    contactDmg = ENEMY_MELEE_DAMAGE;
    colorIdx = 3;
  }
  const speedMul = 1 + w * 0.01;
  const hp = baseHp + hpBonus;

  const body = new Body(BodyType.DYNAMIC, new Vec2(sp.x + jitterX, sp.y + jitterY));
  const shape = new Circle(r, undefined, new Material(0.3, 0.3, 0.4, 1));
  shape.filter = new InteractionFilter(GROUP_ENEMY, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.userData._colorIdx = colorIdx;
  body.userData._enemy = true;
  body.userData._kind = kind;
  body.userData._hp = hp;
  body.userData._maxHp = hp;
  body.userData._speed = speed * speedMul;
  body.userData._contactDmg = contactDmg;
  body.userData._fireCooldown = kind === "ranged" ? 45 + Math.floor(Math.random() * 45)
                              : kind === "boss"   ? 90
                              : 0;
  // Per-5-wave scaling surfaced in behavior:
  // - ranged: burst count (1 base, +1 per tier, cap 5)
  // - melee: charge cooldown shrinks, charge speed bonus grows
  body.userData._rangedBurst = Math.min(5, 1 + fiveTier);
  body.userData._meleeChargeCd = Math.max(90, MELEE_CHARGE_COOLDOWN - fiveTier * 30);
  body.userData._meleeChargeMult = MELEE_CHARGE_MULT_BASE + fiveTier * 0.2;
  body.userData._chargeTimer = 0;
  body.userData._chargeCdTimer = kind === "melee"
    ? 60 + Math.floor(Math.random() * MELEE_CHARGE_COOLDOWN)
    : 0;
  // Boss-specific ability timers
  body.userData._bossChargeCd = kind === "boss" ? BOSS_CHARGE_INTERVAL : 0;
  body.userData._bossMineCd   = kind === "boss" ? BOSS_MINE_INTERVAL : 0;
  body.userData._bossShotgunPellets = 5 + fiveTier * 2; // +2 per 5-tier
  // Obstacle avoidance — side preference is "sticky" while actively avoiding
  // so an enemy doesn't flip back and forth between feelers near a corner.
  body.userData._avoidDir = 0; // -1 = left, +1 = right, 0 = no preference
  body.userData._avoidHold = 0; // frames to keep the chosen side
  body.cbTypes.add(_cbEnemy);
  body.space = space;
}

function spawnBossMine(boss) {
  const body = new Body(BodyType.STATIC, new Vec2(boss.position.x, boss.position.y));
  const shape = new Circle(8);
  // Sensor with a zero interaction mask — doesn't collide with anything, no
  // callbacks. It's purely a visible timer that detonates via step-loop aging.
  shape.filter = new InteractionFilter(GROUP_POWERUP, 0);
  shape.sensorEnabled = true;
  body.shapes.add(shape);
  body.userData._mine = true;
  body.userData._fuse = BOSS_MINE_FUSE;
  body.space = _space;
}

function detonateMine(mine) {
  const bx = mine.position.x, by = mine.position.y;
  // 6 radial pellets — "enemy bullets", so they hurt the player + bounce off walls.
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
  // Mark radius (no direct damage — bullets carry it). Silences unused warnings.
  void BOSS_MINE_DAMAGE_RADIUS;
  mine.space = null;
}

// Cast a probe of length AVOID_PROBE_LEN from (ox,oy) along (dx,dy) (unit vec).
// Returns hit distance, or AVOID_PROBE_LEN + 1 if clear (larger = clearer path).
// Uses fresh Ray + RayResult every call — allocation cost is acceptable at
// ≤ 3 probes × ~20 enemies = 60 rays/frame.
function probeDistance(ox, oy, dx, dy) {
  const origin = new Vec2(ox, oy);
  const dir = new Vec2(dx, dy);
  const ray = new Ray(origin, dir);
  ray.maxDistance = AVOID_PROBE_LEN;
  const hit = _space.rayCast(ray, false, RAY_WALL_FILTER);
  if (!hit) return AVOID_PROBE_LEN + 1;
  // RayResult exposes `distance` on its inner; the wrapped accessor is `.distance`.
  const dist = hit.distance ?? hit.zpp_inner?.distance ?? 0;
  return dist;
}

// Decide steering direction for an enemy near obstacles. Inputs are the
// desired direction toward target and the enemy's current position + radius.
// Returns a unit vector [fx, fy] to follow, plus the updated avoidDir/Hold.
// When forward is clear → returns the desired direction unchanged.
function avoidanceDir(ox, oy, r, dx, dy, ud) {
  // Start probes from the enemy surface, not its center, so we don't register
  // hits against ourself — but since our filter is WALL-only, center is fine.
  const fwd = probeDistance(ox, oy, dx, dy);
  const clearLimit = r + AVOID_PROBE_LEN * 0.6;

  if (fwd >= clearLimit) {
    // Forward is open — release any avoidance bias and go straight.
    if (ud._avoidHold > 0) ud._avoidHold--;
    if (ud._avoidHold <= 0) ud._avoidDir = 0;
    return [dx, dy];
  }

  // Forward blocked — cast ±45° feelers by rotating the desired direction.
  // Left = rotate by -angle: (dx*cos + dy*sin, -dx*sin + dy*cos)
  // Right = rotate by +angle: (dx*cos - dy*sin,  dx*sin + dy*cos)
  const cosA = Math.cos(AVOID_SIDE_ANGLE), sinA = Math.sin(AVOID_SIDE_ANGLE);
  const lx = dx * cosA + dy * sinA;
  const ly = -dx * sinA + dy * cosA;
  const rx = dx * cosA - dy * sinA;
  const ry = dx * sinA + dy * cosA;

  const lDist = probeDistance(ox, oy, lx, ly);
  const rDist = probeDistance(ox, oy, rx, ry);

  // Pick the clearer feeler, with stickiness to avoid oscillation at corners.
  let chosen;
  if (ud._avoidHold > 0 && ud._avoidDir !== 0) {
    // Keep last choice unless that side is markedly worse.
    const keepLeft = ud._avoidDir === -1;
    const keepDist = keepLeft ? lDist : rDist;
    const otherDist = keepLeft ? rDist : lDist;
    if (otherDist > keepDist + 20) {
      ud._avoidDir = keepLeft ? 1 : -1;
    }
    chosen = ud._avoidDir === -1 ? [lx, ly] : [rx, ry];
    ud._avoidHold--;
  } else {
    if (lDist > rDist) { ud._avoidDir = -1; chosen = [lx, ly]; }
    else if (rDist > lDist) { ud._avoidDir = 1; chosen = [rx, ry]; }
    else {
      // Tie (both clear or both blocked) — coinflip, but biased by walking bias.
      ud._avoidDir = Math.random() < 0.5 ? -1 : 1;
      chosen = ud._avoidDir === -1 ? [lx, ly] : [rx, ry];
    }
    ud._avoidHold = 30; // ~0.5s stickiness
  }

  // Both sides also blocked → go perpendicular (wider angle) on the chosen side.
  const chosenDist = ud._avoidDir === -1 ? lDist : rDist;
  if (chosenDist < clearLimit * 0.5) {
    const cosW = Math.cos(AVOID_SIDE_ANGLE_WIDE), sinW = Math.sin(AVOID_SIDE_ANGLE_WIDE);
    if (ud._avoidDir === -1) {
      chosen = [dx * cosW + dy * sinW, -dx * sinW + dy * cosW];
    } else {
      chosen = [dx * cosW - dy * sinW, dx * sinW + dy * cosW];
    }
  }

  return chosen;
}

function steerEnemies() {
  if (!_player?.space) return;
  const px = _player.position.x, py = _player.position.y;
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy) continue;

    const dx = px - body.position.x;
    const dy = py - body.position.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;

    // --- Charge state transitions (melee + boss) ---
    if (ud._kind === "melee") {
      if (ud._chargeTimer > 0) {
        ud._chargeTimer--;
      } else {
        ud._chargeCdTimer--;
        if (ud._chargeCdTimer <= 0) {
          ud._chargeTimer = MELEE_CHARGE_DURATION;
          ud._chargeCdTimer = ud._meleeChargeCd;
        }
      }
    } else if (ud._kind === "boss") {
      if (ud._chargeTimer > 0) {
        ud._chargeTimer--;
      } else {
        ud._bossChargeCd--;
        if (ud._bossChargeCd <= 0) {
          ud._chargeTimer = BOSS_CHARGE_DURATION;
          ud._bossChargeCd = BOSS_CHARGE_INTERVAL;
        }
      }
    }

    const charging = ud._chargeTimer > 0;
    let speed = ud._speed;
    if (charging) {
      speed *= (ud._kind === "boss") ? BOSS_CHARGE_MULT : ud._meleeChargeMult;
    }

    // --- Desired velocity ---
    let tvx, tvy;
    if (ud._kind === "ranged" && d < ENEMY_RANGED_HOLD_DIST && !charging) {
      // Back off to hold distance (ranged don't charge).
      tvx = -nx * speed * 0.6;
      tvy = -ny * speed * 0.6;
    } else {
      tvx = nx * speed;
      tvy = ny * speed;
    }

    // --- Obstacle avoidance via raycast feelers ---
    // Desired direction in unit form. Runs every frame so blockages are
    // detected immediately; when the path clears the avoidance bias is
    // released, so enemies don't keep orbiting once they're past the obstacle.
    const tMag = Math.hypot(tvx, tvy) || 1;
    const tdx = tvx / tMag, tdy = tvy / tMag;
    const r = body.shapes.at(0).castCircle.radius;
    const [fx, fy] = avoidanceDir(body.position.x, body.position.y, r, tdx, tdy, ud);
    tvx = fx * speed;
    tvy = fy * speed;

    // --- Apply blended velocity (snappier during charges) ---
    const vx0 = body.velocity.x, vy0 = body.velocity.y;
    const blend = charging ? 0.12 : 0.08;
    body.velocity = new Vec2(vx0 + (tvx - vx0) * blend, vy0 + (tvy - vy0) * blend);

    // --- Firing ---
    if (ud._kind === "ranged") {
      ud._fireCooldown--;
      if (ud._fireCooldown <= 0) {
        const burst = ud._rangedBurst;
        // Fan pellets over ±8° per extra pellet so they don't overlap exactly.
        const halfFan = 0.14 * (burst - 1);
        for (let i = 0; i < burst; i++) {
          const t = burst === 1 ? 0 : (i / (burst - 1)) * 2 - 1; // -1..1
          const ang = t * halfFan;
          const c = Math.cos(ang), s = Math.sin(ang);
          fireEnemyBullet(body, nx * c - ny * s, nx * s + ny * c);
        }
        ud._fireCooldown = ENEMY_RANGED_FIRE_COOLDOWN;
      }
    } else if (ud._kind === "boss") {
      ud._fireCooldown--;
      if (ud._fireCooldown <= 0) {
        fireBossShotgun(body, ud._bossShotgunPellets);
        ud._fireCooldown = ENEMY_BOSS_FIRE_COOLDOWN;
      }
      ud._bossMineCd--;
      if (ud._bossMineCd <= 0) {
        spawnBossMine(body);
        ud._bossMineCd = BOSS_MINE_INTERVAL;
      }
    }
  }
}

// ── Bullets ──────────────────────────────────────────────────────────────
function findNearestEnemy() {
  if (!_player?.space) return null;
  const px = _player.position.x, py = _player.position.y;
  const r2 = AUTO_AIM_RANGE * AUTO_AIM_RANGE;
  let best = null, bestD = r2;
  for (const body of _space.bodies) {
    if (!body.userData?._enemy) continue;
    const d2 = distSq(px, py, body.position.x, body.position.y);
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
  // Circle not Polygon — dodge P53 tunneling bug.
  const shape = new Circle(3, undefined, new Material(0.1, 0.1, 0.1, 0.01));
  shape.filter = new InteractionFilter(GROUP_PROJECTILE, PLAYER_BULLET_MASK);
  bullet.shapes.add(shape);
  bullet.rotation = Math.atan2(dy, dx);
  bullet.isBullet = true;
  bullet.userData._colorIdx = _playerMod.type === "explode" ? 1
                            : _playerMod.type === "knockback" ? 4
                            : 2;
  bullet.userData._playerBullet = true;
  bullet.userData._damage = 1;
  bullet.userData._life = 90;
  bullet.userData._knockback = _playerMod.type === "knockback";
  bullet.userData._explode   = _playerMod.type === "explode";
  bullet.cbTypes.add(_cbPlayerBullet);
  bullet.velocity = new Vec2(nx * 600, ny * 600);
  bullet.space = _space;
}

function firePlayerShot() {
  const target = findNearestEnemy();
  if (!target) return false;
  const dx = target.position.x - _player.position.x;
  const dy = target.position.y - _player.position.y;

  const mod = _playerMod.type;
  let angles;
  if (mod === "triple")       angles = [-0.26, 0, 0.26];
  else if (mod === "double")  angles = [-0.08, 0.08];
  else                        angles = [0];

  for (const ang of angles) {
    const c = Math.cos(ang), s = Math.sin(ang);
    spawnPlayerBullet(dx * c - dy * s, dx * s + dy * c);
  }
  return true;
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
  bullet.cbTypes.add(_cbEnemyBullet);
  bullet.velocity = new Vec2(nx * ENEMY_BULLET_SPEED, ny * ENEMY_BULLET_SPEED);
  bullet.space = _space;
}

function fireBossShotgun(boss, pellets) {
  if (!_player?.space) return;
  const dx = _player.position.x - boss.position.x;
  const dy = _player.position.y - boss.position.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  // Spread scales with pellet count (+6° per pellet beyond 1, capped).
  const halfFan = Math.min(0.9, 0.12 * (pellets - 1));
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0 : (i / (pellets - 1)) * 2 - 1; // -1..1
    const ang = t * halfFan;
    const c = Math.cos(ang), s = Math.sin(ang);
    fireEnemyBullet(boss, nx * c - ny * s, nx * s + ny * c);
  }
}

// Radial AOE around `bullet`. Every dynamic body in range gets an outward
// impulse scaled by `impulse`, and enemies also take `damage` — both taper
// linearly to zero at the edge. Used by both knockback (big shove, 1 dmg)
// and explode (small shove, area damage) power-ups.
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
}

// ── Deaths / pickups ─────────────────────────────────────────────────────
function killEnemy(enemy) {
  if (!enemy.space) return;
  const x = enemy.position.x, y = enemy.position.y;
  enemy.space = null;
  _score += 1;
  if (Math.random() < POWERUP_DROP_CHANCE) {
    spawnPowerup(x, y);
  }
}

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
    _playerHP = Math.min(PLAYER_MAX_HP, _playerHP + Math.round(PLAYER_MAX_HP * 0.2));
    return;
  }
  _playerMod.type = type;
  _playerMod.timer = POWERUP_DURATION;
}

// ── Deferred queue drain ─────────────────────────────────────────────────
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
    if (bullet.userData._explode) {
      explodeBullet(bullet, EX_RADIUS, EX_DAMAGE, EX_IMPULSE);
    } else {
      // knockback
      explodeBullet(bullet, KB_RADIUS, 1, KB_IMPULSE);
    }
  }
  _pending.aoeDetonate.length = 0;

  if (_pending.playerHit.length > 0 && _player?.space && _playerInvuln <= 0 && !_gameOver) {
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
}

// ── Waves ────────────────────────────────────────────────────────────────
function startWave() {
  _wave++;
  _waveActive = true;
  const fiveTier = Math.floor((_wave - 1) / 5);
  _toSpawn = 8 + Math.floor(_wave / 2) + fiveTier;
  _spawnInterval = Math.max(30, 70 - _wave * 2);
  _spawnTimer = 30;
  _bossPending = _wave % 5 === 0;
  if (_bossPending) _toSpawn += 1; // reserve one slot for the boss finisher
}

function spawnForWave() {
  if (_toSpawn <= 0) return;
  _spawnTimer--;
  if (_spawnTimer > 0) return;
  _spawnTimer = _spawnInterval;

  if (_bossPending && _toSpawn === 1) {
    spawnEnemy(_space, "boss");
    _bossPending = false;
    _toSpawn = 0;
    return;
  }

  // Boss waves are mostly melee with occasional ranged for pressure.
  // Normal waves: 50/50 melee/ranged.
  const rangedChance = _wave % 5 === 0 ? 0.2 : 0.5;
  spawnEnemy(_space, Math.random() < rangedChance ? "ranged" : "melee");
  _toSpawn--;
}

function anyEnemyAlive() {
  for (const body of _space.bodies) {
    if (body.userData?._enemy) return true;
  }
  return false;
}

function resetGame(space) {
  const toKill = [];
  for (const body of space.bodies) {
    const ud = body.userData;
    if (ud?._enemy || ud?._playerBullet || ud?._enemyBullet || ud?._powerup || ud?._player || ud?._mine) {
      toKill.push(body);
    }
  }
  for (const b of toKill) b.space = null;

  _player = spawnPlayer(space);
  _playerHP = START_HP;
  _playerInvuln = 0;
  _playerShotCooldown = 0;
  _playerMod = { type: null, timer: 0 };
  _wave = 0;
  _waveActive = false;
  _breakTimer = 120;
  _toSpawn = 0;
  _bossPending = false;
  _score = 0;
  _gameOver = false;
  _stickActive = false;
  _stickVec = { x: 0, y: 0 };
  _moveDir.x = 0; _moveDir.y = 0;
  _pending.enemyHit.length = 0;
  _pending.removeBullet.length = 0;
  _pending.aoeDetonate.length = 0;
  _pending.playerHit.length = 0;
  _pending.pickupPowerup.length = 0;
  _pending.removePowerup.length = 0;
  _pending.detonateMine.length = 0;
}

// ── Input ────────────────────────────────────────────────────────────────
function computeMoveDir() {
  // Joystick takes precedence when active (finer control on mobile).
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
  const tvx = _moveDir.x * PLAYER_SPEED;
  const tvy = _moveDir.y * PLAYER_SPEED;
  const vx = _player.velocity.x, vy = _player.velocity.y;
  const blend = 0.3;
  _player.velocity = new Vec2(vx + (tvx - vx) * blend, vy + (tvy - vy) * blend);
}

function inStickZone(x, y) {
  return x <= STICK_ZONE_W && y >= STICK_ZONE_Y;
}

// ── Rendering ────────────────────────────────────────────────────────────
function drawHpBar(ctx, body) {
  const ud = body.userData;
  const hp = ud._hp, max = ud._maxHp;
  if (hp >= max) return;
  const r = body.shapes.at(0).castCircle.radius;
  const x = body.position.x, y = body.position.y - r - 5;
  const w = Math.max(14, r * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - w / 2, y, w, 3);
  ctx.fillStyle = "#3fb950";
  ctx.fillRect(x - w / 2, y, w * Math.max(0, hp / max), 3);
}

function drawPlayerRing(ctx) {
  if (!_player?.space) return;
  const x = _player.position.x, y = _player.position.y;
  // HP ring
  const pct = _playerHP / PLAYER_MAX_HP;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.strokeStyle = _playerHP <= 25 ? "#f85149" : "#3fb950";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Invuln flash
  if (_playerInvuln > 0 && Math.floor(_playerInvuln / 3) % 2 === 0) {
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }
}

function drawAimLine(ctx) {
  if (!_player?.space || _gameOver) return;
  const target = findNearestEnemy();
  if (!target) return;
  ctx.beginPath();
  ctx.moveTo(_player.position.x, _player.position.y);
  ctx.lineTo(target.position.x, target.position.y);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
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
    // Flash when about to expire
    if (ud._life < 120 && Math.floor(ud._life / 6) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function drawTopHUD(ctx) {
  ctx.fillStyle = "rgba(13,17,23,0.82)";
  ctx.fillRect(0, 0, SCREEN_W, HUD_H);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Wave ${_wave}`, 10, 14);
  ctx.fillStyle = "#58a6ff";
  ctx.fillText(`Score: ${_score}`, 90, 14);
  ctx.fillStyle = _playerHP <= 25 ? "#f85149" : "#3fb950";
  ctx.fillText(`HP: ${_playerHP}`, 190, 14);

  if (_playerMod.type) {
    const sec = Math.ceil(_playerMod.timer / 60);
    const col = POWERUP_COLORS[_playerMod.type];
    const label = `${_playerMod.type.toUpperCase()} ${sec}s`;
    const labelX = 280;
    ctx.fillStyle = col;
    ctx.fillText(label, labelX, 14);
    // Timer bar right under the HUD strip, colored to match.
    const barW = 100;
    const barX = labelX;
    const barY = HUD_H + 2;
    ctx.fillStyle = "rgba(13,17,23,0.85)";
    ctx.fillRect(barX, barY, barW, 4);
    const pct = Math.max(0, _playerMod.timer / POWERUP_DURATION);
    ctx.fillStyle = col;
    ctx.fillRect(barX, barY, barW * pct, 4);
  }

  if (!_waveActive && _breakTimer > 0 && !_gameOver) {
    const s = Math.ceil(_breakTimer / 60);
    const next = _wave + 1;
    const nextLabel = next % 5 === 0 ? "BOSS" : "Next wave";
    ctx.fillStyle = next % 5 === 0 ? "#f85149" : "rgba(255,255,255,0.6)";
    ctx.textAlign = "right";
    ctx.fillText(`${nextLabel} in ${s}s`, SCREEN_W - 10, 14);
  } else if (_waveActive && _wave % 5 === 0 && _bossPending) {
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("⚠ BOSS WAVE", SCREEN_W - 10, 14);
  }
}

function drawJoystick(ctx) {
  if (!_isTouch) return;
  if (!_stickActive) {
    // Dim hint in bottom-left corner so mobile users know where to press.
    const cx = 70, cy = SCREEN_H - 70;
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
  const { x: ox, y: oy } = _stickOrigin;
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

function drawMines(ctx) {
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._mine) continue;
    const x = body.position.x, y = body.position.y;
    const pulse = 1 + Math.sin(ud._fuse * 0.4) * 0.25;
    // Body
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#30363d";
    ctx.fill();
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Blink ring, pulsing faster as fuse runs out.
    ctx.beginPath();
    ctx.arc(x, y, 12 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(248,81,73,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Fuse arc (countdown)
    const pct = ud._fuse / BOSS_MINE_FUSE;
    ctx.beginPath();
    ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawChargingOutlines(ctx) {
  // Red ring around enemies in a charge — telegraphs the rush.
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy || ud._chargeTimer <= 0) continue;
    const r = body.shapes.at(0).castCircle.radius;
    const x = body.position.x, y = body.position.y;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawGameOver(ctx) {
  if (!_gameOver) return;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#f85149";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Game Over", SCREEN_W / 2, SCREEN_H / 2 - 18);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Survived ${_wave} wave${_wave === 1 ? "" : "s"} — Score ${_score}`, SCREEN_W / 2, SCREEN_H / 2 + 10);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Click / tap anywhere to restart", SCREEN_W / 2, SCREEN_H / 2 + 36);
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "top-down-shooter",
  label: "Top-down Shooter",
  tags: ["Gameplay", "Callbacks", "Sensors", "Mobile", "Auto-fire"],
  featured: true,
  featuredOrder: 5,
  desc:
    "Top-down survival shooter — enemies pour in from 4 spawn points, every 5th wave closes with a <b>boss</b> that rushes, drops mines and fires shotguns. <b>Melee</b> chase you with burst rushes, <b>ranged</b> keep distance and snipe. Movement: <b>WASD</b> or bottom-left virtual stick (mobile). <b>Auto-fire</b> targets the nearest enemy; walls block bullets. 40% enemy drop chance for 10s power-ups: <b>2x</b> / <b>3x</b> spread, <b>KB</b> knockback blast, <b>EX</b> explosive AOE bullets, <b>RF</b> rapid fire, <b>HP</b> instant heal.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 0);

    _cbPlayer = new CbType();
    _cbEnemy = new CbType();
    _cbPlayerBullet = new CbType();
    _cbEnemyBullet = new CbType();
    _cbWall = new CbType();
    _cbPowerup = new CbType();

    buildArena(space);
    _player = spawnPlayer(space);

    _playerHP = START_HP;
    _playerInvuln = 0;
    _playerShotCooldown = 0;
    _playerMod = { type: null, timer: 0 };
    _wave = 0;
    _waveActive = false;
    _breakTimer = 120;
    _toSpawn = 0;
    _bossPending = false;
    _score = 0;
    _gameOver = false;
    _stickActive = false;
    _stickVec = { x: 0, y: 0 };
    _moveDir.x = 0; _moveDir.y = 0;
    for (const k in _keys) delete _keys[k];
    _pending.enemyHit.length = 0;
    _pending.removeBullet.length = 0;
    _pending.aoeDetonate.length = 0;
    _pending.playerHit.length = 0;
    _pending.pickupPowerup.length = 0;
    _pending.removePowerup.length = 0;
    _pending.detonateMine.length = 0;

    // Detect touch/coarse-pointer device — hides the on-screen joystick on
    // desktop where keyboard is ergonomic and the stick just adds visual noise.
    _isTouch = typeof window !== "undefined" && (
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );

    // Player bullet hits enemy → AOE detonate (knockback/explode) or normal damage.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayerBullet, _cbEnemy,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        if (!b1 || !b2) return;
        const bullet = b1.userData?._playerBullet ? b1 : b2;
        const enemy = b1.userData?._enemy ? b1 : b2;
        if (!bullet.space || !enemy.space || bullet.userData._spent) return;
        bullet.userData._spent = true;
        if (bullet.userData._knockback || bullet.userData._explode) {
          _pending.aoeDetonate.push(bullet);
        } else {
          _pending.removeBullet.push(bullet);
          _pending.enemyHit.push({ enemy, damage: bullet.userData._damage });
        }
      },
    ));

    // Player bullet hits wall → remove or detonate (knockback/explode).
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayerBullet, _cbWall,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._playerBullet ? b1 : b2?.userData?._playerBullet ? b2 : null;
        if (!bullet?.space || bullet.userData._spent) return;
        bullet.userData._spent = true;
        if (bullet.userData._knockback || bullet.userData._explode) {
          _pending.aoeDetonate.push(bullet);
        } else {
          _pending.removeBullet.push(bullet);
        }
      },
    ));

    // Enemy bullet hits player → damage (respecting invuln).
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

    // Enemy bullet hits wall → remove.
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

    // Melee / boss contact with player → damage.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbEnemy, _cbPlayer,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const enemy = b1?.userData?._enemy ? b1 : b2?.userData?._enemy ? b2 : null;
        if (!enemy?.space) return;
        _pending.playerHit.push({ damage: enemy.userData._contactDmg });
      },
    ));

    // Power-up pickup — sensor listener, fires on overlap begin.
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

    // Keyboard listeners — window-scoped, match pinball/cc convention.
    // Guarded against stale firings after demo teardown via _space check.
    _onKeyDown = (e) => {
      if (!_space) return;
      _keys[e.code] = true;
    };
    _onKeyUp = (e) => {
      if (!_space) return;
      _keys[e.code] = false;
    };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  step(space) {
    if (_gameOver) {
      processPending();
      return;
    }

    processPending();
    computeMoveDir();
    applyPlayerVelocity();
    steerEnemies();

    // Invuln countdown
    if (_playerInvuln > 0) _playerInvuln--;

    // Power-up timer
    if (_playerMod.timer > 0) {
      _playerMod.timer--;
      if (_playerMod.timer <= 0) _playerMod.type = null;
    }

    // Auto-fire — cooldown only advances when we actually shot.
    if (_playerShotCooldown > 0) _playerShotCooldown--;
    if (_playerShotCooldown <= 0 && _player?.space) {
      if (firePlayerShot()) {
        _playerShotCooldown = _playerMod.type === "rapid"
          ? RAPID_SHOT_COOLDOWN
          : PLAYER_SHOT_COOLDOWN;
      }
    }

    // Wave flow
    if (!_waveActive) {
      _breakTimer--;
      if (_breakTimer <= 0) startWave();
    } else {
      spawnForWave();
      if (_toSpawn <= 0 && !anyEnemyAlive()) {
        _waveActive = false;
        _breakTimer = WAVE_BREAK;
      }
    }

    // Age bullets + powerups + boss mines.
    const expired = [];
    for (const body of space.bodies) {
      const ud = body.userData;
      if (!ud) continue;
      if (ud._playerBullet || ud._enemyBullet) {
        ud._life--;
        if (ud._life <= 0) expired.push(body);
      } else if (ud._powerup) {
        ud._life--;
        if (ud._life <= 0) _pending.removePowerup.push(body);
      } else if (ud._mine) {
        ud._fuse--;
        if (ud._fuse <= 0) _pending.detonateMine.push(body);
      }
    }
    for (const b of expired) b.space = null;
  },

  click(x, y, space) {
    if (_gameOver) {
      resetGame(space);
      return;
    }
    // Virtual stick only on touch devices — desktop uses WASD.
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
    if (d < 1) {
      _stickVec = { x: 0, y: 0 };
      return;
    }
    const mag = Math.min(1, d / STICK_MAX_R);
    _stickVec = { x: (dx / d) * mag, y: (dy / d) * mag };
  },

  release() {
    _stickActive = false;
    _stickVec = { x: 0, y: 0 };
  },

  render3dOverlay(ctx) {
    drawAimLine(ctx);
    drawMines(ctx);
    drawPowerups(ctx);
    drawChargingOutlines(ctx);
    drawPlayerRing(ctx);
    for (const body of _space.bodies) {
      if (body.userData?._enemy) drawHpBar(ctx, body);
    }
    drawJoystick(ctx);
    drawTopHUD(ctx);
    drawGameOver(ctx);
  },
};
