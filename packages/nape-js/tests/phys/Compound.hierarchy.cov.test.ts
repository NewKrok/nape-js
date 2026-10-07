/**
 * Compound tree bookkeeping that the basic Compound tests don't reach:
 *
 * - breakApart() of a NESTED compound hands its bodies, constraints and
 *   sub-compounds to the parent compound (in and out of a space)
 * - re-parenting a constraint / compound that already belongs to another
 *   compound or directly to a space (the list adders must detach it first)
 * - Compound.copy() of a nested tree: same shape, constraints re-targeted at
 *   the copied bodies
 * - Body.copy() of a body whose cached mass / inertia / axis / AABB / COM
 *   are already validated
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

function ball(x: number): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
  b.shapes.add(new Circle(5));
  return b;
}

/** parent ⊃ child ⊃ { a, b, joint(a,b), grandchild ⊃ { g } } */
function tree() {
  const parent = new Compound();
  const child = new Compound();
  child.compound = parent;
  const a = ball(0);
  const b = ball(20);
  a.compound = child;
  b.compound = child;
  const joint = new PivotJoint(a, b, new Vec2(10, 0), new Vec2(-10, 0));
  joint.compound = child;
  const grandchild = new Compound();
  grandchild.compound = child;
  const g = ball(40);
  g.compound = grandchild;
  return { parent, child, grandchild, a, b, g, joint };
}

describe("Compound.breakApart — nested", () => {
  for (const inSpace of [false, true]) {
    it(`moves every member of a nested compound up to its parent (${inSpace ? "in" : "out of"} a space)`, () => {
      const t = tree();
      const space = new Space(new Vec2(0, 100));
      if (inSpace) t.parent.space = space;

      t.child.breakApart();

      expect(t.parent.compounds.has(t.child)).toBe(false);
      expect(t.child.compound).toBeNull();
      expect(t.a.compound).toBe(t.parent);
      expect(t.b.compound).toBe(t.parent);
      expect(t.joint.compound).toBe(t.parent);
      expect(t.grandchild.compound).toBe(t.parent);
      expect(t.parent.bodies.length).toBe(2);
      expect(t.parent.constraints.length).toBe(1);
      expect(t.parent.compounds.length).toBe(1);
      expect(t.child.bodies.length + t.child.constraints.length + t.child.compounds.length).toBe(0);
      // Ownership changed, space membership didn't.
      const want = inSpace ? space : null;
      for (const x of [t.a, t.b, t.g, t.joint, t.grandchild]) expect(x.space).toBe(want);
      expect(t.child.space).toBeNull();

      if (inSpace) {
        // The re-parented joint is still live: kick b away, the pivot (anchors
        // ±10) keeps the pair 20 apart.
        t.b.velocity = new Vec2(200, 0);
        for (let i = 0; i < 60; i++) space.step(1 / 60);
        const gap = Vec2.distance(t.a.position, t.b.position);
        expect(gap).toBeCloseTo(20, 0);
      }
    });
  }
});

describe("Compound list adders — re-parenting", () => {
  it("moves a constraint from one compound to another", () => {
    const space = new Space();
    const from = new Compound();
    const to = new Compound();
    const a = ball(0);
    const b = ball(20);
    a.compound = from;
    b.compound = from;
    const joint = new PivotJoint(a, b, new Vec2(10, 0), new Vec2(-10, 0));
    joint.compound = from;
    from.space = space;
    to.space = space;

    joint.compound = to;
    expect(from.constraints.has(joint)).toBe(false);
    expect(to.constraints.has(joint)).toBe(true);
    expect(joint.space).toBe(space);
    // Re-adding to the current owner is a no-op.
    to.constraints.add(joint);
    expect(to.constraints.length).toBe(1);
  });

  it("moves a space-level constraint into a compound", () => {
    const space = new Space();
    const a = ball(0);
    const b = ball(20);
    a.space = space;
    b.space = space;
    const joint = new PivotJoint(a, b, new Vec2(10, 0), new Vec2(-10, 0));
    joint.space = space;
    const owner = new Compound();
    owner.space = space;

    owner.constraints.add(joint);
    expect(joint.compound).toBe(owner);
    expect(space.constraints.has(joint)).toBe(false);
    expect(joint.space).toBe(space);
    space.step(1 / 60);
    expect(joint.active).toBe(true);
  });

  it("moves a compound from one compound to another and from the space into a compound", () => {
    const space = new Space();
    const from = new Compound();
    const to = new Compound();
    const moving = new Compound();
    const m = ball(0);
    m.compound = moving;
    moving.compound = from;
    from.space = space;
    to.space = space;

    moving.compound = to;
    expect(from.compounds.has(moving)).toBe(false);
    expect(to.compounds.has(moving)).toBe(true);
    expect(m.space).toBe(space);

    const loose = new Compound();
    ball(50).compound = loose;
    loose.space = space;
    to.compounds.add(loose);
    expect(loose.compound).toBe(to);
    expect(space.compounds.has(loose)).toBe(false);
    expect(loose.space).toBe(space);
    // Already owned: no-op.
    expect(to.compounds.add(loose)).toBe(false);
  });

  it("refuses a re-parent that would create a cycle", () => {
    const t = tree();
    expect(() => {
      t.parent.compound = t.grandchild;
    }).toThrow(/cycle in the Compound tree/);
  });
});

describe("Compound.copy — nested tree", () => {
  it("copies the hierarchy and re-targets constraints at the copied bodies", () => {
    const t = tree();
    const copy = t.parent.copy();

    expect(copy.compounds.length).toBe(1);
    const child = copy.compounds.at(0);
    expect(child).not.toBe(t.child);
    expect(child.compound).toBe(copy);
    expect(child.bodies.length).toBe(2);
    expect(child.constraints.length).toBe(1);
    expect(child.compounds.length).toBe(1);
    const grand = child.compounds.at(0);
    expect(grand.compound).toBe(child);
    expect(grand.bodies.length).toBe(1);
    expect(grand.bodies.at(0).position.x).toBe(40);

    const joint = child.constraints.at(0) as PivotJoint;
    const copied = [child.bodies.at(0), child.bodies.at(1)];
    expect(copied).toContain(joint.body1);
    expect(copied).toContain(joint.body2);
    expect([t.a, t.b]).not.toContain(joint.body1);
    // The originals are untouched.
    expect(t.child.compound).toBe(t.parent);
    expect(t.joint.body1).toBe(t.a);
  });
});

describe("Body.copy — validated caches", () => {
  it("a copy taken after stepping matches mass, inertia, rotation, AABB and COM", () => {
    const space = new Space(new Vec2(0, 0));
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    const shape = new Polygon(Polygon.box(40, 10));
    shape.localCOM = new Vec2(3, 1);
    body.shapes.add(shape);
    body.angularVel = 2;
    body.space = space;
    for (let i = 0; i < 10; i++) space.step(1 / 60);
    // Force every lazily-computed cache to be valid before copying.
    const mass = body.mass;
    const inertia = body.inertia;
    const bounds = body.bounds.copy();
    const com = body.localCOM.copy();
    const worldCOM = body.worldCOM.copy();

    const c = body.copy();
    expect(c.mass).toBeCloseTo(mass, 10);
    expect(c.inertia).toBeCloseTo(inertia, 10);
    expect(c.rotation).toBeCloseTo(body.rotation, 12);
    expect(c.localCOM.x).toBeCloseTo(com.x, 10);
    expect(c.localCOM.y).toBeCloseTo(com.y, 10);
    expect(c.worldCOM.x).toBeCloseTo(worldCOM.x, 10);
    expect(c.worldCOM.y).toBeCloseTo(worldCOM.y, 10);
    expect(c.bounds.min.x).toBeCloseTo(bounds.min.x, 10);
    expect(c.bounds.max.y).toBeCloseTo(bounds.max.y, 10);
    // And the copy simulates identically from here.
    const s2 = new Space(new Vec2(0, 0));
    c.space = s2;
    for (let i = 0; i < 30; i++) {
      space.step(1 / 60);
      s2.step(1 / 60);
    }
    expect(c.position.x).toBeCloseTo(body.position.x, 9);
    expect(c.rotation).toBeCloseTo(body.rotation, 9);
  });
});
