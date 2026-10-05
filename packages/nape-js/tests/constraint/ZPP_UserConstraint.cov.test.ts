/**
 * UserConstraint / ZPP_UserConstraint — behavioural coverage.
 *
 * Uses small world-anchored constraints (1-, 2- and 3-DOF) whose exact
 * solution is known, to check:
 *  - Cholesky factorisation / substitution (incl. singular Keff rows)
 *  - stiff vs soft, maxForce clamping, breakUnderForce / breakUnderError
 *    (both in preStep and in the position pass), removeOnBreak
 *  - positional correction (small and large rotation updates)
 *  - body registration while in a space, validation across spaces,
 *    ignore (pair_exists), island forest / sleeping, bodyImpulse before stepping,
 *    default abstract-method errors, copy()
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import {
  Space,
  Body,
  BodyType,
  Vec2,
  Circle,
  Polygon,
  UserConstraint,
  Config,
} from "../../src/index";

type Any = any;
const DT = 1 / 60;

function zb(b: Body): Any {
  return (b as Any).zpp_inner;
}

/** Pin a local anchor (rx, ry) of a single body to a world point (2-DOF). */
class Pin extends UserConstraint {
  body: Body | null = null;
  constructor(
    b: Body,
    public rx: number,
    public ry: number,
    public px: number,
    public py: number,
    velOnly = false,
  ) {
    super(2, velOnly);
    this.body = this.__registerBody(this.body, b);
  }
  arm(): [number, number] {
    const z = zb(this.body!);
    const c = z.axisy;
    const s = z.axisx;
    return [c * this.rx - s * this.ry, s * this.rx + c * this.ry];
  }
  override __copy(): UserConstraint {
    return new Pin(this.body!, this.rx, this.ry, this.px, this.py);
  }
  override __position(e: number[]): void {
    const z = zb(this.body!);
    const [x, y] = this.arm();
    e[0] = z.posx + x - this.px;
    e[1] = z.posy + y - this.py;
  }
  override __velocity(e: number[]): void {
    const z = zb(this.body!);
    const [x, y] = this.arm();
    e[0] = z.velx - z.angvel * y;
    e[1] = z.vely + z.angvel * x;
  }
  override __eff_mass(k: number[]): void {
    const z = zb(this.body!);
    const [x, y] = this.arm();
    const m = z.imass;
    const i = z.iinertia;
    k[0] = m + i * y * y;
    k[1] = -i * x * y;
    k[2] = m + i * x * x;
  }
  override __impulse(j: number[], _b: Body, out: Any): void {
    const [x, y] = this.arm();
    out.x = j[0];
    out.y = j[1];
    out.z = x * j[1] - y * j[0];
  }
}

/** Lock x, y and rotation of a body to fixed values (3-DOF, diagonal Keff). */
class Lock3 extends UserConstraint {
  body: Body | null = null;
  brokenCount = 0;
  constructor(
    b: Body,
    public tx: number,
    public ty: number,
    public trot: number,
  ) {
    super(3);
    this.body = this.__registerBody(this.body, b);
  }
  override __copy(): UserConstraint {
    return new Lock3(this.body!, this.tx, this.ty, this.trot);
  }
  override __broken(): void {
    this.brokenCount++;
  }
  override __position(e: number[]): void {
    const z = zb(this.body!);
    e[0] = z.posx - this.tx;
    e[1] = z.posy - this.ty;
    e[2] = z.rot - this.trot;
  }
  override __velocity(e: number[]): void {
    const z = zb(this.body!);
    e[0] = z.velx;
    e[1] = z.vely;
    e[2] = z.angvel;
  }
  override __eff_mass(k: number[]): void {
    const z = zb(this.body!);
    // upper triangle: K00 K01 K02 K11 K12 K22
    k[0] = z.imass;
    k[1] = 0;
    k[2] = 0;
    k[3] = z.imass;
    k[4] = 0;
    k[5] = z.iinertia;
  }
  override __impulse(j: number[], _b: Body, out: Any): void {
    out.x = j[0];
    out.y = j[1];
    out.z = j[2];
  }
}

/** 2-DOF constraint whose second row is degenerate (zero effective mass). */
class Degenerate extends UserConstraint {
  body: Body | null = null;
  constructor(b: Body) {
    super(2);
    this.body = this.__registerBody(this.body, b);
  }
  override __copy(): UserConstraint {
    return new Degenerate(this.body!);
  }
  override __position(e: number[]): void {
    e[0] = zb(this.body!).posx;
    e[1] = 0;
  }
  override __velocity(e: number[]): void {
    e[0] = zb(this.body!).velx;
    e[1] = 0;
  }
  override __eff_mass(k: number[]): void {
    k[0] = zb(this.body!).imass;
    k[1] = 0;
    k[2] = 0;
  }
  override __impulse(j: number[], _b: Body, out: Any): void {
    out.x = j[0];
    out.y = 0;
    out.z = 0;
  }
}

/** Two-body 1-DOF "same x" constraint, used for registration / island tests. */
class SameX extends UserConstraint {
  a: Body | null = null;
  b: Body | null = null;
  constructor(a: Body | null, b: Body | null) {
    super(1);
    this.a = this.__registerBody(this.a, a);
    this.b = this.__registerBody(this.b, b);
  }
  setA(v: Body | null): void {
    this.a = this.__registerBody(this.a, v);
  }
  override __copy(): UserConstraint {
    return new SameX(this.a, this.b);
  }
  override __position(e: number[]): void {
    e[0] = zb(this.b!).posx - zb(this.a!).posx;
  }
  override __velocity(e: number[]): void {
    e[0] = zb(this.b!).velx - zb(this.a!).velx;
  }
  override __eff_mass(k: number[]): void {
    k[0] = zb(this.a!).imass + zb(this.b!).imass;
  }
  override __impulse(j: number[], body: Body, out: Any): void {
    out.x = body === this.a ? -j[0] : j[0];
    out.y = 0;
    out.z = 0;
  }
}

function boxBody(x = 0, y = 0, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(new Polygon(Polygon.box(20, 20)));
  return b;
}

// ---------------------------------------------------------------------------
// solver correctness
// ---------------------------------------------------------------------------

describe("ZPP_UserConstraint solver", () => {
  it("2-DOF pin keeps the anchor at the world point over time", () => {
    const space = new Space(new Vec2(0, 200));
    const b = boxBody(0, 0);
    b.space = space;
    const pin = new Pin(b, 8, 6, 8, 6);
    pin.space = space;
    for (let i = 0; i < 120; i++) space.step(DT);
    const [x, y] = pin.arm();
    expect(b.position.x + x).toBeCloseTo(8, 1);
    expect(b.position.y + y).toBeCloseTo(6, 1);
    // the body swings: it is not simply frozen
    expect(Math.abs(b.rotation)).toBeGreaterThan(0.1);
  });

  // Haxe nape's ZPP_UserConstraint.solve() summed `for k in 0...j-1` instead
  // of `0...j`, so for dim >= 2 the Cholesky factor ignored the last
  // off-diagonal term. With an exact factor a single velocity iteration on a
  // single stiff coupled constraint cancels the anchor velocity exactly.
  it("a single velocity iteration solves a coupled 2-DOF pin exactly", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(0, 0);
    b.space = space;
    const pin = new Pin(b, 8, 6, 8, 6);
    pin.space = space;
    b.velocity = new Vec2(30, -10);
    b.angularVel = 2;
    space.step(DT, 1, 1);
    // arm at the time of the velocity solve (rotation was 0)
    const z = zb(b);
    expect(z.velx - z.angvel * 6).toBeCloseTo(0, 6);
    expect(z.vely + z.angvel * 8).toBeCloseTo(0, 6);
  });

  it("the first DOF of a coupled pin is solved exactly in one iteration", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(0, 0);
    b.space = space;
    const pin = new Pin(b, 8, 6, 8, 6);
    pin.space = space;
    b.velocity = new Vec2(30, -10);
    b.angularVel = 2;
    space.step(DT, 1, 1);
    const z = zb(b);
    expect(z.velx - z.angvel * 6).toBeCloseTo(0, 8);
  });

  it("3-DOF lock holds position and rotation (diagonal Keff)", () => {
    const space = new Space(new Vec2(0, 300));
    const b = boxBody(5, 5);
    b.rotation = 0.5;
    b.space = space;
    const lock = new Lock3(b, 0, 0, 0);
    lock.space = space;
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(b.position.x).toBeCloseTo(0, 1);
    expect(b.position.y).toBeCloseTo(0, 1);
    expect(b.rotation).toBeCloseTo(0, 2);
    const imp = lock.impulse();
    // holding against gravity: y-impulse per step ≈ -m g dt
    expect(imp.x(1, 0)).toBeCloseTo(-b.mass * 300 * DT, 1);
  });

  it("large rotation corrections use the exact sin/cos axis update", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(0, 0);
    b.rotation = 2.5; // big error so the position pass rotates by > 0.01 rad
    b.space = space;
    const lock = new Lock3(b, 0, 0, 0);
    lock.space = space;
    space.step(DT, 1, 20);
    expect(Math.abs(b.rotation)).toBeLessThan(2.5);
    const z = zb(b);
    expect(z.axisx).toBeCloseTo(Math.sin(z.rot), 10);
    expect(z.axisy).toBeCloseTo(Math.cos(z.rot), 10);
  });

  it("a degenerate (zero effective mass) row is skipped without NaN", () => {
    const space = new Space(new Vec2(0, 100));
    const b = boxBody(30, 0);
    b.velocity = new Vec2(50, 0);
    b.space = space;
    const c = new Degenerate(b);
    c.space = space;
    for (let i = 0; i < 30; i++) space.step(DT);
    expect(Number.isNaN(b.position.x)).toBe(false);
    expect(b.position.x).toBeCloseTo(0, 1);
    expect(b.velocity.y).toBeGreaterThan(0); // free axis unaffected
    const imp = c.impulse();
    expect(imp.x(1, 0)).toBe(0);
  });

  it("4-DOF lock with a leading degenerate row still solves the remaining rows", () => {
    class Lock4 extends UserConstraint {
      body: Body | null = null;
      constructor(b: Body) {
        super(4);
        this.body = this.__registerBody(this.body, b);
      }
      override __copy(): UserConstraint {
        return new Lock4(this.body!);
      }
      override __position(e: number[]): void {
        const z = zb(this.body!);
        e[0] = 0;
        e[1] = z.posx;
        e[2] = z.posy;
        e[3] = z.rot;
      }
      override __velocity(e: number[]): void {
        const z = zb(this.body!);
        e[0] = 0;
        e[1] = z.velx;
        e[2] = z.vely;
        e[3] = z.angvel;
      }
      override __eff_mass(k: number[]): void {
        const z = zb(this.body!);
        // upper triangle of a 4x4: rows (0..3), (1..3), (2..3), (3)
        for (let i = 0; i < 10; i++) k[i] = 0;
        k[4] = z.imass; // K11
        k[7] = z.imass; // K22
        k[9] = z.iinertia; // K33
      }
      override __impulse(j: number[], _b: Body, out: Any): void {
        out.x = j[1];
        out.y = j[2];
        out.z = j[3];
      }
    }
    const space = new Space(new Vec2(0, 200));
    const b = boxBody(20, -10);
    b.rotation = 0.3;
    b.space = space;
    const c = new Lock4(b);
    c.space = space;
    for (let i = 0; i < 60; i++) space.step(DT);
    expect(b.position.x).toBeCloseTo(0, 1);
    expect(b.position.y).toBeCloseTo(0, 1);
    expect(b.rotation).toBeCloseTo(0, 2);
    expect(c.impulse().x(0, 0)).toBe(0);
  });

  it("velocity-only constraint never corrects position drift", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(0, 0);
    b.space = space;
    const pin = new Pin(b, 0, 0, 10, 0, true);
    pin.space = space;
    b.velocity = new Vec2(20, 0);
    for (let i = 0; i < 10; i++) space.step(DT);
    // velocity is killed, but the 10px offset stays
    expect(b.velocity.x).toBeCloseTo(0, 6);
    expect(b.position.x).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// soft / maxForce / breaking
// ---------------------------------------------------------------------------

describe("ZPP_UserConstraint limits and breaking", () => {
  it("soft constraint impulse is clamped to maxForce * dt", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(100, 0);
    b.space = space;
    const pin = new Pin(b, 0, 0, 0, 0);
    pin.stiff = false;
    pin.frequency = 20;
    pin.damping = 0;
    pin.maxForce = 50;
    pin.space = space;
    space.step(DT);
    const imp = pin.impulse();
    const mag = Math.hypot(imp.x(0, 0), imp.x(1, 0));
    expect(mag).toBeCloseTo(50 * DT, 6);
  });

  it("soft constraint maxError clamps the bias (slower approach)", () => {
    const run = (maxError: number) => {
      const space = new Space(new Vec2(0, 0));
      const b = boxBody(100, 0);
      b.space = space;
      const pin = new Pin(b, 0, 0, 0, 0);
      pin.stiff = false;
      pin.frequency = 5;
      pin.maxError = maxError;
      pin.space = space;
      space.step(DT);
      return Math.abs(b.velocity.x);
    };
    expect(run(1)).toBeLessThan(run(Infinity));
  });

  it("breakUnderError on a soft constraint breaks in preStep and removes it", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(50, 0);
    b.space = space;
    const lock = new Lock3(b, 0, 0, 0);
    lock.stiff = false;
    lock.maxError = 10;
    lock.breakUnderError = true;
    lock.removeOnBreak = true;
    lock.space = space;
    space.step(DT);
    expect(lock.brokenCount).toBe(1);
    expect(lock.space).toBeNull();
    expect(b.velocity.x).toBe(0); // no impulse was applied
  });

  it("breakUnderError on a stiff constraint breaks in the position pass", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(50, 0);
    b.space = space;
    const lock = new Lock3(b, 0, 0, 0);
    lock.maxError = 10;
    lock.breakUnderError = true;
    lock.removeOnBreak = false;
    lock.space = space;
    space.step(DT);
    expect(lock.brokenCount).toBe(1);
    expect(lock.active).toBe(false);
    expect(lock.space).toBe(space);
  });

  it("breakUnderForce on a stiff constraint breaks when the impulse exceeds maxForce", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(0, 0);
    b.velocity = new Vec2(500, 0);
    b.space = space;
    const lock = new Lock3(b, 0, 0, 0);
    lock.maxForce = 1;
    lock.breakUnderForce = true;
    lock.space = space;
    space.step(DT);
    expect(lock.brokenCount).toBe(1);
    expect(lock.space).toBeNull();
    // the constraint broke before it could stop the body (it would need m*500)
    expect(b.velocity.x).toBeGreaterThan(499);
  });

  it("small errors below the linear slop are not corrected positionally", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(Config.constraintLinearSlop * 0.5, 0);
    b.space = space;
    const pin = new Pin(b, 0, 0, 0, 0, false);
    pin.space = space;
    space.step(DT, 1, 5);
    expect(b.position.x).toBeCloseTo(Config.constraintLinearSlop * 0.5, 12);
  });
});

// ---------------------------------------------------------------------------
// registration / space handling
// ---------------------------------------------------------------------------

describe("UserConstraint body registration and space handling", () => {
  it("re-registering a body while in a space moves the constraint between bodies", () => {
    const space = new Space(new Vec2(0, 0));
    const a = boxBody(0, 0);
    const b = boxBody(50, 0);
    const c = boxBody(-50, 0);
    a.space = space;
    b.space = space;
    c.space = space;
    const con = new SameX(a, b);
    con.space = space;
    expect(a.constraints.length).toBe(1);
    con.setA(c);
    expect(a.constraints.length).toBe(0);
    expect(c.constraints.length).toBe(1);
    expect(b.constraints.length).toBe(1);
    // now c and b are tied along x
    c.velocity = new Vec2(10, 0);
    for (let i = 0; i < 5; i++) space.step(DT);
    expect(b.velocity.x).toBeCloseTo(c.velocity.x, 6);
    expect(a.velocity.x).toBe(0);
  });

  it("registering the same body twice counts references", () => {
    const space = new Space(new Vec2(0, 0));
    const a = boxBody(0, 0);
    a.space = space;
    const con = new SameX(a, a);
    con.space = space;
    let visited = 0;
    con.visitBodies(() => visited++);
    expect(visited).toBe(1);
    expect(a.constraints.length).toBe(1);
    con.setA(null); // one reference left
    expect(a.constraints.length).toBe(1);
    expect((con as Any).zpp_inner.bodies.length).toBe(1);
  });

  it("unregistering a body that is not registered throws", () => {
    const a = boxBody(0, 0);
    const b = boxBody(10, 0);
    const con = new SameX(a, b);
    expect(() => con.__registerBody(boxBody(), null)).toThrow(
      "oldBody is not registered to the cosntraint",
    );
  });

  it("bodies in a different space fail validation", () => {
    const s1 = new Space();
    const s2 = new Space();
    const a = boxBody(0, 0);
    const b = boxBody(10, 0);
    a.space = s1;
    b.space = s2;
    const con = new SameX(a, b);
    con.space = s1;
    expect(() => s1.step(DT)).toThrow("Constraints must have each body within the same sapce");
  });

  it("ignore = true suppresses collisions between the constrained bodies", () => {
    const run = (ignore: boolean): number => {
      const space = new Space(new Vec2(0, 0));
      const a = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      a.shapes.add(new Circle(10));
      const b = new Body(BodyType.DYNAMIC, new Vec2(0, 15));
      b.shapes.add(new Circle(10));
      a.space = space;
      b.space = space;
      const con = new SameX(a, b);
      con.ignore = ignore;
      con.space = space;
      space.step(DT);
      return (space.arbiters as Any).length;
    };
    expect(run(false)).toBe(1);
    expect(run(true)).toBe(0);
  });

  it("ignore covers every body pair of a multi-body user constraint", () => {
    class Tri extends UserConstraint {
      bs: (Body | null)[] = [null, null, null];
      constructor(a: Body, b: Body, c: Body) {
        super(1, true);
        [a, b, c].forEach((x, i) => (this.bs[i] = this.__registerBody(this.bs[i], x)));
      }
      override __copy(): UserConstraint {
        return new Tri(this.bs[0]!, this.bs[1]!, this.bs[2]!);
      }
      override __velocity(e: number[]): void {
        e[0] = 0;
      }
      override __eff_mass(k: number[]): void {
        k[0] = 1;
      }
      override __impulse(_j: number[], _b: Body, out: Any): void {
        out.x = out.y = out.z = 0;
      }
    }
    const run = (ignore: boolean): number => {
      const space = new Space(new Vec2(0, 0));
      const a = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      const b = new Body(BodyType.DYNAMIC, new Vec2(500, 0));
      const c = new Body(BodyType.DYNAMIC, new Vec2(15, 0));
      for (const x of [a, b, c]) {
        x.shapes.add(new Circle(10));
        x.space = space;
      }
      // only a (first) and c (last) overlap: pair_exists must scan past b
      const t = new Tri(a, b, c);
      t.ignore = ignore;
      t.space = space;
      space.step(DT);
      return (space.arbiters as Any).length;
    };
    expect(run(false)).toBe(1);
    expect(run(true)).toBe(0);
  });

  it("bodyImpulse of an inactive constraint is zero even after stepping", () => {
    const space = new Space(new Vec2(0, 100));
    const b = boxBody(0, 0);
    b.space = space;
    const pin = new Pin(b, 0, 0, 0, 0);
    pin.space = space;
    space.step(DT);
    expect(pin.bodyImpulse(b).length).toBeGreaterThan(0);
    pin.active = false;
    expect(pin.bodyImpulse(b).length).toBe(0);
  });

  it("a chain of user constraints forms one island that sleeps and wakes together", () => {
    const space = new Space(new Vec2(0, 0));
    const bodies = [0, 1, 2, 3].map((i) => {
      const b = boxBody(i * 40, 0);
      b.space = space;
      return b;
    });
    const k = new Body(BodyType.KINEMATIC, new Vec2(-40, 0));
    k.shapes.add(new Circle(2));
    k.space = space;
    // join in an order that forces non-root components in the union-find
    new SameX(bodies[2], bodies[3]).space = space;
    new SameX(bodies[0], bodies[1]).space = space;
    new SameX(bodies[1], bodies[2]).space = space;
    new SameX(k, bodies[0]).space = space;
    for (let i = 0; i < Config.sleepDelay + 20; i++) space.step(DT);
    expect(bodies.every((b) => b.isSleeping)).toBe(true);
    bodies[3].velocity = new Vec2(5, 0);
    space.step(DT);
    expect(bodies.every((b) => !b.isSleeping)).toBe(true);
  });

  it("bodyImpulse before the first step is zero; after stepping it matches __impulse", () => {
    const space = new Space(new Vec2(0, 100));
    const b = boxBody(0, 0);
    b.space = space;
    const pin = new Pin(b, 0, 0, 0, 0);
    pin.space = space;
    const before = pin.bodyImpulse(b);
    expect(before.length).toBe(0);
    space.step(DT);
    const after = pin.bodyImpulse(b);
    expect(after.y).toBeCloseTo(-b.mass * 100 * DT, 4);
  });

  it("copy() throws 'not done yet' (unfinished in Haxe nape as well)", () => {
    const pin = new Pin(boxBody(), 0, 0, 0, 0);
    expect(() => pin.copy()).toThrow("not done yet");
  });

  it("__invalidate wakes a sleeping island", () => {
    const space = new Space(new Vec2(0, 0));
    const b = boxBody(0, 0);
    b.space = space;
    const pin = new Pin(b, 0, 0, 0, 0);
    pin.space = space;
    for (let i = 0; i < Config.sleepDelay + 20; i++) space.step(DT);
    expect(b.isSleeping).toBe(true);
    pin.px = 30;
    pin.__invalidate();
    for (let i = 0; i < 30; i++) space.step(DT);
    expect(b.position.x).toBeGreaterThan(20);
  });
});

// ---------------------------------------------------------------------------
// default abstract-method errors / wrapping
// ---------------------------------------------------------------------------

describe("UserConstraint defaults", () => {
  class Bare extends UserConstraint {
    constructor() {
      super(1);
    }
  }
  it.each([
    ["__copy", (c: Any) => c.__copy(), "UserConstraint::__copy must be overriden"],
    ["__position", (c: Any) => c.__position([0]), "UserConstraint::__position must be overriden"],
    ["__velocity", (c: Any) => c.__velocity([0]), "Userconstraint::__velocity must be overriden"],
    ["__eff_mass", (c: Any) => c.__eff_mass([0]), "UserConstraint::__eff_mass must be overriden"],
    [
      "__impulse",
      (c: Any) => c.__impulse([0], null, null),
      "UserConstraint::__impulse must be overriden",
    ],
  ] as [string, (c: Any) => unknown, string][])("%s throws", (_n, fn, msg) => {
    expect(() => fn(new Bare())).toThrow(msg);
  });

  it("optional hooks are no-ops", () => {
    const c = new Bare() as Any;
    expect(() => {
      c.__broken();
      c.__validate();
      c.__draw(null);
      c.__prepare();
      c.__clamp([1]);
    }).not.toThrow();
  });

  it("an un-overridden __velocity surfaces when stepping", () => {
    class NoVel extends UserConstraint {
      b: Body | null = null;
      constructor(b: Body) {
        super(1, true);
        this.b = this.__registerBody(this.b, b);
      }
      override __eff_mass(k: number[]): void {
        k[0] = 1;
      }
      override __impulse(_j: number[], _b: Body, out: Any): void {
        out.x = out.y = out.z = 0;
      }
    }
    const space = new Space();
    const b = boxBody();
    b.space = space;
    new NoVel(b).space = space;
    expect(() => space.step(DT)).toThrow("Userconstraint::__velocity must be overriden");
  });

  it("_wrap returns the existing wrapper for inner / outer references", () => {
    const pin = new Pin(boxBody(), 0, 0, 0, 0);
    expect(UserConstraint._wrap(null)).toBeNull();
    expect(UserConstraint._wrap(pin)).toBe(pin);
    expect(UserConstraint._wrap((pin as Any).zpp_inner)).toBe(pin);
    expect(UserConstraint._wrap({ zpp_inner: (pin as Any).zpp_inner })).toBe(pin);
  });
});
