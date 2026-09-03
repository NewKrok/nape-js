// Version injected from package.json at build time via tsup define
declare const __PACKAGE_VERSION__: string;
export const VERSION: string = __PACKAGE_VERSION__;

// Console-queryable version marker, three.js-style (`window.__THREE__`):
// after any nape-js import, typing `__NAPE_JS__` in the browser devtools or
// Node REPL reports the loaded engine version. Also flags accidental
// double-loads (two bundled copies, or mixed ESM + CJS) the same way
// three.js does.
const globalScope = globalThis as typeof globalThis & {
  __NAPE_JS__?: string;
  console?: { warn(message: string): void };
};
if (typeof globalScope.__NAPE_JS__ !== "undefined") {
  if (globalScope.__NAPE_JS__ !== VERSION) {
    globalScope.console?.warn(
      `WARNING: Multiple instances of @newkrok/nape-js being imported ` +
        `(${globalScope.__NAPE_JS__} and ${VERSION}).`,
    );
  }
} else {
  globalScope.__NAPE_JS__ = VERSION;
}

// Bootstrap: centralized nape-namespace registrations and factory callbacks
import "./core/bootstrap";

// Geometry
export { Vec2 } from "./geom/Vec2";
export { Vec3 } from "./geom/Vec3";
export { Mat23 } from "./geom/Mat23";
export { GeomPoly } from "./geom/GeomPoly";
export { AABB } from "./geom/AABB";
export { MatMN } from "./geom/MatMN";
export { MarchingSquares } from "./geom/MarchingSquares";
export { Ray } from "./geom/Ray";
export { ConvexResult } from "./geom/ConvexResult";
export { RayResult } from "./geom/RayResult";
export { Winding } from "./geom/Winding";
export { Geom } from "./geom/Geom";

// Physics
export { Body } from "./phys/Body";
export { BodyType } from "./phys/BodyType";
export { Compound } from "./phys/Compound";
export { Interactor } from "./phys/Interactor";
export { Material } from "./phys/Material";
export { FluidProperties } from "./phys/FluidProperties";
export { GravMassMode } from "./phys/GravMassMode";
export { InertiaMode } from "./phys/InertiaMode";
export { MassMode } from "./phys/MassMode";

// Shapes
export { Shape, type CbTypeSet } from "./shape/Shape";
export { Circle } from "./shape/Circle";
export { Polygon } from "./shape/Polygon";
export { Capsule } from "./shape/Capsule";
export { Edge } from "./shape/Edge";
export { ShapeType } from "./shape/ShapeType";
export { ValidationResult } from "./shape/ValidationResult";

// Space
export { Space } from "./space/Space";
export { Broadphase } from "./space/Broadphase";

// Dynamics
export { InteractionFilter } from "./dynamics/InteractionFilter";
export { InteractionGroup } from "./dynamics/InteractionGroup";
export { ArbiterType } from "./dynamics/ArbiterType";
export { Arbiter } from "./dynamics/Arbiter";
export { CollisionArbiter } from "./dynamics/CollisionArbiter";
export { FluidArbiter } from "./dynamics/FluidArbiter";
export { Contact } from "./dynamics/Contact";

// Callbacks
export { CbEvent } from "./callbacks/CbEvent";
export { CbType } from "./callbacks/CbType";
export { InteractionType } from "./callbacks/InteractionType";
export { PreFlag } from "./callbacks/PreFlag";
export { OptionType } from "./callbacks/OptionType";
export { Listener } from "./callbacks/Listener";
export { BodyListener } from "./callbacks/BodyListener";
export { InteractionListener } from "./callbacks/InteractionListener";
export { ConstraintListener } from "./callbacks/ConstraintListener";
export { PreListener } from "./callbacks/PreListener";
export { ListenerType } from "./callbacks/ListenerType";
export { Callback } from "./callbacks/Callback";
export { BodyCallback } from "./callbacks/BodyCallback";
export { ConstraintCallback } from "./callbacks/ConstraintCallback";
export { InteractionCallback } from "./callbacks/InteractionCallback";
export { PreCallback } from "./callbacks/PreCallback";

// Constraints
export { Constraint } from "./constraint/Constraint";
export { PivotJoint } from "./constraint/PivotJoint";
export { DistanceJoint } from "./constraint/DistanceJoint";
export { AngleJoint } from "./constraint/AngleJoint";
export { WeldJoint } from "./constraint/WeldJoint";
export { MotorJoint } from "./constraint/MotorJoint";
export { LineJoint } from "./constraint/LineJoint";
export { PulleyJoint } from "./constraint/PulleyJoint";
export { SpringJoint } from "./constraint/SpringJoint";
export { UserConstraint } from "./constraint/UserConstraint";

// Utilities
export { NapeList } from "./util/NapeList";
export { DebugDraw, type DebugVec2 } from "./util/DebugDraw";
export { DebugDrawFlags } from "./util/DebugDrawFlags";
export type { TypedListLike } from "./util/NapeListFactory";
export type {
  BodyList,
  CompoundList,
  ShapeList,
  ConstraintList,
  ArbiterList,
  ListenerList,
  RayResultList,
  ConvexResultList,
} from "./util/listTypes";

// Profiler (type only — full profiler available via "nape-js/profiler")
export type { PhysicsMetricsData } from "./profiler/PhysicsMetrics";

// Helpers
export { createConcaveBody, type ConcaveBodyOptions } from "./helpers/createConcaveBody";
export {
  CharacterController,
  type CharacterControllerOptions,
  type MoveResult,
} from "./helpers/CharacterController";
export { TriggerZone, type TriggerZoneOptions, type TriggerHandler } from "./helpers/TriggerZone";
export { fractureBody, type FractureOptions, type FractureResult } from "./helpers/fractureBody";
export {
  buildTilemapBody,
  meshTilemap,
  tiledLayerToGrid,
  ldtkLayerToGrid,
  type TilemapGrid,
  type TilemapOptions,
  type TilemapRect,
  type TilemapTileSize,
  type TilemapMergeMode,
  type TilemapSolidPredicate,
  type TiledTileLayer,
  type LDtkIntGridLayer,
} from "./helpers/tilemap";
export {
  RadialGravityField,
  RadialGravityFieldGroup,
  type RadialGravityFieldOptions,
  type GravityFalloff,
  type BodyFilter,
} from "./helpers/RadialGravityField";
export {
  ParticleEmitter,
  ParticleEmitterGroup,
  type ParticleEmitterOptions,
  type ParticleSpawnState,
  type ParticleShape,
  type SpawnPattern,
  type VelocityPattern,
  type ParticleOverflowPolicy,
  type ParticleDeathReason,
  type ParticleBounds,
} from "./helpers/ParticleEmitter";
export {
  computeVoronoi,
  generateFractureSites,
  type VoronoiPoint,
  type VoronoiCell,
  type VoronoiResult,
} from "./geom/Voronoi";

// List/Iterator registration (side-effect import — registers all typed list pairs)
import "./util/registerLists";

// Special-case lists with custom behavior (not handled by NapeListFactory)
import "./geom/Vec2List";
import "./dynamics/ContactList";
import "./geom/GeomVertexIterator";
import "./native/util/ZPP_Vec2List";
import "./native/util/ZPP_ContactList";
import "./native/geom/ZPP_GeomVertexIterator";
