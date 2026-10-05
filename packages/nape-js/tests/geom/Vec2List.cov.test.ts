/**
 * Vec2List — model-based mutation tests (forward and reverse_flag modes),
 * hook semantics (adder / post_adder / subber / dontremove / _modifiable),
 * wrapper creation for raw ZPP_Vec2 elements, deep copy through the public
 * pool and iterator pooling (issue #167).
 */
import { describe, it, expect, beforeEach } from "vitest";
import "../../src/index";
import { getNape } from "../../src/core/engine";
import { Vec2 } from "../../src/geom/Vec2";
import { Vec2List, Vec2Iterator } from "../../src/geom/Vec2List";
import { ZPP_Vec2 } from "../../src/native/geom/ZPP_Vec2";
import { ZPP_Vec2List } from "../../src/native/util/ZPP_Vec2List";
import { ZPP_PubPool } from "../../src/native/util/ZPP_PubPool";
import { ZNPList_ZPP_Vec2 } from "../../src/native/util/ZNPRegistry";

function makeList(): any {
  return new (getNape().geom.Vec2List)();
}

function xs(list: any): number[] {
  const out: number[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.at(i).x);
  return out;
}

function iterXs(list: any): number[] {
  return [...list].map((v: Vec2) => v.x);
}

function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

describe("Vec2List — model-based mutation", () => {
  for (const reverse of [false, true]) {
    describe(`reverse_flag = ${reverse}`, () => {
      it("random push/unshift/add/pop/shift/remove/at sequences match an array model", () => {
        const rand = rng(reverse ? 2 : 1);
        const list = makeList();
        list.zpp_inner.reverse_flag = reverse;
        const model: Vec2[] = [];
        let next = 0;
        for (let step = 0; step < 600; step++) {
          const r = rand();
          if (r < 0.2) {
            const v = new Vec2(next++, 0);
            expect(list.push(v)).toBe(true);
            model.push(v);
          } else if (r < 0.35) {
            const v = new Vec2(next++, 0);
            expect(list.unshift(v)).toBe(true);
            model.unshift(v);
          } else if (r < 0.45) {
            const v = new Vec2(next++, 0);
            expect(list.add(v)).toBe(true);
            if (reverse) model.push(v);
            else model.unshift(v);
          } else if (r < 0.55) {
            if (model.length === 0) {
              expect(() => list.pop()).toThrow("Cannot remove from empty list");
            } else {
              expect(list.pop()).toBe(model.pop());
            }
          } else if (r < 0.65) {
            if (model.length === 0) {
              expect(() => list.shift()).toThrow("Cannot remove from empty list");
            } else {
              expect(list.shift()).toBe(model.shift());
            }
          } else if (r < 0.75) {
            if (model.length > 0) {
              const i = Math.floor(rand() * model.length);
              const v = model[i];
              expect(list.remove(v)).toBe(true);
              model.splice(i, 1);
              expect(list.has(v)).toBe(false);
            }
            expect(list.remove(new Vec2(-1, -1))).toBe(false);
          } else {
            // Random-access reads in arbitrary order exercise the at() cursor cache.
            for (let k = 0; k < 3 && model.length > 0; k++) {
              const i = Math.floor(rand() * model.length);
              expect(list.at(i)).toBe(model[i]);
            }
          }
          expect(list.length).toBe(model.length);
          expect(list.empty()).toBe(model.length === 0);
        }
        expect(xs(list)).toEqual(model.map((v) => v.x));
        expect(iterXs(list)).toEqual(model.map((v) => v.x));
        for (const v of model) expect(list.has(v)).toBe(true);
      });

      it("clear() empties the list from either end", () => {
        const list = makeList();
        list.zpp_inner.reverse_flag = reverse;
        for (let i = 0; i < 5; i++) list.push(new Vec2(i, 0));
        const removed: number[] = [];
        list.zpp_inner.subber = (v: Vec2) => removed.push(v.x);
        list.clear();
        expect(list.length).toBe(0);
        // Reverse lists drain by pop() (from the back), forward lists by shift().
        expect(removed).toEqual(reverse ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4]);
      });

      it("at() out of range throws for both modes", () => {
        const list = makeList();
        list.zpp_inner.reverse_flag = reverse;
        list.push(new Vec2(1, 1));
        expect(() => list.at(1)).toThrow("Index out of bounds");
        expect(() => list.at(-1)).toThrow("Index out of bounds");
      });

      it("pushes after a pop of the last element keep appending at the right end", () => {
        const list = makeList();
        list.zpp_inner.reverse_flag = reverse;
        list.push(new Vec2(1, 0));
        list.push(new Vec2(2, 0));
        list.at(1); // prime the cursor on the last node
        list.pop();
        list.push(new Vec2(3, 0));
        list.pop();
        list.pop();
        list.push(new Vec2(4, 0));
        list.push(new Vec2(5, 0));
        expect(xs(list)).toEqual([4, 5]);
      });
    });
  }
});

describe("Vec2List — cursor on the tail element", () => {
  for (const reverse of [false, true]) {
    it(`removing the element under a primed at() cursor keeps later reads correct (reverse_flag = ${reverse})`, () => {
      const list = makeList();
      list.zpp_inner.reverse_flag = reverse;
      for (let i = 0; i < 4; i++) list.push(new Vec2(i, 0));
      // Prime the cursor on the inner tail node: public last (forward) or first (reverse).
      list.at(reverse ? 0 : 3);
      expect(list.zpp_inner.at_ite.next).toBeNull();
      const removed = reverse ? list.shift() : list.pop();
      expect(removed.x).toBe(reverse ? 0 : 3);
      expect(list.zpp_inner.at_ite).toBeNull();
      expect(xs(list)).toEqual(reverse ? [1, 2, 3] : [0, 1, 2]);
    });
  }
});

describe("Vec2List — hooks", () => {
  it("adder returning false vetoes push/unshift/add without mutating", () => {
    const list = makeList();
    const seen: number[] = [];
    list.zpp_inner.adder = (v: Vec2) => {
      seen.push(v.x);
      return v.x >= 0;
    };
    expect(list.push(new Vec2(-1, 0))).toBe(false);
    expect(list.unshift(new Vec2(-2, 0))).toBe(false);
    expect(list.add(new Vec2(-3, 0))).toBe(false);
    expect(list.push(new Vec2(1, 0))).toBe(true);
    expect(seen).toEqual([-1, -2, -3, 1]);
    expect(xs(list)).toEqual([1]);
  });

  it("post_adder sees each accepted element after insertion", () => {
    for (const reverse of [false, true]) {
      const list = makeList();
      list.zpp_inner.reverse_flag = reverse;
      const after: [number, number][] = [];
      list.zpp_inner.post_adder = (v: Vec2) => after.push([v.x, list.length]);
      list.push(new Vec2(1, 0));
      list.unshift(new Vec2(2, 0));
      expect(after).toEqual([
        [1, 1],
        [2, 2],
      ]);
    }
  });

  it("subber is told about pop/shift/remove; dontremove keeps the element in place", () => {
    for (const reverse of [false, true]) {
      const list = makeList();
      list.zpp_inner.reverse_flag = reverse;
      const a = new Vec2(1, 0);
      const b = new Vec2(2, 0);
      const c = new Vec2(3, 0);
      list.push(a);
      list.push(b);
      list.push(c);
      const subbed: Vec2[] = [];
      list.zpp_inner.subber = (v: Vec2) => subbed.push(v);
      list.zpp_inner.dontremove = true;
      expect(list.pop()).toBe(c);
      expect(list.shift()).toBe(a);
      expect(list.remove(b)).toBe(true);
      expect(subbed).toEqual([c, a, b]);
      expect(xs(list)).toEqual([1, 2, 3]);

      list.zpp_inner.dontremove = false;
      expect(list.pop()).toBe(c);
      expect(list.shift()).toBe(a);
      expect(list.remove(b)).toBe(true);
      expect(list.length).toBe(0);
      expect(subbed).toEqual([c, a, b, c, a, b]);
    }
  });

  it("_invalidate is called after every successful mutation", () => {
    const list = makeList();
    let n = 0;
    list.zpp_inner._invalidate = () => n++;
    const v = new Vec2(1, 1);
    list.push(v);
    list.unshift(new Vec2(2, 2));
    list.pop();
    list.shift();
    list.push(v);
    list.remove(v);
    expect(n).toBe(6);
    list.remove(v); // not found → no invalidation
    expect(n).toBe(6);
  });

  it("_modifiable can veto mutation by throwing; the list is unchanged", () => {
    const list = makeList();
    list.push(new Vec2(1, 0));
    list.zpp_inner._modifiable = () => {
      throw new Error("locked");
    };
    expect(() => list.push(new Vec2(2, 0))).toThrow("locked");
    expect(() => list.unshift(new Vec2(2, 0))).toThrow("locked");
    expect(() => list.pop()).toThrow("locked");
    expect(() => list.shift()).toThrow("locked");
    expect(() => list.remove(list.at(0))).toThrow("locked");
    list.zpp_inner._modifiable = null;
    expect(xs(list)).toEqual([1]);
  });

  it("_validate runs lazily once per invalidation before reads", () => {
    const list = makeList();
    let validations = 0;
    list.zpp_inner._validate = () => validations++;
    list.zpp_inner._invalidated = true;
    expect(list.length).toBe(0);
    expect(list.length).toBe(0);
    expect(validations).toBe(1);
    list.zpp_inner.invalidate();
    list.empty();
    expect(validations).toBe(2);
  });
});

describe("Vec2List — immutable lists", () => {
  function immutableList(): any {
    const list = makeList();
    list.push(new Vec2(1, 2));
    list.zpp_inner.immutable = true;
    return list;
  }

  it("every mutator throws 'Vec2List is immutable' and the contents survive", () => {
    const list = immutableList();
    const v = new Vec2(5, 5);
    expect(() => list.push(v)).toThrow("Vec2List is immutable");
    expect(() => list.unshift(v)).toThrow("Vec2List is immutable");
    expect(() => list.add(v)).toThrow("Vec2List is immutable");
    expect(() => list.pop()).toThrow("Vec2List is immutable");
    expect(() => list.shift()).toThrow("Vec2List is immutable");
    expect(() => list.remove(list.at(0))).toThrow("Vec2List is immutable");
    expect(() => list.clear()).toThrow("Vec2List is immutable");
    expect(() => list.merge(Vec2List.fromArray([v]))).toThrow("Vec2List is immutable");
    expect(list.length).toBe(1);
    expect(list.at(0).y).toBe(2);
  });

  it("reads, copy and iteration still work", () => {
    const list = immutableList();
    const copy = list.copy();
    expect(copy.zpp_inner.immutable).toBe(false);
    copy.push(new Vec2(3, 4));
    expect(copy.length).toBe(2);
    expect(iterXs(list)).toEqual([1]);
  });
});

describe("ZPP_Vec2List.get — wrapping raw ZPP_Vec2 lists", () => {
  function rawList(coords: [number, number][]): any {
    const inner = new ZNPList_ZPP_Vec2();
    for (let i = coords.length - 1; i >= 0; i--) {
      const z = new ZPP_Vec2();
      z.x = coords[i][0];
      z.y = coords[i][1];
      inner.add(z);
    }
    return inner;
  }

  it("creates Vec2 wrappers lazily, binds them to the raw element and caches them", () => {
    const inner = rawList([
      [1, 2],
      [3, 4],
    ]);
    const list = ZPP_Vec2List.get(inner);
    expect(list).toBeInstanceOf(Vec2List);
    expect(list.zpp_inner.immutable).toBe(false);
    const raw0 = inner.head!.elt as ZPP_Vec2;
    expect(raw0.outer).toBeNull();

    ZPP_Vec2.zpp_pool = null;
    const w0 = list.at(0);
    // The temporary ZPP_Vec2 made by the Vec2 constructor went back to the pool.
    expect(ZPP_Vec2.zpp_pool).not.toBeNull();
    expect(ZPP_Vec2.zpp_pool).not.toBe(raw0);
    expect(w0.zpp_inner).toBe(raw0);
    expect(raw0.outer).toBe(w0);
    expect([w0.x, w0.y]).toEqual([1, 2]);
    expect(list.at(0)).toBe(w0);
    // Writes through the wrapper land in the raw element.
    w0.x = 10;
    expect(raw0.x).toBe(10);
    expect(list.length).toBe(2);
  });

  it("pop/shift on a raw list return freshly-bound wrappers", () => {
    const inner = rawList([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    const list = ZPP_Vec2List.get(inner);
    const last = list.pop();
    expect(last.x).toBe(3);
    const first = list.shift();
    expect(first.x).toBe(1);
    expect(list.length).toBe(1);
    expect(inner.length).toBe(1);
  });

  it("get(list, true) produces an immutable view", () => {
    const list = ZPP_Vec2List.get(rawList([[0, 0]]), true);
    expect(list.zpp_inner.immutable).toBe(true);
    expect(() => list.push(new Vec2())).toThrow("Vec2List is immutable");
    expect(list.at(0).x).toBe(0);
  });

  it("modified() resets cached cursors and forces a length recount", () => {
    const inner = rawList([
      [1, 0],
      [2, 0],
    ]);
    const list = ZPP_Vec2List.get(inner);
    list.at(1);
    expect(list.zpp_inner.at_ite).not.toBeNull();
    // Mutate the raw list behind the wrapper's back, then signal it.
    const z = new ZPP_Vec2();
    z.x = 0;
    inner.add(z);
    inner.modified = false;
    list.zpp_inner.zip_length = false;
    expect(list.length).toBe(2); // stale — nobody told the wrapper
    list.zpp_inner.modified();
    expect(list.zpp_inner.at_ite).toBeNull();
    expect(list.zpp_inner.push_ite).toBeNull();
    expect(list.length).toBe(3);
    expect(xs(list)).toEqual([0, 1, 2]);
  });
});

describe("Vec2List — copy / merge / foreach / filter", () => {
  beforeEach(() => {
    ZPP_PubPool.poolVec2 = null;
    ZPP_PubPool.nextVec2 = null;
  });

  it("deep copy allocates from the public pool and yields independent vectors", () => {
    const pooled = [Vec2.get(), Vec2.get()];
    for (const p of pooled) p.dispose();
    const src = Vec2List.fromArray([new Vec2(1, 2), new Vec2(3, 4), new Vec2(5, 6)]);
    const copy = src.copy(true);
    expect(copy.length).toBe(3);
    expect(copy.at(0)).toBe(pooled[0]);
    expect(copy.at(1)).toBe(pooled[1]);
    expect(ZPP_PubPool.poolVec2).toBeNull();
    expect(ZPP_PubPool.nextVec2).toBeNull();
    for (let i = 0; i < 3; i++) {
      expect(copy.at(i)).not.toBe(src.at(i));
      expect([copy.at(i).x, copy.at(i).y]).toEqual([src.at(i).x, src.at(i).y]);
      expect(copy.at(i).zpp_inner.weak).toBe(false);
    }
    copy.at(0).x = 100;
    expect(src.at(0).x).toBe(1);
  });

  it("deep copy with an empty public pool constructs fresh vectors", () => {
    const src = Vec2List.fromArray([new Vec2(1, 2)]);
    const copy = src.copy(true);
    expect(copy.at(0)).not.toBe(src.at(0));
    expect([copy.at(0).x, copy.at(0).y]).toEqual([1, 2]);
    expect(ZPP_PubPool.poolVec2).toBeNull();
  });

  it("deep copy validates lazily-computed source vectors", () => {
    const src = makeList();
    const v = new Vec2(0, 0);
    let calls = 0;
    v.zpp_inner._validate = () => {
      calls++;
      v.zpp_inner.x = 7;
      v.zpp_inner.y = 8;
    };
    src.push(v);
    const copy = src.copy(true);
    expect(calls).toBeGreaterThan(0);
    expect([copy.at(0).x, copy.at(0).y]).toEqual([7, 8]);
  });

  it("shallow copy shares elements", () => {
    const a = new Vec2(1, 1);
    const src = Vec2List.fromArray([a]);
    const copy = src.copy();
    expect(copy.at(0)).toBe(a);
    expect(copy).not.toBe(src);
  });

  it("merge adds only missing elements via add()", () => {
    const a = new Vec2(1, 0);
    const b = new Vec2(2, 0);
    const c = new Vec2(3, 0);
    const target = Vec2List.fromArray([a, b]);
    target.merge(Vec2List.fromArray([b, c]));
    expect(target.length).toBe(3);
    expect(target.has(c)).toBe(true);
    expect(target.at(0)).toBe(c); // add() == unshift for forward lists
    expect(() => target.merge(null)).toThrow("Cannot merge with null list");
  });

  it("foreach stops at the first throwing callback and recycles its iterator", () => {
    const list = Vec2List.fromArray([new Vec2(1, 0), new Vec2(2, 0), new Vec2(3, 0)]);
    const seen: number[] = [];
    (Vec2Iterator as any).zpp_pool = null;
    const ret = list.foreach((v: Vec2) => {
      seen.push(v.x);
      if (v.x === 2) throw new Error("stop");
    });
    expect(ret).toBe(list);
    expect(seen).toEqual([1, 2]);
    const recycled = (Vec2Iterator as any).zpp_pool;
    expect(recycled).not.toBeNull();
    expect(recycled.zpp_inner).toBeNull();
    // The recycled iterator is handed out next and works normally.
    const it = list.iterator();
    expect(it).toBe(recycled);
    expect(it.hasNext()).toBe(true);
    expect(it.next().x).toBe(1);
  });

  it("filter removes rejected elements and stops on a throwing predicate", () => {
    const list = Vec2List.fromArray([0, 1, 2, 3, 4, 5].map((i) => new Vec2(i, 0)));
    list.filter((v: Vec2) => v.x % 2 === 0);
    expect(xs(list)).toEqual([0, 2, 4]);

    const list2 = Vec2List.fromArray([0, 1, 2, 3].map((i) => new Vec2(i, 0)));
    list2.filter((v: Vec2) => {
      if (v.x === 2) throw new Error("stop");
      return v.x !== 1;
    });
    // 0 kept, 1 removed, then the throw at 2 ends filtering; 2 and 3 survive.
    expect(xs(list2)).toEqual([0, 2, 3]);
  });

  it("toString renders every element", () => {
    const list = Vec2List.fromArray([new Vec2(1, 2), new Vec2(3, 4)]);
    expect(list.toString()).toBe("[{ x: 1 y: 2 },{ x: 3 y: 4 }]");
    expect(makeList().toString()).toBe("[]");
  });
});

describe("Vec2Iterator pooling", () => {
  beforeEach(() => {
    (Vec2Iterator as any).zpp_pool = null;
  });

  it("cannot be constructed directly", () => {
    expect(() => new (Vec2Iterator as any)()).toThrow("Cannot instantiate Vec2Iterator derp!");
  });

  it("an exhausted iterator is pooled and reused by the next iterator() call", () => {
    const list = Vec2List.fromArray([new Vec2(1, 0)]);
    const it1 = list.iterator();
    expect(it1.hasNext()).toBe(true);
    it1.next();
    expect(it1.hasNext()).toBe(false);
    expect((Vec2Iterator as any).zpp_pool).toBe(it1);
    expect(it1.zpp_inner).toBeNull();
    const it2 = list.iterator();
    expect(it2).toBe(it1);
    expect(it2.zpp_i).toBe(0);
    expect(it2.zpp_inner).toBe(list);
    expect((Vec2Iterator as any).zpp_pool).toBeNull();
  });

  it("two simultaneous iterators over the same list are independent", () => {
    const list = Vec2List.fromArray([1, 2, 3].map((i) => new Vec2(i, 0)));
    const a = list.iterator();
    const b = list.iterator();
    expect(a).not.toBe(b);
    const pairs: number[][] = [];
    while (a.hasNext()) {
      const x = a.next().x;
      const inner: number[] = [];
      const c = list.iterator();
      while (c.hasNext()) inner.push(c.next().x);
      pairs.push([x, ...inner]);
    }
    expect(pairs).toEqual([
      [1, 1, 2, 3],
      [2, 1, 2, 3],
      [3, 1, 2, 3],
    ]);
    expect(b.hasNext()).toBe(true);
    expect(b.next().x).toBe(1);
  });

  it("removing the current element while iterating does not skip past the end", () => {
    const list = Vec2List.fromArray([1, 2, 3, 4].map((i) => new Vec2(i, 0)));
    const seen: number[] = [];
    const it = list.iterator();
    while (it.hasNext()) {
      const v = it.next();
      seen.push(v.x);
      if (v.x === 2) list.remove(v);
    }
    // Index-based iteration: removing index 1 shifts 3 into it, so 3 is skipped.
    expect(seen).toEqual([1, 2, 4]);
    expect(xs(list)).toEqual([1, 3, 4]);
  });

  it("pushing during iteration extends the walk (length is re-read every step)", () => {
    const list = Vec2List.fromArray([new Vec2(1, 0)]);
    const seen: number[] = [];
    for (const v of list) {
      seen.push(v.x);
      if (v.x < 3) list.push(new Vec2(v.x + 1, 0));
    }
    expect(seen).toEqual([1, 2, 3]);
  });

  // The underlying engine iterator returns to its pool once exhausted. The
  // ES wrapper used to keep a reference to it, so calling next() again — which
  // the iterator protocol allows and which must keep returning {done: true} —
  // threw, or advanced another iteration that had reused the pooled object.
  it("an exhausted ES iterator keeps returning done and never touches a recycled iterator", () => {
    const listA = Vec2List.fromArray([new Vec2(1, 0)]);
    const listB = Vec2List.fromArray([new Vec2(10, 0), new Vec2(20, 0)]);
    const esA = listA[Symbol.iterator]();
    expect(esA.next().done).toBe(false);
    expect(esA.next().done).toBe(true); // underlying iterator now pooled
    const itB = listB.iterator(); // receives the pooled iterator
    expect(esA.next()).toEqual({ value: undefined, done: true });
    // B's own iteration must be unaffected.
    const seen: number[] = [];
    while (itB.hasNext()) seen.push(itB.next().x);
    expect(seen).toEqual([10, 20]);
  });
});
