import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { PivotJoint } from "../../src/constraint/PivotJoint";

describe("PivotJoint", () => {
  it("should create a pivot joint between two bodies", () => {
    const space = new Space(new Vec2(0, 100));

    const body1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    body1.shapes.add(new Circle(5));
    body1.space = space;

    const body2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    body2.shapes.add(new Circle(5));
    body2.space = space;

    const joint = new PivotJoint(body1, body2, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
  });

  it("should constrain bodies during simulation", () => {
    const space = new Space(new Vec2(0, 100));

    const anchor = new Body(BodyType.STATIC, new Vec2(100, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const bob = new Body(BodyType.DYNAMIC, new Vec2(150, 0));
    bob.shapes.add(new Circle(10));
    bob.space = space;

    // Anchor at (0,0) on body1, anchor at (0,0) on body2
    // This constrains the two bodies to overlap at their origins
    const joint = new PivotJoint(anchor, bob, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    // Step simulation
    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    // With a pivot at (0,0)–(0,0), the bob should be pulled towards the anchor
    const dx = bob.position.x - anchor.position.x;
    const dy = bob.position.y - anchor.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeLessThan(15);
  });

  it("should support stiff and soft modes", () => {
    const joint = new PivotJoint(null, null, new Vec2(0, 0), new Vec2(0, 0));

    expect(joint.stiff).toBe(true);
    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 20;
    expect(joint.frequency).toBeCloseTo(20);

    joint.damping = 0.5;
    expect(joint.damping).toBeCloseTo(0.5);
  });

  it("should get/set anchors", () => {
    const joint = new PivotJoint(null, null, new Vec2(10, 20), new Vec2(30, 40));

    expect(joint.anchor1.x).toBeCloseTo(10);
    expect(joint.anchor1.y).toBeCloseTo(20);
    expect(joint.anchor2.x).toBeCloseTo(30);
    expect(joint.anchor2.y).toBeCloseTo(40);
  });
});
