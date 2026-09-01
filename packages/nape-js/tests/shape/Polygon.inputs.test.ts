import { describe, it, expect } from "vitest";
import { getNape } from "../../src/core/engine";
import { Vec2 } from "../../src/geom/Vec2";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Polygon } from "../../src/shape/Polygon";

const nape = getNape();

const boxCoords: [number, number][] = [
  [0, 0],
  [20, 0],
  [20, 20],
  [0, 20],
];

describe("Polygon vertex inputs", () => {
  it("accepts a Vec2List and copies its vertices", () => {
    const list = nape.geom.Vec2List.fromArray(boxCoords.map(([x, y]) => new Vec2(x, y)));
    const poly = new Polygon(list);
    expect(poly.localVerts.length).toBe(4);
    expect(poly.localVerts.at(1).x).toBeCloseTo(20);
    // Source list unchanged: strong vertices are not consumed.
    expect(list.length).toBe(4);
  });

  it("disposes weak vertices from a Vec2List input", () => {
    const list = nape.geom.Vec2List.fromArray([
      new Vec2(0, 0),
      Vec2.weak(20, 0),
      new Vec2(20, 20),
      new Vec2(0, 20),
    ]);
    const poly = new Polygon(list);
    expect(poly.localVerts.length).toBe(4);
    // The weak vertex is removed from the source list after use.
    expect(list.length).toBe(3);
  });

  it("accepts a GeomPoly and copies its vertices", () => {
    const gp = new GeomPoly(boxCoords.map(([x, y]) => Vec2.get(x, y)));
    const poly = new Polygon(gp);
    expect(poly.localVerts.length).toBe(4);
    expect(poly.localVerts.at(2).x).toBeCloseTo(20);
    expect(poly.localVerts.at(2).y).toBeCloseTo(20);
  });

  it("accepts an empty GeomPoly, producing no vertices", () => {
    const poly = new Polygon(new GeomPoly());
    expect(poly.localVerts.length).toBe(0);
  });

  it("disposes weak vertices from an Array input", () => {
    const strong = new Vec2(0, 0);
    const weak = Vec2.weak(20, 0);
    const poly = new Polygon([strong, weak, new Vec2(20, 20), new Vec2(0, 20)]);
    expect(poly.localVerts.length).toBe(4);
    expect((weak as any).zpp_disp).toBe(true);
    expect((strong as any).zpp_disp).toBeFalsy();
  });

  it("rejects invalid vertex container types", () => {
    expect(() => new Polygon(42 as any)).toThrow("Invalid type");
    expect(() => new Polygon("verts" as any)).toThrow("Invalid type");
  });

  it("rejects null and non-Vec2 entries in an Array input", () => {
    expect(() => new Polygon([new Vec2(0, 0), null as any])).toThrow("null objects");
    expect(() => new Polygon([new Vec2(0, 0), {} as any])).toThrow("non Vec2 objects");
  });

  it("rejects a disposed Vec2 in an Array input", () => {
    const v = Vec2.get(1, 2);
    v.dispose();
    expect(() => new Polygon([v])).toThrow("disposed");
  });
});

describe("Polygon._wrap", () => {
  it("returns null for null input", () => {
    expect(Polygon._wrap(null)).toBeNull();
  });

  it("returns the same instance for an already-wrapped Polygon", () => {
    const poly = new Polygon(Polygon.box(10, 10));
    expect(Polygon._wrap(poly)).toBe(poly);
  });

  it("re-wraps through a holder exposing zpp_inner_zn", () => {
    const poly = new Polygon(Polygon.box(10, 10));
    const holder = { zpp_inner_zn: (poly as any).zpp_inner_zn };
    const wrapped = Polygon._wrap(holder);
    expect(wrapped).toBeInstanceOf(Polygon);
    expect((wrapped as any).zpp_inner_zn ?? (wrapped as any)._inner ?? wrapped).toBeDefined();
  });

  it("falls back to a generic wrapper for unknown inner objects", () => {
    const raw = { zpp_inner_i: {} as any };
    const wrapped = Polygon._wrap(raw);
    expect(wrapped).toBeInstanceOf(Polygon);
  });
});
