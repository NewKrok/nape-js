import { describe, it, expect } from "vitest";
import { ZPP_Const } from "../../../src/native/util/ZPP_Const";

describe("ZPP_Const", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Const.__name__).toEqual(["zpp_nape", "ZPP_Const"]);
    });
  });

  describe("FMAX", () => {
    it("should be 1e100", () => {
      expect(ZPP_Const.FMAX).toBe(1e100);
    });
  });

  describe("POSINF", () => {
    it("should return positive Infinity", () => {
      expect(ZPP_Const.POSINF()).toBe(Infinity);
    });
  });

  describe("NEGINF", () => {
    it("should return negative Infinity", () => {
      expect(ZPP_Const.NEGINF()).toBe(-Infinity);
    });
  });
});
