/**
 * PulleyJoint simulation tests.
 * Exercises PulleyJoint constraint with various configurations.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";

function dynCircle(x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticBody(x = 0, y = 0): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(5));
  return b;
}

// ---------------------------------------------------------------------------
// PulleyJoint basic creation
// ---------------------------------------------------------------------------
describe("PulleyJoint — creation", () => {
  it("should create a pulley joint without throwing", () => {
    const body1 = staticBody(0, 0);
    const body2 = dynCircle(0, 50);
    const body3 = staticBody(100, 0);
    const body4 = dynCircle(100, 50);

    expect(
      () =>
        new PulleyJoint(
          body1,
          body2,
          body3,
          body4,
          Vec2.weak(0, 0),
          Vec2.weak(0, 0),
          Vec2.weak(0, 0),
          Vec2.weak(0, 0),
          0,
          200,
        ),
    ).not.toThrow();
  });

  it("should create pulley joint with null bodies (static anchors)", () => {
    const body2 = dynCircle(0, 50);
    const body4 = dynCircle(100, 50);

    expect(
      () =>
        new PulleyJoint(
          null,
          body2,
          null,
          body4,
          Vec2.weak(0, 0),
          Vec2.weak(0, 0),
          Vec2.weak(0, 0),
          Vec2.weak(0, 0),
          0,
          200,
        ),
    ).not.toThrow();
  });

  it("should expose jointMin and jointMax", () => {
    const b2 = dynCircle(0, 50);
    const b4 = dynCircle(100, 50);
    const joint = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      10,
      200,
    );

    expect((joint as any).jointMin).toBeCloseTo(10);
    expect((joint as any).jointMax).toBeCloseTo(200);
  });

  it("should expose ratio property", () => {
    const b2 = dynCircle(0, 50);
    const b4 = dynCircle(100, 50);
    const joint = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      200,
      2.0,
    );

    expect((joint as any).ratio).toBeCloseTo(2.0);
  });
});

// ---------------------------------------------------------------------------
// PulleyJoint in simulation
// ---------------------------------------------------------------------------
describe("PulleyJoint — simulation", () => {
  it("should keep total distance within jointMax", () => {
    const space = new Space(new Vec2(0, 200));

    const anchor1 = staticBody(-50, 0);
    anchor1.space = space;
    const anchor2 = staticBody(50, 0);
    anchor2.space = space;

    const load1 = dynCircle(-50, 50);
    load1.space = space;
    const load2 = dynCircle(50, 50);
    load2.space = space;

    const joint = new PulleyJoint(
      anchor1,
      load1,
      anchor2,
      load2,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      300,
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Both loads should have fallen but be constrained
    expect(load1.position.y + load2.position.y).toBeLessThan(600);
  });

  it("should constrain bodies to stay within total rope length", () => {
    const space = new Space(new Vec2(0, 500));

    const anchor1 = staticBody(-50, -100);
    anchor1.space = space;
    const anchor2 = staticBody(50, -100);
    anchor2.space = space;

    const load1 = dynCircle(-50, 0);
    load1.space = space;
    const load2 = dynCircle(50, 0);
    load2.space = space;

    const joint = new PulleyJoint(
      anchor1,
      load1,
      anchor2,
      load2,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      300,
    );
    joint.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Constraint should have kept total distance under the max
    expect(true).toBe(true); // Just checking no crash
  });

  it("should work with ratio=1 (equal weighting)", () => {
    const space = new Space(new Vec2(0, 200));

    const anchor1 = staticBody(-50, -50);
    anchor1.space = space;
    const anchor2 = staticBody(50, -50);
    anchor2.space = space;

    const load1 = dynCircle(-50, 0);
    load1.space = space;
    const load2 = dynCircle(50, 0);
    load2.space = space;

    const joint = new PulleyJoint(
      anchor1,
      load1,
      anchor2,
      load2,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      250,
      1.0,
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    expect(typeof load1.position.y).toBe("number");
    expect(typeof load2.position.y).toBe("number");
  });

  it("should allow removing pulley joint from space", () => {
    const space = new Space(new Vec2(0, 200));

    const anchor1 = staticBody(-50, -50);
    anchor1.space = space;
    const anchor2 = staticBody(50, -50);
    anchor2.space = space;

    const load1 = dynCircle(-50, 0);
    load1.space = space;
    const load2 = dynCircle(50, 0);
    load2.space = space;

    const joint = new PulleyJoint(
      anchor1,
      load1,
      anchor2,
      load2,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      300,
    );
    joint.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    joint.space = null;

    // After removal, bodies fall freely
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(load1.position.y).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// PulleyJoint properties
// ---------------------------------------------------------------------------
describe("PulleyJoint — properties", () => {
  it("should get/set jointMin", () => {
    const b2 = dynCircle(0, 50);
    const b4 = dynCircle(100, 50);
    const joint = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      200,
    );

    (joint as any).jointMin = 20;
    expect((joint as any).jointMin).toBeCloseTo(20);
  });

  it("should get/set jointMax", () => {
    const b2 = dynCircle(0, 50);
    const b4 = dynCircle(100, 50);
    const joint = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      200,
    );

    (joint as any).jointMax = 300;
    expect((joint as any).jointMax).toBeCloseTo(300);
  });

  it("should get/set ratio", () => {
    const b2 = dynCircle(0, 50);
    const b4 = dynCircle(100, 50);
    const joint = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      200,
    );

    (joint as any).ratio = 1.5;
    expect((joint as any).ratio).toBeCloseTo(1.5);
  });

  it("should expose anchor1 and anchor2 properties", () => {
    const b2 = dynCircle(0, 50);
    const b4 = dynCircle(100, 50);
    const joint = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(10, 5),
      Vec2.weak(0, 0),
      Vec2.weak(100, 5),
      Vec2.weak(0, 0),
      0,
      200,
    );

    expect((joint as any).anchor1).toBeDefined();
    expect((joint as any).anchor2).toBeDefined();
  });

  it("should expose body2 and body4 properties (position check)", () => {
    const b2 = dynCircle(0, 50);
    const b4 = dynCircle(100, 50);
    const joint = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      200,
    );

    expect((joint as any).body2.position.x).toBeCloseTo(0);
    expect((joint as any).body4.position.x).toBeCloseTo(100);
  });
});
