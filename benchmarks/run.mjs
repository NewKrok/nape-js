/**
 * nape-js Benchmark Suite
 *
 * Measures physics simulation performance across three scenarios:
 *   A) Falling boxes — broadphase + collision + solving
 *   B) Constraint stress — chains of bodies linked by PivotJoints
 *   C) Position readout — step + iterating body positions (render loop cost)
 *
 * Usage:
 *   npm run benchmark               # human-readable output
 *   node benchmarks/run.mjs --json  # JSON output for CI comparison
 *   node benchmarks/run.mjs --quick # fewer trials (fast, less precise)
 *
 * ---------------------------------------------------------------------------
 * Measurement protocol
 * ---------------------------------------------------------------------------
 * Naive "time N steps of one space and take the median" is far too noisy to
 * detect changes below ~10%. Four separate effects were measured on this suite:
 *
 *  1. Scene generation used `Math.random()`, so every run measured a *different*
 *     physical scene. Spread across 12 runs: 67% random vs 5.6% seeded.
 *  2. Timing per-step medians over one long-lived space conflates the change in
 *     work as the scene settles (0.70ms -> 1.79ms within a single run) with the
 *     cost being measured.
 *  3. A 10-iteration warm-up leaves the JIT unsettled: steps 0-9 averaged
 *     4.83ms against ~1.2ms once warm.
 *  4. GC and OS scheduling produce upward spikes — 27 of 400 steps exceeded 2x
 *     the median, worst case 29ms against a 1.24ms median. They only ever *add*
 *     time, so the minimum across trials is the robust statistic. Discarding a
 *     Space per trial also grows the heap ~13MB a trial (the engine's node pools
 *     are static and never shrink), which makes a mid-window major GC steadily
 *     more likely as a run progresses — hence the explicit collect below.
 *
 * So each scenario is measured as: a seeded scene rebuilt per trial, a long
 * warm-up, a forced GC with only that scene reachable, the whole measurement
 * window timed as one unit (making the settling profile identical across
 * trials), and the *minimum* across trials reported. Windows are also sized per
 * scenario so cheap ones still time a meaningful stretch of wall clock — the
 * 50-link chain went from 12% to 0.15% spread moving from 150 to 2000 steps.
 *
 * Measured over three consecutive full suites: worst case 6.1%, average 2.8%,
 * against 15–67% for the previous protocol.
 *
 * Two limits are worth knowing. Raising the trial count is not monotonic — at 40
 * trials a scenario measured *worse* (38% spread) than at 20, because the longer
 * run accumulates more heap and more exposure to background load; the most
 * expensive scenario here deliberately runs fewer trials for that reason. And
 * the remaining few percent is the machine, not the harness: on a busy system no
 * amount of sampling recovers it, which is what the `spread` column is for.
 *
 * `med` in the JSON output is that minimum, so existing tooling
 * (benchmarks/compare.mjs) keeps working. `spread` is the health signal: the gap
 * between the fastest trial and the top of the fastest quartile. Full min-to-max
 * is not useful, since a single background hiccup blows it out while the reported
 * figure stays sound — what matters is whether the *fastest* trials agree.
 */

import {
  Space,
  Body,
  BodyType,
  Vec2,
  Circle,
  Polygon,
  PivotJoint,
} from "../packages/nape-js/dist/index.js";

const JSON_MODE = process.argv.includes("--json");
const QUICK = process.argv.includes("--quick");

// Trials per scenario. More trials = a better shot at an unperturbed run, at
// linear cost in wall time.
const TRIALS = QUICK ? 7 : 20;
// Steps discarded before timing starts, to get past JIT warm-up (see note 3).
const WARMUP_STEPS = QUICK ? 60 : 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatMs(ms) {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(2)}ms`;
}

/**
 * Deterministic LCG. Scene construction must not use `Math.random()`: it made
 * every run measure a different scene, which dominated all other noise.
 */
function makeRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

/** Fixed seed shared by every scenario, so scenes are identical run to run. */
const SEED = 0x9e3779b9;

const allResults = [];

/**
 * Time `run` over `steps` steps of a freshly built scene, `TRIALS` times.
 *
 * `setup` must build the scene from scratch on each call (it is handed a fresh
 * seeded RNG) so that trials are independent and reproducible.
 */
function bench(name, setup, run, steps = 120, trialCount = TRIALS) {
  const trials = [];
  let ctx = null;

  for (let t = 0; t < trialCount; t++) {
    // Drop the previous scene before building the next one, so at most one
    // Space is reachable when the collection below runs. Without this the heap
    // climbs ~13MB a trial (the engine's node pools are static and never
    // shrink) and late trials increasingly eat a major GC mid-window.
    ctx = null;
    ctx = setup(makeRng(SEED));

    for (let i = 0; i < WARMUP_STEPS; i++) run(ctx);

    // Move collection cost outside the timed region.
    if (global.gc) global.gc();

    // Time the window as a whole: every trial then covers the same stretch of
    // the simulation, so the scene's settling profile cancels out instead of
    // being sampled at random points (see note 2).
    const start = performance.now();
    for (let i = 0; i < steps; i++) run(ctx);
    trials.push((performance.now() - start) / steps);
  }
  ctx = null;

  // Noise is one-sided — GC and scheduling only ever add time — so the fastest
  // trial is the best estimate of the true cost (see note 4).
  const sorted = [...trials].sort((a, b) => a - b);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // Health signal: how far the fastest quartile spreads. Full min-to-max is
  // useless here because one background hiccup blows it out while the reported
  // figure stays solid; agreement among the *fastest* trials is what actually
  // says whether `best` landed on a clean window.
  const q = Math.max(1, Math.ceil(sorted.length / 4)) - 1;
  const spread = ((sorted[q] - best) / best) * 100;

  if (!JSON_MODE) {
    const flag = spread > 5 ? "  ⚠ noisy" : "";
    console.log(
      `  ${name.padEnd(45)} ${formatMs(best).padStart(8)}  (median=${formatMs(median(trials)).padStart(8)}  q1-spread=${spread.toFixed(1).padStart(5)}%)${flag}`,
    );
  }

  // `med` carries the reported figure for backwards compatibility with
  // compare.mjs and the stored baselines. `min`/`max` are the fastest and
  // slowest trials, so `min === med` by construction.
  const result = { name, med: best, min: best, max: worst, avg: median(trials), spread };
  allResults.push(result);
  return result;
}

// ---------------------------------------------------------------------------
// Calibration — environment-independent normalization
// Runs a fixed CPU workload so benchmark results can be compared across
// machines (e.g., dev laptop vs. CI runner) by dividing by this factor.
// Uses the minimum for the same reason the benchmarks do.
//
// This needs to be *more* stable than the benchmarks, not less: compare.mjs
// divides by it, so its noise lands on every comparison. The loop JITs like any
// other code, and min-of-15 with no warm-up drifted 18.4% run to run — enough on
// its own to report a phantom ±11% regression. Warmed up and sampled 50 times it
// settles to 0.2%.
// ---------------------------------------------------------------------------

function calibrate(iterations = 50, warmup = 10) {
  const workload = () => {
    let x = 0;
    for (let j = 0; j < 1_000_000; j++) x += Math.sqrt(j);
    return x;
  };

  for (let i = 0; i < warmup; i++) void workload();

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const x = workload();
    times.push(performance.now() - start);
    void x; // prevent dead-code elimination
  }
  return Math.min(...times);
}

// ---------------------------------------------------------------------------
// Scenario A: Falling Boxes
// ---------------------------------------------------------------------------

function setupFallingBoxes(count) {
  return (rnd) => {
    const space = new Space(new Vec2(0, 600));

    const floor = new Body(BodyType.STATIC, new Vec2(0, 500));
    floor.shapes.add(new Polygon(Polygon.box(2000, 20)));
    floor.space = space;

    const wallL = new Body(BodyType.STATIC, new Vec2(-500, 0));
    wallL.shapes.add(new Polygon(Polygon.box(20, 1200)));
    wallL.space = space;

    const wallR = new Body(BodyType.STATIC, new Vec2(500, 0));
    wallR.shapes.add(new Polygon(Polygon.box(20, 1200)));
    wallR.space = space;

    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * 800;
      const y = -rnd() * 2000;
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      body.shapes.add(new Polygon(Polygon.box(10 + rnd() * 20, 10 + rnd() * 20)));
      body.space = space;
    }

    return space;
  };
}

// ---------------------------------------------------------------------------
// Scenario B: Constraint Stress (chains)
// ---------------------------------------------------------------------------

function setupConstraintChain(chainLength) {
  return () => {
    const space = new Space(new Vec2(0, 200));

    const anchor = new Body(BodyType.STATIC, new Vec2(0, 0));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;

    let prev = anchor;
    for (let i = 0; i < chainLength; i++) {
      const link = new Body(BodyType.DYNAMIC, new Vec2((i + 1) * 15, 0));
      link.shapes.add(new Circle(5));
      link.space = space;

      const joint = new PivotJoint(prev, link, new Vec2(7, 0), new Vec2(-7, 0));
      joint.space = space;
      prev = link;
    }

    return space;
  };
}

// ---------------------------------------------------------------------------
// Scenario C: Position Readout (step + iterate body positions)
// Simulates a render loop: step the simulation, then read x/y/rotation for
// every dynamic body.  Measures combined step + wrapper iteration cost.
// ---------------------------------------------------------------------------

function setupPositionReadout(count) {
  return (rnd) => {
    const space = new Space(new Vec2(0, 600));

    const floor = new Body(BodyType.STATIC, new Vec2(0, 500));
    floor.shapes.add(new Polygon(Polygon.box(2000, 20)));
    floor.space = space;

    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * 800;
      const y = -rnd() * 500;
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      body.shapes.add(new Polygon(Polygon.box(15, 15)));
      body.space = space;
    }

    return space;
  };
}

// ---------------------------------------------------------------------------
// Scenario D: Settled scene
// A pile that has come to rest. Kept separate because several engine paths
// (sleeping, CCD gating) only pay off once bodies stop moving, and the falling
// scenarios above never reach that state — averaging the two hides both.
// ---------------------------------------------------------------------------

function setupSettledPile(count) {
  return (rnd) => {
    const space = new Space(new Vec2(0, 600));

    const floor = new Body(BodyType.STATIC, new Vec2(0, 500));
    floor.shapes.add(new Polygon(Polygon.box(2000, 40)));
    floor.space = space;

    for (let i = 0; i < count; i++) {
      const body = new Body(BodyType.DYNAMIC);
      body.shapes.add(i % 2 ? new Circle(9) : new Polygon(Polygon.box(18, 18)));
      body.position = new Vec2(-380 + (i % 40) * 19, 380 - Math.floor(i / 40) * 24);
      body.space = space;
      void rnd(); // keep the RNG stream aligned with the other scenarios
    }

    return space;
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

if (!JSON_MODE) {
  console.log("=".repeat(90));
  console.log("  nape-js Benchmark Suite");
  console.log("=".repeat(90));
  console.log();
  console.log(
    `  Protocol: ${TRIALS} trials x (${WARMUP_STEPS} warm-up + timed window), seeded scenes, best-of reported.`,
  );
  if (!global.gc) {
    console.log("  Note: run with `node --expose-gc` for a quieter measurement.");
  }
  console.log("  Calibrating...");
}

const calibration = calibrate();

if (!JSON_MODE) {
  console.log(`  Calibration factor: ${formatMs(calibration)} (1M Math.sqrt ops, best of 50)`);
  console.log();
}

const step = (space) => space.step(1 / 60, 8, 3);

if (!JSON_MODE) console.log("--- A) Falling Boxes (space.step per iteration) ---");
bench("200 boxes – step(1/60)", setupFallingBoxes(200), step, 250);
bench("500 boxes – step(1/60)", setupFallingBoxes(500), step, 150);
// The most expensive scene here (~4.5ms a step). Fewer trials keeps total heap
// churn — and so GC exposure — down, which measured better than more trials.
bench("1000 boxes – step(1/60)", setupFallingBoxes(1000), step, 100, 12);

if (!JSON_MODE) {
  console.log();
  console.log("--- B) Constraint Stress (PivotJoint chains) ---");
}
// These are ~40-250us a step, an order of magnitude cheaper than the box
// scenarios, so they need a much longer window before timer granularity and
// background load stop dominating (measured: 12% -> 0.15% at 2000 steps).
bench("50-link chain – step(1/60)", setupConstraintChain(50), step, 2000);
bench("100-link chain – step(1/60)", setupConstraintChain(100), step, 1200);
bench("200-link chain – step(1/60)", setupConstraintChain(200), step, 600);

if (!JSON_MODE) {
  console.log();
  console.log("--- C) Position Readout (step + iterate x/y/rotation for all bodies) ---");
}
const stepAndRead = (space) => {
  space.step(1 / 60, 8, 3);
  for (const body of space.bodies) {
    void body.position.x;
    void body.position.y;
    void body.rotation;
  }
};
bench("200 boxes – step + position readout", setupPositionReadout(200), stepAndRead, 250);
bench("500 boxes – step + position readout", setupPositionReadout(500), stepAndRead, 150);

if (!JSON_MODE) {
  console.log();
  console.log("--- D) Settled Scene (pile at rest — sleeping / CCD-gating paths) ---");
}
bench("400 bodies settled – step(1/60)", setupSettledPile(400), step, 250);
bench("800 bodies settled – step(1/60)", setupSettledPile(800), step, 150);

if (!JSON_MODE) {
  console.log();
  console.log("=".repeat(90));
  const noisy = allResults.filter((r) => r.spread > 5);
  if (noisy.length > 0) {
    console.log(
      `  ⚠ ${noisy.length} benchmark(s): the fastest trials disagreed by >5% — those figures are soft`,
    );
    console.log("    (close other applications and re-run for a clean measurement)");
  } else {
    console.log(
      `  Fastest trials agree within 5% everywhere (worst ${Math.max(...allResults.map((r) => r.spread)).toFixed(1)}%)`,
    );
  }
  const mem = process.memoryUsage();
  console.log(
    `  Memory: RSS=${(mem.rss / 1024 / 1024).toFixed(1)}MB  Heap=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
  );
  console.log("=".repeat(90));
} else {
  const output = {
    timestamp: new Date().toISOString(),
    node: process.version,
    protocol: { trials: TRIALS, warmupSteps: WARMUP_STEPS, seed: SEED, statistic: "min-of-trials" },
    calibration,
    results: allResults,
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}
