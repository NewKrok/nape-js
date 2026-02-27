import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";

describe("DistanceJoint", () => {
  it("should create a distance joint with specified parameters", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(100, 0));

    const joint = new DistanceJoint(
      body1,
      body2,
      new Vec2(0, 0),
      new Vec2(0, 0),
      50,
      150,
    );

    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
    expect(joint.jointMin).toBeCloseTo(50);
    expect(joint.jointMax).toBeCloseTo(150);
  });

  it("should create a distance joint with null bodies", () => {
    const joint = new DistanceJoint(
      null,
      null,
      new Vec2(5, 10),
      new Vec2(15, 20),
      0,
      100,
    );

    expect(joint.anchor1.x).toBeCloseTo(5);
    expect(joint.anchor1.y).toBeCloseTo(10);
    expect(joint.anchor2.x).toBeCloseTo(15);
    expect(joint.anchor2.y).toBeCloseTo(20);
    expect(joint.jointMin).toBeCloseTo(0);
    expect(joint.jointMax).toBeCloseTo(100);
  });

  it("should get and set joint limits", () => {
    const joint = new DistanceJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      10,
      50,
    );

    expect(joint.jointMin).toBeCloseTo(10);
    expect(joint.jointMax).toBeCloseTo(50);

    joint.jointMin = 20;
    joint.jointMax = 80;

    expect(joint.jointMin).toBeCloseTo(20);
    expect(joint.jointMax).toBeCloseTo(80);
  });

  it("should support stiff and soft modes", () => {
    const joint = new DistanceJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      0,
      100,
    );

    expect(joint.stiff).toBe(true);
    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 15;
    expect(joint.frequency).toBeCloseTo(15);

    joint.damping = 0.8;
    expect(joint.damping).toBeCloseTo(0.8);
  });

  it("should support base constraint properties", () => {
    const joint = new DistanceJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      0,
      100,
    );

    expect(joint.active).toBe(true);
    joint.active = false;
    expect(joint.active).toBe(false);

    joint.active = true;
    joint.maxForce = 500;
    expect(joint.maxForce).toBeCloseTo(500);

    joint.maxError = 10;
    expect(joint.maxError).toBeCloseTo(10);

    joint.breakUnderForce = true;
    expect(joint.breakUnderForce).toBe(true);

    joint.removeOnBreak = true;
    expect(joint.removeOnBreak).toBe(true);
  });

  it("should constrain distance between bodies during simulation", () => {
    const space = new Space(new Vec2(0, 100));

    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const bob = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    bob.shapes.add(new Circle(5));
    bob.space = space;

    // Constrain distance between 40 and 60 units
    const joint = new DistanceJoint(
      anchor,
      bob,
      new Vec2(0, 0),
      new Vec2(0, 0),
      40,
      60,
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    // The bob should remain within the distance limits from the anchor
    const dx = bob.position.x - anchor.position.x;
    const dy = bob.position.y - anchor.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(35);
    expect(dist).toBeLessThan(65);
  });
});
