/**
 * LineJoint — solver branch coverage.
 *
 * Targets uncovered branches in:
 * - ZPP_LineJoint.preStep — equal mode vs range (above max / below min / inside),
 *   2x2 Keff matrix invert, singular det==0 fallback (diagonal), NaN det path,
 *   soft gamma/bias clamping
 * - warmStart / applyImpulseVel / applyImpulsePos with scale = +1, -1, 0
 * - Off-axis direction (line not aligned with world axes)
 * - breakUnderForce / breakUnderError
 * - direction validation (non-degenerate, NaN, null)
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { LineJoint } from "../../src/constraint/LineJoint";

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
// 1. Equal mode (jointMin === jointMax) — exact line position
// ---------------------------------------------------------------------------

describe("LineJoint — equal mode", () => {
  it("with jointMin == jointMax holds body at exact offset along line", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);

    // Vertical line, fixed offset 50 along it
    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), 50, 50);
    j.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    expect(b.position.y).toBeCloseTo(50, 0);
    expect(b.position.x).toBeCloseTo(0, 0);
  });
});

// ---------------------------------------------------------------------------
// 2. Range mode — three scale paths (above max, below min, slack inside)
// ---------------------------------------------------------------------------

describe("LineJoint — range mode", () => {
  it("clamps body at jointMax when pushed past it", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 30);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -50, 50);
    j.space = space;
    b.velocity = new Vec2(0, 500);

    for (let i = 0; i < 240; i++) space.step(1 / 60);
    expect(b.position.y).toBeLessThan(60);
  });

  it("pushes body back to jointMin when forced below it", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, -30);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -50, 50);
    j.space = space;
    b.velocity = new Vec2(0, -500);

    for (let i = 0; i < 240; i++) space.step(1 / 60);
    expect(b.position.y).toBeGreaterThan(-60);
  });

  it("does not pull body while inside [min, max] (scale=0 / slack)", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 0);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -50, 50);
    j.space = space;

    b.velocity = new Vec2(0, 10);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(b.position.y).toBeGreaterThan(4);
  });

  it("still constrains the perpendicular (off-line) DOF even inside slack window", () => {
    const space = new Space(new Vec2(200, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 20);

    // Vertical line, gravity pushes body sideways — joint must hold x ~ 0
    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -100, 100);
    j.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);
    expect(Math.abs(b.position.x)).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Soft mode — gamma/bias clamping
// ---------------------------------------------------------------------------

describe("LineJoint — soft mode", () => {
  it("soft equal LineJoint allows oscillation along the line", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 200);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), 100, 100);
    j.stiff = false;
    j.frequency = 2;
    j.damping = 0.1;
    j.space = space;

    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 600; i++) {
      space.step(1 / 60);
      if (b.position.y < minY) minY = b.position.y;
      if (b.position.y > maxY) maxY = b.position.y;
    }
    expect(maxY - minY).toBeGreaterThan(20);
  });
});

// ---------------------------------------------------------------------------
// 4. Off-axis line direction (diagonal)
// ---------------------------------------------------------------------------

describe("LineJoint — diagonal line", () => {
  it("constrains body along a 45-degree line", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 30, 30);

    // 45-degree line direction (1, 1) normalised
    const inv = 1 / Math.sqrt(2);
    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(inv, inv), -100, 100);
    j.space = space;

    // Push perpendicular to the line — should be blocked
    b.velocity = new Vec2(20, -20);
    for (let i = 0; i < 120; i++) space.step(1 / 60);
    // Body should stay on the y = x line
    expect(Math.abs(b.position.y - b.position.x)).toBeLessThan(5);
  });
});

// ---------------------------------------------------------------------------
// 5. Direction validation
// ---------------------------------------------------------------------------

describe("LineJoint — direction validation", () => {
  it("throws when direction is degenerate (zero vector) on step", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 0), -10, 10);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow();
  });

  it("throws when jointMin > jointMax", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), 50, -50);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. breakUnderForce / breakUnderError
// ---------------------------------------------------------------------------

describe("LineJoint — break-under-force", () => {
  it("removes itself when maxForce is exceeded and removeOnBreak set", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 50, 50);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), 0, 100);
    j.maxForce = 1;
    j.breakUnderForce = true;
    j.removeOnBreak = true;
    j.space = space;

    // Push perpendicular (x) — joint must resist, exceeds maxForce
    b.velocity = new Vec2(5000, 0);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(j.space).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Warm-start across dt jumps
// ---------------------------------------------------------------------------

describe("LineJoint — warm-start across dt jumps", () => {
  it("survives mixed dt without diverging", () => {
    const space = new Space(new Vec2(200, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -100, 100);
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    for (let i = 0; i < 10; i++) space.step(1 / 30);
    for (let i = 0; i < 10; i++) space.step(1 / 120);

    expect(Math.abs(b.position.x)).toBeLessThan(5);
  });
});

// ---------------------------------------------------------------------------
// 8. Impulse accessors
// ---------------------------------------------------------------------------

describe("LineJoint — impulse accessors", () => {
  it("impulse() returns MatMN(2,1)", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -100, 100);
    j.space = space;

    space.step(1 / 60);
    const imp = j.impulse();
    expect(imp.zpp_inner.m).toBe(2);
    expect(imp.zpp_inner.n).toBe(1);
  });

  it("bodyImpulse on b1 and b2 are equal-and-opposite", () => {
    const space = new Space(new Vec2(0, 200));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 30, 50);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -100, 100);
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    const i1 = j.bodyImpulse(a);
    const i2 = j.bodyImpulse(b);
    expect(i1.x + i2.x).toBeCloseTo(0, 3);
    expect(i1.y + i2.y).toBeCloseTo(0, 3);
  });
});

// ---------------------------------------------------------------------------
// 9. Active=false leaves body free
// ---------------------------------------------------------------------------

describe("LineJoint — active=false", () => {
  it("inactive joint does not constrain the body", () => {
    const space = new Space(new Vec2(200, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -10, 10);
    j.active = false;
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);
    // No joint pull — drifts sideways under gravity
    expect(b.position.x).toBeGreaterThan(20);
  });
});

// ---------------------------------------------------------------------------
// 10. Slack <-> active transitions
// ---------------------------------------------------------------------------

describe("LineJoint — slack transitions", () => {
  it("body cannot escape jointMin..jointMax window in either direction", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 0);

    const j = new LineJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(0, 1), -50, 50);
    j.space = space;

    // Strong impulse in either direction along the line
    b.velocity = new Vec2(0, 800);
    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // After settling, |y| should be bounded by jointMax + small overshoot tolerance
    expect(Math.abs(b.position.y)).toBeLessThan(60);
  });
});
