/**
 * ZPP_MarchingSquares — lattice iso fields against a reference marching
 * squares.
 *
 * The iso field is the bilinear interpolation of small random integers on a
 * unit lattice, so cell corners carry exact values — including many exact
 * zeros — and the field is *linear along every cell edge*. That gives an
 * independent oracle:
 *
 *   reference cell polygon = inside corners (iso < 0) + edge crossings at the
 *   linear root, walked around the cell; saddles resolved by the iso value at
 *   the cell centre (inside centre → one hexagon, else two triangles).
 *
 * Checked, for combine on/off, quality 0 and > 0 (bisection on a linear edge
 * must land on the same root), subgrids, and off-lattice cells:
 *   - total output area == total reference area
 *   - every sample point is covered by exactly as many output pieces as the
 *     reference region (0 or 1): pieces are disjoint and cover it
 *   - combine=false emits only pieces inside a single cell
 *
 * Exact zeros drive the corner-touching paths: crossings snapped to a corner
 * ("val ^= ..." bit flips) and the degenerate-key filter for cells whose
 * polygon collapses, in plain and saddle cells.
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import { MarchingSquares } from "../../src/geom/MarchingSquares";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";
import { Polygon } from "../../src/shape/Polygon";
import { GeomPolyList } from "../../src/util/registerLists";

type Pt = [number, number];

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

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bilinear interpolation of integer lattice values; constant outside. */
function latticeIso(values: number[][]) {
  const n = values.length - 1;
  return (x: number, y: number) => {
    const cx = Math.max(0, Math.min(n, x));
    const cy = Math.max(0, Math.min(n, y));
    const i = Math.min(n - 1, Math.floor(cx));
    const j = Math.min(n - 1, Math.floor(cy));
    const u = cx - i;
    const v = cy - j;
    const a = values[j][i];
    const b = values[j][i + 1];
    const c = values[j + 1][i + 1];
    const d = values[j + 1][i];
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * u * v + d * (1 - u) * v;
  };
}

function randomLattice(rnd: () => number, n: number, lo = -2, hi = 2): number[][] {
  const vals: number[][] = [];
  for (let j = 0; j <= n; j++) {
    const row: number[] = [];
    for (let i = 0; i <= n; i++) row.push(lo + Math.floor(rnd() * (hi - lo + 1)));
    vals.push(row);
  }
  return vals;
}

/** Cell boundaries as MarchingSquares lays them out. */
function cellEdges(b0: number, b1: number, cs: number): number[] {
  const p = (b1 - b0) / cs;
  let n = p | 0;
  if (p !== n) n++;
  const xs = [b0];
  for (let k = 1; k < n; k++) xs.push(b0 + cs * k);
  xs.push(b1);
  return xs;
}

/** Reference marching-squares polygons, linear interpolation, per cell. */
function reference(iso: (x: number, y: number) => number, xs: number[], ys: number[]): Pt[][] {
  const out: Pt[][] = [];
  const lerp = (a: Pt, va: number, b: Pt, vb: number): Pt => {
    const t = va / (va - vb);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let j = 0; j + 1 < ys.length; j++) {
    for (let i = 0; i + 1 < xs.length; i++) {
      const c: Pt[] = [
        [xs[i], ys[j]],
        [xs[i + 1], ys[j]],
        [xs[i + 1], ys[j + 1]],
        [xs[i], ys[j + 1]],
      ];
      const v = c.map(([x, y]) => iso(x, y));
      const ins = v.map((x) => x < 0);
      const isSaddle = ins[0] === ins[2] && ins[1] === ins[3] && ins[0] !== ins[1];
      const walk = (corners: number[]): Pt[] => {
        // Walk the cell boundary, keeping inside corners and crossings.
        const poly: Pt[] = [];
        for (let k = 0; k < 4; k++) {
          const k2 = (k + 1) % 4;
          if (ins[k] && corners.includes(k)) poly.push(c[k]);
          if (ins[k] !== ins[k2] && (corners.includes(k) || corners.includes(k2))) {
            poly.push(lerp(c[k], v[k], c[k2], v[k2]));
          }
        }
        return poly;
      };
      if (isSaddle) {
        const mid = iso((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2) < 0;
        const inside = [0, 1, 2, 3].filter((k) => ins[k]);
        if (mid) {
          out.push(walk([0, 1, 2, 3]));
        } else {
          for (const k of inside) out.push(walk([k]));
        }
      } else if (ins.some((x) => x)) {
        out.push(walk([0, 1, 2, 3]));
      }
    }
  }
  return out.filter((p) => p.length >= 3 && Math.abs(signedArea(p)) > 1e-12);
}

function runMS(
  iso: (x: number, y: number) => number,
  bounds: [number, number, number, number],
  cs: number,
  quality: number,
  combine: boolean,
  subgrid: number | null = null,
): Pt[][] {
  const [x0, y0, x1, y1] = bounds;
  return pieces(
    MarchingSquares.run(
      iso,
      new AABB(x0, y0, x1 - x0, y1 - y0),
      Vec2.weak(cs, cs),
      quality,
      subgrid == null ? null : Vec2.weak(subgrid, subgrid),
      combine,
    ),
  );
}

function checkAgainstReference(
  out: Pt[][],
  ref: Pt[][],
  bounds: [number, number, number, number],
  label: string,
) {
  const area = (ps: Pt[][]) => ps.reduce((s, p) => s + Math.abs(signedArea(p)), 0);
  expect(area(out), `${label}: area`).toBeCloseTo(area(ref), 9);
  const [x0, y0, x1, y1] = bounds;
  // Bounding boxes (padded) so each sample only tests nearby pieces.
  const boxed = (ps: Pt[][]) =>
    ps.map((p) => ({
      p,
      x0: Math.min(...p.map((q) => q[0])) - 1e-6,
      x1: Math.max(...p.map((q) => q[0])) + 1e-6,
      y0: Math.min(...p.map((q) => q[1])) - 1e-6,
      y1: Math.max(...p.map((q) => q[1])) + 1e-6,
    }));
  const R = boxed(ref);
  const O = boxed(out);
  const near = (bs: ReturnType<typeof boxed>, x: number, y: number) =>
    bs.filter((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1).map((b) => b.p);
  const N = 37;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = x0 + ((i + 0.31) / N) * (x1 - x0);
      const y = y0 + ((j + 0.73) / N) * (y1 - y0);
      const r = near(R, x, y);
      const o = near(O, x, y);
      if (r.some((p) => edgeDistance(p, x, y) < 1e-7)) continue;
      if (o.some((p) => edgeDistance(p, x, y) < 1e-7)) continue;
      const want = r.filter((p) => evenOdd(p, x, y)).length;
      const got = o.filter((p) => evenOdd(p, x, y)).length;
      expect(got, `${label}: coverage at (${x}, ${y})`).toBe(want);
    }
  }
}

describe("ZPP_MarchingSquares — lattice fields vs reference", () => {
  for (const combine of [false, true]) {
    for (const quality of [0, 3]) {
      it(`random {-2..2} lattices, combine=${combine}, quality=${quality}`, () => {
        const rnd = mulberry32(combine ? 31 : 17);
        let zeroCorners = 0;
        for (let trial = 0; trial < 25; trial++) {
          const n = 4 + Math.floor(rnd() * 5);
          const vals = randomLattice(rnd, n);
          zeroCorners += vals.flat().filter((v) => v === 0).length;
          const iso = latticeIso(vals);
          const bounds: [number, number, number, number] = [0, 0, n, n];
          const out = runMS(iso, bounds, 1, quality, combine);
          const ref = reference(iso, cellEdges(0, n, 1), cellEdges(0, n, 1));
          checkAgainstReference(out, ref, bounds, `trial ${trial} ${JSON.stringify(vals)}`);
          if (!combine) {
            // Uncombined pieces never leave their cell.
            for (const p of out) {
              const cx = Math.floor(p.reduce((s, q) => s + q[0], 0) / p.length);
              const cy = Math.floor(p.reduce((s, q) => s + q[1], 0) / p.length);
              for (const [x, y] of p) {
                expect(x).toBeGreaterThanOrEqual(cx - 1e-12);
                expect(x).toBeLessThanOrEqual(cx + 1 + 1e-12);
                expect(y).toBeGreaterThanOrEqual(cy - 1e-12);
                expect(y).toBeLessThanOrEqual(cy + 1 + 1e-12);
              }
            }
          }
        }
        // Guard: the inputs really are corner-degenerate.
        expect(zeroCorners).toBeGreaterThan(100);
      });
    }
  }

  it("tiny negative corners snap crossings onto inside corners (degenerate keys)", () => {
    // A corner value of -1e-20 next to an O(1) value puts the edge crossing
    // at t ~ 1e-20, which rounds onto the (inside) corner itself. The cell
    // polygon then loses that crossing ("val ^= bit") and cells reduced to a
    // corner or a corner pair are filtered as degenerate — in plain cells and
    // in both saddle resolutions.
    // combine=false only: with combine=true such fields can crash combUD —
    // pinned in ZPP_MarchingSquares.knownFailures.cov.test.ts.
    const rnd = mulberry32(2024);
    const palette = [-2, -1, -1e-20, -1e-20, 0, 1e-20, 1, 2];
    for (const combine of [false]) {
      for (let trial = 0; trial < 30; trial++) {
        const n = 5;
        const vals: number[][] = [];
        for (let j = 0; j <= n; j++) {
          const row: number[] = [];
          for (let i = 0; i <= n; i++) row.push(palette[Math.floor(rnd() * palette.length)]);
          vals.push(row);
        }
        const iso = latticeIso(vals);
        for (const q of [0, 2]) {
          const out = runMS(iso, [0, 0, n, n], 1, q, combine);
          const ref = reference(iso, cellEdges(0, n, 1), cellEdges(0, n, 1));
          checkAgainstReference(out, ref, [0, 0, n, n], `tiny ${trial} q=${q} combine=${combine}`);
        }
      }
    }
  });

  it("saddle-only checkerboards with exact zeros on alternate corners", () => {
    // Values -1/1 checkerboard with some lattice points forced to 0: every
    // cell is a saddle or a collapsed saddle.
    const rnd = mulberry32(99);
    for (let trial = 0; trial < 20; trial++) {
      const n = 6;
      const vals: number[][] = [];
      for (let j = 0; j <= n; j++) {
        const row: number[] = [];
        for (let i = 0; i <= n; i++) {
          const s = (i + j) % 2 === 0 ? -1 : 1;
          row.push(rnd() < 0.3 ? 0 : s * (1 + Math.floor(rnd() * 2)));
        }
        vals.push(row);
      }
      const iso = latticeIso(vals);
      for (const combine of [false, true]) {
        const out = runMS(iso, [0, 0, n, n], 1, 2, combine);
        const ref = reference(iso, cellEdges(0, n, 1), cellEdges(0, n, 1));
        checkAgainstReference(out, ref, [0, 0, n, n], `checker ${trial} combine=${combine}`);
      }
    }
  });

  it("off-lattice, non-unit cells (bounds a whole number of cells), with subgrids", () => {
    // Cell edges at quarter coordinates span two lattice cells, so the field
    // is only piecewise linear along them; quality 0 still uses the plain
    // linear root of the corner values, as the reference does.
    const rnd = mulberry32(5);
    for (let trial = 0; trial < 6; trial++) {
      const vals = randomLattice(rnd, 8);
      const iso = latticeIso(vals);
      const bounds: [number, number, number, number] = [0.25, 0.75, 7.25, 7.75];
      const cs = 0.5;
      const ref = reference(iso, cellEdges(0.25, 7.25, cs), cellEdges(0.75, 7.75, cs));
      for (const combine of [false, true]) {
        const out = runMS(iso, bounds, cs, 0, combine);
        checkAgainstReference(out, ref, bounds, `off-lattice ${trial} combine=${combine}`);
      }
      // Subgrid blocks of 2x2 units (4x4 cells; the last block is 1 unit
      // wide): same cells, so the same reference, combined per block.
      for (const combine of [false, true]) {
        const out = runMS(iso, bounds, cs, 0, combine, 2);
        checkAgainstReference(out, ref, bounds, `subgrid ${trial} combine=${combine}`);
      }
    }
  });

  // Bounds that are not a whole number of cells: the last column/row of
  // cells is narrower and its vertices are placed at the bound (x1 = bx1),
  // but the iso grid samples that column at bx0 + cell*xn — past the bound —
  // because the grid fill tests `x <= xn` (its `else bx1` branch is
  // unreachable). Same code in Haxe nape's MarchingSquares.cx. For
  // iso = x - 2.5 over [0,3]x[0,1] with 2x2 cells the region x < 2.5 has area
  // 2.5; nape returns 2.25 at quality 0 (and ~2.493 even at quality 8).
  it.fails("partial last cell samples the iso at the bound (area 2.5, not 2.25)", () => {
    const out = runMS((x) => x - 2.5, [0, 0, 3, 1], 2, 0, true);
    expect(out.length).toBe(1);
    expect(Math.abs(signedArea(out[0]))).toBeCloseTo(2.5, 9);
  });

  it("all-inside field: combine merges every cell into one bounds-sized polygon", () => {
    const iso = () => -1;
    const out = runMS(iso, [0, 0, 5, 3], 1, 0, true);
    expect(out.length).toBe(1);
    expect(Math.abs(signedArea(out[0]))).toBeCloseTo(15, 12);
    const uncombined = runMS(iso, [0, 0, 5, 3], 1, 0, false);
    expect(uncombined.length).toBe(15);
    for (const p of uncombined) expect(Math.abs(signedArea(p))).toBeCloseTo(1, 12);
  });

  it("all-outside and all-zero fields produce nothing", () => {
    for (const v of [1, 0]) {
      for (const combine of [false, true]) {
        expect(runMS(() => v, [0, 0, 4, 4], 1, 2, combine)).toEqual([]);
      }
    }
  });

  it("single inside lattice point surrounded by zeros collapses to nothing", () => {
    // Every cell around (2,2) has three zero corners and one negative one:
    // all crossings snap onto corners and the cell polygons degenerate.
    const vals = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, -1, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    const iso = latticeIso(vals);
    for (const combine of [false, true]) {
      for (const q of [0, 4]) {
        const out = runMS(iso, [0, 0, 4, 4], 1, q, combine);
        const ref = reference(iso, cellEdges(0, 4, 1), cellEdges(0, 4, 1));
        checkAgainstReference(out, ref, [0, 0, 4, 4], `spike combine=${combine} q=${q}`);
      }
    }
  });

  it("lazily validated Vec2 (body.localCOM) works as the cell size", () => {
    // A 2x2 box centred at (1,1) gives localCOM (1,1) through a _validate hook.
    const body = new Body();
    body.shapes.add(new Polygon(Polygon.rect(0, 0, 2, 2)));
    const iso = (x: number, y: number) => Math.hypot(x - 3, y - 3) - 2;
    const a = pieces(MarchingSquares.run(iso, new AABB(0, 0, 6, 6), body.localCOM, 1, null, true));
    const b = pieces(MarchingSquares.run(iso, new AABB(0, 0, 6, 6), new Vec2(1, 1), 1, null, true));
    expect(a).toEqual(b);
    expect(a.length).toBe(1);
    // Inscribed approximation of a radius-2 circle: below π r², well above
    // the inscribed square.
    const A = Math.abs(signedArea(a[0]));
    expect(A).toBeLessThan(Math.PI * 4);
    expect(A).toBeGreaterThan(8);
  });

  it("appends to a caller-supplied output list", () => {
    const list = new GeomPolyList();
    const iso = (x: number, y: number) => Math.hypot(x - 2, y - 2) - 1.5;
    const ret = MarchingSquares.run(iso, new AABB(0, 0, 4, 4), new Vec2(1, 1), 2, null, true, list);
    expect(ret).toBe(list);
    MarchingSquares.run(iso, new AABB(10, 0, 4, 4), new Vec2(1, 1), 2, null, true, list);
    expect(list.length).toBe(1);
    const iso2 = (x: number, y: number) =>
      Math.min(Math.hypot(x - 2, y - 2), Math.hypot(x - 12, y - 2)) - 1.5;
    MarchingSquares.run(iso2, new AABB(10, 0, 4, 4), new Vec2(1, 1), 2, null, true, list);
    expect(list.length).toBe(2);
  });
});
