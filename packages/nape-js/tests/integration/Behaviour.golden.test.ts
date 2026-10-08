/**
 * Behaviour golden suite — the refactor safety net.
 *
 * Every scenario in `golden/scenarios.ts` isolates one engine subsystem
 * (integration, materials, contacts, every shape pair, sensors, fluids,
 * filters, pre-listeners, callbacks, sleeping, every joint type, breaking,
 * kinematics, compounds, all three broadphases, CCD, sub-stepping, mid-step
 * mutation, every space query, helpers, serialization continuation) and
 * records a full trace: sampled body states, the complete callback log and
 * scenario-specific probes (contacts, impulses, query results, mass data).
 *
 * Three tiers:
 *
 * 1. **Exact** — the trace must equal the golden bit for bit. Catches any
 *    observable change, including one-ULP drift and a callback shifting by
 *    one step. Platform-pinned like `Determinism.golden.test.ts` (Math.sin /
 *    cos differ in the last bit between V8 builds): runs only on the
 *    recording platform (CI's linux-x64).
 * 2. **Tolerance** — scenarios marked `stable` (non-chaotic) are also
 *    compared with a small relative tolerance, on every platform. When an
 *    optimisation intentionally changes floating-point rounding, tier 1
 *    fails everywhere; tier 2 then tells you whether the physics is still
 *    the same before you regenerate the goldens. A guard test keeps the
 *    `stable` flags honest by perturbing `dt` and measuring the drift.
 * 3. **Run-to-run** — two runs in one process must be bit-identical.
 *
 * Regenerate (only for an INTENDED, reviewed behaviour change):
 *   gh workflow run regen-goldens.yml --ref <branch>
 * or locally on linux-x64 with CI's node major:
 *   UPDATE_GOLDENS=1 npx vitest run tests/integration/Behaviour.golden.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import {
  Trace,
  diff,
  encode,
  explain,
  maxDeviation,
  perturbation,
  type TraceData,
} from "./golden/harness";
import { scenarios } from "./golden/scenarios";

const GOLDEN_PATH = join(__dirname, "__goldens__", "behaviour.golden.json");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

/** Tolerance tier: |a - g| <= ABS + REL * |g|. */
const ABS = 1e-6;
const REL = 1e-6;
/** dt perturbation used to verify the `stable` flags. */
const PERTURB = 1e-12;

function record(name: string): TraceData {
  const t = new Trace();
  scenarios[name].build(t);
  return encode(t.data) as TraceData;
}

function loadGoldens(): Record<string, any> {
  if (!existsSync(GOLDEN_PATH)) return {};
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
}

const goldens = loadGoldens();
const meta = goldens.__meta;
const exactEnv = meta != null && meta.platform === process.platform && meta.arch === process.arch;
const names = Object.keys(scenarios);

describe("Behaviour goldens — exact", () => {
  const updated: Record<string, unknown> = {};

  for (const name of names) {
    it.skipIf(!UPDATE && !exactEnv)(`${name}`, () => {
      const trace = record(name);
      if (UPDATE) {
        updated[name] = trace;
        return;
      }
      const golden = goldens[name];
      expect(golden, `missing golden for "${name}" — regenerate`).toBeDefined();
      const mismatches = diff(trace, golden, { abs: 0, rel: 0 }).map((l) => explain(l, golden));
      expect(mismatches, `${name} diverged from golden:\n${mismatches.join("\n")}`).toEqual([]);
    });
  }

  if (UPDATE) {
    it("writes updated goldens", () => {
      updated.__meta = {
        platform: process.platform,
        arch: process.arch,
        node: process.versions.node,
      };
      writeFileSync(GOLDEN_PATH, JSON.stringify(updated) + "\n");
      expect(Object.keys(updated).length).toBe(names.length + 1);
    });
  }
});

describe.skipIf(UPDATE)("Behaviour goldens — tolerance (stable scenarios, any platform)", () => {
  for (const name of names.filter((n) => scenarios[n].stable)) {
    it(`${name} matches golden within ${REL} relative`, () => {
      const golden = goldens[name];
      expect(golden, `missing golden for "${name}" — regenerate`).toBeDefined();
      const mismatches = diff(record(name), golden, { abs: ABS, rel: REL }).map((l) =>
        explain(l, golden),
      );
      expect(mismatches, `${name} drifted from golden:\n${mismatches.join("\n")}`).toEqual([]);
    });
  }

  it("every scenario has a golden and every golden a scenario", () => {
    const recorded = Object.keys(goldens).filter((k) => k !== "__meta");
    expect(recorded.sort()).toEqual([...names].sort());
  });
});

describe("Behaviour goldens — stability flags", () => {
  // A scenario may sit in the tolerance tier only if a relative dt
  // perturbation of 1e-12 moves its trace by far less than the tolerance
  // (i.e. it does not amplify rounding differences chaotically).
  for (const name of names.filter((n) => scenarios[n].stable)) {
    it(`${name} is insensitive to a ${PERTURB} dt perturbation`, () => {
      const base = record(name);
      perturbation.dtScale = 1 + PERTURB;
      let perturbed: TraceData;
      try {
        perturbed = record(name);
      } finally {
        perturbation.dtScale = 1;
      }
      expect(perturbed.events).toEqual(base.events);
      expect(maxDeviation(perturbed, base)).toBeLessThan(REL / 100);
    });
  }
});

describe("Behaviour goldens — run-to-run", () => {
  for (const name of names) {
    it(`${name} is bit-identical across two runs`, () => {
      const a = record(name);
      const b = record(name);
      const mismatches = diff(b, a, { abs: 0, rel: 0 });
      expect(mismatches, mismatches.join("\n")).toEqual([]);
    });
  }
});
