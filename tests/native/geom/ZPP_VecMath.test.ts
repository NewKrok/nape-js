import { describe, it, expect } from "vitest";
import { ZPP_VecMath } from "../../../src/native/geom/ZPP_VecMath";

describe("ZPP_VecMath", () => {
  describe("vec_dsq", () => {
    it("should return 0 for identical points", () => {
      expect(ZPP_VecMath.vec_dsq(3, 4, 3, 4)).toBe(0);
    });

    it("should return squared distance for unit horizontal", () => {
      expect(ZPP_VecMath.vec_dsq(0, 0, 1, 0)).toBe(1);
    });

    it("should return squared distance for unit vertical", () => {
      expect(ZPP_VecMath.vec_dsq(0, 0, 0, 1)).toBe(1);
    });

    it("should return correct squared distance for 3-4-5 triangle", () => {
      expect(ZPP_VecMath.vec_dsq(0, 0, 3, 4)).toBe(25);
    });

    it("should be commutative", () => {
      expect(ZPP_VecMath.vec_dsq(1, 2, 5, 7)).toBe(ZPP_VecMath.vec_dsq(5, 7, 1, 2));
    });

    it("should handle negative coordinates", () => {
      expect(ZPP_VecMath.vec_dsq(-1, -1, 2, 3)).toBe(25);
    });
  });

  describe("vec_distance", () => {
    it("should return 0 for identical points", () => {
      expect(ZPP_VecMath.vec_distance(3, 4, 3, 4)).toBe(0);
    });

    it("should return 5 for 3-4-5 triangle", () => {
      expect(ZPP_VecMath.vec_distance(0, 0, 3, 4)).toBe(5);
    });

    it("should return 1 for unit distance", () => {
      expect(ZPP_VecMath.vec_distance(0, 0, 1, 0)).toBe(1);
    });

    it("should be commutative", () => {
      expect(ZPP_VecMath.vec_distance(1, 2, 5, 7)).toBe(ZPP_VecMath.vec_distance(5, 7, 1, 2));
    });

    it("should equal sqrt of vec_dsq", () => {
      const dsq = ZPP_VecMath.vec_dsq(1, 2, 4, 6);
      expect(ZPP_VecMath.vec_distance(1, 2, 4, 6)).toBe(Math.sqrt(dsq));
    });
  });
});
