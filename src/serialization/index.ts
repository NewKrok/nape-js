/**
 * nape-js Serialization API (P37 + P39)
 *
 * Provides JSON and binary serialization for full physics state
 * snapshot/restore — suitable for save/load, replay, and multiplayer
 * server↔client synchronization.
 *
 * - **JSON** (`spaceToJSON` / `spaceFromJSON`): human-readable, includes userData.
 * - **Binary** (`spaceToBinary` / `spaceFromBinary`): compact Uint8Array,
 *   sub-millisecond for rollback netcode. Does NOT include userData.
 *
 * Tree-shakeable: importing from this entry point does NOT pull in
 * the full nape-js engine bootstrap. You must import nape-js separately.
 *
 * @example
 * ```ts
 * import '@newkrok/nape-js';                          // engine
 * import { spaceToJSON, spaceFromJSON } from '@newkrok/nape-js/serialization';
 * import { spaceToBinary, spaceFromBinary } from '@newkrok/nape-js/serialization';
 *
 * // JSON (save/load, includes userData)
 * const snapshot = spaceToJSON(space);
 * const json = JSON.stringify(snapshot);
 * const restored = spaceFromJSON(JSON.parse(json));
 *
 * // Binary (rollback netcode, fast save/load)
 * const binary = spaceToBinary(space);
 * const restored2 = spaceFromBinary(binary);
 * ```
 */

export { spaceToJSON } from "./serialize";
export { spaceFromJSON } from "./deserialize";
export { spaceToBinary, BINARY_SNAPSHOT_VERSION } from "./serialize-binary";
export { spaceFromBinary } from "./deserialize-binary";
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
