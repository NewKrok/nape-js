import { describe, it, expect } from "vitest";
import { ZPP_GeomPoly } from "../../../src/native/geom/ZPP_GeomPoly";

describe("ZPP_GeomPoly", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_GeomPoly.__name__).toEqual(["zpp_nape", "geom", "ZPP_GeomPoly"]);
    });
  });

  describe("constructor", () => {
    it("should initialize with default null outer", () => {
      const gp = new ZPP_GeomPoly();
      expect(gp.outer).toBeNull();
      expect(gp.vertices).toBeNull();
    });

    it("should accept an outer parameter", () => {
      const outerObj = { id: "test" };
      const gp = new ZPP_GeomPoly(outerObj);
      expect(gp.outer).toBe(outerObj);
    });

    it("should set __class__ to ZPP_GeomPoly", () => {
      const gp = new ZPP_GeomPoly();
      expect(gp.__class__).toBe(ZPP_GeomPoly);
    });
  });
});
