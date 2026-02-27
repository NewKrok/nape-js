import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { MotorJoint } from "../../src/constraint/MotorJoint";

describe("MotorJoint", () => {
  it("should create a motor joint with specified parameters", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));

    const joint = new MotorJoint(body1, body2, 3.0, 2.0);

    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
    expect(joint.rate).toBeCloseTo(3.0);
    expect(joint.ratio).toBeCloseTo(2.0);
  });

  it("should create a motor joint with null bodies and default ratio", () => {
    const joint = new MotorJoint(null, null, 5.0);

    expect(joint.rate).toBeCloseTo(5.0);
    expect(joint.ratio).toBeCloseTo(1.0);
  });

  it("should get and set rate and ratio", () => {
    const joint = new MotorJoint(null, null, 1.0, 1.0);

    joint.rate = 10.0;
    expect(joint.rate).toBeCloseTo(10.0);

    joint.ratio = 0.5;
    expect(joint.ratio).toBeCloseTo(0.5);
  });

  it("should support stiff and soft modes", () => {
    const joint = new MotorJoint(null, null, 1.0);

    expect(joint.stiff).toBe(true);
    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 25;
    expect(joint.frequency).toBeCloseTo(25);

    joint.damping = 0.6;
    expect(joint.damping).toBeCloseTo(0.6);
  });

  it("should support base constraint properties", () => {
    const joint = new MotorJoint(null, null, 1.0);

    expect(joint.active).toBe(true);
    joint.active = false;
    expect(joint.active).toBe(false);

    joint.active = true;
    joint.maxForce = 750;
    expect(joint.maxForce).toBeCloseTo(750);

    joint.breakUnderForce = true;
    expect(joint.breakUnderForce).toBe(true);

    joint.removeOnBreak = true;
    expect(joint.removeOnBreak).toBe(true);
  });

  it("should apply angular velocity during simulation", () => {
    const space = new Space(new Vec2(0, 0));

    const fixed = new Body(BodyType.STATIC, new Vec2(0, 0));
    fixed.shapes.add(new Circle(5));
    fixed.space = space;

    const spinner = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    spinner.shapes.add(new Circle(20));
    spinner.space = space;

    const initialRotation = spinner.rotation;

    // Apply a motor rate to spin the body
    const joint = new MotorJoint(fixed, spinner, 5.0, 1.0);
    joint.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    // The spinner should have rotated from the motor torque
    expect(Math.abs(spinner.rotation - initialRotation)).toBeGreaterThan(0.1);
  });
});
