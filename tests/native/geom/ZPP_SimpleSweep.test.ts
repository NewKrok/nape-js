import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_SimpleSweep } from "../../../src/native/geom/ZPP_SimpleSweep";

describe("ZPP_SimpleSweep", () => {
  describe("__name__ (static, no engine needed)", () => {
    it("should not exist as instance-only class", () => {
      // ZPP_SimpleSweep requires engine init (getNape()) in constructor
      // We can only test static properties that don't require construction
      expect(ZPP_SimpleSweep).toBeDefined();
    });
  });

  describe("edge_lt logic (unit tests via standalone instances)", () => {
    // edge_lt is an instance method that performs geometric comparisons
    // Testing the intersection/intersect static logic would require engine initialization
    // We test what we can without the engine
    it("class should be exported and constructable type", () => {
      expect(typeof ZPP_SimpleSweep).toBe("function");
    });
  });
});
