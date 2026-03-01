# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
~112k lines) into clean, typed TypeScript classes.

### Architecture Layers

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
npm test             # vitest — all 1000+ tests
npm run lint         # eslint + prettier
```

## Modernization Status

### Already extracted (ZPP_* to src/native/) — 29 classes

Callbacks:  `ZPP_Callback`, `ZPP_CbType`, `ZPP_CbSet`, `ZPP_CbSetPair`, `ZPP_OptionType`,
            `ZPP_Listener`, `ZPP_BodyListener`, `ZPP_ConstraintListener`, `ZPP_InteractionListener`
Dynamics:   `ZPP_InteractionFilter`, `ZPP_InteractionGroup`
Geometry:   `ZPP_Vec2`, `ZPP_Vec3`, `ZPP_AABB`, `ZPP_Mat23`, `ZPP_MatMN`, `ZPP_GeomPoly`,
            `ZPP_MarchSpan`, `ZPP_MarchPair`, `ZPP_CutVert`, `ZPP_CutInt`, `ZPP_ConvexRayResult`
Physics:    `ZPP_Material`, `ZPP_FluidProperties`
Utilities:  `ZPP_Math`, `ZPP_Const`, `ZPP_ID`, `ZPP_Flags`, `ZPP_PubPool`

### Already fully modernized (public API class replaces compiled code)

| Class | File | Tests | Notes |
|-------|------|-------|-------|
| **Material** | `src/phys/Material.ts` | 4 | Direct ZPP_Material access, self-registers in namespace |
| **InteractionFilter** | `src/dynamics/InteractionFilter.ts` | 26 | 6 bitmask props, shouldCollide/Sense/Flow |
| **InteractionGroup** | `src/dynamics/InteractionGroup.ts` | 17 | 1 boolean prop, group hierarchy |
| **FluidProperties** | `src/phys/FluidProperties.ts` | 24 | 2 props + gravity (Vec2 dependency) |
| **Vec2** | `src/geom/Vec2.ts` | 45 | Core class, pooling, weak references |
| **Vec3** | `src/geom/Vec3.ts` | 11 | 3D vector (x, y, z) with NaN checks |
| **Mat23** | `src/geom/Mat23.ts` | 47 | 2x3 affine matrix, factories, inverse/concat/transform |
| **GeomPoly** | `src/geom/GeomPoly.ts` | 53 | Complex polygon class, vertex ring, decomposition algorithms |
| **CbType** | `src/callbacks/CbType.ts` | 31 | Callback type tags, ANY_* singletons, stub in compiled code |
| **OptionType** | `src/callbacks/OptionType.ts` | 30 | Include/exclude CbType filtering, stub in compiled code |
| **AABB** | `src/geom/AABB.ts` | 31 | Geometry bounds, Vec2 min/max wrappers |
| **MatMN** | `src/geom/MatMN.ts` | 35 | Variable-sized M×N matrix, transpose/mul |
| **MarchingSquares** | `src/geom/MarchingSquares.ts` | 23 | Static isosurface extraction, delegates to compiled ZPP_MarchingSquares |
| **Interactor** | `src/phys/Interactor.ts` | 21 | Base class for Body/Shape/Compound, polymorphic dispatch |
| **Shape** | `src/shape/Shape.ts` | 10 | Base shape class, polymorphic dispatch to Circle/Polygon |
| **GravMassMode** | `src/phys/GravMassMode.ts` | 11 | Singleton enum (DEFAULT/FIXED/SCALED), uses ZPP_Flags |
| **InertiaMode** | `src/phys/InertiaMode.ts` | 9 | Singleton enum (DEFAULT/FIXED), uses ZPP_Flags |
| **MassMode** | `src/phys/MassMode.ts` | 9 | Singleton enum (DEFAULT/FIXED), uses ZPP_Flags |
| **ArbiterType** | `src/dynamics/ArbiterType.ts` | 11 | Singleton enum (COLLISION/SENSOR/FLUID), init-time stub + setPrototypeOf |
| **Winding** | `src/geom/Winding.ts` | 11 | Singleton enum (UNDEFINED/CLOCKWISE/ANTICLOCKWISE), used by GeomPoly |
| **ListenerType** | `src/callbacks/ListenerType.ts` | 13 | Singleton enum (BODY/CONSTRAINT/INTERACTION/PRE), init-time stub + setPrototypeOf |
| **Broadphase** | `src/space/Broadphase.ts` | 9 | Singleton enum (DYNAMIC_AABB_TREE/SWEEP_AND_PRUNE), stub in compiled code |
| **ValidationResult** | `src/shape/ValidationResult.ts` | 13 | Singleton enum (VALID/DEGENERATE/CONCAVE/SELF_INTERSECTING), stub in compiled code |
| **Callback** | `src/callbacks/Callback.ts` | 5 | Base callback class, stub in compiled code |
| **BodyCallback** | `src/callbacks/BodyCallback.ts` | 5 | Body event callback (WAKE/SLEEP), extends Callback, stub |
| **ConstraintCallback** | `src/callbacks/ConstraintCallback.ts` | 4 | Constraint event callback, extends Callback, stub |
| **InteractionCallback** | `src/callbacks/InteractionCallback.ts` | 4 | Interaction event callback, extends Callback, stub |
| **PreCallback** | `src/callbacks/PreCallback.ts` | 4 | Pre-interaction callback, extends Callback, stub |
| **CbEvent** | `src/callbacks/CbEvent.ts` | 18 | Singleton enum (BEGIN/ONGOING/END/WAKE/SLEEP/BREAK/PRE), init-time stub + setPrototypeOf |
| **InteractionType** | `src/callbacks/InteractionType.ts` | 14 | Singleton enum (COLLISION/SENSOR/FLUID/ANY), no stub needed |
| **PreFlag** | `src/callbacks/PreFlag.ts` | 13 | Singleton enum (ACCEPT/IGNORE/ACCEPT_ONCE/IGNORE_ONCE), no stub needed |
| **BodyType** | `src/phys/BodyType.ts` | 12 | Singleton enum (STATIC/DYNAMIC/KINEMATIC), init-time stub + setPrototypeOf |
| **ShapeType** | `src/shape/ShapeType.ts` | 10 | Singleton enum (CIRCLE/POLYGON), init-time stub + setPrototypeOf |
| **Listener** | `src/callbacks/Listener.ts` | — | Base listener class, space/event/precedence management, ZPP_Listener direct access |
| **BodyListener** | `src/callbacks/BodyListener.ts` | 4 | WAKE/SLEEP body events, ZPP_BodyListener direct access |
| **ConstraintListener** | `src/callbacks/ConstraintListener.ts` | 4 | WAKE/SLEEP/BREAK constraint events, ZPP_ConstraintListener direct access |
| **InteractionListener** | `src/callbacks/InteractionListener.ts` | 3 | BEGIN/END/ONGOING interaction events, ZPP_InteractionListener direct access |
| **PreListener** | `src/callbacks/PreListener.ts` | 3 | PRE interaction events, shares ZPP_InteractionListener with InteractionListener |

### Thin wrappers (TS class delegates to compiled code)

| Class | File | Tests | Notes |
|-------|------|-------|-------|
| **Body** | `src/phys/Body.ts` | 30 | Full public API, delegates to compiled ZPP_Body |
| **Circle** | `src/shape/Circle.ts` | 6 | Extends Shape, delegates to compiled ZPP_Circle |
| **Polygon** | `src/shape/Polygon.ts` | 5 | Extends Shape, delegates to compiled ZPP_Polygon |
| **Space** | `src/space/Space.ts` | 9 | Simulation container, delegates to compiled ZPP_Space |
| **Constraint** | `src/constraint/Constraint.ts` | — | Base constraint class, delegates to compiled ZPP_Constraint |
| **PivotJoint** | `src/constraint/PivotJoint.ts` | 4 | Extends Constraint, delegates to compiled ZPP_PivotJoint |
| **MotorJoint** | `src/constraint/MotorJoint.ts` | 6 | Extends Constraint, delegates to compiled ZPP_MotorJoint |
| **AngleJoint** | `src/constraint/AngleJoint.ts` | 6 | Extends Constraint, delegates to compiled ZPP_AngleJoint |
| **DistanceJoint** | `src/constraint/DistanceJoint.ts` | 6 | Extends Constraint, delegates to compiled ZPP_DistanceJoint |
| **LineJoint** | `src/constraint/LineJoint.ts` | 6 | Extends Constraint, delegates to compiled ZPP_LineJoint |
| **WeldJoint** | `src/constraint/WeldJoint.ts` | 6 | Extends Constraint, delegates to compiled ZPP_WeldJoint |
| **PulleyJoint** | `src/constraint/PulleyJoint.ts` | 6 | Extends Constraint, delegates to compiled ZPP_PulleyJoint |
| **Ray** | `src/geom/Ray.ts` | 14 | Raycasting, delegates to compiled nape.geom.Ray (ZPP_Ray not extracted) |
| **ConvexResult** | `src/geom/ConvexResult.ts` | 9 | Convex-cast result, direct ZPP_ConvexRayResult access |
| **RayResult** | `src/geom/RayResult.ts` | 10 | Raycast result, direct ZPP_ConvexRayResult access |
| **Contact** | `src/dynamics/Contact.ts` | — | Contact point, impulse methods, delegates to compiled ZPP_Contact |
| **Compound** | `src/phys/Compound.ts` | — | Hierarchical grouping, extends Interactor, delegates to compiled ZPP_Compound |

### Generic List/Iterator factory (replaces ~7,300 lines of compiled boilerplate)

All typed List + Iterator pairs (e.g., `BodyList`/`BodyIterator`, `CbTypeList`/`CbTypeIterator`)
are generated by a factory in `src/util/NapeListFactory.ts` and registered in
`src/util/registerLists.ts`. This replaced 13 identical-structure List/Iterator pairs
(~7,300 lines) with ~400 lines of generic TypeScript.

**Factory-generated (13 pairs, 26 classes):**
`CbTypeList`, `ListenerList`, `ConstraintList`, `ArbiterList`, `InteractionGroupList`,
`ConvexResultList`, `GeomPolyList`, `RayResultList`, `BodyList`, `CompoundList`,
`InteractorList`, `EdgeList`, `ShapeList` (+ matching Iterators)

**Still in compiled code (special behavior):**
- `Vec2List` + `Vec2Iterator` — complex Vec2 wrapper creation in `at()`
- `ContactList` + `ContactIterator` — active-contact filtering in iteration
- `GeomVertexIterator` — vertex ring traversal (no corresponding List)

### Compiled code stubs

Some modernized classes require minimal stubs in `nape-compiled.js` because the compiled
initialization code or internal methods reference them before the TS module self-registers:

- **CbType**: Stub constructor needed for `ANY_BODY/ANY_SHAPE/ANY_COMPOUND/ANY_CONSTRAINT`
  singleton creation at init time (~line 121055). TS class retroactively fixes prototypes
  via `Object.setPrototypeOf` after self-registration.
- **OptionType**: Stub constructor + `including()`/`excluding()` needed for
  `ZPP_OptionType.argument()` which uses `instanceof nape.callbacks.OptionType`.
- **ArbiterType**: Stub constructor needed for COLLISION/SENSOR/FLUID singleton creation
  at init time. TS class retroactively fixes prototypes via `Object.setPrototypeOf`.
- **ListenerType**: Stub constructor needed for BODY/CONSTRAINT/INTERACTION/PRE singleton
  creation at init time (ZPP_Listener.types). TS class fixes prototypes via `Object.setPrototypeOf`.
- **Listener**: Stub constructor needed because compiled subclass patterns reference
  `nape.callbacks.Listener` as `__super__`. TS class replaces at module load time.
- **Callback/BodyCallback/ConstraintCallback/InteractionCallback/PreCallback**: Stubs needed
  because compiled ZPP_Space and ZPP_Callback wrappers create instances at runtime.
- **CbEvent**: Stub constructor needed for BEGIN/END/WAKE/SLEEP/BREAK/PRE/ONGOING singleton
  creation at init time (~line 119982). TS class fixes prototypes via `Object.setPrototypeOf`.
- **BodyType**: Stub constructor needed for STATIC/DYNAMIC/KINEMATIC singleton creation
  at init time (~line 120132). TS class fixes prototypes via `Object.setPrototypeOf`.
- **ShapeType**: Stub constructor needed for CIRCLE/POLYGON singleton creation
  at init time (~line 120163). TS class fixes prototypes via `Object.setPrototypeOf`.
- **ValidationResult**: Stub needed because compiled shape validation code creates instances.
- **Broadphase**: Stub needed because compiled Space code creates instances.
- **ArbiterList**: Stub constructor needed because `ZPP_SpaceArbiterList` extends it at
  init time (prototype copy + `.call()`). TS factory replaces with full implementation.

### Internal namespace exposure

`nape.__zpp = zpp_nape;` is added at the end of the compiled factory function to allow
TS classes (e.g., GeomPoly) to access internal compiled classes like `ZPP_GeomVert`,
`ZPP_Simple`, `ZPP_Monotone`, `ZPP_Convex`, etc.

### Next candidates for modernization

**Priority 1: Complete all public API wrappers**
- `Arbiter`, `CollisionArbiter`, `FluidArbiter` — thin wrappers (same pattern as Contact/Compound)
- `Geom` — static utility class, thin wrapper delegating to compiled code
- This would mean **every public API class** has a TypeScript wrapper

**Priority 2: Upgrade thin wrappers to full modernization (ZPP extraction)**
- `ZPP_Contact` extraction (~500 lines incl. linked list) → Contact full modernization
- `ZPP_Compound` extraction (~400 lines) → Compound full modernization
- `ZPP_Arbiter` extraction → Arbiter/CollisionArbiter/FluidArbiter full modernization
  - Arbiter (269 lines compiled), FluidArbiter (184 lines), CollisionArbiter (2,073 lines — high)

**Priority 3: High complexity ZPP extractions**

| Candidate | Complexity | Notes |
|-----------|------------|-------|
| `ZPP_Ray` extraction | High | ~1900 lines, ray-shape intersection algorithms |
| `ZPP_Body` extraction | Very High | ~5000 lines, core engine class |
| `ZPP_Space` extraction | Very High | Core simulation loop, broadphase, solver |

### Remaining in compiled code

**Public API thin wrappers (TS delegates to compiled ZPP):**
- Body, Circle, Polygon, Space, Constraint + 7 joint subclasses (already have TS wrappers above)
- Ray, ConvexResult, RayResult, Contact, Compound (already have TS wrappers above)

**Public API not yet wrapped:**
- Arbiter, CollisionArbiter, FluidArbiter
- Geom (static utility class)

**Internal ZPP classes (~79 in compiled code):**
- **Core engine**: `ZPP_Space`, `ZPP_Body`, `ZPP_Shape`, `ZPP_Broadphase`, collision detection
- **Constraints**: `ZPP_PivotJoint`, `ZPP_DistanceJoint`, `ZPP_AngleJoint`, etc.
- **Arbiters/Contacts**: `ZPP_Arbiter`, `ZPP_ColArbiter`, `ZPP_Contact`
- **Geometry algorithms**: `ZPP_Collide`, `ZPP_Convex`, `ZPP_Monotone`, `ZPP_Simple`
- **Special Lists**: `Vec2List`, `ContactList`, `GeomVertexIterator` (unique behavior)
- **Internal linked lists**: `ZNPList_*`, `ZNPNode_*`, `ZPP_Set_*`

## Modernization Pattern (step-by-step)

When extracting a public API class (e.g., `Foo`) from compiled code:

### 1. Prerequisite: ZPP_Foo must be extracted first

The internal `ZPP_Foo` class should already exist in `src/native/`. If not, extract it first
following the existing ZPP extraction pattern.

### 2. Add `_wrapFn` callback to ZPP_Foo

```typescript
// In src/native/.../ZPP_Foo.ts
static _wrapFn: ((zpp: ZPP_Foo) => Any) | null = null;

wrapper(): Any {
  if (this.outer == null) {
    if (ZPP_Foo._wrapFn) {
      this.outer = ZPP_Foo._wrapFn(this);        // ← new path
    } else {
      // ... existing legacy fallback ...
    }
  }
  return this.outer;
}
```

### 3. Rewrite the public API class

```typescript
// In src/.../Foo.ts
import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { ZPP_Foo } from "../native/.../ZPP_Foo";
import type { NapeInner } from "../geom/Vec2";

export class Foo {
  static __name__ = ["nape", "...", "Foo"];   // Haxe metadata

  zpp_inner: ZPP_Foo;                         // Direct internal access

  get _inner(): NapeInner { return this; }    // Backward compat

  constructor(...) {
    // Pool or create ZPP_Foo
    let zpp: ZPP_Foo;
    if (ZPP_Foo.zpp_pool == null) {
      zpp = new ZPP_Foo();
    } else {
      zpp = ZPP_Foo.zpp_pool;
      ZPP_Foo.zpp_pool = zpp.next;
      zpp.next = null;
    }
    this.zpp_inner = zpp;
    zpp.outer = this;
    // Validate + set properties (copy logic from compiled constructor)
  }

  static _wrap(inner: any): Foo {
    if (inner instanceof Foo) return inner;
    if (!inner) return null as unknown as Foo;
    if (inner instanceof ZPP_Foo) {
      return getOrCreate(inner, (zpp: ZPP_Foo) => {
        const f = Object.create(Foo.prototype) as Foo;
        f.zpp_inner = zpp;
        zpp.outer = f;
        return f;
      });
    }
    if (inner.zpp_inner) return Foo._wrap(inner.zpp_inner);  // legacy fallback
    return null as unknown as Foo;
  }

  // Getters/setters → read/write zpp_inner directly, with validation + invalidation
  // Methods → implement directly (no _inner delegation)
}

// Register _wrapFn callback (avoids circular import with ZPP_Foo)
ZPP_Foo._wrapFn = (zpp: ZPP_Foo): Foo => {
  return getOrCreate(zpp, (raw: ZPP_Foo) => {
    const f = Object.create(Foo.prototype) as Foo;
    f.zpp_inner = raw;
    raw.outer = f;
    return f;
  });
};

// Self-register in the compiled namespace
const nape = getNape();
nape.xxx.Foo = Foo;
Foo.prototype.__class__ = Foo;
```

### 4. Remove compiled code from nape-compiled.js

Remove the entire `nape.xxx.Foo = $hxClasses[...] = function(...)` block and all its
prototype assignments. Replace with a comment:

```js
// nape.xxx.Foo: converted to TypeScript → src/.../Foo.ts
// Registration handled by Foo.ts at module load time to avoid circular imports.
```

**Do NOT** add `import { Foo } from "../.../Foo"` to nape-compiled.js — this causes
circular imports because Foo.ts imports engine.ts → nape-compiled.js → Foo.ts.

### 5. Verify

- `_inner` getter returns `this` → compiled code accesses `foo.zpp_inner` ✓
- Other wrappers pass `foo._inner` to compiled code → gets `foo` (has `zpp_inner`) ✓
- `wrapper()` uses `_wrapFn` → returns our TypeScript class ✓
- All tests pass without modification

### Key gotchas

- **Circular imports**: Foo.ts imports engine.ts. engine.ts imports nape-compiled.js.
  nape-compiled.js must NOT import Foo.ts. Instead, Foo.ts self-registers at the bottom.
- **Init-time usage**: If compiled initialization code (lines ~121000+) creates instances
  of your class (e.g., `new nape.callbacks.CbType()` for singletons), you MUST keep a
  minimal constructor stub in the compiled code. The TS class replaces the stub at module
  load time, and existing instances need `Object.setPrototypeOf` fixup.
- **Runtime `instanceof` checks**: If internal code like `ZPP_OptionType.argument()` uses
  `val instanceof nape.callbacks.Foo`, you need a stub with the methods it calls
  (e.g., `including`, `excluding`) so it works before the TS module loads.
- **Already-modernized class imports**: When your TS class needs another already-modernized
  class (e.g., GeomPoly needs AABB), import the TS class directly (`import { AABB } from
  "./AABB"`) rather than using `getNape().geom.AABB`, which may not be registered yet.
- **Density conversion**: Material stores density internally as `value / 1000`.
  Public API shows `zpp_inner.density * 1000`. Watch for similar conversions.
- **NaN checks**: Use `value !== value` (the Haxe pattern for NaN detection).
- **Invalidation flags**: Each property may trigger different invalidation bitmasks.
  Copy the exact flags from the compiled setter code.
- **Pool management**: Always check `ZPP_Foo.zpp_pool` before `new ZPP_Foo()`.
- **Compiled list APIs**: Lists still in compiled code (e.g., `CbTypeList`, `GeomPolyList`)
  use `get_length()` not `.length`, and `CbTypeIterator.get(list)` for iteration.
