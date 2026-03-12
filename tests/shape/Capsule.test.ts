import { describe, it, expect } from "vitest";
import { Capsule } from "../../src/shape/Capsule";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Material } from "../../src/phys/Material";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Space } from "../../src/space/Space";
import { Vec2 } from "../../src/geom/Vec2";

describe("Capsule (native shape)", () => {
  // ---------------------------------------------------------------------------
  // Construction
  // ---------------------------------------------------------------------------

  describe("constructor", () => {
    it("should create a capsule shape", () => {
      const cap = new Capsule(100, 40);
      expect(cap).toBeInstanceOf(Capsule);
    });

    it("should report correct type", () => {
      const cap = new Capsule(100, 40);
      expect(cap.isCapsule()).toBe(true);
      expect(cap.isCircle()).toBe(false);
      expect(cap.isPolygon()).toBe(false);
    });

    it("should have correct dimensions", () => {
      const cap = new Capsule(100, 40);
      expect(cap.width).toBeCloseTo(100);
      expect(cap.height).toBeCloseTo(40);
      expect(cap.radius).toBeCloseTo(20);
      expect(cap.halfLength).toBeCloseTo(30);
    });

    it("should accept default parameters", () => {
      const cap = new Capsule();
      expect(cap.width).toBeCloseTo(100);
      expect(cap.height).toBeCloseTo(40);
    });

    it("should accept custom localCOM", () => {
      const cap = new Capsule(100, 40, Vec2.weak(10, 5));
      expect(cap.localCOM.x).toBeCloseTo(10);
      expect(cap.localCOM.y).toBeCloseTo(5);
    });

    it("should accept material and filter", () => {
      const mat = new Material(0.5, 0.3, 0.8, 2.0, 0.001);
      const filter = new InteractionFilter(2, 4);
      const cap = new Capsule(100, 40, undefined, mat, filter);
      expect(cap.material.elasticity).toBeCloseTo(0.5);
      expect(cap.filter.collisionGroup).toBe(2);
    });

    it("should handle width === height (degenerate to circle-like)", () => {
      const cap = new Capsule(40, 40);
      expect(cap.halfLength).toBeCloseTo(0);
      expect(cap.radius).toBeCloseTo(20);
    });

    // --- Error cases ---

    it("should throw for NaN width", () => {
      expect(() => new Capsule(NaN, 40)).toThrow("NaN");
    });

    it("should throw for NaN height", () => {
      expect(() => new Capsule(100, NaN)).toThrow("NaN");
    });

    it("should throw for height <= 0", () => {
      expect(() => new Capsule(100, 0)).toThrow("must be > 0");
      expect(() => new Capsule(100, -10)).toThrow("must be > 0");
    });

    it("should throw when width < height", () => {
      expect(() => new Capsule(20, 40)).toThrow("must be >= height");
    });
  });

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  describe("properties", () => {
    it("should allow setting radius", () => {
      const cap = new Capsule(100, 40);
      cap.radius = 30;
      expect(cap.radius).toBeCloseTo(30);
      expect(cap.height).toBeCloseTo(60);
    });

    it("should allow setting halfLength", () => {
      const cap = new Capsule(100, 40);
      cap.halfLength = 50;
      expect(cap.halfLength).toBeCloseTo(50);
    });

    it("should have positive area", () => {
      const cap = new Capsule(100, 40);
      const body = new Body();
      body.shapes.add(cap);
      expect(cap.area).toBeGreaterThan(0);
    });

    it("should have positive inertia", () => {
      const cap = new Capsule(100, 40);
      const body = new Body();
      body.shapes.add(cap);
      expect(cap.inertia).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // castCapsule
  // ---------------------------------------------------------------------------

  describe("castCapsule", () => {
    it("should cast to Capsule", () => {
      const cap = new Capsule(100, 40);
      const body = new Body();
      body.shapes.add(cap);
      const shape = body.shapes.at(0);
      expect(shape.isCapsule()).toBe(true);
      const cast = shape.castCapsule as Capsule;
      expect(cast).not.toBeNull();
      expect(cast.radius).toBeCloseTo(20);
    });

    it("should return null for non-capsule shapes", () => {
      const circle = new Circle(20);
      const body = new Body();
      body.shapes.add(circle);
      const shape = body.shapes.at(0);
      expect(shape.castCapsule).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Physics integration
  // ---------------------------------------------------------------------------

  describe("physics integration", () => {
    it("should simulate in a space without errors", () => {
      const space = new Space();
      const body = new Body();
      body.shapes.add(new Capsule(80, 30));
      body.position.setxy(200, 100);
      space.bodies.add(body);
      expect(() => space.step(1 / 60)).not.toThrow();
    });

    it("should collide with ground polygon", () => {
      const space = new Space();
      space.gravity.setxy(0, 600);

      const ground = new Body(BodyType.STATIC);
      ground.shapes.add(new Polygon(Polygon.rect(0, 400, 800, 50)));
      space.bodies.add(ground);

      const body = new Body();
      body.shapes.add(new Capsule(80, 30));
      body.position.setxy(400, 100);
      space.bodies.add(body);

      const startY = body.position.y;
      for (let i = 0; i < 300; i++) {
        space.step(1 / 60);
      }
      expect(body.position.y).toBeGreaterThan(startY);
      expect(body.position.y).toBeGreaterThan(350);
      expect(body.position.y).toBeLessThan(425);
    });

    it("should collide with circle", () => {
      const space = new Space();
      space.gravity.setxy(0, 600);

      const ground = new Body(BodyType.STATIC);
      ground.shapes.add(new Polygon(Polygon.rect(0, 400, 800, 50)));
      space.bodies.add(ground);

      const capsuleBody = new Body();
      capsuleBody.shapes.add(new Capsule(80, 30));
      capsuleBody.position.setxy(400, 100);
      space.bodies.add(capsuleBody);

      const circleBody = new Body();
      circleBody.shapes.add(new Circle(20));
      circleBody.position.setxy(400, 50);
      space.bodies.add(circleBody);

      for (let i = 0; i < 300; i++) {
        space.step(1 / 60);
      }
      // Both should have settled above ground
      expect(capsuleBody.position.y).toBeGreaterThan(300);
      expect(circleBody.position.y).toBeGreaterThan(300);
    });

    it("two capsules should collide", () => {
      const space = new Space();
      space.gravity.setxy(0, 600);

      const ground = new Body(BodyType.STATIC);
      ground.shapes.add(new Polygon(Polygon.rect(0, 400, 800, 50)));
      space.bodies.add(ground);

      const c1Body = new Body();
      c1Body.shapes.add(new Capsule(80, 30));
      c1Body.position.setxy(400, 100);
      space.bodies.add(c1Body);

      const c2Body = new Body();
      c2Body.shapes.add(new Capsule(80, 30));
      c2Body.position.setxy(400, 50);
      space.bodies.add(c2Body);

      for (let i = 0; i < 300; i++) {
        space.step(1 / 60);
      }

      // They should stack, not overlap
      expect(c1Body.position.y).not.toBeCloseTo(c2Body.position.y, 0);
    });

    it("should have positive mass and inertia when on body", () => {
      const body = new Body();
      body.shapes.add(new Capsule(100, 40));
      expect(body.mass).toBeGreaterThan(0);
      expect(body.inertia).toBeGreaterThan(0);
    });
  });
});
