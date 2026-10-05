/**
 * Global tuning constants of the physics engine — the same fields and
 * defaults as Haxe nape's `nape.Config`.
 *
 * The engine reads these on every use, so assigning a field takes effect
 * immediately for **every** `Space` in the process. Change them once at
 * startup, before creating spaces, and only when you know which behaviour you
 * are tuning: the defaults are balanced against each other.
 *
 * Config is not part of `spaceToJSON` / `spaceToBinary` snapshots, and it is
 * an input to the simulation: two runs only reproduce each other (replay,
 * rollback, determinism tests) with the same values.
 *
 * @example
 * ```ts
 * import { Config } from "@newkrok/nape-js";
 *
 * Config.sleepDelay = 30;            // fall asleep after 30 quiet steps, not 60
 * Config.linearSleepThreshold = 0.5; // ...and count slower motion as quiet
 * ```
 */
export const Config = {
  /** General numerical tolerance (degenerate geometry, near-zero lengths). */
  epsilon: 1e-8,
  /** Friction scale of fluid drag on angular velocity. */
  fluidAngularDragFriction: 2.5,
  /** Fluid drag coefficient on angular velocity. */
  fluidAngularDrag: 100,
  /** Drag factor on the trailing edges of a submerged shape (edges facing away from the flow). */
  fluidVacuumDrag: 0.5,
  /** Fluid drag coefficient on linear velocity. */
  fluidLinearDrag: 0.5,
  /** Penetration (px) tolerated before contacts push shapes apart. */
  collisionSlop: 0.2,
  /** Penetration (px) a continuous (CCD) sweep stops at. */
  collisionSlopCCD: 0.5,
  /** Separation (px) at which a CCD sweep counts as a time of impact. */
  distanceThresholdCCD: 0.05,
  /** Per-step motion, as a fraction of the body's sweep radius, above which CCD against static bodies kicks in. */
  staticCCDLinearThreshold: 0.05,
  /** Per-step rotation (rad) above which CCD against static bodies kicks in. */
  staticCCDAngularThreshold: 0.005,
  /** As `staticCCDLinearThreshold`, for bullet bodies against dynamic bodies. */
  bulletCCDLinearThreshold: 0.125,
  /** As `staticCCDAngularThreshold`, for bullet bodies against dynamic bodies. */
  bulletCCDAngularThreshold: 0.0125,
  /** Relative displacement (px) below which a dynamic pair is resolved without a sweep. */
  dynamicSweepLinearThreshold: 17,
  /** Relative rotation below which a dynamic pair is resolved without a sweep. */
  dynamicSweepAngularThreshold: 0.6,
  /** Scale applied to angular velocity during CCD sweeps, so a spinning body slips instead of locking. */
  angularCCDSlipScale: 0.75,
  /** Steps a contact is kept after its shapes stop touching (warm starting). */
  arbiterExpirationDelay: 6,
  /** Relative tangent speed below which static friction applies instead of dynamic friction. */
  staticFrictionThreshold: 2,
  /** Normal impact speed below which elasticity is ignored, so resting contacts don't jitter. */
  elasticThreshold: 20,
  /** Steps a body must stay below the sleep thresholds before it falls asleep. */
  sleepDelay: 60,
  /** Linear speed below which a body counts as resting for sleeping. */
  linearSleepThreshold: 0.2,
  /** Angular speed below which a body counts as resting for sleeping. */
  angularSleepThreshold: 0.4,
  /** Position-correction strength of contacts. */
  contactBiasCoef: 0.3,
  /** Position-correction strength of contacts against static bodies. */
  contactStaticBiasCoef: 0.6,
  /** Position-correction strength of continuous (CCD) contacts. */
  contactContinuousBiasCoef: 0.4,
  /** Position-correction strength of continuous (CCD) contacts against static bodies. */
  contactContinuousStaticBiasCoef: 0.5,
  /** Positional error (px) a constraint tolerates before correcting it. */
  constraintLinearSlop: 0.1,
  /** Angular error (rad) a constraint tolerates before correcting it. */
  constraintAngularSlop: 1e-3,
  /** Condition number above which a constraint or contact matrix is treated as ill-conditioned. */
  illConditionedThreshold: 2e8,
};

/** The shape of {@link Config}: every engine tuning constant. */
export type NapeConfig = typeof Config;
