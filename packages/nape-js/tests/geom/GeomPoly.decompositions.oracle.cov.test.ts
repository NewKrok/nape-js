/**
 * GeomPoly decompositions + isSimple on LATTICE inputs, checked against an
 * independent oracle.
 *
 * Integer-grid polygons are full of the ties the sweep code has to break:
 * horizontal edges, vertices sharing a y (or x), collinear runs. That is
 * where ZPP_Monotone / ZPP_PartitionVertex / ZPP_PartitionedPoly /
 * ZPP_SimpleSweep keep their special cases, so seeded rectilinear "skylines",
 * staircases and rounded stars are generated and every result is verified
 * without trusting the engine:
 *
 *   - piece areas sum to |input area| (exact on the lattice)
 *   - pieces are pairwise disjoint and cover the input (point sampling)
 *   - every piece has the property the decomposition promises (convex,
 *     y-monotone, triangle, simple) and uses only input vertices
 *   - isSimple() agrees with a brute-force segment-intersection test
 *
 * A dense fuzz over random 5×5-lattice rings also cross-checks isSimple()
 * and every decomposition; it excludes rings whose only crossing goes
 * through a VERTICAL edge — that comparator fault is pinned in
 * ZPP_Simple.knownFailures.cov.test.ts.
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

function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    a += ax * by - bx * ay;
  }
  return a / 2;
}

function classify(pts: Pt[], x: number, y: number, eps = 1e-7): "in" | "out" | "edge" {
  let inside = false;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const ex = bx - ax;
    const ey = by - ay;
    const len2 = ex * ex + ey * ey;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len2)) : 0;
    if (Math.hypot(ax + ex * t - x, ay + ey * t - y) <= eps) return "edge";
    if (ay > y !== by > y && x < ax + ((y - ay) * ex) / ey) inside = !inside;
  }
  return inside ? "in" : "out";
}

const cross = (o: Pt, a: Pt, b: Pt) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function onSegment(p: Pt, a: Pt, b: Pt): boolean {
  return (
    cross(a, b, p) === 0 &&
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1])
  );
}

function segmentsTouch(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = Math.sign(cross(c, d, a));
  const d2 = Math.sign(cross(c, d, b));
  const d3 = Math.sign(cross(a, b, c));
  const d4 = Math.sign(cross(a, b, d));
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  return onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b);
}

/** Strictly simple: non-adjacent edges never touch, adjacent edges share only their vertex. */
function bruteSimple(pts: Pt[]): boolean {
  const n = pts.length;
  if (n < 3 || signedArea(pts) === 0) return false;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    if (a[0] === b[0] && a[1] === b[1]) return false;
    for (let j = i + 1; j < n; j++) {
      const c = pts[j];
      const d = pts[(j + 1) % n];
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) {
        // Shared vertex only: the far endpoint of one must not lie on the other.
        const shared = j === i + 1 ? b : a;
        const far1 = shared === b ? a : b;
        const far2 = shared === b ? d : c;
        if (onSegment(far1, c, d) || onSegment(far2, a, b)) return false;
      } else if (segmentsTouch(a, b, c, d)) {
        return false;
      }
    }
  }
  return true;
}

function isConvexRing(pts: Pt[]): boolean {
  let sign = 0;
  for (let i = 0; i < pts.length; i++) {
    const c = cross(pts[i], pts[(i + 1) % pts.length], pts[(i + 2) % pts.length]);
    if (c === 0) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

/** y-monotone: the boundary has exactly one local max and one local min in y (plateaus merged). */
function isYMonotoneRing(pts: Pt[]): boolean {
  const ys = pts.map((p) => p[1]);
  const dedup: number[] = [];
  for (const y of ys) if (dedup.length === 0 || dedup[dedup.length - 1] !== y) dedup.push(y);
  if (dedup.length > 1 && dedup[0] === dedup[dedup.length - 1]) dedup.pop();
  let turns = 0;
  const m = dedup.length;
  for (let i = 0; i < m; i++) {
    const prev = dedup[(i - 1 + m) % m];
    const next = dedup[(i + 1) % m];
    if ((dedup[i] > prev && dedup[i] > next) || (dedup[i] < prev && dedup[i] < next)) turns++;
  }
  return turns <= 2;
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

const ri = (rnd: () => number, lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

/** Skyline: bars of random integer height on a flat base — many horizontal edges and equal ys. */
function skyline(rnd: () => number): Pt[] {
  const bars = ri(rnd, 2, 8);
  const pts: Pt[] = [[0, 0]];
  let x = 0;
  for (let i = 0; i < bars; i++) {
    const h = ri(rnd, 1, 5);
    pts.push([x, h]);
    x += ri(rnd, 1, 3);
    pts.push([x, h]);
  }
  pts.push([x, 0]);
  // Merge zero-length steps produced by equal neighbouring heights.
  return dedupe(pts);
}

/** Staircase going up-right then back down: lots of reflex vertices on shared rows/columns. */
function staircase(rnd: () => number): Pt[] {
  const steps = ri(rnd, 2, 6);
  const up: Pt[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < steps; i++) {
    up.push([x, y]);
    x += ri(rnd, 1, 2);
    up.push([x, y]);
    y += ri(rnd, 1, 2);
  }
  up.push([x, y]);
  const top = y;
  const pts: Pt[] = [...up, [x + ri(rnd, 1, 3), top], [x + ri(rnd, 1, 3) + 3, 0]];
  return dedupe(pts);
}

/** Star around the origin with integer-rounded vertices (often shares rows/cols). */
function latticeStar(rnd: () => number): Pt[] {
  const n = ri(rnd, 5, 14);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 ? ri(rnd, 1, 3) : ri(rnd, 4, 7);
    pts.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)]);
  }
  return dedupe(pts);
}

function dedupe(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) out.push(p);
  }
  while (
    out.length > 1 &&
    out[0][0] === out[out.length - 1][0] &&
    out[0][1] === out[out.length - 1][1]
  )
    out.pop();
  return out;
}

/** Random dihedral transform (rotate by 90° steps, maybe mirror) + random start vertex. */
function shuffleFrame(rnd: () => number, pts: Pt[]): Pt[] {
  const k = ri(rnd, 0, 3);
  const mirror = rnd() < 0.5;
  let out = pts.map(([x, y]): Pt => {
    let p: Pt = [x, y];
    for (let i = 0; i < k; i++) p = [-p[1], p[0]];
    return mirror ? [-p[0], p[1]] : p;
  });
  if (rnd() < 0.5) out = out.reverse();
  const s = ri(rnd, 0, out.length - 1);
  return [...out.slice(s), ...out.slice(0, s)];
}

/** Insert a collinear midpoint on some edges (on-lattice ones only). */
function addCollinear(rnd: () => number, pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    out.push(a);
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    if (
      rnd() < 0.3 &&
      Number.isInteger(mx) &&
      Number.isInteger(my) &&
      !(mx === a[0] && my === a[1])
    )
      out.push([mx, my]);
  }
  return out;
}

function generate(seed: number): Pt[] {
  const rnd = mulberry32(seed);
  const kind = seed % 3;
  const base = kind === 0 ? skyline(rnd) : kind === 1 ? staircase(rnd) : latticeStar(rnd);
  return shuffleFrame(rnd, addCollinear(rnd, base));
}

const key = (p: Pt) => `${p[0]},${p[1]}`;

/** Areas sum exactly, pieces disjoint and covering (sampled on an off-lattice grid). */
function expectPartition(input: Pt[], out: Pt[][], newVertices = false) {
  const total = Math.abs(signedArea(input));
  const sum = out.reduce((s, p) => s + Math.abs(signedArea(p)), 0);
  expect(sum).toBeCloseTo(total, 9);
  for (const p of out) expect(Math.abs(signedArea(p))).toBeGreaterThan(0);
  if (!newVertices) {
    const allowed = new Set(input.map(key));
    for (const p of out) for (const v of p) expect(allowed.has(key(v))).toBe(true);
  }
  const xs = input.map((p) => p[0]);
  const ys = input.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // Irrational-ish offsets keep samples off every lattice line and diagonal.
  for (let x = x0 + 0.1234; x < x1; x += 0.37) {
    for (let y = y0 + 0.0789; y < y1; y += 0.41) {
      const want = classify(input, x, y);
      if (want === "edge") continue;
      let hits = 0;
      let edge = false;
      for (const p of out) {
        const c = classify(p, x, y);
        if (c === "in") hits++;
        if (c === "edge") edge = true;
      }
      if (edge) continue;
      expect(hits, `sample (${x.toFixed(3)}, ${y.toFixed(3)})`).toBe(want === "in" ? 1 : 0);
    }
  }
}

const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);
const inputs = SEEDS.map((s) => ({ seed: s, pts: generate(s) })).filter(({ pts }) =>
  bruteSimple(pts),
);

describe("lattice generator sanity", () => {
  it("produces plenty of simple, degenerate-rich polygons", () => {
    expect(inputs.length).toBeGreaterThan(90);
    const withTies = inputs.filter(({ pts }) => new Set(pts.map((p) => p[1])).size < pts.length);
    expect(withTies.length).toBeGreaterThan(inputs.length * 0.9);
  });
});

describe("isSimple vs brute force", () => {
  it("agrees on every generated simple polygon", () => {
    for (const { seed, pts } of inputs) expect(poly(pts).isSimple(), `seed ${seed}`).toBe(true);
  });

  it("agrees on lattice polygons with a crossing introduced by swapping two vertices", () => {
    let checked = 0;
    for (const { seed, pts } of inputs) {
      if (pts.length < 5) continue;
      const rnd = mulberry32(seed * 7919);
      const i = ri(rnd, 0, pts.length - 1);
      const j = (i + 2 + ri(rnd, 0, pts.length - 4)) % pts.length;
      const sw = pts.slice();
      [sw[i], sw[j]] = [sw[j], sw[i]];
      const want = bruteSimple(sw);
      // Only generic crossings: pinned degenerate touch cases live in
      // ZPP_Simple.knownFailures.cov.test.ts.
      if (!want && hasDegenerateTouch(sw)) continue;
      expect(poly(sw).isSimple(), `seed ${seed} swap ${i}<->${j}`).toBe(want);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });
});

/** True when some vertex lies on an edge it does not belong to (touch / overlap, not a proper crossing). */
function hasDegenerateTouch(pts: Pt[]): boolean {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    for (let k = 0; k < n; k++) {
      if (k === i || k === (i + 1) % n) continue;
      if (onSegment(pts[k], a, b)) return true;
    }
  }
  return false;
}

describe("decompositions on lattice polygons", () => {
  it("monotoneDecomposition: y-monotone pieces partitioning the input", () => {
    for (const { seed, pts } of inputs) {
      const out = pieces(poly(pts).monotoneDecomposition());
      for (const p of out) expect(isYMonotoneRing(p), `seed ${seed}`).toBe(true);
      expectPartition(pts, out);
    }
  });

  for (const delaunay of [false, true]) {
    it(`convexDecomposition(delaunay=${delaunay}): convex pieces partitioning the input`, () => {
      for (const { seed, pts } of inputs) {
        const out = pieces(poly(pts).convexDecomposition(delaunay));
        for (const p of out) expect(isConvexRing(p), `seed ${seed}`).toBe(true);
        expectPartition(pts, out);
      }
    });

    it(`triangularDecomposition(delaunay=${delaunay}): triangles partitioning the input`, () => {
      for (const { seed, pts } of inputs) {
        const out = pieces(poly(pts).triangularDecomposition(delaunay));
        for (const p of out) expect(p.length, `seed ${seed}`).toBe(3);
        expectPartition(pts, out);
      }
    });
  }

  it("simpleDecomposition of an already-simple polygon covers it with simple pieces", () => {
    for (const { seed, pts } of inputs) {
      const out = pieces(poly(pts).simpleDecomposition());
      for (const p of out) expect(bruteSimple(p), `seed ${seed}`).toBe(true);
      expectPartition(pts, out);
    }
  });
});

function crossesProperly(pts: Pt[]): boolean {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [a, b, c, d] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
    }
  }
  return false;
}

/** Two or more proper crossings at the same point (a "triple point" — pinned known failure). */
function hasSharedCrossingPoint(pts: Pt[]): boolean {
  const n = pts.length;
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [a, b, c, d] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
      const c1 = cross(a, b, c);
      const c2 = cross(a, b, d);
      if (!(c1 * c2 < 0 && cross(c, d, a) * cross(c, d, b) < 0)) continue;
      const t = c1 / (c1 - c2);
      const k = `${(c[0] + (d[0] - c[0]) * t).toFixed(9)},${(c[1] + (d[1] - c[1]) * t).toFixed(9)}`;
      if (seen.has(k)) return true;
      seen.add(k);
    }
  }
  return false;
}

/** A proper crossing (interiors cross at one point) where one of the two edges is vertical. */
function crossesVerticalEdge(pts: Pt[]): boolean {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [a, b, c, d] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
      const proper = cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
      if (proper && (a[0] === b[0] || c[0] === d[0])) return true;
    }
  }
  return false;
}

describe("dense 5×5 lattice fuzz", () => {
  const rings: { seed: number; pts: Pt[]; simple: boolean }[] = [];
  for (let seed = 1; seed <= 3000; seed++) {
    const rnd = mulberry32(seed * 104729);
    const n = ri(rnd, 4, 9);
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) pts.push([ri(rnd, 0, 4), ri(rnd, 0, 4)]);
    const simple = bruteSimple(pts);
    if (!simple && (hasDegenerateTouch(pts) || crossesVerticalEdge(pts))) continue;
    rings.push({ seed, pts, simple });
  }

  it("isSimple agrees with brute force", () => {
    expect(rings.filter((r) => r.simple).length).toBeGreaterThan(200);
    expect(rings.filter((r) => !r.simple).length).toBeGreaterThan(200);
    for (const { seed, pts, simple } of rings) {
      expect(poly(pts).isSimple(), `seed ${seed} ${JSON.stringify(pts)}`).toBe(simple);
    }
  });

  it("every decomposition of the simple rings partitions them", () => {
    for (const { seed, pts, simple } of rings) {
      if (!simple) continue;
      const msg = `seed ${seed} ${JSON.stringify(pts)}`;
      const mono = pieces(poly(pts).monotoneDecomposition());
      for (const p of mono) expect(isYMonotoneRing(p), msg).toBe(true);
      expectPartition(pts, mono);
      const convex = pieces(poly(pts).convexDecomposition(true));
      for (const p of convex) expect(isConvexRing(p), msg).toBe(true);
      expectPartition(pts, convex);
      const tris = pieces(poly(pts).triangularDecomposition());
      for (const p of tris) expect(p.length, msg).toBe(3);
      expectPartition(pts, tris);
    }
  });

  it("simpleDecomposition of the crossing rings yields simple, disjoint pieces of the even-odd region", () => {
    let checked = 0;
    for (const { seed, pts, simple } of rings) {
      // Triple points throw and leave the sweep state corrupt (pinned in
      // ZPP_Simple.knownFailures.cov.test.ts), so they are filtered up front.
      if (simple || hasSharedCrossingPoint(pts)) continue;
      const out = pieces(poly(pts).simpleDecomposition());
      // Documented contract: pieces are at least WEAKLY simple (they may touch
      // themselves at a vertex) — no proper crossing, non-zero area.
      for (const p of out) {
        expect(crossesProperly(p), `seed ${seed} ${JSON.stringify(pts)}`).toBe(false);
        expect(Math.abs(signedArea(p))).toBeGreaterThan(0);
      }
      // Even-odd region of the input == union of pieces (sampled).
      for (let x = 0.1234; x < 4; x += 0.37) {
        for (let y = 0.0789; y < 4; y += 0.41) {
          const want = classify(pts, x, y);
          if (want === "edge" || out.some((p) => classify(p, x, y) === "edge")) continue;
          const hits = out.filter((p) => classify(p, x, y) === "in").length;
          expect(hits, `seed ${seed} at (${x}, ${y})`).toBe(want === "in" ? 1 : 0);
        }
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(200);
  });
});
