/**
 * PreListener results on SENSOR and FLUID interactions, checked by their
 * effect: an ignored fluid gives no buoyancy, an ignored sensor arbiter
 * reports `state === IGNORE`. As for collisions, IGNORE only drops the
 * response — BEGIN / ONGOING interaction events are still reported. The listener is matched through a cbType placed on a
 * (nested) Compound, so the handler is found by walking from the bodies up
 * to their common compound ancestor.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { PreListener } from "../../src/callbacks/PreListener";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionType } from "../../src/callbacks/InteractionType";
import "../../src/index";

const DT = 1 / 60;

/**
 * A static pool (fluid or sensor) and a ball dropped into it. The ball sits
 * inside `inner`, which sits inside `outer`; `tag` goes on `tagOn`.
 */
function pool(kind: "fluid" | "sensor", tagOn: "body" | "inner" | "outer") {
  const space = new Space(new Vec2(0, 600));
  const tag = new CbType();

  const pool = new Body(BodyType.STATIC, new Vec2(0, 100));
  const water = new Polygon(Polygon.box(400, 100));
  if (kind === "fluid") {
    water.fluidEnabled = true;
    water.fluidProperties.density = 3;
  } else {
    water.sensorEnabled = true;
  }
  pool.shapes.add(water);
  space.bodies.add(pool);

  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 40));
  ball.shapes.add(new Circle(10));
  const inner = new Compound();
  const outer = new Compound();
  ball.compound = inner;
  inner.compound = outer;
  ({ body: ball, inner, outer })[tagOn].cbTypes.add(tag);
  outer.space = space;

  return { space, tag, ball };
}

function sensorBegins(space: Space) {
  let n = 0;
  space.listeners.add(
    new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => n++,
    ),
  );
  return () => n;
}

describe("PreListener on FLUID interactions", () => {
  for (const tagOn of ["body", "inner", "outer"] as const) {
    it(`IGNORE removes buoyancy (tag on ${tagOn})`, () => {
      const floating = pool("fluid", tagOn);
      const ignored = pool("fluid", tagOn);
      let calls = 0;
      ignored.space.listeners.add(
        new PreListener(InteractionType.FLUID, ignored.tag, CbType.ANY_BODY, () => {
          calls++;
          return PreFlag.IGNORE;
        }),
      );
      for (let i = 0; i < 120; i++) {
        floating.space.step(DT);
        ignored.space.step(DT);
      }
      // ACCEPT/IGNORE (without _ONCE) is cached: the handler runs once.
      expect(calls).toBe(1);
      // Pool spans y ∈ [50, 150]; a dense fluid keeps the ball near its surface.
      expect(floating.ball.position.y).toBeLessThan(100);
      // Without buoyancy the ball free-falls straight through the pool.
      expect(ignored.ball.position.y).toBeGreaterThan(150);
      expect(ignored.ball.position.y).toBeCloseTo(40 + 0.5 * 600 * 2 * 2, -2);
    });
  }

  it("ACCEPT keeps buoyancy and is evaluated only once", () => {
    const { space, tag, ball } = pool("fluid", "outer");
    let calls = 0;
    space.listeners.add(
      new PreListener(InteractionType.FLUID, tag, CbType.ANY_BODY, () => {
        calls++;
        return PreFlag.ACCEPT;
      }),
    );
    for (let i = 0; i < 120; i++) space.step(DT);
    expect(calls).toBe(1);
    expect(ball.position.y).toBeLessThan(100);
  });

  it("InteractionType.ANY listener applies to fluid interactions", () => {
    const { space, tag, ball } = pool("fluid", "inner");
    space.listeners.add(
      new PreListener(InteractionType.ANY, tag, CbType.ANY_BODY, () => PreFlag.IGNORE),
    );
    for (let i = 0; i < 120; i++) space.step(DT);
    expect(ball.position.y).toBeGreaterThan(150);
  });
});

describe("PreListener on SENSOR interactions", () => {
  for (const tagOn of ["body", "inner", "outer"] as const) {
    it(`IGNORE marks the sensor arbiter ignored but still reports BEGIN (tag on ${tagOn})`, () => {
      const plain = pool("sensor", tagOn);
      const ignored = pool("sensor", tagOn);
      const ignoredBegins = sensorBegins(ignored.space);
      let calls = 0;
      ignored.space.listeners.add(
        new PreListener(InteractionType.SENSOR, ignored.tag, CbType.ANY_BODY, () => {
          calls++;
          return PreFlag.IGNORE;
        }),
      );
      const plainStates = new Set<PreFlag>();
      const ignoredStates = new Set<PreFlag>();
      for (let i = 0; i < 30; i++) {
        plain.space.step(DT);
        ignored.space.step(DT);
        if (plain.space.arbiters.length) plainStates.add(plain.space.arbiters.at(0).state);
        if (ignored.space.arbiters.length) ignoredStates.add(ignored.space.arbiters.at(0).state);
      }
      expect(calls).toBe(1);
      expect([...plainStates]).toEqual([PreFlag.ACCEPT_ONCE]);
      expect([...ignoredStates]).toEqual([PreFlag.IGNORE]);
      expect(ignoredBegins()).toBe(1);
      // Sensors never affect motion, ignored or not.
      expect(ignored.ball.position.y).toBeCloseTo(plain.ball.position.y, 6);
    });
  }

  it("ACCEPT_ONCE re-runs the handler every overlapping step", () => {
    const { space, tag } = pool("sensor", "outer");
    const begins = sensorBegins(space);
    let calls = 0;
    space.listeners.add(
      new PreListener(InteractionType.SENSOR, tag, CbType.ANY_BODY, () => {
        calls++;
        return PreFlag.ACCEPT_ONCE;
      }),
    );
    let overlapping = 0;
    for (let i = 0; i < 30; i++) {
      space.step(DT);
      if (space.arbiters.length > 0) overlapping++;
    }
    expect(begins()).toBe(1);
    expect(overlapping).toBeGreaterThan(1);
    expect(calls).toBe(overlapping);
  });

  it("InteractionType.ANY listener applies to sensor interactions", () => {
    const { space, tag } = pool("sensor", "body");
    let calls = 0;
    space.listeners.add(
      new PreListener(InteractionType.ANY, tag, CbType.ANY_BODY, () => {
        calls++;
        return PreFlag.IGNORE;
      }),
    );
    for (let i = 0; i < 30; i++) space.step(DT);
    expect(calls).toBe(1);
    expect(space.arbiters.at(0).state).toBe(PreFlag.IGNORE);
  });
});
