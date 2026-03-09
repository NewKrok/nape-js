import { Body, BodyType, Vec2, Polygon } from "../nape-js.esm.js";
import { addWalls, spawnRandomShape } from "../demo-runner.js";

export default {
  id: "conveyor-belts",
  label: "Conveyor Belts",
  featured: false,
  tags: ["Kinematic", "surfaceVel"],
  desc: "Objects travel along conveyor belts using kinematic surface velocity.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 500);
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
  },

  click(x, y, space, W, H) {
    for (let i = 0; i < 5; i++) {
      spawnRandomShape(space, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
    }
  },
};
