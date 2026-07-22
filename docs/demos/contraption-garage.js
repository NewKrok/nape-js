import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  DistanceJoint, MotorJoint, PivotJoint, InteractionFilter,
} from "../nape-js.esm.js";
import { drawBody, drawGrid } from "../renderer.js";

// ---------------------------------------------------------------------------
// Contraption Garage — build-a-vehicle physics mini-game.
//
// Fantastic-Contraption-style loop: in the BUILD phase the player assembles a
// machine inside the build zone from three part types — powered wheels
// (drive right / drive left) and small joint nodes — and connects them with
// springy rods (drag from part to part). Hitting TEST spawns the design as
// real bodies: every rod becomes a soft DistanceJoint, and every wheel gets a
// MotorJoint against its frame, so the whole machine drives itself off the
// platform. The course is a pit with a sloped far wall, a middle shelf and a
// long ramp up to the goal flag; reach the flag with any surviving part to
// win (fastest time is kept as the session best). Rods carry live strain and
// snap when overstretched — a bad frame shakes itself apart halfway up the
// ramp, and parts that lose the machine tumble into the pit. During a test
// the player can grab any part with a springy pivot "hand" and shove the
// struggling contraption. The design data outlives the physics: stopping a
// test (or wrecking) rebuilds the same machine for another round of editing.
//
// Engine features showcased:
//   * MotorJoint as wheel drive — torque applied between wheel and frame,
//     with maxForce keeping the launch progressive.
//   * Soft DistanceJoint rods (stiff=false + frequency/damping) with live
//     strain measurement, a stress color ramp and break-under-load rules.
//   * InteractionFilter groups — contraption parts overlap freely and only
//     collide with the terrain, exactly like classic contraption builders.
//   * Design/simulation split — bodies are (re)spawned from pure design data
//     on every test, so edit → test → edit is lossless.
// ---------------------------------------------------------------------------

const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 44;

// ── Course geometry ──────────────────────────────────────────────────────
// Surface polyline, left to right: start platform, a pit with a climbable
// sloped far wall, a middle shelf, a long ramp, and the goal plateau. Each
// non-vertical span becomes one static quad down to the skirt; vertical
// drops are covered by the neighbouring quads' edges.
const SURFACE = [
  [-20, 420], [300, 420],            // start platform (build zone lives here)
  [300, 488], [500, 488],            // pit floor
  [580, 420],                        // sloped exit — steep but drivable
  [640, 420],                        // middle shelf
  [750, 356],                        // ramp up
  [920, 356],                        // goal plateau
];
const SKIRT_Y = 560;
const FALL_OFF_Y = SCREEN_H + 60;    // below this a loose part is lost

const GOAL = { x: 830, y: 330 };     // capture point beside the flag pole
const GOAL_RANGE = 48;
const FLAG_BASE_Y = 356;

// Parts must be placed inside the build zone (their centers). The zone
// floats over the start platform; wheels dropped at the bottom edge rest
// straight onto the ground when the test starts.
const ZONE = { x0: 36, y0: 96, x1: 284, y1: 402 };

// ── Part / rod tuning ────────────────────────────────────────────────────
const WHEEL_R = 20;
const NODE_R = 7;
const PART_CAP = 30;                 // sanity cap — plenty for this course
const MIN_PART_GAP = 24;             // min center distance between placed parts
const ROD_MIN = 26;                  // rods shorter than this won't connect
const ROD_MAX = 170;                 // ... longer either
const PICK_R = 18;                   // min pick radius around small parts

// Rods are soft distance joints: stiff enough to act as a frame, springy
// enough that an overloaded machine visibly flexes before it lets go.
const ROD_FREQ = 14;
const ROD_DAMP = 1.1;

// Strain is |current - rest| / rest, recomputed every step. One violent
// shock snaps a rod instantly; sustained overload (a cantilevered wheel
// dragging its frame) accumulates and tears within a second. The counter
// decays so brief bounces are forgiven.
const BREAK_INSTANT = 0.5;
const BREAK_STRAIN = 0.25;
const BREAK_SUSTAIN = 50;

// Wheel drive. Positive design drive means "travel right" (positive angular
// velocity is clockwise in screen coords, so the wheel rolls +x). maxForce
// caps torque so a fresh launch spins up instead of looping the frame over
// backwards.
const MOTOR_RATE = 9;                // target angular rate (rad/s) → ~180 px/s
const MOTOR_FORCE = 2e6;

// MotorJoint drives the RELATIVE angular rate of wheel vs frame, and rods
// (distance joints) carry no rotation — so at natural inertia the reaction
// torque just spins the tiny node backwards while the wheel stands still.
// Bumping node angular inertia stands in for the torsional stiffness of a
// real frame: the motor now has something to push against. (Wheels keep
// their natural inertia; headless tuning: at the natural ~2 the node absorbs
// the whole drive and the wheel never turns, at 12000 the starter buggy
// clears pit + ramp in under 5s while the node's reaction spin stays mild.)
const NODE_INERTIA = 12000;

// Contraption parts share collision group 2 and exclude it from their mask:
// they collide with the terrain (group 1) but never with each other, so
// wheels can overlap the frame exactly like the genre expects.
const PART_FILTER_GROUP = 2;

const WHEEL_ELASTICITY = 0.05;
const WHEEL_FRICTION = 1.7;
const WHEEL_STATIC_FRICTION = 2.0;
const WHEEL_DENSITY = 1.0;
const WHEEL_ROLL_FRICTION = 0.01;    // near-zero — the motor should not fight it

const NODE_DENSITY = 0.6;            // light frame joints → gentler loads

// Shove hand — a soft pivot the player can attach to any part mid-test.
const HAND_FREQ = 8;
const HAND_DAMP = 1.2;
const GRAB_R = 40;

const RESTART_LOCK_STEPS = 30;       // ignore clicks right after an overlay

// ── Toolbar layout (canvas-drawn UI) ─────────────────────────────────────
const TOOLS = [
  { id: "wheel",    label: "1 Wheel →" },
  { id: "wheelccw", label: "2 Wheel ←" },
  { id: "node",     label: "3 Node" },
  { id: "erase",    label: "4 Erase" },
];
const TOOL_BTN = { x: 10, y: 7, w: 92, h: 30, gap: 6 };
// The Test/Build toggle lives at the bottom-right — the demo page overlays
// its own render-mode controls over the canvas's top-right corner.
const GO_RECT = { x: SCREEN_W - 148, y: SCREEN_H - 42, w: 138, h: 32 };

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
// Design data — the source of truth. Bodies exist only while testing.
let _parts = [];                     // { kind, drive, x, y, body, dead }
let _rods = [];                      // { a, b, rest, joint, strain, over, broken }
let _motors = [];                    // { wheel, partner, joint }

let _phase = "build";                // "build" | "run" | "won" | "wreck"
let _tool = "wheel";
let _linking = null;                 // { from: part, x, y } while dragging a rod
let _hand = null;                    // { part, joint } while shoving mid-test
let _mouse = null;
let _hint = null;                    // { text, life } transient toolbar message

let _time = 0;                       // seconds elapsed in the current test
let _timeBase = 0;                   // space.elapsedTime when the test started
let _winTime = 0;
let _best = null;                    // best win time (seconds), session-wide
let _lockTimer = 0;
let _fx = [];                        // snap rings — { x, y, life }
let _snapCount = 0;
let _tick = 0;
let _lastKeyDown = null;

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

function spawnTerrain() {
  for (let i = 0; i < SURFACE.length - 1; i++) {
    const [x0, y0] = SURFACE[i];
    const [x1, y1] = SURFACE[i + 1];
    if (x1 <= x0) continue;          // vertical drop — neighbours cover the wall
    const seg = new Body(BodyType.STATIC);
    seg.shapes.add(new Polygon([
      new Vec2(x0, y0), new Vec2(x1, y1),
      new Vec2(x1, SKIRT_Y), new Vec2(x0, SKIRT_Y),
    ]));
    try { seg.userData._colorIdx = 5; } catch (_) { /* userData may be frozen */ }
    seg.space = _space;
  }
}

function partFilter() {
  return new InteractionFilter(PART_FILTER_GROUP, ~PART_FILTER_GROUP);
}

function makePartBody(p) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(p.x, p.y));
  const mat = p.kind === "wheel"
    ? new Material(WHEEL_ELASTICITY, WHEEL_FRICTION, WHEEL_STATIC_FRICTION,
        WHEEL_DENSITY, WHEEL_ROLL_FRICTION)
    : new Material(0.05, 1.0, 1.2, NODE_DENSITY, 0.05);
  body.shapes.add(new Circle(p.kind === "wheel" ? WHEEL_R : NODE_R, undefined, mat, partFilter()));
  try { body.userData._part = true; } catch (_) { /* same */ }
  try { body.userData._colorIdx = p.kind === "wheel" ? 4 : 2; } catch (_) { /* same */ }
  body.space = _space;
  if (p.kind === "node") body.inertia = NODE_INERTIA;
  return body;
}

// ---------------------------------------------------------------------------
// Design editing (build phase — pure data, no bodies)
// ---------------------------------------------------------------------------

function addPartDesign(kind, drive, x, y) {
  const part = { kind, drive, x, y, body: null, dead: false };
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
    if (p === except || p.dead) continue;
    const pos = p.body ? p.body.position : p;
    const r = Math.max((p.kind === "wheel" ? WHEEL_R : NODE_R) + 8, PICK_R);
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

// The starter design: a simple two-wheel buggy with a braced roof node —
// the preview thumbnail sells the idea, and pressing TEST right away gives
// an instant (if bumpy) win to imitate and improve on.
function seedStarter() {
  const w1 = addPartDesign("wheel", 1, 118, 398);
  const w2 = addPartDesign("wheel", 1, 224, 398);
  const n1 = addPartDesign("node", 0, 171, 330);
  addRodDesign(w1, w2);
  addRodDesign(w1, n1);
  addRodDesign(w2, n1);
}

// ---------------------------------------------------------------------------
// Test-run lifecycle — design data ↔ live bodies
// ---------------------------------------------------------------------------

function neighborsOf(part) {
  const out = [];
  for (const r of _rods) {
    if (r.broken) continue;
    if (r.a === part && !r.b.dead) out.push(r.b);
    else if (r.b === part && !r.a.dead) out.push(r.a);
  }
  return out;
}

function makeMotor(wheel, partner) {
  const joint = new MotorJoint(
    partner.body, wheel.body, wheel.drive * MOTOR_RATE,
  );
  joint.maxForce = MOTOR_FORCE;
  joint.space = _space;
  _motors.push({ wheel, partner, joint });
}

// A wheel drives against its frame. Prefer a node partner: rods pin to
// part centers, so a wheel↔wheel pair has no rotational bracing and the
// reaction torque just spins the partner uselessly.
function pickMotorPartner(wheel) {
  const around = neighborsOf(wheel);
  return around.find((p) => p.kind === "node") ?? around[0] ?? null;
}

function startRun() {
  if (_phase !== "build" || _parts.length === 0) return;

  for (const p of _parts) {
    p.dead = false;
    p.body = makePartBody(p);
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
  for (const p of _parts) {
    if (p.kind !== "wheel" || p.drive === 0) continue;
    const partner = pickMotorPartner(p);
    if (partner) makeMotor(p, partner);
  }

  // Clock off the space's own elapsed physics time — demo.step() runs once
  // per FRAME while the space may substep several times per frame, so a
  // frame counter would drift on slow displays.
  _timeBase = _space.elapsedTime;
  _time = 0;
  _phase = "run";
}

function releaseHand() {
  if (!_hand) return;
  if (_hand.joint.space) _hand.joint.space = null;
  _hand = null;
}

function despawnRun() {
  releaseHand();
  for (const m of _motors) if (m.joint.space) m.joint.space = null;
  _motors = [];
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
    p.dead = false;
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
// Test-run maintenance
// ---------------------------------------------------------------------------

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// A broken rod may orphan a motor (its wheel↔partner pair no longer braced,
// or the partner fell off the world). Re-anchor to another live neighbour
// when possible; a wheel with no frame left just freewheels.
function fixMotors() {
  for (let i = _motors.length - 1; i >= 0; i--) {
    const m = _motors[i];
    if (m.wheel.dead) {
      if (m.joint.space) m.joint.space = null;
      _motors.splice(i, 1);
      continue;
    }
    const stillLinked = !m.partner.dead
      && _rods.some((r) => !r.broken
        && ((r.a === m.wheel && r.b === m.partner) || (r.b === m.wheel && r.a === m.partner)));
    if (stillLinked) continue;
    if (m.joint.space) m.joint.space = null;
    _motors.splice(i, 1);
    const next = pickMotorPartner(m.wheel);
    if (next) makeMotor(m.wheel, next);
  }
}

function breakRod(rod, withFx) {
  if (rod.joint && rod.joint.space) rod.joint.space = null;
  rod.joint = null;
  rod.broken = true;
  if (withFx) {
    _snapCount++;
    const pa = rod.a.body.position, pb = rod.b.body.position;
    _fx.push({ x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, life: 18 });
  }
}

function updateRods() {
  let snapped = false;
  for (const rod of _rods) {
    if (rod.broken) continue;
    const pa = rod.a.body.position, pb = rod.b.body.position;
    const d = dist(pa.x, pa.y, pb.x, pb.y);
    rod.strain = Math.abs(d - rod.rest) / rod.rest;
    if (rod.strain > BREAK_INSTANT) {
      breakRod(rod, true);
      snapped = true;
    } else if (rod.strain > BREAK_STRAIN) {
      if (++rod.over >= BREAK_SUSTAIN) {
        breakRod(rod, true);
        snapped = true;
      }
    } else {
      rod.over = Math.max(0, rod.over - 1);
    }
  }
  if (snapped) fixMotors();
}

function updateParts() {
  let lost = false;
  for (const p of _parts) {
    if (p.dead || !p.body) continue;
    if (p.body.position.y > FALL_OFF_Y) {
      if (_hand && _hand.part === p) releaseHand();
      p.dead = true;
      if (p.body.space) p.body.space = null;
      p.body = null;
      for (const r of _rods) {
        if (!r.broken && (r.a === p || r.b === p)) breakRod(r, false);
      }
      lost = true;
    }
  }
  if (lost) fixMotors();
}

function checkGoal() {
  for (const p of _parts) {
    if (p.dead || !p.body) continue;
    if (dist(p.body.position.x, p.body.position.y, GOAL.x, GOAL.y) <= GOAL_RANGE) {
      _winTime = _time;
      if (_best === null || _winTime < _best) _best = _winTime;
      releaseHand();
      _phase = "won";
      _lockTimer = RESTART_LOCK_STEPS;
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "contraption-garage",
  label: "Contraption Garage",
  tags: ["MotorJoint", "DistanceJoint", "Building", "Vehicle", "Drag", "Gameplay"],
  featured: false,
  desc:
    "Fantastic-Contraption-style vehicle builder. In the build zone, <b>click</b> to place powered " +
    "wheels (drive right / drive left) and frame nodes, and <b>drag part-to-part</b> to connect them " +
    "with springy rods. Hit <b>Test</b> and the design spawns as real bodies: rods become soft " +
    "<b>DistanceJoint</b>s and each wheel drives via a <b>MotorJoint</b> against its frame. Survive " +
    "the pit and climb the ramp to the flag — rods show live <b>strain</b> and snap when overloaded, " +
    "and mid-test you can <b>grab</b> any part with a springy pivot hand to shove your machine. " +
    "Stopping a test rebuilds the same design for editing (parts collide only with the terrain " +
    "thanks to <b>InteractionFilter</b> groups). <b>Space</b> toggles test, <b>1–4</b> pick tools, " +
    "<b>R</b> resets.",
  walls: false,
  workerCompatible: false,

  setup(space) {
    _space = space;
    space.gravity = new Vec2(0, 600);

    // Hard-reset module state — the previous load's bodies died with its space.
    _parts = [];
    _rods = [];
    _motors = [];
    _linking = null;
    _hand = null;
    _mouse = null;
    _hint = null;
    _phase = "build";
    _tool = "wheel";
    _time = 0;
    _lockTimer = 0;
    _fx = [];
    _snapCount = 0;
    _tick = 0;

    spawnTerrain();
    seedStarter();

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
      if (--_fx[i].life <= 0) _fx.splice(i, 1);
    }
    if (_phase !== "run") return;

    _time = Math.max(0, _space.elapsedTime - _timeBase);
    updateRods();
    updateParts();
    checkGoal();
    if (_phase !== "run") return;

    if (_parts.every((p) => p.dead)) {
      _phase = "wreck";
      _lockTimer = RESTART_LOCK_STEPS;
    }
  },

  click(x, y) {
    if (_phase === "won" || _phase === "wreck") {
      if (_lockTimer <= 0) backToBuild();
      return;
    }

    // Canvas UI — the Test/Build toggle (bottom-right) and the toolbar.
    if (x >= GO_RECT.x && x <= GO_RECT.x + GO_RECT.w
      && y >= GO_RECT.y && y <= GO_RECT.y + GO_RECT.h) {
      if (_phase === "build") startRun();
      else backToBuild();
      return;
    }
    if (y < HUD_H) {
      for (let i = 0; i < TOOLS.length; i++) {
        const bx = TOOL_BTN.x + i * (TOOL_BTN.w + TOOL_BTN.gap);
        if (x >= bx && x <= bx + TOOL_BTN.w && y >= TOOL_BTN.y && y <= TOOL_BTN.y + TOOL_BTN.h) {
          _tool = TOOLS[i].id;
          return;
        }
      }
      return;
    }

    if (_phase === "run") {
      // Mid-test shove: soft pivot hand on the nearest live part.
      let part = null, bestD = GRAB_R;
      for (const p of _parts) {
        if (p.dead || !p.body) continue;
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
      setHint("Place parts inside the build zone");
      return;
    }
    if (_parts.length >= PART_CAP) {
      setHint("Part limit reached — erase something first");
      return;
    }
    for (const p of _parts) {
      if (dist(x, y, p.x, p.y) < MIN_PART_GAP) return;
    }
    const kind = _tool === "node" ? "node" : "wheel";
    const drive = _tool === "wheel" ? 1 : _tool === "wheelccw" ? -1 : 0;
    const placed = addPartDesign(kind, drive, x, y);
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
      parts: _parts, rods: _rods, motors: _motors, snaps: _snapCount,
      startRun, backToBuild, resetGame, addPartDesign, addRodDesign,
      goRect: GO_RECT, goal: GOAL,
    };
  },

  render(ctx, space, W, H, showOutlines) {
    drawGrid(ctx, W, H, 0, 0);
    for (const body of space.bodies) {
      if (!body.userData._part) drawBody(ctx, body, showOutlines);
    }
    drawFlag(ctx);
    drawBuildZone(ctx);
    drawRods(ctx);
    drawParts(ctx, true);
    drawLinking(ctx);
    drawHand(ctx);
    drawFx(ctx);
    drawHUD(ctx, W, H);
  },

  // Three.js / PixiJS render bodies natively; everything game-specific is
  // painted on the shared overlay canvas (parts get decoration-only passes
  // while bodies exist, full ghosts while editing).
  render3dOverlay(ctx, space, W, H) {
    drawFlag(ctx);
    drawBuildZone(ctx);
    drawRods(ctx);
    drawParts(ctx, false);
    drawLinking(ctx);
    drawHand(ctx);
    drawFx(ctx);
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Rendering — flag, build zone, rods, parts, toolbar HUD
// ---------------------------------------------------------------------------

function partColor(p) {
  if (p.kind === "node") return "#3fb950";
  return p.drive > 0 ? "#58a6ff" : "#a371f7";
}

function strainColor(strain) {
  // Gray → red as the rod approaches its breaking point.
  const t = Math.max(0, Math.min(1, strain / BREAK_STRAIN));
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const from = [139, 148, 158], to = [248, 81, 73];
  return `rgb(${lerp(from[0], to[0])},${lerp(from[1], to[1])},${lerp(from[2], to[2])})`;
}

function drawFlag(ctx) {
  const pulse = 1 + 0.08 * Math.sin(_tick * 0.08);
  const won = _phase === "won";

  ctx.strokeStyle = won ? "rgba(63,185,80,0.5)" : "rgba(88,166,255,0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(GOAL.x, GOAL.y, GOAL_RANGE * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Pole + waving pennant.
  ctx.strokeStyle = "#8b949e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(GOAL.x, FLAG_BASE_Y);
  ctx.lineTo(GOAL.x, FLAG_BASE_Y - 60);
  ctx.stroke();
  const wave = Math.sin(_tick * 0.12) * 3;
  ctx.fillStyle = won ? "#3fb950" : "#f85149";
  ctx.beginPath();
  ctx.moveTo(GOAL.x, FLAG_BASE_Y - 60);
  ctx.lineTo(GOAL.x + 34, FLAG_BASE_Y - 52 + wave);
  ctx.lineTo(GOAL.x, FLAG_BASE_Y - 44);
  ctx.closePath();
  ctx.fill();
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
  ctx.fillText("Build zone", ZONE.x0 + 8, ZONE.y0 + 6);
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

function drawWheel(ctx, x, y, rot, color, solid) {
  if (solid) {
    ctx.fillStyle = "#21262d";
    ctx.beginPath();
    ctx.arc(x, y, WHEEL_R, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(x, y, WHEEL_R - 2, 0, Math.PI * 2);
  ctx.stroke();
  // Spokes make the spin visible.
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    const a = rot + (k * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (WHEEL_R - 4), y + Math.sin(a) * (WHEEL_R - 4));
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDriveArrow(ctx, x, y, drive, color) {
  if (drive === 0) return;
  const dir = drive > 0 ? 1 : -1;
  const ax = x + dir * (WHEEL_R + 10);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + dir * (WHEEL_R + 2), y);
  ctx.lineTo(ax, y);
  ctx.moveTo(ax - dir * 5, y - 4);
  ctx.lineTo(ax, y);
  ctx.lineTo(ax - dir * 5, y + 4);
  ctx.stroke();
}

function drawParts(ctx, solid) {
  for (const p of _parts) {
    if (p.dead) continue;
    const pos = p.body ? p.body.position : p;
    const rot = p.body ? p.body.rotation : 0;
    const color = partColor(p);
    if (p.kind === "wheel") {
      drawWheel(ctx, pos.x, pos.y, rot, color, solid || !p.body);
      if (_phase === "build") drawDriveArrow(ctx, pos.x, pos.y, p.drive, color);
    } else {
      if (solid || !p.body) {
        ctx.fillStyle = color;
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
      const r = (p.kind === "wheel" ? WHEEL_R : NODE_R) + 5;
      ctx.strokeStyle = _tool === "erase" && _phase === "build"
        ? "rgba(248,81,73,0.7)" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
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
  ctx.arc(p.x, p.y, (_hand.part.kind === "wheel" ? WHEEL_R : NODE_R) + 4, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFx(ctx) {
  for (const f of _fx) {
    const t = 1 - f.life / 18;
    ctx.strokeStyle = `rgba(248,81,73,${(1 - t).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4 + t * 20, 0, Math.PI * 2);
    ctx.stroke();
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
  }

  const running = _phase === "run";
  drawButton(
    ctx, GO_RECT,
    running ? "■ Build (Space)" : "▶ Test (Space)",
    running, !running,
  );

  // Status line, left-aligned after the tools — the demo page overlays its
  // render-mode controls over the canvas's top-right corner, so that area
  // stays clear of text.
  ctx.fillStyle = "#58a6ff";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const liveParts = _parts.filter((p) => !p.dead).length;
  const liveRods = _rods.filter((r) => !r.broken).length;
  const statusX = TOOL_BTN.x + TOOLS.length * (TOOL_BTN.w + TOOL_BTN.gap) + 10;
  if (_hint && _phase === "build") {
    ctx.fillStyle = "#d29922";
    ctx.fillText(_hint.text, statusX, HUD_H / 2);
  } else if (_phase === "build") {
    ctx.fillText(
      `Parts ${liveParts} · Rods ${liveRods} — drag part-to-part for rods`,
      statusX, HUD_H / 2,
    );
  } else {
    ctx.fillText(
      `Parts ${liveParts} · Rods ${liveRods} — grab a part to shove it`,
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
    ctx.fillText("Reached the flag!", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `Time ${_winTime.toFixed(1)}s  ·  Best ${_best.toFixed(1)}s  ·  Rods snapped ${_snapCount}`,
      W / 2, H / 2 + 6,
    );
  } else {
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.fillText("Contraption lost", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("Every part fell off the course.", W / 2, H / 2 + 6);
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(
    _lockTimer > 0 ? "…" : "Click / tap to keep building · R resets the design",
    W / 2, H / 2 + 32,
  );
}
