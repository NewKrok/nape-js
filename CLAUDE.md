# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
~58k lines, down from ~82k) into clean, typed TypeScript classes.

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
npm test             # vitest — 1910 tests across 105 files
npm run lint         # eslint + prettier
```

### Pre-push checklist

**Before every `git push`, always run both:**
1. `npm test` — all tests must pass
2. `npm run build` — DTS generation must succeed

The build step catches TypeScript type errors that vitest does not (e.g., missing method
declarations for runtime-copied prototype methods). Never push without a green build.

## Modernization Status

### Extracted ZPP_* classes (src/native/) — 69 classes

| Category | Classes |
|----------|---------|
| Callbacks | `ZPP_Callback`, `ZPP_CbType`, `ZPP_CbSet`, `ZPP_CbSetPair`, `ZPP_OptionType`, `ZPP_Listener`, `ZPP_BodyListener`, `ZPP_ConstraintListener`, `ZPP_InteractionListener` |
| Collision | `ZPP_Collide`, `ZPP_SweepDistance` |
| Constraints | `ZPP_Constraint`, `ZPP_CopyHelper`, `ZPP_UserBody`, `ZPP_AngleJoint`, `ZPP_MotorJoint`, `ZPP_DistanceJoint`, `ZPP_PivotJoint`, `ZPP_LineJoint`, `ZPP_WeldJoint`, `ZPP_PulleyJoint`, `ZPP_UserConstraint` |
| Dynamics | `ZPP_InteractionFilter`, `ZPP_InteractionGroup`, `ZPP_Contact`, `ZPP_IContact`, `ZPP_Arbiter`, `ZPP_SensorArbiter`, `ZPP_FluidArbiter`, `ZPP_ColArbiter` |
| Geometry (core) | `ZPP_Vec2`, `ZPP_Vec3`, `ZPP_AABB`, `ZPP_Mat23`, `ZPP_MatMN`, `ZPP_GeomPoly`, `ZPP_MarchSpan`, `ZPP_MarchPair`, `ZPP_CutVert`, `ZPP_CutInt`, `ZPP_ConvexRayResult` |
| Geometry (algorithms) | `ZPP_Ray`, `ZPP_Cutter`, `ZPP_Simple`, `ZPP_SimpleSweep`, `ZPP_SimpleVert`, `ZPP_SimpleSeg`, `ZPP_SimpleEvent`, `ZPP_Simplify`, `ZPP_SimplifyV`, `ZPP_SimplifyP`, `ZPP_Monotone`, `ZPP_PartitionedPoly`, `ZPP_PartitionPair`, `ZPP_PartitionVertex`, `ZPP_Triangular`, `ZPP_Convex`, `ZPP_Geom`, `ZPP_GeomVert`, `ZPP_VecMath` |
| Physics | `ZPP_Material`, `ZPP_FluidProperties`, `ZPP_Compound`, `ZPP_Body` |
| Shapes | `ZPP_Shape`, `ZPP_Circle`, `ZPP_Edge`, `ZPP_Polygon` |
| Utilities | `ZPP_Math`, `ZPP_Const`, `ZPP_ID`, `ZPP_Flags`, `ZPP_PubPool` |

### Public API classes — all have TypeScript wrappers

Every public API class has a TypeScript wrapper. Classes are either **fully modernized**
(ZPP extracted, direct access) or **thin wrappers** (delegates to compiled ZPP).

#### Fully modernized (ZPP extracted, direct access)

| Class | File | Notes |
|-------|------|-------|
| Material | `src/phys/Material.ts` | Direct ZPP_Material access |
| InteractionFilter | `src/dynamics/InteractionFilter.ts` | 6 bitmask props, shouldCollide/Sense/Flow |
| InteractionGroup | `src/dynamics/InteractionGroup.ts` | 1 boolean prop, group hierarchy |
| FluidProperties | `src/phys/FluidProperties.ts` | 2 props + gravity (Vec2 dependency) |
| Vec2 | `src/geom/Vec2.ts` | Core class, pooling, weak references |
| Vec3 | `src/geom/Vec3.ts` | 3D vector (x, y, z) |
| Mat23 | `src/geom/Mat23.ts` | 2x3 affine matrix, factories |
| GeomPoly | `src/geom/GeomPoly.ts` | Vertex ring, decomposition algorithms |
| CbType | `src/callbacks/CbType.ts` | Callback type tags, ANY_* singletons |
| OptionType | `src/callbacks/OptionType.ts` | Include/exclude CbType filtering |
| AABB | `src/geom/AABB.ts` | Geometry bounds, Vec2 min/max wrappers |
| MatMN | `src/geom/MatMN.ts` | Variable-sized M×N matrix |
| MarchingSquares | `src/geom/MarchingSquares.ts` | Static isosurface extraction |
| Interactor | `src/phys/Interactor.ts` | Base class for Body/Shape/Compound |
| Shape | `src/shape/Shape.ts` | Base shape, dispatch to Circle/Polygon |
| Compound | `src/phys/Compound.ts` | Hierarchical grouping, extends Interactor |
| Body | `src/phys/Body.ts` | Constructor + getters/setters modernized, complex methods from compiled prototype |
| Listener | `src/callbacks/Listener.ts` | Base listener, space/event/precedence |
| BodyListener | `src/callbacks/BodyListener.ts` | WAKE/SLEEP body events |
| ConstraintListener | `src/callbacks/ConstraintListener.ts` | WAKE/SLEEP/BREAK constraint events |
| InteractionListener | `src/callbacks/InteractionListener.ts` | BEGIN/END/ONGOING interaction events |
| PreListener | `src/callbacks/PreListener.ts` | PRE interaction events |
| Callback | `src/callbacks/Callback.ts` | Base callback class |
| BodyCallback | `src/callbacks/BodyCallback.ts` | Body event callback (WAKE/SLEEP) |
| ConstraintCallback | `src/callbacks/ConstraintCallback.ts` | Constraint event callback |
| InteractionCallback | `src/callbacks/InteractionCallback.ts` | Interaction event callback |
| PreCallback | `src/callbacks/PreCallback.ts` | Pre-interaction callback |
| Contact | `src/dynamics/Contact.ts` | Direct ZPP_Contact access, impulse methods |
| Arbiter | `src/dynamics/Arbiter.ts` | Direct ZPP_Arbiter access, shape/body accessors |
| CollisionArbiter | `src/dynamics/CollisionArbiter.ts` | Direct ZPP_ColArbiter access, contacts/normal/friction |
| FluidArbiter | `src/dynamics/FluidArbiter.ts` | Direct ZPP_FluidArbiter access, position/overlap/buoyancy |
| Constraint | `src/constraint/Constraint.ts` | Direct ZPP_Constraint access, base props modernized |

**Singleton enums** (fully modernized, init-time stub + `setPrototypeOf` where needed):
GravMassMode, InertiaMode, MassMode, BodyType, ShapeType, ArbiterType, Winding,
ListenerType, Broadphase, ValidationResult, CbEvent, InteractionType, PreFlag

#### Thin wrappers (TS delegates to compiled ZPP)

| Class | File | Notes |
|-------|------|-------|
| Circle | `src/shape/Circle.ts` | Extends Shape, delegates to compiled ZPP_Circle |
| Polygon | `src/shape/Polygon.ts` | Extends Shape, delegates to compiled ZPP_Polygon |
| Space | `src/space/Space.ts` | Simulation container, delegates to compiled ZPP_Space |
| PivotJoint | `src/constraint/PivotJoint.ts` | Base props via ZPP_Constraint, joint-specific via compiled ZPP_PivotJoint |
| MotorJoint | `src/constraint/MotorJoint.ts` | Base props via ZPP_Constraint, joint-specific via compiled ZPP_MotorJoint |
| AngleJoint | `src/constraint/AngleJoint.ts` | Base props via ZPP_Constraint, joint-specific via compiled ZPP_AngleJoint |
| DistanceJoint | `src/constraint/DistanceJoint.ts` | Base props via ZPP_Constraint, joint-specific via compiled ZPP_DistanceJoint |
| LineJoint | `src/constraint/LineJoint.ts` | Base props via ZPP_Constraint, joint-specific via compiled ZPP_LineJoint |
| WeldJoint | `src/constraint/WeldJoint.ts` | Base props via ZPP_Constraint, joint-specific via compiled ZPP_WeldJoint |
| PulleyJoint | `src/constraint/PulleyJoint.ts` | Base props via ZPP_Constraint, joint-specific via compiled ZPP_PulleyJoint |
| Ray | `src/geom/Ray.ts` | Raycasting, ZPP_Ray extracted |
| ConvexResult | `src/geom/ConvexResult.ts` | Direct ZPP_ConvexRayResult access |
| RayResult | `src/geom/RayResult.ts` | Direct ZPP_ConvexRayResult access |
| Geom | `src/geom/Geom.ts` | Static utility (distance/intersects/contains) |

### Generic List/Iterator factory

Factory in `src/util/NapeListFactory.ts` + `src/util/registerLists.ts` replaces ~7,300 lines
of compiled boilerplate with ~750 lines of generic TypeScript.

**Factory-generated (13 pairs, 26 classes):**
CbTypeList, ListenerList, ConstraintList, ArbiterList, InteractionGroupList,
ConvexResultList, GeomPolyList, RayResultList, BodyList, CompoundList,
InteractorList, EdgeList, ShapeList (+ matching Iterators)

**Still in compiled code (special behavior):**
- `Vec2List` + `Vec2Iterator` — complex Vec2 wrapper creation in `at()`
- `ContactList` + `ContactIterator` — active-contact filtering in iteration
- `GeomVertexIterator` — vertex ring traversal (no corresponding List)

### Compiled code stubs

Some modernized classes keep minimal stubs in `nape-compiled.js` because compiled
initialization code references them before the TS module self-registers. The TS class
replaces the stub at module load time, and existing instances get `Object.setPrototypeOf`
fixup where needed.

**Classes with stubs:** CbType, OptionType, ArbiterType, ListenerType, Listener, CbEvent,
BodyType, ShapeType, ValidationResult, Broadphase, Arbiter, CollisionArbiter, FluidArbiter,
ArbiterList, Callback, BodyCallback, ConstraintCallback, InteractionCallback, PreCallback

### Internal namespace exposure

`nape.__zpp = zpp_nape;` at the end of the compiled factory function allows TS classes
to access internal compiled classes like `ZNPList_*`, `ZPP_Set_*`, `FastHash2_*`, etc.

## Next Modernization Candidates

**Priority 1 (complete all public API wrappers)** — DONE

**Priority 2: Upgrade thin wrappers to full modernization (ZPP extraction)**
- ~~`ZPP_Compound` extraction → Compound full modernization~~ ✅
- ~~`ZPP_Body` extraction → Body full modernization~~ ✅
- ~~`ZPP_Contact` extraction (~500 lines incl. linked list) → Contact full modernization~~ ✅
- ~~`ZPP_Arbiter` extraction (~2,800 lines incl. subclasses) → Arbiter/CollisionArbiter/FluidArbiter full modernization~~ ✅

~~**Priority 3: Constraint classes (~7,600 lines, 11 classes)**~~ ✅
- ~~`ZPP_Constraint` (base, ~400 lines) + `ZPP_CopyHelper` (~30 lines)~~
- ~~`Constraint.ts` public API fully modernized (direct ZPP_Constraint access)~~
- ~~`ZPP_AngleJoint` (~470 lines), `ZPP_MotorJoint` (~305 lines)~~
- ~~`ZPP_DistanceJoint` (~875 lines), `ZPP_PivotJoint` (~863 lines)~~
- ~~`ZPP_LineJoint` (~1,100 lines), `ZPP_PulleyJoint` (~1,890 lines)~~
- ~~`ZPP_WeldJoint` (~990 lines), `ZPP_UserConstraint` (~670 lines), `ZPP_UserBody` (~16 lines)~~

~~**Priority 4: Shape classes (~3,270 lines, 4 classes)**~~ ✅
- ~~`ZPP_Shape` (base, ~980 lines) + `ZPP_Circle` (~330 lines) + `ZPP_Polygon` (~1,610 lines) + `ZPP_Edge` (~350 lines)~~

~~**Priority 5: Isolated geometry algorithms (~8,700 lines, 19 classes)**~~ ✅
- ~~`ZPP_Ray` (~1,930 lines), `ZPP_Cutter` (~1,760 lines)~~
- ~~`ZPP_Simple` (~1,345 lines), `ZPP_SimpleSweep` (~330 lines), `ZPP_Simplify` (~310 lines), `ZPP_SimplifyV`, `ZPP_SimplifyP`~~
- ~~`ZPP_SimpleVert`, `ZPP_SimpleSeg`, `ZPP_SimpleEvent` (pool objects)~~
- ~~`ZPP_Monotone` (~450 lines), `ZPP_PartitionedPoly` (~550 lines), `ZPP_PartitionPair` (~410 lines), `ZPP_PartitionVertex` (~280 lines), `ZPP_Triangular` (~340 lines)~~
- ~~`ZPP_Convex` (~80 lines), `ZPP_Geom` (~330 lines), `ZPP_GeomVert` (~184 lines), `ZPP_VecMath` (~18 lines)~~

~~**Priority 6: Collision & continuous detection (~6,500 lines, 2 classes)**~~ ✅
- ~~`ZPP_Collide` (~3,190 lines, narrowphase collision dispatcher)~~
- ~~`ZPP_SweepDistance` (~3,310 lines, continuous collision / time-of-impact)~~

**Priority 7: Space & broadphase (~23,400 lines — largest and most complex)**
- `ZPP_Space` (~13,450 lines, core simulation loop, integration, solver)
- `ZPP_DynAABBPhase` (~4,920 lines, dynamic AABB broadphase)
- `ZPP_Broadphase` (~1,445 lines, base broadphase container)
- `ZPP_SweepPhase` (~1,210 lines, sweep-and-prune variant)
- `ZPP_AABBTree` (~1,170 lines) + `ZPP_AABBNode` (~66 lines) + `ZPP_AABBPair` (~26 lines)
- `ZPP_Island` (~365 lines) + `ZPP_Component` (~45 lines) + `ZPP_SweepData` (~26 lines)
- `ZPP_CallbackSet` (~567 lines) + `ZPP_CbSetManager` (~145 lines)
- `ZPP_SpaceArbiterList` (~277 lines)

**Still in compiled (misc, ~51.6k lines):**
- `ZPP_Interactor` (~377 lines, base class for Body/Compound/Shape)
- Special lists: `Vec2List`, `ContactList`, `GeomVertexIterator` (~230 lines)
- `ZPP_MarchingSquares` (~3,820 lines, compiled version still present alongside TS)
- Internal linked lists (`ZNPList_*`, `ZNPNode_*`, `ZPP_Set_*`)
- Utility hash/array helpers (`FastHash2_*`, `ZNPArray2_*`, `Hashable2_*`)

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
