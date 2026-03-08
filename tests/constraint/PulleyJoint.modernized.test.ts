import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";

describe("PulleyJoint (modernized)", () => {
  function makeJoint(opts?: {
    bodies?: boolean;
    min?: number;
    max?: number;
    ratio?: number;
  }) {
    const b = opts?.bodies !== false;
    const body1 = b ? new Body(BodyType.STATIC, new Vec2(0, 0)) : null;
    const body2 = b ? new Body(BodyType.DYNAMIC, new Vec2(0, 50)) : null;
    const body3 = b ? new Body(BodyType.STATIC, new Vec2(100, 0)) : null;
    const body4 = b ? new Body(BodyType.DYNAMIC, new Vec2(100, 50)) : null;
    return new PulleyJoint(
      body1,
      body2,
      body3,
      body4,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      opts?.min ?? 50,
      opts?.max ?? 150,
      opts?.ratio ?? 1.0,
    );
  }

  // ---------------------------------------------------------------------------
  // Constructor validation
  // ---------------------------------------------------------------------------

  it("should reject NaN jointMin", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
        NaN, 100,
      ),
    ).toThrow("NaN");
  });

  it("should reject negative jointMin", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
        -1, 100,
      ),
    ).toThrow(">= 0");
  });

  it("should reject NaN jointMax", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
        0, NaN,
      ),
    ).toThrow("NaN");
  });

  it("should reject negative jointMax", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
        0, -5,
      ),
    ).toThrow(">= 0");
  });

  it("should reject null anchor1", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        null as any, new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
        0, 100,
      ),
    ).toThrow("anchor1 cannot be null");
  });

  it("should reject null anchor2", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        new Vec2(0, 0), null as any, new Vec2(0, 0), new Vec2(0, 0),
        0, 100,
      ),
    ).toThrow("anchor2 cannot be null");
  });

  it("should reject null anchor3", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        new Vec2(0, 0), new Vec2(0, 0), null as any, new Vec2(0, 0),
        0, 100,
      ),
    ).toThrow("anchor3 cannot be null");
  });

  it("should reject null anchor4", () => {
    expect(() =>
      new PulleyJoint(
        null, null, null, null,
        new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), null as any,
        0, 100,
      ),
    ).toThrow("anchor4 cannot be null");
  });

  // ---------------------------------------------------------------------------
  // Body accessors
  // ---------------------------------------------------------------------------

  it("should get/set body1", () => {
    const joint = makeJoint({ bodies: false });
    expect(joint.body1).toBeNull();
    const b = new Body(BodyType.DYNAMIC);
    joint.body1 = b;
    expect(joint.body1).toBeDefined();
  });

  it("should get/set body2", () => {
    const joint = makeJoint({ bodies: false });
    expect(joint.body2).toBeNull();
    const b = new Body(BodyType.DYNAMIC);
    joint.body2 = b;
    expect(joint.body2).toBeDefined();
  });

  it("should get/set body3", () => {
    const joint = makeJoint({ bodies: false });
    expect(joint.body3).toBeNull();
    const b = new Body(BodyType.DYNAMIC);
    joint.body3 = b;
    expect(joint.body3).toBeDefined();
  });

  it("should get/set body4", () => {
    const joint = makeJoint({ bodies: false });
    expect(joint.body4).toBeNull();
    const b = new Body(BodyType.DYNAMIC);
    joint.body4 = b;
    expect(joint.body4).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Anchor accessors
  // ---------------------------------------------------------------------------

  it("should get/set anchor1", () => {
    const joint = makeJoint();
    expect(joint.anchor1.x).toBeCloseTo(0);
    joint.anchor1 = new Vec2(10, 20);
    expect(joint.anchor1.x).toBeCloseTo(10);
    expect(joint.anchor1.y).toBeCloseTo(20);
  });

  it("should get/set anchor2", () => {
    const joint = makeJoint();
    joint.anchor2 = new Vec2(30, 40);
    expect(joint.anchor2.x).toBeCloseTo(30);
    expect(joint.anchor2.y).toBeCloseTo(40);
  });

  it("should get/set anchor3", () => {
    const joint = makeJoint();
    joint.anchor3 = new Vec2(50, 60);
    expect(joint.anchor3.x).toBeCloseTo(50);
    expect(joint.anchor3.y).toBeCloseTo(60);
  });

  it("should get/set anchor4", () => {
    const joint = makeJoint();
    joint.anchor4 = new Vec2(70, 80);
    expect(joint.anchor4.x).toBeCloseTo(70);
    expect(joint.anchor4.y).toBeCloseTo(80);
  });

  // ---------------------------------------------------------------------------
  // Scalar properties
  // ---------------------------------------------------------------------------

  it("should get/set jointMin with validation", () => {
    const joint = makeJoint();
    joint.jointMin = 25;
    expect(joint.jointMin).toBeCloseTo(25);
    expect(() => { joint.jointMin = NaN; }).toThrow("NaN");
    expect(() => { joint.jointMin = -1; }).toThrow(">= 0");
  });

  it("should get/set jointMax with validation", () => {
    const joint = makeJoint();
    joint.jointMax = 200;
    expect(joint.jointMax).toBeCloseTo(200);
    expect(() => { joint.jointMax = NaN; }).toThrow("NaN");
    expect(() => { joint.jointMax = -1; }).toThrow(">= 0");
  });

  it("should get/set ratio", () => {
    const joint = makeJoint();
    joint.ratio = 2.5;
    expect(joint.ratio).toBeCloseTo(2.5);
  });

  it("should reject NaN ratio", () => {
    const joint = makeJoint();
    expect(() => { joint.ratio = NaN; }).toThrow("NaN");
  });

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  it("should compute impulse", () => {
    const joint = makeJoint();
    const imp = joint.impulse();
    expect(imp).toBeDefined();
  });

  it("should compute bodyImpulse", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b2.shapes.add(new Circle(5));
    b2.space = space;
    const b3 = new Body(BodyType.STATIC, new Vec2(100, 0));
    b3.shapes.add(new Circle(5));
    b3.space = space;
    const b4 = new Body(BodyType.DYNAMIC, new Vec2(100, 50));
    b4.shapes.add(new Circle(5));
    b4.space = space;

    const joint = new PulleyJoint(
      b1, b2, b3, b4,
      new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
      50, 150, 1.0,
    );
    joint.space = space;

    const imp = joint.bodyImpulse(b2);
    expect(imp).toBeDefined();
  });

  it("should throw bodyImpulse for unlinked body", () => {
    const joint = makeJoint();
    const unrelated = new Body(BodyType.DYNAMIC);
    expect(() => joint.bodyImpulse(unrelated)).toThrow("not linked");
  });

  it("should visit all bodies", () => {
    const joint = makeJoint();
    const visited: Body[] = [];
    joint.visitBodies((b) => visited.push(b));
    expect(visited.length).toBe(4);
  });

  it("visitBodies should skip null bodies", () => {
    const joint = makeJoint({ bodies: false });
    const visited: Body[] = [];
    joint.visitBodies((b) => visited.push(b));
    expect(visited.length).toBe(0);
  });

  it("visitBodies should deduplicate shared bodies", () => {
    const shared = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const joint = new PulleyJoint(
      shared, shared, shared, shared,
      new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
      0, 100, 1.0,
    );
    const visited: Body[] = [];
    joint.visitBodies((b) => visited.push(b));
    // Should only visit the shared body once
    expect(visited.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Constraint base properties
  // ---------------------------------------------------------------------------

  it("should default to stiff=true", () => {
    const joint = makeJoint();
    expect(joint.stiff).toBe(true);
  });

  it("should support active toggle", () => {
    const joint = makeJoint();
    expect(joint.active).toBe(true);
    joint.active = false;
    expect(joint.active).toBe(false);
  });

  it("should support maxForce", () => {
    const joint = makeJoint();
    joint.maxForce = 500;
    expect(joint.maxForce).toBeCloseTo(500);
  });

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  it("should participate in simulation without errors", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b2.shapes.add(new Circle(5));
    b2.space = space;
    const b3 = new Body(BodyType.STATIC, new Vec2(100, 0));
    b3.shapes.add(new Circle(5));
    b3.space = space;
    const b4 = new Body(BodyType.DYNAMIC, new Vec2(100, 50));
    b4.shapes.add(new Circle(5));
    b4.space = space;

    const joint = new PulleyJoint(
      b1, b2, b3, b4,
      new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0), new Vec2(0, 0),
      50, 150, 1.0,
    );
    joint.space = space;

    // Should step without throwing
    for (let i = 0; i < 30; i++) {
      space.step(1 / 60, 10, 10);
    }
    expect(b2.position.y).toBeGreaterThan(0);
  });
});
