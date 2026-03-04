import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_PartitionedPoly } from "../../../src/native/geom/ZPP_PartitionedPoly";

describe("ZPP_PartitionedPoly", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_PartitionedPoly.__name__).toEqual(["zpp_nape", "geom", "ZPP_PartitionedPoly"]);
    });
  });

  describe("instance methods", () => {
    it("should have init as an instance method", () => {
      const p = new ZPP_PartitionedPoly();
      expect(typeof p.init).toBe("function");
    });
  });
});
