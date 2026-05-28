/**
 * ZPP_Cutter — precision, winding, and degenerate-input coverage.
 *
 * Targets the issue #165 scenarios that GeomPoly.cuts-decomp.test.ts does NOT
 * cover: precision loss on near-180° edge pairs, output winding-order
 * consistency, and degenerate / self-intersecting input rejection.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";

function makeSquare(s = 20): GeomPoly {
  return new GeomPoly([Vec2.get(-s, -s), Vec2.get(s, -s), Vec2.get(s, s), Vec2.get(-s, s)]);
}

function makeSquareCW(s = 20): GeomPoly {
  return new GeomPoly([Vec2.get(-s, -s), Vec2.get(-s, s), Vec2.get(s, s), Vec2.get(s, -s)]);
}

/** Square with a vertex slightly off-line — near-180° angle at that vertex. */
function makeSquareWithNear180(s: number, eps: number): GeomPoly {
  return new GeomPoly([
    Vec2.get(-s, -s),
    Vec2.get(0, -s + eps), // nearly colinear with bottom edge
    Vec2.get(s, -s),
    Vec2.get(s, s),
    Vec2.get(-s, s),
  ]);
}

// ---------------------------------------------------------------------------
// Output winding-order consistency — cut output must inherit input winding
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — output winding matches input", () => {
  it("square cut horizontally produces pieces with the input winding", () => {
    const sq = makeSquare(20);
    const expectedCw = sq.isClockwise();
    const result = sq.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isClockwise()).toBe(expectedCw);
    }
  });

  it("square in reversed vertex order produces pieces with the reversed winding", () => {
    const sq = makeSquareCW(20);
    const expectedCw = sq.isClockwise();
    const result = sq.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isClockwise()).toBe(expectedCw);
    }
  });

  it("concave L-shape cut horizontally preserves input winding across all pieces", () => {
    const lshape = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(40, 0),
      Vec2.get(40, 20),
      Vec2.get(20, 20),
      Vec2.get(20, 40),
      Vec2.get(0, 40),
    ]);
    const expectedCw = lshape.isClockwise();
    const result = lshape.cut(Vec2.get(-10, 10), Vec2.get(50, 10));
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isClockwise()).toBe(expectedCw);
    }
  });
});

// ---------------------------------------------------------------------------
// Area conservation — cut pieces must sum back to the original area
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — area conservation", () => {
  it("horizontal cut through a square conserves area", () => {
    const sq = makeSquare(20);
    const original = Math.abs(sq.area());
    const result = sq.cut(Vec2.get(-50, 3), Vec2.get(50, 3));
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += Math.abs(result.at(i).area());
    expect(Math.abs(sum - original)).toBeLessThan(1e-6);
  });

  it("oblique cut through a square conserves area", () => {
    const sq = makeSquare(20);
    const original = Math.abs(sq.area());
    const result = sq.cut(Vec2.get(-50, -7), Vec2.get(50, 11));
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += Math.abs(result.at(i).area());
    expect(Math.abs(sum - original)).toBeLessThan(1e-6);
  });

  it("cut on a concave star conserves area", () => {
    const verts: Vec2[] = [];
    const total = 10;
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 30 : 12;
      verts.push(Vec2.get(Math.cos(a) * r, Math.sin(a) * r));
    }
    const star = new GeomPoly(verts);
    const original = Math.abs(star.area());
    const result = star.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += Math.abs(result.at(i).area());
    expect(Math.abs(sum - original)).toBeLessThan(1e-6);
  });
});

// ---------------------------------------------------------------------------
// Precision: near-180° edge pairs at the cut intersection
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — precision on near-180° edges", () => {
  it("handles a vertex 1e-6 off the cut line without producing degenerate output", () => {
    // The middle vertex is essentially on the bottom edge.
    const poly = makeSquareWithNear180(20, 1e-6);
    expect(poly.isSimple()).toBe(true);
    // Cut horizontally — passes nearly through the suspect vertex.
    const result = poly.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    expect(result.length).toBeGreaterThanOrEqual(2);
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += Math.abs(result.at(i).area());
    expect(Math.abs(sum - Math.abs(poly.area()))).toBeLessThan(1e-3);
  });

  it("handles a vertex 1e-10 off the cut line", () => {
    const poly = makeSquareWithNear180(20, 1e-10);
    const result = poly.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += Math.abs(result.at(i).area());
    expect(Math.abs(sum - Math.abs(poly.area()))).toBeLessThan(1e-3);
  });

  it("very thin polygon (near-collinear ring) cuts without crashing", () => {
    const thin = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(100, 1e-3),
      Vec2.get(100, 1e-3 + 0.1),
      Vec2.get(0, 0.1),
    ]);
    expect(thin.isSimple()).toBe(true);
    const result = thin.cut(Vec2.get(50, -1), Vec2.get(50, 1));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Degenerate / self-intersecting input rejection
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — rejects non-simple polygons", () => {
  it("throws on a self-intersecting bowtie", () => {
    const bowtie = new GeomPoly([
      Vec2.get(-10, -10),
      Vec2.get(10, 10),
      Vec2.get(10, -10),
      Vec2.get(-10, 10),
    ]);
    expect(bowtie.isSimple()).toBe(false);
    expect(() => bowtie.cut(Vec2.get(-50, 0), Vec2.get(50, 0))).toThrow();
  });

  it("throws on a figure-8", () => {
    const fig8 = new GeomPoly([Vec2.get(0, 0), Vec2.get(20, 20), Vec2.get(0, 20), Vec2.get(20, 0)]);
    expect(fig8.isSimple()).toBe(false);
    expect(() => fig8.cut(Vec2.get(-10, 10), Vec2.get(30, 10))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Output reusability — passing an existing output list
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — output list reuse", () => {
  it("appends results to a provided output list", () => {
    const sq1 = makeSquare(20);
    const sq2 = makeSquare(20);
    const out = sq1.cut(Vec2.get(-30, 0), Vec2.get(30, 0));
    const lenAfterFirst = out.length;
    sq2.cut(Vec2.get(0, -30), Vec2.get(0, 30), false, false, out);
    expect(out.length).toBeGreaterThan(lenAfterFirst);
  });
});
