import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_OptionType } from "../../../src/native/callbacks/ZPP_OptionType";
import { createMockZpp, createMockNape, MockZNPList } from "../_mocks";

describe("ZPP_OptionType", () => {
  beforeEach(() => {
    ZPP_OptionType._zpp = createMockZpp();
    ZPP_OptionType._nape = createMockNape();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_OptionType.__name__).toEqual(["zpp_nape", "callbacks", "ZPP_OptionType"]);
    });
  });

  describe("constructor", () => {
    it("should initialize includes and excludes as empty lists", () => {
      const ot = new ZPP_OptionType();
      expect(ot.includes).toBeInstanceOf(MockZNPList);
      expect(ot.excludes).toBeInstanceOf(MockZNPList);
      expect(ot.outer).toBeNull();
      expect(ot.handler).toBeNull();
      expect(ot.wrap_includes).toBeNull();
      expect(ot.wrap_excludes).toBeNull();
      expect(ot.__class__).toBe(ZPP_OptionType);
    });
  });

  describe("argument (static)", () => {
    it("should return new OptionType for null", () => {
      const result = ZPP_OptionType.argument(null);
      expect(result).not.toBeNull();
    });

    it("should return val if already OptionType", () => {
      const nape = ZPP_OptionType._nape;
      const ot = new nape.callbacks.OptionType();
      const result = ZPP_OptionType.argument(ot);
      expect(result).toBe(ot);
    });

    it("should wrap non-null non-OptionType as including", () => {
      const val = { id: "cbtype" };
      const result = ZPP_OptionType.argument(val);
      expect(result).not.toBeNull();
    });
  });

  describe("setup_includes / setup_excludes", () => {
    it("should set wrap_includes", () => {
      const ot = new ZPP_OptionType();
      ot.setup_includes();
      expect(ot.wrap_includes).not.toBeNull();
    });

    it("should set wrap_excludes", () => {
      const ot = new ZPP_OptionType();
      ot.setup_excludes();
      expect(ot.wrap_excludes).not.toBeNull();
    });
  });

  describe("nonemptyintersection", () => {
    it("should return false for empty lists", () => {
      const ot = new ZPP_OptionType();
      const xs = new MockZNPList();
      const ys = new MockZNPList();
      expect(ot.nonemptyintersection(xs, ys)).toBe(false);
    });

    it("should return true when lists share an element", () => {
      const ot = new ZPP_OptionType();
      const shared = { id: 1 };
      const xs = new MockZNPList();
      const ys = new MockZNPList();
      xs.add(shared);
      ys.add(shared);
      expect(ot.nonemptyintersection(xs, ys)).toBe(true);
    });

    it("should return false when elements differ", () => {
      const ot = new ZPP_OptionType();
      const xs = new MockZNPList();
      const ys = new MockZNPList();
      xs.add({ id: 1 });
      ys.add({ id: 2 });
      expect(ot.nonemptyintersection(xs, ys)).toBe(false);
    });

    it("should advance correctly using id comparison", () => {
      const ot = new ZPP_OptionType();
      const a = { id: 1 };
      const b = { id: 2 };
      const c = { id: 3 };
      const xs = new MockZNPList();
      const ys = new MockZNPList();
      // Note: add prepends, so we add in reverse to maintain order
      xs.add(c);
      xs.add(a);
      ys.add(c);
      ys.add(b);
      expect(ot.nonemptyintersection(xs, ys)).toBe(true);
    });

    it("should handle xs.id < ys.id by advancing ys (eite)", () => {
      const ot = new ZPP_OptionType();
      const xs = new MockZNPList();
      const ys = new MockZNPList();
      xs.add({ id: 5 });
      ys.add({ id: 3 });
      ys.add({ id: 1 });
      // eite has id=1 first, xi has id=5, so ex.id < xi.id → advance eite
      expect(ot.nonemptyintersection(xs, ys)).toBe(false);
    });
  });

  describe("excluded / included / compatible", () => {
    it("excluded should check intersection with excludes", () => {
      const ot = new ZPP_OptionType();
      const cbType = { id: 1 };
      ot.excludes.add(cbType);
      const xs = new MockZNPList();
      xs.add(cbType);
      expect(ot.excluded(xs)).toBe(true);
    });

    it("included should check intersection with includes", () => {
      const ot = new ZPP_OptionType();
      const cbType = { id: 1 };
      ot.includes.add(cbType);
      const xs = new MockZNPList();
      xs.add(cbType);
      expect(ot.included(xs)).toBe(true);
    });

    it("compatible should return true when included and not excluded", () => {
      const ot = new ZPP_OptionType();
      const cbType = { id: 1 };
      ot.includes.add(cbType);
      const xs = new MockZNPList();
      xs.add(cbType);
      expect(ot.compatible(xs)).toBe(true);
    });

    it("compatible should return false when not included", () => {
      const ot = new ZPP_OptionType();
      const xs = new MockZNPList();
      xs.add({ id: 1 });
      expect(ot.compatible(xs)).toBe(false);
    });

    it("compatible should return false when excluded", () => {
      const ot = new ZPP_OptionType();
      const cbType = { id: 1 };
      ot.includes.add(cbType);
      ot.excludes.add(cbType);
      const xs = new MockZNPList();
      xs.add(cbType);
      expect(ot.compatible(xs)).toBe(false);
    });
  });

  describe("effect_change", () => {
    it("should add to includes when included=true, added=true", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 5 };
      ot.effect_change(val, true, true);
      expect(ot.includes.has(val)).toBe(true);
    });

    it("should remove from includes when included=true, added=false", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 5 };
      ot.includes.add(val);
      ot.effect_change(val, true, false);
      expect(ot.includes.has(val)).toBe(false);
    });

    it("should add to excludes when included=false, added=true", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 5 };
      ot.effect_change(val, false, true);
      expect(ot.excludes.has(val)).toBe(true);
    });

    it("should remove from excludes when included=false, added=false", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 5 };
      ot.excludes.add(val);
      ot.effect_change(val, false, false);
      expect(ot.excludes.has(val)).toBe(false);
    });
  });

  describe("append_type", () => {
    it("should add to includes if not already included or excluded", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 1 };
      ot.append_type(ot.includes, val);
      expect(ot.includes.has(val)).toBe(true);
    });

    it("should not add duplicate to includes", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 1 };
      ot.includes.add(val);
      ot.append_type(ot.includes, val);
      expect(ot.includes.length).toBe(1);
    });

    it("should remove from excludes when adding to includes and already excluded", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 1 };
      ot.excludes.add(val);
      ot.append_type(ot.includes, val);
      expect(ot.excludes.has(val)).toBe(false);
    });

    it("should add to excludes if not already included or excluded", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 1 };
      ot.append_type(ot.excludes, val);
      expect(ot.excludes.has(val)).toBe(true);
    });

    it("should not add duplicate to excludes", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 1 };
      ot.excludes.add(val);
      ot.append_type(ot.excludes, val);
      expect(ot.excludes.length).toBe(1);
    });

    it("should remove from includes when adding to excludes and already included", () => {
      const ot = new ZPP_OptionType();
      const val = { id: 1 };
      ot.includes.add(val);
      ot.append_type(ot.excludes, val);
      expect(ot.includes.has(val)).toBe(false);
    });

    it("should use handler when set (include case, not excluded)", () => {
      const ot = new ZPP_OptionType();
      const calls: any[] = [];
      ot.handler = (val, included, added) => calls.push({ val, included, added });
      const val = { id: 1 };
      ot.append_type(ot.includes, val);
      expect(calls).toEqual([{ val, included: true, added: true }]);
    });

    it("should use handler when removing from excludes (include append, already excluded)", () => {
      const ot = new ZPP_OptionType();
      const calls: any[] = [];
      ot.handler = (val, included, added) => calls.push({ val, included, added });
      const val = { id: 1 };
      ot.excludes.add(val);
      ot.append_type(ot.includes, val);
      expect(calls).toEqual([{ val, included: false, added: false }]);
    });

    it("should use handler for exclude case (not included)", () => {
      const ot = new ZPP_OptionType();
      const calls: any[] = [];
      ot.handler = (val, included, added) => calls.push({ val, included, added });
      const val = { id: 1 };
      ot.append_type(ot.excludes, val);
      expect(calls).toEqual([{ val, included: false, added: true }]);
    });

    it("should use handler when removing from includes (exclude append, already included)", () => {
      const ot = new ZPP_OptionType();
      const calls: any[] = [];
      ot.handler = (val, included, added) => calls.push({ val, included, added });
      const val = { id: 1 };
      ot.includes.add(val);
      ot.append_type(ot.excludes, val);
      expect(calls).toEqual([{ val, included: true, added: false }]);
    });
  });

  describe("set", () => {
    it("should copy includes and excludes from another OptionType", () => {
      const src = new ZPP_OptionType();
      const a = { id: 1 };
      const b = { id: 2 };
      src.includes.add(a);
      src.excludes.add(b);

      const dst = new ZPP_OptionType();
      dst.set(src);
      expect(dst.includes.has(a)).toBe(true);
      expect(dst.excludes.has(b)).toBe(true);
    });

    it("should do nothing when setting to self", () => {
      const ot = new ZPP_OptionType();
      const a = { id: 1 };
      ot.includes.add(a);
      ot.set(ot as any);
      expect(ot.includes.has(a)).toBe(true);
    });

    it("should return this", () => {
      const ot = new ZPP_OptionType();
      const src = new ZPP_OptionType();
      expect(ot.set(src)).toBe(ot);
    });
  });

  describe("append", () => {
    it("should throw for null val", () => {
      const ot = new ZPP_OptionType();
      expect(() => ot.append(ot.includes, null)).toThrow(
        "Error: Cannot append null"
      );
    });

    it("should handle CbType instance", () => {
      const nape = ZPP_OptionType._nape;
      const ot = new ZPP_OptionType();
      const cbType = new nape.callbacks.CbType();
      cbType.zpp_inner = { id: 1 };
      ot.append(ot.includes, cbType);
      expect(ot.includes.has(cbType.zpp_inner)).toBe(true);
    });

    it("should throw for invalid types", () => {
      const ot = new ZPP_OptionType();
      expect(() => ot.append(ot.includes, 42)).toThrow(
        "Error: Cannot append non-CbType or CbType list value"
      );
    });

    it("should handle arrays of CbType", () => {
      const nape = ZPP_OptionType._nape;
      const ot = new ZPP_OptionType();
      const cb1 = new nape.callbacks.CbType();
      cb1.zpp_inner = { id: 1 };
      const cb2 = new nape.callbacks.CbType();
      cb2.zpp_inner = { id: 2 };
      ot.append(ot.includes, [cb1, cb2]);
      expect(ot.includes.has(cb1.zpp_inner)).toBe(true);
      expect(ot.includes.has(cb2.zpp_inner)).toBe(true);
    });

    it("should throw for array with non-CbType elements", () => {
      const ot = new ZPP_OptionType();
      expect(() => ot.append(ot.includes, [42])).toThrow(
        "Error: Cannot append non-CbType or CbType list value"
      );
    });

    it("should handle CbTypeList instance by iterating elements", () => {
      const nape = ZPP_OptionType._nape;
      const zpp = ZPP_OptionType._zpp;
      const ot = new ZPP_OptionType();

      // Create mock CbType inner values
      const innerA = { id: 1 };
      const innerB = { id: 2 };

      // Create a CbTypeList mock that provides iteration
      // The append method does: cbs.zpp_inner.valmod(), then CbTypeIterator.get(cbs)
      // The iterator then calls _g.zpp_inner.zpp_inner.valmod() where _g.zpp_inner = cbs
      // and _g.zpp_inner.at(_g.zpp_i++) where _g.zpp_inner = cbs (the CbTypeList outer)
      const cbTypeList = new nape.callbacks.CbTypeList();
      cbTypeList.zpp_inner = {
        valmod: () => {},
        zip_length: true,
        user_length: 0,
        inner: { length: 2 },
      };
      // The `at` method needs to be on cbTypeList itself, since _g.zpp_inner = cbTypeList
      (cbTypeList as any).at = (i: number) => {
        if (i === 0) return { zpp_inner: innerA };
        return { zpp_inner: innerB };
      };

      // Create the CbTypeIterator.get mock
      nape.callbacks.CbTypeIterator.get = (cbs: any) => {
        return {
          zpp_i: 0,
          zpp_critical: false,
          zpp_next: null,
          zpp_inner: cbs,
        };
      };
      nape.callbacks.CbTypeIterator.zpp_pool = null;

      ot.append(ot.includes, cbTypeList);
      expect(ot.includes.has(innerA)).toBe(true);
      expect(ot.includes.has(innerB)).toBe(true);
    });
  });

  describe("insertOrdered (pool node reuse path)", () => {
    it("should reuse pool node when ZNPNode_ZPP_CbType.zpp_pool is available", () => {
      const zpp = ZPP_OptionType._zpp;
      const poolNode = { elt: null, next: null } as any;
      zpp.util.ZNPNode_ZPP_CbType.zpp_pool = poolNode;

      const ot = new ZPP_OptionType();
      const val = { id: 5 };
      ot.effect_change(val, true, true); // calls insertOrdered on includes
      expect(ot.includes.has(val)).toBe(true);
    });

    it("should advance pool chain on reuse", () => {
      const zpp = ZPP_OptionType._zpp;
      const poolNode2 = { elt: null, next: null } as any;
      const poolNode1 = { elt: null, next: poolNode2 } as any;
      zpp.util.ZNPNode_ZPP_CbType.zpp_pool = poolNode1;

      const ot = new ZPP_OptionType();
      const val = { id: 5 };
      ot.effect_change(val, true, true);
      expect(zpp.util.ZNPNode_ZPP_CbType.zpp_pool).toBe(poolNode2);
    });

    it("should insert before existing element when val.id < j.id (break path)", () => {
      const ot = new ZPP_OptionType();
      // Insert id=10 first, then insert id=5 which should trigger val.id < j.id break
      const high = { id: 10 };
      const low = { id: 5 };
      ot.effect_change(high, true, true); // add high to includes
      ot.effect_change(low, true, true);  // add low to includes, triggers break at val.id < j.id
      expect(ot.includes.has(high)).toBe(true);
      expect(ot.includes.has(low)).toBe(true);
    });

    it("should insert after existing element when val.id > j.id", () => {
      const ot = new ZPP_OptionType();
      const low = { id: 5 };
      const high = { id: 10 };
      ot.effect_change(low, true, true);  // add low first
      ot.effect_change(high, true, true); // add high, loop iterates past low (val.id > j.id)
      expect(ot.includes.has(low)).toBe(true);
      expect(ot.includes.has(high)).toBe(true);
    });
  });

  describe("set (clearing loops)", () => {
    it("should clear existing includes and excludes before copying from source", () => {
      const ot = new ZPP_OptionType();
      const a = { id: 1 };
      const b = { id: 2 };
      ot.includes.add(a);
      ot.excludes.add(b);

      const src = new ZPP_OptionType();
      const c = { id: 3 };
      src.includes.add(c);

      ot.set(src);
      // After set, old includes/excludes should be cleared, new ones copied
      expect(ot.includes.has(c)).toBe(true);
      // Old items should have been moved/cleared
      expect(ot.includes.has(a)).toBe(false);
    });
  });
});
