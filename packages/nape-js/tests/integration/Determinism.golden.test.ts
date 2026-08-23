/**
 * Golden-snapshot determinism regression tests.
 *
 * Each scenario builds a seeded world, steps it a fixed number of times, and
 * compares the FULL float64 state of every body (position, rotation, velocity,
 * angular velocity, sleeping flag) plus the ordered BEGIN/END collision event
 * log against a golden snapshot recorded from a known-good engine build.
 *
 * The goldens guard refactors of the engine internals (broadphase, narrowphase,
 * CCD, solver ordering): any change that alters observable simulation behavior
 * — even by one ULP or by shifting a callback one step — fails these tests.
 *
 * PLATFORM PINNING: Math.sin/cos are not IEEE-exact and differ in the last bit
 * across platforms/V8 builds, so bit-exact goldens only reproduce on the
 * platform+arch that recorded them (see `__meta` in the golden file — CI's
 * linux-x64 is the reference). On other platforms the golden comparison is
 * skipped and the run-to-run determinism suite below still applies — that is
 * the portable guarantee the engine actually makes (same-platform rollback).
 *
 * Regenerate (only when a behavior change is INTENDED and reviewed) with the
 * regen-goldens workflow, which records on CI's own environment and commits
 * the result back to the branch:
 *   gh workflow run regen-goldens.yml --ref <branch>
 * (Local recording — UPDATE_GOLDENS=1 vitest run <this file> — only produces
 * CI-valid goldens on a linux-x64 machine with CI's node major.)
 */
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  Body,
  BodyType,
  CbEvent,
  CbType,
  Circle,
  InteractionListener,
  InteractionType,
  PivotJoint,
  Polygon,
  Space,
  Vec2,
} from "../../src";

const GOLDEN_PATH = join(__dirname, "__goldens__", "determinism.golden.json");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

// Deterministic LCG so scenario construction is identical on every run.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface ScenarioResult {
  bodies: number[][]; // [posx, posy, rot, velx, vely, angvel, sleeping?1:0] per body
  events: string[]; // ordered "step:EVENT:idA:idB" collision begin/end log
  baseId: number; // smallest body id in the scenario (for id normalization)
}

interface GoldenFile {
  __meta?: { platform: string; arch: string; node: string };
  [scenario: string]: any;
}

/** Step a space while recording body state and the collision event log. */
function runScenario(
  space: Space,
  steps: number,
  events: string[],
  velIter = 8,
  posIter = 3,
): ScenarioResult {
  for (let i = 0; i < steps; i++) {
    space.step(1 / 60, velIter, posIter);
  }
  const bodies: number[][] = [];
  let baseId = Infinity;
  for (const body of space.bodies) {
    if (body.id < baseId) baseId = body.id;
    bodies.push([
      body.position.x,
      body.position.y,
      body.rotation,
      body.velocity.x,
      body.velocity.y,
      body.angularVel,
      body.isSleeping ? 1 : 0,
    ]);
  }
  return { bodies, events, baseId };
}

function attachEventLog(space: Space, events: string[], stepRef: { n: number }): void {
  for (const ev of [CbEvent.BEGIN, CbEvent.END]) {
    space.listeners.add(
      new InteractionListener(
        ev,
        InteractionType.COLLISION,
        CbType.ANY_BODY,
        CbType.ANY_BODY,
        (cb: any) => {
          const label = ev === CbEvent.BEGIN ? "BEGIN" : "END";
          const id1 = cb.int1.castBody ? cb.int1.castBody.id : -1;
          const id2 = cb.int2.castBody ? cb.int2.castBody.id : -1;
          events.push(`${stepRef.n}:${label}:${Math.min(id1, id2)}:${Math.max(id1, id2)}`);
        },
      ),
    );
  }
}

/** Wrap space.step to track the current step index for the event log. */
function stepTracked(space: Space, steps: number, stepRef: { n: number }): void {
  for (let i = 0; i < steps; i++) {
    stepRef.n = i;
    space.step(1 / 60, 8, 3);
  }
}

/** Rebase event body ids onto the scenario's smallest id, so two runs of the
 *  same scenario (with different global id counters) become comparable. */
function normalizeEvents(result: ScenarioResult): string[] {
  return result.events.map((e) => {
    const [step, label, a, b] = e.split(":");
    return `${step}:${label}:${Number(a) - result.baseId}:${Number(b) - result.baseId}`;
  });
}

// ── Scenarios ────────────────────────────────────────────────────────────────

const scenarios: Record<string, () => ScenarioResult> = {
  /** Mixed shapes piling onto a floor — broadphase + narrowphase + solver. */
  "mixed-pile": () => {
    const rng = makeRng(0xc0ffee);
    const space = new Space(new Vec2(0, 600));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 400));
    floor.shapes.add(new Polygon(Polygon.box(1200, 20)));
    floor.space = space;
    for (let i = 0; i < 60; i++) {
      const body = new Body(BodyType.DYNAMIC, new Vec2((rng() - 0.5) * 500, -rng() * 400));
      if (i % 3 === 0) {
        body.shapes.add(new Circle(8 + rng() * 8));
      } else if (i % 3 === 1) {
        body.shapes.add(new Polygon(Polygon.box(14 + rng() * 10, 14 + rng() * 10)));
      } else {
        body.shapes.add(new Polygon(Polygon.regular(10, 10, 5)));
      }
      body.angularVel = (rng() - 0.5) * 6;
      body.space = space;
    }
    const events: string[] = [];
    const stepRef = { n: 0 };
    attachEventLog(space, events, stepRef);
    stepTracked(space, 180, stepRef);
    return runScenario(space, 0, events);
  },

  /** Same pile with deterministic mode on — guards the deterministic sorts. */
  "mixed-pile-deterministic": () => {
    const rng = makeRng(0xc0ffee);
    const space = new Space(new Vec2(0, 600));
    space.deterministic = true;
    const floor = new Body(BodyType.STATIC, new Vec2(0, 400));
    floor.shapes.add(new Polygon(Polygon.box(1200, 20)));
    floor.space = space;
    for (let i = 0; i < 60; i++) {
      const body = new Body(BodyType.DYNAMIC, new Vec2((rng() - 0.5) * 500, -rng() * 400));
      if (i % 2 === 0) {
        body.shapes.add(new Circle(8 + rng() * 8));
      } else {
        body.shapes.add(new Polygon(Polygon.box(14 + rng() * 10, 14 + rng() * 10)));
      }
      body.angularVel = (rng() - 0.5) * 6;
      body.space = space;
    }
    return runScenario(space, 180, []);
  },

  /** PivotJoint chain under gravity — constraint solver ordering. */
  "constraint-chain": () => {
    const space = new Space(new Vec2(0, 600));
    space.deterministic = true;
    const anchor = new Body(BodyType.STATIC, new Vec2(0, -200));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;
    let prev: Body = anchor;
    for (let i = 0; i < 40; i++) {
      const link = new Body(BodyType.DYNAMIC, new Vec2((i + 1) * 12, -200));
      link.shapes.add(new Polygon(Polygon.box(12, 4)));
      link.space = space;
      const joint = new PivotJoint(prev, link, new Vec2(6, 0), new Vec2(-6, 0));
      joint.space = space;
      prev = link;
    }
    return runScenario(space, 240, []);
  },

  /**
   * Rotating bodies passing near each other and a slope — exercises pairs
   * whose AABBs overlap while the shapes stay separated (SAT early-out path).
   */
  "rotation-graze": () => {
    const rng = makeRng(0xbeef);
    const space = new Space(new Vec2(0, 300));
    const slope = new Body(BodyType.STATIC, new Vec2(0, 250));
    slope.shapes.add(new Polygon([new Vec2(-400, 50), new Vec2(400, -60), new Vec2(400, 50)]));
    slope.space = space;
    for (let i = 0; i < 30; i++) {
      const body = new Body(BodyType.DYNAMIC, new Vec2(-350 + i * 24, -50 - rng() * 150));
      body.shapes.add(new Polygon(Polygon.box(20, 6)));
      body.angularVel = (rng() - 0.5) * 12;
      body.velocity = new Vec2((rng() - 0.5) * 80, 0);
      body.space = space;
    }
    const events: string[] = [];
    const stepRef = { n: 0 };
    attachEventLog(space, events, stepRef);
    stepTracked(space, 200, stepRef);
    return runScenario(space, 0, events);
  },

  /** Fast bullets against thin static walls — CCD / sweep-distance path. */
  "bullet-ccd": () => {
    const space = new Space(new Vec2(0, 0));
    for (let i = 0; i < 4; i++) {
      const wall = new Body(BodyType.STATIC, new Vec2(200 + i * 150, 0));
      wall.shapes.add(new Polygon(Polygon.box(4, 400)));
      wall.space = space;
    }
    for (let i = 0; i < 12; i++) {
      const bullet = new Body(BodyType.DYNAMIC, new Vec2(-100, -150 + i * 25));
      bullet.shapes.add(i % 2 === 0 ? new Circle(3) : new Polygon(Polygon.box(6, 6)));
      bullet.bullet = true;
      bullet.velocity = new Vec2(1500 + i * 120, (i % 3) * 40 - 40);
      bullet.angularVel = i % 2 === 0 ? 0 : 20;
      bullet.space = space;
    }
    const events: string[] = [];
    const stepRef = { n: 0 };
    attachEventLog(space, events, stepRef);
    stepTracked(space, 120, stepRef);
    return runScenario(space, 0, events);
  },

  /** Bodies coming to rest — sleeping / island (doForests) bookkeeping. */
  "settle-and-sleep": () => {
    const rng = makeRng(0xfeed);
    const space = new Space(new Vec2(0, 600));
    const floor = new Body(BodyType.STATIC, new Vec2(0, 200));
    floor.shapes.add(new Polygon(Polygon.box(800, 20)));
    floor.space = space;
    for (let i = 0; i < 25; i++) {
      const body = new Body(
        BodyType.DYNAMIC,
        new Vec2(-120 + (i % 5) * 60, -20 - Math.floor(i / 5) * 40),
      );
      body.shapes.add(new Polygon(Polygon.box(30, 30)));
      void rng();
      body.space = space;
    }
    return runScenario(space, 420, []);
  },
};

// ── Golden compare / record ──────────────────────────────────────────────────

function loadGoldens(): GoldenFile {
  if (!existsSync(GOLDEN_PATH)) return {};
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
}

const goldens = loadGoldens();
const meta = goldens.__meta;
// Bit-exact goldens only reproduce on the recording platform (Math.sin/cos
// differ in the last ULP across platforms/V8 builds).
const exactEnv = meta != null && meta.platform === process.platform && meta.arch === process.arch;

describe("Determinism golden snapshots", () => {
  const updated: GoldenFile = {};

  for (const [name, build] of Object.entries(scenarios)) {
    it.skipIf(!UPDATE && !exactEnv)(
      `${name} matches golden state exactly (${meta ? `${meta.platform}-${meta.arch}` : "unrecorded"})`,
      () => {
        const result = build();
        if (UPDATE) {
          updated[name] = { bodies: result.bodies, events: result.events };
          return;
        }
        const golden = goldens[name];
        expect(golden, `missing golden for "${name}" — run with UPDATE_GOLDENS=1`).toBeDefined();
        expect(result.events).toEqual(golden.events);
        expect(result.bodies.length).toBe(golden.bodies.length);
        for (let i = 0; i < result.bodies.length; i++) {
          for (let j = 0; j < 7; j++) {
            // Exact float64 equality: JSON round-trips doubles losslessly.
            expect(result.bodies[i][j], `${name}: body ${i} component ${j} diverged`).toBe(
              golden.bodies[i][j],
            );
          }
        }
      },
    );
  }

  if (UPDATE) {
    it("writes updated goldens", () => {
      updated.__meta = {
        platform: process.platform,
        arch: process.arch,
        node: process.versions.node,
      };
      writeFileSync(GOLDEN_PATH, JSON.stringify(updated, null, 1) + "\n");
      expect(Object.keys(updated).length).toBe(Object.keys(scenarios).length + 1);
    });
  }
});

// ── Portable determinism: two runs in the same process must be bit-identical ─
// This is the guarantee the engine makes on every platform (same-platform
// rollback/replay); it runs everywhere, including platforms where the
// golden snapshots above are skipped. Placed AFTER the golden suite so the
// extra body allocations here cannot shift the global ids the recorded
// golden event logs depend on.

describe("Determinism run-to-run (platform independent)", () => {
  for (const [name, build] of Object.entries(scenarios)) {
    it(`${name} is bit-identical across two runs`, () => {
      const run1 = build();
      const run2 = build();
      expect(normalizeEvents(run2)).toEqual(normalizeEvents(run1));
      expect(run2.bodies.length).toBe(run1.bodies.length);
      for (let i = 0; i < run1.bodies.length; i++) {
        for (let j = 0; j < 7; j++) {
          expect(run2.bodies[i][j], `${name}: body ${i} component ${j} diverged`).toBe(
            run1.bodies[i][j],
          );
        }
      }
    });
  }
});
