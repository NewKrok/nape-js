import { describe, it, expect } from "vitest";
import { Capsule } from "../../src/shape/Capsule";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Material } from "../../src/phys/Material";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Space } from "../../src/space/Space";

/** Collect all shapes from a body into an array. */
function collectShapes(body: Body) {
  const shapes = [];
  for (let i = 0; i < body.shapes.length; i++) {
    shapes.push(body.shapes.at(i));
  }
  return shapes;
}

describe("Capsule", () => {
  // ---------------------------------------------------------------------------
  // Capsule.create (horizontal)
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should return a Body", () => {
      const body = Capsule.create(100, 40);
      expect(body).toBeInstanceOf(Body);
    });

    it("should have 3 shapes (rect + 2 circles) when width > height", () => {
      const body = Capsule.create(100, 40);
      expect(body.shapes.length).toBe(3);
    });

    it("should have 2 shapes (2 circles only) when width === height", () => {
      const body = Capsule.create(40, 40);
      expect(body.shapes.length).toBe(2);
    });

    it("should create circles with radius = height/2", () => {
      const shapes = collectShapes(Capsule.create(100, 40));
      const circles = shapes.filter((s) => s.isCircle());
      expect(circles).toHaveLength(2);
      for (const c of circles) {
        expect((c.castCircle as Circle).radius).toBeCloseTo(20);
      }
    });

    it("should create a polygon middle section", () => {
      const shapes = collectShapes(Capsule.create(100, 40));
      const polys = shapes.filter((s) => s.isPolygon());
      expect(polys).toHaveLength(1);
    });

    it("should position circle end-caps correctly", () => {
      const shapes = collectShapes(Capsule.create(100, 40));
      // halfLength = (100 - 40) / 2 = 30
      const coms = shapes
        .filter((s) => s.isCircle())
        .map((s) => s.localCOM.x)
        .sort((a, b) => a - b);
      expect(coms).toHaveLength(2);
      expect(coms[0]).toBeCloseTo(-30);
      expect(coms[1]).toBeCloseTo(30);
    });

    it("should simulate in a space without errors", () => {
      const space = new Space();
      const body = Capsule.create(80, 30);
      body.position.setxy(200, 100);
      space.bodies.add(body);
      expect(() => space.step(1 / 60)).not.toThrow();
    });

    it("should apply material to all shapes", () => {
      const mat = new Material(0.5, 0.3, 0.8, 2.0, 0.001);
      const shapes = collectShapes(Capsule.create(100, 40, mat));
      for (const s of shapes) {
        expect(s.material.elasticity).toBeCloseTo(0.5);
        expect(s.material.dynamicFriction).toBeCloseTo(0.3);
      }
    });

    it("should apply filter to all shapes", () => {
      const filter = new InteractionFilter(2, 4);
      const shapes = collectShapes(Capsule.create(100, 40, undefined, filter));
      for (const s of shapes) {
        expect(s.filter.collisionGroup).toBe(2);
        expect(s.filter.collisionMask).toBe(4);
      }
    });

    // --- Error cases ---

    it("should throw for NaN width", () => {
      expect(() => Capsule.create(NaN, 40)).toThrow("NaN");
    });

    it("should throw for NaN height", () => {
      expect(() => Capsule.create(100, NaN)).toThrow("NaN");
    });

    it("should throw for height <= 0", () => {
      expect(() => Capsule.create(100, 0)).toThrow("must be > 0");
      expect(() => Capsule.create(100, -10)).toThrow("must be > 0");
    });

    it("should throw when width < height", () => {
      expect(() => Capsule.create(20, 40)).toThrow("must be >= height");
    });
  });

  // ---------------------------------------------------------------------------
  // Capsule.createVertical
  // ---------------------------------------------------------------------------

  describe("createVertical", () => {
    it("should return a Body", () => {
      const body = Capsule.createVertical(40, 100);
      expect(body).toBeInstanceOf(Body);
    });

    it("should have 3 shapes when height > width", () => {
      const body = Capsule.createVertical(40, 100);
      expect(body.shapes.length).toBe(3);
    });

    it("should have 2 shapes when height === width", () => {
      const body = Capsule.createVertical(40, 40);
      expect(body.shapes.length).toBe(2);
    });

    it("should create circles with radius = width/2", () => {
      const shapes = collectShapes(Capsule.createVertical(40, 100));
      const circles = shapes.filter((s) => s.isCircle());
      expect(circles).toHaveLength(2);
      for (const c of circles) {
        expect((c.castCircle as Circle).radius).toBeCloseTo(20);
      }
    });

    it("should position circle end-caps along Y axis", () => {
      const shapes = collectShapes(Capsule.createVertical(40, 100));
      // halfLength = (100 - 40) / 2 = 30
      const coms = shapes
        .filter((s) => s.isCircle())
        .map((s) => s.localCOM.y)
        .sort((a, b) => a - b);
      expect(coms).toHaveLength(2);
      expect(coms[0]).toBeCloseTo(-30);
      expect(coms[1]).toBeCloseTo(30);
    });

    it("should simulate in a space without errors", () => {
      const space = new Space();
      const body = Capsule.createVertical(30, 80);
      body.position.setxy(200, 100);
      space.bodies.add(body);
      expect(() => space.step(1 / 60)).not.toThrow();
    });

    // --- Error cases ---

    it("should throw for NaN arguments", () => {
      expect(() => Capsule.createVertical(NaN, 100)).toThrow("NaN");
      expect(() => Capsule.createVertical(40, NaN)).toThrow("NaN");
    });

    it("should throw for width <= 0", () => {
      expect(() => Capsule.createVertical(0, 100)).toThrow("must be > 0");
      expect(() => Capsule.createVertical(-5, 100)).toThrow("must be > 0");
    });

    it("should throw when height < width", () => {
      expect(() => Capsule.createVertical(60, 40)).toThrow("must be >= width");
    });
  });

  // ---------------------------------------------------------------------------
  // Physics integration
  // ---------------------------------------------------------------------------

  describe("physics integration", () => {
    it("should collide with ground", () => {
      const space = new Space();
      space.gravity.setxy(0, 600);

      const ground = new Body(BodyType.STATIC);
      ground.shapes.add(new Polygon(Polygon.rect(0, 400, 800, 50)));
      space.bodies.add(ground);

      const capsule = Capsule.create(80, 30);
      capsule.position.setxy(400, 100);
      space.bodies.add(capsule);

      const startY = capsule.position.y;
      for (let i = 0; i < 300; i++) {
        space.step(1 / 60);
      }
      expect(capsule.position.y).toBeGreaterThan(startY);
      expect(capsule.position.y).toBeGreaterThan(350);
      expect(capsule.position.y).toBeLessThan(420);
    });

    it("should have positive mass and inertia", () => {
      const body = Capsule.create(100, 40);
      expect(body.mass).toBeGreaterThan(0);
      expect(body.inertia).toBeGreaterThan(0);
    });

    it("two capsules should collide and stack", () => {
      const space = new Space();
      space.gravity.setxy(0, 600);

      const ground = new Body(BodyType.STATIC);
      ground.shapes.add(new Polygon(Polygon.rect(0, 400, 800, 50)));
      space.bodies.add(ground);

      const c1 = Capsule.create(80, 30);
      c1.position.setxy(400, 100);
      space.bodies.add(c1);

      const c2 = Capsule.create(80, 30);
      c2.position.setxy(400, 50);
      space.bodies.add(c2);

      for (let i = 0; i < 300; i++) {
        space.step(1 / 60);
      }

      expect(c1.position.y).not.toBeCloseTo(c2.position.y, 0);
    });

    it("vertical capsule should fall and rest on ground", () => {
      const space = new Space();
      space.gravity.setxy(0, 600);

      const ground = new Body(BodyType.STATIC);
      ground.shapes.add(new Polygon(Polygon.rect(0, 400, 800, 50)));
      space.bodies.add(ground);

      const capsule = Capsule.createVertical(30, 80);
      capsule.position.setxy(400, 100);
      space.bodies.add(capsule);

      for (let i = 0; i < 300; i++) {
        space.step(1 / 60);
      }

      expect(capsule.position.y).toBeGreaterThan(300);
      expect(capsule.position.y).toBeLessThan(420);
    });
  });
});
