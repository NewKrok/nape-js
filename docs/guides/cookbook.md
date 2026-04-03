# nape-js Cookbook

<!-- Last verified: v3.21.4 -->

Practical, copy-paste-ready recipes for common game physics tasks.
Each recipe shows the minimal working code and explains the "why" behind key decisions.

---

## Table of Contents

- [Basic Setup](#basic-setup)
- [Platformer Character](#platformer-character)
- [One-Way Platforms](#one-way-platforms)
- [Ragdoll](#ragdoll)
- [Rope / Chain](#rope--chain)
- [Vehicle (Top-Down)](#vehicle-top-down)
- [Fluid / Water Pool](#fluid--water-pool)
- [Raycasting](#raycasting)
- [Sensor / Trigger Zone](#sensor--trigger-zone)
- [Collision Filtering](#collision-filtering)
- [Explosion Impulse](#explosion-impulse)
- [Voronoi Fracture (Destruction)](#voronoi-fracture-destruction)
- [Conveyor Belt](#conveyor-belt)
- [Breakable Constraint](#breakable-constraint)
- [Soft Constraint (Spring-Like)](#soft-constraint-spring-like)
- [Serialization (Save / Load)](#serialization-save--load)
- [Binary Snapshot (Multiplayer)](#binary-snapshot-multiplayer)
- [Web Worker Off-Thread Physics](#web-worker-off-thread-physics)
- [CCD (Bullet Bodies)](#ccd-bullet-bodies)
- [Sub-Stepping for Stability](#sub-stepping-for-stability)
- [Kinematic Moving Platform](#kinematic-moving-platform)
- [Custom Material Presets](#custom-material-presets)
- [Performance Profiling](#performance-profiling)
- [GPU-Accelerated Physics (WebGPU)](#gpu-accelerated-physics-webgpu)

---

## Basic Setup

Create a world, a floor, and a falling ball — the "Hello World" of nape-js.

```typescript
import { Space, Body, BodyType, Vec2, Circle, Polygon } from "@newkrok/nape-js";

const space = new Space(new Vec2(0, 600)); // gravity: 600 px/s² downward

// Static floor
const floor = new Body(BodyType.STATIC, new Vec2(400, 550));
floor.shapes.add(new Polygon(Polygon.box(800, 20)));
floor.space = space;

// Dynamic ball
const ball = new Body(BodyType.DYNAMIC, new Vec2(400, 100));
ball.shapes.add(new Circle(20));
ball.space = space;

// Game loop
function update() {
  space.step(1 / 60);
  // Read ball.position.x, ball.position.y, ball.rotation for rendering
}
```

**Key points:**
- `space.step(1/60)` advances the simulation by one frame at 60 fps
- Assign `body.space = space` to add a body — don't call a separate `addBody()` method
- Gravity is in **pixels/s²** (not meters) — no conversion needed

---

## Platformer Character

Use `CharacterController` for pixel-perfect movement with slope handling, step climbing, and wall detection.

```typescript
import {
  Space, Body, BodyType, Vec2, Circle, CbType,
  CharacterController,
} from "@newkrok/nape-js";

const space = new Space(new Vec2(0, 600));

// Player body — DYNAMIC with rotation disabled
const player = new Body(BodyType.DYNAMIC, new Vec2(100, 100));
player.shapes.add(new Circle(14));
player.allowRotation = false;
player.isBullet = true; // enable CCD to prevent tunneling
player.space = space;

// Optional: tag for one-way platform filtering
const platformTag = new CbType();

const cc = new CharacterController(space, player, {
  maxSlopeAngle: Math.PI / 4, // 45° climbable
  oneWayPlatformTag: platformTag,
});

// Each frame:
function update(dt: number, keys: { left: boolean; right: boolean; jump: boolean }) {
  const speed = 200;
  const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

  cc.setVelocity(dx * speed, player.velocity.y);
  space.step(dt);

  const result = cc.moveResult;
  if (keys.jump && result.grounded) {
    player.velocity.y = -400; // jump impulse
  }
}
```

**Key points:**
- Use `allowRotation = false` so the character doesn't tumble
- `isBullet = true` enables CCD — prevents falling through thin platforms
- `CharacterController` handles slopes, steps, and wall detection automatically

---

## One-Way Platforms

Platforms the player can jump through from below but stand on from above.

```typescript
import {
  Space, Body, BodyType, Vec2, Polygon, Material,
  CbType, PreListener, PreFlag,
} from "@newkrok/nape-js";

const platformTag = new CbType();
const playerTag = new CbType();

// Create platform
const platform = new Body(BodyType.STATIC, new Vec2(300, 400));
platform.shapes.add(new Polygon(Polygon.box(120, 12)));
platform.cbTypes.add(platformTag);
platform.space = space;

// Add player's CbType
playerBody.cbTypes.add(playerTag);

// PreListener: ignore collision when player moves upward
space.listeners.add(
  new PreListener(
    InteractionType.COLLISION,
    playerTag,
    platformTag,
    (cb) => {
      const arbiter = cb.arbiter.collisionArbiter;
      // Normal points from shape1 to shape2; ignore if pointing down
      return arbiter && arbiter.normal.y > 0 ? PreFlag.IGNORE : PreFlag.ACCEPT;
    },
  ),
);
```

**Key point:** The `PreListener` fires *before* collision resolution — returning `PreFlag.IGNORE` lets the body pass through.

---

## Ragdoll

A multi-body character held together by `PivotJoint` (position) and `AngleJoint` (rotation limits).

```typescript
import {
  Space, Body, BodyType, Vec2, Circle, Polygon,
  PivotJoint, AngleJoint,
} from "@newkrok/nape-js";

function createRagdoll(space: Space, x: number, y: number) {
  const torso = new Body(BodyType.DYNAMIC, new Vec2(x, y));
  torso.shapes.add(new Polygon(Polygon.box(24, 48)));
  torso.space = space;

  const head = new Body(BodyType.DYNAMIC, new Vec2(x, y - 38));
  head.shapes.add(new Circle(12));
  head.space = space;

  // Pin head to torso
  const neck = new PivotJoint(torso, head, new Vec2(0, -24), new Vec2(0, 12));
  neck.space = space;

  // Limit head rotation to ±23°
  const neckAngle = new AngleJoint(torso, head, -0.4, 0.4);
  neckAngle.stiff = false;
  neckAngle.frequency = 8;
  neckAngle.damping = 0.6;
  neckAngle.space = space;

  // Upper arm
  const arm = new Body(BodyType.DYNAMIC, new Vec2(x - 26, y - 14));
  arm.shapes.add(new Polygon(Polygon.box(28, 8)));
  arm.space = space;

  new PivotJoint(torso, arm, new Vec2(-12, -20), new Vec2(14, 0)).space = space;
  new AngleJoint(torso, arm, -Math.PI * 0.75, Math.PI * 0.75).space = space;

  // Add more limbs following the same pattern...
  return { torso, head, arm };
}
```

**Key points:**
- `PivotJoint` pins two bodies at a shared point — use for all joint connections
- `AngleJoint` with `stiff = false` creates soft rotation limits (more natural)
- `frequency` and `damping` control the "springiness" of the joint

---

## Rope / Chain

A chain of bodies connected by distance-constrained joints.

```typescript
const LINKS = 12;
const LINK_LEN = 20;
let prev: Body | null = space.world; // anchor to static world body

for (let i = 0; i < LINKS; i++) {
  const link = new Body(BodyType.DYNAMIC, new Vec2(300, 100 + i * LINK_LEN));
  link.shapes.add(new Circle(4));
  link.space = space;

  const joint = new PivotJoint(
    prev,
    link,
    prev === space.world ? new Vec2(300, 100) : new Vec2(0, LINK_LEN / 2),
    new Vec2(0, -LINK_LEN / 2),
  );
  joint.space = space;
  prev = link;
}
```

**Key point:** Use `space.world` as the first body to anchor the chain to a fixed point in the world.

---

## Vehicle (Top-Down)

Kinematic body with velocity-based steering.

```typescript
const car = new Body(BodyType.DYNAMIC, new Vec2(400, 300));
car.shapes.add(new Polygon(Polygon.box(20, 40)));
car.allowRotation = true;
car.space = space;

function updateCar(steer: number, throttle: number) {
  const angle = car.rotation;
  const forward = new Vec2(Math.sin(angle), -Math.cos(angle));

  // Apply forward thrust
  car.applyImpulse(Vec2.get(forward.x * throttle, forward.y * throttle));

  // Steering: apply angular impulse
  car.applyAngularImpulse(steer * 0.5);

  // Kill lateral velocity for tighter handling
  const lateral = new Vec2(-forward.y, forward.x);
  const latSpeed = car.velocity.x * lateral.x + car.velocity.y * lateral.y;
  car.velocity.x -= lateral.x * latSpeed * 0.9;
  car.velocity.y -= lateral.y * latSpeed * 0.9;
}
```

---

## Fluid / Water Pool

Create a body with `fluidEnabled = true` shapes for buoyancy and drag.

```typescript
import { Body, BodyType, Vec2, Polygon, FluidProperties } from "@newkrok/nape-js";

// Water zone (static body, sensor-like)
const water = new Body(BodyType.STATIC, new Vec2(400, 450));
const waterShape = new Polygon(Polygon.box(300, 100));
waterShape.fluidEnabled = true;
waterShape.fluidProperties = new FluidProperties(1.5, 3.0); // density, viscosity
water.shapes.add(waterShape);
water.space = space;

// Light object — floats
const buoy = new Body(BodyType.DYNAMIC, new Vec2(400, 200));
const buoyShape = new Circle(15);
buoy.shapes.add(buoyShape);
for (const s of buoy.shapes) {
  s.material.density = 0.3; // lighter than water (1.5) → floats
}
buoy.space = space;

// Heavy object — sinks slowly
const anchor = new Body(BodyType.DYNAMIC, new Vec2(420, 200));
anchor.shapes.add(new Polygon(Polygon.box(20, 20)));
for (const s of anchor.shapes) {
  s.material.density = 5.0; // heavier than water → sinks
}
anchor.space = space;
```

**Key points:**
- `FluidProperties(density, viscosity)` — higher density = stronger buoyancy, higher viscosity = more drag
- The body's `material.density` relative to the fluid's density determines floating vs sinking
- Fluid simulation is **unique to nape-js** — no other pure-JS engine has this

---

## Raycasting

Cast a ray and find the first body it hits.

```typescript
import { Space, Ray, Vec2 } from "@newkrok/nape-js";

// Important: call space.step() at least once before raycasting
// so the broadphase registers all shapes
space.step(1 / 60);

const ray = new Ray(
  new Vec2(100, 300), // origin
  new Vec2(1, 0),     // direction (rightward)
);

const result = space.rayCast(ray, false); // false = outer surfaces only

if (result) {
  console.log("Hit body:", result.shape.body);
  console.log("Hit point:", result.point);
  console.log("Distance:", result.distance);
  console.log("Normal:", result.normal);
}
```

**Gotcha:** `space.rayCast()` on static bodies may return null if you haven't called `space.step()` at least once — the broadphase needs a step to index the shapes.

---

## Sensor / Trigger Zone

Detect bodies entering/exiting an area without physical collision.

```typescript
import {
  Body, BodyType, Vec2, Polygon,
  CbType, CbEvent, InteractionType, InteractionListener,
} from "@newkrok/nape-js";

const sensorTag = new CbType();
const enemyTag = new CbType();

// Sensor zone — no physical collision, only detection
const zone = new Body(BodyType.STATIC, new Vec2(500, 400));
const zoneShape = new Polygon(Polygon.box(100, 100));
zoneShape.sensorEnabled = true;
zone.shapes.add(zoneShape);
zone.cbTypes.add(sensorTag);
zone.space = space;

// Enemy body
enemy.cbTypes.add(enemyTag);

// Detect entry
space.listeners.add(
  new InteractionListener(CbEvent.BEGIN, InteractionType.SENSOR, sensorTag, enemyTag, (cb) => {
    console.log("Enemy entered zone!", cb.int2);
  }),
);

// Detect exit
space.listeners.add(
  new InteractionListener(CbEvent.END, InteractionType.SENSOR, sensorTag, enemyTag, (cb) => {
    console.log("Enemy left zone!", cb.int2);
  }),
);
```

---

## Collision Filtering

Control which bodies collide using `InteractionFilter` bit masks.

```typescript
import { Body, Circle, InteractionFilter } from "@newkrok/nape-js";

// Define layers as bit flags
const PLAYER = 1;
const ENEMY = 2;
const BULLET = 4;
const WALL = 8;

// Player collides with enemies and walls, not own bullets
for (const s of playerBody.shapes) {
  s.filter.collisionGroup = PLAYER;
  s.filter.collisionMask = ENEMY | WALL;
}

// Enemy collides with player, bullets, and walls
for (const s of enemyBody.shapes) {
  s.filter.collisionGroup = ENEMY;
  s.filter.collisionMask = PLAYER | BULLET | WALL;
}

// Bullet collides with enemies and walls only
for (const s of bulletBody.shapes) {
  s.filter.collisionGroup = BULLET;
  s.filter.collisionMask = ENEMY | WALL;
}
```

**Key point:** Two shapes collide when `(A.collisionGroup & B.collisionMask) !== 0 AND (B.collisionGroup & A.collisionMask) !== 0`. Both must agree.

---

## Explosion Impulse

Apply radial impulse to all nearby bodies.

```typescript
function explode(space: Space, center: Vec2, radius: number, force: number) {
  for (const body of space.bodies) {
    if (body.type !== BodyType.DYNAMIC) continue;

    const dx = body.position.x - center.x;
    const dy = body.position.y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius && dist > 0) {
      const strength = force * (1 - dist / radius); // falloff
      const impulse = Vec2.get((dx / dist) * strength, (dy / dist) * strength);
      body.applyImpulse(impulse);
      impulse.dispose();
    }
  }
}

// Usage:
explode(space, new Vec2(400, 300), 200, 5000);
```

**Gotcha:** nape-js has `applyImpulse()`, not `applyForce()`. Impulse is instantaneous (velocity change), force is continuous (applied per step).

---

## Voronoi Fracture (Destruction)

Shatter a body into Voronoi fragments on impact. Works with any convex polygon shape.

```typescript
import { fractureBody } from "@newkrok/nape-js";

// Fracture a body at the impact point
const result = fractureBody(body, impactPoint, {
  fragmentCount: 6,       // number of pieces (default: 8)
  explosionImpulse: 30,   // radial blast force in px/s (default: 0)
});

// result.fragments — array of new Body instances (already in space)
// result.originalBody — the original body (removed from space)
result.fragments.forEach((f) => {
  f.userData._breakable = f.shapes.at(0).area >= 300; // re-fracture only large pieces
});
```

**Collision-triggered fracture** — use an `InteractionListener` to fracture on impact:

```typescript
import { CbType, CbEvent, InteractionType, InteractionListener } from "@newkrok/nape-js";

const cbProjectile = new CbType();
const cbBreakable = new CbType();

// Tag bodies
projectile.cbTypes.add(cbProjectile);
wall.cbTypes.add(cbBreakable);

space.listeners.add(new InteractionListener(
  CbEvent.BEGIN,
  InteractionType.COLLISION,
  cbProjectile,
  cbBreakable,
  (cb) => {
    const b1 = cb.int1.castBody ?? cb.int1.castShape?.body;
    const b2 = cb.int2.castBody ?? cb.int2.castShape?.body;
    if (!b1 || !b2) return;
    const target = b1.userData._breakable ? b1 : b2;
    const mx = (b1.position.x + b2.position.x) / 2;
    const my = (b1.position.y + b2.position.y) / 2;
    // Defer to avoid modifying space during callback
    setTimeout(() => {
      if (target.space) fractureBody(target, Vec2.get(mx, my), { fragmentCount: 4 });
    }, 0);
  },
));
```

**Gotchas:**
- `fractureBody` only works on **polygon** shapes (not circles/capsules).
- Always `setTimeout` the fracture call inside listeners — modifying the space during a collision callback throws.
- Fragments inherit the original body's velocity and rotation. Set `explosionImpulse` > 0 for a blast effect.
- For deterministic results (multiplayer), pass a seeded `random: () => number` function in options.

---

## Conveyor Belt

Use `surfaceVel` on a shape's material to create a moving surface.

```typescript
const belt = new Body(BodyType.STATIC, new Vec2(400, 500));
const beltShape = new Polygon(Polygon.box(200, 10));
belt.shapes.add(beltShape);
belt.space = space;

// Set surface velocity — pushes objects rightward at 100 px/s
for (const s of belt.shapes) {
  s.material.dynamicFriction = 2;
  s.material.staticFriction = 2;
  s.surfaceVel.setXY(100, 0);
}
```

---

## Breakable Constraint

A joint that snaps when force exceeds a threshold.

```typescript
import { PivotJoint, CbType, CbEvent, ConstraintListener } from "@newkrok/nape-js";

const joint = new PivotJoint(bodyA, bodyB, new Vec2(0, 0), new Vec2(0, 0));
joint.breakUnderForce = true;
joint.maxForce = 5000;     // breaks above this force
joint.removeOnBreak = true; // auto-remove from space

// Listen for the break event
const jointTag = new CbType();
joint.cbTypes.add(jointTag); // IMPORTANT: must add a custom CbType

space.listeners.add(
  new ConstraintListener(CbEvent.BREAK, jointTag, (cb) => {
    console.log("Joint broke!", cb.constraint);
    // Spawn particles, play sound, etc.
  }),
);

joint.space = space;
```

**Gotcha:** `CbType.ANY_CONSTRAINT` does **not** work for BREAK/SLEEP events. You must create and assign a dedicated `CbType` to the joint's `cbTypes`.

---

## Soft Constraint (Spring-Like)

Any constraint can be made soft by setting `stiff = false` with frequency and damping.

```typescript
const joint = new DistanceJoint(bodyA, bodyB,
  new Vec2(0, 0), new Vec2(0, 0),
  50, 150, // min, max distance
);
joint.stiff = false;
joint.frequency = 4;   // oscillation speed (Hz)
joint.damping = 0.3;   // 0 = no damping, 1 = critical damping
joint.space = space;
```

**Key point:** This works on **any** constraint type (PivotJoint, AngleJoint, WeldJoint, etc.) — not just DistanceJoint. Set `stiff = false`, then tune `frequency` and `damping`.

---

## Serialization (Save / Load)

Save and restore the entire physics state as JSON.

```typescript
import { spaceToJSON, spaceFromJSON } from "@newkrok/nape-js/serialization";

// Save
const snapshot = spaceToJSON(space);
const json = JSON.stringify(snapshot);
localStorage.setItem("physics-save", json);

// Load
const saved = localStorage.getItem("physics-save");
if (saved) {
  const restoredSpace = spaceFromJSON(JSON.parse(saved));
  // restoredSpace is a fully functional Space with all bodies, constraints, etc.
}
```

**Key point:** JSON serialization preserves `userData` on bodies. Binary does not.

---

## Binary Snapshot (Multiplayer)

Compact binary format for network sync.

```typescript
import { spaceToBinary, spaceFromBinary } from "@newkrok/nape-js/serialization";

// Server: serialize
const binary = spaceToBinary(space); // Uint8Array

// Send binary over WebSocket
ws.send(binary);

// Client: deserialize
ws.onmessage = (event) => {
  const restored = spaceFromBinary(new Uint8Array(event.data));
  // Use restored space for prediction/rendering
};
```

---

## Web Worker Off-Thread Physics

Run physics simulation on a background thread to keep the UI at 60 fps.

```typescript
import {
  PhysicsWorkerManager,
  buildWorkerScript,
} from "@newkrok/nape-js/worker";

const manager = new PhysicsWorkerManager();

// Initialize worker with engine URL
await manager.init(buildWorkerScript("/node_modules/@newkrok/nape-js/dist/index.js"));

// Add bodies (mirrored in the worker)
manager.addBody({ id: "ball", type: "dynamic", x: 400, y: 100, shape: "circle", radius: 20 });
manager.addBody({ id: "floor", type: "static", x: 400, y: 550, shape: "box", width: 800, height: 20 });

// Start simulation
manager.start();

// Read transforms for rendering (zero-copy with SharedArrayBuffer)
function render() {
  const transforms = manager.getTransforms();
  for (const [id, { x, y, rotation }] of transforms) {
    // Update your rendering objects
  }
  requestAnimationFrame(render);
}
```

---

## CCD (Bullet Bodies)

Prevent fast-moving objects from tunneling through thin walls.

```typescript
// Enable CCD on fast-moving bodies
bullet.isBullet = true;

// Optional: fine-tune per body
bullet.disableCCD = false; // default, CCD active when isBullet = true
```

**Key points:**
- CCD is **per-body**, not per-space — there is no `space.disableCCD`
- Only set `isBullet = true` on bodies that actually move fast (bullets, projectiles)
- CCD adds CPU cost — don't enable it on every body

---

## Sub-Stepping for Stability

Improve simulation quality for stacking, fast objects, and stiff constraints.

```typescript
// Run 4 sub-steps per frame (each at dt/4)
space.subSteps = 4;

// Then step normally — it internally runs 4 smaller steps
space.step(1 / 60);
```

**Key points:**
- `subSteps = 1` is the default (zero overhead)
- `subSteps = 4` is a good balance for most games
- Cost scales linearly — `subSteps = 4` costs ~4x more CPU
- Particularly useful for: stacking stability, thin wall collisions, stiff constraints

---

## Kinematic Moving Platform

A platform that moves on a fixed path and pushes dynamic bodies.

```typescript
const platform = new Body(BodyType.KINEMATIC, new Vec2(300, 400));
platform.shapes.add(new Polygon(Polygon.box(100, 12)));
platform.space = space;

// Move back and forth
let time = 0;
function updatePlatform(dt: number) {
  time += dt;
  const targetX = 300 + Math.sin(time) * 150;
  // Set velocity so the solver pushes bodies correctly
  platform.velocity.x = (targetX - platform.position.x) / dt;
  platform.velocity.y = 0;
}
```

**Key point:** Set `velocity` on kinematic bodies — don't set `position` directly. The solver uses velocity to push dynamic bodies that are standing on the platform.

---

## Custom Material Presets

nape-js includes built-in presets, or create your own.

```typescript
import { Material } from "@newkrok/nape-js";

// Built-in presets
const wood = Material.wood();
const steel = Material.steel();
const ice = Material.ice();
const rubber = Material.rubber();
const glass = Material.glass();
const sand = Material.sand();

// Custom material
// Constructor order: elasticity, dynamicFriction, staticFriction, density, rollingFriction
const bouncy = new Material(0.9, 0.1, 0.1, 1.0, 0.01);
const heavy = new Material(0.2, 0.8, 0.9, 10.0, 0.5);

// Apply to a shape
for (const s of body.shapes) {
  s.material = bouncy;
}
```

**Gotcha:** The constructor order is `(elasticity, dynamicFriction, staticFriction, density, rollingFriction)` — elasticity comes **first**, not friction. This differs from some other engines.

---

## Performance Profiling

Visualise per-step timing and entity counts with the built-in performance overlay.

### Quick overlay (Canvas)

```typescript
import { PerformanceOverlay } from "nape-js/profiler";

// Attaches a canvas overlay to the page (auto-creates canvas if omitted)
const overlay = new PerformanceOverlay(space, {
  position: "top-right", // "top-left" | "top-right" | "bottom-left" | "bottom-right"
  width: 260,
  showGraph: true,       // rolling step-time graph (120 frames)
  showBreakdown: true,   // broadphase / narrowphase / solver / CCD / sleep bar
  showCounters: true,    // body / contact / constraint counts
});

// In your game loop, after space.step():
function update() {
  space.step(1 / 60);
  overlay.update();
}
```

### Headless / custom metrics (no DOM)

```typescript
// Enable profiling without the overlay
space.profilerEnabled = true;

function update() {
  space.step(1 / 60);

  const m = space.metrics;
  console.log(
    `step ${m.totalStepTime.toFixed(2)}ms ` +
    `(broad ${m.broadphaseTime.toFixed(2)} / narrow ${m.narrowphaseTime.toFixed(2)} / ` +
    `velSolve ${m.velocitySolverTime.toFixed(2)} / posSolve ${m.positionSolverTime.toFixed(2)} / ` +
    `ccd ${m.ccdTime.toFixed(2)} / sleep ${m.sleepTime.toFixed(2)})`,
  );
  console.log(
    `bodies ${m.bodyCount} (dyn ${m.dynamicBodyCount}, sleep ${m.sleepingBodyCount}) ` +
    `contacts ${m.contactCount} constraints ${m.constraintCount}`,
  );
}
```

**Key points:**
- `PerformanceOverlay` auto-enables `space.profilerEnabled` — no extra setup needed
- Metrics are **zero-allocation** (reused object, no GC pressure)
- The overlay respects HiDPI (`devicePixelRatio`) automatically
- When `profilerEnabled = false` (default), timing instrumentation is skipped — zero overhead in production

---

## GPU-Accelerated Physics (WebGPU)

Optional compute shader path for high-body-count scenes. Uses SoA typed-array buffers, graph coloring for parallel contact solving, and WGSL compute shaders. **Not a breaking change** — `space.step()` still works exactly as before.

### Basic usage

```typescript
import { Space, Body, BodyType, Vec2, Circle, Polygon } from "@newkrok/nape-js";

const space = new Space(new Vec2(0, 600));
// ... add bodies ...

// Initialise WebGPU pipeline (returns false if unsupported)
const gpuReady = await space.initGPU();

function update() {
  if (gpuReady) {
    // GPU-accelerated step — async, returns a Promise
    space.stepGPU(1 / 60, 10, 10);
  } else {
    // Standard CPU path — unchanged API
    space.step(1 / 60, 10, 10);
  }
}
```

### Float32 precision mode

By default the GPU solver uses Float64Array for maximum accuracy. On hardware where f64 is slow, pass `{ precision: "f32" }` to trade accuracy for speed:

```typescript
const gpuReady = await space.initGPU({ precision: "f32" });
```

### Robust fallback pattern

```typescript
let useGPU = false;
try {
  useGPU = await space.initGPU();
} catch {
  useGPU = false;
}

async function gameLoop() {
  if (useGPU) {
    await space.stepGPU(1 / 60);
  } else {
    space.step(1 / 60);
  }
  requestAnimationFrame(gameLoop);
}
```

### When GPU helps vs. when it doesn't

| Scenario | Recommendation |
|----------|----------------|
| 500+ dynamic bodies, mostly contacts | GPU path is faster |
| Many constraints (joints, ragdolls) | CPU path is faster — constraints are not yet GPU-accelerated |
| < 200 bodies | CPU path is faster — GPU dispatch/readback overhead dominates |
| Fluid simulation (buoyancy/drag) | GPU path accelerates fluid solving too |

### Direct GPUComputeSolver usage

For custom game loops or advanced control, use `GPUComputeSolver` directly:

```typescript
import { GPUComputeSolver, SolverBuffers } from "@newkrok/nape-js";

const solver = new GPUComputeSolver();
const ready = await solver.init();

if (ready) {
  // Pack body/arbiter data into SoA buffers
  const buffers = SolverBuffers.fromSpace(space);

  // Run velocity iterations on the GPU
  await solver.solveVelocity(buffers, 10);

  // Read results back into the space
  buffers.writeBackToSpace(space);
}
```

**Key points:**
- `initGPU()` is a one-time async call — do it at startup, not every frame
- `stepGPU()` is `async` because GPU readback is asynchronous; `await` it or handle the promise
- The GPU path runs 3 WGSL compute shaders: contact solver, fluid solver, and warm start
- Graph coloring groups independent contacts so they can be solved in parallel without data races
- All existing callbacks, listeners, and serialization work identically with the GPU path
