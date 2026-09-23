/**
 * GeomPoly.simplify — Ramer–Douglas–Peucker guarantees and forced vertices.
 *
 * ZPP_Simplify seeds its recursion differently depending on how many of the
 * ring's vertices are *forced* (must survive simplification): none, exactly
 * one, or several. MarchingSquares marks vertices on subgrid seams as forced
 * so that neighbouring pieces still meet after simplification. The existing
 * suites only simplify plain rings, so the one-forced and many-forced seeds
 * never ran.
 *
 * Each test checks the RDP contract rather than exact output:
 *   - the result is a subset of the input vertices, in the same cyclic order
 *   - every dropped input vertex lies within `epsilon` of the result outline
 *   - every forced vertex survives
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { MarchingSquares } from "../../src/geom/MarchingSquares";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";

type Pt = { x: number; y: number; forced: boolean };

/** Walk the internal vertex ring (keeps the `forced` flag the public API hides). */
function ring(p: GeomPoly): Pt[] {
  const out: Pt[] = [];
  const head = (p as any).zpp_inner.vertices;
  if (head == null) return out;
  let v = head;
  do {
    out.push({ x: v.x, y: v.y, forced: v.forced });
    v = v.next;
  } while (v !== head);
  return out;
}

/** Build a GeomPoly and mark the vertices at `forcedIdx` as forced. */
function polyWithForced(pts: Array<[number, number]>, forcedIdx: number[]): GeomPoly {
  const p = new GeomPoly(pts.map(([x, y]) => new Vec2(x, y)));
  const head = (p as any).zpp_inner.vertices;
  let v = head;
  let i = 0;
  do {
    v.forced = forcedIdx.includes(i);
    v = v.next;
    i++;
  } while (v !== head);
  return p;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const key = (p: Pt) => `${p.x},${p.y}`;

function expectRdpContract(input: Pt[], output: Pt[], epsilon: number): void {
  expect(output.length).toBeGreaterThanOrEqual(2);
  expect(output.length).toBeLessThanOrEqual(input.length);

  // Subset of the input, in the same cyclic order.
  const index = new Map(input.map((p, i) => [key(p), i]));
  const idx = output.map((p) => index.get(key(p)));
  for (const i of idx) expect(i).not.toBeUndefined();
  let wraps = 0;
  for (let i = 0; i < idx.length; i++) {
    if (idx[(i + 1) % idx.length]! <= idx[i]!) wraps++;
  }
  expect(wraps).toBe(1);

  // Every input vertex lies within epsilon of the simplified outline.
  for (const p of input) {
    let best = Infinity;
    for (let i = 0; i < output.length; i++) {
      best = Math.min(best, distToSegment(p, output[i], output[(i + 1) % output.length]));
    }
    expect(best).toBeLessThanOrEqual(epsilon + 1e-9);
  }

  // Forced vertices survive.
  const kept = new Set(output.map(key));
  for (const p of input) if (p.forced) expect(kept.has(key(p))).toBe(true);
}

/** A wobbly circle: plenty of nearly-collinear vertices for RDP to drop. */
function wobble(n = 48, r = 40): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const rr = r + 1.5 * Math.sin(i * 1.7);
    out.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return out;
}

describe("GeomPoly.simplify — forced vertex seeding", () => {
  for (const epsilon of [0.5, 3, 12]) {
    it(`no forced vertices (epsilon ${epsilon})`, () => {
      const p = polyWithForced(wobble(), []);
      expectRdpContract(ring(p), ring(p.simplify(epsilon)), epsilon);
    });

    it(`exactly one forced vertex (epsilon ${epsilon})`, () => {
      for (const f of [0, 7, 30]) {
        const p = polyWithForced(wobble(), [f]);
        expectRdpContract(ring(p), ring(p.simplify(epsilon)), epsilon);
      }
    });

    it(`several forced vertices (epsilon ${epsilon})`, () => {
      const p = polyWithForced(wobble(), [3, 4, 20, 41]);
      expectRdpContract(ring(p), ring(p.simplify(epsilon)), epsilon);
    });
  }

  it("a huge epsilon still keeps every forced vertex", () => {
    const forced = [2, 11, 25, 26, 39];
    const p = polyWithForced(wobble(), forced);
    const out = ring(p.simplify(1e6));
    const input = ring(p);
    for (const f of forced) expect(out.map(key)).toContain(key(input[f]));
  });

  it("a single forced vertex is kept whichever extreme is farther from it", () => {
    // The one-forced seed pairs the forced vertex with whichever of the
    // min/max extremes is farther away; drive both sides of that choice.
    const rect: Array<[number, number]> = [
      [0, 0],
      [5, 0.2],
      [10, 0],
      [10, 5],
      [10, 10],
      [5, 9.8],
      [0, 10],
      [0, 5],
    ];
    for (let f = 0; f < rect.length; f++) {
      const p = polyWithForced(rect, [f]);
      expectRdpContract(ring(p), ring(p.simplify(0.5)), 0.5);
    }
  });
});

describe("GeomPoly.simplify — MarchingSquares subgrid seams", () => {
  it("vertices on subgrid seams are forced and survive simplification", () => {
    const iso = (x: number, y: number) => Math.hypot(x - 50, y - 50) - 38;
    const out = MarchingSquares.run(
      iso,
      new AABB(0, 0, 100, 100),
      new Vec2(2, 2),
      2,
      new Vec2(25, 25),
    );
    let forcedSeen = 0;
    for (let i = 0; i < out.length; i++) {
      const p = out.at(i);
      const input = ring(p);
      forcedSeen += input.filter((v) => v.forced).length;
      expectRdpContract(input, ring(p.simplify(4)), 4);
    }
    expect(forcedSeen).toBeGreaterThan(0);
  });
});
