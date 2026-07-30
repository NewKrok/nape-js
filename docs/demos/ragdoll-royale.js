import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  PivotJoint, AngleJoint, InteractionGroup, InteractionType,
  CbEvent, CbType, ConstraintListener, InteractionListener,
} from "../nape-js.esm.js";
import { drawBody, drawGrid } from "../renderer.js";

// ---------------------------------------------------------------------------
// Ragdoll Royale — bet on a dummy, press nothing, watch the chaos.
//
// EIGHTEEN numbered ragdolls slump around a single-screen arena — eight on
// the floor, four on each side platform, two on the podium of honour. The
// player makes exactly ONE decision: click a dummy to bet on it (Space picks
// at random). Betting closes, a short countdown runs, and from then on the
// round is entirely hands-off — a seeded hazard schedule escalates wave by
// wave and the arena eats the contestants:
//
//   wave 1  GEYSERS   — roaming floor vents telegraph, then blast columns
//                       of impulse (a vent picks a fresh tile every cycle,
//                       so no patch of floor stays safe for long)
//   wave 2  HAMMERS   — two wrecking-ball pendulums drop from the ceiling
//   wave 3  DROP      — both side platforms and the podium vanish underfoot
//   wave 4  ROTORS    — two kinematic X-rotors spin up at head height
//   wave 5  COLLAPSE  — the floor tiles crumble edge-to-centre into the void
//
// Damage is measured, not scripted: hard contacts bruise (per-part contact
// Δv via totalContactsImpulse), necks/shoulders/hips are breakable
// constraints that tear off under violent yanks, rotor blades take a fixed
// bite, and 0% integrity is a KO — the dummy greys out and its rag keeps
// getting shoved around. Falling into the void below the collapsing floor
// is an instant ring-out. The LAST dummy standing (or the last one to be
// eliminated) wins; the end banner grades your bet by final placement.
// Every round reseeds — click or press R for the next one.
//
// Engine features showcased:
//   * Mass ragdolls — 18 rigs × 10 parts = 180 dynamic bodies with soft
//     AngleJoint muscles, colliding with each other in one arena; per-rig
//     InteractionGroup(ignore) kills self-collision without eating filter
//     bits (the sky-hook/floppy-fists bitmask trick can't scale to 18 rigs).
//   * Constraint breaking — neck/shoulders/hips are PivotJoints with
//     maxForce + breakUnderForce + removeOnBreak, observed via a
//     ConstraintListener(CbEvent.BREAK); thresholds are derived from the
//     rig's own measured masses so posing never tears, violence does.
//   * body.totalContactsImpulse() — per-step contact Δv drives bruises,
//     eliminations and camera shake for every one of the 180 parts.
//   * Runtime world mutation — platforms and floor tiles are static bodies
//     removed mid-simulation while dummies stand on them.
//   * KINEMATIC rotors + free pendulum hammers as moving hazards, with an
//     InteractionListener(BEGIN) for fixed-bite blade hits.
//   * Seeded rounds — vent placement, hazard timing and collapse order come
//     from a per-round mulberry32 stream; the chaos is scheduled, never
//     scripted, and physics does the storytelling.
// ---------------------------------------------------------------------------

// Named SCREEN_W/SCREEN_H — the CodePen runtime declares its own `W`/`H`
// and a duplicate top-level would throw SyntaxError (see top-down-shooter.js).
const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 40;

// ── Arena ────────────────────────────────────────────────────────────────
const GRAVITY = 700;
const CEIL_Y = HUD_H;                // ceiling underside
const FLOOR_Y = 460;                 // floor top
const TILE_N = 15;
const TILE_W = SCREEN_W / TILE_N;    // 60
const VOID_Y = 620;                  // below this = ring out
const DESPAWN_Y = 1500;              // corpses vanish here

const PLATFORMS = [
  { x0: 80, x1: 320, y: 320, h: 14 },
  { x0: 580, x1: 820, y: 320, h: 14 },
  { x0: 400, x1: 500, y: 240, h: 14 },   // the podium
];

// 18 starting spots: 8 floor, 4 + 4 platforms, 2 podium.
const SPOTS = [
  { x: 50, standY: FLOOR_Y }, { x: 155, standY: FLOOR_Y },
  { x: 260, standY: FLOOR_Y }, { x: 365, standY: FLOOR_Y },
  { x: 535, standY: FLOOR_Y }, { x: 640, standY: FLOOR_Y },
  { x: 745, standY: FLOOR_Y }, { x: 850, standY: FLOOR_Y },
  { x: 110, standY: 320 }, { x: 170, standY: 320 },
  { x: 230, standY: 320 }, { x: 290, standY: 320 },
  { x: 610, standY: 320 }, { x: 670, standY: 320 },
  { x: 730, standY: 320 }, { x: 790, standY: 320 },
  { x: 425, standY: 240 }, { x: 475, standY: 240 },
];
const N_DUMMIES = SPOTS.length;

// ── Dummy rig (sky-hook/ragdoll proportions at ~0.55 scale) ─────────────
const TORSO_W = 13, TORSO_H = 26;
const HEAD_R = 7;
const ARM_LEN = 15, ARM_W = 5;
const LEG_LEN = 17, LEG_W = 6;

// Break thresholds as multiples of the limb's own steady weight-force
// (mass × gravity) — scale-free: settling into a heap never tears, geyser
// yanks and hammer hits do.
const NECK_G = 44;
const ARM_G = 34;
const LEG_G = 36;

const DMG_LIMB = 15;                 // integrity loss per torn limb
const DMG_NECK = 50;                 // ...the neck is nearly fatal
const BRUISE_DV = 340;               // direct-hit Δv (px/s) before bruising
const BRUISE_SCALE = 0.035;          // integrity %/px/s over the threshold
const BRUISE_MAX = 18;               // cap per hit
const BRUISE_COOLDOWN = 26;          // frames per part between bruises
const SPIN_DMG = 22;                 // integrity loss per rotor-blade hit
const SPIN_COOLDOWN = 40;            // frames per dummy between blade bites

// ── Hazard schedule (frames since GO) ────────────────────────────────────
const COUNT_FRAMES = 150;            // betting-closed countdown (2.5 s)
const WAVES = [
  { t: 30, id: "geysers", label: "GEYSERS ARMED" },
  { t: 360, id: "hammers", label: "HAMMERS!" },
  { t: 720, id: "plat-warn", label: "" },
  { t: 810, id: "plat-drop", label: "PLATFORMS DROP" },
  { t: 1140, id: "rotors", label: "ROTORS ONLINE" },
  { t: 1500, id: "collapse", label: "FLOOR COLLAPSE" },
];

// Roaming geyser vents — each of the N slots picks a fresh (still intact)
// floor tile at the start of every telegraph, so no patch of floor is a
// permanent safe spot.
const GEYSER_SLOTS = 5;
const GEYSER_WARN = 40;              // telegraph frames before the blast
const GEYSER_MIN_GAP = 190;          // frames between fires per vent (min)
const GEYSER_VAR = 170;              // + seeded 0..VAR
const GEYSER_HALF_W = 66;            // blast column half-width
const GEYSER_REACH = 260;            // blast column height above the floor
const GEYSER_DV = 330;               // Δv at the vent mouth (px/s)
const GEYSER_DV_VAR = 90;            // + seeded 0..VAR
const GEYSER_SIDE_DV = 90;           // seeded lateral kick

// a0 = ±1.35 rad: the sweep reaches x ≈ 436..464 past centre, so the two
// arcs overlap across the podium — no dummy stands in a hammer dead zone.
const HAMMERS = [
  { ax: 230, len: 240, r: 26, a0: -1.35 },
  { ax: 670, len: 240, r: 26, a0: 1.35 },
];
const ROTORS = [
  { x: 300, y: 380, half: 70, rate: 0.9 },
  { x: 600, y: 380, half: 70, rate: -0.9 },
];
const COLLAPSE_EVERY = 70;           // frames between floor tiles crumbling

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
let _runnerRef = null;
let _cbBreakable = null;
let _cbSpin = null;
let _cbDummy = null;

let _phase = "pick";                 // "pick" | "count" | "run" | "done"
let _tick = 0;
let _round = 1;
let _rng = null;                     // seeded per round
let _countT = 0;
let _runT = 0;
let _waveIdx = 0;
let _waveLabel = "";

let _dummies = [];                   // [{ idx, torso, head, parts, joints,
                                     //    group, integrity, out, place }]
let _spinCds = [];                   // per-dummy rotor-bite cooldowns
let _champion = null;                // dummy idx the player bet on
let _winner = null;                  // dummy idx once decided
let _elims = [];                     // dummy idxs in elimination order

let _floorTiles = [];                // [{ body, x0, x1, gone }] per tile
let _plats = [];                     // platform static Bodies
let _platWarnT = 0;
let _hammers = [];                   // pendulum ball Bodies
let _hammerJoints = [];
let _rotors = [];                    // [{ body, cfg }]
let _geysers = [];                   // [{ tile, x, state, t }]
let _collapseOrder = [];             // tile indices, outside-in
let _collapseAt = 0;                 // next tile falls at this _runT
let _collapseOn = false;

let _breakables = new Map();         // pivot → { angle, label, dmg, dIdx }
const _pendingBreaks = [];

let _shakeCount = 0;                 // headless-test observability
const keys = {};
let _lastKeyDown = null;
let _lastKeyUp = null;

const _floaters = [];
const _fx = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Deterministic per-round RNG — same round number, same massacre.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addFloater(x, y, text, color, big = false) {
  _floaters.push({ x, y, text, color, big, life: big ? 110 : 70 });
  if (_floaters.length > 18) _floaters.shift();
}

function doShake(amp, dur) {
  _shakeCount++;
  if (_runnerRef) _runnerRef.shakeCamera?.(amp, dur);
}

// This step's contact Δv on a body. An arbiter can expire between steps
// ("Arbiter not currently in use") — harmless, treat as zero.
function contactDv(body) {
  let mag = 0;
  try {
    const imp = body.totalContactsImpulse();
    mag = Math.hypot(imp.x, imp.y);
    imp.dispose?.();
  } catch (_) {
    mag = 0;
  }
  return body.mass > 0 ? mag / body.mass : 0;
}

function aliveCount() {
  let n = 0;
  for (const d of _dummies) if (!d.out) n++;
  return n;
}

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 < 4 ? n % 10 : 0]}`;
}

// Box vertices rotated by ang — shape.rotation doesn't move collision
// geometry, so the X-rotor's diagonal blades are baked into the polygon.
function rotatedBox(w, h, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [
    [-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2],
  ].map(([px, py]) => new Vec2(px * c - py * s, px * s + py * c));
}

// ---------------------------------------------------------------------------
// Static world
// ---------------------------------------------------------------------------

function staticBox(x0, y0, x1, y1) {
  const b = new Body(BodyType.STATIC);
  b.shapes.add(new Polygon(
    Polygon.rect(x0, y0, x1 - x0, y1 - y0),
    new Material(0, 0.6, 0.8, 1, 0.01),
  ));
  b.space = _space;
  return b;
}

// Walls + ceiling persist across rounds; floor tiles and platforms are
// per-round (the hazard waves eat them).
function spawnShell() {
  staticBox(-20, CEIL_Y, 0, VOID_Y + 200);
  staticBox(SCREEN_W, CEIL_Y, SCREEN_W + 20, VOID_Y + 200);
  staticBox(-20, CEIL_Y - 8, SCREEN_W + 20, CEIL_Y);
}

function spawnArena() {
  _floorTiles = [];
  for (let i = 0; i < TILE_N; i++) {
    const x0 = i * TILE_W;
    _floorTiles.push({
      body: staticBox(x0, FLOOR_Y, x0 + TILE_W, FLOOR_Y + 40),
      x0, x1: x0 + TILE_W,
      gone: false,
    });
  }
  _plats = PLATFORMS.map((p) => staticBox(p.x0, p.y, p.x1, p.y + p.h));
}

// ---------------------------------------------------------------------------
// Dummies — the shared ragdoll rig with breakable joints
// ---------------------------------------------------------------------------

function dummyPart(x, y, shape, colorIdx, dIdx, group) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(shape);
  try {
    body.userData._colorIdx = colorIdx;
    body.userData._dIdx = dIdx;
  } catch (_) { /* worker proxy */ }
  body.group = group;
  body.cbTypes.add(_cbDummy);
  body.space = _space;
  return { body, baseColorIdx: colorIdx, bruiseCd: 0 };
}

function addAngle(b1, b2, min, max, joints) {
  const j = new AngleJoint(b1, b2, min, max);
  j.stiff = false;
  j.frequency = 3;
  j.damping = 0.6;
  j.space = _space;
  joints.push(j);
  return j;
}

function addPivot(b1, b2, a1, a2, joints) {
  const j = new PivotJoint(b1, b2, a1, a2);
  j.space = _space;
  joints.push(j);
  return j;
}

// Breakable pivot — snaps and self-removes when its reaction force exceeds
// maxForce in one step. The paired soft AngleJoint is remembered so the
// BREAK drain detaches it too, or the severed limb would stay tethered by
// the angular spring.
function addBreakablePivot(b1, b2, a1, a2, joints) {
  const j = new PivotJoint(b1, b2, a1, a2);
  j.removeOnBreak = true;
  j.cbTypes.add(_cbBreakable);
  j.space = _space;
  joints.push(j);
  return j;
}

function registerBreakable(pivot, angle, label, dmg, carriedMass, gMult, dIdx) {
  pivot.maxForce = carriedMass * GRAVITY * gMult;
  pivot.breakUnderForce = true;
  _breakables.set(pivot, { angle, label, dmg, dIdx });
}

function spawnDummy(idx, spot) {
  const joints = [];
  // Per-rig ignore group: limbs never self-collide but every dummy still
  // collides with every OTHER dummy — 18 rigs would exhaust filter bits.
  const group = new InteractionGroup(true);
  const x = spot.x;
  // Feet on the ground; the rig slumps into a sitting heap while bets are
  // placed, which is half the charm.
  const torsoY = spot.standY - LEG_LEN * 2 - TORSO_H / 2 + 4;

  const torso = dummyPart(x, torsoY,
    new Polygon(Polygon.box(TORSO_W, TORSO_H)), 0, idx, group);
  // Rolling friction on the head or a torn-off one rolls forever.
  const head = dummyPart(x, torsoY - TORSO_H / 2 - HEAD_R - 1,
    new Circle(HEAD_R, undefined, new Material(0.1, 0.5, 0.7, 1, 0.4)),
    0, idx, group);

  const neck = addBreakablePivot(torso.body, head.body,
    new Vec2(0, -TORSO_H / 2 - 1), new Vec2(0, HEAD_R - 1), joints);
  const neckAngle = addAngle(torso.body, head.body, -0.6, 0.6, joints);
  registerBreakable(neck, neckAngle, "NECK SNAP", DMG_NECK,
    head.body.mass, NECK_G, idx);

  const limbs = [];
  for (const side of [-1, 1]) {
    const ax = x + side * (TORSO_W / 2 + ARM_W / 2 + 1);
    const upper = dummyPart(ax, torsoY - TORSO_H / 2 + 5 + ARM_LEN / 2,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)), 5, idx, group);
    const lower = dummyPart(ax, upper.body.position.y + ARM_LEN,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)), 5, idx, group);

    const shoulder = addBreakablePivot(torso.body, upper.body,
      new Vec2(side * (TORSO_W / 2 - 1), -TORSO_H / 2 + 5),
      new Vec2(0, -ARM_LEN / 2 + 1), joints);
    const shoulderAngle = addAngle(torso.body, upper.body, -2.2, 2.2, joints);
    registerBreakable(shoulder, shoulderAngle, "ARM OFF", DMG_LIMB,
      upper.body.mass + lower.body.mass, ARM_G, idx);

    addPivot(upper.body, lower.body,
      new Vec2(0, ARM_LEN / 2 - 1), new Vec2(0, -ARM_LEN / 2 + 1), joints);
    addAngle(upper.body, lower.body,
      side > 0 ? -0.1 : -2.4, side > 0 ? 2.4 : 0.1, joints);
    limbs.push(upper, lower);
  }

  for (const side of [-1, 1]) {
    const upper = dummyPart(x + side * 3, torsoY + TORSO_H / 2 + LEG_LEN / 2 - 1,
      new Polygon(Polygon.box(LEG_W, LEG_LEN)), 5, idx, group);
    const lower = dummyPart(upper.body.position.x, upper.body.position.y + LEG_LEN,
      new Polygon(Polygon.box(LEG_W, LEG_LEN)), 5, idx, group);

    const hip = addBreakablePivot(torso.body, upper.body,
      new Vec2(side * 3, TORSO_H / 2 - 2), new Vec2(0, -LEG_LEN / 2 + 1), joints);
    const hipAngle = addAngle(torso.body, upper.body, -1.8, 1.8, joints);
    registerBreakable(hip, hipAngle, "LEG OFF", DMG_LIMB,
      upper.body.mass + lower.body.mass, LEG_G, idx);

    addPivot(upper.body, lower.body,
      new Vec2(0, LEG_LEN / 2 - 1), new Vec2(0, -LEG_LEN / 2 + 1), joints);
    addAngle(upper.body, lower.body, -0.1, 2.0, joints);
    limbs.push(upper, lower);
  }

  const parts = [torso, head, ...limbs];
  return {
    idx, torso, head, parts, joints, group,
    integrity: 100,
    out: false,
    how: "",
    place: 0,
  };
}

function setDummyColor(d, custom, idxTorso, idxLimb) {
  for (const p of d.parts) {
    try {
      if (custom) {
        p.body.userData._color = custom;
      } else {
        delete p.body.userData._color;
        p.body.userData._colorIdx =
          p === d.torso || p === d.head ? idxTorso : idxLimb;
      }
    } catch (_) { /* worker proxy */ }
  }
}

const CHAMPION_COLOR = { fill: "rgba(210,153,34,0.35)", stroke: "#e3b341" };
const KO_COLOR = { fill: "rgba(139,148,158,0.10)", stroke: "#6e7681" };

// ---------------------------------------------------------------------------
// Round lifecycle
// ---------------------------------------------------------------------------

function despawnRound() {
  // Joints detach before bodies — nape requires a constraint and both of
  // its bodies to still be in the space when it is removed.
  for (const d of _dummies) {
    for (const j of d.joints) if (j.space) j.space = null;
    for (const p of d.parts) if (p.body.space) p.body.space = null;
  }
  _dummies = [];
  for (const j of _hammerJoints) if (j.space) j.space = null;
  _hammerJoints = [];
  for (const b of _hammers) if (b.space) b.space = null;
  _hammers = [];
  for (const r of _rotors) if (r.body.space) r.body.space = null;
  _rotors = [];
  for (const t of _floorTiles) if (t.body.space) t.body.space = null;
  _floorTiles = [];
  for (const b of _plats) if (b.space) b.space = null;
  _plats = [];
  _breakables = new Map();
  _pendingBreaks.length = 0;
}

function enterRound(round) {
  despawnRound();
  _round = round;
  _rng = mulberry32(0x9e3779b9 ^ Math.imul(round, 2654435761));
  _phase = "pick";
  _countT = 0;
  _runT = 0;
  _waveIdx = 0;
  _waveLabel = "";
  _champion = null;
  _winner = null;
  _elims = [];
  _spinCds = new Array(N_DUMMIES).fill(0);
  _platWarnT = 0;
  _geysers = [];
  _collapseOrder = [];
  _collapseAt = 0;
  _collapseOn = false;
  _floaters.length = 0;
  _fx.length = 0;

  spawnArena();
  _dummies = SPOTS.map((spot, i) => spawnDummy(i, spot));
}

function pickChampion(idx) {
  if (_phase !== "pick" && _phase !== "count") return;
  if (idx === _champion) return;
  if (_champion !== null) setDummyColor(_dummies[_champion], null, 0, 5);
  _champion = idx;
  setDummyColor(_dummies[idx], CHAMPION_COLOR);
  const p = _dummies[idx].torso.body.position;
  addFloater(p.x, p.y - 46, `YOUR PICK: #${idx + 1}`, "#e3b341");
  if (_phase === "pick") {
    _phase = "count";
    _countT = COUNT_FRAMES;
  }
}

function pickRandom() {
  pickChampion(Math.floor(_rng() * N_DUMMIES));
}

function finishRound(winnerIdx) {
  _phase = "done";
  _winner = winnerIdx;
  const d = _dummies[winnerIdx];
  d.place = 1;
  const pos = d.torso.body.space ? d.torso.body.position : { x: SCREEN_W / 2, y: 200 };
  addFloater(pos.x, pos.y - 50, `#${winnerIdx + 1} WINS!`, "#7ee787", true);
  _fx.push({ x: pos.x, y: pos.y - 20, life: 26, color: "126,231,135" });
  doShake(10, 0.4);
}

function eliminate(d, how) {
  if (d.out || _phase === "done") return;
  d.out = true;
  d.how = how;
  d.place = aliveCount() + 1;
  _elims.push(d.idx);
  const pos = d.torso.body.space
    ? d.torso.body.position
    : { x: SCREEN_W / 2, y: SCREEN_H / 2 };
  const isPick = d.idx === _champion;
  addFloater(pos.x, pos.y - 34,
    `#${d.idx + 1} ${how} — ${ordinal(d.place)}`,
    isPick ? "#e3b341" : "#f85149", isPick);
  _fx.push({ x: pos.x, y: pos.y, life: 22, color: isPick ? "227,179,65" : "248,81,73" });
  doShake(isPick ? 8 : 4, 0.25);

  if (how === "RING OUT") {
    // Gone into the void — remove the whole rag.
    for (const j of d.joints) if (j.space) j.space = null;
    for (const p of d.parts) if (p.body.space) p.body.space = null;
  } else {
    // KO — the grey rag stays in play and keeps getting shoved around.
    setDummyColor(d, KO_COLOR);
  }

  const alive = aliveCount();
  if (alive === 1) {
    finishRound(_dummies.findIndex((x) => !x.out));
  } else if (alive === 0) {
    // Simultaneous wipeout — last eliminated wins, marble-race style.
    finishRound(_elims[_elims.length - 1]);
  }
}

// ---------------------------------------------------------------------------
// Hazards
// ---------------------------------------------------------------------------

function armGeysers() {
  _geysers = [];
  for (let i = 0; i < GEYSER_SLOTS; i++) {
    _geysers.push({
      tile: -1,
      x: 0,
      state: "idle",
      // Staggered seeded first fires so the opening salvo walks the arena.
      t: _runT + 30 + i * 45 + Math.floor(_rng() * 60),
    });
  }
}

// A vent blasting from under an intact platform is shielded by it — only
// the crawl space below the deck gets the column, never the dummies
// standing on top.
function geyserTop(g) {
  if (_plats.length > 0) {
    for (const p of PLATFORMS) {
      if (g.x >= p.x0 - 6 && g.x <= p.x1 + 6) return p.y + p.h;
    }
  }
  return FLOOR_Y - GEYSER_REACH;
}

function fireGeyser(g) {
  const top = geyserTop(g);
  const dvBase = GEYSER_DV + _rng() * GEYSER_DV_VAR;
  const side = (_rng() * 2 - 1) * GEYSER_SIDE_DV;
  for (const d of _dummies) {
    for (const p of d.parts) {
      const b = p.body;
      if (!b.space) continue;
      const pos = b.position;
      if (Math.abs(pos.x - g.x) > GEYSER_HALF_W) continue;
      if (pos.y < top || pos.y > FLOOR_Y + 10) continue;
      // Falloff with height: parts at the vent mouth take the full column,
      // parts near the top of the reach ride a breeze. The differential
      // per-part Δv is what yanks breakable joints apart.
      const f = 1 - (FLOOR_Y - pos.y) / (GEYSER_REACH * 1.4);
      const dv = dvBase * Math.max(0.3, f);
      b.applyImpulse(new Vec2(side * b.mass, -dv * b.mass));
    }
  }
  _fx.push({ x: g.x, y: FLOOR_Y - 10, life: 26, color: "88,166,255" });
  doShake(5, 0.2);
}

function stepGeysers() {
  const intact = _floorTiles.filter((t) => !t.gone);
  for (const g of _geysers) {
    if (g.state === "idle" && _runT >= g.t) {
      if (intact.length === 0) continue;         // no floor left to vent from
      const tile = intact[Math.floor(_rng() * intact.length)];
      g.tile = _floorTiles.indexOf(tile);
      g.x = (tile.x0 + tile.x1) / 2;
      g.state = "warn";
      g.t = _runT + GEYSER_WARN;
    } else if (g.state === "warn" && _runT >= g.t) {
      // The tile can crumble mid-telegraph — a vent with no floor fizzles.
      if (!_floorTiles[g.tile].gone) fireGeyser(g);
      g.state = "idle";
      g.t = _runT + GEYSER_MIN_GAP + Math.floor(_rng() * GEYSER_VAR);
    }
  }
}

function spawnHammers() {
  for (const cfg of HAMMERS) {
    const bx = cfg.ax + Math.sin(cfg.a0) * cfg.len;
    const by = CEIL_Y + Math.cos(cfg.a0) * cfg.len;
    const ball = new Body(BodyType.DYNAMIC, new Vec2(bx, by));
    ball.shapes.add(new Circle(cfg.r, undefined,
      new Material(0.3, 0.3, 0.4, 8, 0.005)));
    try { ball.userData._colorIdx = 3; } catch (_) { /* worker proxy */ }
    ball.space = _space;
    const j = new PivotJoint(_space.world, ball,
      new Vec2(cfg.ax, CEIL_Y), new Vec2(0, 0));
    j.space = _space;
    _hammers.push(ball);
    _hammerJoints.push(j);
  }
}

function spawnRotors() {
  for (const cfg of ROTORS) {
    const b = new Body(BodyType.KINEMATIC, new Vec2(cfg.x, cfg.y));
    const arm = cfg.half * 2;
    b.shapes.add(new Polygon(rotatedBox(arm, 12, Math.PI / 4)));
    b.shapes.add(new Polygon(rotatedBox(arm, 12, -Math.PI / 4)));
    try { b.userData._colorIdx = 3; } catch (_) { /* worker proxy */ }
    b.cbTypes.add(_cbSpin);
    b.space = _space;
    b.angularVel = cfg.rate;
    _rotors.push({ body: b, cfg });
  }
}

function dropPlatforms() {
  for (const b of _plats) if (b.space) b.space = null;
  _plats = [];
  doShake(7, 0.3);
}

function startCollapse() {
  // Three seeded crumble patterns, so no starting spot is a safe home
  // round after round: outside-in (the classic shrinking island), a
  // one-directional sweep, or inside-out (the centre goes first).
  const order = [];
  const pattern = Math.floor(_rng() * 3);
  if (pattern === 0) {
    let lo = 0, hi = TILE_N - 1;
    let left = _rng() < 0.5;
    while (lo <= hi) {
      order.push(left ? lo++ : hi--);
      left = !left;
    }
  } else if (pattern === 1) {
    const fromLeft = _rng() < 0.5;
    for (let i = 0; i < TILE_N; i++) order.push(fromLeft ? i : TILE_N - 1 - i);
  } else {
    const mid = Math.floor(TILE_N / 2);
    order.push(mid);
    for (let d = 1; d <= mid; d++) {
      if (_rng() < 0.5) {
        if (mid - d >= 0) order.push(mid - d);
        if (mid + d < TILE_N) order.push(mid + d);
      } else {
        if (mid + d < TILE_N) order.push(mid + d);
        if (mid - d >= 0) order.push(mid - d);
      }
    }
  }
  _collapseOrder = order;
  _collapseOn = true;
  _collapseAt = _runT + COLLAPSE_EVERY;
}

function stepCollapse() {
  if (!_collapseOn || _collapseOrder.length === 0) return;
  if (_runT >= _collapseAt) {
    const tile = _floorTiles[_collapseOrder.shift()];
    if (tile.body.space) tile.body.space = null;
    tile.gone = true;
    _fx.push({
      x: (tile.x0 + tile.x1) / 2, y: FLOOR_Y + 10,
      life: 18, color: "139,148,158",
    });
    doShake(3, 0.15);
    _collapseAt = _runT + COLLAPSE_EVERY;
  }
}

function stepWaves() {
  while (_waveIdx < WAVES.length && _runT >= WAVES[_waveIdx].t) {
    const w = WAVES[_waveIdx++];
    if (w.label) {
      addFloater(SCREEN_W / 2, 150, w.label, "#f85149", true);
      _waveLabel = w.label;
    }
    if (w.id === "geysers") armGeysers();
    else if (w.id === "hammers") spawnHammers();
    else if (w.id === "plat-warn") _platWarnT = WAVES[_waveIdx].t - _runT;
    else if (w.id === "plat-drop") { _platWarnT = 0; dropPlatforms(); }
    else if (w.id === "rotors") spawnRotors();
    else if (w.id === "collapse") startCollapse();
  }
  if (_platWarnT > 0) _platWarnT--;
}

// ---------------------------------------------------------------------------
// Per-step logic
// ---------------------------------------------------------------------------

// BREAK events arrive from the ConstraintListener mid-step; the space must
// not be mutated inside the callback, so they queue and drain here.
function drainBreaks() {
  while (_pendingBreaks.length > 0) {
    const info = _pendingBreaks.shift();
    if (!info) continue;
    if (info.angle && info.angle.space) info.angle.space = null;
    const d = _dummies[info.dIdx];
    if (!d) continue;
    if (!d.out && _phase === "run") {
      d.integrity = Math.max(0, d.integrity - info.dmg);
    }
    const pos = d.torso.body.space
      ? d.torso.body.position
      : { x: SCREEN_W / 2, y: SCREEN_H / 2 };
    addFloater(pos.x, pos.y - 26, `#${d.idx + 1} ${info.label} −${info.dmg}%`, "#f85149");
    _fx.push({ x: pos.x, y: pos.y, life: 16, color: "248,81,73" });
  }
}

function checkImpacts() {
  for (const d of _dummies) {
    if (d.out) continue;
    for (const p of d.parts) {
      if (p.bruiseCd > 0) { p.bruiseCd--; continue; }
      if (!p.body.space) continue;
      const dv = contactDv(p.body);
      if (dv <= BRUISE_DV) continue;
      p.bruiseCd = BRUISE_COOLDOWN;
      const dmg = Math.min(BRUISE_MAX, (dv - BRUISE_DV) * BRUISE_SCALE);
      if (dmg > 1) {
        d.integrity = Math.max(0, d.integrity - Math.round(dmg));
        const pos = p.body.position;
        addFloater(pos.x, pos.y - 14, `−${Math.round(dmg)}%`, "#e3b341");
        doShake(Math.min(8, 2 + dv / 120), 0.2);
      }
    }
  }
}

function checkEliminations() {
  for (const d of _dummies) {
    if (d.out) continue;
    if (d.integrity <= 0) { eliminate(d, "KO"); continue; }
    if (d.torso.body.space && d.torso.body.position.y > VOID_Y) {
      eliminate(d, "RING OUT");
    }
  }
}

// Corpses and torn limbs that fall past the void scroll off into infinity —
// despawn them quietly so the body count doesn't hide the action.
function sweepFallen() {
  for (const d of _dummies) {
    if (!d.out) continue;
    for (const j of d.joints) {
      if (j.space
        && ((j.body1.position && j.body1.position.y > DESPAWN_Y)
          || (j.body2.position && j.body2.position.y > DESPAWN_Y))) {
        j.space = null;
      }
    }
    for (const p of d.parts) {
      if (p.body.space && p.body.position.y > DESPAWN_Y) p.body.space = null;
    }
  }
}

function currentHint() {
  if (_phase === "pick") return "Place your bet — click a dummy · SPACE = random";
  if (_phase === "count") return "Bets closed — brace!";
  if (_phase === "done") return "Click / R for a new round";
  return "Sit back and watch · R restarts";
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "ragdoll-royale",
  label: "Ragdoll Royale",
  tags: ["Gameplay", "Ragdoll", "Breakable", "Chaos", "Destruction"],
  desc:
    "Battle-royale spectator sport with <b>18 numbered ragdolls</b> — make exactly one decision (click a " +
    "dummy to bet on it, <b>Space</b> picks at random), then sit back and watch a seeded hazard schedule " +
    "eat the arena: telegraphed <b>geyser</b> blasts, pendulum <b>hammers</b>, platforms yanked from under " +
    "everyone, spinning <b>kinematic rotors</b>, and a floor that <b>collapses tile by tile</b> into the " +
    "void. Damage is measured, not scripted — hard contacts bruise via <code>totalContactsImpulse</code>, " +
    "necks/shoulders/hips are <b>breakable constraints</b> that tear off under geyser yanks, and 0% is a " +
    "KO. Last dummy in play wins; the banner grades your bet by placement. Per-rig " +
    "<code>InteractionGroup</code> keeps 180 ragdoll parts colliding with each other but never with " +
    "themselves. Every round reseeds — <b>R</b> restarts.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    _runnerRef = this._runner ?? null;
    space.gravity = new Vec2(0, GRAVITY);
    _cbBreakable = new CbType();
    _cbSpin = new CbType();
    _cbDummy = new CbType();

    // Hard-reset module state — the previous load's bodies died with its space.
    _dummies = [];
    _hammers = [];
    _hammerJoints = [];
    _rotors = [];
    _floorTiles = [];
    _plats = [];
    _breakables = new Map();
    _pendingBreaks.length = 0;
    _shakeCount = 0;
    _tick = 0;
    for (const k of Object.keys(keys)) delete keys[k];

    spawnShell();
    enterRound(1);

    space.listeners.add(new ConstraintListener(
      CbEvent.BREAK, _cbBreakable,
      (cb) => {
        const info = _breakables.get(cb.constraint);
        if (info) {
          _breakables.delete(cb.constraint);
          _pendingBreaks.push(info);
        }
      },
    ));

    // Rotors are game-logic hazards, not impulse ones: the thin blades move
    // tangentially and barely register as contact impulse — touching one
    // must still take a fixed bite.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbSpin, _cbDummy,
      (cb) => {
        if (_phase !== "run") return;
        const b = cb.int2.castBody ?? cb.int2.castShape?.body ?? null;
        const d = b ? _dummies[b.userData?._dIdx] : null;
        if (!d || d.out || _spinCds[d.idx] > 0) return;
        _spinCds[d.idx] = SPIN_COOLDOWN;
        d.integrity = Math.max(0, d.integrity - SPIN_DMG);
        const pos = b.position;
        addFloater(pos.x, pos.y - 18, `#${d.idx + 1} BLADE HIT −${SPIN_DMG}%`, "#f85149");
        doShake(6, 0.25);
      },
    ));

    if (typeof window !== "undefined") {
      if (_lastKeyDown) window.removeEventListener("keydown", _lastKeyDown);
      if (_lastKeyUp) window.removeEventListener("keyup", _lastKeyUp);
      _lastKeyDown = (e) => {
        if (e.code === "Space") e.preventDefault();
        keys[e.code] = true;
        if (e.code === "KeyR") enterRound(_round + 1);
        else if (e.code === "Space" && !e.repeat) {
          if (_phase === "pick") pickRandom();
          else if (_phase === "done") enterRound(_round + 1);
        }
      };
      _lastKeyUp = (e) => { keys[e.code] = false; };
      window.addEventListener("keydown", _lastKeyDown);
      window.addEventListener("keyup", _lastKeyUp);
    }
  },

  step() {
    _tick++;
    for (let i = _floaters.length - 1; i >= 0; i--) {
      const f = _floaters[i];
      f.y -= f.big ? 0.3 : 0.7;
      if (--f.life <= 0) _floaters.splice(i, 1);
    }
    for (let i = _fx.length - 1; i >= 0; i--) {
      if (--_fx[i].life <= 0) _fx.splice(i, 1);
    }
    for (const r of _rotors) r.body.angularVel = r.cfg.rate;
    for (let i = 0; i < _spinCds.length; i++) {
      if (_spinCds[i] > 0) _spinCds[i]--;
    }

    if (_phase === "count") {
      if (--_countT <= 0) {
        _phase = "run";
        _runT = 0;
        addFloater(SCREEN_W / 2, 170, "GO!", "#7ee787", true);
      }
    } else if (_phase === "run") {
      _runT++;
      stepWaves();
      stepGeysers();
      stepCollapse();
      drainBreaks();
      checkImpacts();
      checkEliminations();
      sweepFallen();
    } else if (_phase === "done") {
      drainBreaks();
      sweepFallen();
    }
  },

  click(x, y) {
    _runnerRef = this._runner ?? _runnerRef;
    if (_phase === "done") { enterRound(_round + 1); return; }
    if (_phase !== "pick" && _phase !== "count") return;
    let best = null, bestD = 70;
    for (const d of _dummies) {
      if (d.out || !d.torso.body.space) continue;
      const p = d.torso.body.position;
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist < bestD) { best = d; bestD = dist; }
    }
    if (best) pickChampion(best.idx);
  },

  // Headless-test hook (Node smoke tests) — not a DemoRunner callback and
  // not included in generated CodePen/StackBlitz previews.
  _testState() {
    return {
      keys,
      phase: () => _phase,
      round: () => _round,
      runT: () => _runT,
      dummies: () => _dummies,
      alive: aliveCount,
      champion: () => _champion,
      winner: () => _winner,
      elims: () => _elims,
      floorTiles: () => _floorTiles,
      plats: () => _plats,
      hammers: () => _hammers,
      rotors: () => _rotors,
      geysers: () => _geysers,
      breakables: () => _breakables,
      shakes: () => _shakeCount,
      pick: pickChampion,
      pickRandom,
      enterRound,
    };
  },

  render(ctx, space, W, H, showOutlines) {
    drawGrid(ctx, W, H);
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);
    drawWorldOverlay(ctx);
    drawHUD(ctx, W, H);
  },

  // Three.js / PixiJS render bodies natively; the game-specific decoration
  // is painted on the shared overlay canvas.
  render3dOverlay(ctx, space, W, H) {
    drawWorldOverlay(ctx);
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Rendering — world decoration + screen-anchored HUD
// ---------------------------------------------------------------------------

function drawWorldOverlay(ctx) {
  drawGeyserVents(ctx);
  drawPlatWarn(ctx);
  drawCollapseWarn(ctx);
  drawHammerCables(ctx);
  drawRotorHubs(ctx);
  drawBadges(ctx);
  drawFx(ctx);
  drawFloaters(ctx);
  drawCountdown(ctx);
}

function drawGeyserVents(ctx) {
  for (const g of _geysers) {
    if (g.state !== "warn" || g.tile < 0 || _floorTiles[g.tile].gone) continue;
    // Vent mouth marker + telegraph: a dashed box growing up the column.
    ctx.fillStyle = "rgba(88,166,255,0.6)";
    ctx.fillRect(g.x - 12, FLOOR_Y - 3, 24, 3);
    const t = 1 - (g.t - _runT) / GEYSER_WARN;
    const colH = (FLOOR_Y - geyserTop(g)) * t;
    ctx.strokeStyle = `rgba(88,166,255,${(0.25 + t * 0.55).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.strokeRect(g.x - GEYSER_HALF_W, FLOOR_Y - colH,
      GEYSER_HALF_W * 2, colH);
    ctx.setLineDash([]);
  }
}

function drawPlatWarn(ctx) {
  if (_platWarnT <= 0) return;
  const on = Math.floor(_tick / 6) % 2 === 0;
  if (!on) return;
  ctx.strokeStyle = "rgba(248,81,73,0.8)";
  ctx.lineWidth = 3;
  for (const p of PLATFORMS) {
    ctx.strokeRect(p.x0 - 3, p.y - 3, p.x1 - p.x0 + 6, p.h + 6);
  }
}

function drawCollapseWarn(ctx) {
  if (!_collapseOn || _collapseOrder.length === 0) return;
  const tile = _floorTiles[_collapseOrder[0]];
  const on = Math.floor(_tick / 5) % 2 === 0;
  if (!on) return;
  ctx.strokeStyle = "rgba(248,81,73,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeRect(tile.x0 + 2, FLOOR_Y + 2, TILE_W - 4, 36);
}

function drawHammerCables(ctx) {
  ctx.strokeStyle = "#8b949e";
  ctx.lineWidth = 2;
  for (let i = 0; i < _hammers.length; i++) {
    const b = _hammers[i];
    if (!b.space) continue;
    const cfg = HAMMERS[i];
    const p = b.position;
    ctx.beginPath();
    ctx.moveTo(cfg.ax, CEIL_Y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.beginPath();
    ctx.arc(cfg.ax, CEIL_Y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRotorHubs(ctx) {
  ctx.fillStyle = "#f85149";
  for (const r of _rotors) {
    if (!r.body.space) continue;
    ctx.beginPath();
    ctx.arc(r.cfg.x, r.cfg.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Number badge over every dummy still in play; the champion wears a crown.
function drawBadges(ctx) {
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const d of _dummies) {
    if (d.out || !d.torso.body.space) continue;
    const p = d.torso.body.position;
    const isPick = d.idx === _champion;
    ctx.fillStyle = isPick ? "#e3b341" : "rgba(230,237,243,0.55)";
    ctx.fillText(`${d.idx + 1}`, p.x, p.y - TORSO_H / 2 - HEAD_R * 2 - 8);
    if (isPick) {
      // Crown: three little spikes.
      const cy = p.y - TORSO_H / 2 - HEAD_R * 2 - 22;
      ctx.beginPath();
      ctx.moveTo(p.x - 7, cy + 5);
      ctx.lineTo(p.x - 7, cy - 1);
      ctx.lineTo(p.x - 3.5, cy + 2);
      ctx.lineTo(p.x, cy - 3);
      ctx.lineTo(p.x + 3.5, cy + 2);
      ctx.lineTo(p.x + 7, cy - 1);
      ctx.lineTo(p.x + 7, cy + 5);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.textAlign = "left";
}

function drawFx(ctx) {
  for (const f of _fx) {
    const t = 1 - f.life / 26;
    ctx.strokeStyle = `rgba(${f.color},${Math.max(0, 1 - t).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 8 + t * 42, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFloaters(ctx) {
  ctx.textAlign = "center";
  for (const f of _floaters) {
    ctx.font = f.big
      ? "bold 26px system-ui, sans-serif"
      : "bold 13px system-ui, sans-serif";
    ctx.fillStyle = f.color;
    ctx.globalAlpha = Math.min(1, f.life / 20);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawCountdown(ctx) {
  if (_phase !== "count") return;
  const secs = Math.ceil(_countT / 60);
  const frac = (_countT % 60) / 60;
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(230,237,243,${(0.35 + frac * 0.65).toFixed(3)})`;
  ctx.font = `bold ${Math.round(46 + frac * 22)}px system-ui, sans-serif`;
  ctx.fillText(`${secs}`, SCREEN_W / 2, 190);
  ctx.textAlign = "left";
}

function drawHUD(ctx, W, H) {
  ctx.fillStyle = "rgba(13,17,23,0.72)";
  ctx.fillRect(0, 0, W, HUD_H);

  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("RAGDOLL ROYALE", 14, HUD_H / 2);

  ctx.fillStyle = "#8b949e";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`ROUND ${_round}`, 158, HUD_H / 2);
  ctx.fillText(`ALIVE ${aliveCount()}/${N_DUMMIES}`, 232, HUD_H / 2);

  if (_champion !== null) {
    const d = _dummies[_champion];
    ctx.fillStyle = "#e3b341";
    ctx.fillText(
      d.out ? `PICK #${_champion + 1} — ${ordinal(d.place)}`
        : `PICK #${_champion + 1} · ${d.integrity}%`,
      330, HUD_H / 2);
  }

  if (_waveLabel && _phase === "run") {
    ctx.fillStyle = "#f85149";
    ctx.fillText(_waveLabel, 480, HUD_H / 2);
  }

  const hint = currentHint();
  ctx.textAlign = "right";
  ctx.fillStyle = "#8b949e";
  ctx.fillText(hint, W - 14, HUD_H / 2);
  ctx.textAlign = "left";

  // End-of-round banner.
  if (_phase === "done" && _winner !== null) {
    ctx.fillStyle = "rgba(13,17,23,0.8)";
    ctx.fillRect(W / 2 - 220, H / 2 - 58, 440, 116);
    const won = _champion === _winner;
    ctx.strokeStyle = won ? "#3fb950" : "#e3b341";
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 220, H / 2 - 58, 440, 116);
    ctx.textAlign = "center";
    ctx.fillStyle = "#7ee787";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(`#${_winner + 1} WINS THE ROYALE`, W / 2, H / 2 - 18);
    ctx.font = "14px system-ui, sans-serif";
    if (_champion !== null) {
      const place = _dummies[_champion].place || N_DUMMIES;
      ctx.fillStyle = won ? "#7ee787" : "#e3b341";
      ctx.fillText(
        won ? `Your pick #${_champion + 1} took the crown!`
          : `Your pick #${_champion + 1} placed ${ordinal(place)} of ${N_DUMMIES}`,
        W / 2, H / 2 + 12);
    }
    ctx.fillStyle = "#8b949e";
    ctx.fillText("Click or press R for a new round", W / 2, H / 2 + 38);
    ctx.textAlign = "left";
  }
  ctx.textBaseline = "alphabetic";
}
