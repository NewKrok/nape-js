import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_Cutter } from "../../../src/native/geom/ZPP_Cutter";

describe("ZPP_Cutter", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Cutter.__name__).toEqual([
        "zpp_nape",
        "geom",
        "ZPP_Cutter",
      ]);
    });
  });

  describe("run", () => {
    it("should be a static method", () => {
      expect(typeof ZPP_Cutter.run).toBe("function");
    });
  });
});
