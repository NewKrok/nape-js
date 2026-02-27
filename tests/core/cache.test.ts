import { describe, it, expect } from "vitest";
import { Body, BodyType, Circle, Space, Vec2 } from "../../src";

describe("WeakMap wrapper cache", () => {
  it("should return the same Vec2 wrapper for the same inner object", () => {
    const body = new Body(BodyType.DYNAMIC);
    body.position = new Vec2(10, 20);
    const pos1 = body.position;
    const pos2 = body.position;
    // Both should reference the same cached wrapper
    expect(pos1).toBe(pos2);
  });

  it("should return the same Body wrapper from Space.bodies list", () => {
    const space = new Space(new Vec2(0, -10));
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(new Circle(10) as any);
    body.space = space;

    const bodies1 = space.bodies.toArray();
    const bodies2 = space.bodies.toArray();
    // The static world body + our dynamic body; find our body by checking position
    const b1 = bodies1.find((b) => b.isDynamic());
    const b2 = bodies2.find((b) => b.isDynamic());
    expect(b1).toBeDefined();
    expect(b2).toBeDefined();
    expect(b1).toBe(b2);
  });

  it("should return the same Shape wrapper for body.shapes access", () => {
    const body = new Body(BodyType.DYNAMIC);
    const circle = new Circle(25);
    body.shapes.add(circle as any);

    const shape1 = body.shapes.at(0);
    const shape2 = body.shapes.at(0);
    expect(shape1).toBe(shape2);
  });

  it("should dispatch Circle subclass from Shape._wrap via body.shapes", () => {
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(new Circle(20) as any);

    const shape = body.shapes.at(0);
    expect(shape.isCircle()).toBe(true);
    expect(shape).toBeInstanceOf(Circle);
  });
});
