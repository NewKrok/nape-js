/**
 * Body / Shape / ZPP_Shape / Interactor / Edge — behavioural coverage.
 *
 * Targets the error paths of the world body, type transitions in a space,
 * sleepable impulses, transform helpers (integrate, align, rotate,
 * translate/rotate/scale/transformShapes), impulse queries with body filters
 * and mixed arbiter types, material/filter/fluid swaps while in a space,
 * Shape.copy of validated state, and Edge pooling guards.
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import {
  Space,
  Body,
  BodyType,
  Compound,
  Vec2,
  Mat23,
  Circle,
  Polygon,
  Edge,
  Shape,
  Interactor,
  Material,
  FluidProperties,
  InteractionFilter,
  InteractionType,
  MassMode,
  InertiaMode,
  GravMassMode,
  PivotJoint,
  Config,
} from "../../src/index";

type Any = any;
const DT = 1 / 60;

function box(x: number, y: number, w = 20, h = 20, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  return b;
}

function ball(x: number, y: number, r = 10, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

// ---------------------------------------------------------------------------
// space.world guards
// ---------------------------------------------------------------------------

describe("Body — space.world guards", () => {
  const space = new Space();
  const world = space.world;
  const immutable: [string, () => unknown][] = [
    ["type", () => (world.type = BodyType.DYNAMIC)],
    ["rotation", () => (world.rotation = 1)],
    ["angularVel", () => (world.angularVel = 1)],
    ["kinAngVel", () => (world.kinAngVel = 1)],
    ["torque", () => (world.torque = 1)],
    ["mass=", () => (world.mass = 1)],
    ["inertia=", () => (world.inertia = 1)],
    ["gravMass=", () => (world.gravMass = 1)],
    ["gravMassScale=", () => (world.gravMassScale = 1)],
    ["space", () => (world.space = null)],
    ["massMode", () => (world.massMode = MassMode.FIXED)],
    ["inertiaMode", () => (world.inertiaMode = InertiaMode.FIXED)],
    ["gravMassMode", () => (world.gravMassMode = GravMassMode.SCALED)],
    ["integrate", () => world.integrate(1)],
    ["applyImpulse", () => world.applyImpulse(new Vec2(1, 0))],
    ["applyAngularImpulse", () => world.applyAngularImpulse(1)],
    ["translateShapes", () => world.translateShapes(new Vec2(1, 0))],
    ["rotateShapes", () => world.rotateShapes(1)],
    ["scaleShapes", () => world.scaleShapes(2, 2)],
    ["transformShapes", () => world.transformShapes(Mat23.rotation(1))],
    ["align", () => world.align()],
    ["setShapeMaterials", () => world.setShapeMaterials(new Material())],
    ["setShapeFilters", () => world.setShapeFilters(new InteractionFilter())],
    ["setShapeFluidProperties", () => world.setShapeFluidProperties(new FluidProperties())],
  ];
  it.each(immutable)("%s throws immutable", (_n, fn) => {
    expect(fn).toThrow("Space::world is immutable");
  });

  it.each([
    ["mass", () => world.mass, "Space::world has no mass"],
    ["inertia", () => world.inertia, "Space::world has no inertia"],
    ["gravMass", () => world.gravMass, "Space::world has no gravMass"],
    ["bounds", () => world.bounds, "Space::world has no bounds"],
    ["localCOM", () => world.localCOM, "Space::world has no localCOM"],
    ["worldCOM", () => world.worldCOM, "Space::world has no worldCOM"],
    ["copy", () => world.copy(), "Space::world cannot be copied"],
  ] as [string, () => unknown, string][])("%s throws", (_n, fn, msg) => {
    expect(fn).toThrow(msg);
  });

  it("constraintMass / constraintInertia of the world are zero (infinite mass)", () => {
    expect(world.constraintMass).toBe(0);
    expect(world.constraintInertia).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// type changes / space / compound
// ---------------------------------------------------------------------------

describe("Body — type, space and compound transitions", () => {
  it("switching a moving body to STATIC inside a space zeroes its velocity", () => {
    const space = new Space();
    const b = ball(0, 0);
    b.velocity = new Vec2(10, 5);
    b.angularVel = 3;
    b.space = space;
    b.type = BodyType.STATIC;
    expect(b.isStatic()).toBe(true);
    expect(b.velocity.x).toBe(0);
    expect(b.velocity.y).toBe(0);
    expect(b.angularVel).toBe(0);
    space.step(DT);
    expect(b.position.x).toBe(0);
  });

  it("switching out of space to STATIC keeps the velocity values", () => {
    const b = ball(0, 0);
    b.velocity = new Vec2(10, 5);
    b.type = BodyType.STATIC;
    expect(b.velocity.x).toBe(10);
    b.type = BodyType.KINEMATIC;
    expect(b.isKinematic()).toBe(true);
  });

  it("a KINEMATIC body switched to DYNAMIC in a space starts falling", () => {
    const space = new Space(new Vec2(0, 100));
    const b = ball(0, 0, 10, BodyType.KINEMATIC);
    b.space = space;
    space.step(DT);
    expect(b.velocity.y).toBe(0);
    b.type = BodyType.DYNAMIC;
    space.step(DT);
    expect(b.velocity.y).toBeGreaterThan(0);
  });

  it("type setter rejects null", () => {
    const b = ball(0, 0);
    expect(() => (b.type = null as Any)).toThrow("Cannot use null BodyType");
  });

  it("space of a body inside a compound cannot be set directly", () => {
    const c = new Compound();
    const b = ball(0, 0);
    b.compound = c;
    expect(b.compound).toBe(c);
    expect(() => (b.space = new Space())).toThrow(
      "Cannot set the space of a Body belonging to a Compound",
    );
  });

  it("moving a body between compounds updates both body lists", () => {
    const c1 = new Compound();
    const c2 = new Compound();
    const b = ball(0, 0);
    b.compound = c1;
    expect(c1.bodies.length).toBe(1);
    b.compound = c2;
    expect(c1.bodies.length).toBe(0);
    expect(c2.bodies.length).toBe(1);
    b.compound = null;
    expect(c2.bodies.length).toBe(0);
    expect(b.compound).toBeNull();
  });

  it("moving a body between spaces", () => {
    const s1 = new Space();
    const s2 = new Space();
    const b = ball(0, 0);
    b.space = s1;
    b.space = s2;
    expect(s1.bodies.length).toBe(0);
    expect(s2.bodies.length).toBe(1);
    expect(b.space).toBe(s2);
  });

  it("static body in a space cannot be rotated via rotate()", () => {
    const space = new Space();
    const b = box(0, 0, 10, 10, BodyType.STATIC);
    b.space = space;
    expect(() => b.rotate(new Vec2(0, 0), 1)).toThrow(
      "Static objects cannot be rotated once inside a Space",
    );
  });

  it("Body._wrap handles null, Body, ZPP_Body and wrapper-like inputs", () => {
    const b = ball(0, 0);
    expect(Body._wrap(null as Any)).toBeNull();
    expect(Body._wrap(b as Any)).toBe(b);
    expect(Body._wrap((b as Any).zpp_inner)).toBe(b);
    expect(Body._wrap({ zpp_inner: (b as Any).zpp_inner } as Any)).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// integrate / align / rotate
// ---------------------------------------------------------------------------

describe("Body — integrate, align, rotate", () => {
  it.each([
    ["small rotation step (series axis update)", 0.5],
    ["large rotation step (sin/cos axis update)", 30],
  ])("integrate advances pose: %s", (_l, w) => {
    const b = box(0, 0);
    b.velocity = new Vec2(10, -20);
    b.angularVel = w;
    b.integrate(0.01);
    expect(b.position.x).toBeCloseTo(0.1, 10);
    expect(b.position.y).toBeCloseTo(-0.2, 10);
    expect(b.rotation).toBeCloseTo(w * 0.01, 10);
    // world vertices follow the new rotation
    const v = (b.shapes.at(0) as Any).worldVerts.at(0);
    const lv = (b.shapes.at(0) as Any).localVerts.at(0);
    const c = Math.cos(b.rotation);
    const s = Math.sin(b.rotation);
    expect(v.x).toBeCloseTo(0.1 + lv.x * c - lv.y * s, 6);
    expect(v.y).toBeCloseTo(-0.2 + lv.x * s + lv.y * c, 6);
  });

  it("integrate(0) is a no-op and NaN is rejected", () => {
    const b = box(3, 4);
    b.velocity = new Vec2(10, 10);
    b.integrate(0);
    expect(b.position.x).toBe(3);
    expect(() => b.integrate(NaN)).toThrow("Cannot integrate by NaN time");
  });

  it("align() keeps shapes fixed in world space and compensates the stepped pre-position", () => {
    const space = new Space();
    const b = new Body(BodyType.DYNAMIC, new Vec2(100, 50));
    b.shapes.add(new Circle(5, new Vec2(10, 0)));
    b.space = space;
    space.step(DT); // establishes pre_pos
    const before = (b.shapes.at(0) as Any).worldCOM.copy();
    b.align();
    expect(b.localCOM.x).toBeCloseTo(0, 10);
    expect(b.position.x).toBeCloseTo(110, 10);
    const after = (b.shapes.at(0) as Any).worldCOM;
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
    // pre-position is shifted too, so no spurious velocity appears
    space.step(DT);
    expect(b.velocity.x).toBeCloseTo(0, 10);
    expect(b.position.x).toBeCloseTo(110, 10);
  });

  it("align() on an empty body throws", () => {
    const b = new Body();
    expect(() => b.align()).toThrow("Cannot align empty Body");
  });

  it("rotate() about an external pivot moves and rotates the body", () => {
    const b = box(10, 0);
    b.rotate(new Vec2(0, 0), Math.PI / 2);
    expect(b.position.x).toBeCloseTo(0, 10);
    expect(b.position.y).toBeCloseTo(10, 10);
    expect(b.rotation).toBeCloseTo(Math.PI / 2, 10);
    expect(() => b.rotate(null as Any, 1)).toThrow("Cannot rotate about a null Vec2");
    expect(() => b.rotate(new Vec2(), NaN)).toThrow("Cannot rotate by NaN radians");
  });

  it("transformShapes / scaleShapes / rotateShapes / translateShapes change geometry", () => {
    const b = box(0, 0, 20, 10);
    const area0 = (b.shapes.at(0) as Any).area;
    b.scaleShapes(2, 3);
    expect((b.shapes.at(0) as Any).area).toBeCloseTo(area0 * 6, 6);
    b.translateShapes(new Vec2(5, 0));
    expect(b.localCOM.x).toBeCloseTo(5, 6);
    b.rotateShapes(Math.PI);
    expect(b.localCOM.x).toBeCloseTo(-5, 6);
    b.transformShapes(Mat23.translation(5, 7));
    expect(b.localCOM.x).toBeCloseTo(0, 6);
    expect(b.localCOM.y).toBeCloseTo(7, 6);
  });
});

// ---------------------------------------------------------------------------
// impulses / velocities
// ---------------------------------------------------------------------------

describe("Body — impulse helpers", () => {
  function sleepingBody(): { space: Space; b: Body } {
    const space = new Space(new Vec2(0, 0));
    const b = ball(0, 0);
    b.space = space;
    for (let i = 0; i < Config.sleepDelay + 10; i++) space.step(DT);
    return { space, b };
  }

  it("sleepable impulses leave a sleeping body untouched", () => {
    const { b } = sleepingBody();
    expect(b.isSleeping).toBe(true);
    b.applyImpulse(new Vec2(100, 0), new Vec2(0, 5), true);
    b.applyAngularImpulse(100, true);
    expect(b.velocity.x).toBe(0);
    expect(b.angularVel).toBe(0);
    expect(b.isSleeping).toBe(true);
  });

  it("non-sleepable impulses wake the body and change its velocity", () => {
    const { b } = sleepingBody();
    b.applyAngularImpulse(b.inertia * 2);
    expect(b.angularVel).toBeCloseTo(2, 10);
    expect(b.isSleeping).toBe(false);
  });

  it("applyImpulse rejects null and disposed vectors", () => {
    const b = ball(0, 0);
    expect(() => b.applyImpulse(null as Any)).toThrow("Cannot apply null impulse to Body");
    const v = new Vec2(1, 1);
    v.dispose();
    expect(() => b.applyImpulse(v)).toThrow("Vec2 has been disposed");
  });

  it("setVelocityFromTarget validates its input", () => {
    const b = ball(0, 0);
    expect(() => b.setVelocityFromTarget(null as Any, 0, 1)).toThrow(
      "Cannot set velocity for null target position",
    );
    expect(() => b.setVelocityFromTarget(new Vec2(), 0, 0)).toThrow("deltaTime cannot be 0");
    b.setVelocityFromTarget(new Vec2(10, 0), 1, 0.5);
    expect(b.velocity.x).toBeCloseTo(20, 10);
    expect(b.angularVel).toBeCloseTo(2, 10);
  });

  it("setVelocityFromTarget on a static body throws for angular velocity", () => {
    const b = box(0, 0, 10, 10, BodyType.STATIC);
    expect(() => b.setVelocityFromTarget(new Vec2(0, 0), 1, 1)).toThrow();
  });

  it.each([
    ["position", (b: Body) => (b.position = null as Any), "Body::position cannot be null"],
    ["velocity", (b: Body) => (b.velocity = null as Any), "Body::velocity cannot be null"],
    [
      "kinematicVel",
      (b: Body) => (b.kinematicVel = null as Any),
      "Body::kinematicVel cannot be null",
    ],
    ["surfaceVel", (b: Body) => (b.surfaceVel = null as Any), "Body::surfaceVel cannot be null"],
    ["force", (b: Body) => (b.force = null as Any), "Body::force cannot be null"],
    ["contains", (b: Body) => b.contains(null as Any), "Cannot check containment of null point"],
  ] as [string, (b: Body) => unknown, string][])("null %s throws", (_n, fn, msg) => {
    expect(() => fn(ball(0, 0))).toThrow(msg);
  });
});

// ---------------------------------------------------------------------------
// mass / gravMass modes without shapes
// ---------------------------------------------------------------------------

describe("Body — mass modes without shapes", () => {
  it("gravMass/gravMassScale on an empty body depend on the mode", () => {
    const b = new Body();
    expect(() => b.gravMass).toThrow("Body::gravMass only makes sense if it contains Shapes");
    expect(() => b.gravMassScale).toThrow(
      "Body::gravMassScale only makes sense if it contains Shapes",
    );
    b.gravMass = 5;
    expect(b.gravMass).toBe(5);
    b.gravMassScale = 2;
    expect(b.gravMassScale).toBe(2);
    expect(b.gravMassMode).toBe(GravMassMode.SCALED);
  });

  it("mass/inertia of an empty body in DEFAULT mode throw", () => {
    const b = new Body();
    expect(() => b.mass).toThrow("Body::mass only makes sense if it contains shapes");
    expect(() => b.inertia).toThrow("Body::inertia only makes sense if Body contains Shapes");
    b.inertia = 7;
    expect(b.inertia).toBe(7);
  });

  it("FIXED mass on an empty body is usable for gravMass", () => {
    const b = new Body();
    b.mass = 4;
    expect(b.massMode).toBe(MassMode.FIXED);
    expect(b.mass).toBe(4);
    expect(b.gravMass).toBe(4);
    b.gravMassScale = 0.5;
    expect(b.gravMass).toBeCloseTo(2, 10);
  });
});

// ---------------------------------------------------------------------------
// impulse queries with filters / mixed arbiters / constraints
// ---------------------------------------------------------------------------

describe("Body — impulse queries", () => {
  function scene() {
    const space = new Space(new Vec2(0, 400));
    const floor = box(0, 50, 400, 20, BodyType.STATIC);
    floor.space = space;
    const water = box(0, 20, 400, 40, BodyType.STATIC);
    const ws = water.shapes.at(0) as Any;
    ws.fluidEnabled = true;
    // thin fluid: the ball still sinks onto the floor, keeping its contact alive
    ws.fluidProperties = new FluidProperties(0.3, 2);
    water.space = space;
    const sensorBody = box(0, 30, 30, 30, BodyType.STATIC);
    (sensorBody.shapes.at(0) as Any).sensorEnabled = true;
    sensorBody.space = space;
    const b = ball(0, 31, 10);
    b.space = space;
    const other = ball(0, 31, 2);
    other.space = space;
    // a soft joint between coincident bodies: does not disturb the contacts
    const pj = new PivotJoint(b, other, new Vec2(), new Vec2());
    pj.ignore = true;
    pj.space = space;
    for (let i = 0; i < 3; i++) space.step(DT);
    return { space, floor, water, sensorBody, b, other, pj };
  }

  it("arbiter impulse sums respect the body filter and arbiter type", () => {
    const { floor, water, sensorBody, b } = scene();
    const kinds = new Set<number>();
    for (let i = 0; i < b.arbiters.length; i++) kinds.add((b.arbiters.at(i) as Any).zpp_inner.type);
    expect(kinds.size).toBe(3); // collision, sensor and fluid arbiters all present

    // fluid queries ignore collision partners
    expect(b.buoyancyImpulse(floor).length).toBe(0);
    expect(b.buoyancyImpulse(water).y).toBeLessThan(0);
    expect(b.dragImpulse(sensorBody).length).toBe(0);
    expect(b.totalFluidImpulse(water).length).toBeGreaterThan(0);

    // collision queries ignore the fluid/sensor partners
    expect(b.normalImpulse(water).length).toBe(0);
    expect(b.normalImpulse(floor).y).toBeLessThan(0);
    expect(b.tangentImpulse(water).length).toBe(0);
    expect(b.rollingImpulse(water)).toBe(0);
    expect(b.rollingImpulse(floor)).toBe(b.rollingImpulse());

    // totalImpulse skips the sensor arbiter entirely; (as in Haxe nape) the
    // constraint contribution is added regardless of the body filter
    const tSensor = b.totalImpulse(sensorBody);
    const ci = b.constraintsImpulse();
    expect(tSensor.x).toBeCloseTo(ci.x, 10);
    expect(tSensor.y).toBeCloseTo(ci.y, 10);
    expect(tSensor.z).toBeCloseTo(ci.z, 10);
    const tFloor = b.totalImpulse(floor);
    expect(tFloor.y).toBeLessThan(0);
  });

  it("totalImpulse includes active constraint impulses and skips inactive ones", () => {
    const { b, other, pj } = scene();
    const ci = b.constraintsImpulse();
    expect(ci.length).toBeGreaterThan(0);
    const withJoint = b.totalImpulse(other);
    expect(withJoint.x).toBeCloseTo(ci.x, 8);
    expect(withJoint.y).toBeCloseTo(ci.y, 8);
    expect(ci.length).toBeGreaterThan(0);
    pj.active = false;
    const without = b.totalImpulse(other);
    expect(without.length).toBe(0);
  });

  it("crushFactor is positive when squeezed and requires a space", () => {
    const space = new Space(new Vec2(0, 600));
    const floor = box(0, 50, 400, 20, BodyType.STATIC);
    floor.space = space;
    const mid = box(0, 30, 20, 20);
    mid.space = space;
    const heavy = box(0, 0, 40, 40);
    heavy.mass = 500;
    heavy.space = space;
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(mid.crushFactor()).toBeGreaterThan(0);
    const loose = ball(0, 0);
    expect(() => loose.crushFactor()).toThrow("Makes no sense to see how much an object");
  });

  it("interactingBodies(COLLISION / SENSOR) filters by interaction type", () => {
    const { floor, water, sensorBody, b } = scene();
    const col = b.interactingBodies(InteractionType.COLLISION);
    const sen = b.interactingBodies(InteractionType.SENSOR);
    expect(col.has(floor)).toBe(true);
    expect(col.has(water)).toBe(false);
    expect(col.has(sensorBody)).toBe(false);
    expect(sen.has(sensorBody)).toBe(true);
    expect(sen.has(floor)).toBe(false);
    expect(sen.has(water)).toBe(false);
  });

  // BUG (port divergence): ZPP_Body.interactingBodies tests
  // `type === 4 || a.type === type`, treating FLUID (4) as "any type".
  // Haxe nape uses `(arb.type & arbiter_type) != 0`, so FLUID only returns
  // fluid partners.
  it("interactingBodies(FLUID) returns only fluid partners", () => {
    const { floor, water, b } = scene();
    const flu = b.interactingBodies(InteractionType.FLUID);
    expect(flu.has(water)).toBe(true);
    expect(flu.has(floor)).toBe(false);
  });

  // BUG (port divergence): with no type Body.interactingBodies passes the
  // mask COL|SENSOR|FLUID (7); ZPP_Body compares `a.type === 7`, which never
  // matches, so the result is always empty. Haxe returns every partner.
  it("interactingBodies() with no type returns all interacting bodies", () => {
    const { floor, water, sensorBody, b } = scene();
    const all = b.interactingBodies();
    expect(all.has(floor)).toBe(true);
    expect(all.has(water)).toBe(true);
    expect(all.has(sensorBody)).toBe(true);
  });

  // BUG (port divergence): the `depth` argument is ignored (`_depth`); Haxe
  // performs a graph traversal through arbiters, unbounded for depth = -1.
  it("interactingBodies follows arbiter chains up to `depth`", () => {
    const space = new Space(new Vec2(0, 0));
    const a = ball(0, 0, 10);
    const m = ball(18, 0, 10);
    const c = ball(36, 0, 10);
    a.space = space;
    m.space = space;
    c.space = space;
    space.step(DT);
    const direct = a.interactingBodies(InteractionType.COLLISION, 1);
    expect(direct.has(m)).toBe(true);
    expect(direct.has(c)).toBe(false);
    const all = a.interactingBodies(InteractionType.COLLISION, -1);
    expect(all.has(m)).toBe(true);
    expect(all.has(c)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BUG: Body.arbiters exposes inactive arbiters
// ---------------------------------------------------------------------------

describe("Body.arbiters after separation (Haxe ArbiterList accepts only active arbiters)", () => {
  // Haxe nape's ArbiterList is generated with `accept(x) x.active`, so a body's
  // arbiter list never shows an arbiter that is kept alive only for
  // Config.arbiterExpirationDelay steps after separation. The TS port's
  // ArbiterList (registerLists.ts) has no such filter: the inactive arbiter is
  // listed, and every Body impulse query that walks the list throws
  // "Arbiter not currently in use".
  function separated(): { space: Space; b: Body } {
    const space = new Space(new Vec2(0, 100));
    const floor = box(0, 0, 400, 20, BodyType.STATIC);
    floor.space = space;
    const b = ball(0, -19, 10);
    b.space = space;
    space.step(DT);
    b.position = new Vec2(0, -100);
    space.step(DT);
    return { space, b };
  }

  it("space.arbiters already hides the expiring arbiter", () => {
    const { space } = separated();
    expect((space.arbiters as Any).length).toBe(0);
  });

  it("body.arbiters hides the expiring arbiter", () => {
    const { b } = separated();
    expect(b.arbiters.length).toBe(0);
  });

  it("Body impulse queries do not throw right after separation", () => {
    const { b } = separated();
    expect(b.normalImpulse().length).toBe(0);
    expect(b.tangentImpulse().length).toBe(0);
    expect(b.totalImpulse().length).toBe(0);
    expect(b.rollingImpulse()).toBe(0);
    expect(b.crushFactor()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// setShapeMaterials / Filters / FluidProperties while in a space
// ---------------------------------------------------------------------------

describe("Body — shape property swaps in a space", () => {
  it("setShapeMaterials moves shapes between material shape lists and refreshes arbiters", () => {
    const space = new Space(new Vec2(0, 100));
    const floor = box(0, 0, 400, 20, BodyType.STATIC);
    floor.space = space;
    const m0 = new Material(0, 1, 2, 1, 0.001);
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, -19.5));
    b.shapes.add(new Polygon(Polygon.box(20, 20), m0));
    b.shapes.add(new Circle(5, new Vec2(0, -15), m0));
    b.space = space;
    space.step(DT);
    const zm0 = (m0 as Any).zpp_inner;
    expect(zm0.shapes.length).toBe(2);
    const arb = b.arbiters.at(0).collisionArbiter!;
    expect(arb.elasticity).toBeCloseTo(0, 10);
    const m1 = new Material(1, 0.5, 0.5, 2, 0.001);
    b.setShapeMaterials(m1);
    expect(zm0.shapes.length).toBe(0);
    expect((m1 as Any).zpp_inner.shapes.length).toBe(2);
    expect(arb.elasticity).toBeCloseTo(0.5, 10);
    expect(() => b.setShapeMaterials(null as Any)).toThrow("Cannot assign null as Shape material");
  });

  it("setShapeFilters can disable collision with the floor while in a space", () => {
    const space = new Space(new Vec2(0, 400));
    const floor = box(0, 50, 400, 20, BodyType.STATIC);
    floor.space = space;
    const b = box(0, 25, 20, 20);
    b.space = space;
    for (let i = 0; i < 20; i++) space.step(DT);
    const restY = b.position.y;
    const f0 = (b.shapes.at(0) as Any).filter;
    const f = new InteractionFilter(1, 0);
    b.setShapeFilters(f);
    expect((f0 as Any).zpp_inner.shapes.length).toBe(0);
    expect((f as Any).zpp_inner.shapes.length).toBe(1);
    for (let i = 0; i < 20; i++) space.step(DT);
    expect(b.position.y).toBeGreaterThan(restY + 5);
    expect(() => b.setShapeFilters(null as Any)).toThrow("Cannot assign null as Shape filter");
  });

  it("setShapeFluidProperties swaps fluid properties while in a space", () => {
    const space = new Space(new Vec2(0, 100));
    const water = box(0, 0, 200, 200, BodyType.STATIC);
    const ws = water.shapes.at(0) as Any;
    ws.fluidEnabled = true;
    const fp1 = new FluidProperties(1, 1);
    ws.fluidProperties = fp1;
    water.space = space;
    expect((fp1 as Any).zpp_inner.shapes.length).toBe(1);
    const fp2 = new FluidProperties(5, 1);
    water.setShapeFluidProperties(fp2);
    expect((fp1 as Any).zpp_inner.shapes.length).toBe(0);
    expect((fp2 as Any).zpp_inner.shapes.length).toBe(1);
    expect(ws.fluidProperties.density).toBeCloseTo(5, 10);
    expect(() => water.setShapeFluidProperties(null as Any)).toThrow(
      "Cannot assign null as Shape fluidProperties",
    );
    // removing from space releases the shape from the fluid shapes list
    water.space = null;
    expect((fp2 as Any).zpp_inner.shapes.length).toBe(0);
  });

  it("changing fluid density of an enabled fluid wakes and changes buoyancy", () => {
    const run = (density: number): number => {
      const space = new Space(new Vec2(0, 100));
      const water = box(0, 0, 400, 400, BodyType.STATIC);
      const ws = water.shapes.at(0) as Any;
      ws.fluidEnabled = true;
      ws.fluidProperties = new FluidProperties(1, 0);
      water.space = space;
      const b = ball(0, 0, 10);
      b.space = space;
      space.step(DT);
      ws.fluidProperties.density = density;
      for (let i = 0; i < 10; i++) space.step(DT);
      return b.velocity.y;
    };
    // denser fluid pushes harder upwards
    expect(run(4)).toBeLessThan(run(1));
  });
});

// ---------------------------------------------------------------------------
// Shape-level behaviour
// ---------------------------------------------------------------------------

describe("Shape — static-body guards, transforms and copy", () => {
  function staticShapeInSpace(): Any {
    const space = new Space();
    const b = box(0, 0, 10, 10, BodyType.STATIC);
    b.space = space;
    return b.shapes.at(0);
  }

  it.each([
    ["translate", (s: Any) => s.translate(new Vec2(1, 0))],
    ["scale", (s: Any) => s.scale(2, 2)],
    ["rotate", (s: Any) => s.rotate(1)],
    ["transform", (s: Any) => s.transform(Mat23.rotation(1))],
    ["localCOM", (s: Any) => (s.localCOM = new Vec2(1, 1))],
  ] as [string, (s: Any) => unknown][])("%s on a static shape in a space throws", (_n, fn) => {
    expect(() => fn(staticShapeInSpace())).toThrow(
      "Cannot modify Shape belonging to a static Object once inside a Space",
    );
  });

  it("translate by zero / weak vector, rotate by 2π are geometric no-ops", () => {
    const p = new Polygon(Polygon.box(10, 10));
    const v0 = p.localVerts.at(0).copy();
    p.translate(new Vec2(0, 0));
    p.rotate(2 * Math.PI);
    expect(p.localVerts.at(0).x).toBeCloseTo(v0.x, 10);
    const w = Vec2.weak(3, 0);
    p.translate(w);
    expect(w.zpp_disp).toBe(true);
    expect(p.localVerts.at(0).x).toBeCloseTo(v0.x + 3, 10);
  });

  it("circle transforms: uniform OK, non-uniform/non-equiorthogonal rejected, singular rejected", () => {
    const c = new Circle(10);
    c.scale(2, 2);
    expect(c.radius).toBeCloseTo(20, 10);
    expect(() => c.scale(2, 3)).toThrow("Cannot perform a non equal scaling on a Circle");
    expect(() => c.scale(0, 1)).toThrow("Cannot Scale shape by a factor of 0");
    expect(() => c.scale(NaN, 1)).toThrow("Cannot scale Shape by NaN");
    expect(() => c.rotate(NaN)).toThrow("Cannot rotate Shape by NaN");
    c.transform(Mat23.rotation(1).concat(Mat23.translation(5, 0)));
    expect(c.localCOM.x).toBeCloseTo(5, 10);
    expect(() => c.transform(Mat23.scale(1, 2))).toThrow(
      "Cannot transform Circle by a non equiorthogonal matrix",
    );
    expect(() => c.transform(new Mat23(1, 1, 1, 1, 0, 0))).toThrow(
      "Cannot transform Shape by a singular matrix",
    );
    expect(() => c.transform(null as Any)).toThrow("Cannot transform Shape by null matrix");
    expect(() => c.translate(null as Any)).toThrow("Cannot displace Shape by null Vec2");
  });

  it("polygon transform with shear changes area by the determinant", () => {
    const p = new Polygon(Polygon.box(10, 10));
    const a0 = p.area;
    p.transform(new Mat23(2, 1, 0, 3, 0, 0));
    expect(p.area).toBeCloseTo(a0 * 6, 6);
  });

  it("localCOM setter accepts a weak Vec2 and moves the circle", () => {
    const c = new Circle(5);
    const w = Vec2.weak(4, 2);
    c.localCOM = w;
    expect(c.localCOM.x).toBeCloseTo(4, 10);
    expect(c.localCOM.y).toBeCloseTo(2, 10);
    expect(() => (c.localCOM = null as Any)).toThrow("Shape::localCOM cannot be null");
  });

  it("worldCOM uses a pooled Vec2 and requires a body", () => {
    const c = new Circle(5, new Vec2(3, 0));
    expect(() => c.worldCOM.x).toThrow("worldCOM only makes sense when Shape belongs to a Body");
    const b = new Body(BodyType.DYNAMIC, new Vec2(10, 10));
    b.shapes.add(c);
    new Vec2(0, 0).dispose();
    const w = c.worldCOM;
    expect(w.x).toBeCloseTo(13, 10);
    expect(w.y).toBeCloseTo(10, 10);
    b.rotation = Math.PI / 2;
    expect(c.worldCOM.x).toBeCloseTo(10, 10);
    expect(c.worldCOM.y).toBeCloseTo(13, 10);
  });

  it("copy() of a validated shape keeps area, inertia, bounds and shares material/filter", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const p = new Polygon(Polygon.box(10, 20));
    p.fluidEnabled = true;
    p.fluidProperties = new FluidProperties(2, 3);
    p.sensorEnabled = true;
    (p.userData as Any).tag = "orig";
    b.shapes.add(p);
    // force validation of cached values
    void p.area;
    void p.inertia;
    void p.bounds;
    void p.sweepRadius;
    void p.angDrag;
    const q = p.copy() as Any;
    expect(q).not.toBe(p);
    expect(q.area).toBeCloseTo(200, 10);
    expect(q.inertia).toBeCloseTo(p.inertia, 10);
    expect(q.material).toBe(p.material);
    expect(q.filter).toBe(p.filter);
    expect(q.fluidProperties).toBe(p.fluidProperties);
    expect(q.fluidEnabled).toBe(true);
    expect(q.sensorEnabled).toBe(true);
    expect(q.userData.tag).toBe("orig");
    expect(q.userData).not.toBe(p.userData);
    expect(q.body).toBeNull();
  });

  it("copy() of a shape that took part in a step keeps its cached geometry", () => {
    const space = new Space(new Vec2(0, 100));
    const b = new Body(BodyType.DYNAMIC, new Vec2(5, 5));
    const p = new Polygon(Polygon.box(10, 20));
    b.shapes.add(p);
    b.isBullet = true; // forces sweep radius validation
    b.velocity = new Vec2(600, 0);
    b.space = space;
    space.step(DT);
    const q = p.copy() as Any;
    expect(q.area).toBeCloseTo(200, 10);
    expect(q.angDrag).toBeCloseTo(p.angDrag, 10);
    const host = new Body(BodyType.DYNAMIC, b.position.copy());
    host.rotation = b.rotation;
    host.shapes.add(q);
    expect(q.bounds.min.x).toBeCloseTo(p.bounds.min.x, 6);
    expect(q.bounds.max.y).toBeCloseTo(p.bounds.max.y, 6);
  });

  it("bounds of a body-less shape throw on use", () => {
    const c = new Circle(3);
    expect(() => c.bounds.width).toThrow("bounds only makes sense when Shape belongs to a Body");
  });

  it("fluidProperties getter lazily creates default properties", () => {
    const c = new Circle(3);
    const fp = c.fluidProperties;
    expect(fp).toBeInstanceOf(FluidProperties);
    expect(c.fluidProperties).toBe(fp);
  });

  it("changing fluid properties of a disabled fluid does not wake a sleeping body", () => {
    const space = new Space(new Vec2(0, 0));
    const b = ball(0, 0);
    const s = b.shapes.at(0) as Any;
    s.fluidProperties = new FluidProperties(1, 1);
    b.space = space;
    for (let i = 0; i < Config.sleepDelay + 10; i++) space.step(DT);
    expect(b.isSleeping).toBe(true);
    s.fluidProperties.density = 3;
    expect(b.isSleeping).toBe(true);
    s.fluidEnabled = true;
    s.fluidProperties.density = 4;
    space.step(DT);
    expect(b.isSleeping).toBe(false);
  });

  it("copy() of an unvalidated circle recomputes lazily", () => {
    const c = new Circle(4);
    const d = c.copy() as Any;
    expect(d.area).toBeCloseTo(Math.PI * 16, 10);
    expect(d.radius).toBe(4);
  });

  it("filter/fluid/material swap on a shape in a space updates owner lists", () => {
    const space = new Space();
    const b = ball(0, 0);
    b.space = space;
    const s = b.shapes.at(0) as Any;
    const f0 = s.filter;
    const f1 = new InteractionFilter(2, 2);
    s.filter = f1;
    expect(f0.zpp_inner.shapes.length).toBe(0);
    expect((f1 as Any).zpp_inner.shapes.length).toBe(1);
    const fp1 = new FluidProperties();
    s.fluidProperties = fp1;
    const fp2 = new FluidProperties();
    s.fluidProperties = fp2;
    expect((fp1 as Any).zpp_inner.shapes.length).toBe(0);
    expect((fp2 as Any).zpp_inner.shapes.length).toBe(1);
    b.space = null;
    expect((fp2 as Any).zpp_inner.shapes.length).toBe(0);
    expect((f1 as Any).zpp_inner.shapes.length).toBe(0);
  });

  it("enabling fluid on a shape without fluid properties creates defaults", () => {
    const c = new Circle(3) as Any;
    expect(c.zpp_inner.fluidProperties).toBeNull();
    c.fluidEnabled = true;
    expect(c.zpp_inner.fluidProperties).not.toBeNull();
    expect(c.fluidProperties.density).toBeGreaterThan(0);
  });

  it("rotating a circle rotates its local centre of mass", () => {
    const c = new Circle(3, new Vec2(10, 0));
    c.rotate(Math.PI / 2);
    expect(c.localCOM.x).toBeCloseTo(0, 10);
    expect(c.localCOM.y).toBeCloseTo(10, 10);
  });

  it("translate/contains reject disposed or null points; contains consumes weak points", () => {
    const b = ball(0, 0, 5);
    const s = b.shapes.at(0);
    const v = new Vec2(1, 1);
    v.dispose();
    expect(() => s.translate(v)).toThrow("Vec2 has been disposed");
    expect(() => s.contains(v)).toThrow("Vec2 has been disposed");
    expect(() => s.contains(null as Any)).toThrow("Cannot check null point for containment");
    const w = Vec2.weak(1, 1);
    expect(s.contains(w)).toBe(true);
    expect(w.zpp_disp).toBe(true);
    expect(s.contains(new Vec2(6, 0))).toBe(false);
    expect(() => new Circle(1).contains(new Vec2())).toThrow(
      "Shape is not well defined without a Body",
    );
  });

  it("Shape._wrap resolves inner objects and outers", () => {
    const c = new Circle(2);
    const p = new Polygon(Polygon.box(2, 2));
    expect(Shape._wrap(null)).toBeNull();
    expect(Shape._wrap(c)).toBe(c);
    expect(Shape._wrap((c as Any).zpp_inner)).toBe(c);
    expect(Shape._wrap((p as Any).zpp_inner)).toBe(p);
  });

  it("toString reports the shape type and id", () => {
    const c = new Circle(1);
    const p = new Polygon(Polygon.box(1, 1));
    expect(c.toString()).toBe("Circle#" + c.id);
    expect(p.toString()).toBe("Polygon#" + p.id);
  });
});

// ---------------------------------------------------------------------------
// Edge
// ---------------------------------------------------------------------------

describe("Edge — construction and pooling guards", () => {
  it("cannot be constructed directly", () => {
    expect(() => new (Edge as Any)()).toThrow("Cannot instantiate an Edge derp!");
  });

  it("_wrap handles null / Edge / unknown input", () => {
    const p = new Polygon(Polygon.box(10, 10));
    const e = p.edges.at(0);
    expect(Edge._wrap(null)).toBeNull();
    expect(Edge._wrap(e)).toBe(e);
    expect(Edge._wrap({} as Any)).toBeNull();
  });

  it("an edge released by a vertex change throws on every accessor", () => {
    const p = new Polygon(Polygon.box(10, 10));
    const e = p.edges.at(3);
    expect(e.length).toBeCloseTo(10, 10);
    // removing a vertex releases the last edge back to the pool
    p.localVerts.pop();
    expect(p.edges.length).toBe(3);
    const stale = [p.edges.at(0), p.edges.at(1), p.edges.at(2)].includes(e);
    {
      const accessors: [string, () => unknown][] = [
        ["polygon", () => e.polygon],
        ["localNormal", () => e.localNormal],
        ["worldNormal", () => e.worldNormal],
        ["length", () => e.length],
        ["localProjection", () => e.localProjection],
        ["worldProjection", () => e.worldProjection],
        ["localVertex1", () => e.localVertex1],
        ["localVertex2", () => e.localVertex2],
        ["worldVertex1", () => e.worldVertex1],
        ["worldVertex2", () => e.worldVertex2],
      ];
      for (const [, fn] of accessors) expect(fn).toThrow("Edge not current in use");
      expect(e.toString()).toBe("Edge(object-pooled)");
    }
    expect(stale).toBe(false);
  });

  it("worldProjection requires a body; world values follow the body", () => {
    const p = new Polygon(Polygon.box(10, 10));
    const e = p.edges.at(0);
    expect(() => e.worldProjection).toThrow("Edge world projection only makes sense");
    expect(e.toString()).toContain("localNormal");
    const b = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    b.shapes.add(p);
    const lp = e.localProjection;
    const n = e.localNormal;
    // translated along x by 100 → world projection shifts by 100 * n.x
    expect(e.worldProjection).toBeCloseTo(lp + 100 * n.x, 10);
    expect(e.worldVertex1.x).toBeCloseTo(e.localVertex1.x + 100, 10);
    expect(e.toString()).toContain("worldNormal");
  });
});

// ---------------------------------------------------------------------------
// Interactor
// ---------------------------------------------------------------------------

describe("Interactor._wrap / casts", () => {
  it("dispatches to the concrete wrapper for bodies, shapes and compounds", () => {
    const b = ball(0, 0);
    const s = b.shapes.at(0);
    const c = new Compound();
    expect(Interactor._wrap(null as Any)).toBeNull();
    expect(Interactor._wrap(b as Any)).toBe(b);
    expect(Interactor._wrap((b as Any).zpp_inner)).toBe(b);
    expect(Interactor._wrap((s as Any).zpp_inner)).toBe(s);
    expect(Interactor._wrap((c as Any).zpp_inner)).toBe(c);
  });

  it("falls back to a generic wrapper for unknown interactors", () => {
    const raw: Any = { zpp_inner_i: { id: 42, ibody: null, ishape: null, icompound: null } };
    const i = Interactor._wrap(raw);
    expect(i).toBeInstanceOf(Interactor);
    expect(i.id).toBe(42);
    expect(i.isBody() || i.isShape() || i.isCompound()).toBe(false);
    expect(i.castBody).toBeNull();
    expect(i.castShape).toBeNull();
    expect(i.castCompound).toBeNull();
    // same raw → same wrapper
    expect(Interactor._wrap(raw)).toBe(i);
  });

  it("casts and group round-trip", () => {
    const b = ball(0, 0);
    const s = b.shapes.at(0);
    const c = new Compound();
    expect(s.castShape).toBe(s);
    expect(s.castBody).toBeNull();
    expect(b.castBody).toBe(b);
    expect(c.castCompound).toBe(c);
    expect(c.castBody).toBeNull();
    expect(b.group).toBeNull();
  });
});
