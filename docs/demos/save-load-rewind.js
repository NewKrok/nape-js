/**
 * Save / Load / Rewind — P71 demo for the serialization API.
 *
 * Exercises spaceToBinary / spaceFromBinary in three layered ways:
 *   1. Save slots (1-5) — explicit save/load like classic game saves.
 *   2. Time scrubber  — last 3 seconds of state in a ring buffer; the slider
 *      pause-and-scrubs back through the recent past.
 *   3. Branch         — leave scrub mode at the current position, discard
 *      history beyond it, and continue forward into a new timeline.
 *
 * Uses runner.replaceSpace() (P71 hook) to swap the active Space whenever a
 * snapshot is restored, and runner.physicsPaused while scrubbing so the
 * scrubbed snapshot is rendered without advancing.
 */

import {
  Body, BodyType, Vec2, Circle, Polygon, Material,
} from "../nape-js.esm.js?v=3.40.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.40.0";
import { spaceToBinary, spaceFromBinary } from "../serialization/index.js?v=3.40.0";

const RING_FRAMES = 180; // 3 sec @ 60 Hz
const SLOT_COUNT = 5;
const BLAST_RADIUS = 200;
const BLAST_FORCE = 2400;
const BODIES_AT_START = 36;

// ── Module state (reset in setup) ───────────────────────────────────────────
let mode = "live";       // "live" | "scrubbing"
let ringBuf;             // Array<Uint8Array | null> (length = RING_FRAMES)
let ringHead;            // next write index; ring is full once we wrap
let ringFilled;          // how many entries are valid (0..RING_FRAMES)
let scrubOffset;         // 0 = newest, RING_FRAMES-1 = oldest (when scrubbing)
let slots;               // Array<Uint8Array | null> length = SLOT_COUNT
let lastSnapshotSize;    // bytes — for the size readout

// DOM refs (created in init, mutated from step/click/etc)
let scrubInput;
let modeBadge;
let sizeReadout;
let slotButtons;         // [{save, load}, ...]
let branchButton;
let frameLabel;

function clearRing() {
  ringBuf = new Array(RING_FRAMES).fill(null);
  ringHead = 0;
  ringFilled = 0;
}

function pushSnapshot(bytes) {
  ringBuf[ringHead] = bytes;
  ringHead = (ringHead + 1) % RING_FRAMES;
  if (ringFilled < RING_FRAMES) ringFilled++;
}

/** Returns the snapshot at `offset` frames behind the newest one. */
function readSnapshot(offset) {
  if (offset < 0 || offset >= ringFilled) return null;
  const idx = (ringHead - 1 - offset + RING_FRAMES) % RING_FRAMES;
  return ringBuf[idx];
}

function dropOlderThan(offset) {
  // Keep only frames at or *newer* than `offset`. The newest frame is at
  // (ringHead - 1) and we treat that as offset 0.
  const keep = ringFilled - offset;
  if (keep <= 0) {
    clearRing();
    return;
  }
  // Compact: copy the kept range into a fresh ring laid out [0..keep).
  const out = new Array(RING_FRAMES).fill(null);
  for (let i = 0; i < keep; i++) {
    out[i] = readSnapshot(offset + (keep - 1 - i));
  }
  ringBuf = out;
  ringHead = keep % RING_FRAMES;
  ringFilled = keep;
}

function spawnScene(space, W, H) {
  space.gravity = new Vec2(0, 600);
  const mat = new Material(0.4, 0.7, 0.5, 1);
  for (let i = 0; i < BODIES_AT_START; i++) {
    const x = 80 + Math.random() * (W - 160);
    const y = 60 + Math.random() * (H * 0.45);
    const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
    if (Math.random() < 0.55) {
      b.shapes.add(new Circle(8 + Math.random() * 14, undefined, mat));
    } else {
      const w = 14 + Math.random() * 28;
      const h = 14 + Math.random() * 28;
      b.shapes.add(new Polygon(Polygon.box(w, h), mat));
    }
    b.userData._colorIdx = i;
    b.space = space;
  }
}

function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function refreshUI() {
  if (modeBadge) {
    modeBadge.textContent = mode === "live" ? "● LIVE" : "⏸ SCRUBBING";
    modeBadge.style.color = mode === "live" ? "#3fb950" : "#d29922";
  }
  if (sizeReadout) {
    sizeReadout.textContent = `Snapshot: ${fmtBytes(lastSnapshotSize)} • Buffer: ${ringFilled}/${RING_FRAMES} frames`;
  }
  if (frameLabel) {
    if (mode === "scrubbing") {
      frameLabel.textContent = `T-${scrubOffset} (${(scrubOffset / 60).toFixed(2)}s ago)`;
    } else {
      frameLabel.textContent = "live";
    }
  }
  if (scrubInput) {
    const max = Math.max(0, ringFilled - 1);
    scrubInput.max = String(max);
    if (mode === "live") scrubInput.value = "0";
  }
  if (branchButton) {
    branchButton.disabled = mode !== "scrubbing";
    branchButton.style.opacity = mode === "scrubbing" ? "1" : "0.4";
  }
  if (slotButtons) {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const filled = !!slots[i];
      slotButtons[i].load.disabled = !filled;
      slotButtons[i].load.style.opacity = filled ? "1" : "0.4";
      slotButtons[i].save.style.background = filled
        ? "rgba(63,185,80,0.18)"
        : "rgba(13,17,23,0.75)";
    }
  }
}

function btnStyle() {
  return (
    "background:rgba(13,17,23,0.78);color:#c9d1d9;border:1px solid rgba(255,255,255,0.14);" +
    "padding:4px 8px;border-radius:4px;font:11px/1 system-ui;cursor:pointer;" +
    "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);"
  );
}

export default {
  id: "save-load-rewind",
  label: "Save / Load / Rewind",
  tags: ["Serialization", "Save/Load", "Rewind", "Snapshot", "Click"],
  desc: 'Demonstrates <code>spaceToBinary</code> / <code>spaceFromBinary</code>. <b>Click</b> to detonate a blast. <b>Drag the timeline</b> to scrub through the last 3 seconds. <b>Save 1-5</b> to capture state, <b>Load</b> to restore, <b>Branch</b> to fork a new timeline from the scrubbed point.',
  walls: true,
  workerCompatible: false,
  noCodePen: true,
  canvas2dOnly: true,

  setup(space, W, H) {
    mode = "live";
    clearRing();
    slots = new Array(SLOT_COUNT).fill(null);
    scrubOffset = 0;
    lastSnapshotSize = null;
    spawnScene(space, W, H);
  },

  step(space) {
    const runner = this._runner;

    if (mode === "live") {
      runner.physicsPaused = false;
      const bytes = spaceToBinary(space);
      lastSnapshotSize = bytes.byteLength;
      pushSnapshot(bytes);
    } else {
      // scrubbing: render the snapshot at scrubOffset, frozen
      runner.physicsPaused = true;
      const bytes = readSnapshot(scrubOffset);
      if (bytes) {
        const restored = spaceFromBinary(bytes);
        runner.replaceSpace(restored);
      }
    }
    refreshUI();
  },

  click(x, y, space) {
    if (mode !== "live") return;
    for (const body of space.bodies) {
      if (body.isStatic()) continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < BLAST_RADIUS * BLAST_RADIUS && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = BLAST_FORCE * (1 - d / BLAST_RADIUS);
        body.applyImpulse(new Vec2((dx / d) * f, (dy / d) * f));
      }
    }
  },

  init(container) {
    if (container.querySelector(".save-load-overlay")) return;

    // ── Left-side panel: mode + slots + branch ──────────────────────────────
    // Positioned top-left so it doesn't collide with the default canvas-controls
    // overlay (2D/3D toggle, outline, profiler, reset, fullscreen) at top-right.
    const panel = document.createElement("div");
    panel.className = "save-load-overlay";
    panel.style.cssText =
      "position:absolute;top:8px;left:8px;z-index:10;display:flex;flex-direction:column;gap:6px;" +
      "background:rgba(13,17,23,0.78);padding:8px;border-radius:6px;color:#c9d1d9;" +
      "font:11px/1.4 system-ui;border:1px solid rgba(255,255,255,0.08);min-width:170px;" +
      "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);";
    panel.addEventListener("pointerdown", (e) => e.stopPropagation());

    modeBadge = document.createElement("div");
    modeBadge.style.cssText = "font-weight:600;font-size:11px;letter-spacing:0.5px;";
    panel.appendChild(modeBadge);

    sizeReadout = document.createElement("div");
    sizeReadout.style.cssText = "color:rgba(255,255,255,0.5);font-size:10px;";
    panel.appendChild(sizeReadout);

    const sep = document.createElement("div");
    sep.style.cssText =
      "height:1px;background:rgba(255,255,255,0.1);margin:2px 0;";
    panel.appendChild(sep);

    // Slot rows
    slotButtons = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:4px;align-items:center;";
      const label = document.createElement("span");
      label.textContent = `Slot ${i + 1}`;
      label.style.cssText = "flex:1;font-size:10px;color:rgba(255,255,255,0.6);";
      const save = document.createElement("button");
      save.type = "button";
      save.textContent = "Save";
      save.style.cssText = btnStyle();
      const load = document.createElement("button");
      load.type = "button";
      load.textContent = "Load";
      load.style.cssText = btnStyle();
      save.addEventListener("click", (e) => {
        e.stopPropagation();
        const runner = this._runner;
        // capture from whatever is currently active (live or scrubbed)
        slots[i] = spaceToBinary(runner.space);
        refreshUI();
      });
      load.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!slots[i]) return;
        const runner = this._runner;
        const restored = spaceFromBinary(slots[i]);
        runner.replaceSpace(restored);
        // Loading exits scrub mode — we're now live in the restored state.
        mode = "live";
        clearRing();
        scrubOffset = 0;
        refreshUI();
      });
      row.append(label, save, load);
      panel.appendChild(row);
      slotButtons.push({ save, load });
    }

    const sep2 = document.createElement("div");
    sep2.style.cssText =
      "height:1px;background:rgba(255,255,255,0.1);margin:2px 0;";
    panel.appendChild(sep2);

    branchButton = document.createElement("button");
    branchButton.type = "button";
    branchButton.textContent = "Branch from here";
    branchButton.style.cssText = btnStyle() + "padding:6px 8px;";
    branchButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mode !== "scrubbing") return;
      const runner = this._runner;
      const bytes = readSnapshot(scrubOffset);
      if (!bytes) return;
      const restored = spaceFromBinary(bytes);
      runner.replaceSpace(restored);
      // Discard frames newer than the branch point and resume.
      dropOlderThan(scrubOffset);
      scrubOffset = 0;
      mode = "live";
      refreshUI();
    });
    panel.appendChild(branchButton);

    container.appendChild(panel);

    // ── Bottom: timeline scrubber ───────────────────────────────────────────
    const timeline = document.createElement("div");
    timeline.className = "save-load-timeline";
    timeline.style.cssText =
      "position:absolute;left:8px;right:8px;bottom:8px;z-index:10;display:flex;align-items:center;" +
      "gap:8px;background:rgba(13,17,23,0.78);padding:8px 10px;border-radius:6px;color:#c9d1d9;" +
      "font:11px/1 system-ui;border:1px solid rgba(255,255,255,0.08);" +
      "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);";
    timeline.addEventListener("pointerdown", (e) => e.stopPropagation());

    const tlLabel = document.createElement("span");
    tlLabel.textContent = "Now ◀";
    tlLabel.style.cssText = "color:rgba(255,255,255,0.55);font-size:10px;white-space:nowrap;";
    timeline.appendChild(tlLabel);

    scrubInput = document.createElement("input");
    scrubInput.type = "range";
    scrubInput.min = "0";
    scrubInput.max = String(RING_FRAMES - 1);
    scrubInput.value = "0";
    scrubInput.step = "1";
    scrubInput.style.cssText = "flex:1;accent-color:#58a6ff;";
    scrubInput.addEventListener("input", (e) => {
      e.stopPropagation();
      const v = Number(scrubInput.value) | 0;
      if (v === 0) {
        // back to live
        if (mode === "scrubbing") {
          mode = "live";
          // Don't drop history — branch is the explicit "fork" action.
          // But the snapshots after the scrub point are still in the ring;
          // resuming would step from the latest, not from the scrubbed.
          // For "release back to live" we simply restore the newest snapshot
          // and continue from there, preserving the rewindable history.
          const bytes = readSnapshot(0);
          if (bytes) {
            this._runner.replaceSpace(spaceFromBinary(bytes));
          }
        }
        scrubOffset = 0;
      } else {
        mode = "scrubbing";
        scrubOffset = Math.min(v, Math.max(0, ringFilled - 1));
      }
      refreshUI();
    });
    timeline.appendChild(scrubInput);

    const tlRight = document.createElement("span");
    tlRight.textContent = "▶ 3s ago";
    tlRight.style.cssText = "color:rgba(255,255,255,0.55);font-size:10px;white-space:nowrap;";
    timeline.appendChild(tlRight);

    frameLabel = document.createElement("span");
    frameLabel.style.cssText =
      "min-width:90px;text-align:right;font:600 10px/1 monospace;color:rgba(255,255,255,0.7);";
    timeline.appendChild(frameLabel);

    container.appendChild(timeline);

    refreshUI();
  },

  // Overlay drawn AFTER the default body render (in screen space, no camera).
  // Uses render3dOverlay (not render) because `render` would replace the
  // default body draw entirely — which is why the canvas appeared blank.
  render3dOverlay(ctx, space, W, H) {
    if (mode === "scrubbing") {
      ctx.save();
      ctx.fillStyle = "rgba(210, 153, 34, 0.06)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },
};
