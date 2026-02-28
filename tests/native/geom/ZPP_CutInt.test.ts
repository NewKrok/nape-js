import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_CutInt } from "../../../src/native/geom/ZPP_CutInt";

describe("ZPP_CutInt", () => {
  beforeEach(() => {
    ZPP_CutInt.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_CutInt.__name__).toEqual(["zpp_nape", "geom", "ZPP_CutInt"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const ci = new ZPP_CutInt();
      expect(ci.next).toBeNull();
      expect(ci.time).toBe(0.0);
      expect(ci.virtualint).toBe(false);
      expect(ci.vertex).toBe(false);
      expect(ci.path0).toBeNull();
      expect(ci.end).toBeNull();
      expect(ci.start).toBeNull();
      expect(ci.path1).toBeNull();
      expect(ci.__class__).toBe(ZPP_CutInt);
    });
  });

  describe("get (factory)", () => {
    it("should create a new instance when pool is empty", () => {
      const ci = ZPP_CutInt.get(0.5, "end", "start", "p0", "p1");
      expect(ci).toBeInstanceOf(ZPP_CutInt);
      expect(ci.time).toBe(0.5);
      expect(ci.end).toBe("end");
      expect(ci.start).toBe("start");
      expect(ci.path0).toBe("p0");
      expect(ci.path1).toBe("p1");
      expect(ci.virtualint).toBe(false);
      expect(ci.vertex).toBe(false);
    });

    it("should accept optional virtualint and vertex parameters", () => {
      const ci = ZPP_CutInt.get(1.0, "e", "s", "p0", "p1", true, true);
      expect(ci.virtualint).toBe(true);
      expect(ci.vertex).toBe(true);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_CutInt();
      ZPP_CutInt.zpp_pool = pooled;

      const ci = ZPP_CutInt.get(0.3, "e", "s", "p0", "p1");
      expect(ci).toBe(pooled);
      expect(ci.time).toBe(0.3);
      expect(ci.next).toBeNull();
      expect(ZPP_CutInt.zpp_pool).toBeNull();
    });

    it("should correctly unlink from pool chain", () => {
      const p1 = new ZPP_CutInt();
      const p2 = new ZPP_CutInt();
      p1.next = p2;
      ZPP_CutInt.zpp_pool = p1;

      const ci = ZPP_CutInt.get(0, "e", "s", "p0", "p1");
      expect(ci).toBe(p1);
      expect(ci.next).toBeNull();
      expect(ZPP_CutInt.zpp_pool).toBe(p2);
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const ci = new ZPP_CutInt();
      expect(() => ci.alloc()).not.toThrow();
    });
  });

  describe("free", () => {
    it("should null out end, start, path0, path1", () => {
      const ci = new ZPP_CutInt();
      ci.end = "e";
      ci.start = "s";
      ci.path0 = "p0";
      ci.path1 = "p1";
      ci.free();
      expect(ci.end).toBeNull();
      expect(ci.start).toBeNull();
      expect(ci.path0).toBeNull();
      expect(ci.path1).toBeNull();
    });
  });
});
