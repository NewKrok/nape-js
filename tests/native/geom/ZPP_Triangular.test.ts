import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_Triangular } from "../../../src/native/geom/ZPP_Triangular";

describe("ZPP_Triangular", () => {
  describe("lt", () => {
    it("should return true when p.y < q.y", () => {
      expect(ZPP_Triangular.lt({ x: 5, y: 1 }, { x: 3, y: 2 })).toBe(true);
    });

    it("should return false when p.y > q.y", () => {
      expect(ZPP_Triangular.lt({ x: 1, y: 3 }, { x: 5, y: 2 })).toBe(false);
    });

    it("should compare x when y values are equal", () => {
      expect(ZPP_Triangular.lt({ x: 1, y: 2 }, { x: 3, y: 2 })).toBe(true);
    });

    it("should return false for identical points", () => {
      expect(ZPP_Triangular.lt({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(false);
    });
  });

  describe("right_turn", () => {
    it("should return positive number for clockwise turn", () => {
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 0 };
      const c = { x: 1, y: -1 };
      expect(ZPP_Triangular.right_turn(a, b, c)).toBeGreaterThan(0);
    });

    it("should return negative number for counter-clockwise turn", () => {
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 0 };
      const c = { x: 1, y: 1 };
      expect(ZPP_Triangular.right_turn(a, b, c)).toBeLessThan(0);
    });

    it("should return 0 for collinear points", () => {
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 0 };
      const c = { x: 2, y: 0 };
      expect(ZPP_Triangular.right_turn(a, b, c)).toBe(0);
    });
  });

  describe("delaunay", () => {
    it("should be a static method", () => {
      expect(typeof ZPP_Triangular.delaunay).toBe("function");
    });
  });

  describe("triangulate", () => {
    it("should be a static method", () => {
      expect(typeof ZPP_Triangular.triangulate).toBe("function");
    });
  });

  describe("optimise", () => {
    it("should be a static method", () => {
      expect(typeof ZPP_Triangular.optimise).toBe("function");
    });
  });
});
