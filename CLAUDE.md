# nape-js — Modernization Guide

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
npm test             # vitest — 2523 tests across 138 files
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

### nape-compiled.js — DELETED ✅ (Priority 20)

All content has been migrated to TypeScript. The file no longer exists.

| Former section | Migrated to |
|----------------|-------------|
| Namespace initialization (`nape.callbacks = {}` etc.) | `ZPPRegistry.ts` (`registerZPPClasses()`) |
| registerZPPClasses call | `engine.ts` (lazy `getNape()`) |
| Haxe runtime bootstrap (String.__name__, HaxeError.message, etc.) | `HaxeShims.ts` |

**All public API classes self-register via side-effect imports** from `engine.ts`
(base/standalone) or `index.ts` + `tests/setup.ts` (subclasses).

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

### ✅ Priority 20: Eliminate nape-compiled.js — DONE

`src/core/nape-compiled.js` **deleted** (51 → 0 lines). The entire codebase is now pure TypeScript:
- **Haxe runtime bootstrap** (`String.__name__`, `Array.__name__`, `HaxeError.prototype.message`,
  `js.Boot.__toStr`) moved to `src/core/HaxeShims.ts` (executed once at module load).
- **Namespace initialization** (`nape.callbacks = {}` etc.) moved into `registerZPPClasses()`
  in `src/native/util/ZPPRegistry.ts`. The function now creates and returns the `nape` object.
- **`engine.ts`** uses lazy initialization (`var napeNamespace`) so that side-effect imports
  calling `getNape()` during ESM circular-import resolution always succeed (same `var` pattern
  as `ensureEnumsReady`).
- **Benchmark** (`benchmarks/run.mjs`) updated to use `getNape()` from `dist/index.js`
  instead of direct import from the now-deleted source file.

### ✅ Priority 21: Drop `$hxClasses` + `prototype.__class__` — DONE

~290 lines of write-only dead code removed. No Haxe `Std.is()` or string-based class
lookup survives in the TypeScript codebase.
- `HaxeShims.ts`: Removed `$hxClasses` export, 5 `$hxClasses["Xxx"] = Cls` registrations,
  and 5 `prototype.__class__` assignments (Reflect, Std, StringTools, HaxeError, jsBoot).
- `ZPPRegistry.ts`: Removed `$hxClasses` import, `const hxClasses`, and 85 `hxClasses[...] = Cls`
  assignments; simplified all `zpp.xxx.Yyy = hxClasses[...] = Cls` to `zpp.xxx.Yyy = Cls`.
- `ZNPRegistry.ts`: Removed `HxClasses` type, `hxClasses` parameter from factory functions,
  and all dynamic `hxClasses[...] = cls` registrations.
- 47 public API files: Removed all `(Foo.prototype as Any).__class__ = Foo` assignments.
- 7 native list files: Removed `prototype.__class__` from ContactList, Vec2List, etc.
- 21 test files updated to remove 23 `"should have __class__ set on prototype"` test cases.

### ✅ Priority 22: Bundle minification — DONE

- `tsup.config.ts`: Added `minify: true` → 2.17 MB → **1005 KB** ESM (-54%).
- `.npmignore`: Excludes source maps and dev files from npm package (~4 MB saving).

### ✅ Priority 23: `getNape().__zpp.xxx.YYY` → direct imports — DONE

52 of 59 runtime namespace accesses converted to typed static imports across 32 files.

**New exported variables added:**
- `ZNPRegistry.ts`: 12 exported `let` vars (ZNPList_ZPP_PartitionVertex/PartitionedPoly/
  GeomVert/SimplifyP/Vec2/SimpleVert/SimpleEvent, ZNPNode_RayResult, ZPP_Set_ZPP_SimpleVert/
  SimpleSeg/SimpleEvent/PartitionVertex/PartitionPair) — populated by `registerZNPClasses()`.
- `ZPP_PublicList.ts`: 3 exported `let` vars (ZPP_ConstraintList, ZPP_InteractorList,
  ZPP_ArbiterList) with `ZPP_PublicListWithGet` type for typed `.get()` access.

**7 accesses intentionally kept** (runtime namespace needed for self-registration or dynamic
factory patterns): Debug.ts pool cleanup, ZPP_PublicList factory, ZPP_Vec2List/ContactList/
MixVec2List registration, ZPP_GeomVertexIterator registration.

### ✅ Priority 24: `nape.*` namespace audit + reduction — DONE

**17 safe `nape.xxx.Yyy = Yyy` assignments removed** where ZPP internal code uses factory
callbacks instead of namespace lookups (confirmed no `nape.constraint.AngleJoint` etc. reads
in native/ code):
- 7 constraint joints (AngleJoint..WeldJoint) — use `ZPP_*Joint._createFn`
- 4 callback listeners (Body/Constraint/Interaction/PreListener)
- 4 callback subclasses (Body/Constraint/Interaction/PreCallback)
- 2 arbiter subclasses (CollisionArbiter, FluidArbiter) — use `ZPP_Arbiter._createXxxArb`

**Remaining namespace assignments are still needed** for:
- Enum singleton access (`new nape.phys.BodyType()` etc. in `ZPP_Body._initEnums`)
- Config constants (`nape.Config.epsilon` in `ZPP_Space`)
- Public API iterators and wrapper classes created at runtime

## Modernization Pattern

### ✅ Priority 25: `type Any = any` → real TypeScript types — DONE

**Effort: XL | Impact: largest | Risk: medium**

152 files use `type Any = any` as an escape hatch. Three categories:

- **~30% — generics**: `static _wrap(inner: Any): Any` → `static _wrap<T>(inner: T): Wrapper<T>`
- **~30% — union types**: `filter?: Any` → `filter?: InteractionFilter | null`
- **~40% — legitimately dynamic**: user-data fields, engine-internal casts — keep as `unknown` or `any`

**Done so far** (public API files):
- `Body.ts` — `type Any` removed; ~30 occurrences replaced with real types (`Compound`, `Arbiter`,
  `Mat23`, `Material`, `InteractionFilter`, `MassMode`, `InertiaMode`, `GravMassMode`,
  `Vec2`, `AABB`, `Space`, `BodyType`); remaining `any` casts are legitimately dynamic
- `Space.ts` — `type Any` removed; constructor, getters, `visitCompounds`, `interactionType`,
  `shapesUnderPoint` typed (`Broadphase`, `Compound`, `InteractionType`)
- `Ray.ts` — `type Any` removed; `_wrap`, `fromSegment`, `origin`/`direction` setters typed;
  `(v as Any).zpp_disp` → `v.zpp_disp` (Vec2 properties are directly accessible)
- `ConvexResult.ts`, `RayResult.ts` — `type Any` removed; `_wrap` typed with `ZPP_ConvexRayResult`;
  `shape` getter returns `Shape` instead of `any`
- `Mat23.ts`, `MatMN.ts` — `type Any` removed; `_wrap` signatures typed
- `ArbiterType.ts`, `Winding.ts`, `BodyType.ts`, `GravMassMode.ts`, `InertiaMode.ts`,
  `MassMode.ts`, `ShapeType.ts`, `ValidationResult.ts`, `Broadphase.ts` — unused `type Any` removed
- **callbacks/** (16 files) — all `type Any = any` removed; typed: `CbEvent`, `Listener`,
  `Body`, `Constraint`, `Interactor`, `Arbiter`, `PreFlag`, `ArbiterType` getters; handler
  callbacks typed with concrete Callback subclass params; `options: OptionType|CbType|null`;
  `OptionType.includes/excludes: object` (factory-generated list); `CbType.interactors/
  constraints: object`; `(Foo as any).__super__` pattern for Haxe metadata
- **dynamics/** (4 files) — `Arbiter.ts`: `type`, `shape1/2`, `body1/2`, `collisionArbiter`,
  `fluidArbiter`, `state` all typed; `Contact.ts`: `arbiter: CollisionArbiter|null`,
  impulse methods `body: Body|null`; `CollisionArbiter.ts`: `contacts: object`, `normal: Vec2`,
  `referenceEdge1/2: Edge|null`, impulse methods typed; `FluidArbiter.ts`: all `body: Body|null`
- `Compound.ts` — `type Any` removed; `visitConstraints(lambda: (c: Constraint)=>void)`,
  `visitBodies` lambdas typed; list getters `bodies/constraints/compounds: object`;
  also fixed latent bug: `setupWorldCOM` → `getworldCOM`
- `Edge.ts` — `type Any` removed; `_wrap` typed, `polygon: Polygon`, `_wrapVert(ZPP_Vec2)`
- **shape/** (3 files) — `Shape.ts`, `Circle.ts`, `Polygon.ts`: `type Any` removed; remaining
  `any` casts are legitimately dynamic (ZPP internal dispatch, prototype copy loops)
- **constraint/** (9 files) — `Constraint.ts` + 7 joints + `UserConstraint`: `type Any` removed;
  typed: `impulse(): MatMN`, `bodyImpulse(): Vec3`, `body1/2: Body|null`, `anchor*: Vec2`,
  `compound: Compound|null`, `cbTypes: object`, `userData: Record<string,unknown>`,
  `get_body*/set_body*`, `get_anchor*/set_anchor*` backward-compat methods
- **geom/** (5 files) — `Geom.ts`, `GeomPoly.ts`, `MarchingSquares.ts`, `Vec2List.ts`,
  `GeomVertexIterator.ts`: `type Any` removed; internal ZPP vertex/iterator helpers remain `any`
- **dynamics/ContactList.ts** — `type Any` removed; prototype-based constructor pattern
  retains `this: any` (Haxe-ported list implementation)

**All public API files done** — `type Any = any` fully eliminated from `src/` (non-native).

**Native files done** — 25 files cleaned in `src/native/geom/` and `src/native/util/`:
- `ZPP_Const.ts`, `ZPP_ID.ts`, `ZPP_Math.ts`, `ZPP_SweepDistance.ts`, `ZPP_VecMath.ts` — removed
  `type Any` and `__class__: Any = ClassName` dead code (P21 leftover)
- `ZPP_PubPool.ts`, `ZPP_Flags.ts` — pool/flag fields typed as `any` (circular import: types are
  Vec2/Vec3/GeomPoly and enum singletons, which can't be imported from these util files)
- `ZPP_Vec3.ts`, `ZPP_Mat23.ts`, `ZPP_MatMN.ts` — `outer/wrap` typed (`any` for public wrapper ref)
- `ZPP_GeomVertexIterator.ts` — `ptr/start/outer` typed as `any` (`.zpp_inner` access pattern)
- `ZPP_ConvexRayResult.ts` — factory callbacks and instance fields typed as `any` (circular with Shape, Vec2)
- `ZPP_Vec2.ts`, `ZPP_AABB.ts` — `outer: any`, `wrap_min/max: any` (Haxe pool disconnection pattern:
  `outer.zpp_inner = null` assigns null to a non-nullable typed field — can't be typed without ugly casts)
- `ZPP_GeomVert.ts`, `ZPP_GeomPoly.ts`, `ZPP_SimplifyV.ts`, `ZPP_SimpleVert.ts`,
  `ZPP_PartitionVertex.ts`, `ZPP_PartitionPair.ts`, `ZPP_CutVert.ts`, `ZPP_SimpleEvent.ts`,
  `ZPP_MarchPair.ts`, `ZPP_Triangular.ts`, `ZPP_Collide.ts`, `ZPP_Geom.ts`,
  `ZPP_ToiEvent.ts`, `ZPP_Convex.ts` — `type Any` removed; dynamic/circular fields remain `any`

**Key patterns established for native files:**
- `outer`/`wrap`/`wrap_min`/`wrap_max` fields holding public API wrappers → always `any`
  (circular ESM import prevention + Haxe `outer.zpp_inner = null` pool disconnection pattern)
- `_nape`/`_zpp` static namespace refs → always `any` (dynamic dispatch)
- `_wrapFn` callbacks → `((zpp: ZPP_Foo) => any) | null` (typed input, `any` output)
- `__class__: Any = ClassName` instance fields → removed entirely (P21 dead code)
- Corresponding `__class__` test assertions removed from affected test files
- ZNPList/ZNPNode/ZPP_Set fields typed with generics where the element type is known:
  `bodylisteners: any` (ZNPList_ZPP_BodyListener is a dynamic class) but `.elt` → `ZPP_BodyListener`
- Handler callbacks typed with concrete param types where possible:
  `handler: ((val: ZPP_CbType, included: boolean, added: boolean) => void) | null`
- **When removing `any`: prefer concrete types or generics over `any`** — use `any` only when:
  - circular ESM import would result (outer/wrap refs)
  - the type is a dynamic ZNPList/ZNPNode/ZPP_Set subclass created at runtime via `_zpp.util.*`
  - the field is user-facing `userData` → use `unknown` instead

**Native geom/ files done:**
- `ZPP_SimpleSeg.ts` — `left/right: ZPP_SimpleVert`, `vertices: ZPP_Set<ZPP_SimpleVert>`,
  `prev: ZPP_SimpleSeg|null`, `node: ZPP_Set<ZPP_SimpleSeg>|null`; `__class__` removed
- `ZPP_CutInt.ts` — `path0/path1/start/end: ZPP_CutVert|null`; `__class__` removed
- `ZPP_SimpleSweep.ts` — `tree: ZPP_Set<ZPP_SimpleSeg>|null`; typed methods with `ZPP_SimpleSeg`
- `ZPP_PartitionedPoly.ts` — `sharedPPList: ZNPList<ZPP_PartitionedPoly>`, `sharedGVList: ZNPList<ZPP_GeomVert>`
- `ZPP_Monotone.ts` — `queue: ZNPList<ZPP_PartitionVertex>`, `edges: ZPP_Set<ZPP_PartitionVertex>`
- `ZPP_Simplify.ts` — `stack: ZNPList<ZPP_SimplifyP>|null`; `XYPoint` interface for helpers
- `ZPP_Simple.ts` — all static fields typed (`FastHash2_Boolfalse`, `ZPP_Set<*>`, `ZNPList<*>`)
- `ZPP_MarchingSquares.ts` — `isos/ints/map` typed (`ZNPArray2_Float`, `ZNPArray2_ZPP_GeomVert`, `ZNPArray2_ZPP_MarchPair`)
- `ZPP_Cutter.ts` — `P: ZPP_GeomVert|null`; locals `ZPP_CutVert|null`

**Native util/ files done:**
- `ZNPList.ts` — typed `_NodeClass` with `ZNPNodeClass<T>` interface + `ZNPListConstructor<T>`
- `ZPP_Set.ts` — typed `zpp_pool`/constructor with `ZPP_SetConstructor<T>` interface
- `ZPP_ContactList.ts` — `inner: ZPP_Contact`, `at_ite/push_ite: ZPP_Contact|null`
- `ZPP_Vec2List.ts` — `inner: ZNPList<unknown>`
- `ZPP_Ray.ts` — `userData: unknown`, `aabbtest/aabbsect(a: ZPP_AABB)`, invalidate callbacks `(x: ZPP_Vec2)`
- `ZPP_MixVec2List.ts` — `type Any` removed; `ensureVec2Wrapper(zpp: ZPP_Vec2)`; `prototype.__class__` removed

**Native dynamics/ files done:**
- `ZPP_Arbiter.ts`, `ZPP_Contact.ts`, `ZPP_IContact.ts`, `ZPP_ColArbiter.ts`, `ZPP_FluidArbiter.ts`,
  `ZPP_SensorArbiter.ts`, `ZPP_InteractionFilter.ts`, `ZPP_InteractionGroup.ts`, `ZPP_SpaceArbiterList.ts`
  — all `type Any` + `__class__` removed; fields typed or justified `any`

**Native callbacks/ files done (8 files):**
- `ZPP_Listener.ts` — `type Any` removed; `types/events: any[]`; `_initEnums(nape: any, ZPP_Flags: any)`
- `ZPP_BodyListener.ts` — `type Any` + `__class__` removed; `handler/options/outer_zn: any`
- `ZPP_ConstraintListener.ts` — `type Any` + `__class__` removed; same as BodyListener
- `ZPP_Callback.ts` — `type Any` + `__class__` removed; `int1/int2/set/body/constraint: any`
- `ZPP_CbSetPair.ts` — `type Any` + `__class__` removed; `a/b/listeners: any`
- `ZPP_CbType.ts` — `type Any` + `__class__` removed; `addint/addbody/addconstraint` params
  typed as `ZPP_InteractionListener`/`ZPP_BodyListener`/`ZPP_ConstraintListener`; `ANY_*: ZPP_CbType|null`;
  `userData: unknown`; list fields remain `any` (dynamic ZNPList subclasses)
- `ZPP_OptionType.ts` — `type Any` + `__class__` removed; `handler: ((val: ZPP_CbType, included: boolean, added: boolean) => void)|null`;
  `nonemptyintersection` and `insertOrdered` locals typed as `ZPP_CbType`; `set()` uses `!==`

**Native shape/ files done:**
- `ZPP_Edge.ts` — `type Any` + `__class__` removed; fields remain `any` (outer/wrap = circular, polygon/vertex refs = dynamic)
- `ZPP_Circle.ts` — `type Any` + `__class__` removed; `(this as any)._initShape()`, `dstProto as any` retained
- `ZPP_Shape.ts` — `type Any` + `__class__` removed; `(ZPP_Shape.prototype as any)[k]` kept for prototype copy loop
- `ZPP_Polygon.ts` — `type Any` + `__class__` removed; `dstProto as any` kept for prototype copy loop

**Native phys/ files done (partial):**
- `ZPP_Material.ts` — `type Any` + `__class__` removed; `shapes/wrap_shapes: any` (dynamic ZNPList), `outer: any` (circular)

Count: 23 files remain in `src/native/` (space/10, constraint/9, callbacks/2→already done)

**Native phys/ files done (all 4):**
- `ZPP_FluidProperties.ts` — `type Any` + `__class__` removed; `userData: unknown`; Vec2/ZNPList/outer fields remain `any`
- `ZPP_Interactor.ts` — `type Any` + `__class__` removed; `userData: unknown`; ishape/ibody/icompound/outer_i/cbTypes/cbsets remain `any` (circular/dynamic)
- `ZPP_Compound.ts` — `type Any` + `__class__` removed; `userData: unknown`; all list/space/wrapper fields remain `any` (circular/dynamic)
- `ZPP_Body.ts` — `type Any` + `__class__` removed; all Vec2 wrapper/list/space/component fields remain `any` (circular/dynamic)

**Native space/ files done (8 of 10):**
- `ZPP_AABBNode.ts` — `type Any` + `__class__` removed; `shape: any` (circular ZPP_Shape); `aabb: ZPP_AABB`
- `ZPP_AABBPair.ts` — `type Any` + `__class__` removed; `n1/n2/arb: any` (circular)
- `ZPP_SweepData.ts` — `type Any` + `__class__` removed; `aabb/shape: any` (circular)
- `ZPP_Component.ts` — `type Any` + `__class__` removed; `body/constraint/island: any` (circular)
- `ZPP_Island.ts` — `type Any` + `__class__` removed; linked list methods fully typed with `ZPP_Component`; `comps/_zpp: any` (dynamic/namespace)
- `ZPP_CallbackSet.ts` — `type Any` + `__class__` removed; `COLLISIONstate` etc. typed as `number|null`; arbiter methods `any` (dynamic ZNPList)
- `ZPP_CbSetManager.ts` — `type Any` + `__class__` removed; all fields/params `any` (dynamic _zpp dispatch)
- `ZPP_Broadphase.ts` — `type Any` + `__class__` removed; all fields/params `any` (circular/dynamic _zpp/_nape dispatch)

**Native space/ files done (all 4 remaining):**
- `ZPP_AABBTree.ts` — `type Any` + `__class__` removed; `ret: ZPP_AABBNode` annotation; `node as ZPP_AABBNode` cast in while loop
- `ZPP_DynAABBPhase.ts` — `type Any` + `__class__` removed; all fields/params `any` (circular/dynamic)
- `ZPP_SweepPhase.ts` — `type Any` + `__class__` removed; `list: ZPP_SweepData|null` typed; remaining `any` legitimately dynamic
- `ZPP_Space.ts` — `type Any` + `__class__` removed; all fields/params `any` (circular/dynamic engine internals)

**Native constraint/ files done (all 11):**
- `ZPP_CopyHelper.ts` — `type Any` + `__class__` removed; `bc/cb: any`
- `ZPP_UserBody.ts` — `type Any` + `__class__` removed; `body: any` (circular ZPP_Body)
- `ZPP_AngleJoint.ts`, `ZPP_MotorJoint.ts`, `ZPP_DistanceJoint.ts`, `ZPP_PivotJoint.ts`,
  `ZPP_WeldJoint.ts`, `ZPP_LineJoint.ts`, `ZPP_PulleyJoint.ts` — `type Any` + `override __class__` removed; `Any` → `any`
- `ZPP_Constraint.ts`, `ZPP_UserConstraint.ts` — `type Any` + `__class__` removed; `Any` → `any`
- 3 test files updated: removed `__class__` assertions from `ZPP_AngleJoint.test.ts`,
  `ZPP_MotorJoint.test.ts`, `ZPP_CopyHelper.test.ts`

**`type Any = any` fully eliminated from entire `src/` codebase. All 2294 tests pass.**

### ✅ Priority 26: Tree shaking — DONE

All nape-namespace assignments and factory-callback wiring centralized in `src/core/bootstrap.ts`.
Individual modules no longer self-register, so bundlers can shake unused exports.

**What changed:**
- **`src/core/bootstrap.ts`** created — single place for all `nape.xxx = Foo` assignments,
  `_createFn` / `_createBodyCb` / `_createColArb` callbacks, `_bindBodyWrapForInteractor` etc.
- **50+ public API modules** stripped of self-register blocks (`nape.xxx = Foo` + `getNape()`)
- **`engine.ts`** cleaned — all side-effect imports removed; only `getNape()` + `ensureEnumsReady` remain
- **`index.ts`** and **`tests/setup.ts`** import `bootstrap.ts` as first side-effect
- **`package.json`**: `"sideEffects": true` → `["dist/index.js", "dist/index.cjs", "src/core/engine.ts", "src/core/bootstrap.ts"]`

**Notes:**
- `_wrapFn` callbacks (joint pool/wrap logic) remain in their modules — they use `getOrCreate`
  and extra field setup that is correct only in the module context. `_createFn` is in bootstrap.
- ZPP list backing classes (`ZPP_PublicList`, `ZPP_MixVec2List`, etc.) still self-register via
  `getNape()` at module load — these are side-effect imports in bootstrap.ts.
- True per-class tree shaking is limited by `ZPPRegistry.ts` statically importing all ZPP classes.
  Full granular shaking would require lazy ZPP registration (future work).

**Also fixed (discovered during build):**
- `ZPP_FluidProperties.userData: unknown` → `Record<string, unknown> | null`
- `ZPP_CbType.userData: unknown` → `Record<string, unknown> | null`
- `ZPP_Body.ts`: 2 leftover `Any` → `any` (P25 remnant)
- `CbType.ts` `ANY_*` getters use `as any` cast; `toString()` compares `this as any` to `ZPP_CbType`

### ✅ Priority 27: HaxeShims.ts final audit — DONE

`src/core/HaxeShims.ts` **deleted** entirely (195 → 0 lines). All remaining shims were
either dead code or already inlined. `tests/core/HaxeShims.test.ts` also deleted.
- `HaxeError`, `$bind`, `jsBoot.__string_rec` — migrated into `ZPPRegistry.ts` / native classes
- `Reflect`, `Std`, `StringTools` — no callers remained; removed completely

### ✅ Priority 28: User-facing API improvements — DONE (28a + 28c)

- **28a** ✅ — `Symbol.iterator` added uniformly to all List types:
  `Vec2List`, `ContactList`, `GeomVertexIterator` now support `for...of` and spread.
  Factory-generated lists already had it. `ZPP_MixVec2List` fixed: `length` getter
  re-applied via `Object.defineProperty` after `for...in` prototype copy.
- **28c** ✅ — All Haxe-style `get_*()`/`set_*()` backward-compat methods deleted:
  - 500+ instance methods removed from `Body`, `Compound`, `Space`, `Constraint`,
    all 7 joints, `OptionType`, `Vec2List`, `ContactList`, `NapeListFactory`
  - All static `get_FOO()` methods removed from all 14 enum classes
    (`BodyType`, `ShapeType`, `ArbiterType`, `CbEvent`, `InteractionType`,
    `ListenerType`, `PreFlag`, `GravMassMode`, `InertiaMode`, `MassMode`,
    `Winding`, `ValidationResult`, `Broadphase`, `CbType`)
  - Tests and benchmarks updated to use native TS getters/setters
  - Bundle size: 991 KB → 979 KB

- **28b** — Fix all `strictNullChecks` errors (already ON via `strict: true`) 🔶 In progress

  `strictNullChecks` was already enabled via `strict: true`. The task is fixing the ~2400 pre-existing
  errors that were silently ignored by tsup (which skips type-checking).

  **Fixed (11 of 14 files):**
  - `ZPP_Set.ts` — `const ret: ZPP_Set<T> | null` explicit annotations (circular initializer)
  - `FastHash2_Hashable2_Boolfalse.ts` — `const t: Hashable2_Boolfalse | null`
  - `ZPP_ToiEvent.ts` — `s1/s2: ZPP_Shape | null`, `arbiter: ZPP_ColArbiter | null` (was `object`)
  - `ZPP_SweepDistance.ts` — all 4 methods typed: `ZPP_ToiEvent`, `number`, `boolean`, `ZPP_Body`,
    `ZPP_Shape`, `ZPP_Vec2`; imported `ZPP_ToiEvent`, `ZPP_Body`, `ZPP_Shape`
  - `ZPP_Collide.ts` — all 7 static methods typed: `ZPP_Shape`, `ZPP_Body`, `ZPP_GeomVert`,
    `ZPP_ColArbiter`, `ZPP_FluidArbiter`, `boolean`; self-referencing vars annotated; `!` assertions
  - `ZPP_Component.ts` — `_inuse: boolean = false` field added (was missing)
  - `ZPP_Space.ts` — missing `false` arg to `dynamicSweep` (was `undefined`)
  - `ZPP_SimpleSeg.ts` — `zpp_pool` cast to `ZPP_Set<unknown>` (generic invariance)
  - `ZPP_Island.ts` — fixed via `_inuse` field added to `ZPP_Component`
  - `ZPP_Simplify.ts` — `!` assertions for ring-list invariants; `retnodes: ZPP_SimplifyV | null`
  - `ZPP_PartitionedPoly.ts` — `!` assertions + explicit nullable var types throughout
  - `ZPP_MarchingSquares.ts` — `!` on map access; dynamic ZNP list methods cast to `any`
  - `ZPP_Monotone.ts` — nullable head var type; `!` on RB-tree traversal; `ZPP_Set<unknown>` cast
  - `ZPP_Cutter.ts` + `ZPP_CutInt.ts` — `!` throughout; fixed `ZPP_CutInt.end/start` types

  **Remaining (3 files, ~2023 errors):**
  - `ZPP_DynAABBPhase.ts` — 1588 errors (largest file, heavy `any` dispatch)
  - `ZPP_SimpleSweep.ts` — 227 errors
  - `ZPP_Simple.ts` — 208 errors

### ✅ Priority 29: Missing test coverage — DONE (Step 1)

**Effort: M | Impact: safety | Risk: zero**

13 missing public API test files created, adding 254 new tests (2269 → 2523 tests, 125 → 138 files):

1. `tests/core/engine.test.ts` (11 tests) — `getNape()` lazy init, namespace structure, singleton, `ensureEnumsReady` idempotency
2. `tests/geom/Vec2List.test.ts` (49 tests) — push/pop/shift/unshift/at/has/remove/clear, iteration, copy, merge, fromArray
3. `tests/geom/GeomVertexIterator.test.ts` (11 tests) — vertex iteration via `GeomPoly.forwardIterator()`, for...of, disposal
4. `tests/dynamics/ContactList.test.ts` (31 tests) — empty list ops + integration with collision contacts
5. `tests/dynamics/CollisionArbiter.test.ts` (26 tests) — normal, contacts, radius, friction, elasticity, impulses, reference edges
6. `tests/dynamics/FluidArbiter.test.ts` (21 tests) — buoyancy/drag/total impulse, position/overlap, PreListener mutability
7. `tests/callbacks/BodyCallback.test.ts` (7 tests) — SLEEP callback integration, callback properties
8. `tests/callbacks/ConstraintCallback.test.ts` (8 tests) — SLEEP/BREAK/WAKE events with custom CbType
9. `tests/callbacks/InteractionCallback.test.ts` (9 tests) — BEGIN collision callback, int1/int2 properties
10. `tests/callbacks/PreCallback.test.ts` (6 tests) — PRE handler, int1/int2, arbiter, swapped, PreFlag.IGNORE
11. `tests/callbacks/Listener.test.ts` (30 tests) — base class via subclasses, cbEventToNumber, type/event/precedence/space
12. `tests/callbacks/ConstraintListener.test.ts` (19 tests) — WAKE/SLEEP/BREAK events, invalid event rejection, options/handler
13. `tests/callbacks/PreListener.test.ts` (25 tests) — COLLISION/SENSOR/FLUID types, pure getter/setter, handler null guards

**Key patterns discovered:**
- Constraints do NOT auto-register `CbType.ANY_CONSTRAINT` — must use custom CbType + `(joint.cbTypes as any).add(ct)`
- Fluid arbiters are transient — don't persist in `space.arbiters` after step; must capture inside ONGOING callback
- WAKE events require a sleep→wake transition, not just initial addition to space

**Remaining coverage gaps (future work):**
- Expand thin test files: `Body.test.ts` (25%), `AABB.test.ts` (35%), `FluidProperties.test.ts` (25%), `Material.test.ts` (53%)
- Space integration tests: `ZPP_Space` (30%), `ZPP_DynAABBPhase` (16%), `ZPP_AABBTree` (4%)

### Execution order

```
P21 → P22 → P23 → P24 → P25 → P26 → P27 (all done ✅)
                                ↓
                          P28 (API ergonomics)  ←→  P29 (tests)
```

| Priority | Effort | Impact | Risk | Status |
|----------|--------|--------|------|--------|
| P21 — Drop `__class__` / `$hxClasses` | S | medium | low | ✅ Done |
| P22 — Minification | XS | **large** | none | ✅ Done |
| P23 — `__zpp` → direct imports | M | large | medium | ✅ Done |
| P24 — Namespace reduction | S | medium | low | ✅ Done |
| P25 — `Any` → real types | XL | **largest** | medium | ✅ Done |
| P26 — Tree shaking | L | large | high | ✅ Done |
| P27 — HaxeShims audit | S | small | low | ✅ Done |
| P28 — API ergonomics (28a+28c done, 28b in progress) | M | DX | low | 🔶 Partial |
| P29 — Test coverage (Step 1: 13 API test files) | M | safety | none | ✅ Done |


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

4. **Register at module bottom** as shown in step 3 above.
   Do NOT import Foo.ts from ZPPRegistry.ts (circular import).

5. **Verify**: all tests pass, `npm run build` succeeds

### Key gotchas

- **Circular imports**: Foo.ts → engine.ts → ZPPRegistry.ts. Never import Foo.ts from ZPPRegistry.
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
