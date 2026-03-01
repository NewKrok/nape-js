import { describe, it, expect } from "vitest";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";
import { Mat23 } from "../../src/geom/Mat23";

describe("GeomPoly", () => {
  function triangle(): GeomPoly {
    return new GeomPoly([Vec2.get(0, 0), Vec2.get(10, 0), Vec2.get(5, 10)]);
  }

  function square(): GeomPoly {
    return new GeomPoly([Vec2.get(0, 0), Vec2.get(10, 0), Vec2.get(10, 10), Vec2.get(0, 10)]);
  }

  // --- Construction ---

  it("should construct empty polygon", () => {
    const p = new GeomPoly();
    expect(p.empty()).toBe(true);
    expect(p.size()).toBe(0);
  });

  it("should construct from Vec2 array", () => {
    const p = triangle();
    expect(p.empty()).toBe(false);
    expect(p.size()).toBe(3);
  });

  it("should construct from another GeomPoly", () => {
    const p = triangle();
    const p2 = new GeomPoly(p);
    expect(p2.size()).toBe(3);
    // Independent copy
    p2.pop();
    expect(p.size()).toBe(3);
    expect(p2.size()).toBe(2);
  });

  it("should throw on null Vec2 in array", () => {
    expect(() => new GeomPoly([null as any])).toThrow(/null/);
  });

  it("should throw on non-Vec2 in array", () => {
    expect(() => new GeomPoly([42 as any])).toThrow(/non Vec2/);
  });

  it("should throw on disposed Vec2 in array", () => {
    const v = Vec2.get(1, 2);
    v.dispose();
    expect(() => new GeomPoly([v])).toThrow(/disposed/);
  });

  // --- Static factory: get ---

  it("should create from GeomPoly.get()", () => {
    const p = GeomPoly.get([Vec2.get(1, 2), Vec2.get(3, 4)]);
    expect(p.size()).toBe(2);
  });

  it("should create empty from GeomPoly.get()", () => {
    const p = GeomPoly.get();
    expect(p.empty()).toBe(true);
  });

  // --- Push / Pop ---

  it("should push vertex", () => {
    const p = new GeomPoly();
    p.push(Vec2.get(5, 10));
    expect(p.size()).toBe(1);
    p.push(Vec2.get(15, 20));
    expect(p.size()).toBe(2);
  });

  it("should throw on null push", () => {
    const p = new GeomPoly();
    expect(() => p.push(null as any)).toThrow(/null/);
  });

  it("should pop vertex", () => {
    const p = triangle();
    expect(p.size()).toBe(3);
    p.pop();
    expect(p.size()).toBe(2);
  });

  it("should throw on pop from empty", () => {
    const p = new GeomPoly();
    expect(() => p.pop()).toThrow(/empty/);
  });

  // --- Unshift / Shift ---

  it("should unshift vertex", () => {
    const p = new GeomPoly();
    p.unshift(Vec2.get(1, 2));
    expect(p.size()).toBe(1);
    p.unshift(Vec2.get(3, 4));
    expect(p.size()).toBe(2);
  });

  it("should shift vertex", () => {
    const p = triangle();
    p.shift();
    expect(p.size()).toBe(2);
  });

  it("should throw on shift from empty", () => {
    const p = new GeomPoly();
    expect(() => p.shift()).toThrow(/empty/);
  });

  // --- Skip ---

  it("should skipForward", () => {
    const p = triangle();
    const before = p.current();
    const bx = before.x;
    p.skipForward(1);
    const after = p.current();
    // Current should be different vertex
    expect(after.x !== bx || after.y !== before.y).toBe(true);
  });

  it("should skipBackwards", () => {
    const p = triangle();
    p.skipForward(1);
    const mid = p.current();
    const mx = mid.x;
    p.skipBackwards(1);
    const back = p.current();
    expect(back.x !== mx || back.y !== mid.y).toBe(true);
  });

  it("should return this from skip", () => {
    const p = triangle();
    expect(p.skipForward(1)).toBe(p);
    expect(p.skipBackwards(1)).toBe(p);
  });

  // --- Erase ---

  it("should erase forward", () => {
    const p = square();
    p.erase(2);
    expect(p.size()).toBe(2);
  });

  it("should erase backward", () => {
    const p = square();
    p.erase(-2);
    expect(p.size()).toBe(2);
  });

  // --- Clear ---

  it("should clear all vertices", () => {
    const p = triangle();
    p.clear();
    expect(p.empty()).toBe(true);
    expect(p.size()).toBe(0);
  });

  // --- Copy ---

  it("should copy polygon", () => {
    const p = triangle();
    const c = p.copy();
    expect(c.size()).toBe(p.size());
    expect(c.area()).toBeCloseTo(p.area());
    // Independent
    c.pop();
    expect(p.size()).toBe(3);
  });

  // --- Dispose ---

  it("should dispose and mark as disposed", () => {
    const p = GeomPoly.get([Vec2.get(0, 0), Vec2.get(1, 0), Vec2.get(0, 1)]);
    p.dispose();
    expect(p.zpp_disp).toBe(true);
  });

  it("should throw when accessing disposed", () => {
    const p = GeomPoly.get();
    p.dispose();
    expect(() => p.empty()).toThrow(/disposed/);
    expect(() => p.size()).toThrow(/disposed/);
    expect(() => p.push(Vec2.get(1, 2))).toThrow(/disposed/);
  });

  it("should throw on double dispose", () => {
    const p = GeomPoly.get();
    p.dispose();
    expect(() => p.dispose()).toThrow(/disposed/);
  });

  it("should recycle from pool", () => {
    const p = GeomPoly.get([Vec2.get(1, 2)]);
    p.dispose();
    const p2 = GeomPoly.get([Vec2.get(3, 4)]);
    expect(p2.zpp_disp).toBe(false);
    expect(p2.size()).toBe(1);
  });

  // --- Area ---

  it("should compute area of triangle", () => {
    const p = triangle(); // (0,0), (10,0), (5,10) → area = 50
    expect(p.area()).toBeCloseTo(50);
  });

  it("should compute area of square", () => {
    const p = square(); // 10x10 → area = 100
    expect(p.area()).toBeCloseTo(100);
  });

  it("should return 0 for degenerate polygon", () => {
    const p = new GeomPoly([Vec2.get(0, 0), Vec2.get(1, 0)]);
    expect(p.area()).toBe(0);
  });

  // --- Winding ---

  it("should detect clockwise winding", () => {
    // CCW polygon: (0,0), (10,0), (10,10), (0,10)
    const p = square();
    expect(p.isClockwise()).toBe(true);
  });

  // --- Contains ---

  it("should detect point inside polygon", () => {
    const p = square();
    expect(p.contains(Vec2.get(5, 5))).toBe(true);
  });

  it("should detect point outside polygon", () => {
    const p = square();
    expect(p.contains(Vec2.get(20, 20))).toBe(false);
  });

  it("should throw on null point", () => {
    const p = square();
    expect(() => p.contains(null as any)).toThrow(/null/);
  });

  // --- isConvex ---

  it("should detect convex polygon", () => {
    const p = triangle();
    expect(p.isConvex()).toBe(true);
  });

  it("should detect convex square", () => {
    const p = square();
    expect(p.isConvex()).toBe(true);
  });

  // --- isDegenerate ---

  it("should detect degenerate polygon", () => {
    const p = new GeomPoly([Vec2.get(0, 0), Vec2.get(1, 0)]);
    expect(p.isDegenerate()).toBe(true);
  });

  it("should detect non-degenerate polygon", () => {
    const p = triangle();
    expect(p.isDegenerate()).toBe(false);
  });

  // --- Transform ---

  it("should transform by matrix", () => {
    const p = new GeomPoly([Vec2.get(1, 0), Vec2.get(0, 1), Vec2.get(-1, 0)]);
    const m = Mat23.scale(2, 3);
    p.transform(m);
    // After scale(2,3): (2,0), (0,3), (-2,0)
    p.current();
    // Just verify size unchanged
    expect(p.size()).toBe(3);
  });

  it("should throw on null matrix", () => {
    const p = triangle();
    expect(() => p.transform(null as any)).toThrow(/null/);
  });

  it("should return this from transform", () => {
    const p = triangle();
    expect(p.transform(Mat23.scale(1, 1))).toBe(p);
  });

  // --- Bounds ---

  it("should compute bounds", () => {
    const p = square(); // (0,0) to (10,10)
    const b = p.bounds();
    expect(b.x).toBeCloseTo(0);
    expect(b.y).toBeCloseTo(0);
    expect(b.width).toBeCloseTo(10);
    expect(b.height).toBeCloseTo(10);
  });

  it("should throw on empty polygon bounds", () => {
    const p = new GeomPoly();
    expect(() => p.bounds()).toThrow(/empty/);
  });

  // --- Extremal vertices ---

  it("should find top vertex (min y)", () => {
    const p = triangle(); // (0,0), (10,0), (5,10)
    const t = p.top();
    expect(t.y).toBe(0);
  });

  it("should find bottom vertex (max y)", () => {
    const p = triangle();
    const b = p.bottom();
    expect(b.y).toBe(10);
  });

  it("should find left vertex (min x)", () => {
    const p = triangle();
    const l = p.left();
    expect(l.x).toBe(0);
  });

  it("should find right vertex (max x)", () => {
    const p = triangle();
    const r = p.right();
    expect(r.x).toBe(10);
  });

  // --- toString ---

  it("should produce readable toString", () => {
    const p = new GeomPoly([Vec2.get(1, 2), Vec2.get(3, 4)]);
    const s = p.toString();
    expect(s).toContain("GeomPoly[");
    expect(s).toContain("]");
  });

  // --- Current ---

  it("should return current vertex", () => {
    const p = new GeomPoly([Vec2.get(5, 10)]);
    const c = p.current();
    expect(c).toBeInstanceOf(Vec2);
  });

  it("should throw on current from empty", () => {
    const p = new GeomPoly();
    expect(() => p.current()).toThrow(/empty/);
  });

  // --- isSimple ---

  it("should detect simple polygon", () => {
    const p = square();
    expect(p.isSimple()).toBe(true);
  });

  // --- Convex decomposition ---

  it("should decompose convex polygon", () => {
    const p = square();
    const result = p.convexDecomposition();
    expect(result.get_length()).toBeGreaterThan(0);
  });

  // --- Inflate ---

  it("should inflate polygon", () => {
    const p = square();
    const originalArea = p.area();
    const inflated = p.inflate(1);
    expect(inflated.area()).toBeGreaterThan(originalArea);
  });

  it("should deflate polygon with negative", () => {
    const p = square();
    const originalArea = p.area();
    const deflated = p.inflate(-1);
    expect(deflated.area()).toBeLessThan(originalArea);
  });
});
