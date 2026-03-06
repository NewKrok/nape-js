# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
currently ~462 lines, down from ~82k) into clean, typed TypeScript classes.

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

### What remains in nape-compiled.js (~108 lines)

The file is structured as a single factory function. Remaining sections:

| Section | Lines | Status |
|---------|-------|--------|
| Imports (registerZPPClasses, HaxeShims) | ~2 | Infrastructure |
| Namespace initialization (`nape.callbacks = {}` etc.) | ~10 | Lightweight bootstrap |
| Subclass stubs (empty constructors + `__name__`) | ~48 | Needed for circular ESM dep workaround |
| registerZPPClasses call | ~2 | Bootstrap |
| Haxe shim fixes + return | ~10 | Bootstrap |

**All public API wrappers fully modernized — no implementations remain in compiled.**

### Base/standalone classes: side-effect imported from engine.ts

These classes have no `extends` or their `extends` chain doesn't create circular ESM
dependencies. They are imported as side-effects from `engine.ts` and self-register in
the nape namespace at module load time. No stubs needed in nape-compiled.js.

**Classes imported from engine.ts:** Config, Debug, registerLists, Vec2List, ContactList,
GeomVertexIterator, Callback, Listener, OptionType, InteractionType, PreFlag, Constraint,
Arbiter, Contact, InteractionFilter, InteractionGroup, AABB, ConvexResult, Geom, GeomPoly,
MarchingSquares, Mat23, MatMN, Ray, RayResult, Vec2, Vec3, Winding, Interactor,
FluidProperties, Material, GravMassMode, InertiaMode, MassMode, Edge, ValidationResult,
Broadphase, Space, CbEvent, CbType, ListenerType, ArbiterType, BodyType, ShapeType.

### Subclass stubs: minimal placeholders in nape-compiled.js

Classes that use `extends` cannot be side-effect imported from engine.ts because it creates
a circular ESM dependency: engine → Subclass → BaseClass → engine. In this cycle, the
subclass evaluates before the base class, causing `class X extends undefined`.

These classes keep minimal 2-line stubs (empty constructor + `__name__`) in nape-compiled.js.
The TS class replaces the stub at module load time when user code imports it (or via index.ts).

**Subclasses with stubs:** BodyCallback, ConstraintCallback, InteractionCallback, PreCallback,
BodyListener, ConstraintListener, InteractionListener, PreListener, AngleJoint, DistanceJoint,
LineJoint, MotorJoint, PivotJoint, PulleyJoint, UserConstraint, WeldJoint, CollisionArbiter,
FluidArbiter, Body, Compound, Shape, Circle, Polygon.

### Internal namespace exposure

`nape.__zpp = zpp_nape;` at the end of `registerZPPClasses()` in ZPPRegistry.ts allows
TS classes to access internal classes like `ZNPList_*`, `ZPP_Set_*`, etc.

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
into TS module initializers.

#### ✅ Phase 19a: Constants, pools, flags, singleton enums (done)
(1,999 → 1,674 lines, -325):
- **ZPP_Flags id_* constants** (~47): Moved to `ZPP_Flags.ts` static field initializers
- **Pool & flag initialization** (~166 lines removed): All `zpp_pool = null`,
  `internal = false`, constant assignments already existed in TS static fields
- **Singleton enum arrays**: `_initEnums()` methods added to `ZPP_Listener.ts` (ListenerType
  + CbEvent), `ZPP_Arbiter.ts` (ArbiterType), `ZPP_Body.ts` (BodyType), `ZPP_Shape.ts`
  (ShapeType). Compiled IIFEs replaced by single-line calls.
- **CbType ANY_* singletons**: `_initEnums()` added to `ZPP_CbType.ts`
- **Static object inits**: `_initStatics()` added to `ZPP_InteractionListener.ts`,
  `ZPP_Collide.ts`, `ZPP_AABBTree.ts`. `ZPP_MarchingSquares._init()` extended.

#### ✅ Phase 19b (partial): ZPP registrations + enum stub removal (done)
(1,674 → 462 lines, -1,212):
- **ZPP registrations** (~415 lines): All 85 `zpp_nape.xxx = XXX_TS` assignments,
  `_nape`/`_zpp` setting, `_init()`/`_initStatics()` calls moved to
  `src/native/util/ZPPRegistry.ts` (`registerZPPClasses` function).
- **ZNP factory registrations** (~95 lines): ZNPNode/ZNPList/ZPP_Set subclass creation
  moved to `src/native/util/ZNPRegistry.ts` (`registerZNPClasses` function).
- **6 enum stubs removed** (CbEvent, CbType, ListenerType, ArbiterType, BodyType,
  ShapeType): `_initEnums()` calls moved out of factory. Engine.ts exports
  `ensureEnumsReady()` — called by each enum TS class after self-registering; fires
  `_initEnums` once all 6 constructors are available (handles circular-import cycles
  gracefully using a `var` flag + early-return check).

#### ✅ Phase 19c: Public API stub removal (done)
(462 → 108 lines, -354):
- **Base/standalone class stubs removed** (~260 lines): Stubs for Callback, Listener,
  OptionType, Constraint, Arbiter, Contact, InteractionFilter, InteractionGroup,
  Interactor, Edge, ValidationResult, Broadphase, Space, Debug, Config, Geom, Ray,
  Vec2List, Vec2Iterator, ContactList, ContactIterator, GeomVertexIterator, etc.
  Replaced by side-effect imports in `engine.ts` — TS classes self-register at load time.
- **Subclass stubs simplified** (~92 → ~48 lines): Guard logic, prototype chains, and
  `$hxClasses` registrations removed from stubs for BodyCallback, CollisionArbiter,
  Circle, etc. Each stub is now 2 lines (empty constructor + `__name__`).
  Cannot be imported from engine.ts due to circular ESM dependencies.
- **Haxe shim imports cleaned**: Removed unused `Reflect`, `Std`, `StringTools`, `$estr`
  imports from factory. Only `$hxClasses` and `js` remain (for bootstrap code).
- **sandbox.Main removed**: Empty main() call was a no-op.

#### Remaining: ~108 lines
- **Subclass stubs** (~48 lines): 23 empty constructor + `__name__` pairs for subclasses
  that can't be side-effect imported from engine.ts (circular ESM dep workaround).
  To eliminate these, ZPP classes would need to import public API constructors directly
  instead of using `nape.xxx.Foo`, or use lazy registration callbacks.
- **Namespace init** (~10 lines): `nape.callbacks = {}` etc.
- **Bootstrap** (~12 lines): registerZPPClasses call, String/Array `__name__`, HaxeError
  message getter, `js.Boot.__toStr`.

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
- **Circular ESM dep with `extends`**: A subclass (e.g. `Circle extends Shape`) CANNOT be
  side-effect imported from engine.ts if both the base class and subclass import from
  engine.ts. The ESM dependency cycle causes the subclass to evaluate before the base,
  resulting in `class extends undefined`. These subclasses keep minimal stubs in
  nape-compiled.js and self-register when user code imports them (or via index.ts).
- **Init-time stubs**: Enum singleton classes (CbEvent, CbType, etc.) no longer need stubs —
  `ensureEnumsReady()` in engine.ts creates singletons after all TS classes self-register.
  Base/standalone classes are side-effect imported from engine.ts. Subclasses keep minimal
  2-line stubs (empty constructor + `__name__`) in nape-compiled.js.
- **ensureEnumsReady pattern**: Uses `var` (not `let`) to avoid temporal dead zone issues
  when called during ESM circular-import resolution. Each of the 6 enum classes calls it
  after self-registering; it runs `_initEnums` only when all 6 are available.
- **Import modernized classes directly**: Use `import { AABB } from "./AABB"` not `getNape().geom.AABB`.
- **NaN checks**: Use `value !== value` (Haxe NaN pattern).
- **Invalidation flags**: Copy exact bitmasks from compiled setter code.
- **Pool management**: Always check `ZPP_Foo.zpp_pool` before `new ZPP_Foo()`.
- **List APIs**: Compiled lists use `get_length()` not `.length`, `Iterator.get(list)` for iteration.
- **Density conversion**: Material stores density as `value / 1000`, public API shows `* 1000`.
