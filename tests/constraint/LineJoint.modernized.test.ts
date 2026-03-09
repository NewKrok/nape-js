import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { LineJoint } from "../../src/constraint/LineJoint";
import "../../src/geom/MatMN";
import { ZPP_LineJoint } from "../../src/native/constraint/ZPP_LineJoint";

describe("LineJoint (modernized)", () => {
  it("should use ZPP_LineJoint directly", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -100,
      100,
    );
    expect(joint.zpp_inner).toBeInstanceOf(ZPP_LineJoint);
    expect(joint.zpp_inner.outer).toBe(joint);
    expect(joint.zpp_inner.outer_zn).toBe(joint);
  });

  it("should set anchor and direction on ZPP", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(5, 10),
      new Vec2(15, 20),
      new Vec2(0, 1),
      -50,
      50,
    );
    expect(joint.zpp_inner.a1localx).toBeCloseTo(5);
    expect(joint.zpp_inner.a1localy).toBeCloseTo(10);
    expect(joint.zpp_inner.a2localx).toBeCloseTo(15);
    expect(joint.zpp_inner.a2localy).toBeCloseTo(20);
    // Direction is stored unnormalized initially, normalized lazily
    expect(joint.zpp_inner.nlocaly).toBeCloseTo(1);
  });

  it("should get/set anchor1, anchor2, and direction", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );
    joint.anchor1 = new Vec2(3, 4);
    expect(joint.anchor1.x).toBeCloseTo(3);
    expect(joint.anchor1.y).toBeCloseTo(4);
    joint.anchor2 = new Vec2(7, 8);
    expect(joint.anchor2.x).toBeCloseTo(7);
    expect(joint.anchor2.y).toBeCloseTo(8);
    joint.direction = new Vec2(0, 1);
    // Direction getter returns normalized direction
    const dir = joint.direction;
    expect(dir).toBeDefined();
  });

  it("should get/set jointMin and jointMax", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );
    expect(joint.jointMin).toBeCloseTo(-10);
    expect(joint.jointMax).toBeCloseTo(10);
    joint.jointMin = -20;
    joint.jointMax = 30;
    expect(joint.jointMin).toBeCloseTo(-20);
    expect(joint.jointMax).toBeCloseTo(30);
  });

  it("should throw on NaN jointMin", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );
    expect(() => {
      joint.jointMin = NaN;
    }).toThrow("NaN");
  });

  it("should throw on NaN jointMax", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );
    expect(() => {
      joint.jointMax = NaN;
    }).toThrow("NaN");
  });

  it("should throw on null direction", () => {
    expect(() => {
      new LineJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), null as any, -10, 10);
    }).toThrow("cannot be null");
  });

  it("should set body1/body2", () => {
    const b1 = new Body(BodyType.DYNAMIC);
    const b2 = new Body(BodyType.DYNAMIC);
    const joint = new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -10, 10);
    expect(joint.zpp_inner.b1).toBe(b1.zpp_inner);
    expect(joint.zpp_inner.b2).toBe(b2.zpp_inner);
  });

  it("should return impulse as MatMN(2,1)", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );
    const imp = joint.impulse();
    expect(imp).toBeDefined();
    expect(imp.zpp_inner.m).toBe(2);
    expect(imp.zpp_inner.n).toBe(1);
  });

  it("should visitBodies correctly", () => {
    const b1 = new Body(BodyType.DYNAMIC);
    const b2 = new Body(BodyType.DYNAMIC);
    const joint = new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -10, 10);
    const visited: Body[] = [];
    joint.visitBodies((b) => visited.push(b));
    expect(visited).toHaveLength(2);
  });

  it("should work with _wrap from ZPP instance", () => {
    const zpp = new ZPP_LineJoint();
    zpp.jointMin = -30;
    zpp.jointMax = 30;
    const wrapped = LineJoint._wrap(zpp);
    expect(wrapped).toBeInstanceOf(LineJoint);
    expect(wrapped.jointMin).toBeCloseTo(-30);
    expect(wrapped.jointMax).toBeCloseTo(30);
  });

  it("should constrain body to slide along a line", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(5));
    b2.space = space;

    // Constrain b2 to slide along the vertical line through b1
    const joint = new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 1), -100, 100);
    joint.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    // b2 should be near x=0 since it's constrained to the vertical line
    expect(Math.abs(b2.position.x)).toBeLessThan(5);
  });
});
