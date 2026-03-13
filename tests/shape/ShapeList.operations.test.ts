/**
 * ShapeList operations tests.
 * Exercises shapes.remove(), shapes.has(), shapes.clear(), shapes iteration,
 * and shape.body property setter.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";

// ---------------------------------------------------------------------------
// ShapeList.has()
// ---------------------------------------------------------------------------
describe("ShapeList — has()", () => {
  it("should return true for a shape that was added", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new Circle(10);
    b.shapes.add(c);

    expect((b.shapes as any).has(c)).toBe(true);
  });

  it("should return false for a shape not in the list", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c1 = new Circle(10);
    const c2 = new Circle(5);
    b.shapes.add(c1);

    expect((b.shapes as any).has(c2)).toBe(false);
  });

  it("should return false after shape is removed", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new Circle(10);
    b.shapes.add(c);
    (b.shapes as any).remove(c);

    expect((b.shapes as any).has(c)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ShapeList.remove()
// ---------------------------------------------------------------------------
describe("ShapeList — remove()", () => {
  it("should remove shape from body", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new Circle(10);
    b.shapes.add(c);

    (b.shapes as any).remove(c);

    expect(b.shapes.length).toBe(0);
  });

  it("should only remove the specified shape", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c1 = new Circle(10);
    const c2 = new Circle(5);
    b.shapes.add(c1);
    b.shapes.add(c2);

    (b.shapes as any).remove(c1);

    expect(b.shapes.length).toBe(1);
    expect((b.shapes as any).has(c2)).toBe(true);
  });

  it("should decrement length after remove", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    for (let i = 0; i < 3; i++) b.shapes.add(new Circle(5 + i));

    expect(b.shapes.length).toBe(3);
    (b.shapes as any).remove((b.shapes as any).at(0));
    expect(b.shapes.length).toBe(2);
  });

  it("removed shape should have no body", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new Circle(10);
    b.shapes.add(c);
    (b.shapes as any).remove(c);

    expect(c.body).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// ShapeList.clear()
// ---------------------------------------------------------------------------
describe("ShapeList — clear()", () => {
  it("should remove all shapes from body", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    b.shapes.add(new Circle(8));
    b.shapes.add(new Polygon(Polygon.box(10, 10)));

    (b.shapes as any).clear();

    expect(b.shapes.length).toBe(0);
  });

  it("after clear, body should accept new shapes", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    (b.shapes as any).clear();

    const newShape = new Circle(5);
    b.shapes.add(newShape);

    expect(b.shapes.length).toBe(1);
    expect((b.shapes as any).has(newShape)).toBe(true);
  });

  it("should work on body with no shapes", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));

    expect(() => (b.shapes as any).clear()).not.toThrow();
    expect(b.shapes.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ShapeList iteration
// ---------------------------------------------------------------------------
describe("ShapeList — iteration", () => {
  it("should be iterable with for-of", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    b.shapes.add(new Circle(8));

    let count = 0;
    for (const _shape of b.shapes as any) {
      count++;
    }

    expect(count).toBe(2);
  });

  it("at(0) should return first shape", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new Circle(10);
    b.shapes.add(c);

    const first = (b.shapes as any).at(0);
    expect(first).toBeDefined();
  });

  it("should expose length", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    expect(b.shapes.length).toBe(0);

    b.shapes.add(new Circle(5));
    expect(b.shapes.length).toBe(1);

    b.shapes.add(new Polygon(Polygon.box(10, 10)));
    expect(b.shapes.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Shape.body setter — move shape between bodies
// ---------------------------------------------------------------------------
describe("Shape — body setter", () => {
  it("should allow moving shape to another body", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    const c = new Circle(10);
    b1.shapes.add(c);

    expect(b1.shapes.length).toBe(1);

    c.body = b2;

    expect(b1.shapes.length).toBe(0);
    expect(b2.shapes.length).toBe(1);
  });

  it("should allow removing shape by setting body to null", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new Circle(10);
    b.shapes.add(c);

    c.body = null;

    expect(b.shapes.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Shape type checks
// ---------------------------------------------------------------------------
describe("Shape — type checks", () => {
  it("Circle.isCircle() should return true", () => {
    const c = new Circle(10);
    expect(c.isCircle()).toBe(true);
    expect(c.isPolygon()).toBe(false);
  });

  it("Polygon.isPolygon() should return true", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(p.isPolygon()).toBe(true);
    expect(p.isCircle()).toBe(false);
  });

  it("Capsule.isCapsule() should return true", () => {
    const cap = new Capsule(20, 8);
    expect(cap.isCapsule()).toBe(true);
    expect(cap.isCircle()).toBe(false);
    expect(cap.isPolygon()).toBe(false);
  });

  it("castCircle should return circle for circle shape", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new Circle(10);
    b.shapes.add(c);
    const shape = (b.shapes as any).at(0);

    expect(shape.castCircle).not.toBeNull();
    expect(shape.castPolygon).toBeNull();
  });

  it("castPolygon should return polygon for polygon shape", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const p = new Polygon(Polygon.box(10, 10));
    b.shapes.add(p);
    const shape = (b.shapes as any).at(0);

    expect(shape.castPolygon).not.toBeNull();
    expect(shape.castCircle).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Shape with space — in simulation
// ---------------------------------------------------------------------------
describe("ShapeList — shapes in simulation", () => {
  it("removing shape mid-simulation should work", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c1 = new Circle(10);
    const c2 = new Circle(5);
    b.shapes.add(c1);
    b.shapes.add(c2);
    b.space = space;

    space.step(1 / 60);
    (b.shapes as any).remove(c1);
    space.step(1 / 60);

    expect(b.shapes.length).toBe(1);
  });
});
