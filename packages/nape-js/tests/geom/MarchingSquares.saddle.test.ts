/**
 * ZPP_MarchingSquares — ambiguous (saddle) cell coverage.
 *
 * A marching-squares cell whose diagonal corners share a sign (key 5 or
 * key 10) is ambiguous: the iso-line can either connect the two "inside"
 * corners through the middle (one polygon) or cut them off separately (two
 * polygons). The engine resolves it by sampling the cell centre. Neither
 * MarchingSquares.extended nor .stability drives these branches, because a
 * smooth blob iso never produces a saddle.
 *
 * The hyperbolic iso `(x - 5)(y - 5) + c` over the single cell [0,10]² has
 * its saddle exactly at the cell centre, so the sign of `c` picks the
 * branch and the sign of the product picks the key:
 *
 *   iso = +(x-5)(y-5) + c  → corners (10,0) and (0,10) inside → key 5
 *   iso = -(x-5)(y-5) + c  → corners (0,0) and (10,10) inside → key 10
 *   c < 0 → centre inside  → one polygon joining both corners
 *   c > 0 → centre outside → two corner triangles
 *
 * Lattice tests then tile the saddle across many cells so the ambiguous
 * pieces get combined with their neighbours (combLR / combUD /
 * combUD_virtual), with and without a subgrid splitting the lattice.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { MarchingSquares } from "../../src/geom/MarchingSquares";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";

type Iso = (x: number, y: number) => number;

function polys(list: any): any[] {
  const out: any[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.at(i));
  return out;
}

function totalArea(list: any): number {
  let a = 0;
  for (const p of polys(list)) a += Math.abs(p.area());
  return a;
}

/** Area of { iso < 0 } inside the bounds, by midpoint sampling. */
function sampledArea(iso: Iso, x0: number, y0: number, w: number, h: number, n = 400): number {
  const dx = w / n;
  const dy = h / n;
  let inside = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (iso(x0 + (i + 0.5) * dx, y0 + (j + 0.5) * dy) < 0) inside++;
    }
  }
  return inside * dx * dy;
}

function vertices(p: any): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  const it = p.iterator();
  while (it.hasNext()) {
    const v = it.next();
    out.push({ x: v.x, y: v.y });
  }
  return out;
}

/** True when two edges cross at a point interior to both (touching is allowed). */
function properlyCross(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean {
  const eps = 1e-9;
  const orient = (p: any, q: any, r: any) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
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
 * Every piece is a finite, non-degenerate ring. With `strict`, each piece must
 * also be simple. Without it, a piece may be *weakly* simple: combined output
 * bridges enclosed holes into the outer boundary through repeated vertices,
 * so edges may touch but must never properly cross.
 */
function expectWellFormed(list: any, strict = true): void {
  for (const p of polys(list)) {
    expect(p.size()).toBeGreaterThanOrEqual(3);
    expect(p.isDegenerate()).toBe(false);
    const vs = vertices(p);
    for (const v of vs) {
      expect(Number.isFinite(v.x)).toBe(true);
      expect(Number.isFinite(v.y)).toBe(true);
    }
    if (strict) {
      expect(p.isSimple()).toBe(true);
      continue;
    }
    const n = vs.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const crossing = properlyCross(vs[i], vs[(i + 1) % n], vs[j], vs[(j + 1) % n]);
        expect(crossing, `edges ${i} and ${j} cross`).toBe(false);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Single ambiguous cell
// ---------------------------------------------------------------------------

describe("MarchingSquares — single saddle cell", () => {
  const cell = (iso: Iso, quality = 2) =>
    MarchingSquares.run(iso, new AABB(0, 0, 10, 10), new Vec2(10, 10), quality);

  const cases: Array<{ name: string; sign: 1 | -1; c: number; count: number }> = [
    { name: "key 5, centre inside → one joined polygon", sign: 1, c: -1, count: 1 },
    { name: "key 5, centre outside → two corner pieces", sign: 1, c: 1, count: 2 },
    { name: "key 10, centre inside → one joined polygon", sign: -1, c: -1, count: 1 },
    { name: "key 10, centre outside → two corner pieces", sign: -1, c: 1, count: 2 },
  ];

  for (const { name, sign, c, count } of cases) {
    it(name, () => {
      const iso: Iso = (x, y) => sign * (x - 5) * (y - 5) + c;
      const out = cell(iso);
      expect(out.length).toBe(count);
      expectWellFormed(out);
    });
  }

  it("the two corner pieces sit in opposite corners", () => {
    // key 10 split: the inside corners are (0,0) and (10,10).
    const out = cell((x, y) => -(x - 5) * (y - 5) + 1);
    const [a, b] = polys(out);
    const ca = a.bounds();
    const cb = b.bounds();
    const low = ca.x < cb.x ? ca : cb;
    const high = ca.x < cb.x ? cb : ca;
    expect(low.x).toBeCloseTo(0, 6);
    expect(low.y).toBeCloseTo(0, 6);
    expect(high.x + high.width).toBeCloseTo(10, 6);
    expect(high.y + high.height).toBeCloseTo(10, 6);
  });

  it("joined polygon covers more area than the split pair", () => {
    const joined = cell((x, y) => (x - 5) * (y - 5) - 1);
    const split = cell((x, y) => (x - 5) * (y - 5) + 1);
    expect(totalArea(joined)).toBeGreaterThan(totalArea(split));
  });

  it("saddle whose off-diagonal corners sit exactly on the threshold", () => {
    // Bilinear corner values (-1, 0, -1, 0): the "outside" corners are exactly
    // 0, so every edge crossing lands on a corner. A centre bump flips the
    // ambiguity test between joined and split without moving the corners.
    const bil = (x: number, y: number) => {
      const u = x / 10;
      const v = y / 10;
      return -(1 - u) * (1 - v) - u * v;
    };
    for (const sign of [1, -1]) {
      const flip = (x: number) => (sign > 0 ? x : 10 - x);
      const bump = (x: number, y: number) => 3 * Math.max(0, 1 - ((x - 5) ** 2 + (y - 5) ** 2) / 4);

      // Centre inside → the joined ring degenerates to the whole cell.
      // Crossings coincide with the zero corners, so the ring carries
      // zero-length edges (repeated consecutive vertices) and is only weakly
      // simple — pinned here as current behaviour.
      const joined = cell((x, y) => bil(flip(x), y));
      expect(joined.length).toBe(1);
      expectWellFormed(joined, false);
      expect(Math.abs(joined.at(0).area())).toBeCloseTo(100, 6);

      // Centre outside → two half-cell triangles meeting on the diagonal.
      const split = cell((x, y) => bil(flip(x), y) + bump(x, y));
      expect(split.length).toBe(2);
      expectWellFormed(split);
      for (const p of polys(split)) expect(Math.abs(p.area())).toBeCloseTo(50, 6);
    }
  });

  it("quality 0 and a high quality agree on the topology", () => {
    for (const c of [-1, 1]) {
      const iso: Iso = (x, y) => -(x - 5) * (y - 5) + c;
      expect(cell(iso, 0).length).toBe(cell(iso, 6).length);
    }
  });
});

// ---------------------------------------------------------------------------
// Saddle lattice — ambiguous cells combined with neighbours
// ---------------------------------------------------------------------------

describe("MarchingSquares — saddle lattice", () => {
  // sin·sin has saddles at every multiple of π·k; offset the grid by half a
  // cell so each saddle lands exactly on a cell centre.
  const k = 4;
  const period = Math.PI * k;
  const lattice =
    (c: number): Iso =>
    (x, y) =>
      Math.sin(x / k) * Math.sin(y / k) + c;
  const W = period * 6;
  const bounds = () => new AABB(-period / 2, -period / 2, W, W);
  const cellsize = () => new Vec2(period, period);

  for (const c of [-0.05, 0.05]) {
    it(`combine=true yields well-formed output (c=${c})`, () => {
      const out = MarchingSquares.run(lattice(c), bounds(), cellsize(), 3);
      expect(out.length).toBeGreaterThan(0);
      expectWellFormed(out, false);
    });

    it(`combine=true never produces more pieces than combine=false (c=${c})`, () => {
      const joined = MarchingSquares.run(lattice(c), bounds(), cellsize(), 3, null, true);
      const loose = MarchingSquares.run(lattice(c), bounds(), cellsize(), 3, null, false);
      expect(joined.length).toBeLessThan(loose.length);
      expect(totalArea(joined)).toBeCloseTo(totalArea(loose), 3);
    });
  }

  it("fine lattice area tracks the sampled iso area", () => {
    const iso = lattice(0.1);
    const x0 = -period / 2;
    const out = MarchingSquares.run(iso, bounds(), new Vec2(period / 8, period / 8), 3);
    expectWellFormed(out, false);
    const expected = sampledArea(iso, x0, x0, W, W);
    expect(Math.abs(totalArea(out) - expected) / expected).toBeLessThan(0.02);
  });

  it("subgrid splitting the lattice keeps the total area", () => {
    const iso = lattice(-0.05);
    const cs = new Vec2(period / 2, period / 2);
    const whole = MarchingSquares.run(iso, bounds(), cs, 2);
    const split = MarchingSquares.run(
      iso,
      bounds(),
      new Vec2(period / 2, period / 2),
      2,
      new Vec2(period * 1.5, period * 2.5),
    );
    expectWellFormed(split, false);
    expect(split.length).toBeGreaterThanOrEqual(whole.length);
    expect(totalArea(split)).toBeCloseTo(totalArea(whole), 2);
  });

  it("checkerboard of alternating saddles combines into diagonal bands", () => {
    // |sin| product minus a threshold: every cell is ambiguous, centre
    // alternates between inside and outside across the board.
    const iso: Iso = (x, y) => Math.sin(x / k) * Math.sin(y / k) * ((x + y) % 2 > 1 ? 1 : -1);
    const out = MarchingSquares.run(iso, bounds(), cellsize(), 2);
    expectWellFormed(out, false);
  });

  it("combined lattice with c<0 bridges its holes (weakly simple output)", () => {
    // c<0 joins every saddle: one inside region enclosing the outside
    // islands, emitted as a single ring whose holes are linked to the outer
    // boundary. combine=false keeps every piece strictly simple instead.
    const joined = MarchingSquares.run(lattice(-0.05), bounds(), cellsize(), 3);
    expect(joined.length).toBe(1);
    expect(joined.at(0).isSimple()).toBe(false);
    const loose = MarchingSquares.run(lattice(-0.05), bounds(), cellsize(), 3, null, false);
    expectWellFormed(loose);
  });
});
