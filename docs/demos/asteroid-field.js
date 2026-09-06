import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.42.0";

export default {
  id: "asteroid-field",
  label: "Asteroid Field (Spatial Hash)",
  tags: ["Broadphase", "Spatial Hash", "Performance", "Particles"],
  featured: true,
  featuredOrder: 20,
  desc:
    "2000 asteroids drifting through space using the <b>SPATIAL_HASH</b> broadphase. Objects are spread out so most broadphase lookups skip narrowphase entirely — showcasing O(1) spatial hashing at scale. Click to spawn more.",
  walls: true,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0); // zero-g — space!

    // Elastic, low-friction material so asteroids bounce and keep moving
    const mat = new Material(0.8, 0.6, 2, 0.01, 0.01);
    const N = 2000;

    for (let i = 0; i < N; i++) {
      const x = 25 + Math.random() * (W - 50);
      const y = 25 + Math.random() * (H - 50);
      const r = 2 + Math.random() * 4; // 2–6 px radius
      const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      b.shapes.add(new Circle(r));
      b.shapes.at(0).material = mat;
      // Random initial velocity — slow drift
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      b.velocity = Vec2.weak(Math.cos(angle) * speed, Math.sin(angle) * speed);
      b.space = space;
    }
  },

  click(x, y, space) {
    const mat = new Material(0.8, 0.6, 2, 0.01, 0.01);
    for (let i = 0; i < 50; i++) {
      const r = 2 + Math.random() * 4;
      const b = new Body(BodyType.DYNAMIC, new Vec2(
        x + (Math.random() - 0.5) * 60,
        y + (Math.random() - 0.5) * 60,
      ));
      b.shapes.add(new Circle(r));
      b.shapes.at(0).material = mat;
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      b.velocity = Vec2.weak(Math.cos(angle) * speed, Math.sin(angle) * speed);
      b.space = space;
    }
  },
};
