# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
currently ~2,640 lines, down from ~82k) into clean, typed TypeScript classes.

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
npm test             # vitest — 2284 tests across 122 files
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

### What remains in nape-compiled.js (~2,640 lines)

The file is structured as a single factory function. Remaining sections:

| Section | Lines | Status |
|---------|-------|--------|
| Imports of TS-extracted classes | ~95 | Infrastructure |
| Bootstrap Haxe shims (Reflect, Std, StringTools, js.Boot) | ~175 | **Priority 18** |
| Public API stubs (Callback, Listener, CbType, OptionType, etc.) | ~90 | Stubs (replaced by TS at load) |
| `nape.constraint.Constraint` stub + comment | ~5 | Stub (replaced by Constraint.ts) ✅ P11 |
| Comment markers for converted classes | ~50 | Informational |
| `nape.util.Debug` stub + comment | ~5 | Stub (replaced by Debug.ts) ✅ P14 |
| Generic factories (createZNPNode, createZNPList, createZPPSet) | ~350 | **Priority 17** |
| Factory instantiations (35+35+8 = 78 generated classes) | ~85 | (removed with factories) |
| ZPP class registrations to compiled namespace | ~700 | **Priority 19** |
| Internal list backing classes (2 comment lines) | ~2 | ✅ P15 |
| ZNPArray2 utility classes (3 types) | ~5 | ✅ P16 (registration only) |
| Hashable2 + FastHash2 utility classes | ~5 | ✅ P16 (registration only) |
| `nape.Config` comment (values moved to src/Config.ts) | ~2 | ✅ P13 |
| Singleton enum creation + statics | ~600 | **Priority 19** |
| Pool & flag initialization | ~110 | **Priority 19** |
| `nape.__zpp` exposure + module export | ~2 | (last to go) |

**All public API wrappers fully modernized — no thin wrappers remain in compiled.**
ConvexResult and RayResult are already fully TS (stubs only in compiled, replaced at load).

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
to access internal compiled classes like `ZNPList_*`, `ZPP_Set_*`, etc.

## Remaining Modernization Tasks

### ✅ Priority 11: Constraint base class — DONE
`nape.constraint.Constraint` compiled implementation deleted. TS class registered via
`nape.constraint.Constraint = Constraint`. Tests: `tests/constraint/Constraint.modernized.test.ts`.

### ✅ Priority 12: ConvexResult & RayResult — DONE
Both already fully modernized (only comment stubs remain in compiled). No action needed.

### ✅ Priority 13: nape.Config — DONE
All 29 constants extracted to `src/Config.ts`. Compiled init block deleted.
Tests: `tests/Config.test.ts`.

### ✅ Priority 14: nape.util.Debug — DONE
`Debug.version()` and `Debug.clearObjectPools()` extracted to `src/util/Debug.ts`.
Compiled implementation (488 lines) deleted. Tests: `tests/util/Debug.test.ts`.

### ✅ Priority 15: Internal list backing classes — DONE
All 13 `ZPP_*List` classes (~1,217 compiled lines) replaced by `ZPP_PublicList` base
class + `makeZPP_List()` factory in `src/native/util/ZPP_PublicList.ts`.
Each specialisation has its own `static internal` flag for the iterator guard pattern.
Tests: `tests/native/util/ZPP_PublicList.test.ts`.

### ✅ Priority 16: Utility infrastructure classes — DONE
~500 compiled lines replaced by 3 TypeScript files:
- `src/native/util/ZNPArray2.ts` — Generic `ZNPArray2<T>` base class + `ZNPArray2_Float`,
  `ZNPArray2_ZPP_GeomVert`, `ZNPArray2_ZPP_MarchPair` subclasses (2D resizable arrays).
  `ZPP_MarchingSquares.ts` updated to direct-import these instead of `_zpp.util.*`.
- `src/native/util/Hashable2_Boolfalse.ts` — Pooled pair-key hash entry with static
  factory methods (`get`, `getpersist`, `ordered_get`, `ordered_get_persist`).
- `src/native/util/FastHash2_Hashable2_Boolfalse.ts` — 2^20-slot hash table for
  `Hashable2_Boolfalse` entries. `ZPP_Simple.ts` updated to direct-import both classes.
Tests: `tests/native/util/ZNPArray2.test.ts`, `tests/native/util/Hashable2_Boolfalse.test.ts`,
`tests/native/util/FastHash2_Hashable2_Boolfalse.test.ts`.

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
