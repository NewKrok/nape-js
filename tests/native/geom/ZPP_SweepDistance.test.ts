import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { ZPP_SweepDistance } from "../../../src/native/geom/ZPP_SweepDistance";
import { ZPP_Geom } from "../../../src/native/geom/ZPP_Geom";
import { ZPP_Vec2 } from "../../../src/native/geom/ZPP_Vec2";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Vec2 } from "../../../src/geom/Vec2";
import { Circle } from "../../../src/shape/Circle";
import { Polygon } from "../../../src/shape/Polygon";
import { Geom } from "../../../src/geom/Geom";

/** Helper to get validated ZPP shapes from bodies after a space step. */
function setupAndValidate(
  space: Space,
  bodies: Body[],
): any[] {
  space.step(1 / 60);
  return bodies.map((b) => {
    const zpp = (b as any).zpp_inner.shapes.head.elt;
    ZPP_Geom.validateShape(zpp);
    return zpp;
  });
}

describe("ZPP_SweepDistance", () => {
  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_SweepDistance.__name__).toEqual([
        "zpp_nape",
        "geom",
        "ZPP_SweepDistance",
      ]);
    });
  });

  describe("static methods exist", () => {
    it("should have dynamicSweep method", () => {
      expect(typeof ZPP_SweepDistance.dynamicSweep).toBe("function");
    });

    it("should have staticSweep method", () => {
      expect(typeof ZPP_SweepDistance.staticSweep).toBe("function");
    });

    it("should have distanceBody method", () => {
      expect(typeof ZPP_SweepDistance.distanceBody).toBe("function");
    });

    it("should have distance method", () => {
      expect(typeof ZPP_SweepDistance.distance).toBe("function");
    });
  });

  describe("distance (circle-circle)", () => {
    it("should compute distance between separated circles", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(30, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      const [zppS1, zppS2] = setupAndValidate(space, [b1, b2]);

      const w1 = new ZPP_Vec2();
      const w2 = new ZPP_Vec2();
      const axis = new ZPP_Vec2();

      const dist = ZPP_SweepDistance.distance(zppS1, zppS2, w1, w2, axis);

      // Two circles radius 10, centers 30 apart -> distance = 10
      expect(dist).toBeCloseTo(10, 1);
    });

    it("should return negative distance for overlapping circles", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(5, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      const [zppS1, zppS2] = setupAndValidate(space, [b1, b2]);

      const w1 = new ZPP_Vec2();
      const w2 = new ZPP_Vec2();
      const axis = new ZPP_Vec2();

      const dist = ZPP_SweepDistance.distance(zppS1, zppS2, w1, w2, axis);

      // Two circles radius 10, centers 5 apart -> overlap = -15
      expect(dist).toBeCloseTo(-15, 1);
    });
  });

  describe("distance (polygon-circle)", () => {
    it("should compute distance between polygon and circle", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Polygon(Polygon.box(20, 20)));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(25, 0));
      b2.shapes.add(new Circle(5));
      b2.space = space;

      const [zppS1, zppS2] = setupAndValidate(space, [b1, b2]);

      const w1 = new ZPP_Vec2();
      const w2 = new ZPP_Vec2();
      const axis = new ZPP_Vec2();

      const dist = ZPP_SweepDistance.distance(zppS1, zppS2, w1, w2, axis);

      // Box half-width 10 at origin -> edge at x=10
      // Circle radius 5 at x=25 -> edge at x=20
      // Distance = 10
      expect(dist).toBeCloseTo(10, 1);
    });
  });

  describe("distance (polygon-polygon)", () => {
    it("should compute distance between separated polygons", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Polygon(Polygon.box(10, 10)));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(20, 0));
      b2.shapes.add(new Polygon(Polygon.box(10, 10)));
      b2.space = space;

      const [zppS1, zppS2] = setupAndValidate(space, [b1, b2]);

      const w1 = new ZPP_Vec2();
      const w2 = new ZPP_Vec2();
      const axis = new ZPP_Vec2();

      const dist = ZPP_SweepDistance.distance(zppS1, zppS2, w1, w2, axis);

      // Two boxes half-width 5 at 0 and 20 -> distance = 10
      expect(dist).toBeCloseTo(10, 1);
    });

    it("should return negative distance for overlapping polygons", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Polygon(Polygon.box(20, 20)));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(5, 0));
      b2.shapes.add(new Polygon(Polygon.box(20, 20)));
      b2.space = space;

      const [zppS1, zppS2] = setupAndValidate(space, [b1, b2]);

      const w1 = new ZPP_Vec2();
      const w2 = new ZPP_Vec2();
      const axis = new ZPP_Vec2();

      const dist = ZPP_SweepDistance.distance(zppS1, zppS2, w1, w2, axis);

      expect(dist).toBeLessThan(0);
    });
  });

  describe("distanceBody", () => {
    it("should compute minimum distance between two bodies", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(30, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      space.step(1 / 60);

      const w1 = new ZPP_Vec2();
      const w2 = new ZPP_Vec2();

      const zppB1 = (b1 as any).zpp_inner;
      const zppB2 = (b2 as any).zpp_inner;

      const dist = ZPP_SweepDistance.distanceBody(zppB1, zppB2, w1, w2);

      expect(dist).toBeCloseTo(10, 1);
    });
  });

  describe("Geom.distance integration (verifies ZPP_SweepDistance)", () => {
    it("should match Geom.distance API for circle-circle", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(30, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      const out1 = new Vec2(0, 0);
      const out2 = new Vec2(0, 0);

      const dist = Geom.distance(b1.shapes.at(0), b2.shapes.at(0), out1, out2);
      expect(dist).toBeCloseTo(10, 1);
    });

    it("should handle body-level distance", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(5));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(0, 20));
      b2.shapes.add(new Circle(5));
      b2.space = space;

      const out1 = new Vec2(0, 0);
      const out2 = new Vec2(0, 0);

      const dist = Geom.distanceBody(b1, b2, out1, out2);
      expect(dist).toBeCloseTo(10, 1);
    });
  });
});
