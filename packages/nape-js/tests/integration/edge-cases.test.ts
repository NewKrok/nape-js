import { describe, expect, it } from "vitest";
import { AABB } from "../../src/geom/AABB";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { CbType } from "../../src/callbacks/CbType";
import { Circle } from "../../src/shape/Circle";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { Polygon } from "../../src/shape/Polygon";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { PreListener } from "../../src/callbacks/PreListener";
import { Space } from "../../src/space/Space";
import { Vec2 } from "../../src/geom/Vec2";

function step(space: Space, count = 60): void {
  for (let i = 0; i < count; i++) space.step(1 / 60);
}

describe("public API edge cases", () => {
  it("allows a body to remove itself during a collision callback", () => {
    const space = new Space(new Vec2(0, 0));
    const remover = new Body(BodyType.DYNAMIC, new Vec2(-20, 0));
    remover.shapes.add(new Circle(10));
    remover.velocity = new Vec2(80, 0);
    remover.space = space;

    const target = new Body(BodyType.DYNAMIC, new Vec2(20, 0));
    target.shapes.add(new Circle(10));
    target.velocity = new Vec2(-80, 0);
    target.space = space;

    let callbackCount = 0;
    new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        callbackCount++;
        remover.space = null;
      },
    ).space = space;

    expect(() => step(space, 30)).not.toThrow();
    expect(callbackCount).toBe(1);
    expect(remover.space).toBeNull();
    expect(space.bodies.has(remover)).toBe(false);
    expect(space.bodies.has(target)).toBe(true);
  });

  it("supports toggling a shape into sensor mode during an active collision", () => {
    const space = new Space(new Vec2(0, 0));
    const sensorType = new CbType();
    const visitorType = new CbType();
    const events: string[] = [];

    const wall = new Body(BodyType.STATIC, new Vec2(0, 0));
    const wallShape = new Polygon(Polygon.box(40, 40));
    wallShape.cbTypes.add(sensorType);
    wall.shapes.add(wallShape);
    wall.space = space;

    const visitor = new Body(BodyType.DYNAMIC, new Vec2(-45, 0));
    visitor.shapes.add(new Circle(10));
    visitor.cbTypes.add(visitorType);
    visitor.velocity = new Vec2(120, 0);
    visitor.space = space;

    new PreListener(InteractionType.COLLISION, sensorType, visitorType, () => {
      events.push("pre");
      wallShape.sensorEnabled = true;
      return PreFlag.ACCEPT_ONCE;
    }).space = space;

    new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.SENSOR,
      sensorType,
      visitorType,
      () => {
        events.push("sensor");
      },
    ).space = space;

    expect(() => step(space, 90)).not.toThrow();
    expect(events).toContain("pre");
    expect(wallShape.sensorEnabled).toBe(true);
    expect(events).toContain("sensor");
  });

  it("keeps broadphase filter callbacks stable for always-true and always-false filters", () => {
    const space = new Space(new Vec2(0, 0));
    const shapeFilter = new InteractionFilter(1, 1);

    for (let i = 0; i < 3; i++) {
      const body = new Body(BodyType.STATIC, new Vec2(i * 40, 0));
      const shape = new Circle(10);
      shape.filter = shapeFilter;
      body.shapes.add(shape);
      body.space = space;
    }

    const aabb = new AABB(-20, -20, 120, 40);
    const alwaysTrue = new InteractionFilter(1, 1);
    const alwaysFalse = new InteractionFilter(1, 0);

    expect(space.bodiesInAABB(aabb, false, false, alwaysTrue).length).toBe(3);
    expect(space.shapesInAABB(aabb, false, false, alwaysTrue).length).toBe(3);
    expect(space.bodiesInAABB(aabb, false, false, alwaysFalse).length).toBe(0);
    expect(space.shapesInAABB(aabb, false, false, alwaysFalse).length).toBe(0);
  });
});
