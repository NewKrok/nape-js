/**
 * ZPP_ColArbiter / ZPP_FluidArbiter — behavioural coverage.
 *
 * Targets:
 *  - normal wrapper creation (fresh and pooled Vec2), normal orientation for both
 *    shape id orders, stale-normal guard once the arbiter is retired
 *  - contacts list mutation inside a pre-handler (remove → contacts_subber,
 *    add → contacts_adder error), and the physical consequence of dropping a
 *    contact
 *  - cleanupContacts: c1/c2 selection with position-only contacts, expiry of
 *    stale contacts after Config.arbiterExpirationDelay
 *  - material combination (elasticity ±Infinity / clamping, friction sqrt-mix),
 *    re-computation when a material changes mid-contact, and user overrides
 *    from a pre-handler surviving that re-computation
 *  - FluidArbiter.position (pooled Vec2) and its stale guard
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Material } from "../../src/phys/Material";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { PreListener } from "../../src/callbacks/PreListener";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { CbType } from "../../src/callbacks/CbType";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { Config } from "../../src/Config";

type Any = any;

const DT = 1 / 60;

function staticFloor(space: Space, material?: Material): Body {
  const floor = new Body(BodyType.STATIC, new Vec2(0, 0));
  const s = new Polygon(Polygon.box(400, 20));
  if (material) s.material = material;
  floor.shapes.add(s);
  floor.space = space;
  return floor;
}

function restingBox(space: Space, material?: Material, rotation = 0): Body {
  const box = new Body(BodyType.DYNAMIC, new Vec2(0, -29.5));
  const s = new Polygon(Polygon.box(40, 40));
  if (material) s.material = material;
  box.shapes.add(s);
  box.rotation = rotation;
  box.space = space;
  return box;
}

function colArb(body: Body): Any {
  for (let i = 0; i < body.arbiters.length; i++) {
    const a = body.arbiters.at(i) as Any;
    if (a.isCollisionArbiter()) return a.collisionArbiter;
  }
  return null;
}

function contactsOf(arb: Any): Any[] {
  const out: Any[] = [];
  const cs = arb.contacts;
  for (let i = 0; i < cs.length; i++) out.push(cs.at(i));
  return out;
}

function acceptOnce(space: Space, handler?: (arb: Any) => void): void {
  space.listeners.add(
    new PreListener(InteractionType.COLLISION, CbType.ANY_BODY, CbType.ANY_BODY, (cb) => {
      handler?.(cb.arbiter.collisionArbiter);
      return PreFlag.ACCEPT_ONCE;
    }),
  );
}

// ---------------------------------------------------------------------------
// normal
// ---------------------------------------------------------------------------

describe("CollisionArbiter.normal", () => {
  it("is built from a pooled Vec2 and still reports the correct normal", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const box = restingBox(space);
    space.step(DT);
    // Put a disposed Vec2 in the public pool so getnormal() reuses it.
    new Vec2(7, 7).dispose();
    const n = colArb(box).normal;
    expect(n.x).toBeCloseTo(0, 10);
    expect(Math.abs(n.y)).toBeCloseTo(1, 10);
    // Pooled instance must be fully re-initialised (not the disposed 7,7).
    expect(n.length).toBeCloseTo(1, 10);
  });

  it("is immutable outside of a pre-handler", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const box = restingBox(space);
    space.step(DT);
    const n = colArb(box).normal;
    expect(() => n.setxy(1, 0)).toThrow("Vec2 is immutable");
  });

  it.each([
    ["floor created first", true],
    ["box created first", false],
  ])("points from shape1 towards shape2 (%s)", (_label, floorFirst) => {
    const space = new Space(new Vec2(0, 100));
    let floor: Body;
    let box: Body;
    if (floorFirst) {
      floor = staticFloor(space);
      box = restingBox(space);
    } else {
      box = restingBox(space);
      floor = staticFloor(space);
    }
    space.step(DT);
    const arb = colArb(box);
    const n = arb.normal;
    const p1 = arb.shape1.body.position;
    const p2 = arb.shape2.body.position;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    expect(n.x * dx + n.y * dy).toBeGreaterThan(0);
    // Shape order and normal sign flip together.
    const shape1IsFloor = arb.shape1 === floor.shapes.at(0);
    expect(n.y).toBeCloseTo(shape1IsFloor ? -1 : 1, 10);
  });

  it("a retained normal throws once its arbiter is retired", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const box = restingBox(space);
    space.step(DT);
    const n = colArb(box).normal;
    expect(n.y).toBeCloseTo(-1, 10);
    box.space = null;
    expect(() => n.x).toThrow("Arbiter not currently in use");
  });
});

// ---------------------------------------------------------------------------
// contacts list mutation inside a pre-handler
// ---------------------------------------------------------------------------

describe("CollisionArbiter.contacts inside a pre-handler", () => {
  it("remove() drops a contact and add() is rejected", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const box = restingBox(space);
    const log: (number | string)[] = [];
    acceptOnce(space, (arb) => {
      const cs = arb.contacts;
      log.push(cs.length);
      const first = cs.at(0);
      expect(cs.remove(first)).toBe(true);
      log.push(cs.length);
      // removing again: no longer present
      expect(cs.remove(first)).toBe(false);
      try {
        cs.add(cs.at(0));
      } catch (e: Any) {
        log.push(e.message);
      }
    });
    space.step(DT);
    expect(log[0]).toBe(2);
    expect(log[1]).toBe(1);
    expect(log[2]).toContain("Cannot add new contacts");
    // After the step the arbiter only reports the surviving contact.
    expect(colArb(box).contacts.length).toBe(1);
  });

  it("dropping one support contact every step makes a flat box tip over", () => {
    const run = (drop: boolean): number => {
      const space = new Space(new Vec2(0, 500));
      staticFloor(space);
      const box = restingBox(space);
      acceptOnce(space, (arb) => {
        if (!drop) return;
        const cs = arb.contacts;
        if (cs.length < 2) return;
        // remove the contact with the larger x (right-hand corner)
        const a = cs.at(0);
        const b = cs.at(1);
        cs.remove(a.position.x > b.position.x ? a : b);
      });
      for (let i = 0; i < 60; i++) space.step(DT);
      return box.rotation;
    };
    expect(Math.abs(run(false))).toBeLessThan(1e-6);
    // supported only on the left corner → gravity rotates it clockwise (+rot, y-down)
    expect(run(true)).toBeGreaterThan(0.01);
  });

  it("the contacts list is immutable outside the pre-handler", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const box = restingBox(space);
    acceptOnce(space);
    space.step(DT);
    const cs = colArb(box).contacts;
    expect(() => cs.remove(cs.at(0))).toThrow("ContactList is immutable");
  });
});

// ---------------------------------------------------------------------------
// cleanupContacts — contact selection / expiry (only runs with a pre-listener)
// ---------------------------------------------------------------------------

describe("ZPP_ColArbiter.cleanupContacts", () => {
  it.each([
    ["tilted clockwise", 0.3],
    ["tilted counter-clockwise", -0.3],
  ])("a separated (position-only) contact receives no impulse (%s)", (_l, rot) => {
    const space = new Space(new Vec2(0, 500));
    staticFloor(space);
    // corner just penetrating the floor, the other bottom corner well above it
    const half = 20;
    const lowest = half * (Math.cos(Math.abs(rot)) + Math.sin(Math.abs(rot)));
    const box = new Body(BodyType.DYNAMIC, new Vec2(0, -10 - lowest + 0.5));
    box.shapes.add(new Polygon(Polygon.box(40, 40)));
    box.rotation = rot;
    box.velocity = new Vec2(0, 50);
    box.space = space;
    acceptOnce(space);
    space.step(DT);
    const arb = colArb(box);
    expect(arb).not.toBeNull();
    const inner = arb.zpp_inner.colarb;
    // both raw contacts exist, one of them is position-only
    let raw = inner.contacts.next;
    const flags: boolean[] = [];
    while (raw) {
      flags.push(raw.posOnly);
      raw = raw.next;
    }
    expect(flags.length).toBe(2);
    expect(flags.filter((f) => f).length).toBe(1);
    // cleanupContacts must pick the penetrating contact as c1 and drop c2
    expect(inner.oc1.posOnly).toBe(false);
    expect(inner.hc2).toBe(false);
    expect(inner.hpc2).toBe(true);
    // ...so only the penetrating contact carries a normal impulse
    const cs = contactsOf(arb);
    const pen = cs.find((c) => c.penetration > 0);
    const sep = cs.find((c) => c.penetration <= 0);
    expect(pen).toBeDefined();
    expect(sep).toBeDefined();
    expect(pen.normalImpulse().length).toBeGreaterThan(0);
    expect(sep.normalImpulse().length).toBe(0);
  });

  it("drops contacts older than Config.arbiterExpirationDelay and keeps fresh ones", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const box = restingBox(space);
    acceptOnce(space);
    space.step(DT);
    const inner = colArb(box).zpp_inner.colarb;
    expect(inner.contacts.length).toBe(2);
    const first = inner.contacts.next;
    const second = first.next;

    // A contact exactly at the expiration boundary is kept but inactive.
    first.stamp = inner.stamp - Config.arbiterExpirationDelay;
    inner.cleanupContacts();
    expect(inner.contacts.length).toBe(2);
    expect(first.active).toBe(false);
    expect(second.active).toBe(true);
    expect(inner.oc1).toBe(second);
    expect(inner.hc2).toBe(false);
    expect(inner.hpc2).toBe(false);

    // One step past the boundary it is removed and returned to the pool.
    first.stamp = inner.stamp - Config.arbiterExpirationDelay - 1;
    inner.cleanupContacts();
    expect(inner.contacts.length).toBe(1);
    expect(inner.innards.length).toBe(1);
    expect(inner.contacts.next).toBe(second);
    expect(first.arbiter).toBeNull();

    // Expire the remaining (now head) contact as well.
    second.stamp = inner.stamp - Config.arbiterExpirationDelay - 1;
    inner.cleanupContacts();
    expect(inner.contacts.length).toBe(0);
    expect(inner.innards.length).toBe(0);
  });

  it("expires a non-head contact (pre != null path)", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const box = restingBox(space);
    acceptOnce(space);
    space.step(DT);
    const inner = colArb(box).zpp_inner.colarb;
    const first = inner.contacts.next;
    const second = first.next;
    second.stamp = inner.stamp - Config.arbiterExpirationDelay - 1;
    inner.cleanupContacts();
    expect(inner.contacts.length).toBe(1);
    expect(inner.contacts.next).toBe(first);
    expect(first.next).toBeNull();
    expect(inner.oc1).toBe(first);
    // the simulation keeps working: next step re-creates the missing contact
    space.step(DT);
    expect(inner.contacts.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// material combination
// ---------------------------------------------------------------------------

describe("ZPP_ColArbiter material combination", () => {
  const combos: [string, number, number, number][] = [
    ["+Infinity elasticity → 1", Infinity, 0.2, 1],
    ["-Infinity elasticity → 0", -Infinity, 0.9, 0],
    ["negative mean clamps to 0", -3, 1, 0],
    ["mean above 1 clamps to 1", 3, 2, 1],
    ["ordinary mean", 0.2, 0.6, 0.4],
  ];
  it.each(combos)("%s", (_l, e1, e2, expected) => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space, new Material(e1, 1, 2, 1, 0.001));
    const box = restingBox(space, new Material(e2, 1, 2, 1, 0.001));
    space.step(DT);
    expect(colArb(box).elasticity).toBeCloseTo(expected, 10);
  });

  it("re-mixes when a shape material changes during contact", () => {
    const space = new Space(new Vec2(0, 100));
    const m1 = new Material(0.0, 0.4, 0.9, 1, 0.01);
    const m2 = new Material(0.0, 0.9, 0.4, 1, 0.04);
    staticFloor(space, m1);
    const box = restingBox(space, m2);
    space.step(DT);
    const arb = colArb(box);
    expect(arb.dynamicFriction).toBeCloseTo(Math.sqrt(0.4 * 0.9), 10);
    expect(arb.rollingFriction).toBeCloseTo(Math.sqrt(0.01 * 0.04), 10);

    m1.elasticity = 1;
    expect(arb.elasticity).toBeCloseTo(0.5, 10);
    m1.dynamicFriction = 0.1;
    expect(arb.dynamicFriction).toBeCloseTo(Math.sqrt(0.1 * 0.9), 10);
    m1.staticFriction = 0.25;
    expect(arb.staticFriction).toBeCloseTo(Math.sqrt(0.25 * 0.4), 10);
    m2.rollingFriction = 0.09;
    expect(arb.rollingFriction).toBeCloseTo(Math.sqrt(0.01 * 0.09), 10);
  });

  it("values set in a pre-handler survive a later material re-mix", () => {
    const space = new Space(new Vec2(0, 100));
    const m1 = new Material(0.0, 0.4, 0.9, 1, 0.01);
    staticFloor(space, m1);
    const box = restingBox(space);
    let calls = 0;
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, CbType.ANY_BODY, CbType.ANY_BODY, (cb) => {
        calls++;
        const arb = cb.arbiter.collisionArbiter!;
        arb.elasticity = 0.75;
        arb.dynamicFriction = 0.33;
        arb.staticFriction = 0.44;
        arb.rollingFriction = 0.55;
        return PreFlag.ACCEPT;
      }),
    );
    space.step(DT);
    space.step(DT);
    expect(calls).toBe(1);
    const arb = colArb(box);
    // material change invalidates the arbiter → recompute must keep overrides
    m1.elasticity = 0.0;
    m1.dynamicFriction = 5;
    m1.staticFriction = 5;
    m1.rollingFriction = 5;
    expect(arb.elasticity).toBeCloseTo(0.75, 10);
    expect(arb.dynamicFriction).toBeCloseTo(0.33, 10);
    expect(arb.staticFriction).toBeCloseTo(0.44, 10);
    expect(arb.rollingFriction).toBeCloseTo(0.55, 10);
  });

  it("a fresh arbiter after separation forgets the pre-handler overrides", () => {
    const space = new Space(new Vec2(0, 0));
    staticFloor(space, new Material(0.2, 1, 2, 1, 0.001));
    const box = restingBox(space, new Material(0.2, 1, 2, 1, 0.001));
    let override = true;
    space.listeners.add(
      new PreListener(InteractionType.COLLISION, CbType.ANY_BODY, CbType.ANY_BODY, (cb) => {
        if (override) cb.arbiter.collisionArbiter!.elasticity = 0.9;
        return PreFlag.ACCEPT_ONCE;
      }),
    );
    space.step(DT);
    expect(colArb(box).elasticity).toBeCloseTo(0.9, 10);
    // separate long enough for the arbiter to be released
    box.position = new Vec2(0, -500);
    for (let i = 0; i < Config.arbiterExpirationDelay + 3; i++) space.step(DT);
    expect(colArb(box)).toBeNull();
    override = false;
    box.position = new Vec2(0, -29.5);
    space.step(DT);
    expect(colArb(box).elasticity).toBeCloseTo(0.2, 10);
  });

  it("density change on a body in contact updates its mass", () => {
    const space = new Space(new Vec2(0, 100));
    staticFloor(space);
    const mat = new Material(0, 1, 2, 1, 0.001);
    const box = restingBox(space, mat);
    space.step(DT);
    const m0 = box.mass;
    const i0 = box.inertia;
    mat.density = 3;
    expect(box.mass).toBeCloseTo(m0 * 3, 6);
    expect(box.inertia).toBeCloseTo(i0 * 3, 3);
  });
});

// ---------------------------------------------------------------------------
// fluid arbiter
// ---------------------------------------------------------------------------

describe("FluidArbiter.position", () => {
  function fluidScene() {
    const space = new Space(new Vec2(0, 100));
    const water = new Body(BodyType.STATIC, new Vec2(0, 0));
    const ws = new Polygon(Polygon.box(400, 200));
    ws.fluidEnabled = true;
    ws.fluidProperties = new FluidProperties(2, 1);
    water.shapes.add(ws);
    water.space = space;
    const ball = new Body(BodyType.DYNAMIC, new Vec2(30, 40));
    ball.shapes.add(new Circle(10));
    ball.space = space;
    space.step(DT);
    const fa = (ball.arbiters.at(0) as Any).fluidArbiter;
    return { space, ball, fa };
  }

  it("reuses a pooled Vec2 and reports the overlap centroid", () => {
    const { fa } = fluidScene();
    new Vec2(99, 99).dispose();
    const p = fa.position;
    // fully submerged circle → centroid is the circle centre, overlap = πr²
    // (computed during the step, before the ball was integrated)
    expect(p.x).toBeCloseTo(30, 6);
    expect(p.y).toBeCloseTo(40, 6);
    expect(fa.overlap).toBeCloseTo(Math.PI * 100, 6);
  });

  it("a retained position throws once the arbiter is no longer in use", () => {
    const { ball, fa } = fluidScene();
    const p = fa.position;
    expect(p.x).toBeCloseTo(30, 6);
    ball.space = null;
    expect(() => p.x).toThrow("Arbiter not currently in use");
  });
});
