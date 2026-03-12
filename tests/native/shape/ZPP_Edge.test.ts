import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_Edge } from "../../../src/native/shape/ZPP_Edge";
import { createMockZpp, createMockNape } from "../_mocks";

describe("ZPP_Edge", () => {
  beforeEach(() => {
    ZPP_Edge.zpp_pool = null;
    ZPP_Edge.internal = false;
    ZPP_Edge._wrapFn = null;
    ZPP_Edge._nape = createMockNape();
    ZPP_Edge._zpp = createMockZpp();
  });

  describe("constructor", () => {
    it("should initialize numeric fields to zero", () => {
      const e = new ZPP_Edge();
      expect(e.lnormx).toBe(0);
      expect(e.lnormy).toBe(0);
      expect(e.gnormx).toBe(0);
      expect(e.gnormy).toBe(0);
      expect(e.length).toBe(0);
      expect(e.lprojection).toBe(0);
      expect(e.gprojection).toBe(0);
    });

    it("should initialize reference fields to null", () => {
      const e = new ZPP_Edge();
      expect(e.polygon).toBeNull();
      expect(e.outer).toBeNull();
      expect(e.next).toBeNull();
      expect(e.wrap_lnorm).toBeNull();
      expect(e.wrap_gnorm).toBeNull();
      expect(e.lp0).toBeNull();
      expect(e.gp0).toBeNull();
      expect(e.lp1).toBeNull();
      expect(e.gp1).toBeNull();
    });
  });

  // --- Pool management ---

  describe("pool management", () => {
    it("should start with null pool", () => {
      expect(ZPP_Edge.zpp_pool).toBeNull();
    });

    it("should support pool chaining via next", () => {
      const a = new ZPP_Edge();
      const b = new ZPP_Edge();
      a.next = b;
      ZPP_Edge.zpp_pool = a;
      expect(ZPP_Edge.zpp_pool).toBe(a);
      expect(ZPP_Edge.zpp_pool.next).toBe(b);
    });

    it("should support pool allocation pattern", () => {
      const a = new ZPP_Edge();
      const b = new ZPP_Edge();
      a.next = b;
      ZPP_Edge.zpp_pool = a;

      // Simulate pool allocation
      const allocated = ZPP_Edge.zpp_pool;
      ZPP_Edge.zpp_pool = allocated.next;
      allocated.next = null;

      expect(allocated).toBe(a);
      expect(allocated.next).toBeNull();
      expect(ZPP_Edge.zpp_pool).toBe(b);
    });
  });

  // --- free / alloc ---

  describe("free", () => {
    it("should null out polygon reference", () => {
      const e = new ZPP_Edge();
      e.polygon = { id: "test-polygon" };
      e.free();
      expect(e.polygon).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const e = new ZPP_Edge();
      expect(() => e.alloc()).not.toThrow();
    });
  });

  // --- wrapper ---

  describe("wrapper", () => {
    it("should create wrapper using _wrapFn when available", () => {
      const mockOuter = { id: "outer-edge" };
      ZPP_Edge._wrapFn = () => mockOuter;
      const e = new ZPP_Edge();
      const w = e.wrapper();
      expect(w).toBe(mockOuter);
      expect(e.outer).toBe(mockOuter);
    });

    it("should return existing wrapper on second call", () => {
      const mockOuter = { id: "outer-edge" };
      ZPP_Edge._wrapFn = () => mockOuter;
      const e = new ZPP_Edge();
      const w1 = e.wrapper();
      const w2 = e.wrapper();
      expect(w1).toBe(w2);
    });

    it("should fall back to nape.shape.Edge when _wrapFn is null", () => {
      ZPP_Edge._wrapFn = null;
      const mockEdge = { zpp_inner: null as any };
      ZPP_Edge._nape = {
        shape: {
          Edge: function (this: any) {
            Object.assign(this, mockEdge);
          },
        },
      };
      ZPP_Edge.internal = false;
      const e = new ZPP_Edge();
      const w = e.wrapper();
      expect(w).toBeDefined();
      expect(ZPP_Edge.internal).toBe(false); // Reset after wrapper creation
    });
  });

  // --- lnorm_validate ---

  describe("lnorm_validate", () => {
    it("should throw if polygon is null", () => {
      const e = new ZPP_Edge();
      e.polygon = null;
      expect(() => e.lnorm_validate()).toThrow("Error: Edge not currently in use");
    });

    it("should call polygon.validate_laxi and update wrap_lnorm", () => {
      const e = new ZPP_Edge();
      let validated = false;
      e.polygon = {
        validate_laxi: () => {
          validated = true;
        },
      };
      e.lnormx = 0.5;
      e.lnormy = 0.8;
      e.wrap_lnorm = { zpp_inner: { x: 0, y: 0 } };
      e.lnorm_validate();
      expect(validated).toBe(true);
      expect(e.wrap_lnorm.zpp_inner.x).toBe(0.5);
      expect(e.wrap_lnorm.zpp_inner.y).toBe(0.8);
    });
  });

  // --- gnorm_validate ---

  describe("gnorm_validate", () => {
    it("should throw if polygon is null", () => {
      const e = new ZPP_Edge();
      e.polygon = null;
      expect(() => e.gnorm_validate()).toThrow("Error: Edge not currently in use");
    });

    it("should throw if polygon.body is null", () => {
      const e = new ZPP_Edge();
      e.polygon = { body: null };
      expect(() => e.gnorm_validate()).toThrow(
        "Error: Edge worldNormal only makes sense if the parent Polygon is contained within a rigid body",
      );
    });

    it("should call polygon.validate_gaxi and update wrap_gnorm", () => {
      const e = new ZPP_Edge();
      let validated = false;
      e.polygon = {
        body: {},
        validate_gaxi: () => {
          validated = true;
        },
      };
      e.gnormx = 1.0;
      e.gnormy = 0.0;
      e.wrap_gnorm = { zpp_inner: { x: 0, y: 0 } };
      e.gnorm_validate();
      expect(validated).toBe(true);
      expect(e.wrap_gnorm.zpp_inner.x).toBe(1.0);
      expect(e.wrap_gnorm.zpp_inner.y).toBe(0.0);
    });
  });

  // --- getlnorm / getgnorm ---

  describe("getlnorm", () => {
    it("should create wrap_lnorm Vec2 from pool", () => {
      const innerVec = {
        weak: false,
        _immutable: false,
        x: 0,
        y: 0,
        outer: null as any,
        next: null,
      };
      ZPP_Edge._zpp = {
        ...createMockZpp(),
        util: { ...createMockZpp().util, ZPP_PubPool: { poolVec2: null, nextVec2: null } },
        geom: { ZPP_Vec2: { zpp_pool: innerVec } },
      };
      const outerVec = { zpp_inner: null as any, zpp_pool: null, zpp_disp: false };
      ZPP_Edge._nape = {
        geom: {
          Vec2: function (this: any) {
            Object.assign(this, outerVec);
          },
        },
      };

      const e = new ZPP_Edge();
      e.lnormx = 3;
      e.lnormy = 4;
      e.getlnorm();
      expect(e.wrap_lnorm).toBeDefined();
      expect(e.wrap_lnorm.zpp_inner._immutable).toBe(true);
    });

    it("should throw on NaN values", () => {
      const e = new ZPP_Edge();
      e.lnormx = NaN;
      e.lnormy = 0;
      expect(() => e.getlnorm()).toThrow("Error: Vec2 components cannot be NaN");
    });
  });

  describe("getgnorm", () => {
    it("should throw on NaN values", () => {
      const e = new ZPP_Edge();
      e.gnormx = 0;
      e.gnormy = NaN;
      expect(() => e.getgnorm()).toThrow("Error: Vec2 components cannot be NaN");
    });
  });
});
