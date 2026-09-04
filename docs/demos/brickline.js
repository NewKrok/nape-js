import {
  Body, BodyType, Vec2, Polygon, Material,
  CbType, CbEvent, InteractionType, InteractionListener,
} from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.41.0";

// ---------------------------------------------------------------------------
// Brickline — stack-as-high-as-you-can arcade demo.
//
// A kinematic block slides horizontally above the tower. On click/space the
// block converts to DYNAMIC and falls. The next block spawns higher, matching
// the new stack height. The camera follows the top of the tower up.
// Game-over when any block falls past the floor.
//
// Engine features showcased:
//   * Practical effect of Material.staticFriction on stack stability.
//   * Contact normal stability with stacked polygons.
//   * Kinematic → dynamic conversion to release a controlled body.
//   * Centre-of-mass tracking (tip detection).
//
// Note on Materials: assigning the explicit Material via shape.material = mat
// AFTER construction sidesteps the engine bug where passing Material in the
// Polygon constructor causes dynamic polygons to tunnel through static floors.
// ---------------------------------------------------------------------------

const SCREEN_W = 900;
const SCREEN_H = 500;
const HUD_H = 40;

const FLOOR_Y = SCREEN_H - 30;            // top of the ground in world coords
const FLOOR_H = 60;
const FALL_OFF_Y = SCREEN_H + 80;         // body.y above this = "fell off"

const BRICK_W = 80;
const BRICK_H = 24;
const SLIDER_GAP_ABOVE = 220;             // slider's vertical gap above the stack top (world units)
const SLIDER_SPEED_BASE = 120;            // px / sec at score = 0
const SLIDER_SPEED_GAIN = 8;              // +px/sec per stacked brick (cap below)
const SLIDER_SPEED_MAX = 360;
const SLIDER_MIN_X = 100;
const SLIDER_MAX_X = SCREEN_W - 100;
const RESPAWN_DELAY_STEPS = 25;           // ~0.4s pause before a new slider appears after a drop

// Settle / scoring: a brick counts toward the tower once its position has
// not changed by more than SETTLE_POS_EPS pixels (and its rotation by more
// than SETTLE_ROT_EPS rad) for SETTLE_FRAMES consecutive physics steps —
// OR the engine puts it to sleep (whichever comes first).
//
// We use position deltas, not velocity, because two stacked bricks can
// mutually nudge each other with velocity oscillations of |vx|+|vy| ≈ 10-15
// even when their actual position is rock-solid (a 12px/sec velocity is
// only 0.2 pixels per 60Hz step — visually motionless). A pure speed-based
// threshold either rejects valid stacks or accepts moving bricks, depending
// on where you draw the line.
const SETTLE_POS_EPS = 0.5;             // pixels per step
const SETTLE_ROT_EPS = 0.01;            // radians per step
const SETTLE_FRAMES = 30;

// "Missed the stack" detection runs off an InteractionListener tied to a
// dedicated sensor body sitting just above the floor surface. Every non-seed
// brick carries the _cbBrick CbType; the seed brick (first drop after a
// reset) does not, so it lands on the floor without firing the listener.
// Using a sensor + listener rather than per-step interactingBodies() polling
// is essential: a brick that settles instantly falls asleep, and a sleeping
// body has no live arbiters — polling would silently miss the contact.

// Tip detection on a settled brick (above the seed): requires BOTH a drop
// past TIP_FALL_PX AND a tilt past TIP_ANGLE_RAD, so natural settling under
// load (small tilt, small drift) doesn't trigger. A brick that actually
// breaks off the tower drops AND rotates. The floor-touch check is the
// primary collapse signal — this catches the in-air break before contact.
const TIP_FALL_PX = 24;
const TIP_ANGLE_RAD = Math.PI / 4; // 45°

// Visual: the brick palette index rotates per drop so the stack stripes look
// like alternating courses of masonry.
const STRIPE_PALETTE = [0, 1, 2, 4];

// Brick Material — high static friction, very low restitution. The whole
// point of the demo is to show that high staticFriction keeps stacked polygons
// from sliding/wobbling even at the top of a tall tower.
const BRICK_RESTITUTION = 0.0;
const BRICK_DYN_FRICTION = 0.9;
const BRICK_STATIC_FRICTION = 1.4;
const BRICK_DENSITY = 1.0;

// Camera framing: keep the midpoint between the slider and stack top roughly
// at this screen y. Increasing pushes the action toward the bottom of the view.
const CAMERA_TARGET_Y = SCREEN_H / 2;

// Restart cooldown so the click that ends the run doesn't immediately restart.
const RESTART_LOCK_STEPS = 60;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _space = null;
let _runner = null;
let _floor = null;
let _floorSensor = null;                  // STATIC sensor body just above the floor
let _slider = null;                       // KINEMATIC brick currently moving
let _sliderDir = 1;                       // +1 right, -1 left
let _stack = [];                          // settled bricks — { body, settledY } for tip detection
let _falling = [];                        // dropped bricks not yet settled — { body, frames, settled }
let _stackTopWorldY = FLOOR_Y;            // top of the highest settled brick (world y, smaller = higher)
let _score = 0;
let _highScore = 0;
let _gameOver = false;
let _restartLockTimer = 0;
let _flashTimer = 0;
let _dropPaletteIdx = 0;
let _respawnTimer = 0;                    // steps remaining until the next slider appears

// Sensor-based floor detection. Every non-seed brick that overlaps the floor
// sensor triggers game-over via an InteractionListener. The seed brick is
// distinguished by carrying a different CbType so the listener can ignore it.
const _cbBrick = new CbType();            // tagged on every non-seed brick shape
const _cbFloorSensor = new CbType();      // tagged on the floor's sensor shape

let _lastKeyDown = null;

// ---------------------------------------------------------------------------
// World setup
// ---------------------------------------------------------------------------

function makeBrickMaterial() {
  return new Material(BRICK_RESTITUTION, BRICK_DYN_FRICTION, BRICK_STATIC_FRICTION, BRICK_DENSITY);
}

function spawnFloor() {
  const floor = new Body(BodyType.STATIC, new Vec2(SCREEN_W / 2, FLOOR_Y + FLOOR_H / 2));
  floor.shapes.add(new Polygon(Polygon.box(SCREEN_W * 4, FLOOR_H)));
  // Default Material on the floor is fine; bricks bring their own friction.
  try { floor.userData._colorIdx = 5; } catch (_) { /* userData may be frozen */ }
  try { floor.userData._kind = "floor"; } catch (_) { /* same */ }
  floor.space = _space;
  return floor;
}

// Static sensor body positioned just above the floor surface. Any brick that
// overlaps it fires the BEGIN listener, even after the brick falls asleep —
// InteractionListener with allowSleepingCallbacks=true keeps sensor callbacks
// flowing for sleeping bodies, which body.interactingBodies() does not.
function spawnFloorSensor() {
  const SENSOR_H = 8;
  const sensor = new Body(
    BodyType.STATIC,
    new Vec2(SCREEN_W / 2, FLOOR_Y - SENSOR_H / 2 + 1),
  );
  const shape = new Polygon(Polygon.box(SCREEN_W * 4, SENSOR_H));
  shape.sensorEnabled = true;
  shape.cbTypes.add(_cbFloorSensor);
  sensor.shapes.add(shape);
  sensor.space = _space;
  return sensor;
}

// Spawn the kinematic slider at the nominal gap above the current stack top.
// The slider's y is fixed for its whole lifetime — stepSlider() only updates
// x — so the brick always falls from the same screen height (no upward
// drift across drops).
//
// Each post-drop respawn picks a random x and random direction so the player
// can't game the run by mashing the click button at a fixed cadence: the
// brick re-enters from somewhere fresh every time.
function spawnSlider(randomStart) {
  const targetWorldY = topWorldY() - SLIDER_GAP_ABOVE;
  let startX = SCREEN_W / 2;
  if (randomStart) {
    startX = SLIDER_MIN_X + Math.random() * (SLIDER_MAX_X - SLIDER_MIN_X);
    _sliderDir = Math.random() < 0.5 ? -1 : 1;
  }
  const body = new Body(BodyType.KINEMATIC, new Vec2(startX, targetWorldY));
  const shape = new Polygon(Polygon.box(BRICK_W, BRICK_H));
  // Material can be assigned now — Kinematic→Dynamic conversion preserves it.
  shape.material = makeBrickMaterial();
  // Tag non-seed bricks so the floor sensor's BEGIN listener can spot them.
  // The seed brick (first drop after a reset, _dropPaletteIdx === 0) is
  // allowed to land on the floor, so it doesn't carry the brick CbType.
  if (_dropPaletteIdx > 0) shape.cbTypes.add(_cbBrick);
  body.shapes.add(shape);
  try { body.userData._colorIdx = STRIPE_PALETTE[_dropPaletteIdx % STRIPE_PALETTE.length]; } catch (_) { /* userData may be frozen */ }
  try { body.userData._kind = "brick"; } catch (_) { /* same */ }
  body.space = _space;
  body.velocity = new Vec2(sliderSpeed() * _sliderDir, 0);
  return body;
}

function sliderSpeed() {
  return Math.min(SLIDER_SPEED_MAX, SLIDER_SPEED_BASE + _score * SLIDER_SPEED_GAIN);
}

// Y (world) of the current stack top — bricks are dropped above this.
function topWorldY() {
  return _stackTopWorldY;
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

function clearWorld() {
  if (_slider && _slider.space) _slider.space = null;
  _slider = null;
  for (const s of _stack) if (s.body.space) s.body.space = null;
  _stack.length = 0;
  for (const f of _falling) if (f.body.space) f.body.space = null;
  _falling.length = 0;
  if (_floor && _floor.space) _floor.space = null;
  _floor = null;
  if (_floorSensor && _floorSensor.space) _floorSensor.space = null;
  _floorSensor = null;
  _stackTopWorldY = FLOOR_Y;
  _score = 0;
  _gameOver = false;
  _restartLockTimer = 0;
  _flashTimer = 0;
  _dropPaletteIdx = 0;
  _sliderDir = 1;
  _respawnTimer = 0;
}

function resetGame() {
  clearWorld();
  _floor = spawnFloor();
  _floorSensor = spawnFloorSensor();
  _slider = spawnSlider();
}

// Drop the current slider: convert KINEMATIC → DYNAMIC, zero velocity (so
// the brick falls straight down), and remove the slider from play. A new
// slider spawns after RESPAWN_DELAY_STEPS — this gap prevents the new
// KINEMATIC slider from colliding with the still-falling DYNAMIC brick at
// the same spawn point, which previously shoved the brick sideways.
function dropSlider() {
  if (!_slider || _gameOver) return;
  _slider.type = BodyType.DYNAMIC;
  _slider.velocity = new Vec2(0, 0);
  _slider.angularVel = 0;
  _falling.push({
    body: _slider,
    frames: 0,
    settled: false,
    lastY: _slider.position.y,
    lastRot: _slider.rotation,
  });
  _dropPaletteIdx++;
  _slider = null;
  _respawnTimer = RESPAWN_DELAY_STEPS;
}

// Update slider position each step. We do this in step() (not via kinematic
// velocity alone) so reversal at the edges is exact and predictable. The
// slider's y is left at whatever spawnSlider() chose, so the drop height
// stays constant for the slider's whole lifetime.
function stepSlider(dt) {
  if (!_slider) return;
  const speed = sliderSpeed();
  const p = _slider.position;
  let nx = p.x + _sliderDir * speed * dt;
  if (nx > SLIDER_MAX_X) {
    nx = SLIDER_MAX_X;
    _sliderDir = -1;
  } else if (nx < SLIDER_MIN_X) {
    nx = SLIDER_MIN_X;
    _sliderDir = 1;
  }
  _slider.position = new Vec2(nx, p.y);
  _slider.velocity = new Vec2(_sliderDir * speed, 0);
}

// Walk the falling list and promote settled bricks into the stack. The
// "missed the stack" detection lives in the InteractionListener set up in
// setup() — a brick overlapping the floor sensor fires game-over directly.
//
// Settle detection uses position-delta + isSleeping. Velocity is unreliable
// because two stacked bricks can keep nudging each other with |v| ≈ 10 even
// when their actual world position is motionless. The brick is considered
// stable for the current step if EITHER:
//   * its position hasn't moved more than SETTLE_POS_EPS pixels and its
//     rotation hasn't changed more than SETTLE_ROT_EPS rad since the last
//     step — actual visual motionlessness, AND
//   * the engine reports body.isSleeping (definitive resting state).
// We promote to _stack after SETTLE_FRAMES stable steps or immediately on
// sleep.
function updateFalling() {
  for (let i = _falling.length - 1; i >= 0; i--) {
    const f = _falling[i];
    const b = f.body;
    if (!b.space) {
      _falling.splice(i, 1);
      continue;
    }
    // Belt-and-braces: if a brick somehow falls past the fall-off line
    // without ever overlapping the sensor (shouldn't happen, but a static
    // sensor that didn't update during the step would let this slip).
    if (b.position.y > FALL_OFF_Y) {
      triggerGameOver();
      return;
    }
    const angle = Math.abs(normalizeAngle(b.rotation));
    const dy = Math.abs(b.position.y - f.lastY);
    const drot = Math.abs(b.rotation - f.lastRot);
    const stable = dy < SETTLE_POS_EPS && drot < SETTLE_ROT_EPS;
    const asleep = b.isSleeping;
    f.lastY = b.position.y;
    f.lastRot = b.rotation;
    if (asleep || stable) f.frames++;
    else f.frames = 0;
    const settled = asleep || f.frames >= SETTLE_FRAMES;
    if (settled && !f.settled) {
      if (angle > TIP_ANGLE_RAD) {
        triggerGameOver();
        return;
      }
      f.settled = true;
      _stack.push({ body: b, settledY: b.position.y });
      _score++;
      if (_score > _highScore) _highScore = _score;
      const topOfBrick = b.position.y - BRICK_H / 2;
      if (topOfBrick < _stackTopWorldY) _stackTopWorldY = topOfBrick;
      _falling.splice(i, 1);
    }
  }
}

// Game-over also fires when a settled brick later tips off the tower. The
// floor-sensor listener catches "fell to the floor" cases; here we only need
// the in-air break: a brick that has dropped meaningfully below its settled
// y AND rotated past horizontal has separated from the tower mid-collapse.
function checkStackIntegrity() {
  if (_stack.length === 0) return;
  for (let i = _stack.length - 1; i >= 1; i--) {
    const s = _stack[i];
    const b = s.body;
    if (!b.space) continue;
    if (b.position.y > FALL_OFF_Y) {
      triggerGameOver();
      return;
    }
    const dropped = b.position.y - s.settledY;
    const angle = Math.abs(normalizeAngle(b.rotation));
    if (dropped > TIP_FALL_PX && angle > TIP_ANGLE_RAD) {
      triggerGameOver();
      return;
    }
  }
}

// Wrap an angle into [-π, π] so we can compare against TIP_ANGLE_RAD without
// false positives near ±2π.
function normalizeAngle(a) {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  else if (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function triggerGameOver() {
  if (_gameOver) return;
  _gameOver = true;
  _flashTimer = 18;
  _restartLockTimer = RESTART_LOCK_STEPS;
  if (_runner && typeof _runner.shakeCamera === "function") {
    _runner.shakeCamera(10, 0.4);
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "brickline",
  label: "Brickline",
  tags: ["Stacking", "Friction", "Camera", "Click", "Gameplay"],
  featured: false,
  desc:
    "Stack-as-high-as-you-can arcade demo. A <b>KINEMATIC</b> brick slides above the tower; " +
    "<b>click / Space</b> converts it to <b>DYNAMIC</b> so it drops onto the stack. " +
    "Stability comes purely from rigid-body contact and high <b>Material.staticFriction</b>. " +
    "Drop a brick too far off-centre and the tower tips. Camera follows the stack top up. " +
    "Showcases <b>kinematic → dynamic conversion</b>, friction-only stacking, and centre-of-mass tipping.",
  walls: false,
  workerCompatible: false,

  camera: null,

  setup(space) {
    _space = space;
    _runner = this._runner ?? null;
    space.gravity = new Vec2(0, 900);

    // Floor-sensor listener: a non-seed brick overlapping the sensor strip is
    // an instant tip-out. allowSleepingCallbacks=true so a brick that lands
    // and immediately falls asleep still triggers (sleeping bodies drop
    // arbiters, but the sensor BEGIN fires before that happens).
    const tipOutListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      _cbBrick,
      _cbFloorSensor,
      () => { triggerGameOver(); },
    );
    tipOutListener.allowSleepingCallbacks = true;
    space.listeners.add(tipOutListener);

    resetGame();

    // Camera follow: the focus point is the midpoint between the stack top
    // and the slider. We expose it via a synthetic object whose `.position`
    // is recomputed each frame by the runner reading `follow()`.
    this.camera = {
      follow: () => {
        const stackTop = topWorldY();
        const sliderY = _slider ? _slider.position.y : (stackTop - SLIDER_GAP_ABOVE);
        const focusY = (sliderY + stackTop) / 2;
        return new Vec2(SCREEN_W / 2, focusY);
      },
      offsetX: 0,
      offsetY: SCREEN_H / 2 - CAMERA_TARGET_Y,
      // No bounds — let the camera follow the tower up without clamping.
      lerp: 0.12,
    };

    // Keyboard support — Space drops, also restarts on game-over.
    if (typeof window !== "undefined") {
      if (_lastKeyDown) window.removeEventListener("keydown", _lastKeyDown);
      _lastKeyDown = (e) => {
        if (e.code !== "Space" && e.code !== "Enter") return;
        e.preventDefault();
        if (_gameOver) {
          if (_restartLockTimer <= 0) resetGame();
        } else {
          dropSlider();
        }
      };
      window.addEventListener("keydown", _lastKeyDown);
    }
  },

  step() {
    if (_flashTimer > 0) _flashTimer--;
    if (_restartLockTimer > 0) _restartLockTimer--;
    if (_gameOver) return;

    if (_respawnTimer > 0) {
      _respawnTimer--;
      if (_respawnTimer === 0 && !_slider) _slider = spawnSlider(true);
    }

    stepSlider(1 / 60);
    updateFalling();
    checkStackIntegrity();
  },

  click() {
    if (_gameOver) {
      if (_restartLockTimer <= 0) resetGame();
      return;
    }
    dropSlider();
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);
    drawGuideLine(ctx, camX, camY, W);
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);
    ctx.restore();

    drawFlash(ctx, W, H);
    drawHUD(ctx, W, H);
  },

  // Pixi/three.js use default body rendering for bricks + floor. The HUD,
  // flash, and guide-line are drawn via the overlay canvas2d context.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGuideLine(ctx, camX, camY, W);
    ctx.restore();
    drawFlash(ctx, W, H);
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Overlay rendering — guide line + HUD + crash flash
// ---------------------------------------------------------------------------

// Vertical guide line under the slider — helps players line up the drop with
// the centre of the stack top.
function drawGuideLine(ctx, camX, camY, W) {
  if (!_slider || _gameOver) return;
  const sx = _slider.position.x;
  const topY = topWorldY();
  ctx.strokeStyle = "rgba(88,166,255,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(sx, _slider.position.y + BRICK_H / 2);
  ctx.lineTo(sx, topY);
  ctx.stroke();
  ctx.setLineDash([]);
  // Suppress unused linter complaints for camX/camY/W — they're part of the
  // overlay signature the runner uses for other demos.
  void camX; void camY; void W;
}

function drawFlash(ctx, W, H) {
  if (_flashTimer <= 0) return;
  const a = (_flashTimer / 18) * 0.6;
  ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
}

function drawHUD(ctx, W, H) {
  ctx.fillStyle = "rgba(13,17,23,0.85)";
  ctx.fillRect(0, 0, W, HUD_H);

  ctx.fillStyle = "#c9d1d9";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Score ${_score}`, 16, HUD_H / 2);

  ctx.textAlign = "right";
  ctx.fillStyle = "#8b949e";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(`Best ${_highScore}`, W - 16, HUD_H / 2);

  ctx.textAlign = "center";
  ctx.fillStyle = "#58a6ff";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("Click / Space to drop", W / 2, HUD_H / 2);

  if (_gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Toppled", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(`Score ${_score}  ·  Best ${_highScore}`, W / 2, H / 2 + 6);
    if (_restartLockTimer > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("Restarting…", W / 2, H / 2 + 32);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("Click / tap or press Space to restart", W / 2, H / 2 + 32);
    }
  }
}
