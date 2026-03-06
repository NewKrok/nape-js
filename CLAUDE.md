# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
currently ~51 lines, down from ~82k) into clean, typed TypeScript classes.

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

### What remains in nape-compiled.js (~51 lines)

The file is a minimal bootstrap shell. All public API classes and ZPP implementations
have been fully extracted to TypeScript. Remaining content:

| Section | Lines | Status |
|---------|-------|--------|
| Imports (registerZPPClasses, HaxeShims) | ~2 | Infrastructure |
| Namespace initialization (`nape.callbacks = {}` etc.) | ~10 | Lightweight bootstrap |
| registerZPPClasses call | ~2 | Bootstrap |
| Haxe shim fixes + return | ~10 | Bootstrap |
| Comments | ~5 | Documentation |

**No stubs, no implementations.** All public API classes self-register via side-effect
imports from `engine.ts` (base/standalone) or `index.ts` + `tests/setup.ts` (subclasses).

### Public API class registration

**Base/standalone classes** — side-effect imported from `engine.ts`:
Config, Debug, registerLists, Vec2List, ContactList, GeomVertexIterator, Callback,
Listener, OptionType, InteractionType, PreFlag, Constraint, Arbiter, Contact,
InteractionFilter, InteractionGroup, AABB, ConvexResult, Geom, GeomPoly,
MarchingSquares, Mat23, MatMN, Ray, RayResult, Vec2, Vec3, Winding, Interactor,
FluidProperties, Material, GravMassMode, InertiaMode, MassMode, Edge, ValidationResult,
Broadphase, Space, CbEvent, CbType, ListenerType, ArbiterType, BodyType, ShapeType.

**Subclasses** — self-register from `index.ts` (+ `tests/setup.ts` for test coverage):
BodyCallback, ConstraintCallback, InteractionCallback, PreCallback, BodyListener,
ConstraintListener, InteractionListener, PreListener, AngleJoint, DistanceJoint,
LineJoint, MotorJoint, PivotJoint, PulleyJoint, UserConstraint, WeldJoint,
CollisionArbiter, FluidArbiter, Body, Compound, Shape, Circle, Polygon.

These subclasses use `extends` and cannot be side-effect imported from `engine.ts`
(circular ESM dependency: engine → Subclass → BaseClass → engine → class extends undefined).

### Factory callback pattern

ZPP internal classes that create public API subclass instances at runtime use static
factory callbacks instead of `nape.xxx.Foo` namespace constructors. This eliminates
the need for stubs in `nape-compiled.js`.

**Callback factories** (`ZPP_Callback`):
- `_createBodyCb`, `_createConCb`, `_createIntCb`, `_createPreCb` — set by
  BodyCallback.ts, ConstraintCallback.ts, InteractionCallback.ts, PreCallback.ts

**Arbiter factories** (`ZPP_Arbiter`):
- `_createColArb`, `_createFluidArb` — set by CollisionArbiter.ts, FluidArbiter.ts

**Joint factories** (`ZPP_*Joint`):
- `_createFn` on each ZPP joint class — set by corresponding TS joint class
  (AngleJoint, DistanceJoint, LineJoint, MotorJoint, PivotJoint, PulleyJoint, WeldJoint)

**Body/Circle/Polygon** — no factory callbacks needed. These are only created at runtime
(not during module init), so `new nape.phys.Body(...)` etc. works because the TS class
has already self-registered by then.

### Internal namespace exposure

`nape.__zpp = zpp_nape;` at the end of `registerZPPClasses()` in ZPPRegistry.ts allows
TS classes to access internal classes like `ZNPList_*`, `ZPP_Set_*`, etc.

## Completed Modernization Tasks

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

### ✅ Priority 19: Static initialization code migration — DONE

#### Phase 19a: Constants, pools, flags, singleton enums
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

#### Phase 19b: ZPP registrations + enum stub removal
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

#### Phase 19c: Public API stub removal
(462 → 108 lines, -354):
- **Base/standalone class stubs removed** (~260 lines): Stubs for Callback, Listener,
  OptionType, Constraint, Arbiter, Contact, InteractionFilter, InteractionGroup,
  Interactor, Edge, ValidationResult, Broadphase, Space, Debug, Config, Geom, Ray,
  Vec2List, Vec2Iterator, ContactList, ContactIterator, GeomVertexIterator, etc.
  Replaced by side-effect imports in `engine.ts` — TS classes self-register at load time.
- **Subclass stubs simplified** (~92 → ~48 lines): Guard logic, prototype chains, and
  `$hxClasses` registrations removed from stubs for BodyCallback, CollisionArbiter,
  Circle, etc. Each stub was 2 lines (empty constructor + `__name__`).
- **Haxe shim imports cleaned**: Removed unused `Reflect`, `Std`, `StringTools`, `$estr`
  imports from factory. Only `$hxClasses` and `js` remain (for bootstrap code).
- **sandbox.Main removed**: Empty main() call was a no-op.

#### Phase 19d: Subclass stub elimination via factory callbacks
(108 → 51 lines, -57):
- **All 23 subclass stubs removed** from `nape-compiled.js`. ZPP classes that create
  public API subclass instances at runtime now use static factory callbacks (`_createFn`,
  `_createBodyCb`, `_createColArb`, etc.) instead of `nape.xxx.Foo` namespace lookups.
- **Factory callbacks registered** by TS subclass modules at module load time:
  - `ZPP_Callback`: `_createBodyCb`, `_createConCb`, `_createIntCb`, `_createPreCb`
  - `ZPP_Arbiter`: `_createColArb`, `_createFluidArb`
  - `ZPP_AngleJoint`, `ZPP_MotorJoint`, `ZPP_DistanceJoint`, `ZPP_LineJoint`,
    `ZPP_PivotJoint`, `ZPP_WeldJoint`, `ZPP_PulleyJoint`: `_createFn`
- **Shape self-registration added**: `Shape.ts` now calls `nape.shape.Shape = Shape`
  at module bottom (previously relied on stub).
- **Test setup file added**: `tests/setup.ts` imports all subclass modules so factory
  callbacks and namespace registrations are available in all tests (configured via
  `vitest.config.ts` `setupFiles`).
- **Test updates**: `ZPP_Flags.test.ts` and `ZPP_Vec3.test.ts` updated to expect
  initialized state (enum singletons created by `ensureEnumsReady()` at module load).

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
- **Test setup**: `tests/setup.ts` imports all subclass modules — factory callbacks and
  namespace registrations are available in all tests without per-file imports.
- **Circular ESM dep with `extends`**: A subclass (e.g. `Circle extends Shape`) CANNOT be
  side-effect imported from engine.ts if both the base class and subclass import from
  engine.ts. The ESM dependency cycle causes the subclass to evaluate before the base,
  resulting in `class extends undefined`. These subclasses self-register from index.ts.
- **Factory callback pattern**: ZPP classes that create subclass instances use static
  `_createFn`/`_createXxxCb`/`_createXxxArb` callbacks set by TS modules at load time.
  This eliminates the need for stubs in nape-compiled.js.
- **ensureEnumsReady pattern**: Uses `var` (not `let`) to avoid temporal dead zone issues
  when called during ESM circular-import resolution. Each of the 6 enum classes calls it
  after self-registering; it runs `_initEnums` only when all 6 are available.
- **Import modernized classes directly**: Use `import { AABB } from "./AABB"` not `getNape().geom.AABB`.
- **NaN checks**: Use `value !== value` (Haxe NaN pattern).
- **Invalidation flags**: Copy exact bitmasks from compiled setter code.
- **Pool management**: Always check `ZPP_Foo.zpp_pool` before `new ZPP_Foo()`.
- **List APIs**: Compiled lists use `get_length()` not `.length`, `Iterator.get(list)` for iteration.
- **Density conversion**: Material stores density as `value / 1000`, public API shows `* 1000`.
