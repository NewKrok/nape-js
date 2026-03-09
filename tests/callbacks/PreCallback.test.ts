import { describe, it, expect } from "vitest";
import { PreListener } from "../../src/callbacks/PreListener";
import { PreCallback } from "../../src/callbacks/PreCallback";
import { Callback } from "../../src/callbacks/Callback";
import { CbType } from "../../src/callbacks/CbType";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { Circle } from "../../src/shape/Circle";
import { Vec2 } from "../../src/geom/Vec2";
import { BodyType } from "../../src/phys/BodyType";

describe("PreCallback", () => {
  it("should not be instantiable directly", () => {
    expect(() => new Callback()).toThrow();
  });

  it("should fire PRE callback when two shapes are about to collide", () => {
    const space = new Space(new Vec2(0, 0));
    let preFired = false;
    let capturedCallback: any = null;

    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        preFired = true;
        capturedCallback = cb;
        return PreFlag.ACCEPT;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(50));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(50));
    b2.position = Vec2.weak(30, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(preFired).toBe(true);
    expect(capturedCallback).not.toBeNull();
  });

  it("should have int1 and int2 as Interactors", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedCallback: any = null;

    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        capturedCallback = cb;
        return PreFlag.ACCEPT;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(50));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(50));
    b2.position = Vec2.weak(30, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(capturedCallback).not.toBeNull();
    expect(capturedCallback.int1).toBeDefined();
    expect(capturedCallback.int2).toBeDefined();
  });

  it("should have an arbiter", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedCallback: any = null;

    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        capturedCallback = cb;
        return PreFlag.ACCEPT;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(50));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(50));
    b2.position = Vec2.weak(30, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(capturedCallback).not.toBeNull();
    expect(capturedCallback.arbiter).toBeDefined();
  });

  it("should have swapped as boolean", () => {
    const space = new Space(new Vec2(0, 0));
    let capturedCallback: any = null;

    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        capturedCallback = cb;
        return PreFlag.ACCEPT;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(50));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(50));
    b2.position = Vec2.weak(30, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(capturedCallback).not.toBeNull();
    expect(typeof capturedCallback.swapped).toBe("boolean");
  });

  it("should prevent collision when returning PreFlag.IGNORE", () => {
    const space = new Space(new Vec2(0, 0));

    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      () => {
        return PreFlag.IGNORE;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(50));
    b1.position = Vec2.weak(0, 0);
    b1.velocity = Vec2.weak(100, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(50));
    b2.position = Vec2.weak(30, 0);
    b2.velocity = Vec2.weak(-100, 0);
    b2.space = space;

    // Step multiple times — bodies should pass through each other
    for (let i = 0; i < 10; i++) {
      space.step(1 / 60);
    }

    // If collision was ignored, bodies should have passed through each other
    // b1 moved right, b2 moved left, they should be further apart than initial 30
    const b1x = b1.position.x;
    const b2x = b2.position.x;
    // b1 should be to the right of its original position
    expect(b1x).toBeGreaterThan(0);
    // b2 should be to the left of its original position
    expect(b2x).toBeLessThan(30);
  });

  it("should have toString() return a string", () => {
    const space = new Space(new Vec2(0, 0));
    let toStringResult = "";

    const listener = new PreListener(
      InteractionType.COLLISION,
      CbType.ANY_BODY,
      CbType.ANY_BODY,
      (cb) => {
        toStringResult = cb.toString();
        return PreFlag.ACCEPT;
      },
    );
    listener.space = space;

    const b1 = new Body(BodyType.DYNAMIC);
    b1.shapes.add(new Circle(50));
    b1.position = Vec2.weak(0, 0);
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC);
    b2.shapes.add(new Circle(50));
    b2.position = Vec2.weak(30, 0);
    b2.space = space;

    space.step(1 / 60);

    expect(toStringResult.length).toBeGreaterThan(0);
    expect(toStringResult).toContain("PRE");
  });
});
