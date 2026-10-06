/**
 * SpringJoint — solver branch coverage.
 *
 * Targets uncovered branches in:
 * - ZPP_SpringJoint.preStep / applyImpulseVel (warm-start, mass matrix invert,
 *   degenerate alignment, body→body angular path)
 * - SpringJoint accessors (anchor1/anchor2 mutation, body re-assign)
 * - Energy decay under different damping ratios (0, 0.5, 1, oscillatory)
 * - Long-rope chains (N springs in series)
 * - World-anchor (one body null) path
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { SpringJoint } from "../../src/constraint/SpringJoint";

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
// 1. Warm-start across many steps
// ---------------------------------------------------------------------------

describe("SpringJoint — warm-start persistence", () => {
  it("hanging spring under gravity converges to a stable extension", () => {
    const space = new Space(new Vec2(0, 200));
    const anchor = staticBody(space, 0, 0);
    const bob = dyn(space, 0, 100);

    const joint = new SpringJoint(anchor, bob, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    joint.frequency = 4;
    joint.damping = 0.7;
    joint.space = space;

    for (let i = 0; i < 600; i++) space.step(1 / 60);

    // Expected length L = 50 + (m*g/k). With frequency f, k = (2*pi*f)^2 * m_eff.
    // At rest: extension stable, dx finite.
    const dy = bob.position.y;
    expect(Number.isFinite(dy)).toBe(true);
    expect(dy).toBeGreaterThan(50);
    expect(dy).toBeLessThan(200);
  });

  it("survives a sudden dt jump without divergence", () => {
    const space = new Space(new Vec2(0, 200));
    const anchor = staticBody(space, 0, 0);
    const bob = dyn(space, 0, 100);
    const j = new SpringJoint(anchor, bob, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.frequency = 5;
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    for (let i = 0; i < 10; i++) space.step(1 / 30);
    for (let i = 0; i < 10; i++) space.step(1 / 120);

    expect(Number.isFinite(bob.position.x)).toBe(true);
    expect(Number.isFinite(bob.position.y)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Damping ratio extremes
// ---------------------------------------------------------------------------

describe("SpringJoint — damping ratio", () => {
  it("damping=0 (no damping) preserves energy over time", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 200, 0);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100);
    j.frequency = 2;
    j.damping = 0;
    j.space = space;

    let maxDistance = 0;
    let minDistance = 1e9;
    for (let i = 0; i < 600; i++) {
      space.step(1 / 60);
      const d = Math.abs(b.position.x - a.position.x);
      if (d > maxDistance) maxDistance = d;
      if (d < minDistance) minDistance = d;
    }

    // With zero damping, the oscillation should not decay much
    // — keep both peaks and troughs significantly different
    expect(maxDistance - minDistance).toBeGreaterThan(50);
  });

  it("damping=2 (overdamped) converges monotonically without overshoot", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 200, 0);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100);
    j.frequency = 3;
    j.damping = 2;
    j.space = space;

    let prevDx = b.position.x;
    let overshoots = 0;
    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      const dx = b.position.x;
      // Overshoot: position passed below 100 (rest) coming from 200
      if (dx < 95) overshoots++;
      prevDx = dx;
    }
    // Overdamped: should not significantly overshoot
    expect(overshoots).toBeLessThan(5);
    expect(prevDx).toBeCloseTo(100, 0);
  });
});

// ---------------------------------------------------------------------------
// 3. Frequency boundaries
// ---------------------------------------------------------------------------

describe("SpringJoint — frequency boundaries", () => {
  it("very high frequency (50 Hz) still produces stable simulation", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 200, 0);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 100);
    j.frequency = 50;
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);
    expect(Number.isFinite(b.position.x)).toBe(true);
    expect(b.position.x).toBeCloseTo(100, 0);
  });

  it("very low frequency (0.5 Hz) is very compliant", () => {
    const space = new Space(new Vec2(0, 200));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 0, 50);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.frequency = 0.5; // very soft
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);
    // Soft spring under gravity: bob hangs much lower than rest
    expect(b.position.y).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// 4. Anchor offsets — torque path
// ---------------------------------------------------------------------------

describe("SpringJoint — off-centre anchors", () => {
  it("offset anchor with perpendicular force produces angular response", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 150));
    b.shapes.add(new Polygon(Polygon.box(40, 10)));
    b.space = space;

    // Spring is vertical (along y), anchor on b is offset along x → torque
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(20, 0), 80);
    j.frequency = 4;
    j.damping = 0.5;
    j.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Should have rotated (offset anchor with perpendicular force)
    expect(Math.abs(b.rotation)).toBeGreaterThan(0.005);
  });

  it("symmetric centre anchors do not produce rotation", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(150, 0));
    b.shapes.add(new Polygon(Polygon.box(40, 10)));
    b.space = space;

    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 80);
    j.frequency = 4;
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60);

    expect(Math.abs(b.rotation)).toBeLessThan(0.05);
  });
});

// ---------------------------------------------------------------------------
// 5. Constraint requires both bodies (validation)
// ---------------------------------------------------------------------------

describe("SpringJoint — body validation", () => {
  it("throws on step if body1 is null", () => {
    const space = new Space(new Vec2(0, 0));
    const b = dyn(space, 100, 0);
    const j = new SpringJoint(null, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow(/null bod/);
  });

  it("throws on step if body2 is null", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const j = new SpringJoint(a, null, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow(/null bod/);
  });

  it("throws on step if body1 == body2", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const j = new SpringJoint(a, a, Vec2.weak(0, 0), Vec2.weak(10, 0), 50);
    j.space = space;

    expect(() => space.step(1 / 60)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. Long chain (N springs in series)
// ---------------------------------------------------------------------------

describe("SpringJoint — chain", () => {
  it("a chain of 5 springs hangs under gravity without divergence", () => {
    const space = new Space(new Vec2(0, 200));

    const anchor = staticBody(space, 0, 0);
    const segs: Body[] = [];
    let prev = anchor;
    for (let i = 0; i < 5; i++) {
      const b = dyn(space, 0, 30 * (i + 1));
      const j = new SpringJoint(prev, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 30);
      j.frequency = 8;
      j.damping = 1;
      j.space = space;
      segs.push(b);
      prev = b;
    }

    for (let i = 0; i < 600; i++) space.step(1 / 60);

    // Last segment should be hanging below the anchor
    expect(segs[segs.length - 1].position.y).toBeGreaterThan(80);
    for (const b of segs) {
      expect(Number.isFinite(b.position.x)).toBe(true);
      expect(Number.isFinite(b.position.y)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Body re-assignment mid-simulation
// ---------------------------------------------------------------------------

describe("SpringJoint — body reassignment", () => {
  it("changing body2 mid-simulation transfers the spring force", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b1 = dyn(space, 200, 0);
    const b2 = dyn(space, 200, 100);
    const j = new SpringJoint(a, b1, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.frequency = 4;
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);
    const b1Pos = b1.position.x;

    // Reassign to b2
    j.body2 = b2;
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // b1 no longer pulled — b2 now pulled
    expect(Math.abs(b1.position.x - b1Pos)).toBeLessThan(50);
    // b2 has been pulled toward a
    const b2Dist = Math.sqrt(b2.position.x ** 2 + b2.position.y ** 2);
    expect(b2Dist).toBeLessThan(220);
  });
});

// ---------------------------------------------------------------------------
// 8. Anchor mutation invalidation
// ---------------------------------------------------------------------------

describe("SpringJoint — anchor mutation", () => {
  it("changing anchor1 component (x, y) invalidates and reapplies", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 100, 0);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.frequency = 4;
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Move world anchor on a (via wrap)
    j.anchor1.x = 30;
    j.anchor1.y = 30;
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(Number.isFinite(b.position.x)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. restLength=0 (anchors should converge)
// ---------------------------------------------------------------------------

describe("SpringJoint — restLength=0", () => {
  it("anchors converge towards the same point", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 100, 0);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 0);
    j.frequency = 8;
    j.damping = 1;
    j.space = space;

    const initial = Math.abs(b.position.x);
    for (let i = 0; i < 600; i++) space.step(1 / 60);

    // Should be much closer than the starting distance
    expect(Math.abs(b.position.x)).toBeLessThan(initial / 2);
  });
});

// ---------------------------------------------------------------------------
// 10. impulse and bodyImpulse non-zero under load
// ---------------------------------------------------------------------------

describe("SpringJoint — impulse accessors under load", () => {
  it("impulse() returns non-zero for a stretched spring", () => {
    const space = new Space(new Vec2(0, 0));
    const a = staticBody(space, 0, 0);
    const b = dyn(space, 200, 0);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.frequency = 4;
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    const imp = j.impulse();
    // MatMN(1, 1)
    expect(imp.zpp_inner.x[0]).not.toBe(0);
  });

  it("bodyImpulse on b1 and b2 are equal-and-opposite (Newton's 3rd)", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 200, 0);
    const j = new SpringJoint(a, b, Vec2.weak(0, 0), Vec2.weak(0, 0), 50);
    j.frequency = 4;
    j.damping = 1;
    j.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    const imp1 = j.bodyImpulse(a);
    const imp2 = j.bodyImpulse(b);
    expect(imp1.x + imp2.x).toBeCloseTo(0, 5);
    expect(imp1.y + imp2.y).toBeCloseTo(0, 5);
  });
});

// ---------------------------------------------------------------------------
// Degenerate geometry, force cap, removal
// ---------------------------------------------------------------------------

describe("SpringJoint — coincident anchors", () => {
  it("bodies on top of each other are pushed apart along +x, never NaN", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 0, 0);
    a.shapes.at(0).filter.collisionMask = 0; // isolate the spring from contact response
    const j = new SpringJoint(a, b, new Vec2(0, 0), new Vec2(0, 0), 30);
    j.space = space;
    space.step(1 / 60);
    expect(Number.isFinite(a.position.x) && Number.isFinite(b.position.x)).toBe(true);
    expect(b.velocity.x).toBeGreaterThan(0);
    expect(a.velocity.x).toBeLessThan(0);
    expect(b.velocity.y).toBe(0);
    for (let i = 0; i < 120; i++) space.step(1 / 60);
    expect(Math.abs(b.position.x - a.position.x)).toBeGreaterThan(10);
  });
});

describe("SpringJoint — maxForce caps the impulse without breaking", () => {
  it("a capped spring accelerates the body at most maxForce / mass", () => {
    const run = (maxForce: number) => {
      const space = new Space(new Vec2(0, 0));
      const anchor = staticBody(space, 0, 0);
      const b = dyn(space, 300, 0); // 300 px from a 40 px rest length
      const j = new SpringJoint(anchor, b, new Vec2(0, 0), new Vec2(0, 0), 40);
      j.frequency = 10;
      j.maxForce = maxForce;
      j.space = space;
      space.step(1 / 60);
      return { dv: -b.velocity.x, mass: b.mass, j };
    };
    const capped = run(500);
    const free = run(Infinity);
    expect(capped.j.active).toBe(true);
    expect(capped.dv).toBeGreaterThan(0);
    expect(capped.dv).toBeLessThanOrEqual((500 / capped.mass) * (1 / 60) * 1.0001);
    expect(free.dv).toBeGreaterThan(capped.dv * 2);
  });
});

describe("SpringJoint — leaving the space", () => {
  it("removing the spring unregisters it from both bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(space, 0, 0);
    const b = dyn(space, 50, 0);
    const j = new SpringJoint(a, b, new Vec2(0, 0), new Vec2(0, 0), 40);
    j.space = space;
    space.step(1 / 60);
    expect(a.constraints.length).toBe(1);
    expect(b.constraints.length).toBe(1);
    j.space = null;
    expect(a.constraints.length).toBe(0);
    expect(b.constraints.length).toBe(0);
  });
});
