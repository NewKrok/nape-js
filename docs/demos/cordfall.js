/**
 * Cordfall — cut the ropes, guide the payload to the goal.
 *
 * Mechanics:
 *  - A small circular payload hangs from DistanceJoints anchored to static pivots.
 *  - Click-drag traces a cut segment; any rope whose world-space line intersects
 *    the cut segment is removed (`joint.space = null`).
 *  - Spike sensors cause level failure.
 *  - Bubble helpers apply upward force to the payload when touching.
 *  - Goal sensor triggers level completion.
 *  - 5 levels with a "next level" button on completion.
 *  - Optional star rating based on ropes cut (fewer = better).
 *
 * Engine features showcased:
 *  - DistanceJoint + runtime joint removal
 *  - Sensor-driven game state via InteractionListener
 *  - Pointer-drag world-space line-segment intersection
 */
import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  DistanceJoint, CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js";

// ── Constants ─────────────────────────────────────────────────────────────
const PAYLOAD_RADIUS = 14;       // must match the Circle radius in buildLevel
const BUBBLE_FORCE   = 280;      // upward force (units/s) applied inside a bubble

// ── Palette ───────────────────────────────────────────────────────────────
const C_PAYLOAD  = 1;  // blue
const C_ANCHOR   = 0;  // red   (static pivot discs)
const C_GOAL     = 3;  // purple
const C_SPIKE    = 4;  // orange
const C_BUBBLE   = 2;  // green

// ── CbTypes ──────────────────────────────────────────────────────────────
const cbPayload = new CbType();
const cbGoal    = new CbType();
const cbSpike   = new CbType();
const cbBubble  = new CbType();

// ── Level definitions ────────────────────────────────────────────────────
//  Each level is a factory: (SCREEN_W, SCREEN_H) → level descriptor.
//
//  Descriptor fields:
//    anchors : [{x,y}]          – static pivot bodies
//    payload : {x, y}           – spawn position of payload circle
//    ropes   : [{ai, slack}]    – ai = anchor index; slack added to rest length
//    spikes  : [{x,y,w,h}]      – spike sensor rectangles
//    bubbles : [{x,y,r}]        – bubble sensor circles
//    goal    : {x,y,r}          – goal sensor circle

const LEVELS = [
  // ── Level 1 — single rope, no hazards ──────────────────────────────
  (W, H) => ({
    anchors: [{ x: W / 2, y: H * 0.15 }],
    payload: { x: W / 2, y: H * 0.35 },
    ropes:   [{ ai: 0, slack: 10 }],
    spikes:  [],
    bubbles: [],
    goal:    { x: W / 2, y: H * 0.80 },
  }),

  // ── Level 2 — two ropes, one spike ──────────────────────────────────
  (W, H) => ({
    anchors: [
      { x: W * 0.35, y: H * 0.15 },
      { x: W * 0.65, y: H * 0.15 },
    ],
    payload: { x: W / 2, y: H * 0.35 },
    ropes:   [{ ai: 0, slack: 5 }, { ai: 1, slack: 5 }],
    spikes:  [{ x: W / 2 - 10, y: H * 0.62, w: 20, h: 16 }],
    bubbles: [],
    goal:    { x: W * 0.75, y: H * 0.80 },
  }),

  // ── Level 3 — two ropes, bubble helper, spike on right ──────────────
  (W, H) => ({
    anchors: [
      { x: W * 0.30, y: H * 0.12 },
      { x: W * 0.70, y: H * 0.12 },
    ],
    payload: { x: W / 2, y: H * 0.32 },
    ropes:   [{ ai: 0, slack: 0 }, { ai: 1, slack: 0 }],
    spikes:  [{ x: W * 0.70 - 10, y: H * 0.55, w: 20, h: 16 }],
    bubbles: [{ x: W * 0.28, y: H * 0.65, r: 28 }],
    goal:    { x: W * 0.25, y: H * 0.80 },
  }),

  // ── Level 4 — three ropes, two spikes, bubble in middle ──────────────
  (W, H) => ({
    anchors: [
      { x: W * 0.20, y: H * 0.10 },
      { x: W * 0.50, y: H * 0.10 },
      { x: W * 0.80, y: H * 0.10 },
    ],
    payload: { x: W / 2, y: H * 0.28 },
    ropes:   [{ ai: 0, slack: 20 }, { ai: 1, slack: 5 }, { ai: 2, slack: 20 }],
    spikes:  [
      { x: W * 0.30 - 10, y: H * 0.58, w: 20, h: 16 },
      { x: W * 0.68 - 10, y: H * 0.58, w: 20, h: 16 },
    ],
    bubbles: [{ x: W / 2, y: H * 0.68, r: 30 }],
    goal:    { x: W / 2, y: H * 0.85 },
  }),

  // ── Level 5 — four ropes, spike gauntlet, two bubbles ────────────────
  (W, H) => ({
    anchors: [
      { x: W * 0.15, y: H * 0.10 },
      { x: W * 0.40, y: H * 0.10 },
      { x: W * 0.60, y: H * 0.10 },
      { x: W * 0.85, y: H * 0.10 },
    ],
    payload: { x: W / 2, y: H * 0.28 },
    ropes:   [
      { ai: 0, slack: 25 }, { ai: 1, slack: 5 },
      { ai: 2, slack: 5 },  { ai: 3, slack: 25 },
    ],
    spikes: [
      { x: W * 0.25 - 10, y: H * 0.52, w: 20, h: 16 },
      { x: W * 0.50 - 10, y: H * 0.60, w: 20, h: 16 },
      { x: W * 0.75 - 10, y: H * 0.52, w: 20, h: 16 },
    ],
    bubbles: [
      { x: W * 0.20, y: H * 0.72, r: 28 },
      { x: W * 0.80, y: H * 0.72, r: 28 },
    ],
    goal: { x: W / 2, y: H * 0.87 },
  }),
];

// ── Module-level state ────────────────────────────────────────────────────
let _levelIdx     = 0;
let _state        = "playing";  // "playing" | "won" | "lost"
let _ropesCut     = 0;
let _startRopes   = 0;

let _payload      = null;
let _joints       = [];         // { joint, anchor } — anchor is the static pivot body
let _anchors      = [];         // static pivot bodies
let _bubbles      = [];         // bubble sensor bodies
let _goalBody     = null;
let _screenW      = 600;
let _screenH      = 600;

// Cut stroke state
let _cutting      = false;
let _cutX0        = 0;  // visual start (original click position)
let _cutY0        = 0;
let _cutX1        = 0;  // visual end (current drag position)
let _cutY1        = 0;

// ── Geometry helpers ─────────────────────────────────────────────────────

/** True if segment AB intersects segment CD. */
function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const dxAB = bx - ax, dyAB = by - ay;
  const dxCD = dx - cx, dyCD = dy - cy;
  const denom = dxAB * dyCD - dyAB * dxCD;
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((cx - ax) * dyCD - (cy - ay) * dxCD) / denom;
  const u = ((cx - ax) * dyAB - (cy - ay) * dxAB) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// ── Level builder ─────────────────────────────────────────────────────────
function buildLevel(space, W, H) {
  _state      = "playing";
  _ropesCut   = 0;
  _joints     = [];
  _anchors    = [];
  _bubbles    = [];
  _payload    = null;
  _goalBody   = null;
  _cutting    = false;

  const def = LEVELS[_levelIdx](W, H);

  // Static anchor pivots
  for (const a of def.anchors) {
    const b = new Body(BodyType.STATIC, new Vec2(a.x, a.y));
    b.shapes.add(new Circle(6, undefined, new Material(0, 0, 0)));
    b.userData._colorIdx = C_ANCHOR;
    b.userData._kind = "anchor";
    b.space = space;
    _anchors.push(b);
  }

  // Payload
  _payload = new Body(BodyType.DYNAMIC, new Vec2(def.payload.x, def.payload.y));
  _payload.shapes.add(new Circle(PAYLOAD_RADIUS, undefined, new Material(0.4, 0.3, 0.2, 2)));
  _payload.userData._colorIdx = C_PAYLOAD;
  _payload.userData._kind = "payload";
  _payload.cbTypes.add(cbPayload);
  _payload.space = space;

  // Ropes (DistanceJoints)
  for (const r of def.ropes) {
    const anchor = _anchors[r.ai];
    const ap = anchor.position;
    const pp = _payload.position;
    const restLen = Math.hypot(pp.x - ap.x, pp.y - ap.y) + r.slack;
    const joint = new DistanceJoint(
      anchor, _payload,
      new Vec2(0, 0), new Vec2(0, 0),
      restLen * 0.5,   // minLength (allow slack above midpoint)
      restLen,         // maxLength
    );
    joint.stiff  = true;
    joint.space  = space;
    _joints.push({ joint, anchor });
  }
  _startRopes = _joints.length;

  // Spikes (sensor polygons)
  for (const s of def.spikes) {
    const b = new Body(BodyType.STATIC, new Vec2(s.x + s.w / 2, s.y + s.h / 2));
    const shape = new Polygon(Polygon.box(s.w, s.h));
    shape.sensorEnabled = true;
    shape.cbTypes.add(cbSpike);
    b.shapes.add(shape);
    b.userData._colorIdx = C_SPIKE;
    b.userData._kind = "spike";
    b.space = space;
  }

  // Bubbles (sensor circles that push payload upward)
  for (const bl of def.bubbles) {
    const b = new Body(BodyType.STATIC, new Vec2(bl.x, bl.y));
    const shape = new Circle(bl.r);
    shape.sensorEnabled = true;
    shape.cbTypes.add(cbBubble);
    b.shapes.add(shape);
    b.userData._colorIdx = C_BUBBLE;
    b.userData._kind = "bubble";
    b.userData._r = bl.r;
    b.space = space;
    _bubbles.push(b);
  }

  // Goal (sensor circle)
  _goalBody = new Body(BodyType.STATIC, new Vec2(def.goal.x, def.goal.y));
  const goalShape = new Circle(22);
  goalShape.sensorEnabled = true;
  goalShape.cbTypes.add(cbGoal);
  _goalBody.shapes.add(goalShape);
  _goalBody.userData._colorIdx = C_GOAL;
  _goalBody.userData._kind = "goal";
  _goalBody.space = space;

  // Interaction listeners
  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR,
    cbPayload, cbGoal,
    () => { if (_state === "playing") _state = "won"; },
  ));

  space.listeners.add(new InteractionListener(
    CbEvent.BEGIN, InteractionType.SENSOR,
    cbPayload, cbSpike,
    () => { if (_state === "playing") _state = "lost"; },
  ));
}

// ── Rope endpoint helpers ─────────────────────────────────────────────────

/** Return current world-space endpoints {ax,ay,bx,by} for a joint entry.
 *  Only call this when jEntry.joint.space != null and _payload != null. */
function ropeEndpoints(jEntry) {
  const b1 = jEntry.anchor;
  // Joint anchors are Vec2(0,0) in local space → world position == body position.
  return {
    ax: b1.position.x, ay: b1.position.y,
    bx: _payload.position.x, by: _payload.position.y,
  };
}

// ── Cut logic ─────────────────────────────────────────────────────────────
function applyCut(space, x0, y0, x1, y1) {
  if (!_payload) return;
  for (const jEntry of _joints) {
    if (!jEntry.joint.space) continue;
    const ep = ropeEndpoints(jEntry);
    if (segmentsIntersect(x0, y0, x1, y1, ep.ax, ep.ay, ep.bx, ep.by)) {
      jEntry.joint.space = null;
      _ropesCut++;
    }
  }
}

// ── Star rating ───────────────────────────────────────────────────────────
function computeStars() {
  const fraction = _ropesCut / _startRopes;
  if (fraction <= 0.5) return 3;
  if (fraction <= 0.75) return 2;
  return 1;
}

// ── HUD drawing ───────────────────────────────────────────────────────────
function drawHUD(ctx, W, H) {
  // Level indicator
  ctx.save();
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "rgba(200,210,230,0.7)";
  ctx.fillText(`Level ${_levelIdx + 1} / ${LEVELS.length}`, 14, 22);
  ctx.restore();

  if (_state === "won") {
    // Dark overlay
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#7ee787";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText("Level Complete!", W / 2, H / 2 - 28);

    // Button
    const bw = 160, bh = 36, bx = W / 2 - bw / 2, by = H / 2 + 10;
    ctx.fillStyle = "#238636";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px system-ui, sans-serif";
    const btnLabel = _levelIdx < LEVELS.length - 1 ? "Next Level →" : "Play Again";
    ctx.fillText(btnLabel, W / 2, by + 24);
    ctx.restore();
  }

  if (_state === "lost") {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText("Ouch! Try again.", W / 2, H / 2 - 30);

    const bw = 140, bh = 36, bx = W / 2 - bw / 2, by = H / 2 + 10;
    ctx.fillStyle = "#6e40c9";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText("Retry", W / 2, by + 24);
    ctx.restore();
  }
}

/** Draw ropes and cut stroke onto a 2D overlay canvas context. */
function drawOverlay(ctx, W, H) {
  // Ropes
  for (const jEntry of _joints) {
    if (!jEntry.joint.space) continue;
    const ep = ropeEndpoints(jEntry);
    if (!ep) continue;
    ctx.save();
    ctx.strokeStyle = "#c8a165";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ep.ax, ep.ay);
    ctx.lineTo(ep.bx, ep.by);
    ctx.stroke();
    ctx.restore();
  }

  // Bubble rings
  for (const b of _bubbles) {
    if (!b.space) continue;
    const r = b.userData._r;
    ctx.save();
    ctx.strokeStyle = "rgba(63,185,80,0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Active cut stroke
  if (_cutting) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,100,80,0.85)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(_cutX0, _cutY0);
    ctx.lineTo(_cutX1, _cutY1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawHUD(ctx, W, H);
}

// ── Button hit-test ───────────────────────────────────────────────────────
function hitNextButton(x, y, W, H) {
  if (_state !== "won" && _state !== "lost") return false;
  const bw = _state === "won" ? 160 : 140;
  const bh = 36;
  const bx = W / 2 - bw / 2;
  const by = H / 2 + 10;
  return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

// ── Demo export ───────────────────────────────────────────────────────────
export default {
  id:       "cordfall",
  label:    "Cordfall",
  tags:     ["Joints", "Sensors", "Cutting", "Puzzle", "Drag"],
  featured: true,
  featuredOrder: 20,
  desc:     "<b>Drag</b> across ropes to cut them — steer the payload into the <b>goal</b> (purple circle). Avoid the <b>spikes</b>! Fewer cuts = more stars.",
  walls:    true,
  workerCompatible: false,

  setup(space, W, H) {
    _screenW = W;
    _screenH = H;
    space.gravity = new Vec2(0, 400);
    buildLevel(space, W, H);
  },

  step(space, W, H) {
    if (_state !== "playing") return;

    // Bubble upward force: apply when payload overlaps bubble sensor
    if (_payload && _payload.space) {
      const px = _payload.position.x;
      const py = _payload.position.y;
      for (const b of _bubbles) {
        if (!b.space) continue;
        const r = b.userData._r + PAYLOAD_RADIUS;
        const dx = px - b.position.x;
        const dy = py - b.position.y;
        if (dx * dx + dy * dy < r * r) {
          _payload.applyImpulse(new Vec2(0, -(BUBBLE_FORCE / 60)));
        }
      }
    }

    // Payload fell off-screen with no ropes left → level fail
    const hasRope = _joints.some((j) => j.joint.space != null);
    if (_payload && !hasRope && (
      _payload.position.y > _screenH + 60 ||
      _payload.position.x < -60 ||
      _payload.position.x > _screenW + 60
    )) {
      _state = "lost";
    }

    // Remove joints whose bodies have left the space (safety)
    for (const jEntry of _joints) {
      if (jEntry.joint.space && (!_payload || !_payload.space)) {
        jEntry.joint.space = null;
      }
    }
  },

  click(x, y, space) {
    if (hitNextButton(x, y, _screenW, _screenH)) {
      if (_state === "won") {
        _levelIdx = _levelIdx < LEVELS.length - 1 ? _levelIdx + 1 : 0;
      }
      // "lost": retry same level — _levelIdx unchanged
      for (const b of [...space.bodies]) b.space = null;
      for (const c of [...space.constraints]) c.space = null;
      for (const l of [...space.listeners]) l.space = null;
      buildLevel(space, _screenW, _screenH);
    }
  },

  drag(x, y) {
    if (_state !== "playing") return;
    if (!_cutting) {
      _cutting = true;
      _cutX0 = x; _cutY0 = y;
    }
    _cutX1 = x; _cutY1 = y;
  },

  release(space) {
    if (_cutting) {
      applyCut(space, _cutX0, _cutY0, _cutX1, _cutY1);
    }
    _cutting = false;
  },

  render3dOverlay(ctx, _space, W, H) {
    drawOverlay(ctx, W, H);
  },

  // canvas2d path: render3dOverlay is also called for 2D via the runner
  hover(_x, _y) {
    // required so render3dOverlay fires each frame
  },
};
