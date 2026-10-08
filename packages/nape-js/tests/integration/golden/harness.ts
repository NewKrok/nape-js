/**
 * Recording harness for the behaviour golden suite
 * (`tests/integration/Behaviour.golden.test.ts`).
 *
 * A scenario builds a world, registers the bodies / constraints it cares
 * about with a {@link Trace}, and steps it through `trace.run()`. The trace
 * records:
 *
 * - `samples` — full float64 state of every tracked body every N steps
 *   (position, rotation, velocity, angular velocity, sleeping flag — -1 while
 *   the body is not in a space);
 * - `events` — every callback the engine fires (interaction BEGIN / END for
 *   collision, sensor and fluid; body WAKE / SLEEP; constraint WAKE / SLEEP /
 *   BREAK; optionally ONGOING), stamped with the step index and named by
 *   tracked label, not by the global body id (so the log does not depend on
 *   how many bodies earlier tests allocated);
 * - `probes` — scenario-specific observations (arbiter contacts, impulses,
 *   query results, derived mass properties, …).
 *
 * Everything is plain JSON so it can be compared against a recorded golden.
 */
import {
  Body,
  BodyListener,
  CbEvent,
  CbType,
  ConstraintListener,
  InteractionListener,
  InteractionType,
  Space,
} from "../../../src";

/** Deterministic LCG so scenario construction is identical on every run. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export interface TraceData {
  /** Label of each tracked body, in sample-row order. */
  bodies: string[];
  samples: Array<[number, ...number[][]]>;
  events: string[];
  probes: Record<string, unknown>;
}

export interface RunOptions {
  /** Number of steps. */
  steps: number;
  /** Record body state every `every` steps (and after the last step). */
  every?: number;
  dt?: number;
  velIter?: number;
  posIter?: number;
  /** Called before each step with the step index (inputs, mutations). */
  before?: (step: number) => void;
  /** Called after each step with the step index (probes). */
  after?: (step: number) => void;
}

/**
 * Global multiplier applied to every `dt` the harness steps with. The test
 * file uses it to measure how strongly a scenario amplifies a tiny
 * perturbation (which scenarios are "stable" enough for the tolerance tier).
 */
export const perturbation = { dtScale: 1 };

export class Trace {
  readonly data: TraceData = { bodies: [], samples: [], events: [], probes: {} };
  readonly bodies: Body[] = [];
  private readonly names = new Map<unknown, string>();
  /** Index of the step currently being simulated (-1 before the first). */
  stepIndex = -1;
  private stepsDone = 0;

  /** Track a body; its state is sampled and its events are labelled `name`. */
  body<T extends Body>(b: T, name = `b${this.bodies.length}`): T {
    this.bodies.push(b);
    this.data.bodies.push(name);
    this.names.set(b, name);
    return b;
  }

  /** Label a constraint (or any interactor) for the event log. */
  name<T>(obj: T, name: string): T {
    this.names.set(obj, name);
    return obj;
  }

  label(obj: unknown): string {
    if (obj == null) return "null";
    return this.names.get(obj) ?? "?";
  }

  event(text: string): void {
    this.data.events.push(`${this.stepIndex}:${text}`);
  }

  probe(key: string, value: unknown): void {
    this.data.probes[key] = value;
  }

  /**
   * Log every interaction / body / constraint callback the space fires.
   * `ongoing` also logs ONGOING interaction events (verbose — use for small
   * scenarios only).
   */
  logEvents(space: Space, opts: { ongoing?: boolean } = {}): void {
    const types: Array<[InteractionType, string]> = [
      [InteractionType.COLLISION, "col"],
      [InteractionType.SENSOR, "sen"],
      [InteractionType.FLUID, "flu"],
    ];
    const evs: Array<[CbEvent, string]> = [
      [CbEvent.BEGIN, "BEGIN"],
      [CbEvent.END, "END"],
    ];
    if (opts.ongoing) evs.push([CbEvent.ONGOING, "ONGOING"]);
    for (const [ev, evName] of evs) {
      for (const [type, typeName] of types) {
        space.listeners.add(
          new InteractionListener(ev, type, CbType.ANY_BODY, CbType.ANY_BODY, (cb) => {
            const a = this.label(cb.int1);
            const b = this.label(cb.int2);
            const [lo, hi] = a < b ? [a, b] : [b, a];
            this.event(`${typeName}.${evName}:${lo}:${hi}`);
          }),
        );
      }
    }
    for (const [ev, evName] of [
      [CbEvent.WAKE, "WAKE"],
      [CbEvent.SLEEP, "SLEEP"],
    ] as Array<[CbEvent, string]>) {
      space.listeners.add(
        new BodyListener(ev, CbType.ANY_BODY, (cb) => {
          this.event(`body.${evName}:${this.label(cb.body)}`);
        }),
      );
    }
    for (const [ev, evName] of [
      [CbEvent.WAKE, "WAKE"],
      [CbEvent.SLEEP, "SLEEP"],
      [CbEvent.BREAK, "BREAK"],
    ] as Array<[CbEvent, string]>) {
      space.listeners.add(
        new ConstraintListener(ev, CbType.ANY_CONSTRAINT, (cb) => {
          this.event(`con.${evName}:${this.label(cb.constraint)}`);
        }),
      );
    }
  }

  /** Snapshot the state of every tracked body. */
  sample(): void {
    const rows: number[][] = this.bodies.map((b) => [
      b.position.x,
      b.position.y,
      b.rotation,
      b.velocity.x,
      b.velocity.y,
      b.angularVel,
      b.space == null ? -1 : b.isSleeping ? 1 : 0,
    ]);
    this.data.samples.push([this.stepsDone, ...rows]);
  }

  run(space: Space, opts: RunOptions): void {
    const every = opts.every ?? 30;
    const dt = (opts.dt ?? 1 / 60) * perturbation.dtScale;
    const velIter = opts.velIter ?? 10;
    const posIter = opts.posIter ?? 10;
    for (let i = 0; i < opts.steps; i++) {
      this.stepIndex = this.stepsDone;
      opts.before?.(this.stepsDone);
      space.step(dt, velIter, posIter);
      opts.after?.(this.stepsDone);
      this.stepsDone++;
      if (this.stepsDone % every === 0 || i === opts.steps - 1) this.sample();
    }
    this.stepIndex = this.stepsDone;
  }
}

// ── JSON encoding / comparison ──────────────────────────────────────────────

/** Encode non-finite numbers (JSON turns them into null) as strings. */
export function encode(value: unknown): unknown {
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    return String(value);
  }
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = encode(v);
    return out;
  }
  return value;
}

export interface DiffOptions {
  /** Absolute tolerance for numbers (0 = exact). */
  abs: number;
  /** Relative tolerance for numbers (0 = exact). */
  rel: number;
  /** Stop after this many mismatches. */
  limit?: number;
}

/**
 * Structural diff of `actual` against `golden`. Returns human-readable
 * mismatch lines (empty = equal). Numbers are compared with `===` (so -0
 * equals 0) or within `abs + rel * |golden|`.
 */
export function diff(actual: unknown, golden: unknown, opts: DiffOptions, path = "$"): string[] {
  const out: string[] = [];
  const limit = opts.limit ?? 12;
  const walk = (a: unknown, g: unknown, p: string): void => {
    if (out.length >= limit) return;
    if (typeof a === "number" && typeof g === "number") {
      if (a === g) return;
      if (Math.abs(a - g) <= opts.abs + opts.rel * Math.abs(g)) return;
      out.push(`${p}: ${a} !== golden ${g} (Δ ${a - g})`);
      return;
    }
    if (Array.isArray(a) && Array.isArray(g)) {
      if (a.length !== g.length) {
        out.push(`${p}: length ${a.length} !== golden ${g.length}`);
      }
      const n = Math.min(a.length, g.length);
      for (let i = 0; i < n; i++) walk(a[i], g[i], `${p}[${i}]`);
      return;
    }
    if (a && g && typeof a === "object" && typeof g === "object") {
      const keys = new Set([...Object.keys(a), ...Object.keys(g)]);
      for (const k of keys) {
        if (!(k in (a as object))) out.push(`${p}.${k}: missing (golden has it)`);
        else if (!(k in (g as object))) out.push(`${p}.${k}: unexpected (not in golden)`);
        else walk((a as any)[k], (g as any)[k], `${p}.${k}`);
      }
      return;
    }
    if (a !== g) out.push(`${p}: ${JSON.stringify(a)} !== golden ${JSON.stringify(g)}`);
  };
  walk(actual, golden, path);
  return out;
}

/** Largest relative deviation between two traces' numeric leaves. */
export function maxDeviation(a: unknown, b: unknown): number {
  let max = 0;
  const walk = (x: unknown, y: unknown): void => {
    if (typeof x === "number" && typeof y === "number") {
      const d = Math.abs(x - y) / (1 + Math.abs(y));
      if (d > max) max = d;
      return;
    }
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) max = Infinity;
      for (let i = 0; i < Math.min(x.length, y.length); i++) walk(x[i], y[i]);
      return;
    }
    if (x && y && typeof x === "object" && typeof y === "object") {
      for (const k of Object.keys(x)) walk((x as any)[k], (y as any)[k]);
      return;
    }
    if (x !== y) max = Infinity;
  };
  walk(a, b);
  return max;
}

const FIELDS = ["x", "y", "rotation", "vx", "vy", "angularVel", "sleeping"];

/**
 * Rewrite `$.samples[i][j][k]` in a mismatch line as
 * `samples @step N, body "label".field` using the golden's own labels.
 */
export function explain(line: string, golden: TraceData): string {
  return line.replace(/^\$\.samples\[(\d+)\]\[(\d+)\]\[(\d+)\]/, (m, i, j, k) => {
    const sample = golden.samples[Number(i)];
    const body = golden.bodies?.[Number(j) - 1];
    if (!sample || body == null) return m;
    return `samples @step ${sample[0]}, body "${body}".${FIELDS[Number(k)] ?? k}`;
  });
}
