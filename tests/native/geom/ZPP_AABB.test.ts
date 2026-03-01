import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_AABB } from "../../../src/native/geom/ZPP_AABB";

describe("ZPP_AABB", () => {
  beforeEach(() => {
    ZPP_AABB.zpp_pool = null;
    ZPP_AABB._nape = null;
    ZPP_AABB._zpp = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_AABB.__name__).toEqual(["zpp_nape", "geom", "ZPP_AABB"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields", () => {
      const a = new ZPP_AABB();
      expect(a.minx).toBe(0.0);
      expect(a.miny).toBe(0.0);
      expect(a.maxx).toBe(0.0);
      expect(a.maxy).toBe(0.0);
      expect(a._invalidate).toBeNull();
      expect(a._validate).toBeNull();
      expect(a._immutable).toBe(false);
      expect(a.outer).toBeNull();
      expect(a.next).toBeNull();
      expect(a.wrap_min).toBeNull();
      expect(a.wrap_max).toBeNull();
      expect(a.__class__).toBe(ZPP_AABB);
    });
  });

  describe("get (factory)", () => {
    it("should create with specified bounds", () => {
      const a = ZPP_AABB.get(1, 2, 3, 4);
      expect(a.minx).toBe(1);
      expect(a.miny).toBe(2);
      expect(a.maxx).toBe(3);
      expect(a.maxy).toBe(4);
    });

    it("should reuse from pool", () => {
      const pooled = new ZPP_AABB();
      ZPP_AABB.zpp_pool = pooled;
      const a = ZPP_AABB.get(10, 20, 30, 40);
      expect(a).toBe(pooled);
      expect(a.minx).toBe(10);
      expect(ZPP_AABB.zpp_pool).toBeNull();
    });

    it("should unlink from pool chain", () => {
      const p1 = new ZPP_AABB();
      const p2 = new ZPP_AABB();
      p1.next = p2;
      ZPP_AABB.zpp_pool = p1;
      const a = ZPP_AABB.get(0, 0, 1, 1);
      expect(a).toBe(p1);
      expect(a.next).toBeNull();
      expect(ZPP_AABB.zpp_pool).toBe(p2);
    });
  });

  describe("validate", () => {
    it("should do nothing when _validate is null", () => {
      const a = new ZPP_AABB();
      expect(() => a.validate()).not.toThrow();
    });

    it("should call _validate when set", () => {
      const a = new ZPP_AABB();
      let called = false;
      a._validate = () => {
        called = true;
      };
      a.validate();
      expect(called).toBe(true);
    });
  });

  describe("invalidate", () => {
    it("should do nothing when _invalidate is null", () => {
      const a = new ZPP_AABB();
      expect(() => a.invalidate()).not.toThrow();
    });

    it("should call _invalidate with self when set", () => {
      const a = new ZPP_AABB();
      let received: any = null;
      a._invalidate = (self) => {
        received = self;
      };
      a.invalidate();
      expect(received).toBe(a);
    });
  });

  describe("wrapper", () => {
    it("should return existing outer when set", () => {
      const a = new ZPP_AABB();
      const mockOuter = { id: "test" };
      a.outer = mockOuter;
      expect(a.wrapper()).toBe(mockOuter);
    });

    it("should create wrapper via _nape when outer is null", () => {
      const innerAABB = new ZPP_AABB();
      innerAABB.outer = { id: "old" };
      ZPP_AABB._nape = {
        geom: {
          AABB: class {
            zpp_inner: any = innerAABB;
          },
        },
      };

      const a = new ZPP_AABB();
      const w = a.wrapper();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(a);
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const a = new ZPP_AABB();
      expect(() => a.alloc()).not.toThrow();
    });
  });

  describe("free", () => {
    it("should null out outer and wrappers", () => {
      const a = new ZPP_AABB();
      a.outer = { zpp_inner: a };
      a.wrap_min = { id: "min" };
      a.wrap_max = { id: "max" };
      a._invalidate = () => {};
      a._validate = () => {};

      a.free();
      expect(a.outer).toBeNull();
      expect(a.wrap_min).toBeNull();
      expect(a.wrap_max).toBeNull();
      expect(a._invalidate).toBeNull();
      expect(a._validate).toBeNull();
    });

    it("should disconnect outer.zpp_inner", () => {
      const a = new ZPP_AABB();
      const outer: any = { zpp_inner: a };
      a.outer = outer;
      a.free();
      expect(outer.zpp_inner).toBeNull();
    });

    it("should handle null outer", () => {
      const a = new ZPP_AABB();
      expect(() => a.free()).not.toThrow();
    });
  });

  describe("copy", () => {
    it("should create a copy with same bounds", () => {
      const a = ZPP_AABB.get(1, 2, 3, 4);
      const c = a.copy();
      expect(c.minx).toBe(1);
      expect(c.miny).toBe(2);
      expect(c.maxx).toBe(3);
      expect(c.maxy).toBe(4);
      expect(c).not.toBe(a);
    });
  });

  describe("width", () => {
    it("should return maxx - minx", () => {
      const a = ZPP_AABB.get(1, 0, 5, 0);
      expect(a.width()).toBe(4);
    });
  });

  describe("height", () => {
    it("should return maxy - miny", () => {
      const a = ZPP_AABB.get(0, 2, 0, 7);
      expect(a.height()).toBe(5);
    });
  });

  describe("perimeter", () => {
    it("should return 2*(width+height)", () => {
      const a = ZPP_AABB.get(0, 0, 3, 4);
      expect(a.perimeter()).toBe(14);
    });
  });

  describe("intersectX", () => {
    it("should return true for overlapping X ranges", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      const b = ZPP_AABB.get(5, 0, 15, 10);
      expect(a.intersectX(b)).toBe(true);
    });

    it("should return false for non-overlapping X ranges", () => {
      const a = ZPP_AABB.get(0, 0, 5, 10);
      const b = ZPP_AABB.get(6, 0, 10, 10);
      expect(a.intersectX(b)).toBe(false);
    });

    it("should return true for touching X ranges", () => {
      const a = ZPP_AABB.get(0, 0, 5, 10);
      const b = ZPP_AABB.get(5, 0, 10, 10);
      expect(a.intersectX(b)).toBe(true);
    });
  });

  describe("intersectY", () => {
    it("should return true for overlapping Y ranges", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      const b = ZPP_AABB.get(0, 5, 10, 15);
      expect(a.intersectY(b)).toBe(true);
    });

    it("should return false for non-overlapping Y ranges", () => {
      const a = ZPP_AABB.get(0, 0, 10, 5);
      const b = ZPP_AABB.get(0, 6, 10, 10);
      expect(a.intersectY(b)).toBe(false);
    });
  });

  describe("intersect", () => {
    it("should return true for overlapping AABBs", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      const b = ZPP_AABB.get(5, 5, 15, 15);
      expect(a.intersect(b)).toBe(true);
    });

    it("should return false when only X overlaps", () => {
      const a = ZPP_AABB.get(0, 0, 10, 5);
      const b = ZPP_AABB.get(5, 6, 15, 15);
      expect(a.intersect(b)).toBe(false);
    });

    it("should return false when only Y overlaps", () => {
      const a = ZPP_AABB.get(0, 0, 5, 10);
      const b = ZPP_AABB.get(6, 5, 15, 15);
      expect(a.intersect(b)).toBe(false);
    });

    it("should return false for completely separated AABBs", () => {
      const a = ZPP_AABB.get(0, 0, 1, 1);
      const b = ZPP_AABB.get(5, 5, 6, 6);
      expect(a.intersect(b)).toBe(false);
    });
  });

  describe("combine", () => {
    it("should expand to include both AABBs", () => {
      const a = ZPP_AABB.get(2, 3, 5, 6);
      const b = ZPP_AABB.get(1, 2, 7, 8);
      a.combine(b);
      expect(a.minx).toBe(1);
      expect(a.miny).toBe(2);
      expect(a.maxx).toBe(7);
      expect(a.maxy).toBe(8);
    });

    it("should not shrink when other is contained", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      const b = ZPP_AABB.get(2, 2, 8, 8);
      a.combine(b);
      expect(a.minx).toBe(0);
      expect(a.miny).toBe(0);
      expect(a.maxx).toBe(10);
      expect(a.maxy).toBe(10);
    });
  });

  describe("contains", () => {
    it("should return true when other is inside", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      const b = ZPP_AABB.get(2, 2, 8, 8);
      expect(a.contains(b)).toBe(true);
    });

    it("should return true when same bounds", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      const b = ZPP_AABB.get(0, 0, 10, 10);
      expect(a.contains(b)).toBe(true);
    });

    it("should return false when other exceeds", () => {
      const a = ZPP_AABB.get(2, 2, 8, 8);
      const b = ZPP_AABB.get(0, 0, 10, 10);
      expect(a.contains(b)).toBe(false);
    });
  });

  describe("containsPoint", () => {
    it("should return true for point inside", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      expect(a.containsPoint({ x: 5, y: 5 })).toBe(true);
    });

    it("should return true for point on edge", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      expect(a.containsPoint({ x: 0, y: 0 })).toBe(true);
      expect(a.containsPoint({ x: 10, y: 10 })).toBe(true);
    });

    it("should return false for point outside", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      expect(a.containsPoint({ x: -1, y: 5 })).toBe(false);
      expect(a.containsPoint({ x: 5, y: 11 })).toBe(false);
    });
  });

  describe("setCombine", () => {
    it("should set bounds to combined AABB of a and b", () => {
      const target = new ZPP_AABB();
      const a = ZPP_AABB.get(0, 0, 5, 5);
      const b = ZPP_AABB.get(3, 3, 10, 10);
      target.setCombine(a, b);
      expect(target.minx).toBe(0);
      expect(target.miny).toBe(0);
      expect(target.maxx).toBe(10);
      expect(target.maxy).toBe(10);
    });
  });

  describe("setExpand", () => {
    it("should expand by fatten amount", () => {
      const target = new ZPP_AABB();
      const a = ZPP_AABB.get(5, 5, 10, 10);
      target.setExpand(a, 2);
      expect(target.minx).toBe(3);
      expect(target.miny).toBe(3);
      expect(target.maxx).toBe(12);
      expect(target.maxy).toBe(12);
    });
  });

  describe("setExpandPoint", () => {
    it("should expand to include point below min", () => {
      const a = ZPP_AABB.get(5, 5, 10, 10);
      a.setExpandPoint(2, 3);
      expect(a.minx).toBe(2);
      expect(a.miny).toBe(3);
    });

    it("should expand to include point above max", () => {
      const a = ZPP_AABB.get(5, 5, 10, 10);
      a.setExpandPoint(12, 13);
      expect(a.maxx).toBe(12);
      expect(a.maxy).toBe(13);
    });

    it("should not change when point is inside", () => {
      const a = ZPP_AABB.get(0, 0, 10, 10);
      a.setExpandPoint(5, 5);
      expect(a.minx).toBe(0);
      expect(a.miny).toBe(0);
      expect(a.maxx).toBe(10);
      expect(a.maxy).toBe(10);
    });
  });

  describe("toString", () => {
    it("should return formatted string", () => {
      const a = ZPP_AABB.get(1, 2, 4, 6);
      expect(a.toString()).toBe("{ x: 1 y: 2 w: 3 h: 4 }");
    });
  });

  describe("getmin / dom_min / mod_min", () => {
    it("should create min wrapper with validation and invalidation", () => {
      // Setup mock namespaces
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(1, 2, 5, 6);
      a.getmin();
      expect(a.wrap_min).not.toBeNull();
      expect(a.wrap_min.zpp_inner._inuse).toBe(true);
    });

    it("should not recreate wrapper on second call", () => {
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(1, 2, 5, 6);
      a.getmin();
      const firstWrap = a.wrap_min;
      a.getmin();
      expect(a.wrap_min).toBe(firstWrap);
    });

    it("dom_min should sync wrapper with bounds", () => {
      const a = new ZPP_AABB();
      a.minx = 10;
      a.miny = 20;
      a.wrap_min = {
        zpp_inner: { x: 0, y: 0 },
      };
      a.dom_min();
      expect(a.wrap_min.zpp_inner.x).toBe(10);
      expect(a.wrap_min.zpp_inner.y).toBe(20);
    });

    it("dom_min should call _validate first", () => {
      const a = new ZPP_AABB();
      a.minx = 10;
      a.miny = 20;
      a.wrap_min = { zpp_inner: { x: 0, y: 0 } };
      let validateCalled = false;
      a._validate = () => {
        validateCalled = true;
      };
      a.dom_min();
      expect(validateCalled).toBe(true);
    });

    it("mod_min should update bounds and call _invalidate", () => {
      const a = new ZPP_AABB();
      a.minx = 0;
      a.miny = 0;
      let invalidated = false;
      a._invalidate = () => {
        invalidated = true;
      };
      a.mod_min({ x: 5, y: 6 });
      expect(a.minx).toBe(5);
      expect(a.miny).toBe(6);
      expect(invalidated).toBe(true);
    });

    it("mod_min should not call _invalidate when values unchanged", () => {
      const a = new ZPP_AABB();
      a.minx = 5;
      a.miny = 6;
      let invalidated = false;
      a._invalidate = () => {
        invalidated = true;
      };
      a.mod_min({ x: 5, y: 6 });
      expect(invalidated).toBe(false);
    });
  });

  describe("getmax / dom_max / mod_max", () => {
    it("should create max wrapper", () => {
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(1, 2, 5, 6);
      a.getmax();
      expect(a.wrap_max).not.toBeNull();
      expect(a.wrap_max.zpp_inner._inuse).toBe(true);
    });

    it("should not recreate wrapper on second call", () => {
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(1, 2, 5, 6);
      a.getmax();
      const firstWrap = a.wrap_max;
      a.getmax();
      expect(a.wrap_max).toBe(firstWrap);
    });

    it("should mark immutable when AABB is immutable", () => {
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(0, 0, 10, 10);
      a._immutable = true;
      a.getmax();
      expect(a.wrap_max.zpp_inner._immutable).toBe(true);
    });

    it("dom_max should sync wrapper with bounds", () => {
      const a = new ZPP_AABB();
      a.maxx = 30;
      a.maxy = 40;
      a.wrap_max = { zpp_inner: { x: 0, y: 0 } };
      a.dom_max();
      expect(a.wrap_max.zpp_inner.x).toBe(30);
      expect(a.wrap_max.zpp_inner.y).toBe(40);
    });

    it("dom_max should call _validate first", () => {
      const a = new ZPP_AABB();
      a.wrap_max = { zpp_inner: { x: 0, y: 0 } };
      let called = false;
      a._validate = () => {
        called = true;
      };
      a.dom_max();
      expect(called).toBe(true);
    });

    it("mod_max should update bounds and call _invalidate", () => {
      const a = new ZPP_AABB();
      a.maxx = 0;
      a.maxy = 0;
      let invalidated = false;
      a._invalidate = () => {
        invalidated = true;
      };
      a.mod_max({ x: 10, y: 20 });
      expect(a.maxx).toBe(10);
      expect(a.maxy).toBe(20);
      expect(invalidated).toBe(true);
    });

    it("mod_max should not call _invalidate when values unchanged", () => {
      const a = new ZPP_AABB();
      a.maxx = 10;
      a.maxy = 20;
      let invalidated = false;
      a._invalidate = () => {
        invalidated = true;
      };
      a.mod_max({ x: 10, y: 20 });
      expect(invalidated).toBe(false);
    });
  });

  describe("getmin with immutable AABB", () => {
    it("should set _immutable on wrapper when AABB is immutable", () => {
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(0, 0, 10, 10);
      a._immutable = true;
      a.getmin();
      expect(a.wrap_min.zpp_inner._immutable).toBe(true);
    });
  });

  describe("_makeVec2Wrapper pool reuse paths", () => {
    it("should throw for NaN components", () => {
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: { zpp_pool: null },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(0, 0, 10, 10);
      // NaN min values trigger the NaN check at line 133-134
      a.minx = NaN;
      a.miny = 0;
      expect(() => a.getmin()).toThrow("Error: Vec2 components cannot be NaN");
    });

    it("should reuse pooled Vec2 and advance the pool chain", () => {
      const pooledVec2: any = {
        zpp_inner: null,
        zpp_pool: null,
        zpp_disp: false,
      };
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: pooledVec2, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(3, 4, 10, 10);
      a.getmin();
      expect(a.wrap_min).toBe(pooledVec2);
      expect(a.wrap_min.zpp_inner.x).toBe(3);
      expect(a.wrap_min.zpp_inner.y).toBe(4);
    });

    it("should clear nextVec2 when pooled item matches nextVec2", () => {
      const pooledVec2: any = {
        zpp_inner: null,
        zpp_pool: null,
        zpp_disp: false,
      };
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: pooledVec2, nextVec2: pooledVec2 },
        },
        geom: {
          ZPP_Vec2: class {
            static zpp_pool: any = null;
            x = 0;
            y = 0;
            weak = false;
            _immutable = false;
            _isimmutable: any = null;
            _validate: any = null;
            _invalidate: any = null;
            _inuse = false;
            outer: any = null;
            next: any = null;
          },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(1, 2, 5, 6);
      a.getmin();
      expect(ZPP_AABB._zpp.util.ZPP_PubPool.nextVec2).toBeNull();
    });

    it("should reuse inner Vec2 from pool chain", () => {
      const innerPooled: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: false,
        _isimmutable: null,
        _validate: null,
        _invalidate: null,
        _inuse: false,
        outer: null,
        next: null,
      };
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: { zpp_pool: innerPooled },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(7, 8, 10, 10);
      a.getmin();
      expect(a.wrap_min.zpp_inner).toBe(innerPooled);
      expect(innerPooled.x).toBe(7);
      expect(innerPooled.y).toBe(8);
      expect(ZPP_AABB._zpp.geom.ZPP_Vec2.zpp_pool).toBeNull();
    });

    it("should reuse existing zpp_inner with _isimmutable and _validate callbacks", () => {
      let isimmutableCalled = false;
      let validateCalled = false;
      let invalidateCalled = false;
      const existingInner: any = {
        x: 0,
        y: 0,
        weak: false,
        _immutable: false,
        _isimmutable: () => {
          isimmutableCalled = true;
        },
        _validate: () => {
          validateCalled = true;
        },
        _invalidate: () => {
          invalidateCalled = true;
        },
        _inuse: false,
        outer: null,
      };
      const pooledVec2: any = {
        zpp_inner: existingInner,
        zpp_pool: null,
        zpp_disp: false,
      };
      existingInner.outer = pooledVec2;
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: pooledVec2, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: { zpp_pool: null },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(5, 6, 10, 10);
      a.getmin();
      expect(isimmutableCalled).toBe(true);
      expect(validateCalled).toBe(true);
      expect(invalidateCalled).toBe(true);
      expect(existingInner.x).toBe(5);
      expect(existingInner.y).toBe(6);
    });

    it("should not invalidate when values unchanged on existing inner", () => {
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
      const pooledVec2: any = {
        zpp_inner: existingInner,
        zpp_pool: null,
        zpp_disp: false,
      };
      existingInner.outer = pooledVec2;
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: pooledVec2, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: { zpp_pool: null },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = null;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(5, 6, 10, 10);
      a.getmin();
      expect(invalidateCalled).toBe(false);
      expect(existingInner.x).toBe(5);
      expect(existingInner.y).toBe(6);
    });

    it("should throw when existing inner is immutable (via new Vec2 path)", () => {
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
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: { zpp_pool: null },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = existingInner;
            zpp_pool: any = null;
            zpp_disp = false;
          },
        },
      };

      const a = ZPP_AABB.get(1, 2, 5, 6);
      expect(() => a.getmin()).toThrow("Error: Vec2 is immutable");
    });

    it("should throw when existing inner is disposed (via new Vec2 path)", () => {
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
      ZPP_AABB._zpp = {
        util: {
          ZPP_PubPool: { poolVec2: null, nextVec2: null },
        },
        geom: {
          ZPP_Vec2: { zpp_pool: null },
        },
      };
      ZPP_AABB._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any = existingInner;
            zpp_pool: any = null;
            zpp_disp = true; // disposed
          },
        },
      };

      const a = ZPP_AABB.get(1, 2, 5, 6);
      expect(() => a.getmin()).toThrow("Error: Vec2 has been disposed and cannot be used!");
    });
  });
});
