import { describe, it, expect } from "vitest";
import { Constraint } from "../../src/constraint/Constraint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { Vec2 } from "../../src/geom/Vec2";
import { getNape } from "../../src/core/engine";

describe("Constraint (P11 modernized)", () => {
  it("nape.constraint.Constraint is the TS Constraint class", () => {
    const nape = getNape();
    expect(nape.constraint.Constraint).toBe(Constraint);
  });

  it("Constraint.zpp_internalAlloc defaults to false", () => {
    expect(Constraint.zpp_internalAlloc).toBe(false);
  });

  it("joint instances are instanceof TS Constraint", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(joint).toBeInstanceOf(Constraint);
  });

  it("Constraint prototype.__class__ is Constraint", () => {
    // Each joint subclass sets __class__ on its own prototype; the Constraint
    // prototype itself should carry __class__ === Constraint.
    expect((Constraint.prototype as any).__class__).toBe(Constraint);
  });

  it("Constraint base properties work via joint instance", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(joint.debugDraw).toBe(true);
    expect(joint.active).toBe(true);
    expect(joint.stiff).toBe(true);
    expect(joint.maxForce).toBe(Infinity);
    expect(joint.maxError).toBe(Infinity);
    expect(joint.breakUnderForce).toBe(false);
    expect(joint.breakUnderError).toBe(false);
    expect(joint.removeOnBreak).toBe(true);
  });

  it("Constraint.space is null when not added", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(joint.space).toBeNull();
  });

  it("Constraint.compound is null by default", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(joint.compound).toBeNull();
  });

  it("Constraint.toString returns {Constraint}", () => {
    const joint = new DistanceJoint(null, null, new Vec2(0, 0), new Vec2(0, 0), 0, 100);
    expect(joint.toString()).toBe("{Constraint}");
  });

  it("TS Constraint class is a function (proper class)", () => {
    expect(typeof Constraint).toBe("function");
  });
});
