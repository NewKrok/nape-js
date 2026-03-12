/**
 * Extended Island sleep/wake integration tests.
 * Exercises ZPP_Island sleep/wake solver through the public API.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

function dynamicCircle(x = 0, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, Vec2.get(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function dynamicBox(x = 0, y = 0, w = 20, h = 20): Body {
  const b = new Body(BodyType.DYNAMIC, Vec2.get(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function staticBox(x = 0, y = 0, w = 400, h = 20): Body {
  const b = new Body(BodyType.STATIC, Vec2.get(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Island sleep/wake extended", () => {
  // 1. Body auto-sleeps when stationary (no gravity, no velocity)
  it("body auto-sleeps when stationary with no gravity and no velocity", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    step(space, 300);
    expect(b.isSleeping).toBe(true);
  });

  // 2. Body sleeps after settling on static ground with gravity
  it("body sleeps after settling on static ground with gravity", () => {
    const space = new Space(Vec2.get(0, 200));
    const floor = staticBox(0, 50, 400, 20);
    space.bodies.add(floor);
    const b = dynamicCircle(0, 20, 5);
    space.bodies.add(b);
    step(space, 600);
    expect(b.isSleeping).toBe(true);
  });

  // 3. Multiple connected bodies in same island sleep together
  it("multiple connected bodies in same island sleep together", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-20, 0);
    const b2 = dynamicCircle(20, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(joint);
    step(space, 300);
    expect(b1.isSleeping).toBe(true);
    expect(b2.isSleeping).toBe(true);
  });

  // 4. Waking a sleeping body by changing velocity
  it("waking a sleeping body by setting velocity", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    step(space, 300);
    expect(b.isSleeping).toBe(true);
    b.velocity = Vec2.get(50, 0);
    step(space, 1);
    expect(b.isSleeping).toBe(false);
  });

  // 5. Waking sleeping bodies via collision from a new body
  it("waking sleeping body via collision from a fast-moving body", () => {
    const space = new Space(Vec2.get(0, 0));
    const target = dynamicCircle(0, 0, 10);
    space.bodies.add(target);
    step(space, 300);
    expect(target.isSleeping).toBe(true);

    // Fire a projectile toward the sleeping body
    const projectile = dynamicCircle(-100, 0, 5);
    projectile.velocity = Vec2.get(200, 0);
    space.bodies.add(projectile);
    step(space, 30);
    // The target should have been woken by the collision
    expect(target.isSleeping).toBe(false);
  });

  // 6. Bodies connected by PivotJoint sleep together
  it("bodies connected by PivotJoint sleep together after settling", () => {
    const space = new Space(Vec2.get(0, 100));
    const floor = staticBox(0, 80, 400, 20);
    space.bodies.add(floor);
    const b1 = dynamicCircle(-15, 50, 5);
    const b2 = dynamicCircle(15, 50, 5);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const pivot = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(pivot);
    step(space, 600);
    expect(b1.isSleeping).toBe(b2.isSleeping);
  });

  // 7. Kinematic body pushing dynamic body prevents sleep
  it("kinematic body with velocity prevents nearby dynamic body from sleeping", () => {
    const space = new Space(Vec2.get(0, 0));
    const kinematic = new Body(BodyType.KINEMATIC, Vec2.get(-50, 0));
    kinematic.shapes.add(new Circle(10));
    kinematic.velocity = Vec2.get(20, 0);
    space.bodies.add(kinematic);

    const dynamic = dynamicCircle(0, 0, 10);
    space.bodies.add(dynamic);
    step(space, 60);
    // Dynamic body should not be sleeping since it was pushed by kinematic
    expect(dynamic.isSleeping).toBe(false);
  });

  // 8. Isolated bodies sleep independently
  it("isolated bodies sleep independently of each other", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-100, 0);
    const b2 = dynamicCircle(100, 0);
    b2.velocity = Vec2.get(10, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    step(space, 300);
    // b1 has no velocity so should sleep; b2 may still be moving due to initial velocity
    // but after enough steps both should sleep
    expect(b1.isSleeping).toBe(true);
  });

  // 9. Body with angular velocity eventually sleeps after settling (with drag)
  it("body with angular velocity and drag eventually sleeps", () => {
    const space = new Space(Vec2.get(0, 0));
    space.worldAngularDrag = 0.98;
    const b = dynamicCircle(0, 0);
    b.angularVel = 5.0;
    space.bodies.add(b);
    step(space, 600);
    expect(b.isSleeping).toBe(true);
  });

  // 10. Removing one body from sleeping pair wakes the other
  it("removing one body from a sleeping constrained pair wakes the other", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-15, 0);
    const b2 = dynamicCircle(15, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const joint = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    space.constraints.add(joint);
    step(space, 300);
    expect(b1.isSleeping).toBe(true);
    expect(b2.isSleeping).toBe(true);

    // Remove the constraint and one body
    space.constraints.remove(joint);
    space.bodies.remove(b1);
    step(space, 1);
    // b2 should be woken after the island was disrupted
    expect(b2.isSleeping).toBe(false);
  });

  // 11. Many bodies in a pile eventually all sleep
  it("many bodies in a pile eventually all sleep", () => {
    const space = new Space(Vec2.get(0, 200));
    const floor = staticBox(0, 100, 400, 20);
    space.bodies.add(floor);
    const bodies: Body[] = [];
    for (let i = 0; i < 10; i++) {
      const b = dynamicBox(0, 80 - i * 12, 15, 10);
      space.bodies.add(b);
      bodies.push(b);
    }
    step(space, 1200);
    const allSleeping = bodies.every((b) => b.isSleeping);
    expect(allSleeping).toBe(true);
  });

  // 12. Body on a slope with friction eventually sleeps
  it("body on a slope with friction eventually sleeps", () => {
    const space = new Space(Vec2.get(0, 200));
    // Create a tilted static body as a slope
    const slope = new Body(BodyType.STATIC, Vec2.get(0, 80));
    slope.shapes.add(new Polygon(Polygon.box(300, 10)));
    slope.rotation = 0.15; // slight tilt
    space.bodies.add(slope);

    const b = dynamicBox(0, 50, 10, 10);
    space.bodies.add(b);
    step(space, 1200);
    expect(b.isSleeping).toBe(true);
  });

  // 13. Static bodies are always marked as sleeping (they are on the sleep list)
  it("static bodies are always reported as sleeping", () => {
    const space = new Space(Vec2.get(0, 100));
    const s = staticBox(0, 100, 200, 20);
    space.bodies.add(s);
    step(space, 1);
    // In nape, static bodies are placed on the sleep list immediately
    expect(s.isSleeping).toBe(true);
  });

  // 14. Very small velocity still leads to sleep eventually
  it("very small velocity still leads to sleep eventually", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    b.velocity = Vec2.get(0.001, 0.001);
    space.bodies.add(b);
    step(space, 600);
    expect(b.isSleeping).toBe(true);
  });

  // 15. Changing body type from DYNAMIC to STATIC keeps it on sleep list
  it("changing body type from DYNAMIC to STATIC keeps body sleeping", () => {
    const space = new Space(Vec2.get(0, 0));
    const b = dynamicCircle(0, 0);
    space.bodies.add(b);
    step(space, 300);
    expect(b.isSleeping).toBe(true);

    b.type = BodyType.STATIC;
    step(space, 1);
    // Static bodies remain on the sleep list in nape
    expect(b.isSleeping).toBe(true);
    expect(b.type).toBe(BodyType.STATIC);
  });

  // 16. Body added to space while others sleeping
  it("adding a new body to space does not wake existing sleeping bodies", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-100, 0);
    space.bodies.add(b1);
    step(space, 300);
    expect(b1.isSleeping).toBe(true);

    // Add a distant body
    const b2 = dynamicCircle(100, 0);
    space.bodies.add(b2);
    step(space, 1);
    // b1 should still be sleeping since b2 is far away
    expect(b1.isSleeping).toBe(true);
  });

  // 17. Constraint between sleeping bodies + breaking it
  it("removing a constraint between sleeping bodies wakes them", () => {
    const space = new Space(Vec2.get(0, 0));
    const b1 = dynamicCircle(-15, 0);
    const b2 = dynamicCircle(15, 0);
    space.bodies.add(b1);
    space.bodies.add(b2);
    const joint = new DistanceJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0), 25, 35);
    space.constraints.add(joint);
    step(space, 300);
    expect(b1.isSleeping).toBe(true);
    expect(b2.isSleeping).toBe(true);

    space.constraints.remove(joint);
    step(space, 1);
    // Bodies should wake when their island is disrupted
    expect(b1.isSleeping).toBe(false);
    expect(b2.isSleeping).toBe(false);
  });

  // 18. Large stack of bodies all sleeping
  it("large stack of boxes on floor all eventually sleep", () => {
    const space = new Space(Vec2.get(0, 300));
    const floor = staticBox(0, 200, 600, 20);
    space.bodies.add(floor);
    const bodies: Body[] = [];
    for (let i = 0; i < 15; i++) {
      const b = dynamicBox(0, 180 - i * 12, 20, 10);
      space.bodies.add(b);
      bodies.push(b);
    }
    step(space, 2000);
    const allSleeping = bodies.every((b) => b.isSleeping);
    expect(allSleeping).toBe(true);
  });

  // 19. Body with only angular damping sleeps
  it("body with angular velocity and world angular drag eventually sleeps", () => {
    const space = new Space(Vec2.get(0, 0));
    space.worldAngularDrag = 0.98;
    const b = dynamicCircle(0, 0);
    b.angularVel = 3.0;
    space.bodies.add(b);
    step(space, 600);
    expect(b.isSleeping).toBe(true);
  });

  // 20. Space with no gravity - floating bodies sleep
  it("floating bodies in zero gravity sleep when motionless", () => {
    const space = new Space(Vec2.get(0, 0));
    const bodies: Body[] = [];
    for (let i = 0; i < 5; i++) {
      const b = dynamicCircle(i * 50 - 100, 0);
      space.bodies.add(b);
      bodies.push(b);
    }
    step(space, 300);
    const allSleeping = bodies.every((b) => b.isSleeping);
    expect(allSleeping).toBe(true);
  });
});
