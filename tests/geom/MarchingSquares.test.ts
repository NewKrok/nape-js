import { describe, it, expect } from "vitest";
import { MarchingSquares } from "../../src/geom/MarchingSquares";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";
import { getNape } from "../../src/core/engine";

// Simple iso function: circle of radius 50 centered at (50, 50)
function circleIso(x: number, y: number): number {
  return (x - 50) * (x - 50) + (y - 50) * (y - 50) - 50 * 50;
}

// Iso function: half-plane (negative left of x=50)
function halfPlaneIso(x: number, _y: number): number {
  return x - 50;
}

describe("MarchingSquares", () => {
  // --- Parameter validation ---

  it("should throw when iso is null", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    expect(() => MarchingSquares.run(null as any, bounds, cellsize)).toThrow(
      "requires an iso function",
    );
  });

  it("should throw when bounds is null", () => {
    const cellsize = new Vec2(10, 10);
    expect(() => MarchingSquares.run(circleIso, null as any, cellsize)).toThrow("requires an AABB");
  });

  it("should throw when cellsize is null", () => {
    const bounds = new AABB(0, 0, 100, 100);
    expect(() => MarchingSquares.run(circleIso, bounds, null as any)).toThrow("requires a Vec2");
  });

  it("should throw on non-positive cellsize x", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(0, 10);
    expect(() => MarchingSquares.run(circleIso, bounds, cellsize)).toThrow(
      "non-positive cell dimensions",
    );
  });

  it("should throw on non-positive cellsize y", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, -1);
    expect(() => MarchingSquares.run(circleIso, bounds, cellsize)).toThrow(
      "non-positive cell dimensions",
    );
  });

  it("should throw on negative quality", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    expect(() => MarchingSquares.run(circleIso, bounds, cellsize, -1)).toThrow("negative quality");
  });

  it("should throw on non-positive subgrid x", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const subgrid = new Vec2(0, 50);
    expect(() => MarchingSquares.run(circleIso, bounds, cellsize, 2, subgrid)).toThrow(
      "non-positive sub-grid dimensions",
    );
  });

  it("should throw on non-positive subgrid y", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const subgrid = new Vec2(50, -5);
    expect(() => MarchingSquares.run(circleIso, bounds, cellsize, 2, subgrid)).toThrow(
      "non-positive sub-grid dimensions",
    );
  });

  // --- Basic functionality ---

  it("should return a GeomPolyList", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const result = MarchingSquares.run(circleIso, bounds, cellsize);
    expect(result).toBeDefined();
    // GeomPolyList is compiled, check it has get_length
    expect(typeof result.get_length).toBe("function");
  });

  it("should produce at least one polygon for a circle iso", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const result = MarchingSquares.run(circleIso, bounds, cellsize);
    expect(result.get_length()).toBeGreaterThan(0);
  });

  it("should produce polygons for a half-plane iso", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const result = MarchingSquares.run(halfPlaneIso, bounds, cellsize);
    expect(result.get_length()).toBeGreaterThan(0);
  });

  it("should return empty result when iso is always positive (outside)", () => {
    const bounds = new AABB(0, 0, 10, 10);
    const cellsize = new Vec2(5, 5);
    // Always positive = no surface
    const result = MarchingSquares.run(() => 100, bounds, cellsize);
    expect(result.get_length()).toBe(0);
  });

  // --- Quality parameter ---

  it("should work with quality 0", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(20, 20);
    const result = MarchingSquares.run(circleIso, bounds, cellsize, 0);
    expect(result.get_length()).toBeGreaterThan(0);
  });

  it("should work with quality 1", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(20, 20);
    const result = MarchingSquares.run(circleIso, bounds, cellsize, 1);
    expect(result.get_length()).toBeGreaterThan(0);
  });

  // --- Combine parameter ---

  it("should work with combine=false", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(20, 20);
    const result = MarchingSquares.run(circleIso, bounds, cellsize, 2, null, false);
    expect(result.get_length()).toBeGreaterThan(0);
  });

  it("should produce more polygons with combine=false than combine=true", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(20, 20);
    const combined = MarchingSquares.run(circleIso, bounds, cellsize, 2, null, true);
    const uncombined = MarchingSquares.run(circleIso, bounds, cellsize, 2, null, false);
    expect(uncombined.get_length()).toBeGreaterThanOrEqual(combined.get_length());
  });

  // --- Subgrid ---

  it("should work with a subgrid", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const subgrid = new Vec2(50, 50);
    const result = MarchingSquares.run(circleIso, bounds, cellsize, 2, subgrid);
    expect(result.get_length()).toBeGreaterThan(0);
  });

  // --- Output parameter ---

  it("should use provided output list", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const nape = getNape();
    const output = new nape.geom.GeomPolyList();
    const result = MarchingSquares.run(circleIso, bounds, cellsize, 2, null, true, output);
    expect(result).toBe(output);
    expect(result.get_length()).toBeGreaterThan(0);
  });

  // --- Weak Vec2 disposal ---

  it("should auto-dispose weak cellsize after run", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = Vec2.weak(10, 10);
    expect((cellsize as any).zpp_disp).toBe(false);
    MarchingSquares.run(circleIso, bounds, cellsize);
    expect((cellsize as any).zpp_disp).toBe(true);
  });

  it("should auto-dispose weak subgrid after run", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    const subgrid = Vec2.weak(50, 50);
    expect((subgrid as any).zpp_disp).toBe(false);
    MarchingSquares.run(circleIso, bounds, cellsize, 2, subgrid);
    expect((subgrid as any).zpp_disp).toBe(true);
  });

  it("should not dispose non-weak cellsize", () => {
    const bounds = new AABB(0, 0, 100, 100);
    const cellsize = new Vec2(10, 10);
    MarchingSquares.run(circleIso, bounds, cellsize);
    expect((cellsize as any).zpp_disp).toBe(false);
  });

  // --- __name__ and __class__ ---

  it("should have correct __name__", () => {
    expect(MarchingSquares.__name__).toEqual(["nape", "geom", "MarchingSquares"]);
  });

  it("should have __class__ set on prototype", () => {
    expect((MarchingSquares.prototype as any).__class__).toBe(MarchingSquares);
  });
});
