# nape-js

A fully typed TypeScript 2D physics engine — modernized rewrite of the original
[nape](https://napephys.com/) Haxe engine.

## Key Features

- **Pure TypeScript**, `strict: true`, zero DOM dependencies (runs on Node.js + browser)
- **Rigid body dynamics** — circles, convex polygons, compounds, static/dynamic/kinematic bodies
- **Constraint system** — PivotJoint, DistanceJoint, AngleJoint, MotorJoint, LineJoint, PulleyJoint, WeldJoint, UserConstraint
- **Collision detection** — broadphase (sweep-and-prune / dynamic AABB tree / spatial hash grid), narrowphase, CCD, raycasting, convex sweep
- **Callback system** — body/interaction/constraint listeners, pre-collision callbacks
- **Fluid simulation** — buoyancy and drag via fluid-enabled shapes (unique among JS engines)
- **Serialization** — JSON + binary for save/load/multiplayer rollback
- **Replay** — `Recorder` + `Player` with input-log recording, keyframe scrub, binary encode/decode (`@newkrok/nape-js/replay`)
- **Debug draw** — abstract `DebugDraw` interface, reference impls for Canvas/Three.js/PixiJS/p5.js
- **Character controller** — geometric collide-and-slide (`CharacterController` class)
- **~194 KB gzip** bundled (`dist/index.js` is a 27 KB re-export shim over the
  ~873 KB engine chunk — measure the bundled cost, not `index.js`). Note the eager
  `import "./core/bootstrap"` registers all 85 ZPP classes, so tree-shaking cannot
  drop unused engine code. TSDoc documented, 6191 engine tests + 73 pixi-adapter tests

## Repo Layout (npm workspaces)

```
packages/
  nape-js/        # @newkrok/nape-js — published physics engine (src/, tests/, dist/)
  nape-pixi/      # @newkrok/nape-pixi — PixiJS v8 integration
                  #   BodySpriteBinding, FixedStepper, PixiDebugDraw,
                  #   WorkerBridge + transform protocol. 0.1.0 ready to ship.
  create-nape-game/ # ON HOLD — scaffolder CLI implementation. `private: true`
                  #   so release.mjs/npm publish skip it. Code preserved
                  #   for future revival; do not advertise in docs/README.
templates/        # canonical runnable starters — clone or open in StackBlitz
  platformer/     # multi-renderer platformer starter (canvas2d/threejs/pixi)
benchmarks/       # cross-package perf suite
docs/             # GitHub Pages site + demos
scripts/          # repo-wide tooling
  ci/release.mjs  # independent per-package auto-release driver
```

Root `package.json` is a private workspaces manifest. Scripts fan out with
`npm run <x> --workspaces --if-present`. Each published package
(currently nape-js, nape-pixi) owns its own `package.json` and build
config. The `create-nape-game` workspace is `private: true` and parked.
The `templates/` tree is git-tracked; if/when the CLI is revived, its
`prepare`/`prepublishOnly` hook copies it into
`packages/create-nape-game/templates/` for the published tarball.

## Build & Test

```bash
npm run build        # tsup → packages/*/dist/ (both packages)
npm test             # vitest across both workspaces
npm run lint         # eslint across both workspaces
npm run format:check # prettier across both workspaces
```

## Pre-push Checklist

**Before every `git push`, always run all four:**

1. `npm run format:check` — must pass (Prettier code style, both packages)
2. `npm run lint` — must pass (ESLint, both packages)
3. `npm test` — all tests must pass (6191 + 73)
4. `npm run build` — DTS generation must succeed (catches type errors vitest misses)

## Release (per-package, auto)

Release is driven by `.github/workflows/release.yml` → `scripts/ci/release.mjs`.
On push to `master` with green CI, the script walks every public workspace and
independently decides whether to bump + tag + publish:

- A package releases only when commits since its **own** last tag touched
  files under `packages/<name>/`.
- Bump level comes from those commits' conventional prefixes
  (`feat:` / `fix:` / `refactor:` / `!:` / `BREAKING`).
- Tag format: `<short>-v<ver>` (e.g. `nape-js-v3.30.1`, `nape-pixi-v0.1.0`).
  Legacy `v*` tags on nape-js are accepted as a baseline for the first run.
- Skip-self-loop: commit subjects starting with `release` don't retrigger CI.

Use `node scripts/ci/release.mjs --dry-run` to preview what would publish.

## Architecture

```
Public API wrappers (packages/nape-js/src/{phys,shape,constraint,callbacks,dynamics,geom,space}/)
        ↕
Internal ZPP_* classes (packages/nape-js/src/native/)  — 85 classes
        ↕
Engine bootstrap (packages/nape-js/src/core/engine.ts → ZPPRegistry.ts + bootstrap.ts)
```

## Detailed Guides

| Guide        | Path                               | Content                                                                               |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------- |
| Architecture | `docs/guides/architecture.md`      | Internal patterns, registration flow, factory callbacks, `any` rules, ESM constraints |
| Roadmap      | `ROADMAP.md`                       | Priority table, status, competitive analysis, feature details                         |
| Testing      | `docs/guides/testing.md`           | Vitest config, test patterns, coverage metrics, best practices                        |
| Workflow     | `docs/guides/workflow.md`          | Build system, CI/CD, linting, commit conventions, doc update matrix, all scripts      |
| Multiplayer  | `docs/guides/multiplayer-guide.md` | Server-authoritative architecture, binary protocol, prediction, deployment            |
| Replay       | `docs/guides/replay-guide.md`      | `Recorder` / `Player` / `encodeReplay`, determinism contract, scrub, sizing           |
