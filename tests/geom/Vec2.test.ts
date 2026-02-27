import { describe, it, expect, beforeAll } from "vitest";
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
});
