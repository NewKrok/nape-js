import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Ray } from "../../src/geom/Ray";
import { AABB } from "../../src/geom/AABB";
import { Capsule } from "../../src/shape/Capsule";
import { Compound } from "../../src/phys/Compound";

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

function dynamicCircle(x: number, y: number, radius: number): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(radius));
  return b;
}

function dynamicBox(x: number, y: number, w: number, h: number): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function staticBox(x: number, y: number, w: number, h: number): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

describe("Broadphase extended integration tests", () => {
  // 1. Bodies added to space are found by AABB query
  it("should find bodies added to space via AABB query", () => {
    const space = new Space();
    const b = dynamicCircle(50, 50, 10);
    b.space = space;
    step(space, 1);

    const result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // 2. Bodies removed from space are NOT found by AABB query
  it("should not find removed bodies via AABB query", () => {
    const space = new Space();
    const b = dynamicCircle(50, 50, 10);
    b.space = space;
    step(space, 1);

    // Verify body is found first
    let result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Remove and query again
    b.space = null;
    step(space, 1);
    result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBe(0);
  });

  // 3. Moving body updates broadphase (body at new position found by query)
  it("should update broadphase when body moves", () => {
    const space = new Space();
    const b = dynamicCircle(50, 50, 10);
    b.space = space;
    step(space, 1);

    // Body should be at ~(50, 50) initially
    let result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Teleport body far away
    b.position.setxy(500, 500);
    step(space, 1);

    // Old location should be empty
    result = space.bodiesInAABB(new AABB(30, 30, 40, 40)) as any;
    expect(result.length).toBe(0);

    // New location should have the body
    result = space.bodiesInAABB(new AABB(480, 480, 40, 40)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // 4. bodiesInCircle finds correct bodies
  it("should find bodies within circle query", () => {
    const space = new Space();
    const b = dynamicCircle(100, 100, 10);
    b.space = space;
    step(space, 1);

    const result = space.bodiesInCircle(new Vec2(100, 100), 20) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // 5. bodiesInCircle excludes distant bodies
  it("should exclude distant bodies from circle query", () => {
    const space = new Space();
    const b1 = dynamicCircle(100, 100, 10);
    const b2 = dynamicCircle(500, 500, 10);
    b1.space = space;
    b2.space = space;
    step(space, 1);

    const result = space.bodiesInCircle(new Vec2(100, 100), 30) as any;
    expect(result.length).toBe(1);
  });

  // 6. Raycast finds nearest body along ray
  it("should find the nearest body via raycast", () => {
    const space = new Space();
    const b = dynamicCircle(100, 0, 15);
    b.space = space;
    step(space, 1);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray) as any;
    expect(result).not.toBeNull();
    expect(result.distance).toBeGreaterThan(0);
  });

  // 7. Raycast misses when no bodies in ray path
  it("should return null when raycast misses all bodies", () => {
    const space = new Space();
    const b = dynamicCircle(100, 100, 10);
    b.space = space;
    step(space, 1);

    // Ray pointing along x-axis, body is at (100, 100) — well off the ray path
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray);
    expect(result).toBeNull();
  });

  // 8. Raycast with many bodies returns closest hit
  it("should return closest hit when many bodies are along the ray", () => {
    const space = new Space();
    const b1 = dynamicCircle(100, 0, 10);
    const b2 = dynamicCircle(200, 0, 10);
    const b3 = dynamicCircle(300, 0, 10);
    b1.space = space;
    b2.space = space;
    b3.space = space;
    step(space, 1);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray) as any;
    expect(result).not.toBeNull();
    // The closest body is b1 at x=100, so distance should be around 90 (100 - radius 10)
    expect(result.distance).toBeLessThan(150);
  });

  // 9. 100+ bodies broadphase stress test (all settle on ground)
  it("should handle 100+ bodies without errors", () => {
    const space = new Space(new Vec2(0, 100));
    // Add a static ground
    const ground = staticBox(0, 300, 2000, 20);
    ground.space = space;

    for (let i = 0; i < 120; i++) {
      const b = dynamicCircle(i * 5 - 300, -i * 10, 5);
      b.space = space;
    }

    // Step many times to let bodies settle
    step(space, 120);

    // All bodies plus the ground should exist
    expect(space.bodies.length).toBe(121);

    // AABB query over the ground region should find many bodies
    const result = space.bodiesInAABB(new AABB(-400, -2000, 2800, 2400)) as any;
    expect(result.length).toBe(121);
  });

  // 10. Adding/removing bodies rapidly doesn't crash
  it("should survive rapid add/remove cycles", () => {
    const space = new Space();
    const bodies: Body[] = [];

    for (let i = 0; i < 50; i++) {
      const b = dynamicCircle(i * 10, 0, 5);
      b.space = space;
      bodies.push(b);
    }
    step(space, 1);

    // Remove half
    for (let i = 0; i < 25; i++) {
      bodies[i].space = null;
    }
    step(space, 1);

    // Add more
    for (let i = 0; i < 25; i++) {
      const b = dynamicCircle(i * 10 + 500, 0, 5);
      b.space = space;
    }
    step(space, 1);

    expect(space.bodies.length).toBe(50);
  });

  // 11. Bodies at extreme positions (very large coords) still work
  it("should handle bodies at extreme positions", () => {
    const space = new Space();
    const b = dynamicCircle(100000, 100000, 10);
    b.space = space;
    step(space, 1);

    const result = space.bodiesInAABB(new AABB(99980, 99980, 40, 40)) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  // 12. Bodies with different shape types (circle, polygon, capsule) in same space
  it("should detect different shape types in queries", () => {
    const space = new Space();

    const circleBody = dynamicCircle(0, 0, 10);
    circleBody.space = space;

    const boxBody = dynamicBox(50, 0, 20, 20);
    boxBody.space = space;

    const capsuleBody = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    capsuleBody.shapes.add(new Capsule(40, 20));
    capsuleBody.space = space;

    step(space, 1);

    const result = space.bodiesInAABB(new AABB(-30, -30, 160, 60)) as any;
    expect(result.length).toBe(3);
  });

  // 13. Raycast through multiple bodies returns first hit
  it("should return first hit body in raycast through multiple bodies", () => {
    const space = new Space();
    const near = dynamicCircle(50, 0, 10);
    const far = dynamicCircle(200, 0, 10);
    near.space = space;
    far.space = space;
    step(space, 1);

    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    const result = space.rayCast(ray) as any;
    expect(result).not.toBeNull();
    // Distance to near body edge (~40) should be less than far body edge (~190)
    expect(result.distance).toBeLessThan(100);
  });

  // 14. AABB query with empty region returns empty
  it("should return empty for AABB query over empty region", () => {
    const space = new Space();
    const b = dynamicCircle(0, 0, 10);
    b.space = space;
    step(space, 1);

    const result = space.bodiesInAABB(new AABB(1000, 1000, 10, 10)) as any;
    expect(result.length).toBe(0);
  });

  // 15. AABB query encompassing all bodies returns all
  it("should return all bodies for large encompassing AABB query", () => {
    const space = new Space();
    for (let i = 0; i < 10; i++) {
      const b = dynamicCircle(i * 50, 0, 10);
      b.space = space;
    }
    step(space, 1);

    const result = space.bodiesInAABB(new AABB(-50, -50, 600, 100)) as any;
    expect(result.length).toBe(10);
  });

  // 16. Body position change after step updates broadphase
  it("should update broadphase after body position change and step", () => {
    const space = new Space();
    const b = dynamicCircle(0, 0, 10);
    b.space = space;
    step(space, 1);

    // Found at origin
    let result = space.bodiesInCircle(new Vec2(0, 0), 20) as any;
    expect(result.length).toBe(1);

    // Move and step
    b.position.setxy(200, 200);
    step(space, 1);

    // Not at origin
    result = space.bodiesInCircle(new Vec2(0, 0), 20) as any;
    expect(result.length).toBe(0);

    // Found at new position
    result = space.bodiesInCircle(new Vec2(200, 200), 20) as any;
    expect(result.length).toBe(1);
  });

  // 17. Static bodies found by queries
  it("should find static bodies via AABB query", () => {
    const space = new Space();
    const b = staticBox(100, 100, 50, 50);
    b.space = space;
    step(space, 1);

    const result = space.bodiesInAABB(new AABB(70, 70, 60, 60)) as any;
    expect(result.length).toBe(1);
  });

  // 18. Kinematic bodies found by queries
  it("should find kinematic bodies via AABB query", () => {
    const space = new Space();
    const b = new Body(BodyType.KINEMATIC, new Vec2(100, 100));
    b.shapes.add(new Circle(15));
    b.space = space;
    step(space, 1);

    const result = space.bodiesInAABB(new AABB(80, 80, 40, 40)) as any;
    expect(result.length).toBe(1);
  });

  // 19. Very small bodies (radius=0.1) detected by broadphase
  it("should detect very small bodies via broadphase queries", () => {
    const space = new Space();
    const b = dynamicCircle(50, 50, 0.1);
    b.space = space;
    step(space, 1);

    const result = space.bodiesInCircle(new Vec2(50, 50), 1) as any;
    expect(result.length).toBe(1);
  });

  // 20. Compound body parts found by broadphase queries
  it("should find compound body parts via broadphase queries", () => {
    const space = new Space();

    const compound = new Compound();
    const b1 = dynamicCircle(0, 0, 10);
    const b2 = dynamicCircle(100, 0, 10);
    compound.bodies.add(b1);
    compound.bodies.add(b2);
    compound.space = space;

    step(space, 1);

    // Query near b1
    let result = space.bodiesInCircle(new Vec2(0, 0), 20) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Query near b2
    result = space.bodiesInCircle(new Vec2(100, 0), 20) as any;
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Both should be found by large AABB
    result = space.bodiesInAABB(new AABB(-20, -20, 140, 40)) as any;
    expect(result.length).toBe(2);
  });
});
