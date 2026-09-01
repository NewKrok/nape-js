import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { ZPP_MotorJoint } from "../../src/native/constraint/ZPP_MotorJoint";
import { ZPP_SpringJoint } from "../../src/native/constraint/ZPP_SpringJoint";
import { ZPP_PivotJoint } from "../../src/native/constraint/ZPP_PivotJoint";
import { ZPP_DistanceJoint } from "../../src/native/constraint/ZPP_DistanceJoint";
import { ZPP_PulleyJoint } from "../../src/native/constraint/ZPP_PulleyJoint";
import { ZPP_WeldJoint } from "../../src/native/constraint/ZPP_WeldJoint";
import { ZPP_LineJoint } from "../../src/native/constraint/ZPP_LineJoint";
import { ZPP_AngleJoint } from "../../src/native/constraint/ZPP_AngleJoint";

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

// Same _wrap contract across every joint class: null → null, instance →
// itself, holder with zpp_inner → existing outer, raw zpp without outer →
// fresh working wrapper, unknown inner → generic fallback wrapper.
const JOINT_KINDS: Array<[string, any, any, (b1: Body, b2: Body) => any]> = [
  [
    "PivotJoint",
    PivotJoint,
    ZPP_PivotJoint,
    (b1, b2) => new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0)),
  ],
  [
    "DistanceJoint",
    DistanceJoint,
    ZPP_DistanceJoint,
    (b1, b2) => new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 10, 60),
  ],
  [
    "PulleyJoint",
    PulleyJoint,
    ZPP_PulleyJoint,
    (b1, b2) =>
      new PulleyJoint(
        b1,
        b2,
        b1,
        b2,
        new Vec2(0, 0),
        new Vec2(0, 0),
        new Vec2(0, 5),
        new Vec2(0, 5),
        10,
        60,
      ),
  ],
  [
    "WeldJoint",
    WeldJoint,
    ZPP_WeldJoint,
    (b1, b2) => new WeldJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0)),
  ],
  [
    "LineJoint",
    LineJoint,
    ZPP_LineJoint,
    (b1, b2) => new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 1), -10, 10),
  ],
  ["AngleJoint", AngleJoint, ZPP_AngleJoint, (b1, b2) => new AngleJoint(b1, b2, -1, 1)],
];

for (const [name, Cls, ZppCls, make] of JOINT_KINDS) {
  describe(`${name}._wrap`, () => {
    function joint() {
      return make(dynamicCircle(0, 0), dynamicCircle(50, 0));
    }

    it("returns null for null input", () => {
      expect(Cls._wrap(null)).toBeNull();
    });

    it("returns the same instance for an already-wrapped joint", () => {
      const j = joint();
      expect(Cls._wrap(j)).toBe(j);
    });

    it("resolves a holder exposing zpp_inner to the existing outer", () => {
      const j = joint();
      expect(Cls._wrap({ zpp_inner: (j as any).zpp_inner })).toBe(j);
    });

    it("re-wraps a raw zpp whose outer was detached", () => {
      const j = joint();
      const zpp = (j as any).zpp_inner;
      zpp.outer = null;
      const wrapped = Cls._wrap(zpp);
      expect(wrapped).toBeInstanceOf(Cls);
      expect((wrapped as any).zpp_inner).toBe(zpp);
    });

    it("falls back to a generic wrapper for unknown inner objects", () => {
      const wrapped = Cls._wrap({ zpp_inner: {} });
      expect(wrapped).toBeInstanceOf(Cls);
    });

    it("_wrapFn creates a wrapper with debugDraw enabled", () => {
      const j = joint();
      const zpp = (j as any).zpp_inner;
      zpp.outer = null;
      const wrapped = (ZppCls as any)._wrapFn(zpp);
      expect(wrapped).toBeInstanceOf(Cls);
      expect(wrapped.debugDraw).toBe(true);
      expect(zpp.outer).toBe(wrapped);
    });
  });
}

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
