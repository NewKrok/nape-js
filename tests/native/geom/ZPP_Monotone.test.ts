import { describe, it, expect } from "vitest";
// Import engine first to break circular dependency
import "../../../src/core/engine";
import { ZPP_Monotone } from "../../../src/native/geom/ZPP_Monotone";

describe("ZPP_Monotone", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Monotone.__name__).toEqual(["zpp_nape", "geom", "ZPP_Monotone"]);
    });
  });

  describe("static methods", () => {
    it("should have decompose as a static method", () => {
      expect(typeof ZPP_Monotone.decompose).toBe("function");
    });
  });
});
