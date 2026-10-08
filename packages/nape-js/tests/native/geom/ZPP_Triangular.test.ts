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
