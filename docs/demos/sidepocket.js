import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, CbEvent, InteractionType, InteractionListener,
} from "../nape-js.esm.js";
import { drawBody } from "../renderer.js";

// ─────────────────────────────────────────────────────────────────────────────
// Sidepocket — top-down drag-to-aim billiards
//
// A zero-gravity pool table. Drag back from the cue ball to set aim direction
// and power, release to strike. Balls roll with a per-step linear drag (rolling
// friction) and clack off each other with high restitution. Six sensor pockets
// (four corners + two side mids) swallow any ball that enters — sinking the cue
// is a "scratch". Input is locked while the table is in motion and re-enabled
// once every ball has settled.
//
// Distinct from the `pinball` demo: no flippers, ramps, or gravity-fed play —
// pure top-down rolling friction, elastic breaks, and aim-and-shoot input.
// ─────────────────────────────────────────────────────────────────────────────

const SCREEN_W = 900;
const SCREEN_H = 500;

// ── Table geometry (playfield = cushion inner faces) ─────────────────────────
const TABLE_L = 70;
const TABLE_R = 830;
const TABLE_T = 80;
const TABLE_B = 420;
const TABLE_CX = (TABLE_L + TABLE_R) / 2; // 450
const TABLE_CY = (TABLE_T + TABLE_B) / 2; // 250

const CUSHION = 16;          // cushion (rail) thickness
const POCKET_R = 20;         // pocket sensor radius
const BALL_R = 11;           // ball radius
const POCKET_GAP = POCKET_R + BALL_R; // cushion ends stop this far from a pocket

// Six pockets: four corners + two side midpoints.
const POCKETS = [
  { x: TABLE_L, y: TABLE_T },   // top-left
  { x: TABLE_CX, y: TABLE_T },  // top-middle
  { x: TABLE_R, y: TABLE_T },   // top-right
  { x: TABLE_L, y: TABLE_B },   // bottom-left
  { x: TABLE_CX, y: TABLE_B },  // bottom-middle
  { x: TABLE_R, y: TABLE_B },   // bottom-right
];

// ── Ball / shot tuning ───────────────────────────────────────────────────────
// Lively, low-friction felt: high elasticity for clean clacks, modest friction.
const BALL_MATERIAL = new Material(0.95, 0.2, 0.3, 1);
const DRAG = 0.018;          // per-step linear drag (rolling friction); 0 = ice
const STOP_EPS = 5;          // |v| under which a ball counts as stopped
const STOP_FRAMES = 6;       // consecutive settled frames before input re-opens
const MAX_PULL = 150;        // max drag distance in px (clamps power)
const MAX_SHOT_SPEED = 950;  // cue speed at full power
const TABLE_HEAD_X = TABLE_L + 190; // cue ball spot ("head spot")
const RACK_APEX_X = TABLE_R - 200;  // rack apex ("foot spot")

// Render flags read by the canvas2d / threejs / pixi adapters.
const KIND_RAIL = "rail";
const KIND_BALL = "ball";
const KIND_CUE = "cue";
const KIND_POCKET = "pocket";

const CUE_COLOR = { fill: "rgba(240,240,240,0.95)", stroke: "#f0f0f0" };

// Interaction callback types (module-level singletons, reused across reloads).
const cbBall = new CbType();
const cbPocket = new CbType();

// ── Module-level state (reset in setup) ──────────────────────────────────────
let _space = null;
let _cueBall = null;
let _objectBalls = [];     // remaining numbered balls
let _pocketed = [];        // bodies pending removal (collected in the BEGIN callback)
let _settleFrames = 0;
let _settled = true;
let _aiming = false;
let _aimX = 0;
let _aimY = 0;
let _shots = 0;
let _scratches = 0;
let _racks = 0;
let _cueScratched = false; // cue sank — respawn it once the table settles
let _winFrames = 0;        // grace period after a rack is cleared

// ── Builders ─────────────────────────────────────────────────────────────────
function makeRail(space, cx, cy, w, h) {
  const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
  body.shapes.add(new Polygon(Polygon.box(w, h), new Material(0.6, 0.4, 0.5, 1)));
  body.userData._kind = KIND_RAIL;
  body.space = space;
  return body;
}

// Build the six cushion segments. Each rail leaves a gap of POCKET_GAP on either
// side of every pocket it runs past, so balls can roll into the pocket mouths.
function buildRails(space) {
  const railY_T = TABLE_T - CUSHION / 2;
  const railY_B = TABLE_B + CUSHION / 2;
  const railX_L = TABLE_L - CUSHION / 2;
  const railX_R = TABLE_R + CUSHION / 2;

  // Horizontal rails split around the side pocket: two segments top, two bottom.
  function horizontal(cy) {
    const seg = (x0, x1) => makeRail(space, (x0 + x1) / 2, cy, x1 - x0, CUSHION);
    seg(TABLE_L + POCKET_GAP, TABLE_CX - POCKET_GAP); // left half
    seg(TABLE_CX + POCKET_GAP, TABLE_R - POCKET_GAP); // right half
  }
  horizontal(railY_T);
  horizontal(railY_B);

  // Vertical rails: single segment between the two corner pockets.
  const vSeg = (cx) =>
    makeRail(space, cx, TABLE_CY, CUSHION, (TABLE_B - POCKET_GAP) - (TABLE_T + POCKET_GAP));
  vSeg(railX_L);
  vSeg(railX_R);
}

function buildPockets(space) {
  for (const p of POCKETS) {
    const body = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
    const shape = new Circle(POCKET_R);
    shape.sensorEnabled = true;
    body.shapes.add(shape);
    body.cbTypes.add(cbPocket);
    body.userData._kind = KIND_POCKET;
    body.userData._hidden = true;   // we draw pockets ourselves in the overlay
    body.userData._hidden3d = true;
    body.space = space;
  }
}

function makeBall(space, x, y, color, colorIdx, isCue) {
  const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  ball.shapes.add(new Circle(BALL_R, undefined, BALL_MATERIAL));
  ball.allowRotation = true;
  ball.isBullet = true; // CCD — fast shots shouldn't tunnel through rails/balls
  ball.cbTypes.add(cbBall);
  ball.userData._kind = isCue ? KIND_CUE : KIND_BALL;
  if (isCue) ball.userData._color = color;
  else ball.userData._colorIdx = colorIdx;
  ball.space = space;
  return ball;
}

// Standard triangle rack of 15 balls, apex pointing toward the cue.
function rackBalls(space) {
  const balls = [];
  const s = 2 * BALL_R + 0.6;       // centre-to-centre spacing within a row
  const rowDX = s * Math.cos(Math.PI / 6); // row pitch (√3/2 · spacing)
  let n = 0;
  for (let r = 0; r < 5; r++) {
    const x = RACK_APEX_X + r * rowDX;
    for (let i = 0; i <= r; i++) {
      const y = TABLE_CY + (i - r / 2) * s;
      balls.push(makeBall(space, x, y, null, n % 6, false));
      n++;
    }
  }
  return balls;
}

function spawnCue(space) {
  return makeBall(space, TABLE_HEAD_X, TABLE_CY, CUE_COLOR, 0, true);
}

function clearBalls(space) {
  for (const body of space.bodies) {
    const k = body.userData._kind;
    if (k === KIND_BALL || k === KIND_CUE) body.space = null;
  }
  _objectBalls = [];
  _cueBall = null;
}

function rerack(space) {
  clearBalls(space);
  _objectBalls = rackBalls(space);
  _cueBall = spawnCue(space);
  _cueScratched = false;
  _settled = true;
  _settleFrames = 0;
  _aiming = false;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function speedOf(body) {
  const v = body.velocity;
  return Math.hypot(v.x, v.y);
}

function isPointNearCue(x, y) {
  if (!_cueBall) return false;
  const dx = x - _cueBall.position.x;
  const dy = y - _cueBall.position.y;
  const grab = BALL_R * 3;
  return dx * dx + dy * dy <= grab * grab;
}

// A ball is off the table if it slipped through a pocket mouth without the
// sensor catching it — treat it as pocketed too (belt-and-braces).
function isOffTable(body) {
  const p = body.position;
  return p.x < 10 || p.x > SCREEN_W - 10 || p.y < 10 || p.y > SCREEN_H - 10;
}

function sinkBall(body) {
  if (body === _cueBall) {
    _cueScratched = true;
    _scratches++;
    _cueBall.space = null;
    _cueBall = null;
  } else {
    const idx = _objectBalls.indexOf(body);
    if (idx >= 0) _objectBalls.splice(idx, 1);
    body.space = null;
  }
}

// ── Demo definition ──────────────────────────────────────────────────────────
export default {
  id: "sidepocket",
  label: "Sidepocket",
  tags: ["Billiards", "Sensor", "Material", "Drag", "TopDown"],
  featured: false,
  desc:
    "Top-down billiards — zero-gravity table. <b>Drag</b> back from the cue ball to aim, " +
    "<b>release</b> to break. High-restitution balls clack and roll with friction toward " +
    "six sensor pockets; sinking the cue is a scratch. Input locks until the table settles.",
  walls: false,
  workerCompatible: false,

  setup(space, W, H) {
    _space = space;
    space.gravity = new Vec2(0, 0);

    _pocketed = [];
    _shots = 0;
    _scratches = 0;
    _racks = 0;
    _winFrames = 0;

    buildRails(space);
    buildPockets(space);
    rerack(space);

    // Pocket sensor → queue the ball for removal. We don't remove inside the
    // callback (mutating the space mid-step is unsafe) — step() drains the queue.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      cbBall,
      cbPocket,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        if (!b1 || !b2) return;
        const ball = b1.userData._kind === KIND_POCKET ? b2 : b1;
        if (ball.userData._kind !== KIND_POCKET && !_pocketed.includes(ball)) {
          _pocketed.push(ball);
        }
      },
    ));
  },

  step(space) {
    // 1. Drain pocketed balls (sensor BEGIN queue + off-table safety net).
    for (const body of _pocketed) {
      if (body.space) sinkBall(body);
    }
    _pocketed.length = 0;
    if (_cueBall && _cueBall.space && isOffTable(_cueBall)) sinkBall(_cueBall);
    for (const b of _objectBalls.slice()) {
      if (b.space && isOffTable(b)) sinkBall(b);
    }

    // 2. Per-step linear drag (rolling friction) on every live ball.
    const balls = _cueBall ? [_cueBall, ..._objectBalls] : _objectBalls;
    for (const b of balls) {
      if (!b.space) continue;
      const v = b.velocity;
      b.velocity = new Vec2(v.x * (1 - DRAG), v.y * (1 - DRAG));
      b.angularVel *= 1 - DRAG;
    }

    // 3. Settle detection — the table is "ready" once every ball has been
    //    slow for STOP_FRAMES consecutive frames (mirrors body sleeping).
    let moving = false;
    for (const b of balls) {
      if (b.space && speedOf(b) >= STOP_EPS) { moving = true; break; }
    }
    if (moving) {
      _settleFrames = 0;
      _settled = false;
    } else {
      _settleFrames++;
      if (_settleFrames >= STOP_FRAMES && !_settled) {
        for (const b of balls) {
          if (!b.space) continue;
          b.velocity = new Vec2(0, 0);
          b.angularVel = 0;
        }
        _settled = true;
      }
    }

    // 4. Respawn the cue after a scratch, once the table is at rest.
    if (_cueScratched && _settled) {
      _cueBall = spawnCue(space);
      _cueScratched = false;
    }

    // 5. Rack cleared → brief celebration, then re-rack.
    if (_objectBalls.length === 0 && !_cueScratched) {
      _winFrames++;
      if (_winFrames === 1) _racks++;
      if (_winFrames > 90) {
        _winFrames = 0;
        rerack(space);
      }
    }
  },

  click(x, y) {
    if (!_canAim()) return;
    if (!isPointNearCue(x, y)) return;
    _aiming = true;
    _aimX = x;
    _aimY = y;
  },

  drag(x, y) {
    if (!_aiming || !_cueBall) return;
    const dx = x - _cueBall.position.x;
    const dy = y - _cueBall.position.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_PULL) {
      _aimX = _cueBall.position.x + (dx / d) * MAX_PULL;
      _aimY = _cueBall.position.y + (dy / d) * MAX_PULL;
    } else {
      _aimX = x;
      _aimY = y;
    }
  },

  release() {
    if (!_aiming || !_cueBall) return;
    _aiming = false;

    // Pull-back style: shot direction is from the cursor back toward the ball,
    // power scales with how far you dragged.
    const dx = _cueBall.position.x - _aimX;
    const dy = _cueBall.position.y - _aimY;
    const d = Math.hypot(dx, dy);
    if (d < 8) return; // tap — no shot

    const power = Math.min(d, MAX_PULL) / MAX_PULL; // 0..1
    const ux = dx / d, uy = dy / d;
    const speed = power * MAX_SHOT_SPEED;
    const m = _cueBall.mass;
    _cueBall.applyImpulse(new Vec2(ux * speed * m, uy * speed * m));
    _shots++;
    _settled = false;
    _settleFrames = 0;
  },

  // ── Canvas2D rendering ──────────────────────────────────────────────────────
  // Felt + rails + balls. Pockets, aim line and HUD live in render3dOverlay,
  // which the canvas2d adapter also invokes (so they're drawn exactly once).
  render(ctx, space, W, H, showOutlines) {
    ctx.clearRect(0, 0, W, H);

    // Wooden surround + green felt.
    ctx.fillStyle = "#3a2417";
    ctx.fillRect(TABLE_L - 30, TABLE_T - 30, (TABLE_R - TABLE_L) + 60, (TABLE_B - TABLE_T) + 60);
    ctx.fillStyle = "#0c5a2e";
    ctx.fillRect(TABLE_L - CUSHION, TABLE_T - CUSHION,
      (TABLE_R - TABLE_L) + 2 * CUSHION, (TABLE_B - TABLE_T) + 2 * CUSHION);

    for (const body of space.bodies) {
      if (body.userData._hidden) continue;
      drawBody(ctx, body, showOutlines);
    }
  },

  // Threejs / Pixi auto-render the bodies; this overlay adds the pockets, the
  // aim guide and the HUD on top — shared with the canvas2d path.
  render3dOverlay(ctx, space, W, H) {
    drawPockets(ctx);
    drawAim(ctx);
    drawHud(ctx, W);
  },

  // hover must exist so the runner keeps calling render3dOverlay each frame.
  hover() {},
};

// ── Shared drawing helpers (module-level so both render paths reuse them) ─────
function _canAim() {
  return !!_cueBall && _settled && !_cueScratched && _objectBalls.length > 0;
}

function drawPockets(ctx) {
  for (const p of POCKETS) {
    ctx.fillStyle = "#05140b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawAim(ctx) {
  if (!_aiming || !_cueBall) return;
  const bx = _cueBall.position.x, by = _cueBall.position.y;
  const dx = bx - _aimX, dy = by - _aimY;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const power = Math.min(d / MAX_PULL, 1);
  const ux = dx / d, uy = dy / d;

  // Drag line (cursor → ball), dashed.
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(_aimX, _aimY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Forward aim arrow — colour shifts toward red at full power.
  const len = power * MAX_PULL;
  const tipX = bx + ux * len, tipY = by + uy * len;
  const col = power > 0.7 ? "#f85149" : "#3fb950";
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  const head = 9;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * head - uy * head * 0.5, tipY - uy * head + ux * head * 0.5);
  ctx.lineTo(tipX - ux * head + uy * head * 0.5, tipY - uy * head - ux * head * 0.5);
  ctx.closePath();
  ctx.fill();

  // Power gauge (top-right).
  const gx = SCREEN_W - 150, gy = 40, gw = 120, gh = 10;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
  ctx.fillStyle = col;
  ctx.fillRect(gx, gy, gw * power, gh);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, gy, gw, gh);
}

function drawHud(ctx, W) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, 28);

  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`Balls: ${_objectBalls.length}`, 10, 19);
  ctx.fillText(`Shots: ${_shots}`, 130, 19);
  ctx.fillText(`Racks: ${_racks}`, 240, 19);

  // Scratch indicator.
  ctx.textAlign = "left";
  ctx.fillStyle = _cueScratched ? "#f85149" : "#9da7b3";
  ctx.fillText(`Scratches: ${_scratches}`, 350, 19);

  // Centre status line.
  ctx.textAlign = "center";
  if (_objectBalls.length === 0 && !_cueScratched) {
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(W / 2 - 110, 36, 220, 28);
    ctx.fillStyle = "#9be9a8";
    ctx.fillText("Rack cleared! Re-racking…", W / 2, 55);
  } else if (_cueScratched) {
    ctx.fillStyle = "#f85149";
    ctx.fillText("Scratch! cue resets when the table settles", W / 2, 19);
  } else if (_settled && !_aiming) {
    ctx.fillStyle = "#9da7b3";
    ctx.fillText("drag back from the cue ball to aim — release to shoot", W / 2, 19);
  } else if (!_settled) {
    ctx.fillStyle = "#9da7b3";
    ctx.fillText("balls in motion…", W / 2, 19);
  }
  ctx.restore();
}
