/**
 * Arbiter state, pooling and material blending edge cases.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { Material } from "../../src/phys/Material";
import { CbType } from "../../src/callbacks/CbType";
import { PreListener } from "../../src/callbacks/PreListener";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { PreFlag } from "../../src/callbacks/PreFlag";
import type { Arbiter } from "../../src/dynamics/Arbiter";
import type { CollisionArbiter } from "../../src/dynamics/CollisionArbiter";
import "../../src/index";

function ballOnFloor(materialBall?: Material, materialFloor?: Material) {
  const space = new Space(new Vec2(0, 600));
  const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
  const floorShape = new Polygon(Polygon.box(400, 20));
  if (materialFloor) floorShape.material = materialFloor;
  floor.shapes.add(floorShape);
  space.bodies.add(floor);

  const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 20));
  const ballShape = new Circle(10);
  if (materialBall) ballShape.material = materialBall;
  ball.shapes.add(ballShape);
  space.bodies.add(ball);
  return { space, ball, floor };
}

/** Steps until `pred` holds (or `max` steps elapsed). */
function stepUntil(space: Space, pred: () => boolean, max = 240): boolean {
  for (let i = 0; i < max; i++) {
    if (pred()) return true;
    space.step(1 / 60);
  }
  return pred();
}

function firstArbiter(space: Space): Arbiter {
  expect(stepUntil(space, () => space.arbiters.length > 0)).toBe(true);
  return space.arbiters.at(0) as Arbiter;
}

describe("Arbiter.state reflects the PreListener decision", () => {
  function withPre(flag: PreFlag | null) {
    const { space, ball } = ballOnFloor();
    const tag = new CbType();
    ball.cbTypes.add(tag);
    let seen: Arbiter | null = null;
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, tag, CbType.ANY_BODY, (cb) => {
        seen = cb.arbiter;
        return flag;
      }),
    );
    stepUntil(space, () => seen != null);
    return { space, ball, arbiter: seen as Arbiter | null };
  }

  it("ACCEPT", () => {
    const { arbiter, space, ball } = withPre(PreFlag.ACCEPT);
    expect(arbiter).not.toBeNull();
    expect(arbiter!.state).toBe(PreFlag.ACCEPT);
    for (let i = 0; i < 60; i++) space.step(1 / 60);
    // The ball rests on the floor (top edge at y = 40, radius 10).
    expect(ball.position.y).toBeLessThan(40);
  });

  it("IGNORE lets the ball fall straight through the floor", () => {
    const { arbiter, ball, space } = withPre(PreFlag.IGNORE);
    expect(arbiter).not.toBeNull();
    expect(arbiter!.state).toBe(PreFlag.IGNORE);
    for (let i = 0; i < 60; i++) space.step(1 / 60);
    expect(ball.position.y).toBeGreaterThan(60);
  });

  it("IGNORE_ONCE re-queries the listener on the next step", () => {
    const { arbiter } = withPre(PreFlag.IGNORE_ONCE);
    expect(arbiter).not.toBeNull();
    expect(arbiter!.state).toBe(PreFlag.IGNORE_ONCE);
  });

  it("ACCEPT_ONCE is the default when the handler returns null", () => {
    const { arbiter } = withPre(null);
    expect(arbiter).not.toBeNull();
    expect(arbiter!.state).toBe(PreFlag.ACCEPT_ONCE);
  });
});

describe("Arbiter impulses and pooling", () => {
  it("totalImpulse(body) reports the impulse applied to that body", () => {
    const { space, ball, floor } = ballOnFloor();
    const arb = firstArbiter(space);
    space.step(1 / 60);

    const onBall = arb.totalImpulse(ball);
    const onFloor = arb.totalImpulse(floor);
    const combined = arb.totalImpulse();
    // The ball is pushed up, the floor down; the raw impulse is non-zero.
    expect(onBall.y).toBeLessThan(0);
    expect(onFloor.y).toBeGreaterThan(0);
    expect(combined.y).not.toBe(0);
    expect(() => arb.totalImpulse(new Body())).toThrow();
  });

  it("toString marks an arbiter that went back to the pool", () => {
    const { space, ball } = ballOnFloor();
    const arb = firstArbiter(space);
    expect(arb.toString()).toContain("CollisionArbiter");

    // Removing the ball ends the interaction; once the arbiter has expired
    // it is recycled and reports itself as pooled.
    space.bodies.remove(ball);
    for (let i = 0; i < 30; i++) space.step(1 / 60);
    expect(arb.toString()).toContain("object-pooled");
  });

  it("re-uses a pooled arbiter for a later contact with reset overrides", () => {
    const space = new Space(new Vec2(0, 600));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(400, 20)));
    space.bodies.add(floor);
    const tag = new CbType();

    // Override elasticity from a pre-handler for the first contact only.
    let overrideNext = true;
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, tag, CbType.ANY_BODY, (cb) => {
        if (overrideNext) {
          cb.arbiter.collisionArbiter!.elasticity = 0.9;
          overrideNext = false;
        }
        return PreFlag.ACCEPT;
      }),
    );

    const drop = () => {
      const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 20));
      ball.shapes.add(new Circle(10));
      ball.cbTypes.add(tag);
      space.bodies.add(ball);
      const arb = firstArbiter(space).collisionArbiter!;
      return { ball, arb };
    };

    const first = drop();
    expect(first.arb.elasticity).toBe(0.9);
    space.bodies.remove(first.ball);
    for (let i = 0; i < 20; i++) space.step(1 / 60);
    expect(space.arbiters.length).toBe(0);

    const second = drop();
    // Pool recycling must not leak the previous override.
    expect(second.arb.elasticity).toBeCloseTo(0, 6);
  });
});

describe("Material blending on a CollisionArbiter", () => {
  function arbiterFor(ball: Material, floor: Material): CollisionArbiter {
    const { space } = ballOnFloor(ball, floor);
    return firstArbiter(space).collisionArbiter!;
  }

  it("averages finite elasticities and clamps to [0, 1]", () => {
    expect(arbiterFor(new Material(0.2), new Material(0.6)).elasticity).toBeCloseTo(0.4, 6);
    expect(arbiterFor(new Material(1.5), new Material(1.5)).elasticity).toBe(1);
    expect(arbiterFor(new Material(-1), new Material(0.5)).elasticity).toBe(0);
  });

  it("+Infinity on either side forces a perfectly elastic contact", () => {
    expect(arbiterFor(new Material(Infinity), new Material(0)).elasticity).toBe(1);
  });

  it("-Infinity on either side forces a perfectly inelastic contact", () => {
    expect(arbiterFor(new Material(0.5), new Material(-Infinity)).elasticity).toBe(0);
    // -Infinity wins over +Infinity.
    expect(arbiterFor(new Material(-Infinity), new Material(Infinity)).elasticity).toBe(0);
  });

  it("friction values combine geometrically", () => {
    const arb = arbiterFor(new Material(0, 4, 9, 1, 0.16), new Material(0, 1, 1, 1, 0.01));
    expect(arb.dynamicFriction).toBeCloseTo(2, 6);
    expect(arb.staticFriction).toBeCloseTo(3, 6);
    expect(arb.rollingFriction).toBeCloseTo(0.04, 6);
  });
});

describe("FluidArbiter position", () => {
  it("exposes the overlap centroid and lets a pre-handler move it", () => {
    const space = new Space(new Vec2(0, 600));
    const water = new Body(BodyType.STATIC, new Vec2(0, 100));
    const box = new Polygon(Polygon.box(400, 200));
    box.fluidEnabled = true;
    box.fluidProperties.density = 3;
    water.shapes.add(box);
    space.bodies.add(water);

    const tag = new CbType();
    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 100));
    ball.shapes.add(new Circle(10));
    ball.cbTypes.add(tag);
    space.bodies.add(ball);

    let firstPos: { x: number; y: number } | null = null;
    let moved: { x: number; y: number } | null = null;
    space.listeners.add(
      new PreListener(InteractionType.FLUID, tag, CbType.ANY_BODY, (cb) => {
        const fa = cb.arbiter.fluidArbiter!;
        const pos = fa.position;
        expect(fa.position).toBe(pos); // cached wrapper
        if (firstPos == null) firstPos = { x: pos.x, y: pos.y };
        fa.position = new Vec2(5, 7);
        moved = { x: fa.position.x, y: fa.position.y };
        expect(fa.overlap).toBeGreaterThan(0);
        return PreFlag.ACCEPT_ONCE;
      }),
    );
    for (let i = 0; i < 3; i++) space.step(1 / 60);

    expect(firstPos).not.toBeNull();
    expect(firstPos!.x).toBeCloseTo(0, 3);
    expect(firstPos!.y).toBeCloseTo(100, 1);
    expect(moved).toEqual({ x: 5, y: 7 });

    const arb = space.arbiters.at(0) as Arbiter;
    expect(arb.fluidArbiter!.toString()).toContain("FluidArbiter");
    expect(() => {
      arb.fluidArbiter!.position = new Vec2(1, 1);
    }).toThrow(/pre-handler/);
  });
});
