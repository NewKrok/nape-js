import { describe, it, expect } from "vitest";
import { Vec3 } from "../../src/geom/Vec3";
import { Vec2 } from "../../src/geom/Vec2";

describe("Vec3", () => {
  // --- Construction ---

  it("should construct with default values", () => {
    const v = new Vec3();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  it("should construct with given values", () => {
    const v = new Vec3(1, 2, 3);
    expect(v.x).toBe(1);
    expect(v.y).toBe(2);
    expect(v.z).toBe(3);
  });

  // --- Get/set properties ---

  it("should get/set x, y, z", () => {
    const v = new Vec3();
    v.x = 10;
    v.y = 20;
    v.z = 30;
    expect(v.x).toBe(10);
    expect(v.y).toBe(20);
    expect(v.z).toBe(30);
  });

  // --- Length ---

  it("should compute length", () => {
    const v = new Vec3(2, 3, 6);
    expect(v.length).toBeCloseTo(7); // sqrt(4+9+36) = 7
  });

  it("should set length", () => {
    const v = new Vec3(2, 3, 6);
    v.length = 14;
    expect(v.length).toBeCloseTo(14);
    // Direction preserved
    expect(v.x).toBeCloseTo(4);
    expect(v.y).toBeCloseTo(6);
    expect(v.z).toBeCloseTo(12);
  });

  it("should throw when setting length of zero vector", () => {
    const v = new Vec3(0, 0, 0);
    expect(() => {
      v.length = 5;
    }).toThrow(/zero/i);
  });

  it("should throw when setting length to NaN", () => {
    const v = new Vec3(1, 2, 3);
    expect(() => {
      v.length = NaN;
    }).toThrow(/NaN/);
  });

  // --- lsq ---

  it("should compute squared length", () => {
    const v = new Vec3(2, 3, 6);
    expect(v.lsq()).toBeCloseTo(49);
  });

  // --- set ---

  it("should copy from another Vec3", () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(4, 5, 6);
    a.set(b);
    expect(a.x).toBe(4);
    expect(a.y).toBe(5);
    expect(a.z).toBe(6);
  });

  it("should return this from set()", () => {
    const a = new Vec3();
    const b = new Vec3(1, 1, 1);
    expect(a.set(b)).toBe(a);
  });

  it("should throw on null argument to set()", () => {
    const v = new Vec3();
    expect(() => v.set(null as any)).toThrow(/null/);
  });

  // --- setxyz ---

  it("should set all components at once", () => {
    const v = new Vec3();
    v.setxyz(7, 8, 9);
    expect(v.x).toBe(7);
    expect(v.y).toBe(8);
    expect(v.z).toBe(9);
  });

  it("should return this from setxyz()", () => {
    const v = new Vec3();
    expect(v.setxyz(1, 2, 3)).toBe(v);
  });

  // --- xy ---

  it("should return Vec2 from xy()", () => {
    const v = new Vec3(10, 20, 30);
    const v2 = v.xy();
    expect(v2).toBeInstanceOf(Vec2);
    expect(v2.x).toBe(10);
    expect(v2.y).toBe(20);
  });

  it("should return weak Vec2 from xy(true)", () => {
    const v = new Vec3(5, 6, 7);
    const v2 = v.xy(true);
    expect(v2.zpp_inner.weak).toBe(true);
  });

  // --- Static factory: get ---

  it("should create from Vec3.get()", () => {
    const v = Vec3.get(10, 20, 30);
    expect(v.x).toBe(10);
    expect(v.y).toBe(20);
    expect(v.z).toBe(30);
  });

  it("should create with defaults from Vec3.get()", () => {
    const v = Vec3.get();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    expect(v.z).toBe(0);
  });

  // --- Dispose / Pool ---

  describe("dispose and pooling", () => {
    it("should dispose and mark as disposed", () => {
      const v = Vec3.get(1, 2, 3);
      v.dispose();
      expect(v.zpp_disp).toBe(true);
    });

    it("should throw when accessing disposed Vec3", () => {
      const v = Vec3.get(1, 2, 3);
      v.dispose();
      expect(() => v.x).toThrow(/disposed/);
      expect(() => v.y).toThrow(/disposed/);
      expect(() => v.z).toThrow(/disposed/);
      expect(() => v.length).toThrow(/disposed/);
    });

    it("should throw when setting on disposed Vec3", () => {
      const v = Vec3.get(1, 2, 3);
      v.dispose();
      expect(() => {
        v.x = 5;
      }).toThrow(/disposed/);
    });

    it("should throw when calling methods on disposed Vec3", () => {
      const v = Vec3.get(1, 2, 3);
      v.dispose();
      expect(() => v.lsq()).toThrow(/disposed/);
      expect(() => v.toString()).toThrow(/disposed/);
      expect(() => v.xy()).toThrow(/disposed/);
    });

    it("should throw when disposing twice", () => {
      const v = Vec3.get(1, 2, 3);
      v.dispose();
      expect(() => v.dispose()).toThrow(/disposed/);
    });

    it("should recycle disposed Vec3 from pool", () => {
      const v1 = Vec3.get(10, 20, 30);
      v1.dispose();
      const v2 = Vec3.get(40, 50, 60);
      expect(v2.x).toBe(40);
      expect(v2.y).toBe(50);
      expect(v2.z).toBe(60);
      expect(v2.zpp_disp).toBe(false);
    });
  });

  // --- toString ---

  it("should have toString", () => {
    const v = new Vec3(1, 2, 3);
    const str = v.toString();
    expect(str).toContain("1");
    expect(str).toContain("2");
    expect(str).toContain("3");
    expect(str).toContain("x:");
    expect(str).toContain("y:");
    expect(str).toContain("z:");
  });
});
