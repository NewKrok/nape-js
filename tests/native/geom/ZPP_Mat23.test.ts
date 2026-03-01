import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_Mat23 } from "../../../src/native/geom/ZPP_Mat23";

describe("ZPP_Mat23", () => {
  beforeEach(() => {
    ZPP_Mat23.zpp_pool = null;
    ZPP_Mat23._nape = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Mat23.__name__).toEqual(["zpp_nape", "geom", "ZPP_Mat23"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const m = new ZPP_Mat23();
      expect(m.outer).toBeNull();
      expect(m.a).toBe(0.0);
      expect(m.b).toBe(0.0);
      expect(m.c).toBe(0.0);
      expect(m.d).toBe(0.0);
      expect(m.tx).toBe(0.0);
      expect(m.ty).toBe(0.0);
      expect(m._invalidate).toBeNull();
      expect(m.next).toBeNull();
      expect(m.__class__).toBe(ZPP_Mat23);
    });
  });

  describe("get (factory)", () => {
    it("should create new instance when pool is empty", () => {
      const m = ZPP_Mat23.get();
      expect(m).toBeInstanceOf(ZPP_Mat23);
    });

    it("should reuse from pool", () => {
      const pooled = new ZPP_Mat23();
      ZPP_Mat23.zpp_pool = pooled;
      const m = ZPP_Mat23.get();
      expect(m).toBe(pooled);
      expect(m.next).toBeNull();
      expect(ZPP_Mat23.zpp_pool).toBeNull();
    });

    it("should unlink from pool chain", () => {
      const p1 = new ZPP_Mat23();
      const p2 = new ZPP_Mat23();
      p1.next = p2;
      ZPP_Mat23.zpp_pool = p1;
      const m = ZPP_Mat23.get();
      expect(m).toBe(p1);
      expect(ZPP_Mat23.zpp_pool).toBe(p2);
    });
  });

  describe("identity", () => {
    it("should create identity matrix", () => {
      const m = ZPP_Mat23.identity();
      expect(m.a).toBe(1);
      expect(m.b).toBe(0);
      expect(m.c).toBe(0);
      expect(m.d).toBe(1);
      expect(m.tx).toBe(0);
      expect(m.ty).toBe(0);
    });
  });

  describe("wrapper", () => {
    it("should create wrapper and return it", () => {
      ZPP_Mat23._nape = {
        geom: {
          Mat23: class {
            zpp_inner: any = { next: null };
          },
        },
      };

      const m = new ZPP_Mat23();
      const w = m.wrapper();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(m);
    });

    it("should return existing outer when already set", () => {
      const m = new ZPP_Mat23();
      const mockOuter = { id: "existing" };
      m.outer = mockOuter;
      expect(m.wrapper()).toBe(mockOuter);
    });
  });

  describe("invalidate", () => {
    it("should do nothing when _invalidate is null", () => {
      const m = new ZPP_Mat23();
      expect(() => m.invalidate()).not.toThrow();
    });

    it("should call _invalidate when set", () => {
      const m = new ZPP_Mat23();
      let called = false;
      m._invalidate = () => {
        called = true;
      };
      m.invalidate();
      expect(called).toBe(true);
    });
  });

  describe("set", () => {
    it("should copy all values from another matrix", () => {
      const src = new ZPP_Mat23();
      src.a = 1;
      src.b = 2;
      src.c = 3;
      src.d = 4;
      src.tx = 5;
      src.ty = 6;

      const dst = new ZPP_Mat23();
      dst.set(src);
      expect(dst.a).toBe(1);
      expect(dst.b).toBe(2);
      expect(dst.c).toBe(3);
      expect(dst.d).toBe(4);
      expect(dst.tx).toBe(5);
      expect(dst.ty).toBe(6);
    });
  });

  describe("setas", () => {
    it("should set all components", () => {
      const m = new ZPP_Mat23();
      m.setas(1, 2, 3, 4, 5, 6);
      expect(m.a).toBe(1);
      expect(m.b).toBe(2);
      expect(m.c).toBe(3);
      expect(m.d).toBe(4);
      expect(m.tx).toBe(5);
      expect(m.ty).toBe(6);
    });
  });

  describe("free / alloc", () => {
    it("should be callable (no-ops)", () => {
      const m = new ZPP_Mat23();
      expect(() => m.free()).not.toThrow();
      expect(() => m.alloc()).not.toThrow();
    });
  });
});
