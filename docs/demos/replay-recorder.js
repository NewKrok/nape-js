/**
 * Replay Recorder — P69 demo for the deterministic replay API.
 *
 * Records the player's clicks as input payloads, finishes the recording on
 * "Stop", then replays the exact same physics by restoring the initial
 * snapshot and re-applying the input log. Ball positions on replay should
 * match the recording bit-by-bit (same-platform soft determinism).
 *
 * Demonstrates:
 *   - new Recorder(space, { keyframeEvery })
 *   - recorder.recordFrame(input) — JSON-serialisable user payload
 *   - new Player(replay, applyInput)
 *   - player.restore() / player.step() / player.stepTo()
 *   - encodeReplay(replay) — binary blob size readout
 */

import {
  Body, BodyType, Vec2, Circle, Material,
} from "../nape-js.esm.js?v=3.40.0";
import { Recorder, Player, encodeReplay } from "../replay/index.js?v=3.40.0";

// ── Module state (reset in setup) ───────────────────────────────────────────
let mode = "idle";        // "idle" | "recording" | "replaying"
let recorder = null;
let player = null;
let pendingClick = null;  // {x, y, vx, vy} captured between frames; cleared on read
let lastReplay = null;
let lastBlobSize = null;
let frameCounter = 0;     // current recording frame
let initialSnapshotForReplay = null;

// DOM
let statusEl;
let recordBtn;
let stopBtn;
let replayBtn;
let progressEl;
let infoEl;

const W_DEFAULT = 900;
const H_DEFAULT = 500;
const KEYFRAME_EVERY = 60;
const THROW_SPEED = 280;

function spawnBall(space, x, y, vx, vy, radius) {
  const mat = new Material(0.5, 0.6, 0.5, 1);
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(radius, undefined, mat));
  b.userData._colorIdx = (space.bodies.length * 3) | 0;
  b.space = space;
  b.velocity = new Vec2(vx, vy);
  return b;
}

/** applyInput callback for the player: spawn a ball with the recorded click. */
function applyInputToSpace(input, space) {
  if (input?.action === "throw") {
    spawnBall(space, input.x, input.y, input.vx, input.vy, input.radius);
  }
}

function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function refreshUI() {
  if (statusEl) {
    if (mode === "idle") {
      statusEl.textContent = lastReplay
        ? `● Idle — replay ready (${lastReplay.frameCount} frames, ${fmtBytes(lastBlobSize)})`
        : "● Idle — press Record to begin";
      statusEl.style.color = "#c9d1d9";
    } else if (mode === "recording") {
      statusEl.textContent = `⏺ Recording — frame ${frameCounter}, click to throw`;
      statusEl.style.color = "#f85149";
    } else {
      statusEl.textContent = `▶ Replaying — frame ${player?.frame ?? 0}/${player?.frameCount ?? 0}`;
      statusEl.style.color = "#3fb950";
    }
  }
  if (recordBtn) {
    recordBtn.disabled = mode !== "idle";
    recordBtn.style.opacity = mode === "idle" ? "1" : "0.4";
  }
  if (stopBtn) {
    stopBtn.disabled = mode !== "recording";
    stopBtn.style.opacity = mode === "recording" ? "1" : "0.4";
  }
  if (replayBtn) {
    const enabled = lastReplay != null && mode === "idle";
    replayBtn.disabled = !enabled;
    replayBtn.style.opacity = enabled ? "1" : "0.4";
  }
  if (progressEl) {
    if (mode === "replaying" && player) {
      const pct = (player.frame / Math.max(1, player.frameCount)) * 100;
      progressEl.style.width = `${pct}%`;
      progressEl.style.opacity = "1";
    } else {
      progressEl.style.width = "0%";
      progressEl.style.opacity = "0";
    }
  }
  if (infoEl && lastReplay) {
    infoEl.textContent =
      `Frames: ${lastReplay.frameCount} • ` +
      `Inputs: ${lastReplay.inputs.length} • ` +
      `Keyframes: ${lastReplay.keyframes.length} • ` +
      `Binary: ${fmtBytes(lastBlobSize)}`;
  } else if (infoEl) {
    infoEl.textContent = "No replay yet.";
  }
}

function btnStyle(extra = "") {
  return (
    "background:rgba(13,17,23,0.78);color:#c9d1d9;border:1px solid rgba(255,255,255,0.14);" +
    "padding:6px 12px;border-radius:5px;font:11px/1 system-ui;cursor:pointer;" +
    "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);" +
    extra
  );
}

function startRecording(space) {
  // Reset to a clean recording space — clear bodies, set the deterministic
  // flag, start recording. Player will see this same initial state.
  for (const b of [...space.bodies]) {
    if (!b.isStatic()) b.space = null;
  }
  space.deterministic = true;
  recorder = new Recorder(space, { keyframeEvery: KEYFRAME_EVERY });
  frameCounter = 0;
  mode = "recording";
  pendingClick = null;
  refreshUI();
}

function finishRecording() {
  if (!recorder) return;
  lastReplay = recorder.finish();
  recorder = null;
  const blob = encodeReplay(lastReplay);
  lastBlobSize = blob.byteLength;
  mode = "idle";
  refreshUI();
}

function startReplay(runner) {
  if (!lastReplay) return;
  player = new Player(lastReplay, applyInputToSpace);
  const replaySpace = player.restore();
  runner.replaceSpace(replaySpace);
  mode = "replaying";
  refreshUI();
}

export default {
  id: "replay-recorder",
  label: "Deterministic Replay",
  tags: ["Replay", "Recorder", "Determinism", "Click"],
  desc: 'Demonstrates <code>Recorder</code> + <code>Player</code> from <code>@newkrok/nape-js/replay</code>. <b>Press Record</b>, <b>click to throw balls</b>, <b>Stop</b>, then <b>Replay</b> — the recorded clicks reproduce identical physics.',
  walls: true,
  workerCompatible: false,
  noCodePen: true,
  canvas2dOnly: true,

  setup(space) {
    space.gravity = new Vec2(0, 600);
    space.deterministic = true;
    mode = "idle";
    recorder = null;
    player = null;
    lastReplay = null;
    lastBlobSize = null;
    initialSnapshotForReplay = null;
    pendingClick = null;
    frameCounter = 0;
  },

  step(space) {
    const runner = this._runner;

    // Take over physics stepping in both modes. The runner's fixed-step
    // accumulator can fire 0, 1, or 2 space.step() calls per demo.step()
    // depending on display rate / dropped frames — that decoupling breaks
    // the recorder's frame counter (input frames drift from physics frames)
    // and double-steps the player's space (replay looks 2× too fast). We
    // pause the runner and drive exactly one fixed step per recorded frame.
    if (mode === "recording" || mode === "replaying") {
      runner.physicsPaused = true;
    } else {
      runner.physicsPaused = false;
    }

    if (mode === "recording") {
      // Drain pending click into the input log AT this frame, then apply it.
      let payload = null;
      if (pendingClick != null) {
        payload = pendingClick;
        pendingClick = null;
      }
      recorder.recordFrame(payload);
      if (payload != null) applyInputToSpace(payload, space);
      // Step the recorded space ourselves, in lockstep with recordFrame().
      space.step(1 / 60, 8, 3);
      frameCounter++;
      // Auto-stop at 8 sec to keep blob size sane and the demo zippy.
      if (frameCounter >= 60 * 8) finishRecording();
    } else if (mode === "replaying") {
      // Player owns its own space (we swapped it in via replaceSpace) and
      // calls space.step() internally — exactly one step per player.step().
      if (!player.finished) {
        player.step();
      } else {
        mode = "idle";
        // Restore the player's initial snapshot once more so the canvas shows
        // the start state (cleared scene), ready for a re-run.
        const fresh = player.restore();
        runner.replaceSpace(fresh);
        player = null;
      }
    }

    refreshUI();
  },

  click(x, y, space) {
    if (mode !== "recording") return;
    // Random throw direction biased downward + slight horizontal spread.
    // The random angle and radius are baked into the payload so the replay
    // can reproduce the same ball — without this, applyInput would call
    // Math.random() again at replay time and diverge from the recording.
    const ang = (Math.random() - 0.5) * 1.2 - Math.PI / 2;
    const vx = Math.cos(ang) * THROW_SPEED;
    const vy = Math.sin(ang) * THROW_SPEED;
    const radius = 8 + Math.random() * 4;
    pendingClick = { action: "throw", x, y, vx, vy, radius };
  },

  init(container) {
    if (container.querySelector(".replay-recorder-overlay")) return;

    // ── Top-left control panel ─────────────────────────────────────────────
    // Positioned top-left so it doesn't collide with the default canvas-controls
    // overlay (2D/3D toggle, outline, profiler, reset, fullscreen) at top-right.
    const panel = document.createElement("div");
    panel.className = "replay-recorder-overlay";
    panel.style.cssText =
      "position:absolute;top:8px;left:8px;z-index:10;display:flex;flex-direction:column;gap:6px;" +
      "background:rgba(13,17,23,0.78);padding:10px;border-radius:6px;color:#c9d1d9;" +
      "font:11px/1.4 system-ui;border:1px solid rgba(255,255,255,0.08);min-width:220px;" +
      "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);";
    panel.addEventListener("pointerdown", (e) => e.stopPropagation());

    statusEl = document.createElement("div");
    statusEl.style.cssText = "font-weight:600;font-size:11px;letter-spacing:0.3px;";
    panel.appendChild(statusEl);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:6px;margin-top:4px;";

    recordBtn = document.createElement("button");
    recordBtn.type = "button";
    recordBtn.textContent = "● Record";
    recordBtn.style.cssText = btnStyle();
    recordBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRecording(this._runner.space);
    });

    stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.textContent = "■ Stop";
    stopBtn.style.cssText = btnStyle();
    stopBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      finishRecording();
    });

    replayBtn = document.createElement("button");
    replayBtn.type = "button";
    replayBtn.textContent = "▶ Replay";
    replayBtn.style.cssText = btnStyle();
    replayBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startReplay(this._runner);
    });

    btnRow.append(recordBtn, stopBtn, replayBtn);
    panel.appendChild(btnRow);

    // Replay progress bar
    const progressBg = document.createElement("div");
    progressBg.style.cssText =
      "height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;margin-top:4px;";
    progressEl = document.createElement("div");
    progressEl.style.cssText =
      "height:100%;background:#3fb950;width:0%;opacity:0;transition:width 0.05s linear,opacity 0.2s;";
    progressBg.appendChild(progressEl);
    panel.appendChild(progressBg);

    // Replay metadata
    infoEl = document.createElement("div");
    infoEl.style.cssText = "color:rgba(255,255,255,0.55);font-size:10px;margin-top:4px;";
    panel.appendChild(infoEl);

    container.appendChild(panel);
    refreshUI();
  },
};
