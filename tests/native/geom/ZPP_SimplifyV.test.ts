import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_SimplifyV } from "../../../src/native/geom/ZPP_SimplifyV";

describe("ZPP_SimplifyV", () => {
  beforeEach(() => {
    ZPP_SimplifyV.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_SimplifyV.__name__).toEqual([
        "zpp_nape",
        "geom",
        "ZPP_SimplifyV",
      ]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const v = new ZPP_SimplifyV();
      expect(v.x).toBe(0.0);
      expect(v.y).toBe(0.0);
      expect(v.next).toBeNull();
      expect(v.prev).toBeNull();
      expect(v.flag).toBe(false);
      expect(v.forced).toBe(false);
      expect(v.__class__).toBe(ZPP_SimplifyV);
    });
  });

  describe("get (factory)", () => {
    it("should create new instance when pool is empty", () => {
      const v = ZPP_SimplifyV.get({ x: 10, y: 20 });
      expect(v).toBeInstanceOf(ZPP_SimplifyV);
      expect(v.x).toBe(10);
      expect(v.y).toBe(20);
      expect(v.flag).toBe(false);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_SimplifyV();
      pooled.flag = true;
      ZPP_SimplifyV.zpp_pool = pooled;

      const v = ZPP_SimplifyV.get({ x: 5, y: 6 });
      expect(v).toBe(pooled);
      expect(v.x).toBe(5);
      expect(v.y).toBe(6);
      expect(v.flag).toBe(false);
      expect(ZPP_SimplifyV.zpp_pool).toBeNull();
    });

    it("should correctly unlink from pool chain", () => {
      const p1 = new ZPP_SimplifyV();
      const p2 = new ZPP_SimplifyV();
      p1.next = p2;
      ZPP_SimplifyV.zpp_pool = p1;

      const v = ZPP_SimplifyV.get({ x: 1, y: 2 });
      expect(v).toBe(p1);
      expect(v.next).toBeNull();
      expect(ZPP_SimplifyV.zpp_pool).toBe(p2);
    });
  });

  describe("free", () => {
    it("should be callable (no-op)", () => {
      const v = new ZPP_SimplifyV();
      expect(() => v.free()).not.toThrow();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const v = new ZPP_SimplifyV();
      expect(() => v.alloc()).not.toThrow();
    });
  });
});
