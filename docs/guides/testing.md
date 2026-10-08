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
npm run coverage                    # full v8 report + threshold check
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
├── core/                  # engine core, public API surface snapshot
├── dynamics/              # collision & arbiters (10 files)
├── geom/                  # geometry: Vec2, AABB, Mat23, Ray… (15 files)
├── helpers/               # CharacterController, createConcaveBody
├── integration/           # cross-system scenarios; golden/ + __goldens__/ (refactor safety net)
├── misc/                  # coverage-focused edge-case tests
├── native/                # internal ZPP_* classes (85 files)
├── phys/                  # Body, Material, InteractionFilter… (15 files)
├── serialization/         # JSON + binary save/load round-trips
├── shape/                 # Circle, Polygon, Edge shapes
├── space/                 # Space simulation & integration (12 files)
└── util/                  # Debug, list factory, iterators

packages/nape-pixi/tests/
├── BodySpriteBinding.test.ts
├── FixedStepper.test.ts
├── PixiDebugDraw.test.ts
├── WorkerBridge.test.ts
└── workerProtocol.test.ts
```

**7694 engine tests across 363 files, plus 79 pixi-adapter tests across 6 files.**

---

## Coverage

nape-js only — nape-pixi is new and the coverage target hasn't been
set yet.

| Metric | Current | Enforced floor | Target (P29) |
|--------|---------|----------------|--------------|
| Statements | ~96.1% | 95.9% | ≥80% ✅ |
| Branches | ~89.8% | 89.5% | — |
| Functions | ~98% | 98% | — |
| Lines | ~96.4% | 96.1% | — |

The floors are `coverage.thresholds` in `packages/nape-js/vitest.config.ts`:
`npm run coverage` (the CI **Coverage** job) fails when the full suite drops
below them. They sit ~0.25 pt under the measured numbers — raise them in the
same PR when coverage goes up. A coverage run over a *subset* of tests always
misses them; add `--coverage.thresholds.statements=0 --coverage.thresholds.branches=0
--coverage.thresholds.functions=0 --coverage.thresholds.lines=0` (or ignore the
exit code) when you only want the per-file report.

**100% is not a goal.** v8 counts every `&&` / `||` / `?:` / implicit `else`
as a branch, and much of what remains is structurally unreachable (guards on
values a caller has already checked), object-pool "pool empty vs. not" pairs,
singular-matrix fallbacks in the solvers, or sweep-comparator tie-breaks.
Prefer deleting Haxe-inline residue (provably dead branches) and writing
behavioural tests with an independent oracle over chasing the number.

**High coverage modules:** `packages/nape-js/src/native/callbacks/` (100%), `packages/nape-js/src/native/util/` (99%), `packages/nape-js/src/worker/` (99%), `packages/nape-js/src/core/` (99%), `packages/nape-js/src/callbacks/` (99%), `packages/nape-js/src/replay/` (98%)
**Low coverage modules:** `packages/nape-js/src/profiler/` (85%), `packages/nape-js/src/dynamics/` (93%), `packages/nape-js/src/space/` (93%), `packages/nape-js/src/shape/` (93%)

Note: the arbiter classes' dead solver-method duplicates (the live solver is
inlined inside `ZPP_Space.step`) were removed, and the Haxe-inline-expansion
shape-cache-validation boilerplate in `ZPP_Space` / `ZPP_Broadphase` /
`ZPP_Collide` / the broadphase implementations (structurally unreachable
polygon branches inside circle-only paths and vice versa) was deduplicated
into the canonical `ZPP_Shape.validate_*` / `ZPP_Body.validate_*` /
`ZPP_Polygon.validate_gaxi` helpers (issue #229) — statement coverage rose
~80% → ~83% for free as those unreachable lines disappeared.

The 16 Haxe-inlined copies of the public `Vec2` pool allocator were replaced
by `Vec2.get()`: every pool-return site detaches `zpp_inner`, so their
"pooled wrapper with a live inner" branch (disposed / immutable / validate
callbacks) was unreachable. Tests that forged such impossible pool states were
dropped along with it.

A later audit classified every never-executed function by its call sites
(not by coverage alone — several "uncovered" methods were reachable test
gaps): zero-caller no-op pool stubs and helpers were removed, and inlined
copies of `ZPP_ColArbiter.free()` / `validate_props()`,
`ZPP_Body.sweepIntegrate()` and the broadphase `__sync` were replaced by
calls to the canonical methods.

### Interaction-type and pre-listener paths

`ZPP_Space.narrowPhase` used to carry three near-identical inlined blocks
(fluid, collision, sensor), and a fix or test covering one said nothing about
the others: an impure `PreListener` did not keep a resting body awake when the
arbiter's `b1` was the static body, in the fluid and collision copies only
(`callbacks/PreListener.impureWake`). The shared logic now lives in
`runPreListeners` / `retireArbiter` / `ZPP_ColArbiter.cleanupContacts`, but
tests for this area still run each scenario across all three interaction
types. `dynamics/InteractionTypeSwitch` covers switching `sensorEnabled` /
`fluidEnabled` while two shapes are in contact.

### Oracle-based geometry tests

The geometry and query suites added alongside that audit check results
against an independent computation instead of counts or "does not throw":

| Suite | Oracle |
|-------|--------|
| `geom/GeomPoly.simpleDecomposition` | pieces disjoint and covering exactly the even-odd region (point sampling) |
| `geom/GeomPoly.decompositions.weaklySimple` | monotone / convex / triangular pieces cover the input region, each of the promised shape |
| `geom/GeomPoly.simplify.forced` | Ramer–Douglas–Peucker contract; forced vertices survive |
| `geom/MarchingSquares.saddle` | ambiguous-cell topology, sampled iso area; weak simplicity of combined output |
| `geom/ZPP_Collide.flowOverlap` | fluid overlap / centroid vs Sutherland–Hodgman, lens and strip closed forms |
| `space/Space.convexCast.oracle` | time of impact vs closed-form moving circles, bisection, spinning-bar angle |
| `geom/GeomPoly.cut.oracle` | area sum, disjoint cover, one side of the line; exact degeneracies via integer grids |

Prefer this pattern for new geometry tests: the oracles found six real
bugs that count-based tests had missed, and the cut oracle three more once it
used exact degeneracies (vertices on the line, edges along it). Random
floating-point inputs almost never hit those — build them on an integer grid.
Sampling alone can miss thin slivers, so pair it with an exact check (e.g.
total area) where one exists.

---

## Refactor Safety Net (golden behaviour tests)

Coverage says which lines ran, not whether a rewrite still behaves the same.
Before refactoring or optimising engine internals, these suites pin the
observable behaviour:

| Suite | Pins |
|-------|------|
| `integration/Behaviour.golden` | one scenario per subsystem (`integration/golden/scenarios.ts`): free flight, forces, mass properties, restitution, friction, resting contacts, every shape pair, multi-shape bodies, sensors, fluids, filters / groups, interaction-type switches, pre-listeners, ONGOING + precedence, sleep / wake, every joint type, breaking, UserConstraint, kinematics / surfaceVel, compounds, all three broadphases, CCD, sub-stepping, mid-step mutation, every space query, CharacterController + tilemap, RadialGravityField, serialization continuation |
| `integration/Determinism.golden` | the original six pile / chain / CCD / sleep snapshots |
| `core/PublicApi.surface` | every runtime export of the five entry points, and each public class's static / prototype members with their kind (internal `_foo` / `zpp_*` members excluded) |

A behaviour scenario records sampled body states, the full callback log
(collision / sensor / fluid BEGIN-END, body and constraint WAKE / SLEEP /
BREAK) and probes (contact points and impulses, joint impulses, query results,
mass data). It is checked in three tiers:

1. **Exact** — bit-identical to `__goldens__/behaviour.golden.json`. Any
   observable change fails, down to one ULP or a callback moving one step.
   Platform-pinned (Math.sin/cos differ in the last bit across V8 builds): it
   runs only on the recording platform, CI's linux-x64.
2. **Tolerance** — scenarios marked `stable` (not chaotic) are also compared
   within 1e-6 relative, on every platform. When an optimisation deliberately
   changes floating-point rounding (reordered arithmetic, cached terms), tier
   1 fails everywhere; tier 2 tells you whether the physics is unchanged. A
   guard test perturbs `dt` by 1e-12 to keep the `stable` flags honest.
   Chaotic scenarios (piles, shape-pair drops) amplify rounding, so for them
   only tier 1 applies — review their diff by eye.
3. **Run-to-run** — two runs in one process are bit-identical.

Failures name the step, body label and field, e.g.
`samples @step 30, body "raft".vy: 180.567 !== golden 180.522`.

**Workflow during a refactor:** keep tier 1 green for pure restructuring. If a
change is meant to alter rounding only, check tier 2 and the event logs, then
regenerate. If it is meant to change behaviour, regenerate and review the
golden diff in the PR. Regenerate on CI's platform with
`gh workflow run regen-goldens.yml --ref <branch>` (records both golden
files and commits them), or locally on linux-x64 with node 22:
`UPDATE_GOLDENS=1 npx vitest run tests/integration/Behaviour.golden.test.ts`.
The API surface file is platform independent:
`UPDATE_GOLDENS=1 npx vitest run tests/core/PublicApi.surface.test.ts`.

Add a scenario when you add a subsystem: label every tracked body
(`t.body(b, "name")`), keep construction seeded, and measure whether it is
`stable` (the guard test will tell you).

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

Files suffixed `*.coverage.test.ts`, `*.extended.test.ts` or `*.cov.test.ts`
explicitly exercise edge cases to push coverage up. The `*.cov.test.ts` files
check results against an independent oracle (brute-force queries, analytic
ray hits, exact areas, array models of the lists) rather than just executing
lines. Known engine limitations they found are pinned with `it.fails` and a
comment explaining the expected behaviour — flip one to `it` when fixing it.

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
