/**
 * spaceToBinary — converts a live Space into a compact Uint8Array snapshot.
 *
 * Designed for sub-millisecond rollback netcode. The binary format captures the
 * same physics state as spaceToJSON but skips userData (arbitrary JSON cannot be
 * efficiently binary-encoded; use spaceToJSON for userData).
 *
 * UserConstraint instances are skipped (not serializable).
 *
 * Binary layout (little-endian):
 *   Header: magic "NAPE" (4B), version u16, bodyCount u32, constraintCount u32, compoundCount u32
 *   Space:  gravity (2×f64), worldLinearDrag f64, worldAngularDrag f64, sortContacts u8, broadphase u8
 *   Bodies: [per body — see writeBinaryBody]
 *   Constraints: [per constraint — see writeBinaryConstraint]
 *   Compounds: [per compound — bodyCount u16, bodyIds u32[], constraintCount u16, constraintIdxs u32[], childCount u16, childIdxs u32[]]
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
import { BinaryWriter } from "./binary-writer";

/** Magic bytes identifying a nape-js binary snapshot. */
const MAGIC = 0x4e415045; // "NAPE" in ASCII (big-endian u32)

/** Binary format version — bumped on breaking layout changes. */
export const BINARY_SNAPSHOT_VERSION = 1;

// Constraint type tags
const CONSTRAINT_PIVOT = 0;
const CONSTRAINT_DISTANCE = 1;
const CONSTRAINT_ANGLE = 2;
const CONSTRAINT_MOTOR = 3;
const CONSTRAINT_LINE = 4;
const CONSTRAINT_PULLEY = 5;
const CONSTRAINT_WELD = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeMaterial(w: BinaryWriter, m: Material): void {
  w.writeFloat64(m.elasticity);
  w.writeFloat64(m.dynamicFriction);
  w.writeFloat64(m.staticFriction);
  w.writeFloat64(m.density);
  w.writeFloat64(m.rollingFriction);
}

function writeFilter(w: BinaryWriter, f: InteractionFilter): void {
  w.writeInt32(f.collisionGroup);
  w.writeInt32(f.collisionMask);
  w.writeInt32(f.sensorGroup);
  w.writeInt32(f.sensorMask);
  w.writeInt32(f.fluidGroup);
  w.writeInt32(f.fluidMask);
}

function writeFluidProps(w: BinaryWriter, fp: FluidProperties | null): void {
  if (fp == null) return; // caller checks flag first
  w.writeFloat64(fp.density);
  w.writeFloat64(fp.viscosity);
  const grav = fp.gravity;
  w.writeBool(grav != null);
  if (grav != null) {
    w.writeFloat64(grav.x);
    w.writeFloat64(grav.y);
  }
}

function writeShape(w: BinaryWriter, shape: Shape): void {
  if (shape.isCircle()) {
    w.writeUint8(0); // circle
    const c = shape as Circle;
    w.writeFloat64(c.radius);
    const lcom = shape.localCOM;
    w.writeFloat64(lcom.x);
    w.writeFloat64(lcom.y);
  } else if (shape.isCapsule()) {
    w.writeUint8(2); // capsule
    const cap = shape as unknown as Capsule;
    w.writeFloat64(cap.width);
    w.writeFloat64(cap.height);
    const lcom = shape.localCOM;
    w.writeFloat64(lcom.x);
    w.writeFloat64(lcom.y);
  } else {
    w.writeUint8(1); // polygon
    const p = shape as Polygon;
    const verts = p.localVerts;
    const count = verts.length;
    w.writeUint16(count);
    for (let i = 0; i < count; i++) {
      const v = verts.at(i);
      w.writeFloat64(v.x);
      w.writeFloat64(v.y);
    }
  }

  // Material (5 × f64)
  writeMaterial(w, shape.material);

  // Filter (6 × i32)
  writeFilter(w, shape.filter);

  // Flags: bit 0 = sensorEnabled, bit 1 = fluidEnabled, bit 2 = hasFluidProps
  const fluidEnabled = shape.fluidEnabled;
  const hasFluidProps = fluidEnabled && shape.fluidProperties != null;
  const flags = (shape.sensorEnabled ? 1 : 0) | (fluidEnabled ? 2 : 0) | (hasFluidProps ? 4 : 0);
  w.writeUint8(flags);

  if (hasFluidProps) {
    writeFluidProps(w, shape.fluidProperties);
  }
}

function writeBody(w: BinaryWriter, body: Body): void {
  const zpp = body.zpp_inner;

  // type: u8 (1=STATIC, 2=DYNAMIC, 3=KINEMATIC)
  w.writeUint8(zpp.type);

  // position, rotation
  w.writeFloat64(body.position.x);
  w.writeFloat64(body.position.y);
  w.writeFloat64(body.rotation);

  // velocity
  w.writeFloat64(body.velocity.x);
  w.writeFloat64(body.velocity.y);
  w.writeFloat64(body.angularVel);

  // kinematic velocity
  w.writeFloat64(body.kinematicVel.x);
  w.writeFloat64(body.kinematicVel.y);
  w.writeFloat64(body.kinAngVel);

  // surface velocity
  w.writeFloat64(body.surfaceVel.x);
  w.writeFloat64(body.surfaceVel.y);

  // force & torque
  w.writeFloat64(body.force.x);
  w.writeFloat64(body.force.y);
  w.writeFloat64(zpp.type === 2 ? body.torque : 0);

  // mass mode + mass
  w.writeUint8(zpp.massMode);
  w.writeFloat64(zpp.massMode === 1 ? zpp.cmass : 0);

  // inertia mode + inertia
  w.writeUint8(zpp.inertiaMode);
  w.writeFloat64(zpp.inertiaMode === 1 ? zpp.cinertia : 0);

  // grav mass mode + scale
  w.writeUint8(zpp.gravMassMode);
  w.writeFloat64(zpp.gravMassScale);

  // flags: bit 0 = allowMovement, bit 1 = allowRotation, bit 2 = bullet
  const flags =
    (body.allowMovement ? 1 : 0) | (body.allowRotation ? 2 : 0) | (body.isBullet ? 4 : 0);
  w.writeUint8(flags);

  // shapes
  const shapeList = body.shapes;
  const shapeCount = shapeList.length;
  w.writeUint16(shapeCount);
  for (let i = 0; i < shapeCount; i++) {
    writeShape(w, shapeList.at(i));
  }
}

const CONSTRAINT_TYPE_MAP: Record<string, number | undefined> = {
  PivotJoint: CONSTRAINT_PIVOT,
  DistanceJoint: CONSTRAINT_DISTANCE,
  AngleJoint: CONSTRAINT_ANGLE,
  MotorJoint: CONSTRAINT_MOTOR,
  LineJoint: CONSTRAINT_LINE,
  PulleyJoint: CONSTRAINT_PULLEY,
  WeldJoint: CONSTRAINT_WELD,
};

function writeConstraintBase(
  w: BinaryWriter,
  c: Constraint,
  zppBodyIdToIndex: Map<number, number>,
  body1: Body | null,
  body2: Body | null,
): void {
  const b1Id = body1 != null ? (zppBodyIdToIndex.get(body1.zpp_inner.id) ?? -1) : -1;
  const b2Id = body2 != null ? (zppBodyIdToIndex.get(body2.zpp_inner.id) ?? -1) : -1;
  w.writeInt32(b1Id);
  w.writeInt32(b2Id);

  const zpp = c.zpp_inner;
  // Flags: bit 0 = active, bit 1 = ignore, bit 2 = stiff,
  //        bit 3 = breakUnderForce, bit 4 = breakUnderError, bit 5 = removeOnBreak
  const flags =
    (zpp.active ? 1 : 0) |
    (zpp.ignore ? 2 : 0) |
    (zpp.stiff ? 4 : 0) |
    (zpp.breakUnderForce ? 8 : 0) |
    (zpp.breakUnderError ? 16 : 0) |
    (zpp.removeOnBreak ? 32 : 0);
  w.writeUint8(flags);

  w.writeFloat64(zpp.frequency);
  w.writeFloat64(zpp.damping);
  w.writeFloat64(zpp.maxForce);
  w.writeFloat64(zpp.maxError);
}

/** Write constraint. Returns true if written, false if skipped (UserConstraint). */
function writeConstraint(
  w: BinaryWriter,
  c: Constraint,
  zppBodyIdToIndex: Map<number, number>,
): boolean {
  const typeName = (c as any).constructor?.name ?? "";
  const typeTag = CONSTRAINT_TYPE_MAP[typeName];
  if (typeTag === undefined) return false; // UserConstraint or unknown

  w.writeUint8(typeTag);

  switch (typeName) {
    case "PivotJoint": {
      const j = c as PivotJoint;
      writeConstraintBase(w, c, zppBodyIdToIndex, j.body1, j.body2);
      w.writeFloat64(j.anchor1.x);
      w.writeFloat64(j.anchor1.y);
      w.writeFloat64(j.anchor2.x);
      w.writeFloat64(j.anchor2.y);
      break;
    }
    case "DistanceJoint": {
      const j = c as DistanceJoint;
      writeConstraintBase(w, c, zppBodyIdToIndex, j.body1, j.body2);
      w.writeFloat64(j.anchor1.x);
      w.writeFloat64(j.anchor1.y);
      w.writeFloat64(j.anchor2.x);
      w.writeFloat64(j.anchor2.y);
      w.writeFloat64(j.jointMin);
      w.writeFloat64(j.jointMax);
      break;
    }
    case "AngleJoint": {
      const j = c as AngleJoint;
      writeConstraintBase(w, c, zppBodyIdToIndex, j.body1, j.body2);
      w.writeFloat64(j.jointMin);
      w.writeFloat64(j.jointMax);
      w.writeFloat64(j.ratio);
      break;
    }
    case "MotorJoint": {
      const j = c as MotorJoint;
      writeConstraintBase(w, c, zppBodyIdToIndex, j.body1, j.body2);
      w.writeFloat64(j.rate);
      w.writeFloat64(j.ratio);
      break;
    }
    case "LineJoint": {
      const j = c as LineJoint;
      writeConstraintBase(w, c, zppBodyIdToIndex, j.body1, j.body2);
      w.writeFloat64(j.anchor1.x);
      w.writeFloat64(j.anchor1.y);
      w.writeFloat64(j.anchor2.x);
      w.writeFloat64(j.anchor2.y);
      w.writeFloat64(j.direction.x);
      w.writeFloat64(j.direction.y);
      w.writeFloat64(j.jointMin);
      w.writeFloat64(j.jointMax);
      break;
    }
    case "PulleyJoint": {
      const j = c as PulleyJoint;
      writeConstraintBase(w, c, zppBodyIdToIndex, j.body1, j.body2);
      w.writeFloat64(j.anchor1.x);
      w.writeFloat64(j.anchor1.y);
      w.writeFloat64(j.anchor2.x);
      w.writeFloat64(j.anchor2.y);
      w.writeFloat64(j.anchor3.x);
      w.writeFloat64(j.anchor3.y);
      w.writeFloat64(j.anchor4.x);
      w.writeFloat64(j.anchor4.y);
      w.writeFloat64(j.jointMin);
      w.writeFloat64(j.jointMax);
      w.writeFloat64(j.ratio);
      break;
    }
    case "WeldJoint": {
      const j = c as WeldJoint;
      writeConstraintBase(w, c, zppBodyIdToIndex, j.body1, j.body2);
      w.writeFloat64(j.anchor1.x);
      w.writeFloat64(j.anchor1.y);
      w.writeFloat64(j.anchor2.x);
      w.writeFloat64(j.anchor2.y);
      w.writeFloat64(j.phase);
      break;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialize the complete physics state of a Space into a compact binary Uint8Array.
 *
 * This is the high-performance counterpart to `spaceToJSON`. It produces a much
 * smaller payload and is significantly faster to encode/decode — suitable for
 * per-frame rollback netcode, client-side prediction, and fast save/load.
 *
 * **Differences from spaceToJSON:**
 * - `userData` is NOT included (arbitrary JSON cannot be efficiently binary-encoded).
 *   Use `spaceToJSON` if you need userData.
 * - UserConstraint instances are skipped (same as JSON).
 *
 * @example
 * ```ts
 * import { spaceToBinary, spaceFromBinary } from '@newkrok/nape-js/serialization';
 *
 * const snapshot = spaceToBinary(space);
 * // snapshot is a Uint8Array — send over network, save to IndexedDB, etc.
 *
 * const restored = spaceFromBinary(snapshot);
 * restored.step(1 / 60);
 * ```
 */
export function spaceToBinary(space: Space): Uint8Array {
  const w = new BinaryWriter();

  // ------------------------------------------------------------------
  // 1. Collect all bodies and assign indices (same dedup logic as JSON)
  // ------------------------------------------------------------------
  const allBodies: Body[] = [];
  const zppBodyIdToIndex = new Map<number, number>();
  const bodyWrapperToIndex = new Map<Body, number>();

  function collectBody(body: Body): void {
    const zppId: number = body.zpp_inner.id;
    if (zppBodyIdToIndex.has(zppId)) return;
    const idx = allBodies.length;
    bodyWrapperToIndex.set(body, idx);
    zppBodyIdToIndex.set(zppId, idx);
    allBodies.push(body);
  }

  const spaceBodyList = space.bodies;
  const bodyCount = spaceBodyList.length;
  for (let i = 0; i < bodyCount; i++) {
    collectBody(spaceBodyList.at(i));
  }

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
  // 2. Collect constraints (count them first, skipping unsupported types)
  // ------------------------------------------------------------------
  const allConstraints: Constraint[] = [];
  const constraintIndexMap = new Map<Constraint, number>();

  function collectConstraint(c: Constraint): void {
    if (constraintIndexMap.has(c)) return;
    const typeName = (c as any).constructor?.name ?? "";
    if (CONSTRAINT_TYPE_MAP[typeName] === undefined) return;
    constraintIndexMap.set(c, allConstraints.length);
    allConstraints.push(c);
  }

  const constraintList = space.constraints;
  const constraintCount = constraintList.length;
  for (let i = 0; i < constraintCount; i++) {
    collectConstraint(constraintList.at(i));
  }

  for (let ci = 0; ci < compoundCount; ci++) {
    const compound = compoundList.at(ci) as Compound;
    const ccons = compound.constraints as any;
    const cccount = ccons.length;
    for (let i = 0; i < cccount; i++) {
      collectConstraint(ccons.at(i) as Constraint);
    }
  }

  // ------------------------------------------------------------------
  // 3. Write header
  // ------------------------------------------------------------------
  w.writeUint32(MAGIC);
  w.writeUint16(BINARY_SNAPSHOT_VERSION);
  w.writeUint32(allBodies.length);
  w.writeUint32(allConstraints.length);
  w.writeUint32(compoundCount);

  // ------------------------------------------------------------------
  // 4. Space-level properties
  // ------------------------------------------------------------------
  const grav = space.gravity;
  w.writeFloat64(grav.x);
  w.writeFloat64(grav.y);
  w.writeFloat64(space.worldLinearDrag);
  w.writeFloat64(space.worldAngularDrag);
  w.writeBool(space.sortContacts);
  w.writeUint8(space.zpp_inner.bphase.is_sweep ? 0 : 1);

  // ------------------------------------------------------------------
  // 5. Bodies
  // ------------------------------------------------------------------
  for (let i = 0; i < allBodies.length; i++) {
    writeBody(w, allBodies[i]);
  }

  // ------------------------------------------------------------------
  // 6. Constraints
  // ------------------------------------------------------------------
  for (let i = 0; i < allConstraints.length; i++) {
    writeConstraint(w, allConstraints[i], zppBodyIdToIndex);
  }

  // ------------------------------------------------------------------
  // 7. Compounds
  // ------------------------------------------------------------------
  for (let ci = 0; ci < compoundCount; ci++) {
    const compound = compoundList.at(ci) as Compound;

    // Body IDs
    const cbodies = compound.bodies as any;
    const cbc = cbodies.length;
    w.writeUint16(cbc);
    for (let bi = 0; bi < cbc; bi++) {
      const b = cbodies.at(bi) as Body;
      const id = bodyWrapperToIndex.get(b) ?? 0;
      w.writeUint32(id);
    }

    // Constraint indices
    const ccons = compound.constraints as any;
    const ccc = ccons.length;
    let serializedCount = 0;
    // Count serializable constraints first
    for (let i = 0; i < ccc; i++) {
      const c = ccons.at(i) as Constraint;
      if (constraintIndexMap.has(c)) serializedCount++;
    }
    w.writeUint16(serializedCount);
    for (let i = 0; i < ccc; i++) {
      const c = ccons.at(i) as Constraint;
      const idx = constraintIndexMap.get(c);
      if (idx != null) w.writeUint32(idx);
    }

    // Child compound indices (not yet supported for nested compounds — write 0)
    w.writeUint16(0);
  }

  return w.finish();
}
