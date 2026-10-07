/**
 * ZPP_Space island / sleep paths that need FLUID interactions or a woken
 * island with live arbiters:
 *
 * - doForests() unioning two DYNAMIC bodies joined only by a fluid arbiter
 *   (they must share an island: sleep together, wake together)
 * - really_wake() for an island-less (kinematic) body: its sleeping arbiters
 *   go back into the collision / fluid lists, so contact and buoyancy resume
 *   where they left off
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { FluidProperties } from "../../src/phys/FluidProperties";

const DT = 1 / 60;

function settle(space: Space, steps = 600): void {
  for (let i = 0; i < steps; i++) space.step(DT);
}

/** A dynamic body whose only shape is a fluid "bubble" of radius r. */
function bubble(space: Space, x: number, y: number, r: number): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const s = new Circle(r);
  s.fluidEnabled = true;
  s.fluidProperties = new FluidProperties(2, 4);
  b.shapes.add(s);
  b.space = space;
  return b;
}

function ball(space: Space, x: number, y: number, r = 5): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  b.space = space;
  return b;
}

describe("ZPP_Space — fluid-linked islands", () => {
  it("a dynamic body floating inside a dynamic fluid bubble shares its island", () => {
    const space = new Space(new Vec2(0, 0));
    const host = bubble(space, 0, 0, 50);
    // Start at rest: fluid drag between two dynamic bodies conserves momentum,
    // so a moving pair would drift together for a long time before sleeping.
    const guest = ball(space, 10, 0);
    let fluidSeen = false;
    for (let i = 0; i < 900; i++) {
      space.step(DT);
      if (guest.arbiters.length > 0 && guest.arbiters.at(0).isFluidArbiter()) fluidSeen = true;
      // Same island ⇒ they can never be in different sleep states.
      expect(host.isSleeping).toBe(guest.isSleeping);
    }
    expect(fluidSeen).toBe(true);
    expect(guest.isSleeping).toBe(true);

    // Waking one member wakes the whole island.
    guest.velocity = new Vec2(5, 0);
    expect(host.isSleeping).toBe(false);
    space.step(DT);
    expect(host.isSleeping).toBe(false);
    expect(guest.isSleeping).toBe(false);
  });

  it("without the fluid overlap the two bodies sleep and wake independently", () => {
    const space = new Space(new Vec2(0, 0));
    const host = bubble(space, 0, 0, 50);
    const guest = ball(space, 500, 0);
    settle(space);
    expect(host.isSleeping).toBe(true);
    expect(guest.isSleeping).toBe(true);
    guest.velocity = new Vec2(5, 0);
    space.step(DT);
    expect(guest.isSleeping).toBe(false);
    expect(host.isSleeping).toBe(true);
  });

  it("a chain of bubbles links into one island through fluid arbiters only", () => {
    const space = new Space(new Vec2(0, 0));
    // Overlapping bubbles: each pair interacts as fluid-vs-fluid. A ball sits in
    // the last one. Waking the ball must wake the far end of the chain.
    const chain = [0, 1, 2, 3, 4].map((i) => bubble(space, i * 60, 0, 40));
    const guest = ball(space, 240, 0);
    settle(space, 900);
    for (const b of chain) expect(b.isSleeping).toBe(true);
    expect(guest.isSleeping).toBe(true);
    guest.velocity = new Vec2(1, 0);
    for (const b of chain) expect(b.isSleeping).toBe(false);
  });
});

describe("ZPP_Space — waking restores sleeping arbiters", () => {
  /** Static water pool 400 wide, surface at y = 0, extends down to y = 200. */
  function pool(space: Space): Body {
    const water = new Body(BodyType.STATIC, new Vec2(0, 100));
    const s = new Polygon(Polygon.box(400, 200));
    s.fluidEnabled = true;
    s.fluidProperties = new FluidProperties(3, 2);
    water.shapes.add(s);
    water.space = space;
    return water;
  }

  it("a floating box that fell asleep keeps floating after it is woken", () => {
    const space = new Space(new Vec2(0, 300));
    pool(space);
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, -5));
    box.shapes.add(new Polygon(Polygon.box(30, 30)));
    box.space = space;
    settle(space, 1200);
    expect(box.isSleeping).toBe(true);
    const restY = box.position.y;
    expect(restY).toBeGreaterThan(-15);
    expect(restY).toBeLessThan(15);

    box.applyImpulse(new Vec2(0, 1));
    expect(box.isSleeping).toBe(false);
    for (let i = 0; i < 120; i++) {
      space.step(DT);
      expect(box.arbiters.length).toBeGreaterThan(0);
    }
    // Buoyancy resumed immediately: it did not sink through the pool.
    expect(Math.abs(box.position.y - restY)).toBeLessThan(5);
  });

  it("a stack resting on static and dynamic supports resumes contact when woken", () => {
    const space = new Space(new Vec2(0, 400));
    const ground = new Body(BodyType.STATIC, new Vec2(0, 0));
    ground.shapes.add(new Polygon(Polygon.box(400, 20)));
    ground.space = space;
    const lower = new Body(BodyType.DYNAMIC, new Vec2(0, -25));
    lower.shapes.add(new Polygon(Polygon.box(40, 30)));
    lower.space = space;
    const upper = new Body(BodyType.DYNAMIC, new Vec2(0, -55));
    upper.shapes.add(new Polygon(Polygon.box(40, 30)));
    upper.space = space;
    settle(space, 900);
    expect(lower.isSleeping).toBe(true);
    expect(upper.isSleeping).toBe(true);
    const y0 = upper.position.y;

    upper.applyImpulse(new Vec2(0, 0.01));
    expect(lower.isSleeping).toBe(false);
    for (let i = 0; i < 120; i++) space.step(DT);
    // Static-dynamic and dynamic-dynamic contacts both came back: nothing fell.
    expect(Math.abs(upper.position.y - y0)).toBeLessThan(1);
    expect(lower.arbiters.length).toBe(2);
  });

  it("a resting kinematic platform that starts moving carries its sleeping cargo", () => {
    const space = new Space(new Vec2(0, 400));
    const platform = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    platform.shapes.add(new Polygon(Polygon.box(300, 20)));
    platform.space = space;
    const crate = new Body(BodyType.DYNAMIC, new Vec2(0, -25));
    crate.shapes.add(new Polygon(Polygon.box(30, 30)));
    crate.space = space;
    settle(space, 900);
    expect(crate.isSleeping).toBe(true);
    expect(platform.isSleeping).toBe(true);

    platform.velocity = new Vec2(60, 0);
    expect(platform.isSleeping).toBe(false);
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(crate.isSleeping).toBe(false);
    // Friction from the restored contact dragged the crate along (≈ 60 px).
    expect(crate.position.x).toBeGreaterThan(40);
    expect(crate.position.y).toBeCloseTo(-25, 0);
  });

  it("a resting kinematic fluid tank that starts moving drags its floating body", () => {
    const space = new Space(new Vec2(0, 300));
    const tank = new Body(BodyType.KINEMATIC, new Vec2(0, 100));
    const water = new Polygon(Polygon.box(400, 200));
    water.fluidEnabled = true;
    water.fluidProperties = new FluidProperties(3, 8);
    tank.shapes.add(water);
    tank.space = space;
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, -5));
    box.shapes.add(new Polygon(Polygon.box(30, 30)));
    box.space = space;
    settle(space, 1200);
    expect(box.isSleeping).toBe(true);
    const restY = box.position.y;

    tank.velocity = new Vec2(40, 0);
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(box.isSleeping).toBe(false);
    // Fluid drag pulled it in the tank's direction; buoyancy still holds it up.
    expect(box.position.x).toBeGreaterThan(5);
    expect(Math.abs(box.position.y - restY)).toBeLessThan(5);
  });
});
