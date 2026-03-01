import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_CbSet } from "../../../src/native/callbacks/ZPP_CbSet";
import { createMockZpp, MockZNPList, MockZNPNode } from "../_mocks";

describe("ZPP_CbSet", () => {
  let zpp: any;

  beforeEach(() => {
    zpp = createMockZpp();
    ZPP_CbSet._zpp = zpp;
    ZPP_CbSet.zpp_pool = null;
    // Wire up the cross reference needed by findOrCreatePair
    zpp.callbacks.ZPP_CbSet = ZPP_CbSet;
    zpp.callbacks.ZPP_CbSetPair = {
      zpp_pool: null,
      // A minimal constructor mock
    };
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_CbSet.__name__).toEqual(["zpp_nape", "callbacks", "ZPP_CbSet"]);
    });
  });

  describe("constructor", () => {
    it("should initialize all lists", () => {
      const s = new ZPP_CbSet();
      expect(s.cbTypes).toBeInstanceOf(MockZNPList);
      expect(s.listeners).toBeInstanceOf(MockZNPList);
      expect(s.bodylisteners).toBeInstanceOf(MockZNPList);
      expect(s.conlisteners).toBeInstanceOf(MockZNPList);
      expect(s.constraints).toBeInstanceOf(MockZNPList);
      expect(s.interactors).toBeInstanceOf(MockZNPList);
      expect(s.cbpairs).toBeInstanceOf(MockZNPList);
    });

    it("should initialize validation flags to true", () => {
      const s = new ZPP_CbSet();
      expect(s.zip_listeners).toBe(true);
      expect(s.zip_bodylisteners).toBe(true);
      expect(s.zip_conlisteners).toBe(true);
    });

    it("should get an ID", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      expect(b.id).toBeGreaterThan(a.id);
    });

    it("should initialize other fields", () => {
      const s = new ZPP_CbSet();
      expect(s.count).toBe(0);
      expect(s.next).toBeNull();
      expect(s.manager).toBeNull();
      expect(s.__class__).toBe(ZPP_CbSet);
    });
  });

  describe("setlt (static)", () => {
    it("should compare lexicographically by cbType ids", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbTypes.add({ id: 1 });
      b.cbTypes.add({ id: 2 });
      expect(ZPP_CbSet.setlt(a, b)).toBe(true);
      expect(ZPP_CbSet.setlt(b, a)).toBe(false);
    });

    it("should return false for equal sets", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbTypes.add({ id: 1 });
      b.cbTypes.add({ id: 1 });
      expect(ZPP_CbSet.setlt(a, b)).toBe(false);
    });

    it("should return true when a is prefix of b", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbTypes.add({ id: 1 });
      b.cbTypes.add({ id: 2 });
      b.cbTypes.add({ id: 1 }); // b has more items
      expect(ZPP_CbSet.setlt(a, b)).toBe(true);
    });

    it("should return false when b is prefix of a", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbTypes.add({ id: 2 });
      a.cbTypes.add({ id: 1 });
      b.cbTypes.add({ id: 1 });
      expect(ZPP_CbSet.setlt(a, b)).toBe(false);
    });

    it("should handle empty lists", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      expect(ZPP_CbSet.setlt(a, b)).toBe(false);
    });
  });

  describe("get (factory)", () => {
    it("should create new CbSet and populate cbTypes", () => {
      const cbTypes = new MockZNPList();
      const ct1 = { id: 1, cbsets: new MockZNPList() };
      const ct2 = { id: 2, cbsets: new MockZNPList() };
      cbTypes.add(ct2);
      cbTypes.add(ct1);

      const s = ZPP_CbSet.get(cbTypes);
      expect(s).toBeInstanceOf(ZPP_CbSet);
      expect(s.cbTypes.length).toBe(2);
      expect(ct1.cbsets.has(s)).toBe(true);
      expect(ct2.cbsets.has(s)).toBe(true);
    });

    it("should reuse from pool", () => {
      const pooled = new ZPP_CbSet();
      ZPP_CbSet.zpp_pool = pooled;

      const cbTypes = new MockZNPList();
      const s = ZPP_CbSet.get(cbTypes);
      expect(s).toBe(pooled);
      expect(s.next).toBeNull();
    });
  });

  describe("increment / decrement", () => {
    it("increment should increase count", () => {
      const s = new ZPP_CbSet();
      s.increment();
      expect(s.count).toBe(1);
      s.increment();
      expect(s.count).toBe(2);
    });

    it("decrement should decrease count and return true when reaching 0", () => {
      const s = new ZPP_CbSet();
      s.count = 2;
      expect(s.decrement()).toBe(false);
      expect(s.decrement()).toBe(true);
    });
  });

  describe("invalidate_pairs", () => {
    it("should mark all cbpairs zip_listeners true", () => {
      const s = new ZPP_CbSet();
      const pair = { zip_listeners: false };
      s.cbpairs.add(pair);
      s.invalidate_pairs();
      expect(pair.zip_listeners).toBe(true);
    });
  });

  describe("invalidate_listeners", () => {
    it("should set zip_listeners and invalidate pairs", () => {
      const s = new ZPP_CbSet();
      s.zip_listeners = false;
      const pair = { zip_listeners: false };
      s.cbpairs.add(pair);
      s.invalidate_listeners();
      expect(s.zip_listeners).toBe(true);
      expect(pair.zip_listeners).toBe(true);
    });
  });

  describe("validate_listeners", () => {
    it("should call realvalidate when zip is true", () => {
      const s = new ZPP_CbSet();
      s.zip_listeners = true;
      s.manager = { space: "testSpace" };
      s.validate_listeners();
      expect(s.zip_listeners).toBe(false);
    });

    it("should do nothing when zip is false", () => {
      const s = new ZPP_CbSet();
      s.zip_listeners = false;
      expect(() => s.validate_listeners()).not.toThrow();
    });
  });

  describe("invalidate_bodylisteners / validate_bodylisteners", () => {
    it("should set and clear zip flag", () => {
      const s = new ZPP_CbSet();
      s.zip_bodylisteners = false;
      s.invalidate_bodylisteners();
      expect(s.zip_bodylisteners).toBe(true);

      s.manager = { space: "testSpace" };
      s.validate_bodylisteners();
      expect(s.zip_bodylisteners).toBe(false);
    });

    it("validate should do nothing when zip is false", () => {
      const s = new ZPP_CbSet();
      s.zip_bodylisteners = false;
      expect(() => s.validate_bodylisteners()).not.toThrow();
    });
  });

  describe("invalidate_conlisteners / validate_conlisteners", () => {
    it("should set and clear zip flag", () => {
      const s = new ZPP_CbSet();
      s.zip_conlisteners = false;
      s.invalidate_conlisteners();
      expect(s.zip_conlisteners).toBe(true);

      s.manager = { space: "testSpace" };
      s.validate_conlisteners();
      expect(s.zip_conlisteners).toBe(false);
    });

    it("validate should do nothing when zip is false", () => {
      const s = new ZPP_CbSet();
      s.zip_conlisteners = false;
      expect(() => s.validate_conlisteners()).not.toThrow();
    });
  });

  describe("validate", () => {
    it("should validate all three listener types", () => {
      const s = new ZPP_CbSet();
      s.zip_listeners = true;
      s.zip_bodylisteners = true;
      s.zip_conlisteners = true;
      s.manager = { space: "testSpace" };

      s.validate();
      expect(s.zip_listeners).toBe(false);
      expect(s.zip_bodylisteners).toBe(false);
      expect(s.zip_conlisteners).toBe(false);
    });

    it("should skip validation for already valid types", () => {
      const s = new ZPP_CbSet();
      s.zip_listeners = false;
      s.zip_bodylisteners = false;
      s.zip_conlisteners = false;
      expect(() => s.validate()).not.toThrow();
    });
  });

  describe("addConstraint / remConstraint", () => {
    it("should add and remove constraints", () => {
      const s = new ZPP_CbSet();
      const con = { id: "c1" };
      s.addConstraint(con);
      expect(s.constraints.has(con)).toBe(true);
      s.remConstraint(con);
      expect(s.constraints.has(con)).toBe(false);
    });
  });

  describe("addInteractor / remInteractor", () => {
    it("should add and remove interactors", () => {
      const s = new ZPP_CbSet();
      const intx = { id: "i1" };
      s.addInteractor(intx);
      expect(s.interactors.has(intx)).toBe(true);
      s.remInteractor(intx);
      expect(s.interactors.has(intx)).toBe(false);
    });
  });

  describe("free", () => {
    it("should clear listeners and set zip flags", () => {
      const s = new ZPP_CbSet();
      s.zip_listeners = false;
      s.zip_bodylisteners = false;
      s.zip_conlisteners = false;

      // Add cbTypes that have cbsets lists
      const ct = { cbsets: new MockZNPList() };
      ct.cbsets.add(s);
      s.cbTypes.add(ct);

      s.free();
      expect(s.zip_listeners).toBe(true);
      expect(s.zip_bodylisteners).toBe(true);
      expect(s.zip_conlisteners).toBe(true);
      expect(s.cbTypes.head).toBeNull();
      expect(ct.cbsets.has(s)).toBe(false);
    });
  });

  describe("alloc", () => {
    it("should be callable (no-op)", () => {
      const s = new ZPP_CbSet();
      expect(() => s.alloc()).not.toThrow();
    });
  });

  describe("realvalidate_listeners", () => {
    it("should merge listeners from cbTypes into set listeners", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = { precedence: 1, id: 1, space: "testSpace" };
      const cbType: any = {
        listeners: new MockZNPList(),
      };
      cbType.listeners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_listeners = true;
      s.validate_listeners();
      expect(s.listeners.length).toBe(1);
    });

    it("should skip listeners from different space", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = { precedence: 1, id: 1, space: "otherSpace" };
      const cbType: any = {
        listeners: new MockZNPList(),
      };
      cbType.listeners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_listeners = true;
      s.validate_listeners();
      expect(s.listeners.length).toBe(0);
    });

    it("should skip duplicate listeners already in list", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = { precedence: 1, id: 1, space: "testSpace" };

      // Two cbTypes with same listener
      const ct1: any = { listeners: new MockZNPList() };
      ct1.listeners.add(listener);
      const ct2: any = { listeners: new MockZNPList() };
      ct2.listeners.add(listener);
      s.cbTypes.add(ct2);
      s.cbTypes.add(ct1);

      s.zip_listeners = true;
      s.validate_listeners();
      // Should have listener only once
      expect(s.listeners.length).toBe(1);
    });
  });

  describe("realvalidate_bodylisteners", () => {
    it("should merge body listeners from cbTypes", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        bodylisteners: new MockZNPList(),
      };
      cbType.bodylisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_bodylisteners = true;
      s.validate_bodylisteners();
      expect(s.bodylisteners.length).toBe(1);
    });

    it("should skip excluded body listeners", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => true,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        bodylisteners: new MockZNPList(),
      };
      cbType.bodylisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_bodylisteners = true;
      s.validate_bodylisteners();
      // excluded, so not added
      expect(s.bodylisteners.length).toBe(0);
    });

    it("should skip body listeners from different space", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "otherSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        bodylisteners: new MockZNPList(),
      };
      cbType.bodylisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_bodylisteners = true;
      s.validate_bodylisteners();
      expect(s.bodylisteners.length).toBe(0);
    });
  });

  describe("realvalidate_conlisteners", () => {
    it("should merge constraint listeners from cbTypes", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        conlisteners: new MockZNPList(),
      };
      cbType.conlisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_conlisteners = true;
      s.validate_conlisteners();
      expect(s.conlisteners.length).toBe(1);
    });

    it("should skip excluded constraint listeners", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => true,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        conlisteners: new MockZNPList(),
      };
      cbType.conlisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_conlisteners = true;
      s.validate_conlisteners();
      expect(s.conlisteners.length).toBe(0);
    });
  });

  describe("compatible (static)", () => {
    it("should return true when options match forward", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();

      const includes = new MockZNPList();
      const excludes = new MockZNPList();
      const options = {
        nonemptyintersection: (_xs: any, list: any) => list === includes,
        includes,
        excludes,
      };

      const i = { options1: options, options2: options };
      expect(ZPP_CbSet.compatible(i, a, b)).toBe(true);
    });

    it("should try reverse when forward fails", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();

      let callCount = 0;
      const fail = {
        nonemptyintersection: () => {
          callCount++;
          return callCount > 2;
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const succeed = {
        nonemptyintersection: () => true,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1: fail, options2: succeed };
      const result = ZPP_CbSet.compatible(i, a, b);
      expect(typeof result).toBe("boolean");
    });

    it("should return false when completely incompatible", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();

      const fail = {
        nonemptyintersection: () => false,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1: fail, options2: fail };
      expect(ZPP_CbSet.compatible(i, a, b)).toBe(false);
    });
  });

  describe("compatible (reverse path)", () => {
    it("should return true via reverse path when options2 matches a and options1 matches b", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();

      // Forward: options1 on a fails
      const options1 = {
        nonemptyintersection: (xs: any, list: any) => {
          return xs === b.cbTypes && list === options1.includes;
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };
      // Reverse: options2 on a succeeds
      const options2 = {
        nonemptyintersection: (xs: any, list: any) => {
          return xs === a.cbTypes && list === options2.includes;
        },
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1, options2 };
      expect(ZPP_CbSet.compatible(i, a, b)).toBe(true);
    });

    it("should return false when reverse options1 includes check on b fails", () => {
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();

      // Forward fails
      const options1fail = {
        nonemptyintersection: () => false,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };
      // Reverse: options2 on a succeeds
      const options2succeed = {
        nonemptyintersection: (xs: any, list: any) => list === options2succeed.includes,
        includes: new MockZNPList(),
        excludes: new MockZNPList(),
      };

      const i = { options1: options1fail, options2: options2succeed };
      // Reverse: options2 on a -> includes match (true), excludes match (false) => passes
      // Then options1 on b -> includes check returns false => return false
      expect(ZPP_CbSet.compatible(i, a, b)).toBe(false);
    });
  });

  describe("findOrCreatePair and static methods", () => {
    // Helper to set up proper ZPP_CbSetPair mock constructor
    function setupCbSetPairMock() {
      const zpp = ZPP_CbSet._zpp;
      // Create a proper class for ZPP_CbSetPair that findOrCreatePair can construct
      class MockCbSetPair {
        static zpp_pool: any = null;
        a: any = null;
        b: any = null;
        next: any = null;
        zip_listeners = false;
        listeners: any;
        __validate: () => void;
        constructor() {
          this.listeners = new MockZNPList();
          this.__validate = () => {};
        }
      }
      zpp.callbacks.ZPP_CbSetPair = MockCbSetPair;
      return MockCbSetPair;
    }

    it("empty_intersection should return true when no compatible listeners", () => {
      setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      const result = ZPP_CbSet.empty_intersection(a, b);
      expect(result).toBe(true);
    });

    it("empty_intersection should return false when listeners exist", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      // Pre-create a pair and add it to BOTH cbpairs so findOrCreatePair finds it
      // (findOrCreatePair searches the shorter list)
      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = false;
      existing.listeners.add({ id: 1 });
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      const result = ZPP_CbSet.empty_intersection(a, b);
      expect(result).toBe(false);
    });

    it("findOrCreatePair should reuse existing pair", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      // Create and register an existing pair in both lists
      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = false;
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      // Call empty_intersection which internally calls findOrCreatePair
      // It should find the existing pair, not create a new one
      ZPP_CbSet.empty_intersection(a, b);
      // Should still have only 1 pair in each
      expect(a.cbpairs.length).toBe(1);
      expect(b.cbpairs.length).toBe(1);
    });

    it("findOrCreatePair should reuse pool when available", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      // Put an item in the pool
      const pooledPair = new MockPair() as any;
      const pooledPair2 = new MockPair() as any;
      pooledPair.next = pooledPair2;
      MockPair.zpp_pool = pooledPair;

      ZPP_CbSet.empty_intersection(a, b);
      // Pool should have been consumed
      expect(MockPair.zpp_pool).toBe(pooledPair2);
    });

    it("findOrCreatePair should add pair to both a and b cbpairs", () => {
      setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      ZPP_CbSet.empty_intersection(a, b);
      expect(a.cbpairs.length).toBe(1);
      expect(b.cbpairs.length).toBe(1);
    });

    it("findOrCreatePair should not double-add when a == b", () => {
      setupCbSetPairMock();
      const a = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();

      ZPP_CbSet.empty_intersection(a, a);
      // Should only add once since a == b
      expect(a.cbpairs.length).toBe(1);
    });

    it("findOrCreatePair should call __validate when zip_listeners is true", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      let validateCalled = false;
      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = true;
      existing.__validate = () => {
        validateCalled = true;
      };
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      ZPP_CbSet.empty_intersection(a, b);
      expect(validateCalled).toBe(true);
      expect(existing.zip_listeners).toBe(false);
    });

    it("single_intersection should return true when only one matching listener", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      const listener = { id: 1 };
      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = false;
      existing.listeners.add(listener);
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      expect(ZPP_CbSet.single_intersection(a, b, listener)).toBe(true);
    });

    it("single_intersection should return false when listener does not match", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = false;
      existing.listeners.add({ id: 1 });
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      expect(ZPP_CbSet.single_intersection(a, b, { id: 2 })).toBe(false);
    });

    it("single_intersection should return false for empty listeners", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = false;
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      expect(ZPP_CbSet.single_intersection(a, b, { id: 1 })).toBe(false);
    });

    it("find_all should call callback for matching event listeners", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      const l1 = { event: 1, id: "a" };
      const l2 = { event: 2, id: "b" };
      const l3 = { event: 1, id: "c" };
      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = false;
      existing.listeners.add(l3);
      existing.listeners.add(l2);
      existing.listeners.add(l1);
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      const results: string[] = [];
      ZPP_CbSet.find_all(a, b, 1, (x) => results.push(x.id));
      expect(results).toEqual(["a", "c"]);
    });

    it("find_all should not call callback for non-matching events", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      const existing = new MockPair() as any;
      existing.a = a;
      existing.b = b;
      existing.zip_listeners = false;
      existing.listeners.add({ event: 1, id: "a" });
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      const results: string[] = [];
      ZPP_CbSet.find_all(a, b, 99, (x) => results.push(x.id));
      expect(results).toEqual([]);
    });

    it("findOrCreatePair should find pair when (p.a == b && p.b == a)", () => {
      const MockPair = setupCbSetPairMock();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      // Register pair in reverse order (a stored as b, b stored as a)
      const existing = new MockPair() as any;
      existing.a = b;
      existing.b = a;
      existing.zip_listeners = false;
      // Add to both so the shorter-list search can find it
      a.cbpairs.add(existing);
      b.cbpairs.add(existing);

      // findOrCreatePair checks (p.a == a && p.b == b) || (p.a == b && p.b == a)
      ZPP_CbSet.empty_intersection(a, b);
      // Should reuse existing pair, not create a new one
      expect(a.cbpairs.length).toBe(1);
    });
  });

  describe("realvalidate_bodylisteners (pool reuse and ordering paths)", () => {
    it("should reuse pool node for body listeners", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };

      // Put a node in the pool
      const poolNode = new MockZNPNode();
      const zpp = ZPP_CbSet._zpp;
      zpp.util.ZNPNode_ZPP_BodyListener.zpp_pool = poolNode;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        bodylisteners: new MockZNPList(),
      };
      cbType.bodylisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_bodylisteners = true;
      s.validate_bodylisteners();
      expect(s.bodylisteners.length).toBe(1);
    });

    it("should skip duplicate body listeners already in the merged list", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };

      // Two cbTypes share the same body listener
      const ct1: any = { bodylisteners: new MockZNPList() };
      ct1.bodylisteners.add(listener);
      const ct2: any = { bodylisteners: new MockZNPList() };
      ct2.bodylisteners.add(listener);
      s.cbTypes.add(ct2);
      s.cbTypes.add(ct1);

      s.zip_bodylisteners = true;
      s.validate_bodylisteners();
      expect(s.bodylisteners.length).toBe(1);
    });

    it("should merge body listeners in priority order from multiple cbTypes", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const high = {
        precedence: 10,
        id: 1,
        space: "testSpace",
        options: { nonemptyintersection: () => false, excludes: new MockZNPList() },
      };
      const low = {
        precedence: 1,
        id: 2,
        space: "testSpace",
        options: { nonemptyintersection: () => false, excludes: new MockZNPList() },
      };

      const ct1: any = { bodylisteners: new MockZNPList() };
      ct1.bodylisteners.add(high);
      const ct2: any = { bodylisteners: new MockZNPList() };
      ct2.bodylisteners.add(low);
      s.cbTypes.add(ct2);
      s.cbTypes.add(ct1);

      s.zip_bodylisteners = true;
      s.validate_bodylisteners();
      expect(s.bodylisteners.length).toBe(2);
      // High precedence should come first
      expect(s.bodylisteners.head!.elt).toBe(high);
    });

    it("should handle nite advancing past lower-priority existing entries", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listenerA = {
        precedence: 10,
        id: 1,
        space: "testSpace",
        options: { nonemptyintersection: () => false, excludes: new MockZNPList() },
      };
      const listenerB = {
        precedence: 5,
        id: 2,
        space: "testSpace",
        options: { nonemptyintersection: () => false, excludes: new MockZNPList() },
      };
      const listenerC = {
        precedence: 1,
        id: 3,
        space: "testSpace",
        options: { nonemptyintersection: () => false, excludes: new MockZNPList() },
      };

      // First cbType has A and C
      const ct1: any = { bodylisteners: new MockZNPList() };
      ct1.bodylisteners.add(listenerC);
      ct1.bodylisteners.add(listenerA);
      // Second cbType has B
      const ct2: any = { bodylisteners: new MockZNPList() };
      ct2.bodylisteners.add(listenerB);
      s.cbTypes.add(ct2);
      s.cbTypes.add(ct1);

      s.zip_bodylisteners = true;
      s.validate_bodylisteners();
      expect(s.bodylisteners.length).toBe(3);
    });
  });

  describe("realvalidate_conlisteners (pool reuse and ordering paths)", () => {
    it("should reuse pool node for constraint listeners", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };

      const poolNode = new MockZNPNode();
      const zpp = ZPP_CbSet._zpp;
      zpp.util.ZNPNode_ZPP_ConstraintListener.zpp_pool = poolNode;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        conlisteners: new MockZNPList(),
      };
      cbType.conlisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_conlisteners = true;
      s.validate_conlisteners();
      expect(s.conlisteners.length).toBe(1);
    });

    it("should skip duplicate constraint listeners already in the merged list", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "testSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };

      const ct1: any = { conlisteners: new MockZNPList() };
      ct1.conlisteners.add(listener);
      const ct2: any = { conlisteners: new MockZNPList() };
      ct2.conlisteners.add(listener);
      s.cbTypes.add(ct2);
      s.cbTypes.add(ct1);

      s.zip_conlisteners = true;
      s.validate_conlisteners();
      expect(s.conlisteners.length).toBe(1);
    });

    it("should merge constraint listeners in priority order from multiple cbTypes", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const high = {
        precedence: 10,
        id: 1,
        space: "testSpace",
        options: { nonemptyintersection: () => false, excludes: new MockZNPList() },
      };
      const low = {
        precedence: 1,
        id: 2,
        space: "testSpace",
        options: { nonemptyintersection: () => false, excludes: new MockZNPList() },
      };

      const ct1: any = { conlisteners: new MockZNPList() };
      ct1.conlisteners.add(high);
      const ct2: any = { conlisteners: new MockZNPList() };
      ct2.conlisteners.add(low);
      s.cbTypes.add(ct2);
      s.cbTypes.add(ct1);

      s.zip_conlisteners = true;
      s.validate_conlisteners();
      expect(s.conlisteners.length).toBe(2);
      expect(s.conlisteners.head!.elt).toBe(high);
    });

    it("should skip constraint listeners from different space", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listener = {
        precedence: 1,
        id: 1,
        space: "otherSpace",
        options: {
          nonemptyintersection: () => false,
          excludes: new MockZNPList(),
        },
      };
      const cbType: any = {
        conlisteners: new MockZNPList(),
      };
      cbType.conlisteners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_conlisteners = true;
      s.validate_conlisteners();
      expect(s.conlisteners.length).toBe(0);
    });
  });

  describe("realvalidate_listeners (pool reuse path)", () => {
    it("should reuse pool node for interaction listeners", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };

      const poolNode = new MockZNPNode();
      const zpp = ZPP_CbSet._zpp;
      zpp.util.ZNPNode_ZPP_InteractionListener.zpp_pool = poolNode;

      const listener = { precedence: 1, id: 1, space: "testSpace" };
      const cbType: any = { listeners: new MockZNPList() };
      cbType.listeners.add(listener);
      s.cbTypes.add(cbType);

      s.zip_listeners = true;
      s.validate_listeners();
      expect(s.listeners.length).toBe(1);
    });

    it("should handle nite advancing past lower-priority entries during merge", () => {
      const s = new ZPP_CbSet();
      s.manager = { space: "testSpace" };
      MockZNPNode.zpp_pool = null;

      const listenerA = { precedence: 10, id: 1, space: "testSpace" };
      const listenerB = { precedence: 5, id: 2, space: "testSpace" };
      const listenerC = { precedence: 1, id: 3, space: "testSpace" };

      const ct1: any = { listeners: new MockZNPList() };
      ct1.listeners.add(listenerC);
      ct1.listeners.add(listenerA);
      const ct2: any = { listeners: new MockZNPList() };
      ct2.listeners.add(listenerB);
      s.cbTypes.add(ct2);
      s.cbTypes.add(ct1);

      s.zip_listeners = true;
      s.validate_listeners();
      expect(s.listeners.length).toBe(3);
    });
  });

  describe("findOrCreatePair (non-matching pair iteration and setlt ordering)", () => {
    function setupCbSetPairMock2() {
      const zpp = ZPP_CbSet._zpp;
      class MockCbSetPair {
        static zpp_pool: any = null;
        a: any = null;
        b: any = null;
        next: any = null;
        zip_listeners = false;
        listeners: any;
        __validate: () => void;
        constructor() {
          this.listeners = new MockZNPList();
          this.__validate = () => {};
        }
      }
      zpp.callbacks.ZPP_CbSetPair = MockCbSetPair;
      return MockCbSetPair;
    }

    it("should skip non-matching pairs during search (cx_ite = cx_ite.next)", () => {
      const MockPair = setupCbSetPairMock2();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      const c = new ZPP_CbSet();
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      // Add a non-matching pair to both lists
      const nonMatching = new MockPair() as any;
      nonMatching.a = a;
      nonMatching.b = c; // doesn't match (a,b)
      nonMatching.zip_listeners = false;
      a.cbpairs.add(nonMatching);
      b.cbpairs.add(nonMatching);

      // Now search for pair (a,b) - should iterate past nonMatching and create new
      ZPP_CbSet.empty_intersection(a, b);
      // Should have added a new pair
      expect(a.cbpairs.length).toBe(2);
    });

    it("should order pair with setlt (a < b case, lines 168-169)", () => {
      setupCbSetPairMock2();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      // Make a < b by cbTypes ordering
      a.cbTypes.add({ id: 1 });
      b.cbTypes.add({ id: 2 });
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      // findOrCreatePair will create a new pair; setlt(a,b) returns true
      // so it should set ret1.a = a, ret1.b = b
      ZPP_CbSet.empty_intersection(a, b);
      const pair = a.cbpairs.head!.elt;
      expect(pair.a).toBe(a);
      expect(pair.b).toBe(b);
    });

    it("should reverse pair order when setlt returns false (b < a case)", () => {
      setupCbSetPairMock2();
      const a = new ZPP_CbSet();
      const b = new ZPP_CbSet();
      // Make b < a by cbTypes ordering
      a.cbTypes.add({ id: 2 });
      b.cbTypes.add({ id: 1 });
      a.cbpairs = new MockZNPList();
      b.cbpairs = new MockZNPList();

      ZPP_CbSet.empty_intersection(a, b);
      const pair = a.cbpairs.head!.elt;
      expect(pair.a).toBe(b);
      expect(pair.b).toBe(a);
    });
  });
});
