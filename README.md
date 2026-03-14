<p align="center">
  <img src="docs/logo.svg" alt="nape-js logo" width="80" />
</p>

# @newkrok/nape-js

[![npm version](https://img.shields.io/npm/v/@newkrok/nape-js.svg)](https://www.npmjs.com/package/@newkrok/nape-js)
[![npm downloads](https://img.shields.io/npm/dm/@newkrok/nape-js.svg)](https://www.npmjs.com/package/@newkrok/nape-js)
[![CI](https://github.com/NewKrok/nape-js/actions/workflows/ci.yml/badge.svg)](https://github.com/NewKrok/nape-js/actions/workflows/ci.yml)
[![bundle size](https://img.shields.io/badge/gzip-16%20KB-blue.svg)](https://github.com/NewKrok/nape-js)
[![license](https://img.shields.io/npm/l/@newkrok/nape-js.svg)](https://github.com/NewKrok/nape-js/blob/master/LICENSE)

Fully typed, tree-shakeable 2D physics engine — a modern TypeScript rewrite of the
[Nape](https://github.com/deltaluca/nape) Haxe physics engine.

- Originally created in Haxe by Luca Deltodesco
- Ported to TypeScript by Istvan Krisztian Somoracz

## Installation

```bash
npm install @newkrok/nape-js
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

> Full API documentation: [TypeDoc Reference](https://newkrok.github.io/nape-js/api/)

### Core Classes

| Class | Description |
|-------|-------------|
| `Space` | Physics world — add bodies, step simulation |
| `Body` | Rigid body with position, velocity, mass |
| `Vec2` | 2D vector — pooling, `clone()`, `equals()`, `lerp()`, `fromAngle()` |
| `Vec3` | 3D vector for constraint impulses — `clone()`, `equals()` |
| `AABB` | Axis-aligned bounding box — `clone()`, `equals()`, `fromPoints()` |
| `Mat23` | 2×3 affine matrix — `clone()`, `equals()`, transform, inverse |
| `Ray` | Raycasting — `clone()`, `fromSegment()`, spatial queries |

### Shapes

| Class | Description |
|-------|-------------|
| `Circle` | Circular shape |
| `Polygon` | Convex polygon (with `Polygon.box()`, `Polygon.rect()`, `Polygon.regular()`) |
| `Capsule` | Capsule shape (`Capsule.create()`, `Capsule.createVertical()`) |
| `Shape` | Base class with material, filter, sensor support |

### Physics Properties

| Class | Description |
|-------|-------------|
| `Material` | Elasticity, friction, density |
| `BodyType` | `STATIC`, `DYNAMIC`, `KINEMATIC` |
| `InteractionFilter` | Bit-mask collision/sensor/fluid filtering |
| `FluidProperties` | Density, viscosity for fluid shapes |

### Constraints

| Class | Description |
|-------|-------------|
| `PivotJoint` | Pin two bodies at a shared point |
| `DistanceJoint` | Constrain distance between anchors |
| `WeldJoint` | Fix relative position and angle |
| `AngleJoint` | Constrain relative angle |
| `MotorJoint` | Apply angular velocity |
| `LineJoint` | Slide along a line |
| `PulleyJoint` | Constrain combined distances |

### Callbacks

| Class | Description |
|-------|-------------|
| `InteractionListener` | Collision/sensor/fluid events |
| `BodyListener` | Body wake/sleep events |
| `ConstraintListener` | Constraint events |
| `PreListener` | Pre-collision filtering |
| `CbType` | Tag interactors for filtering |
| `CbEvent` | `BEGIN`, `ONGOING`, `END`, `WAKE`, `SLEEP`, `BREAK` |

### Utilities

| Class | Description |
|-------|-------------|
| `NapeList<T>` | Iterable list with `for...of` support |
| `MatMN` | Variable-sized M×N matrix — `clone()`, `equals()`, multiply, transpose |

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

The `/serialization` entry point is tree-shakeable — it does not pull in the engine
bootstrap when unused. The snapshot captures bodies, shapes, materials, interaction
filters, fluid properties, all constraint types (except `UserConstraint`), and compounds.
Arbiters and broadphase tree state are reconstructed automatically on the first step.

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

## Known Issues

- **Polygon-Polygon tunneling** — When two or more dynamic `Polygon` bodies are
  present in the same space, they may tunnel through static `Polygon` floors.
  Single polygon works fine; circles and capsules are unaffected.
  **Workaround:** use `Circle` shapes for free-falling objects.

## Development

```bash
npm install
npm run build      # tsup → dist/ (ESM + CJS + DTS)
npm test           # vitest — 3784 tests across 176 files
npm run benchmark  # Performance benchmarks
```

## License

MIT
