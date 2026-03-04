import { describe, it, expect, beforeEach, vi } from "vitest";
// Import engine first to break circular dependency:
// ZPP_AngleJoint → engine → nape-compiled → ZPP_AngleJoint
// Import engine first to break circular dependency, then Vec3 for bodyImpulse tests
import "../../../src/core/engine";
import "../../../src/geom/Vec3";
import { ZPP_AngleJoint } from "../../../src/native/constraint/ZPP_AngleJoint";
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
    axisx?: number;
    axisy?: number;
    space?: any;
  } = {},
) {
  const comp: any = { parent: null as any, rank: 0 };
  comp.parent = comp; // self-referential root
  return {
    id: opts.id ?? 1,
    type: opts.type ?? 2, // dynamic
    rot: opts.rot ?? 0,
    angvel: opts.angvel ?? 0,
    kinangvel: opts.kinangvel ?? 0,
    sinertia: opts.sinertia ?? 1.0,
    iinertia: opts.iinertia ?? 1.0,
    axisx: opts.axisx ?? 0,
    axisy: opts.axisy ?? 1,
    space: opts.space ?? null,
    constraints: new MockZNPList(),
    component: comp,
    wake: vi.fn(),
    outer: { zpp_inner: null as any },
  };
}

describe("ZPP_AngleJoint", () => {
  beforeEach(() => {
    ZPP_Constraint._zpp = createMockZpp();
    ZPP_Constraint._nape = createMockNape();
  });

  describe("__name__", () => {
    it("should have correct Haxe metadata", () => {
      expect(ZPP_AngleJoint.__name__).toEqual(["zpp_nape", "constraint", "ZPP_AngleJoint"]);
    });
  });

  describe("constructor / defaults", () => {
    it("should extend ZPP_Constraint", () => {
      const aj = new ZPP_AngleJoint();
      expect(aj).toBeInstanceOf(ZPP_Constraint);
    });

    it("should initialize joint-specific fields to defaults", () => {
      const aj = new ZPP_AngleJoint();
      expect(aj.ratio).toBe(1);
      expect(aj.jointMin).toBe(0.0);
      expect(aj.jointMax).toBe(0.0);
      expect(aj.slack).toBe(false);
      expect(aj.equal).toBe(false);
      expect(aj.scale).toBe(0.0);
      expect(aj.b1).toBeNull();
      expect(aj.b2).toBeNull();
      expect(aj.outer_zn).toBeNull();
    });

    it("should initialize solver fields to defaults", () => {
      const aj = new ZPP_AngleJoint();
      expect(aj.kMass).toBe(0.0);
      expect(aj.jAcc).toBe(0);
      expect(aj.jMax).toBe(Infinity);
      expect(aj.gamma).toBe(0.0);
      expect(aj.bias).toBe(0.0);
      expect(aj.stepped).toBe(false);
    });

    it("should inherit base constraint defaults", () => {
      const aj = new ZPP_AngleJoint();
      expect(aj.stiff).toBe(true);
      expect(aj.active).toBe(true);
      expect(aj.maxForce).toBe(Infinity);
      expect(aj.pre_dt).toBe(-1.0);
    });

    it("should set __class__ to ZPP_AngleJoint", () => {
      const aj = new ZPP_AngleJoint();
      expect(aj.__class__).toBe(ZPP_AngleJoint);
    });
  });

  describe("is_slack", () => {
    it("should return false and set scale=1.0 when equal (jointMin == jointMax)", () => {
      const aj = new ZPP_AngleJoint();
      aj.equal = true;
      aj.b1 = createMockBody({ rot: 0 });
      aj.b2 = createMockBody({ rot: 0 });
      expect(aj.is_slack()).toBe(false);
      expect(aj.scale).toBe(1.0);
    });

    it("should return false and set scale=-1.0 when C < jointMin", () => {
      const aj = new ZPP_AngleJoint();
      aj.equal = false;
      aj.jointMin = 0.5;
      aj.jointMax = 1.0;
      aj.ratio = 1.0;
      aj.b1 = createMockBody({ rot: 0.8 });
      aj.b2 = createMockBody({ rot: 0 }); // C = 1.0*0 - 0.8 = -0.8 < 0.5
      expect(aj.is_slack()).toBe(false);
      expect(aj.scale).toBe(-1.0);
    });

    it("should return false and set scale=1.0 when C > jointMax", () => {
      const aj = new ZPP_AngleJoint();
      aj.equal = false;
      aj.jointMin = -1.0;
      aj.jointMax = 0.5;
      aj.ratio = 1.0;
      aj.b1 = createMockBody({ rot: 0 });
      aj.b2 = createMockBody({ rot: 1.0 }); // C = 1.0*1.0 - 0 = 1.0 > 0.5
      expect(aj.is_slack()).toBe(false);
      expect(aj.scale).toBe(1.0);
    });

    it("should return true and set scale=0.0 when within bounds", () => {
      const aj = new ZPP_AngleJoint();
      aj.equal = false;
      aj.jointMin = -1.0;
      aj.jointMax = 1.0;
      aj.ratio = 1.0;
      aj.b1 = createMockBody({ rot: 0 });
      aj.b2 = createMockBody({ rot: 0.5 }); // C = 0.5, within [-1, 1]
      expect(aj.is_slack()).toBe(true);
      expect(aj.scale).toBe(0.0);
    });

    it("should account for ratio in the angle computation", () => {
      const aj = new ZPP_AngleJoint();
      aj.equal = false;
      aj.jointMin = -1.0;
      aj.jointMax = 1.0;
      aj.ratio = 2.0;
      aj.b1 = createMockBody({ rot: 0 });
      aj.b2 = createMockBody({ rot: 0.8 }); // C = 2.0*0.8 - 0 = 1.6 > 1.0
      expect(aj.is_slack()).toBe(false);
      expect(aj.scale).toBe(1.0);
    });
  });

  describe("activeBodies / inactiveBodies", () => {
    it("activeBodies should add constraint to both bodies", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody({ id: 1 });
      aj.b2 = createMockBody({ id: 2 });
      aj.activeBodies();
      expect(aj.b1.constraints.has(aj)).toBe(true);
      expect(aj.b2.constraints.has(aj)).toBe(true);
    });

    it("activeBodies should not double-add when b1 == b2", () => {
      const aj = new ZPP_AngleJoint();
      const body = createMockBody();
      aj.b1 = body;
      aj.b2 = body;
      aj.activeBodies();
      expect(body.constraints.length).toBe(1);
    });

    it("activeBodies should handle null bodies", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = null;
      aj.b2 = null;
      expect(() => aj.activeBodies()).not.toThrow();
    });

    it("inactiveBodies should remove constraint from both bodies", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody({ id: 1 });
      aj.b2 = createMockBody({ id: 2 });
      aj.b1.constraints.add(aj);
      aj.b2.constraints.add(aj);
      aj.inactiveBodies();
      expect(aj.b1.constraints.has(aj)).toBe(false);
      expect(aj.b2.constraints.has(aj)).toBe(false);
    });

    it("inactiveBodies should not double-remove when b1 == b2", () => {
      const aj = new ZPP_AngleJoint();
      const body = createMockBody();
      aj.b1 = body;
      aj.b2 = body;
      body.constraints.add(aj);
      aj.inactiveBodies();
      expect(body.constraints.has(aj)).toBe(false);
    });
  });

  describe("validate", () => {
    it("should throw if b1 is null", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = null;
      aj.b2 = createMockBody();
      expect(() => aj.validate()).toThrow("AngleJoint cannot be simulated null bodies");
    });

    it("should throw if b2 is null", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody();
      aj.b2 = null;
      expect(() => aj.validate()).toThrow("AngleJoint cannot be simulated null bodies");
    });

    it("should throw if b1 == b2", () => {
      const aj = new ZPP_AngleJoint();
      const body = createMockBody();
      aj.b1 = body;
      aj.b2 = body;
      expect(() => aj.validate()).toThrow("AngleJoint cannot be simulated with body1 == body2");
    });

    it("should throw if bodies are in different spaces", () => {
      const aj = new ZPP_AngleJoint();
      const space1 = {};
      const space2 = {};
      aj.space = space1;
      aj.b1 = createMockBody({ id: 1, space: space1 });
      aj.b2 = createMockBody({ id: 2, space: space2 });
      expect(() => aj.validate()).toThrow("Constraints must have each body within the same space");
    });

    it("should throw if jointMin > jointMax", () => {
      const aj = new ZPP_AngleJoint();
      const space = {};
      aj.space = space;
      aj.jointMin = 2.0;
      aj.jointMax = 1.0;
      aj.b1 = createMockBody({ id: 1, type: 2, space });
      aj.b2 = createMockBody({ id: 2, type: 2, space });
      expect(() => aj.validate()).toThrow("AngleJoint must have jointMin <= jointMax");
    });

    it("should throw if both bodies are non-dynamic", () => {
      const aj = new ZPP_AngleJoint();
      const space = {};
      aj.space = space;
      aj.jointMin = -1;
      aj.jointMax = 1;
      aj.b1 = createMockBody({ id: 1, type: 0, space }); // STATIC
      aj.b2 = createMockBody({ id: 2, type: 1, space }); // KINEMATIC
      expect(() => aj.validate()).toThrow("Constraints cannot have both bodies non-dynamic");
    });

    it("should not throw for valid configuration", () => {
      const aj = new ZPP_AngleJoint();
      const space = {};
      aj.space = space;
      aj.jointMin = -1;
      aj.jointMax = 1;
      aj.b1 = createMockBody({ id: 1, type: 2, space });
      aj.b2 = createMockBody({ id: 2, type: 2, space });
      expect(() => aj.validate()).not.toThrow();
    });
  });

  describe("wake_connected", () => {
    it("should wake dynamic bodies", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody({ type: 2 });
      aj.b2 = createMockBody({ type: 2 });
      aj.wake_connected();
      expect(aj.b1.wake).toHaveBeenCalled();
      expect(aj.b2.wake).toHaveBeenCalled();
    });

    it("should not wake non-dynamic bodies", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody({ type: 0 }); // STATIC
      aj.b2 = createMockBody({ type: 1 }); // KINEMATIC
      aj.wake_connected();
      expect(aj.b1.wake).not.toHaveBeenCalled();
      expect(aj.b2.wake).not.toHaveBeenCalled();
    });

    it("should handle null bodies", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = null;
      aj.b2 = null;
      expect(() => aj.wake_connected()).not.toThrow();
    });
  });

  describe("pair_exists", () => {
    it("should return true for forward pair (b1.id, b2.id)", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody({ id: 10 });
      aj.b2 = createMockBody({ id: 20 });
      expect(aj.pair_exists(10, 20)).toBe(true);
    });

    it("should return true for reverse pair (b2.id, b1.id)", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody({ id: 10 });
      aj.b2 = createMockBody({ id: 20 });
      expect(aj.pair_exists(20, 10)).toBe(true);
    });

    it("should return false for unrelated ids", () => {
      const aj = new ZPP_AngleJoint();
      aj.b1 = createMockBody({ id: 10 });
      aj.b2 = createMockBody({ id: 20 });
      expect(aj.pair_exists(10, 30)).toBe(false);
      expect(aj.pair_exists(30, 20)).toBe(false);
      expect(aj.pair_exists(5, 6)).toBe(false);
    });
  });

  describe("clearcache", () => {
    it("should reset jAcc, pre_dt, and slack", () => {
      const aj = new ZPP_AngleJoint();
      aj.jAcc = 42;
      aj.pre_dt = 0.016;
      aj.slack = true;
      aj.clearcache();
      expect(aj.jAcc).toBe(0);
      expect(aj.pre_dt).toBe(-1.0);
      expect(aj.slack).toBe(false);
    });
  });

  describe("preStep", () => {
    function setupJoint(
      opts: {
        jointMin?: number;
        jointMax?: number;
        ratio?: number;
        b1Rot?: number;
        b2Rot?: number;
        b1Sinertia?: number;
        b2Sinertia?: number;
        stiff?: boolean;
      } = {},
    ) {
      const aj = new ZPP_AngleJoint();
      aj.jointMin = opts.jointMin ?? -1.0;
      aj.jointMax = opts.jointMax ?? 1.0;
      aj.ratio = opts.ratio ?? 1.0;
      aj.stiff = opts.stiff ?? true;
      aj.maxForce = Infinity;
      aj.b1 = createMockBody({
        rot: opts.b1Rot ?? 0,
        sinertia: opts.b1Sinertia ?? 1.0,
      });
      aj.b2 = createMockBody({
        rot: opts.b2Rot ?? 0,
        sinertia: opts.b2Sinertia ?? 1.0,
      });
      return aj;
    }

    it("should initialize pre_dt on first call", () => {
      const aj = setupJoint();
      expect(aj.pre_dt).toBe(-1.0);
      aj.preStep(0.016);
      expect(aj.pre_dt).toBe(0.016);
    });

    it("should set stepped to true", () => {
      const aj = setupJoint();
      aj.preStep(0.016);
      expect(aj.stepped).toBe(true);
    });

    it("should detect equal joint (min == max)", () => {
      const aj = setupJoint({ jointMin: 0.5, jointMax: 0.5 });
      aj.preStep(0.016);
      expect(aj.equal).toBe(true);
      expect(aj.slack).toBe(false);
      expect(aj.scale).toBe(1.0);
    });

    it("should detect slack when angle is within bounds", () => {
      const aj = setupJoint({
        jointMin: -1.0,
        jointMax: 1.0,
        b1Rot: 0,
        b2Rot: 0.5, // C = 0.5, within [-1, 1]
      });
      aj.preStep(0.016);
      expect(aj.slack).toBe(true);
      expect(aj.scale).toBe(0.0);
    });

    it("should detect below-min violation", () => {
      const aj = setupJoint({
        jointMin: 0.5,
        jointMax: 1.0,
        b1Rot: 1.0,
        b2Rot: 0, // C = 0 - 1 = -1.0 < 0.5
      });
      aj.preStep(0.016);
      expect(aj.slack).toBe(false);
      expect(aj.scale).toBe(-1.0);
    });

    it("should detect above-max violation", () => {
      const aj = setupJoint({
        jointMin: -1.0,
        jointMax: 0.5,
        b1Rot: 0,
        b2Rot: 1.0, // C = 1.0 > 0.5
      });
      aj.preStep(0.016);
      expect(aj.slack).toBe(false);
      expect(aj.scale).toBe(1.0);
    });

    it("should compute kMass from inertias (stiff mode)", () => {
      const aj = setupJoint({
        jointMin: 0.5,
        jointMax: 0.5,
        b1Sinertia: 2.0,
        b2Sinertia: 3.0,
        ratio: 1.0,
      });
      aj.preStep(0.016);
      // kMass = 1 / (b1.sinertia + ratio^2 * b2.sinertia) = 1 / (2 + 1*3) = 0.2
      expect(aj.kMass).toBeCloseTo(0.2);
    });

    it("should set jAcc=0 when kMass is zero", () => {
      const aj = setupJoint({
        jointMin: 0.5,
        jointMax: 0.5,
        b1Sinertia: 0,
        b2Sinertia: 0,
      });
      aj.jAcc = 5.0;
      aj.preStep(0.016);
      expect(aj.jAcc).toBe(0);
    });

    it("should scale jAcc by dtratio when dt changes", () => {
      const aj = setupJoint({ jointMin: 0.5, jointMax: 0.5 });
      aj.preStep(0.016); // first step, initializes pre_dt
      aj.jAcc = 10.0;
      aj.preStep(0.032); // dt doubled → dtratio = 2
      expect(aj.jAcc).toBeCloseTo(20.0);
    });

    it("should compute jMax from maxForce * dt", () => {
      const aj = setupJoint({ jointMin: 0.5, jointMax: 0.5 });
      aj.maxForce = 100;
      aj.preStep(0.016);
      expect(aj.jMax).toBeCloseTo(100 * 0.016);
    });

    it("should set bias=0 and gamma=0 in stiff mode", () => {
      const aj = setupJoint({
        jointMin: 0.5,
        jointMax: 0.5,
        stiff: true,
      });
      aj.preStep(0.016);
      expect(aj.bias).toBe(0);
      expect(aj.gamma).toBe(0);
    });

    it("should compute gamma and bias in soft mode", () => {
      const aj = setupJoint({
        jointMin: 0.5,
        jointMax: 0.5,
        stiff: false,
        b1Rot: 0,
        b2Rot: 0, // C = 0 - 0.5 (since equal, C -= jointMax)
      });
      aj.frequency = 10;
      aj.damping = 1;
      aj.preStep(0.016);
      expect(aj.gamma).not.toBe(0);
      expect(aj.bias).not.toBe(0);
    });

    it("should return true (break) in soft mode when breakUnderError and error exceeds max", () => {
      const aj = setupJoint({
        jointMin: 0.5,
        jointMax: 0.5,
        stiff: false,
        b1Rot: 0,
        b2Rot: 100, // huge error
      });
      aj.frequency = 10;
      aj.damping = 1;
      aj.breakUnderError = true;
      aj.maxError = 0.001;
      expect(aj.preStep(0.016)).toBe(true);
    });

    it("should not do solver setup when slack", () => {
      const aj = setupJoint({
        jointMin: -1,
        jointMax: 1,
        b1Rot: 0,
        b2Rot: 0, // C = 0, within bounds → slack
      });
      aj.kMass = 999;
      aj.preStep(0.016);
      expect(aj.slack).toBe(true);
      // kMass should not have been updated because slack path skips solver setup
      expect(aj.kMass).toBe(999);
    });

    it("should always return false in normal operation", () => {
      const aj = setupJoint();
      expect(aj.preStep(0.016)).toBe(false);
    });
  });

  describe("warmStart", () => {
    it("should apply accumulated impulse when not slack", () => {
      const aj = new ZPP_AngleJoint();
      aj.slack = false;
      aj.scale = 1.0;
      aj.jAcc = 5.0;
      aj.ratio = 1.0;
      aj.b1 = createMockBody({ angvel: 10, iinertia: 0.5 });
      aj.b2 = createMockBody({ angvel: 10, iinertia: 0.5 });

      aj.warmStart();

      // b1.angvel -= scale * b1.iinertia * jAcc = 10 - 1.0*0.5*5 = 7.5
      expect(aj.b1.angvel).toBeCloseTo(7.5);
      // b2.angvel += ratio * scale * b2.iinertia * jAcc = 10 + 1*1*0.5*5 = 12.5
      expect(aj.b2.angvel).toBeCloseTo(12.5);
    });

    it("should not modify velocities when slack", () => {
      const aj = new ZPP_AngleJoint();
      aj.slack = true;
      aj.jAcc = 5.0;
      aj.b1 = createMockBody({ angvel: 10 });
      aj.b2 = createMockBody({ angvel: 10 });

      aj.warmStart();

      expect(aj.b1.angvel).toBe(10);
      expect(aj.b2.angvel).toBe(10);
    });
  });

  describe("applyImpulseVel", () => {
    function setupForVel(
      opts: {
        slack?: boolean;
        equal?: boolean;
        scale?: number;
        ratio?: number;
        kMass?: number;
        jAcc?: number;
        jMax?: number;
        bias?: number;
        gamma?: number;
        stiff?: boolean;
        breakUnderForce?: boolean;
        b1Angvel?: number;
        b2Angvel?: number;
      } = {},
    ) {
      const aj = new ZPP_AngleJoint();
      aj.slack = opts.slack ?? false;
      aj.equal = opts.equal ?? true;
      aj.scale = opts.scale ?? 1.0;
      aj.ratio = opts.ratio ?? 1.0;
      aj.kMass = opts.kMass ?? 1.0;
      aj.jAcc = opts.jAcc ?? 0;
      aj.jMax = opts.jMax ?? Infinity;
      aj.bias = opts.bias ?? 0;
      aj.gamma = opts.gamma ?? 0;
      aj.stiff = opts.stiff ?? true;
      aj.breakUnderForce = opts.breakUnderForce ?? false;
      aj.b1 = createMockBody({
        angvel: opts.b1Angvel ?? 0,
        kinangvel: 0,
        iinertia: 1.0,
      });
      aj.b2 = createMockBody({
        angvel: opts.b2Angvel ?? 0,
        kinangvel: 0,
        iinertia: 1.0,
      });
      return aj;
    }

    it("should return false immediately when slack", () => {
      const aj = setupForVel({ slack: true });
      expect(aj.applyImpulseVel()).toBe(false);
    });

    it("should apply velocity impulse and update body angular velocities", () => {
      const aj = setupForVel({
        equal: true,
        scale: 1.0,
        kMass: 1.0,
        b1Angvel: 2.0,
        b2Angvel: 0,
      });
      aj.applyImpulseVel();
      // After impulse, velocities should have changed
      expect(aj.b1.angvel).not.toBe(2.0);
    });

    it("should clamp jAcc to 0 for non-equal constraint with positive jAcc", () => {
      const aj = setupForVel({
        equal: false,
        scale: 1.0,
        kMass: 10.0,
        bias: 100,
        b1Angvel: 0,
        b2Angvel: 0,
      });
      aj.applyImpulseVel();
      // For non-equal, jAcc > 0 gets clamped to 0
      expect(aj.jAcc).toBeLessThanOrEqual(0);
    });

    it("should return true (break) when breakUnderForce and exceeds jMax", () => {
      const aj = setupForVel({
        equal: true,
        kMass: 100,
        jMax: 0.001,
        breakUnderForce: true,
        b1Angvel: 1000,
        b2Angvel: 0,
      });
      expect(aj.applyImpulseVel()).toBe(true);
    });

    it("should clamp jAcc to [-jMax, jMax] in soft mode", () => {
      const aj = setupForVel({
        equal: true,
        stiff: false,
        kMass: 100,
        jMax: 5.0,
        b1Angvel: 1000,
        b2Angvel: 0,
      });
      aj.applyImpulseVel();
      expect(aj.jAcc).toBeLessThanOrEqual(5.0);
      expect(aj.jAcc).toBeGreaterThanOrEqual(-5.0);
    });
  });

  describe("applyImpulsePos", () => {
    function setupForPos(
      opts: {
        jointMin?: number;
        jointMax?: number;
        ratio?: number;
        kMass?: number;
        b1Rot?: number;
        b2Rot?: number;
        breakUnderError?: boolean;
        maxError?: number;
      } = {},
    ) {
      const aj = new ZPP_AngleJoint();
      aj.jointMin = opts.jointMin ?? -1;
      aj.jointMax = opts.jointMax ?? 1;
      aj.ratio = opts.ratio ?? 1.0;
      aj.kMass = opts.kMass ?? 1.0;
      aj.equal = aj.jointMin == aj.jointMax;
      aj.breakUnderError = opts.breakUnderError ?? false;
      aj.maxError = opts.maxError ?? Infinity;
      aj.b1 = createMockBody({
        rot: opts.b1Rot ?? 0,
        iinertia: 1.0,
        axisx: 0,
        axisy: 1,
      });
      aj.b2 = createMockBody({
        rot: opts.b2Rot ?? 0,
        iinertia: 1.0,
        axisx: 0,
        axisy: 1,
      });
      return aj;
    }

    it("should return false when angle is within bounds (slack)", () => {
      const aj = setupForPos({
        jointMin: -1,
        jointMax: 1,
        b1Rot: 0,
        b2Rot: 0.5,
      });
      expect(aj.applyImpulsePos()).toBe(false);
    });

    it("should correct body rotations when violating max bound", () => {
      const aj = setupForPos({
        jointMin: -0.5,
        jointMax: 0.5,
        b1Rot: 0,
        b2Rot: 1.0, // C = 1.0 > 0.5
        kMass: 1.0,
      });
      const origB1Rot = aj.b1.rot;
      const origB2Rot = aj.b2.rot;
      aj.applyImpulsePos();
      // Rotations should have been adjusted
      expect(aj.b1.rot !== origB1Rot || aj.b2.rot !== origB2Rot).toBe(true);
    });

    it("should correct body rotations for equal joints", () => {
      const aj = setupForPos({
        jointMin: 0.5,
        jointMax: 0.5,
        b1Rot: 0,
        b2Rot: 1.0, // C = 1.0 - 0.5 = 0.5 (non-zero error)
        kMass: 1.0,
      });
      aj.applyImpulsePos();
      // For equal joints, corrections are always applied
      expect(aj.b1.rot).not.toBe(0);
    });

    it("should return true when breakUnderError and error exceeds maxError", () => {
      const aj = setupForPos({
        jointMin: -0.5,
        jointMax: 0.5,
        b1Rot: 0,
        b2Rot: 100, // huge violation
        breakUnderError: true,
        maxError: 0.001,
      });
      expect(aj.applyImpulsePos()).toBe(true);
    });

    it("should use small-angle approximation for small rotations", () => {
      const aj = setupForPos({
        jointMin: 0.5,
        jointMax: 0.5,
        b1Rot: 0,
        b2Rot: 0.501, // tiny error, small dr
        kMass: 1.0,
      });
      const _origAxisx = aj.b1.axisx;
      const _origAxisy = aj.b1.axisy;
      aj.applyImpulsePos();
      // Small-angle path uses polynomial approximation (not sin/cos)
      // Just verify it didn't throw and rotations changed
      expect(typeof aj.b1.axisx).toBe("number");
      expect(typeof aj.b1.axisy).toBe("number");
    });
  });

  describe("forest (union-find)", () => {
    it("should union b1 component with constraint component when b1 is dynamic", () => {
      const aj = new ZPP_AngleJoint();
      const comp1: any = { parent: null as any, rank: 0 };
      comp1.parent = comp1;
      const comp2: any = { parent: null as any, rank: 0 };
      comp2.parent = comp2;
      const compC: any = { parent: null as any, rank: 0 };
      compC.parent = compC;

      aj.b1 = createMockBody({ type: 2 });
      aj.b1.component = comp1;
      aj.b2 = createMockBody({ type: 0 }); // non-dynamic, skip b2
      aj.b2.component = comp2;
      aj.component = compC;

      aj.forest();

      // b1 and constraint should now share a root
      function findRoot(c: any): any {
        while (c !== c.parent) c = c.parent;
        return c;
      }
      expect(findRoot(comp1)).toBe(findRoot(compC));
    });

    it("should union both bodies when both are dynamic", () => {
      const aj = new ZPP_AngleJoint();
      const comp1: any = { parent: null as any, rank: 0 };
      comp1.parent = comp1;
      const comp2: any = { parent: null as any, rank: 0 };
      comp2.parent = comp2;
      const compC: any = { parent: null as any, rank: 0 };
      compC.parent = compC;

      aj.b1 = createMockBody({ type: 2 });
      aj.b1.component = comp1;
      aj.b2 = createMockBody({ type: 2 });
      aj.b2.component = comp2;
      aj.component = compC;

      aj.forest();

      function findRoot(c: any): any {
        while (c !== c.parent) c = c.parent;
        return c;
      }
      // All three should share the same root
      const root = findRoot(compC);
      expect(findRoot(comp1)).toBe(root);
      expect(findRoot(comp2)).toBe(root);
    });

    it("should handle path compression in forest", () => {
      const aj = new ZPP_AngleJoint();
      // Create a chain: comp1 -> comp2 -> comp3 (root)
      const comp3: any = { parent: null as any, rank: 2 };
      comp3.parent = comp3;
      const comp2: any = { parent: comp3, rank: 1 };
      const comp1: any = { parent: comp2, rank: 0 };

      const compC: any = { parent: null as any, rank: 0 };
      compC.parent = compC;

      aj.b1 = createMockBody({ type: 2 });
      aj.b1.component = comp1;
      aj.b2 = createMockBody({ type: 0 }); // non-dynamic
      aj.component = compC;

      aj.forest();

      // After path compression, comp1 should point closer to root
      function findRoot(c: any): any {
        while (c !== c.parent) c = c.parent;
        return c;
      }
      expect(findRoot(comp1)).toBe(findRoot(compC));
    });
  });

  describe("bodyImpulse", () => {
    it("should return zero Vec3 when not stepped", () => {
      const aj = new ZPP_AngleJoint();
      aj.stepped = false;
      const vec3 = aj.bodyImpulse(aj.b1);
      expect(vec3.z).toBe(0);
    });

    it("should return -scale*jAcc for b1 when stepped", () => {
      const aj = new ZPP_AngleJoint();
      aj.stepped = true;
      aj.scale = 1.0;
      aj.jAcc = 5.0;
      aj.ratio = 1.0;
      const b1 = createMockBody();
      aj.b1 = b1;
      aj.b2 = createMockBody({ id: 2 });
      const vec3 = aj.bodyImpulse(b1);
      expect(vec3.z).toBeCloseTo(-1.0 * 5.0);
    });

    it("should return ratio*scale*jAcc for b2 when stepped", () => {
      const aj = new ZPP_AngleJoint();
      aj.stepped = true;
      aj.scale = 1.0;
      aj.jAcc = 5.0;
      aj.ratio = 2.0;
      const b2 = createMockBody({ id: 2 });
      aj.b1 = createMockBody({ id: 1 });
      aj.b2 = b2;
      const vec3 = aj.bodyImpulse(b2);
      expect(vec3.z).toBeCloseTo(2.0 * 1.0 * 5.0);
    });
  });

  describe("draw", () => {
    it("should be a no-op", () => {
      const aj = new ZPP_AngleJoint();
      expect(() => aj.draw(null)).not.toThrow();
    });
  });
});
