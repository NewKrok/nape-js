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
Engine bootstrap (src/core/engine.ts → ZPPRegistry.ts + HaxeShims.ts)
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

### Priority 25: `type Any = any` → real TypeScript types (in progress)

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
Count: ~114 files remain in `src/native/` — lower priority.

Remaining: native ZPP classes (~100 files) — lower priority.

### Priority 26: Tree shaking

**Effort: L | Impact: large (bundle selectivity) | Risk: high**

Blocker: `"sideEffects": true` is required because every public API module registers itself
as a side effect (`nape.phys.Body = Body` at module bottom).

Target architecture:
```typescript
// Centralized bootstrap file (src/core/bootstrap.ts):
import { Body } from "../phys/Body";
import { ZPP_Body } from "../native/phys/ZPP_Body";
ZPP_Body._wrapFn = (zpp) => new Body(zpp);
// ... all registrations here

// package.json:
"sideEffects": ["src/core/engine.ts", "src/core/bootstrap.ts"]
```
This allows `import { Vec2 } from "nape-js"` without pulling in Space/Body/Constraints.
Prerequisite: Priority 23 (direct ZPP imports) and Priority 24 (namespace reduction) done first.

### ✅ Priority 27: HaxeShims.ts final audit — DONE

`src/core/HaxeShims.ts` **deleted** entirely (195 → 0 lines). All remaining shims were
either dead code or already inlined. `tests/core/HaxeShims.test.ts` also deleted.
- `HaxeError`, `$bind`, `jsBoot.__string_rec` — migrated into `ZPPRegistry.ts` / native classes
- `Reflect`, `Std`, `StringTools` — no callers remained; removed completely

### Priority 28: User-facing API improvements

**Effort: M | Impact: DX | Risk: low**

- **28a** — Verify `Symbol.iterator` works uniformly on all List types
  (`GeomVertexIterator`, `Vec2List`, `ContactList`, factory-generated lists)
- **28b** — Enable `strictNullChecks: true` in `tsconfig.json` (requires P25 first)
- **28c** — Audit `get_*()` / `set_*()` Haxe-style accessor methods on public API:
  deprecate any that are exported in `index.ts` in favour of native TS getters/setters

### Priority 29: Missing test coverage

**Effort: M | Impact: safety | Risk: zero**

16 missing test files, priority order:
1. `tests/core/engine.test.ts` — `getNape()` lazy init, `ensureEnumsReady`
2. `tests/geom/Vec2List.test.ts`, `tests/dynamics/ContactList.test.ts`, `tests/geom/GeomVertexIterator.test.ts`
3. `tests/callbacks/BodyCallback.test.ts`, `tests/dynamics/CollisionArbiter.test.ts`, `tests/dynamics/FluidArbiter.test.ts`
4. `tests/callbacks/Listener.test.ts`, `tests/callbacks/ConstraintListener.test.ts`, `tests/callbacks/PreListener.test.ts`
5. `tests/constraint/Constraint.test.ts` (integration)

### Execution order

```
P21 → P22 → P23 → P24 → P27 (all done ✅)
                ↓
          P25 (Any → types, in progress)  ←→  P28 (API ergonomics)
                ↓
          P26 (tree shaking)
                ↓
          P29 (tests)
```

| Priority | Effort | Impact | Risk | Status |
|----------|--------|--------|------|--------|
| P21 — Drop `__class__` / `$hxClasses` | S | medium | low | ✅ Done |
| P22 — Minification | XS | **large** | none | ✅ Done |
| P23 — `__zpp` → direct imports | M | large | medium | ✅ Done |
| P24 — Namespace reduction | S | medium | low | ✅ Done |
| P25 — `Any` → real types | XL | **largest** | medium | 🔄 In progress |
| P26 — Tree shaking | L | large | high | ⬜ Pending |
| P27 — HaxeShims audit | S | small | low | ✅ Done |
| P28 — API ergonomics | M | DX | low | ⬜ Pending |
| P29 — Test coverage | M | safety | none | ⬜ Pending |


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
