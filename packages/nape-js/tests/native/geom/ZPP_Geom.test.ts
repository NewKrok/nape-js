import { describe, it, expect } from "vitest";
import { ZPP_Geom } from "../../../src/native/geom/ZPP_Geom";
import { ZPP_Shape } from "../../../src/native/shape/ZPP_Shape";

describe("ZPP_Geom", () => {
  describe("validateShape", () => {
    it("should be a static method", () => {
      expect(typeof ZPP_Geom.validateShape).toBe("function");
    });

    it("should skip validation for non-polygon shapes (type != 1)", () => {
      // type 0 = circle: the polygon-specific gaxi branch is skipped, and the
      // delegated ZPP_Shape validators are no-ops while the zip flags are clean.
      const shape = {
        type: 0,
        zip_aabb: false,
        zip_worldCOM: false,
        validate_aabb: ZPP_Shape.prototype.validate_aabb,
        validate_worldCOM: ZPP_Shape.prototype.validate_worldCOM,
      };
      expect(() => ZPP_Geom.validateShape(shape)).not.toThrow();
    });
  });
});
