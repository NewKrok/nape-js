import { describe, it, expect } from "vitest";
import { Material } from "../../src/phys/Material";
import { ZPP_Material } from "../../src/native/phys/ZPP_Material";

describe("Material", () => {
  // --- Constructor ---

  it("should construct with default values", () => {
    const mat = new Material();
    expect(mat.elasticity).toBeCloseTo(0.0);
    expect(mat.dynamicFriction).toBeCloseTo(1.0);
    expect(mat.staticFriction).toBeCloseTo(2.0);
    expect(mat.density).toBeCloseTo(1.0);
    expect(mat.rollingFriction).toBeCloseTo(0.001);
  });

  it("should construct with custom values", () => {
    const mat = new Material(0.5, 0.3, 0.4, 2.0, 0.01);
    expect(mat.elasticity).toBeCloseTo(0.5);
    expect(mat.dynamicFriction).toBeCloseTo(0.3);
    expect(mat.staticFriction).toBeCloseTo(0.4);
    expect(mat.density).toBeCloseTo(2.0);
    expect(mat.rollingFriction).toBeCloseTo(0.01);
  });

  // --- Constructor NaN validation ---

  it("should throw on NaN elasticity in constructor", () => {
    expect(() => new Material(NaN)).toThrow("elasticity cannot be NaN");
  });

  it("should throw on NaN dynamicFriction in constructor", () => {
    expect(() => new Material(0, NaN)).toThrow("dynamicFriction cannot be NaN");
  });

  it("should throw on negative dynamicFriction in constructor", () => {
    expect(() => new Material(0, -1)).toThrow("negative");
  });

  it("should throw on NaN staticFriction in constructor", () => {
    expect(() => new Material(0, 1, NaN)).toThrow("staticFriction cannot be NaN");
  });

  it("should throw on negative staticFriction in constructor", () => {
    expect(() => new Material(0, 1, -1)).toThrow("negative");
  });

  it("should throw on NaN density in constructor", () => {
    expect(() => new Material(0, 1, 2, NaN)).toThrow("density cannot be NaN");
  });

  it("should throw on negative density in constructor", () => {
    expect(() => new Material(0, 1, 2, -1)).toThrow("positive");
  });

  it("should throw on NaN rollingFriction in constructor", () => {
    expect(() => new Material(0, 1, 2, 1, NaN)).toThrow("rollingFriction cannot be NaN");
  });

  it("should throw on negative rollingFriction in constructor", () => {
    expect(() => new Material(0, 1, 2, 1, -1)).toThrow("negative");
  });

  // --- Property get/set ---

  it("should get/set elasticity", () => {
    const mat = new Material();
    mat.elasticity = 0.9;
    expect(mat.elasticity).toBeCloseTo(0.9);
  });

  it("should throw on NaN elasticity setter", () => {
    const mat = new Material();
    expect(() => { mat.elasticity = NaN; }).toThrow("elasticity cannot be NaN");
  });

  it("should allow negative elasticity", () => {
    const mat = new Material();
    mat.elasticity = -0.5;
    expect(mat.elasticity).toBeCloseTo(-0.5);
  });

  it("should get/set dynamicFriction", () => {
    const mat = new Material();
    mat.dynamicFriction = 0.1;
    expect(mat.dynamicFriction).toBeCloseTo(0.1);
  });

  it("should throw on NaN dynamicFriction setter", () => {
    const mat = new Material();
    expect(() => { mat.dynamicFriction = NaN; }).toThrow("dynamicFriction cannot be NaN");
  });

  it("should throw on negative dynamicFriction setter", () => {
    const mat = new Material();
    expect(() => { mat.dynamicFriction = -0.1; }).toThrow("negative");
  });

  it("should get/set staticFriction", () => {
    const mat = new Material();
    mat.staticFriction = 0.5;
    expect(mat.staticFriction).toBeCloseTo(0.5);
  });

  it("should throw on NaN staticFriction setter", () => {
    const mat = new Material();
    expect(() => { mat.staticFriction = NaN; }).toThrow("staticFriction cannot be NaN");
  });

  it("should throw on negative staticFriction setter", () => {
    const mat = new Material();
    expect(() => { mat.staticFriction = -0.1; }).toThrow("negative");
  });

  it("should get/set density", () => {
    const mat = new Material();
    mat.density = 5.0;
    expect(mat.density).toBeCloseTo(5.0);
  });

  it("should store density internally as value/1000", () => {
    const mat = new Material(0, 1, 2, 3.0);
    expect(mat.zpp_inner.density).toBeCloseTo(0.003);
    expect(mat.density).toBeCloseTo(3.0);
  });

  it("should throw on NaN density setter", () => {
    const mat = new Material();
    expect(() => { mat.density = NaN; }).toThrow("density cannot be NaN");
  });

  it("should throw on negative density setter", () => {
    const mat = new Material();
    expect(() => { mat.density = -1; }).toThrow("positive");
  });

  it("should get/set rollingFriction", () => {
    const mat = new Material();
    mat.rollingFriction = 0.05;
    expect(mat.rollingFriction).toBeCloseTo(0.05);
  });

  it("should throw on NaN rollingFriction setter", () => {
    const mat = new Material();
    expect(() => { mat.rollingFriction = NaN; }).toThrow("rollingFriction cannot be NaN");
  });

  it("should throw on negative rollingFriction setter", () => {
    const mat = new Material();
    expect(() => { mat.rollingFriction = -0.01; }).toThrow("negative");
  });

  // --- no-op when setting same value ---

  it("should no-op when setting same elasticity", () => {
    const mat = new Material(0.5);
    mat.elasticity = 0.5;
    expect(mat.elasticity).toBeCloseTo(0.5);
  });

  it("should no-op when setting same dynamicFriction", () => {
    const mat = new Material(0, 0.5);
    mat.dynamicFriction = 0.5;
    expect(mat.dynamicFriction).toBeCloseTo(0.5);
  });

  // --- userData ---

  it("should lazily create userData", () => {
    const mat = new Material();
    const ud = mat.userData;
    expect(ud).toBeDefined();
    expect(typeof ud).toBe("object");
  });

  it("should persist userData", () => {
    const mat = new Material();
    mat.userData.key = "value";
    expect(mat.userData.key).toBe("value");
  });

  // --- copy ---

  it("should copy all properties", () => {
    const mat = new Material(0.8, 0.2, 0.3, 4.0, 0.02);
    const copy = mat.copy();
    expect(copy.elasticity).toBeCloseTo(0.8);
    expect(copy.dynamicFriction).toBeCloseTo(0.2);
    expect(copy.staticFriction).toBeCloseTo(0.3);
    expect(copy.density).toBeCloseTo(4.0);
    expect(copy.rollingFriction).toBeCloseTo(0.02);
  });

  it("should produce independent copy", () => {
    const mat = new Material(0.8, 0.2, 0.3, 4.0);
    const copy = mat.copy();
    copy.elasticity = 0.0;
    expect(mat.elasticity).toBeCloseTo(0.8); // original unchanged
    expect(copy.elasticity).toBeCloseTo(0.0);
  });

  it("should copy as Material instance", () => {
    const mat = new Material();
    expect(mat.copy()).toBeInstanceOf(Material);
  });

  it("should copy userData if present", () => {
    const mat = new Material();
    mat.userData.hello = "world";
    const copy = mat.copy();
    expect(copy.userData.hello).toBe("world");
    // Shallow copy — independent
    copy.userData.hello = "changed";
    expect(mat.userData.hello).toBe("world");
  });

  it("should not copy userData if not accessed", () => {
    const mat = new Material();
    const copy = mat.copy();
    // userData should be lazy — not created until accessed
    expect(mat.zpp_inner.userData).toBeNull();
    expect(copy.zpp_inner.userData).toBeNull();
  });

  // --- toString ---

  it("should have toString", () => {
    const mat = new Material(0.5, 0.3, 0.4, 2.0, 0.01);
    const str = mat.toString();
    expect(str).toContain("elasticity:");
    expect(str).toContain("dynamicFriction:");
    expect(str).toContain("staticFriction:");
    expect(str).toContain("density:");
    expect(str).toContain("rollingFriction:");
  });

  it("should contain actual values in toString", () => {
    const mat = new Material(0.5, 0.3, 0.4, 2.0, 0.01);
    const str = mat.toString();
    expect(str).toContain("0.5");
    expect(str).toContain("0.3");
    expect(str).toContain("0.4");
    expect(str).toContain("2"); // density
    expect(str).toContain("0.01");
  });

  // --- Static preset factories ---

  it("should create wood material", () => {
    const mat = Material.wood();
    expect(mat).toBeInstanceOf(Material);
    expect(mat.elasticity).toBeCloseTo(0.4);
    expect(mat.dynamicFriction).toBeCloseTo(0.2);
    expect(mat.staticFriction).toBeCloseTo(0.38);
    expect(mat.density).toBeCloseTo(0.7);
    expect(mat.rollingFriction).toBeCloseTo(0.005);
  });

  it("should create steel material", () => {
    const mat = Material.steel();
    expect(mat).toBeInstanceOf(Material);
    expect(mat.elasticity).toBeCloseTo(0.2);
    expect(mat.dynamicFriction).toBeCloseTo(0.57);
    expect(mat.staticFriction).toBeCloseTo(0.74);
    expect(mat.density).toBeCloseTo(7.8);
    expect(mat.rollingFriction).toBeCloseTo(0.001);
  });

  it("should create ice material", () => {
    const mat = Material.ice();
    expect(mat).toBeInstanceOf(Material);
    expect(mat.elasticity).toBeCloseTo(0.3);
    expect(mat.dynamicFriction).toBeCloseTo(0.03);
    expect(mat.staticFriction).toBeCloseTo(0.1);
    expect(mat.density).toBeCloseTo(0.9);
  });

  it("should create rubber material", () => {
    const mat = Material.rubber();
    expect(mat).toBeInstanceOf(Material);
    expect(mat.elasticity).toBeCloseTo(0.8);
    expect(mat.dynamicFriction).toBeCloseTo(1.0);
    expect(mat.staticFriction).toBeCloseTo(1.4);
    expect(mat.density).toBeCloseTo(1.5);
  });

  it("should create glass material", () => {
    const mat = Material.glass();
    expect(mat).toBeInstanceOf(Material);
    expect(mat.elasticity).toBeCloseTo(0.4);
    expect(mat.dynamicFriction).toBeCloseTo(0.4);
    expect(mat.staticFriction).toBeCloseTo(0.94);
    expect(mat.density).toBeCloseTo(2.6);
  });

  it("should create sand material", () => {
    const mat = Material.sand();
    expect(mat).toBeInstanceOf(Material);
    expect(mat.elasticity).toBeCloseTo(-1.0);
    expect(mat.dynamicFriction).toBeCloseTo(0.45);
    expect(mat.staticFriction).toBeCloseTo(0.6);
    expect(mat.density).toBeCloseTo(1.6);
    expect(mat.rollingFriction).toBeCloseTo(16.0);
  });

  // --- _wrap ---

  it("should wrap ZPP_Material instance", () => {
    const mat = new Material(0.5, 0.3, 0.4, 2.0);
    const wrapped = Material._wrap(mat.zpp_inner);
    expect(wrapped).toBeInstanceOf(Material);
    expect(wrapped.elasticity).toBeCloseTo(0.5);
  });

  it("should return same instance for same zpp_inner", () => {
    const mat = new Material();
    const a = Material._wrap(mat.zpp_inner);
    const b = Material._wrap(mat.zpp_inner);
    expect(a).toBe(b);
  });

  it("should return instance directly when wrapping a Material", () => {
    const mat = new Material();
    expect(Material._wrap(mat)).toBe(mat);
  });

  it("should return null for null/undefined input", () => {
    expect(Material._wrap(null)).toBeNull();
    expect(Material._wrap(undefined)).toBeNull();
  });

  // --- zpp_inner / _inner ---

  it("should have zpp_inner as ZPP_Material instance", () => {
    const mat = new Material();
    expect(mat.zpp_inner).toBeInstanceOf(ZPP_Material);
  });

  it("should have _inner returning this", () => {
    const mat = new Material();
    expect(mat._inner).toBe(mat);
  });
});
