/**
 * Space odds and ends: userData, broadphase selection, visitors that recurse
 * into compounds, weak-Vec2 queries and query argument validation.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Broadphase } from "../../src/space/Broadphase";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Vec2 } from "../../src/geom/Vec2";
import { AABB } from "../../src/geom/AABB";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import type { Constraint } from "../../src/constraint/Constraint";
import "../../src/index";

function ball(x: number, y = 0, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

describe("Space.userData and broadphase selection", () => {
  it("userData is lazily created and persists", () => {
    const space = new Space();
    const data = space.userData;
    expect(data).toEqual({});
    data.level = 3;
    expect(space.userData.level).toBe(3);
    expect(space.userData).toBe(data);
  });

  it("reports the broadphase it was constructed with", () => {
    expect(new Space().broadphase).toBe(Broadphase.DYNAMIC_AABB_TREE);
    expect(new Space(new Vec2(), Broadphase.SWEEP_AND_PRUNE).broadphase).toBe(
      Broadphase.SWEEP_AND_PRUNE,
    );
    expect(new Space(new Vec2(), Broadphase.SPATIAL_HASH).broadphase).toBe(Broadphase.SPATIAL_HASH);
  });

  it("gravity setter consumes a weak Vec2", () => {
    const space = new Space();
    const g = Vec2.weak(0, 9.8);
    space.gravity = g;
    expect(g.zpp_disp).toBe(true);
    expect(space.gravity.y).toBeCloseTo(9.8, 6);
  });
});

describe("Space visitors recurse into compounds", () => {
  function scene() {
    const space = new Space();
    const loose = ball(0);
    space.bodies.add(loose);

    const outer = new Compound();
    const inner = new Compound();
    const b1 = ball(100);
    const b2 = ball(200);
    const b3 = ball(300);
    outer.bodies.add(b1);
    inner.bodies.add(b2);
    inner.bodies.add(b3);
    inner.compound = outer;
    const j1 = new PivotJoint(b1, b2, new Vec2(), new Vec2());
    const j2 = new PivotJoint(b2, b3, new Vec2(), new Vec2());
    outer.constraints.add(j1);
    inner.constraints.add(j2);
    space.compounds.add(outer);
    return { space, loose, outer, inner, bodies: [loose, b1, b2, b3], joints: [j1, j2] };
  }

  it("visitBodies sees loose bodies and bodies nested in compounds", () => {
    const { space, bodies } = scene();
    const seen: Body[] = [];
    space.visitBodies((b) => seen.push(b));
    expect(seen).toHaveLength(4);
    for (const b of bodies) expect(seen).toContain(b);
  });

  it("visitConstraints descends into nested compounds", () => {
    const { space, joints } = scene();
    const seen: Constraint[] = [];
    space.visitConstraints((c) => seen.push(c));
    expect(seen).toHaveLength(2);
    for (const j of joints) expect(seen).toContain(j);
  });

  it("visitCompounds reaches nested compounds", () => {
    const { space, outer, inner } = scene();
    const seen: Compound[] = [];
    space.visitCompounds((c) => seen.push(c));
    expect(seen).toContain(outer);
    expect(seen).toContain(inner);
  });

  it("visitors reject a null callback", () => {
    const space = new Space();
    expect(() => space.visitBodies(null as unknown as (b: Body) => void)).toThrow();
    expect(() => space.visitConstraints(null as unknown as (c: Constraint) => void)).toThrow();
    expect(() => space.visitCompounds(null as unknown as (c: Compound) => void)).toThrow();
  });
});

describe("point / area queries", () => {
  function scene() {
    const space = new Space();
    const a = ball(0, 0, 10);
    const b = ball(100, 0, 10);
    space.bodies.add(a);
    space.bodies.add(b);
    space.step(1 / 60);
    return { space, a, b };
  }

  it("bodiesUnderPoint / shapesUnderPoint consume weak points", () => {
    const { space, a } = scene();
    const p1 = Vec2.weak(1, 1);
    const bodies = space.bodiesUnderPoint(p1);
    expect(p1.zpp_disp).toBe(true);
    expect(bodies.length).toBe(1);
    expect(bodies.at(0)).toBe(a);

    const p2 = Vec2.weak(1, 1);
    const shapes = space.shapesUnderPoint(p2);
    expect(p2.zpp_disp).toBe(true);
    expect(shapes.length).toBe(1);
    expect(shapes.at(0)).toBe(a.shapes.at(0));

    expect(space.bodiesUnderPoint(new Vec2(50, 50)).length).toBe(0);
  });

  it("shapesInCircle / bodiesInCircle consume a weak centre", () => {
    const { space, a, b } = scene();
    const c1 = Vec2.weak(0, 0);
    const shapes = space.shapesInCircle(c1, 15);
    expect(c1.zpp_disp).toBe(true);
    expect(shapes.length).toBe(1);

    const c2 = Vec2.weak(50, 0);
    const both = space.bodiesInCircle(c2, 60);
    expect(c2.zpp_disp).toBe(true);
    expect(both.length).toBe(2);
    expect(both.has(a)).toBe(true);
    expect(both.has(b)).toBe(true);

    // containment requires the whole body inside the circle
    expect(space.bodiesInCircle(new Vec2(50, 0), 55, true).length).toBe(0);
    expect(space.bodiesInCircle(new Vec2(50, 0), 61, true).length).toBe(2);
  });

  it("AABB queries reject a degenerate box and honour containment", () => {
    const { space, a } = scene();
    expect(() => space.shapesInAABB(new AABB(0, 0, 0, 10))).toThrow(/degenerate/);
    expect(() => space.bodiesInAABB(new AABB(0, 0, 10, 0))).toThrow(/degenerate/);

    const loose = space.bodiesInAABB(new AABB(-5, -5, 10, 10));
    expect(loose.length).toBe(1);
    expect(loose.at(0)).toBe(a);
    // Containment: the 20px ball does not fit in a 10px box …
    expect(space.bodiesInAABB(new AABB(-5, -5, 10, 10), true).length).toBe(0);
    // … but fits a 30px box.
    expect(space.shapesInAABB(new AABB(-15, -15, 30, 30), true).length).toBe(1);
  });

  it("shapesInBody / bodiesInBody find overlapping shapes and bodies", () => {
    const { space, a } = scene();
    const probe = ball(5, 0, 10);
    space.bodies.add(probe);
    space.step(1 / 60);
    const shapes = space.shapesInBody(probe);
    expect(shapes.has(a.shapes.at(0))).toBe(true);
    const bodies = space.bodiesInBody(probe);
    expect(bodies.has(a)).toBe(true);
    // The far-away ball is never reported.
    expect(bodies.length).toBeLessThanOrEqual(2);
  });
});

describe("convexCast validation", () => {
  it("rejects shapes without a body and invalid polygon query shapes", () => {
    const space = new Space();
    space.bodies.add(ball(200));

    const loose = new Circle(5);
    expect(() => space.convexCast(loose, 1)).toThrow(/body/i);

    // A concave polygon is not a valid convex cast shape.
    const bad = new Polygon([
      new Vec2(0, 0),
      new Vec2(20, 0),
      new Vec2(20, 10),
      new Vec2(10, 10),
      new Vec2(10, 20),
      new Vec2(0, 20),
    ]);
    const carrier = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    carrier.shapes.add(bad);
    carrier.velocity = new Vec2(100, 0);
    expect(() => space.shapesInShape(bad)).toThrow(/invalid/);
    expect(() => space.bodiesInShape(bad)).toThrow(/invalid/);
    // A convex query shape is fine and finds nothing near the origin.
    const good = new Polygon(Polygon.box(10, 10));
    carrier.shapes.add(good);
    expect(space.shapesInShape(good).length).toBe(0);
    expect(space.bodiesInShape(good).length).toBe(0);
    expect(() => space.shapesInShape(new Circle(1))).toThrow(/Body/);
  });

  it("sweeps a valid polygon into the first hit", () => {
    const space = new Space();
    const target = ball(200);
    space.bodies.add(target);

    const box = new Polygon(Polygon.box(10, 10));
    const carrier = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    carrier.shapes.add(box);
    carrier.velocity = new Vec2(1000, 0);
    const hit = space.convexCast(box, 1);
    expect(hit).not.toBeNull();
    expect(hit!.shape).toBe(target.shapes.at(0));
    expect(hit!.toi).toBeGreaterThan(0);
    expect(hit!.toi).toBeLessThan(1);
    hit!.dispose();
  });
});
