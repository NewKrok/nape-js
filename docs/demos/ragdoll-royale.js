import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  PivotJoint, AngleJoint, InteractionGroup, InteractionType,
  CbEvent, CbType, ConstraintListener, InteractionListener,
} from "../nape-js.esm.js?v=3.42.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.42.0";

// ---------------------------------------------------------------------------
// Ragdoll Royale — bet on a dummy, press nothing, watch the chaos.
//
// FIFTY numbered ragdolls stand to attention across a single-screen arena —
// twenty in the ground-level mosh pit, nine on each long gallery, five on
// each mezzanine, two on the podium of honour. Until the player bets, the
// whole tableau is frozen: physics is paused and every rig is pinned in its
// standing pose, so nobody has toppled off a deck before the field has even
// been seen. The player then makes exactly ONE decision: click a dummy to bet
// on it (Space picks at random). Betting closes, a short countdown runs, the
// pins come off, and from then on the round is entirely hands-off — a seeded
// hazard schedule escalates wave by wave and the arena eats the contestants:
//
//   wave 1  GEYSERS   — roaming floor vents telegraph, then blast columns
//                       of impulse (a vent picks a fresh tile every cycle,
//                       so no patch of floor stays safe for long)
//   wave 2  CANNONS   — four muzzles ride up and down the side walls and lob
//                       heavy cannonballs across the decks on seeded
//                       elevations — the only hazard that crosses the
//                       galleries horizontally, and the travel is what stops
//                       a volley from raking the same single row
//   wave 3  ROCKFALL  — seven ceiling hatches telegraph, then drop heavy
//                       boulders of seeded size; pure gravity, and the one
//                       hazard that reaches a gallery from directly above
//   wave 4  DROP      — every platform and the podium vanish underfoot
//   wave 5  ROTORS    — two kinematic X-rotors spin up, re-rolling direction
//                       and speed on a seeded timer while riding their shafts
//                       up and down so no height stays out of reach
//   wave 6  COLLAPSE  — the floor tiles crumble in a seeded random order, so
//                       holes open under the crowd as readily as at the edges
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
//   * Mass ragdolls — 50 rigs × 10 parts = 500 dynamic bodies with soft
//     AngleJoint muscles, colliding with each other in one arena; per-rig
//     InteractionGroup(ignore) kills self-collision without eating filter
//     bits (the sky-hook/floppy-fists bitmask trick can't scale to 50 rigs).
//   * Constraint breaking — neck/shoulders/hips are PivotJoints with
//     maxForce + breakUnderForce + removeOnBreak, observed via a
//     ConstraintListener(CbEvent.BREAK); thresholds are derived from the
//     rig's own measured masses so posing never tears, violence does.
//   * body.totalContactsImpulse() — per-step contact Δv drives bruises,
//     eliminations and camera shake for every one of the 500 parts.
//   * Pose pinning — rigid world PivotJoint + AngleJoint pairs freeze each rig
//     at attention while bets are open, then detach in one shot at GO. (The
//     rigs can't just be spawned STATIC: nape rejects a constraint with two
//     non-dynamic bodies, so every joint in the rig would fail validate().)
//   * Runtime world mutation — platforms and floor tiles are static bodies
//     removed mid-simulation while dummies stand on them.
//   * Unconstrained projectiles over constrained ones — the rockfall and the
//     cannon volleys are plain dynamic bodies given one initial velocity and
//     then left entirely to gravity and contact. An earlier version of this
//     wave used rope-hung wrecking balls (DistanceJoint) and needed spawn
//     kicks, an amplitude regulator and a stuck-ball rescue to stay watchable,
//     each of which visibly fought the solver. See the wrecking-hail block: in
//     a 500-body brawl the unconstrained version is not merely simpler, it is
//     the only one with no failure mode.
//   * KINEMATIC hazards moved by velocity, not teleport — rotors write
//     angularVel for spin and velocity for their vertical travel, so contacts
//     resolve with the true relative motion instead of tunnelling between
//     steps; an InteractionListener(BEGIN) takes a fixed bite per blade hit.
//   * Seeded rounds — vent placement, cannon volleys and heights, boulder sizes
//     and hatch timing, rotor direction and lift rolls, wave schedule and the
//     shuffled collapse order all come from a per-round mulberry32 stream.
//     Anything that draws from it must therefore run ONLY while the round is
//     live: rotors used to tick in the "done" phase too, burning RNG for
//     however long the victory screen stayed up and desyncing the next round
//     from its seed.
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

// Four decks plus the floor. The two long galleries sit at 350, the two
// shorter mezzanines at 250, and the podium of honour crowns the middle at
// 170 — a 50-body crowd needs vertical stacking, one row of fifty would be
// shoulder-to-shoulder mush.
const PLATFORMS = [
  { x0: 40, x1: 380, y: 350, h: 12 },
  { x0: 520, x1: 860, y: 350, h: 12 },
  { x0: 90, x1: 330, y: 250, h: 12 },
  { x0: 570, x1: 810, y: 250, h: 12 },
  { x0: 370, x1: 530, y: 170, h: 12 },   // the podium
];

// 50 starting spots, laid out deck by deck. RIG_PITCH is the shoulder-to-
// shoulder spacing that keeps neighbours touching but not interpenetrating
// at spawn (a rig is ~26 px across the arms); a deck wider than n·PITCH just
// spreads its row out to fill the span.
const RIG_PITCH = 30;

function deckSpots(x0, x1, standY, n) {
  const span = x1 - x0;
  // Spread to fill the deck, but never closer than shoulder pitch.
  const step = Math.max(RIG_PITCH, span / n);
  const used = (n - 1) * step;
  const start = x0 + (span - used) / 2;
  return Array.from({ length: n }, (_, i) => ({ x: start + i * step, standY }));
}

const SPOTS = [
  ...deckSpots(30, 870, FLOOR_Y, 20),    // ground level — the mosh pit
  ...deckSpots(40, 380, 350, 9),         // left gallery
  ...deckSpots(520, 860, 350, 9),        // right gallery
  ...deckSpots(90, 330, 250, 5),         // left mezzanine
  ...deckSpots(570, 810, 250, 5),        // right mezzanine
  ...deckSpots(370, 530, 170, 2),        // the podium
];
const N_DUMMIES = SPOTS.length;          // 50

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
// The hail comes while the decks are still standing — falling rock is the one
// hazard that reaches a gallery from above, so it is what makes the upper tiers
// stop being the safe seats. (Its predecessor, a rope-hung pendulum, had to be
// scheduled after the drop instead because its arc jammed on any deck it
// crossed; see the wrecking-hail block for why that mechanic was retired.)
// Timings are pulled in tight because the field really does thin out: rounds
// resolve in 30-37 s, and at the old spacing the floor-collapse finale fired so
// late it scored 0-2 eliminations — the round was already over. Every wave now
// gets time to matter.
const WAVES = [
  { t: 30, id: "geysers", label: "GEYSERS ARMED" },
  { t: 300, id: "cannons", label: "CANNONS HOT" },
  { t: 600, id: "hail", label: "ROCKFALL!" },
  { t: 840, id: "plat-warn", label: "" },
  { t: 930, id: "plat-drop", label: "PLATFORMS DROP" },
  { t: 1140, id: "rotors", label: "ROTORS ONLINE" },
  { t: 1380, id: "collapse", label: "FLOOR COLLAPSE" },
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

// Wrecking balls hang from ceiling anchors on a rope of `len`, released from
// `a0` radians off vertical — the angle is measured from straight down, so the
// ball spawns at (ax + sin(a0)·len, CEIL_Y + cos(a0)·len).
// ── Wrecking hail ────────────────────────────────────────────────────────
// Heavy boulders dropped through hatches in the ceiling. This replaced a pair
// of rope-hung wrecking-ball pendulums, and the swap was a deliberate retreat
// from a fundamentally fragile mechanic rather than one more patch on it.
//
// A constrained pendulum inside a 500-body brawl has no stable configuration:
// hang it low enough to matter and it plows into the ragdoll pile and stops
// (measured sweep decaying 189 px → 18 px in ten seconds); route its arc past
// any standing platform and it wedges in the corner (one sat dead for eight
// seconds); regulate the swing to keep it alive and the correcting impulses
// start fighting gravity, so the ball visibly floats and hangs at the top of
// its arc. Each fix bought one round of plausibility and created the next edge
// case — the classic sign that the mechanic, not the tuning, is wrong.
//
// Free-falling boulders have no such failure mode. There is no constraint to
// violate, no energy to top up, and nothing to wedge against: gravity does
// every bit of the work, an impact is a plain contact, and a spent boulder
// simply rolls away and despawns. The threat also reads better — a telegraphed
// hatch is legible from anywhere on screen, where a swinging rope was not.
const HAIL_HATCH_N = 5;              // ceiling hatches, evenly spaced
// Scale reference: a rig's torso is 13×26 and the whole dummy stands ~74 px.
// Radius 8..17 makes a boulder read as head- to shoulder-sized — something that
// flattens a ragdoll without being one. An earlier 15..28 put the largest rock
// at 56 px across, 2.1× the torso height and three quarters of an entire rig,
// which looked less like debris than like a second contestant.
const HAIL_R_MIN = 8;                // boulder radius (min)
const HAIL_R_VAR = 9;                // + seeded 0..VAR
const HAIL_WARN = 42;                // hatch telegraph frames before a drop
// Five hatches at this cadence average roughly one drop every 1.5 s, versus the
// 1.17 per SECOND (6.8 rocks on screen at once) the first pass produced. Each
// impact should land as its own event rather than as continuous weather.
const HAIL_MIN_GAP = 330;            // frames between drops per hatch (min)
const HAIL_VAR = 450;                // + seeded 0..VAR
const HAIL_SPIN = 6;                 // seeded angularVel spread (rad/s)
const HAIL_DRIFT = 60;               // seeded horizontal entry speed (px/s)
const HAIL_LIFE = 420;               // frames before a spent boulder despawns
const HAIL_MAX = 5;                  // live boulders cap (perf guard)

// Rotors don't hold a fixed spin — they re-roll direction and rate on a timer
// so the blade sweep never becomes a memorisable rhythm, and they ride up and
// down their shaft so no deck height is permanently out of reach.
// Offset from the hammer anchor columns (300 / 600) so a blade tip and a rope
// aren't permanently grinding through each other.
const ROTORS = [
  { x: 180, yMin: 250, yMax: 415 },
  { x: 720, yMin: 250, yMax: 415 },
];
const ROTOR_HALF = 70;               // blade half-span
const ROTOR_RATE_MIN = 0.7;          // rad/s magnitude floor
const ROTOR_RATE_VAR = 2.0;          // + seeded 0..VAR
const ROTOR_HOLD_MIN = 90;           // frames on one setting (min)
const ROTOR_HOLD_VAR = 150;          // + seeded 0..VAR
const ROTOR_SPINUP = 0.06;           // rad/s per frame ramp toward the target
// Rotors only arrive at t=1140 of a round that resolves around t=1700, so they
// have roughly ten seconds on stage. Lift speed and dwell are sized so they
// visibly work their shaft in that window rather than creeping a few pixels.
const ROTOR_LIFT_MIN = 40;           // px/s vertical travel speed (min)
const ROTOR_LIFT_VAR = 45;           // + seeded 0..VAR
const ROTOR_DWELL_MIN = 25;          // frames paused at a reached target (min)
const ROTOR_DWELL_VAR = 55;          // + seeded 0..VAR

// Ball cannons — muzzles that ride up and down the side walls and fire on a
// seeded schedule. Unlike the geysers these are lateral, so they sweep the
// galleries the vertical columns can never reach; the vertical travel is what
// stops every volley from raking the same one row.
const CANNONS = [
  { x: 8, dir: 1, yMin: 110, yMax: 430 },
  { x: SCREEN_W - 8, dir: -1, yMin: 110, yMax: 430 },
  { x: 8, dir: 1, yMin: 110, yMax: 430 },
  { x: SCREEN_W - 8, dir: -1, yMin: 110, yMax: 430 },
];
const CANNON_R = 13;                 // ball radius
const CANNON_WARN = 34;              // muzzle-flash telegraph frames
const CANNON_MIN_GAP = 90;           // frames between shots per muzzle (min)
const CANNON_VAR = 210;              // + seeded 0..VAR
const CANNON_SPEED = 430;            // muzzle speed (px/s)
const CANNON_SPEED_VAR = 170;        // + seeded 0..VAR
const CANNON_AIM = 0.35;             // seeded elevation spread (rad, ± level)
const CANNON_LIFE = 300;             // frames before a spent ball despawns
const CANNON_MAX = 8;                // live balls cap (perf guard)
const CANNON_LIFT_MIN = 30;          // px/s muzzle travel speed (min)
const CANNON_LIFT_VAR = 45;          // + seeded 0..VAR
const CANNON_COLUMN = 90;            // muzzles stay this far apart on a wall
// 15 tiles at this cadence takes ~8 s to eat the whole floor. Any slower and
// the finale outlasts the round it is supposed to finish.
const COLLAPSE_EVERY = 34;           // frames between floor tiles crumbling

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
                                     //    holds, group, integrity, out, place }]
let _spinCds = [];                   // per-dummy rotor-bite cooldowns
let _champion = null;                // dummy idx the player bet on
let _winner = null;                  // dummy idx once decided
let _elims = [];                     // dummy idxs in elimination order
let _held = false;                   // rigs pinned in their standing pose?

let _floorTiles = [];                // [{ body, x0, x1, gone }] per tile
let _plats = [];                     // platform static Bodies
let _platWarnT = 0;
let _hatches = [];                   // [{ x, state, t, r }] ceiling hatches
let _hail = [];                      // [{ body, life }] falling boulders
let _rotors = [];                    // [{ body, cfg, rate, target, holdT,
                                     //    y, yTarget, lift, dwellT }]
let _cannons = [];                   // [{ cfg, state, t, y, yTarget, lift }]
let _balls = [];                     // [{ body, life }] live cannonballs
let _geysers = [];                   // [{ tile, x, state, t }]
let _collapseOrder = [];             // tile indices, seeded random order
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

// Per-round RNG: the same round number always produces the same hazard
// SCHEDULE — vent tiles, hatch timings and boulder sizes, cannon volleys, rotor
// rolls, collapse order.
//
// The resulting massacre is NOT bit-reproducible, and deliberately isn't relied
// on to be. nape's own stepping is exactly reproducible (verified: 500 loose
// boxes stepped twice in one process stay identical to 9 decimals for 400
// frames), but CbType and InteractionGroup take ids from a global monotonic
// counter, and those ids order the callback-set and interaction-pair walks. A
// second setup() in the same process therefore gets a different id block, which
// reorders some floating-point summations — two runs of "round 4" visibly part
// company around frame 180 and can crown different winners. Fine for a
// spectator demo; if you need frame-exact replay, see the replay-recorder demo,
// which records inputs against a single space instead.
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
  // collides with every OTHER dummy — 50 rigs would exhaust filter bits.
  const group = new InteractionGroup(true);
  const x = spot.x;
  // Feet on the ground, standing to attention. The rig is pinned in this pose
  // (see holdPose) until the bet is placed, so the crowd on the upper decks
  // is still standing there when the player picks — letting them slump during
  // betting meant half the field had already tumbled off the platforms.
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

  const shins = [];
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
    shins.push(lower);
  }

  const parts = [torso, head, ...limbs];
  const d = {
    idx, torso, head, parts, joints, group,
    holds: [],
    integrity: 100,
    out: false,
    how: "",
    place: 0,
  };
  holdPose(d, [torso, head, ...shins]);
  return d;
}

// Pin a rig in the pose it was built in. A rigid world PivotJoint locks the
// position and a rigid world AngleJoint the orientation; anchoring the torso,
// head and both shins is enough to keep the whole rig at attention (the free
// arms sway a couple of pixels, which reads as idle fidget). These are NOT
// pushed onto d.joints — the BREAK drain and despawn walk that list, and the
// holds must be releasable independently.
//
// Note the rigs cannot simply be spawned BodyType.STATIC instead: nape rejects
// a constraint whose both bodies are non-dynamic, so every joint in the rig
// would throw on validate().
function holdPose(d, anchors) {
  for (const p of anchors) {
    const pos = p.body.position;
    const pv = new PivotJoint(_space.world, p.body,
      new Vec2(pos.x, pos.y), new Vec2(0, 0));
    pv.space = _space;
    const an = new AngleJoint(_space.world, p.body,
      p.body.rotation, p.body.rotation);
    an.space = _space;
    d.holds.push(pv, an);
  }
}

// Betting is over — cut every rig loose at the same instant.
function releasePose() {
  if (!_held) return;
  _held = false;
  for (const d of _dummies) {
    for (const j of d.holds) if (j.space) j.space = null;
    d.holds.length = 0;
  }
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
    for (const j of d.holds) if (j.space) j.space = null;
    for (const j of d.joints) if (j.space) j.space = null;
    for (const p of d.parts) if (p.body.space) p.body.space = null;
  }
  _dummies = [];
  _held = false;
  for (const b of _hail) if (b.body.space) b.body.space = null;
  _hail = [];
  _hatches = [];
  for (const r of _rotors) if (r.body.space) r.body.space = null;
  _rotors = [];
  for (const b of _balls) if (b.body.space) b.body.space = null;
  _balls = [];
  _cannons = [];
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
  _held = true;
  _dummies = SPOTS.map((spot, i) => spawnDummy(i, spot));
  // Physics idles while bets are open — the arena is a frozen tableau and
  // nothing can topple off a deck before the player has even chosen. The
  // holdPose pins are the headless-safe half of the same promise (a smoke
  // test drives space.step() directly, with no runner to pause).
  if (_runnerRef) _runnerRef.physicsPaused = true;
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
    // The bet locks in the world: physics starts ticking again, but the rigs
    // stay pinned through the countdown so the field is still standing at GO.
    if (_runnerRef) _runnerRef.physicsPaused = false;
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

// Arm the ceiling hatches. Each cycles idle → warn → drop on its own seeded
// timer, so the hail walks the arena instead of falling in unison.
function armHail() {
  _hatches = [];
  for (let i = 0; i < HAIL_HATCH_N; i++) {
    _hatches.push({
      // Evenly spaced across the ceiling, inset half a slot from each wall.
      x: SCREEN_W * ((i + 0.5) / HAIL_HATCH_N),
      state: "idle",
      t: _runT + 20 + i * 26 + Math.floor(_rng() * 80),
      r: 0,
    });
  }
}

function dropBoulder(h) {
  // Draw the seeded values BEFORE the cap check, and always exactly two of
  // them. Bailing out early would make the number of _rng() calls depend on how
  // many rocks happen to be airborne — a physics-dependent quantity — which
  // desyncs the whole remaining schedule from the seed.
  const drift = (_rng() * 2 - 1) * HAIL_DRIFT;
  const spin = (_rng() * 2 - 1) * HAIL_SPIN;
  if (_hail.length >= HAIL_MAX) return;

  const body = new Body(BodyType.DYNAMIC, new Vec2(h.x, CEIL_Y + h.r + 2));
  // Circle + explicit Material is safe; the P53 tunneling bug is Polygon-only.
  // Low elasticity so a boulder thuds and stays in the pit rather than
  // trampolining back up to the ceiling. Density is high (18) because these
  // rocks are deliberately small on screen — the heft has to come from density
  // rather than from a radius that would dwarf the contestants.
  body.shapes.add(new Circle(h.r, undefined,
    new Material(0.15, 0.4, 0.5, 18, 0.01)));
  try { body.userData._colorIdx = 3; } catch (_) { /* worker proxy */ }
  body.isBullet = true;
  body.space = _space;
  // A touch of drift and spin: purely vertical drops looked like a test
  // fixture, and the spin makes the roll-out afterwards read as weight.
  body.velocity = new Vec2(drift, 0);
  body.angularVel = spin;
  _hail.push({ body, life: HAIL_LIFE });
  _fx.push({ x: h.x, y: CEIL_Y + 8, life: 18, color: "248,81,73" });
  doShake(3, 0.14);
}

// Age out spent boulders so the live cap always has room for the next drop.
// RNG-free, so it is safe to keep running after the round is decided.
function retireHail() {
  for (let i = _hail.length - 1; i >= 0; i--) {
    const b = _hail[i];
    if (--b.life <= 0 || !b.body.space || b.body.position.y > DESPAWN_Y) {
      if (b.body.space) b.body.space = null;
      _hail.splice(i, 1);
    }
  }
}

// Boulders need no per-step steering at all — gravity is the whole mechanic.
// This only runs the hatch timers.
function stepHail() {
  for (const h of _hatches) {
    if (h.state === "idle" && _runT >= h.t) {
      h.state = "warn";
      h.r = HAIL_R_MIN + _rng() * HAIL_R_VAR;   // size is known during the warn
      h.t = _runT + HAIL_WARN;
    } else if (h.state === "warn" && _runT >= h.t) {
      dropBoulder(h);
      h.state = "idle";
      h.t = _runT + HAIL_MIN_GAP + Math.floor(_rng() * HAIL_VAR);
    }
  }
  retireHail();
}

function rollRotor(r) {
  const mag = ROTOR_RATE_MIN + _rng() * ROTOR_RATE_VAR;
  r.target = _rng() < 0.5 ? -mag : mag;
  r.holdT = ROTOR_HOLD_MIN + Math.floor(_rng() * ROTOR_HOLD_VAR);
}

// Pick the next height for a rotor to travel to, and how fast it gets there.
// Deliberately does NOT touch dwellT — the caller sets the pause before calling
// this, and clearing it here would cancel that pause.
function rollRotorLift(r) {
  const { yMin, yMax } = r.cfg;
  r.yTarget = yMin + _rng() * (yMax - yMin);
  r.lift = ROTOR_LIFT_MIN + _rng() * ROTOR_LIFT_VAR;
}

function spawnRotors() {
  for (const cfg of ROTORS) {
    const y0 = (cfg.yMin + cfg.yMax) / 2;
    const b = new Body(BodyType.KINEMATIC, new Vec2(cfg.x, y0));
    const arm = ROTOR_HALF * 2;
    b.shapes.add(new Polygon(rotatedBox(arm, 12, Math.PI / 4)));
    b.shapes.add(new Polygon(rotatedBox(arm, 12, -Math.PI / 4)));
    try { b.userData._colorIdx = 3; } catch (_) { /* worker proxy */ }
    b.cbTypes.add(_cbSpin);
    b.space = _space;
    const r = {
      body: b, cfg, rate: 0, target: 0, holdT: 0,
      y: y0, yTarget: y0, lift: 0, dwellT: 0,
    };
    rollRotor(r);
    rollRotorLift(r);
    _rotors.push(r);
  }
}

// Apply a rotor's current spin and lift settings for one frame. Draws no
// randomness, so it is safe to run outside the seeded round (see coastRotors).
//
// Kinematic bodies ignore forces: the spin comes from writing angularVel, and
// the vertical travel from writing velocity rather than teleporting position —
// a snapped position would let blades tunnel past a ragdoll between steps and
// would report zero contact velocity to the impact code.
function driveRotor(r) {
  const d = r.target - r.rate;
  r.rate += Math.abs(d) <= ROTOR_SPINUP ? d : Math.sign(d) * ROTOR_SPINUP;
  r.body.angularVel = r.rate;

  if (r.dwellT > 0) {
    r.dwellT--;
    r.body.velocity = new Vec2(0, 0);
  } else {
    const dy = r.yTarget - r.y;
    const stepY = r.lift / 60;
    if (Math.abs(dy) <= stepY) {
      r.y = r.yTarget;
      r.body.velocity = new Vec2(0, 0);
      r.arrived = true;              // the caller decides whether to re-roll
    } else {
      const vy = Math.sign(dy) * r.lift;
      r.y += vy / 60;
      r.body.velocity = new Vec2(0, vy);
    }
  }
  // Keep the hub pinned to its column; the spin must not walk it sideways.
  r.body.position = new Vec2(r.cfg.x, r.y);
}

// In-round stepping: re-rolls direction, speed and travel target from the
// seeded stream as the timers expire, including reversals that fling a dummy
// back the way it came mid-slide.
function stepRotors() {
  for (const r of _rotors) {
    if (--r.holdT <= 0) {
      const was = r.target;
      rollRotor(r);
      if (was * r.target < 0) {
        _fx.push({ x: r.cfg.x, y: r.y, life: 16, color: "248,81,73" });
      }
    }
    r.arrived = false;
    driveRotor(r);
    if (r.arrived) {
      r.dwellT = ROTOR_DWELL_MIN + Math.floor(_rng() * ROTOR_DWELL_VAR);
      rollRotorLift(r);
    }
  }
}

// Post-round coasting: keep turning and travelling on the settings already
// rolled, but touch the RNG. On arrival the rotor simply bounces back to the
// other end of its shaft, which needs no fresh randomness.
function coastRotors() {
  for (const r of _rotors) {
    r.arrived = false;
    driveRotor(r);
    if (r.arrived) {
      const { yMin, yMax } = r.cfg;
      r.yTarget = Math.abs(r.y - yMin) < Math.abs(r.y - yMax) ? yMax : yMin;
    }
  }
}

// ── Ball cannons ─────────────────────────────────────────────────────────
// Muzzles that ride up and down the side walls, telegraph, then lob a heavy
// ball across the arena on a seeded elevation. These are the only hazard that
// crosses the upper decks horizontally, so the gallery crowd can't just stand
// still and outlast the vertical geyser columns. The vertical travel is what
// keeps a volley from raking the same single row over and over — a fixed-height
// muzzle only ever threatened whichever deck it happened to sit level with.

// Seed a fresh height for a muzzle to crawl toward, at least CANNON_COLUMN away
// from where it is now so it visibly travels instead of jittering in place.
//
// Exactly two _rng() draws, always. A rejection-sampling loop here (retry until
// the candidate is far enough) consumed a variable number of draws depending on
// the muzzle's current height — and since that height advances only between
// shots, and shots are gated by a live-body cap, physics state leaked into the
// seeded stream and the same round could produce a different winner.
function rollCannonLift(c) {
  const { yMin, yMax } = c.cfg;
  let y = yMin + _rng() * (yMax - yMin);
  if (Math.abs(y - c.y) < CANNON_COLUMN) {
    // Too close to bother travelling: reflect to the far half of the rail,
    // which is guaranteed to be a real trip and costs no extra randomness.
    y = y < (yMin + yMax) / 2 ? yMax - (y - yMin) : yMin + (yMax - y);
  }
  c.yTarget = y;
  c.lift = CANNON_LIFT_MIN + _rng() * CANNON_LIFT_VAR;
}

function armCannons() {
  _cannons = CANNONS.map((cfg, i) => {
    // Two muzzles share each wall — stagger their start heights so they cover
    // different bands rather than sitting on top of each other.
    const frac = (i < 2 ? 0.28 : 0.72);
    const c = {
      cfg,
      state: "idle",
      t: _runT + 20 + i * 30 + Math.floor(_rng() * 60),
      y: cfg.yMin + (cfg.yMax - cfg.yMin) * frac,
      yTarget: 0,
      lift: 0,
    };
    rollCannonLift(c);
    return c;
  });
}

function fireCannon(c) {
  // Seeded draws come first and are unconditional — see dropBoulder for why a
  // cap check must never gate an _rng() call.
  const speed = CANNON_SPEED + _rng() * CANNON_SPEED_VAR;
  // Elevation spans both ways around level, so a high muzzle can also shoot
  // down onto a lower deck instead of only lobbing upward.
  const elev = (_rng() * 2 - 1) * CANNON_AIM;
  if (_balls.length >= CANNON_MAX) return;

  const cfg = c.cfg;
  const ball = new Body(BodyType.DYNAMIC,
    new Vec2(cfg.x + cfg.dir * (CANNON_R + 4), c.y));
  // No explicit Material on a Circle is fine (the P53 tunneling bug is
  // Polygon-only), and the ball needs the heft to bowl a rig over.
  ball.shapes.add(new Circle(CANNON_R, undefined,
    new Material(0.4, 0.35, 0.45, 6, 0.01)));
  try { ball.userData._colorIdx = 4; } catch (_) { /* worker proxy */ }
  ball.isBullet = true;
  ball.space = _space;
  ball.velocity = new Vec2(
    cfg.dir * speed * Math.cos(elev),
    -speed * Math.sin(elev),
  );
  _balls.push({ body: ball, life: CANNON_LIFE });
  _fx.push({ x: cfg.x, y: c.y, life: 20, color: "163,113,247" });
  doShake(4, 0.18);
}

function stepCannons() {
  for (const c of _cannons) {
    // Crawl toward the current target height; a muzzle holds still through its
    // telegraph so the flash marks where the shot will actually come from.
    if (c.state !== "warn") {
      const dy = c.yTarget - c.y;
      const stepY = c.lift / 60;
      if (Math.abs(dy) <= stepY) rollCannonLift(c);
      else c.y += Math.sign(dy) * stepY;
    }

    if (c.state === "idle" && _runT >= c.t) {
      c.state = "warn";
      c.t = _runT + CANNON_WARN;
    } else if (c.state === "warn" && _runT >= c.t) {
      fireCannon(c);
      c.state = "idle";
      c.t = _runT + CANNON_MIN_GAP + Math.floor(_rng() * CANNON_VAR);
      rollCannonLift(c);
    }
  }
  // Retire spent balls so the cap always has room for the next volley.
  for (let i = _balls.length - 1; i >= 0; i--) {
    const b = _balls[i];
    if (--b.life <= 0 || !b.body.space || b.body.position.y > DESPAWN_Y) {
      if (b.body.space) b.body.space = null;
      _balls.splice(i, 1);
    }
  }
}

function dropPlatforms() {
  for (const b of _plats) if (b.space) b.space = null;
  _plats = [];
  doShake(7, 0.3);
}

function startCollapse() {
  // Fully random crumble order — a seeded Fisher-Yates shuffle of every tile
  // index. The floor used to eat itself in one of three geometric patterns
  // (outside-in, a directional sweep, inside-out); those all telegraphed which
  // patch was safe next, and the shrinking-island one in particular herded
  // every survivor into the same predictable huddle. A random order means holes
  // open under the crowd as readily as at the edges, and no tile can be read as
  // safe just from where the last one fell.
  const order = Array.from({ length: TILE_N }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(_rng() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
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
    else if (w.id === "cannons") armCannons();
    else if (w.id === "hail") armHail();
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
    "Battle-royale spectator sport with <b>50 numbered ragdolls</b> standing to attention across five " +
    "decks. The world holds its breath until you make your one decision (click a dummy to bet on it, " +
    "<b>Space</b> picks at random) — then a seeded hazard schedule eats the arena: telegraphed <b>geyser</b> " +
    "blasts, <b>ball cannons</b> that ride up and down the walls, <b>rockfall</b> from telegraphed ceiling " +
    "hatches, platforms yanked from under everyone, <b>kinematic rotors</b> that reverse at random while " +
    "riding their shafts, and a floor that <b>crumbles in random order</b> into the void. Damage is " +
    "measured, not scripted — hard contacts bruise via " +
    "<code>totalContactsImpulse</code>, necks/shoulders/hips are <b>breakable constraints</b> that tear " +
    "off under violent yanks, and 0% is a KO. Last dummy in play wins; the banner grades your bet by " +
    "placement. Per-rig <code>InteractionGroup</code> keeps 500 ragdoll parts colliding with each other " +
    "but never with themselves. Every round reseeds — <b>R</b> restarts.",
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
    _held = false;
    _hail = [];
    _hatches = [];
    _rotors = [];
    _cannons = [];
    _balls = [];
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
    for (let i = 0; i < _spinCds.length; i++) {
      if (_spinCds[i] > 0) _spinCds[i]--;
    }

    if (_phase === "count") {
      if (--_countT <= 0) {
        _phase = "run";
        _runT = 0;
        // GO — the pins come off and 50 rigs lose their footing at once.
        releasePose();
        addFloater(SCREEN_W / 2, 170, "GO!", "#7ee787", true);
      }
    } else if (_phase === "run") {
      _runT++;
      stepWaves();
      stepGeysers();
      stepCannons();
      stepHail();
      // Rotors draw from the seeded stream (direction rolls, lift targets), so
      // they may only be stepped while the round is running. Ticking them in
      // "done" too would burn RNG for as many frames as the victory screen
      // happens to stay up, desyncing the next round's schedule from its seed.
      stepRotors();
      stepCollapse();
      drainBreaks();
      checkImpacts();
      checkEliminations();
      sweepFallen();
    } else if (_phase === "done") {
      // Keep the rotors turning through the victory lap — a frozen hazard reads
      // as a broken demo. coastRotors() holds the last rolled settings rather
      // than drawing new ones, so it stays out of the seeded stream. The hail
      // hatches deliberately stop firing (that WOULD draw from the stream);
      // boulders already in the air simply finish falling under gravity.
      coastRotors();
      retireHail();
      drainBreaks();
      sweepFallen();
    }
  },

  click(x, y) {
    _runnerRef = this._runner ?? _runnerRef;
    if (_phase === "done") { enterRound(_round + 1); return; }
    if (_phase !== "pick" && _phase !== "count") return;
    // Tight radius — at RIG_PITCH spacing a generous grab would keep snapping
    // to a neighbour instead of the dummy under the cursor.
    let best = null, bestD = 26;
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
      collapseOrder: () => _collapseOrder,
      plats: () => _plats,
      hatches: () => _hatches,
      hail: () => _hail,
      rotors: () => _rotors,
      cannons: () => _cannons,
      balls: () => _balls,
      held: () => _held,
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
  drawCannons(ctx);
  drawPlatWarn(ctx);
  drawCollapseWarn(ctx);
  drawHatches(ctx);
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

// Muzzles are always visible once armed (so the threat is legible) and flash
// during their telegraph window. Each rides its own wall rail, drawn faintly so
// the vertical travel is readable as movement along a track.
function drawCannons(ctx) {
  for (const c of _cannons) {
    const cfg = c.cfg;
    const warn = c.state === "warn";
    const t = warn ? 1 - (c.t - _runT) / CANNON_WARN : 0;

    // Rail.
    ctx.strokeStyle = "rgba(163,113,247,0.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cfg.x, cfg.yMin);
    ctx.lineTo(cfg.x, cfg.yMax);
    ctx.stroke();

    ctx.fillStyle = warn
      ? `rgba(163,113,247,${(0.4 + t * 0.6).toFixed(3)})`
      : "rgba(163,113,247,0.35)";
    ctx.fillRect(cfg.dir > 0 ? cfg.x - 8 : cfg.x - 12, c.y - 9, 20, 18);
    if (!warn) continue;
    // Charging muzzle flash: a growing wedge pointing down the barrel.
    ctx.strokeStyle = `rgba(163,113,247,${(0.3 + t * 0.7).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cfg.x + cfg.dir * 14, c.y);
    ctx.lineTo(cfg.x + cfg.dir * (14 + 26 * t), c.y - 12 * t);
    ctx.moveTo(cfg.x + cfg.dir * 14, c.y);
    ctx.lineTo(cfg.x + cfg.dir * (14 + 26 * t), c.y + 12 * t);
    ctx.stroke();
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

// Ceiling hatches: a permanent mouth once armed, and during the telegraph a
// widening pair of jaws plus a drop line down the column the rock will fall
// through, sized to the boulder that is about to come out.
function drawHatches(ctx) {
  for (const h of _hatches) {
    const warn = h.state === "warn";
    const t = warn ? 1 - (h.t - _runT) / HAIL_WARN : 0;

    ctx.fillStyle = warn
      ? `rgba(248,81,73,${(0.35 + t * 0.65).toFixed(3)})`
      : "rgba(248,81,73,0.3)";
    ctx.fillRect(h.x - 16, CEIL_Y - 6, 32, 6);
    if (!warn) continue;

    // Jaws opening to exactly the boulder's width.
    ctx.strokeStyle = `rgba(248,81,73,${(0.4 + t * 0.6).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(h.x - 16, CEIL_Y);
    ctx.lineTo(h.x - h.r * t, CEIL_Y + 7 * t);
    ctx.moveTo(h.x + 16, CEIL_Y);
    ctx.lineTo(h.x + h.r * t, CEIL_Y + 7 * t);
    ctx.stroke();

    // Drop line: a thin centre thread marking the column. Deliberately faint
    // and hairline — an earlier version drew it at the boulder's full width and
    // two of them shouted over the entire arena, hiding the actual carnage.
    ctx.strokeStyle = `rgba(248,81,73,${(0.10 + t * 0.22).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 13]);
    ctx.beginPath();
    ctx.moveTo(h.x, CEIL_Y + 8);
    ctx.lineTo(h.x, FLOOR_Y - 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Shaft + hub dot + a direction arc, so both the vertical travel and a spin
// reversal are visible immediately rather than only in the blades' motion.
function drawRotorHubs(ctx) {
  for (const r of _rotors) {
    if (!r.body.space) continue;
    const { x, yMin, yMax } = r.cfg;

    // The shaft the hub rides, plus a tick at the height it is heading for.
    ctx.strokeStyle = "rgba(248,81,73,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, yMin);
    ctx.lineTo(x, yMax);
    ctx.stroke();
    ctx.strokeStyle = "rgba(248,81,73,0.4)";
    ctx.beginPath();
    ctx.moveTo(x - 5, r.yTarget);
    ctx.lineTo(x + 5, r.yTarget);
    ctx.stroke();

    ctx.fillStyle = "#f85149";
    ctx.beginPath();
    ctx.arc(x, r.y, 6, 0, Math.PI * 2);
    ctx.fill();

    const cw = r.rate >= 0;
    const span = Math.min(2.2, 0.5 + Math.abs(r.rate) * 0.7);
    ctx.strokeStyle = "rgba(248,81,73,0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, r.y, 15, cw ? -0.5 : -0.5 - span, cw ? -0.5 + span : -0.5);
    ctx.stroke();
    // Arrowhead at the leading end of the arc.
    const tip = cw ? -0.5 + span : -0.5 - span;
    const tx = x + Math.cos(tip) * 15;
    const ty = r.y + Math.sin(tip) * 15;
    const tang = tip + (cw ? Math.PI / 2 : -Math.PI / 2);
    ctx.fillStyle = "rgba(248,81,73,0.85)";
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(tang) * 6, ty + Math.sin(tang) * 6);
    ctx.lineTo(tx + Math.cos(tang + 2.5) * 5, ty + Math.sin(tang + 2.5) * 5);
    ctx.lineTo(tx + Math.cos(tang - 2.5) * 5, ty + Math.sin(tang - 2.5) * 5);
    ctx.closePath();
    ctx.fill();
  }
}

// The champion always wears its number and crown. Fifty numbers over a packed
// arena is illegible mush, so the rest of the field only gets badges once the
// crowd has thinned to BADGE_ALL_AT — before that the pick is what matters.
const BADGE_ALL_AT = 12;

function drawBadges(ctx) {
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  const showAll = _phase === "pick" || aliveCount() <= BADGE_ALL_AT;
  for (const d of _dummies) {
    if (d.out || !d.torso.body.space) continue;
    const isPick = d.idx === _champion;
    if (!isPick && !showAll) continue;
    const p = d.torso.body.position;
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
