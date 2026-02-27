import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";

describe("PulleyJoint", () => {
  it("should create a pulley joint with specified parameters", () => {
    const body1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    const body3 = new Body(BodyType.STATIC, new Vec2(100, 0));
    const body4 = new Body(BodyType.DYNAMIC, new Vec2(100, 50));

    const joint = new PulleyJoint(
      body1,
      body2,
      body3,
      body4,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      80,
      120,
      1.0,
    );

    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
    expect(joint.body3).toBeDefined();
    expect(joint.body4).toBeDefined();
    expect(joint.jointMin).toBeCloseTo(80);
    expect(joint.jointMax).toBeCloseTo(120);
    expect(joint.ratio).toBeCloseTo(1.0);
  });

  it("should create a pulley joint with null bodies and default ratio", () => {
    const joint = new PulleyJoint(
      null,
      null,
      null,
      null,
      new Vec2(1, 2),
      new Vec2(3, 4),
      new Vec2(5, 6),
      new Vec2(7, 8),
      50,
      200,
    );

    expect(joint.anchor1.x).toBeCloseTo(1);
    expect(joint.anchor1.y).toBeCloseTo(2);
    expect(joint.anchor2.x).toBeCloseTo(3);
    expect(joint.anchor2.y).toBeCloseTo(4);
    expect(joint.anchor3.x).toBeCloseTo(5);
    expect(joint.anchor3.y).toBeCloseTo(6);
    expect(joint.anchor4.x).toBeCloseTo(7);
    expect(joint.anchor4.y).toBeCloseTo(8);
    expect(joint.jointMin).toBeCloseTo(50);
    expect(joint.jointMax).toBeCloseTo(200);
    expect(joint.ratio).toBeCloseTo(1.0);
  });

  it("should get and set joint limits and ratio", () => {
    const joint = new PulleyJoint(
      null,
      null,
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      10,
      100,
      1.0,
    );

    joint.jointMin = 30;
    joint.jointMax = 150;
    joint.ratio = 2.0;

    expect(joint.jointMin).toBeCloseTo(30);
    expect(joint.jointMax).toBeCloseTo(150);
    expect(joint.ratio).toBeCloseTo(2.0);
  });

  it("should support stiff and soft modes", () => {
    const joint = new PulleyJoint(
      null,
      null,
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      0,
      100,
    );

    expect(joint.stiff).toBe(true);
    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 8;
    expect(joint.frequency).toBeCloseTo(8);

    joint.damping = 0.7;
    expect(joint.damping).toBeCloseTo(0.7);
  });

  it("should support base constraint properties", () => {
    const joint = new PulleyJoint(
      null,
      null,
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      0,
      100,
    );

    expect(joint.active).toBe(true);
    joint.active = false;
    expect(joint.active).toBe(false);

    joint.active = true;
    joint.maxForce = 400;
    expect(joint.maxForce).toBeCloseTo(400);

    joint.maxError = 12;
    expect(joint.maxError).toBeCloseTo(12);

    joint.breakUnderForce = true;
    expect(joint.breakUnderForce).toBe(true);

    joint.removeOnBreak = true;
    expect(joint.removeOnBreak).toBe(true);
  });

  it("should constrain sum of distances during simulation", () => {
    const space = new Space(new Vec2(0, 100));

    // Two fixed pulleys at the top
    const pulleyLeft = new Body(BodyType.STATIC, new Vec2(0, 0));
    pulleyLeft.shapes.add(new Circle(5));
    pulleyLeft.space = space;

    const pulleyRight = new Body(BodyType.STATIC, new Vec2(100, 0));
    pulleyRight.shapes.add(new Circle(5));
    pulleyRight.space = space;

    // Two hanging bodies
    const hangLeft = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    hangLeft.shapes.add(new Circle(5));
    hangLeft.space = space;

    const hangRight = new Body(BodyType.DYNAMIC, new Vec2(100, 30));
    hangRight.shapes.add(new Circle(5));
    hangRight.space = space;

    // Total rope length constrained between 70 and 90
    const joint = new PulleyJoint(
      pulleyLeft,
      hangLeft,
      pulleyRight,
      hangRight,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      70,
      90,
      1.0,
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    // Both hanging bodies should have moved under gravity but be
    // constrained by the pulley relationship
    const dist1 = Math.sqrt(
      Math.pow(hangLeft.position.x - pulleyLeft.position.x, 2) +
        Math.pow(hangLeft.position.y - pulleyLeft.position.y, 2),
    );
    const dist2 = Math.sqrt(
      Math.pow(hangRight.position.x - pulleyRight.position.x, 2) +
        Math.pow(hangRight.position.y - pulleyRight.position.y, 2),
    );
    const totalDist = dist1 + dist2;

    // The total distance should be near the constraint range
    expect(totalDist).toBeGreaterThan(50);
    expect(totalDist).toBeLessThan(120);
  });
});
