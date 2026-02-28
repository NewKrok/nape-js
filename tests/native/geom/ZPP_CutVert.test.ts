import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_CutVert } from "../../../src/native/geom/ZPP_CutVert";

describe("ZPP_CutVert", () => {
  beforeEach(() => {
    ZPP_CutVert.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_CutVert.__name__).toEqual(["zpp_nape", "geom", "ZPP_CutVert"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const v = new ZPP_CutVert();
      expect(v.prev).toBeNull();
      expect(v.next).toBeNull();
      expect(v.posx).toBe(0.0);
      expect(v.posy).toBe(0.0);
      expect(v.vert).toBeNull();
      expect(v.value).toBe(0.0);
      expect(v.positive).toBe(false);
      expect(v.parent).toBeNull();
      expect(v.rank).toBe(0);
      expect(v.used).toBe(false);
      expect(v.__class__).toBe(ZPP_CutVert);
    });
  });

  describe("path (factory)", () => {
    it("should create a new instance when pool is empty", () => {
      const poly = { id: "poly1" };
      const v = ZPP_CutVert.path(poly);
      expect(v).toBeInstanceOf(ZPP_CutVert);
      expect(v.vert).toBe(poly);
      expect(v.parent).toBe(v);
      expect(v.rank).toBe(0);
      expect(v.used).toBe(false);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_CutVert();
      pooled.posx = 99;
      ZPP_CutVert.zpp_pool = pooled;

      const poly = { id: "poly2" };
      const v = ZPP_CutVert.path(poly);
      expect(v).toBe(pooled);
      expect(v.vert).toBe(poly);
      expect(v.next).toBeNull();
      expect(ZPP_CutVert.zpp_pool).toBeNull();
    });

    it("should correctly unlink from pool chain", () => {
      const p1 = new ZPP_CutVert();
      const p2 = new ZPP_CutVert();
      p1.next = p2;
      ZPP_CutVert.zpp_pool = p1;

      const v = ZPP_CutVert.path({ id: "a" });
      expect(v).toBe(p1);
      expect(v.next).toBeNull();
      expect(ZPP_CutVert.zpp_pool).toBe(p2);
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const v = new ZPP_CutVert();
      expect(() => v.alloc()).not.toThrow();
    });
  });

  describe("free", () => {
    it("should null out vert and parent", () => {
      const v = new ZPP_CutVert();
      v.vert = { id: "x" };
      v.parent = v;
      v.free();
      expect(v.vert).toBeNull();
      expect(v.parent).toBeNull();
    });
  });
});
