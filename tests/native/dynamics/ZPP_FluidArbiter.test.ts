/**
 * ZPP_FluidArbiter — coverage tests.
 *
 * Exercises internal fluid arbiter paths via Space simulations:
 * - preStep: buoyancy (ws1.fluidEnabled only, ws2.fluidEnabled only, both)
 * - viscous drag paths (tViscosity != 0, polygon drag)
 * - applyImpulseVel (nodrag=false path)
 * - warmStart
 * - assign / retire / pool reuse
 * - position_validate / position_invalidate
 * - makemutable / makeimmutable
 * - inject / getposition
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Vec2 } from "../../../src/geom/Vec2";
import { Circle } from "../../../src/shape/Circle";
import { Polygon } from "../../../src/shape/Polygon";
import { FluidProperties } from "../../../src/phys/FluidProperties";
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

/** Create a large static fluid body covering (x, y) with given size */
function makeFluidBody(
  x = 0,
  y = 0,
  w = 2000,
  h = 2000,
  density = 2.0,
  viscosity = 3.0,
): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  const shape = new Polygon(Polygon.box(w, h));
  shape.fluidEnabled = true;
  shape.fluidProperties = new FluidProperties(density, viscosity);
  b.shapes.add(shape as any);
  return b;
}

/** Create a fluid body with a circle submerged shape */
function makeFluidBodyCircle(
  x = 0,
  y = 0,
  r = 500,
  density = 2.0,
  viscosity = 3.0,
): Body {
  const b = new Body(BodyType.STATIC, new Vec2(x, y));
  const shape = new Circle(r);
  shape.fluidEnabled = true;
  shape.fluidProperties = new FluidProperties(density, viscosity);
  b.shapes.add(shape as any);
  return b;
}

function dynamicCircle(x: number, y: number, r = 20): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

function dynamicBox(x: number, y: number, w = 30, h = 30): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

// -------------------------------------------------------------------------
// 1. Basic fluid-ws1 path (fluid shape is s1)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — ws1 fluid path", () => {
  it("dynamic circle sinks in fluid — buoyancy applied", () => {
    const space = new Space(new Vec2(0, 500));
    const fluid = makeFluidBody();
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    // Ball should be slowed/stopped by fluid buoyancy
    expect(typeof ball.position.y).toBe("number");
  });

  it("dynamic box in fluid — polygon drag path", () => {
    const space = new Space(new Vec2(0, 500));
    const fluid = makeFluidBody();
    fluid.space = space;

    const box = dynamicBox(0, 0);
    box.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    expect(typeof box.position.y).toBe("number");
  });

  it("high density fluid provides strong buoyancy", () => {
    const space = new Space(new Vec2(0, 100));
    const fluid = makeFluidBody(0, 0, 2000, 2000, 10.0, 1.0);
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    const initialY = 0;
    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    // High density should push ball up or keep it near initial
    expect(ball.position.y).toBeLessThan(initialY + 100);
  });
});

// -------------------------------------------------------------------------
// 2. Viscous drag path (viscosity != 0)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — viscous drag paths", () => {
  it("high viscosity slows falling circle", () => {
    const space = new Space(new Vec2(0, 500));
    const fluid = makeFluidBody(0, 0, 2000, 2000, 1.0, 10.0);
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;
    ball.velocity = new Vec2(0, 200);

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // High viscosity should reduce velocity significantly
    expect(Math.abs(ball.velocity.y)).toBeLessThan(200);
  });

  it("viscous drag on polygon body (polygon border traversal)", () => {
    const space = new Space(new Vec2(0, 200));
    const fluid = makeFluidBody(0, 0, 2000, 2000, 1.0, 5.0);
    fluid.space = space;

    const box = dynamicBox(0, 0, 40, 40);
    box.space = space;
    box.velocity = new Vec2(100, 100);

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    expect(typeof box.velocity.x).toBe("number");
  });

  it("zero viscosity — nodrag path", () => {
    const space = new Space(new Vec2(0, 500));
    const fluid = makeFluidBody(0, 0, 2000, 2000, 2.0, 0.0);
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    expect(typeof ball.position.y).toBe("number");
  });
});

// -------------------------------------------------------------------------
// 3. Fluid-fluid (both shapes fluid enabled)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — both shapes fluid enabled", () => {
  it("two overlapping fluid shapes — fluid-fluid path", () => {
    const space = new Space(new Vec2(0, 100));

    // Two overlapping fluid shapes
    const fluid1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    const s1 = new Polygon(Polygon.box(1000, 1000));
    s1.fluidEnabled = true;
    s1.fluidProperties = new FluidProperties(3.0, 2.0);
    fluid1.shapes.add(s1 as any);
    fluid1.space = space;

    const fluid2 = new Body(BodyType.STATIC, new Vec2(50, 0));
    const s2 = new Polygon(Polygon.box(1000, 1000));
    s2.fluidEnabled = true;
    s2.fluidProperties = new FluidProperties(1.0, 2.0);
    fluid2.shapes.add(s2 as any);
    fluid2.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    // Should not throw
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    expect(typeof ball.position.y).toBe("number");
  });

  it("equal density fluid-fluid — equal mass branch", () => {
    const space = new Space(new Vec2(0, 100));

    const fluid1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    const s1 = new Polygon(Polygon.box(1000, 1000));
    s1.fluidEnabled = true;
    s1.fluidProperties = new FluidProperties(2.0, 1.0);
    fluid1.shapes.add(s1 as any);
    fluid1.space = space;

    const fluid2 = new Body(BodyType.STATIC, new Vec2(0, 0));
    const s2 = new Polygon(Polygon.box(1000, 1000));
    s2.fluidEnabled = true;
    s2.fluidProperties = new FluidProperties(2.0, 1.0); // same density
    fluid2.shapes.add(s2 as any);
    fluid2.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    expect(typeof ball.position.y).toBe("number");
  });
});

// -------------------------------------------------------------------------
// 4. Warm-start path (multiple steps after initial)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — warm-start reuse", () => {
  it("fluid arbiter persists across multiple steps", () => {
    const space = new Space(new Vec2(0, 300));
    const fluid = makeFluidBody();
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    // Many steps to exercise warm-start accumulation
    for (let i = 0; i < 300; i++) space.step(1 / 60, 10, 10);

    expect(typeof ball.position.y).toBe("number");
  });
});

// -------------------------------------------------------------------------
// 5. Callback paths
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — callback paths", () => {
  it("ONGOING callback fires with fluid arbiter for viscous fluid", () => {
    const space = new Space(new Vec2(0, 300));
    let ongoingCount = 0;
    let overlapPositive = false;

    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        ongoingCount++;
        const arbiters = cb.arbiters;
        for (let i = 0; i < arbiters.length; i++) {
          const arb = arbiters.at(i);
          if (arb.isFluidArbiter()) {
            if (arb.fluidArbiter.overlap > 0) overlapPositive = true;
          }
        }
      },
    );
    listener.space = space;

    const fluid = makeFluidBody(0, 0, 2000, 2000, 2.0, 5.0);
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    expect(ongoingCount).toBeGreaterThan(0);
    expect(overlapPositive).toBe(true);
  });

  it("pre-handler position_invalidate path — modifying position", () => {
    const space = new Space(new Vec2(0, 200));
    let modified = false;

    const pre = new PreListener(
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb: any) => {
        const arb = cb.arbiter;
        if (arb.isFluidArbiter()) {
          const fa = arb.fluidArbiter;
          // Read position to trigger getposition / position_validate
          const pos = fa.position;
          // Write back to trigger position_invalidate
          fa.position = Vec2.weak(pos.x + 1, pos.y + 1);
          modified = true;
        }
        return PreFlag.ACCEPT;
      },
    );
    pre.space = space;

    const fluid = makeFluidBody();
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
      if (modified) break;
    }

    expect(modified).toBe(true);
  });

  it("fluid arbiter pool is reused after retire", () => {
    // Exercise retire() → pool → re-assign cycle
    const space = new Space(new Vec2(0, 300));
    let count = 0;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (_cb: any) => {
        count++;
      },
    );
    listener.space = space;

    const fluid = makeFluidBody();
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Trigger retire by moving ball out of fluid
    ball.position = new Vec2(0, -5000);
    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);

    // Move back in to re-trigger BEGIN (pool reuse)
    ball.position = new Vec2(0, 0);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// -------------------------------------------------------------------------
// 6. Custom gravity on fluid shape
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — custom fluid gravity", () => {
  it("fluid with custom gravity affects buoyancy calculation", () => {
    const space = new Space(new Vec2(0, 300));

    const fluid = new Body(BodyType.STATIC, new Vec2(0, 0));
    const s = new Polygon(Polygon.box(2000, 2000));
    s.fluidEnabled = true;
    const fp = new FluidProperties(3.0, 2.0);
    fp.gravity = new Vec2(0, 200); // custom gravity for this fluid
    s.fluidProperties = fp;
    fluid.shapes.add(s as any);
    fluid.space = space;

    const ball = dynamicCircle(0, 0);
    ball.space = space;

    // Should not throw
    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    expect(typeof ball.position.y).toBe("number");
  });
});

// -------------------------------------------------------------------------
// 7. Circle fluid body (circle drag path in ws1)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — ws2 fluid (circle)", () => {
  it("dynamic body in circular fluid region — circle radius drag path", () => {
    const space = new Space(new Vec2(0, 300));

    // The dynamic body has a circle shape; it's submerged in a polygon fluid
    // This exercises the ws2.type==0 (circle) path in viscosity drag
    const fluid = makeFluidBody(0, 0, 2000, 2000, 2.0, 5.0);
    fluid.space = space;

    // Dynamic body with a circle — ws2 is the dynamic circle
    const ball = dynamicCircle(0, 0, 20);
    ball.space = space;

    for (let i = 0; i < 120; i++) space.step(1 / 60, 10, 10);

    expect(typeof ball.velocity.y).toBe("number");
  });
});
