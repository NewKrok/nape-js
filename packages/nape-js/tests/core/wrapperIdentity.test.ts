/**
 * Wrapper identity: re-wrapping a ZPP object whose public wrapper was built
 * with `new` must return that same wrapper, never a second one.
 *
 * Regression: the wrapper cache only knew about wrappers it had created
 * itself, so `Body._wrap(body.zpp_inner)` for a body constructed by the user
 * produced a duplicate Body and re-pointed `zpp.outer` at it. Every
 * constraint's `body1` / `body2` getter goes through that path.
 */
import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Material } from "../../src/phys/Material";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { Shape } from "../../src/shape/Shape";
import { Vec2 } from "../../src/geom/Vec2";
import { Vec3 } from "../../src/geom/Vec3";
import { AABB } from "../../src/geom/AABB";
import { Mat23 } from "../../src/geom/Mat23";
import { MatMN } from "../../src/geom/MatMN";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";
import { CbType } from "../../src/callbacks/CbType";
import { OptionType } from "../../src/callbacks/OptionType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { Listener } from "../../src/callbacks/Listener";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { SpringJoint } from "../../src/constraint/SpringJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import { Constraint } from "../../src/constraint/Constraint";
import { getOrCreate } from "../../src/core/cache";
import "../../src/index";

function body(x = 0): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
  b.shapes.add(new Circle(10));
  return b;
}

describe("getOrCreate honours an existing outer", () => {
  it("returns zpp.outer instead of minting a new wrapper", () => {
    const outer = { tag: "wrapper" };
    const zpp = { outer };
    let created = 0;
    const w = getOrCreate(zpp, () => {
      created++;
      return { tag: "duplicate" };
    });
    expect(w).toBe(outer);
    expect(created).toBe(0);
    expect(getOrCreate(zpp, () => ({ tag: "again" }))).toBe(outer);
  });

  it("still creates and caches a wrapper when there is no outer", () => {
    const zpp: { outer?: unknown } = {};
    const w = getOrCreate(zpp, () => ({ tag: "fresh" }));
    expect(getOrCreate(zpp, () => ({ tag: "other" }))).toBe(w);
  });
});

describe("constraint body getters return the user's Body instances", () => {
  const b1 = body(0);
  const b2 = body(50);
  const b3 = body(100);
  const b4 = body(150);

  const joints: [string, Constraint & { body1: Body | null; body2: Body | null }][] = [
    ["PivotJoint", new PivotJoint(b1, b2, new Vec2(), new Vec2())],
    ["DistanceJoint", new DistanceJoint(b1, b2, new Vec2(), new Vec2(), 0, 100)],
    ["WeldJoint", new WeldJoint(b1, b2, new Vec2(), new Vec2())],
    ["LineJoint", new LineJoint(b1, b2, new Vec2(), new Vec2(), new Vec2(1, 0), -1, 1)],
    ["AngleJoint", new AngleJoint(b1, b2, -1, 1)],
    ["MotorJoint", new MotorJoint(b1, b2)],
    ["SpringJoint", new SpringJoint(b1, b2, new Vec2(), new Vec2(), 10)],
  ];

  it.each(joints)("%s.body1/body2 are identical to the constructor arguments", (_n, j) => {
    expect(j.body1).toBe(b1);
    expect(j.body2).toBe(b2);
    // The ZPP back-pointer still names the original wrapper.
    expect(b1.zpp_inner.outer).toBe(b1);
    expect(b2.zpp_inner.outer).toBe(b2);
  });

  it.each(joints)("%s keeps identity after reassignment", (_n, j) => {
    j.body2 = b3;
    expect(j.body2).toBe(b3);
    expect(b3.zpp_inner.outer).toBe(b3);
    j.body2 = b2;
  });

  it("PulleyJoint exposes all four bodies by identity", () => {
    const p = new PulleyJoint(
      b1,
      b2,
      b3,
      b4,
      new Vec2(),
      new Vec2(),
      new Vec2(),
      new Vec2(),
      0,
      100,
    );
    expect([p.body1, p.body2, p.body3, p.body4]).toEqual([b1, b2, b3, b4]);
  });

  it("bodies fetched back from a Space are the same instances", () => {
    const space = new Space();
    const a = body(0);
    const joint = new PivotJoint(a, body(10), new Vec2(), new Vec2());
    space.bodies.add(a);
    space.bodies.add(joint.body2!);
    space.constraints.add(joint);
    space.step(1 / 60);
    const fromSpace = [...(space.bodies as Iterable<Body>)];
    expect(fromSpace).toContain(a);
    expect(fromSpace.find((b) => b === joint.body2)).toBe(joint.body2);
    expect(joint.body1).toBe(a);
    expect([...(space.constraints as Iterable<Constraint>)]).toContain(joint);
  });
});

describe("_wrap(zpp) on user-constructed wrappers", () => {
  it("Body / Compound / Space", () => {
    const b = body();
    expect(Body._wrap(b.zpp_inner)).toBe(b);
    const c = new Compound();
    expect(Compound._wrap(c.zpp_inner)).toBe(c);
    const s = new Space();
    expect(Space._wrap(s.zpp_inner)).toBe(s);
  });

  it("shapes", () => {
    const circle = new Circle(5);
    const poly = new Polygon(Polygon.box(10, 10));
    const capsule = new Capsule(10, 4);
    expect(Circle._wrap(circle.zpp_inner)).toBe(circle);
    expect(Shape._wrap(circle.zpp_inner)).toBe(circle);
    expect(Polygon._wrap(poly.zpp_inner)).toBe(poly);
    expect(Shape._wrap(poly.zpp_inner)).toBe(poly);
    expect(Capsule._wrap(capsule.zpp_inner)).toBe(capsule);
    expect(Shape._wrap(capsule.zpp_inner)).toBe(capsule);
  });

  it("geometry values", () => {
    const v2 = new Vec2(1, 2);
    const v3 = new Vec3(1, 2, 3);
    const aabb = new AABB(0, 0, 10, 10);
    const m23 = new Mat23();
    const mmn = new MatMN(2, 2);
    expect(Vec2._wrap(v2.zpp_inner)).toBe(v2);
    expect(Vec3._wrap(v3.zpp_inner)).toBe(v3);
    expect(AABB._wrap(aabb.zpp_inner)).toBe(aabb);
    expect(Mat23._wrap(m23.zpp_inner)).toBe(m23);
    expect(MatMN._wrap(mmn.zpp_inner)).toBe(mmn);
  });

  it("materials, filters, groups, fluid properties", () => {
    const m = new Material(0.5);
    const f = new InteractionFilter(1, 2);
    const g = new InteractionGroup(true);
    const fp = new FluidProperties(2, 3);
    expect(Material._wrap(m.zpp_inner)).toBe(m);
    expect(InteractionFilter._wrap(f.zpp_inner)).toBe(f);
    expect(InteractionGroup._wrap(g.zpp_inner)).toBe(g);
    expect(FluidProperties._wrap(fp.zpp_inner)).toBe(fp);
  });

  it("callback types and listeners", () => {
    const cb = new CbType();
    const opt = new OptionType(cb);
    const listener = new BodyListener(CbEvent.WAKE, cb, () => {});
    expect(CbType._wrap(cb.zpp_inner)).toBe(cb);
    expect(OptionType._wrap(opt.zpp_inner)).toBe(opt);
    expect(Listener._wrap(listener.zpp_inner)).toBe(listener);
  });

  it("constraints", () => {
    const j = new PivotJoint(body(), body(), new Vec2(), new Vec2());
    expect(PivotJoint._wrap(j.zpp_inner)).toBe(j);
    expect(Constraint._wrap(j.zpp_inner)).toBe(j);
  });
});
