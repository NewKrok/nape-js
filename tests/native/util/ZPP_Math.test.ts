import { describe, it, expect } from "vitest";
import { ZPP_Math } from "../../../src/native/util/ZPP_Math";

describe("ZPP_Math", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Math.__name__).toEqual(["zpp_nape", "util", "ZPP_Math"]);
    });
  });

  describe("__class__", () => {
    it("should reference ZPP_Math", () => {
      const inst = new ZPP_Math();
      expect(inst.__class__).toBe(ZPP_Math);
    });
  });

  describe("sqrt", () => {
    it("should return square root of positive numbers", () => {
      expect(ZPP_Math.sqrt(4)).toBe(2);
      expect(ZPP_Math.sqrt(9)).toBe(3);
      expect(ZPP_Math.sqrt(0)).toBe(0);
    });

    it("should return NaN for negative numbers", () => {
      expect(ZPP_Math.sqrt(-1)).toBeNaN();
    });
  });

  describe("invsqrt", () => {
    it("should return inverse square root", () => {
      expect(ZPP_Math.invsqrt(4)).toBe(0.5);
      expect(ZPP_Math.invsqrt(1)).toBe(1);
    });

    it("should return Infinity for 0", () => {
      expect(ZPP_Math.invsqrt(0)).toBe(Infinity);
    });
  });

  describe("sqr", () => {
    it("should return the square of a number", () => {
      expect(ZPP_Math.sqr(3)).toBe(9);
      expect(ZPP_Math.sqr(-5)).toBe(25);
      expect(ZPP_Math.sqr(0)).toBe(0);
    });
  });

  describe("clamp2", () => {
    it("should clamp within symmetric range [-a, a]", () => {
      expect(ZPP_Math.clamp2(5, 10)).toBe(5);
      expect(ZPP_Math.clamp2(-5, 10)).toBe(-5);
    });

    it("should clamp to upper bound", () => {
      expect(ZPP_Math.clamp2(15, 10)).toBe(10);
    });

    it("should clamp to lower bound", () => {
      expect(ZPP_Math.clamp2(-15, 10)).toBe(-10);
    });

    it("should handle boundary values", () => {
      expect(ZPP_Math.clamp2(10, 10)).toBe(10);
      expect(ZPP_Math.clamp2(-10, 10)).toBe(-10);
    });
  });

  describe("clamp", () => {
    it("should return value when within range", () => {
      expect(ZPP_Math.clamp(5, 0, 10)).toBe(5);
    });

    it("should clamp to minimum", () => {
      expect(ZPP_Math.clamp(-5, 0, 10)).toBe(0);
    });

    it("should clamp to maximum", () => {
      expect(ZPP_Math.clamp(15, 0, 10)).toBe(10);
    });

    it("should handle boundary values", () => {
      expect(ZPP_Math.clamp(0, 0, 10)).toBe(0);
      expect(ZPP_Math.clamp(10, 0, 10)).toBe(10);
    });
  });
});
