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
npm test             # vitest — 2736 tests across 139 files
npm run lint         # eslint + prettier
```

### Pre-push checklist

**Before every `git push`, always run both:**
1. `npm test` — all tests must pass
2. `npm run build` — DTS generation must succeed

The build step catches TypeScript type errors that vitest does not (e.g., missing method
declarations for runtime-copied prototype methods). Never push without a green build.

---

## Codebase State

All Haxe modernization is complete. The codebase is **pure TypeScript**, fully typed,
tree-shakeable, and minified. Key facts:

- **85 ZPP_* internal classes** in `src/native/`
- **68 public API classes** in `src/` with direct `zpp_inner` access
- **Bundle:** ~994 KB minified ESM + CJS, dual exports map, tree shaking via `bootstrap.ts`
- **Tests:** 2736 passing across 139 files
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

---

## Roadmap

### 🔶 Priority 29: Test coverage — target ≥80% (Steps 1–2 done)

**Effort: L | Impact: safety | Risk: zero**

**Step 1 done** (+254 tests, 2269 → 2523): 13 missing public API test files created.

**Step 2 done** (+154 tests, 2523 → 2677; now 2736 with P31): `Body`, `AABB`,
`FluidProperties`, `Material` test files expanded with deep property, validation, and
round-trip coverage.

**Key patterns discovered:**
- Constraints do NOT auto-register `CbType.ANY_CONSTRAINT` — must use custom CbType + `(joint.cbTypes as any).add(ct)`
- Fluid arbiters are transient — don't persist in `space.arbiters` after step; capture inside ONGOING callback
- WAKE events require a sleep→wake transition, not just initial addition to space

**Step 3 — Space/broadphase integration tests (TODO):**
- `ZPP_Space` (~30% coverage), `ZPP_DynAABBPhase` (~16%), `ZPP_AABBTree` (~4%)
- Goal: add 40–60 integration tests covering `step()`, broadphase scenarios, constraint interactions

---

### Priority 30: TSDoc — public API documentation ✅ Done

**Effort: L | Impact: large (DX) | Risk: none**

30a–30c done: all geometry, physics, callback & constraint types documented.

**30d — Tooling & cleanup:**
- `typedoc` v0.28.17 added as dev dependency, configured via `typedoc.json`
- Scripts: `build:typedoc`, `build:docs`, `serve:docs`
- Fixed 5 typedoc warnings: `@param` name mismatches, unresolved `{@link}`, missing export
- Exported `UserConstraint` and `CbTypeSet` from `index.ts` for docs coverage
- Added TSDoc to `InteractionFilter` constructor + all properties/methods
- Typedoc builds with 0 warnings, 0 errors → `docs/api/`

---

### Priority 31: API ergonomics additions ✅ Done

**Effort: M | Impact: medium (DX) | Risk: low**

Convenience methods added to geometry types (+59 tests):

**31a — `clone()` methods**: `Vec2`, `Vec3`, `AABB`, `Ray`, `Mat23`, `MatMN`
(delegates to existing `copy()` where available; new impl for `Vec3`/`MatMN`)

**31b — `equals()` methods**: `Vec2.equals(other, epsilon?)`, `Vec3.equals()`,
`AABB.equals()`, `Mat23.equals()`, `MatMN.equals()` + static `Vec2.eq(a, b, epsilon?)`

**31c — Utility statics**: `Vec2.fromAngle(radians)`, `Vec2.lerp(a, b, t)`,
`AABB.fromPoints(points)`

---

### Priority 32: Internal `get_X()`/`set_X()` cleanup ✅ Done

Removed 22 unused legacy accessor methods from `Ray.ts`, `Shape.ts`, `Polygon.ts`.

---

### Priority 33: Performance profiling & benchmark CI

**Effort: M | Impact: medium | Risk: low**

`benchmarks/run.mjs` exists but is not part of CI. Potential improvements:

- Integrate benchmark into CI with a performance budget (fail if >10% regression)
- Profile hot paths: `space.step()`, broadphase update, constraint solver
- Evaluate whether ZPP pool allocation is effective (object churn measurement)
- Consider typed arrays (`Float64Array`) for Vec2 coordinates in hot paths (ZPP_Vec2)

---

### Priority 34: Granular tree shaking (lazy ZPP registration)

**Effort: XL | Impact: large (bundle) | Risk: high**

Currently `ZPPRegistry.ts` statically imports **all 85 ZPP classes**, preventing
per-class tree shaking. True granular shaking requires lazy registration:

- Each ZPP class self-registers when its public API counterpart is imported
- `bootstrap.ts` would only import the ZPP classes needed for requested public classes
- Estimated bundle reduction: ~30–40% for apps that don't use all features (e.g., no fluid)
- High risk: registration order, `_initEnums`, `_initStatics` timing must be preserved

---

## Priority table

| Priority | Effort | Impact | Risk | Status |
|----------|--------|--------|------|--------|
| P21 — Drop `__class__` / `$hxClasses` | S | medium | low | ✅ Done |
| P22 — Minification | XS | large | none | ✅ Done |
| P23 — `__zpp` → direct imports | M | large | medium | ✅ Done |
| P24 — Namespace reduction | S | medium | low | ✅ Done |
| P25 — `Any` → real types | XL | largest | medium | ✅ Done |
| P26 — Tree shaking | L | large | high | ✅ Done |
| P27 — HaxeShims audit | S | small | low | ✅ Done |
| P28 — API ergonomics (28a+28b+28c) | M | DX | low | ✅ Done |
| P29 — Test coverage ≥80% | L | safety | none | 🔶 Steps 1–2 done |
| P30 — TSDoc documentation | L | DX | none | ✅ Done |
| P31 — API ergonomics additions | M | DX | low | ✅ Done |
| P32 — Internal accessor cleanup | S | small | low | ✅ Done |
| P33 — Benchmark CI | M | medium | low | ⬜ Not started |
| P34 — Granular tree shaking | XL | large | high | ⬜ Not started |
