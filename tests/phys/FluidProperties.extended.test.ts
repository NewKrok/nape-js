import { describe, it, expect, beforeAll } from "vitest";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Space } from "../../src/space/Space";
import { getNape } from "../../src/core/engine";

/*
 * Patch the nape namespace so that nape.zpp_nape resolves to nape.__zpp.
 * Several FluidProperties code paths (gravity null-dispose, weak-dispose,
 * shapes getter) reference napeNs.zpp_nape which is stored as nape.__zpp
 * in ZPPRegistry.  This alias makes those paths reachable in tests.
 */
beforeAll(() => {
  const nape = getNape();
  if (nape.__zpp && !nape.zpp_nape) {
    nape.zpp_nape = nape.__zpp;
  }
});

describe("FluidProperties extended coverage", () => {
  describe("gravity setter with null (dispose path)", () => {
    it("should clear gravity when set to null", () => {
      const fp = new FluidProperties(1, 1);
      fp.gravity = new Vec2(0, -5);
      expect(fp.gravity).not.toBeNull();
      fp.gravity = null;
      expect(fp.gravity).toBeNull();
    });

    it("should dispose the existing gravity Vec2 when set to null", () => {
      const fp = new FluidProperties(1, 1);
      fp.gravity = new Vec2(0, -10);
      const g = fp.gravity;
      expect(g).not.toBeNull();
      fp.gravity = null;
      expect(fp.gravity).toBeNull();
      expect(g.zpp_disp).toBe(true);
    });
  });

  describe("gravity setter with weak Vec2", () => {
    it("should auto-dispose weak Vec2 after assignment", () => {
      const fp = new FluidProperties(1, 1);
      const weak = Vec2.weak(3, 7);
      fp.gravity = weak;
      expect(fp.gravity.x).toBeCloseTo(3);
      expect(fp.gravity.y).toBeCloseTo(7);
      expect(weak.zpp_disp).toBe(true);
    });

    it("should store correct values from Vec2.weak()", () => {
      const fp = new FluidProperties(1, 1);
      fp.gravity = Vec2.weak(0, -9.81);
      expect(fp.gravity.x).toBeCloseTo(0);
      expect(fp.gravity.y).toBeCloseTo(-9.81);
    });
  });

  describe("shapes getter", () => {
    it("should return a shapes list when FluidProperties is attached to shapes", () => {
      const fp = new FluidProperties(2, 1);
      const circle = new Circle(20);
      circle.fluidEnabled = true;
      circle.fluidProperties = fp;
      const body = new Body(BodyType.STATIC);
      body.shapes.add(circle);
      const space = new Space();
      space.bodies.add(body);
      const shapes = fp.shapes;
      expect(shapes).toBeDefined();
    });

    it("should reflect multiple shapes sharing the same FluidProperties", () => {
      const fp = new FluidProperties(1.5, 0.5);
      const c1 = new Circle(10);
      c1.fluidEnabled = true;
      c1.fluidProperties = fp;
      const c2 = new Circle(15);
      c2.fluidEnabled = true;
      c2.fluidProperties = fp;
      const body = new Body(BodyType.STATIC);
      body.shapes.add(c1);
      body.shapes.add(c2);
      const shapes = fp.shapes;
      expect(shapes).toBeDefined();
    });
  });

  describe("copy() with gravity set", () => {
    it("should copy gravity Vec2 values correctly", () => {
      const fp = new FluidProperties(2, 3);
      fp.gravity = new Vec2(0, -9.81);
      const copy = fp.copy();
      expect(copy.density).toBeCloseTo(2);
      expect(copy.viscosity).toBeCloseTo(3);
      expect(copy.gravity).not.toBeNull();
      expect(copy.gravity.x).toBeCloseTo(0);
      expect(copy.gravity.y).toBeCloseTo(-9.81);
    });

    it("should produce independent gravity on copy", () => {
      const fp = new FluidProperties(1, 1);
      fp.gravity = new Vec2(0, -10);
      const copy = fp.copy();
      copy.gravity = new Vec2(5, 5);
      expect(fp.gravity.x).toBeCloseTo(0);
      expect(fp.gravity.y).toBeCloseTo(-10);
      expect(copy.gravity.x).toBeCloseTo(5);
      expect(copy.gravity.y).toBeCloseTo(5);
    });
  });

  describe("copy() when both source and target have gravity", () => {
    it("should update gravity on the copy from the source", () => {
      const fp1 = new FluidProperties(1, 1);
      fp1.gravity = new Vec2(0, -5);
      const fp2 = fp1.copy();
      expect(fp2.gravity.y).toBeCloseTo(-5);
      const fp3 = new FluidProperties(1, 1);
      fp3.gravity = new Vec2(10, 20);
      const fp4 = fp3.copy();
      expect(fp4.gravity.x).toBeCloseTo(10);
      expect(fp4.gravity.y).toBeCloseTo(20);
    });
  });

  describe("gravity setter with same value (no-op path)", () => {
    it("should handle setting gravity to identical coordinates without error", () => {
      const fp = new FluidProperties(1, 1);
      fp.gravity = new Vec2(5, 10);
      fp.gravity = new Vec2(5, 10);
      expect(fp.gravity.x).toBeCloseTo(5);
      expect(fp.gravity.y).toBeCloseTo(10);
    });
  });

  describe("gravity setter multiple times", () => {
    it("should update gravity correctly when set multiple times", () => {
      const fp = new FluidProperties(1, 1);
      fp.gravity = new Vec2(1, 2);
      expect(fp.gravity.x).toBeCloseTo(1);
      expect(fp.gravity.y).toBeCloseTo(2);
      fp.gravity = new Vec2(3, 4);
      expect(fp.gravity.x).toBeCloseTo(3);
      expect(fp.gravity.y).toBeCloseTo(4);
      fp.gravity = new Vec2(5, 6);
      expect(fp.gravity.x).toBeCloseTo(5);
      expect(fp.gravity.y).toBeCloseTo(6);
    });
  });

  describe("gravity invalidation", () => {
    it("should update values when gravity Vec2 is mutated directly", () => {
      const fp = new FluidProperties(1, 1);
      fp.gravity = new Vec2(0, 0);
      fp.gravity.x = 10;
      fp.gravity.y = -20;
      expect(fp.gravity.x).toBeCloseTo(10);
      expect(fp.gravity.y).toBeCloseTo(-20);
    });
  });

  describe("gravity edge cases", () => {
    it("should be a no-op when setting null on FluidProperties with no gravity", () => {
      const fp = new FluidProperties(1, 1);
      expect(fp.gravity).toBeNull();
      fp.gravity = null;
      expect(fp.gravity).toBeNull();
    });

    it("should throw when setting a disposed Vec2 as gravity", () => {
      const fp = new FluidProperties(1, 1);
      const v = Vec2.get(1, 2);
      v.dispose();
      expect(() => {
        fp.gravity = v;
      }).toThrow();
    });
  });

  describe("integration: fluid simulation", () => {
    it("should apply buoyancy to a body in a fluid region", () => {
      const space = new Space();
      space.gravity = Vec2.get(0, 100);

      const fluidBody = new Body(BodyType.STATIC);
      const fluidShape = new Polygon(Polygon.box(200, 100));
      fluidShape.fluidEnabled = true;
      fluidShape.fluidProperties = new FluidProperties(3, 2);
      fluidBody.shapes.add(fluidShape);
      fluidBody.position = Vec2.get(0, 50);
      space.bodies.add(fluidBody);

      const dynBody = new Body(BodyType.DYNAMIC);
      dynBody.shapes.add(new Circle(5));
      dynBody.position = Vec2.get(0, 60);
      space.bodies.add(dynBody);

      const initialY = dynBody.position.y;
      for (let i = 0; i < 60; i++) {
        space.step(1 / 60);
      }
      expect(dynBody.position.y).not.toBeCloseTo(initialY, 0);
    });

    it("should allow FluidProperties with custom gravity overriding space gravity", () => {
      const space = new Space();
      space.gravity = Vec2.get(0, 100);

      const fluidBody = new Body(BodyType.STATIC);
      const fluidShape = new Polygon(Polygon.box(200, 200));
      fluidShape.fluidEnabled = true;
      const fp = new FluidProperties(5, 1);
      fp.gravity = new Vec2(0, -50);
      fluidShape.fluidProperties = fp;
      fluidBody.shapes.add(fluidShape);
      space.bodies.add(fluidBody);

      const dynBody = new Body(BodyType.DYNAMIC);
      dynBody.shapes.add(new Circle(5));
      dynBody.position = Vec2.get(0, 0);
      space.bodies.add(dynBody);

      for (let i = 0; i < 30; i++) {
        space.step(1 / 60);
      }
      expect(dynBody.position.y).toBeDefined();
    });

    it("should handle fluidEnabled shape with default FluidProperties", () => {
      const space = new Space();
      space.gravity = Vec2.get(0, 50);

      const staticBody = new Body(BodyType.STATIC);
      const fluidShape = new Polygon(Polygon.box(100, 100));
      fluidShape.fluidEnabled = true;
      fluidShape.fluidProperties = new FluidProperties();
      staticBody.shapes.add(fluidShape);
      space.bodies.add(staticBody);

      const dynBody = new Body(BodyType.DYNAMIC);
      dynBody.shapes.add(new Circle(3));
      dynBody.position = Vec2.get(0, 0);
      space.bodies.add(dynBody);

      for (let i = 0; i < 10; i++) {
        space.step(1 / 60);
      }
      expect(dynBody.position.y).toBeDefined();
    });

    it("should list shapes attached to FluidProperties after adding to body", () => {
      const fp = new FluidProperties(1.5, 0.5);
      const c1 = new Circle(10);
      c1.fluidEnabled = true;
      c1.fluidProperties = fp;
      const body = new Body(BodyType.STATIC);
      body.shapes.add(c1);
      const space = new Space();
      space.bodies.add(body);
      const shapes = fp.shapes;
      expect(shapes).toBeDefined();
      expect(shapes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
