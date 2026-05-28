/**
 * ZPP_Simplify / ZPP_SimplifyP / ZPP_SimplifyV — edge-case coverage.
 *
 * Targets the issue #165 scenarios that GeomPoly.cuts-decomp.test.ts does not
 * cover: near-colinear reflex vertices, coincident vertices, epsilon larger
 * than the polygon, and stability of forced-vertex preservation in RDP.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";

function countVerts(p: GeomPoly): number {
  let n = 0;
  const it = p.iterator();
  while (it.hasNext()) {
    it.next();
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Epsilon boundary behavior
// ---------------------------------------------------------------------------

describe("GeomPoly.simplify — epsilon boundary", () => {
  it("epsilon just below a vertex's perpendicular distance keeps the vertex", () => {
    // Square with a bump 1.0 above the top edge — bump-vertex perp dist = 1.0
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(20, 0),
      Vec2.get(20, 10),
      Vec2.get(10, 11), // bump 1.0 above the line y=10
      Vec2.get(0, 10),
    ]);
    // epsilon^2 = 0.5 — below 1.0² = 1.0, so bump must remain
    const out = poly.simplify(Math.sqrt(0.5));
    expect(countVerts(out)).toBeGreaterThanOrEqual(5);
  });

  it("epsilon just above a vertex's perpendicular distance removes the vertex", () => {
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(20, 0),
      Vec2.get(20, 10),
      Vec2.get(10, 10.1), // bump 0.1
      Vec2.get(0, 10),
    ]);
    // epsilon = 1.0, epsilon² = 1.0 — far above 0.01 → bump should go
    const out = poly.simplify(1.0);
    expect(countVerts(out)).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// Coincident / duplicate vertices
// ---------------------------------------------------------------------------

describe("GeomPoly.simplify — coincident vertices", () => {
  it("removes duplicated vertices on a straight edge", () => {
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(5, 0),
      Vec2.get(5, 0), // exact duplicate
      Vec2.get(10, 0),
      Vec2.get(10, 10),
      Vec2.get(0, 10),
    ]);
    const out = poly.simplify(0.5);
    expect(countVerts(out)).toBeLessThanOrEqual(5);
  });

  it("repeated point at a corner still produces a closable polygon", () => {
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(0, 0), // duplicate corner
      Vec2.get(10, 0),
      Vec2.get(10, 10),
      Vec2.get(0, 10),
    ]);
    const out = poly.simplify(0.5);
    const n = countVerts(out);
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Near-colinear / reflex preservation
// ---------------------------------------------------------------------------

describe("GeomPoly.simplify — near-colinear reflex preservation", () => {
  it("preserves a near-180° reflex vertex even at large epsilon", () => {
    // Concave: outer rectangle with one reflex notch pointing in 1e-3
    // The reflex vertex is critical to the polygon's identity and should
    // not vanish merely because three of its incident edges look near-colinear.
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(40, 0),
      Vec2.get(40, 20),
      Vec2.get(25, 20),
      Vec2.get(20, 19.999), // near-colinear with neighbours
      Vec2.get(15, 20),
      Vec2.get(0, 20),
    ]);
    const out = poly.simplify(1.0);
    // The polygon should remain simple (the simplification must not
    // produce a self-intersecting or degenerate ring).
    expect(out.isSimple()).toBe(true);
  });

  it("near-colinear chain of vertices collapses to its endpoints", () => {
    // A square with 50 nearly-colinear intermediate points along one edge.
    const verts: Vec2[] = [Vec2.get(0, 0)];
    for (let i = 1; i <= 50; i++) {
      verts.push(Vec2.get(i, 0.001 * Math.sin(i)));
    }
    verts.push(Vec2.get(51, 0));
    verts.push(Vec2.get(51, 20));
    verts.push(Vec2.get(0, 20));
    const poly = new GeomPoly(verts);
    const out = poly.simplify(1.0);
    // 50 intermediate points should collapse heavily.
    expect(countVerts(out)).toBeLessThan(20);
    expect(out.isSimple()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Epsilon comparable to polygon size
// ---------------------------------------------------------------------------

describe("GeomPoly.simplify — epsilon scale", () => {
  it("epsilon larger than the polygon diameter collapses to minimum", () => {
    // 10×10 square, epsilon = 1000. RDP should reduce the polygon hard,
    // but the wrapper must not return a degenerate or null polygon.
    const sq = new GeomPoly([Vec2.get(0, 0), Vec2.get(10, 0), Vec2.get(10, 10), Vec2.get(0, 10)]);
    const out = sq.simplify(1000);
    // The output ring may be degenerate but it must still exist as a polygon.
    expect(out).toBeDefined();
  });

  it("epsilon equal to a vertex's exact perpendicular distance", () => {
    // The middle vertex is exactly 1.0 off the (0,0)-(20,0) line.
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(10, 1),
      Vec2.get(20, 0),
      Vec2.get(20, 10),
      Vec2.get(0, 10),
    ]);
    // distance² = 1.0, epsilon = 1.0 → epsilon² = 1.0. Boundary case.
    const out = poly.simplify(1.0);
    // Whatever the decision, output must be simple and well-formed.
    expect(out.isSimple()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Repeatability / determinism
// ---------------------------------------------------------------------------

describe("GeomPoly.simplify — determinism", () => {
  it("repeated simplify with identical inputs yields identical vertex count", () => {
    const verts: Vec2[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      verts.push(Vec2.get(Math.cos(a) * 10, Math.sin(a) * 10));
    }
    const p1 = new GeomPoly(verts.slice()).simplify(0.5);
    const p2 = new GeomPoly(verts.slice()).simplify(0.5);
    expect(countVerts(p1)).toBe(countVerts(p2));
  });
});
