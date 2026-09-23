# Anti-Patterns

<!-- Last verified: v3.42.3 -->

Common mistakes that cause bugs, poor performance, or confusion in nape-js.
Each section shows the wrong approach, explains why it's a problem, and gives
the correct alternative.

---

## Memory & Performance

### Creating Vec2 every frame

Allocating `new Vec2()` inside the game loop creates garbage every frame,
triggering GC pauses that cause visible stuttering.

```typescript
// BAD — 60 allocations/sec, GC pressure
function update() {
  body.applyImpulse(new Vec2(10, 0));
}

// GOOD — reuse a pre-allocated vector
const impulse = new Vec2(10, 0);
function update() {
  body.applyImpulse(impulse);
}

// ALSO GOOD — use the object pool
function update() {
  const v = Vec2.get(10, 0);
  body.applyImpulse(v);
  v.dispose(); // returns to pool
}
```

### Using `Vec2.weak()` and keeping a reference

Weak vectors are automatically disposed after their first use as a method
argument. Holding a reference to them leads to "disposed Vec2" errors.

```typescript
// BAD — weak is auto-disposed after applyImpulse reads it
const v = Vec2.weak(10, 0);
body.applyImpulse(v);
console.log(v.x); // ERROR: disposed

// GOOD — use Vec2.get() when you need the value after
const v = Vec2.get(10, 0);
body.applyImpulse(v);
console.log(v.x); // OK
v.dispose();
```

### Iterating `space.bodies` to find one body

Looping through all bodies every frame to find a specific one is O(n).

```typescript
// BAD — linear search every frame
function update() {
  for (const body of space.bodies) {
    if (body.userData.id === "player") {
      // do something
    }
  }
}

// GOOD — keep a direct reference
const player = new Body(BodyType.DYNAMIC);
// ... later:
function update() {
  player.position; // direct access, O(1)
}
```

---

## Body & Shape Setup

### Using DYNAMIC bodies for character movement

Force/impulse-based character movement on dynamic bodies is inherently
imprecise — the character slides on slopes, bounces off walls, and can't
do pixel-perfect movement.

```typescript
// BAD — sloppy, slides, hard to control
function update() {
  player.applyImpulse(new Vec2(moveX * 100, 0));
  if (jump) player.applyImpulse(new Vec2(0, -5000));
}

// GOOD — geometric controller for precise platformer movement
const cc = new CharacterController(space, player, {
  maxSlopeAngle: Math.PI / 4,
});
cc.setVelocity(moveX * 200, player.velocity.y);
```

### Setting `body.space` on compound members

Bodies inside a Compound share the compound's space assignment.
Setting `.space` on a member throws an error.

```typescript
// BAD — throws
const child = compound.bodies.at(0);
child.space = space;

// GOOD — assign space on the root compound
compound.space = space;
```

### Setting position directly on kinematic bodies

Setting `position` directly on a kinematic body teleports it — the physics
solver doesn't know it moved, so it won't push dynamic bodies out of the way.

```typescript
// BAD — teleports, dynamic bodies clip through
platform.position.x = targetX;

// GOOD — set velocity so the solver handles contacts
platform.velocity.x = (targetX - platform.position.x) / dt;
```

### Forgetting `body.allowRotation = false` on characters

Characters without rotation locking will tumble and spin when they hit walls
or land on slopes.

```typescript
// BAD — character rotates randomly
const player = new Body(BodyType.DYNAMIC);
player.shapes.add(new Circle(14));

// GOOD — lock rotation for character controllers
const player = new Body(BodyType.DYNAMIC);
player.shapes.add(new Circle(14));
player.allowRotation = false;
```

---

## Constraints

### Using `CbType.ANY_CONSTRAINT` for BREAK events

This is a known gotcha — `ANY_CONSTRAINT` only works for generic
constraint queries, not for BREAK or SLEEP event listeners.

```typescript
// BAD — listener never fires
space.listeners.add(
  new ConstraintListener(CbEvent.BREAK, CbType.ANY_CONSTRAINT, handler),
);

// GOOD — create a dedicated CbType
const breakableTag = new CbType();
joint.cbTypes.add(breakableTag);
space.listeners.add(
  new ConstraintListener(CbEvent.BREAK, breakableTag, handler),
);
```

### Making every constraint stiff

Stiff constraints (the default) create rigid connections. For natural-looking
physics (ragdolls, ropes, vehicles), soft constraints are almost always better.

```typescript
// BAD — rigid, robotic ragdoll joints
const neck = new AngleJoint(torso, head, -0.4, 0.4);
neck.space = space;

// GOOD — soft joint with natural give
const neck = new AngleJoint(torso, head, -0.4, 0.4);
neck.stiff = false;
neck.frequency = 8;
neck.damping = 0.6;
neck.space = space;
```

---

## Collision & Filtering

### Enabling CCD on every body

CCD (continuous collision detection) adds significant CPU cost. Only use it
on bodies that actually move fast enough to tunnel.

```typescript
// BAD — unnecessary CCD on slow objects
for (const body of space.bodies) {
  body.isBullet = true;
}

// GOOD — only on fast-moving bodies
bullet.isBullet = true;
// Leave slow boxes, platforms, etc. with isBullet = false (default)
```

### Not calling `space.step()` before raycasting

The broadphase only registers shapes after at least one simulation step.
Raycasting against static bodies before any step returns null.

```typescript
// BAD — raycast on freshly created space
const space = new Space(new Vec2(0, 600));
floor.space = space;
space.rayCast(ray); // null — broadphase hasn't indexed yet

// GOOD — step first
space.step(1 / 60);
space.rayCast(ray); // works
```

### Forgetting that `ParticleEmitter` particles are real bodies

Every particle is a full `Body` with shape, mass, and collisions, so it shows up in **every** filter check — including the `CharacterController` ground/wall raycasts. With the default auto-generated CC filter, the player can stand on their own bullets/sparks/debris and "fly" by spamming fire.

```typescript
// BAD — bullets emitted from the player's centre count as ground.
//   Default CC filter only excludes the character itself; particles still
//   intersect the downward ground-detection ray, so cc.grounded stays true
//   above a floating bullet and Space-spam → infinite jumps.
new ParticleEmitter({ origin: player, /* ... */ });
new CharacterController(space, player, { /* no `filter` */ });

// GOOD — pick a dedicated bit for particles, mask it out of the CC filter.
const PARTICLE_GROUP = 1 << 10;
const CHAR_GROUP     = 1 << 8;

new ParticleEmitter({
  origin: player,
  particleFilter: new InteractionFilter(PARTICLE_GROUP, ~(CHAR_GROUP | PARTICLE_GROUP)),
  /* ... */
});

new CharacterController(space, player, {
  filter: new InteractionFilter(1, ~(CHAR_GROUP | PARTICLE_GROUP)), // skip self + particles
  /* ... */
});
```

The same fix prevents bullets from deflecting off floating debris/spark clouds left by previous shots — give every emitter the same `PARTICLE_GROUP` and have projectiles mask it out of their own mask. See the [Particle Emitter cookbook recipe](./cookbook.md#particle-emitter-bullets-sparks-debris) for a complete setup.

---

## Serialization

### Assuming binary preserves userData

Binary serialization (`spaceToBinary`) is compact but does **not** preserve
`userData` on bodies. Use JSON if you need custom data.

```typescript
// BAD — userData lost
body.userData.type = "player";
const bin = spaceToBinary(space);
const restored = spaceFromBinary(bin);
restored.bodies.at(0).userData.type; // undefined!

// GOOD — use JSON for userData preservation
const json = spaceToJSON(space);
const restored = spaceFromJSON(json);
restored.bodies.at(0).userData.type; // "player"
```

### Serializing every frame in multiplayer

Full space serialization is expensive. For real-time multiplayer, send
only position/velocity deltas or use binary snapshots at a low rate
(e.g., 10 Hz) with client-side interpolation.

---

## Simulation

### Using huge gravity values

Gravity is in pixels/s² (not meters/s²). Earth gravity in a 600px-tall
world is around 600, not 9.8 or 9800.

```typescript
// BAD — objects move at light speed
const space = new Space(new Vec2(0, 9800));

// GOOD — typical for a 600px viewport
const space = new Space(new Vec2(0, 600));
```

### Spawning overlapping bodies

Bodies created inside each other generate extreme separation forces,
causing them to "explode" apart on the first step.

```typescript
// BAD — instant physics explosion
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(400, 300)); // all same position!
  b.shapes.add(new Circle(20));
  b.space = space;
}

// GOOD — space them out
for (let i = 0; i < 10; i++) {
  const b = new Body(BodyType.DYNAMIC, new Vec2(400, 100 + i * 45));
  b.shapes.add(new Circle(20));
  b.space = space;
}
```

### Not disposing removed bodies

Bodies removed from the space should be properly cleaned up to avoid
memory leaks in long-running games.

```typescript
// BAD — body lingers in memory
body.space = null;

// GOOD — also clear references
body.space = null;
body.shapes.clear();
// Drop your reference to the body so GC can collect it
```
