import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

export default {
  id: "pinball",
  label: "Pinball",
  featured: false,
  tags: ["Circle", "Restitution", "Bumpers"],
  desc: "A simple pinball table with bumpers and flippers. Click to launch balls.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 500);
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
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Circle(8, undefined, new Material(0.1, 0.8, 0.2, 2)));
    try { b.userData._colorIdx = Math.floor(Math.random() * 6); } catch(_) {}
    b.space = space;
  },
};
