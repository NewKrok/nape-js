/**
 * Factory-generated typed lists (NapeListFactory) — model-based mutation in
 * both orientations. A list with `zpp_inner.reverse_flag` set presents its
 * internal linked list back to front (the engine does this for e.g. polygon
 * vertex lists of reversed polygons and GeomPolyLists built in reverse); the
 * reverse paths of unshift / pop / shift / at / remove / clear never ran.
 * Each case runs a random op sequence against an array model.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Body } from "../../src/phys/Body";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { BodyList, GeomPolyList } from "../../src/util/registerLists";

function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS = [
  { name: "BodyList", make: () => new (BodyList as any)(), elem: () => new Body() },
  { name: "GeomPolyList", make: () => new (GeomPolyList as any)(), elem: () => new GeomPoly() },
];

for (const K of KINDS) {
  for (const reverse of [false, true]) {
    describe(`${K.name} — reverse_flag = ${reverse}`, () => {
      it("random push/unshift/add/pop/shift/remove/at sequences match an array model", () => {
        const rand = rng(reverse ? 22 : 11);
        const list = K.make();
        list.zpp_inner.reverse_flag = reverse;
        const model: unknown[] = [];
        for (let step = 0; step < 500; step++) {
          const r = rand();
          if (r < 0.2) {
            const e = K.elem();
            expect(list.push(e)).toBe(true);
            model.push(e);
          } else if (r < 0.35) {
            const e = K.elem();
            expect(list.unshift(e)).toBe(true);
            model.unshift(e);
          } else if (r < 0.45) {
            const e = K.elem();
            expect(list.add(e)).toBe(true);
            if (reverse) model.push(e);
            else model.unshift(e);
          } else if (r < 0.55) {
            if (model.length === 0)
              expect(() => list.pop()).toThrow("Cannot remove from empty list");
            else expect(list.pop()).toBe(model.pop());
          } else if (r < 0.65) {
            if (model.length === 0)
              expect(() => list.shift()).toThrow("Cannot remove from empty list");
            else expect(list.shift()).toBe(model.shift());
          } else if (r < 0.75) {
            if (model.length > 0) {
              const i = Math.floor(rand() * model.length);
              const e = model[i];
              expect(list.remove(e)).toBe(true);
              model.splice(i, 1);
              expect(list.has(e)).toBe(false);
            }
            expect(list.remove(K.elem())).toBe(false);
          } else {
            for (let k = 0; k < 3 && model.length > 0; k++) {
              const i = Math.floor(rand() * model.length);
              expect(list.at(i)).toBe(model[i]);
            }
          }
          expect(list.length).toBe(model.length);
          expect(list.empty()).toBe(model.length === 0);
        }
        expect([...list]).toEqual(model);
        for (let i = 0; i < model.length; i++) expect(list.at(i)).toBe(model[i]);
      });

      it("clear() drains from the presented end and fires the subber per element", () => {
        const list = K.make();
        list.zpp_inner.reverse_flag = reverse;
        const elems = [K.elem(), K.elem(), K.elem(), K.elem()];
        for (const e of elems) list.push(e);
        expect([...list]).toEqual(elems);
        const removed: unknown[] = [];
        list.zpp_inner.subber = (e: unknown) => removed.push(e);
        list.clear();
        expect(list.length).toBe(0);
        expect(removed).toEqual(reverse ? [...elems].reverse() : elems);
      });

      it("at() bounds and a pop after priming the cursor on the last node", () => {
        const list = K.make();
        list.zpp_inner.reverse_flag = reverse;
        const [a, b, c] = [K.elem(), K.elem(), K.elem()];
        list.push(a);
        list.push(b);
        expect(() => list.at(2)).toThrow("Index out of bounds");
        expect(() => list.at(-1)).toThrow("Index out of bounds");
        list.at(1);
        expect(list.pop()).toBe(b);
        list.push(c);
        expect([...list]).toEqual([a, c]);
        list.at(1);
        expect(list.shift()).toBe(a);
        expect([...list]).toEqual([c]);
      });
    });
  }
}
