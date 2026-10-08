/**
 * ZPP_GeomVert / GeomVertexIterator — vertex pooling, lazy Vec2 wrappers that
 * draw from (and return to) ZPP_PubPool, wrapper↔vertex synchronisation and
 * iterator recycling (issue #167).
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/index";
import { Vec2 } from "../../../src/geom/Vec2";
import { GeomPoly } from "../../../src/geom/GeomPoly";
import { GeomVertexIterator } from "../../../src/geom/GeomVertexIterator";
import { ZPP_GeomVert, disposeGeomVertWrap } from "../../../src/native/geom/ZPP_GeomVert";
import { ZPP_GeomVertexIterator } from "../../../src/native/geom/ZPP_GeomVertexIterator";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";
import { ZPP_PubPool } from "../../../src/native/util/ZPP_PubPool";

function resetVec2Pool(): void {
  ZPP_PubPool.poolVec2 = null;
  ZPP_PubPool.nextVec2 = null;
}

function tri(): GeomPoly {
  return new GeomPoly([new Vec2(0, 0), new Vec2(10, 0), new Vec2(0, 10)]);
}

describe("ZPP_GeomVert pooling", () => {
  beforeEach(() => {
    ZPP_GeomVert.zpp_pool = null;
  });

  it("get() reuses pooled vertices and resets their state", () => {
    const a = ZPP_GeomVert.get(1, 2);
    a.forced = true;
    a.next = ZPP_GeomVert.zpp_pool;
    ZPP_GeomVert.zpp_pool = a;
    const b = ZPP_GeomVert.get(3, 4);
    expect(b).toBe(a);
    expect([b.x, b.y, b.forced, b.next]).toEqual([3, 4, false, null]);
    expect(ZPP_GeomVert.zpp_pool).toBeNull();
    expect(ZPP_GeomVert.get(0, 0)).not.toBe(a);
  });

  it("alloc() clears the forced flag", () => {
    const v = ZPP_GeomVert.get(0, 0);
    v.forced = true;
    v.alloc();
    expect(v.forced).toBe(false);
  });

  it("GeomPoly pop/shift/clear return vertices to the pool and re-pushes reuse them", () => {
    const poly = new GeomPoly([new Vec2(0, 0), new Vec2(1, 0), new Vec2(1, 1), new Vec2(0, 1)]);
    const verts: any[] = [];
    let v = poly.zpp_inner.vertices;
    do {
      verts.push(v);
      v = v.next;
    } while (v !== poly.zpp_inner.vertices);
    poly.clear();
    let n = 0;
    for (let p: any = ZPP_GeomVert.zpp_pool; p != null; p = p.next) {
      expect(verts).toContain(p);
      expect(p.prev).toBeNull();
      n++;
    }
    expect(n).toBe(4);
    const again = new GeomPoly([new Vec2(5, 5), new Vec2(6, 5), new Vec2(6, 6)]);
    let w = again.zpp_inner.vertices;
    do {
      expect(verts).toContain(w);
      w = w.next;
    } while (w !== again.zpp_inner.vertices);
  });
});

describe("ZPP_GeomVert.wrapper()", () => {
  beforeEach(resetVec2Pool);

  it("draws the wrapper shell from the public pool and binds it to the vertex", () => {
    const shell = Vec2.get(0, 0);
    shell.dispose();
    const v = ZPP_GeomVert.get(3, 4);
    const w = v.wrapper();
    expect(w).toBe(shell);
    expect(w.zpp_disp).toBe(false);
    expect([w.x, w.y]).toEqual([3, 4]);
    expect(w.zpp_inner._inuse).toBe(true);
    expect(w.zpp_inner.weak).toBe(false);
    expect(ZPP_PubPool.poolVec2).toBeNull();
    expect(ZPP_PubPool.nextVec2).toBeNull();
    expect(v.wrapper()).toBe(w); // cached
  });

  it("creates a fresh shell when the pool is empty", () => {
    const v = ZPP_GeomVert.get(1, 1);
    const w = v.wrapper();
    expect(w).toBeInstanceOf(Vec2);
    expect([w.x, w.y]).toEqual([1, 1]);
  });

  it("writes through the wrapper update the vertex, and vertex changes are read back", () => {
    const v = ZPP_GeomVert.get(1, 2);
    const w = v.wrapper();
    w.x = 10;
    w.y = 20;
    expect([v.x, v.y]).toEqual([10, 20]);
    v.x = 7;
    expect(w.x).toBe(7);
  });

  it("NaN coordinates are rejected", () => {
    const bad = ZPP_GeomVert.get(NaN, 0);
    expect(() => bad.wrapper()).toThrow("Vec2 components cannot be NaN");
    expect(bad.wrap).toBeNull();
  });
});

describe("disposeGeomVertWrap / ZPP_GeomVert.free()", () => {
  beforeEach(resetVec2Pool);

  it("free() returns the wrapper shell to ZPP_PubPool and its ZPP_Vec2 to the internal pool", () => {
    const v = ZPP_GeomVert.get(1, 2);
    const w = v.wrapper();
    const inner = w.zpp_inner;
    ZPP_Vec2.zpp_pool = null;
    v.prev = v.next = v;
    v.free();
    expect(v.wrap).toBeNull();
    expect(v.prev).toBeNull();
    expect(v.next).toBeNull();
    expect(w.zpp_disp).toBe(true);
    expect(w.zpp_inner).toBeNull();
    expect(ZPP_PubPool.poolVec2).toBe(w);
    expect(ZPP_PubPool.nextVec2).toBe(w);
    expect(ZPP_Vec2.zpp_pool).toBe(inner);
    expect(inner._validate).toBeNull();
    expect(inner._invalidate).toBeNull();
    expect(inner.outer).toBeNull();
    // The recycled shell is the next Vec2 handed out.
    expect(Vec2.get(0, 0)).toBe(w);
  });

  it("appends to an existing pool tail", () => {
    const first = Vec2.get();
    first.dispose();
    const v = ZPP_GeomVert.get(0, 0);
    const w = v.wrapper();
    // wrapper() consumed `first` from the pool; put another one back first.
    const other = Vec2.get();
    other.dispose();
    disposeGeomVertWrap(v);
    expect(ZPP_PubPool.poolVec2).toBe(other);
    expect(other.zpp_pool).toBe(w);
    expect(ZPP_PubPool.nextVec2).toBe(w);
  });

  it("consults the wrapper's _isimmutable guard before disposing", () => {
    const v = ZPP_GeomVert.get(0, 0);
    const w = v.wrapper();
    w.zpp_inner._isimmutable = () => {
      throw new Error("guarded");
    };
    expect(() => disposeGeomVertWrap(v)).toThrow("guarded");
    expect(v.wrap).toBe(w);
    expect(ZPP_PubPool.poolVec2).toBeNull();
  });

  it("is a no-op for vertices without a wrapper", () => {
    const v = ZPP_GeomVert.get(0, 0);
    disposeGeomVertWrap(v);
    expect(ZPP_PubPool.poolVec2).toBeNull();
  });

  it("refuses an immutable wrapper", () => {
    const v = ZPP_GeomVert.get(0, 0);
    v.wrapper().zpp_inner._immutable = true;
    expect(() => disposeGeomVertWrap(v)).toThrow("Vec2 is immutable");
  });

  it("refuses a wrapper that was already disposed", () => {
    const v = ZPP_GeomVert.get(0, 0);
    v.wrapper().zpp_disp = true;
    expect(() => disposeGeomVertWrap(v)).toThrow("Vec2 has been disposed and cannot be used!");
  });

  it("GeomPoly.clear() disposes wrappers handed out by current()", () => {
    const poly = tri();
    const cur = poly.current();
    expect(() => cur.dispose()).toThrow("This Vec2 is not disposable");
    poly.clear();
    expect(cur.zpp_disp).toBe(true);
    expect(ZPP_PubPool.poolVec2).toBe(cur);
    expect(() => cur.x).toThrow("Vec2 has been disposed and cannot be used!");
  });

  it("GeomPoly.pop() disposes only the popped vertex's wrapper", () => {
    const poly = tri();
    const wrappers: Vec2[] = [];
    for (const v of poly.forwardIterator()) wrappers.push(v);
    poly.pop();
    expect(wrappers.filter((w) => w.zpp_disp)).toHaveLength(1);
    expect(poly.size()).toBe(2);
    const live = wrappers.filter((w) => !w.zpp_disp);
    for (const w of live) expect(w.zpp_inner._inuse).toBe(true);
  });
});

describe("GeomVertexIterator", () => {
  beforeEach(() => {
    resetVec2Pool();
    ZPP_GeomVertexIterator.zpp_pool = null;
  });

  it("forward and backward traversal visit every vertex once in ring order", () => {
    const poly = new GeomPoly([new Vec2(0, 0), new Vec2(1, 0), new Vec2(1, 1), new Vec2(0, 1)]);
    const fwd = [...poly.forwardIterator()].map((v: Vec2) => [v.x, v.y]);
    const bwd = [...poly.backwardsIterator()].map((v: Vec2) => [v.x, v.y]);
    expect(fwd).toHaveLength(4);
    expect(bwd).toHaveLength(4);
    expect(bwd[0]).toEqual(fwd[0]);
    expect(bwd.slice(1)).toEqual(fwd.slice(1).reverse());
  });

  it("an empty polygon yields nothing", () => {
    const poly = new GeomPoly();
    expect([...poly.iterator()]).toEqual([]);
  });

  it("next() after exhaustion throws and the backing iterator is pooled", () => {
    const poly = tri();
    const it = poly.forwardIterator();
    while (it.hasNext()) it.next();
    expect(it.zpp_inner).toBeNull();
    expect(ZPP_GeomVertexIterator.zpp_pool).not.toBeNull();
    expect(() => it.next()).toThrow("Iterator has been disposed");
    expect(() => it.hasNext()).toThrow("Iterator has been disposed");
  });

  it("a recycled backing iterator (and its public shell) is reused by the next request", () => {
    const poly = tri();
    const it1 = poly.forwardIterator();
    while (it1.hasNext()) it1.next();
    const backing = ZPP_GeomVertexIterator.zpp_pool;
    const it2 = poly.backwardsIterator();
    expect(it2).toBe(it1); // Haxe semantics: the public shell is pooled with its backing object
    expect(it2.zpp_inner).toBe(backing);
    expect(ZPP_GeomVertexIterator.zpp_pool).toBeNull();
    expect([...it2]).toHaveLength(3);
  });

  it("vertex wrappers come from the public Vec2 pool and are cached per vertex", () => {
    const shells = [Vec2.get(), Vec2.get(), Vec2.get()];
    for (const s of shells) s.dispose();
    const poly = tri();
    const ws = [...poly.forwardIterator()];
    expect(ws).toEqual(shells);
    expect(ws[0]).toBe(shells[0]);
    expect(ZPP_PubPool.poolVec2).toBeNull();
    expect(ZPP_PubPool.nextVec2).toBeNull();
    const again = [...poly.forwardIterator()];
    for (let i = 0; i < 3; i++) expect(again[i]).toBe(ws[i]);
    expect(ws.every((w: Vec2) => w.zpp_inner._inuse)).toBe(true);
  });

  it("writing through an iterated wrapper moves the polygon vertex", () => {
    const poly = tri();
    const area0 = Math.abs(poly.area());
    for (const v of poly.forwardIterator()) {
      v.x *= 2;
      v.y *= 2;
    }
    expect(Math.abs(poly.area())).toBeCloseTo(area0 * 4);
  });

  it("a NaN vertex is rejected when its wrapper is created", () => {
    const poly = tri();
    poly.zpp_inner.vertices.x = NaN;
    const it = poly.forwardIterator();
    expect(it.hasNext()).toBe(true);
    expect(() => it.next()).toThrow("Vec2 components cannot be NaN");
  });

  it("cannot be constructed directly", () => {
    expect(() => new (GeomVertexIterator as any)()).toThrow(
      "Cannot instantiate GeomVertexIterator",
    );
  });
});
