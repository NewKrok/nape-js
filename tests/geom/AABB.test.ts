import { describe, it, expect } from "vitest";
import { AABB } from "../../src/geom/AABB";

describe("AABB", () => {
  it("should construct with x, y, width, height", () => {
    const box = new AABB(10, 20, 100, 200);
    expect(box.x).toBeCloseTo(10);
    expect(box.y).toBeCloseTo(20);
    expect(box.width).toBeCloseTo(100);
    expect(box.height).toBeCloseTo(200);
  });

  it("should get/set x and y", () => {
    const box = new AABB(0, 0, 50, 50);
    box.x = 10;
    box.y = 20;
    expect(box.x).toBeCloseTo(10);
    expect(box.y).toBeCloseTo(20);
  });

  it("should get/set width and height", () => {
    const box = new AABB(0, 0, 50, 50);
    box.width = 100;
    box.height = 200;
    expect(box.width).toBeCloseTo(100);
    expect(box.height).toBeCloseTo(200);
  });

  it("should copy", () => {
    const a = new AABB(1, 2, 3, 4);
    const b = a.copy();
    b.x = 99;
    expect(a.x).toBeCloseTo(1);
    expect(b.x).toBeCloseTo(99);
  });

  it("should have toString", () => {
    const box = new AABB(0, 0, 10, 20);
    expect(box.toString()).toBeDefined();
  });
});
