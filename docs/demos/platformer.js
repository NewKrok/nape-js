import { Body, BodyType, Vec2, Circle, Polygon, Material, CbType, InteractionType, PreListener, PreFlag } from "../nape-js.esm.js";

export default {
  id: "platformer",
  label: "Platformer",
  featured: false,
  tags: ["PreListener", "One-Way", "CbType"],
  desc: "A character bouncing between one-way platforms. Uses PreListener for pass-through logic.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
    floor.shapes.add(new Polygon(Polygon.box(W, 20)));
    floor.space = space;

    // Walls
    const left = new Body(BodyType.STATIC, new Vec2(10, H / 2));
    left.shapes.add(new Polygon(Polygon.box(20, H)));
    left.space = space;
    const right = new Body(BodyType.STATIC, new Vec2(W - 10, H / 2));
    right.shapes.add(new Polygon(Polygon.box(20, H)));
    right.space = space;

    const platformType = new CbType();
    const playerType = new CbType();

    // One-way platform logic
    const pre = new PreListener(
      InteractionType.COLLISION,
      platformType, playerType,
      (cb) => {
        try {
          const colArb = cb.get_arbiter().get_collisionArbiter();
          if (!colArb) return PreFlag.ACCEPT;
          return colArb.get_normal().get_y() < 0 ? PreFlag.ACCEPT : PreFlag.IGNORE;
        } catch (_) { return PreFlag.ACCEPT; }
      },
    );
    pre.space = space;

    // Platforms
    const platPositions = [
      { x: 120, y: H - 70, w: 100 },
      { x: 280, y: H - 130, w: 80 },
      { x: 180, y: H - 190, w: 100 },
      { x: 360, y: H - 190, w: 80 },
      { x: 100, y: H - 250, w: 120 },
      { x: 350, y: H - 100, w: 90 },
    ];
    for (const p of platPositions) {
      const plat = new Body(BodyType.STATIC, new Vec2(p.x, p.y));
      plat.shapes.add(new Polygon(Polygon.box(p.w, 8)));
      plat.shapes.at(0).cbTypes.add(platformType);
      plat.space = space;
    }

    // Player character (circle)
    const player = new Body(BodyType.DYNAMIC, new Vec2(W / 2, 50));
    player.shapes.add(new Circle(12, undefined, new Material(0.2, 0.6, 0.3, 2)));
    player.shapes.at(0).cbTypes.add(playerType);
    try { player.userData._colorIdx = 3; } catch(_) {}
    player.space = space;

    // Coins (small static circles for visual)
    for (let i = 0; i < 10; i++) {
      const coin = new Body(BodyType.DYNAMIC, new Vec2(
        60 + Math.random() * (W - 120),
        20 + Math.random() * (H - 100),
      ));
      coin.shapes.add(new Circle(4));
      coin.shapes.at(0).cbTypes.add(playerType);
      try { coin.userData._colorIdx = 1; } catch(_) {}
      coin.space = space;
    }
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Circle(12, undefined, new Material(0.2, 0.8, 0.3, 2)));
    try { b.userData._colorIdx = 3; } catch(_) {}
    b.space = space;
  },
};
