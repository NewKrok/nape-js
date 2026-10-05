/**
 * Issue #244 (a): removing a body from the space from inside an interaction
 * callback.
 *
 * Callbacks are dispatched after `space.step()` has finished its internal
 * work (outside the `midstep` window), so `body.space = null` inside a handler
 * must be legal, must not throw, and must leave the space consistent.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
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
import type { InteractionCallback } from "../../src/callbacks/InteractionCallback";

/**
 * A static floor and a dynamic ball resting on it, so the pair touches on the
 * first step and keeps touching (ONGOING) on every step after.
 */
function restingScene() {
  const space = new Space(new Vec2(0, 600));
  const floorTag = new CbType();
  const ballTag = new CbType();

  const floor = new Body(BodyType.STATIC, new Vec2(0, 100));
  floor.shapes.add(new Polygon(Polygon.box(400, 20)));
  floor.cbTypes.add(floorTag);
  floor.space = space;

  // Radius 10, centre at y=85: overlaps the floor top (y=90) by 5 units.
  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 85));
  ball.shapes.add(new Circle(10));
  ball.cbTypes.add(ballTag);
  ball.space = space;

  // A bystander that never touches anything — must survive untouched.
  const bystander = new Body(BodyType.DYNAMIC, new Vec2(1000, -1000));
  bystander.shapes.add(new Circle(5));
  bystander.space = space;

  return { space, floor, ball, bystander, floorTag, ballTag };
}

function bodiesOf(space: Space): Body[] {
  const out: Body[] = [];
  for (let i = 0; i < space.bodies.length; i++) out.push(space.bodies.at(i));
  return out;
}

describe("removing a body from inside an interaction callback (#244)", () => {
  for (const event of [CbEvent.BEGIN, CbEvent.ONGOING]) {
    const name = event === CbEvent.BEGIN ? "BEGIN" : "ONGOING";

    it(`${name}: body.space = null inside the handler does not throw and fires once`, () => {
      const { space, floor, ball, bystander, floorTag, ballTag } = restingScene();
      const seen: Body[] = [];
      let handlerError: unknown = null;

      space.listeners.add(
        new InteractionListener(
          event,
          InteractionType.COLLISION,
          ballTag,
          floorTag,
          (cb: InteractionCallback) => {
            const remover = cb.int1.castBody!;
            seen.push(remover);
            try {
              remover.space = null;
            } catch (e) {
              handlerError = e;
            }
          },
        ),
      );

      // ONGOING only starts on the step after BEGIN, so allow a few steps.
      expect(() => {
        for (let i = 0; i < 5; i++) space.step(1 / 60);
      }).not.toThrow();

      expect(handlerError).toBeNull();
      expect(seen).toEqual([ball]);

      // Body set is consistent: the removed ball is gone, everything else stays.
      expect(ball.space).toBeNull();
      expect(space.bodies.has(ball)).toBe(false);
      expect(space.bodies.length).toBe(2);
      expect(bodiesOf(space)).toContain(floor);
      expect(bodiesOf(space)).toContain(bystander);
      // The removed body no longer holds arbiters against the floor.
      expect(ball.arbiters.length).toBe(0);
      expect(floor.arbiters.length).toBe(0);
      expect(space.arbiters.length).toBe(0);

      // Stepping further keeps working and the bystander keeps simulating.
      const yBefore = bystander.position.y;
      expect(() => {
        for (let i = 0; i < 30; i++) space.step(1 / 60);
      }).not.toThrow();
      expect(bystander.position.y).toBeGreaterThan(yBefore);
      expect(seen).toEqual([ball]);
    });

    it(`${name}: the removed body can be re-added and collides again`, () => {
      const { space, ball, floorTag, ballTag } = restingScene();
      let fired = 0;
      space.listeners.add(
        new InteractionListener(event, InteractionType.COLLISION, ballTag, floorTag, (cb) => {
          fired++;
          cb.int1.castBody!.space = null;
        }),
      );
      for (let i = 0; i < 5; i++) space.step(1 / 60);
      expect(fired).toBe(1);
      expect(ball.space).toBeNull();

      ball.position = new Vec2(0, 85);
      ball.velocity = new Vec2(0, 0);
      ball.space = space;
      for (let i = 0; i < 5; i++) space.step(1 / 60);
      expect(fired).toBe(2);
      expect(ball.space).toBeNull();
    });
  }

  it("END fires for the pair whose body was removed inside BEGIN", () => {
    const { space, ball, floorTag, ballTag } = restingScene();
    const events: string[] = [];
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, ballTag, floorTag, (cb) => {
        events.push("begin");
        cb.int1.castBody!.space = null;
      }),
    );
    space.listeners.add(
      new InteractionListener(CbEvent.END, InteractionType.COLLISION, ballTag, floorTag, (cb) => {
        events.push("end");
        expect(cb.int1.castBody).toBe(ball);
      }),
    );
    for (let i = 0; i < 5; i++) space.step(1 / 60);
    expect(events).toEqual(["begin", "end"]);
  });

  it("removing the *other* body (the static floor) inside BEGIN is also safe", () => {
    const { space, floor, ball, floorTag, ballTag } = restingScene();
    let fired = 0;
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, ballTag, floorTag, (cb) => {
        fired++;
        cb.int2.castBody!.space = null;
      }),
    );
    space.step(1 / 60);
    expect(fired).toBe(1);
    expect(floor.space).toBeNull();
    expect(space.bodies.has(ball)).toBe(true);

    // With the floor gone the ball free-falls.
    const y0 = ball.position.y;
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(ball.position.y).toBeGreaterThan(y0 + 5);
    expect(fired).toBe(1);
  });

  it("both callbacks queued for the same pair still fire after the first removes the body", () => {
    const { space, ball, floorTag, ballTag } = restingScene();
    const seen: Array<Body | null> = [];
    const handler = (cb: InteractionCallback) => {
      const b = cb.int1.castBody!;
      seen.push(b.space == null ? null : b);
      b.space = null;
    };
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, ballTag, floorTag, handler),
    );
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, ballTag, floorTag, handler),
    );
    expect(() => space.step(1 / 60)).not.toThrow();
    // The second callback was already queued: it still fires, and sees the
    // body already removed; removing it twice is a harmless no-op.
    expect(seen).toEqual([ball, null]);
    expect(space.bodies.has(ball)).toBe(false);
    expect(() => space.step(1 / 60)).not.toThrow();
  });
});
