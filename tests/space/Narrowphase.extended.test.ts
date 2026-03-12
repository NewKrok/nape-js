import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Material } from "../../src/phys/Material";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

function dynamicCircle(x: number, y: number, radius = 10): Body {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Circle(radius));
  return body;
}

function dynamicBox(x: number, y: number, w = 20, h = 20): Body {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.box(w, h)));
  return body;
}

function staticBox(x: number, y: number, w = 500, h = 10): Body {
  const body = new Body(BodyType.STATIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.box(w, h)));
  return body;
}

function dynamicCapsule(x: number, y: number, width = 60, height = 30): Body {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Capsule(width, height));
  return body;
}

function kineticEnergy(body: Body): number {
  const vx = body.velocity.x;
  const vy = body.velocity.y;
  const mass = body.mass;
  return 0.5 * mass * (vx * vx + vy * vy);
}

// ---------------------------------------------------------------------------
// Narrowphase collision tests (integration via space stepping)
// ---------------------------------------------------------------------------

describe("Narrowphase extended integration tests", () => {
  // 1. Circle vs circle - head-on collision resolves
  it("should resolve head-on circle-circle collision", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCircle(-50, 0, 10);
    a.velocity = new Vec2(100, 0);
    const b = dynamicCircle(50, 0, 10);
    b.velocity = new Vec2(-100, 0);
    space.bodies.add(a);
    space.bodies.add(b);

    step(space, 120);

    // After collision, bodies should have separated
    expect(a.position.x).toBeLessThan(b.position.x);
    // Velocities should have reversed (or at least changed direction)
    expect(a.velocity.x).toBeLessThanOrEqual(0);
    expect(b.velocity.x).toBeGreaterThanOrEqual(0);
  });

  // 2. Circle vs circle - glancing collision deflects
  it("should deflect circles in a glancing collision", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCircle(-60, -5, 10);
    a.velocity = new Vec2(200, 0);
    const b = dynamicCircle(60, 5, 10);
    b.velocity = new Vec2(-200, 0);
    space.bodies.add(a);
    space.bodies.add(b);

    step(space, 120);

    // A glancing collision should produce y-velocity deflection
    expect(Math.abs(a.velocity.y)).toBeGreaterThan(0.1);
    expect(Math.abs(b.velocity.y)).toBeGreaterThan(0.1);
  });

  // 3. Polygon vs polygon - box stacking
  it("should stack boxes on a static ground", () => {
    const space = new Space(new Vec2(0, 400));
    const ground = staticBox(0, 300);
    space.bodies.add(ground);

    const box1 = dynamicBox(0, 0, 30, 30);
    const box2 = dynamicBox(0, -50, 30, 30);
    space.bodies.add(box1);
    space.bodies.add(box2);

    step(space, 600);

    // Both boxes should be resting above the ground surface
    expect(box1.position.y).toBeLessThan(300);
    expect(box2.position.y).toBeLessThan(box1.position.y);
    // Velocities should be near zero after settling
    expect(Math.abs(box1.velocity.y)).toBeLessThan(5);
    expect(Math.abs(box2.velocity.y)).toBeLessThan(5);
  });

  // 4. Circle vs polygon edge - rolling on surface
  it("should settle a circle rolling on a polygon surface", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 100);
    const ball = dynamicCircle(-100, 0, 15);
    ball.velocity = new Vec2(50, 0);
    space.bodies.add(ground);
    space.bodies.add(ball);

    step(space, 300);

    // Ball should be resting on/near the ground
    expect(ball.position.y).toBeLessThan(100);
    expect(ball.position.y).toBeGreaterThan(50);
  });

  // 5. Capsule vs capsule collision
  it("should resolve capsule-capsule collision", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCapsule(-80, 0, 60, 30);
    a.velocity = new Vec2(100, 0);
    const b = dynamicCapsule(80, 0, 60, 30);
    b.velocity = new Vec2(-100, 0);
    space.bodies.add(a);
    space.bodies.add(b);

    step(space, 120);

    // After collision, capsules should have separated
    expect(a.position.x).toBeLessThan(b.position.x);
  });

  // 6. Capsule vs circle collision
  it("should resolve capsule-circle collision", () => {
    const space = new Space(new Vec2(0, 0));
    const cap = dynamicCapsule(-80, 0, 60, 30);
    cap.velocity = new Vec2(100, 0);
    const circ = dynamicCircle(80, 0, 15);
    circ.velocity = new Vec2(-100, 0);
    space.bodies.add(cap);
    space.bodies.add(circ);

    step(space, 120);

    // Bodies should not overlap
    const dist = Math.abs(cap.position.x - circ.position.x);
    expect(dist).toBeGreaterThan(10);
  });

  // 7. Capsule vs polygon collision
  it("should resolve capsule-polygon collision", () => {
    const space = new Space(new Vec2(0, 400));
    const ground = staticBox(0, 200);
    const cap = dynamicCapsule(0, 0, 60, 30);
    space.bodies.add(ground);
    space.bodies.add(cap);

    step(space, 300);

    // Capsule should settle above ground
    expect(cap.position.y).toBeLessThan(200);
    expect(cap.position.y).toBeGreaterThan(100);
    expect(Math.abs(cap.velocity.y)).toBeLessThan(5);
  });

  // 8. High-speed circle collision (CCD scenario)
  it("should handle high-speed circle collision without tunneling", () => {
    const space = new Space(new Vec2(0, 0));
    const wall = staticBox(0, 0, 10, 200);
    const bullet = dynamicCircle(-200, 0, 5);
    bullet.velocity = new Vec2(5000, 0);
    space.bodies.add(wall);
    space.bodies.add(bullet);

    step(space, 60);

    // The bullet should not have tunneled through the wall
    // It should be on the left side or at least not far past it
    expect(bullet.position.x).toBeLessThan(100);
  });

  // 9. Many circles in a box (multiple simultaneous contacts)
  it("should resolve many circles settling in a box", () => {
    const space = new Space(new Vec2(0, 200));
    // Create box walls
    const floor = staticBox(0, 200, 200, 10);
    const leftWall = staticBox(-100, 0, 10, 400);
    const rightWall = staticBox(100, 0, 10, 400);
    space.bodies.add(floor);
    space.bodies.add(leftWall);
    space.bodies.add(rightWall);

    // Drop many circles
    const circles: Body[] = [];
    for (let i = 0; i < 10; i++) {
      const c = dynamicCircle(-30 + (i % 5) * 15, -100 - Math.floor(i / 5) * 30, 6);
      space.bodies.add(c);
      circles.push(c);
    }

    step(space, 600);

    // All circles should have settled (low velocity)
    for (const c of circles) {
      const speed = Math.sqrt(c.velocity.x ** 2 + c.velocity.y ** 2);
      expect(speed).toBeLessThan(10);
    }
    // All circles should be above the floor
    for (const c of circles) {
      expect(c.position.y).toBeLessThan(200);
    }
  });

  // 10. Elastic collision (material elasticity = 1.0) conserves energy
  it("should approximately conserve kinetic energy with elasticity = 1.0", () => {
    const space = new Space(new Vec2(0, 0));
    const elasticMat = new Material(1.0, 0, 0, 1, 0.001);

    const a = new Body(BodyType.DYNAMIC, new Vec2(-50, 0));
    const circA = new Circle(10);
    circA.material = elasticMat;
    a.shapes.add(circA);
    a.velocity = new Vec2(100, 0);

    const b = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const circB = new Circle(10);
    circB.material = elasticMat;
    b.shapes.add(circB);
    b.velocity = new Vec2(0, 0);

    space.bodies.add(a);
    space.bodies.add(b);

    const keBefore = kineticEnergy(a) + kineticEnergy(b);

    step(space, 120);

    const keAfter = kineticEnergy(a) + kineticEnergy(b);

    // Energy should be roughly conserved (allow 30% tolerance for solver imprecision)
    expect(keAfter).toBeGreaterThan(keBefore * 0.7);
  });

  // 11. Inelastic collision (material elasticity = 0) absorbs energy
  it("should absorb kinetic energy with elasticity = 0", () => {
    const space = new Space(new Vec2(0, 0));
    const inelasticMat = new Material(0, 0, 0, 1, 0.001);

    const a = new Body(BodyType.DYNAMIC, new Vec2(-50, 0));
    const circA = new Circle(10);
    circA.material = inelasticMat;
    a.shapes.add(circA);
    a.velocity = new Vec2(100, 0);

    const b = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const circB = new Circle(10);
    circB.material = inelasticMat;
    b.shapes.add(circB);
    b.velocity = new Vec2(0, 0);

    space.bodies.add(a);
    space.bodies.add(b);

    const keBefore = kineticEnergy(a) + kineticEnergy(b);

    step(space, 120);

    const keAfter = kineticEnergy(a) + kineticEnergy(b);

    // Inelastic collision should lose energy
    expect(keAfter).toBeLessThan(keBefore);
  });

  // 12. Friction effect on sliding box
  it("should slow down a sliding box with friction", () => {
    const space = new Space(new Vec2(0, 200));
    const frictionMat = new Material(0, 2.0, 2.0, 1, 0.001);

    const ground = new Body(BodyType.STATIC, new Vec2(0, 100));
    const groundShape = new Polygon(Polygon.box(1000, 10));
    groundShape.material = frictionMat;
    ground.shapes.add(groundShape);

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    const boxShape = new Polygon(Polygon.box(20, 20));
    boxShape.material = frictionMat;
    box.shapes.add(boxShape);
    box.velocity = new Vec2(200, 0);

    space.bodies.add(ground);
    space.bodies.add(box);

    step(space, 300);

    // Friction should have slowed the box significantly
    expect(Math.abs(box.velocity.x)).toBeLessThan(100);
  });

  // 13. Circle inside large polygon sensor (containment)
  it("should detect circle on sensor-enabled shape", () => {
    const space = new Space(new Vec2(0, 0));

    const sensorBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    const sensorShape = new Polygon(Polygon.box(200, 200));
    sensorShape.sensorEnabled = true;
    sensorBody.shapes.add(sensorShape);

    const ball = dynamicCircle(0, 0, 5);
    ball.velocity = new Vec2(10, 10);

    space.bodies.add(sensorBody);
    space.bodies.add(ball);

    // Stepping should not throw; sensor should not apply collision forces
    step(space, 60);

    // Ball should pass through the sensor (no collision response)
    // Its velocity direction should remain roughly the same
    expect(ball.velocity.x).toBeGreaterThan(0);
    expect(ball.velocity.y).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GeomPoly cutting tests (ZPP_Cutter)
// ---------------------------------------------------------------------------

describe("GeomPoly.cut (ZPP_Cutter) tests", () => {
  function makeSquare(size = 100): GeomPoly {
    const h = size / 2;
    return new GeomPoly([Vec2.get(-h, -h), Vec2.get(h, -h), Vec2.get(h, h), Vec2.get(-h, h)]);
  }

  function makeTriangle(): GeomPoly {
    return new GeomPoly([Vec2.get(0, -50), Vec2.get(50, 50), Vec2.get(-50, 50)]);
  }

  // 14. Cut a square with horizontal line
  it("should cut a square with a horizontal line into two pieces", () => {
    const sq = makeSquare(100);
    const result = sq.cut(Vec2.get(-100, 0), Vec2.get(100, 0), true, true);

    expect(result).toBeDefined();
    expect(result.length).toBe(2);

    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i) as GeomPoly;
      expect(poly.size()).toBeGreaterThanOrEqual(3);
    }
  });

  // 15. Cut a square with vertical line
  it("should cut a square with a vertical line into two pieces", () => {
    const sq = makeSquare(100);
    const result = sq.cut(Vec2.get(0, -100), Vec2.get(0, 100), true, true);

    expect(result).toBeDefined();
    expect(result.length).toBe(2);

    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i) as GeomPoly;
      expect(poly.size()).toBeGreaterThanOrEqual(3);
    }
  });

  // 16. Cut a square with diagonal line
  it("should cut a square with a diagonal line", () => {
    const sq = makeSquare(100);
    const result = sq.cut(Vec2.get(-100, -100), Vec2.get(100, 100), true, true);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i) as GeomPoly;
      expect(poly.size()).toBeGreaterThanOrEqual(3);
    }
  });

  // 17. Cut a triangle
  it("should cut a triangle into pieces", () => {
    const tri = makeTriangle();
    const result = tri.cut(Vec2.get(-100, 0), Vec2.get(100, 0), true, true);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i) as GeomPoly;
      expect(poly.size()).toBeGreaterThanOrEqual(3);
    }
  });

  // 18. Cut polygon with bounded start/end
  it("should cut with bounded start and end", () => {
    const sq = makeSquare(100);
    // Bounded cut: the line segment is finite
    const result = sq.cut(Vec2.get(-60, 0), Vec2.get(60, 0), true, true);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  // 19. Cut polygon with unbounded start/end
  it("should cut with unbounded start and end (ray-like cut)", () => {
    const sq = makeSquare(100);
    // Unbounded cut: the cutting line extends infinitely in both directions
    const result = sq.cut(Vec2.get(-10, 0), Vec2.get(10, 0), false, false);

    expect(result).toBeDefined();
    expect(result.length).toBe(2);

    // Total area of pieces should approximately equal original area
    let totalArea = 0;
    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i) as GeomPoly;
      totalArea += poly.area();
    }
    const originalArea = sq.area();
    expect(totalArea).toBeCloseTo(originalArea, 0);
  });

  // 20. Error: cut with null start/end throws
  it("should throw when cutting with null start or end", () => {
    const sq = makeSquare(100);

    expect(() => sq.cut(null as any, Vec2.get(100, 0))).toThrow(/null/i);
    expect(() => sq.cut(Vec2.get(-100, 0), null as any)).toThrow(/null/i);
    expect(() => sq.cut(null as any, null as any)).toThrow(/null/i);
  });
});
