import { Body, BodyType, Vec2, Circle, Polygon, InteractionFilter } from "../nape-js.esm.js";
import { addWalls } from "../demo-runner.js";

export default {
  id: "collision-filtering",
  label: "Collision Filtering",
  featured: false,
  tags: ["InteractionFilter", "Groups"],
  desc: "Three groups of shapes that only collide within their own group using InteractionFilter bitmasks.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 500);
    addWalls(space, W, H);

    const groups = [
      { filter: new InteractionFilter(1, 1), colorIdx: 0, x: W * 0.25 },
      { filter: new InteractionFilter(2, 2), colorIdx: 1, x: W * 0.5 },
      { filter: new InteractionFilter(4, 4), colorIdx: 3, x: W * 0.75 },
    ];

    for (const g of groups) {
      for (let i = 0; i < 15; i++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          g.x + (Math.random() - 0.5) * (W * 0.2),
          30 + Math.random() * (H * 0.4),
        ));
        if (Math.random() < 0.5) {
          b.shapes.add(new Circle(6 + Math.random() * 8, undefined, undefined, g.filter));
        } else {
          const sz = 8 + Math.random() * 12;
          b.shapes.add(new Polygon(Polygon.box(sz, sz), undefined, g.filter));
        }
        try { b.userData._colorIdx = g.colorIdx; } catch(_) {}
        b.space = space;
      }
    }

    space._groups = groups;
  },

  click(x, y, space, W, H) {
    const groups = space._groups;
    if (!groups) return;
    const gx = groups.map(g => g.x);
    let nearest = 0;
    let minDist = Math.abs(x - gx[0]);
    for (let i = 1; i < gx.length; i++) {
      const d = Math.abs(x - gx[i]);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    const grp = groups[nearest];
    for (let i = 0; i < 5; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(
        x + (Math.random() - 0.5) * 30,
        y + (Math.random() - 0.5) * 30,
      ));
      b.shapes.add(new Circle(6 + Math.random() * 8, undefined, undefined, grp.filter));
      try { b.userData._colorIdx = grp.colorIdx; } catch(_) {}
      b.space = space;
    }
  },
};
