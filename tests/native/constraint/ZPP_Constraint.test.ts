import { describe, it, expect } from "vitest";
import { Space } from "../../../src/space/Space";
import { Body } from "../../../src/phys/Body";
import { BodyType } from "../../../src/phys/BodyType";
import { Vec2 } from "../../../src/geom/Vec2";
import { Circle } from "../../../src/shape/Circle";
import { AngleJoint } from "../../../src/constraint/AngleJoint";
import { MotorJoint } from "../../../src/constraint/MotorJoint";
import { DistanceJoint } from "../../../src/constraint/DistanceJoint";
import { PivotJoint } from "../../../src/constraint/PivotJoint";
import { WeldJoint } from "../../../src/constraint/WeldJoint";
import { LineJoint } from "../../../src/constraint/LineJoint";
import { PulleyJoint } from "../../../src/constraint/PulleyJoint";
import { ZPP_Constraint } from "../../../src/native/constraint/ZPP_Constraint";
import { ZPP_AngleJoint } from "../../../src/native/constraint/ZPP_AngleJoint";
import { ZPP_MotorJoint } from "../../../src/native/constraint/ZPP_MotorJoint";
import { ZPP_DistanceJoint } from "../../../src/native/constraint/ZPP_DistanceJoint";
import { ZPP_CopyHelper } from "../../../src/native/constraint/ZPP_CopyHelper";
import { ZPP_UserBody } from "../../../src/native/constraint/ZPP_UserBody";

// Force engine init
import "../../../src/core/engine";

describe("ZPP_Constraint (base class)", () => {
  it("should create with correct defaults", () => {
    const c = new ZPP_Constraint();
    expect(c.stiff).toBe(true);
    expect(c.active).toBe(true);
    expect(c.frequency).toBe(10);
    expect(c.damping).toBe(1);
    expect(c.maxForce).toBe(Infinity);
    expect(c.maxError).toBe(Infinity);
    expect(c.breakUnderForce).toBe(false);
    expect(c.removeOnBreak).toBe(true);
    expect(c.ignore).toBe(false);
    expect(c.__velocity).toBe(false);
    expect(c.pre_dt).toBe(-1.0);
    expect(c.outer).toBe(null);
    expect(c.space).toBe(null);
    expect(c.compound).toBe(null);
    expect(typeof c.id).toBe("number");
  });

  it("should have no-op hooks", () => {
    const c = new ZPP_Constraint();
    expect(c.activeBodies()).toBeUndefined();
    expect(c.inactiveBodies()).toBeUndefined();
    expect(c.clearcache()).toBeUndefined();
    expect(c.validate()).toBeUndefined();
    expect(c.wake_connected()).toBeUndefined();
    expect(c.forest()).toBeUndefined();
    expect(c.broken()).toBeUndefined();
    expect(c.warmStart()).toBeUndefined();
    expect(c.preStep(1)).toBe(false);
    expect(c.applyImpulseVel()).toBe(false);
    expect(c.applyImpulsePos()).toBe(false);
    expect(c.pair_exists(1, 2)).toBe(false);
    expect(c.copy(null, null)).toBe(null);
  });

  it("immutable_midstep should throw during space step", () => {
    const c = new ZPP_Constraint();
    c.space = { midstep: true } as any;
    expect(() => c.immutable_midstep("foo")).toThrow(
      "Constraint::foo cannot be set during space step()",
    );
  });

  it("immutable_midstep should not throw when not mid-step", () => {
    const c = new ZPP_Constraint();
    c.space = { midstep: false } as any;
    expect(() => c.immutable_midstep("foo")).not.toThrow();
  });

  it("wake should call space.wake_constraint if space set", () => {
    const c = new ZPP_Constraint();
    let called = false;
    c.space = {
      wake_constraint: () => {
        called = true;
      },
    } as any;
    c.wake();
    expect(called).toBe(true);
  });

  describe("_findRoot and _unionComponents", () => {
    it("should find root of single component", () => {
      const comp: any = { parent: null, rank: 0 };
      comp.parent = comp;
      expect(ZPP_Constraint._findRoot(comp)).toBe(comp);
    });

    it("should union two components", () => {
      const a: any = { parent: null, rank: 0 };
      a.parent = a;
      const b: any = { parent: null, rank: 0 };
      b.parent = b;
      ZPP_Constraint._unionComponents(a, b);
      const rootA = ZPP_Constraint._findRoot(a);
      const rootB = ZPP_Constraint._findRoot(b);
      expect(rootA).toBe(rootB);
    });

    it("should handle rank-based union", () => {
      const a: any = { parent: null, rank: 2 };
      a.parent = a;
      const b: any = { parent: null, rank: 0 };
      b.parent = b;
      ZPP_Constraint._unionComponents(a, b);
      expect(ZPP_Constraint._findRoot(b)).toBe(a);
    });
  });
});

describe("ZPP_AngleJoint", () => {
  it("should create with correct defaults", () => {
    const j = new ZPP_AngleJoint();
    expect(j.ratio).toBe(1);
    expect(j.jAcc).toBe(0);
    expect(j.slack).toBe(false);
    expect(j.jMax).toBe(Infinity);
    expect(j.stepped).toBe(false);
    expect(j.__velocity).toBe(false);
    expect(j.stiff).toBe(true);
  });

  it("is_slack should return true when in range", () => {
    const j = new ZPP_AngleJoint();
    j.jointMin = -1;
    j.jointMax = 1;
    j.equal = false;
    j.b1 = { rot: 0 };
    j.b2 = { rot: 0.5 };
    expect(j.is_slack()).toBe(true);
  });

  it("validate should throw with null bodies", () => {
    const j = new ZPP_AngleJoint();
    j.b1 = null;
    j.b2 = null;
    expect(() => j.validate()).toThrow("null bodies");
  });

  it("validate should throw with same body", () => {
    const body = { space: null, type: 2 };
    const j = new ZPP_AngleJoint();
    j.b1 = body;
    j.b2 = body;
    j.space = null;
    expect(() => j.validate()).toThrow("body1 == body2");
  });

  it("forest should union body components", () => {
    const j = new ZPP_AngleJoint();
    const comp1: any = { parent: null, rank: 0 };
    comp1.parent = comp1;
    const comp2: any = { parent: null, rank: 0 };
    comp2.parent = comp2;
    const compJ: any = { parent: null, rank: 0 };
    compJ.parent = compJ;
    j.b1 = { type: 2, component: comp1 };
    j.b2 = { type: 2, component: comp2 };
    j.component = compJ;
    j.forest();
    const root1 = ZPP_Constraint._findRoot(comp1);
    const root2 = ZPP_Constraint._findRoot(comp2);
    const rootJ = ZPP_Constraint._findRoot(compJ);
    expect(root1).toBe(rootJ);
    expect(root2).toBe(rootJ);
  });

  it("pair_exists should detect body pairs", () => {
    const j = new ZPP_AngleJoint();
    j.b1 = { id: 10 };
    j.b2 = { id: 20 };
    expect(j.pair_exists(10, 20)).toBe(true);
    expect(j.pair_exists(20, 10)).toBe(true);
    expect(j.pair_exists(10, 30)).toBe(false);
  });

  it("clearcache should reset accumulator", () => {
    const j = new ZPP_AngleJoint();
    j.jAcc = 5;
    j.pre_dt = 0.016;
    j.clearcache();
    expect(j.jAcc).toBe(0);
    expect(j.pre_dt).toBe(-1.0);
    expect(j.slack).toBe(false);
  });
});

describe("ZPP_MotorJoint", () => {
  it("should create with velocity mode enabled", () => {
    const j = new ZPP_MotorJoint();
    expect(j.__velocity).toBe(true);
    expect(j.jAcc).toBe(0);
    expect(j.stepped).toBe(false);
  });

  it("applyImpulsePos should return false", () => {
    const j = new ZPP_MotorJoint();
    expect(j.applyImpulsePos()).toBe(false);
  });
});

describe("ZPP_DistanceJoint", () => {
  it("should create with correct defaults", () => {
    const j = new ZPP_DistanceJoint();
    expect(j.a1localx).toBe(0);
    expect(j.a1localy).toBe(0);
    expect(j.a2localx).toBe(0);
    expect(j.a2localy).toBe(0);
    expect(j.jAcc).toBe(0);
    expect(j.jMax).toBe(Infinity);
    expect(j.stepped).toBe(false);
  });

  it("validate should throw with null bodies", () => {
    const j = new ZPP_DistanceJoint();
    j.b1 = null;
    j.b2 = null;
    expect(() => j.validate()).toThrow("null bodies");
  });
});

describe("ZPP_CopyHelper", () => {
  it("dict should create with id and bc", () => {
    const h = ZPP_CopyHelper.dict(42, "body");
    expect(h.id).toBe(42);
    expect(h.bc).toBe("body");
    expect(h.cb).toBe(null);
  });

  it("todo should create with id and cb", () => {
    const fn = () => {};
    const h = ZPP_CopyHelper.todo(7, fn);
    expect(h.id).toBe(7);
    expect(h.cb).toBe(fn);
    expect(h.bc).toBe(null);
  });
});

describe("ZPP_UserBody", () => {
  it("should construct with cnt and body", () => {
    const body = { id: 1 };
    const ub = new ZPP_UserBody(3, body);
    expect(ub.cnt).toBe(3);
    expect(ub.body).toBe(body);
  });
});

describe("Integration: Constraint public API", () => {
  it("AngleJoint should create and configure", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const j = new AngleJoint(b1, b2, -Math.PI, Math.PI, 1);
    expect(j.jointMin).toBeCloseTo(-Math.PI);
    expect(j.jointMax).toBeCloseTo(Math.PI);
    expect(j.ratio).toBeCloseTo(1);
  });

  it("MotorJoint should create and configure", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const j = new MotorJoint(b1, b2, 2.0, 1.0);
    expect(j.rate).toBeCloseTo(2.0);
    expect(j.ratio).toBeCloseTo(1.0);
  });

  it("DistanceJoint should create and configure", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const j = new DistanceJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0), 10, 50);
    expect(j.jointMin).toBeCloseTo(10);
    expect(j.jointMax).toBeCloseTo(50);
  });

  it("PivotJoint should create and configure", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const j = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    expect(j.body1).toBeDefined();
    expect(j.body2).toBeDefined();
  });

  it("WeldJoint should create and configure", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const j = new WeldJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0), 0);
    expect(j.phase).toBeCloseTo(0);
  });

  it("LineJoint should create and configure", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const j = new LineJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0), Vec2.get(0, 1), -10, 10);
    expect(j.jointMin).toBeCloseTo(-10);
    expect(j.jointMax).toBeCloseTo(10);
  });

  it("PulleyJoint should create and configure", () => {
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    const b3 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    const b4 = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    const j = new PulleyJoint(
      b1,
      b2,
      b3,
      b4,
      Vec2.get(0, 0),
      Vec2.get(10, 0),
      Vec2.get(0, 0),
      Vec2.get(0, 10),
      10,
      50,
      2.0,
    );
    expect(j.ratio).toBeCloseTo(2.0);
    expect(j.jointMin).toBeCloseTo(10);
    expect(j.jointMax).toBeCloseTo(50);
  });

  it("AngleJoint should work in a space simulation", () => {
    const space = new Space();
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const j = new AngleJoint(b1, b2, 0, 0, 1);
    j.space = space;

    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("DistanceJoint should work in a space simulation", () => {
    const space = new Space();
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const j = new DistanceJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0), 40, 60);
    j.space = space;

    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("PivotJoint should work in a space simulation", () => {
    const space = new Space();
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const j = new PivotJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0));
    j.space = space;

    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("MotorJoint should work in a space simulation", () => {
    const space = new Space();
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const j = new MotorJoint(b1, b2, 1.0, 1.0);
    j.space = space;

    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("WeldJoint should work in a space simulation", () => {
    const space = new Space();
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const j = new WeldJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0), 0);
    j.space = space;

    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("LineJoint should work in a space simulation", () => {
    const space = new Space();
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const j = new LineJoint(b1, b2, Vec2.get(0, 0), Vec2.get(0, 0), Vec2.get(0, 1), -10, 10);
    j.space = space;

    expect(() => space.step(1 / 60)).not.toThrow();
  });

  it("PulleyJoint should work in a space simulation", () => {
    const space = new Space();
    const b1 = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, new Vec2(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const b3 = new Body(BodyType.DYNAMIC, new Vec2(0, 50));
    b3.shapes.add(new Circle(10));
    b3.space = space;

    const b4 = new Body(BodyType.DYNAMIC, new Vec2(50, 50));
    b4.shapes.add(new Circle(10));
    b4.space = space;

    const j = new PulleyJoint(
      b1,
      b2,
      b3,
      b4,
      Vec2.get(0, 0),
      Vec2.get(0, 0),
      Vec2.get(0, 0),
      Vec2.get(0, 0),
      50,
      150,
      1.0,
    );
    j.space = space;

    expect(() => space.step(1 / 60)).not.toThrow();
  });
});
