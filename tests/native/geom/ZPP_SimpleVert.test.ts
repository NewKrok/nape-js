import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_SimpleVert } from "../../../src/native/geom/ZPP_SimpleVert";

describe("ZPP_SimpleVert", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_SimpleVert.__name__).toEqual([
        "zpp_nape",
        "geom",
        "ZPP_SimpleVert",
      ]);
    });
  });

  describe("less_xy", () => {
    it("should return true when a.y < b.y", () => {
      const a = { y: 1, x: 5 };
      const b = { y: 2, x: 3 };
      expect(ZPP_SimpleVert.less_xy(a, b)).toBe(true);
    });

    it("should return false when a.y > b.y", () => {
      const a = { y: 3, x: 1 };
      const b = { y: 2, x: 5 };
      expect(ZPP_SimpleVert.less_xy(a, b)).toBe(false);
    });

    it("should compare x when y values are equal", () => {
      const a = { y: 2, x: 1 };
      const b = { y: 2, x: 3 };
      expect(ZPP_SimpleVert.less_xy(a, b)).toBe(true);
    });

    it("should return false for identical points", () => {
      const a = { y: 2, x: 3 };
      const b = { y: 2, x: 3 };
      expect(ZPP_SimpleVert.less_xy(a, b)).toBe(false);
    });
  });

  describe("swap_nodes", () => {
    it("should swap node references between two objects", () => {
      const nodeA = { id: "A" };
      const nodeB = { id: "B" };
      const a = { node: nodeA };
      const b = { node: nodeB };
      ZPP_SimpleVert.swap_nodes(a, b);
      expect(a.node).toBe(nodeB);
      expect(b.node).toBe(nodeA);
    });
  });

  // Constructor and get() require getNape() engine initialization
  // Integration-level tests would cover those paths
});
