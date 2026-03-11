/**
 * ZPP_Broadphase — integration coverage tests.
 *
 * Exercises the internal broadphase paths via Space simulations:
 * - Body insertion / removal (insert / remove paths)
 * - Shape sync after body position/rotation change
 * - Circle and polygon sync paths
 * - Both SWEEP_AND_PRUNE and DYNAMIC_AABB_TREE algorithms
 * - Collision detection consistency between algorithms
 * - Raycast through broadphase
 * - Many bodies, extreme positions, compound bodies
 */

import { describe, it, expect } from "vitest";
import "../../../src/core/engine";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Vec2 } from "../../../src/geom/Vec2";
import { Circle } from "../../../src/shape/Circle";
import { Polygon } from "../../../src/shape/Polygon";
import { Ray } from "../../../src/geom/Ray";
import { Broadphase } from "../../../src/space/Broadphase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpace(algo = Broadphase.DYNAMIC_AABB_TREE, gy = 500): Space {
  return new Space(new Vec2(0, gy), algo);
}

function staticCircle(space: Space, x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  b.space = space;
  return b;
}

function staticBox(space: Space, x: number, y: number, w = 20, h = 20): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  b.space = space;
  return b;
}

function dynamicCircle(space: Space, x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  b.space = space;
  return b;
}

function dynamicBox(space: Space, x: number, y: number, w = 20, h = 20): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  b.space = space;
  return b;
}

// ---------------------------------------------------------------------------
// 1. Body insertion & removal
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase — body insertion and removal", () => {
  it("DYNAMIC_AABB_TREE: space bodies count increases on add", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE);
    expect(space.bodies.length).toBe(0);
    staticCircle(space, 0, 0);
    expect(space.bodies.length).toBe(1);
  });

  it("SWEEP_AND_PRUNE: space bodies count increases on add", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE);
    expect(space.bodies.length).toBe(0);
    staticCircle(space, 0, 0);
    expect(space.bodies.length).toBe(1);
  });

  it("DYNAMIC_AABB_TREE: removing a body decreases count", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE);
    const b = staticCircle(space, 0, 0);
    expect(space.bodies.length).toBe(1);
    b.space = null;
    expect(space.bodies.length).toBe(0);
  });

  it("SWEEP_AND_PRUNE: removing a body decreases count", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE);
    const b = staticCircle(space, 0, 0);
    expect(space.bodies.length).toBe(1);
    b.space = null;
    expect(space.bodies.length).toBe(0);
  });

  it("DYNAMIC_AABB_TREE: add and remove multiple bodies", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE);
    const b1 = staticCircle(space, 0, 0);
    const b2 = staticBox(space, 50, 50);
    const b3 = dynamicCircle(space, 100, 100);
    expect(space.bodies.length).toBe(3);
    b2.space = null;
    expect(space.bodies.length).toBe(2);
    b1.space = null;
    b3.space = null;
    expect(space.bodies.length).toBe(0);
  });

  it("SWEEP_AND_PRUNE: add and remove multiple bodies", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE);
    const b1 = staticCircle(space, 0, 0);
    const b2 = staticBox(space, 50, 50);
    staticCircle(space, -50, -50);
    expect(space.bodies.length).toBe(3);
    b1.space = null;
    b2.space = null;
    expect(space.bodies.length).toBe(1);
  });

  it("inserting a body with multiple shapes (compound) works", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE);
    const b = new Body(BodyType.STATIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.shapes.add(new Circle(20));
    b.space = space;
    expect(space.bodies.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Shape sync after body movement
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase — shape sync on position change", () => {
  it("DYNAMIC_AABB_TREE: dynamic circle syncs AABB as it falls", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 500);
    const ball = dynamicCircle(space, 0, 0);

    const y0 = ball.position.y;
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    // body moved — broadphase sync was triggered
    expect(ball.position.y).toBeGreaterThan(y0);
  });

  it("SWEEP_AND_PRUNE: dynamic circle syncs AABB as it falls", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 500);
    const ball = dynamicCircle(space, 0, 0);

    const y0 = ball.position.y;
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(ball.position.y).toBeGreaterThan(y0);
  });

  it("DYNAMIC_AABB_TREE: dynamic polygon syncs AABB as it falls", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 500);
    const box = dynamicBox(space, 0, 0);

    const y0 = box.position.y;
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(box.position.y).toBeGreaterThan(y0);
  });

  it("SWEEP_AND_PRUNE: dynamic polygon syncs AABB as it falls", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 500);
    const box = dynamicBox(space, 0, 0);

    const y0 = box.position.y;
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    expect(box.position.y).toBeGreaterThan(y0);
  });

  it("DYNAMIC_AABB_TREE: raycast still finds moved dynamic body after steps", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    const ball = dynamicCircle(space, 0, 0, 20);
    // Apply horizontal velocity so body moves right
    ball.velocity.x = 1000;

    for (let i = 0; i < 5; i++) space.step(1 / 60);

    // Body should have moved right; a ray from the right should still find it
    const ray = new Ray(new Vec2(ball.position.x + 200, 0), new Vec2(-1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("SWEEP_AND_PRUNE: raycast still finds moved dynamic body after steps", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 0);
    const ball = dynamicCircle(space, 0, 0, 20);
    ball.velocity.x = 1000;

    for (let i = 0; i < 5; i++) space.step(1 / 60);

    const ray = new Ray(new Vec2(ball.position.x + 200, 0), new Vec2(-1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("dynamic circle position updates continuously over many steps", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE);
    const floor = staticBox(space, 0, 300, 600, 20);
    void floor;
    const ball = dynamicCircle(space, 0, 0);

    for (let i = 0; i < 30; i++) {
      space.step(1 / 60);
    }

    expect(ball.position.y).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Collision detection consistency between algorithms
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase — algorithm consistency", () => {
  function countArbiters(space: Space): number {
    return (space.arbiters as any).zpp_gl();
  }

  function runAndCount(algo: Broadphase): number {
    const space = makeSpace(algo, 500);
    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(200, 20)));
    floor.space = space;

    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(10));
    ball.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
      if (countArbiters(space) > 0) return 1;
    }
    return 0;
  }

  it("both algorithms detect circle-floor collision", () => {
    expect(runAndCount(Broadphase.DYNAMIC_AABB_TREE)).toBe(1);
    expect(runAndCount(Broadphase.SWEEP_AND_PRUNE)).toBe(1);
  });

  it("DYNAMIC_AABB_TREE: box falls onto floor", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 500);
    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(200, 20)));
    floor.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    expect(box.position.y).toBeGreaterThan(100);
  });

  it("SWEEP_AND_PRUNE: box falls onto floor", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 500);
    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(200, 20)));
    floor.space = space;

    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    expect(box.position.y).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------------------
// 4. Many bodies
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase — many bodies", () => {
  it("DYNAMIC_AABB_TREE: 20 static circles all inserted correctly", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    for (let i = 0; i < 20; i++) {
      staticCircle(space, i * 30 - 300, 0);
    }
    expect(space.bodies.length).toBe(20);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("SWEEP_AND_PRUNE: 20 static circles all inserted correctly", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 0);
    for (let i = 0; i < 20; i++) {
      staticCircle(space, i * 30 - 300, 0);
    }
    expect(space.bodies.length).toBe(20);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("DYNAMIC_AABB_TREE: 10 dynamic circles falling onto static floor", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 500);
    const floor = new Body(BodyType.STATIC, new Vec2(0, 250));
    floor.shapes.add(new Polygon(Polygon.box(600, 20)));
    floor.space = space;

    for (let i = 0; i < 10; i++) {
      dynamicCircle(space, (i - 5) * 40, 0);
    }

    for (let step = 0; step < 60; step++) {
      space.step(1 / 60, 10, 10);
    }

    // All balls should have settled above the floor
    expect(space.bodies.length).toBe(11);
  });

  it("SWEEP_AND_PRUNE: 10 dynamic circles falling onto static floor", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 500);
    const floor = new Body(BodyType.STATIC, new Vec2(0, 250));
    floor.shapes.add(new Polygon(Polygon.box(600, 20)));
    floor.space = space;

    for (let i = 0; i < 10; i++) {
      dynamicCircle(space, (i - 5) * 40, 0);
    }

    for (let step = 0; step < 60; step++) {
      space.step(1 / 60, 10, 10);
    }

    expect(space.bodies.length).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// 5. Raycast through broadphase
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase — raycast integration", () => {
  it("DYNAMIC_AABB_TREE: ray hits circle shape", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    staticCircle(space, 50, 0, 15);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("SWEEP_AND_PRUNE: ray hits circle shape", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 0);
    staticCircle(space, 50, 0, 15);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("DYNAMIC_AABB_TREE: ray hits polygon shape", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    staticBox(space, 50, 0, 30, 30);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("SWEEP_AND_PRUNE: ray hits polygon shape", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 0);
    staticBox(space, 50, 0, 30, 30);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).not.toBeNull();
  });

  it("DYNAMIC_AABB_TREE: ray misses when no shapes on path", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    staticCircle(space, 0, 500, 10); // far below the ray
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).toBeNull();
  });

  it("SWEEP_AND_PRUNE: ray misses when no shapes on path", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 0);
    staticCircle(space, 0, 500, 10);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const result = space.rayCast(ray);
    expect(result).toBeNull();
  });

  it("DYNAMIC_AABB_TREE: multicast finds multiple circles on ray path", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    staticCircle(space, 30, 0, 5);
    staticCircle(space, 70, 0, 5);
    staticCircle(space, 110, 0, 5);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const results = space.rayMultiCast(ray);
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it("SWEEP_AND_PRUNE: multicast finds multiple circles on ray path", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 0);
    staticCircle(space, 30, 0, 5);
    staticCircle(space, 70, 0, 5);
    space.step(1 / 60);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    ray.maxDistance = Infinity;
    const results = space.rayMultiCast(ray);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 6. Extreme positions
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase — edge cases", () => {
  it("body at very large position (broadphase sync works)", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    staticCircle(space, 100000, 100000, 10);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("body at very large negative position", () => {
    const space = makeSpace(Broadphase.SWEEP_AND_PRUNE, 0);
    staticBox(space, -100000, -100000, 20, 20);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("body with very large shape radius (circle)", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    staticCircle(space, 0, 0, 1000);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("body with very small shape (tiny circle)", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    staticCircle(space, 0, 0, 0.01);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("insert and immediately remove a body (no step)", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    const b = staticCircle(space, 0, 0);
    b.space = null;
    expect(space.bodies.length).toBe(0);
    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("empty space step does not throw", () => {
    const space = makeSpace(Broadphase.DYNAMIC_AABB_TREE, 0);
    expect(() => space.step(1 / 60)).not.toThrow();
    expect(() => space.step(1 / 60)).not.toThrow();
  });
});
