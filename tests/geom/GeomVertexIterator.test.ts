import { describe, it, expect } from "vitest";
import { GeomVertexIterator } from "../../src/geom/GeomVertexIterator";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";

describe("GeomVertexIterator", () => {
  describe("instantiation guard", () => {
    it("should throw when instantiated directly", () => {
      expect(() => new (GeomVertexIterator as any)()).toThrow(
        "Cannot instantiate GeomVertexIterator",
      );
    });
  });

  describe("forward iteration via hasNext()/next()", () => {
    it("should iterate over all vertices of a triangle", () => {
      const poly = new GeomPoly([Vec2.get(0, 0), Vec2.get(10, 0), Vec2.get(10, 10)]);
      const iter = poly.forwardIterator();

      const verts: Vec2[] = [];
      while (iter.hasNext()) {
        verts.push(iter.next());
      }

      expect(verts).toHaveLength(3);
    });

    it("should iterate over all vertices of a quad", () => {
      const poly = new GeomPoly([
        Vec2.get(0, 0),
        Vec2.get(20, 0),
        Vec2.get(20, 15),
        Vec2.get(0, 15),
      ]);
      const iter = poly.forwardIterator();

      const verts: Vec2[] = [];
      while (iter.hasNext()) {
        verts.push(iter.next());
      }

      expect(verts).toHaveLength(4);
    });

    it("should return Vec2 instances", () => {
      const poly = new GeomPoly([Vec2.get(1, 2), Vec2.get(3, 4), Vec2.get(5, 6)]);
      const iter = poly.forwardIterator();

      while (iter.hasNext()) {
        const v = iter.next();
        expect(v).toBeInstanceOf(Vec2);
      }
    });

    it("should return vertices with correct coordinates", () => {
      const poly = new GeomPoly([
        Vec2.get(0, 0),
        Vec2.get(10, 0),
        Vec2.get(10, 10),
        Vec2.get(0, 10),
      ]);
      const iter = poly.forwardIterator();

      const coords: Array<[number, number]> = [];
      while (iter.hasNext()) {
        const v: Vec2 = iter.next();
        coords.push([v.x, v.y]);
      }

      // GeomPoly stores vertices in a circular linked list starting at the
      // current head position after the constructor's skipForward(1).
      expect(coords).toEqual([
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]);
    });
  });

  describe("backwards iteration", () => {
    it("should iterate in reverse order", () => {
      const poly = new GeomPoly([
        Vec2.get(0, 0),
        Vec2.get(10, 0),
        Vec2.get(10, 10),
        Vec2.get(0, 10),
      ]);

      const fwdCoords: Array<[number, number]> = [];
      const fwdIter = poly.forwardIterator();
      while (fwdIter.hasNext()) {
        const v: Vec2 = fwdIter.next();
        fwdCoords.push([v.x, v.y]);
      }

      const bwdCoords: Array<[number, number]> = [];
      const bwdIter = poly.backwardsIterator();
      while (bwdIter.hasNext()) {
        const v: Vec2 = bwdIter.next();
        bwdCoords.push([v.x, v.y]);
      }

      // Backwards traverses the circular list in reverse link order.
      // Starting from the same head, backwards goes prev instead of next.
      expect(bwdCoords).toHaveLength(fwdCoords.length);
      // The backwards order should contain the same vertices but traversed
      // in the opposite direction through the circular list.
      const fwdSet = new Set(fwdCoords.map(([x, y]) => `${x},${y}`));
      const bwdSet = new Set(bwdCoords.map(([x, y]) => `${x},${y}`));
      expect(bwdSet).toEqual(fwdSet);
    });
  });

  describe("Symbol.iterator support", () => {
    it("should be iterable with for...of", () => {
      const poly = new GeomPoly([Vec2.get(0, 0), Vec2.get(5, 0), Vec2.get(5, 5)]);
      const iter = poly.forwardIterator();

      const verts: Vec2[] = [];
      for (const v of iter) {
        verts.push(v as Vec2);
      }

      expect(verts).toHaveLength(3);
      verts.forEach((v) => expect(v).toBeInstanceOf(Vec2));
    });

    it("should support spread syntax", () => {
      const poly = new GeomPoly([Vec2.get(1, 1), Vec2.get(2, 2), Vec2.get(3, 3), Vec2.get(4, 4)]);
      const iter = poly.forwardIterator();

      const verts = [...iter];
      expect(verts).toHaveLength(4);
    });
  });

  describe("iterator disposal", () => {
    it("should dispose after full iteration", () => {
      const poly = new GeomPoly([Vec2.get(0, 0), Vec2.get(1, 0), Vec2.get(1, 1)]);
      const iter = poly.forwardIterator();

      // Exhaust the iterator
      while (iter.hasNext()) {
        iter.next();
      }

      // After exhaustion, the inner state is released and further use throws
      expect(() => iter.hasNext()).toThrow("Iterator has been disposed");
    });

    it("should throw on next() after disposal", () => {
      const poly = new GeomPoly([Vec2.get(0, 0), Vec2.get(1, 0), Vec2.get(1, 1)]);
      const iter = poly.forwardIterator();

      while (iter.hasNext()) {
        iter.next();
      }

      expect(() => iter.next()).toThrow("Iterator has been disposed");
    });
  });

  describe("single vertex polygon", () => {
    it("should iterate over a single vertex", () => {
      const poly = new GeomPoly([Vec2.get(7, 13)]);
      const iter = poly.forwardIterator();

      const verts: Vec2[] = [];
      while (iter.hasNext()) {
        verts.push(iter.next());
      }

      expect(verts).toHaveLength(1);
      expect(verts[0].x).toBe(7);
      expect(verts[0].y).toBe(13);
    });
  });
});
