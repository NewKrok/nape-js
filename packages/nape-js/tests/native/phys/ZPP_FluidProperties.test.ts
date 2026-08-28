import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_FluidProperties } from "../../../src/native/phys/ZPP_FluidProperties";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";
import { ZPP_PubPool } from "../../../src/native/util/ZPP_PubPool";
import { ZNPList_ZPP_Shape } from "../../../src/native/util/ZNPRegistry";
import { createMockNape } from "../_mocks";

describe("ZPP_FluidProperties", () => {
  beforeEach(() => {
    ZPP_FluidProperties.zpp_pool = null;
    // ZPP_FluidProperties now imports ZNPList_ZPP_Shape, ZPP_PubPool and
    // ZPP_Vec2 directly; only _nape (public Vec2/FluidProperties construction)
    // is still read from the namespace statics.
    ZPP_FluidProperties._nape = createMockNape();
    // Reset the real pool statics the engine reads/writes so tests stay isolated.
    ZPP_PubPool.poolVec2 = null;
    ZPP_PubPool.nextVec2 = null;
    ZPP_Vec2.zpp_pool = null;
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      const fp = new ZPP_FluidProperties();
      expect(fp.viscosity).toBe(1);
      expect(fp.density).toBe(1);
      expect(fp.gravityx).toBe(0);
      expect(fp.gravityy).toBe(0);
      expect(fp.wrap_gravity).toBeNull();
    });

    it("should create shapes list", () => {
      const fp = new ZPP_FluidProperties();
      expect(fp.shapes).toBeInstanceOf(ZNPList_ZPP_Shape);
    });

    it("should initialize other fields", () => {
      const fp = new ZPP_FluidProperties();
      expect(fp.outer).toBeNull();
      expect(fp.userData).toBeNull();
      expect(fp.next).toBeNull();
    });
  });

  describe("wrapper", () => {
    it("should create wrapper when outer is null", () => {
      const fp = new ZPP_FluidProperties();
      const w = fp.wrapper();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(fp);
    });

    it("should return existing wrapper", () => {
      const fp = new ZPP_FluidProperties();
      const w1 = fp.wrapper();
      const w2 = fp.wrapper();
      expect(w1).toBe(w2);
    });
  });

  describe("free", () => {
    it("should null out outer", () => {
      const fp = new ZPP_FluidProperties();
      fp.outer = { id: "test" };
      fp.free();
      expect(fp.outer).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const fp = new ZPP_FluidProperties();
      expect(() => fp.alloc()).not.toThrow();
    });
  });

  describe("feature_cons", () => {
    it("should reinitialize shapes list", () => {
      const fp = new ZPP_FluidProperties();
      const original = fp.shapes;
      fp.feature_cons();
      expect(fp.shapes).not.toBe(original);
    });
  });

  describe("addShape / remShape", () => {
    it("should add and remove shapes", () => {
      const fp = new ZPP_FluidProperties();
      const shape = { id: "s1" };
      fp.addShape(shape);
      expect(fp.shapes.has(shape)).toBe(true);
      fp.remShape(shape);
      expect(fp.shapes.has(shape)).toBe(false);
    });
  });

  describe("copy", () => {
    it("should create a copy with same viscosity and density", () => {
      const fp = new ZPP_FluidProperties();
      fp.viscosity = 5;
      fp.density = 10;
      const c = fp.copy();
      expect(c).not.toBe(fp);
      expect(c.viscosity).toBe(5);
      expect(c.density).toBe(10);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_FluidProperties();
      ZPP_FluidProperties.zpp_pool = pooled;

      const fp = new ZPP_FluidProperties();
      fp.viscosity = 2;
      fp.density = 3;
      const c = fp.copy();
      expect(c).toBe(pooled);
      expect(c.viscosity).toBe(2);
      expect(c.density).toBe(3);
      expect(c.next).toBeNull();
    });

    it("should unlink from pool chain", () => {
      const p1 = new ZPP_FluidProperties();
      const p2 = new ZPP_FluidProperties();
      p1.next = p2;
      ZPP_FluidProperties.zpp_pool = p1;

      const fp = new ZPP_FluidProperties();
      const c = fp.copy();
      expect(c).toBe(p1);
      expect(ZPP_FluidProperties.zpp_pool).toBe(p2);
    });
  });

  describe("gravity_invalidate", () => {
    it("should update gravityx/y from Vec2 and call invalidate", () => {
      const fp = new ZPP_FluidProperties();
      const calls: any[] = [];
      const shape = { invalidate_fluidprops: () => calls.push(true) };
      fp.addShape(shape);

      fp.gravity_invalidate({ x: 5, y: -10 });
      expect(fp.gravityx).toBe(5);
      expect(fp.gravityy).toBe(-10);
      expect(calls.length).toBe(1);
    });
  });

  describe("gravity_validate", () => {
    it("should sync wrapper Vec2 with internal gravity values", () => {
      const fp = new ZPP_FluidProperties();
      fp.gravityx = 3;
      fp.gravityy = 4;
      fp.wrap_gravity = { zpp_inner: { x: 0, y: 0 } };
      fp.gravity_validate();
      expect(fp.wrap_gravity.zpp_inner.x).toBe(3);
      expect(fp.wrap_gravity.zpp_inner.y).toBe(4);
    });
  });

  describe("getgravity", () => {
    it("should create gravity Vec2 wrapper", () => {
      const fp = new ZPP_FluidProperties();
      fp.gravityx = 1;
      fp.gravityy = 2;
      fp.getgravity();
      expect(fp.wrap_gravity).not.toBeNull();
      expect(fp.wrap_gravity.zpp_inner._inuse).toBe(true);
    });

    it("should use pool when available", () => {
      const nape = ZPP_FluidProperties._nape;
      const mockVec2: any = new nape.geom.Vec2();
      mockVec2.zpp_pool = null;
      mockVec2.zpp_disp = false;
      ZPP_PubPool.poolVec2 = mockVec2;

      const fp = new ZPP_FluidProperties();
      fp.getgravity();
      expect(fp.wrap_gravity).toBe(mockVec2);
      expect(ZPP_PubPool.poolVec2).toBeNull();
    });

    it("should clear nextVec2 when pooled item matches", () => {
      const nape = ZPP_FluidProperties._nape;
      const mockVec2: any = new nape.geom.Vec2();
      mockVec2.zpp_pool = null;
      mockVec2.zpp_disp = false;
      ZPP_PubPool.poolVec2 = mockVec2;
      ZPP_PubPool.nextVec2 = mockVec2;

      const fp = new ZPP_FluidProperties();
      fp.getgravity();
      expect(ZPP_PubPool.nextVec2).toBeNull();
    });

    it("should reuse existing zpp_inner when available on pooled Vec2", () => {
      const nape = ZPP_FluidProperties._nape;
      const mockVec2: any = new nape.geom.Vec2();
      mockVec2.zpp_pool = null;
      mockVec2.zpp_disp = false;
      const existingInner: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: false,
        _isimmutable: null,
        _validate: null,
        _invalidate: null,
        _inuse: false,
        outer: mockVec2,
      };
      mockVec2.zpp_inner = existingInner;
      ZPP_PubPool.poolVec2 = mockVec2;

      const fp = new ZPP_FluidProperties();
      fp.gravityx = 7;
      fp.gravityy = 8;
      fp.getgravity();
      expect(fp.wrap_gravity.zpp_inner.x).toBe(7);
      expect(fp.wrap_gravity.zpp_inner.y).toBe(8);
    });
  });

  describe("invalidate", () => {
    it("should call invalidate_fluidprops on all shapes", () => {
      const fp = new ZPP_FluidProperties();
      const calls: boolean[] = [];
      fp.addShape({ invalidate_fluidprops: () => calls.push(true) });
      fp.addShape({ invalidate_fluidprops: () => calls.push(true) });
      fp.invalidate();
      expect(calls.length).toBe(2);
    });

    it("should do nothing when no shapes", () => {
      const fp = new ZPP_FluidProperties();
      expect(() => fp.invalidate()).not.toThrow();
    });
  });

  describe("getgravity (inner Vec2 pool chain and existing inner paths)", () => {
    it("should throw for NaN gravity components", () => {
      const fp = new ZPP_FluidProperties();
      fp.gravityx = NaN;
      fp.gravityy = 0;
      expect(() => fp.getgravity()).toThrow("Vec2 components cannot be NaN");
    });

    it("should create new inner Vec2 when both pool and inner pool are empty", () => {
      const nape = ZPP_FluidProperties._nape;
      // Both pools empty, Vec2 constructor yields zpp_inner = null
      ZPP_PubPool.poolVec2 = null;
      ZPP_Vec2.zpp_pool = null;

      nape.geom.Vec2 = class {
        zpp_inner: any = null;
        zpp_pool: any = null;
        zpp_disp = false;
      };

      const fp = new ZPP_FluidProperties();
      fp.gravityx = 9;
      fp.gravityy = 10;
      fp.getgravity();
      expect(fp.wrap_gravity).not.toBeNull();
      expect(fp.wrap_gravity.zpp_inner.x).toBe(9);
      expect(fp.wrap_gravity.zpp_inner.y).toBe(10);
    });

    it("should reuse inner Vec2 from pool chain", () => {
      const nape = ZPP_FluidProperties._nape;
      // Seed the real inner Vec2 pool with a real ZPP_Vec2 instance.
      const innerPooled = new ZPP_Vec2();
      ZPP_Vec2.zpp_pool = innerPooled;

      // Override Vec2 constructor to produce zpp_inner = null so the inner pool path is taken
      nape.geom.Vec2 = class {
        zpp_inner: any = null;
        zpp_pool: any = null;
        zpp_disp = false;
      };

      const fp = new ZPP_FluidProperties();
      fp.gravityx = 3;
      fp.gravityy = 4;
      fp.getgravity();
      expect(fp.wrap_gravity.zpp_inner).toBe(innerPooled);
      expect(innerPooled.x).toBe(3);
      expect(innerPooled.y).toBe(4);
      expect(ZPP_Vec2.zpp_pool).toBeNull();
    });

    it("should call _isimmutable on existing inner when set", () => {
      const nape = ZPP_FluidProperties._nape;
      let isimmutableCalled = false;
      const existingInner: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: false,
        _isimmutable: () => {
          isimmutableCalled = true;
        },
        _validate: null,
        _invalidate: null,
        _inuse: false,
        outer: null,
      };
      const mockVec2: any = new nape.geom.Vec2();
      mockVec2.zpp_inner = existingInner;
      mockVec2.zpp_pool = null;
      mockVec2.zpp_disp = false;
      existingInner.outer = mockVec2;
      ZPP_PubPool.poolVec2 = mockVec2;

      const fp = new ZPP_FluidProperties();
      fp.gravityx = 5;
      fp.gravityy = 6;
      fp.getgravity();
      expect(isimmutableCalled).toBe(true);
    });

    it("should call _validate on existing inner when set", () => {
      const nape = ZPP_FluidProperties._nape;
      let validateCalled = false;
      const existingInner: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: false,
        _isimmutable: null,
        _validate: () => {
          validateCalled = true;
        },
        _invalidate: null,
        _inuse: false,
        outer: null,
      };
      const mockVec2: any = new nape.geom.Vec2();
      mockVec2.zpp_inner = existingInner;
      mockVec2.zpp_pool = null;
      mockVec2.zpp_disp = false;
      existingInner.outer = mockVec2;
      ZPP_PubPool.poolVec2 = mockVec2;

      const fp = new ZPP_FluidProperties();
      fp.gravityx = 5;
      fp.gravityy = 6;
      fp.getgravity();
      expect(validateCalled).toBe(true);
    });

    it("should call _invalidate on existing inner when values change", () => {
      const nape = ZPP_FluidProperties._nape;
      let invalidateCalled = false;
      const existingInner: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: false,
        _isimmutable: null,
        _validate: null,
        _invalidate: () => {
          invalidateCalled = true;
        },
        _inuse: false,
        outer: null,
      };
      const mockVec2: any = new nape.geom.Vec2();
      mockVec2.zpp_inner = existingInner;
      mockVec2.zpp_pool = null;
      mockVec2.zpp_disp = false;
      existingInner.outer = mockVec2;
      ZPP_PubPool.poolVec2 = mockVec2;

      const fp = new ZPP_FluidProperties();
      fp.gravityx = 7;
      fp.gravityy = 8;
      fp.getgravity();
      expect(invalidateCalled).toBe(true);
      expect(existingInner.x).toBe(7);
      expect(existingInner.y).toBe(8);
    });

    it("should not call _invalidate when values are unchanged on existing inner", () => {
      const nape = ZPP_FluidProperties._nape;
      let invalidateCalled = false;
      const existingInner: any = {
        x: 5,
        y: 6,
        weak: false,
        _immutable: false,
        _isimmutable: null,
        _validate: null,
        _invalidate: () => {
          invalidateCalled = true;
        },
        _inuse: false,
        outer: null,
      };
      const mockVec2: any = new nape.geom.Vec2();
      mockVec2.zpp_inner = existingInner;
      mockVec2.zpp_pool = null;
      mockVec2.zpp_disp = false;
      existingInner.outer = mockVec2;
      ZPP_PubPool.poolVec2 = mockVec2;

      const fp = new ZPP_FluidProperties();
      fp.gravityx = 5;
      fp.gravityy = 6;
      fp.getgravity();
      expect(invalidateCalled).toBe(false);
    });

    it("should throw when existing inner is disposed (via new Vec2 path)", () => {
      const nape = ZPP_FluidProperties._nape;
      // Use non-pool path: poolVec2 = null, Vec2 constructor creates disposed vec with existing inner
      ZPP_PubPool.poolVec2 = null;
      const existingInner: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: false,
        _isimmutable: null,
        _validate: null,
        _invalidate: null,
        _inuse: false,
        outer: null,
      };
      nape.geom.Vec2 = class {
        zpp_inner: any = existingInner;
        zpp_pool: any = null;
        zpp_disp = true; // disposed
      };

      const fp = new ZPP_FluidProperties();
      expect(() => fp.getgravity()).toThrow("Vec2 has been disposed and cannot be used!");
    });

    it("should throw when existing inner is immutable (via new Vec2 path)", () => {
      const nape = ZPP_FluidProperties._nape;
      // Use non-pool path with immutable inner
      ZPP_PubPool.poolVec2 = null;
      const existingInner: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: true,
        _isimmutable: null,
        _validate: null,
        _invalidate: null,
        _inuse: false,
        outer: null,
      };
      nape.geom.Vec2 = class {
        zpp_inner: any = existingInner;
        zpp_pool: any = null;
        zpp_disp = false;
      };

      const fp = new ZPP_FluidProperties();
      expect(() => fp.getgravity()).toThrow("Vec2 is immutable");
    });
  });
});
