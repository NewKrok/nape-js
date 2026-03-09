import { Body, BodyType, Vec2, Circle, DistanceJoint } from "../nape-js.esm.js";

export default {
  id: "cloth",
  label: "Cloth Simulation",
  featured: false,
  tags: ["DistanceJoint", "Springs", "Grid"],
  desc: "A grid of particles connected by springs, simulating cloth. Click to disturb it.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 300);

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
  },

  click(x, y, space, W, H) {
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
};
