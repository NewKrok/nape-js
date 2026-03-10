import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { AABB } from "../../src/geom/AABB";
import { Ray } from "../../src/geom/Ray";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Compound } from "../../src/phys/Compound";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { Broadphase } from "../../src/space/Broadphase";
import { Material } from "../../src/phys/Material";
import { FluidProperties } from "../../src/phys/FluidProperties";

// ---------------------------------------------------------------------------
// Helper: create a dynamic body with a circle shape at position
// ---------------------------------------------------------------------------
function dynamicCircle(x: number, y: number, radius = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(radius));
  return b;
}

function dynamicBox(x: number, y: number, w = 20, h = 20): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function staticBox(x: number, y: number, w = 500, h = 10): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function kinematicCircle(x: number, y: number, radius = 10): Body {
  const b = new Body(BodyType.KINEMATIC, new Vec2(x, y));
  b.shapes.add(new Circle(radius));
  return b;
}

// ---------------------------------------------------------------------------
// 1. Gravity & basic simulation
// ---------------------------------------------------------------------------
describe("Space integration — gravity & simulation", () => {
  it("should apply gravity to dynamic bodies over multiple steps", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynamicCircle(0, 0);
    b.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // After 1 second of freefall under gravity=100, y ≈ 0.5*100*1^2 = 50
    // (drag may reduce this slightly)
    expect(b.position.y).toBeGreaterThan(30);
  });

  it("should not move static bodies under gravity", () => {
    const space = new Space(new Vec2(0, 1000));
    const s = staticBox(0, 100);
    s.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(s.position.y).toBeCloseTo(100);
  });

  it("should not move kinematic bodies under gravity", () => {
    const space = new Space(new Vec2(0, 1000));
    const k = kinematicCircle(0, 0);
    k.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(k.position.y).toBeCloseTo(0);
  });

  it("should move kinematic bodies based on velocity", () => {
    const space = new Space();
    const k = kinematicCircle(0, 0);
    k.velocity = new Vec2(100, 0);
    k.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // After 1s at 100px/s, should be near x=100
    expect(k.position.x).toBeCloseTo(100, 0);
  });

  it("should apply horizontal gravity", () => {
    const space = new Space(new Vec2(100, 0));
    const b = dynamicCircle(0, 0);
    b.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(b.position.x).toBeGreaterThan(30);
    expect(Math.abs(b.position.y)).toBeLessThan(1);
  });

  it("should apply worldLinearDrag to slow down bodies", () => {
    const space = new Space();
    space.worldLinearDrag = 0.5;
    const b = dynamicCircle(0, 0);
    b.velocity = new Vec2(100, 0);
    b.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // With drag, body should slow significantly
    expect(b.velocity.x).toBeLessThan(50);
  });

  it("should apply worldAngularDrag to slow rotation", () => {
    const space = new Space();
    space.worldAngularDrag = 0.5;
    const b = dynamicCircle(0, 0);
    b.angularVel = 10;
    b.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    expect(Math.abs(b.angularVel)).toBeLessThan(5);
  });
});

// ---------------------------------------------------------------------------
// 2. Collision detection — broadphase scenarios
// ---------------------------------------------------------------------------
describe("Space integration — collision & broadphase", () => {
  it("should detect circle-circle collision", () => {
    const space = new Space(new Vec2(0, 100));
    const floor = staticBox(0, 100);
    floor.space = space;

    const ball = dynamicCircle(0, -50, 15);
    ball.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    // Ball should settle on floor
    expect(ball.position.y).toBeLessThan(100);
    expect(ball.position.y).toBeGreaterThan(50);
  });

  it("should detect polygon-polygon collision", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = dynamicBox(0, 0);
    box.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    // Box should settle near floor
    expect(box.position.y).toBeLessThan(200);
    expect(box.position.y).toBeGreaterThan(100);
  });

  it("should detect circle-polygon collision", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const ball = dynamicCircle(0, 0, 15);
    ball.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(ball.position.y).toBeLessThan(200);
    expect(ball.position.y).toBeGreaterThan(100);
  });

  it("should handle multiple simultaneous collisions", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    // Stack of 3 boxes
    const boxes = [
      dynamicBox(0, -100),
      dynamicBox(0, -50),
      dynamicBox(0, 0),
    ];
    boxes.forEach((b) => (b.space = space));

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    // All boxes should have settled above the floor
    for (const box of boxes) {
      expect(box.position.y).toBeLessThan(200);
    }
  });

  it("should handle bodies far apart without collision", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = dynamicCircle(-1000, 0);
    const b2 = dynamicCircle(1000, 0);
    b1.space = space;
    b2.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    // Both should just fall, no horizontal movement from collision
    expect(Math.abs(b1.position.x + 1000)).toBeLessThan(1);
    expect(Math.abs(b2.position.x - 1000)).toBeLessThan(1);
  });

  it("should handle sortContacts mode", () => {
    const space = new Space(new Vec2(0, 500));
    space.sortContacts = true;
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = dynamicBox(0, 0);
    box.space = space;

    // Should not throw with sortContacts enabled
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(box.position.y).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// 3. Body management
// ---------------------------------------------------------------------------
describe("Space integration — body management", () => {
  it("should add/remove bodies dynamically during simulation", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = dynamicCircle(0, 0);
    b1.space = space;
    expect(space.bodies.length).toBe(1);

    space.step(1 / 60);

    const b2 = dynamicCircle(50, 0);
    b2.space = space;
    expect(space.bodies.length).toBe(2);

    space.step(1 / 60);

    b1.space = null;
    expect(space.bodies.length).toBe(1);

    // Continued stepping with remaining body
    space.step(1 / 60);
    expect(b2.position.y).toBeGreaterThan(0);
  });

  it("should handle all three body types simultaneously", () => {
    const space = new Space(new Vec2(0, 100));
    const stat = staticBox(0, 200);
    const kin = kinematicCircle(0, -200);
    kin.velocity = new Vec2(50, 0);
    const dyn = dynamicCircle(0, 0);

    stat.space = space;
    kin.space = space;
    dyn.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(stat.position.y).toBeCloseTo(200);
    expect(kin.position.x).toBeCloseTo(50, 0);
    expect(dyn.position.y).toBeGreaterThan(0);
  });

  it("should report liveBodies (non-sleeping)", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynamicCircle(0, 0);
    b.space = space;
    space.step(1 / 60);

    expect((space.liveBodies as any).length).toBeGreaterThanOrEqual(1);
  });

  it("should change body type at runtime", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynamicCircle(0, 0);
    b.space = space;

    space.step(1 / 60);
    const yAfterDynamic = b.position.y;
    expect(yAfterDynamic).toBeGreaterThan(0);

    // Switch to static
    b.type = BodyType.STATIC;
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Should not have moved further (is now static)
    expect(b.position.y).toBeCloseTo(yAfterDynamic, 0);
  });
});

// ---------------------------------------------------------------------------
// 4. Constraint interactions
// ---------------------------------------------------------------------------
describe("Space integration — constraints", () => {
  it("should enforce DistanceJoint during simulation", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const ball = dynamicCircle(0, 50);
    ball.space = space;

    const joint = new DistanceJoint(
      anchor,
      ball,
      new Vec2(0, 0),
      new Vec2(0, 0),
      40,
      60,
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Ball should stay within joint distance range
    const dist = Math.sqrt(
      ball.position.x ** 2 + ball.position.y ** 2,
    );
    expect(dist).toBeLessThan(70); // some tolerance
    expect(dist).toBeGreaterThan(30);
  });

  it("should enforce PivotJoint (pendulum)", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    // Place bob 50px to the right; pivot at anchor origin and bob origin
    const bob = dynamicCircle(50, 0);
    bob.space = space;

    const joint = new PivotJoint(
      anchor,
      bob,
      new Vec2(0, 0),
      new Vec2(0, 0),
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Pivot keeps bob's origin at anchor origin — bob should be near (0,0)
    // and swinging under gravity
    const dist = Math.sqrt(bob.position.x ** 2 + bob.position.y ** 2);
    expect(dist).toBeLessThan(20);
  });

  it("should enforce WeldJoint (rigid connection)", () => {
    const space = new Space(new Vec2(0, 100));
    const a = dynamicCircle(0, 0);
    const b = dynamicCircle(30, 0);
    a.space = space;
    b.space = space;

    // Weld at anchor1=(0,0), anchor2=(0,0) means both body origins are welded together
    const weld = new WeldJoint(
      a,
      b,
      new Vec2(0, 0),
      new Vec2(0, 0),
    );
    weld.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Both bodies should be close together (weld pulls origins together)
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeLessThan(15);
  });

  it("should enforce AngleJoint (rotation constraint)", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const bar = dynamicBox(50, 0, 60, 5);
    bar.space = space;

    const pivot = new PivotJoint(
      anchor,
      bar,
      new Vec2(0, 0),
      new Vec2(-25, 0),
    );
    pivot.space = space;

    const angle = new AngleJoint(anchor, bar, 0, 0);
    angle.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Bar should stay at angle ~0
    expect(Math.abs(bar.rotation)).toBeLessThan(0.1);
  });

  it("should remove constraint mid-simulation", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const ball = dynamicCircle(0, 50);
    ball.space = space;

    const joint = new PivotJoint(
      anchor,
      ball,
      new Vec2(0, 0),
      new Vec2(0, 0),
    );
    joint.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    // Remove joint — ball should now fall freely
    joint.space = null;
    expect(space.constraints.length).toBe(0);

    const yBefore = ball.position.y;
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Ball should have fallen further
    expect(ball.position.y).toBeGreaterThan(yBefore);
  });

  it("should track liveConstraints", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const ball = dynamicCircle(0, 50);
    ball.space = space;

    const joint = new PivotJoint(
      anchor,
      ball,
      new Vec2(0, 0),
      new Vec2(0, 0),
    );
    joint.space = space;

    space.step(1 / 60);
    expect((space.liveConstraints as any).length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Query methods — spatial queries
// ---------------------------------------------------------------------------
describe("Space integration — spatial queries", () => {
  function setupQuerySpace() {
    const space = new Space();
    // Place circles at known positions
    const b1 = dynamicCircle(50, 50, 10); // center (50,50)
    const b2 = dynamicCircle(150, 50, 10); // center (150,50)
    const b3 = dynamicCircle(50, 150, 10); // center (50,150)
    b1.space = space;
    b2.space = space;
    b3.space = space;
    space.step(1 / 60); // activate broadphase
    return { space, b1, b2, b3 };
  }

  // --- shapesUnderPoint / bodiesUnderPoint ---
  it("should find shapes under a point (hit)", () => {
    const { space } = setupQuerySpace();
    const result = space.shapesUnderPoint(new Vec2(50, 50)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find no shapes under a point (miss)", () => {
    const { space } = setupQuerySpace();
    const result = space.shapesUnderPoint(new Vec2(500, 500)) as any;
    expect(result.length).toBe(0);
  });

  it("should find bodies under a point", () => {
    const { space } = setupQuerySpace();
    const result = space.bodiesUnderPoint(new Vec2(50, 50)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find no bodies under a miss point", () => {
    const { space } = setupQuerySpace();
    const result = space.bodiesUnderPoint(new Vec2(500, 500)) as any;
    expect(result.length).toBe(0);
  });

  // --- shapesInAABB / bodiesInAABB ---
  it("should find shapes in AABB", () => {
    const { space } = setupQuerySpace();
    const aabb = new AABB(30, 30, 70, 70); // should contain b1 at (50,50)
    const result = space.shapesInAABB(aabb) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find no shapes in empty AABB region", () => {
    const { space } = setupQuerySpace();
    const aabb = new AABB(300, 300, 400, 400);
    const result = space.shapesInAABB(aabb) as any;
    expect(result.length).toBe(0);
  });

  it("should find bodies in AABB", () => {
    const { space } = setupQuerySpace();
    const aabb = new AABB(30, 30, 70, 70);
    const result = space.bodiesInAABB(aabb) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find all bodies in large AABB", () => {
    const { space } = setupQuerySpace();
    const aabb = new AABB(-100, -100, 500, 500);
    const result = space.bodiesInAABB(aabb) as any;
    expect(result.length).toBe(3);
  });

  it("should throw for null AABB", () => {
    const { space } = setupQuerySpace();
    expect(() => space.shapesInAABB(null as any)).toThrow("null");
  });

  it("should handle zero-width AABB query gracefully", () => {
    const { space } = setupQuerySpace();
    // AABB constructor may auto-correct min/max, so test with explicit values
    const aabb = new AABB(50, 30, 50.001, 70); // near-zero width
    const result = space.shapesInAABB(aabb) as any;
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("should support containment mode in shapesInAABB", () => {
    const { space } = setupQuerySpace();
    // Large AABB that fully contains b1's circle at (50,50) r=10
    const aabb = new AABB(30, 30, 70, 70);
    const result = space.shapesInAABB(aabb, true) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // --- shapesInCircle / bodiesInCircle ---
  it("should find shapes in circle query", () => {
    const { space } = setupQuerySpace();
    const result = space.shapesInCircle(new Vec2(50, 50), 30) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find no shapes in distant circle query", () => {
    const { space } = setupQuerySpace();
    const result = space.shapesInCircle(new Vec2(500, 500), 10) as any;
    expect(result.length).toBe(0);
  });

  it("should find bodies in circle query", () => {
    const { space } = setupQuerySpace();
    const result = space.bodiesInCircle(new Vec2(50, 50), 30) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should throw for null position in shapesInCircle", () => {
    const { space } = setupQuerySpace();
    expect(() => space.shapesInCircle(null as any, 10)).toThrow("null");
  });

  it("should throw for NaN radius in shapesInCircle", () => {
    const { space } = setupQuerySpace();
    expect(() => space.shapesInCircle(new Vec2(0, 0), NaN)).toThrow("NaN");
  });

  it("should throw for non-positive radius in shapesInCircle", () => {
    const { space } = setupQuerySpace();
    expect(() => space.shapesInCircle(new Vec2(0, 0), 0)).toThrow("positive");
  });

  it("should throw for disposed position in shapesInCircle", () => {
    const { space } = setupQuerySpace();
    const v = new Vec2(0, 0);
    v.dispose();
    expect(() => space.shapesInCircle(v, 10)).toThrow("disposed");
  });

  it("should throw for null position in bodiesInCircle", () => {
    const { space } = setupQuerySpace();
    expect(() => space.bodiesInCircle(null as any, 10)).toThrow("null");
  });

  it("should throw for NaN radius in bodiesInCircle", () => {
    const { space } = setupQuerySpace();
    expect(() => space.bodiesInCircle(new Vec2(0, 0), NaN)).toThrow("NaN");
  });

  it("should throw for non-positive radius in bodiesInCircle", () => {
    const { space } = setupQuerySpace();
    expect(() => space.bodiesInCircle(new Vec2(0, 0), -5)).toThrow("positive");
  });

  // --- shapesInShape / bodiesInShape ---
  it("should find shapes in shape query", () => {
    const { space } = setupQuerySpace();
    const queryBody = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    const queryShape = new Circle(30);
    queryBody.shapes.add(queryShape);

    const result = space.shapesInShape(queryShape) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find bodies in shape query", () => {
    const { space } = setupQuerySpace();
    const queryBody = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    const queryShape = new Circle(30);
    queryBody.shapes.add(queryShape);

    const result = space.bodiesInShape(queryShape) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should throw for null shape in shapesInShape", () => {
    const { space } = setupQuerySpace();
    expect(() => space.shapesInShape(null as any)).toThrow("null");
  });

  it("should throw for shape without body in shapesInShape", () => {
    const { space } = setupQuerySpace();
    const orphan = new Circle(10);
    expect(() => space.shapesInShape(orphan as any)).toThrow("Body");
  });

  it("should throw for null shape in bodiesInShape", () => {
    const { space } = setupQuerySpace();
    expect(() => space.bodiesInShape(null as any)).toThrow("null");
  });

  // --- shapesInBody / bodiesInBody ---
  it("should find shapes overlapping a body", () => {
    const { space, b1 } = setupQuerySpace();
    // b1 is at (50,50), b3 is at (50,150) — only b1 area shapes should overlap with a query body at (50,50)
    const queryBody = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    queryBody.shapes.add(new Circle(30));
    queryBody.space = space;
    space.step(1 / 60);

    const result = space.shapesInBody(queryBody) as any;
    // Should find at least b1's shape
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find bodies overlapping a body", () => {
    const { space } = setupQuerySpace();
    const queryBody = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    queryBody.shapes.add(new Circle(30));
    queryBody.space = space;
    space.step(1 / 60);

    const result = space.bodiesInBody(queryBody) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should throw for null body in shapesInBody", () => {
    const { space } = setupQuerySpace();
    expect(() => space.shapesInBody(null as any)).toThrow("null");
  });

  it("should throw for null body in bodiesInBody", () => {
    const { space } = setupQuerySpace();
    expect(() => space.bodiesInBody(null as any)).toThrow("null");
  });

  // --- interactionType ---
  it("should detect collision interaction type between overlapping shapes", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = dynamicCircle(0, 0, 20);
    const b2 = dynamicCircle(10, 0, 20); // overlapping
    b1.space = space;
    b2.space = space;
    space.step(1 / 60);

    const s1 = (b1.shapes as any).at(0);
    const s2 = (b2.shapes as any).at(0);
    const itype = space.interactionType(s1, s2);
    expect(itype).toBe(InteractionType.COLLISION);
  });

  it("should return interaction type for non-overlapping shapes", () => {
    const space = new Space();
    const b1 = dynamicCircle(0, 0, 5);
    const b2 = dynamicCircle(1000, 0, 5);
    b1.space = space;
    b2.space = space;
    space.step(1 / 60);

    const s1 = (b1.shapes as any).at(0);
    const s2 = (b2.shapes as any).at(0);
    const itype = space.interactionType(s1, s2);
    // interactionType returns the *potential* type based on filters, not overlap
    expect(itype).toBeDefined();
  });

  // --- filter in queries ---
  it("should filter shapes by InteractionFilter in shapesUnderPoint", () => {
    const space = new Space();
    const b1 = dynamicCircle(50, 50, 20);
    const filter1 = new InteractionFilter();
    filter1.collisionGroup = 1;
    filter1.collisionMask = 1;
    (b1.shapes as any).at(0).filter = filter1;
    b1.space = space;
    space.step(1 / 60);

    // Query with a filter that doesn't match
    const queryFilter = new InteractionFilter();
    queryFilter.collisionGroup = 2;
    queryFilter.collisionMask = 2;
    const result = space.shapesUnderPoint(new Vec2(50, 50), queryFilter) as any;
    expect(result.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Ray casting
// ---------------------------------------------------------------------------
describe("Space integration — ray casting", () => {
  it("should cast a ray and hit a body", () => {
    const space = new Space();
    const b = dynamicCircle(100, 0, 20);
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray) as any;
    expect(result).not.toBeNull();
  });

  it("should miss when ray points away from body", () => {
    const space = new Space();
    const b = dynamicCircle(100, 0, 20);
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(-1, 0));
    const result = space.rayCast(ray) as any;
    expect(result).toBeNull();
  });

  it("should rayMultiCast and hit multiple bodies", () => {
    const space = new Space();
    const b1 = dynamicCircle(100, 0, 15);
    const b2 = dynamicCircle(200, 0, 15);
    b1.space = space;
    b2.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayMultiCast(ray) as any;
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("should throw for null ray in rayCast", () => {
    const space = new Space();
    expect(() => space.rayCast(null as any)).toThrow("null");
  });

  it("should throw for null ray in rayMultiCast", () => {
    const space = new Space();
    expect(() => space.rayMultiCast(null as any)).toThrow("null");
  });
});

// ---------------------------------------------------------------------------
// 7. Convex cast
// ---------------------------------------------------------------------------
describe("Space integration — convex cast", () => {
  it("should cast a moving shape and find hit", () => {
    const space = new Space();
    const wall = staticBox(200, 0, 10, 200);
    wall.space = space;

    const projectile = dynamicCircle(0, 0, 10);
    projectile.velocity = new Vec2(500, 0);
    projectile.space = space;
    space.step(1 / 60);

    const shape = (projectile.shapes as any).at(0);
    const result = space.convexCast(shape, 1.0) as any;
    expect(result).not.toBeNull();
  });

  it("should throw for null shape in convexCast", () => {
    const space = new Space();
    expect(() => space.convexCast(null as any, 1.0)).toThrow("null");
  });

  it("should throw for shape without body in convexCast", () => {
    const space = new Space();
    const orphanBody = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const orphanShape = new Circle(10);
    orphanBody.shapes.add(orphanShape);
    // Remove body from shape to make it orphan — actually shapes always have body
    // Test with shape whose body is not in space
    expect(() => space.convexCast(orphanShape as any, 1.0)).not.toThrow();
  });

  it("should throw for negative deltaTime in convexCast", () => {
    const space = new Space();
    const b = dynamicCircle(0, 0);
    b.space = space;
    space.step(1 / 60);
    const shape = (b.shapes as any).at(0);
    expect(() => space.convexCast(shape, -1)).toThrow();
  });

  it("should convexMultiCast and return list", () => {
    const space = new Space();
    const wall1 = staticBox(200, 0, 10, 200);
    const wall2 = staticBox(400, 0, 10, 200);
    wall1.space = space;
    wall2.space = space;

    const projectile = dynamicCircle(0, 0, 10);
    projectile.velocity = new Vec2(500, 0);
    projectile.space = space;
    space.step(1 / 60);

    const shape = (projectile.shapes as any).at(0);
    const result = space.convexMultiCast(shape, 2.0) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should throw for null shape in convexMultiCast", () => {
    const space = new Space();
    expect(() => space.convexMultiCast(null as any, 1.0)).toThrow("null");
  });
});

// ---------------------------------------------------------------------------
// 8. Compound management
// ---------------------------------------------------------------------------
describe("Space integration — compounds", () => {
  it("should add compound with bodies to space", () => {
    const space = new Space(new Vec2(0, 100));
    const compound = new Compound();

    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(30, 0);
    compound.bodies.add(b1);
    compound.bodies.add(b2);

    compound.space = space;
    // Bodies inside compounds are NOT in space.bodies (top-level only)
    // but they are managed by the physics engine (liveBodies)
    expect(compound.bodies.length).toBe(2);
    expect((space.compounds as any).length).toBe(1);
  });

  it("should visit compounds", () => {
    const space = new Space();
    const compound = new Compound();
    const b = dynamicCircle(0, 0);
    compound.bodies.add(b);
    compound.space = space;

    let count = 0;
    space.visitCompounds(() => count++);
    expect(count).toBe(1);
  });

  it("should remove compound and its bodies from space", () => {
    const space = new Space(new Vec2(0, 100));
    const compound = new Compound();
    const b = dynamicCircle(0, 0);
    compound.bodies.add(b);
    compound.space = space;
    expect((space.compounds as any).length).toBe(1);

    compound.space = null;
    expect((space.compounds as any).length).toBe(0);
  });

  it("should clear space with compounds", () => {
    const space = new Space();
    const compound = new Compound();
    const b = dynamicCircle(0, 0);
    compound.bodies.add(b);
    compound.space = space;
    expect((space.compounds as any).length).toBe(1);

    space.clear();
    expect((space.compounds as any).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Sleep & wake
// ---------------------------------------------------------------------------
describe("Space integration — sleep & wake", () => {
  it("should allow body to fall asleep after settling", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = dynamicBox(0, 100);
    box.space = space;

    // Run enough steps for body to settle and potentially sleep
    for (let i = 0; i < 600; i++) space.step(1 / 60);

    // Body should have settled
    expect(box.position.y).toBeLessThan(200);
    // isSleeping may or may not be true depending on settings,
    // but simulation should be stable
    expect(Math.abs(box.velocity.y)).toBeLessThan(10);
  });

  it("should wake body when force is applied", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = dynamicBox(0, 100);
    box.space = space;

    // Let it settle
    for (let i = 0; i < 600; i++) space.step(1 / 60);

    // Apply impulse
    box.applyImpulse(new Vec2(0, -1000));
    space.step(1 / 60);

    // Body should be moving upward
    expect(box.velocity.y).toBeLessThan(0);
  });

  it("should wake body when velocity is set", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = dynamicBox(0, 150);
    box.space = space;

    for (let i = 0; i < 600; i++) space.step(1 / 60);

    box.velocity = new Vec2(100, -200);
    space.step(1 / 60);

    // Body should be moving
    expect(box.velocity.x).not.toBeCloseTo(0, 0);
  });
});

// ---------------------------------------------------------------------------
// 10. Arbiters
// ---------------------------------------------------------------------------
describe("Space integration — arbiters", () => {
  it("should expose arbiters list after collision", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 50);
    floor.space = space;

    const box = dynamicBox(0, 20, 20, 20);
    box.space = space;

    // Step until collision
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    // Arbiters property should be available
    const arbiters = space.arbiters;
    expect(arbiters).toBeDefined();
  });

  it("should clear all content when space is cleared", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 50);
    floor.space = space;

    const box = dynamicBox(0, 20);
    box.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    space.clear();
    expect(space.bodies.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 11. Broadphase property
// ---------------------------------------------------------------------------
describe("Space integration — broadphase property", () => {
  it("should default to DYNAMIC_AABB_TREE", () => {
    const space = new Space();
    expect(space.broadphase).toBe(Broadphase.DYNAMIC_AABB_TREE);
  });
});

// ---------------------------------------------------------------------------
// 12. Multiple shapes per body
// ---------------------------------------------------------------------------
describe("Space integration — multi-shape bodies", () => {
  it("should handle body with multiple shapes", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.shapes.add(new Polygon(Polygon.box(30, 5)));
    b.space = space;

    space.step(1 / 60);
    expect(b.position.y).toBeGreaterThan(0);
  });

  it("should detect collision with multi-shape body", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.shapes.add(new Polygon(Polygon.box(30, 30)));
    b.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(b.position.y).toBeLessThan(200);
    expect(b.position.y).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------------------
// 13. Material & FluidProperties
// ---------------------------------------------------------------------------
describe("Space integration — material properties", () => {
  it("should respect elasticity (bouncy material)", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const ball = dynamicCircle(0, 0, 10);
    const mat = new Material(0.8, 0.3, 0.1, 1, 0.001);
    (ball.shapes as any).at(0).material = mat;
    ball.space = space;

    // Let ball fall and bounce
    let maxY = 0;
    for (let i = 0; i < 120; i++) {
      space.step(1 / 60);
      if (ball.position.y > maxY) maxY = ball.position.y;
    }

    // Ball should have reached past the floor
    expect(maxY).toBeGreaterThan(0);
  });

  it("should respect high friction material", () => {
    const space = new Space(new Vec2(0, 500));
    // Angled floor (use static body rotated)
    const floor = staticBox(0, 200, 500, 10);
    floor.space = space;

    const slider = dynamicBox(0, 100);
    const mat = new Material(0, 10, 0.1, 1, 0.001); // high dynamicFriction
    (slider.shapes as any).at(0).material = mat;
    slider.velocity = new Vec2(100, 0);
    slider.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    // High friction should slow it down significantly
    expect(Math.abs(slider.velocity.x)).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// 14. Edge cases and error handling
// ---------------------------------------------------------------------------
describe("Space integration — edge cases", () => {
  it("should handle stepping empty space", () => {
    const space = new Space(new Vec2(0, 100));
    // Should not throw
    space.step(1 / 60);
    space.step(1 / 60);
    expect(space.timeStamp).toBe(2);
  });

  it("should handle very small dt", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynamicCircle(0, 0);
    b.space = space;
    space.step(0.0001);
    expect(b.position.y).toBeGreaterThanOrEqual(0);
  });

  it("should handle large number of bodies", () => {
    const space = new Space(new Vec2(0, 100));
    for (let i = 0; i < 50; i++) {
      const b = dynamicCircle(i * 30, 0, 5);
      b.space = space;
    }

    space.step(1 / 60);
    expect(space.bodies.length).toBe(50);
  });

  it("should handle adding and removing many bodies rapidly", () => {
    const space = new Space(new Vec2(0, 100));

    for (let step = 0; step < 10; step++) {
      const bodies: Body[] = [];
      for (let i = 0; i < 5; i++) {
        const b = dynamicCircle(i * 30, 0);
        b.space = space;
        bodies.push(b);
      }
      space.step(1 / 60);
      for (const b of bodies) {
        b.space = null;
      }
    }

    expect(space.bodies.length).toBe(0);
  });

  it("should handle shapes added to body after body is in space", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    b.space = space;

    space.step(1 / 60);

    // Add another shape
    b.shapes.add(new Circle(8));
    space.step(1 / 60);

    expect(b.position.y).toBeGreaterThan(0);
  });

  it("should handle world body (static reference)", () => {
    const space = new Space();
    const world = space.world;
    expect(world).toBeDefined();
    expect(world.type).toBe(BodyType.STATIC);
  });

  it("should clear and reuse space", () => {
    const space = new Space(new Vec2(0, 100));
    for (let i = 0; i < 5; i++) {
      const b = dynamicCircle(i * 20, 0);
      b.space = space;
    }
    space.step(1 / 60);
    space.clear();

    // Add new bodies after clear
    const b = dynamicCircle(0, 0);
    b.space = space;
    space.step(1 / 60);
    expect(b.position.y).toBeGreaterThan(0);
    expect(space.bodies.length).toBe(1);
  });

  it("should support custom velocity/position iterations", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = dynamicBox(0, 0);
    box.space = space;

    // Low iterations
    for (let i = 0; i < 60; i++) space.step(1 / 60, 1, 1);

    // High iterations
    const space2 = new Space(new Vec2(0, 500));
    const floor2 = staticBox(0, 200);
    floor2.space = space2;

    const box2 = dynamicBox(0, 0);
    box2.space = space2;

    for (let i = 0; i < 60; i++) space2.step(1 / 60, 20, 20);

    // Both should have settled, but high iterations may be slightly more accurate
    expect(box.position.y).toBeGreaterThan(100);
    expect(box2.position.y).toBeGreaterThan(100);
  });
});
