# Troubleshooting Guide

<!-- Last verified: v3.42.3 -->

Common problems, their causes, and solutions. If your issue isn't listed here,
check the [API Reference](https://napejs.org/api/) or
[open an issue on GitHub](https://github.com/NewKrok/nape-js/issues).

---

## Bodies fall through walls / floors

**Symptoms:** Dynamic bodies pass through static bodies without colliding.

### Cause 1: Fast body, no CCD

Small or fast bodies can skip past thin walls between simulation steps.

```typescript
// Fix: enable CCD on fast-moving bodies
bullet.isBullet = true;
```

### Cause 2: Sub-stepping too low

Even with CCD, extreme speeds or thin walls can cause tunneling.

```typescript
// Fix: increase sub-steps
space.subSteps = 4; // each step(dt) runs 4 internal passes at dt/4
```

### Cause 3: Material in wrong constructor parameter (P57 bug)

If you created a Polygon with a Material in the wrong position, the Material
object was silently treated as an InteractionFilter, breaking collision.

```typescript
// WRONG — Material ends up in the filter slot
new Polygon(verts, undefined, material);

// CORRECT — all of these work
new Polygon(verts, material);                    // 2-arg shorthand
new Polygon(verts, localCOM, material, filter);  // full signature
new Polygon(verts, undefined, material);         // also works after P57 fix
```

If you're on a version **before** 3.19, update to the latest.

### Cause 4: Zero friction tunneling

Bodies with `friction = 0` and horizontal velocity can tunnel through floors.

```typescript
// Fix: use a small minimum friction
for (const s of body.shapes) {
  s.material.dynamicFriction = Math.max(s.material.dynamicFriction, 0.01);
  s.material.staticFriction = Math.max(s.material.staticFriction, 0.01);
}
```

---

## Raycast returns null even though bodies exist

**Cause:** The broadphase hasn't indexed the shapes yet. Static bodies are
only registered after the first simulation step.

```typescript
// Fix: call step() at least once before raycasting
space.step(1 / 60);

const result = space.rayCast(ray);
// Now result will include static bodies
```

---

## `applyForce()` is not a function

**Cause:** nape-js uses `applyImpulse()` instead of `applyForce()`.

- **Impulse** = instantaneous velocity change (used once)
- **Force** = continuous acceleration (you'd apply it every frame)

```typescript
// For a one-time push (e.g., explosion, jump):
body.applyImpulse(new Vec2(0, -5000));

// For continuous acceleration (e.g., thrust), apply impulse every frame:
function update(dt: number) {
  body.applyImpulse(new Vec2(thrustX * dt, thrustY * dt));
  space.step(dt);
}
```

---

## Cannot set `space` on a compound member body

**Cause:** Bodies inside a `Compound` share the compound's space. You can only
set `.space` on the root compound, not on individual member bodies.

```typescript
// WRONG — throws an error
compound.bodies.at(0).space = space;

// CORRECT — set space on the compound
compound.space = space;
```

---

## ConstraintListener doesn't fire for BREAK events

**Cause:** `CbType.ANY_CONSTRAINT` does **not** work for BREAK or SLEEP events.
You must create a dedicated `CbType` and assign it to the constraint.

```typescript
// WRONG — listener never fires
space.listeners.add(
  new ConstraintListener(CbEvent.BREAK, CbType.ANY_CONSTRAINT, handler),
);

// CORRECT — create and assign a custom tag
const breakableTag = new CbType();
joint.cbTypes.add(breakableTag);

space.listeners.add(
  new ConstraintListener(CbEvent.BREAK, breakableTag, handler),
);
```

---

## Material constructor order is confusing

The parameter order is:
```
Material(elasticity, dynamicFriction, staticFriction, density, rollingFriction)
```

Elasticity comes **first**. This differs from some engines where friction is first.

```typescript
// Bouncy rubber ball
const rubber = new Material(
  0.9,  // elasticity (high = bouncy)
  0.8,  // dynamicFriction
  0.9,  // staticFriction
  1.2,  // density
  0.01, // rollingFriction
);

// Or use a built-in preset:
const preset = Material.rubber(); // pre-configured values
```

---

## Bodies jitter or explode on startup

**Cause:** Bodies spawned overlapping each other. The solver pushes them apart
aggressively, causing a "physics explosion."

**Fix:** Ensure bodies don't overlap at spawn. Leave at least 1-2 px gap, or
use `space.subSteps = 4` to improve solver stability.

---

## Stacked objects are unstable / wobble

**Fix 1:** Increase sub-steps:
```typescript
space.subSteps = 4;
```

**Fix 2:** Increase solver iterations:
```typescript
// Default is step(dt, 10, 10)
space.step(1 / 60, 20, 20); // more velocity + position iterations
```

**Fix 3:** Increase friction on the shapes:
```typescript
for (const s of body.shapes) {
  s.material.staticFriction = 2.0;
  s.material.dynamicFriction = 1.5;
}
```

---

## Character slides on slopes / doesn't stop

**Cause:** Using force/impulse-based movement instead of `CharacterController`.

Dynamic body movement with forces inherently slides on slopes due to gravity
decomposition. Use the geometric `CharacterController` for precise platformer
movement.

```typescript
import { CharacterController } from "@newkrok/nape-js";

const cc = new CharacterController(space, body, {
  maxSlopeAngle: Math.PI / 4, // 45° walkable
});
```

---

## Character hangs on a wall / ledge edge while a direction key is held

**Symptom:** Holding left/right into a wall (or the side of a platform / one-way
platform) while airborne freezes the character in place — it only falls once
the key is released.

**Cause:** Material friction against a re-asserted push. A velocity-driven
character writes e.g. `vx = 210` into the wall every frame; the contact solver
cancels that with a large normal impulse, and friction turns it into a
tangential impulse big enough to cancel gravity for the whole step.

**Fix:** `CharacterController` handles this since the `wallFriction` option
exists — non-ground contacts (steeper than `maxSlopeAngle`) get friction `0`
while floors and slopes keep material friction. If you passed
`wallFriction: null`, or drive the body yourself, either drop the option or
zero friction on wall contacts in a `PreListener`:

```typescript
new PreListener(InteractionType.COLLISION, playerTag, CbType.ANY_BODY, (cb) => {
  const arb = cb.arbiter.collisionArbiter;
  if (arb && Math.abs(arb.normal.y) < 0.7) {
    arb.dynamicFriction = 0;
    arb.staticFriction = 0;
  }
  return null; // leave accept / ignore to the engine
}).space = space;
```

---

## Web Worker physics is slower than main thread

**Possible causes:**

1. **`postMessage` fallback** — If `SharedArrayBuffer` is not available (missing
   COOP/COEP headers), transforms are copied via postMessage each frame.
   Ensure your server sends:
   ```
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
   ```

2. **Too many bodies** — Worker communication overhead per body is fixed.
   For < 50 bodies, main-thread physics is often faster.

---

## Fluid buoyancy doesn't work

**Checklist:**

1. Is `fluidEnabled = true` on the fluid shape?
2. Did you set `fluidProperties`?
3. Is the fluid body's type `STATIC` (or `KINEMATIC`)?
4. Is the dynamic body's shape density different from the fluid density?

```typescript
// Correct fluid setup
const waterShape = new Polygon(Polygon.box(300, 100));
waterShape.fluidEnabled = true; // <-- often forgotten
waterShape.fluidProperties = new FluidProperties(1.5, 3.0);
waterBody.shapes.add(waterShape);
```

---

## "Cannot read property of disposed Vec2"

**Cause:** Using a `Vec2.weak()` or manually disposed vector after it's been
returned to the object pool.

```typescript
// WRONG — weak vectors are auto-disposed after one use
const v = Vec2.weak(10, 0);
body.applyImpulse(v);
console.log(v.x); // ERROR: disposed

// CORRECT — use Vec2.get() and dispose manually
const v = Vec2.get(10, 0);
body.applyImpulse(v);
console.log(v.x); // OK
v.dispose(); // return to pool when done
```

---

## Simulation is slow / how to find the bottleneck

Use the built-in performance profiler to identify which phase is eating time.

```typescript
import { PerformanceOverlay } from "@newkrok/nape-js/profiler";

// Quick visual overlay
const overlay = new PerformanceOverlay(space, { position: "top-right" });

// Or headless: enable metrics and read them programmatically
space.profilerEnabled = true;
space.step(1 / 60);
const m = space.metrics;
console.log(`broadphase: ${m.broadphaseTime}ms, narrowphase: ${m.narrowphaseTime}ms`);
```

**Common bottlenecks and fixes:**

| Bottleneck | Symptom | Fix |
|---|---|---|
| Broadphase | `broadphaseTime` high, many bodies | Switch broadphase strategy (`SweepAndPrune` → `DynamicAABBTree` or `SpatialHashGrid`) |
| Narrowphase | `narrowphaseTime` high | Too many overlapping shapes — simplify geometry, use collision filtering |
| Velocity solver | `velocitySolverTime` high | Reduce solver iterations: `space.step(dt, 8, 8)` instead of default 10 |
| Sleeping bodies low | `sleepingBodyCount` near 0 | Ensure sleep is enabled — resting bodies should auto-sleep to save CPU |
| Too many contacts | `contactCount` very high | Use `InteractionFilter` bit masks to skip unnecessary collisions |

See the [Cookbook — Performance Profiling](./cookbook.md#performance-profiling) recipe for full setup.

---

## Deterministic mode doesn't produce identical results across browsers

**This is expected.** nape-js provides "soft" determinism — identical results
on the **same platform** (same browser + OS + architecture). Cross-platform
bit-exact IEEE 754 determinism is not possible in pure JavaScript because
different JS engines handle floating-point edge cases differently.

For multiplayer, use server-authoritative architecture with periodic state
sync rather than relying on cross-platform determinism. See the
[Multiplayer Guide](./multiplayer-guide.md).
