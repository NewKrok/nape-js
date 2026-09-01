import { describe, it, expect } from "vitest";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { Vec2 } from "../../src/geom/Vec2";

describe("FluidProperties.copy", () => {
  it("copies density and viscosity without gravity", () => {
    const fp = new FluidProperties(2, 3);
    const copy = fp.copy();
    expect(copy).not.toBe(fp);
    expect(copy.density).toBeCloseTo(fp.density);
    expect(copy.viscosity).toBeCloseTo(fp.viscosity);
    expect(copy.gravity == null).toBe(true);
  });

  it("copies userData as a shallow clone", () => {
    const fp = new FluidProperties(1, 1);
    fp.userData.tag = "water";
    const copy = fp.copy();
    expect(copy.userData.tag).toBe("water");
    copy.userData.tag = "lava";
    expect(fp.userData.tag).toBe("water");
  });

  it("copies a set gravity by value", () => {
    const fp = new FluidProperties(1, 1);
    fp.gravity = new Vec2(0, 300);
    const copy = fp.copy();
    expect(copy.gravity).not.toBeNull();
    expect(copy.gravity.x).toBeCloseTo(0);
    expect(copy.gravity.y).toBeCloseTo(300);
    // Independent Vec2 instances: mutating the copy leaves the source alone.
    copy.gravity.y = -100;
    expect(fp.gravity.y).toBeCloseTo(300);
  });
});

describe("FluidProperties.shapes", () => {
  it("exposes an initially empty shape list", () => {
    const fp = new FluidProperties(1, 1);
    const shapes = fp.shapes;
    expect(shapes).toBeDefined();
    expect(shapes.length).toBe(0);
    // Cached wrapper: same instance on repeat access.
    expect(fp.shapes).toBe(shapes);
  });
});

describe("FluidProperties.gravity", () => {
  it("accepts a weak Vec2 and disposes it", () => {
    const fp = new FluidProperties(1, 1);
    const weak = Vec2.weak(5, 7);
    fp.gravity = weak;
    expect(fp.gravity.x).toBeCloseTo(5);
    expect(fp.gravity.y).toBeCloseTo(7);
    expect((weak as any).zpp_disp).toBe(true);
  });

  it("clears gravity when set to null", () => {
    const fp = new FluidProperties(1, 1);
    fp.gravity = new Vec2(1, 2);
    expect(fp.gravity).not.toBeNull();
    fp.gravity = null;
    expect(fp.gravity == null).toBe(true);
    // Clearing twice is a no-op.
    fp.gravity = null;
    expect(fp.gravity == null).toBe(true);
  });

  it("updates an existing gravity in place", () => {
    const fp = new FluidProperties(1, 1);
    fp.gravity = new Vec2(1, 2);
    fp.gravity = new Vec2(3, 4);
    expect(fp.gravity.x).toBeCloseTo(3);
    expect(fp.gravity.y).toBeCloseTo(4);
  });

  it("rejects a disposed Vec2", () => {
    const fp = new FluidProperties(1, 1);
    const v = Vec2.get(1, 2);
    v.dispose();
    expect(() => {
      fp.gravity = v;
    }).toThrow("disposed");
  });
});
