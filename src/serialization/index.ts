/**
 * nape-js Serialization API (P37)
 *
 * Provides `spaceToJSON` and `spaceFromJSON` for full physics state
 * snapshot/restore — suitable for save/load, replay, and multiplayer
 * server↔client synchronization.
 *
 * Tree-shakeable: importing from this entry point does NOT pull in
 * the full nape-js engine bootstrap. You must import nape-js separately.
 *
 * @example
 * ```ts
 * import '@newkrok/nape-js';                          // engine
 * import { spaceToJSON, spaceFromJSON } from '@newkrok/nape-js/serialization';
 *
 * const snapshot = spaceToJSON(space);
 * const json = JSON.stringify(snapshot);
 *
 * // --- later / on another machine ---
 * const restored = spaceFromJSON(JSON.parse(json));
 * ```
 */

export { spaceToJSON } from "./serialize";
export { spaceFromJSON } from "./deserialize";
export { SNAPSHOT_VERSION } from "./types";
export type {
  SpaceSnapshot,
  BodyData,
  ShapeData,
  CircleShapeData,
  PolygonShapeData,
  ConstraintData,
  ConstraintBaseData,
  PivotJointData,
  DistanceJointData,
  AngleJointData,
  MotorJointData,
  LineJointData,
  PulleyJointData,
  WeldJointData,
  CompoundData,
  Vec2Data,
  MaterialData,
  FluidPropertiesData,
  InteractionFilterData,
  BodyTypeData,
  MassModeData,
  InertiaModeData,
  GravMassModeData,
} from "./types";
