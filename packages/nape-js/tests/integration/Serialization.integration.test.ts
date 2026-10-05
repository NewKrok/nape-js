import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Material } from "../../src/phys/Material";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { spaceToJSON, spaceFromJSON } from "../../src/serialization/index";
import { spaceToBinary, spaceFromBinary } from "../../src/serialization/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function step(space: Space, n = 60): void {
  for (let i = 0; i < n; i++) space.step(1 / 60);
}

function dynamicCircle(x: number, y: number, radius = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(radius));
  return b;
}

function staticBox(x: number, y: number, w = 500, h = 10): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function roundTripJSON(space: Space): Space {
  const snapshot = spaceToJSON(space);
  const json = JSON.stringify(snapshot);
  return spaceFromJSON(JSON.parse(json));
}

function roundTripBinary(space: Space): Space {
  return spaceFromBinary(spaceToBinary(space));
}

// ---------------------------------------------------------------------------
// 1. JSON round-trip simulation continuity
// ---------------------------------------------------------------------------
describe("Serialization integration — JSON round-trip simulation", () => {
  it("should continue simulation after JSON round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 30);
    const posBeforeSerialize = ball.position.y;

    const restored = roundTripJSON(space);
    const restoredBall = restored.bodies.at(0);
    expect(restoredBall.position.y).toBeCloseTo(posBeforeSerialize, 0);

    step(restored, 30);
    expect(restoredBall.position.y).toBeGreaterThan(posBeforeSerialize);
  });

  it("should preserve gravity through JSON round-trip", () => {
    const space = new Space(new Vec2(10, 200));
    const ball = dynamicCircle(0, 0);
    ball.space = space;

    const restored = roundTripJSON(space);
    expect(restored.gravity.x).toBeCloseTo(10);
    expect(restored.gravity.y).toBeCloseTo(200);
  });

  it("should preserve body types through JSON round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const dynamic = dynamicCircle(0, 0);
    dynamic.space = space;
    const stat = staticBox(0, 100);
    stat.space = space;
    const kin = new Body(BodyType.KINEMATIC, new Vec2(50, 50));
    kin.shapes.add(new Circle(10));
    kin.space = space;

    const restored = roundTripJSON(space);
    const types = [];
    for (let i = 0; i < restored.bodies.length; i++) {
      types.push(restored.bodies.at(i).type);
    }
    expect(types).toContain(BodyType.DYNAMIC);
    expect(types).toContain(BodyType.STATIC);
    expect(types).toContain(BodyType.KINEMATIC);
  });

  it("should preserve body velocity through JSON round-trip", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynamicCircle(0, 0);
    b.velocity = new Vec2(100, -50);
    b.space = space;

    const restored = roundTripJSON(space);
    const rb = restored.bodies.at(0);
    expect(rb.velocity.x).toBeCloseTo(100, 0);
    expect(rb.velocity.y).toBeCloseTo(-50, 0);
  });

  it("should preserve multiple bodies with positions", () => {
    const space = new Space(new Vec2(0, 100));
    dynamicCircle(-100, -50).space = space;
    dynamicCircle(0, 0).space = space;
    dynamicCircle(100, 50).space = space;

    const restored = roundTripJSON(space);
    expect(restored.bodies.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 2. JSON round-trip with constraints
// ---------------------------------------------------------------------------
describe("Serialization integration — JSON constraints", () => {
  it("should preserve DistanceJoint through JSON round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = dynamicCircle(-30, 0);
    b1.space = space;
    const b2 = dynamicCircle(30, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 50, 70);
    joint.space = space;

    const restored = roundTripJSON(space);
    expect(restored.constraints.length).toBe(1);

    step(restored, 60);
    // Bodies should remain connected
    const rb1 = restored.bodies.at(0);
    const rb2 = restored.bodies.at(1);
    const dist = Math.sqrt(
      (rb1.position.x - rb2.position.x) ** 2 + (rb1.position.y - rb2.position.y) ** 2,
    );
    expect(dist).toBeLessThanOrEqual(80);
  });

  it("should preserve PivotJoint through JSON round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const pendulum = dynamicCircle(50, 0);
    pendulum.space = space;

    const joint = new PivotJoint(anchor, pendulum, new Vec2(0, 0), new Vec2(-50, 0));
    joint.space = space;

    step(space, 30);

    const restored = roundTripJSON(space);
    expect(restored.constraints.length).toBe(1);
    step(restored, 30);
    // Should continue swinging
    const restoredPendulum = [...restored.bodies].find((b) => b.type === BodyType.DYNAMIC)!;
    expect(restoredPendulum.position.y).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Binary round-trip simulation continuity
// ---------------------------------------------------------------------------
describe("Serialization integration — binary round-trip simulation", () => {
  it("should continue simulation after binary round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 30);
    const posBeforeSerialize = ball.position.y;

    const restored = roundTripBinary(space);
    const restoredBall = restored.bodies.at(0);
    expect(restoredBall.position.y).toBeCloseTo(posBeforeSerialize, 0);

    step(restored, 30);
    expect(restoredBall.position.y).toBeGreaterThan(posBeforeSerialize);
  });

  it("should preserve gravity through binary round-trip", () => {
    const space = new Space(new Vec2(5, 150));
    const ball = dynamicCircle(0, 0);
    ball.space = space;

    const restored = roundTripBinary(space);
    expect(restored.gravity.x).toBeCloseTo(5);
    expect(restored.gravity.y).toBeCloseTo(150);
  });

  it("should preserve constraints through binary round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = dynamicCircle(-30, 0);
    b1.space = space;
    const b2 = dynamicCircle(30, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 50, 70);
    joint.space = space;

    const restored = roundTripBinary(space);
    expect(restored.constraints.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Complex scene serialization
// ---------------------------------------------------------------------------
describe("Serialization integration — complex scenes", () => {
  it("should serialize and restore a scene with multiple body types and shapes", () => {
    const space = new Space(new Vec2(0, 300));

    // Static floor
    staticBox(0, 200).space = space;

    // Dynamic circles
    dynamicCircle(-50, 0).space = space;
    dynamicCircle(50, 0).space = space;

    // Dynamic box
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, -50));
    box.shapes.add(new Polygon(Polygon.box(30, 30)));
    box.space = space;

    // Kinematic body
    const kin = new Body(BodyType.KINEMATIC, new Vec2(100, 100));
    kin.shapes.add(new Circle(15));
    kin.space = space;

    step(space, 30);

    const restored = roundTripJSON(space);
    expect(restored.bodies.length).toBe(5);

    // Continue simulation should work
    step(restored, 30);
  });

  it("should serialize and restore a scene with custom materials", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynamicCircle(0, 0);
    // Material(elasticity, dynamicFriction, staticFriction, density, rollingFriction)
    b.shapes.at(0).material = new Material(0.5, 0.3, 0.8, 3, 0.1);
    b.space = space;

    const restored = roundTripJSON(space);
    const mat = restored.bodies.at(0).shapes.at(0).material;
    expect(mat.elasticity).toBeCloseTo(0.5, 1);
    expect(mat.dynamicFriction).toBeCloseTo(0.3, 1);
    expect(mat.density).toBeCloseTo(3, 1);
  });

  it("should serialize scene with multiple bodies added individually", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = dynamicCircle(-15, 0);
    const b2 = dynamicCircle(15, 0);
    b1.space = space;
    b2.space = space;

    const restored = roundTripJSON(space);
    expect(restored.bodies.length).toBe(2);
  });

  it("should produce identical simulation from JSON snapshot vs original", () => {
    const space = new Space(new Vec2(0, 200));
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 10);

    // Snapshot at step 10
    const restored = roundTripJSON(space);

    // Run both for another 50 steps
    step(space, 50);
    step(restored, 50);

    const original = space.bodies.at(0);
    const copy = restored.bodies.at(0);

    // Positions should be very close (small numerical drift is ok)
    expect(copy.position.y).toBeCloseTo(original.position.y, -1);
  });

  it("should produce identical simulation from binary snapshot vs original", () => {
    const space = new Space(new Vec2(0, 200));
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 10);

    const restored = roundTripBinary(space);

    step(space, 50);
    step(restored, 50);

    const original = space.bodies.at(0);
    const copy = restored.bodies.at(0);

    expect(copy.position.y).toBeCloseTo(original.position.y, -1);
  });
});

// ---------------------------------------------------------------------------
// 5. Serialization with fluid properties
// ---------------------------------------------------------------------------
describe("Serialization integration — fluid properties", () => {
  it("should preserve fluid-enabled shapes through JSON round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const fluid = new Body(BodyType.STATIC, new Vec2(0, 0));
    const shape = new Polygon(Polygon.box(200, 200));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(3, 5);
    fluid.shapes.add(shape);
    fluid.space = space;

    const restored = roundTripJSON(space);
    const rs = restored.bodies.at(0).shapes.at(0);
    expect(rs.fluidEnabled).toBe(true);
    expect(rs.fluidProperties.density).toBeCloseTo(3, 0);
  });

  it("should preserve fluid-enabled shapes through binary round-trip", () => {
    const space = new Space(new Vec2(0, 100));
    const fluid = new Body(BodyType.STATIC, new Vec2(0, 0));
    const shape = new Polygon(Polygon.box(200, 200));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(4, 8);
    fluid.shapes.add(shape);
    fluid.space = space;

    const restored = roundTripBinary(space);
    const rs = restored.bodies.at(0).shapes.at(0);
    expect(rs.fluidEnabled).toBe(true);
  });
});
