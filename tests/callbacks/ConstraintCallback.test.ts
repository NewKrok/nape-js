import { describe, it, expect } from "vitest";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { ConstraintCallback } from "../../src/callbacks/ConstraintCallback";
import { Callback } from "../../src/callbacks/Callback";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { Constraint } from "../../src/constraint/Constraint";

/**
 * Unlike Body (which auto-registers CbType.ANY_BODY), constraints do NOT
 * automatically add CbType.ANY_CONSTRAINT to their cbTypes list.
 * We must explicitly add a matching CbType for the listener to fire.
 */
const CONSTRAINT_CB = new CbType();

describe("ConstraintCallback", () => {
  it("cannot be instantiated directly", () => {
    expect(() => new (Callback as any)()).toThrow();
    expect(() => new (ConstraintCallback as any)()).toThrow();
  });

  it("fires SLEEP callback when a constraint goes to sleep", () => {
    const space = new Space(new Vec2(0, 0));
    let captured: ConstraintCallback | null = null;

    const listener = new ConstraintListener(CbEvent.SLEEP, CONSTRAINT_CB, (cb) => {
      captured = cb;
    });
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = Vec2.weak(100, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    (joint.cbTypes as any).add(CONSTRAINT_CB);
    joint.space = space;

    // With zero gravity and bodies at rest at the joint's distance, they should sleep
    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (captured) break;
    }

    expect(captured).not.toBeNull();
    expect(captured).toBeInstanceOf(ConstraintCallback);
    expect(captured).toBeInstanceOf(Callback);
  });

  it("callback.constraint returns the correct constraint", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedConstraint: Constraint | null = null;

    const listener = new ConstraintListener(CbEvent.SLEEP, CONSTRAINT_CB, (cb) => {
      capturedConstraint = cb.constraint;
    });
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = Vec2.weak(100, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    (joint.cbTypes as any).add(CONSTRAINT_CB);
    joint.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (capturedConstraint) break;
    }

    expect(capturedConstraint).not.toBeNull();
    expect(capturedConstraint).toBe(joint);
  });

  it("callback.event returns CbEvent.SLEEP for a SLEEP listener", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedEvent: CbEvent | null = null;

    const listener = new ConstraintListener(CbEvent.SLEEP, CONSTRAINT_CB, (cb) => {
      capturedEvent = cb.event;
    });
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = Vec2.weak(100, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    (joint.cbTypes as any).add(CONSTRAINT_CB);
    joint.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (capturedEvent) break;
    }

    expect(capturedEvent).toBe(CbEvent.SLEEP);
  });

  it("callback.listener returns the ConstraintListener", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedListener: any = null;

    const listener = new ConstraintListener(CbEvent.SLEEP, CONSTRAINT_CB, (cb) => {
      capturedListener = cb.listener;
    });
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = Vec2.weak(100, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    (joint.cbTypes as any).add(CONSTRAINT_CB);
    joint.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (capturedListener) break;
    }

    expect(capturedListener).not.toBeNull();
    expect(capturedListener).toBe(listener);
  });

  it("callback.toString() returns a non-empty string containing SLEEP", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedStr = "";

    const listener = new ConstraintListener(CbEvent.SLEEP, CONSTRAINT_CB, (cb) => {
      capturedStr = cb.toString();
    });
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = Vec2.weak(100, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    (joint.cbTypes as any).add(CONSTRAINT_CB);
    joint.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (capturedStr) break;
    }

    expect(capturedStr.length).toBeGreaterThan(0);
    expect(capturedStr).toContain("SLEEP");
  });

  it("fires BREAK callback when a constraint breaks under force", () => {
    // Bodies start far apart but the joint wants them close — it can't cope and breaks
    const space = new Space(new Vec2(0, 0));
    let breakEvent: CbEvent | null = null;
    let breakConstraint: Constraint | null = null;
    let breakIsConstraintCallback = false;

    const listener = new ConstraintListener(CbEvent.BREAK, CONSTRAINT_CB, (cb) => {
      breakEvent = cb.event;
      breakConstraint = cb.constraint;
      breakIsConstraintCallback = cb instanceof ConstraintCallback;
    });
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.position = Vec2.weak(0, 0);
    b1.velocity = Vec2.weak(-500, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = Vec2.weak(50, 0);
    b2.velocity = Vec2.weak(500, 0);
    b2.space = space;

    // Joint wants distance 30-30 but bodies are flying apart with high velocity
    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 30, 30);
    joint.breakUnderForce = true;
    joint.maxForce = 1;
    (joint.cbTypes as any).add(CONSTRAINT_CB);
    joint.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60);
      if (breakEvent) break;
    }

    expect(breakIsConstraintCallback).toBe(true);
    expect(breakEvent).toBe(CbEvent.BREAK);
    expect(breakConstraint).toBe(joint);
  });

  it("fires WAKE callback after a constraint wakes from sleep", () => {
    const space = new Space(new Vec2(0, 0));
    let sleepFired = false;
    let wakeFired = false;

    const sleepListener = new ConstraintListener(CbEvent.SLEEP, CONSTRAINT_CB, () => {
      sleepFired = true;
    });
    sleepListener.space = space;

    const wakeListener = new ConstraintListener(CbEvent.WAKE, CONSTRAINT_CB, () => {
      wakeFired = true;
    });
    wakeListener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = Vec2.weak(100, 0);
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 100, 100);
    (joint.cbTypes as any).add(CONSTRAINT_CB);
    joint.space = space;

    // Step until system sleeps
    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (sleepFired) break;
    }

    expect(sleepFired).toBe(true);

    // Now wake one body by applying velocity
    b1.velocity = Vec2.weak(50, 0);

    for (let i = 0; i < 5; i++) {
      space.step(1 / 60);
      if (wakeFired) break;
    }

    expect(wakeFired).toBe(true);
  });
});
