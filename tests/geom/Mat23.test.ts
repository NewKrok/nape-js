import { describe, it, expect } from "vitest";
import { Mat23 } from "../../src/geom/Mat23";
import { Vec2 } from "../../src/geom/Vec2";

describe("Mat23", () => {
  // --- Construction ---

  it("should construct identity by default", () => {
    const m = new Mat23();
    expect(m.a).toBe(1);
    expect(m.b).toBe(0);
    expect(m.c).toBe(0);
    expect(m.d).toBe(1);
    expect(m.tx).toBe(0);
    expect(m.ty).toBe(0);
  });

  it("should construct with given values", () => {
    const m = new Mat23(2, 3, 4, 5, 6, 7);
    expect(m.a).toBe(2);
    expect(m.b).toBe(3);
    expect(m.c).toBe(4);
    expect(m.d).toBe(5);
    expect(m.tx).toBe(6);
    expect(m.ty).toBe(7);
  });

  it("should throw on NaN constructor arguments", () => {
    expect(() => new Mat23(NaN)).toThrow(/NaN/);
    expect(() => new Mat23(1, NaN)).toThrow(/NaN/);
    expect(() => new Mat23(1, 0, NaN)).toThrow(/NaN/);
    expect(() => new Mat23(1, 0, 0, NaN)).toThrow(/NaN/);
    expect(() => new Mat23(1, 0, 0, 1, NaN)).toThrow(/NaN/);
    expect(() => new Mat23(1, 0, 0, 1, 0, NaN)).toThrow(/NaN/);
  });

  // --- Static factories ---

  describe("rotation", () => {
    it("should create rotation matrix", () => {
      const angle = Math.PI / 4;
      const m = Mat23.rotation(angle);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      expect(m.a).toBeCloseTo(cos);
      expect(m.b).toBeCloseTo(-sin);
      expect(m.c).toBeCloseTo(sin);
      expect(m.d).toBeCloseTo(cos);
      expect(m.tx).toBe(0);
      expect(m.ty).toBe(0);
    });

    it("should throw on NaN angle", () => {
      expect(() => Mat23.rotation(NaN)).toThrow(/NaN/);
    });
  });

  describe("translation", () => {
    it("should create translation matrix", () => {
      const m = Mat23.translation(10, 20);
      expect(m.a).toBe(1);
      expect(m.b).toBe(0);
      expect(m.c).toBe(0);
      expect(m.d).toBe(1);
      expect(m.tx).toBe(10);
      expect(m.ty).toBe(20);
    });
  });

  describe("scale", () => {
    it("should create scale matrix", () => {
      const m = Mat23.scale(3, 5);
      expect(m.a).toBe(3);
      expect(m.b).toBe(0);
      expect(m.c).toBe(0);
      expect(m.d).toBe(5);
      expect(m.tx).toBe(0);
      expect(m.ty).toBe(0);
    });
  });

  // --- Properties get/set ---

  it("should set properties with NaN check", () => {
    const m = new Mat23();
    m.a = 2;
    m.b = 3;
    m.c = 4;
    m.d = 5;
    m.tx = 6;
    m.ty = 7;
    expect(m.a).toBe(2);
    expect(m.b).toBe(3);
    expect(m.c).toBe(4);
    expect(m.d).toBe(5);
    expect(m.tx).toBe(6);
    expect(m.ty).toBe(7);
  });

  it("should throw on NaN property assignments", () => {
    const m = new Mat23();
    expect(() => {
      m.a = NaN;
    }).toThrow(/NaN/);
    expect(() => {
      m.b = NaN;
    }).toThrow(/NaN/);
    expect(() => {
      m.c = NaN;
    }).toThrow(/NaN/);
    expect(() => {
      m.d = NaN;
    }).toThrow(/NaN/);
    expect(() => {
      m.tx = NaN;
    }).toThrow(/NaN/);
    expect(() => {
      m.ty = NaN;
    }).toThrow(/NaN/);
  });

  // --- Determinant ---

  it("should compute determinant", () => {
    const m = new Mat23(2, 3, 4, 5, 0, 0);
    // det = 2*5 - 3*4 = 10 - 12 = -2
    expect(m.determinant).toBe(-2);
  });

  it("should have determinant 1 for identity", () => {
    expect(new Mat23().determinant).toBe(1);
  });

  // --- Copy ---

  it("should copy matrix", () => {
    const m = new Mat23(2, 3, 4, 5, 6, 7);
    const c = m.copy();
    expect(c.a).toBe(2);
    expect(c.b).toBe(3);
    expect(c.c).toBe(4);
    expect(c.d).toBe(5);
    expect(c.tx).toBe(6);
    expect(c.ty).toBe(7);
    // Verify it's a separate object
    c.a = 99;
    expect(m.a).toBe(2);
  });

  // --- Set ---

  it("should set from another matrix", () => {
    const a = new Mat23(2, 3, 4, 5, 6, 7);
    const b = new Mat23();
    b.set(a);
    expect(b.a).toBe(2);
    expect(b.b).toBe(3);
    expect(b.c).toBe(4);
    expect(b.d).toBe(5);
    expect(b.tx).toBe(6);
    expect(b.ty).toBe(7);
  });

  it("should return this from set()", () => {
    const a = new Mat23();
    const b = new Mat23(1, 2, 3, 4, 5, 6);
    expect(a.set(b)).toBe(a);
  });

  it("should throw on null argument to set()", () => {
    const m = new Mat23();
    expect(() => m.set(null as any)).toThrow(/null/);
  });

  // --- SetAs ---

  it("should setAs with values", () => {
    const m = new Mat23();
    m.setAs(2, 3, 4, 5, 6, 7);
    expect(m.a).toBe(2);
    expect(m.b).toBe(3);
    expect(m.c).toBe(4);
    expect(m.d).toBe(5);
    expect(m.tx).toBe(6);
    expect(m.ty).toBe(7);
  });

  it("should return this from setAs()", () => {
    const m = new Mat23();
    expect(m.setAs(1, 2, 3, 4, 5, 6)).toBe(m);
  });

  // --- Reset ---

  it("should reset to identity", () => {
    const m = new Mat23(2, 3, 4, 5, 6, 7);
    m.reset();
    expect(m.a).toBe(1);
    expect(m.b).toBe(0);
    expect(m.c).toBe(0);
    expect(m.d).toBe(1);
    expect(m.tx).toBe(0);
    expect(m.ty).toBe(0);
  });

  // --- Singular ---

  it("should detect singular matrix", () => {
    const m = new Mat23(1, 2, 2, 4, 0, 0);
    // det = 1*4 - 2*2 = 0 → singular
    expect(m.singular()).toBe(true);
  });

  it("should detect non-singular matrix", () => {
    const m = new Mat23(); // identity
    expect(m.singular()).toBe(false);
  });

  // --- Inverse ---

  it("should compute inverse", () => {
    const m = new Mat23(2, 1, 1, 3, 5, 7);
    const inv = m.inverse();
    // Verify M * M^-1 ≈ identity
    const result = m.concat(inv);
    expect(result.a).toBeCloseTo(1);
    expect(result.b).toBeCloseTo(0);
    expect(result.c).toBeCloseTo(0);
    expect(result.d).toBeCloseTo(1);
    expect(result.tx).toBeCloseTo(0);
    expect(result.ty).toBeCloseTo(0);
  });

  it("should throw when inverting singular matrix", () => {
    const m = new Mat23(1, 2, 2, 4, 0, 0);
    expect(() => m.inverse()).toThrow(/singular/i);
  });

  // --- Transpose ---

  it("should compute transpose", () => {
    const m = new Mat23(1, 2, 3, 4, 5, 6);
    const t = m.transpose();
    expect(t.a).toBe(1);
    expect(t.b).toBe(3);
    expect(t.c).toBe(2);
    expect(t.d).toBe(4);
  });

  // --- Concat ---

  it("should concatenate matrices", () => {
    const t = Mat23.translation(10, 20);
    const s = Mat23.scale(2, 3);
    const result = s.concat(t);
    // Scale then translate: point (1,1) → (2,3) → (12,23)
    const p = Vec2.get(1, 1);
    const tp = result.transform(p);
    expect(tp.x).toBeCloseTo(12);
    expect(tp.y).toBeCloseTo(23);
    tp.dispose();
  });

  it("should throw on null argument to concat()", () => {
    const m = new Mat23();
    expect(() => m.concat(null as any)).toThrow(/null/);
  });

  // --- Transform ---

  it("should transform a point", () => {
    const m = new Mat23(2, 0, 0, 3, 10, 20);
    const p = Vec2.get(5, 7);
    const r = m.transform(p);
    // rx = 5*2 + 7*0 + 10 = 20
    // ry = 5*0 + 7*3 + 20 = 41
    expect(r.x).toBeCloseTo(20);
    expect(r.y).toBeCloseTo(41);
    r.dispose();
    p.dispose();
  });

  it("should transform without translation", () => {
    const m = new Mat23(2, 0, 0, 3, 10, 20);
    const p = Vec2.get(5, 7);
    const r = m.transform(p, true);
    // rx = 5*2 + 7*0 = 10
    // ry = 5*0 + 7*3 = 21
    expect(r.x).toBeCloseTo(10);
    expect(r.y).toBeCloseTo(21);
    r.dispose();
    p.dispose();
  });

  it("should throw on null point to transform()", () => {
    const m = new Mat23();
    expect(() => m.transform(null as any)).toThrow(/null/);
  });

  it("should throw on disposed point to transform()", () => {
    const m = new Mat23();
    const p = Vec2.get(1, 2);
    p.dispose();
    expect(() => m.transform(p)).toThrow(/disposed/i);
  });

  // --- Inverse Transform ---

  it("should inverse transform a point", () => {
    const m = new Mat23(2, 0, 0, 3, 10, 20);
    const p = Vec2.get(5, 7);
    const tp = m.transform(p);
    const back = m.inverseTransform(tp);
    expect(back.x).toBeCloseTo(5);
    expect(back.y).toBeCloseTo(7);
    back.dispose();
    p.dispose();
  });

  it("should inverse transform without translation", () => {
    const m = new Mat23(2, 0, 0, 3, 10, 20);
    const p = Vec2.get(10, 21);
    const r = m.inverseTransform(p, true);
    // Inverse of [2,0;0,3] is [0.5,0;0,1/3]
    expect(r.x).toBeCloseTo(5);
    expect(r.y).toBeCloseTo(7);
    r.dispose();
    p.dispose();
  });

  it("should throw on singular inverse transform", () => {
    const m = new Mat23(1, 2, 2, 4, 0, 0);
    const p = Vec2.get(1, 1);
    expect(() => m.inverseTransform(p)).toThrow(/singular/i);
    p.dispose();
  });

  it("should throw on null point to inverseTransform()", () => {
    const m = new Mat23();
    expect(() => m.inverseTransform(null as any)).toThrow(/null/);
  });

  // --- Equiorthogonal / Orthogonal ---

  it("should detect orthogonal matrix", () => {
    const m = Mat23.rotation(Math.PI / 3);
    expect(m.orthogonal()).toBe(true);
  });

  it("should detect non-orthogonal matrix", () => {
    const m = Mat23.scale(2, 3);
    expect(m.orthogonal()).toBe(false);
  });

  it("should detect equiorthogonal matrix", () => {
    const m = Mat23.rotation(Math.PI / 6);
    expect(m.equiorthogonal()).toBe(true);
  });

  it("should detect equiorthogonal with uniform scale", () => {
    const angle = Math.PI / 4;
    const cos = Math.cos(angle) * 2;
    const sin = Math.sin(angle) * 2;
    const m = new Mat23(cos, -sin, sin, cos, 0, 0);
    expect(m.equiorthogonal()).toBe(true);
  });

  // --- Orthogonalise ---

  it("should orthogonalise a near-orthogonal matrix", () => {
    const m = new Mat23(1.01, -0.01, 0.01, 0.99, 5, 10);
    m.orthogonalise();
    expect(m.orthogonal()).toBe(true);
  });

  it("should equiorthogonalise a matrix", () => {
    const m = new Mat23(2.01, -0.01, 0.01, 1.99, 5, 10);
    m.equiorthogonalise();
    expect(m.equiorthogonal()).toBe(true);
  });

  it("should return this from orthogonalise()", () => {
    const m = new Mat23();
    expect(m.orthogonalise()).toBe(m);
  });

  it("should return this from equiorthogonalise()", () => {
    const m = new Mat23();
    expect(m.equiorthogonalise()).toBe(m);
  });

  // --- toString ---

  it("should produce readable toString", () => {
    const m = new Mat23(1, 2, 3, 4, 5, 6);
    const s = m.toString();
    expect(s).toContain("a:");
    expect(s).toContain("b:");
    expect(s).toContain("c:");
    expect(s).toContain("d:");
    expect(s).toContain("tx:");
    expect(s).toContain("ty:");
  });

  // --- _wrap ---

  it("should wrap a ZPP_Mat23 inner", () => {
    const m = new Mat23(2, 3, 4, 5, 6, 7);
    const wrapped = Mat23._wrap(m.zpp_inner);
    expect(wrapped).toBeInstanceOf(Mat23);
    expect(wrapped.a).toBe(2);
  });

  it("should wrap from Mat23 instance", () => {
    const m = new Mat23(1, 2, 3, 4, 5, 6);
    expect(Mat23._wrap(m)).toBe(m);
  });

  it("should return null for falsy wrap", () => {
    expect(Mat23._wrap(null)).toBe(null);
    expect(Mat23._wrap(undefined)).toBe(null);
  });

  // --- Rotation + transform roundtrip ---

  it("should rotate a point correctly", () => {
    const m = Mat23.rotation(Math.PI / 2);
    const p = Vec2.get(1, 0);
    const r = m.transform(p);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(1);
    r.dispose();
  });

  it("should handle inverse of rotation", () => {
    const m = Mat23.rotation(Math.PI / 3);
    const inv = m.inverse();
    const p = Vec2.get(3, 4);
    const tp = m.transform(p);
    const back = inv.transform(tp);
    expect(back.x).toBeCloseTo(3);
    expect(back.y).toBeCloseTo(4);
    back.dispose();
    tp.dispose();
  });
});
