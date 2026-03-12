import { Body, BodyType, Vec2, Circle, Polygon, Capsule, Material } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

function spawnCapsule(space, x, y, idx) {
  const w = 40 + Math.random() * 60;
  const h = 16 + Math.random() * 20;
  const body = new Body();
  body.shapes.add(new Capsule(w + h, h));
  body.position.setxy(x, y);
  body.rotation = Math.random() * Math.PI * 2;
  try { body.userData._colorIdx = idx; } catch (_) {}
  body.space = space;
  return body;
}

export default {
  id: "capsule",
  label: "Capsule Shapes",
  tags: ["Capsule", "Circle", "Polygon", "Gravity", "Click"],
  featured: false,
  desc: 'Native capsule-shaped bodies (two semicircular end-caps + rectangle middle) collide and stack. <b>Click</b> to spawn more capsules.',

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);
    const cols = 4;
    const rows = 4;
    const xStep = (W - 200) / cols;
    const yStep = 60;
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = 120 + col * xStep + (Math.random() - 0.5) * 20;
        const y = 80 + row * yStep;
        spawnCapsule(space, x, y, idx++);
      }
    }
  },

  click(x, y, space, W, H) {
    for (let i = 0; i < 5; i++) {
      spawnCapsule(space, x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 40, Date.now() + i);
    }
  },

  code2d: `// Create a Space with downward gravity
const space = new Space(new Vec2(0, 600));

addWalls();

// Spawn capsule-shaped bodies
for (let i = 0; i < 40; i++) {
  const w = 40 + Math.random() * 60;
  const h = 16 + Math.random() * 20;

  // Create a body with a native capsule shape
  const body = new Body();
  body.shapes.add(new Capsule(w + h, h));

  body.position.setxy(
    100 + Math.random() * 700,
    50 + Math.random() * 250,
  );
  body.rotation = Math.random() * Math.PI * 2;
  body.space = space;
}

function loop() {
  space.step(1 / 60, 8, 3);
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  for (const body of space.bodies) drawBody(body);
  requestAnimationFrame(loop);
}
loop();`,
};
