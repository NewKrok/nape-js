import { describe, it, expect } from "vitest";
import { ZPP_Vec3 } from "../../../src/native/geom/ZPP_Vec3";

describe("ZPP_Vec3", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Vec3.__name__).toEqual(["zpp_nape", "geom", "ZPP_Vec3"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const v = new ZPP_Vec3();
      expect(v.outer).toBeNull();
      expect(v.x).toBe(0.0);
      expect(v.y).toBe(0.0);
      expect(v.z).toBe(0.0);
      expect(v.immutable).toBe(false);
      expect(v._validate).toBeNull();
      expect(v.__class__).toBe(ZPP_Vec3);
    });
  });

  describe("validate", () => {
    it("should do nothing when _validate is null", () => {
      const v = new ZPP_Vec3();
      expect(() => v.validate()).not.toThrow();
    });

    it("should call _validate callback when set", () => {
      const v = new ZPP_Vec3();
      let called = false;
      v._validate = () => {
        called = true;
      };
      v.validate();
      expect(called).toBe(true);
    });
  });

  describe("_zpp static", () => {
    it("should have _zpp static property", () => {
      expect(ZPP_Vec3._zpp).toBeNull();
    });
  });
});
