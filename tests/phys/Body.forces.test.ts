/**
 * Body force, torque, impulse and mass integration tests.
 * Exercises native/phys ZPP_Body code paths including force application,
 * mass mode transitions, gravity scaling, and body movement flags.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { MassMode } from "../../src/phys/MassMode";
import { InertiaMode } from "../../src/phys/InertiaMode";
import { GravMassMode } from "../../src/phys/GravMassMode";

function dynCircle(x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function dynBox(x = 0, y = 0, w = 20, h = 20): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// Force application
// ---------------------------------------------------------------------------
describe("Body forces — applyImpulse", () => {
  it("should accelerate body with applyImpulse", () => {
    const space = new Space();
    const b = dynCircle();
    b.space = space;

    b.applyImpulse(new Vec2(1000, 0));
    space.step(1 / 60);

    expect(b.velocity.x).toBeGreaterThan(0);
  });

  it("should decelerate body with opposite impulse", () => {
    const space = new Space();
    const b = dynCircle();
    b.velocity = new Vec2(100, 0);
    b.space = space;

    b.applyImpulse(new Vec2(-5000, 0));
    space.step(1 / 60);

    expect(b.velocity.x).toBeLessThan(100);
  });

  it("should apply impulse at offset producing torque", () => {
    const space = new Space();
    const b = dynBox();
    b.space = space;

    // Applying impulse at offset from center creates rotation
    b.applyImpulse(new Vec2(0, 1000), new Vec2(10, 0));
    space.step(1 / 60);

    expect(Math.abs(b.angularVel)).toBeGreaterThan(0);
  });

  it("should apply angular impulse", () => {
    const space = new Space();
    const b = dynCircle();
    b.space = space;
    b.applyAngularImpulse(100);
    space.step(1 / 60);
    expect(Math.abs(b.angularVel)).toBeGreaterThan(0);
  });

  it("should apply multiple impulses cumulatively", () => {
    const space = new Space();
    const b = dynCircle();
    b.space = space;

    b.applyImpulse(new Vec2(100, 0));
    const v1 = b.velocity.x;
    b.applyImpulse(new Vec2(100, 0));
    space.step(1 / 60);

    expect(b.velocity.x).toBeGreaterThan(v1);
  });
});

// ---------------------------------------------------------------------------
// Velocity and position manipulation
// ---------------------------------------------------------------------------
describe("Body forces — velocity manipulation", () => {
  it("should set velocity directly", () => {
    const space = new Space();
    const b = dynCircle();
    b.space = space;

    b.velocity = new Vec2(200, -100);
    space.step(1 / 60);

    expect(b.velocity.x).toBeCloseTo(200, 0);
    expect(b.velocity.y).toBeCloseTo(-100, 0);
  });

  it("should set angular velocity", () => {
    const space = new Space();
    const b = dynCircle();
    b.space = space;

    b.angularVel = 5;
    space.step(1 / 60);

    expect(Math.abs(b.angularVel)).toBeGreaterThan(0);
  });

  it("should update position over time with velocity", () => {
    const space = new Space();
    const b = dynCircle();
    b.velocity = new Vec2(60, 0);
    b.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // At 60px/s for 1 second ~ 60px
    expect(b.position.x).toBeCloseTo(60, 0);
  });

  it("should set position directly", () => {
    const space = new Space();
    const b = dynCircle(0, 0);
    b.space = space;

    b.position = new Vec2(100, 200);
    space.step(1 / 60);

    expect(b.position.x).toBeCloseTo(100);
    expect(b.position.y).toBeCloseTo(200, 0);
  });

  it("should set rotation directly", () => {
    const space = new Space();
    const b = dynBox();
    b.space = space;

    b.rotation = Math.PI / 4;
    space.step(1 / 60);

    expect(b.rotation).toBeCloseTo(Math.PI / 4, 1);
  });
});

// ---------------------------------------------------------------------------
// Mass modes
// ---------------------------------------------------------------------------
describe("Body forces — mass modes", () => {
  it("should use DEFAULT mass mode (computed from shapes)", () => {
    const b = dynCircle(0, 0, 10);
    expect(b.massMode).toBe(MassMode.DEFAULT);
    expect(b.mass).toBeGreaterThan(0);
  });

  it("should set FIXED mass mode", () => {
    const b = dynCircle();
    b.massMode = MassMode.FIXED;
    b.mass = 50;
    expect(b.mass).toBeCloseTo(50);
    expect(b.massMode).toBe(MassMode.FIXED);
  });

  it("heavier body should accelerate less from same impulse", () => {
    const space1 = new Space();
    const light = dynCircle();
    light.massMode = MassMode.FIXED;
    light.mass = 1;
    light.space = space1;
    light.applyImpulse(new Vec2(100, 0));
    space1.step(1 / 60);

    const space2 = new Space();
    const heavy = dynCircle();
    heavy.massMode = MassMode.FIXED;
    heavy.mass = 100;
    heavy.space = space2;
    heavy.applyImpulse(new Vec2(100, 0));
    space2.step(1 / 60);

    expect(light.velocity.x).toBeGreaterThan(heavy.velocity.x);
  });

  it("should use DEFAULT inertia mode", () => {
    const b = dynBox();
    expect(b.inertiaMode).toBe(InertiaMode.DEFAULT);
    expect(b.inertia).toBeGreaterThan(0);
  });

  it("should set FIXED inertia mode", () => {
    const b = dynBox();
    b.inertiaMode = InertiaMode.FIXED;
    b.inertia = 1000;
    expect(b.inertia).toBeCloseTo(1000);
    expect(b.inertiaMode).toBe(InertiaMode.FIXED);
  });
});

// ---------------------------------------------------------------------------
// Gravity mass mode
// ---------------------------------------------------------------------------
describe("Body forces — gravity mass modes", () => {
  it("should apply gravity with DEFAULT gravMassMode", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynCircle();
    b.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(b.position.y).toBeGreaterThan(0);
  });

  it("should not apply gravity with FIXED gravMassMode and gravMass=0", () => {
    const space = new Space(new Vec2(0, 500));
    const b = dynCircle();
    b.gravMassMode = GravMassMode.FIXED;
    b.gravMass = 0;
    b.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // With zero grav mass, body should not fall
    expect(Math.abs(b.position.y)).toBeLessThan(5);
  });

  it("should apply stronger gravity with higher gravMass (FIXED mode)", () => {
    const space = new Space(new Vec2(0, 100));

    const b1 = dynCircle(-50, 0);
    b1.gravMassMode = GravMassMode.FIXED;
    b1.gravMass = 1;
    b1.space = space;

    const b2 = dynCircle(50, 0);
    b2.gravMassMode = GravMassMode.FIXED;
    b2.gravMass = 10;
    b2.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Body with higher gravMass falls faster
    expect(b2.position.y).toBeGreaterThan(b1.position.y);
  });

  it("should scale gravity with gravMassScale", () => {
    const space = new Space(new Vec2(0, 100));

    const b1 = dynCircle(-50, 0);
    b1.gravMassScale = 1;
    b1.space = space;

    const b2 = dynCircle(50, 0);
    b2.gravMassScale = 5;
    b2.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(b2.position.y).toBeGreaterThan(b1.position.y);
  });
});

// ---------------------------------------------------------------------------
// allowMovement / allowRotation flags
// ---------------------------------------------------------------------------
describe("Body forces — movement flags", () => {
  it("should freeze body when allowMovement is false", () => {
    const space = new Space(new Vec2(0, 500));
    const b = dynCircle();
    b.allowMovement = false;
    b.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(Math.abs(b.position.y)).toBeLessThan(1);
  });

  it("should freeze rotation when allowRotation is false", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 100));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    floor.space = space;

    const box = dynBox();
    box.allowRotation = false;
    box.velocity = new Vec2(50, 0);
    box.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    expect(Math.abs(box.rotation)).toBeLessThan(0.01);
  });

  it("should allow re-enabling movement after freeze", () => {
    const space = new Space(new Vec2(0, 100));
    const b = dynCircle();
    b.allowMovement = false;
    b.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(Math.abs(b.position.y)).toBeLessThan(1);

    b.allowMovement = true;
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(b.position.y).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Kinematic body — position/velocity
// ---------------------------------------------------------------------------
describe("Body forces — kinematic body movement", () => {
  it("should move kinematic body with position.setxy", () => {
    const space = new Space();
    const k = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    k.shapes.add(new Circle(10));
    k.space = space;

    k.position.setxy(100, 50);
    space.step(1 / 60);

    expect(k.position.x).toBeCloseTo(100);
    expect(k.position.y).toBeCloseTo(50);
  });

  it("should track kinematic body velocity correctly", () => {
    const space = new Space();
    const k = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    k.shapes.add(new Circle(10));
    k.velocity = new Vec2(120, 0);
    k.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(k.position.x).toBeCloseTo(120, 0);
  });

  it("should not be affected by gravity (kinematic)", () => {
    const space = new Space(new Vec2(0, 500));
    const k = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    k.shapes.add(new Circle(10));
    k.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(Math.abs(k.position.y)).toBeLessThan(1);
  });
});
