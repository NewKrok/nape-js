/**
 * ZPP_Space edge paths exercised through the public API:
 * - space.clear() while collision / sensor / fluid arbiters are live
 * - convexCast / convexMultiCast variants (polygon caster, liveSweep, filter)
 * - listeners on nested compounds (MRCA callback-set paths)
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { PreListener } from "../../src/callbacks/PreListener";

function circleBody(x: number, y: number, r = 10, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

/** A scene with all three arbiter kinds simultaneously live. */
function mixedArbiterScene() {
  const space = new Space(new Vec2(0, 300));

  const floor = new Body(BodyType.STATIC, new Vec2(0, 60));
  floor.shapes.add(new Polygon(Polygon.box(400, 20)));
  floor.space = space;

  // Collision pair
  const ball = circleBody(0, 20);
  ball.space = space;

  // Sensor pair
  const sensor = circleBody(100, 40, 25, BodyType.STATIC);
  sensor.shapes.at(0).sensorEnabled = true;
  sensor.space = space;
  const sensed = circleBody(100, 30);
  sensed.space = space;

  // Fluid pair
  const pool = new Body(BodyType.STATIC, new Vec2(-100, 30));
  const poolShape = new Polygon(Polygon.box(60, 60));
  poolShape.fluidEnabled = true;
  poolShape.fluidProperties = new FluidProperties(2, 2);
  pool.shapes.add(poolShape);
  pool.space = space;
  const floater = circleBody(-100, 30);
  floater.space = space;

  for (let i = 0; i < 30; i++) space.step(1 / 60, 8, 8);
  return { space, ball, floater, sensed };
}

describe("space.clear with live arbiters", () => {
  it("clears a space holding collision, sensor and fluid arbiters at once", () => {
    const { space } = mixedArbiterScene();
    expect(space.arbiters.length).toBeGreaterThanOrEqual(3);
    expect(space.bodies.length).toBeGreaterThan(0);

    space.clear();

    expect(space.bodies.length).toBe(0);
    expect(space.arbiters.length).toBe(0);
    expect(space.liveBodies.length).toBe(0);
  });

  it("a cleared space accepts new bodies and simulates normally", () => {
    const { space } = mixedArbiterScene();
    space.clear();

    const floor = new Body(BodyType.STATIC, new Vec2(0, 50));
    floor.shapes.add(new Polygon(Polygon.box(300, 10)));
    floor.space = space;
    const b = circleBody(0, 0);
    b.space = space;
    for (let i = 0; i < 60; i++) space.step(1 / 60);
    expect(b.position.y).toBeLessThan(50);
    expect(space.arbiters.length).toBeGreaterThanOrEqual(1);
  });

  it("clear() mid-step (inside a PreListener) throws instead of corrupting state", () => {
    const space = new Space(new Vec2(0, 300));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 40));
    floor.shapes.add(new Polygon(Polygon.box(200, 10)));
    floor.space = space;
    const ball = circleBody(0, 20);
    ball.space = space;
    // PreListeners run mid-step, where clear() must be rejected.
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, CbType.ANY_BODY, CbType.ANY_BODY, () => {
        space.clear();
        return null;
      }),
    );
    expect(() => {
      for (let i = 0; i < 30; i++) space.step(1 / 60);
    }).toThrow();
  });

  it("clear() from an ONGOING listener (post-step dispatch) is legal", () => {
    const { space } = mixedArbiterScene();
    space.listeners.add(
      new InteractionListener(
        CbEvent.ONGOING,
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        () => space.clear(),
      ),
    );
    expect(() => space.step(1 / 60)).not.toThrow();
    expect(space.bodies.length).toBe(0);
  });
});

describe("convexCast variants", () => {
  function castScene() {
    const space = new Space(new Vec2(0, 0));
    const wall = new Body(BodyType.STATIC, new Vec2(150, 0));
    wall.shapes.add(new Polygon(Polygon.box(20, 300)));
    wall.space = space;
    return space;
  }

  it("casts a rotated polygon shape", () => {
    const space = castScene();
    const caster = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    caster.shapes.add(new Polygon(Polygon.box(12, 12)));
    caster.rotation = 0.7;
    caster.velocity = new Vec2(400, 0);
    caster.angularVel = 2;
    caster.space = space;

    const result = space.convexCast(caster.shapes.at(0), 1, false);
    expect(result).not.toBeNull();
    expect(result!.toi).toBeGreaterThan(0);
    expect(result!.toi).toBeLessThanOrEqual(1);
    result!.dispose();
  });

  it("liveSweep accounts for the target's own motion", () => {
    const space = castScene();
    const runner = new Body(BodyType.DYNAMIC, new Vec2(80, 0));
    runner.shapes.add(new Circle(8));
    runner.velocity = new Vec2(-200, 0);
    runner.space = space;

    const caster = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    caster.shapes.add(new Circle(8));
    caster.velocity = new Vec2(200, 0);
    caster.space = space;

    const staticHit = space.convexCast(caster.shapes.at(0), 1, false);
    const liveHit = space.convexCast(caster.shapes.at(0), 1, true);
    expect(staticHit).not.toBeNull();
    expect(liveHit).not.toBeNull();
    // With the runner approaching, the live sweep must hit sooner.
    expect(liveHit!.toi).toBeLessThan(staticHit!.toi);
    staticHit!.dispose();
    liveHit!.dispose();
  });

  it("respects an interaction filter", () => {
    const space = castScene();
    // Wall is in group 1 by default; make caster's mask exclude everything.
    const caster = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const shape = new Circle(8);
    shape.filter = new InteractionFilter(1, ~0);
    caster.shapes.add(shape);
    caster.velocity = new Vec2(400, 0);
    caster.space = space;

    const excludeAll = new InteractionFilter(1, 0);
    const filtered = space.convexCast(caster.shapes.at(0), 1, false, excludeAll);
    expect(filtered).toBeNull();

    const open = space.convexCast(caster.shapes.at(0), 1, false, null);
    expect(open).not.toBeNull();
    open!.dispose();
  });

  it("convexMultiCast returns hits in toi order", () => {
    const space = castScene();
    // A second wall behind the first.
    const wall2 = new Body(BodyType.STATIC, new Vec2(260, 0));
    wall2.shapes.add(new Polygon(Polygon.box(20, 300)));
    wall2.space = space;

    const caster = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    caster.shapes.add(new Circle(8));
    caster.velocity = new Vec2(600, 0);
    caster.space = space;

    const results = space.convexMultiCast(caster.shapes.at(0), 1, false);
    expect(results.length).toBeGreaterThanOrEqual(2);
    let prev = -1;
    results.foreach((r: any) => {
      expect(r.toi).toBeGreaterThanOrEqual(prev);
      prev = r.toi;
    });
    results.foreach((r: any) => r.dispose());
  });

  it("rejects invalid casts", () => {
    const space = castScene();
    expect(() => space.convexCast(null as any, 1, false)).toThrow("null shape");
    const loose = new Circle(5);
    expect(() => space.convexCast(loose, 1, false)).toThrow("belong to a body");
    const caster = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    caster.shapes.add(new Circle(5));
    caster.space = space;
    expect(() => space.convexCast(caster.shapes.at(0), -1, false)).toThrow("positive");
    expect(() => space.convexCast(caster.shapes.at(0), NaN, false)).toThrow("positive");
  });
});

describe("listeners on nested compounds", () => {
  it("BEGIN fires for bodies inside nested compounds (MRCA path)", () => {
    const space = new Space(new Vec2(0, 300));
    const cbA = new CbType();
    const cbB = new CbType();

    const floor = new Body(BodyType.STATIC, new Vec2(0, 60));
    floor.shapes.add(new Polygon(Polygon.box(400, 20)));
    floor.cbTypes.add(cbB);
    floor.space = space;

    // outer compound > inner compound > body
    const outer = new Compound();
    const inner = new Compound();
    inner.compound = outer;
    const ball = circleBody(0, 0);
    ball.compound = inner;
    outer.cbTypes.add(cbA);
    outer.space = space;

    let began = 0;
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, cbA, cbB, () => {
        began++;
      }),
    );

    for (let i = 0; i < 60; i++) space.step(1 / 60);
    expect(began).toBeGreaterThanOrEqual(1);
  });

  it("END fires when a nested compound is removed mid-contact", () => {
    const space = new Space(new Vec2(0, 300));
    const cbA = new CbType();

    const floor = new Body(BodyType.STATIC, new Vec2(0, 60));
    floor.shapes.add(new Polygon(Polygon.box(400, 20)));
    floor.space = space;

    const outer = new Compound();
    const inner = new Compound();
    inner.compound = outer;
    const ball = circleBody(0, 30);
    ball.compound = inner;
    outer.cbTypes.add(cbA);
    outer.space = space;

    let ended = 0;
    space.listeners.add(
      new InteractionListener(CbEvent.END, InteractionType.COLLISION, cbA, CbType.ANY_BODY, () => {
        ended++;
      }),
    );

    for (let i = 0; i < 45; i++) space.step(1 / 60);
    outer.space = null;
    for (let i = 0; i < 5; i++) space.step(1 / 60);
    expect(ended).toBeGreaterThanOrEqual(1);
  });
});
