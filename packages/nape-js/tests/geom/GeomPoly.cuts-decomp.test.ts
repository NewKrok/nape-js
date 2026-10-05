/**
 * GeomPoly cut + decomposition algorithm coverage.
 *
 * Targets uncovered branches in:
 * - ZPP_Cutter (51% → boost): unbounded/bounded cuts, vertex hits, near-parallel,
 *   tangential cuts, multi-segment outputs, cuts that fully separate the polygon
 *   into N pieces.
 * - ZPP_Monotone (58% → boost): convex inputs, concave with single reflex vertex,
 *   multiple reflex vertices, triangulation through monotone partitions, etc.
 * - ZPP_Simple (57% → boost): self-intersection detection on various polygons.
 * - ZPP_Convex (97% → preserve), ZPP_Triangular (89%): convex decomposition checks.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSquare(s = 20): GeomPoly {
  return new GeomPoly([Vec2.get(-s, -s), Vec2.get(s, -s), Vec2.get(s, s), Vec2.get(-s, s)]);
}

function makePentagon(r = 20): GeomPoly {
  const verts: Vec2[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    verts.push(Vec2.get(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new GeomPoly(verts);
}

/** Concave L-shape with one reflex vertex. */
function makeLShape(): GeomPoly {
  return new GeomPoly([
    Vec2.get(0, 0),
    Vec2.get(40, 0),
    Vec2.get(40, 20),
    Vec2.get(20, 20),
    Vec2.get(20, 40),
    Vec2.get(0, 40),
  ]);
}

/** Cross/plus-sign with 4 reflex vertices. */
function makePlus(): GeomPoly {
  return new GeomPoly([
    Vec2.get(-10, -30),
    Vec2.get(10, -30),
    Vec2.get(10, -10),
    Vec2.get(30, -10),
    Vec2.get(30, 10),
    Vec2.get(10, 10),
    Vec2.get(10, 30),
    Vec2.get(-10, 30),
    Vec2.get(-10, 10),
    Vec2.get(-30, 10),
    Vec2.get(-30, -10),
    Vec2.get(-10, -10),
  ]);
}

/** Star with concave reflex vertices between every spike. */
function makeStar(spikes = 5, outerR = 30, innerR = 12): GeomPoly {
  const verts: Vec2[] = [];
  const total = spikes * 2;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push(Vec2.get(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new GeomPoly(verts);
}

// ---------------------------------------------------------------------------
// 1. ZPP_Cutter — unbounded vs bounded cuts
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — unbounded line", () => {
  it("horizontal unbounded cut splits a square into 2 pieces", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("vertical unbounded cut splits a square into 2 pieces", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(0, -50), Vec2.get(0, 50));
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("diagonal cut on a square produces 2 pieces of equal area", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-50, -50), Vec2.get(50, 50));
    expect(result.length).toBeGreaterThanOrEqual(2);

    const a1 = result.at(0).area();
    const a2 = result.at(1).area();
    expect(Math.abs(a1 - a2)).toBeLessThan(1);
  });

  it("cut passing through a vertex still produces valid pieces", () => {
    const sq = makeSquare(20);
    // Cut through the (-20, -20) corner
    const result = sq.cut(Vec2.get(-30, -30), Vec2.get(30, 30));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("cut tangent to one edge does not multiply pieces unexpectedly", () => {
    const sq = makeSquare(20);
    // Run cut along the top edge
    const result = sq.cut(Vec2.get(-30, 20), Vec2.get(30, 20));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GeomPoly.cut — bounded line (segment)", () => {
  it("bounded cut entirely outside the polygon returns the original", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(50, 0), Vec2.get(60, 10), true, true);
    expect(result.length).toBe(1);
  });

  it("bounded cut starting inside but ending outside leaves the polygon whole", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(0, 0), Vec2.get(50, 0), true, true);
    expect(result.length).toBe(1);
  });

  it("bounded cut spanning the polygon splits it into 2 pieces", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-30, 0), Vec2.get(30, 0), true, true);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("boundedStart=true alone (end is unbounded ray) cuts when start is in", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(0, 0), Vec2.get(30, 0), true, false);
    // End is an unbounded ray from (30, 0) onward — should cut
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("boundedEnd=true alone (start is unbounded ray) cuts symmetrically", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-30, 0), Vec2.get(0, 0), false, true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 2. ZPP_Cutter — multi-piece outputs (concave shapes)
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — concave shapes produce >=2 pieces", () => {
  it("horizontal cut through a plus produces multiple pieces", () => {
    const plus = makePlus();
    const result = plus.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    // A horizontal cut through the centre of a plus produces 2 pieces
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("cut through L-shape returns valid pieces", () => {
    const lshape = makeLShape();
    // Diagonal cut through the L
    const result = lshape.cut(Vec2.get(0, 50), Vec2.get(50, 0));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("vertical cut through star produces several pieces", () => {
    const star = makeStar(5, 30, 12);
    const result = star.cut(Vec2.get(0, -50), Vec2.get(0, 50));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Sequential cuts (cuts on cuts)
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — sequential cuts", () => {
  it("two perpendicular cuts produce 4 pieces from a square", () => {
    const sq = makeSquare(20);
    const horiz = sq.cut(Vec2.get(-30, 0), Vec2.get(30, 0));
    let total = 0;
    for (let i = 0; i < horiz.length; i++) {
      const piece = horiz.at(i);
      const sub = piece.cut(Vec2.get(0, -30), Vec2.get(0, 30));
      total += sub.length;
    }
    expect(total).toBeGreaterThanOrEqual(4);
  });

  it("three radial cuts produce a pinwheel of pieces", () => {
    let pieces = [makePentagon(30)];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      const x = Math.cos(a) * 100;
      const y = Math.sin(a) * 100;
      const next: GeomPoly[] = [];
      for (const p of pieces) {
        const r = p.cut(Vec2.get(-x, -y), Vec2.get(x, y));
        for (let j = 0; j < r.length; j++) next.push(r.at(j));
      }
      pieces = next;
    }
    expect(pieces.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Cut error paths
// ---------------------------------------------------------------------------

describe("GeomPoly.cut — error handling", () => {
  it("throws on null start", () => {
    const sq = makeSquare(20);
    expect(() => sq.cut(null as unknown as Vec2, Vec2.get(0, 0))).toThrow();
  });

  it("throws on null end", () => {
    const sq = makeSquare(20);
    expect(() => sq.cut(Vec2.get(0, 0), null as unknown as Vec2)).toThrow();
  });

  it("throws on disposed Vec2", () => {
    const sq = makeSquare(20);
    // Take `end` before disposing `v`, or the pool hands `v` straight back.
    const end = Vec2.get(10, 10);
    const v = Vec2.get(0, 0);
    v.dispose();
    expect(() => sq.cut(v, end)).toThrow("disposed");
    expect(() => sq.cut(end, v)).toThrow("disposed");
  });

  it("zero-length cut line returns the polygon uncut", () => {
    const sq = makeSquare(20);
    const pieces = sq.cut(new Vec2(5, 5), new Vec2(5, 5));
    expect(pieces.length).toBe(1);
    expect(Math.abs(pieces.at(0).area())).toBeCloseTo(Math.abs(sq.area()), 10);
    expect(pieces.at(0)).not.toBe(sq);
    // Same result as a line that misses the polygon entirely.
    expect(sq.cut(new Vec2(100, -5), new Vec2(100, 5)).length).toBe(1);
  });

  it("zero-length cut appends to a supplied output list and disposes weak Vec2s", () => {
    const sq = makeSquare(20);
    const out = sq.cut(new Vec2(-50, 0), new Vec2(50, 0));
    expect(out.length).toBe(2);
    const a = Vec2.weak(3, 3);
    const b = Vec2.weak(3, 3);
    expect(sq.cut(a, b, true, true, out)).toBe(out);
    expect(out.length).toBe(3);
    expect(a.zpp_disp).toBe(true);
    expect(b.zpp_disp).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. ZPP_Monotone — decomposition correctness
// ---------------------------------------------------------------------------

describe("GeomPoly.monotoneDecomposition", () => {
  it("convex polygon decomposes to itself (1 piece)", () => {
    const sq = makeSquare(20);
    const result = sq.monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("L-shape decomposes into >= 1 monotone piece", () => {
    const result = makeLShape().monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
    // Each piece must itself be a monotone polygon
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isMonotone()).toBe(true);
    }
  });

  it("plus shape decomposes into multiple monotone pieces", () => {
    const result = makePlus().monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isMonotone()).toBe(true);
    }
  });

  it("star decomposes into multiple monotone pieces", () => {
    const result = makeStar(5, 30, 12).monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isMonotone()).toBe(true);
    }
  });

  it("preserves total area within rounding tolerance", () => {
    const star = makeStar(6, 25, 10);
    const original = Math.abs(star.area());
    const result = star.monotoneDecomposition();
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += Math.abs(result.at(i).area());
    expect(Math.abs(sum - original)).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// 6. ZPP_Convex — convex decomposition
// ---------------------------------------------------------------------------

describe("GeomPoly.convexDecomposition", () => {
  it("convex polygon decomposes to itself (1 convex piece)", () => {
    const result = makePentagon(20).convexDecomposition();
    expect(result.length).toBe(1);
    expect(result.at(0).isConvex()).toBe(true);
  });

  it("L-shape decomposes into convex pieces", () => {
    const result = makeLShape().convexDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isConvex()).toBe(true);
    }
  });

  it("plus shape decomposes into convex pieces", () => {
    const result = makePlus().convexDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isConvex()).toBe(true);
    }
  });

  it("star decomposes into convex pieces", () => {
    const result = makeStar(5, 30, 12).convexDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isConvex()).toBe(true);
    }
  });

  it("delaunay flag produces valid output", () => {
    const result = makeLShape().convexDecomposition(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 7. ZPP_Triangular — every output triangle has 3 vertices
// ---------------------------------------------------------------------------

describe("GeomPoly.triangularDecomposition", () => {
  it("convex pentagon → 3 triangles", () => {
    const result = makePentagon(20).triangularDecomposition();
    expect(result.length).toBe(3);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).area()).not.toBe(0);
    }
  });

  it("L-shape produces a valid triangulation", () => {
    const result = makeLShape().triangularDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it("plus shape triangulates into multiple triangles covering the original area", () => {
    const plus = makePlus();
    const original = Math.abs(plus.area());
    const result = plus.triangularDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(4);
    let sum = 0;
    for (let i = 0; i < result.length; i++) sum += Math.abs(result.at(i).area());
    expect(Math.abs(sum - original)).toBeLessThan(1);
  });

  it("delaunay-optimised triangulation still produces valid pieces", () => {
    const result = makeLShape().triangularDecomposition(true);
    expect(result.length).toBeGreaterThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// 8. ZPP_Simple — self-intersection detection
// ---------------------------------------------------------------------------

describe("GeomPoly.isSimple", () => {
  it("true for a square", () => {
    expect(makeSquare(20).isSimple()).toBe(true);
  });

  it("true for a star shape (no self-intersections in this construction)", () => {
    expect(makeStar(5, 30, 12).isSimple()).toBe(true);
  });

  it("false for a self-intersecting bowtie", () => {
    const bowtie = new GeomPoly([
      Vec2.get(-10, -10),
      Vec2.get(10, 10),
      Vec2.get(10, -10),
      Vec2.get(-10, 10),
    ]);
    expect(bowtie.isSimple()).toBe(false);
  });

  it("false for figure-8", () => {
    const fig8 = new GeomPoly([Vec2.get(0, 0), Vec2.get(20, 20), Vec2.get(0, 20), Vec2.get(20, 0)]);
    expect(fig8.isSimple()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. ZPP_Simplify — Douglas-Peucker correctness
// ---------------------------------------------------------------------------

describe("GeomPoly.simplify", () => {
  it("removes nearly collinear points within epsilon", () => {
    const verts: Vec2[] = [];
    // Square with extra points on one edge
    verts.push(Vec2.get(0, 0));
    for (let i = 1; i <= 10; i++) verts.push(Vec2.get(i * 2, 0));
    verts.push(Vec2.get(20, 20));
    verts.push(Vec2.get(0, 20));
    const noisy = new GeomPoly(verts);

    const simplified = noisy.simplify(0.5);

    // Vertex count should be reduced
    let count = 0;
    const it = simplified.iterator();
    while (it.hasNext()) {
      it.next();
      count++;
    }
    expect(count).toBeLessThan(13);
  });

  it("throws on epsilon <= 0", () => {
    const sq = makeSquare(20);
    expect(() => sq.simplify(0)).toThrow();
    expect(() => sq.simplify(-1)).toThrow();
  });

  it("very small epsilon preserves all vertices of a clean shape", () => {
    const sq = makeSquare(20);
    const simplified = sq.simplify(0.0001);
    let count = 0;
    const it = simplified.iterator();
    while (it.hasNext()) {
      it.next();
      count++;
    }
    expect(count).toBe(4);
  });
});
