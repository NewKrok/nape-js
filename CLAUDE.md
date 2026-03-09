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
npm test             # vitest — 2677 tests across 138 files
npm run lint         # eslint + prettier
```

### Pre-push checklist

**Before every `git push`, always run both:**
1. `npm test` — all tests must pass
2. `npm run build` — DTS generation must succeed

The build step catches TypeScript type errors that vitest does not (e.g., missing method
declarations for runtime-copied prototype methods). Never push without a green build.

---

## Codebase State (post-P28)

All Haxe modernization is complete. The codebase is **pure TypeScript**, fully typed,
tree-shakeable, and minified. Key facts:

- **85 ZPP_* internal classes** extracted to `src/native/`
- **68 public API classes** in `src/` with direct `zpp_inner` access (no compiled delegate)
- **`nape-compiled.js` deleted** — zero compiled JS remains
- **`type Any = any` eliminated** — `strict: true`, `tsc --noEmit` → 0 errors
- **Bundle:** 979 KB minified ESM + CJS, dual exports map, tree shaking via `bootstrap.ts`
- **Tests:** 2677 passing across 138 files
- **No Haxe dead code** — `$hxClasses`, `__class__`, `$estr`, `$bind`, `HaxeShims.ts` all gone
- **No `get_X()`/`set_X()` backward-compat methods** — all removed (P28c)

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

## Modernization Pattern (for future reference)

### Steps to extract a class

1. **Extract ZPP_Foo** to `src/native/.../ZPP_Foo.ts`
   - Add `static _wrapFn` callback + `wrapper()` method with `_wrapFn` → legacy fallback
   - Add `static zpp_pool`, `outer`, `next` fields
   - Copy parent prototype methods in `_init()` if ZPP_Foo has a compiled base class

2. **Rewrite public API class** in `src/.../Foo.ts`
   - `zpp_inner: ZPP_Foo` — direct typed access (no `any`)
   - `get _inner() { return this; }` — backward compat for compiled code
   - Constructor: pool from `ZPP_Foo.zpp_pool`, set `zpp.outer = this`
   - `static _wrap(inner)` — handle ZPP_Foo, legacy objects, null
   - Getters/setters read/write `zpp_inner` directly with validation + invalidation

3. **Wire up in `bootstrap.ts`** (not in the module itself — avoids circular imports):
   ```typescript
   ZPP_Foo._wrapFn = (zpp) => getOrCreate(zpp, (raw) => { /* create wrapper */ });
   nape.xxx.Foo = Foo;
   ```

4. **Verify**: `npm test` passes, `npm run build` succeeds

### Key gotchas

- **Circular imports**: Foo.ts → engine.ts → ZPPRegistry.ts. Never import Foo.ts from ZPPRegistry.
- **Test setup**: `tests/setup.ts` imports all subclass modules — factory callbacks available everywhere.
- **Circular ESM dep with `extends`**: Subclasses register from `index.ts`, not `engine.ts`.
- **NaN checks**: Use `value !== value` (Haxe NaN pattern).
- **Invalidation flags**: Copy exact bitmasks from compiled setter code.
- **Pool management**: Always check `ZPP_Foo.zpp_pool` before `new ZPP_Foo()`.
- **List APIs**: Compiled lists use `get_length()` not `.length`, `Iterator.get(list)` for iteration.
- **Density conversion**: Material stores density as `value / 1000`, public API shows `* 1000`.

### Reference implementations

- **ZPP class extraction**: `src/native/phys/ZPP_Body.ts` or `src/native/phys/ZPP_Compound.ts`
- **Public API class**: `src/phys/Body.ts` or `src/phys/Compound.ts`
- **Simpler example**: `src/geom/AABB.ts` + `src/native/geom/ZPP_AABB.ts`

---

## Roadmap

### 🔶 Priority 29: Test coverage — target ≥80% (Steps 1–2 done)

**Effort: L | Impact: safety | Risk: zero**

**Step 1 done** (+254 tests, 2269 → 2523): 13 missing public API test files created.

**Step 2 done** (+154 tests, 2523 → 2677): `Body`, `AABB`, `FluidProperties`, `Material`
test files expanded with deep property, validation, and round-trip coverage.

**Key patterns discovered:**
- Constraints do NOT auto-register `CbType.ANY_CONSTRAINT` — must use custom CbType + `(joint.cbTypes as any).add(ct)`
- Fluid arbiters are transient — don't persist in `space.arbiters` after step; capture inside ONGOING callback
- WAKE events require a sleep→wake transition, not just initial addition to space

**Step 3 — Space/broadphase integration tests (TODO):**
- `ZPP_Space` (~30% coverage), `ZPP_DynAABBPhase` (~16%), `ZPP_AABBTree` (~4%)
- Goal: add 40–60 integration tests covering `step()`, broadphase scenarios, constraint interactions

---

### Priority 30: TSDoc — public API documentation

**Effort: L | Impact: large (DX) | Risk: none**

Current state: class-level JSDoc exists on all 68 public classes, but **~95% of public
methods/properties have no per-member documentation**. IDE autocomplete shows no hints.

**30a — Core geometry types** (`Vec2`, `AABB`, `Ray`, `Mat23`, `MatMN`, `Vec3`): ✅ Done

**30b — Physics types** (`Body`, `Space`, `Shape`, `Circle`, `Polygon`): ✅ Done

**30c — Callbacks & constraints** (`Listener`, `CbType`, all joints, `Arbiter` subtypes):
- Document callback lifecycle (BEGIN/ONGOING/END semantics)
- Document constraint limits, motor, spring params

**Tooling:** Consider adding `typedoc` as a dev dependency + `npm run docs` script.

---

### Priority 31: API ergonomics additions

**Effort: M | Impact: medium (DX) | Risk: low**

Missing convenience methods on geometry types:

**31a — `clone()` methods** (currently absent):
- `Vec2.clone()` → `new Vec2(this.x, this.y)`
- `AABB.clone()` → `new AABB(this.x, this.y, this.width, this.height)`
- `Ray.clone()` → clone with same origin/direction/maxDistance
- `Mat23.clone()`, `MatMN.clone()`

**31b — `equals()` methods** (currently absent):
- `Vec2.equals(other: Vec2, epsilon?: number): boolean`
- `AABB.equals(other: AABB, epsilon?: number): boolean`
- Static variants: `Vec2.eq(a, b)` mirroring existing `Vec2.distance` style

**31c — Utility statics** (quality of life):
- `Vec2.fromAngle(radians: number): Vec2`
- `Vec2.lerp(a: Vec2, b: Vec2, t: number): Vec2`
- `AABB.fromPoints(points: Vec2[]): AABB`

---

### Priority 32: Internal `get_X()`/`set_X()` cleanup in native files

**Effort: S | Impact: small | Risk: low**

A small number of native-facing internal accessor methods survive in public API files
for ZPP compatibility (marked `@internal`). These can be converted to direct field
reads using the factory-callback pattern (same approach as P28c):

- `Ray.ts` — 6 `@internal` accessor methods used by `ZPP_Ray`
- `Shape.ts` — 13 `@internal` accessor methods used by `ZPP_Shape`
- `Polygon.ts` — 3 `@internal` accessor methods used by `ZPP_Polygon`

Each can be replaced by a static callback on the ZPP class, set at bootstrap time.

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
| P30 — TSDoc documentation | L | DX | none | ⬜ Not started |
| P31 — API ergonomics additions | M | DX | low | ⬜ Not started |
| P32 — Internal accessor cleanup | S | small | low | ⬜ Not started |
| P33 — Benchmark CI | M | medium | low | ⬜ Not started |
| P34 — Granular tree shaking | XL | large | high | ⬜ Not started |
