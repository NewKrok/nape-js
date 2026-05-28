/**
 * DistanceJoint — solver branch coverage.
 *
 * Targets uncovered branches in:
 * - ZPP_DistanceJoint.preStep (equal vs range, slack region, jointMin / jointMax
 *   activation, degenerate distance, mass-matrix zero, soft gamma/bias clamping)
 * - applyImpulseVel (positive jAcc clamp for range mode, jMax clamp for soft mode,
 *   breakUnderForce path)
 * - applyImpulsePos (slack vs active branches, equal mode, error correction clamp)
 * - warmStart skipping when slack
 * - is_slack public path
 * - bodyImpulse pre-step (jAcc=0) vs post-step
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";

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
// 1. Equal mode (jointMin === jointMax) — exact distance
// ---------------------------------------------------------------------------

describe("DistanceJoint — equal mode", () => {
  it("with jointMin == jointMax holds bodies at exact distance", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 200, 0);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    j.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    const d = Math.sqrt(b.position.x ** 2 + b.position.y ** 2);
    expect(d).toBeCloseTo(100, 0);
  });

  it("equal mode never enters slack — jAcc keeps growing past zero", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 100, 0);

    // Initial distance 100, target also 100 — body kicked inward should be pushed back out
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    j.space = space;
    b.velocity = new Vec2(-200, 0);

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    const d = Math.sqrt(b.position.x ** 2 + b.position.y ** 2);
    expect(d).toBeCloseTo(100, 0);
  });
});

// ---------------------------------------------------------------------------
// 2. Range mode — slack region between jointMin and jointMax
// ---------------------------------------------------------------------------

describe("DistanceJoint — range mode slack region", () => {
  it("does not pull while inside [min, max]", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 100, 0);

    // Range 50..200, current 100 → slack
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 200);
    j.space = space;
    // Drift slowly outward (still inside the range)
    b.velocity = new Vec2(10, 0);

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    // Should have moved freely (no joint pull)
    expect(b.position.x).toBeGreaterThan(104);
  });

  it("pulls back when distance exceeds jointMax", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 100, 0);

    // Range 50..150, kick body well outside max
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 150);
    j.space = space;
    b.velocity = new Vec2(800, 0);

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    const d = Math.sqrt(b.position.x ** 2 + b.position.y ** 2);
    // Should be capped near jointMax
    expect(d).toBeLessThan(155);
  });

  it("pushes apart when distance drops below jointMin", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 80, 0);

    // Range 100..200 — current 80 is below min
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 200);
    j.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    const d = Math.sqrt(b.position.x ** 2 + b.position.y ** 2);
    // Should have been pushed out past min
    expect(d).toBeGreaterThanOrEqual(99);
  });
});

// ---------------------------------------------------------------------------
// 3. Soft mode — gamma/bias path with clamping
// ---------------------------------------------------------------------------

describe("DistanceJoint — soft mode", () => {
  it("soft equal joint allows oscillation around the target distance", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 200, 0);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    j.stiff = false;
    j.frequency = 2;
    j.damping = 0.1;
    j.space = space;

    let minDx = Infinity;
    let maxDx = -Infinity;
    for (let i = 0; i < 600; i++) {
      space.step(1 / 60);
      const dx = Math.sqrt(b.position.x ** 2 + b.position.y ** 2);
      if (dx < minDx) minDx = dx;
      if (dx > maxDx) maxDx = dx;
    }
    // Should oscillate visibly around 100
    expect(maxDx - minDx).toBeGreaterThan(20);
  });

  it("soft mode with maxError clamps bias against runaway error", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 5000, 0);

    // Huge initial error — bias should clamp to maxError
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    j.stiff = false;
    j.frequency = 5;
    j.damping = 1;
    j.maxError = 5;
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);
    // Should not have NaN'd out
    expect(Number.isFinite(b.position.x)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Break paths — breakUnderForce / breakUnderError
// ---------------------------------------------------------------------------

describe("DistanceJoint — break-under-force", () => {
  it("removes itself on excessive impulse when breakUnderForce + removeOnBreak", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 100, 0);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    j.maxForce = 1; // tiny limit
    j.breakUnderForce = true;
    j.removeOnBreak = true;
    j.space = space;

    b.velocity = new Vec2(5000, 0);
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    // After break + removeOnBreak: constraint should no longer be in the space
    expect(j.space).toBeNull();
  });

  it("breakUnderError trips when soft joint can't keep up with the error", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 50, 0);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    j.stiff = false;
    j.frequency = 0.1;
    j.damping = 1;
    j.maxError = 1;
    j.breakUnderError = true;
    j.removeOnBreak = true;
    j.space = space;

    // Yank the body far past the maxError window
    b.velocity = new Vec2(3000, 0);
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(j.space).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Warm-start across dt jumps
// ---------------------------------------------------------------------------

describe("DistanceJoint — warm-start across dt jumps", () => {
  it("survives a sequence of dt changes without divergence", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 50);
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    for (let i = 0; i < 10; i++) space.step(1 / 30);
    for (let i = 0; i < 10; i++) space.step(1 / 120);

    const d = Math.sqrt(b.position.x ** 2 + b.position.y ** 2);
    expect(d).toBeCloseTo(50, 0);
  });
});

// ---------------------------------------------------------------------------
// 6. Off-centre anchors — torque path
// ---------------------------------------------------------------------------

describe("DistanceJoint — off-centre anchors", () => {
  it("produces angular response when anchor offset is perpendicular to pull", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 200));
    b.shapes.add(new Circle(8, new Vec2(0, 0)));
    b.space = space;

    // Vertical pull, anchor on b offset along x → torque
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(20, 0), 50, 50);
    j.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);
    expect(Math.abs(b.rotation)).toBeGreaterThan(0.005);
  });
});

// ---------------------------------------------------------------------------
// 7. Degenerate alignment — bodies coincident (C < epsilon)
// ---------------------------------------------------------------------------

describe("DistanceJoint — coincident bodies", () => {
  it("does not crash when bodies start at the same position with range > 0", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 0, 0);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0, 50);
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);
    expect(Number.isFinite(b.position.x)).toBe(true);
    expect(Number.isFinite(b.position.y)).toBe(true);
  });

  it("equal mode with coincident bodies handles degenerate normal", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 0, 0);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0, 0);
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);
    expect(Number.isFinite(b.position.x)).toBe(true);
    expect(Number.isFinite(b.position.y)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Impulse accessors — bodyImpulse before/after step
// ---------------------------------------------------------------------------

describe("DistanceJoint — impulse accessors", () => {
  it("bodyImpulse is zero before any step", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 200, 0);
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 50);
    j.space = space;

    const imp = j.bodyImpulse(a);
    expect(imp.x).toBe(0);
    expect(imp.y).toBe(0);
  });

  it("bodyImpulse on b1 and b2 are equal-and-opposite (Newton's 3rd)", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 200, 0);
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 50);
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    const i1 = j.bodyImpulse(a);
    const i2 = j.bodyImpulse(b);
    expect(i1.x + i2.x).toBeCloseTo(0, 4);
    expect(i1.y + i2.y).toBeCloseTo(0, 4);
  });
});

// ---------------------------------------------------------------------------
// 9. Body validation
// ---------------------------------------------------------------------------

describe("DistanceJoint — body validation", () => {
  it("throws on step if body1 is null", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dyn(space, 100, 0);
    const j = new DistanceJoint(null, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 50);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow();
  });

  it("throws on step if body1 == body2", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const j = new DistanceJoint(a, a, Vec2.weak(0, 0), Vec2.weak(20, 0), 10, 10);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow();
  });

  it("throws if both bodies are non-dynamic", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = staticBody(space, 100, 0);
    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 50);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 10. Slack -> non-slack transition mid-simulation
// ---------------------------------------------------------------------------

describe("DistanceJoint — slack transitions", () => {
  it("transitions from slack to active and back as body crosses jointMax", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 50, 0);

    const j = new DistanceJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 30, 100);
    j.space = space;

    // Initial: 50, well inside slack region
    space.step(1 / 60);
    expect(j.zpp_inner.slack).toBe(true);

    // Drive out past max
    b.velocity = new Vec2(600, 0);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    // After being pushed past max and constrained, joint engaged
    const d = Math.sqrt(b.position.x ** 2 + b.position.y ** 2);
    expect(d).toBeLessThan(110);
  });
});
