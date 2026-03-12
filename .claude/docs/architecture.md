# nape-js — Internal Architecture Reference

## Layer Overview

```
Public API wrappers (src/{phys,shape,constraint,callbacks,dynamics,geom,space}/)
        ↕
Internal ZPP_* classes (src/native/)
        ↕
Engine bootstrap (src/core/engine.ts → ZPPRegistry.ts + bootstrap.ts)
```

- **85 ZPP\_\* internal classes** in `src/native/`
- **68 public API classes** in `src/` with direct `zpp_inner` access

---

## Registration Flow

- `src/core/bootstrap.ts` — single place for all `nape.xxx = Foo` assignments and
  `_createFn`/factory-callback wiring. Imported first from `index.ts` + `tests/setup.ts`.
- `src/native/util/ZPPRegistry.ts` (`registerZPPClasses`) — registers all 85 ZPP classes,
  initializes the `nape` namespace object, calls `_init()`/`_initStatics()`/`_initEnums()`.
- `src/native/util/ZNPRegistry.ts` (`registerZNPClasses`) — creates ZNPNode/ZNPList/ZPP_Set
  subclass pairs for each element type.
- `src/core/engine.ts` — lazy `getNape()` + `ensureEnumsReady()`.

## Factory Callback Pattern

ZPP → public API subclass instances:

- `ZPP_Callback`: `_createBodyCb`, `_createConCb`, `_createIntCb`, `_createPreCb`
- `ZPP_Arbiter`: `_createColArb`, `_createFluidArb`
- `ZPP_*Joint`: `_createFn` on each joint class

## ESM Circular Dependency Prevention

Subclasses using `extends` (Body, Circle, Polygon, all joints, callbacks, arbiters)
self-register from `index.ts` — they cannot be side-effect imported from `engine.ts` due
to ESM circular dependency (`class extends undefined` at init time).

## `ensureEnumsReady` Pattern

Uses `var` (not `let`) to avoid temporal dead zone. Called by each of the 6 enum classes
after self-registering; fires `_initEnums` once all 6 are ready.

## `any` Usage Rules in Native Files

- `outer`/`wrap`/`wrap_min`/`wrap_max` → always `any` (circular ESM prevention + Haxe pool disconnection)
- `_nape`/`_zpp` static namespace refs → always `any` (dynamic dispatch)
- `_wrapFn` callbacks → `((zpp: ZPP_Foo) => any) | null`
- User-facing `userData` → `Record<string, unknown> | null`
- Dynamic ZNPList/ZNPNode/ZPP_Set subclass fields → `any` (created at runtime)

## Iterator Loop Pattern

Manual ZPP iterator (Body.ts style):

```ts
const iter = arbList.iterator();
while (true) {
  iter.zpp_inner.zpp_inner.valmod();
  const length = iter.zpp_inner.zpp_gl();   // zpp_gl() is on TypedList (NapeListFactory)
  iter.zpp_critical = true;
  if (iter.zpp_i >= length) {
    iter.zpp_next = getNape().dynamics.ArbiterIterator.zpp_pool;
    getNape().dynamics.ArbiterIterator.zpp_pool = iter;
    iter.zpp_inner = null;
    break;
  }
  iter.zpp_critical = false;
  const item = iter.zpp_inner.at(iter.zpp_i++);
  // ... process item
}
```

`zpp_gl()` is defined on `TypedList.prototype` in `src/util/NapeListFactory.ts` — it computes
the validated length from `ZPP_PublicList.user_length`.

## Tree Shaking Constraints

Tree shaking is architecturally limited because `index.ts` always imports `bootstrap.ts`,
which imports every class unconditionally. The `sideEffects` config in `package.json` is
correct — `dist/index.js` and `dist/index.cjs` legitimately have side effects (bootstrap
runs nape namespace assignments, `_createFn` wiring, `_bindBodyWrapForInteractor`, etc.).
This is consistent with competing engines (Three.js, Planck.js, Matter.js).
