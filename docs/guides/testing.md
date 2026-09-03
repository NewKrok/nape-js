# nape-js — Testing Guide

## Framework & Configuration

**Framework:** Vitest 3.x with global test APIs (`describe`, `it`, `expect`, `beforeEach`, etc.)

Each workspace owns its own vitest config and test directory. `npm test`
at the repo root fans out to every package.

| Setting | nape-js | nape-pixi |
|---------|---------|-----------|
| Config file | `packages/nape-js/vitest.config.ts` | `packages/nape-pixi/vitest.config.ts` |
| Setup file | `packages/nape-js/tests/setup.ts` | — |
| Test timeout | 10 000 ms | 10 000 ms |
| Coverage provider | `@vitest/coverage-v8` | — |
| Environment | Node.js | Node.js |

The nape-js setup file imports `packages/nape-js/src/core/bootstrap.ts`
and all public API subclass modules — this mirrors the side-effect
imports that production code gets from `index.ts`. Without it, factory
callbacks and the `nape` namespace are not wired up. nape-pixi has no
setup file: all public API is pure and tests use structural stubs for
`PIXI.Container` / `Graphics` and for `Body` / `Space`.

---

## Commands

```bash
# Both packages at once, from repo root:
npm test                            # run all tests once (CI mode)

# Single workspace:
npm test -w @newkrok/nape-js        # engine suite only
npm test -w @newkrok/nape-pixi      # adapter suite only

# nape-js specifics (run from packages/nape-js):
npm run test:watch                  # watch mode (nape-js only)
npm test -- --coverage              # v8 coverage report
npm test -- tests/geom/Vec2.test.ts # single file
npm test -- --reporter=verbose      # verbose output
```

---

## Directory Structure

```
packages/nape-js/tests/
├── setup.ts               # bootstrap + subclass imports
├── callbacks/             # callback system (8 files)
├── constraint/            # joints & constraints (14 files)
├── core/                  # engine core (2 files)
├── dynamics/              # collision & arbiters (10 files)
├── geom/                  # geometry: Vec2, AABB, Mat23, Ray… (15 files)
├── helpers/               # CharacterController, createConcaveBody
├── misc/                  # coverage-focused edge-case tests
├── native/                # internal ZPP_* classes (85 files)
├── phys/                  # Body, Material, InteractionFilter… (15 files)
├── serialization/         # JSON + binary save/load round-trips
├── shape/                 # Circle, Polygon, Edge shapes
├── space/                 # Space simulation & integration (12 files)
└── util/                  # NapeList, Debug, iterators

packages/nape-pixi/tests/
├── BodySpriteBinding.test.ts
├── FixedStepper.test.ts
├── PixiDebugDraw.test.ts
├── WorkerBridge.test.ts
└── workerProtocol.test.ts
```

**6274 engine tests across 294 files, plus 73 pixi-adapter tests across 5 files.**

---

## Coverage

nape-js only — nape-pixi is new and the coverage target hasn't been
set yet.

| Metric | Current | Target (P29) |
|--------|---------|--------------|
| Statements | ~83% | ≥80% ✅ |
| Branches | ~73% | — |
| Functions | ~91% | — |

**High coverage modules:** `packages/nape-js/src/replay/` (98%), `packages/nape-js/src/worker/` (99%), `packages/nape-js/src/core/` (97%), `packages/nape-js/src/serialization/` (93%)
**Low coverage modules:** `packages/nape-js/src/native/space/` (81%), `packages/nape-js/src/native/geom/` (77%)

Note: the arbiter classes' dead solver-method duplicates (the live solver is
inlined inside `ZPP_Space.step`) were removed, and the Haxe-inline-expansion
shape-cache-validation boilerplate in `ZPP_Space` / `ZPP_Broadphase` /
`ZPP_Collide` / the broadphase implementations (structurally unreachable
polygon branches inside circle-only paths and vice versa) was deduplicated
into the canonical `ZPP_Shape.validate_*` / `ZPP_Body.validate_*` /
`ZPP_Polygon.validate_gaxi` helpers (issue #229) — statement coverage rose
~80% → ~83% for free as those unreachable lines disappeared.

---

## Test Patterns

### Unit test — single class/function

```typescript
describe("Vec2", () => {
  it("should compute length", () => {
    const v = new Vec2(3, 4);
    expect(v.length).toBeCloseTo(5.0);
  });
});
```

### Integration test — multi-body simulation

```typescript
function dynamicCircle(x: number, y: number, r = 10): Body {
  const b = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  b.shapes.add(new Circle(r));
  return b;
}

it("applies gravity over multiple steps", () => {
  const space = new Space(new Vec2(0, 100));
  const b = dynamicCircle(0, 0);
  b.space = space;

  for (let i = 0; i < 60; i++) space.step(1 / 60);

  expect(b.position.y).toBeGreaterThan(30);
});
```

### Coverage-focused test — targeting uncovered paths

Files suffixed `*.coverage.test.ts` or `*.extended.test.ts` explicitly exercise
edge cases to push statement coverage up.

### Helper class test — setup/teardown

```typescript
describe("CharacterController", () => {
  let space: Space;
  let player: Body;

  beforeEach(() => {
    space = new Space(new Vec2(0, 200));
    player = dynamicCircle(100, 100);
    player.space = space;
  });

  it("creates with default options", () => {
    const cc = new CharacterController(space, player);
    expect(cc.space).toBe(space);
    cc.destroy();
  });
});
```

---

## Best Practices

1. **Floating point** — always `toBeCloseTo()`, never exact `toBe()` for physics values.
2. **Pooled objects** — `Vec2.get()` / `Vec2.weak()` must be disposed after use.
3. **Helper cleanup** — call `.destroy()` on `CharacterController` and similar classes.
4. **Setup helpers** — extract `dynamicCircle()`, `staticBox()` etc. for readability.
5. **Multi-step simulation** — loop `space.step(1/60)` N times to test cumulative physics.
6. **Error paths** — use `expect(() => ...).toThrow()` for invalid operations (NaN, disposed, out of bounds).
7. **Arbiter count** — use `arbs.zpp_gl()` for count, not `.length` (undefined on TypedList).
