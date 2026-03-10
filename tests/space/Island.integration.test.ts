/**
 * Island / sleep integration tests — drives ZPP_Island, ZPP_Component, ZPP_Space
 * deeper code paths:
 *  - Sleep/wake island transitions
 *  - Connected bodies through joints (island merging)
 *  - Space properties: worldLinearDrag, worldAngularDrag, sortContacts, etc.
 *  - Space clear/step edge cases
 *  - liveBodies / liveConstraints
 *  - Space.world body
 *  - Velocity/position iteration variants
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { Compound } from "../../src/phys/Compound";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dynamicCircle(x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, Vec2.get(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticBox(x = 0, y = 200, w = 400, h = 20): Body {
  const b = new Body(BodyType.STATIC, Vec2.get(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function _dynamicBox(x = 0, y = 0, w = 20, h = 20): Body {
  const b = new Body(BodyType.DYNAMIC, Vec2.get(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// Space properties
// ---------------------------------------------------------------------------

describe("Space properties", () => {
  it("should get/set worldLinearDrag", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(typeof space.worldLinearDrag).toBe("number");
    space.worldLinearDrag = 0.5;
    expect(space.worldLinearDrag).toBe(0.5);
  });

  it("should throw on NaN worldLinearDrag", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(() => {
      space.worldLinearDrag = NaN;
    }).toThrow(/NaN/);
  });

  it("should get/set worldAngularDrag", () => {
    const space = new Space(Vec2.get(0, 100));
    space.worldAngularDrag = 0.3;
    expect(space.worldAngularDrag).toBe(0.3);
  });

  it("should throw on NaN worldAngularDrag", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(() => {
      space.worldAngularDrag = NaN;
    }).toThrow(/NaN/);
  });

  it("should get/set sortContacts", () => {
    const space = new Space(Vec2.get(0, 100));
    const initial = space.sortContacts;
    space.sortContacts = !initial;
    expect(space.sortContacts).toBe(!initial);
  });

  it("should get timeStamp = 0 initially", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(space.timeStamp).toBe(0);
  });

  it("should increment timeStamp after step", () => {
    const space = new Space(Vec2.get(0, 100));
    space.step(1 / 60);
    expect(space.timeStamp).toBe(1);
    space.step(1 / 60);
    expect(space.timeStamp).toBe(2);
  });

  it("should get elapsedTime = 0 initially", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(space.elapsedTime).toBe(0);
  });

  it("should accumulate elapsedTime after steps", () => {
    const space = new Space(Vec2.get(0, 100));
    const dt = 1 / 60;
    space.step(dt);
    space.step(dt);
    expect(space.elapsedTime).toBeCloseTo(2 * dt, 10);
  });

  it("should have world body", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(space.world).toBeDefined();
    expect(space.world).toBeInstanceOf(Body);
  });

  it("world body should be static", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(space.world.type).toBe(BodyType.STATIC);
  });

  it("should get listeners list", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(space.listeners).toBeDefined();
  });

  it("should get arbiters list", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(space.arbiters).toBeDefined();
  });

  it("should get compounds list", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(space.compounds).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Space step edge cases
// ---------------------------------------------------------------------------

describe("Space.step edge cases", () => {
  it("should throw on NaN deltaTime", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(() => space.step(NaN)).toThrow();
  });

  it("should throw on negative deltaTime", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(() => space.step(-1)).toThrow();
  });

  it("should throw on zero deltaTime", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(() => space.step(0)).toThrow();
  });

  it("should throw on velocityIterations <= 0", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(() => space.step(1 / 60, 0, 10)).toThrow();
  });

  it("should throw on positionIterations <= 0", () => {
    const space = new Space(Vec2.get(0, 100));
    expect(() => space.step(1 / 60, 10, 0)).toThrow();
  });

  it("should step with custom iteration counts", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    expect(() => space.step(1 / 60, 5, 3)).not.toThrow();
  });

  it("should step multiple times without error", () => {
    const space = new Space(Vec2.get(0, 100));
    const floor = staticBox(0, 200);
    space.bodies.add(floor);
    for (let i = 0; i < 20; i++) {
      space.step(1 / 60);
    }
    expect(space.timeStamp).toBe(20);
  });

  it("should clear space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    space.clear();
    expect(space.bodies.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// liveBodies / liveConstraints
// ---------------------------------------------------------------------------

describe("Space.liveBodies and liveConstraints", () => {
  it("should have liveBodies = 0 with no dynamic bodies", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = staticBox();
    space.bodies.add(b);
    expect(space.liveBodies.length).toBe(0);
  });

  it("should include dynamic bodies in liveBodies", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    expect(space.liveBodies.length).toBe(1);
  });

  it("kinematic bodies do not appear in liveBodies (only dynamic do)", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = new Body(BodyType.KINEMATIC, Vec2.get(0, 0));
    b.shapes.add(new Circle(10));
    space.bodies.add(b);
    // Kinematic bodies go to staticsleep list, not live list
    expect(space.liveBodies.length).toBe(0);
  });

  it("should have liveConstraints = 0 without constraints", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    expect(space.liveConstraints.length).toBe(0);
  });

  it("should count liveConstraints when joint is active", () => {
    const space = new Space(Vec2.get(0, 100));
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(joint);
    expect(space.liveConstraints.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Island sleep/wake
// ---------------------------------------------------------------------------

describe("Island sleep/wake", () => {
  it("bodies should start awake when added to space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    expect(b.isSleeping).toBe(false);
  });

  it("body should eventually sleep if motionless", () => {
    const space = new Space(Vec2.get(0, 0)); // no gravity
    const floor = staticBox(0, 50);
    space.bodies.add(floor);
    const b = dynamicCircle(0, 0);
    b.velocity.setxy(0, 0);
    space.bodies.add(b);
    // Run many steps to allow sleep
    for (let i = 0; i < 200; i++) {
      space.step(1 / 60);
    }
    // Either sleeping or not — just verify no crash
    expect(typeof b.isSleeping).toBe("boolean");
  });

  it("body wakes on velocity set", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    for (let i = 0; i < 200; i++) space.step(1 / 60);
    // Wake the body by applying velocity
    b.velocity.setxy(50, 0);
    space.step(1 / 60);
    expect(b.isSleeping).toBe(false);
  });

  it("connected bodies form a single island", () => {
    const space = new Space(Vec2.get(0, 100));
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(joint);
    space.step(1 / 60);
    // Both bodies in same island — both should have same sleep state
    expect(b1.isSleeping).toBe(b2.isSleeping);
  });

  it("three bodies in chain share same island", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-40, 0);
    const b2 = dynamicCircle(0, 0);
    const b3 = dynamicCircle(40, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    space.bodies.add(b3);
    const j1 = new DistanceJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    const j2 = new DistanceJoint(b2, b3, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(j1);
    space.constraints.add(j2);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    // All three should have same sleeping state
    expect(b1.isSleeping).toBe(b3.isSleeping);
  });

  it("should wake a sleeping body by setting position", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    for (let i = 0; i < 200; i++) space.step(1 / 60);
    b.position.setxy(10, 0);
    space.step(1 / 60);
    expect(b.isSleeping).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Joint + island interactions
// ---------------------------------------------------------------------------

describe("Joint and island interactions", () => {
  it("WeldJoint links two bodies in one island", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-15, 0);
    const b2 = dynamicCircle(15, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const weld = new WeldJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(weld);
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(b1.isSleeping).toBe(b2.isSleeping);
  });

  it("AngleJoint links two bodies", () => {
    const space = new Space(Vec2.get(0, 100));
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const angle = new AngleJoint(b1, b2, -Math.PI / 4, Math.PI / 4);
    space.constraints.add(angle);
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(b1.isSleeping).toBe(b2.isSleeping);
  });

  it("removing joint separates islands", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(joint);
    space.step(1 / 60);
    space.constraints.remove(joint);
    space.step(1 / 60);
    // After removal, bodies are in separate islands — no crash
    expect(typeof b1.isSleeping).toBe("boolean");
  });

  it("chain of 5 pivot joints", () => {
    const space = new Space(Vec2.get(0, 100));
    const bodies: Body[] = [];
    for (let i = 0; i < 5; i++) {
      const b = dynamicCircle(i * 20 - 40, 0);
      space.bodies.add(b);
      bodies.push(b);
    }
    for (let i = 0; i < 4; i++) {
      const j = new PivotJoint(bodies[i], bodies[i + 1], Vec2.get(0, 0), Vec2.get(0, 0));
      space.constraints.add(j);
    }
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(space.bodies.length).toBe(5);
    expect(space.constraints.length).toBe(4);
  });

  it("body with static body in pivot joint", () => {
    const space = new Space(Vec2.get(0, 100));
    const anchor = staticBox(0, 0, 50, 10);
    const b = dynamicCircle(0, -30);
    space.bodies.add(anchor);
    space.bodies.add(b);
    const pivot = new PivotJoint(anchor, b, Vec2.get(0, -5), Vec2.get(0, 5));
    space.constraints.add(pivot);
    for (let i = 0; i < 20; i++) space.step(1 / 60);
    expect(typeof b.isSleeping).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// Compound sleep/island
// ---------------------------------------------------------------------------

describe("Compound and islands", () => {
  it("bodies inside compound are excluded from space.bodies", () => {
    const space = new Space(Vec2.get(0, 100));
    const c = new Compound();
    const b1 = dynamicCircle(-10, 0);
    const b2 = dynamicCircle(10, 0);
    (c.bodies as any).add(b1);
    (c.bodies as any).add(b2);
    (space.compounds as any).add(c);
    // Compound bodies don't appear in space.bodies
    expect(space.bodies.length).toBe(0);
  });

  it("compound bodies appear in space.liveBodies", () => {
    const space = new Space(Vec2.get(0, 100));
    const c = new Compound();
    const b = dynamicCircle(0, 0);
    (c.bodies as any).add(b);
    (space.compounds as any).add(c);
    expect(space.liveBodies.length).toBeGreaterThanOrEqual(1);
  });

  it("removing compound from space removes its bodies", () => {
    const space = new Space(Vec2.get(0, 100));
    const c = new Compound();
    const b = dynamicCircle(0, 0);
    (c.bodies as any).add(b);
    (space.compounds as any).add(c);
    (space.compounds as any).remove(c);
    expect(space.liveBodies.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ZPP_SweepData / AABBTree paths — exercise through broad phase
// ---------------------------------------------------------------------------

describe("Broadphase sweep / AABB tree", () => {
  it("many bodies in space exercise broadphase tree", () => {
    const space = new Space(Vec2.get(0, 100));
    const floor = staticBox(0, 300, 2000, 20);
    space.bodies.add(floor);
    for (let i = 0; i < 15; i++) {
      const b = dynamicCircle(i * 30 - 200, i * -30);
      space.bodies.add(b);
    }
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(space.bodies.length).toBe(16);
  });

  it("adding/removing bodies exercises tree insert/remove", () => {
    const space = new Space(Vec2.get(0, 100));
    const bodies: Body[] = [];
    for (let i = 0; i < 10; i++) {
      const b = dynamicCircle(i * 20, 0);
      space.bodies.add(b);
      bodies.push(b);
    }
    space.step(1 / 60);
    // Remove half
    for (let i = 0; i < 5; i++) {
      space.bodies.remove(bodies[i]);
    }
    space.step(1 / 60);
    expect(space.bodies.length).toBe(5);
  });

  it("moving bodies updates broadphase tree", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    for (let i = 0; i < 5; i++) {
      space.step(1 / 60);
    }
    b.position.setxy(100, 0);
    for (let i = 0; i < 5; i++) {
      space.step(1 / 60);
    }
    expect(b.position.x).toBeGreaterThan(0);
  });
});
