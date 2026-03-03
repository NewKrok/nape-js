import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_Ray } from "../../../src/native/geom/ZPP_Ray";

describe("ZPP_Ray", () => {
  describe("class", () => {
    it("should be exported and constructable type", () => {
      expect(typeof ZPP_Ray).toBe("function");
    });
  });

  // ZPP_Ray constructor requires getNape() engine initialization
  // Full integration tests would exercise raycast methods
});
