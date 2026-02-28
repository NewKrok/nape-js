import { describe, it, expect } from "vitest";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { ZPP_FluidProperties } from "../../src/native/phys/ZPP_FluidProperties";

describe("FluidProperties", () => {
  // --- Constructor ---

  it("should construct with default values", () => {
    const fp = new FluidProperties();
    expect(fp.density).toBeCloseTo(1.0);
    expect(fp.viscosity).toBeCloseTo(1.0);
  });

  it("should construct with custom density and viscosity", () => {
    const fp = new FluidProperties(2.5, 0.3);
    expect(fp.density).toBeCloseTo(2.5);
    expect(fp.viscosity).toBeCloseTo(0.3);
  });

  it("should construct with zero viscosity", () => {
    const fp = new FluidProperties(1.0, 0);
    expect(fp.viscosity).toBeCloseTo(0);
  });

  // --- density property (with /1000 conversion) ---

  it("should get/set density", () => {
    const fp = new FluidProperties();
    fp.density = 5.0;
    expect(fp.density).toBeCloseTo(5.0);
    fp.density = 0.1;
    expect(fp.density).toBeCloseTo(0.1);
  });

  it("should store density internally as value/1000", () => {
    const fp = new FluidProperties(2.0);
    expect(fp.zpp_inner.density).toBeCloseTo(0.002);
    expect(fp.density).toBeCloseTo(2.0);
  });

  it("should not invalidate when setting same density", () => {
    const fp = new FluidProperties(3.0);
    // Setting same value should be a no-op
    fp.density = 3.0;
    expect(fp.density).toBeCloseTo(3.0);
  });

  it("should throw on NaN density in constructor", () => {
    expect(() => new FluidProperties(NaN)).toThrow("density cannot be NaN");
  });

  it("should throw on NaN density in setter", () => {
    const fp = new FluidProperties();
    expect(() => {
      fp.density = NaN;
    }).toThrow("density cannot be NaN");
  });

  // --- viscosity property ---

  it("should get/set viscosity", () => {
    const fp = new FluidProperties();
    fp.viscosity = 0.5;
    expect(fp.viscosity).toBeCloseTo(0.5);
    fp.viscosity = 10.0;
    expect(fp.viscosity).toBeCloseTo(10.0);
  });

  it("should throw on NaN viscosity in constructor", () => {
    expect(() => new FluidProperties(1.0, NaN)).toThrow(
      "viscosity cannot be NaN",
    );
  });

  it("should throw on NaN viscosity in setter", () => {
    const fp = new FluidProperties();
    expect(() => {
      fp.viscosity = NaN;
    }).toThrow("viscosity cannot be NaN");
  });

  it("should throw on negative viscosity in constructor", () => {
    expect(() => new FluidProperties(1.0, -1)).toThrow("must be >= 0");
  });

  it("should throw on negative viscosity in setter", () => {
    const fp = new FluidProperties();
    expect(() => {
      fp.viscosity = -0.5;
    }).toThrow("must be >= 0");
  });

  // --- userData ---

  it("should lazily create userData object", () => {
    const fp = new FluidProperties();
    const ud = fp.userData;
    expect(ud).toBeDefined();
    expect(typeof ud).toBe("object");
  });

  it("should persist userData", () => {
    const fp = new FluidProperties();
    fp.userData.key = 42;
    expect(fp.userData.key).toBe(42);
  });

  // --- copy ---

  it("should copy without affecting original", () => {
    const fp = new FluidProperties(3.0, 0.7);
    const copy = fp.copy();
    expect(copy.density).toBeCloseTo(3.0);
    expect(copy.viscosity).toBeCloseTo(0.7);

    copy.density = 99.0;
    copy.viscosity = 0.01;
    expect(fp.density).toBeCloseTo(3.0);
    expect(fp.viscosity).toBeCloseTo(0.7);
  });

  it("should copy userData if present", () => {
    const fp = new FluidProperties(1.0, 1.0);
    fp.userData.hello = "world";
    const copy = fp.copy();
    expect(copy.userData.hello).toBe("world");
    // Should be a shallow copy (independent)
    copy.userData.hello = "changed";
    expect(fp.userData.hello).toBe("world");
  });

  // --- toString ---

  it("should return string representation", () => {
    const fp = new FluidProperties(2.0, 0.5);
    const str = fp.toString();
    expect(str).toContain("density:");
    expect(str).toContain("viscosity:");
    expect(str).toContain("gravity:");
  });

  // --- zpp_inner / _inner ---

  it("should have zpp_inner as ZPP_FluidProperties instance", () => {
    const fp = new FluidProperties();
    expect(fp.zpp_inner).toBeInstanceOf(ZPP_FluidProperties);
  });

  it("should have _inner returning this", () => {
    const fp = new FluidProperties();
    expect(fp._inner).toBe(fp);
  });

  // --- _wrap ---

  it("should wrap ZPP_FluidProperties instance", () => {
    const fp = new FluidProperties(5.0, 2.0);
    const wrapped = FluidProperties._wrap(fp.zpp_inner);
    expect(wrapped).toBeInstanceOf(FluidProperties);
    expect(wrapped.density).toBeCloseTo(5.0);
  });

  it("should return same instance for same zpp_inner", () => {
    const fp = new FluidProperties();
    const a = FluidProperties._wrap(fp.zpp_inner);
    const b = FluidProperties._wrap(fp.zpp_inner);
    expect(a).toBe(b);
  });

  it("should return instance directly when wrapping a FluidProperties", () => {
    const fp = new FluidProperties();
    expect(FluidProperties._wrap(fp)).toBe(fp);
  });

  it("should return null for null/undefined input", () => {
    expect(FluidProperties._wrap(null)).toBeNull();
    expect(FluidProperties._wrap(undefined)).toBeNull();
  });
});
