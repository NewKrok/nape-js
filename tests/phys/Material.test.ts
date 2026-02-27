import { describe, it, expect } from "vitest";
import { Material } from "../../src/phys/Material";

describe("Material", () => {
  it("should construct with default values", () => {
    const mat = new Material();
    expect(mat.elasticity).toBeCloseTo(0.0);
    expect(mat.dynamicFriction).toBeCloseTo(1.0);
    expect(mat.staticFriction).toBeCloseTo(2.0);
    expect(mat.density).toBeCloseTo(1.0);
  });

  it("should construct with custom values", () => {
    const mat = new Material(0.5, 0.3, 0.4, 2.0, 0.01);
    expect(mat.elasticity).toBeCloseTo(0.5);
    expect(mat.dynamicFriction).toBeCloseTo(0.3);
    expect(mat.staticFriction).toBeCloseTo(0.4);
    expect(mat.density).toBeCloseTo(2.0);
    expect(mat.rollingFriction).toBeCloseTo(0.01);
  });

  it("should get/set properties", () => {
    const mat = new Material();
    mat.elasticity = 0.9;
    mat.dynamicFriction = 0.1;
    mat.density = 5.0;
    expect(mat.elasticity).toBeCloseTo(0.9);
    expect(mat.dynamicFriction).toBeCloseTo(0.1);
    expect(mat.density).toBeCloseTo(5.0);
  });

  it("should copy", () => {
    const mat = new Material(0.8, 0.2, 0.3, 4.0);
    const copy = mat.copy();
    copy.elasticity = 0.0;
    expect(mat.elasticity).toBeCloseTo(0.8); // original unchanged
    expect(copy.elasticity).toBeCloseTo(0.0);
  });
});
