import { Body, BodyType, Vec2, Circle, Polygon, PivotJoint, DistanceJoint, MotorJoint, InteractionFilter, Material } from "../nape-js.esm.js?v=3.41.0";


export default {
  id: "strandbeast",
  label: "Strand Beast",
  tags: ["PivotJoint", "MotorJoint", "DistanceJoint", "Mechanism"],
  featured: true,
  featuredOrder: 8,
  desc: 'A Theo Jansen-style walking mechanism with 6 legs (3 phase-offset pairs) driven by a <code>MotorJoint</code> crank. Reverses direction at the walls. <b>Click</b> to drop a ball.',
  walls: true,

  _motor: null,
  _chassis: null,
  _motorSpeed: 2.0,
  _W: 0,
  _t: 20,

  setup(space, W, H) {
    this._W = W;
    this._motorSpeed = 2.0;
    space.gravity = new Vec2(0, 400);

    const t = 20;

    // Theo Jansen mechanism geometry (from Box2D testbed)
    const S = Math.min(W, H) * 0.05 * 0.6; // pixel scale (60% of original)
    const PIVOT_Y = 0.8;
    const WHEEL_R = 1.6;
    const CHASSIS_HW = 2.5, CHASSIS_HH = 1.0;
    const CRANK_R = PIVOT_Y * S; // crank pin radius from wheel center

    // Leg geometry points (Box2D Y-up coords negated for screen Y-down)
    const P1X = 5.4, P1Y = 6.1;
    const P2X = 7.2, P2Y = 1.2;
    const P3X = 4.3, P3Y = 1.9;
    const P4X = 3.1, P4Y = -0.8;
    const P5X = 6.0, P5Y = -1.5;
    const P6X = 2.5, P6Y = -3.7;

    // Start ~15% from left edge
    const ox = W * 0.15;
    const oy = (H - t) - P1Y * S;

    // Random obstacles scattered on the floor (40% smaller than before)
    const obstacleCount = 5;
    const obstacleMinX = ox + CHASSIS_HW * 4 * S;
    const obstacleMaxX = W - t - 40;
    for (let i = 0; i < obstacleCount; i++) {
      const rx = obstacleMinX + (obstacleMaxX - obstacleMinX) * (i + 0.5 + (Math.random() - 0.5) * 0.7) / obstacleCount;
      const rh = (15 + Math.random() * 30) * 0.6;
      const rw = (10 + Math.random() * 20) * 0.6;
      const obs = new Body(BodyType.DYNAMIC, new Vec2(rx, H - t - rh / 2));
      obs.shapes.add(new Polygon(Polygon.box(rw, rh)));
      obs.space = space;
    }

    // Filter: mechanism parts don't collide with each other (group 2, only collide with group 1)
    const mf = new InteractionFilter(2, 1);

    // Chassis
    const chassis = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
    chassis.shapes.add(new Polygon(Polygon.box(CHASSIS_HW * 2 * S, CHASSIS_HH * 2 * S), undefined, mf));
    try { chassis.userData._colorIdx = 0; } catch(_) {}
    chassis.space = space;

    // Wheel (crank)
    const wheel = new Body(BodyType.DYNAMIC, new Vec2(ox, oy - PIVOT_Y * S));
    wheel.shapes.add(new Circle(WHEEL_R * S, undefined, undefined, mf));
    try { wheel.userData._colorIdx = 3; } catch(_) {}
    wheel.space = space;

    // Motor drives the wheel relative to chassis
    new PivotJoint(chassis, wheel, new Vec2(0, 0), new Vec2(0, 0)).space = space;
    const motor = new MotorJoint(chassis, wheel, this._motorSpeed, 1.0);
    motor.space = space;
    this._motor = motor;
    this._chassis = chassis;

    // Pre-computed rest lengths (invariant across all legs/phases)
    const D12 = Math.sqrt((P2X - P5X) * (P2X - P5X) + (P2Y - P5Y) * (P2Y - P5Y)) * S;
    const D34 = Math.sqrt((P3X - P4X) * (P3X - P4X) + (P3Y - P4Y) * (P3Y - P4Y)) * S;
    const D3W = Math.sqrt(P3X * P3X + P3Y * P3Y) * S;
    const D6W = Math.sqrt(P6X * P6X + P6Y * P6Y) * S;

    function makeDJ(b1, b2, a1x, a1y, a2x, a2y, d) {
      const dj = new DistanceJoint(b1, b2, new Vec2(a1x, a1y), new Vec2(a2x, a2y), d, d);
      dj.stiff = true;
      dj.space = space;
    }

    function createLeg(side, phase) {
      // side = +1 (right) or -1 (left), phase = crank angle offset
      const p1x = P1X * side, p1y = P1Y;
      const p2x = P2X * side, p2y = P2Y;
      const p3x = P3X * side, p3y = P3Y;
      const p4x = P4X * side, p4y = P4Y;
      const p5x = P5X * side, p5y = P5Y;
      const p6x = P6X * side, p6y = P6Y;

      // Crank pin on wheel (rotated by phase)
      const wax = CRANK_R * Math.sin(phase);
      const way = CRANK_R * Math.cos(phase);

      // Body 1 (lower triangle with foot):
      // Place body at centroid of P1/P2/P3 so anchor offsets are correct.
      const c1x = (p1x + p2x + p3x) / 3 * S;
      const c1y = (p1y + p2y + p3y) / 3 * S;
      const body1 = new Body(BodyType.DYNAMIC, new Vec2(ox + c1x, oy + c1y));
      const v1 = side > 0
        ? [new Vec2(p1x*S - c1x, p1y*S - c1y), new Vec2(p3x*S - c1x, p3y*S - c1y), new Vec2(p2x*S - c1x, p2y*S - c1y)]
        : [new Vec2(p1x*S - c1x, p1y*S - c1y), new Vec2(p2x*S - c1x, p2y*S - c1y), new Vec2(p3x*S - c1x, p3y*S - c1y)];
      body1.shapes.add(new Polygon(v1, undefined, mf));
      try { body1.userData._colorIdx = 1; } catch(_) {}
      body1.space = space;

      // Body 2 (upper triangle) at P4 world position.
      const lp5x = (p5x - p4x) * S, lp5y = (p5y - p4y) * S;
      const lp6x = (p6x - p4x) * S, lp6y = (p6y - p4y) * S;
      const c2x = (lp5x + lp6x) / 3;
      const c2y = (lp5y + lp6y) / 3;
      const body2 = new Body(BodyType.DYNAMIC, new Vec2(ox + p4x * S + c2x, oy + p4y * S + c2y));
      const v2 = side > 0
        ? [new Vec2(-c2x, -c2y), new Vec2(lp6x - c2x, lp6y - c2y), new Vec2(lp5x - c2x, lp5y - c2y)]
        : [new Vec2(-c2x, -c2y), new Vec2(lp5x - c2x, lp5y - c2y), new Vec2(lp6x - c2x, lp6y - c2y)];
      body2.shapes.add(new Polygon(v2, undefined, mf));
      try { body2.userData._colorIdx = 2; } catch(_) {}
      body2.space = space;

      // 4 distance joints + 1 pivot joint form the Jansen linkage.
      // Anchor coords are body-local (relative to centroid).
      makeDJ(body1, body2, p2x*S - c1x, p2y*S - c1y, lp5x - c2x, lp5y - c2y, D12);
      makeDJ(body1, body2, p3x*S - c1x, p3y*S - c1y, -c2x, -c2y, D34);
      makeDJ(body1, wheel, p3x*S - c1x, p3y*S - c1y, wax, way, D3W);
      makeDJ(body2, wheel, lp6x - c2x, lp6y - c2y, wax, way, D6W);
      // body2↔chassis revolute joint at P4 (ground pivot)
      new PivotJoint(body2, chassis, new Vec2(-c2x, -c2y), new Vec2(p4x*S, (p4y + PIVOT_Y) * S)).space = space;
    }

    // 3 pairs of legs with 120° phase offsets
    const phases = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
    for (const phase of phases) {
      createLeg(1, phase);   // right
      createLeg(-1, phase);  // left
    }
  },

  step(_space, W, _H) {
    if (!this._motor || !this._chassis) return;
    const x = this._chassis.position.x;
    const margin = 220;
    const speed = this._motorSpeed;
    if (x < margin && speed < 0) {
      this._motorSpeed = Math.abs(speed);
      this._motor.rate = this._motorSpeed;
    } else if (x > W - margin && speed > 0) {
      this._motorSpeed = -Math.abs(speed);
      this._motor.rate = this._motorSpeed;
    }
  },

  click(x, y, space) {
    const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    ball.shapes.add(new Circle(8, undefined, new Material(0.3, 0.2, 0.8, 2)));
    try { ball.userData._colorIdx = 3; } catch(_) {}
    ball.space = space;
  },
};
