import { describe, it, expect } from "vitest";
import { Circle } from "../../src/shape/Circle";
import { Shape } from "../../src/shape/Shape";
import { Body } from "../../src/phys/Body";
import { Interactor } from "../../src/phys/Interactor";
import { Material } from "../../src/phys/Material";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Vec2 } from "../../src/geom/Vec2";
import { Space } from "../../src/space/Space";

describe("Circle", () => {
  // ---------------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------------

  it("should construct with default radius", () => {
    const c = new Circle();
    expect(c.radius).toBeCloseTo(50);
  });

  it("should construct with given radius", () => {
    const c = new Circle(25);
    expect(c.radius).toBeCloseTo(25);
  });

  it("should construct with small valid radius", () => {
    const c = new Circle(0.001);
    expect(c.radius).toBeCloseTo(0.001);
  });

  it("should throw for NaN radius", () => {
    expect(() => new Circle(NaN)).toThrow("Circle::radius cannot be NaN");
  });

  it("should accept zero radius (matches internal default)", () => {
    // Zero is the internal default radius, so no validation block is entered
    const c = new Circle(0);
    expect(c.radius).toBe(0);
  });

  it("should throw for negative radius", () => {
    expect(() => new Circle(-5)).toThrow("Config.epsilon");
  });

  // ---------------------------------------------------------------------------
  // Constructor with localCOM
  // ---------------------------------------------------------------------------

  it("should construct with localCOM", () => {
    const com = Vec2.get(10, 20);
    const c = new Circle(15, com);
    expect(c.localCOM.x).toBeCloseTo(10);
    expect(c.localCOM.y).toBeCloseTo(20);
  });

  it("should accept weak localCOM without error", () => {
    const com = Vec2.weak(10, 20);
    const c = new Circle(15, com);
    expect(c.localCOM.x).toBeCloseTo(10);
    expect(c.localCOM.y).toBeCloseTo(20);
  });

  it("should default localCOM to (0,0)", () => {
    const c = new Circle(10);
    expect(c.localCOM.x).toBeCloseTo(0);
    expect(c.localCOM.y).toBeCloseTo(0);
  });

  // ---------------------------------------------------------------------------
  // Constructor with material
  // ---------------------------------------------------------------------------

  it("should accept material in constructor", () => {
    const mat = new Material(0.8, 0.5, 1.0, 3.0);
    const c = new Circle(10, undefined, mat);
    expect(c.material.elasticity).toBeCloseTo(0.8);
    expect(c.material.density).toBeCloseTo(3.0);
  });

  it("should create default material when none given", () => {
    const c = new Circle(10);
    expect(c.material).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Constructor with filter
  // ---------------------------------------------------------------------------

  it("should accept filter in constructor", () => {
    const filter = new InteractionFilter();
    filter.collisionGroup = 2;
    const c = new Circle(10, undefined, undefined, filter);
    expect(c.filter.collisionGroup).toBe(2);
  });

  it("should create default filter when none given", () => {
    const c = new Circle(10);
    expect(c.filter).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Radius getter/setter
  // ---------------------------------------------------------------------------

  it("should get/set radius", () => {
    const c = new Circle(10);
    c.radius = 30;
    expect(c.radius).toBeCloseTo(30);
  });

  it("should throw when setting NaN radius", () => {
    const c = new Circle(10);
    expect(() => {
      c.radius = NaN;
    }).toThrow("Circle::radius cannot be NaN");
  });

  it("should throw when setting zero radius", () => {
    const c = new Circle(10);
    expect(() => {
      c.radius = 0;
    }).toThrow("Config.epsilon");
  });

  it("should not throw when setting same radius", () => {
    const c = new Circle(10);
    expect(() => {
      c.radius = 10;
    }).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Shape-level properties (inherited from compiled Shape prototype)
  // ---------------------------------------------------------------------------

  it("should report as circle type", () => {
    const c = new Circle(10);
    expect(c.isCircle()).toBe(true);
    expect(c.isPolygon()).toBe(false);
  });

  it("should have area", () => {
    const c = new Circle(10);
    expect(c.area).toBeCloseTo(Math.PI * 100, 0);
  });

  it("should have inertia", () => {
    const c = new Circle(10);
    expect(c.inertia).toBeGreaterThan(0);
  });

  it("should update area after radius change", () => {
    const c = new Circle(10);
    const area1 = c.area;
    c.radius = 20;
    const area2 = c.area;
    expect(area2).toBeGreaterThan(area1);
    expect(area2).toBeCloseTo(Math.PI * 400, 0);
  });

  // ---------------------------------------------------------------------------
  // Interactor-level properties (via modernized Interactor)
  // ---------------------------------------------------------------------------

  it("should have a unique id", () => {
    const c1 = new Circle(10);
    const c2 = new Circle(20);
    expect(c1.id).toBeGreaterThan(0);
    expect(c2.id).toBeGreaterThan(0);
    expect(c1.id).not.toBe(c2.id);
  });

  it("should have userData", () => {
    const c = new Circle(10);
    c.userData.tag = "ball";
    expect(c.userData.tag).toBe("ball");
  });

  it("isShape() should return true", () => {
    const c = new Circle(10);
    expect(c.isShape()).toBe(true);
    expect(c.isBody()).toBe(false);
    expect(c.isCompound()).toBe(false);
  });

  it("should have cbTypes", () => {
    const c = new Circle(10);
    expect(c.cbTypes).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Inheritance
  // ---------------------------------------------------------------------------

  it("should be an instance of Shape", () => {
    const c = new Circle(10);
    expect(c).toBeInstanceOf(Shape);
  });

  it("should be an instance of Interactor", () => {
    const c = new Circle(10);
    expect(c).toBeInstanceOf(Interactor);
  });

  // ---------------------------------------------------------------------------
  // Body integration
  // ---------------------------------------------------------------------------

  it("should add to a body", () => {
    const body = new Body();
    const circle = new Circle(10);
    body.shapes.add(circle);
    expect(body.shapes.length).toBe(1);
  });

  it("should report body after adding to one", () => {
    const body = new Body();
    const circle = new Circle(10);
    body.shapes.add(circle);
    expect(circle.body).toBeDefined();
    expect(circle.body).toBeInstanceOf(Body);
  });

  // ---------------------------------------------------------------------------
  // Space integration
  // ---------------------------------------------------------------------------

  it("should work in a space simulation", () => {
    const space = new Space();
    const body = new Body();
    body.shapes.add(new Circle(10));
    space.bodies.add(body);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // Copy
  // ---------------------------------------------------------------------------

  it("should copy correctly", () => {
    const c = new Circle(25);
    const body = new Body();
    body.shapes.add(c);
    const copy = c.copy();
    expect(copy).toBeInstanceOf(Shape);
    expect(copy.isCircle()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // zpp_inner_zn direct access (modernization verification)
  // ---------------------------------------------------------------------------

  it("zpp_inner_zn should be set and have correct radius", () => {
    const c = new Circle(42);
    expect(c.zpp_inner_zn).toBeDefined();
    expect(c.zpp_inner_zn.radius).toBeCloseTo(42);
  });

  it("zpp_inner_i should match zpp_inner_zn", () => {
    const c = new Circle(10);
    expect(c.zpp_inner_i).toBe(c.zpp_inner_zn);
  });
});
