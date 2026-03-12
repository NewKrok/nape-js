import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_SimplifyP } from "../../../src/native/geom/ZPP_SimplifyP";
import { ZPP_SimplifyV } from "../../../src/native/geom/ZPP_SimplifyV";

describe("ZPP_SimplifyP", () => {
  beforeEach(() => {
    ZPP_SimplifyP.zpp_pool = null;
    ZPP_SimplifyV.zpp_pool = null;
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const p = new ZPP_SimplifyP();
      expect(p.next).toBeNull();
      expect(p.min).toBeNull();
      expect(p.max).toBeNull();
    });
  });

  describe("get (factory)", () => {
    it("should create new instance when pool is empty", () => {
      const min = new ZPP_SimplifyV();
      const max = new ZPP_SimplifyV();
      const p = ZPP_SimplifyP.get(min, max);
      expect(p).toBeInstanceOf(ZPP_SimplifyP);
      expect(p.min).toBe(min);
      expect(p.max).toBe(max);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_SimplifyP();
      ZPP_SimplifyP.zpp_pool = pooled;

      const min = new ZPP_SimplifyV();
      const max = new ZPP_SimplifyV();
      const p = ZPP_SimplifyP.get(min, max);
      expect(p).toBe(pooled);
      expect(p.min).toBe(min);
      expect(p.max).toBe(max);
      expect(ZPP_SimplifyP.zpp_pool).toBeNull();
    });

    it("should correctly unlink from pool chain", () => {
      const p1 = new ZPP_SimplifyP();
      const p2 = new ZPP_SimplifyP();
      p1.next = p2;
      ZPP_SimplifyP.zpp_pool = p1;

      const min = new ZPP_SimplifyV();
      const max = new ZPP_SimplifyV();
      const p = ZPP_SimplifyP.get(min, max);
      expect(p).toBe(p1);
      expect(p.next).toBeNull();
      expect(ZPP_SimplifyP.zpp_pool).toBe(p2);
    });
  });

  describe("free", () => {
    it("should null out min and max", () => {
      const p = new ZPP_SimplifyP();
      p.min = new ZPP_SimplifyV();
      p.max = new ZPP_SimplifyV();
      p.free();
      expect(p.min).toBeNull();
      expect(p.max).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const p = new ZPP_SimplifyP();
      expect(() => p.alloc()).not.toThrow();
    });
  });
});
