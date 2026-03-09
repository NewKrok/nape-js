import { describe, it, expect } from "vitest";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { BodyCallback } from "../../src/callbacks/BodyCallback";
import { Callback } from "../../src/callbacks/Callback";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";

describe("BodyCallback", () => {
  it("cannot be instantiated directly", () => {
    expect(() => new (Callback as any)()).toThrow();
    expect(() => new (BodyCallback as any)()).toThrow();
  });

  it("fires SLEEP callback that is a BodyCallback instance", () => {
    const space = new Space(new Vec2(0, 0));
    let captured: BodyCallback | null = null;

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, (cb) => {
      captured = cb;
    });
    listener.space = space;

    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (captured) break;
    }

    expect(captured).not.toBeNull();
    expect(captured).toBeInstanceOf(BodyCallback);
    expect(captured).toBeInstanceOf(Callback);
  });

  it("callback.body returns the correct Body", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedBody: Body | null = null;
    const body = new Body();
    body.shapes.add(new Circle(10));

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, (cb) => {
      capturedBody = cb.body;
    });
    listener.space = space;
    body.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (capturedBody) break;
    }

    expect(capturedBody).not.toBeNull();
    expect(capturedBody).toBe(body);
  });

  it("callback.event returns CbEvent.SLEEP for a SLEEP listener", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedEvent: CbEvent | null = null;

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, (cb) => {
      capturedEvent = cb.event;
    });
    listener.space = space;

    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (capturedEvent) break;
    }

    expect(capturedEvent).toBe(CbEvent.SLEEP);
  });

  it("callback.listener returns the BodyListener that triggered it", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedListener: any = null;

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, (cb) => {
      capturedListener = cb.listener;
    });
    listener.space = space;

    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;

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

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, (cb) => {
      capturedStr = cb.toString();
    });
    listener.space = space;

    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (capturedStr) break;
    }

    expect(capturedStr.length).toBeGreaterThan(0);
    expect(capturedStr).toContain("SLEEP");
  });

  it("fires WAKE callback when a sleeping body is woken", () => {
    const space = new Space(new Vec2(0, 0));
    let sleepFired = false;
    let wakeEvent: CbEvent | null = null;
    let wakeBody: Body | null = null;
    let wakeIsBodyCallback = false;

    const sleepListener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      sleepFired = true;
    });
    sleepListener.space = space;

    const wakeListener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, (cb) => {
      // Only capture wake events after the body has slept at least once
      if (sleepFired) {
        wakeEvent = cb.event;
        wakeBody = cb.body;
        wakeIsBodyCallback = cb instanceof BodyCallback;
      }
    });
    wakeListener.space = space;

    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;

    // Let the body go to sleep
    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (sleepFired) break;
    }
    expect(sleepFired).toBe(true);

    // Wake it by applying an impulse, then step so the wake callback fires
    body.applyImpulse(Vec2.weak(100, 0));
    space.step(1 / 60);

    expect(wakeIsBodyCallback).toBe(true);
    expect(wakeEvent).toBe(CbEvent.WAKE);
    expect(wakeBody).toBe(body);
  });
});
