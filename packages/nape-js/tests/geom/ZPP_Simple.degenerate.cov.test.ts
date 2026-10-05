/**
 * ZPP_Simple — simpleDecomposition / isSimple on degenerate inputs.
 *
 * GeomPoly.simpleDecomposition.test.ts covers rings in general position
 * (random float rings, stars, spirals). This suite targets the sweep's
 * degenerate bookkeeping: rings on a small integer lattice, where vertices
 * land on other edges, edges overlap collinearly, vertices are revisited and
 * many crossings share x-coordinates. Each result is checked against an
 * independent oracle, never against the decomposer itself:
 *
 *   - every piece has >= 3 vertices, non-zero area, and no two edges that
 *     properly cross (pieces may be weakly simple, see the TSDoc)
 *   - pieces cover exactly the input's even-odd region: every sample point
 *     is inside exactly one piece iff it is inside the input (even-odd)
 *   - for hand-built inputs the total piece area equals the exactly known
 *     even-odd area
 *
 * isSimple() is checked against a brute-force O(n^2) proper/improper
 * intersection test.
 *
 * Known failures (three edges through one point, spikes from a revisited
 * vertex) are pinned in ZPP_Simple.knownFailures.cov.test.ts, each on a fresh
 * engine instance because a throwing decomposition leaves static sweep state
 * behind.
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { GeomPolyList } from "../../src/util/registerLists";
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

function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    a += ax * by - bx * ay;
  }
  return a / 2;
}

function evenOdd(pts: Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    if (ay > y !== by > y && x < ax + ((y - ay) * (bx - ax)) / (by - ay)) inside = !inside;
  }
  return inside;
}

/** Distance from (x, y) to the nearest edge of the ring. */
function edgeDistance(pts: Pt[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const ex = bx - ax;
    const ey = by - ay;
    const len2 = ex * ex + ey * ey;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len2)) : 0;
    best = Math.min(best, Math.hypot(ax + ex * t - x, ay + ey * t - y));
  }
  return best;
}

const orient = (a: Pt, b: Pt, c: Pt) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

/** Strict crossing of two segments (interiors cross at a single point). */
function properlyCross(a: Pt, b: Pt, c: Pt, d: Pt, eps = 1e-9): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return (
    ((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps)) &&
    ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps))
  );
}

function hasProperCrossing(pts: Pt[]): boolean {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (properlyCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) return true;
    }
  }
  return false;
}

/**
 * Brute-force simplicity: no two non-adjacent edges share any point, adjacent
 * edges share only their common vertex, no zero-length edges.
 */
function bruteSimple(pts: Pt[]): boolean {
  const n = pts.length;
  if (n < 3) return false;
  const onSeg = (p: Pt, a: Pt, b: Pt) =>
    orient(a, b, p) === 0 &&
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1]);
  const touch = (a: Pt, b: Pt, c: Pt, d: Pt) =>
    properlyCross(a, b, c, d, 0) ||
    onSeg(a, c, d) ||
    onSeg(b, c, d) ||
    onSeg(c, a, b) ||
    onSeg(d, a, b);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    if (a[0] === b[0] && a[1] === b[1]) return false;
    for (let j = i + 1; j < n; j++) {
      const c = pts[j];
      const d = pts[(j + 1) % n];
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) {
        // Adjacent edges: shared vertex only, i.e. they must not fold back
        // over each other.
        const [p, q, r] = j === i + 1 ? [a, b, d] : [c, a, b];
        if (orient(p, q, r) === 0) {
          const dot = (p[0] - q[0]) * (r[0] - q[0]) + (p[1] - q[1]) * (r[1] - q[1]);
          if (dot > 0) return false;
        }
        continue;
      }
      if (touch(a, b, c, d)) return false;
    }
  }
  return true;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random ring on a small integer lattice — degenerate by construction. */
function latticeRing(seed: number): { pts: Pt[]; size: number } {
  const r = mulberry32(seed);
  const n = 4 + Math.floor(r() * 6);
  const size = 4 + Math.floor(r() * 4);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) pts.push([Math.floor(r() * size), Math.floor(r() * size)]);
  return { pts, size };
}

/**
 * Check the decomposition of `pts` against the oracle. Samples a grid over
 * [lo, hi]^2 at offsets that avoid lattice lines.
 */
function checkDecomposition(pts: Pt[], lo: number, hi: number, expectedArea?: number): Pt[][] {
  const out = pieces(poly(pts).simpleDecomposition());
  for (const p of out) {
    expect(p.length).toBeGreaterThanOrEqual(3);
    for (const [x, y] of p) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    }
    expect(Math.abs(signedArea(p))).toBeGreaterThan(1e-9);
    expect(hasProperCrossing(p)).toBe(false);
  }
  const N = 41;
  let mismatches = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = lo + ((i + 0.37) / N) * (hi - lo);
      const y = lo + ((j + 0.61) / N) * (hi - lo);
      // Points on (or within float noise of) a boundary are ambiguous.
      if (edgeDistance(pts, x, y) < 1e-7 || out.some((p) => edgeDistance(p, x, y) < 1e-7)) {
        continue;
      }
      const want = evenOdd(pts, x, y) ? 1 : 0;
      const got = out.filter((p) => evenOdd(p, x, y)).length;
      if (want !== got) mismatches++;
    }
  }
  expect(mismatches).toBe(0);
  if (expectedArea !== undefined) {
    const total = out.reduce((s, p) => s + Math.abs(signedArea(p)), 0);
    expect(total).toBeCloseTo(expectedArea, 9);
  }
  return out;
}

describe("ZPP_Simple.decompose — hand-built degenerate rings (exact areas)", () => {
  it("vertex touching the interior of another edge (T-junction) splits into two triangles", () => {
    // (2,0) lies on edge (0,0)-(4,0): the region is two triangles meeting at (2,0).
    const out = checkDecomposition(
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [2, 0],
        [0, 4],
      ],
      -1,
      5,
      4 + 4,
    );
    expect(out.length).toBe(2);
  });

  it("collinear overlapping edges: two rectangles sharing part of a boundary line", () => {
    // Edge (0,0)-(10,0) overlaps edge (2,0)-(8,0). Even-odd region:
    // [2,10]x[0,5] above the line plus [0,8]x[-5,0] below it.
    const out = checkDecomposition(
      [
        [0, 0],
        [10, 0],
        [10, 5],
        [2, 5],
        [2, 0],
        [8, 0],
        [8, -5],
        [0, -5],
      ],
      -6,
      11,
      40 + 40,
    );
    expect(out.length).toBe(2);
  });

  it("bowtie meeting at a shared (revisited) vertex", () => {
    // Two triangles joined only at the origin; the ring passes it twice.
    const out = checkDecomposition(
      [
        [0, 0],
        [2, 1],
        [2, -1],
        [0, 0],
        [-2, 1],
        [-2, -1],
      ],
      -3,
      3,
      2 + 2,
    );
    expect(out.length).toBe(2);
  });

  it("figure-eight whose crossing is a vertex of both loops", () => {
    // (2,2) is visited twice and both loops touch there.
    const out = checkDecomposition(
      [
        [0, 0],
        [2, 2],
        [4, 0],
        [4, 4],
        [2, 2],
        [0, 4],
      ],
      -1,
      5,
      4 + 4,
    );
    expect(out.length).toBe(2);
  });

  it("bowtie where one diagonal passes through a vertex of the ring", () => {
    // (2,2) is a ring vertex lying on the edge (0,0)-(4,4).
    checkDecomposition(
      [
        [0, 0],
        [4, 4],
        [0, 4],
        [2, 2],
        [4, 0],
      ],
      -1,
      5,
      // triangles (0,4)(2,2)(4,4)... region = upper triangle (0,4),(4,4),(2,2)
      // plus lower triangle (0,0),(4,0),(2,2): 4 + 4
      8,
    );
  });

  it("pentagram: five tips, total area matches the closed form", () => {
    const R = 10;
    const pts: Pt[] = [0, 1, 2, 3, 4].map((i) => {
      const a = Math.PI / 2 + (i * 4 * Math.PI) / 5;
      return [Math.cos(a) * R, Math.sin(a) * R];
    });
    // Even-odd region of {5/2} = the five tip triangles (the pentagon in the
    // middle has winding 2 → outside). Tip area = (star area - inner pentagon).
    // Inner pentagon circumradius r = R * cos(2π/5) / cos(π/5).
    const r = (R * Math.cos((2 * Math.PI) / 5)) / Math.cos(Math.PI / 5);
    const pentagon = (5 / 2) * r * r * Math.sin((2 * Math.PI) / 5);
    // Star (union) area = 10 triangles (centre, outer tip, inner vertex).
    const star = 10 * 0.5 * R * r * Math.sin(Math.PI / 5);
    const out = checkDecomposition(pts, -11, 11, star - pentagon);
    expect(out.length).toBe(5);
  });

  for (const [n, k] of [
    [7, 2],
    [7, 3],
    [9, 4],
    [11, 3],
    [12, 5],
  ] as const) {
    it(`star polygon {${n}/${k}} decomposes into the even-odd region`, () => {
      // Slightly perturbed radius breaks the symmetric triple points that
      // regular {n/k} polygons have for some n/k.
      const pts: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i * k * 2 * Math.PI) / n + 0.1;
        const rr = 10 + 0.01 * i;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      const out = checkDecomposition(pts, -11, 11);
      expect(out.length).toBeGreaterThanOrEqual(n);
    });
  }

  it("appends to a caller-supplied output list instead of creating a new one", () => {
    const list = new GeomPolyList();
    const sentinel = poly([
      [100, 100],
      [101, 100],
      [100, 101],
    ]);
    list.push(sentinel);
    const ret = poly([
      [0, 0],
      [2, 2],
      [2, 0],
      [0, 2],
    ]).simpleDecomposition(list);
    expect(ret).toBe(list);
    expect(list.length).toBe(3);
    // Pieces are unshifted (Haxe nape's List.add prepends), so what the caller
    // put in the list ends up last.
    expect(ring(list.at(2))).toEqual([
      [100, 100],
      [101, 100],
      [100, 101],
    ]);
    const total = Math.abs(signedArea(ring(list.at(0)))) + Math.abs(signedArea(ring(list.at(1))));
    expect(total).toBeCloseTo(2, 12);
  });

  it("is repeatable: pooled vertices recycled from disposed results give identical output", () => {
    const pts: Pt[] = [
      [0, 0],
      [6, 6],
      [6, 0],
      [0, 6],
      [3, -2],
    ];
    const first = poly(pts).simpleDecomposition();
    const a = pieces(first);
    // Return every vertex to the pools, then decompose again.
    for (let i = 0; i < first.length; i++) first.at(i).dispose();
    const b = pieces(poly(pts).simpleDecomposition());
    expect(b).toEqual(a);
  });
});

// Lattice seeds (see latticeRing) the sweep handles. The remaining seeds in
// 1..400 fall into the failure classes pinned in ZPP_Simple.knownFailures.cov.test.ts.
const PASSING_SEEDS = [
  1, 2, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 18, 19, 21, 23, 24, 26, 27, 28, 29, 30, 32, 33, 34, 35,
  36, 37, 38, 39, 40, 45, 46, 47, 49, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61, 62, 63, 64, 65, 66,
  68, 69, 70, 71, 72, 73, 74, 75, 76, 79, 80, 83, 84, 85, 86, 87, 88, 90, 93, 94, 95, 96, 97, 99,
  100, 101, 102, 103, 104, 105, 106, 108, 110, 112, 113, 115, 118, 119, 121, 122, 123, 125, 126,
  127, 128, 129, 131, 132, 133, 134, 135, 136, 137, 138, 140, 141, 142, 143, 144, 145, 146, 147,
  148, 149, 152, 153, 156, 157, 158, 161, 162, 163, 164, 166, 167, 168, 169, 172, 173, 175, 176,
  179, 183, 184, 185, 186, 189, 191, 192, 194, 195, 197, 198, 200, 201, 202, 205, 206, 207, 208,
  209, 210, 211, 212, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 229,
  233, 235, 236, 237, 238, 239, 240, 241, 243, 244, 245, 246, 247, 249, 251, 252, 253, 254, 255,
  256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 267, 269, 271, 272, 274, 275, 276, 277, 278,
  279, 280, 281, 282, 284, 285, 287, 288, 289, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302,
  304, 305, 306, 307, 309, 310, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 323, 325, 326,
  327, 329, 330, 331, 332, 333, 334, 336, 337, 338, 339, 341, 342, 343, 344, 345, 346, 347, 348,
  350, 351, 352, 353, 356, 357, 358, 359, 360, 361, 362, 363, 365, 367, 368, 369, 370, 371, 372,
  373, 374, 375, 376, 377, 379, 380, 382, 383, 385, 386, 387, 388, 389, 390, 391, 393, 394, 395,
  396, 397, 398, 399, 400,
];

// Seeds that decompose without throwing but break the documented contract;
// minimal repros of each class are pinned as it.fails in
// ZPP_Simple.knownFailures.cov.test.ts.
const CONTRACT_VIOLATIONS: Record<number, string> = {
  36: "zero-area collinear sliver piece",
  97: "zero-area collinear sliver piece",
  169: "zero-area collinear sliver piece",
  278: "zero-area collinear sliver piece",
  284: "zero-area collinear sliver piece",
  83: "piece with a proper self-crossing (revisited vertex)",
  260: "piece with a proper self-crossing (revisited vertex)",
  323: "piece with a proper self-crossing (revisited vertex)",
};

describe("ZPP_Simple.decompose — seeded lattice rings", () => {
  it("every handled lattice ring decomposes into its even-odd region", () => {
    for (const seed of PASSING_SEEDS) {
      if (seed in CONTRACT_VIOLATIONS) continue;
      const { pts, size } = latticeRing(seed);
      try {
        checkDecomposition(pts, 0, size - 1);
      } catch (e) {
        throw new Error(`seed ${seed} ${JSON.stringify(pts)}: ${(e as Error).message}`, {
          cause: e,
        });
      }
    }
  });
});

describe("ZPP_Simple.isSimple — against a brute-force oracle", () => {
  const cases: [string, Pt[]][] = [
    [
      "convex square",
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ],
    ],
    [
      "bowtie",
      [
        [0, 0],
        [2, 2],
        [2, 0],
        [0, 2],
      ],
    ],
    [
      "T-junction",
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [2, 0],
        [0, 4],
      ],
    ],
    [
      "revisited vertex",
      [
        [0, 0],
        [2, 1],
        [2, -1],
        [0, 0],
        [-2, 1],
        [-2, -1],
      ],
    ],
    [
      "collinear overlap",
      [
        [0, 0],
        [10, 0],
        [10, 5],
        [2, 5],
        [2, 0],
        [8, 0],
        [8, -5],
        [0, -5],
      ],
    ],
    [
      "concave comb",
      [
        [0, 0],
        [6, 0],
        [6, 4],
        [5, 1],
        [4, 4],
        [3, 1],
        [2, 4],
        [1, 1],
        [0, 4],
      ],
    ],
  ];
  for (const [name, pts] of cases) {
    it(`${name}: isSimple() === brute force (${bruteSimple(pts)})`, () => {
      expect(poly(pts).isSimple()).toBe(bruteSimple(pts));
    });
  }

  it("agrees with brute force on 300 seeded lattice rings", () => {
    // 1096, 1231, 1266: a vertex touching / an edge crossing a vertical edge
    // can be missed (1231 only on some call histories) — pinned as it.fails
    // in ZPP_Simple.knownFailures.cov.test.ts.
    const VERTICAL_TOUCH = new Set([1096, 1231, 1266]);
    let simpleCount = 0;
    for (let seed = 1000; seed < 1300; seed++) {
      if (VERTICAL_TOUCH.has(seed)) continue;
      const { pts } = latticeRing(seed);
      // Drop consecutive duplicates: GeomPoly keeps them, but the oracle
      // would (correctly) call a zero-length edge non-simple while nape
      // skips it. That convention is tested separately.
      const ded = pts.filter((p, i) => {
        const q = pts[(i + pts.length - 1) % pts.length];
        return p[0] !== q[0] || p[1] !== q[1];
      });
      if (ded.length < 3) continue;
      const want = bruteSimple(ded);
      if (want) simpleCount++;
      expect(poly(ded).isSimple(), `seed ${seed} ${JSON.stringify(ded)}`).toBe(want);
    }
    // Guard against a degenerate oracle that says "not simple" for everything.
    expect(simpleCount).toBeGreaterThan(10);
  });
});
