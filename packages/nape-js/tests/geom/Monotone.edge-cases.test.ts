/**
 * ZPP_Monotone / ZPP_PartitionVertex — edge-case decomposition coverage.
 *
 * Targets the issue #165 scenarios that GeomPoly.cuts-decomp.test.ts does not
 * cover: collinear / horizontal edges feeding the sweep-line, very narrow
 * polygons, and degenerate-input rejection in decomposition.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";

// ---------------------------------------------------------------------------
// Horizontal edges — exercises ZPP_PartitionVertex.vert_lt / edge_lt
// branches where p.y === p.next.y.
// ---------------------------------------------------------------------------

describe("GeomPoly.monotoneDecomposition — horizontal edges", () => {
  it("rectangle with extra colinear vertices on top and bottom still decomposes", () => {
    // Extra vertices on horizontal edges → many edges where edge.y == edge.next.y.
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(10, 0),
      Vec2.get(20, 0),
      Vec2.get(30, 0),
      Vec2.get(30, 20),
      Vec2.get(20, 20),
      Vec2.get(10, 20),
      Vec2.get(0, 20),
    ]);
    const result = poly.monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isMonotone()).toBe(true);
    }
  });

  it("staircase with horizontal segments at the same y value decomposes", () => {
    // Three steps sharing the y=10 line on flats.
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(30, 0),
      Vec2.get(30, 10),
      Vec2.get(20, 10),
      Vec2.get(20, 20),
      Vec2.get(10, 20),
      Vec2.get(10, 10),
      Vec2.get(0, 10),
    ]);
    const result = poly.monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isMonotone()).toBe(true);
    }
  });

  it("convex decomposition of a staircase yields all-convex pieces", () => {
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(30, 0),
      Vec2.get(30, 10),
      Vec2.get(20, 10),
      Vec2.get(20, 20),
      Vec2.get(10, 20),
      Vec2.get(10, 30),
      Vec2.get(0, 30),
    ]);
    const result = poly.convexDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isConvex()).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Very narrow / sliver polygons
// ---------------------------------------------------------------------------

describe("GeomPoly.monotoneDecomposition — narrow polygons", () => {
  it("a 1000:1 aspect-ratio sliver decomposes to monotone pieces", () => {
    const poly = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(1000, 0),
      Vec2.get(1000, 1),
      Vec2.get(0, 1),
    ]);
    const result = poly.monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isMonotone()).toBe(true);
    }
  });

  it("triangle with two near-coincident vertices decomposes without error", () => {
    const poly = new GeomPoly([Vec2.get(0, 0), Vec2.get(10, 0), Vec2.get(10, 1e-3)]);
    const result = poly.monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Reflex vertices clustered near a single y-coord (sweep-line stress)
// ---------------------------------------------------------------------------

describe("GeomPoly.monotoneDecomposition — reflex clustering", () => {
  it("comb shape with reflexes at identical y values decomposes correctly", () => {
    // Six teeth on top, all reflexes at y=20.
    const verts: Vec2[] = [];
    verts.push(Vec2.get(0, 0));
    verts.push(Vec2.get(60, 0));
    verts.push(Vec2.get(60, 30));
    for (let i = 5; i >= 0; i--) {
      const x0 = i * 10;
      verts.push(Vec2.get(x0 + 8, 30));
      verts.push(Vec2.get(x0 + 8, 20));
      verts.push(Vec2.get(x0 + 2, 20));
      verts.push(Vec2.get(x0 + 2, 30));
    }
    verts.push(Vec2.get(0, 30));
    const comb = new GeomPoly(verts);
    expect(comb.isSimple()).toBe(true);
    const result = comb.monotoneDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < result.length; i++) {
      expect(result.at(i).isMonotone()).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Degenerate-input rejection
// ---------------------------------------------------------------------------

describe("GeomPoly.monotoneDecomposition — degenerate inputs", () => {
  it("polygon collapsed to a single point yields an empty piece list", () => {
    const poly = new GeomPoly([Vec2.get(0, 0), Vec2.get(0, 0), Vec2.get(0, 0)]);
    expect(poly.isDegenerate()).toBe(true);
    const result = poly.monotoneDecomposition();
    expect(result.length).toBe(0);
  });

  it("zero-area collinear polygon yields an empty piece list", () => {
    const poly = new GeomPoly([Vec2.get(0, 0), Vec2.get(10, 0), Vec2.get(20, 0)]);
    expect(poly.isDegenerate()).toBe(true);
    const result = poly.monotoneDecomposition();
    expect(result.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Triangular decomposition — verify triangle vertex count == 3
// ---------------------------------------------------------------------------

describe("GeomPoly.triangularDecomposition — strict triangle count", () => {
  it("every output polygon has exactly 3 vertices", () => {
    const star: Vec2[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 30 : 12;
      star.push(Vec2.get(Math.cos(a) * r, Math.sin(a) * r));
    }
    const result = new GeomPoly(star).triangularDecomposition();
    expect(result.length).toBeGreaterThan(0);
    for (let i = 0; i < result.length; i++) {
      let n = 0;
      const it = result.at(i).iterator();
      while (it.hasNext()) {
        it.next();
        n++;
      }
      expect(n).toBe(3);
    }
  });
});
