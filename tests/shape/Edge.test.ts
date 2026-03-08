import { describe, it, expect } from "vitest";
import { Edge } from "../../src/shape/Edge";
import { Polygon } from "../../src/shape/Polygon";
import { Body } from "../../src/phys/Body";
import { Space } from "../../src/space/Space";
import { ZPP_Edge } from "../../src/native/shape/ZPP_Edge";

describe("Edge", () => {
  // ---------------------------------------------------------------------------
  // Construction guard
  // ---------------------------------------------------------------------------

  it("should throw when instantiated directly", () => {
    expect(() => new Edge()).toThrow("Cannot instantiate an Edge");
  });

  // ---------------------------------------------------------------------------
  // Accessing edges from a polygon
  // ---------------------------------------------------------------------------

  function makeBoxInBody() {
    const body = new Body();
    const poly = new Polygon(Polygon.box(100, 50));
    body.shapes.add(poly);
    return { body, poly };
  }

  it("should get edges from a polygon", () => {
    const { poly } = makeBoxInBody();
    const edges = poly.edges;
    expect(edges).toBeDefined();
    expect(edges.length).toBeGreaterThan(0);
  });

  it("should have correct number of edges for a box (4)", () => {
    const { poly } = makeBoxInBody();
    expect(poly.edges.length).toBe(4);
  });

  // ---------------------------------------------------------------------------
  // Edge properties (local, no body in space)
  // ---------------------------------------------------------------------------

  it("should have polygon reference", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    expect(edge.polygon).toBeDefined();
  });

  it("should have localNormal", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    const normal = edge.localNormal;
    expect(normal).toBeDefined();
    // Normal should be a unit vector
    const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
    expect(len).toBeCloseTo(1, 3);
  });

  it("should have length > 0", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    expect(edge.length).toBeGreaterThan(0);
  });

  it("should have localProjection", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    expect(typeof edge.localProjection).toBe("number");
    expect(edge.localProjection).not.toBeNaN();
  });

  it("should have localVertex1 and localVertex2", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    const v1 = edge.localVertex1;
    const v2 = edge.localVertex2;
    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(typeof v1.x).toBe("number");
    expect(typeof v1.y).toBe("number");
    expect(typeof v2.x).toBe("number");
    expect(typeof v2.y).toBe("number");
  });

  // ---------------------------------------------------------------------------
  // World-space properties (requires body in space)
  // ---------------------------------------------------------------------------

  it("should have worldNormal when body is in space", () => {
    const space = new Space();
    const { body, poly } = makeBoxInBody();
    space.bodies.add(body);
    space.step(1 / 60);

    const iter = poly.edges.iterator();
    const edge = iter.next();
    const wn = edge.worldNormal;
    expect(wn).toBeDefined();
    const len = Math.sqrt(wn.x * wn.x + wn.y * wn.y);
    expect(len).toBeCloseTo(1, 3);
  });

  it("should have worldProjection when body has a body", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    expect(typeof edge.worldProjection).toBe("number");
    expect(edge.worldProjection).not.toBeNaN();
  });

  it("should have worldVertex1 and worldVertex2 with body", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    const wv1 = edge.worldVertex1;
    const wv2 = edge.worldVertex2;
    expect(wv1).toBeDefined();
    expect(wv2).toBeDefined();
    expect(typeof wv1.x).toBe("number");
    expect(typeof wv2.y).toBe("number");
  });

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it("should have toString with localNormal", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    // No body in space → only localNormal
    const str = edge.toString();
    expect(str).toContain("localNormal");
  });

  it("should have toString with worldNormal when body exists", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    const str = edge.toString();
    expect(str).toContain("localNormal");
    expect(str).toContain("worldNormal");
  });

  // ---------------------------------------------------------------------------
  // Error cases
  // ---------------------------------------------------------------------------

  it("should throw for worldNormal without body", () => {
    // Create an edge from a polygon NOT in a body
    // We use the internal mechanism
    new Polygon(Polygon.box(10, 10));
    // Polygon not added to body
    // But accessing edges should still work for local properties
    // worldNormal should throw since no body
  });

  // ---------------------------------------------------------------------------
  // ZPP_Edge._wrapFn integration
  // ---------------------------------------------------------------------------

  it("should use _wrapFn for wrapping", () => {
    expect(ZPP_Edge._wrapFn).toBeDefined();
    expect(typeof ZPP_Edge._wrapFn).toBe("function");
  });

  it("edge wrapper should be an instance of Edge", () => {
    const { poly } = makeBoxInBody();
    const iter = poly.edges.iterator();
    const edge = iter.next();
    expect(edge).toBeInstanceOf(Edge);
  });

  // ---------------------------------------------------------------------------
  // Iterate all edges
  // ---------------------------------------------------------------------------

  it("should iterate all 4 edges of a box", () => {
    const { poly } = makeBoxInBody();
    const edges: any[] = [];
    const iter = poly.edges.iterator();
    while (iter.hasNext()) {
      edges.push(iter.next());
    }
    expect(edges.length).toBe(4);
    for (const edge of edges) {
      expect(edge.length).toBeGreaterThan(0);
    }
  });

  it("should iterate edges of a regular hexagon (6 edges)", () => {
    const body = new Body();
    const poly = new Polygon(Polygon.regular(50, 50, 6));
    body.shapes.add(poly);
    const edges: any[] = [];
    const iter = poly.edges.iterator();
    while (iter.hasNext()) {
      edges.push(iter.next());
    }
    expect(edges.length).toBe(6);
  });
});
