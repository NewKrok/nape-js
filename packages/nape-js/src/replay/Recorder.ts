import type { Space } from "../space/Space";
import { spaceToBinary } from "../serialization/serialize-binary";
import type { SerializationOptions } from "../serialization/constraints";
import type { RecorderOptions, Replay, ReplayFrameInput, ReplayKeyframe } from "./types";

/**
 * Records a deterministic simulation by capturing an initial snapshot plus a
 * per-frame log of user-supplied inputs. The resulting {@link Replay} can be
 * encoded to binary, shared, and replayed elsewhere via {@link Player}.
 *
 * **Recording loop pattern:**
 * ```ts
 * const recorder = new Recorder<MyInput>(space);
 * for (let frame = 0; frame < N; frame++) {
 *   const input = readUserInput();
 *   recorder.recordFrame(input);
 *   applyInputToSpace(input, space);  // user's own logic
 *   space.step(1 / 60);
 * }
 * const replay = recorder.finish();
 * ```
 *
 * **For deterministic replay**, the recording space MUST satisfy:
 * - `space.deterministic = true` (set before any bodies are added).
 * - Step with a fixed `dt` and matching velocity / position iteration counts.
 * - Bodies must be added in the same order on the playback side — captured
 *   automatically by the snapshot, but any post-restore logic must respect it.
 * - User's `applyInput` callback must be a pure function of `(input, space, frame)`
 *   (no `Math.random()`, no wall-clock reads).
 *
 * @typeParam T - JSON-serializable user input payload.
 */
export class Recorder<T = unknown> {
  private readonly _initialSnapshot: Uint8Array;
  private readonly _inputs: ReplayFrameInput<T>[] = [];
  private readonly _keyframes: ReplayKeyframe[] = [];
  private readonly _keyframeEvery: number;
  private readonly _serialization: SerializationOptions;
  private _frame: number = 0;
  private _finished: boolean = false;
  private readonly _space: Space;

  /**
   * Snapshot the supplied space at frame 0 and start a new recording.
   * The space reference is retained — keyframe captures sample its current
   * state, so the user MUST keep stepping the same space instance.
   */
  constructor(space: Space, options: RecorderOptions = {}) {
    if (space == null) {
      throw new Error("Recorder: space is required");
    }
    const ke = options.keyframeEvery;
    if (ke != null && (!Number.isFinite(ke) || ke < 0 || (ke | 0) !== ke)) {
      throw new Error(`Recorder: keyframeEvery must be a non-negative integer (got ${ke})`);
    }
    this._space = space;
    this._keyframeEvery = ke ?? 60;
    this._serialization = { userConstraints: options.userConstraints };
    this._initialSnapshot = spaceToBinary(space, this._serialization);
  }

  /** Number of frames recorded so far. */
  get frame(): number {
    return this._frame;
  }

  /** True after {@link finish} has been called. Further recording throws. */
  get finished(): boolean {
    return this._finished;
  }

  /**
   * Log an input payload for the current frame, then advance the frame
   * counter. If `keyframeEvery > 0` and the new frame index is a multiple
   * of it, also captures a snapshot from the recording space.
   *
   * Pass `null` (or omit) for frames with no input — only frames with a
   * payload are stored, keeping the log compact.
   *
   * @param input - User payload. Deep-cloned via JSON before storage.
   */
  recordFrame(input?: T | null): void {
    if (this._finished) {
      throw new Error("Recorder: cannot record after finish()");
    }
    // Snapshot BEFORE recording — at this point the user has stepped
    // exactly `_frame` times since the start, so the captured state matches
    // "frame N has had N steps applied" and Player.stepTo(N) restoring the
    // keyframe lands at the correct state.
    if (this._keyframeEvery > 0 && this._frame > 0 && this._frame % this._keyframeEvery === 0) {
      this._keyframes.push({
        frame: this._frame,
        snapshot: spaceToBinary(this._space, this._serialization),
      });
    }
    if (input != null) {
      const payload = cloneInput(input);
      this._inputs.push({ frame: this._frame, payload });
    }
    this._frame++;
  }

  /**
   * Seal the recording and return the final {@link Replay} object. After
   * calling, further {@link recordFrame} calls throw.
   */
  finish(): Replay<T> {
    this._finished = true;
    return {
      version: REPLAY_VERSION,
      initialSnapshot: this._initialSnapshot,
      inputs: this._inputs.slice(),
      keyframes: this._keyframes.slice(),
      frameCount: this._frame,
    };
  }
}

/** Replay structure version — bumped on breaking layout changes. */
export const REPLAY_VERSION = 1;

function cloneInput<T>(input: T): T {
  // Fast path for primitives — avoids the JSON round-trip.
  const t = typeof input;
  if (input === null || t === "number" || t === "string" || t === "boolean") {
    return input;
  }
  return JSON.parse(JSON.stringify(input)) as T;
}
