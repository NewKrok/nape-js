import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { LineJoint } from "../../src/constraint/LineJoint";

describe("LineJoint", () => {
  it("should create a line joint with specified parameters", () => {
    const body1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));

    const joint = new LineJoint(
      body1,
      body2,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -100,
      100,
    );

    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
    expect(joint.jointMin).toBeCloseTo(-100);
    expect(joint.jointMax).toBeCloseTo(100);
  });

  it("should create a line joint with null bodies", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(5, 10),
      new Vec2(15, 20),
      new Vec2(0, 1),
      -50,
      50,
    );

    expect(joint.anchor1.x).toBeCloseTo(5);
    expect(joint.anchor1.y).toBeCloseTo(10);
    expect(joint.anchor2.x).toBeCloseTo(15);
    expect(joint.anchor2.y).toBeCloseTo(20);
    expect(joint.direction.x).toBeCloseTo(0);
    expect(joint.direction.y).toBeCloseTo(1);
    expect(joint.jointMin).toBeCloseTo(-50);
    expect(joint.jointMax).toBeCloseTo(50);
  });

  it("should get and set direction and limits", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );

    joint.jointMin = -200;
    joint.jointMax = 200;
    expect(joint.jointMin).toBeCloseTo(-200);
    expect(joint.jointMax).toBeCloseTo(200);

    joint.direction = new Vec2(0, 1);
    expect(joint.direction.y).toBeCloseTo(1);
  });

  it("should support stiff and soft modes", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );

    expect(joint.stiff).toBe(true);
    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 12;
    expect(joint.frequency).toBeCloseTo(12);

    joint.damping = 0.4;
    expect(joint.damping).toBeCloseTo(0.4);
  });

  it("should support base constraint properties", () => {
    const joint = new LineJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );

    expect(joint.active).toBe(true);
    joint.active = false;
    expect(joint.active).toBe(false);

    joint.active = true;
    joint.maxForce = 300;
    expect(joint.maxForce).toBeCloseTo(300);

    joint.maxError = 8;
    expect(joint.maxError).toBeCloseTo(8);

    joint.breakUnderError = true;
    expect(joint.breakUnderError).toBe(true);
  });

  it("should constrain body to slide along a line during simulation", () => {
    const space = new Space(new Vec2(0, 100));

    const rail = new Body(BodyType.STATIC, new Vec2(0, 0));
    rail.shapes.add(new Circle(5));
    rail.space = space;

    const slider = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    slider.shapes.add(new Circle(5));
    slider.space = space;

    // Constrain slider to move along the vertical axis (direction = (0,1))
    const joint = new LineJoint(
      rail,
      slider,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 1),
      -200,
      200,
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    // The slider should remain close to x=0 since it's constrained to the vertical line
    expect(Math.abs(slider.position.x)).toBeLessThan(15);
  });
});
