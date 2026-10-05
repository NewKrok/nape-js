/**
 * ZPP_PubPool — free-list correctness of the public object pools (issue #167).
 *
 * ZPP_PubPool holds three FIFO free-lists (Vec2, Vec3, GeomPoly). Each one is a
 * singly-linked list threaded through the objects' `zpp_pool` field, with
 * `poolX` the head (next object handed out) and `nextX` the tail (where the
 * next disposed object is appended). These tests drive the pools through
 * their public faces — Vec2.get()/weak()/dispose(), Vec3.get()/dispose(),
 * GeomPoly.get()/dispose() — and check the head/tail bookkeeping directly.
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/index";
import { Vec2 } from "../../../src/geom/Vec2";
import { Vec3 } from "../../../src/geom/Vec3";
import { GeomPoly } from "../../../src/geom/GeomPoly";
import { Body } from "../../../src/phys/Body";
import { ZPP_PubPool } from "../../../src/native/util/ZPP_PubPool";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";

/** Walk a public free-list from its head and return the members in order. */
function walk(head: any): any[] {
  const out: any[] = [];
  let cur = head;
  while (cur != null) {
    out.push(cur);
    if (out.length > 10_000) throw new Error("free-list cycle");
    cur = cur.zpp_pool;
  }
  return out;
}

/** Assert the head/tail pair of a pool describes a well-formed list. */
function expectWellFormed(head: any, tail: any): any[] {
  const members = walk(head);
  if (members.length === 0) {
    expect(tail).toBeNull();
  } else {
    expect(tail).toBe(members[members.length - 1]);
    expect(tail.zpp_pool).toBeNull();
    for (const m of members) expect(m.zpp_disp).toBe(true);
  }
  return members;
}

function resetPools(): void {
  ZPP_PubPool.poolVec2 = null;
  ZPP_PubPool.nextVec2 = null;
  ZPP_PubPool.poolVec3 = null;
  ZPP_PubPool.nextVec3 = null;
  ZPP_PubPool.poolGeomPoly = null;
  ZPP_PubPool.nextGeomPoly = null;
}

describe("ZPP_PubPool — Vec2 pool", () => {
  beforeEach(resetPools);

  it("dispose appends to the tail; get hands objects back in FIFO order", () => {
    const vs = [Vec2.get(1, 1), Vec2.get(2, 2), Vec2.get(3, 3)];
    for (const v of vs) v.dispose();

    const members = expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2);
    expect(members).toEqual(vs);

    const again = [Vec2.get(10, 0), Vec2.get(20, 0), Vec2.get(30, 0)];
    expect(again[0]).toBe(vs[0]);
    expect(again[1]).toBe(vs[1]);
    expect(again[2]).toBe(vs[2]);
    expect(again.map((v) => v.x)).toEqual([10, 20, 30]);
    expect(again.every((v) => !v.zpp_disp)).toBe(true);
    // Pool is fully drained: head and tail both reset.
    expect(ZPP_PubPool.poolVec2).toBeNull();
    expect(ZPP_PubPool.nextVec2).toBeNull();
  });

  it("allocate N, free all, allocate N again reuses every object (no new allocations)", () => {
    const N = 50;
    const first = Array.from({ length: N }, (_, i) => Vec2.get(i, -i));
    const ids = new Set(first);
    for (const v of first) v.dispose();
    expect(expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2)).toHaveLength(N);

    const second = Array.from({ length: N }, (_, i) => Vec2.get(i * 2, i * 3));
    for (const v of second) expect(ids.has(v)).toBe(true);
    expect(new Set(second).size).toBe(N);
    for (let i = 0; i < N; i++) {
      expect(second[i].x).toBe(i * 2);
      expect(second[i].y).toBe(i * 3);
    }
    // Depleted pool falls back to fresh construction.
    const extra = Vec2.get(7, 7);
    expect(ids.has(extra)).toBe(false);
    expect(extra.x).toBe(7);
  });

  it("disposed wrappers release their ZPP_Vec2 to the internal pool, and get() takes one back", () => {
    const v = Vec2.get(4, 5);
    const inner = v.zpp_inner;
    ZPP_Vec2.zpp_pool = null;
    v.dispose();
    expect(v.zpp_inner).toBeNull();
    expect(ZPP_Vec2.zpp_pool).toBe(inner);
    expect(inner.outer).toBeNull();

    const w = Vec2.get(8, 9);
    expect(w).toBe(v);
    expect(w.zpp_inner).toBe(inner);
    expect(inner.outer).toBe(w);
    expect(ZPP_Vec2.zpp_pool).toBeNull();
    expect([w.x, w.y]).toEqual([8, 9]);
  });

  it("interleaving get and dispose keeps head/tail consistent", () => {
    const a = Vec2.get();
    const b = Vec2.get();
    const c = Vec2.get();
    a.dispose();
    b.dispose();
    expect(Vec2.get()).toBe(a); // head popped; tail still b
    expect(ZPP_PubPool.poolVec2).toBe(b);
    expect(ZPP_PubPool.nextVec2).toBe(b);
    c.dispose(); // appended after b
    expect(expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2)).toEqual([b, c]);
    expect(Vec2.get()).toBe(b);
    expect(Vec2.get()).toBe(c);
    expect(ZPP_PubPool.nextVec2).toBeNull();
    // A dispose after the pool was drained starts a new list at the head.
    a.dispose();
    expect(ZPP_PubPool.poolVec2).toBe(a);
    expect(ZPP_PubPool.nextVec2).toBe(a);
  });

  it("a NaN argument throws before the pool is touched", () => {
    const a = Vec2.get();
    const b = Vec2.get();
    a.dispose();
    b.dispose();
    expect(() => Vec2.get(NaN, 0)).toThrow("Vec2 components cannot be NaN");
    expect(() => Vec2.get(0, NaN)).toThrow("Vec2 components cannot be NaN");
    expect(() => Vec2.weak(NaN, NaN)).toThrow("Vec2 components cannot be NaN");
    expect(expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2)).toEqual([a, b]);
    expect(Vec2.get(1, 2)).toBe(a);
  });

  it("double dispose throws and does not append the object twice", () => {
    const a = Vec2.get();
    a.dispose();
    expect(() => a.dispose()).toThrow("Vec2 has been disposed and cannot be used!");
    expect(expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2)).toEqual([a]);
  });

  it("using a disposed Vec2 throws, and the object stays pooled", () => {
    const a = Vec2.get(1, 1);
    a.dispose();
    expect(() => a.x).toThrow("Vec2 has been disposed and cannot be used!");
    expect(() => a.length).toThrow("Vec2 has been disposed and cannot be used!");
    const live = new Vec2(1, 1); // constructed directly, so it does not pop `a`
    expect(() => live.add(a)).toThrow("Vec2 has been disposed and cannot be used!");
    expect(walk(ZPP_PubPool.poolVec2)).toContain(a);
  });

  it("an engine-owned Vec2 refuses dispose and the pool is left untouched", () => {
    // Body construction and the lazy `position` wrapper both draw from the pool,
    // so create them before seeding the pool.
    const pos = new Body().position;
    const pooled = Vec2.get();
    pooled.dispose();
    expect(() => pos.dispose()).toThrow("This Vec2 is not disposable");
    expect(pos.zpp_disp).toBe(false);
    expect(expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2)).toEqual([pooled]);
  });

  it("an immutable Vec2 refuses dispose before touching the pool", () => {
    const v = Vec2.get(1, 2);
    v.zpp_inner._immutable = true;
    expect(() => v.dispose()).toThrow("Vec2 is immutable");
    expect(v.zpp_disp).toBe(false);
    expect(ZPP_PubPool.poolVec2).toBeNull();
    expect(ZPP_PubPool.nextVec2).toBeNull();
  });

  describe("weak references", () => {
    it("Vec2.weak marks the vector weak; Vec2.get(…, true) does too", () => {
      expect(Vec2.weak(1, 2).zpp_inner.weak).toBe(true);
      expect(Vec2.get(1, 2, true).zpp_inner.weak).toBe(true);
      expect(Vec2.get(1, 2).zpp_inner.weak).toBe(false);
    });

    it("a weak argument is disposed into the pool after one use and is then invalid", () => {
      const a = Vec2.get(1, 1);
      const w = Vec2.weak(2, 3);
      const sum = a.add(w);
      expect([sum.x, sum.y]).toEqual([3, 4]);
      expect(w.zpp_disp).toBe(true);
      expect(() => w.x).toThrow("Vec2 has been disposed and cannot be used!");
      expect(walk(ZPP_PubPool.poolVec2)).toEqual([w]);
      // The weak shell is the very next object handed out — and it is strong now.
      const reused = Vec2.get(9, 9);
      expect(reused).toBe(w);
      expect(reused.zpp_inner.weak).toBe(false);
      expect(reused.x).toBe(9);
    });

    it("both weak arguments of a static helper are returned to the pool", () => {
      const a = Vec2.weak(0, 0);
      const b = Vec2.weak(3, 4);
      expect(Vec2.distance(a, b)).toBe(5);
      expect(a.zpp_disp).toBe(true);
      expect(b.zpp_disp).toBe(true);
      expect(expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2)).toEqual([a, b]);
    });

    it("a weak Vec2 pushed into a GeomPoly is consumed and recycled", () => {
      const w = Vec2.weak(5, 6);
      const poly = GeomPoly.get();
      poly.push(w);
      expect(w.zpp_disp).toBe(true);
      expect(ZPP_PubPool.poolVec2).toBe(w);
      const cur = poly.current();
      expect([cur.x, cur.y]).toEqual([5, 6]);
    });

    it("a non-weak argument is not disposed by the same operation", () => {
      const a = Vec2.get(1, 1);
      const b = Vec2.get(2, 2);
      a.add(b);
      expect(b.zpp_disp).toBe(false);
      expect(ZPP_PubPool.poolVec2).toBeNull();
    });
  });

  it("allocating from the pool while walking it (allocate-during-iteration) hands out the walked objects in order", () => {
    const vs = Array.from({ length: 5 }, (_, i) => Vec2.get(i, i));
    for (const v of vs) v.dispose();
    const seen: Vec2[] = [];
    // Each get() pops the current head, so the "iteration" is draining the list.
    while (ZPP_PubPool.poolVec2 != null) {
      const expected = ZPP_PubPool.poolVec2;
      const got = Vec2.get(seen.length, 0);
      expect(got).toBe(expected);
      seen.push(got);
      expectWellFormed(ZPP_PubPool.poolVec2, ZPP_PubPool.nextVec2);
    }
    expect(seen).toEqual(vs);
  });
});

describe("ZPP_PubPool — Vec3 pool", () => {
  beforeEach(resetPools);

  it("allocate N, free all, allocate N again reuses the same objects in FIFO order", () => {
    const vs = [Vec3.get(1, 2, 3), Vec3.get(4, 5, 6), Vec3.get(7, 8, 9)];
    for (const v of vs) v.dispose();
    expect(expectWellFormed(ZPP_PubPool.poolVec3, ZPP_PubPool.nextVec3)).toEqual(vs);

    const again = [Vec3.get(-1, -2, -3), Vec3.get(), Vec3.get(0, 0, 1)];
    expect(again).toEqual(vs);
    expect(again[0]).toBe(vs[0]);
    expect([again[0].x, again[0].y, again[0].z]).toEqual([-1, -2, -3]);
    expect([again[1].x, again[1].y, again[1].z]).toEqual([0, 0, 0]);
    expect(ZPP_PubPool.poolVec3).toBeNull();
    expect(ZPP_PubPool.nextVec3).toBeNull();
  });

  it("a pooled Vec3 comes back mutable, unvalidated and live", () => {
    const v = Vec3.get(1, 1, 1);
    v.dispose();
    const w = Vec3.get(2, 2, 2);
    expect(w).toBe(v);
    expect(w.zpp_disp).toBe(false);
    expect(w.zpp_inner.immutable).toBe(false);
    expect(w.zpp_inner._validate).toBeNull();
    w.z = 10;
    expect(w.z).toBe(10);
  });

  it("double dispose and use-after-dispose throw without corrupting the list", () => {
    const v = Vec3.get();
    v.dispose();
    expect(() => v.dispose()).toThrow("Vec3 has been disposed and cannot be used!");
    expect(() => v.x).toThrow("Vec3 has been disposed and cannot be used!");
    expect(expectWellFormed(ZPP_PubPool.poolVec3, ZPP_PubPool.nextVec3)).toEqual([v]);
  });

  it("an immutable Vec3 is not disposable", () => {
    const v = Vec3.get();
    v.zpp_inner.immutable = true;
    expect(() => v.dispose()).toThrow("This Vec3 is not disposable");
    expect(ZPP_PubPool.poolVec3).toBeNull();
    expect(v.zpp_disp).toBe(false);
  });
});

describe("ZPP_PubPool — GeomPoly pool", () => {
  beforeEach(resetPools);

  it("dispose clears vertices and appends; get reuses the same objects in order", () => {
    const a = GeomPoly.get([Vec2.get(0, 0), Vec2.get(1, 0), Vec2.get(0, 1)]);
    const b = GeomPoly.get();
    a.dispose();
    b.dispose();
    expect(expectWellFormed(ZPP_PubPool.poolGeomPoly, ZPP_PubPool.nextGeomPoly)).toEqual([a, b]);
    expect(a.zpp_inner.vertices).toBeNull();

    const a2 = GeomPoly.get();
    expect(a2).toBe(a);
    expect(a2.empty()).toBe(true);
    const b2 = GeomPoly.get([Vec2.get(5, 5), Vec2.get(6, 5), Vec2.get(5, 6)]);
    expect(b2).toBe(b);
    expect(b2.size()).toBe(3);
    expect(ZPP_PubPool.poolGeomPoly).toBeNull();
    expect(ZPP_PubPool.nextGeomPoly).toBeNull();
  });

  it("double dispose throws and does not duplicate the entry", () => {
    const p = GeomPoly.get();
    p.dispose();
    expect(() => p.dispose()).toThrow("GeomPoly has been disposed and cannot be used!");
    expect(() => p.size()).toThrow("GeomPoly has been disposed and cannot be used!");
    expect(walk(ZPP_PubPool.poolGeomPoly)).toEqual([p]);
  });

  it("an exception mid-allocation (bad vertex input) leaves the rest of the free-list intact", () => {
    const a = GeomPoly.get();
    const b = GeomPoly.get();
    const c = GeomPoly.get();
    a.dispose();
    b.dispose();
    c.dispose();

    const dead = Vec2.get(1, 1);
    dead.dispose();
    // `a` is popped off the head, then vertex conversion throws.
    expect(() => GeomPoly.get([new Vec2(0, 0), dead])).toThrow(
      "Vec2 has been disposed and cannot be used!",
    );
    // The remaining list is still well-formed and continues from b.
    expect(expectWellFormed(ZPP_PubPool.poolGeomPoly, ZPP_PubPool.nextGeomPoly)).toEqual([b, c]);
    expect(GeomPoly.get()).toBe(b);
    expect(GeomPoly.get()).toBe(c);
    expect(ZPP_PubPool.nextGeomPoly).toBeNull();
    const fresh = GeomPoly.get();
    expect([a, b, c]).not.toContain(fresh);
  });

  it("an exception mid-allocation on the last pooled object still resets the tail", () => {
    const a = GeomPoly.get();
    a.dispose();
    expect(ZPP_PubPool.nextGeomPoly).toBe(a);
    expect(() => GeomPoly.get([null as any])).toThrow();
    // `a` had been the tail; popping it must have cleared nextGeomPoly so that
    // the next dispose starts a fresh list instead of linking onto `a`.
    expect(ZPP_PubPool.poolGeomPoly).toBeNull();
    expect(ZPP_PubPool.nextGeomPoly).toBeNull();
    const b = GeomPoly.get();
    b.dispose();
    expect(expectWellFormed(ZPP_PubPool.poolGeomPoly, ZPP_PubPool.nextGeomPoly)).toEqual([b]);
  });
});
