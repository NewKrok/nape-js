import { describe, it, expect } from "vitest";
import { ZPP_Convex } from "../../../src/native/geom/ZPP_Convex";

describe("ZPP_Convex", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Convex.__name__).toEqual([
        "zpp_nape",
        "geom",
        "ZPP_Convex",
      ]);
    });
  });

  describe("isinner", () => {
    it("should return false for a left turn (counter-clockwise)", () => {
      // (a-b)=(-1,0), (c-b)=(0,1), cross = 1*(-1) - 0*0 = -1 < 0
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 0 };
      const c = { x: 1, y: 1 };
      expect(ZPP_Convex.isinner(a, b, c)).toBe(false);
    });

    it("should return true for a right turn (clockwise)", () => {
      // (a-b)=(-1,0), (c-b)=(0,-1), cross = (-1)*(-1) - 0*0 = 1 >= 0
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 0 };
      const c = { x: 1, y: -1 };
      expect(ZPP_Convex.isinner(a, b, c)).toBe(true);
    });

    it("should return true for collinear points (cross product = 0)", () => {
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 1 };
      const c = { x: 2, y: 2 };
      expect(ZPP_Convex.isinner(a, b, c)).toBe(true);
    });

    it("should handle origin-centered triangle", () => {
      const a = { x: -1, y: 0 };
      const b = { x: 0, y: 0 };
      const c = { x: 0, y: 1 };
      // (a-b) = (-1, 0), (c-b) = (0, 1), cross = (-1)*1 - 0*0 = -1 < 0
      // Wait: vy * ux - vx * uy = 1*(-1) - 0*0 = -1, so false
      expect(ZPP_Convex.isinner(a, b, c)).toBe(false);
    });

    it("should handle negative coordinates", () => {
      const a = { x: -2, y: -1 };
      const b = { x: -1, y: -1 };
      const c = { x: -1, y: 0 };
      // ux=-1, uy=0, vx=0, vy=1 → 1*(-1) - 0*0 = -1 < 0
      expect(ZPP_Convex.isinner(a, b, c)).toBe(false);
    });
  });

  describe("optimise", () => {
    it("should handle polygon with no vertices (null)", () => {
      const P = { vertices: null };
      expect(() => ZPP_Convex.optimise(P)).not.toThrow();
    });

    it("should call sort on each vertex", () => {
      let sortCount = 0;
      const v1: any = {
        diagonals: { head: null },
        prev: null,
        next: null,
        sort: () => {
          sortCount++;
        },
      };
      v1.prev = v1;
      v1.next = v1;
      const P = { vertices: v1 };
      ZPP_Convex.optimise(P);
      expect(sortCount).toBe(1);
    });
  });
});
