import { Body, BodyType, Vec2, Circle, Polygon, Material, PivotJoint } from "../nape-js.esm.js";

export default {
  id: "seesaw",
  label: "Seesaw",
  featured: false,
  tags: ["PivotJoint", "Balance"],
  desc: "A balanced seesaw that tilts when objects land on it. Click to drop heavy balls.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

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
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Circle(14, undefined, new Material(0.3, 0.3, 0.3, 5)));
    try { b.userData._colorIdx = 3; } catch(_) {}
    b.space = space;
  },
};
