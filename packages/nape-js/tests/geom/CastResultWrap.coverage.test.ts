import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Ray } from "../../src/geom/Ray";
import { RayResult } from "../../src/geom/RayResult";
import { ConvexResult } from "../../src/geom/ConvexResult";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";

function makeScene() {
  const space = new Space(new Vec2(0, 0));
  const wall = new Body(BodyType.STATIC, new Vec2(100, 0));
  wall.shapes.add(new Polygon(Polygon.box(10, 200)));
  wall.space = space;
  return space;
}

describe("RayResult._wrap", () => {
  it("returns null for null input", () => {
    expect(RayResult._wrap(null)).toBeNull();
  });

  it("returns the same instance for an already-wrapped result", () => {
    const space = makeScene();
    const result = space.rayCast(new Ray(new Vec2(0, 0), new Vec2(1, 0)));
    expect(result).not.toBeNull();
    expect(RayResult._wrap(result!)).toBe(result);
    result!.dispose();
  });

  it("wraps a raw inner result object", () => {
    const space = makeScene();
    const result = space.rayCast(new Ray(new Vec2(0, 0), new Vec2(1, 0)));
    expect(result).not.toBeNull();
    const zpp = (result as any).zpp_inner;
    const wrapped = RayResult._wrap(zpp);
    expect(wrapped).toBeInstanceOf(RayResult);
    expect((wrapped as any).zpp_inner).toBe(zpp);
    result!.dispose();
  });
});

describe("ConvexResult._wrap", () => {
  function castCircle(space: Space): ConvexResult | null {
    const caster = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    caster.shapes.add(new Circle(5));
    caster.velocity = new Vec2(500, 0);
    caster.space = space;
    return space.convexCast(caster.shapes.at(0), 1, false);
  }

  it("returns null for null input", () => {
    expect(ConvexResult._wrap(null)).toBeNull();
  });

  it("returns the same instance for an already-wrapped result", () => {
    const space = makeScene();
    const result = castCircle(space);
    expect(result).not.toBeNull();
    expect(ConvexResult._wrap(result!)).toBe(result);
    result!.dispose();
  });

  it("wraps a raw inner result object", () => {
    const space = makeScene();
    const result = castCircle(space);
    expect(result).not.toBeNull();
    const zpp = (result as any).zpp_inner;
    const wrapped = ConvexResult._wrap(zpp);
    expect(wrapped).toBeInstanceOf(ConvexResult);
    expect((wrapped as any).zpp_inner).toBe(zpp);
    result!.dispose();
  });

  it("cannot be constructed directly", () => {
    expect(() => new (ConvexResult as any)()).toThrow();
  });
});
