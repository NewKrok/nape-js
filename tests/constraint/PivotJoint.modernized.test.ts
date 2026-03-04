import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import "../../src/geom/MatMN";
import { ZPP_PivotJoint } from "../../src/native/constraint/ZPP_PivotJoint";

describe("PivotJoint (modernized)", () => {
  it("should use ZPP_PivotJoint directly", () => {
    const joint = new PivotJoint(null, null, new Vec2(0, 0), new Vec2(0, 0));
    expect(joint.zpp_inner).toBeInstanceOf(ZPP_PivotJoint);
    expect(joint.zpp_inner.outer).toBe(joint);
    expect(joint.zpp_inner.outer_zn).toBe(joint);
  });

  it("should set anchor coordinates directly on ZPP", () => {
    const joint = new PivotJoint(null, null, new Vec2(3, 7), new Vec2(11, 13));
    expect(joint.zpp_inner.a1localx).toBeCloseTo(3);
    expect(joint.zpp_inner.a1localy).toBeCloseTo(7);
    expect(joint.zpp_inner.a2localx).toBeCloseTo(11);
    expect(joint.zpp_inner.a2localy).toBeCloseTo(13);
  });

  it("should get/set anchor1 and anchor2", () => {
    const joint = new PivotJoint(null, null, new Vec2(0, 0), new Vec2(0, 0));
    joint.anchor1 = new Vec2(5, 10);
    expect(joint.anchor1.x).toBeCloseTo(5);
    expect(joint.anchor1.y).toBeCloseTo(10);
    joint.anchor2 = new Vec2(15, 20);
    expect(joint.anchor2.x).toBeCloseTo(15);
    expect(joint.anchor2.y).toBeCloseTo(20);
  });

  it("should throw on null anchor1", () => {
    expect(() => {
      new PivotJoint(null, null, null as any, new Vec2(0, 0));
    }).toThrow("cannot be null");
  });

  it("should throw on null anchor2", () => {
    expect(() => {
      new PivotJoint(null, null, new Vec2(0, 0), null as any);
    }).toThrow("cannot be null");
  });

  it("should set body1/body2", () => {
    const b1 = new Body(BodyType.DYNAMIC);
    const b2 = new Body(BodyType.DYNAMIC);
    const joint = new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));
    expect(joint.zpp_inner.b1).toBe(b1.zpp_inner);
    expect(joint.zpp_inner.b2).toBe(b2.zpp_inner);
  });

  it("should return impulse as MatMN(2,1)", () => {
    const joint = new PivotJoint(null, null, new Vec2(0, 0), new Vec2(0, 0));
    const imp = joint.impulse();
    expect(imp).toBeDefined();
    expect(imp.zpp_inner.m).toBe(2);
    expect(imp.zpp_inner.n).toBe(1);
  });

  it("should visitBodies correctly", () => {
    const b1 = new Body(BodyType.DYNAMIC);
    const b2 = new Body(BodyType.DYNAMIC);
    const joint = new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));
    const visited: Body[] = [];
    joint.visitBodies((b) => visited.push(b));
    expect(visited).toHaveLength(2);
    expect(visited).toContain(b1);
    expect(visited).toContain(b2);
  });

  it("should provide backward-compat zpp_inner_zn alias", () => {
    const joint = new PivotJoint(null, null, new Vec2(0, 0), new Vec2(0, 0));
    expect(joint.zpp_inner_zn).toBe(joint.zpp_inner);
  });

  it("should work with _wrap from ZPP instance", () => {
    const zpp = new ZPP_PivotJoint();
    zpp.a1localx = 5;
    zpp.a1localy = 10;
    const wrapped = PivotJoint._wrap(zpp);
    expect(wrapped).toBeInstanceOf(PivotJoint);
    expect(wrapped.anchor1.x).toBeCloseTo(5);
    expect(wrapped.anchor1.y).toBeCloseTo(10);
  });

  it("should constrain two bodies to share a pivot point", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(5));
    b2.space = space;

    const joint = new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    // Body2 should be near the pivot point (0,0) since anchor2 is at origin of b2
    const dist = Math.sqrt(b2.position.x * b2.position.x + b2.position.y * b2.position.y);
    expect(dist).toBeLessThan(10);
  });
});
