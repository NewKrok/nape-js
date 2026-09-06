import {
  Body, BodyType, Vec2, Circle, Polygon, PivotJoint, AngleJoint,
  Material, InteractionFilter, CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.42.0";

// Arena (matches CW×CH used by examples.js). Named SCREEN_W/SCREEN_H — the
// CodePen runtime declares its own `W`/`H` and a duplicate top-level would
// throw SyntaxError (see top-down-shooter.js).
const SCREEN_W = 900, SCREEN_H = 500;
const HUD_H = 36;

// Ring geometry — central platform with two ring-out cliffs.
// Floor only exists between RING_LEFT and RING_RIGHT; bodies that drift
// past either edge fall into the void and trigger ring-out below
// FLOOR_THRESHOLD.
const RING_LEFT = 110;
const RING_RIGHT = SCREEN_W - 110;
const FLOOR_Y = SCREEN_H - 40;
const FLOOR_THRESHOLD = SCREEN_H + 80;

// Collision groups — fighters never collide with their own ragdoll segments
// (self-tangling kills gameplay), but each fighter collides with the other
// + walls + floor. Bit 16 = fighter A, bit 32 = fighter B; mask excludes own.
const GROUP_FLOOR = 8;
const GROUP_A = 16;
const GROUP_B = 32;
const MASK_A = ~GROUP_A & 0xffffffff;
const MASK_B = ~GROUP_B & 0xffffffff;

// Ragdoll dimensions — small enough for two to brawl in a 900×500 arena.
const TORSO_W = 22, TORSO_H = 46;
const HEAD_R = 11;
const ARM_LEN = 26, ARM_W = 7;
const LEG_LEN = 30, LEG_W = 9;

// ── Ragdoll behavior tuning ───────────────────────────────────────────────
const MOVE_SPEED = 130;            // target horizontal velocity
const MOVE_BLEND = 0.18;           // velocity lerp (snappy without teleport)
const JUMP_VEL = -130;             // initial upward velocity on jump press
const JUMP_HOLD_FRAMES = 8;        // extra "boost" frames while jump held
const JUMP_HOLD_ACCEL = -22;       // velocity nudge per held frame
const JUMP_COOLDOWN = 28;          // frames between jumps (must regain ground)
// Grounded probe: full standing height is torso half + two leg segments.
// Add slack so the fighter still counts as grounded when crouched or
// after a hard landing compresses the joints.
const STAND_HEIGHT = TORSO_H / 2 + LEG_LEN * 2;
const GROUND_PROBE = STAND_HEIGHT + 12;

// Strike actions — each maps to an action descriptor. The arm/leg's
// AngleJoint sweeps from idle range → driven target (jointMin === jointMax,
// stiff spring) during STRIKE_DURATION frames, then releases back to idle.
const STRIKE_DURATION = 22;
const STRIKE_DRIVE_FREQ = 16;
const STRIKE_DRIVE_DAMP = 0.5;
const IDLE_FREQ = 4;
const IDLE_DAMP = 0.7;
const ACTION_COOLDOWN = 10;        // frames between actions for same fighter

// Damage tuning — derived from contact impulse magnitude. The receiver's
// torso HP drops by impulse * DAMAGE_SCALE, clamped to MAX_HIT.
const DAMAGE_SCALE = 0.10;
const MIN_HIT = 1;
const MAX_HIT = 18;
const HIT_INVULN_FRAMES = 6;       // brief reset per torso to debounce
const MAX_HP = 100;

// AI tuning (state machine: idle → approach → strike → retreat → idle).
const AI_REACH = 86;               // close enough to strike
const AI_RETREAT_DIST = 48;        // back off after a strike to this gap
const AI_STRIKE_COOLDOWN_MIN = 14; // shorter than human spam-friction
const AI_STRIKE_COOLDOWN_MAX = 38;
const AI_RETREAT_DURATION_MIN = 6; // brief reposition, not a sprint home
const AI_RETREAT_DURATION_MAX = 14;
const AI_COMBO_CHANCE = 0.55;      // chance to chain a second strike at close range
const AI_COMBO_DELAY = 10;         // frames between combo hits
const AI_REACT_RANGE = 130;        // distance at which AI reacts to opponent strikes
const AI_REACT_JAB_CHANCE = 0.7;   // chance to counter-jab when opponent strikes
const AI_JUMP_CHANCE = 0.045;      // per-frame baseline jump while approaching
const AI_REACTION_JUMP_CHANCE = 0.35; // jump when opponent is above us
const AI_STRIKE_JUMP_CHANCE = 0.35; // chance to jump on the same frame as a close-range strike

const STRIKES = ["jab", "kick", "heavy"];

// Round flow
const ROUND_POST_FRAMES = 120;     // pause after KO before respawn
const ROUND_INTRO_FRAMES = 60;     // brief lock at round start

// ── Module state ──────────────────────────────────────────────────────────
let _space = null;
let _floor = null;
let _mode = "ai";                  // "ai" | "2p"
// Help is hidden by default — I toggles it. (Otherwise the overlay sits
// across the arena's bottom strip for the first 8 seconds and obscures the
// fight; a brief on-canvas hint covers most of the controls anyway.)
let _showHelp = false;
let _helpFadeTimer = 0;
let _fighters = [];                // [Fighter, Fighter]
let _score = [0, 0];
let _round = 1;
let _roundState = "intro";         // "intro" | "playing" | "post"
let _roundTimer = ROUND_INTRO_FRAMES;
let _winner = -1;                  // -1 = none, 0 or 1

// Damage events accumulated by the InteractionListener; drained between
// steps to avoid mid-step body mutation (matches top-down-shooter pattern).
const _pending = {
  hits: [],      // { victimIdx, damage }
};

// Per-frame input snapshot — populated from raw `_keys` each step so AI
// and human inputs go through the same control surface.
const _keys = Object.create(null);
const _input = [
  { left: false, right: false, jump: false, action: null },
  { left: false, right: false, jump: false, action: null },
];

let _onKeyDown = null;
let _onKeyUp = null;

// Callback types — torsos register the hit cbType; limbs are queried via
// userData._fighterId + _striking to filter "armed" swings.
let _cbTorso = null;
let _cbLimb = null;

// ── Helpers ───────────────────────────────────────────────────────────────
function bodyFromInt(intObj) {
  return intObj.castBody ?? intObj.castShape?.body ?? null;
}

function addBox(space, x, y, w, h, group, mask, fighterId, part, colorIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // Omit Material for Polygon — P53 bug: Polygon + explicit Material tunnels
  // through static Polygon floors. Defaults are fine for ragdoll segments.
  const shape = new Polygon(Polygon.box(w, h));
  shape.filter = new InteractionFilter(group, mask);
  body.shapes.add(shape);
  body.userData._fighterId = fighterId;
  body.userData._part = part;
  body.userData._colorIdx = colorIdx;
  body.cbTypes.add(_cbLimb);
  body.space = space;
  return body;
}

function addCircle(space, x, y, r, group, mask, fighterId, part, colorIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  // Circle + explicit Material is fine (P53 bug is Polygon-only).
  const shape = new Circle(r, undefined, new Material(0.3, 0.4, 0.5, 1));
  shape.filter = new InteractionFilter(group, mask);
  body.shapes.add(shape);
  body.userData._fighterId = fighterId;
  body.userData._part = part;
  body.userData._colorIdx = colorIdx;
  body.cbTypes.add(_cbLimb);
  body.space = space;
  return body;
}

function addPivot(space, b1, b2, a1, a2, jointBag) {
  const j = new PivotJoint(b1, b2, a1, a2);
  j.space = space;
  if (jointBag) jointBag.push(j);
  return j;
}

// Idle range joint: acts as a soft rotational *limit* (no spring force inside
// the window). When we want to drive a limb toward a target angle for a
// strike, we collapse min===max with a stiff spring (see setStrikeDrive).
function addAngle(space, b1, b2, min, max, freq, damp, jointBag) {
  const j = new AngleJoint(b1, b2, min, max);
  j.stiff = false;
  j.frequency = freq;
  j.damping = damp;
  j.space = space;
  if (jointBag) jointBag.push(j);
  return j;
}

function setIdleRange(joint, min, max) {
  // Order matters: shrink first so we never pass `min > max` to the setter,
  // which is a hard validation error.
  if (min <= joint.jointMax) {
    joint.jointMin = min;
    joint.jointMax = max;
  } else {
    joint.jointMax = max;
    joint.jointMin = min;
  }
  joint.frequency = IDLE_FREQ;
  joint.damping = IDLE_DAMP;
}

// Drive a joint toward a single target angle. jointMin === jointMax + stiff
// soft-spring = motor-like control without MotorJoint (issue's intent).
function setStrikeDrive(joint, target) {
  // Order matters here too — collapse via whichever side is on the correct
  // side of the current window so we don't violate min ≤ max mid-write.
  if (target >= joint.jointMin) {
    joint.jointMax = target;
    joint.jointMin = target;
  } else {
    joint.jointMin = target;
    joint.jointMax = target;
  }
  joint.frequency = STRIKE_DRIVE_FREQ;
  joint.damping = STRIKE_DRIVE_DAMP;
}

// ── Ragdoll factory ───────────────────────────────────────────────────────
// Each fighter is a sack of 11 bodies + joints. The `facing` argument (±1)
// flips the spawn pose so fighter B looks at fighter A.
function buildFighter(space, x, y, fighterId, facing) {
  const group = fighterId === 0 ? GROUP_A : GROUP_B;
  const mask = fighterId === 0 ? MASK_A : MASK_B;
  const cBody = fighterId === 0 ? 0 : 3;
  const cLimb = fighterId === 0 ? 4 : 1;
  // All joints get pushed here so despawn can detach them before the
  // bodies leave the space — nape's invariant is that a constraint and
  // both of its endpoints share the same space, and pulling the bodies
  // out while joints linger throws "Constraints must have each body
  // within the same space..." on the next mutation.
  const joints = [];

  // Torso. Rotation is locked — pure ragdoll fighters tip over instantly
  // under gravity since AngleJoints aren't a strong enough stabilizer for
  // the upper body. Locking the torso keeps the fighter upright like a
  // Gang-Beasts/Stick-Fight rig: floppy limbs, anchored core. The torso
  // still translates (move/jump/ringout) — only its angle is fixed.
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const torsoShape = new Polygon(Polygon.box(TORSO_W, TORSO_H));
  torsoShape.filter = new InteractionFilter(group, mask);
  torso.shapes.add(torsoShape);
  torso.allowRotation = false;
  torso.userData._fighterId = fighterId;
  torso.userData._part = "torso";
  torso.userData._colorIdx = cBody;
  torso.userData._hp = MAX_HP;
  torso.userData._maxHp = MAX_HP;
  torso.userData._invuln = 0;
  torso.cbTypes.add(_cbTorso);
  torso.space = space;

  // Head
  const head = addCircle(space, x, y - TORSO_H / 2 - HEAD_R - 2,
    HEAD_R, group, mask, fighterId, "head", cBody);

  // Neck — limited tilt range + soft spring back to upright.
  addPivot(space, torso, head, new Vec2(0, -TORSO_H / 2),
    new Vec2(0, HEAD_R), joints);
  addAngle(space, torso, head, -0.5, 0.5, 6, 0.5, joints);

  // ── Arms — upper + lower. Spawn pose: arms hang straight down by the
  // torso's sides (vertical), upper-arm box rotated 90° (built tall).
  // Mounted at the shoulder pivot so they swing forward/back on a strike.
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulderLocal = new Vec2(side * (TORSO_W / 2 - 1), -TORSO_H / 2 + 8);
    const upperX = x + side * (TORSO_W / 2 + ARM_W / 2);
    const upperY = y - TORSO_H / 2 + 8 + ARM_LEN / 2;
    // Use ARM_W as the "horizontal" extent + ARM_LEN as the vertical so
    // the arm box stands up — it's an axis-aligned tall thin rectangle.
    const upper = addBox(space, upperX, upperY, ARM_W, ARM_LEN,
      group, mask, fighterId, "upperArm" + (side > 0 ? "R" : "L"), cLimb);
    addPivot(space, torso, upper, shoulderLocal,
      new Vec2(0, -ARM_LEN / 2 + 1), joints);
    // Shoulder idle: arm can swing forward/back about ±half-π from rest,
    // can't bend backwards past the torso. Symmetric so left + right
    // behave identically.
    const shoulder = addAngle(space, torso, upper,
      -Math.PI * 0.6, Math.PI * 0.6, IDLE_FREQ, IDLE_DAMP, joints);

    const lowerY = upperY + ARM_LEN;
    const lower = addBox(space, upperX, lowerY, ARM_W, ARM_LEN,
      group, mask, fighterId, "lowerArm" + (side > 0 ? "R" : "L"), cLimb);
    addPivot(space, upper, lower, new Vec2(0, ARM_LEN / 2 - 1),
      new Vec2(0, -ARM_LEN / 2 + 1), joints);
    // Elbow only bends forward (toward the facing direction), never the
    // other way. side > 0 = right arm, bends to the right (positive).
    const elbow = addAngle(space, upper, lower,
      side > 0 ? -0.05 : -Math.PI * 0.7,
      side > 0 ? Math.PI * 0.7 : 0.05,
      IDLE_FREQ, IDLE_DAMP, joints);

    arms.push({ side, upper, lower, shoulder, elbow });
  }

  // ── Legs — upper + lower. Hip + knee mirror the arms but lower body.
  const legs = [];
  for (const side of [-1, 1]) {
    const sx = side * (TORSO_W / 2 - 4);
    const upperX = x + sx;
    const upperY = y + TORSO_H / 2 + LEG_LEN / 2 - 2;
    const upper = addBox(space, upperX, upperY, LEG_W, LEG_LEN,
      group, mask, fighterId, "upperLeg" + (side > 0 ? "R" : "L"), cLimb);
    addPivot(space, torso, upper, new Vec2(sx, TORSO_H / 2 - 2),
      new Vec2(0, -LEG_LEN / 2 + 1), joints);
    const hip = addAngle(space, torso, upper, -0.7, 0.7,
      IDLE_FREQ, IDLE_DAMP, joints);

    const lowerY = upperY + LEG_LEN;
    const lower = addBox(space, upperX, lowerY, LEG_W, LEG_LEN,
      group, mask, fighterId, "lowerLeg" + (side > 0 ? "R" : "L"), cLimb);
    addPivot(space, upper, lower, new Vec2(0, LEG_LEN / 2 - 1),
      new Vec2(0, -LEG_LEN / 2 + 1), joints);
    const knee = addAngle(space, upper, lower, -0.1, Math.PI * 0.5,
      IDLE_FREQ, IDLE_DAMP, joints);

    legs.push({ side, upper, lower, hip, knee });
  }

  // jabSide tracks the player's current facing direction and is updated
  // every frame in step() based on the last horizontal input. Spawn-time
  // facing is just the initial value.
  const jabSide = facing > 0 ? 1 : -1;

  return {
    id: fighterId,
    facing,
    jabSide,
    torso, head, arms, legs, joints,
    action: { kind: null, timer: 0, cooldown: 0 },
    ai: {
      state: "approach",
      strikeCdTimer: 30 + Math.random() * 60,
      postStrikeRetreat: 0,
      comboLeft: 0,
      comboDelay: 0,
    },
    grounded: false,
    jumpCd: 0,
    jumpHold: 0,
  };
}

// ── Ring + floor ──────────────────────────────────────────────────────────
// Single horizontal platform spanning RING_LEFT..RING_RIGHT. Sides are
// intentionally open — fighters that drift past the edge fall into the void
// and trigger ring-out below FLOOR_THRESHOLD.
function buildRing(space) {
  const cx = (RING_LEFT + RING_RIGHT) / 2;
  const w = RING_RIGHT - RING_LEFT;
  const floor = new Body(BodyType.STATIC, new Vec2(cx, FLOOR_Y + 10));
  // Static floor: keep using Polygon but no Material override (P53 bug).
  const floorShape = new Polygon(Polygon.box(w, 20));
  floorShape.filter = new InteractionFilter(GROUP_FLOOR, -1);
  floor.shapes.add(floorShape);
  floor.space = space;
  return floor;
}

// ── Action triggers ───────────────────────────────────────────────────────
// Each action collapses the relevant AngleJoint(s) to a single drive angle,
// runs for STRIKE_DURATION frames, then releases back to idle ranges in
// updateAction(). While active the *contact* limb is flagged `_striking`
// so the InteractionListener counts impulse magnitude as a real hit.
function triggerAction(f, kind) {
  if (f.action.cooldown > 0) return;
  if (f.action.timer > 0) return;
  f.action.kind = kind;
  f.action.timer = STRIKE_DURATION;
  f.action.cooldown = ACTION_COOLDOWN;

  const side = f.jabSide;
  const arm = f.arms.find(a => a.side === side);
  const leg = f.legs.find(l => l.side === side);
  const otherArm = f.arms.find(a => a.side === -side);

  // Strike target angles, in shoulder/hip local space. Arm rest = 0 (hangs
  // straight down). Positive shoulder angle rotates the arm forward in the
  // +side direction; for the left arm (side=-1) the forward direction is
  // negative so we multiply by `side` and `-side` accordingly.
  if (kind === "jab") {
    // Punch straight ahead — shoulder swings forward 90°, elbow snaps out.
    setStrikeDrive(arm.shoulder, side * (Math.PI / 2));
    setStrikeDrive(arm.elbow, side * 0.1);
    arm.lower.userData._striking = true;
    arm.upper.userData._striking = true;
  } else if (kind === "kick") {
    // Front kick — hip swings forward ~60°, knee snaps out.
    setStrikeDrive(leg.hip, side * 1.1);
    setStrikeDrive(leg.knee, side * 0.1);
    leg.lower.userData._striking = true;
    leg.upper.userData._striking = true;
  } else if (kind === "heavy") {
    // Both arms wind overhead then crash down — shoulders driven past 90°.
    setStrikeDrive(arm.shoulder, side * (Math.PI * 0.55));
    setStrikeDrive(otherArm.shoulder, -side * (Math.PI * 0.55));
    setStrikeDrive(arm.elbow, side * 0.1);
    setStrikeDrive(otherArm.elbow, -side * 0.1);
    arm.lower.userData._striking = true;
    arm.upper.userData._striking = true;
    otherArm.lower.userData._striking = true;
    otherArm.upper.userData._striking = true;
  }
}

function releaseStrike(f) {
  // Restore idle ranges + clear striking flags for all limbs (cheap +
  // idempotent; safer than tracking which kind we were in).
  for (const arm of f.arms) {
    setIdleRange(arm.shoulder, -Math.PI * 0.6, Math.PI * 0.6);
    if (arm.side > 0) {
      setIdleRange(arm.elbow, -0.05, Math.PI * 0.7);
    } else {
      setIdleRange(arm.elbow, -Math.PI * 0.7, 0.05);
    }
    arm.lower.userData._striking = false;
    arm.upper.userData._striking = false;
  }
  for (const leg of f.legs) {
    setIdleRange(leg.hip, -0.7, 0.7);
    setIdleRange(leg.knee, -0.1, Math.PI * 0.5);
    leg.lower.userData._striking = false;
    leg.upper.userData._striking = false;
  }
  f.action.kind = null;
}

function updateAction(f) {
  if (f.action.cooldown > 0) f.action.cooldown--;
  if (f.action.timer > 0) {
    f.action.timer--;
    if (f.action.timer <= 0) releaseStrike(f);
  }
}

// ── Movement + jumping ────────────────────────────────────────────────────
// Drive torso horizontal velocity toward the input direction. We deliberately
// avoid touching torso.velocity.y so gravity stays in charge of vertical
// motion (otherwise jumps get cancelled or the fighter floats).
function applyMovement(f, input) {
  if (!f.torso.space) return;
  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  const target = dir * MOVE_SPEED;
  const v = f.torso.velocity;
  const nx = v.x + (target - v.x) * MOVE_BLEND;
  f.torso.velocity = new Vec2(nx, v.y);
}

// Grounded test — simple bounds check against floor Y. Cheap, no raycast.
// Accurate enough for jump gating; the ragdoll's torso center sits well
// above FLOOR_Y at rest.
function isGrounded(f) {
  if (!f.torso.space) return false;
  const py = f.torso.position.y;
  // Within probe distance of floor AND between RING_LEFT/RIGHT (no ground
  // beyond the platform — can't double-jump off a void).
  const px = f.torso.position.x;
  if (px < RING_LEFT || px > RING_RIGHT) return false;
  return py + GROUND_PROBE >= FLOOR_Y;
}

function startJump(f) {
  if (f.jumpCd > 0) return;
  if (!isGrounded(f)) return;
  // Apply the upward velocity to every body in the rig, not just the
  // torso — the limbs are roughly twice the torso's combined mass, so
  // shoving only the torso fires it skyward while the joints rip the
  // legs along like deadweight. Boosting the whole rig produces a
  // crisp, predictable hop.
  setRigVelocityY(f, JUMP_VEL);
  f.jumpCd = JUMP_COOLDOWN;
  f.jumpHold = JUMP_HOLD_FRAMES;
}

// While the jump key is held (up to JUMP_HOLD_FRAMES after lift-off),
// keep nudging the rig upward. Lets the player tune jump height — a
// quick tap is a short hop, holding it is a full-height leap.
function continueJumpIfHeld(f, jumpHeld) {
  if (f.jumpHold <= 0) return;
  if (!jumpHeld) { f.jumpHold = 0; return; }
  f.jumpHold--;
  const v = f.torso.velocity;
  if (v.y > 0) { f.jumpHold = 0; return; } // already descending — stop
  setRigVelocityY(f, v.y + JUMP_HOLD_ACCEL);
}

function setRigVelocityY(f, vy) {
  const allBodies = [f.torso, f.head,
    ...f.arms.flatMap(a => [a.upper, a.lower]),
    ...f.legs.flatMap(l => [l.upper, l.lower])];
  for (const b of allBodies) {
    const v = b.velocity;
    b.velocity = new Vec2(v.x, vy);
  }
}

// ── AI ────────────────────────────────────────────────────────────────────
function aiTick(f, opponent) {
  // Drive the AI side's `_input` slot — that way the regular movement +
  // action paths handle it identically to a human input.
  const slot = _input[f.id];
  slot.left = slot.right = slot.jump = false;
  slot.action = null;
  if (!f.torso.space || !opponent.torso.space) return;

  const dx = opponent.torso.position.x - f.torso.position.x;
  const dy = opponent.torso.position.y - f.torso.position.y;
  const dist = Math.hypot(dx, dy);

  // Face the opponent — flip jabSide if they crossed sides. Keeps strikes
  // pointed at the target without rebuilding joints.
  f.jabSide = dx >= 0 ? 1 : -1;
  f.facing = f.jabSide;

  // React to the opponent's strikes — if they just queued an action and
  // we're close enough to counter, jab back on the next tick instead of
  // sitting still. This is what makes the AI feel less passive.
  const oppAction = opponent.action;
  const oppStartedStrike =
    oppAction && oppAction.timer >= STRIKE_DURATION - 2 && oppAction.kind != null;
  const canStrikeNow =
    f.action.timer <= 0 && f.action.cooldown <= 0;

  if (oppStartedStrike && dist < AI_REACT_RANGE && canStrikeNow
      && Math.random() < AI_REACT_JAB_CHANCE) {
    // Counter-jab — closes faster than the opponent's strike connects.
    slot.action = dist < AI_REACH * 0.8 ? "jab" : "kick";
    f.ai.strikeCdTimer = AI_STRIKE_COOLDOWN_MIN;
    f.ai.postStrikeRetreat = 0;
    f.ai.comboLeft = 0;
    // Still need to close the gap if just out of reach.
    if (Math.abs(dx) > AI_REACH * 0.7) {
      if (dx > 0) slot.right = true; else slot.left = true;
    }
    return;
  }

  // FSM: short reposition after a hit, otherwise approach until in reach
  // then strike. Retreat is intentionally brief so the AI doesn't strand
  // itself far away after every jab.
  if (f.ai.postStrikeRetreat > 0) {
    f.ai.postStrikeRetreat--;
    f.ai.state = "retreat";
  } else if (dist > AI_REACH) {
    f.ai.state = "approach";
  } else {
    f.ai.state = "strike";
  }

  if (f.ai.state === "approach") {
    if (dx > 6) slot.right = true;
    else if (dx < -6) slot.left = true;
    // Jump baseline + when the opponent is above us (they jumped or are
    // on a knockback arc — we want to meet them or block their landing).
    if (Math.random() < AI_JUMP_CHANCE) slot.jump = true;
    if (dy < -28 && Math.random() < AI_REACTION_JUMP_CHANCE) slot.jump = true;
    // If approaching the very edge of reach, queue an opening strike so
    // we connect on the same frame we enter range.
    if (dist < AI_REACH + 8 && canStrikeNow) {
      slot.action = dy < -20 ? "jab" : "kick";
      f.ai.comboLeft = Math.random() < AI_COMBO_CHANCE ? 1 : 0;
      f.ai.comboDelay = AI_COMBO_DELAY;
      f.ai.postStrikeRetreat = AI_RETREAT_DURATION_MIN +
        Math.floor(Math.random() * (AI_RETREAT_DURATION_MAX - AI_RETREAT_DURATION_MIN));
    }
  } else if (f.ai.state === "retreat") {
    if (dx > 0) slot.left = true;
    else slot.right = true;
    if (dist >= AI_RETREAT_DIST) {
      f.ai.postStrikeRetreat = 0;
    }
    // Mid-retreat hops — keeps the AI mobile instead of skating straight back.
    if (Math.random() < AI_JUMP_CHANCE * 0.6) slot.jump = true;
  } else if (f.ai.state === "strike") {
    // Keep edging in if just out of range, otherwise pick a strike.
    if (Math.abs(dx) > AI_REACH - 10) {
      if (dx > 0) slot.right = true; else slot.left = true;
    }
    // Combo follow-up: if we still have a queued combo hit, fire on the
    // combo delay regardless of the per-strike cooldown.
    if (f.ai.comboLeft > 0 && canStrikeNow) {
      f.ai.comboDelay--;
      if (f.ai.comboDelay <= 0) {
        slot.action = Math.random() < 0.5 ? "heavy" : "jab";
        f.ai.comboLeft--;
        f.ai.strikeCdTimer = AI_STRIKE_COOLDOWN_MIN;
        f.ai.postStrikeRetreat = f.ai.comboLeft > 0
          ? 0
          : AI_RETREAT_DURATION_MIN +
            Math.floor(Math.random() * (AI_RETREAT_DURATION_MAX - AI_RETREAT_DURATION_MIN));
        return;
      }
    }
    f.ai.strikeCdTimer--;
    if (f.ai.strikeCdTimer <= 0 && canStrikeNow) {
      // Bias by vertical offset — kick more when on the ground, heavy when
      // close, jab as the bread-and-butter mid-range poke.
      let kind;
      const r = Math.random();
      if (dist < AI_REACH * 0.55) kind = r < 0.55 ? "heavy" : "jab";
      else if (dy > 20) kind = r < 0.6 ? "kick" : "jab";
      else kind = r < 0.55 ? "jab" : (r < 0.8 ? "kick" : "heavy");
      slot.action = kind;
      // Spice it up with the occasional jump-strike — gives the AI an
      // attack from above and breaks up flat brawl on the platform.
      if (Math.random() < AI_STRIKE_JUMP_CHANCE) slot.jump = true;
      f.ai.strikeCdTimer = AI_STRIKE_COOLDOWN_MIN
        + Math.random() * (AI_STRIKE_COOLDOWN_MAX - AI_STRIKE_COOLDOWN_MIN);
      // Queue a combo follow-up at close range.
      f.ai.comboLeft = dist < AI_REACH * 0.7 && Math.random() < AI_COMBO_CHANCE ? 1 : 0;
      f.ai.comboDelay = AI_COMBO_DELAY;
      f.ai.postStrikeRetreat = f.ai.comboLeft > 0
        ? 0
        : AI_RETREAT_DURATION_MIN +
          Math.floor(Math.random() * (AI_RETREAT_DURATION_MAX - AI_RETREAT_DURATION_MIN));
    }
  }
}

// Edge nudge — if a fighter ends up past the ring edge but the torso is still
// near floor height (e.g. clinging at the lip), bias the AI input back toward
// center. Stops "wandered into the void" auto-rounds when the human is
// nowhere near them.
function edgeBias(f) {
  if (_mode !== "ai" || f.id === 0) return; // P1 is always human in AI mode
  const px = f.torso.position.x;
  const py = f.torso.position.y;
  if (py > FLOOR_Y - 10) return; // already falling
  const slot = _input[f.id];
  if (px < RING_LEFT + 30) { slot.right = true; slot.left = false; }
  else if (px > RING_RIGHT - 30) { slot.left = true; slot.right = false; }
}

// ── Input collection ──────────────────────────────────────────────────────
// Translate raw key state into the structured _input slots that movement,
// jumping and action triggers consume. Action keys are debounced via
// _actionEdge so holding a button doesn't queue infinite strikes.
const _actionEdge = [
  { jab: false, kick: false, heavy: false },
  { jab: false, kick: false, heavy: false },
];

function readHumanInput(slot, p, mapping) {
  slot.left = !!_keys[mapping.left];
  slot.right = !!_keys[mapping.right];
  slot.jump = !!_keys[mapping.jump];
  // Edge-trigger actions: register only on the press transition.
  for (const k of STRIKES) {
    const pressed = !!_keys[mapping[k]];
    if (pressed && !_actionEdge[p][k]) {
      slot.action = k;
    }
    _actionEdge[p][k] = pressed;
  }
}

const P1_MAP = {
  left: "KeyA", right: "KeyD", jump: "KeyW",
  jab: "KeyF", kick: "KeyG", heavy: "KeyH",
};
const P2_MAP = {
  left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp",
  jab: "KeyJ", kick: "KeyK", heavy: "KeyL",
};

function collectInputs() {
  // Wipe action slots so a stale value doesn't fire twice.
  _input[0].action = null;
  _input[1].action = null;
  // During the intro lock both fighters stand still — no movement, no
  // strikes, no AI steering. Lets them settle on the floor visually.
  if (_roundState === "intro") {
    for (const slot of _input) {
      slot.left = slot.right = slot.jump = false;
      slot.action = null;
    }
    return;
  }

  readHumanInput(_input[0], 0, P1_MAP);
  if (_mode === "2p") {
    readHumanInput(_input[1], 1, P2_MAP);
  } else {
    // AI fills _input[1] in aiTick().
    aiTick(_fighters[1], _fighters[0]);
    edgeBias(_fighters[1]);
  }
}

// ── Damage pipeline ───────────────────────────────────────────────────────
// Called from the limb↔torso InteractionListener. We need impulse magnitude
// from the callback's arbiter list. Only count when the striker's limb is
// flagged `_striking` (i.e. we initiated a swing this window), otherwise a
// fighter just leaning on the opponent would chip HP infinitely.
function handleLimbTorsoBegin(cb) {
  const b1 = bodyFromInt(cb.int1), b2 = bodyFromInt(cb.int2);
  if (!b1 || !b2) return;
  const ud1 = b1.userData, ud2 = b2.userData;
  if (!ud1 || !ud2) return;

  // Identify striker (the limb with _striking=true) and victim (the torso
  // belonging to the other fighter).
  let striker = null, victimTorso = null;
  if (ud1._striking && ud2._part === "torso" && ud1._fighterId !== ud2._fighterId) {
    striker = b1; victimTorso = b2;
  } else if (ud2._striking && ud1._part === "torso" && ud2._fighterId !== ud1._fighterId) {
    striker = b2; victimTorso = b1;
  }
  if (!striker || !victimTorso) return;
  if (victimTorso.userData._invuln > 0) return;

  // Estimate hit magnitude — torso impulse is the cheapest reliable proxy
  // (callback arbiters are inconvenient mid-listener). The torso's
  // pre-collision velocity vs striker's velocity gives a usable "force" estimate.
  const vS = striker.velocity, vT = victimTorso.velocity;
  const rel = Math.hypot(vS.x - vT.x, vS.y - vT.y);
  // Boost by action kind so heavy > kick > jab even at similar speeds.
  const f = _fighters[striker.userData._fighterId];
  const kindMul = f.action.kind === "heavy" ? 1.5
                : f.action.kind === "kick"  ? 1.2
                : 1.0;
  const dmg = Math.max(MIN_HIT,
    Math.min(MAX_HIT, Math.round(rel * DAMAGE_SCALE * kindMul)));

  victimTorso.userData._invuln = HIT_INVULN_FRAMES;
  const victimId = victimTorso.userData._fighterId;
  _pending.hits.push({ victimIdx: victimId, damage: dmg });

  // Mark the AI to retreat slightly longer after landing a hit.
  if (_mode === "ai" && striker.userData._fighterId === 1) {
    _fighters[1].ai.postStrikeRetreat = 35 + Math.floor(Math.random() * 25);
  }
}

function drainHits() {
  for (const hit of _pending.hits) {
    const f = _fighters[hit.victimIdx];
    if (!f) continue;
    f.torso.userData._hp = Math.max(0, f.torso.userData._hp - hit.damage);
  }
  _pending.hits.length = 0;
}

// ── Round flow ────────────────────────────────────────────────────────────
function despawnFighter(f) {
  // Detach the joints BEFORE removing the bodies. Nape requires a
  // constraint's two endpoints to live in the same space as the
  // constraint itself; pulling bodies out first leaves dangling joints
  // and the next mutation throws
  //   "Constraints must have each body within the same space..."
  for (const j of f.joints) {
    if (j.space) j.space = null;
  }
  f.joints.length = 0;
  const parts = [f.torso, f.head,
    ...f.arms.flatMap(a => [a.upper, a.lower]),
    ...f.legs.flatMap(l => [l.upper, l.lower])];
  for (const b of parts) if (b.space) b.space = null;
}

function spawnRound() {
  for (const f of _fighters) despawnFighter(f);
  // Spawn the torso center one full standing-height above the floor so the
  // feet land on top, not buried in the static platform.
  const spawnY = FLOOR_Y - STAND_HEIGHT - 4;
  _fighters = [
    buildFighter(_space, SCREEN_W / 2 - 120, spawnY, 0, +1),
    buildFighter(_space, SCREEN_W / 2 + 120, spawnY, 1, -1),
  ];
  _winner = -1;
  _roundState = "intro";
  _roundTimer = ROUND_INTRO_FRAMES;
  _pending.hits.length = 0;
  for (const p of _actionEdge) { p.jab = p.kick = p.heavy = false; }
  for (const slot of _input) {
    slot.left = slot.right = slot.jump = false;
    slot.action = null;
  }
}

function checkWinCondition() {
  if (_roundState !== "playing") return;
  // Ring-out: torso below FLOOR_THRESHOLD wins for the other side.
  for (let i = 0; i < 2; i++) {
    const f = _fighters[i];
    if (!f.torso.space) continue;
    const ringedOut = f.torso.position.y > FLOOR_THRESHOLD;
    const koed = f.torso.userData._hp <= 0;
    if (!ringedOut && !koed) continue;

    _winner = 1 - i;
    _score[_winner]++;
    _roundState = "post";
    _roundTimer = ROUND_POST_FRAMES;
    // Collapse the loser (skip on ring-out — they're already gone).
    // knockbackDir points away from the winner so the loser falls back.
    if (!ringedOut) {
      const winner = _fighters[_winner];
      const dx = f.torso.position.x - winner.torso.position.x;
      collapseFighter(f, dx >= 0 ? 1 : -1);
    }
    return;
  }
}

// Drop the fighter to the ground when they lose a round: unlock the
// torso (so gravity tips it), give the rig a backwards shove, and widen
// each AngleJoint range so the limbs flop instead of staying tucked.
// Called from checkWinCondition() on KO and ring-out alike.
function collapseFighter(f, knockbackDir) {
  if (!f.torso.space) return;
  f.torso.allowRotation = true;
  // Backwards + upward shove on the torso — small enough that it doesn't
  // ring-out the loser when the cause was HP, big enough to look
  // visibly defeated.
  const tv = f.torso.velocity;
  f.torso.velocity = new Vec2(tv.x + knockbackDir * 90, tv.y - 60);
  // Widen every AngleJoint into a free hinge. We collect them by walking
  // the limb structs the buildFighter exposes — safer than sniffing the
  // joint list, which mixes pivots + angle joints.
  const angleJoints = [];
  for (const a of f.arms) angleJoints.push(a.shoulder, a.elbow);
  for (const l of f.legs) angleJoints.push(l.hip, l.knee);
  for (const j of angleJoints) {
    j.jointMin = -Math.PI;
    j.jointMax = Math.PI;
    j.frequency = 2;
    j.damping = 0.3;
  }
}

// ── Top-level demo lifecycle ──────────────────────────────────────────────
function resetDemo() {
  // Detach each fighter's joints + bodies in the correct order (see
  // despawnFighter for the rationale). The floor stays — it was built
  // once at setup time and is reused across resets.
  for (const f of _fighters) despawnFighter(f);
  _fighters = [];
  _score = [0, 0];
  _round = 1;
  spawnRound();
}

// ── Rendering ─────────────────────────────────────────────────────────────
// Everything below runs on the 2D overlay context — works identically across
// canvas2d / threejs / pixi adapters via render3dOverlay.
function drawHpBars(ctx) {
  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  const barW = 280, barH = 14;
  for (let i = 0; i < 2; i++) {
    const f = _fighters[i];
    if (!f) continue;
    const isLeft = i === 0;
    const x = isLeft ? 10 : SCREEN_W - 10 - barW;
    const y = 8;
    const hp = f.torso.space ? f.torso.userData._hp : 0;
    const pct = Math.max(0, hp / MAX_HP);
    ctx.fillStyle = "rgba(13,17,23,0.85)";
    ctx.fillRect(x, y, barW, barH);
    const col = isLeft ? "#58a6ff" : "#f85149";
    ctx.fillStyle = col;
    // Right side drains from the right edge so both bars deplete inward.
    if (isLeft) {
      ctx.fillRect(x, y, barW * pct, barH);
    } else {
      ctx.fillRect(x + barW - barW * pct, y, barW * pct, barH);
    }
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, barW - 1, barH - 1);

    // Name + HP number
    ctx.fillStyle = "#c9d1d9";
    ctx.textAlign = isLeft ? "left" : "right";
    const label = isLeft ? "P1" : (_mode === "ai" ? "AI" : "P2");
    ctx.fillText(`${label}  ${Math.round(hp)}`, isLeft ? x + 6 : x + barW - 6, y + barH / 2);
  }
}

function drawCenterHUD(ctx) {
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Round ${_round}   ${_score[0]} : ${_score[1]}`, SCREEN_W / 2, 15);
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  const modeTxt = _mode === "ai" ? "AI — T: 2P · R: restart · I: controls"
                                 : "2P — T: AI · R: restart · I: controls";
  ctx.fillText(modeTxt, SCREEN_W / 2, HUD_H - 8);
}

function drawHelp(ctx) {
  if (!_showHelp) return;
  // Auto-fade after a few seconds so the help doesn't camp on top of play.
  const alpha = _helpFadeTimer > 60 ? 0.9 : Math.max(0, _helpFadeTimer / 60) * 0.9;
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const lines = [
    "P1:  A / D move   W jump   F jab   G kick   H heavy",
    _mode === "ai"
      ? "P2:  AI controlled"
      : "P2:  ← / → move   ↑ jump   J jab   K kick   L heavy",
    "T  toggle AI/2P    R  restart    I  hide help",
  ];
  const w = 470, h = 18 * lines.length + 14;
  const x = (SCREEN_W - w) / 2;
  const y = SCREEN_H - h - 8;
  ctx.fillStyle = "rgba(13,17,23,0.78)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#30363d";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "#c9d1d9";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + 10, y + 8 + i * 18);
  }
  ctx.restore();
}

function drawRoundBanner(ctx) {
  if (_roundState === "intro") {
    const a = Math.min(1, _roundTimer / 30);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`Round ${_round}`, SCREEN_W / 2, SCREEN_H / 2 - 30);
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "#8b949e";
    ctx.fillText("Fight!", SCREEN_W / 2, SCREEN_H / 2);
    ctx.restore();
  } else if (_roundState === "post") {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, HUD_H, SCREEN_W, SCREEN_H - HUD_H);
    ctx.fillStyle = _winner === 0 ? "#58a6ff" : "#f85149";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = _winner === 0 ? "P1 wins!" : (_mode === "ai" ? "AI wins" : "P2 wins!");
    ctx.fillText(label, SCREEN_W / 2, SCREEN_H / 2 - 20);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(`Next round in ${Math.ceil(_roundTimer / 60)}s    press R to restart match`, SCREEN_W / 2, SCREEN_H / 2 + 18);
    ctx.restore();
  }
}

function drawRingEdges(ctx) {
  // Mark the ring-out cliffs so players know where the void starts.
  ctx.save();
  ctx.strokeStyle = "rgba(248,81,73,0.45)";
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(RING_LEFT, FLOOR_Y);
  ctx.lineTo(RING_LEFT, FLOOR_Y + 30);
  ctx.moveTo(RING_RIGHT, FLOOR_Y);
  ctx.lineTo(RING_RIGHT, FLOOR_Y + 30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "floppy-fists",
  label: "Floppy Fists",
  tags: ["Gameplay", "Ragdoll", "AngleJoint", "Callbacks", "AI"],
  featured: true,
  featuredOrder: 12,
  desc:
    "Two ragdoll brawlers fight in a tiny ring — knock the opponent out (HP ≤ 0) or off the platform. " +
    "Limbs are driven by mutating <code>AngleJoint</code> targets each frame (motor-like control without <code>MotorJoint</code>); " +
    "<code>InteractionListener</code> tallies damage from contact impulse. " +
    "<b>P1</b>: <code>A/D</code> move, <code>W</code> jump, <code>F</code> jab, <code>G</code> kick, <code>H</code> heavy. " +
    "<b>P2</b>: arrows + <code>J/K/L</code>, or AI. Press <code>T</code> to toggle AI/2P, <code>R</code> to restart, <code>I</code> for help.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 800);

    _cbTorso = new CbType();
    _cbLimb = new CbType();

    _floor = buildRing(space);

    _mode = "ai";
    _showHelp = false;
    _helpFadeTimer = 0;
    _score = [0, 0];
    _round = 1;
    _fighters = [];
    _pending.hits.length = 0;
    for (const k in _keys) delete _keys[k];
    for (const p of _actionEdge) { p.jab = p.kick = p.heavy = false; }
    for (const slot of _input) {
      slot.left = slot.right = slot.jump = false;
      slot.action = null;
    }

    spawnRound();

    // Limb (any segment) hits torso → maybe damage.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbLimb, _cbTorso,
      (cb) => handleLimbTorsoBegin(cb),
    ));

    // Important: clear previous listeners before adding new ones — the
    // docs runner can call setup() multiple times (renderer switch, play
    // → stop → play) and we'd otherwise stack closures, each of which
    // wakes on every key press and trips the mode toggle twice.
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    _onKeyDown = (e) => {
      if (!_space) return;
      _keys[e.code] = true;
      // Mode + match controls fire on edge, not from the input slots.
      if (e.code === "KeyT") {
        _mode = _mode === "ai" ? "2p" : "ai";
        _helpFadeTimer = 60 * 5;
        e.preventDefault();
      } else if (e.code === "KeyR") {
        resetDemo();
        e.preventDefault();
      } else if (e.code === "KeyI") {
        // KeyI (info) — F1 is intercepted by browsers (devtools shortcut
        // on some, no-op suppressable on others) so it never reaches the
        // page reliably. KeyH is the heavy attack so it's spoken for too.
        _showHelp = !_showHelp;
        _helpFadeTimer = _showHelp ? 60 * 5 : 0;
        e.preventDefault();
      }
    };
    _onKeyUp = (e) => {
      if (!_space) return;
      _keys[e.code] = false;
    };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  step(space) {
    void space;
    drainHits();

    // Manage round timer first — during intro and post we don't accept input
    // (intro for a brief beat, post until respawn).
    if (_roundState === "intro") {
      _roundTimer--;
      if (_roundTimer <= 0) _roundState = "playing";
    } else if (_roundState === "post") {
      _roundTimer--;
      if (_roundTimer <= 0) {
        _round++;
        spawnRound();
      }
      return;
    }

    if (_helpFadeTimer > 0) _helpFadeTimer--;

    collectInputs();

    for (let i = 0; i < _fighters.length; i++) {
      const f = _fighters[i];
      if (!f.torso.space) continue;

      // Invuln tick (debounces repeat-contact damage).
      if (f.torso.userData._invuln > 0) f.torso.userData._invuln--;

      // Jump cooldown countdown.
      if (f.jumpCd > 0) f.jumpCd--;

      const input = _input[i];
      // Human-controlled fighters face the direction of the most recent
      // horizontal input. Without this the strike direction is frozen to
      // the spawn-time facing, so jabs always point the same way even
      // after the player turns around. (AI fighters get their jabSide
      // overwritten inside aiTick based on the opponent's position.)
      const isHuman = i === 0 || _mode === "2p";
      if (isHuman) {
        if (input.right) f.jabSide = 1;
        else if (input.left) f.jabSide = -1;
        f.facing = f.jabSide;
      }
      applyMovement(f, input);
      // input.jump is the current key state (true while held). startJump
      // only fires when grounded + cooldown elapsed; continueJumpIfHeld
      // adds a few frames of upward boost while the key is still held.
      if (input.jump) startJump(f);
      continueJumpIfHeld(f, !!input.jump);
      if (input.action && _roundState === "playing") triggerAction(f, input.action);

      f.grounded = isGrounded(f);
      updateAction(f);
    }

    checkWinCondition();
  },

  render3dOverlay(ctx) {
    // Translucent HUD strip behind the round/score text + HP bars.
    ctx.fillStyle = "rgba(13,17,23,0.55)";
    ctx.fillRect(0, 0, SCREEN_W, HUD_H);
    drawHpBars(ctx);
    drawCenterHUD(ctx);
    drawRingEdges(ctx);
    drawRoundBanner(ctx);
    drawHelp(ctx);
  },
};
