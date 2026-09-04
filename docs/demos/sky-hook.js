import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  PivotJoint, AngleJoint, InteractionFilter, InteractionType,
  CbEvent, CbType, ConstraintListener, InteractionListener,
} from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

// ---------------------------------------------------------------------------
// Sky Hook — helicopter medevac mini-game.
//
// THREE ragdoll patients are stranded across a 7000px canyon — one on the
// valley floor at the far west, one on top of a lone tower to the east, one
// on the ground at the far east end. The hospital pad sits in the MIDDLE of
// the map and the player's physical helicopter (arrows/WASD, full
// flight-assist: hover, velocity targets, banking tilt) lifts off from it,
// trailing a real chain-link rope with a hook. Hover the hook next to a
// patient, press SPACE to winch him into the harness, carry him — swinging
// under the chopper like any slung load — back to the hospital and release
// over the pad. Repeat until all three are home.
//
// The course is a gauntlet in both directions — and the ceiling is NOT a
// free highway: nine blocks hang from the sky lid, the bridge pylons reach
// all the way up (the underpass is the only way through), a hanger caps
// the wrecking-ball gantry so the balls must be threaded, and two of the
// five rotors spin just under the lid. The rest: a tower slalom with a
// slow I-rotor in the gap, a slow X-rotor whose only cargo lane is a
// slow climb over the top, two patrolling kinematic platforms and a fast
// fan guarding the far-east approach.
//
// The cargo is fragile, exactly like Crash Test Hero's dummy: each
// patient's neck, shoulders and hips are real breakable constraints. Slam
// him into an obstacle and limbs tear off (–20% each, the neck is –60%);
// any patient at 0% loses the mission. Yank the rope hard enough — full
// speed while the patient is snagged behind a pylon — and the harness
// itself snaps and drops him. The chopper is mortal too: EVERY hard
// contact chips its hull (measured contact Δv), rotor hazards take a fixed
// bite, and at 0% hull — or one truly catastrophic slam — it drops out of
// the sky. R restarts.
//
// Engine features showcased:
//   * Slung-load physics — a chain of PivotJoint rope links hanging off a
//     flying dynamic body; the load swings, drapes over obstacles and
//     yanks back on the carrier.
//   * Constraint breaking — neck/shoulders/hips AND the cargo harness are
//     PivotJoints with maxForce + breakUnderForce + removeOnBreak,
//     observed via a ConstraintListener(CbEvent.BREAK). Break thresholds
//     are derived from measured chain weights (mass × gravity × k), so
//     steady hanging never snaps and violent yanks always do.
//   * body.totalContactsImpulse() — per-step contact Δv drives camera
//     shake, patient bruises AND the chopper's hull damage.
//   * InteractionFilter groups — rope collides with the world only (never
//     the chopper or the patients), the ragdolls never self-collide.
//   * KINEMATIC rotors (X / I / cross at mixed speeds), KINEMATIC patrol
//     platforms and free pendulum wrecking balls as moving hazards.
//   * Camera follow + shakeCamera via the DemoRunner host.
// ---------------------------------------------------------------------------

// Named SCREEN_W/SCREEN_H — the CodePen runtime declares its own `W`/`H`
// and a duplicate top-level would throw SyntaxError (see top-down-shooter.js).
const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 40;

// ── World ────────────────────────────────────────────────────────────────
const WORLD_W = 7000;
const WORLD_H = 900;
const GROUND_Y = 800;                // ground top — the valley floor
const GRAVITY = 700;

// Hospital rooftop pad — dead centre of the map; the chopper starts here.
const HOSPITAL = { x0: 3320, x1: 3580, top: 560 };

// The three stranded patients: far-west valley floor, the lone east tower
// top, and the far-east valley floor behind the fast fan.
const PATIENT_SPOTS = [
  { x: 280, standY: GROUND_Y, zx0: 160, zx1: 400 },
  { x: 5220, standY: 400, zx0: 5150, zx1: 5290 },
  { x: 6720, standY: GROUND_Y, zx0: 6600, zx1: 6840 },
];

// ── Obstacles ────────────────────────────────────────────────────────────
// Towers to weave over — three west of the hospital, one east.
const TOWERS = [
  { x: 660, w: 64, top: 540 },
  { x: 920, w: 64, top: 430 },
  { x: 1160, w: 64, top: 560 },
  { x: 3900, w: 64, top: 560 },
];
// The lone tower the second patient is stranded on.
const PATIENT_TOWER = { x0: 5140, x1: 5300, top: 400 };
// A bridge underpass — its pylons reach all the way to the sky lid, so the
// underpass is the ONLY way through; the piers hang from the deck
// viaduct-style, so the space beneath them stays open (pierBottom → ground).
// (pier stubs end at 470: the carried patient hangs ~250 below the chopper,
// so the under-pier corridor 470→800 leaves ~80px of play — tight, on purpose)
const BRIDGE = {
  x0: 1420, x1: 1920, deckY: 372, deckH: 28,
  pierXs: [1540, 1760], pierW: 40, pierBottom: 470,
  antennaXs: [1560, 1780], antennaTop: 0,
};
// A gantry with two hanging wrecking balls (in phase, so they never clack
// into each other) whose lowest sweep leaves only a sliver of air above
// the ground-clearance limit of the hanging cargo.
const GANTRY = { x0: 2020, x1: 2340, y: 210, h: 24 };
const BALLS = [
  { px: 2080, len: 230, r: 28, a0: 0.9 },
  { px: 2280, len: 230, r: 28, a0: 0.9 },
];
// Blocks hanging down from the sky lid — they break up the ceiling lane so
// hugging the top is never a free ride. Depths are tuned so every cargo
// route stays flyable: the deep ones sit where the carry is already low,
// and the one over the gantry (bottom 170 vs beam top 210) seals the
// over-the-beam route so the wrecking balls must be threaded.
const HANGERS = [
  { x0: 430, x1: 510, bottom: 360 },
  { x0: 1250, x1: 1330, bottom: 300 },
  { x0: 2140, x1: 2220, bottom: 170 },
  { x0: 2520, x1: 2600, bottom: 340 },
  { x0: 3050, x1: 3130, bottom: 300 },
  { x0: 4150, x1: 4230, bottom: 380 },
  { x0: 4520, x1: 4600, bottom: 200 },
  { x0: 5600, x1: 5680, bottom: 300 },
  { x0: 6520, x1: 6600, bottom: 320 },
];
// Kinematic rotors: slow I in the west tower gap, slow X west of the
// hospital (its only cargo lane is a slow climb over the top, heli ≤230),
// a slow ceiling cross and a slow ceiling I on the eastern run, and the
// fast fan guarding the final far-east approach. Touching any of them
// bites the hull / patient.
const SPINNERS = [
  { x: 1072, y: 640, half: 80, rate: -0.8, kind: "I" },
  { x: 2880, y: 620, half: 110, rate: 0.85, kind: "X" },
  { x: 4900, y: 150, half: 100, rate: -0.9, kind: "+" },
  { x: 5450, y: 160, half: 80, rate: 0.9, kind: "I" },
  { x: 6280, y: 665, half: 125, rate: 3.2, kind: "+" },
];
// Kinematic patrol platforms — a vertical piston east of the hospital and
// a horizontal drifter in front of the fast fan.
const MOVERS = [
  { axis: "y", x: 4560, y: 490, min: 340, max: 640, w: 96, h: 24, speed: 95 },
  { axis: "x", x: 6000, y: 500, min: 5850, max: 6150, w: 110, h: 24, speed: 80 },
];

// ── Helicopter flight assist ─────────────────────────────────────────────
// step() steers toward a target velocity from the pressed keys: the force
// is m·k·(v_target − v) plus exact gravity compensation, so releasing the
// keys means "hover", not "fall". Banking is cosmetic — a servo tilts the
// fuselage into the lateral velocity.
const FUSE_W = 84, FUSE_H = 28;
const MAX_VX = 300;                  // px/s lateral
const MAX_UP = 240, MAX_DOWN = 220;  // px/s vertical
const ACCEL_K = 3.4;                 // 1/s — velocity-approach stiffness
const TILT_MAX = 0.3;                // rad at full lateral speed
const HELI_MAT = () => new Material(0, 0.3, 0.4, 3, 0.01);

// ── Rope ─────────────────────────────────────────────────────────────────
const LINKS = 6;
const LINK_W = 5, LINK_H = 18;       // pivots overlap 2px → 16px per link
const LINK_SPACING = LINK_H - 2;
const HOOK_R = 7;
const HOOK_RADIUS = 60;              // attach reach around the hook
const LINK_MAT = () => new Material(0, 0.4, 0.5, 4, 0.01);
const HOOK_MAT = () => new Material(0, 0.4, 0.5, 6, 0.01);

// ── Patients (the shared ragdoll rig, same proportions as ragdoll.js) ───
const TORSO_W = 24, TORSO_H = 48;
const HEAD_R = 12;
const ARM_LEN = 28, ARM_W = 8;
const LEG_LEN = 32, LEG_W = 10;

// Break thresholds as multiples of the hanging chain's steady weight-force
// (mass × gravity): scale-free, so the joints hold any amount of calm
// hanging/swinging and only snap on violent multi-g yanks.
const NECK_G = 30;                   // × head weight
const ARM_G = 26;                    // × whole-arm weight
const LEG_G = 26;                    // × whole-leg weight
const HARNESS_G = 5;                 // × whole-dummy weight — above any calm
                                     //   carry/swing load (~2-3×), but a
                                     //   full-power tug against a snagged
                                     //   patient exceeds it and drops him

const DMG_LIMB = 20;                 // integrity loss per torn limb
const DMG_NECK = 60;                 // ...the neck is nearly fatal
const BRUISE_DV = 300;               // direct-hit Δv (px/s) before bruising
const BRUISE_SCALE = 0.05;           // integrity %/px/s over the threshold
const BRUISE_MAX = 25;               // cap per hit
const BRUISE_COOLDOWN = 30;          // frames per part between bruises

// ── Impact → hull damage / camera shake / chopper wreck ─────────────────
// totalContactsImpulse ÷ mass = this step's contact Δv, scale-free again.
// EVERY contact past HULL_DV chips the hull; rotor blades take a fixed
// bite; a single catastrophic slam still wrecks the chopper outright.
const HULL_DV = 100;                 // px/s contact Δv before hull damage
const HULL_SCALE = 0.12;             // hull %/px/s over the threshold
const HULL_HIT_MAX = 30;             // cap per hit
const HULL_COOLDOWN = 20;            // frames between hull chips
const HELI_SHAKE_DV = 120;           // hard landing / obstacle clip
const HELI_WRECK_DV = 380;           // beyond any survivable slam
const DUMMY_SHAKE_DV = 260;
const SPIN_DMG_HELI = 30;            // hull loss per rotor-blade strike
const SPIN_DMG_PATIENT = 30;         // integrity loss per rotor-blade hit
const SPIN_HIT_COOLDOWN = 45;        // frames between rotor bites

const WIN_ZONE_FRAMES = 50;          // patient calm on the pad this long → in
const WIN_SPEED = 50;

// ── Collision groups ─────────────────────────────────────────────────────
// world/static/hazards: default group 1. Chopper: 2. Ragdolls: bit 8 with a
// negative group so limbs never self-collide. Rope: negative group, world
// mask only — it must never tangle with its own carrier or its own cargo.
const F_HELI = () => new InteractionFilter(2, 1 | 8);
const F_ROPE = () => new InteractionFilter(-4, 1);
const F_DUMMY = () => new InteractionFilter(-8, 1 | 2);

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
let _runnerRef = null;
let _cbBreakable = null;
let _cbSpin = null;
let _cbHeli = null;
let _cbDummy = null;
let _spinHeliCd = 0;
let _spinDummyCd = 0;
let _hullCd = 0;

let _phase = "run";                  // "run" | "won" | "lost"
let _lostReason = "";
let _grade = "";
let _hull = 100;
let _t0 = 0;                         // space.elapsedTime at run start
let _finalTime = 0;
let _tick = 0;

let _heli = null;                    // Body
let _wrecked = false;
let _wreckT = 0;
let _links = [];                     // rope link Bodies, top → bottom
let _ropeJoints = [];
let _hook = null;                    // Body
let _harness = null;                 // PivotJoint while cargo attached
let _harnessT = 0;                   // frames since attach (soft-catch window)
let _hooked = null;                  // the patient currently in the harness

let _patients = [];                  // [{ torso, head, parts, joints, mass,
                                     //    integrity, everHooked, rescued, winT }]
let _breakables = new Map();         // pivot → { angle, label, dmg, pIdx }
const _pendingBreaks = [];

let _balls = [];                     // pendulum ball Bodies
let _spinners = [];                  // [{ body, cfg }]
let _movers = [];                    // [{ body, cfg }]

let _shakeCount = 0;                 // headless-test observability
let _steer = null;                   // pointer-held fly-to target
let _mouse = null;

const keys = {};
let _lastKeyDown = null;
let _lastKeyUp = null;

const _floaters = [];
const _fx = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addFloater(x, y, text, color) {
  _floaters.push({ x, y, text, color, life: 70 });
  if (_floaters.length > 16) _floaters.shift();
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

function rescuedCount() {
  let n = 0;
  for (const p of _patients) if (p.rescued) n++;
  return n;
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

function staticBox(x0, y0, x1, y1, colorIdx) {
  const b = new Body(BodyType.STATIC);
  b.shapes.add(new Polygon(
    Polygon.rect(x0, y0, x1 - x0, y1 - y0),
    new Material(0, 0.6, 0.8, 1, 0.01),
  ));
  if (colorIdx !== undefined) {
    try { b.userData._colorIdx = colorIdx; } catch (_) { /* worker proxy */ }
  }
  b.space = _space;
  return b;
}

function spawnTerrain() {
  // Ground, side walls and an invisible sky lid so the chopper can't leave.
  staticBox(-40, GROUND_Y, WORLD_W + 40, WORLD_H);
  staticBox(-40, -40, 0, WORLD_H);
  staticBox(WORLD_W, -40, WORLD_W + 40, WORLD_H);
  staticBox(-40, -40, WORLD_W + 40, 0);

  for (const t of TOWERS) staticBox(t.x, t.top, t.x + t.w, GROUND_Y);
  staticBox(PATIENT_TOWER.x0, PATIENT_TOWER.top, PATIENT_TOWER.x1, GROUND_Y);

  // Bridge: deck + hanging piers + the antennas that force the underpass.
  staticBox(BRIDGE.x0, BRIDGE.deckY, BRIDGE.x1, BRIDGE.deckY + BRIDGE.deckH);
  for (const px of BRIDGE.pierXs) {
    staticBox(px, BRIDGE.deckY + BRIDGE.deckH, px + BRIDGE.pierW, BRIDGE.pierBottom);
  }
  for (const ax of BRIDGE.antennaXs) {
    staticBox(ax - 5, BRIDGE.antennaTop, ax + 5, BRIDGE.deckY);
  }

  // Wrecking-ball gantry beam.
  staticBox(GANTRY.x0, GANTRY.y, GANTRY.x1, GANTRY.y + GANTRY.h);

  // Blocks hanging from the sky lid.
  for (const hg of HANGERS) staticBox(hg.x0, 0, hg.x1, hg.bottom);

  // Hospital building under the pad.
  staticBox(HOSPITAL.x0, HOSPITAL.top, HOSPITAL.x1, GROUND_Y);
}

function spawnHazards() {
  _balls = [];
  for (const cfg of BALLS) {
    const bx = cfg.px + Math.sin(cfg.a0) * cfg.len;
    const by = GANTRY.y + GANTRY.h + Math.cos(cfg.a0) * cfg.len;
    const ball = new Body(BodyType.DYNAMIC, new Vec2(bx, by));
    ball.shapes.add(new Circle(cfg.r, undefined,
      new Material(0.3, 0.3, 0.4, 8, 0.005)));
    try { ball.userData._colorIdx = 3; } catch (_) { /* worker proxy */ }
    ball.space = _space;
    new PivotJoint(_space.world, ball,
      new Vec2(cfg.px, GANTRY.y + GANTRY.h), new Vec2(0, 0)).space = _space;
    _balls.push(ball);
  }

  _spinners = [];
  for (const cfg of SPINNERS) {
    const b = new Body(BodyType.KINEMATIC, new Vec2(cfg.x, cfg.y));
    const arm = cfg.half * 2;
    if (cfg.kind === "X") {
      b.shapes.add(new Polygon(rotatedBox(arm, 14, Math.PI / 4)));
      b.shapes.add(new Polygon(rotatedBox(arm, 14, -Math.PI / 4)));
    } else if (cfg.kind === "I") {
      b.shapes.add(new Polygon(Polygon.box(14, arm)));
    } else {
      b.shapes.add(new Polygon(Polygon.box(arm, 14)));
      b.shapes.add(new Polygon(Polygon.box(14, arm)));
    }
    try { b.userData._colorIdx = 3; } catch (_) { /* worker proxy */ }
    b.cbTypes.add(_cbSpin);
    b.space = _space;
    b.angularVel = cfg.rate;
    _spinners.push({ body: b, cfg });
  }

  _movers = [];
  for (const cfg of MOVERS) {
    const b = new Body(BodyType.KINEMATIC, new Vec2(cfg.x, cfg.y));
    b.shapes.add(new Polygon(Polygon.box(cfg.w, cfg.h)));
    try { b.userData._colorIdx = 3; } catch (_) { /* worker proxy */ }
    b.space = _space;
    b.velocity = cfg.axis === "y"
      ? new Vec2(0, cfg.speed)
      : new Vec2(cfg.speed, 0);
    _movers.push({ body: b, cfg });
  }
}

// Rotors hold their spin and patrol platforms bounce between their bounds.
function driveHazards() {
  for (const s of _spinners) s.body.angularVel = s.cfg.rate;
  for (const m of _movers) {
    const b = m.body, cfg = m.cfg;
    if (cfg.axis === "y") {
      if (b.position.y <= cfg.min && b.velocity.y < 0) b.velocity = new Vec2(0, cfg.speed);
      else if (b.position.y >= cfg.max && b.velocity.y > 0) b.velocity = new Vec2(0, -cfg.speed);
    } else {
      if (b.position.x <= cfg.min && b.velocity.x < 0) b.velocity = new Vec2(cfg.speed, 0);
      else if (b.position.x >= cfg.max && b.velocity.x > 0) b.velocity = new Vec2(-cfg.speed, 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Helicopter + rope
// ---------------------------------------------------------------------------

function spawnHeli() {
  // Lifts off from the hospital pad — spawns hovering over it with the
  // whole chain dangling in free air above the rooftop.
  const x = (HOSPITAL.x0 + HOSPITAL.x1) / 2, y = HOSPITAL.top - 190;
  _heli = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const filter = F_HELI();
  const fuse = new Polygon(Polygon.box(FUSE_W, FUSE_H), HELI_MAT());
  fuse.filter = filter;
  _heli.shapes.add(fuse);
  const tail = new Polygon(Polygon.rect(-88, -8, 50, 12), HELI_MAT());
  tail.filter = filter;
  _heli.shapes.add(tail);
  try { _heli.userData._colorIdx = 4; } catch (_) { /* worker proxy */ }
  _heli.cbTypes.add(_cbHeli);
  _heli.space = _space;
  _wrecked = false;
  _wreckT = 0;

  // Rope: chain links pivoted end-to-end off the belly, hook at the bottom.
  _links = [];
  _ropeJoints = [];
  const bellyY = y + FUSE_H / 2;
  let prev = _heli;
  let prevAnchor = new Vec2(0, FUSE_H / 2);
  for (let i = 0; i < LINKS; i++) {
    const ly = bellyY + LINK_SPACING * i + LINK_H / 2;
    const link = new Body(BodyType.DYNAMIC, new Vec2(x, ly));
    const s = new Polygon(Polygon.box(LINK_W, LINK_H), LINK_MAT());
    s.filter = F_ROPE();
    link.shapes.add(s);
    try { link.userData._colorIdx = 5; } catch (_) { /* worker proxy */ }
    link.space = _space;
    const j = new PivotJoint(prev, link, prevAnchor, new Vec2(0, -LINK_H / 2 + 1));
    j.space = _space;
    _ropeJoints.push(j);
    prev = link;
    prevAnchor = new Vec2(0, LINK_H / 2 - 1);
    _links.push(link);
  }
  _hook = new Body(BodyType.DYNAMIC,
    new Vec2(x, bellyY + LINK_SPACING * LINKS + HOOK_R));
  const hs = new Circle(HOOK_R, undefined, HOOK_MAT());
  hs.filter = F_ROPE();
  _hook.shapes.add(hs);
  try { _hook.userData._colorIdx = 5; } catch (_) { /* worker proxy */ }
  _hook.space = _space;
  const hj = new PivotJoint(prev, _hook, prevAnchor, new Vec2(0, -HOOK_R + 1));
  hj.space = _space;
  _ropeJoints.push(hj);
}

// ---------------------------------------------------------------------------
// Patients — the shared ragdoll rig with breakable joints
// ---------------------------------------------------------------------------

function dummyPart(x, y, shape, colorIdx, pIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  shape.filter = F_DUMMY();
  body.shapes.add(shape);
  try {
    body.userData._colorIdx = colorIdx;
    body.userData._pIdx = pIdx;
  } catch (_) { /* worker proxy */ }
  body.cbTypes.add(_cbDummy);
  body.space = _space;
  return { body, bruiseCd: 0 };
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
// the angular spring. maxForce is set AFTER the rig exists, from measured
// chain masses (see registerBreakable).
function addBreakablePivot(b1, b2, a1, a2, joints) {
  const j = new PivotJoint(b1, b2, a1, a2);
  j.removeOnBreak = true;
  j.cbTypes.add(_cbBreakable);
  j.space = _space;
  joints.push(j);
  return j;
}

function registerBreakable(pivot, angle, label, dmg, carriedMass, gMult, pIdx) {
  pivot.maxForce = carriedMass * GRAVITY * gMult;
  pivot.breakUnderForce = true;
  _breakables.set(pivot, { angle, label, dmg, pIdx });
}

function spawnPatient(pIdx, spot) {
  const joints = [];
  const x = spot.x;
  // Feet on the ground / tower top; he slumps into a heap while the player
  // flies over, which is half the charm.
  const torsoY = spot.standY - LEG_LEN * 2 - TORSO_H / 2 + 6;

  const torso = dummyPart(x, torsoY,
    new Polygon(Polygon.box(TORSO_W, TORSO_H)), 0, pIdx);
  // Rolling friction on the head or a torn-off one rolls forever.
  const head = dummyPart(x, torsoY - TORSO_H / 2 - HEAD_R - 2,
    new Circle(HEAD_R, undefined, new Material(0.1, 0.5, 0.7, 1, 0.4)), 0, pIdx);

  const neck = addBreakablePivot(torso.body, head.body,
    new Vec2(0, -TORSO_H / 2 - 1), new Vec2(0, HEAD_R - 1), joints);
  const neckAngle = addAngle(torso.body, head.body, -0.6, 0.6, joints);
  registerBreakable(neck, neckAngle, "NECK SNAP", DMG_NECK,
    head.body.mass, NECK_G, pIdx);

  const limbs = [];
  for (const side of [-1, 1]) {
    const ax = x + side * (TORSO_W / 2 + ARM_W / 2 + 1);
    const upper = dummyPart(ax, torsoY - TORSO_H / 2 + 8 + ARM_LEN / 2,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)), 1, pIdx);
    const lower = dummyPart(ax, upper.body.position.y + ARM_LEN,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)), 1, pIdx);

    const shoulder = addBreakablePivot(torso.body, upper.body,
      new Vec2(side * (TORSO_W / 2 - 2), -TORSO_H / 2 + 8),
      new Vec2(0, -ARM_LEN / 2 + 1), joints);
    const shoulderAngle = addAngle(torso.body, upper.body, -2.2, 2.2, joints);
    registerBreakable(shoulder, shoulderAngle, "ARM OFF", DMG_LIMB,
      upper.body.mass + lower.body.mass, ARM_G, pIdx);

    addPivot(upper.body, lower.body,
      new Vec2(0, ARM_LEN / 2 - 1), new Vec2(0, -ARM_LEN / 2 + 1), joints);
    addAngle(upper.body, lower.body,
      side > 0 ? -0.1 : -2.4, side > 0 ? 2.4 : 0.1, joints);
    limbs.push(upper, lower);
  }

  for (const side of [-1, 1]) {
    const upper = dummyPart(x + side * 6, torsoY + TORSO_H / 2 + LEG_LEN / 2 - 2,
      new Polygon(Polygon.box(LEG_W, LEG_LEN)), 1, pIdx);
    const lower = dummyPart(upper.body.position.x, upper.body.position.y + LEG_LEN,
      new Polygon(Polygon.box(LEG_W, LEG_LEN)), 1, pIdx);

    const hip = addBreakablePivot(torso.body, upper.body,
      new Vec2(side * 6, TORSO_H / 2 - 3), new Vec2(0, -LEG_LEN / 2 + 1), joints);
    const hipAngle = addAngle(torso.body, upper.body, -1.8, 1.8, joints);
    registerBreakable(hip, hipAngle, "LEG OFF", DMG_LIMB,
      upper.body.mass + lower.body.mass, LEG_G, pIdx);

    addPivot(upper.body, lower.body,
      new Vec2(0, LEG_LEN / 2 - 1), new Vec2(0, -LEG_LEN / 2 + 1), joints);
    addAngle(upper.body, lower.body, -0.1, 2.0, joints);
    limbs.push(upper, lower);
  }

  const parts = [torso, head, ...limbs];
  return {
    torso, head, parts, joints,
    mass: parts.reduce((m, p) => m + p.body.mass, 0),
    integrity: 100,
    everHooked: false,
    rescued: false,
    winT: 0,
  };
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

function tryToggleHook() {
  if (_phase !== "run" || _wrecked || !_hook || _patients.length === 0) return;
  if (_harness) {
    _breakables.delete(_harness);
    if (_harness.space) _harness.space = null;
    _harness = null;
    _hooked = null;
    addFloater(_hook.position.x, _hook.position.y - 20, "RELEASED", "#7ee787");
    return;
  }
  const hp = _hook.position;
  let target = null;
  for (const p of _patients) {
    if (p.rescued || !p.torso.body.space) continue;
    for (const part of p.parts) {
      if (!part.body.space) continue;
      const pos = part.body.position;
      if (Math.hypot(hp.x - pos.x, hp.y - pos.y) < HOOK_RADIUS) { target = p; break; }
    }
    if (target) break;
  }
  if (!target) return;
  // Soft catch: the harness starts as a springy joint so winching the
  // patient off the ground is a tug, not an instant rigid snap that whips
  // him into the terrain. step() stiffens it (and only then arms the
  // break threshold) once he has settled into the strap.
  _harness = new PivotJoint(_hook, target.torso.body,
    new Vec2(0, 0), new Vec2(0, -TORSO_H / 2 + 2));
  _harness.stiff = false;
  _harness.frequency = 5;
  _harness.damping = 1;
  _harness.removeOnBreak = true;
  _harness.cbTypes.add(_cbBreakable);
  _harness.space = _space;
  _harnessT = 0;
  _hooked = target;
  target.everHooked = true;
  const tp = target.torso.body.position;
  addFloater(tp.x, tp.y - 30, "HOOKED!", "#7ee787");
}

// ---------------------------------------------------------------------------
// Run lifecycle
// ---------------------------------------------------------------------------

function despawnRun() {
  // Joints detach before bodies — nape requires a constraint and both of
  // its bodies to still be in the space when it is removed.
  if (_harness && _harness.space) _harness.space = null;
  _harness = null;
  _hooked = null;
  for (const j of _ropeJoints) if (j.space) j.space = null;
  _ropeJoints = [];
  for (const p of _patients) {
    for (const j of p.joints) if (j.space) j.space = null;
    for (const part of p.parts) if (part.body.space) part.body.space = null;
  }
  _patients = [];
  for (const l of _links) if (l.space) l.space = null;
  _links = [];
  if (_hook && _hook.space) _hook.space = null;
  _hook = null;
  if (_heli && _heli.space) _heli.space = null;
  _heli = null;
  _breakables = new Map();
  _pendingBreaks.length = 0;
}

function enterRun() {
  despawnRun();
  _phase = "run";
  _lostReason = "";
  _grade = "";
  _hull = 100;
  _hullCd = 0;
  _spinHeliCd = 0;
  _spinDummyCd = 0;
  _steer = null;
  _floaters.length = 0;
  _fx.length = 0;
  _t0 = _space.elapsedTime;
  spawnHeli();
  for (let i = 0; i < PATIENT_SPOTS.length; i++) {
    _patients.push(spawnPatient(i, PATIENT_SPOTS[i]));
  }
}

function loseRun(reason) {
  if (_phase !== "run") return;
  _phase = "lost";
  _lostReason = reason;
  _finalTime = _space.elapsedTime - _t0;
}

function avgIntegrity() {
  if (_patients.length === 0) return 0;
  return Math.round(
    _patients.reduce((s, p) => s + p.integrity, 0) / _patients.length);
}

function winRun() {
  if (_phase !== "run") return;
  _phase = "won";
  _finalTime = _space.elapsedTime - _t0;
  const avg = avgIntegrity();
  _grade = avg >= 100 ? "PERFECT"
    : avg >= 85 ? "A"
      : avg >= 65 ? "B"
        : avg >= 45 ? "C" : "D";
  const bx = (HOSPITAL.x0 + HOSPITAL.x1) / 2;
  addFloater(bx, HOSPITAL.top - 80, "ALL RESCUED!", "#7ee787");
  _fx.push({ x: bx, y: HOSPITAL.top - 40, life: 24, color: "126,231,135" });
}

function rescuePatient(p) {
  p.rescued = true;
  const n = rescuedCount();
  const pos = p.torso.body.position;
  if (n < _patients.length) {
    addFloater(pos.x, pos.y - 40, `RESCUED ${n}/${_patients.length}`, "#7ee787");
    _fx.push({ x: pos.x, y: pos.y - 20, life: 24, color: "126,231,135" });
  } else {
    winRun();
  }
}

// ---------------------------------------------------------------------------
// Per-step logic
// ---------------------------------------------------------------------------

function flyHeli() {
  if (!_heli || !_heli.space) return;
  const m = _heli.mass;
  if (_wrecked) {
    // Dead stick: no lift, no servo — it falls and tumbles.
    _heli.force = new Vec2(0, 0);
    return;
  }
  let ax = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  let ay = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  let tvx = ax * MAX_VX;
  let tvy = ay < 0 ? ay * MAX_UP : ay * MAX_DOWN;
  if (_steer && ax === 0 && ay === 0) {
    // Pointer-held flight for touch: steer toward the held point.
    const p = _heli.position;
    tvx = Math.max(-MAX_VX, Math.min(MAX_VX, (_steer.x - p.x) * 2.2));
    tvy = Math.max(-MAX_UP, Math.min(MAX_DOWN, (_steer.y - p.y) * 2.2));
  }
  const v = _heli.velocity;
  _heli.force = new Vec2(
    m * ACCEL_K * (tvx - v.x),
    m * ACCEL_K * (tvy - v.y) - m * GRAVITY,
  );
  // Cosmetic banking servo.
  const tilt = (v.x / MAX_VX) * TILT_MAX;
  _heli.angularVel = (tilt - _heli.rotation) * 8;
}

function wreckHeli() {
  if (_wrecked || !_heli || !_heli.space) return;
  _wrecked = true;
  _hull = 0;
  const p = _heli.position;
  addFloater(p.x, p.y - 30, "MAYDAY!", "#f85149");
  _fx.push({ x: p.x, y: p.y, life: 26, color: "248,81,73" });
  doShake(16, 0.5);
}

function damageHull(dmg, label) {
  if (_wrecked || _phase !== "run" || !_heli || !_heli.space) return;
  _hull = Math.max(0, _hull - dmg);
  const p = _heli.position;
  addFloater(p.x, p.y - 34, `${label} −${dmg}%`, "#e3b341");
  if (_hull <= 0) wreckHeli();
}

function checkImpacts() {
  if (_heli && _heli.space && !_wrecked) {
    if (_hullCd > 0) _hullCd--;
    const dv = contactDv(_heli);
    if (dv > HELI_WRECK_DV) {
      wreckHeli();
    } else {
      // Every hard contact chips the hull — walls, towers, wrecking balls,
      // patrol platforms, hard landings alike.
      if (dv > HULL_DV && _hullCd === 0) {
        const dmg = Math.min(HULL_HIT_MAX, Math.round((dv - HULL_DV) * HULL_SCALE));
        if (dmg >= 2) {
          _hullCd = HULL_COOLDOWN;
          damageHull(dmg, "HULL");
        }
      }
      if (dv > HELI_SHAKE_DV) doShake(Math.min(14, 4 + dv / 25), 0.3);
    }
  }
  for (const pat of _patients) {
    if (pat.rescued) continue;
    for (const p of pat.parts) {
      if (p.bruiseCd > 0) { p.bruiseCd--; continue; }
      if (!p.body.space) continue;
      const dv = contactDv(p.body);
      if (dv <= DUMMY_SHAKE_DV) continue;
      // Grace until this patient's first hook-up: the spawn slump and the
      // winching tug must not bruise a patient nobody has flown anywhere.
      if (!pat.everHooked) continue;
      p.bruiseCd = BRUISE_COOLDOWN;
      const dmg = Math.min(BRUISE_MAX, (dv - BRUISE_DV) * BRUISE_SCALE);
      if (dmg > 1 && _phase === "run") {
        pat.integrity = Math.max(0, pat.integrity - Math.round(dmg));
        const pos = p.body.position;
        addFloater(pos.x, pos.y - 18, `OUCH −${Math.round(dmg)}%`, "#e3b341");
      }
      doShake(Math.min(12, 4 + dv / 60), 0.25);
    }
  }
}

// BREAK events arrive from the ConstraintListener mid-step; the space must
// not be mutated inside the callback, so they queue and drain here.
function drainBreaks() {
  while (_pendingBreaks.length > 0) {
    const info = _pendingBreaks.shift();
    if (!info) continue;
    if (info.angle && info.angle.space) info.angle.space = null;
    if (info.label === "HARNESS SNAP") { _harness = null; _hooked = null; }
    const pat = info.pIdx !== undefined ? _patients[info.pIdx] : null;
    if (_phase === "run" && info.dmg > 0 && pat) {
      pat.integrity = Math.max(0, pat.integrity - info.dmg);
    }
    const pos = pat && pat.torso.body.space
      ? pat.torso.body.position
      : _hook ? _hook.position : { x: 0, y: 0 };
    addFloater(pos.x, pos.y - 30,
      info.dmg > 0 ? `${info.label} −${info.dmg}%` : info.label, "#f85149");
    _fx.push({ x: pos.x, y: pos.y, life: 20, color: "248,81,73" });
    doShake(8, 0.25);
  }
}

function checkEndConditions() {
  if (_phase !== "run") return;
  for (const p of _patients) {
    if (p.integrity <= 0) { loseRun("PATIENT LOST"); return; }
  }
  if (_wrecked && ++_wreckT > 90) { loseRun("CHOPPER DOWN"); return; }

  // Delivered: patient unhooked, calm, torso on the hospital pad.
  for (const p of _patients) {
    if (p.rescued || !p.torso.body.space) continue;
    if (_harness && _hooked === p) { p.winT = 0; continue; }
    const pos = p.torso.body.position;
    const v = p.torso.body.velocity;
    const calm = Math.hypot(v.x, v.y) < WIN_SPEED;
    const onPad = pos.x > HOSPITAL.x0 && pos.x < HOSPITAL.x1
      && pos.y > HOSPITAL.top - 90 && pos.y < HOSPITAL.top + 4;
    if (calm && onPad) {
      if (++p.winT >= WIN_ZONE_FRAMES) rescuePatient(p);
    } else {
      p.winT = 0;
    }
  }
}

function currentHint() {
  if (_phase === "won") return "Click / R for another flight";
  if (_phase === "lost") return "Click / R to retry";
  if (_wrecked) return "";
  if (_harness && _hooked) {
    const p = _hooked.torso.body.position;
    if (p.x > HOSPITAL.x0 && p.x < HOSPITAL.x1) return "SPACE to release the harness";
    const arrow = _heli && _heli.position.x > (HOSPITAL.x0 + HOSPITAL.x1) / 2 ? "←" : "→";
    return `Deliver the patient to the hospital ${arrow}`;
  }
  return "Fly: ARROWS / WASD · hover the hook by a patient · SPACE to hook";
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "sky-hook",
  label: "Sky Hook",
  tags: ["Gameplay", "Ragdoll", "Breakable", "Callbacks", "Camera", "Keyboard"],
  desc:
    "Helicopter medevac with slung ragdolls — <b>three patients</b> stranded across a canyon, the hospital " +
    "pad in the middle. Fly with <b>arrows/WASD</b> (hold the pointer to steer on touch), hover the " +
    "chain-link rope's hook by a patient and press <b>Space</b> to winch him into the harness — then carry " +
    "him swinging under the chopper past towers, a bridge underpass, blocks hanging from the sky, " +
    "patrolling platforms, wrecking balls and spinning <b>X / I / cross rotors</b> back to the hospital. " +
    "Necks, shoulders and hips are real <b>breakable constraints</b> (<code>maxForce</code> + " +
    "<code>breakUnderForce</code>) — slam a patient and limbs tear off; yank hard enough and the " +
    "<b>harness snaps</b>. Every hard contact chips the chopper's <b>hull</b> via measured " +
    "<code>totalContactsImpulse</code> — at zero it drops out of the sky. <b>Space</b> releases, " +
    "<b>R</b> restarts.",
  walls: false,
  workerCompatible: false,
  camera: null,

  setup(space) {
    _space = space;
    _runnerRef = this._runner ?? null;
    space.gravity = new Vec2(0, GRAVITY);
    _cbBreakable = new CbType();
    _cbSpin = new CbType();
    _cbHeli = new CbType();
    _cbDummy = new CbType();
    _spinHeliCd = 0;
    _spinDummyCd = 0;
    _hullCd = 0;

    // Hard-reset module state — the previous load's bodies died with its space.
    _phase = "run";
    _heli = null;
    _links = [];
    _ropeJoints = [];
    _hook = null;
    _harness = null;
    _hooked = null;
    _patients = [];
    _breakables = new Map();
    _pendingBreaks.length = 0;
    _balls = [];
    _spinners = [];
    _movers = [];
    _shakeCount = 0;
    _tick = 0;
    _mouse = null;
    for (const k of Object.keys(keys)) delete keys[k];

    spawnTerrain();
    spawnHazards();
    enterRun();

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
    // tangentially and the flight assist shrugs the contact off, so measured
    // impulse stays small — touching one must still take a fixed bite.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbSpin, _cbHeli,
      () => {
        if (_phase !== "run" || _wrecked || _spinHeliCd > 0) return;
        _spinHeliCd = SPIN_HIT_COOLDOWN;
        damageHull(SPIN_DMG_HELI, "ROTOR STRIKE");
        doShake(10, 0.3);
      },
    ));
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbSpin, _cbDummy,
      (cb) => {
        if (_phase !== "run" || _spinDummyCd > 0) return;
        const b = cb.int2.castBody ?? cb.int2.castShape?.body ?? null;
        const pat = b ? _patients[b.userData?._pIdx] : null;
        if (!pat || pat.rescued) return;
        _spinDummyCd = SPIN_HIT_COOLDOWN;
        pat.integrity = Math.max(0, pat.integrity - SPIN_DMG_PATIENT);
        const pos = b.position;
        addFloater(pos.x, pos.y - 24, `BLADE HIT −${SPIN_DMG_PATIENT}%`, "#f85149");
        doShake(10, 0.3);
      },
    ));

    this.camera = {
      follow: () => _heli ? _heli.position : new Vec2(SCREEN_W / 2, SCREEN_H / 2),
      offsetY: -30,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.09,
    };

    if (typeof window !== "undefined") {
      if (_lastKeyDown) window.removeEventListener("keydown", _lastKeyDown);
      if (_lastKeyUp) window.removeEventListener("keyup", _lastKeyUp);
      _lastKeyDown = (e) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
          e.preventDefault();
        }
        keys[e.code] = true;
        if (e.code === "KeyR") enterRun();
        else if (e.code === "Space" && !e.repeat) {
          if (_phase === "run") tryToggleHook();
          else enterRun();
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
      f.y -= 0.7;
      if (--f.life <= 0) _floaters.splice(i, 1);
    }
    for (let i = _fx.length - 1; i >= 0; i--) {
      if (--_fx[i].life <= 0) _fx.splice(i, 1);
    }
    driveHazards();
    if (_spinHeliCd > 0) _spinHeliCd--;
    if (_spinDummyCd > 0) _spinDummyCd--;
    if (_harness && !_harness.stiff && ++_harnessT > 40 && _hooked) {
      _harness.stiff = true;
      registerBreakable(_harness, null, "HARNESS SNAP", 0,
        _hooked.mass, HARNESS_G, undefined);
    }
    flyHeli();
    drainBreaks();
    checkImpacts();
    checkEndConditions();
  },

  click(x, y) {
    _runnerRef = this._runner ?? _runnerRef;
    if (_phase !== "run") { enterRun(); return; }
    // A tap near the hook or a patient toggles the harness; anywhere else
    // becomes a held fly-to target (touch flight).
    const near = (b) => b && b.space
      && Math.hypot(x - b.position.x, y - b.position.y) < 90;
    if (near(_hook)
      || _patients.some((p) => !p.rescued && near(p.torso.body))) {
      tryToggleHook();
      return;
    }
    _steer = { x, y };
  },

  drag(x, y) {
    _mouse = { x, y };
    if (_steer) _steer = { x, y };
  },

  release() {
    _steer = null;
  },

  hover(x, y) {
    _mouse = { x, y };
  },

  // Headless-test hook (Node smoke tests) — not a DemoRunner callback and
  // not included in generated CodePen/StackBlitz previews.
  _testState() {
    return {
      keys,
      phase: () => _phase,
      lostReason: () => _lostReason,
      grade: () => _grade,
      hull: () => _hull,
      patients: () => _patients,
      rescued: () => rescuedCount(),
      shakes: () => _shakeCount,
      wrecked: () => _wrecked,
      attached: () => !!_harness,
      hooked: () => _hooked,
      heli: () => _heli,
      hook: () => _hook,
      links: () => _links,
      balls: () => _balls,
      spinners: () => _spinners,
      movers: () => _movers,
      breakables: () => _breakables,
      toggleHook: tryToggleHook,
      enterRun,
      elapsed: () => _space.elapsedTime - _t0,
    };
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);
    drawWorldOverlay(ctx);
    ctx.restore();
    drawHUD(ctx, W, H);
  },

  // Three.js / PixiJS render bodies natively (camera applied by the
  // adapter); the game-specific decoration is painted on the shared
  // overlay canvas. World-space passes get the camera translate, the HUD
  // stays screen-anchored.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    drawWorldOverlay(ctx);
    ctx.restore();
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Rendering — world decoration + screen-anchored HUD
// ---------------------------------------------------------------------------

function drawWorldOverlay(ctx) {
  drawPads(ctx);
  drawCables(ctx);
  drawRope(ctx);
  drawHeliDecor(ctx);
  drawHookHint(ctx);
  drawFx(ctx);
  drawFloaters(ctx);
}

function drawPads(ctx) {
  // Pickup zones: dashed lines painted where each un-rescued patient waits.
  ctx.font = "bold 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let i = 0; i < PATIENT_SPOTS.length; i++) {
    if (_patients[i] && _patients[i].rescued) continue;
    const spot = PATIENT_SPOTS[i];
    ctx.strokeStyle = "rgba(126,231,135,0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(spot.zx0, spot.standY - 4, spot.zx1 - spot.zx0, 4);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(126,231,135,0.9)";
    ctx.fillText("PICKUP", (spot.zx0 + spot.zx1) / 2, spot.standY - 14);
  }

  // Hospital rooftop with the pulsing H circle.
  const bx = (HOSPITAL.x0 + HOSPITAL.x1) / 2;
  const pulse = (Math.sin(_tick * 0.08) + 1) / 2;
  ctx.strokeStyle = `rgba(126,231,135,${(0.5 + pulse * 0.4).toFixed(3)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(bx, HOSPITAL.top - 26, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(126,231,135,0.9)";
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText("H", bx, HOSPITAL.top - 18);
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillText("HOSPITAL", bx, HOSPITAL.top - 56);
  ctx.textAlign = "left";
}

// Pendulum cables, rotor hubs and patrol rails — the joints/kinematics are
// invisible to the body renderer, so sketch them here.
function drawCables(ctx) {
  ctx.strokeStyle = "#8b949e";
  ctx.lineWidth = 2;
  for (let i = 0; i < _balls.length; i++) {
    const b = _balls[i];
    if (!b.space) continue;
    const cfg = BALLS[i];
    const p = b.position;
    ctx.beginPath();
    ctx.moveTo(cfg.px, GANTRY.y + GANTRY.h);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.beginPath();
    ctx.arc(cfg.px, GANTRY.y + GANTRY.h, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = "rgba(139,148,158,0.5)";
  ctx.lineWidth = 1;
  for (const m of MOVERS) {
    ctx.beginPath();
    if (m.axis === "y") {
      ctx.moveTo(m.x, m.min);
      ctx.lineTo(m.x, m.max);
    } else {
      ctx.moveTo(m.min, m.y);
      ctx.lineTo(m.max, m.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = "#f85149";
  for (const s of SPINNERS) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRope(ctx) {
  if (!_heli || !_heli.space || !_hook) return;
  ctx.strokeStyle = "#c9d1d9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const belly = _heli.localPointToWorld(new Vec2(0, FUSE_H / 2));
  ctx.moveTo(belly.x, belly.y);
  belly.dispose?.();
  for (const l of _links) {
    if (!l.space) continue;
    ctx.lineTo(l.position.x, l.position.y);
  }
  if (_hook.space) ctx.lineTo(_hook.position.x, _hook.position.y);
  ctx.stroke();
  // Harness strap.
  if (_harness && _hooked && _hooked.torso.body.space && _hook.space) {
    const t = _hooked.torso.body.localPointToWorld(new Vec2(0, -TORSO_H / 2 + 2));
    ctx.strokeStyle = "#7ee787";
    ctx.beginPath();
    ctx.moveTo(_hook.position.x, _hook.position.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
    t.dispose?.();
  }
}

function drawHeliDecor(ctx) {
  if (!_heli || !_heli.space) return;
  const p = _heli.position;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(_heli.rotation);
  // Main rotor: spinning blur ellipse on a mast.
  ctx.strokeStyle = _wrecked ? "#f85149" : "#c9d1d9";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -FUSE_H / 2);
  ctx.lineTo(0, -FUSE_H / 2 - 8);
  ctx.stroke();
  const spin = _wrecked ? 0.15 : 1;
  const bladeW = 62 * Math.abs(Math.sin(_tick * 0.9 * spin)) + 18;
  ctx.beginPath();
  ctx.ellipse(0, -FUSE_H / 2 - 10, bladeW, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Tail rotor.
  const ta = _tick * 1.3 * spin;
  ctx.beginPath();
  ctx.moveTo(-86 + Math.cos(ta) * 10, -2 + Math.sin(ta) * 10);
  ctx.lineTo(-86 - Math.cos(ta) * 10, -2 - Math.sin(ta) * 10);
  ctx.stroke();
  // Skids.
  ctx.beginPath();
  ctx.moveTo(-30, FUSE_H / 2 + 8);
  ctx.lineTo(34, FUSE_H / 2 + 8);
  ctx.moveTo(-22, FUSE_H / 2);
  ctx.lineTo(-22, FUSE_H / 2 + 8);
  ctx.moveTo(24, FUSE_H / 2);
  ctx.lineTo(24, FUSE_H / 2 + 8);
  ctx.stroke();
  ctx.restore();

  if (_wrecked) {
    // Smoke puffs off the wreck.
    const s = (_tick % 20) / 20;
    ctx.fillStyle = `rgba(139,148,158,${(0.5 - s * 0.5).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 20 - s * 30, 6 + s * 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHookHint(ctx) {
  if (_phase !== "run" || _harness || !_hook || !_hook.space) return;
  const hp = _hook.position;
  let near = false;
  for (const pat of _patients) {
    if (pat.rescued) continue;
    for (const p of pat.parts) {
      if (!p.body.space) continue;
      const pos = p.body.position;
      if (Math.hypot(hp.x - pos.x, hp.y - pos.y) < HOOK_RADIUS) { near = true; break; }
    }
    if (near) break;
  }
  if (!near) return;
  const pulse = (Math.sin(_tick * 0.25) + 1) / 2;
  ctx.strokeStyle = `rgba(126,231,135,${(0.4 + pulse * 0.5).toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hp.x, hp.y, HOOK_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFx(ctx) {
  for (const f of _fx) {
    const t = 1 - f.life / 26;
    ctx.strokeStyle = `rgba(${f.color},${(1 - t).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 8 + t * 46, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFloaters(ctx) {
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const f of _floaters) {
    ctx.fillStyle = f.color;
    ctx.globalAlpha = Math.min(1, f.life / 20);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawHUD(ctx, W, H) {
  ctx.fillStyle = "rgba(13,17,23,0.72)";
  ctx.fillRect(0, 0, W, HUD_H);

  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("SKY HOOK", 14, HUD_H / 2);

  // Chopper hull bar.
  ctx.fillStyle = "#8b949e";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("HULL", 106, HUD_H / 2);
  ctx.strokeStyle = "#30363d";
  ctx.strokeRect(142, HUD_H / 2 - 6, 90, 12);
  const hFrac = _hull / 100;
  ctx.fillStyle = hFrac > 0.6 ? "#3fb950" : hFrac > 0.3 ? "#e3b341" : "#f85149";
  ctx.fillRect(142, HUD_H / 2 - 6, 90 * hFrac, 12);

  // One integrity chip per patient; a check mark once he is rescued.
  for (let i = 0; i < _patients.length; i++) {
    const p = _patients[i];
    const cx = 258 + i * 74;
    ctx.fillStyle = "#8b949e";
    ctx.fillText(`${i + 1}`, cx, HUD_H / 2);
    ctx.strokeStyle = "#30363d";
    ctx.strokeRect(cx + 10, HUD_H / 2 - 6, 44, 12);
    const frac = p.integrity / 100;
    ctx.fillStyle = p.rescued ? "#3fb950"
      : frac > 0.6 ? "#3fb950" : frac > 0.3 ? "#e3b341" : "#f85149";
    ctx.fillRect(cx + 10, HUD_H / 2 - 6, 44 * frac, 12);
    if (p.rescued) {
      ctx.fillStyle = "#7ee787";
      ctx.fillText("✓", cx + 58, HUD_H / 2);
    }
  }

  // Timer.
  const t = _phase === "run" ? (_space ? _space.elapsedTime - _t0 : 0) : _finalTime;
  ctx.fillStyle = "#8b949e";
  ctx.fillText(`T ${t.toFixed(1)}s`, 258 + _patients.length * 74 + 12, HUD_H / 2);

  // Contextual hint.
  const hint = currentHint();
  if (hint) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#8b949e";
    ctx.fillText(hint, W - 14, HUD_H / 2);
    ctx.textAlign = "left";
  }

  // End-of-run banner.
  if (_phase !== "run") {
    ctx.fillStyle = "rgba(13,17,23,0.8)";
    ctx.fillRect(W / 2 - 220, H / 2 - 58, 440, 116);
    ctx.strokeStyle = _phase === "won" ? "#3fb950" : "#f85149";
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 220, H / 2 - 58, 440, 116);
    ctx.textAlign = "center";
    ctx.fillStyle = _phase === "won" ? "#7ee787" : "#f85149";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(
      _phase === "won" ? `ALL RESCUED — GRADE ${_grade}` : _lostReason,
      W / 2, H / 2 - 18);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      _phase === "won"
        ? `Average integrity ${avgIntegrity()}% · hull ${_hull}% · time ${_finalTime.toFixed(1)}s`
        : "The mission is over.",
      W / 2, H / 2 + 12);
    ctx.fillStyle = "#8b949e";
    ctx.fillText("Click or press R to fly again", W / 2, H / 2 + 38);
    ctx.textAlign = "left";
  }
  ctx.textBaseline = "alphabetic";
}
