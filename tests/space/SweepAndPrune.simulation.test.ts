/**
 * SweepAndPrune broadphase simulation tests.
 * Exercises ZPP_SweepPhase / ZPP_SweepData (native/space) code paths by
 * using Broadphase.SWEEP_AND_PRUNE via the Space constructor.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Broadphase } from "../../src/space/Broadphase";
import { AABB } from "../../src/geom/AABB";
import { Ray } from "../../src/geom/Ray";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { PivotJoint } from "../../src/constraint/PivotJoint";

// Convenience: create a space using SweepAndPrune broadphase
function sap(gy = 100): Space {
  return new Space(new Vec2(0, gy), Broadphase.SWEEP_AND_PRUNE);
}

function dynamicCircle(x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticBox(x: number, y: number, w = 300, h = 10): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// Basic physics with SweepAndPrune
// ---------------------------------------------------------------------------
describe("SweepAndPrune broadphase — basic physics", () => {
  it("should apply gravity correctly with SAP broadphase", () => {
    const space = sap();
    const b = dynamicCircle(0, 0);
    b.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(b.position.y).toBeGreaterThan(20);
  });

  it("should not move static bodies", () => {
    const space = sap();
    const s = staticBox(0, 100);
    s.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(s.position.y).toBeCloseTo(100);
  });

  it("should detect circle-floor collision with SAP", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);

    const floor = staticBox(0, 200);
    floor.space = space;

    const ball = dynamicCircle(0, 0, 15);
    ball.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(ball.position.y).toBeLessThan(200);
    expect(ball.position.y).toBeGreaterThan(100);
  });

  it("should detect polygon-polygon collision with SAP", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);

    const floor = staticBox(0, 200);
    floor.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(box.position.y).toBeLessThan(200);
    expect(box.position.y).toBeGreaterThan(100);
  });

  it("should detect circle-polygon collision with SAP", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);

    const floor = staticBox(0, 200);
    floor.space = space;

    const ball = dynamicCircle(0, 0, 12);
    ball.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(ball.position.y).toBeLessThan(200);
    expect(ball.position.y).toBeGreaterThan(100);
  });

  it("should report SAP broadphase type", () => {
    const space = sap();
    expect(space.broadphase).toBe(Broadphase.SWEEP_AND_PRUNE);
  });
});

// ---------------------------------------------------------------------------
// Multi-body scenarios
// ---------------------------------------------------------------------------
describe("SweepAndPrune broadphase — multi-body", () => {
  it("should handle 10 falling bodies", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);

    const floor = staticBox(0, 300);
    floor.space = space;

    for (let i = 0; i < 10; i++) {
      const b = dynamicCircle(i * 25 - 112, 0, 8);
      b.space = space;
    }

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(space.bodies.length).toBe(11);
  });

  it("should handle bodies stacking with SAP", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);

    const floor = staticBox(0, 300);
    floor.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Polygon(Polygon.box(20, 20)));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, -30));
    b2.shapes.add(new Polygon(Polygon.box(20, 20)));
    b2.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(b1.position.y).toBeLessThan(300);
    expect(b2.position.y).toBeLessThan(300);
  });

  it("should handle add/remove bodies during SAP simulation", () => {
    const space = sap();

    const b1 = dynamicCircle(0, 0);
    b1.space = space;
    space.step(1 / 60);
    expect(space.bodies.length).toBe(1);

    const b2 = dynamicCircle(50, 0);
    b2.space = space;
    space.step(1 / 60);
    expect(space.bodies.length).toBe(2);

    b1.space = null;
    space.step(1 / 60);
    expect(space.bodies.length).toBe(1);
  });

  it("should support clearing space with SAP", () => {
    const space = sap();

    for (let i = 0; i < 5; i++) {
      dynamicCircle(i * 20, 0).space = space;
    }
    space.step(1 / 60);
    space.clear();

    expect(space.bodies.length).toBe(0);
    expect(space.broadphase).toBe(Broadphase.SWEEP_AND_PRUNE);
  });

  it("should handle many bodies without crash in SAP", () => {
    const space = sap(0); // no gravity
    for (let i = 0; i < 20; i++) {
      dynamicCircle(i * 15, (i % 5) * 15).space = space;
    }
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(space.bodies.length).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// SAP spatial queries
// ---------------------------------------------------------------------------
describe("SweepAndPrune broadphase — spatial queries", () => {
  function setupSAP() {
    const space = new Space(new Vec2(0, 0), Broadphase.SWEEP_AND_PRUNE);
    const b1 = dynamicCircle(50, 50, 10);
    const b2 = dynamicCircle(150, 50, 10);
    b1.space = space;
    b2.space = space;
    space.step(1 / 60);
    return { space, b1, b2 };
  }

  it("should find shapes under point with SAP", () => {
    const { space } = setupSAP();
    const result = space.shapesUnderPoint(new Vec2(50, 50)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find no shapes at empty location with SAP", () => {
    const { space } = setupSAP();
    const result = space.shapesUnderPoint(new Vec2(500, 500)) as any;
    expect(result.length).toBe(0);
  });

  it("should find shapes in AABB with SAP", () => {
    const { space } = setupSAP();
    const aabb = new AABB(30, 30, 70, 70);
    const result = space.shapesInAABB(aabb) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should cast ray and hit body with SAP", () => {
    const space = new Space(new Vec2(0, 0), Broadphase.SWEEP_AND_PRUNE);
    const b = dynamicCircle(100, 0, 20);
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("should miss with SAP ray cast pointing away", () => {
    const space = new Space(new Vec2(0, 0), Broadphase.SWEEP_AND_PRUNE);
    const b = dynamicCircle(100, 0, 20);
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(-1, 0));
    const result = space.rayCast(ray);
    expect(result).toBeNull();
  });

  it("should find bodies in circle query with SAP", () => {
    const { space } = setupSAP();
    const result = space.bodiesInCircle(new Vec2(50, 50), 30) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should find all bodies in large AABB with SAP", () => {
    const { space } = setupSAP();
    const aabb = new AABB(-100, -100, 500, 500);
    const result = space.bodiesInAABB(aabb) as any;
    expect(result.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// SAP with constraints
// ---------------------------------------------------------------------------
describe("SweepAndPrune broadphase — constraints", () => {
  it("should enforce DistanceJoint with SAP", () => {
    const space = sap();

    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const ball = dynamicCircle(0, 50);
    ball.space = space;

    const joint = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 40, 60);
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    const dist = Math.sqrt(ball.position.x ** 2 + ball.position.y ** 2);
    expect(dist).toBeLessThan(70);
    expect(dist).toBeGreaterThan(30);
  });

  it("should enforce PivotJoint with SAP", () => {
    const space = sap();

    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const bob = dynamicCircle(50, 0);
    bob.space = space;

    const joint = new PivotJoint(anchor, bob, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    const dist = Math.sqrt(bob.position.x ** 2 + bob.position.y ** 2);
    expect(dist).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------
// SAP sleep behavior
// ---------------------------------------------------------------------------
describe("SweepAndPrune broadphase — sleep", () => {
  it("should allow bodies to sleep with SAP", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 100));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    for (let i = 0; i < 600; i++) space.step(1 / 60);

    // Body should have settled above floor
    expect(box.position.y).toBeLessThan(200);
    expect(Math.abs(box.velocity.y)).toBeLessThan(10);
  });

  it("should wake sleeping body after impulse in SAP", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);
    const floor = staticBox(0, 200);
    floor.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 150));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    for (let i = 0; i < 600; i++) space.step(1 / 60);

    box.applyImpulse(new Vec2(0, -1000));
    space.step(1 / 60);

    expect(box.velocity.y).toBeLessThan(0);
  });
});
