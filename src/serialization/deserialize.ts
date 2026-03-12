/**
 * spaceFromJSON — reconstructs a Space from a SpaceSnapshot.
 *
 * All bodies are created fresh; constraints are wired up after bodies so that
 * body references are resolved correctly.
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
import {
  SNAPSHOT_VERSION,
  type SpaceSnapshot,
  type BodyData,
  type ShapeData,
  type ConstraintData,
  type ConstraintBaseData,
  type Vec2Data,
  type MaterialData,
  type FluidPropertiesData,
  type InteractionFilterData,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toVec2(d: Vec2Data): Vec2 {
  return Vec2.get(d.x, d.y);
}

function toVec2Weak(d: Vec2Data): Vec2 {
  return Vec2.weak(d.x, d.y);
}

function buildMaterial(d: MaterialData): Material {
  return new Material(
    d.elasticity,
    d.dynamicFriction,
    d.staticFriction,
    d.density,
    d.rollingFriction,
  );
}

function buildFilter(d: InteractionFilterData): InteractionFilter {
  const f = new InteractionFilter();
  f.collisionGroup = d.collisionGroup;
  f.collisionMask = d.collisionMask;
  f.sensorGroup = d.sensorGroup;
  f.sensorMask = d.sensorMask;
  f.fluidGroup = d.fluidGroup;
  f.fluidMask = d.fluidMask;
  return f;
}

function buildFluidProps(d: FluidPropertiesData): FluidProperties {
  const fp = new FluidProperties(d.density, d.viscosity);
  if (d.gravity != null) {
    fp.gravity = toVec2(d.gravity);
  }
  return fp;
}

function buildShape(d: ShapeData): Circle | Polygon | Capsule {
  const material = buildMaterial(d.material);
  const filter = buildFilter(d.filter);

  let shape: Circle | Polygon | Capsule;
  if (d.type === "circle") {
    const lcom = toVec2(d.localCOM);
    shape = new Circle(d.radius, lcom, material, filter);
  } else if (d.type === "capsule") {
    const lcom = toVec2(d.localCOM);
    shape = new Capsule(d.width, d.height, lcom, material, filter);
  } else {
    const verts = d.localVerts.map((v) => toVec2(v));
    shape = new Polygon(verts, material, filter);
  }

  shape.sensorEnabled = d.sensorEnabled;
  shape.fluidEnabled = d.fluidEnabled;
  if (d.fluidEnabled && d.fluidProperties != null) {
    shape.fluidProperties = buildFluidProps(d.fluidProperties);
  }

  return shape;
}

function buildBody(d: BodyData): Body {
  const bodyType =
    d.type === "STATIC"
      ? BodyType.STATIC
      : d.type === "KINEMATIC"
        ? BodyType.KINEMATIC
        : BodyType.DYNAMIC;

  const body = new Body(bodyType, toVec2Weak(d.position));
  body.rotation = d.rotation;

  // Velocity (only valid for non-static bodies)
  if (d.type !== "STATIC") {
    body.velocity = toVec2(d.velocity);
    body.angularVel = d.angularVel;
  }
  body.kinematicVel = toVec2(d.kinematicVel);
  body.kinAngVel = d.kinAngVel;
  body.surfaceVel = toVec2(d.surfaceVel);

  // Force & torque (only for DYNAMIC)
  if (d.type === "DYNAMIC") {
    body.force = toVec2(d.force);
    body.torque = d.torque;
  }

  // Mass
  if (d.massMode === "FIXED" && d.mass != null) {
    body.mass = d.mass;
  } else if (d.massMode === "DEFAULT") {
    body.massMode = MassMode.DEFAULT;
  }

  // Inertia
  if (d.inertiaMode === "FIXED" && d.inertia != null) {
    body.inertia = d.inertia;
  } else if (d.inertiaMode === "DEFAULT") {
    body.inertiaMode = InertiaMode.DEFAULT;
  }

  // GravMass
  if (d.gravMassMode === "SCALED") {
    body.gravMassMode = GravMassMode.SCALED;
    body.gravMassScale = d.gravMassScale;
  } else if (d.gravMassMode === "FIXED") {
    body.gravMassMode = GravMassMode.FIXED;
  }

  body.allowMovement = d.allowMovement;
  body.allowRotation = d.allowRotation;
  body.isBullet = d.bullet;

  // Shapes
  for (const sd of d.shapes) {
    buildShape(sd).body = body;
  }

  // userData
  if (d.userData != null) {
    Object.assign(body.userData, d.userData);
  }

  return body;
}

function applyConstraintBase(
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
    userData: Record<string, unknown>;
  },
  d: ConstraintBaseData,
): void {
  c.active = d.active;
  c.ignore = d.ignore;
  c.stiff = d.stiff;
  c.frequency = d.frequency;
  c.damping = d.damping;
  c.maxForce = d.maxForce;
  c.maxError = d.maxError;
  c.breakUnderForce = d.breakUnderForce;
  c.breakUnderError = d.breakUnderError;
  c.removeOnBreak = d.removeOnBreak;
  if (d.userData != null) {
    Object.assign(c.userData, d.userData);
  }
}

function buildConstraint(
  d: ConstraintData,
  bodies: Body[],
): PivotJoint | DistanceJoint | AngleJoint | MotorJoint | LineJoint | PulleyJoint | WeldJoint {
  const b1 = d.body1Id != null ? (bodies[d.body1Id] ?? null) : null;
  const b2 = d.body2Id != null ? (bodies[d.body2Id] ?? null) : null;

  switch (d.type) {
    case "PivotJoint": {
      const c = new PivotJoint(b1, b2, toVec2Weak(d.anchor1), toVec2Weak(d.anchor2));
      applyConstraintBase(c, d);
      return c;
    }
    case "DistanceJoint": {
      const c = new DistanceJoint(
        b1,
        b2,
        toVec2Weak(d.anchor1),
        toVec2Weak(d.anchor2),
        d.jointMin,
        d.jointMax,
      );
      applyConstraintBase(c, d);
      return c;
    }
    case "AngleJoint": {
      const c = new AngleJoint(b1, b2, d.jointMin, d.jointMax, d.ratio);
      applyConstraintBase(c, d);
      return c;
    }
    case "MotorJoint": {
      const c = new MotorJoint(b1, b2, d.rate, d.ratio);
      applyConstraintBase(c, d);
      return c;
    }
    case "LineJoint": {
      const c = new LineJoint(
        b1,
        b2,
        toVec2Weak(d.anchor1),
        toVec2Weak(d.anchor2),
        toVec2Weak(d.direction),
        d.jointMin,
        d.jointMax,
      );
      applyConstraintBase(c, d);
      return c;
    }
    case "PulleyJoint": {
      const c = new PulleyJoint(
        b1,
        b2,
        null,
        null,
        toVec2Weak(d.anchor1),
        toVec2Weak(d.anchor2),
        toVec2Weak(d.anchor3),
        toVec2Weak(d.anchor4),
        d.jointMin,
        d.jointMax,
        d.ratio,
      );
      applyConstraintBase(c, d);
      return c;
    }
    case "WeldJoint": {
      const c = new WeldJoint(b1, b2, toVec2Weak(d.anchor1), toVec2Weak(d.anchor2), d.phase);
      applyConstraintBase(c, d);
      return c;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reconstruct a Space from a SpaceSnapshot.
 *
 * The returned Space is fully configured: bodies, shapes, constraints, and
 * compounds are all added and ready for simulation. Call `space.step(dt)` to
 * start simulating.
 *
 * @throws If the snapshot version is incompatible.
 *
 * @example
 * ```ts
 * import { spaceToJSON, spaceFromJSON } from '@newkrok/nape-js/serialization';
 *
 * const snapshot = spaceToJSON(space);
 * const json = JSON.stringify(snapshot);
 * // ... send over network / save to disk ...
 * const restored = spaceFromJSON(JSON.parse(json));
 * restored.step(1 / 60);
 * ```
 */
export function spaceFromJSON(snapshot: SpaceSnapshot): Space {
  if (snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `nape-js serialization: unsupported snapshot version ${snapshot.version} (expected ${SNAPSHOT_VERSION})`,
    );
  }

  // ------------------------------------------------------------------
  // 1. Create Space
  // ------------------------------------------------------------------
  const broadphase =
    snapshot.broadphase === "SWEEP_AND_PRUNE"
      ? Broadphase.SWEEP_AND_PRUNE
      : Broadphase.DYNAMIC_AABB_TREE;

  const space = new Space(toVec2Weak(snapshot.gravity), broadphase);
  space.worldLinearDrag = snapshot.worldLinearDrag;
  space.worldAngularDrag = snapshot.worldAngularDrag;
  space.sortContacts = snapshot.sortContacts;

  // ------------------------------------------------------------------
  // 2. Build all bodies (not added to space yet — compound bodies are
  //    added via their compound)
  // ------------------------------------------------------------------
  const bodies: Body[] = snapshot.bodies.map(buildBody);

  // ------------------------------------------------------------------
  // 3. Build all constraints (not added to space yet)
  // ------------------------------------------------------------------
  const constraints = snapshot.constraints.map((cd) => buildConstraint(cd, bodies));

  // ------------------------------------------------------------------
  // 4. Build compounds — bodies/constraints inside a compound are owned
  //    by the compound, not added directly to the space.
  // ------------------------------------------------------------------
  const compoundBodySet = new Set<number>();
  const compoundConstraintSet = new Set<number>();

  for (const cd of snapshot.compounds) {
    const compound = new Compound();
    for (const bodyId of cd.bodyIds) {
      bodies[bodyId].compound = compound;
      compoundBodySet.add(bodyId);
    }
    for (const ci of cd.constraintIndices) {
      constraints[ci].compound = compound;
      compoundConstraintSet.add(ci);
    }
    compound.space = space;
  }

  // ------------------------------------------------------------------
  // 5. Add remaining (non-compound) bodies and constraints to space
  // ------------------------------------------------------------------
  for (let i = 0; i < bodies.length; i++) {
    if (!compoundBodySet.has(i)) {
      bodies[i].space = space;
    }
  }

  for (let i = 0; i < constraints.length; i++) {
    if (!compoundConstraintSet.has(i)) {
      constraints[i].space = space;
    }
  }

  return space;
}
