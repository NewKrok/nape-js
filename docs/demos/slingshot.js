import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
  fractureBody, CbType, CbEvent, InteractionListener, InteractionType,
} from "../nape-js.esm.js?v=3.41.0";

// ── Palette ──────────────────────────────────────────────────────────────
const FRAG_COLORS = [
  "#f85149", "#d29922", "#58a6ff", "#a371f7", "#3fb950", "#dbabff",
  "#ff7b72", "#ffa657", "#79c0ff", "#d2a8ff", "#7ee787", "#f0883e",
];

// ── Slingshot config ─────────────────────────────────────────────────────
const SLING_X = 120;
const SLING_Y_OFFSET = -80;
const BALL_R = 7;
const MAX_PULL = 120;
const LAUNCH_POWER = 18;

// ── Module-level state (reset in setup) ──────────────────────────────────
let slingAnchor = null;
let pulling = false;
let pullX = 0, pullY = 0;
let activeBall = null;
let launched = false;
let colorIdx = 0;

const cbBall   = new CbType();
const cbCastle = new CbType();
const cbWall   = new CbType();

// ── Helpers ──────────────────────────────────────────────────────────────
function createBreakableBox(space, x, y, w, h, ci) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.box(w, h)));
  body.userData._colorIdx = ci;
  body.userData._breakable = true;
  body.cbTypes.add(cbCastle);
  body.space = space;
  return body;
}

function spawnBall(space) {
  const ball = new Body(BodyType.DYNAMIC, new Vec2(slingAnchor.x, slingAnchor.y));
  ball.shapes.add(new Circle(BALL_R, undefined, new Material(0.3, 0.6, 0.4, 3)));
  ball.userData._colorIdx = 3;
  ball.userData._ball = true;
  ball.isBullet = true;
  ball.cbTypes.add(cbBall);
  ball.space = space;
  return ball;
}

function doFracture(body, impactX, impactY, impulse = 30) {
  if (!body.userData._breakable) return;
  const baseColor = (body.userData._colorIdx || 0) % FRAG_COLORS.length;
  try {
    const result = fractureBody(body, Vec2.get(impactX, impactY), {
      fragmentCount: 4,
      explosionImpulse: impulse,
    });
    const MIN_AREA = 250;
    result.fragments.forEach((f, i) => {
      f.userData._colorIdx = (baseColor + i) % FRAG_COLORS.length;
      f.userData._breakable = f.shapes.at(0).area >= MIN_AREA;
      f.userData._fragment = true;
      if (f.userData._breakable) f.cbTypes.add(cbCastle);
    });
  } catch { /* skip non-fractureable */ }
}

// ── Castle builder ───────────────────────────────────────────────────────
function buildCastle(space, cx, floorY) {
  const bh = 16;
  const colW = 12, colH = 50;

  function storey(x, baseY, width, ci) {
    const halfW = width / 2 - colW / 2;
    createBreakableBox(space, x - halfW, baseY - colH / 2, colW, colH, ci % 6);
    createBreakableBox(space, x + halfW, baseY - colH / 2, colW, colH, (ci + 1) % 6);
    createBreakableBox(space, x, baseY - colH - bh / 2, width, bh, (ci + 2) % 6);
    return baseY - colH - bh;
  }

  // Main tower — 3 levels
  let y = floorY;
  const widths = [160, 120, 80];
  for (let l = 0; l < widths.length; l++) {
    y = storey(cx, y, widths[l], colorIdx);
    colorIdx += 3;
  }
  createBreakableBox(space, cx, y - 14, 40, 24, colorIdx++ % 6);

  // Side towers
  for (const side of [-1, 1]) {
    const tx = cx + side * 110;
    let ty = floorY;
    ty = storey(tx, ty, 70, colorIdx);
    colorIdx += 3;
    createBreakableBox(space, tx, ty - 10, 30, 18, colorIdx++ % 6);
  }

  // Ground-level fill between towers
  for (let i = -2; i <= 2; i++) {
    createBreakableBox(space, cx + i * 32, floorY - bh / 2, 30, bh, colorIdx++ % 6);
  }
}

// ── Slingshot overlay drawing ────────────────────────────────────────────
function drawSlingshot(ctx) {
  if (!slingAnchor) return;

  const forkW = 20; // half-width of the fork top
  const forkL = { x: slingAnchor.x - forkW, y: slingAnchor.y - 10 };
  const forkR = { x: slingAnchor.x + forkW, y: slingAnchor.y - 10 };
  const trunkLen = 80; // trunk height down to ground

  ctx.strokeStyle = "#8B5E3C";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";

  // Y-shaped post — left arm
  ctx.beginPath(); ctx.moveTo(slingAnchor.x, slingAnchor.y + 20); ctx.lineTo(forkL.x, forkL.y); ctx.stroke();
  // Right arm
  ctx.beginPath(); ctx.moveTo(slingAnchor.x, slingAnchor.y + 20); ctx.lineTo(forkR.x, forkR.y); ctx.stroke();
  // Trunk
  ctx.beginPath(); ctx.moveTo(slingAnchor.x, slingAnchor.y + 20); ctx.lineTo(slingAnchor.x, slingAnchor.y + trunkLen); ctx.stroke();

  // Elastic bands
  if (pulling && activeBall) {
    ctx.strokeStyle = "#c44";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(forkL.x, forkL.y); ctx.lineTo(pullX, pullY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(forkR.x, forkR.y); ctx.lineTo(pullX, pullY); ctx.stroke();
  } else {
    ctx.strokeStyle = "#c44";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(forkL.x, forkL.y); ctx.lineTo(forkR.x, forkR.y); ctx.stroke();
  }
}

function drawTrajectory(ctx) {
  if (!pulling || !activeBall) return;
  const dx = slingAnchor.x - pullX;
  const dy = slingAnchor.y - pullY;
  const vx = dx * LAUNCH_POWER;
  const vy = dy * LAUNCH_POWER;
  const g = 600;
  const dt = 1 / 60;

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  let px = pullX, py = pullY, pvy = vy;
  for (let i = 0; i < 30; i++) {
    pvy += g * dt;
    px += vx * dt;
    py += pvy * dt;
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── Demo definition ──────────────────────────────────────────────────────
export default {
  id: "slingshot",
  label: "Slingshot Siege",
  tags: ["Destruction", "Voronoi", "Slingshot", "Click"],
  featured: true,
  featuredOrder: 3,
  desc:
    '<b>Drag</b> from the slingshot to aim, <b>release</b> to fire! Balls shatter the castle on impact. <b>Click</b> slingshot to reload.',
  walls: true,
  workerCompatible: false,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const floorY = H - 20;
    slingAnchor = new Vec2(SLING_X, floorY + SLING_Y_OFFSET);
    pulling = false;
    launched = false;
    colorIdx = 0;

    // Tag existing walls so castle pieces fracture on floor impact
    for (const body of space.bodies) {
      if (body.isStatic()) body.cbTypes.add(cbWall);
    }

    buildCastle(space, W - 200, floorY);

    activeBall = spawnBall(space);
    activeBall.type = BodyType.KINEMATIC;

    // Ball hits castle → fracture with moderate impulse
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      cbBall,
      cbCastle,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        if (!b1 || !b2) return;

        const castleBody = b1.userData._ball ? b2 : b1;
        const ballBody   = b1.userData._ball ? b1 : b2;

        const v1 = ballBody.velocity;
        const v2 = castleBody.velocity;
        const rvx = v1.x - v2.x, rvy = v1.y - v2.y;
        const speed = Math.sqrt(rvx * rvx + rvy * rvy);

        if (speed > 80 && castleBody.userData._breakable) {
          const mx = (b1.position.x + b2.position.x) / 2;
          const my = (b1.position.y + b2.position.y) / 2;
          setTimeout(() => {
            if (castleBody.space) doFracture(castleBody, mx, my, 40);
          }, 0);
        }
      },
    ));

    // Castle piece hits castle piece → fracture on hard impacts (falling debris, chain reactions)
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      cbCastle,
      cbCastle,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        if (!b1 || !b2) return;

        const v1 = b1.velocity;
        const v2 = b2.velocity;
        const rvx = v1.x - v2.x, rvy = v1.y - v2.y;
        const speed = Math.sqrt(rvx * rvx + rvy * rvy);

        if (speed > 200) {
          const mx = (b1.position.x + b2.position.x) / 2;
          const my = (b1.position.y + b2.position.y) / 2;
          // Fracture the faster-moving piece (or both if both fast enough)
          const s1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
          const s2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
          const target = s1 > s2 ? b2 : b1; // the one being hit harder
          setTimeout(() => {
            if (target.space && target.userData._breakable) {
              doFracture(target, mx, my, 15);
            }
          }, 0);
        }
      },
    ));

    // Castle piece hits wall/floor → fracture on hard landing
    space.listeners.add(new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      cbCastle,
      cbWall,
      (cb) => {
        const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
        const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
        if (!b1 || !b2) return;

        const castleBody = b1.userData._breakable ? b1 : b2;
        if (!castleBody.userData._breakable) return;

        const v = castleBody.velocity;
        const speed = Math.sqrt(v.x * v.x + v.y * v.y);

        if (speed > 200) {
          const cx = castleBody.position.x;
          const cy = castleBody.position.y;
          setTimeout(() => {
            if (castleBody.space) doFracture(castleBody, cx, cy, 10);
          }, 0);
        }
      },
    ));
  },

  click(x, y, space) {
    if (!activeBall || launched) {
      const dx = x - slingAnchor.x;
      const dy = y - slingAnchor.y;
      if (dx * dx + dy * dy < 60 * 60) {
        // Reload
        activeBall = spawnBall(space);
        activeBall.type = BodyType.KINEMATIC;
        launched = false;
        pulling = true;
        pullX = x;
        pullY = y;
        return;
      }
      // Click elsewhere: free throw
      const b = spawnBall(space);
      b.applyImpulse(new Vec2(600, -300));
      return;
    }

    // Start pull
    const dx = x - slingAnchor.x;
    const dy = y - slingAnchor.y;
    if (dx * dx + dy * dy < 100 * 100) {
      pulling = true;
      pullX = x;
      pullY = y;
    }
  },

  drag(x, y) {
    if (!pulling || !activeBall) return;
    const dx = x - slingAnchor.x;
    const dy = y - slingAnchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_PULL) {
      pullX = slingAnchor.x + (dx / dist) * MAX_PULL;
      pullY = slingAnchor.y + (dy / dist) * MAX_PULL;
    } else {
      pullX = x;
      pullY = y;
    }
    activeBall.position.x = pullX;
    activeBall.position.y = pullY;
  },

  release(space) {
    if (!pulling || !activeBall) return;
    pulling = false;

    const dx = slingAnchor.x - pullX;
    const dy = slingAnchor.y - pullY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      activeBall.position.x = slingAnchor.x;
      activeBall.position.y = slingAnchor.y;
      return;
    }

    // Launch
    activeBall.type = BodyType.DYNAMIC;
    activeBall.velocity = new Vec2(dx * LAUNCH_POWER, dy * LAUNCH_POWER);
    launched = true;

    // Auto-reload
    const currentBall = activeBall;
    setTimeout(() => {
      if (launched && activeBall === currentBall) {
        activeBall = spawnBall(space);
        activeBall.type = BodyType.KINEMATIC;
        launched = false;
      }
    }, 2000);
  },

  step(space, W, H) {
    for (const body of space.bodies) {
      if (body.userData._ball && body.position.y > H + 100) {
        body.space = null;
      }
    }
  },

  render3dOverlay(ctx) {
    drawSlingshot(ctx);
    drawTrajectory(ctx);

    if (launched) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("Click slingshot to reload", SLING_X - 55, slingAnchor.y + 95);
    }
  },

  hover(x, y) {
    // required so render3dOverlay is invoked each frame
  },
};
