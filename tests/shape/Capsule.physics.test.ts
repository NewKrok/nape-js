/**
 * Capsule shape physics integration tests.
 * Exercises Capsule in real simulation — collision, rolling, compound bodies.
 * Covers ZPP_Capsule (native/shape) paths not hit by unit tests.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Capsule } from "../../src/shape/Capsule";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { AABB } from "../../src/geom/AABB";

function staticFloor(y = 200): Body {
  const b = new Body(BodyType.STATIC, new Vec2(0, y));
  b.shapes.add(new Polygon(Polygon.box(400, 10)));
  return b;
}

function dynCapsule(x = 0, y = 0, w = 30, h = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Capsule(w, h));
  return b;
}

// ---------------------------------------------------------------------------
// Capsule falling and landing
// ---------------------------------------------------------------------------
describe("Capsule physics — falling", () => {
  it("should fall under gravity", () => {
    const space = new Space(new Vec2(0, 500));
    const b = dynCapsule();
    b.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(b.position.y).toBeGreaterThan(0);
  });

  it("should land on static floor", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const cap = dynCapsule(0, 0, 40, 15);
    cap.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(cap.position.y).toBeLessThan(200);
    expect(cap.position.y).toBeGreaterThan(100);
  });

  it("vertical capsule (rotated 90°) should land on floor", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Capsule(30, 10));
    b.rotation = Math.PI / 2; // stand it vertically
    b.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(b.position.y).toBeLessThan(200);
    expect(b.position.y).toBeGreaterThan(100);
  });

  it("capsule with initial rotation should settle", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const cap = dynCapsule(0, 0, 40, 12);
    cap.rotation = Math.PI / 6;
    cap.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(cap.position.y).toBeLessThan(200);
    expect(cap.position.y).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------------------
// Capsule collision interactions
// ---------------------------------------------------------------------------
describe("Capsule physics — collisions", () => {
  it("capsule-circle collision should resolve correctly", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const cap = dynCapsule(0, 0, 40, 15);
    cap.space = space;

    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, -50));
    ball.shapes.add(new Circle(10));
    ball.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    // Both should have settled above the floor
    expect(cap.position.y).toBeLessThan(220);
    expect(ball.position.y).toBeLessThan(220);
  });

  it("capsule-polygon collision should resolve", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const cap = dynCapsule(0, 50, 30, 10);
    cap.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(5, 0));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    expect(cap.position.y).toBeLessThan(220);
    expect(box.position.y).toBeLessThan(220);
  });

  it("capsule-capsule collision should resolve", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const cap1 = dynCapsule(-20, 0, 30, 10);
    cap1.space = space;

    const cap2 = dynCapsule(20, -60, 30, 10);
    cap2.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    expect(cap1.position.y).toBeLessThan(220);
    expect(cap2.position.y).toBeLessThan(220);
  });

  it("rolling capsule should travel horizontally", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(100);
    floor.space = space;

    const cap = dynCapsule(0, 70, 40, 10);
    cap.velocity = new Vec2(100, 0);
    cap.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    // Should have moved in x direction
    expect(Math.abs(cap.position.x)).toBeGreaterThan(5);
  });
});

// ---------------------------------------------------------------------------
// Capsule with constraints
// ---------------------------------------------------------------------------
describe("Capsule physics — constraints", () => {
  it("capsule as pendulum bob", () => {
    const space = new Space(new Vec2(0, 200));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const cap = dynCapsule(50, 0, 30, 10);
    cap.space = space;

    const joint = new PivotJoint(anchor, cap, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    const dist = Math.sqrt(cap.position.x ** 2 + cap.position.y ** 2);
    expect(dist).toBeLessThan(15);
  });

  it("capsule on a rope (DistanceJoint)", () => {
    const space = new Space(new Vec2(0, 200));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const cap = dynCapsule(0, 60, 30, 10);
    cap.space = space;

    const joint = new DistanceJoint(anchor, cap, new Vec2(0, 0), new Vec2(0, 0), 40, 80);
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    const dist = Math.sqrt(cap.position.x ** 2 + cap.position.y ** 2);
    expect(dist).toBeLessThan(90);
    expect(dist).toBeGreaterThan(30);
  });
});

// ---------------------------------------------------------------------------
// Capsule in multi-shape body
// ---------------------------------------------------------------------------
describe("Capsule physics — multi-shape body", () => {
  it("body with capsule + circle should fall", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const compound = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    compound.shapes.add(new Capsule(30, 8));
    compound.shapes.add(new Circle(10));
    compound.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(compound.position.y).toBeLessThan(200);
    expect(compound.position.y).toBeGreaterThan(80);
  });

  it("body with capsule + polygon should fall", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor(200);
    floor.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Capsule(30, 8));
    b.shapes.add(new Polygon(Polygon.box(10, 10)));
    b.space = space;

    for (let i = 0; i < 180; i++) space.step(1 / 60);

    expect(b.position.y).toBeLessThan(220);
    expect(b.position.y).toBeGreaterThan(80);
  });
});

// ---------------------------------------------------------------------------
// Capsule spatial queries
// ---------------------------------------------------------------------------
describe("Capsule physics — spatial queries", () => {
  it("shapesInAABB should find capsule", () => {
    const space = new Space();
    const b = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    b.shapes.add(new Capsule(30, 10));
    b.space = space;
    space.step(1 / 60);

    const aabb = new AABB(30, 30, 70, 70);
    const result = space.shapesInAABB(aabb) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("bodiesInAABB should find body with capsule shape", () => {
    const space = new Space();
    const b = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    b.shapes.add(new Capsule(30, 10));
    b.space = space;
    space.step(1 / 60);

    const aabb = new AABB(30, 30, 70, 70);
    const result = space.bodiesInAABB(aabb) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("bodiesInCircle should find capsule body", () => {
    const space = new Space();
    const b = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    b.shapes.add(new Capsule(30, 10));
    b.space = space;
    space.step(1 / 60);

    const result = space.bodiesInCircle(new Vec2(50, 50), 50) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
