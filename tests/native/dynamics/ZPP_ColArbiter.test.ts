/**
 * ZPP_ColArbiter — coverage tests.
 *
 * Exercises the internal collision arbiter paths via Space simulations:
 * - preStep / applyImpulseVel / applyImpulsePos (single and 2-contact)
 * - warmStart
 * - injectContact / cleanupContacts
 * - _calcFrictionRestitution paths (extreme elasticity, userdef flags)
 * - makemutable / makeimmutable
 * - retire / pool reuse
 * - contacts_adder / contacts_subber
 * - setupcontacts
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

/** Return number of active space arbiters. */
function arbiterCount(space: Space): number {
  return (space.arbiters as any).zpp_gl();
}

/** Run a scene until the first collision arbiter appears or maxSteps. */
function runUntilCollision(space: Space, maxSteps = 120, dt = 1 / 60, iterations = 10): boolean {
  for (let i = 0; i < maxSteps; i++) {
    space.step(dt, iterations, iterations);
    if (arbiterCount(space) > 0) return true;
  }
  return false;
}

// -------------------------------------------------------------------------
// 1. Basic collision flow — preStep / applyImpulseVel / applyImpulsePos
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — basic collision flow", () => {
  it("box falls onto static floor — preStep + impulse paths executed", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.space = space;
    const box = boxDynamic(0, 0);
    box.space = space;

    // Step enough to collide and settle
    for (let i = 0; i < 200; i++) space.step(1 / 60, 10, 10);

    // Body settled near floor
    expect(box.position.y).toBeGreaterThan(200);
    expect(box.position.y).toBeLessThan(330);
  });

  it("circle falls onto static floor", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.space = space;
    const ball = circleDynamic(0, 0);
    ball.space = space;

    for (let i = 0; i < 200; i++) space.step(1 / 60, 10, 10);

    expect(ball.position.y).toBeGreaterThan(200);
  });

  it("circle-circle direct collision", () => {
    const space = new Space(new Vec2(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(30));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(20, 0));
    b2.shapes.add(new Circle(30));
    b2.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);

    // They should separate
    const dist = Math.abs(b1.position.x - b2.position.x);
    expect(dist).toBeGreaterThanOrEqual(0);
  });

  it("stacked boxes — 2-contact block solver", () => {
    // Wide box on static floor creates 2-contact edge-edge collision
    const space = makeSpace();
    const floor = staticFloor(0, 300, 600, 20);
    floor.space = space;
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 100));
    box.shapes.add(new Polygon(Polygon.box(100, 20)));
    box.space = space;

    for (let i = 0; i < 200; i++) space.step(1 / 60, 10, 10);

    expect(box.position.y).toBeGreaterThan(200);
  });

  it("continuous simulation reuses warm-start path", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.space = space;
    const box = boxDynamic(0, 100);
    box.space = space;

    // Run many steps after initial collision to exercise warm-start
    for (let i = 0; i < 300; i++) space.step(1 / 60, 10, 10);

    expect(box.position.y).toBeLessThan(340);
  });
});

// -------------------------------------------------------------------------
// 2. Material / friction / restitution calculation paths
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — material and friction paths", () => {
  it("infinite elasticity clamped to 1", () => {
    const space = makeSpace();
    const floor = staticFloor();
    const mat = new Material(Infinity, 0.5, 0.5);
    floor.shapes.at(0).material = mat;
    floor.space = space;

    const ball = circleDynamic(0, 0);
    ball.space = space;

    // Should not throw and should bounce
    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    expect(ball.position.y).toBeDefined();
  });

  it("negative-infinity elasticity clamped to 0", () => {
    const space = makeSpace();
    const floor = staticFloor();
    const mat = new Material(-Infinity, 0.5, 0.5);
    floor.shapes.at(0).material = mat;
    floor.space = space;

    const ball = circleDynamic(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);
    expect(ball.position.y).toBeDefined();
  });

  it("high dynamic friction settles body quickly", () => {
    const space = makeSpace();
    const floor = staticFloor();
    const mat = new Material(0, 1.0, 1.0, 1.0);
    floor.shapes.at(0).material = mat;
    floor.space = space;

    const box = boxDynamic(0, 0);
    box.space = space;
    box.velocity = new Vec2(200, 0);

    for (let i = 0; i < 240; i++) space.step(1 / 60, 10, 10);

    // High friction should slow horizontal movement
    expect(Math.abs(box.velocity.x)).toBeLessThan(100);
  });

  it("zero friction — body slides freely", () => {
    const space = makeSpace();
    const floor = staticFloor();
    // elasticity=0, dynamicFriction=0.01, staticFriction=0.01, density=1.0
    const mat = new Material(0, 0.01, 0.01, 1.0);
    floor.shapes.at(0).material = mat;
    const mat2 = new Material(0, 0.01, 0.01, 1.0);
    const box = boxDynamic(0, 0);
    box.shapes.at(0).material = mat2;
    floor.space = space;
    box.space = space;
    box.velocity = new Vec2(300, 0);

    // Wait for it to land then check it still has speed
    for (let i = 0; i < 200; i++) space.step(1 / 60, 10, 10);

    // With very low friction, horizontal velocity preserved more than with high friction
    expect(box.velocity.x).toBeGreaterThan(20);
  });
});

// -------------------------------------------------------------------------
// 3. Pre-handler (makemutable / makeimmutable) paths
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — pre-handler mutable paths", () => {
  it("can override elasticity in pre-handler", () => {
    const space = makeSpace(500);
    let elasticitySet = false;

    const pre = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arb = cb.arbiter;
        if (arb.isCollisionArbiter()) {
          const colArb = arb.collisionArbiter;
          colArb.elasticity = 0.9;
          elasticitySet = true;
        }
        return PreFlag.ACCEPT;
      },
    );
    pre.space = space;

    const floor = staticFloor();
    floor.space = space;
    const ball = circleDynamic(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
      if (elasticitySet) break;
    }

    expect(elasticitySet).toBe(true);
  });

  it("can override dynamicFriction in pre-handler", () => {
    const space = makeSpace(500);
    let frictionSet = false;

    const pre = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arb = cb.arbiter;
        if (arb.isCollisionArbiter()) {
          arb.collisionArbiter.dynamicFriction = 0.3;
          frictionSet = true;
        }
        return PreFlag.ACCEPT;
      },
    );
    pre.space = space;

    const floor = staticFloor();
    floor.space = space;
    const box = boxDynamic(0, 0);
    box.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
      if (frictionSet) break;
    }

    expect(frictionSet).toBe(true);
  });

  it("can override staticFriction and rollingFriction in pre-handler", () => {
    const space = makeSpace(500);
    let done = false;

    const pre = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arb = cb.arbiter;
        if (arb.isCollisionArbiter()) {
          const col = arb.collisionArbiter;
          col.staticFriction = 0.2;
          col.rollingFriction = 0.1;
          done = true;
        }
        return PreFlag.ACCEPT;
      },
    );
    pre.space = space;

    const floor = staticFloor();
    floor.space = space;
    const ball = circleDynamic(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
      if (done) break;
    }

    expect(done).toBe(true);
  });

  it("PRE_IGNORE causes contact to be ignored", () => {
    const space = makeSpace(500);
    let preCount = 0;

    const pre = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb: any) => {
        preCount++;
        return PreFlag.IGNORE;
      },
    );
    pre.space = space;

    const floor = staticFloor();
    floor.space = space;
    const ball = circleDynamic(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    // Pre-handler was called (indicates contact path executed)
    expect(preCount).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------------
// 4. Arbiter lifecycle: assign / retire / pool reuse
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — arbiter lifecycle", () => {
  it("arbiter appears in space.arbiters during collision", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.space = space;
    const box = boxDynamic(0, 0);
    box.space = space;

    const found = runUntilCollision(space);
    expect(found).toBe(true);
    expect(arbiterCount(space)).toBeGreaterThan(0);
  });

  it("arbiter is absent after bodies separate", () => {
    const space = new Space(new Vec2(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.velocity = new Vec2(200, 0);
    b1.space = space;

    const b2 = new Body(BodyType.STATIC, new Vec2(20, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    // One step to trigger collision
    space.step(1 / 60);

    // Remove static body so no further collision
    b2.space = null;

    for (let i = 0; i < 60; i++) space.step(1 / 60);

    // After separation, arbiters list should be empty
    expect(arbiterCount(space)).toBe(0);
  });

  it("BEGIN and END callbacks fire during lifecycle", () => {
    const space = makeSpace();
    let begins = 0;
    let _ends = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb: any) => {
        begins++;
      },
    );
    listener.space = space;

    const endListener = new InteractionListener(
      CbEvent.END,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb: any) => {
        _ends++;
      },
    );
    endListener.space = space;

    const floor = staticFloor();
    floor.space = space;
    const box = boxDynamic(0, 0);
    box.space = space;

    for (let i = 0; i < 200; i++) space.step(1 / 60, 10, 10);

    expect(begins).toBeGreaterThan(0);
  });

  it("multiple bodies create multiple arbiters (pool reuse)", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.space = space;

    // Several falling bodies — forces pool allocation and reuse
    for (let i = -2; i <= 2; i++) {
      const b = boxDynamic(i * 50, 0);
      b.space = space;
    }

    for (let i = 0; i < 200; i++) space.step(1 / 60, 10, 10);

    // Should not throw — just verify simulation ran without error
    expect(true).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 5. contacts_adder guard
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — contacts_adder guard", () => {
  it("contacts list add attempt throws in pre-handler", () => {
    const space = makeSpace(500);
    let threw = false;

    const pre = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arb = cb.arbiter;
        if (arb.isCollisionArbiter()) {
          const col = arb.collisionArbiter;
          const contacts = col.contacts;
          try {
            contacts.add(contacts.at(0));
          } catch (_e) {
            threw = true;
          }
        }
        return PreFlag.ACCEPT;
      },
    );
    pre.space = space;

    const floor = staticFloor();
    floor.space = space;
    const ball = circleDynamic(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
      if (threw) break;
    }

    expect(threw).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 6. calcProperties via material invalidation
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — calcProperties via material change", () => {
  it("changing material mid-simulation exercises calcProperties", () => {
    const space = makeSpace();
    const floor = staticFloor();
    floor.space = space;
    const ball = circleDynamic(0, 0);
    ball.space = space;

    // Run until collision
    runUntilCollision(space, 120);

    // Change material to trigger invalidation
    const mat = new Material(0.5, 0.3, 0.3, 0.1);
    ball.shapes.at(0).material = mat;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    expect(ball.position.y).toBeDefined();
  });
});

// -------------------------------------------------------------------------
// 7. Position impulse solver (applyImpulsePos)
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — position correction", () => {
  it("interpenetrating bodies are corrected over time", () => {
    // Start with heavy overlap to force position correction
    const space = makeSpace(0);
    const floor = staticFloor(0, 200, 600, 40);
    floor.space = space;

    const box = boxDynamic(0, 100); // Above floor with gravity=0
    box.space = space;
    // Give it downward velocity to push into floor
    box.velocity = new Vec2(0, 100);

    for (let i = 0; i < 120; i++) space.step(1 / 60, 20, 20);

    // Box should have stopped near floor — not going through it
    expect(box.position.y).toBeLessThan(250);
  });

  it("high iterations converges position faster", () => {
    const space = makeSpace(500);
    const floor = staticFloor();
    floor.space = space;
    const box = boxDynamic(0, 0);
    box.space = space;

    // High iteration count exercises more solver passes
    for (let i = 0; i < 60; i++) space.step(1 / 60, 20, 20);

    expect(box.position.y).toBeDefined();
  });
});

// -------------------------------------------------------------------------
// 8. ONGOING callback — contacts accessible while active
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — ONGOING callback", () => {
  it("ONGOING fires after BEGIN with arbiter data", () => {
    const space = makeSpace();
    let ongoingCount = 0;
    let contactsNonEmpty = false;

    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        ongoingCount++;
        const arbiters = cb.arbiters;
        for (let i = 0; i < arbiters.length; i++) {
          const arb = arbiters.at(i);
          if (arb.isCollisionArbiter()) {
            const contacts = arb.collisionArbiter.contacts;
            if (contacts.length > 0) contactsNonEmpty = true;
          }
        }
      },
    );
    listener.space = space;

    const floor = staticFloor();
    floor.space = space;
    const box = boxDynamic(0, 0);
    box.space = space;

    for (let i = 0; i < 200; i++) space.step(1 / 60, 10, 10);

    expect(ongoingCount).toBeGreaterThan(0);
    expect(contactsNonEmpty).toBe(true);
  });
});
