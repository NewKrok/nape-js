/**
 * GeomPoly construction from the different vertex sources, weak-input
 * consumption, empty/degenerate polygons and output-list reuse.
 */
import { describe, it, expect } from "vitest";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";
import { Vec2List } from "../../src/geom/Vec2List";
import { Winding } from "../../src/geom/Winding";
import { GeomPolyList } from "../../src/util/registerLists";
import "../../src/index";

const square = () => [new Vec2(0, 0), new Vec2(10, 0), new Vec2(10, 10), new Vec2(0, 10)];

describe("construction from a Vec2List", () => {
  it("copies the vertices of a Vec2List", () => {
    const list = Vec2List.fromArray(square());
    const poly = new GeomPoly(list);
    expect(poly.size()).toBe(4);
    expect(poly.area()).toBeCloseTo(100, 6);
    // The Vec2List is left intact.
    expect(list.length).toBe(4);
  });

  it("disposes weak vertices held in a Vec2List and removes them from the list", () => {
    const list = new Vec2List();
    const weak = Vec2.weak(0, 0);
    list.push(weak);
    list.push(new Vec2(10, 0));
    list.push(new Vec2(10, 10));
    const poly = new GeomPoly(list);
    expect(poly.size()).toBe(3);
    expect(weak.zpp_disp).toBe(true);
    expect(list.length).toBe(2);
  });

  it("rejects a Vec2List containing a disposed Vec2", () => {
    const list = new Vec2List();
    const dead = new Vec2(1, 1);
    list.push(dead);
    list.pop();
    dead.dispose();
    const bad = Vec2List.fromArray([new Vec2(0, 0), new Vec2(1, 0)]);
    (bad as any).zpp_inner.inner.add(dead.zpp_inner ?? { x: 0, y: 0 });
    expect(() => new GeomPoly(square().concat([dead]))).toThrow(/disposed/);
  });

  it("consumes weak vertices given in an array", () => {
    const verts = [Vec2.weak(0, 0), new Vec2(10, 0), Vec2.weak(10, 10), new Vec2(0, 10)];
    const poly = new GeomPoly(verts);
    expect(poly.size()).toBe(4);
    expect(verts).toHaveLength(2); // the weak ones were spliced out
    expect(verts.every((v) => !v.zpp_disp)).toBe(true);
  });

  it("copies from another GeomPoly and from GeomPoly.get()", () => {
    const src = new GeomPoly(square());
    const copy = new GeomPoly(src);
    expect(copy.size()).toBe(4);
    expect(copy.area()).toBeCloseTo(src.area(), 6);
    const pooled = GeomPoly.get(Vec2List.fromArray(square()));
    expect(pooled.size()).toBe(4);
    pooled.dispose();
  });
});

describe("empty and degenerate polygons", () => {
  it("names the missing extreme when asked on an empty polygon", () => {
    const empty = new GeomPoly();
    expect(() => empty.top()).toThrow(/topmost/);
    expect(() => empty.bottom()).toThrow(/bottommost/);
    expect(() => empty.left()).toThrow(/leftmost/);
    expect(() => empty.right()).toThrow(/rightmost/);
  });

  it("clear() on a single-vertex polygon leaves it empty", () => {
    const one = new GeomPoly([new Vec2(1, 2)]);
    expect(one.size()).toBe(1);
    one.clear();
    expect(one.empty()).toBe(true);
    expect(one.size()).toBe(0);
  });

  it("a two-vertex ring is degenerate but still answers the predicates", () => {
    const ring = new GeomPoly([new Vec2(0, 0), new Vec2(10, 0)]);
    expect(ring.isDegenerate()).toBe(true);
    expect(ring.isConvex()).toBe(true);
    expect(ring.isSimple()).toBe(true);
    expect(ring.isMonotone()).toBe(true);
    expect(ring.winding()).toBe(Winding.UNDEFINED);
    const simplified = ring.simplify(1);
    expect(simplified).not.toBe(ring);
    expect(simplified.size()).toBe(2);
  });

  it("winding distinguishes the two orientations", () => {
    const ccw = new GeomPoly(square());
    const cw = new GeomPoly(square().reverse());
    expect(ccw.winding()).not.toBe(cw.winding());
    expect([ccw.winding(), cw.winding()]).toContain(Winding.CLOCKWISE);
    expect([ccw.winding(), cw.winding()]).toContain(Winding.ANTICLOCKWISE);
    expect(ccw.isClockwise()).not.toBe(cw.isClockwise());
  });

  it("contains() consumes a weak point", () => {
    const poly = new GeomPoly(square());
    const inside = Vec2.weak(5, 5);
    const outside = Vec2.weak(50, 50);
    expect(poly.contains(inside)).toBe(true);
    expect(poly.contains(outside)).toBe(false);
    expect(inside.zpp_disp).toBe(true);
    expect(outside.zpp_disp).toBe(true);
  });
});

describe("output lists and weak cut endpoints", () => {
  const lShape = () =>
    new GeomPoly([
      new Vec2(0, 0),
      new Vec2(20, 0),
      new Vec2(20, 10),
      new Vec2(10, 10),
      new Vec2(10, 20),
      new Vec2(0, 20),
    ]);

  it("decompositions append to a caller-provided GeomPolyList", () => {
    const out = new GeomPolyList();
    lShape().simpleDecomposition(out);
    const n1 = out.length;
    expect(n1).toBeGreaterThanOrEqual(1);
    lShape().monotoneDecomposition(out);
    const n2 = out.length;
    expect(n2).toBeGreaterThan(n1);
    lShape().convexDecomposition(false, out);
    const n3 = out.length;
    expect(n3).toBeGreaterThan(n2);
    lShape().triangularDecomposition(true, out);
    expect(out.length).toBeGreaterThan(n3);
    let area = 0;
    for (const p of out as Iterable<GeomPoly>) area += Math.abs(p.area());
    // Four decompositions of the same 300-unit shape.
    expect(area).toBeCloseTo(4 * 300, 3);
  });

  it("cut() consumes weak start/end points and accumulates into an output list", () => {
    const out = new GeomPolyList();
    const start = Vec2.weak(-5, 5);
    const end = Vec2.weak(25, 5);
    const pieces = lShape().cut(start, end, false, false, out);
    expect(pieces).toBe(out);
    expect(start.zpp_disp).toBe(true);
    expect(end.zpp_disp).toBe(true);
    expect(out.length).toBe(2);
    let area = 0;
    for (const p of out as Iterable<GeomPoly>) area += Math.abs(p.area());
    expect(area).toBeCloseTo(300, 3);
  });
});
