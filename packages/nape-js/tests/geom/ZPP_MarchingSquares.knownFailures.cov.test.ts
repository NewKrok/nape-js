/**
 * ZPP_MarchingSquares — pinned known failures (it.fails).
 *
 * Each test runs on a fresh engine instance (vi.resetModules + dynamic
 * import), because a crash inside MarchingSquares.run can leave pooled
 * vertices behind that corrupt later runs (see the second test).
 *
 * The iso fields are bilinear interpolations of lattice values, as in
 * ZPP_MarchingSquares.lattice.cov.test.ts.
 */

import { describe, it, expect, vi } from "vitest";

async function freshEngine() {
  vi.resetModules();
  await import("../../src/index");
  const { MarchingSquares } = await import("../../src/geom/MarchingSquares");
  const { AABB } = await import("../../src/geom/AABB");
  const { Vec2 } = await import("../../src/geom/Vec2");
  /** Run over [0,n]^2 with unit cells; returns the total piece area. */
  return (iso: (x: number, y: number) => number, n: number, quality: number, combine: boolean) => {
    const list = MarchingSquares.run(
      iso,
      new AABB(0, 0, n, n),
      new Vec2(1, 1),
      quality,
      null,
      combine,
    );
    let a = 0;
    for (let i = 0; i < list.length; i++) a += Math.abs(list.at(i).area());
    return a;
  };
}

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

describe("ZPP_MarchingSquares — known failures", () => {
  // 2x2 cells, all -1 except the centre (-1e-20) and the bottom-middle (+1):
  // a notch from the bottom edge up to the centre. Expected: one polygon,
  // the 2x2 square minus the notch triangle (0.5,2),(1,1),(1.5,2), area
  // 3.5 (+ O(1e-20)) — exactly what a centre value of 0 gives. Actual, with
  // combine=true: "Cannot set properties of null (setting 'prev')" in
  // ZPP_MarchingSquares.combUD. The tiny value puts the crossings on the
  // centre corner, the cell polygons lose those vertices, and the combine
  // step then links through a vertex that is no longer in the ring.
  // combine=false handles the same field correctly.
  it.fails("tiny negative corner value next to a notch (combine=true)", async () => {
    const run = await freshEngine();
    const iso = latticeIso([
      [-1, -1, -1],
      [-1, -1e-20, -1],
      [-1, 1, -1],
    ]);
    expect(run(iso, 2, 0, true)).toBeCloseTo(3.5, 9);
  });

  it("control: the same field with combine=false, and with a 0 centre, is fine", async () => {
    const run = await freshEngine();
    expect(
      run(
        latticeIso([
          [-1, -1, -1],
          [-1, -1e-20, -1],
          [-1, 1, -1],
        ]),
        2,
        0,
        false,
      ),
    ).toBeCloseTo(3.5, 9);
    expect(
      run(
        latticeIso([
          [-1, -1, -1],
          [-1, 0, -1],
          [-1, 1, -1],
        ]),
        2,
        0,
        true,
      ),
    ).toBeCloseTo(3.5, 9);
  });

  // After the crash above (on a larger field), the next, unrelated run in the
  // same process silently returns the wrong area: the half-built cell rings
  // are left in the vertex pool. Expected: 14.458333..., as on a fresh
  // engine; actual: 14.041666...
  it.fails("a crashed run does not corrupt the next run", async () => {
    const run = await freshEngine();
    const checker = latticeIso([
      [0, 2, -1, 1, 0, 2, -1],
      [2, 0, 0, -2, 1, -2, 2],
      [-2, 0, -1, 2, -1, 0, -1],
      [1, -1, 2, -1, 2, -1, 0],
      [-2, 1, -2, 2, 0, 2, -1],
      [1, 0, 1, -2, 0, -1, 2],
      [-1, 2, 0, 2, -1, 0, -2],
    ]);
    const expected = run(checker, 6, 2, false);
    expect(expected).toBeCloseTo(14.458333333333334, 9);
    const crashing = latticeIso([
      [1, 2, 0, -1e-20, 1, -1],
      [1e-20, -1, -1e-20, 2, -2, -2],
      [2, -1e-20, -1e-20, -1, 2, 0],
      [1, -1e-20, 2, 2, -1, -2],
      [-1, 0, -2, -1, 2, 1],
      [-1, 0, -1e-20, 2, -1, 1e-20],
    ]);
    expect(() => run(crashing, 5, 0, true)).toThrow();
    expect(run(checker, 6, 2, false)).toBeCloseTo(expected, 9);
  });
});
