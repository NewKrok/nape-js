import type { Space } from "@newkrok/nape-js";

/**
 * Wire protocol for shuttling body transforms between a physics web worker
 * and the main thread.
 *
 * ## Buffer layout (Float32Array)
 *
 * ```
 * index 0              → bodyCount      (updated each frame)
 * index 1              → timeStamp      (space.timeStamp at write)
 * index 2              → stepMs         (measured step cost in ms)
 * index 3  .. 5        → body 0: x, y, rotation
 * index 6  .. 8        → body 1: x, y, rotation
 * index 3+i*3          → body i: x, y, rotation
 * ```
 *
 * The "body index" is the iteration order of `space.bodies`. Callers are
 * responsible for ensuring the order matches their sprite registration —
 * typically by only appending bodies and never removing from the middle.
 */
/**
 * Version of this transform wire layout.
 *
 * Bump this whenever the buffer layout changes
 * ({@link TRANSFORM_FLOATS_PER_BODY}, {@link TRANSFORM_HEADER_FLOATS}, or the
 * meaning of any header slot) so a stale worker bundle reading against a newer
 * main thread fails loudly instead of decoding garbage. Kept in lockstep with
 * `PROTOCOL_VERSION` in `@newkrok/nape-js`'s `worker/types.ts`.
 */
export const TRANSFORM_PROTOCOL_VERSION = 1;

export const TRANSFORM_HEADER_FLOATS = 3;
/** Floats per body (x, y, rotation). */
export const TRANSFORM_FLOATS_PER_BODY = 3;

/** Header slot indices. */
export const TRANSFORM_HEADER = Object.freeze({
  BODY_COUNT: 0,
  TIME_STAMP: 1,
  STEP_MS: 2,
} as const);

/** Return shape of {@link createTransformsBuffer}. */
export interface TransformsBuffer {
  /** The underlying buffer — either `SharedArrayBuffer` or a plain `ArrayBuffer`. */
  readonly buffer: ArrayBufferLike;
  /** View onto the buffer. */
  readonly transforms: Float32Array;
  /** Capacity in bodies. */
  readonly maxBodies: number;
  /** True when `SharedArrayBuffer` was used (zero-copy main ↔ worker). */
  readonly isShared: boolean;
}

/**
 * Allocate a transforms buffer sized for `maxBodies`. Prefers
 * `SharedArrayBuffer` when available and permitted (cross-origin-isolated
 * contexts); otherwise falls back to a regular `ArrayBuffer`.
 */
export function createTransformsBuffer(maxBodies: number): TransformsBuffer {
  if (!Number.isInteger(maxBodies) || maxBodies <= 0) {
    throw new RangeError(
      `createTransformsBuffer: maxBodies must be a positive integer, got ${maxBodies}`,
    );
  }
  const totalFloats = TRANSFORM_HEADER_FLOATS + maxBodies * TRANSFORM_FLOATS_PER_BODY;
  const byteLength = totalFloats * Float32Array.BYTES_PER_ELEMENT;

  // Try SharedArrayBuffer; many browsers throw unless COOP/COEP is set.
  if (typeof SharedArrayBuffer !== "undefined") {
    try {
      const sab = new SharedArrayBuffer(byteLength);
      return {
        buffer: sab,
        transforms: new Float32Array(sab),
        maxBodies,
        isShared: true,
      };
    } catch {
      // Fall through to ArrayBuffer.
    }
  }
  const ab = new ArrayBuffer(byteLength);
  return {
    buffer: ab,
    transforms: new Float32Array(ab),
    maxBodies,
    isShared: false,
  };
}

/**
 * Write every body in `space` into `transforms`, capped at `maxBodies`.
 * Updates the header slots (body count, timestamp, step ms) and returns the
 * number of bodies written.
 *
 * Intended to be called inside the worker after each `space.step()`.
 *
 * @param stepMs Optional measured step cost in ms — written to header[2].
 */
export function writeTransforms(
  space: Space,
  transforms: Float32Array,
  maxBodies: number,
  stepMs = 0,
): number {
  let i = 0;
  for (const body of space.bodies) {
    if (i >= maxBodies) break;
    const off = TRANSFORM_HEADER_FLOATS + i * TRANSFORM_FLOATS_PER_BODY;
    transforms[off] = body.position.x;
    transforms[off + 1] = body.position.y;
    transforms[off + 2] = body.rotation;
    i++;
  }
  transforms[TRANSFORM_HEADER.BODY_COUNT] = i;
  transforms[TRANSFORM_HEADER.TIME_STAMP] = (space as { timeStamp?: number }).timeStamp ?? 0;
  transforms[TRANSFORM_HEADER.STEP_MS] = stepMs;
  return i;
}
