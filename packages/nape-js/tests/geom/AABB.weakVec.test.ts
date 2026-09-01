import { describe, it, expect } from "vitest";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";

describe("AABB weak Vec2 setters", () => {
  it("accepts a weak Vec2 for min and disposes it", () => {
    const aabb = new AABB(0, 0, 100, 100);
    const weak = Vec2.weak(-10, -20);
    aabb.min = weak;
    expect(aabb.min.x).toBeCloseTo(-10);
    expect(aabb.min.y).toBeCloseTo(-20);
    expect((weak as any).zpp_disp).toBe(true);
  });

  it("accepts a weak Vec2 for max and disposes it", () => {
    const aabb = new AABB(0, 0, 100, 100);
    const weak = Vec2.weak(200, 300);
    aabb.max = weak;
    expect(aabb.max.x).toBeCloseTo(200);
    expect(aabb.max.y).toBeCloseTo(300);
    expect((weak as any).zpp_disp).toBe(true);
  });
});
