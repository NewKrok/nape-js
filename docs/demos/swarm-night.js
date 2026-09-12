import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.42.1";
import { drawBody } from "../renderer.js?v=3.42.1";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.42.1";
import {
  createCharacter, destroyCharacter, syncCharacter, heroPalette,
} from "../renderers/lowpoly-characters.js?v=3.42.1";

// ── Swarm Night — a survivor roguelite ────────────────────────────────────
//
// Five minutes in a walled graveyard against a night that never stops
// spawning. You only ever steer: every weapon fires on its own — the whip
// cracks toward where you face, the wand picks the nearest monster, knives
// fly the way you run, the ward pulses around you, the orbs circle and the
// storm picks its own targets. Kills drop XP gems; a full bar pauses the night
// and offers three upgrade cards. Two grave knights and a bone colossus break
// up the swarm, and dawn at 5:00 is the win.
//
// Physics: every monster is a dynamic circle in a zero-gravity Space, so the
// horde crowds, squeezes and streams around gravestones without a single line
// of flocking code — the contact solver *is* the crowd. Knockback is a real
// impulse scaled by mass, so bats fly and brutes shrug; the ward and the
// colossus' slam are radial impulses that scatter whatever they hit. Hero
// bolts, knives, spit and the orbiting orbs are sensor bodies, and their hits
// arrive through InteractionListeners with side filtering done by sensor
// groups and masks — nothing of yours can hit you by construction. Contact
// damage comes from an ONGOING collision listener on the hero.
//
// 3D: a moonlit graveyard — iron fence, dead trees, crooked stones, a
// mausoleum, flickering lantern posts and ground mist — with the hero's own
// lantern light walking with them and every monster type drawn as a jointed
// low-poly rig built from instanced parts, so hundreds of them animate for
// the price of a handful of draw calls.

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;

// ── Arena ─────────────────────────────────────────────────────────────────
const WORLD_W = 2600;
const WORLD_H = 1800;
const RUN_FRAMES = 5 * 60 * 60;        // survive five minutes
const MAX_MON = 420;                   // alive-monster cap (performance budget)
const HERO_R = 14;
const START_X = WORLD_W / 2;
const START_Y = WORLD_H * 0.62;

// ── Collision filtering ───────────────────────────────────────────────────
// Collision bits decide who shoves whom; sensor bits decide who may be *hit*.
// Hero shots carry a sensor mask that only names monsters, monster spit only
// names the hero, so friendly fire is impossible by construction.
const G_HERO = 1 << 1;
const G_MON = 1 << 2;
const G_SOLID = 1 << 3;
const G_SHOT = 1 << 4;
const G_SPIT = 1 << 5;
const G_ORB = 1 << 6;
const S_HERO = 1 << 10;
const S_MON = 1 << 11;
const S_SPIT = 1 << 12;
const S_SHOT = 1 << 13;
const S_ORB = 1 << 14;

const F_HERO = () => new InteractionFilter(G_HERO, G_MON | G_SOLID, S_HERO, S_SPIT);
const F_MON = () => new InteractionFilter(G_MON, G_HERO | G_MON | G_SOLID, S_MON, S_SHOT | S_ORB);
const F_WRAITH = () => new InteractionFilter(G_MON, G_HERO, S_MON, S_SHOT | S_ORB);
const F_SOLID = () => new InteractionFilter(G_SOLID, ~0, 1 << 20, 0);
const F_SHOT = () => new InteractionFilter(G_SHOT, 0, S_SHOT, S_MON);
const F_SPIT = () => new InteractionFilter(G_SPIT, 0, S_SPIT, S_HERO);
const F_ORB = () => new InteractionFilter(G_ORB, 0, S_ORB, S_MON);

// ── Palette ───────────────────────────────────────────────────────────────
const C_BG = "#0b1018";
const C_GRASS = "#13201a";
const C_HERO = "#e5484d";
const C_XP = "#58a6ff";
const C_HP = "#3fb950";

// ── Utilities ─────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randi(arr.length)];
const hyp = (dx, dy) => Math.hypot(dx, dy) || 1e-6;
function srand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}
function cssHexInt(c) { return parseInt(c.slice(1, 7), 16); }
function fmtTime(frames) {
  const s = Math.max(0, Math.floor(frames / 60));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── State ─────────────────────────────────────────────────────────────────
let _space = null;
let _runnerRef = null;
let _frame = 0;
let _clock = 0;                // frames of play time
let _phase = "title";          // title | play | levelup | over | won
let _phaseT = 0;
let _restartLockUntil = 0;
let _isTouch = false;
let _keys = {};
let _onKeyDown = null, _onKeyUp = null;
const _pointer = { active: false, sx: 0, sy: 0 };
const _viewCam = { x: 0, y: 0 };
let _mode3d = false;
let _camProj = null;           // the three.js camera, for overlay projection in 3D

let _hero = null;
let _monsters = [];
let _monByBody = new Map();
let _shots = [];               // hero projectiles (sensor bodies)
let _spits = [];               // monster projectiles (sensor bodies)
let _orbs = [];                // orbiting kinematic sensor bodies
let _gems = [];
let _pickups = [];
let _particles = [];
let _floaters = [];
let _arcs = [];                // whip flashes
let _bolts = [];               // lightning bolts
let _rings = [];               // expanding shock rings
let _banners = [];
let _kills = 0;
let _spawnAcc = 0;
let _events = [];              // timed spawn events still to fire
let _boss = null;
let _elites = [];
let _cards = [];
let _cardHover = -1;
let _levelUpQueue = 0;
let _cbHero, _cbMon, _cbShot, _cbSpit, _cbOrb;
let _obstacles = [];
let _walls = [];
let _tufts = [];               // 2D ground decoration
let _flash = 0;                // screen flash (bomb, lightning)

// ── Listeners ─────────────────────────────────────────────────────────────
function installListeners(space) {
  _cbHero = new CbType();
  _cbMon = new CbType();
  _cbShot = new CbType();
  _cbSpit = new CbType();
  _cbOrb = new CbType();
  const resolve = (cb) => {
    const b1 = cb.int1.castBody ?? cb.int1.castShape?.body ?? null;
    const b2 = cb.int2.castBody ?? cb.int2.castShape?.body ?? null;
    return [b1, b2];
  };
  // Hero shots → monsters.
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbShot, _cbMon,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const shot = _shots.find((s) => s.body === b1 || s.body === b2);
      if (!shot || !shot.body) return;
      const m = _monByBody.get(shot.body === b1 ? b2 : b1);
      if (!m || !m.alive) return;
      onShotHit(shot, m);
    },
  ));
  // Orbs → monsters.
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbOrb, _cbMon,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const orb = _orbs.find((o) => o.body === b1 || o.body === b2);
      if (!orb) return;
      const m = _monByBody.get(orb.body === b1 ? b2 : b1);
      if (!m || !m.alive) return;
      onOrbHit(orb, m);
    },
  ));
  // Monster spit → hero.
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR, _cbSpit, _cbHero,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const sp = _spits.find((s) => s.body === b1 || s.body === b2);
      if (!sp || !sp.body) return;
      hurtHero(sp.dmg, sp.body.position.x, sp.body.position.y);
      killSpit(sp);
    },
  ));
  // Contact damage: any monster pressing against the hero, every step.
  space.listeners.add(new InteractionListener(
    CbEvent.ONGOING, InteractionType.COLLISION, _cbMon, _cbHero,
    (cb) => {
      const [b1, b2] = resolve(cb);
      const m = _monByBody.get(b1) || _monByBody.get(b2);
      if (m && m.alive) m.touchFrame = _frame;
    },
  ));
}

// ── World ─────────────────────────────────────────────────────────────────
// Static bodies — the fence line, gravestones, dead trees, the mausoleum and
// the lantern posts. Every one is drawn custom in all three renderers, so the
// bodies are hidden from the adapters' default passes.
function addSolid(space, body, kind, extra = {}) {
  for (let i = 0; i < body.shapes.length; i++) body.shapes.at(i).filter = F_SOLID();
  try { body.userData._hidden = true; body.userData._hidden3d = true; } catch (_) { /* frozen */ }
  body.space = space;
  const rec = { body, kind, x: body.position.x, y: body.position.y, ...extra };
  if (kind === "wall") _walls.push(rec); else _obstacles.push(rec);
  return rec;
}

function buildWorld(space) {
  _obstacles = [];
  _walls = [];
  const T = 60;
  const mk = (x, y, w, h) => {
    const b = new Body(BodyType.STATIC, new Vec2(x, y));
    b.shapes.add(new Polygon(Polygon.box(w, h)));
    return addSolid(space, b, "wall", { w, h });
  };
  mk(WORLD_W / 2, -T / 2, WORLD_W + T * 2, T);
  mk(WORLD_W / 2, WORLD_H + T / 2, WORLD_W + T * 2, T);
  mk(-T / 2, WORLD_H / 2, T, WORLD_H);
  mk(WORLD_W + T / 2, WORLD_H / 2, T, WORLD_H);

  const rnd = srand(20260912);
  const clear = (x, y, r) => Math.hypot(x - START_X, y - START_Y) < r;

  // The mausoleum — a rectangle with two stub columns in front.
  const MX = WORLD_W / 2, MY = WORLD_H * 0.30;
  {
    const b = new Body(BodyType.STATIC, new Vec2(MX, MY));
    b.shapes.add(new Polygon(Polygon.box(180, 120)));
    addSolid(space, b, "mausoleum", { w: 180, h: 120 });
    for (const sx of [-1, 1]) {
      const c = new Body(BodyType.STATIC, new Vec2(MX + sx * 62, MY + 84));
      c.shapes.add(new Circle(9));
      addSolid(space, c, "column", { r: 9 });
    }
  }

  // Gravestone rows: four plots, slightly crooked stones.
  for (const p of PLOTS) {
    for (let r = 0; r < p.rows; r++) {
      for (let c = 0; c < p.cols; c++) {
        if (rnd() < 0.22) continue;
        const x = p.x0 + c * 110 + (rnd() - 0.5) * 24;
        const y = p.y0 + r * 120 + (rnd() - 0.5) * 20;
        if (clear(x, y, 220)) continue;
        const cross = rnd() < 0.3;
        const w = cross ? 22 : 30 + rnd() * 10, h = cross ? 12 : 14;
        const b = new Body(BodyType.STATIC, new Vec2(x, y));
        b.rotation = (rnd() - 0.5) * 0.3;
        b.shapes.add(new Polygon(Polygon.box(w, h)));
        addSolid(space, b, cross ? "cross" : "stone", { w, h, rot: b.rotation, tall: 26 + rnd() * 14 });
      }
    }
  }

  // Dead trees — thick trunks the crowd has to stream around.
  const trees = [
    [180, 200], [WORLD_W - 200, 240], [220, WORLD_H - 220], [WORLD_W - 180, WORLD_H - 260],
    [900, 260], [1700, 300], [640, 900], [1960, 900], [1120, 1560], [1480, 1500],
    [420, 780], [2180, 760], [1300, 700],
  ];
  for (const [x, y] of trees) {
    if (clear(x, y, 200)) continue;
    const r = 15 + rnd() * 6;
    const b = new Body(BodyType.STATIC, new Vec2(x, y));
    b.shapes.add(new Circle(r));
    addSolid(space, b, "tree", { r, seed: rnd() });
  }

  // Lantern posts — light sources in 3D, small pillars for the physics.
  const lanterns = [[560, 560], [WORLD_W - 560, 560], [560, WORLD_H - 560], [WORLD_W - 560, WORLD_H - 560], [MX, MY + 200]];
  for (const [x, y] of lanterns) {
    const b = new Body(BodyType.STATIC, new Vec2(x, y));
    b.shapes.add(new Circle(6));
    addSolid(space, b, "lantern", { r: 6, phase: rnd() * 6.28 });
  }

  // 2D ground dressing (grass tufts and pebbles) — pure decoration.
  _tufts = [];
  for (let i = 0; i < 700; i++) {
    _tufts.push({ x: rnd() * WORLD_W, y: rnd() * WORLD_H, r: 1 + rnd() * 2.5, k: rnd() });
  }
}

// ── Hero ──────────────────────────────────────────────────────────────────
function makeHero(space) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(START_X, START_Y));
  const shape = new Circle(HERO_R, undefined, new Material(0.0, 0.3, 0.4, 3));
  shape.filter = F_HERO();
  shape.cbTypes.add(_cbHero);
  body.shapes.add(shape);
  body.allowRotation = false;
  try { body.userData._hidden = true; body.userData._hidden3d = true; body.userData._colorIdx = 3; } catch (_) { /* frozen */ }
  body.space = space;
  return {
    body,
    hp: 100, maxHp: 100,
    face: -Math.PI / 2,
    moveX: 0, moveY: 0,
    iframes: 0,
    hitFlash: false,
    attackFlash: false,
    level: 1, xp: 0, xpNext: xpFor(1),
    weapons: [],                 // { def, level, cd, ... }
    passives: {},                // id → level
    kills: 0,
    dead: 0,
    regenAcc: 0,
    stats: null,
  };
}

function xpFor(level) { return Math.floor(8 + level * 5 + level * level * 0.5); }

// Derived stats: base × every passive that touches them.
function recomputeStats() {
  const p = _hero.passives;
  const lv = (id) => p[id] || 0;
  _hero.stats = {
    speed: 175 * (1 + 0.08 * lv("boots")),
    magnet: 70 + 32 * lv("magnet"),
    cdMul: Math.max(0.4, 1 - 0.07 * lv("tome")),
    dmgMul: 1 + 0.12 * lv("fist"),
    armor: lv("armor"),
    regen: 0.5 * lv("clover"),
    area: 1 + 0.1 * lv("lens"),
  };
  const newMax = 100 + 15 * lv("heart");
  if (newMax !== _hero.maxHp) {
    _hero.hp += newMax - _hero.maxHp;
    _hero.maxHp = newMax;
  }
}

function heroX() { return _hero.body.position.x; }
function heroY() { return _hero.body.position.y; }

function hurtHero(dmg, sx, sy) {
  if (_phase !== "play" || _hero.iframes > 0 || _hero.hp <= 0) return;
  const real = Math.max(1, Math.round(dmg - _hero.stats.armor));
  _hero.hp -= real;
  _hero.iframes = 36;
  _hero.hitFlash = true;
  if (_runnerRef) _runnerRef.shakeCamera(Math.min(10, 3 + real * 0.3), 0.18);
  addFloater(heroX(), heroY() - 22, `-${real}`, "#ff6b6b", 1.1);
  burst(heroX(), heroY(), 6, "#ff6b6b", 2.2);
  if (sx !== undefined) {
    const dx = heroX() - sx, dy = heroY() - sy, d = hyp(dx, dy);
    _hero.body.applyImpulse(new Vec2((dx / d) * 90 * _hero.body.mass, (dy / d) * 90 * _hero.body.mass));
  }
  if (_hero.hp <= 0) {
    _hero.hp = 0;
    _phase = "over";
    _phaseT = 0;
    _restartLockUntil = _frame + 60;
    if (_runnerRef) _runnerRef.shakeCamera(18, 0.6);
    burst(heroX(), heroY(), 40, C_HERO, 4);
    pushBanner("THE NIGHT TAKES YOU", "#ff6b6b", 240);
  }
}

function tickHero() {
  const h = _hero;
  const st = h.stats;
  if (h.iframes > 0) h.iframes--;
  // Input → desired velocity.
  let mx = 0, my = 0;
  if (_keys.KeyW || _keys.ArrowUp) my -= 1;
  if (_keys.KeyS || _keys.ArrowDown) my += 1;
  if (_keys.KeyA || _keys.ArrowLeft) mx -= 1;
  if (_keys.KeyD || _keys.ArrowRight) mx += 1;
  let mul = 1;
  if (_pointer.active) {
    // Steer toward the pointer in SCREEN space, so it works the same under the
    // flat 2D camera and the tilted 3D one.
    const hs = screenFromWorld(heroX(), heroY());
    const dx = _pointer.sx - hs.x, dy = _pointer.sy - hs.y;
    const d = Math.hypot(dx, dy);
    if (d > 10) { mx = dx / d; my = dy / d; mul = clamp((d - 10) / 50, 0.25, 1); }
  }
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len; my /= len;
    h.face = Math.atan2(my, mx);
  }
  h.moveX = mx; h.moveY = my;
  const v = h.body.velocity;
  const sp = st.speed * mul;
  // Blended, not written, so a brute's shove still reads for a few frames.
  h.body.velocity = new Vec2(lerp(v.x, mx * sp, 0.28), lerp(v.y, my * sp, 0.28));

  // Regen.
  if (st.regen > 0 && h.hp < h.maxHp) {
    h.regenAcc += st.regen * DT;
    if (h.regenAcc >= 1) { h.hp = Math.min(h.maxHp, h.hp + 1); h.regenAcc -= 1; }
  }

  // Contact damage — the strongest monster touching this frame lands one hit
  // per invulnerability window.
  if (h.iframes <= 0) {
    let best = null;
    for (const m of _monsters) {
      if (m.alive && m.touchFrame === _frame - 1 && (!best || m.def.dmg > best.def.dmg)) best = m;
    }
    if (best) hurtHero(best.def.dmg, best.body.position.x, best.body.position.y);
  }
}

// ── Monsters ──────────────────────────────────────────────────────────────
// r: physics radius, hp, speed (px/s), dmg on contact, xp gem value, mass is
// the material density (a brute at 4 barely notices a bat-sized impulse).
const MON = {
  bat:      { id: "bat",      name: "Bat",           r: 8,  hp: 6,    speed: 135, dmg: 3,  xp: 1,  mass: 0.6, color: "#a371f7", from: 0 },
  ghoul:    { id: "ghoul",    name: "Ghoul",         r: 12, hp: 18,   speed: 62,  dmg: 5,  xp: 1,  mass: 1,   color: "#5fbf73", from: 0 },
  skeleton: { id: "skeleton", name: "Skeleton",      r: 11, hp: 26,   speed: 96,  dmg: 6,  xp: 1,  mass: 1,   color: "#e6e1cf", from: 45 },
  spitter:  { id: "spitter",  name: "Spitter",       r: 12, hp: 34,   speed: 72,  dmg: 4,  xp: 3,  mass: 1.2, color: "#b5d334", from: 90, ranged: true },
  brute:    { id: "brute",    name: "Brute",         r: 22, hp: 170,  speed: 48,  dmg: 14, xp: 3,  mass: 4,   color: "#b0703a", from: 120 },
  wraith:   { id: "wraith",   name: "Wraith",        r: 10, hp: 40,   speed: 118, dmg: 8,  xp: 3,  mass: 0.8, color: "#7fe3f0", from: 165, ghost: true },
  knight:   { id: "knight",   name: "Grave Knight",  r: 20, hp: 750,  speed: 88,  dmg: 16, xp: 10, mass: 6,   color: "#8b93b8", from: 9999, elite: true },
  colossus: { id: "colossus", name: "Bone Colossus", r: 42, hp: 5200, speed: 56,  dmg: 25, xp: 30, mass: 40,  color: "#d9c9a3", from: 9999, boss: true },
};
// Spawn mix: weights by minute for the regular roster.
function spawnWeights(sec) {
  const w = [];
  const push = (id, wt) => { if (wt > 0 && sec >= MON[id].from) w.push([id, wt]); };
  push("bat", sec < 60 ? 5 : sec < 180 ? 3 : 2);
  push("ghoul", 5);
  push("skeleton", 4);
  push("spitter", 1.4);
  push("brute", sec < 200 ? 0.5 : 1);
  push("wraith", sec < 240 ? 0.8 : 1.4);
  return w;
}
function weightedPick(w) {
  let total = 0;
  for (const [, wt] of w) total += wt;
  let r = Math.random() * total;
  for (const [id, wt] of w) { r -= wt; if (r <= 0) return id; }
  return w[w.length - 1][0];
}

// Scripted moments on top of the trickle.
function scheduleEvents() {
  _events = [
    { at: 60 * 60,  kind: "ring",   id: "bat",      n: 36, text: "A CLOUD OF BATS" },
    { at: 90 * 60,  kind: "elite",  id: "knight",   n: 1,  text: "A GRAVE KNIGHT RISES" },
    { at: 150 * 60, kind: "ring",   id: "ghoul",    n: 44, text: "THE GRAVES OPEN" },
    { at: 180 * 60, kind: "elite",  id: "knight",   n: 1,  text: "ANOTHER KNIGHT" },
    { at: 210 * 60, kind: "wall",   id: "skeleton", n: 40, text: "A WALL OF BONE" },
    { at: 240 * 60, kind: "boss",   id: "colossus", n: 1,  text: "THE BONE COLOSSUS" },
    { at: 270 * 60, kind: "ring",   id: "wraith",   n: 24, text: "THE MIST SCREAMS" },
  ];
}

function spawnPoint(minD = 560, maxD = 660) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(minD, maxD);
    const x = heroX() + Math.cos(a) * d, y = heroY() + Math.sin(a) * d;
    if (x > 40 && x < WORLD_W - 40 && y > 40 && y < WORLD_H - 40) return { x, y };
  }
  // Cornered: anywhere far enough inside the arena.
  for (let i = 0; i < 20; i++) {
    const x = rand(60, WORLD_W - 60), y = rand(60, WORLD_H - 60);
    if (Math.hypot(x - heroX(), y - heroY()) > minD) return { x, y };
  }
  return { x: rand(60, WORLD_W - 60), y: rand(60, WORLD_H - 60) };
}

function spawnMonster(id, x, y) {
  const def = MON[id];
  if (!def) return null;
  x = clamp(x, def.r + 8, WORLD_W - def.r - 8);
  y = clamp(y, def.r + 8, WORLD_H - def.r - 8);
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const shape = new Circle(def.r, undefined, new Material(0.05, 0.2, 0.3, def.mass));
  shape.filter = def.ghost ? F_WRAITH() : F_MON();
  shape.cbTypes.add(_cbMon);
  body.shapes.add(shape);
  body.allowRotation = false;
  try { body.userData._hidden = true; body.userData._hidden3d = true; body.userData._colorIdx = def.boss ? 1 : def.elite ? 4 : 2; } catch (_) { /* frozen */ }
  body.space = _space;
  const m = {
    def, body, alive: true,
    hp: def.hp * (1 + Math.min(1.2, _clock / RUN_FRAMES) * 0.9),  // the night hardens
    face: 0, wobble: Math.random() * 6.28, seed: Math.random(),
    hitFlash: 0, touchFrame: -9, orbCd: 0,
    spitCd: 90 + randi(120),
    dash: 0, dashCd: 200, wind: 0, slamCd: 420, summonCd: 360,
    anim: Math.random() * 6.28,
  };
  m.maxHp = m.hp;
  _monsters.push(m);
  _monByBody.set(body, m);
  if (def.boss) _boss = m;
  if (def.elite) _elites.push(m);
  return m;
}

function killMonster(m, silent = false) {
  if (!m.alive) return;
  m.alive = false;
  if (m.body.space) m.body.space = null;
  _monByBody.delete(m.body);
  if (!silent) {
    _kills++;
    burst(m.body.position.x, m.body.position.y, m.def.boss ? 60 : m.def.elite ? 30 : 5, m.def.color, m.def.boss ? 4 : 2);
    dropGem(m.body.position.x, m.body.position.y, m.def.xp);
    dropPickup(m);
    if (m.def.elite || m.def.boss) {
      pushBanner(m.def.boss ? "THE COLOSSUS FALLS" : "KNIGHT SLAIN", "#ffd166", 150);
      _pickups.push({ kind: "chest", x: m.body.position.x, y: m.body.position.y, t: 0 });
      if (_runnerRef) _runnerRef.shakeCamera(m.def.boss ? 16 : 8, 0.5);
      if (m.def.boss) _boss = null;
    }
  }
}

function damageMonster(m, dmg, kx = 0, ky = 0, knock = 0, color = "#ffffff") {
  if (!m.alive) return;
  const real = Math.max(1, Math.round(dmg * _hero.stats.dmgMul * rand(0.9, 1.1)));
  m.hp -= real;
  m.hitFlash = 6;
  if (knock > 0 && !m.def.boss) {
    const k = knock / Math.sqrt(m.def.mass);
    m.body.applyImpulse(new Vec2(kx * k * m.body.mass, ky * k * m.body.mass));
  }
  if (_floaters.length < 36 || m.def.elite || m.def.boss) addFloater(m.body.position.x, m.body.position.y - m.def.r - 6, String(real), color, m.def.boss ? 1.2 : 0.85);
  if (m.hp <= 0) killMonster(m);
}

// Steering: a desired velocity blended into the body's own, so the crowd's
// contact impulses survive into the next frame and the horde flows.
function steer(m, tx, ty, mul = 1) {
  const p = m.body.position;
  const dx = tx - p.x, dy = ty - p.y, d = hyp(dx, dy);
  const sp = m.def.speed * mul;
  const v = m.body.velocity;
  m.body.velocity = new Vec2(lerp(v.x, (dx / d) * sp, 0.16), lerp(v.y, (dy / d) * sp, 0.16));
  m.face = Math.atan2(dy, dx);
}

function tickMonsters() {
  const hx = heroX(), hy = heroY();
  for (let i = _monsters.length - 1; i >= 0; i--) {
    const m = _monsters[i];
    if (!m.alive) { _monsters.splice(i, 1); continue; }
    if (m.hitFlash > 0) m.hitFlash--;
    if (m.orbCd > 0) m.orbCd--;
    m.anim += DT * (m.def.speed / 40 + 2);
    const p = m.body.position;
    const dx = hx - p.x, dy = hy - p.y, d = hyp(dx, dy);

    // Far strays are recycled to the spawn ring, so pressure never drops.
    if (d > 1150 && !m.def.elite && !m.def.boss) {
      const s = spawnPoint(560, 640);
      m.body.position = new Vec2(s.x, s.y);
      m.body.velocity = new Vec2(0, 0);
      continue;
    }

    const def = m.def;
    if (def.boss) { tickBoss(m, dx, dy, d); continue; }
    if (def.elite) { tickKnight(m, dx, dy, d); continue; }
    if (def.ranged) {
      // Keep a spitting distance, drift sideways a little, and spit.
      if (d > 250) steer(m, hx, hy);
      else if (d < 170) steer(m, p.x - dx, p.y - dy, 0.8);
      else {
        const side = Math.sin(_frame * 0.02 + m.wobble) > 0 ? 1 : -1;
        steer(m, p.x - dy * side, p.y + dx * side, 0.45);
        m.face = Math.atan2(dy, dx);
      }
      if (--m.spitCd <= 0 && d < 340) {
        m.spitCd = 140 + randi(60);
        spawnSpit(p.x, p.y, Math.atan2(dy, dx));
        m.hitFlash = 2;
      }
      continue;
    }
    if (def.id === "bat") {
      // Bats swoop — a sideways sine on top of the chase.
      const s = Math.sin(_frame * 0.09 + m.wobble) * 90;
      steer(m, hx - (dy / d) * s, hy + (dx / d) * s);
      continue;
    }
    steer(m, hx, hy);
  }
}

// The knight: walks at you, and every few seconds winds up and charges.
function tickKnight(m, dx, dy, d) {
  const p = m.body.position;
  if (m.dash > 0) {
    m.dash--;
    const a = m.face;
    m.body.velocity = new Vec2(Math.cos(a) * 520, Math.sin(a) * 520);
    if (m.dash % 3 === 0) _particles.push(particle(p.x, p.y, rand(-40, 40), rand(-40, 40), "#8b93b8", 18, 3));
    return;
  }
  if (m.wind > 0) {
    m.wind--;
    m.body.velocity = new Vec2(0, 0);
    m.face = Math.atan2(dy, dx);
    if (m.wind === 0) { m.dash = 22; }
    return;
  }
  if (--m.dashCd <= 0 && d < 420 && d > 90) { m.dashCd = 240 + randi(90); m.wind = 36; return; }
  steer(m, heroX(), heroY());
}

// The colossus: a slow walker with a charge, a ground slam that throws
// everything in reach — the crowd included — and skeleton summons.
function tickBoss(m, dx, dy, d) {
  const p = m.body.position;
  if (m.dash > 0) {
    m.dash--;
    const a = m.face;
    m.body.velocity = new Vec2(Math.cos(a) * 380, Math.sin(a) * 380);
    return;
  }
  if (m.wind > 0) {
    m.wind--;
    m.body.velocity = new Vec2(0, 0);
    if (m.wind === 0) {
      if (m.windKind === "slam") {
        slam(p.x, p.y, 230, 26, 420);
      } else {
        m.face = Math.atan2(dy, dx);
        m.dash = 40;
      }
    }
    return;
  }
  if (--m.slamCd <= 0 && d < 260) { m.slamCd = 420 + randi(120); m.wind = 48; m.windKind = "slam"; return; }
  if (--m.dashCd <= 0 && d < 520 && d > 160) { m.dashCd = 360 + randi(120); m.wind = 40; m.windKind = "dash"; return; }
  if (--m.summonCd <= 0) {
    m.summonCd = 480;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      spawnMonster("skeleton", p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70);
    }
    burst(p.x, p.y, 20, "#e6e1cf", 3);
  }
  steer(m, heroX(), heroY());
}

// A radial impulse from (x, y): the hero is thrown too, and hurt if close.
function slam(x, y, radius, dmg, kick) {
  _rings.push({ x, y, r: 10, max: radius, t: 0, T: 22, color: "#d9c9a3" });
  if (_runnerRef) _runnerRef.shakeCamera(14, 0.45);
  for (const m of _monsters) {
    if (!m.alive || m.def.boss) continue;
    const p = m.body.position;
    const dx = p.x - x, dy = p.y - y, dd = Math.hypot(dx, dy);
    if (dd < radius && dd > 1) {
      const k = kick * (1 - dd / radius) / Math.sqrt(m.def.mass) + 60;
      m.body.applyImpulse(new Vec2((dx / dd) * k * m.body.mass, (dy / dd) * k * m.body.mass));
    }
  }
  const hx = heroX() - x, hy = heroY() - y, hd = Math.hypot(hx, hy);
  if (hd < radius) {
    const k = kick * 0.9 * (1 - hd / radius) + 120;
    _hero.body.applyImpulse(new Vec2((hx / hd) * k * _hero.body.mass, (hy / hd) * k * _hero.body.mass));
    hurtHero(dmg);
  }
}

// ── Spit (monster projectiles) ────────────────────────────────────────────
function spawnSpit(x, y, angle) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16));
  const shape = new Circle(5);
  shape.sensorEnabled = true;
  shape.filter = F_SPIT();
  shape.cbTypes.add(_cbSpit);
  body.shapes.add(shape);
  body.velocity = new Vec2(Math.cos(angle) * 260, Math.sin(angle) * 260);
  try { body.userData._hidden = true; body.userData._hidden3d = true; } catch (_) { /* frozen */ }
  body.space = _space;
  _spits.push({ body, dmg: 8, life: 150, angle });
}
function killSpit(sp) {
  if (sp.body?.space) sp.body.space = null;
  sp.body = null;
}
function tickSpits() {
  for (let i = _spits.length - 1; i >= 0; i--) {
    const sp = _spits[i];
    if (sp.body && --sp.life <= 0) killSpit(sp);
    if (!sp.body) _spits.splice(i, 1);
  }
}

// ── XP gems and pickups ───────────────────────────────────────────────────
// Gems are plain records (hundreds of them, a distance check is all they
// need). Once too many lie about, the oldest far-away ones are merged into a
// single bigger gem, the way the genre does it.
function dropGem(x, y, xp) {
  _gems.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), xp, t: 0, vx: 0, vy: 0, pull: false, bob: Math.random() * 6.28 });
  if (_gems.length > 360) {
    let sum = 0, cx = 0, cy = 0, n = 0;
    const hx = heroX(), hy = heroY();
    for (let i = 0; i < _gems.length && n < 80; i++) {
      const g = _gems[i];
      if (Math.hypot(g.x - hx, g.y - hy) > 300) { sum += g.xp; cx += g.x; cy += g.y; n++; _gems.splice(i, 1); i--; }
    }
    if (n > 0) _gems.push({ x: cx / n, y: cy / n, xp: sum, t: 0, vx: 0, vy: 0, pull: false, bob: 0 });
  }
}
function gemTier(xp) { return xp >= 30 ? 3 : xp >= 8 ? 2 : xp >= 3 ? 1 : 0; }
const GEM_COLORS = ["#58a6ff", "#3fb950", "#f85149", "#ffd166"];

function dropPickup(m) {
  const r = Math.random();
  let kind = null;
  if (m.def.id === "ghoul" && r < 0.035) kind = "heart";
  else if (m.def.id === "brute" && r < 0.35) kind = "heart";
  else if (m.def.id === "spitter" && r < 0.08) kind = "magnet";
  else if (m.def.id === "wraith" && r < 0.06) kind = "bomb";
  else if (m.def.id === "skeleton" && r < 0.006) kind = "bomb";
  if (kind) _pickups.push({ kind, x: m.body.position.x, y: m.body.position.y, t: 0 });
}

function tickGems() {
  const hx = heroX(), hy = heroY();
  const mag = _hero.stats.magnet;
  for (let i = _gems.length - 1; i >= 0; i--) {
    const g = _gems[i];
    g.t++;
    const dx = hx - g.x, dy = hy - g.y, d = hyp(dx, dy);
    if (!g.pull && d < mag) g.pull = true;
    if (g.pull) {
      const sp = clamp(900 - d * 1.5, 380, 900);
      g.vx = lerp(g.vx, (dx / d) * sp, 0.2);
      g.vy = lerp(g.vy, (dy / d) * sp, 0.2);
      g.x += g.vx * DT; g.y += g.vy * DT;
      if (d < HERO_R + 6) {
        _gems.splice(i, 1);
        gainXp(g.xp);
      }
    }
  }
  for (let i = _pickups.length - 1; i >= 0; i--) {
    const p = _pickups[i];
    p.t++;
    if (Math.hypot(hx - p.x, hy - p.y) < HERO_R + 14) {
      _pickups.splice(i, 1);
      usePickup(p);
    }
  }
}

function usePickup(p) {
  const hx = heroX(), hy = heroY();
  if (p.kind === "heart") {
    const heal = Math.round(_hero.maxHp * 0.3);
    _hero.hp = Math.min(_hero.maxHp, _hero.hp + heal);
    addFloater(hx, hy - 24, `+${heal}`, C_HP, 1.1);
    burst(hx, hy, 10, "#ff6b6b", 2);
  } else if (p.kind === "magnet") {
    for (const g of _gems) g.pull = true;
    pushBanner("MAGNET", C_XP, 60);
    _rings.push({ x: hx, y: hy, r: 10, max: 700, t: 0, T: 30, color: C_XP });
  } else if (p.kind === "bomb") {
    _flash = 1;
    if (_runnerRef) _runnerRef.shakeCamera(14, 0.4);
    _rings.push({ x: hx, y: hy, r: 10, max: 520, t: 0, T: 26, color: "#ffd166" });
    for (const m of [..._monsters]) {
      if (!m.alive) continue;
      const q = m.body.position;
      const dx = q.x - hx, dy = q.y - hy, d = hyp(dx, dy);
      if (d < 520) damageMonster(m, m.def.boss ? 150 : m.def.elite ? 220 : 90, dx / d, dy / d, 260, "#ffd166");
    }
    pushBanner("BOOM", "#ffd166", 60);
  } else if (p.kind === "chest") {
    _levelUpQueue++;
    pushBanner("TREASURE", "#ffd166", 60);
  }
}

function gainXp(xp) {
  _hero.xp += xp;
  while (_hero.xp >= _hero.xpNext) {
    _hero.xp -= _hero.xpNext;
    _hero.level++;
    _hero.xpNext = xpFor(_hero.level);
    _levelUpQueue++;
  }
}

// ── Spawn director ────────────────────────────────────────────────────────
function tickSpawns() {
  const sec = _clock / 60;
  // Spawns per second: a trickle that climbs all night, with a final surge.
  let rate = 0.9 + sec / 60 * 1.5;
  if (sec > 240) rate *= 1.6;
  if (_monsters.length >= MAX_MON) rate = 0;
  _spawnAcc += rate * DT;
  const w = spawnWeights(sec);
  while (_spawnAcc >= 1 && _monsters.length < MAX_MON) {
    _spawnAcc -= 1;
    const s = spawnPoint();
    spawnMonster(weightedPick(w), s.x, s.y);
  }
  // Scripted events.
  while (_events.length && _events[0].at <= _clock) {
    const ev = _events.shift();
    if (ev.text) pushBanner(ev.text, ev.kind === "boss" ? "#f85149" : "#ffd166", 150);
    if (_runnerRef && ev.kind !== "ring") _runnerRef.shakeCamera(6, 0.3);
    const hx = heroX(), hy = heroY();
    if (ev.kind === "ring") {
      for (let i = 0; i < ev.n; i++) {
        const a = (i / ev.n) * Math.PI * 2;
        spawnMonster(ev.id, hx + Math.cos(a) * 520, hy + Math.sin(a) * 520);
      }
    } else if (ev.kind === "wall") {
      const side = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < ev.n; i++) {
        spawnMonster(ev.id, hx + side * 560, hy - 520 + i * (1040 / ev.n));
      }
    } else {
      const s = spawnPoint(480, 560);
      const m = spawnMonster(ev.id, s.x, s.y);
      if (m) burst(s.x, s.y, 30, m.def.color, 3);
    }
  }
}

// ── Weapons ───────────────────────────────────────────────────────────────
// Everything fires on its own. Each definition gives a name, a colour, a
// cooldown, and a per-level table; `fire` runs when the cooldown lapses.
const WEAPONS = {
  whip: {
    id: "whip", name: "Silver Whip", color: "#e6e1cf", glyph: "whip",
    desc: "Cracks an arc toward where you face. Lv3 strikes behind you too.",
    cd: (lv) => 46 - lv * 3,
    fire(w) {
      const lv = w.level;
      const range = (104 + lv * 8) * _hero.stats.area;
      const arc = 1.15;
      const dmg = 16 + lv * 5;
      // The whip turns toward the nearest monster in reach, so running away
      // still lashes whatever is on your heels; with nothing near it follows
      // your facing.
      let base = _hero.face;
      const near = nearestMonsters(1, range * 1.4)[0];
      if (near) base = Math.atan2(near.body.position.y - heroY(), near.body.position.x - heroX());
      const sides = lv >= 3 ? [0, Math.PI] : [0];
      for (const off of sides) {
        const a = base + off;
        _arcs.push({ x: heroX(), y: heroY(), a, arc, r: range, t: 0, T: 9, color: this.color });
        for (const m of _monsters) {
          if (!m.alive) continue;
          const p = m.body.position;
          const dx = p.x - heroX(), dy = p.y - heroY(), d = Math.hypot(dx, dy);
          if (d > range + m.def.r) continue;
          let da = Math.atan2(dy, dx) - a;
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > arc) continue;
          damageMonster(m, dmg, dx / (d || 1), dy / (d || 1), 170, this.color);
        }
      }
      _hero.attackFlash = true;
    },
  },
  wand: {
    id: "wand", name: "Moon Wand", color: "#79c0ff", glyph: "wand",
    desc: "A bolt at the nearest monster. Levels add bolts and piercing.",
    cd: (lv) => 66 - lv * 4,
    fire(w) {
      const lv = w.level;
      const n = 1 + Math.floor((lv - 1) / 2);
      const targets = nearestMonsters(n, 460);
      if (!targets.length) return;
      for (let i = 0; i < n; i++) {
        const t = targets[i % targets.length];
        const p = t.body.position;
        const a = Math.atan2(p.y - heroY(), p.x - heroX());
        spawnShot("wand", a, { speed: 520, dmg: 10 + lv * 3, pierce: 1 + Math.floor(lv / 2), r: 5, color: this.color, life: 90 });
      }
      _hero.attackFlash = true;
    },
  },
  knives: {
    id: "knives", name: "Throwing Knives", color: "#c9d1d9", glyph: "knife",
    desc: "A fan of knives the way you run. More knives every level.",
    cd: (lv) => 60 - lv * 3,
    fire(w) {
      const lv = w.level;
      const n = 2 + lv;
      const base = (_hero.moveX || _hero.moveY) ? Math.atan2(_hero.moveY, _hero.moveX) : _hero.face;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.09;
        spawnShot("knife", a, { speed: 660, dmg: 7 + lv * 2, pierce: lv >= 5 ? 1 : 0, r: 4, color: this.color, life: 70, delay: i * 2 });
      }
      _hero.attackFlash = true;
    },
  },
  aura: {
    id: "aura", name: "Garlic Ward", color: "#bde3a1", glyph: "ring",
    desc: "A ring around you that hurts and shoves everything it touches.",
    cd: () => 30,
    fire(w) {
      const lv = w.level;
      const r = (58 + lv * 9) * _hero.stats.area;
      w.radius = r;
      for (const m of _monsters) {
        if (!m.alive) continue;
        const p = m.body.position;
        const dx = p.x - heroX(), dy = p.y - heroY(), d = Math.hypot(dx, dy);
        if (d > r + m.def.r) continue;
        damageMonster(m, 4 + lv * 1.5, dx / (d || 1), dy / (d || 1), 120, this.color);
      }
      w.pulse = 1;
    },
  },
  orbs: {
    id: "orbs", name: "Spirit Orbs", color: "#d2a8ff", glyph: "orb",
    desc: "Orbs circle you and strike whatever they pass through.",
    cd: () => 1e9,
    fire() {},
    passiveTick(w) {
      const lv = w.level;
      const n = 1 + lv;
      while (_orbs.length < n) spawnOrb();
      while (_orbs.length > n) killOrb(_orbs.pop());
      const R = 74 + lv * 4;
      const spd = 2.6 + lv * 0.25;
      w.angle = (w.angle || 0) + spd * DT;
      for (let i = 0; i < _orbs.length; i++) {
        const o = _orbs[i];
        const a = w.angle + (i / n) * Math.PI * 2;
        const tx = heroX() + Math.cos(a) * R, ty = heroY() + Math.sin(a) * R;
        const p = o.body.position;
        // Kinematic: the velocity that lands the orb on its orbit point this step.
        o.body.velocity = new Vec2((tx - p.x) / DT, (ty - p.y) / DT);
        o.dmg = 8 + lv * 3;
      }
    },
  },
  storm: {
    id: "storm", name: "Storm Call", color: "#ffe066", glyph: "bolt",
    desc: "Lightning finds monsters near you. Lv3 chains to a neighbour.",
    cd: (lv) => 96 - lv * 6,
    fire(w) {
      const lv = w.level;
      const n = 1 + Math.floor(lv / 2);
      const pool = _monsters.filter((m) => m.alive && Math.hypot(m.body.position.x - heroX(), m.body.position.y - heroY()) < 300);
      if (!pool.length) return;
      for (let i = 0; i < n; i++) {
        const m = pick(pool);
        strike(m, 22 + lv * 6, lv >= 3 ? 1 : 0);
      }
    },
  },
};
const WEAPON_ORDER = ["whip", "wand", "knives", "aura", "orbs", "storm"];
const MAX_WLEVEL = 5;

const PASSIVES = {
  boots:  { id: "boots",  name: "Swift Boots",   color: "#7ee787", desc: "+8% move speed" },
  heart:  { id: "heart",  name: "Hollow Heart",  color: "#ff7b72", desc: "+15 max health" },
  magnet: { id: "magnet", name: "Lodestone",     color: "#79c0ff", desc: "+32 gem pickup range" },
  tome:   { id: "tome",   name: "Dusty Tome",    color: "#d2a8ff", desc: "−7% cooldowns" },
  fist:   { id: "fist",   name: "Iron Fist",     color: "#ffa657", desc: "+12% damage" },
  armor:  { id: "armor",  name: "Grave Plate",   color: "#8b949e", desc: "−1 damage taken" },
  clover: { id: "clover", name: "Clover",        color: "#3fb950", desc: "+0.5 health / second" },
  lens:   { id: "lens",   name: "Wide Lens",     color: "#ffd166", desc: "+10% weapon area" },
};
const MAX_PLEVEL = 5;

function addWeapon(id) {
  const w = _hero.weapons.find((x) => x.def.id === id);
  if (w) { w.level = Math.min(MAX_WLEVEL, w.level + 1); return w; }
  const nw = { def: WEAPONS[id], level: 1, cd: 20, pulse: 0, radius: 0, angle: 0 };
  _hero.weapons.push(nw);
  return nw;
}

function tickWeapons() {
  for (const w of _hero.weapons) {
    if (w.def.passiveTick) { w.def.passiveTick(w); continue; }
    w.pulse *= 0.9;
    if (--w.cd <= 0) {
      w.cd = Math.max(8, Math.round(w.def.cd(w.level) * _hero.stats.cdMul));
      w.def.fire(w);
    }
  }
}

function nearestMonsters(n, maxD) {
  const hx = heroX(), hy = heroY();
  const list = [];
  for (const m of _monsters) {
    if (!m.alive) continue;
    const d = Math.hypot(m.body.position.x - hx, m.body.position.y - hy);
    if (d < maxD) list.push([d, m]);
  }
  list.sort((a, b) => a[0] - b[0]);
  return list.slice(0, n).map((e) => e[1]);
}

// ── Hero projectiles (sensor bodies) ──────────────────────────────────────
function spawnShot(kind, angle, o) {
  const shot = { kind, body: null, angle, dmg: o.dmg, pierce: o.pierce, r: o.r, color: o.color, life: o.life, speed: o.speed, delay: o.delay || 0, hit: new Set() };
  if (shot.delay <= 0) armShot(shot);
  _shots.push(shot);
}
function armShot(shot) {
  const a = shot.angle;
  const body = new Body(BodyType.DYNAMIC, new Vec2(heroX() + Math.cos(a) * (HERO_R + 4), heroY() + Math.sin(a) * (HERO_R + 4)));
  const shape = new Circle(shot.r);
  shape.sensorEnabled = true;
  shape.filter = F_SHOT();
  shape.cbTypes.add(_cbShot);
  body.shapes.add(shape);
  body.velocity = new Vec2(Math.cos(a) * shot.speed, Math.sin(a) * shot.speed);
  try { body.userData._hidden = true; body.userData._hidden3d = true; } catch (_) { /* frozen */ }
  body.space = _space;
  shot.body = body;
  _hero.attackFlash = true;
}
function killShot(shot) {
  if (shot.body?.space) shot.body.space = null;
  shot.body = null;
  shot.done = true;
}
function onShotHit(shot, m) {
  if (shot.hit.has(m)) return;
  shot.hit.add(m);
  damageMonster(m, shot.dmg, Math.cos(shot.angle), Math.sin(shot.angle), shot.kind === "knife" ? 60 : 110, shot.color);
  _particles.push(particle(m.body.position.x, m.body.position.y, rand(-60, 60), rand(-60, 60), shot.color, 12, 2));
  if (shot.pierce-- <= 0) killShot(shot);
}
function tickShots() {
  for (let i = _shots.length - 1; i >= 0; i--) {
    const s = _shots[i];
    if (!s.body && !s.done) {
      if (--s.delay <= 0) armShot(s);
      continue;
    }
    if (s.body) {
      if (--s.life <= 0) killShot(s);
      else {
        const p = s.body.position;
        if (p.x < -20 || p.x > WORLD_W + 20 || p.y < -20 || p.y > WORLD_H + 20) killShot(s);
      }
    }
    if (s.done) _shots.splice(i, 1);
  }
}

// ── Orbs (kinematic sensor bodies) ────────────────────────────────────────
function spawnOrb() {
  const body = new Body(BodyType.KINEMATIC, new Vec2(heroX(), heroY() - 70));
  const shape = new Circle(9);
  shape.sensorEnabled = true;
  shape.filter = F_ORB();
  shape.cbTypes.add(_cbOrb);
  body.shapes.add(shape);
  try { body.userData._hidden = true; body.userData._hidden3d = true; } catch (_) { /* frozen */ }
  body.space = _space;
  _orbs.push({ body, dmg: 10, r: 9 });
}
function killOrb(o) {
  if (o?.body?.space) o.body.space = null;
}
function onOrbHit(orb, m) {
  if (m.orbCd > 0) return;
  m.orbCd = 18;
  const p = m.body.position;
  const dx = p.x - heroX(), dy = p.y - heroY(), d = hyp(dx, dy);
  damageMonster(m, orb.dmg, dx / d, dy / d, 150, WEAPONS.orbs.color);
}

// ── Lightning ─────────────────────────────────────────────────────────────
function strike(m, dmg, chain) {
  const p = m.body.position;
  const pts = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    pts.push({ x: p.x + (1 - k) * rand(-40, 40) * (i === 0 ? 0 : 1), y: p.y - (1 - k) * 260, z: (1 - k) * 260 });
  }
  pts[n] = { x: p.x, y: p.y, z: 0 };
  _bolts.push({ pts, t: 0, T: 10 });
  _flash = Math.max(_flash, 0.25);
  burst(p.x, p.y, 8, WEAPONS.storm.color, 3);
  damageMonster(m, dmg, 0, 0, 0, WEAPONS.storm.color);
  if (chain > 0) {
    let best = null, bd = 120;
    for (const o of _monsters) {
      if (!o.alive || o === m) continue;
      const d = Math.hypot(o.body.position.x - p.x, o.body.position.y - p.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (best) {
      _bolts.push({ pts: [{ x: p.x, y: p.y, z: 20 }, { x: (p.x + best.body.position.x) / 2 + rand(-20, 20), y: (p.y + best.body.position.y) / 2 + rand(-20, 20), z: 30 }, { x: best.body.position.x, y: best.body.position.y, z: 0 }], t: 0, T: 10 });
      damageMonster(best, dmg * 0.7, 0, 0, 0, WEAPONS.storm.color);
    }
  }
}

// ── Level-up cards ────────────────────────────────────────────────────────
function rollCards() {
  const options = [];
  const owned = _hero.weapons.map((w) => w.def.id);
  for (const id of WEAPON_ORDER) {
    const w = _hero.weapons.find((x) => x.def.id === id);
    if (w && w.level >= MAX_WLEVEL) continue;
    // New weapons get rarer once the belt is full-ish.
    const wt = w ? 3 : owned.length >= 4 ? 0.8 : 2.2;
    options.push({ kind: "weapon", id, wt });
  }
  for (const id of Object.keys(PASSIVES)) {
    const lv = _hero.passives[id] || 0;
    if (lv >= MAX_PLEVEL) continue;
    options.push({ kind: "passive", id, wt: lv ? 2 : 1.6 });
  }
  const out = [];
  while (out.length < 3 && options.length) {
    let total = 0;
    for (const o of options) total += o.wt;
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < options.length; idx++) { r -= options[idx].wt; if (r <= 0) break; }
    idx = Math.min(idx, options.length - 1);
    out.push(options.splice(idx, 1)[0]);
  }
  if (!out.length) out.push({ kind: "heal", id: "heal", wt: 1 });
  _cards = out.map((o) => {
    if (o.kind === "weapon") {
      const w = _hero.weapons.find((x) => x.def.id === o.id);
      return { ...o, title: WEAPONS[o.id].name, color: WEAPONS[o.id].color, sub: w ? `Level ${w.level + 1}` : "NEW WEAPON", desc: WEAPONS[o.id].desc };
    }
    if (o.kind === "passive") {
      const lv = _hero.passives[o.id] || 0;
      return { ...o, title: PASSIVES[o.id].name, color: PASSIVES[o.id].color, sub: lv ? `Level ${lv + 1}` : "NEW", desc: PASSIVES[o.id].desc };
    }
    return { ...o, title: "Bandage", color: C_HP, sub: "HEAL", desc: "Restore 30 health" };
  });
  _cardHover = -1;
}

function applyCard(c) {
  if (c.kind === "weapon") addWeapon(c.id);
  else if (c.kind === "passive") { _hero.passives[c.id] = (_hero.passives[c.id] || 0) + 1; recomputeStats(); }
  else _hero.hp = Math.min(_hero.maxHp, _hero.hp + 30);
  burst(heroX(), heroY(), 16, c.color, 3);
  _rings.push({ x: heroX(), y: heroY(), r: 10, max: 120, t: 0, T: 18, color: c.color });
}

function openLevelUp() {
  _phase = "levelup";
  _phaseT = 0;
  rollCards();
  if (_runnerRef) _runnerRef.physicsPaused = true;
}
function closeLevelUp() {
  _levelUpQueue = Math.max(0, _levelUpQueue - 1);
  if (_levelUpQueue > 0) { rollCards(); _phaseT = 0; return; }
  _phase = "play";
  if (_runnerRef) _runnerRef.physicsPaused = false;
}

// Card layout (screen space).
const CARD_W = 210, CARD_H = 250, CARD_GAP = 24;
function cardRect(i, n) {
  const total = n * CARD_W + (n - 1) * CARD_GAP;
  const x = VIEW_W / 2 - total / 2 + i * (CARD_W + CARD_GAP);
  return { x, y: VIEW_H / 2 - CARD_H / 2 + 14, w: CARD_W, h: CARD_H };
}
function cardAt(sx, sy) {
  for (let i = 0; i < _cards.length; i++) {
    const r = cardRect(i, _cards.length);
    if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return i;
  }
  return -1;
}

// ── Effects ───────────────────────────────────────────────────────────────
function particle(x, y, vx, vy, color, life, size) {
  return { x, y, vx, vy, color, life, T: life, size };
}
function burst(x, y, n, color, size = 2) {
  if (_particles.length > 500) return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rand(40, 200);
    _particles.push(particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 18 + randi(16), size * rand(0.6, 1.3)));
  }
}
function addFloater(x, y, text, color, scale = 1) {
  _floaters.push({ x, y, text, color, t: 0, T: 40, scale });
}
function pushBanner(text, color, frames) {
  if (!text) return;
  _banners.push({ text, color, t: 0, T: frames });
}
function tickEffects() {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x += p.vx * DT; p.y += p.vy * DT;
    p.vx *= 0.9; p.vy *= 0.9;
    if (--p.life <= 0) _particles.splice(i, 1);
  }
  for (let i = _floaters.length - 1; i >= 0; i--) {
    const f = _floaters[i];
    f.y -= 0.7;
    if (++f.t >= f.T) _floaters.splice(i, 1);
  }
  for (let i = _arcs.length - 1; i >= 0; i--) if (++_arcs[i].t >= _arcs[i].T) _arcs.splice(i, 1);
  for (let i = _bolts.length - 1; i >= 0; i--) if (++_bolts[i].t >= _bolts[i].T) _bolts.splice(i, 1);
  for (let i = _rings.length - 1; i >= 0; i--) {
    const r = _rings[i];
    r.t++;
    r.r = r.max * (1 - Math.pow(1 - r.t / r.T, 2));
    if (r.t >= r.T) _rings.splice(i, 1);
  }
  for (let i = _banners.length - 1; i >= 0; i--) if (++_banners[i].t >= _banners[i].T) _banners.splice(i, 1);
  _flash *= 0.86;
  if (_flash < 0.01) _flash = 0;
}

// ── Run lifecycle ─────────────────────────────────────────────────────────
function resetAll(space) {
  for (const m of _monsters) if (m.body.space) m.body.space = null;
  for (const s of _shots) if (s.body?.space) s.body.space = null;
  for (const s of _spits) if (s.body?.space) s.body.space = null;
  for (const o of _orbs) killOrb(o);
  if (_hero?.body?.space) _hero.body.space = null;
  _monsters = []; _monByBody = new Map(); _shots = []; _spits = []; _orbs = [];
  _gems = []; _pickups = []; _particles = []; _floaters = []; _arcs = []; _bolts = []; _rings = []; _banners = [];
  _kills = 0; _spawnAcc = 0; _boss = null; _elites = []; _cards = []; _levelUpQueue = 0; _flash = 0;
  _clock = 0;
  _hero = makeHero(space);
  recomputeStats();
  addWeapon("whip");
  scheduleEvents();
  _pointer.active = false;
  if (_runnerRef) _runnerRef.physicsPaused = false;
}

function startRun() {
  resetAll(_space);
  _phase = "play";
  _phaseT = 0;
  pushBanner("SURVIVE UNTIL DAWN", "#ffd166", 150);
  if (_runnerRef) _runnerRef.snapCamera();
}

function winRun() {
  _phase = "won";
  _phaseT = 0;
  _restartLockUntil = _frame + 90;
  _flash = 1;
  pushBanner("DAWN BREAKS", "#ffd166", 300);
  for (const m of [..._monsters]) killMonster(m, true);
  burst(heroX(), heroY(), 60, "#ffd166", 3);
}

function toTitle() {
  _phase = "title";
  _phaseT = 0;
  resetAll(_space);
  spawnTitleHorde();
}

// The title screen is not empty: a crowd mills about the hero at a distance,
// so the first thing you see is the night gathering.
function spawnTitleHorde() {
  const mix = ["bat", "bat", "ghoul", "ghoul", "ghoul", "skeleton", "skeleton", "spitter", "brute", "wraith"];
  for (let i = 0; i < 64; i++) {
    const a = Math.random() * Math.PI * 2, d = rand(230, 520);
    const m = spawnMonster(i === 0 ? "knight" : pick(mix), START_X + Math.cos(a) * d, START_Y + Math.sin(a) * d);
    if (m) { m.idleA = a; m.idleR = d; }
  }
}
function tickTitleHorde() {
  for (let i = _monsters.length - 1; i >= 0; i--) {
    const m = _monsters[i];
    if (!m.alive) { _monsters.splice(i, 1); continue; }
    m.anim += DT * 3;
    m.idleA = (m.idleA || 0) + DT * 0.12 * (m.seed > 0.5 ? 1 : -1);
    steer(m, START_X + Math.cos(m.idleA) * m.idleR, START_Y + Math.sin(m.idleA) * m.idleR, 0.45);
    if (Math.random() < 0.02) m.face = Math.atan2(START_Y - m.body.position.y, START_X - m.body.position.x);
  }
}

// Screen ↔ world. In 2D the camera is a plain offset; in 3D the tilted camera
// projects, so the overlay asks the three.js camera where a point landed.
function screenFromWorld(x, y, z = 0) {
  if (_mode3d && _camProj && _projTmp) {
    _projTmp.set(x, -y, z + GROUND_Z);
    _projTmp.project(_camProj);
    return { x: (_projTmp.x + 1) / 2 * VIEW_W, y: (1 - _projTmp.y) / 2 * VIEW_H, behind: _projTmp.z > 1 };
  }
  return { x: x - _viewCam.x, y: y - _viewCam.y, behind: false };
}

// ── Layout data shared by physics and every renderer ──────────────────────
const PLOTS = [
  { x0: 330, y0: 380, cols: 5, rows: 3 },
  { x0: 1780, y0: 380, cols: 5, rows: 3 },
  { x0: 330, y0: 1180, cols: 5, rows: 3 },
  { x0: 1780, y0: 1180, cols: 5, rows: 3 },
];

// ── Canvas2D ──────────────────────────────────────────────────────────────
function inView(x, y, pad = 40) {
  return x > _viewCam.x - pad && x < _viewCam.x + VIEW_W + pad && y > _viewCam.y - pad && y < _viewCam.y + VIEW_H + pad;
}

function drawGround2d(ctx) {
  ctx.fillStyle = C_GRASS;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // Plot beds.
  ctx.fillStyle = "rgba(60,45,30,0.35)";
  for (const p of PLOTS) ctx.fillRect(p.x0 - 60, p.y0 - 50, p.cols * 110 + 10, p.rows * 120 - 20);
  // Paths: a cross through the middle and a ring around the mausoleum.
  ctx.fillStyle = "rgba(90,80,60,0.28)";
  ctx.fillRect(WORLD_W / 2 - 50, 0, 100, WORLD_H);
  ctx.fillRect(0, WORLD_H * 0.62 - 40, WORLD_W, 80);
  ctx.strokeStyle = "rgba(90,80,60,0.28)";
  ctx.lineWidth = 60;
  ctx.beginPath();
  ctx.arc(WORLD_W / 2, WORLD_H * 0.30, 190, 0, Math.PI * 2);
  ctx.stroke();
  // Faint grid.
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  const gx0 = Math.floor(_viewCam.x / 100) * 100, gx1 = _viewCam.x + VIEW_W;
  const gy0 = Math.floor(_viewCam.y / 100) * 100, gy1 = _viewCam.y + VIEW_H;
  ctx.beginPath();
  for (let x = Math.max(0, gx0); x <= Math.min(WORLD_W, gx1); x += 100) { ctx.moveTo(x, Math.max(0, gy0)); ctx.lineTo(x, Math.min(WORLD_H, gy1)); }
  for (let y = Math.max(0, gy0); y <= Math.min(WORLD_H, gy1); y += 100) { ctx.moveTo(Math.max(0, gx0), y); ctx.lineTo(Math.min(WORLD_W, gx1), y); }
  ctx.stroke();
  // Tufts.
  for (const t of _tufts) {
    if (!inView(t.x, t.y, 10)) continue;
    ctx.fillStyle = t.k > 0.7 ? "rgba(120,160,110,0.18)" : t.k > 0.4 ? "rgba(0,0,0,0.18)" : "rgba(90,130,90,0.14)";
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fence.
  ctx.strokeStyle = "#3a4048";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= WORLD_W; x += 22) {
    if (x > _viewCam.x - 30 && x < _viewCam.x + VIEW_W + 30) {
      if (inView(x, 0, 30)) { ctx.moveTo(x, -8); ctx.lineTo(x, 8); }
      if (inView(x, WORLD_H, 30)) { ctx.moveTo(x, WORLD_H - 8); ctx.lineTo(x, WORLD_H + 8); }
    }
  }
  for (let y = 0; y <= WORLD_H; y += 22) {
    if (y > _viewCam.y - 30 && y < _viewCam.y + VIEW_H + 30) {
      if (inView(0, y, 30)) { ctx.moveTo(-8, y); ctx.lineTo(8, y); }
      if (inView(WORLD_W, y, 30)) { ctx.moveTo(WORLD_W - 8, y); ctx.lineTo(WORLD_W + 8, y); }
    }
  }
  ctx.stroke();
}

function drawObstacles2d(ctx) {
  for (const o of _obstacles) {
    if (!inView(o.x, o.y, 120)) continue;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.kind === "stone" || o.kind === "cross") {
      ctx.rotate(o.rot || 0);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-o.w / 2 - 3, -o.h / 2 + 6, o.w + 6, o.h + 4);
      ctx.fillStyle = "#6f7680";
      if (o.kind === "cross") {
        ctx.fillRect(-4, -o.tall, 8, o.tall + o.h / 2);
        ctx.fillRect(-o.w / 2, -o.tall + 8, o.w, 8);
      } else {
        ctx.beginPath();
        ctx.moveTo(-o.w / 2, o.h / 2);
        ctx.lineTo(-o.w / 2, -o.tall + o.w / 2);
        ctx.arc(0, -o.tall + o.w / 2, o.w / 2, Math.PI, 0);
        ctx.lineTo(o.w / 2, o.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(-o.w / 4, -o.tall + o.w / 2 + 4, o.w / 2, 3);
        ctx.fillRect(-o.w / 4, -o.tall + o.w / 2 + 10, o.w / 2, 3);
      }
    } else if (o.kind === "tree") {
      ctx.fillStyle = "#2a2320";
      ctx.beginPath();
      ctx.arc(0, 0, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3b3129";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      const rnd = srand(Math.floor(o.seed * 1e6));
      for (let i = 0; i < 5; i++) {
        const a = rnd() * Math.PI * 2, L = o.r * (2.2 + rnd() * 1.6);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * o.r * 0.6, Math.sin(a) * o.r * 0.6);
        ctx.quadraticCurveTo(Math.cos(a + 0.4) * L * 0.6, Math.sin(a + 0.4) * L * 0.6, Math.cos(a) * L, Math.sin(a) * L);
        ctx.stroke();
      }
    } else if (o.kind === "mausoleum") {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(-o.w / 2 - 6, -o.h / 2 + 8, o.w + 12, o.h + 8);
      ctx.fillStyle = "#4b525c";
      ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
      ctx.fillStyle = "#5c6470";
      ctx.fillRect(-o.w / 2 + 12, -o.h / 2 + 12, o.w - 24, o.h - 24);
      ctx.fillStyle = "#1a1d24";
      ctx.fillRect(-18, o.h / 2 - 34, 36, 34);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
    } else if (o.kind === "column") {
      ctx.fillStyle = "#7a8290";
      ctx.beginPath();
      ctx.arc(0, 0, o.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.kind === "lantern") {
      const flick = 0.85 + Math.sin(_frame * 0.21 + o.phase) * 0.08 + Math.sin(_frame * 0.53 + o.phase * 2) * 0.05;
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 150 * flick);
      g.addColorStop(0, "rgba(255,190,90,0.32)");
      g.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 150 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2f36";
      ctx.beginPath();
      ctx.arc(0, 0, o.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd28a";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawGems2d(ctx) {
  for (const g of _gems) {
    if (!inView(g.x, g.y, 20)) continue;
    const tier = gemTier(g.xp);
    const r = 4 + tier * 2;
    const bob = Math.sin(g.bob + _frame * 0.1) * 1.5;
    const y = g.y + bob;
    ctx.fillStyle = GEM_COLORS[tier];
    ctx.beginPath();
    ctx.moveTo(g.x, y - r);
    ctx.lineTo(g.x + r * 0.65, y);
    ctx.lineTo(g.x, y + r);
    ctx.lineTo(g.x - r * 0.65, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(g.x, y - r);
    ctx.lineTo(g.x + r * 0.65, y);
    ctx.lineTo(g.x, y);
    ctx.closePath();
    ctx.fill();
  }
  for (const p of _pickups) {
    if (!inView(p.x, p.y, 30)) continue;
    const bob = Math.sin(p.t * 0.1) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.kind === "heart") {
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(-4, -3, 5, 0, Math.PI * 2);
      ctx.arc(4, -3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8.5, -1); ctx.lineTo(0, 9); ctx.lineTo(8.5, -1);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === "magnet") {
      ctx.strokeStyle = C_XP;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -2, 7, Math.PI, 0);
      ctx.moveTo(-7, -2); ctx.lineTo(-7, 6);
      ctx.moveTo(7, -2); ctx.lineTo(7, 6);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-7, 6); ctx.moveTo(7, 3); ctx.lineTo(7, 6); ctx.stroke();
    } else if (p.kind === "bomb") {
      ctx.fillStyle = "#1f242c";
      ctx.beginPath(); ctx.arc(0, 2, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#c9d1d9"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(3, -6); ctx.quadraticCurveTo(8, -12, 12, -9); ctx.stroke();
      ctx.fillStyle = Math.floor(_frame / 6) % 2 ? "#ffd166" : "#ff8a3d";
      ctx.beginPath(); ctx.arc(12, -9, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === "chest") {
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(-12, -2, 24, 3);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
      ctx.strokeRect(-12, -8, 24, 16);
    }
    ctx.restore();
  }
}

function drawMonster2d(ctx, m) {
  const p = m.body.position;
  const def = m.def;
  const r = def.r;
  const flash = m.hitFlash > 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (def.ghost) ctx.globalAlpha = 0.65 + Math.sin(_frame * 0.15 + m.wobble) * 0.15;
  // Wind-up: the whole body shudders and glows red.
  if (m.wind > 0) {
    ctx.translate(rand(-2, 2), rand(-2, 2));
    ctx.fillStyle = "rgba(248,81,73,0.25)";
    ctx.beginPath(); ctx.arc(0, 0, r + 10, 0, Math.PI * 2); ctx.fill();
  }
  // Shadow.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.9, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
  // Bat wings.
  if (def.id === "bat") {
    const flap = Math.sin(m.anim * 4) * 0.5;
    ctx.fillStyle = flash ? "#ffffff" : "#6b4fb0";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.5, 0);
      ctx.lineTo(s * r * 2.2, -r * (0.8 + flap));
      ctx.lineTo(s * r * 1.5, r * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.fillStyle = flash ? "#ffffff" : def.color;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  if (def.elite || def.boss) {
    ctx.strokeStyle = def.boss ? "#f85149" : "#ffd166";
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Eyes toward the hero.
  const ex = Math.cos(m.face) * r * 0.45, ey = Math.sin(m.face) * r * 0.45;
  const px = -Math.sin(m.face) * r * 0.32, py = Math.cos(m.face) * r * 0.32;
  ctx.fillStyle = def.id === "skeleton" || def.boss ? "#1a1d24" : def.ghost ? "#ffffff" : "#ff5a5a";
  const er = Math.max(1.5, r * 0.16);
  ctx.beginPath(); ctx.arc(ex + px, ey + py, er, 0, Math.PI * 2); ctx.arc(ex - px, ey - py, er, 0, Math.PI * 2); ctx.fill();
  // Brute tusks / knight helmet plume / boss crown.
  if (def.id === "brute") {
    ctx.fillStyle = "#f0e6d2";
    ctx.beginPath(); ctx.moveTo(ex + px * 1.6, ey + py * 1.6); ctx.lineTo(ex * 1.7, ey * 1.7); ctx.lineTo(ex - px * 1.6, ey - py * 1.6); ctx.closePath(); ctx.fill();
  }
  if (def.elite) {
    ctx.strokeStyle = "#f85149"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-ex * 0.5, -ey * 0.5); ctx.lineTo(-ex * 1.6, -ey * 1.6); ctx.stroke();
  }
  if (def.boss) {
    ctx.fillStyle = "#ffd166";
    for (let i = 0; i < 5; i++) {
      const a = m.face + Math.PI + (i - 2) * 0.35;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawHero2d(ctx) {
  const h = _hero;
  const p = h.body.position;
  // Lantern glow.
  const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 130);
  g.addColorStop(0, "rgba(255,200,120,0.22)");
  g.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, 130, 0, Math.PI * 2); ctx.fill();
  // Ward ring.
  const aura = h.weapons.find((w) => w.def.id === "aura");
  if (aura && aura.radius) {
    ctx.fillStyle = `rgba(189,227,161,${0.08 + aura.pulse * 0.18})`;
    ctx.strokeStyle = `rgba(189,227,161,${0.35 + aura.pulse * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, aura.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  if (h.iframes > 0 && Math.floor(_frame / 3) % 2) ctx.globalAlpha = 0.45;
  if (h.hp <= 0) { ctx.globalAlpha = Math.max(0, 1 - _phaseT / 60); ctx.rotate(Math.min(1.5, _phaseT * 0.05)); }
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(0, HERO_R * 0.55, HERO_R, HERO_R * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  // Coat.
  ctx.fillStyle = h.hitFlash ? "#ffffff" : "#8a1e2a";
  ctx.beginPath(); ctx.arc(0, 0, HERO_R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#f0c0c0"; ctx.lineWidth = 1.5; ctx.stroke();
  // Hat brim + crown, offset back from the facing direction.
  ctx.fillStyle = "#15171c";
  ctx.beginPath(); ctx.arc(-Math.cos(h.face) * 3, -Math.sin(h.face) * 3, HERO_R * 0.62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#22252c";
  ctx.beginPath(); ctx.arc(-Math.cos(h.face) * 3, -Math.sin(h.face) * 3, HERO_R * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(-Math.cos(h.face) * 3 - 2, -Math.sin(h.face) * 3 - 2, 4, 4);
  // Facing mark.
  ctx.fillStyle = "#ffe0b0";
  ctx.beginPath();
  ctx.arc(Math.cos(h.face) * HERO_R * 0.75, Math.sin(h.face) * HERO_R * 0.75, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProjectiles2d(ctx) {
  for (const s of _shots) {
    if (!s.body) continue;
    const p = s.body.position;
    if (s.kind === "wand") {
      ctx.strokeStyle = "rgba(121,192,255,0.45)";
      ctx.lineWidth = s.r * 1.4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(s.angle) * 22, p.y - Math.sin(s.angle) * 22); ctx.stroke();
      ctx.fillStyle = "#dff3ff";
      ctx.beginPath(); ctx.arc(p.x, p.y, s.r, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(s.angle);
      ctx.fillStyle = "#e6edf3";
      ctx.fillRect(-10, -1.5, 16, 3);
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(-14, -2, 5, 4);
      ctx.restore();
    }
  }
  for (const sp of _spits) {
    if (!sp.body) continue;
    const p = sp.body.position;
    ctx.fillStyle = "#b5d334";
    ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(181,211,52,0.35)";
    ctx.beginPath(); ctx.arc(p.x - Math.cos(sp.angle) * 7, p.y - Math.sin(sp.angle) * 7, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const o of _orbs) {
    const p = o.body.position;
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 20);
    g.addColorStop(0, "rgba(210,168,255,0.55)");
    g.addColorStop(1, "rgba(210,168,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2e6ff";
    ctx.beginPath(); ctx.arc(p.x, p.y, o.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEffects2d(ctx) {
  for (const a of _arcs) {
    const k = 1 - a.t / a.T;
    ctx.fillStyle = `rgba(230,225,207,${0.35 * k})`;
    ctx.strokeStyle = `rgba(255,255,255,${0.8 * k})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.arc(a.x, a.y, a.r * (0.7 + 0.3 * (1 - k)), a.a - a.arc, a.a + a.arc);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (const b of _bolts) {
    const k = 1 - b.t / b.T;
    ctx.strokeStyle = `rgba(255,224,102,${k})`;
    ctx.lineWidth = 3 * k + 1;
    ctx.lineJoin = "round";
    ctx.beginPath();
    b.pts.forEach((q, i) => { const y = q.y - q.z * 0.2; if (i === 0) ctx.moveTo(q.x, y); else ctx.lineTo(q.x, y); });
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${k * 0.8})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const r of _rings) {
    const k = 1 - r.t / r.T;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = k * 0.8;
    ctx.lineWidth = 3 + 6 * k;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of _particles) {
    ctx.globalAlpha = p.life / p.T;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ── Overlay (every renderer) ──────────────────────────────────────────────
function drawWorldCues(ctx) {
  // Floaters.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of _floaters) {
    const s = screenFromWorld(f.x, f.y, 20);
    if (s.behind) continue;
    const k = 1 - f.t / f.T;
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.font = `bold ${Math.round(12 * f.scale)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(f.text, s.x + 1, s.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;
  // Elite HP bars.
  for (const m of _monsters) {
    if (!m.alive || !m.def.elite) continue;
    const s = screenFromWorld(m.body.position.x, m.body.position.y - m.def.r - 8, m.def.r * 2);
    if (s.behind) continue;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(s.x - 22, s.y - 3, 44, 6);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(s.x - 21, s.y - 2, 42 * clamp(m.hp / m.maxHp, 0, 1), 4);
  }
  // Hero HP under the feet.
  if (_hero && _phase !== "title") {
    const s = screenFromWorld(heroX(), heroY() + HERO_R + 8, 0);
    if (!s.behind) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(s.x - 18, s.y - 3, 36, 6);
      ctx.fillStyle = _hero.hp / _hero.maxHp < 0.3 ? "#f85149" : C_HP;
      ctx.fillRect(s.x - 17, s.y - 2, 34 * clamp(_hero.hp / _hero.maxHp, 0, 1), 4);
    }
  }
}

function glyph(ctx, kind, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  ctx.beginPath();
  if (kind === "whip") { ctx.moveTo(-s, s * 0.6); ctx.quadraticCurveTo(-s * 0.2, -s, s * 0.3, -s * 0.2); ctx.quadraticCurveTo(s * 0.8, s * 0.4, s, -s * 0.5); ctx.stroke(); }
  else if (kind === "wand") { ctx.moveTo(-s * 0.8, s * 0.8); ctx.lineTo(s * 0.4, -s * 0.4); ctx.stroke(); ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.55, s * 0.32, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === "knife") { ctx.moveTo(-s * 0.9, s * 0.9); ctx.lineTo(s * 0.7, -s * 0.7); ctx.stroke(); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-s * 0.9, s * 0.9); ctx.lineTo(-s * 0.4, s * 0.4); ctx.stroke(); }
  else if (kind === "ring") { ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2); ctx.fill(); }
  else if (kind === "orb") { ctx.arc(-s * 0.4, s * 0.2, s * 0.32, 0, Math.PI * 2); ctx.arc(s * 0.45, -s * 0.3, s * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, s * 0.8, -1.2, 1.6); ctx.stroke(); }
  else if (kind === "bolt") { ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.4, s * 0.05); ctx.lineTo(s * 0.15, s * 0.05); ctx.lineTo(-s * 0.2, s); ctx.stroke(); }
  ctx.restore();
}

function drawHUD(ctx) {
  if (_phase === "title") return;
  // XP bar along the top.
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(0, 0, VIEW_W, 18);
  ctx.fillStyle = "rgba(88,166,255,0.25)";
  ctx.fillRect(2, 2, VIEW_W - 4, 14);
  ctx.fillStyle = C_XP;
  ctx.fillRect(2, 2, (VIEW_W - 4) * clamp(_hero.xp / _hero.xpNext, 0, 1), 14);
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`LV ${_hero.level}`, VIEW_W - 8, 9);
  // Timer.
  ctx.textAlign = "center";
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillText(fmtTime(_clock), VIEW_W / 2 + 1, 38);
  ctx.fillStyle = _clock > RUN_FRAMES - 30 * 60 ? "#ffd166" : "#ffffff";
  ctx.fillText(fmtTime(_clock), VIEW_W / 2, 37);
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("dawn at 5:00", VIEW_W / 2, 54);
  // Kills.
  ctx.textAlign = "right";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`☠ ${_kills}`, VIEW_W - 12, 34);
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(`${_monsters.length} on the field`, VIEW_W - 12, 50);
  // Boss bar.
  if (_boss && _boss.alive) {
    const w = 320, x0 = VIEW_W / 2 - w / 2, y0 = 62;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x0, y0, w, 10);
    ctx.fillStyle = "#f85149";
    ctx.fillRect(x0 + 1, y0 + 1, (w - 2) * clamp(_boss.hp / _boss.maxHp, 0, 1), 8);
    ctx.textAlign = "center";
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillStyle = "#ffd6d6";
    ctx.fillText(_boss.def.name.toUpperCase(), VIEW_W / 2, y0 + 20);
  }
  // Health — bottom left.
  const hx = 14, hy = VIEW_H - 30;
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(hx - 4, hy - 4, 208, 22);
  ctx.fillStyle = "rgba(63,185,80,0.2)";
  ctx.fillRect(hx, hy, 200, 14);
  ctx.fillStyle = _hero.hp / _hero.maxHp < 0.3 ? "#f85149" : C_HP;
  ctx.fillRect(hx, hy, 200 * clamp(_hero.hp / _hero.maxHp, 0, 1), 14);
  ctx.textAlign = "center";
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${Math.ceil(_hero.hp)} / ${_hero.maxHp}`, hx + 100, hy + 7);
  // Weapon belt above it.
  let bx = hx;
  const by = hy - 34;
  for (const w of _hero.weapons) {
    ctx.fillStyle = "rgba(13,17,23,0.85)";
    ctx.fillRect(bx, by, 28, 28);
    ctx.strokeStyle = w.def.color; ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, by + 0.5, 27, 27);
    glyph(ctx, w.def.glyph, bx + 14, by + 12, 7, w.def.color);
    ctx.fillStyle = w.def.color;
    for (let i = 0; i < w.level; i++) ctx.fillRect(bx + 3 + i * 5, by + 23, 4, 2);
    bx += 32;
  }
  // Passive dots.
  let px = hx;
  for (const id of Object.keys(_hero.passives)) {
    const lv = _hero.passives[id];
    ctx.fillStyle = PASSIVES[id].color;
    ctx.beginPath(); ctx.arc(px + 5, by - 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(lv), px + 11, by - 8);
    px += 22;
  }
  // Touch hint early on.
  if (_isTouch && _phase === "play" && _clock < 360) {
    ctx.textAlign = "center";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("hold anywhere to steer", VIEW_W / 2, VIEW_H - 22);
  }
}

function drawTitle(ctx) {
  ctx.fillStyle = "rgba(5,8,14,0.72)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 54px system-ui, sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText("SWARM NIGHT", VIEW_W / 2 + 3, 128);
  ctx.fillStyle = "#e6edf3";
  ctx.fillText("SWARM NIGHT", VIEW_W / 2, 125);
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "#ffd166";
  ctx.fillText("Survive five minutes in the graveyard. Your weapons fire on their own — you only run.", VIEW_W / 2, 172);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "13px system-ui, sans-serif";
  const lines = _isTouch
    ? ["Hold anywhere to steer.", "Collect the gems monsters drop. A full bar offers three upgrades — tap one.", "Grave knights carry treasure. Dawn at 5:00 is the win."]
    : ["WASD / arrows to move.", "Collect the gems monsters drop. A full bar offers three upgrades — click or press 1 / 2 / 3.", "Grave knights carry treasure. Dawn at 5:00 is the win."];
  lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, 212 + i * 22));
  // Weapon roster.
  const ids = WEAPON_ORDER;
  const w0 = VIEW_W / 2 - (ids.length * 96) / 2;
  ids.forEach((id, i) => {
    const d = WEAPONS[id];
    const x = w0 + i * 96 + 48;
    glyph(ctx, d.glyph, x, 312, 12, d.color);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(d.name, x, 336);
  });
  if (Math.floor(_frame / 30) % 2 === 0) {
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(_isTouch ? "TAP TO BEGIN" : "PRESS SPACE TO BEGIN", VIEW_W / 2, 410);
  }
}

function drawLevelUp(ctx) {
  ctx.fillStyle = "rgba(5,8,14,0.7)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const pop = Math.min(1, _phaseT / 10);
  ctx.font = `bold ${Math.round(30 * pop)}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffd166";
  ctx.fillText(_levelUpQueue > 1 || _cards.some((c) => c.kind === "heal") ? "CHOOSE" : `LEVEL ${_hero.level}`, VIEW_W / 2, 74);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(_isTouch ? "tap a card" : "click a card or press 1 / 2 / 3", VIEW_W / 2, 100);
  _cards.forEach((c, i) => {
    const r = cardRect(i, _cards.length);
    const hot = _cardHover === i;
    const lift = hot ? -8 : 0;
    const y = r.y + lift + (1 - pop) * 60;
    ctx.fillStyle = hot ? "rgba(30,36,48,0.98)" : "rgba(20,24,32,0.95)";
    ctx.fillRect(r.x, y, r.w, r.h);
    ctx.strokeStyle = c.color; ctx.lineWidth = hot ? 3 : 1.5;
    ctx.strokeRect(r.x + 0.5, y + 0.5, r.w - 1, r.h - 1);
    ctx.fillStyle = c.color;
    ctx.fillRect(r.x, y, r.w, 5);
    // Icon.
    if (c.kind === "weapon") glyph(ctx, WEAPONS[c.id].glyph, r.x + r.w / 2, y + 62, 22, c.color);
    else {
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(r.x + r.w / 2, y + 62, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0d1117";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText(c.kind === "heal" ? "+" : "▲", r.x + r.w / 2, y + 63);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(c.title, r.x + r.w / 2, y + 112);
    ctx.fillStyle = c.color;
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText(c.sub, r.x + r.w / 2, y + 132);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "12px system-ui, sans-serif";
    wrapText(ctx, c.desc, r.x + r.w / 2, y + 162, r.w - 28, 16);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText(String(i + 1), r.x + r.w / 2, y + r.h - 16);
  });
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

function drawEnd(ctx) {
  const k = Math.min(1, _phaseT / 40);
  ctx.fillStyle = `rgba(5,8,14,${0.7 * k})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (_phaseT < 30) return;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const won = _phase === "won";
  ctx.font = "bold 46px system-ui, sans-serif";
  ctx.fillStyle = won ? "#ffd166" : "#ff6b6b";
  ctx.fillText(won ? "DAWN BREAKS" : "THE NIGHT TAKES YOU", VIEW_W / 2, 150);
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(won ? "You outlasted the swarm." : `You lasted ${fmtTime(_clock)}.`, VIEW_W / 2, 196);
  const stats = [["Kills", String(_kills)], ["Level", String(_hero.level)], ["Weapons", String(_hero.weapons.length)]];
  stats.forEach(([label, val], i) => {
    const x = VIEW_W / 2 + (i - 1) * 150;
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(val, x, 258);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(label.toUpperCase(), x, 282);
  });
  if (_frame >= _restartLockUntil && Math.floor(_frame / 30) % 2 === 0) {
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(_isTouch ? "TAP TO PLAY AGAIN" : "SPACE TO PLAY AGAIN", VIEW_W / 2, 360);
  }
}

function drawBanners(ctx) {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  let y = VIEW_H * 0.3;
  for (const b of _banners) {
    const k = b.t < 12 ? b.t / 12 : b.t > b.T - 20 ? (b.T - b.t) / 20 : 1;
    ctx.globalAlpha = clamp(k, 0, 1);
    ctx.font = `bold ${Math.round(22 + (1 - Math.min(1, b.t / 12)) * 10)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillText(b.text, VIEW_W / 2 + 2, y + 2);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, VIEW_W / 2, y);
    y += 34;
  }
  ctx.globalAlpha = 1;
}

// ── PixiJS ────────────────────────────────────────────────────────────────
let _pixiApp = null, _pixiDyn = null;
function ensurePixiLayers(PIXI, app) {
  if (_pixiApp === app && _pixiDyn?.parent === app.stage) return;
  if (_pixiDyn?.parent) _pixiDyn.parent.removeChild(_pixiDyn);
  _pixiApp = app;
  _pixiDyn = new PIXI.Graphics();
  app.stage.addChild(_pixiDyn);
}
function drawPixiDynamic(g) {
  g.clear();
  g.rect(0, 0, WORLD_W, WORLD_H).fill({ color: cssHexInt(C_GRASS) }).stroke({ color: 0x3a4048, width: 4 });
  for (const p of PLOTS) g.rect(p.x0 - 60, p.y0 - 50, p.cols * 110 + 10, p.rows * 120 - 20).fill({ color: 0x3c2d1e, alpha: 0.35 });
  g.rect(WORLD_W / 2 - 50, 0, 100, WORLD_H).fill({ color: 0x5a503c, alpha: 0.28 });
  g.rect(0, WORLD_H * 0.62 - 40, WORLD_W, 80).fill({ color: 0x5a503c, alpha: 0.28 });
  for (const o of _obstacles) {
    if (!inView(o.x, o.y, 120)) continue;
    if (o.kind === "stone" || o.kind === "cross") g.rect(o.x - o.w / 2, o.y - o.tall + 4, o.w, o.tall + o.h / 2 - 4).fill({ color: 0x6f7680 });
    else if (o.kind === "tree") g.circle(o.x, o.y, o.r).fill({ color: 0x2a2320 });
    else if (o.kind === "mausoleum") g.rect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h).fill({ color: 0x4b525c }).stroke({ color: 0xffffff, alpha: 0.12, width: 2 });
    else if (o.kind === "column") g.circle(o.x, o.y, o.r).fill({ color: 0x7a8290 });
    else if (o.kind === "lantern") { g.circle(o.x, o.y, 120).fill({ color: 0xffbe5a, alpha: 0.12 }); g.circle(o.x, o.y, o.r).fill({ color: 0x2b2f36 }); g.circle(o.x, o.y, 3).fill({ color: 0xffd28a }); }
  }
  if (!_hero) return;
  const hp = _hero.body.position;
  g.circle(hp.x, hp.y, 130).fill({ color: 0xffc878, alpha: 0.12 });
  const aura = _hero.weapons.find((w) => w.def.id === "aura");
  if (aura && aura.radius) g.circle(hp.x, hp.y, aura.radius).fill({ color: 0xbde3a1, alpha: 0.08 + aura.pulse * 0.18 }).stroke({ color: 0xbde3a1, alpha: 0.5, width: 2 });
  for (const gm of _gems) {
    if (!inView(gm.x, gm.y, 20)) continue;
    const tier = gemTier(gm.xp), r = 4 + tier * 2;
    g.poly([gm.x, gm.y - r, gm.x + r * 0.65, gm.y, gm.x, gm.y + r, gm.x - r * 0.65, gm.y], true).fill({ color: cssHexInt(GEM_COLORS[tier]) });
  }
  for (const p of _pickups) {
    const col = p.kind === "heart" ? 0xff6b6b : p.kind === "magnet" ? 0x58a6ff : p.kind === "bomb" ? 0x1f242c : 0xffd166;
    g.circle(p.x, p.y, 9).fill({ color: col }).stroke({ color: 0xffffff, alpha: 0.6, width: 1.5 });
  }
  for (const m of _monsters) {
    if (!m.alive) continue;
    const p = m.body.position;
    if (!inView(p.x, p.y, 60)) continue;
    const col = m.hitFlash > 0 ? 0xffffff : cssHexInt(m.def.color);
    g.circle(p.x, p.y, m.def.r).fill({ color: col, alpha: m.def.ghost ? 0.7 : 1 })
      .stroke({ color: m.def.boss ? 0xf85149 : m.def.elite ? 0xffd166 : 0x000000, alpha: m.def.elite || m.def.boss ? 1 : 0.35, width: m.def.elite || m.def.boss ? 3 : 1.5 });
    const ex = p.x + Math.cos(m.face) * m.def.r * 0.45, ey = p.y + Math.sin(m.face) * m.def.r * 0.45;
    const px = -Math.sin(m.face) * m.def.r * 0.32, py = Math.cos(m.face) * m.def.r * 0.32;
    g.circle(ex + px, ey + py, 1.8).circle(ex - px, ey - py, 1.8).fill({ color: 0xff5a5a });
  }
  g.circle(hp.x, hp.y, HERO_R).fill({ color: _hero.hitFlash ? 0xffffff : 0x8a1e2a }).stroke({ color: 0xf0c0c0, width: 1.5 });
  g.circle(hp.x - Math.cos(_hero.face) * 3, hp.y - Math.sin(_hero.face) * 3, HERO_R * 0.62).fill({ color: 0x15171c });
  g.circle(hp.x + Math.cos(_hero.face) * HERO_R * 0.75, hp.y + Math.sin(_hero.face) * HERO_R * 0.75, 3).fill({ color: 0xffe0b0 });
  for (const s of _shots) {
    if (!s.body) continue;
    const p = s.body.position;
    if (s.kind === "wand") g.circle(p.x, p.y, s.r).fill({ color: 0xdff3ff });
    else g.moveTo(p.x - Math.cos(s.angle) * 12, p.y - Math.sin(s.angle) * 12).lineTo(p.x + Math.cos(s.angle) * 5, p.y + Math.sin(s.angle) * 5).stroke({ color: 0xe6edf3, width: 3 });
  }
  for (const sp of _spits) { if (sp.body) g.circle(sp.body.position.x, sp.body.position.y, 5).fill({ color: 0xb5d334 }); }
  for (const o of _orbs) { const p = o.body.position; g.circle(p.x, p.y, 18).fill({ color: 0xd2a8ff, alpha: 0.25 }); g.circle(p.x, p.y, o.r * 0.7).fill({ color: 0xf2e6ff }); }
  for (const a of _arcs) {
    const k = 1 - a.t / a.T;
    g.moveTo(a.x, a.y).arc(a.x, a.y, a.r, a.a - a.arc, a.a + a.arc).lineTo(a.x, a.y).fill({ color: 0xe6e1cf, alpha: 0.35 * k });
  }
  for (const b of _bolts) {
    const k = 1 - b.t / b.T;
    b.pts.forEach((q, i) => { const y = q.y - q.z * 0.2; if (i === 0) g.moveTo(q.x, y); else g.lineTo(q.x, y); });
    g.stroke({ color: 0xffe066, alpha: k, width: 3 });
  }
  for (const r of _rings) g.circle(r.x, r.y, r.r).stroke({ color: cssHexInt(r.color), alpha: (1 - r.t / r.T) * 0.8, width: 4 });
  for (const p of _particles) g.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size).fill({ color: cssHexInt(p.color), alpha: p.life / p.T });
}

// ── 3D ────────────────────────────────────────────────────────────────────
let _THREE = null;
let _scene3d = null;
let _projTmp = null;
const GROUND_Z = 1;
let _env = null;
let _heroFig = null;
let _rigs = null;              // monster type → { parts: [{ mesh, spec }], cap, count }
let _geos = null;
let _shadowIM = null;
let _gemIM = null;
let _boltIM = null, _knifeIM = null, _spitIM = null, _partIM = null;
let _orbMeshes = [];
let _aura = null;
let _arcPool = [], _ringPool = [], _warnPool = [], _linePool = [];
let _flashLight = null;
let _pickupMeshes = new Map();
let _dummy = null, _rootM = null, _partM = null, _colTmp = null;

function ensureScene(adapter, scene) {
  if (_scene3d === scene) return;
  const T = _THREE;
  _scene3d = scene;
  _env = null; _heroFig = null; _rigs = null; _shadowIM = null; _gemIM = null;
  _boltIM = null; _knifeIM = null; _spitIM = null; _partIM = null;
  _orbMeshes = []; _aura = null; _arcPool = []; _ringPool = []; _warnPool = []; _linePool = [];
  _flashLight = null; _pickupMeshes = new Map();
  _projTmp = new T.Vector3();
  _dummy = new T.Object3D();
  _rootM = new T.Matrix4();
  _partM = new T.Matrix4();
  _colTmp = new T.Color();
  _geos = {
    box: new T.BoxGeometry(1, 1, 1),
    hang: new T.BoxGeometry(1, 1, 1).translate(0, 0, -0.5),
    wing: new T.BoxGeometry(1, 1, 1).translate(0.5, 0, 0),
    sph: new T.SphereGeometry(1, 8, 6),
    cone: new T.ConeGeometry(1, 1, 8).rotateX(Math.PI / 2),
    coneDown: new T.ConeGeometry(1, 1, 8).rotateX(-Math.PI / 2),
    cyl: new T.CylinderGeometry(1, 1, 1, 8).rotateX(Math.PI / 2),
    disc: new T.CircleGeometry(1, 20),
    ring: new T.RingGeometry(0.86, 1, 48),
    sector: new T.RingGeometry(0.12, 1, 24, 1, -1.15, 2.3),
    gem: new T.OctahedronGeometry(1, 0),
  };
  scene.background = new T.Color(0x070a12);
  scene.fog = new T.FogExp2(0x0a0e1a, 0.00062);
  // Moonlight: the adapter's daylight rig is dimmed and cooled in place.
  let di = 0;
  for (const c of scene.children) {
    if (c.isLineSegments) c.visible = false;
    if (c.isDirectionalLight) {
      if (di === 0) { c.color.setHex(0xb8c8ff); c.intensity = 1.9; c.position.set(-400, 900, 1200); }
      else if (di === 1) { c.color.setHex(0x6a7cb0); c.intensity = 0.5; }
      else { c.color.setHex(0x8a96c8); c.intensity = 0.45; }
      di++;
    }
    if (c.isAmbientLight) { c.color.setHex(0x2c3a5c); c.intensity = 2.3; }
  }
  void adapter;
}

const lam = (hex, extra = {}) => new _THREE.MeshLambertMaterial({ color: hex, ...extra });
function box3(w, d, h, mat) {
  const m = new _THREE.Mesh(_geos.box, mat);
  m.scale.set(w, d, h);
  return m;
}

// ── 3D: textures ──────────────────────────────────────────────────────────
function makeSkyTexture() {
  const cv = document.createElement("canvas");
  cv.width = 1024; cv.height = 512;
  const c = cv.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#02040a");
  g.addColorStop(0.45, "#0a1020");
  g.addColorStop(0.62, "#1a2440");
  g.addColorStop(1, "#0a0e18");
  c.fillStyle = g;
  c.fillRect(0, 0, 1024, 512);
  const rnd = srand(777);
  for (let i = 0; i < 900; i++) {
    const y = rnd() * 300;
    c.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.7})`;
    const r = rnd() < 0.08 ? 1.6 : 0.9;
    c.beginPath(); c.arc(rnd() * 1024, y, r, 0, Math.PI * 2); c.fill();
  }
  // Moon with a soft halo.
  const mx = 720, my = 120;
  const halo = c.createRadialGradient(mx, my, 20, mx, my, 120);
  halo.addColorStop(0, "rgba(200,215,255,0.35)");
  halo.addColorStop(1, "rgba(200,215,255,0)");
  c.fillStyle = halo;
  c.beginPath(); c.arc(mx, my, 120, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#e8eeff";
  c.beginPath(); c.arc(mx, my, 26, 0, Math.PI * 2); c.fill();
  c.fillStyle = "rgba(160,175,210,0.5)";
  for (const [ox, oy, r] of [[-8, -6, 5], [7, 4, 4], [-2, 12, 3], [10, -12, 2.5]]) {
    c.beginPath(); c.arc(mx + ox, my + oy, r, 0, Math.PI * 2); c.fill();
  }
  // Far tree line silhouettes along the horizon band.
  c.fillStyle = "#050710";
  for (let x = 0; x < 1024; x += 6) {
    const h = 14 + Math.abs(Math.sin(x * 0.11) * 12 + Math.sin(x * 0.037) * 16);
    c.fillRect(x, 320 - h, 6, h + 6);
  }
  c.fillRect(0, 320, 1024, 192);
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  return tex;
}

function makeGroundTexture() {
  const S = 2048, SH = Math.round(S * WORLD_H / WORLD_W);
  const k = S / WORLD_W;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = SH;
  const c = cv.getContext("2d");
  const rnd = srand(4242);
  c.fillStyle = "#3d5e4a";
  c.fillRect(0, 0, S, SH);
  for (let i = 0; i < 9000; i++) {
    const shade = rnd();
    c.fillStyle = shade > 0.7 ? "rgba(150,200,150,0.09)" : shade > 0.4 ? "rgba(0,0,0,0.10)" : "rgba(70,130,95,0.14)";
    const r = 2 + rnd() * 11;
    c.beginPath();
    c.ellipse(rnd() * S, rnd() * SH, r, r * 0.6, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
  // Plot beds — bare earth in rows.
  for (const p of PLOTS) {
    c.fillStyle = "rgba(70,52,34,0.55)";
    c.fillRect((p.x0 - 60) * k, (p.y0 - 50) * k, (p.cols * 110 + 10) * k, (p.rows * 120 - 20) * k);
    for (let r = 0; r < p.rows; r++) {
      for (let col = 0; col < p.cols; col++) {
        c.fillStyle = "rgba(40,30,20,0.5)";
        c.fillRect((p.x0 + col * 110 - 22) * k, (p.y0 + r * 120 + 8) * k, 44 * k, 56 * k);
      }
    }
  }
  // Paths.
  c.strokeStyle = "rgba(110,95,70,0.55)";
  c.lineCap = "round";
  c.lineWidth = 90 * k;
  c.beginPath();
  c.moveTo(S / 2, 0); c.lineTo(S / 2, SH);
  c.moveTo(0, WORLD_H * 0.62 * k); c.lineTo(S, WORLD_H * 0.62 * k);
  c.stroke();
  c.lineWidth = 60 * k;
  c.beginPath();
  c.arc(S / 2, WORLD_H * 0.30 * k, 190 * k, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 900; i++) {
    c.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
    const onV = rnd() < 0.5;
    const x = onV ? S / 2 + (rnd() - 0.5) * 90 * k : rnd() * S;
    const y = onV ? rnd() * SH : WORLD_H * 0.62 * k + (rnd() - 0.5) * 90 * k;
    c.fillRect(x, y, 2 + rnd() * 5, 2 + rnd() * 5);
  }
  // Mausoleum apron.
  c.fillStyle = "rgba(90,95,105,0.6)";
  c.fillRect((WORLD_W / 2 - 130) * k, (WORLD_H * 0.30 - 90) * k, 260 * k, 200 * k);
  // Border darkening.
  const edge = c.createRadialGradient(S / 2, SH / 2, SH * 0.5, S / 2, SH / 2, S * 0.72);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.4)");
  c.fillStyle = edge;
  c.fillRect(0, 0, S, SH);
  const tex = new _THREE.CanvasTexture(cv);
  tex.colorSpace = _THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeMistTexture() {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 256;
  const c = cv.getContext("2d");
  const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "rgba(180,195,230,0.55)");
  g.addColorStop(0.6, "rgba(180,195,230,0.18)");
  g.addColorStop(1, "rgba(180,195,230,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  return new _THREE.CanvasTexture(cv);
}

// ── 3D: environment ───────────────────────────────────────────────────────
function ensureEnvironment(adapter) {
  if (_env) return;
  const T = _THREE;
  const env = { all: [], lanterns: [], mist: [], flies: null, flyAnchors: [], sky: null };
  const add = (m) => { adapter.addSceneMesh(m); env.all.push(m); return m; };
  const rnd = srand(9090);

  const sky = new T.Mesh(
    new T.SphereGeometry(5200, 24, 12),
    new T.MeshBasicMaterial({ map: makeSkyTexture(), side: T.BackSide, depthWrite: false, fog: false }),
  );
  sky.rotation.x = Math.PI / 2;
  sky.position.set(WORLD_W / 2, -WORLD_H / 2, 0);
  sky.renderOrder = -30;
  add(sky);
  env.sky = sky;

  const ground = new T.Mesh(new T.PlaneGeometry(WORLD_W, WORLD_H), lam(0xffffff, { map: makeGroundTexture() }));
  ground.position.set(WORLD_W / 2, -WORLD_H / 2, GROUND_Z);
  add(ground);

  // The graveyard sits on a dark earth block, so the fence line reads as an
  // edge and the mist below has something to swallow.
  const plinth = box3(WORLD_W + 80, WORLD_H + 80, 260, lam(0x1c232c));
  plinth.position.set(WORLD_W / 2, -WORLD_H / 2, GROUND_Z - 131);
  add(plinth);
  const soil = box3(WORLD_W + 20, WORLD_H + 20, 14, lam(0x2a2418));
  soil.position.set(WORLD_W / 2, -WORLD_H / 2, GROUND_Z - 9);
  add(soil);

  // Iron fence: instanced pickets, rails, corner posts.
  const step = 22;
  const nX = Math.floor(WORLD_W / step), nY = Math.floor(WORLD_H / step);
  const pickets = new T.InstancedMesh(_geos.cyl, lam(0x2a2f38), (nX + nY) * 2 + 4);
  let pi = 0;
  const putPicket = (x, y) => {
    _dummy.position.set(x, -y, GROUND_Z + 17);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.set(1.6, 1.6, 34);
    _dummy.updateMatrix();
    pickets.setMatrixAt(pi++, _dummy.matrix);
  };
  for (let i = 0; i <= nX; i++) { putPicket(i * step, 0); putPicket(i * step, WORLD_H); }
  for (let i = 1; i < nY; i++) { putPicket(0, i * step); putPicket(WORLD_W, i * step); }
  pickets.count = pi;
  pickets.frustumCulled = false;
  add(pickets);
  const railMat = lam(0x353b45);
  for (const z of [GROUND_Z + 10, GROUND_Z + 28]) {
    for (const [x, y, w, d] of [[WORLD_W / 2, 0, WORLD_W, 2.5], [WORLD_W / 2, WORLD_H, WORLD_W, 2.5], [0, WORLD_H / 2, 2.5, WORLD_H], [WORLD_W, WORLD_H / 2, 2.5, WORLD_H]]) {
      const r = box3(w, d, 2.5, railMat);
      r.position.set(x, -y, z);
      add(r);
    }
  }
  const postMat = lam(0x4a505a);
  for (const [x, y] of [[0, 0], [WORLD_W, 0], [0, WORLD_H], [WORLD_W, WORLD_H]]) {
    const p = box3(10, 10, 48, postMat);
    p.position.set(x, -y, GROUND_Z + 24);
    add(p);
    const cap = new T.Mesh(_geos.sph, lam(0x6a7080));
    cap.scale.set(7, 7, 7);
    cap.position.set(x, -y, GROUND_Z + 52);
    add(cap);
  }

  // Props from the physics obstacles, so nothing can drift from its body.
  const stoneMat = lam(0x767d88), stoneDark = lam(0x5c636e);
  const woodMat = lam(0x3a2f27), woodDark = lam(0x2a221c);
  const lampMat = new T.MeshBasicMaterial({ color: 0xffd28a });
  for (const o of _obstacles) {
    const sx = o.x, sy = -o.y;
    if (o.kind === "stone") {
      const g = new T.Group();
      const slab = box3(o.w, 9, o.tall, stoneMat);
      slab.position.z = o.tall / 2;
      g.add(slab);
      const top = new T.Mesh(_geos.cyl, stoneMat);
      top.rotation.x = Math.PI / 2;
      top.scale.set(o.w / 2, 4.5, o.w / 2);
      top.position.z = o.tall;
      g.add(top);
      const base = box3(o.w + 8, o.h + 6, 5, stoneDark);
      base.position.z = 2.5;
      g.add(base);
      g.position.set(sx, sy, GROUND_Z);
      g.rotation.z = -(o.rot || 0);
      add(g);
    } else if (o.kind === "cross") {
      const g = new T.Group();
      const v = box3(7, 7, o.tall + 10, stoneMat);
      v.position.z = (o.tall + 10) / 2;
      g.add(v);
      const hbar = box3(o.w + 6, 7, 7, stoneMat);
      hbar.position.z = o.tall - 6;
      g.add(hbar);
      const base = box3(o.w, o.h + 4, 5, stoneDark);
      base.position.z = 2.5;
      g.add(base);
      g.position.set(sx, sy, GROUND_Z);
      g.rotation.z = -(o.rot || 0);
      add(g);
    } else if (o.kind === "tree") {
      const g = new T.Group();
      const trunk = new T.Mesh(_geos.cyl, woodMat);
      trunk.scale.set(o.r * 0.95, o.r * 0.95, 110);
      trunk.position.z = 55;
      g.add(trunk);
      const trnd = srand(Math.floor(o.seed * 1e6));
      for (let i = 0; i < 5; i++) {
        const a = trnd() * Math.PI * 2, L = 50 + trnd() * 50;
        const br = new T.Mesh(_geos.cyl, woodDark);
        br.scale.set(3.5, 3.5, L);
        br.position.set(Math.cos(a) * (o.r * 0.5 + L * 0.35), Math.sin(a) * (o.r * 0.5 + L * 0.35), 90 + trnd() * 30 + L * 0.3);
        br.rotation.set(-Math.sin(a) * 1.0, Math.cos(a) * 1.0, 0);
        g.add(br);
        const twig = new T.Mesh(_geos.cyl, woodDark);
        twig.scale.set(2, 2, L * 0.55);
        twig.position.set(Math.cos(a) * (o.r + L * 0.75), Math.sin(a) * (o.r + L * 0.75), 110 + L * 0.65);
        twig.rotation.set(-Math.sin(a + 0.8) * 1.1, Math.cos(a + 0.8) * 1.1, 0);
        g.add(twig);
      }
      const roots = new T.Mesh(_geos.cyl, woodMat);
      roots.scale.set(o.r * 1.5, o.r * 1.5, 6);
      roots.position.z = 3;
      g.add(roots);
      g.position.set(sx, sy, GROUND_Z);
      add(g);
    } else if (o.kind === "mausoleum") {
      const g = new T.Group();
      const body = box3(o.w, o.h, 84, lam(0x4b525c));
      body.position.z = 42;
      g.add(body);
      const cornice = box3(o.w + 16, o.h + 16, 10, lam(0x5c6470));
      cornice.position.z = 89;
      g.add(cornice);
      const roof = new T.Mesh(new T.ConeGeometry(1, 1, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), lam(0x3a4049));
      roof.scale.set(o.w * 0.78, o.h * 0.78, 40);
      roof.position.z = 114;
      g.add(roof);
      const door = box3(36, 4, 54, lam(0x0d1016));
      door.position.set(0, -(o.h / 2 + 1), 27);
      g.add(door);
      for (const s of [-1, 1]) {
        const col = new T.Mesh(_geos.cyl, lam(0x7a8290));
        col.scale.set(9, 9, 84);
        col.position.set(s * 62, -84, 42);
        g.add(col);
        const capM = box3(22, 22, 8, lam(0x8a929e));
        capM.position.set(s * 62, -84, 88);
        g.add(capM);
      }
      const lintel = box3(150, 24, 10, lam(0x5c6470));
      lintel.position.set(0, -84, 94);
      g.add(lintel);
      g.position.set(sx, sy, GROUND_Z);
      add(g);
    } else if (o.kind === "lantern") {
      const g = new T.Group();
      const pole = new T.Mesh(_geos.cyl, lam(0x2b2f36));
      pole.scale.set(3, 3, 70);
      pole.position.z = 35;
      g.add(pole);
      const cage = box3(14, 14, 18, lam(0x3a3f48));
      cage.position.z = 78;
      g.add(cage);
      const lamp = box3(9, 9, 12, lampMat);
      lamp.position.z = 78;
      g.add(lamp);
      const cap = new T.Mesh(_geos.cone, lam(0x2b2f36));
      cap.scale.set(11, 11, 10);
      cap.position.z = 92;
      g.add(cap);
      g.position.set(sx, sy, GROUND_Z);
      add(g);
      const light = new T.PointLight(0xffb25a, 16000, 380, 2);
      light.position.set(sx, sy, GROUND_Z + 80);
      add(light);
      env.lanterns.push({ light, phase: o.phase, base: 16000 });
    }
  }

  // Ground mist: soft discs drifting just above the grass.
  const mistTex = makeMistTexture();
  for (let i = 0; i < 26; i++) {
    const m = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0.3, depthWrite: false, fog: false }),
    );
    const s = 260 + rnd() * 320;
    m.scale.set(s, s * 0.7, 1);
    m.position.set(rnd() * WORLD_W, -rnd() * WORLD_H, GROUND_Z + 6 + rnd() * 6);
    m.renderOrder = 5;
    add(m);
    env.mist.push({ mesh: m, vx: (rnd() - 0.5) * 14, vy: (rnd() - 0.5) * 8, phase: rnd() * 6 });
  }
  // Fireflies.
  const flies = new T.InstancedMesh(_geos.sph, new T.MeshBasicMaterial({ color: 0xc6ff7a }), 60);
  flies.frustumCulled = false;
  add(flies);
  env.flies = flies;
  for (let i = 0; i < 60; i++) env.flyAnchors.push({ x: rnd() * WORLD_W, y: rnd() * WORLD_H, z: 20 + rnd() * 40, p: rnd() * 6, q: rnd() * 6 });

  _env = env;
}

function syncEnvironment() {
  if (!_env) return;
  const t = _frame / 60;
  for (const L of _env.lanterns) {
    L.light.intensity = L.base * (0.86 + Math.sin(t * 13 + L.phase) * 0.07 + Math.sin(t * 31 + L.phase * 2) * 0.05);
  }
  for (const m of _env.mist) {
    const p = m.mesh.position;
    p.x += m.vx * DT; p.y += m.vy * DT;
    if (p.x < -200) p.x = WORLD_W + 200; else if (p.x > WORLD_W + 200) p.x = -200;
    if (p.y > 200) p.y = -WORLD_H - 200; else if (p.y < -WORLD_H - 200) p.y = 200;
    m.mesh.material.opacity = 0.22 + Math.sin(t * 0.6 + m.phase) * 0.08;
  }
  if (_env.flies) {
    _env.flyAnchors.forEach((a, i) => {
      const glow = 0.6 + Math.sin(t * 2.2 + a.p) * 0.4;
      _dummy.position.set(a.x + Math.sin(t * 0.7 + a.p) * 30, -(a.y + Math.cos(t * 0.5 + a.q) * 24), a.z + Math.sin(t * 1.3 + a.q) * 8);
      _dummy.rotation.set(0, 0, 0);
      const s = 1.2 + glow * 1.2;
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      _env.flies.setMatrixAt(i, _dummy.matrix);
    });
    _env.flies.instanceMatrix.needsUpdate = true;
  }
}

// ── 3D: hero ──────────────────────────────────────────────────────────────
function ensureHero3d(adapter) {
  if (_heroFig) return;
  const T = _THREE;
  const ch = createCharacter(adapter, T, {
    unit: HERO_R * 0.95,
    palette: heroPalette(0x8a1e2a, { hat: 0x15171c, accent: 0xffd166, shorts: 0x2a1c1f, gun: 0x2e3338 }),
    props: { weapon: "fists", hat: "cowboy" },
  });
  const light = new T.PointLight(0xffb765, 22000, 360, 2);
  adapter.addSceneMesh(light);
  const shadow = new T.Mesh(_geos.disc, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.scale.set(HERO_R * 1.1, HERO_R * 1.1, 1);
  adapter.addSceneMesh(shadow);
  _heroFig = { ch, light, shadow };
}

function syncHero3d() {
  if (!_heroFig || !_hero) return;
  const h = _hero;
  const x = heroX(), y = heroY();
  const dead = _phase === "over" ? Math.min(1, _phaseT / 60) : 0;
  syncCharacter(_heroFig.ch, {
    x, y,
    faceX: Math.cos(h.face), faceY: Math.sin(h.face),
    sprinting: false,
    z: GROUND_Z,
    attacking: h.attackFlash,
    hit: h.hitFlash,
    dead,
  });
  _heroFig.ch.root.visible = _phase !== "title" || true;
  _heroFig.light.position.set(x, -y, GROUND_Z + 46);
  _heroFig.light.intensity = 22000 * (0.92 + Math.sin(_frame * 0.17) * 0.05);
  _heroFig.shadow.position.set(x, -y, GROUND_Z + 0.4);
  _heroFig.shadow.visible = dead < 1;
}

// ── 3D: monster rigs (instanced parts) ────────────────────────────────────
// Each type is a list of parts; each part is one InstancedMesh, one draw call
// for every monster of that type. Rig space: +Y faces forward, +Z is up.
function rigSpec(def) {
  const r = def.r, c = cssHexInt(def.color);
  const red = 0xff5a5a, dark = 0x1a1d24;
  switch (def.id) {
    case "bat": return {
      fly: 24, bobK: 3, parts: [
        { g: "sph", s: [r * 0.9, r * 1.1, r * 0.8], p: [0, 0, 0], c },
        { g: "sph", s: [r * 0.5, r * 0.5, r * 0.5], p: [0, r * 0.9, 1], c: 0x8b6fd6 },
        { g: "cone", s: [r * 0.18, r * 0.18, r * 0.5], p: [-r * 0.28, r * 0.9, r * 0.6], c: 0x8b6fd6 },
        { g: "cone", s: [r * 0.18, r * 0.18, r * 0.5], p: [r * 0.28, r * 0.9, r * 0.6], c: 0x8b6fd6 },
        { g: "wing", s: [r * 2.4, r * 1.3, 0.8], p: [-r * 0.5, 0, 1], c: 0x4a3480, a: "wingL" },
        { g: "wing", s: [r * 2.4, r * 1.3, 0.8], p: [r * 0.5, 0, 1], c: 0x4a3480, a: "wingR" },
        { g: "sph", s: [1.6, 1.6, 1.6], p: [-r * 0.2, r * 1.3, 2], c: red },
        { g: "sph", s: [1.6, 1.6, 1.6], p: [r * 0.2, r * 1.3, 2], c: red },
      ] };
    case "ghoul": return {
      fly: 0, bobK: 0, parts: [
        { g: "box", s: [r * 1.3, r * 0.8, r * 1.2], p: [0, 0, r * 1.6], c },
        { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, r * 0.25, r * 2.55], c: 0x7fd08f },
        { g: "sph", s: [1.8, 1.8, 1.8], p: [-r * 0.22, r * 0.7, r * 2.6], c: red },
        { g: "sph", s: [1.8, 1.8, 1.8], p: [r * 0.22, r * 0.7, r * 2.6], c: red },
        { g: "hang", s: [r * 0.4, r * 0.4, r * 1.0], p: [-r * 0.35, 0, r * 1.05], c: 0x3f8a52, a: "legL", k: 0.7 },
        { g: "hang", s: [r * 0.4, r * 0.4, r * 1.0], p: [r * 0.35, 0, r * 1.05], c: 0x3f8a52, a: "legR", k: 0.7 },
        { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [-r * 0.8, r * 0.2, r * 2.1], c: 0x7fd08f, a: "armL", b: -1.3, k: 0.25 },
        { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [r * 0.8, r * 0.2, r * 2.1], c: 0x7fd08f, a: "armR", b: -1.3, k: 0.25 },
      ] };
    case "skeleton": return {
      fly: 0, bobK: 0, parts: [
        { g: "box", s: [r * 0.9, r * 0.55, r * 1.1], p: [0, 0, r * 1.7], c },
        { g: "box", s: [r * 0.8, r * 0.5, r * 0.35], p: [0, 0, r * 1.05], c: 0xb9b3a1 },
        { g: "sph", s: [r * 0.5, r * 0.5, r * 0.5], p: [0, 0, r * 2.65], c },
        { g: "sph", s: [1.6, 1.6, 1.6], p: [-r * 0.2, r * 0.42, r * 2.7], c: dark },
        { g: "sph", s: [1.6, 1.6, 1.6], p: [r * 0.2, r * 0.42, r * 2.7], c: dark },
        { g: "hang", s: [r * 0.28, r * 0.28, r * 1.0], p: [-r * 0.3, 0, r * 1.0], c: 0xb9b3a1, a: "legL", k: 0.8 },
        { g: "hang", s: [r * 0.28, r * 0.28, r * 1.0], p: [r * 0.3, 0, r * 1.0], c: 0xb9b3a1, a: "legR", k: 0.8 },
        { g: "hang", s: [r * 0.22, r * 0.22, r * 1.0], p: [-r * 0.62, 0, r * 2.15], c: 0xb9b3a1, a: "armL", k: 0.8 },
        { g: "hang", s: [r * 0.22, r * 0.22, r * 1.0], p: [r * 0.62, 0, r * 2.15], c: 0xb9b3a1, a: "armR", k: 0.8 },
      ] };
    case "spitter": return {
      fly: 0, bobK: 0, parts: [
        { g: "sph", s: [r * 1.1, r * 1.2, r * 0.8], p: [0, 0, r * 0.9], c, a: "pulse", k: 0.05 },
        { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, -r * 0.6, r * 1.5], c: 0xd7f05a, a: "pulse", k: 0.15 },
        { g: "sph", s: [2, 2, 2], p: [-r * 0.3, r * 0.95, r * 1.1], c: dark },
        { g: "sph", s: [2, 2, 2], p: [0, r * 1.05, r * 1.25], c: dark },
        { g: "sph", s: [2, 2, 2], p: [r * 0.3, r * 0.95, r * 1.1], c: dark },
        { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [-r * 0.8, r * 0.4, r * 0.8], c: 0x7f9a1e, a: "legL", k: 0.5 },
        { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [r * 0.8, r * 0.4, r * 0.8], c: 0x7f9a1e, a: "legR", k: 0.5 },
        { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [-r * 0.8, -r * 0.4, r * 0.8], c: 0x7f9a1e, a: "legR", k: 0.5 },
        { g: "hang", s: [r * 0.2, r * 0.2, r * 0.8], p: [r * 0.8, -r * 0.4, r * 0.8], c: 0x7f9a1e, a: "legL", k: 0.5 },
      ] };
    case "brute": return {
      fly: 0, bobK: 0, parts: [
        { g: "box", s: [r * 1.5, r * 1.0, r * 1.4], p: [0, 0, r * 1.8], c },
        { g: "sph", s: [r * 0.8, r * 0.6, r * 0.7], p: [0, r * 0.35, r * 1.5], c: 0xc4854a },
        { g: "sph", s: [r * 0.5, r * 0.5, r * 0.5], p: [0, r * 0.35, r * 2.75], c: 0xc4854a },
        { g: "cone", s: [r * 0.08, r * 0.08, r * 0.35], p: [-r * 0.2, r * 0.75, r * 2.55], c: 0xf0e6d2 },
        { g: "cone", s: [r * 0.08, r * 0.08, r * 0.35], p: [r * 0.2, r * 0.75, r * 2.55], c: 0xf0e6d2 },
        { g: "sph", s: [2.2, 2.2, 2.2], p: [-r * 0.2, r * 0.8, r * 2.85], c: red },
        { g: "sph", s: [2.2, 2.2, 2.2], p: [r * 0.2, r * 0.8, r * 2.85], c: red },
        { g: "hang", s: [r * 0.5, r * 0.5, r * 1.15], p: [-r * 0.45, 0, r * 1.15], c: 0x7a4a24, a: "legL", k: 0.55 },
        { g: "hang", s: [r * 0.5, r * 0.5, r * 1.15], p: [r * 0.45, 0, r * 1.15], c: 0x7a4a24, a: "legR", k: 0.55 },
        { g: "hang", s: [r * 0.42, r * 0.42, r * 1.35], p: [-r * 0.95, r * 0.15, r * 2.35], c, a: "armL", k: 0.5 },
        { g: "hang", s: [r * 0.42, r * 0.42, r * 1.35], p: [r * 0.95, r * 0.15, r * 2.35], c, a: "armR", k: 0.5 },
      ] };
    case "wraith": return {
      fly: 8, bobK: 5, ghost: true, parts: [
        { g: "coneDown", s: [r * 1.0, r * 1.0, r * 2.2], p: [0, 0, r * 2.0], c },
        { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, 0, r * 3.3], c: 0xbff5fb },
        { g: "cone", s: [r * 0.75, r * 0.75, r * 1.0], p: [0, -r * 0.15, r * 3.6], c: 0x3ca4b3 },
        { g: "sph", s: [1.8, 1.8, 1.8], p: [-r * 0.2, r * 0.45, r * 3.35], c: 0xffffff },
        { g: "sph", s: [1.8, 1.8, 1.8], p: [r * 0.2, r * 0.45, r * 3.35], c: 0xffffff },
        { g: "hang", s: [r * 0.22, r * 0.22, r * 1.1], p: [-r * 0.6, r * 0.2, r * 2.6], c, a: "armL", b: -1.0, k: 0.2 },
        { g: "hang", s: [r * 0.22, r * 0.22, r * 1.1], p: [r * 0.6, r * 0.2, r * 2.6], c, a: "armR", b: -1.0, k: 0.2 },
      ] };
    case "knight": return {
      fly: 0, bobK: 0, parts: [
        { g: "box", s: [r * 1.2, r * 0.8, r * 1.3], p: [0, 0, r * 1.85], c },
        { g: "box", s: [r * 1.25, r * 0.85, r * 0.5], p: [0, 0, r * 1.05], c: 0x5a6280 },
        { g: "box", s: [r * 0.7, r * 0.7, r * 0.75], p: [0, 0, r * 2.85], c },
        { g: "box", s: [r * 0.1, r * 0.6, r * 0.35], p: [0, -r * 0.25, r * 3.35], c: 0xf85149 },
        { g: "box", s: [r * 0.5, r * 0.1, r * 0.12], p: [0, r * 0.36, r * 2.85], c: dark },
        { g: "box", s: [r * 0.12, r * 0.8, r * 1.1], p: [-r * 0.85, r * 0.3, r * 1.9], c: 0x4a5a9a },
        { g: "box", s: [r * 0.1, r * 0.25, r * 1.6], p: [r * 0.9, r * 0.35, r * 1.5], c: 0xd8dde6 },
        { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [-r * 0.35, 0, r * 1.05], c: 0x5a6280, a: "legL", k: 0.6 },
        { g: "hang", s: [r * 0.38, r * 0.38, r * 1.05], p: [r * 0.35, 0, r * 1.05], c: 0x5a6280, a: "legR", k: 0.6 },
        { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [-r * 0.8, 0, r * 2.3], c, a: "armL", k: 0.5 },
        { g: "hang", s: [r * 0.3, r * 0.3, r * 1.1], p: [r * 0.8, 0, r * 2.3], c, a: "armR", k: 0.5 },
      ] };
    case "colossus": return {
      fly: 0, bobK: 0, parts: [
        { g: "box", s: [r * 1.0, r * 0.6, r * 0.5], p: [0, 0, r * 1.3], c },
        { g: "box", s: [r * 1.3, r * 0.7, r * 1.3], p: [0, 0, r * 2.2], c },
        { g: "box", s: [r * 1.36, r * 0.76, r * 0.08], p: [0, 0, r * 1.85], c: 0xa8996f },
        { g: "box", s: [r * 1.36, r * 0.76, r * 0.08], p: [0, 0, r * 2.1], c: 0xa8996f },
        { g: "box", s: [r * 1.36, r * 0.76, r * 0.08], p: [0, 0, r * 2.35], c: 0xa8996f },
        { g: "sph", s: [r * 0.55, r * 0.55, r * 0.55], p: [0, r * 0.1, r * 3.25], c },
        { g: "box", s: [r * 0.45, r * 0.4, r * 0.18], p: [0, r * 0.3, r * 2.9], c: 0xa8996f },
        { g: "sph", s: [r * 0.08, r * 0.08, r * 0.08], p: [-r * 0.2, r * 0.55, r * 3.3], c: 0xff3b3b },
        { g: "sph", s: [r * 0.08, r * 0.08, r * 0.08], p: [r * 0.2, r * 0.55, r * 3.3], c: 0xff3b3b },
        { g: "cone", s: [r * 0.35, r * 0.35, r * 0.45], p: [0, 0, r * 3.85], c: 0xffd166 },
        { g: "box", s: [r * 0.3, r * 0.3, r * 1.9], p: [r * 1.1, r * 0.2, r * 1.5], c: 0x5a3a1e },
        { g: "hang", s: [r * 0.42, r * 0.42, r * 1.3], p: [-r * 0.45, 0, r * 1.3], c, a: "legL", k: 0.45 },
        { g: "hang", s: [r * 0.42, r * 0.42, r * 1.3], p: [r * 0.45, 0, r * 1.3], c, a: "legR", k: 0.45 },
        { g: "hang", s: [r * 0.36, r * 0.36, r * 1.6], p: [-r * 0.95, 0, r * 2.8], c, a: "armL", k: 0.45 },
        { g: "hang", s: [r * 0.36, r * 0.36, r * 1.6], p: [r * 0.95, 0, r * 2.8], c, a: "armR", k: 0.45 },
      ] };
    default: return { fly: 0, bobK: 0, parts: [{ g: "sph", s: [r, r, r], p: [0, 0, r], c }] };
  }
}

const RIG_CAP = { bat: MAX_MON + 20, ghoul: MAX_MON + 20, skeleton: MAX_MON + 20, spitter: 160, brute: 120, wraith: 160, knight: 6, colossus: 2 };

function ensureRigs(adapter) {
  if (_rigs) return;
  const T = _THREE;
  _rigs = {};
  for (const id of Object.keys(MON)) {
    const spec = rigSpec(MON[id]);
    const cap = RIG_CAP[id] || 40;
    const parts = spec.parts.map((ps) => {
      const mat = spec.ghost
        ? new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false })
        : new T.MeshLambertMaterial({ color: 0xffffff });
      const mesh = new T.InstancedMesh(_geos[ps.g], mat, cap);
      mesh.frustumCulled = false;
      mesh.count = 0;
      // Colour buffer up front, so hit flashes only ever rewrite entries.
      _colTmp.setHex(ps.c);
      for (let i = 0; i < cap; i++) mesh.setColorAt(i, _colTmp);
      adapter.addSceneMesh(mesh);
      return { mesh, spec: ps };
    });
    _rigs[id] = { parts, cap, count: 0, spec };
  }
  _shadowIM = new T.InstancedMesh(_geos.disc, new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }), MAX_MON + 40);
  _shadowIM.frustumCulled = false;
  adapter.addSceneMesh(_shadowIM);
}

const _white = 0xffffff;
function syncRigs() {
  if (!_rigs) return;
  for (const id of Object.keys(_rigs)) _rigs[id].count = 0;
  let sh = 0;
  for (const m of _monsters) {
    if (!m.alive) continue;
    const rig = _rigs[m.def.id];
    if (!rig || rig.count >= rig.cap) continue;
    const i = rig.count++;
    const p = m.body.position;
    const t = m.anim;
    const jx = m.wind > 0 ? rand(-2, 2) : 0, jy = m.wind > 0 ? rand(-2, 2) : 0;
    const z = GROUND_Z + rig.spec.fly + (rig.spec.bobK ? Math.sin(t * 2 + m.wobble) * rig.spec.bobK : 0);
    _rootM.makeRotationZ(-m.face - Math.PI / 2);
    _rootM.setPosition(p.x + jx, -p.y + jy, z);
    const flash = m.hitFlash > 0;
    for (const { mesh, spec } of rig.parts) {
      _dummy.position.set(spec.p[0], spec.p[1], spec.p[2]);
      _dummy.rotation.set(0, 0, 0);
      let sx = spec.s[0], sy = spec.s[1], sz = spec.s[2];
      switch (spec.a) {
        case "legL": _dummy.rotation.x = (spec.b || 0) + Math.sin(t) * spec.k; break;
        case "legR": _dummy.rotation.x = (spec.b || 0) - Math.sin(t) * spec.k; break;
        case "armL": _dummy.rotation.x = (spec.b || 0) - Math.sin(t) * spec.k; break;
        case "armR": _dummy.rotation.x = (spec.b || 0) + Math.sin(t) * spec.k; break;
        case "wingL": _dummy.rotation.z = Math.PI; _dummy.rotation.y = Math.sin(t * 3) * 0.7; break;
        case "wingR": _dummy.rotation.y = -Math.sin(t * 3) * 0.7; break;
        case "pulse": { const q = 1 + Math.sin(t * 2) * spec.k; sx *= q; sy *= q; sz *= q; break; }
        default: break;
      }
      _dummy.scale.set(sx, sy, sz);
      _dummy.updateMatrix();
      _partM.multiplyMatrices(_rootM, _dummy.matrix);
      mesh.setMatrixAt(i, _partM);
      if (flash) { _colTmp.setHex(_white); mesh.setColorAt(i, _colTmp); mesh.userData.dirty = true; }
      else if (m.wasFlash) { _colTmp.setHex(spec.c); mesh.setColorAt(i, _colTmp); mesh.userData.dirty = true; }
    }
    m.wasFlash = flash;
    // Shadow.
    if (sh < _shadowIM.count || sh < MAX_MON + 40) {
      _dummy.position.set(p.x, -p.y, GROUND_Z + 0.4);
      _dummy.rotation.set(0, 0, 0);
      const r = m.def.r * (rig.spec.fly ? 0.8 : 1.1);
      _dummy.scale.set(r, r, 1);
      _dummy.updateMatrix();
      _shadowIM.setMatrixAt(sh++, _dummy.matrix);
    }
  }
  for (const id of Object.keys(_rigs)) {
    const rig = _rigs[id];
    for (const { mesh } of rig.parts) {
      mesh.count = rig.count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.userData.dirty) { mesh.instanceColor.needsUpdate = true; mesh.userData.dirty = false; }
    }
  }
  _shadowIM.count = sh;
  _shadowIM.instanceMatrix.needsUpdate = true;
}

// ── 3D: gems, projectiles, particles ──────────────────────────────────────
function ensurePools(adapter) {
  if (_gemIM) return;
  const T = _THREE;
  _gemIM = new T.InstancedMesh(_geos.gem, new T.MeshBasicMaterial({ color: 0xffffff }), 420);
  _boltIM = new T.InstancedMesh(_geos.sph, new T.MeshBasicMaterial({ color: 0xdff3ff }), 120);
  _knifeIM = new T.InstancedMesh(_geos.box, lam(0xe6edf3), 120);
  _spitIM = new T.InstancedMesh(_geos.sph, new T.MeshBasicMaterial({ color: 0xb5d334 }), 120);
  _partIM = new T.InstancedMesh(_geos.box, new T.MeshBasicMaterial({ color: 0xffffff }), 520);
  for (const im of [_gemIM, _boltIM, _knifeIM, _spitIM, _partIM]) {
    im.frustumCulled = false;
    im.count = 0;
    adapter.addSceneMesh(im);
  }
  _colTmp.setHex(0xffffff);
  for (let i = 0; i < 420; i++) _gemIM.setColorAt(i, _colTmp);
  for (let i = 0; i < 520; i++) _partIM.setColorAt(i, _colTmp);
  _aura = {
    ring: new T.Mesh(_geos.ring, new T.MeshBasicMaterial({ color: 0xbde3a1, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide })),
    disc: new T.Mesh(_geos.disc, new T.MeshBasicMaterial({ color: 0xbde3a1, transparent: true, opacity: 0.08, depthWrite: false })),
  };
  adapter.addSceneMesh(_aura.ring);
  adapter.addSceneMesh(_aura.disc);
  _flashLight = new T.PointLight(0xfff2b0, 0, 600, 2);
  adapter.addSceneMesh(_flashLight);
}

function setInst(im, i, x, y, z, rz, sx, sy, sz) {
  _dummy.position.set(x, -y, z);
  _dummy.rotation.set(0, 0, rz);
  _dummy.scale.set(sx, sy, sz);
  _dummy.updateMatrix();
  im.setMatrixAt(i, _dummy.matrix);
}

function syncPools(adapter) {
  // Gems.
  let n = 0;
  for (const g of _gems) {
    if (n >= 420) break;
    const tier = gemTier(g.xp);
    const s = 4 + tier * 2;
    const bob = Math.sin(g.bob + _frame * 0.1) * 1.5;
    _dummy.position.set(g.x, -g.y, GROUND_Z + 9 + bob);
    _dummy.rotation.set(0.3, 0, g.bob + _frame * 0.04);
    _dummy.scale.set(s, s, s * 1.4);
    _dummy.updateMatrix();
    _gemIM.setMatrixAt(n, _dummy.matrix);
    _colTmp.setHex(cssHexInt(GEM_COLORS[tier]));
    _gemIM.setColorAt(n, _colTmp);
    n++;
  }
  _gemIM.count = n;
  _gemIM.instanceMatrix.needsUpdate = true;
  _gemIM.instanceColor.needsUpdate = true;
  // Hero shots.
  let b = 0, k = 0;
  for (const s of _shots) {
    if (!s.body) continue;
    const p = s.body.position;
    if (s.kind === "wand" && b < 120) setInst(_boltIM, b++, p.x, p.y, GROUND_Z + 18, 0, s.r, s.r, s.r);
    else if (s.kind === "knife" && k < 120) setInst(_knifeIM, k++, p.x, p.y, GROUND_Z + 16, -s.angle, 16, 3, 1.2);
  }
  _boltIM.count = b; _boltIM.instanceMatrix.needsUpdate = true;
  _knifeIM.count = k; _knifeIM.instanceMatrix.needsUpdate = true;
  let sp = 0;
  for (const s of _spits) {
    if (!s.body || sp >= 120) continue;
    const p = s.body.position;
    setInst(_spitIM, sp++, p.x, p.y, GROUND_Z + 16, 0, 5, 5, 5);
  }
  _spitIM.count = sp; _spitIM.instanceMatrix.needsUpdate = true;
  // Particles.
  let pc = 0;
  for (const p of _particles) {
    if (pc >= 520) break;
    const s = p.size * 1.6 * (p.life / p.T) + 0.5;
    setInst(_partIM, pc, p.x, p.y, GROUND_Z + 8 + (1 - p.life / p.T) * 22, p.life * 0.3, s, s, s);
    _colTmp.setHex(cssHexInt(p.color));
    _partIM.setColorAt(pc, _colTmp);
    pc++;
  }
  _partIM.count = pc;
  _partIM.instanceMatrix.needsUpdate = true;
  _partIM.instanceColor.needsUpdate = true;

  // Orbs — one glowing sphere each.
  while (_orbMeshes.length < _orbs.length) {
    const T = _THREE;
    const core = new T.Mesh(_geos.sph, new T.MeshBasicMaterial({ color: 0xf2e6ff }));
    const halo = new T.Mesh(_geos.sph, new T.MeshBasicMaterial({ color: 0xd2a8ff, transparent: true, opacity: 0.28, depthWrite: false }));
    core.add(halo);
    halo.scale.set(2.2, 2.2, 2.2);
    adapter.addSceneMesh(core);
    _orbMeshes.push(core);
  }
  for (let i = 0; i < _orbMeshes.length; i++) {
    const om = _orbMeshes[i];
    const o = _orbs[i];
    om.visible = !!o;
    if (!o) continue;
    const p = o.body.position;
    om.position.set(p.x, -p.y, GROUND_Z + 22 + Math.sin(_frame * 0.1 + i) * 3);
    om.scale.setScalar(o.r * 0.7);
  }
  // Ward ring.
  const aura = _hero?.weapons.find((w) => w.def.id === "aura");
  if (aura && aura.radius && _phase !== "title") {
    _aura.ring.visible = _aura.disc.visible = true;
    _aura.ring.position.set(heroX(), -heroY(), GROUND_Z + 1.2);
    _aura.disc.position.set(heroX(), -heroY(), GROUND_Z + 1.0);
    _aura.ring.scale.set(aura.radius, aura.radius, 1);
    _aura.disc.scale.set(aura.radius, aura.radius, 1);
    _aura.ring.material.opacity = 0.35 + aura.pulse * 0.5;
    _aura.disc.material.opacity = 0.06 + aura.pulse * 0.16;
  } else {
    _aura.ring.visible = _aura.disc.visible = false;
  }
  // Pickups.
  const live = new Set(_pickups);
  for (const [rec, mesh] of _pickupMeshes) {
    if (!live.has(rec)) { adapter.removeSceneMesh(mesh); _pickupMeshes.delete(rec); }
  }
  for (const rec of _pickups) {
    let mesh = _pickupMeshes.get(rec);
    if (!mesh) {
      const T = _THREE;
      if (rec.kind === "heart") { mesh = new T.Mesh(_geos.gem, new T.MeshBasicMaterial({ color: 0xff6b6b })); mesh.scale.set(8, 8, 7); }
      else if (rec.kind === "magnet") { mesh = new T.Mesh(new T.TorusGeometry(7, 2.5, 8, 16, Math.PI), new T.MeshBasicMaterial({ color: 0x58a6ff })); mesh.rotation.x = Math.PI / 2; }
      else if (rec.kind === "bomb") { mesh = new T.Mesh(_geos.sph, lam(0x1f242c)); mesh.scale.setScalar(9); }
      else { mesh = box3(24, 16, 14, lam(0x8a5a2b)); const lid = box3(24, 16, 5, lam(0xffd166)); lid.position.z = 0.65; mesh.add(lid); }
      adapter.addSceneMesh(mesh);
      _pickupMeshes.set(rec, mesh);
    }
    mesh.position.set(rec.x, -rec.y, GROUND_Z + 12 + Math.sin(rec.t * 0.1) * 2);
    if (rec.kind !== "chest") mesh.rotation.z = rec.t * 0.04;
  }
}

// ── 3D: effects ───────────────────────────────────────────────────────────
function poolTake(pool, usedRef, make, adapter) {
  if (usedRef.n < pool.length) { const m = pool[usedRef.n++]; m.visible = true; return m; }
  const m = make();
  adapter.addSceneMesh(m);
  pool.push(m);
  usedRef.n++;
  return m;
}
function poolPark(pool, from) {
  for (let i = from; i < pool.length; i++) pool[i].visible = false;
}

function syncEffects3d(adapter) {
  const T = _THREE;
  // Whip arcs — flat sectors flashing on the ground.
  const au = { n: 0 };
  for (const a of _arcs) {
    const k = 1 - a.t / a.T;
    const mesh = poolTake(_arcPool, au, () => new T.Mesh(_geos.sector, new T.MeshBasicMaterial({ color: 0xe6e1cf, transparent: true, opacity: 0.6, depthWrite: false, side: T.DoubleSide })), adapter);
    mesh.position.set(a.x, -a.y, GROUND_Z + 2 + a.t * 0.5);
    mesh.rotation.z = -a.a;
    const r = a.r * (0.7 + 0.3 * (1 - k));
    mesh.scale.set(r, r, 1);
    mesh.material.opacity = 0.55 * k;
  }
  poolPark(_arcPool, au.n);
  // Shock rings.
  const ru = { n: 0 };
  for (const r of _rings) {
    const k = 1 - r.t / r.T;
    const mesh = poolTake(_ringPool, ru, () => new T.Mesh(_geos.ring, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: T.DoubleSide })), adapter);
    mesh.position.set(r.x, -r.y, GROUND_Z + 3);
    mesh.scale.set(r.r, r.r, 1);
    mesh.material.color.setHex(cssHexInt(r.color));
    mesh.material.opacity = 0.75 * k;
  }
  poolPark(_ringPool, ru.n);
  // Wind-up warnings under the knights and the colossus.
  const wu = { n: 0 };
  for (const m of _monsters) {
    if (!m.alive || m.wind <= 0) continue;
    const mesh = poolTake(_warnPool, wu, () => new T.Mesh(_geos.disc, new T.MeshBasicMaterial({ color: 0xf85149, transparent: true, opacity: 0.3, depthWrite: false })), adapter);
    const p = m.body.position;
    mesh.position.set(p.x, -p.y, GROUND_Z + 0.8);
    const r = m.windKind === "slam" ? 230 * (1 - m.wind / 48) : m.def.r + 12;
    mesh.scale.set(r, r, 1);
    mesh.material.opacity = 0.18 + (Math.floor(_frame / 4) % 2) * 0.14;
  }
  poolPark(_warnPool, wu.n);
  // Lightning — pooled polylines, positions rewritten each frame.
  const lu = { n: 0 };
  let brightest = null;
  for (const b of _bolts) {
    const k = 1 - b.t / b.T;
    const line = poolTake(_linePool, lu, () => {
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(new Float32Array(10 * 3), 3));
      return new T.Line(geo, new T.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 1, fog: false }));
    }, adapter);
    const arr = line.geometry.attributes.position.array;
    b.pts.forEach((q, i) => { arr[i * 3] = q.x; arr[i * 3 + 1] = -q.y; arr[i * 3 + 2] = GROUND_Z + q.z + 4; });
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.setDrawRange(0, b.pts.length);
    line.material.opacity = k;
    if (b.t < 4 && (!brightest || b.t < brightest.t)) brightest = b;
  }
  poolPark(_linePool, lu.n);
  if (_flashLight) {
    if (brightest) {
      const q = brightest.pts[brightest.pts.length - 1];
      _flashLight.position.set(q.x, -q.y, GROUND_Z + 60);
      _flashLight.intensity = 90000 * (1 - brightest.t / 4);
    } else if (_flash > 0.3) {
      _flashLight.position.set(heroX(), -heroY(), GROUND_Z + 120);
      _flashLight.intensity = 120000 * _flash;
    } else {
      _flashLight.intensity = 0;
    }
  }
}

// ── 3D: camera ────────────────────────────────────────────────────────────
const _camM = { m: null, eye: null, look: null, up: null };
function placeCamera3d(camera, camX, camY) {
  const T = _THREE;
  if (!_camM.m) {
    _camM.m = new T.Matrix4();
    _camM.eye = new T.Vector3();
    _camM.look = new T.Vector3();
    _camM.up = new T.Vector3(0, 0, 1);
  }
  if (camera.far < 9000) { camera.near = 5; camera.far = 14000; camera.fov = 46; camera.updateProjectionMatrix(); }
  const fx = camX + VIEW_W / 2, fy = camY + VIEW_H / 2;
  const pitch = 0.98, d = 640;
  _camM.eye.set(fx, -(fy + Math.cos(pitch) * d), Math.sin(pitch) * d + 24);
  _camM.look.set(fx, -fy, 26);
  camera.position.copy(_camM.eye);
  _camM.m.lookAt(_camM.eye, _camM.look, _camM.up);
  camera.quaternion.setFromRotationMatrix(_camM.m);
  camera.updateMatrixWorld();
  _camProj = camera;
}

// ── Input helpers ─────────────────────────────────────────────────────────
function screenOfInput(x, y) {
  // The runner hands viewport + camera offset; the UI lives in screen space.
  return { x: x - _viewCam.x, y: y - _viewCam.y };
}
function pickCard(i) {
  if (_phase !== "levelup" || i < 0 || i >= _cards.length || _phaseT < 6) return;
  applyCard(_cards[i]);
  closeLevelUp();
}
function primaryAction() {
  if (_phase === "title") { startRun(); return true; }
  if ((_phase === "over" || _phase === "won") && _frame >= _restartLockUntil) { startRun(); return true; }
  return false;
}

export default {
  id: "swarm-night",
  label: "Swarm Night",
  tags: ["Gameplay", "Roguelite", "AI", "Camera", "Sensors", "Performance", "Mobile"],
  desc:
    "A <b>survivor roguelite</b> (Vampire Survivors-style): five minutes in a walled graveyard against a night that never stops spawning, and you only ever <b>steer</b> — every weapon fires on its own. Start with the <b>Silver Whip</b>; kills drop <b>XP gems</b>, and a full bar pauses the night and offers <b>three upgrade cards</b>: the Moon Wand that picks the nearest monster, Throwing Knives that fly the way you run, the Garlic Ward that hurts and <b>shoves</b> everything around you, Spirit Orbs that circle you, Storm Call that chains lightning, and eight passives (speed, health, magnet, cooldown, damage, armour, regen, area). Six monster types arrive on a schedule — swooping <b>bats</b>, <b>ghouls</b>, <b>skeletons</b>, ranged <b>spitters</b>, heavy <b>brutes</b> and <b>wraiths</b> that drift through gravestones — plus scripted rings and walls, two <b>grave knights</b> that charge and carry treasure, and a <b>bone colossus</b> at 4:00 with a ground slam that throws the whole crowd. Dawn at 5:00 is the win. <b>WASD</b> / arrows to move, <b>1 / 2 / 3</b> or click to pick a card — on touch, <b>hold anywhere</b> to steer and tap a card. Physics: up to <b>420 monsters</b> are dynamic circles in a zero-gravity <code>Space</code>, so the horde crowds, squeezes and streams around the stones with no flocking code at all; knockback is a real impulse scaled by mass, the ward and the slam are radial impulses, and bolts, knives, spit and orbs are <b>sensor bodies</b> delivered through <code>InteractionListener</code>s, with side filtering done by sensor groups and masks. Contact damage comes from an <code>ONGOING</code> collision listener. In <b>3D</b> it is a moonlit graveyard — iron fence, dead trees, a mausoleum, flickering lanterns, ground mist and the hero's own lantern light — where every monster type is a jointed low-poly rig built from <b>instanced parts</b>, so hundreds animate for a handful of draw calls.",
  walls: false,
  workerCompatible: false,
  camera: null,
  velocityIterations: 5,
  positionIterations: 2,

  setup(space) {
    _space = space;
    _runnerRef = this._runner || null;
    space.gravity = new Vec2(0, 0);
    _frame = 0;
    _keys = {};
    _mode3d = false;
    _camProj = null;
    _scene3d = null;
    _pixiApp = null; _pixiDyn = null;

    installListeners(space);
    buildWorld(space);
    resetAll(space);
    _phase = "title";
    _phaseT = 0;
    spawnTitleHorde();

    this.camera = {
      follow: () => ({ x: heroX(), y: heroY() }),
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.12,
    };

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
        if (e.code === "Space" || e.code === "Enter") {
          if (primaryAction()) e.preventDefault();
        }
        if (_phase === "levelup") {
          const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
          if (n !== undefined) pickCard(n);
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

  hover(x, y) {
    const s = screenOfInput(x, y);
    if (_phase === "levelup") _cardHover = cardAt(s.x, s.y);
  },

  click(x, y) {
    const s = screenOfInput(x, y);
    if (primaryAction()) return;
    if (_phase === "levelup") { pickCard(cardAt(s.x, s.y)); return; }
    if (_phase !== "play") return;
    _pointer.active = true;
    _pointer.sx = s.x; _pointer.sy = s.y;
  },

  drag(x, y) {
    const s = screenOfInput(x, y);
    if (_phase === "levelup") _cardHover = cardAt(s.x, s.y);
    if (_pointer.active) { _pointer.sx = s.x; _pointer.sy = s.y; }
  },

  release() {
    _pointer.active = false;
  },

  step() {
    _frame++;
    if (_hero) { _hero.hitFlash = false; _hero.attackFlash = false; }

    if (_phase === "title") {
      _phaseT++;
      if (_hero) _hero.body.velocity = new Vec2(0, 0);
      tickTitleHorde();
      tickEffects();
      return;
    }
    if (_phase === "play") {
      _clock++;
      if (_clock >= RUN_FRAMES) { winRun(); return; }
      tickHero();
      tickWeapons();
      tickMonsters();
      tickShots();
      tickSpits();
      tickGems();
      tickSpawns();
      tickEffects();
      if (_levelUpQueue > 0 && _phase === "play") openLevelUp();
      return;
    }
    if (_phase === "levelup") {
      _phaseT++;
      tickEffects();
      return;
    }
    // over / won
    _phaseT++;
    _pointer.active = false;
    if (_hero) _hero.body.velocity = new Vec2(0, 0);
    if (_phase === "over") { tickMonsters(); tickShots(); tickSpits(); }
    tickEffects();
  },

  // Canvas2D — the whole graveyard is custom-drawn; the shared body pass only
  // runs as an outline layer when outlines are on, so the physics shows through.
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    _mode3d = false;
    _viewCam.x = camX; _viewCam.y = camY;
    ctx.save();
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGround2d(ctx);
    drawObstacles2d(ctx);
    drawGems2d(ctx);
    if (_hero) drawHero2d(ctx);
    for (const m of _monsters) {
      if (!m.alive) continue;
      const p = m.body.position;
      if (inView(p.x, p.y, m.def.r * 3)) drawMonster2d(ctx, m);
    }
    drawProjectiles2d(ctx);
    drawEffects2d(ctx);
    if (showOutlines) {
      for (let i = 0; i < space.bodies.length; i++) {
        const b = space.bodies.at(i);
        if (inView(b.position.x, b.position.y, 120)) drawBody(ctx, b, true);
      }
    }
    ctx.restore();
    ctx.restore();
    // HUD, cues and screens are drawn by render3dOverlay — the canvas2d
    // adapter calls that too.
  },

  renderPixi(adapter, space, W, H, showOutlines, camX = 0, camY = 0) {
    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;
    _mode3d = false;
    _viewCam.x = camX; _viewCam.y = camY;
    adapter.setOutlines(showOutlines);
    ensurePixiLayers(PIXI, app);
    drawPixiDynamic(_pixiDyn);
    app.stage.setChildIndex(_pixiDyn, app.stage.children.length - 1);
    app.stage.position.set(-camX, -camY);
    app.render();
    void space; void W; void H;
  },

  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0, adapter) {
    if (!_THREE) {
      loadThree().then((mod) => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }
    _mode3d = true;
    _viewCam.x = camX; _viewCam.y = camY;
    ensureScene(adapter, scene);
    ensureEnvironment(adapter);
    ensureRigs(adapter);
    ensurePools(adapter);
    ensureHero3d(adapter);

    syncEnvironment();
    syncHero3d();
    syncRigs();
    syncPools(adapter);
    syncEffects3d(adapter);

    placeCamera3d(camera, camX, camY);
    renderer.render(scene, camera);
    void space; void W; void H;
  },

  // Every render mode: world-space cues, then the screen-space HUD and screens.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    _viewCam.x = camX;
    _viewCam.y = camY;
    if (_hero) drawWorldCues(ctx);
    if (_flash > 0) {
      ctx.fillStyle = `rgba(255,245,210,${Math.min(0.6, _flash * 0.6)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    drawHUD(ctx);
    if (_phase === "title") drawTitle(ctx);
    else if (_phase === "levelup") drawLevelUp(ctx);
    else if (_phase === "over" || _phase === "won") drawEnd(ctx);
    drawBanners(ctx);
    void space; void W; void H;
  },
};
