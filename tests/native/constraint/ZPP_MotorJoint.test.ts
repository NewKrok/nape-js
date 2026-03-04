import { describe, it, expect, beforeEach, vi } from "vitest";
// Import engine first to break circular dependency, then Vec3 for bodyImpulse tests
import "../../../src/core/engine";
import "../../../src/geom/Vec3";
import { ZPP_MotorJoint } from "../../../src/native/constraint/ZPP_MotorJoint";
import { ZPP_Constraint } from "../../../src/native/constraint/ZPP_Constraint";
import { createMockZpp, createMockNape, MockZNPList } from "../_mocks";

/** Helper: create a mock body with solver fields. */
function createMockBody(
  opts: {
    id?: number;
    type?: number;
    rot?: number;
    angvel?: number;
    kinangvel?: number;
    sinertia?: number;
    iinertia?: number;
    space?: any;
  } = {},
) {
  const comp: any = { parent: null as any, rank: 0 };
  comp.parent = comp;
  return {
    id: opts.id ?? 1,
    type: opts.type ?? 2, // dynamic
    rot: opts.rot ?? 0,
    angvel: opts.angvel ?? 0,
    kinangvel: opts.kinangvel ?? 0,
    sinertia: opts.sinertia ?? 1.0,
    iinertia: opts.iinertia ?? 1.0,
    space: opts.space ?? null,
    constraints: new MockZNPList(),
    component: comp,
    wake: vi.fn(),
    outer: { zpp_inner: null as any },
  };
}

describe("ZPP_MotorJoint", () => {
  beforeEach(() => {
    ZPP_Constraint._zpp = createMockZpp();
    ZPP_Constraint._nape = createMockNape();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_MotorJoint.__name__).toEqual(["zpp_nape", "constraint", "ZPP_MotorJoint"]);
    });
  });

  describe("constructor / defaults", () => {
    it("should extend ZPP_Constraint", () => {
      const mj = new ZPP_MotorJoint();
      expect(mj).toBeInstanceOf(ZPP_Constraint);
    });

    it("should initialize joint-specific fields to defaults", () => {
      const mj = new ZPP_MotorJoint();
      expect(mj.ratio).toBe(0.0);
      expect(mj.rate).toBe(0.0);
      expect(mj.b1).toBeNull();
      expect(mj.b2).toBeNull();
      expect(mj.outer_zn).toBeNull();
    });

    it("should initialize solver fields to defaults", () => {
      const mj = new ZPP_MotorJoint();
      expect(mj.kMass).toBe(0.0);
      expect(mj.jAcc).toBe(0);
      expect(mj.jMax).toBe(0.0);
      expect(mj.stepped).toBe(false);
    });

    it("should set __velocity flag to true (velocity-only constraint)", () => {
      const mj = new ZPP_MotorJoint();
      expect(mj.__velocity).toBe(true);
    });

    it("should inherit base constraint defaults", () => {
      const mj = new ZPP_MotorJoint();
      expect(mj.stiff).toBe(true);
      expect(mj.active).toBe(true);
      expect(mj.maxForce).toBe(Infinity);
      expect(mj.pre_dt).toBe(-1.0);
    });

    it("should set __class__ to ZPP_MotorJoint", () => {
      const mj = new ZPP_MotorJoint();
      expect(mj.__class__).toBe(ZPP_MotorJoint);
    });
  });

  describe("activeBodies / inactiveBodies", () => {
    it("activeBodies should add constraint to both bodies", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody({ id: 1 });
      mj.b2 = createMockBody({ id: 2 });
      mj.activeBodies();
      expect(mj.b1.constraints.has(mj)).toBe(true);
      expect(mj.b2.constraints.has(mj)).toBe(true);
    });

    it("activeBodies should not double-add when b1 == b2", () => {
      const mj = new ZPP_MotorJoint();
      const body = createMockBody();
      mj.b1 = body;
      mj.b2 = body;
      mj.activeBodies();
      expect(body.constraints.length).toBe(1);
    });

    it("activeBodies should handle null bodies", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = null;
      mj.b2 = null;
      expect(() => mj.activeBodies()).not.toThrow();
    });

    it("inactiveBodies should remove constraint from both bodies", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody({ id: 1 });
      mj.b2 = createMockBody({ id: 2 });
      mj.b1.constraints.add(mj);
      mj.b2.constraints.add(mj);
      mj.inactiveBodies();
      expect(mj.b1.constraints.has(mj)).toBe(false);
      expect(mj.b2.constraints.has(mj)).toBe(false);
    });

    it("inactiveBodies should not double-remove when b1 == b2", () => {
      const mj = new ZPP_MotorJoint();
      const body = createMockBody();
      mj.b1 = body;
      mj.b2 = body;
      body.constraints.add(mj);
      mj.inactiveBodies();
      expect(body.constraints.has(mj)).toBe(false);
    });
  });

  describe("validate", () => {
    it("should throw if b1 is null", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = null;
      mj.b2 = createMockBody();
      expect(() => mj.validate()).toThrow("cannot be simulated null bodies");
    });

    it("should throw if b2 is null", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody();
      mj.b2 = null;
      expect(() => mj.validate()).toThrow("cannot be simulated null bodies");
    });

    it("should throw if b1 == b2", () => {
      const mj = new ZPP_MotorJoint();
      const body = createMockBody();
      mj.b1 = body;
      mj.b2 = body;
      expect(() => mj.validate()).toThrow("MotorJoint cannot be simulated with body1 == body2");
    });

    it("should throw if bodies are in different spaces", () => {
      const mj = new ZPP_MotorJoint();
      const space1 = {};
      const space2 = {};
      mj.space = space1;
      mj.b1 = createMockBody({ id: 1, space: space1 });
      mj.b2 = createMockBody({ id: 2, space: space2 });
      expect(() => mj.validate()).toThrow("Constraints must have each body within the same space");
    });

    it("should throw if both bodies are non-dynamic", () => {
      const mj = new ZPP_MotorJoint();
      const space = {};
      mj.space = space;
      mj.b1 = createMockBody({ id: 1, type: 0, space });
      mj.b2 = createMockBody({ id: 2, type: 1, space });
      expect(() => mj.validate()).toThrow("Constraints cannot have both bodies non-dynamic");
    });

    it("should not throw for valid configuration", () => {
      const mj = new ZPP_MotorJoint();
      const space = {};
      mj.space = space;
      mj.b1 = createMockBody({ id: 1, type: 2, space });
      mj.b2 = createMockBody({ id: 2, type: 2, space });
      expect(() => mj.validate()).not.toThrow();
    });

    it("should accept one static and one dynamic body", () => {
      const mj = new ZPP_MotorJoint();
      const space = {};
      mj.space = space;
      mj.b1 = createMockBody({ id: 1, type: 0, space }); // static
      mj.b2 = createMockBody({ id: 2, type: 2, space }); // dynamic
      expect(() => mj.validate()).not.toThrow();
    });
  });

  describe("wake_connected", () => {
    it("should wake dynamic bodies", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody({ type: 2 });
      mj.b2 = createMockBody({ type: 2 });
      mj.wake_connected();
      expect(mj.b1.wake).toHaveBeenCalled();
      expect(mj.b2.wake).toHaveBeenCalled();
    });

    it("should not wake non-dynamic bodies", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody({ type: 0 });
      mj.b2 = createMockBody({ type: 1 });
      mj.wake_connected();
      expect(mj.b1.wake).not.toHaveBeenCalled();
      expect(mj.b2.wake).not.toHaveBeenCalled();
    });

    it("should handle null bodies", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = null;
      mj.b2 = null;
      expect(() => mj.wake_connected()).not.toThrow();
    });
  });

  describe("pair_exists", () => {
    it("should return true for forward pair (b1.id, b2.id)", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody({ id: 10 });
      mj.b2 = createMockBody({ id: 20 });
      expect(mj.pair_exists(10, 20)).toBe(true);
    });

    it("should return true for reverse pair (b2.id, b1.id)", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody({ id: 10 });
      mj.b2 = createMockBody({ id: 20 });
      expect(mj.pair_exists(20, 10)).toBe(true);
    });

    it("should return false for unrelated ids", () => {
      const mj = new ZPP_MotorJoint();
      mj.b1 = createMockBody({ id: 10 });
      mj.b2 = createMockBody({ id: 20 });
      expect(mj.pair_exists(10, 30)).toBe(false);
      expect(mj.pair_exists(30, 20)).toBe(false);
      expect(mj.pair_exists(5, 6)).toBe(false);
    });
  });

  describe("clearcache", () => {
    it("should reset jAcc and pre_dt", () => {
      const mj = new ZPP_MotorJoint();
      mj.jAcc = 42;
      mj.pre_dt = 0.016;
      mj.clearcache();
      expect(mj.jAcc).toBe(0);
      expect(mj.pre_dt).toBe(-1.0);
    });
  });

  describe("preStep", () => {
    function setupJoint(
      opts: {
        ratio?: number;
        rate?: number;
        b1Sinertia?: number;
        b2Sinertia?: number;
        maxForce?: number;
      } = {},
    ) {
      const mj = new ZPP_MotorJoint();
      mj.ratio = opts.ratio ?? 1.0;
      mj.rate = opts.rate ?? 5.0;
      mj.maxForce = opts.maxForce ?? Infinity;
      mj.b1 = createMockBody({ sinertia: opts.b1Sinertia ?? 1.0 });
      mj.b2 = createMockBody({ sinertia: opts.b2Sinertia ?? 1.0 });
      return mj;
    }

    it("should initialize pre_dt on first call", () => {
      const mj = setupJoint();
      expect(mj.pre_dt).toBe(-1.0);
      mj.preStep(0.016);
      expect(mj.pre_dt).toBe(0.016);
    });

    it("should set stepped to true", () => {
      const mj = setupJoint();
      mj.preStep(0.016);
      expect(mj.stepped).toBe(true);
    });

    it("should compute kMass from inertias", () => {
      const mj = setupJoint({
        b1Sinertia: 2.0,
        b2Sinertia: 3.0,
        ratio: 1.0,
      });
      mj.preStep(0.016);
      // kMass = 1 / (b1.sinertia + ratio^2 * b2.sinertia) = 1 / (2 + 3) = 0.2
      expect(mj.kMass).toBeCloseTo(0.2);
    });

    it("should account for ratio^2 in kMass computation", () => {
      const mj = setupJoint({
        b1Sinertia: 1.0,
        b2Sinertia: 1.0,
        ratio: 2.0,
      });
      mj.preStep(0.016);
      // kMass = 1 / (1 + 4*1) = 1/5 = 0.2
      expect(mj.kMass).toBeCloseTo(0.2);
    });

    it("should scale jAcc by dtratio when dt changes", () => {
      const mj = setupJoint();
      mj.preStep(0.016);
      mj.jAcc = 10.0;
      mj.preStep(0.032); // dt doubled → dtratio = 2
      expect(mj.jAcc).toBeCloseTo(20.0);
    });

    it("should compute jMax from maxForce * dt", () => {
      const mj = setupJoint({ maxForce: 100 });
      mj.preStep(0.016);
      expect(mj.jMax).toBeCloseTo(100 * 0.016);
    });

    it("should always return false", () => {
      const mj = setupJoint();
      expect(mj.preStep(0.016)).toBe(false);
    });
  });

  describe("warmStart", () => {
    it("should apply accumulated impulse to both bodies", () => {
      const mj = new ZPP_MotorJoint();
      mj.jAcc = 5.0;
      mj.ratio = 1.0;
      mj.b1 = createMockBody({ angvel: 10, iinertia: 0.5 });
      mj.b2 = createMockBody({ angvel: 10, iinertia: 0.5 });

      mj.warmStart();

      // b1.angvel -= b1.iinertia * jAcc = 10 - 0.5*5 = 7.5
      expect(mj.b1.angvel).toBeCloseTo(7.5);
      // b2.angvel += ratio * b2.iinertia * jAcc = 10 + 1*0.5*5 = 12.5
      expect(mj.b2.angvel).toBeCloseTo(12.5);
    });

    it("should account for ratio in b2 impulse", () => {
      const mj = new ZPP_MotorJoint();
      mj.jAcc = 4.0;
      mj.ratio = 2.0;
      mj.b1 = createMockBody({ angvel: 0, iinertia: 1.0 });
      mj.b2 = createMockBody({ angvel: 0, iinertia: 1.0 });

      mj.warmStart();

      // b1.angvel -= 1.0 * 4.0 = -4.0
      expect(mj.b1.angvel).toBeCloseTo(-4.0);
      // b2.angvel += 2.0 * 1.0 * 4.0 = 8.0
      expect(mj.b2.angvel).toBeCloseTo(8.0);
    });
  });

  describe("applyImpulseVel", () => {
    function setupForVel(
      opts: {
        ratio?: number;
        rate?: number;
        kMass?: number;
        jAcc?: number;
        jMax?: number;
        breakUnderForce?: boolean;
        b1Angvel?: number;
        b2Angvel?: number;
        b1Kinangvel?: number;
        b2Kinangvel?: number;
      } = {},
    ) {
      const mj = new ZPP_MotorJoint();
      mj.ratio = opts.ratio ?? 1.0;
      mj.rate = opts.rate ?? 5.0;
      mj.kMass = opts.kMass ?? 1.0;
      mj.jAcc = opts.jAcc ?? 0;
      mj.jMax = opts.jMax ?? Infinity;
      mj.breakUnderForce = opts.breakUnderForce ?? false;
      mj.b1 = createMockBody({
        angvel: opts.b1Angvel ?? 0,
        kinangvel: opts.b1Kinangvel ?? 0,
        iinertia: 1.0,
      });
      mj.b2 = createMockBody({
        angvel: opts.b2Angvel ?? 0,
        kinangvel: opts.b2Kinangvel ?? 0,
        iinertia: 1.0,
      });
      return mj;
    }

    it("should compute velocity error from rate, ratio, and body velocities", () => {
      const mj = setupForVel({
        ratio: 1.0,
        rate: 5.0,
        kMass: 1.0,
        b1Angvel: 0,
        b2Angvel: 0,
      });
      // E = ratio*(b2.angvel + b2.kinangvel) - b1.angvel - b1.kinangvel - rate
      // E = 1*(0+0) - 0 - 0 - 5 = -5
      // j = -kMass * E = -1 * -5 = 5
      mj.applyImpulseVel();
      expect(mj.jAcc).toBeCloseTo(5.0);
    });

    it("should update body angular velocities after impulse", () => {
      const mj = setupForVel({
        ratio: 1.0,
        rate: 5.0,
        kMass: 1.0,
        b1Angvel: 0,
        b2Angvel: 0,
      });
      mj.applyImpulseVel();
      // j = 5, b1.angvel -= iinertia * j = -5
      expect(mj.b1.angvel).toBeCloseTo(-5.0);
      // b2.angvel += ratio * iinertia * j = 5
      expect(mj.b2.angvel).toBeCloseTo(5.0);
    });

    it("should clamp jAcc to [-jMax, jMax] when not breakUnderForce", () => {
      const mj = setupForVel({
        ratio: 1.0,
        rate: 1000,
        kMass: 1.0,
        jMax: 2.0,
        breakUnderForce: false,
      });
      mj.applyImpulseVel();
      expect(mj.jAcc).toBeLessThanOrEqual(2.0);
      expect(mj.jAcc).toBeGreaterThanOrEqual(-2.0);
    });

    it("should return true (break) when breakUnderForce and jAcc exceeds jMax", () => {
      const mj = setupForVel({
        ratio: 1.0,
        rate: 1000,
        kMass: 1.0,
        jMax: 0.001,
        breakUnderForce: true,
      });
      expect(mj.applyImpulseVel()).toBe(true);
    });

    it("should return false in normal operation", () => {
      const mj = setupForVel();
      expect(mj.applyImpulseVel()).toBe(false);
    });

    it("should account for kinematic angular velocity", () => {
      const mj = setupForVel({
        ratio: 1.0,
        rate: 0,
        kMass: 1.0,
        b1Angvel: 0,
        b2Angvel: 0,
        b1Kinangvel: 3.0,
        b2Kinangvel: 3.0,
      });
      // E = 1*(0+3) - 0 - 3 - 0 = 0 → j = 0
      mj.applyImpulseVel();
      expect(mj.jAcc).toBeCloseTo(0);
    });

    it("should clamp negative jAcc to -jMax", () => {
      const mj = setupForVel({
        ratio: 1.0,
        rate: -1000,
        kMass: 1.0,
        jMax: 2.0,
        breakUnderForce: false,
      });
      mj.applyImpulseVel();
      expect(mj.jAcc).toBeGreaterThanOrEqual(-2.0);
    });
  });

  describe("applyImpulsePos", () => {
    it("should always return false (velocity-only constraint)", () => {
      const mj = new ZPP_MotorJoint();
      expect(mj.applyImpulsePos()).toBe(false);
    });
  });

  describe("bodyImpulse", () => {
    it("should return zero Vec3 when not stepped", () => {
      const mj = new ZPP_MotorJoint();
      mj.stepped = false;
      const vec3 = mj.bodyImpulse(mj.b1);
      expect(vec3.z).toBe(0);
    });

    it("should return -jAcc for b1 when stepped", () => {
      const mj = new ZPP_MotorJoint();
      mj.stepped = true;
      mj.jAcc = 5.0;
      mj.ratio = 1.0;
      const b1 = createMockBody();
      mj.b1 = b1;
      mj.b2 = createMockBody({ id: 2 });
      const vec3 = mj.bodyImpulse(b1);
      expect(vec3.z).toBeCloseTo(-5.0);
    });

    it("should return ratio*jAcc for b2 when stepped", () => {
      const mj = new ZPP_MotorJoint();
      mj.stepped = true;
      mj.jAcc = 5.0;
      mj.ratio = 2.0;
      const b2 = createMockBody({ id: 2 });
      mj.b1 = createMockBody({ id: 1 });
      mj.b2 = b2;
      const vec3 = mj.bodyImpulse(b2);
      expect(vec3.z).toBeCloseTo(10.0);
    });
  });

  describe("forest (union-find)", () => {
    it("should union b1 component with constraint component when b1 is dynamic", () => {
      const mj = new ZPP_MotorJoint();
      const comp1: any = { parent: null as any, rank: 0 };
      comp1.parent = comp1;
      const comp2: any = { parent: null as any, rank: 0 };
      comp2.parent = comp2;
      const compC: any = { parent: null as any, rank: 0 };
      compC.parent = compC;

      mj.b1 = createMockBody({ type: 2 });
      mj.b1.component = comp1;
      mj.b2 = createMockBody({ type: 0 }); // non-dynamic
      mj.b2.component = comp2;
      mj.component = compC;

      mj.forest();

      function findRoot(c: any): any {
        while (c !== c.parent) c = c.parent;
        return c;
      }
      expect(findRoot(comp1)).toBe(findRoot(compC));
      // b2 non-dynamic, should NOT be unioned
      expect(findRoot(comp2)).toBe(comp2);
    });

    it("should union both bodies when both are dynamic", () => {
      const mj = new ZPP_MotorJoint();
      const comp1: any = { parent: null as any, rank: 0 };
      comp1.parent = comp1;
      const comp2: any = { parent: null as any, rank: 0 };
      comp2.parent = comp2;
      const compC: any = { parent: null as any, rank: 0 };
      compC.parent = compC;

      mj.b1 = createMockBody({ type: 2 });
      mj.b1.component = comp1;
      mj.b2 = createMockBody({ type: 2 });
      mj.b2.component = comp2;
      mj.component = compC;

      mj.forest();

      function findRoot(c: any): any {
        while (c !== c.parent) c = c.parent;
        return c;
      }
      const root = findRoot(compC);
      expect(findRoot(comp1)).toBe(root);
      expect(findRoot(comp2)).toBe(root);
    });
  });
});
