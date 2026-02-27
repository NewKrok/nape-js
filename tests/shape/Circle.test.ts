import { describe, it, expect } from "vitest";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { Material } from "../../src/phys/Material";

describe("Circle", () => {
  it("should construct with default radius", () => {
    const c = new Circle();
    expect(c.radius).toBeCloseTo(50);
  });

  it("should construct with given radius", () => {
    const c = new Circle(25);
    expect(c.radius).toBeCloseTo(25);
  });

  it("should get/set radius", () => {
    const c = new Circle(10);
    c.radius = 30;
    expect(c.radius).toBeCloseTo(30);
  });

  it("should report as circle type", () => {
    const c = new Circle(10);
    expect(c.isCircle()).toBe(true);
    expect(c.isPolygon()).toBe(false);
  });

  it("should have area", () => {
    const c = new Circle(10);
    expect(c.area).toBeCloseTo(Math.PI * 100, 0);
  });

  it("should accept material in constructor", () => {
    const mat = new Material(0.8, 0.5, 1.0, 3.0);
    const c = new Circle(10, undefined, mat);
    expect(c.material.elasticity).toBeCloseTo(0.8);
    expect(c.material.density).toBeCloseTo(3.0);
  });
});
