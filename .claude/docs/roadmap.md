# nape-js — Roadmap & Priority History

## Competitive Advantages

nape-js already leads in several areas vs Matter.js, Planck.js, and other pure-JS engines:

- **CCD** (continuous collision detection) — Matter.js lacks this entirely (#1 user complaint)
- **Fluid simulation** — buoyancy/drag unique among JS engines (only LiquidFun via WASM compares)
- **Per-interaction-type filtering** — separate group/mask for collision, sensor, fluid (more granular than Box2D)
- **Pixel-based units** — no meters-to-pixels conversion needed (Box2D pain point)
- **Full TypeScript** with `strict: true` — Matter.js relies on DefinitelyTyped
- **Serialization API** — save/load/replay/multiplayer sync
- **Debug draw API** — abstract interface, no renderer dependency in core

Key competitors to watch:
- **Phaser Box2D** (Dec 2024) — Box2D v3 port, 70KB, improved solver+CCD
- **Rapier** — WASM, cross-platform determinism, binary snapshots, but large bundle + async init
- **Matter.js** — largest community but no CCD, no TypeScript, slow development

---

## Priority Table

### Completed (P21–P39)

| Priority                              | Effort | Impact   | Status       |
| ------------------------------------- | ------ | -------- | ------------ |
| P21 — Drop `__class__` / `$hxClasses` | S      | medium   | ✅ Done      |
| P22 — Minification                    | XS     | large    | ✅ Done      |
| P23 — `__zpp` → direct imports        | M      | large    | ✅ Done      |
| P24 — Namespace reduction             | S      | medium   | ✅ Done      |
| P25 — `Any` → real types              | XL     | largest  | ✅ Done      |
| P26 — Tree shaking                    | L      | large    | ✅ Done      |
| P27 — HaxeShims audit                 | S      | small    | ✅ Done      |
| P28 — API ergonomics (28a+28b+28c)    | M      | DX       | ✅ Done      |
| P30 — TSDoc documentation             | L      | DX       | ✅ Done      |
| P31 — API ergonomics additions        | M      | DX       | ✅ Done      |
| P32 — Internal accessor cleanup       | S      | small    | ✅ Done      |
| P33 — Benchmark CI                    | M      | medium   | ✅ Done      |
| P34 — Granular tree shaking           | XL     | large    | ❌ Cancelled |
| P35 — Type system improvements        | S      | DX       | ✅ Done      |
| P37 — Serialization API               | L      | medium   | ✅ Done      |
| P38 — Debug draw API                  | M      | DX       | ✅ Done      |
| P39 — Binary serialization            | M      | critical | ✅ Done      |
| P40 — Haxe remnant cleanup             | M      | medium   | ✅ Done      |
| P41 — Capsule shape                    | S      | medium   | ✅ Done      |

### Active & Planned

| Priority                                  | Effort | Impact   | Risk   | Status         |
| ----------------------------------------- | ------ | -------- | ------ | -------------- |
| P29 — Test coverage ≥80%                  | L      | safety   | none   | 🔶 ~54% (3251 tests) |
| P36 — Server-side + demo examples         | M      | medium   | low    | ❌ Cancelled   |
| P52 — Multiplayer demo                    | M      | adoption | low    | ✅ Done        |
| P42 — Web Worker helper                   | M      | perf/DX  | medium | ⬜ Not started |
| P43 — Concave polygon helper              | M      | high     | low    | ⬜ Not started |
| P44 — PixiJS integration package          | M      | adoption | low    | ⬜ Not started |
| P45 — Character controller                | M      | DX       | medium | ⬜ Not started |
| P46 — Hot-path optimization               | M      | perf     | low    | ⬜ Not started |
| P47 — CJS bundle dedup (serialization)    | S      | bundle   | low    | ⬜ Not started |
| P48 — Deterministic mode (soft)           | L      | critical | high   | ⬜ Not started |
| P49 — ECS adapter layer                   | M      | DX       | medium | ⬜ Not started |
| P50 — Spatial hash grid broadphase        | S-M    | perf     | low    | ⬜ Not started |
| P51 — Sub-stepping solver                 | XL     | stability| high   | ⬜ Not started |
| P53 — Polygon-Polygon narrowphase bug fix | M      | critical | high   | ⬜ Not started |

---

## Active: P29 — Test Coverage ≥80%

Steps 1–6 done (+959 tests, 2269 → 3228). All previously crashing APIs are now fixed and tested.

**Current coverage: ~54.3% statements.**

**Remaining gaps (Step 7):**
- `ZPP_Collide` ~21%, `ZPP_Broadphase` ~27%, `ZPP_Ray` ~44%
- `ZPP_Space` ~57%, `ZPP_Body` ~73%
- 40 native files have no dedicated test file, including `ZPP_Space.ts` (12,781 lines)

---

## Cancelled: P36 — Server-side + Demo Examples

**Decision: Cancelled.** A standalone Node.js script with CI has no demonstrable value
without hosting. Superseded by P52 which delivers a real hosted multiplayer demo.

---

## Done: P52 — Multiplayer Demo

**Effort: M | Impact: adoption | Risk: low**

A hosted, real-time multiplayer physics demo showcasing the engine to new users.

**Delivered:**
- `docs/multiplayer.html` — client page, linked from examples grid, GitHub "View source" link
- `server/index.js` — Railway-hosted Node.js WebSocket server, 60 Hz physics loop
- `railway.toml` — Railway deploy config
- Server-authoritative simulation (all physics server-side)
- Custom binary delta frame protocol — only changed bodies sent each tick (vs full state)
- Platformer scene: static walls/floor/ceiling, one-way platforms, scattered balls & boxes
- 5 hanging pendulums via `DistanceJoint` (soft spring, pushable)
- Player character: vertical `Capsule` shape (28×46px), WASD/arrow keys
- Ground detection via `space.arbiters` + `isSleeping` fallback
- Up to 8 players — 9th+ connection enters **spectator mode** (watches, no body)
- Player count indicator, ping display (server-side pong response)
- Player color badges, "you" indicator dot above own character
- Reconnect on disconnect (players only)

**Implementation guide:** See [`.claude/docs/multiplayer-guide.md`](./multiplayer-guide.md) for
server architecture recommendations, protocol design, interpolation, prediction,
determinism considerations, and scaling advice.

---

## Done: P39 — Binary Serialization (Uint8Array Snapshots)

**Effort: M | Impact: critical (multiplayer) | Risk: medium**

Compact binary snapshot format for sub-millisecond rollback netcode:

- `spaceToBinary(space): Uint8Array` — compact binary state snapshot (little-endian)
- `spaceFromBinary(data): Uint8Array` — fast restore
- `BINARY_SNAPSHOT_VERSION` — format version constant
- All exported from `@newkrok/nape-js/serialization` (same entry point as JSON API)

**Key differences from JSON serialization:**
- ~40–60% smaller payload than equivalent JSON
- No `userData` (arbitrary JSON cannot be efficiently binary-encoded)
- Same constraint/body coverage (UserConstraint skipped)
- Magic header `"NAPE"` + version guard for data integrity

**Remaining future work (separate priorities):**
- Delta encoding for network sync (only send changed bodies) — future priority
- P48 — Deterministic mode for cross-platform multiplayer

**Use cases:** rollback netcode, client-side prediction, fast save/load, replay recording.

---

## Done: P40 — Haxe Remnant Cleanup

**Effort: M | Impact: medium (bundle, perf, code quality) | Risk: low**

Removed all remaining Haxe compilation artifacts from the codebase:

- `__name__` static arrays — removed from 151 files (166 occurrences)
- `__class__` instance fields — removed from 15 files, plus filter conditions in prototype-copy code
- `__super__` static fields — removed from 24+ files (30 occurrences), including bootstrap.ts assignments
- Prototype-copy `_init()` — DynAABBPhase & SweepPhase now use proper `extends ZPP_Broadphase`
- `const _gthis = this` — replaced with direct `this` in 4 ZPP_Space.ts methods
- `__name__` copies in ZPPRegistry.ts — removed 9 registry propagation lines
- Test cleanup — removed 103 Haxe metadata tests (3354 → 3251 tests)

---

## Done: P41 — Capsule Shape

**Effort: S | Impact: medium | Risk: low**

Convenience `Capsule` class that builds a Body from two Circle end-caps + a rectangular
Polygon middle section. Commonly needed for character controllers and rounded obstacles.

- `Capsule.create(width, height, material?, filter?)` — horizontal capsule
- `Capsule.createVertical(width, height, material?, filter?)` — vertical capsule
- Exported from `@newkrok/nape-js` main entry point
- Interactive demo: `examples/capsule-demo.html`
- 26 tests covering creation, validation, material/filter propagation, physics integration

---

## Planned: P42 — Web Worker Helper

**Effort: M | Impact: perf/DX | Risk: medium**

Run physics simulation off the main thread using Web Workers + SharedArrayBuffer:

- Flat transform buffer layout: `[x0, y0, rot0, x1, y1, rot1, ...]`
- Main thread reads transforms for rendering at any framerate
- Physics runs at fixed timestep in worker (e.g., 60 Hz)
- Reference: p2-es/use-p2 pattern, SharedArrayBuffer + Atomics
- Requires COOP/COEP headers (Spectre mitigation)

---

## Planned: P43 — Concave Polygon Helper

**Effort: M | Impact: high (user demand) | Risk: low**

Convenience API for creating bodies from concave polygon vertices. The engine already has
`GeomPoly.convexDecomposition()` — this wraps it into a user-friendly API:

- `Body.fromConcavePolygon(vertices, material?)` — auto-decomposes into convex shapes
- Handles winding order normalization, simplification, validation
- Addresses #1 pain point in Matter.js (fragile external `poly-decomp.js` dependency)

---

## Planned: P44 — PixiJS Integration Package

**Effort: M | Impact: adoption | Risk: low**

PixiJS (~46.6k stars, ~403k npm/week) is the #1 pure 2D renderer and the most natural
pairing for an external physics engine. Package: `@newkrok/nape-pixi`

- Auto-sync body transforms → PixiJS DisplayObject transforms
- Debug draw implementation using PixiJS Graphics API
- Example scenes with common game patterns (platformer, top-down, etc.)

---

## Planned: P45 — Character Controller

**Effort: M | Impact: DX | Risk: medium**

Geometric character controller (Box2D v3.1 pattern) separate from the physics world:

- Ground detection, slope handling, step climbing
- One-way platform support (builds on existing PreListener pattern)
- Moving platform support via kinematic body tracking
- Common in platformers — currently requires manual implementation

---

## Planned: P46 — Hot-path Optimization

**Effort: M | Impact: perf | Risk: low**

Performance improvements identified in the codebase:

- Deduplicate body invalidation loops in `step()` (~90 lines of copy-paste)
- Extract inlined linked-list operations in `prestep()` (3×50 lines repeated)
- Fix pool bypass: several `new ZPP_Vec2()` / `new ZPP_AABB()` in hot paths should use pools
- Optimize `DynAABBPhase.__remove`: O(n) linear scan of syncs/moves/pairs lists
- Reduce 300+ `any` annotations in hot-path files for better V8 optimization

---

## Planned: P47 — CJS Bundle Dedup

**Effort: S | Impact: bundle size | Risk: low**

The serialization CJS bundle duplicates the entire engine (902 KB). The ESM version
correctly code-splits (8.2 KB). Fix via tsup config: `splitting`, `treeshake`, `target: es2020`.

---

## Planned: P48 — Deterministic Mode (Soft)

**Effort: L | Impact: critical (multiplayer) | Risk: high**

Same-platform deterministic simulation (identical results on same browser/OS):

- Already has `sortContacts: true` as a foundation
- Audit all non-deterministic code paths (hash iteration, floating-point ordering)
- Ensure fixed timestep produces identical results across runs
- Document limitations vs cross-platform determinism (which requires WASM/fixed-point)

Note: True cross-platform bit-level determinism (like Rapier) is impractical in pure JS
due to IEEE 754 implementation differences. "Soft determinism" (same platform = same results)
is the achievable goal and sufficient for most multiplayer patterns.

---

## Planned: P49 — ECS Adapter Layer

**Effort: M | Impact: DX | Risk: medium**

Optional adapter for Entity Component System frameworks (bitECS, miniplex, Becsy):

- Physics components (position, velocity, mass) as flat typed arrays
- System that syncs ECS components ↔ nape-js Body objects each frame
- Enables better cache locality and easier serialization
- Growing trend in JS game development — no physics engine currently offers this

---

## Planned: P50 — Spatial Hash Grid Broadphase

**Effort: S-M | Impact: perf (niche) | Risk: low**

Third broadphase algorithm option for dense, uniform-object scenes:

- O(1) expected lookup for nearby objects
- Best for: particle simulations, many same-sized objects, bounded worlds
- Complements existing SAP (good for few moving objects) and AABB tree (general purpose)
- Not useful for variable-size objects or sparse worlds

---

## Planned: P51 — Sub-stepping Solver

**Effort: XL | Impact: stability | Risk: high**

Box2D v3's "Soft Step" solver approach: soft constraints + sub-stepping for better stability:

- Handles higher mass ratios without jitter
- More stable long body chains and stacks
- Better convergence for complex constraint networks
- Major architectural change — requires careful testing and benchmarking
- Long-term goal, depends on P46 (hot-path optimization) as prerequisite

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

---

## Known Bug: P53 — Polygon-Polygon Narrowphase Collision Failure

**Discovered (2026-03-13):** When multiple `Polygon` dynamic bodies coexist in the same space
(even without touching), their floor collision detection fails — bodies tunnel through static
`Polygon` floors. Circle-Polygon collisions work correctly; only Polygon-Polygon is affected.

**Reproduction:**
- Create a space with 4 static walls + at least 2 dynamic `Polygon.box(...)` bodies
- The Polygon bodies fall through the static Polygon floor despite `isBullet = true`
- Single Polygon in isolation works fine; second Polygon body triggers the bug

**Root cause:** Likely a narrowphase SAT solver issue when multiple Polygon-Polygon pairs are
registered simultaneously in the broadphase/narrowphase pipeline.

**Workaround (demos):** Use `Circle` physics shapes for objects that need to settle on floors,
or use `Polygon` bodies only in joint-constrained (non-free-falling) scenarios.

**Scope:** Does NOT affect Circle-Polygon, Circle-Circle, or Capsule-Polygon collisions.
