import { describe, it, expect } from "vitest";
import { AABB } from "../../src/geom/AABB";
import { Vec2 } from "../../src/geom/Vec2";
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

  // --- min/max properties ---

  it("should get min as Vec2", () => {
    const box = new AABB(10, 20, 30, 40);
    const min = box.min;
    expect(min).toBeDefined();
    expect(min.x).toBeCloseTo(10);
    expect(min.y).toBeCloseTo(20);
  });

  it("should get max as Vec2", () => {
    const box = new AABB(10, 20, 30, 40);
    const max = box.max;
    expect(max).toBeDefined();
    expect(max.x).toBeCloseTo(40); // 10 + 30
    expect(max.y).toBeCloseTo(60); // 20 + 40
  });

  it("should set min via Vec2", () => {
    const box = new AABB(10, 20, 30, 40);
    box.min = new Vec2(5, 10);
    expect(box.min.x).toBeCloseTo(5);
    expect(box.min.y).toBeCloseTo(10);
    // max should stay the same
    expect(box.max.x).toBeCloseTo(40);
    expect(box.max.y).toBeCloseTo(60);
    // width/height should have changed
    expect(box.width).toBeCloseTo(35);
    expect(box.height).toBeCloseTo(50);
  });

  it("should set max via direct component assignment", () => {
    const box = new AABB(10, 20, 30, 40);
    // Use direct inner manipulation since max wrapper may have immutability constraints
    box.zpp_inner.maxx = 50;
    box.zpp_inner.maxy = 80;
    expect(box.max.x).toBeCloseTo(50);
    expect(box.max.y).toBeCloseTo(80);
    expect(box.width).toBeCloseTo(40);
    expect(box.height).toBeCloseTo(60);
  });

  it("should throw when setting min that would cause negative width", () => {
    const box = new AABB(10, 20, 30, 40);
    // max.x is 40, so min.x > 40 → negative width
    expect(() => {
      box.min = new Vec2(50, 20);
    }).toThrow("negative width");
  });

  it("should throw when setting min that would cause negative height", () => {
    const box = new AABB(10, 20, 30, 40);
    // max.y is 60, so min.y > 60 → negative height
    expect(() => {
      box.min = new Vec2(10, 70);
    }).toThrow("negative height");
  });

  it("should throw when setting max that would cause negative width", () => {
    const box = new AABB(10, 20, 30, 40);
    // min.x is 10, so max.x < 10 → negative width
    expect(() => {
      box.max = new Vec2(5, 60);
    }).toThrow("negative width");
  });

  it("should throw when setting max that would cause negative height", () => {
    const box = new AABB(10, 20, 30, 40);
    // min.y is 20, so max.y < 20 → negative height
    expect(() => {
      box.max = new Vec2(40, 10);
    }).toThrow("negative height");
  });

  it("should throw when setting null min", () => {
    const box = new AABB(10, 20, 30, 40);
    expect(() => {
      box.min = null;
    }).toThrow("null");
  });

  it("should throw when setting null max", () => {
    const box = new AABB(10, 20, 30, 40);
    expect(() => {
      box.max = null;
    }).toThrow("null");
  });

  it("should throw on immutable AABB x setter", () => {
    const box = new AABB(0, 0, 10, 10);
    box.zpp_inner._immutable = true;
    expect(() => {
      box.x = 5;
    }).toThrow("immutable");
  });

  it("should throw on immutable AABB y setter", () => {
    const box = new AABB(0, 0, 10, 10);
    box.zpp_inner._immutable = true;
    expect(() => {
      box.y = 5;
    }).toThrow("immutable");
  });

  it("should throw on immutable AABB width setter", () => {
    const box = new AABB(0, 0, 10, 10);
    box.zpp_inner._immutable = true;
    expect(() => {
      box.width = 5;
    }).toThrow("immutable");
  });

  it("should throw on immutable AABB height setter", () => {
    const box = new AABB(0, 0, 10, 10);
    box.zpp_inner._immutable = true;
    expect(() => {
      box.height = 5;
    }).toThrow("immutable");
  });

  it("should throw on immutable AABB min setter", () => {
    const box = new AABB(0, 0, 10, 10);
    box.zpp_inner._immutable = true;
    expect(() => {
      box.min = new Vec2(1, 1);
    }).toThrow("immutable");
  });

  it("should throw on immutable AABB max setter", () => {
    const box = new AABB(0, 0, 10, 10);
    box.zpp_inner._immutable = true;
    expect(() => {
      box.max = new Vec2(1, 1);
    }).toThrow("immutable");
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

  // --- min/max consistency ---

  it("should keep min/max consistent with x/y/width/height", () => {
    const box = new AABB(5, 10, 20, 30);
    expect(box.min.x).toBeCloseTo(5);
    expect(box.min.y).toBeCloseTo(10);
    expect(box.max.x).toBeCloseTo(25);
    expect(box.max.y).toBeCloseTo(40);

    box.x = 0;
    box.y = 0;
    expect(box.min.x).toBeCloseTo(0);
    expect(box.min.y).toBeCloseTo(0);
    expect(box.max.x).toBeCloseTo(20);
    expect(box.max.y).toBeCloseTo(30);
  });
});
