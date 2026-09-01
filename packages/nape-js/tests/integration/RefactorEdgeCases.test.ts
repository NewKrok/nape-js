/**
 * Targeted tests for edge-case paths flagged as uncovered by the coverage
 * report on the optimization branch: disposed-Vec2 guards, the sleepable
 * apply-impulse early return, collision-arbiter retirement (pool free), and
 * the degenerate circle-center-exactly-on-polygon-vertex contact paths.
 */
import { describe, it, expect } from "vitest";
import {
  Body,
  BodyType,
  CbType,
  Circle,
  InteractionType,
  Polygon,
  PreListener,
  Space,
  Vec2,
} from "../../src";

function settleUntilSleeping(space: Space, body: Body, maxSteps = 600): void {
  for (let i = 0; i < maxSteps && !body.isSleeping; i++) {
    space.step(1 / 60, 8, 3);
  }
  expect(body.isSleeping).toBe(true);
}

describe("disposed Vec2 guards", () => {
  it("rejects a disposed Vec2 passed to applyImpulse", () => {
    const space = new Space(new Vec2(0, 600));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    const disposed = Vec2.get(1, 2);
    disposed.dispose();
    expect(() => body.applyImpulse(disposed)).toThrow(/disposed/);
  });
});

describe("sleepable applyImpulse on a sleeping body", () => {
  it("returns without waking the body and disposes weak arguments", () => {
    const space = new Space(new Vec2(0, 600));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 60));
    floor.shapes.add(new Polygon(Polygon.box(400, 20)));
    floor.space = space;
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(30, 30)));
    box.space = space;

    settleUntilSleeping(space, box);

    // sleepable=true on a sleeping body: early return that must consume
    // (dispose) weak Vec2 arguments without waking the body.
    const impulse = Vec2.weak(0, -100);
    const pos = Vec2.weak(1, 1);
    box.applyImpulse(impulse, pos, true);
    expect(box.isSleeping).toBe(true);

    // weak args were disposed by the call — using them now must throw
    expect(() => impulse.x).toThrow();
    expect(() => pos.x).toThrow();
  });
});

describe("collision arbiter retirement", () => {
  it("retires arbiters (returning them to the pool) when a colliding body is removed", () => {
    const space = new Space(new Vec2(0, 0));
    const a = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    a.shapes.add(new Circle(10));
    a.space = space;
    const b = new Body(BodyType.DYNAMIC, new Vec2(12, 0));
    b.shapes.add(new Circle(10));
    b.space = space;

    space.step(1 / 60, 8, 3);
    expect(space.arbiters.length).toBeGreaterThan(0);

    // Removing a body mid-contact ends the pair; stepping on drives the
    // arbiter through cleanup/retire back to the pool.
    b.space = null;
    for (let i = 0; i < 8; i++) space.step(1 / 60, 8, 3);
    expect(space.arbiters.length).toBe(0);
  });

  it("retires arbiters when bodies separate and the pair is dropped", () => {
    const space = new Space(new Vec2(0, 0));
    const a = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    a.shapes.add(new Circle(10));
    a.space = space;
    const b = new Body(BodyType.DYNAMIC, new Vec2(12, 0));
    b.shapes.add(new Circle(10));
    b.space = space;

    space.step(1 / 60, 8, 3);
    expect(space.arbiters.length).toBeGreaterThan(0);

    // Teleport far apart: fat AABBs stop overlapping, pair is destroyed,
    // ended arbiters retire after their grace period.
    b.position = new Vec2(10000, 10000);
    b.velocity = new Vec2(0, 0);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 8, 3);
    expect(space.arbiters.length).toBe(0);
  });
});

describe("re-entrant step() guard", () => {
  it("throws when step() is called from inside a step callback", () => {
    const space = new Space(new Vec2(0, 0));
    const a = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    a.shapes.add(new Circle(10));
    a.space = space;
    const b = new Body(BodyType.DYNAMIC, new Vec2(12, 0));
    b.shapes.add(new Circle(10));
    b.space = space;

    // PreListeners run inside step() (mid-step), unlike BEGIN/END callbacks
    // which are dispatched after the step completes.
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, CbType.ANY_BODY, CbType.ANY_BODY, () => {
        space.step(1 / 60);
        return null;
      }),
    );
    expect(() => space.step(1 / 60)).toThrow(/step\(\)/);
  });
});

describe("circle centered exactly on a polygon vertex", () => {
  // Degenerate deep-penetration case: the circle's center coincides with a
  // polygon vertex (distSqr < epsilon^2), on both vertex regions of the
  // reference edge. The contact must still be generated with a fallback
  // normal instead of dividing by zero.
  const CORNERS: Array<[number, number]> = [
    [-20, -15],
    [20, -15],
    [20, 15],
    [-20, 15],
  ];

  for (const [cx, cy] of CORNERS) {
    it(`generates a contact with the center on corner (${cx}, ${cy})`, () => {
      const space = new Space(new Vec2(0, 0));
      const wall = new Body(BodyType.STATIC, new Vec2(0, 0));
      wall.shapes.add(new Polygon(Polygon.box(40, 30)));
      wall.space = space;

      const ball = new Body(BodyType.DYNAMIC, new Vec2(cx, cy));
      ball.shapes.add(new Circle(8));
      ball.space = space;

      expect(() => space.step(1 / 60, 8, 3)).not.toThrow();
      // The overlap must have produced a collision arbiter and the solver
      // must push the ball out along the fallback normal.
      const arbs = space.arbiters;
      expect(arbs.length).toBeGreaterThan(0);
      for (let i = 0; i < 30; i++) space.step(1 / 60, 8, 3);
      const dx = ball.position.x - cx;
      const dy = ball.position.y - cy;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThan(0.1);
    });
  }
});
