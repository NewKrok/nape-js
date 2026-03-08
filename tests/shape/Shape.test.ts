import { describe, it, expect } from "vitest";
import { Shape } from "../../src/shape/Shape";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Body } from "../../src/phys/Body";
import { Material } from "../../src/phys/Material";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Vec2 } from "../../src/geom/Vec2";
import { Space } from "../../src/space/Space";
import { Interactor } from "../../src/phys/Interactor";

describe("Shape", () => {
  // ---------------------------------------------------------------------------
  // Type identification
  // ---------------------------------------------------------------------------

  it("circle should report isCircle() = true, isPolygon() = false", () => {
    const c = new Circle(10);
    expect(c.isCircle()).toBe(true);
    expect(c.isPolygon()).toBe(false);
  });

  it("polygon should report isCircle() = false, isPolygon() = true", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(p.isCircle()).toBe(false);
    expect(p.isPolygon()).toBe(true);
  });

  it("circle type should be ShapeType.CIRCLE", () => {
    const c = new Circle(10);
    expect(c.type.toString()).toBe("CIRCLE");
  });

  it("polygon type should be ShapeType.POLYGON", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(p.type.toString()).toBe("POLYGON");
  });

  // ---------------------------------------------------------------------------
  // Inheritance
  // ---------------------------------------------------------------------------

  it("circle should be instance of Shape", () => {
    const c = new Circle(10);
    expect(c).toBeInstanceOf(Shape);
  });

  it("polygon should be instance of Shape", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(p).toBeInstanceOf(Shape);
  });

  it("circle should be instance of Interactor", () => {
    const c = new Circle(10);
    expect(c).toBeInstanceOf(Interactor);
  });

  // ---------------------------------------------------------------------------
  // Body association
  // ---------------------------------------------------------------------------

  it("body should be null when not added", () => {
    const c = new Circle(10);
    expect(c.body).toBeNull();
  });

  it("body should be set after adding to body", () => {
    const body = new Body();
    const c = new Circle(10);
    body.shapes.add(c);
    expect(c.body).toBeDefined();
    expect(c.body).toBeInstanceOf(Body);
  });

  // ---------------------------------------------------------------------------
  // Cast methods
  // ---------------------------------------------------------------------------

  it("castCircle should return the circle for a circle shape", () => {
    const c = new Circle(10);
    expect(c.castCircle).toBeDefined();
  });

  it("castCircle should return null for a polygon shape", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(p.castCircle).toBeNull();
  });

  it("castPolygon should return the polygon for a polygon shape", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(p.castPolygon).toBeDefined();
  });

  it("castPolygon should return null for a circle shape", () => {
    const c = new Circle(10);
    expect(c.castPolygon).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Area, inertia, angDrag
  // ---------------------------------------------------------------------------

  it("circle should have correct area (πr²)", () => {
    const c = new Circle(10);
    expect(c.area).toBeCloseTo(Math.PI * 100, 0);
  });

  it("polygon should have correct area", () => {
    const p = new Polygon(Polygon.box(100, 50));
    expect(p.area).toBeCloseTo(5000, 0);
  });

  it("should have positive inertia", () => {
    const c = new Circle(10);
    expect(c.inertia).toBeGreaterThan(0);
  });

  it("should have defined angDrag", () => {
    const c = new Circle(10);
    expect(typeof c.angDrag).toBe("number");
  });

  // ---------------------------------------------------------------------------
  // Material
  // ---------------------------------------------------------------------------

  it("should have default material", () => {
    const c = new Circle(10);
    expect(c.material).toBeDefined();
  });

  it("should set material", () => {
    const c = new Circle(10);
    const mat = new Material(0.8, 0.5, 1.0, 3.0);
    c.material = mat;
    expect(c.material.elasticity).toBeCloseTo(0.8);
  });

  it("should throw when setting null material", () => {
    const c = new Circle(10);
    expect(() => {
      c.material = null as any;
    }).toThrow("Cannot assign null");
  });

  // ---------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------

  it("should have default filter", () => {
    const c = new Circle(10);
    expect(c.filter).toBeDefined();
  });

  it("should set filter", () => {
    const c = new Circle(10);
    const f = new InteractionFilter();
    f.collisionGroup = 5;
    c.filter = f;
    expect(c.filter.collisionGroup).toBe(5);
  });

  it("should throw when setting null filter", () => {
    const c = new Circle(10);
    expect(() => {
      c.filter = null as any;
    }).toThrow("Cannot assign null");
  });

  // ---------------------------------------------------------------------------
  // Fluid properties
  // ---------------------------------------------------------------------------

  it("should create default fluid properties on access", () => {
    const c = new Circle(10);
    expect(c.fluidProperties).toBeDefined();
  });

  it("should get/set fluidEnabled", () => {
    const c = new Circle(10);
    expect(c.fluidEnabled).toBe(false);
    c.fluidEnabled = true;
    expect(c.fluidEnabled).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Sensor
  // ---------------------------------------------------------------------------

  it("should get/set sensorEnabled", () => {
    const c = new Circle(10);
    expect(c.sensorEnabled).toBe(false);
    c.sensorEnabled = true;
    expect(c.sensorEnabled).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Bounds
  // ---------------------------------------------------------------------------

  it("should have bounds", () => {
    const c = new Circle(10);
    const body = new Body();
    body.shapes.add(c);
    expect(c.bounds).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // LocalCOM
  // ---------------------------------------------------------------------------

  it("should have localCOM", () => {
    const c = new Circle(10);
    const com = c.localCOM;
    expect(com).toBeDefined();
    expect(com.x).toBeCloseTo(0);
    expect(com.y).toBeCloseTo(0);
  });

  // ---------------------------------------------------------------------------
  // Translate
  // ---------------------------------------------------------------------------

  it("should translate a circle", () => {
    const c = new Circle(10);
    c.translate(Vec2.get(5, 10));
    expect(c.localCOM.x).toBeCloseTo(5);
    expect(c.localCOM.y).toBeCloseTo(10);
  });

  it("should translate a polygon", () => {
    const p = new Polygon(Polygon.box(10, 10));
    p.translate(Vec2.get(5, 10));
    expect(p.localCOM.x).toBeCloseTo(5);
    expect(p.localCOM.y).toBeCloseTo(10);
  });

  it("should throw when translating by null", () => {
    const c = new Circle(10);
    expect(() => c.translate(null as any)).toThrow("null");
  });

  // ---------------------------------------------------------------------------
  // Scale
  // ---------------------------------------------------------------------------

  it("should scale a circle uniformly", () => {
    const c = new Circle(10);
    c.scale(2, 2);
    expect(c.radius).toBeCloseTo(20);
  });

  it("should throw for non-equal scaling on circle", () => {
    const c = new Circle(10);
    expect(() => c.scale(2, 3)).toThrow("non equal scaling");
  });

  it("should scale a polygon", () => {
    const p = new Polygon(Polygon.box(10, 10));
    const area1 = p.area;
    p.scale(2, 2);
    expect(p.area).toBeCloseTo(area1 * 4, 0);
  });

  it("should throw when scaling by zero", () => {
    const c = new Circle(10);
    expect(() => c.scale(0, 1)).toThrow("factor of 0");
  });

  it("should throw when scaling by NaN", () => {
    const c = new Circle(10);
    expect(() => c.scale(NaN, 1)).toThrow("NaN");
  });

  // ---------------------------------------------------------------------------
  // Rotate
  // ---------------------------------------------------------------------------

  it("should rotate without error", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(() => p.rotate(Math.PI / 4)).not.toThrow();
  });

  it("should throw when rotating by NaN", () => {
    const c = new Circle(10);
    expect(() => c.rotate(NaN)).toThrow("NaN");
  });

  // ---------------------------------------------------------------------------
  // Copy
  // ---------------------------------------------------------------------------

  it("should copy a circle", () => {
    const c = new Circle(25);
    const body = new Body();
    body.shapes.add(c);
    const copy = c.copy();
    expect(copy).toBeDefined();
    expect(copy.isCircle()).toBe(true);
  });

  it("should copy a polygon", () => {
    const p = new Polygon(Polygon.box(50, 25));
    const body = new Body();
    body.shapes.add(p);
    const copy = p.copy();
    expect(copy).toBeDefined();
    expect(copy.isPolygon()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it("circle toString should contain Circle#", () => {
    const c = new Circle(10);
    expect(c.toString()).toContain("Circle#");
  });

  it("polygon toString should contain Polygon#", () => {
    const p = new Polygon(Polygon.box(10, 10));
    expect(p.toString()).toContain("Polygon#");
  });

  // ---------------------------------------------------------------------------
  // Space integration
  // ---------------------------------------------------------------------------

  it("should work in a space simulation with circle", () => {
    const space = new Space();
    const body = new Body();
    body.shapes.add(new Circle(10));
    space.bodies.add(body);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("should work in a space simulation with polygon", () => {
    const space = new Space();
    const body = new Body();
    body.shapes.add(new Polygon(Polygon.box(20, 20)));
    space.bodies.add(body);
    expect(() => space.step(1 / 60)).not.toThrow();
  });
});
