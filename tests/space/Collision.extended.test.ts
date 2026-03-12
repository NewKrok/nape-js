import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { AABB } from "../../src/geom/AABB";
import { Ray } from "../../src/geom/Ray";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Material } from "../../src/phys/Material";
import { Compound } from "../../src/phys/Compound";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dynamicCircle(x: number, y: number, radius = 10): Body {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Circle(radius));
  return body;
}

function dynamicBox(x: number, y: number, w = 20, h = 20): Body {
  const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.box(w, h)));
  return body;
}

function staticBox(x: number, y: number, w = 500, h = 10): Body {
  const body = new Body(BodyType.STATIC, new Vec2(x, y));
  body.shapes.add(new Polygon(Polygon.box(w, h)));
  return body;
}

function step(space: Space, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i++) {
    space.step(dt);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Collision extended integration tests", () => {
  it("should resolve circle-circle collision", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCircle(-50, 0, 10);
    a.velocity = new Vec2(100, 0);
    const b = dynamicCircle(50, 0, 10);
    b.velocity = new Vec2(-100, 0);
    space.bodies.add(a);
    space.bodies.add(b);

    step(space, 120);

    expect(a.position.x).not.toBeCloseTo(b.position.x, 0);
  });

  it("should resolve circle-polygon collision", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 200);
    const circle = dynamicCircle(0, 0, 15);
    space.bodies.add(ground);
    space.bodies.add(circle);

    step(space, 300);

    expect(circle.position.y).toBeLessThan(200);
    expect(circle.position.y).toBeGreaterThan(100);
  });

  it("should resolve polygon-polygon collision", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 200);
    const box = dynamicBox(0, 0, 20, 20);
    space.bodies.add(ground);
    space.bodies.add(box);

    step(space, 300);

    expect(box.position.y).toBeLessThan(200);
    expect(box.position.y).toBeGreaterThan(100);
  });

  it("should handle multiple simultaneous collisions", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 300);
    space.bodies.add(ground);

    const bodies: Body[] = [];
    for (let i = 0; i < 5; i++) {
      const b = dynamicCircle(i * 25 - 50, 0, 10);
      space.bodies.add(b);
      bodies.push(b);
    }

    step(space, 600);

    for (const b of bodies) {
      expect(b.position.y).toBeLessThan(300);
      expect(b.position.y).toBeGreaterThan(0);
    }
  });

  it("should put bodies to sleep after settling", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 200);
    const box = dynamicBox(0, 50);
    space.bodies.add(ground);
    space.bodies.add(box);

    step(space, 1200);

    expect(box.isSleeping).toBe(true);
  });

  it("should detect sensor overlap without physical response", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCircle(0, 0, 10);
    const sensor = new Circle(50);
    sensor.sensorEnabled = true;
    a.shapes.add(sensor);

    const b = dynamicCircle(30, 0, 10);
    space.bodies.add(a);
    space.bodies.add(b);

    const startBx = b.position.x;
    step(space, 10);

    expect(b.position.x).toBeCloseTo(startBx, 1);
  });

  it("should not collide bodies with non-matching interaction filters", () => {
    const space = new Space(new Vec2(0, 200));
    const a = dynamicCircle(0, 0, 10);
    const b = dynamicCircle(0, 100, 10);

    const filterA = new InteractionFilter();
    filterA.collisionGroup = 2;
    filterA.collisionMask = 2;
    a.shapes.at(0).filter = filterA;

    const filterB = new InteractionFilter();
    filterB.collisionGroup = 4;
    filterB.collisionMask = 4;
    b.shapes.at(0).filter = filterB;

    space.bodies.add(a);
    space.bodies.add(b);

    step(space, 120);

    expect(a.position.y).toBeGreaterThan(100);
  });

  it("should push dynamic bodies with kinematic bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const kinematic = new Body(BodyType.KINEMATIC, new Vec2(0, 50));
    kinematic.shapes.add(new Polygon(Polygon.box(100, 20)));
    kinematic.velocity = new Vec2(0, -50);

    const dynamic = dynamicCircle(0, 0, 10);
    space.bodies.add(kinematic);
    space.bodies.add(dynamic);

    step(space, 60);

    expect(dynamic.position.y).toBeLessThan(0);
  });

  it("should handle removing bodies mid-simulation", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 200);
    space.bodies.add(ground);

    const bodies: Body[] = [];
    for (let i = 0; i < 10; i++) {
      const b = dynamicCircle(i * 15 - 60, 0, 5);
      space.bodies.add(b);
      bodies.push(b);
    }

    step(space, 30);

    for (let i = 0; i < 5; i++) {
      space.bodies.remove(bodies[i]);
    }

    step(space, 30);

    expect(space.bodies.length).toBe(6);
  });

  it("should raycast and find bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCircle(-50, 0, 10);
    const b = dynamicCircle(0, 0, 10);
    const c = dynamicCircle(50, 0, 10);
    space.bodies.add(a);
    space.bodies.add(b);
    space.bodies.add(c);

    step(space, 1);

    const ray = new Ray(new Vec2(-100, 0), new Vec2(1, 0));
    const result = space.rayCast(ray);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.shape.body).toBe(a);
    }
  });

  it("should transfer velocity during elastic collision", () => {
    const space = new Space(new Vec2(0, 0));
    const mat = new Material();
    mat.elasticity = 1.0;

    const a = dynamicCircle(-30, 0, 10);
    a.shapes.at(0).material = mat;
    a.velocity = new Vec2(100, 0);

    const b = dynamicCircle(30, 0, 10);
    b.shapes.at(0).material = mat;

    space.bodies.add(a);
    space.bodies.add(b);

    step(space, 120);

    expect(b.velocity.x).toBeGreaterThan(0);
  });

  it("should find bodies within AABB region", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCircle(-100, 0, 10);
    const b = dynamicCircle(0, 0, 10);
    const c = dynamicCircle(100, 0, 10);
    space.bodies.add(a);
    space.bodies.add(b);
    space.bodies.add(c);

    step(space, 1);

    const queryRegion = new AABB(-50, -50, 100, 100);
    const found = space.bodiesInAABB(queryRegion);

    expect(found.length).toBe(1);
    expect(found.at(0)).toBe(b);
  });

  it("should handle many bodies exercising broadphase", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 500, 1000, 20);
    space.bodies.add(ground);

    for (let i = 0; i < 50; i++) {
      const x = (i % 10) * 20 - 90;
      const y = -Math.floor(i / 10) * 25;
      const b = dynamicCircle(x, y, 8);
      space.bodies.add(b);
    }

    step(space, 300);

    for (let i = 0; i < space.bodies.length; i++) {
      const b = space.bodies.at(i);
      if (b.type === BodyType.DYNAMIC) {
        expect(b.position.y).toBeLessThan(510);
      }
    }
  });

  it("should wake sleeping bodies when hit", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 200);
    const box = dynamicBox(0, 180);
    space.bodies.add(ground);
    space.bodies.add(box);

    step(space, 1200);
    expect(box.isSleeping).toBe(true);

    const dropper = dynamicCircle(0, 0, 10);
    space.bodies.add(dropper);
    step(space, 120);

    expect(dropper.position.y).toBeLessThan(200);
    expect(dropper.position.y).toBeGreaterThan(100);
  });

  it("should handle compound body collisions", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 300);
    space.bodies.add(ground);

    const compound = new Compound();
    const bodyA = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    bodyA.shapes.add(new Circle(10));

    const bodyB = new Body(BodyType.DYNAMIC, new Vec2(25, 0));
    bodyB.shapes.add(new Circle(10));

    compound.bodies.add(bodyA);
    compound.bodies.add(bodyB);
    compound.space = space;

    step(space, 300);

    expect(bodyA.position.y).toBeGreaterThan(0);
    expect(bodyB.position.y).toBeGreaterThan(0);
    expect(bodyA.position.y).toBeLessThan(300);
  });

  it("should apply buoyancy to bodies in fluid", () => {
    const space = new Space(new Vec2(0, 200));

    const fluidBody = new Body(BodyType.STATIC, new Vec2(0, 300));
    const fluidShape = new Polygon(Polygon.box(400, 200));
    fluidShape.fluidEnabled = true;
    fluidShape.fluidProperties.density = 3;
    fluidShape.fluidProperties.viscosity = 5;
    fluidBody.shapes.add(fluidShape);
    space.bodies.add(fluidBody);

    const ball = dynamicCircle(0, 100, 15);
    space.bodies.add(ball);

    step(space, 600);

    expect(Math.abs(ball.velocity.y)).toBeLessThan(50);
  });

  it("should stack bodies on static ground", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 400, 800, 20);
    space.bodies.add(ground);

    for (let i = 0; i < 5; i++) {
      const box = dynamicBox(0, 350 - i * 25, 30, 20);
      space.bodies.add(box);
    }

    step(space, 600);

    for (let i = 0; i < space.bodies.length; i++) {
      const b = space.bodies.at(i);
      if (b.type === BodyType.DYNAMIC) {
        expect(b.position.y).toBeLessThan(400);
      }
    }
  });

  it("should work with default broadphase", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 200);
    const ball = dynamicCircle(0, 0, 10);
    space.bodies.add(ground);
    space.bodies.add(ball);

    step(space, 300);

    expect(ball.position.y).toBeLessThan(200);
    expect(ball.position.y).toBeGreaterThan(100);
  });

  it("should resolve capsule-polygon collision", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 300);
    space.bodies.add(ground);

    const capsuleBody = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    capsuleBody.shapes.add(new Capsule(80, 30));
    space.bodies.add(capsuleBody);

    step(space, 300);

    expect(capsuleBody.position.y).toBeGreaterThan(200);
    expect(capsuleBody.position.y).toBeLessThan(300);
  });

  it("should find shapes in range query", () => {
    const space = new Space(new Vec2(0, 0));
    const a = dynamicCircle(-100, 0, 10);
    const b = dynamicCircle(0, 0, 10);
    const c = dynamicCircle(100, 0, 10);
    space.bodies.add(a);
    space.bodies.add(b);
    space.bodies.add(c);

    step(space, 1);

    const found = space.bodiesInCircle(new Vec2(0, 0), 50);

    expect(found.length).toBe(1);
    expect(found.at(0)).toBe(b);
  });

  it("should resolve circle-capsule collision", () => {
    const space = new Space(new Vec2(0, 200));
    const ground = staticBox(0, 300);
    space.bodies.add(ground);

    const capsuleBody = new Body(BodyType.DYNAMIC, new Vec2(0, 100));
    capsuleBody.shapes.add(new Capsule(80, 30));
    space.bodies.add(capsuleBody);

    const circleBody = dynamicCircle(0, 0, 15);
    space.bodies.add(circleBody);

    step(space, 300);

    expect(capsuleBody.position.y).toBeLessThan(300);
    expect(circleBody.position.y).toBeLessThan(300);
    expect(circleBody.position.y).not.toBeCloseTo(capsuleBody.position.y, 0);
  });
});
