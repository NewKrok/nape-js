/**
 * spaceToJSON — converts a live Space into a plain JSON-serializable SpaceSnapshot.
 *
 * UserConstraint instances are skipped (not serializable).
 * userData values are included only when JSON.stringify can round-trip them.
 */

import type { Space } from "../space/Space";
import type { Body } from "../phys/Body";
import type { Shape } from "../shape/Shape";
import type { Circle } from "../shape/Circle";
import type { Polygon } from "../shape/Polygon";
import type { Capsule } from "../shape/Capsule";
import type { Constraint } from "../constraint/Constraint";
import type { PivotJoint } from "../constraint/PivotJoint";
import type { DistanceJoint } from "../constraint/DistanceJoint";
import type { AngleJoint } from "../constraint/AngleJoint";
import type { MotorJoint } from "../constraint/MotorJoint";
import type { LineJoint } from "../constraint/LineJoint";
import type { PulleyJoint } from "../constraint/PulleyJoint";
import type { WeldJoint } from "../constraint/WeldJoint";
import type { Compound } from "../phys/Compound";
import type { Material } from "../phys/Material";
import type { FluidProperties } from "../phys/FluidProperties";
import type { InteractionFilter } from "../dynamics/InteractionFilter";
import {
  SNAPSHOT_VERSION,
  type SpaceSnapshot,
  type BodyData,
  type ShapeData,
  type CircleShapeData,
  type PolygonShapeData,
  type CapsuleShapeData,
  type ConstraintData,
  type ConstraintBaseData,
  type CompoundData,
  type Vec2Data,
  type MaterialData,
  type FluidPropertiesData,
  type InteractionFilterData,
  type BodyTypeData,
  type MassModeData,
  type InertiaModeData,
  type GravMassModeData,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function vec2(v: { x: number; y: number }): Vec2Data {
  return { x: v.x, y: v.y };
}

function safeUserData(ud: Record<string, unknown> | null): Record<string, unknown> | null {
  if (ud == null) return null;
  try {
    const json = JSON.stringify(ud);
    if (json === "{}") return null;
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function serializeMaterial(m: Material): MaterialData {
  return {
    elasticity: m.elasticity,
    dynamicFriction: m.dynamicFriction,
    staticFriction: m.staticFriction,
    density: m.density,
    rollingFriction: m.rollingFriction,
  };
}

function serializeFilter(f: InteractionFilter): InteractionFilterData {
  return {
    collisionGroup: f.collisionGroup,
    collisionMask: f.collisionMask,
    sensorGroup: f.sensorGroup,
    sensorMask: f.sensorMask,
    fluidGroup: f.fluidGroup,
    fluidMask: f.fluidMask,
  };
}

function serializeFluidProps(fp: FluidProperties | null): FluidPropertiesData | null {
  if (fp == null) return null;
  const grav = fp.gravity;
  return {
    density: fp.density,
    viscosity: fp.viscosity,
    gravity: grav != null ? vec2(grav) : null,
  };
}

function serializeShape(shape: Shape): ShapeData {
  const mat = serializeMaterial(shape.material);
  const filter = serializeFilter(shape.filter);
  const fluidEnabled = shape.fluidEnabled;
  const fluidProperties = fluidEnabled ? serializeFluidProps(shape.fluidProperties) : null;
  const sensorEnabled = shape.sensorEnabled;

  if (shape.isCircle()) {
    const c = shape as Circle;
    const lcom = shape.localCOM;
    return {
      type: "circle",
      radius: c.radius,
      localCOM: vec2(lcom),
      material: mat,
      filter,
      sensorEnabled,
      fluidEnabled,
      fluidProperties,
    } satisfies CircleShapeData;
  } else if (shape.isCapsule()) {
    const cap = shape as unknown as Capsule;
    const lcom = shape.localCOM;
    return {
      type: "capsule",
      width: cap.width,
      height: cap.height,
      localCOM: vec2(lcom),
      material: mat,
      filter,
      sensorEnabled,
      fluidEnabled,
      fluidProperties,
    } satisfies CapsuleShapeData;
  } else {
    const p = shape as Polygon;
    const verts = p.localVerts;
    const vertsArr: Vec2Data[] = [];
    const count = verts.length;
    for (let i = 0; i < count; i++) {
      vertsArr.push(vec2(verts.at(i)));
    }
    return {
      type: "polygon",
      localVerts: vertsArr,
      material: mat,
      filter,
      sensorEnabled,
      fluidEnabled,
      fluidProperties,
    } satisfies PolygonShapeData;
  }
}

const BODY_TYPES: Record<number, BodyTypeData> = { 1: "STATIC", 2: "DYNAMIC", 3: "KINEMATIC" };
const MASS_MODES: Record<number, MassModeData> = { 0: "DEFAULT", 1: "FIXED", 2: "FIXED_GROUP" };
const INERTIA_MODES: Record<number, InertiaModeData> = {
  0: "DEFAULT",
  1: "FIXED",
  2: "FIXED_GROUP",
};
const GRAV_MASS_MODES: Record<number, GravMassModeData> = { 0: "DEFAULT", 1: "FIXED", 2: "SCALED" };

function serializeBody(body: Body, id: number): BodyData {
  const zpp = body.zpp_inner;
  const massMode = MASS_MODES[zpp.massMode] ?? "DEFAULT";
  const inertiaMode = INERTIA_MODES[zpp.inertiaMode] ?? "DEFAULT";
  const gravMassMode = GRAV_MASS_MODES[zpp.gravMassMode] ?? "DEFAULT";

  const shapes: ShapeData[] = [];
  const shapeList = body.shapes;
  const shapeCount = shapeList.length;
  for (let i = 0; i < shapeCount; i++) {
    shapes.push(serializeShape(shapeList.at(i)));
  }

  return {
    id,
    type: BODY_TYPES[zpp.type] ?? "DYNAMIC",
    position: vec2(body.position),
    rotation: body.rotation,
    velocity: vec2(body.velocity),
    angularVel: body.angularVel,
    kinematicVel: vec2(body.kinematicVel),
    kinAngVel: body.kinAngVel,
    surfaceVel: vec2(body.surfaceVel),
    force: vec2(body.force),
    torque: zpp.type === 2 ? body.torque : 0,
    massMode,
    mass: massMode === "FIXED" ? zpp.cmass : null,
    inertiaMode,
    inertia: inertiaMode === "FIXED" ? zpp.cinertia : null,
    gravMassMode,
    gravMassScale: zpp.gravMassScale,
    allowMovement: body.allowMovement,
    allowRotation: body.allowRotation,
    bullet: body.isBullet,
    shapes,
    userData: safeUserData(zpp.userData),
  };
}

function serializeConstraintBase(
  c: Constraint,
  zppBodyIdToIndex: Map<number, number>,
  body1: Body | null,
  body2: Body | null,
): ConstraintBaseData {
  const zpp = c.zpp_inner;
  const b1Id = body1 != null ? (zppBodyIdToIndex.get(body1.zpp_inner.id) ?? null) : null;
  const b2Id = body2 != null ? (zppBodyIdToIndex.get(body2.zpp_inner.id) ?? null) : null;
  return {
    body1Id: b1Id,
    body2Id: b2Id,
    active: zpp.active,
    ignore: zpp.ignore,
    stiff: zpp.stiff,
    frequency: zpp.frequency,
    damping: zpp.damping,
    maxForce: zpp.maxForce,
    maxError: zpp.maxError,
    breakUnderForce: zpp.breakUnderForce,
    breakUnderError: zpp.breakUnderError,
    removeOnBreak: zpp.removeOnBreak,
    userData: safeUserData(zpp.userData),
  };
}

function serializeConstraint(
  c: Constraint,
  zppBodyIdToIndex: Map<number, number>,
): ConstraintData | null {
  const typeName = (c as any).constructor?.name ?? "";

  switch (typeName) {
    case "PivotJoint": {
      const j = c as PivotJoint;
      const base = serializeConstraintBase(c, zppBodyIdToIndex, j.body1, j.body2);
      return { ...base, type: "PivotJoint", anchor1: vec2(j.anchor1), anchor2: vec2(j.anchor2) };
    }
    case "DistanceJoint": {
      const j = c as DistanceJoint;
      const base = serializeConstraintBase(c, zppBodyIdToIndex, j.body1, j.body2);
      return {
        ...base,
        type: "DistanceJoint",
        anchor1: vec2(j.anchor1),
        anchor2: vec2(j.anchor2),
        jointMin: j.jointMin,
        jointMax: j.jointMax,
      };
    }
    case "AngleJoint": {
      const j = c as AngleJoint;
      const base = serializeConstraintBase(c, zppBodyIdToIndex, j.body1, j.body2);
      return {
        ...base,
        type: "AngleJoint",
        jointMin: j.jointMin,
        jointMax: j.jointMax,
        ratio: j.ratio,
      };
    }
    case "MotorJoint": {
      const j = c as MotorJoint;
      const base = serializeConstraintBase(c, zppBodyIdToIndex, j.body1, j.body2);
      return { ...base, type: "MotorJoint", rate: j.rate, ratio: j.ratio };
    }
    case "LineJoint": {
      const j = c as LineJoint;
      const base = serializeConstraintBase(c, zppBodyIdToIndex, j.body1, j.body2);
      return {
        ...base,
        type: "LineJoint",
        anchor1: vec2(j.anchor1),
        anchor2: vec2(j.anchor2),
        direction: vec2(j.direction),
        jointMin: j.jointMin,
        jointMax: j.jointMax,
      };
    }
    case "PulleyJoint": {
      const j = c as PulleyJoint;
      const base = serializeConstraintBase(c, zppBodyIdToIndex, j.body1, j.body2);
      return {
        ...base,
        type: "PulleyJoint",
        anchor1: vec2(j.anchor1),
        anchor2: vec2(j.anchor2),
        anchor3: vec2(j.anchor3),
        anchor4: vec2(j.anchor4),
        jointMin: j.jointMin,
        jointMax: j.jointMax,
        ratio: j.ratio,
      };
    }
    case "WeldJoint": {
      const j = c as WeldJoint;
      const base = serializeConstraintBase(c, zppBodyIdToIndex, j.body1, j.body2);
      return {
        ...base,
        type: "WeldJoint",
        anchor1: vec2(j.anchor1),
        anchor2: vec2(j.anchor2),
        phase: j.phase,
      };
    }
    default:
      // UserConstraint or unknown — skip
      return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialize the complete state of a Space into a plain JSON-serializable object.
 *
 * - Bodies (position, velocity, shapes, mass, etc.) are fully captured.
 * - Constraints are captured except for UserConstraint (not serializable).
 * - Compounds are captured as groupings of body IDs and constraint indices.
 * - Arbiters (collision contacts) are NOT captured — they are reconstructed
 *   by the engine on the next simulation step.
 * - userData is included only for fields that survive a JSON round-trip.
 *
 * @example
 * ```ts
 * import { spaceToJSON, spaceFromJSON } from '@newkrok/nape-js/serialization';
 *
 * const snapshot = spaceToJSON(space);
 * const json = JSON.stringify(snapshot);
 * // ... later:
 * const restored = spaceFromJSON(JSON.parse(json));
 * ```
 */
export function spaceToJSON(space: Space): SpaceSnapshot {
  // ------------------------------------------------------------------
  // 1. Collect all bodies (including those inside compounds) and assign IDs.
  //    Bodies at the top level of the space AND inside compounds are all
  //    stored flat in the bodies array — compounds just record which IDs they own.
  //    We key by ZPP_Body internal ID (stable integer) to avoid issues with
  //    multiple TS wrapper objects pointing to the same ZPP_Body.
  // ------------------------------------------------------------------
  const bodies: BodyData[] = [];
  const bodyIdMap = new Map<Body, number>();
  // ZPP_Body id → serialization index (to dedup across wrapper instances)
  const zppBodyIdToIndex = new Map<number, number>();

  function collectBody(body: Body): void {
    const zppId: number = body.zpp_inner.id;
    if (zppBodyIdToIndex.has(zppId)) return;
    const id = bodies.length;
    bodyIdMap.set(body, id);
    zppBodyIdToIndex.set(zppId, id);
    bodies.push(serializeBody(body, id));
  }

  // Top-level bodies
  const spaceBodyList = space.bodies;
  const bodyCount = spaceBodyList.length;
  for (let i = 0; i < bodyCount; i++) {
    collectBody(spaceBodyList.at(i));
  }

  // Compound bodies (may overlap with top-level — collectBody deduplicates)
  const compoundList = space.compounds;
  const compoundCount = compoundList.length;
  for (let ci = 0; ci < compoundCount; ci++) {
    const compound = compoundList.at(ci) as Compound;
    const cbodies = compound.bodies as any;
    const ccount = cbodies.length;
    for (let bi = 0; bi < ccount; bi++) {
      collectBody(cbodies.at(bi) as Body);
    }
  }

  // ------------------------------------------------------------------
  // 2. Serialize top-level constraints
  // ------------------------------------------------------------------
  const constraints: ConstraintData[] = [];
  const constraintIndexMap = new Map<Constraint, number>();

  function collectConstraint(c: Constraint): void {
    if (constraintIndexMap.has(c)) return;
    const data = serializeConstraint(c, zppBodyIdToIndex);
    if (data != null) {
      constraintIndexMap.set(c, constraints.length);
      constraints.push(data);
    }
  }

  const constraintList = space.constraints;
  const constraintCount = constraintList.length;
  for (let i = 0; i < constraintCount; i++) {
    collectConstraint(constraintList.at(i));
  }

  // Compound constraints
  for (let ci = 0; ci < compoundCount; ci++) {
    const compound = compoundList.at(ci) as Compound;
    const ccons = compound.constraints as any;
    const cccount = ccons.length;
    for (let i = 0; i < cccount; i++) {
      collectConstraint(ccons.at(i) as Constraint);
    }
  }

  // ------------------------------------------------------------------
  // 3. Serialize compounds
  // ------------------------------------------------------------------
  const compounds: CompoundData[] = [];

  for (let ci = 0; ci < compoundCount; ci++) {
    const compound = compoundList.at(ci) as Compound;

    const bodyIds: number[] = [];
    const cbodies = compound.bodies as any;
    const cbc = cbodies.length;
    for (let bi = 0; bi < cbc; bi++) {
      const b = cbodies.at(bi) as Body;
      const id = bodyIdMap.get(b);
      if (id != null) bodyIds.push(id);
    }

    const constraintIndices: number[] = [];
    const ccons = compound.constraints as any;
    const ccc = ccons.length;
    for (let i = 0; i < ccc; i++) {
      const c = ccons.at(i) as Constraint;
      const idx = constraintIndexMap.get(c);
      if (idx != null) constraintIndices.push(idx);
    }

    compounds.push({ bodyIds, constraintIndices, childIndices: [] });
  }

  // ------------------------------------------------------------------
  // 4. Space-level properties
  // ------------------------------------------------------------------
  const bphase = space.zpp_inner.bphase;
  const broadphase = bphase.is_sweep ? "SWEEP_AND_PRUNE" : "DYNAMIC_AABB_TREE";
  const grav = space.gravity;

  return {
    version: SNAPSHOT_VERSION,
    gravity: vec2(grav),
    worldLinearDrag: space.worldLinearDrag,
    worldAngularDrag: space.worldAngularDrag,
    sortContacts: space.sortContacts,
    broadphase,
    bodies,
    constraints,
    compounds,
  };
}
