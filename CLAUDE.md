# nape-js — Modernization Guide

## Project Overview

nape-js is a 2D physics engine ported from Haxe to JavaScript. The codebase is being
incrementally modernized: extracting code from a large compiled blob (`nape-compiled.js`,
~132k lines) into clean, typed TypeScript classes.

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

### Already extracted (ZPP_* to src/native/) — 24 classes

Callbacks: `ZPP_Callback`, `ZPP_CbType`, `ZPP_CbSet`, `ZPP_CbSetPair`, `ZPP_OptionType`
Dynamics:  `ZPP_InteractionFilter`, `ZPP_InteractionGroup`
Geometry:  `ZPP_Vec2`, `ZPP_Vec3`, `ZPP_AABB`, `ZPP_Mat23`, `ZPP_MatMN`, `ZPP_GeomPoly`,
           `ZPP_MarchSpan`, `ZPP_MarchPair`, `ZPP_CutVert`, `ZPP_CutInt`
Physics:   `ZPP_Material`, `ZPP_FluidProperties`
Utilities: `ZPP_Math`, `ZPP_Const`, `ZPP_ID`, `ZPP_Flags`, `ZPP_PubPool`

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

### Compiled code stubs

Some modernized classes require minimal stubs in `nape-compiled.js` because the compiled
initialization code or internal methods reference them before the TS module self-registers:

- **CbType**: Stub constructor needed for `ANY_BODY/ANY_SHAPE/ANY_COMPOUND/ANY_CONSTRAINT`
  singleton creation at init time (~line 121055). TS class retroactively fixes prototypes
  via `Object.setPrototypeOf` after self-registration.
- **OptionType**: Stub constructor + `including()`/`excluding()` needed for
  `ZPP_OptionType.argument()` which uses `instanceof nape.callbacks.OptionType`.

### Internal namespace exposure

`nape.__zpp = zpp_nape;` is added at the end of the compiled factory function to allow
TS classes (e.g., GeomPoly) to access internal compiled classes like `ZPP_GeomVert`,
`ZPP_Simple`, `ZPP_Monotone`, `ZPP_Convex`, etc.

### Next candidates for modernization

All ZPP_* classes with extracted internals now have modernized public APIs.
Next candidates require extracting their ZPP_* classes first:

| Candidate | Complexity | Notes |
|-----------|------------|-------|
| `Ray` | Medium | Geometry utility, needs ZPP_Ray extraction |
| `Geom` | High | Static distance/intersection utility, many internal dependencies |
| `GravMassMode` / `InertiaMode` / `MassMode` | Low | Simple enum-like classes using ZPP_Flags |
| `ArbiterType` | Low | Simple enum-like class using ZPP_Flags |

### Remaining in compiled code (~82 public API + ~80 internal ZPP classes)

Major categories:
- **Core engine**: `ZPP_Space`, `ZPP_Body`, `ZPP_Shape`, `ZPP_Broadphase`, collision detection
- **Constraints**: `ZPP_PivotJoint`, `ZPP_DistanceJoint`, `ZPP_AngleJoint`, etc.
- **Arbiters/Contacts**: `ZPP_Arbiter`, `ZPP_ColArbiter`, `ZPP_Contact`
- **Geometry algorithms**: `ZPP_Collide`, `ZPP_Convex`, `ZPP_Monotone`, `ZPP_Simple`
- **Lists/Iterators**: `ZNPList_*`, `ZNPNode_*`, `ZPP_Set_*`, `*Iterator`, `*List`

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
