import { Body, BodyType, Vec2, Circle, RadialGravityField } from "../nape-js.esm.js?v=3.41.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.41.0";

// Module-level field & planet refs (reset in setup)
let _planet = null;
let _field = null;

export default {
  id: "gravity",
  label: "Orbital Gravity",
  tags: ["Zero Gravity", "RadialGravityField", "Orbital", "Click"],
  featured: true,
  featuredOrder: 5,
  desc: 'Mario Galaxy-style gravity: bodies are pulled toward a central planet via <b>RadialGravityField</b>. <b>Click</b> to spawn orbiting bodies.',
  walls: false,
  moduleState: `let _planet = null;
let _field = null;`,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 0); // no global gravity

    // Central "planet" — anchor for the radial field
    _planet = new Body(BodyType.STATIC, new Vec2(W / 2, H / 2));
    _planet.shapes.add(new Circle(40));
    _planet.space = space;

    // One radial gravity field replaces the per-frame body.force loop.
    // The original demo used `force = G / d²` (no mass scaling), so we set
    // scaleByMass: false to keep the same arcade-orbital feel — otherwise
    // the field would multiply every body's force by its mass and orbits
    // would collapse into the planet.
    _field = new RadialGravityField({
      source: _planet,
      strength: 800000,
      minRadius: 40,
      scaleByMass: false,
    });

    // Orbiting bodies
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 180;
      const b = spawnRandomShape(
        space,
        W / 2 + Math.cos(angle) * dist,
        H / 2 + Math.sin(angle) * dist,
      );
      // Tangential velocity for orbit
      const speed = 80 + Math.random() * 60;
      b.velocity = new Vec2(-Math.sin(angle) * speed, Math.cos(angle) * speed);
    }
  },

  step(space, W, H) {
    // body.force is persistent across step()s — clear every dynamic body's
    // force first, otherwise apply() (which adds to existing force) would
    // accumulate unbounded across frames and collapse the orbits.
    for (const body of space.bodies) {
      if (body.isDynamic()) body.force = new Vec2(0, 0);
    }
    _field.apply(space);
  },

  click(x, y, space, W, H) {
    const b = spawnRandomShape(space, x, y);
    const cx = _planet.position.x;
    const cy = _planet.position.y;
    const dx = cx - x;
    const dy = cy - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 100;
    b.velocity = new Vec2(-dy / dist * speed, dx / dist * speed);
  },
};
