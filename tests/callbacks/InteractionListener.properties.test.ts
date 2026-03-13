/**
 * InteractionListener property tests.
 * Exercises options1/2, handler, interactionType, allowSleepingCallbacks getters/setters.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { CbType } from "../../src/callbacks/CbType";
import { InteractionType } from "../../src/callbacks/InteractionType";

function dynamicCircle(x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticBox(x: number, y: number, w = 300, h = 10): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// InteractionListener property getters
// ---------------------------------------------------------------------------
describe("InteractionListener — property getters", () => {
  it("should expose interactionType getter", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    expect(listener.interactionType).toBe(InteractionType.COLLISION);
  });

  it("should expose options1 and options2 getters", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    expect(listener.options1).toBeDefined();
    expect(listener.options2).toBeDefined();
  });

  it("should expose handler getter", () => {
    const fn = () => {};
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      fn,
    );

    expect(listener.handler).toBe(fn);
  });

  it("should expose allowSleepingCallbacks getter (default false)", () => {
    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    expect(listener.allowSleepingCallbacks).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// InteractionListener property setters
// ---------------------------------------------------------------------------
describe("InteractionListener — property setters", () => {
  it("should set handler to a new function", () => {
    let count1 = 0;
    let count2 = 0;

    const space = new Space(new Vec2(0, 500));
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count1++;
      },
    );
    listener.space = space;

    listener.handler = () => {
      count2++;
    };

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // New handler should have fired, old handler should not
    expect(count2).toBeGreaterThanOrEqual(1);
    expect(count1).toBe(0);
  });

  it("should set interactionType to SENSOR", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    listener.interactionType = InteractionType.SENSOR;
    expect(listener.interactionType).toBe(InteractionType.SENSOR);
  });

  it("should set interactionType to FLUID", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    listener.interactionType = InteractionType.FLUID;
    expect(listener.interactionType).toBe(InteractionType.FLUID);
  });

  it("should set interactionType to ANY", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    listener.interactionType = InteractionType.ANY;
    expect(listener.interactionType).toBe(InteractionType.ANY);
  });

  it("should set allowSleepingCallbacks to true", () => {
    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    listener.allowSleepingCallbacks = true;
    expect(listener.allowSleepingCallbacks).toBe(true);
  });

  it("should throw when setting handler to null", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    expect(() => {
      listener.handler = null as any;
    }).toThrow();
  });

  it("should throw when setting interactionType to null", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    expect(() => {
      listener.interactionType = null as any;
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// InteractionListener with specific CbType options
// ---------------------------------------------------------------------------
describe("InteractionListener — CbType options filtering", () => {
  it("should fire with ANY_BODY options for all bodies", () => {
    const space = new Space(new Vec2(0, 500));
    let count = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count++;
      },
    );
    listener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("options1 getter should return a defined OptionType", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    expect(listener.options1).toBeDefined();
  });

  it("options2 getter should return a defined OptionType", () => {
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );

    expect(listener.options2).toBeDefined();
  });
});
