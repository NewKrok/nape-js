/**
 * GeomPoly monotone / convex / triangular decomposition on weakly simple input.
 *
 * A weakly simple ring revisits vertices: a hole bridged to the outer
 * boundary (a "keyhole"), or MarchingSquares' combined output, which does
 * exactly that for every enclosed hole. ZPP_Monotone orders vertices by
 * (y, x), and two copies of the same vertex tie; the tie is broken by each
 * copy's angle bisector. No existing suite fed a revisiting ring to the
 * partitioners, so that tie-breaker never ran.
 *
 * Oracle, per decomposition: the pieces are pairwise disjoint, cover exactly
 * the input region (for a weakly simple ring the even-odd and nonzero
 * regions agree), and each piece has the promised shape (y-monotone /
 * convex / triangle).
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { MarchingSquares } from "../../src/geom/MarchingSquares";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";

type Pt = [number, number];
type Kind = "monotone" | "convex" | "triangular";

function ring(p: any): Pt[] {
  const out: Pt[] = [];
  const it = p.iterator();
  while (it.hasNext()) {
    const v = it.next();
    out.push([v.x, v.y]);
  }
  return out;
}

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

function decompose(p: GeomPoly, kind: Kind, delaunay = false): any {
  if (kind === "monotone") return p.monotoneDecomposition();
  if (kind === "convex") return p.convexDecomposition(delaunay);
  return p.triangularDecomposition(delaunay);
}

function checkDecomposition(input: Pt[], kind: Kind, delaunay = false, samples = 150): void {
  const out = decompose(new GeomPoly(input.map(([x, y]) => new Vec2(x, y))), kind, delaunay);
  expect(out.length).toBeGreaterThan(0);
  const pieces: Pt[][] = [];
  for (let i = 0; i < out.length; i++) {
    const q = out.at(i);
    if (kind === "monotone") expect(q.isMonotone()).toBe(true);
    if (kind === "convex") expect(q.isConvex()).toBe(true);
    if (kind === "triangular") expect(q.size()).toBe(3);
    pieces.push(ring(q));
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
      const x = x0 + ((i + 0.5137) / samples) * w;
      const y = y0 + ((j + 0.5071) / samples) * h;
      const inside = winding(input, x, y) !== 0;
      let covered = 0;
      for (const p of pieces) if (winding(p, x, y) !== 0) covered++;
      if (covered > 1) overlap++;
      if (covered > 0 !== inside) wrong++;
    }
  }
  expect(overlap, "pieces overlap").toBe(0);
  expect(wrong, "pieces differ from the input region").toBe(0);
}

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

/** Two holes bridged from opposite sides; the bridges share a y value. */
const doubleKeyhole: Pt[] = [
  [0, 0],
  [20, 0],
  [20, 5],
  [16, 5],
  [16, 3],
  [13, 3],
  [13, 7],
  [16, 7],
  [16, 5],
  [20, 5],
  [20, 10],
  [0, 10],
  [0, 5],
  [4, 5],
  [4, 7],
  [7, 7],
  [7, 3],
  [4, 3],
  [4, 5],
  [0, 5],
];

/** MarchingSquares' combined output for a saddle lattice (`cells`² cells). */
function latticeRing(cells: number): Pt[] {
  const k = 4;
  const period = Math.PI * k;
  const W = period * cells;
  const out = MarchingSquares.run(
    (x, y) => Math.sin(x / k) * Math.sin(y / k) - 0.05,
    new AABB(-period / 2, -period / 2, W, W),
    new Vec2(period, period),
    3,
  );
  expect(out.length).toBe(1);
  return ring(out.at(0));
}

describe("decompositions of a keyhole ring", () => {
  it("the keyhole is weakly simple", () => {
    const p = new GeomPoly(keyhole.map(([x, y]) => new Vec2(x, y)));
    expect(p.isSimple()).toBe(false);
  });

  for (const kind of ["monotone", "convex", "triangular"] as const) {
    it(`${kind} decomposition covers the ring minus its hole`, () => {
      checkDecomposition(keyhole, kind);
    });

    it(`${kind} decomposition of a double keyhole`, () => {
      checkDecomposition(doubleKeyhole, kind);
    });
  }

  it("delaunay-optimised convex and triangular decompositions", () => {
    checkDecomposition(keyhole, "convex", true);
    checkDecomposition(keyhole, "triangular", true);
    checkDecomposition(doubleKeyhole, "triangular", true);
  });
});

describe("decompositions of MarchingSquares combined output", () => {
  for (const cells of [2, 3, 6]) {
    it(`monotone and convex decomposition of a ${cells}×${cells} saddle lattice`, () => {
      const pts = latticeRing(cells);
      checkDecomposition(pts, "monotone");
      checkDecomposition(pts, "convex");
      checkDecomposition(pts, "convex", true);
    });
  }

  for (const cells of [2, 3]) {
    it(`triangular decomposition of a ${cells}×${cells} saddle lattice`, () => {
      const pts = latticeRing(cells);
      checkDecomposition(pts, "triangular");
      checkDecomposition(pts, "triangular", true);
    });
  }

  // Known bug: on the 6×6 lattice (116 vertices, 8 bridged holes) the
  // triangulator leaves several 8–12 vertex pieces untriangulated and the
  // pieces overlap. Triangulating each monotone piece on its own works, so
  // the fault is in triangulating partitions that still share the ring's
  // duplicated seam vertices. Flip to `it` once fixed.
  it.fails("triangular decomposition of a 6×6 saddle lattice", () => {
    checkDecomposition(latticeRing(6), "triangular");
  });

  it("triangulating each monotone piece separately is exact on the 6×6 lattice", () => {
    const pts = latticeRing(6);
    const mono = new GeomPoly(pts.map(([x, y]) => new Vec2(x, y))).monotoneDecomposition();
    for (let i = 0; i < mono.length; i++) checkDecomposition(ring(mono.at(i)), "triangular");
  });
});
