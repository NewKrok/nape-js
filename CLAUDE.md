# nape-js

A fully typed TypeScript 2D physics engine — modernized rewrite of the original
[nape](https://napephys.com/) Haxe engine.

## Key Features

- **Pure TypeScript**, `strict: true`, zero DOM dependencies (runs on Node.js + browser)
- **Rigid body dynamics** — circles, convex polygons, compounds, static/dynamic/kinematic bodies
- **Constraint system** — PivotJoint, DistanceJoint, AngleJoint, MotorJoint, LineJoint, PulleyJoint, WeldJoint, UserConstraint
- **Collision detection** — broadphase (sweep-and-prune / dynamic AABB tree), narrowphase, CCD, raycasting, convex sweep
- **Callback system** — body/interaction/constraint listeners, pre-collision callbacks
- **Fluid simulation** — buoyancy and drag via fluid-enabled shapes (unique among JS engines)
- **Serialization** — JSON (`spaceToJSON` / `spaceFromJSON`) + binary (`spaceToBinary` / `spaceFromBinary`) for save/load/multiplayer rollback
- **Debug draw** — abstract `DebugDraw` interface (Box2D pattern), reference impls for Canvas/Three.js/PixiJS/p5.js
- **~994 KB** minified ESM + CJS dual bundle, TSDoc documented, 3200+ tests

## Build & Test

```bash
npm run build        # tsup → dist/
npm test             # vitest
npm run lint         # eslint + prettier
```

## Pre-push Checklist

**Before every `git push`, always run all four:**

1. `npm run format:check` — must pass (Prettier code style)
2. `npm run lint` — must pass (catches unused vars, ESLint rules)
3. `npm test` — all tests must pass
4. `npm run build` — DTS generation must succeed (catches type errors vitest misses)

**Documentation to review** — when the PR changes features, APIs, priorities, or versions:

| File | What to update | When |
| ---- | -------------- | ---- |
| `CLAUDE.md` | Status table, test count, key features list | Priority status changes, new features |
| `.claude/docs/roadmap.md` | Priority table, detailed descriptions, competitive analysis | New/changed/completed priorities |
| `.claude/docs/architecture.md` | Internal patterns, registration flow, `any` rules | Architecture or bootstrap changes |
| `README.md` | Quick start, API tables, test count, badge versions | Public API changes, releases |
| `llms.txt` | Class list, links, quick start example | Public API additions/removals |
| `llms-full.txt` | Complete API reference, version number (line 1) | Any public API change, releases |
| `package.json` | `version` field | Releases |

## Architecture

```
Public API wrappers (src/{phys,shape,constraint,callbacks,dynamics,geom,space}/)
        ↕
Internal ZPP_* classes (src/native/)  — 85 classes
        ↕
Engine bootstrap (src/core/engine.ts → ZPPRegistry.ts + bootstrap.ts)
```

For detailed internal patterns (registration flow, factory callbacks, `any` rules,
iterator patterns, ESM constraints) see `.claude/docs/architecture.md`.

## Current Status

| What                     | Status |
| ------------------------ | ------ |
| Haxe modernization       | ✅ Complete — pure TypeScript, fully typed |
| Test coverage            | 🔶 ~57% statements (3486 tests), target ≥80% |
| Serialization API        | ✅ Done — `@newkrok/nape-js/serialization` |
| Binary snapshots         | ✅ Done — `spaceToBinary` / `spaceFromBinary` (P39) |
| Debug draw API           | ✅ Done — abstract `DebugDraw` + `Space.debugDraw()` |
| Server/demo examples     | ❌ Cancelled — P36 (no standalone value without hosting) |
| Haxe remnant cleanup     | ✅ Done — P40 (`__name__`/`__class__`/`__super__`/`_gthis`/`_init()`) |
| Capsule shape            | ✅ Done — P41 (`Capsule.create` / `Capsule.createVertical`) |
| Web Worker helper        | ⬜ Planned — P42 |
| Concave polygon helper   | ⬜ Planned — P43 |
| PixiJS integration       | ⬜ Planned — P44 |
| Character controller     | ⬜ Planned — P45 |
| Hot-path optimization    | ⬜ Planned — P46 |
| Deterministic mode       | ⬜ Planned — P48 (multiplayer) |
| ECS adapter              | ⬜ Planned — P49 |
| Spatial hash grid        | ⬜ Planned — P50 |
| Sub-stepping solver      | ⬜ Planned — P51 (long-term) |
| Multiplayer demo         | ✅ Done — P52 (Railway WebSocket, `docs/multiplayer.html` + `server/`) |
| Polygon-Polygon bug      | 🐛 P53 — dynamic Polygon bodies tunnel through static Polygon floors when ≥2 present |

Full roadmap with details, competitor analysis, and history: `.claude/docs/roadmap.md`
