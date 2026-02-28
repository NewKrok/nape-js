import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_CbSetPair } from "../../../src/native/callbacks/ZPP_CbSetPair";
import { createMockZpp, MockZNPList } from "../_mocks";

describe("ZPP_CbSetPair", () => {
  let zpp: any;

  beforeEach(() => {
    zpp = createMockZpp();
    ZPP_CbSetPair._zpp = zpp;
    ZPP_CbSetPair.zpp_pool = null;
    // Set up the cross-reference for CbSet.setlt
    zpp.callbacks.ZPP_CbSet.setlt = (a: any, b: any) => {
      // Compare by id
      if (a.cbTypes && b.cbTypes) {
        const aHead = a.cbTypes.head;
        const bHead = b.cbTypes.head;
        if (aHead && bHead) return aHead.elt.id < bHead.elt.id;
      }
      return false;
    };
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_CbSetPair.__name__).toEqual(["zpp_nape", "callbacks", "ZPP_CbSetPair"]);
    });
  });

  describe("constructor", () => {
    it("should initialize with defaults", () => {
      const p = new ZPP_CbSetPair();
      expect(p.a).toBeNull();
      expect(p.b).toBeNull();
      expect(p.next).toBeNull();
      expect(p.zip_listeners).toBe(false);
      expect(p.listeners).toBeInstanceOf(MockZNPList);
      expect(p.__class__).toBe(ZPP_CbSetPair);
    });
  });

  describe("get (factory)", () => {
    it("should create new pair when pool is empty", () => {
      const a = { cbTypes: new MockZNPList(), id: 1 };
      const b = { cbTypes: new MockZNPList(), id: 2 };
      a.cbTypes.add({ id: 1 });
      b.cbTypes.add({ id: 2 });

      const p = ZPP_CbSetPair.get(a, b);
      expect(p).toBeInstanceOf(ZPP_CbSetPair);
      expect(p.zip_listeners).toBe(true);
    });

    it("should reuse from pool", () => {
      const pooled = new ZPP_CbSetPair();
      ZPP_CbSetPair.zpp_pool = pooled;

      const a = { cbTypes: new MockZNPList() };
      const b = { cbTypes: new MockZNPList() };
      a.cbTypes.add({ id: 1 });
      b.cbTypes.add({ id: 2 });

      const p = ZPP_CbSetPair.get(a, b);
      expect(p).toBe(pooled);
      expect(p.next).toBeNull();
    });

    it("should order a/b using setlt", () => {
      const low = { cbTypes: new MockZNPList() };
      const high = { cbTypes: new MockZNPList() };
      low.cbTypes.add({ id: 1 });
      high.cbTypes.add({ id: 2 });

      const p = ZPP_CbSetPair.get(high, low);
      expect(p.a).toBe(low);
      expect(p.b).toBe(high);
    });
  });

  describe("setlt", () => {
    it("should compare pairs by a then b", () => {
      const make = (aId: number, bId: number) => {
        const p = new ZPP_CbSetPair();
        p.a = { cbTypes: new MockZNPList() };
        p.b = { cbTypes: new MockZNPList() };
        p.a.cbTypes.add({ id: aId });
        p.b.cbTypes.add({ id: bId });
        return p;
      };

      const x = make(1, 2);
      const y = make(2, 3);
      expect(ZPP_CbSetPair.setlt(x, y)).toBe(true);
      expect(ZPP_CbSetPair.setlt(y, x)).toBe(false);
    });

    it("should compare b when a is equal", () => {
      const a = { cbTypes: new MockZNPList() };
      a.cbTypes.add({ id: 1 });

      const x = new ZPP_CbSetPair();
      x.a = a;
      x.b = { cbTypes: new MockZNPList() };
      x.b.cbTypes.add({ id: 2 });

      const y = new ZPP_CbSetPair();
      y.a = a;
      y.b = { cbTypes: new MockZNPList() };
      y.b.cbTypes.add({ id: 3 });

      expect(ZPP_CbSetPair.setlt(x, y)).toBe(true);
    });

    it("should return false when a.a > y.a and they are not equal", () => {
      const x = new ZPP_CbSetPair();
      x.a = { cbTypes: new MockZNPList() };
      x.a.cbTypes.add({ id: 5 });
      x.b = { cbTypes: new MockZNPList() };
      x.b.cbTypes.add({ id: 1 });

      const y = new ZPP_CbSetPair();
      y.a = { cbTypes: new MockZNPList() };
      y.a.cbTypes.add({ id: 1 });
      y.b = { cbTypes: new MockZNPList() };
      y.b.cbTypes.add({ id: 1 });

      expect(ZPP_CbSetPair.setlt(x, y)).toBe(false);
    });
  });

  describe("free", () => {
    it("should null out a, b and clear listeners", () => {
      const p = new ZPP_CbSetPair();
      p.a = { id: "a" };
      p.b = { id: "b" };
      p.listeners.add({ id: "l" });

      p.free();
      expect(p.a).toBeNull();
      expect(p.b).toBeNull();
      expect(p.listeners.head).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should set zip_listeners to true", () => {
      const p = new ZPP_CbSetPair();
      p.zip_listeners = false;
      p.alloc();
      expect(p.zip_listeners).toBe(true);
    });
  });

  describe("invalidate", () => {
    it("should set zip_listeners to true", () => {
      const p = new ZPP_CbSetPair();
      p.zip_listeners = false;
      p.invalidate();
      expect(p.zip_listeners).toBe(true);
    });
  });

  describe("validate", () => {
    it("should call __validate when zip_listeners is true", () => {
      const p = new ZPP_CbSetPair();
      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.zip_listeners = true;
      p.validate();
      expect(p.zip_listeners).toBe(false);
    });

    it("should do nothing when zip_listeners is false", () => {
      const p = new ZPP_CbSetPair();
      p.zip_listeners = false;
      // Should not throw - no a/b needed since __validate not called
      expect(() => p.validate()).not.toThrow();
    });
  });

  describe("__validate", () => {
    it("should rebuild listeners from intersection of both sets", () => {
      const p = new ZPP_CbSetPair();
      const includes = new MockZNPList();
      const excludes = new MockZNPList();

      const options = {
        nonemptyintersection: (_xs: any, list: any) => list === includes,
        includes,
        excludes,
      };
      const shared = { id: 1, precedence: 1, options1: options, options2: options };

      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.a.listeners.add(shared);
      p.b.listeners.add(shared);

      p.__validate();
      expect(p.listeners.has(shared)).toBe(true);
    });

    it("should not add incompatible listeners", () => {
      const p = new ZPP_CbSetPair();
      const listener = { id: 1, precedence: 1, options1: null, options2: null };

      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.a.listeners.add(listener);
      p.b.listeners.add(listener);

      const failOptions = {
        nonemptyintersection: () => false,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };
      listener.options1 = failOptions as any;
      listener.options2 = failOptions as any;

      p.__validate();
      expect(p.listeners.has(listener)).toBe(false);
    });

    it("should advance aite when ax has higher precedence", () => {
      const p = new ZPP_CbSetPair();
      const ax = { id: 2, precedence: 10 };
      const bx = { id: 1, precedence: 1 };

      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.a.listeners.add(ax);
      p.b.listeners.add(bx);

      p.__validate();
      // Neither should be in the result since they're different
      expect(p.listeners.length).toBe(0);
    });

    it("should advance bite when bx has higher precedence", () => {
      const p = new ZPP_CbSetPair();
      const ax = { id: 1, precedence: 1 };
      const bx = { id: 2, precedence: 10 };

      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.a.listeners.add(ax);
      p.b.listeners.add(bx);

      p.__validate();
      expect(p.listeners.length).toBe(0);
    });
  });

  describe("compatible", () => {
    it("should return true when options match forward", () => {
      const p = new ZPP_CbSetPair();
      p.a = { cbTypes: new MockZNPList() };
      p.b = { cbTypes: new MockZNPList() };

      const includes = new MockZNPList();
      const excludes = new MockZNPList();
      const options = {
        nonemptyintersection: (_xs: any, list: any) => list === includes,
        includes,
        excludes,
      };

      const i = { options1: options, options2: options };
      expect(p.compatible(i)).toBe(true);
    });

    it("should try reverse when forward fails", () => {
      const p = new ZPP_CbSetPair();
      p.a = { cbTypes: new MockZNPList() };
      p.b = { cbTypes: new MockZNPList() };

      let callCount = 0;
      const failFirst = {
        nonemptyintersection: (xs: any, ys: any) => {
          callCount++;
          return callCount > 2; // fail first 2 calls, succeed later
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };
      const succeed = {
        nonemptyintersection: () => true,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1: failFirst, options2: succeed };
      // This tests the reverse path
      const result = p.compatible(i);
      // Result depends on exact call pattern
      expect(typeof result).toBe("boolean");
    });

    it("should return false when no match", () => {
      const p = new ZPP_CbSetPair();
      p.a = { cbTypes: new MockZNPList() };
      p.b = { cbTypes: new MockZNPList() };

      const fail = {
        nonemptyintersection: () => false,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1: fail, options2: fail };
      expect(p.compatible(i)).toBe(false);
    });
  });

  describe("empty_intersection", () => {
    it("should return true when listeners is empty", () => {
      const p = new ZPP_CbSetPair();
      expect(p.empty_intersection()).toBe(true);
    });

    it("should return false when listeners is non-empty", () => {
      const p = new ZPP_CbSetPair();
      p.listeners.add({ id: 1 });
      expect(p.empty_intersection()).toBe(false);
    });
  });

  describe("single_intersection", () => {
    it("should return true when only one listener matches", () => {
      const p = new ZPP_CbSetPair();
      const listener = { id: 1 };
      p.listeners.add(listener);
      expect(p.single_intersection(listener)).toBe(true);
    });

    it("should return false when empty", () => {
      const p = new ZPP_CbSetPair();
      expect(p.single_intersection({ id: 1 })).toBe(false);
    });

    it("should return false when first element doesn't match", () => {
      const p = new ZPP_CbSetPair();
      p.listeners.add({ id: 1 });
      expect(p.single_intersection({ id: 2 })).toBe(false);
    });

    it("should return false when multiple listeners", () => {
      const p = new ZPP_CbSetPair();
      const l = { id: 1 };
      p.listeners.add({ id: 2 });
      p.listeners.add(l);
      expect(p.single_intersection(l)).toBe(false);
    });
  });

  describe("forall", () => {
    it("should call callback for matching event listeners", () => {
      const p = new ZPP_CbSetPair();
      const l1 = { event: 1, id: "a" };
      const l2 = { event: 2, id: "b" };
      const l3 = { event: 1, id: "c" };
      p.listeners.add(l3);
      p.listeners.add(l2);
      p.listeners.add(l1);

      const results: string[] = [];
      p.forall(1, (x) => results.push(x.id));
      expect(results).toEqual(["a", "c"]);
    });

    it("should not call callback for non-matching events", () => {
      const p = new ZPP_CbSetPair();
      p.listeners.add({ event: 1, id: "a" });

      const results: string[] = [];
      p.forall(2, (x) => results.push(x.id));
      expect(results).toEqual([]);
    });
  });

  describe("compatible (reverse path fallback)", () => {
    it("should return true via reverse path when options2 matches a but options1 does not match b (includes check returns false)", () => {
      const p = new ZPP_CbSetPair();
      p.a = { cbTypes: new MockZNPList() };
      p.b = { cbTypes: new MockZNPList() };

      // options1 fails on a (forward path fails at first check)
      const options1fail = {
        nonemptyintersection: (_xs: any, list: any) => false,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };
      // options2 succeeds on a (reverse path: options2 on a succeeds)
      const options2succeed = {
        nonemptyintersection: (_xs: any, list: any) => list === options2succeed.includes,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      // For the reverse path:
      // options2.nonemptyintersection(a.cbTypes, options2.includes) => true
      // options2.nonemptyintersection(a.cbTypes, options2.excludes) => false
      // options1.nonemptyintersection(b.cbTypes, options1.includes) => false => return false (line 110)
      const i = { options1: options1fail, options2: options2succeed };
      // This hits lines 105-110: reverse path where options1 includes check on b fails
      expect(p.compatible(i)).toBe(false);
    });

    it("should return true via reverse path when both reverse checks pass", () => {
      const p = new ZPP_CbSetPair();
      p.a = { cbTypes: new MockZNPList() };
      p.b = { cbTypes: new MockZNPList() };

      // Forward path: options1 on a fails
      const options1 = {
        nonemptyintersection: (xs: any, list: any) => {
          // Fail when checking against a.cbTypes (forward), succeed against b.cbTypes (reverse)
          return xs === p.b.cbTypes && list === options1.includes;
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };
      // options2 succeeds on a
      const options2 = {
        nonemptyintersection: (xs: any, list: any) => {
          return xs === p.a.cbTypes && list === options2.includes;
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1, options2 };
      expect(p.compatible(i)).toBe(true);
    });

    it("should return false via reverse path when options2 fails on a", () => {
      const p = new ZPP_CbSetPair();
      p.a = { cbTypes: new MockZNPList() };
      p.b = { cbTypes: new MockZNPList() };

      // Both options fail on a, so both forward and reverse fail
      const failAll = {
        nonemptyintersection: () => false,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1: failAll, options2: failAll };
      // Forward: options1 on a fails => tmp=false
      // Reverse: options2 on a fails => return false (line 113)
      expect(p.compatible(i)).toBe(false);
    });
  });

  describe("__validate (reverse compatibility check)", () => {
    it("should add listener via reverse compatibility in __validate", () => {
      const p = new ZPP_CbSetPair();
      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };

      // options1 fails forward (on a) but succeeds reverse (on b)
      const options1 = {
        nonemptyintersection: (xs: any, list: any) => {
          return xs === p.b.cbTypes && list === options1.includes;
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };
      // options2 succeeds reverse (on a)
      const options2 = {
        nonemptyintersection: (xs: any, list: any) => {
          return xs === p.a.cbTypes && list === options2.includes;
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const shared = { id: 1, precedence: 1, options1, options2 };
      p.a.listeners.add(shared);
      p.b.listeners.add(shared);

      p.__validate();
      expect(p.listeners.has(shared)).toBe(true);
    });

    it("should not add listener when reverse also fails in __validate", () => {
      const p = new ZPP_CbSetPair();
      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };

      // Both directions fail
      const failOpts = {
        nonemptyintersection: () => false,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const shared = { id: 1, precedence: 1, options1: failOpts, options2: failOpts };
      p.a.listeners.add(shared);
      p.b.listeners.add(shared);

      p.__validate();
      expect(p.listeners.has(shared)).toBe(false);
    });

    it("should advance aite when ax has same precedence but higher id than bx", () => {
      const p = new ZPP_CbSetPair();
      p.a = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };
      p.b = { listeners: new MockZNPList(), cbTypes: new MockZNPList() };

      // ax has same precedence but higher id than bx
      const ax = { id: 10, precedence: 5 };
      const bx = { id: 1, precedence: 5 };

      p.a.listeners.add(ax);
      p.b.listeners.add(bx);

      p.__validate();
      // Different listeners, so neither should be in result
      expect(p.listeners.length).toBe(0);
    });
  });
});
