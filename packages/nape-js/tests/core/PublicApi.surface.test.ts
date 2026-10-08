/**
 * Public API surface snapshot.
 *
 * Records, for every package entry point (`.`, `./serialization`, `./replay`,
 * `./worker`, `./profiler`), each runtime export and — for classes — their
 * base class plus every static and prototype member with its kind (method,
 * getter, setter, accessor). A refactor that drops, renames or changes the
 * kind of a public member fails here instead of in a user's build. Internal
 * members (`_foo`, `zpp_*`) are left out — renaming those is what a refactor
 * is for.
 *
 * Type-only exports are erased at runtime and are covered by `npm run
 * typecheck` / the DTS build, not by this test.
 *
 * Intended surface changes: regenerate with
 *   UPDATE_GOLDENS=1 npx vitest run tests/core/PublicApi.surface.test.ts
 * and review the diff of `__goldens__/public-api.json` (platform independent).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import * as main from "../../src";
import * as serialization from "../../src/serialization";
import * as replay from "../../src/replay";
import * as worker from "../../src/worker";
import * as profiler from "../../src/profiler";

const GOLDEN_PATH = join(__dirname, "__goldens__", "public-api.json");
const UPDATE = process.env.UPDATE_GOLDENS === "1";

const ENTRIES: Record<string, Record<string, unknown>> = {
  ".": main,
  "./serialization": serialization,
  "./replay": replay,
  "./worker": worker,
  "./profiler": profiler,
};

const FN_BUILTINS = new Set(["length", "name", "prototype", "arguments", "caller"]);

/**
 * Members a refactor may freely rename: `_foo` / `zpp_*` are internal
 * (`@internal`, stripped from the .d.ts). `__foo` stays — those are the
 * UserConstraint hooks subclasses override.
 */
function isInternal(key: string): boolean {
  return key.startsWith("zpp_") || (key.startsWith("_") && !key.startsWith("__"));
}

function memberKinds(obj: object, skip: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.getOwnPropertyNames(obj).sort()) {
    if (skip.has(key) || isInternal(key)) continue;
    const d = Object.getOwnPropertyDescriptor(obj, key)!;
    if (d.get && d.set) out[key] = "accessor";
    else if (d.get) out[key] = "getter";
    else if (d.set) out[key] = "setter";
    else if (typeof d.value === "function") out[key] = "method";
    else out[key] = `value:${typeof d.value}`;
  }
  return out;
}

function isClass(fn: object): boolean {
  return /^class[\s{]/.test(Function.prototype.toString.call(fn));
}

function describeExport(value: unknown): unknown {
  if (typeof value === "function") {
    if (!isClass(value)) return { kind: "function", arity: value.length };
    const base = Object.getPrototypeOf(value);
    return {
      kind: "class",
      extends: base && base !== Function.prototype ? base.name : null,
      static: memberKinds(value, FN_BUILTINS),
      proto: memberKinds(value.prototype, new Set(["constructor"])),
    };
  }
  if (value === null) return { kind: "null" };
  if (typeof value === "object") return { kind: "object", keys: Object.keys(value).sort() };
  return { kind: typeof value };
}

function surface(): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [entry, mod] of Object.entries(ENTRIES)) {
    out[entry] = {};
    for (const name of Object.keys(mod).sort()) {
      // VERSION changes on every release; only its presence is part of the API.
      out[entry][name] = name === "VERSION" ? { kind: "string" } : describeExport(mod[name]);
    }
  }
  return out;
}

/** Flatten to "entry name.member: kind" lines so a diff reads as a list. */
function lines(s: Record<string, Record<string, any>>): string[] {
  const out: string[] = [];
  for (const [entry, exports] of Object.entries(s)) {
    for (const [name, d] of Object.entries(exports)) {
      const head = `${entry} ${name}`;
      if (d.kind !== "class") {
        out.push(`${head}: ${JSON.stringify(d)}`);
        continue;
      }
      out.push(`${head}: class extends ${d.extends}`);
      for (const [m, k] of Object.entries(d.static)) out.push(`${head}.${m} (static): ${k}`);
      for (const [m, k] of Object.entries(d.proto)) out.push(`${head}#${m}: ${k}`);
    }
  }
  return out;
}

describe("public API surface", () => {
  it("matches the recorded surface", () => {
    const current = surface();
    if (UPDATE || !existsSync(GOLDEN_PATH)) {
      writeFileSync(GOLDEN_PATH, JSON.stringify(current, null, 1) + "\n");
      if (!UPDATE) throw new Error("public-api.json was missing — recorded it, re-run");
      return;
    }
    const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
    const now = new Set(lines(current));
    const was = new Set(lines(golden));
    const removed = [...was].filter((l) => !now.has(l));
    const added = [...now].filter((l) => !was.has(l));
    expect(
      removed,
      `public API removed or changed — if intended, regenerate public-api.json:\n${removed.join("\n")}`,
    ).toEqual([]);
    expect(
      added,
      `public API added — regenerate public-api.json to accept:\n${added.join("\n")}`,
    ).toEqual([]);
  });

  it("covers a meaningful surface", () => {
    const all = lines(surface());
    expect(all.length).toBeGreaterThan(800);
    expect(all).toContain(". Space#step: method");
    expect(all).toContain(". Body#position: accessor");
  });
});
