import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { AngleJoint } from "../../src/constraint/AngleJoint";

describe("AngleJoint", () => {
  it("should create an angle joint with specified parameters", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));

    const joint = new AngleJoint(body1, body2, -Math.PI / 4, Math.PI / 4, 1.0);

    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
    expect(joint.jointMin).toBeCloseTo(-Math.PI / 4);
    expect(joint.jointMax).toBeCloseTo(Math.PI / 4);
    expect(joint.ratio).toBeCloseTo(1.0);
  });

  it("should create an angle joint with null bodies and default ratio", () => {
    const joint = new AngleJoint(null, null, -1.0, 1.0);

    expect(joint.jointMin).toBeCloseTo(-1.0);
    expect(joint.jointMax).toBeCloseTo(1.0);
    expect(joint.ratio).toBeCloseTo(1.0);
  });

  it("should get and set joint limits and ratio", () => {
    const joint = new AngleJoint(null, null, -0.5, 0.5, 1.0);

    joint.jointMin = -Math.PI;
    joint.jointMax = Math.PI;
    joint.ratio = 2.0;

    expect(joint.jointMin).toBeCloseTo(-Math.PI);
    expect(joint.jointMax).toBeCloseTo(Math.PI);
    expect(joint.ratio).toBeCloseTo(2.0);
  });

  it("should support stiff and soft modes", () => {
    const joint = new AngleJoint(null, null, -1, 1);

    expect(joint.stiff).toBe(true);
    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 10;
    expect(joint.frequency).toBeCloseTo(10);

    joint.damping = 0.3;
    expect(joint.damping).toBeCloseTo(0.3);
  });

  it("should support base constraint properties", () => {
    const joint = new AngleJoint(null, null, -1, 1);

    expect(joint.active).toBe(true);
    joint.active = false;
    expect(joint.active).toBe(false);

    joint.active = true;
    joint.maxForce = 1000;
    expect(joint.maxForce).toBeCloseTo(1000);

    joint.breakUnderError = true;
    expect(joint.breakUnderError).toBe(true);

    joint.removeOnBreak = true;
    expect(joint.removeOnBreak).toBe(true);
  });

  it("should constrain relative angle between bodies during simulation", () => {
    const space = new Space(new Vec2(0, 100));

    const fixed = new Body(BodyType.STATIC, new Vec2(0, 0));
    fixed.shapes.add(new Circle(5));
    fixed.space = space;

    const spinning = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    spinning.shapes.add(new Circle(10));
    spinning.space = space;

    // Lock the angle between -0.1 and 0.1 radians (nearly fixed)
    const joint = new AngleJoint(fixed, spinning, -0.1, 0.1, 1.0);
    joint.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    // The spinning body's rotation should stay within a small range
    const angle = spinning.rotation;
    expect(Math.abs(angle)).toBeLessThan(1.0);
  });
});
