import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_Simplify } from "../../../src/native/geom/ZPP_Simplify";

describe("ZPP_Simplify", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Simplify.__name__).toEqual(["zpp_nape", "geom", "ZPP_Simplify"]);
    });
  });

  describe("lessval", () => {
    it("should return negative when a is less", () => {
      expect(ZPP_Simplify.lessval({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeLessThan(0);
    });

    it("should return positive when a is greater", () => {
      expect(ZPP_Simplify.lessval({ x: 2, y: 2 }, { x: 0, y: 0 })).toBeGreaterThan(0);
    });

    it("should return 0 for equal points", () => {
      expect(ZPP_Simplify.lessval({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
    });

    it("should combine x and y differences", () => {
      // (a.x - b.x) + (a.y - b.y) = (5 - 3) + (1 - 4) = 2 + (-3) = -1
      expect(ZPP_Simplify.lessval({ x: 5, y: 1 }, { x: 3, y: 4 })).toBe(-1);
    });
  });

  describe("less", () => {
    it("should return true when lessval < 0", () => {
      expect(ZPP_Simplify.less({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
    });

    it("should return false when lessval > 0", () => {
      expect(ZPP_Simplify.less({ x: 2, y: 2 }, { x: 0, y: 0 })).toBe(false);
    });

    it("should return false when equal", () => {
      expect(ZPP_Simplify.less({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(false);
    });
  });

  describe("distance", () => {
    it("should return 0 for point on segment start", () => {
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      expect(ZPP_Simplify.distance(a, a, b)).toBe(0);
    });

    it("should return 0 for point on segment end", () => {
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      expect(ZPP_Simplify.distance(b, a, b)).toBe(0);
    });

    it("should return squared perpendicular distance for point above horizontal segment", () => {
      const v = { x: 5, y: 3 };
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      // Perpendicular distance = 3, squared = 9
      expect(ZPP_Simplify.distance(v, a, b)).toBe(9);
    });

    it("should return squared distance to nearest endpoint when projection is before segment", () => {
      const v = { x: -3, y: 4 };
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      // t <= 0, so distance to a: sqrt(9+16) = 5, squared = 25
      expect(ZPP_Simplify.distance(v, a, b)).toBe(25);
    });

    it("should return squared distance to nearest endpoint when projection is past segment", () => {
      const v = { x: 13, y: 4 };
      const a = { x: 0, y: 0 };
      const b = { x: 10, y: 0 };
      // t >= 1, so distance to b: sqrt(9+16) = 5, squared = 25
      expect(ZPP_Simplify.distance(v, a, b)).toBe(25);
    });

    it("should handle zero-length segment", () => {
      const v = { x: 3, y: 4 };
      const a = { x: 0, y: 0 };
      // den = 0, returns distance to a: 9+16 = 25
      expect(ZPP_Simplify.distance(v, a, a)).toBe(25);
    });

    it("should handle diagonal segment", () => {
      const v = { x: 0, y: 1 };
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 1 };
      // segment from (0,0) to (1,1), point at (0,1)
      // n = (1,1), c = (0,1), den = 2, t = 1/2
      // cx = 0 - 1*0.5 = -0.5, cy = 1 - 1*0.5 = 0.5
      // dist_sq = 0.25 + 0.25 = 0.5
      expect(ZPP_Simplify.distance(v, a, b)).toBeCloseTo(0.5, 10);
    });
  });
});
