import { Body, BodyType, Vec2, Circle, Material, DistanceJoint } from "../nape-js.esm.js";

export default {
  id: "newtons-cradle",
  label: "Newton's Cradle",
  featured: false,
  tags: ["PivotJoint", "Momentum"],
  desc: "Classic Newton's Cradle demonstrating conservation of momentum and energy.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const ballR = 16;
    const count = 7;
    const stringLen = 120;
    const startX = W / 2 - (count - 1) * ballR;
    const anchorY = 40;

    for (let i = 0; i < count; i++) {
      const bx = startX + i * ballR * 2;

      // Anchor (static)
      const anchor = new Body(BodyType.STATIC, new Vec2(bx, anchorY));
      anchor.shapes.add(new Circle(3));
      anchor.space = space;

      // Ball
      const ball = new Body(BodyType.DYNAMIC, new Vec2(bx, anchorY + stringLen));
      ball.shapes.add(new Circle(ballR, undefined, new Material(0, 1.0, 0, 5)));
      try { ball.userData._colorIdx = i % 6; } catch(_) {}
      ball.space = space;

      // String (distance joint)
      const dj = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), stringLen, stringLen);
      dj.space = space;
    }

    // Pull first ball to the side
    const firstBall = space.bodies[1]; // first dynamic body
    if (firstBall && !firstBall.isStatic()) {
      firstBall.position = new Vec2(startX - 80, anchorY + stringLen - 40);
    }
  },
};
