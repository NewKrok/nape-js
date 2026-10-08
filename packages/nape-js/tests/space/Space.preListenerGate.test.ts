/**
 * ZPP_Space skips the PRE-listener walk entirely while no PreListener is
 * registered (`preListenerCount === 0`). A count that drifted low would
 * silently disable PreListeners, so every way of adding, re-registering and
 * removing one is checked against the observable effect: an IGNORE listener
 * lets a ball fall through the floor.
 */
import { describe, it, expect } from "vitest";
import {
  Body,
  BodyType,
  CbEvent,
  CbType,
  Circle,
  InteractionListener,
  InteractionType,
  Polygon,
  PreFlag,
  PreListener,
  Space,
  Vec2,
} from "../../src";

function scene(): { space: Space; ball: Body; tag: CbType } {
  const space = new Space(new Vec2(0, 600));
  const floor = new Body(BodyType.STATIC, new Vec2(0, 100));
  floor.shapes.add(new Polygon(Polygon.box(400, 20)));
  floor.space = space;
  const tag = new CbType();
  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
  ball.shapes.add(new Circle(10));
  ball.cbTypes.add(tag);
  ball.space = space;
  return { space, ball, tag };
}

const count = (space: Space): number => (space.zpp_inner as any).preListenerCount;
const ignore = (tag: CbType): PreListener =>
  new PreListener(InteractionType.COLLISION, tag, CbType.ANY_BODY, () => PreFlag.IGNORE);
const run = (space: Space, steps = 90): void => {
  for (let i = 0; i < steps; i++) space.step(1 / 60);
};

describe("PreListener gate", () => {
  it("no PreListener: the ball rests on the floor", () => {
    const { space, ball } = scene();
    run(space);
    expect(count(space)).toBe(0);
    expect(ball.position.y).toBeLessThan(100);
  });

  it("a PreListener added before stepping takes effect", () => {
    const { space, ball, tag } = scene();
    space.listeners.add(ignore(tag));
    expect(count(space)).toBe(1);
    run(space);
    expect(ball.position.y).toBeGreaterThan(200);
  });

  it("a PreListener added mid-simulation takes effect", () => {
    const { space, ball, tag } = scene();
    run(space, 60);
    expect(ball.position.y).toBeLessThan(100);
    space.listeners.add(ignore(tag));
    ball.velocity = new Vec2(0, 1); // wake it
    run(space);
    expect(ball.position.y).toBeGreaterThan(200);
  });

  it("precedence and cbType changes keep the count", () => {
    const { space, ball, tag } = scene();
    const l = ignore(CbType.ANY_SHAPE);
    space.listeners.add(l);
    l.precedence = 5;
    (l.options1 as any).including(tag);
    (l.options1 as any).excluding(new CbType());
    expect(count(space)).toBe(1);
    run(space);
    expect(ball.position.y).toBeGreaterThan(200);
  });

  it("removing, clearing and re-adding update the count", () => {
    const { space, tag } = scene();
    const a = ignore(tag);
    const b = ignore(tag);
    space.listeners.add(a);
    space.listeners.add(b);
    expect(count(space)).toBe(2);
    space.listeners.remove(a);
    expect(count(space)).toBe(1);
    space.listeners.clear();
    expect(count(space)).toBe(0);
    b.space = space;
    expect(count(space)).toBe(1);
    b.space = null;
    expect(count(space)).toBe(0);
  });

  it("other listener kinds never touch the count", () => {
    const { space, tag } = scene();
    const begin = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      tag,
      CbType.ANY_BODY,
      () => {},
    );
    space.listeners.add(begin);
    begin.event = CbEvent.END;
    begin.precedence = 3;
    space.listeners.remove(begin);
    expect(count(space)).toBe(0);
  });

  it("each space keeps its own count", () => {
    const one = scene();
    const two = scene();
    one.space.listeners.add(ignore(one.tag));
    run(one.space);
    run(two.space);
    expect(count(two.space)).toBe(0);
    expect(one.ball.position.y).toBeGreaterThan(200);
    expect(two.ball.position.y).toBeLessThan(100);
  });
});
