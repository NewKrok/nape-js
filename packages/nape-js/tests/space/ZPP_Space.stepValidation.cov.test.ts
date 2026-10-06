/**
 * The checks ZPP_Space runs on bodies the first time it steps them
 * (static_validation for static bodies, validation() for the live set):
 * invalid polygons, static bodies that still carry a velocity, and dynamic
 * bodies with no mass / inertia.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";

const DT = 1 / 60;

/** A self-intersecting "bow tie" — accepted by the constructor, rejected by valid(). */
function bowTie(): Polygon {
  return new Polygon([new Vec2(0, 0), new Vec2(20, 20), new Vec2(20, 0), new Vec2(0, 20)]);
}

describe("step-time body validation", () => {
  it("rejects an invalid polygon on a static body", () => {
    const space = new Space();
    const ground = new Body(BodyType.STATIC);
    ground.shapes.add(bowTie());
    // Static bodies are validated as soon as they join the space.
    expect(() => {
      ground.space = space;
      space.step(DT);
    }).toThrow(/invalid Polygon/);
  });

  it("rejects an invalid polygon on a dynamic body", () => {
    const space = new Space();
    const b = new Body(BodyType.DYNAMIC);
    b.shapes.add(bowTie());
    b.space = space;
    expect(() => space.step(DT)).toThrow(/invalid Polygon/);
  });

  it("rejects an invalid polygon on a kinematic body", () => {
    const space = new Space();
    const b = new Body(BodyType.KINEMATIC);
    b.shapes.add(bowTie());
    b.space = space;
    expect(() => space.step(DT)).toThrow(/invalid Polygon/);
  });

  it("rejects a static body that kept a velocity from when it was dynamic", () => {
    const space = new Space();
    const b = new Body(BodyType.DYNAMIC);
    b.shapes.add(new Circle(10));
    b.velocity = new Vec2(5, 0);
    b.type = BodyType.STATIC;
    // Switching the type keeps the velocity; the space refuses to simulate it.
    expect(b.velocity.x).toBe(5);
    expect(() => {
      b.space = space;
      space.step(DT);
    }).toThrow(/Static body cannot have any real velocity/);
  });

  it("rejects a dynamic body without shapes (no mass) unless movement is disabled", () => {
    const space = new Space();
    const b = new Body(BodyType.DYNAMIC);
    b.space = space;
    expect(() => space.step(DT)).toThrow(/0 mass unless allowMovement is false/);

    const space2 = new Space();
    const pinned = new Body(BodyType.DYNAMIC);
    pinned.allowMovement = false;
    pinned.space = space2;
    expect(() => space2.step(DT)).toThrow(/0 inertia unless allowRotation is false/);

    const space3 = new Space();
    const frozen = new Body(BodyType.DYNAMIC);
    frozen.allowMovement = false;
    frozen.allowRotation = false;
    frozen.space = space3;
    expect(() => space3.step(DT)).not.toThrow();
  });
});
