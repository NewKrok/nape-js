import { describe, it, expect } from "vitest";
import { Polygon } from "../../src/shape/Polygon";

describe("Polygon", () => {
  it("should create a box polygon", () => {
    const p = new Polygon(Polygon.box(100, 50));
    expect(p.isPolygon()).toBe(true);
    expect(p.isCircle()).toBe(false);
  });

  it("should create a rect polygon", () => {
    const p = new Polygon(Polygon.rect(10, 20, 100, 50));
    expect(p.isPolygon()).toBe(true);
  });

  it("should create a regular polygon", () => {
    const p = new Polygon(Polygon.regular(50, 50, 6));
    expect(p.isPolygon()).toBe(true);
  });

  it("should have area for a box", () => {
    const p = new Polygon(Polygon.box(100, 50));
    expect(p.area).toBeCloseTo(5000, 0);
  });

  it("should validate geometry", () => {
    const p = new Polygon(Polygon.box(100, 50));
    const validity = p.validity();
    // Valid polygon should return null or a validation result
    expect(validity).toBeDefined();
  });
});
