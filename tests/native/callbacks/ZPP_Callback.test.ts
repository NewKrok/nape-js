import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_Callback } from "../../../src/native/callbacks/ZPP_Callback";
import { createMockZpp, createMockNape } from "../_mocks";

describe("ZPP_Callback", () => {
  beforeEach(() => {
    ZPP_Callback.zpp_pool = null;
    ZPP_Callback.internal = false;
    ZPP_Callback._nape = createMockNape();
    ZPP_Callback._zpp = createMockZpp();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Callback.__name__).toEqual(["zpp_nape", "callbacks", "ZPP_Callback"]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields", () => {
      const cb = new ZPP_Callback();
      expect(cb.outer_body).toBeNull();
      expect(cb.outer_con).toBeNull();
      expect(cb.outer_int).toBeNull();
      expect(cb.event).toBe(0);
      expect(cb.listener).toBeNull();
      expect(cb.space).toBeNull();
      expect(cb.index).toBe(0);
      expect(cb.next).toBeNull();
      expect(cb.prev).toBeNull();
      expect(cb.length).toBe(0);
      expect(cb.int1).toBeNull();
      expect(cb.int2).toBeNull();
      expect(cb.set).toBeNull();
      expect(cb.wrap_arbiters).toBeNull();
      expect(cb.pre_arbiter).toBeNull();
      expect(cb.pre_swapped).toBe(false);
      expect(cb.body).toBeNull();
      expect(cb.constraint).toBeNull();
      expect(cb.__class__).toBe(ZPP_Callback);
    });
  });

  describe("wrapper_body", () => {
    it("should create body callback wrapper", () => {
      const cb = new ZPP_Callback();
      const w = cb.wrapper_body();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(cb);
      expect(cb.outer_body).toBe(w);
    });

    it("should return existing wrapper", () => {
      const cb = new ZPP_Callback();
      const w1 = cb.wrapper_body();
      const w2 = cb.wrapper_body();
      expect(w1).toBe(w2);
    });

    it("should set and restore internal flag", () => {
      const cb = new ZPP_Callback();
      expect(ZPP_Callback.internal).toBe(false);
      cb.wrapper_body();
      expect(ZPP_Callback.internal).toBe(false);
    });
  });

  describe("wrapper_con", () => {
    it("should create constraint callback wrapper", () => {
      const cb = new ZPP_Callback();
      const w = cb.wrapper_con();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(cb);
      expect(cb.outer_con).toBe(w);
    });

    it("should return existing wrapper", () => {
      const cb = new ZPP_Callback();
      const w1 = cb.wrapper_con();
      const w2 = cb.wrapper_con();
      expect(w1).toBe(w2);
    });
  });

  describe("wrapper_int", () => {
    it("should create interaction callback wrapper", () => {
      const cb = new ZPP_Callback();
      cb.set = { arbiters: [] };
      const w = cb.wrapper_int();
      expect(w).not.toBeNull();
      expect(w.zpp_inner).toBe(cb);
    });

    it("should create wrap_arbiters when null", () => {
      const cb = new ZPP_Callback();
      cb.set = { arbiters: [] };
      cb.wrapper_int();
      expect(cb.wrap_arbiters).not.toBeNull();
    });

    it("should update existing wrap_arbiters inner", () => {
      const cb = new ZPP_Callback();
      cb.set = { arbiters: ["a"] };
      cb.wrap_arbiters = {
        zpp_inner: { inner: null, zip_length: false, at_ite: null },
      };
      cb.outer_int = null;
      cb.wrapper_int();
      expect(cb.wrap_arbiters.zpp_inner.inner).toEqual(["a"]);
      expect(cb.wrap_arbiters.zpp_inner.zip_length).toBe(true);
      expect(cb.wrap_arbiters.zpp_inner.at_ite).toBeNull();
    });

    it("should return existing outer_int", () => {
      const cb = new ZPP_Callback();
      cb.set = { arbiters: [] };
      const w1 = cb.wrapper_int();
      const w2 = cb.wrapper_int();
      expect(w1).toBe(w2);
    });
  });

  describe("push / push_rev", () => {
    it("push should add to tail of list", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();

      // Initialize list as empty (next=null acts as first, prev as last)
      list.push(a);
      expect(list.next).toBe(a);
      expect(list.prev).toBe(a);
      expect(list.length).toBe(1);

      list.push(b);
      expect(a.next).toBe(b);
      expect(list.prev).toBe(b);
      expect(list.length).toBe(2);
    });

    it("push_rev should add to front of list", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();

      list.push_rev(a);
      expect(list.next).toBe(a);
      expect(list.prev).toBe(a);
      expect(list.length).toBe(1);

      list.push_rev(b);
      expect(list.next).toBe(b);
      expect(b.next).toBe(a);
      expect(list.length).toBe(2);
    });
  });

  describe("pop / pop_rev", () => {
    it("pop should remove from front", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      const ret = list.pop();
      expect(ret).toBe(a);
      expect(list.next).toBe(b);
      expect(list.length).toBe(1);
    });

    it("pop should null prev when list becomes empty", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      list.push(a);
      list.pop();
      expect(list.prev).toBeNull();
    });

    it("pop_rev should remove from back", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      const ret = list.pop_rev();
      expect(ret).toBe(b);
      expect(list.prev).toBe(a);
      expect(list.length).toBe(1);
    });

    it("pop_rev should null next when list becomes empty", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      list.push(a);
      list.pop_rev();
      expect(list.next).toBeNull();
    });
  });

  describe("empty", () => {
    it("should return true for empty list", () => {
      const list = new ZPP_Callback();
      expect(list.empty()).toBe(true);
    });

    it("should return false for non-empty list", () => {
      const list = new ZPP_Callback();
      list.push(new ZPP_Callback());
      expect(list.empty()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all items", () => {
      const list = new ZPP_Callback();
      list.push(new ZPP_Callback());
      list.push(new ZPP_Callback());
      list.clear();
      expect(list.empty()).toBe(true);
      expect(list.length).toBe(0);
    });
  });

  describe("splice", () => {
    it("should remove head element (prev null)", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      const ret = list.splice(a);
      expect(ret).toBe(b);
      expect(list.next).toBe(b);
      expect(list.length).toBe(1);
    });

    it("should remove middle element", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      const c = new ZPP_Callback();
      list.push(a);
      list.push(b);
      list.push(c);

      const ret = list.splice(b);
      expect(ret).toBe(c);
      expect(a.next).toBe(c);
      expect(list.length).toBe(2);
    });

    it("should remove last element (next null)", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      const ret = list.splice(b);
      expect(ret).toBeNull();
      expect(list.prev).toBe(a);
      expect(list.length).toBe(1);
    });

    it("should null prev when removing only head element", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      list.push(a);

      list.splice(a);
      expect(list.next).toBeNull();
      expect(list.prev).toBeNull();
    });
  });

  describe("rotateL / rotateR", () => {
    it("rotateL should move front to back", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      list.rotateL();
      expect(list.next).toBe(b);
      expect(list.prev).toBe(a);
    });

    it("rotateR should move back to front", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      list.rotateR();
      expect(list.next).toBe(b);
      expect(list.prev).toBe(a);
    });
  });

  describe("cycleNext / cyclePrev", () => {
    it("cycleNext should wrap around to head", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      expect(list.cycleNext(a)).toBe(b);
      expect(list.cycleNext(b)).toBe(a);
    });

    it("cyclePrev should wrap around to tail", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      expect(list.cyclePrev(a)).toBe(b);
      expect(list.cyclePrev(b)).toBe(a);
    });
  });

  describe("at / rev_at", () => {
    it("at should return item at index from front", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      expect(list.at(0)).toBe(a);
      expect(list.at(1)).toBe(b);
    });

    it("rev_at should return item at index from back", () => {
      const list = new ZPP_Callback();
      const a = new ZPP_Callback();
      const b = new ZPP_Callback();
      list.push(a);
      list.push(b);

      expect(list.rev_at(0)).toBe(b);
      expect(list.rev_at(1)).toBe(a);
    });
  });

  describe("free", () => {
    it("should null out all references", () => {
      const cb = new ZPP_Callback();
      cb.int1 = { id: 1 };
      cb.int2 = { id: 2 };
      cb.body = { id: "body" };
      cb.constraint = { id: "con" };
      cb.listener = { id: "listen" };
      cb.set = { id: "set" };

      cb.free();
      expect(cb.int1).toBeNull();
      expect(cb.int2).toBeNull();
      expect(cb.body).toBeNull();
      expect(cb.constraint).toBeNull();
      expect(cb.listener).toBeNull();
      expect(cb.set).toBeNull();
    });

    it("should null wrap_arbiters inner when present", () => {
      const cb = new ZPP_Callback();
      cb.wrap_arbiters = { zpp_inner: { inner: [] } };
      cb.free();
      expect(cb.wrap_arbiters.zpp_inner.inner).toBeNull();
    });

    it("should handle null wrap_arbiters", () => {
      const cb = new ZPP_Callback();
      expect(() => cb.free()).not.toThrow();
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const cb = new ZPP_Callback();
      expect(() => cb.alloc()).not.toThrow();
    });
  });

  describe("genarbs", () => {
    it("should create wrap_arbiters when null", () => {
      const cb = new ZPP_Callback();
      cb.set = { arbiters: ["arb1"] };
      cb.genarbs();
      expect(cb.wrap_arbiters).not.toBeNull();
      expect(cb.wrap_arbiters.zpp_inner.zip_length).toBe(true);
      expect(cb.wrap_arbiters.zpp_inner.at_ite).toBeNull();
    });

    it("should update existing wrap_arbiters", () => {
      const cb = new ZPP_Callback();
      cb.set = { arbiters: ["arb2"] };
      cb.wrap_arbiters = {
        zpp_inner: { inner: null, zip_length: false, at_ite: { id: "old" } },
      };
      cb.genarbs();
      expect(cb.wrap_arbiters.zpp_inner.inner).toEqual(["arb2"]);
      expect(cb.wrap_arbiters.zpp_inner.zip_length).toBe(true);
      expect(cb.wrap_arbiters.zpp_inner.at_ite).toBeNull();
    });
  });
});
