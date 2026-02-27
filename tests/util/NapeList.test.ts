import { describe, it, expect } from "vitest";
import { Body, BodyType, Circle, Space, Vec2 } from "../../src";

describe("NapeList", () => {
  it("should report correct length for body shapes", () => {
    const body = new Body(BodyType.DYNAMIC);
    expect(body.shapes.length).toBe(0);

    body.shapes.add(new Circle(10) as any);
    expect(body.shapes.length).toBe(1);

    body.shapes.add(new Circle(20) as any);
    expect(body.shapes.length).toBe(2);
  });

  it("should iterate over elements with for...of", () => {
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(new Circle(10) as any);
    body.shapes.add(new Circle(20) as any);

    const shapes = [];
    for (const shape of body.shapes) {
      shapes.push(shape);
    }
    expect(shapes).toHaveLength(2);
    expect(shapes[0].isCircle()).toBe(true);
    expect(shapes[1].isCircle()).toBe(true);
  });

  it("should convert to array", () => {
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(new Circle(15) as any);
    body.shapes.add(new Circle(25) as any);

    const arr = body.shapes.toArray();
    expect(arr).toHaveLength(2);
  });

  it("should iterate with forEach", () => {
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(new Circle(10) as any);
    body.shapes.add(new Circle(20) as any);

    const indices: number[] = [];
    body.shapes.forEach((_shape, index) => {
      indices.push(index);
    });
    expect(indices).toEqual([0, 1]);
  });

  it("should work with Space.bodies list", () => {
    const space = new Space(new Vec2(0, -10));
    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(10) as any);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(10) as any);
    b2.space = space;

    // Space.bodies includes the static world body + our 2 dynamic bodies
    expect(space.bodies.length).toBeGreaterThanOrEqual(2);

    const dynamicBodies = space.bodies.toArray().filter((b) => b.isDynamic());
    expect(dynamicBodies).toHaveLength(2);
  });
});
