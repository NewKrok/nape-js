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
