# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
currently ~1,674 lines, down from ~82k) into clean, typed TypeScript classes.

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
npm test             # vitest — 2358 tests across 126 files
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

### What remains in nape-compiled.js (~1,674 lines)

The file is structured as a single factory function. Remaining sections:

| Section | Lines | Status |
|---------|-------|--------|
| Imports of TS-extracted classes | ~98 | Infrastructure |
| Bootstrap Haxe shims (imported from HaxeShims.ts) | ~6 | ✅ P18 |
| Public API stubs (Callback, Listener, CbType, OptionType, etc.) | ~90 | Stubs (replaced by TS at load) |
| `nape.phys.Interactor` full implementation | ~100 | Needs extraction |
| `nape.constraint.Constraint` stub + comment | ~5 | Stub (replaced by Constraint.ts) ✅ P11 |
| Comment markers for converted classes | ~50 | Informational |
| `nape.util.Debug` stub + comment | ~5 | Stub (replaced by Debug.ts) ✅ P14 |
| Generic factories (slim subclass creators using TS bases) | ~30 | ✅ P17 |
| Factory instantiations (35+35+8 = 78 generated classes) | ~85 | ✅ P17 (using TS bases) |
| ZPP class registrations to compiled namespace | ~400 | Remaining P19 |
| Internal list backing classes (2 comment lines) | ~2 | ✅ P15 |
| ZNPArray2 utility classes (3 types) | ~5 | ✅ P16 (registration only) |
| Hashable2 + FastHash2 utility classes | ~5 | ✅ P16 (registration only) |
| `nape.Config` comment (values moved to src/Config.ts) | ~2 | ✅ P13 |
| ZPP_MixVec2List implementation | ~350 | Needs extraction |
| Singleton enum creation + statics (init calls) | ~15 | ✅ P19a (logic in TS `_initEnums`/`_initStatics`) |
| Pool & flag initialization | ~0 | ✅ P19a (moved to TS static fields) |
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

### ✅ Priority 17: Generic factories → TypeScript generics — DONE
~477 compiled lines replaced by 3 TypeScript generic base classes:
- `src/native/util/ZNPNode.ts` — `ZNPNode<T>` linked list node base class.
- `src/native/util/ZNPList.ts` — `ZNPList<T>` singly-linked list with pool allocation,
  inlined method aliases, and `_NodeClass` static for per-subclass node pooling.
- `src/native/util/ZPP_Set.ts` — `ZPP_Set<T>` Red-Black tree set with all balancing
  operations (`__fix_dbl_red`, `__fix_neg_red`), pool allocation via `this.constructor`.
Compiled factories now create slim `class extends Base` subclasses (~6 lines each).
The 78 named classes (35 nodes + 35 lists + 8 sets) remain registered for compatibility.
Tests: `tests/native/util/ZNPNode.test.ts`, `tests/native/util/ZNPList.test.ts`,
`tests/native/util/ZPP_Set.test.ts`.

### ✅ Priority 18: Bootstrap / Haxe shims → TypeScript — DONE
~164 compiled lines replaced by `src/core/HaxeShims.ts`:
- `Reflect` — `field`, `fields`, `copy` utility functions.
- `Std` — `string(v)` wrapper using `js.Boot.__string_rec`.
- `StringTools` — `hex(n, digits)` implementation.
- `js.Boot.__string_rec` — recursive Haxe-style string representation.
- `js._Boot.HaxeError` — Error subclass with `val` property.
- `$hxClasses` registry, `$estr`, `$bind` helpers.
Compiled factory imports and assigns to local vars.
`ZPP_Shape.ts` simplified to use `Object.assign()` directly.
Tests: `tests/core/HaxeShims.test.ts`.

### Priority 19: Static initialization code migration — IN PROGRESS

The final step — migrate all init-time code out of the compiled factory function
into TS module initializers. **Phase 19a completed** (1,999 → 1,674 lines, -325):

#### ✅ Phase 19a: Constants, pools, flags, singleton enums (done)
- **ZPP_Flags id_* constants** (~47): Moved to `ZPP_Flags.ts` static field initializers
- **Pool & flag initialization** (~166 lines removed): All `zpp_pool = null`,
  `internal = false`, constant assignments already existed in TS static fields
- **Singleton enum arrays**: `_initEnums()` methods added to `ZPP_Listener.ts` (ListenerType
  + CbEvent), `ZPP_Arbiter.ts` (ArbiterType), `ZPP_Body.ts` (BodyType), `ZPP_Shape.ts`
  (ShapeType). Compiled IIFEs replaced by single-line calls.
- **CbType ANY_* singletons**: `_initEnums()` added to `ZPP_CbType.ts`
- **Static object inits**: `_initStatics()` added to `ZPP_InteractionListener.ts`,
  `ZPP_Collide.ts`, `ZPP_AABBTree.ts`. `ZPP_MarchingSquares._init()` extended.

#### Remaining Phase 19b: Structural cleanup (~1,674 lines)
- **ZPP registrations** (~400 lines): `zpp_nape.xxx = XXX_TS` assignments + `_nape`/`_zpp`
  setting. These stay until the `nape`/`zpp_nape` namespace creation moves to engine.ts.
- **Public API stubs** (~560 lines): Stubs for Callback, Listener, CbType, OptionType,
  Arbiter, Body, Shape, etc. Needed until singleton creation moves fully to TS.
- **Interactor implementation** (~100 lines): Full `nape.phys.Interactor` class still
  in compiled. Needs extraction to `src/phys/Interactor.ts`.
- **ZPP_MixVec2List** (~350 lines): Full class implementation still in compiled.
  Needs extraction to `src/native/util/ZPP_MixVec2List.ts`.
- **Generic factories + instantiations** (~115 lines): ZNPNode/ZNPList/ZPP_Set subclass
  creation. Could move to a TS registry module.
- **`nape.__zpp` exposure**: Last line to move to engine bootstrap.

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
