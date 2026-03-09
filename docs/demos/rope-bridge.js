import { Body, BodyType, Vec2, Circle, Polygon, Material, PivotJoint } from "../nape-js.esm.js";

export default {
  id: "rope-bridge",
  label: "Rope Bridge",
  featured: false,
  tags: ["PivotJoint", "Chain"],
  desc: "A bridge made of planks connected by PivotJoints. Click to drop heavy objects onto it.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 500);

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
    floor.shapes.add(new Polygon(Polygon.box(W, 20)));
    floor.space = space;

    // Bridge anchors
    const leftAnchor = new Body(BodyType.STATIC, new Vec2(40, H / 2));
    leftAnchor.shapes.add(new Polygon(Polygon.box(20, 30)));
    leftAnchor.space = space;

    const rightAnchor = new Body(BodyType.STATIC, new Vec2(W - 40, H / 2));
    rightAnchor.shapes.add(new Polygon(Polygon.box(20, 30)));
    rightAnchor.space = space;

    // Bridge planks
    const plankCount = 14;
    const plankW = (W - 120) / plankCount;
    const plankH = 6;
    let prev = leftAnchor;

    for (let i = 0; i < plankCount; i++) {
      const px = 60 + plankW / 2 + i * plankW;
      const plank = new Body(BodyType.DYNAMIC, new Vec2(px, H / 2));
      plank.shapes.add(new Polygon(Polygon.box(plankW - 2, plankH)));
      try { plank.userData._colorIdx = i % 2 === 0 ? 1 : 2; } catch(_) {}
      plank.space = space;

      const joint = new PivotJoint(
        prev, plank,
        prev === leftAnchor ? new Vec2(10, 0) : new Vec2(plankW / 2 - 1, 0),
        new Vec2(-plankW / 2 + 1, 0),
      );
      joint.space = space;
      prev = plank;
    }

    // Connect last plank to right anchor
    const lastJoint = new PivotJoint(
      prev, rightAnchor,
      new Vec2(plankW / 2 - 1, 0),
      new Vec2(-10, 0),
    );
    lastJoint.space = space;
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Circle(15, undefined, new Material(0.3, 0.3, 0.3, 5)));
    try { b.userData._colorIdx = 3; } catch(_) {}
    b.space = space;
  },
};
