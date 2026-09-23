/**
 * GeomPoly.simpleDecomposition — property tests for ZPP_Simple.decompose.
 *
 * Existing suites only check that a bowtie splits into "at least one" piece.
 * These drive the Bentley–Ottmann sweep with inputs that exercise its
 * intersection bookkeeping (star polygons, seeded random rings, spirals) and
 * check the result against an independent oracle instead of piece counts:
 *
 *   - every piece is a ring of >= 3 finite vertices with non-zero area
 *   - no piece has two edges that properly cross (pieces are at least
 *     weakly simple; they may revisit a vertex where the even-odd region
 *     touches itself)
 *   - the pieces are pairwise disjoint and together cover exactly the
 *     input's even-odd region (checked by point sampling)
 *
 * Plus regression tests for degenerate inputs: a repeated vertex used to
 * crash the sweep (zero-length self-segment), and a there-and-back spike
 * used to emit a 2-vertex piece.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";

type Pt = [number, number];

const poly = (pts: Pt[]) => new GeomPoly(pts.map(([x, y]) => new Vec2(x, y)));

function ring(p: any): Pt[] {
  const out: Pt[] = [];
  const it = p.iterator();
  while (it.hasNext()) {
    const v = it.next();
    out.push([v.x, v.y]);
  }
  return out;
}

function pieces(list: any): Pt[][] {
  const out: Pt[][] = [];
  for (let i = 0; i < list.length; i++) out.push(ring(list.at(i)));
  return out;
}

/** Winding number of `pts` around (x, y). */
function winding(pts: Pt[], x: number, y: number): number {
  let w = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const cross = (bx - ax) * (y - ay) - (x - ax) * (by - ay);
    if (ay <= y) {
      if (by > y && cross > 0) w++;
    } else if (by <= y && cross < 0) {
      w--;
    }
  }
  return w;
}

function shoelace(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    a += ax * by - bx * ay;
  }
  return a / 2;
}

function properlyCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const eps = 1e-9;
  const orient = (p: Pt, q: Pt, r: Pt) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return (
    ((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps)) &&
    ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps))
  );
}

/**
 * Decompose `input` and check every oracle property. Returns the pieces for
 * any extra, case-specific assertions.
 */
function decomposeAndCheck(input: Pt[], samples = 160): Pt[][] {
  const out = pieces(poly(input).simpleDecomposition());
  expect(out.length).toBeGreaterThan(0);

  for (const p of out) {
    expect(p.length).toBeGreaterThanOrEqual(3);
    expect(Math.abs(shoelace(p))).toBeGreaterThan(1e-9);
    for (const [x, y] of p) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
    const n = p.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        expect(properlyCross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])).toBe(false);
      }
    }
  }

  const xs = input.map((p) => p[0]);
  const ys = input.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0;
  const h = Math.max(...ys) - y0;
  let wrong = 0;
  let overlap = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      // Irrational offsets keep sample points off every edge and vertex.
      const x = x0 + ((i + 0.5 + 0.0137) / samples) * w;
      const y = y0 + ((j + 0.5 + 0.0071) / samples) * h;
      const inside = winding(input, x, y) % 2 !== 0;
      let covered = 0;
      for (const p of out) if (winding(p, x, y) !== 0) covered++;
      if (covered > 1) overlap++;
      if (covered > 0 !== inside) wrong++;
    }
  }
  expect(overlap, "pieces overlap").toBe(0);
  expect(wrong, "pieces differ from the even-odd region").toBe(0);
  return out;
}

function star(n: number, k: number, r = 50, phase = 0.1): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (2 * Math.PI * i * k) / n;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ---------------------------------------------------------------------------
// Inputs that are already simple
// ---------------------------------------------------------------------------

describe("simpleDecomposition — simple input", () => {
  it("returns a convex polygon as a single identical-area piece", () => {
    const hex = star(6, 1);
    const out = decomposeAndCheck(hex);
    expect(out).toHaveLength(1);
    expect(Math.abs(shoelace(out[0]))).toBeCloseTo(Math.abs(shoelace(hex)), 9);
  });

  it("returns a concave comb as a single piece", () => {
    const comb: Pt[] = [
      [0, 0],
      [50, 0],
      [50, 30],
      [40, 30],
      [40, 10],
      [30, 10],
      [30, 30],
      [20, 30],
      [20, 10],
      [10, 10],
      [10, 30],
      [0, 30],
    ];
    const out = decomposeAndCheck(comb);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(comb.length);
  });

  it("orientation of the input does not change the result", () => {
    const pentagram = star(5, 2);
    const fwd = decomposeAndCheck(pentagram);
    const rev = decomposeAndCheck([...pentagram].reverse());
    expect(rev.length).toBe(fwd.length);
    const total = (ps: Pt[][]) => ps.reduce((a, p) => a + Math.abs(shoelace(p)), 0);
    expect(total(rev)).toBeCloseTo(total(fwd), 6);
  });
});

// ---------------------------------------------------------------------------
// Self-intersecting input
// ---------------------------------------------------------------------------

describe("simpleDecomposition — star polygons", () => {
  const stars: Array<[number, number]> = [
    [5, 2],
    [7, 2],
    [7, 3],
    [8, 3],
    [9, 2],
    [9, 4],
    [11, 3],
    [11, 5],
  ];

  for (const [n, k] of stars) {
    it(`{${n}/${k}} splits into pieces covering its even-odd region`, () => {
      const out = decomposeAndCheck(star(n, k));
      expect(out.length).toBeGreaterThan(1);
    });
  }

  it("{5/2} yields the five tips (the doubly-wound centre is excluded)", () => {
    const out = decomposeAndCheck(star(5, 2));
    expect(out).toHaveLength(5);
    for (const p of out) expect(p).toHaveLength(3);
    // The centre has winding number 2 → outside under even-odd.
    for (const p of out) expect(winding(p, 0, 0)).toBe(0);
  });
});

describe("simpleDecomposition — seeded random rings", () => {
  // Non-integer coordinates keep the rings in general position (no
  // collinear overlaps), which is where the oracle must hold exactly.
  for (const seed of [1, 2, 3, 5, 8, 13, 21, 34, 55, 89]) {
    it(`seed ${seed}`, () => {
      const rnd = lcg(seed);
      const n = 6 + Math.floor(rnd() * 8);
      const pts: Pt[] = [];
      for (let i = 0; i < n; i++) pts.push([rnd() * 100 + 0.123, rnd() * 100 + 0.456]);
      decomposeAndCheck(pts);
    });
  }
});

describe("simpleDecomposition — spirals and zig-zags", () => {
  it("a self-overlapping spiral", () => {
    const pts: Pt[] = [];
    for (let i = 0; i < 24; i++) {
      const a = i * 0.9;
      const r = 10 + i * 2.1;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    decomposeAndCheck(pts);
  });

  it("a zig-zag that doubles back across itself", () => {
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) pts.push([i * 10 + 0.3, i % 2 === 0 ? 0 : 40]);
    for (let i = 9; i >= 0; i--) pts.push([i * 10 + 5.1, i % 2 === 0 ? 45 : 5]);
    decomposeAndCheck(pts);
  });
});

// ---------------------------------------------------------------------------
// Degenerate input (regressions)
// ---------------------------------------------------------------------------

describe("simpleDecomposition — repeated and collapsing vertices", () => {
  const square: Pt[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  it("a repeated consecutive vertex no longer crashes the sweep", () => {
    // Used to throw "Cannot read properties of null (reading 'next')".
    const out = decomposeAndCheck([
      [0, 0],
      [10, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    expect(out).toHaveLength(1);
    expect(Math.abs(shoelace(out[0]))).toBeCloseTo(100, 9);
  });

  it("a vertex repeated three times in a row", () => {
    const out = decomposeAndCheck([
      [0, 0],
      [10, 0],
      [10, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    expect(out).toHaveLength(1);
  });

  it("a closing vertex equal to the first", () => {
    const out = decomposeAndCheck([...square, [0, 0]]);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(4);
  });

  it("a repeated vertex on a self-intersecting ring", () => {
    const out = decomposeAndCheck([
      [0, 0],
      [10, 10],
      [10, 10],
      [10, 0],
      [0, 10],
    ]);
    expect(out).toHaveLength(2);
  });

  it("a repeated-vertex ring leaves no sweep state behind for the next call", () => {
    // The sweep keeps its sets in statics; when this input still crashed
    // mid-sweep, its leftover vertices leaked into the next decomposition.
    decomposeAndCheck([
      [0, 0],
      [10, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    const out = decomposeAndCheck([
      [20, 20],
      [30, 20],
      [25, 30],
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toHaveLength(3);
  });

  it("an outward spike is trimmed instead of emitting a 2-vertex piece", () => {
    const out = decomposeAndCheck([
      [0, 0],
      [10, 0],
      [10, 10],
      [5, 10],
      [5, 15],
      [5, 10],
      [0, 10],
    ]);
    expect(out).toHaveLength(1);
    expect(Math.abs(shoelace(out[0]))).toBeCloseTo(100, 9);
  });

  it("a ring with only two distinct vertices yields no pieces", () => {
    const out = poly([
      [0, 0],
      [0, 0],
      [5, 5],
      [5, 5],
    ]).simpleDecomposition();
    expect(out.length).toBe(0);
  });
});

describe("simpleDecomposition — weakly simple results", () => {
  it("a bridged hole (keyhole) comes back as one weakly simple piece", () => {
    const keyhole: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 5],
      [3, 5],
      [3, 7],
      [7, 7],
      [7, 3],
      [3, 3],
      [3, 5],
      [0, 5],
    ];
    const out = decomposeAndCheck(keyhole);
    expect(out).toHaveLength(1);
    expect(poly(out[0]).isSimple()).toBe(false);
    expect(Math.abs(shoelace(out[0]))).toBeCloseTo(100 - 16, 9);
  });

  it("an inward there-and-back spike keeps the spike edge", () => {
    const out = decomposeAndCheck([
      [0, 0],
      [10, 0],
      [10, 10],
      [5, 10],
      [5, 4],
      [5, 10],
      [0, 10],
    ]);
    expect(out).toHaveLength(1);
    expect(Math.abs(shoelace(out[0]))).toBeCloseTo(100, 9);
  });
});
