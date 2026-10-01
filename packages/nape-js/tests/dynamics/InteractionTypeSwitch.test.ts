/**
 * Switching a shape's interaction type (collision ↔ sensor ↔ fluid) while it
 * is already in contact. ZPP_Space.narrowPhase finds the existing arbiter of
 * the old type, retires it and creates one of the new type (`intchange`).
 *
 * Checked against behaviour rather than internals:
 *  - the space holds at most one arbiter for the pair, of the new type;
 *  - END of the old type and BEGIN of the new type are reported;
 *  - the ball then moves the way the new type dictates: rests on a collision
 *    floor, falls through a sensor, floats in a dense fluid.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionType } from "../../src/callbacks/InteractionType";
import type { Shape } from "../../src/shape/Shape";
import "../../src/index";

type Mode = "collision" | "sensor" | "fluid";
const MODES: Mode[] = ["collision", "sensor", "fluid"];
const ITYPE = {
  collision: InteractionType.COLLISION,
  sensor: InteractionType.SENSOR,
  fluid: InteractionType.FLUID,
};
const DT = 1 / 60;
const SWITCH_STEP = 5;
// Floor box: centre y = 50, half-height 20 → top at 30, bottom at 70.
const FLOOR_TOP = 30;
const FLOOR_BOTTOM = 70;

function setMode(s: Shape, m: Mode) {
  s.sensorEnabled = m === "sensor";
  s.fluidEnabled = m === "fluid";
  if (m === "fluid") s.fluidProperties.density = 3;
}

function arbiterTypes(space: Space): string[] {
  const out: string[] = [];
  for (let i = 0; i < space.arbiters.length; i++) out.push(String(space.arbiters.at(i).type));
  return out;
}

function scene(from: Mode) {
  const space = new Space(new Vec2(0, 600));
  const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
  const floorShape = new Polygon(Polygon.box(400, 40));
  floor.shapes.add(floorShape);
  setMode(floorShape, from);
  space.bodies.add(floor);

  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 20));
  ball.shapes.add(new Circle(10));
  space.bodies.add(ball);

  const events: { stamp: number; event: string; type: string }[] = [];
  for (const m of MODES) {
    for (const e of [CbEvent.BEGIN, CbEvent.END]) {
      space.listeners.add(
        new InteractionListener(e, ITYPE[m], CbType.ANY_BODY, CbType.ANY_BODY, () =>
          events.push({ stamp: space.timeStamp, event: String(e), type: m }),
        ),
      );
    }
  }
  for (let i = 0; i < SWITCH_STEP; i++) space.step(DT);
  return { space, floorShape, ball, events };
}

describe("Interaction type switch while in contact", () => {
  for (const from of MODES) {
    for (const to of MODES) {
      if (from === to) continue;

      it(`${from} → ${to}`, () => {
        const { space, floorShape, ball, events } = scene(from);
        expect(arbiterTypes(space)).toEqual([from.toUpperCase()]);
        const switchStamp = space.timeStamp + 1;

        setMode(floorShape, to);
        // A resting ball barely overlaps the floor, so a fluid arbiter (which
        // needs a positive overlap area) may only appear once it sinks in.
        for (let i = 0; i < 3; i++) {
          space.step(DT);
          const types = arbiterTypes(space);
          expect(types.length).toBeLessThanOrEqual(1);
          expect(ball.arbiters.length).toBe(types.length);
          if (types.length === 1) expect(types[0]).toBe(to.toUpperCase());
        }

        const ended = events.filter((e) => e.event === "END" && e.type === from);
        expect(ended.map((e) => e.stamp)).toEqual([switchStamp]);
        const began = events.filter(
          (e) => e.event === "BEGIN" && e.type === to && e.stamp >= switchStamp,
        );
        expect(began.length).toBe(1);
        expect(began[0].stamp - switchStamp).toBeLessThanOrEqual(1);

        for (let i = 0; i < 60; i++) space.step(DT);
        const y = ball.position.y;
        if (to === "collision") {
          // Resting on top of the floor again (radius 10).
          expect(y).toBeCloseTo(FLOOR_TOP - 10, 0);
          expect(Math.abs(ball.velocity.y)).toBeLessThan(1);
        } else if (to === "sensor") {
          expect(y - 10).toBeGreaterThan(FLOOR_BOTTOM);
        } else {
          // Fluid denser than the ball: it floats near the surface instead of
          // falling through, and does not rest on it as on a solid floor.
          expect(y).toBeGreaterThan(FLOOR_TOP - 10);
          expect(y).toBeLessThan(FLOOR_TOP + 10);
        }
      });
    }
  }
});
