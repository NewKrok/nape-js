import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType,
  PreListener, PreFlag,
} from "../nape-js.esm.js?v=3.41.0";

// Standoff — a top-down "stand-still-to-shoot" roguelite arena.
//
// The hook: your hero ONLY auto-fires while standing still. The moment you
// move, your weapon goes cold — so every fight is a dance of "stop, shoot,
// reposition, dodge the incoming fire". Clear every enemy in a room and you
// draft one of three permanent perks (extra arrows, wall ricochet, piercing,
// crit, …) that stack across the whole run. Every 5th room is a boss.
//
// Camera shake punctuates the action: a tiny kick on every kill, a sharper
// jolt when you take damage, and a big slam on boss spawns and boss deaths.
//
// Heavily based on the existing `top-down-shooter` / `arena-defense` demos —
// same wall builder, same deferred-mutation queue, same virtual joystick —
// with the stand-still firing rule and the perk-draft loop layered on top.

// ── Collision groups ───────────────────────────────────────────────────────
// 1=default, 2=projectile, 8=wall, 16=player, 32=enemy.
const GROUP_PROJECTILE = 2;
const GROUP_WALL = 8;
const GROUP_PLAYER = 16;
const GROUP_ENEMY = 32;

// Player bullets stop on walls AND enemies. Enemy bullets stop on walls AND
// the player (they pass through other enemies so clusters don't self-block).
const PLAYER_BULLET_MASK = GROUP_WALL | GROUP_ENEMY;
const ENEMY_BULLET_MASK = GROUP_WALL | GROUP_PLAYER;

// ── Arena ──────────────────────────────────────────────────────────────────
// Fixed arena equal to the viewport (matches CW×CH in examples.js). Named
// SCREEN_W/SCREEN_H (not W/H) to avoid clobbering the CodePen runtime
// template, which declares `const W = canvas.width` and would SyntaxError.
const SCREEN_W = 900, SCREEN_H = 500;
const HUD_H = 30;
const WT = 6;

// A handful of circular pillars for cover — convex, so chasing enemies slide
// around them cleanly with no concave traps (no raycast avoidance needed).
// Corner pillars only — no centre pillar. A centre pillar (450, 290) would
// overlap the hero's spawn point at (450, 265), leaving the hero jammed
// inside static geometry and getting shoved out on frame 1 — which twisted
// bullet aim, made piercing/wall-ricochet appear broken, and made shots vanish
// near the player. Kept as four corner cover pieces.
const PILLARS = [
  { x: 250, y: 180, r: 26 },
  { x: 650, y: 180, r: 26 },
  { x: 250, y: 400, r: 26 },
  { x: 650, y: 400, r: 26 },
];

// Spawn points — 4 edges, inset from the arena bounds.
const SPAWN_POINTS = [
  { x: SCREEN_W / 2, y: HUD_H + 30 },
  { x: SCREEN_W - 40, y: SCREEN_H / 2 },
  { x: SCREEN_W / 2, y: SCREEN_H - 30 },
  { x: 40, y: SCREEN_H / 2 },
];

// ── Player ───────────────────────────────────────────────────────────────
const PLAYER_R = 13;
const PLAYER_BASE_SPEED = 175;
const PLAYER_MAX_HP = 100;
const PLAYER_BASE_COOLDOWN = 16;   // frames between volleys when standing still
const PLAYER_INVULN_FRAMES = 28;   // i-frames after taking a hit
const AUTO_AIM_RANGE = 460;
// Brief settle so a single tap-to-reposition doesn't fully reset firing: the
// hero must be still this many frames before the weapon comes back online.
const STILL_DELAY = 6;

// ── Enemies ────────────────────────────────────────────────────────────────
const ENEMY_MELEE_SPEED = 78;
const ENEMY_RANGED_SPEED = 66;
const ENEMY_DASHER_SPEED = 60;
const ENEMY_BOSS_SPEED = 50;
const ENEMY_RANGED_HOLD_DIST = 210;
const ENEMY_RANGED_FIRE_COOLDOWN = 96;
const ENEMY_BOSS_FIRE_COOLDOWN = 130;
const ENEMY_BULLET_SPEED = 250;
const ENEMY_MELEE_DAMAGE = 9;
const ENEMY_BULLET_DAMAGE = 6;
const ENEMY_BOSS_CONTACT_DAMAGE = 16;

// Melee charge — periodic burst rush at boosted speed (telegraphed by a ring).
const MELEE_CHARGE_DURATION = 80;
const MELEE_CHARGE_COOLDOWN = 230;
const MELEE_CHARGE_MULT = 2.1;

// Dasher — short, fast dashes that close the gap then drift.
const DASHER_DASH_DURATION = 20;
const DASHER_DASH_COOLDOWN = 80;
const DASHER_DASH_MULT = 3.6;

// Boss abilities.
const BOSS_CHARGE_INTERVAL = 300;
const BOSS_CHARGE_DURATION = 56;
const BOSS_CHARGE_MULT = 2.5;
const BOSS_RING_INTERVAL = 220;    // radial bullet ring
const BOSS_RING_PELLETS = 12;

// ── Active hazards (environmental threats) ─────────────────────────────────
// Spike traps: telegraphed floor traps that cycle idle → warn → strike.
// Lava pools: static zones that chip HP while you stand in them.
// Sawblades: KINEMATIC spinning bars that physically sweep the arena and
// hurt on contact (also block bullets, like a moving wall). All three are
// introduced gradually as you descend into deeper rooms.
const SPIKE_R = 24;
const SPIKE_DAMAGE = 12;
const SPIKE_CYCLE = 190;       // frames per full idle→warn→strike cycle
const SPIKE_WARN_AT = 118;     // telegraph (rumbling) begins
const SPIKE_STRIKE_AT = 158;   // spikes are live (dangerous) from here…
const SPIKE_STRIKE_END = 186;  // …back to idle here
const SPIKE_SLOTS = [
  { x: 450, y: 140 }, { x: 450, y: 440 },
  { x: 140, y: 290 }, { x: 760, y: 290 },
];

const LAVA_R = 42;
const LAVA_DAMAGE = 4;         // per tick, gated by player i-frames
const LAVA_SLOTS = [
  { x: 150, y: 140 }, { x: 750, y: 140 },
  { x: 150, y: 440 }, { x: 750, y: 440 },
];

const BLADE_DAMAGE = 14;
const BLADE_HALF_LEN = 78;     // sweep radius (tips reach this far from pivot)
const BLADE_ANGVEL = 1.7;      // rad/s
const BLADE_SLOTS = [
  { x: 250, y: 290 }, { x: 650, y: 290 },
];

// ── Pickups ────────────────────────────────────────────────────────────────
// Heart drops: enemies have a chance to leave a healing heart on death (a
// boss always drops a few). Hearts are collected by walking over them, but
// only when you're actually wounded — at full HP they're left on the floor.
const HEART_R = 9;
const HEART_HEAL = 18;
const HEART_DROP_CHANCE = 0.18;
const HEART_LIFETIME = 600;   // ~10s before it fades out

// ── Perks (drafted one-of-three after every room) ──────────────────────────
// Stackable numeric perks track a count; one-shot perks are booleans removed
// from the draft pool once owned. Effects are read lazily at fire time.
const PERK_DEFS = [
  { id: "extraArrow", label: "Front Arrow", icon: "»",
    desc: "+1 parallel forward arrow", max: 4 },
  { id: "side", label: "Side Arrows", icon: "⇆",
    desc: "Fire two arrows sideways", max: 1 },
  { id: "rear", label: "Rear Arrow", icon: "↩",
    desc: "Fire one arrow backward", max: 1 },
  { id: "diagonal", label: "Diagonal Arrows", icon: "✕",
    desc: "Fire two diagonal arrows", max: 1 },
  { id: "ricochet", label: "Wall Ricochet", icon: "◣",
    desc: "+1 wall bounce per arrow", max: 3 },
  { id: "pierce", label: "Piercing", icon: "→",
    desc: "+1 enemy pierce per arrow", max: 3 },
  { id: "rapid", label: "Quickdraw", icon: "⚡",
    desc: "Fire noticeably faster", max: 3 },
  { id: "damage", label: "Sharp Tips", icon: "✦",
    desc: "+1 arrow damage", max: 5 },
  { id: "crit", label: "Deadeye", icon: "◎",
    desc: "+12% chance to deal double", max: 4 },
  { id: "explosive", label: "Explosive Shot", icon: "✺",
    desc: "Arrows explode on impact", max: 1 },
  { id: "bloodthirst", label: "Bloodthirst", icon: "✚",
    desc: "Heal 3 HP per kill", max: 1 },
  { id: "swift", label: "Swift Feet", icon: "≫",
    desc: "+move speed & faster recovery", max: 3 },
  { id: "orbital", label: "Spirit", icon: "◈",
    desc: "+1 spinning orb around you", max: 2 },
  { id: "ricochetEnemy", label: "Ricochet", icon: "↝",
    desc: "+1 arrow bounce between enemies", max: 3 },
  { id: "freeze", label: "Freeze", icon: "❄",
    desc: "Arrows slow enemies for 1.5s", max: 1 },
  { id: "poison", label: "Poisoned Touch", icon: "☠",
    desc: "Arrows poison enemies (3s DoT)", max: 1 },
  { id: "chain", label: "Bolt", icon: "⚡",
    desc: "Arrows arc lightning to a nearby enemy (50% dmg)", max: 1 },
];

const ORBITAL_RADIUS = 55;
const ORBITAL_ANGULAR = 0.06;   // rad per frame — full rev in ~1.75s
const ORBITAL_HIT_R = 14;       // half-side of the blade hitbox
const ORBITAL_COOLDOWN = 24;    // per-enemy per-blade re-hit cooldown (frames)
const FREEZE_FRAMES = 90;
const FREEZE_MUL = 0.4;
const POISON_FRAMES = 180;
const POISON_TICK = 30;
const CHAIN_RANGE = 200;
const CHAIN_CHANCE = 0.5;

const EX_RADIUS = 64;
const EX_IMPULSE = 90;

// Virtual joystick (mobile) — bottom-left quadrant activates it.
const STICK_ZONE_W = SCREEN_W * 0.45;
const STICK_ZONE_Y = HUD_H + SCREEN_H * 0.5;
const STICK_MAX_R = 60;
let _isTouch = false;

// ── Module state ────────────────────────────────────────────────────────────
let _space = null;
let _player = null;
let _playerHP = 0;
let _playerInvuln = 0;
let _shotCooldown = 0;
let _stillFrames = 0;       // consecutive frames the hero has been stationary
let _firingHot = false;     // true while standing still long enough to shoot

let _room = 0;
let _roomActive = false;
let _toSpawn = 0;
let _spawnTimer = 0;
let _spawnInterval = 0;
let _bossPending = false;

// Room transitions. A cleared room shows an exit door on a random wall side;
// walking into it triggers a fade-out, teleport to the opposite wall of the
// next room, and a fade-in — giving the roguelite "room-to-room" feel without
// a real world-space camera pan.
let _transitionPhase = null;    // null | "door" | "fade-out" | "fade-in"
let _doorSide = "top";          // "top" | "right" | "bottom" | "left"
let _fadeT = 0;                 // 0..1
const DOOR_HALF_W = 34;         // half-width of the visual door opening
const DOOR_TRIGGER_DIST = 24;   // distance from door center that enters fade
const FADE_FRAMES = 24;         // per fade-out / fade-in leg

let _gameOver = false;
let _muzzle = 0;            // counts down a brief muzzle-flash after firing
let _hintTimer = 0;         // shows the control hint at the start of a run

// Perk inventory (run-scoped). Numeric counts; booleans for one-shots.
const _perks = Object.create(null);

// Level-up draft overlay.
let _drafting = false;
let _draftChoices = [];     // array of PERK_DEFS entries
let _hoverCard = -1;

// Input — keyboard (desktop) + virtual stick (mobile/drag).
const _keys = Object.create(null);
let _stickActive = false;
let _stickOrigin = { x: 0, y: 0 };
let _stickVec = { x: 0, y: 0 };
const _moveDir = { x: 0, y: 0 };

let _onKeyDown = null;
let _onKeyUp = null;

let _cbPlayer, _cbEnemy, _cbPlayerBullet, _cbEnemyBullet, _cbWall, _cbHazard;

// Active hazards. Spikes/lava are pure step-loop zones (no physics body);
// sawblades are real KINEMATIC bodies that spin and collide.
let _spikes = [];   // { x, y, t }   t = phase timer within SPIKE_CYCLE
let _lava = [];     // { x, y }
let _blades = [];   // { body, pivot }
let _hearts = [];   // { x, y, life }  healing pickups
let _time = 0;      // frame counter for cosmetic animation

// Orbital blades — WeakMap of per-enemy last-hit frame so a spinning blade
// doesn't keep re-damaging the same enemy at 60 Hz while overlapping.
let _orbitalAngle = 0;
let _orbitalLastHit = new WeakMap();

// Runner handle — lets us trigger camera shake without coupling to the page.
let _runnerRef = null;

// Deferred actions — mutate the body graph between steps, never during a
// collision callback. Same pattern as top-down-shooter / arena-defense.
const _pending = {
  enemyHit: [],     // { enemy, damage, crit }
  removeBullet: [], // bullet body
  bounce: [],       // { bullet, nx, ny }
  ricochetRedirect: [], // { bullet, target }  bullet retargeted to next enemy
  aoeDetonate: [],  // bullet body (explosive)
  playerHit: [],    // { damage }
};

// ── Helpers ──────────────────────────────────────────────────────────────
function bodyFromInt(intObj) {
  return intObj.castBody ?? intObj.castShape?.body ?? null;
}

// First contact normal from a BEGIN interaction callback. InteractionCallback
// exposes `arbiters` (a list) — unlike PreCallback, which has `.arbiter`.
// The returned normal always points AWAY from `awayFromBody` (i.e. outward
// from the surface the caller is bouncing off), regardless of which shape
// happens to be arb.shape1 vs arb.shape2. Nape's raw normal points
// shape1 → shape2, so we flip it when the caller's body is on shape1's side.
function firstCollisionNormal(cb, awayFromBody = null) {
  try {
    const arbs = cb.arbiters;
    for (let i = 0; i < arbs.length; i++) {
      const arb = arbs.at(i);
      const carb = arb.collisionArbiter;
      if (!carb?.normal) continue;
      // Extract as plain floats — the Vec2 returned here is engine-pooled
      // and may be reused for another contact by the time _pending.bounce
      // is processed, silently flipping the reflection direction.
      const flip = awayFromBody && arb.shape1?.body === awayFromBody ? -1 : 1;
      return { x: carb.normal.x * flip, y: carb.normal.y * flip };
    }
  } catch (_) { /* no arbiter available */ }
  return null;
}

function distSq(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function rotate(x, y, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: x * c - y * s, y: x * s + y * c };
}

function shake(amp, dur) {
  _runnerRef?.shakeCamera?.(amp, dur);
}

// Thin axis-rotated quad wall — no Material (P53 Polygon+Material tunneling
// workaround). Copied verbatim from top-down-shooter / tower-defense.
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

function buildArena(space) {
  const top = HUD_H;
  addWallSegment(space, 0, top, SCREEN_W, top);
  addWallSegment(space, SCREEN_W, top, SCREEN_W, SCREEN_H);
  addWallSegment(space, SCREEN_W, SCREEN_H, 0, SCREEN_H);
  addWallSegment(space, 0, SCREEN_H, 0, top);

  // Circular cover pillars.
  for (const p of PILLARS) {
    const body = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
    const shape = new Circle(p.r);
    shape.filter = new InteractionFilter(GROUP_WALL, -1);
    body.shapes.add(shape);
    body.cbTypes.add(_cbWall);
    body.userData._wall = true;
    body.userData._pillar = true;
    body.userData._colorIdx = 1;
    body.space = space;
  }
}

// ── Perks ──────────────────────────────────────────────────────────────────
function perkCount(id) {
  return _perks[id] | 0;
}

function perkActive(id) {
  return !!_perks[id];
}

function resetPerks() {
  for (const k in _perks) delete _perks[k];
}

// Perks still eligible to appear in a draft (below their cap).
function availablePerks() {
  return PERK_DEFS.filter((p) => perkCount(p.id) < p.max);
}

function rollDraft() {
  const pool = availablePerks();
  const picks = [];
  // Sample up to 3 distinct perks. If the pool is exhausted (everything
  // maxed), fall back to a "Vitality" heal card so the draft is never empty.
  const copy = pool.slice();
  while (picks.length < 3 && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    picks.push(copy.splice(i, 1)[0]);
  }
  while (picks.length < 3) {
    picks.push({ id: "_heal", label: "Vitality", icon: "♥",
      desc: "Restore 30 HP", max: Infinity });
  }
  return picks;
}

function applyPerk(perk) {
  if (perk.id === "_heal") {
    _playerHP = Math.min(PLAYER_MAX_HP, _playerHP + 30);
    return;
  }
  _perks[perk.id] = perkCount(perk.id) + 1;
  // Refill a little HP each draft so a run stays survivable.
  _playerHP = Math.min(PLAYER_MAX_HP, _playerHP + 12);
}

function playerSpeed() {
  return PLAYER_BASE_SPEED + perkCount("swift") * 22;
}

function shotCooldown() {
  return Math.max(5, PLAYER_BASE_COOLDOWN - perkCount("rapid") * 3);
}

function stillDelay() {
  // Swift Feet also shortens how long you must stand still before firing.
  return Math.max(2, STILL_DELAY - perkCount("swift"));
}

// ── Player ───────────────────────────────────────────────────────────────
function spawnPlayer(space) {
  const body = new Body(BodyType.DYNAMIC,
    new Vec2(SCREEN_W / 2, HUD_H + (SCREEN_H - HUD_H) / 2));
  const shape = new Circle(PLAYER_R, undefined, new Material(0.3, 0.3, 0.4, 1));
  shape.filter = new InteractionFilter(GROUP_PLAYER, -1);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.isBullet = true;
  body.userData._colorIdx = 0; // blue
  body.userData._player = true;
  body.cbTypes.add(_cbPlayer);
  body.space = space;
  return body;
}

// ── Enemies ────────────────────────────────────────────────────────────────
function spawnEnemy(space, kind) {
  const sp = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  const jitterX = (Math.random() - 0.5) * 26;
  const jitterY = (Math.random() - 0.5) * 26;

  const w = Math.max(0, _room - 1);
  let r, baseHp, hpBonus, speed, contactDmg, colorIdx;
  if (kind === "boss") {
    r = 24; baseHp = 70; hpBonus = Math.floor(w / 5) * 40;
    speed = ENEMY_BOSS_SPEED; contactDmg = ENEMY_BOSS_CONTACT_DAMAGE; colorIdx = 1;
  } else if (kind === "ranged") {
    r = 10; baseHp = 4; hpBonus = w * 2;
    speed = ENEMY_RANGED_SPEED; contactDmg = ENEMY_MELEE_DAMAGE; colorIdx = 4;
  } else if (kind === "dasher") {
    r = 10; baseHp = 4; hpBonus = w;
    speed = ENEMY_DASHER_SPEED; contactDmg = ENEMY_MELEE_DAMAGE; colorIdx = 5;
  } else {
    r = 11; baseHp = 5; hpBonus = w * 2;
    speed = ENEMY_MELEE_SPEED; contactDmg = ENEMY_MELEE_DAMAGE; colorIdx = 3;
  }
  const speedMul = 1 + w * 0.012;
  const hp = baseHp + hpBonus;

  const body = new Body(BodyType.DYNAMIC, new Vec2(sp.x + jitterX, sp.y + jitterY));
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
  body.userData._fireCooldown = kind === "ranged" ? 40 + Math.floor(Math.random() * 50)
                              : kind === "boss" ? 90 : 0;
  body.userData._chargeTimer = 0;
  body.userData._chargeCdTimer = kind === "melee"
    ? 60 + Math.floor(Math.random() * MELEE_CHARGE_COOLDOWN) : 0;
  body.userData._dashTimer = 0;
  body.userData._dashCdTimer = kind === "dasher"
    ? 30 + Math.floor(Math.random() * DASHER_DASH_COOLDOWN) : 0;
  body.userData._bossChargeCd = kind === "boss" ? BOSS_CHARGE_INTERVAL : 0;
  body.userData._bossRingCd = kind === "boss" ? BOSS_RING_INTERVAL : 0;
  body.userData._hitFlash = 0;
  body.cbTypes.add(_cbEnemy);
  body.space = space;
}

function steerEnemies() {
  if (!_player?.space) return;
  const px = _player.position.x, py = _player.position.y;
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy) continue;
    if (ud._hitFlash > 0) ud._hitFlash--;

    const dx = px - body.position.x;
    const dy = py - body.position.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;

    // Ability state machines.
    if (ud._kind === "melee") {
      if (ud._chargeTimer > 0) ud._chargeTimer--;
      else if (--ud._chargeCdTimer <= 0) {
        ud._chargeTimer = MELEE_CHARGE_DURATION;
        ud._chargeCdTimer = MELEE_CHARGE_COOLDOWN;
      }
    } else if (ud._kind === "dasher") {
      if (ud._dashTimer > 0) ud._dashTimer--;
      else if (--ud._dashCdTimer <= 0) {
        ud._dashTimer = DASHER_DASH_DURATION;
        ud._dashCdTimer = DASHER_DASH_COOLDOWN;
      }
    } else if (ud._kind === "boss") {
      if (ud._chargeTimer > 0) ud._chargeTimer--;
      else if (--ud._bossChargeCd <= 0) {
        ud._chargeTimer = BOSS_CHARGE_DURATION;
        ud._bossChargeCd = BOSS_CHARGE_INTERVAL;
      }
    }

    const charging = ud._chargeTimer > 0;
    const dashing = ud._dashTimer > 0;
    let speed = ud._speed * enemySpeedMul(ud);
    if (charging) speed *= (ud._kind === "boss" ? BOSS_CHARGE_MULT : MELEE_CHARGE_MULT);
    if (dashing) speed *= DASHER_DASH_MULT;

    // Desired velocity — ranged kite to hold distance, everyone else closes.
    let tvx, tvy;
    if (ud._kind === "ranged" && d < ENEMY_RANGED_HOLD_DIST && !charging) {
      tvx = -nx * speed * 0.6; tvy = -ny * speed * 0.6;
    } else {
      tvx = nx * speed; tvy = ny * speed;
    }
    const vx0 = body.velocity.x, vy0 = body.velocity.y;
    const blend = (charging || dashing) ? 0.16 : 0.08;
    body.velocity = new Vec2(vx0 + (tvx - vx0) * blend, vy0 + (tvy - vy0) * blend);

    // Firing.
    if (ud._kind === "ranged") {
      if (--ud._fireCooldown <= 0) {
        fireEnemyBullet(body, nx, ny);
        ud._fireCooldown = ENEMY_RANGED_FIRE_COOLDOWN;
      }
    } else if (ud._kind === "boss") {
      if (--ud._fireCooldown <= 0) {
        fireBossShotgun(body, 5);
        ud._fireCooldown = ENEMY_BOSS_FIRE_COOLDOWN;
      }
      if (--ud._bossRingCd <= 0) {
        fireBossRing(body);
        ud._bossRingCd = BOSS_RING_INTERVAL;
      }
    }
  }
}

// ── Bullets ──────────────────────────────────────────────────────────────
function findNearestEnemy() {
  if (!_player?.space) return null;
  const px = _player.position.x, py = _player.position.y;
  let best = null, bestD = AUTO_AIM_RANGE * AUTO_AIM_RANGE;
  for (const body of _space.bodies) {
    if (!body.userData?._enemy) continue;
    const d2 = distSq(px, py, body.position.x, body.position.y);
    if (d2 < bestD) { bestD = d2; best = body; }
  }
  return best;
}

// A bullet spawned inside a pillar (side-arrow lane grazing one, hero pressed
// up against cover) instantly collides on frame 0 and gets swept away —
// looks to the player like a "shot that just vanished". Guard: if the
// spawn point sits inside a pillar, nudge it out toward the fire direction.
function nudgeSpawnOutOfPillar(sx, sy, nx, ny) {
  for (const p of PILLARS) {
    const dx = sx - p.x, dy = sy - p.y;
    const clearance = p.r + 4;    // + bullet radius margin
    if (dx * dx + dy * dy < clearance * clearance) {
      // Push spawn forward along fire direction until it exits this pillar.
      // At most ~2× pillar diameter — beyond that we just skip the bullet.
      for (let step = 0; step < 20; step++) {
        sx += nx * 6;
        sy += ny * 6;
        const ddx = sx - p.x, ddy = sy - p.y;
        if (ddx * ddx + ddy * ddy >= clearance * clearance) break;
      }
    }
  }
  return { sx, sy };
}

function spawnPlayerBullet(dx, dy, ox = 0, oy = 0) {
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  const off = PLAYER_R + 4;
  let sx = _player.position.x + nx * off + ox;
  let sy = _player.position.y + ny * off + oy;
  ({ sx, sy } = nudgeSpawnOutOfPillar(sx, sy, nx, ny));

  const crit = Math.random() < perkCount("crit") * 0.12;
  const explosive = perkActive("explosive");
  const dmg = (1 + perkCount("damage")) * (crit ? 2 : 1);

  const bullet = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  const shape = new Circle(crit || explosive ? 4 : 3, undefined,
    new Material(0.1, 0.1, 0.1, 0.01));
  shape.filter = new InteractionFilter(GROUP_PROJECTILE, PLAYER_BULLET_MASK);
  bullet.shapes.add(shape);
  bullet.rotation = Math.atan2(ny, nx);
  bullet.isBullet = true;
  bullet.userData._colorIdx = explosive ? 1 : crit ? 4 : 0;
  bullet.userData._playerBullet = true;
  bullet.userData._damage = dmg;
  bullet.userData._crit = crit;
  bullet.userData._explosive = explosive;
  bullet.userData._pierceLeft = perkCount("pierce");
  bullet.userData._bounceLeft = perkCount("ricochet");
  bullet.userData._enemyBounceLeft = perkCount("ricochetEnemy");
  bullet.userData._hits = new Set();
  bullet.userData._life = 110;
  bullet.cbTypes.add(_cbPlayerBullet);
  bullet.velocity = new Vec2(nx * 620, ny * 620);
  bullet.space = _space;
}

// Build the volley directions from the current perk inventory, all relative
// to the auto-aim direction (nx, ny).
function firePlayerShot() {
  const target = findNearestEnemy();
  if (!target) return false;
  const ax = target.position.x - _player.position.x;
  const ay = target.position.y - _player.position.y;
  const d = Math.hypot(ax, ay) || 1;
  const nx = ax / d, ny = ay / d;

  // Front arrows — Archero-style: all forward arrows fly in parallel lanes,
  // offset laterally by a small step. Base 1, each Front Arrow rank adds one
  // more parallel arrow (→ 1, 2, 3, 4, 5). Middle arrow stays perfectly
  // on-target so aim always lands the primary hit.
  const fwdCount = 1 + perkCount("extraArrow");
  const laneStep = 12;                // px between adjacent parallel lanes
  const px = -ny, py = nx;            // unit perpendicular (right-hand normal)
  const shots = [];
  for (let i = 0; i < fwdCount; i++) {
    const offset = (i - (fwdCount - 1) / 2) * laneStep;
    shots.push({ dx: nx, dy: ny, ox: px * offset, oy: py * offset });
  }
  if (perkActive("side")) {
    shots.push({ dx: -ny, dy: nx, ox: 0, oy: 0 });
    shots.push({ dx: ny, dy: -nx, ox: 0, oy: 0 });
  }
  if (perkActive("diagonal")) {
    const d1 = rotate(nx, ny, Math.PI / 4);
    const d2 = rotate(nx, ny, -Math.PI / 4);
    shots.push({ dx: d1.x, dy: d1.y, ox: 0, oy: 0 });
    shots.push({ dx: d2.x, dy: d2.y, ox: 0, oy: 0 });
  }
  if (perkActive("rear")) {
    shots.push({ dx: -nx, dy: -ny, ox: 0, oy: 0 });
  }

  for (const s of shots) spawnPlayerBullet(s.dx, s.dy, s.ox, s.oy);
  _muzzle = 4;
  return true;
}

function fireEnemyBullet(enemy, nx, ny) {
  const r = enemy.shapes.at(0).castCircle.radius;
  const off = r + 4;
  const sx = enemy.position.x + nx * off;
  const sy = enemy.position.y + ny * off;
  const bullet = new Body(BodyType.DYNAMIC, new Vec2(sx, sy));
  const shape = new Circle(3.5, undefined, new Material(0.1, 0.1, 0.1, 0.01));
  shape.filter = new InteractionFilter(GROUP_PROJECTILE, ENEMY_BULLET_MASK);
  bullet.shapes.add(shape);
  bullet.isBullet = true;
  bullet.userData._colorIdx = 3;
  bullet.userData._enemyBullet = true;
  bullet.userData._damage = ENEMY_BULLET_DAMAGE;
  bullet.userData._life = 130;
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
  const halfFan = 0.14 * (pellets - 1);
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0 : (i / (pellets - 1)) * 2 - 1;
    const dir = rotate(nx, ny, t * halfFan / 2);
    fireEnemyBullet(boss, dir.x, dir.y);
  }
}

function fireBossRing(boss) {
  for (let i = 0; i < BOSS_RING_PELLETS; i++) {
    const ang = (i / BOSS_RING_PELLETS) * Math.PI * 2;
    fireEnemyBullet(boss, Math.cos(ang), Math.sin(ang));
  }
  shake(6, 0.2);
}

// Radial AOE around an explosive bullet — damages enemies and shoves dynamic
// bodies, both tapering to zero at the edge. Bolt (chain lightning) rolls
// independently for every enemy the AoE actually damages, so a wide blast
// can arc into a second target off the burst. Set `keepAlive` when the
// bullet still has pierce/ricochet charges left and should keep flying.
function explodeBullet(bullet, keepAlive = false) {
  const bx = bullet.position.x, by = bullet.position.y;
  const r2 = EX_RADIUS * EX_RADIUS;
  for (const body of _space.bodies) {
    if (body.isStatic() || body === bullet) continue;
    const dx = body.position.x - bx, dy = body.position.y - by;
    const dd2 = dx * dx + dy * dy;
    if (dd2 > r2) continue;
    const dd = Math.sqrt(dd2) || 1;
    const falloff = 1 - dd / EX_RADIUS;
    body.applyImpulse(new Vec2((dx / dd) * EX_IMPULSE * falloff,
                               (dy / dd) * EX_IMPULSE * falloff));
    if (body.userData?._enemy) {
      const dmg = bullet.userData._damage * falloff;
      body.userData._hp -= dmg;
      body.userData._hitFlash = 4;
      applyStatusOnHit(body);
      tryChainLightning(body, dmg);
      if (body.userData._hp <= 0) killEnemy(body);
    }
  }
  _explosionFx.push({ x: bx, y: by, r: EX_RADIUS, life: 18, maxLife: 18 });
  if (!keepAlive) bullet.space = null;
  shake(5, 0.16);
}

function updateExplosionFx() {
  const kept = [];
  for (const fx of _explosionFx) if (--fx.life > 0) kept.push(fx);
  _explosionFx = kept;
}

// ── Pickups ────────────────────────────────────────────────────────────────
function dropHeart(x, y) {
  _hearts.push({ x, y, life: HEART_LIFETIME });
}

// Age hearts and collect any the (wounded) player walks over. Heals directly;
// full-HP players leave hearts on the floor for later.
function updateHearts() {
  if (_hearts.length === 0) return;
  const px = _player?.space ? _player.position.x : null;
  const py = _player?.space ? _player.position.y : null;
  const rr = HEART_R + PLAYER_R;
  const kept = [];
  for (const hbody of _hearts) {
    if (px !== null && _playerHP < PLAYER_MAX_HP &&
        distSq(px, py, hbody.x, hbody.y) < rr * rr) {
      _playerHP = Math.min(PLAYER_MAX_HP, _playerHP + HEART_HEAL);
      shake(2, 0.1);
      continue; // collected
    }
    if (--hbody.life > 0) kept.push(hbody);
  }
  _hearts = kept;
}

// ── Orbital blades ─────────────────────────────────────────────────────────
// Each rank of the "orbital" perk adds one small blade that spins around the
// hero at a fixed radius. Enemies overlapping a blade take arrow damage; a
// per-enemy cooldown per frame stamp prevents 60 Hz re-damage.
function orbitalCount() {
  return perkCount("orbital");
}

function orbitalPositions() {
  const n = orbitalCount();
  if (n === 0 || !_player?.space) return [];
  const cx = _player.position.x, cy = _player.position.y;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = _orbitalAngle + (i * Math.PI * 2) / n;
    out.push({ x: cx + Math.cos(a) * ORBITAL_RADIUS,
               y: cy + Math.sin(a) * ORBITAL_RADIUS });
  }
  return out;
}

function updateOrbitals() {
  const n = orbitalCount();
  if (n === 0 || !_player?.space || _transitionPhase) return;
  _orbitalAngle = (_orbitalAngle + ORBITAL_ANGULAR) % (Math.PI * 2);
  const blades = orbitalPositions();
  const dmg = 1 + perkCount("damage");
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy) continue;
    const er = body.shapes.at(0).castCircle.radius;
    const rr = ORBITAL_HIT_R + er;
    const rrSq = rr * rr;
    let hit = false;
    for (const b of blades) {
      if (distSq(b.x, b.y, body.position.x, body.position.y) < rrSq) {
        hit = true;
        break;
      }
    }
    if (!hit) continue;
    const last = _orbitalLastHit.get(body) ?? -Infinity;
    if (_time - last < ORBITAL_COOLDOWN) continue;
    _orbitalLastHit.set(body, _time);
    _pending.enemyHit.push({ enemy: body, damage: dmg, crit: false });
    applyStatusOnHit(body);
  }
}

// ── Status effects ─────────────────────────────────────────────────────────
// Freeze + poison. Both live in enemy userData so they persist across frames
// and are cleaned up naturally when the enemy body leaves the space.
function applyStatusOnHit(enemy) {
  const ud = enemy.userData;
  if (!ud || !ud._enemy) return;
  if (perkActive("freeze")) ud._frozenUntil = _time + FREEZE_FRAMES;
  if (perkActive("poison")) {
    ud._poisonUntil = _time + POISON_FRAMES;
    ud._poisonNextTick = _time + POISON_TICK;
  }
}

function updateStatusEffects() {
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy) continue;
    if (ud._poisonUntil && _time <= ud._poisonUntil &&
        _time >= (ud._poisonNextTick ?? 0)) {
      ud._poisonNextTick = _time + POISON_TICK;
      _pending.enemyHit.push({ enemy: body, damage: 1, crit: false });
    }
  }
}

function enemySpeedMul(ud) {
  return ud._frozenUntil && _time <= ud._frozenUntil ? FREEZE_MUL : 1;
}

// ── Chain lightning ────────────────────────────────────────────────────────
// Fired when an arrow lands. Rolls the perk chance and, if it hits, damages
// the closest OTHER enemy within CHAIN_RANGE for half. Purely damage — no
// projectile physics — with a short-lived visual pushed onto _chainFx.
let _chainFx = []; // [{ ax, ay, bx, by, life }]
let _explosionFx = []; // [{ x, y, r, life, maxLife }]

// Find the closest OTHER enemy the bullet hasn't already hit — for Ricochet
// redirect (physical bullet retarget). Uses the CHAIN_RANGE cap so a bullet
// doesn't teleport across the whole arena.
function findRicochetTarget(bullet, sourceEnemy) {
  const hits = bullet.userData._hits;
  const sx = sourceEnemy.position.x, sy = sourceEnemy.position.y;
  let best = null, bestD = CHAIN_RANGE * CHAIN_RANGE;
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy || body === sourceEnemy || hits.has(body)) continue;
    const d2 = distSq(sx, sy, body.position.x, body.position.y);
    if (d2 < bestD) { bestD = d2; best = body; }
  }
  return best;
}

function tryChainLightning(sourceEnemy, baseDmg) {
  if (!perkActive("chain")) return;
  if (Math.random() >= CHAIN_CHANCE) return;
  const sx = sourceEnemy.position.x, sy = sourceEnemy.position.y;
  let best = null, bestD = CHAIN_RANGE * CHAIN_RANGE;
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy || body === sourceEnemy) continue;
    const d2 = distSq(sx, sy, body.position.x, body.position.y);
    if (d2 < bestD) { bestD = d2; best = body; }
  }
  if (!best) return;
  const dmg = Math.max(1, Math.floor(baseDmg * 0.5));
  _pending.enemyHit.push({ enemy: best, damage: dmg, crit: false });
  applyStatusOnHit(best);
  _chainFx.push({ ax: sx, ay: sy,
    bx: best.position.x, by: best.position.y, life: 8 });
}

function updateChainFx() {
  const kept = [];
  for (const fx of _chainFx) if (--fx.life > 0) kept.push(fx);
  _chainFx = kept;
}

// ── Deaths ──────────────────────────────────────────────────────────────
function killEnemy(enemy) {
  if (!enemy.space) return;
  const boss = enemy.userData._kind === "boss";
  const x = enemy.position.x, y = enemy.position.y;
  enemy.space = null;
  if (perkActive("bloodthirst")) {
    _playerHP = Math.min(PLAYER_MAX_HP, _playerHP + 3);
  }
  // Bosses always leave a little first aid; regular foes drop occasionally.
  if (boss) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      dropHeart(x + Math.cos(a) * 26, y + Math.sin(a) * 26);
    }
  } else if (Math.random() < HEART_DROP_CHANCE) {
    dropHeart(x, y);
  }
  shake(boss ? 14 : 3, boss ? 0.45 : 0.1);
}

// ── Deferred queue drain ───────────────────────────────────────────────────
function processPending() {
  for (const { enemy, damage } of _pending.enemyHit) {
    if (!enemy.space) continue;
    enemy.userData._hp -= damage;
    enemy.userData._hitFlash = 4;
    if (enemy.userData._hp <= 0) killEnemy(enemy);
  }
  _pending.enemyHit.length = 0;

  for (const bullet of _pending.removeBullet) {
    if (bullet.space) bullet.space = null;
  }
  _pending.removeBullet.length = 0;

  for (const { bullet, nx, ny } of _pending.bounce) {
    if (!bullet.space) continue;
    // Reflect velocity about the contact normal: r = v - 2(v·n)n.
    const vx = bullet.velocity.x, vy = bullet.velocity.y;
    const dot = vx * nx + vy * ny;
    const rx = vx - 2 * dot * nx;
    const ry = vy - 2 * dot * ny;
    bullet.velocity = new Vec2(rx, ry);
    // Nudge off the wall along the reflected direction so it doesn't re-hit.
    const rl = Math.hypot(rx, ry) || 1;
    bullet.position = new Vec2(
      bullet.position.x + (rx / rl) * 6,
      bullet.position.y + (ry / rl) * 6,
    );
    // Refresh life on every bounce so a ricochet bullet gets a full extra
    // second of travel time per bounce instead of ageing out mid-arc.
    bullet.userData._life = 90;
    bullet.userData._hits.clear(); // can hit previously-passed enemies again
  }
  _pending.bounce.length = 0;

  // Ricochet: retarget the bullet toward the next enemy at the current speed.
  for (const { bullet, target } of _pending.ricochetRedirect) {
    if (!bullet.space || !target.space) continue;
    const dx = target.position.x - bullet.position.x;
    const dy = target.position.y - bullet.position.y;
    const dd = Math.hypot(dx, dy) || 1;
    const speed = Math.hypot(bullet.velocity.x, bullet.velocity.y) || 620;
    bullet.velocity = new Vec2((dx / dd) * speed, (dy / dd) * speed);
    bullet.rotation = Math.atan2(dy, dx);
    bullet.userData._life = 90;
  }
  _pending.ricochetRedirect.length = 0;

  // Dedupe per frame — a pierce bullet passing through several enemies pushes
  // itself onto the queue once per hit but should only detonate once at each
  // physical impact frame. (We process the queue at frame boundaries anyway,
  // so the same bullet at the same frame only needs one explosion FX + AoE
  // regardless of how many hits it accumulated.)
  const detonated = new Set();
  for (const bullet of _pending.aoeDetonate) {
    if (!bullet.space || detonated.has(bullet)) continue;
    detonated.add(bullet);
    const ud = bullet.userData;
    // Keep the bullet alive if it still has pierce/ricochet routing to do —
    // the enemy-BEGIN handler will have queued the redirect / decremented
    // pierce this same frame. Only wall detonations (marked `_wallDetonate`)
    // and terminal blast hits actually despawn.
    const keepAlive = !ud._wallDetonate && (ud._pierceLeft > 0 || ud._enemyBounceLeft > 0);
    explodeBullet(bullet, keepAlive);
    ud._wallDetonate = false;
  }
  _pending.aoeDetonate.length = 0;

  if (_pending.playerHit.length > 0 && _player?.space && _playerInvuln <= 0 && !_gameOver) {
    let dmg = 0;
    for (const { damage } of _pending.playerHit) dmg += damage;
    _playerHP -= dmg;
    _playerInvuln = PLAYER_INVULN_FRAMES;
    shake(6, 0.22);
    if (_playerHP <= 0) {
      _playerHP = 0;
      _gameOver = true;
      shake(12, 0.5);
    }
  }
  _pending.playerHit.length = 0;
}

// ── Rooms ──────────────────────────────────────────────────────────────────

// Return the center point of the door on the given wall side.
function doorCenter(side) {
  const arenaTop = HUD_H;
  const midX = SCREEN_W / 2;
  const midY = (arenaTop + SCREEN_H) / 2;
  if (side === "top") return { x: midX, y: arenaTop + PLAYER_R + 6 };
  if (side === "bottom") return { x: midX, y: SCREEN_H - PLAYER_R - 6 };
  if (side === "left") return { x: PLAYER_R + 6, y: midY };
  return { x: SCREEN_W - PLAYER_R - 6, y: midY };  // right
}

function oppositeSide(side) {
  if (side === "top") return "bottom";
  if (side === "bottom") return "top";
  if (side === "left") return "right";
  return "left";
}

// Called after the perk draft closes. Picks a random wall side and marks the
// room in "door" phase; the step-loop watches for the player to walk into it.
// Also sweeps stray leftovers (enemy bullets that were mid-flight when the
// last enemy died, any lingering player bullets, all hazards) so the arena
// is quiet while the player walks to the exit.
function openDoor() {
  const sides = ["top", "right", "bottom", "left"];
  _doorSide = sides[Math.floor(Math.random() * sides.length)];
  _transitionPhase = "door";
  _fadeT = 0;
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (ud?._playerBullet || ud?._enemyBullet) body.space = null;
  }
  clearHazards();
  _hearts = [];
}

// Drive the between-room transition. The player position moves at physics
// pace during "door" (they walk to the exit); the fade legs freeze input via
// _transitionPhase !== null being read by applyPlayerVelocity/spawnForRoom.
function updateTransition(space) {
  if (_transitionPhase === "door") {
    if (!_player?.space) return;
    const c = doorCenter(_doorSide);
    const dx = _player.position.x - c.x;
    const dy = _player.position.y - c.y;
    if (dx * dx + dy * dy < DOOR_TRIGGER_DIST * DOOR_TRIGGER_DIST) {
      _transitionPhase = "fade-out";
      _fadeT = 0;
    }
    return;
  }
  if (_transitionPhase === "fade-out") {
    _fadeT = Math.min(1, _fadeT + 1 / FADE_FRAMES);
    if (_fadeT >= 1) {
      // Sweep the arena and warp the hero to the opposite wall of the next room.
      clearTransientBodies(space);
      _hearts = [];
      for (const q in _pending) _pending[q].length = 0;
      _player = spawnPlayer(space);
      const entry = doorCenter(oppositeSide(_doorSide));
      _player.position = new Vec2(entry.x, entry.y);
      _player.velocity = new Vec2(0, 0);
      _playerInvuln = 30;
      _stillFrames = 0;
      _firingHot = false;
      _transitionPhase = "fade-in";
    }
    return;
  }
  if (_transitionPhase === "fade-in") {
    _fadeT = Math.max(0, _fadeT - 1 / FADE_FRAMES);
    if (_fadeT <= 0) {
      _transitionPhase = null;
      _fadeT = 0;
    }
    return;
  }
}

function startRoom() {
  _room++;
  _roomActive = true;
  _bossPending = _room % 5 === 0;
  // Gentler ramp: room 1 = 3 enemies, +1 per room. Boss rooms add one for the boss.
  _toSpawn = 2 + _room + (_bossPending ? 1 : 0);
  // Slower spawn cadence early — ~1.5s in room 1, tightening to ~0.5s deep in.
  _spawnInterval = Math.max(30, 90 - _room * 4);
  _spawnTimer = 40;
  buildHazards(_room);
}

function spawnForRoom() {
  if (_toSpawn <= 0) return;
  if (--_spawnTimer > 0) return;
  _spawnTimer = _spawnInterval;

  if (_bossPending && _toSpawn === 1) {
    spawnEnemy(_space, "boss");
    shake(10, 0.4);
    _bossPending = false;
    _toSpawn = 0;
    return;
  }
  // Difficulty tiers: melee-only for the first couple of rooms, ranged joins
  // at room 3, dashers at room 5. Boss rooms stay melee-heavy for readability.
  const roll = Math.random();
  let kind;
  if (_room % 5 === 0) {
    kind = roll < 0.7 ? "melee" : "ranged";
  } else if (_room <= 2) {
    kind = "melee";
  } else if (_room <= 4) {
    kind = roll < 0.65 ? "melee" : "ranged";
  } else if (roll < 0.45) {
    kind = "melee";
  } else if (roll < 0.75) {
    kind = "ranged";
  } else {
    kind = "dasher";
  }
  spawnEnemy(_space, kind);
  _toSpawn--;
}

function anyEnemyAlive() {
  for (const body of _space.bodies) {
    if (body.userData?._enemy) return true;
  }
  return false;
}

// ── Hazards ────────────────────────────────────────────────────────────────
function makeBlade(pivot) {
  const body = new Body(BodyType.KINEMATIC, new Vec2(pivot.x, pivot.y));
  // No Material on the Polygon (P53 tunneling workaround).
  const shape = new Polygon(Polygon.box(BLADE_HALF_LEN * 2, 12));
  shape.filter = new InteractionFilter(GROUP_WALL, -1);
  body.shapes.add(shape);
  body.cbTypes.add(_cbWall);    // bullets collide with it like a moving wall
  body.cbTypes.add(_cbHazard);  // … and it damages the player on contact
  body.userData._hazardBlade = true;
  body.userData._colorIdx = 3;
  // For a kinematic body, `angularVel` is the value the engine integrates
  // into `rotation` each step. `kinAngVel` (despite its name) does not
  // rotate a kinematic — verified empirically against nape-js.
  body.angularVel = BLADE_ANGVEL;
  body.space = _space;
  return body;
}

function clearHazards() {
  for (const b of _blades) if (b.body.space) b.body.space = null;
  _blades = [];
  _spikes = [];
  _lava = [];
}

// Lay out hazards appropriate for the given room. Difficulty ramps: spikes
// from room 2, sawblades from room 4, lava from room 6, each adding more
// instances deeper in.
function buildHazards(room) {
  clearHazards();
  if (room >= 2) {
    const n = Math.min(SPIKE_SLOTS.length, 2 + Math.floor((room - 2) / 3));
    for (let i = 0; i < n; i++) {
      // Stagger the phase so traps don't all strike on the same frame.
      _spikes.push({ ...SPIKE_SLOTS[i], t: Math.floor((i * SPIKE_CYCLE) / n) });
    }
  }
  if (room >= 4) {
    const n = room >= 8 ? 2 : 1;
    for (let i = 0; i < n; i++) _blades.push({ body: makeBlade(BLADE_SLOTS[i]), pivot: BLADE_SLOTS[i] });
  }
  if (room >= 6) {
    const n = room >= 10 ? 4 : 2;
    for (let i = 0; i < n; i++) _lava.push({ ...LAVA_SLOTS[i] });
  }
}

// Advance spike/lava zones and apply their damage. Sawblade damage is handled
// by the _cbHazard ↔ _cbPlayer collision listener. Player hits go through the
// shared _pending.playerHit queue, so i-frames + shake apply uniformly.
function updateHazards() {
  if (!_player?.space) return;
  const px = _player.position.x, py = _player.position.y;

  for (const s of _spikes) {
    s.t = (s.t + 1) % SPIKE_CYCLE;
    const live = s.t >= SPIKE_STRIKE_AT && s.t < SPIKE_STRIKE_END;
    if (!live) continue;
    const rr = SPIKE_R + PLAYER_R;
    if (distSq(px, py, s.x, s.y) < rr * rr) {
      _pending.playerHit.push({ damage: SPIKE_DAMAGE });
    }
    // On the first live frame, impale any enemy standing on the trap and kick
    // the camera — spikes are an equal-opportunity threat.
    if (s.t === SPIKE_STRIKE_AT) {
      for (const body of _space.bodies) {
        const ud = body.userData;
        if (!ud?._enemy) continue;
        const er = body.shapes.at(0).castCircle.radius;
        const sr = SPIKE_R + er;
        if (distSq(body.position.x, body.position.y, s.x, s.y) < sr * sr) {
          ud._hp -= SPIKE_DAMAGE;
          ud._hitFlash = 4;
          if (ud._hp <= 0) killEnemy(body);
        }
      }
      shake(4, 0.14);
    }
  }

  for (const l of _lava) {
    const rr = LAVA_R + PLAYER_R * 0.5;
    if (distSq(px, py, l.x, l.y) < rr * rr) {
      _pending.playerHit.push({ damage: LAVA_DAMAGE });
    }
  }
}

function clearTransientBodies(space) {
  const toKill = [];
  for (const body of space.bodies) {
    const ud = body.userData;
    if (ud?._enemy || ud?._playerBullet || ud?._enemyBullet || ud?._player) {
      toKill.push(body);
    }
  }
  for (const b of toKill) b.space = null;
}

function resetGame(space) {
  clearTransientBodies(space);
  clearHazards();
  resetPerks();
  _hearts = [];
  _time = 0;
  _orbitalAngle = 0;
  _orbitalLastHit = new WeakMap();
  _chainFx = [];
  _explosionFx = [];
  _player = spawnPlayer(space);
  _playerHP = PLAYER_MAX_HP;
  _playerInvuln = 0;
  _shotCooldown = 0;
  _stillFrames = 0;
  _firingHot = false;
  _room = 0;
  _roomActive = false;
  _transitionPhase = null;
  _fadeT = 0;
  _toSpawn = 0;
  _bossPending = false;
  _gameOver = false;
  _drafting = false;
  _draftChoices = [];
  _hoverCard = -1;
  _muzzle = 0;
  _hintTimer = 240;
  _stickActive = false;
  _stickVec = { x: 0, y: 0 };
  _moveDir.x = 0; _moveDir.y = 0;
  for (const q in _pending) _pending[q].length = 0;
}

// ── Input ──────────────────────────────────────────────────────────────────
function computeMoveDir() {
  if (_stickActive && (_stickVec.x !== 0 || _stickVec.y !== 0)) {
    _moveDir.x = _stickVec.x;
    _moveDir.y = _stickVec.y;
    return;
  }
  let x = 0, y = 0;
  if (_keys["KeyW"] || _keys["ArrowUp"]) y -= 1;
  if (_keys["KeyS"] || _keys["ArrowDown"]) y += 1;
  if (_keys["KeyA"] || _keys["ArrowLeft"]) x -= 1;
  if (_keys["KeyD"] || _keys["ArrowRight"]) x += 1;
  const len = Math.hypot(x, y);
  if (len > 0) { x /= len; y /= len; }
  _moveDir.x = x;
  _moveDir.y = y;
}

function applyPlayerVelocity() {
  if (!_player?.space) return;
  const sp = playerSpeed();
  const tvx = _moveDir.x * sp;
  const tvy = _moveDir.y * sp;
  const vx = _player.velocity.x, vy = _player.velocity.y;
  const blend = 0.35;
  _player.velocity = new Vec2(vx + (tvx - vx) * blend, vy + (tvy - vy) * blend);
}

function inStickZone(x, y) {
  return x <= STICK_ZONE_W && y >= STICK_ZONE_Y;
}

// ── Draft layout (screen space; camX is 0 so click coords match) ───────────
function draftCardRects() {
  const cardW = 200, cardH = 230, gap = 28;
  const total = cardW * 3 + gap * 2;
  const x0 = (SCREEN_W - total) / 2;
  const y0 = (SCREEN_H - cardH) / 2 + 10;
  const rects = [];
  for (let i = 0; i < 3; i++) {
    rects.push({ x: x0 + i * (cardW + gap), y: y0, w: cardW, h: cardH });
  }
  return rects;
}

function pickDraft(x, y) {
  const rects = draftCardRects();
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      applyPerk(_draftChoices[i]);
      _drafting = false;
      _draftChoices = [];
      _hoverCard = -1;
      // Only open the exit door if the room is actually cleared.
      if (!_roomActive) openDoor();
      shake(4, 0.15);
      return;
    }
  }
}

// ── Rendering ──────────────────────────────────────────────────────────────
function drawHpBar(ctx, body) {
  const ud = body.userData;
  if (ud._hp >= ud._maxHp) return;
  const r = body.shapes.at(0).castCircle.radius;
  const x = body.position.x, y = body.position.y - r - 6;
  const w = Math.max(16, r * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - w / 2, y, w, 3);
  ctx.fillStyle = ud._kind === "boss" ? "#d29922" : "#3fb950";
  ctx.fillRect(x - w / 2, y, w * Math.max(0, ud._hp / ud._maxHp), 3);
}

function drawSpikeTeeth(ctx, x, y) {
  ctx.fillStyle = "#d0d7de";
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const ox = Math.cos(a), oy = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(x + oy * 4, y - ox * 4);
    ctx.lineTo(x + ox * SPIKE_R, y + oy * SPIKE_R);
    ctx.lineTo(x - oy * 4, y + ox * 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#f85149";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHazards(ctx) {
  // Lava pools — translucent, gently flickering.
  for (const l of _lava) {
    const flick = 0.5 + 0.5 * Math.sin(_time * 0.12 + l.x);
    ctx.beginPath();
    ctx.arc(l.x, l.y, LAVA_R, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,${(90 + flick * 60) | 0},40,0.30)`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,140,40,0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Spike traps — base plate, a warn ring while telegraphing, teeth when live.
  for (const s of _spikes) {
    const live = s.t >= SPIKE_STRIKE_AT && s.t < SPIKE_STRIKE_END;
    const warn = s.t >= SPIKE_WARN_AT && !live;
    ctx.beginPath();
    ctx.arc(s.x, s.y, SPIKE_R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(48,54,61,0.7)";
    ctx.fill();
    ctx.strokeStyle = "rgba(110,118,129,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (warn) {
      const p = (s.t - SPIKE_WARN_AT) / (SPIKE_STRIKE_AT - SPIKE_WARN_AT);
      ctx.beginPath();
      ctx.arc(s.x, s.y, SPIKE_R * (0.5 + 0.5 * p), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(248,81,73,${0.3 + 0.55 * p})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (live) drawSpikeTeeth(ctx, s.x, s.y);
  }

  // Sawblades — the body is drawn by the engine; overlay a red danger bar +
  // hub so the spinning threat reads clearly.
  for (const b of _blades) {
    const body = b.body;
    if (!body.space) continue;
    const a = body.rotation;
    const ex = Math.cos(a) * BLADE_HALF_LEN, ey = Math.sin(a) * BLADE_HALF_LEN;
    ctx.beginPath();
    ctx.moveTo(body.position.x - ex, body.position.y - ey);
    ctx.lineTo(body.position.x + ex, body.position.y + ey);
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.arc(b.pivot.x, b.pivot.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#30363d";
    ctx.fill();
    ctx.strokeStyle = "#8b949e";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawHearts(ctx) {
  for (const hbody of _hearts) {
    // Fade-blink in the last ~1.3s of life.
    if (hbody.life < 80 && Math.floor(hbody.life / 6) % 2 === 0) continue;
    const x = hbody.x, y = hbody.y;
    const r = HEART_R * (1 + Math.sin(_time * 0.15) * 0.08);
    const top = y - r * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, top + r * 0.3);
    ctx.bezierCurveTo(x, top, x - r, top, x - r, top + r * 0.45);
    ctx.bezierCurveTo(x - r, top + r, x, top + r * 1.2, x, y + r * 0.85);
    ctx.bezierCurveTo(x, top + r * 1.2, x + r, top + r, x + r, top + r * 0.45);
    ctx.bezierCurveTo(x + r, top, x, top, x, top + r * 0.3);
    ctx.closePath();
    ctx.fillStyle = "#f85149";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawEnemyExtras(ctx) {
  for (const body of _space.bodies) {
    const ud = body.userData;
    if (!ud?._enemy) continue;
    const r = body.shapes.at(0).castCircle.radius;
    const x = body.position.x, y = body.position.y;
    // Charge telegraph.
    if (ud._chargeTimer > 0) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#f85149";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Hit flash.
    if (ud._hitFlash > 0) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
    }
    // Frozen halo.
    if (ud._frozenUntil && _time <= ud._frozenUntil) {
      ctx.beginPath();
      ctx.arc(x, y, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120,180,255,0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Poison bubbles.
    if (ud._poisonUntil && _time <= ud._poisonUntil) {
      const p = ((_time * 0.15) + (x + y) * 0.01) % 1;
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r - p * 8, 2, 0, Math.PI * 2);
      ctx.arc(x + r * 0.4, y - r - ((p + 0.5) % 1) * 8, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(63,185,80,0.85)";
      ctx.fill();
    }
    drawHpBar(ctx, body);
  }
}

function drawOrbitals(ctx) {
  const blades = orbitalPositions();
  if (blades.length === 0) return;
  ctx.save();
  for (const b of blades) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, ORBITAL_HIT_R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(88,166,255,0.28)";
    ctx.fill();
    ctx.strokeStyle = "#58a6ff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawChainFx(ctx) {
  if (_chainFx.length === 0) return;
  ctx.save();
  ctx.strokeStyle = "#f2cc60";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const fx of _chainFx) {
    const a = Math.max(0, fx.life / 8);
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(fx.ax, fx.ay);
    ctx.lineTo(fx.bx, fx.by);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExplosionFx(ctx) {
  if (_explosionFx.length === 0) return;
  ctx.save();
  for (const fx of _explosionFx) {
    // Expanding ring: radius grows to EX_RADIUS over lifetime, alpha fades.
    const t = 1 - fx.life / fx.maxLife;      // 0..1
    const r = fx.r * (0.35 + t * 0.65);
    const alpha = 1 - t;
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = "rgba(210,153,34,0.35)"; // gold, matches explosive bullet
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#f2cc60";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerRing(ctx) {
  if (!_player?.space) return;
  const x = _player.position.x, y = _player.position.y;
  // HP ring.
  const pct = _playerHP / PLAYER_MAX_HP;
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.strokeStyle = _playerHP <= 25 ? "#f85149" : "#58a6ff";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Firing state: green dot when hot (standing still, weapon online),
  // hollow when moving (weapon cold).
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  if (_firingHot) {
    ctx.fillStyle = "#3fb950";
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Muzzle flash.
  if (_muzzle > 0) {
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R + 7, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(88,166,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Invuln flash.
  if (_playerInvuln > 0 && Math.floor(_playerInvuln / 3) % 2 === 0) {
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_R + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
  }
}

function drawAimLine(ctx) {
  if (!_player?.space || _gameOver || _drafting) return;
  const target = findNearestEnemy();
  if (!target) return;
  ctx.beginPath();
  ctx.moveTo(_player.position.x, _player.position.y);
  ctx.lineTo(target.position.x, target.position.y);
  ctx.strokeStyle = _firingHot ? "rgba(63,185,80,0.30)" : "rgba(255,255,255,0.12)";
  ctx.setLineDash([3, 5]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTopHUD(ctx) {
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(0, 0, SCREEN_W, HUD_H);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "13px system-ui, sans-serif";

  ctx.fillStyle = _room % 5 === 0 && _roomActive ? "#d29922" : "#c9d1d9";
  ctx.fillText(`Room ${_room}`, 12, HUD_H / 2);

  ctx.fillStyle = _playerHP <= 25 ? "#f85149" : "#3fb950";
  ctx.fillText(`HP ${Math.ceil(_playerHP)}`, 96, HUD_H / 2);

  // Perk ribbon — show owned perks as icon chips.
  let cx = 170;
  for (const def of PERK_DEFS) {
    const n = perkCount(def.id);
    if (n <= 0) continue;
    const label = def.max > 1 ? `${def.icon}${n}` : def.icon;
    ctx.font = "12px system-ui, sans-serif";
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = "rgba(88,166,255,0.18)";
    ctx.fillRect(cx, 6, w, HUD_H - 12);
    ctx.fillStyle = "#58a6ff";
    ctx.fillText(label, cx + 6, HUD_H / 2);
    cx += w + 5;
    if (cx > SCREEN_W - 150) break;
  }

  // Right side: room status.
  ctx.textAlign = "right";
  ctx.font = "13px system-ui, sans-serif";
  if (_transitionPhase === "door" && !_gameOver) {
    const next = _room + 1;
    const label = next % 5 === 0 ? "BOSS DOOR →" : "Reach the door →";
    ctx.fillStyle = next % 5 === 0 ? "#f85149" : "rgba(255,255,255,0.7)";
    ctx.fillText(label, SCREEN_W - 12, HUD_H / 2);
  } else if (_roomActive && _room % 5 === 0) {
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("⚠ BOSS", SCREEN_W - 12, HUD_H / 2);
  }
}

function drawHint(ctx) {
  if (_hintTimer <= 0 || _gameOver || _drafting) return;
  const a = Math.min(1, _hintTimer / 60);
  ctx.globalAlpha = a;
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STAND STILL TO FIRE", SCREEN_W / 2, SCREEN_H / 2 - 12);
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Move to dodge — your weapon goes cold while moving",
    SCREEN_W / 2, SCREEN_H / 2 + 14);
  ctx.globalAlpha = 1;
}

function drawDraft(ctx) {
  if (!_drafting) return;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ROOM CLEARED — CHOOSE A PERK", SCREEN_W / 2, 96);

  const rects = draftCardRects();
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const perk = _draftChoices[i];
    const owned = perk.id !== "_heal" ? perkCount(perk.id) : 0;
    const hot = _hoverCard === i;
    ctx.fillStyle = hot ? "rgba(88,166,255,0.22)" : "rgba(22,27,34,0.95)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = hot ? "#58a6ff" : "#30363d";
    ctx.lineWidth = hot ? 3 : 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    const cx = r.x + r.w / 2;
    ctx.fillStyle = "#58a6ff";
    ctx.font = "54px system-ui, sans-serif";
    ctx.fillText(perk.icon, cx, r.y + 70);

    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 17px system-ui, sans-serif";
    ctx.fillText(perk.label, cx, r.y + 130);

    ctx.fillStyle = "rgba(201,209,217,0.85)";
    ctx.font = "13px system-ui, sans-serif";
    // Wrap the description to the card width.
    wrapText(ctx, perk.desc, cx, r.y + 162, r.w - 24, 18);

    if (owned > 0) {
      ctx.fillStyle = "#3fb950";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(`owned ×${owned}`, cx, r.y + r.h - 22);
    }
  }
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, y + i * lineH);
  }
}

function drawJoystick(ctx) {
  if (!_isTouch) return;
  if (!_stickActive) {
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

// Draw the exit door + arrow on the wall opening. Purely visual — the walls
// don't actually open, since a moving hero touching the frame would already
// be within DOOR_TRIGGER_DIST of the center and trigger the fade.
function drawDoor(ctx) {
  if (_transitionPhase !== "door") return;
  const c = doorCenter(_doorSide);
  const boss = (_room + 1) % 5 === 0;
  const fill = boss ? "rgba(248,81,73,0.20)" : "rgba(63,185,80,0.20)";
  const stroke = boss ? "#f85149" : "#3fb950";
  const vertical = _doorSide === "left" || _doorSide === "right";
  const w = vertical ? 14 : DOOR_HALF_W * 2;
  const h = vertical ? DOOR_HALF_W * 2 : 14;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(c.x - w / 2, c.y - h / 2, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x - w / 2, c.y - h / 2, w, h);

  // Pulsing arrow points into the room from the door (so the player reads
  // "walk this way"). Beat is ~1s.
  const pulse = 0.5 + 0.5 * Math.sin(_time * 0.15);
  ctx.globalAlpha = 0.5 + pulse * 0.5;
  ctx.fillStyle = stroke;
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glyph =
    _doorSide === "top" ? "↑" :
    _doorSide === "bottom" ? "↓" :
    _doorSide === "left" ? "←" : "→";
  const ax =
    _doorSide === "left" ? c.x - 22 :
    _doorSide === "right" ? c.x + 22 : c.x;
  const ay =
    _doorSide === "top" ? c.y - 22 :
    _doorSide === "bottom" ? c.y + 22 : c.y;
  ctx.fillText(glyph, ax, ay);
  ctx.restore();
}

// Full-screen fade during a room transition. Rendered on top of everything
// including the HUD so the whole viewport goes black between rooms.
function drawFade(ctx) {
  if (_fadeT <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${_fadeT})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.restore();
}

function drawGameOver(ctx) {
  if (!_gameOver) return;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = "#f85149";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Defeated", SCREEN_W / 2, SCREEN_H / 2 - 18);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillText(`Reached room ${_room}`, SCREEN_W / 2, SCREEN_H / 2 + 12);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText("Click / tap to start a new run", SCREEN_W / 2, SCREEN_H / 2 + 38);
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "standoff",
  label: "Standoff",
  tags: ["Gameplay", "Roguelite", "Callbacks", "Kinematic", "Camera shake", "Mobile"],
  featured: false,
  desc:
    "A top-down <b>stand-still-to-shoot</b> roguelite. Your hero auto-fires at the nearest foe <b>only while standing still</b> — the instant you move, the weapon goes cold, so each fight is stop-shoot-dodge. Clear every enemy in a room and <b>draft one of three permanent perks</b> that stack for the whole run: extra arrow directions (<b>front</b>, <b>side</b>, <b>rear</b>, <b>diagonal</b>), routing (<b>piercing</b>, <b>wall ricochet</b>, enemy-to-enemy <b>ricochet</b>), payload (<b>explosive shot</b>, <b>bolt</b> chain lightning, <b>freeze</b>, <b>poison</b>), companions (<b>spirit</b> orbs), and stats (crit, damage, speed, bloodthirst, quickdraw). Cleared rooms open a random-wall <b>exit door</b>; walking into it fades to the next arena. <b>Melee</b> rush with charges, <b>ranged</b> kite and snipe, <b>dashers</b> blink in, and every 5th room is a <b>boss</b> with shotguns and bullet rings. Deeper rooms add <b>active hazards</b>: telegraphed <b>spike traps</b>, <b>lava pools</b>, and spinning <b>sawblades</b> (kinematic bars that sweep the arena and block shots). Fallen enemies sometimes drop a <b>healing heart</b> — walk over it while wounded to patch up. Move with <b>WASD</b> / arrows or the bottom-left virtual stick. <b>Camera shake</b> on every kill, hit, trap, and boss slam.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    _runnerRef = this._runner ?? null;
    space.gravity = new Vec2(0, 0);

    _cbPlayer = new CbType();
    _cbEnemy = new CbType();
    _cbPlayerBullet = new CbType();
    _cbEnemyBullet = new CbType();
    _cbWall = new CbType();
    _cbHazard = new CbType();

    buildArena(space);
    resetGame(space);

    _isTouch = typeof window !== "undefined" && (
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );

    // Piercing / Ricochet bullets should pass through enemies without being
    // physically deflected — the BEGIN callback still fires for damage +
    // routing (pierce, ricochet redirect), but Nape's own collision
    // resolution is skipped so the bullet keeps flying.
    space.listeners.add(new PreListener(
      InteractionType.COLLISION, _cbPlayerBullet, _cbEnemy,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._playerBullet ? b1 : b2;
        const ud = bullet?.userData;
        if (ud && (ud._pierceLeft > 0 || ud._enemyBounceLeft > 0)) {
          return PreFlag.IGNORE;
        }
        return PreFlag.ACCEPT;
      },
    ));

    // Wall Ricochet bullets: we compute the reflection ourselves in _pending.bounce.
    // Suppress Nape's own resolution — otherwise Nape drains the bullet's
    // velocity before our reflect step runs, and the bullet slides through
    // the wall instead of bouncing back.
    space.listeners.add(new PreListener(
      InteractionType.COLLISION, _cbPlayerBullet, _cbWall,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._playerBullet ? b1 : b2;
        if (bullet?.userData?._bounceLeft > 0) return PreFlag.IGNORE;
        return PreFlag.ACCEPT;
      },
    ));

    // Player bullet hits enemy → damage, apply status, then combo-route:
    // Blast (AoE + FX), Ricochet redirect, Piercing carry-through, or remove.
    // Blast no longer eats the bullet: the arrow explodes at the impact and
    // still pierces or ricochets onward if those perks are active, matching
    // Archero's "Blast + Piercing" / "Blast + Ricochet" stacking.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayerBullet, _cbEnemy,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        if (!b1 || !b2) return;
        const bullet = b1.userData?._playerBullet ? b1 : b2;
        const enemy = b1.userData?._enemy ? b1 : b2;
        if (!bullet.space || !enemy.space) return;
        const ud = bullet.userData;
        if (ud._hits.has(enemy)) return;   // already pierced this one
        ud._hits.add(enemy);

        // Direct damage + status always applies on a fresh enemy contact.
        _pending.enemyHit.push({ enemy, damage: ud._damage });
        applyStatusOnHit(enemy);
        tryChainLightning(enemy, ud._damage);

        // Blast: fire the AOE at the impact point. Do NOT despawn the bullet
        // here — the combo routing below decides whether it keeps flying.
        if (ud._explosive) _pending.aoeDetonate.push(bullet);

        // Ricochet has priority over piercing when both are present.
        if (ud._enemyBounceLeft > 0) {
          const next = findRicochetTarget(bullet, enemy);
          if (next) {
            ud._enemyBounceLeft--;
            _pending.ricochetRedirect.push({ bullet, target: next });
            return;
          }
          // No other enemy reachable — fall through to pierce/remove.
        }
        if (ud._pierceLeft > 0) {
          ud._pierceLeft--;
        } else if (!ud._spent) {
          ud._spent = true;
          _pending.removeBullet.push(bullet);
        }
      },
    ));

    // Player bullet hits wall → bounce (ricochet), explode, or remove.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayerBullet, _cbWall,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._playerBullet ? b1
                     : b2?.userData?._playerBullet ? b2 : null;
        if (!bullet?.space) return;
        const ud = bullet.userData;
        // Ricochet takes priority on walls even for explosive bullets — only
        // detonate on wall impact once all bounces are used up. Explosive
        // still detonates on enemy contact (see bullet↔enemy listener).
        if (ud._bounceLeft > 0) {
          const n = firstCollisionNormal(cb, bullet);
          if (n) {
            ud._bounceLeft--;
            _pending.bounce.push({ bullet, nx: n.x, ny: n.y });
          } else if (!ud._spent) {
            ud._spent = true;
            _pending.removeBullet.push(bullet);
          }
          return;
        }
        if (ud._explosive) {
          // Explode on the terminal wall contact and mark it so the aoeDetonate
          // loop despawns the bullet even if pierce/ricochet counters exist.
          if (!ud._spent) {
            ud._spent = true;
            ud._wallDetonate = true;
            _pending.aoeDetonate.push(bullet);
          }
          return;
        }
        if (!ud._spent) {
          ud._spent = true;
          _pending.removeBullet.push(bullet);
        }
      },
    ));

    // Enemy bullet hits player → damage.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbEnemyBullet, _cbPlayer,
      (cb) => {
        const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
        const bullet = b1?.userData?._enemyBullet ? b1
                     : b2?.userData?._enemyBullet ? b2 : null;
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
        const bullet = b1?.userData?._enemyBullet ? b1
                     : b2?.userData?._enemyBullet ? b2 : null;
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

    // Sawblade sweeps into the player → damage (i-frames cap the rate).
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbHazard, _cbPlayer,
      () => {
        if (_player?.space) _pending.playerHit.push({ damage: BLADE_DAMAGE });
      },
    ));

    // Keyboard — window-scoped. Remove any stale handlers from a previous
    // load first (the runner doesn't call a teardown hook), then re-bind.
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    _onKeyDown = (e) => { if (_space) _keys[e.code] = true; };
    _onKeyUp = (e) => { if (_space) _keys[e.code] = false; };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  step(space) {
    if (!_runnerRef) _runnerRef = this._runner ?? null;
    if (_hintTimer > 0) _hintTimer--;
    if (_muzzle > 0) _muzzle--;

    if (_gameOver) {
      processPending();
      return;
    }

    // While drafting, freeze the action: drain damage but pin everything in
    // place so the choice is made on a still battlefield.
    if (_drafting) {
      for (const body of space.bodies) {
        if (body.isDynamic()) body.velocity = new Vec2(0, 0);
      }
      return;
    }

    _time++;
    processPending();
    computeMoveDir();
    applyPlayerVelocity();
    steerEnemies();
    updateHazards();
    updateHearts();
    updateOrbitals();
    updateStatusEffects();
    updateChainFx();
    updateExplosionFx();

    if (_playerInvuln > 0) _playerInvuln--;

    // Stand-still firing rule: the hero must hold position before the weapon
    // comes online; moving immediately resets it.
    const moving = _moveDir.x !== 0 || _moveDir.y !== 0;
    if (moving) {
      _stillFrames = 0;
      _firingHot = false;
    } else {
      _stillFrames++;
      _firingHot = _stillFrames >= stillDelay();
    }

    if (_shotCooldown > 0) _shotCooldown--;
    if (_firingHot && _shotCooldown <= 0 && _player?.space && !_transitionPhase) {
      if (firePlayerShot()) _shotCooldown = shotCooldown();
    }

    // Room flow.
    if (!_roomActive) {
      if (_transitionPhase == null && !_drafting) startRoom();
      else updateTransition(space);
    } else {
      spawnForRoom();
      if (_toSpawn <= 0 && !anyEnemyAlive()) {
        _roomActive = false;
        // Sweep leftover projectiles + hazards so the arena is quiet during
        // the draft. The drafting freeze below zeroes remaining velocities
        // for cosmetic consistency, but there should be nothing to freeze.
        for (const body of space.bodies) {
          const ud = body.userData;
          if (ud?._playerBullet || ud?._enemyBullet) body.space = null;
        }
        clearHazards();
        // Offer a perk draft, then a short breather before the next room.
        _drafting = true;
        _draftChoices = rollDraft();
        _hoverCard = -1;
      }
    }

    // Age bullets.
    const expired = [];
    for (const body of space.bodies) {
      const ud = body.userData;
      if (!ud) continue;
      if (ud._playerBullet || ud._enemyBullet) {
        if (--ud._life <= 0) expired.push(body);
      }
    }
    for (const b of expired) b.space = null;
  },

  click(x, y, space) {
    if (_gameOver) { resetGame(space); return; }
    if (_drafting) { pickDraft(x, y); return; }
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

  hover(x, y) {
    if (!_drafting) { _hoverCard = -1; return; }
    const rects = draftCardRects();
    _hoverCard = -1;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        _hoverCard = i;
        break;
      }
    }
  },

  render3dOverlay(ctx, space, w, h, camX = 0, camY = 0) {
    // World-space layer — translate by the camera (which includes the shake
    // offset) so these overlays stay glued to the shaking bodies.
    ctx.save();
    ctx.translate(-camX, -camY);
    drawHazards(ctx);
    drawHearts(ctx);
    drawAimLine(ctx);
    drawEnemyExtras(ctx);
    drawPlayerRing(ctx);
    drawOrbitals(ctx);
    drawChainFx(ctx);
    drawExplosionFx(ctx);
    drawDoor(ctx);
    ctx.restore();

    // Screen-space HUD — unaffected by camera shake.
    drawHint(ctx);
    drawJoystick(ctx);
    drawTopHUD(ctx);
    drawDraft(ctx);
    drawGameOver(ctx);
    drawFade(ctx);
  },
};
