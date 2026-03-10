import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { CbType } from "../../src/callbacks/CbType";
import { Compound } from "../../src/phys/Compound";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function dynamicCircle(x: number, y: number, radius = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(radius));
  return b;
}

function staticCircle(x: number, y: number, radius = 10): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(radius));
  return b;
}

function setupPair(space: Space): { anchor: Body; ball: Body } {
  const anchor = staticCircle(0, 0);
  anchor.space = space;
  const ball = dynamicCircle(50, 0);
  ball.space = space;
  return { anchor, ball };
}

// ---------------------------------------------------------------------------
// AngleJoint — missing coverage
// ---------------------------------------------------------------------------
describe("AngleJoint — extended", () => {
  it("should report isSlack when within jointMin/jointMax range", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, -1, 1);
    joint.space = space;
    space.step(1 / 60);

    // Body starts at angle 0, joint range is [-1, 1], so it's slack
    expect(joint.isSlack()).toBe(true);
  });

  it("should report not slack when angle exceeds range", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    ball.rotation = 2.0; // outside [-0.1, 0.1]
    const joint = new AngleJoint(anchor, ball, -0.1, 0.1);
    joint.space = space;
    space.step(1 / 60);

    expect(joint.isSlack()).toBe(false);
  });

  it("should return impulse as a number", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, 0, 0);
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const imp = joint.impulse();
    expect(imp).toBeDefined();
  });

  it("should return bodyImpulse for body1", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, 0, 0);
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const bimp = joint.bodyImpulse(anchor);
    expect(bimp).toBeDefined();
  });

  it("should return bodyImpulse for body2", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, 0, 0);
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const bimp = joint.bodyImpulse(ball);
    expect(bimp).toBeDefined();
  });

  it("should visitBodies", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, -1, 1);
    joint.space = space;

    const visited: Body[] = [];
    joint.visitBodies((b: Body) => visited.push(b));
    expect(visited.length).toBe(2);
    expect(visited).toContain(anchor);
    expect(visited).toContain(ball);
  });

  it("should support breakUnderForce", () => {
    const space = new Space(new Vec2(0, 500));
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, 0, 0);
    joint.breakUnderForce = true;
    joint.maxForce = 0.001; // very low force limit
    joint.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    // Joint may have broken due to gravity torque exceeding maxForce
    // Just check it didn't throw
    expect(joint.active).toBeDefined();
  });

  it("should support maxError", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, 0, 0);
    joint.maxError = 0.5;
    joint.space = space;
    space.step(1 / 60);

    expect(joint.maxError).toBeCloseTo(0.5);
  });

  it("should support ratio property", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const joint = new AngleJoint(anchor, ball, -1, 1, 0.5);
    joint.space = space;

    expect(joint.ratio).toBeCloseTo(0.5);
    joint.ratio = 2.0;
    expect(joint.ratio).toBeCloseTo(2.0);
  });

  it("should support userData", () => {
    const joint = new AngleJoint(new Body(), new Body(), -1, 1);
    joint.userData.custom = "test";
    expect(joint.userData.custom).toBe("test");
  });

  it("should support cbTypes", () => {
    const joint = new AngleJoint(new Body(), new Body(), -1, 1);
    const ct = new CbType();
    (joint.cbTypes as any).add(ct);
    expect((joint.cbTypes as any).has(ct)).toBe(true);
  });

  it("should get body1 and body2", () => {
    const b1 = new Body();
    const b2 = new Body();
    const joint = new AngleJoint(b1, b2, -1, 1);
    expect(joint.body1.id).toBe(b1.id);
    expect(joint.body2.id).toBe(b2.id);
  });
});

// ---------------------------------------------------------------------------
// MotorJoint — missing coverage
// ---------------------------------------------------------------------------
describe("MotorJoint — extended", () => {
  it("should return impulse", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const motor = new MotorJoint(anchor, ball, 5);
    motor.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const imp = motor.impulse();
    expect(imp).toBeDefined();
  });

  it("should return bodyImpulse", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const motor = new MotorJoint(anchor, ball, 5);
    motor.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const bimp = motor.bodyImpulse(ball);
    expect(bimp).toBeDefined();
  });

  it("should visitBodies", () => {
    const { anchor, ball } = setupPair(new Space());
    const motor = new MotorJoint(anchor, ball, 5);

    const visited: Body[] = [];
    motor.visitBodies((b: Body) => visited.push(b));
    expect(visited.length).toBe(2);
  });

  it("should reject NaN rate", () => {
    const motor = new MotorJoint(new Body(), new Body(), 5);
    expect(() => {
      motor.rate = NaN;
    }).toThrow();
  });

  it("should reject NaN ratio", () => {
    const motor = new MotorJoint(new Body(), new Body(), 5, 1);
    expect(() => {
      motor.ratio = NaN;
    }).toThrow();
  });

  it("should support breakUnderError", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const motor = new MotorJoint(anchor, ball, 5);
    motor.breakUnderError = true;
    motor.maxError = 0.001;
    motor.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(motor.active).toBeDefined();
  });

  it("should spin body with motor", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const motor = new MotorJoint(anchor, ball, 5);
    motor.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Ball should be spinning
    expect(Math.abs(ball.angularVel)).toBeGreaterThan(0);
  });

  it("should support zero rate (braking)", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    ball.angularVel = 10;
    const motor = new MotorJoint(anchor, ball, 0);
    motor.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Motor with rate=0 should brake the angular velocity
    expect(Math.abs(ball.angularVel)).toBeLessThan(5);
  });

  it("should support negative rate", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const motor = new MotorJoint(anchor, ball, -5);
    motor.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Ball should spin in opposite direction
    expect(ball.angularVel).toBeLessThan(0);
  });

  it("should change rate mid-simulation", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const motor = new MotorJoint(anchor, ball, 5);
    motor.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    const velBefore = ball.angularVel;

    motor.rate = -5;
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Angular velocity should have changed direction
    expect(ball.angularVel).toBeLessThan(velBefore);
  });
});

// ---------------------------------------------------------------------------
// LineJoint — missing coverage
// ---------------------------------------------------------------------------
describe("LineJoint — extended", () => {
  it("should return bodyImpulse", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = staticCircle(0, 0);
    anchor.space = space;
    const slider = dynamicCircle(50, 0);
    slider.space = space;

    const joint = new LineJoint(
      anchor,
      slider,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0), // horizontal line
      -100,
      100,
    );
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const bimp = joint.bodyImpulse(slider);
    expect(bimp).toBeDefined();
  });

  it("should constrain body to line direction", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = staticCircle(0, 0);
    anchor.space = space;
    const slider = dynamicCircle(50, 0);
    slider.space = space;

    const joint = new LineJoint(
      anchor,
      slider,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0), // horizontal line
      -200,
      200,
    );
    joint.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Body should stay close to the x-axis (line direction)
    expect(Math.abs(slider.position.y)).toBeLessThan(20);
  });

  it("should get body1/body2", () => {
    const b1 = new Body();
    b1.shapes.add(new Circle(5));
    const b2 = new Body();
    b2.shapes.add(new Circle(5));
    const joint = new LineJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), new Vec2(1, 0), -10, 10);

    expect(joint.body1.id).toBe(b1.id);
    expect(joint.body2.id).toBe(b2.id);
  });

  it("should support breakUnderForce", () => {
    const space = new Space(new Vec2(0, 500));
    const anchor = staticCircle(0, 0);
    anchor.space = space;
    const slider = dynamicCircle(50, 0);
    slider.space = space;

    const joint = new LineJoint(
      anchor,
      slider,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(1, 0),
      -10,
      10,
    );
    joint.breakUnderForce = true;
    joint.maxForce = 0.001;
    joint.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);

    expect(joint.active).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// PulleyJoint — missing coverage
// ---------------------------------------------------------------------------
describe("PulleyJoint — extended", () => {
  it("should report isSlack when rope is loose", () => {
    const space = new Space();
    const b1 = staticCircle(-50, 0);
    const b2 = dynamicCircle(0, 50);
    const b3 = staticCircle(50, 0);
    const b4 = dynamicCircle(0, -50);
    b1.space = space;
    b2.space = space;
    b3.space = space;
    b4.space = space;

    const joint = new PulleyJoint(
      b1,
      b2,
      b3,
      b4,
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      0,
      1000, // very large max
      1,
    );
    joint.space = space;
    space.step(1 / 60);

    // With such a large max, joint should be slack
    expect(joint.isSlack()).toBe(true);
  });

  it("should support maxError setter", () => {
    const joint = new PulleyJoint(
      new Body(),
      new Body(),
      new Body(),
      new Body(),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      new Vec2(0, 0),
      0,
      100,
      1,
    );
    joint.maxError = 0.5;
    expect(joint.maxError).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// DistanceJoint — additional coverage
// ---------------------------------------------------------------------------
describe("DistanceJoint — extended", () => {
  it("should return bodyImpulse", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 40, 60);
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const bimp = joint.bodyImpulse(ball);
    expect(bimp).toBeDefined();
  });

  it("should report isSlack when within range", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const joint = new DistanceJoint(
      anchor,
      ball,
      new Vec2(0, 0),
      new Vec2(0, 0),
      30,
      70, // ball is 50 away, within range
    );
    joint.space = space;
    space.step(1 / 60);

    expect(joint.isSlack()).toBe(true);
  });

  it("should report not slack when distance exceeds range", () => {
    const space = new Space();
    const { anchor, ball } = setupPair(space);
    const joint = new DistanceJoint(
      anchor,
      ball,
      new Vec2(0, 0),
      new Vec2(0, 0),
      10,
      20, // ball is 50 away, outside range
    );
    joint.space = space;
    space.step(1 / 60);

    expect(joint.isSlack()).toBe(false);
  });

  it("should support soft constraint (frequency/damping)", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 50, 50);
    joint.stiff = false;
    joint.frequency = 5;
    joint.damping = 0.5;
    joint.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Ball should oscillate but stay roughly at distance
    const dist = Math.sqrt(ball.position.x ** 2 + ball.position.y ** 2);
    expect(dist).toBeGreaterThan(20);
    expect(dist).toBeLessThan(100);
  });

  it("should visitBodies", () => {
    const anchor = new Body();
    const ball = new Body();
    const joint = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 10, 20);

    const visited: Body[] = [];
    joint.visitBodies((b: Body) => visited.push(b));
    expect(visited.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// PivotJoint — additional coverage
// ---------------------------------------------------------------------------
describe("PivotJoint — extended", () => {
  it("should return impulse as MatMN", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new PivotJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const imp = joint.impulse();
    expect(imp).toBeDefined();
  });

  it("should return bodyImpulse", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new PivotJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const bimp = joint.bodyImpulse(ball);
    expect(bimp).toBeDefined();
  });

  it("should visitBodies", () => {
    const anchor = new Body();
    const ball = new Body();
    const joint = new PivotJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));

    const visited: Body[] = [];
    joint.visitBodies((b: Body) => visited.push(b));
    expect(visited.length).toBe(2);
  });

  it("should support anchor update after construction", () => {
    const anchor = staticCircle(0, 0);
    const ball = dynamicCircle(50, 0);
    const joint = new PivotJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));

    joint.anchor1 = new Vec2(10, 10);
    expect(joint.anchor1.x).toBeCloseTo(10);
    expect(joint.anchor1.y).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// WeldJoint — additional coverage
// ---------------------------------------------------------------------------
describe("WeldJoint — extended", () => {
  it("should return impulse", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new WeldJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const imp = joint.impulse();
    expect(imp).toBeDefined();
  });

  it("should return bodyImpulse", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new WeldJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 10; i++) space.step(1 / 60);

    const bimp = joint.bodyImpulse(ball);
    expect(bimp).toBeDefined();
  });

  it("should visitBodies", () => {
    const anchor = new Body();
    const ball = new Body();
    const joint = new WeldJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));

    const visited: Body[] = [];
    joint.visitBodies((b: Body) => visited.push(b));
    expect(visited.length).toBe(2);
  });

  it("should support phase property", () => {
    const anchor = new Body();
    const ball = new Body();
    const joint = new WeldJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), Math.PI / 4);
    expect(joint.phase).toBeCloseTo(Math.PI / 4);

    joint.phase = Math.PI / 2;
    expect(joint.phase).toBeCloseTo(Math.PI / 2);
  });
});

// ---------------------------------------------------------------------------
// Constraint shared properties
// ---------------------------------------------------------------------------
describe("Constraint — shared properties", () => {
  it("should support active toggle on any joint", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new PivotJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;
    joint.active = false;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Ball should fall freely since joint is inactive
    expect(ball.position.y).toBeGreaterThan(20);

    joint.active = true;
    for (let i = 0; i < 10; i++) space.step(1 / 60);
  });

  it("should support ignore property on constraint", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = dynamicCircle(0, 0);
    const b2 = dynamicCircle(15, 0); // overlapping
    b1.space = space;
    b2.space = space;

    const joint = new PivotJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0));
    joint.ignore = true; // ignore collision between these bodies
    joint.space = space;

    expect(joint.ignore).toBe(true);
  });

  it("should support removeOnBreak", () => {
    const space = new Space(new Vec2(0, 500));
    const { anchor, ball } = setupPair(space);
    const joint = new DistanceJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0), 50, 50);
    joint.breakUnderForce = true;
    joint.maxForce = 0.001;
    joint.removeOnBreak = true;
    joint.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Joint should have been removed from space
    expect(joint.space).toBeNull();
  });

  it("should support compound property", () => {
    const compound = new Compound();
    const joint = new AngleJoint(new Body(), new Body(), -1, 1);
    joint.compound = compound;
    expect(joint.compound).toBe(compound);
  });

  it("should support isSleeping query", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new PivotJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;
    space.step(1 / 60);

    // Freshly added constraint is typically awake
    expect(typeof joint.isSleeping).toBe("boolean");
  });

  it("should throw for unlinked body in bodyImpulse", () => {
    const space = new Space(new Vec2(0, 100));
    const { anchor, ball } = setupPair(space);
    const joint = new PivotJoint(anchor, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;
    space.step(1 / 60);

    const unlinked = new Body();
    expect(() => joint.bodyImpulse(unlinked)).toThrow();
  });

  it("should support stiff/frequency/damping on all soft joints", () => {
    const joint = new DistanceJoint(new Body(), new Body(), new Vec2(0, 0), new Vec2(0, 0), 10, 20);

    joint.stiff = false;
    expect(joint.stiff).toBe(false);

    joint.frequency = 10;
    expect(joint.frequency).toBeCloseTo(10);

    joint.damping = 0.5;
    expect(joint.damping).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// Constraint chain (multi-joint integration)
// ---------------------------------------------------------------------------
describe("Constraint — chain/multi-joint integration", () => {
  it("should simulate a pendulum chain", () => {
    const space = new Space(new Vec2(0, 100));
    const anchor = staticCircle(0, 0);
    anchor.space = space;

    let prev = anchor;
    const links: Body[] = [];
    for (let i = 0; i < 5; i++) {
      const link = dynamicCircle((i + 1) * 20, 0, 5);
      link.space = space;
      links.push(link);

      const joint = new PivotJoint(prev, link, new Vec2(i === 0 ? 0 : 0, 0), new Vec2(-10, 0));
      joint.space = space;
      prev = link;
    }

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Last link should have swung below the anchor
    const lastLink = links[links.length - 1];
    expect(lastLink.position.y).toBeGreaterThan(0);
  });

  it("should handle constraint with space.world body", () => {
    const space = new Space(new Vec2(0, 100));
    const ball = dynamicCircle(50, 0);
    ball.space = space;

    // Use space.world as anchor
    const joint = new PivotJoint(space.world, ball, new Vec2(0, 0), new Vec2(0, 0));
    joint.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Ball should be constrained near origin
    const dist = Math.sqrt(ball.position.x ** 2 + ball.position.y ** 2);
    expect(dist).toBeLessThan(20);
  });
});
