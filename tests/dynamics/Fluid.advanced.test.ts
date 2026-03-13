/**
 * Advanced fluid simulation integration tests.
 * Exercises ZPP_Space fluid simulation paths, FluidArbiter, and buoyancy.
 */

import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Vec3 } from "../../src/geom/Vec3";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { CbType } from "../../src/callbacks/CbType";
import { Broadphase } from "../../src/space/Broadphase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) space.step(dt);
}

/**
 * Create a static fluid pool (large polygon with fluidEnabled).
 */
function makeFluidPool(
  space: Space,
  x = 0,
  y = 0,
  w = 400,
  h = 200,
  density = 1,
  viscosity = 1,
): Body {
  const body = new Body(BodyType.STATIC, new Vec2(x, y));
  const shape = new Polygon(Polygon.box(w, h));
  shape.fluidEnabled = true;
  shape.fluidProperties = new FluidProperties(density, viscosity);
  body.shapes.add(shape);
  body.space = space;
  return body;
}

// ---------------------------------------------------------------------------
// Buoyancy & fluid interactions
// ---------------------------------------------------------------------------

describe("Fluid simulation — basic buoyancy", () => {
  it("body should fall slower in fluid than in free fall", () => {
    // Without fluid
    const spaceNoFluid = new Space(new Vec2(0, 500));
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(15));
    b1.space = spaceNoFluid;
    step(spaceNoFluid, 60);
    const yNoFluid = b1.position.y;

    // With fluid (buoyancy slows descent)
    const spaceFluid = new Space(new Vec2(0, 500));
    makeFluidPool(spaceFluid, 0, 100, 400, 300, 2, 0.5);
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b2.shapes.add(new Circle(15));
    b2.space = spaceFluid;
    step(spaceFluid, 60);
    const yFluid = b2.position.y;

    // Body in fluid should be higher (less fall) than body in free fall
    expect(yFluid).toBeLessThan(yNoFluid);
  });

  it("high-density fluid should cause more buoyancy", () => {
    const space = new Space(new Vec2(0, 500));
    makeFluidPool(space, 0, 50, 400, 300, 10, 0);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(20));
    b.space = space;
    step(space, 120);
    // High density fluid should counteract gravity — body should be near surface
    expect(b.position.y).toBeLessThan(200);
  });

  it("high-viscosity fluid should slow horizontal movement significantly", () => {
    const space = new Space(new Vec2(0, 0));
    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    const shape = new Polygon(Polygon.box(1000, 1000));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(5, 5);
    fluidBody.shapes.add(shape);
    fluidBody.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.velocity = Vec2.get(300, 0);
    b.space = space;
    step(space, 120);
    // High-density, high-viscosity fluid should slow horizontal velocity
    expect(b.velocity.x).toBeLessThan(300);
  });

  it("viscous fluid should slow moving body more than low-viscosity", () => {
    // High viscosity
    const spaceHigh = new Space(new Vec2(0, 0));
    makeFluidPool(spaceHigh, 0, 0, 400, 400, 1, 10);
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.velocity = Vec2.get(200, 0);
    b1.space = spaceHigh;
    step(spaceHigh, 60);
    const vHigh = b1.velocity.x;

    // Low viscosity
    const spaceLow = new Space(new Vec2(0, 0));
    makeFluidPool(spaceLow, 0, 0, 400, 400, 1, 0.1);
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b2.shapes.add(new Circle(10));
    b2.velocity = Vec2.get(200, 0);
    b2.space = spaceLow;
    step(spaceLow, 60);
    const vLow = b2.velocity.x;

    // High viscosity should slow the body more
    expect(vHigh).toBeLessThan(vLow);
  });
});

describe("Fluid simulation — fluid callbacks", () => {
  it("FLUID BEGIN callback fires when body enters fluid", () => {
    const space = new Space(new Vec2(0, 200));
    let beginFired = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        beginFired = true;
      },
    );
    listener.space = space;

    makeFluidPool(space, 0, 100, 400, 200, 1, 1);

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60);
      if (beginFired) break;
    }
    expect(beginFired).toBe(true);
  });

  it("FLUID ONGOING callback fires while body is in fluid", () => {
    const space = new Space(new Vec2(0, 100));
    let ongoingCount = 0;

    const listener = new InteractionListener(
      CbEvent.ONGOING,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        ongoingCount++;
      },
    );
    listener.space = space;

    // Body starts inside fluid
    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    const shape = new Polygon(Polygon.box(400, 400));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(2, 0.5);
    fluidBody.shapes.add(shape);
    fluidBody.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.space = space;

    step(space, 5);
    expect(ongoingCount).toBeGreaterThanOrEqual(1);
  });

  it("FLUID END callback fires when body exits fluid", () => {
    const space = new Space(new Vec2(0, 0));
    let endFired = false;

    // Listen for BEGIN so the engine tracks the pair
    const beginListener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {},
    );
    beginListener.space = space;

    const endListener = new InteractionListener(
      CbEvent.END,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        endFired = true;
      },
    );
    endListener.space = space;

    // Fluid pool at y=100
    makeFluidPool(space, 0, 100, 400, 100, 1, 0.1);

    // Body starts inside fluid, then move it away
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 100));
    b.shapes.add(new Circle(10));
    b.space = space;
    step(space, 1); // establish FLUID BEGIN

    // Move body far above fluid
    b.position.setxy(0, -500);
    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
      if (endFired) break;
    }
    expect(endFired).toBe(true);
  });
});

describe("Fluid simulation — fluid impulse queries", () => {
  it("fluidImpulse returns Vec3 after body is in fluid", () => {
    const space = new Space(new Vec2(0, 200));
    // Body starts fully immersed in fluid
    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    const shape = new Polygon(Polygon.box(500, 500));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(3, 1);
    fluidBody.shapes.add(shape);
    fluidBody.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(15));
    b.space = space;

    step(space, 30);

    const imp = b.totalFluidImpulse() as Vec3;
    expect(imp).not.toBeNull();
    expect(typeof imp.x).toBe("number");
    imp.dispose();
  });
});

describe("Fluid simulation — multiple bodies in fluid", () => {
  it("should handle multiple bodies in same fluid simultaneously", () => {
    const space = new Space(new Vec2(0, 100));
    makeFluidPool(space, 0, 100, 600, 200, 2, 1);

    const bodies: Body[] = [];
    for (let i = 0; i < 5; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(i * 30 - 60, 0));
      b.shapes.add(new Circle(10));
      b.space = space;
      bodies.push(b);
    }

    expect(() => step(space, 60)).not.toThrow();
    // All bodies should still be in simulation
    for (const b of bodies) {
      expect(b.space).not.toBeNull();
    }
  });

  it("should handle polygon bodies in fluid (not just circles)", () => {
    const space = new Space(new Vec2(0, 100));
    makeFluidPool(space, 0, 100, 600, 200, 2, 0.5);

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b.shapes.add(new Polygon(Polygon.box(30, 30)));
    b.space = space;

    expect(() => step(space, 60)).not.toThrow();
  });
});

describe("Fluid simulation — SWEEP_AND_PRUNE with fluid", () => {
  it("should detect fluid interactions under SWEEP_AND_PRUNE broadphase", () => {
    const space = new Space(new Vec2(0, 200), Broadphase.SWEEP_AND_PRUNE);
    let fluidFired = false;

    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.FLUID,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        fluidFired = true;
      },
    );
    listener.space = space;

    makeFluidPool(space, 0, 100, 400, 200, 1, 1);

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(10));
    b.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60);
      if (fluidFired) break;
    }
    expect(fluidFired).toBe(true);
  });
});

describe("Fluid simulation — buoyancyImpulse and dragImpulse queries", () => {
  it("buoyancyImpulse returns Vec3 when body is in fluid", () => {
    const space = new Space(new Vec2(0, 200));
    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    const shape = new Polygon(Polygon.box(500, 500));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(3, 1);
    fluidBody.shapes.add(shape);
    fluidBody.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(15));
    b.space = space;
    step(space, 30);

    const imp = b.buoyancyImpulse() as Vec3;
    expect(imp).not.toBeNull();
    expect(typeof imp.x).toBe("number");
    imp.dispose();
  });

  it("dragImpulse returns Vec3 when body moves through fluid", () => {
    const space = new Space(new Vec2(0, 0));
    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 0));
    const shape = new Polygon(Polygon.box(500, 500));
    shape.fluidEnabled = true;
    shape.fluidProperties = new FluidProperties(1, 2);
    fluidBody.shapes.add(shape);
    fluidBody.space = space;

    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(15));
    b.velocity = Vec2.get(100, 0);
    b.space = space;
    step(space, 10);

    const imp = b.dragImpulse() as Vec3;
    expect(imp).not.toBeNull();
    expect(typeof imp.x).toBe("number");
    imp.dispose();
  });
});
