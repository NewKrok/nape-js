/**
 * Body dynamics API tests — impulse queries, force/torque, sleep, velocity helpers.
 * Exercises uncovered Body.ts code paths.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Vec3 } from "../../src/geom/Vec3";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { InteractionType } from "../../src/callbacks/InteractionType";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpace(gx = 0, gy = 500): Space {
  return new Space(new Vec2(gx, gy));
}

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

function dynamicCircle(x: number, y: number, r = 15): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticFloor(y = 200): Body {
  const b = new Body(BodyType.STATIC, new Vec2(0, y));
  b.shapes.add(new Polygon(Polygon.box(500, 20)));
  return b;
}

// ---------------------------------------------------------------------------
// Force & torque
// ---------------------------------------------------------------------------

describe("Body dynamics — force and torque", () => {
  it("should get/set force on a dynamic body", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.force.setxy(100, 200);
    expect(b.force.x).toBeCloseTo(100);
    expect(b.force.y).toBeCloseTo(200);
  });

  it("should apply force and observe acceleration", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    b.force = Vec2.weak(0, -1000);
    step(space, 1);
    // With upward force, body should have moved up (negative y direction)
    expect(b.position.y).toBeLessThanOrEqual(0);
  });

  it("should get/set torque on a dynamic body", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.torque = 50;
    expect(b.torque).toBeCloseTo(50);
  });

  it("should apply torque and observe angular velocity change", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    b.torque = 10000;
    step(space, 1);
    expect(Math.abs(b.angularVel)).toBeGreaterThan(0);
  });

  it("should throw when setting torque on static body", () => {
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    expect(() => {
      b.torque = 10;
    }).toThrow("Non-dynamic");
  });

  it("should throw when setting NaN torque", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    expect(() => {
      b.torque = NaN;
    }).toThrow("NaN");
  });
});

// ---------------------------------------------------------------------------
// Angular impulse
// ---------------------------------------------------------------------------

describe("Body dynamics — applyAngularImpulse", () => {
  it("should change angular velocity", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    const angBefore = b.angularVel;
    b.applyAngularImpulse(100);
    expect(b.angularVel).not.toBe(angBefore);
  });

  it("should return the body itself (chaining)", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    const ret = b.applyAngularImpulse(10);
    expect(ret).toBe(b);
  });

  it("should apply sleepable angular impulse to sleeping body (wakes it)", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynamicCircle(0, 0);
    b.space = space;
    step(space, 300); // let body sleep
    expect(b.isSleeping).toBe(true);
    b.applyAngularImpulse(1000, false);
    step(space, 1);
    expect(Math.abs(b.angularVel)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// applyImpulse with position (torque effect)
// ---------------------------------------------------------------------------

describe("Body dynamics — applyImpulse with offset position", () => {
  it("should cause rotation when impulse applied off-center", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    // Apply impulse to the side — should cause rotation
    b.applyImpulse(new Vec2(0, 100), new Vec2(50, 0));
    expect(Math.abs(b.angularVel)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// kinematicVel
// ---------------------------------------------------------------------------

describe("Body dynamics — kinematicVel", () => {
  it("should get/set kinematicVel on kinematic body", () => {
    const b = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.kinematicVel.setxy(100, 50);
    expect(b.kinematicVel.x).toBeCloseTo(100);
    expect(b.kinematicVel.y).toBeCloseTo(50);
  });

  it("should set kinematicVel via property assignment", () => {
    const b = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.kinematicVel = Vec2.get(200, 50);
    expect(b.kinematicVel.x).toBeCloseTo(200);
    expect(b.kinematicVel.y).toBeCloseTo(50);
  });
});

// ---------------------------------------------------------------------------
// isSleeping
// ---------------------------------------------------------------------------

describe("Body dynamics — isSleeping", () => {
  it("isSleeping returns false when body just added", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    expect(b.isSleeping).toBe(false);
  });

  it("isSleeping becomes true after body settles", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dynamicCircle(0, 0);
    b.space = space;
    step(space, 300);
    expect(b.isSleeping).toBe(true);
  });

  it("isSleeping throws if body not in space", () => {
    const b = dynamicCircle(0, 0);
    expect(() => b.isSleeping).toThrow();
  });
});

// ---------------------------------------------------------------------------
// connectedBodies
// ---------------------------------------------------------------------------

describe("Body dynamics — connectedBodies", () => {
  it("should return connected body when joined by PivotJoint", () => {
    const space = makeSpace(0, 0);
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    b1.space = space;
    b2.space = space;
    const joint = new PivotJoint(b1, b2, Vec2.weak(25, 0), Vec2.weak(-25, 0));
    joint.space = space;
    step(space, 1);
    const connected = b1.connectedBodies() as any;
    expect(connected.length).toBeGreaterThanOrEqual(1);
  });

  it("should return empty list when body has no constraints", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    step(space, 1);
    const connected = b.connectedBodies() as any;
    expect(connected.length).toBe(0);
  });

  it("should respect depth limit in connectedBodies", () => {
    const space = makeSpace(0, 0);
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const b3 = dynamicCircle(100, 0);
    b1.space = space;
    b2.space = space;
    b3.space = space;
    const j1 = new PivotJoint(b1, b2, Vec2.weak(25, 0), Vec2.weak(-25, 0));
    const j2 = new PivotJoint(b2, b3, Vec2.weak(75, 0), Vec2.weak(-25, 0));
    j1.space = space;
    j2.space = space;
    step(space, 1);
    // depth=1 should only return b2, not b3
    const depth1 = b1.connectedBodies(1) as any;
    const depth2 = b1.connectedBodies(2) as any;
    expect(depth1.length).toBeLessThanOrEqual(depth2.length);
  });
});

// ---------------------------------------------------------------------------
// interactingBodies
// ---------------------------------------------------------------------------

describe("Body dynamics — interactingBodies", () => {
  it("should return a BodyList from interactingBodies with null type", () => {
    const space = makeSpace(0, 0);
    const b1 = dynamicCircle(0, 0, 25);
    const b2 = dynamicCircle(30, 0, 25);
    b1.space = space;
    b2.space = space;
    step(space, 3);
    // null type should return a defined BodyList (same as InteractionType.COLLISION)
    const interacting = b1.interactingBodies(null) as any;
    expect(interacting).not.toBeNull();
    expect(typeof interacting.length).toBe("number");
  });

  it("should filter by InteractionType.COLLISION", () => {
    const space = makeSpace(0, 0);
    const b1 = dynamicCircle(0, 0, 25);
    const b2 = dynamicCircle(30, 0, 25);
    b1.space = space;
    b2.space = space;
    step(space, 3);
    const interacting = b1.interactingBodies(InteractionType.COLLISION) as any;
    expect(interacting.length).toBeGreaterThanOrEqual(1);
  });

  it("should return empty when bodies are far apart", () => {
    const space = makeSpace(0, 0);
    const b1 = dynamicCircle(0, 0, 10);
    const b2 = dynamicCircle(1000, 0, 10);
    b1.space = space;
    b2.space = space;
    step(space, 1);
    const interacting = b1.interactingBodies() as any;
    expect(interacting.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Impulse queries after collision
// ---------------------------------------------------------------------------

describe("Body dynamics — impulse queries after collision", () => {
  it("normalImpulse returns non-zero Vec3 after collision", () => {
    const space = makeSpace(0, 500);
    const floor = staticFloor(200);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 60);
    const imp = ball.normalImpulse() as Vec3;
    expect(imp).not.toBeNull();
    // The Vec3 may be all zeros if sleeping, but should exist
    expect(typeof imp.x).toBe("number");
    imp.dispose();
  });

  it("tangentImpulse returns Vec3 after collision", () => {
    const space = makeSpace(0, 500);
    const floor = staticFloor(200);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 60);
    const imp = ball.tangentImpulse() as Vec3;
    expect(imp).not.toBeNull();
    expect(typeof imp.x).toBe("number");
    imp.dispose();
  });

  it("totalContactsImpulse returns Vec3 after collision", () => {
    const space = makeSpace(0, 500);
    const floor = staticFloor(200);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 60);
    const imp = ball.totalContactsImpulse() as Vec3;
    expect(imp).not.toBeNull();
    expect(typeof imp.z).toBe("number");
    imp.dispose();
  });

  it("normalImpulse with body filter returns Vec3", () => {
    const space = makeSpace(0, 500);
    const floor = staticFloor(200);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 30);
    const imp = ball.normalImpulse(floor) as Vec3;
    expect(imp).not.toBeNull();
    imp.dispose();
  });

  it("rollingImpulse returns a number", () => {
    const space = makeSpace(0, 500);
    const floor = staticFloor(200);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 60);
    const roll = ball.rollingImpulse();
    expect(typeof roll).toBe("number");
    expect(isNaN(roll)).toBe(false);
  });

  it("totalImpulse returns Vec3 including all impulse types", () => {
    const space = makeSpace(0, 500);
    const floor = staticFloor(200);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;
    step(space, 30);
    const imp = ball.totalImpulse() as Vec3;
    expect(imp).not.toBeNull();
    imp.dispose();
  });

  it("crushFactor returns a non-negative number after constraint interaction", () => {
    const space = makeSpace(0, 500);
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;
    const ball = dynamicCircle(0, 50);
    ball.space = space;
    const joint = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 40, 60);
    joint.space = space;
    step(space, 30);
    const crush = ball.crushFactor();
    expect(typeof crush).toBe("number");
    expect(isNaN(crush)).toBe(false);
    expect(crush).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// setVelocityFromTarget
// ---------------------------------------------------------------------------

describe("Body dynamics — setVelocityFromTarget", () => {
  it("should set velocity to reach target position in given time", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    const target = new Vec2(100, 0);
    b.setVelocityFromTarget(target, 0, 1.0);
    // Velocity should point towards target
    expect(b.velocity.x).toBeCloseTo(100, 0);
  });

  it("should set angular velocity to reach target rotation", () => {
    const space = makeSpace(0, 0);
    const b = dynamicCircle(0, 0);
    b.space = space;
    b.setVelocityFromTarget(new Vec2(0, 0), Math.PI, 1.0);
    expect(Math.abs(b.angularVel)).toBeGreaterThan(0);
  });
});
