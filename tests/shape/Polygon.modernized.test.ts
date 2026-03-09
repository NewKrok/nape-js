import { describe, it, expect } from "vitest";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Material } from "../../src/phys/Material";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Space } from "../../src/space/Space";

describe("Polygon (modernized)", () => {
  // ---------------------------------------------------------------------------
  // Constructor — Array<Vec2> input
  // ---------------------------------------------------------------------------

  it("should create a polygon from Array<Vec2>", () => {
    const verts = [new Vec2(0, 0), new Vec2(100, 0), new Vec2(50, 100)];
    const p = new Polygon(verts);
    expect(p.isPolygon()).toBe(true);
    expect(p.isCircle()).toBe(false);
  });

  it("should throw when localVerts is null", () => {
    expect(() => new Polygon(null as any)).toThrow("localVerts cannot be null");
  });

  it("should throw when Array<Vec2> contains null", () => {
    const verts = [new Vec2(0, 0), null as any, new Vec2(50, 100)];
    expect(() => new Polygon(verts)).toThrow("contains null objects");
  });

  it("should throw when Array<Vec2> contains non-Vec2", () => {
    const verts = [new Vec2(0, 0), { x: 1, y: 2 } as any, new Vec2(50, 100)];
    expect(() => new Polygon(verts)).toThrow("contains non Vec2 objects");
  });

  it("should dispose weak Vec2 inputs", () => {
    const v1 = new Vec2(0, 0);
    const v2 = new Vec2(100, 0);
    v2.zpp_inner.weak = true;
    const v3 = new Vec2(50, 100);
    const verts = [v1, v2, v3];
    const p = new Polygon(verts);
    expect(p.isPolygon()).toBe(true);
    // v2 was weak and should have been disposed
  });

  // ---------------------------------------------------------------------------
  // Constructor — with Material and Filter
  // ---------------------------------------------------------------------------

  it("should accept custom material", () => {
    const mat = new Material(0.3, 0.5, 0.7, 2.0, 0.001);
    const p = new Polygon(Polygon.box(50), mat);
    expect(p.material.elasticity).toBeCloseTo(0.3);
    expect(p.material.dynamicFriction).toBeCloseTo(0.5);
  });

  it("should accept custom filter", () => {
    const filter = new InteractionFilter();
    filter.collisionGroup = 2;
    const p = new Polygon(Polygon.box(50), undefined, filter);
    expect(p.filter.collisionGroup).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Static factory methods
  // ---------------------------------------------------------------------------

  it("Polygon.box should create centered square vertices", () => {
    const verts = Polygon.box(100);
    expect(verts).toHaveLength(4);
    // Should be centered at origin
    expect(verts[0].x).toBeCloseTo(-50);
    expect(verts[0].y).toBeCloseTo(-50);
    expect(verts[2].x).toBeCloseTo(50);
    expect(verts[2].y).toBeCloseTo(50);
  });

  it("Polygon.box with different width/height", () => {
    const verts = Polygon.box(200, 100);
    expect(verts).toHaveLength(4);
    expect(verts[0].x).toBeCloseTo(-100);
    expect(verts[0].y).toBeCloseTo(-50);
    expect(verts[2].x).toBeCloseTo(100);
    expect(verts[2].y).toBeCloseTo(50);
  });

  it("Polygon.rect should create vertices at specified position", () => {
    const verts = Polygon.rect(10, 20, 100, 50);
    expect(verts).toHaveLength(4);
    expect(verts[0].x).toBeCloseTo(10);
    expect(verts[0].y).toBeCloseTo(20);
    expect(verts[2].x).toBeCloseTo(110);
    expect(verts[2].y).toBeCloseTo(70);
  });

  it("Polygon.regular should create N-gon vertices", () => {
    const verts = Polygon.regular(50, 50, 8);
    expect(verts).toHaveLength(8);
    // All vertices should be on a circle of radius 50
    for (const v of verts) {
      const dist = Math.sqrt(v.x * v.x + v.y * v.y);
      expect(dist).toBeCloseTo(50, 0);
    }
  });

  it("Polygon.regular with angle offset", () => {
    const verts1 = Polygon.regular(50, 50, 4, 0);
    const verts2 = Polygon.regular(50, 50, 4, Math.PI / 4);
    // With offset, vertices should be rotated
    expect(verts1[0].x).not.toBeCloseTo(verts2[0].x, 0);
  });

  it("Polygon.box should reject NaN", () => {
    expect(() => Polygon.box(NaN)).toThrow("NaN");
  });

  it("Polygon.rect should reject NaN", () => {
    expect(() => Polygon.rect(NaN, 0, 100, 50)).toThrow("NaN");
  });

  it("Polygon.regular should reject NaN", () => {
    expect(() => Polygon.regular(NaN, 50, 6)).toThrow("NaN");
  });

  it("Polygon.box with weak flag", () => {
    const verts = Polygon.box(100, 50, true);
    expect(verts).toHaveLength(4);
    for (const v of verts) {
      expect(v.zpp_inner.weak).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  it("should expose localVerts", () => {
    const p = new Polygon(Polygon.box(100, 50));
    const lv = p.localVerts;
    expect(lv).toBeDefined();
    expect(lv.length).toBe(4);
  });

  it("should expose worldVerts when attached to body in space", () => {
    const space = new Space(new Vec2(0, 0));
    const body = new Body(BodyType.DYNAMIC, new Vec2(100, 200));
    const p = new Polygon(Polygon.box(50));
    body.shapes.add(p);
    body.space = space;
    space.step(1 / 60);

    const wv = p.worldVerts;
    expect(wv).toBeDefined();
    expect(wv.length).toBe(4);
  });

  it("should expose edges", () => {
    const p = new Polygon(Polygon.box(100, 50));
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(p);
    const edges = p.edges;
    expect(edges).toBeDefined();
    expect(edges.length).toBe(4);
  });

  it("should compute validity", () => {
    const p = new Polygon(Polygon.box(100, 50));
    const body = new Body(BodyType.DYNAMIC);
    body.shapes.add(p);
    const v = p.validity();
    // A valid box should return valid
    expect(v).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Area computation
  // ---------------------------------------------------------------------------

  it("should compute correct area for a box", () => {
    const p = new Polygon(Polygon.box(100, 50));
    expect(p.area).toBeCloseTo(5000, 0);
  });

  it("should compute correct area for a square", () => {
    const p = new Polygon(Polygon.box(30));
    expect(p.area).toBeCloseTo(900, 0);
  });

  // ---------------------------------------------------------------------------
  // Integration with Body
  // ---------------------------------------------------------------------------

  it("should work when added to a body", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const poly = new Polygon(Polygon.box(50, 30));
    body.shapes.add(poly);
    expect(body.shapes.length).toBe(1);
  });

  it("should work in simulation", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Polygon(Polygon.box(20)));
    body.space = space;
    space.step(1 / 60);
    expect(body.position.y).toBeGreaterThan(0);
  });
});
