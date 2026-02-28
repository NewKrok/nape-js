import { describe, it, expect } from "vitest";
import { Vec2 } from "../../src/geom/Vec2";

describe("Vec2", () => {
  it("should construct with default values", () => {
    const v = new Vec2();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it("should construct with given values", () => {
    const v = new Vec2(3, 4);
    expect(v.x).toBe(3);
    expect(v.y).toBe(4);
  });

  it("should get/set x and y", () => {
    const v = new Vec2();
    v.x = 10;
    v.y = 20;
    expect(v.x).toBe(10);
    expect(v.y).toBe(20);
  });

  it("should compute length", () => {
    const v = new Vec2(3, 4);
    expect(v.length).toBeCloseTo(5.0);
  });

  it("should set length", () => {
    const v = new Vec2(3, 4);
    v.length = 10;
    expect(v.length).toBeCloseTo(10);
    // Direction should be preserved
    expect(v.x).toBeCloseTo(6);
    expect(v.y).toBeCloseTo(8);
  });

  it("should compute squared length (lsq)", () => {
    const v = new Vec2(3, 4);
    expect(v.lsq()).toBeCloseTo(25);
  });

  it("should compute angle", () => {
    const v = new Vec2(1, 0);
    expect(v.angle).toBeCloseTo(0);

    const v2 = new Vec2(0, 1);
    expect(v2.angle).toBeCloseTo(Math.PI / 2);
  });

  it("should set values with setxy", () => {
    const v = new Vec2();
    v.setxy(5, 6);
    expect(v.x).toBe(5);
    expect(v.y).toBe(6);
  });

  it("should copy values from another Vec2", () => {
    const a = new Vec2(1, 2);
    const b = new Vec2(3, 4);
    a.set(b);
    expect(a.x).toBe(3);
    expect(a.y).toBe(4);
  });

  it("should create a copy", () => {
    const a = new Vec2(1, 2);
    const b = a.copy();
    b.x = 99;
    expect(a.x).toBe(1); // original unchanged
    expect(b.x).toBe(99);
  });

  it("should add vectors", () => {
    const a = new Vec2(1, 2);
    const b = new Vec2(3, 4);
    const c = a.add(b);
    expect(c.x).toBeCloseTo(4);
    expect(c.y).toBeCloseTo(6);
  });

  it("should subtract vectors", () => {
    const a = new Vec2(5, 10);
    const b = new Vec2(3, 4);
    const c = a.sub(b);
    expect(c.x).toBeCloseTo(2);
    expect(c.y).toBeCloseTo(6);
  });

  it("should multiply by scalar", () => {
    const a = new Vec2(2, 3);
    const b = a.mul(3);
    expect(b.x).toBeCloseTo(6);
    expect(b.y).toBeCloseTo(9);
  });

  it("should do in-place add (addeq)", () => {
    const a = new Vec2(1, 2);
    const b = new Vec2(3, 4);
    const result = a.addeq(b);
    expect(a.x).toBeCloseTo(4);
    expect(a.y).toBeCloseTo(6);
    expect(result).toBe(a); // returns this for chaining
  });

  it("should do in-place subtract (subeq)", () => {
    const a = new Vec2(5, 10);
    const b = new Vec2(3, 4);
    a.subeq(b);
    expect(a.x).toBeCloseTo(2);
    expect(a.y).toBeCloseTo(6);
  });

  it("should do in-place multiply (muleq)", () => {
    const a = new Vec2(2, 3);
    a.muleq(3);
    expect(a.x).toBeCloseTo(6);
    expect(a.y).toBeCloseTo(9);
  });

  it("should compute dot product", () => {
    const a = new Vec2(1, 0);
    const b = new Vec2(0, 1);
    expect(a.dot(b)).toBeCloseTo(0);

    const c = new Vec2(2, 3);
    const d = new Vec2(4, 5);
    expect(c.dot(d)).toBeCloseTo(23);
  });

  it("should compute cross product", () => {
    const a = new Vec2(1, 0);
    const b = new Vec2(0, 1);
    expect(a.cross(b)).toBeCloseTo(1);
  });

  it("should compute perpendicular", () => {
    const a = new Vec2(1, 0);
    const p = a.perp();
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });

  it("should normalise in-place", () => {
    const v = new Vec2(3, 4);
    v.normalise();
    expect(v.length).toBeCloseTo(1);
    // Direction preserved
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
  });

  it("should return unit vector", () => {
    const v = new Vec2(3, 4);
    const u = v.unit();
    expect(u.length).toBeCloseTo(1);
    expect(v.length).toBeCloseTo(5); // original unchanged
  });

  it("should create from static get", () => {
    const v = Vec2.get(7, 8);
    expect(v.x).toBe(7);
    expect(v.y).toBe(8);
  });

  it("should create from polar", () => {
    const v = Vec2.fromPolar(5, 0);
    expect(v.x).toBeCloseTo(5);
    expect(v.y).toBeCloseTo(0);

    const v2 = Vec2.fromPolar(5, Math.PI / 2);
    expect(v2.x).toBeCloseTo(0);
    expect(v2.y).toBeCloseTo(5);
  });

  it("should have toString", () => {
    const v = new Vec2(3, 4);
    const str = v.toString();
    expect(str).toContain("3");
    expect(str).toContain("4");
  });

  // --- Dispose / Pool ---

  describe("dispose and pooling", () => {
    it("should dispose and mark as disposed", () => {
      const v = Vec2.get(1, 2);
      v.dispose();
      expect(v.zpp_disp).toBe(true);
    });

    it("should throw when accessing disposed Vec2", () => {
      const v = Vec2.get(1, 2);
      v.dispose();
      expect(() => v.x).toThrow(/disposed/);
      expect(() => v.y).toThrow(/disposed/);
      expect(() => v.length).toThrow(/disposed/);
    });

    it("should throw when setting on disposed Vec2", () => {
      const v = Vec2.get(1, 2);
      v.dispose();
      expect(() => {
        v.x = 5;
      }).toThrow(/disposed/);
    });

    it("should throw when calling methods on disposed Vec2", () => {
      const v = Vec2.get(1, 2);
      v.dispose();
      expect(() => v.lsq()).toThrow(/disposed/);
      expect(() => v.copy()).toThrow(/disposed/);
      expect(() => v.toString()).toThrow(/disposed/);
    });

    it("should throw when disposing twice", () => {
      const v = Vec2.get(1, 2);
      v.dispose();
      expect(() => v.dispose()).toThrow(/disposed/);
    });

    it("should recycle disposed Vec2 from pool", () => {
      const v1 = Vec2.get(10, 20);
      v1.dispose();
      const v2 = Vec2.get(30, 40);
      expect(v2.x).toBe(30);
      expect(v2.y).toBe(40);
      expect(v2.zpp_disp).toBe(false);
    });
  });

  // --- Weak references ---

  describe("weak references", () => {
    it("should create weak Vec2 via Vec2.weak()", () => {
      const v = Vec2.weak(1, 2);
      expect(v.zpp_inner.weak).toBe(true);
    });

    it("should create weak Vec2 via Vec2.get() with weak=true", () => {
      const v = Vec2.get(1, 2, true);
      expect(v.zpp_inner.weak).toBe(true);
    });

    it("should auto-dispose weak Vec2 after set()", () => {
      const weak = Vec2.weak(3, 4);
      const target = new Vec2(0, 0);
      target.set(weak);
      expect(target.x).toBe(3);
      expect(target.y).toBe(4);
      expect(weak.zpp_disp).toBe(true);
    });

    it("should auto-dispose weak Vec2 after add()", () => {
      const a = new Vec2(1, 1);
      const weak = Vec2.weak(2, 3);
      a.add(weak);
      expect(weak.zpp_disp).toBe(true);
    });

    it("should auto-dispose weak Vec2 after dot()", () => {
      const a = new Vec2(1, 0);
      const weak = Vec2.weak(0, 1);
      const d = a.dot(weak);
      expect(d).toBeCloseTo(0);
      expect(weak.zpp_disp).toBe(true);
    });

    it("should auto-dispose weak Vec2 after cross()", () => {
      const a = new Vec2(1, 0);
      const weak = Vec2.weak(0, 1);
      const c = a.cross(weak);
      expect(c).toBeCloseTo(1);
      expect(weak.zpp_disp).toBe(true);
    });

    it("should auto-dispose weak Vec2 after addeq()", () => {
      const a = new Vec2(1, 2);
      const weak = Vec2.weak(3, 4);
      a.addeq(weak);
      expect(a.x).toBeCloseTo(4);
      expect(weak.zpp_disp).toBe(true);
    });

    it("should auto-dispose weak Vec2 after subeq()", () => {
      const a = new Vec2(5, 10);
      const weak = Vec2.weak(3, 4);
      a.subeq(weak);
      expect(a.x).toBeCloseTo(2);
      expect(weak.zpp_disp).toBe(true);
    });

    it("should not auto-dispose non-weak Vec2", () => {
      const a = new Vec2(1, 2);
      const b = new Vec2(3, 4);
      a.add(b);
      expect(b.zpp_disp).toBe(false);
    });
  });

  // --- NaN validation ---

  describe("NaN validation", () => {
    it("should throw on NaN in constructor", () => {
      expect(() => new Vec2(NaN, 0)).toThrow(/NaN/);
      expect(() => new Vec2(0, NaN)).toThrow(/NaN/);
    });

    it("should throw on NaN in set_x", () => {
      const v = new Vec2(1, 2);
      expect(() => {
        v.x = NaN;
      }).toThrow(/NaN/);
    });

    it("should throw on NaN in set_y", () => {
      const v = new Vec2(1, 2);
      expect(() => {
        v.y = NaN;
      }).toThrow(/NaN/);
    });

    it("should throw on NaN in setxy", () => {
      const v = new Vec2();
      expect(() => v.setxy(NaN, 0)).toThrow(/NaN/);
      expect(() => v.setxy(0, NaN)).toThrow(/NaN/);
    });

    it("should throw on NaN in Vec2.get()", () => {
      expect(() => Vec2.get(NaN, 0)).toThrow(/NaN/);
    });

    it("should throw on NaN in Vec2.weak()", () => {
      expect(() => Vec2.weak(NaN, 0)).toThrow(/NaN/);
    });

    it("should throw on NaN in Vec2.fromPolar()", () => {
      expect(() => Vec2.fromPolar(NaN, 0)).toThrow(/NaN/);
      expect(() => Vec2.fromPolar(1, NaN)).toThrow(/NaN/);
    });

    it("should throw on NaN in set_angle", () => {
      const v = new Vec2(1, 0);
      expect(() => {
        v.angle = NaN;
      }).toThrow(/NaN/);
    });

    it("should throw on NaN in set_length", () => {
      const v = new Vec2(3, 4);
      expect(() => {
        v.length = NaN;
      }).toThrow(/NaN/);
    });

    it("should throw on NaN in rotate()", () => {
      const v = new Vec2(1, 0);
      expect(() => v.rotate(NaN)).toThrow(/NaN/);
    });

    it("should throw on NaN in muleq()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.muleq(NaN)).toThrow(/NaN/);
    });

    it("should throw on NaN in mul()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.mul(NaN)).toThrow(/NaN/);
    });
  });

  // --- Error cases ---

  describe("error cases", () => {
    it("should throw when setting length of zero vector", () => {
      const v = new Vec2(0, 0);
      expect(() => {
        v.length = 5;
      }).toThrow(/zero/i);
    });

    it("should throw when normalising zero vector", () => {
      const v = new Vec2(0, 0);
      expect(() => v.normalise()).toThrow(/length 0/i);
    });

    it("should throw when getting unit of zero vector", () => {
      const v = new Vec2(0, 0);
      expect(() => v.unit()).toThrow(/length 0/i);
    });

    it("should throw on null argument to set()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.set(null as any)).toThrow(/null/);
    });

    it("should throw on null argument to add()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.add(null as any)).toThrow(/null/);
    });

    it("should throw on null argument to sub()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.sub(null as any)).toThrow(/null/);
    });

    it("should throw on null argument to dot()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.dot(null as any)).toThrow(/null/);
    });

    it("should throw on null argument to cross()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.cross(null as any)).toThrow(/null/);
    });

    it("should throw on null argument to addeq()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.addeq(null as any)).toThrow(/null/);
    });

    it("should throw on null argument to subeq()", () => {
      const v = new Vec2(1, 2);
      expect(() => v.subeq(null as any)).toThrow(/null/);
    });
  });

  // --- rotate ---

  describe("rotate", () => {
    it("should rotate 90 degrees", () => {
      const v = new Vec2(1, 0);
      v.rotate(Math.PI / 2);
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(1);
    });

    it("should rotate 180 degrees", () => {
      const v = new Vec2(1, 0);
      v.rotate(Math.PI);
      expect(v.x).toBeCloseTo(-1);
      expect(v.y).toBeCloseTo(0);
    });

    it("should return this for chaining", () => {
      const v = new Vec2(1, 0);
      expect(v.rotate(0.5)).toBe(v);
    });
  });

  // --- set_angle ---

  describe("set_angle", () => {
    it("should rotate to given angle preserving magnitude", () => {
      const v = new Vec2(3, 4);
      const len = v.length;
      v.angle = Math.PI / 4;
      expect(v.length).toBeCloseTo(len);
      expect(v.angle).toBeCloseTo(Math.PI / 4);
    });

    it("should return 0 for zero vector angle", () => {
      const v = new Vec2(0, 0);
      expect(v.angle).toBe(0);
    });
  });

  // --- addMul ---

  describe("addMul", () => {
    it("should compute this + vector * scalar", () => {
      const a = new Vec2(1, 2);
      const b = new Vec2(3, 4);
      const c = a.addMul(b, 2);
      expect(c.x).toBeCloseTo(7);
      expect(c.y).toBeCloseTo(10);
    });

    it("should auto-dispose weak argument", () => {
      const a = new Vec2(0, 0);
      const weak = Vec2.weak(1, 1);
      a.addMul(weak, 5);
      expect(weak.zpp_disp).toBe(true);
    });
  });

  // --- static distance methods ---

  describe("static distance methods", () => {
    it("should compute squared distance", () => {
      const a = new Vec2(0, 0);
      const b = new Vec2(3, 4);
      expect(Vec2.dsq(a, b)).toBeCloseTo(25);
    });

    it("should compute distance", () => {
      const a = new Vec2(0, 0);
      const b = new Vec2(3, 4);
      expect(Vec2.distance(a, b)).toBeCloseTo(5);
    });

    it("should auto-dispose weak args in dsq()", () => {
      const a = Vec2.weak(0, 0);
      const b = Vec2.weak(3, 4);
      Vec2.dsq(a, b);
      expect(a.zpp_disp).toBe(true);
      expect(b.zpp_disp).toBe(true);
    });

    it("should auto-dispose weak args in distance()", () => {
      const a = Vec2.weak(0, 0);
      const b = Vec2.weak(3, 4);
      Vec2.distance(a, b);
      expect(a.zpp_disp).toBe(true);
      expect(b.zpp_disp).toBe(true);
    });
  });

  // --- reflect ---

  describe("reflect", () => {
    it("should reflect vector about axis", () => {
      const axis = new Vec2(1, 0); // horizontal axis
      const v = new Vec2(1, 1);
      const r = axis.reflect(v);
      // Reflection of (1,1) about x-axis normal: (1, -1) relative...
      // The reflect formula: result = vec - 2*(normal·vec)*normal
      // normal = unit(axis) = (1,0), dot = 1, result = (1,1) - 2*(1,0) = (-1, 1)
      expect(r.x).toBeCloseTo(-1);
      expect(r.y).toBeCloseTo(1);
    });

    it("should throw when reflecting in zero vector", () => {
      const zero = new Vec2(0, 0);
      const v = new Vec2(1, 1);
      expect(() => zero.reflect(v)).toThrow(/zero/i);
    });
  });
});
