import { describe, it, expect } from "vitest";
import { getNape } from "../../src/core/engine";
import { RayResult } from "../../src/geom/RayResult";
import { Ray } from "../../src/geom/Ray";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Space } from "../../src/space/Space";

describe("RayResult", () => {
  it("should have correct __name__", () => {
    expect(RayResult.__name__).toEqual(["nape", "geom", "RayResult"]);
  });

  it("should be registered in nape namespace", () => {
    const nape = getNape();
    expect(nape.geom.RayResult).toBe(RayResult);
  });

  it("should have __class__ set on prototype", () => {
    expect(RayResult.prototype.__class__).toBe(RayResult);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new RayResult()).toThrow("RayResult cannot be instantiated");
  });

  it("should be created via compiled getRay factory", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2C = nape.geom.Vec2;

    const result = zpp.geom.ZPP_ConvexRayResult.getRay(
      new Vec2C(1, 0),
      5.0,
      false,
      null,
    );

    expect(result).toBeInstanceOf(RayResult);
    expect(result.distance).toBeCloseTo(5.0);
    expect(result.inner).toBe(false);
    expect(result.shape).toBeNull();

    result.dispose();
  });

  it("should return inner flag", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2C = nape.geom.Vec2;

    const result = zpp.geom.ZPP_ConvexRayResult.getRay(
      new Vec2C(0, 1),
      2.0,
      true,
      null,
    );

    expect(result.inner).toBe(true);
    result.dispose();
  });

  it("should throw after dispose when pool is non-empty", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2C = nape.geom.Vec2;

    // Create two results — dispose the first to seed the pool,
    // then dispose the second so its zpp_inner.next != null.
    const result1 = zpp.geom.ZPP_ConvexRayResult.getRay(
      new Vec2C(1, 0),
      1.0,
      false,
      null,
    );
    const result2 = zpp.geom.ZPP_ConvexRayResult.getRay(
      new Vec2C(0, 1),
      2.0,
      true,
      null,
    );

    result1.dispose();
    result2.dispose();

    // result2 was pooled second → its next points to result1's zpp
    expect(() => result2.distance).toThrow("disposed");
    expect(() => result2.inner).toThrow("disposed");
    expect(() => result2.dispose()).toThrow("disposed");
  });

  it("should have toString", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2C = nape.geom.Vec2;

    const result = zpp.geom.ZPP_ConvexRayResult.getRay(
      new Vec2C(1, 0),
      7.5,
      false,
      null,
    );

    const str = result.toString();
    expect(str).toContain("shape:");
    expect(str).toContain("distance:");
    expect(str).toContain("7.5");

    result.dispose();
  });

  it("should work with actual raycasting", () => {
    const space = new Space();
    const body = new Body();
    body.shapes.add(new Circle(50));
    body.position = new Vec2(100, 0);
    space.bodies.add(body);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray);

    if (result) {
      expect(result).toBeInstanceOf(RayResult);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.shape).toBeDefined();
      result.dispose();
    }
  });

  it("should have _inner returning this for backward compat", () => {
    const nape = getNape();
    const zpp = nape.__zpp;
    const Vec2C = nape.geom.Vec2;

    const result = zpp.geom.ZPP_ConvexRayResult.getRay(
      new Vec2C(1, 0),
      1.0,
      false,
      null,
    );

    expect(result._inner).toBe(result);
    result.dispose();
  });
});
