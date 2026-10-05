/**
 * ZPP_SimpleVert — pooled vertex for simple-polygon sweeps: pool reuse, link
 * set recycling and xy ordering (issue #167).
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/index";
import { ZPP_SimpleVert } from "../../../src/native/geom/ZPP_SimpleVert";
import { ZPP_Set_ZPP_SimpleVert } from "../../../src/native/util/ZNPRegistry";

describe("ZPP_SimpleVert — coverage", () => {
  beforeEach(() => {
    ZPP_SimpleVert.zpp_pool = null;
    ZPP_Set_ZPP_SimpleVert.zpp_pool = null;
  });

  it("get() constructs a vertex with an empty, xy-ordered link set when the pool is empty", () => {
    const v = ZPP_SimpleVert.get(3, 4);
    expect([v.x, v.y]).toEqual([3, 4]);
    expect(v.links).toBeInstanceOf(ZPP_Set_ZPP_SimpleVert);
    expect(v.links.empty()).toBe(true);
    expect(v.links.lt).toBe(ZPP_SimpleVert.less_xy);
  });

  it("each vertex gets a unique id", () => {
    const a = ZPP_SimpleVert.get(0, 0);
    const b = ZPP_SimpleVert.get(0, 0);
    expect(a.id).not.toBe(b.id);
  });

  it("free() + pool → get() returns the same vertex with new coordinates and cleared state", () => {
    const a = ZPP_SimpleVert.get(1, 1);
    const b = ZPP_SimpleVert.get(2, 2);
    a.links.insert(b);
    a.forced = true;
    a.node = {};
    const links = a.links;
    a.free();
    expect(a.links.empty()).toBe(true);
    expect(a.node).toBeNull();
    expect(a.forced).toBe(false);
    a.next = ZPP_SimpleVert.zpp_pool;
    ZPP_SimpleVert.zpp_pool = a;

    const c = ZPP_SimpleVert.get(9, 8);
    expect(c).toBe(a);
    expect(c.links).toBe(links); // link set survives recycling
    expect([c.x, c.y]).toEqual([9, 8]);
    expect(c.next).toBeNull();
    expect(ZPP_SimpleVert.zpp_pool).toBeNull();
  });

  it("free() returns the link set's tree nodes to the set pool; new vertices reuse a pooled set", () => {
    const a = ZPP_SimpleVert.get(0, 0);
    a.links.insert(ZPP_SimpleVert.get(1, 0));
    a.links.insert(ZPP_SimpleVert.get(2, 0));
    a.free();
    // The two tree nodes went to the subclass pool.
    const n1 = ZPP_Set_ZPP_SimpleVert.zpp_pool!;
    expect(n1).not.toBeNull();
    expect(n1.next).not.toBeNull();
    // A freshly-constructed vertex takes its link set from that pool.
    const fresh = new ZPP_SimpleVert();
    expect(fresh.links).toBe(n1);
    expect(fresh.links.next).toBeNull();
    expect(fresh.links.lt).toBe(ZPP_SimpleVert.less_xy);
  });

  it("less_xy orders by y, then x", () => {
    const p = (x: number, y: number) => ({ x, y }) as ZPP_SimpleVert;
    expect(ZPP_SimpleVert.less_xy(p(5, 1), p(0, 2))).toBe(true);
    expect(ZPP_SimpleVert.less_xy(p(0, 2), p(5, 1))).toBe(false);
    expect(ZPP_SimpleVert.less_xy(p(1, 3), p(2, 3))).toBe(true);
    expect(ZPP_SimpleVert.less_xy(p(2, 3), p(1, 3))).toBe(false);
    expect(ZPP_SimpleVert.less_xy(p(2, 3), p(2, 3))).toBe(false);
  });

  it("the link set keeps neighbours sorted by less_xy", () => {
    const v = ZPP_SimpleVert.get(0, 0);
    const ns = [
      [3, 1],
      [1, 1],
      [0, 5],
      [2, -1],
    ].map(([x, y]) => ZPP_SimpleVert.get(x, y));
    for (const n of ns) v.links.insert(n);
    const order: number[][] = [];
    while (!v.links.empty()) {
      const n = v.links.pop_front();
      order.push([n.x, n.y]);
    }
    expect(order).toEqual([
      [2, -1],
      [1, 1],
      [3, 1],
      [0, 5],
    ]);
  });

  it("swap_nodes exchanges the node back-references", () => {
    const a = ZPP_SimpleVert.get(0, 0);
    const b = ZPP_SimpleVert.get(1, 1);
    const na = {};
    const nb = {};
    a.node = na;
    b.node = nb;
    ZPP_SimpleVert.swap_nodes(a, b);
    expect(a.node).toBe(nb);
    expect(b.node).toBe(na);
  });
});
