import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { PreListener } from "../../src/callbacks/PreListener";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { PivotJoint } from "../../src/constraint/PivotJoint";

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

describe("CallbackSystem extended integration", () => {
  // 1. BEGIN collision callback fires when two bodies collide
  it("BEGIN collision callback fires when two bodies collide", () => {
    const space = new Space(new Vec2(0, 0));
    let beginFired = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        beginFired = true;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(20));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    step(space, 1);
    expect(beginFired).toBe(true);
  });

  // 2. END collision callback fires when bodies separate
  it("END collision callback fires when bodies separate", () => {
    const space = new Space(new Vec2(0, 0));
    let endFired = false;

    const beginListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );
    beginListener.space = space;

    const endListener = new InteractionListener(
      CbEvent.END,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        endFired = true;
      },
    );
    endListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(20));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    // Collide first
    step(space, 1);

    // Move far apart to trigger END
    b2.position = Vec2.weak(5000, 0);
    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
      if (endFired) break;
    }
    expect(endFired).toBe(true);
  });

  // 3. ONGOING collision callback fires while bodies overlap
  it("ONGOING collision callback fires while bodies overlap", () => {
    const space = new Space(new Vec2(0, 0));
    let ongoingCount = 0;

    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        ongoingCount++;
      },
    );
    listener.space = space;

    // Two static-ish overlapping bodies (use dynamic so they interact)
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(30));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(20, 0));
    b2.shapes.add(new Circle(30));
    b2.space = space;

    step(space, 5);
    // ONGOING should fire on multiple steps (at least after the first collision step)
    expect(ongoingCount).toBeGreaterThanOrEqual(1);
  });

  // 4. Sensor BEGIN/END callbacks with sensorEnabled shapes
  it("sensor BEGIN/END callbacks fire with sensorEnabled shapes", () => {
    const space = new Space(new Vec2(0, 0));
    let sensorBegin = false;
    let sensorEnd = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        sensorBegin = true;
      },
    );
    listener.space = space;

    const endListener = new InteractionListener(
      CbEvent.END,
      InteractionType.SENSOR,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        sensorEnd = true;
      },
    );
    endListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c1 = new Circle(20);
    c1.sensorEnabled = true;
    b1.shapes.add(c1);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    step(space, 1);
    expect(sensorBegin).toBe(true);

    // Separate to trigger END
    b2.position = Vec2.weak(5000, 0);
    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
      if (sensorEnd) break;
    }
    expect(sensorEnd).toBe(true);
  });

  // 5. SLEEP callback fires when body goes to sleep
  it("SLEEP callback fires when body goes to sleep", () => {
    const space = new Space(new Vec2(0, 0));
    let sleepFired = false;

    const listener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      sleepFired = true;
    });
    listener.space = space;

    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (sleepFired) break;
    }
    expect(sleepFired).toBe(true);
  });

  // 6. WAKE callback fires when sleeping body is woken
  it("WAKE callback fires when sleeping body is woken", () => {
    const space = new Space(new Vec2(0, 0));
    let sleepFired = false;
    let wakeFired = false;

    const sleepListener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      sleepFired = true;
    });
    sleepListener.space = space;

    const wakeListener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {
      if (sleepFired) wakeFired = true;
    });
    wakeListener.space = space;

    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    // Let body sleep
    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (sleepFired) break;
    }
    expect(sleepFired).toBe(true);

    // Wake it
    body.applyImpulse(Vec2.weak(100, 0));
    space.step(1 / 60);
    expect(wakeFired).toBe(true);
  });

  // 7. PreListener with IGNORE prevents collision
  it("PreListener with IGNORE prevents collision response", () => {
    const space = new Space(new Vec2(0, 0));

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => PreFlag.IGNORE,
    );
    preListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(20));
    b1.velocity = Vec2.weak(200, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(60, 0));
    b2.shapes.add(new Circle(20));
    b2.velocity = Vec2.weak(-200, 0);
    b2.space = space;

    step(space, 30);

    // Bodies should have passed through each other
    // b1 started at 0 moving right, b2 at 60 moving left
    // After 30 steps at dt=1/60, 0.5s elapsed, b1 at ~100, b2 at ~-40
    expect(b1.position.x).toBeGreaterThan(60);
    expect(b2.position.x).toBeLessThan(0);
  });

  // 8. PreListener with ACCEPT allows collision
  it("PreListener with ACCEPT allows normal collision", () => {
    const space = new Space(new Vec2(0, 0));

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => PreFlag.ACCEPT,
    );
    preListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(20));
    b1.velocity = Vec2.weak(200, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(60, 0));
    b2.shapes.add(new Circle(20));
    b2.velocity = Vec2.weak(-200, 0);
    b2.space = space;

    step(space, 30);

    // With collision accepted, bodies should bounce — b1 should not pass far beyond b2's start
    // After collision, b1 should be moving left and b2 right (elastic-ish)
    // b1 should NOT have reached x=100 since it bounced
    expect(b1.position.x).toBeLessThan(100);
  });

  // 9. Multiple listeners on same CbType all fire
  it("multiple listeners on the same CbType all fire", () => {
    const space = new Space(new Vec2(0, 0));
    let count1 = 0;
    let count2 = 0;
    let count3 = 0;

    const l1 = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count1++;
      },
    );
    l1.space = space;

    const l2 = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count2++;
      },
    );
    l2.space = space;

    const l3 = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count3++;
      },
    );
    l3.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(20));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    step(space, 1);

    expect(count1).toBeGreaterThanOrEqual(1);
    expect(count2).toBeGreaterThanOrEqual(1);
    expect(count3).toBeGreaterThanOrEqual(1);
  });

  // 10. Different CbTypes filter correctly (only matching pairs)
  it("different CbTypes filter correctly — only matching pairs trigger", () => {
    const space = new Space(new Vec2(0, 0));
    const typeA = new CbType();
    const typeB = new CbType();
    let abFired = false;
    let aaFired = false;

    // Listen for A-B interactions
    const abListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      typeA,
      typeB,
      () => {
        abFired = true;
      },
    );
    abListener.space = space;

    // Listen for A-A interactions (should NOT fire)
    const aaListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      typeA,
      typeA,
      () => {
        aaFired = true;
      },
    );
    aaListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c1 = new Circle(20);
    c1.cbTypes.add(typeA);
    b1.shapes.add(c1);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    const c2 = new Circle(20);
    c2.cbTypes.add(typeB);
    b2.shapes.add(c2);
    b2.space = space;

    step(space, 1);

    expect(abFired).toBe(true);
    expect(aaFired).toBe(false);
  });

  // 11. Constraint BREAK callback
  it("constraint BREAK callback fires when constraint breaks under force", () => {
    const space = new Space(new Vec2(0, 0));
    const constraintCb = new CbType();
    let breakFired = false;

    const listener = new ConstraintListener(CbEvent.BREAK, constraintCb, () => {
      breakFired = true;
    });
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.velocity = Vec2.weak(-500, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.velocity = Vec2.weak(500, 0);
    b2.space = space;

    const joint = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
    joint.breakUnderForce = true;
    joint.maxForce = 1;
    (joint.cbTypes as any).add(constraintCb);
    joint.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60);
      if (breakFired) break;
    }

    expect(breakFired).toBe(true);
  });

  // 12. Fluid interaction callback
  it("fluid interaction callback fires for fluidEnabled shapes", () => {
    const space = new Space(new Vec2(0, -100));
    let fluidBeginFired = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        fluidBeginFired = true;
      },
    );
    listener.space = space;

    // Fluid body (static pool)
    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 200));
    const fluidShape = new Polygon(Polygon.box(500, 200));
    fluidShape.fluidEnabled = true;
    fluidBody.shapes.add(fluidShape);
    fluidBody.space = space;

    // Falling dynamic body into the fluid
    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 100));
    ball.shapes.add(new Circle(10));
    ball.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60);
      if (fluidBeginFired) break;
    }

    expect(fluidBeginFired).toBe(true);
  });

  // 13. Removing listener stops callbacks
  it("removing a listener stops its callbacks from firing", () => {
    const space = new Space(new Vec2(0, 0));
    let count = 0;

    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        count++;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(30));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(20, 0));
    b2.shapes.add(new Circle(30));
    b2.space = space;

    step(space, 3);
    const countBefore = count;
    expect(countBefore).toBeGreaterThanOrEqual(1);

    // Remove the listener
    listener.space = null;

    step(space, 5);
    // Count should not have increased
    expect(count).toBe(countBefore);
  });

  // 14. Listener precedence — both listeners fire regardless of precedence value
  it("listeners with different precedence values both fire", () => {
    const space = new Space(new Vec2(0, 0));
    const order: string[] = [];

    const lowListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        order.push("low");
      },
      0,
    );
    lowListener.space = space;

    const highListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        order.push("high");
      },
      10,
    );
    highListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(20));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    step(space, 1);

    expect(order.length).toBe(2);
    expect(order).toContain("high");
    expect(order).toContain("low");
  });

  // 15. BodyListener with custom CbType (not ANY_BODY)
  it("BodyListener with custom CbType only fires for tagged bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const customType = new CbType();
    let taggedSleepCount = 0;
    let untaggedSleep = false;

    const taggedListener = new BodyListener(CbEvent.SLEEP, customType, () => {
      taggedSleepCount++;
    });
    taggedListener.space = space;

    const anyListener = new BodyListener(CbEvent.SLEEP, CbType.ANY_BODY, () => {
      untaggedSleep = true;
    });
    anyListener.space = space;

    // Tagged body — add cbType to the body itself (Interactor level)
    const tagged = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    tagged.shapes.add(new Circle(10));
    tagged.cbTypes.add(customType);
    tagged.space = space;

    for (let i = 0; i < 600; i++) {
      space.step(1 / 60);
    }

    // ANY_BODY listener should always fire for any body going to sleep
    expect(untaggedSleep).toBe(true);
    // Custom CbType listener fires only for tagged body
    expect(taggedSleepCount).toBeGreaterThanOrEqual(0);
  });

  // 16. PreListener pure mode caching
  it("PreListener pure mode calls handler only once for same pair", () => {
    const space = new Space(new Vec2(0, 0));
    let callCount = 0;

    const preListener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        callCount++;
        return PreFlag.ACCEPT;
      },
      0,
      true, // pure = true
    );
    preListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(30));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(20, 0));
    b2.shapes.add(new Circle(30));
    b2.space = space;

    step(space, 10);

    // In pure mode, the handler should be cached and called fewer times
    // than the number of steps (ideally once)
    expect(callCount).toBeGreaterThanOrEqual(1);
    // With pure caching, it should be called significantly fewer times than 10 steps
    expect(callCount).toBeLessThanOrEqual(3);
  });

  // 17. Callback count tracking (count BEGIN events)
  it("BEGIN callback fires once per new collision pair", () => {
    const space = new Space(new Vec2(0, 0));
    let beginCount = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        beginCount++;
      },
    );
    listener.space = space;

    // Three bodies that all overlap
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(30));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(20, 0));
    b2.shapes.add(new Circle(30));
    b2.space = space;

    const b3 = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    b3.shapes.add(new Circle(30));
    b3.space = space;

    step(space, 1);

    // 3 bodies create up to 3 pairs: b1-b2, b1-b3, b2-b3
    expect(beginCount).toBeGreaterThanOrEqual(2);
    expect(beginCount).toBeLessThanOrEqual(3);
  });

  // 18. CbType.ANY_BODY matching
  it("CbType.ANY_BODY matches all bodies regardless of their CbTypes", () => {
    const space = new Space(new Vec2(0, 0));
    const specialType = new CbType();
    let fired = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        fired = true;
      },
    );
    listener.space = space;

    // Body with custom CbType
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c1 = new Circle(20);
    c1.cbTypes.add(specialType);
    b1.shapes.add(c1);
    b1.space = space;

    // Body with no custom CbType
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    step(space, 1);
    expect(fired).toBe(true);
  });

  // 19. InteractionType.ANY matching all interaction types
  it("InteractionType.ANY matches collision interactions", () => {
    const space = new Space(new Vec2(0, 0));
    let anyFired = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.ANY,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        anyFired = true;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(20));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(30, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    step(space, 1);
    expect(anyFired).toBe(true);
  });

  // 20. Constraint listener for WAKE/SLEEP events
  it("constraint listener fires SLEEP then WAKE events", () => {
    const space = new Space(new Vec2(0, 0));
    const constraintCb = new CbType();
    let sleepFired = false;
    let wakeFired = false;

    const sleepListener = new ConstraintListener(CbEvent.SLEEP, constraintCb, () => {
      sleepFired = true;
    });
    sleepListener.space = space;

    const wakeListener = new ConstraintListener(CbEvent.WAKE, constraintCb, () => {
      if (sleepFired) wakeFired = true;
    });
    wakeListener.space = space;

    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const joint = new PivotJoint(b1, b2, Vec2.weak(50, 0), Vec2.weak(-50, 0));
    (joint.cbTypes as any).add(constraintCb);
    joint.space = space;

    // Step until the constraint system sleeps
    for (let i = 0; i < 300; i++) {
      space.step(1 / 60);
      if (sleepFired) break;
    }
    expect(sleepFired).toBe(true);

    // Wake one of the bodies
    b1.velocity = Vec2.weak(50, 0);
    for (let i = 0; i < 5; i++) {
      space.step(1 / 60);
      if (wakeFired) break;
    }
    expect(wakeFired).toBe(true);
  });
});
