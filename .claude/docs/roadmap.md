# nape-js — Roadmap & Priority History

## Priority Table

| Priority                              | Effort | Impact  | Risk   | Status            |
| ------------------------------------- | ------ | ------- | ------ | ----------------- |
| P21 — Drop `__class__` / `$hxClasses` | S      | medium  | low    | ✅ Done           |
| P22 — Minification                    | XS     | large   | none   | ✅ Done           |
| P23 — `__zpp` → direct imports        | M      | large   | medium | ✅ Done           |
| P24 — Namespace reduction             | S      | medium  | low    | ✅ Done           |
| P25 — `Any` → real types              | XL     | largest | medium | ✅ Done           |
| P26 — Tree shaking                    | L      | large   | high   | ✅ Done           |
| P27 — HaxeShims audit                 | S      | small   | low    | ✅ Done           |
| P28 — API ergonomics (28a+28b+28c)    | M      | DX      | low    | ✅ Done           |
| P29 — Test coverage ≥80%              | L      | safety  | none   | 🔶 ~54.3%+ (3228 tests, Step 7 pending) |
| P30 — TSDoc documentation             | L      | DX      | none   | ✅ Done           |
| P31 — API ergonomics additions        | M      | DX      | low    | ✅ Done           |
| P32 — Internal accessor cleanup       | S      | small   | low    | ✅ Done           |
| P33 — Benchmark CI                    | M      | medium  | low    | ✅ Done           |
| P34 — Granular tree shaking           | XL     | large   | high   | ❌ Cancelled      |
| P35 — Type system improvements        | S      | DX      | low    | ✅ Done           |
| P36 — Server-side + demo examples     | M      | medium  | low    | ⬜ Not started    |
| P37 — Serialization API               | L      | medium  | medium | ✅ Done           |
| P38 — Debug draw API                  | M      | DX      | low    | ✅ Done           |

---

## Active: P29 — Test Coverage ≥80%

Steps 1–6 done (+959 tests, 2269 → 3228). All previously crashing APIs are now fixed and tested.

**Current coverage: ~54.3% statements.**

**Remaining gaps (Step 7):**
- `ZPP_Collide` ~21%→improving, `ZPP_Broadphase` ~27%→improving, `ZPP_Ray` ~44%→improving
- `ZPP_Space` deeper paths ~57%, `ZPP_Body` ~73%
- Reaching ≥80% requires further ZPP native path tests (ZPP_Space, ZPP_Body deeper paths)

### Step history

**Step 5 (2026-03-11):** Added `ZPP_ColArbiter.test.ts` (+22 tests) and `ZPP_FluidArbiter.test.ts` (+14 tests), covering preStep/impulse/warm-start/pool/material paths.

**Step 6 (2026-03-11):** +110 tests across three files:
- `ZPP_Ray.test.ts` — full rewrite (~45 tests): constructor fields, invalidation callbacks,
  `validate_dir` normalisation, `rayAABB` all quadrants, `aabbtest`/`aabbsect`,
  `circlesect`/`polysect` via ZPP shapes, full `Space.rayCast`/`rayMultiCast` integration.
- `ZPP_Collide.test.ts` — +33 tests: `polyContains`, `shapeContains`, `bodyContains`,
  `containTest`, `testCollide_safe`, `flowCollide`, `contactCollide`.
- `ZPP_Broadphase.integration.test.ts` — 35 tests: body insert/remove, AABB sync,
  collision consistency, raycast for both algorithms.

---

## Planned: P36 — Server-side + Demo Examples

**Effort: M | Impact: medium | Risk: low**

The engine has no DOM dependencies and runs on Node.js already. Goals:

- Verify bundle is DOM-free (no `window`/`document` references)
- `/examples/server/` — Node.js script that runs a simulation and outputs positions
- `/examples/browser/` — canvas renderer + physics loop for web use
- CI job ensuring examples run on Node.js (regression protection)

---

## Completed Features (Reference)

### P37 — Serialization API

**Entry point:** `import { spaceToJSON, spaceFromJSON } from '@newkrok/nape-js/serialization'`

Serializes: Space config, all bodies (position, velocity, shapes, userData), all shapes
(circle/polygon, material, filters, fluid), all constraints except UserConstraint.
Not serialized: Arbiters (rebuilt), UserConstraint, broadphase tree state, isSleeping.

### P38 — Debug Draw API

Abstract debug-rendering interface (Box2D `b2Draw` pattern). Engine traverses internal
state and calls user-provided draw callbacks — no concrete renderer in core bundle.

Classes: `DebugDraw` (abstract), `DebugDrawFlags` bitmask, `Space.debugDraw(drawer, flags)`.

Reference implementations (in docs/examples): CanvasDebugDraw, ThreeDebugDraw,
PixiDebugDraw (highest priority — PixiJS is #1 2D renderer), P5DebugDraw.

---

## Cancelled: P34 — Granular Tree Shaking

**Decision (2026-03-10): Not worth pursuing.** Tree shaking is architecturally limited
because `bootstrap.ts` imports every class unconditionally. Competing engines behave the
same way. See `.claude/docs/architecture.md` for details.
