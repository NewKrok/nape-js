import { describe, it, expect } from "vitest";
import { getNape } from "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Contact } from "../../src/dynamics/Contact";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { InteractionListener } from "../../src/callbacks/InteractionListener";

// Side-effect imports: ensure modules are registered
import "../../src/callbacks/PreFlag";
import "../../src/dynamics/CollisionArbiter";
import "../../src/dynamics/FluidArbiter";

/**
 * Helper: create a space with two colliding circle bodies and step until contacts exist.
 * Returns the space and both bodies.
 */
function createCollisionScene() {
  const space = new Space(new Vec2(0, 500));

  const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
  floor.shapes.add(new Polygon(Polygon.box(500, 10)));
  floor.space = space;

  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  ball.shapes.add(new Circle(10));
  ball.space = space;

  // Step until collision occurs
  for (let i = 0; i < 60; i++) {
    space.step(1 / 60, 10, 10);
  }
  return { space, floor, ball };
}

/**
 * Helper: get the ContactList from the first collision arbiter in the scene.
 */
function getContacts(space: any): any {
  const arb = space.arbiters.at(0);
  const colArb = arb.collisionArbiter;
  return colArb.contacts;
}

describe("ContactList", () => {
  // --------------------------------------------------------------------------
  // Unit tests: empty list operations
  // --------------------------------------------------------------------------
  describe("empty list (unit)", () => {
    function createEmptyList() {
      const nape = getNape();
      return new nape.dynamics.ContactList();
    }

    it("should have length 0", () => {
      const list = createEmptyList();
      expect(list.length).toBe(0);
    });

    it("empty() should return true", () => {
      const list = createEmptyList();
      expect(list.empty()).toBe(true);
    });

    it("toString() should return '[]'", () => {
      const list = createEmptyList();
      expect(list.toString()).toBe("[]");
    });

    it("at(0) should throw index out of bounds", () => {
      const list = createEmptyList();
      expect(() => list.at(0)).toThrow("Index out of bounds");
    });

    it("at(-1) should throw index out of bounds", () => {
      const list = createEmptyList();
      expect(() => list.at(-1)).toThrow("Index out of bounds");
    });

    it("iterator().hasNext() should return false on empty list", () => {
      const list = createEmptyList();
      const it = list.iterator();
      expect(it.hasNext()).toBe(false);
    });

    it("for...of should yield no elements on empty list", () => {
      const list = createEmptyList();
      const items: any[] = [];
      for (const item of list) {
        items.push(item);
      }
      expect(items).toHaveLength(0);
    });

    it("foreach with null lambda should throw", () => {
      const list = createEmptyList();
      expect(() => list.foreach(null)).toThrow("Cannot execute null");
    });

    it("copy() should return a new empty list", () => {
      const list = createEmptyList();
      const copy = list.copy();
      expect(copy.length).toBe(0);
      expect(copy.empty()).toBe(true);
    });

    it("merge with null should throw", () => {
      const list = createEmptyList();
      expect(() => list.merge(null)).toThrow("Cannot merge with null");
    });

    it("clear() on empty list should not throw", () => {
      const list = createEmptyList();
      expect(() => list.clear()).not.toThrow();
      expect(list.length).toBe(0);
    });

    it("filter with null lambda should throw", () => {
      const list = createEmptyList();
      expect(() => list.filter(null)).toThrow("Cannot select elements");
    });

    it("fromArray(null) should throw", () => {
      const nape = getNape();
      const ContactListCtor = nape.dynamics.ContactList;
      expect(() => ContactListCtor.fromArray(null)).toThrow(
        "Cannot convert null Array",
      );
    });
  });

  // --------------------------------------------------------------------------
  // Integration tests: contacts from actual collision
  // --------------------------------------------------------------------------
  describe("with active contacts (integration)", () => {
    it("should have length >= 1", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      expect(contacts.length).toBeGreaterThanOrEqual(1);
    });

    it("empty() should return false", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      expect(contacts.empty()).toBe(false);
    });

    it("at(0) should return a Contact instance", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const contact = contacts.at(0);
      expect(contact).toBeInstanceOf(Contact);
    });

    it("at() with out-of-bounds index should throw", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const len = contacts.length;
      expect(() => contacts.at(len)).toThrow("Index out of bounds");
      expect(() => contacts.at(-1)).toThrow("Index out of bounds");
    });

    it("toString() should contain Contact representation", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const str = contacts.toString();
      expect(str).toMatch(/^\[/);
      expect(str).toMatch(/\]$/);
      // Should contain at least one Contact entry
      expect(str.length).toBeGreaterThan(2);
    });

    it("has() should detect contained contacts", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const contact = contacts.at(0);
      expect(contacts.has(contact)).toBe(true);
    });

    it("iterator() / hasNext() / next() should iterate all contacts", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const it = contacts.iterator();
      const items: any[] = [];
      while (it.hasNext()) {
        items.push(it.next());
      }
      expect(items.length).toBe(contacts.length);
      for (const item of items) {
        expect(item).toBeInstanceOf(Contact);
      }
    });

    it("for...of iteration should work via Symbol.iterator", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const items: any[] = [];
      for (const contact of contacts) {
        items.push(contact);
      }
      expect(items.length).toBe(contacts.length);
      for (const item of items) {
        expect(item).toBeInstanceOf(Contact);
      }
    });

    it("spread operator should work via Symbol.iterator", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const items = [...contacts];
      expect(items.length).toBe(contacts.length);
    });

    it("foreach() should call lambda for each contact", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const items: any[] = [];
      contacts.foreach((c: any) => items.push(c));
      expect(items.length).toBe(contacts.length);
      for (const item of items) {
        expect(item).toBeInstanceOf(Contact);
      }
    });

    it("copy() should return a separate list with the same contacts", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const copy = contacts.copy();
      expect(copy.length).toBe(contacts.length);
      for (let i = 0; i < copy.length; i++) {
        expect(copy.at(i)).toBe(contacts.at(i));
      }
    });

    it("copy(true) should throw since Contact is not copyable", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      expect(() => contacts.copy(true)).toThrow("not a copyable type");
    });
  });

  // --------------------------------------------------------------------------
  // Integration tests: contacts via InteractionListener callback
  // --------------------------------------------------------------------------
  describe("contacts via ONGOING callback", () => {
    it("should access contacts inside an ONGOING collision callback", () => {
      const space = new Space(new Vec2(0, 500));
      const cbType = new CbType();
      let capturedContacts: any = null;

      const listener = new InteractionListener(
        CbEvent.ONGOING,
        InteractionType.COLLISION,
        cbType,
        cbType,
        (cb: any) => {
          const colArb = cb.arbiters.at(0).collisionArbiter;
          if (colArb != null) {
            capturedContacts = colArb.contacts;
          }
        },
      );
      listener.space = space;

      const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
      const floorShape = new Polygon(Polygon.box(500, 10));
      floorShape.cbTypes.add(cbType);
      floor.shapes.add(floorShape);
      floor.space = space;

      const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      const ballShape = new Circle(10);
      ballShape.cbTypes.add(cbType);
      ball.shapes.add(ballShape);
      ball.space = space;

      // Step multiple times: first step triggers BEGIN, subsequent steps trigger ONGOING
      for (let i = 0; i < 60; i++) {
        space.step(1 / 60, 10, 10);
      }

      expect(capturedContacts).not.toBeNull();
      expect(capturedContacts.length).toBeGreaterThanOrEqual(1);
      expect(capturedContacts.at(0)).toBeInstanceOf(Contact);
    });
  });

  // --------------------------------------------------------------------------
  // Immutability
  // --------------------------------------------------------------------------
  describe("immutability", () => {
    it("contacts from an arbiter should be immutable (cannot push)", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      // The contacts list from a collision arbiter is immutable
      expect(contacts.zpp_inner.immutable).toBe(true);
      // Attempting to push should throw
      const contact = contacts.at(0);
      expect(() => contacts.push(contact)).toThrow("immutable");
    });

    it("contacts from an arbiter should be immutable (cannot pop)", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      expect(() => contacts.pop()).toThrow("immutable");
    });

    it("contacts from an arbiter should be immutable (cannot shift)", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      expect(() => contacts.shift()).toThrow("immutable");
    });

    it("contacts from an arbiter should be immutable (cannot clear)", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      expect(() => contacts.clear()).toThrow("immutable");
    });

    it("contacts from an arbiter should be immutable (cannot remove)", () => {
      const { space } = createCollisionScene();
      const contacts = getContacts(space);
      const contact = contacts.at(0);
      expect(() => contacts.remove(contact)).toThrow("immutable");
    });
  });
});
