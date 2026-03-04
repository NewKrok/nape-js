import { describe, it, expect } from "vitest";
import { ZPP_CopyHelper } from "../../../src/native/constraint/ZPP_CopyHelper";

describe("ZPP_CopyHelper", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_CopyHelper.__name__).toEqual(["zpp_nape", "constraint", "ZPP_CopyHelper"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize fields to defaults", () => {
      const h = new ZPP_CopyHelper();
      expect(h.id).toBe(0);
      expect(h.bc).toBeNull();
      expect(h.cb).toBeNull();
      expect(h.__class__).toBe(ZPP_CopyHelper);
    });
  });

  describe("dict", () => {
    it("should create a helper with id and bc set", () => {
      const body = { name: "body1" };
      const h = ZPP_CopyHelper.dict(42, body);
      expect(h).toBeInstanceOf(ZPP_CopyHelper);
      expect(h.id).toBe(42);
      expect(h.bc).toBe(body);
      expect(h.cb).toBeNull();
    });
  });

  describe("todo", () => {
    it("should create a helper with id and cb set", () => {
      const callback = () => {};
      const h = ZPP_CopyHelper.todo(7, callback);
      expect(h).toBeInstanceOf(ZPP_CopyHelper);
      expect(h.id).toBe(7);
      expect(h.cb).toBe(callback);
      expect(h.bc).toBeNull();
    });
  });

  describe("dict and todo are independent", () => {
    it("dict should not set cb", () => {
      const h = ZPP_CopyHelper.dict(1, "body");
      expect(h.cb).toBeNull();
    });

    it("todo should not set bc", () => {
      const h = ZPP_CopyHelper.todo(1, "fn");
      expect(h.bc).toBeNull();
    });
  });
});
