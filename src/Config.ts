import { getNape } from "./core/engine";

/**
 * Physics engine configuration constants.
 *
 * These values tune the simulation's solver, collision detection, sleeping,
 * and CCD behaviour. Extracted from nape-compiled.js Priority 13.
 */
export const Config = {
  epsilon: 1e-8,
  fluidAngularDragFriction: 2.5,
  fluidAngularDrag: 100,
  fluidVacuumDrag: 0.5,
  fluidLinearDrag: 0.5,
  collisionSlop: 0.2,
  collisionSlopCCD: 0.5,
  distanceThresholdCCD: 0.05,
  staticCCDLinearThreshold: 0.05,
  staticCCDAngularThreshold: 0.005,
  bulletCCDLinearThreshold: 0.125,
  bulletCCDAngularThreshold: 0.0125,
  dynamicSweepLinearThreshold: 17,
  dynamicSweepAngularThreshold: 0.6,
  angularCCDSlipScale: 0.75,
  arbiterExpirationDelay: 6,
  staticFrictionThreshold: 2,
  elasticThreshold: 20,
  sleepDelay: 60,
  linearSleepThreshold: 0.2,
  angularSleepThreshold: 0.4,
  contactBiasCoef: 0.3,
  contactStaticBiasCoef: 0.6,
  contactContinuousBiasCoef: 0.4,
  contactContinuousStaticBiasCoef: 0.5,
  constraintLinearSlop: 0.1,
  constraintAngularSlop: 1e-3,
  illConditionedThreshold: 2e8,
};

const _napeConfig = getNape();
_napeConfig.Config = Object.assign(_napeConfig.Config || {}, Config);

