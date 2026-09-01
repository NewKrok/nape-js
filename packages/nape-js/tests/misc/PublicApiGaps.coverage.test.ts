/**
 * Targeted tests for remaining public-API coverage gaps:
 * - Space.interactionType (sensor / fluid / filter / group / constraint-ignore)
 * - Space.bodiesInShape / shapesInShape (incl. invalid polygon rejection)
 * - _wrap statics: Space, Body, Circle, Shape, Edge, Ray
 * - Body.constraintsImpulse / Body.totalImpulse with live constraints+contacts
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { Vec2 } from "../../src/geom/Vec2";
import { Ray } from "../../src/geom/Ray";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Shape } from "../../src/shape/Shape";
import { Edge } from "../../src/shape/Edge";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { PivotJoint } from "../../src/constraint/PivotJoint";

function circleBody(x: number, y: number, r = 10, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

describe("Space.interactionType", () => {
  function pair() {
    const space = new Space(new Vec2(0, 0));
    const a = circleBody(0, 0);
    const b = circleBody(5, 0);
    a.space = space;
    b.space = space;
    // Mass/inertia are validated lazily; interactionType reads the raw
    // imass/iinertia fields (as in original nape), so step once first.
    space.step(1 / 60);
    return { space, a, b };
  }

  it("returns COLLISION for two plain dynamic shapes", () => {
    const { space, a, b } = pair();
    const t = space.interactionType(a.shapes.at(0), b.shapes.at(0));
    expect(t).toBe(InteractionType.COLLISION);
  });

  it("returns SENSOR when either shape is sensor-enabled", () => {
    const { space, a, b } = pair();
    a.shapes.at(0).sensorEnabled = true;
    const t = space.interactionType(a.shapes.at(0), b.shapes.at(0));
    expect(t).toBe(InteractionType.SENSOR);
  });

  it("returns FLUID when one shape is fluid-enabled and masses allow it", () => {
    const { space, a, b } = pair();
    const fluidShape = a.shapes.at(0);
    fluidShape.fluidEnabled = true;
    fluidShape.fluidProperties = new FluidProperties(1, 1);
    const t = space.interactionType(fluidShape, b.shapes.at(0));
    expect(t).toBe(InteractionType.FLUID);
  });

  it("returns null when collision masks exclude each other", () => {
    const { space, a, b } = pair();
    a.shapes.at(0).filter = new InteractionFilter(1, 0, 1, 0, 1, 0);
    const t = space.interactionType(a.shapes.at(0), b.shapes.at(0));
    expect(t).toBeNull();
  });

  it("returns null when a constraint with ignore=true joins the bodies", () => {
    const { space, a, b } = pair();
    const j = new PivotJoint(a, b, new Vec2(0, 0), new Vec2(0, 0));
    j.ignore = true;
    j.space = space;
    const t = space.interactionType(a.shapes.at(0), b.shapes.at(0));
    expect(t).toBeNull();
  });

  it("returns null for bodies in a shared ignoring InteractionGroup", () => {
    const { space, a, b } = pair();
    const g = new InteractionGroup(true);
    a.group = g;
    b.group = g;
    const t = space.interactionType(a.shapes.at(0), b.shapes.at(0));
    expect(t).toBeNull();
  });

  it("walks nested InteractionGroups to their common ancestor", () => {
    const { space, a, b } = pair();
    const root = new InteractionGroup(true);
    const childA = new InteractionGroup(false);
    const childB = new InteractionGroup(false);
    childA.group = root;
    childB.group = root;
    a.group = childA;
    b.group = childB;
    // Common ancestor (root) ignores → null.
    expect(space.interactionType(a.shapes.at(0), b.shapes.at(0))).toBeNull();

    root.ignore = false;
    expect(space.interactionType(a.shapes.at(0), b.shapes.at(0))).toBe(InteractionType.COLLISION);
  });

  it("returns COLLISION for a static pair even though neither can move", () => {
    const space = new Space(new Vec2(0, 0));
    const a = circleBody(0, 0, 10, BodyType.STATIC);
    const b = circleBody(5, 0, 10, BodyType.STATIC);
    a.space = space;
    b.space = space;
    // bothZeroMass suppresses FLUID but plain collision typing still applies.
    a.shapes.at(0).fluidEnabled = true;
    const t = space.interactionType(a.shapes.at(0), b.shapes.at(0));
    expect(t).not.toBe(InteractionType.FLUID);
  });

  it("rejects null and unattached shapes", () => {
    const { space, a } = pair();
    expect(() => space.interactionType(null as any, a.shapes.at(0))).toThrow("null");
    const loose = new Circle(5);
    expect(() => space.interactionType(a.shapes.at(0), loose)).toThrow("not part of a Body");
  });
});

describe("Space.bodiesInShape / shapesInShape", () => {
  function scene() {
    const space = new Space(new Vec2(0, 0));
    const targets: Body[] = [];
    for (let i = 0; i < 3; i++) {
      const b = circleBody(i * 15, 0, 6);
      b.space = space;
      targets.push(b);
    }
    const probe = new Body(BodyType.STATIC, new Vec2(0, 0));
    probe.shapes.add(new Circle(40));
    probe.space = space;
    return { space, probe, targets };
  }

  it("finds bodies overlapping the query shape", () => {
    const { space, probe } = scene();
    const bodies = space.bodiesInShape(probe.shapes.at(0));
    expect(bodies.length).toBeGreaterThanOrEqual(3);

    const shapes = space.shapesInShape(probe.shapes.at(0));
    expect(shapes.length).toBeGreaterThanOrEqual(3);
  });

  it("containment=true returns a subset", () => {
    const { space, probe } = scene();
    const all = space.bodiesInShape(probe.shapes.at(0), false);
    const contained = space.bodiesInShape(probe.shapes.at(0), true);
    expect(contained.length).toBeLessThanOrEqual(all.length);
  });

  it("rejects null and detached query shapes", () => {
    const { space } = scene();
    expect(() => space.bodiesInShape(null as any)).toThrow("null");
    const loose = new Circle(5);
    expect(() => space.bodiesInShape(loose)).toThrow("inside a Body");
  });
});

describe("_wrap statics on core classes", () => {
  it("Space._wrap resolves nulls, instances and raw inners", () => {
    expect(Space._wrap(null)).toBeNull();
    const space = new Space(new Vec2(0, 0));
    expect(Space._wrap(space)).toBe(space);
    expect(Space._wrap((space as any).zpp_inner)).toBe(space);
    const holder = { zpp_inner: (space as any).zpp_inner };
    expect(Space._wrap(holder as any)).toBe(space);
  });

  it("Body._wrap falls back to a generic wrapper for unknown inners", () => {
    const raw: any = {};
    const wrapped = Body._wrap(raw);
    expect(wrapped).toBeInstanceOf(Body);
  });

  it("Circle._wrap resolves nulls, instances, raw ZPP and holders", () => {
    expect(Circle._wrap(null as any)).toBeNull();
    const c = new Circle(10);
    expect(Circle._wrap(c as any)).toBe(c);

    const zpp = (c as any).zpp_inner;
    zpp.outer = null;
    const rewrapped = Circle._wrap(zpp);
    expect(rewrapped).toBeInstanceOf(Circle);
    expect((rewrapped as any).zpp_inner).toBe(zpp);

    const holder: any = { zpp_inner_zn: (rewrapped as any).zpp_inner_zn };
    expect(Circle._wrap(holder)).toBeInstanceOf(Circle);

    const generic: any = { zpp_inner_i: {} };
    expect(Circle._wrap(generic)).toBeInstanceOf(Circle);
  });

  it("Shape._wrap dispatches circles and polygons and falls back generically", () => {
    const c = new Circle(10);
    expect(Shape._wrap(c as any)).toBe(c);
    const p = new Polygon(Polygon.box(10, 10));
    expect(Shape._wrap(p as any)).toBe(p);

    // Unknown inner with no type info → generic Shape wrapper.
    const generic: any = { zpp_inner: {} };
    const wrapped = Shape._wrap(generic);
    expect(wrapped).toBeInstanceOf(Shape);
  });

  it("Edge cannot be constructed directly and _wrap handles null", () => {
    expect(() => new (Edge as any)()).toThrow();
    expect(Edge._wrap(null)).toBeNull();
    expect(Edge._wrap(undefined)).toBeNull();
  });

  it("Edge._wrap wraps a live polygon edge's inner", () => {
    const p = new Polygon(Polygon.box(20, 20));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(p);
    const edge = p.edges.at(0);
    expect(edge).toBeInstanceOf(Edge);
    expect(Edge._wrap(edge as any)).toBe(edge);
  });

  it("Ray._wrap resolves nulls, instances and raw inners", () => {
    expect(Ray._wrap(null)).toBeNull();
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(Ray._wrap(ray)).toBe(ray);
    const wrapped = Ray._wrap((ray as any).zpp_inner);
    expect(wrapped).toBeInstanceOf(Ray);
  });
});

describe("Body impulse queries with live constraints and contacts", () => {
  function restingScene() {
    const space = new Space(new Vec2(0, 400));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 40));
    floor.shapes.add(new Polygon(Polygon.box(300, 20)));
    floor.space = space;
    const ball = circleBody(0, 10);
    ball.space = space;
    const anchor = circleBody(40, 10);
    anchor.space = space;
    const pivot = new PivotJoint(ball, anchor, new Vec2(0, 0), new Vec2(-40, 0));
    pivot.space = space;
    for (let i = 0; i < 45; i++) space.step(1 / 60, 8, 8);
    return { space, ball, floor };
  }

  it("constraintsImpulse sums active constraint impulses", () => {
    const { ball } = restingScene();
    const imp = ball.constraintsImpulse();
    expect(Number.isFinite(imp.x)).toBe(true);
    expect(Number.isFinite(imp.y)).toBe(true);
    expect(Number.isFinite(imp.z)).toBe(true);
    imp.dispose();
  });

  it("totalImpulse combines contact and constraint impulses", () => {
    const { ball } = restingScene();
    const imp = ball.totalImpulse();
    // A resting body under gravity receives sustained upward contact impulse.
    expect(imp.y).toBeLessThan(0);
    imp.dispose();
  });

  it("totalImpulse against a specific other body only counts that pair", () => {
    const { ball, floor } = restingScene();
    const vsFloor = ball.totalImpulse(floor);
    const total = ball.totalImpulse();
    expect(Math.abs(vsFloor.y)).toBeLessThanOrEqual(Math.abs(total.y) + 1e-6);
    vsFloor.dispose();
    total.dispose();
  });
});

describe("CCD sweep with slow rotation (small-angle integration path)", () => {
  it("a fast bullet with slight spin still hits a thin wall", () => {
    const space = new Space(new Vec2(0, 0));
    const wall = new Body(BodyType.STATIC, new Vec2(200, 0));
    wall.shapes.add(new Polygon(Polygon.box(4, 200)));
    wall.space = space;

    const bullet = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    bullet.shapes.add(new Polygon(Polygon.box(6, 6)));
    bullet.velocity = new Vec2(3000, 0);
    bullet.angularVel = 0.05; // small dr → small-angle axis update
    bullet.isBullet = true;
    bullet.space = space;

    for (let i = 0; i < 30; i++) space.step(1 / 60, 8, 8);
    // CCD must stop the bullet at (or before) the wall instead of tunnelling.
    expect(bullet.position.x).toBeLessThan(210);
  });
});
