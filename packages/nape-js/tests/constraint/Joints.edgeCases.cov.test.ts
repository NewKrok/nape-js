/**
 * Joint solver and bookkeeping paths the per-joint suites do not reach:
 *
 * - Compound.copy() resolving joints whose bodies live in a nested compound
 *   (the deferred ZPP_CopyHelper "todo" path), for every joint type
 * - copying an inactive joint keeps it inactive
 * - `ignore = true` filtering with the pair reported in either body order
 * - bodyImpulse() before the joint has ever been stepped
 * - singular effective-mass matrices (WeldJoint between two non-rotating bodies)
 * - force / error clamps (SpringJoint, LineJoint) and the position solver's
 *   "too short" / equal-limits branches (DistanceJoint, PulleyJoint)
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Constraint } from "../../src/constraint/Constraint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";

const DT = 1 / 60;

function body(x: number, y = 0, r = 10, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function run(space: Space, steps: number) {
  for (let i = 0; i < steps; i++) space.step(DT);
}

const o = () => new Vec2(0, 0);

/** Builders for every two-body joint type, linking (p, q). */
const TWO_BODY: Record<string, (p: Body, q: Body) => Constraint> = {
  AngleJoint: (p, q) => new AngleJoint(p, q, -1, 1),
  MotorJoint: (p, q) => new MotorJoint(p, q, 2),
  PivotJoint: (p, q) => new PivotJoint(p, q, o(), o()),
  WeldJoint: (p, q) => new WeldJoint(p, q, o(), o()),
  LineJoint: (p, q) => new LineJoint(p, q, o(), o(), new Vec2(1, 0), -10, 10),
  DistanceJoint: (p, q) => new DistanceJoint(p, q, o(), o(), 10, 60),
  SpringJoint: (p, q) => new SpringJoint(p, q, o(), o(), 50),
};

describe("Compound.copy() with joints into a nested compound", () => {
  for (const [name, make] of Object.entries(TWO_BODY)) {
    for (const innerSide of ["body1", "body2"] as const) {
      it(`${name}: ${innerSide} in the inner compound resolves to the copied body`, () => {
        const outer = new Compound();
        const inner = new Compound();
        const top = body(0);
        top.compound = outer;
        const deep = body(50);
        deep.compound = inner;
        inner.compound = outer;
        const [p, q] = innerSide === "body1" ? [deep, top] : [top, deep];
        make(p, q).compound = outer;

        const copy = outer.copy();
        const cTop = copy.bodies.at(0);
        const cDeep = copy.compounds.at(0).bodies.at(0);
        const cj = copy.constraints.at(0) as any;
        expect(cj).toBeInstanceOf((make(body(0), body(0)) as any).constructor);
        const [want1, want2] = innerSide === "body1" ? [cDeep, cTop] : [cTop, cDeep];
        expect(cj.body1).toBe(want1);
        expect(cj.body2).toBe(want2);
        expect(cj.body1).not.toBe(p);
      });
    }
  }

  it("PulleyJoint: all four bodies resolve when they straddle compounds", () => {
    const outer = new Compound();
    const inner = new Compound();
    const bs = [0, 30, 60, 90].map((x) => body(x));
    bs[0].compound = outer;
    bs[1].compound = inner;
    bs[2].compound = outer;
    bs[3].compound = inner;
    inner.compound = outer;
    new PulleyJoint(bs[1], bs[0], bs[3], bs[2], o(), o(), o(), o(), 10, 100).compound = outer;

    const copy = outer.copy();
    const cOuter = [copy.bodies.at(0), copy.bodies.at(1)];
    const cInner = [copy.compounds.at(0).bodies.at(0), copy.compounds.at(0).bodies.at(1)];
    const cj = copy.constraints.at(0) as PulleyJoint;
    const linked = [cj.body1, cj.body2, cj.body3, cj.body4];
    expect(new Set(linked).size).toBe(4);
    for (const b of linked) expect([...cOuter, ...cInner]).toContain(b);
    expect(linked).not.toContain(bs[0]);
  });

  it("copies an inactive joint as inactive, keeping its tuning", () => {
    const outer = new Compound();
    const a = body(0);
    const b = body(30);
    a.compound = outer;
    b.compound = outer;
    const j = new PivotJoint(a, b, o(), o());
    j.stiff = false;
    j.frequency = 3;
    j.damping = 0.25;
    j.maxForce = 500;
    j.maxError = 7;
    j.breakUnderForce = true;
    j.ignore = true;
    j.active = false;
    j.compound = outer;

    const cj = outer.copy().constraints.at(0);
    expect(cj.active).toBe(false);
    expect(cj.stiff).toBe(false);
    expect(cj.frequency).toBe(3);
    expect(cj.damping).toBe(0.25);
    expect(cj.maxForce).toBe(500);
    expect(cj.maxError).toBe(7);
    expect(cj.breakUnderForce).toBe(true);
    expect(cj.ignore).toBe(true);
  });
});

describe("ignore = true suppresses collisions in either body order", () => {
  const cases: Record<string, (p: Body, q: Body, s: Space) => Constraint> = {
    ...TWO_BODY,
    // Rest length below the contact distance, so the spring keeps them touching.
    SpringJoint: (p, q) => new SpringJoint(p, q, o(), o(), 15),
    PulleyJoint: (p, q, s) => {
      const anchor = body(0, -500, 5, BodyType.STATIC);
      anchor.space = s;
      return new PulleyJoint(anchor, p, anchor, q, o(), o(), o(), o(), 0, 1000);
    },
  };
  for (const [name, make] of Object.entries(cases)) {
    for (const reversed of [false, true]) {
      it(`${name}${reversed ? " (bodies reversed)" : ""}`, () => {
        const space = new Space(new Vec2(0, 0));
        const a = body(0);
        const b = body(15);
        a.space = space;
        b.space = space;
        const j = reversed ? make(b, a, space) : make(a, b, space);
        j.ignore = true;
        j.space = space;
        run(space, 3);
        expect(a.arbiters.length).toBe(0);
        j.ignore = false;
        run(space, 1);
        expect(a.arbiters.length).toBeGreaterThan(0);
      });
    }
  }
});

describe("bodyImpulse() before the first step is zero", () => {
  for (const [name, make] of Object.entries(TWO_BODY)) {
    it(name, () => {
      const a = body(0);
      const b = body(30);
      const j = make(a, b);
      const imp = j.bodyImpulse(a);
      expect([imp.x, imp.y, imp.z]).toEqual([0, 0, 0]);
      const space = new Space(new Vec2(0, 0));
      a.space = space;
      b.space = space;
      j.space = space;
      const before = j.bodyImpulse(b);
      expect([before.x, before.y, before.z]).toEqual([0, 0, 0]);
    });
  }
});

describe("singular effective mass", () => {
  it("WeldJoint between two non-rotating bodies still holds them together", () => {
    const space = new Space(new Vec2(0, 300));
    const anchor = body(0, 0, 10);
    anchor.allowRotation = false;
    anchor.allowMovement = false;
    const hanging = body(0, 30, 10);
    hanging.allowRotation = false;
    anchor.space = space;
    hanging.space = space;
    new WeldJoint(anchor, hanging, new Vec2(0, 15), new Vec2(0, -15)).space = space;
    run(space, 120);
    expect(hanging.position.y).toBeCloseTo(30, 0);
    expect(Number.isFinite(hanging.velocity.y)).toBe(true);
  });

  it("WeldJoint between two free non-rotating bodies keeps their offset", () => {
    const space = new Space(new Vec2(0, 0));
    const a = body(0, 0);
    const b = body(40, 0);
    a.allowRotation = false;
    b.allowRotation = false;
    a.space = space;
    b.space = space;
    const j = new WeldJoint(a, b, new Vec2(20, 0), new Vec2(-20, 0));
    j.space = space;
    // Start them out of place so the position solver has work to do.
    b.position = new Vec2(80, 25);
    a.velocity = new Vec2(0, 50);
    run(space, 120);
    expect(b.position.x - a.position.x).toBeCloseTo(40, 0);
    expect(b.position.y - a.position.y).toBeCloseTo(0, 0);
  });

  it("LineJoint and PivotJoint between a fixed point and a non-rotating body stay finite", () => {
    const space = new Space(new Vec2(0, 300));
    const fixed = space.world;
    const slider = body(0, 40);
    slider.allowRotation = false;
    slider.space = space;
    new LineJoint(fixed, slider, o(), o(), new Vec2(1, 0), -20, 20).space = space;
    const pinned = body(100, 40);
    pinned.allowRotation = false;
    pinned.space = space;
    new PivotJoint(fixed, pinned, new Vec2(100, 0), new Vec2(0, -40)).space = space;
    run(space, 60);
    expect(slider.position.y).toBeLessThan(40);
    expect(pinned.position.y).toBeCloseTo(40, 0);
    for (const v of [slider.position.x, slider.position.y, pinned.position.x]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("clamps and limit branches", () => {
  it("SpringJoint clamps its impulse at maxForce and its bias at maxError", () => {
    const space = new Space(new Vec2(0, 0));
    const a = body(0);
    const b = body(400);
    a.space = space;
    b.space = space;
    const spring = new SpringJoint(a, b, o(), o(), 50);
    spring.frequency = 20;
    spring.maxForce = 50;
    spring.maxError = 1;
    spring.space = space;
    run(space, 5);
    const pull = spring.bodyImpulse(b);
    // Per-step impulse is bounded by maxForce * dt.
    expect(Math.abs(pull.x)).toBeLessThanOrEqual(50 * DT + 1e-9);
    expect(b.velocity.x).toBeLessThan(0);
    // Compressed past its rest length: pushes the other way, still clamped.
    b.position = new Vec2(5, 0);
    b.velocity = new Vec2(0, 0);
    a.velocity = new Vec2(0, 0);
    run(space, 1);
    expect(b.velocity.x).toBeGreaterThan(0);
  });

  it("a soft LineJoint caps its accumulated impulse at maxForce", () => {
    const space = new Space(new Vec2(0, 1000));
    const fixed = space.world;
    const heavy = body(0, 0, 30);
    heavy.space = space;
    const j = new LineJoint(fixed, heavy, o(), o(), new Vec2(1, 0), -5, 5);
    // maxForce only clamps soft joints; a stiff joint ignores it unless breakUnderForce.
    j.stiff = false;
    j.maxForce = 100;
    j.space = space;
    run(space, 10);
    // The joint is too weak to hold the body against gravity.
    expect(heavy.position.y).toBeGreaterThan(5);
    const imp = j.impulse();
    expect(Math.hypot(imp.x(0, 0), imp.x(1, 0))).toBeLessThanOrEqual(100 * DT + 1e-6);
  });

  it("a stiff LineJoint / PivotJoint / WeldJoint ignores maxForce (documented)", () => {
    const space = new Space(new Vec2(0, 1000));
    const makers = [
      (b: Body) => new LineJoint(space.world, b, b.position.copy(), o(), new Vec2(1, 0), -5, 5),
      (b: Body) => new PivotJoint(space.world, b, b.position.copy(), o()),
      (b: Body) => new WeldJoint(space.world, b, b.position.copy(), o()),
    ];
    const bodies = makers.map((make, i) => {
      const b = body(i * 200, 0, 30);
      b.space = space;
      const j = make(b);
      j.maxForce = 100;
      j.space = space;
      return b;
    });
    run(space, 10);
    for (const b of bodies) expect(Math.abs(b.position.y)).toBeLessThan(0.5);
  });

  it("DistanceJoint pushes apart when shorter than jointMin, and holds equal limits", () => {
    const space = new Space(new Vec2(0, 0));
    const a = body(0);
    const b = body(5);
    a.space = space;
    b.space = space;
    const min = new DistanceJoint(a, b, o(), o(), 60, 80);
    min.space = space;
    run(space, 60);
    expect(Vec2.distance(a.position, b.position)).toBeGreaterThan(55);

    const c = body(200);
    const d = body(500);
    c.space = space;
    d.space = space;
    const rod = new DistanceJoint(c, d, o(), o(), 100, 100);
    rod.space = space;
    run(space, 60);
    expect(Vec2.distance(c.position, d.position)).toBeCloseTo(100, 0);
  });

  it("PulleyJoint corrects a rope that is too short, too long, or fixed-length", () => {
    for (const [min, max] of [
      [150, 200],
      [10, 40],
      [80, 80],
    ]) {
      const space = new Space(new Vec2(0, 0));
      const top = body(0, -200, 5, BodyType.STATIC);
      top.space = space;
      const left = body(-30, 0);
      const right = body(30, 0);
      left.space = space;
      right.space = space;
      const p = new PulleyJoint(
        top,
        left,
        top,
        right,
        new Vec2(-30, 0),
        o(),
        new Vec2(30, 0),
        o(),
        min,
        max,
      );
      p.space = space;
      // Rope length starts at 400 (both bodies 200 below the pulley points).
      left.position = new Vec2(-30, -200 + 20);
      run(space, 120);
      const len =
        Vec2.distance(left.position, new Vec2(-30, -200)) +
        Vec2.distance(right.position, new Vec2(30, -200));
      expect(len).toBeGreaterThanOrEqual(min - 1);
      expect(len).toBeLessThanOrEqual(max + 1);
      expect(p.isSlack()).toBe(min !== max && len > min + 1 && len < max - 1);
    }
  });
});
