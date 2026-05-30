import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  SpringJoint, LineJoint, MotorJoint, PivotJoint, AngleJoint, WeldJoint,
} from "../nape-js.esm.js";

// Dirtline — a side-view hill-climb / trials motorbike with an articulated
// ragdoll rider. A deliberately richer sibling of `car-sideview.js`: the bike
// has MotorJoint-driven wheels on SpringJoint suspension, and the rider is a
// PivotJoint+AngleJoint ragdoll WELDED to the chassis at the pelvis. As you
// pitch the bike (lean keys apply chassis torque) the welded pelvis drags the
// torso, so the rider visibly sways forward/back within its AngleJoint range.
// Flip the bike past a threshold (or smack the ground hard) and the seat weld
// breaks away — the rider detaches and ragdolls free off the back.
//
// Renderer-agnostic: the default body draw handles every part across
// canvas2d / threejs / pixi; `render3dOverlay` paints the springs + HUD on top.
// CodePen-safe: no imports inside setup/step, no module-level W/H — the screen
// dims come from SCREEN_W / SCREEN_H.

const SCREEN_W = 900;
const SCREEN_H = 500;

// Dev toggle: build the bike alone (no rider) while iterating on the chassis +
// suspension. Flip back to true once the bike looks/behaves right.
const BUILD_RIDER = true;

// ── World / terrain ─────────────────────────────────────────────────────────
const WORLD_W = 6000;
const SEG_W = 24;               // terrain sample spacing (fine enough that the
                                // ramp lips read as smooth launches, not steps)
const GRAVITY = 1100;

// Rolling hills are a sum of sines — same trick as car-sideview but longer and
// a touch tamer so the bike can actually climb. groundY is the baseline.
// Kicker ramps spaced along the course — each launches the bike for real air
// (the smooth sine hills alone only make little hops). A ramp is an asymmetric
// bump: a long gentle approach up the front and a sharp drop off the back, so
// you hit it, get launched, and have to control rotation before landing. Folded
// into terrainY so the surface stays continuous (no seams to snag a wheel on).
const RAMPS = [
  { x: 1100, up: 46, w: 220 },
  { x: 2200, up: 56, w: 250 },
  { x: 3300, up: 50, w: 230 },
  { x: 4400, up: 62, w: 260 },
  { x: 5300, up: 54, w: 240 },
];

function rampLift(x) {
  let lift = 0;
  for (const r of RAMPS) {
    const d = x - r.x;
    // Smooth symmetric-ish kicker: long gentle approach, lip at d=0, then a
    // somewhat shorter (but not cliff-like) back face. Gentle enough that a
    // level approach lands cleanly; over-rotate in the air and you eat it.
    if (d > -r.w && d < r.w * 0.6) {
      const t = d < 0 ? (d + r.w) / r.w : 1 - d / (r.w * 0.6);
      lift -= r.up * Math.max(0, Math.sin(t * Math.PI * 0.5));
    }
  }
  return lift;
}

function terrainY(x, groundY) {
  return groundY
    + Math.sin(x * 0.0016) * 90    // long sweeping hills (climbable grade)
    + Math.sin(x * 0.006) * 30     // medium rollers
    + Math.sin(x * 0.02) * 9       // small chatter
    + Math.sin(x * 0.045) * 4      // fine bumps
    + rampLift(x);                 // launch ramps
}

// Build the terrain as a chain of static Polygon quads from each surface pair
// down to a flat skirt. NO explicit Material on the terrain — the known
// "Polygon + explicit Material → tunneling" bug bites static floors too, so we
// take engine defaults here and tune grip via the wheel materials instead.
function buildTerrain(space, groundY) {
  const numSegs = Math.ceil(WORLD_W / SEG_W);
  const bottom = groundY + 260;
  for (let i = 0; i < numSegs; i++) {
    const x0 = i * SEG_W;
    const x1 = x0 + SEG_W;
    const y0 = terrainY(x0, groundY);
    const y1 = terrainY(x1, groundY);
    const seg = new Body(BodyType.STATIC);
    seg.shapes.add(new Polygon([
      new Vec2(x0, y0),
      new Vec2(x1, y1),
      new Vec2(x1, bottom),
      new Vec2(x0, bottom),
    ]));
    try { seg.userData._colorIdx = 5; } catch (_) {}
    seg.space = space;
  }
}

// ── Collision filters ───────────────────────────────────────────────────────
// The bike's own parts (frame + both wheels) must NOT collide with each other —
// when a big landing fully compresses the suspension the wheel can touch the
// frame, and two solid bodies in contact "stick"/jam. Each bike part collides
// ONLY with the terrain (group 1); their own groups are left out of each
// other's mask, so frame↔wheel and wheel↔wheel pairs never generate contacts.
// Terrain bodies keep the default filter (group 1, mask −1 → hits everything).
const GROUP_TERRAIN = 1;
const BIKE_FILTER = new InteractionFilter(2, GROUP_TERRAIN);   // collides only w/ terrain

// ── Bike tuning ─────────────────────────────────────────────────────────────
// Realistic crossmotor (dirt-bike) proportions: smaller wheels relative to a
// long-ish frame, with two DIFFERENT suspensions — a telescopic fork up front
// and a swingarm + monoshock at the rear (see buildBike).
const WHEEL_R = 19;             // MX wheel — smaller than the old 26 so the bike
                                // reads as a motorcycle, not a monster truck
const WHEEL_BASE = 60;          // half the axle-to-axle distance
const CHASSIS_H = 12;

// Front telescopic fork — the wheel slides along a RAKED axis. FORK_OFFSET is a
// FIXED extension that places the wheel well forward/below the steering head
// (long wheelbase, good reach); the spring then only travels a SMALL window
// (FORK_MIN..FORK_MAX) around that offset. This keeps the wheel from wandering
// far out under accel/landing — it sits at a fixed ride height and just rugóz a
// little, instead of shooting out to the end of a long soft spring.
const FORK_RAKE = 0.42;         // radians the fork leans back from vertical (~24°)
const FORK_OFFSET = 40;         // fixed wheel-out distance from the steering head
// Spring tuning, the way real suspension works: FREQ is high enough that the
// bike's own weight only sags a little (it RESTS near FORK_OFFSET with travel to
// spare), so a big hit (jump/landing/bump) drives it deep and then it springs
// back to ride height. DAMP stays low so the spring-back stays lively (not dead).
const FORK_FREQ = 6.5;          // firm enough to hold ride height under static weight
const FORK_DAMP = 0.32;         // low → lively spring-back, but no endless pogo
const FORK_MIN = -24;           // deep compression available for big hits
const FORK_MAX = 10;            // a little top-out travel

// Rear monoshock — the rear wheel rides a near-vertical sprung sliding axis on
// the frame (canonical 3-body bike; no pivoting swingarm body — see buildBike).
// Same idea: a fixed offset (the ride height) + a small spring window.
const SHOCK_OFFSET = 30;        // fixed rear axle drop from the frame anchor
const SHOCK_FREQ = 4.4;         // holds ride height, but softer/livelier than 6.0
const SHOCK_DAMP = 0.2;         // low → lively, springy rear (more dynamic feel)
const SHOCK_MIN = -26;          // deep compression available for jumps/landings
const SHOCK_MAX = 12;           // a little top-out travel
// Visual swingarm + monoshock anchors (drawn only — no physics). Pivot under
// the engine; SHOCK_TOP sits just above the rear axle so the coil drops nearly
// straight down to the wheel instead of crossing the bike diagonally.
const SWINGARM_PIVOT = { x: -22, y: 8 };
const SHOCK_TOP = { x: -44, y: -12 };

const MOTOR_RATE = 30;          // rear-wheel motor target angular rate. Kept
                                // moderate ON PURPOSE: cranking it higher just
                                // spins the wheel faster than it can grip (heavy
                                // wheelspin → the bike surges/bogs). Grip + a
                                // sane rate give smooth, fast power delivery.
const MOTOR_FORCE = 75000;      // torque cap — moderate so acceleration doesn't
                                // break traction (or loft the front into a flip).
// Ground lean drives the chassis toward a TARGET pitch rate and holds it there,
// strong enough to overpower the wheels' tendency to cancel the rotation each
// frame (a gentle nudge just gets absorbed — that's why leaning felt dead).
const LEAN_GROUND_VEL = 7.0;     // target pitch rate while a lean key is held (rad/s)
const LEAN_GROUND_GAIN = 0.4;    // how hard we drive angularVel toward that target
const LEAN_MAX_ANGLE = 1.15;     // rad (~66°) — past this we brake the spin so a
                                 // held lean gives a big wheelie/endo that HOLDS,
                                 // instead of looping the bike all the way over
const GROUND_TOL = 6;            // px — a wheel counts as grounded if its bottom
                                 // is within this of the terrain surface.
const LEAN_TORQUE = 110;        // ground lean impulse per frame — pops a wheelie
                                // / pushes the nose down for jump setup
const AIR_SPIN_RATE = 0.45;     // rad/s added to chassis angularVel per frame
                                // while airborne — strong enough that holding a
                                // lean through a jump over-rotates into a crash,
                                // while a neutral approach lands clean

// Flip / crash detection. If the chassis tilts past FLIP_ANGLE for
// FLIP_FRAMES consecutive steps, or takes a hard vertical impact, the rider's
// seat weld breaks away.
const FLIP_ANGLE = 1.5;         // radians from upright (~86°) — past this you're
                                // going over; neutral riding stays well under it
const FLIP_FRAMES = 22;         // ~0.37s sustained past the angle before bail
                                // (a quick wheelie that comes back down is fine)
const CRASH_IMPACT_SPEED = 700; // downward speed that counts as a hard smack
const CRASH_SPIN_RATE = 7;      // rad/s — above this the bike is tumbling out of
                                // control (a fast flip never sustains one angle)
const CRASH_SPIN_FRAMES = 14;   // ~0.23s of that spin before the rider bails

// ── Rider rig — two fixed points + a moving seat ─────────────────────────────
// The rider is bolted to the bike at exactly TWO rigid points: the HANDS on the
// handlebar grip and the FEET on the footpegs. Those never move relative to the
// bike — they're the skeleton the whole pose hangs off. Between them the lower
// body is held onto the seat by a SOFT weld whose chassis-side anchor we slide
// at runtime. That moving seat anchor is the whole trick:
//   • neutral     → seat anchor low/back → the rider SITS, knees bent, torso up
//   • lean fwd/back → seat anchor rises (and shifts fore/aft) → the pelvis is
//     pulled UP off the seat, so with the hands+feet pinned the rider STANDS,
//     legs straightening, exactly like the reference frames 2 & 3.
// Because hands & feet are rigid and the seat is soft, raising the seat target
// makes the body unfold around the two fixed points instead of teleporting.
const POSE_SOFT = 0.04;         // half-width of each limb hinge's rest window
// Torso lean: how far the rider's upper body swings when you lean the bike.
const TORSO_LEAN_BACK = -0.55;  // rad added to the torso rest angle on lean-back.
                                // Modest: the upper body sits back but stays
                                // tipped slightly FORWARD over the bars (a bigger
                                // value stood the torso bolt-upright / hanyatt —
                                // the rider should still reach toward the bars).
const TORSO_LEAN_FWD = 0.27;    // rad added on lean-forward — torso pitches down
                                // over the bars (positive = nose-down — frame 2).
                                // Kept modest so the head/chest stay UP over the
                                // bars and don't headbutt the cockpit (a big value
                                // buried the head / clipped the bars — see images).
const TORSO_LEAN_LERP = 0.14;   // how fast the torso eases to the new lean target
// Seat lift — how the soft-weld's chassis anchor moves from its neutral seat
// position when the rider stands on a lean. Local chassis coords (+x fwd, +y down).
// The lift is DIRECTION-SPECIFIC: forward and back leans stand the rider up by
// different amounts and shift the hips opposite ways, so each pose can be tuned
// without the other going wrong (a shared lift made the back-lean hips skew).
const SEAT_LOCAL = { x: -18, y: -16 };   // neutral pelvis-on-seat anchor
// Forward and back leans move the hips OPPOSITE ways vertically:
//   • FORWARD → hips RISE (rider stands tall, crouches over the bars).
//   • BACK    → hips DROP and slide back — the rider pushes the whole body
//     down-and-rearward off the pegs (the "pull-back" hang). NOT a stand-up;
//     a positive value here LOWERS the hips (sy = SEAT_LOCAL.y − lift·amt).
const SEAT_LIFT_FWD = 16;       // px the hips rise on lean-FWD → head comes up too
const SEAT_LIFT_BACK = -7;      // px (negative → hips DROP) on lean-BACK: the whole
                                // body sinks back-and-down, arms angling downward.
                                // Kept mild — a big drop let the body slump into a
                                // low pose the soft seat weld couldn't climb out of.
const SEAT_SHIFT_FWD = 5;       // px forward hip shift on lean-forward (small — too
                                // much pushed the chest into the bars)
const SEAT_SHIFT_BACK = 14;     // px rearward hip shift on lean-back (big — the body
                                // slides well back so the rider hangs off the rear)
const SEAT_LERP = 0.14;         // how fast the seat anchor eases to its lean target
// Knee extension on a lean. FORWARD: knee opens a lot (crouch over the bars).
// BACK: knee opens HARD too — pushing the body down-and-back off the pegs takes
// nearly straight legs (the rider extends to hang rearward), which was the
// missing "leg isn't extended enough" in the back-lean pose.
const KNEE_STRAIGHTEN_FWD = 1.0;
const KNEE_STRAIGHTEN_BACK = 1.1;
// Pelvis tilt — the soft seat weld locks the pelvis ROTATION to the chassis
// (its phase). On a lean we rotate that target so the pelvis follows the body
// instead of staying bolted level and getting skewed: tip slightly forward on a
// forward lean, recline on a back lean. This is what stops the back-lean lower
// body from twisting oddly — the pelvis reclines WITH the torso as one unit.
const PELVIS_TILT_FWD = 0.15;   // rad the pelvis tips forward (nose-down) on fwd lean
const PELVIS_TILT_BACK = -0.3;  // rad the pelvis reclines on back lean (sits back)

// ── Module state ────────────────────────────────────────────────────────────
let _space = null;
let _chassis = null;
let _fWheel = null;
let _rWheel = null;
let _swingarm = null;         // rear swingarm body (pivots off the frame)
let _rMotor = null;
let _fSusp = null;            // front fork spring
let _rSusp = null;            // rear monoshock spring
const _bikeJoints = [];       // every bike constraint, for clean teardown

// Rider rig — the welded ragdoll. `_seatWeld` is the break-away joint; the rest
// are the articulation. `_riderParts` / `_riderJoints` are kept for teardown.
let _rider = null;            // { pelvis, torso, head, ... } refs for drawing
let _seatWeld = null;
let _gripJoints = [];         // hand→handlebar pins (break away with the seat weld)
let _pegJoints = [];          // foot→footpeg pins (break away with the seat weld)
let _riderParts = [];
let _riderJoints = [];
let _torsoHinge = null;       // pelvis→torso AngleJoint, retargeted on lean
let _torsoBase = 0;           // its built rest angle (the upright seated pose)
let _torsoLean = 0;           // current eased lean offset applied to the torso
let _kneeHinges = [];         // [{ joint, base }] knee hinges, straightened on lean
let _legExtend = 0;           // eased 0→1: how straight the legs are on a lean
let _seatLift = 0;            // eased 0→1: how far the rider has risen off the seat
let _seatShift = 0;           // eased −1..1: fore(+)/aft(−) seat anchor shift
let _crashed = false;
let _flipFrames = 0;
let _spinFrames = 0;
let _maxDist = 0;             // furthest the bike has travelled (for HUD)
let _frame = 0;
let _stepped = false;        // set true each physics step; gates camera lerp

const keys = {};
let _onKeyDown = null;
let _onKeyUp = null;

// Spawn anchor — recomputed on reset so the bike always lands on the surface.
let _spawnX = 220;
let _spawnGroundY = 0;

// ── Rider ragdoll (active-pose) ─────────────────────────────────────────────
// A seated rider built from a pelvis root + torso/head + two arms + two legs.
// The pelvis is WELDED to the chassis seat so the bike's lean drives the whole
// rig. Each limb hinge is a PivotJoint (the physical pin) plus an AngleJoint
// run as a TIGHT soft spring around a *target* angle — `jointMin === jointMax`
// (± a sliver of POSE_SOFT) gives an always-active spring that holds the limb in
// pose instead of letting it flop (the AngleJoint slack note: a window means no
// force inside it; a point target means a constant restoring spring). step()
// rewrites those targets each frame so the rider crouches on the gas and stands
// when you lean back — exactly the TeaGames-style weight shift. On a crash the
// targets are abandoned and the windows thrown wide so the rig goes limp.
function buildRider(space, seatX, seatY, chassis, gripLocal, pegLocal) {
  _riderParts = [];
  _riderJoints = [];
  _gripJoints = [];
  _pegJoints = [];
  _kneeHinges = [];

  const add = (body) => { _riderParts.push(body); return body; };

  // Active-pose hinge: a physical PivotJoint pin + an AngleJoint that *commands*
  // the relative angle toward `target`. A STIFF AngleJoint with jointMin ===
  // jointMax rigidly holds (and tracks) the target — strong enough to posture a
  // limb against gravity, which a soft spring is not. Posture-critical joints
  // (torso / shoulders / hips) are stiff so the rider holds its shape and the
  // lean reads cleanly; the head / elbows / knees stay soft for natural life.
  // Returns the AngleJoint so the caller can group it for per-frame retargeting.
  // Active-pose hinge. The limbs are pre-rotated into their rest pose, so the
  // hinge's REST relative angle is (b.rotation − a.rotation) at build time. We
  // park the AngleJoint there (+ the per-frame lean delta) so "neutral" keeps
  // exactly the built silhouette. A stiff joint rigidly commands the pose
  // (needed to posture a limb against gravity); soft joints get a little life.
  const poseHinge = (a, b, anchorA, anchorB, opts = {}) => {
    const { stiff = false, freq = 13, damp = 0.85 } = opts;
    const pin = new PivotJoint(a, b, anchorA, anchorB);
    pin.space = space;
    _riderJoints.push(pin);
    const base = b.rotation - a.rotation;   // rest relative angle from the geometry
    const ang = new AngleJoint(a, b, base - POSE_SOFT, base + POSE_SOFT);
    if (stiff) {
      ang.stiff = true;
    } else {
      ang.stiff = false;
      ang.frequency = freq;
      ang.damping = damp;
    }
    ang.space = space;
    _riderJoints.push(ang);
    return { joint: ang, base };            // (return kept for symmetry; unused)
  };

  // Lighter limbs than the bike so the rider doesn't overpower the suspension.
  const RM = (d) => new Material(0.1, 0.4, 0.5, d);

  // Pelvis — root the bike weld attaches to. A bit heavier for a stable base.
  const pelvis = add(new Body(BodyType.DYNAMIC, new Vec2(seatX, seatY)));
  pelvis.shapes.add(new Polygon(Polygon.box(20, 12), RM(0.7)));
  try { pelvis.userData._colorIdx = 1; } catch (_) {}
  pelvis.space = space;

  // Torso — sits fairly upright. The torso hinge is special: step() retargets
  // its window so the rider leans the upper body forward/back WITH the bike
  // (the visible weight shift). We keep a module ref + its rest angle, and an
  // ASYMMETRIC window: plenty of room to sit up / lean back, but limited
  // forward dip so the rider can't fold down into the bike body.
  const torso = add(new Body(BodyType.DYNAMIC, new Vec2(seatX + 3, seatY - 21)));
  torso.rotation = -0.15;         // sit fairly upright (slight back lean at rest)
  torso.shapes.add(new Polygon(Polygon.box(14, 30), RM(0.5)));
  try { torso.userData._colorIdx = 1; } catch (_) {}
  torso.space = space;
  new PivotJoint(pelvis, torso, new Vec2(0, -5), new Vec2(-2, 15)).space = space;
  _torsoBase = torso.rotation - pelvis.rotation;
  _torsoHinge = new AngleJoint(pelvis, torso, _torsoBase - POSE_SOFT, _torsoBase + POSE_SOFT);
  // STIFF: the torso angle is posture-critical and must win against the pull of
  // the rigidly-pinned hands. A soft joint just got dragged forward by the arms
  // on a lean-back, so the rider never actually leaned back. A stiff joint
  // authoritatively commands the torso angle; the soft arms then straighten /
  // fold to keep the hands on the bars. step() retargets the window each frame.
  _torsoHinge.stiff = true;
  _torsoHinge.space = space;
  _riderJoints.push(_torsoHinge);

  // Head — sits atop the torso, follows its lean.
  const head = add(new Body(BodyType.DYNAMIC, new Vec2(seatX + 7, seatY - 44)));
  head.shapes.add(new Circle(8.5, undefined, RM(0.5)));
  try { head.userData._colorIdx = 1; } catch (_) {}
  head.space = space;
  poseHinge(torso, head, new Vec2(0, -15), new Vec2(0, 8.5), { freq: 14, damp: 0.9 });

  // Arms — built reaching UP-FORWARD from the shoulder toward the handlebars at
  // the front of the bike. Upper arm angled ~ -0.5 rad (up-forward), forearm
  // continuing forward-down to the grips. Stiff shoulder holds the reach.
  const armLen = 16, armW = 5;
  const shoulders = [];
  const elbows = [];
  const shoulderX = seatX + 6, shoulderY = seatY - 30;   // shoulder socket (upper torso)
  const buildArm = () => {
    const ua = -0.55;             // upper-arm rest angle: up & forward
    const uMidX = shoulderX + Math.cos(ua) * armLen / 2;
    const uMidY = shoulderY + Math.sin(ua) * armLen / 2;
    const upper = add(new Body(BodyType.DYNAMIC, new Vec2(uMidX, uMidY)));
    upper.rotation = ua;
    upper.shapes.add(new Polygon(Polygon.box(armLen, armW), RM(0.3)));
    try { upper.userData._colorIdx = 2; } catch (_) {}
    upper.space = space;
    shoulders.push(poseHinge(torso, upper,
      new Vec2(shoulderX - (seatX + 3), shoulderY - (seatY - 21)), new Vec2(-armLen / 2, 0),
      { freq: 5, damp: 0.6 }));   // soft shoulder so the arm isn't rigid

    const elbowX = shoulderX + Math.cos(ua) * armLen;
    const elbowY = shoulderY + Math.sin(ua) * armLen;
    const la = 0.35;              // forearm angles back down toward the grip
    const lMidX = elbowX + Math.cos(la) * armLen / 2;
    const lMidY = elbowY + Math.sin(la) * armLen / 2;
    const lower = add(new Body(BodyType.DYNAMIC, new Vec2(lMidX, lMidY)));
    lower.rotation = la;
    lower.shapes.add(new Polygon(Polygon.box(armLen, armW), RM(0.25)));
    try { lower.userData._colorIdx = 2; } catch (_) {}
    lower.space = space;
    elbows.push(poseHinge(upper, lower, new Vec2(armLen / 2, 0), new Vec2(-armLen / 2, 0),
      { freq: 4, damp: 0.5 }));   // soft elbow → the arm bends/relaxes on the bars
    return { upper, lower };
  };
  const lArm = buildArm();
  const rArm = buildArm();

  // Legs — built angled DOWN-FORWARD from the hip to the pegs, shin dropping
  // down to the footrest. Stiff hip holds the seated knee-bend.
  const thighLen = 19, shinLen = 20, legW = 7;
  const hips = [];
  const knees = [];
  const hipX = seatX + 4, hipY = seatY + 4;
  const buildLeg = () => {
    const ta = 0.15;              // thigh: nearly level, slightly down-forward
    const tMidX = hipX + Math.cos(ta) * thighLen / 2;
    const tMidY = hipY + Math.sin(ta) * thighLen / 2;
    const thigh = add(new Body(BodyType.DYNAMIC, new Vec2(tMidX, tMidY)));
    thigh.rotation = ta;
    thigh.shapes.add(new Polygon(Polygon.box(thighLen, legW), RM(0.5)));
    try { thigh.userData._colorIdx = 2; } catch (_) {}
    thigh.space = space;
    hips.push(poseHinge(pelvis, thigh, new Vec2(8, 4), new Vec2(-thighLen / 2, 0),
      { freq: 14, damp: 0.85 }));  // firm hip holds the seated leg posture

    const kneeX = hipX + Math.cos(ta) * thighLen;
    const kneeY = hipY + Math.sin(ta) * thighLen;
    const sa = 1.45;             // shin: drops steeply down to the peg
    const sMidX = kneeX + Math.cos(sa) * shinLen / 2;
    const sMidY = kneeY + Math.sin(sa) * shinLen / 2;
    const shin = add(new Body(BodyType.DYNAMIC, new Vec2(sMidX, sMidY)));
    shin.rotation = sa;
    shin.shapes.add(new Polygon(Polygon.box(shinLen, legW), RM(0.5)));
    try { shin.userData._colorIdx = 2; } catch (_) {}
    shin.space = space;
    const kneeH = poseHinge(thigh, shin, new Vec2(thighLen / 2, 0), new Vec2(-shinLen / 2, 0),
      { freq: 12, damp: 0.85 });
    knees.push(kneeH);
    _kneeHinges.push(kneeH);    // straightened on lean to extend the leg
    return { thigh, shin };
  };
  const lLeg = buildLeg();
  const rLeg = buildLeg();

  // Rider parts share the bike's collision filter: they collide with the
  // terrain (so a bailed rider tumbles on the ground) but NOT with the bike or
  // with each other — the seated rig would otherwise jam its own legs against
  // the wheels/frame.
  for (const b of _riderParts) {
    for (const shape of b.shapes) shape.filter = BIKE_FILTER;
  }

  // Pin the hands to the handlebar grip and the feet to the footpeg. These are
  // PivotJoints fixing the lower-arm end (the hand) and the shin end (the foot)
  // onto the chassis at the given local anchors, so the rider actually GRIPS the
  // bars and rests on the pegs instead of its limbs flapping. They break away
  // together with the seat weld on a crash (see bailRider) so the rider ragdolls
  // free. The AngleJoint poses still shape the limbs; these just lock the ends.
  if (chassis && gripLocal) {
    for (const arm of [lArm, rArm]) {
      _gripJoints.push(new PivotJoint(
        chassis, arm.lower,
        new Vec2(gripLocal.x, gripLocal.y), new Vec2(armLen / 2, 0),
      ));
    }
  }
  if (chassis && pegLocal) {
    // Feet are RIGIDLY pinned to the footpeg — one of the rider's two fixed
    // anchor points (the other is the hands on the bars). The foot does NOT move
    // relative to the bike. When the rider stands on a lean we raise the SEAT
    // anchor (see step()), which pulls the pelvis up; with the foot pinned here
    // the knee then opens to absorb the rise — that's what reads as "standing on
    // the pegs". A rigid pin (not the old soft DistanceJoint) gives a solid,
    // predictable foot↔peg join exactly as asked.
    for (const leg of [lLeg, rLeg]) {
      _pegJoints.push(new PivotJoint(
        chassis, leg.shin,
        new Vec2(pegLocal.x, pegLocal.y), new Vec2(shinLen / 2, 0),
      ));
    }
  }
  for (const j of _gripJoints) j.space = space;
  for (const j of _pegJoints) j.space = space;

  _rider = { pelvis, torso, head, lArm, rArm, lLeg, rLeg };
  return pelvis;
}

// ── Bike ────────────────────────────────────────────────────────────────────
// Chassis is a single low Polygon (no explicit Material → dodges the tunneling
// bug). Wheels are Circles with grippy Material (high friction, low bounce) on
// SpringJoint suspension constrained to vertical travel by a LineJoint. The
// rear wheel gets a MotorJoint = throttle. The rider's pelvis is WELDED to the
// chassis seat — that weld is the break-away joint.
function buildBike(space, spawnX, groundY) {
  const cy = groundY - 78;
  _bikeJoints.length = 0;
  const J = (j) => { j.space = space; _bikeJoints.push(j); return j; };

  // ── Frame ────────────────────────────────────────────────────────────────
  // A recognizable dirt-bike profile, drawn in chassis-local coords. The bike
  // faces +x (right). Origin sits at the frame centre, roughly axle height.
  // No explicit Material on the frame (dodges the Polygon+Material tunneling
  // bug on hard landings). Layout (local x): rear axle ≈ -WHEEL_BASE via the
  // swingarm, steering head ≈ +44, front axle ≈ +WHEEL_BASE via the fork.
  const chassis = new Body(BodyType.DYNAMIC, new Vec2(spawnX, cy));
  // Central frame triangle (backbone + downtube) — the structural mass.
  chassis.shapes.add(new Polygon([
    new Vec2(-20, -10), new Vec2(20, -8),
    new Vec2(34, 6), new Vec2(2, 8),
    new Vec2(-20, 4),
  ]));
  // Engine block slung low under the frame (the heavy bit, keeps CoM low).
  chassis.shapes.add(new Polygon([
    new Vec2(-8, 4), new Vec2(20, 4),
    new Vec2(22, 16), new Vec2(-6, 16),
  ]));
  // Seat + rear subframe sweeping up to the tail (reaches back over the rear
  // wheel so the bike reads as one connected machine).
  chassis.shapes.add(new Polygon([
    new Vec2(-44, -14), new Vec2(-8, -11),
    new Vec2(-6, -4), new Vec2(-44, -7),
  ]));
  // Rear fender stub over the back wheel.
  chassis.shapes.add(new Polygon([
    new Vec2(-52, -10), new Vec2(-40, -12),
    new Vec2(-38, -6), new Vec2(-52, -4),
  ]));
  // Fuel tank rising in front of the seat.
  chassis.shapes.add(new Polygon([
    new Vec2(-8, -11), new Vec2(10, -16),
    new Vec2(20, -8), new Vec2(0, -8),
  ]));
  // Steering head + a stub of the upper fork triple-clamp at the front.
  chassis.shapes.add(new Polygon([
    new Vec2(28, -6), new Vec2(40, -16),
    new Vec2(46, -12), new Vec2(36, 2),
  ]));
  // Handlebar riser + grip above the steering head (cockpit + a hand target).
  chassis.shapes.add(new Polygon([
    new Vec2(36, -16), new Vec2(41, -18),
    new Vec2(34, -34), new Vec2(29, -32),
  ]));
  chassis.shapes.add(new Polygon([
    new Vec2(20, -36), new Vec2(36, -33),
    new Vec2(35, -28), new Vec2(19, -31),
  ]));
  try { chassis.userData._colorIdx = 0; } catch (_) {}
  // Frame collides only with the terrain, never with its own wheels.
  for (const shape of chassis.shapes) shape.filter = BIKE_FILTER;
  chassis.space = space;

  // Low bounce, grippy MX tyre. Friction at 1.6 — enough that the wheel hooks
  // up and delivers power smoothly (less wheelspin / surging) without being so
  // grippy it stalls the bike on a steep face.
  const wheelMat = new Material(0.15, 1.6, 1.6, 1.2);
  const makeWheel = (x, y) => {
    const w = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    // Same filter as the frame → wheel never collides with the frame or the
    // other wheel (only the terrain), so a fully-compressed suspension can't
    // jam the wheel against the frame.
    w.shapes.add(new Circle(WHEEL_R, undefined, wheelMat, BIKE_FILTER));
    try { w.userData._colorIdx = 3; } catch (_) {}
    // Continuous collision check — at the higher top speed a fast wheel could
    // otherwise tunnel through a thin terrain segment between two steps.
    w.isBullet = true;
    w.space = space;
    return w;
  };

  // ── Front telescopic fork ──────────────────────────────────────────────────
  // The wheel slides along the RAKED fork axis (down-and-forward from the
  // steering head). FORK_OFFSET fixes where the wheel sits; the LineJoint only
  // allows a small window (FORK_MIN..FORK_MAX) around it, and the SpringJoint's
  // rest length IS the offset so the wheel is held there and just rugóz a little.
  const headLocal = new Vec2(40, -12);
  const forkAxis = new Vec2(Math.sin(FORK_RAKE), Math.cos(FORK_RAKE)); // down-forward
  const fWheel = makeWheel(
    spawnX + headLocal.x + forkAxis.x * FORK_OFFSET,
    cy + headLocal.y + forkAxis.y * FORK_OFFSET,
  );
  J(new LineJoint(
    chassis, fWheel,
    new Vec2(headLocal.x, headLocal.y), new Vec2(0, 0),
    new Vec2(forkAxis.x, forkAxis.y), FORK_OFFSET + FORK_MIN, FORK_OFFSET + FORK_MAX,
  ));
  _fSusp = J(new SpringJoint(
    chassis, fWheel,
    new Vec2(headLocal.x, headLocal.y), new Vec2(0, 0),
    FORK_OFFSET,
  ));
  _fSusp.frequency = FORK_FREQ;
  _fSusp.damping = FORK_DAMP;

  // ── Rear wheel — sprung sliding axle (the canonical 2D-bike model) ─────────
  // Researching the genre (TeaGames-style motocross, Trials, Hill Climb, Box2D
  // bike demos) the universal recipe is a 3-body bike — frame + 2 wheels — with
  // NO separate swingarm body. A pivoting swingarm puts the motor's drive
  // *reaction* torque onto a light, softly-sprung arm, which kicks it back ~23°
  // (exactly what we saw). Instead the rear wheel rides a near-vertical sprung
  // sliding axis bolted to the frame, and the motor drives the wheel relative
  // to the FRAME: the reaction now lands on the heavy frame as a mild wheelie,
  // not as a structural collapse. The swingarm + monoshock you SEE are drawn in
  // drawSuspension purely for looks (drawn over this physics).
  const rearAxleLocal = new Vec2(-52, 4);           // where the rear axle hangs
  const rearAxis = new Vec2(0.05, 0.999);           // essentially vertical
  const rWheel = makeWheel(
    spawnX + rearAxleLocal.x + rearAxis.x * SHOCK_OFFSET,
    cy + rearAxleLocal.y + rearAxis.y * SHOCK_OFFSET,
  );
  J(new LineJoint(
    chassis, rWheel,
    new Vec2(rearAxleLocal.x, rearAxleLocal.y), new Vec2(0, 0),
    new Vec2(rearAxis.x, rearAxis.y), SHOCK_OFFSET + SHOCK_MIN, SHOCK_OFFSET + SHOCK_MAX,
  ));
  _rSusp = J(new SpringJoint(
    chassis, rWheel,
    new Vec2(rearAxleLocal.x, rearAxleLocal.y), new Vec2(0, 0),
    SHOCK_OFFSET,
  ));
  _rSusp.frequency = SHOCK_FREQ;     // a touch stiffer than the fork
  _rSusp.damping = SHOCK_DAMP;

  // Rear-wheel motor = throttle, between FRAME and rear wheel. The drive
  // reaction lands on the heavy low-CoM frame (mild wheelie), never tipping a
  // swingarm. maxForce caps the torque so the throttle is progressive — the
  // single most important anti-flip knob in the genre. (rate set in step()).
  _rMotor = J(new MotorJoint(chassis, rWheel, 0));
  _rMotor.maxForce = MOTOR_FORCE;

  _chassis = chassis;
  _fWheel = fWheel;
  _rWheel = rWheel;
  // No physical swingarm body — it's drawn for looks in drawSuspension.
  _swingarm = null;

  // Rider attachment. The pelvis gets a SOFT WeldJoint to the seat — not rigid,
  // so the body isn't bolted on, but firm enough that the upper body doesn't
  // fold forward off the bars. step() then actively poses the torso + legs with
  // the lean keys (lean back → body back + legs extend; lean forward → body
  // up-and-forward + legs extend), so the rider visibly shifts its whole weight.
  // Hands stay pinned to the bars, feet to the pegs. (BUILD_RIDER lets us bring
  // the bike up alone while iterating on it.)
  if (BUILD_RIDER) {
    // The seat is the rider's lower-body tether (NOT a fixed point — the two
    // fixed points are hands + feet). Its chassis anchor starts at SEAT_LOCAL and
    // step() slides it up/fore/aft on a lean to STAND the rider. seatX/seatY is
    // the world build position of the pelvis.
    const seatX = chassis.position.x + SEAT_LOCAL.x;
    const seatY = chassis.position.y + SEAT_LOCAL.y;
    const gripLocal = new Vec2(27, -31);
    const pegLocal = new Vec2(-4, 10);
    const pelvis = buildRider(space, seatX, seatY, chassis, gripLocal, pegLocal);
    _seatWeld = new WeldJoint(
      chassis, pelvis,
      new Vec2(SEAT_LOCAL.x, SEAT_LOCAL.y), new Vec2(0, 0),
    );
    _seatWeld.stiff = false;
    _seatWeld.frequency = 9;       // firm-ish seat — holds the pelvis, and (when
    _seatWeld.damping = 0.8;       // its anchor is moved) drives it to the new spot
                                   // AND reliably back to neutral on release. Too
                                   // soft (≈6) let a dropped-hip back-lean slump
                                   // into a low pose it couldn't recover from.
    _seatWeld.space = space;
  }
}

// ── Reset / respawn ─────────────────────────────────────────────────────────
// Detach joints BEFORE bodies (nape requires both endpoints share the joint's
// space; pulling a body first leaves a dangling constraint that throws on the
// next mutation — same ordering floppy-fists uses).
function teardownBikeAndRider() {
  if (_seatWeld && _seatWeld.space) _seatWeld.space = null;
  _seatWeld = null;
  for (const j of _gripJoints) { if (j.space) j.space = null; }
  for (const j of _pegJoints) { if (j.space) j.space = null; }
  _gripJoints = [];
  _pegJoints = [];
  for (const j of _riderJoints) { if (j.space) j.space = null; }
  _riderJoints = [];
  // All bike constraints (fork line + spring, swingarm pivots, monoshock, motor).
  for (const j of _bikeJoints) { if (j.space) j.space = null; }
  _bikeJoints.length = 0;
  _fSusp = _rSusp = _rMotor = null;

  for (const b of _riderParts) { if (b.space) b.space = null; }
  _riderParts = [];
  for (const b of [_chassis, _fWheel, _rWheel, _swingarm]) { if (b && b.space) b.space = null; }
  _chassis = _fWheel = _rWheel = _swingarm = _rider = null;
  _torsoHinge = null;
  _torsoLean = 0;
  _kneeHinges = [];
  _legExtend = 0;
  _seatLift = 0;
  _seatShift = 0;
}

function respawn() {
  teardownBikeAndRider();
  _crashed = false;
  _flipFrames = 0;
  _spinFrames = 0;
  buildBike(_space, _spawnX, _spawnGroundY);
  _maxDist = 0;
}

// ── Crash / break-away ──────────────────────────────────────────────────────
// On a sustained flip or a hard impact, release the rider's hand + foot pins so
// the whole body comes free and ragdolls. We only break once.
function bailRider() {
  if (_crashed || !_rider) return;
  _crashed = true;
  // Release the seat weld + the hands from the bars + the feet from the pegs so
  // the rider comes off the bike entirely.
  if (_seatWeld && _seatWeld.space) _seatWeld.space = null;
  _seatWeld = null;
  for (const j of _gripJoints) { if (j.space) j.space = null; }
  for (const j of _pegJoints) { if (j.space) j.space = null; }
  _gripJoints = [];
  _pegJoints = [];
  // A small backward+up kick on the pelvis so the rider visibly tumbles off
  // the back rather than sitting in place.
  if (_rider && _rider.pelvis && _rider.pelvis.space) {
    const v = _rider.pelvis.velocity;
    _rider.pelvis.velocity = new Vec2(v.x - 120, v.y - 160);
  }
  // Throw every limb hinge window wide so the freed rider flops loosely
  // instead of holding its seated shape.
  for (const j of _riderJoints) {
    if (j.jointMin !== undefined && j.jointMax !== undefined) {
      j.jointMin = -Math.PI;
      j.jointMax = Math.PI;
      j.frequency = 2;
      j.damping = 0.3;
    }
  }
}

export default {
  id: "dirtline",
  label: "Dirtline",
  featured: false,
  tags: ["MotorJoint", "SpringJoint", "WeldJoint", "Ragdoll", "Vehicle", "Camera", "Break-away"],
  desc:
    "Hill-climb trials bike with an articulated ragdoll rider welded to the " +
    "seat. <b>→</b> / <b>D</b> throttle, <b>←</b> / <b>A</b> reverse, " +
    "<b>↑</b> / <b>W</b> lean back (pop the front), <b>↓</b> / <b>S</b> lean " +
    "forward (nose-down). Flip the bike or smack the ground hard and the rider " +
    "breaks away and tumbles off. <b>R</b> or click to respawn. " +
    "Showcases MotorJoint wheels on SpringJoint suspension, a ragdoll attached " +
    "to a moving vehicle, and a break-away WeldJoint.",
  walls: false,

  camera: null,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, GRAVITY);

    _frame = 0;
    const groundY = SCREEN_H - 60;
    _spawnGroundY = groundY;
    _spawnX = 220;

    buildTerrain(space, groundY);

    // Left / right world walls so the bike can't fall off the ends.
    const wallL = new Body(BodyType.STATIC, new Vec2(-30, 0));
    wallL.shapes.add(new Polygon(Polygon.box(40, SCREEN_H * 4)));
    wallL.space = space;
    const wallR = new Body(BodyType.STATIC, new Vec2(WORLD_W + 30, 0));
    wallR.shapes.add(new Polygon(Polygon.box(40, SCREEN_H * 4)));
    wallR.space = space;

    buildBike(space, _spawnX, groundY);

    _crashed = false;
    _flipFrames = 0;
    _maxDist = 0;

    // Function follow so the camera tracks whatever the *current* chassis is —
    // respawn() builds a fresh chassis body, and a static body ref would leave
    // the camera following the removed one.
    this.camera = {
      follow: () => {
        if (_chassis) return { x: _chassis.position.x, y: _chassis.position.y };
        return { x: _spawnX, y: _spawnGroundY - 90 };
      },
      offsetX: 0,
      offsetY: -30,
      bounds: { minX: 0, minY: -400, maxX: WORLD_W, maxY: SCREEN_H + 300 },
      lerp: 0.1,
    };

    for (const k of Object.keys(keys)) keys[k] = false;
    _onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === "KeyR") respawn();
      if ([
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "KeyA", "KeyD", "KeyW", "KeyS",
      ].includes(e.code)) {
        e.preventDefault();
      }
    };
    _onKeyUp = (e) => { keys[e.code] = false; };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
    }
  },

  teardown() {
    if (typeof window !== "undefined") {
      if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
      if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    }
    _onKeyDown = _onKeyUp = null;
  },

  step(space) {
    _frame++;
    _stepped = true;
    if (!_chassis) return;

    // ── Throttle (rear motor) ──────────────────────────────────────────────
    const fwd = keys.ArrowRight || keys.KeyD || keys._touchRight;
    const rev = keys.ArrowLeft || keys.KeyA || keys._touchLeft;
    if (_rMotor) {
      if (fwd) _rMotor.rate = MOTOR_RATE;
      else if (rev) _rMotor.rate = -MOTOR_RATE;
      else _rMotor.rate = 0;
    }

    // ── Lean / air control ─────────────────────────────────────────────────
    // Screen coords have +y down, so a NEGATIVE angularVel rotates the nose UP.
    // On the ground the lean keys apply a torque impulse to pitch the bike (pop
    // the front for a wheelie, or push the nose down). In the air there's no
    // wheel contact to absorb it, so the same keys DRIVE the angular velocity
    // directly — crisp, predictable rotation for whips and flips (and the way
    // you set up — or botch — a landing, which is what triggers a crash).
    const leanBack = keys.ArrowUp || keys.KeyW || keys._touchUp;
    const leanFwd = keys.ArrowDown || keys.KeyS || keys._touchDown;
    const airborne = !wheelTouchingGround();
    if (airborne) {
      if (leanBack) _chassis.angularVel -= AIR_SPIN_RATE;
      if (leanFwd) _chassis.angularVel += AIR_SPIN_RATE;
    } else {
      // On the ground the grounded wheels cancel a pure torque each frame, so a
      // nudge feels dead. Instead drive angularVel TOWARD a strong target pitch
      // rate and hold it — this snaps the front up (wheelie, nose-up = negative)
      // or down (endo) authoritatively. An ANGLE GUARD stops driving once the
      // bike is already pitched past LEAN_MAX_ANGLE, so a held key gives a big,
      // fast lean that HOLDS there instead of looping the bike over.
      let pitch = _chassis.rotation % (Math.PI * 2);
      if (pitch > Math.PI) pitch -= Math.PI * 2;
      if (pitch < -Math.PI) pitch += Math.PI * 2;
      if (leanBack) {
        if (pitch > -LEAN_MAX_ANGLE) {
          // still within the wheelie range → drive the pitch up hard
          _chassis.angularVel += (-LEAN_GROUND_VEL - _chassis.angularVel) * LEAN_GROUND_GAIN;
          _chassis.applyAngularImpulse(-LEAN_TORQUE);
        } else if (_chassis.angularVel < 0) {
          // reached the wheelie cap → kill the spin so it HOLDS, not loops
          _chassis.angularVel = 0;
        }
      }
      if (leanFwd) {
        if (pitch < LEAN_MAX_ANGLE) {
          _chassis.angularVel += (LEAN_GROUND_VEL - _chassis.angularVel) * LEAN_GROUND_GAIN;
          _chassis.applyAngularImpulse(LEAN_TORQUE);
        } else if (_chassis.angularVel > 0) {
          _chassis.angularVel = 0;
        }
      }
    }

    // Active rider pose — the whole-body weight shift, built around the two FIXED
    // points (hands on the bars, feet on the pegs). The lean keys do three things,
    // all eased so the body sways rather than snaps:
    //   • SEAT LIFT — raise the soft-weld's chassis anchor so the pelvis is pulled
    //     UP off the seat. With the feet pinned, the rider rises into a stand.
    //   • SEAT SHIFT — slide that anchor forward (lean fwd) or back (lean back),
    //     so the standing rider's hips travel toward the bars or over the tail.
    //   • TORSO + KNEES — pitch the upper body down over the bars (fwd) or extend
    //     it rearward (back), and open the knees to feed the leg extension.
    // Neutral relaxes all of it: hips drop back onto the seat, knees re-bend,
    // torso returns upright — the compact seated rest pose (reference frame 1).
    if (!_crashed && _torsoHinge && _torsoHinge.space) {
      // Signed lean: +1 = full forward, −1 = full back, 0 = neutral. A single
      // eased value drives every pose channel so forward/back stay opposite and
      // neutral always relaxes cleanly back to the seated rest silhouette.
      let leanTarget = 0;
      if (leanFwd) leanTarget = 1;
      else if (leanBack) leanTarget = -1;
      _seatShift += (leanTarget - _seatShift) * SEAT_LERP;   // reused as signed lean
      const s = _seatShift;
      const fwdAmt = Math.max(0, s);    // 0..1 forward
      const backAmt = Math.max(0, -s);  // 0..1 back

      // ── Torso angle ── (eased toward the direction's target)
      let torsoTarget = 0;
      if (leanFwd) torsoTarget = TORSO_LEAN_FWD;
      else if (leanBack) torsoTarget = TORSO_LEAN_BACK;
      _torsoLean += (torsoTarget - _torsoLean) * TORSO_LEAN_LERP;
      const t = _torsoBase + _torsoLean;
      _torsoHinge.jointMin = t - POSE_SOFT;
      _torsoHinge.jointMax = t + POSE_SOFT;

      // ── Seat anchor — the body-shift driver. Direction-specific and OPPOSITE
      // vertically: forward RAISES the hips (stand tall, crouch over the bars);
      // back DROPS + slides them rearward (the rider pushes the whole body down-
      // and-back off the pegs, so the arms angle downward to the bars).
      _seatLift = fwdAmt + backAmt;   // total shift amount (for any future use)
      if (_seatWeld && _seatWeld.space) {
        const sx = SEAT_LOCAL.x + SEAT_SHIFT_FWD * fwdAmt - SEAT_SHIFT_BACK * backAmt;
        const sy = SEAT_LOCAL.y - (SEAT_LIFT_FWD * fwdAmt + SEAT_LIFT_BACK * backAmt);
        _seatWeld.anchor1 = new Vec2(sx, sy);
        // Recline / tip the pelvis WITH the lean so the lower body moves as one
        // unit instead of staying bolted level and skewing on a back lean.
        _seatWeld.phase = PELVIS_TILT_FWD * fwdAmt + PELVIS_TILT_BACK * backAmt;
      }

      // ── Knees — open as the rider stands; direction-specific so the back-lean
      // leg stays bent and planted instead of folding the wrong way.
      const kneeOpen = KNEE_STRAIGHTEN_FWD * fwdAmt + KNEE_STRAIGHTEN_BACK * backAmt;
      _legExtend = kneeOpen;
      for (const h of _kneeHinges) {
        if (!h || !h.joint || h.joint.space === null) continue;
        const a = h.base - kneeOpen;   // reduce the knee bend by the open amount
        h.joint.jointMin = a - POSE_SOFT;
        h.joint.jointMax = a + POSE_SOFT;
      }
    }

    // ── Distance HUD ───────────────────────────────────────────────────────
    const dist = Math.max(0, (_chassis.position.x - _spawnX));
    if (dist > _maxDist) _maxDist = dist;

    // ── Crash detection ────────────────────────────────────────────────────
    // Three ways to bite it: (1) hung past the tip-over angle for a beat;
    // (2) spinning out of control (a fast tumble never *sustains* a single
    // angle, so the angle test alone misses it — catch it by angular speed);
    // (3) a hard ground smack. Any one breaks the seat weld and the rider bails.
    if (!_crashed) {
      // Normalise chassis rotation into [-π, π] and measure tilt from upright.
      let rot = _chassis.rotation % (Math.PI * 2);
      if (rot > Math.PI) rot -= Math.PI * 2;
      if (rot < -Math.PI) rot += Math.PI * 2;
      // Accumulate while past the tip angle; decay (don't hard-reset) so a fast
      // tumble that flickers under the angle each rotation still trips it.
      if (Math.abs(rot) > FLIP_ANGLE) _flipFrames += 1;
      else _flipFrames = Math.max(0, _flipFrames - 2);
      if (_flipFrames > FLIP_FRAMES) bailRider();

      // Spinning out of control — a violent tumble in the air or after a bad
      // landing. Sustained high angular speed = you've lost it.
      if (Math.abs(_chassis.angularVel) > CRASH_SPIN_RATE) {
        _spinFrames += 1;
        if (_spinFrames > CRASH_SPIN_FRAMES) bailRider();
      } else {
        _spinFrames = Math.max(0, _spinFrames - 1);
      }

      // Hard impact: chassis driving down fast onto the ground.
      const vy = _chassis.velocity.y;
      if (vy > CRASH_IMPACT_SPEED && wheelTouchingGround()) {
        bailRider();
        if (this._runner) this._runner.shakeCamera(8, 0.25);
      }
    }
  },

  click(x, y, space) {
    // Click respawns once crashed; otherwise tap-left / tap-right drives.
    if (_crashed) { respawn(); return; }
    if (!_chassis) return;
    if (x < _chassis.position.x) keys._touchLeft = true;
    else keys._touchRight = true;
  },

  drag(x, y) {
    if (!_chassis || _crashed) return;
    keys._touchLeft = keys._touchRight = false;
    if (x < _chassis.position.x) keys._touchLeft = true;
    else keys._touchRight = true;
  },

  release() {
    keys._touchLeft = keys._touchRight = false;
    keys._touchUp = keys._touchDown = false;
  },

  render3dOverlay(ctx, _ignored, W, H, camX, camY) {
    const sw = W ?? SCREEN_W;
    drawSuspension(ctx, camX ?? 0, camY ?? 0);
    drawHUD(ctx, sw);
  },
};

// ── Helpers (kept below export for readability; all module-level so the ──────
//    CodePen extractor picks them up as preamble) ────────────────────────────

// True if either wheel currently has a contact arbiter (ground touch).
// True if either wheel is resting on the terrain. NOTE: we can't rely on
// `space.arbiters` here — the demo runner calls demo.step() BEFORE space.step(),
// so the arbiter list is empty/stale at this point (it always read 0 → the bike
// was wrongly treated as permanently airborne, which silently disabled the
// strong ground-lean). Instead we test geometry: a wheel is grounded if its
// bottom edge is at/below the terrain surface (within a small tolerance). This
// is independent of step order and matches what `buildTerrain` lays down.
function wheelTouchingGround() {
  const onGround = (w) => {
    if (!w) return false;
    const p = w.position;
    const surfaceY = terrainY(p.x, _spawnGroundY);
    // wheel bottom = p.y + WHEEL_R; grounded if it's at/under the surface.
    return p.y + WHEEL_R >= surfaceY - GROUND_TOL;
  };
  return onGround(_rWheel) || onGround(_fWheel);
}

// Draw the suspension springs (chassis anchor → wheel hub) in world space.
function drawSpring(ctx, x1, y1, x2, y2, color, coils = 5, amp = 5) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const n = coils * 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 + ux * len * 0.1, y1 + uy * len * 0.1);
  for (let i = 1; i <= n; i++) {
    const t = 0.1 + (i / n) * 0.8;
    const sign = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x1 + ux * len * t + px * amp * sign, y1 + uy * len * t + py * amp * sign);
  }
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.stroke();
}

function drawSuspension(ctx, camX, camY) {
  if (!_chassis || !_fWheel || !_rWheel) return;
  ctx.save();
  ctx.translate(-camX, -camY);
  const cp = _chassis.position;
  const ca = _chassis.rotation;
  const cos = Math.cos(ca), sin = Math.sin(ca);
  // chassis local → world
  const toWorld = (lx, ly) => ({
    x: cp.x + (lx * cos - ly * sin),
    y: cp.y + (lx * sin + ly * cos),
  });

  // Front fork: a pair of tubes from the steering head down to the front axle,
  // following the (rotated) fork axis. Drawn as two parallel thick lines so it
  // reads as upside-down telescopic forks.
  const head = toWorld(40, -12);
  const fw = _fWheel.position;
  const fdx = fw.x - head.x, fdy = fw.y - head.y;
  const flen = Math.hypot(fdx, fdy) || 1;
  const fpx = -fdy / flen, fpy = fdx / flen;   // perpendicular for the two tubes
  ctx.strokeStyle = "#9aa4ad";
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  for (const s of [-2.5, 2.5]) {
    ctx.beginPath();
    ctx.moveTo(head.x + fpx * s, head.y + fpy * s);
    ctx.lineTo(fw.x + fpx * s, fw.y + fpy * s);
    ctx.stroke();
  }

  // Rear: cosmetic swingarm + monoshock over the sprung-axle physics. The
  // swingarm bar runs from a pivot under the engine straight back to the rear
  // axle; the monoshock coil drops nearly vertically from a frame anchor ABOVE
  // the axle down to it (a real monoshock sits roughly over the wheel, not
  // crossing the bike diagonally).
  const rw = _rWheel.position;
  const pivot = toWorld(SWINGARM_PIVOT.x, SWINGARM_PIVOT.y);
  // swingarm bar (thick line, pivot → rear axle)
  ctx.strokeStyle = "#8a939c";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(rw.x, rw.y);
  ctx.stroke();
  ctx.lineCap = "butt";
  // monoshock coil from a frame anchor just above the rear axle, straight down.
  const shockTop = toWorld(SHOCK_TOP.x, SHOCK_TOP.y);
  drawSpring(ctx, shockTop.x, shockTop.y, rw.x, rw.y, "#d29922cc", 6, 4);
  ctx.restore();
}

function drawHUD(ctx, sw) {
  ctx.save();
  ctx.textBaseline = "alphabetic";

  // Distance + speed readout.
  const meters = (_maxDist / 40).toFixed(1);
  let speed = 0;
  if (_chassis) speed = Math.hypot(_chassis.velocity.x, _chassis.velocity.y) / 40;
  ctx.fillStyle = "rgba(13,17,23,0.78)";
  ctx.fillRect(10, 10, 188, 60);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Distance: ${meters} m`, 22, 34);
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  ctx.fillText(`Speed: ${speed.toFixed(1)} m/s`, 22, 56);

  // Crashed banner + restart hint.
  if (_crashed) {
    ctx.fillStyle = "rgba(248,81,73,0.92)";
    ctx.fillRect(sw / 2 - 150, 18, 300, 56);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CRASHED!", sw / 2, 44);
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("Press R or click to respawn", sw / 2, 64);
  }
  ctx.restore();
}
