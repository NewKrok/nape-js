import { describe, it, expect } from "vitest";
import { MatMN } from "../../src/geom/MatMN";
import { ZPP_MatMN } from "../../src/native/geom/ZPP_MatMN";

describe("MatMN", () => {
  // --- Constructor ---

  it("should construct with valid rows and cols", () => {
    const m = new MatMN(3, 4);
    expect(m.rows).toBe(3);
    expect(m.cols).toBe(4);
  });

  it("should initialize all elements to 0", () => {
    const m = new MatMN(2, 3);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        expect(m.x(i, j)).toBe(0);
      }
    }
  });

  it("should throw on zero rows", () => {
    expect(() => new MatMN(0, 3)).toThrow("dimensions cannot be < 1");
  });

  it("should throw on zero cols", () => {
    expect(() => new MatMN(3, 0)).toThrow("dimensions cannot be < 1");
  });

  it("should throw on negative rows", () => {
    expect(() => new MatMN(-1, 3)).toThrow("dimensions cannot be < 1");
  });

  it("should throw on negative cols", () => {
    expect(() => new MatMN(3, -2)).toThrow("dimensions cannot be < 1");
  });

  // --- Internal state ---

  it("should have zpp_inner of type ZPP_MatMN", () => {
    const m = new MatMN(2, 2);
    expect(m.zpp_inner).toBeInstanceOf(ZPP_MatMN);
  });

  it("should set outer reference on zpp_inner", () => {
    const m = new MatMN(2, 2);
    expect(m.zpp_inner.outer).toBe(m);
  });

  it("should return this from _inner getter", () => {
    const m = new MatMN(2, 2);
    expect((m as any)._inner).toBe(m);
  });

  // --- rows / cols ---

  it("should return correct rows", () => {
    const m = new MatMN(5, 3);
    expect(m.rows).toBe(5);
  });

  it("should return correct cols", () => {
    const m = new MatMN(5, 3);
    expect(m.cols).toBe(3);
  });

  // --- x / setx ---

  it("should get and set element values", () => {
    const m = new MatMN(2, 3);
    m.setx(0, 0, 1);
    m.setx(0, 1, 2);
    m.setx(0, 2, 3);
    m.setx(1, 0, 4);
    m.setx(1, 1, 5);
    m.setx(1, 2, 6);
    expect(m.x(0, 0)).toBe(1);
    expect(m.x(0, 1)).toBe(2);
    expect(m.x(0, 2)).toBe(3);
    expect(m.x(1, 0)).toBe(4);
    expect(m.x(1, 1)).toBe(5);
    expect(m.x(1, 2)).toBe(6);
  });

  it("setx should return the set value", () => {
    const m = new MatMN(2, 2);
    expect(m.setx(0, 0, 42)).toBe(42);
  });

  it("should throw on x() with negative row", () => {
    const m = new MatMN(2, 2);
    expect(() => m.x(-1, 0)).toThrow("indices out of range");
  });

  it("should throw on x() with negative col", () => {
    const m = new MatMN(2, 2);
    expect(() => m.x(0, -1)).toThrow("indices out of range");
  });

  it("should throw on x() with row >= rows", () => {
    const m = new MatMN(2, 3);
    expect(() => m.x(2, 0)).toThrow("indices out of range");
  });

  it("should throw on x() with col >= cols", () => {
    const m = new MatMN(2, 3);
    expect(() => m.x(0, 3)).toThrow("indices out of range");
  });

  it("should throw on setx() with negative row", () => {
    const m = new MatMN(2, 2);
    expect(() => m.setx(-1, 0, 1)).toThrow("indices out of range");
  });

  it("should throw on setx() with row >= rows", () => {
    const m = new MatMN(2, 2);
    expect(() => m.setx(2, 0, 1)).toThrow("indices out of range");
  });

  // --- toString ---

  it("should format 1x1 matrix", () => {
    const m = new MatMN(1, 1);
    m.setx(0, 0, 7);
    expect(m.toString()).toBe("{ 7 }");
  });

  it("should format 2x3 matrix with semicolons between rows", () => {
    const m = new MatMN(2, 3);
    m.setx(0, 0, 1);
    m.setx(0, 1, 2);
    m.setx(0, 2, 3);
    m.setx(1, 0, 4);
    m.setx(1, 1, 5);
    m.setx(1, 2, 6);
    expect(m.toString()).toBe("{ 1 2 3 ; 4 5 6 }");
  });

  it("should format zero matrix", () => {
    const m = new MatMN(2, 2);
    expect(m.toString()).toBe("{ 0 0 ; 0 0 }");
  });

  // --- transpose ---

  it("should transpose a matrix", () => {
    const m = new MatMN(2, 3);
    m.setx(0, 0, 1);
    m.setx(0, 1, 2);
    m.setx(0, 2, 3);
    m.setx(1, 0, 4);
    m.setx(1, 1, 5);
    m.setx(1, 2, 6);

    const t = m.transpose();
    expect(t.rows).toBe(3);
    expect(t.cols).toBe(2);
    expect(t.x(0, 0)).toBe(1);
    expect(t.x(0, 1)).toBe(4);
    expect(t.x(1, 0)).toBe(2);
    expect(t.x(1, 1)).toBe(5);
    expect(t.x(2, 0)).toBe(3);
    expect(t.x(2, 1)).toBe(6);
  });

  it("should return a new matrix from transpose", () => {
    const m = new MatMN(2, 2);
    const t = m.transpose();
    expect(t).not.toBe(m);
    expect(t).toBeInstanceOf(MatMN);
  });

  it("should transpose 1x1 identity", () => {
    const m = new MatMN(1, 1);
    m.setx(0, 0, 42);
    const t = m.transpose();
    expect(t.rows).toBe(1);
    expect(t.cols).toBe(1);
    expect(t.x(0, 0)).toBe(42);
  });

  // --- mul ---

  it("should multiply compatible matrices", () => {
    // [1 2] * [5 6] = [1*5+2*7  1*6+2*8] = [19 22]
    // [3 4]   [7 8]   [3*5+4*7  3*6+4*8]   [43 50]
    const a = new MatMN(2, 2);
    a.setx(0, 0, 1);
    a.setx(0, 1, 2);
    a.setx(1, 0, 3);
    a.setx(1, 1, 4);

    const b = new MatMN(2, 2);
    b.setx(0, 0, 5);
    b.setx(0, 1, 6);
    b.setx(1, 0, 7);
    b.setx(1, 1, 8);

    const c = a.mul(b);
    expect(c.rows).toBe(2);
    expect(c.cols).toBe(2);
    expect(c.x(0, 0)).toBe(19);
    expect(c.x(0, 1)).toBe(22);
    expect(c.x(1, 0)).toBe(43);
    expect(c.x(1, 1)).toBe(50);
  });

  it("should multiply non-square matrices", () => {
    // [1 2 3] * [7  8 ]   = [1*7+2*9+3*11   1*8+2*10+3*12]   = [58  64]
    // [4 5 6]   [9  10]     [4*7+5*9+6*11   4*8+5*10+6*12]     [139 154]
    //           [11 12]
    const a = new MatMN(2, 3);
    a.setx(0, 0, 1);
    a.setx(0, 1, 2);
    a.setx(0, 2, 3);
    a.setx(1, 0, 4);
    a.setx(1, 1, 5);
    a.setx(1, 2, 6);

    const b = new MatMN(3, 2);
    b.setx(0, 0, 7);
    b.setx(0, 1, 8);
    b.setx(1, 0, 9);
    b.setx(1, 1, 10);
    b.setx(2, 0, 11);
    b.setx(2, 1, 12);

    const c = a.mul(b);
    expect(c.rows).toBe(2);
    expect(c.cols).toBe(2);
    expect(c.x(0, 0)).toBe(58);
    expect(c.x(0, 1)).toBe(64);
    expect(c.x(1, 0)).toBe(139);
    expect(c.x(1, 1)).toBe(154);
  });

  it("should throw on incompatible dimensions for mul", () => {
    const a = new MatMN(2, 3);
    const b = new MatMN(2, 2);
    expect(() => a.mul(b)).toThrow("dimensions aren't compatible");
  });

  it("should return a new matrix from mul", () => {
    const a = new MatMN(1, 1);
    a.setx(0, 0, 2);
    const b = new MatMN(1, 1);
    b.setx(0, 0, 3);
    const c = a.mul(b);
    expect(c).not.toBe(a);
    expect(c).not.toBe(b);
    expect(c).toBeInstanceOf(MatMN);
    expect(c.x(0, 0)).toBe(6);
  });

  // --- _wrap ---

  it("should wrap a ZPP_MatMN instance", () => {
    const zpp = new ZPP_MatMN(2, 2);
    const wrapped = MatMN._wrap(zpp);
    expect(wrapped).toBeInstanceOf(MatMN);
    expect(wrapped.zpp_inner).toBe(zpp);
  });

  it("should return same instance when wrapping MatMN", () => {
    const m = new MatMN(2, 2);
    expect(MatMN._wrap(m)).toBe(m);
  });

  it("should return null for null input", () => {
    expect(MatMN._wrap(null)).toBeNull();
  });

  it("should cache wrapped instances", () => {
    const zpp = new ZPP_MatMN(2, 2);
    const first = MatMN._wrap(zpp);
    const second = MatMN._wrap(zpp);
    expect(first).toBe(second);
  });

  // --- __name__ ---

  it("should have correct __name__", () => {
    expect(MatMN.__name__).toEqual(["nape", "geom", "MatMN"]);
  });

  // --- __class__ ---

  it("should have __class__ set on prototype", () => {
    const m = new MatMN(1, 1);
    expect((m as any).__class__).toBe(MatMN);
  });
});
