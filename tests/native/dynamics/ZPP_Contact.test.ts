import { describe, it, expect, beforeEach } from "vitest";
import { ZPP_Contact } from "../../../src/native/dynamics/ZPP_Contact";
import { ZPP_IContact } from "../../../src/native/dynamics/ZPP_IContact";
import { createMockZpp, createMockNape } from "../_mocks";

describe("ZPP_Contact", () => {
  beforeEach(() => {
    ZPP_Contact.zpp_pool = null;
    ZPP_Contact.internal = false;
    ZPP_Contact._wrapFn = null;
    ZPP_Contact._nape = null;
    ZPP_Contact._zpp = null;
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Contact.__name__).toEqual([
        "zpp_nape",
        "dynamics",
        "ZPP_Contact",
      ]);
    });
  });

  describe("instance defaults", () => {
    it("should initialize all fields to defaults", () => {
      const c = new ZPP_Contact();
      // Linked list fields
      expect(c.length).toBe(0);
      expect(c.pushmod).toBe(false);
      expect(c.modified).toBe(false);
      expect(c._inuse).toBe(false);
      expect(c.next).toBeNull();
      // Contact state
      expect(c.elasticity).toBe(0.0);
      expect(c.dist).toBe(0.0);
      expect(c.fresh).toBe(false);
      expect(c.hash).toBe(0);
      expect(c.stamp).toBe(0);
      expect(c.posOnly).toBe(false);
      expect(c.active).toBe(false);
      // References
      expect(c.arbiter).toBeNull();
      expect(c.wrap_position).toBeNull();
      expect(c.outer).toBeNull();
      // Position
      expect(c.px).toBe(0.0);
      expect(c.py).toBe(0.0);
      // Haxe class reference
      expect(c.__class__).toBe(ZPP_Contact);
    });

    it("should create an inner ZPP_IContact instance", () => {
      const c = new ZPP_Contact();
      expect(c.inner).toBeInstanceOf(ZPP_IContact);
    });
  });

  // ---------------------------------------------------------------------------
  // Pool management
  // ---------------------------------------------------------------------------

  describe("pool management", () => {
    it("should start with null pool", () => {
      expect(ZPP_Contact.zpp_pool).toBeNull();
    });

    it("should support pool chaining via next", () => {
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      a.next = b;
      ZPP_Contact.zpp_pool = a;
      expect(ZPP_Contact.zpp_pool).toBe(a);
      expect(ZPP_Contact.zpp_pool.next).toBe(b);
    });

    it("should support pool pop pattern", () => {
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      a.next = b;
      ZPP_Contact.zpp_pool = a;

      // Simulate pool allocation (same pattern used in compiled code)
      const allocated = ZPP_Contact.zpp_pool;
      ZPP_Contact.zpp_pool = allocated.next;
      allocated.next = null;

      expect(allocated).toBe(a);
      expect(allocated.next).toBeNull();
      expect(ZPP_Contact.zpp_pool).toBe(b);
    });
  });

  // ---------------------------------------------------------------------------
  // free / alloc
  // ---------------------------------------------------------------------------

  describe("free", () => {
    it("should clear arbiter reference", () => {
      const c = new ZPP_Contact();
      c.arbiter = { some: "arbiter" };
      c.free();
      expect(c.arbiter).toBeNull();
    });
  });

  describe("alloc", () => {
    it("should be a no-op", () => {
      const c = new ZPP_Contact();
      expect(() => c.alloc()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // inactiveme
  // ---------------------------------------------------------------------------

  describe("inactiveme", () => {
    it("should return true when not active", () => {
      const c = new ZPP_Contact();
      c.active = false;
      expect(c.inactiveme()).toBe(true);
    });

    it("should return true when arbiter is null", () => {
      const c = new ZPP_Contact();
      c.active = true;
      c.arbiter = null;
      expect(c.inactiveme()).toBe(true);
    });

    it("should return true when arbiter is not active", () => {
      const c = new ZPP_Contact();
      c.active = true;
      c.arbiter = { active: false };
      expect(c.inactiveme()).toBe(true);
    });

    it("should return false when contact and arbiter are active", () => {
      const c = new ZPP_Contact();
      c.active = true;
      c.arbiter = { active: true };
      expect(c.inactiveme()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // wrapper
  // ---------------------------------------------------------------------------

  describe("wrapper", () => {
    it("should return existing outer when already set", () => {
      const c = new ZPP_Contact();
      const mockOuter = { id: "test" };
      c.outer = mockOuter;
      expect(c.wrapper()).toBe(mockOuter);
    });

    it("should use _wrapFn when available", () => {
      const c = new ZPP_Contact();
      const mockWrapper = { id: "wrapped" };
      ZPP_Contact._wrapFn = (zpp) => {
        expect(zpp).toBe(c);
        return mockWrapper;
      };
      const result = c.wrapper();
      expect(result).toBe(mockWrapper);
      expect(c.outer).toBe(mockWrapper);
    });

    it("should fall back to _nape.dynamics.Contact when _wrapFn is null", () => {
      const c = new ZPP_Contact();
      const mockContact = { zpp_inner: null as any };
      ZPP_Contact._nape = {
        dynamics: {
          Contact: class {
            zpp_inner: any = null;
            constructor() {
              mockContact.zpp_inner = null;
              return mockContact as any;
            }
          },
        },
      };

      const result = c.wrapper();
      expect(result).toBe(mockContact);
      expect(mockContact.zpp_inner).toBe(c);
      expect(ZPP_Contact.internal).toBe(false); // restored after creation
    });

    it("should cache wrapper on subsequent calls", () => {
      const c = new ZPP_Contact();
      const mockWrapper = { id: "cached" };
      ZPP_Contact._wrapFn = () => mockWrapper;
      const first = c.wrapper();
      const second = c.wrapper();
      expect(first).toBe(second);
    });
  });

  // ---------------------------------------------------------------------------
  // position_validate
  // ---------------------------------------------------------------------------

  describe("position_validate", () => {
    it("should throw when contact is inactive", () => {
      const c = new ZPP_Contact();
      c.active = false;
      c.wrap_position = { zpp_inner: { x: 0, y: 0 } };
      expect(() => c.position_validate()).toThrow(
        "Contact not currently in use",
      );
    });

    it("should update wrap_position coords from px/py", () => {
      const c = new ZPP_Contact();
      c.active = true;
      c.arbiter = { active: true };
      c.px = 42;
      c.py = 99;
      c.wrap_position = { zpp_inner: { x: 0, y: 0 } };
      c.position_validate();
      expect(c.wrap_position.zpp_inner.x).toBe(42);
      expect(c.wrap_position.zpp_inner.y).toBe(99);
    });
  });

  // ---------------------------------------------------------------------------
  // getposition
  // ---------------------------------------------------------------------------

  describe("getposition", () => {
    it("should create a Vec2 wrapper and configure validation", () => {
      const mockZpp = createMockZpp();
      const mockNape = createMockNape();
      ZPP_Contact._zpp = mockZpp;
      ZPP_Contact._nape = mockNape;

      const c = new ZPP_Contact();
      c.active = true;
      c.arbiter = { active: true };
      c.px = 10;
      c.py = 20;

      c.getposition();

      expect(c.wrap_position).not.toBeNull();
      expect(c.wrap_position.zpp_inner._inuse).toBe(true);
      expect(c.wrap_position.zpp_inner._immutable).toBe(true);
      expect(typeof c.wrap_position.zpp_inner._validate).toBe("function");
    });

    it("should set up _validate that updates position from px/py", () => {
      const mockZpp = createMockZpp();
      const mockNape = createMockNape();
      ZPP_Contact._zpp = mockZpp;
      ZPP_Contact._nape = mockNape;

      const c = new ZPP_Contact();
      c.active = true;
      c.arbiter = { active: true };
      c.px = 5;
      c.py = 7;

      c.getposition();

      // Calling the _validate callback should update position
      c.px = 15;
      c.py = 25;
      c.wrap_position.zpp_inner._validate();
      expect(c.wrap_position.zpp_inner.x).toBe(15);
      expect(c.wrap_position.zpp_inner.y).toBe(25);
    });
  });

  // ---------------------------------------------------------------------------
  // Linked list methods (ZNPList pattern) - verify same pattern as ZPP_IContact
  // ---------------------------------------------------------------------------

  describe("linked list — add/remove/query", () => {
    it("should add to front of list", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();

      head.add(a);
      expect(head.next).toBe(a);
      expect(head.length).toBe(1);
      expect(a._inuse).toBe(true);

      head.add(b);
      expect(head.next).toBe(b);
      expect(b.next).toBe(a);
      expect(head.length).toBe(2);
    });

    it("should remove element from list", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      const c = new ZPP_Contact();
      head.add(a);
      head.add(b);
      head.add(c);

      head.remove(b);
      expect(head.length).toBe(2);
      expect(b._inuse).toBe(false);
      expect(c.next).toBe(a);
    });

    it("pop_unsafe should return removed element", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      head.add(a);
      expect(head.pop_unsafe()).toBe(a);
      expect(head.length).toBe(0);
    });

    it("should report empty/size correctly", () => {
      const head = new ZPP_Contact();
      expect(head.empty()).toBe(true);
      expect(head.size()).toBe(0);

      head.add(new ZPP_Contact());
      expect(head.empty()).toBe(false);
      expect(head.size()).toBe(1);
    });

    it("has() should find element", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      head.add(a);
      expect(head.has(a)).toBe(true);
      expect(head.has(b)).toBe(false);
    });

    it("front/back should return correct elements", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      head.add(a);
      head.add(b);
      // list: b -> a
      expect(head.front()).toBe(b);
      expect(head.back()).toBe(a);
    });

    it("at() should return element at index", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      head.add(a);
      head.add(b);
      // list: b -> a
      expect(head.at(0)).toBe(b);
      expect(head.at(1)).toBe(a);
      expect(head.at(2)).toBeNull();
    });

    it("reverse should reverse list order", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      const c = new ZPP_Contact();
      head.add(a);
      head.add(b);
      head.add(c);
      // list: c -> b -> a

      head.reverse();
      expect(head.next).toBe(a);
      expect(a.next).toBe(b);
      expect(b.next).toBe(c);
      expect(c.next).toBeNull();
    });

    it("insert should insert after cursor", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      head.add(a);
      head.insert(a, b);
      expect(a.next).toBe(b);
      expect(head.length).toBe(2);
    });

    it("erase should erase head when pre is null", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      head.add(a);
      head.add(b);
      const next = head.erase(null);
      expect(next).toBe(a);
      expect(head.next).toBe(a);
      expect(head.length).toBe(1);
    });

    it("try_remove should return true/false", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      head.add(a);
      expect(head.try_remove(a)).toBe(true);
      expect(head.try_remove(a)).toBe(false);
    });

    it("clear should be a no-op", () => {
      const head = new ZPP_Contact();
      head.add(new ZPP_Contact());
      head.clear();
      expect(head.length).toBe(1);
    });

    it("splice should erase n elements after pre", () => {
      const head = new ZPP_Contact();
      const a = new ZPP_Contact();
      const b = new ZPP_Contact();
      const c = new ZPP_Contact();
      head.add(a);
      head.add(b);
      head.add(c);
      // list: c -> b -> a
      head.splice(c, 2);
      expect(c.next).toBeNull();
      expect(head.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Static internal flag
  // ---------------------------------------------------------------------------

  describe("static internal flag", () => {
    it("should default to false", () => {
      expect(ZPP_Contact.internal).toBe(false);
    });

    it("should be settable for wrapper creation", () => {
      ZPP_Contact.internal = true;
      expect(ZPP_Contact.internal).toBe(true);
      ZPP_Contact.internal = false;
    });
  });
});
