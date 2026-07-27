import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  FluidProperties, DistanceJoint, PivotJoint, InteractionFilter,
} from "../nape-js.esm.js";
import { drawBody, drawGrid } from "../renderer.js";

// ---------------------------------------------------------------------------
// Raft Rapids — build-a-raft cargo run down a river.
//
// The buoyancy sibling of Contraption Garage: in the BUILD phase the player
// assembles a raft over the calm loading pool from two part types — buoyant
// barrels and light deck nodes — and connects them with springy rods (drag
// from part to part). Hitting LAUNCH spawns the design as real bodies: they
// splash in, the engine's fluid buoyancy floats the barrels, and the crane
// drops the cargo crate onto whatever is waiting under the hook. The crate
// is DENSER THAN WATER — in the drink it sinks, and sunk cargo loses the
// run — so the raft is the only thing keeping it alive while the current
// carries everything down a three-screen river: a boulder slalom, an
// accelerating headrace, a dam spillway plunge (the classic raft-wrecker)
// and the lower rapids, to the delivery dock. Rods carry live strain and
// snap when overstretched — a rock hit at speed shakes a sloppy frame
// apart, and barrels that float away take their lift with them. Mid-run
// the player can grab any PART with a springy pivot "hand" to steer around
// rocks (the cargo itself can't be grabbed — no carrying it by hand). The
// design data outlives the physics: stopping a run (or wrecking) rebuilds
// the same raft for another round of editing.
//
// Engine features showcased:
//   * Fluid buoyancy — fluidEnabled static water volumes with
//     FluidProperties(density, viscosity); barrels (density 0.28) float,
//     the cargo crate (density 1.8) sinks, and a loaded raft rides low.
//   * River current — manual drag toward a per-region target velocity,
//     scaled by each body's measured submergence fraction, so lift and
//     drift both die the moment a body leaves the water.
//   * Soft DistanceJoint rods (stiff=false + frequency/damping) with live
//     strain measurement, a stress color ramp and break-under-load rules.
//   * InteractionFilter groups — raft parts overlap freely and collide
//     only with the world and the cargo, like the builder genre expects.
//   * Design/simulation split — bodies are (re)spawned from pure design
//     data on every launch, so edit → launch → edit is lossless.
// ---------------------------------------------------------------------------

const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 44;

// ── River geometry ───────────────────────────────────────────────────────
// Two pools at different levels, joined by a dam spillway. The upper pool
// holds the loading bay (build zone + crane) and the boulder slalom; past
// the dam crest the water sheet ends, the raft slides down the spillway
// face and splashes into the lower pool, which runs through one last rock
// to the delivery dock. The camera follows the cargo.
const UP_SURF = 385;                 // upper pool water surface
const LO_SURF = 460;                 // lower pool water surface
const UP_X0 = 20;                    // upper pool left edge
const DAM_X0 = 1500;                 // dam crest left edge — water ends here
const DAM_X1 = 1560;                 // dam crest right edge
const DAM_TOP = 392;                 // crest top, just below UP_SURF —
                                     //   floating bodies wash over it
const SPILL_X1 = 1660;               // spillway foot
const SPILL_Y1 = 472;                // spillway meets the lower pool here
const LO_X1 = 2880;                  // lower pool right edge (dock face)
const BED_Y = 545;                   // riverbed top — cargo grave
const WORLD_W = 2900;

// Delivery dock — the cargo has to reach the capture point floating beside
// the dock face (the dock itself is the downstream backstop).
const DOCK_X0 = 2760;
const DOCK_TOP = 428;
const GOAL = { x: 2708, y: 448 };
const GOAL_RANGE = 60;

// ── Water ────────────────────────────────────────────────────────────────
// Denser than every raft part, lighter than the cargo — that asymmetry IS
// the game. Viscosity gives the engine's own drag; horizontal transport
// comes from the current model below.
const FLUID_DENSITY = 1.6;
const FLUID_VISCOSITY = 2.0;

// Current: per-region target surface velocity (px/s). Bodies are dragged
// toward it in proportion to how deep they sit — see applyCurrent().
const CUR_POOL = 70;                 // upper pool cruise
const CUR_HEADRACE = 150;            // accelerating approach to the dam
const CUR_RAPIDS = 110;              // lower pool rapids
const CUR_DELIVERY = 45;             // calm water beside the dock
const HEADRACE_X = 1300;             // faster current from here to the dam
const DELIVERY_X = 2600;             // calmer current from here to the dock
// Per-second approach rate toward the current at full submergence.
const CURRENT_GAIN = 4.0;
const STEP_DT = 1 / 60;

// ── Cargo ────────────────────────────────────────────────────────────────
// The crane drops the crate at CARGO_X when a run starts — onto the raft
// if one is waiting under the hook, into the water (and to its doom) if
// not. Density 1.8 vs water 1.6: overboard it sinks, slowly enough to
// snatch the raft back under it with the hand.
const CARGO_X = 205;
const CARGO_HALF = 16;               // crate half-extent (32×32)
const CARGO_MAT = () => new Material(0.02, 1.3, 1.6, 1.8, 0.01);
const SINK_DEPTH = 34;               // center this far under the surface…
const SINK_STEPS = 26;               // …for this many steps = sunk
const CARGO_CATCH_R = 90;            // parts this close to the hook catch the drop

// Parts must be placed inside the build zone (their centers). It floats
// over the loading pool; parts splash in and float when the run starts.
const ZONE = { x0: 56, y0: 236, x1: 380, y1: 378 };

// ── Part / rod tuning ────────────────────────────────────────────────────
const BARREL_R = 15;
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
// collide with the world (group 1) and the cargo but never with each
// other, so barrels can sit shoulder-to-shoulder under one deck.
const PART_FILTER_GROUP = 2;

// Barrels: light enough to float high (0.28 vs water 1.6 ≈ 17% draft),
// grippy enough that the cargo doesn't skate off the first bump.
const BARREL_MAT = () => new Material(0.15, 0.9, 1.1, 0.28, 0.02);
const NODE_MAT = () => new Material(0.05, 1.0, 1.2, 0.5, 0.05);

// Steer hand — a soft pivot the player can attach to any part mid-run.
const HAND_FREQ = 8;
const HAND_DAMP = 1.2;
const GRAB_R = 40;

const RESTART_LOCK_STEPS = 30;       // ignore clicks right after an overlay

// ── Toolbar layout (canvas-drawn UI) ─────────────────────────────────────
const TOOLS = [
  { id: "barrel", label: "1 Barrel" },
  { id: "node",   label: "2 Node" },
  { id: "erase",  label: "3 Erase" },
];
const TOOL_BTN = { x: 10, y: 7, w: 92, h: 30, gap: 6 };
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
let _cargo = null;                   // cargo crate body — exists while running
let _sinkTimer = 0;                  // steps the cargo has spent too deep
let _cargoWasDry = true;             // splash edge-detect for the crate
let _tool = "barrel";
let _linking = null;                 // { from: part, x, y } while dragging a rod
let _hand = null;                    // { part, joint } while steering mid-run
let _mouse = null;
let _hint = null;                    // { text, life } transient toolbar message

let _time = 0;                       // seconds elapsed in the current run
let _timeBase = 0;                   // space.elapsedTime when the run started
let _winTime = 0;
let _best = null;                    // best win time (seconds), session-wide
let _lockTimer = 0;
let _fx = [];                        // { kind: "snap"|"splash"|"bubble", x, y, vx, vy, life }
let _snapCount = 0;
let _tick = 0;
let _lastKeyDown = null;

// Camera. The runner follows _camTarget (the cargo during a run, the
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

// Water covers the upper pool up to the dam crest's right edge (so bodies
// keep their lift while washing over the crest), nothing over the spillway
// face, then the lower pool to the dock.
function surfaceAt(x) {
  if (x >= UP_X0 && x <= DAM_X1) return UP_SURF;
  if (x > DAM_X1 && x <= LO_X1) return LO_SURF;
  return null;
}

function currentAt(x) {
  if (x <= DAM_X1) return x >= HEADRACE_X ? CUR_HEADRACE : CUR_POOL;
  if (x <= LO_X1) return x >= DELIVERY_X ? CUR_DELIVERY : CUR_RAPIDS;
  return 0;
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
const ROCK_FLOW_BOOST = 0.9;
const ROCK_FLOW_LIFT = 260;

function shoalFlow(x) {
  let boost = 1, lift = 0;
  for (const rock of _rockFoam) {
    const d = Math.abs(x - rock.x);
    if (d >= ROCK_FLOW_R) continue;
    const k = 1 - d / ROCK_FLOW_R;
    boost += ROCK_FLOW_BOOST * k;
    lift += ROCK_FLOW_LIFT * k;
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
    dv * body.mass * f * CURRENT_GAIN * STEP_DT,
    -lift * body.mass * f * STEP_DT,
  ));
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

function addWater(x0, x1, surf) {
  const w = x1 - x0, h = BED_Y - surf;
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

function spawnTerrain() {
  _rockFoam.length = 0;              // previous load registered its own rocks
  // Riverbed under everything, and banks that seal both ends.
  addStaticBox(WORLD_W / 2, BED_Y + 15, WORLD_W + 40, 30, 5);
  addStaticBox(8, 380, 20, 340, 5);                       // upstream backstop
  addStaticBox((DOCK_X0 + WORLD_W) / 2, (DOCK_TOP + BED_Y) / 2 + 8,
    WORLD_W - DOCK_X0, BED_Y - DOCK_TOP + 16, 5);         // delivery dock

  // Dam: crest just below the upper surface, then a spillway face down to
  // the lower pool. Floating bodies wash over the crest, ground for a
  // moment, and toboggan the face — the drop is the frame test.
  const dam = new Body(BodyType.STATIC);
  dam.shapes.add(new Polygon([
    new Vec2(DAM_X0, DAM_TOP), new Vec2(DAM_X1, DAM_TOP),
    new Vec2(SPILL_X1, SPILL_Y1), new Vec2(SPILL_X1, BED_Y),
    new Vec2(DAM_X0, BED_Y),
  ]));
  try { dam.userData._colorIdx = 5; } catch (_) { /* same */ }
  dam.space = _space;

  // Shoal run in the upper pool, one last tooth in the rapids.
  addRock(740, UP_SURF, 26, 14);
  addRock(1060, UP_SURF, 30, 10);
  addRock(1210, UP_SURF, 22, 12);
  addRock(2200, LO_SURF, 26, 12);

  // Water volumes last, so the fluid shapes sit over the rocks/dam base.
  addWater(UP_X0, DAM_X1, UP_SURF);
  addWater(DAM_X1, LO_X1, LO_SURF);
}

function partFilter() {
  return new InteractionFilter(PART_FILTER_GROUP, ~PART_FILTER_GROUP);
}

function makePartBody(p) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(p.x, p.y));
  const r = p.kind === "barrel" ? BARREL_R : NODE_R;
  const mat = p.kind === "barrel" ? BARREL_MAT() : NODE_MAT();
  body.shapes.add(new Circle(r, undefined, mat, partFilter()));
  try { body.userData._part = true; } catch (_) { /* same */ }
  try { body.userData._colorIdx = p.kind === "barrel" ? 1 : 2; } catch (_) { /* same */ }
  body.space = _space;
  return body;
}

function partRadius(p) {
  return p.kind === "barrel" ? BARREL_R : NODE_R;
}

// The crane drops the crate onto whatever waits under the hook: the spawn
// height hugs the tallest part near CARGO_X so the drop is a gentle set-down
// on a good raft, and a plunge into the pool on no raft at all.
function spawnCargo() {
  let top = UP_SURF - 4;
  for (const p of _parts) {
    if (!p.body) continue;
    if (Math.abs(p.body.position.x - CARGO_X) > CARGO_CATCH_R) continue;
    top = Math.min(top, p.body.position.y - partRadius(p));
  }
  _cargo = new Body(BodyType.DYNAMIC, new Vec2(CARGO_X, top - CARGO_HALF - 6));
  // Default filter (group 1): collides with the world AND with parts —
  // parts mask out only their own group 2.
  _cargo.shapes.add(new Polygon(Polygon.box(CARGO_HALF * 2, CARGO_HALF * 2), CARGO_MAT()));
  try { _cargo.userData._cargo = true; } catch (_) { /* same */ }
  try { _cargo.userData._colorIdx = 3; } catch (_) { /* same */ }
  _cargo.space = _space;
  _sinkTimer = 0;
  _cargoWasDry = true;
}

function despawnCargo() {
  if (_cargo && _cargo.space) _cargo.space = null;
  _cargo = null;
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

// The starter design: three barrels and a ridge node under the hook —
// enough to catch the crate and float it (decks awash) through the shoal
// run, and then lose it on the spillway plunge: nothing walls the crate
// in, so it pitches over the bow when the raft noses into the lower pool.
// The lesson is the loop: more barrels for freeboard, node rails for a cage.
function seedStarter() {
  const b1 = addPartDesign("barrel", 155, 360);
  const b2 = addPartDesign("barrel", 205, 360);
  const b3 = addPartDesign("barrel", 255, 360);
  const n1 = addPartDesign("node", 155, 322);
  const n2 = addPartDesign("node", 255, 322);
  addRodDesign(b1, b2);
  addRodDesign(b2, b3);
  addRodDesign(b1, n1);
  addRodDesign(b2, n1);
  addRodDesign(b2, n2);
  addRodDesign(b3, n2);
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
  spawnCargo();

  // Clock off the space's own elapsed physics time — demo.step() runs once
  // per FRAME while the space may substep several times per frame, so a
  // frame counter would drift on slow displays.
  _timeBase = _space.elapsedTime;
  _time = 0;
  _phase = "run";
  updateCamTarget();                 // don't let the camera chase last run's spot
}

function releaseHand() {
  if (!_hand) return;
  if (_hand.joint.space) _hand.joint.space = null;
  _hand = null;
}

function despawnRun() {
  releaseHand();
  despawnCargo();
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
    applyCurrent(p.body, partRadius(p));
    trackSplash(p.body, partRadius(p), p);
  }
}

// Camera chases the crate — it IS the run. Won/wreck overlays hold the
// last view because the target simply stops updating.
function updateCamTarget() {
  if (_cargo) {
    _camTarget = { x: _cargo.position.x, y: _cargo.position.y };
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

// Win when the CARGO floats into the dock's capture ring; lose when it
// spends SINK_STEPS deeper than SINK_DEPTH under the local surface (or
// meets the riverbed). The raft's own fate never scores.
function checkCargo() {
  if (!_cargo) return;
  applyCurrent(_cargo, CARGO_HALF);
  trackSplash(_cargo, CARGO_HALF, { wasDry: _cargoWasDry });
  {
    const surf = surfaceAt(_cargo.position.x);
    _cargoWasDry = surf === null || _cargo.position.y + CARGO_HALF < surf;
  }

  const surf = surfaceAt(_cargo.position.x);
  const depth = surf === null ? 0 : _cargo.position.y - surf;
  if (depth > SINK_DEPTH || _cargo.position.y > BED_Y - CARGO_HALF - 2) {
    _sinkTimer++;
    if ((_tick & 3) === 0) {
      _fx.push({
        kind: "bubble", x: _cargo.position.x + (Math.sin(_tick * 1.7) * 10),
        y: _cargo.position.y - CARGO_HALF, vx: 0, vy: -55, life: 40,
      });
    }
    if (_sinkTimer >= SINK_STEPS || _cargo.position.y > BED_Y - CARGO_HALF - 2) {
      releaseHand();
      _wreckReason = "The cargo sank.";
      _phase = "wreck";
      _lockTimer = RESTART_LOCK_STEPS;
    }
    return;
  }
  _sinkTimer = Math.max(0, _sinkTimer - 1);

  if (dist(_cargo.position.x, _cargo.position.y, GOAL.x, GOAL.y) <= GOAL_RANGE) {
    _winTime = _time;
    if (_best === null || _winTime < _best) _best = _winTime;
    releaseHand();
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
  tags: ["Fluid", "Buoyancy", "DistanceJoint", "Building", "Drag", "Gameplay"],
  featured: false,
  desc:
    "Build-a-raft cargo run on real <b>fluid buoyancy</b>. In the loading bay, <b>click</b> to " +
    "place floating barrels and deck nodes, and <b>drag part-to-part</b> to connect them with " +
    "springy rods. Hit <b>Launch</b>: the raft splashes in, the crane drops a crate that is " +
    "<b>denser than water</b> — overboard it sinks and the run is lost — and the current " +
    "carries everything down a three-screen river: a boulder slalom, an accelerating headrace, " +
    "a <b>dam spillway plunge</b> and the lower rapids, to the delivery dock. Rods are soft " +
    "<b>DistanceJoint</b>s with live strain that snap on hard rock hits, drift and lift both " +
    "scale with each body's measured submergence, and mid-run you can <b>grab</b> raft parts " +
    "with a springy pivot hand to steer (the crate itself can't be grabbed). <b>Space</b> " +
    "launches, <b>1–3</b> pick tools, <b>R</b> resets.",
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
    _hand = null;
    _mouse = null;
    _hint = null;
    _phase = "build";
    _wreckReason = "";
    _cargo = null;                   // previous load's body died with its space
    _sinkTimer = 0;
    _cargoWasDry = true;
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

    // Follow the crate while running, rest on the loading bay otherwise.
    // Vertical bounds equal the viewport height, so the camera only scrolls
    // horizontally and the screen-anchored HUD math stays simple.
    this.camera = {
      follow: () => (_phase === "build" ? CAM_HOME : _camTarget),
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: SCREEN_H },
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
      } else if (f.kind === "bubble") {
        f.y += f.vy * STEP_DT;
        f.x += Math.sin(f.life * 0.4) * 0.6;
      }
      if (--f.life <= 0) _fx.splice(i, 1);
    }
    if (_phase !== "run") return;

    _time = Math.max(0, _space.elapsedTime - _timeBase);
    updateRods();
    updateParts();
    checkCargo();
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

    if (_phase === "run") {
      // Mid-run steering: soft pivot hand on the nearest live part. The
      // cargo is deliberately not grabbable — no carrying it by hand.
      let part = null, bestD = GRAB_R;
      for (const p of _parts) {
        if (!p.body) continue;
        const d = dist(x, y, p.body.position.x, p.body.position.y);
        if (d < bestD) { bestD = d; part = p; }
      }
      if (!part) return;
      const joint = new PivotJoint(_space.world, part.body, new Vec2(x, y), new Vec2(0, 0));
      joint.stiff = false;
      joint.frequency = HAND_FREQ;
      joint.damping = HAND_DAMP;
      joint.space = _space;
      _hand = { part, joint };
      return;
    }

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
    const placed = addPartDesign(_tool === "node" ? "node" : "barrel", x, y);
    // Chain into a rod drag so place-and-connect is one gesture.
    _linking = { from: placed, x, y };
  },

  drag(x, y) {
    _mouse = { x, y };
    if (_hand) {
      _hand.joint.anchor1 = new Vec2(x, y);
      return;
    }
    if (_linking) {
      _linking.x = x;
      _linking.y = y;
    }
  },

  release() {
    if (_hand) {
      releaseHand();
      return;
    }
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
      parts: _parts, rods: _rods, cargo: _cargo, snaps: _snapCount,
      sinkTimer: _sinkTimer, wreckReason: _wreckReason,
      startRun, backToBuild, resetGame, addPartDesign, addRodDesign,
      removePartDesign,
      surfaceAt, currentAt, submergence,
      goRect: GO_RECT, goal: GOAL, cargoX: CARGO_X,
    };
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);
    drawWaterFill(ctx, camX, W);
    drawWaterfall(ctx);
    for (const body of space.bodies) {
      if (body.userData._water || body.userData._part || body.userData._cargo) continue;
      drawBody(ctx, body, showOutlines);
    }
    drawDock(ctx);
    drawRods(ctx);
    drawParts(ctx, true);
    drawCrate(ctx, true);
    drawWaterSurface(ctx, camX, W);
    drawCrane(ctx);
    drawBuildZone(ctx);
    drawLinking(ctx);
    drawHand(ctx);
    drawFx(ctx);
    ctx.restore();
    drawHUD(ctx, W, H);
  },

  // Three.js / PixiJS render bodies natively (camera applied by the
  // adapter); everything game-specific is painted on the shared overlay
  // canvas (parts/crate get decoration-only passes while bodies exist, full
  // ghosts while editing). World-space passes get the camera translate,
  // the HUD stays screen-anchored. Water volumes are _hidden and painted
  // here instead.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawWaterFill(ctx, camX, W);
    drawWaterfall(ctx);
    drawDock(ctx);
    drawRods(ctx);
    drawParts(ctx, false);
    drawCrate(ctx, false);
    drawWaterSurface(ctx, camX, W);
    drawCrane(ctx);
    drawBuildZone(ctx);
    drawLinking(ctx);
    drawHand(ctx);
    drawFx(ctx);
    ctx.restore();
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Rendering — water, dam, crane, parts, crate, toolbar HUD
// ---------------------------------------------------------------------------

// Purely cosmetic ripple — deliberately local (not the shared
// water-renderer helper) so generated CodePen/StackBlitz previews stay
// self-contained.
function rippleY(x, t) {
  return Math.sin(x * 0.02 + t * 2.0) * 3
       + Math.sin(x * 0.035 - t * 1.5) * 2
       + Math.sin(x * 0.07 + t * 3.0) * 1;
}

// The two pools, world-space, clipped to the visible span for cheap draws.
const POOLS = [
  { x0: UP_X0, x1: DAM_X1, surf: UP_SURF },
  { x0: DAM_X1, x1: LO_X1, surf: LO_SURF },
];

function drawWaterFill(ctx, camX, W) {
  const t = _tick / 60;
  for (const pool of POOLS) {
    const x0 = Math.max(pool.x0, camX - 30);
    const x1 = Math.min(pool.x1, camX + W + 30);
    if (x1 <= x0) continue;
    ctx.beginPath();
    ctx.moveTo(x0, BED_Y);
    for (let x = x0; x <= x1; x += 4) {
      ctx.lineTo(x, pool.surf + rippleY(x, t));
    }
    ctx.lineTo(x1, BED_Y);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pool.surf - 10, 0, BED_Y);
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
  // Foam boils over the shoal rocks — the hazards read on the surface even
  // though the stone itself hides under it.
  const tt = _tick / 60;
  for (const rock of _rockFoam) {
    const surf = surfaceAt(rock.x);
    if (surf === null) continue;
    for (let i = -1; i <= 1; i++) {
      const bx = rock.x + i * (rock.r * 0.5) + Math.sin(tt * 4 + i * 2.1 + rock.x) * 3;
      const by = surf + rippleY(bx, tt) - 1 + Math.sin(tt * 6 + i * 1.3) * 1.5;
      ctx.fillStyle = "rgba(220,240,255,0.4)";
      ctx.beginPath();
      ctx.arc(bx, by, 3.5 - Math.abs(i), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Animated sheet down the spillway face + boil at the base.
function drawWaterfall(ctx) {
  const t = _tick / 60;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(DAM_X0, UP_SURF - 2);
  ctx.lineTo(DAM_X1, DAM_TOP - 3);
  ctx.lineTo(SPILL_X1 + 6, SPILL_Y1);
  ctx.lineTo(SPILL_X1 - 46, SPILL_Y1);
  ctx.closePath();
  ctx.fillStyle = "rgba(120,190,255,0.30)";
  ctx.fill();
  // Streaks sliding along the face.
  ctx.strokeStyle = "rgba(200,235,255,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const u = ((t * 0.9 + i * 0.25) % 1);
    const x0 = DAM_X1 + (SPILL_X1 - 24 - DAM_X1) * u;
    const y0 = DAM_TOP + (SPILL_Y1 - DAM_TOP) * u;
    ctx.beginPath();
    ctx.moveTo(x0 - 8, y0 - 6);
    ctx.lineTo(x0 + 4, y0 + 4);
    ctx.stroke();
  }
  // Foam boil where the sheet lands.
  for (let i = 0; i < 5; i++) {
    const bx = SPILL_X1 - 26 + i * 14 + Math.sin(t * 5 + i * 1.9) * 4;
    const by = LO_SURF - 2 + Math.sin(t * 7 + i * 2.7) * 3;
    ctx.fillStyle = "rgba(220,240,255,0.35)";
    ctx.beginPath();
    ctx.arc(bx, by, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
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
// hook is empty). Marks where the crate will drop.
function drawCrane(ctx) {
  const topY = 178;
  ctx.strokeStyle = "#6e7681";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(CARGO_X - 70, topY);
  ctx.lineTo(CARGO_X + 70, topY);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CARGO_X - 70, topY);
  ctx.lineTo(CARGO_X - 70, topY - 14);
  ctx.moveTo(CARGO_X + 70, topY);
  ctx.lineTo(CARGO_X + 70, topY - 14);
  ctx.stroke();

  if (_phase !== "build") return;
  // Cable + ghost crate while editing, so the drop point reads at a glance.
  ctx.strokeStyle = "rgba(139,148,158,0.8)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(CARGO_X, topY);
  ctx.lineTo(CARGO_X, ZONE.y0 - 4);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(229,83,75,0.65)";
  ctx.lineWidth = 2;
  ctx.strokeRect(CARGO_X - CARGO_HALF, ZONE.y0 - 2, CARGO_HALF * 2, CARGO_HALF * 2);
  ctx.fillStyle = "rgba(229,83,75,0.7)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("cargo drops here", CARGO_X, ZONE.y0 - 8);
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

function drawParts(ctx, solid) {
  for (const p of _parts) {
    const pos = p.body ? p.body.position : p;
    const rot = p.body ? p.body.rotation : 0;
    if (p.kind === "barrel") {
      drawBarrel(ctx, pos.x, pos.y, rot, solid || !p.body);
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
  if (_mouse && !_linking && !_hand && (_phase === "build" || _phase === "run")) {
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

// The crate: solid pass for the 2D renderer, decoration + halo only when a
// native renderer already draws the body.
function drawCrate(ctx, solid) {
  if (!_cargo) return;
  const p = _cargo.position;
  const rot = _cargo.rotation;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rot);
  if (solid) {
    ctx.fillStyle = "#a03c36";
    ctx.fillRect(-CARGO_HALF, -CARGO_HALF, CARGO_HALF * 2, CARGO_HALF * 2);
  }
  ctx.strokeStyle = "#e5534b";
  ctx.lineWidth = 2;
  ctx.strokeRect(-CARGO_HALF + 1, -CARGO_HALF + 1, CARGO_HALF * 2 - 2, CARGO_HALF * 2 - 2);
  ctx.beginPath();
  ctx.moveTo(-CARGO_HALF + 3, -CARGO_HALF + 3);
  ctx.lineTo(CARGO_HALF - 3, CARGO_HALF - 3);
  ctx.moveTo(CARGO_HALF - 3, -CARGO_HALF + 3);
  ctx.lineTo(-CARGO_HALF + 3, CARGO_HALF - 3);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Pulsing halo so the objective reads at a glance in every render mode;
  // it flips red while the crate is going under.
  const sinking = _sinkTimer > 0;
  const pulse = 1 + 0.12 * Math.sin(_tick * (sinking ? 0.3 : 0.1));
  ctx.strokeStyle = sinking ? "rgba(248,81,73,0.9)" : "rgba(219,109,183,0.8)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, (CARGO_HALF + 9) * pulse, 0, Math.PI * 2);
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

function drawHand(ctx) {
  if (!_hand || !_hand.part.body) return;
  const p = _hand.part.body.position;
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
  ctx.arc(p.x, p.y, partRadius(_hand.part) + 4, 0, Math.PI * 2);
  ctx.stroke();
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
    } else if (f.kind === "bubble") {
      ctx.strokeStyle = `rgba(180,225,255,${(f.life / 40 * 0.8).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// River progress strip along the bottom edge of the HUD — the run is three
// screens wide, so this is the player's map. The right end stops short of
// the corner where the demo page overlays its render-mode controls.
function drawProgress(ctx, W) {
  const x0 = 16, x1 = W - 270, y = HUD_H - 6;
  const frac = (x) => Math.max(0, Math.min(1, (x - CARGO_X) / (GOAL.x - CARGO_X)));
  ctx.strokeStyle = "rgba(139,148,158,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  // Dam tick mid-strip, flag tick at the far end.
  const damX = x0 + (x1 - x0) * frac(DAM_X0);
  ctx.strokeStyle = "rgba(139,148,158,0.8)";
  ctx.beginPath();
  ctx.moveTo(damX, y - 4);
  ctx.lineTo(damX, y + 4);
  ctx.stroke();
  ctx.strokeStyle = "#f85149";
  ctx.beginPath();
  ctx.moveTo(x1, y - 4);
  ctx.lineTo(x1, y + 4);
  ctx.stroke();
  if (_cargo) {
    ctx.fillStyle = "#db6db7";
    ctx.beginPath();
    ctx.arc(x0 + (x1 - x0) * frac(_cargo.position.x), y, 3.5, 0, Math.PI * 2);
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
      `Rods ${liveRods} — keep the crate dry to the dock`,
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
    ctx.fillText("Cargo delivered!", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `Time ${_winTime.toFixed(1)}s  ·  Best ${_best.toFixed(1)}s  ·  Rods snapped ${_snapCount}`,
      W / 2, H / 2 + 6,
    );
  } else {
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillText("Cargo lost", W / 2, H / 2 - 24);
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
