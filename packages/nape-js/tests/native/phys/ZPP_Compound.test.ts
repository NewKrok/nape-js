import { describe, it, expect, beforeEach, vi } from "vitest";
import { ZPP_Compound } from "../../../src/native/phys/ZPP_Compound";
import { ZPP_Interactor } from "../../../src/native/phys/ZPP_Interactor";
import { createMockNape, createMockZpp, MockZNPList } from "../_mocks";

function listWrapper(list: any) {
  return {
    zpp_inner: { inner: list, reverse_flag: false },
    remove: (x: any) => list.remove(x),
  };
}

function setupCompoundStatics() {
  const zpp = createMockZpp();
  zpp.util.ZNPList_ZPP_Body = MockZNPList;
  zpp.util.ZNPList_ZPP_Compound = MockZNPList;
  zpp.util.ZNPList_ZPP_CallbackSet = MockZNPList;
  zpp.util.ZPP_BodyList = { get: listWrapper };
  zpp.util.ZPP_ConstraintList = { get: listWrapper };
  zpp.util.ZPP_CompoundList = { get: listWrapper };
  ZPP_Compound._zpp = zpp;
  ZPP_Compound._nape = createMockNape();
  ZPP_Interactor._zpp = zpp;
  ZPP_Interactor._nape = createMockNape();
}

function fakeSpace(overrides: any = {}) {
  return {
    midstep: false,
    addBody: vi.fn(),
    remBody: vi.fn(),
    addConstraint: vi.fn(),
    remConstraint: vi.fn(),
    addCompound: vi.fn(),
    remCompound: vi.fn(),
    nullInteractorType: vi.fn(),
    freshInteractorType: vi.fn(),
    bodies: new MockZNPList(),
    constraints: new MockZNPList(),
    compounds: new MockZNPList(),
    ...overrides,
  };
}

describe("ZPP_Compound", () => {
  beforeEach(() => {
    setupCompoundStatics();
  });

  describe("construction", () => {
    it("initializes empty child lists and list callbacks", () => {
      const compound = new ZPP_Compound();

      expect(compound.depth).toBe(1);
      expect(compound.bodies.length).toBe(0);
      expect(compound.constraints.length).toBe(0);
      expect(compound.compounds.length).toBe(0);
      expect(compound.wrap_bodies.zpp_inner.adder).toBeTypeOf("function");
      expect(compound.wrap_constraints.zpp_inner.subber).toBeTypeOf("function");
      expect(compound.wrap_compounds.zpp_inner._modifiable).toBeTypeOf("function");
    });

    it("self-references icompound so isCompound() works", () => {
      const compound = new ZPP_Compound();
      expect(compound.icompound).toBe(compound);
      expect(compound.isCompound()).toBe(true);
      expect(compound.isBody()).toBe(false);
      expect(compound.isShape()).toBe(false);
    });
  });

  describe("body parenting", () => {
    it("parents and de-parents bodies while forwarding space membership", () => {
      const compound = new ZPP_Compound();
      const space = fakeSpace();
      compound.space = space;
      const body = { compound: null, space: null };
      const wrapper = { zpp_inner: body };

      expect(compound.bodies_adder(wrapper)).toBe(true);
      expect(body.compound).toBe(compound);
      expect(space.addBody).toHaveBeenCalledWith(body);

      compound.bodies_subber(wrapper);

      expect(body.compound).toBeNull();
      expect(space.remBody).toHaveBeenCalledWith(body);
    });

    it("returns false and skips space.addBody when the body already belongs to this compound", () => {
      const compound = new ZPP_Compound();
      const space = fakeSpace();
      compound.space = space;
      const body = { compound: compound, space: null };
      const wrapper = { zpp_inner: body };

      expect(compound.bodies_adder(wrapper)).toBe(false);
      expect(space.addBody).not.toHaveBeenCalled();
    });

    it("reparents a body from one compound to another", () => {
      const oldParent = new ZPP_Compound();
      const newParent = new ZPP_Compound();
      const oldBodies = new MockZNPList();
      // wrap_bodies.remove is what reparenting calls — stub it
      const removeSpy = vi.fn((x: any) => oldBodies.remove(x));
      oldParent.wrap_bodies = { remove: removeSpy } as any;

      const body = { compound: oldParent, space: null };
      const wrapper = { zpp_inner: body };

      expect(newParent.bodies_adder(wrapper)).toBe(true);
      expect(removeSpy).toHaveBeenCalledWith(wrapper);
      expect(body.compound).toBe(newParent);
    });

    it("moves a free-roaming body out of its space when it gets parented", () => {
      const compound = new ZPP_Compound();
      const oldSpace = { wrap_bodies: { remove: vi.fn() } };
      const body = { compound: null, space: oldSpace };
      const wrapper = { zpp_inner: body };

      expect(compound.bodies_adder(wrapper)).toBe(true);
      expect(oldSpace.wrap_bodies.remove).toHaveBeenCalledWith(wrapper);
      expect(body.compound).toBe(compound);
    });

    it("bodies_modifiable throws during space step", () => {
      const compound = new ZPP_Compound();
      compound.space = { midstep: true };
      expect(() => compound.bodies_modifiable()).toThrow(/cannot be set during/);
    });

    it("bodies_modifiable is a no-op outside a step", () => {
      const compound = new ZPP_Compound();
      compound.space = { midstep: false };
      expect(() => compound.bodies_modifiable()).not.toThrow();
    });
  });

  describe("constraint parenting", () => {
    it("forwards constraints into the compound's space", () => {
      const compound = new ZPP_Compound();
      const space = fakeSpace();
      compound.space = space;
      const c = { compound: null, space: null };
      const wrapper = { zpp_inner: c };

      expect(compound.constraints_adder(wrapper)).toBe(true);
      expect(c.compound).toBe(compound);
      expect(space.addConstraint).toHaveBeenCalledWith(c);

      compound.constraints_subber(wrapper);
      expect(c.compound).toBeNull();
      expect(space.remConstraint).toHaveBeenCalledWith(c);
    });

    it("constraints_modifiable mirrors body guard", () => {
      const compound = new ZPP_Compound();
      compound.space = { midstep: true };
      expect(() => compound.constraints_modifiable()).toThrow(/cannot be set during/);
    });
  });

  describe("compound parenting and depth", () => {
    it("updates nested compound depth and rejects cycles", () => {
      const parent = new ZPP_Compound();
      const child = new ZPP_Compound();
      child.outer = { toString: () => "child" };
      parent.depth = 3;

      expect(parent.compounds_adder({ zpp_inner: child, toString: () => "child" })).toBe(true);
      expect(child.compound).toBe(parent);
      expect(child.depth).toBe(4);

      expect(() => child.compounds_adder({ zpp_inner: parent, toString: () => "parent" })).toThrow(
        /cycle/,
      );

      parent.compounds_subber({ zpp_inner: child });
      expect(child.compound).toBeNull();
      expect(child.depth).toBe(1);
    });

    it("forwards nested compound add to space.addCompound", () => {
      const parent = new ZPP_Compound();
      const child = new ZPP_Compound();
      const space = fakeSpace();
      parent.space = space;
      parent.outer = { toString: () => "parent" };

      const wrapper = { zpp_inner: child, toString: () => "child" };
      expect(parent.compounds_adder(wrapper)).toBe(true);
      expect(space.addCompound).toHaveBeenCalledWith(child);

      parent.compounds_subber(wrapper);
      expect(space.remCompound).toHaveBeenCalledWith(child);
    });

    it("detects deep cycles (grandparent assignment)", () => {
      const root = new ZPP_Compound();
      const mid = new ZPP_Compound();
      const leaf = new ZPP_Compound();
      root.outer = { toString: () => "root" };
      mid.outer = { toString: () => "mid" };
      leaf.outer = { toString: () => "leaf" };

      root.compounds_adder({ zpp_inner: mid, toString: () => "mid" });
      mid.compounds_adder({ zpp_inner: leaf, toString: () => "leaf" });

      // Attempting to make root a child of leaf would create root→mid→leaf→root cycle.
      expect(() => leaf.compounds_adder({ zpp_inner: root, toString: () => "root" })).toThrow(
        /cycle/,
      );
    });

    it("compounds_modifiable enforces mid-step guard", () => {
      const compound = new ZPP_Compound();
      compound.space = { midstep: true };
      expect(() => compound.compounds_modifiable()).toThrow(/cannot be set during/);
    });
  });

  describe("breakApart", () => {
    it("breaks apart an empty compound without requiring children", () => {
      const compound = new ZPP_Compound();
      compound.__iremovedFromSpace = vi.fn();
      const remove = vi.fn();
      compound.space = {
        nullInteractorType: vi.fn(),
        compounds: { remove },
      };

      compound.breakApart();

      expect(compound.__iremovedFromSpace).toHaveBeenCalled();
      expect(remove).toHaveBeenCalledWith(compound);
      expect(compound.space).toBeNull();
      expect(compound.compound).toBeNull();
    });

    it("hoists bodies to the parent compound when there is one", () => {
      const parent = new ZPP_Compound();
      const compound = new ZPP_Compound();
      compound.compound = parent;
      compound.__iremovedFromSpace = vi.fn();
      const b1 = { compound: compound };
      const b2 = { compound: compound };
      compound.bodies.add(b1);
      compound.bodies.add(b2);
      // parent.compounds must contain compound so the remove() in breakApart finds it
      parent.compounds.add(compound);

      compound.breakApart();

      expect(parent.bodies.has(b1)).toBe(true);
      expect(parent.bodies.has(b2)).toBe(true);
      expect(b1.compound).toBe(parent);
      expect(b2.compound).toBe(parent);
      expect(parent.compounds.has(compound)).toBe(false);
      expect(compound.space).toBeNull();
      expect(compound.compound).toBeNull();
    });

    it("releases bodies/constraints/compounds into the space when there is no parent", () => {
      const compound = new ZPP_Compound();
      compound.__iremovedFromSpace = vi.fn();
      const space = fakeSpace();
      compound.space = space;

      const b = { compound: compound };
      const c = { compound: compound };
      const sub = { compound: compound };
      compound.bodies.add(b);
      compound.constraints.add(c);
      compound.compounds.add(sub);

      compound.breakApart();

      expect(space.bodies.has(b)).toBe(true);
      expect(space.constraints.has(c)).toBe(true);
      expect(space.compounds.has(sub)).toBe(true);
      expect(b.compound).toBeNull();
      expect(c.compound).toBeNull();
      expect(sub.compound).toBeNull();
      // both bodies and nested compounds should re-register interactor types
      expect(space.freshInteractorType).toHaveBeenCalledWith(b);
      expect(space.freshInteractorType).toHaveBeenCalledWith(sub);
    });
  });

  describe("__imutable_midstep guard", () => {
    it("throws while space is mid-step", () => {
      const compound = new ZPP_Compound();
      compound.space = { midstep: true };
      expect(() => compound.__imutable_midstep("Compound::field")).toThrow(/cannot be set during/);
    });

    it("does nothing without an attached space", () => {
      const compound = new ZPP_Compound();
      expect(() => compound.__imutable_midstep("Compound::field")).not.toThrow();
    });

    it("does nothing when the space is not mid-step", () => {
      const compound = new ZPP_Compound();
      compound.space = { midstep: false };
      expect(() => compound.__imutable_midstep("Compound::field")).not.toThrow();
    });
  });

  describe("space integration delegation", () => {
    it("addedToSpace and removedFromSpace delegate to the interactor variants", () => {
      const compound = new ZPP_Compound();
      const added = vi.fn();
      const removed = vi.fn();
      (compound as any).__iaddedToSpace = added;
      (compound as any).__iremovedFromSpace = removed;

      compound.addedToSpace();
      compound.removedFromSpace();

      expect(added).toHaveBeenCalled();
      expect(removed).toHaveBeenCalled();
    });
  });
});
