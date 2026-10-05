import type { Space } from "../space/Space";
import type { UserConstraintCodec } from "../serialization/constraints";

/**
 * Per-frame callback that translates a user-defined input payload into engine
 * mutations on the supplied {@link Space}. Called by {@link Player} once per
 * frame during playback, BEFORE `space.step()`.
 *
 * The callback receives the payload exactly as supplied to
 * {@link Recorder.recordFrame} during recording — the recorder JSON-clones the
 * payload, so mutations made between frames don't leak into the log.
 *
 * @typeParam T - User input payload type (must be JSON-serializable).
 */
export type ReplayInputApplier<T> = (input: T, space: Space, frame: number) => void;

/** Configuration options for {@link Recorder}. */
export interface RecorderOptions {
  /**
   * Capture a full snapshot every N frames in addition to the initial one.
   * Enables fast random-access scrubbing in {@link Player.stepTo}: a backward
   * jump restores the latest keyframe at or before the target frame, then
   * steps forward through the input log.
   *
   * Set to `0` to disable keyframes (only the initial snapshot is captured).
   * Cost: each keyframe is roughly the size of one full snapshot
   * (~150-300 bytes per body), times `frameCount / keyframeEvery`.
   *
   * @default `60` (one keyframe per second at 60 fps)
   */
  keyframeEvery?: number;
  /**
   * Codecs for the `UserConstraint` subclasses in the space, so snapshots
   * capture them (see `UserConstraintCodec` in `/serialization`). Pass the
   * same codecs to {@link PlayerOptions.userConstraints}.
   */
  userConstraints?: readonly UserConstraintCodec<any>[];
}

/** Configuration options for {@link Player}. */
export interface PlayerOptions {
  /** @default `1/60` */
  dt?: number;
  /** @default `8` */
  velocityIterations?: number;
  /** @default `3` */
  positionIterations?: number;
  /** The `UserConstraint` codecs the replay was recorded with. */
  userConstraints?: readonly UserConstraintCodec<any>[];
}

/**
 * A recorded simulation: an initial state snapshot plus a per-frame input log
 * (and optional intermediate keyframes for fast scrubbing). Lossless when
 * the user's `applyInput` callback is deterministic and `space.deterministic`
 * was set on the recording space.
 *
 * @typeParam T - User input payload type.
 */
export interface Replay<T = unknown> {
  /** Replay format version — bumped on breaking layout changes. */
  readonly version: number;
  /**
   * Binary snapshot of the space at frame 0, before any input was applied or
   * any step was taken. Produced via `spaceToBinary`.
   */
  readonly initialSnapshot: Uint8Array;
  /**
   * Sparse input log. Each entry is the payload supplied to
   * {@link Recorder.recordFrame} for the matching frame. Frames with no input
   * are absent from the array (saving space when most frames are idle).
   */
  readonly inputs: ReadonlyArray<ReplayFrameInput<T>>;
  /**
   * Intermediate snapshots for fast scrub. Always sorted by `frame` ascending
   * and never includes frame 0 (use {@link initialSnapshot} for that). Empty
   * when `keyframeEvery: 0` was used during recording.
   */
  readonly keyframes: ReadonlyArray<ReplayKeyframe>;
  /**
   * Total number of frames captured. After playback reaches `frameCount`,
   * the space has been stepped `frameCount` times.
   */
  readonly frameCount: number;
}

/** One entry in the {@link Replay.inputs} log. */
export interface ReplayFrameInput<T = unknown> {
  /** Zero-based frame index — applied BEFORE the step at that frame. */
  readonly frame: number;
  /** User-defined payload (deep-cloned from the value passed to `recordFrame`). */
  readonly payload: T;
}

/** One entry in the {@link Replay.keyframes} list. */
export interface ReplayKeyframe {
  /** Zero-based frame index. The space at this frame is the deserialised snapshot. */
  readonly frame: number;
  /** Binary snapshot from `spaceToBinary` at that frame. */
  readonly snapshot: Uint8Array;
}

/** Result of {@link validateDeterministicConfig}. */
export interface DeterminismValidation {
  /** True if no critical issues were found. Warnings may still be present. */
  ok: boolean;
  /** Human-readable diagnostic messages. */
  warnings: string[];
}
