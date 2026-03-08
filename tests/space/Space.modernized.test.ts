import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";

describe("Space (modernized)", () => {
  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  it("should construct with default gravity (0,0)", () => {
    const space = new Space();
    expect(space.gravity.x).toBeCloseTo(0);
    expect(space.gravity.y).toBeCloseTo(0);
  });

  it("should construct with specified gravity", () => {
    const space = new Space(new Vec2(0, 981));
    expect(space.gravity.x).toBeCloseTo(0);
    expect(space.gravity.y).toBeCloseTo(981);
  });

  it("should throw if gravity Vec2 is disposed", () => {
    const v = new Vec2(0, 100);
    v.dispose();
    expect(() => new Space(v)).toThrow("disposed");
  });

  it("should dispose weak gravity Vec2", () => {
    const v = new Vec2(0, 100);
    v.zpp_inner.weak = true;
    const space = new Space(v);
    expect(space.gravity.y).toBeCloseTo(100);
  });

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  it("should get/set gravity", () => {
    const space = new Space(new Vec2(0, 100));
    space.gravity = new Vec2(10, 200);
    expect(space.gravity.x).toBeCloseTo(10);
    expect(space.gravity.y).toBeCloseTo(200);
  });

  it("should get/set worldLinearDrag", () => {
    const space = new Space();
    space.worldLinearDrag = 0.05;
    expect(space.worldLinearDrag).toBeCloseTo(0.05);
  });

  it("should reject NaN worldLinearDrag", () => {
    const space = new Space();
    expect(() => { space.worldLinearDrag = NaN; }).toThrow("NaN");
  });

  it("should get/set worldAngularDrag", () => {
    const space = new Space();
    space.worldAngularDrag = 0.1;
    expect(space.worldAngularDrag).toBeCloseTo(0.1);
  });

  it("should reject NaN worldAngularDrag", () => {
    const space = new Space();
    expect(() => { space.worldAngularDrag = NaN; }).toThrow("NaN");
  });

  it("should get/set sortContacts", () => {
    const space = new Space();
    space.sortContacts = true;
    expect(space.sortContacts).toBe(true);
    space.sortContacts = false;
    expect(space.sortContacts).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // World body
  // ---------------------------------------------------------------------------

  it("should have a static world body", () => {
    const space = new Space();
    expect(space.world).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Body management
  // ---------------------------------------------------------------------------

  it("should track bodies added via body.space", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(10, 0));
    b2.shapes.add(new Circle(5));
    b2.space = space;
    expect(space.bodies.length).toBe(2);
  });

  it("should remove body when body.space = null", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(5));
    body.space = space;
    expect(space.bodies.length).toBe(1);
    body.space = null;
    expect(space.bodies.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Constraint management
  // ---------------------------------------------------------------------------

  it("should track constraints", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b2.shapes.add(new Circle(5));
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 30, 70);
    joint.space = space;
    expect(space.constraints.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // step()
  // ---------------------------------------------------------------------------

  it("should step the simulation forward", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    space.step(1 / 60);
    expect(body.position.y).toBeGreaterThan(0);
  });

  it("should update timeStamp after step", () => {
    const space = new Space();
    const body = new Body();
    body.shapes.add(new Circle(5));
    body.space = space;

    expect(space.timeStamp).toBe(0);
    space.step(1 / 60);
    expect(space.timeStamp).toBe(1);
    space.step(1 / 60);
    expect(space.timeStamp).toBe(2);
  });

  it("should accumulate elapsedTime", () => {
    const space = new Space();
    const body = new Body();
    body.shapes.add(new Circle(5));
    body.space = space;

    space.step(1 / 60);
    space.step(1 / 60);
    expect(space.elapsedTime).toBeCloseTo(2 / 60, 4);
  });

  it("should reject NaN dt", () => {
    const space = new Space();
    expect(() => space.step(NaN)).toThrow();
  });

  it("should reject zero dt", () => {
    const space = new Space();
    expect(() => space.step(0)).toThrow();
  });

  it("should reject negative dt", () => {
    const space = new Space();
    expect(() => space.step(-1 / 60)).toThrow();
  });

  // ---------------------------------------------------------------------------
  // clear()
  // ---------------------------------------------------------------------------

  it("should clear all bodies and constraints", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b2.shapes.add(new Circle(5));
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 30, 70);
    joint.space = space;

    expect(space.bodies.length).toBe(2);
    expect(space.constraints.length).toBe(1);

    space.clear();

    expect(space.bodies.length).toBe(0);
    expect(space.constraints.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // visitBodies / visitConstraints / visitCompounds
  // ---------------------------------------------------------------------------

  it("should visitBodies with lambda", () => {
    const space = new Space(new Vec2(0, 100));
    for (let i = 0; i < 3; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(i * 10, 0));
      b.shapes.add(new Circle(5));
      b.space = space;
    }

    const visited: Body[] = [];
    space.visitBodies((b: Body) => visited.push(b));
    expect(visited.length).toBe(3);
  });

  it("should throw visitBodies with null lambda", () => {
    const space = new Space();
    expect(() => space.visitBodies(null as any)).toThrow("null");
  });

  it("should visitConstraints with lambda", () => {
    const space = new Space(new Vec2(0, 100));
    const b1 = new Body(BodyType.STATIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(5));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b2.shapes.add(new Circle(5));
    b2.space = space;

    const joint = new DistanceJoint(b1, b2, new Vec2(0, 0), new Vec2(0, 0), 30, 70);
    joint.space = space;

    let count = 0;
    space.visitConstraints(() => count++);
    expect(count).toBe(1);
  });

  it("should throw visitConstraints with null lambda", () => {
    const space = new Space();
    expect(() => space.visitConstraints(null as any)).toThrow("null");
  });

  it("should visitCompounds with lambda", () => {
    const space = new Space();
    let count = 0;
    space.visitCompounds(() => count++);
    expect(count).toBe(0); // No compounds added
  });

  it("should throw visitCompounds with null lambda", () => {
    const space = new Space();
    expect(() => space.visitCompounds(null as any)).toThrow("null");
  });

  // ---------------------------------------------------------------------------
  // Collision detection
  // ---------------------------------------------------------------------------

  it("should handle collision between bodies", () => {
    const space = new Space(new Vec2(0, 500));

    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(500, 10)));
    floor.space = space;

    const ball = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    ball.shapes.add(new Circle(10));
    ball.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    // Ball should be resting on or near the floor
    expect(ball.position.y).toBeLessThan(200);
    expect(ball.position.y).toBeGreaterThan(100);
  });

  // ---------------------------------------------------------------------------
  // Query methods
  // ---------------------------------------------------------------------------

  it("should find bodies under a point", () => {
    const space = new Space();
    const body = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    body.shapes.add(new Circle(20));
    body.space = space;
    space.step(1 / 60);

    const result = space.bodiesUnderPoint(new Vec2(50, 50));
    expect(result).toBeDefined();
  });

  it("should find shapes under a point", () => {
    const space = new Space();
    const body = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    body.shapes.add(new Circle(20));
    body.space = space;
    space.step(1 / 60);

    const result = space.shapesUnderPoint(new Vec2(50, 50));
    expect(result).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // _wrap
  // ---------------------------------------------------------------------------

  it("should wrap null to null", () => {
    expect(Space._wrap(null as any)).toBeNull();
  });

  it("should wrap Space instance to itself", () => {
    const space = new Space();
    expect(Space._wrap(space as any)).toBe(space);
  });

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it("should have a toString", () => {
    const space = new Space();
    const str = space.toString();
    expect(str).toContain("Space");
  });
});
