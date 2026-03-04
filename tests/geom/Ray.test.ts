import { describe, it, expect } from "vitest";
import { Ray } from "../../src/geom/Ray";
import { Vec2 } from "../../src/geom/Vec2";
import { AABB } from "../../src/geom/AABB";

describe("Ray", () => {
  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  it("should construct from origin and direction", () => {
    const origin = new Vec2(1, 2);
    const direction = new Vec2(1, 0);
    const ray = new Ray(origin, direction);
    expect(ray).toBeInstanceOf(Ray);
    expect(ray.origin.x).toBeCloseTo(1);
    expect(ray.origin.y).toBeCloseTo(2);
    expect(ray.direction.x).toBeCloseTo(1);
    expect(ray.direction.y).toBeCloseTo(0);
  });

  it("should have zpp_inner reference", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(ray.zpp_inner).toBeDefined();
  });

  it("should have _inner backward compat alias", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(ray._inner).toBe(ray);
  });

  it("should throw on null origin", () => {
    expect(() => new Ray(null!, new Vec2(1, 0))).toThrow("origin cannot be null");
  });

  it("should throw on null direction", () => {
    expect(() => new Ray(new Vec2(0, 0), null!)).toThrow("direction cannot be null");
  });

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  it("should get and set origin", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.origin = new Vec2(5, 10);
    expect(ray.origin.x).toBeCloseTo(5);
    expect(ray.origin.y).toBeCloseTo(10);
  });

  it("should get and set direction", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.direction = new Vec2(0, 1);
    expect(ray.direction.x).toBeCloseTo(0);
    expect(ray.direction.y).toBeCloseTo(1);
  });

  it("should throw on setting null origin", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(() => { ray.origin = null!; }).toThrow("origin cannot be null");
  });

  it("should throw on setting null direction", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(() => { ray.direction = null!; }).toThrow("direction cannot be null");
  });

  it("should get and set maxDistance", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = 100;
    expect(ray.maxDistance).toBe(100);
  });

  it("should default maxDistance to infinity", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(ray.maxDistance).toBe(Infinity);
  });

  it("should throw on NaN maxDistance", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(() => { ray.maxDistance = NaN; }).toThrow("maxDistance cannot be NaN");
  });

  it("should have userData", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const ud = ray.userData;
    expect(ud).toBeDefined();
    expect(typeof ud).toBe("object");
  });

  it("should lazily create userData", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    // First access creates it
    ray.userData.foo = "bar";
    // Second access returns same object
    expect(ray.userData.foo).toBe("bar");
  });

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  it("should create ray from segment", () => {
    const start = new Vec2(0, 0);
    const end = new Vec2(10, 0);
    const ray = Ray.fromSegment(start, end);
    expect(ray).toBeInstanceOf(Ray);
    expect(ray.origin.x).toBeCloseTo(0);
    expect(ray.origin.y).toBeCloseTo(0);
    expect(ray.direction.x).not.toBe(0);
  });

  it("fromSegment should set finite maxDistance", () => {
    const start = new Vec2(0, 0);
    const end = new Vec2(10, 0);
    const ray = Ray.fromSegment(start, end);
    expect(ray.maxDistance).not.toBe(Infinity);
    expect(ray.maxDistance).toBeCloseTo(10);
  });

  it("fromSegment should set maxDistance to segment length", () => {
    const ray = Ray.fromSegment(new Vec2(0, 0), new Vec2(3, 4));
    expect(ray.maxDistance).toBeCloseTo(5);
  });

  it("fromSegment should throw on null start", () => {
    expect(() => Ray.fromSegment(null!, new Vec2(1, 0))).toThrow("start is null");
  });

  it("fromSegment should throw on null end", () => {
    expect(() => Ray.fromSegment(new Vec2(0, 0), null!)).toThrow("end is null");
  });

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  it("should compute aabb", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = 10;
    const bounds = ray.aabb();
    expect(bounds).toBeInstanceOf(AABB);
  });

  it("should compute point at distance along +x axis", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const point = ray.at(5);
    expect(point).toBeInstanceOf(Vec2);
    expect(point.x).toBeCloseTo(5);
    expect(point.y).toBeCloseTo(0);
  });

  it("should compute point at distance along +y axis", () => {
    const ray = new Ray(new Vec2(1, 2), new Vec2(0, 1));
    const point = ray.at(3);
    expect(point.x).toBeCloseTo(1);
    expect(point.y).toBeCloseTo(5);
  });

  it("should compute point at distance along diagonal", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(3, 4));
    // Direction gets normalized internally: (0.6, 0.8)
    const point = ray.at(10);
    expect(point.x).toBeCloseTo(6);
    expect(point.y).toBeCloseTo(8);
  });

  it("should support weak Vec2 from at()", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const point = ray.at(5, true);
    expect(point.x).toBeCloseTo(5);
    // Weak Vec2 - we can still read it before dispose
    expect((point as any).zpp_inner.weak).toBe(true);
  });

  it("should copy ray", () => {
    const ray = new Ray(new Vec2(1, 2), new Vec2(3, 4));
    ray.maxDistance = 50;
    const rayCopy = ray.copy();
    expect(rayCopy).toBeInstanceOf(Ray);
    expect(rayCopy).not.toBe(ray);
    expect(rayCopy.origin.x).toBeCloseTo(1);
    expect(rayCopy.origin.y).toBeCloseTo(2);
    expect(rayCopy.direction.x).toBeCloseTo(3);
    expect(rayCopy.direction.y).toBeCloseTo(4);
    expect(rayCopy.maxDistance).toBe(50);
  });

  it("copy should be independent of original", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const rayCopy = ray.copy();
    ray.origin = new Vec2(99, 99);
    expect(rayCopy.origin.x).toBeCloseTo(0);
    expect(rayCopy.origin.y).toBeCloseTo(0);
  });

  // ---------------------------------------------------------------------------
  // _wrap
  // ---------------------------------------------------------------------------

  it("should wrap the same Ray instance", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const wrapped = Ray._wrap(ray);
    expect(wrapped).toBe(ray);
  });

  // ---------------------------------------------------------------------------
  // Backward-compat get_*/set_* methods
  // ---------------------------------------------------------------------------

  it("should support get_maxDistance/set_maxDistance", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.set_maxDistance(42);
    expect(ray.get_maxDistance()).toBe(42);
  });

  it("should support get_userData", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(ray.get_userData()).toBeDefined();
  });
});
