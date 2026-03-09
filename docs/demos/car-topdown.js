import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

// Module-level state for top-down bodies (reset in setup)
let _topDownBodies = [];

export default {
  id: "car-topdown",
  label: "2D Car — Top Down",
  featured: false,
  tags: ["PivotJoint", "Zero Gravity", "Friction"],
  desc: "Top-down car physics with friction-based steering. Bodies have no gravity.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0); // no gravity
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

    // Store for step function
    _topDownBodies = [car];
  },

  step(space, W, H) {
    for (const body of _topDownBodies) {
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
};
