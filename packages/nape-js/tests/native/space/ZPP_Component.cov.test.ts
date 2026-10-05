/**
 * ZPP_Component — union-find node used for island detection (issue #167).
 */
import { describe, it, expect } from "vitest";
import "../../../src/index";
import { ZPP_Component } from "../../../src/native/space/ZPP_Component";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { Circle } from "../../../src/shape/Circle";

describe("ZPP_Component — coverage", () => {
  it("a new component is its own singleton root", () => {
    const c = new ZPP_Component();
    expect(c.parent).toBe(c);
    expect(c.rank).toBe(0);
    expect(c.sleeping).toBe(false);
    expect(c.island).toBeNull();
  });

  it("reset() restores the union-find singleton state and wakes the component", () => {
    const a = new ZPP_Component();
    const root = new ZPP_Component();
    a.parent = root;
    a.rank = 3;
    a.sleeping = true;
    a.island = {};
    a.waket = 7;
    a.reset();
    expect(a.parent).toBe(a);
    expect(a.rank).toBe(0);
    expect(a.sleeping).toBe(false);
    expect(a.island).toBeNull();
    expect(a.waket).toBe(7); // not part of reset
  });

  it("free() drops the body/constraint back-references only", () => {
    const c = new ZPP_Component();
    c.body = {};
    c.constraint = {};
    c.isBody = true;
    c.sleeping = true;
    c.free();
    expect(c.body).toBeNull();
    expect(c.constraint).toBeNull();
    expect(c.isBody).toBe(true);
    expect(c.sleeping).toBe(true);
  });

  it("each body in a space owns a component pointing back at it", () => {
    const space = new Space();
    const b = new Body();
    b.shapes.add(new Circle(5));
    b.space = space;
    space.step(1 / 60);
    const comp = b.zpp_inner.component;
    expect(comp).toBeInstanceOf(ZPP_Component);
    expect(comp.isBody).toBe(true);
    expect(comp.body).toBe(b.zpp_inner);
  });
});
