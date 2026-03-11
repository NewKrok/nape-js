# nape-js — Development Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase has been
fully modernized: all code extracted from the compiled blob (`nape-compiled.js`, originally
~82k lines) into clean, typed TypeScript classes. `nape-compiled.js` is now **deleted**.

### Architecture

```
Public API wrappers (src/{phys,shape,constraint,callbacks,dynamics,geom,space}/)
        ↕
Internal ZPP_* classes (src/native/)
        ↕
Engine bootstrap (src/core/engine.ts → ZPPRegistry.ts + bootstrap.ts)
```

### Build & Test

```bash
npm run build        # tsup → dist/
npm test             # vitest — 3118 tests across 147 files
npm run lint         # eslint + prettier
```

### Pre-push checklist

**Before every `git push`, always run all three:**

1. `npm run lint` — ESLint + Prettier must pass (catches unused vars, formatting issues)
2. `npm test` — all tests must pass
3. `npm run build` — DTS generation must succeed

The build step catches TypeScript type errors that vitest does not (e.g., missing method
declarations for runtime-copied prototype methods). Never push without a green lint + test + build.

---

## Codebase State

All Haxe modernization is complete. The codebase is **pure TypeScript**, fully typed,
tree-shakeable, and minified. Key facts:

- **85 ZPP\_\* internal classes** in `src/native/`
- **68 public API classes** in `src/` with direct `zpp_inner` access
- **Bundle:** ~994 KB minified ESM + CJS, dual exports map, tree shaking via `bootstrap.ts`
- **Tests:** 3118 passing across 147 files
- **`strict: true`**, `tsc --noEmit` → 0 errors

### Key architectural patterns (reference)

**Registration flow:**

- `src/core/bootstrap.ts` — single place for all `nape.xxx = Foo` assignments and
  `_createFn`/factory-callback wiring. Imported first from `index.ts` + `tests/setup.ts`.
- `src/native/util/ZPPRegistry.ts` (`registerZPPClasses`) — registers all 85 ZPP classes,
  initializes the `nape` namespace object, calls `_init()`/`_initStatics()`/`_initEnums()`.
- `src/native/util/ZNPRegistry.ts` (`registerZNPClasses`) — creates ZNPNode/ZNPList/ZPP_Set
  subclass pairs for each element type.
- `src/core/engine.ts` — lazy `getNape()` + `ensureEnumsReady()`.

**Factory callback pattern** (ZPP → public API subclass instances):

- `ZPP_Callback`: `_createBodyCb`, `_createConCb`, `_createIntCb`, `_createPreCb`
- `ZPP_Arbiter`: `_createColArb`, `_createFluidArb`
- `ZPP_*Joint`: `_createFn` on each joint class

**Subclasses using `extends`** (Body, Circle, Polygon, all joints, callbacks, arbiters)
self-register from `index.ts` — they cannot be side-effect imported from `engine.ts` due
to ESM circular dependency (`class extends undefined` at init time).

**`ensureEnumsReady` pattern**: Uses `var` (not `let`) to avoid temporal dead zone. Called
by each of the 6 enum classes after self-registering; fires `_initEnums` once all 6 are ready.

**`any` usage rules in native files:**

- `outer`/`wrap`/`wrap_min`/`wrap_max` → always `any` (circular ESM prevention + Haxe pool disconnection)
- `_nape`/`_zpp` static namespace refs → always `any` (dynamic dispatch)
- `_wrapFn` callbacks → `((zpp: ZPP_Foo) => any) | null`
- User-facing `userData` → `Record<string, unknown> | null`
- Dynamic ZNPList/ZNPNode/ZPP_Set subclass fields → `any` (created at runtime)

**Iterator loop pattern** (manual ZPP iterator — Body.ts style):

```ts
const iter = arbList.iterator();
while (true) {
  iter.zpp_inner.zpp_inner.valmod();
  const length = iter.zpp_inner.zpp_gl();   // zpp_gl() is on TypedList (NapeListFactory)
  iter.zpp_critical = true;
  if (iter.zpp_i >= length) {
    iter.zpp_next = getNape().dynamics.ArbiterIterator.zpp_pool;
    getNape().dynamics.ArbiterIterator.zpp_pool = iter;
    iter.zpp_inner = null;
    break;
  }
  iter.zpp_critical = false;
  const item = iter.zpp_inner.at(iter.zpp_i++);
  // ... process item
}
```

`zpp_gl()` is defined on `TypedList.prototype` in `src/util/NapeListFactory.ts` — it computes
the validated length from `ZPP_PublicList.user_length`.

---

## Roadmap

### Priority 29: Test coverage — target ≥80% 🔶 In progress

Steps 1–6 done (+959 tests, 2269 → 3228). All previously crashing APIs are now fixed and tested.

**Current coverage: ~54.3% statements** (was ~44.7% before Step 4 + bugfixes; Step 6 expected to push this higher).

**Step 5 (partial — 2026-03-11):** Added `ZPP_ColArbiter.test.ts` (+22 tests) and `ZPP_FluidArbiter.test.ts` (+14 tests), covering preStep/impulse/warm-start/pool/material paths.

**Step 6 (2026-03-11):** +110 tests across three files:
- `ZPP_Ray.test.ts` — full rewrite (~45 tests): constructor fields, invalidation callbacks,
  `validate_dir` normalisation, `rayAABB` all quadrants, `aabbtest`/`aabbsect`,
  `circlesect`/`polysect` via ZPP shapes, full `Space.rayCast`/`rayMultiCast` integration
  (both broadphase algorithms, `maxDistance`, inner mode, multi-hit ordering).
- `ZPP_Collide.test.ts` — +33 tests: `polyContains`, `shapeContains` polygon routing,
  `bodyContains` multi-shape/polygon, `containTest` mixed shape types, `testCollide_safe`
  reversed args, `flowCollide` via fluid simulation, `contactCollide` via simulation
  (circle-circle, circle-polygon, polygon-polygon).
- `ZPP_Broadphase.integration.test.ts` — new file, 35 tests: body insert/remove for both
  algorithms, AABB sync for dynamic shapes, collision consistency, 10-body scenes,
  raycast hit/miss/multicast for both algorithms, extreme positions.

**Remaining gaps (Step 7):**
- `ZPP_Collide` ~21%→improving, `ZPP_Broadphase` ~27%→improving, `ZPP_Ray` ~44%→improving
- `ZPP_Space` deeper paths ~57%, `ZPP_Body` ~73%
- Reaching ≥80% requires further ZPP native path tests (ZPP_Space, ZPP_Body deeper paths)

---

### Priority 34: Granular tree shaking (lazy ZPP registration) ❌ Cancelled

**Effort: XL | Impact: large (bundle) | Risk: high**

**Decision (2026-03-10): Not worth pursuing.** Investigation revealed:

- The current `sideEffects` config in `package.json` is **correct** — `dist/index.js` and
  `dist/index.cjs` legitimately have side effects (bootstrap runs nape namespace assignments,
  `_createFn` wiring, `_bindBodyWrapForInteractor`, etc.).
- Tree shaking is **architecturally impossible** without the full P34 refactor because
  `index.ts` always imports `bootstrap.ts`, which imports every class unconditionally.
- Competing engines (Three.js, Planck.js, Matter.js) do not use lazy registration either —
  they ship single concatenated ESM builds and rely on standard bundler tree shaking of
  named exports, which only helps when the user avoids the entry point entirely.
- The only engine with true per-class tree shaking is Rapier (non-compat), which requires
  an async `init()` call — a DX tradeoff not worth making for nape-js.
- The full lazy ZPP registration refactor remains theoretically possible but the complexity
  and risk are disproportionate to the benefit.

---

### Priority 36: Server-side + demo examples

**Effort: M | Impact: medium | Risk: low**

The engine has no DOM dependencies and runs on Node.js already. Goals:

- Verify bundle is DOM-free (no `window`/`document` references)
- `/examples/server/` — Node.js script that runs a simulation and outputs positions
- `/examples/browser/` — canvas renderer + physics loop for web use
- CI job ensuring examples run on Node.js (regression protection)

---

### Priority 37: Serialization API

**Effort: L | Impact: medium | Risk: medium**

State snapshot + restore: `space.toJSON()` / `Space.fromJSON(data)`:

- Body positions, angles, velocities, types
- Shape types and offsets
- Constraint definitions
- Use cases: save/load, replay, server↔client sync

---

### Priority 38: Debug draw API

**Effort: M | Impact: medium (DX) | Risk: low**

Abstract debug-rendering interface following the Box2D `b2Draw` pattern. The engine
traverses its internal state and calls user-provided draw callbacks — no concrete
renderer ships in the core bundle.

**Design:**

- `DebugDraw` — abstract class with primitive draw methods:
  `drawSegment`, `drawCircle`, `drawSolidCircle`, `drawPolygon`, `drawSolidPolygon`,
  `drawPoint`, `drawTransform`
- `Space.debugDraw(drawer, flags)` — walks bodies, shapes, constraints, contacts,
  broadphase AABBs, and velocity vectors; calls the appropriate `drawer` methods
- `DebugDrawFlags` bitmask — `SHAPES`, `JOINTS`, `CONTACTS`, `AABB`, `CENTER_OF_MASS`,
  `VELOCITIES` (user picks which layers to render)
- **No concrete renderer in the library** — keeps the bundle at 0 KB extra for users
  who don't use debug draw

**Reference implementations (docs/examples, not in core bundle):**

- `CanvasDebugDraw` — HTML5 Canvas 2D context (~200 lines, in `docs/`)
- `ThreeDebugDraw` — Three.js `LineSegments` overlay (~200 lines, in `docs/`)
- `PixiDebugDraw` — PixiJS `Graphics` API (~200 lines, in `docs/`) — **highest priority**
  reference impl; PixiJS is the #1 pure 2D renderer (~46.6k stars, ~403k npm/week) and
  the most natural pairing for external physics engines
- `P5DebugDraw` — p5.js immediate-mode drawing (~150 lines, in `docs/`) — optional,
  targets the educational/creative-coding community (~23.5k stars)
- All integrate with the existing `DemoRunner` 2D/3D toggle where applicable

**Renderer ecosystem research (2026-03):**

Best pairing targets (pure renderers, no built-in physics):
- **PixiJS** — 46.6k stars, ~403k npm/week, WebGL/WebGPU. #1 target.
- **p5.js** — 23.5k stars, ~40-66k npm/week, Canvas+WebGL. Educational reach.
- **Two.js** — 8.5k stars, ~3k npm/week, SVG/Canvas/WebGL. Small community.

Not targeted (built-in physics or non-physics use case):
- Phaser (38k stars) — bundles Arcade Physics + Matter.js
- Konva (14.2k stars) — UI/editor focus, not physics
- Fabric.js (31k stars) — design tool/whiteboard focus
- Excalibur / KAPLAY — self-contained with own physics

**Why Box2D pattern over Rapier-style buffers:**

- Semantic primitives (circle vs polygon vs point) give renderers more information
- Fits naturally into Canvas 2D, Three.js, PixiJS, and p5.js pipelines
- Matches the existing `DemoRunner` architecture (2D canvas + 3D WebGL)
- Users can implement for any target (PixiJS, SVG, raw WebGL, etc.)

**Bundle impact:** The abstract `DebugDraw` class + `Space.debugDraw()` traversal adds
~5–8 KB minified to core (<1% of ~994 KB). Tree-shakeable if not imported.

---

## Priority table

| Priority                              | Effort | Impact  | Risk   | Status            |
| ------------------------------------- | ------ | ------- | ------ | ----------------- |
| P21 — Drop `__class__` / `$hxClasses` | S      | medium  | low    | ✅ Done           |
| P22 — Minification                    | XS     | large   | none   | ✅ Done           |
| P23 — `__zpp` → direct imports        | M      | large   | medium | ✅ Done           |
| P24 — Namespace reduction             | S      | medium  | low    | ✅ Done           |
| P25 — `Any` → real types              | XL     | largest | medium | ✅ Done           |
| P26 — Tree shaking                    | L      | large   | high   | ✅ Done           |
| P27 — HaxeShims audit                 | S      | small   | low    | ✅ Done           |
| P28 — API ergonomics (28a+28b+28c)    | M      | DX      | low    | ✅ Done           |
| P29 — Test coverage ≥80%              | L      | safety  | none   | 🔶 ~54.3%+ (Step 6 done, 3228 tests, Step 7 pending) |
| P30 — TSDoc documentation             | L      | DX      | none   | ✅ Done           |
| P31 — API ergonomics additions        | M      | DX      | low    | ✅ Done           |
| P32 — Internal accessor cleanup       | S      | small   | low    | ✅ Done           |
| P33 — Benchmark CI                    | M      | medium  | low    | ✅ Done           |
| P34 — Granular tree shaking           | XL     | large   | high   | ❌ Cancelled      |
| P35 — Type system improvements        | S      | DX      | low    | ✅ Done           |
| P36 — Server-side + demo examples     | M      | medium  | low    | ⬜ Not started    |
| P37 — Serialization API               | L      | medium  | medium | ⬜ Not started    |
| P38 — Debug draw API                  | M      | DX      | low    | ⬜ Not started    |
