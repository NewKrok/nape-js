import { describe, it, expect } from "vitest";
import { Vec2 } from "../../src/geom/Vec2";
import { Vec3 } from "../../src/geom/Vec3";
import { AABB } from "../../src/geom/AABB";
import { Ray } from "../../src/geom/Ray";
import { Mat23 } from "../../src/geom/Mat23";
import { MatMN } from "../../src/geom/MatMN";

// =============================================================================
// 31a — clone() methods
// =============================================================================

describe("clone()", () => {
  it("Vec2.clone() returns a new Vec2 with the same components", () => {
    const v = new Vec2(3, 4);
    const c = v.clone();
    expect(c.x).toBe(3);
    expect(c.y).toBe(4);
    expect(c).not.toBe(v);
  });

  it("Vec2.clone() does not produce a weak Vec2", () => {
    const v = new Vec2(1, 2);
    const c = v.clone();
    // Should not throw on second access (weak would auto-dispose)
    expect(c.x).toBe(1);
    expect(c.x).toBe(1);
  });

  it("Vec2.clone() throws on disposed Vec2", () => {
    const v = Vec2.get(1, 2);
    v.dispose();
    expect(() => v.clone()).toThrow(/disposed/);
  });

  it("Vec3.clone() returns a new Vec3 with the same components", () => {
    const v = new Vec3(1, 2, 3);
    const c = v.clone();
    expect(c.x).toBe(1);
    expect(c.y).toBe(2);
    expect(c.z).toBe(3);
    expect(c).not.toBe(v);
  });

  it("Vec3.clone() throws on disposed Vec3", () => {
    const v = Vec3.get(1, 2, 3);
    v.dispose();
    expect(() => v.clone()).toThrow(/disposed/);
  });

  it("AABB.clone() returns a new AABB with the same bounds", () => {
    const a = new AABB(10, 20, 30, 40);
    const c = a.clone();
    expect(c.x).toBe(10);
    expect(c.y).toBe(20);
    expect(c.width).toBe(30);
    expect(c.height).toBe(40);
    expect(c).not.toBe(a);
  });

  it("Ray.clone() returns a new Ray with the same properties", () => {
    const r = new Ray(new Vec2(1, 2), new Vec2(3, 4));
    r.maxDistance = 100;
    const c = r.clone();
    expect(c.origin.x).toBe(1);
    expect(c.origin.y).toBe(2);
    expect(c.direction.x).toBe(3);
    expect(c.direction.y).toBe(4);
    expect(c.maxDistance).toBe(100);
    expect(c).not.toBe(r);
  });

  it("Mat23.clone() returns a new Mat23 with the same components", () => {
    const m = new Mat23(2, 3, 4, 5, 6, 7);
    const c = m.clone();
    expect(c.a).toBe(2);
    expect(c.b).toBe(3);
    expect(c.c).toBe(4);
    expect(c.d).toBe(5);
    expect(c.tx).toBe(6);
    expect(c.ty).toBe(7);
    expect(c).not.toBe(m);
  });

  it("MatMN.clone() returns a new MatMN with the same dimensions and values", () => {
    const m = new MatMN(2, 3);
    m.setx(0, 0, 1);
    m.setx(0, 1, 2);
    m.setx(0, 2, 3);
    m.setx(1, 0, 4);
    m.setx(1, 1, 5);
    m.setx(1, 2, 6);
    const c = m.clone();
    expect(c.rows).toBe(2);
    expect(c.cols).toBe(3);
    expect(c.x(0, 0)).toBe(1);
    expect(c.x(0, 1)).toBe(2);
    expect(c.x(0, 2)).toBe(3);
    expect(c.x(1, 0)).toBe(4);
    expect(c.x(1, 1)).toBe(5);
    expect(c.x(1, 2)).toBe(6);
    expect(c).not.toBe(m);
  });

  it("MatMN.clone() is independent of original", () => {
    const m = new MatMN(2, 2);
    m.setx(0, 0, 10);
    const c = m.clone();
    c.setx(0, 0, 99);
    expect(m.x(0, 0)).toBe(10);
    expect(c.x(0, 0)).toBe(99);
  });
});

// =============================================================================
// 31b — equals() methods
// =============================================================================

describe("equals()", () => {
  describe("Vec2.equals()", () => {
    it("returns true for identical components", () => {
      const a = new Vec2(3, 4);
      const b = new Vec2(3, 4);
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different components", () => {
      const a = new Vec2(3, 4);
      const b = new Vec2(3, 5);
      expect(a.equals(b)).toBe(false);
    });

    it("returns true within epsilon", () => {
      const a = new Vec2(1.0, 2.0);
      const b = new Vec2(1.005, 2.003);
      expect(a.equals(b, 0.01)).toBe(true);
    });

    it("returns false outside epsilon", () => {
      const a = new Vec2(1.0, 2.0);
      const b = new Vec2(1.02, 2.0);
      expect(a.equals(b, 0.01)).toBe(false);
    });

    it("returns false for null", () => {
      const v = new Vec2(1, 2);
      expect(v.equals(null as any)).toBe(false);
    });

    it("throws on disposed this", () => {
      const v = Vec2.get(1, 2);
      v.dispose();
      expect(() => v.equals(new Vec2())).toThrow(/disposed/);
    });

    it("throws on disposed other", () => {
      const a = new Vec2(1, 2);
      const b = Vec2.get(3, 4);
      b.dispose();
      expect(() => a.equals(b)).toThrow(/disposed/);
    });
  });

  describe("Vec2.eq() static", () => {
    it("returns true for equal vectors", () => {
      expect(Vec2.eq(new Vec2(5, 6), new Vec2(5, 6))).toBe(true);
    });

    it("returns false for unequal vectors", () => {
      expect(Vec2.eq(new Vec2(5, 6), new Vec2(5, 7))).toBe(false);
    });

    it("supports epsilon", () => {
      expect(Vec2.eq(new Vec2(1, 2), new Vec2(1.005, 2.003), 0.01)).toBe(true);
    });

    it("returns true for both null", () => {
      expect(Vec2.eq(null as any, null as any)).toBe(true);
    });

    it("returns false for one null", () => {
      expect(Vec2.eq(new Vec2(1, 2), null as any)).toBe(false);
      expect(Vec2.eq(null as any, new Vec2(1, 2))).toBe(false);
    });

    it("throws on disposed argument", () => {
      const a = Vec2.get(1, 2);
      a.dispose();
      expect(() => Vec2.eq(a, new Vec2())).toThrow(/disposed/);
    });
  });

  describe("Vec3.equals()", () => {
    it("returns true for identical components", () => {
      const a = new Vec3(1, 2, 3);
      const b = new Vec3(1, 2, 3);
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different z", () => {
      const a = new Vec3(1, 2, 3);
      const b = new Vec3(1, 2, 4);
      expect(a.equals(b)).toBe(false);
    });

    it("supports epsilon", () => {
      const a = new Vec3(1, 2, 3);
      const b = new Vec3(1.005, 2.003, 3.009);
      expect(a.equals(b, 0.01)).toBe(true);
    });

    it("returns false for null", () => {
      expect(new Vec3(1, 2, 3).equals(null as any)).toBe(false);
    });
  });

  describe("AABB.equals()", () => {
    it("returns true for identical bounds", () => {
      const a = new AABB(10, 20, 30, 40);
      const b = new AABB(10, 20, 30, 40);
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different bounds", () => {
      const a = new AABB(10, 20, 30, 40);
      const b = new AABB(10, 20, 31, 40);
      expect(a.equals(b)).toBe(false);
    });

    it("supports epsilon", () => {
      const a = new AABB(10, 20, 30, 40);
      // maxx = 40, maxy = 60 vs maxx = 40.005, maxy = 60.006
      const b = new AABB(10.003, 20.004, 30.002, 40.002);
      expect(a.equals(b, 0.01)).toBe(true);
    });

    it("returns false for null", () => {
      expect(new AABB(0, 0, 10, 10).equals(null as any)).toBe(false);
    });
  });

  describe("Mat23.equals()", () => {
    it("returns true for identical matrices", () => {
      const a = new Mat23(2, 3, 4, 5, 6, 7);
      const b = new Mat23(2, 3, 4, 5, 6, 7);
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different matrices", () => {
      const a = new Mat23(2, 3, 4, 5, 6, 7);
      const b = new Mat23(2, 3, 4, 5, 6, 8);
      expect(a.equals(b)).toBe(false);
    });

    it("supports epsilon", () => {
      const a = new Mat23(1, 0, 0, 1, 0, 0);
      const b = new Mat23(1.001, 0.001, 0.001, 1.001, 0.001, 0.001);
      expect(a.equals(b, 0.01)).toBe(true);
    });

    it("returns false for null", () => {
      expect(new Mat23().equals(null as any)).toBe(false);
    });
  });

  describe("MatMN.equals()", () => {
    it("returns true for identical matrices", () => {
      const a = new MatMN(2, 2);
      a.setx(0, 0, 1);
      a.setx(0, 1, 2);
      a.setx(1, 0, 3);
      a.setx(1, 1, 4);
      const b = new MatMN(2, 2);
      b.setx(0, 0, 1);
      b.setx(0, 1, 2);
      b.setx(1, 0, 3);
      b.setx(1, 1, 4);
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different dimensions", () => {
      const a = new MatMN(2, 2);
      const b = new MatMN(2, 3);
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for different values", () => {
      const a = new MatMN(2, 2);
      a.setx(0, 0, 1);
      const b = new MatMN(2, 2);
      b.setx(0, 0, 2);
      expect(a.equals(b)).toBe(false);
    });

    it("supports epsilon", () => {
      const a = new MatMN(1, 2);
      a.setx(0, 0, 1.0);
      a.setx(0, 1, 2.0);
      const b = new MatMN(1, 2);
      b.setx(0, 0, 1.005);
      b.setx(0, 1, 2.009);
      expect(a.equals(b, 0.01)).toBe(true);
    });

    it("returns false for null", () => {
      expect(new MatMN(2, 2).equals(null as any)).toBe(false);
    });
  });
});

// =============================================================================
// 31c — Utility statics
// =============================================================================

describe("Vec2.fromAngle()", () => {
  it("returns a unit vector at the given angle", () => {
    const v = Vec2.fromAngle(0);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
  });

  it("returns correct vector at 90 degrees", () => {
    const v = Vec2.fromAngle(Math.PI / 2);
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(1);
  });

  it("returns correct vector at 45 degrees", () => {
    const v = Vec2.fromAngle(Math.PI / 4);
    expect(v.x).toBeCloseTo(Math.SQRT2 / 2);
    expect(v.y).toBeCloseTo(Math.SQRT2 / 2);
  });

  it("supports weak parameter", () => {
    const v = Vec2.fromAngle(0, true);
    expect(v.x).toBeCloseTo(1);
    // weak vec2 should still work for first access
  });

  it("throws for NaN angle", () => {
    expect(() => Vec2.fromAngle(NaN)).toThrow(/NaN/);
  });
});

describe("Vec2.lerp()", () => {
  it("returns a at t=0", () => {
    const a = new Vec2(0, 0);
    const b = new Vec2(10, 20);
    const r = Vec2.lerp(a, b, 0);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it("returns b at t=1", () => {
    const a = new Vec2(0, 0);
    const b = new Vec2(10, 20);
    const r = Vec2.lerp(a, b, 1);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
  });

  it("returns midpoint at t=0.5", () => {
    const a = new Vec2(0, 0);
    const b = new Vec2(10, 20);
    const r = Vec2.lerp(a, b, 0.5);
    expect(r.x).toBeCloseTo(5);
    expect(r.y).toBeCloseTo(10);
  });

  it("supports extrapolation (t > 1)", () => {
    const a = new Vec2(0, 0);
    const b = new Vec2(10, 0);
    const r = Vec2.lerp(a, b, 2);
    expect(r.x).toBeCloseTo(20);
    expect(r.y).toBeCloseTo(0);
  });

  it("throws for null arguments", () => {
    expect(() => Vec2.lerp(null as any, new Vec2(), 0.5)).toThrow(/null/);
    expect(() => Vec2.lerp(new Vec2(), null as any, 0.5)).toThrow(/null/);
  });

  it("throws for NaN t", () => {
    expect(() => Vec2.lerp(new Vec2(), new Vec2(), NaN)).toThrow(/NaN/);
  });

  it("throws for disposed arguments", () => {
    const a = Vec2.get(1, 2);
    a.dispose();
    expect(() => Vec2.lerp(a, new Vec2(), 0.5)).toThrow(/disposed/);
  });
});

describe("AABB.fromPoints()", () => {
  it("creates bounding box from a single point", () => {
    const a = AABB.fromPoints([new Vec2(5, 10)]);
    expect(a.x).toBe(5);
    expect(a.y).toBe(10);
    expect(a.width).toBe(0);
    expect(a.height).toBe(0);
  });

  it("creates bounding box from multiple points", () => {
    const a = AABB.fromPoints([new Vec2(1, 2), new Vec2(5, 8), new Vec2(3, -1), new Vec2(-2, 4)]);
    expect(a.x).toBe(-2);
    expect(a.y).toBe(-1);
    expect(a.width).toBeCloseTo(7);
    expect(a.height).toBeCloseTo(9);
  });

  it("handles collinear points", () => {
    const a = AABB.fromPoints([new Vec2(0, 0), new Vec2(10, 0), new Vec2(5, 0)]);
    expect(a.x).toBe(0);
    expect(a.y).toBe(0);
    expect(a.width).toBe(10);
    expect(a.height).toBe(0);
  });

  it("throws for empty array", () => {
    expect(() => AABB.fromPoints([])).toThrow(/at least one point/);
  });

  it("throws for null array", () => {
    expect(() => AABB.fromPoints(null as any)).toThrow(/at least one point/);
  });

  it("throws for null point in array", () => {
    expect(() => AABB.fromPoints([new Vec2(1, 2), null as any])).toThrow(/null/);
  });

  it("throws for disposed Vec2 in array", () => {
    const v = Vec2.get(1, 2);
    v.dispose();
    expect(() => AABB.fromPoints([v])).toThrow(/disposed/);
  });
});
