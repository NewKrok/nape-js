import {
  Body, BodyType, Vec2, Circle, Polygon, Capsule,
} from "../nape-js.esm.js?v=3.40.0";

// ── Constants ──────────────────────────────────────────────────────────────
const BLADE_HALF  = 80;   // half-length of the capsule (center → tip), px
const BLADE_THICK = 10;   // capsule diameter, px
const SWING_SPEED = 1.8;  // rad/s  (one full revolution every ~3.5 s)
const OBSTACLE_R  = 65;   // ring radius where the static obstacles sit
const CAST_DT     = 0.35; // seconds ahead for convexMultiCast
const GHOSTS      = 10;   // number of ghost outlines in the swept-arc visualisation
const NORMAL_LEN  = 20;   // length of hit-normal arrows, px

// ── Module-level state (reset in setup) ────────────────────────────────────
let _sword     = null;  // kinematic Body
let _blade     = null;  // Capsule shape attached to _sword
let _angle     = 0;     // current rotation of the sword body (radians)
let _firstHit  = null;  // { x, y, nx, ny, toi } | null  — from convexCast
let _multiHits = [];    // [{ x, y, nx, ny, toi }]        — from convexMultiCast

// ── Helpers ────────────────────────────────────────────────────────────────
function spawnObstacle(space, x, y, colorIdx) {
  const body = new Body(BodyType.STATIC, new Vec2(x, y));
  if (colorIdx % 2 === 0) {
    body.shapes.add(new Polygon(Polygon.box(28, 28)));
  } else {
    body.shapes.add(new Circle(16));
  }
  try { body.userData._colorIdx = colorIdx % 6; } catch (_) {}
  body.space = space;
  return body;
}

// Draw a capsule outline in the 2D overlay context (no fill).
// Applies its own save/translate/rotate/restore internally.
function drawCapsuleOutline(ctx, cx, cy, angle, halfLen, radius) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  // A capsule = rectangle + two semicircle end-caps.
  // halfLen already accounts for the cap radius (see Capsule construction).
  const hw = halfLen - radius; // half-distance between cap centres
  ctx.beginPath();
  ctx.moveTo(-hw, -radius);
  ctx.lineTo( hw, -radius);
  ctx.arc( hw, 0, radius, -Math.PI / 2,  Math.PI / 2);
  ctx.lineTo(-hw, radius);
  ctx.arc(-hw, 0, radius,  Math.PI / 2, -Math.PI / 2);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// ── Demo definition ────────────────────────────────────────────────────────
export default {
  id:    "convex-cast",
  label: "Convex Cast",
  tags:  ["ConvexCast", "ConvexMultiCast", "CCD", "Query", "Sweep", "Raycasting"],
  featured: false,
  desc:
    "A spinning blade sweeps obstacles using <code>space.convexCast()</code> and " +
    "<code>space.convexMultiCast()</code>. The <b>red</b> marker is the first hit " +
    "in the next frame; <b>yellow</b> dots are all hits within the next 0.35 s. " +
    "<b>Click</b> to spawn dynamic bodies into the sweep zone.",
  walls: true,
  workerCompatible: false,

  moduleState:
    `let _sword = null;\nlet _blade = null;\n` +
    `let _angle = 0;\nlet _firstHit = null;\nlet _multiHits = [];`,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0); // zero-g top-down arena

    const cx = W / 2;
    const cy = H / 2;

    // ── Sword ──────────────────────────────────────────────────────────────
    // Kinematic body at the arena centre; the capsule is centred on the body
    // and rotates like a clock hand (both tips sweep identical arcs).
    _sword = new Body(BodyType.KINEMATIC, new Vec2(cx, cy));
    _blade = new Capsule(BLADE_HALF * 2, BLADE_THICK);
    _sword.shapes.add(_blade);
    _sword.space = space;

    // Initialise module state
    _angle     = 0;
    _firstHit  = null;
    _multiHits = [];

    // ── Static obstacle ring ───────────────────────────────────────────────
    // 8 alternating boxes and circles sit just within the blade's reach.
    const N = 8;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      spawnObstacle(
        space,
        cx + Math.cos(a) * OBSTACLE_R,
        cy + Math.sin(a) * OBSTACLE_R,
        i,
      );
    }
  },

  step(space) {
    if (!_sword || !_blade) return;

    // ── Advance sword rotation manually ───────────────────────────────────
    // The body is kinematic, so we drive it explicitly. We also temporarily
    // set angularVel so convexCast knows the sweep direction.
    _angle += SWING_SPEED * (1 / 60);
    _sword.rotation      = _angle;
    _sword.velocity      = new Vec2(0, 0);
    _sword.angularVel    = SWING_SPEED;  // needed by convexCast internals

    // ── convexCast — first hit in the very next frame ──────────────────────
    const first = space.convexCast(_blade, 1 / 60, false);
    if (first) {
      _firstHit = {
        x: first.position.x,
        y: first.position.y,
        nx: first.normal.x,
        ny: first.normal.y,
        toi: first.toi,
      };
      first.dispose(); // return pooled object
    } else {
      _firstHit = null;
    }

    // ── convexMultiCast — all hits over the next CAST_DT seconds ──────────
    _multiHits = [];
    const multi = space.convexMultiCast(_blade, CAST_DT, false);
    for (const r of multi) {
      _multiHits.push({
        x: r.position.x,
        y: r.position.y,
        nx: r.normal.x,
        ny: r.normal.y,
        toi: r.toi,
      });
      r.dispose();
    }

    // Reset angularVel after the casts so space.step() does not also advance
    // the rotation (the body is kinematic — we control its position manually).
    _sword.angularVel = 0;
  },

  click(x, y, space) {
    // Spawn a small dynamic body at the click point so it drifts into the blade.
    const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    if (Math.random() < 0.5) {
      body.shapes.add(new Circle(14));
    } else {
      body.shapes.add(new Polygon(Polygon.box(24, 24)));
    }
    try { body.userData._colorIdx = Math.floor(Math.random() * 6); } catch (_) {}
    body.space = space;
  },

  render3dOverlay(ctx, space, W, H) {
    const cx = W / 2;
    const cy = H / 2;

    // ── Swept-arc ghost outlines ───────────────────────────────────────────
    // Draw GHOSTS semi-transparent capsule outlines from the current angle
    // forward through the convexMultiCast window (CAST_DT * SWING_SPEED rad).
    const sweepSpan = SWING_SPEED * CAST_DT;
    ctx.save();
    for (let i = 1; i <= GHOSTS; i++) {
      const t     = i / GHOSTS;
      const a     = _angle + t * sweepSpan;
      const alpha = 0.04 + 0.04 * (1 - t);
      ctx.strokeStyle = `rgba(88,166,255,${alpha.toFixed(2)})`;
      ctx.lineWidth   = 1;
      drawCapsuleOutline(ctx, cx, cy, a, BLADE_HALF, BLADE_THICK / 2);
    }
    ctx.restore();

    // ── Multi-hit markers — yellow ─────────────────────────────────────────
    for (const h of _multiHits) {
      ctx.save();
      ctx.strokeStyle = "rgba(240,200,60,0.65)";
      ctx.fillStyle   = "rgba(240,200,60,0.25)";
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Normal arrow
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(h.x + h.nx * NORMAL_LEN, h.y + h.ny * NORMAL_LEN);
      ctx.stroke();
      ctx.restore();
    }

    // ── First-hit marker — red (drawn on top of yellow markers) ───────────
    if (_firstHit) {
      ctx.save();
      ctx.fillStyle   = "rgba(255,80,80,0.95)";
      ctx.strokeStyle = "#ff5050";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(_firstHit.x, _firstHit.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Normal arrow
      ctx.beginPath();
      ctx.moveTo(_firstHit.x, _firstHit.y);
      ctx.lineTo(
        _firstHit.x + _firstHit.nx * (NORMAL_LEN + 6),
        _firstHit.y + _firstHit.ny * (NORMAL_LEN + 6),
      );
      ctx.stroke();
      ctx.restore();
    }

    // ── Pivot indicator ────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = "rgba(180,180,180,0.5)";
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── HUD ───────────────────────────────────────────────────────────────
    // Two fixed-width lines prevent text reflow / width flicker as counts change.
    const hitLabel   = _firstHit ? "hit" : "---";
    const countPad   = String(_multiHits.length).padStart(2, " ");
    ctx.save();
    ctx.font      = "12px monospace";
    ctx.fillStyle = "rgba(200,210,230,0.75)";
    ctx.fillText(`convexCast:       ${hitLabel}`, 12, 20);
    ctx.fillText(`convexMultiCast:  ${countPad} hit${_multiHits.length !== 1 ? "s" : " "} in ${CAST_DT}s`, 12, 36);
    ctx.restore();
  },
};
