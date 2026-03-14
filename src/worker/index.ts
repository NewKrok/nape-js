/**
 * Web Worker helper — run nape-js physics off the main thread.
 *
 * Import from `@newkrok/nape-js/worker`:
 *
 * ```ts
 * import { PhysicsWorkerManager } from "@newkrok/nape-js/worker";
 * ```
 *
 * @packageDocumentation
 */

export { PhysicsWorkerManager } from "./PhysicsWorkerManager";
export type { BodyTransform } from "./PhysicsWorkerManager";
export { buildWorkerScript } from "./physics-worker-code";
export { FLOATS_PER_BODY, HEADER_FLOATS } from "./types";
export type {
  PhysicsWorkerOptions,
  ShapeDesc,
  CircleDesc,
  BoxDesc,
  PolygonDesc,
  BodyOptions,
} from "./types";
