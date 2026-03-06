# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
currently ~5,089 lines, down from ~82k) into clean, typed TypeScript classes.

### Architecture

```
Public API wrappers (src/{phys,shape,constraint,callbacks,dynamics,geom,space}/)
        ↕
Internal ZPP_* classes (src/native/)
        ↕
Compiled engine core (src/core/nape-compiled.js)
```

### Build & Test

```bash
npm run build        # tsup → dist/
npm test             # vitest — 2220 tests across 115 files
npm run lint         # eslint + prettier
```

### Pre-push checklist

**Before every `git push`, always run both:**
1. `npm test` — all tests must pass
2. `npm run build` — DTS generation must succeed

The build step catches TypeScript type errors that vitest does not (e.g., missing method
declarations for runtime-copied prototype methods). Never push without a green build.

## Modernization Status

### Extracted ZPP_* classes (src/native/) — 85 classes — ALL DONE ✅

All internal ZPP_* classes have been extracted to TypeScript. Every public API class
has a fully modernized TypeScript wrapper with direct ZPP access (no compiled delegate).

**Singleton enums** (fully modernized):
GravMassMode, InertiaMode, MassMode, BodyType, ShapeType, ArbiterType, Winding,
ListenerType, Broadphase, ValidationResult, CbEvent, InteractionType, PreFlag

**Factory-generated lists** (13 pairs via `src/util/NapeListFactory.ts`):
CbTypeList, ListenerList, ConstraintList, ArbiterList, InteractionGroupList,
ConvexResultList, GeomPolyList, RayResultList, BodyList, CompoundList,
InteractorList, EdgeList, ShapeList (+ matching Iterators)

**Special-case lists** (fully extracted):
Vec2List + Vec2Iterator, ContactList + ContactIterator, GeomVertexIterator

### What remains in nape-compiled.js (~5,089 lines)

The file is structured as a single factory function. Remaining sections:

| Section | Lines | Status |
|---------|-------|--------|
| Imports of TS-extracted classes | ~92 | Infrastructure |
| Bootstrap Haxe shims (Reflect, Std, StringTools, js.Boot) | ~175 | **Priority 18** |
| Public API stubs (Callback, Listener, CbType, OptionType, etc.) | ~90 | Stubs (replaced by TS at load) |
| **`nape.constraint.Constraint` base — full compiled implementation** | ~360 | **Priority 11** |
| Comment markers for converted classes | ~50 | Informational |
| `nape.util.Debug` (version + clearObjectPools) | ~500 | **Priority 14** |
| Generic factories (createZNPNode, createZNPList, createZPPSet) | ~350 | **Priority 17** |
| Factory instantiations (35+35+8 = 78 generated classes) | ~85 | (removed with factories) |
| ZPP class registrations to compiled namespace | ~700 | **Priority 19** |
| Internal list backing classes (13× ZPP_*List) | ~1,500 | **Priority 15** |
| ZNPArray2 utility classes (3 types) | ~230 | **Priority 16** |
| Hashable2 + FastHash2 utility classes | ~270 | **Priority 16** |
| `nape.Config` constants | ~30 | **Priority 13** |
| Singleton enum creation + statics | ~600 | **Priority 19** |
| Pool & flag initialization | ~110 | **Priority 19** |
| `nape.__zpp` exposure + module export | ~2 | (last to go) |

**Thin wrappers still in compiled (ZPP extracted, public API not yet rewritten):**

| Class | File | Notes |
|-------|------|-------|
| ConvexResult | `src/geom/ConvexResult.ts` | Uses ZPP_ConvexRayResult, compiled prototype still active |
| RayResult | `src/geom/RayResult.ts` | Uses ZPP_ConvexRayResult, compiled prototype still active |

### Compiled code stubs

Some modernized classes keep minimal stubs in `nape-compiled.js` because compiled
initialization code references them before the TS module self-registers. The TS class
replaces the stub at module load time, and existing instances get `Object.setPrototypeOf`
fixup where needed.

**Classes with stubs:** CbType, OptionType, ArbiterType, ListenerType, Listener, CbEvent,
BodyType, ShapeType, ValidationResult, Broadphase, Arbiter, CollisionArbiter, FluidArbiter,
ArbiterList, Callback, BodyCallback, ConstraintCallback, InteractionCallback, PreCallback,
Vec2List, Vec2Iterator, ContactList, ContactIterator, GeomVertexIterator,
DistanceJoint, PivotJoint, LineJoint, WeldJoint, AngleJoint, MotorJoint

### Internal namespace exposure

`nape.__zpp = zpp_nape;` at the end of the compiled factory function allows TS classes
to access internal compiled classes like `ZNPList_*`, `ZPP_Set_*`, `FastHash2_*`, etc.

## Remaining Modernization Tasks

### Priority 11: Complete Constraint base class modernization (~360 lines)

`nape.constraint.Constraint` has a full compiled implementation (constructor + all
getter/setter prototype methods) at lines ~404–760 of `nape-compiled.js`. The TS
`Constraint.ts` currently copies missing methods from the compiled prototype but does
NOT replace `nape.constraint.Constraint` with itself.

**Goal:** Replace the compiled Constraint class with the TS Constraint class, so the
compiled implementation can be deleted.

- `Constraint.ts` already has all properties and backward-compat `get_*/set_*` methods
- Missing: `nape.constraint.Constraint = Constraint` registration at module bottom
- Stubs for `zpp_internalAlloc` guard may need to stay or move to TS
- After registration, delete compiled lines ~404–760

### Priority 12: ConvexResult & RayResult full modernization (~100 lines)

Both classes have `ZPP_ConvexRayResult` already extracted. The compiled prototype
is still active (thin wrapper pattern). Follow the same full-modernization pattern
as other public API classes.

- `src/geom/ConvexResult.ts` — rewrite to use `ZPP_ConvexRayResult` directly
- `src/geom/RayResult.ts` — rewrite to use `ZPP_ConvexRayResult` directly
- Register both at module bottom, delete compiled implementation

### Priority 13: nape.Config → TypeScript (~30 lines)

Extract the physics configuration constants to `src/Config.ts`:

- ~22 numeric constants (epsilon, sleepDelay, collisionSlop, contactBiasCoef variants,
  constraintLinearSlop, illConditionedThreshold, CCD thresholds, etc.)
- Export as a plain `Config` object or class with static fields
- Delete compiled initialization block

### Priority 14: nape.util.Debug → TypeScript (~500 lines)

Extract `src/util/Debug.ts`:

- `version()` → returns `"Nape 2.0.19"` (or make it a constant)
- `clearObjectPools()` → clears ~60 pool chains across all ZPP classes, ZNPNode types,
  ZPP_Set types, iterators, list pools
- The pool-clearing code references all extracted TS ZPP classes directly, so it can
  import them without circular issues

### Priority 15: Internal list backing classes → TypeScript (~1,500 lines, 13 classes)

These `zpp_nape.util.ZPP_*List` classes back the public factory-generated lists and
the special-case lists. Each has:
- `inner` (ZNPList backing), `outer` (public API wrapper)
- `at()`, `push()`, `iterator_at()`, validation/invalidation hooks

All 13 classes (ConstraintList, BodyList, ShapeList, ArbiterList, InteractorList,
CompoundList, InteractionGroupList, EdgeList, ListenerList, GeomPolyList,
RayResultList, ConvexResultList, CbTypeList) follow an identical pattern.

**Approach:** Replace with a generic TypeScript class `ZPP_PublicList<T>` analogous
to `NapeListFactory`. Each specialization is a one-liner subclass or factory call.

### Priority 16: Utility infrastructure classes → TypeScript (~500 lines)

Three utility class families still compiled:

- **ZNPArray2_Float, ZNPArray2_ZPP_GeomVert, ZNPArray2_ZPP_MarchPair** (~230 lines)
  — 2D resizable array wrappers. Can become a generic `ZNPArray2<T>` TypeScript class.
- **Hashable2_Boolfalse** (~110 lines) — pooled pair-key hash entry
- **FastHash2_Hashable2_Boolfalse** (~160 lines) — fast hash table using Hashable2

### Priority 17: Generic factories → TypeScript generics (~350 lines + 78 generated classes)

Replace `createZNPNode()`, `createZNPList()`, `createZPPSet()` dynamic factory functions
with static TypeScript generic classes:

- `ZNPNode<T>` + `ZNPList<T>` generic classes cover all 35 node/list types
- `ZPP_Set<T>` generic class covers all 8 set types
- Eliminates the factory function code AND the `createZNPNode/List/Set(...)` call blocks
- The 78 "instances" become type aliases or subclasses

This is complex because compiled code references specific named classes (e.g.
`ZNPList_ZPP_Body`). The named class references must remain but can point to
generic instances.

### Priority 18: Bootstrap / Haxe shims → TypeScript (~175 lines)

Replace Haxe-to-JS runtime shims with TypeScript equivalents:

- `Reflect` — `hasField`, `field`, `setField`, `fields`, `copy` → TS utility functions
- `Std` — `string(v)` → `String(v)` wrapper
- `StringTools` — `hex(n, digits)` → simple padStart implementation
- `js.Boot` + `js._Boot.HaxeError` — error/string conversion helpers

These are standalone utility classes with no circular dependencies.

### Priority 19: Static initialization code migration (~1,400 lines)

The final and most complex step — migrate all init-time code out of the compiled
factory function into TS module initializers:

- **ZPP registrations** (~700 lines): Move `zpp_nape.xxx.ZPP_Foo = ZPP_Foo_TS` assignments
  to the bottom of each respective ZPP_Foo.ts module (most are already done via `_wrapFn`)
- **Singleton enum creation** (~600 lines): Move `ZPP_CbType.ANY_*` creation, `Flags.*`
  bitmasks, `ListenerType`/`CbEvent`/`ArbiterType`/`BodyType`/`ShapeType` array initialization
  to their respective TS files
- **Pool & flag initialization** (~110 lines): Move `zpp_pool = null` and `internal = false`
  assignments to the static field declarations in TS classes
- **`nape.__zpp` exposure**: Once all references to `zpp_nape` are in TS, this line moves
  to the engine bootstrap

After Priority 19, the compiled file is eliminated entirely. The engine bootstrap (`src/core/engine.ts`)
becomes the single entry point.

## Modernization Pattern

When extracting a class from compiled code, follow this pattern. Use recent extractions
as reference implementations:

- **ZPP class extraction**: See `src/native/phys/ZPP_Body.ts` or `src/native/phys/ZPP_Compound.ts`
- **Public API class**: See `src/phys/Body.ts` or `src/phys/Compound.ts`
- **Simpler example**: See `src/geom/AABB.ts` + `src/native/geom/ZPP_AABB.ts`

### Steps

1. **Extract ZPP_Foo** to `src/native/.../ZPP_Foo.ts`
   - Add `static _wrapFn` callback + `wrapper()` method with `_wrapFn` → legacy fallback
   - Add `static zpp_pool`, `outer`, `next` fields
   - Copy parent prototype methods in `_init()` if ZPP_Foo has a compiled base class

2. **Rewrite public API class** in `src/.../Foo.ts`
   - `zpp_inner: ZPP_Foo` — direct typed access (no `Any`)
   - `get _inner() { return this; }` — backward compat for compiled code
   - Constructor: pool from `ZPP_Foo.zpp_pool`, set `zpp.outer = this`
   - `static _wrap(inner)` — handle ZPP_Foo, legacy objects, null
   - Getters/setters read/write `zpp_inner` directly with validation + invalidation

3. **Register at module bottom** (avoids circular imports):
   ```typescript
   ZPP_Foo._wrapFn = (zpp) => getOrCreate(zpp, (raw) => { /* create wrapper */ });
   const nape = getNape();
   nape.xxx.Foo = Foo;
   ```

4. **Remove compiled code** from `nape-compiled.js`, replace with comment:
   ```js
   // nape.xxx.Foo: converted to TypeScript → src/.../Foo.ts
   ```
   Do NOT import Foo.ts from nape-compiled.js (circular import).

5. **Verify**: all tests pass, `npm run build` succeeds

### Key gotchas

- **Circular imports**: Foo.ts → engine.ts → nape-compiled.js. Never import Foo.ts from compiled code.
- **Test circular deps**: Tests for ZPP_* classes that import `getNape` must add
  `import "../../../src/core/engine"` before the class import to break the circular dependency.
- **Init-time stubs**: If compiled init code creates instances (e.g., singleton enums), keep a
  minimal stub in compiled code. TS class replaces it and fixes prototypes via `setPrototypeOf`.
- **Runtime `instanceof`**: If compiled code uses `val instanceof nape.xxx.Foo`, the stub
  must exist with any methods called before TS module loads.
- **Import modernized classes directly**: Use `import { AABB } from "./AABB"` not `getNape().geom.AABB`.
- **NaN checks**: Use `value !== value` (Haxe NaN pattern).
- **Invalidation flags**: Copy exact bitmasks from compiled setter code.
- **Pool management**: Always check `ZPP_Foo.zpp_pool` before `new ZPP_Foo()`.
- **List APIs**: Compiled lists use `get_length()` not `.length`, `Iterator.get(list)` for iteration.
- **Density conversion**: Material stores density as `value / 1000`, public API shows `* 1000`.
