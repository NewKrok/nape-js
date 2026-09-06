import { Body, BodyType, Vec2, Circle, Polygon, Material, DistanceJoint } from "../nape-js.esm.js?v=3.42.0";
import { spawnRandomShape } from "../demo-runner.js?v=3.42.0";

/**
 * Performance Profiler demo — showcases Space.profilerEnabled + metrics API.
 */

const HISTORY_LEN = 120;
const history = new Float64Array(HISTORY_LEN);
let histIdx = 0;

const PHASES = [
  { key: "broad",  field: "broadphaseTime",     color: "#4fc3f7", label: "Broad" },
  { key: "narrow", field: "narrowphaseTime",     color: "#ffb74d", label: "Narrow" },
  { key: "vel",    field: "velocitySolverTime",  color: "#81c784", label: "VelSolve" },
  { key: "pos",    field: "positionSolverTime",  color: "#ce93d8", label: "PosSolve" },
  { key: "ccd",    field: "ccdTime",             color: "#ef5350", label: "CCD" },
  { key: "sleep",  field: "sleepTime",           color: "#90a4ae", label: "Sleep" },
];

const accum = { broad: 0, narrow: 0, vel: 0, pos: 0, ccd: 0, sleep: 0 };
let accumFrames = 0;
let lastFlush = 0;
const display = { broad: 0, narrow: 0, vel: 0, pos: 0, ccd: 0, sleep: 0 };

// --- Rendering constants ---
const PAD = 12;          // outer padding
const GAP = 10;          // uniform gap between sections
const GRAPH_H = 34;
const BAR_H = 8;
const LEGEND_ROW = 12;
const LINE_H = 14;
const RADIUS = 6;        // rounded corner radius

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawOverlay(ctx, space, W) {
  const m = space.metrics;
  if (!m) return;

  const now = performance.now();

  history[histIdx % HISTORY_LEN] = m.totalStepTime;
  histIdx++;

  for (const p of PHASES) accum[p.key] += m[p.field];
  accumFrames++;

  if (now - lastFlush >= 1000 && accumFrames > 0) {
    for (const p of PHASES) {
      display[p.key] = accum[p.key] / accumFrames;
      accum[p.key] = 0;
    }
    accumFrames = 0;
    lastFlush = now;
  }

  // --- Layout: compute total height ---
  const ow = 260;
  const innerW = ow - PAD * 2;
  const contentH =
    LINE_H +              // step header
    GAP + GRAPH_H +       // graph
    GAP + LINE_H +        // "Phase breakdown:" label
    4 + BAR_H +           // bar (small gap between label and bar)
    4 + LEGEND_ROW * 2 +  // legend 2 rows
    GAP + LINE_H +        // bodies line
    2 + LINE_H;           // sleep/contacts line
  const oh = PAD + contentH + PAD;
  const ox = PAD;
  const oy = PAD;

  ctx.save();

  // --- Background ---
  roundRect(ctx, ox, oy, ow, oh, RADIUS);
  ctx.fillStyle = "rgba(13, 17, 23, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const ix = ox + PAD;
  let y = oy + PAD;

  // === Section 1: Step time ===
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#00ff88";
  ctx.fillText(`Step: ${m.totalStepTime.toFixed(2)} ms`, ix, y + 10);
  y += LINE_H;

  // === Section 2: Graph ===
  y += GAP;

  // Graph background
  roundRect(ctx, ix, y, innerW, GRAPH_H, 3);
  ctx.fillStyle = "rgba(0, 255, 136, 0.06)";
  ctx.fill();

  let max = 0;
  for (let i = 0; i < HISTORY_LEN; i++) {
    if (history[i] > max) max = history[i];
  }
  if (max < 0.5) max = 0.5;

  // 16.67ms budget line
  const budgetFrac = 16.67 / max;
  if (budgetFrac < 1) {
    const refY = y + GRAPH_H - budgetFrac * GRAPH_H;
    ctx.strokeStyle = "rgba(239, 83, 80, 0.3)";
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(ix, refY);
    ctx.lineTo(ix + innerW, refY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(239, 83, 80, 0.5)";
    ctx.font = "8px monospace";
    ctx.fillText("16.67ms", ix + 3, refY - 2);
  }

  // Graph line
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < HISTORY_LEN; i++) {
    const idx = (histIdx + i) % HISTORY_LEN;
    const px = ix + (i / (HISTORY_LEN - 1)) * innerW;
    const py = y + GRAPH_H - Math.min(history[idx] / max, 1) * GRAPH_H;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  y += GRAPH_H;

  // === Section 3: Phase breakdown ===
  y += GAP;

  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillText("PHASE BREAKDOWN", ix, y + 10);
  y += LINE_H + 4;

  let displaySum = 0;
  for (const p of PHASES) displaySum += display[p.key];
  if (displaySum < 0.0001) displaySum = 1;

  // Bar with rounded ends
  roundRect(ctx, ix, y, innerW, BAR_H, 3);
  ctx.save();
  ctx.clip();
  let bx = ix;
  for (const p of PHASES) {
    const w = (display[p.key] / displaySum) * innerW;
    if (w > 0.3) {
      ctx.fillStyle = p.color;
      ctx.fillRect(bx, y, w, BAR_H);
    }
    bx += w;
  }
  ctx.restore();
  y += BAR_H + 4;

  // Legend — two rows of three
  ctx.font = "9px monospace";
  for (let row = 0; row < 2; row++) {
    let lx = ix;
    for (let col = 0; col < 3; col++) {
      const p = PHASES[row * 3 + col];
      const pct = Math.round((display[p.key] / displaySum) * 100);
      // Dot
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(lx + 3, y + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      // Text
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.fillText(`${p.label} ${pct}%`, lx + 9, y + 7);
      lx += Math.floor(innerW / 3);
    }
    y += LEGEND_ROW;
  }

  // === Section 4: Counters ===
  y += GAP;

  ctx.font = "11px monospace";
  ctx.fillStyle = "#c9d1d9";
  ctx.fillText(
    `Bodies: ${m.bodyCount}  `,
    ix, y + 10,
  );
  // Inline colored type counts
  const bodiesW = ctx.measureText(`Bodies: ${m.bodyCount}  `).width;
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "10px monospace";
  ctx.fillText(
    `D:${m.dynamicBodyCount} S:${m.staticBodyCount} K:${m.kinematicBodyCount}`,
    ix + bodiesW, y + 10,
  );
  y += LINE_H + 2;

  ctx.font = "11px monospace";
  ctx.fillStyle = "#c9d1d9";
  ctx.fillText(
    `Sleep: ${m.sleepingBodyCount}  Contacts: ${m.contactCount}  Constr: ${m.constraintCount}`,
    ix, y + 10,
  );

  ctx.restore();
}

export default {
  id: "performance-profiler",
  label: "Performance Profiler",
  tags: ["Profiler", "Metrics", "Debug", "Click"],
  featured: false,
  desc: 'Real-time physics profiler overlay — shows per-phase step timing, body/contact/constraint counters, and a rolling time graph. <b>Click</b> to spawn shapes and watch metrics change.',
  walls: true,
  workerCompatible: false,

  setup(space, W, H) {
    space.gravity = new Vec2(0, 600);
    space.profilerEnabled = true;

    for (let i = 0; i < 60; i++) {
      spawnRandomShape(space, 100 + Math.random() * (W - 200), 50 + Math.random() * 200);
    }

    const chainLen = 12;
    const segLen = 20;
    let prev = new Body(BodyType.STATIC, new Vec2(W * 0.3, 60));
    prev.shapes.add(new Circle(5));
    prev.space = space;
    for (let i = 0; i < chainLen; i++) {
      const b = new Body(BodyType.DYNAMIC, new Vec2(W * 0.3 + (i + 1) * segLen, 60));
      b.shapes.add(new Circle(5));
      b.space = space;
      const j = new DistanceJoint(prev, b, new Vec2(0, 0), new Vec2(0, 0), 0, segLen);
      j.stiff = false;
      j.damping = 1;
      j.frequency = 8;
      j.space = space;
      prev = b;
    }

    const plat = new Body(BodyType.STATIC, new Vec2(W * 0.6, H * 0.5));
    plat.shapes.add(new Polygon(Polygon.box(200, 12)));
    plat.space = space;
  },

  click(x, y, space) {
    for (let i = 0; i < 10; i++) {
      spawnRandomShape(space, x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
    }
  },

  renderOverrides: {
    overlay(ctx, space, W, _H) {
      drawOverlay(ctx, space, W);
    },
  },

};
