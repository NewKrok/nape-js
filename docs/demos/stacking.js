import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.42.0";


export default {
  id: "stacking",
  label: "Stacking",
  tags: ["Stacking", "Stability", "Click"],
  featured: false,
  desc: 'Towers of various shapes testing stacking stability. <b>Click</b> to drop a heavy box.',
  walls: true,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Tower 1: boxes
    for (let i = 0; i < 12; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(200, H - 30 - 25 * i - 12.5));
      b.shapes.add(new Polygon(Polygon.box(40, 25)));
      try { b.userData._colorIdx = 0; } catch(_) {}
      b.space = space;
    }

    // Tower 2: circles
    for (let i = 0; i < 10; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(400, H - 30 - 24 * i - 12));
      b.shapes.add(new Circle(12));
      try { b.userData._colorIdx = 1; } catch(_) {}
      b.space = space;
    }

    // Tower 3: mixed hexagons
    for (let i = 0; i < 10; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(
        600 + (Math.random() - 0.5) * 4,
        H - 30 - 28 * i - 14,
      ));
      b.shapes.add(new Polygon(Polygon.regular(18, 18, 6)));
      try { b.userData._colorIdx = 2; } catch(_) {}
      b.space = space;
    }

    // Tower 4: wide thin boxes
    for (let i = 0; i < 14; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(
        780 + (i % 2 === 0 ? 0 : 10),
        H - 30 - 16 * i - 8,
      ));
      b.shapes.add(new Polygon(Polygon.box(60, 14)));
      try { b.userData._colorIdx = 4; } catch(_) {}
      b.space = space;
    }
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Polygon(Polygon.box(50, 50), new Material(0.3, 0.3, 0.3, 5)));
    try { b.userData._colorIdx = 3; } catch(_) {}
    b.space = space;
  },
};
