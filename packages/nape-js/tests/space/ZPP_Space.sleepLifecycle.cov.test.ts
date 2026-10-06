/**
 * ZPP_Space paths that only run when bodies, joints or compounds are ASLEEP,
 * plus the space-list guards (cross-space moves, mid-step mutation, compound
 * members):
 *
 * - clear() tearing down islands that belong to sleeping constraints and to
 *   sleeping members of (nested) compounds
 * - gravity changes waking sleeping bodies nested two compounds deep
 * - removing a sleeping body
 * - BodyListener / ConstraintListener WAKE and SLEEP events
 * - Space.bodies / compounds / constraints / listeners add-remove guards
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Compound } from "../../src/phys/Compound";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { CbType } from "../../src/callbacks/CbType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { BodyListener } from "../../src/callbacks/BodyListener";
import { ConstraintListener } from "../../src/callbacks/ConstraintListener";
import { PreListener } from "../../src/callbacks/PreListener";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { InteractionType } from "../../src/callbacks/InteractionType";

const DT = 1 / 60;

function ball(space: Space | null, x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  if (space) b.space = space;
  return b;
}

function settle(space: Space, steps = 240) {
  for (let i = 0; i < steps; i++) space.step(DT);
}

/** Two balls held together by a pivot joint, floating in zero gravity. */
function jointedPair(space: Space | null, x: number) {
  const a = ball(space, x, 0);
  const b = ball(space, x + 30, 0);
  const joint = new PivotJoint(a, b, new Vec2(15, 0), new Vec2(-15, 0));
  if (space) joint.space = space;
  return { a, b, joint };
}

/** outer compound ⊃ { body, joint pair, inner compound ⊃ { body } } */
function nestedCompound() {
  const outer = new Compound();
  const top = ball(null, 0, 0);
  top.compound = outer;
  const { a, b, joint } = jointedPair(null, 100);
  a.compound = outer;
  b.compound = outer;
  joint.compound = outer;
  const inner = new Compound();
  const deep = ball(null, 200, 0);
  deep.compound = inner;
  inner.compound = outer;
  return { outer, inner, top, deep, a, b, joint };
}

describe("ZPP_Space — sleeping islands", () => {
  it("bodies, joints and nested compound members fall asleep in zero gravity", () => {
    const space = new Space(new Vec2(0, 0));
    const pair = jointedPair(space, -200);
    const nest = nestedCompound();
    nest.outer.space = space;
    settle(space);
    expect(pair.a.isSleeping).toBe(true);
    expect(pair.joint.isSleeping).toBe(true);
    expect(nest.top.isSleeping).toBe(true);
    expect(nest.deep.isSleeping).toBe(true);
    expect(nest.joint.isSleeping).toBe(true);
  });

  it("clear() releases the islands of sleeping constraints and compound members", () => {
    const space = new Space(new Vec2(0, 0));
    const pair = jointedPair(space, -200);
    const nest = nestedCompound();
    // A second inner-compound body, tied to `deep` by a joint owned by the OUTER
    // compound, and a top-level joint tying two compound members together. clear()
    // frees bodies before constraints and outer compounds before inner ones, so these
    // two are the constraints whose sleeping island is still alive when reached.
    const deep2 = ball(null, 230, 0);
    deep2.compound = nest.inner;
    const crossInner = new PivotJoint(nest.deep, deep2, new Vec2(15, 0), new Vec2(-15, 0));
    crossInner.compound = nest.outer;
    nest.outer.space = space;
    const topLevel = new DistanceJoint(nest.a, nest.b, new Vec2(), new Vec2(), 20, 60);
    topLevel.space = space;
    settle(space);
    expect(pair.joint.isSleeping).toBe(true);
    expect(topLevel.isSleeping).toBe(true);
    expect(crossInner.isSleeping).toBe(true);

    space.clear();
    expect(topLevel.space).toBeNull();

    expect(space.bodies.length).toBe(0);
    expect(space.constraints.length).toBe(0);
    expect(space.compounds.length).toBe(0);
    for (const b of [pair.a, pair.b, nest.top, nest.deep, nest.a, nest.b]) {
      expect(b.space).toBeNull();
    }
    expect(pair.joint.space).toBeNull();
    expect(nest.outer.space).toBeNull();

    // The released objects are fully reusable in a fresh space.
    const again = new Space(new Vec2(0, 100));
    pair.a.space = again;
    pair.b.space = again;
    pair.joint.space = again;
    nest.outer.space = again;
    settle(again, 10);
    expect(pair.a.position.y).toBeGreaterThan(0);
    expect(nest.deep.position.y).toBeGreaterThan(0);
  });

  it("changing gravity wakes sleeping bodies two compounds deep", () => {
    const space = new Space(new Vec2(0, 0));
    const nest = nestedCompound();
    nest.outer.space = space;
    const loose = ball(space, -300, 0);
    settle(space);
    expect(nest.deep.isSleeping).toBe(true);
    expect(loose.isSleeping).toBe(true);

    space.gravity = new Vec2(0, 200);
    space.step(DT);

    expect(nest.deep.isSleeping).toBe(false);
    expect(nest.top.isSleeping).toBe(false);
    expect(loose.isSleeping).toBe(false);
    settle(space, 10);
    expect(nest.deep.position.y).toBeGreaterThan(0);
  });

  it("mutating the gravity Vec2 in place also wakes sleepers", () => {
    const space = new Space(new Vec2(0, 0));
    const b = ball(space, 0, 0);
    settle(space);
    expect(b.isSleeping).toBe(true);
    space.gravity.y = 300;
    expect(space.gravity.y).toBe(300);
    space.step(DT);
    expect(b.isSleeping).toBe(false);
  });

  it("removing a sleeping body leaves the rest of its island consistent", () => {
    const space = new Space(new Vec2(0, 0));
    const { a, b, joint } = jointedPair(space, 0);
    const lone = ball(space, 300, 0);
    settle(space);
    expect(lone.isSleeping).toBe(true);
    expect(a.isSleeping).toBe(true);

    lone.space = null;
    expect(lone.space).toBeNull();
    expect(space.bodies.length).toBe(2);

    joint.space = null;
    a.space = null;
    settle(space, 10);
    expect(b.space).toBe(space);
    expect(space.bodies.length).toBe(1);
  });
});

describe("ZPP_Space — WAKE / SLEEP listeners", () => {
  it("fires body SLEEP, then WAKE when a sleeping body is hit mid-step", () => {
    const space = new Space(new Vec2(0, 0));
    const tag = new CbType();
    const target = ball(space, 0, 0);
    target.cbTypes.add(tag);
    const events: string[] = [];
    space.listeners.add(new BodyListener(CbEvent.SLEEP, tag, () => events.push("sleep")));
    space.listeners.add(new BodyListener(CbEvent.WAKE, tag, () => events.push("wake")));
    settle(space);
    expect(target.isSleeping).toBe(true);
    expect(events).toEqual(["sleep"]);

    const bullet = ball(space, -200, 0, 5);
    bullet.velocity = new Vec2(600, 0);
    settle(space, 60);

    expect(events[1]).toBe("wake");
    expect(target.velocity.x).toBeGreaterThan(0);
  });

  it("fires body WAKE when a sleeper is woken from outside step()", () => {
    const space = new Space(new Vec2(0, 0));
    const tag = new CbType();
    const b = ball(space, 0, 0);
    b.cbTypes.add(tag);
    settle(space);
    expect(b.isSleeping).toBe(true);
    // Registered after settling: newly added bodies also report WAKE on their first step.
    let wakes = 0;
    space.listeners.add(new BodyListener(CbEvent.WAKE, tag, () => wakes++));

    b.velocity = new Vec2(10, 0);
    expect(wakes).toBe(0);
    space.step(DT);
    expect(wakes).toBe(1);
  });

  it("fires constraint SLEEP and WAKE events", () => {
    const space = new Space(new Vec2(0, 0));
    const tag = new CbType();
    const { a, joint } = jointedPair(space, 0);
    joint.cbTypes.add(tag);
    const events: string[] = [];
    space.listeners.add(new ConstraintListener(CbEvent.SLEEP, tag, () => events.push("sleep")));
    space.listeners.add(new ConstraintListener(CbEvent.WAKE, tag, () => events.push("wake")));
    settle(space);
    expect(joint.isSleeping).toBe(true);
    expect(events).toEqual(["sleep"]);

    a.velocity = new Vec2(0, 50);
    space.step(DT);
    expect(events).toEqual(["sleep", "wake"]);
  });

  it("wakes a sleeping constraint hit mid-step and reports WAKE", () => {
    const space = new Space(new Vec2(0, 0));
    const tag = new CbType();
    const a = ball(space, 0, 0);
    const b = ball(space, 0, 40);
    const joint = new DistanceJoint(a, b, new Vec2(), new Vec2(), 30, 50);
    joint.cbTypes.add(tag);
    joint.space = space;
    let wakes = 0;
    space.listeners.add(new ConstraintListener(CbEvent.WAKE, tag, () => wakes++));
    settle(space);
    expect(joint.isSleeping).toBe(true);

    const bullet = ball(space, -200, 0, 5);
    bullet.velocity = new Vec2(600, 0);
    settle(space, 60);
    expect(wakes).toBe(1);
  });
});

describe("ZPP_Space — space list guards", () => {
  it("moves a body / compound / constraint between spaces via the list add()", () => {
    const s1 = new Space();
    const s2 = new Space();
    const body = ball(s1, 0, 0);
    s2.bodies.add(body);
    expect(body.space).toBe(s2);
    expect(s1.bodies.length).toBe(0);
    // Adding again to the same space is a no-op.
    s2.bodies.add(body);
    expect(s2.bodies.length).toBe(1);

    const comp = new Compound();
    ball(null, 50, 0).compound = comp;
    comp.space = s1;
    s2.compounds.add(comp);
    expect(comp.space).toBe(s2);
    expect(s1.compounds.length).toBe(0);
    s2.compounds.add(comp);
    expect(s2.compounds.length).toBe(1);

    const other = ball(s1, 100, 0);
    const keep = ball(s1, 150, 0);
    other.space = s2;
    keep.space = s2;
    const joint = new PivotJoint(other, keep, new Vec2(), new Vec2());
    joint.space = s1;
    s2.constraints.add(joint);
    expect(joint.space).toBe(s2);
    expect(s1.constraints.length).toBe(0);
    s2.constraints.add(joint);
    expect(s2.constraints.length).toBe(1);

    s2.bodies.remove(body);
    s2.compounds.remove(comp);
    s2.constraints.remove(joint);
    expect(body.space).toBeNull();
    expect(comp.space).toBeNull();
    expect(joint.space).toBeNull();
  });

  it("rejects adding a compound member directly to a space", () => {
    const space = new Space();
    const outer = new Compound();
    const inner = new Compound();
    inner.compound = outer;
    const member = ball(null, 0, 0);
    member.compound = outer;
    const a = ball(null, 0, 0);
    const b = ball(null, 30, 0);
    a.compound = outer;
    b.compound = outer;
    const joint = new PivotJoint(a, b, new Vec2(), new Vec2());
    joint.compound = outer;

    expect(() => space.bodies.add(member)).toThrow(/belonging to a Compound/);
    expect(() => space.compounds.add(inner)).toThrow(/inner Compound/);
    expect(() => space.constraints.add(joint)).toThrow(/Compound/);
  });

  it("moves a listener between spaces and ignores a duplicate add", () => {
    const s1 = new Space();
    const s2 = new Space();
    const listener = new BodyListener(CbEvent.WAKE, CbType.ANY_BODY, () => {});
    s1.listeners.add(listener);
    s2.listeners.add(listener);
    expect(listener.space).toBe(s2);
    expect(s1.listeners.length).toBe(0);
    s2.listeners.add(listener);
    expect(s2.listeners.length).toBe(1);
    s2.listeners.remove(listener);
    expect(listener.space).toBeNull();
  });

  it("forbids mutating bodies / compounds / constraints / listeners during step()", () => {
    const space = new Space(new Vec2(0, 0));
    const tag = new CbType();
    const a = ball(space, 0, 0);
    a.cbTypes.add(tag);
    const b = ball(space, 300, 0);
    const c = ball(space, 330, 0);
    const joint = new PivotJoint(b, c, new Vec2(15, 0), new Vec2(-15, 0));
    joint.space = space;
    const comp = new Compound();
    ball(null, 600, 0).compound = comp;
    comp.space = space;
    const extra = new BodyListener(CbEvent.WAKE, tag, () => {});
    space.listeners.add(extra);

    const errors: string[] = [];
    const attempt = (fn: () => void) => {
      try {
        fn();
        errors.push("ok");
      } catch (e) {
        errors.push((e as Error).message);
      }
    };
    // Pre-listeners are the one user callback that runs inside step().
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, tag, CbType.ANY_BODY, () => {
        if (errors.length === 0) {
          attempt(() => space.bodies.add(ball(null, 900, 0)));
          attempt(() => space.bodies.remove(b));
          attempt(() => space.compounds.remove(comp));
          attempt(() => space.constraints.remove(joint));
          attempt(() => space.listeners.remove(extra));
          attempt(() => {
            space.gravity = new Vec2(0, 10);
          });
        }
        return PreFlag.ACCEPT;
      }),
    );
    const bullet = ball(space, -100, 0, 5);
    bullet.velocity = new Vec2(600, 0);
    settle(space, 60);

    expect(errors).toHaveLength(6);
    expect(errors.every((m) => /during space step/.test(m))).toBe(true);
    // Nothing was actually changed.
    expect(b.space).toBe(space);
    expect(comp.space).toBe(space);
    expect(joint.space).toBe(space);
    expect(extra.space).toBe(space);
    expect(space.gravity.y).toBe(0);
  });
});
