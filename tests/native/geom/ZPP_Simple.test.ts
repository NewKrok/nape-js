import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_Simple } from "../../../src/native/geom/ZPP_Simple";

describe("ZPP_Simple", () => {
  describe("static methods", () => {
    it("should have decompose as a static method", () => {
      expect(typeof ZPP_Simple.decompose).toBe("function");
    });
  });
});
