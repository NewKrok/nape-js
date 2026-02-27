import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";

describe("Space", () => {
  it("should construct with gravity", () => {
    const space = new Space(new Vec2(0, 600));
    expect(space.gravity.x).toBeCloseTo(0);
    expect(space.gravity.y).toBeCloseTo(600);
  });

  it("should start empty", () => {
    const space = new Space(new Vec2(0, 100));
    expect(space.bodies.length).toBe(0);
  });

  it("should add bodies via body.space", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    expect(space.bodies.length).toBe(1);
  });

  it("should step the simulation", () => {
    const space = new Space(new Vec2(0, 100));

    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    const initialY = body.position.y;
    space.step(1 / 60, 10, 10);

    // Body should have moved down due to gravity
    expect(body.position.y).toBeGreaterThan(initialY);
  });

  it("should simulate collision between bodies", () => {
    const space = new Space(new Vec2(0, 500));

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(500, 10)));
    floor.space = space;

    // Falling box
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    box.shapes.add(new Polygon(Polygon.box(20, 20)));
    box.space = space;

    // Step many frames
    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    // Box should have settled near the floor
    expect(box.position.y).toBeLessThan(200);
    expect(box.position.y).toBeGreaterThan(100);
  });

  it("should iterate bodies", () => {
    const space = new Space(new Vec2(0, 100));

    for (let i = 0; i < 5; i++) {
      const body = new Body(BodyType.DYNAMIC, new Vec2(i * 10, 0));
      body.shapes.add(new Circle(5));
      body.space = space;
    }

    const bodies = space.bodies.toArray();
    expect(bodies.length).toBe(5);
  });

  it("should visit bodies", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    body.shapes.add(new Circle(5));
    body.space = space;

    let count = 0;
    space.visitBodies(() => {
      count++;
    });
    expect(count).toBe(1);
  });

  it("should clear all bodies", () => {
    const space = new Space(new Vec2(0, 100));
    for (let i = 0; i < 3; i++) {
      const body = new Body();
      body.shapes.add(new Circle(5));
      body.space = space;
    }
    expect(space.bodies.length).toBe(3);

    space.clear();
    expect(space.bodies.length).toBe(0);
  });

  it("should track elapsed time", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body();
    body.shapes.add(new Circle(5));
    body.space = space;

    space.step(1 / 60, 10, 10);
    space.step(1 / 60, 10, 10);
    expect(space.elapsedTime).toBeGreaterThan(0);
  });
});
