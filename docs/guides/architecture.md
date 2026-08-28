# nape-js — Internal Architecture Reference

## Layer Overview

```
Public API wrappers (packages/nape-js/src/{phys,shape,constraint,callbacks,dynamics,geom,space}/)
        ↕
Internal ZPP_* classes (packages/nape-js/src/native/)
        ↕
Engine bootstrap (packages/nape-js/src/core/engine.ts → ZPPRegistry.ts + bootstrap.ts)
```

- **85 ZPP\_\* internal classes** in `packages/nape-js/src/native/`
- **68 public API classes** in `packages/nape-js/src/` with direct `zpp_inner` access

---

## Registration Flow

- `packages/nape-js/src/core/engine.ts` — lazy `getNape()` returns a bare namespace
  *skeleton* and imports nothing, so importing a single engine module from `src/`
  no longer drags the whole class graph in.
- `packages/nape-js/src/core/bootstrap.ts` — single place for all `nape.xxx = Foo`
  assignments and `_createFn`/factory-callback wiring. It invokes
  `registerZPPClasses(nape)` first. Imported first from `packages/nape-js/src/index.ts`
  and `packages/nape-js/tests/setup.ts`.
- `packages/nape-js/src/native/util/ZPPRegistry.ts` (`registerZPPClasses`) — fills the
  skeleton with all ZPP classes in place (idempotent), calls `_init()`/`_initStatics()`.
- `packages/nape-js/src/native/util/ZNPRegistry.ts` — the 78 ZNPNode/ZNPList/ZPP_Set
  subclasses are real exported classes (each with its own static pool); engine code
  imports them directly. `registerZNPClasses` only aliases them into the namespace.
- Enum singletons (`BodyType.STATIC`, `CbEvent.BEGIN`, `CbType.ANY_*`, ...) are created
  lazily by their public getters — there is no init barrier.

## Factory Callback Pattern

ZPP → public API subclass instances:

- `ZPP_Callback`: `_createBodyCb`, `_createConCb`, `_createIntCb`, `_createPreCb`
- `ZPP_Arbiter`: `_createColArb`, `_createFluidArb`
- `ZPP_*Joint`: `_createFn` on each joint class

## ESM Circular Dependency Prevention

Subclasses using `extends` (Body, Circle, Polygon, all joints, callbacks, arbiters)
self-register from `index.ts` — they cannot be side-effect imported from `engine.ts` due
to ESM circular dependency (`class extends undefined` at init time).

## `any` Usage Rules in Native Files

- `outer`/`wrap`/`wrap_min`/`wrap_max` → always `any` (circular ESM prevention + Haxe pool disconnection)
- `_nape`/`_zpp` static namespace refs → always `any` (dynamic dispatch)
- `_wrapFn` callbacks → `((zpp: ZPP_Foo) => any) | null`
- User-facing `userData` → `Record<string, unknown> | null`
- ZNPList/ZNPNode/ZPP_Set element typing → `any` (heterogeneous element types share the generic classes)

## Iterator Loop Pattern

Manual ZPP iterator (Body.ts style):

```ts
const iter = arbList.iterator();
while (true) {
  iter.zpp_inner.zpp_inner.valmod();
  const length = iter.zpp_inner.zpp_gl();   // zpp_gl() is on TypedList (NapeListFactory)
  iter.zpp_critical = true;
  if (iter.zpp_i >= length) {
    iter.zpp_next = ArbiterIterator.zpp_pool; // imported from util/registerLists
    ArbiterIterator.zpp_pool = iter;
    iter.zpp_inner = null;
    break;
  }
  iter.zpp_critical = false;
  const item = iter.zpp_inner.at(iter.zpp_i++);
  // ... process item
}
```

`zpp_gl()` is defined on `TypedList.prototype` in `packages/nape-js/src/util/NapeListFactory.ts` — it computes
the validated length from `ZPP_PublicList.user_length`.

## Tree Shaking

The *source* module graph is tree-shakeable: `engine.ts` imports nothing, so importing a
single class from `src/` costs only its own subgraph (measured: `Vec2` alone bundles to
~13 KB raw / 3 KB gzip). The *published main entry* stays eager — `index.ts` always
imports `bootstrap.ts`, which imports every class unconditionally, so `dist/` consumers
get the full engine. The `sideEffects` config in `package.json` lists every
self-registering module plus all `dist` chunks — keep it in sync when adding
module-scope registration.
