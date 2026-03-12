import { describe, it, expect } from "vitest";
import { ZPP_Geom } from "../../../src/native/geom/ZPP_Geom";

describe("ZPP_Geom", () => {
  describe("validateShape", () => {
    it("should be a static method", () => {
      expect(typeof ZPP_Geom.validateShape).toBe("function");
    });

    it("should skip validation for non-polygon shapes (type != 1)", () => {
      // type 0 = circle, should do nothing for polygon-specific code
      const shape = { type: 0 };
      expect(() => ZPP_Geom.validateShape(shape)).not.toThrow();
    });
  });
});
