import { Body, BodyType, Vec2, Circle, Polygon, Material, PivotJoint } from "../nape-js.esm.js";

export default {
  id: "wrecking-ball",
  label: "Wrecking Ball",
  featured: false,
  tags: ["PivotJoint", "Material", "Impulse"],
  desc: "A heavy ball on a chain smashes into a tower of boxes. Click to reset the swing.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
    floor.shapes.add(new Polygon(Polygon.box(W, 20)));
    floor.space = space;

    // Tower of boxes
    const towerX = W * 0.65;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 3; col++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          towerX - 22 + col * 22,
          H - 30 - row * 18 - 9,
        ));
        b.shapes.add(new Polygon(Polygon.box(20, 16)));
        try { b.userData._colorIdx = row % 6; } catch(_) {}
        b.space = space;
      }
    }

    // Chain anchor
    const anchor = new Body(BodyType.STATIC, new Vec2(W * 0.3, 30));
    anchor.shapes.add(new Circle(6));
    anchor.space = space;

    // Chain links
    const links = 12;
    const linkLen = 16;
    let prev = anchor;
    for (let i = 0; i < links; i++) {
      const link = new Body(BodyType.DYNAMIC, new Vec2(
        W * 0.3, 30 + (i + 1) * linkLen,
      ));
      link.shapes.add(new Circle(4));
      try { link.userData._colorIdx = 4; } catch(_) {}
      link.space = space;

      const j = new PivotJoint(
        prev, link,
        i === 0 ? new Vec2(0, 0) : new Vec2(0, linkLen / 2),
        new Vec2(0, -linkLen / 2),
      );
      j.space = space;
      prev = link;
    }

    // Wrecking ball
    const ball = new Body(BodyType.DYNAMIC, new Vec2(W * 0.3, 30 + (links + 1) * linkLen));
    ball.shapes.add(new Circle(22, undefined, new Material(0.1, 0.2, 0.2, 10)));
    try { ball.userData._colorIdx = 3; } catch(_) {}
    ball.space = space;

    const ballJoint = new PivotJoint(prev, ball, new Vec2(0, linkLen / 2), new Vec2(0, -22));
    ballJoint.space = space;

    // Give initial swing
    ball.applyImpulse(new Vec2(2000, 0));
  },

  click(x, y, space, W, H) {
    // Apply impulse to dynamic bodies near click
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const force = 1500 * (1 - dist / 100);
        body.applyImpulse(new Vec2(dx / dist * force, dy / dist * force));
      }
    }
  },
};
