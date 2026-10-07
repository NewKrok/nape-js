/**
 * ZPP_Simple — pinned known failures (it.fails) on degenerate inputs.
 *
 * Each test documents the behaviour GeomPoly.simpleDecomposition() /
 * isSimple() promise (TSDoc: disjoint pieces covering the even-odd region,
 * zero-area slivers dropped, pieces at least weakly simple) and fails today.
 * When one starts passing, flip it to a plain `it`.
 *
 * Every test runs on a FRESH engine instance (vi.resetModules + dynamic
 * import): a throwing decomposition leaves ZPP_Simple's static sweep/queue
 * state and object pools behind, which would make later tests fail for the
 * wrong reason.
 *
 * The failure classes are inherited from Haxe nape's Simple.cx (same sweep
 * and clip_polygon walk) — except that the "corner case 2" throw is a
 * DEBUG-only assertion in Haxe; see the triple-point test.
 */

import { describe, it, expect, vi } from "vitest";

type Pt = [number, number];

async function freshEngine() {
  vi.resetModules();
  await import("../../src/index");
  const { GeomPoly } = await import("../../src/geom/GeomPoly");
  const { Vec2 } = await import("../../src/geom/Vec2");
  return (pts: Pt[]) => new GeomPoly(pts.map(([x, y]) => new Vec2(x, y)));
}

function ring(p: any): Pt[] {
  const out: Pt[] = [];
  const it = p.iterator();
  while (it.hasNext()) {
    const v = it.next();
    out.push([v.x, v.y]);
  }
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

const orient = (a: Pt, b: Pt, c: Pt) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function hasProperCrossing(pts: Pt[]): boolean {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const [a, b, c, d] = [pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]];
      if (orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0)
        return true;
    }
  }
  return false;
}

/** Decompose and check the documented contract; returns the pieces. */
async function expectValidDecomposition(pts: Pt[], lo: number, hi: number, area?: number) {
  const poly = await freshEngine();
  const list = poly(pts).simpleDecomposition();
  const out: Pt[][] = [];
  for (let i = 0; i < list.length; i++) out.push(ring(list.at(i)));
  for (const p of out) {
    expect(p.length).toBeGreaterThanOrEqual(3);
    expect(Math.abs(signedArea(p))).toBeGreaterThan(1e-9);
    expect(hasProperCrossing(p)).toBe(false);
  }
  const N = 41;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = lo + ((i + 0.37) / N) * (hi - lo);
      const y = lo + ((j + 0.61) / N) * (hi - lo);
      if (edgeDistance(pts, x, y) < 1e-7 || out.some((p) => edgeDistance(p, x, y) < 1e-7)) continue;
      expect(out.filter((p) => evenOdd(p, x, y)).length).toBe(evenOdd(pts, x, y) ? 1 : 0);
    }
  }
  if (area !== undefined) {
    expect(out.reduce((s, p) => s + Math.abs(signedArea(p)), 0)).toBeCloseTo(area, 9);
  }
  return out;
}

describe("ZPP_Simple.decompose — known failures", () => {
  // Three edges through the origin: (-2,0)-(2,0), (2,1)-(-2,-1),
  // (-2,1)-(2,-1). Expected: the even-odd region as disjoint pieces.
  // Actual: throws "corner case 2, shiiiit." — the second intersection event
  // at the origin compares equal to the first in the event queue and the
  // segment pairs differ. In Haxe nape this check is inside DEBUG(...), and
  // release builds free the duplicate event instead; doing that here
  // (verified on a patched copy of src/) moves the failure to a null
  // dereference in clip_polygon, so triple points are unsupported either way.
  it.fails("three edges crossing at one point", async () => {
    await expectValidDecomposition(
      [
        [-2, 0],
        [2, 0],
        [2, 1],
        [-2, -1],
        [-2, 1],
        [2, -1],
      ],
      -3,
      3,
    );
  });

  // After any throw inside decompose(), ZPP_Simple's static queue / vertex
  // set / sweep tree keep the half-processed state, so every later call —
  // even on a trivially valid bowtie — fails or returns garbage for the rest
  // of the process. Expected: a failed call leaves no state behind.
  it.fails("a throwing decomposition does not break the next, valid one", async () => {
    const poly = await freshEngine();
    expect(() =>
      poly([
        [-2, 0],
        [2, 0],
        [2, 1],
        [-2, -1],
        [-2, 1],
        [2, -1],
      ]).simpleDecomposition(),
    ).toThrow();
    const list = poly([
      [0, 0],
      [2, 2],
      [2, 0],
      [0, 2],
    ]).simpleDecomposition();
    let total = 0;
    for (let i = 0; i < list.length; i++) total += Math.abs(signedArea(ring(list.at(i))));
    expect(list.length).toBe(2);
    expect(total).toBeCloseTo(2, 12);
  });

  // Triangle (0,0),(2,0),(1,1) plus a there-and-back spike to (-1,2) from
  // the revisited vertex (0,0). Expected: the triangle (area 1); the spike
  // has no area. Actual: clip_polygon removes an already-removed vertex from
  // its vertex set -> "Cannot read properties of null (reading 'next')".
  it.fails("spike from a revisited vertex", async () => {
    await expectValidDecomposition(
      [
        [0, 0],
        [2, 0],
        [1, 1],
        [0, 0],
        [-1, 2],
      ],
      -2,
      3,
      1,
    );
  });

  // Same failure as above on a common real-world input: a keyhole polygon
  // (outer square with a square hole joined by a doubled bridge edge).
  // Expected: pieces covering the 4x4 square minus the 2x2 hole (area 12).
  it.fails("keyhole polygon (outer square + hole joined by a doubled bridge)", async () => {
    await expectValidDecomposition(
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
        [1, 1],
        [1, 3],
        [3, 3],
        [3, 1],
        [1, 1],
      ],
      -1,
      5,
      12,
    );
  });

  // The outline runs back and forth along y=0. Expected (TSDoc: "zero-area
  // slivers are dropped"): just the triangle (0,0),(1,0),(2,3) of area 1.5.
  // Actual: a second, collinear 3-vertex piece (3,0),(1,0),(2,0) of area 0 is
  // emitted — clip_polygon only drops rings with fewer than 3 vertices.
  it.fails("collinear back-and-forth run yields no zero-area piece", async () => {
    const out = await expectValidDecomposition(
      [
        [2, 0],
        [3, 0],
        [1, 0],
        [2, 3],
        [0, 0],
      ],
      -1,
      4,
      1.5,
    );
    expect(out.length).toBe(1);
  });

  // Lattice ring with several vertices on other edges. Expected: every piece
  // at least weakly simple. Actual: the piece (1,4),(4,2),(2,4),(2,3) is a
  // bowtie — its edges (1,4)-(4,2) and (2,4)-(2,3) cross at (2, 10/3).
  it.fails("pieces never self-cross (degenerate lattice ring)", async () => {
    await expectValidDecomposition(
      [
        [2, 3],
        [2, 4],
        [4, 2],
        [1, 4],
        [3, 2],
        [2, 2],
        [3, 1],
        [0, 3],
      ],
      -1,
      5,
    );
  });

  // Same vertical-segment comparator fault as the isSimple cases below, but
  // here it also defeats the decomposition: the slanted edge (3,4)-(1,1)
  // crosses the vertical edge (2,3)-(2,2) at (2, 2.5), yet the sweep never
  // reports the intersection, so the self-crossing ring comes back unchanged
  // as a single "simple" piece. Found by the lattice fuzz in
  // GeomPoly.decompositions.oracle.cov.test.ts.
  it.fails("slanted edge crossing a vertical edge is split", async () => {
    await expectValidDecomposition(
      [
        [2, 3],
        [2, 2],
        [1, 0],
        [3, 1],
        [3, 2],
        [4, 1],
        [3, 4],
        [1, 1],
      ],
      0,
      4,
    );
  });
});

describe("ZPP_Simple.isSimple — known failures", () => {
  // Vertical edge (1,2)-(1,0) crossed in its interior by the horizontal edge
  // (2,1)-(0,1). Expected false. Actual: true. Reversing the ring's start
  // ([[1,0],[1,2],[0,1],[2,1]]) gives the correct false, and on other lattice
  // rings the answer even depends on which decompositions ran earlier in the
  // process — the sweep comparator is inconsistent for vertical segments.
  // simpleDecomposition() of the same ring is correct (two triangles).
  it.fails("vertical edge crossed by a horizontal edge is not simple", async () => {
    const poly = await freshEngine();
    expect(
      poly([
        [1, 2],
        [1, 0],
        [2, 1],
        [0, 1],
      ]).isSimple(),
    ).toBe(false);
  });

  // W shape whose middle vertex (0,2) lies on the closing vertical edge
  // (0,4)-(0,0). Expected false (the boundary touches itself). Actual: true.
  // The same configuration rotated so the touched edge is horizontal
  // ([[0,0],[1,3],[2,0],[3,3],[4,0]]) is correctly reported as non-simple.
  it.fails("vertex touching a vertical edge is not simple", async () => {
    const poly = await freshEngine();
    expect(
      poly([
        [0, 0],
        [3, 1],
        [0, 2],
        [3, 3],
        [0, 4],
      ]).isSimple(),
    ).toBe(false);
  });

  // A SLANTED edge crossing the interior of a vertical edge is missed too
  // (found by the lattice fuzz): (4,2)-(1,0) crosses (3,3)-(3,1) at
  // (3, 4/3), and (4,3)-(2,0) crosses (3,2)-(3,1) at (3, 1.5). Both rings
  // are reported non-simple when reversed (see the controls).
  it.fails("slanted edge crossing a vertical edge is not simple (a)", async () => {
    const poly = await freshEngine();
    expect(
      poly([
        [0, 0],
        [3, 3],
        [3, 1],
        [4, 2],
        [1, 0],
      ]).isSimple(),
    ).toBe(false);
  });

  it.fails("slanted edge crossing a vertical edge is not simple (b)", async () => {
    const poly = await freshEngine();
    expect(
      poly([
        [4, 3],
        [2, 0],
        [3, 2],
        [3, 1],
      ]).isSimple(),
    ).toBe(false);
  });

  // Sanity controls (plain `it`): the mirrored/rotated variants above work,
  // so the it.fails tests fail for the stated reason and not a setup error.
  it("controls: rotated / reversed variants are reported non-simple", async () => {
    const poly = await freshEngine();
    expect(
      poly([
        [1, 0],
        [1, 2],
        [0, 1],
        [2, 1],
      ]).isSimple(),
    ).toBe(false);
    expect(
      poly([
        [0, 0],
        [1, 3],
        [2, 0],
        [3, 3],
        [4, 0],
      ]).isSimple(),
    ).toBe(false);
    expect(
      poly([
        [1, 0],
        [4, 2],
        [3, 1],
        [3, 3],
        [0, 0],
      ]).isSimple(),
    ).toBe(false);
    expect(
      poly([
        [3, 1],
        [3, 2],
        [2, 0],
        [4, 3],
      ]).isSimple(),
    ).toBe(false);
    const list = poly([
      [1, 2],
      [1, 0],
      [2, 1],
      [0, 1],
    ]).simpleDecomposition();
    let total = 0;
    for (let i = 0; i < list.length; i++) total += Math.abs(signedArea(ring(list.at(i))));
    expect(list.length).toBe(2);
    expect(total).toBeCloseTo(1, 12);
  });
});
