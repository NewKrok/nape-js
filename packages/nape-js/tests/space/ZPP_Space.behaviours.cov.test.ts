/**
 * ZPP_Space behaviours the existing suites never drive, each checked by its
 * observable outcome:
 *
 * - waking a sleeping KINEMATIC body (gravity change, velocity change)
 * - removing a compound that owns constraints
 * - a breakable joint inside a compound breaking under force / error
 * - constraint listeners filtering by event (WAKE vs BREAK)
 * - InteractionGroups attached to (nested) compounds
 * - Body.disableCCD letting a fast body tunnel where CCD would stop it
 * - fluid buoyancy using a per-fluid gravity override, and fluid-vs-fluid
 *   overlaps where either side is the denser one
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
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";

const DT = 1 / 60;

function settle(space: Space, steps = 600): void {
  for (let i = 0; i < steps; i++) space.step(DT);
}

function box(space: Space | null, x: number, y: number, w = 20, h = 20, type = BodyType.DYNAMIC) {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(w, h)));
  if (space) b.space = space;
  return b;
}

describe("sleeping kinematic bodies", () => {
  it("a gravity change wakes a resting kinematic body, which falls asleep again", () => {
    const space = new Space(new Vec2(0, 100));
    const k = box(space, 0, 0, 40, 10, BodyType.KINEMATIC);
    settle(space, 120);
    expect(k.isSleeping).toBe(true);
    space.gravity = new Vec2(0, 200);
    expect(k.isSleeping).toBe(false);
    settle(space, 120);
    expect(k.isSleeping).toBe(true);
    // Still a kinematic: gravity never moved it.
    expect(k.position.y).toBe(0);
  });

  it("waking a compound wakes its sleeping kinematic member", () => {
    const space = new Space(new Vec2(0, 0));
    const c = new Compound();
    const k = box(null, 0, 0, 40, 10, BodyType.KINEMATIC);
    k.compound = c;
    const d = box(null, 100, 0);
    d.compound = c;
    c.space = space;
    settle(space, 120);
    expect(k.isSleeping).toBe(true);
    // Moving one dynamic member wakes the compound's island; a kinematic
    // velocity change wakes the kinematic.
    k.velocity = new Vec2(10, 0);
    expect(k.isSleeping).toBe(false);
    space.step(DT);
    expect(k.position.x).toBeGreaterThan(0);
  });
});

describe("changing the type of a sleeping body", () => {
  it("a sleeping kinematic turned dynamic wakes up and falls", () => {
    const space = new Space(new Vec2(0, 300));
    const k = box(space, 0, 0, 20, 20, BodyType.KINEMATIC);
    settle(space, 120);
    expect(k.isSleeping).toBe(true);
    k.type = BodyType.DYNAMIC;
    expect(k.isSleeping).toBe(false);
    settle(space, 30);
    expect(k.position.y).toBeGreaterThan(10);
  });

  it("a sleeping dynamic body turned kinematic stays put under gravity", () => {
    const space = new Space(new Vec2(0, 300));
    box(space, 0, 20, 200, 10, BodyType.STATIC);
    const d = box(space, 0, 0, 20, 20);
    settle(space, 600);
    expect(d.isSleeping).toBe(true);
    const y = d.position.y;
    d.type = BodyType.KINEMATIC;
    space.gravity = new Vec2(0, -300);
    settle(space, 30);
    expect(d.position.y).toBe(y);
  });
});

describe("compounds owning constraints", () => {
  function jointedCompound(space: Space) {
    const c = new Compound();
    const a = box(null, 0, 0);
    const b = box(null, 40, 0);
    a.compound = c;
    b.compound = c;
    const j = new PivotJoint(a, b, new Vec2(20, 0), new Vec2(-20, 0));
    j.compound = c;
    c.space = space;
    return { c, a, b, j };
  }

  it("removing the compound takes its constraints out of the simulation", () => {
    const space = new Space(new Vec2(0, 100));
    const { c, a, j } = jointedCompound(space);
    space.step(DT);
    expect(j.active).toBe(true);
    c.space = null;
    expect(j.space).toBeNull();
    expect(a.space).toBeNull();
    expect(c.constraints.has(j)).toBe(true);
    // The space keeps simulating without the removed joint.
    space.step(DT);
    expect(space.liveConstraints.length).toBe(0);
  });

  for (const mode of ["force", "error"] as const) {
    it(`a breakable joint inside a compound breaks under ${mode} and leaves the compound`, () => {
      const space = new Space(new Vec2(0, 0));
      const { c, a, b, j } = jointedCompound(space);
      j.removeOnBreak = true;
      if (mode === "force") {
        j.maxForce = 10;
        j.breakUnderForce = true;
      } else {
        // A stiff pivot is solved exactly; only a soft one accumulates error.
        j.stiff = false;
        j.maxError = 1;
        j.breakUnderError = true;
      }
      const broken: unknown[] = [];
      const cb = new ConstraintListener(CbEvent.BREAK, CbType.ANY_CONSTRAINT, (e) =>
        broken.push(e.constraint),
      );
      cb.space = space;
      a.velocity = new Vec2(-2000, 0);
      b.velocity = new Vec2(2000, 0);
      for (let i = 0; i < 10 && broken.length === 0; i++) space.step(DT);
      expect(broken).toEqual([j]);
      expect(c.constraints.has(j)).toBe(false);
      expect(j.compound).toBeNull();
      expect(j.space).toBeNull();
    });
  }
});

describe("constraint listeners filter by event", () => {
  it("WAKE and BREAK listeners on the same type each see only their event", () => {
    const space = new Space(new Vec2(0, 0));
    const type = new CbType();
    const a = box(space, 0, 0);
    const b = box(space, 40, 0);
    const j = new DistanceJoint(a, b, new Vec2(), new Vec2(), 40, 40);
    j.cbTypes.add(type);
    j.space = space;
    const events: string[] = [];
    for (const [ev, name] of [
      [CbEvent.WAKE, "wake"],
      [CbEvent.BREAK, "break"],
      [CbEvent.SLEEP, "sleep"],
    ] as const) {
      new ConstraintListener(ev, type, () => events.push(name)).space = space;
    }
    settle(space, 300);
    expect(j.isSleeping).toBe(true);
    expect(events).toEqual(["sleep"]);

    a.velocity = new Vec2(5, 0);
    space.step(DT);
    expect(events).toEqual(["sleep", "wake"]);

    j.maxForce = 1;
    j.breakUnderForce = true;
    a.velocity = new Vec2(-3000, 0);
    for (let i = 0; i < 10 && !events.includes("break"); i++) space.step(DT);
    expect(events).toEqual(["sleep", "wake", "break"]);
  });
});

describe("InteractionGroups on compounds", () => {
  /** Two balls dropped onto each other; returns whether they ever touched. */
  function collides(setup: (top: Body, bottom: Body) => void): boolean {
    const space = new Space(new Vec2(0, 400));
    const ground = box(space, 0, 100, 400, 10, BodyType.STATIC);
    void ground;
    const bottom = new Body(BodyType.DYNAMIC, new Vec2(0, 80));
    bottom.shapes.add(new Circle(10));
    const top = new Body(BodyType.DYNAMIC, new Vec2(0, 40));
    top.shapes.add(new Circle(10));
    setup(top, bottom);
    if (top.space == null && top.compound == null) top.space = space;
    if (bottom.space == null && bottom.compound == null) bottom.space = space;
    for (const c of [top.compound, bottom.compound]) {
      let root = c;
      while (root?.compound) root = root.compound;
      if (root && root.space == null) root.space = space;
    }
    settle(space, 120);
    // Stacked: top rests on bottom at y ≈ 65. Ignoring: both rest on the ground at ≈ 85.
    return top.position.y < 75;
  }

  it("a group set on a compound applies to bodies inside it", () => {
    expect(collides(() => {})).toBe(true);
    const ignoring = new InteractionGroup(true);
    expect(
      collides((top, bottom) => {
        const c1 = new Compound();
        const c2 = new Compound();
        top.compound = c1;
        bottom.compound = c2;
        c1.group = ignoring;
        c2.group = ignoring;
      }),
    ).toBe(false);
  });

  it("the deepest common group decides; nested compound and body groups are walked", () => {
    const outer = new InteractionGroup(true);
    const inner = new InteractionGroup(false);
    inner.group = outer;
    // top: in a nested compound whose inner compound uses `inner`; bottom: body
    // directly in the ignoring `outer` group. Common ancestor = outer → ignore.
    expect(
      collides((top, bottom) => {
        const parent = new Compound();
        const child = new Compound();
        child.compound = parent;
        top.compound = child;
        child.group = inner;
        bottom.group = outer;
      }),
    ).toBe(false);
    // Both in the non-ignoring inner group → they collide.
    expect(
      collides((top, bottom) => {
        const parent = new Compound();
        const child = new Compound();
        child.compound = parent;
        top.compound = child;
        child.group = inner;
        bottom.group = inner;
      }),
    ).toBe(true);
  });
});

describe("Body.disableCCD", () => {
  function shoot(disableCCD: boolean): number {
    const space = new Space(new Vec2(0, 0));
    box(space, 100, 0, 4, 200, BodyType.STATIC);
    const bullet = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    bullet.shapes.add(new Circle(2));
    bullet.isBullet = true;
    bullet.disableCCD = disableCCD;
    bullet.velocity = new Vec2(20000, 0);
    bullet.space = space;
    for (let i = 0; i < 5; i++) space.step(DT);
    return bullet.position.x;
  }

  it("CCD stops a fast bullet at a thin wall; disableCCD lets it tunnel", () => {
    expect(shoot(false)).toBeLessThan(100);
    expect(shoot(true)).toBeGreaterThan(100);
  });
});

describe("fluid details", () => {
  function floatHeight(gravity: Vec2 | null): number {
    const space = new Space(new Vec2(0, 300));
    const tank = new Body(BodyType.STATIC, new Vec2(0, 100));
    const water = new Polygon(Polygon.box(400, 200));
    water.fluidEnabled = true;
    water.fluidProperties = new FluidProperties(3, 4);
    if (gravity) water.fluidProperties.gravity = gravity;
    tank.shapes.add(water);
    tank.space = space;
    const b = box(space, 0, 50);
    settle(space, 300);
    return b.position.y;
  }

  it("a per-fluid gravity override drives buoyancy", () => {
    const normal = floatHeight(null);
    // Buoyancy pushes against the fluid's own gravity: a weak override means
    // weak buoyancy, so the body sinks deeper than with the space gravity.
    const weak = floatHeight(new Vec2(0, 30));
    expect(normal).toBeLessThan(50);
    expect(weak).toBeGreaterThan(normal + 20);
  });

  it("two overlapping dynamic fluid bodies interact as fluid whichever is denser", () => {
    for (const [d1, d2] of [
      [5, 1],
      [1, 5],
    ]) {
      const space = new Space(new Vec2(0, 300));
      const mk = (x: number, d: number) => {
        const b = new Body(BodyType.DYNAMIC, new Vec2(x, 0));
        const s = new Circle(30);
        s.fluidEnabled = true;
        s.fluidProperties = new FluidProperties(d, 1);
        b.shapes.add(s);
        b.space = space;
        return b;
      };
      const p = mk(0, d1);
      const q = mk(20, d2);
      settle(space, 3);
      expect(Number.isFinite(p.position.y) && Number.isFinite(q.position.y)).toBe(true);
      expect(p.arbiters.length).toBe(1);
      expect(p.arbiters.at(0).isFluidArbiter()).toBe(true);
    }
  });
});
