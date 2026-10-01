/**
 * An impure PreListener (pure = false) whose result is not cached
 * (ACCEPT_ONCE / IGNORE_ONCE) must keep BOTH bodies of the interaction awake,
 * so the handler keeps running every step and can change its mind.
 *
 * Regression: the fluid and collision paths of ZPP_Space.narrowPhase tested
 * `b1.type` twice (`if b1 dynamic wake b1; if b1 dynamic wake b2`), so when the
 * arbiter's b1 was the static body neither body was woken — the dynamic body
 * fell asleep and the "impure" handler silently stopped being called. Which
 * body ends up as b1 depends on insertion order, so the bug only showed for
 * one of the two orders below. The sensor path was already correct.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { CbType } from "../../src/callbacks/CbType";
import { PreListener } from "../../src/callbacks/PreListener";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { InteractionType } from "../../src/callbacks/InteractionType";
import "../../src/index";

type Kind = "collision" | "sensor" | "fluid";
const STEPS = 300;

/**
 * A ball resting on a static floor. For sensor / fluid an extra static zone
 * shape overlaps the resting ball; the pre-listener targets only that
 * interaction type. A dense ball sinks through water and rests on the floor,
 * so it can fall asleep inside the fluid.
 */
function scene(kind: Kind, pure: boolean, ballFirst: boolean) {
  const space = new Space(new Vec2(0, 600));
  const ballTag = new CbType();

  const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
  floor.shapes.add(new Polygon(Polygon.box(400, 40)));

  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 20));
  const ballShape = new Circle(10);
  ballShape.material.density = 20;
  ball.shapes.add(ballShape);
  ball.cbTypes.add(ballTag);

  const bodies: Body[] = ballFirst ? [ball, floor] : [floor, ball];
  if (kind !== "collision") {
    const zone = new Body(BodyType.STATIC, new Vec2(0, 0));
    const zoneShape = new Polygon(Polygon.box(100, 100));
    if (kind === "sensor") zoneShape.sensorEnabled = true;
    else {
      zoneShape.fluidEnabled = true;
      zoneShape.fluidProperties.density = 1;
    }
    zone.shapes.add(zoneShape);
    if (ballFirst) bodies.push(zone);
    else bodies.unshift(zone);
  }
  for (const b of bodies) space.bodies.add(b);

  const itype =
    kind === "collision"
      ? InteractionType.COLLISION
      : kind === "sensor"
        ? InteractionType.SENSOR
        : InteractionType.FLUID;
  let calls = 0;
  space.listeners.add(
    new PreListener(
      itype,
      ballTag,
      CbType.ANY_BODY,
      () => {
        calls++;
        return PreFlag.ACCEPT_ONCE;
      },
      0,
      pure,
    ),
  );

  let sleptAt = -1;
  for (let i = 0; i < STEPS; i++) {
    space.step(1 / 60);
    if (sleptAt < 0 && ball.isSleeping) sleptAt = i;
  }
  return { ball, calls, sleptAt };
}

describe("PreListener — impure handlers keep both bodies awake", () => {
  for (const kind of ["collision", "sensor", "fluid"] as const) {
    for (const ballFirst of [true, false]) {
      const order = ballFirst ? "ball added first" : "ball added last";

      it(`${kind}, ${order}: impure ACCEPT_ONCE runs every step and the ball never sleeps`, () => {
        const { ball, calls, sleptAt } = scene(kind, false, ballFirst);
        expect(sleptAt).toBe(-1);
        expect(ball.isSleeping).toBe(false);
        expect(calls).toBe(STEPS);
      });

      it(`${kind}, ${order}: pure ACCEPT_ONCE lets the resting ball sleep`, () => {
        const { ball, calls, sleptAt } = scene(kind, true, ballFirst);
        expect(sleptAt).toBeGreaterThan(0);
        expect(ball.isSleeping).toBe(true);
        // Handler stops once the interaction sleeps.
        expect(calls).toBeLessThan(STEPS);
      });
    }
  }
});
