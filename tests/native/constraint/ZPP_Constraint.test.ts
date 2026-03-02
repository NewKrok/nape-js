import { describe, it, expect, beforeEach, vi } from "vitest";
import { ZPP_Constraint } from "../../../src/native/constraint/ZPP_Constraint";
import { createMockZpp, createMockNape, MockZNPList } from "../_mocks";

// Extend mock zpp with space.ZPP_Component (needed by activeInSpace / inactiveOrOutSpace)
function createConstraintMockZpp() {
  const zpp = createMockZpp();
  zpp.space = {
    ZPP_Component: class {
      static zpp_pool: any = null;
      isBody = false;
      body: any = null;
      constraint: any = null;
      sleeping = false;
      woken = false;
      next: any = null;
    },
  };
  return zpp;
}

describe("ZPP_Constraint", () => {
  let mockZpp: any;

  beforeEach(() => {
    mockZpp = createConstraintMockZpp();
    ZPP_Constraint._zpp = mockZpp;
    ZPP_Constraint._nape = createMockNape();
    mockZpp.space.ZPP_Component.zpp_pool = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Constraint.__name__).toEqual([
        "zpp_nape",
        "constraint",
        "ZPP_Constraint",
      ]);
    });
  });

  describe("constructor / _initBase", () => {
    it("should set default field values", () => {
      const c = new ZPP_Constraint();
      expect(c.stiff).toBe(true);
      expect(c.active).toBe(true);
      expect(c.ignore).toBe(false);
      expect(c.frequency).toBe(10);
      expect(c.damping).toBe(1);
      expect(c.maxForce).toBe(Infinity);
      expect(c.maxError).toBe(Infinity);
      expect(c.breakUnderForce).toBe(false);
      expect(c.breakUnderError).toBe(false);
      expect(c.removeOnBreak).toBe(true);
      expect(c.pre_dt).toBe(-1.0);
    });

    it("should assign a unique id from ZPP_ID.Constraint()", () => {
      const a = new ZPP_Constraint();
      const b = new ZPP_Constraint();
      expect(typeof a.id).toBe("number");
      expect(a.id).not.toBe(b.id);
    });

    it("should create a cbTypes linked list", () => {
      const c = new ZPP_Constraint();
      expect(c.cbTypes).toBeInstanceOf(MockZNPList);
      expect(c.cbTypes.length).toBe(0);
    });

    it("should leave outer, compound, space, component as null", () => {
      const c = new ZPP_Constraint();
      expect(c.outer).toBeNull();
      expect(c.compound).toBeNull();
      expect(c.space).toBeNull();
      expect(c.component).toBeNull();
    });

    it("should set __class__ to ZPP_Constraint", () => {
      const c = new ZPP_Constraint();
      expect(c.__class__).toBe(ZPP_Constraint);
    });

    it("_initBase can be called on a plain object (simulates compiled .call(this))", () => {
      const obj: any = {};
      ZPP_Constraint.prototype._initBase.call(obj);
      expect(obj.stiff).toBe(true);
      expect(obj.active).toBe(true);
      expect(obj.frequency).toBe(10);
      expect(obj.cbTypes).toBeInstanceOf(MockZNPList);
    });
  });

  describe("stub methods", () => {
    it("should have no-op stubs that return expected defaults", () => {
      const c = new ZPP_Constraint();
      expect(() => c.clear()).not.toThrow();
      expect(() => c.activeBodies()).not.toThrow();
      expect(() => c.inactiveBodies()).not.toThrow();
      expect(() => c.clearcache()).not.toThrow();
      expect(() => c.validate()).not.toThrow();
      expect(() => c.wake_connected()).not.toThrow();
      expect(() => c.forest()).not.toThrow();
      expect(() => c.broken()).not.toThrow();
      expect(() => c.warmStart()).not.toThrow();
      expect(() => c.draw(null)).not.toThrow();
    });

    it("pair_exists should return false", () => {
      const c = new ZPP_Constraint();
      expect(c.pair_exists(1, 2)).toBe(false);
    });

    it("preStep should return false", () => {
      const c = new ZPP_Constraint();
      expect(c.preStep(0.016)).toBe(false);
    });

    it("applyImpulseVel should return false", () => {
      const c = new ZPP_Constraint();
      expect(c.applyImpulseVel()).toBe(false);
    });

    it("applyImpulsePos should return false", () => {
      const c = new ZPP_Constraint();
      expect(c.applyImpulsePos()).toBe(false);
    });

    it("copy should return null", () => {
      const c = new ZPP_Constraint();
      expect(c.copy(null, null)).toBeNull();
    });
  });

  describe("immutable_midstep", () => {
    it("should throw when space is in mid-step", () => {
      const c = new ZPP_Constraint();
      c.space = { midstep: true };
      expect(() => c.immutable_midstep("frequency")).toThrow(
        "Error: Constraint::frequency cannot be set during space step()",
      );
    });

    it("should not throw when space is null", () => {
      const c = new ZPP_Constraint();
      c.space = null;
      expect(() => c.immutable_midstep("frequency")).not.toThrow();
    });

    it("should not throw when space is not mid-step", () => {
      const c = new ZPP_Constraint();
      c.space = { midstep: false };
      expect(() => c.immutable_midstep("frequency")).not.toThrow();
    });
  });

  describe("setupcbTypes", () => {
    it("should create wrap_cbTypes and bind adder/subber/modifiable", () => {
      const c = new ZPP_Constraint();
      c.setupcbTypes();
      expect(c.wrap_cbTypes).not.toBeNull();
      expect(c.wrap_cbTypes.zpp_inner.dontremove).toBe(true);
      expect(typeof c.wrap_cbTypes.zpp_inner.adder).toBe("function");
      expect(typeof c.wrap_cbTypes.zpp_inner.subber).toBe("function");
      expect(typeof c.wrap_cbTypes.zpp_inner._modifiable).toBe("function");
    });
  });

  describe("insert_cbtype", () => {
    it("should insert a new cbtype into cbTypes list", () => {
      const c = new ZPP_Constraint();
      const cb = { id: 5, constraints: new MockZNPList() };
      c.insert_cbtype(cb);
      expect(c.cbTypes.has(cb)).toBe(true);
      expect(c.cbTypes.length).toBe(1);
    });

    it("should not insert duplicate cbtype", () => {
      const c = new ZPP_Constraint();
      const cb = { id: 5, constraints: new MockZNPList() };
      c.insert_cbtype(cb);
      c.insert_cbtype(cb);
      expect(c.cbTypes.length).toBe(1);
    });

    it("should insert cbtypes in sorted order by id", () => {
      const c = new ZPP_Constraint();
      const cb1 = { id: 10, constraints: new MockZNPList() };
      const cb2 = { id: 5, constraints: new MockZNPList() };
      const cb3 = { id: 15, constraints: new MockZNPList() };
      c.insert_cbtype(cb1);
      c.insert_cbtype(cb2);
      c.insert_cbtype(cb3);
      expect(c.cbTypes.length).toBe(3);

      // Walk the list to verify order
      const ids: number[] = [];
      let node = c.cbTypes.head;
      while (node != null) {
        ids.push(node.elt.id);
        node = node.next;
      }
      expect(ids).toEqual([5, 10, 15]);
    });

    it("should add to space constraints and alloc cbSet when in space", () => {
      const c = new ZPP_Constraint();
      const woken = vi.fn();
      c.space = {
        wake_constraint: woken,
        cbsets: { get: () => null },
      };
      const cb = { id: 1, constraints: new MockZNPList() };
      c.insert_cbtype(cb);
      expect(cb.constraints.has(c)).toBe(true);
      expect(woken).toHaveBeenCalled();
    });
  });

  describe("wake", () => {
    it("should call space.wake_constraint when in space", () => {
      const c = new ZPP_Constraint();
      const woken = vi.fn();
      c.space = { wake_constraint: woken };
      c.wake();
      expect(woken).toHaveBeenCalledWith(c);
    });

    it("should do nothing when not in space", () => {
      const c = new ZPP_Constraint();
      c.space = null;
      expect(() => c.wake()).not.toThrow();
    });
  });

  describe("activate / deactivate", () => {
    it("activate should call activeInSpace when space is set", () => {
      const c = new ZPP_Constraint();
      c.space = { cbsets: { get: () => null } };
      c.activate();
      expect(c.component).not.toBeNull();
      expect(c.component.isBody).toBe(false);
      expect(c.component.constraint).toBe(c);
    });

    it("activate should do nothing when space is null", () => {
      const c = new ZPP_Constraint();
      c.space = null;
      c.activate();
      expect(c.component).toBeNull();
    });

    it("deactivate should call inactiveOrOutSpace when space is set", () => {
      const c = new ZPP_Constraint();
      c.space = { cbsets: { get: () => null } };
      // First activate to create a component
      c.activate();
      expect(c.component).not.toBeNull();
      c.deactivate();
      expect(c.component).toBeNull();
    });
  });

  describe("activeInSpace / inactiveOrOutSpace", () => {
    it("activeInSpace should create a new component from pool", () => {
      const c = new ZPP_Constraint();
      c.space = { cbsets: { get: () => null } };

      // Put a component in the pool
      const pooled = new mockZpp.space.ZPP_Component();
      pooled.next = null;
      mockZpp.space.ZPP_Component.zpp_pool = pooled;

      c.activeInSpace();
      expect(c.component).toBe(pooled);
      expect(mockZpp.space.ZPP_Component.zpp_pool).toBeNull();
    });

    it("activeInSpace should create a new component when pool is empty", () => {
      const c = new ZPP_Constraint();
      c.space = { cbsets: { get: () => null } };
      mockZpp.space.ZPP_Component.zpp_pool = null;
      c.activeInSpace();
      expect(c.component).not.toBeNull();
      expect(c.component.isBody).toBe(false);
    });

    it("inactiveOrOutSpace should return component to pool", () => {
      const c = new ZPP_Constraint();
      c.space = { cbsets: { get: () => null } };
      c.cbSet = null;
      c.activeInSpace();
      const comp = c.component;
      c.inactiveOrOutSpace();
      expect(c.component).toBeNull();
      expect(mockZpp.space.ZPP_Component.zpp_pool).toBe(comp);
    });
  });

  describe("addedToSpace / removedFromSpace", () => {
    it("addedToSpace should call activeInSpace and activeBodies when active", () => {
      const c = new ZPP_Constraint();
      c.active = true;
      c.space = { cbsets: { get: () => null } };
      const activeBodiesSpy = vi.spyOn(c, "activeBodies");
      c.addedToSpace();
      expect(c.component).not.toBeNull();
      expect(activeBodiesSpy).toHaveBeenCalled();
    });

    it("addedToSpace should register cbtypes with constraints list", () => {
      const c = new ZPP_Constraint();
      c.active = false;
      c.space = { cbsets: { get: () => null }, wake_constraint: vi.fn() };
      const cb = { id: 1, constraints: new MockZNPList() };
      c.insert_cbtype(cb);
      c.addedToSpace();
      expect(cb.constraints.has(c)).toBe(true);
    });

    it("removedFromSpace should deactivate and unregister cbtypes", () => {
      const c = new ZPP_Constraint();
      c.active = true;
      // Insert cbtype without space (avoids double-add to cb.constraints)
      const cb = { id: 1, constraints: new MockZNPList() };
      c.insert_cbtype(cb);
      // Now set space and add to space
      c.space = { cbsets: { get: () => null }, wake_constraint: vi.fn() };
      c.addedToSpace();
      expect(c.component).not.toBeNull();
      expect(cb.constraints.has(c)).toBe(true);

      c.removedFromSpace();
      expect(c.component).toBeNull();
      expect(cb.constraints.has(c)).toBe(false);
    });
  });

  describe("alloc_cbSet / dealloc_cbSet", () => {
    it("alloc_cbSet should set cbSet from space.cbsets.get", () => {
      const c = new ZPP_Constraint();
      const mockCbSet = { count: 0, constraints: new MockZNPList() };
      c.space = { cbsets: { get: () => mockCbSet } };
      c.alloc_cbSet();
      expect(c.cbSet).toBe(mockCbSet);
      expect(mockCbSet.count).toBe(1);
      expect(mockCbSet.constraints.has(c)).toBe(true);
    });

    it("alloc_cbSet should leave cbSet null if space returns null", () => {
      const c = new ZPP_Constraint();
      c.space = { cbsets: { get: () => null } };
      c.alloc_cbSet();
      expect(c.cbSet).toBeNull();
    });

    it("dealloc_cbSet should decrement count and remove constraint", () => {
      const c = new ZPP_Constraint();
      const mockCbSet = { count: 2, constraints: new MockZNPList() };
      mockCbSet.constraints.add(c);
      c.cbSet = mockCbSet;
      c.dealloc_cbSet();
      expect(mockCbSet.count).toBe(1);
      expect(mockCbSet.constraints.has(c)).toBe(false);
      expect(c.cbSet).toBeNull();
    });

    it("dealloc_cbSet should recycle cbSet when count reaches 0", () => {
      const c = new ZPP_Constraint();
      const cb1 = { cbsets: new MockZNPList() };
      const mockCbSet = {
        count: 1,
        constraints: new MockZNPList(),
        listeners: new MockZNPList(),
        bodylisteners: new MockZNPList(),
        conlisteners: new MockZNPList(),
        cbTypes: new MockZNPList(),
        zip_listeners: false,
        zip_bodylisteners: false,
        zip_conlisteners: false,
        next: null as any,
      };
      // Add a cbType that references the cbSet
      mockCbSet.cbTypes.add(cb1);
      cb1.cbsets.add(mockCbSet);
      mockCbSet.constraints.add(c);
      c.space = { cbsets: { remove: vi.fn() } };
      c.cbSet = mockCbSet;
      mockZpp.callbacks.ZPP_CbSet.zpp_pool = null;

      c.dealloc_cbSet();
      expect(mockCbSet.count).toBe(0);
      expect(c.space.cbsets.remove).toHaveBeenCalledWith(mockCbSet);
      expect(mockZpp.callbacks.ZPP_CbSet.zpp_pool).toBe(mockCbSet);
      expect(mockCbSet.zip_listeners).toBe(true);
      expect(mockCbSet.zip_bodylisteners).toBe(true);
      expect(mockCbSet.zip_conlisteners).toBe(true);
    });

    it("dealloc_cbSet should do nothing when cbSet is null", () => {
      const c = new ZPP_Constraint();
      c.cbSet = null;
      expect(() => c.dealloc_cbSet()).not.toThrow();
    });
  });
});
