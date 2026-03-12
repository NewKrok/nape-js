/**
 * spaceFromBinary — reconstructs a Space from a binary Uint8Array snapshot.
 *
 * Counterpart to spaceToBinary. Reads the compact binary layout and rebuilds
 * all bodies, shapes, constraints, and compounds.
 *
 * Note: userData is NOT restored (it is not included in the binary format).
 */

import { Space } from "../space/Space";
import { Body } from "../phys/Body";
import { BodyType } from "../phys/BodyType";
import { MassMode } from "../phys/MassMode";
import { InertiaMode } from "../phys/InertiaMode";
import { GravMassMode } from "../phys/GravMassMode";
import { Circle } from "../shape/Circle";
import { Polygon } from "../shape/Polygon";
import { Capsule } from "../shape/Capsule";
import { Material } from "../phys/Material";
import { FluidProperties } from "../phys/FluidProperties";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { Vec2 } from "../geom/Vec2";
import { Broadphase } from "../space/Broadphase";
import { PivotJoint } from "../constraint/PivotJoint";
import { DistanceJoint } from "../constraint/DistanceJoint";
import { AngleJoint } from "../constraint/AngleJoint";
import { MotorJoint } from "../constraint/MotorJoint";
import { LineJoint } from "../constraint/LineJoint";
import { PulleyJoint } from "../constraint/PulleyJoint";
import { WeldJoint } from "../constraint/WeldJoint";
import { Compound } from "../phys/Compound";
import { BinaryReader } from "./binary-reader";
import { BINARY_SNAPSHOT_VERSION } from "./serialize-binary";

const MAGIC = 0x4e415045;

// Constraint type tags (must match serialize-binary.ts)
const CONSTRAINT_PIVOT = 0;
const CONSTRAINT_DISTANCE = 1;
const CONSTRAINT_ANGLE = 2;
const CONSTRAINT_MOTOR = 3;
const CONSTRAINT_LINE = 4;
const CONSTRAINT_PULLEY = 5;
const CONSTRAINT_WELD = 6;

// Body type mapping (ZPP internal codes)
const BODY_TYPE_MAP: Record<number, BodyType> = {
  1: BodyType.STATIC,
  2: BodyType.DYNAMIC,
  3: BodyType.KINEMATIC,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readMaterial(r: BinaryReader): Material {
  const elasticity = r.readFloat64();
  const dynamicFriction = r.readFloat64();
  const staticFriction = r.readFloat64();
  const density = r.readFloat64();
  const rollingFriction = r.readFloat64();
  return new Material(elasticity, dynamicFriction, staticFriction, density, rollingFriction);
}

function readFilter(r: BinaryReader): InteractionFilter {
  const f = new InteractionFilter();
  f.collisionGroup = r.readInt32();
  f.collisionMask = r.readInt32();
  f.sensorGroup = r.readInt32();
  f.sensorMask = r.readInt32();
  f.fluidGroup = r.readInt32();
  f.fluidMask = r.readInt32();
  return f;
}

function readFluidProps(r: BinaryReader): FluidProperties {
  const density = r.readFloat64();
  const viscosity = r.readFloat64();
  const fp = new FluidProperties(density, viscosity);
  const hasGravity = r.readBool();
  if (hasGravity) {
    fp.gravity = Vec2.get(r.readFloat64(), r.readFloat64());
  }
  return fp;
}

function readShape(r: BinaryReader): Circle | Polygon | Capsule {
  const shapeType = r.readUint8();

  let shape: Circle | Polygon | Capsule;
  if (shapeType === 0) {
    // Circle
    const radius = r.readFloat64();
    const lcomX = r.readFloat64();
    const lcomY = r.readFloat64();
    const material = readMaterial(r);
    const filter = readFilter(r);
    shape = new Circle(radius, Vec2.weak(lcomX, lcomY), material, filter);
  } else if (shapeType === 2) {
    // Capsule
    const width = r.readFloat64();
    const height = r.readFloat64();
    const lcomX = r.readFloat64();
    const lcomY = r.readFloat64();
    const material = readMaterial(r);
    const filter = readFilter(r);
    shape = new Capsule(width, height, Vec2.weak(lcomX, lcomY), material, filter);
  } else {
    // Polygon
    const vertCount = r.readUint16();
    const verts: Vec2[] = [];
    for (let i = 0; i < vertCount; i++) {
      verts.push(Vec2.get(r.readFloat64(), r.readFloat64()));
    }
    const material = readMaterial(r);
    const filter = readFilter(r);
    shape = new Polygon(verts, material, filter);
  }

  // Flags
  const flags = r.readUint8();
  shape.sensorEnabled = (flags & 1) !== 0;
  shape.fluidEnabled = (flags & 2) !== 0;
  const hasFluidProps = (flags & 4) !== 0;

  if (hasFluidProps) {
    shape.fluidProperties = readFluidProps(r);
  }

  return shape;
}

function readBody(r: BinaryReader): Body {
  const bodyTypeCode = r.readUint8();
  const bodyType = BODY_TYPE_MAP[bodyTypeCode] ?? BodyType.DYNAMIC;

  // position, rotation
  const posX = r.readFloat64();
  const posY = r.readFloat64();
  const rotation = r.readFloat64();

  const body = new Body(bodyType, Vec2.weak(posX, posY));
  body.rotation = rotation;

  // velocity
  const velX = r.readFloat64();
  const velY = r.readFloat64();
  const angularVel = r.readFloat64();
  if (bodyTypeCode !== 1) {
    // not STATIC
    body.velocity = Vec2.get(velX, velY);
    body.angularVel = angularVel;
  }

  // kinematic velocity
  body.kinematicVel = Vec2.get(r.readFloat64(), r.readFloat64());
  body.kinAngVel = r.readFloat64();

  // surface velocity
  body.surfaceVel = Vec2.get(r.readFloat64(), r.readFloat64());

  // force & torque
  const forceX = r.readFloat64();
  const forceY = r.readFloat64();
  const torque = r.readFloat64();
  if (bodyTypeCode === 2) {
    // DYNAMIC
    body.force = Vec2.get(forceX, forceY);
    body.torque = torque;
  }

  // mass mode + mass
  const massMode = r.readUint8();
  const massValue = r.readFloat64();
  if (massMode === 1 && massValue !== 0) {
    // FIXED
    body.mass = massValue;
  } else if (massMode === 0) {
    body.massMode = MassMode.DEFAULT;
  }

  // inertia mode + inertia
  const inertiaMode = r.readUint8();
  const inertiaValue = r.readFloat64();
  if (inertiaMode === 1 && inertiaValue !== 0) {
    // FIXED
    body.inertia = inertiaValue;
  } else if (inertiaMode === 0) {
    body.inertiaMode = InertiaMode.DEFAULT;
  }

  // grav mass mode + scale
  const gravMassMode = r.readUint8();
  const gravMassScale = r.readFloat64();
  if (gravMassMode === 2) {
    // SCALED
    body.gravMassMode = GravMassMode.SCALED;
    body.gravMassScale = gravMassScale;
  } else if (gravMassMode === 1) {
    // FIXED
    body.gravMassMode = GravMassMode.FIXED;
  }

  // flags
  const flags = r.readUint8();
  body.allowMovement = (flags & 1) !== 0;
  body.allowRotation = (flags & 2) !== 0;
  body.isBullet = (flags & 4) !== 0;

  // shapes
  const shapeCount = r.readUint16();
  for (let i = 0; i < shapeCount; i++) {
    readShape(r).body = body;
  }

  return body;
}

function readConstraintBase(r: BinaryReader): {
  body1Id: number;
  body2Id: number;
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
} {
  const body1Id = r.readInt32();
  const body2Id = r.readInt32();
  const flags = r.readUint8();
  const frequency = r.readFloat64();
  const damping = r.readFloat64();
  const maxForce = r.readFloat64();
  const maxError = r.readFloat64();

  return {
    body1Id,
    body2Id,
    active: (flags & 1) !== 0,
    ignore: (flags & 2) !== 0,
    stiff: (flags & 4) !== 0,
    breakUnderForce: (flags & 8) !== 0,
    breakUnderError: (flags & 16) !== 0,
    removeOnBreak: (flags & 32) !== 0,
    frequency,
    damping,
    maxForce,
    maxError,
  };
}

function applyBase(
  c: {
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
  },
  base: ReturnType<typeof readConstraintBase>,
): void {
  c.active = base.active;
  c.ignore = base.ignore;
  c.stiff = base.stiff;
  c.frequency = base.frequency;
  c.damping = base.damping;
  c.maxForce = base.maxForce;
  c.maxError = base.maxError;
  c.breakUnderForce = base.breakUnderForce;
  c.breakUnderError = base.breakUnderError;
  c.removeOnBreak = base.removeOnBreak;
}

function readConstraint(
  r: BinaryReader,
  bodies: Body[],
): PivotJoint | DistanceJoint | AngleJoint | MotorJoint | LineJoint | PulleyJoint | WeldJoint {
  const typeTag = r.readUint8();
  const base = readConstraintBase(r);
  const b1 = base.body1Id >= 0 ? (bodies[base.body1Id] ?? null) : null;
  const b2 = base.body2Id >= 0 ? (bodies[base.body2Id] ?? null) : null;

  switch (typeTag) {
    case CONSTRAINT_PIVOT: {
      const a1x = r.readFloat64(),
        a1y = r.readFloat64();
      const a2x = r.readFloat64(),
        a2y = r.readFloat64();
      const c = new PivotJoint(b1, b2, Vec2.weak(a1x, a1y), Vec2.weak(a2x, a2y));
      applyBase(c, base);
      return c;
    }
    case CONSTRAINT_DISTANCE: {
      const a1x = r.readFloat64(),
        a1y = r.readFloat64();
      const a2x = r.readFloat64(),
        a2y = r.readFloat64();
      const jMin = r.readFloat64(),
        jMax = r.readFloat64();
      const c = new DistanceJoint(b1, b2, Vec2.weak(a1x, a1y), Vec2.weak(a2x, a2y), jMin, jMax);
      applyBase(c, base);
      return c;
    }
    case CONSTRAINT_ANGLE: {
      const jMin = r.readFloat64(),
        jMax = r.readFloat64();
      const ratio = r.readFloat64();
      const c = new AngleJoint(b1, b2, jMin, jMax, ratio);
      applyBase(c, base);
      return c;
    }
    case CONSTRAINT_MOTOR: {
      const rate = r.readFloat64(),
        ratio = r.readFloat64();
      const c = new MotorJoint(b1, b2, rate, ratio);
      applyBase(c, base);
      return c;
    }
    case CONSTRAINT_LINE: {
      const a1x = r.readFloat64(),
        a1y = r.readFloat64();
      const a2x = r.readFloat64(),
        a2y = r.readFloat64();
      const dx = r.readFloat64(),
        dy = r.readFloat64();
      const jMin = r.readFloat64(),
        jMax = r.readFloat64();
      const c = new LineJoint(
        b1,
        b2,
        Vec2.weak(a1x, a1y),
        Vec2.weak(a2x, a2y),
        Vec2.weak(dx, dy),
        jMin,
        jMax,
      );
      applyBase(c, base);
      return c;
    }
    case CONSTRAINT_PULLEY: {
      const a1x = r.readFloat64(),
        a1y = r.readFloat64();
      const a2x = r.readFloat64(),
        a2y = r.readFloat64();
      const a3x = r.readFloat64(),
        a3y = r.readFloat64();
      const a4x = r.readFloat64(),
        a4y = r.readFloat64();
      const jMin = r.readFloat64(),
        jMax = r.readFloat64();
      const ratio = r.readFloat64();
      const c = new PulleyJoint(
        b1,
        b2,
        null,
        null,
        Vec2.weak(a1x, a1y),
        Vec2.weak(a2x, a2y),
        Vec2.weak(a3x, a3y),
        Vec2.weak(a4x, a4y),
        jMin,
        jMax,
        ratio,
      );
      applyBase(c, base);
      return c;
    }
    case CONSTRAINT_WELD: {
      const a1x = r.readFloat64(),
        a1y = r.readFloat64();
      const a2x = r.readFloat64(),
        a2y = r.readFloat64();
      const phase = r.readFloat64();
      const c = new WeldJoint(b1, b2, Vec2.weak(a1x, a1y), Vec2.weak(a2x, a2y), phase);
      applyBase(c, base);
      return c;
    }
    default:
      throw new Error(`nape-js binary: unknown constraint type tag ${typeTag}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reconstruct a Space from a binary Uint8Array snapshot.
 *
 * The returned Space is fully configured: bodies, shapes, constraints, and
 * compounds are all added and ready for simulation. Call `space.step(dt)` to
 * start simulating.
 *
 * **Note:** `userData` is NOT restored — binary snapshots do not include it.
 * Use `spaceFromJSON` if you need userData.
 *
 * @throws If the magic bytes or version are invalid.
 *
 * @example
 * ```ts
 * import { spaceToBinary, spaceFromBinary } from '@newkrok/nape-js/serialization';
 *
 * const snapshot = spaceToBinary(space);
 * const restored = spaceFromBinary(snapshot);
 * restored.step(1 / 60);
 * ```
 */
export function spaceFromBinary(data: Uint8Array): Space {
  const r = new BinaryReader(data);

  // ------------------------------------------------------------------
  // 1. Header
  // ------------------------------------------------------------------
  const magic = r.readUint32();
  if (magic !== MAGIC) {
    throw new Error(
      `nape-js binary: invalid magic bytes 0x${magic.toString(16)} (expected 0x${MAGIC.toString(16)})`,
    );
  }

  const version = r.readUint16();
  if (version !== BINARY_SNAPSHOT_VERSION) {
    throw new Error(
      `nape-js binary: unsupported version ${version} (expected ${BINARY_SNAPSHOT_VERSION})`,
    );
  }

  const bodyCount = r.readUint32();
  const constraintCount = r.readUint32();
  const compoundCount = r.readUint32();

  // ------------------------------------------------------------------
  // 2. Space-level properties
  // ------------------------------------------------------------------
  const gravX = r.readFloat64();
  const gravY = r.readFloat64();
  const worldLinearDrag = r.readFloat64();
  const worldAngularDrag = r.readFloat64();
  const sortContacts = r.readBool();
  const broadphaseType = r.readUint8();

  const broadphase =
    broadphaseType === 0 ? Broadphase.SWEEP_AND_PRUNE : Broadphase.DYNAMIC_AABB_TREE;
  const space = new Space(Vec2.weak(gravX, gravY), broadphase);
  space.worldLinearDrag = worldLinearDrag;
  space.worldAngularDrag = worldAngularDrag;
  space.sortContacts = sortContacts;

  // ------------------------------------------------------------------
  // 3. Bodies
  // ------------------------------------------------------------------
  const bodies: Body[] = new Array(bodyCount);
  for (let i = 0; i < bodyCount; i++) {
    bodies[i] = readBody(r);
  }

  // ------------------------------------------------------------------
  // 4. Constraints
  // ------------------------------------------------------------------
  const constraints: (
    | PivotJoint
    | DistanceJoint
    | AngleJoint
    | MotorJoint
    | LineJoint
    | PulleyJoint
    | WeldJoint
  )[] = new Array(constraintCount);
  for (let i = 0; i < constraintCount; i++) {
    constraints[i] = readConstraint(r, bodies);
  }

  // ------------------------------------------------------------------
  // 5. Compounds
  // ------------------------------------------------------------------
  const compoundBodySet = new Set<number>();
  const compoundConstraintSet = new Set<number>();

  for (let ci = 0; ci < compoundCount; ci++) {
    const compound = new Compound();

    const cBodyCount = r.readUint16();
    for (let bi = 0; bi < cBodyCount; bi++) {
      const bodyIdx = r.readUint32();
      bodies[bodyIdx].compound = compound;
      compoundBodySet.add(bodyIdx);
    }

    const cConstraintCount = r.readUint16();
    for (let i = 0; i < cConstraintCount; i++) {
      const cIdx = r.readUint32();
      constraints[cIdx].compound = compound;
      compoundConstraintSet.add(cIdx);
    }

    // Child compounds (read and discard for now)
    const childCount = r.readUint16();
    for (let i = 0; i < childCount; i++) {
      r.readUint32();
    }

    compound.space = space;
  }

  // ------------------------------------------------------------------
  // 6. Add remaining (non-compound) bodies and constraints to space
  // ------------------------------------------------------------------
  for (let i = 0; i < bodyCount; i++) {
    if (!compoundBodySet.has(i)) {
      bodies[i].space = space;
    }
  }

  for (let i = 0; i < constraintCount; i++) {
    if (!compoundConstraintSet.has(i)) {
      constraints[i].space = space;
    }
  }

  return space;
}
