/**
 * benchmark-runner.js — Scenario definitions & timing framework
 *
 * Defines reproducible physics scenarios and runs them across engines
 * using a warmup + median-based timing approach.
 */

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

/**
 * Each scenario returns { setup(adapter), cleanup(adapter, world) }.
 * `setup` builds the world and returns it.
 * The runner calls `adapter.step(world, dt)` repeatedly.
 */

export const SCENARIOS = [
  // ---- 1. Falling Bodies ----
  {
    id: "falling-250",
    name: "Falling Bodies",
    desc: "250 dynamic boxes fall onto a static floor — measures broadphase + collision + solver throughput.",
    count: 250,
    category: "collision",
    warmup: 30,
    iterations: 120,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      // Floor
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      // Walls
      adapter.addStaticBox(world, -10, H / 2, 20, H);
      adapter.addStaticBox(world, W + 10, H / 2, 20, H);
      // Dynamic boxes
      for (let i = 0; i < this.count; i++) {
        const x = 40 + Math.random() * (W - 80);
        const y = -Math.random() * 1500;
        const size = 8 + Math.random() * 12;
        adapter.addDynamicBox(world, x, y, size, size);
      }
      return world;
    },
  },
  {
    id: "falling-500",
    name: "Falling Bodies",
    desc: "500 dynamic boxes — heavier collision load.",
    count: 500,
    category: "collision",
    warmup: 30,
    iterations: 120,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      adapter.addStaticBox(world, -10, H / 2, 20, H);
      adapter.addStaticBox(world, W + 10, H / 2, 20, H);
      for (let i = 0; i < this.count; i++) {
        const x = 40 + Math.random() * (W - 80);
        const y = -Math.random() * 2500;
        const size = 8 + Math.random() * 12;
        adapter.addDynamicBox(world, x, y, size, size);
      }
      return world;
    },
  },
  {
    id: "falling-1000",
    name: "Falling Bodies",
    desc: "1000 dynamic boxes — stress test for broadphase and solver.",
    count: 1000,
    category: "collision",
    warmup: 20,
    iterations: 60,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      adapter.addStaticBox(world, -10, H / 2, 20, H);
      adapter.addStaticBox(world, W + 10, H / 2, 20, H);
      for (let i = 0; i < this.count; i++) {
        const x = 40 + Math.random() * (W - 80);
        const y = -Math.random() * 4000;
        const size = 8 + Math.random() * 12;
        adapter.addDynamicBox(world, x, y, size, size);
      }
      return world;
    },
  },
  {
    id: "falling-2000",
    name: "Falling Bodies",
    desc: "2000 dynamic boxes — heavy broadphase and solver load.",
    count: 2000,
    category: "collision",
    warmup: 15,
    iterations: 40,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      adapter.addStaticBox(world, -10, H / 2, 20, H);
      adapter.addStaticBox(world, W + 10, H / 2, 20, H);
      for (let i = 0; i < this.count; i++) {
        const x = 40 + Math.random() * (W - 80);
        const y = -Math.random() * 6000;
        const size = 8 + Math.random() * 12;
        adapter.addDynamicBox(world, x, y, size, size);
      }
      return world;
    },
  },
  {
    id: "falling-5000",
    name: "Falling Bodies",
    desc: "5000 dynamic boxes — extreme broadphase stress test.",
    count: 5000,
    category: "collision",
    warmup: 10,
    iterations: 30,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      adapter.addStaticBox(world, -10, H / 2, 20, H);
      adapter.addStaticBox(world, W + 10, H / 2, 20, H);
      for (let i = 0; i < this.count; i++) {
        const x = 40 + Math.random() * (W - 80);
        const y = -Math.random() * 12000;
        const size = 6 + Math.random() * 10;
        adapter.addDynamicBox(world, x, y, size, size);
      }
      return world;
    },
  },
  {
    id: "falling-10000",
    name: "Falling Bodies",
    desc: "10 000 dynamic boxes — extreme stress test for GPU vs CPU solver scaling.",
    count: 10000,
    category: "collision",
    warmup: 5,
    iterations: 20,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      adapter.addStaticBox(world, -10, H / 2, 20, H);
      adapter.addStaticBox(world, W + 10, H / 2, 20, H);
      for (let i = 0; i < this.count; i++) {
        const x = 40 + Math.random() * (W - 80);
        const y = -Math.random() * 20000;
        const size = 5 + Math.random() * 8;
        adapter.addDynamicBox(world, x, y, size, size);
      }
      return world;
    },
  },

  // ---- 2. Pyramid Stacking ----
  {
    id: "pyramid",
    name: "Pyramid Stack",
    desc: "15-row pyramid (120 boxes) — tests solver stability and contact persistence.",
    category: "stability",
    warmup: 30,
    iterations: 200,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      const rows = 15;
      const boxSize = 16;
      const gap = 1;
      const startY = H - 20 - boxSize / 2;
      for (let row = 0; row < rows; row++) {
        const cols = rows - row;
        const startX = W / 2 - ((cols - 1) * (boxSize + gap)) / 2;
        for (let col = 0; col < cols; col++) {
          adapter.addDynamicBox(
            world,
            startX + col * (boxSize + gap),
            startY - row * (boxSize + gap),
            boxSize,
            boxSize
          );
        }
      }
      return world;
    },
  },

  // ---- 3. Constraint Chain ----
  {
    id: "chain-50",
    name: "Constraint Chain",
    desc: "Two 50-link chains hanging from fixed points — tests constraint solver convergence.",
    category: "constraints",
    warmup: 30,
    iterations: 200,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      const linkSize = 6;
      const spacing = 5;
      const chainLen = 50;

      // Two chains side by side for visual symmetry and more solver load
      for (const anchorX of [W * 0.33, W * 0.67]) {
        const anchor = adapter.addStaticBox(world, anchorX, 10, 10, 10);
        let prev = anchor;
        for (let i = 0; i < chainLen; i++) {
          const link = adapter.addDynamicCircle(
            world,
            anchorX,
            10 + (i + 1) * spacing,
            linkSize / 2
          );
          adapter.addJoint(world, prev, link, 0, spacing / 2, 0, -spacing / 2);
          prev = link;
        }
      }
      return world;
    },
  },

  // ---- 4. Mixed Shapes ----
  {
    id: "mixed-300",
    name: "Mixed Shapes",
    desc: "300 mixed circles & boxes — broadphase with heterogeneous shapes.",
    category: "collision",
    warmup: 30,
    iterations: 120,
    setup(adapter, W, H) {
      const world = adapter.createWorld();
      adapter.addStaticBox(world, W / 2, H - 10, W, 20);
      adapter.addStaticBox(world, -10, H / 2, 20, H);
      adapter.addStaticBox(world, W + 10, H / 2, 20, H);
      for (let i = 0; i < 300; i++) {
        const x = 40 + Math.random() * (W - 80);
        const y = -Math.random() * 2000;
        if (i % 2 === 0) {
          adapter.addDynamicCircle(world, x, y, 5 + Math.random() * 8);
        } else {
          const s = 8 + Math.random() * 14;
          adapter.addDynamicBox(world, x, y, s, s);
        }
      }
      return world;
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Run a single scenario on a single engine adapter.
 *
 * @param {object} scenario — from SCENARIOS
 * @param {object} adapter  — engine adapter
 * @param {number} W — canvas width (pixels)
 * @param {number} H — canvas height (pixels)
 * @param {function} onStep — optional callback(world, stepIndex) for visual preview
 * @returns {{ median: number, avg: number, min: number, max: number, times: number[] }}
 */
export async function runBenchmark(scenario, adapter, W, H, onStep) {
  // Use consistent random seed by resetting Math.random via a simple LCG
  const origRandom = Math.random;
  let seed = 42;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  };

  const world = scenario.setup(adapter, W, H);

  // Restore real Math.random after setup
  Math.random = origRandom;

  const dt = 1 / 60;
  const { warmup = 30, iterations = 120 } = scenario;

  // Warmup
  for (let i = 0; i < warmup; i++) {
    await adapter.step(world, dt);
  }

  // Timed iterations
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await adapter.step(world, dt);
    const t1 = performance.now();
    times.push(t1 - t0);

    // Yield to UI every 20 steps for visual preview
    if (onStep && i % 20 === 0) {
      onStep(adapter, world, i);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Cleanup
  try {
    adapter.destroyWorld(world);
  } catch (_) {
    // ignore cleanup errors
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const med = median(times);
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { median: med, avg, min, max, times };
}

// ---------------------------------------------------------------------------
// Visual preview renderer (Canvas2D)
// ---------------------------------------------------------------------------

export function renderPreview(ctx, adapter, world, W, H) {
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, W, H);

  const bodies = adapter.getBodies(world);
  for (const b of bodies) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rotation);

    if (b.isStatic) {
      ctx.fillStyle = "rgba(48, 54, 61, 0.8)";
      ctx.strokeStyle = "rgba(88, 166, 255, 0.3)";
    } else {
      ctx.fillStyle = adapter.color || "#58a6ff";
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
    }

    if (b.isCircle && b.r > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const hw = b.w / 2;
      const hh = b.h / 2;
      ctx.fillRect(-hw, -hh, b.w, b.h);
      ctx.strokeRect(-hw, -hh, b.w, b.h);
    }

    ctx.restore();
  }
}
