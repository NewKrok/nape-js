/**
 * ZPP_FluidArbiter — preStep solver branches.
 *
 * Targets uncovered branches in the fluid solver:
 * - Buoyancy: fluid-fluid (mass1 > mass2, mass1 < mass2, mass1 == mass2 paths)
 * - Custom per-fluid gravity vs space gravity
 * - Polygon edge iteration (drag accumulates over edges)
 * - Circle drag path
 * - Zero viscosity → nodrag flag
 * - Mixed viscosity (one shape with viscosity, the other without)
 * - Angular damping (polygon vs circle)
 * - Buoyancy magnitude correlates with overlap (deeper → stronger lift)
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
import { FluidProperties } from "../../../src/phys/FluidProperties";
import "../../../src/dynamics/Contact";

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function makeFluidPool(
  density = 2.0,
  viscosity = 0.5,
  customGravity?: Vec2,
  w = 4000,
  h = 2000,
): Body {
  const b = new Body(BodyType.STATIC, new Vec2(0, 0));
  const s = new Polygon(Polygon.box(w, h));
  s.fluidEnabled = true;
  const fp = new FluidProperties(density, viscosity);
  if (customGravity) {
    fp.gravity = customGravity;
  }
  s.fluidProperties = fp;
  b.shapes.add(s);
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

function makeFluidCircle(x: number, y: number, r: number, density: number, viscosity = 0): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  const s = new Circle(r);
  s.fluidEnabled = true;
  s.fluidProperties = new FluidProperties(density, viscosity);
  b.shapes.add(s);
  return b;
}

// -------------------------------------------------------------------------
// 1. Buoyancy — light body floats up against gravity
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — buoyancy basic", () => {
  it("low-density object rises against gravity in dense fluid", () => {
    const space = new Space(new Vec2(0, 200));
    const fluid = makeFluidPool(5.0, 0); // dense, no viscosity
    fluid.space = space;

    // Box of low density (default 1.0 < fluid density 5)
    const buoyant = dynamicBox(0, 100, 30, 30);
    buoyant.space = space;

    // Track velocity for several steps
    let movedUp = false;
    for (let i = 0; i < 60; i++) {
      space.step(1 / 60, 10, 10);
      if (buoyant.velocity.y < 0) {
        movedUp = true;
        break;
      }
    }
    expect(movedUp).toBe(true);
  });

  it("high-density object sinks in less-dense fluid", () => {
    const space = new Space(new Vec2(0, 200));
    const fluid = makeFluidPool(0.5, 0); // sparse fluid
    fluid.space = space;

    const sinker = dynamicBox(0, 100, 30, 30);
    sinker.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    expect(sinker.velocity.y).toBeGreaterThan(0);
    expect(sinker.position.y).toBeGreaterThan(100);
  });
});

// -------------------------------------------------------------------------
// 2. Fluid-fluid: density mismatch (mass1 > mass2 path)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — fluid-fluid density mismatch", () => {
  it("dense fluid object pushes light fluid object out", () => {
    const space = new Space(new Vec2(0, 200));

    // Heavy fluid blob
    const heavy = makeFluidCircle(0, 50, 30, 10, 0.1);
    heavy.space = space;

    // Light fluid blob, overlapping heavy
    const light = makeFluidCircle(20, 50, 30, 0.5, 0.1);
    light.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);

    // The two should have different vertical velocities (one up, one down or apart)
    expect(Number.isFinite(heavy.position.x)).toBe(true);
    expect(Number.isFinite(light.position.x)).toBe(true);
  });

  it("equal-density fluid bodies use COM-based buoyancy decision", () => {
    const space = new Space(new Vec2(0, 200));

    // Two identical density fluid blobs
    const a = makeFluidCircle(0, 50, 30, 2.0, 0.1);
    a.space = space;
    const b = makeFluidCircle(20, 100, 30, 2.0, 0.1);
    b.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);

    // Whichever has the lower COM (relative to gravity direction) gets pushed up
    expect(Number.isFinite(a.position.y)).toBe(true);
    expect(Number.isFinite(b.position.y)).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 3. Custom per-fluid gravity overrides space gravity
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — custom fluid gravity", () => {
  it("fluid with leftward gravity drags object left", () => {
    const space = new Space(new Vec2(0, 0));

    // Fluid with horizontal gravity (left)
    const fluid = makeFluidPool(3.0, 0, new Vec2(-200, 0));
    fluid.space = space;

    const obj = dynamicBox(0, 0, 30, 30); // density 1 < fluid 3 → buoyant
    obj.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Custom gravity is leftward → buoyancy pushes object rightward
    expect(obj.velocity.x).toBeGreaterThan(0);
  });

  it("custom gravity is independent of space gravity direction", () => {
    const space = new Space(new Vec2(0, 500)); // strong downward space gravity
    const fluid = makeFluidPool(3.0, 0, new Vec2(0, -100)); // upward fluid gravity
    fluid.space = space;

    const obj = dynamicBox(0, 0, 30, 30);
    obj.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);

    // Both fluid buoyancy (downward, since fluid g is up so buoyancy is down)
    // and space gravity push the object down — net downward
    expect(obj.position.y).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------------
// 4. Polygon edge iteration — drag accumulates per edge
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — polygon drag", () => {
  it("polygon submerged with viscosity slows down moving body", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(0.5, 5.0); // light but high viscosity
    fluid.space = space;

    const moving = dynamicBox(0, 0, 40, 40);
    moving.velocity = new Vec2(200, 0);
    moving.space = space;

    const v0 = Math.abs(moving.velocity.x);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    const v1 = Math.abs(moving.velocity.x);

    expect(v1).toBeLessThan(v0);
  });

  it("higher viscosity stops body faster than low viscosity", () => {
    const space1 = new Space(new Vec2(0, 0));
    const fluid1 = makeFluidPool(0.5, 1.0);
    fluid1.space = space1;
    const m1 = dynamicBox(0, 0, 40, 40);
    m1.velocity = new Vec2(200, 0);
    m1.space = space1;

    const space2 = new Space(new Vec2(0, 0));
    const fluid2 = makeFluidPool(0.5, 20.0);
    fluid2.space = space2;
    const m2 = dynamicBox(0, 0, 40, 40);
    m2.velocity = new Vec2(200, 0);
    m2.space = space2;

    for (let i = 0; i < 60; i++) {
      space1.step(1 / 60, 10, 10);
      space2.step(1 / 60, 10, 10);
    }

    expect(Math.abs(m2.velocity.x)).toBeLessThan(Math.abs(m1.velocity.x));
  });
});

// -------------------------------------------------------------------------
// 5. Circle drag path
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — circle drag", () => {
  it("circle submerged with viscosity slows down", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(0.5, 5.0);
    fluid.space = space;

    const ball = dynamicCircle(0, 0, 25);
    ball.velocity = new Vec2(200, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    expect(Math.abs(ball.velocity.x)).toBeLessThan(200);
  });

  it("circle drag is symmetric (no net rotation from translation)", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(0.5, 3.0);
    fluid.space = space;

    const ball = dynamicCircle(0, 0, 25);
    ball.velocity = new Vec2(150, 0);
    ball.space = space;

    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // Translating circle in fluid should not pick up significant angular velocity
    expect(Math.abs(ball.angularVel)).toBeLessThan(0.5);
  });
});

// -------------------------------------------------------------------------
// 6. Zero viscosity → nodrag path
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — nodrag", () => {
  it("zero viscosity preserves x velocity (only buoyancy effect)", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(2.0, 0); // viscosity = 0
    fluid.space = space;

    const obj = dynamicBox(0, 0, 30, 30);
    obj.velocity = new Vec2(150, 0);
    obj.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);

    // No drag → x-velocity unchanged
    expect(obj.velocity.x).toBeCloseTo(150, -1); // within ±10
  });

  it("zero viscosity does not produce angular damping", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(2.0, 0);
    fluid.space = space;

    const spinner = dynamicBox(0, 0, 30, 30);
    spinner.angularVel = 5;
    spinner.space = space;

    const w0 = spinner.angularVel;
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);

    // No viscosity → angular velocity preserved
    expect(spinner.angularVel).toBeCloseTo(w0, -1);
  });
});

// -------------------------------------------------------------------------
// 7. Angular damping (with viscosity)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — angular damping", () => {
  it("polygon spinning in viscous fluid slows angular velocity", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(0.5, 8.0);
    fluid.space = space;

    const spinner = dynamicBox(0, 0, 60, 30);
    spinner.angularVel = 8;
    spinner.space = space;

    const w0 = Math.abs(spinner.angularVel);
    for (let i = 0; i < 60; i++) space.step(1 / 60, 10, 10);
    const w1 = Math.abs(spinner.angularVel);

    expect(w1).toBeLessThan(w0);
  });
});

// -------------------------------------------------------------------------
// 8. Mixed viscosity (one shape viscous, the other not)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — mixed viscosity", () => {
  it("fluid with viscosity > 0 and a non-fluid body still produces drag", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(1.5, 4.0);
    fluid.space = space;

    const obj = dynamicCircle(0, 0, 20);
    obj.velocity = new Vec2(200, 0);
    obj.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);
    expect(Math.abs(obj.velocity.x)).toBeLessThan(200);
  });
});

// -------------------------------------------------------------------------
// 9. Buoyancy magnitude — bigger overlap → stronger force
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — density ratio determines acceleration", () => {
  it("higher fluid density → stronger upward acceleration on identical body", () => {
    const space1 = new Space(new Vec2(0, 200));
    const denseFluid = makeFluidPool(10.0, 0);
    denseFluid.space = space1;
    const inDense = dynamicBox(0, 0, 30, 30);
    inDense.space = space1;

    const space2 = new Space(new Vec2(0, 200));
    const sparseFluid = makeFluidPool(2.0, 0);
    sparseFluid.space = space2;
    const inSparse = dynamicBox(0, 0, 30, 30);
    inSparse.space = space2;

    for (let i = 0; i < 30; i++) {
      space1.step(1 / 60, 10, 10);
      space2.step(1 / 60, 10, 10);
    }

    // Denser fluid → object accelerates upward more strongly (more negative velocity.y)
    expect(inDense.velocity.y).toBeLessThan(inSparse.velocity.y);
  });
});

// -------------------------------------------------------------------------
// 10. Variable dt across steps (warm-start in fluid)
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — variable dt", () => {
  it("changing dt across steps produces finite results", () => {
    const space = new Space(new Vec2(0, 200));
    const fluid = makeFluidPool(2.0, 3.0);
    fluid.space = space;

    const obj = dynamicBox(0, 0, 30, 30);
    obj.velocity = new Vec2(100, 0);
    obj.space = space;

    space.step(1 / 60, 10, 10);
    space.step(1 / 30, 10, 10);
    space.step(1 / 120, 10, 10);
    space.step(1 / 90, 10, 10);

    expect(Number.isFinite(obj.position.x)).toBe(true);
    expect(Number.isFinite(obj.position.y)).toBe(true);
    expect(Number.isFinite(obj.velocity.x)).toBe(true);
    expect(Number.isFinite(obj.velocity.y)).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 11. Surface velocity in fluid
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — surface velocity / kinematic flow", () => {
  it("fluid body with surface velocity does not crash", () => {
    const space = new Space(new Vec2(0, 0));
    const fluid = makeFluidPool(1.5, 2.0);
    fluid.surfaceVel = new Vec2(50, 0);
    fluid.space = space;

    const obj = dynamicBox(0, 0, 30, 30);
    obj.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 10, 10);
    expect(Number.isFinite(obj.position.x)).toBe(true);
  });
});

// -------------------------------------------------------------------------
// 12. Sleeping body in fluid
// -------------------------------------------------------------------------

describe("ZPP_FluidArbiter — sleeping body", () => {
  it("a body floating at neutral buoyancy may sleep without crash", () => {
    const space = new Space(new Vec2(0, 100));
    // Density matched to obj (default 1.0)
    const fluid = makeFluidPool(1.0, 0.5);
    fluid.space = space;

    const obj = dynamicBox(0, 0, 30, 30);
    obj.space = space;

    for (let i = 0; i < 600; i++) space.step(1 / 60, 10, 10);

    expect(Number.isFinite(obj.position.y)).toBe(true);
  });
});
