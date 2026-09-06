import { Body, BodyType, Vec2, Polygon } from "../nape-js.esm.js?v=3.42.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.42.0";

export default {
  id: "funnel",
  label: "Funnel",
  featured: false,
  tags: ["Polygon", "Static shapes"],
  desc: "Shapes pour through a funnel into a container. Click to add more shapes.",
  walls: false,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
    floor.shapes.add(new Polygon(Polygon.box(W, 20)));
    floor.space = space;

    // Funnel — two angled walls that meet the channel seamlessly.
    // Each wall is a trapezoid built from explicit vertices so there
    // are no gaps at the junction with the vertical channel.
    const gap = 25;   // half-width of the channel opening
    const t = 8;      // wall thickness
    const funnelTop = H * 0.3;
    const funnelBot = H * 0.55;
    const funnelSpread = 160; // how far out the top of the funnel reaches

    const lWall = new Body(BodyType.STATIC);
    lWall.shapes.add(new Polygon([
      new Vec2(W / 2 - gap, funnelBot),
      new Vec2(W / 2 - gap - t, funnelBot),
      new Vec2(W / 2 - funnelSpread - t, funnelTop),
      new Vec2(W / 2 - funnelSpread, funnelTop),
    ]));
    lWall.space = space;

    const rWall = new Body(BodyType.STATIC);
    rWall.shapes.add(new Polygon([
      new Vec2(W / 2 + gap + t, funnelBot),
      new Vec2(W / 2 + gap, funnelBot),
      new Vec2(W / 2 + funnelSpread, funnelTop),
      new Vec2(W / 2 + funnelSpread + t, funnelTop),
    ]));
    rWall.space = space;

    // Vertical channel below the funnel
    const channelH = 80;
    const lChannel = new Body(BodyType.STATIC, new Vec2(W / 2 - gap - t / 2, funnelBot + channelH / 2));
    lChannel.shapes.add(new Polygon(Polygon.box(t, channelH)));
    lChannel.space = space;

    const rChannel = new Body(BodyType.STATIC, new Vec2(W / 2 + gap + t / 2, funnelBot + channelH / 2));
    rChannel.shapes.add(new Polygon(Polygon.box(t, channelH)));
    rChannel.space = space;

    // Small shapes above funnel
    const shapeOpts = { minR: 3, maxR: 10, minW: 6, maxW: 18 };
    for (let i = 0; i < 40; i++) {
      spawnRandomShape(space,
        W / 2 + (Math.random() - 0.5) * 200,
        30 + Math.random() * 80,
        shapeOpts,
      );
    }
  },

  click(x, y, space, W, H) {
    const shapeOpts = { minR: 3, maxR: 10, minW: 6, maxW: 18 };
    for (let i = 0; i < 8; i++) {
      spawnRandomShape(space,
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        shapeOpts,
      );
    }
  },
};
