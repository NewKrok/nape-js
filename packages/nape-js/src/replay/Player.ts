import type { Space } from "../space/Space";
import { spaceFromBinary } from "../serialization/deserialize-binary";
import type { SerializationOptions } from "../serialization/constraints";
import type { PlayerOptions, Replay, ReplayInputApplier } from "./types";

/**
 * Plays back a {@link Replay} produced by {@link Recorder}.
 *
 * The player owns its own {@link Space} (deserialised from the replay's
 * initial snapshot). Each call to {@link step} advances exactly one frame —
 * applying the recorded input via the user's callback, then stepping physics.
 *
 * For random access, {@link stepTo} jumps to the nearest keyframe at or
 * before the target frame, then steps forward through the input log. Backward
 * jumps require keyframes to be present (otherwise the player must re-step
 * from frame 0, which still works but costs O(target) time).
 *
 * @typeParam T - User input payload type (must match the recorder's).
 */
export class Player<T = unknown> {
  private readonly _replay: Replay<T>;
  private _applyInput: ReplayInputApplier<T> | null;
  private _space: Space | null = null;
  private _frame: number = 0;
  private _velocityIterations: number;
  private _positionIterations: number;
  private _dt: number;
  private readonly _serialization: SerializationOptions;

  /**
   * @param replay - Replay to play.
   * @param applyInput - Callback that translates input payloads into Space
   *   mutations. Required for replays with non-empty input logs; replays with
   *   only physics state (no user input) can pass `null`.
   * @param options - Playback config matching the recorder's step parameters.
   *   Defaults: `dt = 1/60`, `velocityIterations = 8`, `positionIterations = 3`.
   *   `userConstraints`: the codecs the replay was recorded with.
   */
  constructor(
    replay: Replay<T>,
    applyInput: ReplayInputApplier<T> | null = null,
    options: PlayerOptions = {},
  ) {
    if (replay == null) {
      throw new Error("Player: replay is required");
    }
    this._replay = replay;
    this._applyInput = applyInput;
    this._dt = options.dt ?? 1 / 60;
    this._velocityIterations = options.velocityIterations ?? 8;
    this._positionIterations = options.positionIterations ?? 3;
    this._serialization = { userConstraints: options.userConstraints };
  }

  /**
   * Restore the initial snapshot. Must be called before {@link step} or
   * {@link stepTo}. Re-calling rewinds to frame 0 (useful for looping).
   */
  restore(): Space {
    this._space = spaceFromBinary(this._replay.initialSnapshot, this._serialization);
    this._frame = 0;
    return this._space;
  }

  /** The active space. Throws if {@link restore} has not been called. */
  get space(): Space {
    if (this._space == null) {
      throw new Error("Player: call restore() before reading space");
    }
    return this._space;
  }

  /** Current frame index. 0 means "initial state, not yet stepped". */
  get frame(): number {
    return this._frame;
  }

  /** Total frames in the replay. */
  get frameCount(): number {
    return this._replay.frameCount;
  }

  /** True when the player has reached the final frame. */
  get finished(): boolean {
    return this._frame >= this._replay.frameCount;
  }

  /** The replay being played. */
  get replay(): Replay<T> {
    return this._replay;
  }

  get applyInput(): ReplayInputApplier<T> | null {
    return this._applyInput;
  }
  set applyInput(fn: ReplayInputApplier<T> | null) {
    this._applyInput = fn;
  }

  /**
   * Advance one frame: look up the input for the current frame (if any),
   * apply it via the callback, then step physics by `dt`.
   *
   * Throws if the player is at the end or {@link restore} hasn't been called.
   */
  step(): void {
    if (this._space == null) {
      throw new Error("Player: call restore() before step()");
    }
    if (this._frame >= this._replay.frameCount) {
      throw new Error(
        `Player: already at end of replay (frame ${this._frame}/${this._replay.frameCount})`,
      );
    }
    const input = lookupInput(this._replay.inputs, this._frame);
    if (input != null && this._applyInput != null) {
      this._applyInput(input.payload, this._space, this._frame);
    }
    this._space.step(this._dt, this._velocityIterations, this._positionIterations);
    this._frame++;
  }

  /**
   * Jump to a specific frame. Forward jumps step through the log; backward
   * jumps restore the latest keyframe ≤ `target` (or the initial snapshot if
   * none) and step forward from there.
   *
   * After this call, {@link space} reflects the state AFTER `target` steps.
   * If `target === 0`, the space is the initial snapshot (pre-step).
   *
   * @param target - Target frame index in `[0, frameCount]`.
   */
  stepTo(target: number): void {
    if (!Number.isFinite(target) || target < 0 || target > this._replay.frameCount) {
      throw new Error(
        `Player: target frame ${target} out of range [0, ${this._replay.frameCount}]`,
      );
    }
    if (this._space == null) this.restore();
    if (target < this._frame) {
      // Backward — restore from keyframe (or initial if none earlier).
      const kf = findKeyframeAtOrBefore(this._replay.keyframes, target);
      if (kf != null) {
        this._space = spaceFromBinary(kf.snapshot, this._serialization);
        this._frame = kf.frame;
      } else {
        this.restore();
      }
    }
    while (this._frame < target) {
      this.step();
    }
  }
}

function lookupInput<T>(
  inputs: ReadonlyArray<{ frame: number; payload: T }>,
  frame: number,
): { frame: number; payload: T } | null {
  // Binary search — inputs are guaranteed sorted by frame ascending.
  let lo = 0;
  let hi = inputs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const f = inputs[mid].frame;
    if (f === frame) return inputs[mid];
    if (f < frame) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

function findKeyframeAtOrBefore(
  keyframes: ReadonlyArray<{ frame: number; snapshot: Uint8Array }>,
  frame: number,
): { frame: number; snapshot: Uint8Array } | null {
  let lo = 0;
  let hi = keyframes.length - 1;
  let best: { frame: number; snapshot: Uint8Array } | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const kf = keyframes[mid];
    if (kf.frame <= frame) {
      best = kf;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
