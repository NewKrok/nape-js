import { describe, it, expect } from "vitest";
import { AABB } from "../../src/geom/AABB";
import { ZPP_AABB } from "../../src/native/geom/ZPP_AABB";

describe("AABB", () => {
  // --- Constructor ---

  it("should construct with default values (0,0,0,0)", () => {
    const box = new AABB();
    expect(box.x).toBeCloseTo(0);
    expect(box.y).toBeCloseTo(0);
    expect(box.width).toBeCloseTo(0);
    expect(box.height).toBeCloseTo(0);
  });

  it("should construct with x, y, width, height", () => {
    const box = new AABB(10, 20, 100, 200);
    expect(box.x).toBeCloseTo(10);
    expect(box.y).toBeCloseTo(20);
    expect(box.width).toBeCloseTo(100);
    expect(box.height).toBeCloseTo(200);
  });

  it("should store correct min/max internally", () => {
    const box = new AABB(10, 20, 30, 40);
    expect(box.zpp_inner.minx).toBeCloseTo(10);
    expect(box.zpp_inner.miny).toBeCloseTo(20);
    expect(box.zpp_inner.maxx).toBeCloseTo(40); // 10 + 30
    expect(box.zpp_inner.maxy).toBeCloseTo(60); // 20 + 40
  });

  it("should throw on NaN position", () => {
    expect(() => new AABB(NaN, 0, 10, 10)).toThrow("position cannot be NaN");
    expect(() => new AABB(0, NaN, 10, 10)).toThrow("position cannot be NaN");
  });

  it("should throw on NaN dimensions", () => {
    expect(() => new AABB(0, 0, NaN, 10)).toThrow("dimensions cannot be NaN");
    expect(() => new AABB(0, 0, 10, NaN)).toThrow("dimensions cannot be NaN");
  });

  // --- x property ---

  it("should get/set x (shifting both minx and maxx)", () => {
    const box = new AABB(0, 0, 50, 50);
    box.x = 10;
    expect(box.x).toBeCloseTo(10);
    // Width should be preserved
    expect(box.width).toBeCloseTo(50);
    expect(box.zpp_inner.minx).toBeCloseTo(10);
    expect(box.zpp_inner.maxx).toBeCloseTo(60);
  });

  it("should throw on NaN x", () => {
    const box = new AABB(0, 0, 10, 10);
    expect(() => {
      box.x = NaN;
    }).toThrow("x cannot be NaN");
  });

  it("should not invalidate when setting same x", () => {
    const box = new AABB(5, 0, 10, 10);
    box.x = 5; // same value
    expect(box.x).toBeCloseTo(5);
  });

  // --- y property ---

  it("should get/set y (shifting both miny and maxy)", () => {
    const box = new AABB(0, 0, 50, 50);
    box.y = 20;
    expect(box.y).toBeCloseTo(20);
    // Height should be preserved
    expect(box.height).toBeCloseTo(50);
    expect(box.zpp_inner.miny).toBeCloseTo(20);
    expect(box.zpp_inner.maxy).toBeCloseTo(70);
  });

  it("should throw on NaN y", () => {
    const box = new AABB(0, 0, 10, 10);
    expect(() => {
      box.y = NaN;
    }).toThrow("y cannot be NaN");
  });

  // --- width property ---

  it("should get/set width", () => {
    const box = new AABB(0, 0, 50, 50);
    box.width = 100;
    expect(box.width).toBeCloseTo(100);
    // x (minx) should stay the same
    expect(box.x).toBeCloseTo(0);
    expect(box.zpp_inner.maxx).toBeCloseTo(100);
  });

  it("should throw on NaN width", () => {
    const box = new AABB(0, 0, 10, 10);
    expect(() => {
      box.width = NaN;
    }).toThrow("width cannot be NaN");
  });

  it("should throw on negative width", () => {
    const box = new AABB(0, 0, 10, 10);
    expect(() => {
      box.width = -5;
    }).toThrow("must be >= 0");
  });

  it("should allow zero width", () => {
    const box = new AABB(0, 0, 10, 10);
    box.width = 0;
    expect(box.width).toBeCloseTo(0);
  });

  // --- height property ---

  it("should get/set height", () => {
    const box = new AABB(0, 0, 50, 50);
    box.height = 200;
    expect(box.height).toBeCloseTo(200);
    // y (miny) should stay the same
    expect(box.y).toBeCloseTo(0);
    expect(box.zpp_inner.maxy).toBeCloseTo(200);
  });

  it("should throw on NaN height", () => {
    const box = new AABB(0, 0, 10, 10);
    expect(() => {
      box.height = NaN;
    }).toThrow("height cannot be NaN");
  });

  it("should throw on negative height", () => {
    const box = new AABB(0, 0, 10, 10);
    expect(() => {
      box.height = -5;
    }).toThrow("must be >= 0");
  });

  // --- copy ---

  it("should copy", () => {
    const a = new AABB(1, 2, 3, 4);
    const b = a.copy();
    expect(b.x).toBeCloseTo(1);
    expect(b.y).toBeCloseTo(2);
    expect(b.width).toBeCloseTo(3);
    expect(b.height).toBeCloseTo(4);
  });

  it("should produce independent copy", () => {
    const a = new AABB(1, 2, 3, 4);
    const b = a.copy();
    b.x = 99;
    expect(a.x).toBeCloseTo(1);
    expect(b.x).toBeCloseTo(99);
  });

  it("should copy as AABB instance", () => {
    const a = new AABB(1, 2, 3, 4);
    const b = a.copy();
    expect(b).toBeInstanceOf(AABB);
  });

  // --- toString ---

  it("should have toString", () => {
    const box = new AABB(0, 0, 10, 20);
    const str = box.toString();
    expect(str).toBeDefined();
    expect(str).toContain("x:");
    expect(str).toContain("y:");
    expect(str).toContain("w:");
    expect(str).toContain("h:");
  });

  it("should display correct values in toString", () => {
    const box = new AABB(5, 10, 30, 40);
    const str = box.toString();
    expect(str).toContain("5");
    expect(str).toContain("10");
    expect(str).toContain("30");
    expect(str).toContain("40");
  });

  // --- zpp_inner / _inner ---

  it("should have zpp_inner as ZPP_AABB instance", () => {
    const box = new AABB();
    expect(box.zpp_inner).toBeInstanceOf(ZPP_AABB);
  });

  it("should have _inner returning this", () => {
    const box = new AABB();
    expect(box._inner).toBe(box);
  });

  it("should have outer reference from zpp_inner back to wrapper", () => {
    const box = new AABB();
    expect(box.zpp_inner.outer).toBe(box);
  });

  // --- _wrap ---

  it("should wrap ZPP_AABB instance", () => {
    const box = new AABB(1, 2, 3, 4);
    const wrapped = AABB._wrap(box.zpp_inner);
    expect(wrapped).toBeInstanceOf(AABB);
    expect(wrapped.x).toBeCloseTo(1);
  });

  it("should return same instance for same zpp_inner", () => {
    const box = new AABB();
    const a = AABB._wrap(box.zpp_inner);
    const b = AABB._wrap(box.zpp_inner);
    expect(a).toBe(b);
  });

  it("should return instance directly when wrapping an AABB", () => {
    const box = new AABB();
    expect(AABB._wrap(box)).toBe(box);
  });

  it("should return null for null/undefined input", () => {
    expect(AABB._wrap(null)).toBeNull();
    expect(AABB._wrap(undefined)).toBeNull();
  });

  // --- Pool management ---

  it("should use pool when available", () => {
    // Create and discard to fill the pool
    const box1 = new AABB(1, 2, 3, 4);
    const inner1 = box1.zpp_inner;
    // Return to pool manually
    inner1.next = ZPP_AABB.zpp_pool;
    ZPP_AABB.zpp_pool = inner1;

    // Next AABB should reuse pooled instance
    const box2 = new AABB(10, 20, 30, 40);
    expect(box2.zpp_inner).toBe(inner1);
    expect(box2.x).toBeCloseTo(10);
    expect(box2.width).toBeCloseTo(30);
  });

  // --- Multiple property changes ---

  it("should handle sequential property changes correctly", () => {
    const box = new AABB(0, 0, 100, 100);
    box.x = 50;
    box.y = 50;
    box.width = 200;
    box.height = 200;
    expect(box.x).toBeCloseTo(50);
    expect(box.y).toBeCloseTo(50);
    expect(box.width).toBeCloseTo(200);
    expect(box.height).toBeCloseTo(200);
    expect(box.zpp_inner.minx).toBeCloseTo(50);
    expect(box.zpp_inner.miny).toBeCloseTo(50);
    expect(box.zpp_inner.maxx).toBeCloseTo(250);
    expect(box.zpp_inner.maxy).toBeCloseTo(250);
  });
});
