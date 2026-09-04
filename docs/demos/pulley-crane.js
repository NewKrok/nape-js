import {
  Body, BodyType, Vec2, Circle, Polygon, Material, PulleyJoint,
} from "../nape-js.esm.js?v=3.41.0";

// ── Layout constants ───────────────────────────────────────────────────────
// A counterweight lift: a static gantry at the top holds two pulley wheels.
// A rigid rope connects the cabin (left) and the counterweight (right) over
// both wheels. The PulleyJoint enforces
//     distance(leftWheel, cabinTop) + ratio * distance(rightWheel, counterTop) ∈ [min, max]
// so when one side sinks the other rises by an amount scaled by `ratio`.

const GANTRY_Y          = 70;     // y of the horizontal beam (visual only)
const PULLEY_R          = 14;     // visual radius of the pulley wheels
const LEFT_X_FRAC       = 0.34;   // gantry pulley x positions, as fractions of W
const RIGHT_X_FRAC      = 0.66;

// Cabin — open-top U-shape (compound body of 3 polygons)
const CABIN_W           = 100;
const CABIN_WALL_THICK  = 8;
const CABIN_WALL_H      = 48;
const CABIN_FLOOR_THICK = 8;
const CABIN_TOP_LOCAL_Y = -CABIN_WALL_H / 2;  // top of walls, in body-local coords

// Counterweight — single solid rectangle
const COUNTER_W           = 42;
const COUNTER_H           = 60;
const COUNTER_TOP_LOCAL_Y = -COUNTER_H / 2;

// Rope — soft (slightly springy) coupling. jointMin == jointMax keeps the
// rope at a fixed nominal length so dropping cargo on one side lifts the
// other (a slack jointMin=0 rope would let both sides simply fall together
// when balanced). The constraint is made soft (stiff=false) with heavy
// damping so it doesn't fight the floor's normal force at rest — the rigid
// stiff=true variant produces a pump-loop jitter when one side bottoms out.
// Ratio=1 means 1:1 mechanical coupling: 1 cm down on the cabin lifts the
// counterweight by 1 cm.
const ROPE_LENGTH = 360;
const RATIO       = 1.0;
const ROPE_FREQUENCY = 12; // Hz — stiff enough to look like a rope
const ROPE_DAMPING   = 1;  // critical damping — no spring oscillation

// Initial position: half the rope on each side, plus offset to top-of-body.
// Verify: (CABIN_INIT_Y + CABIN_TOP_LOCAL_Y - GANTRY_Y)
//       + RATIO * (COUNTER_INIT_Y + COUNTER_TOP_LOCAL_Y - GANTRY_Y)
//     = (270 - 24 - 70) + 1.0 * (270 - 30 - 70)
//     = 176 + 200
//     ... so we tune one of the y values. With ROPE_LENGTH=360 and equal
//     sides, average rope-per-side = 180, so:
//       cabin_y = 180 + GANTRY_Y - CABIN_TOP_LOCAL_Y = 180 + 70 + 24 = 274
//       counter_y = 180 + GANTRY_Y - COUNTER_TOP_LOCAL_Y = 180 + 70 + 30 = 280
const CABIN_INIT_Y   = 274;
const COUNTER_INIT_Y = 280;

// Cabin/counter both get equal explicit mass so the system is in neutral
// equilibrium until the user adds cargo to one side.
const BODY_MASS = 5;

// Cargo dropped on click
const CARGO_SPAWN_Y = 30;   // just below the ceiling
const CARGO_R_MIN   = 5;
const CARGO_R_MAX   = 9;

// ── Module state (reset in setup) ──────────────────────────────────────────
let _pulley         = null;
let _cabin          = null;
let _counter        = null;
let _leftPulleyPos  = null;   // world-space anchor for body1 (space.world)
let _rightPulleyPos = null;   // world-space anchor for body3 (space.world)
let _cargoCount     = 0;

// ── Body builders ──────────────────────────────────────────────────────────
function buildCabin(space, cx, cy) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
  const mat = new Material(0.6, 0.4, 0.8, 1.2); // moderate friction, low bounce

  const halfW = CABIN_W / 2;
  const halfH = CABIN_WALL_H / 2;

  // Floor strip at the bottom of the U
  body.shapes.add(new Polygon(
    Polygon.rect(-halfW, halfH - CABIN_FLOOR_THICK, CABIN_W, CABIN_FLOOR_THICK),
    undefined, mat,
  ));
  // Left wall
  body.shapes.add(new Polygon(
    Polygon.rect(-halfW, -halfH, CABIN_WALL_THICK, CABIN_WALL_H),
    undefined, mat,
  ));
  // Right wall
  body.shapes.add(new Polygon(
    Polygon.rect(halfW - CABIN_WALL_THICK, -halfH, CABIN_WALL_THICK, CABIN_WALL_H),
    undefined, mat,
  ));

  body.mass = BODY_MASS;
  try { body.userData._colorIdx = 2; } catch (_) {}
  body.space = space;
  return body;
}

function buildCounter(space, cx, cy) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
  body.shapes.add(new Polygon(
    Polygon.box(COUNTER_W, COUNTER_H),
    undefined,
    new Material(0.5, 0.3, 0.6, 2.0),
  ));
  body.mass = BODY_MASS;
  try { body.userData._colorIdx = 0; } catch (_) {}
  body.space = space;
  return body;
}

function spawnCargo(space, x, isBall) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, CARGO_SPAWN_Y));
  if (isBall) {
    const r = CARGO_R_MIN + Math.random() * (CARGO_R_MAX - CARGO_R_MIN);
    body.shapes.add(new Circle(r, undefined, new Material(0.4, 0.5, 0.6, 1)));
  } else {
    const s = (CARGO_R_MIN + CARGO_R_MAX);
    body.shapes.add(new Polygon(
      Polygon.box(s, s * 0.8),
      undefined,
      new Material(0.5, 0.3, 0.6, 1),
    ));
  }
  try { body.userData._colorIdx = (_cargoCount++) % 6; } catch (_) {}
  body.space = space;
  return body;
}

// ── Demo definition ────────────────────────────────────────────────────────
export default {
  id:    "pulley-crane",
  label: "Pulley Lift",
  tags:  ["PulleyJoint", "Compound", "Material", "Click"],
  featured: false,
  desc:
    "A <b>rigid rope</b> over two pulley wheels couples a cabin (left) and a counterweight " +
    "(right). <code>PulleyJoint</code> enforces a fixed total rope length, so adding cargo " +
    "to one side sinks it and lifts the other. <b>Click</b> the left half to drop a ball " +
    "into the cabin, the right half to drop a weight onto the counterweight.",
  walls: true,
  workerCompatible: false,

  moduleState:
    "let _pulley = null;\nlet _cabin = null;\nlet _counter = null;\n" +
    "let _leftPulleyPos = null;\nlet _rightPulleyPos = null;\nlet _cargoCount = 0;",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const leftX  = W * LEFT_X_FRAC;
    const rightX = W * RIGHT_X_FRAC;
    _leftPulleyPos  = new Vec2(leftX,  GANTRY_Y);
    _rightPulleyPos = new Vec2(rightX, GANTRY_Y);
    _cargoCount = 0;

    _cabin   = buildCabin(space, leftX,  CABIN_INIT_Y);
    _counter = buildCounter(space, rightX, COUNTER_INIT_Y);

    // Rope: total = leftRope + RATIO * rightRope = ROPE_LENGTH. A soft
    // constraint (stiff=false) absorbs the standoff between the rope and the
    // floor when the cabin lands, eliminating the rigid-coupling jitter.
    _pulley = new PulleyJoint(
      space.world, _cabin,
      space.world, _counter,
      _leftPulleyPos,                   // anchor on space.world → world space
      new Vec2(0, CABIN_TOP_LOCAL_Y),   // anchor on cabin → local space
      _rightPulleyPos,                  // anchor on space.world → world space
      new Vec2(0, COUNTER_TOP_LOCAL_Y), // anchor on counter → local space
      ROPE_LENGTH,
      ROPE_LENGTH,
      RATIO,
    );
    _pulley.stiff = false;
    _pulley.frequency = ROPE_FREQUENCY;
    _pulley.damping = ROPE_DAMPING;
    _pulley.space = space;
  },

  click(x, y, space, W) {
    // Left half → cabin side; right half → counterweight side.
    const midX = W * 0.5;
    if (x < midX) {
      // Drop a ball above the cabin
      const leftX = W * LEFT_X_FRAC;
      spawnCargo(space, leftX + (Math.random() - 0.5) * 30, true);
    } else {
      // Drop a heavier box above the counterweight
      const rightX = W * RIGHT_X_FRAC;
      spawnCargo(space, rightX + (Math.random() - 0.5) * 20, false);
    }
  },

  step(space, W, H) {
    // Despawn cargo that has fallen out of bounds (shouldn't happen with
    // walls=true, but cheap insurance).
    for (const body of space.bodies) {
      if (body === _cabin || body === _counter) continue;
      if (body.isStatic()) continue;
      if (body.position.y > H + 80 || body.position.x < -80 || body.position.x > W + 80) {
        body.space = null;
      }
    }
  },

  render3dOverlay(ctx, space, W) {
    if (!_leftPulleyPos || !_rightPulleyPos || !_cabin || !_counter) return;

    const leftX  = _leftPulleyPos.x;
    const rightX = _rightPulleyPos.x;

    // ── Gantry beam ────────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = "#3d4a5e";
    ctx.strokeStyle = "#1e2533";
    ctx.lineWidth = 1;
    const beamX = leftX - 30;
    const beamW = (rightX + 30) - beamX;
    const beamY = GANTRY_Y - 14;
    const beamH = 12;
    ctx.fillRect(beamX, beamY, beamW, beamH);
    ctx.strokeRect(beamX, beamY, beamW, beamH);

    // Posts dropping from the beam to the ceiling
    ctx.fillStyle = "#2a3340";
    ctx.fillRect(beamX, 0, 6, beamY);
    ctx.fillRect(beamX + beamW - 6, 0, 6, beamY);
    ctx.restore();

    // ── Rope segments ──────────────────────────────────────────────────────
    // Anchors in world space — cabin/counter anchors are local, so transform.
    const cabinAnchor   = _cabin.localPointToWorld(new Vec2(0, CABIN_TOP_LOCAL_Y));
    const counterAnchor = _counter.localPointToWorld(new Vec2(0, COUNTER_TOP_LOCAL_Y));

    ctx.save();
    ctx.strokeStyle = "#c8a672";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    // Horizontal top run between the two wheels
    ctx.beginPath();
    ctx.moveTo(leftX, GANTRY_Y);
    ctx.lineTo(rightX, GANTRY_Y);
    ctx.stroke();
    // Left rope: leftPulley → cabin top
    ctx.beginPath();
    ctx.moveTo(leftX, GANTRY_Y);
    ctx.lineTo(cabinAnchor.x, cabinAnchor.y);
    ctx.stroke();
    // Right rope: rightPulley → counter top
    ctx.beginPath();
    ctx.moveTo(rightX, GANTRY_Y);
    ctx.lineTo(counterAnchor.x, counterAnchor.y);
    ctx.stroke();
    ctx.restore();

    // ── Pulley wheels ──────────────────────────────────────────────────────
    ctx.save();
    for (const px of [leftX, rightX]) {
      // Wheel disc
      ctx.fillStyle = "#5a6478";
      ctx.beginPath();
      ctx.arc(px, GANTRY_Y, PULLEY_R, 0, Math.PI * 2);
      ctx.fill();
      // Rim
      ctx.strokeStyle = "#1e2533";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Hub
      ctx.fillStyle = "#1e2533";
      ctx.beginPath();
      ctx.arc(px, GANTRY_Y, PULLEY_R * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── HUD ────────────────────────────────────────────────────────────────
    const leftRope  = Math.hypot(cabinAnchor.x   - leftX,  cabinAnchor.y   - GANTRY_Y);
    const rightRope = Math.hypot(counterAnchor.x - rightX, counterAnchor.y - GANTRY_Y);
    const total     = leftRope + RATIO * rightRope;

    ctx.save();
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(210,220,240,0.85)";
    ctx.fillText(`left rope:  ${leftRope.toFixed(0).padStart(3, " ")} px`, 12, 20);
    ctx.fillText(`right rope: ${rightRope.toFixed(0).padStart(3, " ")} px`, 12, 36);
    ctx.fillText(`total (rope + ratio·rope): ${total.toFixed(0)} / ${ROPE_LENGTH} px`, 12, 52);
    ctx.fillText(`ratio:      ${RATIO.toFixed(2)}`, 12, 68);
    ctx.restore();

    // Side hints
    ctx.save();
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textAlign = "center";
    const hintY = GANTRY_Y + 30;
    ctx.fillText("click → drop ball into cabin",   leftX,  hintY);
    ctx.fillText("click → drop weight on counter", rightX, hintY);
    ctx.restore();
  },

  // Empty hover so the render3dOverlay tick runs each frame even without
  // pointer movement (matches the slingshot demo's pattern).
  hover() {},
};
