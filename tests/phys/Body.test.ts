import { describe, it, expect } from "vitest";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Material } from "../../src/phys/Material";
import { Space } from "../../src/space/Space";

describe("Body", () => {
  it("should construct with default dynamic type", () => {
    const body = new Body();
    expect(body.type).toBe(BodyType.DYNAMIC);
    expect(body.isDynamic()).toBe(true);
    expect(body.isStatic()).toBe(false);
    expect(body.isKinematic()).toBe(false);
  });

  it("should construct with a specific type", () => {
    const body = new Body(BodyType.STATIC);
    expect(body.type).toBe(BodyType.STATIC);
    expect(body.isStatic()).toBe(true);
  });

  it("should construct with a position", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(100, 200));
    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(200);
  });

  it("should get/set position", () => {
    const body = new Body();
    body.position.x = 50;
    body.position.y = 75;
    expect(body.position.x).toBeCloseTo(50);
    expect(body.position.y).toBeCloseTo(75);
  });

  it("should get/set rotation", () => {
    const body = new Body();
    body.rotation = Math.PI / 4;
    expect(body.rotation).toBeCloseTo(Math.PI / 4);
  });

  it("should get/set velocity", () => {
    const body = new Body();
    body.velocity.x = 10;
    body.velocity.y = -5;
    expect(body.velocity.x).toBeCloseTo(10);
    expect(body.velocity.y).toBeCloseTo(-5);
  });

  it("should get/set angular velocity", () => {
    const body = new Body();
    body.angularVel = 2.5;
    expect(body.angularVel).toBeCloseTo(2.5);
  });

  it("should add shapes", () => {
    const body = new Body();
    const circle = new Circle(25);
    body.shapes.add(circle);
    expect(body.shapes.length).toBe(1);
  });

  it("should add to and remove from a space", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;
    expect(space.bodies.length).toBe(1);

    body.space = null;
    expect(space.bodies.length).toBe(0);
  });

  it("should get/set isBullet", () => {
    const body = new Body();
    expect(body.isBullet).toBe(false);
    body.isBullet = true;
    expect(body.isBullet).toBe(true);
  });

  it("should get/set allowMovement and allowRotation", () => {
    const body = new Body();
    expect(body.allowMovement).toBe(true);
    body.allowMovement = false;
    expect(body.allowMovement).toBe(false);

    expect(body.allowRotation).toBe(true);
    body.allowRotation = false;
    expect(body.allowRotation).toBe(false);
  });

  it("should compute bounds after adding shapes", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Polygon(Polygon.box(100, 50)));
    const bounds = body.bounds;
    expect(bounds.width).toBeCloseTo(100);
    expect(bounds.height).toBeCloseTo(50);
  });

  it("should set material for all shapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.shapes.add(new Circle(20));
    const mat = new Material(0.5, 0.3, 0.4, 2.0);
    body.setShapeMaterials(mat);
    // Verify by reading back
    const shapeMat = body.shapes.at(0).material;
    expect(shapeMat.elasticity).toBeCloseTo(0.5);
    expect(shapeMat.density).toBeCloseTo(2.0);
  });

  it("should copy a body", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    body.shapes.add(new Circle(15));
    body.rotation = 1.0;

    const copy = body.copy();
    expect(copy.position.x).toBeCloseTo(10);
    expect(copy.position.y).toBeCloseTo(20);
    expect(copy.rotation).toBeCloseTo(1.0);
    expect(copy.shapes.length).toBe(1);
  });
});
