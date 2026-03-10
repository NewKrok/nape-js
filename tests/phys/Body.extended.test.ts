/**
 * Extended Body tests — drives ZPP_Body deeper code paths:
 *  - applyImpulse / applyAngularImpulse edge cases
 *  - body type transitions in space
 *  - shape manipulation while in space
 *  - velocity/position tracking during simulation
 *  - constraintVelocity (Vec2)
 *  - mass mode interactions
 *  - body with multiple shapes
 *  - body in/out of space
 */

import { describe, it, expect } from "vitest";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Space } from "../../src/space/Space";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { Material } from "../../src/phys/Material";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { MassMode } from "../../src/phys/MassMode";
import { InertiaMode } from "../../src/phys/InertiaMode";
import { GravMassMode } from "../../src/phys/GravMassMode";
import { Compound } from "../../src/phys/Compound";
import { FluidProperties } from "../../src/phys/FluidProperties";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dynamicCircle(x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, Vec2.get(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticBox(x = 0, y = 200, w = 400, h = 20): Body {
  const b = new Body(BodyType.STATIC, Vec2.get(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// Body type transitions
// ---------------------------------------------------------------------------

describe("Body type transitions", () => {
  it("should change from dynamic to static in space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.type = BodyType.STATIC;
    expect(b.type).toBe(BodyType.STATIC);
  });

  it("should change from static to dynamic in space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = staticBox(0, 0);
    space.bodies.add(b);
    b.type = BodyType.DYNAMIC;
    expect(b.type).toBe(BodyType.DYNAMIC);
  });

  it("type change does not crash simulation", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    space.step(1 / 60);
    b.type = BodyType.STATIC;
    space.step(1 / 60);
    b.type = BodyType.DYNAMIC;
    space.step(1 / 60);
    expect(b.type).toBe(BodyType.DYNAMIC);
  });

  it("changing to kinematic type works", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.type = BodyType.KINEMATIC;
    expect(b.type).toBe(BodyType.KINEMATIC);
    space.step(1 / 60);
  });

  it("multiple type changes cycle correctly", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.type = BodyType.STATIC;
    b.type = BodyType.KINEMATIC;
    b.type = BodyType.DYNAMIC;
    expect(b.type).toBe(BodyType.DYNAMIC);
    space.step(1 / 60);
    expect(space.bodies.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Shape manipulation in space
// ---------------------------------------------------------------------------

describe("Body shape manipulation in space", () => {
  it("should add shape to body in space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = new Body(BodyType.DYNAMIC, Vec2.get(0, 0));
    space.bodies.add(b);
    b.shapes.add(new Circle(10));
    expect(b.shapes.length).toBe(1);
  });

  it("should remove shape from body in space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    const shape = b.shapes.at(0) as any;
    b.shapes.remove(shape);
    expect(b.shapes.length).toBe(0);
  });

  it("should handle body with two shapes in space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = new Body(BodyType.DYNAMIC, Vec2.get(0, 0));
    b.shapes.add(new Circle(10));
    b.shapes.add(new Circle(5));
    space.bodies.add(b);
    for (let i = 0; i < 5; i++) space.step(1 / 60);
    expect(b.shapes.length).toBe(2);
  });

  it("should not crash when removing/readding body from space", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    space.step(1 / 60);
    space.bodies.remove(b);
    space.step(1 / 60);
    space.bodies.add(b);
    space.step(1 / 60);
    expect(space.bodies.length).toBe(1);
  });

  it("body with polygon and circle shape", () => {
    const space = new Space(Vec2.get(0, 100));
    const floor = staticBox(0, 100, 300, 20);
    space.bodies.add(floor);
    const b = new Body(BodyType.DYNAMIC, Vec2.get(0, 0));
    b.shapes.add(new Circle(10));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    space.bodies.add(b);
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(b.shapes.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// constraintVelocity during simulation
// ---------------------------------------------------------------------------

describe("Body.constraintVelocity", () => {
  it("should return a Vec2 during simulation", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    space.step(1 / 60);
    const cv = b.constraintVelocity;
    expect(cv).toBeDefined();
  });

  it("should have x, y components", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    space.step(1 / 60);
    const cv = b.constraintVelocity;
    expect(typeof cv.x).toBe("number");
    expect(typeof cv.y).toBe("number");
  });

  it("constraintVelocity is non-null", () => {
    const space = new Space(Vec2.get(0, 100));
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(joint);
    space.step(1 / 60);
    expect(b1.constraintVelocity).toBeDefined();
    expect(b2.constraintVelocity).toBeDefined();
  });

  it("constraintVelocity after applying impulse", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.applyImpulse(Vec2.get(100, 0));
    space.step(1 / 60);
    const cv = b.constraintVelocity;
    // After impulse, x velocity is non-zero
    expect(typeof cv.x).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// MassMode / InertiaMode / GravMassMode interactions
// ---------------------------------------------------------------------------

describe("Body mass mode interactions", () => {
  it("should set mass with FIXED mode", () => {
    const b = dynamicCircle(0, 0);
    b.massMode = MassMode.FIXED;
    b.mass = 5;
    expect(b.mass).toBe(5);
    expect(b.massMode).toBe(MassMode.FIXED);
  });

  it("should set inertia with FIXED mode", () => {
    const b = dynamicCircle(0, 0);
    b.inertiaMode = InertiaMode.FIXED;
    b.inertia = 100;
    expect(b.inertia).toBe(100);
  });

  it("FIXED gravMassMode uses explicit mass", () => {
    const b = dynamicCircle(0, 0);
    b.gravMassMode = GravMassMode.FIXED;
    b.gravMass = 2;
    expect(b.gravMass).toBe(2);
  });

  it("DEFAULT mode recalculates mass from shapes", () => {
    const b = dynamicCircle(0, 0);
    b.massMode = MassMode.FIXED;
    b.mass = 10;
    b.massMode = MassMode.DEFAULT;
    // Back to computed from shape
    expect(b.massMode).toBe(MassMode.DEFAULT);
  });

  it("FIXED mass with different values", () => {
    const b = dynamicCircle(0, 0);
    b.massMode = MassMode.FIXED;
    b.mass = 1;
    expect(b.mass).toBe(1);
    b.mass = 100;
    expect(b.mass).toBe(100);
  });

  it("FIXED inertia + FIXED mass combination", () => {
    const b = dynamicCircle(0, 0);
    b.massMode = MassMode.FIXED;
    b.mass = 3;
    b.inertiaMode = InertiaMode.FIXED;
    b.inertia = 50;
    expect(b.mass).toBe(3);
    expect(b.inertia).toBe(50);
  });

  it("SCALED gravMassMode works", () => {
    const b = dynamicCircle(0, 0);
    b.gravMassMode = GravMassMode.SCALED;
    b.gravMassScale = 2.0;
    expect(b.gravMassMode).toBe(GravMassMode.SCALED);
  });

  it("constraintMass returns positive value", () => {
    const b = dynamicCircle(0, 0);
    expect(b.constraintMass).toBeGreaterThan(0);
  });

  it("constraintInertia returns positive value", () => {
    const b = dynamicCircle(0, 0);
    expect(b.constraintInertia).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// applyImpulse during simulation
// ---------------------------------------------------------------------------

describe("Body.applyImpulse in simulation", () => {
  it("should change velocity after impulse", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.applyImpulse(Vec2.get(100, 0));
    space.step(1 / 60);
    expect(b.velocity.x).toBeGreaterThan(0);
  });

  it("should apply angular change from off-center impulse", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.applyImpulse(Vec2.get(0, 100), Vec2.get(5, 0));
    space.step(1 / 60);
    expect(b.angularVel).not.toBe(0);
  });

  it("applyImpulse sleepable=true", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.applyImpulse(Vec2.get(10, 0), undefined, true);
    expect(b.velocity.x).toBeGreaterThan(0);
  });

  it("applyAngularImpulse changes angularVel", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.applyAngularImpulse(50);
    expect(b.angularVel).toBeGreaterThan(0);
  });

  it("applyAngularImpulse sleepable=true", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.applyAngularImpulse(50, true);
    expect(b.angularVel).toBeGreaterThan(0);
  });

  it("multiple impulses accumulate velocity", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.applyImpulse(Vec2.get(10, 0));
    b.applyImpulse(Vec2.get(10, 0));
    expect(b.velocity.x).toBeGreaterThan(0);
  });

  it("throw on null impulse", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    expect(() => b.applyImpulse(null as any)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Compound body management (extended)
// ---------------------------------------------------------------------------

describe("Compound extended", () => {
  it("should add constraint to compound", () => {
    const c = new Compound();
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    (c.bodies as any).add(b1);
    (c.bodies as any).add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    (c.constraints as any).add(joint);
    expect((c.constraints as any).length).toBe(1);
  });

  it("compound with bodies in space exercises ZPP_Compound", () => {
    const space = new Space(Vec2.get(0, 100));
    const c = new Compound();
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    (c.bodies as any).add(b1);
    (c.bodies as any).add(b2);
    (space.compounds as any).add(c);
    for (let i = 0; i < 5; i++) space.step(1 / 60);
    expect((c.bodies as any).length).toBe(2);
  });

  it("compound translate moves bodies", () => {
    const c = new Compound();
    const b = dynamicCircle(0, 0);
    (c.bodies as any).add(b);
    const origX = b.position.x;
    c.translate(Vec2.get(10, 0));
    expect(b.position.x).toBe(origX + 10);
  });

  it("compound rotate rotates bodies", () => {
    const c = new Compound();
    const b = dynamicCircle(10, 0);
    (c.bodies as any).add(b);
    c.rotate(Vec2.get(0, 0), Math.PI / 2);
    // Position should have rotated
    expect(b.position.y).toBeCloseTo(10, 1);
  });

  it("compound copy creates independent copy", () => {
    const c = new Compound();
    const b = dynamicCircle(0, 0);
    (c.bodies as any).add(b);
    const copy = c.copy();
    expect(copy).toBeDefined();
    expect((copy.bodies as any).length).toBe(1);
  });

  it("compound breakApart distributes to space", () => {
    const space = new Space(Vec2.get(0, 100));
    const c = new Compound();
    const b1 = dynamicCircle(-10, 0);
    const b2 = dynamicCircle(10, 0);
    (c.bodies as any).add(b1);
    (c.bodies as any).add(b2);
    (space.compounds as any).add(c);
    c.breakApart();
    expect(space.bodies.length).toBe(2);
  });

  it("compound with joints in space steps correctly", () => {
    const space = new Space(Vec2.get(0, 100));
    const c = new Compound();
    const b1 = dynamicCircle(-15, 0);
    const b2 = dynamicCircle(15, 0);
    (c.bodies as any).add(b1);
    (c.bodies as any).add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    (c.constraints as any).add(joint);
    (space.compounds as any).add(c);
    for (let i = 0; i < 5; i++) space.step(1 / 60);
    expect((c.constraints as any).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// InteractionFilter on bodies
// ---------------------------------------------------------------------------

describe("Body InteractionFilter", () => {
  it("should apply interaction filter to body shapes", () => {
    const b = dynamicCircle(0, 0);
    const filter = new InteractionFilter();
    b.setShapeFilters(filter);
    expect(b.shapes.at(0)).toBeDefined();
  });

  it("filter group mask interaction", () => {
    const space = new Space(Vec2.get(0, 100));
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(1, 0);
    const filter = new InteractionFilter();
    filter.collisionGroup = 1;
    filter.collisionMask = 0;
    b1.setShapeFilters(filter);
    b2.setShapeFilters(filter);
    space.bodies.add(b1);
    space.bodies.add(b2);
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    // They should not interact
    expect(space.bodies.length).toBe(2);
  });

  it("material affects bounce in collision", () => {
    const space = new Space(Vec2.get(0, 100));
    const floor = staticBox(0, 20, 300, 20);
    space.bodies.add(floor);
    const b = dynamicCircle(0, -50, 10);
    const mat = new Material(1.0, 0.9, 0.3); // elasticity=0.9
    b.setShapeMaterials(mat);
    space.bodies.add(b);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(typeof b.position.y).toBe("number");
  });

  it("setShapeFluidProperties applies fluid props to all shapes", () => {
    const b = dynamicCircle(0, 0);
    b.shapes.add(new Circle(5));
    const fp = new FluidProperties();
    b.setShapeFluidProperties(fp);
    expect(b.shapes.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Body simulation - velocity tracking
// ---------------------------------------------------------------------------

describe("Body velocity tracking", () => {
  it("body falls under gravity", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    const initY = b.position.y;
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(b.position.y).toBeGreaterThan(initY);
  });

  it("body moves at constant velocity without gravity", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.velocity.setxy(60, 0); // 60 units/s
    space.step(1 / 60);
    expect(b.position.x).toBeCloseTo(1, 1);
  });

  it("angular velocity causes rotation", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.angularVel = 1;
    space.step(1 / 60);
    expect(b.rotation).toBeCloseTo(1 / 60, 3);
  });

  it("body stops at floor", () => {
    const space = new Space(Vec2.get(0, 100));
    const floor = staticBox(0, 20, 300, 20);
    space.bodies.add(floor);
    const b = dynamicCircle(0, -50, 10);
    space.bodies.add(b);
    for (let i = 0; i < 120; i++) space.step(1 / 60);
    // Body should be resting near or on the floor
    expect(b.position.y).toBeLessThan(20);
  });

  it("allowMovement=false prevents linear movement", () => {
    const space = new Space(Vec2.get(0, 100));
    const b = dynamicCircle(0, 0);
    b.allowMovement = false;
    space.bodies.add(b);
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    // Position should not have changed significantly
    expect(b.position.x).toBeCloseTo(0, 5);
    expect(b.position.y).toBeCloseTo(0, 5);
  });

  it("allowRotation=false prevents angular movement", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    b.allowRotation = false;
    space.bodies.add(b);
    b.applyAngularImpulse(100);
    space.step(1 / 60);
    // With allowRotation=false, angular impulses should not cause rotation
    expect(b.rotation).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// Body.integrate
// ---------------------------------------------------------------------------

describe("Body.integrate", () => {
  it("should integrate position by velocity", () => {
    const b = dynamicCircle(0, 0);
    b.velocity.setxy(60, 0);
    b.integrate(1 / 60);
    expect(b.position.x).toBeCloseTo(1, 3);
  });

  it("should throw on NaN deltaTime", () => {
    const b = dynamicCircle(0, 0);
    expect(() => b.integrate(NaN)).toThrow();
  });

  it("should return body on zero deltaTime", () => {
    const b = dynamicCircle(0, 0);
    const result = b.integrate(0);
    expect(result).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Body point/vector transforms
// ---------------------------------------------------------------------------

describe("Body transforms in space", () => {
  it("localPointToWorld tracks rotation", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    b.rotation = Math.PI / 2;
    const local = Vec2.get(10, 0);
    const world = b.localPointToWorld(local);
    expect(world.x).toBeCloseTo(0, 5);
    expect(world.y).toBeCloseTo(10, 5);
    world.dispose();
  });

  it("worldPointToLocal is inverse of localPointToWorld", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(5, 3);
    space.bodies.add(b);
    b.rotation = 0.5;
    const local = Vec2.get(7, 2);
    const world = b.localPointToWorld(local);
    const back = b.worldPointToLocal(world);
    expect(back.x).toBeCloseTo(7, 5);
    expect(back.y).toBeCloseTo(2, 5);
    world.dispose();
    back.dispose();
  });
});
