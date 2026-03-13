/**
 * Integration tests specifically for the SWEEP_AND_PRUNE broadphase.
 * Exercises ZPP_SweepPhase.ts code paths.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { Broadphase } from "../../src/space/Broadphase";
import { Ray } from "../../src/geom/Ray";
import { AABB } from "../../src/geom/AABB";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { Compound } from "../../src/phys/Compound";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sap(gravity: Vec2 = new Vec2(0, 0)): Space {
  return new Space(gravity, Broadphase.SWEEP_AND_PRUNE);
}

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

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

function staticBox(x: number, y: number, w = 500, h = 20): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SWEEP_AND_PRUNE broadphase — basic setup", () => {
  it("space should use SWEEP_AND_PRUNE when constructed with it", () => {
    const space = sap();
    expect(space.broadphase).toBe(Broadphase.SWEEP_AND_PRUNE);
  });

  it("should step empty space without errors", () => {
    const space = sap();
    expect(() => step(space, 5)).not.toThrow();
    expect(space.timeStamp).toBe(5);
  });

  it("should add a body and step without errors", () => {
    const space = sap(new Vec2(0, 100));
    const b = dynamicCircle(0, 0);
    b.space = space;
    expect(() => step(space, 10)).not.toThrow();
    expect(b.position.y).toBeGreaterThan(0);
  });

  it("should apply gravity under SWEEP_AND_PRUNE", () => {
    const space = sap(new Vec2(0, 500));
    const b = dynamicCircle(0, 0);
    b.space = space;
    step(space, 60);
    expect(b.position.y).toBeGreaterThan(50);
  });

  it("static body should not move under SWEEP_AND_PRUNE gravity", () => {
    const space = sap(new Vec2(0, 1000));
    const b = staticBox(0, 100);
    b.space = space;
    step(space, 60);
    expect(b.position.y).toBeCloseTo(100, 1);
  });
});

describe("SWEEP_AND_PRUNE broadphase — collision detection", () => {
  it("should resolve circle-polygon collision", () => {
    const space = sap(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 15);
    ball.space = space;
    step(space, 180);
    expect(ball.position.y).toBeLessThan(200);
    expect(ball.position.y).toBeGreaterThan(100);
  });

  it("should resolve polygon-polygon collision", () => {
    const space = sap(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;
    const box = dynamicBox(0, 0);
    box.space = space;
    step(space, 180);
    expect(box.position.y).toBeLessThan(200);
    expect(box.position.y).toBeGreaterThan(100);
  });

  it("should resolve circle-circle collision", () => {
    const space = sap(new Vec2(0, 0));
    const b1 = dynamicCircle(0, 0, 20);
    const b2 = dynamicCircle(25, 0, 20);
    b1.space = space;
    b2.space = space;
    step(space, 5);
    // After collision resolution, bodies should be separated
    const dx = b2.position.x - b1.position.x;
    const dy = b2.position.y - b1.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(30);
  });

  it("should handle multiple bodies colliding simultaneously", () => {
    const space = sap(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;
    for (let i = 0; i < 5; i++) {
      const b = dynamicCircle(i * 30 - 60, 0, 10);
      b.space = space;
    }
    step(space, 180);
    expect(space.bodies.length).toBe(6); // 5 circles + floor
  });

  it("should detect capsule-floor collision under SWEEP_AND_PRUNE", () => {
    const space = sap(new Vec2(0, 500));
    const floor = staticBox(0, 200);
    floor.space = space;
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Capsule(40, 20));
    b.space = space;
    step(space, 180);
    expect(b.position.y).toBeLessThan(200);
    expect(b.position.y).toBeGreaterThan(100);
  });
});

describe("SWEEP_AND_PRUNE broadphase — spatial queries", () => {
  it("should find bodies via AABB query", () => {
    const space = sap();
    const b = dynamicCircle(50, 50, 10);
    b.space = space;
    step(space, 1);
    const result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find bodies via circle query", () => {
    const space = sap();
    const b = dynamicCircle(100, 100, 10);
    b.space = space;
    step(space, 1);
    const result = space.bodiesInCircle(new Vec2(100, 100), 20) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find body under point", () => {
    const space = sap();
    const b = dynamicCircle(50, 50, 15);
    b.space = space;
    step(space, 1);
    const result = space.bodiesUnderPoint(new Vec2(50, 50)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should return empty for AABB query in empty region", () => {
    const space = sap();
    const b = dynamicCircle(0, 0, 10);
    b.space = space;
    step(space, 1);
    const result = space.bodiesInAABB(new AABB(1000, 1000, 10, 10)) as any;
    expect(result.length).toBe(0);
  });

  it("should find all bodies via large AABB query", () => {
    const space = sap();
    for (let i = 0; i < 5; i++) {
      dynamicCircle(i * 50, 0, 10).space = space;
    }
    step(space, 1);
    const result = space.bodiesInAABB(new AABB(-50, -50, 400, 100)) as any;
    expect(result.length).toBe(5);
  });

  it("should raycast under SWEEP_AND_PRUNE", () => {
    const space = sap();
    const b = dynamicCircle(100, 0, 15);
    b.space = space;
    step(space, 1);
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("should rayMultiCast under SWEEP_AND_PRUNE", () => {
    const space = sap();
    dynamicCircle(100, 0, 15).space = space;
    dynamicCircle(200, 0, 15).space = space;
    step(space, 1);
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const results = space.rayMultiCast(ray) as any;
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

describe("SWEEP_AND_PRUNE broadphase — body lifecycle", () => {
  it("should remove body from broadphase when space is set to null", () => {
    const space = sap();
    const b = dynamicCircle(50, 50, 10);
    b.space = space;
    step(space, 1);
    let result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
    b.space = null;
    step(space, 1);
    result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBe(0);
  });

  it("should update broadphase after body teleports", () => {
    const space = sap();
    const b = dynamicCircle(50, 50, 10);
    b.space = space;
    step(space, 1);
    b.position.setxy(500, 500);
    step(space, 1);
    const oldRegion = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(oldRegion.length).toBe(0);
    const newRegion = space.bodiesInAABB(new AABB(480, 480, 40, 40)) as any;
    expect(newRegion.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle clear() under SWEEP_AND_PRUNE", () => {
    const space = sap(new Vec2(0, 100));
    for (let i = 0; i < 5; i++) {
      dynamicCircle(i * 30, 0).space = space;
    }
    step(space, 10);
    space.clear();
    expect(space.bodies.length).toBe(0);
    // Should still work after clear
    dynamicCircle(0, 0).space = space;
    step(space, 5);
    expect(space.bodies.length).toBe(1);
  });

  it("should handle rapid add/remove cycles", () => {
    const space = sap();
    for (let cycle = 0; cycle < 5; cycle++) {
      const bodies: Body[] = [];
      for (let i = 0; i < 10; i++) {
        const b = dynamicCircle(i * 20, 0);
        b.space = space;
        bodies.push(b);
      }
      step(space, 2);
      for (const b of bodies) b.space = null;
      step(space, 1);
    }
    expect(space.bodies.length).toBe(0);
  });
});

describe("SWEEP_AND_PRUNE broadphase — constraints", () => {
  it("should simulate DistanceJoint under SWEEP_AND_PRUNE", () => {
    const space = sap(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;
    const ball = dynamicCircle(0, 50);
    ball.space = space;
    const joint = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 40, 60);
    joint.space = space;
    step(space, 120);
    const dist = Math.sqrt(ball.position.x ** 2 + ball.position.y ** 2);
    expect(dist).toBeLessThan(70);
    expect(dist).toBeGreaterThan(30);
  });

  it("should simulate PivotJoint under SWEEP_AND_PRUNE", () => {
    const space = sap(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;
    const bob = dynamicCircle(50, 0);
    bob.space = space;
    const joint = new PivotJoint(anchor, bob, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;
    step(space, 120);
    // Pivot keeps bob's origin near anchor
    const dist = Math.sqrt(bob.position.x ** 2 + bob.position.y ** 2);
    expect(dist).toBeLessThan(20);
  });
});

describe("SWEEP_AND_PRUNE broadphase — compound bodies", () => {
  it("should handle compound bodies under SWEEP_AND_PRUNE", () => {
    const space = sap(new Vec2(0, 100));
    const compound = new Compound();
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(30, 0);
    compound.bodies.add(b1);
    compound.bodies.add(b2);
    compound.space = space;
    step(space, 30);
    expect((space.compounds as any).length).toBe(1);
  });

  it("should find compound bodies in spatial queries", () => {
    const space = sap();
    const compound = new Compound();
    const b1 = dynamicCircle(10, 10, 10);
    const b2 = dynamicCircle(60, 10, 10);
    compound.bodies.add(b1);
    compound.bodies.add(b2);
    compound.space = space;
    step(space, 1);
    const result = space.bodiesInCircle(new Vec2(10, 10), 20) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe("SWEEP_AND_PRUNE broadphase — stress tests", () => {
  it("should handle 50 simultaneous bodies without errors", () => {
    const space = sap(new Vec2(0, 100));
    const floor = staticBox(0, 300, 2000, 20);
    floor.space = space;
    for (let i = 0; i < 50; i++) {
      dynamicCircle(i * 10 - 250, -i * 5, 5).space = space;
    }
    expect(() => step(space, 60)).not.toThrow();
    expect(space.bodies.length).toBe(51);
  });

  it("should handle bodies spread along X axis (sweep-friendly pattern)", () => {
    const space = sap();
    for (let i = 0; i < 20; i++) {
      dynamicCircle(i * 40 - 400, 0, 5).space = space;
    }
    step(space, 1);
    const result = space.bodiesInAABB(new AABB(-450, -20, 900, 40)) as any;
    expect(result.length).toBe(20);
  });
});
