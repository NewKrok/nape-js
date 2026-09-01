/**
 * Broadphase query matrix — runs the same query battery under all three
 * broadphase implementations (dynamic AABB tree, sweep-and-prune, spatial
 * hash) and cross-validates that they agree. Exercises the per-broadphase
 * rayCast / convexCast / point / AABB / circle query code paths.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Broadphase } from "../../src/space/Broadphase";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { AABB } from "../../src/geom/AABB";
import { Ray } from "../../src/geom/Ray";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";

const BROADPHASES: Array<[string, () => Broadphase]> = [
  ["DYNAMIC_AABB_TREE", () => Broadphase.DYNAMIC_AABB_TREE],
  ["SWEEP_AND_PRUNE", () => Broadphase.SWEEP_AND_PRUNE],
  ["SPATIAL_HASH", () => Broadphase.SPATIAL_HASH],
];

/** Static floor + a 3x3 grid of resting circles + one detached box far away. */
function buildScene(bp: Broadphase) {
  const space = new Space(new Vec2(0, 400), bp);

  const floor = new Body(BodyType.STATIC, new Vec2(0, 120));
  floor.shapes.add(new Polygon(Polygon.box(600, 20)));
  floor.space = space;

  const balls: Body[] = [];
  for (let ix = 0; ix < 3; ix++) {
    for (let iy = 0; iy < 3; iy++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(-60 + ix * 60, 40 + iy * 25));
      b.shapes.add(new Circle(10));
      b.space = space;
      balls.push(b);
    }
  }

  const farBox = new Body(BodyType.DYNAMIC, new Vec2(500, -200));
  farBox.shapes.add(new Polygon(Polygon.box(30, 30)));
  farBox.space = space;

  for (let i = 0; i < 30; i++) space.step(1 / 60, 8, 8);
  return { space, floor, balls, farBox };
}

for (const [name, get] of BROADPHASES) {
  describe(`broadphase queries under ${name}`, () => {
    it("rayCast hits the floor from above and misses sideways", () => {
      const { space } = buildScene(get());

      const hit = space.rayCast(new Ray(new Vec2(0, -300), new Vec2(0, 1)));
      expect(hit).not.toBeNull();
      hit!.dispose();

      const miss = space.rayCast(new Ray(new Vec2(-2000, -2000), new Vec2(-1, 0)));
      expect(miss).toBeNull();
    });

    it("rayMultiCast returns every shape along the ray in distance order", () => {
      const { space } = buildScene(get());
      const results = space.rayMultiCast(new Ray(new Vec2(-60, -300), new Vec2(0, 1)));
      // Vertical ray through a grid column: 3 circles + the floor.
      expect(results.length).toBeGreaterThanOrEqual(4);
      let prev = -1;
      for (let i = 0; i < results.length; i++) {
        expect(results.at(i).distance).toBeGreaterThanOrEqual(prev);
        prev = results.at(i).distance;
      }
      results.foreach((r: any) => r.dispose());
    });

    it("convexCast sweeps a circle into the floor", () => {
      const { space } = buildScene(get());
      const caster = new Body(BodyType.DYNAMIC, new Vec2(200, -100));
      caster.shapes.add(new Circle(8));
      caster.velocity = new Vec2(0, 800);
      caster.space = space;

      const result = space.convexCast(caster.shapes.at(0), 1, false);
      expect(result).not.toBeNull();
      expect(result!.toi).toBeGreaterThan(0);
      result!.dispose();
    });

    it("shapesUnderPoint and bodiesUnderPoint find the floor", () => {
      const { space, floor } = buildScene(get());
      const shapes = space.shapesUnderPoint(new Vec2(0, 120));
      expect(shapes.length).toBeGreaterThanOrEqual(1);

      const bodies = space.bodiesUnderPoint(new Vec2(0, 120));
      let foundFloor = false;
      bodies.foreach((b: any) => {
        if (b.zpp_inner === (floor as any).zpp_inner) foundFloor = true;
      });
      expect(foundFloor).toBe(true);

      expect(space.bodiesUnderPoint(new Vec2(-5000, -5000)).length).toBe(0);
    });

    it("bodiesInAABB honours strict and containment flags", () => {
      const { space } = buildScene(get());

      // Wide AABB around the grid: floor + 9 balls, not the far box.
      const wide = space.bodiesInAABB(new AABB(-200, 0, 400, 140), false, true);
      expect(wide.length).toBeGreaterThanOrEqual(9);

      // Non-strict inherits original nape's quirk: a shape whose AABB only
      // partially intersects the query is included only when fully contained,
      // so the wide floor drops out but all 9 fully-inside balls remain.
      const loose = space.bodiesInAABB(new AABB(-200, 0, 400, 140), false, false);
      expect(loose.length).toBeGreaterThanOrEqual(9);
      expect(loose.length).toBeLessThanOrEqual(wide.length);

      // Containment: an AABB clipping the grid edge contains fewer bodies
      // than it intersects.
      const contained = space.bodiesInAABB(new AABB(-200, 0, 170, 140), true, true);
      const intersected = space.bodiesInAABB(new AABB(-200, 0, 170, 140), false, true);
      expect(contained.length).toBeLessThanOrEqual(intersected.length);
    });

    it("bodiesInCircle and shapesInCircle agree on the grid region", () => {
      const { space } = buildScene(get());
      const bodies = space.bodiesInCircle(new Vec2(0, 70), 120);
      expect(bodies.length).toBeGreaterThanOrEqual(9);

      const shapes = space.shapesInCircle(new Vec2(0, 70), 120);
      expect(shapes.length).toBeGreaterThanOrEqual(bodies.length - 1);

      const contained = space.bodiesInCircle(new Vec2(0, 70), 120, true);
      expect(contained.length).toBeLessThanOrEqual(bodies.length);

      expect(space.bodiesInCircle(new Vec2(-5000, 0), 10).length).toBe(0);
    });

    it("queries stay consistent after removing and re-adding a body", () => {
      const { space, balls } = buildScene(get());
      const target = balls[4];
      const probe = () => space.bodiesInAABB(new AABB(-200, 0, 400, 140), false, true).length;

      const before = probe();
      target.space = null;
      for (let i = 0; i < 5; i++) space.step(1 / 60, 8, 8);
      expect(probe()).toBe(before - 1);

      target.position = new Vec2(0, 20);
      target.space = space;
      for (let i = 0; i < 5; i++) space.step(1 / 60, 8, 8);
      expect(probe()).toBe(before);
    });
  });
}

describe("broadphase cross-validation", () => {
  it("all three broadphases agree on every query result count", () => {
    const counts: Record<string, number[]> = {};
    for (const [name, get] of BROADPHASES) {
      const { space } = buildScene(get());
      const row: number[] = [];
      row.push(space.bodiesInAABB(new AABB(-200, 0, 400, 140), false, true).length);
      row.push(space.bodiesInCircle(new Vec2(0, 70), 120).length);
      row.push(space.shapesUnderPoint(new Vec2(0, 120)).length);
      row.push(space.rayMultiCast(new Ray(new Vec2(-60, -300), new Vec2(0, 1))).length);
      counts[name] = row;
    }
    expect(counts["SWEEP_AND_PRUNE"]).toEqual(counts["DYNAMIC_AABB_TREE"]);
    expect(counts["SPATIAL_HASH"]).toEqual(counts["DYNAMIC_AABB_TREE"]);
  });
});
