import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  FluidProperties, DistanceJoint, PivotJoint, AngleJoint, InteractionFilter,
} from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

// ---------------------------------------------------------------------------
// Raft Rapids — build-a-raft passenger run down a river.
//
// The buoyancy sibling of Contraption Garage: in the BUILD phase the player
// assembles a raft over the calm loading pool from three part types —
// buoyant barrels, light deck nodes and wind-catching sails — and connects
// them with springy rods (drag from part to part). Hitting LAUNCH spawns
// the design as real bodies: they splash in, the engine's fluid buoyancy
// floats the barrels, and the crane lowers a ragdoll passenger onto
// whatever is waiting under the hook. The passenger is DENSER THAN WATER —
// overboard he goes under, and a drowned passenger loses the run — so the
// raft is the only thing keeping him alive while the current carries
// everything down a four-screen river: a staircase of THREE waterfalls,
// each taller than the last (a 60px shelf, a 120px chute, a 190px plunge),
// with boulder slaloms and accelerating headraces between them, to the
// delivery dock. Rods carry live strain and snap when
// overstretched — a rock hit at speed shakes a sloppy frame apart, and
// barrels that float away take their lift with them. Sails add a gusty
// tailwind pull while they stay dry. Once LAUNCH is pressed the run is
// hands-off — no steering, no grabbing: the raft you designed either makes
// it or it doesn't, which is the entire point of a building game. The
// design data outlives the physics: stopping a run (or wrecking) rebuilds
// the same raft for another round of editing.
//
// Engine features showcased:
//   * Fluid buoyancy — fluidEnabled static water volumes with
//     FluidProperties(density, viscosity); barrels (density 0.28) float,
//     the passenger (density 1.8) sinks, and a loaded raft rides low.
//   * River current — manual drag toward a per-region target velocity,
//     scaled by each body's measured submergence fraction, so lift and
//     drift both die the moment a body leaves the water. The dam crest
//     doubles as a weir: extra flow boost + lift flush deep hulls over,
//     and the falling sheet carries anything on the spillway face down.
//   * Ragdoll rig — Crash Test Hero's dummy: a Circle head plus box torso
//     and two-segment arms/legs, stiff PivotJoints and soft AngleJoint
//     limits, drawn by the engine's own renderer in every mode.
//   * Soft DistanceJoint rods (stiff=false + frequency/damping) with live
//     strain measurement, a stress color ramp and break-under-load rules.
//   * InteractionFilter groups — raft parts overlap freely and collide
//     only with the world and the passenger, like the builder genre
//     expects; the ragdoll gets its own group so limbs never self-collide.
//   * Design/simulation split — bodies are (re)spawned from pure design
//     data on every launch, so edit → launch → edit is lossless.
// ---------------------------------------------------------------------------

const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 44;

// ── River geometry ───────────────────────────────────────────────────────
// Two pools at different levels, joined by a dam spillway. The upper pool
// holds the loading bay (build zone + crane); at each crest the water
// sheet ends, the raft slides down the spillway face and splashes into the
// pool below, and the last one runs through a final rock to the delivery
// dock. The camera follows the passenger down the staircase.
const UP_X0 = 20;                    // topmost pool's left edge
const BED_Y = 700;                   // riverbed top — passenger grave
const WORLD_W = 3400;

// ── The staircase ────────────────────────────────────────────────────────
// The river is a flight of pools separated by WEIRS, described by data so
// the whole model (water volumes, dam bodies, slippery armor, surface and
// current lookup, sheet carry, the painted falls) derives from this one
// table. Each weir: the crest span [x0, x1], the crest top (`top`, which
// must sit just under the upstream surface so floating hulls wash over
// instead of hitting a wall), and the spillway foot (`footX`, `footY`)
// where the face meets the pool below.
//
// The drops grow as the run goes on: a 60px shelf to teach the move, a
// 120px chute, and a 190px plunge at the end that wrecks anything but a
// properly walled raft. Each pool's surface is the next step down.
const POOL_SURF = [330, 390, 510, 640];   // one per pool, upstream → down
const WEIRS = [
  { x0: 900,  x1: 950,  top: 342, footX: 1030, footY: 402 },
  { x0: 1700, x1: 1755, top: 402, footX: 1880, footY: 522 },
  { x0: 2500, x1: 2560, top: 522, footX: 2700, footY: 652 },
];
const LO_X1 = 3380;                  // last pool's right edge (dock face)

// Derived pool spans: pool i runs from the previous weir's crest END to
// this weir's crest END (so water still covers each crest — a body keeps
// its lift while washing over) and the last one runs to the dock.
const POOLS = POOL_SURF.map((surf, i) => ({
  x0: i === 0 ? UP_X0 : WEIRS[i - 1].x1,
  x1: i < WEIRS.length ? WEIRS[i].x1 : LO_X1,
  surf,
}));

// Unit downslope vector of each spillway face, plus its length.
const FACES = WEIRS.map((w) => {
  const len = Math.hypot(w.footX - w.x1, w.footY - w.top);
  return { dx: (w.footX - w.x1) / len, dy: (w.footY - w.top) / len };
});

const UP_SURF = POOL_SURF[0];        // loading-bay surface (build zone, crane)

// Delivery dock — the passenger has to reach the capture point floating beside
// the dock face (the dock itself is the downstream backstop).
const DOCK_X0 = 3260;
const DOCK_TOP = 608;
const GOAL = { x: 3208, y: 628 };
const GOAL_RANGE = 60;

// ── Water ────────────────────────────────────────────────────────────────
// Denser than every raft part, lighter than the passenger — that asymmetry IS
// the game. Viscosity gives the engine's own drag; horizontal transport
// comes from the current model below.
const FLUID_DENSITY = 1.6;
const FLUID_VISCOSITY = 2.0;

// Current: per-region target surface velocity (px/s). Bodies are dragged
// toward it in proportion to how deep they sit — see applyCurrent().
const CUR_POOL = 70;                 // pool cruise
const CUR_HEADRACE = 150;            // accelerating approach to a weir
const CUR_RAPIDS = 110;              // below-the-falls rapids
const CUR_DELIVERY = 45;             // calm water beside the dock
// Each weir has a headrace: the water speeds up over this distance as it
// approaches the lip, so every drop is entered with commitment.
const HEADRACE_LEN = 220;
const DELIVERY_X = 3100;             // calmer current from here to the dock
// Per-second approach rate toward the current at full submergence.
const CURRENT_GAIN = 4.0;
const STEP_DT = 1 / 60;

// ── Passenger ────────────────────────────────────────────────────────────
// The crane lowers a ragdoll onto the raft at DROP_X when a run starts —
// into the water (and to his doom) if nothing waits under the hook.
// Density 1.8 vs water 1.6: overboard he goes under, slowly enough to
// snatch the raft back under him with the hand. He sinks because the limb
// boxes carry the engine's DEFAULT density (1) against water at 1.6 — a
// custom Material is impossible here: dynamic Polygon + explicit Material
// is the P53 tunneling bug.
const DROP_X = 205;
const DROP_CATCH_R = 44;             // parts this close to the hook set the
                                     //   drop height — narrow, so the crane
                                     //   hugs what is actually UNDER him
const SINK_DEPTH = 32;               // HEAD center this far under the surface…
const SINK_STEPS = 26;               // …for this many steps = drowned
// Rig dimensions, straight from Crash Test Hero's dummy (scaled ~0.8 for
// this smaller-scale river) — the proportions that already read as a body.
const TORSO_W = 16, TORSO_H = 32;
const HEAD_R = 8;
const ARM_LEN = 19, ARM_W = 6;
const LEG_LEN = 21, LEG_W = 7;
// The crane lowers him on a winch (a stiff world pivot whose anchor sinks
// at WINCH_SPEED) and lets go once he is supported — dropping a ragdoll
// into the launch splash slips him straight between the bobbing barrels.
const WINCH_SPEED = 55;              // px/s cable payout
const WINCH_TIMEOUT = 240;           // steps — release no matter what
// Mooring spring that holds the raft under the hook while he descends.
const MOOR_GAIN = 6.0;               // 1/s — position error to target speed
const MOOR_DAMP = 12.0;              // 1/s — approach rate to that speed
// Exactly Crash Test Hero's construction: box limbs built with NO Material
// constructor argument (dynamic Polygon + Material in the ctor is the P53
// tunneling bug). The passenger still has to be denser than the water, so
// the limb shapes get their density MUTATED after construction instead —
// same physical result, without handing a Material to the Polygon ctor.
// The Circle head can safely take a real Material (rolling friction, or a
// bobbing head spins forever). The bodies are drawn by the engine's own
// renderer in every mode; the demo only paints the face on top.
const DUDE_DENSITY = 1.9;            // vs water 1.6 — he sinks, not fast
const HEAD_MAT = () => new Material(0.1, 0.5, 0.7, DUDE_DENSITY, 0.4);
// Ragdoll limbs share a private group so they never collide with each
// other, but they DO collide with raft parts (group 2) and the world.
const DUDE_GROUP = 16;
// Soft angular limits — floppy enough to slump, firm enough to read human.
const JOINT_FREQ = 3;
const JOINT_DAMP = 0.6;
// Hips and neck get an always-active soft spring (jointMin === jointMax —
// a min<max AngleJoint applies NO force inside its window) so he keeps
// trying to sit up and hold his head high. An unstabilized ragdoll is an
// inverted pendulum: he flops flat on the deck and his head laps the
// waterline all the way down the river.
const SIT_FREQ = 2.2;
const SIT_DAMP = 0.7;
// He also HOLDS ON: a breakable soft pivot from his pelvis to the nearest
// raft part (crash-test-hero's seatbelt pattern). Loose-cargo ragdolls
// slide off a bobbing deck within seconds — grip is what makes any honest
// raft work. A violent shock (rock at headrace speed, the spillway slam)
// tears the grip and he tumbles; if the current washes the raft back under
// him, he grabs hold again after a short cooldown.
const GRIP_R = 26;                   // pelvis-to-part reach (surface distance)
const GRIP_FORCE = 6000;             // maxForce — slalom bumps hold, slams don't
const GRIP_FREQ = 8;
const GRIP_DAMP = 1.0;
const GRIP_COOLDOWN = 45;            // steps before he can re-grab
const GRIP_REL_V = 90;               // max relative speed for a re-grab

// ── Wind / sails ─────────────────────────────────────────────────────────
// A gusty tailwind blows downstream. A sail pulls the raft toward the wind
// speed while it stays DRY — a dunked sail is just wet cloth — so masts
// want to ride high, and a swamped raft loses its wind assist exactly when
// it is in the most trouble. The pull is scaled by the whole raft's mass,
// so one sail gives the same acceleration to a big raft as to a small one;
// more sails stack.
const SAIL_R = 8;
const SAIL_MAT = () => new Material(0.1, 0.6, 0.8, 0.35, 0.03);
const WIND_BASE = 140;               // px/s — mean wind speed
const WIND_GUST = 70;                // px/s — gust amplitude on top
const SAIL_GAIN = 0.3;               // raft-mass fraction pulled per second
const SAIL_DV_CAP = 120;             // px/s — cap so launch gusts don't yank
const MAST_H = 30;                   // visual mast height above the deck

// Parts must be placed inside the build zone (their centers). It floats
// over the loading pool; parts splash in and float when the run starts.
const ZONE = { x0: 56, y0: 182, x1: 380, y1: 324 };

// ── Part / rod tuning ────────────────────────────────────────────────────
// Barrels sized against the passenger's weight: the ragdoll masses ~3.3,
// so one fully-submerged barrel must lift a useful fraction of that or no
// buildable raft floats him. r=21 displaces ~2.2 — three barrels carry him
// with freeboard to spare, two leave him awash (which is the starter).
const BARREL_R = 21;
const NODE_R = 7;
const PART_CAP = 24;                 // sanity cap — plenty for this river
const MIN_PART_GAP = 24;             // min center distance between placed parts
const ROD_MIN = 26;                  // rods shorter than this won't connect
const ROD_MAX = 150;                 // ... longer either
const PICK_R = 18;                   // min pick radius around small parts

// Rods are soft distance joints: stiff enough to act as a frame, springy
// enough that a rock hit visibly flexes the raft before anything lets go.
const ROD_FREQ = 12;
const ROD_DAMP = 1.0;

// Strain is |current - rest| / rest, recomputed every step. One violent
// shock (a boulder at headrace speed) snaps a rod instantly; sustained
// overload accumulates and tears within a second. The counter decays so
// brief bounces are forgiven.
const BREAK_INSTANT = 0.5;
const BREAK_STRAIN = 0.22;
const BREAK_SUSTAIN = 50;

// Raft parts share collision group 2 and exclude it from their mask: they
// collide with the world (group 1) and the passenger but never with each
// other, so barrels can sit shoulder-to-shoulder under one deck.
const PART_FILTER_GROUP = 2;

// Barrels: light enough to float high (0.28 vs water 1.6 ≈ 17% draft),
// grippy enough that the passenger doesn't skate off the first bump.
const BARREL_MAT = () => new Material(0.15, 0.9, 1.1, 0.28, 0.02);
const NODE_MAT = () => new Material(0.05, 1.0, 1.2, 0.5, 0.05);

const RESTART_LOCK_STEPS = 30;       // ignore clicks right after an overlay

// ── Toolbar layout (canvas-drawn UI) ─────────────────────────────────────
const TOOLS = [
  { id: "barrel", label: "1 Barrel" },
  { id: "node",   label: "2 Node" },
  { id: "sail",   label: "3 Sail" },
  { id: "erase",  label: "4 Erase" },
];
const TOOL_BTN = { x: 10, y: 7, w: 82, h: 30, gap: 6 };
// The Launch/Build toggle lives at the bottom-right — the demo page overlays
// its own render-mode controls over the canvas's top-right corner.
const GO_RECT = { x: SCREEN_W - 148, y: SCREEN_H - 42, w: 138, h: 32 };

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
// Design data — the source of truth. Bodies exist only while running.
let _parts = [];                     // { kind, x, y, body, wasDry }
let _rods = [];                      // { a, b, rest, joint, strain, over, broken }

let _phase = "build";                // "build" | "run" | "won" | "wreck"
let _wreckReason = "";               // overlay line for the wreck screen
let _dude = null;                    // { torso, head, parts: [{body, r}], joints }
let _winch = null;                   // { joint, y, timer } while the crane lowers him
let _flowRamp = 0;                   // 0→1 fade-in of current/wind after the winch
                                     //   lets go — a step-function surge pitched
                                     //   the raft and tobogganed him off the bow
let _grip = null;                    // { joint, part } while he holds onto the raft
let _gripCd = 0;                     // steps until he may re-grab
let _stallSteps = 0;                 // steps since the raft last made progress
let _stallMarkX = 0;                 // raft x at the last progress check
let _stallMarkT = 0;                 // _tick at the last progress check
let _sinkTimer = 0;                  // steps the head has spent too deep
let _dudeSplash = { wasDry: true };  // splash edge-detect for the passenger
let _raftMass = 0;                   // live part mass at launch — sail pull scale
let _tool = "barrel";
let _linking = null;                 // { from: part, x, y } while dragging a rod
let _mouse = null;
let _hint = null;                    // { text, life } transient toolbar message

let _time = 0;                       // seconds elapsed in the current run
let _timeBase = 0;                   // space.elapsedTime when the run started
let _winTime = 0;
let _best = null;                    // best win time (seconds), session-wide
let _lockTimer = 0;
let _fx = [];                        // { kind: "snap"|"splash"|"drop", x, y, vx, vy, life }
let _snapCount = 0;
let _tick = 0;
let _lastKeyDown = null;

// Camera. The runner follows _camTarget (the passenger during a run, the
// loading bay while editing) and hands the smoothed offset back to the
// render hooks; the demo keeps the last offset for world↔screen conversion
// of the screen-anchored HUD.
const CAM_HOME = { x: SCREEN_W / 2, y: SCREEN_H / 2 };
let _camTarget = { x: CAM_HOME.x, y: CAM_HOME.y };
let _lastCamX = 0;
let _lastCamY = 0;

// ---------------------------------------------------------------------------
// River model — surface level and current by x
// ---------------------------------------------------------------------------

// Water covers each pool up to its weir's crest END (so a body keeps its
// lift while washing over the lip), nothing over the spillway faces, and
// the last pool runs to the dock.
function surfaceAt(x) {
  if (x < UP_X0 || x > LO_X1) return null;
  for (const pool of POOLS) {
    if (x >= pool.x0 && x <= pool.x1) return pool.surf;
  }
  return null;                       // over a spillway face — free fall
}

// Calm in the loading bay, rapids between the falls, and a headrace surge
// over the last stretch before every lip.
function currentAt(x) {
  if (x > LO_X1) return 0;
  if (x >= DELIVERY_X) return CUR_DELIVERY;
  for (const w of WEIRS) {
    if (x > w.x1) continue;
    if (x >= w.x0 - HEADRACE_LEN) return CUR_HEADRACE;
    // Above the FIRST weir is the loading bay — deliberately placid so the
    // player can watch the crane work; every pool after it is rapids.
    return w === WEIRS[0] ? CUR_POOL : CUR_RAPIDS;
  }
  return CUR_RAPIDS;                 // past the last weir, before the dock
}

// Submergence fraction of a body approximated by a bounding circle of
// radius r — 0 fully dry, 1 fully under. Good enough for drag scaling.
function submergence(body, r) {
  const surf = surfaceAt(body.position.x);
  if (surf === null) return 0;
  return Math.max(0, Math.min(1, (body.position.y + r - surf) / (2 * r)));
}

// Water squeezed over a shoal runs faster and boils upward — and that's
// also what un-wedges a raft whose barrel pair straddles a rock crown
// (the horizontal current alone just pins it there). Returns { boost,
// lift }: current multiplier and upward push (px/s²) near rock crowns.
const ROCK_FLOW_R = 90;
const ROCK_FLOW_BOOST = 1.1;
const ROCK_FLOW_LIFT = 380;

// Wedge breaker. A hull whose barrel pair straddles a rock crown can jam
// solid: the crown holds it up, the rods hold the pair apart, and the
// horizontal current just presses it home — the raft parks there forever.
// Rather than tune the geometry until no raft can ever wedge (impossible
// for a player-built hull), detect the stall and let the river rise: the
// lift ramps up the longer nothing moves, and dies the moment it does.
// Progress, not speed, is the test: a wedged hull still jiggles at 5–12
// px/s against the rock forever, so a velocity threshold never trips.
const STALL_WINDOW = 90;             // steps between progress checks
const STALL_PROGRESS = 30;           // px of downstream gain that counts
const SURGE_RAMP = 150;              // steps to reach full surge
const SURGE_LIFT = 620;              // px/s² at full surge
const SURGE_PUSH = 320;              // px/s² downstream at full surge

// Every crest is a weir: the whole river piles up and accelerates over it.
// A stronger, wider version of the shoal flow centered on each upstream
// lip flushes deep-riding hulls up and across instead of letting them park
// against the crest corner.
const CREST_R = 150;
const CREST_BOOST = 0.6;
const CREST_LIFT = 650;

function shoalFlow(x) {
  let boost = 1, lift = 0;
  for (const rock of _rockFoam) {
    const d = Math.abs(x - rock.x);
    if (d >= ROCK_FLOW_R) continue;
    const k = 1 - d / ROCK_FLOW_R;
    boost += ROCK_FLOW_BOOST * k;
    lift += ROCK_FLOW_LIFT * k;
  }
  for (const w of WEIRS) {
    const dc = Math.abs(x - w.x0);
    if (dc >= CREST_R) continue;
    const k = 1 - dc / CREST_R;
    boost += CREST_BOOST * k;
    lift += CREST_LIFT * k;
  }
  return { boost, lift };
}

// Drag a body toward the local current, scaled by submergence — buoyancy
// is the engine's, transport is ours. Impulse-based so it composes with
// everything else acting on the body.
function applyCurrent(body, r) {
  const f = submergence(body, r);
  if (f <= 0) return;
  const { boost, lift } = shoalFlow(body.position.x);
  const target = currentAt(body.position.x) * boost;
  const dv = target - body.velocity.x;
  body.applyImpulse(new Vec2(
    dv * body.mass * f * CURRENT_GAIN * _flowRamp * STEP_DT,
    -lift * body.mass * f * _flowRamp * STEP_DT,
  ));
}

// The falling sheet over the crest and down the spillway face. Submergence
// is zero here (the upper pool's surface ends at the crest), so the current
// model goes silent exactly where a raft can teeter half-on half-off the
// lip — this carry force is the water that is still very much flowing:
// anything riding within SHEET_DEPTH of the crest/face gets pushed along
// the sheet's own direction until it splashes into the lower pool.
const SHEET_DEPTH = 26;              // reach above the crest/face (px)
const SHEET_PUSH = 320;              // px/s² at full contact

function applySheetCarry(body, r) {
  const x = body.position.x;
  for (let i = 0; i < WEIRS.length; i++) {
    const w = WEIRS[i];
    if (x < w.x0 || x > w.footX + 8) continue;
    const onCrest = x <= w.x1;
    const faceY = onCrest
      ? w.top
      : w.top + (w.footY - w.top) * ((x - w.x1) / (w.footX - w.x1));
    const gap = faceY - (body.position.y + r); // clearance above the sheet bed
    if (gap > SHEET_DEPTH) return;             // flying high above the face
    const k = 1 - Math.max(0, gap) / SHEET_DEPTH;
    const dx = onCrest ? 1 : FACES[i].dx;
    const dy = onCrest ? 0.2 : FACES[i].dy;
    body.applyImpulse(new Vec2(
      dx * SHEET_PUSH * k * body.mass * STEP_DT,
      dy * SHEET_PUSH * k * body.mass * STEP_DT,
    ));
    return;
  }
}

// Gusty tailwind — two beat frequencies so the gusts feel irregular.
function windSpeed() {
  const t = _tick * STEP_DT;
  return WIND_BASE + WIND_GUST * (0.5 + 0.5 * Math.sin(t * 0.6) * Math.sin(t * 0.23 + 1.7));
}

// Sail pull: approach the wind speed while the sail is dry. Scaled by the
// raft's TOTAL launch mass (not the sail body's own tiny mass) so a sail
// moves a big raft as decisively as a small one; the rods transmit the tug.
function applyWind(body) {
  const dry = 1 - submergence(body, SAIL_R * 2);
  if (dry <= 0) return;
  const dv = Math.min(SAIL_DV_CAP, windSpeed() - body.velocity.x);
  if (dv <= 0) return;                         // sails can't outrun the wind
  body.applyImpulse(new Vec2(dv * _raftMass * dry * SAIL_GAIN * _flowRamp * STEP_DT, 0));
}

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

function addStaticBox(cx, cy, w, h, colorIdx) {
  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  try { b.userData._colorIdx = colorIdx; } catch (_) { /* userData may be frozen */ }
  b.space = _space;
  return b;
}

// Shoal rocks sit with their crown just UNDER the waterline: an empty raft
// (barrel draft ~5px) skims across, a loaded raft rides deep and grinds
// over — freeboard through extra barrels IS the defense. `clearance` is
// crown depth below the surface: the shoals get shallower downstream, so
// even a low-riding starter clears the first one and learns what the foam
// means before the tighter ones bite. Slippery material so a grounded hull
// clambers off instead of parking.
const _rockFoam = [];                // { x, r } — surface foam markers

function addRock(x, surf, r, clearance) {
  const b = new Body(BodyType.STATIC, new Vec2(x, surf + clearance + r));
  b.shapes.add(new Circle(r, undefined, new Material(0.05, 0.05, 0.1, 1, 0.01)));
  try { b.userData._colorIdx = 5; } catch (_) { /* same */ }
  try { b.userData._rock = true; } catch (_) { /* same */ }
  b.space = _space;
  _rockFoam.push({ x, r });
}

function addWater(x0, x1, surf, floorY) {
  const w = x1 - x0, h = floorY - surf;
  const b = new Body(BodyType.STATIC, new Vec2(x0 + w / 2, surf + h / 2));
  const s = new Polygon(Polygon.box(w, h));
  s.fluidEnabled = true;
  s.fluidProperties = new FluidProperties(FLUID_DENSITY, FLUID_VISCOSITY);
  s.sensorEnabled = false;
  b.shapes.add(s);
  try { b.userData._water = true; } catch (_) { /* same */ }
  try { b.userData._hidden = true; } catch (_) { /* same */ }
  try { b.userData._hidden3d = true; } catch (_) { /* same */ }
  b.space = _space;
}

// One weir: the stone step itself plus its slippery armor. The dam polygon
// keeps the engine's default (grippy) material — an explicit Material on a
// static Polygon risks the P53 tunneling bug against dynamic shapes — so a
// row of low-friction circles rides ~2px proud of the stone instead, like
// the rounded apron blocks of a real weir: everything that grinds across
// touches only these. The upstream lip circle turns the crest's sharp 90°
// corner into an arc that hulls can ride up.
function addWeir(w, face, floorY) {
  const dam = new Body(BodyType.STATIC);
  dam.shapes.add(new Polygon([
    new Vec2(w.x0, w.top), new Vec2(w.x1, w.top),
    new Vec2(w.footX, w.footY), new Vec2(w.footX, floorY),
    new Vec2(w.x0, floorY),
  ]));
  try { dam.userData._colorIdx = 5; } catch (_) { /* same */ }
  dam.space = _space;

  const slipMat = () => new Material(0.05, 0.05, 0.1, 1, 0.01);
  const armor = new Body(BodyType.STATIC);
  armor.shapes.add(new Circle(12, new Vec2(w.x0 + 4, w.top + 11), slipMat()));
  for (let x = w.x0 + 24; x <= w.x1; x += 20) {
    armor.shapes.add(new Circle(10, new Vec2(x, w.top + 8), slipMat()));
  }
  // Face blocks — centers pushed below the face line (along the interior
  // normal (-dy, dx)) so only a 2px crown stands proud of the slope. Long
  // faces get more blocks so no bare stone shows between them.
  const faceLen = Math.hypot(w.footX - w.x1, w.footY - w.top);
  const blocks = Math.max(4, Math.round(faceLen / 42));
  for (let i = 1; i <= blocks; i++) {
    const t = i / (blocks + 1);
    const fx = w.x1 + (w.footX - w.x1) * t;
    const fy = w.top + (w.footY - w.top) * t;
    armor.shapes.add(new Circle(10, new Vec2(fx - face.dy * 8, fy + face.dx * 8), slipMat()));
  }
  try { armor.userData._colorIdx = 5; } catch (_) { /* same */ }
  try { armor.userData._hidden = true; } catch (_) { /* same */ }
  try { armor.userData._hidden3d = true; } catch (_) { /* same */ }
  armor.space = _space;
}

function spawnTerrain() {
  _rockFoam.length = 0;              // previous load registered its own rocks
  // Riverbed under everything, and banks that seal both ends.
  addStaticBox(WORLD_W / 2, BED_Y + 15, WORLD_W + 40, 30, 5);
  addStaticBox(8, UP_SURF - 5, 20, 340, 5);               // upstream backstop
  addStaticBox((DOCK_X0 + WORLD_W) / 2, (DOCK_TOP + BED_Y) / 2 + 8,
    WORLD_W - DOCK_X0, BED_Y - DOCK_TOP + 16, 5);         // delivery dock

  // The staircase. Each pool's floor is the next pool's surface (the step
  // below holds the water in), and the last one runs down to the bed.
  for (let i = 0; i < WEIRS.length; i++) {
    addWeir(WEIRS[i], FACES[i], poolFloor(i));
  }

  // Shoals scattered through the pools — clearances are set against the
  // BARREL_R hull: a barrel drafts ~a third of its radius, so a crown
  // deeper than that lets an empty raft skim while a loaded one grinds.
  // Too shallow and a big hull simply beaches, parking on the crown with
  // the current unable to shift it.
  addRock(700, POOL_SURF[0], 26, 22);                     // loading-bay shoal
  addRock(1180, POOL_SURF[1], 30, 20);                    // …then the slalom
  addRock(1370, POOL_SURF[1], 22, 19);
  addRock(1560, POOL_SURF[1], 26, 21);
  addRock(2080, POOL_SURF[2], 28, 20);
  addRock(2300, POOL_SURF[2], 22, 19);
  addRock(2960, POOL_SURF[3], 26, 20);                    // last tooth

  // Water volumes last, so the fluid shapes sit over the rocks/dam bases.
  for (let i = 0; i < POOLS.length; i++) {
    addWater(POOLS[i].x0, POOLS[i].x1, POOLS[i].surf, poolFloor(i));
  }
}

// A pool's floor: deep enough to drown a passenger, but stopping at the
// next step down so the fluid volume doesn't swallow the weir below it.
function poolFloor(i) {
  return i < WEIRS.length ? Math.max(WEIRS[i].footY, POOL_SURF[i] + 120) : BED_Y;
}

function partFilter() {
  return new InteractionFilter(PART_FILTER_GROUP, ~PART_FILTER_GROUP);
}

function makePartBody(p) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(p.x, p.y));
  const mat = p.kind === "barrel" ? BARREL_MAT() : p.kind === "sail" ? SAIL_MAT() : NODE_MAT();
  body.shapes.add(new Circle(partRadius(p), undefined, mat, partFilter()));
  try { body.userData._part = true; } catch (_) { /* same */ }
  try {
    body.userData._colorIdx = p.kind === "barrel" ? 1 : p.kind === "sail" ? 0 : 2;
  } catch (_) { /* same */ }
  body.space = _space;
  return body;
}

function partRadius(p) {
  return p.kind === "barrel" ? BARREL_R : p.kind === "sail" ? SAIL_R : NODE_R;
}

function dudePart(x, y, shape, r, colorIdx) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  shape.filter = new InteractionFilter(DUDE_GROUP, ~DUDE_GROUP);
  // Post-construction density (see DUDE_DENSITY) — the boxes must outweigh
  // the water without a ctor Material. Circles already carry theirs.
  if (shape.material.density !== DUDE_DENSITY) shape.material.density = DUDE_DENSITY;
  body.shapes.add(shape);
  try { body.userData._dude = true; } catch (_) { /* same */ }
  try { body.userData._colorIdx = colorIdx; } catch (_) { /* same */ }
  body.space = _space;
  return { body, r };
}

function dudePivot(b1, b2, a1, a2, joints) {
  const j = new PivotJoint(b1, b2, a1, a2);
  j.space = _space;
  joints.push(j);
  return j;
}

function dudeAngle(b1, b2, min, max, joints) {
  const j = new AngleJoint(b1, b2, min, max);
  j.stiff = false;
  j.frequency = min === max ? SIT_FREQ : JOINT_FREQ;
  j.damping = min === max ? SIT_DAMP : JOINT_DAMP;
  j.space = _space;
  joints.push(j);
  return j;
}

// Tallest raft top under the hook (the water surface when nothing is
// there) — where the winch aims its set-down.
function dropTargetTop() {
  let top = UP_SURF - 2;
  for (const p of _parts) {
    if (!p.body) continue;
    if (Math.abs(p.body.position.x - DROP_X) > DROP_CATCH_R) continue;
    top = Math.min(top, p.body.position.y - partRadius(p));
  }
  return top;
}

// The crane lowers the passenger toward whatever waits under the hook. He
// spawns seated high above the pool, hanging from a winch (see
// updateWinch) that pays out cable until he is supported — onto the raft
// if one floats under the hook, into the water (and to his doom) if not.
//
// The rig is Crash Test Hero's dummy verbatim: an upright box torso, a
// Circle head, two-piece arms hanging at the sides and legs stretched
// forward in a luge/seated pose (the leg boxes are built WIDE, major axis
// = x, so rotation 0 IS the seated pose and no body.rotation is needed
// anywhere). All limb boxes are Material-free — dynamic Polygon + explicit
// Material is the P53 tunneling bug.
function spawnDude() {
  const joints = [];
  const x = DROP_X;
  const deckTop = dropTargetTop() - 85;     // spawn high; the winch lowers him
  const torsoY = deckTop - TORSO_H / 2;

  const torso = dudePart(x, torsoY,
    new Polygon(Polygon.box(TORSO_W, TORSO_H)), TORSO_H / 2, 3);
  const head = dudePart(x, torsoY - TORSO_H / 2 - HEAD_R - 2,
    new Circle(HEAD_R, undefined, HEAD_MAT()), HEAD_R, 3);

  dudePivot(torso.body, head.body,
    new Vec2(0, -TORSO_H / 2 - 1), new Vec2(0, HEAD_R - 1), joints);
  dudeAngle(torso.body, head.body, 0, 0, joints);

  const limbs = [];
  // Arms — two segments hanging at the torso's sides.
  for (const side of [-1, 1]) {
    const ax = x + side * (TORSO_W / 2 + ARM_W / 2 + 1);
    const upper = dudePart(ax, torsoY - TORSO_H / 2 + 7 + ARM_LEN / 2,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)), ARM_LEN / 2, 4);
    const lower = dudePart(ax, upper.body.position.y + ARM_LEN,
      new Polygon(Polygon.box(ARM_W, ARM_LEN)), ARM_LEN / 2, 4);

    dudePivot(torso.body, upper.body,
      new Vec2(side * (TORSO_W / 2 - 2), -TORSO_H / 2 + 7),
      new Vec2(0, -ARM_LEN / 2 + 1), joints);
    dudeAngle(torso.body, upper.body, -2.2, 2.2, joints);

    dudePivot(upper.body, lower.body,
      new Vec2(0, ARM_LEN / 2 - 1), new Vec2(0, -ARM_LEN / 2 + 1), joints);
    dudeAngle(upper.body, lower.body,
      side > 0 ? -0.1 : -2.4, side > 0 ? 2.4 : 0.1, joints);
    limbs.push(upper, lower);
  }

  // Legs — two horizontal segments stretched forward (seated pose).
  for (const side of [-1, 1]) {
    const hipY = torsoY + TORSO_H / 2 - 3 + side * 2;
    const upper = dudePart(x + 5 + LEG_LEN / 2, hipY,
      new Polygon(Polygon.box(LEG_LEN, LEG_W)), LEG_LEN / 2, 4);
    const lower = dudePart(upper.body.position.x + LEG_LEN, hipY,
      new Polygon(Polygon.box(LEG_LEN, LEG_W)), LEG_LEN / 2, 4);

    dudePivot(torso.body, upper.body,
      new Vec2(5, TORSO_H / 2 - 3 + side * 2), new Vec2(-LEG_LEN / 2 + 1, 0), joints);
    // Always-active spring: he keeps trying to sit up rather than flop flat
    // with his head at the waterline (a min<max AngleJoint gives no force
    // inside its window).
    dudeAngle(torso.body, upper.body, 0, 0, joints);

    dudePivot(upper.body, lower.body,
      new Vec2(LEG_LEN / 2 - 1, 0), new Vec2(-LEG_LEN / 2 + 1, 0), joints);
    dudeAngle(upper.body, lower.body, -2.0, 2.0, joints);
    limbs.push(upper, lower);
  }

  _dude = { torso, head, parts: [torso, head, ...limbs], joints };
  _sinkTimer = 0;
  _dudeSplash = { wasDry: true };

  // Hook the harness — a stiff pivot from the world to the torso's top
  // whose anchor descends each step until the set-down (updateWinch).
  const hookY = torsoY - TORSO_H / 2;
  const winchJoint = new PivotJoint(
    _space.world, torso.body, new Vec2(x, hookY), new Vec2(0, -TORSO_H / 2),
  );
  winchJoint.space = _space;
  _winch = { joint: winchJoint, y: hookY, timer: 0 };
  _flowRamp = 0;
}

function releaseWinch() {
  if (!_winch) return;
  if (_winch.joint.space) _winch.joint.space = null;
  _winch = null;
  tryGrip();                         // grab hold of whatever he landed on
}

// World position of the pelvis — the grip's mount point. The box torso's
// pelvis sits at local (0, +TORSO_H/2 - 2).
function pelvisPos() {
  const t = _dude.torso.body;
  const d = TORSO_H / 2 - 2;
  return {
    x: t.position.x - Math.sin(t.rotation) * d,
    y: t.position.y + Math.cos(t.rotation) * d,
  };
}

function tryGrip() {
  if (!_dude || _grip) return;
  const pv = pelvisPos();
  const torso = _dude.torso.body;
  let part = null, bestD = Infinity;
  for (const p of _parts) {
    if (!p.body) continue;
    const d = dist(pv.x, pv.y, p.body.position.x, p.body.position.y) - partRadius(p);
    if (d <= GRIP_R && d < bestD) {
      const rvx = p.body.velocity.x - torso.velocity.x;
      const rvy = p.body.velocity.y - torso.velocity.y;
      if (rvx * rvx + rvy * rvy > GRIP_REL_V * GRIP_REL_V) continue;
      bestD = d;
      part = p;
    }
  }
  if (!part) return;
  const b = part.body;
  // Part-local coordinates of the pelvis point (parts are circles, but
  // respect their rotation anyway).
  const dx = pv.x - b.position.x, dy = pv.y - b.position.y;
  const c = Math.cos(-b.rotation), s = Math.sin(-b.rotation);
  const joint = new PivotJoint(
    b, torso, new Vec2(dx * c - dy * s, dx * s + dy * c),
    new Vec2(0, TORSO_H / 2 - 2),
  );
  joint.stiff = false;
  joint.frequency = GRIP_FREQ;
  joint.damping = GRIP_DAMP;
  joint.maxForce = GRIP_FORCE;
  joint.breakUnderForce = true;
  joint.removeOnBreak = true;
  joint.space = _space;
  _grip = { joint, part };
}

function releaseGrip(cooldown) {
  if (!_grip) return;
  if (_grip.joint.space) _grip.joint.space = null;
  _grip = null;
  _gripCd = cooldown;
}

// Poll the breakable grip: removeOnBreak clears joint.space when the shock
// tears it. While loose, he re-grabs the first part that drifts within
// reach at a survivable relative speed.
function updateGrip() {
  if (!_dude) return;
  if (_grip) {
    if (!_grip.joint.space || !_grip.part.body) {
      const wasBroken = !_grip.joint.space;
      _grip = null;
      _gripCd = GRIP_COOLDOWN;
      if (wasBroken) {
        const pv = pelvisPos();
        _fx.push({ kind: "snap", x: pv.x, y: pv.y, vx: 0, vy: 0, life: 18 });
      }
    }
    return;
  }
  if (_gripCd > 0) { _gripCd--; return; }
  tryGrip();
}

// Pay out cable until the passenger is actually resting on the raft (or
// the timeout expires over open water). The raft has time to splash in and
// settle while he descends — dropping him INTO the launch splash used to
// slip him straight between the bobbing barrels.
function updateWinch() {
  if (!_winch || !_dude) return;
  _winch.timer++;
  _winch.y += WINCH_SPEED * STEP_DT;
  _winch.joint.anchor1 = new Vec2(DROP_X, _winch.y);
  // Let go once the seat reaches the deck. Waiting for actual contact was
  // tried and is worse: he already brushes a barrel while still dangling,
  // so the cable went slack with his weight nowhere near the deck.
  if (pelvisPos().y >= dropTargetTop() - LEG_W || _winch.timer >= WINCH_TIMEOUT) {
    releaseWinch();
  }
}

// Sample the raft's downstream progress every STALL_WINDOW steps. If it
// hasn't gained STALL_PROGRESS px, the surge grows; any real progress
// resets it to zero.
function updateStall() {
  if (_winch || _phase !== "run") { _stallSteps = 0; return; }
  let n = 0, sx = 0;
  for (const p of _parts) {
    if (!p.body) continue;
    n++;
    sx += p.body.position.x;
  }
  // Nothing afloat, or the raft is already at the dock: no surge.
  if (n === 0 || sx / n > DELIVERY_X) { _stallSteps = 0; return; }
  const x = sx / n;
  if (_tick - _stallMarkT < STALL_WINDOW) return;
  if (x - _stallMarkX >= STALL_PROGRESS) _stallSteps = 0;
  else _stallSteps += STALL_WINDOW;
  _stallMarkX = x;
  _stallMarkT = _tick;
}

function surgeStrength() {
  if (_stallSteps <= 0) return 0;
  return Math.min(1, _stallSteps / SURGE_RAMP);
}

// The river rising under a wedged hull: lift plus a downstream shove,
// scaled by submergence so a beached raft still feels it.
function applySurge(body, r) {
  const k = surgeStrength();
  if (k <= 0) return;
  const f = Math.max(0.35, submergence(body, r));
  body.applyImpulse(new Vec2(
    SURGE_PUSH * k * f * body.mass * STEP_DT,
    -SURGE_LIFT * k * f * body.mass * STEP_DT,
  ));
}

// Current/wind fade back in over ~1.5s once the passenger is aboard.
function updateFlowRamp() {
  if (_winch) return;
  _flowRamp = Math.min(1, _flowRamp + 1 / 90);
}

function despawnDude() {
  if (_winch) {                      // bare release — no re-grip during teardown
    if (_winch.joint.space) _winch.joint.space = null;
    _winch = null;
  }
  releaseGrip(0);
  if (!_dude) return;
  for (const j of _dude.joints) if (j.space) j.space = null;
  for (const p of _dude.parts) if (p.body.space) p.body.space = null;
  _dude = null;
}

// ---------------------------------------------------------------------------
// Design editing (build phase — pure data, no bodies)
// ---------------------------------------------------------------------------

function addPartDesign(kind, x, y) {
  const part = { kind, x, y, body: null, wasDry: true };
  _parts.push(part);
  return part;
}

function addRodDesign(a, b) {
  const rod = { a, b, rest: 0, joint: null, strain: 0, over: 0, broken: false };
  _rods.push(rod);
  return rod;
}

function rodBetween(a, b) {
  return _rods.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a)) ?? null;
}

function removePartDesign(part) {
  for (let i = _rods.length - 1; i >= 0; i--) {
    if (_rods[i].a === part || _rods[i].b === part) _rods.splice(i, 1);
  }
  const idx = _parts.indexOf(part);
  if (idx >= 0) _parts.splice(idx, 1);
}

function removeRodDesign(rod) {
  const idx = _rods.indexOf(rod);
  if (idx >= 0) _rods.splice(idx, 1);
}

function partAt(x, y, except) {
  let best = null, bestD = Infinity;
  for (const p of _parts) {
    if (p === except) continue;
    const pos = p.body ? p.body.position : p;
    const r = Math.max(partRadius(p) + 8, PICK_R);
    const d = dist(x, y, pos.x, pos.y);
    if (d <= r && d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return dist(px, py, x1 + dx * t, y1 + dy * t);
}

function rodAt(x, y) {
  let best = null, bestD = 8;
  for (const r of _rods) {
    const d = distToSegment(x, y, r.a.x, r.a.y, r.b.x, r.b.y);
    if (d < bestD) { bestD = d; best = r; }
  }
  return best;
}

function inZone(x, y) {
  return x >= ZONE.x0 && x <= ZONE.x1 && y >= ZONE.y0 && y <= ZONE.y1;
}

function setHint(text) {
  _hint = { text, life: 150 };
}

// The starter design is deliberately the crudest raft that floats at all:
// three barrels and a two-node deck, no walls, no sail. It carries the
// passenger out of the loading bay riding low and loses him within a few
// hundred px — barely out of the bay. That IS the tutorial: the tools to
// fix it (a fourth barrel for freeboard, wall nodes for a cockpit, a sail
// for speed) are one click away, and the player discovers each by losing
// without it.
function seedStarter() {
  const bs = [160, 205, 250].map((x) => addPartDesign("barrel", x, 307));
  for (let i = 0; i + 1 < bs.length; i++) addRodDesign(bs[i], bs[i + 1]);
  const d1 = addPartDesign("node", 178, 275);
  const d2 = addPartDesign("node", 232, 275);
  addRodDesign(d1, d2);
  for (const d of [d1, d2]) {
    for (const b of bs) if (Math.abs(d.x - b.x) < 62) addRodDesign(d, b);
  }
}

// ---------------------------------------------------------------------------
// Run lifecycle — design data ↔ live bodies
// ---------------------------------------------------------------------------

function startRun() {
  if (_phase !== "build" || _parts.length === 0) return;

  for (const p of _parts) {
    p.body = makePartBody(p);
    p.wasDry = true;
  }
  for (const r of _rods) {
    r.rest = Math.max(ROD_MIN, dist(r.a.x, r.a.y, r.b.x, r.b.y));
    r.strain = 0;
    r.over = 0;
    r.broken = false;
    r.joint = new DistanceJoint(
      r.a.body, r.b.body, new Vec2(0, 0), new Vec2(0, 0), r.rest, r.rest,
    );
    r.joint.stiff = false;
    r.joint.frequency = ROD_FREQ;
    r.joint.damping = ROD_DAMP;
    r.joint.space = _space;
  }
  _raftMass = _parts.reduce((m, p) => m + p.body.mass, 0);
  _stallSteps = 0;
  _stallMarkX = 0;
  _stallMarkT = _tick;
  spawnDude();

  // Clock off the space's own elapsed physics time — demo.step() runs once
  // per FRAME while the space may substep several times per frame, so a
  // frame counter would drift on slow displays.
  _timeBase = _space.elapsedTime;
  _time = 0;
  _phase = "run";
  updateCamTarget();                 // don't let the camera chase last run's spot
}

function despawnRun() {
  despawnDude();
  for (const r of _rods) {
    if (r.joint && r.joint.space) r.joint.space = null;
    r.joint = null;
    r.strain = 0;
    r.over = 0;
    r.broken = false;
  }
  for (const p of _parts) {
    if (p.body && p.body.space) p.body.space = null;
    p.body = null;
  }
}

function backToBuild() {
  despawnRun();
  _phase = "build";
  _linking = null;
  _time = 0;
}

function resetGame() {
  despawnRun();
  _parts = [];
  _rods = [];
  _linking = null;
  _phase = "build";
  _time = 0;
  _fx = [];
  _snapCount = 0;
  _hint = null;
  seedStarter();
}

// ---------------------------------------------------------------------------
// Run maintenance
// ---------------------------------------------------------------------------

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function breakRod(rod) {
  if (rod.joint && rod.joint.space) rod.joint.space = null;
  rod.joint = null;
  rod.broken = true;
  _snapCount++;
  const pa = rod.a.body.position, pb = rod.b.body.position;
  _fx.push({ kind: "snap", x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, vx: 0, vy: 0, life: 18 });
}

function updateRods() {
  for (const rod of _rods) {
    if (rod.broken) continue;
    const pa = rod.a.body.position, pb = rod.b.body.position;
    const d = dist(pa.x, pa.y, pb.x, pb.y);
    rod.strain = Math.abs(d - rod.rest) / rod.rest;
    if (rod.strain > BREAK_INSTANT) {
      breakRod(rod);
    } else if (rod.strain > BREAK_STRAIN) {
      if (++rod.over >= BREAK_SUSTAIN) breakRod(rod);
    } else {
      rod.over = Math.max(0, rod.over - 1);
    }
  }
}

// Splash rings + droplets when a body first punches through the surface.
function splashFx(x, y, speed) {
  const n = Math.min(7, 3 + Math.floor(speed / 120));
  _fx.push({ kind: "splash", x, y, vx: 0, vy: 0, life: 16 });
  for (let i = 0; i < n; i++) {
    _fx.push({
      kind: "drop", x, y,
      vx: (i / (n - 1) - 0.5) * 130,
      vy: -60 - (speed * 0.35) * (0.4 + 0.6 * Math.abs(Math.sin(i * 2.399))),
      life: 26,
    });
  }
}

function trackSplash(body, r, state) {
  const surf = surfaceAt(body.position.x);
  const dry = surf === null || body.position.y + r < surf;
  if (state.wasDry && !dry && body.velocity.y > 120) {
    splashFx(body.position.x, surf, body.velocity.y);
  }
  state.wasDry = dry;
}

function updateParts() {
  for (const p of _parts) {
    if (!p.body) continue;
    // The raft stays moored in the calm loading bay until the passenger is
    // aboard: no current, and a soft horizontal spring back to the design
    // x. Without the spring the descending ragdoll's own contact shoves the
    // raft downstream and it slides out from under the hook before he ever
    // reaches the deck.
    if (_winch) {
      const dvx = (p.x - p.body.position.x) * MOOR_GAIN - p.body.velocity.x;
      p.body.applyImpulse(new Vec2(dvx * p.body.mass * MOOR_DAMP * STEP_DT, 0));
    } else {
      applyCurrent(p.body, partRadius(p));
      applySheetCarry(p.body, partRadius(p));
      applySurge(p.body, partRadius(p));
      if (p.kind === "sail") applyWind(p.body);
    }
    trackSplash(p.body, partRadius(p), p);
  }
}

// Camera chases the passenger — he IS the run. Won/wreck overlays hold the
// last view because the target simply stops updating.
function updateCamTarget() {
  if (_dude) {
    const p = _dude.torso.body.position;
    _camTarget = { x: p.x, y: p.y };
    return;
  }
  let n = 0, sx = 0, sy = 0;
  for (const p of _parts) {
    if (!p.body) continue;
    n++;
    sx += p.body.position.x;
    sy += p.body.position.y;
  }
  if (n > 0) _camTarget = { x: sx / n, y: sy / n };
}

// Win when the PASSENGER floats into the dock's capture ring; lose when
// his head spends SINK_STEPS deeper than SINK_DEPTH under the local
// surface (or he meets the riverbed). The raft's own fate never scores.
function checkDude() {
  if (!_dude) return;
  for (const p of _dude.parts) {
    applyCurrent(p.body, p.r);
    applySheetCarry(p.body, p.r);
    applySurge(p.body, p.r);
  }
  const torso = _dude.torso.body;
  const head = _dude.head.body;
  trackSplash(torso, TORSO_H / 2, _dudeSplash);

  const surf = surfaceAt(head.position.x);
  const depth = surf === null ? 0 : head.position.y - surf;
  if (!_winch && (depth > SINK_DEPTH || head.position.y > BED_Y - HEAD_R - 4)) {
    _sinkTimer++;
    if (_sinkTimer >= SINK_STEPS || head.position.y > BED_Y - HEAD_R - 4) {
      _wreckReason = "The passenger went under.";
      _phase = "wreck";
      _lockTimer = RESTART_LOCK_STEPS;
    }
    return;
  }
  _sinkTimer = Math.max(0, _sinkTimer - 1);

  if (dist(torso.position.x, torso.position.y, GOAL.x, GOAL.y) <= GOAL_RANGE) {
    _winTime = _time;
    if (_best === null || _winTime < _best) _best = _winTime;
    _phase = "won";
    _lockTimer = RESTART_LOCK_STEPS;
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "raft-rapids",
  label: "Raft Rapids",
  tags: ["Fluid", "Buoyancy", "DistanceJoint", "Ragdoll", "Building", "Drag", "Gameplay"],
  featured: false,
  desc:
    "Build-a-raft passenger run on real <b>fluid buoyancy</b>. In the loading bay, <b>click</b> " +
    "to place floating barrels, deck nodes and wind-catching sails, and <b>drag part-to-part</b> " +
    "to connect them with springy rods. Hit <b>Launch</b>: the raft splashes in, the crane " +
    "lowers a <b>ragdoll passenger</b> who is denser than water — overboard he goes under and " +
    "the run is lost — and the current carries everything down a four-screen river: a " +
    "<b>staircase of three waterfalls</b>, each taller than the last, with boulder slaloms and " +
    "accelerating headraces between them, to the delivery dock. The passenger <b>holds on</b> " +
    "with a breakable joint: slalom bumps he rides out, a big drop tears his grip and he " +
    "tumbles — and if the current washes the raft back under him, he grabs hold again. Rods " +
    "are soft <b>DistanceJoint</b>s with live strain that snap on hard rock hits, and sails " +
    "pull toward a <b>gusty tailwind</b> while they stay dry. Once you launch, the run is " +
    "<b>hands-off</b>: the raft you designed either makes it or it doesn't. <b>Space</b> " +
    "launches, <b>1–4</b> pick tools, <b>R</b> resets.",
  walls: false,
  workerCompatible: false,
  camera: null,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 600);

    // Hard-reset module state — the previous load's bodies died with its space.
    _parts = [];
    _rods = [];
    _linking = null;
    _mouse = null;
    _hint = null;
    _phase = "build";
    _wreckReason = "";
    _dude = null;                    // previous load's bodies died with its space
    _winch = null;
    _flowRamp = 0;
    _grip = null;
    _gripCd = 0;
    _stallSteps = 0;
    _stallMarkX = 0;
    _stallMarkT = 0;
    _sinkTimer = 0;
    _dudeSplash = { wasDry: true };
    _raftMass = 0;
    _tool = "barrel";
    _time = 0;
    _lockTimer = 0;
    _fx = [];
    _snapCount = 0;
    _tick = 0;
    _camTarget = { x: CAM_HOME.x, y: CAM_HOME.y };
    _lastCamX = 0;
    _lastCamY = 0;

    spawnTerrain();
    seedStarter();

    // Follow the passenger while running, rest on the loading bay otherwise.
    // Vertical bounds equal the viewport height, so the camera only scrolls
    // horizontally and the screen-anchored HUD math stays simple.
    this.camera = {
      follow: () => (_phase === "build" ? CAM_HOME : _camTarget),
      // The staircase descends ~370px, so the camera has to track down the
      // river as well as along it. Screen-anchored HUD math still works:
      // click() converts through _lastCamY (see the render hooks).
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: BED_Y + 60 },
      lerp: 0.08,
    };

    if (typeof window !== "undefined") {
      if (_lastKeyDown) window.removeEventListener("keydown", _lastKeyDown);
      _lastKeyDown = (e) => {
        if (e.code === "KeyR") {
          e.preventDefault();
          resetGame();
        } else if (e.code === "Space") {
          e.preventDefault();
          if (_phase === "build") startRun();
          else if (_phase === "run") backToBuild();
          else if (_lockTimer <= 0) backToBuild();
        } else if (e.code.startsWith("Digit")) {
          const idx = Number(e.code.slice(5)) - 1;
          if (idx >= 0 && idx < TOOLS.length) _tool = TOOLS[idx].id;
        }
      };
      window.addEventListener("keydown", _lastKeyDown);
    }
  },

  step() {
    _tick++;
    if (_lockTimer > 0) _lockTimer--;
    if (_hint && --_hint.life <= 0) _hint = null;
    for (let i = _fx.length - 1; i >= 0; i--) {
      const f = _fx[i];
      if (f.kind === "drop") {
        f.x += f.vx * STEP_DT;
        f.y += f.vy * STEP_DT;
        f.vy += 600 * STEP_DT;
      }
      if (--f.life <= 0) _fx.splice(i, 1);
    }
    if (_phase !== "run") return;

    _time = Math.max(0, _space.elapsedTime - _timeBase);
    updateRods();
    updateStall();
    updateParts();
    updateWinch();
    updateFlowRamp();
    updateGrip();
    checkDude();
    updateCamTarget();
  },

  click(x, y) {
    if (_phase === "won" || _phase === "wreck") {
      if (_lockTimer <= 0) backToBuild();
      return;
    }

    // Canvas UI is screen-anchored while clicks arrive in world coords —
    // convert with the camera offset the render pass last saw.
    const sx = x - _lastCamX;
    const sy = y - _lastCamY;

    // The Launch/Build toggle (bottom-right) and the toolbar.
    if (sx >= GO_RECT.x && sx <= GO_RECT.x + GO_RECT.w
      && sy >= GO_RECT.y && sy <= GO_RECT.y + GO_RECT.h) {
      if (_phase === "build") startRun();
      else backToBuild();
      return;
    }
    if (sy < HUD_H) {
      for (let i = 0; i < TOOLS.length; i++) {
        const bx = TOOL_BTN.x + i * (TOOL_BTN.w + TOOL_BTN.gap);
        if (sx >= bx && sx <= bx + TOOL_BTN.w && sy >= TOOL_BTN.y && sy <= TOOL_BTN.y + TOOL_BTN.h) {
          _tool = TOOLS[i].id;
          return;
        }
      }
      return;
    }

    // Once launched, the run is hands-off: the raft you built either makes
    // it or it doesn't. A draggable steering hand was tried and removed —
    // being able to haul any part around let a bad raft be carried over
    // every waterfall by hand, which hollowed out the whole building game.
    if (_phase === "run") return;

    // Build phase.
    const part = partAt(x, y);
    if (_tool === "erase") {
      if (part) removePartDesign(part);
      else {
        const rod = rodAt(x, y);
        if (rod) removeRodDesign(rod);
      }
      return;
    }
    if (part) {
      // Drag a rod out of an existing part.
      _linking = { from: part, x, y };
      return;
    }
    if (!inZone(x, y)) {
      setHint("Place parts inside the loading bay");
      return;
    }
    if (_parts.length >= PART_CAP) {
      setHint("Part limit reached — erase something first");
      return;
    }
    for (const p of _parts) {
      if (dist(x, y, p.x, p.y) < MIN_PART_GAP) return;
    }
    const placed = addPartDesign(_tool, x, y);
    // Chain into a rod drag so place-and-connect is one gesture.
    _linking = { from: placed, x, y };
  },

  drag(x, y) {
    _mouse = { x, y };
    if (_linking) {
      _linking.x = x;
      _linking.y = y;
    }
  },

  release() {
    if (!_linking) return;
    const { from, x, y } = _linking;
    _linking = null;
    if (_phase !== "build") return;
    const target = partAt(x, y, from);
    if (!target || rodBetween(from, target)) return;
    const d = dist(from.x, from.y, target.x, target.y);
    if (d < ROD_MIN || d > ROD_MAX) {
      setHint(d < ROD_MIN ? "Too close for a rod" : "Too far for a rod");
      return;
    }
    addRodDesign(from, target);
  },

  hover(x, y) {
    _mouse = { x, y };
  },

  // Headless-test hook (Node smoke tests) — not a DemoRunner callback and
  // not included in generated CodePen/StackBlitz previews.
  _testState() {
    return {
      phase: _phase, tool: _tool, time: _time, winTime: _winTime, best: _best,
      parts: _parts, rods: _rods, dude: _dude, snaps: _snapCount,
      sinkTimer: _sinkTimer, wreckReason: _wreckReason,
      startRun, backToBuild, resetGame, addPartDesign, addRodDesign,
      removePartDesign,
      surfaceAt, currentAt, submergence, windSpeed,
      goRect: GO_RECT, goal: GOAL, dropX: DROP_X,
    };
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);
    drawWindStreaks(ctx, camX, W);
    drawWaterFill(ctx, camX, W);
    drawWaterfall(ctx);
    for (const body of space.bodies) {
      if (body.userData._water || body.userData._part || body.userData._hidden) continue;
      drawBody(ctx, body, showOutlines);
    }
    drawDock(ctx);
    drawRods(ctx);
    drawParts(ctx, true);
    drawDude(ctx);
    drawWaterSurface(ctx, camX, W);
    drawCrane(ctx);
    drawBuildZone(ctx);
    drawLinking(ctx);
    drawFx(ctx);
    ctx.restore();
    drawHUD(ctx, W, H);
  },

  // Three.js / PixiJS render bodies natively (camera applied by the
  // adapter); everything game-specific is painted on the shared overlay
  // canvas (parts/passenger get decoration-only passes while bodies exist, full
  // ghosts while editing). World-space passes get the camera translate,
  // the HUD stays screen-anchored. Water volumes are _hidden and painted
  // here instead.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawWindStreaks(ctx, camX, W);
    drawWaterFill(ctx, camX, W);
    drawWaterfall(ctx);
    drawDock(ctx);
    drawRods(ctx);
    drawParts(ctx, false);
    drawDude(ctx);
    drawWaterSurface(ctx, camX, W);
    drawCrane(ctx);
    drawBuildZone(ctx);
    drawLinking(ctx);
    drawFx(ctx);
    ctx.restore();
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Rendering — water, dam, crane, parts, passenger, toolbar HUD
// ---------------------------------------------------------------------------

// Purely cosmetic ripple — deliberately local (not the shared
// water-renderer helper) so generated CodePen/StackBlitz previews stay
// self-contained.
function rippleY(x, t) {
  return Math.sin(x * 0.02 + t * 2.0) * 3
       + Math.sin(x * 0.035 - t * 1.5) * 2
       + Math.sin(x * 0.07 + t * 3.0) * 1;
}

function drawWaterFill(ctx, camX, W) {
  const t = _tick / 60;
  for (let i = 0; i < POOLS.length; i++) {
    const pool = POOLS[i];
    const floorY = poolFloor(i);
    const x0 = Math.max(pool.x0, camX - 30);
    const x1 = Math.min(pool.x1, camX + W + 30);
    if (x1 <= x0) continue;
    ctx.beginPath();
    ctx.moveTo(x0, floorY);
    for (let x = x0; x <= x1; x += 4) {
      ctx.lineTo(x, pool.surf + rippleY(x, t));
    }
    ctx.lineTo(x1, floorY);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pool.surf - 10, 0, floorY);
    grad.addColorStop(0, "rgba(30,144,255,0.26)");
    grad.addColorStop(0.35, "rgba(20,100,200,0.33)");
    grad.addColorStop(1, "rgba(10,50,120,0.42)");
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// Surface lines drawn AFTER the bodies, so anything under the waterline
// visibly reads as submerged.
function drawWaterSurface(ctx, camX, W) {
  const t = _tick / 60;
  ctx.save();
  for (const pool of POOLS) {
    const x0 = Math.max(pool.x0, camX - 30);
    const x1 = Math.min(pool.x1, camX + W + 30);
    if (x1 <= x0) continue;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 3) {
      const wy = pool.surf + rippleY(x, t);
      if (x === x0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.strokeStyle = "rgba(100,200,255,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 3) {
      const wy = pool.surf + rippleY(x + 40, t * 0.8) + 4;
      if (x === x0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.strokeStyle = "rgba(150,220,255,0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Shoal marker: a standing wave over each hidden rock. A ripple crest
  // that rises and falls in place reads as "shallow water, hazard here"
  // without the bubble-blob look of scattered dots.
  const tt = _tick / 60;
  for (const rock of _rockFoam) {
    const surf = surfaceAt(rock.x);
    if (surf === null) continue;
    const span = rock.r * 1.3;
    ctx.beginPath();
    for (let d = -span; d <= span; d += 3) {
      const bx = rock.x + d;
      const hump = Math.cos((d / span) * (Math.PI / 2)) ** 2;
      const by = surf + rippleY(bx, tt) - hump * (5 + Math.sin(tt * 3 + rock.x) * 1.5);
      if (d === -span) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.strokeStyle = "rgba(190,230,255,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

// Animated sheet down the spillway face + boil at the base.
function drawWaterfall(ctx) {
  const t = _tick / 60;
  ctx.save();
  for (let i = 0; i < WEIRS.length; i++) {
    const w = WEIRS[i];
    const upSurf = POOL_SURF[i];
    const loSurf = POOL_SURF[i + 1];
    const drop = w.footY - w.top;
    // The falling sheet: over the lip, down the face, into the pool.
    ctx.beginPath();
    ctx.moveTo(w.x0, upSurf - 2);
    ctx.lineTo(w.x1, w.top - 3);
    ctx.lineTo(w.footX + 6, w.footY);
    ctx.lineTo(w.footX - 46, w.footY);
    ctx.closePath();
    ctx.fillStyle = "rgba(120,190,255,0.30)";
    ctx.fill();
    // Streaks sliding along the face — more of them on a taller fall, and
    // they run faster the further the water drops.
    const streaks = Math.max(4, Math.round(drop / 26));
    ctx.strokeStyle = "rgba(200,235,255,0.5)";
    ctx.lineWidth = 2;
    for (let k = 0; k < streaks; k++) {
      const u = ((t * (0.7 + drop / 400) + k / streaks) % 1);
      const x0 = w.x1 + (w.footX - 24 - w.x1) * u;
      const y0 = w.top + (w.footY - w.top) * u;
      ctx.beginPath();
      ctx.moveTo(x0 - 8, y0 - 6);
      ctx.lineTo(x0 + 4, y0 + 4);
      ctx.stroke();
    }
    // Churn where the sheet lands — short choppy strokes, not blobs. A
    // bigger drop throws its spray wider.
    const churn = Math.max(5, Math.round(drop / 22));
    ctx.strokeStyle = "rgba(220,240,255,0.45)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let k = 0; k < churn; k++) {
      const bx = w.footX - 30 + k * 14;
      const by = loSurf - 3 + Math.sin(t * 7 + k * 2.7) * 3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + 9, by + Math.sin(t * 5 + k * 1.9) * 3);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }
  ctx.restore();
}

// Capture ring + flag on the delivery dock.
function drawDock(ctx) {
  const pulse = 1 + 0.08 * Math.sin(_tick * 0.08);
  const won = _phase === "won";

  ctx.strokeStyle = won ? "rgba(63,185,80,0.5)" : "rgba(88,166,255,0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(GOAL.x, GOAL.y, GOAL_RANGE * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pole + waving pennant on the dock edge.
  const px = DOCK_X0 + 26;
  ctx.strokeStyle = "#8b949e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px, DOCK_TOP);
  ctx.lineTo(px, DOCK_TOP - 58);
  ctx.stroke();
  const wave = Math.sin(_tick * 0.12) * 3;
  ctx.fillStyle = won ? "#3fb950" : "#f85149";
  ctx.beginPath();
  ctx.moveTo(px, DOCK_TOP - 58);
  ctx.lineTo(px + 32, DOCK_TOP - 50 + wave);
  ctx.lineTo(px, DOCK_TOP - 42);
  ctx.closePath();
  ctx.fill();
}

// Crane over the loading bay — gantry, cable and hook (or the reason the
// hook is empty). Marks where the passenger will drop.
function drawCrane(ctx) {
  const topY = 124;                  // gantry beam, above the loading bay
  ctx.strokeStyle = "#6e7681";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(DROP_X - 70, topY);
  ctx.lineTo(DROP_X + 70, topY);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(DROP_X - 70, topY);
  ctx.lineTo(DROP_X - 70, topY - 14);
  ctx.moveTo(DROP_X + 70, topY);
  ctx.lineTo(DROP_X + 70, topY - 14);
  ctx.stroke();

  // Live cable while the winch lowers the passenger onto the raft.
  if (_winch && _dude) {
    const t = _dude.torso.body;
    const hx = t.position.x + Math.sin(t.rotation) * (TORSO_H / 2);
    const hy = t.position.y - Math.cos(t.rotation) * (TORSO_H / 2);
    ctx.strokeStyle = "rgba(139,148,158,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(DROP_X, topY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }

  if (_phase !== "build") return;
  // Cable + ghost passenger while editing, so the drop point reads at a
  // glance.
  ctx.strokeStyle = "rgba(139,148,158,0.8)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(DROP_X, topY);
  ctx.lineTo(DROP_X, ZONE.y0 - 4);
  ctx.stroke();
  ctx.setLineDash([]);
  const gy = ZONE.y0 + 14;           // ghost torso center
  ctx.strokeStyle = "rgba(229,83,75,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(DROP_X, gy - TORSO_H / 2 - HEAD_R - 2, HEAD_R, 0, Math.PI * 2);
  ctx.moveTo(DROP_X, gy - TORSO_H / 2 + 4);
  ctx.lineTo(DROP_X, gy + TORSO_H / 2 - 2);
  ctx.lineTo(DROP_X + LEG_LEN * 2 - 4, gy + TORSO_H / 2 - 2);
  ctx.moveTo(DROP_X, gy - TORSO_H / 2 + 7);
  ctx.lineTo(DROP_X + 2, gy - TORSO_H / 2 + 7 + ARM_LEN * 2 - 4);
  ctx.stroke();
  ctx.fillStyle = "rgba(229,83,75,0.7)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("passenger drops here", DROP_X, ZONE.y0 - 8);
}

function drawBuildZone(ctx) {
  if (_phase !== "build") return;
  ctx.strokeStyle = "rgba(88,166,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 6]);
  ctx.strokeRect(ZONE.x0, ZONE.y0, ZONE.x1 - ZONE.x0, ZONE.y1 - ZONE.y0);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(88,166,255,0.06)";
  ctx.fillRect(ZONE.x0, ZONE.y0, ZONE.x1 - ZONE.x0, ZONE.y1 - ZONE.y0);
  ctx.fillStyle = "rgba(88,166,255,0.6)";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Loading bay", ZONE.x0 + 8, ZONE.y0 + 6);
}

function strainColor(strain) {
  // Gray → red as the rod approaches its breaking point.
  const t = Math.max(0, Math.min(1, strain / BREAK_STRAIN));
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const from = [139, 148, 158], to = [248, 81, 73];
  return `rgb(${lerp(from[0], to[0])},${lerp(from[1], to[1])},${lerp(from[2], to[2])})`;
}

function drawRods(ctx) {
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (const rod of _rods) {
    if (rod.broken) continue;
    const pa = rod.a.body ? rod.a.body.position : rod.a;
    const pb = rod.b.body ? rod.b.body.position : rod.b;
    ctx.strokeStyle = strainColor(rod.strain);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

function drawBarrel(ctx, x, y, rot, solid) {
  if (solid) {
    ctx.fillStyle = "#8a5a2b";
    ctx.beginPath();
    ctx.arc(x, y, BARREL_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#c8a060";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, BARREL_R - 1.5, 0, Math.PI * 2);
  ctx.stroke();
  // Two hoops + a bung line make the roll visible.
  ctx.strokeStyle = "rgba(240,220,180,0.75)";
  ctx.lineWidth = 1.5;
  for (const rr of [BARREL_R - 5, BARREL_R - 10]) {
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(rot) * (BARREL_R - 3), y + Math.sin(rot) * (BARREL_R - 3));
  ctx.stroke();
}

// Mast + cloth above the sail's hull circle. The mast follows the body's
// rotation; the cloth bellies downstream with the live wind (limp when the
// sail is dunked or the raft outruns the gust).
function drawSail(ctx, pos, rot, body) {
  const tx = pos.x - Math.sin(rot) * MAST_H;
  const ty = pos.y - Math.cos(rot) * MAST_H;
  let belly = 8;
  if (body) {
    const dry = 1 - submergence(body, SAIL_R * 2);
    const dv = Math.max(0, windSpeed() - body.velocity.x);
    belly = Math.max(0, Math.min(1, dv / SAIL_DV_CAP)) * dry * 12 + 2;
  }
  const flutter = Math.sin(_tick * 0.25) * 1.5;
  ctx.strokeStyle = "#c8a060";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(
    (tx + pos.x) / 2 + belly + flutter, (ty + pos.y) / 2 - 2,
    pos.x, pos.y - 4,
  );
  ctx.closePath();
  ctx.fillStyle = "rgba(235,235,220,0.85)";
  ctx.fill();
  ctx.strokeStyle = "rgba(180,180,165,0.9)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawParts(ctx, solid) {
  for (const p of _parts) {
    const pos = p.body ? p.body.position : p;
    const rot = p.body ? p.body.rotation : 0;
    if (p.kind === "barrel") {
      drawBarrel(ctx, pos.x, pos.y, rot, solid || !p.body);
    } else if (p.kind === "sail") {
      drawSail(ctx, pos, rot, p.body);
      if (solid || !p.body) {
        ctx.fillStyle = "#58a6ff";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, SAIL_R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#0d1117";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, SAIL_R - 1.5, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      if (solid || !p.body) {
        ctx.fillStyle = "#3fb950";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, NODE_R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#0d1117";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, NODE_R - 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Hover ring — pick target for grab/erase/rod-drag.
  if (_mouse && !_linking && _phase === "build") {
    const p = partAt(_mouse.x, _mouse.y);
    if (p) {
      const pos = p.body ? p.body.position : p;
      const r = partRadius(p) + 5;
      ctx.strokeStyle = _tool === "erase" && _phase === "build"
        ? "rgba(248,81,73,0.7)" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// The passenger's bodies are drawn by the engine's own renderer in every
// mode (Crash Test Hero does the same) — this only paints the face and the
// objective halo on top.
function drawDude(ctx) {
  if (!_dude) return;
  const [torso, head] = _dude.parts;

  const hp = head.body.position;
  ctx.save();
  ctx.translate(hp.x, hp.y);
  ctx.rotate(head.body.rotation);
  ctx.fillStyle = "#c9d1d9";
  for (const ex of [-3, 3]) {
    ctx.beginPath();
    ctx.arc(ex, -1.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Pulsing halo so the objective reads at a glance in every render mode;
  // it flips red while the passenger is going under.
  const p = torso.body.position;
  const sinking = _sinkTimer > 0;
  const pulse = 1 + 0.12 * Math.sin(_tick * (sinking ? 0.3 : 0.1));
  ctx.strokeStyle = sinking ? "rgba(248,81,73,0.9)" : "rgba(219,109,183,0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, (TORSO_H / 2 + 14) * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLinking(ctx) {
  if (!_linking) return;
  const target = partAt(_linking.x, _linking.y, _linking.from);
  const d = dist(_linking.from.x, _linking.from.y, _linking.x, _linking.y);
  const ok = target && !rodBetween(_linking.from, target)
    && dist(_linking.from.x, _linking.from.y, target.x, target.y) >= ROD_MIN
    && dist(_linking.from.x, _linking.from.y, target.x, target.y) <= ROD_MAX;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = ok ? "rgba(63,185,80,0.8)"
    : d > ROD_MAX ? "rgba(248,81,73,0.6)" : "rgba(139,148,158,0.6)";
  ctx.beginPath();
  ctx.moveTo(_linking.from.x, _linking.from.y);
  if (ok) ctx.lineTo(target.x, target.y);
  else ctx.lineTo(_linking.x, _linking.y);
  ctx.stroke();
  ctx.setLineDash([]);
}


function drawFx(ctx) {
  for (const f of _fx) {
    if (f.kind === "snap") {
      const t = 1 - f.life / 18;
      ctx.strokeStyle = `rgba(248,81,73,${(1 - t).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4 + t * 20, 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === "splash") {
      const t = 1 - f.life / 16;
      ctx.strokeStyle = `rgba(150,220,255,${(0.8 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 6 + t * 26, 3 + t * 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === "drop") {
      ctx.fillStyle = `rgba(150,220,255,${(f.life / 26 * 0.9).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Drifting dashes in the sky make the tailwind visible: they scroll at the
// live wind speed, so a gust literally speeds the sky up.
function drawWindStreaks(ctx, camX, W) {
  const wind = windSpeed();
  const span = W + 160;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const lane = 70 + ((i * 53) % 170);
    const drift = _tick * STEP_DT * wind * (0.75 + (i % 3) * 0.12);
    const x = camX - 80 + (((i * 331 + drift) % span) + span) % span;
    const len = 12 + (wind - WIND_BASE + WIND_GUST) * 0.12 + (i % 2) * 6;
    const alpha = 0.05 + ((wind - WIND_BASE) / (2 * WIND_GUST) + 0.5) * 0.1;
    ctx.strokeStyle = `rgba(160,200,235,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x, lane + Math.sin(_tick * 0.02 + i) * 4);
    ctx.lineTo(x + len, lane + Math.sin(_tick * 0.02 + i) * 4);
    ctx.stroke();
  }
}

// River progress strip along the bottom edge of the HUD — the run is three
// screens wide, so this is the player's map. The right end stops short of
// the corner where the demo page overlays its render-mode controls.
function drawProgress(ctx, W) {
  const x0 = 16, x1 = W - 270, y = HUD_H - 6;
  const frac = (x) => Math.max(0, Math.min(1, (x - DROP_X) / (GOAL.x - DROP_X)));
  ctx.strokeStyle = "rgba(139,148,158,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  // A tick per waterfall — taller drops get a taller tick — and the flag
  // tick at the far end.
  ctx.strokeStyle = "rgba(139,148,158,0.8)";
  for (const w of WEIRS) {
    const wx = x0 + (x1 - x0) * frac(w.x0);
    const h = 3 + (w.footY - w.top) / 60;
    ctx.beginPath();
    ctx.moveTo(wx, y - h);
    ctx.lineTo(wx, y + h);
    ctx.stroke();
  }
  ctx.strokeStyle = "#f85149";
  ctx.beginPath();
  ctx.moveTo(x1, y - 4);
  ctx.lineTo(x1, y + 4);
  ctx.stroke();
  if (_dude) {
    ctx.fillStyle = "#db6db7";
    ctx.beginPath();
    ctx.arc(x0 + (x1 - x0) * frac(_dude.torso.body.position.x), y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawButton(ctx, rect, label, active, accent) {
  ctx.fillStyle = active ? "rgba(88,166,255,0.22)" : "rgba(48,54,61,0.7)";
  ctx.strokeStyle = active ? "#58a6ff" : "#30363d";
  if (accent) {
    ctx.fillStyle = "rgba(63,185,80,0.22)";
    ctx.strokeStyle = "#3fb950";
  }
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent ? "#7ee787" : active ? "#c9d1d9" : "#8b949e";
  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 0.5);
}

function drawHUD(ctx, W, H) {
  ctx.fillStyle = "rgba(13,17,23,0.88)";
  ctx.fillRect(0, 0, W, HUD_H);

  if (_phase === "build") {
    for (let i = 0; i < TOOLS.length; i++) {
      const rect = {
        x: TOOL_BTN.x + i * (TOOL_BTN.w + TOOL_BTN.gap),
        y: TOOL_BTN.y, w: TOOL_BTN.w, h: TOOL_BTN.h,
      };
      drawButton(ctx, rect, TOOLS[i].label, _tool === TOOLS[i].id, false);
    }
  } else {
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`Time ${_time.toFixed(1)}s`, 16, HUD_H / 2);
    if (_best !== null) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(`Best ${_best.toFixed(1)}s`, 130, HUD_H / 2);
    }
    drawProgress(ctx, W);
  }

  const running = _phase === "run";
  drawButton(
    ctx, GO_RECT,
    running ? "■ Build (Space)" : "▶ Launch (Space)",
    running, !running,
  );

  // Status line, left-aligned after the tools — the demo page overlays its
  // render-mode controls over the canvas's top-right corner, so that area
  // stays clear of text.
  ctx.fillStyle = "#58a6ff";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const liveRods = _rods.filter((r) => !r.broken).length;
  const statusX = TOOL_BTN.x + TOOLS.length * (TOOL_BTN.w + TOOL_BTN.gap) + 10;
  if (_hint && _phase === "build") {
    ctx.fillStyle = "#d29922";
    ctx.fillText(_hint.text, statusX, HUD_H / 2);
  } else if (_phase === "build") {
    ctx.fillText(
      `Parts ${_parts.length} · Rods ${_rods.length} — build under the hook, drag part-to-part for rods`,
      statusX, HUD_H / 2,
    );
  } else {
    ctx.fillText(
      `Rods ${liveRods} — keep the passenger's head up to the dock`,
      statusX, HUD_H / 2,
    );
  }

  if (_phase !== "won" && _phase !== "wreck") return;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (_phase === "won") {
    ctx.fillStyle = "#7ee787";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillText("Passenger delivered!", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `Time ${_winTime.toFixed(1)}s  ·  Best ${_best.toFixed(1)}s  ·  Rods snapped ${_snapCount}`,
      W / 2, H / 2 + 6,
    );
  } else {
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillText("Passenger lost", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(_wreckReason, W / 2, H / 2 + 6);
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(
    _lockTimer > 0 ? "…" : "Click / tap to keep building · R resets the design",
    W / 2, H / 2 + 32,
  );
}
