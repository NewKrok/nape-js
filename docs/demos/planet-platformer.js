import {
  Body, BodyType, Vec2, Circle, Capsule, Polygon, Material, CbType, CbEvent,
  InteractionType, InteractionListener,
  CharacterController, RadialGravityField, RadialGravityFieldGroup,
} from "../nape-js.esm.js?v=3.42.0";
import { drawBody, drawGrid } from "../renderer.js?v=3.42.0";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYER_W = 14;
const PLAYER_H = 26;
const MOVE_SPEED = 170;
const JUMP_SPEED = 440;
const COYOTE_MS = 100;
const JUMP_BUFFER_MS = 100;
const DT = 1 / 60;
const ROTATE_LERP = 0.18;        // capsule rotation smoothing
const NEAREST_HYSTERESIS = 0.9;  // new planet must be < 0.9× current distance to switch

// Planet definitions — pos, radius, field strength + maxRadius.
// Tuned so neighboring planet wells barely overlap — the player feels each
// planet as a distinct "island" with a thin gravity-free transit between
// them, except for the Goliath whose huge well dominates the east.
const PLANETS = [
  { x:  220, y: 460, r:  60, strength: 340, maxRadius: 130 }, // A — start
  { x:  500, y: 250, r:  50, strength: 280, maxRadius: 115 }, // B — upper-left
  { x:  820, y: 440, r:  44, strength: 260, maxRadius: 110 }, // C — middle
  { x:  640, y: 700, r:  40, strength: 240, maxRadius: 100 }, // D — south-west
  { x: 1100, y: 250, r:  56, strength: 300, maxRadius: 130 }, // E — north-mid
  { x: 1100, y: 600, r:  50, strength: 280, maxRadius: 120 }, // F — south-mid
  { x: 1500, y: 340, r:  48, strength: 260, maxRadius: 115 }, // G — pre-Goliath
  { x: 1780, y: 560, r:  40, strength: 240, maxRadius: 100 }, // H — small stepping stone
  { x: 2200, y: 800, r: 280, strength: 950, maxRadius: 460 }, // ★ Goliath — far east, monumental
  { x: 1680, y: 990, r:  42, strength: 240, maxRadius: 105 }, // J — south outpost
];

// World extents — used for the camera bounds.
const WORLD_W = 2600;
const WORLD_H = 1200;

// Coin / star positions are generated from a list of (planet index, angle,
// value) tuples — the actual world position is computed from the planet's
// center + (planet.r + COIN_SURFACE_OFFSET) along that angle, so coins
// always sit at a fixed height above whichever planet they're attached to.
// Angles are in radians (0 = east, -PI/2 = north, PI/2 = south).
const COIN_SURFACE_OFFSET = 24; // distance above the planet surface (px)

// Each entry: { planet: index into PLANETS, angle: radians, v: 1 or 5 }
const PICKUP_DEFS = [
  // around A (start)
  { planet: 0, angle: -Math.PI / 2,                v: 1 }, // top
  { planet: 0, angle: -Math.PI / 2 - 0.7,          v: 1 }, // upper-left
  { planet: 0, angle: -Math.PI / 2 + 0.7,          v: 1 }, // upper-right
  // around B
  { planet: 1, angle: -Math.PI / 2,                v: 1 },
  { planet: 1, angle: -Math.PI / 2 - 0.8,          v: 1 },
  { planet: 1, angle: -Math.PI / 2 + 0.8,          v: 1 },
  // around C
  { planet: 2, angle: -Math.PI / 2,                v: 1 },
  { planet: 2, angle:  Math.PI / 2 - 0.4,          v: 1 },
  // around D
  { planet: 3, angle: -Math.PI / 2,                v: 1 },
  { planet: 3, angle:  Math.PI / 2,                v: 1 },
  // around E
  { planet: 4, angle: -Math.PI / 2,                v: 1 },
  { planet: 4, angle: -Math.PI / 2 + 0.7,          v: 1 },
  // around F
  { planet: 5, angle: -Math.PI / 2,                v: 1 },
  { planet: 5, angle:  Math.PI / 2 - 0.5,          v: 1 },
  // around G (pre-Goliath)
  { planet: 6, angle: -Math.PI / 2,                v: 1 },
  { planet: 6, angle: -Math.PI / 2 + 0.8,          v: 1 },
  // around H (stepping stone)
  { planet: 7, angle: -Math.PI / 2,                v: 1 },
  // around Goliath — ★ on top + a ring of coins
  { planet: 8, angle: -Math.PI / 2,                v: 5 }, // ★ goal
  { planet: 8, angle: -Math.PI / 2 - 0.6,          v: 1 },
  { planet: 8, angle: -Math.PI / 2 + 0.6,          v: 1 },
  { planet: 8, angle:  Math.PI / 2,                v: 1 },
  { planet: 8, angle:  Math.PI / 2 - 0.6,          v: 1 },
  { planet: 8, angle:  Math.PI / 2 + 0.6,          v: 1 },
  // around J (south outpost)
  { planet: 9, angle: -Math.PI / 2,                v: 1 },
  { planet: 9, angle: -Math.PI / 2 + 0.8,          v: 1 },
];

// Random debris (small dynamic squares + circles scattered on each planet).
// Counts per planet — Goliath gets the most so it feels populated.
const DEBRIS_PER_PLANET = [3, 3, 3, 3, 3, 3, 3, 2, 12, 2];
const DEBRIS_SURFACE_OFFSET = 20; // spawn height above the surface (px)

// ---------------------------------------------------------------------------
// State (reset in setup)
// ---------------------------------------------------------------------------

let _planets = [];      // Body[]
let _fields = null;     // RadialGravityFieldGroup
let _fieldByPlanet = new WeakMap(); // planet body -> RadialGravityField
let _player = null;
let _cc = null;
let _coinTag = null;
let _playerTag = null;
let _keys = {};
let _prevJumpKey = false;
let _jumpBufferTimer = 0;
let _coinCount = 0;
let _coinTotal = 0;
let _starCollected = false;
let _winTimer = 0;
let _coinPopups = [];   // { x, y, timer, value }
let _currentPlanet = null;
let _currentRotation = 0;
let _coinCount_byBody = new WeakMap(); // body -> value (used in begin listener)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nearestPlanet(px, py) {
  // Use surface distance (d - r) instead of center distance — otherwise a
  // huge planet whose center is far away (e.g. Goliath, r=280) can lose the
  // hysteresis race against a small nearby one whose center happens to be
  // closer, even when the player is physically standing on the giant.
  const surfaceDist = (p) => {
    const dx = p.position.x - px;
    const dy = p.position.y - py;
    const d = Math.sqrt(dx * dx + dy * dy);
    const r = p.shapes.at(0).radius ?? 0;
    return Math.max(0, d - r);
  };

  let best = _currentPlanet ?? _planets[0];
  let bestD = best ? surfaceDist(best) : Infinity;
  for (const p of _planets) {
    if (p === best) continue;
    const d = surfaceDist(p);
    // Hysteresis — only switch if the candidate is meaningfully closer to
    // its surface than the current planet, so we don't flip-flop at the
    // boundary between two equally-close worlds.
    if (d < bestD * NEAREST_HYSTERESIS) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

function shortestAngleDelta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

export default {
  id: "planet-platformer",
  label: "Planet Platformer",
  featured: true,
  featuredOrder: 7,
  tags: ["RadialGravityField", "CharacterController", "Mario-Galaxy-style", "Pickups", "Platformer"],
  desc:
    "Walk around eight planetoids — each with its own <b>RadialGravityField</b>, including a giant Goliath in the east. Gravity points toward the nearest planet, the <b>CharacterController.down</b> direction is updated each frame, so jumping, slope-walking and ground detection all work in any orientation. The camera follows the player across the world. Collect coins and reach the <b>★ star</b> on top of Goliath. <b>WASD/Arrows</b> + <b>Space</b>.",
  walls: false,

  camera: null,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0); // only the radial fields

    _coinTag = new CbType();
    _playerTag = new CbType();

    // ---- Planets ----
    _planets = [];
    _fields = new RadialGravityFieldGroup();
    _fieldByPlanet = new WeakMap();
    for (const def of PLANETS) {
      const planet = new Body(BodyType.STATIC, new Vec2(def.x, def.y));
      planet.shapes.add(new Circle(def.r, undefined, new Material(0, 0.7, 0.9, 1)));
      planet.userData._isPlanet = true;
      planet.userData._maxRadius = def.maxRadius;
      planet.space = space;
      _planets.push(planet);

      const field = new RadialGravityField({
        source: planet,
        strength: def.strength,
        falloff: "constant",          // Mario-Galaxy style: pull is constant near the surface
        scaleByMass: false,           // direct accel — easier to tune
        maxRadius: def.maxRadius,
        minRadius: def.r,
        softening: 50,
        // The player only feels the dominant planet's pull (set per-frame
        // via _currentPlanet). All other dynamic bodies (debris) feel every
        // field they happen to be inside, so loose junk falls naturally onto
        // whichever planet is closest.
        bodyFilter: (body) => {
          if (body !== _player) return true;
          return planet === _currentPlanet;
        },
      });
      _fields.add(field);
      _fieldByPlanet.set(planet, field);
    }

    // ---- Player (capsule on top of Planet A) ----
    const startPlanet = _planets[0];
    const startX = startPlanet.position.x;
    const startY = startPlanet.position.y - PLANETS[0].r - PLAYER_H / 2 - 1;
    _player = new Body(BodyType.DYNAMIC, new Vec2(startX, startY));
    const playerShape = new Capsule(PLAYER_H, PLAYER_W, undefined, new Material(0, 0.4, 0.4, 1));
    playerShape.cbTypes.add(_playerTag);
    _player.shapes.add(playerShape);
    _player.rotation = Math.PI / 2; // capsule spine vertical (feet pointing down)
    _player.allowRotation = false;
    _player.isBullet = true;
    _player.space = space;
    try { _player.userData._colorIdx = 3; } catch (_) {}
    _currentRotation = _player.rotation;

    // ---- Pickups (positioned relative to each planet's surface) ----
    _coinTotal = PICKUP_DEFS.length;
    _coinCount_byBody = new WeakMap();
    for (const def of PICKUP_DEFS) {
      const planetDef = PLANETS[def.planet];
      const r = planetDef.r + COIN_SURFACE_OFFSET;
      const x = planetDef.x + Math.cos(def.angle) * r;
      const y = planetDef.y + Math.sin(def.angle) * r;
      const isStarVal = def.v === 5;
      const body = new Body(BodyType.STATIC, new Vec2(x, y));
      const shape = new Circle(isStarVal ? 8 : 5);
      shape.sensorEnabled = true;
      shape.cbTypes.add(_coinTag);
      body.shapes.add(shape);
      body.space = space;
      _coinCount_byBody.set(body, def.v);
      try { body.userData._colorIdx = isStarVal ? 2 : 1; body.userData._isStar = isStarVal; } catch (_) {}
    }

    // ---- Random debris on each planet (small dynamic squares + circles) ----
    // Deterministic pseudo-random so the layout is the same every run.
    let rngSeed = 1234567;
    const rng = () => {
      rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
      return rngSeed / 0x100000000;
    };
    for (let i = 0; i < PLANETS.length; i++) {
      const planetDef = PLANETS[i];
      const count = DEBRIS_PER_PLANET[i] ?? 2;
      const r = planetDef.r + DEBRIS_SURFACE_OFFSET;
      for (let k = 0; k < count; k++) {
        const angle = rng() * Math.PI * 2;
        const x = planetDef.x + Math.cos(angle) * r;
        const y = planetDef.y + Math.sin(angle) * r;
        const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
        body.rotation = angle + Math.PI / 2; // align local +X away from planet
        if (rng() < 0.5) {
          // Square (Polygon) — omit explicit Material to avoid the known
          // Polygon-tunneling bug noted in MEMORY.md.
          const s = 8 + rng() * 7;
          body.shapes.add(new Polygon(Polygon.box(s, s)));
        } else {
          const radius = 5 + rng() * 5;
          body.shapes.add(new Circle(radius, undefined, new Material(0.1, 0.6, 0.8, 1)));
        }
        body.space = space;
        try { body.userData._colorIdx = (k % 5) + 1; } catch (_) {}
      }
    }

    // ---- Pickup listener (BEGIN, SENSOR) ----
    const pickupListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      _playerTag,
      _coinTag,
      (cb) => {
        let coinBody = null;
        const i1 = cb.int1, i2 = cb.int2;
        const b1 = i1.castBody ?? i1.castShape?.body ?? null;
        const b2 = i2.castBody ?? i2.castShape?.body ?? null;
        coinBody = (b1 && b1 !== _player) ? b1 : (b2 && b2 !== _player) ? b2 : null;
        if (coinBody && coinBody.space) {
          const v = _coinCount_byBody.get(coinBody) ?? 1;
          const cx = coinBody.position.x, cy = coinBody.position.y;
          const isStar = !!coinBody.userData?._isStar;
          coinBody.space = null;
          _coinCount += v;
          _coinPopups.push({ x: cx, y: cy - 10, timer: 1.2, value: v, star: isStar });
          if (isStar) {
            _starCollected = true;
            _winTimer = 3.0;
          }
        }
      },
    );
    pickupListener.space = space;

    // ---- Character Controller ----
    _cc = new CharacterController(space, _player, {
      maxSlopeAngle: Math.PI / 3,
      // Initial down points from player toward Planet A center.
      down: new Vec2(0, 1),
    });

    _currentPlanet = startPlanet;

    this.camera = {
      follow: _player,
      offsetX: 0,
      offsetY: 0,
      lerp: 1,                            // direct follow — no lerp jitter
      deadzone: { halfW: 80, halfH: 60 },
      bounds: { minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H },
    };

    // ---- Reset transient state ----
    _keys = {};
    _prevJumpKey = false;
    _jumpBufferTimer = 0;
    _coinCount = 0;
    _starCollected = false;
    _winTimer = 0;
    _coinPopups = [];

    // Keyboard
    this._onKeyDown = (e) => {
      _keys[e.code] = true;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") e.preventDefault();
    };
    this._onKeyUp = (e) => { _keys[e.code] = false; };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  },

  cleanup() {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp)   window.removeEventListener("keyup", this._onKeyUp);
  },

  step(space, W, H) {
    if (!_cc || !_player) return;

    // ---- 1) Pick the dominant planet first (used both for which field to
    //      enable and for the down/control direction). Choosing here keeps
    //      the player inside exactly one well at a time — no cross-pull
    //      from the giant Goliath while standing on its smaller neighbors.
    const px = _player.position.x;
    const py = _player.position.y;
    _currentPlanet = nearestPlanet(px, py);

    // ---- 2) Apply gravity fields ----
    // body.force persists across steps in nape, and RadialGravityField.apply()
    // adds to the existing force — so we must clear it each frame for every
    // dynamic body, otherwise field force accumulates unbounded.
    // The per-field bodyFilter ensures the player only feels _currentPlanet,
    // while debris feels every field whose well it sits inside.
    for (const body of space.bodies) {
      if (body.isDynamic()) body.force = new Vec2(0, 0);
    }
    _fields.apply(space);

    // ---- 3) Derive "down" from the current planet (only while inside its
    //      well — outside any well the player is in vacuum: no down vector,
    //      no air control, just inertia from their last jump).
    const dxP = _currentPlanet.position.x - px;
    const dyP = _currentPlanet.position.y - py;
    const distToCurrent = Math.sqrt(dxP * dxP + dyP * dyP) || 1;
    const inWell = distToCurrent <= (_currentPlanet.userData._maxRadius ?? Infinity);
    const downX = inWell ? dxP / distToCurrent : 0;
    const downY = inWell ? dyP / distToCurrent : 0;
    if (inWell) _cc.setDown(downX, downY);

    // ---- 3) Smoothly rotate capsule so feet point along down (only while
    //      inside a gravity well; in vacuum we keep the last orientation).
    if (inWell) {
      const targetRot = Math.atan2(downY, downX);
      const delta = shortestAngleDelta(_currentRotation, targetRot);
      _currentRotation += delta * ROTATE_LERP;
      _player.rotation = _currentRotation;
    }

    // ---- 4) Input ----
    const left  = _keys["ArrowLeft"]  || _keys["KeyA"];
    const right = _keys["ArrowRight"] || _keys["KeyD"];
    const jumpKey = _keys["Space"] || _keys["ArrowUp"] || _keys["KeyW"];
    const jumpJustPressed = jumpKey && !_prevJumpKey;
    _prevJumpKey = jumpKey;

    // ---- 5) Query controller state ----
    const result = _cc.update();

    // Jump buffering
    if (jumpJustPressed) _jumpBufferTimer = JUMP_BUFFER_MS;
    else _jumpBufferTimer = Math.max(0, _jumpBufferTimer - 1000 * DT);

    // ---- 6) Velocity update ----
    // In vacuum (no planet well around the player), skip all input handling
    // and let inertia carry — pressing left/right shouldn't magically push
    // you sideways with no surface to react against.
    if (inWell) {
      // Local axes:
      //   normal (up)   = (-downX, -downY)
      //   tangent (right) = (downY, -downX)   ← +90° CCW of down
      const tx = downY;
      const ty = -downX;
      const nx = -downX;
      const ny = -downY;

      // Decompose current velocity into tangential / normal components.
      const vx = _player.velocity.x;
      const vy = _player.velocity.y;
      let vTan = vx * tx + vy * ty;
      let vNor = vx * nx + vy * ny;

      // Tangential input — overrides existing tangential velocity (snappy moves).
      if (left)  vTan = -MOVE_SPEED;
      if (right) vTan =  MOVE_SPEED;
      if (!left && !right && result.grounded) vTan *= 0.6; // friction-ish on planet

      // Jump (with coyote time)
      const canJump = result.grounded || result.timeSinceGrounded * 1000 < COYOTE_MS;
      let jumped = false;
      if (_jumpBufferTimer > 0 && canJump) {
        vNor = JUMP_SPEED;       // +normal = away from planet
        _jumpBufferTimer = 0;
        jumped = true;
      }
      // Variable jump height — release cuts upward velocity, but only during
      // the ascent of the just-launched jump (≤ 0.3 s since leaving ground).
      if (!jumped && !jumpKey && vNor > 0 && result.timeSinceGrounded < 0.3) {
        vNor *= 0.85;
      }

      // Recompose velocity in world frame.
      const newVx = vTan * tx + vNor * nx;
      const newVy = vTan * ty + vNor * ny;
      _player.velocity = new Vec2(newVx, newVy);
    }

    // ---- 7) Out-of-bounds respawn ----
    if (px < -200 || px > WORLD_W + 200 || py < -200 || py > WORLD_H + 200) {
      _player.position = new Vec2(
        _planets[0].position.x,
        _planets[0].position.y - PLANETS[0].r - PLAYER_H / 2 - 1,
      );
      _player.velocity = new Vec2(0, 0);
    }

    // ---- 8) Update popups + win banner ----
    for (let i = _coinPopups.length - 1; i >= 0; i--) {
      _coinPopups[i].timer -= DT;
      _coinPopups[i].y -= 30 * DT;
      if (_coinPopups[i].timer <= 0) _coinPopups.splice(i, 1);
    }
    if (_winTimer > 0) _winTimer = Math.max(0, _winTimer - DT);
  },

  render(ctx, space, W, H, showOutlines, camX = 0, camY = 0) {
    // World-space rendering — translate by camera offset.
    ctx.save();
    ctx.translate(-camX, -camY);

    drawGrid(ctx, W, H, camX, camY);
    drawGravityRings(ctx);

    // ---- Bodies (planets, player, pickups) ----
    for (const body of space.bodies) {
      const isStar = body.userData?._isStar;
      if (isStar) {
        // Custom star render: orange filled circle with a glow.
        const cx = body.position.x, cy = body.position.y;
        ctx.fillStyle = "rgba(255,170,40,0.25)";
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffaa28";
        ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      drawBody(ctx, body, showOutlines);
    }

    drawCoinPopups(ctx);
    ctx.restore();

    drawHUD(ctx, W, H);
  },

  // 3D / Pixi overlay — draws the gravity rings + coin popups + HUD on top
  // of the WebGL/Pixi scene using the adapter's 2D overlay context.
  // Runner only routes this to threejs and pixijs adapters (canvas2d uses
  // the custom render() above), so there's no duplication.
  render3dOverlay(ctx, space, W, H, camX = 0, camY = 0) {
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGravityRings(ctx);
    drawCoinPopups(ctx);
    ctx.restore();

    drawHUD(ctx, W, H);
  },
};

// ---------------------------------------------------------------------------
// Shared overlay helpers (used by both canvas2d render() and the
// threejs/pixijs render3dOverlay)
// ---------------------------------------------------------------------------

function drawGravityRings(ctx) {
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  for (const planet of _planets) {
    const isCurrent = planet === _currentPlanet;
    ctx.strokeStyle = isCurrent ? "rgba(88,166,255,0.5)" : "rgba(120,150,200,0.18)";
    ctx.beginPath();
    ctx.arc(planet.position.x, planet.position.y, planet.userData._maxRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCoinPopups(ctx) {
  ctx.font = "bold 12px ui-monospace, monospace";
  for (const p of _coinPopups) {
    const alpha = Math.min(1, p.timer);
    ctx.fillStyle = p.star ? `rgba(255,170,40,${alpha})` : `rgba(241,196,64,${alpha})`;
    ctx.fillText("+" + p.value, p.x, p.y);
  }
}

function drawHUD(ctx, W, H) {
  ctx.fillStyle = "rgba(13,17,23,0.7)";
  ctx.fillRect(8, 8, 200, 26);
  ctx.fillStyle = "#e6edf3";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(`Score: ${_coinCount}`, 16, 26);

  if (_starCollected && _winTimer > 0) {
    const a = Math.min(1, _winTimer / 0.5);
    ctx.fillStyle = `rgba(13,17,23,${0.85 * a})`;
    ctx.fillRect(W / 2 - 130, H / 2 - 24, 260, 48);
    ctx.fillStyle = `rgba(255,170,40,${a})`;
    ctx.font = "bold 18px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("★ Reached the star!", W / 2, H / 2 + 6);
    ctx.textAlign = "start";
  }
}
