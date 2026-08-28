import {
  Body, BodyType, Vec2, Circle, Capsule, Polygon, Material, CbType, CbEvent,
  InteractionType, InteractionListener, PreListener, PreFlag,
  CharacterController, FluidProperties,
} from "../nape-js.esm.js?v=3.40.0";
import { drawBody, drawConstraints, drawGrid, COLORS } from "../renderer.js?v=3.40.0";
import { loadThree } from "../renderers/threejs-adapter.js?v=3.40.0";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORLD_W = 4000;
const WORLD_H = 600;
const PLAYER_W = 20;   // capsule diameter (end-cap width)
const PLAYER_H = 36;   // capsule total height (standing)
const PLAYER_R = PLAYER_W / 2; // half-width for bounds clamping
const ONEWAY_GROUP = 1 << 9;
const GRAVITY = 600;
const MOVE_SPEED = 180;
const JUMP_SPEED = 380;
const COYOTE_MS = 100;
const JUMP_BUFFER_MS = 100;
const WALL_JUMP_VX = 200;       // horizontal kick-off speed
const WALL_JUMP_VY = -340;      // upward speed (slightly less than ground jump)
const WALL_SLIDE_MAX_VY = 80;   // max fall speed while wall-sliding
const WALL_JUMP_LOCK_MS = 150;  // briefly lock horizontal input after wall-jump
const ICE_ACCEL = 300;          // horizontal acceleration on ice (px/s²)
const ICE_DECEL = 150;          // deceleration on ice when no input (px/s²)
const BOUNCE_SPEED = 600;       // upward launch speed from bounce pads
const DT = 1 / 60;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let player = null;
let cc = null;
let keys = {};
let prevJumpKey = false;
let jumpBufferTimer = 0;
let velY = 0;
let playerFacingRight = true;
let coinCount = 0;
let coinPopups = []; // { x, y, timer }
let wallJumpLockTimer = 0;
let wallJumpKickVx = 0;
let wallSliding = false;
let lastWallJumpSide = 0; // -1 = jumped off left wall, +1 = off right wall, 0 = none
let onIce = false;
let iceVx = 0; // tracked horizontal velocity on ice (persists across frames)
let _THREE = null;
let _lastCamX = 0;
let _lastCamY = 0;
let _nonCanvasRenderer = false; // true when render3d or renderPixi is active

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addStaticBox(space, cx, cy, w, h) {
  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  b.space = space;
  return b;
}

function addOneWay(space, cx, cy, w, platformTag) {
  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const shape = new Polygon(Polygon.box(w, 8));
  shape.cbTypes.add(platformTag);
  shape.filter.collisionGroup = ONEWAY_GROUP;
  b.shapes.add(shape);
  b.space = space;
  try { b.userData._colorIdx = 4; } catch (_) {}
  return b;
}

function addCoin(space, cx, cy, coinTag) {
  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  const shape = new Circle(5);
  shape.sensorEnabled = true;
  if (coinTag) shape.cbTypes.add(coinTag);
  b.shapes.add(shape);
  b.space = space;
  try { b.userData._colorIdx = 1; } catch (_) {}
  return b;
}

function addBouncePad(space, cx, cy, w) {
  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  // High elasticity material — launches the player upward
  b.shapes.add(new Polygon(Polygon.box(w, 10), new Material(3, 0.5, 0.5, 1)));
  b.space = space;
  try {
    b.userData._color = { fill: "rgba(248,81,73,0.3)", stroke: "#f85149" };
    b.userData._isBounce = true;
  } catch (_) {}
  return b;
}

function addIce(space, cx, cy, w) {
  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  b.shapes.add(new Polygon(Polygon.box(w, 12)));
  b.space = space;
  try {
    b.userData._color = { fill: "rgba(140,210,255,0.25)", stroke: "#8cd2ff" };
    b.userData._isIce = true;
  } catch (_) {}
  return b;
}

function addSlopeRamp(space, startX, baseY, length, height, goingDown) {
  const cx = startX + length / 2;
  const cy = baseY - height / 2;
  const angle = Math.atan2(goingDown ? height : -height, length);
  const len = Math.sqrt(length * length + height * height);

  const b = new Body(BodyType.STATIC, new Vec2(cx, cy));
  b.shapes.add(new Polygon(Polygon.box(len, 12)));
  b.rotation = angle;
  b.space = space;
  return b;
}

// ---------------------------------------------------------------------------
// Demo definition
// ---------------------------------------------------------------------------

export default {
  id: "character-controller",
  label: "Character Controller",
  featured: true,
  featuredOrder: 11,
  tags: ["CharacterController", "Platformer", "Camera", "One-Way", "Slope", "Wall-Jump", "Ice"],
  desc: "WASD/Arrow keys to move, <b>Space</b> to jump. Features: slopes, one-way platforms, moving platforms, wall-slide, wall-jump, ice, coyote time. Uses the built-in <code>CharacterController</code> class with dynamic body physics.",
  walls: false,

  camera: null,

  setup(space, W, H) {
    space.gravity = new Vec2(0, GRAVITY);

    const platformTag = new CbType();
    const playerTag = new CbType();
    const coinTag = new CbType();

    const floorY = WORLD_H - 10;

    // ---- Floor (with gaps for hPlat zone and water) ----
    // x: 0–1600 | gap 1600–1950 (hPlat) | 1950–2160 | gap 2160–2640 (water) | 2640–2830 solid | 2830–3500 ice | 3500–4000
    addStaticBox(space, 800, floorY, 1600, 20);
    addStaticBox(space, 2055, floorY, 210, 20);
    addStaticBox(space, 2760, floorY, 240, 20);    // solid between water and ice (2640–2880)
    addStaticBox(space, 3750, floorY, 500, 20);

    // ---- Left/right walls ----
    addStaticBox(space, -10, WORLD_H / 2, 20, WORLD_H);
    addStaticBox(space, WORLD_W + 10, WORLD_H / 2, 20, WORLD_H);

    // ---- Section 1: One-way platforms (x: 0–600) ----
    addStaticBox(space, 150, 500, 200, 16);
    addOneWay(space, 100, 440, 120, platformTag);
    addOneWay(space, 280, 370, 100, platformTag);
    addOneWay(space, 130, 300, 120, platformTag);
    addOneWay(space, 380, 330, 80, platformTag);

    // Ground-level coins (easy to reach)
    addCoin(space, 200, floorY - 30, coinTag);
    addCoin(space, 300, floorY - 30, coinTag);
    addCoin(space, 400, floorY - 30, coinTag);
    // Platform coins
    addCoin(space, 100, 418, coinTag);
    addCoin(space, 280, 348, coinTag);
    addCoin(space, 380, 308, coinTag);

    // ---- Section 2: Steps (x: 500–900) ----
    // Use smaller step increments (6px) so the capsule's rounded bottom can climb smoothly
    const stepBase = floorY - 10;
    for (let i = 0; i < 8; i++) {
      addStaticBox(space, 560 + i * 30, stepBase - i * 6, 28, 6 + i * 6);
    }
    addCoin(space, 760, stepBase - 70, coinTag);

    // ---- Section 3: Slopes (x: 900–1500) ----
    addSlopeRamp(space, 950, floorY - 10, 300, 80, false);
    addStaticBox(space, 1200, floorY - 80, 200, 16);
    addSlopeRamp(space, 1400, floorY - 10, 200, 80, true);
    addCoin(space, 1200, floorY - 110, coinTag);
    addCoin(space, 1050, floorY - 50, coinTag);

    // ---- Section 4: Moving platforms (x: 1500–2100) ----
    addStaticBox(space, 1550, floorY, 100, 20);

    // Catch floor under hPlat gap
    addStaticBox(space, 1775, floorY + 80, 350, 20);

    const hPlat = new Body(BodyType.KINEMATIC, new Vec2(1750, floorY + 20));
    hPlat.shapes.add(new Polygon(Polygon.box(100, 12), new Material(0, 2, 2, 1)));
    hPlat.space = space;
    hPlat._hMoving = { minX: 1650, maxX: 1900, speed: 80 };

    const vPlat = new Body(BodyType.KINEMATIC, new Vec2(2000, floorY - 100));
    vPlat.shapes.add(new Polygon(Polygon.box(80, 12)));
    vPlat.space = space;
    vPlat._vMoving = { minY: floorY - 200, maxY: floorY - 50, speed: 60 };

    addStaticBox(space, 2100, floorY - 200, 100, 16);
    addCoin(space, 2100, floorY - 230, coinTag);
    addCoin(space, 1750, floorY - 80, coinTag);

    // ---- Section 5: Water (x: 2160–2640) ----
    const poolL = 2160, poolR = 2640, poolCX = 2400;
    const poolTop = floorY, poolBot = floorY + 110;
    const poolH = poolBot - poolTop;
    addStaticBox(space, poolCX, poolBot, poolR - poolL + 20, 20);
    addStaticBox(space, poolL - 10, poolTop + poolH / 2, 20, poolH);
    addStaticBox(space, poolR + 10, poolTop + poolH / 2, 20, poolH);

    const water = new Body(BodyType.STATIC, new Vec2(poolCX, poolTop + poolH / 2));
    const waterShape = new Polygon(Polygon.box(poolR - poolL, poolH));
    waterShape.fluidEnabled = true;
    waterShape.fluidProperties = new FluidProperties(1.5, 3);
    water.shapes.add(waterShape);
    water.space = space;
    water._isWater = true;
    water._waterW = poolR - poolL;
    water._waterH = poolH;

    addCoin(space, 2300, floorY + 20, coinTag);
    addCoin(space, 2500, floorY + 20, coinTag);

    // ---- Section 6: Wall-jump shaft (x: 2680–2820) ----
    // Tall vertical shaft — enter from the left, wall-jump up, exit at top-right
    const shaftL = 2680, shaftR = 2820;
    const shaftW = 16;
    const shaftH = 300;                           // tall enough to require wall-jumps
    const shaftTop = floorY - shaftH;             // top of the shaft walls
    const shaftCY = floorY - shaftH / 2;          // center Y of shaft walls
    // Left wall: opening at bottom (door height ~60px) so player walks in
    const doorH = 60;
    const leftSolidH = shaftH - doorH;            // solid part above the door
    const leftCY = shaftTop + leftSolidH / 2;
    addStaticBox(space, shaftL, leftCY, shaftW, leftSolidH);          // left wall (upper)
    addStaticBox(space, shaftR, shaftCY, shaftW, shaftH);             // right wall (full)
    // Cap: one-way platform — player wall-jumps up through it, lands on top
    addOneWay(space, (shaftL + shaftR) / 2, shaftTop, shaftR - shaftL + 40, platformTag);
    // Coins going up the shaft
    addCoin(space, (shaftL + shaftR) / 2, floorY - 80, coinTag);
    addCoin(space, (shaftL + shaftR) / 2, floorY - 180, coinTag);
    addCoin(space, (shaftL + shaftR) / 2, shaftTop - 30, coinTag);   // on top of shaft

    // ---- Bounce pad: between shaft and ice, launches back up to shaft top ----
    addBouncePad(space, 2850, floorY - 6, 50);

    // ---- Section 6b: Ice zone (x: 2880–3500) ----
    // Long slippery ice floor — player slides, hard to stop
    addIce(space, 3190, floorY - 6, 620);
    addCoin(space, 2900, floorY - 30, coinTag);
    addCoin(space, 3100, floorY - 30, coinTag);
    addCoin(space, 3300, floorY - 30, coinTag);
    // Small ice obstacles to dodge while sliding
    addStaticBox(space, 3000, floorY - 20, 16, 40);
    addStaticBox(space, 3250, floorY - 20, 16, 40);

    // ---- Bounce pad: launch up to final stretch ----
    addBouncePad(space, 3520, floorY - 6, 50);

    // ---- Section 7: Final stretch (x: 3500–3900) ----
    addOneWay(space, 3600, 400, 100, platformTag);
    addOneWay(space, 3700, 330, 80, platformTag);
    addStaticBox(space, 3800, 280, 100, 16);
    addCoin(space, 3800, 250, coinTag);

    // ---- Player (dynamic body — capsule shape) ----
    player = new Body(BodyType.DYNAMIC, new Vec2(100, floorY - 30));
    // Capsule(width, height): spine along X-axis, so rotate body 90° for upright
    const playerShape = new Capsule(PLAYER_H, PLAYER_W, undefined, new Material(0, 0.3, 0.3, 1));
    playerShape.cbTypes.add(playerTag);
    player.shapes.add(playerShape);
    player.rotation = Math.PI / 2; // stand upright
    player.allowRotation = false;
    player.isBullet = true;
    player.space = space;
    try { player.userData._colorIdx = 3; } catch (_) {}

    // ---- Coin pickup listener ----
    const coinListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      playerTag,
      coinTag,
      (cb) => {
        // int1/int2 may be Shape (cbType on shape) — get the body via .castShape.body
        let coinBody = null;
        const i1 = cb.int1;
        const i2 = cb.int2;
        const b1 = i1.castBody ?? i1.castShape?.body ?? null;
        const b2 = i2.castBody ?? i2.castShape?.body ?? null;
        coinBody = (b1 && b1 !== player) ? b1 : (b2 && b2 !== player) ? b2 : null;
        if (coinBody && coinBody.space) {
          const cx = coinBody.position.x;
          const cy = coinBody.position.y;
          coinBody.space = null;
          coinCount++;
          coinPopups.push({ x: cx, y: cy - 10, timer: 1.0 });
        }
      },
    );
    coinListener.space = space;

    // ---- Character Controller ----
    cc = new CharacterController(space, player, {
      maxSlopeAngle: Math.PI / 3,
      oneWayPlatformTag: platformTag,
      characterTag: playerTag,
    });

    // Camera
    this.camera = {
      follow: player,
      offsetX: 0,
      offsetY: -30,
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H + 120 },
      lerp: 0.12,
    };

    // Reset state
    keys = {};
    prevJumpKey = false;
    jumpBufferTimer = 0;
    velY = 0;
    playerFacingRight = true;
    coinCount = 0;
    coinPopups = [];
    wallJumpLockTimer = 0;
    wallJumpKickVx = 0;
    wallSliding = false;
    lastWallJumpSide = 0;
    onIce = false;
    iceVx = 0;
    _nonCanvasRenderer = false;

    // Keyboard handling
    this._onKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => { keys[e.code] = false; };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  },

  // step() runs BEFORE space.step() in DemoRunner
  step(space, W, H) {
    if (!cc || !player) return;

    // ---- Update moving platforms ----
    for (const body of space.bodies) {
      if (body._hMoving) {
        const m = body._hMoving;
        const px = body.position.x;
        if (!m._dir) m._dir = 1;
        if (px >= m.maxX) m._dir = -1;
        if (px <= m.minX) m._dir = 1;
        body.velocity = new Vec2(m._dir * m.speed, 0);
      }
      if (body._vMoving) {
        const m = body._vMoving;
        const py = body.position.y;
        if (!m._dir) m._dir = 1;
        if (py >= m.maxY) m._dir = -1;
        if (py <= m.minY) m._dir = 1;
        body.velocity = new Vec2(0, m._dir * m.speed);
      }
    }

    // ---- Input ----
    const left = keys["ArrowLeft"] || keys["KeyA"];
    const right = keys["ArrowRight"] || keys["KeyD"];
    const jumpKey = keys["Space"] || keys["ArrowUp"] || keys["KeyW"];

    const jumpJustPressed = jumpKey && !prevJumpKey;
    prevJumpKey = jumpKey;

    let moveX = 0;
    if (left) { moveX = -MOVE_SPEED; playerFacingRight = false; }
    if (right) { moveX = MOVE_SPEED; playerFacingRight = true; }

    // ---- Query state from last frame ----
    const result = cc.update();

    // Check if player is in water (has active fluid arbiters)
    let inWater = false;
    try {
      const arbs = space.arbiters;
      const arbCount = arbs.zpp_gl();
      for (let i = 0; i < arbCount; i++) {
        const a = arbs.at(i);
        if (a.isFluidArbiter() && (a.body1 === player || a.body2 === player)) {
          inWater = true;
          break;
        }
      }
    } catch (_) {}

    // ---- Ice detection ----
    const wasOnIce = onIce;
    onIce = result.grounded && result.groundBody?.userData?._isIce;
    if (onIce) {
      // First frame on ice: inherit current movement speed
      if (!wasOnIce) {
        iceVx = moveX;
      }
      // Slippery: gradually accelerate/decelerate using persistent iceVx
      const targetVx = moveX; // 0, -MOVE_SPEED, or +MOVE_SPEED
      if (targetVx !== 0) {
        const diff = targetVx - iceVx;
        iceVx += Math.sign(diff) * Math.min(Math.abs(diff), ICE_ACCEL * DT);
      } else {
        if (Math.abs(iceVx) < ICE_DECEL * DT) {
          iceVx = 0;
        } else {
          iceVx -= Math.sign(iceVx) * ICE_DECEL * DT;
        }
      }
      moveX = iceVx;
    } else {
      iceVx = 0;
    }

    // ---- Bounce pad detection ----
    const onBounce = result.grounded && result.groundBody?.userData?._isBounce;

    // ---- Vertical velocity ----
    velY = player.velocity.y;

    // Jump buffering
    if (jumpJustPressed) {
      jumpBufferTimer = JUMP_BUFFER_MS;
    } else {
      jumpBufferTimer = Math.max(0, jumpBufferTimer - 1000 * DT);
    }

    // Wall-jump lock timer (briefly prevents horizontal override after wall-jump)
    wallJumpLockTimer = Math.max(0, wallJumpLockTimer - 1000 * DT);

    // ---- Wall-slide detection ----
    const onWall = !result.grounded && (result.wallLeft || result.wallRight);
    const holdingIntoWall =
      (result.wallLeft && left) || (result.wallRight && right);
    wallSliding = onWall && holdingIntoWall && velY >= 0;

    // Reset wall-jump side tracker when grounded
    if (result.grounded) {
      lastWallJumpSide = 0;
    }

    // Jump / swim / wall-jump
    const canJump = result.grounded || result.timeSinceGrounded * 1000 < COYOTE_MS || inWater;
    // Wall-jump allowed only if touching the OPPOSITE wall from last wall-jump
    const wallSide = result.wallLeft ? -1 : result.wallRight ? 1 : 0;
    const canWallJump = !result.grounded && onWall && wallSide !== lastWallJumpSide;
    let jumped = false;
    let wallJumped = false;

    if (jumpBufferTimer > 0 && canJump) {
      velY = inWater ? -JUMP_SPEED * 0.7 : -JUMP_SPEED;
      jumpBufferTimer = 0;
      jumped = true;
      lastWallJumpSide = 0; // ground jump resets tracker
    } else if (jumpBufferTimer > 0 && canWallJump) {
      // Wall-jump: kick away from wall + upward boost
      velY = WALL_JUMP_VY;
      wallJumpKickVx = result.wallLeft ? WALL_JUMP_VX : -WALL_JUMP_VX;
      moveX = wallJumpKickVx;
      playerFacingRight = result.wallLeft; // face away from wall
      wallJumpLockTimer = WALL_JUMP_LOCK_MS;
      jumpBufferTimer = 0;
      wallJumped = true;
      lastWallJumpSide = wallSide; // remember which wall we jumped off
    }

    // Bounce pad: override vertical velocity with strong upward launch
    if (onBounce) {
      velY = -BOUNCE_SPEED;
      jumped = true;
    }

    // Variable jump height — cut upward velocity on release (not in water, not bounced)
    if (!inWater && !onBounce && !jumpKey && velY < 0) {
      velY *= 0.85;
    }

    // Apply velocity — only override what's needed, preserve engine physics
    const curVy = player.velocity.y;

    // Moving platform: add platform velocity so player rides with it
    const platVx = result.onMovingPlatform ? result.groundBody.velocity.x : 0;

    // Horizontal: player input + platform carry (no friction accumulation)
    // During wall-jump lock, use the wall-jump kick direction instead of input
    let newVx;
    if (wallJumpLockTimer > 0) {
      newVx = wallJumpKickVx; // maintain kick direction during lock period
    } else {
      newVx = moveX + platVx;
    }

    // Vertical
    let newVy = curVy; // default: let engine handle gravity/buoyancy
    if (jumped || wallJumped) {
      newVy = velY;
    } else if (wallSliding && curVy > WALL_SLIDE_MAX_VY) {
      // Wall-slide: cap downward velocity for slower descent
      newVy = WALL_SLIDE_MAX_VY;
    } else if (!jumpKey && curVy < 0 && !inWater) {
      newVy = velY; // variable jump height cut
    }

    player.velocity = new Vec2(newVx, newVy);

    // Clamp player to world bounds
    const px = player.position.x;
    const py = player.position.y;
    if (px < PLAYER_R || px > WORLD_W - PLAYER_R) {
      player.position = new Vec2(
        Math.max(PLAYER_R, Math.min(WORLD_W - PLAYER_R, px)),
        py,
      );
    }

    // Update coin popups
    for (let i = coinPopups.length - 1; i >= 0; i--) {
      coinPopups[i].timer -= DT;
      coinPopups[i].y -= 30 * DT; // float upward
      if (coinPopups[i].timer <= 0) coinPopups.splice(i, 1);
    }
  },

  // ---- Custom render (camera-aware) ----
  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    _nonCanvasRenderer = false;
    ctx.save();
    ctx.translate(-camX, -camY);

    drawGrid(ctx, W, H, camX, camY);

    // Water zones
    for (const body of space.bodies) {
      if (body._isWater) {
        const px = body.position.x;
        const py = body.position.y;
        const hw = (body._waterW || 480) / 2;
        const hh = (body._waterH || 80) / 2;
        ctx.fillStyle = "rgba(50,120,220,0.15)";
        ctx.fillRect(px - hw, py - hh, hw * 2, hh * 2);
        ctx.strokeStyle = "rgba(80,160,255,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const waveY = py - hh;
        for (let x = px - hw; x <= px + hw; x += 4) {
          const wy = waveY + Math.sin((x + performance.now() * 0.003) * 0.05) * 3;
          x === px - hw ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
    }

    // Bodies
    drawConstraints(ctx, space);
    for (const body of space.bodies) {
      if (body._isWater) continue;
      drawBody(ctx, body, showOutlines);
    }

    // Player eye
    if (player) {
      const px = player.position.x;
      const py = player.position.y;
      ctx.fillStyle = cc?.grounded ? "#3fb950" : "#f85149";
      ctx.beginPath();
      ctx.arc(px + (playerFacingRight ? 4 : -4), py - PLAYER_H / 2 + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coin pickup popups (world space)
    for (const p of coinPopups) {
      const alpha = Math.min(1, p.timer * 2);
      ctx.fillStyle = `rgba(210,153,34,${alpha})`;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("+1", p.x, p.y);
    }
    ctx.textAlign = "left";

    ctx.restore();

    // ---- HUD (screen space) ----
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "12px monospace";
    ctx.fillText("WASD / Arrow keys to move, Space to jump", 10, 20);

    // Coin counter
    ctx.fillStyle = "#d29922";
    ctx.fillText(`\u25CF ${coinCount}`, W - 60, 20);

    if (cc) {
      const state = wallSliding ? "WALL-SLIDE" : cc.grounded ? "GROUNDED" : "AIRBORNE";
      ctx.fillStyle = wallSliding ? "#a371f7" : cc.grounded ? "#3fb950" : "#f85149";
      ctx.fillText(state, 10, 40);
      if (cc.timeSinceGrounded > 0 && cc.timeSinceGrounded * 1000 < COYOTE_MS) {
        ctx.fillStyle = "#d29922";
        ctx.fillText("COYOTE", 100, 40);
      }
      if (wallJumpLockTimer > 0) {
        ctx.fillStyle = "#a371f7";
        ctx.fillText("WALL-JUMP", 100, 40);
      }
      if (onIce) {
        ctx.fillStyle = "#8cd2ff";
        ctx.fillText("ICE", 100, 40);
      }
    }

    // Legend
    const ly = H - 12;
    ctx.font = "10px monospace";
    ctx.fillStyle = "#a371f7";
    ctx.fillText("\u25AC one-way (jump through)", 10, ly);
    ctx.fillStyle = "#607888";
    ctx.fillText("\u25AC solid", 200, ly);
    ctx.fillStyle = "#f85149";
    ctx.fillText("\u25AC bounce pad", 260, ly);
    ctx.fillStyle = "#8cd2ff";
    ctx.fillText("\u25AC ice (slippery)", 370, ly);
    ctx.fillStyle = "#d29922";
    ctx.fillText("\u25CF coin", 510, ly);
  },

  // ---- PixiJS render ----
  renderPixi(adapter, space, W, H, showOutlines, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
    _nonCanvasRenderer = true;

    const { PIXI, app } = adapter.getEngine();
    if (!PIXI || !app) return;

    // Sync body sprites
    adapter.syncBodies(space);

    // Apply camera offset to the stage
    app.stage.x = -camX;
    app.stage.y = -camY;

    // Lazy-create water overlay graphics
    if (!app.stage._ccWaterGfx) {
      app.stage._ccWaterGfx = new PIXI.Graphics();
      app.stage.addChild(app.stage._ccWaterGfx);
    }
    const waterGfx = app.stage._ccWaterGfx;
    waterGfx.clear();

    // Draw water zones
    for (const body of space.bodies) {
      if (!body._isWater) continue;
      const px = body.position.x;
      const py = body.position.y;
      const hw = (body._waterW || 480) / 2;
      const hh = (body._waterH || 80) / 2;

      // Water fill
      waterGfx.rect(px - hw, py - hh, hw * 2, hh * 2);
      waterGfx.fill({ color: 0x3278dc, alpha: 0.15 });

      // Animated wave line
      const now = performance.now();
      const waveY = py - hh;
      waterGfx.moveTo(px - hw, waveY + Math.sin((px - hw + now * 0.003) * 0.05) * 3);
      for (let x = px - hw + 4; x <= px + hw; x += 4) {
        const wy = waveY + Math.sin((x + now * 0.003) * 0.05) * 3;
        waterGfx.lineTo(x, wy);
      }
      waterGfx.stroke({ color: 0x50a0ff, width: 1.5, alpha: 0.5 });
    }

    // Keep water on top
    app.stage.setChildIndex(waterGfx, app.stage.children.length - 1);

    // Lazy-create player eye overlay
    if (!app.stage._ccOverlayGfx) {
      app.stage._ccOverlayGfx = new PIXI.Graphics();
      app.stage.addChild(app.stage._ccOverlayGfx);
    }
    const overlay = app.stage._ccOverlayGfx;
    overlay.clear();

    // Player eye
    if (player) {
      const px = player.position.x;
      const py = player.position.y;
      const eyeColor = cc?.grounded ? 0x3fb950 : 0xf85149;
      overlay.circle(px + (playerFacingRight ? 4 : -4), py - PLAYER_H / 2 + 8, 2);
      overlay.fill({ color: eyeColor, alpha: 1 });
    }

    app.stage.setChildIndex(overlay, app.stage.children.length - 1);

    app.render();
  },

  // ---- Three.js render ----
  render3d(renderer, scene, camera, space, W, H, camX = 0, camY = 0) {
    _lastCamX = camX;
    _lastCamY = camY;
    _nonCanvasRenderer = true;

    // Lazy-load THREE
    if (!_THREE) {
      loadThree().then(mod => { _THREE = mod; });
      renderer.render(scene, camera);
      return;
    }

    // Camera offset — move Three.js camera to follow player
    const baseCamX = W / 2;
    const baseCamY = -H / 2;
    const camZ = camera.position.z; // preserve Z distance
    camera.position.set(baseCamX + camX, baseCamY - camY, camZ);
    camera.lookAt(baseCamX + camX, baseCamY - camY, 0);

    // Lazy mesh set on the scene
    if (!scene.userData._ccMeshes) scene.userData._ccMeshes = [];
    const meshes = scene.userData._ccMeshes;

    const MESH_COLORS = [
      0x4fc3f7, 0xffb74d, 0x81c784, 0xef5350,
      0xce93d8, 0x4dd0e1, 0xfff176, 0xff8a65,
    ];

    // Remove stale
    const spaceBodies = new Set();
    for (const body of space.bodies) spaceBodies.add(body);
    for (let i = meshes.length - 1; i >= 0; i--) {
      if (!spaceBodies.has(meshes[i].body)) {
        scene.remove(meshes[i].mesh);
        meshes[i].mesh.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
            else c.material.dispose();
          }
        });
        meshes.splice(i, 1);
      }
    }

    // Add new
    const tracked = new Set(meshes.map(m => m.body));
    for (const body of space.bodies) {
      if (tracked.has(body)) continue;
      if (body.userData?._hidden3d) continue;
      if (body._isWater) continue; // water rendered separately

      for (const shape of body.shapes) {
        let geom;
        if (shape.isCircle()) {
          geom = new _THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
        } else if (shape.isCapsule()) {
          // True 3D capsule along nape's +X spine (Three's CapsuleGeometry
          // builds along +Y, so rotate 90° around Z).
          const cap = shape.castCapsule;
          const length = cap.halfLength * 2;
          geom = new _THREE.CapsuleGeometry(cap.radius, length, 8, 16);
          geom.rotateZ(Math.PI / 2);
        } else if (shape.isPolygon()) {
          const verts = shape.castPolygon.localVerts;
          if (verts.length < 3) continue;
          const pts = [];
          for (let v = 0; v < verts.length; v++) {
            pts.push(new _THREE.Vector2(verts.at(v).x, verts.at(v).y));
          }
          geom = new _THREE.ExtrudeGeometry(
            new _THREE.Shape(pts),
            { depth: 30, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2 },
          );
          geom.applyMatrix4(new _THREE.Matrix4().makeScale(1, -1, 1));
          geom.computeVertexNormals();
          geom.translate(0, 0, -15);
        }
        if (!geom) continue;

        // Custom colors for special bodies
        let color;
        if (body.userData?._color) {
          // Bounce pad / ice — parse hex stroke color
          const hex = body.userData._color.stroke;
          color = parseInt(hex.replace("#", ""), 16);
        } else if (body.userData?._colorIdx !== undefined) {
          const cIdx = body.userData._colorIdx % MESH_COLORS.length;
          color = body.isStatic() ? 0x455a64 : MESH_COLORS[cIdx];
        } else {
          color = body.isStatic() ? 0x455a64 : MESH_COLORS[0];
        }

        const mesh = new _THREE.Mesh(geom, new _THREE.MeshPhongMaterial({
          color, shininess: 80, specular: 0x444444, side: _THREE.DoubleSide,
        }));
        scene.add(mesh);
        const edges = new _THREE.LineSegments(
          new _THREE.EdgesGeometry(geom, 15),
          new _THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
        );
        mesh.add(edges);
        meshes.push({ mesh, body, edges });
      }
    }

    // Water volume (lazy create)
    if (!scene.userData._ccWater) {
      for (const body of space.bodies) {
        if (!body._isWater) continue;
        const ww = body._waterW || 480;
        const wh = body._waterH || 80;
        const volGeom = new _THREE.BoxGeometry(ww, wh, 60);
        const volMat = new _THREE.MeshPhongMaterial({
          color: 0x1e90ff, transparent: true, opacity: 0.25,
          emissive: 0x0e4478, emissiveIntensity: 0.6,
          side: _THREE.DoubleSide, depthWrite: false,
        });
        const volMesh = new _THREE.Mesh(volGeom, volMat);
        volMesh.position.set(body.position.x, -body.position.y, 0);
        volMesh.renderOrder = 999;
        scene.add(volMesh);
        scene.userData._ccWater = volMesh;
        break;
      }
    }

    // Sync positions
    for (const { mesh, body } of meshes) {
      mesh.position.set(body.position.x, -body.position.y, 0);
      mesh.rotation.z = -body.rotation;
    }

    renderer.render(scene, camera);
  },

  // ---- HUD overlay (used by both Three.js and PixiJS modes) ----
  render3dOverlay(ctx, space, W, H) {
    ctx.save();

    // ---- World-space elements (projected to screen) ----
    // Only draw in 3D/PixiJS modes — the 2D canvas render() already handles these
    if (_nonCanvasRenderer) {
      // Player eye
      if (player) {
        const sx = player.position.x - _lastCamX;
        const sy = player.position.y - _lastCamY;
        ctx.fillStyle = cc?.grounded ? "#3fb950" : "#f85149";
        ctx.beginPath();
        ctx.arc(sx + (playerFacingRight ? 4 : -4), sy - PLAYER_H / 2 + 8, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Coin pickup popups (world → screen)
      for (const p of coinPopups) {
        const sx = p.x - _lastCamX;
        const sy = p.y - _lastCamY;
        const alpha = Math.min(1, p.timer * 2);
        ctx.fillStyle = `rgba(210,153,34,${alpha})`;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText("+1", sx, sy);
      }
      ctx.textAlign = "left";
    }

    // ---- HUD (screen space) ----
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "12px monospace";
    ctx.fillText("WASD / Arrow keys to move, Space to jump", 10, 20);

    // Coin counter
    ctx.fillStyle = "#d29922";
    ctx.fillText(`\u25CF ${coinCount}`, W - 60, 20);

    if (cc) {
      const state = wallSliding ? "WALL-SLIDE" : cc.grounded ? "GROUNDED" : "AIRBORNE";
      ctx.fillStyle = wallSliding ? "#a371f7" : cc.grounded ? "#3fb950" : "#f85149";
      ctx.fillText(state, 10, 40);
      if (cc.timeSinceGrounded > 0 && cc.timeSinceGrounded * 1000 < COYOTE_MS) {
        ctx.fillStyle = "#d29922";
        ctx.fillText("COYOTE", 100, 40);
      }
      if (wallJumpLockTimer > 0) {
        ctx.fillStyle = "#a371f7";
        ctx.fillText("WALL-JUMP", 100, 40);
      }
      if (onIce) {
        ctx.fillStyle = "#8cd2ff";
        ctx.fillText("ICE", 100, 40);
      }
    }

    // Legend
    const ly = H - 12;
    ctx.font = "10px monospace";
    ctx.fillStyle = "#a371f7";
    ctx.fillText("\u25AC one-way (jump through)", 10, ly);
    ctx.fillStyle = "#607888";
    ctx.fillText("\u25AC solid", 200, ly);
    ctx.fillStyle = "#f85149";
    ctx.fillText("\u25AC bounce pad", 260, ly);
    ctx.fillStyle = "#8cd2ff";
    ctx.fillText("\u25AC ice (slippery)", 370, ly);
    ctx.fillStyle = "#d29922";
    ctx.fillText("\u25CF coin", 510, ly);
    ctx.restore();
  },
};
