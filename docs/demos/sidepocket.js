import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  CbType, CbEvent, InteractionType, InteractionListener, InteractionFilter,
} from "../nape-js.esm.js";
import { spaceToJSON, spaceFromJSON } from "../serialization/index.js";
import { drawBody } from "../renderer.js";

// ─────────────────────────────────────────────────────────────────────────────
// Billiards — top-down drag-to-aim pool
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
const POCKET_R = 20;         // pocket mouth radius (visual)
const BALL_R = 11;           // ball radius
const POCKET_GAP = POCKET_R + BALL_R; // cushion ends stop this far from a pocket
// A ball drops only once its CENTRE reaches the pocket throat — not when its
// edge first grazes the mouth. With a sensor the BEGIN event fires at a
// centre distance of POCKET_R + BALL_R (= 31 px), so a ball "falls in" while
// still mostly on the felt. Instead we test centre distance against this
// capture radius each step: the centre must be well over the hole.
const POCKET_CAPTURE = POCKET_R - BALL_R * 0.5; // 14.5 px
const POCKET_CAPTURE_SQ = POCKET_CAPTURE * POCKET_CAPTURE;
// How far outside the playfield the pocket "bag" extends before a backstop
// wall closes it. Deep enough that a ball rolling into a pocket passes within
// the capture radius of the hole centre, but closed so a non-captured ball
// bounces back onto the felt instead of escaping into open space.
const BAG_DEPTH = POCKET_R + BALL_R; // 31 px

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
// Rolling resistance on cloth is ~constant deceleration (Coulomb-like), NOT a
// velocity-proportional drag. A proportional `v *= (1 - k)` decays toward zero
// exponentially, so the ball never truly stops — it crawls forever at a sliver
// of speed until a cutoff kills it, which reads as a mushy, unnatural slowdown.
// Real billiard balls lose a fixed amount of speed per second and stop crisply
// after a finite roll. We model that: subtract a constant DECEL each step along
// the velocity direction, clamping to rest. DECEL is in px/s of speed shed per
// physics step (60 Hz), so per second a ball sheds 60·DECEL px/s.
const ROLL_DECEL = 4;        // px/s of speed shed per step (≈240 px/s²)
const STOP_EPS = ROLL_DECEL; // |v| at/under which a ball is snapped to rest
const STOP_FRAMES = 6;       // consecutive settled frames before input re-opens
const MAX_PULL = 150;        // max drag distance in px (clamps power)
const MAX_SHOT_SPEED = 2200; // cue speed at full power

// Camera-shake tuning: collisions closing faster than SHAKE_MIN_SPEED jolt
// the table, amplitude ramping from SHAKE_MIN_AMP up to SHAKE_MAX_AMP at a
// full-power break.
const SHAKE_MIN_SPEED = 120;
const SHAKE_MIN_AMP = 2;
const SHAKE_MAX_AMP = 11;

// Length of the struck-ball direction guide drawn at the ghost.
const GHOST_LINE_LEN = 70;

// Pockets sit in their own collision group purely for tidiness/future use; the
// mask is all-bits so the live ball↔pocket sensor interaction is unaffected.
// (The shadow-sim predictor needs no special filtering — pockets are sensors,
// so a ball naturally passes through them in the cloned step.)
const GROUP_POCKET = 2;
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
let _impactSpeed = 0;      // peak closing speed of collisions since last step

// Cushion bounciness — also used by the shot predictor to shrink the roll
// budget at each rail bounce (a real cushion sheds energy, so a bounced ball
// dies sooner than a straight roll of the same length).
const RAIL_ELASTICITY = 0.6;
const RAIL_MATERIAL = new Material(RAIL_ELASTICITY, 0.4, 0.5, 1);

// ── Builders ─────────────────────────────────────────────────────────────────
function makeRail(space, cx, cy, w, h) {
  const body = new Body(BodyType.STATIC, new Vec2(cx, cy));
  body.shapes.add(new Polygon(Polygon.box(w, h), RAIL_MATERIAL));
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

  // Backstop frame — a closed box just OUTSIDE the pockets. The rail gaps let a
  // ball roll into a pocket bag; if it isn't captured (a fast ball can skim the
  // centre, or skip the capture zone between frames) the backstop bounces it
  // back onto the table instead of letting it escape into open space. Depth
  // BAG_DEPTH gives the bag room for a ball to sit over the hole.
  const W = 30; // backstop thickness (well outside the felt, never seen)
  const bagL = TABLE_L - BAG_DEPTH, bagR = TABLE_R + BAG_DEPTH;
  const bagT = TABLE_T - BAG_DEPTH, bagB = TABLE_B + BAG_DEPTH;
  const span = (bagR - bagL) + 2 * W;
  const height = (bagB - bagT) + 2 * W;
  const backstop = (cx, cy, w, h) => {
    const b = makeRail(space, cx, cy, w, h);
    b.userData._hidden = true; // sits off-felt; never rendered
    b.userData._hidden3d = true;
  };
  backstop((bagL + bagR) / 2, bagT - W / 2, span, W); // top
  backstop((bagL + bagR) / 2, bagB + W / 2, span, W); // bottom
  backstop(bagL - W / 2, (bagT + bagB) / 2, W, height); // left
  backstop(bagR + W / 2, (bagT + bagB) / 2, W, height); // right
}

function buildPockets(space) {
  for (const p of POCKETS) {
    const body = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
    const shape = new Circle(POCKET_R);
    shape.sensorEnabled = true;
    // Own collision group (mask = all bits) so the ball↔pocket sensor still
    // fires; the group is otherwise unused now (see GROUP_POCKET note).
    shape.filter = new InteractionFilter(GROUP_POCKET, -1);
    body.shapes.add(shape);
    body.cbTypes.add(cbPocket);
    body.userData._kind = KIND_POCKET;
    body.userData._hidden = true;   // we draw pockets ourselves in the overlay
    body.userData._hidden3d = true;
    body.space = space;
  }
}

let _nextBallId = 0;
function makeBall(space, x, y, color, colorIdx, isCue) {
  const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  ball.shapes.add(new Circle(BALL_R, undefined, BALL_MATERIAL));
  ball.allowRotation = true;
  ball.isBullet = true; // CCD — fast shots shouldn't tunnel through rails/balls
  ball.cbTypes.add(cbBall);
  ball.userData._kind = isCue ? KIND_CUE : KIND_BALL;
  // Stable id carried through serialization so the shadow-sim predictor can
  // match the cloned cue and report which object ball it strikes.
  ball.userData._predId = isCue ? -1 : _nextBallId++;
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
  _nextBallId = 0;
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

// A ball is off the table if it slipped through a pocket mouth without being
// captured — treat it as pocketed too (belt-and-braces).
function isOffTable(body) {
  const p = body.position;
  return p.x < 10 || p.x > SCREEN_W - 10 || p.y < 10 || p.y > SCREEN_H - 10;
}

// A ball is captured once its CENTRE reaches a pocket throat. Squared compare
// to skip the sqrt — POCKET_CAPTURE² is hoisted as a module constant.
function isOverPocket(body) {
  const p = body.position;
  for (const k of POCKETS) {
    const dx = p.x - k.x, dy = p.y - k.y;
    if (dx * dx + dy * dy <= POCKET_CAPTURE_SQ) return true;
  }
  return false;
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
  label: "Billiards",
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

    _shots = 0;
    _scratches = 0;
    _racks = 0;
    _winFrames = 0;
    _impactSpeed = 0;

    buildRails(space);
    buildPockets(space);
    rerack(space);

    // Pocket sensor → queue the ball for removal. We don't remove inside the
    // callback (mutating the space mid-step is unsafe) — step() drains the queue.
    // Pocketing is handled geometrically in step() by a centre-distance test
    // against POCKET_CAPTURE — the pocket sensors no longer drive capture (a
    // sensor BEGIN fires the instant a ball's edge grazes the mouth, which made
    // balls drop far too easily, especially the side pockets).

    // Ball-on-ball clack → camera shake scaled by the closing speed of the
    // impact, so a hard break jolts and a soft kiss barely registers. Only
    // balls carry cbBall, so rail bounces don't fire this (the satisfying
    // crack is ball-on-ball). The peak speed is recorded here and consumed
    // in step(); the runner's shakeCamera() is applied additively on top of
    // the (un-followed) camera.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      cbBall,
      cbBall,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        if (!b1 || !b2) return;
        // Closing speed = magnitude of the two balls' relative velocity.
        const rvx = b1.velocity.x - b2.velocity.x;
        const rvy = b1.velocity.y - b2.velocity.y;
        const closing = Math.hypot(rvx, rvy);
        _impactSpeed = Math.max(_impactSpeed, closing);
      },
    ));
  },

  step(space) {
    // 0. Fire a camera shake for the hardest collision since the last step.
    //    Below SHAKE_MIN_SPEED hits are kisses and don't shake; amplitude
    //    ramps linearly with closing speed up to a capped maximum.
    if (_impactSpeed > SHAKE_MIN_SPEED) {
      const t = Math.min(
        (_impactSpeed - SHAKE_MIN_SPEED) / (MAX_SHOT_SPEED - SHAKE_MIN_SPEED),
        1,
      );
      this._runner?.shakeCamera(SHAKE_MIN_AMP + t * (SHAKE_MAX_AMP - SHAKE_MIN_AMP), 0.18);
    }
    _impactSpeed = 0;

    // 1. Pocketing: a ball drops only once its CENTRE reaches a pocket throat
    //    (centre distance < POCKET_CAPTURE), plus an off-table safety net for
    //    anything that slipped through a mouth without being captured.
    const allBalls = _cueBall ? [_cueBall, ..._objectBalls] : _objectBalls.slice();
    for (const b of allBalls) {
      if (!b.space) continue;
      if (isOffTable(b) || isOverPocket(b)) sinkBall(b);
    }

    // 2. Rolling resistance: shed a CONSTANT amount of speed each step along
    //    the velocity direction (Coulomb-like), so balls coast naturally and
    //    then stop crisply after a finite roll — not the endless exponential
    //    crawl a proportional drag produces.
    const balls = _cueBall ? [_cueBall, ..._objectBalls] : _objectBalls;
    for (const b of balls) {
      if (!b.space) continue;
      const v = b.velocity;
      const speed = Math.hypot(v.x, v.y);
      if (speed <= ROLL_DECEL) {
        b.velocity = new Vec2(0, 0);
        b.angularVel = 0;
      } else {
        const k = (speed - ROLL_DECEL) / speed; // keep direction, drop magnitude
        b.velocity = new Vec2(v.x * k, v.y * k);
        b.angularVel *= k;
      }
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
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.clearRect(0, 0, W, H);

    // Full-canvas backdrop in screen space so the shake never exposes a bare
    // edge strip as the (translated) table jolts.
    ctx.fillStyle = "#1a1008";
    ctx.fillRect(0, 0, W, H);

    // Apply the camera offset (driven entirely by shakeCamera on impact — the
    // demo has no follow target, so camX/camY are the shake offset). The HUD
    // and pockets live in render3dOverlay and stay in screen space, so they
    // don't shake.
    ctx.save();
    ctx.translate(-camX, -camY);

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

    ctx.restore();
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

  // Predicted path — full shadow simulation: clone the live space, fire the
  // exact shot into the clone, step the real engine forward, and trace the
  // cue's actual path (rail bounces and all) plus the first object ball it
  // strikes. Because it's the same solver the live shot uses, the prediction
  // matches reality — no hand-rolled reflection/ghost geometry to drift.
  const col = power > 0.7 ? "#f85149" : "#3fb950";
  const pred = predictShot(ux, uy, power);
  drawPrediction(ctx, pred, col);

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

// ── Shot prediction (shadow simulation) ──────────────────────────────────────
// Clone the live space, fire the exact shot into the clone, and step the real
// engine forward — tracing the cue's true path (rail bounces included) and the
// first object ball it wakes. Because the prediction IS the engine, it can't
// disagree with the real shot the way hand-rolled ray/reflection geometry did.
//
// Cost is ~1–2 ms (clone + ~PREDICT_FRAMES steps); we only run it while aiming,
// and memoise on the shot parameters so a stationary aim doesn't re-simulate.
const PREDICT_FRAMES = 90;     // how far ahead to simulate (1.5 s @ 60 Hz)
const PREDICT_WAKE = 8;        // px/s — object ball counts as "struck" above this
const PREDICT_PATH_STEP = 2;   // record the cue path every N frames (keeps it light)

let _predCache = null;         // { key, result }

function predictShot(ux, uy, power) {
  const empty = { path: [], ghost: null, objectDir: null, balls: [] };
  if (!_space || !_cueBall || !_cueBall.space) return empty;

  // Memoise: the shadow sim is deterministic in (cue pos, dir, power, table),
  // so only re-run when the aim actually changes. Table layout is captured by
  // the live ball count + cue position (re-racks/pots change one of them).
  const cp = _cueBall.position;
  const key =
    `${cp.x.toFixed(1)},${cp.y.toFixed(1)},${ux.toFixed(4)},${uy.toFixed(4)},` +
    `${power.toFixed(3)},${_objectBalls.length}`;
  if (_predCache && _predCache.key === key) return _predCache.result;

  let clone;
  try {
    clone = spaceFromJSON(spaceToJSON(_space));
  } catch {
    return empty; // serialization unavailable → no guide (fail safe)
  }

  // Find the cloned cue + object balls by their stable ids.
  let cue = null;
  const objs = [];
  for (const b of clone.bodies) {
    const k = b.userData?._kind;
    if (k === KIND_CUE) cue = b;
    else if (k === KIND_BALL) objs.push(b);
  }
  if (!cue) return empty;

  // Per-ball record: where it started and how it first started moving. `frame`
  // (when it first exceeded the wake threshold) separates balls the cue strikes
  // directly/early from those nudged later down the chain reaction.
  const motion = objs.map((o) => ({
    body: o,
    from: { x: o.position.x, y: o.position.y },
    dir: null,
    frame: -1,
  }));

  // Fire the exact shot the live release() would (impulse = dir·speed·mass).
  const speed = power * MAX_SHOT_SPEED;
  cue.applyImpulse(new Vec2(ux * speed * cue.mass, uy * speed * cue.mass));

  const path = [{ x: cue.position.x, y: cue.position.y }];
  let ghost = null;
  let objectDir = null;

  for (let f = 0; f < PREDICT_FRAMES; f++) {
    clone.step(1 / 60, 8, 3);

    // Apply the same rolling deceleration the demo's step() uses, so the clone
    // slows exactly like the live table.
    for (const b of [cue, ...objs]) {
      const v = b.velocity;
      const s = Math.hypot(v.x, v.y);
      if (s <= ROLL_DECEL) {
        b.velocity = new Vec2(0, 0);
        b.angularVel = 0;
      } else {
        const k = (s - ROLL_DECEL) / s;
        b.velocity = new Vec2(v.x * k, v.y * k);
        b.angularVel *= k;
      }
    }

    if (f % PREDICT_PATH_STEP === 0) path.push({ x: cue.position.x, y: cue.position.y });

    // Record each object ball's launch direction the first frame it wakes.
    for (const m of motion) {
      if (m.frame >= 0) continue;
      const v = m.body.velocity;
      const s = Math.hypot(v.x, v.y);
      if (s > PREDICT_WAKE) {
        m.dir = { x: v.x / s, y: v.y / s };
        m.frame = f;
      }
    }

    // The first ball to move = the contact we draw the cue's ghost for.
    if (!ghost) {
      const first = motion.find((m) => m.frame === f);
      if (first) {
        ghost = { x: cue.position.x, y: cue.position.y };
        objectDir = first.dir;
      }
    }

    // Stop tracing once the cue has come to rest (nothing more to show).
    if (Math.hypot(cue.velocity.x, cue.velocity.y) === 0) {
      path.push({ x: cue.position.x, y: cue.position.y });
      break;
    }
  }

  // Balls that moved → start point + launch direction, ordered by when they
  // moved. The earliest is "primary" (struck by the cue), the rest secondary.
  const moved = motion
    .filter((m) => m.frame >= 0 && m.dir)
    .sort((a, b) => a.frame - b.frame);
  const firstFrame = moved.length ? moved[0].frame : 0;
  const balls = moved.map((m) => ({
    from: m.from,
    dir: m.dir,
    primary: m.frame <= firstFrame + 2, // within ~2 frames of first contact
  }));

  const result = { path, ghost, objectDir, balls };
  _predCache = { key, result };
  return result;
}

function drawPrediction(ctx, pred, col) {
  // Cue path polyline — the real trajectory (bounces and all).
  if (pred.path.length > 1) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pred.path[0].x, pred.path[0].y);
    for (let i = 1; i < pred.path.length; i++) ctx.lineTo(pred.path[i].x, pred.path[i].y);
    ctx.stroke();
  }

  // Every ball the shot sets in motion gets a launch-direction arrow drawn
  // from its own starting position. Balls the cue strikes directly (primary)
  // are bright and full length; balls nudged later down the chain reaction
  // (secondary) are faint and short, so a break reads as "these go roughly
  // here" without the cosmetic clutter implying false precision.
  for (const b of pred.balls) {
    const len = b.primary ? GHOST_LINE_LEN : GHOST_LINE_LEN * 0.5;
    ctx.strokeStyle = b.primary ? "#f2cc60" : "rgba(242,204,96,0.35)";
    ctx.lineWidth = b.primary ? 2 : 1.25;
    ctx.beginPath();
    ctx.moveTo(b.from.x, b.from.y);
    ctx.lineTo(b.from.x + b.dir.x * len, b.from.y + b.dir.y * len);
    ctx.stroke();
  }

  if (!pred.ghost) return;
  const { x: gx, y: gy } = pred.ghost;

  // Ghost ball outline at the moment the cue strikes the first object ball.
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(gx, gy, BALL_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
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

  // Transient status messages — drawn on their own banner row below the HUD
  // bar so they never collide with the left-hand counters. The "how to play"
  // instructions live in the demo description, so we don't repeat them here.
  ctx.textAlign = "center";
  if (_objectBalls.length === 0 && !_cueScratched) {
    drawBanner(ctx, W, "Rack cleared! Re-racking…", "#9be9a8");
  } else if (_cueScratched) {
    drawBanner(ctx, W, "Scratch! cue resets when the table settles", "#f85149");
  }
  ctx.restore();
}

// A centred status banner on its own row, just under the top HUD bar.
function drawBanner(ctx, W, text, color) {
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(W / 2 - w / 2, 36, w, 26);
  ctx.fillStyle = color;
  ctx.fillText(text, W / 2, 53);
}
