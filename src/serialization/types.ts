/**
 * Snapshot types for the nape-js serialization API (P37).
 *
 * All types are plain JSON-serializable objects — no class instances, no
 * circular references, no functions.
 */

/** Schema version — bumped on breaking snapshot format changes. */
export const SNAPSHOT_VERSION = 1;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export interface Vec2Data {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Shape sub-objects
// ---------------------------------------------------------------------------

export interface MaterialData {
  elasticity: number;
  dynamicFriction: number;
  staticFriction: number;
  density: number;
  rollingFriction: number;
}

export interface FluidPropertiesData {
  density: number;
  viscosity: number;
  gravity: Vec2Data | null;
}

export interface InteractionFilterData {
  collisionGroup: number;
  collisionMask: number;
  sensorGroup: number;
  sensorMask: number;
  fluidGroup: number;
  fluidMask: number;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface CircleShapeData {
  type: "circle";
  radius: number;
  localCOM: Vec2Data;
  material: MaterialData;
  filter: InteractionFilterData;
  sensorEnabled: boolean;
  fluidEnabled: boolean;
  fluidProperties: FluidPropertiesData | null;
}

export interface PolygonShapeData {
  type: "polygon";
  localVerts: Vec2Data[];
  material: MaterialData;
  filter: InteractionFilterData;
  sensorEnabled: boolean;
  fluidEnabled: boolean;
  fluidProperties: FluidPropertiesData | null;
}

export interface CapsuleShapeData {
  type: "capsule";
  width: number;
  height: number;
  localCOM: Vec2Data;
  material: MaterialData;
  filter: InteractionFilterData;
  sensorEnabled: boolean;
  fluidEnabled: boolean;
  fluidProperties: FluidPropertiesData | null;
}

export type ShapeData = CircleShapeData | PolygonShapeData | CapsuleShapeData;

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export type BodyTypeData = "DYNAMIC" | "STATIC" | "KINEMATIC";
export type MassModeData = "DEFAULT" | "FIXED" | "FIXED_GROUP";
export type InertiaModeData = "DEFAULT" | "FIXED" | "FIXED_GROUP";
export type GravMassModeData = "DEFAULT" | "FIXED" | "SCALED";

export interface BodyData {
  /** Stable numeric ID used to reference this body from constraints. */
  id: number;
  type: BodyTypeData;
  position: Vec2Data;
  rotation: number;
  velocity: Vec2Data;
  angularVel: number;
  kinematicVel: Vec2Data;
  kinAngVel: number;
  surfaceVel: Vec2Data;
  force: Vec2Data;
  torque: number;
  massMode: MassModeData;
  /** Only present when massMode is "FIXED". */
  mass: number | null;
  inertiaMode: InertiaModeData;
  /** Only present when inertiaMode is "FIXED". */
  inertia: number | null;
  gravMassMode: GravMassModeData;
  gravMassScale: number;
  allowMovement: boolean;
  allowRotation: boolean;
  bullet: boolean;
  shapes: ShapeData[];
  userData: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

/** Properties shared by every constraint type. */
export interface ConstraintBaseData {
  /** Index into SpaceSnapshot.bodies, or null for a static world anchor. */
  body1Id: number | null;
  /** Index into SpaceSnapshot.bodies, or null for a static world anchor. */
  body2Id: number | null;
  active: boolean;
  ignore: boolean;
  stiff: boolean;
  frequency: number;
  damping: number;
  maxForce: number;
  maxError: number;
  breakUnderForce: boolean;
  breakUnderError: boolean;
  removeOnBreak: boolean;
  userData: Record<string, unknown> | null;
}

export interface PivotJointData extends ConstraintBaseData {
  type: "PivotJoint";
  anchor1: Vec2Data;
  anchor2: Vec2Data;
}

export interface DistanceJointData extends ConstraintBaseData {
  type: "DistanceJoint";
  anchor1: Vec2Data;
  anchor2: Vec2Data;
  jointMin: number;
  jointMax: number;
}

export interface AngleJointData extends ConstraintBaseData {
  type: "AngleJoint";
  jointMin: number;
  jointMax: number;
  ratio: number;
}

export interface MotorJointData extends ConstraintBaseData {
  type: "MotorJoint";
  rate: number;
  ratio: number;
}

export interface LineJointData extends ConstraintBaseData {
  type: "LineJoint";
  anchor1: Vec2Data;
  anchor2: Vec2Data;
  direction: Vec2Data;
  jointMin: number;
  jointMax: number;
}

export interface PulleyJointData extends ConstraintBaseData {
  type: "PulleyJoint";
  anchor1: Vec2Data;
  anchor2: Vec2Data;
  anchor3: Vec2Data;
  anchor4: Vec2Data;
  jointMin: number;
  jointMax: number;
  ratio: number;
}

export interface WeldJointData extends ConstraintBaseData {
  type: "WeldJoint";
  anchor1: Vec2Data;
  anchor2: Vec2Data;
  phase: number;
}

export type ConstraintData =
  | PivotJointData
  | DistanceJointData
  | AngleJointData
  | MotorJointData
  | LineJointData
  | PulleyJointData
  | WeldJointData;

// ---------------------------------------------------------------------------
// Compound
// ---------------------------------------------------------------------------

export interface CompoundData {
  /** Body IDs belonging to this compound. */
  bodyIds: number[];
  /** Constraint indices (into SpaceSnapshot.constraints) belonging to this compound. */
  constraintIndices: number[];
  /** Child compound indices (into SpaceSnapshot.compounds). */
  childIndices: number[];
}

// ---------------------------------------------------------------------------
// Space (root snapshot)
// ---------------------------------------------------------------------------

export interface SpaceSnapshot {
  version: typeof SNAPSHOT_VERSION;
  gravity: Vec2Data;
  worldLinearDrag: number;
  worldAngularDrag: number;
  sortContacts: boolean;
  broadphase: "SWEEP_AND_PRUNE" | "DYNAMIC_AABB_TREE";
  bodies: BodyData[];
  constraints: ConstraintData[];
  compounds: CompoundData[];
}
