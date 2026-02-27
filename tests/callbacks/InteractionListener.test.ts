import { describe, it, expect } from "vitest";
import {
  Body,
  BodyType,
  Circle,
  CbEvent,
  CbType,
  InteractionType,
  InteractionListener,
  Space,
  Vec2,
} from "../../src";

describe("InteractionListener", () => {
  it("should construct with CbType options", () => {
    const cbType = new CbType();
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      cbType,
      cbType,
      () => {},
    );
    expect(listener).toBeDefined();
    expect(listener._inner).toBeDefined();
  });

  it("should detect collision between two bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const cbType = new CbType();
    let collisionDetected = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      cbType,
      cbType,
      () => { collisionDetected = true; },
    );
    listener.space = space;

    // Create two overlapping bodies with the callback type
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const circle1 = new Circle(50);
    circle1.cbTypes.add(cbType);
    body1.shapes.add(circle1 as any);
    body1.space = space;

    const body2 = new Body(BodyType.DYNAMIC, new Vec2(10, 0));
    const circle2 = new Circle(50);
    circle2.cbTypes.add(cbType);
    body2.shapes.add(circle2 as any);
    body2.space = space;

    // Step the simulation to trigger collision
    space.step(1 / 60);

    expect(collisionDetected).toBe(true);
  });

  it("should support precedence", () => {
    const cbType = new CbType();
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      cbType,
      cbType,
      () => {},
      42,
    );
    expect(listener.precedence).toBe(42);
  });
});
