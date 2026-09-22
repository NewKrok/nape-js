/**
 * Mutation and traversal helpers of the factory-generated engine lists,
 * exercised through the real Body.shapes / Space.bodies / Space.constraints
 * lists so the engine hooks (adders / subbers) run too.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { ShapeList, BodyList } from "../../src/util/registerLists";
import type { Shape } from "../../src/shape/Shape";
import "../../src/index";

function ball(x = 0): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
  b.shapes.add(new Circle(10));
  return b;
}

describe("Body.shapes mutation", () => {
  it("push / unshift / pop / shift move shapes on and off the body", () => {
    const b = new Body();
    const c1 = new Circle(1);
    const c2 = new Circle(2);
    const c3 = new Circle(3);
    expect(b.shapes.push(c1)).toBe(true);
    expect(b.shapes.unshift(c2)).toBe(true);
    expect(b.shapes.push(c3)).toBe(true);
    expect([...b.shapes].map((s) => (s as Circle).radius)).toEqual([2, 1, 3]);
    expect(c1.body).toBe(b);

    expect(b.shapes.pop()).toBe(c3);
    expect(c3.body).toBeNull();
    expect(b.shapes.shift()).toBe(c2);
    expect(c2.body).toBeNull();
    expect(b.shapes.length).toBe(1);
    expect(b.shapes.at(0)).toBe(c1);
  });

  it("clear() detaches every shape", () => {
    const b = new Body();
    const shapes = [new Circle(1), new Circle(2), new Polygon(Polygon.box(4, 4))];
    for (const s of shapes) b.shapes.add(s);
    b.shapes.clear();
    expect(b.shapes.length).toBe(0);
    expect(b.shapes.empty()).toBe(true);
    for (const s of shapes) expect(s.body).toBeNull();
  });

  it("pop / shift on an empty list throw", () => {
    const b = new Body();
    expect(() => b.shapes.pop()).toThrow(/empty/);
    expect(() => b.shapes.shift()).toThrow(/empty/);
  });

  it("merge adds only the shapes not already present", () => {
    const b = new Body();
    const shared = new Circle(1);
    b.shapes.add(shared);
    const extra = new ShapeList();
    extra.push(shared);
    extra.push(new Circle(2));
    b.shapes.merge(extra);
    expect(b.shapes.length).toBe(2);
    expect(() => b.shapes.merge(null as unknown as ShapeList)).toThrow();
  });

  it("foreach stops at a throwing lambda and filter removes rejected shapes", () => {
    const b = new Body();
    b.shapes.push(new Circle(1));
    b.shapes.push(new Circle(2));
    b.shapes.push(new Circle(3));

    const visited: number[] = [];
    b.shapes.foreach((s: Shape) => {
      visited.push((s as Circle).radius);
      if ((s as Circle).radius === 2) throw new Error("stop");
    });
    expect(visited).toEqual([1, 2]);
    expect(() => b.shapes.foreach(null as unknown as (s: Shape) => void)).toThrow();

    const filtered = b.shapes.filter((s: Shape) => (s as Circle).radius !== 2);
    expect(filtered).toBe(b.shapes);
    expect([...b.shapes].map((s) => (s as Circle).radius)).toEqual([1, 3]);
    expect(() => b.shapes.filter(null as unknown as (s: Shape) => boolean)).toThrow();
  });

  it("copy / toArray / toString / iterator", () => {
    const b = new Body();
    b.shapes.add(new Circle(1));
    b.shapes.add(new Circle(2));
    const copy = b.shapes.copy();
    expect(copy).not.toBe(b.shapes);
    expect(copy.length).toBe(2);
    expect(copy.at(0)).toBe(b.shapes.at(0));
    // Shapes are not element-copyable through the list API.
    expect(() => b.shapes.copy(true)).toThrow(/copyable/);
    expect(b.shapes.toArray()).toHaveLength(2);
    expect(b.shapes.toString()).toMatch(/^\[.*\]$/);
    const it = b.shapes.iterator();
    let n = 0;
    while (it.hasNext()) {
      it.next();
      n++;
    }
    expect(n).toBe(2);
  });
});

describe("Space list mutation", () => {
  it("bodies.clear() empties the space and detaches the bodies", () => {
    const space = new Space();
    const bodies = [ball(0), ball(50), ball(100)];
    for (const b of bodies) space.bodies.add(b);
    expect(space.bodies.length).toBe(3);

    space.bodies.clear();
    expect(space.bodies.length).toBe(0);
    for (const b of bodies) expect(b.space).toBeNull();
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("bodies.pop() / shift() remove from either end", () => {
    const space = new Space();
    const a = ball(0);
    const b = ball(50);
    space.bodies.add(a);
    space.bodies.add(b);
    const popped = space.bodies.pop();
    const shifted = space.bodies.shift();
    expect(new Set([popped, shifted])).toEqual(new Set([a, b]));
    expect(space.bodies.length).toBe(0);
    expect(a.space).toBeNull();
    expect(b.space).toBeNull();
  });

  it("constraints.clear() detaches constraints from bodies", () => {
    const space = new Space();
    const a = ball(0);
    const b = ball(50);
    space.bodies.add(a);
    space.bodies.add(b);
    const j = new PivotJoint(a, b, new Vec2(), new Vec2());
    space.constraints.add(j);
    expect(a.constraints.length).toBe(1);
    space.constraints.clear();
    expect(space.constraints.length).toBe(0);
    expect(j.space).toBeNull();
    expect(a.constraints.length).toBe(0);
  });

  it("derived lists are immutable and merge into a fresh BodyList works", () => {
    const space = new Space();
    space.bodies.add(ball(0));
    space.step(1 / 60);
    expect(() => space.liveBodies.pop()).toThrow(/immutable/);
    expect(() => space.liveBodies.clear()).toThrow(/immutable/);

    const collected = new BodyList();
    collected.merge(space.bodies);
    collected.merge(space.liveBodies); // duplicates are skipped
    expect(collected.length).toBe(1);
  });

  it("static fromArray builds a list and rejects null", () => {
    const list = BodyList.fromArray([ball(0), ball(1)]);
    expect(list.length).toBe(2);
    expect(() => BodyList.fromArray(null as unknown as Body[])).toThrow();
  });
});
