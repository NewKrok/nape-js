import { Body, BodyType, Vec2, Circle, Polygon, Material } from "../nape-js.esm.js?v=3.41.0";

export default {
  id: "pyramid",
  label: "Pyramid Stress Test",
  tags: ["Stacking", "Stress Test", "Click"],
  featured: true,
  featuredOrder: 1,
  desc: 'A classic box-stacking pyramid. <b>Click</b> to drop a heavy ball onto it.',
  walls: true,
  workerCompatible: true,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    const boxSize = 28;
    const rows = 14;
    const startX = W / 2;
    const startY = H - 30 - boxSize / 2;

    for (let row = 0; row < rows; row++) {
      const cols = rows - row;
      const offsetX = startX - (cols * boxSize) / 2 + boxSize / 2;
      for (let col = 0; col < cols; col++) {
        const b = new Body(BodyType.DYNAMIC, new Vec2(
          offsetX + col * boxSize,
          startY - row * boxSize,
        ));
        b.shapes.add(new Polygon(Polygon.box(boxSize - 2, boxSize - 2)));
        try { b.userData._colorIdx = row; } catch(_) {}
        b.space = space;
      }
    }
  },

  click(x, y, space, W, H) {
    const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    ball.shapes.add(new Circle(25, undefined, new Material(0.3, 0.2, 0.3, 5)));
    try { ball.userData._colorIdx = 3; } catch(_) {}
    ball.space = space;
  },
};
