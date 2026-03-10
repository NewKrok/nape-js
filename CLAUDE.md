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
npm test             # vitest — 3082 tests across 145 files
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
- **Tests:** 3082 passing across 145 files
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

Steps 1–4 done (+813 tests, 2269 → 3082). All previously crashing APIs are now fixed and tested.

**Current coverage: ~54% statements** (was ~44.7% before Step 4 + bugfixes).

**Remaining gaps (Step 5):**
- `ZPP_Cutter` ~1%, `ZPP_ColArbiter` ~18%, `ZPP_FluidArbiter` ~24%, `ZPP_Collide` ~21%
- `ZPP_Space` deeper paths ~56%, `ZPP_Body` ~67%, `ZPP_Ray` ~44%
- Reaching ≥80% requires extensive ZPP native path tests

---

### Priority 30: TSDoc — public API documentation ✅ Done

All geometry, physics, callback & constraint types documented. Typedoc builds with 0 warnings → `docs/api/`.

---

### Priority 31: API ergonomics additions ✅ Done

`clone()`, `equals()` on Vec2/Vec3/AABB/Ray/Mat23/MatMN; `Vec2.fromAngle`, `Vec2.lerp`, `AABB.fromPoints`.

---

### Priority 32: Internal `get_X()`/`set_X()` cleanup ✅ Done

Removed 22 unused legacy accessor methods from `Ray.ts`, `Shape.ts`, `Polygon.ts`.

---

### Priority 33: Performance profiling & benchmark CI ✅ Done

CI-integrated benchmark suite with calibration-normalized regression detection.
Scripts: `benchmark:json`, `benchmark:compare`, `benchmark:update-baseline`.

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

### Priority 35: Type system improvements (Space.ts return types)

**Effort: S | Impact: medium (DX) | Risk: low**

`Space.ts` returns `object` from 6 collection properties and ~18 query methods instead of
concrete types (`BodyList`, `ShapeList`, `CompoundList`, `ConstraintList`, `ListenerList`,
`RayResultList`, etc.). These should return properly typed values for better IDE support.

**File:** `src/space/Space.ts`

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
| P29 — Test coverage ≥80%              | L      | safety  | none   | 🔶 ~54% (Step 5 pending) |
| P30 — TSDoc documentation             | L      | DX      | none   | ✅ Done           |
| P31 — API ergonomics additions        | M      | DX      | low    | ✅ Done           |
| P32 — Internal accessor cleanup       | S      | small   | low    | ✅ Done           |
| P33 — Benchmark CI                    | M      | medium  | low    | ✅ Done           |
| P34 — Granular tree shaking           | XL     | large   | high   | ❌ Cancelled      |
| P35 — Type system improvements        | S      | DX      | low    | ⬜ Not started    |
| P36 — Server-side + demo examples     | M      | medium  | low    | ⬜ Not started    |
| P37 — Serialization API               | L      | medium  | medium | ⬜ Not started    |
