/**
 * Constraint body reassignment tests.
 * Exercises body1/body2 setters on AngleJoint, LineJoint, MotorJoint,
 * WeldJoint, PivotJoint, DistanceJoint.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";

function dynCircle(x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticBody(x = 0, y = 0): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(5));
  return b;
}

// ---------------------------------------------------------------------------
// AngleJoint body reassignment
// ---------------------------------------------------------------------------
describe("AngleJoint — body reassignment", () => {
  it("should expose body1 and body2 getters", () => {
    const b1 = dynCircle();
    const b2 = dynCircle(50);
    const joint = new AngleJoint(b1, b2, -Math.PI / 4, Math.PI / 4);

    // body1/body2 should be the same body (may return wrapper, check via position)
    expect((joint as any).body1.position.x).toBeCloseTo(b1.position.x);
    expect((joint as any).body2.position.x).toBeCloseTo(b2.position.x);
  });

  it("should allow setting body1 to a new body", () => {
    const b1 = dynCircle();
    const b2 = dynCircle(50);
    const b3 = dynCircle(100);
    const joint = new AngleJoint(b1, b2, -Math.PI / 4, Math.PI / 4);

    (joint as any).body1 = b3;
    expect((joint as any).body1.position.x).toBeCloseTo(100);
  });

  it("should allow setting body2 to a new body", () => {
    const b1 = dynCircle();
    const b2 = dynCircle(50);
    const b3 = dynCircle(200);
    const joint = new AngleJoint(b1, b2, -Math.PI / 4, Math.PI / 4);

    (joint as any).body2 = b3;
    expect((joint as any).body2.position.x).toBeCloseTo(200);
  });

  it("should allow setting body1 to null", () => {
    const b1 = dynCircle();
    const b2 = dynCircle(50);
    const joint = new AngleJoint(b1, b2, -Math.PI / 4, Math.PI / 4);

    (joint as any).body1 = null;
    expect((joint as any).body1).toBeNull();
  });

  it("AngleJoint should enforce rotation limits in simulation", () => {
    const space = new Space(new Vec2(0, 0));

    const anchor = staticBody(0, 0);
    anchor.space = space;
    const arm = dynCircle(50, 0);
    arm.space = space;

    const joint = new AngleJoint(anchor, arm, -Math.PI / 6, Math.PI / 6);
    joint.space = space;

    arm.angularVel = 10;
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Rotation should be constrained
    expect(Math.abs(arm.rotation)).toBeLessThan(Math.PI);
  });
});

// ---------------------------------------------------------------------------
// PivotJoint body reassignment
// ---------------------------------------------------------------------------
describe("PivotJoint — body reassignment", () => {
  it("should expose body1 and body2 via position check", () => {
    const b1 = staticBody(10, 0);
    const b2 = dynCircle(50, 0);
    const joint = new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));

    expect((joint as any).body1.position.x).toBeCloseTo(10);
    expect((joint as any).body2.position.x).toBeCloseTo(50);
  });

  it("should allow reassigning body2", () => {
    const b1 = staticBody();
    const b2 = dynCircle(50);
    const b3 = dynCircle(100);
    const joint = new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));

    (joint as any).body2 = b3;
    expect((joint as any).body2.position.x).toBeCloseTo(100);
  });

  it("should allow reassigning body1", () => {
    const b1 = staticBody();
    const b2 = dynCircle(50);
    const b3 = staticBody(200);
    const joint = new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));

    (joint as any).body1 = b3;
    expect((joint as any).body1.position.x).toBeCloseTo(200);
  });
});

// ---------------------------------------------------------------------------
// DistanceJoint body reassignment
// ---------------------------------------------------------------------------
describe("DistanceJoint — body reassignment", () => {
  it("should expose body1 and body2", () => {
    const b1 = staticBody(0, 0);
    const b2 = dynCircle(50, 0);
    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 40, 80);

    expect((joint as any).body1.position.x).toBeCloseTo(0);
    expect((joint as any).body2.position.x).toBeCloseTo(50);
  });

  it("should allow reassigning body2", () => {
    const b1 = staticBody();
    const b2 = dynCircle(50);
    const b3 = dynCircle(100);
    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 40, 80);

    (joint as any).body2 = b3;
    expect((joint as any).body2.position.x).toBeCloseTo(100);
  });
});

// ---------------------------------------------------------------------------
// LineJoint body reassignment
// ---------------------------------------------------------------------------
describe("LineJoint — body reassignment", () => {
  it("should expose body1 and body2", () => {
    const b1 = staticBody(0, 0);
    const b2 = dynCircle(0, 50);
    const joint = new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -50, 50);

    expect((joint as any).body1.position.y).toBeCloseTo(0);
    expect((joint as any).body2.position.y).toBeCloseTo(50);
  });

  it("should allow reassigning body1", () => {
    const b1 = staticBody(0, 0);
    const b2 = dynCircle(0, 50);
    const b3 = staticBody(100, 0);
    const joint = new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -50, 50);

    (joint as any).body1 = b3;
    expect((joint as any).body1.position.x).toBeCloseTo(100);
  });

  it("should allow reassigning body2", () => {
    const b1 = staticBody(0, 0);
    const b2 = dynCircle(0, 50);
    const b3 = dynCircle(50, 50);
    const joint = new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -50, 50);

    (joint as any).body2 = b3;
    expect((joint as any).body2.position.x).toBeCloseTo(50);
  });
});

// ---------------------------------------------------------------------------
// WeldJoint body reassignment
// ---------------------------------------------------------------------------
describe("WeldJoint — body reassignment", () => {
  it("should expose body1 and body2 as defined", () => {
    const b1 = staticBody();
    const b2 = dynCircle(50);
    const joint = new WeldJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));

    expect((joint as any).body1).toBeDefined();
    expect((joint as any).body2).toBeDefined();
  });

  it("should allow reassigning body2", () => {
    const b1 = staticBody();
    const b2 = dynCircle(50);
    const b3 = dynCircle(100);
    const joint = new WeldJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));

    (joint as any).body2 = b3;
    expect((joint as any).body2.position.x).toBeCloseTo(100);
  });

  it("WeldJoint should weld two bodies together", () => {
    const space = new Space(new Vec2(0, 500));

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Polygon(Polygon.box(20, 20)));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b2.shapes.add(new Polygon(Polygon.box(20, 20)));
    b2.space = space;

    const joint = new WeldJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    const initRelX = b1.position.x - b2.position.x;
    const initRelY = b1.position.y - b2.position.y;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Relative position should remain close
    const relX = b1.position.x - b2.position.x;
    const relY = b1.position.y - b2.position.y;
    expect(Math.abs(relX - initRelX)).toBeLessThan(20);
    expect(Math.abs(relY - initRelY)).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------
// MotorJoint body reassignment
// ---------------------------------------------------------------------------
describe("MotorJoint — body reassignment", () => {
  it("should expose body1 and body2 as defined", () => {
    const b1 = dynCircle();
    const b2 = dynCircle(50);
    const joint = new MotorJoint(b1, b2, 5);

    expect((joint as any).body1).toBeDefined();
    expect((joint as any).body2).toBeDefined();
  });

  it("should allow reassigning body1", () => {
    const b1 = dynCircle(0, 0);
    const b2 = dynCircle(50, 0);
    const b3 = dynCircle(200, 0);
    const joint = new MotorJoint(b1, b2, 5);

    (joint as any).body1 = b3;
    expect((joint as any).body1.position.x).toBeCloseTo(200);
  });

  it("should allow reassigning body2", () => {
    const b1 = dynCircle(0, 0);
    const b2 = dynCircle(50, 0);
    const b3 = dynCircle(300, 0);
    const joint = new MotorJoint(b1, b2, 5);

    (joint as any).body2 = b3;
    expect((joint as any).body2.position.x).toBeCloseTo(300);
  });
});
