import { Body, BodyType, Vec2, Circle, Polygon, Material, DistanceJoint, MotorJoint } from "../nape-js.esm.js";

export default {
  id: "car-sideview",
  label: "2D Car — Side View",
  featured: false,
  tags: ["PivotJoint", "MotorJoint", "DistanceJoint"],
  desc: "A car with spring suspension and motor-driven wheels. Click to spawn obstacles.",

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);

    // Ground with bumps
    const ground = new Body(BodyType.STATIC, new Vec2(W / 2, H - 10));
    ground.shapes.add(new Polygon(Polygon.box(W + 400, 20)));
    ground.space = space;

    // Add ramp bumps
    for (let i = 0; i < 5; i++) {
      const bump = new Body(BodyType.STATIC, new Vec2(80 + i * 90, H - 25));
      bump.shapes.add(new Polygon(Polygon.regular(8 + Math.random() * 8, 6 + Math.random() * 6, 3 + Math.floor(Math.random() * 4))));
      bump.space = space;
    }

    const cx = W / 2 - 60, cy = H - 80;

    // Car body
    const carBody = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
    carBody.shapes.add(new Polygon(Polygon.box(80, 16)));
    try { carBody.userData._colorIdx = 0; } catch(_) {}
    carBody.space = space;

    // Front wheel
    const fWheel = new Body(BodyType.DYNAMIC, new Vec2(cx + 30, cy + 20));
    fWheel.shapes.add(new Circle(14, undefined, new Material(0.8, 0.5, 0.5, 2)));
    try { fWheel.userData._colorIdx = 3; } catch(_) {}
    fWheel.space = space;

    // Rear wheel
    const rWheel = new Body(BodyType.DYNAMIC, new Vec2(cx - 30, cy + 20));
    rWheel.shapes.add(new Circle(14, undefined, new Material(0.8, 0.5, 0.5, 2)));
    try { rWheel.userData._colorIdx = 3; } catch(_) {}
    rWheel.space = space;

    // Suspension (spring distance joints)
    const fSusp = new DistanceJoint(carBody, fWheel, new Vec2(30, 8), new Vec2(0, 0), 10, 25);
    fSusp.stiff = false;
    fSusp.frequency = 4;
    fSusp.damping = 0.4;
    fSusp.space = space;

    const rSusp = new DistanceJoint(carBody, rWheel, new Vec2(-30, 8), new Vec2(0, 0), 10, 25);
    rSusp.stiff = false;
    rSusp.frequency = 4;
    rSusp.damping = 0.4;
    rSusp.space = space;

    // Motor on rear wheel
    const rMotor = new MotorJoint(carBody, rWheel, -6);
    rMotor.space = space;
  },

  click(x, y, space, W, H) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    const sz = 10 + Math.random() * 20;
    b.shapes.add(new Polygon(Polygon.box(sz, sz)));
    try { b.userData._colorIdx = Math.floor(Math.random() * 6); } catch(_) {}
    b.space = space;
  },
};
