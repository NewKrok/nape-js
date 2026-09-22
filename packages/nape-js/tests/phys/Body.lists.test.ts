/**
 * Body.constraints / Body.arbiters (read-only relationship lists) and the
 * in-space body type switch.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import "../../src/index";

function ball(space: Space | null, x: number, y = 0, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Circle(10));
  if (space) space.bodies.add(b);
  return b;
}

describe("Body.constraints", () => {
  it("is empty outside a Space and lists attached constraints inside one", () => {
    const space = new Space();
    const a = ball(null, 0);
    const b = ball(null, 30);
    const pivot = new PivotJoint(a, b, new Vec2(), new Vec2());
    const dist = new DistanceJoint(a, b, new Vec2(), new Vec2(), 0, 100);

    expect(a.constraints.length).toBe(0);
    expect(a.constraints.empty()).toBe(true);

    space.bodies.add(a);
    space.bodies.add(b);
    space.constraints.add(pivot);
    space.constraints.add(dist);

    expect(a.constraints.length).toBe(2);
    expect(a.constraints.has(pivot)).toBe(true);
    expect(a.constraints.has(dist)).toBe(true);
    expect(b.constraints.length).toBe(2);
    expect([...a.constraints].length).toBe(2);
    // Same wrapper on every access.
    expect(a.constraints).toBe(a.constraints);
  });

  it("shrinks when a constraint leaves the Space", () => {
    const space = new Space();
    const a = ball(space, 0);
    const b = ball(space, 30);
    const pivot = new PivotJoint(a, b, new Vec2(), new Vec2());
    space.constraints.add(pivot);
    expect(a.constraints.length).toBe(1);

    space.constraints.remove(pivot);
    expect(a.constraints.length).toBe(0);
    expect(b.constraints.length).toBe(0);
  });

  it("is read-only", () => {
    const space = new Space();
    const a = ball(space, 0);
    const b = ball(space, 30);
    const pivot = new PivotJoint(a, b, new Vec2(), new Vec2());
    expect(() => a.constraints.add(pivot)).toThrow(/immutable/);
    expect(() => a.constraints.clear()).toThrow(/immutable/);
  });
});

describe("Body.arbiters", () => {
  it("lists the arbiters the body takes part in", () => {
    const space = new Space(new Vec2(0, 600));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(400, 20)));
    space.bodies.add(floor);
    const b = ball(space, 0, 25);
    const far = ball(space, 150, 25);

    expect(b.arbiters.length).toBe(0);
    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(b.arbiters.length).toBe(1);
    expect(floor.arbiters.length).toBe(2); // both balls rest on it
    const arb = b.arbiters.at(0);
    expect(arb.isCollisionArbiter()).toBe(true);
    expect([arb.body1, arb.body2]).toContain(b);
    expect(far.arbiters.length).toBe(1);
    expect(() => b.arbiters.pop()).toThrow(/immutable/);
  });

  it("empties again once the bodies separate", () => {
    const space = new Space(new Vec2(0, 600));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(400, 20)));
    space.bodies.add(floor);
    const b = ball(space, 0, 25);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(b.arbiters.length).toBe(1);

    b.position = new Vec2(0, -500);
    b.velocity = new Vec2(0, 0);
    space.gravity = new Vec2(0, 0);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(b.arbiters.length).toBe(0);
    expect(floor.arbiters.length).toBe(0);
  });
});

describe("Body.type changes inside a Space", () => {
  it("switching a moving body to STATIC zeroes its velocities", () => {
    const space = new Space();
    const b = ball(space, 0);
    b.velocity = new Vec2(10, 5);
    b.angularVel = 2;
    space.step(1 / 60);

    b.type = BodyType.STATIC;

    expect(b.type).toBe(BodyType.STATIC);
    expect(b.velocity.x).toBe(0);
    expect(b.velocity.y).toBe(0);
    expect(b.angularVel).toBe(0);
    expect(b.isStatic()).toBe(true);
    space.step(1 / 60);
    expect(b.position.x).toBeCloseTo(10 / 60, 3);
  });

  it("switching STATIC -> DYNAMIC inside a Space lets gravity act", () => {
    const space = new Space(new Vec2(0, 100));
    const b = ball(space, 0, 0, BodyType.STATIC);
    for (let i = 0; i < 5; i++) space.step(1 / 60);
    expect(b.position.y).toBe(0);

    b.type = BodyType.DYNAMIC;
    for (let i = 0; i < 5; i++) space.step(1 / 60);
    expect(b.position.y).toBeGreaterThan(0);
  });

  it("rejects a null type", () => {
    const b = ball(null, 0);
    expect(() => {
      b.type = null as unknown as BodyType;
    }).toThrow();
  });
});
