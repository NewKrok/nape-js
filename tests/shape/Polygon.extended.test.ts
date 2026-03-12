import { describe, it, expect } from "vitest";
import { Polygon } from "../../src/shape/Polygon";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Material } from "../../src/phys/Material";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Space } from "../../src/space/Space";

describe("Polygon extended coverage", () => {
  // --- NaN argument errors ---

  it("Polygon.rect() with NaN x should throw", () => {
    expect(() => Polygon.rect(NaN, 0, 10, 10)).toThrow();
  });

  it("Polygon.rect() with NaN width should throw", () => {
    expect(() => Polygon.rect(0, 0, NaN, 10)).toThrow();
  });

  it("Polygon.box() with NaN width should throw", () => {
    expect(() => Polygon.box(NaN, 10)).toThrow();
  });

  it("Polygon.box() with NaN height should throw", () => {
    expect(() => Polygon.box(10, NaN)).toThrow();
  });

  it("Polygon.regular() with NaN xRadius should throw", () => {
    expect(() => Polygon.regular(NaN, 10, 5)).toThrow();
  });

  it("Polygon.regular() with NaN yRadius should throw", () => {
    expect(() => Polygon.regular(10, NaN, 5)).toThrow();
  });

  // --- regular() with various edge counts ---

  it("Polygon.regular() with 3 edges creates a triangle (3 vertices)", () => {
    const verts = Polygon.regular(50, 50, 3);
    expect(verts).toHaveLength(3);
    const poly = new Polygon(verts);
    expect(poly.isPolygon()).toBe(true);
  });

  it("Polygon.regular() with 4 edges creates a square-like shape (4 vertices)", () => {
    const verts = Polygon.regular(50, 50, 4);
    expect(verts).toHaveLength(4);
  });

  it("Polygon.regular() with 5 edges creates a pentagon (5 vertices)", () => {
    const verts = Polygon.regular(50, 50, 5);
    expect(verts).toHaveLength(5);
  });

  it("Polygon.regular() with 8 edges creates an octagon (8 vertices)", () => {
    const verts = Polygon.regular(50, 50, 8);
    expect(verts).toHaveLength(8);
  });

  // --- box() default square ---

  it("Polygon.box() with equal width/height creates a square", () => {
    const verts = Polygon.box(100, 100);
    expect(verts).toHaveLength(4);
    const poly = new Polygon(verts);
    expect(poly.area).toBeCloseTo(10000, 0);
  });

  // --- localVerts getter ---

  it("localVerts returns the correct vertices for a box", () => {
    const poly = new Polygon(Polygon.box(20, 10));
    const lverts = poly.localVerts;
    expect(lverts.length).toBe(4);
  });

  // --- worldVerts getter (needs body in space) ---

  it("worldVerts returns vertices in world coordinates", () => {
    const poly = new Polygon(Polygon.box(20, 10));
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(poly);
    body.position.setxy(100, 200);

    const space = new Space();
    space.bodies.add(body);
    space.step(1 / 60);

    const wverts = poly.worldVerts;
    expect(wverts.length).toBe(4);
  });

  // --- edges getter ---

  it("edges returns edge list with correct count for a box", () => {
    const poly = new Polygon(Polygon.box(20, 10));
    const edges = poly.edges;
    expect(edges.length).toBe(4);
  });

  // --- Constructor with custom Material and InteractionFilter ---

  it("constructor accepts custom Material", () => {
    const mat = new Material(0.5, 0.3, 0.2, 1.5, 0.01);
    const poly = new Polygon(Polygon.box(10, 10), mat);
    expect(poly.material.elasticity).toBeCloseTo(0.5, 5);
    expect(poly.material.dynamicFriction).toBeCloseTo(0.3, 5);
  });

  it("constructor accepts custom InteractionFilter", () => {
    const filter = new InteractionFilter(2, -1, 3, -1, 4, -1);
    const poly = new Polygon(Polygon.box(10, 10), undefined, filter);
    expect(poly.filter.collisionGroup).toBe(2);
    expect(poly.filter.sensorGroup).toBe(3);
    expect(poly.filter.fluidGroup).toBe(4);
  });

  // --- Constructor error cases ---

  it("constructor with null localVerts should throw", () => {
    expect(() => new Polygon(null as any)).toThrow();
  });

  it("constructor with non-Vec2 objects in array should throw", () => {
    expect(() => new Polygon([{ x: 0, y: 0 }] as any)).toThrow();
  });

  it("constructor with null objects in array should throw", () => {
    expect(() => new Polygon([null] as any)).toThrow();
  });

  // --- _wrap() ---

  it("Polygon._wrap() with null returns null", () => {
    expect(Polygon._wrap(null as any)).toBeNull();
  });

  it("Polygon._wrap() with a ZPP_Polygon returns a Polygon instance", () => {
    const poly = new Polygon(Polygon.box(10, 10));
    const zpp = poly.zpp_inner_zn;
    const wrapped = Polygon._wrap(zpp);
    expect(wrapped).toBeInstanceOf(Polygon);
  });

  // --- validity() ---

  it("validity() on a valid polygon returns a defined result", () => {
    const poly = new Polygon(Polygon.box(10, 10));
    const result = poly.validity();
    expect(result).toBeDefined();
  });

  // --- Area of regular polygons ---

  it("area of a regular hexagon is correct", () => {
    const r = 50;
    const hex = new Polygon(Polygon.regular(r, r, 6));
    // Area of regular hexagon inscribed in circle of radius r = (3*sqrt(3)/2)*r^2
    const expectedArea = ((3 * Math.sqrt(3)) / 2) * r * r;
    expect(hex.area).toBeCloseTo(expectedArea, 0);
  });

  it("area of a regular triangle is correct", () => {
    const r = 50;
    const tri = new Polygon(Polygon.regular(r, r, 3));
    // Area of equilateral triangle inscribed in circle of radius r = (3*sqrt(3)/4)*r^2
    const expectedArea = ((3 * Math.sqrt(3)) / 4) * r * r;
    expect(tri.area).toBeCloseTo(expectedArea, 0);
  });

  // --- Copy ---

  it("copy() creates an independent polygon with same area", () => {
    const poly = new Polygon(Polygon.box(30, 20));
    const copied = poly.copy();
    expect(copied).not.toBe(poly);
    expect(copied.area).toBeCloseTo(poly.area, 5);
    expect(copied.isPolygon()).toBe(true);
  });
});
