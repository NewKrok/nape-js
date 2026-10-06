/**
 * ZPP_Space.updatePos sub-samples the swept AABB of a fast-spinning shape
 * (`count = angvel·dt·sweepCoef / 120`, up to 8 samples) so that the
 * broadphase sees everything the shape passes over mid-step, not just its
 * start and end poses. These tests spin a long bar exactly half a turn per
 * step: start and end poses are both horizontal, so only the sampled sweep
 * can find a ball sitting straight above the pivot.
 *
 * Also covers the fluid-viscosity mass matrix of an arbiter whose bodies have
 * no translational mass (a translation-locked body in a static fluid), where
 * the matrix is singular and presteparb inverts it per axis.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { FluidProperties } from "../../src/phys/FluidProperties";

const DT = 1 / 60;
const HALF_TURN = Math.PI / DT; // rad/s: the bar turns exactly π in one step

function target(space: Space, x: number, y: number, bullet = false): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(4));
  b.isBullet = bullet;
  b.space = space;
  return b;
}

function bar(
  space: Space,
  type: BodyType,
  angvel: number,
  opts: { ccd?: boolean; bullet?: boolean } = {},
): Body {
  const b = new Body(type, new Vec2(0, 0));
  b.shapes.add(new Polygon(Polygon.box(400, 4)));
  b.angularVel = angvel;
  b.disableCCD = opts.ccd === false;
  b.isBullet = opts.bullet ?? false;
  b.space = space;
  return b;
}

describe("swept AABB sub-sampling of fast-spinning bodies", () => {
  it("a kinematic bar spinning half a turn per step hits a ball its end poses miss", () => {
    const space = new Space();
    const ball = target(space, 0, 150);
    const b = bar(space, BodyType.KINEMATIC, HALF_TURN);
    space.step(DT);
    // The bar ends horizontal again, but it swept through the ball on the way.
    expect(Math.cos(b.rotation)).toBeCloseTo(-1, 6);
    expect(ball.arbiters.length).toBe(1);
    // Struck by the bar's tip region: tangential speed ≈ ω·r = 188.5·150.
    expect(ball.velocity.x).toBeLessThan(-20000);
    expect(Number.isFinite(ball.position.x) && Number.isFinite(ball.position.y)).toBe(true);
  });

  it("with CCD disabled the same bar sweeps straight through the ball", () => {
    const space = new Space();
    const ball = target(space, 0, 150);
    bar(space, BodyType.KINEMATIC, HALF_TURN, { ccd: false });
    space.step(DT);
    expect(ball.arbiters.length).toBe(0);
    expect(ball.velocity.x).toBe(0);
    expect(ball.position.y).toBe(150);
  });

  it("samples circle shapes too: a kinematic pair of offset circles hits a ball on their orbit", () => {
    const space = new Space();
    const ball = target(space, 0, 180);
    const spinner = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    spinner.shapes.add(new Circle(5, new Vec2(180, 0)));
    spinner.shapes.add(new Circle(5, new Vec2(-180, 0)));
    spinner.angularVel = HALF_TURN;
    spinner.space = space;
    space.step(DT);
    expect(ball.arbiters.length).toBe(1);
    expect(ball.velocity.length).toBeGreaterThan(10000);

    const control = new Space();
    const missed = target(control, 0, 180);
    const ghost = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    ghost.shapes.add(new Circle(5, new Vec2(180, 0)));
    ghost.shapes.add(new Circle(5, new Vec2(-180, 0)));
    ghost.angularVel = HALF_TURN;
    ghost.disableCCD = true;
    ghost.space = control;
    control.step(DT);
    expect(missed.arbiters.length).toBe(0);
  });

  it("dynamic vs dynamic: only a bullet pair gets the swept hit", () => {
    const space = new Space();
    const ball = target(space, 0, 150, true);
    const b = bar(space, BodyType.DYNAMIC, HALF_TURN, { bullet: true });
    space.step(DT);
    expect(ball.arbiters.length).toBe(1);
    expect(ball.velocity.x).toBeLessThan(-10000);
    // The bar is frozen at its time of impact (≈ π/2) instead of finishing the half turn.
    expect(Math.abs(Math.cos(b.rotation))).toBeLessThan(0.1);

    const plain = new Space();
    const untouched = target(plain, 0, 150);
    bar(plain, BodyType.DYNAMIC, HALF_TURN);
    plain.step(DT);
    expect(untouched.arbiters.length).toBe(0);
    expect(untouched.position.y).toBe(150);
  });

  // Known limitation: after a CCD hit the kinematic bar keeps turning for the
  // rest of the step, and iteratePos then resolves the contact against the
  // stale edge normal as an infinite half-plane. With ~90° of extra rotation
  // that reads as ~150 units of penetration, and the (unclamped) position
  // correction teleports the ball next to the pivot instead of letting it fly
  // off tangentially. Shows from ~30 rad/s for this 200 px arm (see
  // troubleshooting.md); space.subSteps mitigates it.
  it.fails("a ball hit by a very fast kinematic spinner is not pulled to the pivot", () => {
    const space = new Space();
    const ball = target(space, 0, 150);
    bar(space, BodyType.KINEMATIC, 100);
    for (let i = 0; i < 2; i++) {
      space.step(DT);
      expect(ball.position.length).toBeGreaterThan(100);
    }
  });
});

describe("fluid viscosity on a translation-locked body", () => {
  function pinnedInPool(y: number) {
    const space = new Space(new Vec2(0, 600));
    const pool = new Body(BodyType.STATIC, new Vec2(0, 0));
    const water = new Polygon(Polygon.box(400, 400));
    water.fluidEnabled = true;
    water.fluidProperties = new FluidProperties(2, 3);
    pool.shapes.add(water);
    pool.space = space;
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, y));
    b.shapes.add(new Polygon(Polygon.box(20, 20)));
    b.allowMovement = false;
    b.angularVel = 5;
    b.space = space;
    return { space, b };
  }

  it.each([
    ["fully submerged (zero lever arm, all-zero viscosity matrix)", 0],
    ["half submerged at the surface", -200],
  ])("%s: spin is damped, position stays put, nothing goes NaN", (_label, y) => {
    const { space, b } = pinnedInPool(y);
    for (let i = 0; i < 30; i++) {
      space.step(DT);
      expect(Number.isFinite(b.angularVel)).toBe(true);
    }
    expect(b.angularVel).toBeLessThan(4);
    expect(b.arbiters.length).toBe(1);
    expect(b.position.x).toBe(0);
    expect(b.position.y).toBe(y);
  });
});
