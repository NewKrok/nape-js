import { describe, it, expect } from "vitest";
import { Geom } from "../../src/geom/Geom";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";

describe("Geom", () => {
  it("should have correct __name__", () => {
    expect(Geom.__name__).toEqual(["nape", "geom", "Geom"]);
  });

  it("should have __class__ set on prototype", () => {
    expect((Geom.prototype as any).__class__).toBe(Geom);
  });

  describe("distance", () => {
    it("should calculate distance between two circle shapes", () => {
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

      // Two circles radius 10, centres 30 apart → distance = 10
      expect(dist).toBeCloseTo(10, 1);
      // Closest points should be on the surfaces
      expect(out1.x).toBeCloseTo(10, 1);
      expect(out2.x).toBeCloseTo(20, 1);
    });

    it("should return negative distance for overlapping shapes", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(5, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      const out1 = new Vec2(0, 0);
      const out2 = new Vec2(0, 0);
      const dist = Geom.distance(b1.shapes.at(0), b2.shapes.at(0), out1, out2);

      // Two circles radius 10, centres 5 apart → overlapping
      expect(dist).toBeLessThan(0);
    });

    it("should throw if shape is not part of a body", () => {
      const space = new Space(new Vec2(0, 0));
      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const orphanShape = new Circle(10);
      const out1 = new Vec2(0, 0);
      const out2 = new Vec2(0, 0);

      expect(() => Geom.distance(b1.shapes.at(0), orphanShape, out1, out2)).toThrow();
    });
  });

  describe("distanceBody", () => {
    it("should calculate distance between two bodies", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(40, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      const out1 = new Vec2(0, 0);
      const out2 = new Vec2(0, 0);
      const dist = Geom.distanceBody(b1, b2, out1, out2);

      // Two circles radius 10, centres 40 apart → distance = 20
      expect(dist).toBeCloseTo(20, 1);
    });
  });

  describe("intersects", () => {
    it("should return true for overlapping shapes", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(5, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      expect(Geom.intersects(b1.shapes.at(0), b2.shapes.at(0))).toBe(true);
    });

    it("should return false for non-overlapping shapes", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(30, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      expect(Geom.intersects(b1.shapes.at(0), b2.shapes.at(0))).toBe(false);
    });
  });

  describe("intersectsBody", () => {
    it("should return true for overlapping bodies", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(5, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      expect(Geom.intersectsBody(b1, b2)).toBe(true);
    });

    it("should return false for non-overlapping bodies", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(100, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      expect(Geom.intersectsBody(b1, b2)).toBe(false);
    });
  });

  describe("contains", () => {
    it("should return true when large shape contains small shape", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(50));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b2.shapes.add(new Circle(5));
      b2.space = space;

      expect(Geom.contains(b1.shapes.at(0), b2.shapes.at(0))).toBe(true);
    });

    it("should return false when shapes don't contain each other", () => {
      const space = new Space(new Vec2(0, 0));

      const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
      b1.shapes.add(new Circle(10));
      b1.space = space;

      const b2 = new Body(BodyType.STATIC, new Vec2(100, 0));
      b2.shapes.add(new Circle(10));
      b2.space = space;

      expect(Geom.contains(b1.shapes.at(0), b2.shapes.at(0))).toBe(false);
    });
  });
});
