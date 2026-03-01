import { describe, it, expect } from "vitest";
import { Contact } from "../../src/dynamics/Contact";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { ZPP_Contact } from "../../src/native/dynamics/ZPP_Contact";
// Side-effect imports: ensure modules are registered
import "../../src/callbacks/PreFlag";
import "../../src/dynamics/CollisionArbiter";
import "../../src/dynamics/FluidArbiter";

/**
 * Helper: create a space with two colliding bodies and step until contacts exist.
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

describe("Contact", () => {
  describe("class metadata", () => {
    it("should have correct __name__", () => {
      expect(Contact.__name__).toEqual(["nape", "dynamics", "Contact"]);
    });

    it("should have __class__ set on prototype", () => {
      expect((Contact.prototype as any).__class__).toBe(Contact);
    });
  });

  describe("instantiation", () => {
    it("should throw on direct instantiation", () => {
      expect(() => new Contact()).toThrow("Cannot instantiate Contact");
    });

    it("should allow creation via ZPP_Contact.internal flag", () => {
      ZPP_Contact.internal = true;
      const c = new Contact();
      ZPP_Contact.internal = false;
      expect(c).toBeInstanceOf(Contact);
      expect(c.zpp_inner).toBeNull();
    });
  });

  describe("ZPP_Contact wrapper integration", () => {
    it("should create Contact via ZPP_Contact.wrapper()", () => {
      const zpp = new ZPP_Contact();
      const contact = zpp.wrapper();
      expect(contact).toBeInstanceOf(Contact);
      expect(contact.zpp_inner).toBe(zpp);
      expect(zpp.outer).toBe(contact);
    });

    it("should cache wrapper on repeated calls", () => {
      const zpp = new ZPP_Contact();
      const first = zpp.wrapper();
      const second = zpp.wrapper();
      expect(first).toBe(second);
    });
  });

  describe("with simulated contacts", () => {
    it("should provide contacts from CollisionArbiter", () => {
      const { space } = createCollisionScene();
      const arb = space.arbiters.at(0);
      const colArb = arb.collisionArbiter;
      const contacts = colArb.contacts;
      expect(contacts.get_length()).toBeGreaterThan(0);
    });

    it("should expose position as Vec2", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const pos = contact.position;
      expect(pos).toBeDefined();
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
    });

    it("should expose penetration as a number", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      expect(typeof contact.penetration).toBe("number");
    });

    it("should expose fresh as a boolean", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      expect(typeof contact.fresh).toBe("boolean");
    });

    it("should expose friction as a number", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      expect(typeof contact.friction).toBe("number");
    });

    it("should expose arbiter pointing to the parent CollisionArbiter", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      expect(contact.arbiter).toBeDefined();
      expect(contact.arbiter).not.toBeNull();
    });

    it("normalImpulse should return Vec3", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const imp = contact.normalImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("tangentImpulse should return Vec3", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const imp = contact.tangentImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
    });

    it("rollingImpulse should return a number", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const imp = contact.rollingImpulse();
      expect(typeof imp).toBe("number");
    });

    it("totalImpulse should return Vec3", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const imp = contact.totalImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("normalImpulse with body should return body-specific impulse", () => {
      const { space, floor, ball } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const arb = space.arbiters.at(0);
      const body1 = arb.body1;
      const imp = contact.normalImpulse(body1);
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("tangentImpulse with body should return body-specific impulse", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const arb = space.arbiters.at(0);
      const body1 = arb.body1;
      const imp = contact.tangentImpulse(body1);
      expect(typeof imp.x).toBe("number");
    });

    it("rollingImpulse with body should return body-specific value", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const arb = space.arbiters.at(0);
      const body1 = arb.body1;
      const imp = contact.rollingImpulse(body1);
      expect(typeof imp).toBe("number");
    });

    it("totalImpulse with body should return body-specific impulse", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const arb = space.arbiters.at(0);
      const body1 = arb.body1;
      const imp = contact.totalImpulse(body1);
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("impulse with wrong body should throw", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      const unrelatedBody = new Body(BodyType.DYNAMIC);
      expect(() => contact.normalImpulse(unrelatedBody)).toThrow(
        "does not relate to the given body",
      );
    });
  });

  describe("toString", () => {
    it("should return {Contact} for active contacts", () => {
      const { space } = createCollisionScene();
      const colArb = space.arbiters.at(0).collisionArbiter;
      const contact = colArb.contacts.at(0);
      expect(contact.toString()).toBe("{Contact}");
    });
  });
});
