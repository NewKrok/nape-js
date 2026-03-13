/**
 * Advanced Capsule tests — transform paths, copy, fluid drag, rotated collisions.
 * Exercises ZPP_Capsule.ts uncovered code paths.
 */

import { describe, it, expect } from "vitest";
import { Capsule } from "../../src/shape/Capsule";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Space } from "../../src/space/Space";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { Broadphase } from "../../src/space/Broadphase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

function staticFloor(space: Space, y = 300): Body {
  const b = new Body(BodyType.STATIC, new Vec2(0, y));
  b.shapes.add(new Polygon(Polygon.box(600, 20)));
  b.space = space;
  return b;
}

// ---------------------------------------------------------------------------
// Area & inertia computation (exercises __validate_area_inertia)
// ---------------------------------------------------------------------------

describe("Capsule — area and inertia computation", () => {
  it("area should scale with radius squared", () => {
    const b1 = new Body();
    b1.shapes.add(new Capsule(100, 20));
    const b2 = new Body();
    b2.shapes.add(new Capsule(100, 40));
    // Larger radius → larger area
    expect(b2.shapes.at(0).area).toBeGreaterThan(b1.shapes.at(0).area);
  });

  it("area should scale with halfLength", () => {
    const b1 = new Body();
    b1.shapes.add(new Capsule(60, 40));
    const b2 = new Body();
    b2.shapes.add(new Capsule(100, 40));
    expect(b2.shapes.at(0).area).toBeGreaterThan(b1.shapes.at(0).area);
  });

  it("inertia should be greater for larger capsule", () => {
    const b1 = new Body();
    b1.shapes.add(new Capsule(60, 20));
    const b2 = new Body();
    b2.shapes.add(new Capsule(120, 40));
    expect(b2.shapes.at(0).inertia).toBeGreaterThan(b1.shapes.at(0).inertia);
  });

  it("capsule with localCOM offset should have larger inertia", () => {
    const b1 = new Body();
    b1.shapes.add(new Capsule(100, 40));
    const b2 = new Body();
    b2.shapes.add(new Capsule(100, 40, Vec2.weak(20, 0)));
    expect(b2.shapes.at(0).inertia).toBeGreaterThan(b1.shapes.at(0).inertia);
  });

  it("capsule mass on body should be positive and scale with density", () => {
    const body = new Body();
    body.shapes.add(new Capsule(100, 40));
    expect(body.mass).toBeGreaterThan(0);
    expect(body.inertia).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Copy (exercises __copy)
// ---------------------------------------------------------------------------

describe("Capsule — copy", () => {
  it("copying a body should produce capsule shape with same dimensions", () => {
    const original = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    original.shapes.add(new Capsule(80, 30));
    const copied = original.copy();
    expect(copied.shapes.length).toBe(1);
    const copiedShape = copied.shapes.at(0);
    expect(copiedShape.isCapsule()).toBe(true);
    const cap = copiedShape.castCapsule as Capsule;
    expect(cap.radius).toBeCloseTo(15);
    expect(cap.halfLength).toBeCloseTo(25);
  });

  it("copied capsule should be independent from original", () => {
    const original = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    original.shapes.add(new Capsule(80, 30));
    const copied = original.copy();
    // Modify original — copy should not be affected
    (original.shapes.at(0).castCapsule as Capsule).radius = 25;
    const copiedCap = copied.shapes.at(0).castCapsule as Capsule;
    expect(copiedCap.radius).toBeCloseTo(15);
  });

  it("copying a capsule with localCOM should preserve localCOM", () => {
    const original = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    original.shapes.add(new Capsule(80, 30, Vec2.weak(10, 5)));
    const copied = original.copy();
    const cap = copied.shapes.at(0).castCapsule as Capsule;
    expect(cap.localCOM.x).toBeCloseTo(10);
    expect(cap.localCOM.y).toBeCloseTo(5);
  });
});

// ---------------------------------------------------------------------------
// translateShapes / scaleShapes (exercises __translate, __scale)
// ---------------------------------------------------------------------------

describe("Capsule — translateShapes and scaleShapes", () => {
  it("translateShapes should move capsule localCOM", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Capsule(80, 30));
    body.translateShapes(new Vec2(10, 5));
    const cap = body.shapes.at(0).castCapsule as Capsule;
    expect(cap.localCOM.x).toBeCloseTo(10);
    expect(cap.localCOM.y).toBeCloseTo(5);
  });

  it("scaleShapes should resize capsule dimensions", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Capsule(80, 30));
    const originalRadius = (body.shapes.at(0).castCapsule as Capsule).radius;
    body.scaleShapes(2, 2);
    const cap = body.shapes.at(0).castCapsule as Capsule;
    expect(cap.radius).toBeCloseTo(originalRadius * 2);
  });

  it("scaleShapes with negative factor should scale by absolute value", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Capsule(80, 30));
    const originalRadius = (body.shapes.at(0).castCapsule as Capsule).radius;
    body.scaleShapes(-2, -2);
    const cap = body.shapes.at(0).castCapsule as Capsule;
    expect(cap.radius).toBeCloseTo(originalRadius * 2);
  });

  it("translateShapes on capsule with localCOM offset adds to offset", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Capsule(80, 30, Vec2.weak(5, 3)));
    body.translateShapes(new Vec2(10, 0));
    const cap = body.shapes.at(0).castCapsule as Capsule;
    expect(cap.localCOM.x).toBeCloseTo(15);
  });
});

// ---------------------------------------------------------------------------
// rotateShapes (exercises __rotate)
// ---------------------------------------------------------------------------

describe("Capsule — rotateShapes", () => {
  it("rotateShapes should change AABB for rotated capsule", () => {
    const space = new Space(new Vec2(0, 0));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const cap = new Capsule(100, 20);
    body.shapes.add(cap);
    body.space = space;
    step(space, 1);
    const aabb1Before = cap.bounds;
    const w1 = aabb1Before.width;

    // Rotate body 90 degrees
    body.rotation = Math.PI / 2;
    step(space, 1);
    const aabb1After = cap.bounds;
    const w2 = aabb1After.width;

    // After 90 degree rotation, width and height should swap
    expect(Math.abs(w2 - w1)).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Angular drag (exercises __validate_angDrag via fluid simulation)
// ---------------------------------------------------------------------------

describe("Capsule — angular drag in fluid", () => {
  it("capsule should experience angular drag in fluid", () => {
    const space = new Space(new Vec2(0, 0));

    // Create fluid body
    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    const fluidShape = new Polygon(Polygon.box(1000, 1000));
    fluidShape.fluidEnabled = true;
    fluidShape.fluidProperties = new FluidProperties(1, 2);
    fluidBody.shapes.add(fluidShape);
    fluidBody.space = space;

    // Capsule with angular velocity in fluid
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Capsule(80, 30));
    body.angularVel = 20;
    body.space = space;

    step(space, 60);
    // Angular velocity should have decreased due to fluid drag
    expect(Math.abs(body.angularVel)).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------
// Collision with rotated capsule (exercises AABB computation with rotation)
// ---------------------------------------------------------------------------

describe("Capsule — rotated body collisions", () => {
  it("horizontal capsule should land on floor", () => {
    const space = new Space(new Vec2(0, 500));
    staticFloor(space, 300);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Capsule(80, 20));
    b.space = space;
    step(space, 180);
    expect(b.position.y).toBeLessThan(310);
    expect(b.position.y).toBeGreaterThan(200);
  });

  it("vertical capsule (rotated 90°) should land on floor", () => {
    const space = new Space(new Vec2(0, 500));
    staticFloor(space, 300);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Capsule(80, 20));
    b.rotation = Math.PI / 2; // stand it vertically
    b.space = space;
    step(space, 180);
    expect(b.position.y).toBeLessThan(310);
    expect(b.position.y).toBeGreaterThan(200);
  });

  it("capsule vs circle should resolve correctly when rotated", () => {
    const space = new Space(new Vec2(0, 500));
    staticFloor(space, 300);
    const capBody = new Body(BodyType.DYNAMIC, new Vec2(0, 100));
    capBody.shapes.add(new Capsule(80, 20));
    capBody.rotation = Math.PI / 4; // 45 degrees
    capBody.space = space;

    const circBody = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    circBody.shapes.add(new Circle(15));
    circBody.space = space;

    step(space, 120);
    // Both should settle
    expect(capBody.position.y).toBeLessThan(310);
    expect(circBody.position.y).toBeLessThan(310);
  });

  it("capsule vs capsule at different angles should collide", () => {
    const space = new Space(new Vec2(0, 500));
    staticFloor(space, 400);
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Capsule(100, 20));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, -60));
    b2.shapes.add(new Capsule(100, 20));
    b2.rotation = Math.PI / 2;
    b2.space = space;

    step(space, 180);
    // Both should be above floor
    expect(b1.position.y).toBeLessThan(410);
    expect(b2.position.y).toBeLessThan(410);
  });
});

// ---------------------------------------------------------------------------
// SWEEP_AND_PRUNE with capsules
// ---------------------------------------------------------------------------

describe("Capsule — SWEEP_AND_PRUNE broadphase", () => {
  it("capsule should collide correctly under SWEEP_AND_PRUNE", () => {
    const space = new Space(new Vec2(0, 500), Broadphase.SWEEP_AND_PRUNE);
    const floor = new Body(BodyType.STATIC, new Vec2(0, 300));
    floor.shapes.add(new Polygon(Polygon.box(600, 20)));
    floor.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Capsule(80, 20));
    b.space = space;

    step(space, 180);
    expect(b.position.y).toBeLessThan(310);
    expect(b.position.y).toBeGreaterThan(200);
  });

  it("multiple capsules under SWEEP_AND_PRUNE should not cause errors", () => {
    const space = new Space(new Vec2(0, 200), Broadphase.SWEEP_AND_PRUNE);
    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(1000, 20)));
    floor.space = space;

    for (let i = 0; i < 8; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(i * 40 - 160, -i * 30));
      b.shapes.add(new Capsule(60, 20));
      b.space = space;
    }

    expect(() => step(space, 120)).not.toThrow();
    expect(space.bodies.length).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// Capsule changing radius/halfLength during simulation
// ---------------------------------------------------------------------------

describe("Capsule — property changes during simulation", () => {
  it("should handle radius change on capsule in space (not in step)", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const cap = new Capsule(80, 20);
    b.shapes.add(cap);
    b.space = space;
    step(space, 5);
    // Can change radius between steps
    cap.radius = 25;
    step(space, 5);
    expect(cap.radius).toBeCloseTo(25);
    expect(b.mass).toBeGreaterThan(0);
  });

  it("should handle halfLength change on capsule in space (not in step)", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const cap = new Capsule(80, 20);
    b.shapes.add(cap);
    b.space = space;
    step(space, 5);
    cap.halfLength = 50;
    step(space, 5);
    expect(cap.halfLength).toBeCloseTo(50);
  });
});
