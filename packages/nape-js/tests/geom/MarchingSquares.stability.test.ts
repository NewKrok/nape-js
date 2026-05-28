/**
 * ZPP_MarchingSquares — numerical-stability coverage.
 *
 * Targets the issue #165 scenarios that MarchingSquares.extended.test.ts does
 * NOT cover: bilinear interpolation under near-zero gradient, iso functions
 * that cross sign exactly at a grid corner, and per-quality output consistency.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { MarchingSquares } from "../../src/geom/MarchingSquares";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";

// ---------------------------------------------------------------------------
// Bilinear interpolation stability
// ---------------------------------------------------------------------------

describe("MarchingSquares — bilinear stability", () => {
  it("handles near-zero-gradient iso without producing NaN vertices", () => {
    // Iso value that varies by only ~1e-12 across the bounds.
    const iso = (x: number, y: number) => 1e-12 * (x + y) - 5e-13;
    const result = MarchingSquares.run(iso, new AABB(0, 0, 100, 100), new Vec2(10, 10));
    // Whether or not pieces are produced, every vertex must be finite.
    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i);
      const it = poly.iterator();
      while (it.hasNext()) {
        const v = it.next();
        expect(Number.isFinite(v.x)).toBe(true);
        expect(Number.isFinite(v.y)).toBe(true);
      }
    }
  });

  it("handles iso that flips sign exactly at grid corners", () => {
    // Cells are 10×10 aligned with origin — circle radius 30 centered at (50,50)
    // touches grid corners at (20,50), (80,50), (50,20), (50,80).
    const iso = (x: number, y: number) => (x - 50) * (x - 50) + (y - 50) * (y - 50) - 30 * 30;
    const result = MarchingSquares.run(iso, new AABB(0, 0, 100, 100), new Vec2(10, 10));
    expect(result.length).toBeGreaterThan(0);
    // Each resulting polygon must have finite, non-degenerate vertices.
    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i);
      expect(Math.abs(poly.area())).toBeGreaterThan(0);
    }
  });

  it("handles a single saddle-point cell without crashing", () => {
    // Iso with positive corners NW & SE, negative NE & SW — classic saddle.
    const iso = (x: number, y: number) => (x - 50) * (y - 50) - 25;
    const result = MarchingSquares.run(iso, new AABB(0, 0, 100, 100), new Vec2(10, 10));
    expect(result.length).toBeGreaterThan(0);
    for (let i = 0; i < result.length; i++) {
      const poly = result.at(i);
      const it = poly.iterator();
      while (it.hasNext()) {
        const v = it.next();
        expect(Number.isFinite(v.x)).toBe(true);
        expect(Number.isFinite(v.y)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Quality consistency — higher quality must not lose the shape
// ---------------------------------------------------------------------------

describe("MarchingSquares — quality monotonicity", () => {
  const circleIso = (x: number, y: number) => (x - 50) * (x - 50) + (y - 50) * (y - 50) - 25 * 25;

  it("higher quality on the same iso produces output covering the shape", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const q0 = MarchingSquares.run(circleIso, bounds, cellsize, 0);
    const q4 = MarchingSquares.run(circleIso, bounds, cellsize, 4);

    // Both must yield a polygon for the same shape.
    expect(q0.length).toBeGreaterThan(0);
    expect(q4.length).toBeGreaterThan(0);

    // Areas should be within an order of magnitude of the true area (π·25²≈1963)
    // and quality 4 should not be wildly worse than quality 0.
    let a0 = 0;
    let a4 = 0;
    for (let i = 0; i < q0.length; i++) a0 += Math.abs(q0.at(i).area());
    for (let i = 0; i < q4.length; i++) a4 += Math.abs(q4.at(i).area());
    expect(a0).toBeGreaterThan(1000);
    expect(a4).toBeGreaterThan(1000);
    expect(a0).toBeLessThan(3000);
    expect(a4).toBeLessThan(3000);
  });
});

// ---------------------------------------------------------------------------
// Grid subdivision — subgrid bounds at exactly one cell
// ---------------------------------------------------------------------------

describe("MarchingSquares — subgrid edge cases", () => {
  it("subgrid exactly equal to the full bounds produces same result as no subgrid", () => {
    const iso = (x: number, y: number) => (x - 50) * (x - 50) + (y - 50) * (y - 50) - 20 * 20;
    const noSub = MarchingSquares.run(iso, new AABB(0, 0, 100, 100), new Vec2(5, 5));
    const equalSub = MarchingSquares.run(
      iso,
      new AABB(0, 0, 100, 100),
      new Vec2(5, 5),
      2,
      new Vec2(100, 100),
    );
    // Both must produce pieces whose combined area is equal within rounding.
    let a1 = 0;
    let a2 = 0;
    for (let i = 0; i < noSub.length; i++) a1 += Math.abs(noSub.at(i).area());
    for (let i = 0; i < equalSub.length; i++) a2 += Math.abs(equalSub.at(i).area());
    expect(Math.abs(a1 - a2)).toBeLessThan(5);
  });

  it("subgrid smaller than one cell still yields output", () => {
    const iso = (x: number, y: number) => (x - 50) * (x - 50) + (y - 50) * (y - 50) - 20 * 20;
    const result = MarchingSquares.run(
      iso,
      new AABB(0, 0, 100, 100),
      new Vec2(10, 10),
      2,
      new Vec2(5, 5),
    );
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Degenerate iso surfaces
// ---------------------------------------------------------------------------

describe("MarchingSquares — degenerate iso surfaces", () => {
  it("always-zero iso (flat surface on threshold) does not crash", () => {
    const result = MarchingSquares.run(() => 0, new AABB(0, 0, 100, 100), new Vec2(10, 10));
    // Output is implementation-defined; just verify no crash and finite vertices.
    for (let i = 0; i < result.length; i++) {
      const it = result.at(i).iterator();
      while (it.hasNext()) {
        const v = it.next();
        expect(Number.isFinite(v.x)).toBe(true);
        expect(Number.isFinite(v.y)).toBe(true);
      }
    }
  });

  it("always-negative iso (entirely inside) does not crash", () => {
    const result = MarchingSquares.run(() => -1, new AABB(0, 0, 100, 100), new Vec2(10, 10));
    // Output is implementation-defined; just verify no crash.
    for (let i = 0; i < result.length; i++) {
      expect(Number.isFinite(result.at(i).area())).toBe(true);
    }
  });
});
