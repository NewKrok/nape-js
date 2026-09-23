/**
 * `@newkrok/nape-pixi` — PixiJS v8 integration for `@newkrok/nape-js`.
 *
 * Phase 1 surface:
 * - {@link FixedStepper} — fixed-timestep driver with before/after hooks
 *   and an interpolation factor
 * - {@link BodySpriteBinding} — keeps PIXI display objects in sync with
 *   nape {@link Body} transforms, with optional sub-step interpolation
 *
 * Planned (later phases):
 * - `PixiDebugDraw` — on-demand shape / constraint / AABB overlay
 * - `WorkerBridge` — main-thread Pixi + worker-thread physics helper
 */

export { FixedStepper } from "./FixedStepper.js";
export type { FixedStepperOptions } from "./FixedStepper.js";

export { BodySpriteBinding } from "./BodySpriteBinding.js";
export type {
  BindOptions,
  BodySpriteBindingOptions,
  PixiDisplayTarget,
} from "./BodySpriteBinding.js";

export { PixiDebugDraw } from "./PixiDebugDraw.js";
export type {
  ContainerLike,
  GraphicsLike,
  PixiDebugDrawOptions,
  PixiFactory,
} from "./PixiDebugDraw.js";

export { WorkerBridge } from "./WorkerBridge.js";
export type {
  WorkerBridgeOptions,
  WorkerFrameMessage,
  WorkerLike,
  WorkerReadyMessage,
} from "./WorkerBridge.js";

export {
  TRANSFORM_FLOATS_PER_BODY,
  TRANSFORM_HEADER,
  TRANSFORM_HEADER_FLOATS,
  TRANSFORM_PROTOCOL_VERSION,
  createTransformsBuffer,
  writeTransforms,
} from "./workerProtocol.js";
export type { TransformsBuffer } from "./workerProtocol.js";

// Version injected from package.json at build time via tsup define
declare const __PACKAGE_VERSION__: string;
export const VERSION: string = __PACKAGE_VERSION__;
