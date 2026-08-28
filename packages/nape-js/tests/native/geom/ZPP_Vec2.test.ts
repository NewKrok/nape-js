import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";

describe("ZPP_Vec2", () => {
  beforeEach(() => {
    ZPP_Vec2.zpp_pool = null;
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const v = new ZPP_Vec2();
      expect(v.x).toBe(0.0);
      expect(v.y).toBe(0.0);
      expect(v.next).toBeNull();
      expect(v.length).toBe(0);
      expect(v.modified).toBe(false);
      expect(v.pushmod).toBe(false);
      expect(v._inuse).toBe(false);
      expect(v.weak).toBe(false);
      expect(v.outer).toBeNull();
      expect(v._immutable).toBe(false);
      expect(v._isimmutable).toBeNull();
      expect(v._validate).toBeNull();
      expect(v._invalidate).toBeNull();
    });
  });

  describe("get (factory)", () => {
    it("should create new instance when pool is empty", () => {
      const v = ZPP_Vec2.get(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
      expect(v.weak).toBe(false);
      expect(v._immutable).toBe(false);
    });

    it("should accept immutable parameter", () => {
      const v = ZPP_Vec2.get(1, 2, true);
      expect(v._immutable).toBe(true);
    });

    it("should default immutable to false", () => {
      const v = ZPP_Vec2.get(1, 2);
      expect(v._immutable).toBe(false);
    });

    it("should reuse from pool", () => {
      const pooled = new ZPP_Vec2();
      ZPP_Vec2.zpp_pool = pooled;
      const v = ZPP_Vec2.get(5, 6);
      expect(v).toBe(pooled);
      expect(v.x).toBe(5);
      expect(v.y).toBe(6);
      expect(v.next).toBeNull();
      expect(ZPP_Vec2.zpp_pool).toBeNull();
    });

    it("should unlink from pool chain", () => {
      const p1 = new ZPP_Vec2();
      const p2 = new ZPP_Vec2();
      p1.next = p2;
      ZPP_Vec2.zpp_pool = p1;
      const v = ZPP_Vec2.get(1, 1);
      expect(v).toBe(p1);
      expect(ZPP_Vec2.zpp_pool).toBe(p2);
    });
  });

  describe("validate", () => {
    it("should do nothing when _validate is null", () => {
      const v = new ZPP_Vec2();
      expect(() => v.validate()).not.toThrow();
    });

    it("should call _validate when set", () => {
      const v = new ZPP_Vec2();
      let called = false;
      v._validate = () => {
        called = true;
      };
      v.validate();
      expect(called).toBe(true);
    });
  });

  describe("invalidate", () => {
    it("should do nothing when _invalidate is null", () => {
      const v = new ZPP_Vec2();
      expect(() => v.invalidate()).not.toThrow();
    });

    it("should call _invalidate with self when set", () => {
      const v = new ZPP_Vec2();
      let receivedSelf: any = null;
      v._invalidate = (self) => {
        receivedSelf = self;
      };
      v.invalidate();
      expect(receivedSelf).toBe(v);
    });
  });

  describe("immutable", () => {
    it("should throw when _immutable is true", () => {
      const v = new ZPP_Vec2();
      v._immutable = true;
      expect(() => v.immutable()).toThrow("Vec2 is immutable");
    });

    it("should call _isimmutable when set and not immutable", () => {
      const v = new ZPP_Vec2();
      let called = false;
      v._isimmutable = () => {
        called = true;
      };
      v.immutable();
      expect(called).toBe(true);
    });

    it("should do nothing when both _immutable false and _isimmutable null", () => {
      const v = new ZPP_Vec2();
      expect(() => v.immutable()).not.toThrow();
    });
  });

  describe("wrapper", () => {
    it("should create wrapper via _nape when outer is null", () => {
      const mockOuter: any = {};
      const mockInner = new ZPP_Vec2();
      mockInner.outer = mockOuter;
      mockOuter.zpp_inner = mockInner;

      ZPP_Vec2._nape = {
        geom: {
          Vec2: class {
            zpp_inner: any;
            constructor() {
              this.zpp_inner = mockInner;
            }
          },
        },
      };

      const v = new ZPP_Vec2();
      v.x = 10;
      v.y = 20;
      const w = v.wrapper();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(v);

      // Clean up
      ZPP_Vec2._nape = null;
    });

    it("should return existing outer when already set", () => {
      const v = new ZPP_Vec2();
      const mockOuter = { id: "existing" };
      v.outer = mockOuter;
      expect(v.wrapper()).toBe(mockOuter);
    });
  });

  describe("free", () => {
    it("should null out outer and callbacks", () => {
      const v = new ZPP_Vec2();
      v.outer = { zpp_inner: v };
      v._isimmutable = () => {};
      v._validate = () => {};
      v._invalidate = () => {};

      v.free();

      expect(v.outer).toBeNull();
      expect(v._isimmutable).toBeNull();
      expect(v._validate).toBeNull();
      expect(v._invalidate).toBeNull();
    });

    it("should disconnect outer.zpp_inner", () => {
      const v = new ZPP_Vec2();
      const outer: any = { zpp_inner: v };
      v.outer = outer;
      v.free();
      expect(outer.zpp_inner).toBeNull();
    });

    it("should handle null outer gracefully", () => {
      const v = new ZPP_Vec2();
      expect(() => v.free()).not.toThrow();
    });
  });

  describe("alloc", () => {
    it("should set weak to false", () => {
      const v = new ZPP_Vec2();
      v.weak = true;
      v.alloc();
      expect(v.weak).toBe(false);
    });
  });

  describe("copy", () => {
    it("should create a copy with same x,y", () => {
      const v = new ZPP_Vec2();
      v.x = 7;
      v.y = 8;
      const c = v.copy();
      expect(c.x).toBe(7);
      expect(c.y).toBe(8);
      expect(c).not.toBe(v);
      expect(c.weak).toBe(false);
      expect(c._immutable).toBe(false);
    });

    it("should reuse from pool when available", () => {
      const pooled = new ZPP_Vec2();
      ZPP_Vec2.zpp_pool = pooled;
      const v = new ZPP_Vec2();
      v.x = 3;
      v.y = 4;
      const c = v.copy();
      expect(c).toBe(pooled);
      expect(c.x).toBe(3);
      expect(c.y).toBe(4);
    });
  });

  describe("toString", () => {
    it("should return formatted string", () => {
      const v = new ZPP_Vec2();
      v.x = 1.5;
      v.y = 2.5;
      expect(v.toString()).toBe("{ x: 1.5 y: 2.5 }");
    });
  });

  // ========== Linked List Operations ==========
  describe("begin", () => {
    it("should return next (head)", () => {
      const list = new ZPP_Vec2();
      const item = new ZPP_Vec2();
      list.next = item;
      expect(list.begin()).toBe(item);
    });

    it("should return null when empty", () => {
      const list = new ZPP_Vec2();
      expect(list.begin()).toBeNull();
    });
  });
  describe("add", () => {
    it("should add to front of list", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();

      list.add(a);
      expect(list.next).toBe(a);
      expect(list.length).toBe(1);
      expect(a._inuse).toBe(true);

      list.add(b);
      expect(list.next).toBe(b);
      expect(b.next).toBe(a);
      expect(list.length).toBe(2);
    });

    it("should return the added object", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      expect(list.add(a)).toBe(a);
    });
  });

  describe("add", () => {
    it("should behave same as add", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const result = list.add(a);
      expect(result).toBe(a);
      expect(list.next).toBe(a);
      expect(list.length).toBe(1);
      expect(a._inuse).toBe(true);
    });
  });
  describe("insert", () => {
    it("should insert at head when cur is null", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      list.next = a;
      list.length = 1;

      list.insert(null, b);
      expect(list.next).toBe(b);
      expect(b.next).toBe(a);
      expect(list.length).toBe(2);
    });

    it("should insert after cur", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const c = new ZPP_Vec2();
      list.next = a;
      list.length = 1;

      list.insert(a, c);
      expect(a.next).toBe(c);
      expect(list.length).toBe(2);
    });

    it("should return inserted object", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      expect(list.insert(null, a)).toBe(a);
    });
  });

  describe("insert", () => {
    it("should insert at head when cur is null", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      list.insert(null, a);
      expect(list.next).toBe(a);
      expect(list.length).toBe(1);
    });

    it("should insert after cur", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      list.next = a;
      list.length = 1;
      list.insert(a, b);
      expect(a.next).toBe(b);
      expect(list.length).toBe(2);
    });
  });

  describe("pop", () => {
    it("should remove front item", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      a.next = b;
      list.length = 2;

      list.pop();
      expect(list.next).toBe(b);
      expect(a._inuse).toBe(false);
      expect(list.length).toBe(1);
    });

    it("should set pushmod when list becomes empty", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;

      list.pop();
      expect(list.next).toBeNull();
      expect(list.pushmod).toBe(true);
      expect(list.length).toBe(0);
    });
  });

  describe("pop", () => {
    it("should behave same as pop", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;
      list.pop();
      expect(list.next).toBeNull();
      expect(a._inuse).toBe(false);
      expect(list.pushmod).toBe(true);
    });
  });

  describe("pop_unsafe", () => {
    it("should remove and return front item", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;

      const ret = list.pop_unsafe();
      expect(ret).toBe(a);
      expect(list.next).toBeNull();
    });
  });

  describe("pop_unsafe", () => {
    it("should remove and return front item", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;
      const ret = list.pop_unsafe();
      expect(ret).toBe(a);
    });
  });

  describe("remove", () => {
    it("should remove head element", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;
      list.remove(a);
      expect(list.next).toBeNull();
      expect(a._inuse).toBe(false);
      expect(list.length).toBe(0);
    });

    it("should remove middle element", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      const c = new ZPP_Vec2();
      a._inuse = b._inuse = c._inuse = true;
      list.next = a;
      a.next = b;
      b.next = c;
      list.length = 3;

      list.remove(b);
      expect(a.next).toBe(c);
      expect(b._inuse).toBe(false);
      expect(list.length).toBe(2);
    });

    it("should remove last element", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      a._inuse = b._inuse = true;
      list.next = a;
      a.next = b;
      list.length = 2;

      list.remove(b);
      expect(a.next).toBeNull();
      expect(list.length).toBe(1);
      expect(list.pushmod).toBe(true);
    });

    it("should do nothing when item not found", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const notInList = new ZPP_Vec2();
      list.next = a;
      list.length = 1;
      list.remove(notInList);
      expect(list.length).toBe(1);
    });
  });

  describe("remove", () => {
    it("should remove head element", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;
      list.remove(a);
      expect(list.next).toBeNull();
      expect(list.length).toBe(0);
    });

    it("should remove non-head element", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      a._inuse = b._inuse = true;
      list.next = a;
      a.next = b;
      list.length = 2;
      list.remove(b);
      expect(a.next).toBeNull();
      expect(list.length).toBe(1);
    });

    it("should do nothing when item not found", () => {
      const list = new ZPP_Vec2();
      const notInList = new ZPP_Vec2();
      list.remove(notInList);
      expect(list.length).toBe(0);
    });
  });
  describe("erase", () => {
    it("should erase head when pre is null", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      a.next = b;
      list.length = 2;

      const ret = list.erase(null);
      expect(ret).toBe(b);
      expect(list.next).toBe(b);
      expect(list.length).toBe(1);
    });

    it("should erase after pre", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      const c = new ZPP_Vec2();
      a._inuse = b._inuse = true;
      list.next = a;
      a.next = b;
      b.next = c;
      list.length = 3;

      const ret = list.erase(a);
      expect(ret).toBe(c);
      expect(a.next).toBe(c);
      expect(list.length).toBe(2);
    });

    it("should set pushmod when erasing last element via pre null", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;

      list.erase(null);
      expect(list.next).toBeNull();
      expect(list.pushmod).toBe(true);
    });

    it("should set pushmod when erasing last element via pre", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      a._inuse = b._inuse = true;
      list.next = a;
      a.next = b;
      list.length = 2;

      list.erase(a);
      expect(a.next).toBeNull();
      expect(list.pushmod).toBe(true);
    });
  });

  describe("erase", () => {
    it("should erase head when pre is null", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      a._inuse = true;
      list.next = a;
      list.length = 1;
      const ret = list.erase(null);
      expect(ret).toBeNull();
      expect(list.next).toBeNull();
    });

    it("should erase after pre", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      a._inuse = b._inuse = true;
      list.next = a;
      a.next = b;
      list.length = 2;
      const ret = list.erase(a);
      expect(ret).toBeNull();
      expect(a.next).toBeNull();
    });
  });
  describe("clear / inlined_clear", () => {
    it("should be callable (no-op)", () => {
      const list = new ZPP_Vec2();
      expect(() => list.clear()).not.toThrow();
      expect(() => list.clear()).not.toThrow();
    });
  });

  describe("reverse", () => {
    it("should reverse the list", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      const c = new ZPP_Vec2();
      list.next = a;
      a.next = b;
      b.next = c;
      c.next = null;

      list.reverse();

      expect(list.next).toBe(c);
      expect(c.next).toBe(b);
      expect(b.next).toBe(a);
      expect(a.next).toBeNull();
      expect(list.modified).toBe(true);
      expect(list.pushmod).toBe(true);
    });

    it("should handle empty list", () => {
      const list = new ZPP_Vec2();
      list.reverse();
      expect(list.next).toBeNull();
    });
  });

  describe("empty", () => {
    it("should return true for empty list", () => {
      const list = new ZPP_Vec2();
      expect(list.empty()).toBe(true);
    });

    it("should return false for non-empty list", () => {
      const list = new ZPP_Vec2();
      list.next = new ZPP_Vec2();
      expect(list.empty()).toBe(false);
    });
  });
  describe("has / inlined_has", () => {
    it("should return true when item exists", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      list.next = a;
      expect(list.has(a)).toBe(true);
      expect(list.has(a)).toBe(true);
    });

    it("should return false when item does not exist", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      expect(list.has(a)).toBe(false);
      expect(list.has(a)).toBe(false);
    });

    it("should find items deeper in list", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      list.next = a;
      a.next = b;
      expect(list.has(b)).toBe(true);
      expect(list.has(b)).toBe(true);
    });
  });
  describe("iterator_at", () => {
    it("should return item at index", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      const b = new ZPP_Vec2();
      list.next = a;
      a.next = b;
      b.next = null;
      expect(list.iterator_at(0)).toBe(a);
      expect(list.iterator_at(1)).toBe(b);
    });

    it("should return null for out of range", () => {
      const list = new ZPP_Vec2();
      expect(list.iterator_at(0)).toBeNull();
    });
  });

  describe("at", () => {
    it("should return item at index", () => {
      const list = new ZPP_Vec2();
      const a = new ZPP_Vec2();
      list.next = a;
      a.next = null;
      expect(list.at(0)).toBe(a);
    });

    it("should return null for out of range", () => {
      const list = new ZPP_Vec2();
      expect(list.at(0)).toBeNull();
    });
  });
});
