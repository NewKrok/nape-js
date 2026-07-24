import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  PivotJoint, AngleJoint, InteractionFilter,
  CbEvent, CbType, ConstraintListener,
} from "../nape-js.esm.js";
import { drawBody, drawGrid } from "../renderer.js";

// ---------------------------------------------------------------------------
// Crash Test Hero — Turbo-Dismount-style crash scoring mini-game.
//
// A ragdoll crash-test dummy sits on a two-wheeled cart at the top of a
// launch tower. The player poses the dummy by yanking any body part with a
// springy pivot "hand", then holds SPACE (or the LAUNCH button) to charge a
// ping-ponging power meter and releases to launch. The cart tears down the
// ramp, hits a kicker, flies a pit, and the dummy tumbles down a staircase
// into a trampoline, a spinning kinematic paddle wheel and a crate wall.
// Damage IS the score: every hard contact on a dummy part pays out points
// from measured contact impulse (head hits ×3, torso ×2), the seatbelt and
// the dummy's neck/shoulders/hips are real breakable constraints that snap
// under load for bonus points, and scattered crates pay a demolition bonus.
// Big hits trigger a hit-stop freeze + camera shake. When the dummy comes
// to rest the run is graded and the session best is kept. Mid-flight the
// player can still grab the dummy with the hand, or press SPACE to panic-
// flail (3 charges) for extra chaos.
//
// Engine features showcased:
//   * Constraint breaking — PivotJoints with maxForce + breakUnderForce +
//     removeOnBreak (seatbelt, neck, shoulders, hips), observed via a
//     ConstraintListener(CbEvent.BREAK). No other demo exercises this.
//   * body.totalContactsImpulse() — per-step contact impulse drives the
//     damage score, hit-stop and the dummy's "ouch" face.
//   * KINEMATIC body — the paddle wheel spins at constant angularVel,
//     immune to impacts, and batters anything it touches.
//   * Ragdoll rig — PivotJoint + soft AngleJoint limb rig with
//     InteractionFilter groups (no self-collision, cart wheels never
//     collide with their own board).
//   * Camera follow + shakeCamera + physicsPaused hit-stop via the
//     DemoRunner host.
// ---------------------------------------------------------------------------

// Named SCREEN_W/SCREEN_H — the CodePen runtime declares its own `W`/`H`
// and a duplicate top-level would throw SyntaxError (see top-down-shooter.js).
const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 40;

// ── Course geometry ──────────────────────────────────────────────────────
// Terrain is a list of surface polylines ("chains"), left to right. Each
// non-vertical span becomes one static quad down to the skirt; vertical
// rises/drops are covered by the neighbouring quads' side edges (same
// scheme as contraption-garage). The world is closed — side walls left and
// right — so nothing is ever lost, it just crashes somewhere.
//
// Course tour: launch deck → big ramp → flat run-up → kicker lip → pit
// (only shenanigans fall in — every launch power clears it) → landing
// table → 8-drop staircase → valley with trampoline, paddle wheel, crate
// stack and the backstop wall.
const WORLD_W = 2260;
const WORLD_H = 940;
const SKIRT_Y = WORLD_H + 20;

const CHAINS = [
  [
    [-20, 200], [300, 200],          // launch deck (cart parks here)
    [380, 240],                      // rounded shoulder into...
    [620, 425],                      // ...the big ramp (~37°)
    [700, 462],                      // flare-out at the bottom
    [760, 470], [860, 470],          // flat run-up
    [950, 435],                      // kicker lip (~21°) — then airborne
  ],
  [
    [950, 880], [1040, 880],         // pit floor (vertical walls implicit)
    [1040, 550],                     // ← vertical face, skipped as a quad
    [1086, 550],                     // staircase starts AT the pit lip — no
    [1086, 580], [1132, 580],        //   landing table for a low-power
    [1132, 610], [1178, 610],        //   dummy to strand or teeter on
    [1178, 640], [1224, 640],        // 8 drops of 30px, 46px treads
    [1224, 670], [1270, 670],        //   (Stair Dismount!)
    [1270, 700], [1316, 700],
    [1316, 730], [1362, 730],
    [1362, 760], [2260, 760],        // valley floor — runs UNDER the right
  ],                                 //   wall so no crack swallows the dummy
];

// The whole course is slick, polished steel — a tumbling ragdoll SLIDES
// down ramps and across flats instead of gripping and parking mid-course,
// which is what carries a belt-less dummy the rest of the way.
const TERRAIN_MAT = () => new Material(0, 0.28, 0.36, 1, 0.005);

// Trampoline pad — static, high elasticity, parked DIRECTLY UNDER the
// paddle wheel (blade tips stop 2px above it): whatever lands there gets
// bounced up into the blades and slapped on toward the crate wall.
const PAD = { x: 1895, y: 747, w: 230, h: 26 };
const PAD_MAT = () => new Material(1.7, 0.5, 0.7, 1, 0.001);

// Paddle wheel — kinematic cross spinning at constant rate. Blade tips
// sweep down to y ≈ 732 — 28px clear of the valley floor on purpose, so a
// part lying flat under it settles instead of being batted forever, while
// anything airborne (trampoline!) or piled up still gets smacked.
const WHEEL_POS = { x: 1905, y: 585 };
const WHEEL_ARM = 280;               // full blade length (box major axis)
const WHEEL_RATE = 3.2;              // rad/s

// Crate wall — light boxes in front of the backstop, scattered for bonus.
const CRATE = 26;
const CRATE_COLS = 4;
const CRATE_ROWS = 4;
const CRATE_X0 = 2055;               // snug against the backstop wall (no
                                     //   dummy-swallowing crack behind) and
                                     //   outside the paddle blade sweep
const CRATE_SCATTER_DIST = 36;       // displaced this far = demolished
const CRATE_BONUS = 80;

// ── Cart ─────────────────────────────────────────────────────────────────
const CART_X = 150;
const DECK_Y = 200;
const BOARD_W = 92, BOARD_H = 12;
const BOARD_Y = DECK_Y - 24;         // board center (wheels reach the deck)
const CART_WHEEL_R = 13;
const CART_WHEEL_MAT = () => new Material(0.1, 1.6, 1.9, 1.2, 0.01);

// ── Dummy rig ────────────────────────────────────────────────────────────
const TORSO_W = 20, TORSO_H = 40;
const HEAD_R = 10;
const ARM_LEN = 24, ARM_W = 7;
const LEG_LEN = 26, LEG_W = 9;

// Collision groups — the dummy never collides with itself (bit 16), the
// cart's wheels never collide with their own board (bit 32); dummy↔cart,
// everything↔terrain and everything↔crates all collide normally.
const GROUP_DUMMY = 16;
const GROUP_CART = 32;
const MASK_DUMMY = ~GROUP_DUMMY & 0xffffffff;
const MASK_CART = ~GROUP_CART & 0xffffffff;

// ── Breakable constraints ────────────────────────────────────────────────
// Real engine-level breaking: the joint snaps when its reaction impulse
// exceeds maxForce·dt in a step, and removeOnBreak pulls it from the space.
// Calibration rule of thumb: a joint stopping mass m from a relative
// velocity jump Δv in one step carries force ≈ m·Δv·60. The seatbelt is
// sized to survive the ramp and the kicker but fail at the pit landing.
const SEATBELT_FORCE = 22000;
const NECK_FORCE = 5200;
const LIMB_FORCE = 6500;
const BREAK_BONUS = 350;

// ── Launch ───────────────────────────────────────────────────────────────
const LAUNCH_MIN = 430;              // px/s at 0% power
const LAUNCH_MAX = 1020;             // px/s at 100% power
const POWER_RATE = 1.5;              // ping-pong sweeps per second (×2)

// ── Damage scoring ───────────────────────────────────────────────────────
// Per step, per dummy part: |totalContactsImpulse| above the threshold pays
// out points scaled by the part multiplier. The threshold sits well above
// resting-contact impulses (~12 for the torso at gravity 800) so sitting
// still scores nothing, while a hard landing spikes to several hundred.
const IMP_THRESH = 45;
const DMG_SCALE = 1.6;
const MULT_HEAD = 3;
const MULT_TORSO = 2;
const MULT_LIMB = 1;
const FLOATER_MIN_DMG = 40;          // don't spam tiny numbers
const PART_DMG_COOLDOWN = 12;        // frames a part can't re-score (no
                                     //   point-farming while being ground
                                     //   against the paddle wheel)
const OUCH_DMG = 260;                // X-eyes face threshold (one step)
const HITSTOP_DMG = 650;             // hit-stop + shake threshold (one step)
const HITSTOP_FRAMES = 5;
const HITSTOP_COOLDOWN = 45;

// ── Run flow ─────────────────────────────────────────────────────────────
const RUN_TIME_CAP = 22;             // seconds — force the results screen
const QUIET_SPEED = 30;              // px/s — "the dummy has come to rest"
const QUIET_FRAMES = 75;
const QUIET_MIN_T = 2;               // never end in the first 2 seconds
const QUIET_SNAP_FRAMES = 90;        // displacement fallback sampling period
const QUIET_SNAP_DIST = 26;          // px moved per period that counts as rest
const PIT_ZONE = { x0: 940, x1: 1050, y: 780 };
const PIT_FRAMES = 150;              // torso parked in the pit → run over
const RESTART_LOCK_STEPS = 30;       // ignore clicks right after an overlay
const FLAILS_PER_RUN = 3;

const GRADES = [                     // total damage → grade letter
  [16000, "S"], [10000, "A"], [5000, "B"], [1500, "C"],
];

// Shove/pose hand — soft pivot the player can attach to any dummy part.
const HAND_FREQ = 8;
const HAND_DAMP = 1.2;
const GRAB_R = 46;

// Setup-phase camera rest point (shows deck + ramp head).
const SETUP_CAM = { x: 430, y: 300 };

// Launch button (canvas UI, screen coords — bottom-right like the other
// game demos; the demo page overlays its render-mode controls top-right).
const GO_RECT = { x: SCREEN_W - 148, y: SCREEN_H - 42, w: 138, h: 32 };

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
let _runnerRef = null;

let _phase = "setup";                // "setup" | "run" | "done"
let _power = 0;                      // 0..1 ping-pong while charging
let _powerDir = 1;
let _charging = false;               // via Space key and/or pointer on button

let _cart = null;                    // { board, wheels: [b, b], joints: [] }
let _holder = null;                  // stiff pivot parking the cart pre-launch
let _dummy = null;                   // rig struct, see buildDummy()
let _seatbelt = null;
let _crates = [];                    // { body, x0, y0, scattered }
let _paddle = null;

// Breakable-joint registry: pivot → { angle, label, part }. The BREAK
// listener only queues; step() drains (never mutate the space mid-callback).
// Constraints do NOT automatically carry ANY_CONSTRAINT in this engine —
// breakable joints get a shared custom CbType so the listener matches.
let _cbBreakable = null;
let _breakables = new Map();
const _pendingBreaks = [];

let _score = 0;
let _impactScore = 0;
let _breakCount = 0;
let _crateCount = 0;
let _best = null;
let _isNewBest = false;
let _grade = "";
let _flails = FLAILS_PER_RUN;

let _runBase = 0;                    // space.elapsedTime at launch
let _runT = 0;
let _quiet = 0;
let _pitT = 0;                       // frames the torso has sat in the pit
let _snapTimer = 0;                  // displacement-fallback sampling clock
let _snapPos = new Map();            // part → position at last sample
let _lockTimer = 0;
let _hitStop = 0;
let _hitStopCd = 0;
let _ouch = 0;                       // frames of X-eyes face left
let _tick = 0;

let _hand = null;                    // { body, joint }
let _mouse = null;
let _floaters = [];                  // { x, y, text, color, life }
let _fx = [];                        // { x, y, life, color }

let _lastCamX = 0;
let _lastCamY = 0;
let _lastKeyDown = null;
let _lastKeyUp = null;

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

function spawnTerrain() {
  for (const surface of CHAINS) {
    for (let i = 0; i < surface.length - 1; i++) {
      const [x0, y0] = surface[i];
      const [x1, y1] = surface[i + 1];
      if (x1 <= x0) continue;        // vertical rise/drop — neighbours cover it
      const seg = new Body(BodyType.STATIC);
      seg.shapes.add(new Polygon([
        new Vec2(x0, y0), new Vec2(x1, y1),
        new Vec2(x1, SKIRT_Y), new Vec2(x0, SKIRT_Y),
      ], TERRAIN_MAT()));
      try { seg.userData._colorIdx = 5; } catch (_) { /* userData may be frozen */ }
      seg.space = _space;
    }
  }
  // Side walls — the world is a closed box, nothing escapes.
  for (const wx of [-34, WORLD_W - 44]) {
    const wall = new Body(BodyType.STATIC, new Vec2(wx, WORLD_H / 2));
    wall.shapes.add(new Polygon(Polygon.box(36, WORLD_H), TERRAIN_MAT()));
    try { wall.userData._colorIdx = 5; } catch (_) { /* same */ }
    wall.space = _space;
  }
  // Trampoline pad.
  const pad = new Body(BodyType.STATIC, new Vec2(PAD.x, PAD.y));
  pad.shapes.add(new Polygon(Polygon.box(PAD.w, PAD.h), PAD_MAT()));
  try { pad.userData._colorIdx = 2; } catch (_) { /* same */ }
  pad.space = _space;
}

function spawnPaddle() {
  _paddle = new Body(BodyType.KINEMATIC, new Vec2(WHEEL_POS.x, WHEEL_POS.y));
  _paddle.shapes.add(new Polygon(Polygon.box(WHEEL_ARM, 14)));
  _paddle.shapes.add(new Polygon(Polygon.box(14, WHEEL_ARM)));
  try { _paddle.userData._colorIdx = 3; } catch (_) { /* same */ }
  _paddle.space = _space;
  // Negative rate: the blade's low point sweeps toward +x, so anything
  // lying in the valley gets scooped toward the crate wall, not back up
  // the stairs.
  _paddle.angularVel = -WHEEL_RATE;
}

function spawnCrates() {
  despawnCrates();
  for (let c = 0; c < CRATE_COLS; c++) {
    for (let r = 0; r < CRATE_ROWS; r++) {
      const x = CRATE_X0 + c * (CRATE + 1);
      const y = 760 - CRATE / 2 - r * (CRATE + 1);
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      // No Material override on dynamic Polygons (P53 tunneling bug) —
      // default wood-ish behaviour is fine for scatter props.
      body.shapes.add(new Polygon(Polygon.box(CRATE, CRATE)));
      try { body.userData._colorIdx = 1; } catch (_) { /* same */ }
      body.space = _space;
      _crates.push({ body, x0: x, y0: y, scattered: false });
    }
  }
}

function despawnCrates() {
  for (const c of _crates) {
    if (c.body.space) c.body.space = null;
  }
  _crates = [];
}

// ---------------------------------------------------------------------------
// Cart + dummy factories
// ---------------------------------------------------------------------------

function spawnCart() {
  const joints = [];
  const board = new Body(BodyType.DYNAMIC, new Vec2(CART_X, BOARD_Y));
  const boardShape = new Polygon(Polygon.box(BOARD_W, BOARD_H));
  boardShape.filter = new InteractionFilter(GROUP_CART, MASK_CART);
  board.shapes.add(boardShape);
  try { board.userData._colorIdx = 5; } catch (_) { /* same */ }
  board.space = _space;

  const wheels = [];
  for (const side of [-1, 1]) {
    const w = new Body(BodyType.DYNAMIC,
      new Vec2(CART_X + side * 30, BOARD_Y + 13));
    const wheelShape = new Circle(CART_WHEEL_R, undefined, CART_WHEEL_MAT());
    wheelShape.filter = new InteractionFilter(GROUP_CART, MASK_CART);
    w.shapes.add(wheelShape);
    try { w.userData._colorIdx = 1; } catch (_) { /* same */ }
    w.space = _space;
    const j = new PivotJoint(board, w, new Vec2(side * 30, 13), new Vec2(0, 0));
    j.space = _space;
    joints.push(j);
    wheels.push(w);
  }

  // Parking brake — a stiff pivot to the static world, removed at launch.
  _holder = new PivotJoint(_space.world, board,
    new Vec2(CART_X, BOARD_Y), new Vec2(0, 0));
  _holder.space = _space;

  _cart = { board, wheels, joints };
}

function despawnCart() {
  if (!_cart) return;
  if (_holder && _holder.space) _holder.space = null;
  _holder = null;
  for (const j of _cart.joints) if (j.space) j.space = null;
  if (_cart.board.space) _cart.board.space = null;
  for (const w of _cart.wheels) if (w.space) w.space = null;
  _cart = null;
}

function dummyPart(x, y, shape, name, mult, colorIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(shape);
  shape.filter = new InteractionFilter(GROUP_DUMMY, MASK_DUMMY);
  try { body.userData._colorIdx = colorIdx; } catch (_) { /* same */ }
  body.space = _space;
  return { body, name, mult, cd: 0 };
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

// Breakable pivot: snaps (and self-removes) when its reaction force exceeds
// maxForce in one step. The paired AngleJoint is remembered so the BREAK
// drain can detach it too — otherwise the "severed" limb would stay tethered
// by the soft angular spring.
function addBreakablePivot(b1, b2, a1, a2, maxForce, label, joints) {
  const j = new PivotJoint(b1, b2, a1, a2);
  j.maxForce = maxForce;
  j.breakUnderForce = true;
  j.removeOnBreak = true;
  j.cbTypes.add(_cbBreakable);
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

// The dummy spawns in a luge-rider pose: torso upright on the board, legs
// straight out over the cart's nose, arms hanging at the sides. The rig is
// a full ragdoll — no stabilisation anywhere — so it slumps into a "real"
// seated pose during the setup phase, which is half the charm.
function buildDummy() {
  const joints = [];
  const x = CART_X - 10;
  const boardTop = BOARD_Y - BOARD_H / 2;
  const torsoY = boardTop - TORSO_H / 2;

  const torso = dummyPart(x, torsoY,
    new Polygon(Polygon.box(TORSO_W, TORSO_H)), "torso", MULT_TORSO, 0);
  // Rolling friction on the head, or a snapped-off one rolls the whole
  // slick course end to end for half a minute. (Circle + Material is safe;
  // the P53 tunneling bug is Polygon-only.)
  const head = dummyPart(x, torsoY - TORSO_H / 2 - HEAD_R - 2,
    new Circle(HEAD_R, undefined, new Material(0.1, 0.5, 0.7, 1, 0.4)),
    "head", MULT_HEAD, 0);

  const neck = addBreakablePivot(torso.body, head.body,
    new Vec2(0, -TORSO_H / 2 - 1), new Vec2(0, HEAD_R - 1),
    NECK_FORCE, "NECK SNAP", joints);
  const neckAngle = addAngle(torso.body, head.body, -0.6, 0.6, joints);
  registerBreakable(neck, neckAngle, "NECK SNAP", head);

  const limbs = [];
  // Arms — two segments hanging at the torso's sides.
  for (const side of [-1, 1]) {
    const ax = x + side * (TORSO_W / 2 + ARM_W / 2 + 1);
    const upper = dummyPart(ax, torsoY - TORSO_H / 2 + 8 + ARM_LEN / 2,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)),
      "arm" + (side > 0 ? "R" : "L"), MULT_LIMB, 4);
    const lower = dummyPart(ax, upper.body.position.y + ARM_LEN,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)),
      "forearm" + (side > 0 ? "R" : "L"), MULT_LIMB, 4);

    const shoulder = addBreakablePivot(torso.body, upper.body,
      new Vec2(side * (TORSO_W / 2 - 2), -TORSO_H / 2 + 8),
      new Vec2(0, -ARM_LEN / 2 + 1),
      LIMB_FORCE, "ARM OFF", joints);
    const shoulderAngle = addAngle(torso.body, upper.body, -2.2, 2.2, joints);
    registerBreakable(shoulder, shoulderAngle, "ARM OFF", upper);

    addPivot(upper.body, lower.body,
      new Vec2(0, ARM_LEN / 2 - 1), new Vec2(0, -ARM_LEN / 2 + 1), joints);
    addAngle(upper.body, lower.body,
      side > 0 ? -0.1 : -2.4, side > 0 ? 2.4 : 0.1, joints);
    limbs.push(upper, lower);
  }

  // Legs — two horizontal segments stretched forward (luge pose). The leg
  // boxes are built wide (major axis = x) so rotation 0 IS the seated pose.
  for (const side of [-1, 1]) {
    const hipY = torsoY + TORSO_H / 2 - 3 + side * 2;
    const upper = dummyPart(x + 6 + LEG_LEN / 2, hipY,
      new Polygon(Polygon.box(LEG_LEN, LEG_W)),
      "leg" + (side > 0 ? "R" : "L"), MULT_LIMB, 4);
    const lower = dummyPart(upper.body.position.x + LEG_LEN, hipY,
      new Polygon(Polygon.box(LEG_LEN, LEG_W)),
      "shin" + (side > 0 ? "R" : "L"), MULT_LIMB, 4);

    const hip = addBreakablePivot(torso.body, upper.body,
      new Vec2(6, TORSO_H / 2 - 3 + side * 2), new Vec2(-LEG_LEN / 2 + 1, 0),
      LIMB_FORCE, "LEG OFF", joints);
    const hipAngle = addAngle(torso.body, upper.body, -1.8, 1.8, joints);
    registerBreakable(hip, hipAngle, "LEG OFF", upper);

    addPivot(upper.body, lower.body,
      new Vec2(LEG_LEN / 2 - 1, 0), new Vec2(-LEG_LEN / 2 + 1, 0), joints);
    addAngle(upper.body, lower.body, -2.0, 2.0, joints);
    limbs.push(upper, lower);
  }

  const parts = [torso, head, ...limbs];
  _dummy = { torso, head, parts, joints };

  // Seatbelt — dummy pelvis strapped to the board. Weak on purpose: it
  // holds through the launch and lets go at the first real shock.
  _seatbelt = new PivotJoint(_cart.board, torso.body,
    new Vec2(-10, -BOARD_H / 2), new Vec2(0, TORSO_H / 2 - 4));
  _seatbelt.maxForce = SEATBELT_FORCE;
  _seatbelt.breakUnderForce = true;
  _seatbelt.removeOnBreak = true;
  _seatbelt.cbTypes.add(_cbBreakable);
  _seatbelt.space = _space;
  registerBreakable(_seatbelt, null, "SEATBELT!", torso);
}

function registerBreakable(pivot, angle, label, part) {
  _breakables.set(pivot, { angle, label, part });
}

function despawnDummy() {
  releaseHand();
  if (!_dummy) return;
  if (_seatbelt && _seatbelt.space) _seatbelt.space = null;
  _seatbelt = null;
  // Joints detach BEFORE bodies — nape requires a constraint and both of
  // its endpoints to share a space; pulling bodies first leaves dangling
  // joints that throw on the next space mutation.
  for (const j of _dummy.joints) if (j.space) j.space = null;
  for (const p of _dummy.parts) if (p.body.space) p.body.space = null;
  _dummy = null;
  _breakables = new Map();
  _pendingBreaks.length = 0;
}

// ---------------------------------------------------------------------------
// Phase flow
// ---------------------------------------------------------------------------

function enterSetup() {
  despawnDummy();
  despawnCart();
  spawnCrates();
  spawnCart();
  buildDummy();
  _phase = "setup";
  _power = 0;
  _powerDir = 1;
  _charging = false;
  _score = 0;
  _impactScore = 0;
  _breakCount = 0;
  _crateCount = 0;
  _isNewBest = false;
  _grade = "";
  _flails = FLAILS_PER_RUN;
  _runT = 0;
  _quiet = 0;
  _hitStop = 0;
  _ouch = 0;
  _floaters = [];
  _fx = [];
  if (_runnerRef) _runnerRef.physicsPaused = false;
}

function doLaunch() {
  if (_phase !== "setup" || !_cart || !_dummy) return;
  const v = LAUNCH_MIN + _power * (LAUNCH_MAX - LAUNCH_MIN);
  if (_holder && _holder.space) _holder.space = null;
  _holder = null;
  // Whole convoy gets the same velocity — no internal spikes, so the
  // seatbelt survives the launch itself and fails somewhere funnier.
  const movers = [_cart.board, ..._cart.wheels,
    ..._dummy.parts.map((p) => p.body)];
  for (const b of movers) b.velocity = new Vec2(v, 0);
  for (const w of _cart.wheels) w.angularVel = v / CART_WHEEL_R;
  _charging = false;
  _phase = "run";
  _runBase = _space.elapsedTime;
  _runT = 0;
  _quiet = 0;
  _pitT = 0;
  _snapTimer = 0;
  _snapPos = new Map();
}

function finishRun() {
  releaseHand();
  _grade = "D";
  for (const [min, g] of GRADES) {
    if (_score >= min) { _grade = g; break; }
  }
  _isNewBest = _best === null || _score > _best;
  if (_isNewBest) _best = _score;
  _phase = "done";
  _lockTimer = RESTART_LOCK_STEPS;
  if (_runnerRef) _runnerRef.physicsPaused = false;
  _hitStop = 0;
}

function panicFlail() {
  if (_phase !== "run" || _flails <= 0 || !_dummy) return;
  _flails--;
  for (const p of _dummy.parts) {
    if (!p.body.space) continue;
    const v = p.body.velocity;
    p.body.velocity = new Vec2(
      v.x + (Math.random() - 0.5) * 320,
      v.y - 180 - Math.random() * 160,
    );
  }
  const tp = _dummy.torso.body.position;
  addFloater(tp.x, tp.y - 40, "FLAIL!", "#dbabff");
}

// ---------------------------------------------------------------------------
// Per-step maintenance
// ---------------------------------------------------------------------------

function addFloater(x, y, text, color) {
  _floaters.push({ x, y, text, color, life: 60 });
  if (_floaters.length > 24) _floaters.shift();
}

// Contact-impulse damage. totalContactsImpulse() sums this step's collision
// arbiter impulses on the body; an arbiter can expire between steps
// ("Arbiter not currently in use") — harmless, skip the part this frame.
function scoreImpacts() {
  let stepDmg = 0;
  for (const p of _dummy.parts) {
    if (p.cd > 0) { p.cd--; continue; }
    if (!p.body.space) continue;
    let mag = 0;
    try {
      const imp = p.body.totalContactsImpulse();
      mag = Math.sqrt(imp.x * imp.x + imp.y * imp.y);
      imp.dispose?.();
    } catch (_) {
      mag = 0;
    }
    if (mag <= IMP_THRESH) continue;
    const dmg = (mag - IMP_THRESH) * DMG_SCALE * p.mult;
    p.cd = PART_DMG_COOLDOWN;
    stepDmg += dmg;
    _impactScore += dmg;
    _score += dmg;
    if (dmg >= FLOATER_MIN_DMG) {
      const pos = p.body.position;
      const big = p.mult > 1;
      addFloater(pos.x, pos.y - 18,
        `+${Math.round(dmg)}${p.name === "head" ? " HEAD ×3" : ""}`,
        big ? "#f85149" : "#e3b341");
    }
  }
  if (stepDmg >= OUCH_DMG) _ouch = 50;
  if (stepDmg >= HITSTOP_DMG && _hitStopCd <= 0) {
    _hitStop = HITSTOP_FRAMES;
    _hitStopCd = HITSTOP_COOLDOWN;
    if (_runnerRef) {
      _runnerRef.physicsPaused = true;
      _runnerRef.shakeCamera?.(Math.min(16, 6 + stepDmg / 200), 0.3);
    }
  }
}

// BREAK events arrive from the ConstraintListener mid-step; the space must
// not be mutated inside the callback, so they queue here and drain now.
function drainBreaks() {
  while (_pendingBreaks.length > 0) {
    const info = _pendingBreaks.shift();
    if (!info) continue;
    if (info.angle && info.angle.space) info.angle.space = null;
    _breakCount++;
    _score += BREAK_BONUS;
    const pos = info.part.body.position;
    addFloater(pos.x, pos.y - 24, `${info.label} +${BREAK_BONUS}`, "#f85149");
    _fx.push({ x: pos.x, y: pos.y, life: 20, color: "248,81,73" });
    if (info.label === "SEATBELT!") _seatbelt = null;
    if (_runnerRef) _runnerRef.shakeCamera?.(8, 0.2);
  }
}

function scoreCrates() {
  for (const c of _crates) {
    if (c.scattered) continue;
    const p = c.body.position;
    const dx = p.x - c.x0, dy = p.y - c.y0;
    if (dx * dx + dy * dy < CRATE_SCATTER_DIST * CRATE_SCATTER_DIST) continue;
    c.scattered = true;
    _crateCount++;
    _score += CRATE_BONUS;
    addFloater(p.x, p.y - 16, `CRATE +${CRATE_BONUS}`, "#e3b341");
    _fx.push({ x: p.x, y: p.y, life: 14, color: "227,179,65" });
  }
}

// Rest detection — the run ends when every dummy part has stopped moving
// (sleeping bodies report zero velocity, so nape's sleep pipeline helps).
// A wedged pile can jitter above the speed threshold indefinitely, so a
// displacement check backs it up: if no part traveled anywhere over the
// last 1.5 s, the run is over no matter what the velocities claim.
function checkRunEnd() {
  if (_runT >= RUN_TIME_CAP) { finishRun(); return; }
  // Splatted into the pit: the wedged pile of cart + dummy can jitter for
  // ages down there — once the torso has clearly parked in the shaft, call
  // the run rather than wait out the churn.
  const tp = _dummy.torso.body.position;
  if (tp.x > PIT_ZONE.x0 && tp.x < PIT_ZONE.x1 && tp.y > PIT_ZONE.y) {
    if (++_pitT >= PIT_FRAMES) { finishRun(); return; }
  } else {
    _pitT = 0;
  }
  if (_runT < QUIET_MIN_T) return;
  let maxSpeed = 0;
  for (const p of _dummy.parts) {
    if (!p.body.space) continue;
    const v = p.body.velocity;
    const s = Math.sqrt(v.x * v.x + v.y * v.y) + Math.abs(p.body.angularVel) * 8;
    if (s > maxSpeed) maxSpeed = s;
  }
  if (maxSpeed < QUIET_SPEED) {
    if (++_quiet >= QUIET_FRAMES) { finishRun(); return; }
  } else {
    _quiet = 0;
  }
  if (++_snapTimer >= QUIET_SNAP_FRAMES) {
    _snapTimer = 0;
    let maxMove = 0;
    for (const p of _dummy.parts) {
      if (!p.body.space) continue;
      const pos = p.body.position;
      const last = _snapPos.get(p);
      if (last) {
        const d = Math.hypot(pos.x - last.x, pos.y - last.y);
        if (d > maxMove) maxMove = d;
      } else {
        maxMove = Infinity;
      }
      _snapPos.set(p, { x: pos.x, y: pos.y });
    }
    if (maxMove < QUIET_SNAP_DIST) finishRun();
  }
}

function camTarget() {
  if (_phase === "setup" || !_dummy) return SETUP_CAM;
  const torso = _dummy.torso.body;
  let best = torso.position;
  // Strong bias toward the torso so the camera doesn't ping-pong between
  // similar-speed parts; a detached part must be clearly livelier to win.
  const tv = torso.velocity;
  let bestSpeed = (torso.space ? Math.hypot(tv.x, tv.y) : 0) + 90;
  for (const p of _dummy.parts) {
    if (!p.body.space) continue;
    const v = p.body.velocity;
    const s = Math.hypot(v.x, v.y);
    if (s > bestSpeed) { bestSpeed = s; best = p.body.position; }
  }
  return best;
}

function releaseHand() {
  if (!_hand) return;
  if (_hand.joint.space) _hand.joint.space = null;
  _hand = null;
}

function grabAt(x, y) {
  if (!_dummy) return false;
  let best = null, bestD = GRAB_R;
  for (const p of _dummy.parts) {
    if (!p.body.space) continue;
    const pos = p.body.position;
    const d = Math.hypot(x - pos.x, y - pos.y);
    if (d < bestD) { bestD = d; best = p; }
  }
  if (!best) return false;
  const joint = new PivotJoint(_space.world, best.body,
    new Vec2(x, y), new Vec2(0, 0));
  joint.stiff = false;
  joint.frequency = HAND_FREQ;
  joint.damping = HAND_DAMP;
  joint.space = _space;
  _hand = { body: best.body, joint };
  return true;
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "crash-test-hero",
  label: "Crash Test Hero",
  tags: ["Gameplay", "Ragdoll", "Breakable", "Callbacks", "Camera", "Drag"],
  featured: true,
  featuredOrder: 13,
  desc:
    "Turbo-Dismount-style crash scoring. Pose the ragdoll dummy on its cart by <b>dragging</b> any " +
    "body part, then <b>hold Space</b> (or the LAUNCH button) to charge the ping-ponging power meter " +
    "and release to launch it down the ramp, over the pit, down the staircase and into the trampoline, " +
    "the spinning paddle wheel and the crate wall. Damage IS the score — every hard contact pays out " +
    "points from measured <code>totalContactsImpulse</code> (head hits ×3), and the seatbelt, neck, " +
    "shoulders and hips are real <b>breakable constraints</b> (<code>maxForce</code> + " +
    "<code>breakUnderForce</code>) that snap for bonus points via a " +
    "<code>ConstraintListener(BREAK)</code>. Big hits freeze time and shake the camera. Mid-flight you " +
    "can still <b>grab</b> the dummy, or press <b>Space</b> to panic-flail (3 charges). " +
    "<b>R</b> restarts.",
  walls: false,
  workerCompatible: false,
  camera: null,

  setup(space) {
    _space = space;
    _runnerRef = this._runner ?? null;
    space.gravity = new Vec2(0, 800);
    _cbBreakable = new CbType();

    // Hard-reset module state — the previous load's bodies died with its space.
    _phase = "setup";
    _cart = null;
    _holder = null;
    _dummy = null;
    _seatbelt = null;
    _crates = [];
    _paddle = null;
    _breakables = new Map();
    _pendingBreaks.length = 0;
    _best = _best ?? null;           // session best survives reloads
    _hand = null;
    _mouse = null;
    _lockTimer = 0;
    _hitStopCd = 0;
    _tick = 0;
    _lastCamX = 0;
    _lastCamY = 0;

    spawnTerrain();
    spawnPaddle();
    enterSetup();

    // One listener for every breakable joint, matched via the shared
    // CbType (a null-options listener matches nothing in this engine).
    // Only queue here; step() drains.
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

    // Camera: rest on the launch tower while posing; during the run chase
    // the liveliest dummy part — when the head snaps off and bounces down
    // the staircase, THAT's the show, not the torso parked in the pit.
    this.camera = {
      follow: camTarget,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.1,
    };

    if (typeof window !== "undefined") {
      if (_lastKeyDown) window.removeEventListener("keydown", _lastKeyDown);
      if (_lastKeyUp) window.removeEventListener("keyup", _lastKeyUp);
      _lastKeyDown = (e) => {
        if (e.code === "KeyR") {
          e.preventDefault();
          enterSetup();
        } else if (e.code === "Space") {
          e.preventDefault();
          if (e.repeat) return;
          if (_phase === "setup") _charging = true;
          else if (_phase === "run") panicFlail();
          else if (_lockTimer <= 0) enterSetup();
        }
      };
      _lastKeyUp = (e) => {
        if (e.code === "Space" && _phase === "setup" && _charging) {
          e.preventDefault();
          doLaunch();
        }
      };
      window.addEventListener("keydown", _lastKeyDown);
      window.addEventListener("keyup", _lastKeyUp);
    }
  },

  step() {
    _tick++;
    if (_lockTimer > 0) _lockTimer--;
    if (_hitStopCd > 0) _hitStopCd--;
    if (_ouch > 0) _ouch--;
    for (let i = _floaters.length - 1; i >= 0; i--) {
      const f = _floaters[i];
      f.y -= 0.7;
      if (--f.life <= 0) _floaters.splice(i, 1);
    }
    for (let i = _fx.length - 1; i >= 0; i--) {
      if (--_fx[i].life <= 0) _fx.splice(i, 1);
    }

    // Hit-stop: physics frozen for a few frames while floaters/HUD animate.
    if (_hitStop > 0) {
      if (--_hitStop <= 0 && _runnerRef) _runnerRef.physicsPaused = false;
      return;
    }

    if (_phase === "setup") {
      if (_charging) {
        _power += _powerDir * POWER_RATE / 60;
        if (_power >= 1) { _power = 1; _powerDir = -1; }
        if (_power <= 0) { _power = 0; _powerDir = 1; }
      }
      return;
    }

    if (_phase !== "run") return;
    _runT = Math.max(0, _space.elapsedTime - _runBase);
    // Parked carts stop churning: the near-frictionless wheels otherwise
    // keep spinning for minutes and conveyor-belt any limb resting on them,
    // which stalls the rest detector.
    if (_cart) {
      const bv = _cart.board.velocity;
      if (Math.hypot(bv.x, bv.y) < 60) {
        for (const w of _cart.wheels) w.angularVel *= 0.96;
      }
    }
    // The head is a near-perfect ball and the course is polished steel —
    // material rolling friction pairs too low to matter, so bleed its spin
    // directly or a snapped-off head rolls end to end for half a minute.
    if (_dummy && _dummy.head.body.space) {
      _dummy.head.body.angularVel *= 0.98;
    }
    // Settling drag: parts below flight speed bleed velocity so the slick
    // course doesn't keep them creeping for half a minute after the show
    // is over. Anything actually flying (>80 px/s) is untouched.
    if (_dummy) {
      for (const p of _dummy.parts) {
        const b = p.body;
        if (!b.space) continue;
        const v = b.velocity;
        if (v.x * v.x + v.y * v.y < 6400) {
          b.velocity = new Vec2(v.x * 0.98, v.y * 0.98);
          b.angularVel *= 0.98;
        }
      }
    }
    drainBreaks();
    scoreImpacts();
    scoreCrates();
    checkRunEnd();
  },

  click(x, y) {
    _runnerRef = this._runner ?? _runnerRef;
    if (_phase === "done") {
      if (_lockTimer <= 0) enterSetup();
      return;
    }

    // Canvas UI is screen-anchored while clicks arrive in world coords.
    const sx = x - _lastCamX;
    const sy = y - _lastCamY;
    if (sx >= GO_RECT.x && sx <= GO_RECT.x + GO_RECT.w
      && sy >= GO_RECT.y && sy <= GO_RECT.y + GO_RECT.h) {
      if (_phase === "setup") _charging = true;   // hold-to-charge
      else enterSetup();                          // mid-run retry
      return;
    }

    grabAt(x, y);
  },

  drag(x, y) {
    _mouse = { x, y };
    if (_hand) _hand.joint.anchor1 = new Vec2(x, y);
  },

  release() {
    if (_charging && _phase === "setup") {
      doLaunch();
      return;
    }
    releaseHand();
  },

  hover(x, y) {
    _mouse = { x, y };
  },

  // Headless-test hook (Node smoke tests) — not a DemoRunner callback and
  // not included in generated CodePen/StackBlitz previews.
  _testState() {
    return {
      phase: _phase, power: _power, score: _score,
      impactScore: _impactScore, breakCount: _breakCount,
      crateCount: _crateCount, best: _best, grade: _grade,
      runT: _runT, quiet: _quiet, flails: _flails,
      dummy: _dummy, cart: _cart, crates: _crates, paddle: _paddle,
      breakables: _breakables, seatbelt: _seatbelt,
      enterSetup, doLaunch, finishRun, panicFlail,
      setPower: (p) => { _power = Math.max(0, Math.min(1, p)); },
      goRect: GO_RECT,
    };
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
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
    _lastCamX = camX;
    _lastCamY = camY;
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
  drawPad(ctx);
  drawPaddleHub(ctx);
  drawSeatbelt(ctx);
  drawFace(ctx);
  drawHoverRing(ctx);
  drawHand(ctx);
  drawFx(ctx);
  drawFloaters(ctx);
}

function drawPad(ctx) {
  // Pulsing chevrons over the trampoline so it reads as "bouncy".
  const pulse = (Math.sin(_tick * 0.12) + 1) / 2;
  ctx.strokeStyle = `rgba(63,185,80,${(0.35 + pulse * 0.45).toFixed(3)})`;
  ctx.lineWidth = 2;
  const top = PAD.y - PAD.h / 2;
  for (const dx of [-34, 0, 34]) {
    const x = PAD.x + dx;
    ctx.beginPath();
    ctx.moveTo(x - 8, top - 6);
    ctx.lineTo(x, top - 14 - pulse * 4);
    ctx.lineTo(x + 8, top - 6);
    ctx.stroke();
  }
}

function drawPaddleHub(ctx) {
  if (!_paddle) return;
  ctx.fillStyle = "#f85149";
  ctx.beginPath();
  ctx.arc(WHEEL_POS.x, WHEEL_POS.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(248,81,73,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.arc(WHEEL_POS.x, WHEEL_POS.y, WHEEL_ARM / 2 + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSeatbelt(ctx) {
  if (!_seatbelt || !_seatbelt.space || !_cart || !_dummy) return;
  const a = _cart.board.position;
  const b = _dummy.torso.body.position;
  ctx.strokeStyle = "#d29922";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(a.x - 10, a.y - BOARD_H / 2);
  ctx.lineTo(b.x, b.y + TORSO_H / 2 - 4);
  ctx.stroke();
}

// The dummy's face — two dot eyes that go X-shaped for a moment after a
// big hit. Drawn in the head's rotated frame so the face tumbles with it.
function drawFace(ctx) {
  if (!_dummy || !_dummy.head.body.space) return;
  const head = _dummy.head.body;
  const p = head.position;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(head.rotation);
  if (_ouch > 0) {
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 1.6;
    for (const ex of [-3.6, 3.6]) {
      ctx.beginPath();
      ctx.moveTo(ex - 2, -3.5); ctx.lineTo(ex + 2, 0.5);
      ctx.moveTo(ex + 2, -3.5); ctx.lineTo(ex - 2, 0.5);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "#c9d1d9";
    for (const ex of [-3.6, 3.6]) {
      ctx.beginPath();
      ctx.arc(ex, -1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHoverRing(ctx) {
  if (!_mouse || _hand || !_dummy) return;
  if (_phase === "done") return;
  let best = null, bestD = GRAB_R;
  for (const p of _dummy.parts) {
    if (!p.body.space) continue;
    const pos = p.body.position;
    const d = Math.hypot(_mouse.x - pos.x, _mouse.y - pos.y);
    if (d < bestD) { bestD = d; best = p; }
  }
  if (!best) return;
  const pos = best.body.position;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHand(ctx) {
  if (!_hand || !_hand.body.space) return;
  const p = _hand.body.position;
  const a = _hand.joint.anchor1;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#f0883e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFx(ctx) {
  for (const f of _fx) {
    const t = 1 - f.life / 20;
    ctx.strokeStyle = `rgba(${f.color},${(1 - t).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 6 + t * 26, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFloaters(ctx) {
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const f of _floaters) {
    const a = Math.min(1, f.life / 24);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawButton(ctx, rect, label, accent) {
  ctx.fillStyle = accent ? "rgba(63,185,80,0.22)" : "rgba(48,54,61,0.7)";
  ctx.strokeStyle = accent ? "#3fb950" : "#30363d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent ? "#7ee787" : "#c9d1d9";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 0.5);
}

function drawPowerMeter(ctx) {
  const w = 240, h = 16;
  const x = 16, y = SCREEN_H - 34;
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(x - 4, y - 20, w + 8, h + 26);
  ctx.fillStyle = "#8b949e";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    _charging ? `POWER ${Math.round(_power * 100)}%` : "POWER — hold Space / LAUNCH",
    x, y - 9,
  );
  ctx.fillStyle = "rgba(48,54,61,0.9)";
  ctx.fillRect(x, y, w, h);
  const t = _power;
  const r = Math.round(88 + t * 160);
  const g = Math.round(166 - t * 85);
  ctx.fillStyle = `rgb(${r},${g},73)`;
  ctx.fillRect(x, y, w * t, h);
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawHUD(ctx, W, H) {
  ctx.fillStyle = "rgba(13,17,23,0.88)";
  ctx.fillRect(0, 0, W, HUD_H);

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 17px system-ui, sans-serif";
  ctx.fillText(`DMG ${Math.round(_score).toLocaleString("en-US")}`, 16, HUD_H / 2);

  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  let x = 150;
  if (_best !== null) {
    ctx.fillText(`Best ${Math.round(_best).toLocaleString("en-US")}`, x, HUD_H / 2);
    x += 110;
  }
  ctx.fillText(`Snaps ${_breakCount}`, x, HUD_H / 2);
  x += 76;
  ctx.fillText(`Crates ${_crateCount}`, x, HUD_H / 2);
  x += 84;
  if (_phase === "run") {
    ctx.fillStyle = "#dbabff";
    ctx.fillText(`Flail ${"●".repeat(_flails)}${"○".repeat(FLAILS_PER_RUN - _flails)} (Space)`, x, HUD_H / 2);
  } else if (_phase === "setup") {
    ctx.fillStyle = "#58a6ff";
    ctx.fillText("Drag the dummy to pose it · hold Space to charge", x, HUD_H / 2);
  }

  if (_phase === "setup") {
    drawPowerMeter(ctx);
    drawButton(ctx, GO_RECT, "▶ LAUNCH (hold)", true);
  } else if (_phase === "run") {
    drawButton(ctx, GO_RECT, "↺ Retry", false);
  }

  if (_phase !== "done") return;

  // Results overlay.
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7ee787";
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.fillText(`GRADE ${_grade}`, W / 2, H / 2 - 64);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText(
    `Total damage ${Math.round(_score).toLocaleString("en-US")}`,
    W / 2, H / 2 - 22,
  );
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  ctx.fillText(
    `Impact ${Math.round(_impactScore).toLocaleString("en-US")}` +
    `  ·  Snapped joints ×${_breakCount} +${(_breakCount * BREAK_BONUS).toLocaleString("en-US")}` +
    `  ·  Crates ×${_crateCount} +${(_crateCount * CRATE_BONUS).toLocaleString("en-US")}`,
    W / 2, H / 2 + 10,
  );
  if (_isNewBest) {
    ctx.fillStyle = "#e3b341";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText("★ NEW SESSION BEST ★", W / 2, H / 2 + 38);
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(
    _lockTimer > 0 ? "…" : "Click / Space for another run · R resets",
    W / 2, H / 2 + 66,
  );
}
