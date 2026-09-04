import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.41.0";

export default {
  id: "plinko",
  label: "Plinko",
  featured: false,
  tags: ["Bouncy", "Static shapes", "Particles"],
  desc: "1000 balls cascade through a dense staggered peg field, settle into slots, and recycle back to the top.",
  walls: true,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const ballMat = new Material(0.45, 0.2, 0.3, 2);
    const pegMat  = new Material(0.5, 0.3, 0.4, 1);

    const pegR       = 5;
    const rows       = 11;
    const colSpacing = 60;
    const rowSpacing = 32;
    const pegTop     = 80;
    const sideMargin = 55;

    for (let r = 0; r < rows; r++) {
      const y       = pegTop + r * rowSpacing;
      const stagger = (r % 2) * (colSpacing / 2);
      for (let x = sideMargin + stagger; x <= W - sideMargin; x += colSpacing) {
        const jx = x + (Math.random() - 0.5) * 6;
        const jy = y + (Math.random() - 0.5) * 4;
        const peg = new Body(BodyType.STATIC, new Vec2(jx, jy));
        peg.shapes.add(new Circle(pegR, undefined, pegMat));
        peg.space = space;
      }
    }

    const slotH    = 70;
    const slotTop  = H - 30 - slotH;
    const slots    = 9;
    const slotSpan = W - 40;
    for (let i = 1; i < slots; i++) {
      const x = 20 + (i / slots) * slotSpan;
      const div = new Body(BodyType.STATIC, new Vec2(x, slotTop + slotH / 2));
      div.shapes.add(new Polygon(Polygon.box(4, slotH)));
      div.space = space;
    }

    const ballR = 3.5;
    const ballCount = 1000;
    for (let i = 0; i < ballCount; i++) {
      const ball = new Body(BodyType.DYNAMIC, new Vec2(
        sideMargin + Math.random() * (W - sideMargin * 2),
        30 + Math.random() * 35,
      ));
      ball.shapes.add(new Circle(ballR, undefined, ballMat));
      try { ball.userData._colorIdx = i % 6; } catch(_) {}
      ball.space = space;
    }
  },

  step(space, W, H) {
    const sideMargin = 55;
    const pegFieldBottom = 80 + 10 * 32;
    const settleY = pegFieldBottom + 16;
    const restFrames = 60;
    const respawn = (body) => {
      body.position.setxy(
        sideMargin + Math.random() * (W - sideMargin * 2),
        30 + Math.random() * 35,
      );
      body.velocity.setxy((Math.random() - 0.5) * 80, 0);
      body.angularVel = (Math.random() - 0.5) * 4;
      try { body.userData._restCount = 0; } catch(_) {}
    };

    for (const body of space.bodies) {
      if (!body.isDynamic()) continue;

      if (body.position.x < 0 || body.position.x > W || body.position.y > H) {
        respawn(body);
        continue;
      }

      const ud = body.userData;
      const inSettleZone = body.position.y > settleY;
      const slow = Math.abs(body.velocity.x) < 12 && Math.abs(body.velocity.y) < 12;

      if (inSettleZone && slow) {
        ud._restCount = (ud._restCount || 0) + 1;
        if (ud._restCount >= restFrames) respawn(body);
      } else {
        if (ud._restCount) ud._restCount = 0;
        if (Math.random() < 0.08) {
          body.velocity.x += (Math.random() - 0.5) * 25;
        }
      }
    }
  },
};
