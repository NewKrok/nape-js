/**
 * nape-js Examples Page — grid of interactive physics demos
 */
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, DistanceJoint, AngleJoint, WeldJoint, MotorJoint, LineJoint,
  Material, InteractionFilter,
  CbType, InteractionType, PreListener, PreFlag,
} from "./nape-js.esm.js";

// =========================================================================
// Shared helpers
// =========================================================================

let _colorCounter = 0;

const COLORS = [
  { fill: "rgba(88,166,255,0.18)", stroke: "#58a6ff" },
  { fill: "rgba(210,153,34,0.18)", stroke: "#d29922" },
  { fill: "rgba(63,185,80,0.18)", stroke: "#3fb950" },
  { fill: "rgba(248,81,73,0.18)", stroke: "#f85149" },
  { fill: "rgba(163,113,247,0.18)", stroke: "#a371f7" },
  { fill: "rgba(219,171,255,0.18)", stroke: "#dbabff" },
];

function bodyColor(body) {
  if (body.isStatic()) return { fill: "rgba(120,160,200,0.15)", stroke: "#607888" };
  if (body.isSleeping) return { fill: "rgba(100,200,100,0.12)", stroke: "#3fb950" };
  const idx = (body.userData?._colorIdx ?? 0) % COLORS.length;
  return COLORS[idx];
}

function drawBody(ctx, body) {
  const px = body.position.x;
  const py = body.position.y;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(body.rotation);

  const { fill, stroke } = bodyColor(body);

  for (const shape of body.shapes) {
    if (shape.isCircle()) {
      const r = shape.castCircle.radius;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r, 0);
        ctx.strokeStyle = stroke + "55";
        ctx.stroke();
      }
    } else if (shape.isPolygon()) {
      const verts = shape.castPolygon.localVerts;
      const len = verts.get_length();
      if (len < 3) continue;
      ctx.beginPath();
      const v0 = verts.at(0);
      ctx.moveTo(v0.get_x(), v0.get_y());
      for (let i = 1; i < len; i++) {
        const v = verts.at(i);
        ctx.lineTo(v.get_x(), v.get_y());
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawConstraints(ctx, space) {
  try {
    const rawConstraints = space._inner.get_constraints();
    const cLen = rawConstraints.get_length();
    for (let i = 0; i < cLen; i++) {
      const c = rawConstraints.at(i);
      if (c.get_body1 && c.get_body2) {
        try {
          const b1 = c.get_body1();
          const b2 = c.get_body2();
          if (b1 && b2) {
            ctx.beginPath();
            ctx.moveTo(b1.get_position().get_x(), b1.get_position().get_y());
            ctx.lineTo(b2.get_position().get_x(), b2.get_position().get_y());
            ctx.strokeStyle = "#d2992233";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
}

function drawGrid(ctx, W, H) {
  ctx.strokeStyle = "#1a2030";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

// =========================================================================
// Example definitions
// =========================================================================

const CW = 480;  // card canvas width
const CH = 280;  // card canvas height

function addWalls(space, W, H) {
  const t = 20;
  const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - t / 2));
  floor.shapes.add(new Polygon(Polygon.box(W, t)));
  floor.space = space;
  const left = new Body(BodyType.STATIC, new Vec2(t / 2, H / 2));
  left.shapes.add(new Polygon(Polygon.box(t, H)));
  left.space = space;
  const right = new Body(BodyType.STATIC, new Vec2(W - t / 2, H / 2));
  right.shapes.add(new Polygon(Polygon.box(t, H)));
  right.space = space;
  const ceil = new Body(BodyType.STATIC, new Vec2(W / 2, t / 2));
  ceil.shapes.add(new Polygon(Polygon.box(W, t)));
  ceil.space = space;
}

function spawnRandomShape(space, x, y) {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  if (Math.random() < 0.5) {
    body.shapes.add(new Circle(5 + Math.random() * 10));
  } else {
    const w = 8 + Math.random() * 16;
    const h = 8 + Math.random() * 16;
    body.shapes.add(new Polygon(Polygon.box(w, h)));
  }
  try { body.userData._colorIdx = _colorCounter++; } catch(_) {}
  body.space = space;
  return body;
}

const EXAMPLES = [
  // ------ Strand Beast ------
  {
    label: "Strand Beast",
    desc: "A Theo Jansen-style walking mechanism built from pivot joints and a motor-driven crank.",
    tags: ["PivotJoint", "MotorJoint", "Mechanism"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 400));
      // Floor only
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
      floor.space = space;

      const cx = W / 2, cy = H - 100;

      // Chassis
      const chassis = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
      chassis.shapes.add(new Polygon(Polygon.box(80, 12)));
      try { chassis.userData._colorIdx = 0; } catch(_) {}
      chassis.space = space;

      // Crank (motor-driven wheel)
      const crank = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
      crank.shapes.add(new Circle(8));
      try { crank.userData._colorIdx = 3; } catch(_) {}
      crank.space = space;

      const crankPivot = new PivotJoint(chassis, crank, new Vec2(0, 0), new Vec2(0, 0));
      crankPivot.space = space;
      const motor = new MotorJoint(chassis, crank, 3.0);
      motor.space = space;

      // Helper: create one leg pair (left/right)
      function createLeg(side, crankOffset) {
        const dir = side === "left" ? -1 : 1;
        const crankR = 20;

        // Upper leg: connects crank to knee
        const upper = new Body(BodyType.DYNAMIC, new Vec2(cx + dir * 20, cy - 20));
        upper.shapes.add(new Polygon(Polygon.box(6, 40)));
        try { upper.userData._colorIdx = 1; } catch(_) {}
        upper.space = space;

        // Crank connection point (offset for phase)
        const crankAttach = new PivotJoint(
          crank, upper,
          new Vec2(Math.cos(crankOffset) * crankR, Math.sin(crankOffset) * crankR),
          new Vec2(0, -20),
        );
        crankAttach.space = space;

        // Lower leg
        const lower = new Body(BodyType.DYNAMIC, new Vec2(cx + dir * 20, cy + 20));
        lower.shapes.add(new Polygon(Polygon.box(6, 40)));
        try { lower.userData._colorIdx = 2; } catch(_) {}
        lower.space = space;

        // Knee
        const knee = new PivotJoint(upper, lower, new Vec2(0, 20), new Vec2(0, -20));
        knee.space = space;

        // Attach lower leg to chassis via line joint (restrict horizontal sliding)
        const guide = new DistanceJoint(chassis, lower, new Vec2(dir * 30, 0), new Vec2(0, 20), 30, 70);
        guide.stiff = false;
        guide.frequency = 6;
        guide.damping = 0.5;
        guide.space = space;
      }

      // 3 pairs of legs with phase offsets
      createLeg("left", 0);
      createLeg("right", Math.PI);
      createLeg("left", Math.PI * 2 / 3);
      createLeg("right", Math.PI + Math.PI * 2 / 3);
      createLeg("left", Math.PI * 4 / 3);
      createLeg("right", Math.PI + Math.PI * 4 / 3);

      return space;
    },
  },

  // ------ 2D Car (Side View) ------
  {
    label: "2D Car — Side View",
    desc: "A car with spring suspension and motor-driven wheels. Click to spawn obstacles.",
    tags: ["PivotJoint", "MotorJoint", "DistanceJoint"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      // Ground with bumps
      const ground = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      ground.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
      ground.space = space;

      // Add ramp bumps
      for (let i = 0; i < 5; i++) {
        const bump = new Body(BodyType.STATIC, new Vec2(80 + i * 90, H - 25));
        bump.shapes.add(new Polygon(Polygon.regular(8 + Math.random() * 8, 6 + Math.random() * 6, 3 + Math.floor(Math.random() * 4))));
        bump.space = space;
      }

      const cx = W / 2 - 60, cy = H - 80;

      // Car body
      const carBody = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
      carBody.shapes.add(new Polygon(Polygon.box(80, 16)));
      try { carBody.userData._colorIdx = 0; } catch(_) {}
      carBody.space = space;

      // Front wheel
      const fWheel = new Body(BodyType.DYNAMIC, new Vec2(cx + 30, cy + 20));
      fWheel.shapes.add(new Circle(14, undefined, new Material(0.8, 0.5, 0.5, 2)));
      try { fWheel.userData._colorIdx = 3; } catch(_) {}
      fWheel.space = space;

      // Rear wheel
      const rWheel = new Body(BodyType.DYNAMIC, new Vec2(cx - 30, cy + 20));
      rWheel.shapes.add(new Circle(14, undefined, new Material(0.8, 0.5, 0.5, 2)));
      try { rWheel.userData._colorIdx = 3; } catch(_) {}
      rWheel.space = space;

      // Suspension (spring distance joints)
      const fSusp = new DistanceJoint(carBody, fWheel, new Vec2(30, 8), new Vec2(0, 0), 10, 25);
      fSusp.stiff = false;
      fSusp.frequency = 4;
      fSusp.damping = 0.4;
      fSusp.space = space;

      const rSusp = new DistanceJoint(carBody, rWheel, new Vec2(-30, 8), new Vec2(0, 0), 10, 25);
      rSusp.stiff = false;
      rSusp.frequency = 4;
      rSusp.damping = 0.4;
      rSusp.space = space;

      // Motor on rear wheel
      const rMotor = new MotorJoint(carBody, rWheel, -6);
      rMotor.space = space;

      return space;
    },
    click(space, x, y, W, H) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      const sz = 10 + Math.random() * 20;
      b.shapes.add(new Polygon(Polygon.box(sz, sz)));
      try { b.userData._colorIdx = Math.floor(Math.random() * 6); } catch(_) {}
      b.space = space;
    },
  },

  // ------ 2D Car (Top-Down) ------
  {
    label: "2D Car — Top Down",
    desc: "Top-down car physics with friction-based steering. Bodies have no gravity.",
    tags: ["PivotJoint", "Zero Gravity", "Friction"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 0)); // no gravity
      addWalls(space, W, H);

      // Car chassis
      const car = new Body(BodyType.DYNAMIC, new Vec2(W / 2, H / 2));
      car.shapes.add(new Polygon(Polygon.box(20, 40), new Material(0.5, 1.0, 0.3, 2)));
      try { car.userData._colorIdx = 0; } catch(_) {}
      car.space = space;

      // Give initial velocity
      car.velocity = new Vec2(0, -60);

      // Obstacle cones
      for (let i = 0; i < 20; i++) {
        const cone = new Body(BodyType.DYNAMIC, new Vec2(
          40 + Math.random() * (W - 80),
          40 + Math.random() * (H - 80),
        ));
        cone.shapes.add(new Circle(6, undefined, new Material(0.3, 0.8, 0.3, 1)));
        try { cone.userData._colorIdx = 1; } catch(_) {}
        cone.space = space;
      }

      // The step function will apply lateral friction to simulate top-down
      space._topDownBodies = [car];

      return space;
    },
    step(space) {
      const bodies = space._topDownBodies;
      if (!bodies) return;
      for (const body of bodies) {
        // Kill lateral velocity (simulates tire grip)
        const rot = body.rotation;
        const forwardX = Math.sin(rot);
        const forwardY = -Math.cos(rot);
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const forwardSpeed = vx * forwardX + vy * forwardY;
        body.velocity = new Vec2(forwardX * forwardSpeed * 0.98, forwardY * forwardSpeed * 0.98);
        // Gentle angular damping
        body.angularVel *= 0.96;
        // Apply constant forward thrust
        body.applyImpulse(new Vec2(forwardX * 2, forwardY * 2));
        // Gentle turning
        body.angularVel += Math.sin(performance.now() / 800) * 0.02;
      }
    },
  },

  // ------ Platformer ------
  {
    label: "Platformer",
    desc: "A character bouncing between one-way platforms. Uses PreListener for pass-through logic.",
    tags: ["PreListener", "One-Way", "CbType"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      // Floor
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W, 20)));
      floor.space = space;

      // Walls
      const left = new Body(BodyType.STATIC, new Vec2(10, H / 2));
      left.shapes.add(new Polygon(Polygon.box(20, H)));
      left.space = space;
      const right = new Body(BodyType.STATIC, new Vec2(W - 10, H / 2));
      right.shapes.add(new Polygon(Polygon.box(20, H)));
      right.space = space;

      const platformType = new CbType();
      const playerType = new CbType();

      // One-way platform logic
      const pre = new PreListener(
        InteractionType.COLLISION,
        platformType, playerType,
        (cb) => {
          try {
            const colArb = cb.get_arbiter().get_collisionArbiter();
            if (!colArb) return PreFlag.ACCEPT;
            return colArb.get_normal().get_y() < 0 ? PreFlag.ACCEPT : PreFlag.IGNORE;
          } catch (_) { return PreFlag.ACCEPT; }
        },
      );
      pre.space = space;

      // Platforms
      const platPositions = [
        { x: 120, y: H - 70, w: 100 },
        { x: 280, y: H - 130, w: 80 },
        { x: 180, y: H - 190, w: 100 },
        { x: 360, y: H - 190, w: 80 },
        { x: 100, y: H - 250, w: 120 },
        { x: 350, y: H - 100, w: 90 },
      ];
      for (const p of platPositions) {
        const plat = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
        plat.shapes.add(new Polygon(Polygon.box(p.w, 8)));
        plat.shapes.at(0).cbTypes.add(platformType);
        plat.space = space;
      }

      // Player character (circle)
      const player = new Body(BodyType.DYNAMIC, new Vec2(W / 2, 50));
      player.shapes.add(new Circle(12, undefined, new Material(0.2, 0.6, 0.3, 2)));
      player.shapes.at(0).cbTypes.add(playerType);
      try { player.userData._colorIdx = 3; } catch(_) {}
      player.space = space;

      // Coins (small static circles for visual)
      for (let i = 0; i < 10; i++) {
        const coin = new Body(BodyType.DYNAMIC, new Vec2(
          60 + Math.random() * (W - 120),
          20 + Math.random() * (H - 100),
        ));
        coin.shapes.add(new Circle(4));
        coin.shapes.at(0).cbTypes.add(playerType);
        try { coin.userData._colorIdx = 1; } catch(_) {}
        coin.space = space;
      }

      return space;
    },
    click(space, x, y) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Circle(12, undefined, new Material(0.2, 0.8, 0.3, 2)));
      try { b.userData._colorIdx = 3; } catch(_) {}
      b.space = space;
    },
  },

  // ------ Bridge ------
  {
    label: "Rope Bridge",
    desc: "A bridge made of planks connected by PivotJoints. Click to drop heavy objects onto it.",
    tags: ["PivotJoint", "Chain"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 500));

      // Floor
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W, 20)));
      floor.space = space;

      // Bridge anchors
      const leftAnchor = new Body(BodyType.STATIC, new Vec2(40, H / 2));
      leftAnchor.shapes.add(new Polygon(Polygon.box(20, 30)));
      leftAnchor.space = space;

      const rightAnchor = new Body(BodyType.STATIC, new Vec2(W - 40, H / 2));
      rightAnchor.shapes.add(new Polygon(Polygon.box(20, 30)));
      rightAnchor.space = space;

      // Bridge planks
      const plankCount = 14;
      const plankW = (W - 120) / plankCount;
      const plankH = 6;
      let prev = leftAnchor;

      for (let i = 0; i < plankCount; i++) {
        const px = 60 + plankW / 2 + i * plankW;
        const plank = new Body(BodyType.DYNAMIC, new Vec2(px, H / 2));
        plank.shapes.add(new Polygon(Polygon.box(plankW - 2, plankH)));
        try { plank.userData._colorIdx = i % 2 === 0 ? 1 : 2; } catch(_) {}
        plank.space = space;

        const joint = new PivotJoint(
          prev, plank,
          prev === leftAnchor ? new Vec2(10, 0) : new Vec2(plankW / 2 - 1, 0),
          new Vec2(-plankW / 2 + 1, 0),
        );
        joint.space = space;
        prev = plank;
      }

      // Connect last plank to right anchor
      const lastJoint = new PivotJoint(
        prev, rightAnchor,
        new Vec2(plankW / 2 - 1, 0),
        new Vec2(-10, 0),
      );
      lastJoint.space = space;

      return space;
    },
    click(space, x, y) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Circle(15, undefined, new Material(0.3, 0.3, 0.3, 5)));
      try { b.userData._colorIdx = 3; } catch(_) {}
      b.space = space;
    },
  },

  // ------ Wrecking Ball ------
  {
    label: "Wrecking Ball",
    desc: "A heavy ball on a chain smashes into a tower of boxes. Click to reset the swing.",
    tags: ["PivotJoint", "Material", "Impulse"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      // Floor
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W, 20)));
      floor.space = space;

      // Tower of boxes
      const towerX = W * 0.65;
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 3; col++) {
          const b = new Body(BodyType.DYNAMIC, new Vec2(
            towerX - 22 + col * 22,
            H - 30 - row * 18 - 9,
          ));
          b.shapes.add(new Polygon(Polygon.box(20, 16)));
          try { b.userData._colorIdx = row % 6; } catch(_) {}
          b.space = space;
        }
      }

      // Chain anchor
      const anchor = new Body(BodyType.STATIC, new Vec2(W * 0.3, 30));
      anchor.shapes.add(new Circle(6));
      anchor.space = space;

      // Chain links
      const links = 12;
      const linkLen = 16;
      let prev = anchor;
      for (let i = 0; i < links; i++) {
        const link = new Body(BodyType.DYNAMIC, new Vec2(
          W * 0.3, 30 + (i + 1) * linkLen,
        ));
        link.shapes.add(new Circle(4));
        try { link.userData._colorIdx = 4; } catch(_) {}
        link.space = space;

        const j = new PivotJoint(
          prev, link,
          i === 0 ? new Vec2(0, 0) : new Vec2(0, linkLen / 2),
          new Vec2(0, -linkLen / 2),
        );
        j.space = space;
        prev = link;
      }

      // Wrecking ball
      const ball = new Body(BodyType.DYNAMIC, new Vec2(W * 0.3, 30 + (links + 1) * linkLen));
      ball.shapes.add(new Circle(22, undefined, new Material(0.1, 0.2, 0.2, 10)));
      try { ball.userData._colorIdx = 3; } catch(_) {}
      ball.space = space;

      const ballJoint = new PivotJoint(prev, ball, new Vec2(0, linkLen / 2), new Vec2(0, -22));
      ballJoint.space = space;

      // Give initial swing
      ball.applyImpulse(new Vec2(2000, 0));

      return space;
    },
    click(space, x, y) {
      // Apply impulse to dynamic bodies near click
      for (const body of space.bodies) {
        if (body.isStatic()) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          const force = 1500 * (1 - dist / 100);
          body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
        }
      }
    },
  },

  // ------ Newton's Cradle ------
  {
    label: "Newton's Cradle",
    desc: "Classic Newton's Cradle demonstrating conservation of momentum and energy.",
    tags: ["PivotJoint", "Momentum"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      const ballR = 16;
      const count = 7;
      const stringLen = 120;
      const startX = W / 2 - (count - 1) * ballR;
      const anchorY = 40;

      for (let i = 0; i < count; i++) {
        const bx = startX + i * ballR * 2;

        // Anchor (static)
        const anchor = new Body(BodyType.STATIC, new Vec2(bx, anchorY));
        anchor.shapes.add(new Circle(3));
        anchor.space = space;

        // Ball
        const ball = new Body(BodyType.DYNAMIC, new Vec2(bx, anchorY + stringLen));
        ball.shapes.add(new Circle(ballR, undefined, new Material(0, 1.0, 0, 5)));
        try { ball.userData._colorIdx = i % 6; } catch(_) {}
        ball.space = space;

        // String (distance joint)
        const dj = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), stringLen, stringLen);
        dj.space = space;
      }

      // Pull first ball to the side
      const firstBall = space.bodies[1]; // first dynamic body
      if (firstBall && !firstBall.isStatic()) {
        firstBall.position = new Vec2(startX - 80, anchorY + stringLen - 40);
      }

      return space;
    },
  },

  // ------ Dominos ------
  {
    label: "Dominos",
    desc: "A chain of thin dominos that topple one after another. Click to drop a ball.",
    tags: ["Stacking", "Chain Reaction"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      // Floor
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W, 20)));
      floor.space = space;

      // Dominos
      const count = 18;
      const spacing = 22;
      const startX = 50;
      const domW = 6, domH = 36;

      for (let i = 0; i < count; i++) {
        const d = new Body(BodyType.DYNAMIC, new Vec2(
          startX + i * spacing,
          H - 30 - domH / 2,
        ));
        d.shapes.add(new Polygon(Polygon.box(domW, domH)));
        try { d.userData._colorIdx = i % 6; } catch(_) {}
        d.space = space;
      }

      // Trigger ball
      const trigger = new Body(BodyType.DYNAMIC, new Vec2(startX - 20, H - 80));
      trigger.shapes.add(new Circle(10, undefined, new Material(0.3, 0.3, 0.3, 4)));
      try { trigger.userData._colorIdx = 3; } catch(_) {}
      trigger.space = space;
      trigger.applyImpulse(new Vec2(300, 0));

      return space;
    },
    click(space, x, y) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Circle(12, undefined, new Material(0.3, 0.3, 0.3, 4)));
      try { b.userData._colorIdx = 3; } catch(_) {}
      b.space = space;
    },
  },

  // ------ Conveyor Belt ------
  {
    label: "Conveyor Belts",
    desc: "Objects travel along conveyor belts using kinematic surface velocity.",
    tags: ["Kinematic", "surfaceVel"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 500));
      addWalls(space, W, H);

      // Conveyor 1: top, goes right
      const c1 = new Body(BodyType.KINEMATIC, new Vec2(W / 2 - 60, 80));
      c1.shapes.add(new Polygon(Polygon.box(200, 10)));
      c1.surfaceVel = new Vec2(80, 0);
      c1.space = space;

      // Conveyor 2: middle, goes left
      const c2 = new Body(BodyType.KINEMATIC, new Vec2(W / 2 + 60, 160));
      c2.shapes.add(new Polygon(Polygon.box(200, 10)));
      c2.surfaceVel = new Vec2(-80, 0);
      c2.space = space;

      // Conveyor 3: bottom, goes right
      const c3 = new Body(BodyType.KINEMATIC, new Vec2(W / 2 - 60, 240));
      c3.shapes.add(new Polygon(Polygon.box(200, 10)));
      c3.surfaceVel = new Vec2(80, 0);
      c3.space = space;

      // Spawn shapes at top
      for (let i = 0; i < 15; i++) {
        spawnRandomShape(space, 60 + Math.random() * 100, 30 + Math.random() * 30);
      }

      return space;
    },
    click(space, x, y) {
      for (let i = 0; i < 5; i++) {
        spawnRandomShape(space, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
      }
    },
  },

  // ------ Trebuchet ------
  {
    label: "Trebuchet",
    desc: "A counterweight trebuchet that launches projectiles. Click to reload and fire.",
    tags: ["PivotJoint", "Impulse", "Mechanism"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      // Floor
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W, 20)));
      floor.space = space;

      // Base
      const base = new Body(BodyType.STATIC, new Vec2(140, H - 60));
      base.shapes.add(new Polygon(Polygon.box(16, 80)));
      base.space = space;

      // Beam
      const beam = new Body(BodyType.DYNAMIC, new Vec2(140, H - 110));
      beam.shapes.add(new Polygon(Polygon.box(120, 6)));
      try { beam.userData._colorIdx = 0; } catch(_) {}
      beam.space = space;

      const beamPivot = new PivotJoint(base, beam, new Vec2(0, -50), new Vec2(-15, 0));
      beamPivot.space = space;

      // Counterweight (heavy)
      const cw = new Body(BodyType.DYNAMIC, new Vec2(80, H - 90));
      cw.shapes.add(new Circle(14, undefined, new Material(0.2, 0.2, 0.2, 12)));
      try { cw.userData._colorIdx = 4; } catch(_) {}
      cw.space = space;

      const cwJoint = new PivotJoint(beam, cw, new Vec2(-60, 0), new Vec2(0, 0));
      cwJoint.space = space;

      // Projectile
      const proj = new Body(BodyType.DYNAMIC, new Vec2(200, H - 115));
      proj.shapes.add(new Circle(8, undefined, new Material(0.3, 0.5, 0.3, 1)));
      try { proj.userData._colorIdx = 3; } catch(_) {}
      proj.space = space;

      const projJoint = new DistanceJoint(beam, proj, new Vec2(60, 0), new Vec2(0, 0), 0, 20);
      projJoint.stiff = false;
      projJoint.frequency = 10;
      projJoint.damping = 0.3;
      projJoint.space = space;

      // Target tower
      const towerX = W - 100;
      for (let i = 0; i < 6; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(towerX + (i % 2) * 15 - 7, H - 30 - i * 18 - 9));
        b.shapes.add(new Polygon(Polygon.box(18, 16)));
        try { b.userData._colorIdx = 1; } catch(_) {}
        b.space = space;
      }

      return space;
    },
    click(space, x, y) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Circle(8, undefined, new Material(0.3, 0.5, 0.3, 1)));
      try { b.userData._colorIdx = 3; } catch(_) {}
      b.space = space;
      b.applyImpulse(new Vec2(-800, -400));
    },
  },

  // ------ Seesaw ------
  {
    label: "Seesaw",
    desc: "A balanced seesaw that tilts when objects land on it. Click to drop heavy balls.",
    tags: ["PivotJoint", "Balance"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      // Floor
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W, 20)));
      floor.space = space;

      // Fulcrum
      const fulcrum = new Body(BodyType.STATIC, new Vec2(W / 2, H - 40));
      fulcrum.shapes.add(new Polygon(Polygon.regular(18, 18, 3)));
      fulcrum.space = space;

      // Plank
      const plank = new Body(BodyType.DYNAMIC, new Vec2(W / 2, H - 58));
      plank.shapes.add(new Polygon(Polygon.box(200, 8)));
      try { plank.userData._colorIdx = 0; } catch(_) {}
      plank.space = space;

      const pivot = new PivotJoint(fulcrum, plank, new Vec2(0, -18), new Vec2(0, 0));
      pivot.space = space;

      // Balls on one side
      for (let i = 0; i < 3; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(W / 2 + 60 + i * 22, H - 80 - i * 30));
        b.shapes.add(new Circle(10, undefined, new Material(0.3, 0.4, 0.3, 2)));
        try { b.userData._colorIdx = 1 + i; } catch(_) {}
        b.space = space;
      }

      return space;
    },
    click(space, x, y) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Circle(14, undefined, new Material(0.3, 0.3, 0.3, 5)));
      try { b.userData._colorIdx = 3; } catch(_) {}
      b.space = space;
    },
  },

  // ------ Pinball ------
  {
    label: "Pinball",
    desc: "A simple pinball table with bumpers and flippers. Click to launch balls.",
    tags: ["Circle", "Restitution", "Bumpers"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 500));
      addWalls(space, W, H);

      // Bumpers (static circles with high restitution)
      const bumperPositions = [
        { x: W * 0.3, y: H * 0.3 },
        { x: W * 0.6, y: H * 0.25 },
        { x: W * 0.45, y: H * 0.5 },
        { x: W * 0.25, y: H * 0.6 },
        { x: W * 0.7, y: H * 0.55 },
        { x: W * 0.5, y: H * 0.15 },
      ];

      for (const pos of bumperPositions) {
        const bumper = new Body(BodyType.STATIC, new Vec2(pos.x, pos.y));
        bumper.shapes.add(new Circle(16, undefined, new Material(0, 1.5, 0, 1)));
        bumper.space = space;
      }

      // Angled walls
      const lWall = new Body(BodyType.STATIC, new Vec2(80, H - 60));
      lWall.shapes.add(new Polygon(Polygon.box(100, 8)));
      lWall.rotation = 0.4;
      lWall.space = space;

      const rWall = new Body(BodyType.STATIC, new Vec2(W - 80, H - 60));
      rWall.shapes.add(new Polygon(Polygon.box(100, 8)));
      rWall.rotation = -0.4;
      rWall.space = space;

      // Initial balls
      for (let i = 0; i < 5; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          100 + Math.random() * (W - 200),
          30 + Math.random() * 60,
        ));
        b.shapes.add(new Circle(8, undefined, new Material(0.1, 0.8, 0.2, 2)));
        try { b.userData._colorIdx = i; } catch(_) {}
        b.space = space;
      }

      return space;
    },
    click(space, x, y) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Circle(8, undefined, new Material(0.1, 0.8, 0.2, 2)));
      try { b.userData._colorIdx = Math.floor(Math.random() * 6); } catch(_) {}
      b.space = space;
    },
  },

  // ------ Cloth ------
  {
    label: "Cloth Simulation",
    desc: "A grid of particles connected by springs, simulating cloth. Click to disturb it.",
    tags: ["DistanceJoint", "Springs", "Grid"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 300));

      const cols = 20, rows = 14, gap = 16;
      const startX = W / 2 - (cols * gap) / 2;
      const startY = 30;
      const bodies = [];

      for (let r = 0; r < rows; r++) {
        bodies[r] = [];
        for (let c = 0; c < cols; c++) {
          const isTop = r === 0 && (c % 4 === 0);
          const b = new Body(
            isTop ? BodyType.STATIC : BodyType.DYNAMIC,
            new Vec2(startX + c * gap, startY + r * gap),
          );
          b.shapes.add(new Circle(2));
          try { b.userData._colorIdx = isTop ? 3 : (r + c) % 6; } catch(_) {}
          b.space = space;
          bodies[r][c] = b;
        }
      }

      function connect(b1, b2, rest) {
        const dj = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), rest * 0.9, rest * 1.1);
        dj.stiff = false;
        dj.frequency = 20;
        dj.damping = 0.3;
        dj.space = space;
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (c < cols - 1) connect(bodies[r][c], bodies[r][c + 1], gap);
          if (r < rows - 1) connect(bodies[r][c], bodies[r + 1][c], gap);
        }
      }

      return space;
    },
    click(space, x, y) {
      for (const body of space.bodies) {
        if (body.isStatic()) continue;
        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
          const force = 300 * (1 - dist / 60);
          body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
        }
      }
    },
  },

  // ------ Funnel ------
  {
    label: "Funnel",
    desc: "Shapes pour through a funnel into a container. Click to add more shapes.",
    tags: ["Polygon", "Static shapes"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));

      // Floor
      const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
      floor.shapes.add(new Polygon(Polygon.box(W, 20)));
      floor.space = space;

      // Funnel walls (angled)
      const lFunnel = new Body(BodyType.STATIC, new Vec2(W / 2 - 80, H / 2 - 20));
      lFunnel.shapes.add(new Polygon(Polygon.box(120, 8)));
      lFunnel.rotation = -0.5;
      lFunnel.space = space;

      const rFunnel = new Body(BodyType.STATIC, new Vec2(W / 2 + 80, H / 2 - 20));
      rFunnel.shapes.add(new Polygon(Polygon.box(120, 8)));
      rFunnel.rotation = 0.5;
      rFunnel.space = space;

      // Narrow channel walls
      const lChannel = new Body(BodyType.STATIC, new Vec2(W / 2 - 20, H / 2 + 40));
      lChannel.shapes.add(new Polygon(Polygon.box(8, 60)));
      lChannel.space = space;

      const rChannel = new Body(BodyType.STATIC, new Vec2(W / 2 + 20, H / 2 + 40));
      rChannel.shapes.add(new Polygon(Polygon.box(8, 60)));
      rChannel.space = space;

      // Shapes above funnel
      for (let i = 0; i < 40; i++) {
        spawnRandomShape(space,
          W / 2 + (Math.random() - 0.5) * 200,
          30 + Math.random() * 80,
        );
      }

      return space;
    },
    click(space, x, y, W) {
      for (let i = 0; i < 8; i++) {
        spawnRandomShape(space,
          x + (Math.random() - 0.5) * 40,
          y + (Math.random() - 0.5) * 40,
        );
      }
    },
  },

  // ------ Soft Body ------
  {
    label: "Soft Body",
    desc: "Soft bodies created with DistanceJoint springs connecting a grid of particles.",
    tags: ["DistanceJoint", "Springs", "Soft Body"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 400));
      addWalls(space, W, H);

      function createSoftBody(startX, startY, cols, rows, gap, colorIdx) {
        const bodies = [];
        for (let r = 0; r < rows; r++) {
          bodies[r] = [];
          for (let c = 0; c < cols; c++) {
            const b = new Body(BodyType.DYNAMIC, new Vec2(startX + c * gap, startY + r * gap));
            b.shapes.add(new Circle(4));
            try { b.userData._colorIdx = colorIdx; } catch(_) {}
            b.space = space;
            bodies[r][c] = b;
          }
        }
        function springConnect(b1, b2, restLen) {
          const dj = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), restLen * 0.8, restLen * 1.2);
          dj.stiff = false;
          dj.frequency = 15;
          dj.damping = 0.4;
          dj.space = space;
        }
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (c < cols - 1) springConnect(bodies[r][c], bodies[r][c + 1], gap);
            if (r < rows - 1) springConnect(bodies[r][c], bodies[r + 1][c], gap);
            if (c < cols - 1 && r < rows - 1) springConnect(bodies[r][c], bodies[r + 1][c + 1], gap * Math.SQRT2);
            if (c > 0 && r < rows - 1) springConnect(bodies[r][c], bodies[r + 1][c - 1], gap * Math.SQRT2);
          }
        }
      }

      createSoftBody(W / 2 - 80, 60, 6, 6, 22, 0);
      createSoftBody(W / 2 + 40, 50, 5, 5, 26, 2);

      space._createSoftBody = createSoftBody;
      return space;
    },
    click(space, x, y) {
      const cols = 4 + Math.floor(Math.random() * 3);
      const rows = 4 + Math.floor(Math.random() * 3);
      if (space._createSoftBody) {
        space._createSoftBody(x, y, cols, rows, 20, Math.floor(Math.random() * 6));
      }
    },
  },

  // ------ One-Way Platforms ------
  {
    label: "One-Way Platforms",
    desc: "Bodies pass through platforms from below but rest on them from above using PreListener. Conveyors push shapes sideways.",
    tags: ["PreListener", "CbType", "Kinematic"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 600));
      addWalls(space, W, H);

      const platformType = new CbType();
      const objectType = new CbType();

      const preListener = new PreListener(
        InteractionType.COLLISION,
        platformType,
        objectType,
        (cb) => {
          const arbiter = cb.get_arbiter();
          if (!arbiter) return PreFlag.ACCEPT;
          try {
            const colArb = arbiter.get_collisionArbiter();
            if (!colArb) return PreFlag.ACCEPT;
            const ny = colArb.get_normal().get_y();
            return ny < 0 ? PreFlag.ACCEPT : PreFlag.IGNORE;
          } catch (_) {
            return PreFlag.ACCEPT;
          }
        },
      );
      preListener.space = space;

      const platformPositions = [
        { x: W * 0.35, y: H * 0.7, w: W * 0.35 },
        { x: W * 0.65, y: H * 0.5, w: W * 0.3 },
        { x: W * 0.3, y: H * 0.35, w: W * 0.35 },
      ];

      for (const p of platformPositions) {
        const plat = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
        plat.shapes.add(new Polygon(Polygon.box(p.w, 10)));
        plat.shapes.at(0).cbTypes.add(platformType);
        plat.space = space;
      }

      const conveyor = new Body(BodyType.KINEMATIC, new Vec2(W / 2, H * 0.85));
      conveyor.shapes.add(new Polygon(Polygon.box(W * 0.5, 10)));
      conveyor.surfaceVel = new Vec2(80, 0);
      conveyor.space = space;

      for (let i = 0; i < 20; i++) {
        const b = spawnRandomShape(space,
          40 + Math.random() * (W - 80),
          -Math.random() * 200,
        );
        for (const s of b.shapes) {
          s.cbTypes.add(objectType);
        }
      }

      space._objectType = objectType;
      return space;
    },
    click(space, x, y) {
      const b = spawnRandomShape(space, x, y);
      if (space._objectType) {
        for (const s of b.shapes) {
          s.cbTypes.add(space._objectType);
        }
      }
    },
  },

  // ------ Filtering ------
  {
    label: "Collision Filtering",
    desc: "Three groups of shapes that only collide within their own group using InteractionFilter bitmasks.",
    tags: ["InteractionFilter", "Groups"],
    setup(W, H) {
      const space = new Space(new Vec2(0, 500));
      addWalls(space, W, H);

      const groups = [
        { filter: new InteractionFilter(1, 1), colorIdx: 0, x: W * 0.25 },
        { filter: new InteractionFilter(2, 2), colorIdx: 1, x: W * 0.5 },
        { filter: new InteractionFilter(4, 4), colorIdx: 3, x: W * 0.75 },
      ];

      for (const g of groups) {
        for (let i = 0; i < 15; i++) {
          const b = new Body(BodyType.DYNAMIC, new Vec2(
            g.x + (Math.random() - 0.5) * (W * 0.2),
            30 + Math.random() * (H * 0.4),
          ));
          if (Math.random() < 0.5) {
            b.shapes.add(new Circle(6 + Math.random() * 8, undefined, undefined, g.filter));
          } else {
            const sz = 8 + Math.random() * 12;
            b.shapes.add(new Polygon(Polygon.box(sz, sz), undefined, g.filter));
          }
          try { b.userData._colorIdx = g.colorIdx; } catch(_) {}
          b.space = space;
        }
      }

      space._groups = groups;
      return space;
    },
    click(space, x, y, W) {
      const groups = space._groups;
      if (!groups) return;
      const gx = groups.map(g => g.x);
      let nearest = 0;
      let minDist = Math.abs(x - gx[0]);
      for (let i = 1; i < gx.length; i++) {
        const d = Math.abs(x - gx[i]);
        if (d < minDist) { minDist = d; nearest = i; }
      }
      const grp = groups[nearest];
      for (let i = 0; i < 5; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          x + (Math.random() - 0.5) * 30,
          y + (Math.random() - 0.5) * 30,
        ));
        b.shapes.add(new Circle(6 + Math.random() * 8, undefined, undefined, grp.filter));
        try { b.userData._colorIdx = grp.colorIdx; } catch(_) {}
        b.space = space;
      }
    },
  },
];

// =========================================================================
// Render mode state
// =========================================================================

let renderMode = "2d"; // "2d" or "3d"
let THREE = null; // loaded on demand

async function loadThree() {
  if (THREE) return THREE;
  THREE = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js");
  return THREE;
}

const MESH_COLORS = [0x58a6ff, 0xd29922, 0x3fb950, 0xf85149, 0xa371f7, 0xdbabff];

// =========================================================================
// Card rendering system
// =========================================================================

const grid = document.getElementById("examplesGrid");

// Each example gets its own canvas, space, and animation loop
const cards = EXAMPLES.map((example, idx) => {
  // Create card DOM
  const card = document.createElement("div");
  card.className = "example-card";

  // Container for the rendering area (canvas or WebGL)
  const renderContainer = document.createElement("div");
  renderContainer.className = "example-card-canvas";
  renderContainer.style.position = "relative";
  card.appendChild(renderContainer);

  const info = document.createElement("div");
  info.className = "example-card-info";
  info.innerHTML = `<h3>${example.label}</h3><p>${example.desc}</p>` +
    (example.tags || []).map(t => `<span class="example-tag">${t}</span>`).join("");
  card.appendChild(info);

  grid.appendChild(card);

  let space = null;
  let animId = null;
  let visible = false;
  let currentMode = "2d";

  // 2D state
  let canvas2d = null;
  let ctx = null;

  // 3D state
  let renderer3d = null;
  let scene = null;
  let camera = null;
  let meshes = [];

  function setup2d() {
    renderContainer.innerHTML = "";
    canvas2d = document.createElement("canvas");
    canvas2d.width = CW;
    canvas2d.height = CH;
    canvas2d.style.width = "100%";
    canvas2d.style.height = "100%";
    canvas2d.style.display = "block";
    renderContainer.appendChild(canvas2d);
    ctx = canvas2d.getContext("2d");
    attachClickHandler(canvas2d);
  }

  function setup3d() {
    renderContainer.innerHTML = "";
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    camera = new THREE.PerspectiveCamera(45, CW / CH, 1, 2000);
    camera.position.set(CW / 2, -CH / 2, Math.max(CW, CH) * 1.4);
    camera.lookAt(CW / 2, -CH / 2, 0);
    renderer3d = new THREE.WebGLRenderer({ antialias: true });
    renderer3d.setSize(CW, CH);
    renderer3d.domElement.style.width = "100%";
    renderer3d.domElement.style.height = "100%";
    renderer3d.domElement.style.display = "block";
    renderContainer.appendChild(renderer3d.domElement);
    scene.add(new THREE.AmbientLight(0x404050));
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(CW / 2, -CH / 2, 500);
    scene.add(dl);
    meshes = [];
    attachClickHandler(renderer3d.domElement);
  }

  function buildMeshes() {
    if (!space || !scene) return;
    // Remove old meshes
    for (const { mesh } of meshes) scene.remove(mesh);
    meshes = [];
    for (const body of space.bodies) {
      for (const shape of body.shapes) {
        let geom;
        if (shape.isCircle()) {
          geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
        } else if (shape.isPolygon()) {
          const verts = shape.castPolygon.localVerts;
          const len = verts.get_length();
          if (len < 3) continue;
          const pts = [];
          for (let i = 0; i < len; i++) pts.push(new THREE.Vector2(verts.at(i).get_x(), verts.at(i).get_y()));
          const s = new THREE.Shape(pts);
          geom = new THREE.ExtrudeGeometry(s, { depth: 16, bevelEnabled: false });
          geom.translate(0, 0, -8);
        }
        if (!geom) continue;
        const cIdx = (body.userData?._colorIdx ?? idx) % MESH_COLORS.length;
        const color = body.isStatic() ? 0x607888 : MESH_COLORS[cIdx];
        const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.85 }));
        scene.add(mesh);
        meshes.push({ mesh, body });
      }
    }
  }

  function init() {
    space = example.setup(CW, CH);
  }

  function render() {
    if (!visible || !space) return;

    if (example.step) example.step(space);
    space.step(1 / 60, 8, 3);

    if (currentMode === "2d" && ctx) {
      ctx.clearRect(0, 0, CW, CH);
      drawGrid(ctx, CW, CH);
      drawConstraints(ctx, space);
      for (const body of space.bodies) drawBody(ctx, body);
    } else if (currentMode === "3d" && renderer3d && scene && camera) {
      // Sync new bodies that don't have meshes yet
      const trackedBodies = new Set(meshes.map(m => m.body));
      for (const body of space.bodies) {
        if (!trackedBodies.has(body)) {
          for (const shape of body.shapes) {
            let geom;
            if (shape.isCircle()) {
              geom = new THREE.SphereGeometry(shape.castCircle.radius, 16, 16);
            } else if (shape.isPolygon()) {
              const verts = shape.castPolygon.localVerts;
              const len = verts.get_length();
              if (len < 3) continue;
              const pts = [];
              for (let i = 0; i < len; i++) pts.push(new THREE.Vector2(verts.at(i).get_x(), verts.at(i).get_y()));
              geom = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 16, bevelEnabled: false });
              geom.translate(0, 0, -8);
            }
            if (!geom) continue;
            const cIdx = (body.userData?._colorIdx ?? 0) % MESH_COLORS.length;
            const color = body.isStatic() ? 0x607888 : MESH_COLORS[cIdx];
            const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.85 }));
            scene.add(mesh);
            meshes.push({ mesh, body });
          }
        }
      }
      for (const { mesh, body } of meshes) {
        mesh.position.set(body.position.x, -body.position.y, 0);
        mesh.rotation.z = -body.rotation;
      }
      renderer3d.render(scene, camera);
    }

    animId = requestAnimationFrame(render);
  }

  function start() {
    if (animId) return;
    visible = true;
    if (!space) init();
    if (currentMode !== renderMode) switchMode(renderMode);
    render();
  }

  function stop() {
    visible = false;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function switchMode(mode) {
    stop();
    currentMode = mode;
    if (mode === "3d" && THREE) {
      setup3d();
      if (!space) init();
      buildMeshes();
    } else {
      setup2d();
      if (!space) init();
    }
    if (visible) {
      visible = true;
      render();
    }
  }

  function attachClickHandler(el) {
    el.addEventListener("mousedown", (e) => {
      if (!space) return;
      const rect = el.getBoundingClientRect();
      const sx = CW / rect.width;
      const sy = CH / rect.height;
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top) * sy;
      if (example.click) example.click(space, mx, my, CW, CH);
    });
    el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (!space) return;
      const touch = e.touches[0];
      const rect = el.getBoundingClientRect();
      const sx = CW / rect.width;
      const sy = CH / rect.height;
      const mx = (touch.clientX - rect.left) * sx;
      const my = (touch.clientY - rect.top) * sy;
      if (example.click) example.click(space, mx, my, CW, CH);
    }, { passive: false });
  }

  // Initial setup in 2D mode
  setup2d();

  return { card, start, stop, init, switchMode };
});

// =========================================================================
// Render mode toggle
// =========================================================================

document.getElementById("renderModeToggle").addEventListener("click", async (e) => {
  const btn = e.target.closest(".render-mode-btn");
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (mode === renderMode) return;

  if (mode === "3d") await loadThree();

  renderMode = mode;
  document.querySelectorAll(".render-mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });

  for (const c of cards) {
    c.switchMode(mode);
  }
});

// =========================================================================
// Intersection Observer — only animate visible cards
// =========================================================================

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const idx = cards.findIndex(c => c.card === entry.target);
    if (idx === -1) continue;
    if (entry.isIntersecting) {
      cards[idx].start();
    } else {
      cards[idx].stop();
    }
  }
}, { threshold: 0.1 });

for (const c of cards) {
  observer.observe(c.card);
}
