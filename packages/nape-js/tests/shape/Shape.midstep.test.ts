/**
 * Shape flags that rewrite broadphase / arbiter state are immutable while a
 * step is running — the same rule as upstream nape. The realistic way to hit
 * it is from inside a PreListener, which runs mid-step; the other listener
 * types are delivered after the step and may change it.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { PreListener } from "../../src/callbacks/PreListener";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionType } from "../../src/callbacks/InteractionType";

function scene() {
  const space = new Space();
  const tag = new CbType();
  const shapes: Circle[] = [];
  for (const x of [0, 15]) {
    const body = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
    const shape = new Circle(10);
    body.shapes.add(shape);
    body.cbTypes.add(tag);
    space.bodies.add(body);
    shapes.push(shape);
  }
  return { space, tag, shapes };
}

describe("Shape.sensorEnabled during space.step()", () => {
  it("throws when set from inside a PreListener", () => {
    const { space, tag, shapes } = scene();
    let error: unknown = null;
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, tag, tag, () => {
        try {
          shapes[0].sensorEnabled = true;
        } catch (e) {
          error = e;
        }
        return PreFlag.ACCEPT;
      }),
    );
    space.step(1 / 60);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      "Shape::sensorEnabled cannot be set during a space step()",
    );
    // The message points at the workaround.
    expect((error as Error).message).toContain("after step() returns");
    expect(shapes[0].sensorEnabled).toBe(false);
  });

  it("is allowed from an InteractionListener, whose callbacks run after the step", () => {
    const { space, tag, shapes } = scene();
    let error: unknown = null;
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, tag, tag, () => {
        try {
          shapes[0].sensorEnabled = true;
        } catch (e) {
          error = e;
        }
      }),
    );
    space.step(1 / 60);
    expect(error).toBe(null);
    expect(shapes[0].sensorEnabled).toBe(true);
  });

  it("deferring the change from a PreListener until after step() works", () => {
    const { space, tag, shapes } = scene();
    let pending: boolean | null = null;
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, tag, tag, () => {
        pending = true; // record only
        return PreFlag.ACCEPT;
      }),
    );
    space.step(1 / 60);
    expect(pending).toBe(true);
    shapes[0].sensorEnabled = pending!;
    expect(shapes[0].sensorEnabled).toBe(true);
    space.step(1 / 60);
    // Now a sensor: the pair no longer collides.
    expect(space.interactionType(shapes[0], shapes[1])).toBe(InteractionType.SENSOR);
  });

  it("can be set freely outside a step", () => {
    const { shapes } = scene();
    shapes[0].sensorEnabled = true;
    shapes[0].sensorEnabled = false;
    expect(shapes[0].sensorEnabled).toBe(false);
  });
});
