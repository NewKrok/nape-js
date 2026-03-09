import { describe, it, expect } from "vitest";
import { CollisionArbiter } from "../../src/dynamics/CollisionArbiter";
import { Arbiter } from "../../src/dynamics/Arbiter";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { BodyType } from "../../src/phys/BodyType";
import "../../src/callbacks/PreFlag";
import "../../src/dynamics/Contact";

/**
 * Helper: create a space with two overlapping circle bodies and step once.
 * An InteractionListener captures the CollisionArbiter from the BEGIN callback.
 */
function createCircleCollision() {
  const space = new Space(new Vec2(0, 0));

  let captured: CollisionArbiter | null = null;
  const listener = new InteractionListener(
    CbEvent.BEGIN,
    InteractionType.COLLISION,
    CbType.ANY_BODY,
    CbType.ANY_BODY,
    (cb: any) => {
      // cb is an InteractionCallback; cb.arbiters is an ArbiterList
      const arbiters = cb.arbiters;
      for (let i = 0; i < arbiters.length; i++) {
        const arb = arbiters.at(i);
        if (arb.isCollisionArbiter()) {
          captured = arb.collisionArbiter;
          break;
        }
      }
    },
  );
  listener.space = space;

  const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  b1.shapes.add(new Circle(50));
  b1.space = space;

  const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
  b2.shapes.add(new Circle(50));
  b2.space = space;

  space.step(1 / 60);

  return { space, b1, b2, captured };
}

/**
 * Helper: create a polygon-on-polygon collision scene using gravity.
 * A box falls onto a static floor; we step until a collision arbiter appears.
 */
function createPolygonCollision() {
  const space = new Space(new Vec2(0, 500));

  const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
  floor.shapes.add(new Polygon(Polygon.box(500, 10)));
  floor.space = space;

  const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  box.shapes.add(new Polygon(Polygon.box(20, 20)));
  box.space = space;

  // Step until collision occurs
  for (let i = 0; i < 60; i++) {
    space.step(1 / 60, 10, 10);
  }

  return { space, floor, box };
}

describe("CollisionArbiter", () => {
  // -------------------------------------------------------------------------
  // Construction guards
  // -------------------------------------------------------------------------

  it("cannot be instantiated directly", () => {
    expect(() => new CollisionArbiter()).toThrow("Cannot instantiate");
  });

  it("extends Arbiter", () => {
    expect(CollisionArbiter.__super__).toBe(Arbiter);
  });

  it("has correct __name__", () => {
    expect(CollisionArbiter.__name__).toEqual([
      "nape",
      "dynamics",
      "CollisionArbiter",
    ]);
  });

  // -------------------------------------------------------------------------
  // Callback-captured CollisionArbiter (circle-circle)
  // -------------------------------------------------------------------------

  describe("circle-circle collision via callback", () => {
    it("captures a CollisionArbiter in the BEGIN callback", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      expect(captured).toBeInstanceOf(CollisionArbiter);
    });

    it("isCollisionArbiter() returns true", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      const arb = captured as unknown as Arbiter;
      expect(arb.isCollisionArbiter()).toBe(true);
      expect(arb.isFluidArbiter()).toBe(false);
      expect(arb.isSensorArbiter()).toBe(false);
    });

    it("normal is a unit Vec2", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      const normal = captured!.normal;
      expect(normal).toBeDefined();
      const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      expect(len).toBeCloseTo(1, 3);
    });

    it("contacts is defined and non-empty", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      const contacts = captured!.contacts as any;
      expect(contacts).toBeDefined();
      expect(contacts.length).toBeGreaterThan(0);
    });

    it("radius is a non-negative number", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      expect(typeof captured!.radius).toBe("number");
      expect(captured!.radius).toBeGreaterThanOrEqual(0);
    });

    it("elasticity is a non-negative number", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      expect(typeof captured!.elasticity).toBe("number");
      expect(captured!.elasticity).toBeGreaterThanOrEqual(0);
    });

    it("dynamicFriction is a non-negative number", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      expect(typeof captured!.dynamicFriction).toBe("number");
      expect(captured!.dynamicFriction).toBeGreaterThanOrEqual(0);
    });

    it("staticFriction is a non-negative number", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      expect(typeof captured!.staticFriction).toBe("number");
      expect(captured!.staticFriction).toBeGreaterThanOrEqual(0);
    });

    it("rollingFriction is a non-negative number", () => {
      const { captured } = createCircleCollision();
      expect(captured).not.toBeNull();
      expect(typeof captured!.rollingFriction).toBe("number");
      expect(captured!.rollingFriction).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------------
  // Arbiter access via space.arbiters (polygon collision)
  // -------------------------------------------------------------------------

  describe("polygon collision via space.arbiters", () => {
    it("exposes a CollisionArbiter from space.arbiters", () => {
      const { space } = createPolygonCollision();
      const arb = space.arbiters.at(0);
      expect(arb).toBeDefined();
      expect(arb.isCollisionArbiter()).toBe(true);
      expect(arb.collisionArbiter).not.toBeNull();
    });

    it("referenceEdge1 and referenceEdge2 are Edge or null", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      // For polygon-polygon, reference edges may be non-null
      const e1 = colArb.referenceEdge1;
      const e2 = colArb.referenceEdge2;
      // They are either null or an Edge object
      if (e1 !== null) {
        expect(e1).toBeDefined();
      }
      if (e2 !== null) {
        expect(e2).toBeDefined();
      }
    });

    it("firstVertex() and secondVertex() return booleans", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      expect(typeof colArb.firstVertex()).toBe("boolean");
      expect(typeof colArb.secondVertex()).toBe("boolean");
    });
  });

  // -------------------------------------------------------------------------
  // Impulse methods
  // -------------------------------------------------------------------------

  describe("impulse methods", () => {
    it("normalImpulse() returns a Vec3", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      const imp = colArb.normalImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("tangentImpulse() returns a Vec3", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      const imp = colArb.tangentImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
    });

    it("totalImpulse() returns a Vec3", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      const imp = colArb.totalImpulse();
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
      expect(typeof imp.y).toBe("number");
      expect(typeof imp.z).toBe("number");
    });

    it("rollingImpulse() returns a number", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      const imp = colArb.rollingImpulse();
      expect(typeof imp).toBe("number");
    });

    it("normalImpulse(body) scoped to a specific body", () => {
      const { space, box } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      const imp = colArb.normalImpulse(box);
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
    });

    it("totalImpulse(body) scoped to a specific body", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      // Use one of the arbiter's bodies
      const body = (colArb as unknown as Arbiter).body1;
      const imp = colArb.totalImpulse(body);
      expect(imp).toBeDefined();
      expect(typeof imp.x).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  // toString
  // -------------------------------------------------------------------------

  describe("toString", () => {
    it("includes CollisionArbiter in the string", () => {
      const { space } = createPolygonCollision();
      const arb = space.arbiters.at(0);
      const str = arb.toString();
      expect(str).toContain("CollisionArbiter");
    });
  });

  // -------------------------------------------------------------------------
  // Setter validation (outside pre-handler)
  // -------------------------------------------------------------------------

  describe("mutable property guards", () => {
    it("setting elasticity outside pre-handler throws", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      expect(() => {
        colArb.elasticity = 0.5;
      }).toThrow("only mutable during a pre-handler");
    });

    it("setting dynamicFriction outside pre-handler throws", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      expect(() => {
        colArb.dynamicFriction = 0.5;
      }).toThrow("only mutable during a pre-handler");
    });

    it("setting staticFriction outside pre-handler throws", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      expect(() => {
        colArb.staticFriction = 0.5;
      }).toThrow("only mutable during a pre-handler");
    });

    it("setting rollingFriction outside pre-handler throws", () => {
      const { space } = createPolygonCollision();
      const colArb = space.arbiters.at(0).collisionArbiter!;
      expect(() => {
        colArb.rollingFriction = 0.5;
      }).toThrow("only mutable during a pre-handler");
    });
  });
});
