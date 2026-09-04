import {
  Body, BodyType, Vec2, Circle, Polygon, Material, FluidProperties,
  PulleyJoint, PivotJoint, InteractionFilter,
} from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

// ---------------------------------------------------------------------------
// Cargo Crane Captain — a load-the-barge mini-game.
//
// A gantry crane stands on the quay: the trolley runs left/right along the
// beam, the winch pays the hook up and down, and SPACE grabs/releases. A
// counterweight rides a guide at the far end, coupled by a real PulleyJoint
// so it rises exactly as the hook descends.
//
// The cargo has to go onto a barge that FLOATS on a fluid-enabled water body.
// This is the whole point of the game: the barge is not a static platform.
// Every crate you set down shifts its buoyancy, so a lopsided load makes it
// list, and enough list capsizes it. Crates are denser than the water, so a
// crate that misses the deck sinks to the basin floor and is gone — and a
// crate battered to 0% integrity shatters into debris, costing you the cargo
// just the same. Load all ten and keep her upright to win; capsize, or lose
// four crates to the water and to breakage, and the run is over.
//
// Engine features showcased:
//   * Fluid buoyancy + drag (FluidProperties) as a GAMEPLAY surface, not a
//     set-dressing pool — the barge's trim is the win/lose condition.
//   * PulleyJoint with a per-step retargeted rope length, hauling a live
//     counterweight up its guide as the winch pays out.
//   * A PivotJoint "magnet" grab, created and destroyed at runtime to attach
//     arbitrary cargo to the hook.
//   * InteractionFilter groups so the rig never snags the crane structure and
//     the hook phases through cargo instead of shoving it around.
//   * Per-step speed-drop as an impact metric — deliberately NOT
//     totalContactsImpulse(), because the barge floats and the deck's own
//     heave made the contact impulse swing 3x for the same release height.
//
// Two engine constraints shaped the rig, both found by headless testing:
//   1. A PulleyJoint rejects a pair that is not dynamic on both ends
//      ("cannot have both bodies in a linked pair non-dynamic"), so with a
//      KINEMATIC hook the cargo side terminates on a small dynamic sheave
//      riding under the trolley rather than on the hook itself.
//   2. The hook must be KINEMATIC. As a dynamic body it lost the tug-of-war
//      with a carried crate and got hauled diagonally up against the beam.
// ---------------------------------------------------------------------------

// The CodePen runtime declares its own `W`/`H`, so a top-level duplicate would
// throw SyntaxError (same guard as sky-hook / top-down-shooter).
const SCREEN_W = 900;
const SCREEN_H = 500;

const GRAVITY = 620;

// ── Layout ───────────────────────────────────────────────────────────────
const QUAY_X1 = 380;               // quay edge — water starts here
const GROUND_Y = 470;              // quay deck surface
const WATER_Y = 360;               // waterline
const WATER_BED_Y = 500;           // bottom of the basin

// Gantry: horizontal beam the trolley rides along.
const BEAM_Y = 90;
const BEAM_X0 = 60;
const BEAM_X1 = 780;
// The trolley must be able to reach the whole quay apron (crates get nudged
// around as they are picked off the stack) and the whole barge, or cargo can
// end up permanently unreachable.
const TROLLEY_MIN = BEAM_X0 + 20;
const TROLLEY_MAX = BEAM_X1 - 20;
const TROLLEY_SPEED = 200;         // px/s

// Winch: the hook side of the rope.
const ROPE_MIN = 60;               // shortest hook drop
// Longest drop must put the hook ON the quay deck (GROUND_Y) — a crate
// resting there has its centre at GROUND_Y - CRATE_S/2, and the grab needs
// the hook within reach of that point.
const ROPE_MAX = 400;
const WINCH_SPEED = 150;           // px/s
const ROPE_START = 140;

// The counterweight rides a vertical guide on the far right of the gantry.
const CW_X = BEAM_X1 + 60;
const CW_W = 34;
const CW_H = 52;
const CW_MASS = 6;

// Total rope: hookRope + RATIO * cwRope is held constant by the PulleyJoint,
// so the winch works by retargeting that total each step.
const RATIO = 1.0;
const ROPE_FREQ = 14;              // Hz — stiff enough to read as steel cable
const ROPE_DAMP = 1;               // critical — no spring bounce

const HOOK_R = 9;

// ── Barge ────────────────────────────────────────────────────────────────
// A shallow U: flat hull with two low coamings so crates don't just slide off
// the instant it rolls. Density well under water's so it floats high empty.
const BARGE_X = 600;
const BARGE_W = 290;
const BARGE_HULL_H = 26;
const BARGE_WALL_H = 40;
const BARGE_WALL_T = 12;
const BARGE_DENSITY = 0.30;

// Trim (list angle) thresholds, radians.
const LIST_WARN = 0.20;            // HUD turns amber
const LIST_FAIL = 0.52;            // capsized — mission lost

// ── Cargo ────────────────────────────────────────────────────────────────
const CRATE_COUNT = 10;
const CRATE_S = 34;
// Denser than the water (1.0), so a crate that misses the barge actually
// SINKS. At 0.9 it bobbed on the surface forever and missing the deck had no
// consequence at all — the drown counter never moved and the run could not be
// lost by bad aim, only by capsizing.
const CRATE_DENSITY = 1.15;
// Row origin on the quay. The whole row must sit inside the trolley's travel
// (TROLLEY_MIN..TROLLEY_MAX) or a crate is unreachable and the run is
// unwinnable.
const CRATE_START_X = 105;
const CRATE_GAP = 6;

// Impact damage, measured as the crate's own speed drop in a single step
// (px/s). Calibrated for a 34px crate at density 1.15:
//     20px drop  →  62
//     40px drop  → 165
//     80px drop  → 268
//    120px drop  → 350
//    200px drop  → 462
//    300px drop  → 585
//    400px drop  → 676
// The floor is set from what real play produces, not from synthetic drops.
// Measured peak speed-drop for actual player actions:
//     careful set-down on the deck      → 108   (must stay free)
//     release just above the quay       → 292   (careless — must sting)
//     dropped from the top of the gantry→ 470   (reckless — must hurt a lot)
// An earlier floor of 360 sat ABOVE everything reachable in normal play, so
// crates were effectively indestructible however badly you handled them.
// 135 leaves a margin over a careful landing while making a sloppy release
// cost ~18% and a full-height drop take out over a third of a crate.
const IMPACT_FLOOR = 135;
const IMPACT_SCALE = 0.115;
const IMPACT_MAX = 45;             // cap per single hit
const DROWN_LIMIT = 3;             // crates lost (sunk or smashed) before failure

// A crate at 0% integrity shatters: it is removed and its cargo is lost, so
// battering a crate costs you the run just as surely as dropping it in.
const SHATTER_PIECES = 5;

// Collision filter groups — the rope assembly must never snag the gantry.
const G_WORLD = 1;
const G_RIG = 2;                   // hook + counterweight
const G_CARGO = 4;
const G_BARGE = 8;

// ── Module state ─────────────────────────────────────────────────────────
let _space = null;
let _runnerRef = null;
let _phase = "run";                // "run" | "won" | "lost"
let _result = "";
let _tick = 0;

let _trolleyX = 0;
let _ropeLen = 0;
let _pulley = null;
let _sheave = null;
let _hook = null;
let _counterweight = null;
let _barge = null;
let _waterBody = null;

let _crates = [];
let _grab = null;                  // active PivotJoint
let _grabbed = null;               // body held by the hook
let _drowned = 0;
let _debris = [];
let _floaters = [];

const keys = {};
let _lastKeyDown = null;
let _lastKeyUp = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addFloater(x, y, text, color) {
  _floaters.push({ x, y, text, color, life: 60 });
}

function filt(group, mask) {
  return new InteractionFilter(group, mask);
}

// The winch state is _ropeLen — how far the hook hangs below the trolley.
// The PulleyJoint constrains sheaveRope + RATIO * cwRope to a single total,
// so taking up rope on the sheave side pays it out on the counterweight side:
// the counterweight rises exactly as the hook descends.
//
// CW_ROPE_REST is the counterweight's nominal hang below the beam, the datum
// the retargeting is measured from.
const CW_ROPE_REST = 150;
// The sheave is the little dynamic pulley block just under the trolley that
// the counterweight rope actually terminates on. Its drop mirrors the winch,
// scaled down so it stays tucked under the beam.
// The travel here IS the counterweight's travel (the pulley trades one for
// the other 1:1), so it has to be wide enough to read on screen — a 40px
// swing was technically correct but looked like the weight was barely moving.
const SHEAVE_DROP_MIN = 20;
const SHEAVE_DROP_MAX = 200;
const SHEAVE_DROP = 110;           // mid-travel, matching ROPE_START

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

function spawnTerrain() {
  const mat = new Material(0.2, 0.6, 0.75, 1);

  // Quay — the loading apron on the left. The deck is at GROUND_Y, which is
  // BELOW the waterline (WATER_Y), so the apron alone leaves the water's left
  // face open: the barge could drift out of the basin and sunk cargo could
  // slide off under the quay. The body runs from the deck all the way down to
  // the bed, giving the water a solid quay wall to sit against.
  const quayTop = GROUND_Y;
  const quayH = WATER_BED_Y + 40 - quayTop;
  const quay = new Body(BodyType.STATIC, new Vec2(QUAY_X1 / 2, quayTop + quayH / 2));
  quay.shapes.add(new Polygon(Polygon.box(QUAY_X1, quayH), undefined, mat));
  quay.setShapeFilters(filt(G_WORLD, G_CARGO | G_BARGE | G_RIG));
  quay.space = _space;

  // The quay WALL — the vertical face standing in the water from the deck up
  // past the waterline. Without it the basin is open on the left and the
  // barge simply floats away off-screen.
  const wall = new Body(
    BodyType.STATIC,
    new Vec2(QUAY_X1 - 8, (WATER_Y - 60 + GROUND_Y) / 2),
  );
  wall.shapes.add(new Polygon(Polygon.box(16, GROUND_Y - (WATER_Y - 60)), undefined, mat));
  wall.setShapeFilters(filt(G_WORLD, G_CARGO | G_BARGE | G_RIG));
  wall.space = _space;

  // Quay backstop — a low kerb at the far left so crates jostled off the
  // stack can never slide out past the trolley's reach and strand the run.
  const kerb = new Body(BodyType.STATIC, new Vec2(50, GROUND_Y - 30));
  kerb.shapes.add(new Polygon(Polygon.box(16, 60), undefined, mat));
  kerb.setShapeFilters(filt(G_WORLD, G_CARGO | G_BARGE | G_RIG));
  kerb.space = _space;

  // Basin floor and the far sea wall.
  const bed = new Body(BodyType.STATIC, new Vec2(SCREEN_W / 2, WATER_BED_Y + 20));
  bed.shapes.add(new Polygon(Polygon.box(SCREEN_W * 2, 40), undefined, mat));
  bed.setShapeFilters(filt(G_WORLD, G_CARGO | G_BARGE | G_RIG));
  bed.space = _space;

  const seaWall = new Body(BodyType.STATIC, new Vec2(SCREEN_W - 10, (WATER_Y + WATER_BED_Y) / 2));
  seaWall.shapes.add(new Polygon(Polygon.box(20, WATER_BED_Y - WATER_Y + 60), undefined, mat));
  seaWall.setShapeFilters(filt(G_WORLD, G_CARGO | G_BARGE | G_RIG));
  seaWall.space = _space;

  // Water — a fluid-enabled static shape. Density 1.0 with heavy viscosity so
  // the barge settles instead of bobbing forever.
  const waterX0 = QUAY_X1;
  const waterW = SCREEN_W - waterX0;
  const waterH = WATER_BED_Y - WATER_Y;
  const water = new Body(BodyType.STATIC, new Vec2(waterX0 + waterW / 2, WATER_Y + waterH / 2));
  const ws = new Polygon(Polygon.box(waterW, waterH));
  ws.fluidEnabled = true;
  ws.fluidProperties = new FluidProperties(1.0, 3.4);
  ws.filter = filt(G_WORLD, G_CARGO | G_BARGE | G_RIG);
  ws.body = water;
  try { water.userData._hidden = true; } catch (_) {}
  water.space = _space;
  _waterBody = water;
}

function spawnGantry() {
  // The gantry legs and beam are decoration painted in the overlay — only the
  // legs need bodies so cargo can't drift through them off-screen.
  const mat = new Material(0.2, 0.5, 0.6, 1);
  for (const lx of [BEAM_X0, BEAM_X1]) {
    if (lx < QUAY_X1) continue;      // the left leg stands on the quay face
    const leg = new Body(BodyType.STATIC, new Vec2(lx, (BEAM_Y + GROUND_Y) / 2));
    leg.shapes.add(new Polygon(Polygon.box(10, GROUND_Y - BEAM_Y), undefined, mat));
    leg.setShapeFilters(filt(G_WORLD, 0));   // visual collision only vs nothing
    leg.space = _space;
  }
}

function spawnRig() {
  // Hook — a small dense circle. Circles are P53-safe with explicit Materials.
  _hook = new Body(BodyType.KINEMATIC, new Vec2(_trolleyX, BEAM_Y + _ropeLen));
  _hook.shapes.add(new Circle(HOOK_R, undefined, new Material(0.1, 0.7, 0.9, 4)));
  // The hook passes THROUGH cargo rather than colliding with it: a solid hook
  // shoves crates around the quay as you try to line up on them, which makes
  // aiming a fight against your own tool. Attachment is the PivotJoint grab,
  // not contact, so nothing is lost by phasing through.
  _hook.setShapeFilters(filt(G_RIG, G_WORLD));
  _hook.allowRotation = false;
  _hook.space = _space;

  // Counterweight — rides the guide channel right of the gantry.
  _counterweight = new Body(BodyType.DYNAMIC, new Vec2(CW_X, BEAM_Y + CW_ROPE_REST));
  _counterweight.shapes.add(new Polygon(Polygon.box(CW_W, CW_H)));
  _counterweight.setShapeFilters(filt(G_RIG, 0));
  _counterweight.allowRotation = false;
  _counterweight.space = _space;
  _counterweight.mass = CW_MASS;

  // The counterweight hangs from the beam on a real PulleyJoint, with the
  // CARGO SIDE of the rope terminating on a light dynamic "sheave" body that
  // rides just under the trolley. Both ends of a PulleyJoint pair must not be
  // non-dynamic — the engine rejects (space.world, KINEMATIC) outright with
  // "PulleyJoint cannot have both bodies in a linked pair non-dynamic" — so
  // the hook block itself cannot be an endpoint now that it is kinematic.
  // Terminating on the sheave keeps the constraint real: pay out rope and the
  // pulley genuinely hauls the counterweight up its guide.
  _sheave = new Body(BodyType.DYNAMIC, new Vec2(_trolleyX, BEAM_Y + 18));
  _sheave.shapes.add(new Circle(5));
  _sheave.setShapeFilters(filt(G_RIG, 0));
  _sheave.allowRotation = false;
  _sheave.space = _space;
  _sheave.mass = 0.4;

  _pulley = new PulleyJoint(
    _space.world, _sheave,
    _space.world, _counterweight,
    new Vec2(_trolleyX, BEAM_Y),
    new Vec2(0, 0),
    new Vec2(CW_X, BEAM_Y),
    new Vec2(0, -CW_H / 2),
    SHEAVE_DROP + RATIO * CW_ROPE_REST,
    SHEAVE_DROP + RATIO * CW_ROPE_REST,
    RATIO,
  );
  _pulley.stiff = false;
  _pulley.frequency = ROPE_FREQ;
  _pulley.damping = ROPE_DAMP;
  _pulley.space = _space;
}

function spawnBarge() {
  const body = new Body(BodyType.DYNAMIC, new Vec2(BARGE_X, WATER_Y - 10));
  const halfW = BARGE_W / 2;

  // Hull slab.
  const hull = new Polygon(Polygon.rect(-halfW, 0, BARGE_W, BARGE_HULL_H));
  hull.material.density = BARGE_DENSITY;
  hull.material.dynamicFriction = 0.85;
  hull.material.staticFriction = 0.95;
  hull.material.elasticity = 0.05;
  body.shapes.add(hull);

  // Coamings — low walls fore and aft.
  for (const wx of [-halfW, halfW - BARGE_WALL_T]) {
    const w = new Polygon(Polygon.rect(wx, -BARGE_WALL_H, BARGE_WALL_T, BARGE_WALL_H));
    w.material.density = BARGE_DENSITY;
    w.material.dynamicFriction = 0.85;
    w.material.staticFriction = 0.95;
    w.material.elasticity = 0.05;
    body.shapes.add(w);
  }

  body.setShapeFilters(filt(G_BARGE, G_CARGO | G_WORLD));
  try { body.userData._colorIdx = 1; body.userData._isBarge = true; } catch (_) {}
  body.space = _space;
  _barge = body;
}

function spawnCrates() {
  _crates = [];
  for (let i = 0; i < CRATE_COUNT; i++) {
    // Two stacked rows along the quay apron. Ten crates will not fit in one
    // row inside the trolley's reach (the row would run past the quay edge),
    // so they go five-wide and two-high. Stacking on the QUAY is safe — the
    // pile is short, and each crate is lifted straight up off it — unlike the
    // deep pile that made an earlier three-high layout unwinnable.
    const perRow = Math.ceil(CRATE_COUNT / 2);
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = CRATE_START_X + col * (CRATE_S + CRATE_GAP);
    const y = GROUND_Y - CRATE_S / 2 - row * (CRATE_S + 1);

    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    // NOTE (P53): a dynamic Polygon built with an explicit Material tunnels
    // through static Polygon floors. Build the shape bare and tune the
    // material in place — that path is unaffected.
    const s = new Polygon(Polygon.box(CRATE_S, CRATE_S));
    s.material.density = CRATE_DENSITY;
    s.material.dynamicFriction = 0.8;
    s.material.staticFriction = 0.9;
    s.material.elasticity = 0.05;
    b.shapes.add(s);
    b.setShapeFilters(filt(G_CARGO, G_CARGO | G_WORLD | G_BARGE));
    try {
      b.userData._colorIdx = i % 6;
      b.userData._crateIdx = i;
    } catch (_) {}
    b.space = _space;

    _crates.push({ body: b, idx: i, integrity: 100, aboard: false, drowned: false, shattered: false, settle: 0, lastSpeed: 0, peakDrop: 0 });
  }
}

// ---------------------------------------------------------------------------
// Game logic
// ---------------------------------------------------------------------------

function enterRun() {
  _phase = "run";
  _result = "";
  _tick = 0;
  _drowned = 0;
  _debris = [];
  _floaters = [];
  _grab = null;
  _grabbed = null;
  _trolleyX = TROLLEY_MIN + 40;
  _ropeLen = ROPE_START;

  // Wipe the previous round — setup() runs on a fresh space, but R-restart
  // reuses the live one. Constraints must go FIRST: dropping a body that a
  // live joint still references throws "Constraints must have each body
  // within the same space to which the constraint has been assigned".
  if (_space) {
    for (const c of [..._space.constraints]) c.space = null;
    for (const b of [..._space.bodies]) b.space = null;
  }

  spawnTerrain();
  spawnGantry();
  spawnBarge();
  spawnRig();
  spawnCrates();
}

function tryToggleGrab() {
  if (_phase !== "run") return;

  if (_grab) {
    // Release.
    _grab.space = null;
    _grab = null;
    _grabbed = null;
    return;
  }

  // Grab the nearest crate whose centre is within reach of the hook.
  const hp = _hook.position;
  let best = null;
  let bestD = 46;
  for (const c of _crates) {
    if (c.drowned || c.shattered) continue;
    const d = Vec2.distance(hp, c.body.position);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) return;

  const anchor = best.body.worldPointToLocal(hp, true);
  _grab = new PivotJoint(_hook, best.body, new Vec2(0, 0), anchor);
  _grab.stiff = false;
  _grab.frequency = 18;
  _grab.damping = 1;
  _grab.space = _space;
  _grabbed = best;
  addFloater(hp.x, hp.y - 20, "GRABBED", "#7ee787");
}

// Drive the trolley + winch from the key state, then push the new geometry
// into the pulley. The trolley anchor is on space.world, so it is a world
// point we can simply rewrite each step.
function driveCrane(dt) {
  // A KINEMATIC body keeps whatever velocity it was last given forever —
  // nothing damps it and gravity does not apply. If the servo below stops
  // running mid-travel (phase flipped to won/lost), the hook would sail off
  // the top of the world at its last commanded speed, so park it explicitly.
  if (_phase !== "run") {
    if (_hook) _hook.velocity.setxy(0, 0);
    return;
  }

  if (keys.ArrowLeft || keys.KeyA) _trolleyX -= TROLLEY_SPEED * dt;
  if (keys.ArrowRight || keys.KeyD) _trolleyX += TROLLEY_SPEED * dt;
  _trolleyX = Math.max(TROLLEY_MIN, Math.min(TROLLEY_MAX, _trolleyX));

  if (keys.ArrowDown || keys.KeyS) _ropeLen += WINCH_SPEED * dt;
  if (keys.ArrowUp || keys.KeyW) _ropeLen -= WINCH_SPEED * dt;
  _ropeLen = Math.max(ROPE_MIN, Math.min(ROPE_MAX, _ropeLen));

  // Retarget the pulley to the commanded split. With a kinematic hook the
  // joint can no longer move the hook itself, so what it drives is the
  // COUNTERWEIGHT: pay out hook rope and the constraint hauls the weight up
  // the guide, exactly inverse to the hook. That inverse travel is the
  // mechanism the demo is here to show, and it stays honest because the
  // total really is conserved.
  // Map the winch command onto the sheave's small travel, then retarget the
  // pulley. The counterweight's rise/fall is the visible inverse of the hook.
  // A counterweight moves OPPOSITE the hook — that is the entire point of it.
  // The PulleyJoint holds (sheaveRope + RATIO * cwRope) at a fixed total, so
  // to raise the counterweight as the hook descends the sheave side has to
  // take rope UP by the same amount the winch pays out. Hence the INVERTED
  // mapping: hook at its lowest → sheave at its highest → the constraint has
  // to give that rope back on the counterweight side, hauling it up its rail.
  //
  // (Getting this backwards makes the counterweight follow the hook down,
  //  which reads as obviously broken — a counterweight that does not
  //  counterbalance anything.)
  const f = (_ropeLen - ROPE_MIN) / (ROPE_MAX - ROPE_MIN);
  const sheaveDrop = SHEAVE_DROP_MAX - f * (SHEAVE_DROP_MAX - SHEAVE_DROP_MIN);
  const total = sheaveDrop + RATIO * CW_ROPE_REST;
  _pulley.jointMin = total;
  _pulley.jointMax = total;

  // Keep the sheave riding under the trolley.
  _pulley.anchor1.setxy(_trolleyX, BEAM_Y);
  const sdx = _trolleyX - _sheave.position.x;
  _sheave.velocity.setxy(sdx * 10, _sheave.velocity.y);

  // The hook block is KINEMATIC: a crane trolley's position is commanded by
  // its machinery, not negotiated with the load. Driving it by velocity is
  // what a real winch does, and it means a heavy crate can never drag the
  // hook off the rail — as a dynamic body it lost that tug-of-war and got
  // hauled diagonally up against the beam whenever it carried anything.
  // The CARGO is still fully dynamic: it hangs off the grab joint and swings.
  const dx = _trolleyX - _hook.position.x;
  const dyH = (BEAM_Y + _ropeLen) - _hook.position.y;
  _hook.velocity.setxy(
    Math.max(-TROLLEY_SPEED * 3, Math.min(TROLLEY_SPEED * 3, dx * 12)),
    Math.max(-WINCH_SPEED * 3, Math.min(WINCH_SPEED * 3, dyH * 12)),
  );

  // The counterweight rides a vertical guide: pin its x so it can't swing off
  // the rail, but leave y to the pulley — that vertical travel IS the
  // counterbalance the player watches.
  const cdx = CW_X - _counterweight.position.x;
  _counterweight.velocity.setxy(cdx * 8, _counterweight.velocity.y);
}

// A crate battered to 0% breaks apart: the crate body is removed and replaced
// with a scatter of loose debris. The cargo is gone either way, so a shattered
// crate counts against the same loss budget as one dropped in the water —
// otherwise smashing cargo would be strictly safer than dropping it.
function shatterCrate(c) {
  if (c.drowned || c.shattered) return;
  const p = Vec2.get(c.body.position.x, c.body.position.y);
  const vel = Vec2.get(c.body.velocity.x, c.body.velocity.y);

  // Drop the grab first if this was the crate on the hook, or the joint would
  // outlive the body it references.
  if (_grabbed === c) {
    if (_grab) { _grab.space = null; _grab = null; }
    _grabbed = null;
  }

  c.body.space = null;
  c.shattered = true;
  c.aboard = false;
  _drowned++;                     // counts against the same loss budget

  // Debris: small planks that inherit the crate's momentum and sink.
  const half = CRATE_S / 2;
  for (let i = 0; i < SHATTER_PIECES; i++) {
    const ang = (i / SHATTER_PIECES) * Math.PI * 2;
    const d = new Body(
      BodyType.DYNAMIC,
      new Vec2(p.x + Math.cos(ang) * half * 0.5, p.y + Math.sin(ang) * half * 0.5),
    );
    const s = new Polygon(Polygon.box(CRATE_S * 0.34, CRATE_S * 0.22));
    s.material.density = CRATE_DENSITY;
    s.material.elasticity = 0.1;
    d.shapes.add(s);
    d.setShapeFilters(filt(G_CARGO, G_WORLD | G_BARGE));
    try { d.userData._colorIdx = 3; d.userData._debris = true; } catch (_) {}
    d.space = _space;
    d.velocity.setxy(
      vel.x + Math.cos(ang) * 70,
      vel.y + Math.sin(ang) * 70 - 40,
    );
    d.angularVel = (i % 2 ? 1 : -1) * 6;
    _debris.push({ body: d, life: 420 });
  }

  addFloater(p.x, p.y - 26, "CRATE SMASHED", "#f85149");
  if (_runnerRef) _runnerRef.shakeCamera?.(9, 0.3);
  p.dispose();
  vel.dispose();
}

// Crates chip when slammed; measured from contact impulse, exactly like
// sky-hook's hull damage.
// Sampled once per PHYSICS step (see installStepTracker) — records the largest
// single-step speed loss each crate suffers, which applyImpactDamage() then
// consumes. Tracking here rather than in demo.step() is what makes damage
// frame-rate independent: an impact resolves within one physics step, and
// demo.step() runs once per rendered frame, which may straddle several
// physics steps or none at all.
function trackImpactSpeeds() {
  for (const c of _crates) {
    if (c.drowned || c.shattered) continue;
    const speed = c.body.velocity.length;
    const drop = c.lastSpeed - speed;
    if (drop > c.peakDrop) c.peakDrop = drop;
    c.lastSpeed = speed;
  }
}

// Wrap the space's own step() so the tracker runs on every physics step no
// matter how the host schedules frames. DemoRunner drives a fixed-timestep
// accumulator, so the number of space.step() calls per frame varies with
// refresh rate — sampling per frame silently missed impacts entirely.
function installStepTracker(space) {
  if (space._craneTracked) return;
  space._craneTracked = true;
  const origStep = space.step.bind(space);
  space.step = (dt, vel, pos) => {
    const r = origStep(dt, vel, pos);
    trackImpactSpeeds();
    return r;
  };
}

function applyImpactDamage() {
  for (const c of _crates) {
    if (c.drowned || c.shattered) continue;

    // The crate on the hook is exempt. Grabbing snaps a stiff PivotJoint onto
    // a crate that is still resting on the quay, and the resulting one-frame
    // constraint impulse reads as a colossal "impact" — big enough to run the
    // crate from 100% to 0% and shatter it the instant you picked it up.
    // Damage is about hitting things, and a held crate is not hitting
    // anything; contacts resume counting the moment it is released.
    if (c === _grabbed) { c.settle = 12; c.peakDrop = 0; continue; }

    // Brief grace after release, while the crate separates from the hook and
    // the solver stops ringing from the joint that just went away.
    if (c.settle > 0) { c.settle--; c.peakDrop = 0; continue; }

    // Damage is measured from the crate's OWN change in speed, not from
    // totalContactsImpulse(). The barge floats, so when a crate lands the deck
    // heaves and the buoyancy pushes back: the contact impulse then depends
    // mostly on where the hull happened to be in its bob, and the same release
    // height measured anywhere from dv 359 to dv 1166. Speed lost on impact is
    // what "how hard did it hit" actually means, and it ignores the deck.
    //
    // The peak is tracked in trackImpactSpeeds(), which runs once per PHYSICS
    // step. It cannot be sampled here: DemoRunner calls demo.step() once per
    // frame while space.step() runs a variable number of substeps — zero on a
    // fast monitor whose accumulator hasn't filled. An impact resolves inside
    // a single physics step, so frame-rate sampling misses it outright and no
    // crate ever took damage.
    const dv = c.peakDrop;
    c.peakDrop = 0;

    if (dv > IMPACT_FLOOR) {
      const dmg = Math.min(IMPACT_MAX, (dv - IMPACT_FLOOR) * IMPACT_SCALE);
      if (dmg >= 1) {
        c.integrity = Math.max(0, c.integrity - dmg);
        const p = c.body.position;
        addFloater(p.x, p.y - 22, `−${dmg.toFixed(0)}%`, "#f0883e");
        if (_runnerRef) _runnerRef.shakeCamera?.(Math.min(7, dmg * 0.3), 0.18);
        if (c.integrity <= 0) shatterCrate(c);
      }
    }
  }
}

// A crate counts as aboard when it sits inside the barge's local hold box.
function updateStowage() {
  const bargeRot = Math.abs(normAngle(_barge.rotation));

  for (const c of _crates) {
    if (c.drowned || c.shattered) continue;
    const p = c.body.position;

    // Drowned: sank well below the waterline and is no longer recoverable.
    // This must be gated on being IN THE WATER (x past the quay edge) — a
    // bare y threshold also catches crates sitting on the quay deck, which
    // spawns the whole stack "drowned" and instantly loses the game.
    if (p.x > QUAY_X1 && p.y > WATER_Y + 70 && c !== _grabbed) {
      c.drowned = true;
      c.aboard = false;
      _drowned++;
      addFloater(p.x, WATER_Y - 10, "LOST OVERBOARD", "#f85149");
      continue;
    }

    if (c === _grabbed) { c.aboard = false; continue; }

    // The hold box has to be tall enough for a real pile — ten crates cannot
    // fit in one layer on a 290px deck, so cargo legitimately stacks two or
    // three high and the upper layers must still count as stowed.
    const local = _barge.worldPointToLocal(p, true);
    c.aboard =
      Math.abs(local.x) < BARGE_W / 2 - 4 &&
      local.y > -BARGE_WALL_H - CRATE_S * 4 &&
      local.y < BARGE_HULL_H + 6;
  }

  if (_phase !== "run") return;

  if (bargeRot > LIST_FAIL) {
    _phase = "lost";
    _result = "BARGE CAPSIZED";
    return;
  }
  if (_drowned > DROWN_LIMIT) {
    _phase = "lost";
    _result = "TOO MUCH CARGO LOST";
    return;
  }

  // Win: every surviving crate is stowed, the barge is settled and level, and
  // nothing is still dangling from the hook.
  const alive = _crates.filter((c) => !c.drowned && !c.shattered);
  const stowed = alive.filter((c) => c.aboard);
  const settled =
    Math.abs(_barge.angularVel) < 0.14 && _barge.velocity.length < 22;
  if (
    !_grabbed &&
    alive.length === _crates.length - _drowned &&
    stowed.length === alive.length &&
    alive.length >= CRATE_COUNT - DROWN_LIMIT &&
    bargeRot < LIST_WARN &&
    settled
  ) {
    _phase = "won";
    _result = "CARGO SECURED";
  }
}

function normAngle(a) {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function drawWater(ctx) {
  const x0 = QUAY_X1;
  const w = SCREEN_W - x0;

  ctx.save();
  const grad = ctx.createLinearGradient(0, WATER_Y, 0, WATER_BED_Y);
  grad.addColorStop(0, "rgba(56,139,193,0.55)");
  grad.addColorStop(1, "rgba(20,63,102,0.75)");
  ctx.fillStyle = grad;
  ctx.fillRect(x0, WATER_Y, w, WATER_BED_Y - WATER_Y);

  // Surface ripple.
  ctx.strokeStyle = "rgba(160,215,255,0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x0; x <= x0 + w; x += 6) {
    const y = WATER_Y + Math.sin(x * 0.045 + _tick * 0.06) * 2.4;
    if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGantry(ctx) {
  ctx.save();
  // Legs.
  ctx.fillStyle = "#3d4a5e";
  ctx.strokeStyle = "#1e2533";
  ctx.lineWidth = 1;
  for (const lx of [BEAM_X0, BEAM_X1]) {
    ctx.fillRect(lx - 5, BEAM_Y, 10, GROUND_Y - BEAM_Y);
    ctx.strokeRect(lx - 5, BEAM_Y, 10, GROUND_Y - BEAM_Y);
  }
  // Beam.
  ctx.fillStyle = "#4a5a70";
  ctx.fillRect(BEAM_X0 - 12, BEAM_Y - 14, (BEAM_X1 + 12) - (BEAM_X0 - 12), 14);
  ctx.strokeRect(BEAM_X0 - 12, BEAM_Y - 14, (BEAM_X1 + 12) - (BEAM_X0 - 12), 14);

  // Counterweight guide rail.
  ctx.fillStyle = "#2a3340";
  ctx.fillRect(CW_X - 22, BEAM_Y - 14, 4, 300);
  ctx.fillRect(CW_X + 18, BEAM_Y - 14, 4, 300);
  // Beam extension out to the counterweight.
  ctx.fillStyle = "#4a5a70";
  ctx.fillRect(BEAM_X1, BEAM_Y - 14, (CW_X + 22) - BEAM_X1, 14);
  ctx.restore();
}

function drawRope(ctx) {
  if (!_hook || !_counterweight) return;
  const hp = _hook.position;
  const cp = _counterweight.position;

  ctx.save();
  ctx.strokeStyle = "#c8a672";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  // Trolley → hook.
  ctx.beginPath();
  ctx.moveTo(_trolleyX, BEAM_Y);
  ctx.lineTo(hp.x, hp.y - HOOK_R);
  ctx.stroke();
  // Trolley → beam sheave → counterweight.
  ctx.beginPath();
  ctx.moveTo(_trolleyX, BEAM_Y);
  ctx.lineTo(CW_X, BEAM_Y);
  ctx.lineTo(cp.x, cp.y - CW_H / 2);
  ctx.stroke();
  ctx.restore();

  // Trolley car.
  ctx.save();
  ctx.fillStyle = "#8b949e";
  ctx.strokeStyle = "#1e2533";
  ctx.lineWidth = 1.5;
  ctx.fillRect(_trolleyX - 18, BEAM_Y - 10, 36, 16);
  ctx.strokeRect(_trolleyX - 18, BEAM_Y - 10, 36, 16);
  ctx.restore();

  // Grab line when carrying.
  if (_grab && _grabbed) {
    ctx.save();
    ctx.strokeStyle = "rgba(126,231,135,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hp.x, hp.y);
    const gp = _grabbed.body.position;
    ctx.lineTo(gp.x, gp.y);
    ctx.stroke();
    ctx.restore();
  } else if (_phase === "run") {
    // Reach hint ring — shows when a crate is grabbable.
    let near = false;
    for (const c of _crates) {
      if (c.drowned || c.shattered) continue;
      if (Vec2.distance(hp, c.body.position) < 46) { near = true; break; }
    }
    if (near) {
      ctx.save();
      ctx.strokeStyle = "rgba(126,231,135,0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function drawFloaters(ctx) {
  ctx.save();
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const f of _floaters) {
    ctx.globalAlpha = Math.min(1, f.life / 30);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function drawHUD(ctx, W, H) {
  const alive = _crates.filter((c) => !c.drowned && !c.shattered);
  const stowed = alive.filter((c) => c.aboard).length;
  const list = Math.abs(normAngle(_barge ? _barge.rotation : 0));
  const listDeg = (list * 180) / Math.PI;

  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.72)";
  ctx.fillRect(0, 0, W, 34);

  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.fillStyle = "#e6edf3";
  ctx.fillText(`STOWED ${stowed}/${CRATE_COUNT}`, 14, 22);

  ctx.fillStyle = _drowned > 0 ? "#f85149" : "#8b949e";
  ctx.fillText(`LOST ${_drowned}/${DROWN_LIMIT}`, 130, 22);

  // Trim gauge.
  const trimColor =
    list > LIST_FAIL * 0.8 ? "#f85149" : list > LIST_WARN ? "#d29922" : "#7ee787";
  ctx.fillStyle = trimColor;
  ctx.fillText(`LIST ${listDeg.toFixed(0)}°`, 232, 22);

  const gx = 310;
  const gw = 150;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(gx, 12, gw, 10);
  ctx.fillStyle = trimColor;
  const frac = Math.min(1, list / LIST_FAIL);
  ctx.fillRect(gx, 12, gw * frac, 10);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, 12, gw, 10);

  ctx.fillStyle = "#8b949e";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText("←/→ trolley   ↑/↓ winch   SPACE grab/release   R restart", 490, 22);
  ctx.restore();

  // Crate integrity pips over each crate.
  ctx.save();
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  for (const c of _crates) {
    if (c.drowned || c.shattered || c.integrity >= 100) continue;
    const p = c.body.position;
    ctx.fillStyle = c.integrity > 50 ? "#d29922" : "#f85149";
    ctx.fillText(`${c.integrity.toFixed(0)}%`, p.x, p.y - CRATE_S / 2 - 6);
  }
  ctx.restore();

  if (_phase === "run") return;

  // End banner.
  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.82)";
  ctx.fillRect(0, H / 2 - 62, W, 124);
  ctx.textAlign = "center";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.fillStyle = _phase === "won" ? "#7ee787" : "#f85149";
  ctx.fillText(_result, W / 2, H / 2 - 12);

  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "#e6edf3";
  if (_phase === "won") {
    const avg =
      _crates.filter((c) => !c.drowned && !c.shattered).reduce((s, c) => s + c.integrity, 0) /
      Math.max(1, _crates.length - _drowned);
    ctx.fillText(
      `${_crates.length - _drowned}/${CRATE_COUNT} crates aboard · avg condition ${avg.toFixed(0)}%`,
      W / 2, H / 2 + 18,
    );
  } else {
    ctx.fillText(`${_drowned} crate(s) in the drink`, W / 2, H / 2 + 18);
  }
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#8b949e";
  ctx.fillText("Press R or SPACE to try again", W / 2, H / 2 + 44);
  ctx.restore();
}

// Shared decoration for the Three.js / PixiJS overlay. The water belongs here
// too: those adapters render the rigid bodies natively but know nothing about
// the fluid shape (it is a _hidden static body), so without this pass the 3D
// and Pixi modes showed a barge floating over an empty basin. The fill is
// translucent and drawn after the bodies, exactly as in the canvas2d path, so
// submerged cargo still reads through it.
function drawWorld(ctx) {
  drawGantry(ctx);
  drawWater(ctx);
  drawRope(ctx);
  drawFloaters(ctx);
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "cargo-crane",
  label: "Cargo Crane Captain",
  tags: ["Fluid", "Buoyancy", "PulleyJoint", "PivotJoint", "Keys", "Game"],
  featured: false,
  desc:
    "Load ten crates onto a barge that <b>actually floats</b> — a fluid-enabled water body, not a " +
    "static platform. A real <code>PulleyJoint</code> hauls a live counterweight up its guide as the " +
    "winch pays out; drive the trolley, then <b>SPACE</b> to grab and release. Every crate you set " +
    "down shifts the barge's buoyancy, so a lopsided load makes it <b>list</b> — and enough list " +
    "capsizes it. Miss the deck and the crate sinks; slam one hard enough and it <b>shatters</b>, " +
    "chipped by measured <code>totalContactsImpulse</code>. " +
    "<b>←/→</b> trolley, <b>↑/↓</b> winch, <b>R</b> restart.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    _runnerRef = this._runner ?? null;
    space.gravity = new Vec2(0, GRAVITY);

    // Fresh space — reset module state without the wipe loop in enterRun().
    _phase = "run";
    _result = "";
    _tick = 0;
    _drowned = 0;
    _debris = [];
    _floaters = [];
    _grab = null;
    _grabbed = null;
    _crates = [];
    _trolleyX = TROLLEY_MIN + 40;
    _ropeLen = ROPE_START;
    for (const k of Object.keys(keys)) delete keys[k];

    spawnTerrain();
    spawnGantry();
    spawnBarge();
    spawnRig();
    spawnCrates();
    installStepTracker(space);

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
          if (_phase === "run") tryToggleGrab();
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
    const dt = 1 / 60;

    driveCrane(dt);
    applyImpactDamage();
    updateStowage();

    for (let i = _floaters.length - 1; i >= 0; i--) {
      _floaters[i].y -= 0.6;
      if (--_floaters[i].life <= 0) _floaters.splice(i, 1);
    }

    // Retire shatter debris once it has settled on the bed, so a run that
    // smashes several crates doesn't leave the basin full of junk.
    for (let i = _debris.length - 1; i >= 0; i--) {
      const d = _debris[i];
      if (--d.life <= 0) {
        d.body.space = null;
        _debris.splice(i, 1);
      }
    }
  },

  render(ctx, space, W, H, showOutlines) {
    drawGrid(ctx, W, H);
    drawGantry(ctx);
    for (const body of space.bodies) {
      if (body.userData?._hidden) continue;
      drawBody(ctx, body, showOutlines);
    }
    drawWater(ctx);
    drawRope(ctx);
    drawFloaters(ctx);
    drawHUD(ctx, W, H);
  },

  // Three.js / PixiJS draw the bodies natively; the crane decoration and HUD
  // go on the shared overlay canvas.
  render3dOverlay(ctx, space, W, H) {
    drawWorld(ctx);
    drawHUD(ctx, W, H);
  },
};
