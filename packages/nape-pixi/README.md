# @newkrok/nape-pixi

**2D physics for PixiJS v8.** The official renderer integration for
[@newkrok/nape-js](https://www.npmjs.com/package/@newkrok/nape-js) — a fully
typed rigid-body physics engine with constraints, collision detection, fluids
and deterministic simulation.

Keeps PIXI display objects in sync with nape bodies, handles smooth rendering
under variable frame rates, provides an on-demand debug overlay, and gives you
the plumbing to run physics off-thread in a Web Worker.

- Zero bundled dependencies — `pixi.js` and `@newkrok/nape-js` are peer deps.
- Pure structural types: nothing in `src/` imports `pixi.js` at runtime, so
  you can swap in mocks or headless-render against plain objects.
- Tree-shakeable. Roughly 10 KB minified ESM, 17 KB d.ts.
- TypeScript-first, TSDoc on every public export.

## Install

```bash
npm install @newkrok/nape-pixi @newkrok/nape-js pixi.js
```

## Quickstart

```ts
import { Application, Graphics } from "pixi.js";
import { Space, Body, BodyType, Circle, Vec2 } from "@newkrok/nape-js";
import { BodySpriteBinding, FixedStepper } from "@newkrok/nape-pixi";

const app = new Application();
await app.init({ width: 800, height: 600 });
document.body.appendChild(app.canvas);

const space = new Space(new Vec2(0, 400));
const ball = new Body(BodyType.DYNAMIC, new Vec2(400, 50));
ball.shapes.add(new Circle(20));
ball.space = space;

const gfx = new Graphics().circle(0, 0, 20).fill(0x58a6ff);
app.stage.addChild(gfx);

const stepper = new FixedStepper({ hz: 60 });
const binding = new BodySpriteBinding({ stepper });
binding.bind(ball, gfx);

let last = performance.now();
app.ticker.add(() => {
  const now = performance.now();
  const alpha = stepper.step(space, (now - last) / 1000);
  last = now;
  binding.update(alpha);
});
```

## Examples

Self-contained reference code lives in [`./examples`](https://github.com/NewKrok/nape-js/blob/master/packages/nape-pixi/examples):

| File                                             | What it shows                                           |
| ------------------------------------------------ | ------------------------------------------------------- |
| [`01-basic.ts`](https://github.com/NewKrok/nape-js/blob/master/packages/nape-pixi/examples/01-basic.ts)          | Naive `space.step` → `binding.update()` each frame.     |
| [`02-interpolation.ts`](https://github.com/NewKrok/nape-js/blob/master/packages/nape-pixi/examples/02-interpolation.ts) | `FixedStepper` + render-interpolation alpha.       |
| [`03-worker-main.ts`](https://github.com/NewKrok/nape-js/blob/master/packages/nape-pixi/examples/03-worker-main.ts) + [`03-worker.ts`](https://github.com/NewKrok/nape-js/blob/master/packages/nape-pixi/examples/03-worker.ts) | Physics in a Web Worker via `WorkerBridge`. |

## API

### `BodySpriteBinding`

Map nape `Body` instances to PIXI display targets. Writes `x`, `y`,
`rotation` each `update()`. Supports body-local `{ offsetX, offsetY }`
(rotates with the body), re-binding, auto-cleanup on space removal, and
optional sub-step interpolation via a `FixedStepper`.

```ts
const binding = new BodySpriteBinding({ stepper });   // stepper is optional
binding.bind(body, sprite);
binding.bind(body, sprite, { offsetX: 4, offsetY: 0 });
binding.update(alpha);                                 // alpha is ignored without a stepper
binding.unbind(body);
binding.dispose();
```

Without a stepper, `alpha` is ignored and `update()` always writes the
current body state. With a stepper, the binding subscribes to
`onBeforeStep` to snapshot previous state, and `update(alpha)` lerps
(shortest-path angle, including across ±π).

### `FixedStepper`

Fixed-timestep driver with accumulator, spiral-of-death guard, and
before/after hooks.

```ts
const stepper = new FixedStepper({
  hz: 60,                // fixed step rate
  maxStepsPerFrame: 5,   // cap catch-up steps
  velocityIterations: 10,
  positionIterations: 10,
});

// once per render frame
const alpha = stepper.step(space, deltaSec);  // runs 0..N steps, returns [0, 1)
```

Hooks:

```ts
const unsub = stepper.onBeforeStep((space) => { /* snapshot, input sample */ });
stepper.onAfterStep((space, dt) => { /* post-step logic */ });
unsub();
```

### `PixiDebugDraw`

One-line debug overlay. Exposes a `PIXI.Container` you add to your stage;
caches one `Graphics` per body, rebuilds geometry only on `showOutlines`
flips.

```ts
import * as PIXI from "pixi.js";
import { PixiDebugDraw } from "@newkrok/nape-pixi";

const debug = new PixiDebugDraw({ pixi: PIXI });
app.stage.addChild(debug.container);

app.ticker.add(() => {
  space.step(1 / 60);
  debug.render(space);
});

// Toggles — live
debug.drawShapes = true;
debug.drawConstraints = true;
debug.showOutlines = false;
```

Supports Circle, Polygon, Capsule. Constraint lines are drawn for any
joint carrying `body1` + `body2` (PivotJoint, DistanceJoint, WeldJoint,
…). Colour policy: `colorResolver` override → static colour →
sleeping colour → palette (cycled by insertion order).

### `WorkerBridge` + transform protocol

Protocol for shuttling body transforms between a physics worker and the
main thread. The library **does not** ship a worker script — you write
it — but provides everything else.

```ts
// Main thread
import { WorkerBridge, createTransformsBuffer } from "@newkrok/nape-pixi";

const alloc = createTransformsBuffer(1024);
const worker = new Worker(new URL("./physics-worker.ts", import.meta.url),
  { type: "module" });
const bridge = new WorkerBridge({ worker, transforms: alloc.transforms });

worker.postMessage({
  type: "init",
  buffer: alloc.isShared ? alloc.buffer : null,
  maxBodies: 1024,
});
await bridge.ready;

for (let i = 0; i < sprites.length; i++) bridge.setSprite(i, sprites[i]);

app.ticker.add(() => bridge.applyTransforms());
```

```ts
// Worker
import { Space } from "@newkrok/nape-js";
import { writeTransforms } from "@newkrok/nape-pixi";

// ... on "init", build your Space and wire `transforms`
setInterval(() => {
  const t0 = performance.now();
  space.step(1 / 60);
  writeTransforms(space, transforms, maxBodies, performance.now() - t0);
  self.postMessage({ type: "frame" });   // + transforms copy when non-shared
}, 1000 / 60);
```

Buffer layout (Float32Array, little-endian):

| Offset         | Meaning                                     |
| -------------- | ------------------------------------------- |
| `0`            | Body count written this frame               |
| `1`            | `space.timeStamp` at write                  |
| `2`            | Step cost (ms) measured by the worker       |
| `3 + i*3 … +2` | Body `i`: `x`, `y`, `rotation`              |

Slots correspond to `space.bodies` iteration order — append-only flows
give stable mappings; if you remove bodies from the middle, re-assign
sprite slots accordingly.

`createTransformsBuffer()` allocates a `SharedArrayBuffer` when the
runtime allows it (cross-origin-isolated contexts with COOP/COEP
headers) and falls back to a plain `ArrayBuffer` otherwise.

## Migrating from `docs/renderers/pixijs-adapter.js`

The engine's demo site bundles a PIXI adapter (`PixiJSAdapter`) that is
demo-runner specific — it entangles attach/detach lifecycle, a 2D HUD
overlay, a worker-transform path, and per-body colour conventions from
`userData._colorIdx` / `_color`. `@newkrok/nape-pixi` replaces the
reusable pieces and drops the demo-only ones.

| `PixiJSAdapter` feature            | Equivalent in `@newkrok/nape-pixi`                     |
| ---------------------------------- | ------------------------------------------------------ |
| `attach(container, W, H)`          | You own the `Application`. The debug draw exposes its own `PIXI.Container`.     |
| Per-body Graphics + transform sync | `BodySpriteBinding` (for your sprites) or `PixiDebugDraw` (for diagnostics). |
| `renderFromTransforms(...)`        | `WorkerBridge.applyTransforms()`.                       |
| `setOutlines(show)`                | `debug.showOutlines = show`.                           |
| `userData._colorIdx` / `_color`    | `colorResolver(body) => number \| null` option.        |
| 2D HUD overlay (`getOverlayCtx`)   | Out of scope — draw your own `canvas` / `PIXI.Text`.   |

The visual output matches: same default palette, same default alphas,
same circle/polygon/capsule geometry.

## License

MIT © Istvan Krisztian Somoracz
