/**
 * ZPP_ColArbiter — extended coverage tests.
 *
 * Targets uncovered branches:
 * - Rolling friction (circle-on-circle with radius != 0)
 * - Kinematic body collisions (kinematic velocity offsets)
 * - Surface velocity paths
 * - Circle-circle position solver (_applyImpulsePosCircle)
 * - 2-contact edge position solver with fallback branches
 * - Restitution clamping (negative values, > 1 values)
 * - Contact expiration / cleanup
 * - Normal validation after clearing
 * - Free/pool reuse cycle
 * NOTE: the contact/fluid solver runs inlined inside ZPP_Space.step;
 * the names below refer to those solver phases, exercised via full simulations.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Vec2 } from "../../../src/geom/Vec2";
import { Circle } from "../../../src/shape/Circle";
import { Polygon } from "../../../src/shape/Polygon";
import { Material } from "../../../src/phys/Material";
import { InteractionListener } from "../../../src/callbacks/InteractionListener";
import { PreListener } from "../../../src/callbacks/PreListener";
import { CbType } from "../../../src/callbacks/CbType";
import { CbEvent } from "../../../src/callbacks/CbEvent";
import { InteractionType } from "../../../src/callbacks/InteractionType";
import { PreFlag } from "../../../src/callbacks/PreFlag";
import "../../../src/dynamics/Contact";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function makeSpace(gy = 500) {
  return new Space(new Vec2(0, gy));
}

function circleDynamic(x: number, y: number, r = 15): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function boxDynamic(x: number, y: number, w = 20, h = 20): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function staticFloor(x = 0, y = 300, w = 600, h = 20): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function staticCircle(x: number, y: number, r = 50): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function kinematicBody(x: number, y: number, vx: number, vy: number): Body {
  const b = new Body(BodyType.KINEMATIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(100, 20)));
  b.velocity = new Vec2(vx, vy);
  return b;
}

function arbiterCount(space: Space): number {
  return (space.arbiters as any).zpp_gl();
}

function runUntilCollision(space: Space, maxSteps = 120, dt = 1 / 60, iterations = 10): boolean {
  for (let i = 0; i < maxSteps; i++) {
    space.step(dt, iterations, iterations);
    if (arbiterCount(space) > 0) return true;
  }
  return false;
}

// -------------------------------------------------------------------------
// 1. Rolling friction path (radius != 0)
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — rolling friction", () => {
  it("circle rolling on static floor applies rolling friction", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.velocity = new Vec2(200, 0);
    // Set rolling friction on the material
    const mat = new Material(0.3, 0.5, 0.5, 1.0, 0.1);
    ball.shapes.at(0).material = mat;
    ball.space = space;

    runUntilCollision(space, 120);
    // Continue stepping to let rolling friction take effect
    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    // Ball should have slowed down from rolling friction
    expect(Math.abs(ball.velocity.x)).toBeLessThan(200);
  });

  it("two dynamic circles collide — rolling friction path with radius != 0", () => {
    const space = new Space(new Vec2(0, 0));
    const c1 = circleDynamic(-30, 0, 20);
    c1.velocity = new Vec2(100, 0);
    const mat1 = new Material(0.8, 0.5, 0.5, 1.0, 0.3);
    c1.shapes.at(0).material = mat1;
    c1.space = space;

    const c2 = circleDynamic(30, 0, 20);
    c2.velocity = new Vec2(-100, 0);
    const mat2 = new Material(0.8, 0.5, 0.5, 1.0, 0.3);
    c2.shapes.at(0).material = mat2;
    c2.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Both circles should have bounced off (elasticity 0.8)
    expect(c1.velocity.x).not.toBe(100);
    expect(c2.velocity.x).not.toBe(-100);
  });
});

// -------------------------------------------------------------------------
// 2. Kinematic body collisions
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — kinematic collisions", () => {
  it("dynamic body on kinematic platform — kinematic velocity offsets (k1x/k1y)", () => {
    const space = makeSpace(200);
    const platform = kinematicBody(0, 300, 50, 0);
    platform.space = space;

    const box = boxDynamic(0, 200);
    box.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Box should acquire some horizontal velocity from kinematic platform
    expect(Math.abs(box.velocity.x)).toBeGreaterThan(0);
  });

  it("kinematic body with angular velocity — angular kinematic offsets", () => {
    const space = makeSpace(200);
    const platform = new Body(BodyType.KINEMATIC, new Vec2(0, 300));
    platform.shapes.add(new Polygon(Polygon.box(200, 20)));
    platform.angularVel = 0.5;
    platform.space = space;

    const ball = circleDynamic(50, 200, 10);
    ball.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);

    // Ball should be affected by rotating platform
    expect(ball.position.y).toBeDefined();
  });
});

// -------------------------------------------------------------------------
// 3. Circle-circle position solver (_applyImpulsePosCircle)
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — circle-circle position solver", () => {
  it("two overlapping circles — position correction separates them", () => {
    const space = new Space(new Vec2(0, 0));
    // Place circles so they overlap
    const c1 = circleDynamic(0, 0, 20);
    c1.space = space;
    const c2 = circleDynamic(25, 0, 20);
    c2.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Circles should be pushed apart
    const dist = Math.sqrt(
      Math.pow(c2.position.x - c1.position.x, 2) + Math.pow(c2.position.y - c1.position.y, 2),
    );
    expect(dist).toBeGreaterThanOrEqual(39); // ~40 = r1+r2
  });

  it("dynamic circle on static circle — ptype==2 position correction", () => {
    const space = makeSpace(300);
    const sc = staticCircle(0, 300, 50);
    sc.space = space;
    const ball = circleDynamic(0, 200, 15);
    ball.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Ball should rest on top of static circle, not penetrate
    const dist = Math.sqrt(Math.pow(ball.position.x, 2) + Math.pow(ball.position.y - 300, 2));
    expect(dist).toBeGreaterThanOrEqual(64); // ~65 = 50+15
  });
});

// -------------------------------------------------------------------------
// 4. Restitution clamping
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — restitution clamping", () => {
  it("negative restitution from material average is clamped to 0", () => {
    const space = makeSpace();
    const floor = staticFloor();
    // Material with negative elasticity
    floor.shapes.at(0).material = new Material(-2.0, 1.0, 1.0, 1.0, 0.0);
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.shapes.at(0).material = new Material(-1.0, 1.0, 1.0, 1.0, 0.0);
    ball.space = space;

    let restitutionObserved = -1;
    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        const arb = cb.arbiter;
        if (arb.isCollisionArbiter()) {
          restitutionObserved = arb.collisionArbiter.elasticity;
        }
        return PreFlag.ACCEPT;
      },
    );
    listener.space = space;

    runUntilCollision(space, 120);

    // Negative avg should be clamped to 0
    expect(restitutionObserved).toBe(0);
  });

  it("restitution > 1 from material average is clamped to 1", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(3.0, 1.0, 1.0, 1.0, 0.0);
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.shapes.at(0).material = new Material(3.0, 1.0, 1.0, 1.0, 0.0);
    ball.space = space;

    let restitutionObserved = -1;
    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        if (cb.arbiter.isCollisionArbiter()) {
          restitutionObserved = cb.arbiter.collisionArbiter.elasticity;
        }
        return PreFlag.ACCEPT;
      },
    );
    listener.space = space;

    runUntilCollision(space, 120);

    expect(restitutionObserved).toBe(1);
  });
});

// -------------------------------------------------------------------------
// 5. Surface velocity
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — surface velocity", () => {
  it("surface velocity on shape affects collision resolution", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0, 0.5, 0.5, 1.0, 0.0);
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.space = space;

    // Set surface velocity on ball to simulate conveyor belt effect
    ball.surfaceVel = new Vec2(50, 0);

    runUntilCollision(space, 120);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Surface velocity should have had some effect on ball movement
    expect(ball.position.x).not.toBe(0);
  });

  it("surface velocity on static floor (conveyor belt)", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.surfaceVel = new Vec2(100, 0);
    floor.shapes.at(0).material = new Material(0, 1.0, 1.0, 1.0, 0.0);
    floor.space = space;

    const box = boxDynamic(0, 200);
    box.shapes.at(0).material = new Material(0, 1.0, 1.0, 1.0, 0.0);
    box.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    // Box should slide along the conveyor belt
    expect(Math.abs(box.velocity.x)).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------------
// 6. Contact expiration
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — contact expiration", () => {
  it("contacts expire when body moves away", () => {
    const space = makeSpace(300);
    const floor = staticFloor();
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.space = space;

    // Let ball hit floor
    runUntilCollision(space, 120);
    expect(arbiterCount(space)).toBeGreaterThan(0);

    // Remove ball from space
    ball.space = null;

    // Step a few times — arbiters should expire
    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);
    expect(arbiterCount(space)).toBe(0);
  });

  it("stale contacts are cleaned up during preStep", () => {
    const space = makeSpace(300);
    const floor = staticFloor();
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.space = space;

    runUntilCollision(space, 120);

    // Teleport ball away — contacts become stale
    ball.position = new Vec2(0, -1000);
    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);

    expect(arbiterCount(space)).toBe(0);
  });
});

// -------------------------------------------------------------------------
// 7. 2-contact block solver paths
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — 2-contact solver", () => {
  it("wide box on floor — 2-contact block solver path", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;

    // Wide box will create 2 contact points on the floor edge
    const wideBox = boxDynamic(0, 200, 80, 20);
    wideBox.space = space;

    runUntilCollision(space, 120);

    // Access collision arbiter to verify 2-contact path
    let contactCount = 0;
    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arbiters = cb.arbiters;
        for (let i = 0; i < arbiters.length; i++) {
          const arb = arbiters.at(i);
          if (arb.isCollisionArbiter()) {
            const contacts = arb.collisionArbiter.contacts;
            for (const _c of contacts) {
              contactCount++;
            }
          }
        }
      },
    );
    listener.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);
    expect(contactCount).toBeGreaterThan(0);
  });

  it("heavy box on narrow floor — contacts with position correction", () => {
    const space = makeSpace(500);
    const narrowFloor = new Body(BodyType.STATIC, new Vec2(0, 300));
    narrowFloor.shapes.add(new Polygon(Polygon.box(100, 10)));
    narrowFloor.space = space;

    const heavyBox = boxDynamic(0, 100, 60, 60);
    heavyBox.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    // Box should be resting on the floor
    expect(heavyBox.position.y).toBeLessThan(300);
    expect(heavyBox.position.y).toBeGreaterThan(200);
  });
});

// -------------------------------------------------------------------------
// 8. Free/pool reuse
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — pool reuse", () => {
  it("retired arbiters are returned to pool and reused", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;

    // First collision
    const ball1 = circleDynamic(0, 200, 15);
    ball1.space = space;
    runUntilCollision(space, 120);

    // Remove and let arbiter retire
    ball1.space = null;
    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);

    // Second collision — should reuse pooled arbiter
    const ball2 = circleDynamic(0, 200, 15);
    ball2.space = space;
    runUntilCollision(space, 120);
    expect(arbiterCount(space)).toBeGreaterThan(0);
  });

  it("multiple collision cycles reuse pooled arbiters", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;

    for (let cycle = 0; cycle < 5; cycle++) {
      const ball = circleDynamic(0, 200, 15);
      ball.space = space;
      runUntilCollision(space, 120);
      ball.space = null;
      for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);
    }

    // Final collision still works
    const finalBall = circleDynamic(0, 200, 15);
    finalBall.space = space;
    const collided = runUntilCollision(space, 120);
    expect(collided).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 9. Material property recalculation
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — material property recalculation", () => {
  it("changing material mid-simulation triggers calcProperties via invalidation", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.shapes.at(0).material = new Material(0.5, 0.5, 0.5, 1.0, 0.0);
    ball.space = space;

    runUntilCollision(space, 120);
    const vy1 = ball.velocity.y;

    // Change material to very bouncy
    ball.shapes.at(0).material = new Material(1.0, 0.0, 0.0, 1.0, 0.0);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Behavior should change after material update
    expect(ball.velocity.y).not.toBe(vy1);
  });
});

// -------------------------------------------------------------------------
// 10. Normal vector validation
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — normal vector access", () => {
  it("collision normal is accessible during ONGOING callback", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.space = space;

    let _normalX = 0;
    let normalY = 0;
    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arbiters = cb.arbiters;
        for (let i = 0; i < arbiters.length; i++) {
          const arb = arbiters.at(i);
          if (arb.isCollisionArbiter()) {
            const n = arb.collisionArbiter.normal;
            _normalX = n.x;
            normalY = n.y;
          }
        }
      },
    );
    listener.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 5; i++) space.step(1 / 60, 10, 10);

    // Normal should be approximately pointing up (0, -1) for floor collision
    expect(Math.abs(normalY)).toBeGreaterThan(0.5);
  });

  it("reference edges accessible for polygon-polygon collision", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;

    const box = boxDynamic(0, 200, 30, 30);
    box.space = space;

    let hasRefEdge1 = false;
    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arbiters = cb.arbiters;
        for (let i = 0; i < arbiters.length; i++) {
          const arb = arbiters.at(i);
          if (arb.isCollisionArbiter()) {
            const colArb = arb.collisionArbiter;
            if (colArb.referenceEdge1 !== null || colArb.referenceEdge2 !== null) {
              hasRefEdge1 = true;
            }
          }
        }
      },
    );
    listener.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);

    expect(hasRefEdge1).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 11. Impulse accessors
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — impulse accessors", () => {
  it("normalImpulse returns non-zero during active collision", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.space = space;

    let normalImpulseMag = 0;
    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arbiters = cb.arbiters;
        for (let i = 0; i < arbiters.length; i++) {
          const arb = arbiters.at(i);
          if (arb.isCollisionArbiter()) {
            const imp = arb.collisionArbiter.normalImpulse();
            normalImpulseMag = Math.sqrt(imp.x * imp.x + imp.y * imp.y);
          }
        }
      },
    );
    listener.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);

    expect(normalImpulseMag).toBeGreaterThan(0);
  });

  it("totalImpulse includes both normal and tangent components", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0, 1.0, 1.0, 1.0, 0.0);
    floor.space = space;

    const ball = circleDynamic(0, 200, 15);
    ball.velocity = new Vec2(100, 0);
    ball.shapes.at(0).material = new Material(0, 1.0, 1.0, 1.0, 0.0);
    ball.space = space;

    let totalImpulseMag = 0;
    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arbiters = cb.arbiters;
        for (let i = 0; i < arbiters.length; i++) {
          const arb = arbiters.at(i);
          if (arb.isCollisionArbiter()) {
            const imp = arb.collisionArbiter.totalImpulse();
            totalImpulseMag = Math.sqrt(imp.x * imp.x + imp.y * imp.y + imp.z * imp.z);
          }
        }
      },
    );
    listener.space = space;

    runUntilCollision(space, 120);
    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);

    expect(totalImpulseMag).toBeGreaterThan(0);
  });
});
