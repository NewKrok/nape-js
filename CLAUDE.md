# nape-js

A fully typed TypeScript 2D physics engine — modernized rewrite of the original
[nape](https://napephys.com/) Haxe engine.

## Key Features

- **Pure TypeScript**, `strict: true`, zero DOM dependencies (runs on Node.js + browser)
- **Rigid body dynamics** — circles, convex polygons, compounds, static/dynamic/kinematic bodies
- **Constraint system** — PivotJoint, DistanceJoint, AngleJoint, MotorJoint, LineJoint, PulleyJoint, WeldJoint, UserConstraint
- **Collision detection** — broadphase (sweep-and-prune / dynamic AABB tree), narrowphase, raycasting
- **Callback system** — body/interaction/constraint listeners, pre-collision callbacks
- **Fluid simulation** — buoyancy and drag via fluid-enabled shapes
- **Serialization** — `spaceToJSON` / `spaceFromJSON` for save/load/multiplayer sync
- **Debug draw** — abstract `DebugDraw` interface (Box2D pattern), reference impls for Canvas/Three.js/PixiJS/p5.js
- **~994 KB** minified ESM + CJS dual bundle, TSDoc documented, 3200+ tests

## Build & Test

```bash
npm run build        # tsup → dist/
npm test             # vitest
npm run lint         # eslint + prettier
```

## Pre-push Checklist

**Before every `git push`, always run all three:**

1. `npm run lint` — must pass (catches unused vars, formatting)
2. `npm test` — all tests must pass
3. `npm run build` — DTS generation must succeed (catches type errors vitest misses)

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

| What                | Status |
| ------------------- | ------ |
| Haxe modernization  | ✅ Complete — pure TypeScript, fully typed |
| Test coverage       | 🔶 ~54% statements (3228 tests), target ≥80% — [details](.claude/docs/roadmap.md) |
| Serialization API   | ✅ Done — `@newkrok/nape-js/serialization` |
| Debug draw API      | ✅ Done — abstract `DebugDraw` + `Space.debugDraw()` |
| Server/demo examples| ⬜ Planned — P36 |

Full priority table and history: `.claude/docs/roadmap.md`
