/**
 * Regressions found by the behaviour golden suite
 * (`Behaviour.golden.test.ts`) in the arbiter BEGIN / END lifecycle.
 *
 * 1. A body switched STATIC while resting on a static body ended its contact,
 *    and the ended arbiter fell asleep looking like a live one. Switching the
 *    body back to DYNAMIC woke it as "touching until the previous step": END
 *    fired a second time and crashed on the pair's freed callback set
 *    ("Cannot read properties of null (reading 'remove_arb')"), and BEGIN
 *    never fired for the renewed contact.
 * 2. With the AABB-tree broadphase, that body's leaf stayed in the dynamic
 *    tree while it was static, so its asleep pairs were never re-queried when
 *    it turned dynamic again: it sank ~3 px into the floor for
 *    `Config.arbiterExpirationDelay` steps, with or without listeners.
 * 3. With `subSteps > 1`, presteparb runs once per sub-step under the same
 *    stamp, so a contact ending in a step generated END once per sub-step —
 *    the second one crashed the same way.
 */
import { describe, it, expect } from "vitest";
import {
  Body,
  BodyType,
  Broadphase,
  CbEvent,
  CbType,
  Circle,
  InteractionListener,
  InteractionType,
  Material,
  Polygon,
  Space,
  Vec2,
} from "../../src";

const BROADPHASES: Array<[string, Broadphase]> = [
  ["SWEEP_AND_PRUNE", Broadphase.SWEEP_AND_PRUNE],
  ["DYNAMIC_AABB_TREE", Broadphase.DYNAMIC_AABB_TREE],
  ["SPATIAL_HASH", Broadphase.SPATIAL_HASH],
];

function world(bp: Broadphase): { space: Space; log: string[] } {
  const space = new Space(new Vec2(0, 400), bp);
  const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
  floor.shapes.add(new Polygon(Polygon.box(800, 20)));
  floor.space = space;
  return { space, log: [] };
}

function logCollisions(space: Space, log: string[], step: { n: number }): void {
  for (const [ev, tag] of [
    [CbEvent.BEGIN, "BEGIN"],
    [CbEvent.END, "END"],
  ] as Array<[CbEvent, string]>) {
    space.listeners.add(
      new InteractionListener(ev, InteractionType.COLLISION, CbType.ANY_BODY, CbType.ANY_BODY, () =>
        log.push(`${step.n}:${tag}`),
      ),
    );
  }
}

describe("body type switch while resting on a static body", () => {
  for (const [name, bp] of BROADPHASES) {
    for (const via of ["STATIC", "KINEMATIC"] as const) {
      it(`${name}: DYNAMIC → ${via} → DYNAMIC keeps the contact and its events consistent`, () => {
        const { space, log } = world(bp);
        const box = new Body(BodyType.DYNAMIC, new Vec2(0, 175));
        box.shapes.add(new Polygon(Polygon.box(30, 30)));
        box.space = space;
        const step = { n: 0 };
        logCollisions(space, log, step);

        let restY = 0;
        let maxYAfter = -Infinity;
        for (step.n = 0; step.n < 120; step.n++) {
          if (step.n === 40) {
            restY = box.position.y;
            box.type = via === "STATIC" ? BodyType.STATIC : BodyType.KINEMATIC;
          }
          if (step.n === 60) box.type = BodyType.DYNAMIC;
          space.step(1 / 60);
          if (step.n >= 60) maxYAfter = Math.max(maxYAfter, box.position.y);
        }

        // Never sinks into the floor after becoming dynamic again.
        expect(maxYAfter).toBeLessThan(restY + 0.05);
        expect(box.position.y).toBeCloseTo(restY, 1);
        // BEGIN on landing, END when it stops being a dynamic contact, and a
        // fresh BEGIN once it is dynamic again — never a doubled END.
        expect(log).toEqual(["1:BEGIN", "40:END", "60:BEGIN"]);
      });
    }
  }

  it("does not crash when END listeners are registered and the body sleeps between switches", () => {
    const { space, log } = world(Broadphase.DYNAMIC_AABB_TREE);
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 175));
    box.shapes.add(new Polygon(Polygon.box(30, 30)));
    box.space = space;
    const step = { n: 0 };
    logCollisions(space, log, step);
    expect(() => {
      for (step.n = 0; step.n < 400; step.n++) {
        if (step.n === 100) box.type = BodyType.STATIC;
        if (step.n === 300) box.type = BodyType.DYNAMIC;
        space.step(1 / 60);
      }
    }).not.toThrow();
    expect(log.filter((e) => e.endsWith("END")).length).toBe(1);
    expect(log.filter((e) => e.endsWith("BEGIN")).length).toBe(2);
  });
});

describe("subSteps with interaction listeners", () => {
  for (const subSteps of [1, 2, 4]) {
    it(`bouncing ball with subSteps=${subSteps}: BEGIN / END alternate, no crash`, () => {
      const { space, log } = world(Broadphase.DYNAMIC_AABB_TREE);
      space.subSteps = subSteps;
      const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
      ball.shapes.add(new Circle(10, undefined, new Material(0.9, 1, 2, 1, 0)));
      ball.space = space;
      const step = { n: 0 };
      logCollisions(space, log, step);

      expect(() => {
        for (step.n = 0; step.n < 240; step.n++) space.step(1 / 60, 4, 2);
      }).not.toThrow();

      const kinds = log.map((e) => e.split(":")[1]);
      expect(kinds.length).toBeGreaterThanOrEqual(5); // several bounces
      kinds.forEach((k, i) => expect(k).toBe(i % 2 === 0 ? "BEGIN" : "END"));
    });
  }
});
