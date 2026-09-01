import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import { ZPP_MotorJoint } from "../../src/native/constraint/ZPP_MotorJoint";
import { ZPP_SpringJoint } from "../../src/native/constraint/ZPP_SpringJoint";

function dynamicCircle(x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function hasConstraint(b: Body, j: any): boolean {
  let node = (b as any).zpp_inner.constraints.head;
  while (node != null) {
    if (node.elt === (j as any).zpp_inner) return true;
    node = node.next;
  }
  return false;
}

describe("MotorJoint wrapping", () => {
  it("_wrap(null) returns null", () => {
    expect(MotorJoint._wrap(null)).toBeNull();
  });

  it("_wrap on a MotorJoint returns the same instance", () => {
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const j = new MotorJoint(b1, b2, 1, 2);
    expect(MotorJoint._wrap(j)).toBe(j);
  });

  it("_wrap on an object holding zpp_inner resolves to the existing outer", () => {
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const j = new MotorJoint(b1, b2, 1, 2);
    const holder = { zpp_inner: (j as any).zpp_inner };
    expect(MotorJoint._wrap(holder)).toBe(j);
  });

  it("_wrap on a raw ZPP_MotorJoint produces a working wrapper", () => {
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const j = new MotorJoint(b1, b2, 3, 2);
    const zpp = (j as any).zpp_inner;
    zpp.outer = null;
    const wrapped = MotorJoint._wrap(zpp);
    expect(wrapped).toBeInstanceOf(MotorJoint);
    expect((wrapped as any).zpp_inner).toBe(zpp);
    expect(wrapped.rate).toBeCloseTo(3);
    expect(wrapped.ratio).toBeCloseTo(2);
  });

  it("_wrap falls back to a generic wrapper for unknown inner objects", () => {
    const raw = { zpp_inner: {} as any };
    const wrapped = MotorJoint._wrap(raw);
    expect(wrapped).toBeInstanceOf(MotorJoint);
    expect((wrapped as any).zpp_inner).toBe(raw.zpp_inner);
  });

  it("_wrapFn creates a wrapper with debugDraw enabled", () => {
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const j = new MotorJoint(b1, b2, 1, 1);
    const zpp = (j as any).zpp_inner;
    zpp.outer = null;
    const wrapped = (ZPP_MotorJoint as any)._wrapFn(zpp);
    expect(wrapped).toBeInstanceOf(MotorJoint);
    expect(wrapped.debugDraw).toBe(true);
    expect(zpp.outer).toBe(wrapped);
  });

  it("swaps body2 while active in a space, waking both bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const b3 = dynamicCircle(100, 0);
    b1.space = space;
    b2.space = space;
    b3.space = space;

    const j = new MotorJoint(b1, b2, 1, 1);
    j.space = space;
    space.step(1 / 60);

    j.body2 = b3;
    expect((j.body2 as any).zpp_inner).toBe((b3 as any).zpp_inner);
    expect(hasConstraint(b3, j)).toBe(true);
    expect(hasConstraint(b2, j)).toBe(false);

    // Re-assigning the same body is a no-op.
    j.body2 = b3;
    expect((j.body2 as any).zpp_inner).toBe((b3 as any).zpp_inner);

    space.step(1 / 60);
    expect(j.active).toBe(true);
  });

  it("swaps body1 while active in a space", () => {
    const space = new Space(new Vec2(0, 0));
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const b3 = dynamicCircle(100, 0);
    b1.space = space;
    b2.space = space;
    b3.space = space;

    const j = new MotorJoint(b1, b2, 1, 1);
    j.space = space;

    j.body1 = b3;
    expect((j.body1 as any).zpp_inner).toBe((b3 as any).zpp_inner);
    expect(hasConstraint(b3, j)).toBe(true);
    expect(hasConstraint(b1, j)).toBe(false);
  });
});

describe("SpringJoint wrapping", () => {
  function makeSpring(b1: Body, b2: Body): SpringJoint {
    return new SpringJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 50);
  }

  it("_wrap(null) returns null", () => {
    expect(SpringJoint._wrap(null)).toBeNull();
  });

  it("_wrap on a SpringJoint returns the same instance", () => {
    const j = makeSpring(dynamicCircle(0, 0), dynamicCircle(50, 0));
    expect(SpringJoint._wrap(j)).toBe(j);
  });

  it("_wrap on an object holding zpp_inner resolves to the existing outer", () => {
    const j = makeSpring(dynamicCircle(0, 0), dynamicCircle(50, 0));
    const holder = { zpp_inner: (j as any).zpp_inner };
    expect(SpringJoint._wrap(holder)).toBe(j);
  });

  it("_wrap on a raw ZPP_SpringJoint produces a working wrapper", () => {
    const j = makeSpring(dynamicCircle(0, 0), dynamicCircle(50, 0));
    const zpp = (j as any).zpp_inner;
    zpp.outer = null;
    const wrapped = SpringJoint._wrap(zpp);
    expect(wrapped).toBeInstanceOf(SpringJoint);
    expect((wrapped as any).zpp_inner).toBe(zpp);
    expect(wrapped.restLength).toBeCloseTo(50);
  });

  it("_wrap falls back to a generic wrapper for unknown inner objects", () => {
    const raw = { zpp_inner: {} as any };
    const wrapped = SpringJoint._wrap(raw);
    expect(wrapped).toBeInstanceOf(SpringJoint);
    expect((wrapped as any).zpp_inner).toBe(raw.zpp_inner);
  });

  it("_wrapFn creates a wrapper with debugDraw enabled", () => {
    const j = makeSpring(dynamicCircle(0, 0), dynamicCircle(50, 0));
    const zpp = (j as any).zpp_inner;
    zpp.outer = null;
    const wrapped = (ZPP_SpringJoint as any)._wrapFn(zpp);
    expect(wrapped).toBeInstanceOf(SpringJoint);
    expect(wrapped.debugDraw).toBe(true);
    expect(zpp.outer).toBe(wrapped);
  });

  it("rejects NaN and negative restLength", () => {
    const j = makeSpring(dynamicCircle(0, 0), dynamicCircle(50, 0));
    expect(() => {
      j.restLength = NaN;
    }).toThrow("cannot be NaN");
    expect(() => {
      j.restLength = -1;
    }).toThrow(">= 0");
  });

  it("swaps body1 while active in a space, detaching the old body", () => {
    const space = new Space(new Vec2(0, 0));
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(50, 0);
    const b3 = dynamicCircle(100, 0);
    b1.space = space;
    b2.space = space;
    b3.space = space;

    const j = makeSpring(b1, b2);
    j.space = space;
    space.step(1 / 60);

    j.body1 = b3;
    expect((j.body1 as any).zpp_inner).toBe((b3 as any).zpp_inner);
    expect(hasConstraint(b3, j)).toBe(true);
    expect(hasConstraint(b1, j)).toBe(false);

    j.body1 = null;
    expect(j.body1).toBeNull();
    expect(hasConstraint(b3, j)).toBe(false);
  });
});
