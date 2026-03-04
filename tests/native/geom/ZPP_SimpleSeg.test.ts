import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_SimpleSeg } from "../../../src/native/geom/ZPP_SimpleSeg";

describe("ZPP_SimpleSeg", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_SimpleSeg.__name__).toEqual(["zpp_nape", "geom", "ZPP_SimpleSeg"]);
    });
  });

  describe("less_xy (instance method)", () => {
    it("should return true when a.x < b.x", () => {
      // less_xy is a prototype method, test it directly
      const seg = Object.create(ZPP_SimpleSeg.prototype);
      expect(seg.less_xy({ x: 1, y: 5 }, { x: 2, y: 3 })).toBe(true);
    });

    it("should return false when a.x > b.x", () => {
      const seg = Object.create(ZPP_SimpleSeg.prototype);
      expect(seg.less_xy({ x: 3, y: 1 }, { x: 2, y: 5 })).toBe(false);
    });

    it("should compare y when x values are equal", () => {
      const seg = Object.create(ZPP_SimpleSeg.prototype);
      expect(seg.less_xy({ x: 2, y: 1 }, { x: 2, y: 3 })).toBe(true);
    });

    it("should return false for identical points", () => {
      const seg = Object.create(ZPP_SimpleSeg.prototype);
      expect(seg.less_xy({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(false);
    });
  });

  // Constructor and get() require getNape() engine initialization
  // Integration-level tests would cover those paths
});
