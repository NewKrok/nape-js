/**
 * Space lifecycle — sleep, the wake paths, and clear() on a mixed scene.
 *
 * The scene has every arbiter kind at once (collision stack, a sensor and a
 * fluid pool overlapping it), joints, and a compound. That gives bodies
 * several arbiters of different kinds each, which is what ZPP_Space.clear()'s
 * unlink-from-the-middle-of-a-list branches and the sleeping-arbiter restore
 * paths in really_wake / wakeIsland need; single-pair tests never get there.
 * Waking a compound through its interactor (adding a CbType) reaches
 * ZPP_Space.wakeCompound, which no test called.
 *
 * Every step asserts observable state rather than coverage: who is asleep,
 * that arbiters come back after waking, and that a cleared space leaves its
 * bodies detached and reusable.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Polygon } from "../../src/shape/Polygon";
import { Circle } from "../../src/shape/Circle";
import { Compound } from "../../src/phys/Compound";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { CbType } from "../../src/callbacks/CbType";
import { FluidProperties } from "../../src/phys/FluidProperties";

interface Scene {
  space: Space;
  floor: Body;
  stack: Body[];
  compound: Compound;
  compoundBodies: Body[];
  sensor: Body;
  pool: Body;
  bodies: Body[];
}

function box(x: number, y: number, w = 20, h = 20): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function buildScene(): Scene {
  const space = new Space(new Vec2(0, 400));

  const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
  floor.shapes.add(new Polygon(Polygon.box(1000, 20)));
  floor.space = space;

  // A stack of boxes, the bottom two joined by a pivot.
  const stack: Body[] = [];
  for (let i = 0; i < 5; i++) {
    const b = box(0, 179 - i * 20.5);
    b.space = space;
    stack.push(b);
  }
  new PivotJoint(stack[0], stack[1], new Vec2(0, -10), new Vec2(0, 10)).space = space;

  // A compound of two welded boxes resting on the floor.
  const compound = new Compound();
  const c1 = box(100, 179);
  const c2 = box(121, 179);
  c1.compound = compound;
  c2.compound = compound;
  new WeldJoint(c1, c2, new Vec2(10.5, 0), new Vec2(-10.5, 0)).compound = compound;
  compound.space = space;

  // A static sensor overlapping the stack, and a shallow static fluid pool
  // around the bottom of the stack.
  const sensor = new Body(BodyType.STATIC, new Vec2(0, 150));
  const ss = new Circle(30);
  ss.sensorEnabled = true;
  sensor.shapes.add(ss);
  sensor.space = space;

  const pool = new Body(BodyType.STATIC, new Vec2(0, 180));
  const ps = new Polygon(Polygon.box(60, 20));
  ps.fluidEnabled = true;
  ps.fluidProperties = new FluidProperties(0.1, 1);
  pool.shapes.add(ps);
  pool.space = space;

  const bodies = [floor, ...stack, c1, c2, sensor, pool];
  return { space, floor, stack, compound, compoundBodies: [c1, c2], sensor, pool, bodies };
}

const dynamic = (s: Scene) => [...s.stack, ...s.compoundBodies];

function stepUntilAsleep(s: Scene, maxSteps = 3000): number {
  for (let i = 0; i < maxSteps; i++) {
    s.space.step(1 / 60);
    if (dynamic(s).every((b) => b.isSleeping)) return i + 1;
  }
  return -1;
}

describe("Space lifecycle — sleeping", () => {
  it("the mixed scene settles and every dynamic body falls asleep", () => {
    const s = buildScene();
    expect(stepUntilAsleep(s)).toBeGreaterThan(0);
    // Sleeping bodies keep their arbiters (collision, sensor and fluid).
    const bottom = s.stack[0];
    expect(bottom.arbiters.length).toBeGreaterThanOrEqual(3);
    const kinds = new Set<string>();
    for (let i = 0; i < bottom.arbiters.length; i++) {
      const a = bottom.arbiters.at(i);
      kinds.add(a.isCollisionArbiter() ? "col" : a.isSensorArbiter() ? "sensor" : "fluid");
    }
    expect(kinds).toEqual(new Set(["col", "sensor", "fluid"]));
  });

  it("waking a compound through its interactor wakes its bodies", () => {
    const s = buildScene();
    expect(stepUntilAsleep(s)).toBeGreaterThan(0);
    const before = s.compoundBodies.map((b) => b.arbiters.length);

    s.compound.cbTypes.add(new CbType());

    for (const b of s.compoundBodies) expect(b.isSleeping).toBe(false);
    // The stack is a separate island and stays asleep.
    for (const b of s.stack) expect(b.isSleeping).toBe(true);
    s.space.step(1 / 60);
    expect(s.compoundBodies.map((b) => b.arbiters.length)).toEqual(before);
  });

  it("waking one body of an island wakes the island and restores its arbiters", () => {
    const s = buildScene();
    expect(stepUntilAsleep(s)).toBeGreaterThan(0);
    const counts = s.stack.map((b) => b.arbiters.length);

    s.stack[4].velocity = new Vec2(0, -1);

    for (const b of s.stack) expect(b.isSleeping).toBe(false);
    for (const b of s.compoundBodies) expect(b.isSleeping).toBe(true);
    s.space.step(1 / 60);
    expect(s.stack.map((b) => b.arbiters.length)).toEqual(counts);
    // And it settles again.
    expect(stepUntilAsleep(s)).toBeGreaterThan(0);
  });

  it("a joint added to a sleeping body wakes it", () => {
    const s = buildScene();
    expect(stepUntilAsleep(s)).toBeGreaterThan(0);
    const j = new PivotJoint(s.floor, s.stack[2], new Vec2(0, -60), new Vec2(0, 0));
    j.space = s.space;
    expect(s.stack[2].isSleeping).toBe(false);
    s.space.step(1 / 60);
    expect(j.space).toBe(s.space);
  });
});

describe("Space lifecycle — kinematic bodies", () => {
  it("a resting kinematic platform sleeps with its load and wakes with it", () => {
    // A kinematic body at rest is parked outside the island forest; waking it
    // goes through really_wake's island-less path, which must restore the
    // sleeping arbiters it shares with the box on top.
    const space = new Space(new Vec2(0, 400));
    const platform = new Body(BodyType.KINEMATIC, new Vec2(0, 100));
    platform.shapes.add(new Polygon(Polygon.box(200, 10)));
    platform.space = space;
    const load = box(0, 84.5);
    load.space = space;

    let slept = false;
    for (let i = 0; i < 3000 && !slept; i++) {
      space.step(1 / 60);
      slept = load.isSleeping && platform.isSleeping;
    }
    expect(slept).toBe(true);
    expect(load.arbiters.length).toBe(1);

    platform.velocity = new Vec2(30, 0);
    expect(platform.isSleeping).toBe(false);
    expect(load.isSleeping).toBe(false);
    expect(load.arbiters.length).toBe(1);

    const x0 = load.position.x;
    for (let i = 0; i < 60; i++) space.step(1 / 60);
    // Friction carries the load along with the platform.
    expect(load.position.x - x0).toBeGreaterThan(5);
    expect(load.arbiters.length).toBe(1);
  });
});

describe("Space lifecycle — clear()", () => {
  function expectCleared(s: Scene): void {
    expect(s.space.bodies.length).toBe(0);
    expect(s.space.liveBodies.length).toBe(0);
    expect(s.space.compounds.length).toBe(0);
    expect(s.space.constraints.length).toBe(0);
    expect(s.space.arbiters.length).toBe(0);
    for (const b of s.bodies) {
      expect(b.space).toBeNull();
      expect(b.arbiters.length).toBe(0);
    }
    expect(s.compound.space).toBeNull();
  }

  it("clears a scene with awake, multi-arbiter bodies", () => {
    const s = buildScene();
    for (let i = 0; i < 30; i++) s.space.step(1 / 60);
    expect(s.space.arbiters.length).toBeGreaterThan(5);
    s.space.clear();
    expectCleared(s);
  });

  it("clears a scene whose bodies and arbiters are asleep", () => {
    const s = buildScene();
    expect(stepUntilAsleep(s)).toBeGreaterThan(0);
    s.space.clear();
    expectCleared(s);
  });

  it("cleared bodies can be re-added and simulated again", () => {
    const s = buildScene();
    for (let i = 0; i < 30; i++) s.space.step(1 / 60);
    s.space.clear();

    const fresh = new Space(new Vec2(0, 400));
    for (const b of [s.floor, ...s.stack, s.sensor, s.pool]) b.space = fresh;
    s.compound.space = fresh;
    for (let i = 0; i < 30; i++) fresh.step(1 / 60);
    expect(fresh.arbiters.length).toBeGreaterThan(5);
    // Nothing fell through the floor.
    for (const b of dynamic(s)) expect(b.position.y).toBeLessThan(200);
  });

  it("clear() on an empty space and twice in a row is harmless", () => {
    const s = buildScene();
    s.space.clear();
    s.space.clear();
    expectCleared(s);
    new Space().clear();
  });
});
