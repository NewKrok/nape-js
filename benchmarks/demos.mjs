/**
 * nape-js demo benchmark — steps real docs/demos headlessly in Node.
 *
 * The synthetic suite (run.mjs) measures engine paths in isolation; this one
 * measures what the demos and games actually do. Each demo module
 * (`docs/demos/<id>.js`, `{ setup, step, … }`) is loaded with DOM stubs and run
 * like DemoRunner does — `setup()` on a fresh Space, then per frame
 * `demo.step()` followed by `space.step(1/60, vel, pos)` with the demo's own
 * iteration counts. Nothing is rendered.
 *
 * Two timings per demo:
 *   space.step — engine time;
 *   demo.step  — the demo's own per-frame logic, which in game-like demos is
 *                mostly public-API traffic (body iteration, getters, rayCast).
 *
 * Protocol (same reasoning as run.mjs): `Math.random` is replaced by a seeded
 * LCG reset before every trial, so every trial simulates the same scene; a
 * warm-up, a forced GC, then the whole window timed as one unit; the minimum
 * across trials is reported.
 *
 * `hash` is an FNV-1a digest of every body's float64 state after the first
 * trial. It must be identical between two builds when a change is meant to be
 * behaviour-preserving — compare it alongside the times.
 *
 * Usage:
 *   npm run benchmark:demos                       # builds, human-readable
 *   node --expose-gc benchmarks/demos.mjs --json  # JSON (compare.mjs-compatible)
 *   node --expose-gc benchmarks/demos.mjs --quick # fewer trials
 *   node --expose-gc benchmarks/demos.mjs plinko ragdoll-royale  # subset
 *   NAPE_DIST=/path/to/other/dist node --expose-gc benchmarks/demos.mjs
 *     # benchmark another build (e.g. a worktree of the base branch)
 *
 * Demos that start on a title / build screen are measured in their attract
 * (pre-input) mode.
 */

import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as resolvePath, dirname } from "node:path";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = pathToFileURL(
  resolvePath(process.env.NAPE_DIST ?? resolvePath(ROOT, "packages/nape-js/dist")) + "/",
).href;

register("./demo-env.mjs", import.meta.url, { data: { dist: DIST } });
const { installDomStubs } = await import("./demo-env.mjs");
const { element } = installDomStubs();

const { Space } = await import(DIST + "index.js");
const { createWalls } = await import(pathToFileURL(resolvePath(ROOT, "docs/walls.js")).href);

// ---------------------------------------------------------------------------

/** Demos that drop frames today: large contact counts or many joints. */
const HEAVY = [
  "exploding-50",
  "pulse",
  "plinko",
  "asteroid-field",
  "volcano",
  "ragdoll-royale",
  "popcorn",
  "cloth",
  "rollercoaster",
  "tracked-vehicle",
];

/** Showpieces / games: small worlds, listeners, joints, bullets, queries. */
const GAMES = [
  "moba-lite",
  "tinywheels-cup",
  "dirtline",
  "crash-test-hero",
  "sky-hook",
  "arena-defense",
  "jungle-strike",
  "swarm-night",
  "escape-run",
  "flipper-fray",
  "hitch-park",
  "planet-platformer",
];

const args = process.argv.slice(2);
const JSON_MODE = args.includes("--json");
const QUICK = args.includes("--quick");
const only = args.filter((a) => !a.startsWith("--"));

const TRIALS = QUICK ? 3 : 7;
const WARMUP_FRAMES = QUICK ? 60 : 120;
const W = 900;
const H = 500;
const SEED = 0x9e3779b9;

function seedMathRandom(seed) {
  let s = seed | 0;
  Math.random = () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

/** FNV-1a over the float64 bits of every body's state. */
function stateHash(space) {
  const f = new Float64Array(6);
  const bytes = new Uint8Array(f.buffer);
  let h = 0x811c9dc5;
  const bodies = space.bodies;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies.at(i);
    f[0] = b.position.x;
    f[1] = b.position.y;
    f[2] = b.rotation;
    f[3] = b.velocity.x;
    f[4] = b.velocity.y;
    f[5] = b.angularVel;
    for (let k = 0; k < bytes.length; k++) h = Math.imul(h ^ bytes[k], 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

async function loadDemo(id) {
  const url = pathToFileURL(resolvePath(ROOT, `docs/demos/${id}.js`)).href;
  return (await import(url)).default;
}

/** Build the demo's world the way DemoRunner.load() does. */
function buildWorld(demo) {
  const space = new Space();
  let paused = false;
  demo._runner = {
    shakeCamera() {},
    snapCamera() {},
    setPhysicsPaused(p) {
      paused = !!p;
    },
    canvas: element(),
  };
  if (demo.walls !== undefined) createWalls(space, W, H, demo.walls);
  demo.setup(space, W, H);
  try {
    demo.init?.(element(), W, H);
  } catch {
    // DOM-heavy init (overlays, menus) is irrelevant to the simulation.
  }
  return { space, isPaused: () => paused };
}

async function benchDemo(id, frames) {
  const demo = await loadDemo(id);
  const vel = demo.velocityIterations ?? 8;
  const pos = demo.positionIterations ?? 3;
  const engine = [];
  const logic = [];
  let hash = null;
  let bodies = 0;
  let arbiters = 0;
  let constraints = 0;

  for (let t = 0; t < TRIALS; t++) {
    seedMathRandom(SEED);
    const { space, isPaused } = buildWorld(demo);
    const frame = () => {
      const a = performance.now();
      demo.step?.(space, W, H);
      const b = performance.now();
      if (!isPaused()) space.step(1 / 60, vel, pos);
      return [b - a, performance.now() - b];
    };
    for (let i = 0; i < WARMUP_FRAMES; i++) frame();
    if (global.gc) global.gc();
    let tl = 0;
    let te = 0;
    let arbSum = 0;
    for (let i = 0; i < frames; i++) {
      const [l, e] = frame();
      tl += l;
      te += e;
      if (t === 0) arbSum += space.arbiters.length;
    }
    engine.push(te / frames);
    logic.push(tl / frames);
    if (t === 0) {
      hash = stateHash(space);
      bodies = space.bodies.length;
      constraints = space.constraints.length;
      arbiters = Math.round(arbSum / frames);
    }
  }
  return { id, engine, logic, hash, bodies, constraints, arbiters };
}

function summarize(trials) {
  const s = [...trials].sort((a, b) => a - b);
  const best = s[0];
  const q = Math.max(1, Math.ceil(s.length / 4)) - 1;
  return {
    med: best,
    min: best,
    max: s[s.length - 1],
    avg: s[Math.floor(s.length / 2)],
    spread: best > 0 ? ((s[q] - best) / best) * 100 : 0,
  };
}

function calibrate() {
  const work = () => {
    let x = 0;
    for (let j = 0; j < 1_000_000; j++) x += Math.sqrt(j);
    return x;
  };
  for (let i = 0; i < 10; i++) work();
  const times = [];
  for (let i = 0; i < 30; i++) {
    const s = performance.now();
    work();
    times.push(performance.now() - s);
  }
  return Math.min(...times);
}

const fmt = (ms) => (ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(2)}ms`);

const results = [];
const groups = [
  ["Heavy physics demos", HEAVY, QUICK ? 120 : 300],
  ["Showpieces / games", GAMES, QUICK ? 300 : 600],
];
if (!JSON_MODE) console.log(`nape-js demo benchmark — dist: ${DIST}\n`);

for (const [title, ids, frames] of groups) {
  const list = only.length ? ids.filter((id) => only.includes(id)) : ids;
  if (!list.length) continue;
  if (!JSON_MODE) console.log(title);
  for (const id of list) {
    const r = await benchDemo(id, frames);
    const e = summarize(r.engine);
    const l = summarize(r.logic);
    results.push({ name: `${id} – space.step`, ...e, hash: r.hash });
    results.push({ name: `${id} – demo.step`, ...l });
    if (!JSON_MODE) {
      const flag = e.spread > 5 ? " ⚠ noisy" : "";
      console.log(
        `  ${id.padEnd(20)} step ${fmt(e.med).padStart(8)}  logic ${fmt(l.med).padStart(8)}` +
          `  bodies ${String(r.bodies).padStart(5)}  arb ${String(r.arbiters).padStart(5)}` +
          `  con ${String(r.constraints).padStart(4)}  hash ${r.hash}${flag}`,
      );
    }
  }
}

if (JSON_MODE) {
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        node: process.version,
        protocol: {
          trials: TRIALS,
          warmupFrames: WARMUP_FRAMES,
          seed: SEED,
          statistic: "min-of-trials",
        },
        calibration: calibrate(),
        results,
      },
      null,
      2,
    ),
  );
}
