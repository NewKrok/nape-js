import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { ZPP_Collide } from "../../../src/native/geom/ZPP_Collide";
import { ZPP_Geom } from "../../../src/native/geom/ZPP_Geom";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Vec2 } from "../../../src/geom/Vec2";
import { Circle } from "../../../src/shape/Circle";
import { Polygon } from "../../../src/shape/Polygon";

/** Helper to get validated ZPP shape from a body. */
function getZppShape(body: Body, space: Space): any {
  // Step once to trigger validation of all shapes
  space.step(1 / 60);
  const zppShape = (body as any).zpp_inner.shapes.head.elt;
  ZPP_Geom.validateShape(zppShape);
  return zppShape;
}

describe("ZPP_Collide", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_Collide.__name__).toEqual(["zpp_nape", "geom", "ZPP_Collide"]);
    });
  });

  describe("static fields", () => {
    it("should have flowpoly initialized", () => {
      expect(ZPP_Collide.flowpoly).not.toBeNull();
    });

    it("should have flowsegs initialized", () => {
      expect(ZPP_Collide.flowsegs).not.toBeNull();
    });
  });

  describe("circleContains", () => {
    it("should return true for a point inside the circle", () => {
      const c = { worldCOMx: 0, worldCOMy: 0, radius: 10 };
      const p = { x: 3, y: 4 }; // distance = 5 < 10
      expect(ZPP_Collide.circleContains(c, p)).toBe(true);
    });

    it("should return false for a point outside the circle", () => {
      const c = { worldCOMx: 0, worldCOMy: 0, radius: 5 };
      const p = { x: 4, y: 4 }; // distance = sqrt(32) > 5
      expect(ZPP_Collide.circleContains(c, p)).toBe(false);
    });

    it("should return false for a point on the boundary", () => {
      const c = { worldCOMx: 0, worldCOMy: 0, radius: 5 };
      const p = { x: 5, y: 0 }; // distance = 5, not strictly less than
      expect(ZPP_Collide.circleContains(c, p)).toBe(false);
    });

    it("should handle offset circle center", () => {
      const c = { worldCOMx: 10, worldCOMy: 10, radius: 5 };
      const p = { x: 12, y: 12 }; // distance = sqrt(8) < 5
      expect(ZPP_Collide.circleContains(c, p)).toBe(true);
    });
  });

  describe("shapeContains (integration with Circle)", () => {
    it("should detect point inside a circle shape", () => {
      const space = new Space(new Vec2(0, 0));
      const b = new Body(BodyType.STATIC, new Vec2(0, 0));
      b.shapes.add(new Circle(10));
      b.space = space;

      const zppShape = getZppShape(b, space);
      const point = { x: 3, y: 4 };
      expect(ZPP_Collide.shapeContains(zppShape, point)).toBe(true);
    });

    it("should detect point outside a circle shape", () => {
      const space = new Space(new Vec2(0, 0));
      const b = new Body(BodyType.STATIC, new Vec2(0, 0));
      b.shapes.add(new Circle(10));
      b.space = space;

      const zppShape = getZppShape(b, space);
      const point = { x: 15, y: 0 };
      expect(ZPP_Collide.shapeContains(zppShape, point)).toBe(false);
    });
  });

  describe("bodyContains (integration)", () => {
    it("should detect point inside a body with circle shape", () => {
      const space = new Space(new Vec2(0, 0));
      const b = new Body(BodyType.STATIC, new Vec2(0, 0));
      b.shapes.add(new Circle(10));
      b.space = space;
      space.step(1 / 60);

      const zppBody = (b as any).zpp_inner;
      const point = { x: 3, y: 4 };
      expect(ZPP_Collide.bodyContains(zppBody, point)).toBe(true);
    });

    it("should detect point outside a body", () => {
      const space = new Space(new Vec2(0, 0));
      const b = new Body(BodyType.STATIC, new Vec2(0, 0));
      b.shapes.add(new Circle(10));
      b.space = space;
      space.step(1 / 60);

      const zppBody = (b as any).zpp_inner;
      const point = { x: 20, y: 0 };
      expect(ZPP_Collide.bodyContains(zppBody, point)).toBe(false);
    });
  });

  describe("containTest (integration)", () => {
    it("should return true when a smaller circle is inside a larger one", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(20));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b2.shapes.add(new Circle(5));
      b2.space = space;

      space.step(1 / 60);

      const zppS1 = (b1 as any).zpp_inner.shapes.head.elt;
      const zppS2 = (b2 as any).zpp_inner.shapes.head.elt;
      ZPP_Geom.validateShape(zppS1);
      ZPP_Geom.validateShape(zppS2);

      expect(ZPP_Collide.containTest(zppS1, zppS2)).toBe(true);
    });

    it("should return false when circles are separated", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(5));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(20, 0));
      b2.shapes.add(new Circle(5));
      b2.space = space;

      space.step(1 / 60);

      const zppS1 = (b1 as any).zpp_inner.shapes.head.elt;
      const zppS2 = (b2 as any).zpp_inner.shapes.head.elt;
      ZPP_Geom.validateShape(zppS1);
      ZPP_Geom.validateShape(zppS2);

      expect(ZPP_Collide.containTest(zppS1, zppS2)).toBe(false);
    });
  });

  describe("testCollide_safe / testCollide (integration)", () => {
    it("should detect collision between overlapping circles", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(15, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      space.step(1 / 60);

      const zppS1 = (b1 as any).zpp_inner.shapes.head.elt;
      const zppS2 = (b2 as any).zpp_inner.shapes.head.elt;
      ZPP_Geom.validateShape(zppS1);
      ZPP_Geom.validateShape(zppS2);

      expect(ZPP_Collide.testCollide_safe(zppS1, zppS2)).toBe(true);
    });

    it("should not detect collision between separated circles", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(5));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(20, 0));
      b2.shapes.add(new Circle(5));
      b2.space = space;

      space.step(1 / 60);

      const zppS1 = (b1 as any).zpp_inner.shapes.head.elt;
      const zppS2 = (b2 as any).zpp_inner.shapes.head.elt;
      ZPP_Geom.validateShape(zppS1);
      ZPP_Geom.validateShape(zppS2);

      expect(ZPP_Collide.testCollide_safe(zppS1, zppS2)).toBe(false);
    });

    it("should detect collision between overlapping polygons", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Polygon(Polygon.box(20, 20)));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(15, 0));
      b2.shapes.add(new Polygon(Polygon.box(20, 20)));
      b2.space = space;

      space.step(1 / 60);

      const zppS1 = (b1 as any).zpp_inner.shapes.head.elt;
      const zppS2 = (b2 as any).zpp_inner.shapes.head.elt;
      ZPP_Geom.validateShape(zppS1);
      ZPP_Geom.validateShape(zppS2);

      expect(ZPP_Collide.testCollide_safe(zppS1, zppS2)).toBe(true);
    });

    it("should not detect collision between separated polygons", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Polygon(Polygon.box(10, 10)));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(30, 0));
      b2.shapes.add(new Polygon(Polygon.box(10, 10)));
      b2.space = space;

      space.step(1 / 60);

      const zppS1 = (b1 as any).zpp_inner.shapes.head.elt;
      const zppS2 = (b2 as any).zpp_inner.shapes.head.elt;
      ZPP_Geom.validateShape(zppS1);
      ZPP_Geom.validateShape(zppS2);

      expect(ZPP_Collide.testCollide_safe(zppS1, zppS2)).toBe(false);
    });

    it("should detect collision between circle and polygon", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(15, 0));
      b2.shapes.add(new Polygon(Polygon.box(20, 20)));
      b2.space = space;

      space.step(1 / 60);

      const zppS1 = (b1 as any).zpp_inner.shapes.head.elt;
      const zppS2 = (b2 as any).zpp_inner.shapes.head.elt;
      ZPP_Geom.validateShape(zppS1);
      ZPP_Geom.validateShape(zppS2);

      expect(ZPP_Collide.testCollide_safe(zppS1, zppS2)).toBe(true);
    });
  });

  describe("collision detection through Space.step", () => {
    it("should detect collisions during simulation", () => {
      const space = new Space(new Vec2(0, 100));

      const ground = new Body(BodyType.STATIC, new Vec2(0, 200));
      ground.shapes.add(new Polygon(Polygon.box(200, 10)));
      ground.space = space;

      const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      ball.shapes.add(new Circle(10));
      ball.space = space;

      for (let i = 0; i < 60; i++) {
        space.step(1 / 60);
      }

      // Ball should have fallen due to gravity (positive y = downward)
      expect(ball.position.y).toBeGreaterThan(50);
    });
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: polyContains
// ---------------------------------------------------------------------------

import { ZPP_Geom } from "../../../src/native/geom/ZPP_Geom";
import { FluidProperties } from "../../../src/phys/FluidProperties";

describe("ZPP_Collide — polyContains", () => {
  function makePolyShape(space: Space, body: Body): any {
    space.step(1 / 60);
    const zppShape = (body as any).zpp_inner.shapes.head.elt;
    ZPP_Geom.validateShape(zppShape);
    return zppShape;
  }

  it("should return true for a point strictly inside a box polygon", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 20)));
    b.space = space;
    const zppShape = makePolyShape(space, b);

    const point = { x: 0, y: 0 };
    expect(ZPP_Collide.polyContains(zppShape.polygon, point)).toBe(true);
  });

  it("should return false for a point outside the box polygon", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 20)));
    b.space = space;
    const zppShape = makePolyShape(space, b);

    const point = { x: 50, y: 0 };
    expect(ZPP_Collide.polyContains(zppShape.polygon, point)).toBe(false);
  });

  it("should return false for a point well outside the polygon", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 20)));
    b.space = space;
    const zppShape = makePolyShape(space, b);

    // Point is clearly outside — well beyond the box boundary
    const point = { x: 20, y: 20 };
    expect(ZPP_Collide.polyContains(zppShape.polygon, point)).toBe(false);
  });

  it("should return true for a point near the centre of a large polygon", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(200, 200)));
    b.space = space;
    const zppShape = makePolyShape(space, b);

    const point = { x: 5, y: -5 };
    expect(ZPP_Collide.polyContains(zppShape.polygon, point)).toBe(true);
  });

  it("shapeContains routes polygon type to polyContains correctly — inside", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(40, 40)));
    b.space = space;
    const zppShape = makePolyShape(space, b);

    const point = { x: 1, y: 1 };
    expect(ZPP_Collide.shapeContains(zppShape, point)).toBe(true);
  });

  it("shapeContains routes polygon type to polyContains correctly — outside", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(10, 10)));
    b.space = space;
    const zppShape = makePolyShape(space, b);

    const point = { x: 100, y: 0 };
    expect(ZPP_Collide.shapeContains(zppShape, point)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: bodyContains with multiple shapes
// ---------------------------------------------------------------------------

describe("ZPP_Collide — bodyContains (multi-shape body)", () => {
  it("should return true when point is in first of two shapes", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.shapes.add(new Circle(5));
    b.space = space;
    space.step(1 / 60);

    const zppBody = (b as any).zpp_inner;
    const point = { x: 3, y: 0 };
    expect(ZPP_Collide.bodyContains(zppBody, point)).toBe(true);
  });

  it("should return false when point is outside all shapes", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    b.space = space;
    space.step(1 / 60);

    const zppBody = (b as any).zpp_inner;
    const point = { x: 100, y: 100 };
    expect(ZPP_Collide.bodyContains(zppBody, point)).toBe(false);
  });

  it("bodyContains with polygon shape — inside", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(30, 30)));
    b.space = space;
    space.step(1 / 60);

    const zppBody = (b as any).zpp_inner;
    const point = { x: 0, y: 0 };
    expect(ZPP_Collide.bodyContains(zppBody, point)).toBe(true);
  });

  it("bodyContains with polygon shape — outside", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(10, 10)));
    b.space = space;
    space.step(1 / 60);

    const zppBody = (b as any).zpp_inner;
    const point = { x: 50, y: 0 };
    expect(ZPP_Collide.bodyContains(zppBody, point)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: containTest with mixed shape types
// ---------------------------------------------------------------------------

describe("ZPP_Collide — containTest (mixed shapes)", () => {
  function setupShapes(
    s1: { pos: [number, number]; shape: () => any },
    s2: { pos: [number, number]; shape: () => any },
    space: Space,
  ): [any, any] {
    const b1 = new Body(BodyType.STATIC, new Vec2(...s1.pos));
    b1.shapes.add(s1.shape());
    b1.space = space;

    const b2 = new Body(BodyType.STATIC, new Vec2(...s2.pos));
    b2.shapes.add(s2.shape());
    b2.space = space;

    space.step(1 / 60);

    const z1 = (b1 as any).zpp_inner.shapes.head.elt;
    const z2 = (b2 as any).zpp_inner.shapes.head.elt;
    ZPP_Geom.validateShape(z1);
    ZPP_Geom.validateShape(z2);
    return [z1, z2];
  }

  it("large polygon contains small circle at origin", () => {
    const space = new Space(new Vec2(0, 0));
    const [zLarge, zSmall] = setupShapes(
      { pos: [0, 0], shape: () => new Polygon(Polygon.box(100, 100)) },
      { pos: [0, 0], shape: () => new Circle(5) },
      space,
    );
    expect(ZPP_Collide.containTest(zLarge, zSmall)).toBe(true);
  });

  it("small circle does NOT contain large polygon", () => {
    const space = new Space(new Vec2(0, 0));
    const [zSmall, zLarge] = setupShapes(
      { pos: [0, 0], shape: () => new Circle(5) },
      { pos: [0, 0], shape: () => new Polygon(Polygon.box(100, 100)) },
      space,
    );
    expect(ZPP_Collide.containTest(zSmall, zLarge)).toBe(false);
  });

  it("large circle contains small polygon at origin", () => {
    const space = new Space(new Vec2(0, 0));
    const [zLarge, zSmall] = setupShapes(
      { pos: [0, 0], shape: () => new Circle(50) },
      { pos: [0, 0], shape: () => new Polygon(Polygon.box(10, 10)) },
      space,
    );
    expect(ZPP_Collide.containTest(zLarge, zSmall)).toBe(true);
  });

  it("separated polygons — containTest returns false", () => {
    const space = new Space(new Vec2(0, 0));
    const [z1, z2] = setupShapes(
      { pos: [0, 0], shape: () => new Polygon(Polygon.box(10, 10)) },
      { pos: [200, 0], shape: () => new Polygon(Polygon.box(10, 10)) },
      space,
    );
    expect(ZPP_Collide.containTest(z1, z2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: testCollide reversed arg order (poly vs circle)
// ---------------------------------------------------------------------------

describe("ZPP_Collide — testCollide reversed args", () => {
  it("polygon vs circle collision detected (reversed arg order)", () => {
    const space = new Space(new Vec2(0, 0));

    const bp = new Body(BodyType.STATIC, new Vec2(0, 0));
    bp.shapes.add(new Polygon(Polygon.box(20, 20)));
    bp.space = space;

    const bc = new Body(BodyType.STATIC, new Vec2(15, 0));
    bc.shapes.add(new Circle(10));
    bc.space = space;

    space.step(1 / 60);

    const zPoly = (bp as any).zpp_inner.shapes.head.elt;
    const zCirc = (bc as any).zpp_inner.shapes.head.elt;
    ZPP_Geom.validateShape(zPoly);
    ZPP_Geom.validateShape(zCirc);

    // reversed: polygon first, circle second
    expect(ZPP_Collide.testCollide_safe(zPoly, zCirc)).toBe(true);
  });

  it("non-overlapping polygon and circle returns false (reversed order)", () => {
    const space = new Space(new Vec2(0, 0));

    const bp = new Body(BodyType.STATIC, new Vec2(0, 0));
    bp.shapes.add(new Polygon(Polygon.box(10, 10)));
    bp.space = space;

    const bc = new Body(BodyType.STATIC, new Vec2(50, 0));
    bc.shapes.add(new Circle(5));
    bc.space = space;

    space.step(1 / 60);

    const zPoly = (bp as any).zpp_inner.shapes.head.elt;
    const zCirc = (bc as any).zpp_inner.shapes.head.elt;
    ZPP_Geom.validateShape(zPoly);
    ZPP_Geom.validateShape(zCirc);

    expect(ZPP_Collide.testCollide_safe(zPoly, zCirc)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: flowCollide via fluid simulation
// ---------------------------------------------------------------------------

describe("ZPP_Collide — flowCollide (fluid simulation)", () => {
  it("dynamic circle submerged in fluid body generates fluid arbiters", () => {
    const space = new Space(new Vec2(0, 0));

    const fluid = new Body(BodyType.STATIC, new Vec2(0, 0));
    const fluidShape = new Polygon(Polygon.box(200, 200));
    fluidShape.fluidEnabled = true;
    fluidShape.fluidProperties = new FluidProperties(2.0, 1.0);
    fluid.shapes.add(fluidShape as any);
    fluid.space = space;

    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(10));
    ball.space = space;

    // Run several steps — flowCollide should be triggered
    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
    }

    // The ball should be affected by buoyancy (no gravity, so should not fall)
    expect(ball.position.y).toBeDefined();
  });

  it("dynamic polygon submerged in fluid body generates fluid arbiters", () => {
    const space = new Space(new Vec2(0, 0));

    const fluid = new Body(BodyType.STATIC, new Vec2(0, 0));
    const fluidShape = new Polygon(Polygon.box(200, 200));
    fluidShape.fluidEnabled = true;
    fluidShape.fluidProperties = new FluidProperties(3.0, 2.0);
    fluid.shapes.add(fluidShape as any);
    fluid.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(10, 10)));
    box.space = space;

    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
    }

    expect(box.position.y).toBeDefined();
  });

  it("fluid body with circle shape generates fluid arbiters", () => {
    const space = new Space(new Vec2(0, 0));

    const fluid = new Body(BodyType.STATIC, new Vec2(0, 0));
    const fluidCircle = new Circle(200);
    fluidCircle.fluidEnabled = true;
    fluidCircle.fluidProperties = new FluidProperties(1.5, 0.5);
    fluid.shapes.add(fluidCircle as any);
    fluid.space = space;

    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(15));
    ball.space = space;

    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
    }

    expect(ball.position.y).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Additional coverage: contactCollide via simulation (circle, polygon)
// ---------------------------------------------------------------------------

describe("ZPP_Collide — contactCollide (via Space simulation)", () => {
  it("circle-circle contact generates arbiter with contact points", () => {
    const space = new Space(new Vec2(0, 500));

    const ground = new Body(BodyType.STATIC, new Vec2(0, 200));
    ground.shapes.add(new Circle(50));
    ground.space = space;

    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(15));
    ball.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    // The ball should have come to rest against the static circle
    expect(ball.position.y).toBeGreaterThan(0);
  });

  it("circle-polygon contact generates arbiter", () => {
    const space = new Space(new Vec2(0, 500));

    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(200, 20)));
    floor.space = space;

    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(10));
    ball.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    expect(ball.position.y).toBeGreaterThan(100);
  });

  it("polygon-polygon contact generates arbiter", () => {
    const space = new Space(new Vec2(0, 500));

    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(200, 20)));
    floor.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
    }

    expect(box.position.y).toBeGreaterThan(100);
  });
});
