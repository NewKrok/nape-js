import { describe, it, expect, beforeEach } from "vitest";
import { getNape } from "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";

import "../../src/dynamics/CollisionArbiter";

/**
 * Build a scene where two balls rest on a static floor so that at least two
 * collision arbiters (with live Contact objects) exist.
 */
function createContactScene() {
  const space = new Space(new Vec2(0, 500));

  const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
  floor.shapes.add(new Polygon(Polygon.box(500, 10)));
  floor.space = space;

  const ballA = new Body(BodyType.DYNAMIC, new Vec2(-50, 0));
  ballA.shapes.add(new Circle(10));
  ballA.space = space;

  const ballB = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
  ballB.shapes.add(new Circle(10));
  ballB.space = space;

  for (let i = 0; i < 60; i++) {
    space.step(1 / 60, 10, 10);
  }
  return space;
}

/** Collect the live Contact objects of every collision arbiter in the space. */
function collectContacts(space: any): any[] {
  const out: any[] = [];
  const arbs = space.arbiters;
  const n = arbs.zpp_gl();
  for (let i = 0; i < n; i++) {
    const arb = arbs.at(i);
    if (!arb.isCollisionArbiter()) continue;
    const contacts = arb.collisionArbiter.contacts;
    const m = contacts.length;
    for (let j = 0; j < m; j++) out.push(contacts.at(j));
  }
  return out;
}

describe("ContactList mutation operations", () => {
  let nape: any;
  let space: any;
  let contacts: any[];

  beforeEach(() => {
    nape = getNape();
    space = createContactScene();
    contacts = collectContacts(space);
    expect(contacts.length).toBeGreaterThanOrEqual(2);
  });

  function emptyList(): any {
    return new nape.dynamics.ContactList();
  }

  it("push and unshift order elements correctly", () => {
    const list = emptyList();
    expect(list.push(contacts[0])).toBe(true);
    expect(list.unshift(contacts[1])).toBe(true);
    expect(list.length).toBe(2);
    expect(list.at(0)).toBe(contacts[1]);
    expect(list.at(1)).toBe(contacts[0]);
  });

  it("add appends via the list's natural end", () => {
    const list = emptyList();
    list.add(contacts[0]);
    list.add(contacts[1]);
    expect(list.length).toBe(2);
    expect(list.has(contacts[0])).toBe(true);
    expect(list.has(contacts[1])).toBe(true);
  });

  it("pop removes and returns the last element", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.push(contacts[1]);
    const popped = list.pop();
    expect(popped).toBe(contacts[1]);
    expect(list.length).toBe(1);
  });

  it("shift removes and returns the first element", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.push(contacts[1]);
    const shifted = list.shift();
    expect(shifted).toBe(contacts[0]);
    expect(list.length).toBe(1);
    expect(list.at(0)).toBe(contacts[1]);
  });

  it("remove deletes a present element and reports a missing one", () => {
    const list = emptyList();
    list.push(contacts[0]);
    expect(list.remove(contacts[0])).toBe(true);
    expect(list.length).toBe(0);
    expect(list.remove(contacts[1])).toBe(false);
  });

  it("merge adds only elements not already present", () => {
    const a = emptyList();
    const b = emptyList();
    a.push(contacts[0]);
    b.push(contacts[0]);
    b.push(contacts[1]);
    a.merge(b);
    expect(a.length).toBe(2);
    expect(a.has(contacts[1])).toBe(true);
  });

  it("clear empties a mutable list", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.push(contacts[1]);
    list.clear();
    expect(list.length).toBe(0);
    expect(list.empty()).toBe(true);
  });

  it("toString renders the elements", () => {
    const list = emptyList();
    expect(list.toString()).toBe("[]");
    list.push(contacts[0]);
    const str = list.toString();
    expect(str.startsWith("[")).toBe(true);
    expect(str.endsWith("]")).toBe(true);
    expect(str.length).toBeGreaterThan(2);
  });

  it("foreach visits every element and stops on a throwing lambda", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.push(contacts[1]);

    const seen: any[] = [];
    list.foreach((c: any) => seen.push(c));
    expect(seen.length).toBe(2);

    expect(() => list.foreach(null)).toThrow("null");

    let visits = 0;
    list.foreach(() => {
      visits++;
      throw new Error("stop");
    });
    expect(visits).toBe(1);
  });

  it("filter keeps matching elements and removes the rest", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.push(contacts[1]);

    list.filter((c: any) => c === contacts[0]);
    expect(list.length).toBe(1);
    expect(list.at(0)).toBe(contacts[0]);

    expect(() => list.filter(null)).toThrow("null");
  });

  it("supports for...of iteration and spread", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.push(contacts[1]);

    const viaForOf: any[] = [];
    for (const c of list) viaForOf.push(c);
    expect(viaForOf.length).toBe(2);

    const viaSpread = [...list];
    expect(viaSpread.length).toBe(2);
    expect(viaSpread[0]).toBe(viaForOf[0]);
  });

  it("iterator() walks the same elements as at()", () => {
    const list = emptyList();
    list.push(contacts[0]);
    list.push(contacts[1]);

    const it = list.iterator();
    const collected: any[] = [];
    while (it.hasNext()) collected.push(it.next());
    expect(collected.length).toBe(2);
    expect(collected[0]).toBe(list.at(0));
    expect(collected[1]).toBe(list.at(1));
  });
});
