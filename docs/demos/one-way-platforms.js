import { Body, BodyType, Vec2, Polygon, CbType, InteractionType, PreListener, PreFlag } from "../nape-js.esm.js";
import { addWalls, spawnRandomShape } from "../demo-runner.js";

export default {
  id: "one-way-platforms",
  label: "One-Way Platforms",
  featured: false,
  tags: ["PreListener", "CbType", "Kinematic"],
  desc: "Bodies pass through platforms from below but rest on them from above using PreListener. Conveyors push shapes sideways.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    addWalls(space, W, H);

    const platformType = new CbType();
    const objectType = new CbType();

    const preListener = new PreListener(
      InteractionType.COLLISION,
      platformType,
      objectType,
      (cb) => {
        const arbiter = cb.get_arbiter();
        if (!arbiter) return PreFlag.ACCEPT;
        try {
          const colArb = arbiter.get_collisionArbiter();
          if (!colArb) return PreFlag.ACCEPT;
          const ny = colArb.get_normal().get_y();
          return ny < 0 ? PreFlag.ACCEPT : PreFlag.IGNORE;
        } catch (_) {
          return PreFlag.ACCEPT;
        }
      },
    );
    preListener.space = space;

    const platformPositions = [
      { x: W * 0.35, y: H * 0.7, w: W * 0.35 },
      { x: W * 0.65, y: H * 0.5, w: W * 0.3 },
      { x: W * 0.3, y: H * 0.35, w: W * 0.35 },
    ];

    for (const p of platformPositions) {
      const plat = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
      plat.shapes.add(new Polygon(Polygon.box(p.w, 10)));
      plat.shapes.at(0).cbTypes.add(platformType);
      plat.space = space;
    }

    const conveyor = new Body(BodyType.KINEMATIC, new Vec2(W / 2, H * 0.85));
    conveyor.shapes.add(new Polygon(Polygon.box(W * 0.5, 10)));
    conveyor.surfaceVel = new Vec2(80, 0);
    conveyor.space = space;

    for (let i = 0; i < 20; i++) {
      const b = spawnRandomShape(space,
        40 + Math.random() * (W - 80),
        -Math.random() * 200,
      );
      for (const s of b.shapes) {
        s.cbTypes.add(objectType);
      }
    }

    space._objectType = objectType;
  },

  click(x, y, space, W, H) {
    const b = spawnRandomShape(space, x, y);
    if (space._objectType) {
      for (const s of b.shapes) {
        s.cbTypes.add(space._objectType);
      }
    }
  },
};
