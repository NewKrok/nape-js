import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.42.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.42.0";

export default {
  id: "falling",
  label: "Falling Shapes",
  tags: ["Circle", "Polygon", "Gravity", "Click"],
  featured: true,
  featuredOrder: 0,
  desc: 'Random boxes and circles fall into a container. <b>Click</b> to spawn more shapes at the cursor.',
  walls: true,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    for (let i = 0; i < 80; i++) {
      spawnRandomShape(space, 100 + Math.random() * 700, 50 + Math.random() * 200);
    }
  },

  click(x, y, space, W, H) {
    for (let i = 0; i < 8; i++) {
      spawnRandomShape(space, x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40);
    }
  },
};
