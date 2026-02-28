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

  it("should have an _inner reference", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(ray._inner).toBeDefined();
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

  it("should get and set maxDistance", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = 100;
    expect(ray.maxDistance).toBe(100);
  });

  it("should default maxDistance to infinity", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(ray.maxDistance).toBe(Infinity);
  });

  it("should have userData", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const ud = ray.userData;
    expect(ud).toBeDefined();
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
    // Direction should point from start to end
    expect(ray.direction.x).not.toBe(0);
  });

  it("fromSegment should set finite maxDistance", () => {
    const start = new Vec2(0, 0);
    const end = new Vec2(10, 0);
    const ray = Ray.fromSegment(start, end);
    expect(ray.maxDistance).not.toBe(Infinity);
    expect(ray.maxDistance).toBeGreaterThan(0);
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

  it("should compute point at distance", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const point = ray.at(5);
    expect(point).toBeInstanceOf(Vec2);
    expect(point.x).toBeCloseTo(5);
    expect(point.y).toBeCloseTo(0);
  });

  it("should compute point at distance with direction", () => {
    const ray = new Ray(new Vec2(1, 2), new Vec2(0, 1));
    const point = ray.at(3);
    expect(point.x).toBeCloseTo(1);
    expect(point.y).toBeCloseTo(5);
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

  // ---------------------------------------------------------------------------
  // _wrap
  // ---------------------------------------------------------------------------

  it("should wrap the same inner to the same Ray instance", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const wrapped = Ray._wrap(ray._inner);
    expect(wrapped._inner).toBe(ray._inner);
  });
});
