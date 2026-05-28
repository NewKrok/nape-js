/**
 * PulleyJoint — solver branch coverage.
 *
 * Targets uncovered branches in:
 * - ZPP_PulleyJoint.preStep — equal vs range, slack region between jointMin/Max,
 *   ratio != 1, degenerate distance handling (one side coincident)
 * - warmStart slack skip
 * - applyImpulseVel — positive-jAcc clamp (range mode), jMax soft clamp,
 *   breakUnderForce path
 * - applyImpulsePos — full pos-correction with all four anchors, equal vs range
 * - is_slack public path
 * - bodyImpulse / impulse() accessors
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";

function dyn(space: Space, x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  b.space = space;
  return b;
}

function staticBody(space: Space, x = 0, y = 0): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(5));
  b.space = space;
  return b;
}

// ---------------------------------------------------------------------------
// 1. Equal mode (jointMin == jointMax)
// ---------------------------------------------------------------------------

describe("PulleyJoint — equal mode", () => {
  it("with jointMin == jointMax holds total rope length exactly", () => {
    const space = new Space(new Vec2(0, 200));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    const d12 = Math.sqrt((b2.position.x - 0) ** 2 + (b2.position.y - 0) ** 2);
    const d34 = Math.sqrt((b4.position.x - 100) ** 2 + (b4.position.y - 0) ** 2);
    const total = d12 + d34;
    expect(total).toBeCloseTo(100, 0);
  });
});

// ---------------------------------------------------------------------------
// 2. Range mode — slack region in between
// ---------------------------------------------------------------------------

describe("PulleyJoint — range mode", () => {
  it("does not pull while total rope length is inside [min, max]", () => {
    const space = new Space(new Vec2(0, 0));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      50,
      300,
    );
    j.space = space;
    // Each side currently 50, total = 100, well inside [50,300]
    // Slight drift: should be unimpeded by the rope
    b2.velocity = new Vec2(0, 5);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(b2.position.y).toBeGreaterThan(52);
  });

  it("clamps total rope length at jointMax under heavy load", () => {
    const space = new Space(new Vec2(0, 600));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 200, 0);
    const b4 = dyn(space, 200, 50);

    // Total = 100 initially. Cap at 150.
    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      150,
    );
    j.space = space;

    for (let i = 0; i < 600; i++) space.step(1 / 60);

    const d12 = Math.sqrt(b2.position.x ** 2 + b2.position.y ** 2);
    const d34 = Math.sqrt((b4.position.x - 200) ** 2 + b4.position.y ** 2);
    const total = d12 + d34;
    // Soft overshoot tolerance — physics doesn't pin exactly
    expect(total).toBeLessThan(165);
  });
});

// ---------------------------------------------------------------------------
// 3. Ratio != 1 — mechanical advantage
// ---------------------------------------------------------------------------

describe("PulleyJoint — ratio", () => {
  it("ratio=2 makes side-3-4 contribute twice to total length", () => {
    const space = new Space(new Vec2(0, 300));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 200, 0);
    const b4 = dyn(space, 200, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      150,
      150,
    );
    j.ratio = 2;
    j.space = space;

    for (let i = 0; i < 600; i++) space.step(1 / 60);

    const d12 = Math.sqrt(b2.position.x ** 2 + b2.position.y ** 2);
    const d34 = Math.sqrt((b4.position.x - 200) ** 2 + b4.position.y ** 2);
    // d12 + 2 * d34 ~ 150 (equal-mode constraint)
    expect(d12 + 2 * d34).toBeCloseTo(150, 0);
  });
});

// ---------------------------------------------------------------------------
// 4. is_slack public path
// ---------------------------------------------------------------------------

describe("PulleyJoint — is_slack", () => {
  it("ZPP is_slack returns true inside the slack region", () => {
    const space = new Space(new Vec2(0, 0));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      50,
      300,
    );
    j.space = space;

    // Force preStep so internal anchor projections are populated
    space.step(1 / 60);
    expect(j.zpp_inner.is_slack()).toBe(true);
  });

  it("ZPP is_slack returns false in equal mode (always active)", () => {
    const space = new Space(new Vec2(0, 0));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.space = space;

    space.step(1 / 60);
    expect(j.zpp_inner.is_slack()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Soft mode
// ---------------------------------------------------------------------------

describe("PulleyJoint — soft mode", () => {
  it("soft equal-mode pulley allows visible oscillation around target length", () => {
    const space = new Space(new Vec2(0, 200));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 200, 0);
    const b4 = dyn(space, 200, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.stiff = false;
    j.frequency = 1;
    j.damping = 0.05;
    j.maxError = 50;
    j.space = space;

    let minTotal = Infinity;
    let maxTotal = -Infinity;
    for (let i = 0; i < 600; i++) {
      space.step(1 / 60);
      const d12 = Math.sqrt(b2.position.x ** 2 + b2.position.y ** 2);
      const d34 = Math.sqrt((b4.position.x - 200) ** 2 + b4.position.y ** 2);
      const t = d12 + d34;
      if (t < minTotal) minTotal = t;
      if (t > maxTotal) maxTotal = t;
    }
    expect(maxTotal - minTotal).toBeGreaterThan(2);
  });
});

// ---------------------------------------------------------------------------
// 6. breakUnderForce
// ---------------------------------------------------------------------------

describe("PulleyJoint — break-under-force", () => {
  it("removes itself when maxForce is exceeded and removeOnBreak set", () => {
    const space = new Space(new Vec2(0, 0));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.maxForce = 1;
    j.breakUnderForce = true;
    j.removeOnBreak = true;
    j.space = space;

    b2.velocity = new Vec2(0, 5000);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(j.space).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. Warm-start across dt jumps
// ---------------------------------------------------------------------------

describe("PulleyJoint — warm-start across dt jumps", () => {
  it("survives mixed dt without diverging", () => {
    const space = new Space(new Vec2(0, 200));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    for (let i = 0; i < 10; i++) space.step(1 / 30);
    for (let i = 0; i < 10; i++) space.step(1 / 120);

    expect(Number.isFinite(b2.position.x)).toBe(true);
    expect(Number.isFinite(b4.position.x)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Impulse accessors
// ---------------------------------------------------------------------------

describe("PulleyJoint — impulse accessors", () => {
  it("impulse() returns MatMN(1,1)", () => {
    const space = new Space(new Vec2(0, 200));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.space = space;

    space.step(1 / 60);
    const imp = j.impulse();
    expect(imp.zpp_inner.m).toBe(1);
    expect(imp.zpp_inner.n).toBe(1);
  });

  it("bodyImpulse on b2 and b4 are non-zero while constraint is loaded", () => {
    const space = new Space(new Vec2(0, 300));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 100, 0);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    const i2 = j.bodyImpulse(b2);
    const i4 = j.bodyImpulse(b4);
    expect(Math.abs(i2.x) + Math.abs(i2.y)).toBeGreaterThan(0);
    expect(Math.abs(i4.x) + Math.abs(i4.y)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Body validation
// ---------------------------------------------------------------------------

describe("PulleyJoint — body validation", () => {
  it("throws on step if jointMin > jointMax", () => {
    const space = new Space(new Vec2(0, 0));
    const b2 = dyn(space, 0, 50);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      200,
      50,
    );
    j.space = space;
    expect(() => space.step(1 / 60)).toThrow();
  });

  it("throws when jointMin is set to a negative value", () => {
    const space = new Space(new Vec2(0, 0));
    const b2 = dyn(space, 0, 50);
    const b4 = dyn(space, 100, 50);

    const j = new PulleyJoint(
      null,
      b2,
      null,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      0,
      100,
    );
    expect(() => (j.jointMin = -1)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 10. Pulley balance — equal weights yield static equilibrium
// ---------------------------------------------------------------------------

describe("PulleyJoint — equilibrium", () => {
  it("symmetric pulley with two equal bodies reaches static equilibrium", () => {
    const space = new Space(new Vec2(0, 200));
    const a1 = staticBody(space, 0, 0);
    const b2 = dyn(space, 0, 50);
    const a3 = staticBody(space, 200, 0);
    const b4 = dyn(space, 200, 50);

    const j = new PulleyJoint(
      a1,
      b2,
      a3,
      b4,
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      Vec2.weak(0, 0),
      100,
      100,
    );
    j.space = space;

    for (let i = 0; i < 1200; i++) space.step(1 / 60);

    // Equal hanging — both sides ~50, swap a tiny tolerance
    expect(Math.abs(b2.position.y - b4.position.y)).toBeLessThan(5);
  });
});
