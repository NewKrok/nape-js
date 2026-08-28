import { describe, it, expect } from "vitest";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { Vec2 } from "../../src/geom/Vec2";
import { ZPP_FluidProperties } from "../../src/native/phys/ZPP_FluidProperties";

describe("FluidProperties — coverage", () => {
  describe("gravity setter/getter", () => {
    it("should set gravity then verify it exists", () => {
      const fp = new FluidProperties();
      fp.gravity = new Vec2(0, -100);
      expect(fp.gravity).not.toBeNull();
      expect(fp.gravity.x).toBeCloseTo(0);
      expect(fp.gravity.y).toBeCloseTo(-100);
    });

    it("should clear gravity by setting wrap_gravity to null", () => {
      const fp = new FluidProperties();
      fp.gravity = new Vec2(0, -100);
      expect(fp.gravity).not.toBeNull();
      // Use internal path to clear (full dispose needs zpp_nape bootstrap)
      fp.zpp_inner.wrap_gravity = null;
      expect(fp.gravity).toBeNull();
    });

    it("should update gravity from one Vec2 to another", () => {
      const fp = new FluidProperties();
      fp.gravity = new Vec2(0, -100);
      fp.gravity = new Vec2(10, -200);
      expect(fp.gravity.x).toBeCloseTo(10);
      expect(fp.gravity.y).toBeCloseTo(-200);
    });

    it("should set gravity then set same values (no-op branch)", () => {
      const fp = new FluidProperties();
      fp.gravity = new Vec2(5, 10);
      // Setting same values should still work
      fp.gravity = new Vec2(5, 10);
      expect(fp.gravity.x).toBeCloseTo(5);
      expect(fp.gravity.y).toBeCloseTo(10);
    });
  });

  describe("copy with gravity", () => {
    it("should copy FluidProperties with gravity set", () => {
      const fp = new FluidProperties(2.0, 0.5);
      fp.gravity = new Vec2(0, -200);
      const copy = fp.copy();

      expect(copy.density).toBeCloseTo(2.0);
      expect(copy.viscosity).toBeCloseTo(0.5);
      expect(copy.gravity).not.toBeNull();
      expect(copy.gravity.x).toBeCloseTo(0);
      expect(copy.gravity.y).toBeCloseTo(-200);
    });

    it("should copy FluidProperties without gravity", () => {
      const fp = new FluidProperties(3.0, 1.5);
      const copy = fp.copy();
      expect(copy.density).toBeCloseTo(3.0);
      expect(copy.viscosity).toBeCloseTo(1.5);
      expect(copy.gravity).toBeNull();
    });
  });

  describe("_wrap edge cases", () => {
    it("should return null for unknown object", () => {
      const result = FluidProperties._wrap({ foo: "bar" });
      expect(result).toBeNull();
    });
  });

  describe("pool reuse", () => {
    it("should reuse pooled ZPP_FluidProperties instances", () => {
      // Create and grab inner
      const fp1 = new FluidProperties(1.0, 1.0);
      const inner1 = fp1.zpp_inner;

      // Return to pool
      inner1.next = ZPP_FluidProperties.zpp_pool;
      ZPP_FluidProperties.zpp_pool = inner1;

      // Next creation should reuse
      const fp2 = new FluidProperties(5.0, 2.0);
      expect(fp2.zpp_inner).toBe(inner1);
      expect(fp2.density).toBeCloseTo(5.0);
    });
  });

  // shapes getter requires full zpp_nape bootstrap — tested in integration tests

  describe("toString", () => {
    it("should include gravity in string when set", () => {
      const fp = new FluidProperties(1.5, 0.8);
      fp.gravity = new Vec2(0, -100);
      const str = fp.toString();
      expect(str).toContain("density:");
      expect(str).toContain("1.5");
      expect(str).toContain("viscosity:");
      expect(str).toContain("0.8");
      expect(str).toContain("gravity:");
    });
  });
});
