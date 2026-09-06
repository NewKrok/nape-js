import { Body, BodyType, Vec2, Circle, Polygon } from "../nape-js.esm.js?v=3.42.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.42.0";

export default {
  id: "explosion",
  label: "Impulse Blast",
  tags: ["Impulse", "Radial Force", "Click"],
  featured: true,
  featuredOrder: 3,
  desc: '<b>Click</b> anywhere to create an impulse blast that pushes nearby bodies away.',
  walls: true,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 500);
    for (let i = 0; i < 120; i++) {
      spawnRandomShape(space, 100 + Math.random() * 700, 100 + Math.random() * 350);
    }
  },

  click(x, y, space, W, H) {
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const distSq = dx * dx + dy * dy;
      const maxDist = 200;
      if (distSq < maxDist * maxDist && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const force = 2000 * (1 - dist / maxDist);
        body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
      }
    }
  },
};
