/**
 * Listener behaviour that only matters once a listener lives in a Space:
 * re-targeting its OptionType and changing its event on the fly.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { OptionType } from "../../src/callbacks/OptionType";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { PreListener } from "../../src/callbacks/PreListener";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { Listener } from "../../src/callbacks/Listener";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import "../../src/index";

function sleeper(space: Space, cbType?: CbType): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  b.shapes.add(new Circle(10));
  if (cbType) b.cbTypes.add(cbType);
  space.bodies.add(b);
  return b;
}

/** Steps until every body is asleep (no gravity, nothing moving). */
function settle(space: Space, steps = 120) {
  for (let i = 0; i < steps; i++) space.step(1 / 60);
}

describe("BodyListener options re-targeted while in a Space", () => {
  it("including a new CbType starts delivering events for it", () => {
    const space = new Space();
    const tagA = new CbType();
    const tagB = new CbType();
    const events: string[] = [];
    const listener = new BodyListener(CbEvent.SLEEP, tagA, (cb) => {
      events.push(cb.body.cbTypes.has(tagA) ? "A" : "B");
    });
    space.listeners.add(listener);
    sleeper(space, tagA);
    const bodyB = sleeper(space, tagB);

    settle(space);
    expect(events).toEqual(["A"]);

    // Add tagB to the live listener's options and wake B so it sleeps again.
    listener.options.including(tagB);
    bodyB.velocity = new Vec2(1, 0);
    space.step(1 / 60);
    bodyB.velocity = new Vec2(0, 0);
    settle(space);
    expect(events.filter((e) => e === "B")).toEqual(["B"]);
  });

  it("excluding a CbType stops events for bodies carrying it", () => {
    const space = new Space();
    const tag = new CbType();
    const skip = new CbType();
    let count = 0;
    const listener = new BodyListener(CbEvent.SLEEP, tag, () => count++);
    space.listeners.add(listener);
    const b = sleeper(space, tag);
    b.cbTypes.add(skip);

    settle(space);
    expect(count).toBe(1);

    listener.options.excluding(skip);
    b.velocity = new Vec2(1, 0);
    b.velocity = new Vec2(0, 0);
    settle(space);
    expect(count).toBe(1);
  });

  it("replacing the whole OptionType on a live listener works", () => {
    const space = new Space();
    const tagA = new CbType();
    const tagB = new CbType();
    let count = 0;
    const listener = new BodyListener(CbEvent.SLEEP, tagA, () => count++);
    space.listeners.add(listener);
    const b = sleeper(space, tagB);
    settle(space);
    expect(count).toBe(0);

    listener.options = new OptionType(tagB);
    b.velocity = new Vec2(1, 0);
    b.velocity = new Vec2(0, 0);
    settle(space);
    expect(count).toBe(1);
  });

  it("changing the event of a live listener re-registers it", () => {
    const space = new Space();
    const tag = new CbType();
    const events: CbEvent[] = [];
    const listener = new BodyListener(CbEvent.SLEEP, tag, (cb) => events.push(cb.event));
    space.listeners.add(listener);
    const b = sleeper(space, tag);
    settle(space);
    expect(events).toEqual([CbEvent.SLEEP]);

    listener.event = CbEvent.WAKE;
    expect(listener.event).toBe(CbEvent.WAKE);
    b.velocity = new Vec2(1, 0);
    space.step(1 / 60);
    expect(events).toEqual([CbEvent.SLEEP, CbEvent.WAKE]);
  });

  it("rejects an event that is not WAKE or SLEEP", () => {
    const listener = new BodyListener(CbEvent.SLEEP, new CbType(), () => {});
    expect(() => {
      listener.event = CbEvent.BEGIN;
    }).toThrow(/WAKE or SLEEP/);
  });
});

describe("ConstraintListener in a Space", () => {
  function scene() {
    const space = new Space();
    const tag = new CbType();
    const a = sleeper(space);
    const b = sleeper(space);
    b.position = new Vec2(30, 0);
    const joint = new PivotJoint(a, b, new Vec2(15, 0), new Vec2(-15, 0));
    joint.cbTypes.add(tag);
    space.constraints.add(joint);
    return { space, tag, joint, a };
  }

  it("SLEEP -> WAKE event change on a live listener", () => {
    const { space, tag, a } = scene();
    const events: CbEvent[] = [];
    const listener = new ConstraintListener(CbEvent.SLEEP, tag, (cb) => events.push(cb.event));
    space.listeners.add(listener);
    settle(space);
    expect(events).toEqual([CbEvent.SLEEP]);

    listener.event = CbEvent.WAKE;
    a.velocity = new Vec2(5, 0);
    space.step(1 / 60);
    expect(events).toEqual([CbEvent.SLEEP, CbEvent.WAKE]);
  });

  it("BREAK is accepted, anything else is rejected", () => {
    const { tag } = scene();
    const listener = new ConstraintListener(CbEvent.SLEEP, tag, () => {});
    listener.event = CbEvent.BREAK;
    expect(listener.event).toBe(CbEvent.BREAK);
    expect(() => {
      listener.event = CbEvent.ONGOING;
    }).toThrow(/WAKE or SLEEP/);
  });

  it("including a CbType on a live constraint listener takes effect", () => {
    const { space, tag, joint } = scene();
    const other = new CbType();
    let count = 0;
    const listener = new ConstraintListener(CbEvent.SLEEP, other, () => count++);
    space.listeners.add(listener);
    settle(space);
    expect(count).toBe(0);

    listener.options.including(tag);
    joint.body1!.velocity = new Vec2(5, 0);
    space.step(1 / 60);
    // Stop the drift so the island can fall asleep again.
    joint.body1!.velocity = new Vec2(0, 0);
    joint.body2!.velocity = new Vec2(0, 0);
    settle(space);
    expect(count).toBe(1);
  });
});

describe("Listener.toString / event mapping", () => {
  it("names the interaction type of Pre and Interaction listeners", () => {
    const tag = new CbType();
    const sensor = new PreListener(InteractionType.SENSOR, tag, tag, () => PreFlag.ACCEPT);
    const fluid = new PreListener(InteractionType.FLUID, tag, tag, () => null);
    const any = new PreListener(InteractionType.ANY, tag, tag, () => null);
    const collision = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      tag,
      tag,
      () => {},
    );
    expect(sensor.toString()).toContain("SENSOR");
    expect(fluid.toString()).toContain("FLUID");
    expect(any.toString()).toContain("ALL");
    expect(collision.toString()).toContain("COLLISION");
    expect(sensor.event).toBe(CbEvent.PRE);
    expect(collision.event).toBe(CbEvent.BEGIN);
  });

  it("InteractionListener supports ONGOING and END events", () => {
    const tag = new CbType();
    const ongoing = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.ANY,
      tag,
      tag,
      () => {},
    );
    expect(ongoing.event).toBe(CbEvent.ONGOING);
    ongoing.event = CbEvent.END;
    expect(ongoing.event).toBe(CbEvent.END);
    expect(Listener._wrap(ongoing.zpp_inner)).toBe(ongoing);
  });
});
