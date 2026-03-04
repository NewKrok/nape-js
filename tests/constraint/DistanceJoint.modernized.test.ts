import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import "../../src/geom/MatMN";
import { ZPP_DistanceJoint } from "../../src/native/constraint/ZPP_DistanceJoint";

describe("DistanceJoint (modernized)", () => {
  it("should use ZPP_DistanceJoint directly", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 10, 50);
    expect(joint.zpp_inner).toBeInstanceOf(ZPP_DistanceJoint);
    expect(joint.zpp_inner.outer).toBe(joint);
    expect(joint.zpp_inner.outer_zn).toBe(joint);
  });

  it("should set anchor coordinates directly on ZPP", () => {
    const joint = new DistanceJoint(null, null, new Vec2(5, 10), new Vec2(15, 20), 0, 100);
    expect(joint.zpp_inner.a1localx).toBeCloseTo(5);
    expect(joint.zpp_inner.a1localy).toBeCloseTo(10);
    expect(joint.zpp_inner.a2localx).toBeCloseTo(15);
    expect(joint.zpp_inner.a2localy).toBeCloseTo(20);
  });

  it("should get anchor1/anchor2 as Vec2 wrappers", () => {
    const joint = new DistanceJoint(null, null, new Vec2(5, 10), new Vec2(15, 20), 0, 100);
    const a1 = joint.anchor1;
    expect(a1.x).toBeCloseTo(5);
    expect(a1.y).toBeCloseTo(10);
    const a2 = joint.anchor2;
    expect(a2.x).toBeCloseTo(15);
    expect(a2.y).toBeCloseTo(20);
  });

  it("should set anchor1/anchor2 via setter", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    joint.anchor1 = new Vec2(7, 14);
    expect(joint.anchor1.x).toBeCloseTo(7);
    expect(joint.anchor1.y).toBeCloseTo(14);
    joint.anchor2 = new Vec2(21, 28);
    expect(joint.anchor2.x).toBeCloseTo(21);
    expect(joint.anchor2.y).toBeCloseTo(28);
  });

  it("should throw on NaN jointMin", () => {
    expect(() => {
      new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), NaN, 100);
    }).toThrow("NaN");
  });

  it("should throw on NaN jointMax", () => {
    expect(() => {
      new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, NaN);
    }).toThrow("NaN");
  });

  it("should throw on negative jointMin", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(() => {
      joint.jointMin = -5;
    }).toThrow(">= 0");
  });

  it("should throw on negative jointMax", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(() => {
      joint.jointMax = -5;
    }).toThrow(">= 0");
  });

  it("should throw on null anchor1", () => {
    expect(() => {
      new DistanceJoint(null, null, null as any, new Vec2(0, 0), 0, 100);
    }).toThrow("cannot be null");
  });

  it("should throw on null anchor2", () => {
    expect(() => {
      new DistanceJoint(null, null, new Vec2(0, 0), null as any, 0, 100);
    }).toThrow("cannot be null");
  });

  it("should set body1/body2 with constraint-space integration", () => {
    const space = new Space(new Vec2(0, 0));
    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(joint.zpp_inner.b1).toBe(b1.zpp_inner);
    expect(joint.zpp_inner.b2).toBe(b2.zpp_inner);

    // Swap bodies
    const b3 = new Body(BodyType.DYNAMIC);
    b3.shapes.add(new Circle(10));
    b3.space = space;
    joint.body1 = b3;
    expect(joint.zpp_inner.b1).toBe(b3.zpp_inner);
  });

  it("should provide backward-compat zpp_inner_zn alias", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(joint.zpp_inner_zn).toBe(joint.zpp_inner);
  });

  it("should provide backward-compat get_*/set_* methods", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 10, 50);
    expect(joint.get_jointMin()).toBeCloseTo(10);
    expect(joint.get_jointMax()).toBeCloseTo(50);
    joint.set_jointMin(20);
    joint.set_jointMax(80);
    expect(joint.jointMin).toBeCloseTo(20);
    expect(joint.jointMax).toBeCloseTo(80);
  });

  it("should visitBodies correctly", () => {
    const b1 = new Body(BodyType.DYNAMIC);
    const b2 = new Body(BodyType.DYNAMIC);
    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    const visited: Body[] = [];
    joint.visitBodies((b) => visited.push(b));
    expect(visited).toHaveLength(2);
    expect(visited).toContain(b1);
    expect(visited).toContain(b2);
  });

  it("should visitBodies with null bodies", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    const visited: Body[] = [];
    joint.visitBodies((b) => visited.push(b));
    expect(visited).toHaveLength(0);
  });

  it("should return impulse as MatMN(1,1)", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    const imp = joint.impulse();
    expect(imp).toBeDefined();
    expect(imp.zpp_inner.m).toBe(1);
    expect(imp.zpp_inner.n).toBe(1);
  });

  it("should work with _wrap from ZPP instance", () => {
    const zpp = new ZPP_DistanceJoint();
    zpp.jointMin = 5;
    zpp.jointMax = 50;
    const wrapped = DistanceJoint._wrap(zpp);
    expect(wrapped).toBeInstanceOf(DistanceJoint);
    expect(wrapped.jointMin).toBeCloseTo(5);
    expect(wrapped.jointMax).toBeCloseTo(50);
  });

  it("should simulate distance constraint correctly", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const bob = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    bob.shapes.add(new Circle(5));
    bob.space = space;

    const joint = new DistanceJoint(anchor, bob, new Vec2(0, 0), new Vec2(0, 0), 40, 60);
    joint.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    const dx = bob.position.x - anchor.position.x;
    const dy = bob.position.y - anchor.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(35);
    expect(dist).toBeLessThan(65);
  });
});
