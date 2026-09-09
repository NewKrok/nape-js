import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.42.1";
import { drawBody } from "../renderer.js?v=3.42.1";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.1";
import { createBoardMaterial } from "../renderers/lowpoly-characters.js?v=3.42.1";

// ── Blade Waltz — a Tales-style linear-motion arena gauntlet ──────────────
//
// A JRPG action-battle slice in the spirit of the "linear motion battle
// system": a round battlefield, a party of four, real-time combat with
// normal-attack combos, TP-fuelled artes, guarding, a charging Overlimit
// gauge and a screen-filling Mystic Arte — against ten waves of increasingly
// nasty monsters, the fifth and ninth headed by an ogre and the tenth by a
// drake. You control the swordsman only; the lancer, the archer and the sage
// are AI party members with their own kits (the sage casts heals, revives
// and spells with interruptible cast times, the archer kites, the lancer
// brawls). Every combatant always has a target, and the camera in 3D mode
// frames the player–target line side-on the way the Tales games do.
//
// Physics: every combatant is a dynamic puck in a zero-gravity Space bounded
// by a ring of static wall segments. Melee is resolved by hand from arcs;
// arrows, bolts, fireballs and ground waves are sensor bodies whose hits are
// delivered by InteractionListeners, with side filtering done entirely by
// sensor groups and masks. Knockback is real velocity, launches are a
// cosmetic height channel on top of the puck.
//
// 3D: a tilted chase camera over a stone arena in a meadow — pillars, torches,
// trees, mountains, a sky dome — with a purpose-built jointed low-poly rig
// (elbows, knees, capes, weapons) for the humans, and bespoke rigs for
// slimes, wolves, golems, wisps, ogres and the drake. Slash trails, spell
// circles, hit sparks and the Mystic Arte are meshes; HP bars and damage
// numbers are projected onto the overlay.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;

// The arena is a circle about the origin. The 2D camera and the 3D chase
// camera both follow the fight, so the world does not need to fit the view.
const ARENA_R = 290;
const WALL_SEGS = 36;
const WALL_T = 26;

// ── Collision filtering ───────────────────────────────────────────────────
// Collision bits decide who bumps; sensor bits decide who a projectile can
// hit. Side membership lives in the sensor bits, so a projectile just masks
// out its own side and friendly fire never reaches a handler.
const G_UNIT = 1 << 1;
const G_WALL = 1 << 2;
const G_PROJ = 1 << 3;
const S_SIDE = [1 << 4, 1 << 5];      // 0 = party, 1 = monsters
const S_WALL = 1 << 6;

// ── Timing (frames at 60 Hz) ──────────────────────────────────────────────
const WAVE_BANNER_FRAMES = 110;
const CLEAR_FRAMES = 170;
const SPAWN_IN_FRAMES = 36;
const KO_REVIVE_WINDOW = 9 * 60;      // the player has this long to be raised
const OVERLIMIT_FRAMES = 8 * 60;
const MYSTIC_FRAMES = 78;             // cinematic hold
const RESULT_LOCK = 50;
const TP_REGEN_EVERY = 20;            // +1 TP while not casting/attacking
const COMBO_DROP = 60;                // the player's hit counter resets after this many idle frames

// ── Movement ──────────────────────────────────────────────────────────────
const UNIT_R = 14;
const CONTROL_BLEND = 0.26;
const DRAG = 0.86;
const STUN_DRAG = 0.9;
const AIR_GRAVITY = 720;              // px/s² on the cosmetic height channel

// ── Party ─────────────────────────────────────────────────────────────────
// Four original characters. Index 0 is the player and cannot be switched.
// `rig` feeds the 3D builder; `color` is the 2D/HUD identity colour.
const PARTY_DEFS = [
  {
    id: "rowan", name: "Rowan", cls: "Vanguard", color: 0xd76a7a,
    hp: 560, tp: 100, speed: 196, r: UNIT_R,
    atk: 34,
    rig: {
      kind: "human", weapon: "sword", hair: "long", hairColor: 0x1c1a24, skin: 0xe8b48a,
      coat: 0x4a2c52, trim: 0xd9a441, pants: 0x2a2530, boots: 0x3a2a22, cape: 0x6b2036, scale: 1,
    },
    portrait: "⚔",
  },
  {
    id: "brisa", name: "Brisa", cls: "Lancer", color: 0x4fc3c7,
    hp: 500, tp: 90, speed: 186, r: UNIT_R,
    atk: 26,
    rig: {
      kind: "human", weapon: "lance", hair: "ponytail", hairColor: 0x8a3a1a, skin: 0xe2ad82,
      coat: 0x2f8f8f, trim: 0xe8e2c8, pants: 0x27424a, boots: 0x3d2f26, cape: null, scale: 0.98,
    },
    portrait: "⚚",
  },
  {
    id: "tove", name: "Tove", cls: "Archer", color: 0x9ccc65,
    hp: 400, tp: 110, speed: 200, r: UNIT_R,
    atk: 22,
    rig: {
      kind: "human", weapon: "bow", hair: "short", hairColor: 0xd8b04a, skin: 0xf0c8a0,
      coat: 0x3d7a3a, trim: 0xa9c47a, pants: 0x3a3a2a, boots: 0x4a3a2a, cape: 0x2f5a2f, scale: 0.94,
    },
    portrait: "➶",
  },
  {
    id: "ilse", name: "Ilse", cls: "Sage", color: 0xb39ddb,
    hp: 360, tp: 170, speed: 176, r: UNIT_R,
    atk: 18,
    rig: {
      kind: "human", weapon: "staff", hair: "long", hairColor: 0xd6d9e0, skin: 0xf2d4bc,
      coat: 0xd8d0ee, trim: 0x8a6fd0, pants: 0x9a8fc8, boots: 0x5a4a6a, cape: 0x6a4fb0, scale: 0.95,
    },
    portrait: "✦",
  },
];

// Player artes — chosen by the movement direction held relative to the
// target when the arte button is pressed, the way a Tales arte set works.
//   neutral → Demon Fang   (ground wave projectile)
//   forward → Sonic Thrust (dash + thrust)
//   back    → Tiger Blade  (launching upward slash)
const ARTES = {
  demonFang:   { name: "Demon Fang",   tp: 8,  dmg: 1.9, windup: 8,  active: 4,  recover: 18 },
  sonicThrust: { name: "Sonic Thrust", tp: 10, dmg: 2.4, windup: 6,  active: 10, recover: 16, dash: 150 },
  tigerBlade:  { name: "Tiger Blade",  tp: 14, dmg: 2.8, windup: 9,  active: 8,  recover: 22, launch: 300 },
  // party AI artes
  pierce:      { name: "Piercing Line", tp: 10, dmg: 2.3, windup: 8, active: 10, recover: 18, dash: 130 },
  tripleArrow: { name: "Triple Arrow",  tp: 10, dmg: 1.0, windup: 12, active: 6, recover: 24 },
  firstAid:    { name: "First Aid",  tp: 12, cast: 50,  heal: 170 },
  nurse:       { name: "Nurse",      tp: 26, cast: 95,  heal: 110 },
  raise:       { name: "Raise Dead", tp: 30, cast: 120 },
  fireBall:    { name: "Fire Ball",  tp: 9,  cast: 48,  dmg: 2.6, splash: 46 },
  stoneBlast:  { name: "Stone Blast", tp: 14, cast: 70, dmg: 3.2, radius: 60 },
};
const MYSTIC = { name: "Radiant Waltz", dmg: 12, radius: 170, launch: 420 };

// Normal attack combo — three swings, the last a full spin. `arc` is the
// half-angle of the swing, `reach` the distance past the puck it hits.
const COMBO = [
  { windup: 5, active: 5, recover: 12, arc: 1.0, reach: 46, dmg: 1.0, knock: 90 },
  { windup: 5, active: 5, recover: 12, arc: 1.1, reach: 48, dmg: 1.15, knock: 110 },
  { windup: 7, active: 6, recover: 18, arc: Math.PI, reach: 52, dmg: 1.7, knock: 230 },
];

// ── Monsters ──────────────────────────────────────────────────────────────
// `poise` is how many hit-stuns a monster shrugs off between staggers (0 =
// staggers on every hit). `flying` monsters hover and are never launched.
const MONSTER_DEFS = {
  slime: {
    name: "Slime", color: 0x5fcf6f, hp: 150, atk: 16, speed: 92, r: 13, poise: 0,
    reach: 30, windup: 22, recover: 30, cd: 80, hopper: true, xp: 1,
  },
  wolf: {
    name: "Dire Wolf", color: 0x7d8290, hp: 220, atk: 22, speed: 236, r: 13, poise: 0,
    reach: 34, windup: 20, recover: 26, cd: 100, lunge: 170, xp: 1,
  },
  bandit: {
    name: "Bandit", color: 0x9a6a3a, hp: 280, atk: 26, speed: 156, r: 14, poise: 1,
    reach: 40, windup: 16, recover: 22, cd: 74, guards: true, xp: 1,
  },
  archer: {
    name: "Bandit Archer", color: 0x7a7a4a, hp: 200, atk: 20, speed: 160, r: 13, poise: 0,
    ranged: { min: 190, max: 280, speed: 520 }, windup: 26, recover: 20, cd: 95, xp: 1,
  },
  golem: {
    name: "Stone Golem", color: 0x7a8690, hp: 760, atk: 44, speed: 66, r: 20, poise: 4,
    reach: 62, windup: 42, recover: 44, cd: 150, smash: 64, heavy: true, xp: 2,
  },
  wisp: {
    name: "Wisp", color: 0x7fe9ff, hp: 160, atk: 24, speed: 132, r: 11, poise: 0,
    ranged: { min: 150, max: 230, speed: 400, homing: 0.06 }, windup: 30, recover: 18, cd: 105,
    flying: true, xp: 1,
  },
  ogre: {
    name: "Ogre", color: 0x8a9a52, hp: 1500, atk: 48, speed: 96, r: 24, poise: 6,
    reach: 78, windup: 34, recover: 36, cd: 120, sweep: true, charge: 240, heavy: true, boss: true, xp: 4,
  },
  drake: {
    name: "Ashen Drake", color: 0xb03a3a, hp: 3800, atk: 42, speed: 112, r: 34, poise: 9,
    reach: 96, windup: 30, recover: 34, cd: 96, heavy: true, boss: true, drake: true, xp: 10,
  },
};

// Ten waves. Monster stats scale with the wave on top of the roster growth.
const WAVES = [
  ["slime", "slime", "slime"],
  ["slime", "slime", "wolf", "wolf"],
  ["bandit", "bandit", "bandit", "archer"],
  ["wolf", "wolf", "bandit", "bandit", "archer", "archer"],
  ["ogre", "slime", "slime"],
  ["golem", "golem", "wolf", "wolf", "wolf"],
  ["wisp", "wisp", "bandit", "bandit", "bandit", "archer", "archer"],
  ["golem", "wisp", "wisp", "wolf", "wolf", "wolf", "archer"],
  ["ogre", "wisp", "wisp", "bandit", "bandit", "archer"],
  ["drake"],
];
const WAVE_TITLES = [
  "Meadow Slimes", "The Pack", "Roadside Bandits", "Ambush", "The Ogre",
  "Stone and Fang", "Will-o'-Wisps", "Night Raid", "Warband", "Ashen Drake",
];
function waveHpMul(w) { return 1 + 0.08 * (w - 1); }
function waveAtkMul(w) { return 1 + 0.06 * (w - 1); }
// Global monster tuning on top of the roster values: fights were over before
// they registered, so everything has half again the HP and hits a touch softer.
const MONSTER_HP_MUL = 1.5;
const MONSTER_ATK_MUL = 0.9;

const SIDE_HEX = [0x58a6ff, 0xf85149];
const HUD_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _party = [];            // party records, index 0 = the player
let _monsters = [];         // live monster records
let _corpses = [];          // monsters mid death-animation (body already gone)
let _walls = [];            // { body }
let _projs = [];            // { body, side, dmg, owner, kind, life, r, hits:Set, homing, splash, color }
let _zones = [];            // delayed ground effects { x,y,r,t,T,side,owner,dmg,kind }
let _slashes = [];          // slash arcs for the renderers { x,y,a0,a1,r,t,T,color,z }
let _particles = [];        // { x,y,z,vx,vy,vz,t,life,color,r }
let _floaters = [];         // damage popups { x,y,z,t,text,color,big }
let _rings = [];            // expanding rings { x,y,r,R,t,T,color }
let _unitByBody = new Map();
let _wallByBody = new Map();
let _cbProj = null, _cbUnit = null, _cbWall = null;

let _frame = 0;
let _phase = "title";       // title | banner | fight | cleared | mystic | victory | defeat
let _phaseT = 0;
let _wave = 0;              // 1-based, 0 before the first
let _clock = 0;             // frames of fighting, for the results
let _combo = 0;             // current hit counter (player's team)
let _comboT = 0;
let _maxCombo = 0;
let _totalDamage = 0;
let _kos = 0;
let _retries = 0;
let _lockUntil = 0;
let _hitstop = 0;           // frames the world freezes on a big hit
let _mystic = null;         // { t, caster }
let _isTouch = false;
let _runnerRef = null;
let _autopilot = false;     // harness: drive the player with the lancer brain
let _hintT = 0;

// Input
const _keys = Object.create(null);
let _onKeyDown = null, _onKeyUp = null;
const _pointer = { active: false, x: 0, y: 0, startX: 0, startY: 0, startFrame: 0, steer: false };
const _pressed = { attack: false, arte: false, burst: false, cycle: false };
let _guardHeld = false;
let _touchGuardT = 0;
const TAP_MAX_FRAMES = 14;
const TAP_MAX_DRIFT = 12;
const STEER_DEADZONE = 12;
const BTN = {
  attack: { x: VIEW_W - 62, y: VIEW_H - 124, r: 30, label: "ATK" },
  arte:   { x: VIEW_W - 132, y: VIEW_H - 100, r: 26, label: "ARTE" },
  guard:  { x: VIEW_W - 84, y: VIEW_H - 196, r: 24, label: "GRD" },
  burst:  { x: VIEW_W - 162, y: VIEW_H - 172, r: 24, label: "OL" },
};

// Camera. `_camYaw` is the world-space heading the view looks along; input is
// rotated by it so "up" on the keyboard is always "into the screen".
const _cam2d = { x: 0, y: 0 };
let _camYaw = -Math.PI / 2;           // top-down default: screen-up = world -y
let _camYaw3d = 0.9;                  // smoothed chase-camera heading
let _camDist3d = 360;
const _camFocus = { x: 0, y: 0 };
let _frame3d = -1;                    // last frame the 3D pass rendered
let _camProj = null;                  // THREE camera used by the last 3D pass
let _shakeT = 0;

// ── Helpers ───────────────────────────────────────────────────────────────
function rand(min, max) { return min + Math.random() * (max - min); }
function irand(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }
function hexCss(hex) { return "#" + hex.toString(16).padStart(6, "0"); }
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function player() { return _party[0]; }
function unitX(u) { return u.body.position.x; }
function unitY(u) { return u.body.position.y; }
function dist(a, b) { return Math.hypot(unitX(a) - unitX(b), unitY(a) - unitY(b)); }
function angleTo(a, b) { return Math.atan2(unitY(b) - unitY(a), unitX(b) - unitX(a)); }
function liveMonsters() { return _monsters.filter(m => m.alive && m.spawnT <= 0); }
function liveParty() { return _party.filter(p => p.alive); }
function foesOf(u) { return u.side === 0 ? _monsters.filter(m => m.alive && m.spawnT <= 0) : _party.filter(p => p.alive); }
function shake(amp, dur) { if (_runnerRef) _runnerRef.shakeCamera(amp, dur); _shakeT = Math.max(_shakeT, Math.round(dur * 60)); }

// Keep a point inside the arena with a margin.
function clampToArena(x, y, margin) {
  const d = Math.hypot(x, y);
  const lim = ARENA_R - margin;
  if (d <= lim) return { x, y };
  return { x: x / d * lim, y: y / d * lim };
}

// ── World construction ────────────────────────────────────────────────────
// The ring is 36 static boxes. No explicit Material on any Polygon — dynamic
// bodies against explicit-material Polygons are a known engine trap (P53).
function buildArena(space) {
  _walls = [];
  _wallByBody = new Map();
  const segLen = (2 * Math.PI * (ARENA_R + WALL_T / 2)) / WALL_SEGS + 4;
  for (let i = 0; i < WALL_SEGS; i++) {
    const a = (i / WALL_SEGS) * Math.PI * 2;
    const rr = ARENA_R + WALL_T / 2;
    const b = new Body(BodyType.STATIC, new Vec2(Math.cos(a) * rr, Math.sin(a) * rr));
    b.rotation = a + Math.PI / 2;
    const s = new Polygon(Polygon.box(segLen, WALL_T));
    s.filter = new InteractionFilter(G_WALL, ~0, S_WALL, ~0);
    s.cbTypes.add(_cbWall);
    b.shapes.add(s);
    b.space = space;
    try { b.userData._kind = "wall"; b.userData._hidden3d = true; } catch (_) {}
    const rec = { body: b, angle: a };
    _walls.push(rec);
    _wallByBody.set(b, rec);
  }
}

// ── Units ─────────────────────────────────────────────────────────────────
function makeUnitBody(x, y, r, side) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const shape = new Circle(r, undefined, new Material(0.1, 0.3, 0.3, 1));
  shape.filter = new InteractionFilter(G_UNIT, ~0, S_SIDE[side], ~0);
  shape.cbTypes.add(_cbUnit);
  body.shapes.add(shape);
  body.allowRotation = false;
  try {
    body.userData._hidden3d = true;
    body.userData._colorIdx = side === 0 ? 0 : 3;
  } catch (_) {}
  body.space = _space;
  return body;
}

function baseUnit(side, def, body) {
  return {
    side, def, body,
    alive: true,
    hp: def.hp, maxHp: def.hp,
    face: side === 0 ? 0 : Math.PI,       // facing angle (world, +y down)
    state: "idle", stateT: 0, stateLen: 0, action: null,
    target: null,
    cd: 0,                                 // attack cooldown
    stun: 0, guard: false,
    z: 0, vz: 0,                           // cosmetic height channel
    hitFlash: 0, attackFlash: 0,
    lastHitAt: -9999,
    poiseLeft: def.poise || 0,
    comboStep: 0, chainWindow: 0,
    vx: 0, vy: 0,                          // last control velocity, for the rig
  };
}

function makePartyMember(idx, def) {
  const spot = partySpot(idx);
  const body = makeUnitBody(spot.x, spot.y, def.r, 0);
  const u = {
    ...baseUnit(0, def, body),
    idx, isPlayer: idx === 0,
    tp: def.tp, maxTp: def.tp,
    ol: 0, overlimit: 0,                    // gauge 0..1, frames of overlimit left
    koT: 0,                                 // frames since KO
    cast: null,                             // { arte, t, T, target }
    arteCd: 0,
    ai: { t: irand(0, 30), strafe: rand(0, 6.28), side: Math.random() < 0.5 ? -1 : 1, hold: 0, guardT: 0 },
    dealt: 0,
  };
  _unitByBody.set(body, u);
  return u;
}

function partySpot(idx) {
  // A loose diamond on the west side, player at the tip.
  const spots = [{ x: -60, y: 0 }, { x: -120, y: -60 }, { x: -190, y: 40 }, { x: -210, y: -30 }];
  return spots[idx];
}

function makeMonster(kind, x, y, wave) {
  const base = MONSTER_DEFS[kind];
  const def = { ...base, kind, hp: Math.round(base.hp * MONSTER_HP_MUL * waveHpMul(wave)), atk: base.atk * MONSTER_ATK_MUL * waveAtkMul(wave) };
  const body = makeUnitBody(x, y, def.r, 1);
  const m = {
    ...baseUnit(1, def, body),
    kind,
    spawnT: SPAWN_IN_FRAMES,
    ai: { t: irand(0, 40), strafe: rand(0, 6.28), side: Math.random() < 0.5 ? -1 : 1, retarget: 0, hold: 0, pattern: 0 },
    summoned: [false, false],
    z: def.flying ? 26 : 0,
    deadT: 0,
  };
  if (def.boss) try { body.userData._colorIdx = 4; } catch (_) {}
  setSolid(m, false);            // intangible while rising out of the ground
  _unitByBody.set(body, m);
  _monsters.push(m);
  return m;
}

function setSolid(u, solid) {
  const f = u.body.shapes.at(0).filter;
  f.collisionMask = solid ? ~0 : G_WALL;
  f.sensorMask = solid ? ~0 : 0;
  f.sensorGroup = solid ? S_SIDE[u.side] : 0;
}

// ── Damage ────────────────────────────────────────────────────────────────
// `from` is the attacking unit (for TP / gauge / aggro), `o` carries the
// knockback vector, a launch height, whether the hit is a spell (ignores
// guard direction) and whether it counts toward the combo.
function dealDamage(target, amount, from, o = {}) {
  if (!target.alive) return 0;
  if (target.side === 1 && target.spawnT > 0) return 0;
  const isSpell = !!o.spell;
  let dmg = amount;
  let blocked = false;
  if (target.guard && !isSpell) {
    // A guard covers the front half-circle only.
    let facingDiff = 0;
    if (from) facingDiff = Math.abs(wrapAngle(angleTo(target, from) - target.face));
    if (facingDiff < Math.PI * 0.6) { dmg *= 0.25; blocked = true; }
  }
  if (target.overlimit > 0) dmg *= 0.7;
  dmg = Math.max(1, Math.round(dmg * rand(0.92, 1.08)));
  const dealt = Math.min(target.hp, dmg);
  target.hp -= dealt;
  target.hitFlash = 4;
  target.lastHitAt = _frame;
  const tx = unitX(target), ty = unitY(target);
  addFloater(tx, ty, target.z + target.def.r * 2 + 14, String(dealt),
    blocked ? "#9aa4b2" : target.side === 1 ? "#fff1b8" : "#ff8a8a", !!o.big);
  addParticles(tx, ty, target.z + 14, blocked ? 3 : 6, blocked ? "#9aa4b2" : "#ffe9a8", 60, 160);

  if (from && from.side === 0) {
    _totalDamage += dealt;
    from.dealt = (from.dealt || 0) + dealt;
    if (o.combo !== false && from.isPlayer) {
      _combo++;
      _comboT = COMBO_DROP;
      if (_combo > _maxCombo) _maxCombo = _combo;
    }
    // Normal hits refill a little TP; every hit charges the Overlimit gauge.
    if (o.normal) from.tp = Math.min(from.maxTp, from.tp + 1);
    if (!o.noGauge) from.ol = Math.min(1, from.ol + dealt / 2400);
  }
  if (target.side === 0) {
    target.ol = Math.min(1, target.ol + dealt / 1300);
    // A hit interrupts a spell — unless the caster is in Overlimit.
    if (target.cast && !blocked && target.overlimit <= 0 && dealt >= 12) {
      addFloater(tx, ty, target.z + 40, "interrupted", "#c8c0e8");
      target.cast = null;
      setState(target, "idle", 0);
    }
    if (target.isPlayer && dealt >= 20) shake(3, 0.12);
  }
  // Monsters remember who hurt them.
  if (target.side === 1 && from && Math.random() < 0.45) target.target = from;

  // Stagger + knockback. Poise soaks a stagger; a launch always goes through
  // unless the target is flying or in Overlimit.
  const canStagger = !blocked && target.overlimit <= 0;
  if (canStagger) {
    if (target.poiseLeft > 0 && !o.launch && !o.big) {
      target.poiseLeft--;
    } else {
      target.poiseLeft = target.def.poise || 0;
      const stunFrames = o.stun ?? (o.big ? 36 : 18);
      applyStagger(target, stunFrames);
      if (o.kx || o.ky) {
        const v = target.body.velocity;
        const heavy = target.def.heavy ? 0.35 : 1;
        target.body.velocity = new Vec2(v.x + o.kx * heavy, v.y + o.ky * heavy);
      }
      if (o.launch && !target.def.flying && !(target.def.heavy && !o.big)) {
        target.vz = Math.max(target.vz, o.launch);
        applyStagger(target, 40);
      }
    }
  } else if (blocked && (o.kx || o.ky)) {
    const v = target.body.velocity;
    target.body.velocity = new Vec2(v.x + o.kx * 0.3, v.y + o.ky * 0.3);
  }
  if (target.hp <= 0) killUnit(target, from);
  return dealt;
}

function applyStagger(u, frames) {
  if (!u.alive) return;
  u.cast = null;
  u.action = null;
  u.guard = false;
  u.chainWindow = 0;
  u.comboStep = 0;
  setState(u, "stun", frames);
}

function heal(u, amount, from) {
  if (!u.alive) return 0;
  const h = Math.min(u.maxHp - u.hp, Math.round(amount));
  if (h <= 0) return 0;
  u.hp += h;
  addFloater(unitX(u), unitY(u), u.z + 42, "+" + h, "#8ce99a");
  addParticles(unitX(u), unitY(u), 10, 8, "#8ce99a", 30, 120, 90);
  void from;
  return h;
}

function setState(u, state, len, action = null) {
  u.state = state;
  u.stateT = 0;
  u.stateLen = len;
  u.action = action;
}

function killUnit(u, from) {
  u.alive = false;
  u.hp = 0;
  u.cast = null;
  u.guard = false;
  // Leave no half-finished action behind: the corpse animation and the KO
  // pose read state + action, and a dead unit mid-swing had a null action.
  setState(u, "idle", 0);
  const x = unitX(u), y = unitY(u);
  if (u.side === 1) {
    // Monsters leave the Space at once; the record lingers for the animation.
    _monsters.splice(_monsters.indexOf(u), 1);
    _unitByBody.delete(u.body);
    if (u.body.space) u.body.space = null;
    u.deadT = 0.001;
    u.deadX = x; u.deadY = y; u.deadZ = u.z;
    _corpses.push(u);
    addParticles(x, y, 12, 18, hexCss(u.def.color), 40, 180, 70);
    addRing(x, y, u.def.r, u.def.r * 3, 20, hexCss(u.def.color));
    if (u.def.boss) { shake(10, 0.5); _hitstop = Math.max(_hitstop, 18); }
    for (const p of _party) if (p.target === u) p.target = null;
    for (const m of _monsters) if (m.target === u) m.target = null;
    if (from && from.side === 0) from.ol = Math.min(1, from.ol + 0.08);
  } else {
    // A party member is KO'd: down, intangible, waiting on a Raise.
    _kos++;
    u.koT = 0;
    setState(u, "ko", 0);
    setSolid(u, false);
    u.body.velocity = new Vec2(0, 0);
    addParticles(x, y, 10, 16, hexCss(u.def.color), 30, 160, 60);
    addFloater(x, y, 50, "KO", "#ff6b6b", true);
    for (const m of _monsters) if (m.target === u) m.target = null;
    if (u.isPlayer) shake(9, 0.4);
  }
}

function revive(u, frac) {
  if (u.alive) return;
  u.alive = true;
  u.hp = Math.max(1, Math.round(u.maxHp * frac));
  u.koT = 0;
  u.stun = 0;
  setState(u, "idle", 0);
  setSolid(u, true);
  addRing(unitX(u), unitY(u), 6, 60, 30, "#c8f0ff");
  addParticles(unitX(u), unitY(u), 6, 18, "#c8f0ff", 30, 140, 120);
  addFloater(unitX(u), unitY(u), 50, "REVIVED", "#c8f0ff", true);
}

// Push a unit to the edge if something shoved it through the ring (a launch
// landing, a knockback into a seam) — cheap insurance, never expected to fire.
function keepInside(u) {
  const x = unitX(u), y = unitY(u);
  const d = Math.hypot(x, y);
  const lim = ARENA_R - u.def.r - 2;
  if (d > lim) {
    u.body.position = new Vec2(x / d * lim, y / d * lim);
    const v = u.body.velocity;
    const nx = x / d, ny = y / d;
    const vn = v.x * nx + v.y * ny;
    if (vn > 0) u.body.velocity = new Vec2(v.x - vn * nx, v.y - vn * ny);
  }
}

// ── Projectiles ───────────────────────────────────────────────────────────
// Every projectile is a sensor body moved by the engine. The two listeners in
// installListeners() deliver its hits; the sensor mask names the walls and the
// OTHER side only, so team filtering needs no code.
function fireProjectile(owner, x, y, angle, o) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const r = o.r ?? 5;
  const s = new Circle(r);
  s.sensorEnabled = true;
  s.filter = new InteractionFilter(G_PROJ, 0, G_PROJ, S_SIDE[1 - owner.side] | (o.passWalls ? 0 : S_WALL));
  s.cbTypes.add(_cbProj);
  body.shapes.add(s);
  body.velocity = new Vec2(Math.cos(angle) * o.speed, Math.sin(angle) * o.speed);
  body.allowRotation = false;
  try { body.userData._hidden = true; body.userData._hidden3d = true; } catch (_) {}
  body.space = _space;
  const rec = {
    body, owner, side: owner.side, dmg: o.dmg, angle, speed: o.speed, r,
    kind: o.kind || "bolt",
    life: Math.ceil((o.range / o.speed) * 60),
    pierce: !!o.pierce, homing: o.homing || 0, splash: o.splash || 0,
    launch: o.launch || 0, knock: o.knock || 0, spell: !!o.spell, normal: !!o.normal,
    z: o.z ?? 12, color: o.color || hexCss(owner.def.color), target: o.target || null,
    hits: new Set(), t: 0,
  };
  _projs.push(rec);
  return rec;
}

function killProjectile(p) {
  if (p.body?.space) p.body.space = null;
  p.body = null;
}

function clearProjectiles() {
  for (const p of _projs) killProjectile(p);
  _projs = [];
  _zones = [];
}

function onProjHitsUnit(p, unit, ix, iy) {
  if (!p.body || p.hits.has(unit)) return;
  p.hits.add(unit);
  if (p.splash > 0) {
    splash(p.owner, ix, iy, p.splash, p.dmg, { spell: p.spell, kx: 0, ky: 0, big: false });
    addRing(ix, iy, 6, p.splash, 14, p.color);
    addParticles(ix, iy, p.z, 14, p.color, 40, 200, 40);
  } else {
    const k = p.knock;
    dealDamage(unit, p.dmg, p.owner, {
      kx: Math.cos(p.angle) * k, ky: Math.sin(p.angle) * k, launch: p.launch, spell: p.spell, normal: p.normal,
    });
  }
  if (!p.pierce) killProjectile(p);
}

function onProjHitsWall(p, ix, iy) {
  if (!p.body) return;
  if (p.splash > 0) {
    splash(p.owner, ix, iy, p.splash, p.dmg, { spell: p.spell });
    addRing(ix, iy, 6, p.splash, 14, p.color);
  }
  addParticles(ix, iy, p.z, 4, p.color, 6, 90, 30);
  killProjectile(p);
}

function splash(owner, x, y, radius, dmg, o = {}) {
  for (const u of foesOf(owner)) {
    const dx = unitX(u) - x, dy = unitY(u) - y;
    const d = Math.hypot(dx, dy);
    if (d <= radius + u.def.r) {
      const k = d > 1 ? (o.knock || 0) / d : 0;
      dealDamage(u, dmg, owner, { ...o, kx: dx * k, ky: dy * k });
    }
  }
}

function installListeners(space) {
  _cbProj = new CbType();
  _cbUnit = new CbType();
  _cbWall = new CbType();
  const resolve = (cb) => {
    const b1 = cb.int1.castBody ?? cb.int1.castShape?.body ?? null;
    const b2 = cb.int2.castBody ?? cb.int2.castShape?.body ?? null;
    return [b1, b2];
  };
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbProj, _cbUnit,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const p = _projs.find(r => r.body === b1 || r.body === b2);
      if (!p) return;
      const ub = p.body === b1 ? b2 : b1;
      const unit = _unitByBody.get(ub);
      if (!unit || !unit.alive) return;
      const pos = p.body.position;
      onProjHitsUnit(p, unit, pos.x, pos.y);
    },
  ));
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbProj, _cbWall,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const p = _projs.find(r => r.body === b1 || r.body === b2);
      if (!p) return;
      const pos = p.body.position;
      onProjHitsWall(p, pos.x, pos.y);
    },
  ));
}

function tickProjectiles() {
  for (let i = _projs.length - 1; i >= 0; i--) {
    const p = _projs[i];
    if (p.body) {
      p.t++;
      if (--p.life <= 0) killProjectile(p);
      else if (p.homing > 0 && p.target && p.target.alive) {
        const want = Math.atan2(unitY(p.target) - p.body.position.y, unitX(p.target) - p.body.position.x);
        p.angle += clamp(wrapAngle(want - p.angle), -p.homing, p.homing);
        p.body.velocity = new Vec2(Math.cos(p.angle) * p.speed, Math.sin(p.angle) * p.speed);
      }
    }
    if (!p.body) _projs.splice(i, 1);
  }
  // Delayed ground zones (Stone Blast, golem smash, drake roar).
  for (let i = _zones.length - 1; i >= 0; i--) {
    const z = _zones[i];
    if (++z.t < z.T) continue;
    splash(z.owner, z.x, z.y, z.r, z.dmg, { spell: z.spell, knock: z.knock || 0, launch: z.launch || 0, big: z.big });
    addRing(z.x, z.y, 8, z.r * 1.15, 18, z.color);
    addParticles(z.x, z.y, 6, 16, z.color, z.r * 0.5, 220, 60);
    if (z.shake) shake(z.shake, 0.25);
    _zones.splice(i, 1);
  }
}

// ── Effects ───────────────────────────────────────────────────────────────
function addParticles(x, y, z, n, color, spread, speed, up = 40) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(0.3, 1) * speed;
    _particles.push({
      x: x + rand(-spread, spread) * 0.3, y: y + rand(-spread, spread) * 0.3, z,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(0, up) * 2,
      t: 0, life: irand(18, 34), color, r: rand(1.5, 3.2),
    });
  }
}
function addFloater(x, y, z, text, color, big = false) {
  _floaters.push({ x: x + rand(-8, 8), y, z, t: 0, text, color, big });
}
// A notice is a floater that never stacks: mashing a button shows it once.
function addNotice(x, y, z, text, color) {
  if (_floaters.some(f => f.text === text && f.t < 30)) return;
  addFloater(x, y, z, text, color);
}
function addRing(x, y, r, R, T, color) { _rings.push({ x, y, r, R, t: 0, T, color }); }
function addSlash(x, y, angle, arc, reach, color, T = 12, z = 16) {
  _slashes.push({ x, y, a0: angle - arc, a1: angle + arc, r: reach, t: 0, T, color, z, dir: Math.random() < 0.5 ? 1 : -1 });
}

function tickEffects() {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.t++;
    p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT;
    p.vz -= 260 * DT;
    p.vx *= 0.9; p.vy *= 0.9;
    if (p.z < 0) { p.z = 0; p.vz *= -0.3; }
    if (p.t >= p.life) _particles.splice(i, 1);
  }
  for (let i = _floaters.length - 1; i >= 0; i--) {
    const f = _floaters[i];
    if (++f.t > 50) _floaters.splice(i, 1);
  }
  for (let i = _rings.length - 1; i >= 0; i--) if (++_rings[i].t >= _rings[i].T) _rings.splice(i, 1);
  for (let i = _slashes.length - 1; i >= 0; i--) if (++_slashes[i].t >= _slashes[i].T) _slashes.splice(i, 1);
  for (let i = _corpses.length - 1; i >= 0; i--) {
    const c = _corpses[i];
    c.deadT += 1 / 45;
    if (c.deadT >= 1) _corpses.splice(i, 1);
  }
  if (_comboT > 0 && --_comboT === 0) _combo = 0;
  if (_shakeT > 0) _shakeT--;
}

// ── Movement & common per-unit tick ───────────────────────────────────────
// Velocity blending: snappy control that still lets shoves and knockback carry.
function applyControl(u, dx, dy, speedMul = 1) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return;
  const sp = u.def.speed * speedMul;
  const tx = dx / len * sp, ty = dy / len * sp;
  const v = u.body.velocity;
  u.body.velocity = new Vec2(lerp(v.x, tx, CONTROL_BLEND), lerp(v.y, ty, CONTROL_BLEND));
  u.moved = true;
  u.vx = tx; u.vy = ty;
}

function faceToward(u, x, y, rate = 0.35) {
  const want = Math.atan2(y - unitY(u), x - unitX(u));
  u.face += wrapAngle(want - u.face) * rate;
  u.face = wrapAngle(u.face);
}

// Where an action is in its windup → active → recover life.
function actionPhase(u) {
  const a = u.action;
  if (!a) return null;
  if (u.stateT < a.windup) return "windup";
  if (u.stateT < a.windup + a.active) return "active";
  return "recover";
}

function tickUnitCommon(u) {
  if (u.hitFlash > 0) u.hitFlash--;
  if (u.attackFlash > 0) u.attackFlash--;
  u.moved = false;
  if (!u.alive) {
    if (u.side === 0) u.koT++;
    return;
  }
  if (u.cd > 0) u.cd--;
  if (u.arteCd > 0) u.arteCd--;
  if (u.chainWindow > 0) u.chainWindow--;
  if (u.overlimit > 0) {
    u.overlimit--;
    if (u.overlimit === 0) addFloater(unitX(u), unitY(u), 50, "overlimit over", "#ffd166");
  }

  // Height channel: launches and hops fall back under a cosmetic gravity;
  // fliers hover instead.
  if (u.def.flying) {
    u.z = 26 + Math.sin(_frame * 0.07 + u.ai.strafe) * 4;
  } else if (u.z > 0 || u.vz > 0) {
    u.vz -= AIR_GRAVITY * DT;
    u.z += u.vz * DT;
    if (u.z <= 0) {
      u.z = 0;
      u.vz = 0;
      if (u.state === "stun") u.stateT = Math.max(u.stateT, u.stateLen - 10); // landing recovery
    }
  }

  // State progression.
  u.stateT++;
  if (u.state === "stun") {
    if (u.stateT >= u.stateLen && u.z <= 0) setState(u, "idle", 0);
  } else if (u.state === "attack" || u.state === "arte") {
    const a = u.action;
    const total = a.windup + a.active + a.recover;
    if (u.stateT === a.windup) { a.onActive?.(u); u.attackFlash = 6; }
    if (u.stateT > a.windup && u.stateT <= a.windup + a.active) a.duringActive?.(u);
    if (u.stateT >= total) { setState(u, "idle", 0); u.comboStep = 0; u.chainWindow = 0; }
    else if (u.stateT >= a.windup + a.active) u.chainWindow = 1;
  } else if (u.state === "guard") {
    if (u.stateLen > 0 && u.stateT >= u.stateLen) { u.guard = false; setState(u, "idle", 0); }
  } else if (u.state === "cast") {
    const c = u.cast;
    if (!c) setState(u, "idle", 0);
    else if (++c.t >= c.T) { c.fire(u); u.cast = null; setState(u, "idle", 0); u.attackFlash = 8; }
  }

  // TP trickles back while not spending it; the sage's mana returns regardless,
  // since she has no normal hits to refill it with.
  if (u.side === 0 && (u.state === "idle" || u.idx === 3) && _frame % TP_REGEN_EVERY === 0) u.tp = Math.min(u.maxTp, u.tp + 1);
}

function postTickUnit(u) {
  if (!u.moved) {
    const v = u.body.velocity;
    const k = u.state === "stun" ? STUN_DRAG : DRAG;
    u.body.velocity = new Vec2(v.x * k, v.y * k);
  }
  keepInside(u);
}

// ── Melee resolution ──────────────────────────────────────────────────────
// Everyone in the arc ahead of `u`, within reach, takes the hit. Returns the
// number of foes struck.
function swing(u, spec, o = {}) {
  const x = unitX(u), y = unitY(u);
  const dmg = u.def.atk * spec.dmg;
  const reach = spec.reach + u.def.r * 0.6;
  let hits = 0;
  for (const f of foesOf(u)) {
    if (o.hits && o.hits.has(f)) continue;
    const d = Math.hypot(unitX(f) - x, unitY(f) - y);
    if (d > reach + f.def.r) continue;
    const da = Math.abs(wrapAngle(Math.atan2(unitY(f) - y, unitX(f) - x) - u.face));
    if (da > spec.arc + Math.atan2(f.def.r, Math.max(1, d))) continue;
    const k = spec.knock || 0;
    const kx = d > 1 ? (unitX(f) - x) / d * k : Math.cos(u.face) * k;
    const ky = d > 1 ? (unitY(f) - y) / d * k : Math.sin(u.face) * k;
    dealDamage(f, dmg, u, { kx, ky, launch: spec.launch || 0, normal: !!o.normal, big: !!spec.big, stun: spec.stun });
    if (o.hits) o.hits.add(f);
    hits++;
  }
  addSlash(x, y, u.face, spec.arc, reach, o.color || (u.side === 0 ? "#dff3ff" : "#ffb4a0"), spec.arc > 3 ? 16 : 11, 14 + u.z);
  return hits;
}

// ── Player actions ────────────────────────────────────────────────────────
function startCombo(u, step) {
  const c = COMBO[step];
  u.comboStep = step;
  const spec = { ...c, dmg: c.dmg * (u.overlimit > 0 ? 1.15 : 1) };
  setState(u, "attack", 0, {
    windup: c.windup, active: c.active, recover: c.recover, step,
    onActive: (self) => {
      const hits = swing(self, spec, { normal: true });
      if (self.isPlayer && step === 2 && hits) { _hitstop = Math.max(_hitstop, 3); shake(3, 0.1); }
      if (step === 2) {
        // The spin carries the body a little forward.
        const v = self.body.velocity;
        self.body.velocity = new Vec2(v.x + Math.cos(self.face) * 60, v.y + Math.sin(self.face) * 60);
      }
    },
  });
}

function canAct(u) {
  return u.alive && (u.state === "idle" || (u.state === "guard") || ((u.state === "attack" || u.state === "arte") && actionPhase(u) === "recover"));
}

function spendTp(u, cost) {
  if (u.overlimit > 0) return true;
  if (u.tp < cost) return false;
  u.tp -= cost;
  return true;
}

function startArte(u, key) {
  const A = ARTES[key];
  if (!spendTp(u, A.tp)) return false;
  u.guard = false;
  u.arteCd = 40;
  addFloater(unitX(u), unitY(u), u.z + 58, A.name, hexCss(u.def.color), false);
  const hits = new Set();
  const dmg = A.dmg * (u.overlimit > 0 ? 1.2 : 1);
  const action = { windup: A.windup, active: A.active, recover: A.recover, key, hits };
  switch (key) {
    case "demonFang":
      action.onActive = (s) => {
        fireProjectile(s, unitX(s) + Math.cos(s.face) * (s.def.r + 6), unitY(s) + Math.sin(s.face) * (s.def.r + 6), s.face, {
          speed: 470, range: 340, dmg: s.def.atk * dmg, r: 10, kind: "wave", z: 3, knock: 140, color: "#9fd0ff",
        });
        addSlash(unitX(s), unitY(s), s.face, 0.9, 44, "#9fd0ff", 10, 10);
      };
      break;
    case "sonicThrust":
    case "pierce":
      action.duringActive = (s) => {
        const sp = (A.dash / A.active) * 60;
        s.body.velocity = new Vec2(Math.cos(s.face) * sp, Math.sin(s.face) * sp);
        s.moved = true;
        swing(s, { arc: 0.55, reach: 34, dmg, knock: 200, stun: 26 }, { hits, color: "#fff0c0" });
      };
      action.onActive = (s) => { addParticles(unitX(s), unitY(s), 8, 8, "#fff0c0", 10, 120, 20); };
      break;
    case "tigerBlade":
      action.onActive = (s) => {
        s.vz = 190;
        const n = swing(s, { arc: 0.95, reach: 50, dmg, knock: 40, launch: A.launch }, { color: "#ffe08a" });
        if (n) { _hitstop = Math.max(_hitstop, 3); shake(4, 0.12); }
      };
      break;
    case "tripleArrow":
      action.onActive = (s) => {
        const t = s.target;
        const base = t ? angleTo(s, t) : s.face;
        for (let i = -1; i <= 1; i++) {
          fireProjectile(s, unitX(s) + Math.cos(base) * 18, unitY(s) + Math.sin(base) * 18, base + i * 0.12, {
            speed: 620, range: 420, dmg: s.def.atk * dmg, r: 4, kind: "arrow", knock: 60, normal: true, color: "#e8ffb0",
          });
        }
      };
      break;
  }
  setState(u, "arte", 0, action);
  u.comboStep = 0;
  return true;
}

function startGuard(u) {
  if (u.state === "guard") return;
  if (u.state !== "idle" && !(u.state === "attack" && actionPhase(u) === "recover")) return;
  u.guard = true;
  setState(u, "guard", 0);
}

function releaseGuard(u) {
  if (u.state !== "guard") return;
  u.guard = false;
  setState(u, "idle", 0);
}

// Mystic Arte: a cinematic hold (the world freezes, the caster glows), then a
// huge launching blast around the caster and eight seconds of Overlimit.
function startMystic(u) {
  if (u.ol < 1 || !u.alive || u.state === "stun") return false;
  u.ol = 0;
  u.cast = null;
  u.guard = false;
  setState(u, "idle", 0);
  _mystic = { t: 0, caster: u };
  _phasePrev = _phase;
  _phase = "mystic";
  _phaseT = 0;
  if (_runnerRef) _runnerRef.physicsPaused = true;
  addFloater(unitX(u), unitY(u), 70, MYSTIC.name, "#ffd166", true);
  return true;
}
let _phasePrev = "fight";

function resolveMystic() {
  const u = _mystic.caster;
  const x = unitX(u), y = unitY(u);
  u.overlimit = OVERLIMIT_FRAMES;
  for (const f of foesOf(u)) {
    const dx = unitX(f) - x, dy = unitY(f) - y;
    const d = Math.hypot(dx, dy);
    if (d > MYSTIC.radius + f.def.r) continue;
    const k = d > 1 ? 260 / d : 0;
    dealDamage(f, u.def.atk * MYSTIC.dmg, u, { kx: dx * k, ky: dy * k, launch: MYSTIC.launch, big: true, spell: true, stun: 50, noGauge: true });
  }
  addRing(x, y, 10, MYSTIC.radius * 1.3, 30, "#ffd166");
  addRing(x, y, 10, MYSTIC.radius * 0.9, 22, "#ffffff");
  addParticles(x, y, 20, 60, "#ffd166", MYSTIC.radius * 0.6, 260, 200);
  addParticles(x, y, 20, 30, "#ffffff", MYSTIC.radius * 0.3, 160, 300);
  shake(14, 0.6);
  _hitstop = 10;
  _mystic = null;
}

// ── Targeting ─────────────────────────────────────────────────────────────
function nearestFoe(u, filter = null) {
  let best = null, bestD = Infinity;
  for (const f of foesOf(u)) {
    if (filter && !filter(f)) continue;
    const d = dist(u, f);
    if (d < bestD) { best = f; bestD = d; }
  }
  return best;
}

function ensureTarget(u) {
  if (u.target && u.target.alive && (u.target.side === 1 ? u.target.spawnT <= 0 : true)) return u.target;
  u.target = nearestFoe(u);
  return u.target;
}

function cycleTarget(u) {
  const foes = liveMonsters();
  if (!foes.length) return;
  foes.sort((a, b) => dist(u, a) - dist(u, b));
  const i = foes.indexOf(u.target);
  u.target = foes[(i + 1) % foes.length];
}

// ── Player ────────────────────────────────────────────────────────────────
function moveInput() {
  let ix = 0, iy = 0;
  if (_keys.KeyA || _keys.ArrowLeft) ix -= 1;
  if (_keys.KeyD || _keys.ArrowRight) ix += 1;
  if (_keys.KeyW || _keys.ArrowUp) iy += 1;
  if (_keys.KeyS || _keys.ArrowDown) iy -= 1;
  if (_pointer.active && _pointer.steer) {
    const dx = _pointer.x - _pointer.startX, dy = _pointer.y - _pointer.startY;
    const d = Math.hypot(dx, dy);
    if (d > STEER_DEADZONE) { ix = dx / d; iy = -dy / d; }
  }
  // Camera-relative: screen-right and screen-up on the ground plane.
  const fx = Math.cos(_camYaw), fy = Math.sin(_camYaw);
  const rx = -fy, ry = fx;
  return { x: ix * rx + iy * fx, y: ix * ry + iy * fy };
}

function tickPlayer(u) {
  if (!u.alive) return;
  if (_autopilot) { tickMeleeBrain(u, true); return; }
  const mv = moveInput();
  const t = ensureTarget(u);
  if (_pressed.cycle) { cycleTarget(u); _pressed.cycle = false; }

  if (u.state === "stun") { _pressed.attack = _pressed.arte = false; return; }

  const guardWanted = _guardHeld || _touchGuardT > 0;
  if (_touchGuardT > 0) _touchGuardT--;

  // Burst first: it can interrupt anything but a stagger.
  if (_pressed.burst) {
    _pressed.burst = false;
    if (u.ol >= 1) { startMystic(u); return; }
    addNotice(unitX(u), unitY(u), 50, "gauge not full", "#9aa4b2");
  }

  if (_pressed.arte && canAct(u)) {
    _pressed.arte = false;
    let key = "demonFang";
    if (t) {
      const ang = angleTo(u, t);
      const dot = mv.x * Math.cos(ang) + mv.y * Math.sin(ang);
      if (dot > 0.5) key = "sonicThrust";
      else if (dot < -0.5) key = "tigerBlade";
      faceToward(u, unitX(t), unitY(t), 1);
    } else if (Math.hypot(mv.x, mv.y) > 0.1) {
      u.face = Math.atan2(mv.y, mv.x);
    }
    if (!startArte(u, key)) addNotice(unitX(u), unitY(u), 50, "not enough TP", "#9aa4b2");
  }
  _pressed.arte = false;

  if (_pressed.attack && canAct(u)) {
    _pressed.attack = false;
    if (t && dist(u, t) < 280) faceToward(u, unitX(t), unitY(t), 1);
    else if (Math.hypot(mv.x, mv.y) > 0.1) u.face = Math.atan2(mv.y, mv.x);
    if (u.state === "attack") {
      const max = u.overlimit > 0 ? 6 : COMBO.length;
      const next = u.comboStep + 1;
      if (next < max) startCombo(u, next % COMBO.length);
    } else {
      u.guard = false;
      startCombo(u, 0);
    }
  }
  _pressed.attack = false;

  if (guardWanted) startGuard(u);
  else if (u.state === "guard") releaseGuard(u);

  // Movement: free while idle; a guard shuffles; nothing during an action.
  const moving = Math.hypot(mv.x, mv.y) > 0.1;
  if (u.state === "idle" || u.state === "guard") {
    if (moving) applyControl(u, mv.x, mv.y, u.state === "guard" ? 0.35 : 1);
    if (t && dist(u, t) < 330) faceToward(u, unitX(t), unitY(t), 0.3);
    else if (moving) u.face += wrapAngle(Math.atan2(mv.y, mv.x) - u.face) * 0.3;
  }
}

// ── Party AI ──────────────────────────────────────────────────────────────
// Steering helper: move toward a point, with a sideways strafe component so
// the AI never stands in a perfectly straight line.
function seek(u, x, y, strafe = 0, mul = 1) {
  let dx = x - unitX(u), dy = y - unitY(u);
  const d = Math.hypot(dx, dy);
  if (d < 2) return;
  dx /= d; dy /= d;
  if (strafe) { dx += -dy * strafe; dy += dx * strafe; }
  applyControl(u, dx, dy, mul);
}

function stepAway(u, x, y, mul = 1) {
  const dx = unitX(u) - x, dy = unitY(u) - y;
  const d = Math.hypot(dx, dy) || 1;
  // Curve along the wall rather than pressing into it.
  const rx = unitX(u), ry = unitY(u);
  const rad = Math.hypot(rx, ry);
  let ax = dx / d, ay = dy / d;
  if (rad > ARENA_R - 70) {
    const tx = -ry / rad, ty = rx / rad;
    const s = (ax * tx + ay * ty) >= 0 ? 1 : -1;
    ax = ax * 0.3 + tx * s * 0.9;
    ay = ay * 0.3 + ty * s * 0.9;
  }
  applyControl(u, ax, ay, mul);
}

// The lancer's brain — also drives the player under autopilot.
function tickMeleeBrain(u, isPlayer = false) {
  const ai = u.ai;
  const t = ensureTarget(u);
  if (u.state === "stun") return;
  if (isPlayer && u.ol >= 1 && (liveMonsters().length >= 2 || t?.def.boss)) { startMystic(u); return; }
  if (!t) {
    // Drift back toward the player's side between waves.
    const p = player();
    if (!isPlayer && dist(u, p) > 90) seek(u, unitX(p) + 40, unitY(p) - 30, 0, 0.7);
    return;
  }
  const d = dist(u, t);
  const reach = COMBO[0].reach + u.def.r * 0.6 + t.def.r - 6;
  // Guard a telegraphed swing that is aimed this way, the way a player would.
  if (ai.guardT > 0) {
    ai.guardT--;
    if (ai.guardT === 0) releaseGuard(u);
    else { faceToward(u, unitX(t), unitY(t), 0.5); return; }
  }
  const incoming = nearestFoe(u, f => f.state === "attack" && actionPhase(f) === "windup" && f.target === u && dist(u, f) < (f.def.reach || f.def.smash || 60) + f.def.r + u.def.r + 30);
  if (incoming && (u.state === "idle" || (u.state === "attack" && actionPhase(u) === "recover")) && Math.random() < (isPlayer ? 0.12 : 0.09)) {
    startGuard(u);
    if (u.state === "guard") { ai.guardT = incoming.action.windup - incoming.stateT + incoming.action.active + 4; return; }
  }
  if (u.state === "idle" || (u.state === "attack" && actionPhase(u) === "recover")) {
    if (d < reach + 6) {
      faceToward(u, unitX(t), unitY(t), 0.5);
      if (u.state === "attack") {
        // Chain the combo most of the time.
        const next = u.comboStep + 1;
        if (next < COMBO.length && Math.random() < 0.8) startCombo(u, next);
      } else if (u.cd <= 0) {
        // Artes when affordable: a thrust to open, a launcher on a stunned foe.
        if (isPlayer && u.tp >= 14 && u.arteCd <= 0 && Math.random() < 0.25) {
          startArte(u, t.state === "stun" ? "tigerBlade" : "demonFang");
        } else {
          startCombo(u, 0);
          u.cd = irand(8, 22);
        }
      } else {
        // Circle while waiting for the cooldown.
        seek(u, unitX(t), unitY(t), ai.side * 1.4, 0.5);
      }
    } else if (u.state === "idle") {
      // A gap-closing thrust when the TP is there.
      if (d < 160 && d > 70 && u.tp >= 10 && u.arteCd <= 0 && Math.random() < 0.04) {
        faceToward(u, unitX(t), unitY(t), 1);
        startArte(u, isPlayer ? "sonicThrust" : "pierce");
        return;
      }
      // Low HP: hang back near the sage for a moment.
      if (u.hp < u.maxHp * 0.22 && ai.hold <= 0 && Math.random() < 0.02) ai.hold = 100;
      if (ai.hold > 0) {
        ai.hold--;
        const sage = _party[3];
        if (sage.alive) seek(u, unitX(sage), unitY(sage), 0, 0.9);
        else stepAway(u, unitX(t), unitY(t), 0.9);
        faceToward(u, unitX(t), unitY(t), 0.3);
        return;
      }
      seek(u, unitX(t), unitY(t), Math.sin(_frame * 0.02 + ai.strafe) * 0.3);
      faceToward(u, unitX(t), unitY(t), 0.3);
    }
  }
}

function tickArcherBrain(u) {
  const ai = u.ai;
  const t = ensureTarget(u);
  if (u.state === "stun" || u.state === "arte") return;
  if (!t) {
    const p = player();
    if (dist(u, p) > 130) seek(u, unitX(p) - 80, unitY(p) + 40, 0, 0.7);
    return;
  }
  const near = nearestFoe(u);
  const dNear = dist(u, near);
  const d = dist(u, t);
  faceToward(u, unitX(t), unitY(t), 0.4);
  if (dNear < 120) { stepAway(u, unitX(near), unitY(near), 1); return; }
  if (u.state !== "idle") return;
  if (d > 250) seek(u, unitX(t), unitY(t), 0, 0.9);
  else if (d < 170) stepAway(u, unitX(t), unitY(t), 0.8);
  else seek(u, unitX(t), unitY(t), ai.side * 2.2, 0.35);
  if (u.cd <= 0 && d < 320) {
    if (u.tp >= 10 && u.arteCd <= 0 && Math.random() < 0.3) {
      startArte(u, "tripleArrow");
      u.arteCd = 7 * 60;
      u.cd = 60;
      return;
    }
    // A plain arrow with a little lead on the target's motion.
    const tv = t.body.velocity;
    const flight = d / 600;
    const ang = Math.atan2(unitY(t) + tv.y * flight - unitY(u), unitX(t) + tv.x * flight - unitX(u));
    u.face = ang;
    setState(u, "attack", 0, {
      windup: 10, active: 3, recover: 14,
      onActive: (s) => fireProjectile(s, unitX(s) + Math.cos(ang) * 18, unitY(s) + Math.sin(ang) * 18, ang, {
        speed: 640, range: 440, dmg: s.def.atk, r: 4, kind: "arrow", knock: 50, normal: true, color: "#e8ffb0",
      }),
    });
    u.cd = irand(46, 60);
    u.tp = Math.min(u.maxTp, u.tp + 2);
  }
}

function tickSageBrain(u) {
  const t = ensureTarget(u);
  if (u.state === "stun" || u.state === "cast" || u.state === "attack") return;
  const p = player();
  const near = nearestFoe(u);
  const dNear = near ? dist(u, near) : Infinity;

  // Positioning: behind the player, away from monsters, never in a corner.
  const danger = near ? (near.def.reach || near.def.smash || 40) + near.def.r + 70 : 0;
  if (near && dNear < Math.max(150, danger)) { stepAway(u, unitX(near), unitY(near), 1); if (t) faceToward(u, unitX(t), unitY(t), 0.3); }
  else if (dist(u, p) > 240) seek(u, unitX(p), unitY(p), 0, 0.85);
  else if (Math.hypot(unitX(u), unitY(u)) > ARENA_R - 60) seek(u, 0, 0, 0, 0.5);
  if (t) faceToward(u, unitX(t), unitY(t), 0.25);

  // Spell choice. Revives first, then heals, then offence.
  const down = _party.filter(q => !q.alive).sort((a, b) => (a.isPlayer ? -1 : 1));
  const hurt = _party.filter(q => q.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const veryHurt = hurt.filter(q => q.hp / q.maxHp < 0.55);
  let key = null, target = null;
  if (down.length && u.tp >= ARTES.raise.tp) { key = "raise"; target = down[0]; }
  else if (veryHurt.length >= 2 && u.tp >= ARTES.nurse.tp) key = "nurse";
  else if (hurt.length && hurt[0].hp / hurt[0].maxHp < 0.6 && u.tp >= ARTES.firstAid.tp) { key = "firstAid"; target = hurt[0]; }
  else if (t && u.arteCd <= 0 && dNear > 90) {
    // Offence only with a healing reserve left over.
    const reserve = 30;
    if (t.def.heavy && u.tp >= ARTES.stoneBlast.tp + reserve) key = "stoneBlast";
    else if (u.tp >= ARTES.fireBall.tp + reserve) key = "fireBall";
    target = t;
  }
  if (!key) {
    // Nothing to cast: bonk anything adjacent with the staff.
    if (near && dNear < 44 && u.cd <= 0) {
      faceToward(u, unitX(near), unitY(near), 1);
      startCombo(u, 0);
      u.cd = 40;
    }
    return;
  }
  const A = ARTES[key];
  if (!spendTp(u, A.tp)) return;
  u.arteCd = key === "fireBall" || key === "stoneBlast" ? 70 : 30;
  const fire = (s) => {
    switch (key) {
      case "firstAid": if (target.alive) heal(target, A.heal, s); break;
      case "nurse": for (const q of _party) if (q.alive) heal(q, A.heal, s); break;
      case "raise": if (!target.alive) revive(target, 0.45); break;
      case "fireBall": {
        const tt = target.alive ? target : nearestFoe(s);
        if (!tt) return;
        const ang = angleTo(s, tt);
        fireProjectile(s, unitX(s) + Math.cos(ang) * 16, unitY(s) + Math.sin(ang) * 16, ang, {
          speed: 380, range: 520, dmg: s.def.atk * A.dmg, r: 8, kind: "fire", splash: A.splash, homing: 0.05,
          spell: true, target: tt, z: 22, color: "#ff8f4a",
        });
        break;
      }
      case "stoneBlast": {
        const tt = target.alive ? target : nearestFoe(s);
        if (!tt) return;
        _zones.push({ x: unitX(tt), y: unitY(tt), r: A.radius, t: 0, T: 22, owner: s, dmg: s.def.atk * A.dmg, spell: true, launch: 220, knock: 60, color: "#c8a878", kind: "stone", shake: 4, big: true });
        break;
      }
    }
  };
  u.cast = { key, name: A.name, t: 0, T: A.cast, target, fire };
  setState(u, "cast", A.cast);
  if (target && target !== u) faceToward(u, unitX(target), unitY(target), 1);
}

function tickPartyAI(u) {
  if (!u.alive) return;
  switch (u.idx) {
    case 1: tickMeleeBrain(u); break;
    case 2: tickArcherBrain(u); break;
    case 3: tickSageBrain(u); break;
  }
}

// ── Monster AI ────────────────────────────────────────────────────────────
function pickMonsterTarget(m) {
  let best = null, bestScore = Infinity;
  for (const p of liveParty()) {
    // Slight preference for the player, strong preference for whoever is close.
    const score = dist(m, p) * (p.isPlayer ? 0.8 : 1) * (p.idx === 3 ? 1.15 : 1);
    if (score < bestScore) { best = p; bestScore = score; }
  }
  return best;
}

function monsterAttack(m, windup, active, recover, onActive, duringActive = null) {
  setState(m, "attack", 0, { windup, active, recover, onActive, duringActive, hits: new Set() });
  m.cd = m.def.cd;
}

function tickMonsterAI(m) {
  const ai = m.ai;
  const d0 = m.def;
  if (m.spawnT > 0) {
    if (--m.spawnT === 0) setSolid(m, true);
    return;
  }
  if (!m.alive || m.state === "stun") return;
  if (--ai.retarget <= 0 || !m.target || !m.target.alive) {
    m.target = pickMonsterTarget(m);
    ai.retarget = irand(80, 140);
  }
  const t = m.target;
  if (!t) return;
  if (m.state !== "idle") return;
  const d = dist(m, t);
  const tx = unitX(t), ty = unitY(t);

  // Boss-only patterns first.
  if (d0.drake && tickDrake(m, t, d)) return;
  if (d0.kind === "ogre" && tickOgre(m, t, d)) return;

  if (d0.ranged) {
    const band = d0.ranged;
    faceToward(m, tx, ty, 0.3);
    if (d < band.min - 20) stepAway(m, tx, ty, 1);
    else if (d > band.max) seek(m, tx, ty, 0, 0.9);
    else seek(m, tx, ty, ai.side * 2.4, 0.3);
    if (m.cd <= 0 && d < band.max + 40 && d > 40) {
      const flight = d / band.speed;
      const tv = t.body.velocity;
      const ang = Math.atan2(ty + tv.y * flight * 0.6 - unitY(m), tx + tv.x * flight * 0.6 - unitX(m));
      m.face = ang;
      monsterAttack(m, d0.windup, 3, d0.recover, (s) => {
        fireProjectile(s, unitX(s) + Math.cos(s.face) * (s.def.r + 4), unitY(s) + Math.sin(s.face) * (s.def.r + 4), s.face, {
          speed: band.speed, range: band.max + 160, dmg: s.def.atk, r: 4, kind: d0.flying ? "spark" : "arrow",
          homing: band.homing || 0, target: t, spell: !!d0.flying, knock: 60, z: d0.flying ? 24 : 12,
          color: d0.flying ? "#9ff3ff" : "#d9c3a0",
        });
      });
    }
    return;
  }

  // Melee monsters.
  const reach = d0.reach + t.def.r;
  faceToward(m, tx, ty, 0.35);
  if (d0.lunge && d > reach && d < d0.lunge + 20 && m.cd <= 0 && Math.random() < 0.06) {
    // Wolf lunge: a crouch, then a burst straight at the target.
    const ang = angleTo(m, t);
    m.face = ang;
    monsterAttack(m, d0.windup, 9, d0.recover, null, (s) => {
      const sp = (d0.lunge / 9) * 60;
      s.body.velocity = new Vec2(Math.cos(s.face) * sp, Math.sin(s.face) * sp);
      s.moved = true;
      swing(s, { arc: 0.7, reach: d0.reach, dmg: 1.1, knock: 180, stun: 22 }, { hits: s.action.hits });
    });
    return;
  }
  if (d > reach - 4) {
    if (d0.hopper) {
      // Slimes travel in hops: a push every 40 frames, coasting between.
      ai.t++;
      if (ai.t % 40 < 14) { applyControl(m, tx - unitX(m), ty - unitY(m), 1.9); m.vz = m.z <= 0 ? 110 : m.vz; }
    } else {
      seek(m, tx, ty, Math.sin(_frame * 0.03 + ai.strafe) * 0.35);
    }
    // Bandits raise their blade when the player winds up on them.
    if (d0.guards && t.isPlayer && t.state === "attack" && d < 90 && Math.random() < 0.05) {
      m.guard = true;
      setState(m, "guard", 34);
    }
    return;
  }
  if (m.cd > 0) {
    seek(m, tx, ty, ai.side * 1.6, 0.4);
    return;
  }
  if (d0.smash) {
    // Golem: a slow overhead smash with a big landing zone.
    monsterAttack(m, d0.windup, 4, d0.recover, (s) => {
      const fx = unitX(s) + Math.cos(s.face) * 34, fy = unitY(s) + Math.sin(s.face) * 34;
      splash(s, fx, fy, d0.smash, s.def.atk, { knock: 300, big: true, stun: 34 });
      addRing(fx, fy, 8, d0.smash, 16, "#c8b8a0");
      addParticles(fx, fy, 2, 16, "#8a8070", 30, 200, 60);
      shake(7, 0.3);
    });
    return;
  }
  // Plain swing (slime slam, bandit slash).
  monsterAttack(m, d0.windup, 4, d0.recover, (s) => {
    swing(s, { arc: 1.0, reach: d0.reach, dmg: 1, knock: 110 });
  });
  if (d0.guards && Math.random() < 0.4) m.cd = 24;   // bandits like a quick follow-up
}

// Ogre: a wide club sweep up close, a shoulder charge from range.
function tickOgre(m, t, d) {
  const d0 = m.def;
  const tx = unitX(t), ty = unitY(t);
  if (m.cd > 0) { seek(m, tx, ty, m.ai.side * 0.8, 0.6); faceToward(m, tx, ty, 0.3); return true; }
  if (d > 150 && d < d0.charge + 40 && Math.random() < 0.03) {
    m.face = angleTo(m, t);
    addFloater(unitX(m), unitY(m), 70, "!", "#ffd166", true);
    monsterAttack(m, 26, 14, 36, null, (s) => {
      const sp = (d0.charge / 14) * 60;
      s.body.velocity = new Vec2(Math.cos(s.face) * sp, Math.sin(s.face) * sp);
      s.moved = true;
      swing(s, { arc: 0.8, reach: 44, dmg: 1.0, knock: 340, big: true, stun: 34 }, { hits: s.action.hits });
    });
    return true;
  }
  if (d <= d0.reach + t.def.r) {
    monsterAttack(m, d0.windup, 6, d0.recover, (s) => {
      swing(s, { arc: Math.PI * 0.75, reach: d0.reach, dmg: 1, knock: 300, big: true, stun: 32 });
      shake(5, 0.2);
    });
    return true;
  }
  return false;
}

// Drake: claw, tail spin, fire breath, roar at HP thresholds, wisp summons.
function tickDrake(m, t, d) {
  const d0 = m.def;
  const frac = m.hp / m.maxHp;
  const tx = unitX(t), ty = unitY(t);
  // Summons.
  if (frac < 0.62 && !m.summoned[0]) { m.summoned[0] = true; summonWisps(m, 2); }
  if (frac < 0.3 && !m.summoned[1]) { m.summoned[1] = true; summonWisps(m, 2); }
  // Roar when a quarter of the bar goes.
  const q = Math.floor(frac * 4);
  if (m.ai.lastQ === undefined) m.ai.lastQ = q;
  if (q < m.ai.lastQ) {
    m.ai.lastQ = q;
    addFloater(unitX(m), unitY(m), 110, "ROAR", "#ff9a6a", true);
    monsterAttack(m, 28, 4, 40, (s) => {
      splash(s, unitX(s), unitY(s), 170, s.def.atk * 0.6, { knock: 420, launch: 260, big: true, stun: 40 });
      addRing(unitX(s), unitY(s), 20, 190, 22, "#ff9a6a");
      addRing(unitX(s), unitY(s), 20, 230, 30, "#ffd6a0");
      shake(12, 0.5);
      _hitstop = 6;
    });
    return true;
  }
  if (m.cd > 0) { seek(m, tx, ty, m.ai.side * 0.7, 0.7); faceToward(m, tx, ty, 0.25); return true; }
  // Someone right behind: tail spin.
  const behind = liveParty().find(p => dist(m, p) < 120 && Math.abs(wrapAngle(angleTo(m, p) - m.face)) > 2.2);
  if (behind) {
    monsterAttack(m, 22, 8, 30, (s) => {
      swing(s, { arc: Math.PI, reach: 110, dmg: 1.0, knock: 360, big: true, stun: 34 }, { color: "#ffb4a0" });
      shake(6, 0.25);
    });
    m.ai.pattern = 1;
    return true;
  }
  if (d > 130 && d < 340 && Math.random() < 0.035) {
    // Fire breath: a fan of five fireballs.
    m.face = angleTo(m, t);
    monsterAttack(m, 30, 16, 40, null, (s) => {
      if ((s.stateT - s.action.windup) % 4 !== 1) return;
      const i = Math.floor((s.stateT - s.action.windup) / 4) - 2;
      const ang = s.face + i * 0.22;
      fireProjectile(s, unitX(s) + Math.cos(s.face) * (s.def.r + 10), unitY(s) + Math.sin(s.face) * (s.def.r + 10), ang, {
        speed: 340, range: 380, dmg: s.def.atk * 0.42, r: 9, kind: "fire", splash: 34, spell: true, z: 28, color: "#ff8f4a",
      });
      s.ai.breath = 6;
    });
    m.ai.pattern = 2;
    return true;
  }
  if (d > 260 && Math.random() < 0.02) {
    m.face = angleTo(m, t);
    addFloater(unitX(m), unitY(m), 100, "!", "#ffd166", true);
    monsterAttack(m, 24, 14, 34, null, (s) => {
      const sp = (260 / 14) * 60;
      s.body.velocity = new Vec2(Math.cos(s.face) * sp, Math.sin(s.face) * sp);
      s.moved = true;
      swing(s, { arc: 0.9, reach: 60, dmg: 0.9, knock: 380, big: true, stun: 34 }, { hits: s.action.hits });
    });
    return true;
  }
  if (d <= d0.reach + t.def.r) {
    monsterAttack(m, d0.windup, 6, d0.recover, (s) => {
      swing(s, { arc: 1.0, reach: d0.reach, dmg: 1.0, knock: 240, big: true, stun: 30 });
    });
    m.ai.pattern = 0;
    return true;
  }
  return false;
}

function summonWisps(m, n) {
  for (let i = 0; i < n; i++) {
    const a = m.face + Math.PI + (i - (n - 1) / 2) * 0.8;
    const p = clampToArena(unitX(m) + Math.cos(a) * 90, unitY(m) + Math.sin(a) * 90, 40);
    makeMonster("wisp", p.x, p.y, _wave);
  }
  addFloater(unitX(m), unitY(m), 100, "summons wisps", "#9ff3ff");
}

// ── Waves & match flow ────────────────────────────────────────────────────
function spawnWave(w) {
  const roster = WAVES[w - 1];
  // Monsters rise out of the ground on the far side from the party centroid.
  let cx = 0, cy = 0, n = 0;
  for (const p of _party) { cx += unitX(p); cy += unitY(p); n++; }
  const away = Math.atan2(-cy / n, -cx / n);
  const spread = roster.length === 1 ? 0 : Math.min(1.9, 0.42 * (roster.length - 1));
  roster.forEach((kind, i) => {
    const a = away + (roster.length === 1 ? 0 : (i / (roster.length - 1) - 0.5) * spread);
    const rr = ARENA_R - 70 - (i % 2) * 50;
    const p = clampToArena(Math.cos(a) * rr, Math.sin(a) * rr, MONSTER_DEFS[kind].r + 10);
    const m = makeMonster(kind, p.x, p.y, w);
    m.face = Math.atan2(cy / n - p.y, cx / n - p.x);
    m.spawnT = SPAWN_IN_FRAMES + i * 6;
  });
}

function beginWave(w) {
  _wave = w;
  _phase = "banner";
  _phaseT = 0;
  for (const p of _party) p.target = null;
}

function clearMonsters() {
  for (const m of _monsters) { _unitByBody.delete(m.body); if (m.body.space) m.body.space = null; }
  _monsters = [];
  _corpses = [];
}

function resetParty(full) {
  _party.forEach((p, i) => {
    const spot = partySpot(i);
    p.body.position = new Vec2(spot.x, spot.y);
    p.body.velocity = new Vec2(0, 0);
    if (!p.alive) { p.alive = true; setSolid(p, true); }
    p.hp = full ? p.maxHp : Math.min(p.maxHp, Math.max(p.hp, 1) + Math.round(p.maxHp * 0.4));
    p.tp = p.maxTp;
    p.z = 0; p.vz = 0;
    p.cast = null; p.guard = false; p.action = null;
    p.face = 0;
    p.overlimit = 0;
    p.target = null;
    setState(p, "idle", 0);
  });
}

function startRun(fromWave = 1) {
  clearMonsters();
  clearProjectiles();
  _particles = []; _floaters = []; _rings = []; _slashes = [];
  _clock = 0; _combo = 0; _maxCombo = 0; _totalDamage = 0; _kos = 0; _retries = 0;
  for (const p of _party) { p.hp = p.maxHp; p.tp = p.maxTp; p.ol = 0; p.dealt = 0; }
  resetParty(true);
  _hintT = 8 * 60;
  beginWave(fromWave);
}

function retryWave() {
  _retries++;
  clearMonsters();
  clearProjectiles();
  _particles = []; _floaters = []; _rings = []; _slashes = [];
  for (const p of _party) { p.hp = p.maxHp; p.ol = 0; }
  resetParty(true);
  beginWave(_wave);
}

function resetAll(space) {
  void space;
  _party = [];
  _unitByBody = new Map();
  PARTY_DEFS.forEach((def, i) => _party.push(makePartyMember(i, def)));
  clearMonsters();
  clearProjectiles();
  _particles = []; _floaters = []; _rings = []; _slashes = [];
  _frame = 0; _phase = "title"; _phaseT = 0; _wave = 0; _clock = 0;
  _combo = 0; _comboT = 0; _maxCombo = 0; _totalDamage = 0; _kos = 0; _retries = 0;
  _hitstop = 0; _mystic = null; _lockUntil = 0;
  _cam2d.x = -40; _cam2d.y = 0;
  _camFocus.x = -40; _camFocus.y = 0;
  _camYaw3d = 0.9; _camDist3d = 360;
  for (const k in _keys) _keys[k] = false;
  _pointer.active = false;
  _pressed.attack = _pressed.arte = _pressed.burst = _pressed.cycle = false;
  _guardHeld = false;
}

function endDefeat() {
  _phase = "defeat";
  _phaseT = 0;
  _lockUntil = _frame + RESULT_LOCK;
  shake(6, 0.4);
}

function tickFlow() {
  if (_phase === "banner") {
    if (++_phaseT === Math.round(WAVE_BANNER_FRAMES * 0.45)) spawnWave(_wave);
    if (_phaseT >= WAVE_BANNER_FRAMES) { _phase = "fight"; _phaseT = 0; }
    return;
  }
  if (_phase === "fight") {
    _clock++;
    // Defeat: everyone down, or the player down with no revive coming.
    const pl = player();
    const sage = _party[3];
    if (!liveParty().length) { endDefeat(); return; }
    if (!pl.alive) {
      const reviveComing = sage.alive && (sage.tp >= ARTES.raise.tp || sage.cast?.key === "raise");
      if (!reviveComing || pl.koT > KO_REVIVE_WINDOW) { endDefeat(); return; }
    }
    if (!_monsters.length && !_corpses.length) {
      _phase = "cleared";
      _phaseT = 0;
      if (_wave >= WAVES.length) {
        _phase = "victory";
        _lockUntil = _frame + RESULT_LOCK;
      }
      for (const p of _party) if (p.alive) p.ol = Math.min(1, p.ol + 0.15);
    }
    return;
  }
  if (_phase === "cleared") {
    if (++_phaseT >= CLEAR_FRAMES) {
      // Rest between waves: a partial heal, full TP, everyone back on their feet.
      for (const p of _party) {
        if (!p.alive) revive(p, 0.5);
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.55));
        p.tp = p.maxTp;
      }
      beginWave(_wave + 1);
    }
  }
}

// ── Camera ────────────────────────────────────────────────────────────────
// Both cameras follow a focus point between the player and their target,
// weighted toward the player. The 3D camera also picks a heading side-on to
// the player–target line, on whichever side is closest to where it already is.
function updateCamera() {
  const p = player();
  const t = p.target && p.target.alive ? p.target : null;
  let fx = unitX(p), fy = unitY(p);
  if (t) { fx = lerp(fx, unitX(t), 0.42); fy = lerp(fy, unitY(t), 0.42); }
  if (_phase === "title") { fx = -40; fy = 0; }
  if (_mystic) { fx = unitX(_mystic.caster); fy = unitY(_mystic.caster); }
  const k = _mystic ? 0.2 : 0.08;
  _camFocus.x += (fx - _camFocus.x) * k;
  _camFocus.y += (fy - _camFocus.y) * k;
  // 2D: keep the ring mostly on screen.
  const c = clampToArena(_camFocus.x, _camFocus.y, 110);
  _cam2d.x += (c.x - _cam2d.x) * 0.5;
  _cam2d.y += (c.y - _cam2d.y) * 0.5;

  // 3D heading.
  let wantYaw = _camYaw3d;
  if (t) {
    const line = angleTo(p, t);
    const a = line + Math.PI / 2, b = line - Math.PI / 2;
    wantYaw = Math.abs(wrapAngle(a - _camYaw3d)) < Math.abs(wrapAngle(b - _camYaw3d)) ? a : b;
  }
  const dyaw = clamp(wrapAngle(wantYaw - _camYaw3d) * 0.05, -0.028, 0.028);
  _camYaw3d = wrapAngle(_camYaw3d + dyaw);
  const sep = t ? dist(p, t) : 120;
  const wantDist = _mystic ? 260 : clamp(250 + sep * 0.4, 300, 450);
  _camDist3d += (wantDist - _camDist3d) * 0.06;
}

// ── Step ──────────────────────────────────────────────────────────────────
function stepWorld() {
  _frame++;
  if (_runnerRef) _runnerRef.physicsPaused = false;

  if (_hitstop > 0) {
    _hitstop--;
    if (_runnerRef) _runnerRef.physicsPaused = _hitstop > 0;
    tickEffects();
    updateCamera();
    return;
  }

  if (_phase === "mystic") {
    if (_runnerRef) _runnerRef.physicsPaused = true;
    _mystic.t++;
    const u = _mystic.caster;
    if (_mystic.t % 6 === 0) addParticles(unitX(u), unitY(u), 10, 4, "#ffd166", 40, 40, 160);
    if (_mystic.t >= MYSTIC_FRAMES) {
      resolveMystic();
      _phase = _phasePrev === "mystic" ? "fight" : _phasePrev;
      if (_runnerRef) _runnerRef.physicsPaused = false;
    }
    for (const f of _floaters) f.t = Math.max(0, f.t - 1); // hold the popups
    updateCamera();
    return;
  }

  if (_phase === "title" || _phase === "victory" || _phase === "defeat") {
    for (const p of _party) { tickUnitCommon(p); if (p.alive && p.state === "idle") p.body.velocity = new Vec2(0, 0); postTickUnit(p); }
    for (const m of _monsters) { tickUnitCommon(m); postTickUnit(m); }
    tickProjectiles();
    tickEffects();
    updateCamera();
    return;
  }

  tickFlow();
  for (const p of _party) tickUnitCommon(p);
  for (const m of _monsters) tickUnitCommon(m);
  if (_phase === "fight" || _phase === "cleared" || _phase === "banner") {
    const pl = player();
    if (pl.alive) tickPlayer(pl);
    for (let i = 1; i < _party.length; i++) tickPartyAI(_party[i]);
    for (const m of _monsters) tickMonsterAI(m);
  }
  for (const p of _party) postTickUnit(p);
  for (const m of _monsters) postTickUnit(m);
  tickProjectiles();
  tickEffects();
  updateCamera();
  if (_hintT > 0) _hintT--;
}

// ── Projection (shared by the overlay in every render mode) ───────────────
// The 2D pass and the 3D pass each leave enough behind for the overlay to map
// a world point (with height) onto the screen: the 2D camera, or the THREE
// camera the last 3D frame rendered with.
let _THREE = null;
let _projV = null;
function toScreen(x, y, z = 0) {
  if (_frame3d === _frame && _camProj && _THREE) {
    if (!_projV) _projV = new _THREE.Vector3();
    _projV.set(x, -y, z);
    const cx = _camProj.position.x - x, cy = _camProj.position.y + y, cz = _camProj.position.z - z;
    const d = Math.hypot(cx, cy, cz);
    _projV.project(_camProj);
    return { x: (_projV.x + 1) * 0.5 * VIEW_W, y: (1 - _projV.y) * 0.5 * VIEW_H, s: clamp(520 / Math.max(1, d), 0.45, 1.5), behind: _projV.z > 1 };
  }
  return { x: x - _cam2d.x + VIEW_W / 2, y: y - _cam2d.y + VIEW_H / 2 - z * 0.6, s: 1, behind: false };
}

// ── Rendering: 2D world pass ──────────────────────────────────────────────
function drawArenaFloor(ctx) {
  const g = ctx.createRadialGradient(0, 0, 40, 0, 0, ARENA_R + 20);
  g.addColorStop(0, "#2a3140");
  g.addColorStop(0.7, "#232a37");
  g.addColorStop(1, "#1a2029");
  ctx.beginPath();
  ctx.arc(0, 0, ARENA_R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // Flagstone rings and the eight-point rune.
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let r = 60; r < ARENA_R; r += 60) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); ctx.lineTo(Math.cos(a) * ARENA_R, Math.sin(a) * ARENA_R); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(180,160,255,0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b = a + Math.PI * 0.75;
    ctx.moveTo(Math.cos(a) * 150, Math.sin(a) * 150);
    ctx.lineTo(Math.cos(b) * 150, Math.sin(b) * 150);
  }
  ctx.stroke();
  // Ring edge glow.
  ctx.strokeStyle = "rgba(140,170,220,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, ARENA_R, 0, Math.PI * 2); ctx.stroke();
}

function drawTelegraphs2d(ctx) {
  for (const m of _monsters) {
    if (!m.alive || m.state !== "attack" || actionPhase(m) !== "windup") continue;
    const k = m.stateT / Math.max(1, m.action.windup);
    const x = unitX(m), y = unitY(m);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.35 * k;
    ctx.fillStyle = "#ff6b5a";
    ctx.strokeStyle = "#ffb4a0";
    ctx.lineWidth = 1.5;
    if (m.def.ranged) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(m.face) * 120, y + Math.sin(m.face) * 120);
      ctx.stroke();
    } else {
      const reach = (m.def.smash || m.def.reach || 40) + m.def.r;
      const arc = m.def.sweep || m.def.drake ? Math.PI * 0.75 : m.def.smash ? Math.PI * 2 : 1.0;
      ctx.beginPath();
      if (arc >= Math.PI * 2) ctx.arc(x + Math.cos(m.face) * (m.def.smash ? 34 : 0), y + Math.sin(m.face) * (m.def.smash ? 34 : 0), m.def.smash || reach, 0, Math.PI * 2);
      else { ctx.moveTo(x, y); ctx.arc(x, y, reach, m.face - arc, m.face + arc); ctx.closePath(); }
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const z of _zones) {
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.3 * (z.t / z.T);
    ctx.fillStyle = z.color;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawUnit2d(ctx, u, showOutlines) {
  const x = unitX(u), y = unitY(u);
  const r = u.def.r;
  ctx.save();
  // Spawn-in: fade up.
  if (u.side === 1 && u.spawnT > 0) ctx.globalAlpha = clamp(1 - u.spawnT / SPAWN_IN_FRAMES, 0.05, 1) * 0.9;
  // Shadow when airborne.
  if (u.z > 0.5) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.9, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(0, -u.z * 0.6);
  if (!u.alive && u.side === 0) {
    // KO: a flattened grey puck.
    ctx.translate(x, y); ctx.scale(1, 0.45); ctx.translate(-x, -y);
    ctx.fillStyle = "rgba(120,120,130,0.35)"; ctx.strokeStyle = "#8a8a94"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    return;
  }
  drawBody(ctx, u.body, showOutlines);
  // Facing wedge, tinted by side; the player gets a brighter one.
  const col = u.side === 0 ? (u.isPlayer ? "#ffffff" : hexCss(u.def.color)) : "#ffb4a0";
  ctx.strokeStyle = col;
  ctx.lineWidth = u.isPlayer ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(u.face - 0.5) * r * 0.6, y + Math.sin(u.face - 0.5) * r * 0.6);
  ctx.lineTo(x + Math.cos(u.face) * (r + 5), y + Math.sin(u.face) * (r + 5));
  ctx.lineTo(x + Math.cos(u.face + 0.5) * r * 0.6, y + Math.sin(u.face + 0.5) * r * 0.6);
  ctx.stroke();
  // Guard: an arc shield in front. Hit flash: white ring. Overlimit: gold ring.
  if (u.guard) {
    ctx.strokeStyle = "rgba(160,220,255,0.9)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r + 6, u.face - 1.2, u.face + 1.2); ctx.stroke();
  }
  if (u.hitFlash > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke();
  }
  if (u.overlimit > 0) {
    ctx.strokeStyle = `rgba(255,209,102,${0.5 + 0.4 * Math.sin(_frame * 0.3)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke();
  }
  if (u.state === "stun") {
    ctx.fillStyle = "#ffd166";
    for (let i = 0; i < 3; i++) {
      const a = _frame * 0.15 + i * 2.1;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * (r + 4), y - r - 6 + Math.sin(a) * 3, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawCastCircle2d(ctx, u) {
  const c = u.cast;
  if (!c) return;
  const k = c.t / c.T;
  const x = unitX(u), y = unitY(u);
  ctx.save();
  ctx.strokeStyle = "rgba(200,180,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#e8d8ff";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(200,180,255,0.5)";
  ctx.beginPath(); ctx.arc(x, y, 34, _frame * 0.05, _frame * 0.05 + Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawWorldEffects2d(ctx) {
  for (const s of _slashes) {
    const k = s.t / s.T;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 6 * (1 - k * 0.5);
    ctx.lineCap = "round";
    ctx.beginPath();
    const sweep = s.a1 - s.a0;
    const a0 = s.dir > 0 ? s.a0 : s.a1;
    const a1 = a0 + s.dir * sweep * Math.min(1, k * 1.6);
    ctx.arc(s.x, s.y - s.z * 0.6, s.r * (0.85 + k * 0.25), Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();
    ctx.restore();
  }
  for (const p of _projs) {
    if (!p.body) continue;
    const x = p.body.position.x, y = p.body.position.y - p.z * 0.6;
    ctx.save();
    if (p.kind === "arrow") {
      ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(p.angle) * 12, y - Math.sin(p.angle) * 12); ctx.lineTo(x + Math.cos(p.angle) * 6, y + Math.sin(p.angle) * 6); ctx.stroke();
    } else if (p.kind === "wave") {
      ctx.strokeStyle = p.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, p.r + 4, p.angle - 1.0, p.angle + 1.0); ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(x - Math.cos(p.angle) * p.r * 1.8, y - Math.sin(p.angle) * p.r * 1.8, p.r * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  for (const r of _rings) {
    const k = r.t / r.T;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r, r.R, k), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  for (const c of _corpses) {
    const k = c.deadT;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = hexCss(c.def.color);
    ctx.beginPath(); ctx.arc(c.deadX, c.deadY - c.deadZ * 0.6, c.def.r * (1 - k * 0.7), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const p of _particles) {
    ctx.save();
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y - p.z * 0.6, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── Rendering: overlay (all modes) ────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBar(ctx, x, y, w, h, frac, fill, back = "rgba(0,0,0,0.5)") {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2); ctx.fill();
  }
}

function hpColor(frac) { return frac > 0.5 ? "#6fdc7a" : frac > 0.25 ? "#ffd166" : "#ff6b6b"; }

function drawUnitCues(ctx) {
  const pl = player();
  for (const m of _monsters) {
    if (!m.alive || m.spawnT > 0) continue;
    const p = toScreen(unitX(m), unitY(m), m.z + m.def.r * 2.6 + 10);
    if (p.behind) continue;
    const w = (m.def.boss ? 70 : 34) * p.s;
    const isTarget = pl.target === m;
    drawBar(ctx, p.x - w / 2, p.y - 4, w, 4 * p.s, m.hp / m.maxHp, isTarget ? "#ff8a6a" : "#d9534f");
    if (isTarget) {
      // Target marker: a bobbing chevron over the head, Tales style.
      const bob = Math.sin(_frame * 0.15) * 3;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 8 * p.s + bob);
      ctx.lineTo(p.x - 7 * p.s, p.y - 20 * p.s + bob);
      ctx.lineTo(p.x + 7 * p.s, p.y - 20 * p.s + bob);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const u of _party) {
    if (u.isPlayer) {
      if (!u.alive) continue;
      const p = toScreen(unitX(u), unitY(u), u.z + u.def.r * 2.6 + 12);
      if (p.behind) continue;
      // The player's own marker: a small ring at the feet in the party colour.
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y - 8 * p.s, 3 * p.s, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    const p = toScreen(unitX(u), unitY(u), u.z + u.def.r * 2.6 + 10);
    if (p.behind) continue;
    if (u.alive) drawBar(ctx, p.x - 16 * p.s, p.y - 4, 32 * p.s, 3.5 * p.s, u.hp / u.maxHp, hpColor(u.hp / u.maxHp));
    else {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = `bold ${Math.round(11 * p.s)}px ${HUD_FONT}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("KO", p.x, p.y);
    }
  }
  // Cast labels.
  for (const u of _party) {
    if (!u.alive || !u.cast) continue;
    const p = toScreen(unitX(u), unitY(u), u.z + 60);
    if (p.behind) continue;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = `bold ${Math.round(10 * p.s)}px ${HUD_FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(u.cast.name).width + 14;
    roundRect(ctx, p.x - w / 2, p.y - 8 * p.s, w, 16 * p.s, 6); ctx.fill();
    ctx.fillStyle = "#e8d8ff";
    ctx.fillText(u.cast.name, p.x, p.y);
    drawBar(ctx, p.x - w / 2 + 4, p.y + 9 * p.s, w - 8, 2.5, u.cast.t / u.cast.T, "#c8a8ff");
  }
}

function drawFloaters(ctx) {
  for (const f of _floaters) {
    const k = f.t / 50;
    const p = toScreen(f.x, f.y, f.z + k * 40);
    if (p.behind) continue;
    ctx.save();
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const size = (f.big ? 20 : 13) * p.s * (f.t < 4 ? 1.4 - f.t * 0.1 : 1);
    ctx.font = `bold ${Math.round(size)}px ${HUD_FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText(f.text, p.x, p.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, p.x, p.y);
    ctx.restore();
  }
}

function drawPartyPanel(ctx, u, x, y, w, h) {
  const isP = u.isPlayer;
  ctx.fillStyle = isP ? "rgba(20,26,40,0.86)" : "rgba(14,18,28,0.8)";
  roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = isP ? hexCss(u.def.color) : "rgba(255,255,255,0.14)";
  ctx.lineWidth = isP ? 1.5 : 1;
  ctx.stroke();
  // Portrait glyph on a coloured disc.
  ctx.fillStyle = hexCss(u.def.color);
  ctx.beginPath(); ctx.arc(x + 20, y + h / 2, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#0d1117";
  ctx.font = `bold 15px ${HUD_FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(u.def.portrait, x + 20, y + h / 2 + 1);
  ctx.textAlign = "left";
  ctx.fillStyle = u.alive ? "#e6edf3" : "#ff6b6b";
  ctx.font = `bold 12px ${HUD_FONT}`;
  ctx.fillText(u.alive ? u.def.name : u.def.name + " · KO", x + 42, y + 11);
  ctx.fillStyle = isP ? hexCss(u.def.color) : "rgba(255,255,255,0.5)";
  ctx.font = `${isP ? "bold " : ""}10px ${HUD_FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(isP ? "YOU" : u.def.cls, x + w - 8, y + 11);
  ctx.textAlign = "left";
  const bx = x + 42, bw = w - 52;
  drawBar(ctx, bx, y + 21, bw, 7, u.hp / u.maxHp, hpColor(u.hp / u.maxHp));
  drawBar(ctx, bx, y + 31, bw, 5, u.tp / u.maxTp, "#5aa9ff");
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `9px ${HUD_FONT}`;
  ctx.fillText(`${Math.ceil(u.hp)}/${u.maxHp}`, bx + 2, y + 44);
  ctx.textAlign = "right";
  ctx.fillText(`TP ${u.tp}`, bx + bw, y + 44);
  if (isP) {
    // Overlimit gauge: a vertical bar along the panel's left edge, filling upward.
    const gh = h - 10;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    roundRect(ctx, x - 10, y + 5, 5, gh, 2.5); ctx.fill();
    const fh = Math.max(3, gh * u.ol);
    ctx.fillStyle = u.ol >= 1 ? (Math.floor(_frame / 6) % 2 ? "#ffffff" : "#ffd166") : "#ffb84a";
    roundRect(ctx, x - 10, y + 5 + gh - fh, 5, fh, 2.5); ctx.fill();
  }
}

function drawHUD(ctx) {
  const W = VIEW_W, H = VIEW_H;
  // Party panels along the bottom.
  const pw = 164, ph = 50, gap = 8;
  const total = _party.length * pw + (_party.length - 1) * gap;
  const x0 = (W - total) / 2 + 6;
  _party.forEach((u, i) => drawPartyPanel(ctx, u, x0 + i * (pw + gap), H - ph - 10, pw, ph));

  if (_phase === "title") return;

  // Wave and roster, top-left.
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(ctx, 12, 12, 220, 46, 8); ctx.fill();
  ctx.fillStyle = "#e6edf3";
  ctx.font = `bold 14px ${HUD_FONT}`;
  ctx.fillText(`WAVE ${_wave} / ${WAVES.length}`, 22, 18);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `11px ${HUD_FONT}`;
  ctx.fillText(WAVE_TITLES[_wave - 1] || "", 22, 38);
  const left = _monsters.filter(m => m.alive).length;
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffb4a0";
  ctx.font = `bold 13px ${HUD_FONT}`;
  ctx.fillText(`${left} foe${left === 1 ? "" : "s"}`, 222, 20);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `11px ${HUD_FONT}`;
  const secs = Math.floor(_clock / 60);
  ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, 222, 38);

  // Target readout, top-right.
  const t = player().target;
  if (t && t.alive) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRect(ctx, W - 232, 12, 220, 46, 8); ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd166";
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.fillText(t.def.name, W - 222, 18);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `11px ${HUD_FONT}`;
    ctx.fillText(`${Math.ceil(t.hp)} / ${t.maxHp}`, W - 22, 20);
    drawBar(ctx, W - 222, 40, 200, 8, t.hp / t.maxHp, "#ff7a5a");
  }

  // Combo counter.
  if (_combo >= 2 && _comboT > 0) {
    const pop = _comboT > COMBO_DROP - 4 ? 1.25 : 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(30 * pop)}px ${HUD_FONT}`;
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText(`${_combo} HITS`, W / 2, 84);
    ctx.fillStyle = _combo >= 20 ? "#ffd166" : "#e6edf3";
    ctx.fillText(`${_combo} HITS`, W / 2, 84);
  }

  // Overlimit banner on the player.
  const pl = player();
  if (pl.overlimit > 0) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold 13px ${HUD_FONT}`;
    ctx.fillStyle = `rgba(255,209,102,${0.6 + 0.4 * Math.sin(_frame * 0.25)})`;
    ctx.fillText(`OVERLIMIT  ${(pl.overlimit / 60).toFixed(1)}s`, W / 2, 112);
  }

  // Hints / touch buttons.
  if (_isTouch) drawTouchButtons(ctx);
  else if (_hintT > 0 && (_phase === "fight" || _phase === "banner")) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.7, _hintT / 60)})`;
    ctx.font = `11px ${HUD_FONT}`;
    ctx.fillText("WASD move · J / click attack · K arte (hold toward / away from the target for other artes) · L guard · SPACE Mystic Arte when the gauge is full · TAB target", W / 2, H - 72);
  }
}

function drawTouchButtons(ctx) {
  const pl = player();
  for (const key of Object.keys(BTN)) {
    const b = BTN[key];
    const ready = key === "burst" ? pl.ol >= 1 : key === "arte" ? pl.tp >= 8 || pl.overlimit > 0 : true;
    ctx.fillStyle = key === "burst" && ready ? "rgba(255,209,102,0.55)" : "rgba(255,255,255,0.14)";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ready ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = ready ? "#ffffff" : "rgba(255,255,255,0.4)";
    ctx.font = `bold 11px ${HUD_FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(b.label, b.x, b.y);
  }
  if (_pointer.active && _pointer.steer) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(_pointer.startX, _pointer.startY, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    const dx = _pointer.x - _pointer.startX, dy = _pointer.y - _pointer.startY;
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 34) * 34 / d;
    ctx.beginPath(); ctx.arc(_pointer.startX + dx * k, _pointer.startY + dy * k, 12, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBanners(ctx) {
  const W = VIEW_W, H = VIEW_H;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (_phase === "banner") {
    const k = _phaseT / WAVE_BANNER_FRAMES;
    const a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, H / 2 - 44, W, 88);
    ctx.fillStyle = "#ffd166";
    ctx.font = `bold 34px ${HUD_FONT}`;
    ctx.fillText(`WAVE ${_wave}`, W / 2, H / 2 - 12);
    ctx.fillStyle = "#e6edf3";
    ctx.font = `16px ${HUD_FONT}`;
    ctx.fillText(WAVE_TITLES[_wave - 1], W / 2, H / 2 + 20);
    ctx.restore();
  } else if (_phase === "cleared") {
    const k = _phaseT / CLEAR_FRAMES;
    ctx.save();
    ctx.globalAlpha = k < 0.1 ? k / 0.1 : k > 0.85 ? (1 - k) / 0.15 : 1;
    ctx.fillStyle = "#8ce99a";
    ctx.font = `bold 30px ${HUD_FONT}`;
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.strokeText("WAVE CLEARED", W / 2, H / 2 - 30);
    ctx.fillText("WAVE CLEARED", W / 2, H / 2 - 30);
    ctx.fillStyle = "#e6edf3";
    ctx.font = `13px ${HUD_FONT}`;
    ctx.strokeText("HP +55% · TP restored", W / 2, H / 2 + 2);
    ctx.fillText("HP +55% · TP restored", W / 2, H / 2 + 2);
    ctx.restore();
  } else if (_phase === "mystic" && _mystic) {
    const k = _mystic.t / MYSTIC_FRAMES;
    ctx.save();
    // Letterbox and a name card, then a white-out into the blast.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, 56); ctx.fillRect(0, H - 56, W, 56);
    ctx.globalAlpha = Math.min(1, k * 4);
    ctx.fillStyle = "#ffd166";
    ctx.font = `bold italic 40px ${HUD_FONT}`;
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.8)";
    const slide = (1 - Math.min(1, k * 3)) * 60;
    ctx.strokeText(MYSTIC.name, W / 2 + slide, H / 2 - 70);
    ctx.fillText(MYSTIC.name, W / 2 + slide, H / 2 - 70);
    ctx.font = `13px ${HUD_FONT}`;
    ctx.fillStyle = "#e6edf3";
    ctx.fillText("MYSTIC ARTE", W / 2 + slide, H / 2 - 40);
    if (k > 0.82) { ctx.globalAlpha = (k - 0.82) / 0.18; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  } else if (_phase === "victory" || _phase === "defeat") {
    drawResults(ctx);
  }
}

function drawResults(ctx) {
  const W = VIEW_W, H = VIEW_H;
  const won = _phase === "victory";
  ctx.save();
  ctx.fillStyle = "rgba(6,9,14,0.72)";
  ctx.fillRect(0, 0, W, H - 70);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = won ? "#ffd166" : "#ff6b6b";
  ctx.font = `bold 38px ${HUD_FONT}`;
  ctx.fillText(won ? "GAUNTLET COMPLETE" : "PARTY DEFEATED", W / 2, 78);
  ctx.fillStyle = "#e6edf3";
  ctx.font = `14px ${HUD_FONT}`;
  ctx.fillText(won ? "All ten waves cleared — the Ashen Drake is down." : `Fell on wave ${_wave} · ${WAVE_TITLES[_wave - 1]}`, W / 2, 112);
  const secs = Math.floor(_clock / 60);
  const rows = [
    ["Time", `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`],
    ["Max combo", `${_maxCombo} hits`],
    ["Damage dealt", `${_totalDamage}`],
    ["Party KOs", `${_kos}`],
    ["Retries", `${_retries}`],
  ];
  if (won) {
    const score = _maxCombo * 3 - _kos * 25 - _retries * 40 - Math.max(0, secs - 240) * 0.5;
    const rank = score > 120 ? "S" : score > 70 ? "A" : score > 20 ? "B" : "C";
    rows.push(["Rank", rank]);
  }
  ctx.font = `13px ${HUD_FONT}`;
  rows.forEach(([k, v], i) => {
    const y = 150 + i * 24;
    ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillText(k, W / 2 - 12, y);
    ctx.textAlign = "left"; ctx.fillStyle = k === "Rank" ? "#ffd166" : "#e6edf3"; ctx.font = k === "Rank" ? `bold 18px ${HUD_FONT}` : `13px ${HUD_FONT}`; ctx.fillText(v, W / 2 + 12, y);
    ctx.font = `13px ${HUD_FONT}`;
  });
  // Per-member damage.
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `11px ${HUD_FONT}`;
  ctx.fillText(_party.map(p => `${p.def.name} ${p.dealt || 0}`).join("   ·   "), W / 2, 150 + rows.length * 24 + 4);
  if (_frame >= _lockUntil) {
    ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(_frame * 0.1)})`;
    ctx.font = `bold 14px ${HUD_FONT}`;
    ctx.fillText(won ? (_isTouch ? "tap to play again" : "SPACE / click — play again") : (_isTouch ? "tap to retry the wave" : "SPACE / click — retry this wave"), W / 2, H - 100);
  }
  ctx.restore();
}

function drawTitle(ctx) {
  const W = VIEW_W, H = VIEW_H;
  ctx.save();
  ctx.fillStyle = "rgba(6,9,14,0.6)";
  ctx.fillRect(0, 0, W, H - 70);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffd166";
  ctx.font = `bold italic 46px ${HUD_FONT}`;
  ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.strokeText("BLADE WALTZ", W / 2, 76);
  ctx.fillText("BLADE WALTZ", W / 2, 76);
  ctx.fillStyle = "#e6edf3";
  ctx.font = `14px ${HUD_FONT}`;
  ctx.fillText("A linear-motion battle gauntlet — ten waves, one party, no switching.", W / 2, 110);
  // Controls.
  const lines = _isTouch
    ? ["Hold the left side to run", "ATK — attack combo · ARTE — arte (aim by holding toward / away from the target)", "GRD — guard · OL — Mystic Arte when the gauge is full"]
    : ["WASD / arrows — run (relative to the camera)", "J or click — 3-hit combo · K — arte: neutral Demon Fang, toward the target Sonic Thrust, away Tiger Blade", "L — guard (hold) · SPACE — Mystic Arte when the Overlimit gauge is full · TAB — next target"];
  ctx.font = `12px ${HUD_FONT}`;
  lines.forEach((l, i) => { ctx.fillStyle = i === 0 ? "#e6edf3" : "rgba(255,255,255,0.75)"; ctx.fillText(l, W / 2, 152 + i * 20); });
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `11px ${HUD_FONT}`;
  ctx.fillText("Normal hits refill TP · every hit charges Overlimit · the Sage heals, revives and casts · the Archer kites · the Lancer brawls", W / 2, 226);
  ctx.fillText("Guard covers your front only. Artes and spells ignore guard direction. Stone golems and bosses shrug off single hits — chain them.", W / 2, 244);
  ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(_frame * 0.1)})`;
  ctx.font = `bold 15px ${HUD_FONT}`;
  ctx.fillText(_isTouch ? "tap to begin" : "click or press J / SPACE to begin", W / 2, 300);
  if (!_isTouch) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = `11px ${HUD_FONT}`;
    ctx.fillText("practice: press a digit to start at that wave (0 = the drake)", W / 2, 324);
  }
  ctx.restore();
}

// ── Rendering: 3D ─────────────────────────────────────────────────────────
// Coordinates: the scene mirrors world Y (scene = (x, -y, z)), +Z is up. Every
// rig is built in a root Group whose local +Y is "forward", +Z is up, so the
// only thing placement ever does is set the root's position and Z rotation.
let _scene3d = null;
let _env = null;
let _figs = new Map();          // unit record → figure handle
let _shadowMeshes = new Map();  // unit record → blob shadow
let _projMeshes = new Map();    // projectile record → mesh
let _castMeshes = new Map();    // caster → { ring, arc }
let _slashPool = [], _ringPool = [], _partPool = [], _telePool = [], _zonePool = [];
let _mysticFx = null;
let _sharedGeo = null;
const GROUND_Z = 1;

function srand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

function lam(color, extra = {}) {
  return new _THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
}
function box3(w, d, h, material) {
  return new _THREE.Mesh(new _THREE.BoxGeometry(w, d, h), material);
}
function darkenHex(hex, k) {
  const r = Math.round(((hex >> 16) & 0xff) * k), g = Math.round(((hex >> 8) & 0xff) * k), b = Math.round((hex & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}
// Remember a joint's rest transform so the pose layers can start clean.
function rest(obj) {
  obj.userData.rest = {
    rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z,
    px: obj.position.x, py: obj.position.y, pz: obj.position.z,
    sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z,
  };
  return obj;
}
function resetJoints(fig) {
  for (const j of fig.parts.joints) {
    const r = j.userData.rest;
    j.rotation.set(r.rx, r.ry, r.rz);
    j.position.set(r.px, r.py, r.pz);
    j.scale.set(r.sx, r.sy, r.sz);
  }
}

function ensureScene(adapter, scene) {
  if (_scene3d === scene) return;
  _scene3d = scene;
  _env = null;
  _figs = new Map();
  _shadowMeshes = new Map();
  _projMeshes = new Map();
  _castMeshes = new Map();
  _slashPool = []; _ringPool = []; _partPool = []; _telePool = []; _zonePool = [];
  _mysticFx = null;
  _projV = null;
  _sharedGeo = {
    sector: new _THREE.RingGeometry(0.72, 1, 28, 1, -1, 2),
    ring: new _THREE.RingGeometry(0.9, 1, 48),
    disc: new _THREE.CircleGeometry(1, 32),
    sphere: new _THREE.SphereGeometry(1, 8, 6),
    shadow: new _THREE.CircleGeometry(1, 20),
  };
  void adapter;
}

// ── Environment ───────────────────────────────────────────────────────────
function makeGrassTexture() {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const c = cv.getContext("2d");
  const rnd = srand(31337);
  c.fillStyle = "#4b7a3b";
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) {
    c.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
    const r = 3 + rnd() * 14;
    c.beginPath(); c.ellipse(rnd() * S, rnd() * S, r, r * 0.6, rnd() * 3, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 60; i++) {
    c.fillStyle = ["#e8d86a", "#f0f0f0", "#d98ac0"][Math.floor(rnd() * 3)];
    c.fillRect(rnd() * S, rnd() * S, 2, 2);
  }
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = _THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

function makeArenaTexture() {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const c = cv.getContext("2d");
  const cx = S / 2, cy = S / 2, k = (S / 2) / (ARENA_R + 8);
  const rnd = srand(777);
  const g = c.createRadialGradient(cx, cy, 20, cx, cy, S / 2);
  g.addColorStop(0, "#8d8a84");
  g.addColorStop(0.75, "#77746f");
  g.addColorStop(1, "#5e5b57");
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  // Flagstones: concentric rings of blocks with mortar lines.
  c.strokeStyle = "rgba(30,28,26,0.55)";
  c.lineWidth = 3;
  for (let ring = 0; ring < 5; ring++) {
    const r0 = (40 + ring * 52) * k, r1 = (92 + ring * 52) * k;
    const n = 10 + ring * 6;
    c.beginPath(); c.arc(cx, cy, r0, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (ring % 2) * 0.1;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
    }
  }
  // Weathering and moss.
  for (let i = 0; i < 400; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * ARENA_R * k;
    c.fillStyle = rnd() > 0.6 ? "rgba(70,100,60,0.18)" : rnd() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.1)";
    const s = 4 + rnd() * 18;
    c.beginPath(); c.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, s * 0.6, rnd() * 3, 0, Math.PI * 2); c.fill();
  }
  // The rune ring and the eight-point star — the same emblem the 2D floor shows.
  c.strokeStyle = "rgba(120,80,200,0.55)";
  c.lineWidth = 5;
  c.beginPath(); c.arc(cx, cy, 150 * k, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 2.5;
  c.beginPath(); c.arc(cx, cy, 138 * k, 0, Math.PI * 2); c.stroke();
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, b = a + Math.PI * 0.75;
    c.moveTo(cx + Math.cos(a) * 150 * k, cy + Math.sin(a) * 150 * k);
    c.lineTo(cx + Math.cos(b) * 150 * k, cy + Math.sin(b) * 150 * k);
  }
  c.stroke();
  c.fillStyle = "rgba(120,80,200,0.35)";
  c.beginPath(); c.arc(cx, cy, 18 * k, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    c.fillStyle = "rgba(120,80,200,0.5)";
    c.fillRect(cx + Math.cos(a) * 144 * k - 3, cy + Math.sin(a) * 144 * k - 3, 6, 6);
  }
  // Kerb.
  c.strokeStyle = "rgba(40,38,36,0.8)";
  c.lineWidth = 10;
  c.beginPath(); c.arc(cx, cy, (ARENA_R + 3) * k, 0, Math.PI * 2); c.stroke();
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  return tex;
}

function makeSkyTexture() {
  const cv = document.createElement("canvas");
  cv.width = 4; cv.height = 256;
  const c = cv.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#1d2f5c");
  g.addColorStop(0.42, "#4f7fbf");
  g.addColorStop(0.5, "#b9c9e0");
  g.addColorStop(0.56, "#f2c9a0");
  g.addColorStop(1, "#c98a68");
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 256);
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  return tex;
}

function ensureEnvironment(adapter) {
  if (_env) return;
  const T = _THREE;
  const env = { all: [], torches: [], clouds: [], pillars: [] };
  const add = (m) => { adapter.addSceneMesh(m); env.all.push(m); return m; };

  // Sky dome — inside-out sphere painted with a vertical gradient.
  const sky = new T.Mesh(new T.SphereGeometry(2400, 24, 12), new T.MeshBasicMaterial({ map: makeSkyTexture(), side: T.BackSide, depthWrite: false }));
  sky.rotation.x = Math.PI / 2;
  sky.renderOrder = -20;
  add(sky);

  // Meadow.
  const ground = new T.Mesh(new T.PlaneGeometry(4200, 4200), new T.MeshLambertMaterial({ map: makeGrassTexture() }));
  ground.position.z = 0.5;
  add(ground);

  // Arena disc.
  const disc = new T.Mesh(new T.CircleGeometry(ARENA_R + 8, 72), new T.MeshLambertMaterial({ map: makeArenaTexture() }));
  disc.position.z = GROUND_Z;
  add(disc);

  // Ring wall: a low balustrade per physics segment, pillars every third.
  const stone = createBoardMaterial(T, { tint: 0x6e6a66, worldUnitsPerTile: 24 });
  const stoneDark = lam(0x4e4a48);
  const segLen = (2 * Math.PI * (ARENA_R + WALL_T / 2)) / WALL_SEGS + 3;
  for (let i = 0; i < WALL_SEGS; i++) {
    const a = (i / WALL_SEGS) * Math.PI * 2;
    const rr = ARENA_R + WALL_T / 2;
    const seg = new T.Mesh(new T.BoxGeometry(segLen, WALL_T, 20), stone);
    seg.position.set(Math.cos(a) * rr, -Math.sin(a) * rr, GROUND_Z + 10);
    seg.rotation.z = -(a + Math.PI / 2);
    add(seg);
    const cap = new T.Mesh(new T.BoxGeometry(segLen + 2, WALL_T + 6, 4), stoneDark);
    cap.position.set(Math.cos(a) * rr, -Math.sin(a) * rr, GROUND_Z + 22);
    cap.rotation.z = seg.rotation.z;
    add(cap);
    if (i % 3 === 0) {
      const pr = ARENA_R + WALL_T / 2 + 4;
      const px = Math.cos(a) * pr, py = -Math.sin(a) * pr;
      const pillar = new T.Mesh(new T.CylinderGeometry(9, 11, 64, 8), stone);
      pillar.rotation.x = Math.PI / 2;
      pillar.position.set(px, py, GROUND_Z + 32);
      add(pillar);
      const top = new T.Mesh(new T.BoxGeometry(26, 26, 6), stoneDark);
      top.position.set(px, py, GROUND_Z + 67);
      add(top);
      // Torch: a bracket, a flame that flickers in the sync pass, and on every
      // other pillar a real point light.
      const bracket = new T.Mesh(new T.CylinderGeometry(2, 2, 14, 6), lam(0x2e2a28));
      bracket.rotation.x = Math.PI / 2;
      bracket.position.set(px, py, GROUND_Z + 77);
      add(bracket);
      const flame = new T.Mesh(new T.ConeGeometry(5, 13, 7), new T.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.95 }));
      flame.rotation.x = Math.PI / 2;
      flame.position.set(px, py, GROUND_Z + 92);
      add(flame);
      const core = new T.Mesh(new T.SphereGeometry(3.5, 8, 6), new T.MeshBasicMaterial({ color: 0xfff0b0 }));
      core.position.set(px, py, GROUND_Z + 86);
      add(core);
      env.torches.push({ flame, core, phase: i });
      // Pillars between the eye and the fight are hidden per frame (see
      // syncEnvironment) — a torch in the middle of the screen is the one
      // thing this camera cannot tolerate.
      const group = { x: px, y: py, meshes: [pillar, top, bracket, flame, core] };
      env.pillars.push(group);
      if (i % 6 === 0) {
        const light = new T.PointLight(0xff9a40, 9000, 340, 2);
        light.position.set(px, py, GROUND_Z + 92);
        add(light);
      }
    }
  }
  // A soft sky/ground fill so the flat-shaded meadow reads as outdoors.
  add(new T.HemisphereLight(0xa8c8ff, 0x3a4a2a, 0.55));

  // Boulders, trees, hills and mountains — placed by a seeded generator so the
  // meadow is the same every load. Everything near the ring stays low enough
  // for the chase camera to look over it.
  const rnd = srand(4242);
  const rockMat = lam(0x7a7c80);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = 350 + rnd() * 420;
    const s = 8 + rnd() * 16;
    const rock = new T.Mesh(new T.IcosahedronGeometry(s, 0), rockMat);
    rock.position.set(Math.cos(a) * r, Math.sin(a) * r, GROUND_Z + s * 0.5);
    rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    rock.scale.set(1, 1, 0.65);
    add(rock);
  }
  const trunkMat = lam(0x5a3d2a);
  const leafMats = [lam(0x2f6b3a), lam(0x3b7f44), lam(0x27583a)];
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r = 470 + rnd() * 700;
    const h = 60 + rnd() * 70;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const trunk = new T.Mesh(new T.CylinderGeometry(4, 6, h * 0.5, 6), trunkMat);
    trunk.rotation.x = Math.PI / 2;
    trunk.position.set(x, y, GROUND_Z + h * 0.25);
    add(trunk);
    const mat = leafMats[Math.floor(rnd() * leafMats.length)];
    const c1 = new T.Mesh(new T.ConeGeometry(h * 0.32, h * 0.55, 7), mat);
    c1.rotation.x = Math.PI / 2;
    c1.position.set(x, y, GROUND_Z + h * 0.62);
    add(c1);
    const c2 = new T.Mesh(new T.ConeGeometry(h * 0.22, h * 0.45, 7), mat);
    c2.rotation.x = Math.PI / 2;
    c2.position.set(x, y, GROUND_Z + h * 0.95);
    add(c2);
  }
  const hillMat = lam(0x3e5a3a);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + rnd() * 0.3, r = 1000 + rnd() * 300;
    const h = 120 + rnd() * 160;
    const hill = new T.Mesh(new T.ConeGeometry(220 + rnd() * 160, h, 9), hillMat);
    hill.rotation.x = Math.PI / 2;
    hill.position.set(Math.cos(a) * r, Math.sin(a) * r, GROUND_Z + h / 2 - 4);
    add(hill);
  }
  const mtnMats = [lam(0x55658a), lam(0x60729a), lam(0x4a5a7c)];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rnd() * 0.25, r = 1550 + rnd() * 350;
    const h = 320 + rnd() * 380;
    const m = new T.Mesh(new T.ConeGeometry(260 + rnd() * 220, h, 6), mtnMats[i % 3]);
    m.rotation.x = Math.PI / 2;
    m.rotation.y = rnd() * 3;
    m.position.set(Math.cos(a) * r, Math.sin(a) * r, GROUND_Z + h / 2 - 10);
    add(m);
    // Snow cap.
    const cap = new T.Mesh(new T.ConeGeometry((260 + rnd() * 220) * 0.28, h * 0.28, 6), lam(0xe8eef8));
    cap.rotation.copy(m.rotation);
    cap.position.set(m.position.x, m.position.y, GROUND_Z + h - h * 0.14 - 10);
    add(cap);
  }
  // Clouds: clusters of flattened blobs, drifting.
  const cloudMat = new T.MeshLambertMaterial({ color: 0xf6f3f0, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 12; i++) {
    const g = new T.Group();
    const a = rnd() * Math.PI * 2, r = 500 + rnd() * 1200;
    g.position.set(Math.cos(a) * r, Math.sin(a) * r, 420 + rnd() * 240);
    for (let j = 0; j < 4; j++) {
      const s = 30 + rnd() * 40;
      const b = new T.Mesh(new T.IcosahedronGeometry(s, 0), cloudMat);
      b.position.set((j - 1.5) * s * 1.1, rnd() * 20, rnd() * 10);
      b.scale.set(1, 0.9, 0.45);
      g.add(b);
    }
    add(g);
    env.clouds.push({ g, speed: 0.05 + rnd() * 0.08 });
  }
  // Sun.
  const sun = new T.Mesh(new T.SphereGeometry(70, 12, 8), new T.MeshBasicMaterial({ color: 0xfff2c8 }));
  sun.position.set(-1500, 1300, 900);
  add(sun);

  _env = env;
}

function syncEnvironment() {
  if (!_env) return;
  // Cull the pillars the camera is about to look through. `_camEye` is the
  // eye in scene XY from placeCamera3d, which runs first.
  for (const pg of _env.pillars) {
    const d = Math.hypot(pg.x - _camEye.x, pg.y - _camEye.y);
    const show = d > 150;
    for (const m of pg.meshes) m.visible = show;
  }
  for (const t of _env.torches) {
    const f = 0.85 + Math.sin(_frame * 0.31 + t.phase) * 0.15 + Math.sin(_frame * 0.77 + t.phase * 2) * 0.08;
    t.flame.scale.set(f, 1 + (f - 1) * 1.6, f);
    t.flame.rotation.z = Math.sin(_frame * 0.2 + t.phase) * 0.15;
  }
  for (const c of _env.clouds) {
    c.g.position.x += c.speed;
    if (c.g.position.x > 1800) c.g.position.x = -1800;
  }
}

// ── Rigs: humanoid ────────────────────────────────────────────────────────
// A jointed low-poly figure: hips, torso, a neck, two-segment arms and legs,
// hair, an optional cape and a weapon in the right (or left) hand. All joint
// groups use "ZYX" rotation order so `rotation.x` swings a limb fore/aft and
// `rotation.z` then sweeps it sideways — the order a shoulder actually moves.
function buildHuman(unit, rig) {
  const T = _THREE;
  const u = unit * (rig.scale ?? 1);
  const root = new T.Group();
  const parts = { joints: [], flashMats: [] };
  const bulk = rig.bulk ?? 1;
  const golem = !!rig.golem;

  const skinMat = lam(rig.skin);
  const coatMat = lam(rig.coat);
  const trimMat = lam(rig.trim);
  const pantsMat = lam(rig.pants);
  const bootMat = lam(rig.boots);
  const hairMat = lam(rig.hairColor ?? 0x2a2a30);
  parts.flashMats.push(skinMat, coatMat, pantsMat);

  const thighL = u * 0.56, shinL = u * 0.5, bootH = u * 0.18;
  const legLen = thighL + shinL + bootH;
  const torsoH = u * 0.95;
  const torsoTop = legLen + torsoH;

  // Legs.
  for (const side of ["left", "right"]) {
    const sx = side === "left" ? -1 : 1;
    const hip = new T.Group();
    hip.rotation.order = "ZYX";
    hip.position.set(sx * u * 0.22 * bulk, 0, legLen);
    const thigh = box3(u * 0.3 * bulk, u * 0.32, thighL, pantsMat);
    thigh.position.z = -thighL / 2;
    hip.add(thigh);
    const knee = new T.Group();
    knee.position.z = -thighL;
    const shin = box3(u * 0.26 * bulk, u * 0.28, shinL, golem ? pantsMat : bootMat);
    shin.position.z = -shinL / 2;
    knee.add(shin);
    const boot = box3(u * 0.3 * bulk, u * 0.5, bootH, bootMat);
    boot.position.set(0, u * 0.08, -shinL - bootH / 2);
    knee.add(boot);
    hip.add(knee);
    root.add(hip);
    parts[side + "Hip"] = rest(hip);
    parts[side + "Knee"] = rest(knee);
    parts.joints.push(hip, knee);
  }

  // Hips/torso group — lean and twist happen here.
  const torsoG = new T.Group();
  torsoG.position.z = legLen;
  root.add(torsoG);
  parts.torso = rest(torsoG);
  parts.joints.push(torsoG);
  const torso = box3(u * 0.9 * bulk, u * 0.5 * bulk, torsoH, coatMat);
  torso.position.z = torsoH / 2;
  torsoG.add(torso);
  const belt = box3(u * 0.94 * bulk, u * 0.54 * bulk, u * 0.1, trimMat);
  belt.position.z = u * 0.1;
  torsoG.add(belt);
  if (golem) {
    const core = new T.Mesh(new T.OctahedronGeometry(u * 0.16, 0), new T.MeshBasicMaterial({ color: 0xffa040 }));
    core.position.set(0, u * 0.27 * bulk, torsoH * 0.6);
    torsoG.add(core);
    parts.core = core;
    // Moss and cracks: a few dark slabs.
    for (let i = 0; i < 3; i++) {
      const s = box3(u * 0.3, u * 0.06, u * 0.2, lam(0x4a6a3a));
      s.position.set((i - 1) * u * 0.3, u * 0.27 * bulk, torsoH * (0.25 + i * 0.25));
      torsoG.add(s);
    }
  }
  for (const sx of [-1, 1]) {
    const pad = box3(u * 0.3, u * 0.5 * bulk, u * 0.16, trimMat);
    pad.position.set(sx * u * 0.52 * bulk, 0, torsoH - u * 0.02);
    torsoG.add(pad);
  }

  // Arms.
  const upperL = u * 0.5, foreL = u * 0.45;
  for (const side of ["left", "right"]) {
    const sx = side === "left" ? -1 : 1;
    const shoulder = new T.Group();
    shoulder.rotation.order = "ZYX";
    shoulder.position.set(sx * u * 0.58 * bulk, 0, torsoH - u * 0.1);
    const upper = box3(u * 0.24 * bulk, u * 0.26, upperL, coatMat);
    upper.position.z = -upperL / 2;
    shoulder.add(upper);
    const elbow = new T.Group();
    elbow.rotation.order = "ZYX";
    elbow.position.z = -upperL;
    const fore = box3(u * 0.22 * bulk, u * 0.24, foreL, golem ? coatMat : skinMat);
    fore.position.z = -foreL / 2;
    elbow.add(fore);
    const hand = new T.Group();
    hand.rotation.order = "ZYX";
    hand.position.z = -foreL - u * 0.08;
    const fist = box3(u * 0.22 * bulk, u * 0.24, u * 0.18, skinMat);
    hand.add(fist);
    elbow.add(hand);
    shoulder.add(elbow);
    torsoG.add(shoulder);
    parts[side + "Shoulder"] = rest(shoulder);
    parts[side + "Elbow"] = rest(elbow);
    parts[side + "Hand"] = rest(hand);
    parts.joints.push(shoulder, elbow, hand);
  }

  // Head.
  const neck = new T.Group();
  neck.rotation.order = "ZYX";
  neck.position.z = torsoH;
  torsoG.add(neck);
  parts.neck = rest(neck);
  parts.joints.push(neck);
  const headW = golem ? u * 0.5 : u * 0.62;
  const head = box3(headW, headW * 0.95, u * 0.64, skinMat);
  head.position.z = u * 0.42;
  neck.add(head);
  const eyeMat = golem ? new T.MeshBasicMaterial({ color: 0xffa040 }) : lam(0x14181d);
  for (const sx of [-1, 1]) {
    const eye = box3(u * 0.08, u * 0.04, u * 0.1, eyeMat);
    eye.position.set(sx * headW * 0.25, headW * 0.49, u * 0.46);
    neck.add(eye);
  }
  const hair = rig.hair || "none";
  if (hair !== "none") {
    const cap = box3(headW * 1.08, headW * 1.02, u * 0.16, hairMat);
    cap.position.set(0, -headW * 0.03, u * 0.74);
    neck.add(cap);
    // Fringe.
    const fringe = box3(headW * 1.08, headW * 0.18, u * 0.22, hairMat);
    fringe.position.set(0, headW * 0.46, u * 0.66);
    neck.add(fringe);
  }
  if (hair === "long") {
    const back = box3(headW * 1.06, headW * 0.22, u * 0.9, hairMat);
    back.position.set(0, -headW * 0.5, u * 0.36);
    neck.add(back);
  } else if (hair === "ponytail") {
    const tail = new T.Group();
    tail.position.set(0, -headW * 0.5, u * 0.7);
    const strand = box3(headW * 0.3, headW * 0.25, u * 0.8, hairMat);
    strand.position.z = -u * 0.4;
    strand.position.y = -u * 0.1;
    tail.add(strand);
    neck.add(tail);
    parts.tail = rest(tail);
    parts.joints.push(tail);
  } else if (hair === "hood") {
    const hood = box3(headW * 1.25, headW * 1.2, u * 0.5, hairMat);
    hood.position.set(0, -headW * 0.08, u * 0.6);
    neck.add(hood);
    const cowl = box3(headW * 1.3, headW * 0.3, u * 0.5, hairMat);
    cowl.position.set(0, -headW * 0.55, u * 0.15);
    neck.add(cowl);
  } else if (hair === "short") {
    const tuft = box3(headW * 0.5, headW * 0.5, u * 0.14, hairMat);
    tuft.position.set(0, 0, u * 0.86);
    neck.add(tuft);
  }
  if (rig.tusks) {
    for (const sx of [-1, 1]) {
      const tusk = new T.Mesh(new T.ConeGeometry(u * 0.05, u * 0.22, 5), lam(0xf0e8d0));
      tusk.position.set(sx * headW * 0.22, headW * 0.5, u * 0.2);
      tusk.rotation.x = -0.4;
      neck.add(tusk);
    }
  }

  // Cape: hangs from the shoulders, flaps in the sync pass.
  if (rig.cape) {
    const capeG = new T.Group();
    capeG.position.set(0, -u * 0.27 * bulk, torsoH - u * 0.05);
    const cloth = box3(u * 0.95 * bulk, u * 0.06, u * 1.35, lam(rig.cape));
    cloth.position.z = -u * 0.675;
    capeG.add(cloth);
    torsoG.add(capeG);
    parts.cape = rest(capeG);
    parts.joints.push(capeG);
  }

  // Weapon in the right hand (bow in the left). Built along the hand's +Y so
  // the arm's own swing points it.
  const gunMetal = lam(0xb8c0cc);
  const steel = lam(0xd8dee8);
  const wood = lam(0x6b4a2e);
  const w = rig.weapon;
  const grip = (hand) => { const g = new T.Group(); g.rotation.order = "ZYX"; hand.add(g); return rest(g); };
  if (w === "sword") {
    const g = grip(parts.rightHand);
    const blade = box3(u * 0.1, u * 1.55, u * 0.05, steel);
    blade.position.y = u * 0.9;
    g.add(blade);
    const guard = box3(u * 0.4, u * 0.08, u * 0.12, trimMat);
    guard.position.y = u * 0.12;
    g.add(guard);
    const pommel = box3(u * 0.12, u * 0.14, u * 0.12, trimMat);
    pommel.position.y = -u * 0.2;
    g.add(pommel);
    parts.weapon = g;
  } else if (w === "lance") {
    const g = grip(parts.rightHand);
    const shaft = box3(u * 0.08, u * 2.6, u * 0.08, wood);
    shaft.position.y = u * 0.9;
    g.add(shaft);
    const tip = new T.Mesh(new T.ConeGeometry(u * 0.12, u * 0.5, 4), steel);
    tip.position.y = u * 2.4;
    g.add(tip);
    const collar = box3(u * 0.22, u * 0.12, u * 0.22, trimMat);
    collar.position.y = u * 2.1;
    g.add(collar);
    parts.weapon = g;
  } else if (w === "bow") {
    const g = grip(parts.leftHand);
    for (const s of [-1, 1]) {
      const limb = box3(u * 0.06, u * 0.06, u * 0.7, wood);
      limb.position.set(0, u * 0.1, s * u * 0.4);
      limb.rotation.x = s * 0.35;
      g.add(limb);
    }
    const string = box3(u * 0.02, u * 0.02, u * 1.5, lam(0xe8e8e8));
    string.position.set(0, -u * 0.12, 0);
    g.add(string);
    parts.weapon = g;
    const quiver = new T.Mesh(new T.CylinderGeometry(u * 0.11, u * 0.09, u * 0.8, 6), wood);
    quiver.position.set(u * 0.3, -u * 0.3 * bulk, torsoH * 0.7);
    quiver.rotation.set(Math.PI / 2, 0, 0.35);
    torsoG.add(quiver);
  } else if (w === "staff") {
    const g = grip(parts.rightHand);
    const shaft = box3(u * 0.08, u * 2.2, u * 0.08, wood);
    shaft.position.y = u * 0.7;
    g.add(shaft);
    const crystalMat = new T.MeshBasicMaterial({ color: 0xc8a8ff });
    const crystal = new T.Mesh(new T.OctahedronGeometry(u * 0.18, 0), crystalMat);
    crystal.position.y = u * 1.9;
    g.add(crystal);
    parts.crystal = crystal;
    parts.weapon = g;
  } else if (w === "dagger") {
    const g = grip(parts.rightHand);
    const blade = box3(u * 0.08, u * 0.7, u * 0.04, gunMetal);
    blade.position.y = u * 0.45;
    g.add(blade);
    const hilt = box3(u * 0.24, u * 0.06, u * 0.08, trimMat);
    hilt.position.y = u * 0.1;
    g.add(hilt);
    parts.weapon = g;
  } else if (w === "club") {
    const g = grip(parts.rightHand);
    const shaft = new T.Mesh(new T.CylinderGeometry(u * 0.14, u * 0.08, u * 1.6, 6), wood);
    shaft.position.y = u * 0.7;
    g.add(shaft);
    const head = new T.Mesh(new T.IcosahedronGeometry(u * 0.28, 0), lam(0x5a4a3a));
    head.position.y = u * 1.5;
    g.add(head);
    for (let i = 0; i < 4; i++) {
      const spike = new T.Mesh(new T.ConeGeometry(u * 0.05, u * 0.16, 4), gunMetal);
      const a = (i / 4) * Math.PI * 2;
      spike.position.set(Math.cos(a) * u * 0.3, u * 1.5, Math.sin(a) * u * 0.3);
      spike.rotation.set(Math.PI / 2 * Math.sin(a), 0, -Math.PI / 2 * Math.cos(a));
      g.add(spike);
    }
    parts.weapon = g;
  }
  if (parts.weapon) parts.joints.push(parts.weapon);

  parts.legLen = legLen;
  parts.torsoH = torsoH;
  parts.u = u;
  return { root, parts, kind: "human" };
}

// ── Rigs: monsters ────────────────────────────────────────────────────────
function buildSlime(unit, color) {
  const T = _THREE;
  const root = new T.Group();
  const parts = { joints: [], flashMats: [] };
  const mat = new T.MeshPhongMaterial({ color, shininess: 90, specular: 0x88ffaa, flatShading: true, transparent: true, opacity: 0.92 });
  parts.flashMats.push(mat);
  const body = new T.Mesh(new T.IcosahedronGeometry(unit * 1.15, 1), mat);
  body.position.z = unit * 0.95;
  body.scale.set(1, 1, 0.85);
  root.add(body);
  parts.body = rest(body);
  parts.joints.push(body);
  for (const sx of [-1, 1]) {
    const eye = new T.Mesh(new T.SphereGeometry(unit * 0.2, 8, 6), lam(0xffffff));
    eye.position.set(sx * unit * 0.4, unit * 0.85, unit * 1.15);
    root.add(eye);
    const pupil = new T.Mesh(new T.SphereGeometry(unit * 0.1, 6, 5), lam(0x14181d));
    pupil.position.set(sx * unit * 0.42, unit * 1.02, unit * 1.17);
    root.add(pupil);
  }
  const mouth = box3(unit * 0.5, unit * 0.1, unit * 0.08, lam(0x1a3a22));
  mouth.position.set(0, unit * 1.05, unit * 0.7);
  root.add(mouth);
  parts.u = unit;
  return { root, parts, kind: "slime" };
}

function buildWolf(unit, color) {
  const T = _THREE;
  const u = unit;
  const root = new T.Group();
  const parts = { joints: [], flashMats: [] };
  const fur = lam(color), belly = lam(darkenHex(color, 1.25)), dark = lam(darkenHex(color, 0.6));
  parts.flashMats.push(fur, belly);
  const bodyG = new T.Group();
  bodyG.position.z = u * 0.95;
  root.add(bodyG);
  parts.body = rest(bodyG);
  parts.joints.push(bodyG);
  const body = box3(u * 0.9, u * 1.7, u * 0.75, fur);
  bodyG.add(body);
  const chest = box3(u * 0.7, u * 0.9, u * 0.4, belly);
  chest.position.set(0, u * 0.3, -u * 0.35);
  bodyG.add(chest);
  const neck = new T.Group();
  neck.rotation.order = "ZYX";
  neck.position.set(0, u * 0.9, u * 0.25);
  bodyG.add(neck);
  parts.neck = rest(neck);
  parts.joints.push(neck);
  const head = box3(u * 0.6, u * 0.7, u * 0.55, fur);
  head.position.y = u * 0.25;
  neck.add(head);
  const snout = box3(u * 0.34, u * 0.5, u * 0.3, belly);
  snout.position.set(0, u * 0.75, -u * 0.08);
  neck.add(snout);
  const nose = box3(u * 0.16, u * 0.1, u * 0.12, dark);
  nose.position.set(0, u * 1.0, 0);
  neck.add(nose);
  for (const sx of [-1, 1]) {
    const ear = new T.Mesh(new T.ConeGeometry(u * 0.12, u * 0.3, 4), fur);
    ear.position.set(sx * u * 0.22, u * 0.05, u * 0.4);
    neck.add(ear);
    const eye = box3(u * 0.09, u * 0.04, u * 0.08, new T.MeshBasicMaterial({ color: 0xffd040 }));
    eye.position.set(sx * u * 0.2, u * 0.6, u * 0.12);
    neck.add(eye);
  }
  for (const [name, sx, sy] of [["fl", -1, 1], ["fr", 1, 1], ["bl", -1, -1], ["br", 1, -1]]) {
    const hip = new T.Group();
    hip.position.set(sx * u * 0.32, sy * u * 0.6, -u * 0.3);
    const leg = box3(u * 0.22, u * 0.24, u * 0.6, fur);
    leg.position.z = -u * 0.3;
    hip.add(leg);
    const paw = box3(u * 0.24, u * 0.3, u * 0.14, dark);
    paw.position.set(0, u * 0.04, -u * 0.63);
    hip.add(paw);
    bodyG.add(hip);
    parts[name] = rest(hip);
    parts.joints.push(hip);
  }
  const tail = new T.Group();
  tail.position.set(0, -u * 0.85, u * 0.2);
  const tailBox = box3(u * 0.16, u * 0.7, u * 0.16, fur);
  tailBox.position.set(0, -u * 0.35, u * 0.15);
  tailBox.rotation.x = -0.5;
  tail.add(tailBox);
  bodyG.add(tail);
  parts.tail = rest(tail);
  parts.joints.push(tail);
  parts.u = u;
  return { root, parts, kind: "wolf" };
}

function buildWisp(unit, color) {
  const T = _THREE;
  const root = new T.Group();
  const parts = { joints: [], flashMats: [] };
  const coreMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const core = new T.Mesh(new T.SphereGeometry(unit * 0.55, 10, 8), coreMat);
  root.add(core);
  parts.core = rest(core);
  parts.joints.push(core);
  const halo = new T.Mesh(new T.SphereGeometry(unit * 1.0, 10, 8), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
  root.add(halo);
  parts.halo = rest(halo);
  parts.joints.push(halo);
  parts.flames = [];
  for (let i = 0; i < 3; i++) {
    const f = new T.Mesh(new T.TetrahedronGeometry(unit * 0.3, 0), new T.MeshBasicMaterial({ color }));
    root.add(f);
    parts.flames.push(f);
  }
  const eyeMat = lam(0x102030);
  for (const sx of [-1, 1]) {
    const eye = box3(unit * 0.14, unit * 0.06, unit * 0.22, eyeMat);
    eye.position.set(sx * unit * 0.2, unit * 0.5, unit * 0.1);
    root.add(eye);
  }
  parts.u = unit;
  return { root, parts, kind: "wisp" };
}

function buildDrake(unit, color) {
  const T = _THREE;
  const u = unit;
  const root = new T.Group();
  const parts = { joints: [], flashMats: [] };
  const scale = lam(color), belly = lam(0x9a8a7a), wingMat = lam(darkenHex(color, 0.55), { side: T.DoubleSide }), horn = lam(0xe8e0d0);
  parts.flashMats.push(scale, belly);
  const bodyG = new T.Group();
  bodyG.rotation.order = "ZYX";
  bodyG.position.z = u * 1.2;
  root.add(bodyG);
  parts.body = rest(bodyG);
  parts.joints.push(bodyG);
  const body = box3(u * 1.5, u * 2.6, u * 1.1, scale);
  bodyG.add(body);
  const under = box3(u * 1.1, u * 2.2, u * 0.5, belly);
  under.position.z = -u * 0.45;
  bodyG.add(under);
  for (let i = 0; i < 5; i++) {
    const spike = new T.Mesh(new T.ConeGeometry(u * 0.12, u * 0.4, 4), horn);
    spike.position.set(0, (i - 2) * u * 0.5, u * 0.7);
    bodyG.add(spike);
  }
  // Neck: three segments chained toward the head.
  let parent = bodyG;
  parts.neck = [];
  for (let i = 0; i < 3; i++) {
    const seg = new T.Group();
    seg.rotation.order = "ZYX";
    seg.position.set(0, i === 0 ? u * 1.2 : u * 0.55, i === 0 ? u * 0.3 : u * 0.12);
    seg.rotation.x = -0.25;
    const s = 0.7 - i * 0.12;
    const m = box3(u * s, u * 0.65, u * s, scale);
    m.position.y = u * 0.3;
    seg.add(m);
    parent.add(seg);
    parts.neck.push(rest(seg));
    parts.joints.push(seg);
    parent = seg;
  }
  const headG = new T.Group();
  headG.rotation.order = "ZYX";
  headG.position.set(0, u * 0.6, u * 0.05);
  headG.rotation.x = 0.55;
  parent.add(headG);
  parts.head = rest(headG);
  parts.joints.push(headG);
  const skull = box3(u * 0.6, u * 0.9, u * 0.45, scale);
  skull.position.y = u * 0.35;
  headG.add(skull);
  const jaw = new T.Group();
  jaw.position.set(0, u * 0.05, -u * 0.2);
  const jawBox = box3(u * 0.5, u * 0.8, u * 0.18, belly);
  jawBox.position.y = u * 0.4;
  jaw.add(jawBox);
  headG.add(jaw);
  parts.jaw = rest(jaw);
  parts.joints.push(jaw);
  const glow = new T.Mesh(new T.SphereGeometry(u * 0.16, 8, 6), new T.MeshBasicMaterial({ color: 0xff8f4a, transparent: true, opacity: 0 }));
  glow.position.set(0, u * 0.7, -u * 0.05);
  headG.add(glow);
  parts.mouthGlow = glow;
  for (const sx of [-1, 1]) {
    const hornM = new T.Mesh(new T.ConeGeometry(u * 0.09, u * 0.55, 5), horn);
    hornM.position.set(sx * u * 0.22, -u * 0.05, u * 0.35);
    hornM.rotation.x = -0.6;
    headG.add(hornM);
    const eye = box3(u * 0.1, u * 0.08, u * 0.1, new T.MeshBasicMaterial({ color: 0xffe066 }));
    eye.position.set(sx * u * 0.3, u * 0.45, u * 0.12);
    headG.add(eye);
  }
  // Wings.
  for (const side of ["left", "right"]) {
    const sx = side === "left" ? -1 : 1;
    const wing = new T.Group();
    wing.rotation.order = "ZYX";
    wing.position.set(sx * u * 0.7, u * 0.2, u * 0.5);
    const arm = box3(u * 1.4, u * 0.12, u * 0.12, scale);
    arm.position.x = sx * u * 0.7;
    wing.add(arm);
    const membrane = new T.Mesh(new T.PlaneGeometry(u * 2.2, u * 1.4), wingMat);
    membrane.position.set(sx * u * 1.2, -u * 0.6, -u * 0.05);
    membrane.rotation.x = 0.1;
    wing.add(membrane);
    const tip = new T.Mesh(new T.ConeGeometry(u * 0.08, u * 0.4, 4), horn);
    tip.position.set(sx * u * 2.3, 0, 0);
    tip.rotation.z = -sx * Math.PI / 2;
    wing.add(tip);
    bodyG.add(wing);
    parts[side + "Wing"] = rest(wing);
    parts.joints.push(wing);
  }
  // Legs: stubby, the front pair does the clawing.
  for (const [name, sx, sy] of [["fl", -1, 1], ["fr", 1, 1], ["bl", -1, -1], ["br", 1, -1]]) {
    const hip = new T.Group();
    hip.rotation.order = "ZYX";
    hip.position.set(sx * u * 0.7, sy * u * 0.9, -u * 0.45);
    const leg = box3(u * 0.4, u * 0.45, u * 0.75, scale);
    leg.position.z = -u * 0.35;
    hip.add(leg);
    const foot = box3(u * 0.45, u * 0.6, u * 0.18, belly);
    foot.position.set(0, u * 0.1, -u * 0.72);
    hip.add(foot);
    for (let c = -1; c <= 1; c++) {
      const claw = new T.Mesh(new T.ConeGeometry(u * 0.06, u * 0.25, 4), horn);
      claw.position.set(c * u * 0.14, u * 0.48, -u * 0.72);
      claw.rotation.x = Math.PI / 2;
      hip.add(claw);
    }
    bodyG.add(hip);
    parts[name] = rest(hip);
    parts.joints.push(hip);
  }
  // Tail: four segments swaying.
  parent = bodyG;
  parts.tail = [];
  for (let i = 0; i < 4; i++) {
    const seg = new T.Group();
    seg.rotation.order = "ZYX";
    seg.position.set(0, i === 0 ? -u * 1.25 : -u * 0.6, i === 0 ? -u * 0.1 : 0);
    const s = 0.55 - i * 0.1;
    const m = box3(u * s, u * 0.7, u * s, scale);
    m.position.y = -u * 0.35;
    seg.add(m);
    parent.add(seg);
    parts.tail.push(rest(seg));
    parts.joints.push(seg);
    parent = seg;
  }
  const spade = new T.Mesh(new T.ConeGeometry(u * 0.22, u * 0.6, 4), horn);
  spade.position.set(0, -u * 0.9, 0);
  spade.rotation.x = Math.PI / 2;
  parent.add(spade);
  parts.u = u;
  return { root, parts, kind: "drake" };
}

const BANDIT_RIG = { kind: "human", hair: "hood", hairColor: 0x2a2a30, skin: 0xd8a888, coat: 0x5a3a2a, trim: 0x8a6a3a, pants: 0x3a2a22, boots: 0x2a2020, weapon: "dagger", scale: 1 };
const ARCHER_RIG = { ...BANDIT_RIG, coat: 0x5a5a3a, trim: 0x9a9a5a, weapon: "bow" };
const GOLEM_RIG = { kind: "human", golem: true, hair: "none", skin: 0x7a8690, coat: 0x6a7680, trim: 0x55606a, pants: 0x5a6670, boots: 0x4a545c, weapon: null, scale: 1.05, bulk: 1.7 };
const OGRE_RIG = { kind: "human", hair: "short", hairColor: 0x3a2a1a, skin: 0x8a9a52, coat: 0x6a5a3a, trim: 0x9a8a5a, pants: 0x4a3a2a, boots: 0x3a2a1a, weapon: "club", scale: 1.15, bulk: 1.4, tusks: true };

function buildFigure(u) {
  const r = u.def.r;
  if (u.side === 0) return buildHuman(r * 1.15, u.def.rig);
  switch (u.kind) {
    case "slime": return buildSlime(r * 0.95, u.def.color);
    case "wolf": return buildWolf(r * 1.05, u.def.color);
    case "bandit": return buildHuman(r * 1.1, BANDIT_RIG);
    case "archer": return buildHuman(r * 1.1, ARCHER_RIG);
    case "golem": return buildHuman(r * 0.95, GOLEM_RIG);
    case "wisp": return buildWisp(r, u.def.color);
    case "ogre": return buildHuman(r * 0.95, OGRE_RIG);
    case "drake": return buildDrake(r * 0.82, u.def.color);
  }
  return buildSlime(r, u.def.color);
}

function ensureFigures(adapter) {
  const want = new Set([..._party, ..._monsters, ..._corpses]);
  for (const [u, f] of _figs) {
    if (!want.has(u)) {
      adapter.removeSceneMesh(f.root);
      _figs.delete(u);
      const sh = _shadowMeshes.get(u);
      if (sh) { adapter.removeSceneMesh(sh); _shadowMeshes.delete(u); }
    }
  }
  for (const u of want) {
    if (_figs.has(u)) continue;
    const f = buildFigure(u);
    f.phase = 0; f.amp = 0; f.lastX = null; f.lastY = null; f.spin = 0; f.flashOn = false;
    f.mats = f.parts.flashMats;
    adapter.addSceneMesh(f.root);
    _figs.set(u, f);
    const sh = new _THREE.Mesh(_sharedGeo.shadow, new _THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    adapter.addSceneMesh(sh);
    _shadowMeshes.set(u, sh);
  }
}

// ── Posing ────────────────────────────────────────────────────────────────
// Everything below is a pure function of the unit record: state, stateT, the
// action's phase, speed, height. The figure carries only smoothing state.
function phaseK(u) {
  // 0..1 progress within the current action phase.
  const a = u.action;
  if (!a) return { phase: null, k: 0 };
  const ph = actionPhase(u);
  if (ph === "windup") return { phase: ph, k: u.stateT / Math.max(1, a.windup) };
  if (ph === "active") return { phase: ph, k: (u.stateT - a.windup) / Math.max(1, a.active) };
  return { phase: ph, k: (u.stateT - a.windup - a.active) / Math.max(1, a.recover) };
}
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;

function commonPlace(f, u, x, y, z) {
  f.root.position.set(x, -y, z + GROUND_Z);
  f.root.rotation.set(0, 0, -u.face - Math.PI / 2 + f.spin);
  f.root.scale.set(1, 1, 1);
  const sh = _shadowMeshes.get(u);
  if (sh) {
    sh.position.set(x, -y, GROUND_Z + 0.4);
    const s = u.def.r * 1.1 * Math.max(0.3, 1 - z / 260);
    sh.scale.set(s, s, 1);
    sh.visible = true;
  }
}

function strideOf(f, u, x, y) {
  const d = f.lastX === null ? 0 : Math.hypot(x - f.lastX, y - f.lastY);
  f.lastX = x; f.lastY = y;
  f.phase += (d / (u.def.r * 2.6)) * Math.PI * 2;
  const target = u.alive && (u.state === "idle" || u.state === "guard" || u.state === "cast") ? Math.min(1, d / (u.def.r * 0.12)) : 0;
  f.amp += (target - f.amp) * 0.2;
  return f.amp;
}

function flash(f, on, color = 0xffffff, strength = 0.85) {
  if (on === f.flashOn && !on) return;
  f.flashOn = on;
  for (const m of f.mats) {
    if (!m.emissive) continue;
    if (on) { m.emissive.setHex(color); m.emissiveIntensity = strength; }
    else { m.emissive.setHex(0x000000); m.emissiveIntensity = 1; }
  }
}

// Arm swing helper: shoulder swing (x, positive = forward), sweep (z),
// elbow bend (positive = curl), hand tilt. Limbs hang along -Z, so a negative
// swing goes BEHIND the back — the first cut had every pose mirrored that way.
function arm(p, side, sx, sz, ex, hx = 0) {
  const s = p[side + "Shoulder"], e = p[side + "Elbow"], h = p[side + "Hand"];
  s.rotation.x += sx; s.rotation.z += sz; e.rotation.x += ex; h.rotation.x += hx;
}

function poseHuman(f, u) {
  const p = f.parts, un = p.u;
  resetJoints(f);
  const x = unitX(u), y = unitY(u);
  const amp = strideOf(f, u, x, y);
  const t = _frame;
  f.spin *= 0.8;
  if (Math.abs(f.spin) < 0.01) f.spin = 0;

  // Weapon rest hold: down and a little forward; the bow sits across the body.
  const w = u.def.rig?.weapon ?? (u.kind === "bandit" ? "dagger" : u.kind === "archer" ? "bow" : u.kind === "ogre" ? "club" : null);
  const twoHanded = w === "lance" || w === "club";
  if (p.weapon) p.weapon.rotation.x = w === "bow" ? 0 : -1.35;

  // Locomotion.
  const swing = Math.sin(f.phase) * 0.8 * amp;
  p.leftHip.rotation.x = swing;
  p.rightHip.rotation.x = -swing;
  p.leftKnee.rotation.x = -Math.max(0, -swing) * 1.4;
  p.rightKnee.rotation.x = -Math.max(0, swing) * 1.4;
  arm(p, "left", -swing * 0.7, 0, 0.35 + Math.max(0, -swing) * 0.5);
  arm(p, "right", twoHanded ? 0.15 : swing * 0.55, 0, 0.35 + Math.max(0, swing) * 0.4);
  p.torso.rotation.x = -0.16 * amp;
  p.torso.position.z += Math.abs(Math.cos(f.phase)) * un * 0.05 * amp;
  // Idle breath.
  p.torso.position.z += Math.sin(t * 0.06) * un * 0.012;
  p.neck.rotation.x = 0.04 * Math.sin(t * 0.05);
  if (twoHanded) { arm(p, "right", 0.5, -0.5, 0.8); arm(p, "left", 0.7, 0.9, 1.0); }

  const st = u.state;
  const { phase, k } = phaseK(u);
  let lean = 0;

  if (st === "attack" && u.action) {
    const step = u.action.step ?? 0;
    const kw = phase === "windup" ? easeIn(k) : 1;
    const ka = phase === "active" ? easeOut(k) : phase === "recover" ? 1 : 0;
    const kr = phase === "recover" ? easeOut(k) : 0;
    if (w === "bow") {
      // Draw and loose.
      arm(p, "left", 1.5, 0.2, 0);
      arm(p, "right", 1.5 - ka * 0.2, -0.3 - kw * 0.9 + ka * 0.9, 0.2 + kw * 1.6 - ka * 1.4);
      p.torso.rotation.z = 0.45;
      if (p.weapon) p.weapon.rotation.x = -Math.PI / 2;
    } else if (step === 2) {
      // The spin: body turns a full circle over the active window.
      f.spin = (phase === "active" ? ka : phase === "recover" ? 1 : 0) * Math.PI * 2 + (phase === "recover" ? 0 : 0);
      if (phase === "recover") f.spin = 0;
      arm(p, "right", 1.5, 0.2 - kr * 0.2, 0.1);
      arm(p, "left", 0.9, -0.6, 0.4);
      lean = -0.25 * (1 - kr);
      p.torso.rotation.z = -kw * 0.8 + ka * 0.4;
    } else if (step === 1) {
      // Diagonal downward cut from over the shoulder.
      arm(p, "right", 2.9 * kw - ka * 2.3, 0.3 * kw - ka * 0.6, 0.4 * kw, 0);
      p.torso.rotation.z = 0.5 * kw - ka * 0.9;
      lean = -0.3 * ka;
      if (p.weapon) p.weapon.rotation.x = -0.3 - ka * 0.8;
    } else {
      // Horizontal slash right to left.
      arm(p, "right", 1.35 * kw + ka * 0.15, -1.1 * kw + ka * 2.0, 0.6 * kw - ka * 0.3);
      p.torso.rotation.z = -0.55 * kw + ka * 1.0;
      lean = -0.15 * ka;
      if (p.weapon) p.weapon.rotation.x = -0.2;
    }
    if (twoHanded && w !== "bow") arm(p, "left", 1.3, 0.9, 1.2);
    if (kr) {
      // Blend back toward rest.
      p.torso.rotation.z *= (1 - kr);
    }
  } else if (st === "arte" && u.action) {
    const key = u.action.key;
    const kw = phase === "windup" ? easeIn(k) : 1;
    const ka = phase === "active" ? easeOut(k) : phase === "recover" ? 1 : 0;
    const kr = phase === "recover" ? easeOut(k) : 0;
    if (key === "sonicThrust" || key === "pierce") {
      arm(p, "right", -0.9 * kw + ka * 2.4, 0.2 * kw, 1.6 * kw - ka * 1.6);
      if (p.weapon) p.weapon.rotation.x = -0.1;
      lean = -0.5 * (kw - kr);
      p.torso.rotation.z = -0.4 * kw + ka * 0.3;
      arm(p, "left", -0.8 * kw, 0.3, 0.6);
      p.leftHip.rotation.x = 0.9 * ka * (1 - kr); p.rightHip.rotation.x = -0.6 * ka * (1 - kr);
      p.rightKnee.rotation.x = -1.2 * ka * (1 - kr);
    } else if (key === "tigerBlade") {
      arm(p, "right", 0.4 + ka * 2.2, -0.5 * kw + ka * 0.6, 0.3);
      if (p.weapon) p.weapon.rotation.x = -0.9 + ka * 0.5;
      lean = 0.2 * kw - 0.35 * ka;
      p.leftHip.rotation.x = -0.6 * ka; p.rightHip.rotation.x = 0.5 * ka;
      p.leftKnee.rotation.x = -1.4 * ka; p.rightKnee.rotation.x = -1.0 * ka;
    } else if (key === "demonFang") {
      arm(p, "right", 2.9 * kw - ka * 2.4, 0.1, 0.3);
      if (p.weapon) p.weapon.rotation.x = -0.3 - ka * 1.0;
      lean = 0.15 * kw - 0.5 * ka * (1 - kr);
      p.leftHip.rotation.x = 0.7 * ka * (1 - kr); p.rightKnee.rotation.x = -1.0 * ka * (1 - kr);
    } else if (key === "tripleArrow") {
      arm(p, "left", 1.5, 0.2, 0);
      arm(p, "right", 1.5, -1.2 * kw + ka * 1.0, 1.7 * kw - ka * 1.5);
      p.torso.rotation.z = 0.45;
      if (p.weapon) p.weapon.rotation.x = -Math.PI / 2;
    }
    if (kr) p.torso.rotation.z *= (1 - kr);
  } else if (st === "cast") {
    // Both arms raised, staff aloft, the crystal blazing.
    const kc = u.cast ? u.cast.t / u.cast.T : 0;
    arm(p, "right", 2.6, 0.2, 0.3);
    arm(p, "left", 2.2, -0.3, 0.5);
    if (p.weapon) p.weapon.rotation.x = -0.4;
    lean = 0.1;
    if (p.crystal) { const s = 1 + kc * 0.8 + Math.sin(t * 0.4) * 0.15; p.crystal.scale.set(s, s, s); }
  } else if (st === "guard") {
    arm(p, "right", 1.4, 0.9, 1.4);
    arm(p, "left", 1.1, -0.6, 1.4);
    if (p.weapon) p.weapon.rotation.x = 0.4;
    lean = -0.12;
    p.torso.position.z -= un * 0.14;
    // Crouched stance, but the run cycle still drives the feet: a guard that
    // shuffles sideways must not glide on frozen legs.
    p.leftHip.rotation.x = 0.35 + swing * 0.7; p.rightHip.rotation.x = -0.25 - swing * 0.7;
    p.leftKnee.rotation.x = -0.7 - Math.max(0, -swing) * 0.8; p.rightKnee.rotation.x = -0.6 - Math.max(0, swing) * 0.8;
  } else if (st === "stun") {
    const kk = Math.min(1, u.stateT / 8);
    lean = 0.45 * kk;
    p.neck.rotation.x = 0.5 * kk;
    arm(p, "right", 0.9 * kk, -0.5, 0.4);
    arm(p, "left", 0.9 * kk, 0.5, 0.4);
    if (u.z > 0) {
      // Airborne: legs flail.
      p.leftHip.rotation.x = Math.sin(t * 0.5) * 0.7; p.rightHip.rotation.x = -Math.sin(t * 0.5) * 0.7;
      p.leftKnee.rotation.x = -0.8; p.rightKnee.rotation.x = -0.8;
      lean = 0.9;
    }
  } else if (st === "ko") {
    // Flat on the back.
    f.root.rotation.x = Math.PI / 2 - 0.05;
    f.root.position.z += un * 0.25;
    arm(p, "right", 0.5, -1.0, 0); arm(p, "left", 0.5, 1.0, 0);
    p.neck.rotation.x = -0.3;
  }
  if (p.crystal && st !== "cast") p.crystal.scale.set(1, 1, 1);

  // Golem cores pulse.
  if (p.core) { const s = 1 + Math.sin(t * 0.15) * 0.15; p.core.scale.set(s, s, s); }

  p.torso.rotation.x += lean;
  // Cape and ponytail trail the motion.
  if (p.cape) p.cape.rotation.x = -(0.15 + amp * 0.75 + Math.max(0, -lean) * 0.8 + Math.sin(t * 0.12) * 0.05 * (1 + amp));
  if (p.tail) p.tail.rotation.x = -(0.2 + amp * 0.5) + Math.sin(f.phase + 1) * 0.15 * amp;

  // Death (monster humans): topple forward and sink.
  if (u.deadT > 0) {
    const kd = Math.min(1, u.deadT);
    f.root.rotation.x = -easeOut(Math.min(1, kd * 1.6)) * (Math.PI / 2);
    f.root.position.z -= easeIn(kd) * un * 2.2;
    p.neck.rotation.x = -0.6 * kd;
  }
}

function poseSlime(f, u) {
  const p = f.parts, un = p.u;
  resetJoints(f);
  const x = unitX(u), y = unitY(u);
  strideOf(f, u, x, y);
  const { phase, k } = phaseK(u);
  let sq = 1;
  if (u.vz > 0) sq = 1.25; else if (u.z > 0) sq = 1.1;
  if (u.state === "attack" && u.action) {
    if (phase === "windup") sq = 1 - 0.35 * easeIn(k);
    else if (phase === "active") { sq = 1.3; p.body.rotation.x = -0.6; p.body.position.y += un * 0.5; }
  }
  if (u.state === "stun") sq = 0.7;
  const wob = 1 + Math.sin(_frame * 0.18 + f.phase) * 0.03;
  p.body.scale.set(wob / Math.sqrt(sq), wob / Math.sqrt(sq), 0.85 * sq);
  p.body.position.z = un * 0.95 * sq;
  if (u.deadT > 0) {
    const kd = Math.min(1, u.deadT);
    f.root.scale.set(1 + kd * 0.8, 1 + kd * 0.8, Math.max(0.02, 1 - kd));
  }
}

function poseWolf(f, u) {
  const p = f.parts, un = p.u;
  resetJoints(f);
  const x = unitX(u), y = unitY(u);
  const amp = strideOf(f, u, x, y);
  const t = _frame;
  const { phase, k } = phaseK(u);
  // Gallop: front pair and back pair out of phase.
  const g = Math.sin(f.phase * 1.3) * 0.9 * amp;
  p.fl.rotation.x = g; p.fr.rotation.x = g * 0.8;
  p.bl.rotation.x = -g * 0.9; p.br.rotation.x = -g;
  p.body.position.z += Math.abs(Math.cos(f.phase * 1.3)) * un * 0.08 * amp;
  p.body.rotation.x = -0.1 * amp;
  p.neck.rotation.x = 0.1 * Math.sin(t * 0.1) - 0.15 * amp;
  p.tail.rotation.z = Math.sin(t * 0.2) * 0.4;
  p.tail.rotation.x = -0.2 + amp * 0.4;
  if (u.state === "attack" && u.action) {
    if (phase === "windup") { p.body.position.z -= un * 0.3 * easeIn(k); p.body.rotation.x = 0.25 * k; p.neck.rotation.x = -0.4 * k; }
    else if (phase === "active") { p.body.scale.set(0.9, 1.25, 0.9); p.body.rotation.x = -0.3; p.fl.rotation.x = p.fr.rotation.x = 1.1; p.bl.rotation.x = p.br.rotation.x = -1.0; p.neck.rotation.x = -0.2; }
  } else if (u.state === "stun") {
    p.body.rotation.y = Math.sin(t * 0.4) * 0.3;
    p.neck.rotation.z = Math.sin(t * 0.5) * 0.4;
  }
  if (u.deadT > 0) {
    const kd = Math.min(1, u.deadT);
    f.root.rotation.y = easeOut(Math.min(1, kd * 1.6)) * (Math.PI / 2);
    f.root.position.z -= easeIn(kd) * un * 2.2;
  }
}

function poseWisp(f, u) {
  const p = f.parts, un = p.u;
  resetJoints(f);
  const t = _frame;
  const { phase, k } = phaseK(u);
  let s = 1 + Math.sin(t * 0.2) * 0.06;
  if (u.state === "attack" && u.action && phase === "windup") s += 0.6 * easeIn(k);
  if (u.state === "attack" && u.action && phase === "active") s = 0.7;
  p.core.scale.set(s, s, s);
  p.halo.scale.set(s * 1.1, s * 1.1, s * 1.1);
  p.flames.forEach((fl, i) => {
    const a = t * 0.12 + i * 2.09;
    fl.position.set(Math.cos(a) * un * 0.9, Math.sin(a) * un * 0.9, Math.sin(a * 2) * un * 0.3);
    fl.rotation.set(a, a * 0.7, 0);
  });
  if (u.deadT > 0) {
    const kd = Math.min(1, u.deadT);
    f.root.scale.set(1 + kd * 2, 1 + kd * 2, 1 + kd * 2);
    p.halo.material.opacity = 0.35 * (1 - kd);
  }
}

function poseDrake(f, u) {
  const p = f.parts, un = p.u;
  resetJoints(f);
  const x = unitX(u), y = unitY(u);
  const amp = strideOf(f, u, x, y);
  const t = _frame;
  const { phase, k } = phaseK(u);
  const g = Math.sin(f.phase * 0.9) * 0.6 * amp;
  p.fl.rotation.x = g; p.br.rotation.x = g; p.fr.rotation.x = -g; p.bl.rotation.x = -g;
  const flap = Math.sin(t * 0.06) * (0.25 + amp * 0.4);
  p.leftWing.rotation.y = -flap; p.rightWing.rotation.y = flap;
  p.tail.forEach((seg, i) => { seg.rotation.z = Math.sin(t * 0.05 - i * 0.7) * 0.22; });
  p.neck.forEach((seg, i) => { seg.rotation.x += Math.sin(t * 0.04 + i) * 0.04; });
  p.body.position.z += Math.abs(Math.cos(f.phase * 0.9)) * un * 0.06 * amp;
  p.mouthGlow.material.opacity = 0;
  const pat = u.ai?.pattern ?? 0;
  if (u.state === "attack" && u.action) {
    const kw = phase === "windup" ? easeIn(k) : 1;
    const ka = phase === "active" ? easeOut(k) : phase === "recover" ? 1 : 0;
    if (u.action.duringActive && pat === 2) {
      // Breath: head down, jaw wide, glow.
      p.neck.forEach(seg => { seg.rotation.x += 0.35 * kw - 0.15 * ka; });
      p.head.rotation.x += -0.5 * kw + 0.2 * ka;
      p.jaw.rotation.x = -0.9 * kw;
      p.mouthGlow.material.opacity = kw * (0.6 + 0.4 * Math.sin(t * 0.6));
      p.mouthGlow.scale.setScalar(1 + kw * 2);
    } else if (pat === 1 && !u.action.duringActive) {
      // Tail spin: the whole body turns.
      f.spin = (phase === "active" ? ka : 0) * Math.PI * 2;
      if (phase === "recover") f.spin = 0;
      p.tail.forEach(seg => { seg.rotation.z += -0.5 * ka; });
      p.body.rotation.x = 0.15 * kw;
    } else if (u.action.duringActive) {
      // Charge: low and forward, wings back.
      p.body.rotation.x = -0.35 * kw;
      p.leftWing.rotation.y = 0.9; p.rightWing.rotation.y = -0.9;
      p.neck.forEach(seg => { seg.rotation.x += 0.3 * kw; });
    } else if (u.action.windup === 28) {
      // Roar: rear up, wings spread.
      p.body.rotation.x = 0.55 * kw - 0.2 * ka;
      p.body.position.z += un * 0.5 * kw;
      p.leftWing.rotation.y = -1.2 * kw; p.rightWing.rotation.y = 1.2 * kw;
      p.jaw.rotation.x = -0.8 * kw;
      p.head.rotation.x += -0.6 * kw;
    } else {
      // Claw: right foreleg rears back then rakes forward, body lunges.
      p.fr.rotation.x = 1.6 * kw - 2.4 * ka;
      p.body.rotation.x = -0.15 * kw - 0.25 * ka;
      p.head.rotation.x += -0.3 * kw;
    }
  } else if (u.state === "stun") {
    p.head.rotation.z = Math.sin(t * 0.5) * 0.35;
    p.body.rotation.x = 0.2;
  } else {
    f.spin *= 0.8;
  }
  if (u.deadT > 0) {
    const kd = Math.min(1, u.deadT);
    f.root.position.z -= easeIn(kd) * un * 3.5;
    p.body.rotation.x = -0.3 * kd;
    p.leftWing.rotation.y = -0.9 * kd; p.rightWing.rotation.y = 0.9 * kd;
    p.neck.forEach(seg => { seg.rotation.x += 0.5 * kd; });
  }
}

function syncFigures(adapter) {
  for (const [u, f] of _figs) {
    const dead = u.deadT > 0;
    const x = dead ? u.deadX : unitX(u), y = dead ? u.deadY : unitY(u);
    let z = dead ? u.deadZ : u.z;
    let visible = true;
    // Spawn-in: monsters rise out of the stone.
    if (u.side === 1 && u.spawnT > 0) {
      const kk = 1 - u.spawnT / (SPAWN_IN_FRAMES + 20);
      z -= (1 - kk) * u.def.r * 3.5;
      if (kk < 0) visible = false;
    }
    f.root.visible = visible;
    const sh = _shadowMeshes.get(u);
    if (sh) sh.visible = visible && !dead;
    if (!visible) continue;
    commonPlace(f, u, x, y, z);
    switch (f.kind) {
      case "human": poseHuman(f, u); break;
      case "slime": poseSlime(f, u); break;
      case "wolf": poseWolf(f, u); break;
      case "wisp": poseWisp(f, u); break;
      case "drake": poseDrake(f, u); break;
    }
    if (u.hitFlash > 0) flash(f, true);
    else if (u.overlimit > 0) flash(f, true, 0xffb020, 0.3);
    else flash(f, false);
    if (dead) {
      const kd = Math.min(1, u.deadT);
      const s = 1 - kd * 0.35;
      f.root.scale.multiplyScalar(s);
    }
  }
  void adapter;
}

// ── 3D effects ────────────────────────────────────────────────────────────
function poolTake(pool, used, make, adapter) {
  if (used.n < pool.length) return pool[used.n++];
  const m = make();
  adapter.addSceneMesh(m);
  pool.push(m);
  used.n++;
  return m;
}
function poolPark(pool, from) { for (let i = from; i < pool.length; i++) pool[i].visible = false; }

function syncEffects3d(adapter) {
  const T = _THREE;
  // Slash arcs — additive sectors that sweep open and fade.
  const su = { n: 0 };
  for (const s of _slashes) {
    const m = poolTake(_slashPool, su, () => new T.Mesh(_sharedGeo.sector, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })), adapter);
    const k = s.t / s.T;
    m.visible = true;
    m.position.set(s.x, -s.y, GROUND_Z + s.z);
    const r = s.r * (0.9 + k * 0.25);
    m.scale.set(r, r, 1);
    const sweep = (s.a1 - s.a0) * Math.min(1, k * 1.6);
    const mid = s.dir > 0 ? s.a0 + sweep / 2 : s.a1 - sweep / 2;
    // Sector geometry spans -1..1 rad; scale its angular extent via rotation +
    // a Y squash is not possible, so approximate by rotating it and fading.
    m.rotation.set(0, 0, -mid);
    m.material.color.set(s.color);
    m.material.opacity = (1 - k) * 0.85;
    m.scale.y = r * Math.min(1, sweep / 2);
  }
  poolPark(_slashPool, su.n);

  // Rings.
  const ru = { n: 0 };
  for (const r of _rings) {
    const m = poolTake(_ringPool, ru, () => new T.Mesh(_sharedGeo.ring, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false })), adapter);
    const k = r.t / r.T;
    const rad = lerp(r.r, r.R, k);
    m.visible = true;
    m.position.set(r.x, -r.y, GROUND_Z + 2);
    m.scale.set(rad, rad, 1);
    m.material.color.set(r.color);
    m.material.opacity = (1 - k) * 0.85;
  }
  // Overlimit aura on the player: a spinning gold ring at the feet.
  const pl = player();
  if (pl.overlimit > 0) {
    const m = poolTake(_ringPool, ru, () => new T.Mesh(_sharedGeo.ring, new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false })), adapter);
    m.visible = true;
    m.position.set(unitX(pl), -unitY(pl), GROUND_Z + 1.8);
    const rad = pl.def.r * 1.6 + Math.sin(_frame * 0.2) * 2;
    m.scale.set(rad, rad, 1);
    m.material.color.setHex(0xffd166);
    m.material.opacity = 0.55 + 0.3 * Math.sin(_frame * 0.3);
  }
  poolPark(_ringPool, ru.n);

  // Particles.
  const pu = { n: 0 };
  for (const p of _particles) {
    if (pu.n >= 220) break;
    const m = poolTake(_partPool, pu, () => new T.Mesh(_sharedGeo.sphere, new T.MeshBasicMaterial({ color: 0xffffff })), adapter);
    m.visible = true;
    m.position.set(p.x, -p.y, GROUND_Z + 2 + p.z);
    const s = p.r * (1 - p.t / p.life) * 1.4;
    m.scale.set(s, s, s);
    m.material.color.set(p.color);
  }
  poolPark(_partPool, pu.n);

  // Monster telegraphs and delayed zones.
  const tu = { n: 0 };
  const takeDisc = () => poolTake(_telePool, tu, () => new T.Mesh(_sharedGeo.disc, new T.MeshBasicMaterial({ color: 0xff6b5a, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false })), adapter);
  for (const m of _monsters) {
    if (!m.alive || m.state !== "attack" || actionPhase(m) !== "windup") continue;
    const k = m.stateT / Math.max(1, m.action.windup);
    const d = takeDisc();
    d.visible = true;
    const x = unitX(m), y = unitY(m);
    if (m.def.ranged) {
      d.position.set(x + Math.cos(m.face) * 60, -(y + Math.sin(m.face) * 60), GROUND_Z + 1.6);
      d.scale.set(60, 4, 1);
      d.rotation.z = -m.face;
    } else if (m.def.smash) {
      d.position.set(x + Math.cos(m.face) * 34, -(y + Math.sin(m.face) * 34), GROUND_Z + 1.6);
      d.scale.set(m.def.smash, m.def.smash, 1);
      d.rotation.z = 0;
    } else {
      const reach = (m.def.reach || 40) + m.def.r;
      d.position.set(x, -y, GROUND_Z + 1.6);
      d.scale.set(reach, reach, 1);
      d.rotation.z = 0;
    }
    d.material.color.setHex(0xff6b5a);
    d.material.opacity = 0.15 + 0.3 * k;
  }
  for (const z of _zones) {
    const d = takeDisc();
    d.visible = true;
    d.position.set(z.x, -z.y, GROUND_Z + 1.7);
    d.scale.set(z.r, z.r, 1);
    d.rotation.z = 0;
    d.material.color.set(z.color);
    d.material.opacity = 0.2 + 0.35 * (z.t / z.T);
  }
  poolPark(_telePool, tu.n);

  // Casting circles: a rune ring that fills as the cast completes.
  const casters = new Set(_party.filter(p => p.alive && p.cast));
  for (const [u, m] of _castMeshes) {
    if (!casters.has(u)) { adapter.removeSceneMesh(m.ring); adapter.removeSceneMesh(m.arc); _castMeshes.delete(u); }
  }
  for (const u of casters) {
    let m = _castMeshes.get(u);
    if (!m) {
      const ring = new T.Mesh(new T.RingGeometry(0.86, 1, 8, 1), new T.MeshBasicMaterial({ color: 0xc8a8ff, transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false }));
      const arc = new T.Mesh(new T.RingGeometry(0.7, 0.82, 40, 1, 0, 0.01), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: T.DoubleSide, depthWrite: false }));
      adapter.addSceneMesh(ring); adapter.addSceneMesh(arc);
      m = { ring, arc, k: -1 };
      _castMeshes.set(u, m);
    }
    const x = unitX(u), y = unitY(u);
    const R = 34;
    m.ring.position.set(x, -y, GROUND_Z + 1.5);
    m.ring.scale.set(R, R, 1);
    m.ring.rotation.z = _frame * 0.03;
    const k = u.cast.t / u.cast.T;
    if (Math.abs(k - m.k) > 0.02) {
      m.k = k;
      m.arc.geometry.dispose();
      m.arc.geometry = new T.RingGeometry(0.7, 0.82, 40, 1, Math.PI / 2, Math.max(0.01, k * Math.PI * 2));
    }
    m.arc.position.set(x, -y, GROUND_Z + 1.6);
    m.arc.scale.set(R, R, 1);
  }

  // Projectiles.
  const live = new Set(_projs.filter(p => p.body));
  for (const [p, m] of _projMeshes) {
    if (!live.has(p)) { adapter.removeSceneMesh(m); _projMeshes.delete(p); }
  }
  for (const p of live) {
    let m = _projMeshes.get(p);
    if (!m) {
      m = new T.Group();
      if (p.kind === "arrow") {
        const shaft = box3(1.6, 22, 1.6, lam(0x6b4a2e));
        m.add(shaft);
        const head = new T.Mesh(new T.ConeGeometry(2, 5, 4), lam(0xd8dee8));
        head.position.y = 13;
        m.add(head);
        const fl = box3(4, 5, 0.6, lam(p.side === 0 ? 0xe8ffb0 : 0xd9c3a0));
        fl.position.y = -9;
        m.add(fl);
      } else if (p.kind === "wave") {
        const w = new T.Mesh(new T.RingGeometry(0.7, 1, 20, 1, -1.1, 2.2), new T.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
        w.scale.set(p.r + 6, p.r + 6, 1);
        w.rotation.z = -Math.PI / 2;
        m.add(w);
        const spike = new T.Mesh(new T.ConeGeometry(p.r * 0.6, p.r * 1.6, 5), new T.MeshBasicMaterial({ color: 0xc8e8ff }));
        spike.rotation.x = -Math.PI / 2;
        spike.position.y = p.r * 0.4;
        m.add(spike);
      } else if (p.kind === "fire") {
        const core = new T.Mesh(new T.SphereGeometry(p.r, 10, 8), new T.MeshBasicMaterial({ color: 0xffd080 }));
        m.add(core);
        const shell = new T.Mesh(new T.IcosahedronGeometry(p.r * 1.5, 0), new T.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.55, depthWrite: false }));
        m.add(shell);
        m.userData.shell = shell;
        const tail = new T.Mesh(new T.ConeGeometry(p.r * 0.9, p.r * 3, 6), new T.MeshBasicMaterial({ color: 0xff8f4a, transparent: true, opacity: 0.5, depthWrite: false }));
        tail.rotation.x = Math.PI / 2;
        tail.position.y = -p.r * 1.8;
        m.add(tail);
      } else {
        const core = new T.Mesh(new T.OctahedronGeometry(p.r * 1.3, 0), new T.MeshBasicMaterial({ color: p.color }));
        m.add(core);
        m.userData.spin = true;
      }
      adapter.addSceneMesh(m);
      _projMeshes.set(p, m);
    }
    const pos = p.body.position;
    m.position.set(pos.x, -pos.y, GROUND_Z + p.z + (p.kind === "wave" ? 0 : Math.sin(p.t * 0.4) * 1.5));
    m.rotation.set(0, 0, -p.angle - Math.PI / 2);
    if (m.userData.spin) m.rotation.x = p.t * 0.3;
    if (m.userData.shell) { const s = 1 + Math.sin(p.t * 0.7) * 0.2; m.userData.shell.scale.set(s, s, s); m.userData.shell.rotation.set(p.t * 0.2, p.t * 0.3, 0); }
  }

  // Mystic Arte: a golden pillar and rings around the caster during the hold.
  if (_mystic) {
    if (!_mysticFx) {
      const g = new T.Group();
      const pillar = new T.Mesh(new T.CylinderGeometry(30, 44, 260, 16, 1, true), new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
      pillar.rotation.x = Math.PI / 2;
      pillar.position.z = 130;
      g.add(pillar);
      g.userData.rings = [];
      for (let i = 0; i < 3; i++) {
        const ring = new T.Mesh(_sharedGeo.ring, new T.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.7, side: T.DoubleSide, depthWrite: false }));
        g.add(ring);
        g.userData.rings.push(ring);
      }
      adapter.addSceneMesh(g);
      _mysticFx = g;
    }
    const u = _mystic.caster;
    const k = _mystic.t / MYSTIC_FRAMES;
    _mysticFx.visible = true;
    _mysticFx.position.set(unitX(u), -unitY(u), GROUND_Z);
    _mysticFx.children[0].scale.set(1 + k * 0.6, 1, 1 + k * 0.6);
    _mysticFx.children[0].material.opacity = 0.25 + k * 0.5;
    _mysticFx.userData.rings.forEach((r, i) => {
      const rad = 40 + i * 30 + Math.sin(_frame * 0.1 + i) * 6;
      r.scale.set(rad, rad, 1);
      r.position.z = 20 + i * 45 + (k * 120) % 140;
      r.rotation.z = _frame * (0.05 + i * 0.02);
    });
  } else if (_mysticFx) {
    _mysticFx.visible = false;
  }
}

// ── 3D camera ─────────────────────────────────────────────────────────────
// Side-on to the player–target line, elevated, at a distance that widens as
// the two separate. The heading is smoothed in updateCamera(); this just
// places the eye. The camera's own `up` is left alone (other demos assume the
// adapter's default) — the orientation is written straight into the quaternion.
const _camM = { m: null, eye: null, look: null, up: null };
const _camEye = { x: 0, y: 0 };
function placeCamera3d(camera) {
  const T = _THREE;
  if (!_camM.m) { _camM.m = new T.Matrix4(); _camM.eye = new T.Vector3(); _camM.look = new T.Vector3(); _camM.up = new T.Vector3(0, 0, 1); }
  const pitch = _mystic ? 0.56 : 0.37;
  const d = _camDist3d;
  const fx = _camFocus.x, fy = _camFocus.y;
  const ex = fx - Math.cos(_camYaw3d) * d * Math.cos(pitch);
  const ey = fy - Math.sin(_camYaw3d) * d * Math.cos(pitch);
  const ez = d * Math.sin(pitch) + 10;
  // Shake in 3D: a small jitter on the eye.
  let jx = 0, jy = 0;
  if (_shakeT > 0) { jx = rand(-1, 1) * _shakeT * 0.4; jy = rand(-1, 1) * _shakeT * 0.4; }
  _camM.eye.set(ex + jx, -ey + jy, ez);
  _camEye.x = ex; _camEye.y = -ey;
  _camM.look.set(fx, -fy, 22);
  camera.position.copy(_camM.eye);
  _camM.m.lookAt(_camM.eye, _camM.look, _camM.up);
  camera.quaternion.setFromRotationMatrix(_camM.m);
  camera.updateMatrixWorld();
  _camYaw = _camYaw3d;
  _camProj = camera;
  _frame3d = _frame;
}

// ── Rendering: PixiJS ─────────────────────────────────────────────────────
// The adapter's body pass draws the pucks and the ring; one Graphics layer,
// redrawn every frame, adds the floor emblem, arcs, projectiles and effects.
let _pixiApp = null;
let _pixiDyn = null;
function cssHexInt(c) { return parseInt(c.slice(1, 7), 16); }

function drawPixiDynamic(PIXI, g) {
  g.clear();
  g.circle(0, 0, ARENA_R).fill({ color: 0x232a37, alpha: 1 }).stroke({ color: 0x8caadc, alpha: 0.5, width: 3 });
  for (let r = 60; r < ARENA_R; r += 60) g.circle(0, 0, r).stroke({ color: 0xffffff, alpha: 0.06, width: 1 });
  g.circle(0, 0, 150).stroke({ color: 0xb4a0ff, alpha: 0.2, width: 2 });
  for (const z of _zones) g.circle(z.x, z.y, z.r).fill({ color: cssHexInt(z.color), alpha: 0.2 + 0.3 * (z.t / z.T) });
  for (const m of _monsters) {
    if (!m.alive || m.state !== "attack" || actionPhase(m) !== "windup") continue;
    const reach = (m.def.smash || m.def.reach || 40) + m.def.r;
    g.circle(unitX(m), unitY(m), reach).fill({ color: 0xff6b5a, alpha: 0.15 + 0.3 * (m.stateT / Math.max(1, m.action.windup)) });
  }
  for (const u of [..._party, ..._monsters]) {
    if (!u.alive) continue;
    const x = unitX(u), y = unitY(u), r = u.def.r;
    g.moveTo(x + Math.cos(u.face - 0.5) * r * 0.6, y + Math.sin(u.face - 0.5) * r * 0.6)
      .lineTo(x + Math.cos(u.face) * (r + 5), y + Math.sin(u.face) * (r + 5))
      .lineTo(x + Math.cos(u.face + 0.5) * r * 0.6, y + Math.sin(u.face + 0.5) * r * 0.6)
      .stroke({ color: u.side === 0 ? 0xffffff : 0xffb4a0, width: u.isPlayer ? 2.5 : 1.5 });
    if (u.guard) g.moveTo(x + Math.cos(u.face - 1.2) * (r + 6), y + Math.sin(u.face - 1.2) * (r + 6)).arc(x, y, r + 6, u.face - 1.2, u.face + 1.2).stroke({ color: 0xa0dcff, width: 3 });
    if (u.cast) g.circle(x, y, 26).stroke({ color: 0xc8b4ff, alpha: 0.7, width: 2 });
  }
  for (const s of _slashes) {
    const k = s.t / s.T;
    const rr = s.r * (0.85 + k * 0.25);
    g.moveTo(s.x + Math.cos(s.a0) * rr, s.y + Math.sin(s.a0) * rr).arc(s.x, s.y, rr, s.a0, s.a1).stroke({ color: cssHexInt(s.color), alpha: (1 - k) * 0.85, width: 5 * (1 - k * 0.5) });
  }
  for (const p of _projs) {
    if (!p.body) continue;
    const x = p.body.position.x, y = p.body.position.y;
    if (p.kind === "arrow") g.moveTo(x - Math.cos(p.angle) * 12, y - Math.sin(p.angle) * 12).lineTo(x + Math.cos(p.angle) * 6, y + Math.sin(p.angle) * 6).stroke({ color: cssHexInt(p.color), width: 2 });
    else g.circle(x, y, p.r).fill({ color: cssHexInt(p.color) });
  }
  for (const r of _rings) {
    const k = r.t / r.T;
    g.circle(r.x, r.y, lerp(r.r, r.R, k)).stroke({ color: cssHexInt(r.color), alpha: (1 - k) * 0.8, width: 3 * (1 - k) + 1 });
  }
  for (const c of _corpses) g.circle(c.deadX, c.deadY, c.def.r * (1 - c.deadT * 0.7)).fill({ color: c.def.color, alpha: 1 - c.deadT });
  for (const p of _particles) g.circle(p.x, p.y - p.z * 0.6, p.r).fill({ color: cssHexInt(p.color), alpha: 1 - p.t / p.life });
}

// ── Input helpers ─────────────────────────────────────────────────────────
function primaryAction() {
  // Attack / begin / retry, depending on the phase.
  if (_phase === "title") { startRun(); return; }
  if (_phase === "victory") { if (_frame >= _lockUntil) startRun(); return; }
  if (_phase === "defeat") { if (_frame >= _lockUntil) retryWave(); return; }
  _pressed.attack = true;
}

function touchButtonAt(sx, sy) {
  for (const key of Object.keys(BTN)) {
    const b = BTN[key];
    if (Math.hypot(sx - b.x, sy - b.y) <= b.r + 6) return key;
  }
  return null;
}

// ── Demo definition ───────────────────────────────────────────────────────
export default {
  id: "blade-waltz",
  label: "Blade Waltz",
  tags: ["Gameplay", "AI", "Camera", "Sensors", "Callbacks", "Mobile"],
  desc:
    "A <b>Tales-style action-battle gauntlet</b> on a round arena: ten waves of monsters, a party of four, and you control the swordsman only. Run freely, land <b>3-hit combos</b> (<b>J</b> / click), spend TP on <b>artes</b> (<b>K</b> — neutral for the Demon Fang ground wave, toward the target for the Sonic Thrust dash, away for the launching Tiger Blade), <b>guard</b> with <b>L</b>, and unleash the <b>Mystic Arte</b> with <b>SPACE</b> once the Overlimit gauge fills from dealing and taking hits. Normal hits refill TP; guards only cover your front; stone golems and bosses shrug off single hits. Your <b>AI party</b> plays its roles: the lancer brawls and chains thrusts, the archer kites and volleys, the sage heals, revives and casts fire and stone with <b>interruptible cast times</b>. The tenth wave is a <b>drake</b> with claws, a tail spin, fire breath, a roar and wisp summons. Every combatant is a dynamic puck inside a ring of static wall segments; melee is resolved from arcs, while arrows, bolts, fireballs and waves are <b>sensor bodies</b> delivered by <code>InteractionListener</code>s with side filtering done by sensor masks. In <b>3D</b> a side-on chase camera frames the player–target line over a stone arena in a meadow, with jointed low-poly rigs for every combatant.",
  walls: false,
  workerCompatible: false,
  camera: null,

  setup(space) {
    _space = space;
    _runnerRef = this._runner || null;
    space.gravity = new Vec2(0, 0);
    installListeners(space);
    buildArena(space);
    resetAll(space);
    _scene3d = null;
    _pixiApp = null; _pixiDyn = null;
    _frame3d = -1; _camProj = null;

    _isTouch = typeof window !== "undefined" && (
      (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
      ("ontouchstart" in window) ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
    );

    // Re-entrant setup: drop listeners left from a previous play of this demo
    // (the runner has no teardown hook on card stop).
    if (typeof window !== "undefined") {
      if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
      if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
      _onKeyDown = (e) => {
        if (!_space) return;
        if (e.repeat) { if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); return; }
        _keys[e.code] = true;
        if (_phase === "title" && /^(Digit|Numpad)[0-9]$/.test(e.code)) {
          // Practice: a digit starts the gauntlet at that wave (0 = the drake).
          const n = Number(e.code.slice(-1));
          startRun(n === 0 ? 10 : n);
          return;
        }
        switch (e.code) {
          case "KeyJ": case "KeyZ": case "Enter": primaryAction(); break;
          case "KeyK": case "KeyX": if (_phase === "title") startRun(); else _pressed.arte = true; break;
          case "KeyL": case "KeyC": case "ShiftLeft": case "ShiftRight": _guardHeld = true; break;
          case "Space":
            if (_phase === "title" || _phase === "victory" || _phase === "defeat") primaryAction();
            else _pressed.burst = true;
            break;
          case "Tab": case "KeyQ": _pressed.cycle = true; break;
        }
        if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      };
      _onKeyUp = (e) => {
        if (!_space) return;
        _keys[e.code] = false;
        if (["KeyL", "KeyC", "ShiftLeft", "ShiftRight"].includes(e.code)) _guardHeld = false;
      };
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  // The demo owns its cameras, so the runner hands plain viewport coords.
  click(x, y) {
    if (_phase === "title" || _phase === "victory" || _phase === "defeat") { primaryAction(); return; }
    if (_isTouch) {
      const b = touchButtonAt(x, y);
      if (b === "attack") { _pressed.attack = true; return; }
      if (b === "arte") { _pressed.arte = true; return; }
      if (b === "burst") { _pressed.burst = true; return; }
      if (b === "guard") { _touchGuardT = 45; return; }
      if (x < VIEW_W * 0.55) {
        _pointer.active = true; _pointer.steer = true;
        _pointer.x = _pointer.startX = x; _pointer.y = _pointer.startY = y;
        _pointer.startFrame = _frame;
        return;
      }
      _pressed.attack = true;
      return;
    }
    _pressed.attack = true;
  },
  drag(x, y) {
    if (_pointer.active) { _pointer.x = x; _pointer.y = y; }
  },
  release() {
    if (!_pointer.active) return;
    _pointer.active = false;
    _pointer.steer = false;
    // A short tap on the steering side is a target cycle.
    const held = _frame - _pointer.startFrame;
    const drift = Math.hypot(_pointer.x - _pointer.startX, _pointer.y - _pointer.startY);
    if (held < TAP_MAX_FRAMES && drift < TAP_MAX_DRIFT) _pressed.cycle = true;
  },

  step() {
    stepWorld();
  },

  // Canvas2D — top-down, own follow camera.
  render(ctx, space, W, H, showOutlines) {
    _camYaw = -Math.PI / 2;
    ctx.save();
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2 - _cam2d.x, H / 2 - _cam2d.y);
    // Meadow hint outside the ring.
    ctx.fillStyle = "#15211a";
    ctx.beginPath(); ctx.arc(0, 0, ARENA_R + 260, 0, Math.PI * 2); ctx.fill();
    drawArenaFloor(ctx);
    drawTelegraphs2d(ctx);
    for (const w of _walls) drawBody(ctx, w.body, showOutlines);
    for (const p of _party) if (p.alive && p.cast) drawCastCircle2d(ctx, p);
    const units = [..._party, ..._monsters].sort((a, b) => unitY(a) - unitY(b));
    for (const u of units) drawUnit2d(ctx, u, showOutlines);
    drawWorldEffects2d(ctx);
    ctx.restore();
    void space;
  },

  renderPixi(adapter, space, W, H, showOutlines) {
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;
    _camYaw = -Math.PI / 2;
    adapter.setOutlines(showOutlines);
    if (_pixiApp !== app || !_pixiDyn || _pixiDyn.parent !== app.stage) {
      if (_pixiDyn?.parent) _pixiDyn.parent.removeChild(_pixiDyn);
      _pixiApp = app;
      _pixiDyn = new PIXI.Graphics();
      app.stage.addChild(_pixiDyn);
    }
    adapter.syncBodies(space);
    drawPixiDynamic(PIXI, _pixiDyn);
    // Under the bodies (the adapter re-adds its container on every load).
    app.stage.setChildIndex(_pixiDyn, Math.min(1, app.stage.children.length - 1));
    app.stage.position.set(W / 2 - _cam2d.x, H / 2 - _cam2d.y);
    app.render();
  },

  // 3D — everything is drawn by the demo: the bodies are all hidden from the
  // adapter's pass and replaced by rigs, the ring by the balustrade.
  render3d(renderer, scene, camera, space, W, H, camX, camY, adapter) {
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    ensureScene(adapter, scene);
    ensureEnvironment(adapter);
    ensureFigures(adapter);
    syncFigures(adapter);
    syncEffects3d(adapter);
    placeCamera3d(camera);
    syncEnvironment();
    renderer.render(scene, camera);
    void space; void W; void H; void camX; void camY;
  },

  // All render modes: projected world cues plus the screen-space HUD.
  render3dOverlay(ctx) {
    if (_phase !== "title") {
      drawUnitCues(ctx);
    }
    drawFloaters(ctx);
    drawHUD(ctx);
    if (_phase === "title") drawTitle(ctx);
    drawBanners(ctx);
  },
};
