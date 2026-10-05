/**
 * ZPP_MixVec2List — Vec2List backed by an intrusive ZPP_Vec2 chain (the
 * storage of Polygon.localVerts / worldVerts). Model-based mutation in both
 * orientation modes, `_inuse` bookkeeping, immutability and Polygon
 * integration (issue #167).
 */
import { describe, it, expect } from "vitest";
import "../../../src/index";
import { Vec2 } from "../../../src/geom/Vec2";
import { Vec2List } from "../../../src/geom/Vec2List";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Polygon } from "../../../src/shape/Polygon";
import { Space } from "../../../src/space/Space";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";
import { ZPP_MixVec2List } from "../../../src/native/util/ZPP_MixVec2List";

function mixList(immutable?: boolean): any {
  return (ZPP_MixVec2List as any).get(new ZPP_Vec2(), immutable);
}

function xs(list: any): number[] {
  const out: number[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.at(i).x);
  return out;
}

/** Index-based snapshot (ZPP_MixVec2List is not ES-iterable — see the it.fails below). */
function pts(list: any): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < list.length; i++) out.push([list.at(i).x, list.at(i).y]);
  return out;
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

describe("ZPP_MixVec2List — standalone", () => {
  it("is a Vec2List with a working length getter", () => {
    const list = mixList();
    expect(list).toBeInstanceOf(ZPP_MixVec2List as any);
    expect(typeof list.copy).toBe("function"); // inherited from Vec2List
    expect(list.length).toBe(0);
    expect(list.empty()).toBe(true);
  });

  for (const reverse of [false, true]) {
    it(`random mutation sequence matches an array model (reverse_flag = ${reverse})`, () => {
      const rand = rng(reverse ? 11 : 10);
      const list = mixList();
      list.zpp_inner.reverse_flag = reverse;
      const model: Vec2[] = [];
      let next = 0;
      for (let step = 0; step < 500; step++) {
        const r = rand();
        if (r < 0.25) {
          const v = new Vec2(next++, 0);
          expect(list.push(v)).toBe(true);
          model.push(v);
        } else if (r < 0.45) {
          const v = new Vec2(next++, 0);
          expect(list.unshift(v)).toBe(true);
          model.unshift(v);
        } else if (r < 0.55) {
          if (model.length === 0) {
            expect(() => list.pop()).toThrow("Cannot remove from empty list");
          } else {
            const v = list.pop();
            expect(v).toBe(model.pop());
            expect(v.zpp_inner._inuse).toBe(false);
          }
        } else if (r < 0.65) {
          if (model.length === 0) {
            expect(() => list.shift()).toThrow("Cannot remove from empty list");
          } else {
            const v = list.shift();
            expect(v).toBe(model.shift());
            expect(v.zpp_inner._inuse).toBe(false);
          }
        } else if (r < 0.75) {
          if (model.length > 0) {
            const i = Math.floor(rand() * model.length);
            const v = model[i];
            expect(list.remove(v)).toBe(true);
            model.splice(i, 1);
            expect(v.zpp_inner._inuse).toBe(false);
          }
          expect(list.remove(new Vec2(-5, 0))).toBe(false);
        } else {
          for (let k = 0; k < 3 && model.length > 0; k++) {
            const i = Math.floor(rand() * model.length);
            expect(list.at(i)).toBe(model[i]);
          }
        }
        expect(list.length).toBe(model.length);
      }
      expect(xs(list)).toEqual(model.map((v) => v.x));
      const viaIterator: number[] = [];
      const it = list.iterator();
      while (it.hasNext()) viaIterator.push(it.next().x);
      expect(viaIterator).toEqual(model.map((v) => v.x));
      for (const v of model) expect(v.zpp_inner._inuse).toBe(true);
    });

    it(`clear() drains every element and releases them (reverse_flag = ${reverse})`, () => {
      const list = mixList();
      list.zpp_inner.reverse_flag = reverse;
      const vs = [1, 2, 3].map((i) => new Vec2(i, 0));
      for (const v of vs) list.push(v);
      const order: number[] = [];
      list.zpp_inner.subber = (v: Vec2) => order.push(v.x);
      list.clear();
      expect(list.length).toBe(0);
      expect(order).toEqual(reverse ? [3, 2, 1] : [1, 2, 3]);
      for (const v of vs) expect(v.zpp_inner._inuse).toBe(false);
    });
  }

  it("elements are marked in-use: they cannot be pushed twice or disposed while listed", () => {
    const a = mixList();
    const b = mixList();
    const v = Vec2.get(1, 1);
    a.push(v);
    expect(() => a.push(v)).toThrow("Vec2 is already in use");
    expect(() => b.unshift(v)).toThrow("Vec2 is already in use");
    expect(() => v.dispose()).toThrow("This Vec2 is not disposable");
    expect(a.length).toBe(1);
    expect(b.length).toBe(0);
    a.remove(v);
    v.dispose(); // released → disposable again
    expect(v.zpp_disp).toBe(true);
  });

  it("adder veto, post_adder and dontremove behave like Vec2List", () => {
    for (const reverse of [false, true]) {
      const list = mixList();
      list.zpp_inner.reverse_flag = reverse;
      const posted: number[] = [];
      list.zpp_inner.adder = (v: Vec2) => v.x > 0;
      list.zpp_inner.post_adder = (v: Vec2) => posted.push(v.x);
      expect(list.push(new Vec2(-1, 0))).toBe(false);
      expect(list.unshift(new Vec2(-2, 0))).toBe(false);
      const a = new Vec2(1, 0);
      const b = new Vec2(2, 0);
      expect(list.push(a)).toBe(true);
      expect(list.unshift(b)).toBe(true);
      expect(posted).toEqual([1, 2]);
      expect(xs(list)).toEqual([2, 1]);

      const subbed: number[] = [];
      list.zpp_inner.subber = (v: Vec2) => subbed.push(v.x);
      list.zpp_inner.dontremove = true;
      expect(list.pop()).toBe(a);
      expect(list.shift()).toBe(b);
      expect(list.remove(a)).toBe(true);
      expect(subbed).toEqual([1, 2, 1]);
      expect(xs(list)).toEqual([2, 1]);
    }
  });

  it("immutable view rejects every mutator with 'Vec2List is immutable'", () => {
    const sentinel = new ZPP_Vec2();
    const el = new ZPP_Vec2();
    el.x = 4;
    sentinel.add(el);
    const list = (ZPP_MixVec2List as any).get(sentinel, true);
    const v = new Vec2(1, 1);
    expect(() => list.push(v)).toThrow("Vec2List is immutable");
    expect(() => list.unshift(v)).toThrow("Vec2List is immutable");
    expect(() => list.pop()).toThrow("Vec2List is immutable");
    expect(() => list.shift()).toThrow("Vec2List is immutable");
    expect(() => list.remove(v)).toThrow("Vec2List is immutable");
    expect(() => list.clear()).toThrow("Vec2List is immutable");
    expect(list.length).toBe(1);
  });

  it("raw elements without a wrapper get one bound lazily by at()/pop()/shift()", () => {
    const sentinel = new ZPP_Vec2();
    const raws = [3, 2, 1].map((x) => {
      const z = new ZPP_Vec2();
      z.x = x;
      z.y = -x;
      sentinel.add(z);
      return z;
    });
    // raws were added at the head, so the list order is 1, 2, 3.
    const list = (ZPP_MixVec2List as any).get(sentinel);
    expect(raws.every((z) => z.outer == null)).toBe(true);
    const mid = list.at(1);
    expect(mid).toBeInstanceOf(Vec2);
    expect(mid.zpp_inner).toBe(raws[1]);
    expect([mid.x, mid.y]).toEqual([2, -2]);
    expect(list.at(1)).toBe(mid);
    const last = list.pop();
    expect(last.zpp_inner).toBe(raws[0]);
    const first = list.shift();
    expect(first.zpp_inner).toBe(raws[2]);
    expect(list.length).toBe(1);
  });

  it("at() out of range throws", () => {
    const list = mixList();
    expect(() => list.at(0)).toThrow("Index out of bounds");
    list.push(new Vec2());
    expect(() => list.at(1)).toThrow("Index out of bounds");
    expect(() => list.at(-1)).toThrow("Index out of bounds");
  });
});

describe("ZPP_MixVec2List — Polygon integration", () => {
  const ccw = () => [new Vec2(0, 0), new Vec2(10, 0), new Vec2(10, 10), new Vec2(0, 10)];
  const cw = () => [new Vec2(0, 0), new Vec2(0, 10), new Vec2(10, 10), new Vec2(10, 0)];

  for (const [label, make] of [
    ["one winding", ccw],
    ["the other winding", cw],
  ] as const) {
    it(`localVerts keeps the user's vertex order after validation (${label})`, () => {
      const input = make();
      const poly = new Polygon(input);
      const before = pts(poly.localVerts);
      expect(before).toEqual(input.map((v) => [v.x, v.y]));
      expect(poly.area).toBeCloseTo(100);
      // After validation the internal ring may have been reversed, but the
      // public order must be unchanged.
      const after = pts(poly.localVerts);
      expect(after).toEqual(before);
      expect(poly.localVerts.zpp_inner.reverse_flag).toBe(poly.zpp_inner_zn.reverse_flag);
    });

    it(`push/pop/shift/unshift on localVerts keep worldVerts and edges in sync (${label})`, () => {
      const poly = new Polygon(make());
      void poly.area; // force validation (possibly reversing internally)
      const body = new Body(BodyType.DYNAMIC, new Vec2(100, 50));
      body.shapes.add(poly);
      const lv = poly.localVerts;
      const model = pts(lv);

      lv.push(new Vec2(5, -5));
      model.push([5, -5]);
      lv.unshift(new Vec2(-5, 5));
      model.unshift([-5, 5]);
      expect(pts(lv)).toEqual(model);
      expect(poly.worldVerts.length).toBe(model.length);
      expect(poly.edges.length).toBe(model.length);

      lv.pop();
      model.pop();
      lv.shift();
      model.shift();
      expect(pts(lv)).toEqual(model);
      expect(poly.worldVerts.length).toBe(model.length);
      expect(poly.edges.length).toBe(model.length);

      // World vertices are local vertices offset by the body position.
      // (No rotation, COM aligned by construction: compare offsets.)
      const wv = pts(poly.worldVerts).map(([x, y]) => [x - 100, y - 50]);
      expect(wv.map((p) => p.map((c) => Math.round(c)))).toEqual(model);
    });
  }

  it("worldVerts is an immutable view whose elements are immutable too", () => {
    const poly = new Polygon(ccw());
    const body = new Body(BodyType.DYNAMIC, new Vec2(1, 2));
    body.shapes.add(poly);
    const wv = poly.worldVerts;
    expect(() => wv.push(new Vec2())).toThrow("Vec2List is immutable");
    expect(() => wv.pop()).toThrow("Vec2List is immutable");
    expect(() => wv.clear()).toThrow("Vec2List is immutable");
    const w0 = wv.at(0);
    expect([w0.x, w0.y]).toEqual([1, 2]);
    expect(() => {
      w0.x = 3;
    }).toThrow("Vec2 is immutable");
    expect(wv.at(0)).toBe(w0); // wrapper cached on the raw ZPP_Vec2
  });

  it("worldVerts of a body-less polygon refuse to evaluate", () => {
    const poly = new Polygon(ccw());
    const w0 = poly.worldVerts.at(0);
    expect(() => w0.x).toThrow(
      "Error: World vertex only makes sense when Polygon is contained in a rigid body",
    );
  });

  it("localVerts of a static body inside a Space cannot be modified", () => {
    const space = new Space();
    const poly = new Polygon(ccw());
    const body = new Body(BodyType.STATIC);
    body.shapes.add(poly);
    body.space = space;
    const lv = poly.localVerts;
    expect(() => lv.push(new Vec2(1, 1))).toThrow(
      "Cannot modifiy shapes of static object once added to Space",
    );
    expect(() => {
      lv.at(0).x = 1;
    }).toThrow(
      "Error: Cannot modify local vertex of Polygon added to a static body whilst within a Space",
    );
    expect(lv.length).toBe(4);
  });

  it("modifying a local vertex through its wrapper invalidates derived data", () => {
    const poly = new Polygon(ccw());
    expect(poly.area).toBeCloseTo(100);
    const lv = poly.localVerts;
    let v: Vec2 | null = null;
    for (let i = 0; i < lv.length; i++) if (lv.at(i).x === 10 && lv.at(i).y === 10) v = lv.at(i);
    v!.x = 20;
    expect(poly.area).toBeCloseTo(150);
  });

  // Suspected port defect: ZPP_MixVec2List copies Vec2List.prototype with a
  // for...in loop, which skips symbol keys, so Symbol.iterator (installed by
  // installIterable on Vec2List) is never copied. Every other Vec2List supports
  // for...of / spread, but Polygon.localVerts and Polygon.worldVerts throw
  // "TypeError: … is not iterable".
  it("Polygon.localVerts / worldVerts support for...of like every other Vec2List", () => {
    const poly = new Polygon(ccw());
    new Body().shapes.add(poly);
    expect([...poly.localVerts].map((v: Vec2) => v.x)).toEqual([0, 10, 10, 0]);
    expect([...poly.worldVerts]).toHaveLength(4);
  });

  // Suspected port defect: in Haxe nape ZPP_MixVec2List *extends* Vec2List, so
  // a polygon's localVerts is a Vec2List and is accepted by the Polygon
  // constructor ("Array<Vec2>, Vec2List or GeomPoly"). Here the prototype is
  // copied rather than chained, so `instanceof Vec2List` is false and the
  // constructor rejects it with "Invalid type for polygon object".
  it("a polygon's localVerts is a Vec2List and can seed a new Polygon", () => {
    const src = new Polygon(ccw());
    expect(src.localVerts).toBeInstanceOf(Vec2List);
    const clone = new Polygon(src.localVerts);
    expect(pts(clone.localVerts)).toEqual(pts(src.localVerts));
  });

  it("copy() of localVerts is a plain detached Vec2List", () => {
    const poly = new Polygon(ccw());
    const copy = poly.localVerts.copy(true);
    expect(copy).toBeInstanceOf(Vec2List);
    expect(copy).not.toBeInstanceOf(ZPP_MixVec2List as any);
    copy.at(0).x = 99;
    expect(poly.localVerts.at(0).x).toBe(0);
  });
});
