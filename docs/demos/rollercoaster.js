import {
  Body, BodyType, Vec2, Circle, Capsule, Polygon, Material,
  LineJoint, SpringJoint, PivotJoint, AngleJoint,
  InteractionFilter,
} from "../nape-js.esm.js?v=3.41.0";

// ── Constants ──────────────────────────────────────────────────────────────
const WORLD_W = 10000;
const WORLD_H = 2600;
const CAR_COUNT = 6;
const CAR_W = 60;
const CAR_H = 30;
const CAR_WALL = 4;
const CAR_GAP = 12;
const PASSENGERS_PER_CAR = 3;
const PASSENGER_R = 5.5;      // capsule radius (half-width)
const PASSENGER_LEN = 25;     // capsule total length (head-to-toe) — 40% taller passengers for more visible swaying
const WHEEL_R = 10;
const WHEEL_DX = CAR_W * 0.32;

// Collision filter bits
const F_TRACK = 1;
const F_WHEEL = 2;
const F_CHASSIS = 4;
const F_PASSENGER = 8;

// Suspension geometry
const SUSP_REST = 6;

// ── Module state ──────────────────────────────────────────────────────────
let _cars = [];
let _trackPoints = []; // [{ x, y, tan, side, s }]
let _space = null;
let _lastStepTime = 0;
let _finishedAt = 0;        // performance.now()/1000 when train first reached the end
let _stalledSince = 0;      // performance.now()/1000 when head first dipped below stall speed
let _restartScheduled = false;

// Funny scream lines. Picked at random when a passenger experiences
// a large lateral/vertical jerk — drops, sudden direction changes,
// hard couplings into a hump.
const SCREAMS = [
  "yaaay!", "waaaa!", "aaaah!", "wheee!", "oh no!",
  "noooo!", "yipee!", "wooo!", "help!", "weeee!",
];

// ── Centerline construction ──────────────────────────────────────────────
// Hermite key points with smoothstep interpolation. Tangent is
// horizontal (h'(0) = h'(1) = 0) at every key point — so adjacent
// segments join smoothly without tangent jumps.

function buildCenterline() {
  const pts = [];
  const STEP = 8;

  const stageStartX = -CAR_COUNT * (CAR_W + CAR_GAP) - 80;
  const startY = 350;

  // Staging is dead flat AND coincident with the lift-hill crest —
  // no initial uphill section that would make gravity roll the cars
  // backward into the wall. All six cars spawn at the same height,
  // a one-shot forward velocity in setup() launches them over the
  // crest, and gravity takes over for the big drop. Each subsequent
  // hump sits well below the previous crest so residual kinetic
  // energy (minus friction/coupler losses) carries the train over.
  // User-requested layout (rough shape, west → east):
  //   flat staging → gentle slope → BIG drop → small gentle slope →
  //   climb → drop → small gentle slope → climb → HUGE drop →
  //   gentle slope → climb → gentle slope → climb → gentle slope →
  //   climb (finish).
  // Every climb peak sits below the immediately preceding crest so
  // the train always has surplus kinetic energy to coast over it.
  const sections = [
    { x: stageStartX, y: startY },           // staging start (flat)
    { x: 300,         y: startY },           // staging end — lift hill plateau
    { x: 700,         y: startY + 60 },      // gentle slope (60 px / 400 px ≈ 9°)
    { x: 1500,        y: startY + 680 },     // BIG drop (620 px / 800 px ≈ 38°)
    { x: 2000,        y: startY + 740 },     // small gentle slope
    { x: 2300,        y: startY + 560 },     // climb (peak below big-drop floor by 120 px)
    { x: 2700,        y: startY + 870 },     // drop
    { x: 3000,        y: startY + 920 },     // small gentle slope
    { x: 3250,        y: startY + 820 },     // climb (peak below previous valley by 50)
    { x: 4050,        y: startY + 1500 },    // HUGE drop (680 px / 800 px ≈ 40°)
    { x: 4550,        y: startY + 1580 },    // gentle slope (80 px / 500 px)
    { x: 5000,        y: startY + 1460 },    // climb (120 px climb)
    { x: 5450,        y: startY + 1580 },    // gentle slope
    { x: 5900,        y: startY + 1480 },    // climb (100 px climb)
    { x: 6400,        y: startY + 1590 },    // gentle slope
    { x: 6920,        y: startY + 1555 },    // mini-climb — top of the second big drop (kept low so the train always carries enough KE over it)
    { x: 8000,        y: startY + 2150 },    // SECOND big drop (640 px / 1080 px ≈ 30°)
    { x: 8400,        y: startY + 2110 },    // gentle wave up
    { x: 8800,        y: startY + 2170 },    // gentle wave down
    { x: 9200,        y: startY + 2100 },    // gentle wave up
    { x: 9600,        y: startY + 2160 },    // gentle wave down
    { x: WORLD_W - 80, y: startY + 2110 },   // finish (gentle wave up)
  ];

  let lastPt = null;
  for (const seg of sections) {
    if (lastPt) {
      const nSteps = Math.max(2, Math.round(Math.abs(seg.x - lastPt.x) / STEP));
      for (let j = 1; j <= nSteps; j++) {
        const t = j / nSteps;
        const h = t * t * (3 - 2 * t); // smoothstep
        const x = lastPt.x + (seg.x - lastPt.x) * t;
        const y = lastPt.y + (seg.y - lastPt.y) * h;
        pts.push({ x, y });
      }
    } else {
      pts.push({ x: seg.x, y: seg.y });
    }
    lastPt = { x: seg.x, y: seg.y };
  }

  // Tangent + side (channel-cap normal) + arclength
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len, ty = dy / len;
    pts[i].tan = { x: tx, y: ty };
    // `side` = right-hand normal (ty, -tx). For flat ground this is
    // (0, -1) — i.e. up — pointing toward the channel-cap (upper rail).
    pts[i].side = { x: ty, y: -tx };
    if (i > 0) {
      s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    pts[i].s = s;
  }
  return pts;
}

function groundY(x) {
  if (!_trackPoints.length) return 700;
  let best = _trackPoints[0];
  let bestDx = Math.abs(best.x - x);
  for (const p of _trackPoints) {
    const d = Math.abs(p.x - x);
    if (d < bestDx) { best = p; bestDx = d; }
  }
  return best.y;
}

// ── Track body construction ───────────────────────────────────────────────
// Each segment between two centerline points becomes a thick "ground"
// polygon (centerline down to world floor). Gravity is the only force
// holding the wheels on the rail, which is plenty for a non-looping
// coaster track.

function buildTrackBodies(space) {
  const pts = _trackPoints;
  const trackFilter = new InteractionFilter(F_TRACK, F_WHEEL);
  // Low rail friction so the train keeps its kinetic energy through
  // a long sequence of humps. Just enough to grip on the staging
  // tilt so the cars start rolling under gravity.
  const railMat = new Material(0.02, 0.08, 0.15, 1);

  const bottomY = WORLD_H + 100;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];

    const groundVerts = [
      new Vec2(p0.x, p0.y),
      new Vec2(p1.x, p1.y),
      new Vec2(p1.x, bottomY),
      new Vec2(p0.x, bottomY),
    ];
    const ground = new Body(BodyType.STATIC);
    ground.shapes.add(new Polygon(groundVerts, undefined, railMat, trackFilter));
    ground.userData._isTrack = true;
    ground.space = space;
  }
}

// ── Train construction ───────────────────────────────────────────────────

function buildTrain(space) {
  const passengerMat = new Material(0.05, 0.4, 0.5, 0.5);
  const chassisMat = new Material(0.1, 0.4, 0.5, 1);
  // Low wheel friction matches the rail — minimises rolling
  // resistance so kinetic energy carries the train across humps.
  const wheelMat = new Material(0.05, 0.1, 0.2, 2);
  // Floor ballast: keeps the chassis's centre of mass low. Density
  // is kept moderate — heavier ballast makes friction/contact losses
  // scale with mass, which actually slows the train on long descents
  // instead of helping. Lighter cars accelerate more freely under
  // gravity and still coast through the humps thanks to the smooth
  // hermite track.
  const ballastMat = new Material(0.1, 0.4, 0.5, 4);
  const fWheel = new InteractionFilter(F_WHEEL, F_TRACK);
  const fChassis = new InteractionFilter(F_CHASSIS, F_PASSENGER);
  const fPassenger = new InteractionFilter(
    F_PASSENGER,
    F_CHASSIS | F_PASSENGER,
  );

  const carColors = [0, 1, 2, 3, 4, 5];
  const carSpacing = CAR_W + CAR_GAP;
  const startX = 40;

  let prevChassis = null;
  for (let c = 0; c < CAR_COUNT; c++) {
    const cx = startX - c * carSpacing;
    const groundAtCx = groundY(cx);
    const cy = groundAtCx - WHEEL_R - SUSP_REST - CAR_H * 0.5;

    const halfW = CAR_W * 0.5;
    const halfH = CAR_H * 0.5;
    const wallT = CAR_WALL;

    // ─ Chassis ─
    const chassis = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
    chassis.shapes.add(new Polygon([
      new Vec2(-halfW,  halfH - wallT),
      new Vec2( halfW,  halfH - wallT),
      new Vec2( halfW,  halfH),
      new Vec2(-halfW,  halfH),
    ], undefined, ballastMat, fChassis));
    chassis.shapes.add(new Polygon([
      new Vec2(-halfW, -halfH),
      new Vec2(-halfW + wallT, -halfH),
      new Vec2(-halfW + wallT,  halfH - wallT),
      new Vec2(-halfW,  halfH - wallT),
    ], undefined, chassisMat, fChassis));
    chassis.shapes.add(new Polygon([
      new Vec2( halfW - wallT, -halfH),
      new Vec2( halfW, -halfH),
      new Vec2( halfW,  halfH - wallT),
      new Vec2( halfW - wallT,  halfH - wallT),
    ], undefined, chassisMat, fChassis));
    chassis.userData._colorIdx = carColors[c % carColors.length];
    chassis.userData._isCar = true;
    chassis.space = space;

    // ─ Wheels ─
    const fwx = cx + WHEEL_DX;
    const fwy = cy + halfH + SUSP_REST;
    const rwx = cx - WHEEL_DX;
    const rwy = cy + halfH + SUSP_REST;

    const frontWheel = new Body(BodyType.DYNAMIC, new Vec2(fwx, fwy));
    frontWheel.shapes.add(new Circle(WHEEL_R, undefined, wheelMat, fWheel));
    frontWheel.userData._isWheel = true;
    frontWheel.userData._colorIdx = 1;
    frontWheel.space = space;

    const rearWheel = new Body(BodyType.DYNAMIC, new Vec2(rwx, rwy));
    rearWheel.shapes.add(new Circle(WHEEL_R, undefined, wheelMat, fWheel));
    rearWheel.userData._isWheel = true;
    rearWheel.userData._colorIdx = 1;
    rearWheel.space = space;

    // ─ Suspension: SpringJoint + LineJoint pattern
    const fSusp = new SpringJoint(
      chassis, frontWheel,
      new Vec2(+WHEEL_DX, halfH - 1), new Vec2(0, 0),
      SUSP_REST,
    );
    fSusp.frequency = 6;
    fSusp.damping = 0.4;
    fSusp.space = space;
    const rSusp = new SpringJoint(
      chassis, rearWheel,
      new Vec2(-WHEEL_DX, halfH - 1), new Vec2(0, 0),
      SUSP_REST,
    );
    rSusp.frequency = 6;
    rSusp.damping = 0.4;
    rSusp.space = space;
    new LineJoint(
      chassis, frontWheel,
      new Vec2(+WHEEL_DX, halfH - 1), new Vec2(0, 0),
      new Vec2(0, 1), SUSP_REST - 3, SUSP_REST + 3,
    ).space = space;
    new LineJoint(
      chassis, rearWheel,
      new Vec2(-WHEEL_DX, halfH - 1), new Vec2(0, 0),
      new Vec2(0, 1), SUSP_REST - 3, SUSP_REST + 3,
    ).space = space;

    // ─ Passengers ─ upright capsules pinned by the feet to the floor.
    //
    // Capsule geometry: local long axis along x, +halfLen is the right
    // tip, -halfLen is the left tip. body.rotation = +PI/2 rotates the
    // capsule so the +halfLen tip ends up directly below the body's
    // centre — that's the "feet". A PivotJoint anchors those feet to
    // a seat point on the chassis floor.
    //
    // An AngleJoint provides a wide-range, very soft spring around the
    // upright orientation (chassis.rotation + PI/2) — passengers tilt
    // forward on drops, back on climbs, and oscillate freely with the
    // car's motion before settling back upright.
    const passengers = [];
    const halfLen = (PASSENGER_LEN - PASSENGER_R * 2) * 0.5;
    const seatPitch = PASSENGER_R * 2 + 4;
    const seatYOnFloor = halfH - 1; // top surface of chassis floor (local y)
    for (let p = 0; p < PASSENGERS_PER_CAR; p++) {
      const seatLx = (p - (PASSENGERS_PER_CAR - 1) / 2) * seatPitch;
      const seatLocal = new Vec2(seatLx, seatYOnFloor);

      // Spawn the passenger upright at the seat: feet on the floor,
      // body centre `halfLen` above the floor.
      const px = cx + seatLx;
      const py = cy + seatYOnFloor - halfLen;
      const pas = new Body(BodyType.DYNAMIC, new Vec2(px, py));
      pas.shapes.add(
        new Capsule(PASSENGER_LEN, PASSENGER_R * 2, undefined, passengerMat, fPassenger),
      );
      pas.rotation = Math.PI / 2; // upright (feet at +halfLen → below)
      pas.userData._colorIdx = (c * 2 + p + 2) % 6;
      pas.userData._isPassenger = true;
      pas.space = space;

      // Pin the feet (+halfLen along the capsule's long axis) to the
      // seat on the chassis floor. After body.rotation = +PI/2 this
      // point is in world coordinates directly below body.position,
      // i.e. at the seat.
      const pin = new PivotJoint(
        chassis, pas,
        seatLocal, new Vec2(halfLen, 0),
      );
      pin.space = space;

      // Soft spring fixing the passenger's WORLD-rotation around π/2
      // (upright). Fixed jointMin = jointMax = π/2 means the spring
      // is *always* active (range constraints would go slack inside
      // their min/max window and leave the passenger un-restored).
      // Low frequency + low damping = visible inertial lag: drops
      // throw them backward, climbs pitch them forward, then they
      // oscillate back to upright. World-vertical (not chassis-rel)
      // so the passengers visibly lag the chassis's rotation.
      const lean = new AngleJoint(
        space.world, pas,
        Math.PI / 2,
        Math.PI / 2,
        1,
      );
      lean.stiff = false;
      lean.frequency = 1.4;
      lean.damping = 0.15;
      lean.space = space;

      passengers.push({
        body: pas,
        prevVx: 0,
        prevVy: 0,
        scream: null,        // string currently shown
        screamUntil: 0,      // time (s) when scream disappears
        screamCooldown: 0,   // time (s) before another scream may trigger
      });
    }

    // ─ Coupler ─ classic rail-style PivotJoint linking a single
    // virtual point in the middle of the gap to both cars. The two
    // anchor points coincide in world space, so the cars hinge
    // freely around that shared link — independent pitch, fixed
    // gap, no slack, no pendulum.
    //
    // Anchor Y is at the chassis's effective centre of mass (~y=10,
    // dominated by the heavy ballast at y=13), NOT at the floor edge
    // (y=15). A coupler force passing through the COM produces no
    // torque, so the leading and trailing cars no longer pitch
    // asymmetrically under load — they roll down the slope as one
    // train, with the coupler staying taut.
    if (prevChassis) {
      const linkX = halfW + CAR_GAP * 0.5;
      const linkY = halfH - CAR_WALL;       // ~chassis COM height
      const coupler = new PivotJoint(
        prevChassis, chassis,
        new Vec2(-linkX, linkY),
        new Vec2(+linkX, linkY),
      );
      coupler.stiff = true;
      coupler.space = space;
    }

    _cars.push({ chassis, frontWheel, rearWheel, passengers });
    prevChassis = chassis;
  }
}

export default {
  id: "rollercoaster",
  label: "Rollercoaster",
  featured: true,
  tags: ["SpringJoint", "LineJoint", "PivotJoint", "AngleJoint", "Capsule", "Camera"],
  desc:
    "A 6-car train with sprung suspension rolls along a long hilly " +
    "track. Each car carries upright capsule passengers pinned by the " +
    "feet — they sway forward and back through every drop and crest. " +
    "Pure gravity, no motors.",
  walls: false,
  camera: null,

  setup(space, W, H) {
    _space = space;
    space.gravity = new Vec2(0, 900);
    // Disable Nape's default global drag (0.015) — minor on its own
    // but stacks with suspension damping and contact losses, eating
    // enough kinetic energy on a long descent to stall the train
    // before the first hump.
    space.worldLinearDrag = 0;
    space.worldAngularDrag = 0;
    _cars = [];
    _lastStepTime = 0;
    _finishedAt = 0;
    _stalledSince = 0;
    _restartScheduled = false;
    _trackPoints = buildCenterline();
    buildTrackBodies(space);

    const floor = new Body(BodyType.STATIC, new Vec2(WORLD_W * 0.5, WORLD_H + 300));
    floor.shapes.add(new Polygon(Polygon.box(WORLD_W * 2, 80)));
    floor.userData._hidden = true;
    floor.space = space;

    buildTrain(space);

    // Settle pass — let the suspension and contact graph reach a
    // stable resting state BEFORE the kick. Nape's contact/arbiter
    // pools are global, so two consecutive setup() calls (preview +
    // play, or reset → preview + play) can inherit warm-start impulses
    // from a previous space, making the very first frame's solver
    // diverge slightly between runs. A few short zero-velocity steps
    // give the new train a moment to find equilibrium against the
    // fresh track geometry, so every run starts from the same state.
    for (let i = 0; i < 6; i++) {
      space.step(1 / 60, 8, 3);
      for (const car of _cars) {
        car.chassis.velocity = new Vec2(0, 0);
        car.chassis.angularVel = 0;
        car.frontWheel.velocity = new Vec2(0, 0);
        car.frontWheel.angularVel = 0;
        car.rearWheel.velocity = new Vec2(0, 0);
        car.rearWheel.angularVel = 0;
        for (const p of car.passengers) {
          p.body.velocity = new Vec2(0, 0);
          p.body.angularVel = 0;
        }
      }
    }

    // Kick-start: the staging is dead flat so the train would just
    // sit there. A one-shot forward velocity on every chassis + wheel
    // + passenger gets it rolling toward the lift-hill crest, after
    // which gravity takes over for the big drop. Passengers also get
    // the kick (and seed prevVx) so the jerk detector doesn't fire a
    // spurious scream on the very first step.
    const KICK_VX = 220;
    for (const car of _cars) {
      car.chassis.velocity = new Vec2(KICK_VX, 0);
      car.frontWheel.velocity = new Vec2(KICK_VX, 0);
      car.rearWheel.velocity = new Vec2(KICK_VX, 0);
      for (const p of car.passengers) {
        p.body.velocity = new Vec2(KICK_VX, 0);
        p.prevVx = KICK_VX;
        p.prevVy = 0;
      }
    }

    const head = _cars[0].chassis;
    const stageStartX = -CAR_COUNT * (CAR_W + CAR_GAP) - 80;
    this.camera = {
      follow: head,
      offsetX: 100,
      offsetY: -40,
      bounds: { minX: stageStartX, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.06,
    };
  },

  step(space, W, H) {
    if (!_cars.length) return;
    for (const car of _cars) {
      car.chassis.force = new Vec2(0, 0);
    }

    // Passengers occasionally flipped on a hard drop: the AngleJoint
    // springs each passenger's WORLD rotation back to π/2, but if a
    // jolt spins the body past π/2 ± π the joint can pick the "short
    // way home" across the wrap and yank the rider through a full
    // turn. Clamping angular velocity keeps a single step from
    // rotating them more than a few degrees, so the spring never sees
    // a wrap-around in the first place.
    const MAX_ANG_VEL = 6; // rad/s
    for (const car of _cars) {
      for (const p of car.passengers) {
        const av = p.body.angularVel;
        if (av > MAX_ANG_VEL) p.body.angularVel = MAX_ANG_VEL;
        else if (av < -MAX_ANG_VEL) p.body.angularVel = -MAX_ANG_VEL;
      }
    }

    // Per-passenger acceleration detection: fire a random scream when
    // the magnitude of acceleration crosses a threshold. Acceleration
    // (not raw velocity delta) catches BOTH brief hard yanks AND the
    // sustained ~1 g of a long steep descent, so screams already show
    // up on the first big lift-hill drop — real rollercoasters scream
    // through the whole plunge, not just the final pull-out.
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    const dt = _lastStepTime ? Math.max(1 / 240, now - _lastStepTime) : 1 / 60;
    _lastStepTime = now;
    // Gravity is 900 px/s² ≈ 1 g. A passenger pinned firmly to a flat
    // chassis sees ~0 net acceleration in the world frame; one going
    // briefly weightless over a crest, or yanked sideways into a hump,
    // sees a much larger spike. Threshold ~0.8 g catches both the
    // sustained near-free-fall of the lift-hill plunge AND the sharp
    // direction-change spikes at the bottom of each drop.
    const ACCEL_THRESHOLD = 900;
    // Limit how many passengers may scream simultaneously across the
    // whole train. 18 passengers all triggering on the same drop is
    // visual noise; capping at 3 keeps the "few scared riders" vibe.
    const MAX_CONCURRENT_SCREAMS = 3;
    let activeScreams = 0;
    for (const car of _cars) {
      for (const p of car.passengers) {
        if (p.scream) activeScreams++;
      }
    }
    for (const car of _cars) {
      for (const p of car.passengers) {
        const v = p.body.velocity;
        const ax = (v.x - p.prevVx) / dt;
        const ay = (v.y - p.prevVy) / dt;
        const accel = Math.hypot(ax, ay);
        p.prevVx = v.x;
        p.prevVy = v.y;

        if (p.screamUntil && now > p.screamUntil) {
          p.scream = null;
          p.screamUntil = 0;
          activeScreams = Math.max(0, activeScreams - 1);
        }
        if (p.screamCooldown > 0) p.screamCooldown -= dt;

        if (
          accel > ACCEL_THRESHOLD &&
          p.screamCooldown <= 0 &&
          activeScreams < MAX_CONCURRENT_SCREAMS &&
          // Probabilistic trigger so the same drop doesn't fire every
          // passenger at once — scales gently with acceleration so harder
          // jerks are more likely to scare someone, but never certain.
          Math.random() < Math.min(0.35, (accel - ACCEL_THRESHOLD) / 4000 + 0.08)
        ) {
          p.scream = SCREAMS[(Math.random() * SCREAMS.length) | 0];
          // Stronger acceleration → longer display, up to 1.4s.
          const lifetime = Math.min(1.4, 0.5 + (accel - ACCEL_THRESHOLD) / 2000);
          p.screamUntil = now + lifetime;
          // Long per-passenger cooldown — the same rider shouldn't
          // shout twice in quick succession even on a wavy section.
          p.screamCooldown = lifetime + 1.2 + Math.random() * 0.8;
          activeScreams++;
        }
      }
    }

    // Restart on finish (or stall):
    //   - once the head chassis crosses the end-of-track threshold,
    //     wait ~2.5s so the train coasts visibly into the final wave,
    //     then reload.
    //   - if the train stalls anywhere on the track (head speed < 30
    //     px/s for 5+ seconds), reload too — otherwise a particularly
    //     unlucky run could leave the cars stuck on a slow hump until
    //     the user resets manually.
    if (!_restartScheduled) {
      const head = _cars[0].chassis;
      const headSpeed = Math.hypot(head.velocity.x, head.velocity.y);
      const reachedEnd = head.position.x > WORLD_W - 400;
      if (reachedEnd) {
        if (!_finishedAt) _finishedAt = now;
        if (now - _finishedAt > 2.5) _restartScheduled = true;
      }
      if (headSpeed < 30) {
        if (!_stalledSince) _stalledSince = now;
        if (now - _stalledSince > 5) _restartScheduled = true;
      } else {
        _stalledSince = 0;
      }
      if (_restartScheduled) {
        const runner = this._runner;
        if (runner) {
          setTimeout(() => {
            runner.load(this);
            runner.start();
          }, 0);
        }
      }
    }
  },

  // Screams overlay only — body shapes (chassis, wheels, passengers,
  // track ground) are rendered by each adapter's default debug-draw, so
  // the demo works identically in canvas2d, three.js, and pixijs modes.
  // The overlay runs in screen space, so we re-apply the camera offset
  // to position the text in world coordinates above each passenger.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    if (!_cars.length) return;
    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 14px sans-serif";
    for (const car of _cars) {
      for (const p of car.passengers) {
        if (!p.scream) continue;
        const pos = p.body.position;
        const x = pos.x;
        const y = pos.y - PASSENGER_LEN * 0.6 - 8;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(10,14,20,0.85)";
        ctx.strokeText(p.scream, x, y);
        ctx.fillStyle = "#ffd166";
        ctx.fillText(p.scream, x, y);
      }
    }
    ctx.restore();
  },
};
