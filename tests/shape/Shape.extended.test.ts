import { describe, it, expect } from "vitest";
import { Shape } from "../../src/shape/Shape";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { ShapeType } from "../../src/shape/ShapeType";
import { Mat23 } from "../../src/geom/Mat23";

describe("Shape extended coverage", () => {
  describe("body setter - moving shape between bodies", () => {
    it("should move a shape from one body to another via body setter", () => {
      const circle = new Circle(10);
      const bodyA = new Body(BodyType.DYNAMIC);
      const bodyB = new Body(BodyType.DYNAMIC);
      bodyA.shapes.add(circle);
      expect(circle.body).toBe(bodyA);
      expect(bodyA.shapes.length).toBe(1);

      circle.body = bodyB;
      expect(circle.body).toBe(bodyB);
      expect(bodyA.shapes.length).toBe(0);
      expect(bodyB.shapes.length).toBe(1);
    });

    it("should remove shape from body when setting body to null", () => {
      const circle = new Circle(10);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(circle);
      expect(circle.body).toBe(body);

      circle.body = null;
      expect(circle.body).toBeNull();
      expect(body.shapes.length).toBe(0);
    });
  });

  describe("localCOM setter", () => {
    it("should set custom local COM on a shape", () => {
      const circle = new Circle(10);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(circle);
      circle.localCOM = Vec2.get(3, 4);
      expect(circle.localCOM.x).toBeCloseTo(3);
      expect(circle.localCOM.y).toBeCloseTo(4);
    });

    it("should throw when setting localCOM to null", () => {
      const circle = new Circle(10);
      expect(() => {
        circle.localCOM = null as unknown as Vec2;
      }).toThrow();
    });
  });

  describe("contains() method", () => {
    it("should detect point inside a circle", () => {
      const circle = new Circle(10);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(circle);
      body.position.setxy(0, 0);
      expect(circle.contains(Vec2.get(3, 3))).toBe(true);
    });

    it("should detect point outside a circle", () => {
      const circle = new Circle(10);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(circle);
      body.position.setxy(0, 0);
      expect(circle.contains(Vec2.get(20, 20))).toBe(false);
    });

    it("should detect point inside a polygon", () => {
      const poly = new Polygon(Polygon.rect(0, 0, 20, 20));
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(poly);
      body.position.setxy(0, 0);
      expect(poly.contains(Vec2.get(10, 10))).toBe(true);
    });

    it("should detect point outside a polygon", () => {
      const poly = new Polygon(Polygon.rect(0, 0, 20, 20));
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(poly);
      body.position.setxy(0, 0);
      expect(poly.contains(Vec2.get(50, 50))).toBe(false);
    });

    it("should throw when passing null to contains()", () => {
      const circle = new Circle(10);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(circle);
      expect(() => {
        circle.contains(null as unknown as Vec2);
      }).toThrow();
    });

    it("should throw when shape has no body", () => {
      const circle = new Circle(10);
      expect(() => {
        circle.contains(Vec2.get(0, 0));
      }).toThrow();
    });
  });

  describe("transform() with Mat23", () => {
    it("should transform a polygon with a scale matrix", () => {
      const poly = new Polygon(Polygon.box(10, 10));
      const mat = new Mat23(2, 0, 0, 2, 0, 0); // scale 2x
      poly.transform(mat);
      // Area should be 4x original (10*10=100 -> 20*20=400)
      expect(poly.area).toBeCloseTo(400);
    });

    it("should throw when passing null matrix to transform()", () => {
      const poly = new Polygon(Polygon.box(10, 10));
      expect(() => {
        poly.transform(null as unknown as Mat23);
      }).toThrow();
    });

    it("should handle a non-uniform scale matrix on a polygon", () => {
      const poly = new Polygon(Polygon.box(10, 10));
      const mat = new Mat23(3, 0, 0, 1, 5, 10); // scale x by 3, translate by (5, 10)
      poly.transform(mat);
      // Area should be 3x original (only x scaled): 100 * 3 = 300
      expect(poly.area).toBeCloseTo(300);
    });
  });

  describe("fluidProperties setter", () => {
    it("should set custom fluid properties on a shape", () => {
      const circle = new Circle(10);
      circle.fluidEnabled = true;
      const fp = new FluidProperties(5, 0.5);
      circle.fluidProperties = fp;
      expect(circle.fluidProperties.density).toBeCloseTo(5);
    });

    it("should throw when setting fluidProperties to null", () => {
      const circle = new Circle(10);
      circle.fluidEnabled = true;
      expect(() => {
        circle.fluidProperties = null as unknown as FluidProperties;
      }).toThrow();
    });
  });

  describe("worldCOM getter", () => {
    it("should return world center of mass for a shape on a body", () => {
      const circle = new Circle(10);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(circle);
      body.position.setxy(50, 100);
      const wcom = circle.worldCOM;
      expect(wcom.x).toBeCloseTo(50);
      expect(wcom.y).toBeCloseTo(100);
    });
  });

  describe("cbTypes getter", () => {
    it("should return an accessible callback types set", () => {
      const circle = new Circle(10);
      const cbTypes = circle.cbTypes;
      expect(cbTypes).toBeDefined();
      expect(cbTypes.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("ShapeType.CAPSULE", () => {
    it("should have a CAPSULE singleton", () => {
      expect(ShapeType.CAPSULE).toBeDefined();
    });

    it("should return 'CAPSULE' from toString", () => {
      expect(ShapeType.CAPSULE.toString()).toBe("CAPSULE");
    });
  });

  describe("castCapsule", () => {
    it("should return null for non-capsule shapes", () => {
      const circle = new Circle(10);
      expect((circle as Shape).castCapsule).toBeNull();
    });

    it("should return the capsule for capsule shapes", () => {
      const capsule = new Capsule(100, 40);
      expect((capsule as Shape).castCapsule).not.toBeNull();
    });
  });

  describe("Shape._wrap with null", () => {
    it("should return null when wrapping null", () => {
      expect(Shape._wrap(null as any)).toBeNull();
    });
  });

  describe("Capsule shape operations", () => {
    it("should scale a capsule shape", () => {
      const capsule = new Capsule(100, 40);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(capsule);
      const areaBefore = capsule.area;
      capsule.scale(2, 2);
      expect(capsule.area).toBeGreaterThan(areaBefore);
    });

    it("should rotate a capsule shape", () => {
      const capsule = new Capsule(100, 40);
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(capsule);
      const areaBefore = capsule.area;
      capsule.rotate(Math.PI / 4);
      // Area should remain the same after rotation
      expect(capsule.area).toBeCloseTo(areaBefore);
    });
  });

  describe("Multiple shapes on same body", () => {
    it("should support multiple shapes on a single body", () => {
      const body = new Body(BodyType.DYNAMIC);
      const circle = new Circle(5);
      const poly = new Polygon(Polygon.box(10, 10));
      body.shapes.add(circle);
      body.shapes.add(poly);
      expect(body.shapes.length).toBe(2);
      expect(circle.body).toBe(body);
      expect(poly.body).toBe(body);
    });
  });

  describe("fluidEnabled auto-creates fluidProperties", () => {
    it("should auto-create fluidProperties when fluidEnabled is set to true", () => {
      const circle = new Circle(10);
      expect(circle.fluidEnabled).toBe(false);
      circle.fluidEnabled = true;
      expect(circle.fluidEnabled).toBe(true);
      expect(circle.fluidProperties).toBeDefined();
      expect(circle.fluidProperties).not.toBeNull();
    });
  });
});
