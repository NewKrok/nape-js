/**
 * ZPP_ColArbiter — warm-start, multi-step persistence and 2-contact solver.
 *
 * Targets uncovered branches:
 * - preStep dt-ratio scaling (changing dt across steps re-scales jnAcc/jtAcc)
 * - Warm-start impulse persistence across N steps for resting contact
 * - 2-contact block solver path (poly-poly with 2 contact points)
 * - Position correction (Baumgarte) on deep penetration
 * - Static friction → dynamic friction transition
 * - Restitution velocity threshold (low velocity → no bounce)
 * - Contact persistence across many steps without loss
 * - Sleeping → wake → re-collide cycle
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
import { CbType } from "../../../src/callbacks/CbType";
import { CbEvent } from "../../../src/callbacks/CbEvent";
import { InteractionType } from "../../../src/callbacks/InteractionType";
import "../../../src/dynamics/Contact";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function dynamicBox(x: number, y: number, w = 30, h = 30, mat?: Material): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const s = new Polygon(Polygon.box(w, h));
  if (mat) s.material = mat;
  b.shapes.add(s);
  return b;
}

function dynamicCircle(x: number, y: number, r = 15, mat?: Material): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const s = new Circle(r);
  if (mat) s.material = mat;
  b.shapes.add(s);
  return b;
}

function staticFloor(y = 300, w = 600, h = 20, mat?: Material): Body {
  const b = new Body(BodyType.STATIC, new Vec2(0, y));
  const s = new Polygon(Polygon.box(w, h));
  if (mat) s.material = mat;
  b.shapes.add(s);
  return b;
}

function arbiterCount(space: Space): number {
  return (space.arbiters as any).zpp_gl();
}

// -------------------------------------------------------------------------
// 1. dt-ratio scaling across variable timesteps
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — dt-ratio warm start", () => {
  it("survives a step-size change without losing contact", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.space = space;

    const box = dynamicBox(0, 200, 30, 30);
    box.space = space;

    // Settle with dt=1/60
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    expect(arbiterCount(space)).toBeGreaterThan(0);

    // Switch to dt=1/30 — preStep dtratio path
    for (let i = 0; i < 30; i++) space.step(1 / 30, 10, 10);
    expect(box.position.y).toBeLessThan(310);

    // Switch back to small dt=1/120 — box must remain above the floor and finite
    for (let i = 0; i < 60; i++) space.step(1 / 120, 10, 10);
    expect(box.position.y).toBeLessThan(310);
    expect(Number.isFinite(box.position.y)).toBe(true);
  });

  it("variable dt does not produce NaN positions", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.space = space;

    const box = dynamicBox(0, 200, 40, 40);
    box.space = space;

    const dts = [1 / 60, 1 / 30, 1 / 120, 1 / 80, 1 / 50];
    for (let cycle = 0; cycle < 5; cycle++) {
      const dt = dts[cycle % dts.length];
      for (let i = 0; i < 20; i++) space.step(dt, 10, 10);
      expect(Number.isFinite(box.position.x)).toBe(true);
      expect(Number.isFinite(box.position.y)).toBe(true);
    }
  });
});

// -------------------------------------------------------------------------
// 2. Warm-start impulse persistence (resting contact)
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — warm-start persistence", () => {
  it("resting box settles to a stable y position", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    floor.space = space;

    const box = dynamicBox(0, 200, 40, 40);
    box.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    box.space = space;

    // Settle
    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);
    const y1 = box.position.y;

    // Run more — position should be virtually unchanged (warm-start = small drift)
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    const y2 = box.position.y;

    expect(Math.abs(y2 - y1)).toBeLessThan(2);
  });

  it("rapid micro-displacements stay near settled position", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    floor.space = space;

    const box = dynamicBox(0, 200, 40, 40);
    box.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    box.space = space;

    // Settle
    for (let i = 0; i < 300; i++) space.step(1 / 60, 10, 10);
    const ySettled = box.position.y;

    // Drift over the next 5 seconds should be tiny
    for (let i = 0; i < 300; i++) space.step(1 / 60, 10, 10);
    expect(Math.abs(box.position.y - ySettled)).toBeLessThan(2);
  });
});

// -------------------------------------------------------------------------
// 3. 2-contact polygon-polygon solver paths
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — 2-contact polygon solver", () => {
  it("box on floor produces 2 contact points and stays level", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.space = space;

    const box = dynamicBox(0, 200, 60, 60);
    box.space = space;

    let twoPointSeen = false;
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
            let count = 0;
            for (const _c of contacts) count++;
            if (count >= 2) twoPointSeen = true;
          }
        }
      },
    );
    listener.space = space;

    for (let i = 0; i < 90; i++) space.step(1 / 60, 10, 10);

    expect(twoPointSeen).toBe(true);

    // Box should not have rotated significantly when settled flat
    expect(Math.abs(box.angularVel)).toBeLessThan(2);
  });

  it("box-on-box stack stabilises with 2-contact arbiters", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    floor.space = space;

    const lower = dynamicBox(0, 240, 50, 30);
    lower.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    lower.space = space;

    const upper = dynamicBox(0, 180, 50, 30);
    upper.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    upper.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60, 10, 10);

    // Both boxes should be stationary above the floor
    expect(Math.abs(lower.velocity.y)).toBeLessThan(20);
    expect(Math.abs(upper.velocity.y)).toBeLessThan(20);
    // Upper should be on top of lower
    expect(upper.position.y).toBeLessThan(lower.position.y);
  });
});

// -------------------------------------------------------------------------
// 4. Position correction (Baumgarte) on deep penetration
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — position correction", () => {
  it("pushes apart deeply overlapping boxes", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicBox(0, 0, 40, 40);
    a.space = space;
    const b = dynamicBox(10, 0, 40, 40); // huge overlap (30 units)
    b.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    const dx = Math.abs(b.position.x - a.position.x);
    // Should have separated to at least the box width
    expect(dx).toBeGreaterThanOrEqual(30);
  });

  it("circle-circle deep overlap separates", () => {
    const space = new Space(new Vec2(0, 0));
    const c1 = dynamicCircle(0, 0, 25);
    c1.space = space;
    const c2 = dynamicCircle(15, 0, 25); // 35 of 50 overlap
    c2.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    const dx = c2.position.x - c1.position.x;
    const dy = c2.position.y - c1.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThanOrEqual(48);
  });

  it("box pushed into static wall stays outside the wall", () => {
    const space = new Space(new Vec2(0, 0));
    const wall = new Body(BodyType.STATIC, new Vec2(100, 0));
    wall.shapes.add(new Polygon(Polygon.box(20, 400)));
    wall.space = space;

    const box = dynamicBox(50, 0, 30, 30);
    box.velocity = new Vec2(500, 0);
    box.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Box's right edge should be at most at wall's left edge (90)
    expect(box.position.x).toBeLessThanOrEqual(76);
  });
});

// -------------------------------------------------------------------------
// 5. Friction transition (static → dynamic)
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — friction transition", () => {
  it("dynamic friction slows a sliding box on rough floor", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0, 0.8, 0.8, 1, 0);
    floor.space = space;

    const box = dynamicBox(0, 200, 30, 30);
    box.shapes.at(0).material = new Material(0, 0.8, 0.8, 1, 0);
    box.velocity = new Vec2(300, 0);
    box.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    const v1 = Math.abs(box.velocity.x);

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);
    const v2 = Math.abs(box.velocity.x);

    expect(v2).toBeLessThan(v1);
  });

  it("zero friction allows perpetual sliding (no horizontal slowdown beyond air)", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0, 0, 0, 1, 0);
    floor.space = space;

    const box = dynamicBox(0, 200, 30, 30);
    box.shapes.at(0).material = new Material(0, 0, 0, 1, 0);
    box.velocity = new Vec2(200, 0);
    box.space = space;

    // Settle
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    const v1 = box.velocity.x;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    const v2 = box.velocity.x;

    // No friction → x velocity preserved (small numerical drift OK)
    expect(Math.abs(v2 - v1)).toBeLessThan(10);
  });
});

// -------------------------------------------------------------------------
// 6. Restitution velocity threshold
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — restitution threshold", () => {
  it("low approach velocity does not bounce (below threshold)", () => {
    const space = new Space(new Vec2(0, 50)); // weak gravity
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(1, 0, 0, 1, 0);
    floor.space = space;

    const ball = dynamicCircle(0, 285, 10);
    ball.shapes.at(0).material = new Material(1, 0, 0, 1, 0);
    // Slow approach
    ball.velocity = new Vec2(0, 1);
    ball.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60, 10, 10);

    // Should be at rest, not bouncing
    expect(Math.abs(ball.velocity.y)).toBeLessThan(10);
  });

  it("high approach velocity bounces with elasticity 1", () => {
    const space = new Space(new Vec2(0, 0));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(1, 0, 0, 1, 0);
    floor.space = space;

    const ball = dynamicCircle(0, 100, 10);
    ball.shapes.at(0).material = new Material(1, 0, 0, 1, 0);
    ball.velocity = new Vec2(0, 800);
    ball.space = space;

    let maxUpwardSpeed = 0;
    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
      if (ball.velocity.y < 0 && Math.abs(ball.velocity.y) > maxUpwardSpeed) {
        maxUpwardSpeed = Math.abs(ball.velocity.y);
      }
    }

    // Should have rebounded upward
    expect(maxUpwardSpeed).toBeGreaterThan(400);
  });
});

// -------------------------------------------------------------------------
// 7. Long-run contact persistence (no contact loss across 600 steps)
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — long-run persistence", () => {
  it("stack of 3 boxes stays together for 10 seconds", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0.1, 1, 1, 1, 0);
    floor.space = space;

    const stack: Body[] = [];
    for (let i = 0; i < 3; i++) {
      const b = dynamicBox(0, 280 - i * 32, 40, 30);
      b.shapes.at(0).material = new Material(0.1, 1, 1, 1, 0);
      b.space = space;
      stack.push(b);
    }

    for (let i = 0; i < 600; i++) space.step(1 / 60, 10, 10);

    // None should have fallen below the floor; positions remain finite
    for (const b of stack) {
      expect(b.position.y).toBeLessThan(310);
      expect(Number.isFinite(b.position.x)).toBe(true);
      expect(Number.isFinite(b.position.y)).toBe(true);
    }
    // Stack still ordered (bottom > middle > top in y)
    expect(stack[0].position.y).toBeGreaterThan(stack[1].position.y);
    expect(stack[1].position.y).toBeGreaterThan(stack[2].position.y);
  });
});

// -------------------------------------------------------------------------
// 8. Sleeping → wake → re-collide cycle
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — sleep/wake cycle", () => {
  it("body sleeps when settled, wakes when nudged", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0.1, 1, 1, 1, 0);
    floor.space = space;

    const box = dynamicBox(0, 200, 30, 30);
    box.shapes.at(0).material = new Material(0.1, 1, 1, 1, 0);
    box.space = space;

    // Settle and sleep
    for (let i = 0; i < 600; i++) space.step(1 / 60, 10, 10);
    expect(box.isSleeping).toBe(true);

    // Wake by setting velocity
    box.velocity = new Vec2(50, -100);
    expect(box.isSleeping).toBe(false);

    // Bounces, then re-settles
    for (let i = 0; i < 600; i++) space.step(1 / 60, 10, 10);
    expect(box.position.y).toBeLessThan(310);
    expect(Number.isFinite(box.velocity.x)).toBe(true);
  });

  it("removing then re-adding body reuses arbiter pool", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.space = space;

    for (let cycle = 0; cycle < 4; cycle++) {
      const box = dynamicBox(0, 200, 30, 30);
      box.space = space;

      for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
      expect(arbiterCount(space)).toBeGreaterThan(0);

      box.space = null;
      for (let i = 0; i < 5; i++) space.step(1 / 60, 10, 10);
      expect(arbiterCount(space)).toBe(0);
    }
  });
});

// -------------------------------------------------------------------------
// 9. Asymmetric mass — heavy body on light body
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — mass asymmetry", () => {
  it("heavy box on light box does not crush through it", () => {
    const space = new Space(new Vec2(0, 500));
    const floor = staticFloor();
    floor.shapes.at(0).material = new Material(0.1, 1, 1, 1, 0);
    floor.space = space;

    const light = dynamicBox(0, 250, 40, 30);
    light.shapes.at(0).material = new Material(0.1, 1, 0.1, 1, 0);
    light.space = space;

    const heavy = dynamicBox(0, 180, 40, 30);
    heavy.shapes.at(0).material = new Material(0.1, 1, 10, 1, 0);
    heavy.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60, 10, 10);

    // Heavy should still be above light
    expect(heavy.position.y).toBeLessThan(light.position.y + 5);
    // Light should not have shot through floor
    expect(light.position.y).toBeLessThan(310);
  });
});

// -------------------------------------------------------------------------
// 10. Continuous push from kinematic
// -------------------------------------------------------------------------

describe("ZPP_ColArbiter — kinematic push", () => {
  it("kinematic platform sliding under dynamic transfers x velocity", () => {
    const space = new Space(new Vec2(0, 500));

    const platform = new Body(BodyType.KINEMATIC, new Vec2(0, 300));
    platform.shapes.add(new Polygon(Polygon.box(400, 20)));
    platform.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    platform.velocity = new Vec2(80, 0);
    platform.space = space;

    const box = dynamicBox(0, 200, 30, 30);
    box.shapes.at(0).material = new Material(0, 1, 1, 1, 0);
    box.space = space;

    for (let i = 0; i < 240; i++) space.step(1 / 60, 10, 10);

    // Box should have acquired some x velocity from the conveyor
    expect(Math.abs(box.velocity.x)).toBeGreaterThan(5);
  });
});
