import { describe, it, expect } from "vitest";
import { FluidProperties } from "../../src/phys/FluidProperties";

describe("FluidProperties", () => {
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

  it("should get/set density", () => {
    const fp = new FluidProperties();
    fp.density = 5.0;
    expect(fp.density).toBeCloseTo(5.0);
    fp.density = 0.1;
    expect(fp.density).toBeCloseTo(0.1);
  });

  it("should get/set viscosity", () => {
    const fp = new FluidProperties();
    fp.viscosity = 0.5;
    expect(fp.viscosity).toBeCloseTo(0.5);
    fp.viscosity = 10.0;
    expect(fp.viscosity).toBeCloseTo(10.0);
  });

  it("should copy without affecting original", () => {
    const fp = new FluidProperties(3.0, 0.7);
    const copy = fp.copy();
    expect(copy.density).toBeCloseTo(3.0);
    expect(copy.viscosity).toBeCloseTo(0.7);

    copy.density = 99.0;
    copy.viscosity = 0.01;
    expect(fp.density).toBeCloseTo(3.0); // original unchanged
    expect(fp.viscosity).toBeCloseTo(0.7); // original unchanged
  });
});
