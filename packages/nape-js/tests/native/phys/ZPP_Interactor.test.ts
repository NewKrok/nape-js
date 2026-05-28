import { describe, it, expect, beforeEach, vi } from "vitest";
import { ZPP_Interactor } from "../../../src/native/phys/ZPP_Interactor";
import { ZPP_OptionType } from "../../../src/native/callbacks/ZPP_OptionType";
import { ZPP_CbSet } from "../../../src/native/callbacks/ZPP_CbSet";
import { createMockNape, createMockZpp, MockZNPList } from "../_mocks";

/**
 * ZPP_Interactor is the abstract base for ZPP_Body, ZPP_Compound, and ZPP_Shape.
 *
 * These tests exercise the base directly with a minimal interactor (no body/shape/compound
 * specialisation) so the focus stays on the shared filtering, group, and cbSet behaviour.
 */

function setupInteractorStatics() {
  const zpp = createMockZpp();
  zpp.util.ZNPList_ZPP_CallbackSet = MockZNPList;
  zpp.util.ZNPList_ZPP_CbType = MockZNPList;
  ZPP_Interactor._zpp = zpp;
  ZPP_Interactor._nape = createMockNape();
  ZPP_OptionType._zpp = zpp;
  return zpp;
}

describe("ZPP_Interactor", () => {
  beforeEach(() => {
    setupInteractorStatics();
    ZPP_CbSet.zpp_pool = null;
  });

  describe("initFields / construction", () => {
    it("seeds an id and empty cbType/cbset lists", () => {
      const i = new ZPP_Interactor();
      expect(typeof i.id).toBe("number");
      expect(i.cbTypes).toBeInstanceOf(MockZNPList);
      expect(i.cbsets).toBeInstanceOf(MockZNPList);
      expect(i.userData).toBeNull();
      expect(i.group).toBeNull();
    });

    it("assigns monotonically increasing interactor ids", () => {
      const a = new ZPP_Interactor();
      const b = new ZPP_Interactor();
      expect(b.id).not.toBe(a.id);
    });

    it("isShape/isBody/isCompound default to false on a bare interactor", () => {
      const i = new ZPP_Interactor();
      expect(i.isShape()).toBe(false);
      expect(i.isBody()).toBe(false);
      expect(i.isCompound()).toBe(false);
    });
  });

  describe("static get()", () => {
    it("returns null when neither interactor has matching cbset pair", () => {
      const a = new ZPP_Interactor();
      const b = new ZPP_Interactor();
      expect(ZPP_Interactor.get(a, b)).toBeNull();
    });

    it("finds a cbset keyed on (lowId, highId) regardless of argument order", () => {
      const a = new ZPP_Interactor();
      const b = new ZPP_Interactor();
      const lo = a.id < b.id ? a.id : b.id;
      const hi = a.id < b.id ? b.id : a.id;
      const pair = { id: lo, di: hi };
      // a real shared cbset would be on both interactors — engine scans the shorter list
      a.cbsets.add(pair);
      b.cbsets.add(pair);

      expect(ZPP_Interactor.get(a, b)).toBe(pair);
      expect(ZPP_Interactor.get(b, a)).toBe(pair);
    });

    it("scans the shorter cbset list for efficiency", () => {
      const a = new ZPP_Interactor();
      const b = new ZPP_Interactor();
      const lo = a.id < b.id ? a.id : b.id;
      const hi = a.id < b.id ? b.id : a.id;
      const matching = { id: lo, di: hi };
      // a has 3 entries (including the match), b has just the match itself
      a.cbsets.add({ id: -1, di: -1 });
      a.cbsets.add(matching);
      a.cbsets.add({ id: -2, di: -2 });
      b.cbsets.add(matching);

      expect(ZPP_Interactor.get(a, b)).toBe(matching);
    });
  });

  describe("int_callback() — direction filtering", () => {
    function makeOpt(includesList: any[], excludesList: any[]): any {
      const includes = new MockZNPList();
      const excludes = new MockZNPList();
      includesList.forEach((e) => includes.add(e));
      excludesList.forEach((e) => excludes.add(e));
      return {
        includes,
        excludes,
        nonemptyintersection: (xs: any, ys: any) => {
          // simple "share at least one element" check
          let xite = xs.head;
          while (xite != null) {
            let yite = ys.head;
            while (yite != null) {
              if (yite.elt === xite.elt) return true;
              yite = yite.next;
            }
            xite = xite.next;
          }
          return false;
        },
      };
    }

    function makeInteractor(types: any[]): any {
      const cbTypes = new MockZNPList();
      types.forEach((t) => cbTypes.add(t));
      return { cbTypes };
    }

    it("assigns int1=o1/int2=o2 when both sides pass the include filter", () => {
      const t1 = { id: 1 };
      const t2 = { id: 2 };
      const o1 = makeInteractor([t1]);
      const o2 = makeInteractor([t2]);
      const set = {
        int1: o1,
        int2: o2,
        options1: makeOpt([t1], []),
        options2: makeOpt([t2], []),
      };
      const cb: any = { int1: null, int2: null };

      ZPP_Interactor.int_callback(set, set, cb);

      expect(cb.int1).toBe(o1);
      expect(cb.int2).toBe(o2);
    });

    it("flips int1/int2 when the first interactor fails the filter", () => {
      const t1 = { id: 1 };
      const t2 = { id: 2 };
      const o1 = makeInteractor([t1]);
      const o2 = makeInteractor([t2]);
      const set = {
        int1: o1,
        int2: o2,
        // options1 includes t2 only — o1 (carrying t1) fails the filter
        options1: makeOpt([t2], []),
        options2: makeOpt([t1], []),
      };
      const cb: any = { int1: null, int2: null };

      ZPP_Interactor.int_callback(set, set, cb);

      expect(cb.int1).toBe(o2);
      expect(cb.int2).toBe(o1);
    });

    it("flips when an exclude on the second side rejects o2", () => {
      const t1 = { id: 1 };
      const t2 = { id: 2 };
      const o1 = makeInteractor([t1]);
      const o2 = makeInteractor([t2]);
      const set = {
        int1: o1,
        int2: o2,
        options1: makeOpt([t1], []),
        options2: makeOpt([t2], [t2]), // include t2 but also exclude it
      };
      const cb: any = { int1: null, int2: null };

      ZPP_Interactor.int_callback(set, set, cb);

      // tmp is false → flipped assignment
      expect(cb.int1).toBe(o2);
      expect(cb.int2).toBe(o1);
    });
  });

  describe("setGroup()", () => {
    it("attaches a group without touching space lists when not in a space", () => {
      const i = new ZPP_Interactor();
      // Concrete interactors always have one of ishape/ibody/icompound set; pretend body with no space.
      i.ibody = { space: null } as any;
      const oldGroup = { interactors: new MockZNPList() };
      const newGroup = { interactors: new MockZNPList() };
      i.group = oldGroup;

      i.setGroup(newGroup);

      expect(i.group).toBe(newGroup);
      // when not in a space neither list is modified
      expect(oldGroup.interactors.length).toBe(0);
      expect(newGroup.interactors.length).toBe(0);
    });

    it("does nothing if the same group is assigned", () => {
      const i = new ZPP_Interactor();
      i.ibody = { space: null } as any;
      const g = { interactors: new MockZNPList() };
      i.group = g;

      i.setGroup(g);

      expect(g.interactors.length).toBe(0);
    });

    it("transfers an in-space interactor's group membership and wakes the owning body", () => {
      const i = new ZPP_Interactor();
      const wake = vi.fn();
      // Pretend this interactor is a shape with a body in a space
      i.ishape = { body: { wake, space: { stamp: 0 } } };
      const oldGroup = { interactors: new MockZNPList() };
      const newGroup = { interactors: new MockZNPList() };
      // pre-populate to confirm removal
      oldGroup.interactors.add(i);
      i.group = oldGroup;

      i.setGroup(newGroup);

      expect(oldGroup.interactors.has(i)).toBe(false);
      expect(newGroup.interactors.has(i)).toBe(true);
      expect(wake).toHaveBeenCalled();
    });

    it("can clear group (set to null) while in a space", () => {
      const i = new ZPP_Interactor();
      const wake = vi.fn();
      i.ibody = { space: { stamp: 0 }, wake };
      const oldGroup = { interactors: new MockZNPList() };
      oldGroup.interactors.add(i);
      i.group = oldGroup;

      i.setGroup(null);

      expect(i.group).toBeNull();
      expect(oldGroup.interactors.has(i)).toBe(false);
      expect(wake).toHaveBeenCalled();
    });
  });

  describe("lookup_group()", () => {
    it("returns null when nothing in the chain has a group", () => {
      const i = new ZPP_Interactor();
      i.ibody = { compound: null }; // a body without a parent compound

      expect(i.lookup_group()).toBeNull();
    });

    it("returns this interactor's own group when present", () => {
      const i = new ZPP_Interactor();
      const g = { interactors: new MockZNPList() };
      i.group = g;
      expect(i.lookup_group()).toBe(g);
    });

    it("walks shape → body → compound until it finds a group", () => {
      // outer compound owns the group
      const outerCompound = new ZPP_Interactor();
      outerCompound.icompound = outerCompound;
      outerCompound.group = { tag: "outer" };
      // body sits under outerCompound
      const body = new ZPP_Interactor();
      body.ibody = body as any;
      (body as any).compound = outerCompound;
      // shape sits under body
      const shape = new ZPP_Interactor();
      shape.ishape = { body };

      expect(shape.lookup_group()).toBe(outerCompound.group);
    });

    it("falls off the end and returns null when nothing has a group", () => {
      const top = new ZPP_Interactor();
      top.icompound = top;
      (top as any).compound = null;
      const child = new ZPP_Interactor();
      child.icompound = child;
      (child as any).compound = top;

      expect(child.lookup_group()).toBeNull();
    });
  });

  describe("immutable_midstep()", () => {
    it("throws when an attached body's space is mid-step", () => {
      const i = new ZPP_Interactor();
      i.ibody = { space: { midstep: true } };
      expect(() => i.immutable_midstep("X")).toThrow(/cannot be set during a space step/);
    });

    it("does nothing when no space attached", () => {
      const i = new ZPP_Interactor();
      i.ibody = { space: null };
      expect(() => i.immutable_midstep("X")).not.toThrow();
    });

    it("forwards through ishape's __immutable_midstep when interactor is a shape", () => {
      const fn = vi.fn();
      const i = new ZPP_Interactor();
      i.ishape = { __immutable_midstep: fn };
      i.immutable_midstep("Shape::x");
      expect(fn).toHaveBeenCalledWith("Shape::x");
    });

    it("forwards through icompound's __imutable_midstep when interactor is a compound", () => {
      const fn = vi.fn();
      const i = new ZPP_Interactor();
      i.icompound = { __imutable_midstep: fn };
      i.immutable_midstep("Compound::x");
      expect(fn).toHaveBeenCalledWith("Compound::x");
    });
  });

  describe("__iaddedToSpace / __iremovedFromSpace", () => {
    function makeCbType() {
      return { id: Math.random(), interactors: new MockZNPList() };
    }
    function makeInSpaceInteractor(): any {
      const i = new ZPP_Interactor();
      // Stub out alloc_cbSet so we don't need a full space.cbsets.get
      (i as any).alloc_cbSet = vi.fn();
      (i as any).dealloc_cbSet = vi.fn();
      return i;
    }

    it("registers the interactor with its group and each cbType", () => {
      const i = makeInSpaceInteractor();
      const g = { interactors: new MockZNPList() };
      i.group = g;
      const cb1 = makeCbType();
      const cb2 = makeCbType();
      i.cbTypes.add(cb1);
      i.cbTypes.add(cb2);

      i.__iaddedToSpace();

      expect(g.interactors.has(i)).toBe(true);
      expect(cb1.interactors.has(i)).toBe(true);
      expect(cb2.interactors.has(i)).toBe(true);
      expect((i as any).alloc_cbSet).toHaveBeenCalled();
    });

    it("symmetric removal undoes the registrations", () => {
      const i = makeInSpaceInteractor();
      const g = { interactors: new MockZNPList() };
      g.interactors.add(i);
      i.group = g;
      const cb1 = makeCbType();
      cb1.interactors.add(i);
      i.cbTypes.add(cb1);

      i.__iremovedFromSpace();

      expect(g.interactors.has(i)).toBe(false);
      expect(cb1.interactors.has(i)).toBe(false);
      expect((i as any).dealloc_cbSet).toHaveBeenCalled();
    });

    it("works on an interactor with no group attached", () => {
      const i = makeInSpaceInteractor();
      expect(() => i.__iaddedToSpace()).not.toThrow();
      expect(() => i.__iremovedFromSpace()).not.toThrow();
    });
  });

  describe("wake() dispatch", () => {
    it("routes shape→body via body.space.non_inlined_wake", () => {
      const non_inlined_wake = vi.fn();
      const body = { space: { non_inlined_wake } };
      const i = new ZPP_Interactor();
      i.ishape = { body };

      i.wake();

      expect(non_inlined_wake).toHaveBeenCalledWith(body);
    });

    it("routes body via ibody.space.non_inlined_wake", () => {
      const non_inlined_wake = vi.fn();
      const body: any = { space: { non_inlined_wake } };
      const i = new ZPP_Interactor();
      i.ibody = body;

      i.wake();

      expect(non_inlined_wake).toHaveBeenCalledWith(body);
    });

    it("routes compound via icompound.space.wakeCompound", () => {
      const wakeCompound = vi.fn();
      const c: any = { space: { wakeCompound } };
      const i = new ZPP_Interactor();
      i.icompound = c;

      i.wake();

      expect(wakeCompound).toHaveBeenCalledWith(c);
    });

    it("is a no-op when the owning object is not in a space", () => {
      const i = new ZPP_Interactor();
      i.ibody = { space: null } as any;
      expect(() => i.wake()).not.toThrow();
    });
  });

  describe("getSpace()", () => {
    it("returns null for a free-standing shape (no body)", () => {
      const i = new ZPP_Interactor();
      i.ishape = { body: null };
      expect(i.getSpace()).toBeNull();
    });

    it("returns the body's space for a shape with a body", () => {
      const i = new ZPP_Interactor();
      const space = { tag: "s1" };
      i.ishape = { body: { space } };
      expect(i.getSpace()).toBe(space);
    });

    it("returns ibody.space for a body interactor", () => {
      const i = new ZPP_Interactor();
      const space = { tag: "body-space" };
      i.ibody = { space } as any;
      expect(i.getSpace()).toBe(space);
    });

    it("returns icompound.space for a compound interactor", () => {
      const i = new ZPP_Interactor();
      const space = { tag: "compound-space" };
      i.icompound = { space };
      expect(i.getSpace()).toBe(space);
    });
  });

  describe("setupcbTypes()", () => {
    it("creates a cbTypes wrapper with adder/subber/_modifiable callbacks", () => {
      const i = new ZPP_Interactor();
      i.setupcbTypes();

      expect(i.wrap_cbTypes).toBeTruthy();
      expect(i.wrap_cbTypes.zpp_inner.adder).toBeTypeOf("function");
      expect(i.wrap_cbTypes.zpp_inner.subber).toBeTypeOf("function");
      expect(i.wrap_cbTypes.zpp_inner.dontremove).toBe(true);
      expect(i.wrap_cbTypes.zpp_inner._modifiable).toBeTypeOf("function");
    });

    it("immutable_cbTypes delegates to immutable_midstep with 'Interactor::cbTypes'", () => {
      const i = new ZPP_Interactor();
      const spy = vi.fn();
      (i as any).immutable_midstep = spy;
      i.immutable_cbTypes();
      expect(spy).toHaveBeenCalledWith("Interactor::cbTypes");
    });
  });
});
