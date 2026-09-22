/**
 * Compound.copy() must deep-copy every constraint type and re-point each copy
 * at the copied bodies (not the originals), including the deferred lookup
 * path used when a constraint is copied before one of its bodies.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import type { Constraint } from "../../src/constraint/Constraint";
import "../../src/index";

function body(x: number, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, 0));
  b.shapes.add(new Circle(10));
  return b;
}

function list<T>(l: unknown): T[] {
  const out: T[] = [];
  for (const x of l as Iterable<T>) out.push(x);
  return out;
}

function buildCompound() {
  const c = new Compound();
  const b1 = body(0);
  const b2 = body(50);
  const b3 = body(100);
  const b4 = body(150);
  c.bodies.add(b1);
  c.bodies.add(b2);
  c.bodies.add(b3);
  c.bodies.add(b4);

  const pivot = new PivotJoint(b1, b2, new Vec2(), new Vec2());
  const motor = new MotorJoint(b2, b3, 2, 1.5);
  const angle = new AngleJoint(b1, b3, -1, 1, 2);
  const spring = new SpringJoint(b3, b4, new Vec2(1, 2), new Vec2(3, 4), 40);
  const pulley = new PulleyJoint(
    b1,
    b2,
    b3,
    b4,
    new Vec2(),
    new Vec2(),
    new Vec2(),
    new Vec2(),
    10,
    300,
    2,
  );
  for (const k of [pivot, motor, angle, spring, pulley]) c.constraints.add(k);
  return { c, bodies: [b1, b2, b3, b4], pivot, motor, angle, spring, pulley };
}

describe("Compound.copy() constraint remapping", () => {
  it("copies every constraint and points it at the copied bodies", () => {
    const { c, bodies, pivot, motor, angle, spring, pulley } = buildCompound();

    const copy = c.copy();
    const copiedBodies = list<Body>(copy.bodies);
    const copiedConstraints = list<Constraint>(copy.constraints);

    expect(copiedBodies).toHaveLength(4);
    expect(copiedConstraints).toHaveLength(5);
    for (const cb of copiedBodies) expect(bodies).not.toContain(cb);

    const originals = [pivot, motor, angle, spring, pulley];
    for (const cc of copiedConstraints) {
      expect(originals).not.toContain(cc);
      expect(cc.compound).toBe(copy);
    }

    const copiedMotor = copiedConstraints.find((k) => k instanceof MotorJoint) as MotorJoint;
    expect(copiedMotor.rate).toBe(2);
    expect(copiedMotor.ratio).toBe(1.5);
    expect(copiedBodies).toContain(copiedMotor.body1);
    expect(copiedBodies).toContain(copiedMotor.body2);
    expect(copiedMotor.body1).not.toBe(motor.body1);

    const copiedAngle = copiedConstraints.find((k) => k instanceof AngleJoint) as AngleJoint;
    expect(copiedAngle.ratio).toBe(2);
    expect(copiedBodies).toContain(copiedAngle.body1);
    expect(copiedBodies).toContain(copiedAngle.body2);

    const copiedSpring = copiedConstraints.find((k) => k instanceof SpringJoint) as SpringJoint;
    expect(copiedSpring.restLength).toBe(40);
    expect(copiedSpring.anchor1.x).toBe(1);
    expect(copiedSpring.anchor2.y).toBe(4);
    expect(copiedBodies).toContain(copiedSpring.body1);
    expect(copiedBodies).toContain(copiedSpring.body2);

    const copiedPulley = copiedConstraints.find((k) => k instanceof PulleyJoint) as PulleyJoint;
    expect(copiedPulley.ratio).toBe(2);
    for (const b of [
      copiedPulley.body1,
      copiedPulley.body2,
      copiedPulley.body3,
      copiedPulley.body4,
    ]) {
      expect(copiedBodies).toContain(b);
    }
  });

  it("resolves bodies copied after the constraint (deferred lookup)", () => {
    // Constraints are added before the bodies so the copy has to defer the
    // body resolution until the bodies themselves are copied.
    const c = new Compound();
    const b1 = body(0);
    const b2 = body(50);
    const motor = new MotorJoint(b1, b2, 1);
    const angle = new AngleJoint(b1, b2, 0, 1);
    c.constraints.add(motor);
    c.constraints.add(angle);
    c.bodies.add(b1);
    c.bodies.add(b2);

    const copy = c.copy();
    const copiedBodies = list<Body>(copy.bodies);
    for (const k of list<MotorJoint | AngleJoint>(copy.constraints)) {
      expect(k.body1).not.toBeNull();
      expect(k.body2).not.toBeNull();
      expect(copiedBodies).toContain(k.body1);
      expect(copiedBodies).toContain(k.body2);
    }
  });

  it("resolves parent-compound bodies referenced from a child compound's constraints", () => {
    // Child compounds are copied before the parent's bodies, so a joint that
    // lives in the child but references a parent body cannot find the copied
    // body in the dictionary yet and must register a deferred lookup.
    const outer = new Compound();
    const inner = new Compound();
    const parentBody = body(0);
    const childBody = body(50);
    outer.bodies.add(parentBody);
    inner.bodies.add(childBody);
    inner.compound = outer;

    const angle = new AngleJoint(parentBody, childBody, -1, 1);
    const motor = new MotorJoint(parentBody, childBody, 1);
    const pivot = new PivotJoint(parentBody, childBody, new Vec2(), new Vec2());
    const spring = new SpringJoint(childBody, parentBody, new Vec2(), new Vec2(), 10);
    for (const k of [angle, motor, pivot, spring]) inner.constraints.add(k);

    const copy = outer.copy();
    const copiedOuterBodies = list<Body>(copy.bodies);
    const copiedInner = list<Compound>(copy.compounds)[0];
    const copiedInnerBodies = list<Body>(copiedInner.bodies);
    expect(copiedOuterBodies).toHaveLength(1);
    expect(copiedInnerBodies).toHaveLength(1);

    const copiedJoints = list<AngleJoint | MotorJoint | PivotJoint | SpringJoint>(
      copiedInner.constraints,
    );
    expect(copiedJoints).toHaveLength(4);
    for (const k of copiedJoints) {
      expect(k.body1).not.toBeNull();
      expect(k.body2).not.toBeNull();
      expect([k.body1, k.body2]).toContain(copiedOuterBodies[0]);
      expect([k.body1, k.body2]).toContain(copiedInnerBodies[0]);
      expect([k.body1, k.body2]).not.toContain(parentBody);
      expect([k.body1, k.body2]).not.toContain(childBody);
    }
  });

  it("the copy simulates independently of the original", () => {
    const { c } = buildCompound();
    const space = new Space(new Vec2(0, 100));
    const copy = c.copy();
    space.compounds.add(copy);
    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const moved = list<Body>(copy.bodies).some((b) => b.position.y !== 0);
    const originalStill = list<Body>(c.bodies).every((b) => b.position.y === 0);
    expect(moved).toBe(true);
    expect(originalStill).toBe(true);
  });
});

describe("Compound._wrap fallbacks", () => {
  it("unwraps an object carrying zpp_inner and wraps an unknown object generically", () => {
    const c = new Compound();
    expect(Compound._wrap({ zpp_inner: c.zpp_inner } as any)).toBe(c);
    const foreign = {};
    const wrapped = Compound._wrap(foreign as any);
    expect(wrapped).toBeInstanceOf(Compound);
    expect(Compound._wrap(foreign as any)).toBe(wrapped);
  });
});

describe("Compound.COM()", () => {
  it("is the mass-weighted centre of the member bodies", () => {
    const c = new Compound();
    const a = body(0);
    const b = body(100);
    b.shapes.add(new Circle(10)); // twice the mass of `a`
    c.bodies.add(a);
    c.bodies.add(b);

    const com = c.COM();
    expect(com.x).toBeCloseTo(200 / 3, 5);
    expect(com.y).toBeCloseTo(0, 5);
    expect(com.zpp_inner.weak).toBe(false);
  });

  it("can return a weak Vec2", () => {
    const c = new Compound();
    c.bodies.add(body(10));
    const com = c.COM(true);
    expect(com.zpp_inner.weak).toBe(true);
    expect(com.x).toBeCloseTo(10, 5);
  });

  it("ignores shapeless bodies and throws for an empty compound", () => {
    const c = new Compound();
    c.bodies.add(new Body(BodyType.DYNAMIC, new Vec2(500, 500)));
    expect(() => c.COM()).toThrow(/empty Compound/);

    c.bodies.add(body(20));
    expect(c.COM().x).toBeCloseTo(20, 5);
  });
});
