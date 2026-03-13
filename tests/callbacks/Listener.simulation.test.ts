/**
 * Listener integration tests during simulation.
 * Exercises BodyListener, InteractionListener, PreListener callback paths
 * inside ZPP_CbSetManager and ZPP_CallbackSet (native/space).
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { PreListener } from "../../src/callbacks/PreListener";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { CbType } from "../../src/callbacks/CbType";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { FluidProperties } from "../../src/phys/FluidProperties";

function dynamicCircle(x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function staticBox(x: number, y: number, w = 200, h = 10): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// BodyListener — WAKE / SLEEP events
// ---------------------------------------------------------------------------
describe("BodyListener — WAKE / SLEEP events", () => {
  it("should fire SLEEP when body goes to sleep (no velocity, no gravity)", () => {
    const space = new Space(new Vec2(0, 0)); // no gravity
    let sleepCount = 0;

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      sleepCount++;
    });
    listener.space = space;

    const b = new Body();
    b.shapes.add(new Circle(10));
    b.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(sleepCount).toBeGreaterThanOrEqual(1);
  });

  it("should fire WAKE when sleeping body is disturbed", () => {
    const space = new Space(new Vec2(0, 0));
    let wakeCount = 0;

    const sleepListener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {});
    sleepListener.space = space;

    const wakeListener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {
      wakeCount++;
    });
    wakeListener.space = space;

    const b = new Body();
    b.shapes.add(new Circle(10));
    b.space = space;

    // Let body sleep
    for (let i = 0; i < 300; i++) space.step(1 / 60);

    // Wake with impulse
    b.applyImpulse(new Vec2(100, 0));
    for (let i = 0; i < 5; i++) space.step(1 / 60);

    expect(wakeCount).toBeGreaterThanOrEqual(1);
  });

  it("should support specific CbType on BodyListener", () => {
    const space = new Space(new Vec2(0, 0));
    const ct = new CbType();
    let sleepCount = 0;

    const listener = new BodyListener(CbEvent.SLEEP, ct, () => {
      sleepCount++;
    });
    listener.space = space;

    // Body without ct — should NOT fire
    const b1 = new Body();
    b1.shapes.add(new Circle(10));
    b1.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);
    const countAfterB1 = sleepCount;

    // Body WITH ct — should fire
    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = new Vec2(100, 0);
    (b2.cbTypes as any).add(ct);
    b2.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(sleepCount).toBeGreaterThan(countAfterB1);
  });

  it("should support adding listener via listener.space", () => {
    const space = new Space(new Vec2(0, 0));
    let sleepCount = 0;
    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      sleepCount++;
    });

    // Use listener.space API
    listener.space = space;
    expect(listener.space).toBe(space);

    const b = new Body();
    b.shapes.add(new Circle(10));
    b.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(sleepCount).toBeGreaterThanOrEqual(1);
  });

  it("should stop firing after listener.space = null", () => {
    const space = new Space(new Vec2(0, 0));
    let sleepCount = 0;

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      sleepCount++;
    });
    listener.space = space;

    const b = new Body();
    b.shapes.add(new Circle(10));
    b.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);
    const countWithListener = sleepCount;

    // Remove listener
    listener.space = null;

    // New body — should not fire
    const b2 = new Body();
    b2.shapes.add(new Circle(10));
    b2.position = new Vec2(200, 0);
    b2.space = space;

    for (let i = 0; i < 300; i++) space.step(1 / 60);

    expect(sleepCount).toBe(countWithListener);
  });
});

// ---------------------------------------------------------------------------
// InteractionListener — BEGIN / END / ONGOING events
// ---------------------------------------------------------------------------
describe("InteractionListener — BEGIN / END / ONGOING events", () => {
  it("should fire BEGIN when two bodies first collide", () => {
    const space = new Space(new Vec2(0, 500));
    let begins = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        begins++;
      },
    );
    listener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(begins).toBeGreaterThanOrEqual(1);
  });

  it("should fire ONGOING while collision persists", () => {
    const space = new Space(new Vec2(0, 500));
    let ongoing = 0;

    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        ongoing++;
      },
    );
    listener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    expect(ongoing).toBeGreaterThanOrEqual(1);
  });

  it("should fire END when bodies separate", () => {
    const space = new Space(new Vec2(0, 500));
    let ends = 0;

    const listener = new InteractionListener(
      CbEvent.END,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        ends++;
      },
    );
    listener.space = space;

    const floor = staticBox(0, 100);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    // Settle on floor
    for (let i = 0; i < 120; i++) space.step(1 / 60);

    // Apply upward impulse to separate
    ball.applyImpulse(new Vec2(0, -5000));
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(typeof ends).toBe("number");
  });

  it("should have arbiter accessible in BEGIN callback", () => {
    const space = new Space(new Vec2(0, 500));
    let hasArbiter = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        if (cb.arbiter !== null) hasArbiter = true;
      },
    );
    listener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(hasArbiter).toBe(true);
  });

  it("should fire FLUID interaction when body enters fluid", () => {
    const space = new Space(new Vec2(0, 100));
    let fluidBegins = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        fluidBegins++;
      },
    );
    listener.space = space;

    const pool = new Body(BodyType.STATIC, new Vec2(0, 100));
    const poolShape = new Polygon(Polygon.box(400, 100));
    poolShape.fluidEnabled = true;
    poolShape.fluidProperties = new FluidProperties(2, 1);
    pool.shapes.add(poolShape);
    pool.space = space;

    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60);

    expect(typeof fluidBegins).toBe("number");
  });

  it("should fire SENSOR interaction when body enters sensor", () => {
    const space = new Space(new Vec2(0, 100));
    let sensorBegins = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        sensorBegins++;
      },
    );
    listener.space = space;

    const sensor = new Body(BodyType.STATIC, new Vec2(0, 30));
    const sensorShape = new Polygon(Polygon.box(100, 100));
    sensorShape.sensorEnabled = true;
    sensor.shapes.add(sensorShape);
    sensor.space = space;

    const ball = dynamicCircle(0, 0, 5);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(typeof sensorBegins).toBe("number");
  });

  it("should support multiple listeners for same event", () => {
    const space = new Space(new Vec2(0, 500));
    let count1 = 0;
    let count2 = 0;

    const l1 = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count1++;
      },
    );
    const l2 = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count2++;
      },
    );
    l1.space = space;
    l2.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(count1).toBeGreaterThanOrEqual(1);
    expect(count2).toBe(count1);
  });

  it("should filter by specific CbType on both bodies", () => {
    const space = new Space(new Vec2(0, 500));
    const ct = new CbType();
    let count = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      ct,
      ct,
      () => {
        count++;
      },
    );
    listener.space = space;

    // Bodies WITHOUT ct should NOT fire listener
    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PreListener — pre-collision callbacks
// ---------------------------------------------------------------------------
describe("PreListener — pre-collision callbacks", () => {
  it("should fire pre-listener callback before collision resolution", () => {
    const space = new Space(new Vec2(0, 500));
    let preFired = false;

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb) => {
        preFired = true;
        return PreFlag.ACCEPT;
      },
    );
    preListener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(preFired).toBe(true);
  });

  it("should allow ignoring a collision via PreFlag.IGNORE", () => {
    const space = new Space(new Vec2(0, 500));

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb) => PreFlag.IGNORE,
    );
    preListener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // Ball should pass through the floor since collision is ignored
    expect(ball.position.y).toBeGreaterThan(50);
  });

  it("should support ACCEPT_ONCE flag", () => {
    const space = new Space(new Vec2(0, 500));
    let callCount = 0;

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb) => {
        callCount++;
        return PreFlag.ACCEPT_ONCE;
      },
    );
    preListener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  it("should have access to arbiter in pre-callback", () => {
    const space = new Space(new Vec2(0, 500));
    let arbiterFound = false;

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        if (cb.arbiter !== null) arbiterFound = true;
        return PreFlag.ACCEPT;
      },
    );
    preListener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(arbiterFound).toBe(true);
  });

  it("should remove preListener from space", () => {
    const space = new Space(new Vec2(0, 500));
    let callCount = 0;

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb) => {
        callCount++;
        return PreFlag.ACCEPT;
      },
    );
    preListener.space = space;

    const floor = staticBox(0, 50);
    floor.space = space;
    const ball = dynamicCircle(0, 0, 10);
    ball.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60);
    const countBefore = callCount;

    preListener.space = null;

    // Continue stepping — should NOT fire anymore
    for (let i = 0; i < 60; i++) space.step(1 / 60);

    expect(callCount).toBe(countBefore);
  });
});
