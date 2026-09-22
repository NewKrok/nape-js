/**
 * Body reassignment on constraints that are already inside a Space.
 *
 * The plain reassignment tests only cover constraints outside a Space. Once a
 * constraint lives in a Space, swapping a body must also move the constraint
 * between the bodies' `constraints` lists and wake the bodies involved, and
 * `bodyImpulse()` on an inactive constraint must report zero.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import type { Constraint } from "../../src/constraint/Constraint";
import "../../src/index";

function makeBody(space: Space, x: number, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, 0));
  b.shapes.add(new Circle(10));
  space.bodies.add(b);
  return b;
}

function constraintsOf(body: Body): Constraint[] {
  const out: Constraint[] = [];
  for (const c of body.constraints as Iterable<Constraint>) out.push(c);
  return out;
}

type TwoBodyFactory = (
  b1: Body,
  b2: Body,
) => Constraint & { body1: Body | null; body2: Body | null };

const TWO_BODY_JOINTS: [string, TwoBodyFactory][] = [
  ["PivotJoint", (a, b) => new PivotJoint(a, b, new Vec2(), new Vec2())],
  ["DistanceJoint", (a, b) => new DistanceJoint(a, b, new Vec2(), new Vec2(), 10, 100)],
  ["WeldJoint", (a, b) => new WeldJoint(a, b, new Vec2(), new Vec2())],
  ["LineJoint", (a, b) => new LineJoint(a, b, new Vec2(), new Vec2(), new Vec2(1, 0), -50, 50)],
  ["AngleJoint", (a, b) => new AngleJoint(a, b, -1, 1)],
  ["MotorJoint", (a, b) => new MotorJoint(a, b, 1)],
  ["SpringJoint", (a, b) => new SpringJoint(a, b, new Vec2(), new Vec2(), 50)],
];

describe.each(TWO_BODY_JOINTS)("%s body reassignment inside a Space", (_name, make) => {
  it("moves the constraint from the old body1 to the new body1", () => {
    const space = new Space();
    const b1 = makeBody(space, 0);
    const b2 = makeBody(space, 50);
    const b3 = makeBody(space, 100);
    const joint = make(b1, b2);
    space.constraints.add(joint);
    space.step(1 / 60);

    expect(constraintsOf(b1)).toContain(joint);

    joint.body1 = b3;

    expect(joint.body1).toBe(b3);
    expect(constraintsOf(b1)).not.toContain(joint);
    expect(constraintsOf(b3)).toContain(joint);
    expect(b1.isSleeping).toBe(false);
    expect(b3.isSleeping).toBe(false);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("moves the constraint from the old body2 to the new body2", () => {
    const space = new Space();
    const b1 = makeBody(space, 0);
    const b2 = makeBody(space, 50);
    const b3 = makeBody(space, 100);
    const joint = make(b1, b2);
    space.constraints.add(joint);
    space.step(1 / 60);

    joint.body2 = b3;

    expect(joint.body2).toBe(b3);
    expect(constraintsOf(b2)).not.toContain(joint);
    expect(constraintsOf(b3)).toContain(joint);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("assigning the same body again is a no-op", () => {
    const space = new Space();
    const b1 = makeBody(space, 0);
    const b2 = makeBody(space, 50);
    const joint = make(b1, b2);
    space.constraints.add(joint);

    joint.body1 = b1;
    joint.body2 = b2;

    expect(constraintsOf(b1).filter((c) => c === joint)).toHaveLength(1);
    expect(constraintsOf(b2).filter((c) => c === joint)).toHaveLength(1);
  });

  it("detaching body1 while in a Space removes it from the body's constraint list", () => {
    const space = new Space();
    const b1 = makeBody(space, 0);
    const b2 = makeBody(space, 50);
    const joint = make(b1, b2);
    space.constraints.add(joint);

    joint.body1 = null;

    expect(joint.body1).toBeNull();
    expect(constraintsOf(b1)).not.toContain(joint);
    // A constraint with a missing body cannot be simulated.
    expect(() => space.step(1 / 60)).toThrow();
  });

  it("bodyImpulse() is zero while the constraint is inactive and reports the real impulse otherwise", () => {
    const space = new Space(new Vec2(0, 600));
    const b1 = makeBody(space, 0, BodyType.STATIC);
    const b2 = makeBody(space, 30);
    const joint = make(b1, b2);
    space.constraints.add(joint);
    for (let i = 0; i < 5; i++) space.step(1 / 60);

    const live = joint.bodyImpulse(b2);
    expect(Number.isFinite(live.x)).toBe(true);
    expect(Number.isFinite(live.y)).toBe(true);
    expect(Number.isFinite(live.z)).toBe(true);

    joint.active = false;
    const idle = joint.bodyImpulse(b2);
    expect(idle.x).toBe(0);
    expect(idle.y).toBe(0);
    expect(idle.z).toBe(0);
  });
});

describe("PulleyJoint body reassignment inside a Space", () => {
  function makePulley(space: Space) {
    const b1 = makeBody(space, 0);
    const b2 = makeBody(space, 50);
    const b3 = makeBody(space, 100);
    const b4 = makeBody(space, 150);
    const joint = new PulleyJoint(
      b1,
      b2,
      b3,
      b4,
      new Vec2(),
      new Vec2(),
      new Vec2(),
      new Vec2(),
      10,
      200,
      1,
    );
    space.constraints.add(joint);
    space.step(1 / 60);
    return { b1, b2, b3, b4, joint };
  }

  it("reassigns body1 and body2 to fresh bodies", () => {
    const space = new Space();
    const { b1, b2, joint } = makePulley(space);
    const n1 = makeBody(space, 200);
    const n2 = makeBody(space, 250);

    joint.body1 = n1;
    joint.body2 = n2;

    expect(constraintsOf(b1)).not.toContain(joint);
    expect(constraintsOf(b2)).not.toContain(joint);
    expect(constraintsOf(n1)).toContain(joint);
    expect(constraintsOf(n2)).toContain(joint);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("keeps the constraint on a body that is still referenced by another slot", () => {
    const space = new Space();
    const { b2, b3, joint } = makePulley(space);
    // body1 := body2 — b2 is now referenced twice.
    joint.body1 = b2;
    expect(constraintsOf(b2).filter((c) => c === joint)).toHaveLength(1);

    // Moving body1 away again must not drop b2, which body2 still uses.
    joint.body1 = b3;
    expect(constraintsOf(b2)).toContain(joint);
    expect(constraintsOf(b3)).toContain(joint);
  });

  it("bodyImpulse() is zero while inactive", () => {
    const space = new Space(new Vec2(0, 600));
    const { b2, joint } = makePulley(space);
    joint.active = false;
    const imp = joint.bodyImpulse(b2);
    expect(imp.x).toBe(0);
    expect(imp.y).toBe(0);
    expect(imp.z).toBe(0);
  });
});

describe("MotorJoint island bookkeeping", () => {
  it("a motor between two dynamic bodies joins their sleep island", () => {
    const space = new Space();
    const b1 = makeBody(space, 0);
    const b2 = makeBody(space, 50);
    const motor = new MotorJoint(b1, b2, 0);
    space.constraints.add(motor);

    // No gravity, no motion: everything should fall asleep together.
    for (let i = 0; i < 200; i++) space.step(1 / 60);

    expect(b1.isSleeping).toBe(true);
    expect(b2.isSleeping).toBe(true);
    expect(motor.isSleeping).toBe(true);

    // Waking one body through the motor's island wakes the other.
    b1.velocity = new Vec2(10, 0);
    space.step(1 / 60);
    expect(b1.isSleeping).toBe(false);
    expect(b2.isSleeping).toBe(false);
  });
});
