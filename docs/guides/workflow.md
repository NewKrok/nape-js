# nape-js — Development Workflow

## Pre-push Checklist

**Before every `git push`, always run all four:**

```bash
npm run format:check   # Prettier code style
npm run lint           # ESLint (unused vars, rules)
npm test               # all tests must pass
npm run build          # DTS generation (catches type errors vitest misses)
```

CI runs the same checks — a local failure will also fail on GitHub.

---

## Agent Orchestration

Claude acts as an **orchestrator** — delegates work to sub-agents to keep the main context clean.

| Task type | Delegate? | How |
|-----------|-----------|-----|
| Exploring codebase / finding files | Yes | `Explore` agent |
| Implementing a feature or fix | Yes | `general-purpose` agent (with clear spec) |
| Writing / updating tests | Yes | `general-purpose` agent |
| Code review | Yes | `general-purpose` agent (review prompt) |
| Simple file edits (< 3 files) | No | Do inline |
| Running commands (lint/test/build) | No | Do inline |
| Doc updates | No | Do inline |

**Sub-agent prompts must include:**
- Clear task description with acceptance criteria
- Relevant file paths to focus on
- Constraints (e.g., "don't modify the public API", "follow existing patterns")
- What NOT to do (e.g., "don't update docs, I'll handle that")

### Step-by-Step

1. **Understand** — Read the issue, identify affected files, read relevant source
2. **Implement** — Delegate to sub-agent(s), parallelize where possible
3. **Verify** — Run lint/test/build in main session
4. **Review** — Launch review agent checking: code quality, type safety, test coverage, performance, security
5. **Commit** — Conventional message + `Co-Authored-By: Claude <noreply@anthropic.com>`
6. **Docs** — Update per Documentation Update Matrix below
7. **Push** — Verify CI passes

### Workflow Checklist

```
[ ] Read and understand the task
[ ] Read relevant source code
[ ] Delegate implementation to sub-agent(s)
[ ] Delegate test writing to sub-agent (or same agent)
[ ] Run: npm run format:check ✓
[ ] Run: npm run lint ✓
[ ] Run: npm test ✓
[ ] Run: npm run build ✓
[ ] Launch review agent → address feedback
[ ] Commit with conventional message
[ ] Update docs (CLAUDE.md, README, ROADMAP.md, llms.txt/llms-full.txt)
[ ] Push and verify CI
```

---

## Build System

**Bundler:** tsup (ESM + CJS, minified, sourcemaps). Each published
workspace owns its own `tsup.config.ts` under `packages/<name>/`.

| Package | Entries | Output |
|---------|---------|--------|
| `@newkrok/nape-js` | `packages/nape-js/src/{index,serialization/index,worker/index,profiler/index}.ts` | `packages/nape-js/dist/` |
| `@newkrok/nape-pixi` | `packages/nape-pixi/src/index.ts` | `packages/nape-pixi/dist/` |

- **Target:** ES2020
- **Splitting + treeshake** enabled on nape-js (P47 — CJS dedup); off on nape-pixi (single-entry)
- **`__PACKAGE_VERSION__`** injected at build time in nape-js
- **Sizes:** nape-js ~174 KB gzip bundled (~852 KB raw: 208 KB `index.js` + ~632 KB shared engine chunk), nape-pixi ~10 KB ESM (17 KB d.ts)

Root `npm run build` fans out to every workspace (`--workspaces --if-present`).

---

## Linting & Formatting

**ESLint** (`eslint.config.js` at repo root, covers all workspaces):
- TypeScript ESLint recommended + Prettier integration
- `@typescript-eslint/no-explicit-any: off` — allowed per architecture (circular dep prevention)
- `_`-prefixed unused args allowed
- Special exemptions for Haxe-ported files in `packages/nape-js/src/native/` (self-assign, no-var, etc.)
- `packages/*/examples/` ignored (reference code, not production)

**Prettier** (`.prettierrc`):
- Double quotes, semicolons, trailing commas
- 100-char line width

```bash
npm run format          # auto-fix formatting across all workspaces
npm run format:check    # verify (CI mode)
npm run lint            # lint src/ and tests/ across all workspaces
```

---

## CI/CD Pipelines

### ci.yml — Every push & PR

Runs in parallel on Node 22:

| Job | Command |
|-----|---------|
| Build | `npm run build` (all workspaces) |
| Tests | `npm test` (all workspaces) |
| Lint | `npm run lint` (all workspaces) |
| Format | `npm run format:check` (all workspaces) |
| Circular deps | `npm run check:circular` (nape-js only, ≤27 allowed) |

### release.yml — Independent per-package auto-publish

Triggered after green CI on master (skips any commit whose subject starts
with `release`, catching both legacy `release: vX` and new
`release(pkg): X` forms). Delegates to [`scripts/ci/release.mjs`](../../scripts/ci/release.mjs)
which handles every public workspace:

1. **Discover** — walks `packages/*/package.json`, skips any with `"private": true`.
2. **Find the package's last tag** — format `<short>-v<ver>` (e.g. `nape-js-v3.30.1`). For nape-js, if no `<short>-v*` tag exists yet, falls back to the legacy `v*` pattern.
3. **Scope commits to the package** — `git log <last-tag>..HEAD -- packages/<short>/`. Commits whose subjects start with `release` are filtered out.
4. **Determine bump** from those commits' conventional prefixes (only code-affecting prefixes count):
   - `BREAKING CHANGE` / `!:` → **major**
   - `feat:` → **minor**
   - `fix:` / `perf:` / `refactor:` → **patch**
   - `docs:` / `chore:` / `style:` / `test:` / `build:` / `ci:` → **no release** (even when files under `packages/<name>/` are touched)
   - No commits touching the package → **skip** (no no-op release)
5. **Bump, commit, tag, push, publish**, then create a GitHub Release.

Run `node scripts/ci/release.mjs --dry-run` to preview locally.

Notes:
- The CI runs the whole flow in one job; each package's release is sequential so tag creation never races.
- If nape-js goes **major** the script logs a warning — nape-pixi's `peerDependencies` range may need a manual update in a follow-up commit before the next release run.

### deploy-pages.yml — Docs site

Runs `npm run build:docs` (tsup + TypeDoc) → deploys `docs/` to GitHub Pages.
Triggered once at the end of each release run.

### benchmark.yml — Performance budget

On PRs: compares against master baseline, fails if >10% regression.
On master: saves new baseline for future PRs.

**Measuring locally.** Use `npm run benchmark` — it passes `--expose-gc`, which
the harness needs to collect between trials rather than eating a major GC inside
a measurement window. Each scenario builds a **seeded** scene per trial, warms
up, then times the whole window and reports the **fastest** trial: GC and
scheduling noise only ever adds time, so the minimum is the robust estimate.

Reported run-to-run repeatability is ~3% typical and ~6% worst case (the older
protocol, which used `Math.random()` scenes and per-step medians, swung 15–67%
and could not resolve anything below ~10%). Two practical consequences:

- The `q1-spread` column is the health signal — how far the *fastest quartile* of
  trials spreads. Above ~5% the machine was too busy and that row is soft;
  `compare.mjs` marks such rows `~` and downgrades an over-threshold verdict to
  INCONCLUSIVE rather than failing on noise.
- `compare.mjs` skips calibration normalization when both runs report the same
  Node version, since within one machine the calibration factor is itself ~10%
  noise that would land on every comparison. Pass `--normalize` to force it.

Changes below ~5% need a dedicated measurement (many trials, idle machine), not
a single suite run.

---

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug description
refactor(scope): restructure without behavior change
perf(scope): performance improvement
docs: update documentation
chore: maintenance task
```

Breaking changes: use `feat!:` or add `BREAKING CHANGE` footer.

---

## Documentation Update Matrix

When a PR changes features, APIs, priorities, or versions:

| File | What to update | When |
|------|----------------|------|
| `CLAUDE.md` | Test count, key features, package status | New features |
| `ROADMAP.md` | Priority table, status, competitive analysis | Priority changes |
| `docs/guides/architecture.md` | Internal patterns, registration flow | Architecture changes |
| `docs/guides/multiplayer-guide.md` | Server setup, protocol, prediction | Multiplayer changes |
| `docs/guides/cookbook.md` | Add recipe for new feature, update existing recipes | New features, API changes |
| `docs/guides/troubleshooting.md` | Add entry for new gotchas, update fixes | Bug fixes, API gotchas |
| `docs/guides/anti-patterns.md` | Add entry for new pitfalls | Bug fixes, performance changes |
| `README.md` | Quick start, API tables, badge versions | Public API changes, releases |
| `packages/nape-pixi/README.md` | Quickstart, API, migration guide | nape-pixi API changes |
| `packages/nape-js/llms.txt` | Class list, links, quick start | nape-js public API additions/removals |
| `packages/nape-js/llms-full.txt` | Complete API reference, gotchas (the header version line is stamped automatically by `release.mjs`) | Any nape-js public API change |
| `packages/<pkg>/package.json` | `version` field (CI does this automatically) | Releases |

---

## Available Scripts

Root-level scripts (run from repo root). `--workspaces --if-present` fans
out to both nape-js and nape-pixi where applicable.

| Command | Purpose |
|---------|---------|
| `npm run build` | tsup → `packages/*/dist/` (both packages) |
| `npm test` | vitest (both packages) |
| `npm run test:watch` | vitest watch mode (nape-js only) |
| `npm run lint` | ESLint (both packages) |
| `npm run format` | Prettier auto-fix (both packages) |
| `npm run format:check` | Prettier verify (both packages) |
| `npm run check:circular` | madge circular dep check (nape-js only; nape-pixi has none) |
| `npm run benchmark` | Performance benchmark (uses `packages/nape-js/dist/`) |
| `npm run benchmark:compare` | Compare vs baseline |
| `npm run benchmark:update-baseline` | Save new baseline |
| `npm run build:docs` | Build bundle + TypeDoc |
| `npm run build:typedoc` | TypeDoc only (entry: `packages/nape-js/src/index.ts`) |
| `npm run serve:docs` | Local docs server (port 5500) |
| `npm run dev:multiplayer` | Docs (5500) + server (3001) |
| `node scripts/ci/release.mjs --dry-run` | Preview what would publish on next master merge |

---

## Circular Dependencies

Checked via `npm run check:circular` (madge). Current limit: **≤27 cycles**.

The ZPP_* internal layer has inherent circular references from the Haxe port.
These are managed via the registration/bootstrap pattern — see `docs/guides/architecture.md`.

---

## Node & Platform

- **Node:** ≥18 (package.json `engines`)
- **CI:** Node 22, Ubuntu latest
- **Runtime deps:** zero (pure TypeScript)
