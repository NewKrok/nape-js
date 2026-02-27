import { describe, it, expect } from "vitest";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";

describe("BodyListener", () => {
  it("should construct with WAKE event", () => {
    const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
    expect(listener).toBeInstanceOf(BodyListener);
    expect(listener._inner).toBeDefined();
  });

  it("should construct with SLEEP event", () => {
    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {});
    expect(listener).toBeInstanceOf(BodyListener);
    expect(listener._inner).toBeDefined();
  });

  it("should be added to a space", () => {
    const space = new Space(new Vec2(0, 100));
    const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
    listener.space = space;
    expect(listener.space).toBeInstanceOf(Space);
  });

  it("should fire SLEEP callback when a body goes to sleep", () => {
    const space = new Space(new Vec2(0, 0));
    let sleepCount = 0;

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      sleepCount++;
    });
    listener.space = space;

    // Create a body with no gravity and no velocity -- it should auto-sleep
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;

    // Step many times so the body eventually goes to sleep
    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
    }

    // The body should have gone to sleep and triggered the SLEEP callback
    expect(sleepCount).toBeGreaterThanOrEqual(1);
  });
});
