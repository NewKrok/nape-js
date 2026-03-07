import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_GeomVert } from "../../../src/native/geom/ZPP_GeomVert";

describe("ZPP_GeomVert", () => {
  beforeEach(() => {
    ZPP_GeomVert.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_GeomVert.__name__).toEqual(["zpp_nape", "geom", "ZPP_GeomVert"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const v = new ZPP_GeomVert();
      expect(v.x).toBe(0.0);
      expect(v.y).toBe(0.0);
      expect(v.next).toBeNull();
      expect(v.prev).toBeNull();
      expect(v.forced).toBe(false);
      expect(v.wrap).toBeNull();
    });
  });

  describe("get (factory)", () => {
    it("should create new instance when pool is empty", () => {
      const v = ZPP_GeomVert.get(5, 10);
      expect(v).toBeInstanceOf(ZPP_GeomVert);
      expect(v.x).toBe(5);
      expect(v.y).toBe(10);
      expect(v.forced).toBe(false);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_GeomVert();
      pooled.forced = true;
      ZPP_GeomVert.zpp_pool = pooled;

      const v = ZPP_GeomVert.get(3, 7);
      expect(v).toBe(pooled);
      expect(v.x).toBe(3);
      expect(v.y).toBe(7);
      expect(v.forced).toBe(false);
      expect(ZPP_GeomVert.zpp_pool).toBeNull();
    });

    it("should correctly unlink from pool chain", () => {
      const p1 = new ZPP_GeomVert();
      const p2 = new ZPP_GeomVert();
      p1.next = p2;
      ZPP_GeomVert.zpp_pool = p1;

      const v = ZPP_GeomVert.get(1, 2);
      expect(v).toBe(p1);
      expect(v.next).toBeNull();
      expect(ZPP_GeomVert.zpp_pool).toBe(p2);
    });
  });

  describe("free", () => {
    it("should clear prev/next pointers when wrap is null", () => {
      const v = new ZPP_GeomVert();
      const v2 = new ZPP_GeomVert();
      v.next = v2;
      v.prev = v2;
      v.free();
      expect(v.next).toBeNull();
      expect(v.prev).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const v = new ZPP_GeomVert();
      expect(() => v.alloc()).not.toThrow();
    });
  });

  describe("circular linked list", () => {
    it("should support building a circular ring", () => {
      const v1 = ZPP_GeomVert.get(0, 0);
      const v2 = ZPP_GeomVert.get(1, 0);
      const v3 = ZPP_GeomVert.get(0, 1);

      // Build circular ring manually
      v1.next = v2;
      v2.prev = v1;
      v2.next = v3;
      v3.prev = v2;
      v3.next = v1;
      v1.prev = v3;

      expect(v1.next).toBe(v2);
      expect(v2.next).toBe(v3);
      expect(v3.next).toBe(v1);
      expect(v1.prev).toBe(v3);
    });
  });
});
