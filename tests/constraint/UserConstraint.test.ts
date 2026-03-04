import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { UserConstraint } from "../../src/constraint/UserConstraint";

type Any = any;

/**
 * A simple 1-DOF test constraint — trivial (velocity error always 0).
 */
class TestConstraint extends UserConstraint {
  private _body1: Body | null = null;
  prepareCalled = false;
  validateCalled = false;

  constructor(body1: Body | null, dim = 1, velOnly = false) {
    super(dim, velOnly);
    this.body1 = body1;
  }

  get body1(): Body | null { return this._body1; }
  set body1(value: Body | null) { this._body1 = this.__registerBody(this._body1, value); }

  __copy() { return new TestConstraint(this._body1); }
  __validate() { this.validateCalled = true; }
  __prepare() { this.prepareCalled = true; }
  __position(err: number[]) { for (let i = 0; i < err.length; i++) err[i] = 0; }
  __velocity(err: number[]) { for (let i = 0; i < err.length; i++) err[i] = 0; }
  __eff_mass(eff: number[]) { eff[0] = (this._body1 as Any)?.zpp_inner?.imass ?? 1; }
  __impulse(imp: number[], _body: Body, out: Any) {
    out.zpp_inner.x = imp[0]; out.zpp_inner.y = 0; out.zpp_inner.z = 0;
  }
}

/**
 * A two-body constraint that maintains target distance (for simulation tests).
 */
class TwoBodyConstraint extends UserConstraint {
  private _body1: Body | null = null;
  private _body2: Body | null = null;
  targetDistance: number;

  constructor(body1: Body | null, body2: Body | null, targetDistance: number) {
    super(1);
    this.targetDistance = targetDistance;
    this.body1 = body1;
    this.body2 = body2;
  }

  get body1(): Body | null { return this._body1; }
  set body1(value: Body | null) { this._body1 = this.__registerBody(this._body1, value); }
  get body2(): Body | null { return this._body2; }
  set body2(value: Body | null) { this._body2 = this.__registerBody(this._body2, value); }

  __copy() { return new TwoBodyConstraint(this._body1, this._body2, this.targetDistance); }

  __position(err: number[]) {
    const b1 = (this._body1 as Any).zpp_inner;
    const b2 = (this._body2 as Any).zpp_inner;
    const dx = b2.posx - b1.posx;
    const dy = b2.posy - b1.posy;
    err[0] = Math.sqrt(dx * dx + dy * dy) - this.targetDistance;
  }

  __velocity(err: number[]) {
    const b1 = (this._body1 as Any).zpp_inner;
    const b2 = (this._body2 as Any).zpp_inner;
    const dx = b2.posx - b1.posx;
    const dy = b2.posy - b1.posy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) { err[0] = 0; return; }
    const nx = dx / dist;
    const ny = dy / dist;
    err[0] = (b2.velx - b1.velx) * nx + (b2.vely - b1.vely) * ny;
  }

  __eff_mass(eff: number[]) {
    const b1 = (this._body1 as Any).zpp_inner;
    const b2 = (this._body2 as Any).zpp_inner;
    eff[0] = b1.imass + b2.imass;
  }

  __impulse(imp: number[], body: Body, out: Any) {
    const b1 = (this._body1 as Any).zpp_inner;
    const b2 = (this._body2 as Any).zpp_inner;
    const dx = b2.posx - b1.posx;
    const dy = b2.posy - b1.posy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) {
      out.zpp_inner.x = 0; out.zpp_inner.y = 0; out.zpp_inner.z = 0;
      return;
    }
    const nx = dx / dist;
    const ny = dy / dist;
    const sign = body === this._body1 ? -1 : 1;
    out.zpp_inner.x = sign * imp[0] * nx;
    out.zpp_inner.y = sign * imp[0] * ny;
    out.zpp_inner.z = 0;
  }
}

describe("UserConstraint", () => {
  it("should create a user constraint with specified dimensions", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const c = new TestConstraint(body1);
    expect(c.body1).toBe(body1);
    expect(c.zpp_inner.dim).toBe(1);
  });

  it("should reject dimension < 1", () => {
    expect(() => new TestConstraint(null, 0)).toThrow("Constraint dimension must be at least 1");
  });

  it("should support velocity-only mode", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    expect(new TestConstraint(body1, 1, true).zpp_inner.velonly).toBe(true);
  });

  it("should support base constraint properties", () => {
    const c = new TestConstraint(new Body(BodyType.DYNAMIC, new Vec2(0, 0)));
    expect(c.active).toBe(true);
    c.active = false;
    expect(c.active).toBe(false);
    c.active = true;
    c.maxForce = 500;
    expect(c.maxForce).toBeCloseTo(500);
    c.maxError = 10;
    expect(c.maxError).toBeCloseTo(10);
    c.breakUnderForce = true;
    expect(c.breakUnderForce).toBe(true);
    c.removeOnBreak = true;
    expect(c.removeOnBreak).toBe(true);
  });

  it("should support stiff and soft modes", () => {
    const c = new TestConstraint(new Body(BodyType.DYNAMIC, new Vec2(0, 0)));
    expect(c.stiff).toBe(true);
    c.stiff = false;
    expect(c.stiff).toBe(false);
    c.frequency = 15;
    expect(c.frequency).toBeCloseTo(15);
    c.damping = 0.8;
    expect(c.damping).toBeCloseTo(0.8);
  });

  it("should register and unregister bodies via __registerBody", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    const c = new TwoBodyConstraint(body1, body2, 100);
    expect(c.zpp_inner.bodies.length).toBe(2);

    const body3 = new Body(BodyType.DYNAMIC, new Vec2(200, 0));
    c.body2 = body3;
    expect(c.body2).toBe(body3);
    expect(c.zpp_inner.bodies.length).toBe(2);
  });

  it("should visitBodies calling lambda for each unique body", () => {
    const body1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const body2 = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    const c = new TwoBodyConstraint(body1, body2, 100);

    const visited: Body[] = [];
    c.visitBodies((body) => visited.push(body));
    expect(visited.length).toBe(2);
    expect(visited).toContain(body1);
    expect(visited).toContain(body2);
  });

  it("should throw on bodyImpulse with null body", () => {
    const c = new TestConstraint(new Body(BodyType.DYNAMIC, new Vec2(0, 0)));
    expect(() => c.bodyImpulse(null!)).toThrow("Cannot evaluate impulse on null body");
  });

  it("should throw on bodyImpulse with unlinked body", () => {
    const c = new TestConstraint(new Body(BodyType.DYNAMIC, new Vec2(0, 0)));
    expect(() => c.bodyImpulse(new Body(BodyType.DYNAMIC, new Vec2(50, 50))))
      .toThrow("Body is not linked to this constraint");
  });

  it("should return impulse as a MatMN", () => {
    const c = new TestConstraint(new Body(BodyType.DYNAMIC, new Vec2(0, 0)));
    const imp = c.impulse();
    expect(imp).toBeDefined();
    expect(imp.zpp_inner.m).toBe(1);
    expect(imp.zpp_inner.n).toBe(1);
  });

  it("should bind Vec2 with invalidation callback", () => {
    const c = new TestConstraint(new Body(BodyType.DYNAMIC, new Vec2(0, 0)));
    const bound = c.__bindVec2();
    expect(bound).toBeDefined();
    expect((bound as Any).zpp_inner._inuse).toBe(true);
    expect((bound as Any).zpp_inner._invalidate).toBeDefined();
  });

  it("should get zpp_inner_zn as alias for zpp_inner", () => {
    const c = new TestConstraint(new Body(BodyType.DYNAMIC, new Vec2(0, 0)));
    expect(c.zpp_inner_zn).toBe(c.zpp_inner);
  });

  it("should call __validate and __prepare during simulation", () => {
    const space = new Space(new Vec2(0, 0));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(5));
    body.space = space;
    const c = new TestConstraint(body);
    c.space = space;
    space.step(1 / 60, 10, 10);
    expect(c.validateCalled).toBe(true);
    expect(c.prepareCalled).toBe(true);
  });

  it("should support setting space to null", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(5));
    body.space = space;
    const c = new TestConstraint(body);
    c.space = space;
    expect(c.space).not.toBeNull();
    c.space = null;
    expect(c.space).toBeNull();
  });

  it("should work in a simulation with two bodies", () => {
    const space = new Space(new Vec2(0, 100));

    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    const bob = new Body(BodyType.DYNAMIC, new Vec2(80, 0));
    bob.shapes.add(new Circle(5));
    bob.space = space;

    const c = new TwoBodyConstraint(anchor, bob, 80);
    c.space = space;

    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    const dx = bob.position.x - anchor.position.x;
    const dy = bob.position.y - anchor.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(70);
    expect(dist).toBeLessThan(90);
  });
});
