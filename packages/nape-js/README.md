<p align="center">
  <img src="https://raw.githubusercontent.com/NewKrok/nape-js/master/docs/logo.svg" alt="nape-js logo" width="80" />
</p>

# @newkrok/nape-js

[![npm version](https://img.shields.io/npm/v/@newkrok/nape-js.svg)](https://www.npmjs.com/package/@newkrok/nape-js)
[![npm downloads](https://img.shields.io/npm/dm/@newkrok/nape-js.svg)](https://www.npmjs.com/package/@newkrok/nape-js)
[![jsDelivr hits](https://img.shields.io/jsdelivr/npm/hm/@newkrok/nape-js.svg)](https://www.jsdelivr.com/package/npm/@newkrok/nape-js)
[![CI](https://github.com/NewKrok/nape-js/actions/workflows/ci.yml/badge.svg)](https://github.com/NewKrok/nape-js/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/NewKrok/nape-js/graph/badge.svg?flag=nape-js)](https://codecov.io/gh/NewKrok/nape-js)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@newkrok/nape-js.svg?label=gzip)](https://bundlephobia.com/package/@newkrok/nape-js)
[![license](https://img.shields.io/npm/l/@newkrok/nape-js.svg)](https://github.com/NewKrok/nape-js/blob/master/LICENSE)
[![docs](https://img.shields.io/badge/docs-online-blue.svg)](https://napejs.org/)

Fully typed 2D physics engine — a modern TypeScript rewrite of the
[Nape](https://github.com/deltaluca/nape) Haxe physics engine.

This is the **actively maintained successor** to the original Nape. The Haxe
engine has been unmaintained since 2022; nape-js carries the same simulation
model forward as pure TypeScript — no dependencies, no build step, works in
Node.js and every browser.

**[Homepage & Interactive Demos](https://napejs.org/)** | **[API Reference](https://napejs.org/api/)** | **[Examples](https://napejs.org/examples)** | **[Multiplayer Demo](https://napejs.org/multiplayer.html)**

**[Cookbook](https://github.com/NewKrok/nape-js/blob/master/docs/guides/cookbook.md)** | **[Troubleshooting](https://github.com/NewKrok/nape-js/blob/master/docs/guides/troubleshooting.md)** | **[Anti-Patterns](https://github.com/NewKrok/nape-js/blob/master/docs/guides/anti-patterns.md)**

- Originally created in Haxe by Luca Deltodesco
- Ported to TypeScript by Istvan Krisztian Somoracz

## Installation

```bash
npm install @newkrok/nape-js
# optional: PixiJS v8 integration
npm install @newkrok/nape-pixi pixi.js
```

## Quick Start

```typescript
import { Space, Body, BodyType, Vec2, Circle, Polygon } from "@newkrok/nape-js";

// Create a physics world with downward gravity
const space = new Space(new Vec2(0, 600));

// Static floor
const floor = new Body(BodyType.STATIC, new Vec2(400, 550));
floor.shapes.add(new Polygon(Polygon.box(800, 20)));
floor.space = space;

// Dynamic box
const box = new Body(BodyType.DYNAMIC, new Vec2(400, 100));
box.shapes.add(new Polygon(Polygon.box(40, 40)));
box.space = space;

// Dynamic circle
const ball = new Body(BodyType.DYNAMIC, new Vec2(420, 50));
ball.shapes.add(new Circle(20));
ball.space = space;

// Game loop
function update() {
  space.step(1 / 60);

  for (const body of space.bodies) {
    console.log(`x=${body.position.x.toFixed(1)} y=${body.position.y.toFixed(1)}`);
  }
}
```

## API Reference

> Full API documentation: [TypeDoc Reference](https://napejs.org/api/)

### Core Classes

| Class   | Description                                                                               |
| ------- | ----------------------------------------------------------------------------------------- |
| `Space` | Physics world — add bodies, step simulation, `deterministic` mode for rollback/prediction |
| `Body`  | Rigid body with position, velocity, mass                                                  |
| `Vec2`  | 2D vector — pooling, `clone()`, `equals()`, `lerp()`, `fromAngle()`                       |
| `Vec3`  | 3D vector for constraint impulses — `clone()`, `equals()`                                 |
| `AABB`  | Axis-aligned bounding box — `clone()`, `equals()`, `fromPoints()`                         |
| `Mat23` | 2×3 affine matrix — `clone()`, `equals()`, transform, inverse                             |
| `Ray`   | Raycasting — `clone()`, `fromSegment()`, spatial queries                                  |

### Shapes

| Class     | Description                                                                  |
| --------- | ---------------------------------------------------------------------------- |
| `Circle`  | Circular shape                                                               |
| `Polygon` | Convex polygon (with `Polygon.box()`, `Polygon.rect()`, `Polygon.regular()`) |
| `Capsule` | Capsule shape (`Capsule.create()`, `Capsule.createVertical()`)               |
| `Shape`   | Base class with material, filter, sensor support                             |

### Physics Properties

| Class               | Description                               |
| ------------------- | ----------------------------------------- |
| `Material`          | Elasticity, friction, density             |
| `BodyType`          | `STATIC`, `DYNAMIC`, `KINEMATIC`          |
| `InteractionFilter` | Bit-mask collision/sensor/fluid filtering |
| `FluidProperties`   | Density, viscosity for fluid shapes       |

### Constraints

| Class           | Description                        |
| --------------- | ---------------------------------- |
| `PivotJoint`    | Pin two bodies at a shared point   |
| `DistanceJoint` | Constrain distance between anchors |
| `WeldJoint`     | Fix relative position and angle    |
| `AngleJoint`    | Constrain relative angle           |
| `MotorJoint`    | Apply angular velocity             |
| `LineJoint`     | Slide along a line                 |
| `PulleyJoint`   | Constrain combined distances       |

### Callbacks

| Class                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `InteractionListener` | Collision/sensor/fluid events                       |
| `BodyListener`        | Body wake/sleep events                              |
| `ConstraintListener`  | Constraint events                                   |
| `PreListener`         | Pre-collision filtering                             |
| `CbType`              | Tag interactors for filtering                       |
| `CbEvent`             | `BEGIN`, `ONGOING`, `END`, `WAKE`, `SLEEP`, `BREAK` |

### Utilities

| Class         | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| `NapeList<T>` | Iterable list with `for...of` support                                  |
| `MatMN`       | Variable-sized M×N matrix — `clone()`, `equals()`, multiply, transpose |
| `VERSION`     | Engine version string; also queryable from the console as `__NAPE_JS__` after any import (three.js-style) |

### Helpers

Higher-level building blocks layered on top of the engine — opt-in modules.

| Helper                                           | Description                                                                                                                                                                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CharacterController`                            | Velocity-based 2D platformer controller — ground / slope / wall raycasts, coyote-time, one-way platforms, moving-platform inheritance, runtime-mutable `down` for radial-gravity worlds                                                                  |
| `RadialGravityField` / `RadialGravityFieldGroup` | Point-source gravity well — `inverse-square` / `inverse` / `constant` / custom falloff, `maxRadius` / `softening`, body filter, mass scaling. Replaces hand-rolled `body.force = ...` loops                                                              |
| `ParticleEmitter` / `ParticleEmitterGroup`       | Physics-aware particle emitter — pooled bodies, continuous / periodic / manual spawning, configurable spawn / velocity patterns, deterministic RNG, lifecycle hooks (`onSpawn` / `onUpdate` / `onDeath` / `onCollide`), self-excluding filter generation |
| `buildTilemapBody` / `meshTilemap`               | Greedy-meshed collision body from a 2D tile grid. 5–50× fewer shapes than one-polygon-per-cell. Includes `tiledLayerToGrid` and `ldtkLayerToGrid` parsers                                                                                                |
| `TriggerZone`                                    | Sensor zone with `onEnter` / `onStay` / `onExit` callbacks — wraps the BEGIN/ONGOING/END `InteractionListener` plumbing                                                                                                                                  |
| `fractureBody`                                   | Voronoi-based polygon shatter — `fragmentCount`, `explosionImpulse`, deterministic via `random`                                                                                                                                                          |
| `createConcaveBody`                              | Decompose a concave outline into convex polygons and pack them into a single body                                                                                                                                                                        |

### Serialization

Full physics state snapshot/restore — suitable for save/load, replay, and multiplayer
server↔client synchronization.

```typescript
import "@newkrok/nape-js";
import { spaceToJSON, spaceFromJSON } from "@newkrok/nape-js/serialization";

// Serialize
const snapshot = spaceToJSON(space);
const json = JSON.stringify(snapshot);

// Restore (e.g. on another machine / after network transfer)
const restored = spaceFromJSON(JSON.parse(json));
restored.step(1 / 60);
```

The `/serialization` entry point is a separate export, but it still loads the engine
(measured ~145 KB gzip bundled on its own) — the snapshot format is defined in terms
of engine types. The snapshot captures bodies, shapes, materials, interaction
filters, fluid properties, all constraint types (except `UserConstraint`), and compounds.
Arbiters and broadphase tree state are reconstructed automatically on the first step.

### Replay (Recorder + Player)

Record a deterministic simulation and play it back later — same machine, another
machine, days later. Built on top of `/serialization` plus `space.deterministic = true`.

```typescript
import "@newkrok/nape-js";
import { Recorder, Player, encodeReplay, decodeReplay } from "@newkrok/nape-js/replay";

// Record — user supplies the input payload type and the apply function.
space.deterministic = true;
const recorder = new Recorder<MyInput>(space, { keyframeEvery: 60 });
for (let f = 0; f < 600; f++) {
  recorder.recordFrame(readUserInput()); // null = no input this frame
  applyUserInput(space); // user's own logic
  space.step(1 / 60);
}
const replay = recorder.finish();
const blob = encodeReplay(replay); // Uint8Array — store, share, transfer

// Replay — anywhere, including a different machine on the same platform.
const replay2 = decodeReplay<MyInput>(blob);
const player = new Player(replay2, (input, space, frame) => {
  if (input.fire) somebody.applyImpulse(new Vec2(0, -200));
});
const sp = player.restore();
while (!player.finished) player.step();
// player.stepTo(150) — random-access scrub via keyframes
```

The `/replay` entry point is a separate export but still loads the engine
(measured ~145 KB gzip bundled on its own). The library is intentionally a thin
layer: it owns the snapshot + input-log plumbing, and the user owns the
`applyInput` callback. This keeps the replay deterministic as long as the
callback is a pure function of `(input, space, frame)`.

### Web Worker

Run physics off the main thread for smooth rendering even with hundreds of bodies.

```typescript
import "@newkrok/nape-js";
import { PhysicsWorkerManager } from "@newkrok/nape-js/worker";

const mgr = new PhysicsWorkerManager({ gravityY: 600, maxBodies: 256 });
await mgr.init();

const id = mgr.addBody("dynamic", 100, 50, [{ type: "circle", radius: 20 }]);
mgr.start();

// Read transforms on the main thread (zero-copy with SharedArrayBuffer)
function render() {
  const t = mgr.getTransform(id);
  if (t) drawCircle(t.x, t.y, t.rotation);
  requestAnimationFrame(render);
}
render();
```

Uses SharedArrayBuffer for zero-copy transform sharing when COOP/COEP headers are
present, with automatic `postMessage` fallback otherwise.

## Contributing

Pull requests are welcome! Every PR is reviewed collaboratively with
[Claude Code](https://www.anthropic.com/claude-code) using the playbook in
[`.claude/skills/pr-review/SKILL.md`](https://github.com/NewKrok/nape-js/blob/master/.claude/skills/pr-review/SKILL.md).
See [`CONTRIBUTING.md`](https://github.com/NewKrok/nape-js/blob/master/CONTRIBUTING.md) for the full review process,
pre-push checklist, and what gets flagged as a blocker vs. a nit.

## License

MIT

<!-- Generated from the repo-root README.md by scripts/sync-readme.mjs. Edit that file, not this one. -->
