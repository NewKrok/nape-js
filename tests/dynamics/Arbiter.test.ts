import { describe, it, expect } from "vitest";
import { Arbiter } from "../../src/dynamics/Arbiter";
import { CollisionArbiter } from "../../src/dynamics/CollisionArbiter";
import { FluidArbiter } from "../../src/dynamics/FluidArbiter";
import { ArbiterType } from "../../src/dynamics/ArbiterType";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
// Side-effect imports: ensure these TS modules are loaded so their classes
// are registered in the compiled namespace before runtime usage.
import "../../src/callbacks/PreFlag";
import "../../src/dynamics/Contact";

/**
 * Helper: create a space with two colliding bodies and step until arbiters exist.
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

describe("Arbiter", () => {
  it("should have correct __name__", () => {
    expect(Arbiter.__name__).toEqual(["nape", "dynamics", "Arbiter"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new Arbiter()).toThrow("Cannot instantiate");
  });

  it("should have __class__ set on prototype", () => {
    expect((Arbiter.prototype as any).__class__).toBe(Arbiter);
  });

  it("should be accessible via collision arbiters after simulation", () => {
    const { space } = createCollisionScene();
    const arbiters = space.arbiters;
    // ZPP_SpaceArbiterList has its own at() but no get_length() — verify via at(0)
    const arb = arbiters.at(0);
    expect(arb).toBeDefined();
    expect(arb).not.toBeNull();
  });

  it("should expose shape1, shape2, body1, body2 on collision arbiters", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    expect(arb.shape1).toBeDefined();
    expect(arb.shape2).toBeDefined();
    expect(arb.body1).toBeDefined();
    expect(arb.body2).toBeDefined();
  });

  it("should report correct arbiter type for collision", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    expect(arb.isCollisionArbiter()).toBe(true);
    expect(arb.isFluidArbiter()).toBe(false);
    expect(arb.isSensorArbiter()).toBe(false);
  });

  it("should have a type property returning ArbiterType", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    expect(arb.type).toBe(ArbiterType.get_COLLISION());
  });

  it("should have isSleeping property", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    expect(typeof arb.isSleeping).toBe("boolean");
  });

  it("should provide collisionArbiter getter", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    expect(arb.collisionArbiter).not.toBeNull();
  });

  it("should provide fluidArbiter as null for collision type", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    expect(arb.fluidArbiter).toBeNull();
  });

  it("toString should include arbiter type and shape info", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    const str = arb.toString();
    expect(str).toContain("CollisionArbiter");
    expect(str).toContain("(");
    expect(str).toContain(")");
  });
});

describe("CollisionArbiter", () => {
  it("should have correct __name__", () => {
    expect(CollisionArbiter.__name__).toEqual([
      "nape",
      "dynamics",
      "CollisionArbiter",
    ]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new CollisionArbiter()).toThrow("Cannot instantiate");
  });

  it("should have __class__ set on prototype", () => {
    expect((CollisionArbiter.prototype as any).__class__).toBe(
      CollisionArbiter,
    );
  });

  it("should extend Arbiter", () => {
    expect(CollisionArbiter.__super__).toBe(Arbiter);
  });

  it("should expose contacts list", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    const colArb = arb.collisionArbiter;
    expect(colArb.contacts).toBeDefined();
    expect(colArb.contacts.get_length()).toBeGreaterThan(0);
  });

  it("should expose collision normal", () => {
    const { space } = createCollisionScene();
    const arb = space.arbiters.at(0);
    const colArb = arb.collisionArbiter;
    const normal = colArb.normal;
    expect(normal).toBeDefined();
    // Normal should be a unit vector (length ~1)
    const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
    expect(len).toBeCloseTo(1, 3);
  });

  it("should expose radius", () => {
    const { space } = createCollisionScene();
    const colArb = space.arbiters.at(0).collisionArbiter;
    expect(typeof colArb.radius).toBe("number");
  });

  it("should expose elasticity", () => {
    const { space } = createCollisionScene();
    const colArb = space.arbiters.at(0).collisionArbiter;
    expect(typeof colArb.elasticity).toBe("number");
    expect(colArb.elasticity).toBeGreaterThanOrEqual(0);
  });

  it("should expose friction values", () => {
    const { space } = createCollisionScene();
    const colArb = space.arbiters.at(0).collisionArbiter;
    expect(typeof colArb.dynamicFriction).toBe("number");
    expect(typeof colArb.staticFriction).toBe("number");
    expect(typeof colArb.rollingFriction).toBe("number");
  });

  it("totalImpulse should return Vec3", () => {
    const { space } = createCollisionScene();
    const colArb = space.arbiters.at(0).collisionArbiter;
    const imp = colArb.totalImpulse();
    expect(imp).toBeDefined();
    expect(typeof imp.x).toBe("number");
    expect(typeof imp.y).toBe("number");
    expect(typeof imp.z).toBe("number");
  });

  it("normalImpulse should return Vec3", () => {
    const { space } = createCollisionScene();
    const colArb = space.arbiters.at(0).collisionArbiter;
    const imp = colArb.normalImpulse();
    expect(imp).toBeDefined();
    expect(typeof imp.x).toBe("number");
  });

  it("tangentImpulse should return Vec3", () => {
    const { space } = createCollisionScene();
    const colArb = space.arbiters.at(0).collisionArbiter;
    const imp = colArb.tangentImpulse();
    expect(imp).toBeDefined();
    expect(typeof imp.x).toBe("number");
  });
});

describe("FluidArbiter", () => {
  it("should have correct __name__", () => {
    expect(FluidArbiter.__name__).toEqual([
      "nape",
      "dynamics",
      "FluidArbiter",
    ]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new FluidArbiter()).toThrow("Cannot instantiate");
  });

  it("should have __class__ set on prototype", () => {
    expect((FluidArbiter.prototype as any).__class__).toBe(FluidArbiter);
  });

  it("should extend Arbiter", () => {
    expect(FluidArbiter.__super__).toBe(Arbiter);
  });
});
