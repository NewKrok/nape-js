import { describe, it, expect } from "vitest";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionCallback } from "../../src/callbacks/InteractionCallback";
import { Callback } from "../../src/callbacks/Callback";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { Interactor } from "../../src/phys/Interactor";

describe("InteractionCallback", () => {
  it("cannot be instantiated directly", () => {
    expect(() => new (Callback as any)()).toThrow();
    expect(() => new (InteractionCallback as any)()).toThrow();
  });

  it("fires BEGIN callback when two shapes overlap", () => {
    const space = new Space(new Vec2(0, 0));
    let captured: InteractionCallback | null = null;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        captured = cb;
      },
    );
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0); // overlapping with b1
    b2.space = space;

    space.step(1 / 60);

    expect(captured).not.toBeNull();
    expect(captured).toBeInstanceOf(InteractionCallback);
    expect(captured).toBeInstanceOf(Callback);
  });

  it("callback.int1 and callback.int2 are Interactor instances", () => {
    const space = new Space(new Vec2(0, 0));
    let int1: any = null;
    let int2: any = null;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        int1 = cb.int1;
        int2 = cb.int2;
      },
    );
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(int1).not.toBeNull();
    expect(int2).not.toBeNull();
    expect(int1).toBeInstanceOf(Interactor);
    expect(int2).toBeInstanceOf(Interactor);
  });

  it("callback.int1 and int2 correspond to the two interacting bodies", () => {
    const space = new Space(new Vec2(0, 0));
    let int1: any = null;
    let int2: any = null;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        int1 = cb.int1;
        int2 = cb.int2;
      },
    );
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0);
    b2.space = space;

    space.step(1 / 60);

    // The two interactors should be our two bodies (order may vary)
    const bodies = [int1, int2];
    expect(bodies).toContain(b1);
    expect(bodies).toContain(b2);
  });

  it("callback.arbiters is not null", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedArbiters: any = null;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        capturedArbiters = cb.arbiters;
      },
    );
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(capturedArbiters).not.toBeNull();
    expect(capturedArbiters).toBeDefined();
  });

  it("callback.event returns CbEvent.BEGIN for a BEGIN listener", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedEvent: CbEvent | null = null;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        capturedEvent = cb.event;
      },
    );
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(capturedEvent).toBe(CbEvent.BEGIN);
  });

  it("callback.listener returns the InteractionListener", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedListener: any = null;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        capturedListener = cb.listener;
      },
    );
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(capturedListener).not.toBeNull();
    expect(capturedListener).toBe(listener);
  });

  it("callback.toString() returns a meaningful string containing BEGIN", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedStr = "";

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        capturedStr = cb.toString();
      },
    );
    listener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(capturedStr.length).toBeGreaterThan(0);
    expect(capturedStr).toContain("BEGIN");
  });

  it("fires END callback when bodies separate", () => {
    const space = new Space(new Vec2(0, 0));
    let beginFired = false;
    let endEvent: CbEvent | null = null;
    let endIsInteractionCallback = false;

    const beginListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        beginFired = true;
      },
    );
    beginListener.space = space;

    const endListener = new InteractionListener(
      CbEvent.END,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        endEvent = cb.event;
        endIsInteractionCallback = cb instanceof InteractionCallback;
      },
    );
    endListener.space = space;

    const b1 = new Body();
    b1.shapes.add(new Circle(20));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body();
    b2.shapes.add(new Circle(20));
    b2.position = Vec2.weak(10, 0);
    b2.space = space;

    // Step to get BEGIN
    space.step(1 / 60);
    expect(beginFired).toBe(true);

    // Move bodies far apart to trigger END
    b2.position = Vec2.weak(1000, 0);
    // Need to step to process the separation
    for (let i = 0; i < 5; i++) {
      space.step(1 / 60);
      if (endEvent) break;
    }

    expect(endIsInteractionCallback).toBe(true);
    expect(endEvent).toBe(CbEvent.END);
  });
});
