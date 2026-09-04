import {
  Body, BodyType, Vec2, Polygon, Capsule, Material,
  CbType,
  InteractionFilter,
  CharacterController,
  buildTilemapBody,
  fractureBody,
  ParticleEmitter,
} from "../nape-js.esm.js?v=3.41.0";
import { drawBody, drawConstraints, drawGrid } from "../renderer.js?v=3.41.0";

// 2D side-view shooter built from four nape-js helpers:
//
//   - buildTilemapBody → static level geometry
//   - CharacterController + Capsule player
//   - ParticleEmitter (twice) for bullets and explosion debris
//   - fractureBody for destructible targets
//
// Plus camera-follow + camera-shake from the demo-runner camera component.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DT = 1 / 60;
const VIEW_W = 900;
const VIEW_H = 500;
const TILE = 30;
const WORLD_W = 2700;                                 // 3× canvas width
const COLS = Math.floor(WORLD_W / TILE);              // 90
const ROWS = Math.floor(VIEW_H / TILE);               // 16
const WORLD_H = ROWS * TILE;                          // 480 — exact multiple of TILE

const PLAYER_W = 20;              // capsule diameter
const PLAYER_H = 36;              // capsule total height
const MOVE_SPEED = 200;
const JUMP_SPEED = 420;
// Lower-than-realistic gravity (mirrors the character-controller demo) so
// the jump arc clears the next platform comfortably. With these values the
// max jump height is ≈ 122 px, enough to step onto any single tilemap level.
const COYOTE_MS = 100;
const GRAVITY = 720;

// Wall-slide / wall-jump (mirrors the character-controller demo).
const WALL_JUMP_VX = 220;        // horizontal kick-off speed
const WALL_JUMP_VY = -360;       // upward speed (slightly less than ground jump)
const WALL_SLIDE_MAX_VY = 90;    // max fall speed while wall-sliding
const WALL_JUMP_LOCK_MS = 150;   // briefly lock horizontal input after wall-jump

const BULLET_SPEED = 760;
const BULLET_COOLDOWN = 0.08;

// Fragment culling — anything below this many px² of polygon area is removed
// after fractureBody so the world doesn't fill up with dust.
const FRAGMENT_MIN_AREA = 80;

// Collision filtering.
//   - CHAR_GROUP   (bit 8) — auto-ORed into the player's shape filter by
//                            CharacterController. Bullets/particles mask this
//                            out so they don't push the player around.
//   - ONEWAY_GROUP (bit 9) — one-way platforms.
//   - PARTICLE_GROUP (bit 10) — debris/sparks particles. Bullets mask this
//                               out so they don't deflect off floating sparks
//                               from prior shots before reaching the target.
const CHAR_GROUP = 1 << 8;
const ONEWAY_GROUP = 1 << 9;
const PARTICLE_GROUP = 1 << 10;

// ---------------------------------------------------------------------------
// Level grid
// ---------------------------------------------------------------------------

// Build a 90×16 grid procedurally: solid border + a few interior platforms.
// Targets sit on top of platforms (see TARGET_DEFS).
function buildGrid() {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const onBorder = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
      row.push(onBorder ? 1 : 0);
    }
    grid.push(row);
  }
  // Interior solid platforms — (col, row, width, height) all in tiles.
  const platforms = [
    [6, 12, 6, 1],
    [16, 11, 4, 1],
    [22, 9, 5, 1],
    [30, 12, 4, 1],
    [40, 10, 5, 1],
    [50, 8, 4, 1],
    [56, 11, 4, 1],
    [62, 9, 4, 1],
    [70, 12, 6, 1],
    [80, 10, 5, 1],
    // Tall pillar in the middle for cover/shooting practice.
    [46, 13, 1, 2],
    [60, 13, 1, 2],
  ];
  for (const [c, r, w, h] of platforms) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (r + dy < ROWS && c + dx < COLS) grid[r + dy][c + dx] = 1;
      }
    }
  }
  return grid;
}

// Targets — placed on top of platforms (y = platform-top minus half-height).
const TARGET_DEFS = [
  { x: 230, y: 345, w: 32, h: 32, hp: 2 },
  { x: 270, y: 345, w: 32, h: 32, hp: 2 },
  { x: 310, y: 345, w: 32, h: 32, hp: 4 },
  { x: 530, y: 315, w: 32, h: 32, hp: 2 },
  { x: 570, y: 315, w: 32, h: 32, hp: 4 },
  { x: 730, y: 255, w: 36, h: 36, hp: 4 },
  { x: 770, y: 255, w: 36, h: 36, hp: 6 },
  { x: 980, y: 345, w: 32, h: 32, hp: 2 },
  { x: 1020, y: 345, w: 32, h: 32, hp: 2 },
  { x: 1280, y: 285, w: 32, h: 32, hp: 4 },
  { x: 1320, y: 285, w: 32, h: 32, hp: 4 },
  { x: 1560, y: 225, w: 36, h: 36, hp: 6 },
  { x: 1730, y: 315, w: 32, h: 32, hp: 2 },
  { x: 1770, y: 315, w: 32, h: 32, hp: 4 },
  { x: 1900, y: 255, w: 32, h: 32, hp: 4 },
  { x: 1940, y: 255, w: 32, h: 32, hp: 6 },
  { x: 2160, y: 345, w: 32, h: 32, hp: 2 },
  { x: 2200, y: 345, w: 32, h: 32, hp: 2 },
  { x: 2240, y: 345, w: 32, h: 32, hp: 2 },
  { x: 2440, y: 285, w: 36, h: 36, hp: 6 },
];

// ---------------------------------------------------------------------------
// Module state (re-init on every setup)
// ---------------------------------------------------------------------------

let _player = null;
let _cc = null;
let _platformTag = null;
let _playerTag = null;
let _targets = [];
let _bullets = null;
let _debris = null;
let _sparks = null;  // small, fast, short-lived particles for bullet impacts
let _bulletCbType = null;
let _targetCbType = null;
let _keys = {};
let _aim = { x: VIEW_W / 2, y: VIEW_H / 2 };  // canvas-space cursor
let _mouseDown = false;
let _cooldown = 0;
let _stats = { fired: 0, kills: 0, fragments: 0 };
let _onKeyDown = null;
let _onKeyUp = null;
let _facingRight = true;
let _hPlat = null;  // moving platform body (kinematic)
let _wallJumpLockTimer = 0;
let _wallJumpKickVx = 0;
let _wallSliding = false;
let _lastWallJumpSide = 0; // -1 = jumped off left wall, +1 = off right wall, 0 = none

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function spawnTargets(space) {
  const out = [];
  for (const def of TARGET_DEFS) {
    const body = new Body(BodyType.DYNAMIC, new Vec2(def.x, def.y));
    const half = { x: def.w / 2, y: def.h / 2 };
    const shape = new Polygon(
      [
        new Vec2(-half.x, -half.y),
        new Vec2(half.x, -half.y),
        new Vec2(half.x, half.y),
        new Vec2(-half.x, half.y),
      ],
      new Material(0.1, 0.6, 0.9, 1.5),
    );
    shape.cbTypes.add(_targetCbType);
    body.shapes.add(shape);
    body.userData._hp = def.hp;
    body.userData._hpMax = def.hp;
    body.userData._targetW = def.w;
    body.userData._targetH = def.h;
    body.userData._isTarget = true;
    try { body.userData._colorIdx = (def.hp % 5) + 1; } catch (_) {}
    body.space = space;
    out.push(body);
  }
  return out;
}

function addOneWay(space, cx, cy, w) {
  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const shape = new Polygon(Polygon.box(w, 8));
  shape.cbTypes.add(_platformTag);
  shape.filter.collisionGroup = ONEWAY_GROUP;
  b.shapes.add(shape);
  b.space = space;
  try {
    b.userData._color = { fill: "rgba(163,113,247,0.35)", stroke: "#a371f7" };
    b.userData._isOneWay = true;
  } catch (_) {}
  return b;
}

function addMovingPlatform(space, cx, cy, w, minX, maxX, speed) {
  const b = new Body(BodyType.KINEMATIC, new Vec2(cx, cy));
  b.shapes.add(new Polygon(Polygon.box(w, 14), new Material(0, 2, 2, 1)));
  b.space = space;
  b._hMoving = { minX, maxX, speed, dir: 1 };
  try {
    b.userData._color = { fill: "rgba(110,200,255,0.4)", stroke: "#6ec8ff" };
    b.userData._isMoving = true;
    b.userData._mw = w;
  } catch (_) {}
  return b;
}

function polygonAreaOf(shape) {
  if (!shape.isPolygon()) return Infinity;
  const verts = shape.castPolygon.localVerts;
  let a = 0;
  const n = verts.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const v1 = verts.at(i);
    const v2 = verts.at((i + 1) % n);
    a += v1.x * v2.y - v2.x * v1.y;
  }
  return Math.abs(a) * 0.5;
}

function detonate(target, impactX, impactY, runner) {
  // Visual burst at impact.
  if (_debris) {
    if (_debris.origin instanceof Vec2) {
      _debris.origin.x = impactX;
      _debris.origin.y = impactY;
    } else {
      _debris.origin = new Vec2(impactX, impactY);
    }
    _debris.emit(40);
  }

  try {
    const result = fractureBody(target, new Vec2(impactX, impactY), {
      fragmentCount: 6,
      explosionImpulse: 240,
    });
    // Cull tiny shards so the world doesn't fill up with dust.
    let kept = 0;
    for (const f of result.fragments) {
      const shape = f.shapes.at(0);
      const area = polygonAreaOf(shape);
      if (area < FRAGMENT_MIN_AREA) {
        f.space = null;
        continue;
      }
      try {
        f.userData._colorIdx = 5;
        f.userData._isFragment = true;
        f.userData._fragmentLife = 4.0; // seconds before despawn
      } catch (_) {}
      kept++;
    }
    _stats.fragments += kept;
  } catch (_) {
    target.space = null;
  }
  _stats.kills++;

  const idx = _targets.indexOf(target);
  if (idx >= 0) _targets.splice(idx, 1);

  // Kick the camera. Bigger HP target → bigger shake.
  if (runner) {
    const max = target.userData?._hpMax ?? 1;
    const amp = 6 + Math.min(14, max * 4);
    runner.shakeCamera(amp, 0.28);
  }
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "destructible-arena",
  label: "Destructible Arena",
  featured: true,
  featuredOrder: 9,
  tags: ["ParticleEmitter", "fractureBody", "CharacterController", "Tilemap", "Shooter", "Camera"],
  desc:
    "Side-view shooter built from <b>buildTilemapBody</b> + <b>CharacterController</b> + two <b>ParticleEmitter</b>s + <b>fractureBody</b>. The arena is 3× canvas-wide; the camera follows the player and shakes on every kill. <b>WASD/Arrows</b> move, <b>Space</b> jumps. Hold <b>into a wall</b> mid-air to wall-slide, and press <b>Space</b> to wall-jump off it. Jump up through the purple one-way platforms; the cyan platform glides back and forth as a kinematic body. Hold <b>mouse</b> to fire toward the cursor.",
  walls: false,
  camera: null,

  setup(space, _W, _H) {
    space.gravity = new Vec2(0, GRAVITY);

    _platformTag = new CbType();
    _playerTag = new CbType();
    _bulletCbType = new CbType();
    _targetCbType = new CbType();
    _stats = { fired: 0, kills: 0, fragments: 0 };
    _cooldown = 0;
    _wallJumpLockTimer = 0;
    _wallJumpKickVx = 0;
    _wallSliding = false;
    _lastWallJumpSide = 0;
    _keys = {};
    _aim = { x: VIEW_W / 2, y: VIEW_H / 2 };
    _mouseDown = false;
    _facingRight = true;

    // ---- Level (tilemap) ----
    const tilemap = buildTilemapBody(buildGrid(), {
      tileSize: TILE,
      position: new Vec2(0, 0),
      material: new Material(0.05, 0.7, 0.9, 1),
      merge: "greedy",
    });
    tilemap.space = space;

    // ---- One-way platforms (jump up through, fall through with crouch) ----
    addOneWay(space, 460, 240, 120);
    addOneWay(space, 880, 230, 100);
    addOneWay(space, 1480, 200, 110);
    addOneWay(space, 1860, 200, 110);
    addOneWay(space, 2400, 220, 120);

    // ---- Moving platform (kinematic, drives velocity each frame) ----
    _hPlat = addMovingPlatform(space, 1200, 280, 100, 1100, 1380, 80);

    // ---- Player (capsule) ----
    _player = new Body(BodyType.DYNAMIC, new Vec2(120, 380));
    const playerShape = new Capsule(PLAYER_H, PLAYER_W, undefined, new Material(0, 0.3, 0.3, 1));
    // Player carries CHAR_GROUP only; bullets/particles mask CHAR_GROUP out of
    // their masks, so they pass through the player. We provide an explicit
    // filter to CharacterController below (otherwise it would auto-OR
    // CHAR_GROUP itself and use a raycast filter that doesn't exclude
    // PARTICLE_GROUP — which makes bullets count as ground).
    playerShape.filter = new InteractionFilter(CHAR_GROUP);
    playerShape.cbTypes.add(_playerTag);
    _player.shapes.add(playerShape);
    _player.rotation = Math.PI / 2; // capsule spine is along X, rotate to upright
    _player.allowRotation = false;
    _player.isBullet = true;
    _player.space = space;
    try { _player.userData._colorIdx = 3; } catch (_) {}

    _cc = new CharacterController(space, _player, {
      maxSlopeAngle: Math.PI / 3,
      down: new Vec2(0, 1),
      oneWayPlatformTag: _platformTag,
      characterTag: _playerTag,
      // Ground/wall-detection raycasts must skip the character's own body AND
      // every transient particle (bullets, debris, sparks) — otherwise the
      // player can stand on their own bullets and "fly".
      filter: new InteractionFilter(1, ~(CHAR_GROUP | PARTICLE_GROUP)),
    });

    // ---- Targets ----
    _targets = spawnTargets(space);

    // ---- Bullet emitter ----
    _bullets = new ParticleEmitter({
      space,
      origin: _player,
      velocity: { kind: "fixed", value: new Vec2(BULLET_SPEED, 0) },
      maxParticles: 64,
      lifetimeMin: 1.7,
      lifetimeMax: 1.7,
      particleRadius: 2,
      particleMaterial: new Material(0, 0.1, 0.1, 0.4),
      // group=PARTICLE_GROUP (so the CC ground-detection raycast — which is
      // configured with mask=~(CHAR|PARTICLE) — skips bullets, otherwise the
      // player could stand on their own shots). mask=~(CHAR|PARTICLE) so
      // bullets pass through the player and through floating debris/sparks
      // from prior shots.
      particleFilter: new InteractionFilter(PARTICLE_GROUP, ~(CHAR_GROUP | PARTICLE_GROUP)),
      particleCbType: _bulletCbType,
      onCollide: (bullet, other) => {
        const ix = bullet.position.x;
        const iy = bullet.position.y;
        const ud = other.userData;
        const isTarget = ud && typeof ud._hp === "number";
        let killed = false;
        if (isTarget) {
          ud._hp -= 1;
          if (ud._hp <= 0) {
            detonate(other, ix, iy, this._runner);
            killed = true;
          }
        }
        // Spark burst on every impact except kill-detonate (which already
        // triggers its own bigger debris burst).
        if (!killed && _sparks) {
          if (_sparks.origin instanceof Vec2) {
            _sparks.origin.x = ix; _sparks.origin.y = iy;
          } else {
            _sparks.origin = new Vec2(ix, iy);
          }
          _sparks.emit(isTarget ? 5 : 8);
        }
        _bullets.requestKill(bullet);
      },
      selfCollision: false,
    });

    // ---- Debris emitter (kill explosion) ----
    // group=PARTICLE_GROUP so bullets mask us out (they shouldn't deflect off
    // floating debris); mask=~CHAR_GROUP so we don't push the player around.
    _debris = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      velocity: { kind: "radial", speedMin: 130, speedMax: 420 },
      maxParticles: 400,
      lifetimeMin: 0.5,
      lifetimeMax: 1.4,
      particleRadius: 1.7,
      particleMaterial: new Material(0.4, 0.5, 0.7, 0.4),
      particleFilter: new InteractionFilter(PARTICLE_GROUP, ~CHAR_GROUP),
      selfCollision: false,
    });

    // ---- Spark emitter (bullet impact on walls/floor) ----
    // Same filter strategy as debris.
    _sparks = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      velocity: { kind: "radial", speedMin: 80, speedMax: 240 },
      maxParticles: 200,
      lifetimeMin: 0.15,
      lifetimeMax: 0.45,
      particleRadius: 1.3,
      particleMaterial: new Material(0.2, 0.3, 0.5, 0.3),
      particleFilter: new InteractionFilter(PARTICLE_GROUP, ~CHAR_GROUP),
      selfCollision: false,
    });

    // ---- Camera config (follow + bounds) ----
    this.camera = {
      follow: _player,
      offsetX: 0,
      offsetY: -40,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
      lerp: 0.14,
    };

    // ---- Keyboard ----
    _onKeyDown = (e) => {
      _keys[e.code] = true;
      if (["Space", "ArrowUp", "KeyW", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    };
    _onKeyUp = (e) => { _keys[e.code] = false; };
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  // Demo-runner pointer callbacks pass world-space coords (canvas + camera).
  hover(x, y) { _aim.x = x; _aim.y = y; },
  click(x, y) { _mouseDown = true; _aim.x = x; _aim.y = y; },
  drag(x, y) { _aim.x = x; _aim.y = y; },
  release() { _mouseDown = false; },

  cleanup() {
    if (_bullets) { _bullets.destroy(); _bullets = null; }
    if (_debris) { _debris.destroy(); _debris = null; }
    if (_sparks) { _sparks.destroy(); _sparks = null; }
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    _onKeyDown = _onKeyUp = null;
    _mouseDown = false;
    _player = _cc = _hPlat = null;
    _targets = [];
    _platformTag = _playerTag = _bulletCbType = _targetCbType = null;
    _hPlat = null;
  },

  step(space, _W, _H) {
    if (!_cc || !_player) return;

    // ---- Drive moving platforms (kinematic — set velocity each frame) ----
    for (const body of space.bodies) {
      if (body._hMoving) {
        const m = body._hMoving;
        const px = body.position.x;
        if (px >= m.maxX) m.dir = -1;
        if (px <= m.minX) m.dir = 1;
        body.velocity = new Vec2(m.dir * m.speed, 0);
      }
    }

    // ---- Movement input ----
    const left = _keys["KeyA"] || _keys["ArrowLeft"];
    const right = _keys["KeyD"] || _keys["ArrowRight"];
    const jumpKey = _keys["Space"] || _keys["KeyW"] || _keys["ArrowUp"];

    const result = _cc.update();

    // Always face the aim cursor — overrides movement-based facing.
    _facingRight = _aim.x >= _player.position.x;

    let moveX = 0;
    if (left)  moveX -= MOVE_SPEED;
    if (right) moveX += MOVE_SPEED;

    const jumpJustPressed = jumpKey && !_keys._prevJump;
    _keys._prevJump = jumpKey;

    // ---- Wall-slide / wall-jump (mirrors character-controller demo) ----
    _wallJumpLockTimer = Math.max(0, _wallJumpLockTimer - 1000 * DT);

    const onWall = !result.grounded && (result.wallLeft || result.wallRight);
    const holdingIntoWall =
      (result.wallLeft && left) || (result.wallRight && right);
    const curVy = _player.velocity.y;
    _wallSliding = onWall && holdingIntoWall && curVy >= 0;

    if (result.grounded) _lastWallJumpSide = 0;

    const wallSide = result.wallLeft ? -1 : result.wallRight ? 1 : 0;
    const canJump = result.grounded || result.timeSinceGrounded * 1000 < COYOTE_MS;
    // Wall-jump only allowed if touching the OPPOSITE wall from last wall-jump
    // (prevents scaling a single wall by repeatedly hopping off it).
    const canWallJump = !result.grounded && onWall && wallSide !== _lastWallJumpSide;

    let vy = curVy;
    let jumped = false;
    let wallJumped = false;

    if (jumpJustPressed && canJump) {
      vy = -JUMP_SPEED;
      jumped = true;
      _lastWallJumpSide = 0;
    } else if (jumpJustPressed && canWallJump) {
      vy = WALL_JUMP_VY;
      _wallJumpKickVx = result.wallLeft ? WALL_JUMP_VX : -WALL_JUMP_VX;
      _wallJumpLockTimer = WALL_JUMP_LOCK_MS;
      _lastWallJumpSide = wallSide;
      wallJumped = true;
    }

    // Variable jump height — cut upward velocity on key release.
    if (!jumpKey && vy < 0 && !jumped && !wallJumped) vy *= 0.85;

    // Carry: when the player stands on a kinematic moving platform, add the
    // platform's velocity to ours so we ride with it (mirrors the
    // character-controller demo). Without this, overwriting vx with input
    // each frame strands the player and they slide off.
    const platVx = result.onMovingPlatform && result.groundBody
      ? result.groundBody.velocity.x
      : 0;

    // Horizontal: during wall-jump lock, use the kick vx so the player isn't
    // glued back to the wall by an opposite-direction input. Otherwise input
    // + platform carry.
    let newVx;
    if (_wallJumpLockTimer > 0) {
      newVx = _wallJumpKickVx;
    } else {
      newVx = moveX + platVx;
    }

    // Vertical: keep engine-driven vy unless we just jumped, are wall-sliding,
    // or are cutting jump height. Wall-slide caps downward velocity.
    let newVy = curVy;
    if (jumped || wallJumped) {
      newVy = vy;
    } else if (_wallSliding && curVy > WALL_SLIDE_MAX_VY) {
      newVy = WALL_SLIDE_MAX_VY;
    } else if (!jumpKey && curVy < 0) {
      newVy = vy; // variable jump height cut
    }

    _player.velocity = new Vec2(newVx, newVy);

    // ---- Shooting ----
    _cooldown = Math.max(0, _cooldown - DT);
    if (_mouseDown && _cooldown <= 0 && _bullets) {
      const dx = _aim.x - _player.position.x;
      const dy = _aim.y - _player.position.y;
      const len = Math.hypot(dx, dy) || 1;
      const pat = _bullets.velocity;
      if (pat.kind === "fixed") {
        pat.value = new Vec2((dx / len) * BULLET_SPEED, (dy / len) * BULLET_SPEED);
      }
      _bullets.emit(1);
      _stats.fired++;
      _cooldown = BULLET_COOLDOWN;
    }

    // ---- Fade old fragments + remove fragments/targets that fell out of the world ----
    const dead = [];
    for (const body of space.bodies) {
      const ud = body.userData;
      if (!ud) continue;
      if (ud._isFragment && typeof ud._fragmentLife === "number") {
        ud._fragmentLife -= DT;
        if (ud._fragmentLife <= 0) { dead.push(body); continue; }
      }
      if ((ud._isFragment || ud._isTarget) && body.position.y > WORLD_H + 200) {
        dead.push(body);
      }
    }
    for (const body of dead) {
      body.space = null;
      const idx = _targets.indexOf(body);
      if (idx >= 0) _targets.splice(idx, 1);
    }

    // ---- Advance emitters ----
    if (_bullets) _bullets.update(DT);
    if (_debris) _debris.update(DT);
    if (_sparks) _sparks.update(DT);
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    ctx.save();
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // World-space draw — translate by -cam.
    ctx.save();
    ctx.translate(-camX, -camY);

    drawGrid(ctx, W, H, camX, camY);

    drawConstraints(ctx, space);

    // Bodies (skip particles — drawn separately for nicer visuals).
    const skipBullet = _bullets ? new Set(_bullets.active) : null;
    const skipDebris = _debris ? new Set(_debris.active) : null;
    const skipSparks = _sparks ? new Set(_sparks.active) : null;
    for (let i = 0; i < space.bodies.length; i++) {
      const b = space.bodies.at(i);
      if (skipBullet && skipBullet.has(b)) continue;
      if (skipDebris && skipDebris.has(b)) continue;
      if (skipSparks && skipSparks.has(b)) continue;
      drawBody(ctx, b, showOutlines);
    }

    // Bullets (bright yellow streaks).
    if (_bullets) {
      ctx.fillStyle = "#ffe066";
      for (const b of _bullets.active) {
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, _bullets.particleRadius + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Debris (orange sparks from kill explosions, fade with age).
    if (_debris) {
      const live = _debris.active;
      const ages = _debris.ages;
      const lts = _debris.lifetimes;
      for (let i = 0; i < live.length; i++) {
        const t = Math.min(1, ages[i] / lts[i]);
        const a = (1 - t).toFixed(2);
        ctx.fillStyle = `rgba(245,180,80,${a})`;
        const b = live[i];
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, _debris.particleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bullet impact sparks (bright pale-yellow, very short-lived).
    if (_sparks) {
      const live = _sparks.active;
      const ages = _sparks.ages;
      const lts = _sparks.lifetimes;
      for (let i = 0; i < live.length; i++) {
        const t = Math.min(1, ages[i] / lts[i]);
        const a = (1 - t).toFixed(2);
        ctx.fillStyle = `rgba(255,235,150,${a})`;
        const b = live[i];
        ctx.beginPath();
        ctx.arc(b.position.x, b.position.y, _sparks.particleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // HP bars over targets (tower-defense style — only when damaged).
    for (const t of _targets) {
      const ud = t.userData;
      if (!ud || ud._hp == null || ud._hpMax == null) continue;
      if (ud._hp >= ud._hpMax) continue;
      const w = Math.max(20, (ud._targetW ?? 32));
      const x = t.position.x;
      const y = t.position.y - (ud._targetH ?? 32) / 2 - 8;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x - w / 2, y, w, 4);
      const ratio = Math.max(0, ud._hp / ud._hpMax);
      // Green → yellow → red as HP drops.
      const r = ratio > 0.5 ? Math.round(63 + (255 - 63) * (1 - (ratio - 0.5) * 2)) : 248;
      const g = ratio > 0.5 ? 185 : Math.round(81 + (185 - 81) * (ratio * 2));
      ctx.fillStyle = `rgb(${r},${g},81)`;
      ctx.fillRect(x - w / 2, y, w * ratio, 4);
    }

    // Player eye — gives the capsule a face direction.
    if (_player) {
      const px = _player.position.x;
      const py = _player.position.y;
      ctx.fillStyle = _cc?.grounded ? "#3fb950" : "#f85149";
      ctx.beginPath();
      ctx.arc(px + (_facingRight ? 5 : -5), py - PLAYER_H / 2 + 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Aim reticle (world-space — follows the cursor through the world).
    ctx.strokeStyle = "rgba(255,80,80,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(_aim.x, _aim.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(_aim.x - 10, _aim.y); ctx.lineTo(_aim.x + 10, _aim.y);
    ctx.moveTo(_aim.x, _aim.y - 10); ctx.lineTo(_aim.x, _aim.y + 10);
    ctx.stroke();

    ctx.restore();

    // ---- HUD (screen space) ----
    drawHUD(ctx);
    ctx.restore();
  },

  render3dOverlay(ctx, _space, _W, _H) {
    drawHUD(ctx);
  },
};

function drawHUD(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(13,17,23,0.7)";
  ctx.fillRect(8, 8, 240, 76);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(`Targets:   ${_targets.length}`, 16, 24);
  ctx.fillText(`Fired:     ${_stats.fired}`, 16, 40);
  ctx.fillText(`Kills:     ${_stats.kills}`, 16, 56);
  ctx.fillText(`Fragments: ${_stats.fragments}`, 16, 72);
  ctx.restore();
}
