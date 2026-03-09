import { Body, BodyType, Vec2, Circle, Polygon, Material, PivotJoint, DistanceJoint } from "../nape-js.esm.js";

export default {
  id: "trebuchet",
  label: "Trebuchet",
  featured: false,
  tags: ["PivotJoint", "Impulse", "Mechanism"],
  desc: "A counterweight trebuchet that launches projectiles. Click to reload and fire.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
    floor.shapes.add(new Polygon(Polygon.box(W, 20)));
    floor.space = space;

    // Base
    const base = new Body(BodyType.STATIC, new Vec2(140, H - 60));
    base.shapes.add(new Polygon(Polygon.box(16, 80)));
    base.space = space;

    // Beam
    const beam = new Body(BodyType.DYNAMIC, new Vec2(140, H - 110));
    beam.shapes.add(new Polygon(Polygon.box(120, 6)));
    try { beam.userData._colorIdx = 0; } catch(_) {}
    beam.space = space;

    const beamPivot = new PivotJoint(base, beam, new Vec2(0, -50), new Vec2(-15, 0));
    beamPivot.space = space;

    // Counterweight (heavy)
    const cw = new Body(BodyType.DYNAMIC, new Vec2(80, H - 90));
    cw.shapes.add(new Circle(14, undefined, new Material(0.2, 0.2, 0.2, 12)));
    try { cw.userData._colorIdx = 4; } catch(_) {}
    cw.space = space;

    const cwJoint = new PivotJoint(beam, cw, new Vec2(-60, 0), new Vec2(0, 0));
    cwJoint.space = space;

    // Projectile
    const proj = new Body(BodyType.DYNAMIC, new Vec2(200, H - 115));
    proj.shapes.add(new Circle(8, undefined, new Material(0.3, 0.5, 0.3, 1)));
    try { proj.userData._colorIdx = 3; } catch(_) {}
    proj.space = space;

    const projJoint = new DistanceJoint(beam, proj, new Vec2(60, 0), new Vec2(0, 0), 0, 20);
    projJoint.stiff = false;
    projJoint.frequency = 10;
    projJoint.damping = 0.3;
    projJoint.space = space;

    // Target tower
    const towerX = W - 100;
    for (let i = 0; i < 6; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(towerX + (i % 2) * 15 - 7, H - 30 - i * 18 - 9));
      b.shapes.add(new Polygon(Polygon.box(18, 16)));
      try { b.userData._colorIdx = 1; } catch(_) {}
      b.space = space;
    }
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    b.shapes.add(new Circle(8, undefined, new Material(0.3, 0.5, 0.3, 1)));
    try { b.userData._colorIdx = 3; } catch(_) {}
    b.space = space;
    b.applyImpulse(new Vec2(-800, -400));
  },
};
