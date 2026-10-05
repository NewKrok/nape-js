/**
 * ZPP_Space paths the rest of the suite does not reach: clearing a space with
 * live contacts / listeners / compounds, gravity changes waking sleeping
 * compound members, removing shapes mid-contact, fast-spinning CCD bodies,
 * and sensor / fluid arbiters coming and going.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { FluidProperties } from "../../src/phys/FluidProperties";

const DT = 1 / 60;

function floor(space: Space, y = 100, width = 400, type = BodyType.STATIC): Body {
  const b = new Body(type, new Vec2(0, y));
  b.shapes.add(new Polygon(Polygon.box(width, 20)));
  b.space = space;
  return b;
}

function ball(space: Space | null, x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  if (space) b.space = space;
  return b;
}

function settle(space: Space, steps = 300) {
  for (let i = 0; i < steps; i++) space.step(DT);
}

describe("Space.clear()", () => {
  it("empties a space that has live contacts, joints, compounds and listeners", () => {
    const space = new Space(new Vec2(0, 500));
    floor(space);
    const tag = new CbType();
    const balls = [0, 30, 60].map((x) => ball(space, x, 70));
    balls.forEach((b) => b.cbTypes.add(tag));
    new PivotJoint(balls[0], balls[1], new Vec2(15, 0), new Vec2(-15, 0)).space = space;
    const compound = new Compound();
    ball(null, -60, 70).compound = compound;
    compound.space = space;
    let begins = 0;
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.ANY, tag, CbType.ANY_BODY, () => {
        begins++;
      }),
    );
    settle(space, 30);
    expect(space.arbiters.length).toBeGreaterThan(0);
    expect(begins).toBeGreaterThan(0);

    space.clear();
    expect(space.bodies.length).toBe(0);
    expect(space.compounds.length).toBe(0);
    expect(space.constraints.length).toBe(0);
    expect(space.listeners.length).toBe(0);
    expect(space.arbiters.length).toBe(0);
    expect(balls[0].space).toBe(null);
    expect(balls[0].arbiters.length).toBe(0);

    // The space and the bodies are reusable afterwards; the old listener is gone.
    floor(space);
    balls[0].position = new Vec2(0, 70);
    balls[0].space = space;
    const before = begins;
    settle(space, 30);
    expect(balls[0].position.y).toBeLessThan(100);
    expect(balls[0].position.y).toBeGreaterThan(60);
    expect(begins).toBe(before);
  });

  it("clears a space whose bodies are asleep", () => {
    const space = new Space(new Vec2(0, 500));
    floor(space);
    const b = ball(space, 0, 80);
    settle(space);
    expect(b.isSleeping).toBe(true);
    space.clear();
    expect(space.bodies.length).toBe(0);
    expect(() => b.isSleeping).toThrow(/not contained within a Space/);
    b.space = space;
    expect(b.isSleeping).toBe(false);
  });
});

describe("changing gravity wakes sleeping bodies", () => {
  it("top-level and compound members wake; static bodies do not move", () => {
    const space = new Space(new Vec2(0, 500));
    const ground = floor(space);
    const loose = ball(space, -50, 80);
    const compound = new Compound();
    const member = ball(null, 50, 80);
    member.compound = compound;
    compound.space = space;
    settle(space);
    expect(loose.isSleeping).toBe(true);
    expect(member.isSleeping).toBe(true);

    space.gravity = new Vec2(0, -500);
    expect(loose.isSleeping).toBe(false);
    expect(member.isSleeping).toBe(false);
    settle(space, 30);
    expect(loose.position.y).toBeLessThan(70);
    expect(member.position.y).toBeLessThan(70);
    expect(ground.position.y).toBe(100);
  });

  it("an unchanged gravity assignment keeps them asleep", () => {
    const space = new Space(new Vec2(0, 500));
    floor(space);
    const b = ball(space, 0, 80);
    settle(space);
    space.gravity = new Vec2(0, 500);
    space.step(DT);
    expect(b.isSleeping).toBe(true);
  });
});

describe("removing shapes while they are in contact", () => {
  it("drops the shape's arbiters and fires END, the body falls through", () => {
    const space = new Space(new Vec2(0, 500));
    // Kinematic: a static body's shapes cannot change while it is in a space.
    const ground = floor(space, 100, 400, BodyType.KINEMATIC);
    const tag = new CbType();
    const b = ball(space, 0, 80);
    b.cbTypes.add(tag);
    const events: string[] = [];
    space.listeners.add(
      new InteractionListener(CbEvent.BEGIN, InteractionType.COLLISION, tag, CbType.ANY_BODY, () =>
        events.push("begin"),
      ),
    );
    space.listeners.add(
      new InteractionListener(CbEvent.END, InteractionType.COLLISION, tag, CbType.ANY_BODY, () =>
        events.push("end"),
      ),
    );
    settle(space, 20);
    expect(events).toEqual(["begin"]);
    expect(b.arbiters.length).toBe(1);

    ground.shapes.remove(ground.shapes.at(0));
    expect(b.arbiters.length).toBe(0);
    settle(space, 20);
    expect(events).toEqual(["begin", "end"]);
    // The floor's top was at y = 90 and the ball rested at 80: it fell through.
    expect(b.position.y).toBeGreaterThan(100);
  });

  it("removing a shape from a sleeping body wakes its contact partner", () => {
    const space = new Space(new Vec2(0, 500));
    floor(space);
    const bottom = ball(space, 0, 80);
    // A second, far-away shape keeps the body's mass non-zero once the first goes.
    bottom.shapes.add(new Circle(10, new Vec2(100, 0)));
    const top = ball(space, 0, 60);
    settle(space);
    expect(top.isSleeping).toBe(true);
    bottom.shapes.remove(bottom.shapes.at(bottom.shapes.length - 1));
    expect((bottom.shapes.at(0) as Circle).localCOM.x).toBe(100);
    space.step(DT);
    expect(top.isSleeping).toBe(false);
  });
});

describe("continuous collision for fast, spinning bodies", () => {
  it("a fast-spinning bullet rod does not tunnel through a thin wall", () => {
    const space = new Space();
    const wall = new Body(BodyType.STATIC, new Vec2(200, 0));
    wall.shapes.add(new Polygon(Polygon.box(2, 400)));
    wall.space = space;
    const rod = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    rod.shapes.add(new Polygon(Polygon.box(60, 4)));
    rod.isBullet = true;
    rod.velocity = new Vec2(3000, 0);
    rod.angularVel = 60;
    rod.space = space;
    for (let i = 0; i < 30; i++) {
      space.step(DT);
      expect(rod.position.x).toBeLessThan(200);
    }
  });

  it("with CCD disabled the same rod passes straight through", () => {
    const space = new Space();
    const wall = new Body(BodyType.STATIC, new Vec2(200, 0));
    wall.shapes.add(new Polygon(Polygon.box(2, 400)));
    wall.space = space;
    const rod = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    rod.shapes.add(new Polygon(Polygon.box(60, 4)));
    rod.disableCCD = true;
    rod.velocity = new Vec2(30000, 0);
    rod.angularVel = 60;
    rod.space = space;
    for (let i = 0; i < 5; i++) space.step(DT);
    expect(rod.position.x).toBeGreaterThan(200);
  });

  it("a fast spinning circle bullet against a static circle", () => {
    const space = new Space();
    const post = new Body(BodyType.STATIC, new Vec2(300, 0));
    post.shapes.add(new Circle(5));
    post.space = space;
    const shot = ball(space, 0, 0, 3);
    shot.isBullet = true;
    shot.velocity = new Vec2(12000, 0);
    shot.angularVel = 100;
    space.step(DT);
    expect(shot.position.x).toBeLessThan(300);
    expect(shot.velocity.x).toBeLessThan(12000);
  });
});

describe("sensor and fluid arbiters", () => {
  it("a sensor reports BEGIN / END and its arbiter disappears once the body leaves", () => {
    const space = new Space();
    const zone = new Body(BodyType.STATIC, new Vec2(0, 0));
    const s = new Polygon(Polygon.box(40, 40));
    s.sensorEnabled = true;
    zone.shapes.add(s);
    zone.space = space;
    const tag = new CbType();
    const b = ball(space, -60, 0, 5);
    b.cbTypes.add(tag);
    b.velocity = new Vec2(600, 0);
    const control = ball(space, -60, 300, 5); // same motion, never near the zone
    control.velocity = new Vec2(600, 0);
    const events: string[] = [];
    for (const ev of [CbEvent.BEGIN, CbEvent.END]) {
      space.listeners.add(
        new InteractionListener(ev, InteractionType.SENSOR, tag, CbType.ANY_BODY, () =>
          events.push(ev === CbEvent.BEGIN ? "in" : "out"),
        ),
      );
    }
    let maxSensorArbiters = 0;
    for (let i = 0; i < 30; i++) {
      space.step(DT);
      maxSensorArbiters = Math.max(maxSensorArbiters, b.arbiters.length);
    }
    expect(events).toEqual(["in", "out"]);
    expect(maxSensorArbiters).toBe(1);
    // No collision response: moves exactly like the control body.
    expect(b.velocity.x).toBe(control.velocity.x);
    expect(b.position.x).toBe(control.position.x);
    for (let i = 0; i < 20; i++) space.step(DT);
    expect(b.arbiters.length).toBe(0);
  });

  it("a fluid buoys a floating body and stops acting when the fluid shape is removed", () => {
    const space = new Space(new Vec2(0, 400));
    const pool = new Body(BodyType.KINEMATIC, new Vec2(0, 100));
    const water = new Polygon(Polygon.box(400, 200));
    water.fluidEnabled = true;
    water.fluidProperties = new FluidProperties(3, 2);
    pool.shapes.add(water);
    pool.space = space;
    const cork = ball(space, 0, -20, 10);
    settle(space, 240);
    const floatY = cork.position.y;
    expect(floatY).toBeLessThan(40); // floating near the surface at y = 0
    expect(cork.arbiters.length).toBe(1);
    expect(cork.arbiters.at(0).isFluidArbiter()).toBe(true);

    pool.shapes.remove(water);
    settle(space, 30);
    expect(cork.arbiters.length).toBe(0);
    expect(cork.position.y).toBeGreaterThan(floatY + 50);
  });
});

describe("BodyListener wake / sleep through islands", () => {
  it("bodies joined by a constraint sleep and wake together", () => {
    const space = new Space(new Vec2(0, 500));
    floor(space);
    const a = ball(space, 0, 80);
    const b = ball(space, 25, 80);
    new PivotJoint(a, b, new Vec2(12.5, 0), new Vec2(-12.5, 0)).space = space;
    const tag = new CbType();
    a.cbTypes.add(tag);
    b.cbTypes.add(tag);
    const log: string[] = [];
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, () => log.push("sleep")));
    space.listeners.add(new BodyListener(CbEvent.WAKE, tag, () => log.push("wake")));
    settle(space);
    expect(a.isSleeping && b.isSleeping).toBe(true);
    expect(log).toEqual(["sleep", "sleep"]);

    a.applyImpulse(new Vec2(0, -50));
    space.step(DT);
    expect(b.isSleeping).toBe(false);
    expect(log.slice(2)).toEqual(["wake", "wake"]);
  });
});
