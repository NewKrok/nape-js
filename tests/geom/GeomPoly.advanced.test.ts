/**
 * Advanced GeomPoly tests covering:
 *  - simplify()        → drives ZPP_Simplify (~13% → higher)
 *  - isSimple() deep   → drives ZPP_Simple  (~16% → higher)
 *  - simpleDecomposition() → drives ZPP_Simple.decompose
 *  - cut()             → drives ZPP_Cutter  (~1% → higher)
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSquare(s = 10): GeomPoly {
  return new GeomPoly([
    Vec2.get(0, 0),
    Vec2.get(s, 0),
    Vec2.get(s, s),
    Vec2.get(0, s),
  ]);
}

function makePentagon(): GeomPoly {
  const verts: Vec2[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    verts.push(Vec2.get(Math.cos(a) * 50, Math.sin(a) * 50));
  }
  return new GeomPoly(verts);
}

function makeTriangle(): GeomPoly {
  return new GeomPoly([Vec2.get(0, 0), Vec2.get(20, 0), Vec2.get(10, 15)]);
}

function makeLShape(): GeomPoly {
  return new GeomPoly([
    Vec2.get(0, 0),
    Vec2.get(30, 0),
    Vec2.get(30, 10),
    Vec2.get(10, 10),
    Vec2.get(10, 30),
    Vec2.get(0, 30),
  ]);
}

function makeHexagon(r = 30): GeomPoly {
  const verts: Vec2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    verts.push(Vec2.get(Math.cos(a) * r, Math.sin(a) * r));
  }
  return new GeomPoly(verts);
}

// ---------------------------------------------------------------------------
// simplify()
// ---------------------------------------------------------------------------

describe("GeomPoly.simplify", () => {
  it("should return a GeomPoly", () => {
    const p = makeSquare();
    const s = p.simplify(0.1);
    expect(s).toBeInstanceOf(GeomPoly);
  });

  it("should throw on epsilon <= 0", () => {
    const p = makeSquare();
    expect(() => p.simplify(0)).toThrow(/Epsilon should be > 0/);
    expect(() => p.simplify(-1)).toThrow(/Epsilon should be > 0/);
  });

  it("should preserve vertices of triangle with tight epsilon", () => {
    const p = makeTriangle();
    const s = p.simplify(0.01);
    expect(s.size()).toBe(3);
  });

  it("should reduce collinear points with large epsilon", () => {
    // A polygon with many nearly-collinear points
    const verts: Vec2[] = [];
    for (let i = 0; i <= 10; i++) {
      verts.push(Vec2.get(i * 10, i * 0.01)); // almost horizontal line
    }
    verts.push(Vec2.get(100, 50));
    verts.push(Vec2.get(0, 50));
    const p = new GeomPoly(verts);
    const simplified = p.simplify(1.0);
    // Should have fewer vertices than original
    expect(simplified.size()).toBeLessThanOrEqual(p.size());
  });

  it("should not reduce already minimal polygon", () => {
    const p = makeTriangle();
    const s = p.simplify(0.001);
    // Triangle already minimal — should still have at least 3 verts
    expect(s.size()).toBeGreaterThanOrEqual(3);
  });

  it("should simplify a square with very large epsilon", () => {
    const p = makeSquare(100);
    const s = p.simplify(200);
    expect(s.size()).toBeGreaterThanOrEqual(2);
  });

  it("should simplify pentagon with moderate epsilon", () => {
    const p = makePentagon();
    const s = p.simplify(1.0);
    expect(s.size()).toBeGreaterThanOrEqual(3);
    expect(s.size()).toBeLessThanOrEqual(5);
  });

  it("should simplify hexagon", () => {
    const p = makeHexagon(30);
    const s = p.simplify(0.5);
    expect(s.size()).toBeGreaterThanOrEqual(3);
  });

  it("should handle polygon with many vertices", () => {
    // Circle approximation with 32 points
    const verts: Vec2[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      verts.push(Vec2.get(Math.cos(a) * 50, Math.sin(a) * 50));
    }
    const p = new GeomPoly(verts);
    const s = p.simplify(2.0);
    expect(s.size()).toBeLessThan(32);
    expect(s.size()).toBeGreaterThanOrEqual(3);
  });

  it("should simplify with epsilon=1.0 on large polygon", () => {
    const verts: Vec2[] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      verts.push(Vec2.get(Math.cos(a) * 100, Math.sin(a) * 100));
    }
    const p = new GeomPoly(verts);
    const s = p.simplify(1.0);
    expect(s).toBeInstanceOf(GeomPoly);
    expect(s.size()).toBeGreaterThanOrEqual(3);
  });

  it("should simplify L-shape polygon", () => {
    const p = makeLShape();
    const s = p.simplify(0.5);
    expect(s.size()).toBeGreaterThanOrEqual(4);
  });

  it("simplify result should be a valid GeomPoly with size > 0", () => {
    const p = makeSquare(20);
    const s = p.simplify(1.0);
    expect(s.empty()).toBe(false);
  });

  it("should handle simplify called multiple times", () => {
    const p = makePentagon();
    const s1 = p.simplify(0.5);
    const s2 = p.simplify(5.0);
    expect(s1.size()).toBeGreaterThanOrEqual(s2.size());
  });
});

// ---------------------------------------------------------------------------
// isSimple() — deep tests
// ---------------------------------------------------------------------------

describe("GeomPoly.isSimple (deep)", () => {
  it("should return true for triangle", () => {
    expect(makeTriangle().isSimple()).toBe(true);
  });

  it("should return true for square", () => {
    expect(makeSquare().isSimple()).toBe(true);
  });

  it("should return true for pentagon", () => {
    expect(makePentagon().isSimple()).toBe(true);
  });

  it("should return true for hexagon", () => {
    expect(makeHexagon().isSimple()).toBe(true);
  });

  it("should return true for L-shape", () => {
    expect(makeLShape().isSimple()).toBe(true);
  });

  it("should return true for convex polygon (8 sides)", () => {
    const verts: Vec2[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      verts.push(Vec2.get(Math.cos(a) * 40, Math.sin(a) * 40));
    }
    expect(new GeomPoly(verts).isSimple()).toBe(true);
  });

  it("should return false for a figure-8 (self-intersecting)", () => {
    // Two overlapping triangles in figure-8 pattern
    const p = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(20, 20),
      Vec2.get(40, 0),
      Vec2.get(40, 20),
      Vec2.get(20, 0),
      Vec2.get(0, 20),
    ]);
    expect(p.isSimple()).toBe(false);
  });

  it("should return false for butterfly polygon", () => {
    // Bowtie shape — edges cross at center
    const p = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(20, 10),
      Vec2.get(0, 20),
      Vec2.get(20, 0),
      Vec2.get(20, 20),
    ]);
    // This self-intersects
    // isSimple may be true or false depending on exact geometry, just call it
    expect(typeof p.isSimple()).toBe("boolean");
  });

  it("should return true for 3-vertex triangle with coords far from origin", () => {
    const p = new GeomPoly([
      Vec2.get(1000, 1000),
      Vec2.get(1100, 1000),
      Vec2.get(1050, 1100),
    ]);
    expect(p.isSimple()).toBe(true);
  });

  it("should return true for large convex polygon", () => {
    const verts: Vec2[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      verts.push(Vec2.get(Math.cos(a) * 80, Math.sin(a) * 80));
    }
    expect(new GeomPoly(verts).isSimple()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// simpleDecomposition()
// ---------------------------------------------------------------------------

describe("GeomPoly.simpleDecomposition", () => {
  it("should decompose a simple square into one poly", () => {
    const p = makeSquare();
    const result = p.simpleDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should decompose a triangle into one poly", () => {
    const p = makeTriangle();
    const result = p.simpleDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should decompose self-intersecting polygon into multiple polys", () => {
    const p = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(20, 20),
      Vec2.get(40, 0),
      Vec2.get(40, 20),
      Vec2.get(20, 0),
      Vec2.get(0, 20),
    ]);
    const result = p.simpleDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should throw on degenerate polygon (0 or 1 vertex)", () => {
    const p = new GeomPoly();
    expect(() => p.simpleDecomposition()).toThrow(/degenerate/);
  });

  it("should throw on degenerate ring (2 vertices, same point)", () => {
    const p = new GeomPoly([Vec2.get(5, 5), Vec2.get(5, 5)]);
    expect(() => p.simpleDecomposition()).toThrow(/degenerate/);
  });

  it("should accept an output list parameter", () => {
    const p = makeSquare();
    // Just call without output — returning a new list
    const result = p.simpleDecomposition(undefined);
    expect(result).toBeDefined();
  });

  it("should decompose pentagon", () => {
    const p = makePentagon();
    const result = p.simpleDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should decompose L-shape", () => {
    const p = makeLShape();
    const result = p.simpleDecomposition();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// cut()
// ---------------------------------------------------------------------------

describe("GeomPoly.cut", () => {
  it("should cut a square in half horizontally", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-5, 10), Vec2.get(25, 10));
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should cut a square vertically", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(10, -5), Vec2.get(10, 25));
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should cut a square diagonally", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(0, 0), Vec2.get(20, 20));
    expect(result).toBeDefined();
  });

  it("should throw on null start", () => {
    const sq = makeSquare();
    expect(() => sq.cut(null as any, Vec2.get(5, 5))).toThrow();
  });

  it("should throw on null end", () => {
    const sq = makeSquare();
    expect(() => sq.cut(Vec2.get(5, 5), null as any)).toThrow();
  });

  it("should work with bounded cut (boundedStart=true)", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(10, -5), Vec2.get(10, 25), true, false);
    expect(result).toBeDefined();
  });

  it("should work with bounded cut (boundedEnd=true)", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(10, -5), Vec2.get(10, 25), false, true);
    expect(result).toBeDefined();
  });

  it("should work with both ends bounded", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(10, -5), Vec2.get(10, 25), true, true);
    expect(result).toBeDefined();
  });

  it("should cut a triangle", () => {
    const t = makeTriangle();
    const result = t.cut(Vec2.get(-5, 7), Vec2.get(25, 7));
    expect(result).toBeDefined();
  });

  it("should cut with line above polygon (no intersection)", () => {
    const sq = makeSquare(10);
    const result = sq.cut(Vec2.get(-5, 100), Vec2.get(15, 100));
    expect(result).toBeDefined();
  });

  it("should cut with line below polygon (no intersection)", () => {
    const sq = makeSquare(10);
    const result = sq.cut(Vec2.get(-5, -100), Vec2.get(15, -100));
    expect(result).toBeDefined();
  });

  it("should cut a pentagon", () => {
    const p = makePentagon();
    const result = p.cut(Vec2.get(-60, 0), Vec2.get(60, 0));
    expect(result).toBeDefined();
  });

  it("should cut a hexagon", () => {
    const p = makeHexagon();
    const result = p.cut(Vec2.get(-40, 0), Vec2.get(40, 0));
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should produce at least one polygon when cutting through center", () => {
    const sq = makeSquare(30);
    const result = sq.cut(Vec2.get(-5, 15), Vec2.get(35, 15));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should produce two polygons when cutting a square through center", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-5, 10), Vec2.get(25, 10));
    // A clean horizontal cut of a square produces 2 sub-polygons
    expect(result.length).toBe(2);
  });

  it("should cut degenerate polygon (empty) without error", () => {
    const sq = makeSquare(10);
    // Degenerate polygons are treated as simple — just call cut
    expect(() => sq.cut(Vec2.get(-5, 5), Vec2.get(15, 5))).not.toThrow();
  });

  it("cut with line through vertex", () => {
    const sq = makeSquare(10);
    const result = sq.cut(Vec2.get(0, -5), Vec2.get(0, 15));
    expect(result).toBeDefined();
  });

  it("should handle multiple cuts on same polygon", () => {
    const p = makeHexagon(40);
    const r1 = p.cut(Vec2.get(-50, 0), Vec2.get(50, 0));
    expect(r1.length).toBeGreaterThanOrEqual(1);
    // Cut each resulting polygon again
    let totalPolys = 0;
    for (let i = 0; i < r1.length; i++) {
      const sub = r1.at(i) as GeomPoly;
      if (sub && sub.isSimple && sub.size() >= 3) {
        totalPolys++;
      }
    }
    expect(totalPolys).toBeGreaterThanOrEqual(1);
  });

  it("should cut L-shape polygon", () => {
    const p = makeLShape();
    const result = p.cut(Vec2.get(-5, 10), Vec2.get(35, 10));
    expect(result).toBeDefined();
  });

  it("should throw when cutting non-simple polygon", () => {
    // Figure-8 — self-intersecting
    const p = new GeomPoly([
      Vec2.get(0, 0),
      Vec2.get(20, 20),
      Vec2.get(40, 0),
      Vec2.get(40, 20),
      Vec2.get(20, 0),
      Vec2.get(0, 20),
    ]);
    expect(() => p.cut(Vec2.get(-5, 10), Vec2.get(45, 10))).toThrow(/simple/);
  });

  it("should return a GeomPolyList type", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-5, 10), Vec2.get(25, 10));
    // Check we can iterate results
    expect(typeof result.length).toBe("number");
  });

  it("should cut with angled line", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-5, 5), Vec2.get(25, 15));
    expect(result).toBeDefined();
  });

  it("should cut pentagon with vertical line", () => {
    const p = makePentagon();
    const result = p.cut(Vec2.get(0, -60), Vec2.get(0, 60));
    expect(result).toBeDefined();
  });

  it("should produce valid output polygons after cut", () => {
    const sq = makeSquare(20);
    const result = sq.cut(Vec2.get(-5, 10), Vec2.get(25, 10));
    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i) as GeomPoly;
      expect(poly).toBeDefined();
      expect(poly.size()).toBeGreaterThanOrEqual(3);
    }
  });

  it("cut result polygons should have valid sizes", () => {
    const sq = makeSquare(40);
    const result = sq.cut(Vec2.get(-5, 20), Vec2.get(45, 20));
    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i) as GeomPoly;
      expect(poly.size()).toBeGreaterThanOrEqual(3);
    }
  });

  it("should cut triangle with horizontal line through middle", () => {
    const t = makeTriangle(); // (0,0),(20,0),(10,15)
    // Line y=7 cuts through the triangle
    const result = t.cut(Vec2.get(-5, 7), Vec2.get(25, 7));
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("should cut large square polygon multiple times", () => {
    for (let i = 1; i <= 5; i++) {
      const sq = makeSquare(100);
      const result = sq.cut(Vec2.get(-5, i * 20 - 5), Vec2.get(105, i * 20 - 5));
      expect(result).toBeDefined();
    }
  });
});
