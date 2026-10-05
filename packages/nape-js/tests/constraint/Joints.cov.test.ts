/**
 * Pivot / Weld / Distance / Pulley joints and ZPP_Constraint — behavioural
 * coverage of the less-travelled solver and bookkeeping branches:
 *  - anchors built from the public Vec2 pool
 *  - joints whose bodies have no effective mass (allowMovement/allowRotation
 *    false) — singular mass matrices
 *  - large positional errors (pre-pass with clamped impulse)
 *  - soft joints with maxForce / maxError clamps, breakUnderError/Force
 *  - range joints (distance / pulley): slack detection, unilateral clamping,
 *    shared bodies in a pulley (b1 == b3, b2 == b4, b1 == b4, b2 == b3)
 *  - activeBodies/inactiveBodies with null / identical bodies, validation errors
 *  - ignore (pair_exists) in both body orders
 *  - copy() of fully customised constraints, cbTypes while in a space,
 *    mid-step mutation guard
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import {
  Space,
  Body,
  BodyType,
  Vec2,
  Circle,
  Polygon,
  PivotJoint,
  WeldJoint,
  DistanceJoint,
  PulleyJoint,
  CbType,
  PreListener,
  PreFlag,
  InteractionType,
  Constraint,
} from "../../src/index";

type Any = any;
const DT = 1 / 60;

function dyn(x: number, y: number, r = 5): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function stat(x: number, y: number): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(1));
  return b;
}

function frozen(x: number, y: number): Body {
  const b = dyn(x, y);
  b.allowMovement = false;
  b.allowRotation = false;
  return b;
}

// ---------------------------------------------------------------------------
// anchors from the Vec2 pool
// ---------------------------------------------------------------------------

describe("joint anchors built from pooled Vec2s", () => {
  const makers: [string, () => Any, number][] = [
    ["PivotJoint", () => new PivotJoint(dyn(0, 0), dyn(10, 0), new Vec2(1, 2), new Vec2(3, 4)), 2],
    ["WeldJoint", () => new WeldJoint(dyn(0, 0), dyn(10, 0), new Vec2(1, 2), new Vec2(3, 4)), 2],
    [
      "DistanceJoint",
      () => new DistanceJoint(dyn(0, 0), dyn(10, 0), new Vec2(1, 2), new Vec2(3, 4), 1, 2),
      2,
    ],
    [
      "PulleyJoint",
      () =>
        new PulleyJoint(
          dyn(0, 0),
          dyn(10, 0),
          dyn(20, 0),
          dyn(30, 0),
          new Vec2(1, 2),
          new Vec2(3, 4),
          new Vec2(5, 6),
          new Vec2(7, 8),
          1,
          2,
        ),
      4,
    ],
  ];
  it.each(makers)("%s anchors keep their values", (_n, make, count) => {
    const j = make();
    // drop the already-created wrappers so that the getters rebuild them
    for (let i = 1; i <= count; i++) (j as Any).zpp_inner["wrap_a" + i] = null;
    for (let i = 1; i <= count; i++) {
      new Vec2(-99, -99).dispose();
      const a = j["anchor" + i];
      expect(a.x).toBe(2 * i - 1);
      expect(a.y).toBe(2 * i);
      // and remain live-bound to the joint
      j["anchor" + i] = new Vec2(10 * i, 0);
      expect(j["anchor" + i].x).toBe(10 * i);
    }
  });
});

// ---------------------------------------------------------------------------
// massless partners → singular K
// ---------------------------------------------------------------------------

describe("joints attached to bodies with no effective mass", () => {
  it.each([
    ["PivotJoint", (a: Body, b: Body) => new PivotJoint(a, b, new Vec2(), new Vec2(5, 0))],
    ["WeldJoint", (a: Body, b: Body) => new WeldJoint(a, b, new Vec2(), new Vec2(5, 0))],
  ] as [string, (a: Body, b: Body) => Constraint][])(
    "%s between a frozen dynamic body and a static body is a stable no-op",
    (_n, make) => {
      const space = new Space(new Vec2(0, 100));
      const a = frozen(0, 0);
      const s = stat(20, 0);
      a.space = space;
      s.space = space;
      const j = make(a, s);
      j.space = space;
      for (let i = 0; i < 10; i++) space.step(DT);
      expect(a.position.x).toBe(0);
      expect(a.position.y).toBe(0);
      expect(Number.isNaN(a.velocity.x)).toBe(false);
      const imp = j.bodyImpulse(a);
      expect(imp.length).toBe(0);
    },
  );

  it("PivotJoint on a rotation-only body (singular K, diagonal fallback) stops the spin", () => {
    const space = new Space(new Vec2(0, 0));
    const s = stat(0, 0);
    const a = dyn(0, 0);
    a.allowMovement = false;
    s.space = space;
    a.space = space;
    new PivotJoint(s, a, new Vec2(10, 0), new Vec2(10, 0)).space = space;
    a.angularVel = 3;
    space.step(DT);
    expect(Math.abs(a.angularVel)).toBeLessThan(1e-6);
    expect(a.position.x).toBe(0);
  });

  function spinningWeld(): Body {
    const space = new Space(new Vec2(0, 0));
    const s = stat(0, 0);
    const a = dyn(0, 0);
    a.allowMovement = false;
    s.space = space;
    a.space = space;
    new WeldJoint(s, a, new Vec2(10, 0), new Vec2(10, 0)).space = space;
    a.angularVel = 3;
    space.step(DT);
    return a;
  }

  it("WeldJoint on a rotation-only body (singular 3x3 K) stays finite and fixed in place", () => {
    const a = spinningWeld();
    expect(Number.isFinite(a.angularVel)).toBe(true);
    expect(Math.abs(a.angularVel)).toBeLessThanOrEqual(3);
    expect(a.position.x).toBe(0);
    expect(a.position.y).toBe(0);
  });

  // When neither body can translate, Keff is rank 1. Haxe nape inverted it
  // anyway (rounding leaves det tiny but non-zero for an offset anchor) or fell
  // back to a diagonal inverse that over-corrects 2x; with an offset anchor the
  // spin grew without bound. nape-js solves only the angular row there.
  it("WeldJoint on a rotation-only body stops the spin", () => {
    const a = spinningWeld();
    expect(Math.abs(a.angularVel)).toBeLessThan(1e-3);
  });

  it("WeldJoint on a rotation-only body with an offset anchor stays bounded over time", () => {
    for (const off of [0, 10, 37]) {
      const space = new Space(new Vec2(0, 0));
      const s = stat(0, 0);
      const a = dyn(0, 0);
      a.allowMovement = false;
      s.space = space;
      a.space = space;
      new WeldJoint(s, a, new Vec2(off, 0), new Vec2(off, 0)).space = space;
      a.angularVel = 3;
      for (let i = 0; i < 120; i++) space.step(DT);
      expect(Math.abs(a.angularVel)).toBeLessThan(1e-6);
      expect(Math.abs(a.rotation)).toBeLessThan(1e-3);
    }
  });

  it("PivotJoint on a rotation-only body with a large error rotates towards the target", () => {
    const space = new Space(new Vec2(0, 0));
    const s = stat(0, 0);
    const a = dyn(0, 0);
    a.allowMovement = false;
    s.space = space;
    a.space = space;
    // anchor (10,0) on a must reach world (0,10): requires a +90° rotation
    const j = new PivotJoint(s, a, new Vec2(0, 10), new Vec2(10, 0));
    j.space = space;
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(Number.isNaN(a.rotation)).toBe(false);
    const w = a.localPointToWorld(new Vec2(10, 0));
    expect(w.x).toBeCloseTo(0, 0);
    expect(w.y).toBeCloseTo(10, 0);
  });

  it("PivotJoint with a body that cannot rotate still pins translation", () => {
    const space = new Space(new Vec2(0, 100));
    const a = dyn(0, 0);
    a.allowRotation = false;
    const s = stat(0, -20);
    a.space = space;
    s.space = space;
    const j = new PivotJoint(s, a, new Vec2(0, 20), new Vec2(0, 0));
    j.space = space;
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(a.position.y).toBeCloseTo(0, 1);
    expect(a.rotation).toBe(0);
  });

  it("WeldJoint where only the second body can rotate keeps the relative angle", () => {
    const space = new Space(new Vec2(0, 100));
    const a = dyn(0, 0);
    a.allowRotation = false;
    const b = dyn(20, 0);
    a.space = space;
    b.space = space;
    const j = new WeldJoint(a, b, new Vec2(10, 0), new Vec2(-10, 0));
    j.space = space;
    b.angularVel = 5;
    for (let i = 0; i < 30; i++) space.step(DT);
    expect(b.rotation).toBeCloseTo(a.rotation, 2);
    expect(b.position.x - a.position.x).toBeCloseTo(20, 1);
  });
});

// ---------------------------------------------------------------------------
// large positional error correction
// ---------------------------------------------------------------------------

describe("large positional errors", () => {
  it.each([
    ["PivotJoint", (a: Body, b: Body) => new PivotJoint(a, b, new Vec2(), new Vec2())],
    ["WeldJoint", (a: Body, b: Body) => new WeldJoint(a, b, new Vec2(), new Vec2())],
    ["DistanceJoint", (a: Body, b: Body) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 10)],
  ] as [string, (a: Body, b: Body) => Constraint][])(
    "%s converges from a 300px error without overshoot or NaN",
    (_n, make) => {
      const space = new Space(new Vec2(0, 0));
      const a = dyn(0, 0);
      const b = dyn(300, 0);
      a.space = space;
      b.space = space;
      make(a, b).space = space;
      space.step(DT);
      // the first step already removes a large part of the error
      expect(Math.abs(b.position.x - a.position.x)).toBeLessThan(250);
      let d = 0;
      for (let i = 0; i < 120; i++) {
        space.step(DT);
        d = Math.abs(b.position.x - a.position.x);
        expect(Number.isNaN(d)).toBe(false);
      }
      expect(d).toBeLessThan(11);
      // momentum is conserved (equal masses): centre stays put
      expect((a.position.x + b.position.x) / 2).toBeCloseTo(150, 3);
    },
  );

  it("DistanceJoint compressed far below jointMin pushes the bodies apart", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(0, 0);
    const b = dyn(1, 0);
    a.space = space;
    b.space = space;
    const j = new DistanceJoint(a, b, new Vec2(), new Vec2(), 100, 200);
    j.space = space;
    for (let i = 0; i < 60; i++) space.step(DT);
    const d = b.position.x - a.position.x;
    expect(d).toBeGreaterThan(99);
    expect(d).toBeLessThan(201);
  });

  it("DistanceJoint between a massless (frozen) body and a static one ignores the error", () => {
    const space = new Space(new Vec2(0, 0));
    const a = frozen(0, 0);
    const s = stat(300, 0);
    a.space = space;
    s.space = space;
    new DistanceJoint(a, s, new Vec2(), new Vec2(), 0, 10).space = space;
    for (let i = 0; i < 5; i++) space.step(DT);
    expect(a.position.x).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// soft limits and breaking
// ---------------------------------------------------------------------------

describe("soft limits and breaking", () => {
  it.each([
    ["PivotJoint", (a: Body, b: Body) => new PivotJoint(a, b, new Vec2(), new Vec2())],
    ["WeldJoint", (a: Body, b: Body) => new WeldJoint(a, b, new Vec2(), new Vec2())],
    ["DistanceJoint", (a: Body, b: Body) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 0)],
  ] as [string, (a: Body, b: Body) => Constraint][])(
    "soft %s impulse is capped at maxForce*dt",
    (_n, make) => {
      const space = new Space(new Vec2(0, 0));
      const a = dyn(0, 0);
      const b = dyn(100, 0);
      a.space = space;
      b.space = space;
      const j = make(a, b);
      j.stiff = false;
      j.frequency = 30;
      j.maxForce = 20;
      j.space = space;
      space.step(DT);
      const imp = j.bodyImpulse(b);
      expect(Math.hypot(imp.x, imp.y)).toBeCloseTo(20 * DT, 6);
    },
  );

  it.each([
    ["PivotJoint", (a: Body, b: Body) => new PivotJoint(a, b, new Vec2(), new Vec2())],
    ["DistanceJoint", (a: Body, b: Body) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 0)],
    [
      "PulleyJoint",
      (a: Body, b: Body) =>
        new PulleyJoint(a, b, a, b, new Vec2(), new Vec2(), new Vec2(), new Vec2(), 0, 0),
    ],
  ] as [string, (a: Body, b: Body) => Constraint][])(
    "stiff %s with breakUnderForce breaks and is removed",
    (_n, make) => {
      const space = new Space(new Vec2(0, 0));
      const a = dyn(0, 0);
      const b = dyn(100, 0);
      b.velocity = new Vec2(1000, 0);
      a.space = space;
      b.space = space;
      const j = make(a, b);
      j.maxForce = 1;
      j.breakUnderForce = true;
      j.removeOnBreak = true;
      j.space = space;
      space.step(DT);
      expect(j.space).toBeNull();
      expect(a.constraints.length).toBe(0);
    },
  );

  it.each([
    ["DistanceJoint", (a: Body, b: Body) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 0)],
    [
      "PulleyJoint",
      (a: Body, b: Body) =>
        new PulleyJoint(a, b, a, b, new Vec2(), new Vec2(), new Vec2(), new Vec2(), 0, 0),
    ],
  ] as [string, (a: Body, b: Body) => Constraint][])(
    "soft %s with breakUnderError breaks before applying any impulse",
    (_n, make) => {
      const space = new Space(new Vec2(0, 0));
      const a = dyn(0, 0);
      const b = dyn(100, 0);
      a.space = space;
      b.space = space;
      const j = make(a, b);
      j.stiff = false;
      j.maxError = 5;
      j.breakUnderError = true;
      j.removeOnBreak = false;
      j.space = space;
      space.step(DT);
      expect(j.active).toBe(false);
      expect(a.velocity.x).toBe(0);
      expect(b.velocity.x).toBe(0);
    },
  );

  it.each([
    [
      "DistanceJoint",
      (a: Body, b: Body) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 50, 50),
    ],
    [
      "PulleyJoint",
      (a: Body, b: Body) =>
        new PulleyJoint(a, b, a, b, new Vec2(), new Vec2(), new Vec2(), new Vec2(), 100, 100),
    ],
  ] as [string, (a: Body, b: Body) => Constraint][])(
    "soft equal-limit %s compressed: maxError caps the corrective (positive) bias",
    (_n, make) => {
      const run = (maxError: number) => {
        const space = new Space(new Vec2(0, 0));
        const a = dyn(0, 0);
        const b = dyn(10, 0);
        a.space = space;
        b.space = space;
        const j = make(a, b);
        j.stiff = false;
        j.frequency = 10;
        j.maxError = maxError;
        j.space = space;
        space.step(DT);
        return b.velocity.x - a.velocity.x;
      };
      const capped = run(1);
      const free = run(Infinity);
      expect(capped).toBeGreaterThan(0); // pushes apart
      expect(capped).toBeLessThan(free);
    },
  );
});

// ---------------------------------------------------------------------------
// range joints: slack, unilateral clamp
// ---------------------------------------------------------------------------

describe("DistanceJoint / PulleyJoint ranges", () => {
  it("DistanceJoint.isSlack across configurations", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(0, 0);
    const b = dyn(0, 0);
    a.space = space;
    b.space = space;
    const j = new DistanceJoint(a, b, new Vec2(), new Vec2(), 10, 20);
    j.space = space;
    expect(j.isSlack()).toBe(true); // coincident anchors
    b.position = new Vec2(15, 0);
    expect(j.isSlack()).toBe(true); // inside range
    b.position = new Vec2(5, 0);
    expect(j.isSlack()).toBe(false); // below min
    b.position = new Vec2(25, 0);
    expect(j.isSlack()).toBe(false); // above max
    j.jointMin = 15;
    j.jointMax = 15;
    b.position = new Vec2(15, 0);
    // `equal` is refreshed in preStep (as in Haxe nape), so step once
    space.step(DT);
    expect(j.isSlack()).toBe(false); // equal limits are never slack
  });

  it("an over-stretched rope does not pull when the bodies are already approaching", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(0, 0);
    const b = dyn(51, 0);
    a.space = space;
    b.space = space;
    const j = new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 50);
    j.space = space;
    a.velocity = new Vec2(30, 0);
    b.velocity = new Vec2(-30, 0);
    space.step(DT, 10, 1);
    // the unilateral rope impulse is clamped to 0: it cannot push the bodies apart
    expect(j.bodyImpulse(a).length).toBe(0);
    expect(b.velocity.x - a.velocity.x).toBeLessThan(-59);
  });

  it("an over-stretched rope stops separating bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(0, 0);
    const b = dyn(50.5, 0);
    a.space = space;
    b.space = space;
    new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 50).space = space;
    a.velocity = new Vec2(-30, 0);
    b.velocity = new Vec2(30, 0);
    space.step(DT);
    expect(b.velocity.x - a.velocity.x).toBeLessThan(1e-6);
  });

  it("PulleyJoint.isSlack and range clamping", () => {
    const space = new Space(new Vec2(0, 0));
    const ceil = stat(0, 0);
    const l = dyn(-20, 30);
    const r = dyn(20, 30);
    ceil.space = space;
    l.space = space;
    r.space = space;
    const j = new PulleyJoint(
      ceil,
      l,
      ceil,
      r,
      new Vec2(-20, 0),
      new Vec2(),
      new Vec2(20, 0),
      new Vec2(),
      40,
      80,
    );
    j.space = space;
    space.step(DT);
    expect(j.isSlack()).toBe(true); // total 60 within [40, 80]
    r.position = new Vec2(20, 60);
    l.position = new Vec2(-20, 60);
    space.step(DT);
    expect(j.isSlack()).toBe(false); // 120 > 80
    for (let i = 0; i < 30; i++) space.step(DT);
    const len = l.position.y + r.position.y;
    expect(len).toBeLessThan(81);
  });

  it("PulleyJoint below jointMin pushes the rope back out", () => {
    const space = new Space(new Vec2(0, 0));
    const ceil = stat(0, 0);
    const l = dyn(-20, 10);
    const r = dyn(20, 10);
    ceil.space = space;
    l.space = space;
    r.space = space;
    const j = new PulleyJoint(
      ceil,
      l,
      ceil,
      r,
      new Vec2(-20, 0),
      new Vec2(),
      new Vec2(20, 0),
      new Vec2(),
      60,
      100,
    );
    j.space = space;
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(l.position.y + r.position.y).toBeGreaterThan(59);
  });

  it("classic pulley (b1 == b3): pulling one side down lifts the other", () => {
    const space = new Space(new Vec2(0, 0));
    const ceil = stat(0, 0);
    const l = dyn(-20, 50);
    const r = dyn(20, 50);
    ceil.space = space;
    l.space = space;
    r.space = space;
    const j = new PulleyJoint(
      ceil,
      l,
      ceil,
      r,
      new Vec2(-20, 0),
      new Vec2(),
      new Vec2(20, 0),
      new Vec2(),
      100,
      100,
    );
    j.space = space;
    l.velocity = new Vec2(0, 20);
    for (let i = 0; i < 30; i++) space.step(DT);
    expect(l.position.y).toBeGreaterThan(50);
    expect(r.position.y).toBeLessThan(50);
    expect(l.position.y + r.position.y).toBeCloseTo(100, 1);
    const ic = j.bodyImpulse(ceil);
    const il = j.bodyImpulse(l);
    const ir = j.bodyImpulse(r);
    // impulses on the shared ceiling balance those on the hanging bodies
    expect(ic.y + il.y + ir.y).toBeCloseTo(0, 8);
  });

  it.each([
    ["b2 == b4", (a: Body, b: Body, c: Body) => [a, c, b, c]],
    ["b1 == b4", (a: Body, b: Body, c: Body) => [c, a, b, c]],
    ["b2 == b3", (a: Body, b: Body, c: Body) => [a, c, c, b]],
  ] as [string, (a: Body, b: Body, c: Body) => Body[]][])(
    "pulley with shared body (%s) keeps the combined length",
    (_n, pick) => {
      const space = new Space(new Vec2(0, 0));
      const a = stat(-40, 0);
      const b = stat(40, 0);
      const c = dyn(0, 30);
      a.space = space;
      b.space = space;
      c.space = space;
      const [b1, b2, b3, b4] = pick(a, b, c);
      const len = () => {
        const p = (x: Body) => x.position;
        const d12 = Vec2.distance(p(b1), p(b2));
        const d34 = Vec2.distance(p(b3), p(b4));
        return d12 + d34;
      };
      const L = len();
      const j = new PulleyJoint(
        b1,
        b2,
        b3,
        b4,
        new Vec2(),
        new Vec2(),
        new Vec2(),
        new Vec2(),
        L,
        L,
      );
      j.space = space;
      c.velocity = new Vec2(0, 40);
      for (let i = 0; i < 30; i++) space.step(DT);
      expect(len()).toBeCloseTo(L, 0);
    },
  );

  function hangingPulley(min: number, max: number, ly: number, ry: number) {
    const space = new Space(new Vec2(0, 0));
    const ceil = stat(0, 0);
    const l = dyn(-20, ly);
    const r = dyn(20, ry);
    ceil.space = space;
    l.space = space;
    r.space = space;
    const j = new PulleyJoint(
      ceil,
      l,
      ceil,
      r,
      new Vec2(-20, 0),
      new Vec2(),
      new Vec2(20, 0),
      new Vec2(),
      min,
      max,
    );
    j.space = space;
    return { space, l, r, j };
  }

  it("an over-long pulley rope does not pull when the loads are already rising", () => {
    const { space, l, r, j } = hangingPulley(0, 100, 51, 51);
    l.velocity = new Vec2(0, -30);
    r.velocity = new Vec2(0, -30);
    space.step(DT, 10, 1);
    expect(j.bodyImpulse(l).length).toBe(0);
    expect(l.velocity.y).toBeLessThan(-29);
  });

  it("soft pulley impulse is capped at maxForce*dt", () => {
    const { space, r, j } = hangingPulley(100, 100, 200, 200);
    j.stiff = false;
    j.frequency = 30;
    j.maxForce = 10;
    space.step(DT);
    const imp = j.bodyImpulse(r);
    expect(Math.hypot(imp.x, imp.y)).toBeCloseTo(10 * DT, 6);
  });

  it.each([
    ["stretched", 100, 400, 400],
    ["compressed", 400, 20, 20],
  ] as [string, number, number, number][])(
    "pulley with a large %s error converges without NaN",
    (_l, len, ly, ry) => {
      const { space, l, r } = hangingPulley(len, len, ly, ry);
      for (let i = 0; i < 120; i++) space.step(DT);
      expect(Number.isNaN(l.position.y)).toBe(false);
      expect(l.position.y + r.position.y).toBeCloseTo(len, 0);
    },
  );

  it("pulley with a collapsed segment keeps a finite normal", () => {
    const space = new Space(new Vec2(0, 0));
    const ceil = stat(0, 0);
    const l = dyn(0, 30);
    const r = dyn(20, 0); // anchor coincides with ceiling anchor3
    ceil.space = space;
    l.space = space;
    r.space = space;
    const j = new PulleyJoint(
      ceil,
      l,
      ceil,
      r,
      new Vec2(),
      new Vec2(),
      new Vec2(20, 0),
      new Vec2(),
      10,
      10,
    );
    j.space = space;
    space.step(DT);
    expect(Number.isNaN(l.position.y)).toBe(false);
    expect(Number.isNaN(r.position.y)).toBe(false);
    expect(l.position.y).toBeLessThan(30);
  });

  it("pulley validation errors", () => {
    const space = new Space();
    const a = dyn(0, 0);
    const b = dyn(10, 0);
    const s1 = stat(0, 10);
    const s2 = stat(10, 10);
    for (const x of [a, b, s1, s2]) x.space = space;
    const mk = (b1: Body, b2: Body, b3: Body, b4: Body, min = 0, max = 10) => {
      const j = new PulleyJoint(
        b1,
        b2,
        b3,
        b4,
        new Vec2(),
        new Vec2(),
        new Vec2(),
        new Vec2(),
        min,
        max,
      );
      j.space = space;
      try {
        space.step(DT);
        return "";
      } catch (e: Any) {
        return e.message as string;
      } finally {
        j.space = null;
      }
    };
    expect(mk(a, b, a, b, 20, 10)).toContain("PulleyJoint must have jointMin <= jointMax");
    expect(mk(s1, s2, a, b)).toContain("cannot have both bodies in a linked pair non-dynamic");
    expect(mk(a, b, s1, s2)).toContain("cannot have both bodies in a linked pair non-dynamic");
  });
});

// ---------------------------------------------------------------------------
// body bookkeeping / validation
// ---------------------------------------------------------------------------

describe("constraint body bookkeeping and validation", () => {
  const twoBody: [string, (a: Body | null, b: Body | null) => Constraint][] = [
    ["PivotJoint", (a, b) => new PivotJoint(a, b, new Vec2(), new Vec2())],
    ["WeldJoint", (a, b) => new WeldJoint(a, b, new Vec2(), new Vec2())],
    ["DistanceJoint", (a, b) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 1)],
  ];

  it.each(twoBody)("%s with the same body twice registers once and fails validation", (n, make) => {
    const space = new Space();
    const a = dyn(0, 0);
    a.space = space;
    const j = make(a, a);
    j.space = space;
    expect(a.constraints.length).toBe(1);
    expect(() => space.step(DT)).toThrow(/body1 ?== ?body2/);
    j.space = null;
    expect(a.constraints.length).toBe(0);
    void n;
  });

  it.each(twoBody)("%s with a null body", (_n, make) => {
    const space = new Space();
    const a = dyn(0, 0);
    a.space = space;
    const j1 = make(null, a);
    j1.space = space;
    expect(a.constraints.length).toBe(1);
    expect(() => space.step(DT)).toThrow(/null bodies/);
    j1.space = null;
    expect(a.constraints.length).toBe(0);
    const j2 = make(a, null);
    j2.space = space;
    expect(a.constraints.length).toBe(1);
    j2.space = null;
    expect(a.constraints.length).toBe(0);
  });

  it.each(twoBody)("%s with two static bodies fails validation", (_n, make) => {
    const space = new Space();
    const a = stat(0, 0);
    const b = stat(10, 0);
    a.space = space;
    b.space = space;
    make(a, b).space = space;
    expect(() => space.step(DT)).toThrow(/both bodies non-dynamic/);
  });

  it("DistanceJoint with jointMin > jointMax fails validation", () => {
    const space = new Space();
    const a = dyn(0, 0);
    const b = dyn(10, 0);
    a.space = space;
    b.space = space;
    const j = new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 5);
    j.space = space;
    j.jointMin = 10;
    expect(() => space.step(DT)).toThrow("DistanceJoint must have jointMin <= jointMax");
  });

  it("PulleyJoint bookkeeping with null and repeated bodies", () => {
    const space = new Space();
    const a = dyn(0, 0);
    const b = dyn(10, 0);
    a.space = space;
    b.space = space;
    const j = new PulleyJoint(a, a, null, b, new Vec2(), new Vec2(), new Vec2(), new Vec2(), 0, 1);
    j.space = space;
    expect(a.constraints.length).toBe(1);
    expect(b.constraints.length).toBe(1);
    expect(() => j.isSlack()).toThrow(
      "Cannot compute slack for PulleyJoint if either body is null",
    );
    j.space = null;
    expect(a.constraints.length).toBe(0);
    expect(b.constraints.length).toBe(0);
    const k = new PulleyJoint(
      null,
      a,
      b,
      null,
      new Vec2(),
      new Vec2(),
      new Vec2(),
      new Vec2(),
      0,
      1,
    );
    k.space = space;
    expect(a.constraints.length).toBe(1);
    expect(b.constraints.length).toBe(1);
    k.space = null;
    expect(b.constraints.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ignore → pair_exists
// ---------------------------------------------------------------------------

describe("ignore suppresses collisions between jointed bodies (both orders)", () => {
  const makers: [string, (a: Body, b: Body) => Constraint][] = [
    ["PivotJoint", (a, b) => new PivotJoint(a, b, new Vec2(), new Vec2(0, -15))],
    ["WeldJoint", (a, b) => new WeldJoint(a, b, new Vec2(), new Vec2(0, -15))],
    ["DistanceJoint", (a, b) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 15, 15)],
    [
      "PulleyJoint",
      (a, b) => new PulleyJoint(a, b, a, b, new Vec2(), new Vec2(), new Vec2(), new Vec2(), 30, 30),
    ],
  ];
  it.each(makers)("%s", (_n, make) => {
    for (const swap of [false, true]) {
      for (const ignore of [false, true]) {
        const space = new Space(new Vec2(0, 0));
        const a = dyn(0, 0, 10);
        const b = dyn(0, 15, 10);
        a.space = space;
        b.space = space;
        const j = swap ? make(b, a) : make(a, b);
        j.ignore = ignore;
        j.space = space;
        space.step(DT);
        expect((space.arbiters as Any).length).toBe(ignore ? 0 : 1);
      }
    }
  });

  it("pulley ignore covers every linked pair (b1-b4, b3-b2, b4-b1)", () => {
    const space = new Space(new Vec2(0, 0));
    const p = dyn(0, 0, 10);
    const q = dyn(15, 0, 10);
    const r = dyn(100, 0, 10);
    const s = dyn(115, 0, 10);
    for (const x of [p, q, r, s]) x.space = space;
    // p overlaps q: pair (b1=p, b4=q) in one pulley and (b4=p, b1=q) in the other
    const j = new PulleyJoint(p, r, s, q, new Vec2(), new Vec2(), new Vec2(), new Vec2(), 0, 1000);
    j.ignore = true;
    j.space = space;
    space.step(DT);
    expect((space.arbiters as Any).length).toBe(0);
    j.space = null;
    const k = new PulleyJoint(q, r, s, p, new Vec2(), new Vec2(), new Vec2(), new Vec2(), 0, 1000);
    k.ignore = true;
    k.space = space;
    for (let i = 0; i < 10; i++) space.step(DT);
    expect((space.arbiters as Any).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// bodyImpulse bookkeeping
// ---------------------------------------------------------------------------

describe("bodyImpulse", () => {
  it("is zero before the first step and opposite for the two bodies after", () => {
    const space = new Space(new Vec2(0, 100));
    const s = stat(0, 0);
    const b = dyn(0, 20);
    s.space = space;
    b.space = space;
    const joints: Constraint[] = [
      new WeldJoint(s, b, new Vec2(0, 20), new Vec2()),
      new PivotJoint(s, b, new Vec2(0, 20), new Vec2()),
    ];
    for (const j of joints) {
      expect(j.bodyImpulse(b).length).toBe(0);
    }
    joints[1].space = space;
    space.step(DT);
    const ib = joints[1].bodyImpulse(b);
    const is = joints[1].bodyImpulse(s);
    expect(ib.y).toBeLessThan(0);
    expect(ib.x + is.x).toBeCloseTo(0, 10);
    expect(ib.y + is.y).toBeCloseTo(0, 10);
    joints[1].space = null;
    joints[0].space = space;
    space.step(DT);
    const wb = joints[0].bodyImpulse(b);
    const ws = joints[0].bodyImpulse(s);
    expect(wb.y).toBeLessThan(0);
    expect(wb.y + ws.y).toBeCloseTo(0, 10);
  });
});

// ---------------------------------------------------------------------------
// ZPP_Constraint: copy, cbTypes, mid-step guard
// ---------------------------------------------------------------------------

describe("ZPP_Constraint.copyto / cbTypes / mid-step guard", () => {
  it("copy() carries every non-default setting and cbType", () => {
    const a = dyn(0, 0);
    const b = dyn(10, 0);
    const j = new PivotJoint(a, b, new Vec2(1, 0), new Vec2(-1, 0));
    const t1 = new CbType();
    const t2 = new CbType();
    (j.cbTypes as Any).add(t2);
    (j.cbTypes as Any).add(t1);
    j.removeOnBreak = false;
    j.breakUnderError = true;
    j.breakUnderForce = true;
    j.maxError = 3;
    j.maxForce = 4;
    j.stiff = false;
    j.damping = 0.25;
    j.frequency = 7;
    j.ignore = true;
    j.active = false;
    const c = j.copy() as Any;
    expect(c).not.toBe(j);
    expect(c.removeOnBreak).toBe(false);
    expect(c.breakUnderError).toBe(true);
    expect(c.breakUnderForce).toBe(true);
    expect(c.maxError).toBe(3);
    expect(c.maxForce).toBe(4);
    expect(c.stiff).toBe(false);
    expect(c.damping).toBe(0.25);
    expect(c.frequency).toBe(7);
    expect(c.ignore).toBe(true);
    expect(c.active).toBe(false);
    expect(c.cbTypes.has(t1)).toBe(true);
    expect(c.cbTypes.has(t2)).toBe(true);
    expect(c.anchor1.x).toBe(1);
    expect(c.anchor2.x).toBe(-1);
  });

  it("copy of an inactive joint added to a space does not act", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(0, 0);
    const b = dyn(100, 0);
    a.space = space;
    b.space = space;
    const j = new PivotJoint(a, b, new Vec2(), new Vec2());
    j.active = false;
    const c = j.copy() as PivotJoint;
    // a standalone copy has no bodies (they are resolved only in Space.copy)
    expect(c.body1).toBeNull();
    c.body1 = a;
    c.body2 = b;
    c.space = space;
    space.step(DT);
    expect(a.position.x).toBe(0);
    expect(b.position.x).toBe(100);
    c.active = true;
    space.step(DT);
    // stiff pivot: positional correction drags the bodies together
    expect(a.position.x).toBeGreaterThan(10);
    expect(b.position.x).toBeLessThan(90);
  });

  it("cbTypes added/removed while in a space reach constraint listeners", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(0, 0);
    const b = dyn(100, 0);
    a.space = space;
    b.space = space;
    const j = new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 10);
    j.space = space;
    const t = new CbType();
    const t2 = new CbType();
    (j.cbTypes as Any).add(t);
    (j.cbTypes as Any).add(t2);
    // same type again is a no-op
    (j.cbTypes as Any).add(t);
    expect((j.cbTypes as Any).length).toBe(3); // + ANY_CONSTRAINT
    expect((t as Any).constraints.length).toBe(1);
    (j.cbTypes as Any).remove(t);
    expect((j.cbTypes as Any).has(t)).toBe(false);
    expect((t as Any).constraints.length).toBe(0);
    expect((t2 as Any).constraints.length).toBe(1);
    // removing a type that is not present is harmless
    (j.cbTypes as Any).remove(new CbType());
    expect((j.cbTypes as Any).length).toBe(2);
    j.space = null;
    expect((t2 as Any).constraints.length).toBe(0);
  });

  it("two constraints sharing a cbType set share and release the cbSet", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dyn(0, 0);
    const b = dyn(100, 0);
    a.space = space;
    b.space = space;
    const t = new CbType();
    const j1 = new PivotJoint(a, b, new Vec2(), new Vec2());
    const j2 = new PivotJoint(a, b, new Vec2(), new Vec2());
    (j1.cbTypes as Any).add(t);
    (j2.cbTypes as Any).add(t);
    j1.space = space;
    j2.space = space;
    const set1 = (j1 as Any).zpp_inner.cbSet;
    expect(set1).not.toBeNull();
    expect((j2 as Any).zpp_inner.cbSet).toBe(set1);
    expect(set1.count).toBe(2);
    j1.space = null;
    expect(set1.count).toBe(1);
    j2.space = null;
    expect((j2 as Any).zpp_inner.cbSet).toBeNull();
  });

  it("changing a joint body from a pre-handler (mid-step) throws", () => {
    const space = new Space(new Vec2(0, 100));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 20));
    floor.shapes.add(new Polygon(Polygon.box(200, 10)));
    floor.space = space;
    const a = dyn(0, 10);
    const b = dyn(30, 10);
    a.space = space;
    b.space = space;
    const j = new PivotJoint(a, b, new Vec2(), new Vec2(-30, 0));
    j.space = space;
    let msg = "";
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, CbType.ANY_BODY, CbType.ANY_BODY, () => {
        try {
          j.body2 = a;
        } catch (e: Any) {
          msg = e.message;
        }
        return PreFlag.ACCEPT;
      }),
    );
    space.step(DT);
    expect(msg).toMatch(/cannot be set during space step\(\)/);
    expect(j.body2).toBe(b);
  });
});
