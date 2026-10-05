/**
 * nape-js Replay API (P69)
 *
 * Records and plays back a deterministic simulation. The recorder takes an
 * initial snapshot via the existing serialization layer and a per-frame log
 * of user-supplied input payloads; the player restores the snapshot and
 * walks the log forward (or scrubs through optional intermediate keyframes).
 *
 * Tree-shakeable: importing from this entry point does NOT pull in the full
 * nape-js engine bootstrap. You must import nape-js separately.
 *
 * **Pattern: inputs in, simulation out.** The library does not patch
 * `body.applyImpulse` or other mutators. Instead, the user supplies an
 * `applyInput` callback that translates a recorded input payload into the
 * same Space mutations that drove the original simulation. Replay
 * determinism therefore depends on:
 *
 * - `space.deterministic = true` (set before bodies are added).
 * - A fixed `dt` and matching iteration counts on both sides.
 * - The `applyInput` callback being a pure function of `(input, space, frame)` —
 *   no `Math.random()`, no wall-clock reads, no closure mutations.
 *
 * @example
 * ```ts
 * import '@newkrok/nape-js';
 * import { Recorder, Player, encodeReplay, decodeReplay } from '@newkrok/nape-js/replay';
 *
 * // Record
 * space.deterministic = true;
 * const recorder = new Recorder<MyInput>(space, { keyframeEvery: 60 });
 * for (let f = 0; f < 600; f++) {
 *   recorder.recordFrame(readInput());
 *   space.step(1 / 60);
 * }
 * const replay = recorder.finish();
 * const bytes = encodeReplay(replay);
 *
 * // Replay (anywhere)
 * const replay2 = decodeReplay<MyInput>(bytes);
 * const player = new Player(replay2, (input, space, frame) => {
 *   if (input.fire) somebody.applyImpulse(new Vec2(0, -200));
 * });
 * const space = player.restore();
 * while (!player.finished) player.step();
 * ```
 */

export { Recorder, REPLAY_VERSION } from "./Recorder";
export { Player } from "./Player";
export { encodeReplay, decodeReplay } from "./encode";
export { validateDeterministicConfig } from "./validate";
export type {
  Replay,
  ReplayFrameInput,
  ReplayKeyframe,
  ReplayInputApplier,
  RecorderOptions,
  PlayerOptions,
  DeterminismValidation,
} from "./types";
