import { describe, it, expect } from "vitest";
import { Config } from "../src/Config";
import { getNape } from "../src/core/engine";

describe("Config (P13 modernized)", () => {
  it("exports all 29 physics constants", () => {
    expect(Config.epsilon).toBeCloseTo(1e-8);
    expect(Config.fluidAngularDragFriction).toBeCloseTo(2.5);
    expect(Config.fluidAngularDrag).toBe(100);
    expect(Config.fluidVacuumDrag).toBeCloseTo(0.5);
    expect(Config.fluidLinearDrag).toBeCloseTo(0.5);
    expect(Config.collisionSlop).toBeCloseTo(0.2);
    expect(Config.collisionSlopCCD).toBeCloseTo(0.5);
    expect(Config.distanceThresholdCCD).toBeCloseTo(0.05);
    expect(Config.staticCCDLinearThreshold).toBeCloseTo(0.05);
    expect(Config.staticCCDAngularThreshold).toBeCloseTo(0.005);
    expect(Config.bulletCCDLinearThreshold).toBeCloseTo(0.125);
    expect(Config.bulletCCDAngularThreshold).toBeCloseTo(0.0125);
    expect(Config.dynamicSweepLinearThreshold).toBe(17);
    expect(Config.dynamicSweepAngularThreshold).toBeCloseTo(0.6);
    expect(Config.angularCCDSlipScale).toBeCloseTo(0.75);
    expect(Config.arbiterExpirationDelay).toBe(6);
    expect(Config.staticFrictionThreshold).toBe(2);
    expect(Config.elasticThreshold).toBe(20);
    expect(Config.sleepDelay).toBe(60);
    expect(Config.linearSleepThreshold).toBeCloseTo(0.2);
    expect(Config.angularSleepThreshold).toBeCloseTo(0.4);
    expect(Config.contactBiasCoef).toBeCloseTo(0.3);
    expect(Config.contactStaticBiasCoef).toBeCloseTo(0.6);
    expect(Config.contactContinuousBiasCoef).toBeCloseTo(0.4);
    expect(Config.contactContinuousStaticBiasCoef).toBeCloseTo(0.5);
    expect(Config.constraintLinearSlop).toBeCloseTo(0.1);
    expect(Config.constraintAngularSlop).toBeCloseTo(1e-3);
    expect(Config.illConditionedThreshold).toBeCloseTo(2e8);
  });

  it("nape.Config reflects the TS Config values at runtime", () => {
    const napeConfig = getNape().Config;
    expect(napeConfig.epsilon).toBeCloseTo(Config.epsilon);
    expect(napeConfig.sleepDelay).toBe(Config.sleepDelay);
    expect(napeConfig.collisionSlop).toBeCloseTo(Config.collisionSlop);
    expect(napeConfig.illConditionedThreshold).toBeCloseTo(Config.illConditionedThreshold);
  });
});
