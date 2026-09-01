/**
 * Final coverage gaps:
 * - inner ray casts against circles and polygons (circlesect/polysect inner branches)
 * - ray-cast against a body moved since the last validation (dirty worldCOM)
 * - Body gravMass/gravMassScale guards on shapeless bodies, transformShapes
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Mat23 } from "../../src/geom/Mat23";
import { Ray } from "../../src/geom/Ray";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";

describe("inner ray casts", () => {
  function scene() {
    const space = new Space(new Vec2(0, 0));
    const ball = new Body(BodyType.STATIC, new Vec2(100, 0));
    ball.shapes.add(new Circle(20));
    ball.space = space;
    const box = new Body(BodyType.STATIC, new Vec2(200, 0));
    box.shapes.add(new Polygon(Polygon.box(40, 40)));
    box.space = space;
    return space;
  }

  it("a ray from inside a circle hits its inner surface when inner=true", () => {
    const space = scene();
    const ray = new Ray(new Vec2(100, 0), new Vec2(1, 0));
    const outerHit = space.rayCast(ray, false);
    const innerHit = space.rayCast(ray, true);
    expect(innerHit).not.toBeNull();
    // From the centre, the inner surface is one radius away.
    expect(innerHit!.distance).toBeCloseTo(20, 1);
    innerHit!.dispose();
    if (outerHit) outerHit.dispose();
  });

  it("a ray from inside a polygon hits its inner surface when inner=true", () => {
    const space = scene();
    const ray = new Ray(new Vec2(200, 0), new Vec2(0, 1));
    const innerHit = space.rayCast(ray, true);
    expect(innerHit).not.toBeNull();
    expect(innerHit!.distance).toBeCloseTo(20, 1);
    innerHit!.dispose();
  });

  it("rayMultiCast with inner=true reports interior surfaces of both shapes", () => {
    const space = scene();
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = 500;
    const outer = space.rayMultiCast(ray, false);
    const both = space.rayMultiCast(ray, true);
    // Inner casts add the exit surfaces on top of the entry surfaces.
    expect(both.length).toBeGreaterThan(outer.length);
    outer.foreach((r: any) => r.dispose());
    both.foreach((r: any) => r.dispose());
  });

  it("respects maxDistance cutoffs", () => {
    const space = scene();
    const shortRay = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    shortRay.maxDistance = 50;
    expect(space.rayCast(shortRay)).toBeNull();
    expect(shortRay.maxDistance).toBe(50);

    const aabb = shortRay.aabb();
    expect(aabb.width).toBeCloseTo(50);
  });
});

describe("ray cast against a moved body (stale caches)", () => {
  it("hits a circle body that was repositioned after being added", () => {
    const space = new Space(new Vec2(0, 0));
    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(15));
    ball.space = space;
    space.step(1 / 60);

    // Move and rotate without stepping — worldCOM/axis caches go stale.
    ball.position = new Vec2(120, 40);
    ball.rotation = 1.2;

    const hit = space.rayCast(new Ray(new Vec2(120, -300), new Vec2(0, 1)));
    expect(hit).not.toBeNull();
    expect(hit!.distance).toBeCloseTo(340 - 15, 0);
    hit!.dispose();
  });

  it("hits a polygon body that was repositioned after being added", () => {
    const space = new Space(new Vec2(0, 0));
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(30, 30)));
    box.space = space;
    space.step(1 / 60);

    box.position = new Vec2(-80, 60);
    box.rotation = 0.4;

    const hit = space.rayCast(new Ray(new Vec2(-80, -300), new Vec2(0, 1)));
    expect(hit).not.toBeNull();
    hit!.dispose();
  });
});

describe("Body mass-mode guards and shape transforms", () => {
  it("gravMass on a shapeless DEFAULT-mode body throws", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    expect(() => b.gravMass).toThrow("only makes sense if it contains Shapes");
  });

  it("gravMassScale on a shapeless DEFAULT-mode body throws", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    expect(() => b.gravMassScale).toThrow("only makes sense if it contains Shapes");
  });

  it("gravMass works once shapes exist", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    expect(b.gravMass).toBeGreaterThan(0);
    expect(b.gravMassScale).toBeCloseTo(1);
  });

  it("transformShapes applies a matrix to every shape", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10, new Vec2(5, 0)));
    b.shapes.add(new Polygon(Polygon.box(10, 10)));

    const scaled = b.transformShapes(Mat23.scale(2, 2));
    expect(scaled).toBe(b);
    let circle: any = null;
    b.shapes.foreach((s: any) => {
      if (s.isCircle()) circle = s;
    });
    expect(circle).not.toBeNull();
    expect(circle.castCircle.radius).toBeCloseTo(20);
    expect(circle.castCircle.localCOM.x).toBeCloseTo(10);
  });
});
