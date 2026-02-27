import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { WeldJoint } from "../../src/constraint/WeldJoint";

describe("WeldJoint", () => {
  it("should create a weld joint with specified parameters", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));

    const joint = new WeldJoint(
      body1,
      body2,
      new Vec2(10, 0),
      new Vec2(-10, 0),
      Math.PI / 2,
    );

    expect(joint.body1).toBeDefined();
    expect(joint.body2).toBeDefined();
    expect(joint.phase).toBeCloseTo(Math.PI / 2);
  });

  it("should create a weld joint with null bodies and default phase", () => {
    const joint = new WeldJoint(
      null,
      null,
      new Vec2(5, 10),
      new Vec2(15, 20),
    );

    expect(joint.anchor1.x).toBeCloseTo(5);
    expect(joint.anchor1.y).toBeCloseTo(10);
    expect(joint.anchor2.x).toBeCloseTo(15);
    expect(joint.anchor2.y).toBeCloseTo(20);
    expect(joint.phase).toBeCloseTo(0.0);
  });

  it("should get and set anchors and phase", () => {
    const joint = new WeldJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
      0,
    );

    joint.phase = 1.5;
    expect(joint.phase).toBeCloseTo(1.5);
  });

  it("should support stiff and soft modes", () => {
    const joint = new WeldJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
    );

    expect(joint.stiff).toBe(true);
    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 30;
    expect(joint.frequency).toBeCloseTo(30);

    joint.damping = 0.9;
    expect(joint.damping).toBeCloseTo(0.9);
  });

  it("should support base constraint properties", () => {
    const joint = new WeldJoint(
      null,
      null,
      new Vec2(0, 0),
      new Vec2(0, 0),
    );

    expect(joint.active).toBe(true);
    joint.active = false;
    expect(joint.active).toBe(false);

    joint.active = true;
    joint.maxForce = 200;
    expect(joint.maxForce).toBeCloseTo(200);

    joint.maxError = 5;
    expect(joint.maxError).toBeCloseTo(5);

    joint.ignore = true;
    expect(joint.ignore).toBe(true);
  });

  it("should weld bodies together during simulation", () => {
    const space = new Space(new Vec2(0, 100));

    const fixed = new Body(BodyType.STATIC, new Vec2(100, 0));
    fixed.shapes.add(new Circle(5));
    fixed.space = space;

    const welded = new Body(BodyType.DYNAMIC, new Vec2(120, 0));
    welded.shapes.add(new Circle(5));
    welded.space = space;

    // Weld the two bodies at their respective anchors with zero phase
    const joint = new WeldJoint(
      fixed,
      welded,
      new Vec2(20, 0),
      new Vec2(0, 0),
      0,
    );
    joint.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    // The welded body should stay close to its constrained position
    // relative to the fixed body (anchor1 in world space = 100+20 = 120)
    const dx = welded.position.x - 120;
    const dy = welded.position.y - 0;
    const drift = Math.sqrt(dx * dx + dy * dy);
    expect(drift).toBeLessThan(20);
  });
});
