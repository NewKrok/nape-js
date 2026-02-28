# @newkrok/nape-js

[![npm version](https://img.shields.io/npm/v/@newkrok/nape-js.svg)](https://www.npmjs.com/package/@newkrok/nape-js)
[![npm downloads](https://img.shields.io/npm/dm/@newkrok/nape-js.svg)](https://www.npmjs.com/package/@newkrok/nape-js)
[![CI](https://github.com/NewKrok/nape-js/actions/workflows/ci.yml/badge.svg)](https://github.com/NewKrok/nape-js/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/NewKrok/nape-js/branch/master/graph/badge.svg)](https://codecov.io/gh/NewKrok/nape-js)
[![bundle size](https://img.shields.io/badge/gzip-414%20KB-blue.svg)](https://github.com/NewKrok/nape-js)
[![license](https://img.shields.io/npm/l/@newkrok/nape-js.svg)](https://github.com/NewKrok/nape-js/blob/master/LICENSE)

Modern TypeScript wrapper for the [Nape](https://github.com/deltaluca/nape) 2D physics engine.

- Original Haxe engine by Luca Deltodesco
- JS compiler by Andrew Bradley ([nape-to-js](https://github.com/cspotcode/nape-to-js))
- TypeScript wrapper by Istvan Krisztian Somoracz

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

### Before (v1) vs After (v2)

```javascript
// v1 — raw Haxe API
import initNape from "./js/libs/nape-js.module.js";
initNape();
const body = new nape.phys.Body(nape.phys.BodyType.get_DYNAMIC());
body.get_shapes().add(new nape.shape.Polygon(nape.shape.Polygon.box(100, 100)));
body.get_position().set_x(200);
body.set_rotation(Math.PI / 2);
body.set_space(space);
```

```typescript
// v2 — TypeScript wrapper
import { Body, BodyType, Polygon } from "@newkrok/nape-js";
const body = new Body(BodyType.DYNAMIC);
body.shapes.add(new Polygon(Polygon.box(100, 100)));
body.position.x = 200;
body.rotation = Math.PI / 2;
body.space = space;
```

## API Reference

### Core Classes

| Class | Description |
|-------|-------------|
| `Space` | Physics world — add bodies, step simulation |
| `Body` | Rigid body with position, velocity, mass |
| `Vec2` | 2D vector for positions, velocities, forces |
| `AABB` | Axis-aligned bounding box |

### Shapes

| Class | Description |
|-------|-------------|
| `Circle` | Circular shape |
| `Polygon` | Convex polygon (with `Polygon.box()`, `Polygon.rect()`, `Polygon.regular()`) |
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

## Development

```bash
npm install
npm run build    # Compile TypeScript + bundle
npm test         # Run tests (779 tests)
npm run benchmark # Performance benchmarks
```

## License

MIT
