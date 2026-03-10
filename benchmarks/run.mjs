/**
 * nape-js Benchmark Suite
 *
 * Measures physics simulation performance across three scenarios:
 *   A) Falling boxes — broadphase + collision + solving
 *   B) Constraint stress — chains of bodies linked by PivotJoints
 *   C) Position readout — step + iterating body positions (render loop cost)
 *
 * Usage:
 *   npm run benchmark              # human-readable output
 *   node benchmarks/run.mjs --json  # JSON output for CI comparison
 */

import { Space, Body, BodyType, Vec2, Circle, Polygon, PivotJoint } from "../dist/index.js";

const JSON_MODE = process.argv.includes("--json");

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

const allResults = [];

function bench(name, setup, run, iterations = 100) {
  const ctx = setup();
  // Warm up
  for (let i = 0; i < 10; i++) run(ctx);

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    run(ctx);
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const med = median(times);
  const min = Math.min(...times);
  const max = Math.max(...times);

  if (!JSON_MODE) {
    console.log(
      `  ${name.padEnd(45)} avg=${formatMs(avg).padStart(8)}  med=${formatMs(med).padStart(8)}  min=${formatMs(min).padStart(8)}  max=${formatMs(max).padStart(8)}`,
    );
  }

  const result = { name, avg, med, min, max };
  allResults.push(result);
  return result;
}

// ---------------------------------------------------------------------------
// Calibration — environment-independent normalization
// Runs a fixed CPU workload so benchmark results can be compared across
// machines (e.g., dev laptop vs. CI runner) by dividing by this factor.
// ---------------------------------------------------------------------------

function calibrate(iterations = 7) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    let x = 0;
    const start = performance.now();
    for (let j = 0; j < 1_000_000; j++) x += Math.sqrt(j);
    times.push(performance.now() - start);
    void x; // prevent dead-code elimination
  }
  return median(times);
}

// ---------------------------------------------------------------------------
// Scenario A: Falling Boxes
// ---------------------------------------------------------------------------

function setupFallingBoxes(count) {
  return () => {
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
      const x = (Math.random() - 0.5) * 800;
      const y = -Math.random() * 2000;
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      body.shapes.add(new Polygon(Polygon.box(10 + Math.random() * 20, 10 + Math.random() * 20)));
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
  return () => {
    const space = new Space(new Vec2(0, 600));

    const floor = new Body(BodyType.STATIC, new Vec2(0, 500));
    floor.shapes.add(new Polygon(Polygon.box(2000, 20)));
    floor.space = space;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 800;
      const y = -Math.random() * 500;
      const body = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      body.shapes.add(new Polygon(Polygon.box(15, 15)));
      body.space = space;
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
  console.log("  Calibrating...");
}

const calibration = calibrate();

if (!JSON_MODE) {
  console.log(`  Calibration factor: ${formatMs(calibration)} (1M Math.sqrt ops, median of 7 runs)`);
  console.log();
}

if (!JSON_MODE) console.log("--- A) Falling Boxes (space.step per iteration) ---");
bench("200 boxes – step(1/60)", setupFallingBoxes(200), (space) => space.step(1 / 60, 8, 3));
bench("500 boxes – step(1/60)", setupFallingBoxes(500), (space) => space.step(1 / 60, 8, 3));
bench("1000 boxes – step(1/60)", setupFallingBoxes(1000), (space) => space.step(1 / 60, 8, 3), 50);

if (!JSON_MODE) {
  console.log();
  console.log("--- B) Constraint Stress (PivotJoint chains) ---");
}
bench("50-link chain – step(1/60)", setupConstraintChain(50), (space) => space.step(1 / 60, 8, 3));
bench("100-link chain – step(1/60)", setupConstraintChain(100), (space) => space.step(1 / 60, 8, 3));
bench("200-link chain – step(1/60)", setupConstraintChain(200), (space) => space.step(1 / 60, 8, 3), 50);

if (!JSON_MODE) {
  console.log();
  console.log("--- C) Position Readout (step + iterate x/y/rotation for all bodies) ---");
}
bench(
  "200 boxes – step + position readout",
  setupPositionReadout(200),
  (space) => {
    space.step(1 / 60, 8, 3);
    for (const body of space.bodies) {
      void body.position.x;
      void body.position.y;
      void body.rotation;
    }
  },
);
bench(
  "500 boxes – step + position readout",
  setupPositionReadout(500),
  (space) => {
    space.step(1 / 60, 8, 3);
    for (const body of space.bodies) {
      void body.position.x;
      void body.position.y;
      void body.rotation;
    }
  },
);

if (!JSON_MODE) {
  console.log();
  console.log("=".repeat(90));
  const mem = process.memoryUsage();
  console.log(
    `  Memory: RSS=${(mem.rss / 1024 / 1024).toFixed(1)}MB  Heap=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
  );
  console.log("=".repeat(90));
} else {
  const output = {
    timestamp: new Date().toISOString(),
    node: process.version,
    calibration,
    results: allResults,
  };
  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
}
