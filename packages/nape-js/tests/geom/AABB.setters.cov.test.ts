/**
 * AABB min/max setters — lazily validated sources, weak sources, rejection.
 *
 * Checks the setters' observable contract: the box takes the source's
 * coordinates (read through its _validate hook when it has one, e.g.
 * body.position), keeps width/height consistent, consumes weak Vec2s, and
 * rejects disposed / null / inverted assignments without changing the box.
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";

const box = (a: AABB) => [a.min.x, a.min.y, a.max.x, a.max.y];

describe("AABB min/max setters", () => {
  it("min and max read lazily validated sources (body.position)", () => {
    const a = new AABB(0, 0, 10, 10);
    const lo = new Body();
    lo.position.setxy(-3, -4);
    const hi = new Body();
    hi.position.setxy(20, 30);
    a.min = lo.position;
    expect(box(a)).toEqual([-3, -4, 10, 10]);
    a.max = hi.position;
    expect(box(a)).toEqual([-3, -4, 20, 30]);
    expect(a.width).toBe(23);
    expect(a.height).toBe(34);
    // The source is copied, not aliased.
    lo.position.setxy(100, 100);
    expect(box(a)).toEqual([-3, -4, 20, 30]);
    expect(lo.position.zpp_disp).toBe(false);
  });

  it("weak sources are consumed (disposed) after assignment, also back to back", () => {
    const a = new AABB(0, 0, 10, 10);
    const w1 = Vec2.weak(1, 2);
    const w2 = Vec2.weak(8, 9);
    a.min = w1;
    a.max = w2;
    expect(box(a)).toEqual([1, 2, 8, 9]);
    expect(w1.zpp_disp).toBe(true);
    expect(w2.zpp_disp).toBe(true);
    // Pooled wrappers come back as fresh, independent Vec2s.
    const p = Vec2.get(5, 6);
    const q = Vec2.get(7, 8);
    expect([p.x, p.y, q.x, q.y]).toEqual([5, 6, 7, 8]);
    expect(box(a)).toEqual([1, 2, 8, 9]);
  });

  it("assigning the same value is a no-op and keeps the box", () => {
    const a = new AABB(1, 2, 3, 4);
    a.min = new Vec2(1, 2);
    a.max = new Vec2(4, 6);
    expect(box(a)).toEqual([1, 2, 4, 6]);
  });

  it("rejects disposed, null and inverting assignments without changing the box", () => {
    const a = new AABB(0, 0, 10, 10);
    const dead = new Vec2(1, 1);
    dead.dispose();
    expect(() => {
      a.min = dead;
    }).toThrow("Vec2 has been disposed and cannot be used!");
    expect(() => {
      a.max = dead;
    }).toThrow("Vec2 has been disposed and cannot be used!");
    expect(() => {
      a.min = null as any;
    }).toThrow("Cannot assign null to AABB::min");
    expect(() => {
      a.min = new Vec2(11, 0);
    }).toThrow("Assignment would cause negative width");
    expect(() => {
      a.min = new Vec2(0, 11);
    }).toThrow("Assignment would cause negative height");
    expect(() => {
      a.max = new Vec2(-1, 5);
    }).toThrow("Assignment would cause negative width");
    expect(() => {
      a.max = new Vec2(5, -1);
    }).toThrow("Assignment would cause negative height");
    expect(box(a)).toEqual([0, 0, 10, 10]);
  });

  it("_wrap returns null for anything that is not an AABB / ZPP_AABB", () => {
    expect(AABB._wrap(null)).toBeNull();
    expect(AABB._wrap({})).toBeNull();
    const a = new AABB(0, 0, 1, 1);
    expect(AABB._wrap(a)).toBe(a);
    expect(AABB._wrap(a.zpp_inner)).toBe(a);
  });
});
