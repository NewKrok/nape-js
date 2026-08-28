import {
  Body, BodyType, Vec2, Circle, Polygon, Material, InteractionFilter,
  CbType, CbEvent, InteractionType, InteractionListener,
} from "../nape-js.esm.js?v=3.40.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.40.0";

// ---------------------------------------------------------------------------
// Constants — module-level so the codepen extractor picks them up.
// SCREEN_W/SCREEN_H avoid colliding with the CodePen runner's `W`/`H`.
// ---------------------------------------------------------------------------

const SCREEN_W = 900;
const SCREEN_H = 500;
const PLAYER_R = 12;
const SCROLL_VX = 220;             // constant horizontal player velocity
const THRUST = 1300;               // upward force while held (per step)
const GRAVITY_Y = 900;
const SEG_W = 40;                  // width of one ceiling/floor segment
const CHUNK_BACKLOG = 6;           // segments to keep behind the player
const SPAWN_AHEAD_PX = 1200;       // generate this far past player.x
const MARGIN_TOP = 30;             // never let the tunnel close the top
const MARGIN_BOT = 30;
const BASE_GAP = 260;              // starting gap height
const MIN_GAP = 130;               // hardest gap height
const DIFFICULTY_PX = 7000;        // distance over which gap shrinks to min
const HUD_H = 40;
const RESTART_LOCK_STEPS = 180;    // 3s at 60Hz — prevent accidental restarts

// Dragon tail — purely visual. A short ring buffer of head positions sampled
// each physics step; render() draws them as tapered circles behind the head.
// No physics, no joints, no back-reaction on the player.
const TAIL_COUNT = 10;             // number of trail circles drawn
const TAIL_SAMPLE_GAP = 2;         // sample every Nth step (2 = every 2 steps)

// Collision-filter groups (bits, OR-combined into the filter's group field).
// Default everything else is group=1 (the engine default). Used so star debris
// can hit the walls but pass through the player.
const PLAYER_GROUP = 2;
const DEBRIS_GROUP = 4;

// Collectible stars
const STAR_R = 10;                 // pickup sensor radius
const STAR_EVERY_PX = 140;         // average distance between consecutive stars
const STAR_JITTER = 60;            // ±jitter on placement
const DEBRIS_COUNT = 8;            // shards per collected star
const DEBRIS_LIFE = 75;            // physics steps before a shard is despawned
const DEBRIS_SIZE = 5;

// Difficulty zones (lo bound in px from start → palette idx for tunnel walls)
// 1 = gold, 5 = lavender pink — we ramp through warm hues as difficulty rises.
function wallColorIdx(playerProgressPx) {
  if (playerProgressPx < 2000) return 1;       // gold
  if (playerProgressPx < 4500) return 4;       // purple (warning)
  return 3;                                    // red (danger)
}

const KEY_THRUST = (e) => e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let _space = null;
let _player = null;
let _cbPlayer = null;
let _cbWall = null;
let _segments = [];                // { x, body, isCeiling }
let _nextSegX = 0;                 // next world-X to spawn at
let _noise = null;                 // smoothed centerline noise state
let _startX = 0;
let _score = 0;
let _highScore = 0;
let _gameOver = false;
let _thrustHeld = false;
let _keys = {};
let _trail = [];                   // recent head positions: [{ x, y }, ...] newest first
let _stepCount = 0;                // throttles trail sampling
let _stars = [];                   // collectible star bodies
let _nextStarX = 0;                // next world-x to spawn a star at
let _cbStar = null;
let _cbDebris = null;
let _debris = [];                  // { body, life } — animated shards
let _flashTimer = 0;               // crash flash overlay countdown (steps)
let _restartLockTimer = 0;         // physics steps until restart input is accepted
let _bonusScore = 0;               // points from star pickups (folded into _score)
let _runner = null;                // reference to demo runner for shakeCamera()

// ---------------------------------------------------------------------------
// Procedural centerline — smooth random walk so neighboring segments line up.
// Two layered sines + a slow random drift so the tunnel undulates and shifts.
// ---------------------------------------------------------------------------

function makeNoise(seed) {
  return {
    seed,
    drift: 0,
    driftVel: 0,
  };
}

function centerlineAt(x) {
  const baseY = HUD_H + (SCREEN_H - HUD_H) / 2;
  const wave =
    Math.sin(x * 0.004 + _noise.seed) * 70 +
    Math.sin(x * 0.011 + _noise.seed * 1.7) * 28 +
    Math.sin(x * 0.025 + _noise.seed * 2.3) * 10;
  return baseY + wave + _noise.drift;
}

function gapAt(x) {
  const t = Math.min(1, Math.max(0, (x - _startX) / DIFFICULTY_PX));
  return BASE_GAP + (MIN_GAP - BASE_GAP) * t;
}

// ---------------------------------------------------------------------------
// Segment spawning — build a top quad (ceiling) and a bottom quad (floor)
// for one SEG_W slice. Top extends from y=HUD_H upward off-screen, bottom from
// y=SCREEN_H downward off-screen, so the player can't escape vertically.
// ---------------------------------------------------------------------------

function spawnSegmentAt(x) {
  const x1 = x + SEG_W;

  const c0 = centerlineAt(x);
  const c1 = centerlineAt(x1);
  const g0 = gapAt(x) / 2;
  const g1 = gapAt(x1) / 2;

  const topY0 = clamp(c0 - g0, HUD_H + MARGIN_TOP, SCREEN_H - MARGIN_BOT);
  const topY1 = clamp(c1 - g1, HUD_H + MARGIN_TOP, SCREEN_H - MARGIN_BOT);
  const botY0 = clamp(c0 + g0, HUD_H + MARGIN_TOP, SCREEN_H - MARGIN_BOT);
  const botY1 = clamp(c1 + g1, HUD_H + MARGIN_TOP, SCREEN_H - MARGIN_BOT);

  const colorIdx = wallColorIdx(x - _startX);

  // Ceiling polygon: top edge well off-screen so the bbox is convex and tall.
  const top = new Body(BodyType.STATIC, new Vec2(0, 0));
  top.shapes.add(new Polygon([
    new Vec2(x,  HUD_H - 400),
    new Vec2(x1, HUD_H - 400),
    new Vec2(x1, topY1),
    new Vec2(x,  topY0),
  ]));
  try { top.userData._colorIdx = colorIdx; } catch (_) { /* userData may be frozen */ }
  try { top.userData._kind = "wall"; } catch (_) { /* same */ }
  if (_cbWall) top.cbTypes.add(_cbWall);
  top.space = _space;

  // Floor polygon
  const bot = new Body(BodyType.STATIC, new Vec2(0, 0));
  bot.shapes.add(new Polygon([
    new Vec2(x,  botY0),
    new Vec2(x1, botY1),
    new Vec2(x1, SCREEN_H + 400),
    new Vec2(x,  SCREEN_H + 400),
  ]));
  try { bot.userData._colorIdx = colorIdx; } catch (_) { /* same */ }
  try { bot.userData._kind = "wall"; } catch (_) { /* same */ }
  if (_cbWall) bot.cbTypes.add(_cbWall);
  bot.space = _space;

  _segments.push({ x, body: top });
  _segments.push({ x, body: bot });
}

// Drop a sensor-only star somewhere in the current tunnel slice. The sensor's
// BEGIN listener increments score and spawns shards.
function spawnStarAt(x) {
  const c = centerlineAt(x);
  // Bias toward the centerline but keep it inside the gap with a margin.
  const gap = gapAt(x);
  const jitterRange = Math.max(0, gap / 2 - STAR_R - 8);
  const y = c + (Math.random() * 2 - 1) * jitterRange;

  const body = new Body(BodyType.STATIC, new Vec2(x, y));
  const shape = new Circle(STAR_R);
  shape.sensorEnabled = true;
  shape.cbTypes.add(_cbStar);
  body.shapes.add(shape);
  // Custom rendering — hide from default body renderer; we draw a star shape.
  try { body.userData._hidden = true; } catch (_) { /* userData may be frozen */ }
  try { body.userData._kind = "star"; } catch (_) { /* same */ }
  body.space = _space;
  _stars.push(body);
}

// Spawn DEBRIS_COUNT small dynamic shards at (x, y). They collide with the
// walls but pass through the player (different collision group).
function spawnStarDebris(x, y) {
  const filter = new InteractionFilter(DEBRIS_GROUP, ~PLAYER_GROUP);
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    const angle = (i / DEBRIS_COUNT) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 180 + Math.random() * 140;
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    const s = DEBRIS_SIZE + Math.random() * 2;
    // Small triangle so the shards look like broken star points (no Material
    // — explicit Material + Polygon has the known tunneling bug from MEMORY).
    b.shapes.add(new Polygon([
      new Vec2(-s, s * 0.6),
      new Vec2(s, s * 0.6),
      new Vec2(0, -s),
    ], undefined, undefined, filter));
    b.velocity = new Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed - 80);
    b.angularVel = (Math.random() * 2 - 1) * 8;
    if (_cbDebris) b.cbTypes.add(_cbDebris);
    try { b.userData._colorIdx = 1; } catch (_) { /* userData may be frozen */ }
    try { b.userData._kind = "debris"; } catch (_) { /* same */ }
    b.space = _space;
    _debris.push({ body: b, life: DEBRIS_LIFE });
  }
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function clearWorld() {
  for (const s of _segments) {
    if (s.body.space) s.body.space = null;
  }
  _segments.length = 0;
  for (const star of _stars) {
    if (star.space) star.space = null;
  }
  _stars.length = 0;
  for (const d of _debris) {
    if (d.body.space) d.body.space = null;
  }
  _debris.length = 0;
  _trail.length = 0;
  _stepCount = 0;
  _bonusScore = 0;
  _flashTimer = 0;
  _restartLockTimer = 0;
  if (_player && _player.space) _player.space = null;
  _player = null;
}

function spawnPlayer() {
  const startY = HUD_H + (SCREEN_H - HUD_H) / 2;
  const body = new Body(BodyType.DYNAMIC, new Vec2(120, startY));
  const playerFilter = new InteractionFilter(PLAYER_GROUP, -1);
  body.shapes.add(new Circle(PLAYER_R, undefined, new Material(0, 0.2, 0.2, 1), playerFilter));
  body.allowRotation = false;
  body.isBullet = true;            // CCD — the player moves fast and the tunnel is narrow
  try { body.userData._colorIdx = 3; } catch (_) { /* userData may be frozen */ }
  try { body.userData._kind = "player"; } catch (_) { /* same */ }
  if (_cbPlayer) body.cbTypes.add(_cbPlayer);
  body.space = _space;
  body.velocity = new Vec2(SCROLL_VX, 0);
  return body;
}

// Sample head position into the trail ring buffer. Called every step; newest
// position lives at index 0, oldest at the end.
function sampleTrail() {
  if (!_player) return;
  if (_stepCount++ % TAIL_SAMPLE_GAP !== 0) return;
  _trail.unshift({ x: _player.position.x, y: _player.position.y });
  if (_trail.length > TAIL_COUNT) _trail.length = TAIL_COUNT;
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

function resetGame() {
  clearWorld();
  _noise = makeNoise(Math.random() * 1000);
  _score = 0;
  _gameOver = false;
  _player = spawnPlayer();
  _startX = _player.position.x;
  _nextSegX = Math.floor(_startX / SEG_W) * SEG_W - CHUNK_BACKLOG * SEG_W;
  // First star is a bit ahead so the player has time to see it spawn in.
  _nextStarX = _startX + STAR_EVERY_PX + (Math.random() - 0.5) * STAR_JITTER;

  // Pre-fill the visible tunnel so the player doesn't fly into emptiness.
  const fillUntil = _startX + SPAWN_AHEAD_PX;
  while (_nextSegX < fillUntil) {
    spawnSegmentAt(_nextSegX);
    _nextSegX += SEG_W;
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "wyrm",
  label: "Wyrm",
  tags: ["Gameplay", "Procedural", "Camera", "Callbacks", "Sensors"],
  featured: false,
  desc:
    "A one-button endless runner. <b>Hold Space</b> (or tap & hold) to thrust upward, " +
    "release to fall. The tunnel of static <b>Polygon</b> strips is generated ahead of " +
    "the player and culled behind. Grab <b>★ stars</b> for points — sensor-only bodies " +
    "that burst into dynamic shards on pickup (the shards collide with the walls but " +
    "pass through you via collision filters). Showcases per-frame <b>body.force</b>, " +
    "camera follow + shake on crash, parallax background, procedural spawn/cleanup, " +
    "and <b>SENSOR</b>-mode InteractionListeners.",
  walls: false,
  workerCompatible: false,

  camera: null,

  setup(space) {
    _space = space;
    _runner = this._runner ?? null;
    space.gravity = new Vec2(0, GRAVITY_Y);

    _cbPlayer = new CbType();
    _cbWall = new CbType();
    _cbStar = new CbType();
    _cbDebris = new CbType();

    // Player ↔ wall = death. The runner can't notify us on demo unload, so we
    // tolerate setup() being called again later (everything is re-created).
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.COLLISION, _cbPlayer, _cbWall,
      () => {
        if (_gameOver) return;
        _gameOver = true;
        _flashTimer = 18;
        _restartLockTimer = RESTART_LOCK_STEPS;
        if (_runner && typeof _runner.shakeCamera === "function") {
          _runner.shakeCamera(14, 0.45);
        }
      },
    ));

    // Player ↔ star sensor = pickup + shards. SENSOR interactions don't push
    // bodies — the listener just consumes the star and spawns debris.
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN, InteractionType.SENSOR, _cbPlayer, _cbStar,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body ?? null;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body ?? null;
        const star = _stars.includes(b1) ? b1 : (_stars.includes(b2) ? b2 : null);
        if (!star || !star.space) return;
        _bonusScore += 100;
        spawnStarDebris(star.position.x, star.position.y);
        star.space = null;
        const idx = _stars.indexOf(star);
        if (idx >= 0) _stars.splice(idx, 1);
      },
    ));

    resetGame();

    // Camera: follow the player, lock vertical scroll to the playfield so the
    // tunnel stays framed even when the player rides the ceiling or floor.
    this.camera = {
      follow: () => (_player ? _player.position : null),
      offsetX: SCREEN_W * 0.25,    // keep the player on the left third
      offsetY: SCREEN_H / 2 - (HUD_H + (SCREEN_H - HUD_H) / 2),
      bounds: { minX: -SCREEN_W, minY: 0, maxX: 1e9, maxY: SCREEN_H },
      lerp: 0.15,
    };

    // Keyboard. Listeners are window-level so we record handlers on the demo
    // module-state and replace them on each setup() — preventing duplicates
    // across resets without needing a runner teardown hook.
    if (typeof window !== "undefined") {
      if (_lastKeyDown) window.removeEventListener("keydown", _lastKeyDown);
      if (_lastKeyUp) window.removeEventListener("keyup", _lastKeyUp);
      _lastKeyDown = (e) => {
        _keys[e.code] = true;
        if (KEY_THRUST(e)) {
          _thrustHeld = true;
          e.preventDefault();
        }
        if (_gameOver && _restartLockTimer <= 0 && (e.code === "Space" || e.code === "Enter")) {
          resetGame();
        }
      };
      _lastKeyUp = (e) => {
        _keys[e.code] = false;
        if (KEY_THRUST(e)) _thrustHeld = false;
      };
      window.addEventListener("keydown", _lastKeyDown);
      window.addEventListener("keyup", _lastKeyUp);
    }
  },

  step(space) {
    if (!_player) return;
    if (_flashTimer > 0) _flashTimer--;
    if (_restartLockTimer > 0) _restartLockTimer--;

    if (_gameOver) {
      // Freeze the player on game-over so the camera doesn't sail off-screen.
      _player.velocity = new Vec2(0, 0);
      _player.force = new Vec2(0, 0);
      // Debris continues to fall after death — it's part of the spectacle.
      stepDebris();
      return;
    }

    // Hold horizontal velocity constant — the player can only fight gravity.
    const v = _player.velocity;
    _player.velocity = new Vec2(SCROLL_VX, v.y);

    // body.force persists across steps; assign each frame so releasing the
    // thrust key really cuts force to zero.
    _player.force = new Vec2(0, _thrustHeld ? -THRUST : 0);

    sampleTrail();

    // Score = distance travelled in pixels / 10
    _score = Math.max(0, Math.floor((_player.position.x - _startX) / 10)) + _bonusScore;
    if (_score > _highScore) _highScore = _score;

    // Generate tunnel ahead
    const ahead = _player.position.x + SPAWN_AHEAD_PX;
    while (_nextSegX < ahead) {
      spawnSegmentAt(_nextSegX);
      _nextSegX += SEG_W;
    }

    // Spawn stars on a noisy pace
    while (_nextStarX < ahead - 200) {
      spawnStarAt(_nextStarX);
      _nextStarX += STAR_EVERY_PX + (Math.random() - 0.5) * STAR_JITTER;
    }

    // Cull tunnel behind
    const behindX = _player.position.x - CHUNK_BACKLOG * SEG_W * 4;
    for (let i = _segments.length - 1; i >= 0; i--) {
      const s = _segments[i];
      if (s.x + SEG_W < behindX) {
        if (s.body.space) s.body.space = null;
        _segments.splice(i, 1);
      }
    }

    // Cull missed stars behind
    for (let i = _stars.length - 1; i >= 0; i--) {
      if (_stars[i].position.x < behindX) {
        if (_stars[i].space) _stars[i].space = null;
        _stars.splice(i, 1);
      }
    }

    stepDebris();
  },

  click() {
    if (_gameOver) {
      if (_restartLockTimer <= 0) resetGame();
      return;
    }
    _thrustHeld = true;
  },

  release() {
    _thrustHeld = false;
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGrid(ctx, W, H, camX, camY);
    drawTrail(ctx);
    for (const body of space.bodies) drawBody(ctx, body, showOutlines);
    drawStars(ctx);
    ctx.restore();

    drawFlash(ctx, W, H);
    drawHUD(ctx, W, H);
  },

  // Pixi and three.js modes use default body rendering for the player + walls
  // + debris (they're real bodies). The trail, stars and HUD go through
  // render3dOverlay so they sit on top of the WebGL viewport.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    drawTrail(ctx);
    drawStars(ctx);
    ctx.restore();
    drawFlash(ctx, W, H);
    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Debris lifecycle — count down `life` and despawn at zero
// ---------------------------------------------------------------------------

function stepDebris() {
  for (let i = _debris.length - 1; i >= 0; i--) {
    const d = _debris[i];
    d.life--;
    if (d.life <= 0) {
      if (d.body.space) d.body.space = null;
      _debris.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Trail — render-only dragon body
// ---------------------------------------------------------------------------

function drawTrail(ctx) {
  if (_trail.length === 0) return;
  // Iterate oldest → newest so the head's circle (drawn separately by drawBody)
  // overlaps cleanly on top.
  for (let i = _trail.length - 1; i >= 0; i--) {
    const p = _trail[i];
    const t = i / Math.max(1, TAIL_COUNT - 1);   // 0 at head, 1 at tail tip
    const r = PLAYER_R * (1 - t * 0.6);
    const alpha = 0.85 * (1 - t * 0.85);
    ctx.fillStyle = `rgba(248, 81, 73, ${alpha.toFixed(3)})`; // matches _colorIdx=3 red
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Stars — five-pointed gold stars at sensor body positions, slowly spinning
// ---------------------------------------------------------------------------

function drawStars(ctx) {
  if (_stars.length === 0) return;
  const t = performance.now() * 0.003;
  for (const star of _stars) {
    drawFivePointStar(ctx, star.position.x, star.position.y, STAR_R, STAR_R * 0.42, t);
  }
}

function drawFivePointStar(ctx, cx, cy, outerR, innerR, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 196, 64, 0.95)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 234, 150, 1)";
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Flash — short white overlay triggered on crash
// ---------------------------------------------------------------------------

function drawFlash(ctx, W, H) {
  if (_flashTimer <= 0) return;
  const a = _flashTimer / 18 * 0.6;
  ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------
// HUD — score banner + game-over panel
// ---------------------------------------------------------------------------

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
  ctx.fillText("Hold Space / tap to thrust", W / 2, HUD_H / 2);

  if (_gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f85149";
    ctx.font = "bold 36px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Crashed", W / 2, H / 2 - 24);
    ctx.fillStyle = "#c9d1d9";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(`Score ${_score}  ·  Best ${_highScore}`, W / 2, H / 2 + 6);
    if (_restartLockTimer > 0) {
      const secs = Math.ceil(_restartLockTimer / 60);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(`Restart in ${secs}…`, W / 2, H / 2 + 32);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("Click / tap or press Space to restart", W / 2, H / 2 + 32);
    }
  }
}

// Persistent listener refs so we can detach old handlers when setup() reruns.
let _lastKeyDown = null;
let _lastKeyUp = null;
