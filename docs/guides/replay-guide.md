# Replay Guide — `@newkrok/nape-js/replay`

Record a deterministic simulation, store it as a compact binary blob, and play
it back later — same machine, another machine, days later. Useful for:

- **Bug reproduction** — capture a misbehaving session, share the blob, replay it locally with a debugger attached.
- **Multiplayer rollback foundation** — server records authoritative inputs, clients replay-with-prediction.
- **Shareable replays** — post a base64'd replay URL; anyone can load and watch it.
- **Regression tests** — store a replay, assert that simulation X always produces position Y.

The library is intentionally a thin layer over `/serialization` plus
`space.deterministic = true`. It owns the snapshot + input-log plumbing; you
own the `applyInput` callback.

## Architecture

```
┌─ Recorder<T> ───────────────────────┐    ┌─ Replay<T> ────────────┐
│  initial = spaceToBinary(space) ────┼──▶ │ initialSnapshot        │
│  recordFrame(input) per frame ──────┼──▶ │ inputs[]               │
│  keyframeEvery: 60 (optional) ──────┼──▶ │ keyframes[]            │
└─────────────────────────────────────┘    │ frameCount             │
                                           └──┬─────────────────────┘
                                              │ encodeReplay
                                              ▼ Uint8Array (binary blob)
                                              │ decodeReplay
                                              ▼
┌─ Player<T> ──────────────────────────┐
│  space = spaceFromBinary(initial)    │
│  step(): applyInput + space.step()   │
│  stepTo(frame): scrub via keyframes  │
└──────────────────────────────────────┘
```

## Core principle: inputs in, simulation out

The library does NOT patch `body.applyImpulse` or any other Space mutator.
Instead, you provide an `applyInput` callback that the player calls once per
frame, BEFORE stepping. The callback turns a recorded payload into the same
Space mutations you'd make during a live session.

This is the right boundary:

- **Engine determinism** is the engine's responsibility (`space.deterministic = true` already gives same-platform bit-equivalence).
- **Logic determinism** is your responsibility — the callback must be pure.
- **The library** is the thin glue: snapshot, input log, frame counter.

## Recording

```typescript
import "@newkrok/nape-js";
import { Recorder } from "@newkrok/nape-js/replay";

type Input = { jump?: boolean; mouseX?: number; mouseY?: number };

space.deterministic = true; // mandatory — without this, replays drift

const recorder = new Recorder<Input>(space, { keyframeEvery: 60 });

for (let frame = 0; frame < 600; frame++) {
  const input = readUserInput();    // your code — may be null

  recorder.recordFrame(input);       // logs the payload at the current frame
  applyInput(input, space, frame);   // your own logic
  space.step(1 / 60);
}

const replay = recorder.finish();    // immutable Replay<Input>
```

**Key constraints during recording:**

- `space.deterministic = true` must be set BEFORE `new Recorder(space)`. The
  flag is captured into the initial snapshot and restored on playback.
- The recording space MUST keep stepping the same instance — keyframes are
  sampled from it.
- Stick to a fixed `dt` and iteration counts. The `Player` defaults to
  `dt = 1/60`, `velocityIterations = 8`, `positionIterations = 3`. Pass
  matching values via the player's options if you used different ones.
- `applyInput` must be a pure function of `(input, space, frame)` — no
  `Math.random()`, no `Date.now()`, no global mutation, no reading from
  `body.userData` (binary serialization skips it).

### `keyframeEvery`

Each keyframe is a full snapshot — sized like the initial one (~150-300 bytes
per body). With `keyframeEvery: 60` and a 30-second replay containing 100
bodies, that's roughly `30 keyframes × 100 bodies × 200 bytes ≈ 600 KB` of
keyframe data. Disable with `keyframeEvery: 0` if you don't need scrub and
want the smallest possible blob.

## Encoding & sharing

```typescript
import { encodeReplay, decodeReplay } from "@newkrok/nape-js/replay";

const bytes = encodeReplay(replay);   // Uint8Array

// Persist to disk, send over WebSocket, embed in a URL, ...
const restored = decodeReplay<Input>(bytes);
```

The binary format is versioned (magic `RPLY`, version `u16`); decoding throws
on mismatch. Inputs are JSON-encoded as UTF-8 — keep payloads to plain
JSON-serialisable types (numbers, strings, booleans, plain objects, arrays). If
you need binary in a payload, base64-encode it into a string.

## Playback

```typescript
import { Player } from "@newkrok/nape-js/replay";

const player = new Player<Input>(replay, (input, space, frame) => {
  // Same logic as during recording — translate input → space mutations.
  if (input.jump) findPlayer(space).applyImpulse(new Vec2(0, -200));
});

const space = player.restore();      // Space deserialised from snapshot
while (!player.finished) player.step();
```

The player's `space` is a fresh `Space` it owns; the library never reuses
your recording space.

### Random-access scrub

```typescript
player.stepTo(60 * 5);   // jump to 5 seconds in
player.stepTo(60 * 2);   // jump back to 2 seconds — uses keyframes
```

Forward scrub steps through the input log. Backward scrub restores the latest
keyframe ≤ target, then steps forward. Without keyframes, backward scrub
re-restores from frame 0 and walks forward — still correct, just O(target).

### Loop / restart

```typescript
player.restore();   // idempotent — rewinds to frame 0
```

## What's NOT preserved

- **`body.userData`** — binary serialization skips it (it's not size-bounded).
  If you need to round-trip userData, encode it into your input payload, or
  use `spaceToJSON` directly (and accept the size cost).
- **Sleeping state** — bodies wake fresh on snapshot restore. The simulation
  re-resolves sleep on the next step.
- **Contact warm-start state** — the solver's accumulated contact impulses.
  A keyframe taken while bodies press on each other (a settling stack)
  restores bit-close, not bit-identical; the initial snapshot is unaffected
  when contacts have not formed yet.
- **`UserConstraint` instances** — only with a codec. Pass
  `userConstraints: [codec]` to both `new Recorder(space, { … })` and
  `new Player(replay, apply, { … })` (see the
  [cookbook](./cookbook.md#saving-a-userconstraint)); without one they are
  left out of every snapshot and the playback diverges.
- **Listeners / callbacks** — not part of the snapshot. If your replay relies
  on `InteractionListener` callbacks, attach them BEFORE you restore (e.g. in
  the same code that creates the listener types).

## Determinism contract

Replay reproduces the recording bit-close when ALL of these hold:

1. **Same platform** — same OS, same CPU architecture (x86-64 ↔ x86-64,
   ARM64 ↔ ARM64). Cross-platform requires fixed-point math (roadmap P74).
2. **`space.deterministic = true`** — set on the recording space.
3. **Fixed `dt`** — both sides step with the same `dt` and iteration counts.
4. **Pure `applyInput`** — `(input, space, frame)` → mutations only. No
   ambient nondeterminism.
5. **Matching engine version** — `BINARY_SNAPSHOT_VERSION` is bumped on
   breaking layout changes; replays don't load across major engine versions.

## Validating config

```typescript
import { validateDeterministicConfig } from "@newkrok/nape-js/replay";

const { ok, warnings } = validateDeterministicConfig(space);
if (!ok) console.warn("Replay may drift:", warnings);
```

Currently checks `space.deterministic`. The function is a tiny pure
inspection — extend it as you discover more failure modes in your codebase.

## Sizing & performance

| Replay length | 30 bodies, no keyframes | 30 bodies, keyframeEvery: 60 |
|---|---|---|
| 10 sec (600 frames) | ~5 KB | ~55 KB |
| 60 sec (3600 frames) | ~5 KB | ~310 KB |
| 5 min (18000 frames) | ~5 KB | ~1.5 MB |

(Approximate — input log size depends on your payload shape.)

For multiplayer rollback netcode, you typically want very small `keyframeEvery`
(or 0) and short replays — most rollback windows are < 200 ms.

## Multiplayer rollback (foundation only)

P69 is the **building block** for rollback netcode, not a complete
implementation. A typical setup:

- Server records authoritative inputs as `Recorder<NetInput>`.
- Server sends `encodeReplay(replay)` snapshots periodically + diff inputs.
- Client uses a local `Player` to predict ahead, then re-syncs on server
  state by `stepTo(serverFrame)` and re-applying any local pending inputs.

A higher-level `@newkrok/nape-mp` (or similar) package on top of this would
make sense as a future addition; the primitives shipped here cover the core
record/restore/replay loop.

## Demos

Two demos in the [examples grid](../examples/) exercise this API:

- **Save / Load / Rewind** (`save-load-rewind`) — uses the underlying
  `spaceToBinary` directly with a 3-second ring buffer for time-scrub. The
  P71 prototype that fed the P69 design.
- **Deterministic Replay** (`replay-recorder`) — full Recorder + Player flow.
  Click to throw balls, Stop, then Replay — identical physics every time.
