/**
 * WeldJoint — solver branch coverage.
 *
 * Targets uncovered branches in:
 * - ZPP_WeldJoint.preStep — 3x3 effective-mass matrix invert, singular (det==0)
 *   fall-back to diagonal inverse, NaN det path, soft gamma/bias clamping
 * - warmStart — full 3-DOF warm-start
 * - applyImpulseVel / applyImpulsePos — full 3-DOF solve
 * - phase mismatch correction (rotation alignment)
 * - breakUnderError / breakUnderForce paths
 * - degenerate inertia (one or both bodies have zero rotational inertia)
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { WeldJoint } from "../../src/constraint/WeldJoint";

function dyn(space: Space, x = 0, y = 0): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(8));
  b.space = space;
  return b;
}

function staticBody(space: Space, x = 0, y = 0): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(8));
  b.space = space;
  return b;
}

// ---------------------------------------------------------------------------
// 1. Stiff weld holds position AND rotation
// ---------------------------------------------------------------------------

describe("WeldJoint — stiff lock", () => {
  it("holds two bodies at fixed relative position and rotation under gravity", () => {
    const space = new Space(new Vec2(0, 300));
    const anchor = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(anchor, b, Vec2.weak(50, 0), Vec2.weak(0, 0), 0);
    j.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    expect(b.position.x).toBeCloseTo(50, 0);
    expect(b.position.y).toBeCloseTo(0, 0);
    expect(Math.abs(b.rotation)).toBeLessThan(0.05);
  });

  it("relative phase is enforced (90-degree weld)", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const phase = Math.PI / 2;
    const j = new WeldJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), phase);
    j.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    // b.rot - a.rot - phase = 0  →  b.rot = phase
    expect(b.rotation).toBeCloseTo(phase, 1);
  });
});

// ---------------------------------------------------------------------------
// 2. Soft weld — gamma/bias path, oscillation
// ---------------------------------------------------------------------------

describe("WeldJoint — soft mode", () => {
  it("soft weld allows displacement under external force", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(a, b, Vec2.weak(0, 50), Vec2.weak(0, 0), 0);
    j.stiff = false;
    j.frequency = 1; // very soft
    j.damping = 0.5;
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Soft weld + gravity → b sags below the lock target
    expect(b.position.y).toBeGreaterThan(50);
  });

  it("soft weld with maxError clamps the bias safely", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(1000, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.stiff = false;
    j.frequency = 5;
    j.damping = 1;
    j.maxError = 5;
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(Number.isFinite(b.position.x)).toBe(true);
    expect(Number.isFinite(b.position.y)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Warm-start across dt jumps
// ---------------------------------------------------------------------------

describe("WeldJoint — warm-start across dt jumps", () => {
  it("survives mixed dt without diverging", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(40, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(a, b, Vec2.weak(40, 0), Vec2.weak(0, 0), 0);
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    for (let i = 0; i < 10; i++) space.step(1 / 30);
    for (let i = 0; i < 10; i++) space.step(1 / 120);

    expect(b.position.x).toBeCloseTo(40, 0);
    expect(b.position.y).toBeCloseTo(0, 0);
  });
});

// ---------------------------------------------------------------------------
// 4. Off-centre anchors — full 3x3 mass matrix is invertible
// ---------------------------------------------------------------------------

describe("WeldJoint — off-centre anchors", () => {
  it("3x3 effective-mass invert handles off-centre anchors stably", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    b.shapes.add(new Polygon(Polygon.box(40, 10)));
    b.space = space;

    // Anchor on a far from b.position, anchor on b at b's centre
    const j = new WeldJoint(a, b, Vec2.weak(100, 0), Vec2.weak(0, 0), 0);
    j.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(b.position.x).toBeCloseTo(100, 0);
    expect(b.position.y).toBeCloseTo(0, 0);
    expect(Number.isFinite(b.rotation)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Two dynamic bodies welded — pair moves together
// ---------------------------------------------------------------------------

describe("WeldJoint — dynamic + dynamic", () => {
  it("two dynamic bodies welded move as a single rigid composite", () => {
    const space = new Space(new Vec2(0, 200));
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(-20, 0));
    b1.shapes.add(new Polygon(Polygon.box(20, 10)));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(20, 0));
    b2.shapes.add(new Polygon(Polygon.box(20, 10)));
    b2.space = space;

    const j = new WeldJoint(b1, b2, Vec2.weak(20, 0), Vec2.weak(-20, 0), 0);
    j.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Distance preserved
    const dx = b2.position.x - b1.position.x;
    const dy = b2.position.y - b1.position.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    expect(d).toBeCloseTo(40, 0);
    // Both bodies fell together
    expect(b1.position.y).toBeGreaterThan(50);
    expect(b2.position.y).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// 6. breakUnderForce
// ---------------------------------------------------------------------------

describe("WeldJoint — break-under-force", () => {
  it("removes itself when maxForce is exceeded and removeOnBreak set", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.maxForce = 1;
    j.breakUnderForce = true;
    j.removeOnBreak = true;
    j.space = space;

    b.velocity = new Vec2(5000, 0);
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(j.space).toBeNull();
  });

  it("breakUnderError trips for a soft weld with runaway error", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.stiff = false;
    j.frequency = 0.1;
    j.damping = 1;
    j.maxError = 1;
    j.breakUnderError = true;
    j.removeOnBreak = true;
    j.space = space;

    // Body already starts 50 away — well past maxError window
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(j.space).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Impulse accessors — 3-DOF impulse vector
// ---------------------------------------------------------------------------

describe("WeldJoint — impulse accessors", () => {
  it("impulse() returns MatMN(3,1) — three DOFs", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.space = space;

    space.step(1 / 60);
    const imp = j.impulse();
    expect(imp.zpp_inner.m).toBe(3);
    expect(imp.zpp_inner.n).toBe(1);
  });

  it("bodyImpulse on b1 and b2 are equal-and-opposite", () => {
    const space = new Space(new Vec2(0, 200));
    const a = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    a.shapes.add(new Polygon(Polygon.box(20, 10)));
    a.space = space;
    const b = new Body(BodyType.DYNAMIC, new Vec2(40, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;

    const j = new WeldJoint(a, b, Vec2.weak(20, 0), Vec2.weak(-20, 0), 0);
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    const i1 = j.bodyImpulse(a);
    const i2 = j.bodyImpulse(b);
    expect(i1.x + i2.x).toBeCloseTo(0, 4);
    expect(i1.y + i2.y).toBeCloseTo(0, 4);
  });
});

// ---------------------------------------------------------------------------
// 8. Body validation
// ---------------------------------------------------------------------------

describe("WeldJoint — body validation", () => {
  it("throws on step if body1 is null", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dyn(space, 0, 0);
    const j = new WeldJoint(null, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.space = space;
    expect(() => space.step(1 / 60)).toThrow();
  });

  it("throws on step if body1 == body2", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const j = new WeldJoint(a, a, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.space = space;
    expect(() => space.step(1 / 60)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 9. Active=false leaves bodies independent
// ---------------------------------------------------------------------------

describe("WeldJoint — active=false", () => {
  it("inactive weld does not constrain the bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 10)));
    b.space = space;
    b.velocity = new Vec2(50, 0);

    const j = new WeldJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.active = false;
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(b.position.x).toBeGreaterThan(110);
  });
});
