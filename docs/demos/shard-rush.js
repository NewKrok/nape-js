import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType, Ray,
} from "../nape-js.esm.js?v=3.42.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.42.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.0";
import {
  createCharacter, destroyCharacter, syncCharacter, heroPalette, createBoardMaterial,
} from "../renderers/lowpoly-characters.js?v=3.42.0";

// ── Shard Rush — 3v3 top-down hero arena ──────────────────────────────────
//
// A mobile-style hero brawler: two teams of three on a walled arena with a
// crystal mine in the middle. The mine coughs up a shard every few seconds;
// carry ten between your team and hold them through a fifteen-second
// countdown to win. Die and you drop every shard you were carrying.
//
// Six original hero archetypes, each with an attack, a chargeable SUPER and a
// distinct low-poly figure: a shotgunner, a gunslinger, a wrestler, a bard, a
// thrower and an engineer. You pick one on the select screen; two AI
// teammates and three AI opponents fill the rest of the roster, each running
// the same kit-aware brain (range bands, cover, bush stealth, retreat-to-heal,
// mine control and super timing).
//
// Physics-wise every fighter is a dynamic puck, every wall a static box, and
// every projectile a real sensor body: hits are delivered by
// InteractionListeners on the bullet/unit and bullet/wall pairs, with team
// filtering done entirely through sensor groups and masks. Bushes are stealth
// regions, not bodies. Crates are destructible — a wall-breaking super removes
// the body from the Space and the arena's line-of-sight changes for good.
//
// The 3D mode dresses the shared top-down rig with hats and weapons per hero,
// textures the ground from the same layout data the physics uses, and draws
// shards, bushes, tracers, lobbed flasks and turrets as their own meshes.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;

// The arena is taller than the view, so the camera follows your hero.
const WORLD_W = 1200;
const WORLD_H = 900;
const CX = WORLD_W / 2;
const CY = WORLD_H / 2;
const BORDER_T = 24;

// ── Collision filtering ───────────────────────────────────────────────────
// Collision groups/masks decide who bumps into whom; sensor groups/masks decide
// which projectile can *hit* whom. Team membership lives in the sensor bits, so
// a bullet simply masks out its own team and never needs a code check.
const G_HERO = 1 << 1;
const G_WALL = 1 << 2;
const G_BORDER = 1 << 3;
const G_BULLET = 1 << 4;
const G_TURRET = 1 << 5;
const S_TEAM = [1 << 6, 1 << 7];        // sensor bit per team (units + turrets)
const S_SOLID = 1 << 8;                 // walls + border, for bullets to die on

// ── Timing (frames at 60 Hz) ──────────────────────────────────────────────
const SHARD_SPAWN_FRAMES = 300;         // one shard from the mine every 5 s
const SHARD_FIRST_FRAMES = 150;
const SHARD_MINE_CAP = 8;               // the mine stops while this many sit on it
const SHARDS_TO_WIN = 10;
const COUNTDOWN_FRAMES = 15 * 60;
const MATCH_FRAMES = 4 * 60 * 60;       // 4:00 hard cap — more shards wins
const READY_FRAMES = 150;               // 3-2-1-GO after the pick
const RESPAWN_FRAMES = 180;
const SHIELD_FRAMES = 120;              // spawn protection
const REGEN_DELAY = 180;                // no damage for 3 s → regen
const REGEN_PER_SEC = 0.12;             // fraction of max HP per second
const DROP_PICK_DELAY = 24;             // dropped shards can't be grabbed instantly
const REVEAL_R = 90;                    // a bushed hero is seen from this close
const REVEAL_AFTER_ATTACK = 60;         // …and for this long after attacking
const OVER_LOCK = 45;

// ── Movement ──────────────────────────────────────────────────────────────
const HERO_R = 16;
const SHARD_CLEAR = HERO_R + 6;         // shards never rest closer than this to a wall
const CONTROL_BLEND = 0.24;             // velocity blend per frame → snappy, but shoves carry
const DRAG = 0.90;
const STUN_DRAG = 0.93;

// ── Heroes ────────────────────────────────────────────────────────────────
// Six archetypes. Numbers are tuned against the headless harness so that an
// AI-piloted pick wins somewhere near half its matches: no kit is a trap.
//
// attack.kind:
//   spread — a cone of pellets (short range, brutal up close)
//   burst  — a stream of quick bullets (long range, needs a clear line)
//   melee  — a swing that hits everything in a short arc
//   wave   — an expanding arc that passes over walls and through everyone
//   lob    — an arcing flask that lands on a point, splashes and puddles
//   bolt   — a single bolt that chains once to a nearby second enemy
// super.kind: blast | volley | leap | healwave | barrage | turret
const HEROES = [
  {
    id: "buckshot", name: "Buckshot", cls: "Shotgunner", color: 0xc678dd,
    hp: 5800, speed: 172, reload: 92, superNeed: 5400,
    attack: { kind: "spread", pellets: 5, spread: 0.46, dmg: 300, range: 230, speed: 640 },
    super: { kind: "blast", pellets: 9, spread: 0.62, dmg: 320, range: 330, speed: 720, knock: 260 },
    rig: { weapon: "shotgun", hat: "cowboy", bulk: 1.0, hatColor: 0x5a3a2a, accent: 0xf2c14e },
    blurb: "Wide shotgun blast — closer is deadlier",
    superBlurb: "Wall-breaking mega blast that knocks foes back",
    stats: { hp: 3, dmg: 4, range: 2, speed: 3 },
  },
  {
    id: "deadeye", name: "Deadeye", cls: "Gunslinger", color: 0x4dabf7,
    hp: 3900, speed: 182, reload: 96, superNeed: 4700,
    attack: { kind: "burst", count: 6, gap: 3, dmg: 180, spread: 0.035, range: 430, speed: 820 },
    super: { kind: "volley", count: 12, gap: 2, dmg: 150, range: 580, speed: 900 },
    rig: { weapon: "pistols", hat: "bandana", bulk: 0.92, hatColor: 0xc23b3b, accent: 0xe6d3a3 },
    blurb: "Six-shot burst at long range — every bullet counts",
    superBlurb: "Piercing volley that drills straight through walls",
    stats: { hp: 2, dmg: 3, range: 4, speed: 4 },
  },
  {
    id: "slammer", name: "Slammer", cls: "Wrestler", color: 0x51cf66,
    hp: 8000, speed: 200, reload: 48, superNeed: 3900,
    attack: { kind: "melee", dmg: 1000, range: 54, arc: 1.15, knock: 140 },
    super: { kind: "leap", range: 260, dmg: 900, radius: 74, knock: 380, air: 42 },
    rig: { weapon: "fists", hat: "mask", bulk: 1.3, hatColor: 0x1f7a3a, accent: 0xffd166 },
    blurb: "Heavyweight brawler — punches hard, soaks damage",
    superBlurb: "Leaps over walls and slams down for area damage",
    stats: { hp: 4, dmg: 4, range: 1, speed: 4 },
  },
  {
    id: "tempo", name: "Tempo", cls: "Bard", color: 0xffd43b,
    hp: 5000, speed: 172, reload: 84, superNeed: 4200,
    attack: { kind: "wave", dmg: 580, range: 270, arc: 0.55, speed: 540 },
    super: { kind: "healwave", heal: 2200, radius: 260 },
    rig: { weapon: "lute", hat: "sombrero", bulk: 1.0, hatColor: 0xb8862b, accent: 0xff6b6b },
    blurb: "Sound wave that pierces everyone and rolls over walls",
    superBlurb: "Healing chord for every teammate nearby",
    stats: { hp: 3, dmg: 3, range: 3, speed: 3 },
  },
  {
    id: "flask", name: "Flask", cls: "Thrower", color: 0xff922b,
    hp: 3400, speed: 172, reload: 104, superNeed: 3900,
    attack: { kind: "lob", dmg: 560, range: 340, radius: 54, flight: 44, puddle: 120, tick: 90 },
    super: { kind: "barrage", count: 6, dmg: 480, radius: 54, scatter: 70, gap: 5, range: 360 },
    rig: { weapon: "bottle", hat: "goggles", bulk: 0.94, hatColor: 0x3d3d46, accent: 0x9be15d },
    blurb: "Lobs flasks over walls — they splash and leave burning puddles",
    superBlurb: "Barrage of six flasks on a spot",
    stats: { hp: 1, dmg: 3, range: 4, speed: 3 },
  },
  {
    id: "gizmo", name: "Gizmo", cls: "Engineer", color: 0xf06595,
    hp: 4500, speed: 172, reload: 90, superNeed: 4200,
    attack: { kind: "bolt", dmg: 700, chainDmg: 380, chainR: 150, range: 360, speed: 720 },
    super: { kind: "turret", hp: 3200, life: 20 * 60, range: 300, dmg: 260, cd: 36, place: 150 },
    rig: { weapon: "wrench", hat: "cap", bulk: 0.96, hatColor: 0xd6336c, accent: 0xffe066 },
    blurb: "Energy bolt that chains to a second enemy nearby",
    superBlurb: "Deploys an auto-firing turret",
    stats: { hp: 3, dmg: 3, range: 3, speed: 3 },
  },
];
const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));

const TEAM_COLORS = ["#58a6ff", "#f85149"];     // blue = you, red = them
const TEAM_HEX = [0x58a6ff, 0xf85149];
const TEAM_NAMES = ["BLUE", "RED"];
const SHARD_COLOR = "#c084fc";
const SHARD_HEX = 0xc084fc;

// ── Arena layout ──────────────────────────────────────────────────────────
// Everything is authored for the RED half (top) and rotated 180° about the
// centre for BLUE, so the two sides are exactly fair. Rows on the centre line
// are listed once.
//
//   [x, y, w, h, breakable]
const TOP_WALLS = [
  [300, 120, 40, 140, false],   // base flank pillars
  [860, 120, 40, 140, false],
  [480, 214, 80, 30, true],     // crates in front of the base
  [640, 214, 80, 30, true],
  [150, 330, 130, 36, true],    // flank lane crates
  [920, 330, 130, 36, true],
  [560, 300, 80, 34, true],     // blocks the straight base→mine line
];
const CENTER_WALLS = [
  [420, 380, 36, 140, false],   // the mine chamber pillars
  [744, 380, 36, 140, false],
  [90, 420, 110, 60, true],     // flank crates on the centre row
  [1000, 420, 110, 60, true],
];
const TOP_BUSHES = [
  [40, 250, 150, 110],
  [1010, 250, 150, 110],
  [60, 40, 180, 90],
  [960, 40, 180, 90],
];
const CENTER_BUSHES = [
  [235, 395, 130, 110],
  [835, 395, 130, 110],
];

function mirrorRect(r) {
  return [WORLD_W - r[0] - r[2], WORLD_H - r[1] - r[3], ...r.slice(2)];
}
const WALL_DEFS = [...TOP_WALLS, ...TOP_WALLS.map(mirrorRect), ...CENTER_WALLS];
const BUSH_DEFS = [...TOP_BUSHES, ...TOP_BUSHES.map(mirrorRect), ...CENTER_BUSHES];

// Spawn spots: three per team, red along the top, blue along the bottom.
const SPAWNS = [
  [{ x: 520, y: 830 }, { x: 600, y: 850 }, { x: 680, y: 830 }],
  [{ x: 680, y: 70 }, { x: 600, y: 50 }, { x: 520, y: 70 }],
];
const BASE_CENTER = [{ x: 600, y: 838 }, { x: 600, y: 62 }];
const MINE = { x: CX, y: CY, r: 46 };

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _heroes = [];          // hero records, index 0 = the human
let _walls = [];           // { body, rect, breakable, alive }
let _turrets = [];         // { body, team, hp, life, cd, aim, owner }
let _bullets = [];         // { body, team, dmg, life, kind, breaks, pierce, knock, hits:Set, color, owner }
let _lobs = [];            // { x0,y0,x1,y1,t,T,team,dmg,radius,puddle,owner,color }
let _waves = [];           // { x,y,angle,arc,r,speed,range,dmg,team,hit:Set,owner }
let _puddles = [];         // { x,y,r,t,dmg,tick,team,owner }
let _shards = [];          // { x,y,vx,vy,z,vz,t,pickAt,bob }
let _particles = [];       // { x,y,vx,vy,t,life,color,r }
let _floaters = [];        // { x,y,t,text,color }
let _cbBullet = null, _cbUnit = null, _cbSolid = null;
let _unitByBody = new Map();   // body → hero | turret record
let _wallByBody = new Map();

let _frame = 0;
let _phase = "select";     // "select" | "ready" | "play" | "over"
let _phaseT = 0;
let _clock = 0;            // frames of play
let _teamShards = [0, 0];
let _countdown = -1;       // frames left, -1 when nobody holds enough
let _countTeam = -1;
let _winner = -1;          // -1 draw, else team
let _restartLockUntil = 0;
let _nextShardAt = 0;
let _selIdx = 0;           // highlighted card on the select screen
let _isTouch = false;
let _runnerRef = null;
const _camTarget = { x: BASE_CENTER[0].x, y: BASE_CENTER[0].y };
let _deathHold = 0;

// Input
const _keys = Object.create(null);
let _onKeyDown = null;
let _onKeyUp = null;
const _moveDir = { x: 0, y: 0 };
const _pointer = { active: false, x: 0, y: 0, startX: 0, startY: 0, startFrame: 0 };
let _mouseDown = false;
// Pointer aim lives in SCREEN space; the world point is re-derived each frame
// from the camera the last render pass actually used (shake included).
const _aimScreen = { x: VIEW_W * 0.5, y: VIEW_H * 0.3 };
const _aim = { x: 0, y: 0 };
const _viewCam = { x: 0, y: 0 };
const TAP_MAX_FRAMES = 16;
const TAP_MAX_DRIFT = 12;
const STEER_DEADZONE = 14;
const SUPER_BTN = { x: VIEW_W - 62, y: VIEW_H - 62, r: 34 };

// Harness hook: when set, the human hero is driven by the AI brain.
let _autopilot = false;

// ── Helpers ───────────────────────────────────────────────────────────────
function rand(min, max) { return min + Math.random() * (max - min); }
function irand(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hexCss(hex) { return "#" + hex.toString(16).padStart(6, "0"); }
function pointInRect(px, py, r) {
  return px >= r[0] && px <= r[0] + r[2] && py >= r[1] && py <= r[1] + r[3];
}
function circleHitsRect(cx, cy, cr, r) {
  const nx = clamp(cx, r[0], r[0] + r[2]);
  const ny = clamp(cy, r[1], r[1] + r[3]);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= cr * cr;
}
function humanHero() { return _heroes[0]; }
function otherTeam(t) { return 1 - t; }

// Which bush a point sits in, or -1.
function bushAt(x, y) {
  for (let i = 0; i < BUSH_DEFS.length; i++) if (pointInRect(x, y, BUSH_DEFS[i])) return i;
  return -1;
}

// A hero hidden in a bush is invisible to the other team unless something gives
// them away: an enemy within REVEAL_R, or their own attack in the last second.
function visibleTo(h, team) {
  if (h.team === team) return true;
  if (!h.alive) return false;
  if (h.bush < 0) return true;
  if (_frame - h.lastAttack < REVEAL_AFTER_ATTACK) return true;
  const hx = h.body.position.x, hy = h.body.position.y;
  for (const q of _heroes) {
    if (q.team !== team || !q.alive) continue;
    if (Math.hypot(q.body.position.x - hx, q.body.position.y - hy) < REVEAL_R) return true;
  }
  for (const t of _turrets) {
    if (t.team !== team) continue;
    if (Math.hypot(t.body.position.x - hx, t.body.position.y - hy) < REVEAL_R) return true;
  }
  return false;
}

// Straight-line visibility through the live wall set (crates come and go).
const RAY_WALL_FILTER = new InteractionFilter(1, G_WALL | G_BORDER);
// Steering also has to see turrets: they are static bodies that block a puck
// just like a wall, and an AI that cannot see one walks into it for 20 s.
const RAY_STEER_FILTER = new InteractionFilter(1, G_WALL | G_BORDER | G_TURRET);
function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const ray = new Ray(new Vec2(x0, y0), new Vec2(dx / d, dy / d));
  ray.maxDistance = d;
  return _space.rayCast(ray, false, RAY_WALL_FILTER) === null;
}
function wallDistance(x, y, dx, dy, maxD) {
  const len = Math.hypot(dx, dy);
  if (!(len > 1e-3)) return maxD + 1;
  const ray = new Ray(new Vec2(x, y), new Vec2(dx / len, dy / len));
  ray.maxDistance = maxD;
  const hit = _space.rayCast(ray, false, RAY_STEER_FILTER);
  return hit ? hit.distance : maxD + 1;
}
function pointInAnyWall(x, y, pad = 0) {
  for (const w of _walls) {
    if (!w.alive) continue;
    const r = w.rect;
    if (x >= r[0] - pad && x <= r[0] + r[2] + pad && y >= r[1] - pad && y <= r[1] + r[3] + pad) return true;
  }
  return x < pad || y < pad || x > WORLD_W - pad || y > WORLD_H - pad;
}

// ── World construction ────────────────────────────────────────────────────
// No explicit Material on any Polygon: dynamic-vs-Polygon pairs with explicit
// materials are a known engine trap (P53). The default material is fine for
// walls that only ever get bumped by pucks.
function addWall(space, rect, breakable, isBorder) {
  const [x, y, w, h] = rect;
  const b = new Body(BodyType.STATIC, new Vec2(x + w / 2, y + h / 2));
  const s = new Polygon(Polygon.box(w, h));
  s.filter = new InteractionFilter(isBorder ? G_BORDER : G_WALL, ~0, S_SOLID, ~0);
  s.cbTypes.add(_cbSolid);
  b.shapes.add(s);
  b.space = space;
  try {
    b.userData._kind = isBorder ? "border" : breakable ? "crate" : "wall";
    // Crates read gold in 2D so you can tell what a wall-breaker will open.
    if (breakable) b.userData._colorIdx = 1;
  } catch (_) {}
  const rec = { body: b, rect, breakable, alive: true, isBorder };
  _walls.push(rec);
  _wallByBody.set(b, rec);
  return rec;
}

function buildWorld(space) {
  _walls = [];
  _wallByBody = new Map();
  // Border — outside the playable rectangle so the world coords stay 0..W/H.
  addWall(space, [-BORDER_T, -BORDER_T, WORLD_W + BORDER_T * 2, BORDER_T, false], false, true);
  addWall(space, [-BORDER_T, WORLD_H, WORLD_W + BORDER_T * 2, BORDER_T, false], false, true);
  addWall(space, [-BORDER_T, 0, BORDER_T, WORLD_H, false], false, true);
  addWall(space, [WORLD_W, 0, BORDER_T, WORLD_H, false], false, true);
  for (const def of WALL_DEFS) addWall(space, def.slice(0, 4), def[4], false);
}

function breakWall(w, ix, iy) {
  if (!w.alive || !w.breakable) return false;
  w.alive = false;
  if (w.body.space) w.body.space = null;
  const [x, y, ww, hh] = w.rect;
  addParticles(x + ww / 2, y + hh / 2, 16, "#d2a25a", Math.max(ww, hh) * 0.5, 160);
  addParticles(ix ?? x + ww / 2, iy ?? y + hh / 2, 6, "#8a5f33", 10, 120);
  if (_runnerRef) _runnerRef.shakeCamera(5, 0.18);
  return true;
}

// ── Heroes ────────────────────────────────────────────────────────────────
function spawnHeroBody(spot, team) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(spot.x, spot.y));
  // Firm, slippery pucks: shoulder contact nudges, walls don't grab.
  const shape = new Circle(HERO_R, undefined, new Material(0.2, 0.05, 0.05, 1));
  shape.filter = new InteractionFilter(G_HERO, ~0, S_TEAM[team], ~0);
  shape.cbTypes.add(_cbUnit);
  body.shapes.add(shape);
  body.allowRotation = false;
  body.isBullet = true;
  try {
    // Every render mode draws heroes itself (bush stealth and death have to
    // hide them per frame, which the adapters' cached body passes can't do):
    // 3D draws the low-poly figure, 2D and Pixi draw team-coloured pucks.
    body.userData._hidden3d = true;
    body.userData._hidden = true;
    body.userData._colorIdx = team === 0 ? 0 : 3;
  } catch (_) {}
  body.space = _space;
  return body;
}

// Whether the human should see this hero at all right now.
function shownToHuman(h) {
  if (_phase === "select") return h.team === 0;
  return h.alive && visibleTo(h, 0);
}

function makeHero(idx, team, spotIdx, def, isHuman) {
  const spot = SPAWNS[team][spotIdx];
  const body = spawnHeroBody(spot, team);
  const h = {
    idx, team, spotIdx, isHuman, def, body,
    alive: true,
    hp: def.hp, maxHp: def.hp,
    ammo: 3, reloadT: 0,
    super: 0,                 // 0..1
    shards: 0,
    faceX: 0, faceY: team === 0 ? -1 : 1,
    lastDamaged: -9999, lastAttack: -9999,
    respawnT: 0, shieldT: 0, stunT: 0,
    fireCd: 0, aimHold: 0, leapZ: 0, deathX: 0, deathY: 0,
    dispAngle: team === 0 ? -Math.PI / 2 : Math.PI / 2,
    bush: -1,
    // Animation triggers, read by the render passes then cleared in step.
    attackFlash: false, hitFlash: false, deadAnim: 0,
    // Streams (burst / volley / barrage) fire over several frames.
    stream: null,
    // Leap (slammer super): { x0,y0,x1,y1,t,T }
    leap: null,
    kills: 0, deaths: 0, dealt: 0,
    // AI brain — the human gets one too, so a harness can drive them.
    ai: makeBrain(),
  };
  _unitByBody.set(body, h);
  return h;
}

function makeBrain() {
  return {
    t: irand(0, 5),
    tx: 0, ty: 0, hasTarget: false,
    mode: "roam",
    target: null,           // hero/turret record we are engaging
    strafePhase: rand(0, Math.PI * 2),
    strafeFreq: rand(0.02, 0.045),
    side: Math.random() < 0.5 ? -1 : 1,
    skill: rand(0.45, 0.9),      // aim precision + trigger discipline
    aggro: rand(0.3, 0.8),
    avoidDir: null, avoidHold: 0,
    role: "fight",
    fireGate: 0,
    faceLock: false,       // facing pinned to the target while inside reach
  };
}

// Swap the human's hero kit in place (select screen). The body stays; the
// record's stats, ammo and figure are rebuilt around the new definition.
function setHumanHero(def) {
  const h = humanHero();
  h.def = def;
  h.hp = h.maxHp = def.hp;
  h.ammo = 3;
  h.reloadT = 0;
  h.super = 0;
  h.stream = null;
  h.leap = null;
}

function pickAiKits(team, avoidId) {
  // Each team fields three DIFFERENT heroes; teammates never copy the human.
  const pool = HEROES.filter(d => d.id !== avoidId).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = irand(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, team === 0 ? 2 : 3);
}

function buildRoster(humanDef) {
  for (const h of _heroes) {
    if (h.body?.space) h.body.space = null;
  }
  _heroes = [];
  _unitByBody = new Map();
  _heroes.push(makeHero(0, 0, 1, humanDef, true));
  const blueKits = pickAiKits(0, humanDef.id);
  _heroes.push(makeHero(1, 0, 0, blueKits[0], false));
  _heroes.push(makeHero(2, 0, 2, blueKits[1], false));
  const redKits = pickAiKits(1, null);
  for (let i = 0; i < 3; i++) _heroes.push(makeHero(3 + i, 1, i, redKits[i], false));
}

// Park a hero at their spawn: used on death (the body stays in the Space but
// collides with nothing) and on respawn.
function parkHero(h) {
  const spot = SPAWNS[h.team][h.spotIdx];
  h.body.position = new Vec2(spot.x, spot.y);
  h.body.velocity = new Vec2(0, 0);
}

function setHeroSolid(h, solid) {
  const f = h.body.shapes.at(0).filter;
  f.collisionMask = solid ? ~0 : 0;
  // A dead or leaping hero can't be hit either.
  f.sensorMask = solid ? ~0 : 0;
  f.sensorGroup = solid ? S_TEAM[h.team] : 0;
}

// ── Damage, healing, death ────────────────────────────────────────────────
function addSuper(h, amount) {
  if (!h.alive) return;
  h.super = Math.min(1, h.super + amount / h.def.superNeed);
}

function damageHero(h, dmg, from, ix, iy, knockX = 0, knockY = 0) {
  if (!h.alive || h.shieldT > 0) return 0;
  if (from && from.team === h.team) return 0;
  const dealt = Math.min(h.hp, dmg);
  h.hp -= dealt;
  h.lastDamaged = _frame;
  h.hitFlash = true;
  if (from) { addSuper(from, dealt); from.dealt += dealt; }
  addFloater(h.body.position.x, h.body.position.y - HERO_R - 10, String(Math.round(dealt)),
    h.team === 0 ? "#ff8787" : "#ffd166");
  addParticles(ix ?? h.body.position.x, iy ?? h.body.position.y, 4, hexCss(h.def.color), 6, 90);
  if (knockX || knockY) {
    const v = h.body.velocity;
    h.body.velocity = new Vec2(v.x + knockX, v.y + knockY);
    h.stunT = Math.max(h.stunT, 14);
  }
  if (h.isHuman && _runnerRef) _runnerRef.shakeCamera(3, 0.1);
  if (h.hp <= 0) killHero(h, from);
  return dealt;
}

function healHero(h, amount, from) {
  if (!h.alive) return 0;
  const healed = Math.min(h.maxHp - h.hp, amount);
  if (healed <= 0) return 0;
  h.hp += healed;
  if (from && from !== h) addSuper(from, healed * 0.6);
  addFloater(h.body.position.x, h.body.position.y - HERO_R - 10, "+" + Math.round(healed), "#8ce99a");
  return healed;
}

function killHero(h, from) {
  h.alive = false;
  h.hp = 0;
  h.deaths++;
  if (from) from.kills++;
  h.respawnT = RESPAWN_FRAMES;
  h.deadAnim = 0.001;
  h.stream = null;
  h.leap = null;
  h.stunT = 0;
  const x = h.body.position.x, y = h.body.position.y;
  // Drop everything — a ring of shards thrown outward, grabbable after a beat.
  for (let i = 0; i < h.shards; i++) {
    const a = (i / Math.max(1, h.shards)) * Math.PI * 2 + rand(-0.3, 0.3);
    const sp = rand(70, 130);
    _shards.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, z: 0, vz: rand(180, 260),
      t: 0, pickAt: _frame + DROP_PICK_DELAY, bob: rand(0, Math.PI * 2),
    });
  }
  h.shards = 0;
  recountShards();
  addParticles(x, y, 22, hexCss(h.def.color), 14, 220);
  addParticles(x, y, 8, TEAM_COLORS[h.team], 6, 140);
  if (_runnerRef) _runnerRef.shakeCamera(h.isHuman ? 12 : 6, 0.3);
  // Own turrets die with their engineer? No — they outlive them, like sandbags.
  setHeroSolid(h, false);
  if (h.isHuman) _deathHold = 60;
  h.deathX = x; h.deathY = y;
}

function respawnHero(h) {
  h.alive = true;
  h.hp = h.maxHp;
  h.ammo = 3;
  h.reloadT = 0;
  h.shieldT = SHIELD_FRAMES;
  h.deadAnim = 0;
  h.bush = -1;
  h.stunT = 0;
  parkHero(h);
  setHeroSolid(h, true);
  h.faceX = 0;
  h.faceY = h.team === 0 ? -1 : 1;
  if (h.ai) { h.ai.hasTarget = false; h.ai.target = null; h.ai.mode = "roam"; }
}

// ── Projectiles ───────────────────────────────────────────────────────────
// Every bullet is a sensor body: it collides with nothing and is moved by the
// engine, and the two InteractionListeners below deliver its hits. Team
// filtering is entirely in the sensor mask — a bullet's mask names the walls
// and the OTHER team, so friendly fire never reaches the handler.
function fireBullet(owner, x, y, angle, o) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const r = o.r ?? 4;
  const s = new Circle(r);
  s.sensorEnabled = true;
  s.filter = new InteractionFilter(G_BULLET, 0, G_BULLET, S_SOLID | S_TEAM[otherTeam(owner.team)]);
  s.cbTypes.add(_cbBullet);
  body.shapes.add(s);
  body.velocity = new Vec2(Math.cos(angle) * o.speed, Math.sin(angle) * o.speed);
  body.allowRotation = false;
  try {
    body.userData._hidden = true;
    body.userData._hidden3d = true;
  } catch (_) {}
  body.space = _space;
  const rec = {
    body, owner, team: owner.team, dmg: o.dmg, angle,
    life: Math.ceil((o.range / o.speed) * 60),
    kind: o.kind || "shot",
    breaks: !!o.breaks, pierce: !!o.pierce, knock: o.knock || 0,
    chain: o.chain || null,
    color: o.color || hexCss(owner.def.color),
    r,
    hits: new Set(),
  };
  _bullets.push(rec);
  return rec;
}

function killBullet(rec) {
  if (rec.body?.space) rec.body.space = null;
  rec.body = null;
}

function clearProjectiles() {
  for (const b of _bullets) killBullet(b);
  _bullets = [];
  _lobs = [];
  _waves = [];
  _puddles = [];
}

// Bullet → unit. `pierce` bullets keep flying; everything else dies on impact.
function onBulletHitsUnit(rec, unit, ix, iy) {
  if (!rec.body || rec.hits.has(unit)) return;
  rec.hits.add(unit);
  const kx = rec.knock ? Math.cos(rec.angle) * rec.knock : 0;
  const ky = rec.knock ? Math.sin(rec.angle) * rec.knock : 0;
  if (unit.def) damageHero(unit, rec.dmg, rec.owner, ix, iy, kx, ky);
  else damageTurret(unit, rec.dmg, rec.owner);
  addParticles(ix, iy, 3, rec.color, 4, 80);
  if (rec.chain && unit.def) {
    // Engineer's bolt: arc to the nearest OTHER enemy within reach, once.
    let best = null, bestD = rec.chain.r;
    for (const q of _heroes) {
      if (q === unit || q.team === rec.team || !q.alive || q.shieldT > 0) continue;
      const d = Math.hypot(q.body.position.x - ix, q.body.position.y - iy);
      if (d < bestD) { best = q; bestD = d; }
    }
    if (best) {
      const a = Math.atan2(best.body.position.y - iy, best.body.position.x - ix);
      const b = fireBullet(rec.owner, ix, iy, a, {
        speed: 720, range: rec.chain.r + 40, dmg: rec.chain.dmg, r: 3, color: "#ffe066", kind: "chain",
      });
      b.hits.add(unit);
    }
  }
  if (!rec.pierce) killBullet(rec);
}

function onBulletHitsWall(rec, wall, ix, iy) {
  if (!rec.body) return;
  if (rec.breaks && wall.breakable && wall.alive) {
    breakWall(wall, ix, iy);
    return; // a wall-breaker keeps going
  }
  addParticles(ix, iy, 2, rec.color, 3, 60);
  killBullet(rec);
}

function installListeners(space) {
  _cbBullet = new CbType();
  _cbUnit = new CbType();
  _cbSolid = new CbType();
  const resolve = (cb) => {
    const b1 = cb.int1.castBody ?? cb.int1.castShape?.body ?? null;
    const b2 = cb.int2.castBody ?? cb.int2.castShape?.body ?? null;
    return [b1, b2];
  };
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbBullet, _cbUnit,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const rec = _bullets.find(r => r.body === b1 || r.body === b2);
      if (!rec) return;
      const ub = rec.body === b1 ? b2 : b1;
      const unit = _unitByBody.get(ub);
      if (!unit) return;
      const p = rec.body.position;
      onBulletHitsUnit(rec, unit, p.x, p.y);
    },
  ));
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbBullet, _cbSolid,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const rec = _bullets.find(r => r.body === b1 || r.body === b2);
      if (!rec) return;
      const wb = rec.body === b1 ? b2 : b1;
      const wall = _wallByBody.get(wb);
      if (!wall) return;
      const p = rec.body.position;
      onBulletHitsWall(rec, wall, p.x, p.y);
    },
  ));
}

function tickBullets() {
  for (let i = _bullets.length - 1; i >= 0; i--) {
    const b = _bullets[i];
    if (b.body && --b.life <= 0) killBullet(b);
    if (!b.body) _bullets.splice(i, 1);
  }
}

// ── Lobs (thrower) ────────────────────────────────────────────────────────
function throwLob(owner, tx, ty, o) {
  const x0 = owner.body.position.x, y0 = owner.body.position.y;
  const d = Math.hypot(tx - x0, ty - y0);
  const T = Math.max(18, Math.round(o.flight * (0.55 + 0.45 * Math.min(1, d / o.range))));
  _lobs.push({
    x0, y0, x1: tx, y1: ty, t: 0, T, team: owner.team, owner,
    dmg: o.dmg, radius: o.radius, puddle: o.puddle || 0, tick: o.tick || 0,
    color: hexCss(owner.def.color),
  });
}

function splash(owner, x, y, radius, dmg, knock = 0, breaks = false) {
  for (const h of _heroes) {
    if (h.team === owner.team || !h.alive) continue;
    const dx = h.body.position.x - x, dy = h.body.position.y - y;
    const d = Math.hypot(dx, dy);
    if (d <= radius + HERO_R) {
      const k = d > 1 ? knock / d : 0;
      damageHero(h, dmg, owner, h.body.position.x, h.body.position.y, dx * k, dy * k);
    }
  }
  for (const t of _turrets) {
    if (t.team === owner.team || t.hp <= 0) continue;
    if (Math.hypot(t.body.position.x - x, t.body.position.y - y) <= radius + 14) damageTurret(t, dmg, owner);
  }
  if (breaks) {
    for (const w of _walls) {
      if (w.alive && w.breakable && circleHitsRect(x, y, radius, w.rect)) breakWall(w);
    }
  }
}

function tickLobs() {
  for (let i = _lobs.length - 1; i >= 0; i--) {
    const L = _lobs[i];
    if (++L.t < L.T) continue;
    splash(L.owner, L.x1, L.y1, L.radius, L.dmg);
    addParticles(L.x1, L.y1, 10, L.color, L.radius * 0.6, 120);
    if (L.puddle > 0) {
      _puddles.push({ x: L.x1, y: L.y1, r: L.radius * 0.9, t: L.puddle, dmg: L.tick, team: L.team, owner: L.owner, color: L.color });
    }
    _lobs.splice(i, 1);
  }
  for (let i = _puddles.length - 1; i >= 0; i--) {
    const P = _puddles[i];
    P.t--;
    if (P.t % 20 === 0) {
      for (const h of _heroes) {
        if (h.team === P.team || !h.alive) continue;
        if (Math.hypot(h.body.position.x - P.x, h.body.position.y - P.y) <= P.r + HERO_R * 0.5) {
          damageHero(h, P.dmg, P.owner);
        }
      }
    }
    if (P.t <= 0) _puddles.splice(i, 1);
  }
}

// ── Waves (bard) ──────────────────────────────────────────────────────────
// An expanding arc. Hits are resolved by hand: a hero is struck the frame the
// wavefront crosses their centre inside the arc, once per wave.
function tickWaves() {
  for (let i = _waves.length - 1; i >= 0; i--) {
    const w = _waves[i];
    const prev = w.r;
    w.r += w.speed * DT;
    if (w.dmg <= 0) {
      if (w.r >= w.range) _waves.splice(i, 1);
      continue;
    }
    for (const h of _heroes) {
      if (h.team === w.team || !h.alive || w.hit.has(h)) continue;
      const dx = h.body.position.x - w.x, dy = h.body.position.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d < prev - HERO_R || d > w.r + HERO_R) continue;
      let da = Math.atan2(dy, dx) - w.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) <= w.arc + Math.atan2(HERO_R, Math.max(1, d))) {
        w.hit.add(h);
        damageHero(h, w.dmg, w.owner);
      }
    }
    for (const t of _turrets) {
      if (t.team === w.team || t.hp <= 0 || w.hit.has(t)) continue;
      const dx = t.body.position.x - w.x, dy = t.body.position.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d < prev - 14 || d > w.r + 14) continue;
      let da = Math.atan2(dy, dx) - w.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) <= w.arc) { w.hit.add(t); damageTurret(t, w.dmg, w.owner); }
    }
    if (w.r >= w.range) _waves.splice(i, 1);
  }
}

// ── Turrets (engineer) ────────────────────────────────────────────────────
function placeTurret(owner, x, y) {
  const sup = owner.def.super;
  // Only one turret per engineer — placing a new one scraps the old.
  for (const t of _turrets) if (t.owner === owner && t.hp > 0) destroyTurret(t, false);
  const body = new Body(BodyType.STATIC, new Vec2(x, y));
  const s = new Circle(14);
  s.filter = new InteractionFilter(G_TURRET, ~0, S_TEAM[owner.team], ~0);
  s.cbTypes.add(_cbUnit);
  body.shapes.add(s);
  try {
    body.userData._hidden3d = true;
    body.userData._colorIdx = owner.team === 0 ? 0 : 3;
  } catch (_) {}
  body.space = _space;
  const t = {
    body, team: owner.team, owner, hp: sup.hp, maxHp: sup.hp, life: sup.life,
    cd: 30, aim: owner.team === 0 ? -Math.PI / 2 : Math.PI / 2, fired: false, hitFlash: false,
    range: sup.range, dmg: sup.dmg, fireCd: sup.cd,
  };
  _turrets.push(t);
  _unitByBody.set(body, t);
  addParticles(x, y, 12, TEAM_COLORS[owner.team], 14, 120);
  return t;
}

function damageTurret(t, dmg, from) {
  if (t.hp <= 0) return;
  t.hp -= dmg;
  t.hitFlash = true;
  if (from) addSuper(from, Math.min(dmg, t.hp + dmg) * 0.5);
  if (t.hp <= 0) destroyTurret(t, true);
}

function destroyTurret(t, burst) {
  t.hp = 0;
  if (t.body?.space) t.body.space = null;
  _unitByBody.delete(t.body);
  if (burst) addParticles(t.body.position.x, t.body.position.y, 14, TEAM_COLORS[t.team], 12, 160);
}

function tickTurrets() {
  for (let i = _turrets.length - 1; i >= 0; i--) {
    const t = _turrets[i];
    t.fired = false;
    if (t.hp <= 0 || --t.life <= 0) {
      if (t.hp > 0) destroyTurret(t, true);
      _turrets.splice(i, 1);
      continue;
    }
    if (_phase !== "play") continue;
    if (t.cd > 0) t.cd--;
    // Nearest visible enemy with a clear line.
    let best = null, bestD = t.range;
    const tx = t.body.position.x, ty = t.body.position.y;
    for (const h of _heroes) {
      if (h.team === t.team || !h.alive || h.shieldT > 0 || !visibleTo(h, t.team)) continue;
      const d = Math.hypot(h.body.position.x - tx, h.body.position.y - ty);
      if (d < bestD && hasLineOfSight(tx, ty, h.body.position.x, h.body.position.y)) { best = h; bestD = d; }
    }
    if (best) {
      const want = Math.atan2(best.body.position.y - ty, best.body.position.x - tx);
      let da = want - t.aim;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      t.aim += da * 0.25;
      if (t.cd <= 0 && Math.abs(da) < 0.2) {
        fireBullet(t.owner, tx + Math.cos(t.aim) * 16, ty + Math.sin(t.aim) * 16, t.aim, {
          speed: 700, range: t.range + 30, dmg: t.dmg, r: 3, color: TEAM_COLORS[t.team], kind: "turret",
        });
        t.cd = t.fireCd;
        t.fired = true;
      }
    }
  }
}

// ── Attacks ───────────────────────────────────────────────────────────────
// `ax, ay` is the aim point in world space. Returns true if the attack fired.
function tryAttack(h, ax, ay) {
  if (!h.alive || h.ammo < 1 || h.fireCd > 0 || h.stream || h.leap || _phase !== "play") return false;
  const x = h.body.position.x, y = h.body.position.y;
  let dx = ax - x, dy = ay - y;
  const d = Math.hypot(dx, dy);
  if (d < 1) { dx = h.faceX; dy = h.faceY; } else { dx /= d; dy /= d; }
  const angle = Math.atan2(dy, dx);
  const atk = h.def.attack;
  h.ammo -= 1;
  // A minimum gap between attacks so hold-to-fire doesn't dump all three
  // ammo in three frames.
  h.fireCd = atk.kind === "melee" ? 20 : 12;
  h.lastAttack = _frame;
  h.attackFlash = true;
  h.faceX = dx; h.faceY = dy;
  h.aimHold = 30;

  switch (atk.kind) {
    case "spread": {
      const ox = x + dx * (HERO_R + 4), oy = y + dy * (HERO_R + 4);
      for (let i = 0; i < atk.pellets; i++) {
        const a = angle + (i / (atk.pellets - 1) - 0.5) * atk.spread + rand(-0.03, 0.03);
        fireBullet(h, ox, oy, a, { speed: atk.speed * rand(0.92, 1.05), range: atk.range, dmg: atk.dmg, r: 4 });
      }
      if (h.isHuman && _runnerRef) _runnerRef.shakeCamera(3, 0.1);
      break;
    }
    case "burst":
      h.stream = { kind: "burst", left: atk.count, gap: atk.gap, t: 0, angle, spread: atk.spread, o: atk };
      break;
    case "melee": {
      let hitAny = false;
      for (const q of _heroes) {
        if (q.team === h.team || !q.alive) continue;
        const qx = q.body.position.x - x, qy = q.body.position.y - y;
        const qd = Math.hypot(qx, qy);
        if (qd > atk.range + HERO_R * 2) continue;
        let da = Math.atan2(qy, qx) - angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > atk.arc) continue;
        const k = qd > 1 ? atk.knock / qd : 0;
        damageHero(q, atk.dmg, h, x + dx * HERO_R * 1.6, y + dy * HERO_R * 1.6, qx * k, qy * k);
        hitAny = true;
      }
      for (const t of _turrets) {
        if (t.team === h.team || t.hp <= 0) continue;
        if (Math.hypot(t.body.position.x - x, t.body.position.y - y) <= atk.range + HERO_R + 14) {
          damageTurret(t, atk.dmg, h);
          hitAny = true;
        }
      }
      for (const w of _walls) {
        if (!w.alive || !w.breakable) continue;
        if (circleHitsRect(x + dx * HERO_R * 1.5, y + dy * HERO_R * 1.5, atk.range * 0.6, w.rect)) {
          // Punching a crate cracks it: three hits break it.
          w.cracks = (w.cracks || 0) + 1;
          addParticles(x + dx * HERO_R * 1.8, y + dy * HERO_R * 1.8, 4, "#d2a25a", 6, 90);
          if (w.cracks >= 3) breakWall(w);
          hitAny = true;
        }
      }
      addParticles(x + dx * (HERO_R + 14), y + dy * (HERO_R + 14), hitAny ? 8 : 3, "#ffffff", 6, 120);
      break;
    }
    case "wave":
      _waves.push({
        x, y, angle, arc: atk.arc, r: HERO_R, speed: atk.speed, range: atk.range,
        dmg: atk.dmg, team: h.team, owner: h, hit: new Set(), color: hexCss(h.def.color),
      });
      break;
    case "lob": {
      const reach = Math.min(d, atk.range);
      throwLob(h, x + dx * reach, y + dy * reach, atk);
      break;
    }
    case "bolt":
      fireBullet(h, x + dx * (HERO_R + 4), y + dy * (HERO_R + 4), angle, {
        speed: atk.speed, range: atk.range, dmg: atk.dmg, r: 5, kind: "bolt",
        chain: { r: atk.chainR, dmg: atk.chainDmg },
      });
      break;
  }
  return true;
}

function trySuper(h, ax, ay) {
  if (!h.alive || h.super < 1 || h.stream || h.leap || _phase !== "play") return false;
  const x = h.body.position.x, y = h.body.position.y;
  let dx = ax - x, dy = ay - y;
  const d = Math.hypot(dx, dy);
  if (d < 1) { dx = h.faceX; dy = h.faceY; } else { dx /= d; dy /= d; }
  const angle = Math.atan2(dy, dx);
  const sup = h.def.super;

  switch (sup.kind) {
    case "blast": {
      const ox = x + dx * (HERO_R + 4), oy = y + dy * (HERO_R + 4);
      for (let i = 0; i < sup.pellets; i++) {
        const a = angle + (i / (sup.pellets - 1) - 0.5) * sup.spread;
        fireBullet(h, ox, oy, a, {
          speed: sup.speed, range: sup.range, dmg: sup.dmg, r: 5, breaks: true, knock: sup.knock, color: "#ffffff",
        });
      }
      if (_runnerRef) _runnerRef.shakeCamera(8, 0.25);
      break;
    }
    case "volley":
      h.stream = { kind: "volley", left: sup.count, gap: sup.gap, t: 0, angle, spread: 0.012, o: sup };
      break;
    case "leap": {
      const reach = Math.min(d, sup.range);
      let tx = x + dx * reach, ty = y + dy * reach;
      // Never land inside a wall: back off along the leap line until clear.
      for (let k = 0; k < 10 && pointInAnyWall(tx, ty, HERO_R + 2); k++) {
        tx -= dx * 14; ty -= dy * 14;
      }
      h.leap = { x0: x, y0: y, x1: tx, y1: ty, t: 0, T: sup.air };
      // Airborne: over walls and heroes, but never out of the arena.
      h.body.shapes.at(0).filter.collisionMask = G_BORDER;
      break;
    }
    case "healwave": {
      for (const q of _heroes) {
        if (q.team !== h.team || !q.alive) continue;
        if (Math.hypot(q.body.position.x - x, q.body.position.y - y) <= sup.radius) healHero(q, sup.heal, h);
      }
      _waves.push({
        x, y, angle: 0, arc: Math.PI, r: HERO_R, speed: 640, range: sup.radius,
        dmg: 0, team: h.team, owner: h, hit: new Set(), color: "#8ce99a", heal: true,
      });
      break;
    }
    case "barrage": {
      const reach = Math.min(d, sup.range);
      h.stream = {
        kind: "barrage", left: sup.count, gap: sup.gap, t: 0,
        tx: x + dx * reach, ty: y + dy * reach, o: sup,
      };
      break;
    }
    case "turret": {
      const reach = Math.min(d, sup.place);
      let tx = x + dx * reach, ty = y + dy * reach;
      for (let k = 0; k < 10 && pointInAnyWall(tx, ty, 18); k++) { tx -= dx * 14; ty -= dy * 14; }
      if (pointInAnyWall(tx, ty, 18)) { tx = x; ty = y; }
      placeTurret(h, tx, ty);
      break;
    }
  }
  h.super = 0;
  h.lastAttack = _frame;
  h.attackFlash = true;
  h.faceX = dx; h.faceY = dy;
  h.aimHold = 30;
  addFloater(x, y - HERO_R - 22, "SUPER!", "#ffd166");
  return true;
}

// Streams: bursts, volleys and barrages fire one shot every `gap` frames.
function tickStream(h) {
  const s = h.stream;
  if (!s) return;
  if (!h.alive) { h.stream = null; return; }
  if (s.t-- > 0) return;
  s.t = s.gap;
  s.left--;
  const x = h.body.position.x, y = h.body.position.y;
  if (s.kind === "burst" || s.kind === "volley") {
    const a = s.angle + rand(-s.spread, s.spread);
    fireBullet(h, x + Math.cos(a) * (HERO_R + 4), y + Math.sin(a) * (HERO_R + 4), a, {
      speed: s.o.speed, range: s.o.range, dmg: s.o.dmg, r: s.kind === "volley" ? 5 : 3,
      breaks: s.kind === "volley", pierce: s.kind === "volley",
      color: s.kind === "volley" ? "#ffffff" : undefined,
    });
    h.attackFlash = true;
    h.faceX = Math.cos(s.angle); h.faceY = Math.sin(s.angle);
  } else if (s.kind === "barrage") {
    const a = rand(0, Math.PI * 2), rr = rand(0, s.o.scatter);
    throwLob(h, s.tx + Math.cos(a) * rr, s.ty + Math.sin(a) * rr, {
      dmg: s.o.dmg, radius: s.o.radius, flight: 40, range: s.o.range,
      puddle: 90, tick: 100,
    });
    h.attackFlash = true;
  }
  if (s.left <= 0) h.stream = null;
}

function tickLeap(h) {
  const L = h.leap;
  if (!L) return;
  L.t++;
  const k = Math.min(1, L.t / L.T);
  // Drive the body along the arc by velocity so the engine still owns it.
  const nx = L.x0 + (L.x1 - L.x0) * k, ny = L.y0 + (L.y1 - L.y0) * k;
  const p = h.body.position;
  h.body.velocity = new Vec2((nx - p.x) * 60, (ny - p.y) * 60);
  h.leapZ = 4 * 70 * k * (1 - k);
  if (k >= 1) {
    h.leap = null;
    h.leapZ = 0;
    h.body.velocity = new Vec2(0, 0);
    if (h.alive) h.body.shapes.at(0).filter.collisionMask = ~0;
    const sup = h.def.super;
    splash(h, p.x, p.y, sup.radius, sup.dmg, sup.knock, true);
    addParticles(p.x, p.y, 20, "#ffffff", sup.radius * 0.7, 200);
    if (_runnerRef) _runnerRef.shakeCamera(10, 0.3);
    h.attackFlash = true;
  }
}

// ── Shards, the mine and scoring ──────────────────────────────────────────
function shardsOnMine() {
  let n = 0;
  for (const s of _shards) if (Math.hypot(s.x - MINE.x, s.y - MINE.y) < MINE.r + 20) n++;
  return n;
}

function spawnMineShard() {
  const a = rand(0, Math.PI * 2), r = rand(6, MINE.r - 12);
  _shards.push({
    x: MINE.x + Math.cos(a) * r, y: MINE.y + Math.sin(a) * r,
    vx: 0, vy: 0, z: 0, vz: 160, t: 0, pickAt: _frame + 12, bob: rand(0, Math.PI * 2),
  });
  addParticles(MINE.x, MINE.y, 8, SHARD_COLOR, 18, 90);
}

function recountShards() {
  _teamShards = [0, 0];
  for (const h of _heroes) _teamShards[h.team] += h.shards;
}

function tickShards() {
  // Mine production.
  if (_phase === "play" && _frame >= _nextShardAt) {
    if (shardsOnMine() < SHARD_MINE_CAP) spawnMineShard();
    _nextShardAt = _frame + SHARD_SPAWN_FRAMES;
  }
  // Loose shards: a small hop when dropped, then a bob while they wait.
  for (const s of _shards) {
    s.t++;
    if (s.vz !== 0 || s.z > 0) {
      s.z += s.vz * DT;
      s.vz -= 900 * DT;
      s.x += s.vx * DT;
      s.y += s.vy * DT;
      s.vx *= 0.94; s.vy *= 0.94;
      if (s.z <= 0) { s.z = 0; s.vz = 0; s.vx = 0; s.vy = 0; }
      // Keep dropped shards out of walls and inside the arena, by more than a
      // hero radius: a shard tucked against a wall is one the collector can
      // only stand next to, and it stands there until someone kills it.
      s.x = clamp(s.x, SHARD_CLEAR, WORLD_W - SHARD_CLEAR);
      s.y = clamp(s.y, SHARD_CLEAR, WORLD_H - SHARD_CLEAR);
      for (const t of _turrets) {
        if (t.hp <= 0) continue;
        const dx = s.x - t.body.position.x, dy = s.y - t.body.position.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 30) { s.x = t.body.position.x + dx / d * 32; s.y = t.body.position.y + dy / d * 32; }
      }
      if (pointInAnyWall(s.x, s.y, SHARD_CLEAR - 4)) {
        for (const w of _walls) {
          if (!w.alive || !circleHitsRect(s.x, s.y, SHARD_CLEAR - 4, w.rect)) continue;
          const r = w.rect;
          const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
          const ex = (s.x - cx) / (r[2] / 2 + SHARD_CLEAR), ey = (s.y - cy) / (r[3] / 2 + SHARD_CLEAR);
          if (Math.abs(ex) > Math.abs(ey)) s.x = cx + Math.sign(ex || 1) * (r[2] / 2 + SHARD_CLEAR);
          else s.y = cy + Math.sign(ey || 1) * (r[3] / 2 + SHARD_CLEAR);
        }
      }
    }
  }
  // Pickups.
  if (_phase === "play") {
    for (let i = _shards.length - 1; i >= 0; i--) {
      const s = _shards[i];
      if (_frame < s.pickAt || s.z > 6) continue;
      for (const h of _heroes) {
        if (!h.alive || h.leap) continue;
        if (Math.hypot(h.body.position.x - s.x, h.body.position.y - s.y) <= HERO_R + 9) {
          h.shards++;
          _shards.splice(i, 1);
          addParticles(s.x, s.y, 6, SHARD_COLOR, 8, 110);
          if (h.isHuman) addFloater(s.x, s.y - 14, "+1", SHARD_COLOR);
          break;
        }
      }
    }
    recountShards();
  }
}

function tickScoring() {
  const b = _teamShards[0], r = _teamShards[1];
  let leader = -1;
  if (b >= SHARDS_TO_WIN && b > r) leader = 0;
  else if (r >= SHARDS_TO_WIN && r > b) leader = 1;
  if (leader < 0) {
    _countdown = -1;
    _countTeam = -1;
  } else {
    if (_countTeam !== leader) { _countTeam = leader; _countdown = COUNTDOWN_FRAMES; }
    if (--_countdown <= 0) endMatch(leader);
  }
  if (_phase === "play" && _clock >= MATCH_FRAMES) {
    endMatch(b === r ? -1 : b > r ? 0 : 1);
  }
}

function endMatch(winner) {
  _winner = winner;
  _phase = "over";
  _phaseT = 0;
  _restartLockUntil = _frame + OVER_LOCK;
  _countdown = -1;
}

// ── Effects ───────────────────────────────────────────────────────────────
function addParticles(x, y, n, color, spread, speed) {
  for (let i = 0; i < n && _particles.length < 500; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(speed * 0.3, speed);
    _particles.push({
      x: x + rand(-spread, spread), y: y + rand(-spread, spread),
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      t: 0, life: irand(14, 30), color, r: rand(1.5, 3.5),
    });
  }
}

function addFloater(x, y, text, color) {
  if (_floaters.length > 60) _floaters.shift();
  _floaters.push({ x, y, t: 0, text, color });
}

function tickEffects() {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.t++;
    p.x += p.vx * DT; p.y += p.vy * DT;
    p.vx *= 0.9; p.vy *= 0.9;
    if (p.t >= p.life) _particles.splice(i, 1);
  }
  for (let i = _floaters.length - 1; i >= 0; i--) {
    const f = _floaters[i];
    f.t++;
    f.y -= 0.6;
    if (f.t > 50) _floaters.splice(i, 1);
  }
}

// ── Movement ──────────────────────────────────────────────────────────────
function applyControl(h, dirX, dirY) {
  const v = h.body.velocity;
  if (h.stunT > 0) {
    // Knocked back: no steering, momentum bleeds off slowly so the shove reads.
    h.stunT--;
    h.body.velocity = new Vec2(v.x * STUN_DRAG, v.y * STUN_DRAG);
    return;
  }
  const eff = h.def.speed * (h.shards >= 6 ? 0.94 : 1);
  const tvx = dirX * eff, tvy = dirY * eff;
  h.body.velocity = new Vec2(
    (v.x + (tvx - v.x) * CONTROL_BLEND) * (dirX || dirY ? 1 : DRAG),
    (v.y + (tvy - v.y) * CONTROL_BLEND) * (dirX || dirY ? 1 : DRAG),
  );
  const mag = Math.hypot(dirX, dirY);
  if (mag > 0.05 && h.aimHold <= 0) { h.faceX = dirX / mag; h.faceY = dirY / mag; }
}

// Per-hero upkeep that runs whoever is in control: reload, regen, shield,
// bush membership, death timer.
function tickHeroCommon(h) {
  // The figure turns toward the intended facing rather than snapping — an
  // attack aimed behind you is a spin, not a teleport of the head.
  {
    const want = Math.atan2(h.faceY, h.faceX);
    let da = want - h.dispAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    h.dispAngle += da * 0.35;
  }
  if (h.aimHold > 0) h.aimHold--;
  if (h.fireCd > 0) h.fireCd--;
  if (!h.alive) {
    h.deadAnim = Math.min(1, h.deadAnim + 1 / 28);
    if (_phase === "play" && --h.respawnT <= 0) respawnHero(h);
    h.body.velocity = new Vec2(0, 0);
    return;
  }
  if (h.shieldT > 0) h.shieldT--;
  if (h.ammo < 3) {
    h.reloadT++;
    if (h.reloadT >= h.def.reload) { h.ammo++; h.reloadT = 0; }
  }
  if (h.hp < h.maxHp && _frame - h.lastDamaged > REGEN_DELAY) {
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * REGEN_PER_SEC * DT);
  }
  h.bush = bushAt(h.body.position.x, h.body.position.y);
}

// ── AI ────────────────────────────────────────────────────────────────────
// One brain for every kit. Decisions are re-made every few frames and held in
// between, which is both cheaper and calmer — a target that is re-rolled every
// frame makes a puck flicker.

// The "collector" is the AI on each team nearest the mine; the others fight.
// Hysteresis stops two of them swapping the job every frame.
const _collector = [null, null];
function assignRoles() {
  for (const team of [0, 1]) {
    const cands = _heroes.filter(h => h.team === team && h.alive && (!h.isHuman || _autopilot));
    if (!cands.length) { _collector[team] = null; continue; }
    const dist = (h) => Math.hypot(h.body.position.x - MINE.x, h.body.position.y - MINE.y);
    let best = _collector[team];
    if (!best || !best.alive || best.team !== team) best = cands[0];
    for (const c of cands) if (dist(c) < dist(best) - 60) best = c;
    _collector[team] = best;
    for (const c of cands) c.ai.role = c === best ? "collect" : "fight";
  }
}

function nearestBushCenter(x, y, awayFromX, awayFromY, ownHalfTeam) {
  let best = null, bestD = Infinity;
  for (const r of BUSH_DEFS) {
    const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
    if (ownHalfTeam === 0 && cy < CY - 60) continue;
    if (ownHalfTeam === 1 && cy > CY + 60) continue;
    const d = Math.hypot(cx - x, cy - y);
    if (awayFromX != null && Math.hypot(cx - awayFromX, cy - awayFromY) < Math.hypot(x - awayFromX, y - awayFromY)) continue;
    if (d < bestD) { best = { x: cx, y: cy }; bestD = d; }
  }
  return best;
}

function predictedPos(target, fromX, fromY, speed) {
  const p = target.body.position;
  if (!speed || !target.body.velocity) return { x: p.x, y: p.y };
  const d = Math.hypot(p.x - fromX, p.y - fromY);
  const t = d / speed;
  const v = target.body.velocity;
  return { x: p.x + v.x * t * 0.9, y: p.y + v.y * t * 0.9 };
}

function attackReach(def) {
  const a = def.attack;
  return a.kind === "melee" ? a.range + HERO_R * 2 : a.range;
}

function preferredRange(def) {
  const a = def.attack;
  switch (a.kind) {
    case "melee": return 20;
    case "spread": return a.range * 0.5;
    case "lob": return a.range * 0.72;
    case "wave": return a.range * 0.62;
    default: return a.range * 0.72;
  }
}

function decide(h) {
  const B = h.ai;
  const x = h.body.position.x, y = h.body.position.y;
  const def = h.def;
  const hpFrac = h.hp / h.maxHp;
  const teamSign = h.team === 0 ? 1 : -1;      // blue lives at large y

  // Perception: the enemies I can actually see.
  let tgt = null, tgtD = Infinity;
  for (const q of _heroes) {
    if (q.team === h.team || !q.alive || q.shieldT > 0 || !visibleTo(q, h.team)) continue;
    const d = Math.hypot(q.body.position.x - x, q.body.position.y - y);
    // Prefer carriers and wounded targets a little.
    const score = d - q.shards * 12 - (1 - q.hp / q.maxHp) * 60;
    if (score < tgtD) { tgt = q; tgtD = score; }
  }
  if (tgt) tgtD = Math.hypot(tgt.body.position.x - x, tgt.body.position.y - y);
  // Enemy turrets are targets too when nothing else is around.
  let turretTgt = null, turretD = Infinity;
  for (const t of _turrets) {
    if (t.team === h.team || t.hp <= 0) continue;
    const d = Math.hypot(t.body.position.x - x, t.body.position.y - y);
    if (d < turretD) { turretTgt = t; turretD = d; }
  }
  const nearestThreat = tgt && (!turretTgt || tgtD < turretD) ? tgt : turretTgt;
  const threatD = Math.min(tgtD, turretD);

  const enemyCountdown = _countTeam === otherTeam(h.team);
  const ourCountdown = _countTeam === h.team;

  // Free shards I could go for (pickable, not lying in an enemy's lap).
  let shard = null, shardD = Infinity;
  for (const s of _shards) {
    if (_frame < s.pickAt - 30) continue;
    // A shard inside the enemy spawn zone is off-limits (the steer target is
    // clamped out of that zone, so chasing it means standing at the line).
    if (h.team === 0 ? s.y < 150 : s.y > WORLD_H - 150) continue;
    let d = Math.hypot(s.x - x, s.y - y);
    if (tgt && Math.hypot(s.x - tgt.body.position.x, s.y - tgt.body.position.y) < 90 && hpFrac < 0.6) d += 250;
    if (d < shardD) { shard = s; shardD = d; }
  }

  let tx = x, ty = y;
  let mode = "roam";
  B.target = tgt || turretTgt;

  const pref = preferredRange(def);
  const engagePoint = (T) => {
    const p = T.body.position;
    let dx = x - p.x, dy = y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    return { x: p.x + dx * pref, y: p.y + dy * pref };
  };

  // Outnumbered: two or more enemies close and no friend nearby.
  let closeEnemies = 0, closeFriends = 0;
  for (const q of _heroes) {
    if (!q.alive || q === h) continue;
    const d = Math.hypot(q.body.position.x - x, q.body.position.y - y);
    if (q.team !== h.team && d < 260 && visibleTo(q, h.team)) closeEnemies++;
    if (q.team === h.team && d < 170) closeFriends++;
  }
  const outnumbered = closeEnemies >= 2 && closeFriends === 0 && hpFrac < 0.75;

  if ((hpFrac < 0.42 || outnumbered) && nearestThreat && threatD < 320) {
    // Bleeding: break off, ideally into a bush the enemy is not standing near.
    mode = "retreat";
    const tp = nearestThreat.body.position;
    const bush = nearestBushCenter(x, y, tp.x, tp.y, h.team);
    if (bush && Math.hypot(bush.x - x, bush.y - y) < 320) { tx = bush.x; ty = bush.y; }
    else {
      let dx = x - tp.x, dy = y - tp.y;
      const d = Math.hypot(dx, dy) || 1;
      tx = x + (dx / d) * 200 + (BASE_CENTER[h.team].x - x) * 0.2;
      ty = y + (dy / d) * 200 + (BASE_CENTER[h.team].y - y) * 0.3;
    }
  } else if (ourCountdown && h.shards > 0) {
    // We are counting down and I hold shards: stay alive. Sit in a bush on
    // our side, away from whoever is closest.
    mode = "hold";
    const tp = nearestThreat ? nearestThreat.body.position : null;
    const bush = nearestBushCenter(x, y, tp?.x, tp?.y, h.team);
    if (bush) { tx = bush.x; ty = bush.y; }
    else { tx = BASE_CENTER[h.team].x + B.side * 120; ty = BASE_CENTER[h.team].y - teamSign * 130; }
    if (tp && Math.hypot(tp.x - tx, tp.y - ty) < 140) {
      tx = x + (x - tp.x); ty = y + (y - tp.y) + teamSign * 80;
    }
  } else if (ourCountdown) {
    // Guard: stand between the carriers and the nearest enemy.
    mode = "guard";
    let cx = 0, cy = 0, n = 0;
    for (const q of _heroes) if (q.team === h.team && q.alive && q.shards > 0) { cx += q.body.position.x; cy += q.body.position.y; n++; }
    if (n) { cx /= n; cy /= n; } else { cx = BASE_CENTER[h.team].x; cy = BASE_CENTER[h.team].y; }
    if (nearestThreat) {
      const tp = nearestThreat.body.position;
      tx = cx + (tp.x - cx) * 0.55; ty = cy + (tp.y - cy) * 0.55;
      if (tgt && tgtD < attackReach(def) + 40) { const e = engagePoint(tgt); tx = e.x; ty = e.y; mode = "engage"; }
    } else { tx = cx; ty = cy - teamSign * 150; }
  } else if (enemyCountdown) {
    // They are counting down: hunt the carriers, visible or not.
    mode = "hunt";
    let carrier = null, best = -1;
    for (const q of _heroes) if (q.team !== h.team && q.alive && q.shards > best) { carrier = q; best = q.shards; }
    if (tgt && tgtD < attackReach(def) + 60) { const e = engagePoint(tgt); tx = e.x; ty = e.y; mode = "engage"; }
    else if (carrier) { tx = carrier.body.position.x; ty = carrier.body.position.y; B.target = tgt || carrier; }
  } else if (B.role === "collect" && shard && (!tgt || tgtD > 170 || hpFrac > 0.6 || shardD < 60)) {
    mode = "collect";
    tx = shard.x; ty = shard.y;
    if (tgt && tgtD < attackReach(def) && shardD > 80) mode = "collect-fight";
  } else if (tgt && (tgtD < attackReach(def) + 140 || B.aggro > 0.6)) {
    mode = "engage";
    const e = engagePoint(tgt);
    tx = e.x; ty = e.y;
    // Melee closes on where the target WILL be.
    if (def.attack.kind === "melee") { const p = predictedPos(tgt, x, y, def.speed); tx = p.x; ty = p.y; }
  } else if (turretTgt && turretD < attackReach(def) + 80 && def.attack.kind !== "melee") {
    mode = "engage";
    const e = engagePoint(turretTgt);
    tx = e.x; ty = e.y;
  } else if (shard && shardD < 150 && (!tgt || tgtD > 120)) {
    mode = "collect";
    tx = shard.x; ty = shard.y;
  } else {
    // Roam: take up a lane post on our side of the mine and wait for a look.
    mode = "roam";
    const post = B.role === "collect"
      ? { x: MINE.x + B.side * 60, y: MINE.y + teamSign * 90 }
      : { x: MINE.x + B.side * 200, y: MINE.y + teamSign * 120 };
    tx = post.x + Math.sin(B.strafePhase) * 40;
    ty = post.y + Math.cos(B.strafePhase * 0.7) * 30;
  }

  // Never dive into the enemy spawn — respawn shields make it a losing fight.
  if (h.team === 0) ty = Math.max(ty, 150); else ty = Math.min(ty, WORLD_H - 150);
  tx = clamp(tx, HERO_R + 4, WORLD_W - HERO_R - 4);
  ty = clamp(ty, HERO_R + 4, WORLD_H - HERO_R - 4);
  // A steer target inside a wall is a puck pressed against that wall forever;
  // back it off along the line toward us until it is in the open.
  for (let k = 0; k < 12 && pointInAnyWall(tx, ty, HERO_R + 2); k++) {
    tx += (x - tx) * 0.2; ty += (y - ty) * 0.2;
  }

  B.mode = mode;
  B.tx = tx; B.ty = ty;
  B.hasTarget = true;

  // ── Super timing ──
  if (h.super >= 1 && Math.random() < 0.3 + B.aggro * 0.5) {
    const sup = def.super;
    switch (sup.kind) {
      case "blast":
      case "volley":
        if (tgt && tgtD < sup.range * 0.85) {
          const p = predictedPos(tgt, x, y, sup.speed);
          trySuper(h, p.x, p.y);
        }
        break;
      case "leap":
        if (tgt && tgtD > 60 && tgtD < sup.range && hpFrac > 0.35) {
          const p = predictedPos(tgt, x, y, 400);
          trySuper(h, p.x, p.y);
        } else if (hpFrac < 0.3 && nearestThreat && threatD < 160) {
          // Escape leap toward home.
          const bx = BASE_CENTER[h.team].x, by = BASE_CENTER[h.team].y;
          const d = Math.hypot(bx - x, by - y) || 1;
          trySuper(h, x + (bx - x) / d * sup.range, y + (by - y) / d * sup.range);
        }
        break;
      case "healwave": {
        let need = 0;
        for (const q of _heroes) {
          if (q.team !== h.team || !q.alive) continue;
          if (Math.hypot(q.body.position.x - x, q.body.position.y - y) <= sup.radius) need += q.maxHp - q.hp;
        }
        if (need > sup.heal * 0.7 || (hpFrac < 0.45 && nearestThreat && threatD < 250)) trySuper(h, x, y);
        break;
      }
      case "barrage":
        if (tgt && tgtD < sup.range) {
          const p = predictedPos(tgt, x, y, 300);
          trySuper(h, p.x, p.y);
        }
        break;
      case "turret": {
        const own = _turrets.some(t => t.owner === h && t.hp > 0);
        const nearMine = Math.hypot(x - MINE.x, y - MINE.y) < 280;
        if (!own && (nearMine || tgt || mode === "guard")) {
          const ax = tgt ? tgt.body.position.x : MINE.x, ay = tgt ? tgt.body.position.y : MINE.y;
          const d = Math.hypot(ax - x, ay - y) || 1;
          trySuper(h, x + (ax - x) / d * 80, y + (ay - y) / d * 80);
        }
        break;
      }
    }
  }
}

// Steering with wall avoidance: probe ahead with three rays (centre and both
// shoulders); when blocked, swing the heading in growing steps on the AI's
// preferred side and commit to it for a few frames so it doesn't dither.
// Clearance along a heading: the shortest of three probes (centre and both
// shoulders). Shoulders sit inside the puck's radius so a corridor barely
// wider than the puck still reads as passable.
function clearance(x, y, dx, dy, len) {
  const px = -dy * HERO_R * 0.6, py = dx * HERO_R * 0.6;
  return Math.min(
    wallDistance(x, y, dx, dy, len),
    wallDistance(x + px, y + py, dx, dy, len),
    wallDistance(x - px, y - py, dx, dy, len),
  );
}

function avoidSteer(h, dx, dy) {
  const B = h.ai;
  const x = h.body.position.x, y = h.body.position.y;
  const probe = HERO_R + 36;
  if (B.avoidHold > 0 && B.avoidDir) {
    B.avoidHold--;
    if (clearance(x, y, B.avoidDir.x, B.avoidDir.y, probe) > probe) return B.avoidDir;
  }
  if (clearance(x, y, dx, dy, probe) > probe) { B.avoidHold = 0; return { x: dx, y: dy }; }
  // Blocked: swing the heading in growing steps on the preferred side first.
  // If nothing is fully clear, take whichever heading has the most room —
  // walking into the obstacle is the one answer that never resolves.
  const base = Math.atan2(dy, dx);
  let best = null, bestC = -1;
  for (const step of [0.55, 1.05, 1.6, 2.2, 2.8]) {
    for (const sgn of [B.side, -B.side]) {
      const a = base + step * sgn;
      const ax = Math.cos(a), ay = Math.sin(a);
      const c = clearance(x, y, ax, ay, probe);
      if (c > probe) {
        B.avoidDir = { x: ax, y: ay };
        B.avoidHold = 10;
        return B.avoidDir;
      }
      if (c > bestC) { bestC = c; best = { x: ax, y: ay }; }
    }
  }
  // Commit to the detour for longer than a clear swing: re-evaluating every
  // few frames in a pocket between a pillar and a turret picks "up" and
  // "down" alternately and the puck wiggles in place.
  B.avoidDir = best;
  B.avoidHold = 20;
  return best;
}

function tickAI(h) {
  const B = h.ai;
  if (!h.alive || h.leap) return;
  const x = h.body.position.x, y = h.body.position.y;
  if (--B.t <= 0) { decide(h); B.t = 6 + irand(0, 4); }
  B.strafePhase += B.strafeFreq;

  // ── Movement ──
  let dirX = 0, dirY = 0;
  if (B.hasTarget) {
    let dx = B.tx - x, dy = B.ty - y;
    const dd = Math.hypot(dx, dy);
    if (dd > 6) {
      dx /= dd; dy /= dd;
      // Arrival ease so the puck doesn't orbit its own target.
      const ease = Math.min(1, dd / 30);
      // Strafe while trading shots — a still target is a dead one.
      if (B.mode === "engage" && B.target?.body && B.faceLock) {
        const s = Math.sin(B.strafePhase) * 0.7;
        const nx = dx - dy * s, ny = dy + dx * s;
        const nm = Math.hypot(nx, ny) || 1;
        dx = nx / nm; dy = ny / nm;
      }
      const st = avoidSteer(h, dx, dy);
      dirX = st.x * ease; dirY = st.y * ease;
    } else if (B.mode === "engage" && B.target?.body) {
      // In position: sidestep.
      const s = Math.sin(B.strafePhase);
      const p = B.target.body.position;
      let px = -(p.y - y), py = p.x - x;
      const pm = Math.hypot(px, py) || 1;
      const st = avoidSteer(h, px / pm * s, py / pm * s);
      dirX = st.x * 0.6; dirY = st.y * 0.6;
    }
  }
  // Light teammate repulsion so the pair never stacks.
  for (const q of _heroes) {
    if (q === h || q.team !== h.team || !q.alive) continue;
    const sx = x - q.body.position.x, sy = y - q.body.position.y;
    const sd = Math.hypot(sx, sy);
    if (sd > 1 && sd < 44) { dirX += (sx / sd) * 0.5; dirY += (sy / sd) * 0.5; }
  }
  const dm = Math.hypot(dirX, dirY);
  if (dm > 1) { dirX /= dm; dirY /= dm; }
  applyControl(h, dirX, dirY);

  // ── Facing + firing ──
  const T = B.target;
  if (!T || !T.body?.space || (T.def ? !T.alive : T.hp <= 0)) { B.faceLock = false; return; }
  if (T.def && (T.shieldT > 0 || !visibleTo(T, h.team))) { B.faceLock = false; return; }
  const tp = T.body.position;
  const d = Math.hypot(tp.x - x, tp.y - y);
  const atk = h.def.attack;
  const reach = attackReach(h.def);
  // Face the target while it is anywhere near reach. The lock has hysteresis:
  // a kiting fight hovers right at the reach boundary, and flipping between
  // "face the target" and "face where I'm walking" every few frames is the
  // single ugliest thing a puck can do.
  if (d < reach * 0.98) B.faceLock = true;
  else if (d > reach * 1.35) B.faceLock = false;
  if (B.faceLock && h.aimHold <= 0) { h.faceX = (tp.x - x) / (d || 1); h.faceY = (tp.y - y) / (d || 1); }
  if (d > reach * 0.98) return;
  // Straight shots need a clear line; lobs, waves and punches do not.
  if ((atk.kind === "spread" || atk.kind === "burst" || atk.kind === "bolt") && !hasLineOfSight(x, y, tp.x, tp.y)) return;
  if (h.ammo < 1 || h.fireCd > 0) return;
  if (B.fireGate > 0) { B.fireGate--; return; }
  const speed = atk.speed || 0;
  const p = T.def ? predictedPos(T, x, y, atk.kind === "lob" ? 300 : speed) : { x: tp.x, y: tp.y };
  // Aim error shrinks with skill, and is applied perpendicular to the shot.
  const err = (1 - B.skill) * 34 * rand(-1, 1);
  const ex = -(p.y - y), ey = p.x - x;
  const em = Math.hypot(ex, ey) || 1;
  if (tryAttack(h, p.x + ex / em * err, p.y + ey / em * err)) {
    B.fireGate = Math.round(irand(4, 16) * (1.4 - B.skill));
  }
}

// ── Human input ───────────────────────────────────────────────────────────
function computeMoveDir() {
  let x = 0, y = 0;
  if (_keys["KeyW"] || _keys["ArrowUp"]) y -= 1;
  if (_keys["KeyS"] || _keys["ArrowDown"]) y += 1;
  if (_keys["KeyA"] || _keys["ArrowLeft"]) x -= 1;
  if (_keys["KeyD"] || _keys["ArrowRight"]) x += 1;
  const len = Math.hypot(x, y);
  if (len > 0) { _moveDir.x = x / len; _moveDir.y = y / len; return; }
  const h = humanHero();
  if (_pointer.active && h?.alive) {
    const dx = _pointer.x - h.body.position.x;
    const dy = _pointer.y - h.body.position.y;
    const d = Math.hypot(dx, dy);
    if (d > STEER_DEADZONE) { _moveDir.x = dx / d; _moveDir.y = dy / d; return; }
  }
  _moveDir.x = 0; _moveDir.y = 0;
}

// Nearest enemy the human can see — the auto-aim target for E and for taps.
function autoTarget(h) {
  let best = null, bestD = attackReach(h.def) + 60;
  const x = h.body.position.x, y = h.body.position.y;
  for (const q of _heroes) {
    if (q.team === h.team || !q.alive || q.shieldT > 0 || !visibleTo(q, h.team)) continue;
    const d = Math.hypot(q.body.position.x - x, q.body.position.y - y);
    if (d < bestD) { best = q; bestD = d; }
  }
  for (const t of _turrets) {
    if (t.team === h.team || t.hp <= 0) continue;
    const d = Math.hypot(t.body.position.x - x, t.body.position.y - y);
    if (d < bestD) { best = t; bestD = d; }
  }
  return best;
}

function humanAttackAuto(h) {
  const T = autoTarget(h);
  if (T) {
    const p = T.def ? predictedPos(T, h.body.position.x, h.body.position.y, h.def.attack.speed || 300) : T.body.position;
    return tryAttack(h, p.x, p.y);
  }
  return tryAttack(h, h.body.position.x + h.faceX * 200, h.body.position.y + h.faceY * 200);
}

function humanSuperAuto(h) {
  const sup = h.def.super;
  if (sup.kind === "healwave") return trySuper(h, h.body.position.x, h.body.position.y);
  const T = autoTarget(h);
  if (T) return trySuper(h, T.body.position.x, T.body.position.y);
  if (sup.kind === "turret") return trySuper(h, h.body.position.x + h.faceX * 60, h.body.position.y + h.faceY * 60);
  return trySuper(h, h.body.position.x + h.faceX * 200, h.body.position.y + h.faceY * 200);
}

function tickHuman(h) {
  if (!h.alive || h.leap) return;
  if (_autopilot) { tickAI(h); return; }
  computeMoveDir();
  applyControl(h, _moveDir.x, _moveDir.y);
  _aim.x = _aimScreen.x + _viewCam.x;
  _aim.y = _aimScreen.y + _viewCam.y;
  if (h.aimHold > 0 || (_mouseDown && !_isTouch)) {
    const dx = _aim.x - h.body.position.x, dy = _aim.y - h.body.position.y;
    const d = Math.hypot(dx, dy);
    if (d > 4) { h.faceX = dx / d; h.faceY = dy / d; }
  }
  if (_mouseDown && !_isTouch) {
    tryAttack(h, _aim.x, _aim.y);
  }
}

// ── Match flow ────────────────────────────────────────────────────────────
function startMatch() {
  buildRoster(HEROES[_selIdx]);
  for (const t of _turrets) destroyTurret(t, false);
  _turrets = [];
  clearProjectiles();
  _shards = [];
  _particles = [];
  _floaters = [];
  _teamShards = [0, 0];
  _countdown = -1;
  _countTeam = -1;
  _winner = -1;
  _clock = 0;
  _deathHold = 0;
  _phase = "ready";
  _phaseT = 0;
  _nextShardAt = 0;
  _camTarget.x = humanHero().body.position.x;
  _camTarget.y = humanHero().body.position.y;
}

function toSelect() {
  // Back to the pick screen: a fresh roster around the current highlight so
  // the 3D preview shows the hero you are looking at.
  for (const t of _turrets) destroyTurret(t, false);
  _turrets = [];
  clearProjectiles();
  _shards = [];
  _particles = [];
  _floaters = [];
  _teamShards = [0, 0];
  _countdown = -1;
  _countTeam = -1;
  _phase = "select";
  _phaseT = 0;
  buildRoster(HEROES[_selIdx]);
  _camTarget.x = BASE_CENTER[0].x;
  _camTarget.y = BASE_CENTER[0].y - 40;
}

function resetAll(space) {
  _space = space;
  _frame = 0;
  _pointer.active = false;
  _mouseDown = false;
  _moveDir.x = 0; _moveDir.y = 0;
  for (const k in _keys) delete _keys[k];
  toSelect();
}

function updateCameraTarget() {
  const h = humanHero();
  if (!h) return;
  if (_phase === "select") {
    _camTarget.x = BASE_CENTER[0].x;
    _camTarget.y = BASE_CENTER[0].y - 40;
    return;
  }
  if (h.alive) {
    _camTarget.x = h.body.position.x;
    _camTarget.y = h.body.position.y;
  } else if (_deathHold > 0) {
    _deathHold--;
    _camTarget.x = h.deathX; _camTarget.y = h.deathY;
  } else {
    const spot = SPAWNS[h.team][h.spotIdx];
    _camTarget.x += (spot.x - _camTarget.x) * 0.08;
    _camTarget.y += (spot.y - _camTarget.y) * 0.08;
  }
}

// ── Rendering: 2D world pass ──────────────────────────────────────────────
function drawArenaMarkings(ctx) {
  // Bushes — the stealth regions. Translucent so a friendly inside still reads.
  for (const r of BUSH_DEFS) {
    ctx.fillStyle = "rgba(63,185,80,0.16)";
    ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.strokeStyle = "rgba(63,185,80,0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(r[0], r[1], r[2], r[3]);
    ctx.setLineDash([]);
  }
  // Base pads.
  for (const team of [0, 1]) {
    const c = BASE_CENTER[team];
    ctx.beginPath();
    ctx.arc(c.x, c.y, 60, 0, Math.PI * 2);
    ctx.fillStyle = TEAM_COLORS[team] + "18";
    ctx.fill();
    ctx.strokeStyle = TEAM_COLORS[team] + "88";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Mine pad — a hexagon with a fill ring showing the next shard's progress.
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const px = MINE.x + Math.cos(a) * (MINE.r + 6), py = MINE.y + Math.sin(a) * (MINE.r + 6);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(192,132,252,0.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(192,132,252,0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawShardGlyph(ctx, x, y, s, alpha = 1) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.7, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s * 0.7, y);
  ctx.closePath();
  ctx.fillStyle = `rgba(192,132,252,${0.85 * alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${0.7 * alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawShards2d(ctx) {
  for (const s of _shards) {
    const bob = Math.sin(s.bob + _frame * 0.08) * 1.5;
    if (s.z > 0) {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 6, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();
    }
    drawShardGlyph(ctx, s.x, s.y - s.z * 0.5 - bob, 8, _frame < s.pickAt ? 0.6 : 1);
  }
}

function drawPuddles2d(ctx) {
  for (const P of _puddles) {
    const k = Math.min(1, P.t / 40);
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,146,43,${0.28 * k})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,146,43,${0.6 * k})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawProjectiles2d(ctx) {
  for (const b of _bullets) {
    if (!b.body) continue;
    const p = b.body.position;
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    // A short tail along the flight line.
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - Math.cos(b.angle) * b.r * 3.5, p.y - Math.sin(b.angle) * b.r * 3.5);
    ctx.strokeStyle = b.color + "88";
    ctx.lineWidth = b.r * 0.8;
    ctx.stroke();
  }
  for (const L of _lobs) {
    const k = L.t / L.T;
    const x = L.x0 + (L.x1 - L.x0) * k, y = L.y0 + (L.y1 - L.y0) * k;
    const hgt = 4 * 60 * k * (1 - k);
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - hgt, 5, 0, Math.PI * 2);
    ctx.fillStyle = L.color;
    ctx.fill();
    // Landing marker.
    ctx.beginPath();
    ctx.arc(L.x1, L.y1, L.radius, 0, Math.PI * 2);
    ctx.strokeStyle = L.color + "55";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const w of _waves) {
    const k = 1 - w.r / w.range;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, w.angle - w.arc, w.angle + w.arc);
    ctx.strokeStyle = w.color + Math.floor(120 + 135 * k).toString(16).padStart(2, "0");
    ctx.lineWidth = w.heal ? 3 : 6;
    ctx.stroke();
  }
  for (const t of _turrets) {
    if (t.hp <= 0) continue;
    const p = t.body.position;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(t.aim) * 24, p.y + Math.sin(t.aim) * 24);
    ctx.strokeStyle = TEAM_COLORS[t.team];
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

// ── Rendering: overlay (all modes) ────────────────────────────────────────
function drawHeroCues(ctx) {
  const human = humanHero();
  for (const h of _heroes) {
    if (!h.alive || !visibleTo(h, 0)) continue;
    const x = h.body.position.x, y = h.body.position.y - (h.leapZ || 0) * 0.5;
    const col = TEAM_COLORS[h.team];

    // Shield ring
    if (h.shieldT > 0) {
      ctx.beginPath();
      ctx.arc(x, y, HERO_R + 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.3 * Math.sin(_frame * 0.3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Super-ready pulse
    if (h.super >= 1) {
      ctx.beginPath();
      ctx.arc(x, y, HERO_R + 3 + Math.sin(_frame * 0.2) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,209,102,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Name + HP bar
    const w = 40, bh = 5;
    const bx = x - w / 2, by = y - HERO_R - 16;
    ctx.fillStyle = "rgba(13,17,23,0.75)";
    ctx.fillRect(bx - 1, by - 1, w + 2, bh + 2);
    ctx.fillStyle = h.team === 0 ? "#3fb950" : "#f85149";
    ctx.fillRect(bx, by, w * (h.hp / h.maxHp), bh);
    // Ammo pips
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < h.ammo ? "#ffd166" : "rgba(255,255,255,0.18)";
      ctx.fillRect(bx + i * (w / 3) + 1, by + bh + 2, w / 3 - 2, 2);
    }
    ctx.fillStyle = h === human ? "#ffffff" : col;
    ctx.font = `${h === human ? "bold " : ""}10px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(h === human ? "YOU" : h.def.name, x, by - 3);
    // Shard badge
    if (h.shards > 0) {
      drawShardGlyph(ctx, x + HERO_R + 9, y - HERO_R, 6);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(String(h.shards), x + HERO_R + 16, y - HERO_R);
    }
  }
  for (const t of _turrets) {
    if (t.hp <= 0) continue;
    const p = t.body.position;
    const w = 30;
    ctx.fillStyle = "rgba(13,17,23,0.75)";
    ctx.fillRect(p.x - w / 2 - 1, p.y - 26, w + 2, 5);
    ctx.fillStyle = TEAM_COLORS[t.team];
    ctx.fillRect(p.x - w / 2, p.y - 25, w * (t.hp / t.maxHp), 3);
  }
}

function drawHumanAim(ctx) {
  const h = humanHero();
  if (!h?.alive || _phase !== "play" || _autopilot) return;
  const x = h.body.position.x, y = h.body.position.y;
  if (_isTouch) return;
  const atk = h.def.attack;
  const dx = _aim.x - x, dy = _aim.y - y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d, ny = dy / d;
  if (atk.kind === "lob") {
    const reach = Math.min(d, atk.range);
    ctx.beginPath();
    ctx.arc(x + nx * reach, y + ny * reach, atk.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (atk.kind === "melee") {
    ctx.beginPath();
    ctx.arc(x, y, atk.range + HERO_R, Math.atan2(ny, nx) - atk.arc, Math.atan2(ny, nx) + atk.arc);
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    const reach = attackReach(h.def);
    ctx.beginPath();
    ctx.moveTo(x + nx * (HERO_R + 4), y + ny * (HERO_R + 4));
    ctx.lineTo(x + nx * reach, y + ny * reach);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (atk.kind === "spread") {
      ctx.beginPath();
      ctx.arc(x, y, reach, Math.atan2(ny, nx) - atk.spread / 2, Math.atan2(ny, nx) + atk.spread / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.stroke();
    }
  }
  // Crosshair
  ctx.beginPath();
  ctx.arc(_aim.x, _aim.y, 6, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawParticles2d(ctx) {
  for (const p of _particles) {
    const k = 1 - p.t / p.life;
    ctx.globalAlpha = k;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters2d(ctx) {
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of _floaters) {
    ctx.globalAlpha = f.t < 35 ? 1 : 1 - (f.t - 35) / 15;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx) {
  if (_phase === "select") return;
  // Shard counter — top centre.
  const w = 190, h = 30;
  const x0 = VIEW_W / 2 - w / 2, y0 = 8;
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(x0, y0, w, h);
  ctx.font = "bold 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = TEAM_COLORS[0];
  ctx.fillText(String(_teamShards[0]), VIEW_W / 2 - 50, y0 + h / 2);
  ctx.fillStyle = TEAM_COLORS[1];
  ctx.fillText(String(_teamShards[1]), VIEW_W / 2 + 50, y0 + h / 2);
  drawShardGlyph(ctx, VIEW_W / 2, y0 + h / 2, 9);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "9px system-ui, sans-serif";
  ctx.fillText(`hold ${SHARDS_TO_WIN}`, VIEW_W / 2, y0 + h + 8);

  // Countdown bar under it.
  if (_countdown > 0 && _phase === "play") {
    const cw = 160, ch = 6;
    const cx0 = VIEW_W / 2 - cw / 2, cy0 = y0 + h + 16;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(cx0, cy0, cw, ch);
    ctx.fillStyle = TEAM_COLORS[_countTeam];
    ctx.fillRect(cx0, cy0, cw * (_countdown / COUNTDOWN_FRAMES), ch);
    ctx.fillStyle = TEAM_COLORS[_countTeam];
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText(
      `${TEAM_NAMES[_countTeam]} ${_countTeam === 0 ? "wins" : "win"} in ${Math.ceil(_countdown / 60)}`,
      VIEW_W / 2, cy0 + 16,
    );
  }

  // Clock — top right.
  const left = Math.max(0, MATCH_FRAMES - _clock);
  const secs = Math.ceil(left / 60);
  const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
  ctx.fillStyle = secs <= 30 ? "#d29922" : "rgba(255,255,255,0.6)";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${mm}:${ss}`, VIEW_W - 14, 22);

  // Your hero — bottom left.
  const me = humanHero();
  if (me) {
    const px = 14, py = VIEW_H - 64;
    ctx.fillStyle = "rgba(13,17,23,0.8)";
    ctx.fillRect(px, py, 210, 54);
    ctx.fillStyle = hexCss(me.def.color);
    ctx.fillRect(px, py, 5, 54);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText(me.def.name, px + 12, py + 6);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(me.def.cls, px + 12 + ctx.measureText(me.def.name).width + 16, py + 8);
    // HP
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(px + 12, py + 24, 150, 8);
    ctx.fillStyle = me.alive ? "#3fb950" : "#f85149";
    ctx.fillRect(px + 12, py + 24, 150 * (me.hp / me.maxHp), 8);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "9px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(me.hp)} / ${me.maxHp}`, px + 168, py + 23);
    // Ammo
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < me.ammo ? "#ffd166" : "rgba(255,255,255,0.18)";
      ctx.fillRect(px + 12 + i * 52, py + 36, 48, 5);
    }
    if (me.ammo < 3) {
      ctx.fillStyle = "rgba(255,209,102,0.55)";
      ctx.fillRect(px + 12 + me.ammo * 52, py + 36, 48 * (me.reloadT / me.def.reload), 5);
    }
    // Super
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(px + 12, py + 45, 150, 5);
    ctx.fillStyle = me.super >= 1 ? "#ffd166" : "#d29922";
    ctx.fillRect(px + 12, py + 45, 150 * me.super, 5);
    ctx.fillStyle = me.super >= 1 ? "#ffd166" : "rgba(255,255,255,0.5)";
    ctx.font = "9px system-ui, sans-serif";
    ctx.fillText(me.super >= 1 ? "SUPER READY" : "SUPER", px + 168, py + 43);
    if (!me.alive && _phase === "play") {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`Respawn in ${Math.ceil(me.respawnT / 60)}`, VIEW_W / 2, VIEW_H / 2 - 40);
    }
  }

  // Touch: a SUPER button bottom-right.
  if (_isTouch && me) {
    const b = SUPER_BTN;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = me.super >= 1 ? "rgba(255,209,102,0.85)" : "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = me.super >= 1 ? "#0d1117" : "rgba(255,255,255,0.6)";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SUPER", b.x, b.y);
  }

  if (_phase === "play" && _clock < 600 && !_autopilot) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      _isTouch
        ? "Hold to move · tap to attack the nearest enemy · tap SUPER when charged"
        : "WASD move · mouse aim, click/hold to attack · E auto-attack · SPACE / Q super",
      VIEW_W / 2, VIEW_H - 14,
    );
  }
}

// ── Select screen ─────────────────────────────────────────────────────────
const CARD_W = 130, CARD_H = 186, CARD_GAP = 12;
const CARD_Y = 128;
const CARDS_X0 = (VIEW_W - (HEROES.length * CARD_W + (HEROES.length - 1) * CARD_GAP)) / 2;
const PLAY_BTN = { x: VIEW_W / 2 - 90, y: CARD_Y + CARD_H + 44, w: 180, h: 40 };

function cardRect(i) {
  return { x: CARDS_X0 + i * (CARD_W + CARD_GAP), y: CARD_Y, w: CARD_W, h: CARD_H };
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

// A tiny top-down portrait: a head with the hero's hat silhouette and the
// weapon poking out. Pure canvas, so it matches the 3D figure's read.
function drawPortrait(ctx, def, cx, cy, s) {
  const col = hexCss(def.color);
  const hat = hexCss(def.rig.hatColor);
  const acc = hexCss(def.rig.accent);
  // Shoulders
  ctx.fillStyle = col;
  roundRect(ctx, cx - s * 1.05 * (def.rig.bulk || 1), cy - s * 0.45, s * 2.1 * (def.rig.bulk || 1), s * 0.9, s * 0.3);
  ctx.fill();
  // Weapon, forward (up)
  ctx.strokeStyle = "#2e3338";
  ctx.lineWidth = s * 0.22;
  ctx.lineCap = "round";
  const wx = cx + s * 0.85;
  switch (def.rig.weapon) {
    case "shotgun":
      ctx.beginPath(); ctx.moveTo(wx, cy); ctx.lineTo(wx, cy - s * 1.9); ctx.stroke(); break;
    case "pistols":
      ctx.beginPath(); ctx.moveTo(wx, cy); ctx.lineTo(wx, cy - s * 1.1);
      ctx.moveTo(cx - s * 0.85, cy); ctx.lineTo(cx - s * 0.85, cy - s * 1.1); ctx.stroke(); break;
    case "fists":
      ctx.fillStyle = acc;
      ctx.fillRect(wx - s * 0.32, cy - s * 0.9, s * 0.64, s * 0.64);
      ctx.fillRect(cx - s * 0.85 - s * 0.32, cy - s * 0.9, s * 0.64, s * 0.64);
      break;
    case "lute":
      ctx.strokeStyle = "#8a5f33";
      ctx.beginPath(); ctx.moveTo(cx - s * 0.7, cy + s * 0.2); ctx.lineTo(cx + s * 0.9, cy - s * 1.1); ctx.stroke();
      ctx.fillStyle = "#8a5f33";
      ctx.beginPath(); ctx.ellipse(cx - s * 0.6, cy + s * 0.15, s * 0.45, s * 0.35, -0.6, 0, Math.PI * 2); ctx.fill();
      break;
    case "bottle":
      ctx.fillStyle = acc;
      ctx.fillRect(wx - s * 0.18, cy - s * 1.0, s * 0.36, s * 0.7);
      break;
    case "wrench":
      ctx.beginPath(); ctx.moveTo(wx, cy); ctx.lineTo(wx, cy - s * 1.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(wx, cy - s * 1.45, s * 0.3, 0.4, Math.PI - 0.4, true); ctx.stroke();
      break;
  }
  // Head
  ctx.fillStyle = "#e8b48a";
  ctx.beginPath(); ctx.arc(cx, cy, s * 0.62, 0, Math.PI * 2); ctx.fill();
  // Hat silhouette
  ctx.fillStyle = hat;
  switch (def.rig.hat) {
    case "cowboy":
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = acc; ctx.fillRect(cx - s * 0.5, cy - s * 0.5, s, s * 0.12);
      ctx.fillStyle = hat; ctx.fillRect(cx - s * 0.4, cy - s * 0.42, s * 0.8, s * 0.84);
      break;
    case "bandana":
      ctx.fillRect(cx - s * 0.66, cy - s * 0.1, s * 1.32, s * 0.26);
      ctx.beginPath(); ctx.moveTo(cx + s * 0.4, cy + s * 0.2); ctx.lineTo(cx + s * 0.9, cy + s * 0.9); ctx.lineTo(cx + s * 0.55, cy + s * 0.9); ctx.fill();
      break;
    case "mask":
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.64, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = acc; ctx.fillRect(cx - s * 0.16, cy - s * 0.64, s * 0.32, s * 1.28);
      break;
    case "sombrero":
      ctx.beginPath(); ctx.arc(cx, cy, s * 1.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(cx, cy, s * 1.1, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = acc; ctx.stroke();
      ctx.fillStyle = hat; ctx.beginPath(); ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2); ctx.fill();
      break;
    case "goggles":
      ctx.fillRect(cx - s * 0.66, cy - s * 0.15, s * 1.32, s * 0.24);
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(cx - s * 0.26, cy - s * 0.3, s * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.26, cy - s * 0.3, s * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    case "cap":
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - s * 0.5, cy - s * 1.0, s, s * 0.45);
      break;
  }
  // Eyes — always forward (up), so the portrait reads as facing the fight.
  if (def.rig.hat !== "sombrero" && def.rig.hat !== "cowboy") {
    ctx.fillStyle = "#14181d";
    ctx.fillRect(cx - s * 0.3, cy - s * 0.52, s * 0.16, s * 0.14);
    ctx.fillRect(cx + s * 0.14, cy - s * 0.52, s * 0.16, s * 0.14);
  }
}

function drawSelectScreen(ctx) {
  ctx.fillStyle = "rgba(6,9,14,0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px system-ui, sans-serif";
  ctx.fillText("SHARD RUSH", VIEW_W / 2, 46);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText(
    `3v3 · mine the shards, hold ${SHARDS_TO_WIN} for ${COUNTDOWN_FRAMES / 60} s · pick your hero`,
    VIEW_W / 2, 74,
  );
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText(_isTouch ? "Tap a card, then tap PLAY" : "← → or A/D to browse · ENTER to play · or click a card", VIEW_W / 2, 98);

  for (let i = 0; i < HEROES.length; i++) {
    const def = HEROES[i];
    const r = cardRect(i);
    const sel = i === _selIdx;
    const grow = sel ? 6 : 0;
    const x = r.x - grow / 2, y = r.y - grow, w = r.w + grow, h = r.h + grow;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fillStyle = sel ? "rgba(30,36,48,0.98)" : "rgba(20,25,34,0.92)";
    ctx.fill();
    ctx.strokeStyle = sel ? "#ffd166" : hexCss(def.color) + "66";
    ctx.lineWidth = sel ? 2.5 : 1.5;
    ctx.stroke();
    // Header band
    roundRect(ctx, x, y, w, 26, 10);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = hexCss(def.color);
    ctx.fillRect(x, y, w, 26);
    ctx.restore();
    ctx.fillStyle = "#0d1117";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.name.toUpperCase(), x + w / 2, y + 13);

    drawPortrait(ctx, def, x + w / 2, y + 66, 13);

    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(def.cls.toUpperCase(), x + w / 2, y + 102);

    // Stat bars
    const stats = [["HP", def.stats.hp], ["DMG", def.stats.dmg], ["RNG", def.stats.range], ["SPD", def.stats.speed]];
    for (let s = 0; s < stats.length; s++) {
      const sy = y + 116 + s * 13;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "8px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(stats[s][0], x + 12, sy);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k < stats[s][1] ? hexCss(def.color) : "rgba(255,255,255,0.12)";
        ctx.fillRect(x + 38 + k * 20, sy - 3, 18, 6);
      }
    }
    if (sel) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SELECTED", x + w / 2, y + h - 12);
    }
  }

  // Blurb for the highlighted hero.
  const def = HEROES[_selIdx];
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(def.blurb, VIEW_W / 2, CARD_Y + CARD_H + 18);
  ctx.fillStyle = "#ffd166";
  ctx.fillText("SUPER — " + def.superBlurb, VIEW_W / 2, CARD_Y + CARD_H + 34);

  // Play button
  const b = PLAY_BTN;
  roundRect(ctx, b.x, b.y + 12, b.w, b.h, 8);
  ctx.fillStyle = "#ffd166";
  ctx.fill();
  ctx.fillStyle = "#0d1117";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillText("PLAY", b.x + b.w / 2, b.y + 12 + b.h / 2);
}

function drawBanners(ctx) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (_phase === "ready") {
    const secs = Math.ceil((READY_FRAMES - _phaseT) / 60);
    const go = _phaseT > READY_FRAMES - 40;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `bold ${go ? 44 : 52}px system-ui, sans-serif`;
    ctx.fillText(go ? "GO!" : String(secs), VIEW_W / 2, VIEW_H / 2 - 60);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(`You are ${humanHero().def.name} · reach the mine`, VIEW_W / 2, VIEW_H / 2 - 20);
    return;
  }
  if (_phase === "over") {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const won = _winner === 0, draw = _winner < 0;
    ctx.fillStyle = draw ? "#d29922" : won ? "#3fb950" : "#f85149";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.fillText(draw ? "Draw" : won ? "Victory!" : "Defeat", VIEW_W / 2, VIEW_H / 2 - 36);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(`Shards ${_teamShards[0]} – ${_teamShards[1]}`, VIEW_W / 2, VIEW_H / 2 - 6);
    const me = humanHero();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(`${me.def.name}: ${me.kills} knockouts · ${me.deaths} deaths · ${Math.round(me.dealt)} damage`, VIEW_W / 2, VIEW_H / 2 + 18);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(_isTouch ? "Tap for a rematch" : "Click or press SPACE for a rematch", VIEW_W / 2, VIEW_H / 2 + 46);
  }
}

// ── Rendering: 3D ─────────────────────────────────────────────────────────
let _THREE = null;
let _scene3d = null;          // the scene every handle below belongs to
let _groundMesh = null;
let _bushMeshes = [];
let _mineMesh = null;         // { group, crystals }
let _padMeshes = [];
let _figs = new Map();        // hero record → { ch, defId }
let _shardMeshes = new Map(); // shard record → mesh
let _turretMeshes = new Map();// turret record → { group, pivot, bodyMat }
let _tracerPool = [];  let _tracerUsed = 0;
let _lobPool = [];     let _lobUsed = 0;
let _shadowPool = [];  let _shadowUsed = 0;
let _wavePool = { arc: [], ring: [] }; let _waveUsed = { arc: 0, ring: 0 };
let _puddlePool = [];  let _puddleUsed = 0;
let _styledWalls = new WeakSet();
let _wallMats = null;
let _shardGeo = null, _shardMat = null, _arcGeo = null, _ringGeo = null;
const GROUND_Z = 1;           // above the adapter's default grid (z = 0), so it hides it

function srand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

function ensureScene(adapter, scene) {
  if (_scene3d === scene) return;
  // A new scene (first 3D frame, or a render-mode switch): the old one was torn
  // down by the adapter, so every handle is simply dropped and rebuilt.
  _scene3d = scene;
  _groundMesh = null;
  _bushMeshes = [];
  _mineMesh = null;
  _padMeshes = [];
  _figs = new Map();
  _shardMeshes = new Map();
  _turretMeshes = new Map();
  _tracerPool = []; _tracerUsed = 0;
  _lobPool = []; _lobUsed = 0;
  _shadowPool = []; _shadowUsed = 0;
  _wavePool = { arc: [], ring: [] }; _waveUsed = { arc: 0, ring: 0 };
  _puddlePool = []; _puddleUsed = 0;
  _styledWalls = new WeakSet();
  _wallMats = null;
  _shardGeo = new _THREE.OctahedronGeometry(7, 0);
  _shardMat = new _THREE.MeshPhongMaterial({ color: SHARD_HEX, emissive: 0x5b21b6, emissiveIntensity: 0.6, shininess: 90, flatShading: true });
  const arc = HERO_BY_ID.tempo.attack.arc;
  _arcGeo = new _THREE.RingGeometry(0.9, 1, 40, 1, -arc, arc * 2);
  _ringGeo = new _THREE.RingGeometry(0.92, 1, 48, 1, 0, Math.PI * 2);
  void adapter;
}

// The whole arena floor as one canvas texture, drawn from the same layout data
// the physics uses, so the paths, pads and bush beds can never drift from the
// bodies they decorate.
function drawGroundTexture(c) {
  const rnd = srand(9001);
  c.fillStyle = "#2f5f38";
  c.fillRect(0, 0, WORLD_W, WORLD_H);
  // Grass mottling.
  for (let i = 0; i < 900; i++) {
    c.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.06)";
    const r = 10 + rnd() * 40;
    c.beginPath();
    c.ellipse(rnd() * WORLD_W, rnd() * WORLD_H, r, r * (0.5 + rnd() * 0.5), rnd() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  // Worn dirt: a spine from base to base and the centre row.
  c.fillStyle = "rgba(110,90,60,0.55)";
  c.fillRect(CX - 70, 0, 140, WORLD_H);
  c.fillRect(0, CY - 40, WORLD_W, 80);
  c.fillStyle = "rgba(110,90,60,0.35)";
  c.fillRect(CX - 100, 0, 200, WORLD_H);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
    const x = CX - 100 + rnd() * 200, y = rnd() * WORLD_H;
    c.fillRect(x, y, 2 + rnd() * 6, 2 + rnd() * 6);
  }
  // Bush beds — darker earth under each bush cluster.
  for (const r of BUSH_DEFS) {
    c.fillStyle = "rgba(20,50,25,0.55)";
    c.beginPath();
    c.ellipse(r[0] + r[2] / 2, r[1] + r[3] / 2, r[2] * 0.55, r[3] * 0.55, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Base pads.
  for (const team of [0, 1]) {
    const b = BASE_CENTER[team];
    c.beginPath();
    c.arc(b.x, b.y, 64, 0, Math.PI * 2);
    c.fillStyle = TEAM_COLORS[team] + "40";
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = TEAM_COLORS[team] + "cc";
    c.stroke();
    for (const s of SPAWNS[team]) {
      c.beginPath();
      c.arc(s.x, s.y, 14, 0, Math.PI * 2);
      c.fillStyle = TEAM_COLORS[team] + "66";
      c.fill();
    }
  }
  // Mine pad.
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const px = MINE.x + Math.cos(a) * (MINE.r + 10), py = MINE.y + Math.sin(a) * (MINE.r + 10);
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = "#3a3f4a";
  c.fill();
  c.lineWidth = 5;
  c.strokeStyle = "#7c5cc4";
  c.stroke();
  // Border shadow.
  c.strokeStyle = "rgba(0,0,0,0.35)";
  c.lineWidth = 14;
  c.strokeRect(0, 0, WORLD_W, WORLD_H);
}

function ensureGround(adapter) {
  if (_groundMesh) return;
  const cv = document.createElement("canvas");
  cv.width = WORLD_W;
  cv.height = WORLD_H;
  drawGroundTexture(cv.getContext("2d"));
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  // Scene Y is mirrored, so flip the texture back.
  tex.flipY = true;
  const mesh = new _THREE.Mesh(
    new _THREE.PlaneGeometry(WORLD_W, WORLD_H),
    new _THREE.MeshBasicMaterial({ map: tex }),
  );
  mesh.position.set(WORLD_W / 2, -WORLD_H / 2, GROUND_Z);
  adapter.addSceneMesh(mesh);
  _groundMesh = mesh;

  // Team rings on the pads and a disc per spawn spot.
  for (const team of [0, 1]) {
    const ring = new _THREE.Mesh(
      new _THREE.TorusGeometry(58, 2.5, 8, 32),
      new _THREE.MeshLambertMaterial({ color: TEAM_HEX[team], emissive: TEAM_HEX[team], emissiveIntensity: 0.35 }),
    );
    ring.position.set(BASE_CENTER[team].x, -BASE_CENTER[team].y, GROUND_Z + 1);
    adapter.addSceneMesh(ring);
    _padMeshes.push(ring);
  }
}

function ensureBushes(adapter) {
  if (_bushMeshes.length) return;
  const geo = new _THREE.IcosahedronGeometry(1, 0);
  const mats = [
    new _THREE.MeshLambertMaterial({ color: 0x2f8f4e, flatShading: true, transparent: true, opacity: 0.86 }),
    new _THREE.MeshLambertMaterial({ color: 0x27753f, flatShading: true, transparent: true, opacity: 0.86 }),
    new _THREE.MeshLambertMaterial({ color: 0x3aa35c, flatShading: true, transparent: true, opacity: 0.86 }),
  ];
  const rnd = srand(777);
  for (const r of BUSH_DEFS) {
    const n = Math.ceil((r[2] * r[3]) / 1500);
    for (let i = 0; i < n; i++) {
      const m = new _THREE.Mesh(geo, mats[Math.floor(rnd() * mats.length)]);
      const s = 13 + rnd() * 9;
      m.scale.set(s, s, s * 0.75);
      // Keep blobs inside the rect so the physics region and the picture agree.
      const x = r[0] + s + rnd() * Math.max(1, r[2] - s * 2);
      const y = r[1] + s + rnd() * Math.max(1, r[3] - s * 2);
      m.position.set(x, -y, GROUND_Z + 7 + rnd() * 4);
      m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      adapter.addSceneMesh(m);
      _bushMeshes.push(m);
    }
  }
}

function ensureMine(adapter) {
  if (_mineMesh) return;
  const group = new _THREE.Group();
  group.position.set(MINE.x, -MINE.y, GROUND_Z);
  const pad = new _THREE.Mesh(
    new _THREE.CylinderGeometry(MINE.r + 6, MINE.r + 10, 5, 6),
    new _THREE.MeshLambertMaterial({ color: 0x4a5060, flatShading: true }),
  );
  pad.rotation.x = Math.PI / 2;
  pad.rotation.y = Math.PI / 6;
  pad.position.z = 2.5;
  group.add(pad);
  const crystals = [];
  const sizes = [[14, 0, 0, 0], [9, 16, 6, 0.6], [8, -13, 9, 1.4], [7, 4, -15, 2.2]];
  for (const [r, ox, oy, rot] of sizes) {
    const c = new _THREE.Mesh(new _THREE.OctahedronGeometry(r, 0), _shardMat);
    c.position.set(ox, oy, 5 + r);
    c.rotation.z = rot;
    group.add(c);
    crystals.push(c);
  }
  adapter.addSceneMesh(group);
  _mineMesh = { group, crystals };
}

function styleWalls(adapter) {
  for (const entry of adapter.getTrackedMeshes()) {
    if (_styledWalls.has(entry.mesh)) continue;
    const kind = entry.body?.userData?._kind;
    if (kind !== "wall" && kind !== "crate" && kind !== "border") continue;
    if (!_wallMats) {
      _wallMats = {
        stone: createBoardMaterial(_THREE, { tint: 0x5b6470, worldUnitsPerTile: 34 }),
        wood: createBoardMaterial(_THREE, { tint: 0x8a5f33, worldUnitsPerTile: 22 }),
        border: createBoardMaterial(_THREE, { tint: 0x3a4048, worldUnitsPerTile: 48 }),
      };
    }
    entry.mesh.material = kind === "crate" ? _wallMats.wood : kind === "border" ? _wallMats.border : _wallMats.stone;
    _styledWalls.add(entry.mesh);
  }
}

function ensureFigures(adapter) {
  // One figure per hero record, rebuilt when the hero's kit changes (the select
  // screen swaps the human's kit in place).
  for (const h of _heroes) {
    const f = _figs.get(h);
    if (f && f.defId === h.def.id) continue;
    if (f) destroyCharacter(adapter, f.ch);
    const def = h.def;
    const ch = createCharacter(adapter, _THREE, {
      unit: HERO_R * 0.95,
      palette: heroPalette(def.color, { hat: def.rig.hatColor, accent: def.rig.accent }),
      props: def.rig,
    });
    // Team ring at the feet — the hero colour is the kit, the ring is the side.
    const ring = new _THREE.Mesh(
      new _THREE.RingGeometry(HERO_R * 0.95, HERO_R * 1.22, 28),
      new _THREE.MeshBasicMaterial({ color: TEAM_HEX[h.team], transparent: true, opacity: 0.85, depthWrite: false }),
    );
    ring.position.z = 0.8;
    ch.root.add(ring);
    _figs.set(h, { ch, defId: def.id, ring });
  }
  for (const [h, f] of _figs) {
    if (!_heroes.includes(h)) { destroyCharacter(adapter, f.ch); _figs.delete(h); }
  }
}

function syncFigures() {
  for (const [h, f] of _figs) {
    let visible;
    if (_phase === "select") visible = h.team === 0;
    else if (h.alive) visible = visibleTo(h, 0);
    else visible = h.deadAnim < 1 && (h.team === 0 || h.bush < 0);
    f.ch.root.visible = visible;
    if (!visible) continue;
    // A friendly inside a bush is drawn faint — you know where they are, and it
    // says "hidden" without hiding them from you.
    const faint = h.team === 0 && h.bush >= 0 && h.alive;
    f.ring.material.opacity = faint ? 0.35 : 0.85;
    syncCharacter(f.ch, {
      x: h.body.position.x,
      y: h.body.position.y,
      faceX: Math.cos(h.dispAngle),
      faceY: Math.sin(h.dispAngle),
      sprinting: false,
      z: (h.leapZ || 0) + GROUND_Z,
      attacking: h.attackFlash,
      hit: h.hitFlash,
      dead: h.alive ? 0 : h.deadAnim,
      lift: 1 + (h.leapZ || 0) / 220,
    });
    // Spawn shield: the ring blinks white.
    if (h.shieldT > 0) f.ring.material.color.setHex(Math.floor(_frame / 6) % 2 ? 0xffffff : TEAM_HEX[h.team]);
    else if (h.super >= 1) f.ring.material.color.setHex(Math.floor(_frame / 8) % 2 ? 0xffd166 : TEAM_HEX[h.team]);
    else f.ring.material.color.setHex(TEAM_HEX[h.team]);
  }
}

function syncShardMeshes(adapter) {
  const live = new Set(_shards);
  for (const [s, m] of _shardMeshes) {
    if (!live.has(s)) { adapter.removeSceneMesh(m); _shardMeshes.delete(s); }
  }
  for (const s of _shards) {
    let m = _shardMeshes.get(s);
    if (!m) {
      m = new _THREE.Mesh(_shardGeo, _shardMat);
      adapter.addSceneMesh(m);
      _shardMeshes.set(s, m);
    }
    const bob = Math.sin(s.bob + _frame * 0.08) * 1.5;
    m.position.set(s.x, -s.y, GROUND_Z + 8 + s.z + bob);
    m.rotation.z = s.bob + _frame * 0.03;
    m.rotation.x = 0.35;
  }
  if (_mineMesh) {
    // The cluster swells toward the next spawn and turns slowly.
    const k = _phase === "play" ? 1 - clamp((_nextShardAt - _frame) / SHARD_SPAWN_FRAMES, 0, 1) : 0;
    const s = 1 + k * 0.25;
    _mineMesh.crystals.forEach((c, i) => {
      c.scale.set(s, s, s);
      c.rotation.z += 0.01 + i * 0.003;
    });
  }
}

function poolTake(pool, usedRef, make, adapter) {
  if (usedRef.n < pool.length) return pool[usedRef.n++];
  const m = make();
  adapter.addSceneMesh(m);
  pool.push(m);
  usedRef.n++;
  return m;
}
function poolPark(pool, from) {
  for (let i = from; i < pool.length; i++) pool[i].visible = false;
}

function syncProjectileMeshes(adapter) {
  // Tracers.
  const tu = { n: 0 };
  for (const b of _bullets) {
    if (!b.body) continue;
    const m = poolTake(_tracerPool, tu, () => new _THREE.Mesh(
      new _THREE.SphereGeometry(1, 8, 6), new _THREE.MeshBasicMaterial({ color: 0xffffff }),
    ), adapter);
    const p = b.body.position;
    m.visible = true;
    m.position.set(p.x, -p.y, GROUND_Z + 9);
    m.scale.set(b.r * 2.6, b.r, b.r);
    m.rotation.z = -b.angle;
    m.material.color.set(b.color);
  }
  poolPark(_tracerPool, tu.n);

  // Lobbed flasks + their ground shadows.
  const lu = { n: 0 }, su = { n: 0 };
  for (const L of _lobs) {
    const k = L.t / L.T;
    const x = L.x0 + (L.x1 - L.x0) * k, y = L.y0 + (L.y1 - L.y0) * k;
    const hgt = 4 * 70 * k * (1 - k);
    const m = poolTake(_lobPool, lu, () => new _THREE.Mesh(
      new _THREE.CylinderGeometry(3.5, 4.5, 11, 7), new _THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    ), adapter);
    m.visible = true;
    m.position.set(x, -y, GROUND_Z + 8 + hgt);
    m.rotation.set(Math.PI / 2 + k * 9, 0, 0);
    m.material.color.set(L.color);
    const sh = poolTake(_shadowPool, su, () => new _THREE.Mesh(
      new _THREE.CircleGeometry(1, 16),
      new _THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    ), adapter);
    sh.visible = true;
    sh.position.set(x, -y, GROUND_Z + 0.6);
    const ss = 6 - hgt * 0.03;
    sh.scale.set(ss, ss, 1);
  }
  poolPark(_lobPool, lu.n);
  poolPark(_shadowPool, su.n);

  // Waves: an arc for the bard's attack, a full ring for the healing chord.
  const wu = { arc: 0, ring: 0 };
  for (const w of _waves) {
    const kind = w.heal ? "ring" : "arc";
    const ref = { n: wu[kind] };
    const m = poolTake(_wavePool[kind], ref, () => new _THREE.Mesh(
      kind === "arc" ? _arcGeo : _ringGeo,
      new _THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: _THREE.DoubleSide, depthWrite: false }),
    ), adapter);
    wu[kind] = ref.n;
    m.visible = true;
    m.position.set(w.x, -w.y, GROUND_Z + 6);
    m.scale.set(w.r, w.r, 1);
    m.rotation.z = -w.angle;
    m.material.color.set(w.color);
    m.material.opacity = 0.25 + 0.65 * (1 - w.r / w.range);
  }
  poolPark(_wavePool.arc, wu.arc);
  poolPark(_wavePool.ring, wu.ring);

  // Puddles.
  const pu = { n: 0 };
  for (const P of _puddles) {
    const m = poolTake(_puddlePool, pu, () => new _THREE.Mesh(
      new _THREE.CircleGeometry(1, 24),
      new _THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.35, depthWrite: false }),
    ), adapter);
    m.visible = true;
    m.position.set(P.x, -P.y, GROUND_Z + 1.2);
    m.scale.set(P.r, P.r, 1);
    m.material.opacity = 0.18 + 0.22 * Math.min(1, P.t / 40) + Math.sin(_frame * 0.3) * 0.04;
  }
  poolPark(_puddlePool, pu.n);
}

function syncTurretMeshes(adapter) {
  const live = new Set(_turrets.filter(t => t.hp > 0));
  for (const [t, m] of _turretMeshes) {
    if (!live.has(t)) { adapter.removeSceneMesh(m.group); _turretMeshes.delete(t); }
  }
  for (const t of live) {
    let m = _turretMeshes.get(t);
    if (!m) {
      const group = new _THREE.Group();
      const base = new _THREE.Mesh(
        new _THREE.CylinderGeometry(14, 16, 8, 8),
        new _THREE.MeshLambertMaterial({ color: 0x3a4048, flatShading: true }),
      );
      base.rotation.x = Math.PI / 2;
      base.position.z = 4;
      group.add(base);
      const bodyMat = new _THREE.MeshLambertMaterial({ color: TEAM_HEX[t.team], flatShading: true });
      const body = new _THREE.Mesh(new _THREE.BoxGeometry(16, 16, 10), bodyMat);
      body.position.z = 13;
      group.add(body);
      const pivot = new _THREE.Group();
      pivot.position.z = 15;
      const barrel = new _THREE.Mesh(
        new _THREE.BoxGeometry(4, 22, 4),
        new _THREE.MeshLambertMaterial({ color: 0x2e3338, flatShading: true }),
      );
      barrel.position.y = 12;
      pivot.add(barrel);
      const muzzle = new _THREE.Mesh(
        new _THREE.BoxGeometry(6, 5, 6),
        new _THREE.MeshLambertMaterial({ color: 0xffd166, flatShading: true }),
      );
      muzzle.position.y = 24;
      pivot.add(muzzle);
      group.add(pivot);
      group.position.set(t.body.position.x, -t.body.position.y, GROUND_Z);
      adapter.addSceneMesh(group);
      m = { group, pivot, bodyMat };
      _turretMeshes.set(t, m);
    }
    // The barrel is built along +Y; world angle → scene angle is a sign flip.
    m.pivot.rotation.z = -t.aim - Math.PI / 2;
    m.bodyMat.emissive.setHex(t.hitFlash ? 0xffffff : 0x000000);
    m.pivot.position.y = t.fired ? -3 : 0;
  }
}

// ── Rendering: PixiJS ─────────────────────────────────────────────────────
// The Pixi adapter's debug pass draws the bodies (walls, crates, turrets) and
// resolves per-body alpha only once, when a body's graphics are built — so
// everything that appears, moves, hides or dies is drawn here instead: a
// static layer for the arena markings and a dynamic layer redrawn every frame.
let _pixiApp = null;
let _pixiStatic = null;
let _pixiDyn = null;

function cssHex(c) { return parseInt(c.slice(1, 7), 16); }

function ensurePixiLayers(PIXI, app) {
  if (_pixiApp === app && _pixiStatic?.parent === app.stage && _pixiDyn?.parent === app.stage) return;
  if (_pixiStatic?.parent) _pixiStatic.parent.removeChild(_pixiStatic);
  if (_pixiDyn?.parent) _pixiDyn.parent.removeChild(_pixiDyn);
  _pixiApp = app;

  const g = new PIXI.Graphics();
  for (const r of BUSH_DEFS) {
    g.rect(r[0], r[1], r[2], r[3]).fill({ color: 0x3fb950, alpha: 0.16 }).stroke({ color: 0x3fb950, alpha: 0.45, width: 1.5 });
  }
  for (const team of [0, 1]) {
    const c = BASE_CENTER[team];
    g.circle(c.x, c.y, 60).fill({ color: TEAM_HEX[team], alpha: 0.1 }).stroke({ color: TEAM_HEX[team], alpha: 0.55, width: 2 });
  }
  const hex = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    hex.push(MINE.x + Math.cos(a) * (MINE.r + 6), MINE.y + Math.sin(a) * (MINE.r + 6));
  }
  g.poly(hex, true).fill({ color: SHARD_HEX, alpha: 0.1 }).stroke({ color: SHARD_HEX, alpha: 0.6, width: 2 });
  // Above the grid (index 0), below the body layer.
  app.stage.addChildAt(g, Math.min(1, app.stage.children.length));
  _pixiStatic = g;

  _pixiDyn = new PIXI.Graphics();
  app.stage.addChild(_pixiDyn);
}

function drawPixiDynamic(g) {
  g.clear();
  for (const P of _puddles) {
    const k = Math.min(1, P.t / 40);
    g.circle(P.x, P.y, P.r).fill({ color: 0xff922b, alpha: 0.28 * k }).stroke({ color: 0xff922b, alpha: 0.6 * k, width: 1.5 });
  }
  for (const s of _shards) {
    const bob = Math.sin(s.bob + _frame * 0.08) * 1.5;
    if (s.z > 0) g.ellipse(s.x, s.y, 6, 3).fill({ color: 0x000000, alpha: 0.3 });
    const y = s.y - s.z * 0.5 - bob, r = 8;
    const alpha = _frame < s.pickAt ? 0.6 : 1;
    g.poly([s.x, y - r, s.x + r * 0.7, y, s.x, y + r, s.x - r * 0.7, y], true)
      .fill({ color: SHARD_HEX, alpha: 0.85 * alpha }).stroke({ color: 0xffffff, alpha: 0.7 * alpha, width: 1 });
  }
  // Heroes — team-coloured pucks, same read as the 2D body pass.
  for (const h of _heroes) {
    if (!shownToHuman(h)) continue;
    const p = h.body.position;
    g.circle(p.x, p.y, HERO_R).fill({ color: TEAM_HEX[h.team], alpha: 0.18 })
      .stroke({ color: TEAM_HEX[h.team], width: h.isHuman ? 2.5 : 1.5 });
  }
  for (const b of _bullets) {
    if (!b.body) continue;
    const p = b.body.position;
    const col = cssHex(b.color);
    g.moveTo(p.x, p.y).lineTo(p.x - Math.cos(b.angle) * b.r * 3.5, p.y - Math.sin(b.angle) * b.r * 3.5)
      .stroke({ color: col, alpha: 0.55, width: b.r * 0.8 });
    g.circle(p.x, p.y, b.r).fill({ color: col });
  }
  for (const L of _lobs) {
    const k = L.t / L.T;
    const x = L.x0 + (L.x1 - L.x0) * k, y = L.y0 + (L.y1 - L.y0) * k;
    const hgt = 4 * 60 * k * (1 - k);
    const col = cssHex(L.color);
    g.ellipse(x, y, 6, 3.5).fill({ color: 0x000000, alpha: 0.3 });
    g.circle(x, y - hgt, 5).fill({ color: col });
    g.circle(L.x1, L.y1, L.radius).stroke({ color: col, alpha: 0.33, width: 1 });
  }
  for (const w of _waves) {
    const k = 1 - w.r / w.range;
    const a0 = w.angle - w.arc, a1 = w.angle + w.arc;
    g.moveTo(w.x + Math.cos(a0) * w.r, w.y + Math.sin(a0) * w.r)
      .arc(w.x, w.y, w.r, a0, a1)
      .stroke({ color: cssHex(w.color), alpha: 0.47 + 0.53 * k, width: w.heal ? 3 : 6 });
  }
  for (const t of _turrets) {
    if (t.hp <= 0) continue;
    const p = t.body.position;
    g.moveTo(p.x, p.y).lineTo(p.x + Math.cos(t.aim) * 24, p.y + Math.sin(t.aim) * 24)
      .stroke({ color: TEAM_HEX[t.team], width: 4 });
  }
}

// ── Demo definition ───────────────────────────────────────────────────────
function screenFromWorld(x, y) {
  return { x: x - _viewCam.x, y: y - _viewCam.y };
}

function handleSelectClick(sx, sy) {
  for (let i = 0; i < HEROES.length; i++) {
    const r = cardRect(i);
    if (sx >= r.x && sx <= r.x + r.w && sy >= r.y - 6 && sy <= r.y + r.h) {
      if (_selIdx === i && !_isTouch) { startMatch(); return; }
      _selIdx = i;
      setHumanHero(HEROES[i]);
      return;
    }
  }
  const b = PLAY_BTN;
  if (sx >= b.x && sx <= b.x + b.w && sy >= b.y + 12 && sy <= b.y + 12 + b.h) startMatch();
}

export default {
  id: "shard-rush",
  label: "Shard Rush",
  tags: ["Gameplay", "AI", "Shooter", "Camera", "Sensors", "Mobile"],
  desc:
    "3v3 top-down <b>hero arena</b>. A mine in the middle coughs up a <b>shard</b> every few seconds — carry <b>10</b> between your team and survive a <b>15-second countdown</b> to win. Die and you drop everything you hold. Pick one of <b>six heroes</b> on the select screen — shotgunner, gunslinger, wrestler, bard, thrower, engineer — each with its own attack, <b>3-shot ammo</b> that reloads over time, and a <b>SUPER</b> that charges as you land hits: a wall-breaking blast, a piercing volley, a leap-and-slam, a healing chord, a flask barrage, an auto-turret. <b>Bushes</b> hide you until you attack or someone walks in close; <b>crates</b> can be blown open. Move with <b>WASD</b>, <b>aim with the mouse</b> and click to attack, <b>E</b> auto-attacks the nearest enemy, <b>SPACE</b>/<b>Q</b> fires the super — or on any device <b>hold</b> to steer, <b>tap</b> to attack and tap the SUPER button. Two <b>AI teammates</b> and three AI opponents run the same kit-aware brain: range bands, cover, stealth, retreat-to-heal, mine control and super timing. Every projectile is a <b>sensor body</b> delivered through <code>InteractionListener</code>s, with team filtering done by sensor groups and masks.",
  walls: false,
  workerCompatible: false,
  camera: null,

  setup(space) {
    _space = space;
    _runnerRef = this._runner || null;
    space.gravity = new Vec2(0, 0);

    installListeners(space);
    buildWorld(space);
    resetAll(space);

    this.camera = {
      follow: () => _camTarget,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.1,
    };

    _scene3d = null;
    _pixiApp = null; _pixiStatic = null; _pixiDyn = null;

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
        _keys[e.code] = true;
        const h = humanHero();
        if (_phase === "select") {
          if (e.code === "ArrowLeft" || e.code === "KeyA") { _selIdx = (_selIdx + HEROES.length - 1) % HEROES.length; setHumanHero(HEROES[_selIdx]); }
          else if (e.code === "ArrowRight" || e.code === "KeyD") { _selIdx = (_selIdx + 1) % HEROES.length; setHumanHero(HEROES[_selIdx]); }
          else if (e.code === "Enter" || e.code === "Space") startMatch();
          if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
          return;
        }
        if (_phase === "over") {
          if ((e.code === "Space" || e.code === "Enter") && _frame >= _restartLockUntil) toSelect();
          return;
        }
        if (e.code === "Space" || e.code === "KeyQ") {
          if (h?.alive && _phase === "play") {
            const dx = _aim.x - h.body.position.x, dy = _aim.y - h.body.position.y;
            if (Math.hypot(dx, dy) > 8) trySuper(h, _aim.x, _aim.y); else humanSuperAuto(h);
          }
        } else if (e.code === "KeyE") {
          if (h?.alive && _phase === "play") humanAttackAuto(h);
        }
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      };
      _onKeyUp = (e) => {
        if (!_space) return;
        _keys[e.code] = false;
      };
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  // The runner hands WORLD coords (viewport + camera). The aim is kept in
  // SCREEN space and re-derived each frame, so it stays put as the camera moves.
  hover(x, y) {
    const s = screenFromWorld(x, y);
    _aimScreen.x = s.x; _aimScreen.y = s.y;
  },

  click(x, y) {
    const s = screenFromWorld(x, y);
    _aimScreen.x = s.x; _aimScreen.y = s.y;
    if (_phase === "select") { handleSelectClick(s.x, s.y); return; }
    if (_phase === "over") {
      if (_frame >= _restartLockUntil) toSelect();
      return;
    }
    if (_isTouch) {
      // Touch: a press starts steering; whether it was a tap is decided on release.
      _pointer.active = true;
      _pointer.x = x; _pointer.y = y;
      _pointer.startX = x; _pointer.startY = y;
      _pointer.startFrame = _frame;
      return;
    }
    _mouseDown = true;
  },

  drag(x, y) {
    const s = screenFromWorld(x, y);
    _aimScreen.x = s.x; _aimScreen.y = s.y;
    if (_pointer.active) { _pointer.x = x; _pointer.y = y; }
  },

  release() {
    _mouseDown = false;
    if (!_pointer.active) return;
    _pointer.active = false;
    const held = _frame - _pointer.startFrame;
    const drift = Math.hypot(_pointer.x - _pointer.startX, _pointer.y - _pointer.startY);
    if (held < TAP_MAX_FRAMES && drift < TAP_MAX_DRIFT) {
      const h = humanHero();
      if (!h?.alive || _phase !== "play") return;
      const s = screenFromWorld(_pointer.x, _pointer.y);
      if (Math.hypot(s.x - SUPER_BTN.x, s.y - SUPER_BTN.y) <= SUPER_BTN.r + 8) humanSuperAuto(h);
      else humanAttackAuto(h);
    }
  },

  step() {
    _frame++;
    // One-frame animation triggers from the previous step are consumed now.
    for (const h of _heroes) { h.attackFlash = false; h.hitFlash = false; }
    for (const t of _turrets) t.hitFlash = false;

    if (_phase === "select") {
      for (const h of _heroes) { parkHero(h); h.faceX = 0; h.faceY = h.team === 0 ? -1 : 1; }
      updateCameraTarget();
      tickEffects();
      return;
    }

    if (_phase === "ready") {
      _phaseT++;
      for (const h of _heroes) { h.body.velocity = new Vec2(0, 0); tickHeroCommon(h); }
      if (_phaseT >= READY_FRAMES) {
        _phase = "play";
        _nextShardAt = _frame + SHARD_FIRST_FRAMES;
      }
      updateCameraTarget();
      tickEffects();
      return;
    }

    if (_phase === "play") {
      _clock++;
      assignRoles();
      for (const h of _heroes) {
        tickHeroCommon(h);
        if (h.leap) { tickLeap(h); continue; }
        if (h.isHuman) tickHuman(h); else tickAI(h);
        tickStream(h);
      }
      tickBullets();
      tickLobs();
      tickWaves();
      tickTurrets();
      tickShards();
      tickScoring();
    } else if (_phase === "over") {
      _phaseT++;
      for (const h of _heroes) {
        tickHeroCommon(h);
        if (h.alive) applyControl(h, 0, 0);
      }
      tickBullets();
      tickLobs();
      tickWaves();
      tickTurrets();
    }

    updateCameraTarget();
    tickEffects();
  },

  // Canvas2D — the shared body pass plus the arena markings and projectiles.
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);
    drawArenaMarkings(ctx);
    drawPuddles2d(ctx);
    drawShards2d(ctx);
    for (let i = 0; i < space.bodies.length; i++) {
      const b = space.bodies.at(i);
      const h = _unitByBody.get(b);
      if (h && h.def) {
        // Dead heroes and enemies hidden in bushes are not drawn.
        if (shownToHuman(h)) drawBody(ctx, b, showOutlines);
        continue;
      }
      if (b.userData?._hidden) continue;
      drawBody(ctx, b, showOutlines);
    }
    drawProjectiles2d(ctx);
    ctx.restore();
    ctx.restore();
    // Cues, particles and the HUD are left to render3dOverlay — the canvas2d
    // adapter calls that too, so drawing them here would double them.
  },

  // PixiJS — the adapter's body pass for walls/crates/turrets, plus the two
  // Graphics layers for everything that is not a body (or hides per frame).
  renderPixi(adapter, space, W, H, showOutlines, camX = 0, camY = 0) {
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;
    adapter.setOutlines(showOutlines);
    ensurePixiLayers(PIXI, app);
    adapter.syncBodies(space);
    drawPixiDynamic(_pixiDyn);
    // Keep the dynamic layer on top — the adapter re-adds its body container
    // on every demo load, which would otherwise bury it.
    app.stage.setChildIndex(_pixiDyn, app.stage.children.length - 1);
    app.stage.position.set(-camX, -camY);
    app.render();
    void W; void H;
  },

  // 3D — low-poly heroes over a textured arena; walls, crates and turret bodies
  // come through the adapter's normal path and are restyled in place.
  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter) {
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      adapter.syncBodies(space);
      renderer.render(scene, camera);
      return;
    }
    ensureScene(adapter, scene);
    ensureGround(adapter);
    ensureBushes(adapter);
    ensureMine(adapter);
    ensureFigures(adapter);

    adapter.syncBodies(space);
    styleWalls(adapter);

    syncFigures();
    syncShardMeshes(adapter);
    syncProjectileMeshes(adapter);
    syncTurretMeshes(adapter);

    // Follow camera — the adapter only applies camX/camY on its default path,
    // which this override replaces, so it has to be done here.
    const camZ = camera.position.z;
    camera.position.set(W / 2 + camX, -H / 2 - camY, camZ);
    camera.lookAt(W / 2 + camX, -H / 2 - camY, 0);
    renderer.render(scene, camera);
  },

  // All render modes: world-space cues (bars, badges, aim, particles, popups)
  // plus the screen-space HUD, select screen and banners.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    // Every render mode routes through here, so this is the one reliable place
    // to learn where the camera actually ended up (shake included).
    _viewCam.x = camX;
    _viewCam.y = camY;
    ctx.save();
    ctx.translate(-camX, -camY);
    if (_phase !== "select") {
      drawHeroCues(ctx);
      drawHumanAim(ctx);
    }
    drawParticles2d(ctx);
    drawFloaters2d(ctx);
    ctx.restore();
    drawHUD(ctx);
    if (_phase === "select") drawSelectScreen(ctx);
    drawBanners(ctx);
    void space; void W; void H;
  },
};
