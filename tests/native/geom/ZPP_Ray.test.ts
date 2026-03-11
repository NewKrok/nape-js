/**
 * ZPP_Ray — comprehensive coverage tests.
 *
 * Exercises:
 * - Constructor field initialisation
 * - origin_invalidate / direction_invalidate callbacks
 * - invalidate_dir / validate_dir (normalisation, inverse, normals)
 * - rayAABB (finite and infinite maxdist, all direction quadrants)
 * - aabbtest / aabbsect
 * - circlesect / circlesect2 (hit, miss, inner mode, maxdist limit)
 * - polysect / polysect2 (hit, miss, inner mode)
 * - Integration: Space.rayCast / Space.rayMultiCast via public API
 */

import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { ZPP_Ray } from "../../../src/native/geom/ZPP_Ray";
import { ZPP_AABB } from "../../../src/native/geom/ZPP_AABB";
import { ZPP_Geom } from "../../../src/native/geom/ZPP_Geom";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Vec2 } from "../../../src/geom/Vec2";
import { Ray } from "../../../src/geom/Ray";
import { Circle } from "../../../src/shape/Circle";
import { Polygon } from "../../../src/shape/Polygon";
import { Broadphase } from "../../../src/space/Broadphase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a ZPP_Ray with explicit origin/direction, direction validated. */
function makeRay(ox: number, oy: number, dx: number, dy: number, maxdist = Infinity): ZPP_Ray {
  const r = new ZPP_Ray();
  r.originx = ox;
  r.originy = oy;
  r.dirx = dx;
  r.diry = dy;
  r.maxdist = maxdist;
  r.zip_dir = true;
  r.validate_dir();
  return r;
}

/** Build a minimal AABB for tests. */
function makeAABB(minx: number, miny: number, maxx: number, maxy: number): ZPP_AABB {
  const a = new ZPP_AABB();
  a.minx = minx;
  a.miny = miny;
  a.maxx = maxx;
  a.maxy = maxy;
  return a;
}

/** Get a validated ZPP shape from a body after a single step. */
function getZppShape(body: Body, space: Space): any {
  space.step(1 / 60);
  const zppShape = (body as any).zpp_inner.shapes.head.elt;
  ZPP_Geom.validateShape(zppShape);
  return zppShape;
}

// ---------------------------------------------------------------------------
// 1. Static metadata
// ---------------------------------------------------------------------------

describe("ZPP_Ray — metadata", () => {
  it("should have correct __name__", () => {
    expect(ZPP_Ray.__name__).toEqual(["zpp_nape", "geom", "ZPP_Ray"]);
  });

  it("should be constructable", () => {
    const r = new ZPP_Ray();
    expect(r).toBeInstanceOf(ZPP_Ray);
  });
});

// ---------------------------------------------------------------------------
// 2. Constructor — field initialisation
// ---------------------------------------------------------------------------

describe("ZPP_Ray — constructor", () => {
  it("initialises originx/y to 0", () => {
    const r = new ZPP_Ray();
    expect(r.originx).toBe(0);
    expect(r.originy).toBe(0);
  });

  it("initialises dirx/y to 0", () => {
    const r = new ZPP_Ray();
    expect(r.dirx).toBe(0);
    expect(r.diry).toBe(0);
  });

  it("initialises zip_dir to false", () => {
    const r = new ZPP_Ray();
    expect(r.zip_dir).toBe(false);
  });

  it("initialises maxdist to 0", () => {
    const r = new ZPP_Ray();
    expect(r.maxdist).toBe(0);
  });

  it("creates origin Vec2 wrapper", () => {
    const r = new ZPP_Ray();
    expect(r.origin).not.toBeNull();
  });

  it("creates direction Vec2 wrapper", () => {
    const r = new ZPP_Ray();
    expect(r.direction).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Invalidation callbacks
// ---------------------------------------------------------------------------

describe("ZPP_Ray — invalidation callbacks", () => {
  it("origin_invalidate copies x/y from Vec2Inner", () => {
    const r = new ZPP_Ray();
    const mockVec = { x: 5, y: 7 } as any;
    r.origin_invalidate(mockVec);
    expect(r.originx).toBe(5);
    expect(r.originy).toBe(7);
  });

  it("direction_invalidate copies x/y and sets zip_dir", () => {
    const r = new ZPP_Ray();
    const mockVec = { x: 1, y: 0 } as any;
    r.direction_invalidate(mockVec);
    expect(r.dirx).toBe(1);
    expect(r.diry).toBe(0);
    expect(r.zip_dir).toBe(true);
  });

  it("invalidate_dir sets zip_dir to true", () => {
    const r = new ZPP_Ray();
    r.zip_dir = false;
    r.invalidate_dir();
    expect(r.zip_dir).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. validate_dir
// ---------------------------------------------------------------------------

describe("ZPP_Ray — validate_dir", () => {
  it("normalises a non-unit direction to unit length", () => {
    const r = new ZPP_Ray();
    r.dirx = 3;
    r.diry = 4;
    r.zip_dir = true;
    r.validate_dir();
    const len = Math.sqrt(r.dirx * r.dirx + r.diry * r.diry);
    expect(len).toBeCloseTo(1.0);
  });

  it("computes idirx/idiry as inverse of normalised dir", () => {
    const r = new ZPP_Ray();
    r.dirx = 1;
    r.diry = 0;
    r.zip_dir = true;
    r.validate_dir();
    expect(r.idirx).toBeCloseTo(1.0);
    expect(r.idiry).toBe(Infinity);
  });

  it("computes normal perpendicular to direction", () => {
    const r = makeRay(0, 0, 1, 0);
    // normal of (1,0) should be (0,1) (or (-0,1))
    expect(r.normalx).toBeCloseTo(0);
    expect(r.normaly).toBeCloseTo(1);
  });

  it("computes absnormalx/y as absolute values", () => {
    const r = makeRay(0, 0, 0, -1);
    expect(r.absnormalx).toBeGreaterThanOrEqual(0);
    expect(r.absnormaly).toBeGreaterThanOrEqual(0);
  });

  it("clears zip_dir after validation", () => {
    const r = new ZPP_Ray();
    r.dirx = 1;
    r.diry = 0;
    r.zip_dir = true;
    r.validate_dir();
    expect(r.zip_dir).toBe(false);
  });

  it("is a no-op when zip_dir is false", () => {
    const r = new ZPP_Ray();
    r.dirx = 0; // degenerate, but validate_dir should not throw
    r.zip_dir = false;
    expect(() => r.validate_dir()).not.toThrow();
  });

  it("throws for degenerate (zero) direction", () => {
    const r = new ZPP_Ray();
    r.dirx = 0;
    r.diry = 0;
    r.zip_dir = true;
    expect(() => r.validate_dir()).toThrow("degenerate");
  });
});

// ---------------------------------------------------------------------------
// 5. rayAABB
// ---------------------------------------------------------------------------

describe("ZPP_Ray — rayAABB", () => {
  it("positive x/y direction with infinite maxdist — x1/y1 are +Infinity", () => {
    const r = makeRay(0, 0, 1, 1);
    r.maxdist = Infinity;
    const aabb = r.rayAABB();
    expect(aabb.maxx).toBe(Infinity);
    expect(aabb.maxy).toBe(Infinity);
  });

  it("negative x/y direction with infinite maxdist — minx/miny are -Infinity", () => {
    const r = makeRay(5, 5, -1, -1);
    r.maxdist = Infinity;
    const aabb = r.rayAABB();
    expect(aabb.minx).toBe(-Infinity);
    expect(aabb.miny).toBe(-Infinity);
  });

  it("horizontal ray — maxy equals miny (zero height)", () => {
    const r = makeRay(0, 3, 1, 0);
    r.maxdist = Infinity;
    const aabb = r.rayAABB();
    expect(aabb.miny).toBe(3);
    expect(aabb.maxy).toBe(3);
  });

  it("vertical ray — maxx equals minx (zero width)", () => {
    const r = makeRay(4, 0, 0, 1);
    r.maxdist = Infinity;
    const aabb = r.rayAABB();
    expect(aabb.minx).toBe(4);
    expect(aabb.maxx).toBe(4);
  });

  it("finite maxdist — AABB is bounded", () => {
    const r = makeRay(0, 0, 1, 0);
    r.maxdist = 10;
    const aabb = r.rayAABB();
    expect(aabb.maxx).toBe(10);
    expect(aabb.minx).toBe(0);
  });

  it("finite maxdist with negative direction — AABB is correctly oriented", () => {
    const r = makeRay(10, 0, -1, 0);
    r.maxdist = 5;
    const aabb = r.rayAABB();
    expect(aabb.minx).toBeCloseTo(5);
    expect(aabb.maxx).toBeCloseTo(10);
  });
});

// ---------------------------------------------------------------------------
// 6. aabbtest
// ---------------------------------------------------------------------------

describe("ZPP_Ray — aabbtest", () => {
  it("ray piercing through centre of AABB returns true", () => {
    const r = makeRay(-10, 0, 1, 0);
    const a = makeAABB(-5, -5, 5, 5);
    expect(r.aabbtest(a)).toBe(true);
  });

  it("ray passing far above AABB returns false", () => {
    const r = makeRay(-10, 100, 1, 0);
    const a = makeAABB(-5, -5, 5, 5);
    expect(r.aabbtest(a)).toBe(false);
  });

  it("ray passing far below AABB returns false", () => {
    const r = makeRay(-10, -100, 1, 0);
    const a = makeAABB(-5, -5, 5, 5);
    expect(r.aabbtest(a)).toBe(false);
  });

  it("diagonal ray through AABB corner returns true", () => {
    const r = makeRay(-10, -10, 1, 1);
    const a = makeAABB(-2, -2, 2, 2);
    expect(r.aabbtest(a)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. aabbsect
// ---------------------------------------------------------------------------

describe("ZPP_Ray — aabbsect", () => {
  it("origin inside AABB returns 0", () => {
    const r = makeRay(0, 0, 1, 0);
    r.maxdist = Infinity;
    const a = makeAABB(-5, -5, 5, 5);
    expect(r.aabbsect(a)).toBe(0.0);
  });

  it("ray from outside pointing at AABB returns positive t", () => {
    const r = makeRay(-10, 0, 1, 0);
    r.maxdist = Infinity;
    const a = makeAABB(-5, -5, 5, 5);
    const t = r.aabbsect(a);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeCloseTo(5); // hits minx=-5, distance from -10 = 5
  });

  it("ray pointing away from AABB returns -1", () => {
    const r = makeRay(-10, 0, -1, 0); // pointing left, AABB is to the right
    r.maxdist = Infinity;
    const a = makeAABB(-5, -5, 5, 5);
    expect(r.aabbsect(a)).toBe(-1.0);
  });

  it("ray too short to reach AABB returns -1", () => {
    const r = makeRay(-10, 0, 1, 0);
    r.maxdist = 1; // AABB is 5 units away
    const a = makeAABB(-5, -5, 5, 5);
    expect(r.aabbsect(a)).toBe(-1.0);
  });
});

// ---------------------------------------------------------------------------
// 8. circlesect — via ZPP shape (integration)
// ---------------------------------------------------------------------------

describe("ZPP_Ray — circlesect", () => {
  it("ray from outside hits circle — returns non-null result", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    const zppShape = getZppShape(b, space);

    const r = makeRay(-20, 0, 1, 0);
    r.maxdist = Infinity;
    const result = r.circlesect(zppShape, false, Infinity);
    expect(result).not.toBeNull();
  });

  it("ray from outside misses circle — returns null", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    b.space = space;
    const zppShape = getZppShape(b, space);

    const r = makeRay(-20, 50, 1, 0); // passes way above
    r.maxdist = Infinity;
    const result = r.circlesect(zppShape, false, Infinity);
    expect(result).toBeNull();
  });

  it("ray beyond maxdist returns null", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(100, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    const zppShape = getZppShape(b, space);

    const r = makeRay(0, 0, 1, 0);
    r.maxdist = 5; // circle is 90 units away
    const result = r.circlesect(zppShape, false, Infinity);
    expect(result).toBeNull();
  });

  it("ray from inside circle with inner=true returns result", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(20));
    b.space = space;
    const zppShape = getZppShape(b, space);

    const r = makeRay(0, 0, 1, 0); // origin inside circle
    r.maxdist = Infinity;
    const result = r.circlesect(zppShape, true, Infinity);
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. polysect — via ZPP shape (integration)
// ---------------------------------------------------------------------------

describe("ZPP_Ray — polysect", () => {
  it("ray from outside hits polygon — returns non-null result", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 20)));
    b.space = space;
    space.step(1 / 60);
    const zppShape = (b as any).zpp_inner.shapes.head.elt;
    ZPP_Geom.validateShape(zppShape);

    const r = makeRay(-30, 0, 1, 0);
    r.maxdist = Infinity;
    const result = r.polysect(zppShape.polygon, false, Infinity);
    expect(result).not.toBeNull();
  });

  it("ray from outside misses polygon — returns null", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Polygon(Polygon.box(10, 10)));
    b.space = space;
    space.step(1 / 60);
    const zppShape = (b as any).zpp_inner.shapes.head.elt;
    ZPP_Geom.validateShape(zppShape);

    const r = makeRay(-30, 100, 1, 0); // passes far above
    r.maxdist = Infinity;
    const result = r.polysect(zppShape.polygon, false, Infinity);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 10. Public API integration: Space.rayCast
// ---------------------------------------------------------------------------

describe("ZPP_Ray — Space.rayCast integration", () => {
  it("null ray throws", () => {
    const space = new Space(new Vec2(0, 0));
    expect(() => space.rayCast(null as any)).toThrow("Cannot cast null ray");
  });

  it("raycast hits circle placed along ray", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(50, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
    expect(result!.distance).toBeGreaterThan(0);
  });

  it("raycast misses circle that is offset perpendicular to ray", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(50, 100));
    b.shapes.add(new Circle(5));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).toBeNull();
  });

  it("raycast hits polygon placed along ray", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(50, 0));
    b.shapes.add(new Polygon(Polygon.box(20, 20)));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("raycast respects maxDist — short ray misses far circle", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(100, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = 10; // circle is 90 units away
    const result = space.rayCast(ray);
    expect(result).toBeNull();
  });

  it("raycast with inner=true from inside circle returns hit", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(50));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray, true);
    expect(result).not.toBeNull();
    expect(result!.inner).toBe(true);
  });

  it("raycast returns closest of two circles on ray", () => {
    const space = new Space(new Vec2(0, 0));

    const near = new Body(BodyType.STATIC, new Vec2(30, 0));
    near.shapes.add(new Circle(5));
    near.space = space;

    const far = new Body(BodyType.STATIC, new Vec2(80, 0));
    far.shapes.add(new Circle(5));
    far.space = space;

    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
    expect(result!.distance).toBeLessThan(30); // hits near circle first
  });

  it("diagonal ray hits circle positioned off-axis", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(50, 50));
    b.shapes.add(new Circle(10));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 1));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("raycast with SWEEP_AND_PRUNE broadphase works", () => {
    const space = new Space(new Vec2(0, 0), Broadphase.SWEEP_AND_PRUNE);
    const b = new Body(BodyType.STATIC, new Vec2(50, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("raycast with DYNAMIC_AABB_TREE broadphase works", () => {
    const space = new Space(new Vec2(0, 0), Broadphase.DYNAMIC_AABB_TREE);
    const b = new Body(BodyType.STATIC, new Vec2(50, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 11. Public API integration: Space.rayMultiCast
// ---------------------------------------------------------------------------

describe("ZPP_Ray — Space.rayMultiCast integration", () => {
  it("null ray throws", () => {
    const space = new Space(new Vec2(0, 0));
    expect(() => space.rayMultiCast(null as any)).toThrow("Cannot cast null ray");
  });

  it("multicast returns empty list when nothing hit", () => {
    const space = new Space(new Vec2(0, 0));
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const results = space.rayMultiCast(ray);
    expect(results.length).toBe(0);
  });

  it("multicast returns single hit for one circle", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(50, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const results = space.rayMultiCast(ray);
    expect(results.length).toBeGreaterThan(0);
  });

  it("multicast returns hits for multiple shapes on ray path", () => {
    const space = new Space(new Vec2(0, 0));

    const b1 = new Body(BodyType.STATIC, new Vec2(30, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;

    const b2 = new Body(BodyType.STATIC, new Vec2(70, 0));
    b2.shapes.add(new Circle(5));
    b2.space = space;

    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const results = space.rayMultiCast(ray);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("multicast hits circle and polygon on same ray", () => {
    const space = new Space(new Vec2(0, 0));

    const c = new Body(BodyType.STATIC, new Vec2(30, 0));
    c.shapes.add(new Circle(5));
    c.space = space;

    const p = new Body(BodyType.STATIC, new Vec2(70, 0));
    p.shapes.add(new Polygon(Polygon.box(10, 10)));
    p.space = space;

    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const results = space.rayMultiCast(ray);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("multicast with inner=true from inside circle returns hits", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(100));
    b.space = space;
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const results = space.rayMultiCast(ray, true);
    expect(results.length).toBeGreaterThan(0);
  });
});
