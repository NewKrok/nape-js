import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.42.0";

// Collision groups: 1=default (enemies, base), 2=projectiles, 4=towers, 8=walls.
// Projectiles pass through walls, towers, and each other — only enemies stop them.
const GROUP_PROJECTILE = 2;
const GROUP_TOWER = 4;
const GROUP_WALL = 8;
const PROJECTILE_MASK = ~(GROUP_PROJECTILE | GROUP_TOWER | GROUP_WALL);

// ── Path waypoints (winding corridor, spawn→base) ────────────────────────
const WAYPOINTS = [
  { x: 830, y: 420 }, // W1  spawn
  { x: 720, y: 420 },
  { x: 720, y: 170 },
  { x: 620, y: 170 },
  { x: 620, y: 420 },
  { x: 500, y: 420 },
  { x: 500,  y: 90 },
  { x: 350,  y: 90 },
  { x: 350, y: 300 },
  { x: 200, y: 300 },
  { x: 200, y: 180 },
  { x:  80, y: 180 }, // base
];

const HW = 30;  // corridor half-width
const WT = 6;   // wall thickness

// ── Tower spots (inside path pockets) ────────────────────────────────────
const TOWER_SPOTS = [
  { x: 790, y: 290 },
  { x: 670, y: 290 },
  { x: 560, y: 250 },
  { x: 425, y: 210 },
  { x: 275, y: 215 },
  { x: 130, y:  90 },
  { x: 790,  y: 90 },
  { x: 275, y: 400 },
];

// ── Tower config ─────────────────────────────────────────────────────────
const TOWER_CFG = {
  archer: {
    name: "Archer", colorIdx: 0, size: 18, baseCost: 10, label: "A",
    levels: [
      { range: 200, cooldown: 30, damage: 1, upgradeCost: 20 },
      { range: 240, cooldown: 20, damage: 2, upgradeCost: 40 },
      { range: 280, cooldown: 12, damage: 3, upgradeCost: 0 },
    ],
  },
  bomb: {
    name: "Bomb", colorIdx: 1, size: 20, baseCost: 25, label: "B",
    levels: [
      { range: 200, cooldown: 90, damage: 2, radius: 70,  impulse: 20, upgradeCost: 30 },
      { range: 230, cooldown: 70, damage: 3, radius: 90,  impulse: 28, upgradeCost: 60 },
      { range: 260, cooldown: 50, damage: 5, radius: 110, impulse: 36, upgradeCost: 0 },
    ],
  },
};

const START_GOLD = 30;
const START_HP = 20;
const WAVE_BREAK = 180; // frames (3s)
const ENEMY_SPEED = 80;

// ── Module state (reset in setup) ────────────────────────────────────────
let _space = null;
let _gold = 0;
let _baseHP = 0;
let _score = 0;
let _wave = 0;
let _waveActive = false;
let _breakTimer = 0;
let _toSpawn = 0;
let _spawnTimer = 0;
let _spawnInterval = 0;
let _hordeHint = 0;
let _gameOver = false;

let _selection = null; // { kind: "spot" | "tower", idx }
let _buttons = [];     // [{ x, y, w, h, action, data }]

let _spots = [];       // [{ x, y, towerIdx: number|null }]
let _towers = [];      // [{ type, level, body, cooldown, spotIdx }]
let _baseBody = null;

let _cbEnemy, _cbArrow, _cbBomb, _cbBase, _cbWall;

// Deferred actions from listeners — processed at start of next step() so we
// never mutate the body graph mid-physics-substep.
const _pending = {
  explode: [],       // bombs to detonate
  removeArrow: [],   // arrows to despawn
  enemyHit: [],      // { enemy, damage }
  baseHit: [],       // enemies that reached the base
};

// ── Helpers ──────────────────────────────────────────────────────────────
function bodyFromInt(intObj) {
  return intObj.castBody ?? intObj.castShape?.body ?? null;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function addWallSegment(space, ax, ay, bx, by) {
  // Axis-aligned-or-rotated thin quad from (ax,ay) to (bx,by), centered on that line.
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

// Build one continuous wall chain offset by `side * HW` from the waypoint path.
// Corner vertices are the intersection of the two parallel-offset lines, so the
// chain never pokes into neighboring corridors and never leaves a gap at turns.
function buildSide(space, side) {
  const pts = [];
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const p = WAYPOINTS[i];

    // Segment directions at this waypoint
    const prev = i > 0 ? WAYPOINTS[i - 1] : null;
    const next = i < WAYPOINTS.length - 1 ? WAYPOINTS[i + 1] : null;

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

    // Offset normals (pointing away from the path on `side`)
    const inNx = -inUy * side, inNy = inUx * side;
    const outNx = -outUy * side, outNy = outUx * side;

    if (!prev) {
      // Path start — cap perpendicular to the first segment
      pts.push({ x: p.x + outNx * HW, y: p.y + outNy * HW });
    } else if (!next) {
      // Path end — cap perpendicular to the last segment
      pts.push({ x: p.x + inNx * HW, y: p.y + inNy * HW });
    } else {
      // Interior waypoint — intersect the two offset lines.
      // Line A: point (p + inN*HW), direction (inU)
      // Line B: point (p + outN*HW), direction (outU)
      const Ax = p.x + inNx * HW, Ay = p.y + inNy * HW;
      const Bx = p.x + outNx * HW, By = p.y + outNy * HW;
      // Solve Ax + t*inU = Bx + s*outU  →  t*inU - s*outU = Bx - Ax
      const det = inUx * (-outUy) - inUy * (-outUx);
      if (Math.abs(det) < 1e-6) {
        // Collinear — just use the offset point
        pts.push({ x: Ax, y: Ay });
      } else {
        const rhsX = Bx - Ax, rhsY = By - Ay;
        const t = (rhsX * (-outUy) - rhsY * (-outUx)) / det;
        pts.push({ x: Ax + inUx * t, y: Ay + inUy * t });
      }
    }
  }

  // Cap the ends with perpendicular closing walls so projectiles/enemies
  // can't escape past the spawn/base.
  const start = WAYPOINTS[0];
  const end = WAYPOINTS[WAYPOINTS.length - 1];
  const firstU = { x: WAYPOINTS[1].x - start.x, y: WAYPOINTS[1].y - start.y };
  const firstLen = Math.hypot(firstU.x, firstU.y) || 1;
  firstU.x /= firstLen; firstU.y /= firstLen;
  const lastU = {
    x: end.x - WAYPOINTS[WAYPOINTS.length - 2].x,
    y: end.y - WAYPOINTS[WAYPOINTS.length - 2].y,
  };
  const lastLen = Math.hypot(lastU.x, lastU.y) || 1;
  lastU.x /= lastLen; lastU.y /= lastLen;

  // Shift the start and end points slightly "outward" along the path axis
  // so a perpendicular cap won't overlap the first/last offset segment.
  const capBack = WT;
  pts[0] = { x: pts[0].x - firstU.x * capBack, y: pts[0].y - firstU.y * capBack };
  pts[pts.length - 1] = {
    x: pts[pts.length - 1].x + lastU.x * capBack,
    y: pts[pts.length - 1].y + lastU.y * capBack,
  };

  for (let i = 0; i < pts.length - 1; i++) {
    addWallSegment(space, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
  return pts;
}

function buildPath(space) {
  const left = buildSide(space, 1);
  const right = buildSide(space, -1);
  // End caps — close the spawn opening and seal around the base.
  // Spawn cap at WAYPOINTS[0]
  addWallSegment(space, left[0].x, left[0].y, right[0].x, right[0].y);
  // Base cap at the last waypoint
  const li = left.length - 1, ri = right.length - 1;
  addWallSegment(space, left[li].x, left[li].y, right[ri].x, right[ri].y);
}

function spawnEnemy(space, kind) {
  const start = WAYPOINTS[0];
  const r = kind === "boss" ? 16 : kind === "horde" ? 7 : kind === "fast" ? 8 : 10;
  // HP scales linearly with wave so upgrades become mandatory late-game.
  // normal: 6 → +3 per wave; horde: 2 → +1 per wave; boss: 24 → +12 per wave (after W5).
  // fast: 60% of normal HP — glass cannons that punish slow towers.
  const w = Math.max(0, _wave - 1);
  const baseHp = kind === "boss" ? 24 : kind === "horde" ? 2 : 6;
  const hpBonus = kind === "boss" ? Math.floor(w / 5) * 12 : kind === "horde" ? w : w * 3;
  let hp = baseHp + hpBonus;
  if (kind === "fast") hp = Math.max(1, Math.round(hp * 0.6));
  const reward = kind === "boss" ? 5 + Math.floor(w / 3) : 1 + Math.floor(w / 4);
  // Base speed per kind, then a +1% bonus per wave compounding the challenge.
  const speedMul = 1 + w * 0.01;
  const speed = speedMul * (
    kind === "boss" ? ENEMY_SPEED * 0.7 :
    kind === "horde" ? ENEMY_SPEED * 1.15 :
    kind === "fast" ? ENEMY_SPEED * 2 :
    ENEMY_SPEED
  );

  // Jitter spawn position so burst-spawned mobs don't overlap exactly —
  // biased left along the first corridor (which runs westward from the spawn).
  const jitterX = -Math.random() * 24;
  const jitterY = (Math.random() - 0.5) * (HW - r) * 1.2;
  const body = new Body(BodyType.DYNAMIC, new Vec2(start.x + jitterX, start.y + jitterY));
  body.shapes.add(new Circle(r, undefined, new Material(0.3, 0.3, 0.4, 1)));
  body.userData._colorIdx = kind === "boss" ? 4 : kind === "fast" ? 5 : 3;
  body.userData._enemy = true;
  body.userData._hp = hp;
  body.userData._maxHp = hp;
  body.userData._wp = 1;
  body.userData._reward = reward;
  body.userData._speed = speed;
  body.cbTypes.add(_cbEnemy);
  body.space = space;
}

function steerEnemies() {
  for (const body of _space.bodies) {
    if (!body.userData?._enemy) continue;
    let wp = body.userData._wp;
    if (wp >= WAYPOINTS.length) continue;
    const target = WAYPOINTS[wp];
    const dx = target.x - body.position.x;
    const dy = target.y - body.position.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 18 * 18) {
      wp++;
      body.userData._wp = wp;
      if (wp >= WAYPOINTS.length) continue;
    }
    const d = Math.sqrt(d2) || 1;
    const nx = dx / d, ny = dy / d;
    const speed = body.userData._speed;
    const vx = body.velocity.x, vy = body.velocity.y;
    const blend = 0.05;
    body.velocity = new Vec2(
      vx + (nx * speed - vx) * blend,
      vy + (ny * speed - vy) * blend,
    );
  }
}

function findTargetFor(tower) {
  const cfg = TOWER_CFG[tower.type];
  const lvl = cfg.levels[tower.level];
  const r2 = lvl.range * lvl.range;
  const tx = tower.body.position.x, ty = tower.body.position.y;

  // Prefer the enemy furthest along the path (closest to base) within range
  let best = null, bestWp = -1;
  for (const body of _space.bodies) {
    if (!body.userData?._enemy) continue;
    if (distSq(tx, ty, body.position.x, body.position.y) > r2) continue;
    const wp = body.userData._wp;
    if (wp > bestWp) { bestWp = wp; best = body; }
  }
  return best;
}

function fireArrow(space, tower, target) {
  const cfg = TOWER_CFG[tower.type];
  const lvl = cfg.levels[tower.level];
  const dx = target.position.x - tower.body.position.x;
  const dy = target.position.y - tower.body.position.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  // Spawn just outside the tower body to avoid initial overlap
  const off = cfg.size / 2 + 4;
  const sx = tower.body.position.x + nx * off;
  const sy = tower.body.position.y + ny * off;

  const arrow = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  // Circle (not Polygon) to dodge the P53 Polygon+Material tunneling bug.
  // Ultra-light density → negligible impulse transfer, so arrows don't knock enemies back.
  const arrowShape = new Circle(3, undefined, new Material(0.1, 0.1, 0.1, 0.01));
  arrowShape.filter = new InteractionFilter(GROUP_PROJECTILE, PROJECTILE_MASK);
  arrow.shapes.add(arrowShape);
  arrow.rotation = Math.atan2(dy, dx);
  arrow.isBullet = true;
  arrow.userData._colorIdx = 2;
  arrow.userData._arrow = true;
  arrow.userData._damage = lvl.damage;
  arrow.userData._life = 60;
  arrow.cbTypes.add(_cbArrow);
  arrow.velocity = new Vec2(nx * 600, ny * 600);
  arrow.space = space;
}

function fireBomb(space, tower, target) {
  const cfg = TOWER_CFG[tower.type];
  const lvl = cfg.levels[tower.level];
  const dx = target.position.x - tower.body.position.x;
  const dy = target.position.y - tower.body.position.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  const off = cfg.size / 2 + 6;
  const sx = tower.body.position.x + nx * off;
  const sy = tower.body.position.y + ny * off;

  const bomb = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  const bombShape = new Circle(5, undefined, new Material(0.1, 0.1, 0.1, 1));
  bombShape.filter = new InteractionFilter(GROUP_PROJECTILE, PROJECTILE_MASK);
  bomb.shapes.add(bombShape);
  bomb.isBullet = true;
  bomb.userData._colorIdx = 1;
  bomb.userData._bomb = true;
  bomb.userData._damage = lvl.damage;
  bomb.userData._radius = lvl.radius;
  bomb.userData._impulse = lvl.impulse;
  bomb.userData._life = 120;
  bomb.cbTypes.add(_cbBomb);
  bomb.velocity = new Vec2(nx * 320, ny * 320);
  bomb.space = space;
}

function explodeBomb(bomb) {
  const bx = bomb.position.x, by = bomb.position.y;
  const r = bomb.userData._radius;
  const r2 = r * r;
  const damage = bomb.userData._damage;
  const impulse = bomb.userData._impulse;

  // Collect first so removals don't disturb iteration
  const affected = [];
  for (const body of _space.bodies) {
    if (body.isStatic()) continue;
    if (body === bomb) continue;
    const dx = body.position.x - bx, dy = body.position.y - by;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    affected.push({ body, dx, dy, d: Math.sqrt(d2) });
  }

  for (const { body, dx, dy, d } of affected) {
    const dd = d || 1;
    const falloff = 1 - dd / r;
    body.applyImpulse(new Vec2((dx / dd) * impulse * falloff, (dy / dd) * impulse * falloff));
    if (body.userData?._enemy) {
      body.userData._hp -= damage * falloff;
      if (body.userData._hp <= 0) killEnemy(body);
    }
  }
  bomb.space = null;
}

function killEnemy(enemy) {
  if (!enemy.space) return;
  _gold += enemy.userData._reward || 0;
  _score += 1;
  enemy.space = null;
}

function processPending() {
  // Arrows: apply damage then remove
  for (const { enemy, damage } of _pending.enemyHit) {
    if (!enemy.space) continue;
    enemy.userData._hp -= damage;
    if (enemy.userData._hp <= 0) killEnemy(enemy);
  }
  _pending.enemyHit.length = 0;

  for (const arrow of _pending.removeArrow) {
    if (arrow.space) arrow.space = null;
  }
  _pending.removeArrow.length = 0;

  // Bomb explosions (internally kills enemies in radius, then removes bomb)
  for (const bomb of _pending.explode) {
    if (bomb.space) explodeBomb(bomb);
  }
  _pending.explode.length = 0;

  // Base hits
  for (const enemy of _pending.baseHit) {
    if (!enemy.space) continue;
    _baseHP = Math.max(0, _baseHP - 1);
    enemy.space = null;
    if (_baseHP <= 0) _gameOver = true;
  }
  _pending.baseHit.length = 0;
}

function buildTower(spotIdx, type) {
  const cfg = TOWER_CFG[type];
  if (_gold < cfg.baseCost) return false;
  const spot = _spots[spotIdx];
  if (spot.towerIdx != null) return false;

  const body = new Body(BodyType.STATIC, new Vec2(spot.x, spot.y));
  const towerShape = new Polygon(Polygon.box(cfg.size, cfg.size));
  towerShape.filter = new InteractionFilter(GROUP_TOWER, -1);
  body.shapes.add(towerShape);
  body.userData._colorIdx = cfg.colorIdx;
  body.userData._tower = true;
  body.space = _space;

  const tower = {
    type,
    level: 0,
    body,
    cooldown: 0,
    spotIdx,
  };
  spot.towerIdx = _towers.length;
  _towers.push(tower);
  _gold -= cfg.baseCost;
  return true;
}

function upgradeTower(towerIdx) {
  const tower = _towers[towerIdx];
  const cfg = TOWER_CFG[tower.type];
  const currentLvl = cfg.levels[tower.level];
  if (currentLvl.upgradeCost <= 0) return false;
  if (tower.level >= cfg.levels.length - 1) return false;
  if (_gold < currentLvl.upgradeCost) return false;
  _gold -= currentLvl.upgradeCost;
  tower.level++;
  return true;
}

// ── Waves ────────────────────────────────────────────────────────────────
function startWave() {
  _wave++;
  _waveActive = true;
  _hordeHint = 0;

  // Every 5 waves, add one more enemy to the wave total.
  const fiveTier = Math.floor((_wave - 1) / 5);

  if (_wave % 5 === 0) {
    // Horde wave — quintets burst at once for chaotic pile-ups.
    // The +1 is reserved for the boss that closes the wave.
    _toSpawn = 30 + (_wave / 5 - 1) * 8 + fiveTier + 1;
    _spawnInterval = 40;
  } else if (_wave % 3 === 0) {
    // Fast wave — fewer HP, double speed; tighter spacing to keep pressure up.
    _toSpawn = 8 + Math.floor(_wave / 2) + fiveTier;
    _spawnInterval = Math.max(30, 60 - _wave * 2);
  } else {
    _toSpawn = 8 + Math.floor(_wave / 2) + fiveTier;
    _spawnInterval = Math.max(45, 90 - _wave * 3);
  }
  _spawnTimer = 0;
}

function spawnForWave() {
  if (_toSpawn <= 0) return;
  _spawnTimer--;
  if (_spawnTimer > 0) return;
  _spawnTimer = _spawnInterval;

  if (_wave % 5 === 0) {
    // Horde: spawn in packs of 5. Reserve the final slot for the boss so
    // a burst never overshoots it.
    if (_toSpawn === 1) {
      spawnEnemy(_space, "boss");
      _toSpawn = 0;
      return;
    }
    const burst = Math.min(5, _toSpawn - 1);
    for (let i = 0; i < burst; i++) spawnEnemy(_space, "horde");
    _toSpawn -= burst;
    return;
  } else if (_wave % 3 === 0) {
    spawnEnemy(_space, "fast");
  } else {
    spawnEnemy(_space, "normal");
  }
  _toSpawn--;
}

function anyEnemyAlive() {
  for (const body of _space.bodies) {
    if (body.userData?._enemy) return true;
  }
  return false;
}

function resetGame(space) {
  // Remove all enemies, projectiles, towers; keep walls and base.
  const toKill = [];
  for (const body of space.bodies) {
    const ud = body.userData;
    if (ud?._enemy || ud?._arrow || ud?._bomb || ud?._tower) toKill.push(body);
  }
  for (const b of toKill) b.space = null;

  for (const spot of _spots) spot.towerIdx = null;
  _towers.length = 0;
  _selection = null;
  _gold = START_GOLD;
  _baseHP = START_HP;
  _score = 0;
  _wave = 0;
  _waveActive = false;
  _breakTimer = 60;
  _toSpawn = 0;
  _gameOver = false;
  _pending.explode.length = 0;
  _pending.removeArrow.length = 0;
  _pending.enemyHit.length = 0;
  _pending.baseHit.length = 0;
}

// ── Rendering (overlay — runs in all 3 adapters) ─────────────────────────
function drawRangeCircle(ctx, x, y, r, colorStroke) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = colorStroke;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSpot(ctx, spot, highlight) {
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = highlight ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = highlight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)";
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", spot.x, spot.y);
}

function drawTowerBadge(ctx, tower) {
  const cfg = TOWER_CFG[tower.type];
  const x = tower.body.position.x, y = tower.body.position.y;
  // Label
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cfg.label, x, y);
  // Level pips
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const pipY = y + cfg.size / 2 + 4;
  for (let i = 0; i <= tower.level; i++) {
    ctx.beginPath();
    ctx.arc(x - 6 + i * 6, pipY, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHpBar(ctx, enemy) {
  const hp = enemy.userData._hp;
  const max = enemy.userData._maxHp;
  if (hp >= max) return;
  const r = enemy.shapes.at(0).castCircle.radius;
  const x = enemy.position.x, y = enemy.position.y - r - 5;
  const w = Math.max(14, r * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - w / 2, y, w, 3);
  ctx.fillStyle = "#3fb950";
  ctx.fillRect(x - w / 2, y, w * Math.max(0, hp / max), 3);
}

function button(ctx, x, y, w, h, label, enabled) {
  ctx.fillStyle = enabled ? "rgba(30,35,45,0.92)" : "rgba(30,35,45,0.55)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = enabled ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = enabled ? "#ffffff" : "rgba(255,255,255,0.4)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function drawSelectionUI(ctx) {
  _buttons = [];
  if (!_selection) return;

  if (_selection.kind === "spot") {
    const spot = _spots[_selection.idx];
    // Two buttons: Archer / Bomb
    const bw = 80, bh = 26, gap = 6;
    const totalW = bw * 2 + gap;
    let bx = spot.x - totalW / 2;
    const by = spot.y - 16 - bh - 6;

    const canArcher = _gold >= TOWER_CFG.archer.baseCost;
    const canBomb = _gold >= TOWER_CFG.bomb.baseCost;

    button(ctx, bx, by, bw, bh, `Archer $${TOWER_CFG.archer.baseCost}`, canArcher);
    _buttons.push({ x: bx, y: by, w: bw, h: bh, action: "build", type: "archer", spotIdx: _selection.idx });
    bx += bw + gap;
    button(ctx, bx, by, bw, bh, `Bomb $${TOWER_CFG.bomb.baseCost}`, canBomb);
    _buttons.push({ x: bx, y: by, w: bw, h: bh, action: "build", type: "bomb", spotIdx: _selection.idx });
  } else if (_selection.kind === "tower") {
    const tower = _towers[_selection.idx];
    const cfg = TOWER_CFG[tower.type];
    const lvl = cfg.levels[tower.level];
    // Range preview
    drawRangeCircle(ctx, tower.body.position.x, tower.body.position.y, lvl.range, "rgba(255,255,255,0.5)");

    const bw = 110, bh = 26;
    const bx = tower.body.position.x - bw / 2;
    const by = tower.body.position.y - cfg.size / 2 - bh - 10;
    const maxed = lvl.upgradeCost <= 0;
    const canUp = !maxed && _gold >= lvl.upgradeCost;
    const label = maxed ? "MAX LEVEL" : `Upgrade $${lvl.upgradeCost}`;
    button(ctx, bx, by, bw, bh, label, canUp);
    if (!maxed) {
      _buttons.push({ x: bx, y: by, w: bw, h: bh, action: "upgrade", towerIdx: _selection.idx });
    }
  }
}

function drawTopHUD(ctx, W) {
  ctx.fillStyle = "rgba(13,17,23,0.82)";
  ctx.fillRect(0, 0, W, 28);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Wave ${_wave}`, 10, 14);
  ctx.fillStyle = "#d29922";
  ctx.fillText(`Gold: ${_gold}`, 90, 14);
  ctx.fillStyle = "#58a6ff";
  ctx.fillText(`Score: ${_score}`, 180, 14);
  ctx.fillStyle = _baseHP <= 5 ? "#f85149" : "#3fb950";
  ctx.fillText(`Base HP: ${_baseHP}`, 270, 14);

  // Horde warning
  if (_hordeHint > 0 && Math.floor(_hordeHint / 10) % 2 === 0) {
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("⚠ HORDE INCOMING", W - 10, 14);
  } else if (!_waveActive && _breakTimer > 0 && !_gameOver) {
    const s = Math.ceil(_breakTimer / 60);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "right";
    const next = _wave + 1;
    const nextLabel = next % 5 === 0 ? "HORDE" : next % 3 === 0 ? "FAST" : "Next wave";
    ctx.fillText(`${nextLabel} in ${s}s`, W - 10, 14);
  }
}

function drawGameOver(ctx, W, H) {
  if (!_gameOver) return;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f85149";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Game Over", W / 2, H / 2 - 18);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Survived ${_wave} wave${_wave === 1 ? "" : "s"} — Score ${_score}`, W / 2, H / 2 + 10);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Click anywhere to restart", W / 2, H / 2 + 36);
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "tower-defense",
  label: "Tower Defense",
  tags: ["Gameplay", "Callbacks", "AOE", "Impulse", "Upgrades"],
  featured: false,
  desc:
    "Build <b>archer</b> (single-target) and <b>bomb</b> (AOE + knockback) towers to defend the base. Enemies are physics bodies — bombs scatter them against walls, and they fight their way back on track. <b>Click</b> empty spot to build, <b>click</b> tower to upgrade. Enemy HP scales with wave; every 3rd wave brings fast runners, every 5th wave is a horde that pours in 5-at-a-time.",
  walls: false,
  workerCompatible: false,

  setup(space, W, H) {
    _space = space;
    space.gravity = new Vec2(0, 0);

    _cbEnemy = new CbType();
    _cbArrow = new CbType();
    _cbBomb = new CbType();
    _cbBase = new CbType();
    _cbWall = new CbType();

    buildPath(space);

    // Base — static block at the final waypoint
    const baseWp = WAYPOINTS[WAYPOINTS.length - 1];
    _baseBody = new Body(BodyType.STATIC, new Vec2(baseWp.x, baseWp.y));
    _baseBody.shapes.add(new Polygon(Polygon.box(40, 40)));
    _baseBody.userData._colorIdx = 5;
    _baseBody.userData._base = true;
    _baseBody.cbTypes.add(_cbBase);
    _baseBody.space = space;

    // Tower spots — no body, just logical positions
    _spots = TOWER_SPOTS.map(s => ({ x: s.x, y: s.y, towerIdx: null }));
    _towers = [];
    _selection = null;
    _buttons = [];

    _gold = START_GOLD;
    _baseHP = START_HP;
    _score = 0;
    _wave = 0;
    _waveActive = false;
    _breakTimer = 120;
    _toSpawn = 0;
    _hordeHint = 0;
    _gameOver = false;
    _pending.explode.length = 0;
    _pending.removeArrow.length = 0;
    _pending.enemyHit.length = 0;
    _pending.baseHit.length = 0;

    // Arrow hits enemy — queue damage + arrow removal
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbArrow, _cbEnemy,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        if (!b1 || !b2) return;
        const arrow = b1.userData?._arrow ? b1 : b2;
        const enemy = b1.userData?._enemy ? b1 : b2;
        if (!arrow.space || !enemy.space || arrow.userData._spent) return;
        arrow.userData._spent = true;
        _pending.removeArrow.push(arrow);
        _pending.enemyHit.push({ enemy, damage: arrow.userData._damage });
      },
    ));

    // Bomb contact — queue detonation (walls are excluded by collision mask)
    const bombQueue = (cb) => {
      const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
      const bomb = b1?.userData?._bomb ? b1 : b2?.userData?._bomb ? b2 : null;
      if (bomb?.space && !bomb.userData._spent) {
        bomb.userData._spent = true;
        _pending.explode.push(bomb);
      }
    };
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbBomb, _cbEnemy, bombQueue,
    ));

    // Enemy reaches base — queue base hit
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbEnemy, _cbBase,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const enemy = b1?.userData?._enemy ? b1 : b2?.userData?._enemy ? b2 : null;
        if (enemy?.space && !enemy.userData._spent) {
          enemy.userData._spent = true;
          _pending.baseHit.push(enemy);
        }
      },
    ));
  },

  step(space) {
    if (_gameOver) return;

    processPending();
    steerEnemies();

    // Wave flow
    if (!_waveActive) {
      _breakTimer--;
      // Horde hint flashes in the last 90 frames before a horde wave
      if ((_wave + 1) % 5 === 0 && _breakTimer < 90 && _breakTimer > 0) _hordeHint = _breakTimer;
      if (_breakTimer <= 0) startWave();
    } else {
      spawnForWave();
      if (_toSpawn <= 0 && !anyEnemyAlive()) {
        _waveActive = false;
        _breakTimer = WAVE_BREAK;
        _gold += 3; // small wave-complete bonus
      }
    }

    // Tower firing + projectile lifetimes
    for (const tower of _towers) {
      if (tower.cooldown > 0) { tower.cooldown--; continue; }
      const target = findTargetFor(tower);
      if (!target) continue;
      const cfg = TOWER_CFG[tower.type];
      const lvl = cfg.levels[tower.level];
      if (tower.type === "archer") fireArrow(space, tower, target);
      else fireBomb(space, tower, target);
      tower.cooldown = lvl.cooldown;
    }

    // Cull expired projectiles (collect first to avoid mutating the list we iterate)
    const expired = [];
    for (const body of space.bodies) {
      const ud = body.userData;
      if (!ud) continue;
      if (ud._arrow || ud._bomb) {
        ud._life--;
        if (ud._life <= 0) expired.push(body);
      }
    }
    for (const b of expired) b.space = null;
  },

  click(x, y, space) {
    if (_gameOver) {
      resetGame(space);
      return;
    }

    // Buttons first (drawn last, so hit-test first)
    for (const btn of _buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (btn.action === "build") {
          if (buildTower(btn.spotIdx, btn.type)) _selection = null;
        } else if (btn.action === "upgrade") {
          upgradeTower(btn.towerIdx);
        }
        return;
      }
    }

    // Tower click → select
    for (let i = 0; i < _towers.length; i++) {
      const t = _towers[i];
      const cfg = TOWER_CFG[t.type];
      const hs = cfg.size / 2 + 4;
      if (Math.abs(x - t.body.position.x) <= hs && Math.abs(y - t.body.position.y) <= hs) {
        _selection = (_selection?.kind === "tower" && _selection.idx === i) ? null : { kind: "tower", idx: i };
        return;
      }
    }

    // Empty spot click → select
    for (let i = 0; i < _spots.length; i++) {
      const s = _spots[i];
      if (s.towerIdx != null) continue;
      if (distSq(x, y, s.x, s.y) <= 20 * 20) {
        _selection = (_selection?.kind === "spot" && _selection.idx === i) ? null : { kind: "spot", idx: i };
        return;
      }
    }

    // Click empty space → deselect
    _selection = null;
  },

  render3dOverlay(ctx, _sp, W, H) {
    // Empty spots
    for (let i = 0; i < _spots.length; i++) {
      const s = _spots[i];
      if (s.towerIdx != null) continue;
      const hl = _selection?.kind === "spot" && _selection.idx === i;
      drawSpot(ctx, s, hl);
    }

    // Tower badges + HP bars on enemies
    for (const t of _towers) drawTowerBadge(ctx, t);
    for (const body of _space.bodies) {
      if (body.userData?._enemy) drawHpBar(ctx, body);
    }

    // Selection UI (buttons, range circle) — populates _buttons
    drawSelectionUI(ctx);

    drawTopHUD(ctx, W);
    drawGameOver(ctx, W, H);
  },
};
