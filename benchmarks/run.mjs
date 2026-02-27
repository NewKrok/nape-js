/**
 * nape-js Benchmark Suite
 *
 * Measures physics simulation performance across three scenarios:
 *   A) Falling boxes — broadphase + collision + solving
 *   B) Constraint stress — chains of bodies linked by PivotJoints
 *   C) Wrapper overhead — same simulation via raw Haxe API vs. TS wrappers
 *
 * Usage:
 *   npm run benchmark
 */

// Import the compiled nape module (raw, for overhead comparison)
import napeRaw from "../src/core/nape-compiled.js";

// Import the TypeScript wrappers (from build output)
import { Space, Body, BodyType, Vec2, Circle, Polygon, PivotJoint } from "../dist/index.js";

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

  console.log(
    `  ${name.padEnd(45)} avg=${formatMs(avg).padStart(8)}  med=${formatMs(med).padStart(8)}  min=${formatMs(min).padStart(8)}  max=${formatMs(max).padStart(8)}`,
  );
  return { name, avg, med, min, max };
}

// ---------------------------------------------------------------------------
// Scenario A: Falling Boxes
// ---------------------------------------------------------------------------

function setupFallingBoxes(count) {
  return () => {
    const space = new Space(new Vec2(0, 600));

    // Floor
    const floor = new Body(BodyType.STATIC, new Vec2(0, 500));
    floor.shapes.add(new Polygon(Polygon.box(2000, 20)));
    floor.space = space;

    // Walls
    const wallL = new Body(BodyType.STATIC, new Vec2(-500, 0));
    wallL.shapes.add(new Polygon(Polygon.box(20, 1200)));
    wallL.space = space;

    const wallR = new Body(BodyType.STATIC, new Vec2(500, 0));
    wallR.shapes.add(new Polygon(Polygon.box(20, 1200)));
    wallR.space = space;

    // Dynamic boxes
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

      const joint = new PivotJoint(
        prev,
        link,
        new Vec2(7, 0),
        new Vec2(-7, 0),
      );
      joint.space = space;
      prev = link;
    }

    return space;
  };
}

// ---------------------------------------------------------------------------
// Scenario C: Wrapper Overhead — Raw Haxe API vs. TS Wrappers
// ---------------------------------------------------------------------------

function setupRawSimulation(count) {
  return () => {
    const space = new napeRaw.space.Space(new napeRaw.geom.Vec2(0, 600));

    const floor = new napeRaw.phys.Body(
      napeRaw.phys.BodyType.get_STATIC(),
      new napeRaw.geom.Vec2(0, 500),
    );
    floor.get_shapes().add(new napeRaw.shape.Polygon(napeRaw.shape.Polygon.box(2000, 20)));
    floor.set_space(space);

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 800;
      const y = -Math.random() * 500;
      const body = new napeRaw.phys.Body(
        napeRaw.phys.BodyType.get_DYNAMIC(),
        new napeRaw.geom.Vec2(x, y),
      );
      body.get_shapes().add(new napeRaw.shape.Polygon(napeRaw.shape.Polygon.box(15, 15)));
      body.set_space(space);
    }

    return space;
  };
}

function setupWrappedSimulation(count) {
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

console.log("=".repeat(90));
console.log("  nape-js Benchmark Suite");
console.log("=".repeat(90));
console.log();

console.log("--- A) Falling Boxes (space.step per iteration) ---");
bench("200 boxes – step(1/60)", setupFallingBoxes(200), (space) => space.step(1 / 60, 8, 3));
bench("500 boxes – step(1/60)", setupFallingBoxes(500), (space) => space.step(1 / 60, 8, 3));
bench("1000 boxes – step(1/60)", setupFallingBoxes(1000), (space) => space.step(1 / 60, 8, 3), 50);

console.log();
console.log("--- B) Constraint Stress (PivotJoint chains) ---");
bench("50-link chain – step(1/60)", setupConstraintChain(50), (space) => space.step(1 / 60, 8, 3));
bench("100-link chain – step(1/60)", setupConstraintChain(100), (space) => space.step(1 / 60, 8, 3));
bench("200-link chain – step(1/60)", setupConstraintChain(200), (space) => space.step(1 / 60, 8, 3), 50);

console.log();
console.log("--- C) Wrapper Overhead (raw Haxe vs. TS wrapper) ---");

const OVERHEAD_COUNT = 200;
const rawResult = bench(
  `Raw Haxe API – ${OVERHEAD_COUNT} boxes – step(1/60)`,
  setupRawSimulation(OVERHEAD_COUNT),
  (space) => {
    space.step(1 / 60, 8, 3);
    // Read positions (simulates rendering)
    const bodies = space.get_bodies();
    for (let i = 0; i < bodies.get_length(); i++) {
      const b = bodies.at(i);
      b.get_position().get_x();
      b.get_position().get_y();
      b.get_rotation();
    }
  },
);
const wrapResult = bench(
  `TS Wrapper – ${OVERHEAD_COUNT} boxes – step(1/60)`,
  setupWrappedSimulation(OVERHEAD_COUNT),
  (space) => {
    space.step(1 / 60, 8, 3);
    // Read positions (simulates rendering)
    for (const body of space.bodies) {
      body.position.x;
      body.position.y;
      body.rotation;
    }
  },
);

const overhead = ((wrapResult.avg - rawResult.avg) / rawResult.avg * 100).toFixed(1);
console.log();
console.log(`  Wrapper overhead: ${overhead}% (avg step + position readout)`);
console.log();
console.log("=".repeat(90));

// Memory
const mem = process.memoryUsage();
console.log(
  `  Memory: RSS=${(mem.rss / 1024 / 1024).toFixed(1)}MB  Heap=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
);
console.log("=".repeat(90));
