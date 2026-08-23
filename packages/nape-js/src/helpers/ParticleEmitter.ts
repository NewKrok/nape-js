import { Body } from "../phys/Body";
import { BodyType } from "../phys/BodyType";
import { Vec2 } from "../geom/Vec2";
import { Circle } from "../shape/Circle";
import { Polygon } from "../shape/Polygon";
import { Material } from "../phys/Material";
import { InteractionFilter } from "../dynamics/InteractionFilter";
import { CbType } from "../callbacks/CbType";
import { CbEvent } from "../callbacks/CbEvent";
import { InteractionType } from "../callbacks/InteractionType";
import { InteractionListener } from "../callbacks/InteractionListener";
import type { InteractionCallback } from "../callbacks/InteractionCallback";
import type { Space } from "../space/Space";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape used for each spawned particle body. */
export type ParticleShape = "circle" | "polygon";

/** State snapshot passed to the `onSpawn` hook. */
export interface ParticleSpawnState {
  /** World-space spawn position. */
  position: Vec2;
  /** Initial linear velocity. */
  velocity: Vec2;
  /** Initial rotation (rad). */
  angle: number;
  /** Initial angular velocity (rad/s). */
  angularVelocity: number;
  /** Lifetime in seconds. `<= 0` disables auto-death. */
  lifetime: number;
  /** Free-form per-particle payload (color, frame index, damage, etc.). */
  userData: unknown;
}

/**
 * Spawn-position pattern. Position is sampled once per particle, in
 * emitter-local space (relative to {@link ParticleEmitter.origin}), then
 * translated into world space.
 *
 * - `point` — always at the origin.
 * - `rect` — uniform inside an axis-aligned rectangle centred on the origin.
 * - `circle` — uniform inside a disk; `hollow: true` samples the rim only.
 * - `arc` — on the rim of a circular arc, `angle*` in radians.
 * - `custom` — user-provided sampler. Receives the emitter's RNG.
 */
export type SpawnPattern =
  | { kind: "point" }
  | { kind: "rect"; width: number; height: number }
  | { kind: "circle"; radius: number; hollow?: boolean }
  | { kind: "arc"; radius: number; angleStart: number; angleEnd: number }
  | { kind: "custom"; sample: (rng: () => number) => Vec2 };

/**
 * Initial-velocity pattern. The local spawn position is passed to the
 * `radial` and `custom` samplers so the velocity can depend on where the
 * particle was spawned (radial = "outward from origin").
 *
 * - `fixed` — every particle gets the same velocity vector.
 * - `cone` — uniformly random direction inside a cone of half-width
 *   `spread` rad, centred on `direction` rad. Speed uniform in
 *   `[speedMin, speedMax]`.
 * - `radial` — outward from the spawn point relative to the origin.
 *   Speed uniform in `[speedMin, speedMax]`. If the spawn point is exactly
 *   at the origin, falls back to a random direction.
 * - `custom` — user-provided sampler. Receives RNG and the local spawn
 *   position.
 */
export type VelocityPattern =
  | { kind: "fixed"; value: Vec2 }
  | { kind: "cone"; direction: number; spread: number; speedMin: number; speedMax: number }
  | { kind: "radial"; speedMin: number; speedMax: number }
  | { kind: "custom"; sample: (rng: () => number, localPos: Vec2) => Vec2 };

/**
 * What to do when {@link ParticleEmitterOptions.maxParticles} is full and a
 * new spawn is requested.
 *
 * - `drop-oldest` (default) — kill the oldest live particle to make room for
 *   the new one. Keeps emitter responsive (e.g. bullets always come out).
 * - `drop-new` — silently drop the new spawn. Protects already-visible
 *   particles from churn.
 */
export type ParticleOverflowPolicy = "drop-oldest" | "drop-new";

/** Reason a particle was killed, passed to `onDeath`. */
export type ParticleDeathReason = "lifetime" | "manual" | "bounds";

/** World-space rectangle outside which particles auto-die. */
export interface ParticleBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Configuration options for {@link ParticleEmitter}. */
export interface ParticleEmitterOptions {
  /** Space the emitted particle bodies live in. Required. */
  space: Space;

  /**
   * Spawn anchor. A `Vec2` is captured by reference (mutating it after
   * construction moves the emitter); a `Body` is tracked by position each
   * spawn (the body does not need to be in the same space). Required.
   */
  origin: Vec2 | Body;

  /** Spawn-position pattern. @default `{ kind: "point" }` */
  spawn?: SpawnPattern;

  /** Initial velocity pattern. @default `{ kind: "fixed", value: (0, 0) }` */
  velocity?: VelocityPattern;

  /**
   * Continuous spawn rate in particles/second. Accumulated across `update()`
   * calls — fractional rates work. `0` disables continuous spawning (use
   * {@link ParticleEmitter.emit} for manual bursts).
   * @default `0`
   */
  rate?: number;

  /**
   * Periodic-burst count (particles per burst). Combined with
   * `burstInterval`, fires a burst every `burstInterval` seconds.
   * @default `0`
   */
  burstCount?: number;

  /**
   * Period of automatic bursts in seconds. Has no effect when `burstCount`
   * is `0`.
   * @default `0`
   */
  burstInterval?: number;

  /**
   * Maximum simultaneously alive particles. The pool size is capped at this
   * value too. @default `512`
   */
  maxParticles?: number;

  /** Lifetime range minimum (s). @default `1` */
  lifetimeMin?: number;
  /** Lifetime range maximum (s). @default `1` */
  lifetimeMax?: number;

  /** Body shape for each particle. @default `"circle"` */
  particleShape?: ParticleShape;

  /** Radius for circle particles. Ignored for polygon. @default `2` */
  particleRadius?: number;

  /**
   * Polygon vertices in body-local space (used when
   * `particleShape: "polygon"`). Defaults to a small square.
   */
  particlePolygon?: Vec2[];

  /** Material applied to every particle shape. @default `new Material()` */
  particleMaterial?: Material;

  /**
   * Filter applied to every particle shape. If omitted and `selfCollision`
   * is `false`, the emitter generates a self-excluding filter automatically.
   */
  particleFilter?: InteractionFilter;

  /**
   * Collision-callback type tagged on every particle body. Required for
   * `onCollide` to fire. The emitter never auto-creates one — pass your own
   * if you need it (so multiple emitters can share a type, or a single
   * emitter can match a user-defined cbType).
   */
  particleCbType?: CbType;

  /** Whether particles can rotate. @default `true` */
  allowRotation?: boolean;

  /**
   * When `false` and no explicit `particleFilter` is given, particles
   * receive a generated filter that skips its own group — particles in the
   * same emitter never collide with each other. Has no effect when
   * `particleFilter` is provided. @default `false`
   */
  selfCollision?: boolean;

  /** Policy when `maxParticles` is reached. @default `"drop-oldest"` */
  overflowPolicy?: ParticleOverflowPolicy;

  /** Optional world-space bounds — particles outside die instantly. */
  bounds?: ParticleBounds;

  /**
   * Deterministic RNG. All emitter randomness (spawn jitter, velocity cone,
   * lifetime sampling) flows through this. @default `Math.random` */
  random?: () => number;

  /** Whether the emitter is active. @default `true` */
  enabled?: boolean;

  /** Fired once per spawn, after the body is in the space. */
  onSpawn?: (state: ParticleSpawnState, body: Body) => void;

  /** Fired every `update()` for each live particle (ages > 0). */
  onUpdate?: (body: Body, age: number, dt: number) => void;

  /** Fired when a particle dies (lifetime, bounds, manual, or `killAll`). */
  onDeath?: (body: Body, reason: ParticleDeathReason) => void;

  /**
   * Fired when a particle's body collides with another body. Requires
   * `particleCbType` to be set. The handler runs from inside a Space
   * callback — do not mutate the space synchronously; use
   * {@link ParticleEmitter.requestKill} for deferred cleanup.
   */
  onCollide?: (body: Body, other: Body) => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEFAULT_POLYGON: ReadonlyArray<readonly [number, number]> = [
  [-2, -2],
  [2, -2],
  [2, 2],
  [-2, 2],
];

/** Bit assigned to the next auto-generated self-exclusion filter. */
let _nextSelfFilterBit = 1;

function makeSelfExcludingFilter(): InteractionFilter {
  // Round-robin through the lower 30 bits — 30 distinct emitters before the
  // pattern repeats, which is far more than any sane scene will use. Bit 0
  // is reserved for the engine default group so we start at bit 1.
  const bit = 1 << _nextSelfFilterBit;
  _nextSelfFilterBit = (_nextSelfFilterBit % 30) + 1;
  // collisionGroup = bit, collisionMask = ~bit (collide with everything
  // except own group).
  return new InteractionFilter(bit, ~bit);
}

// ---------------------------------------------------------------------------
// ParticleEmitter
// ---------------------------------------------------------------------------

/**
 * Physics-aware particle emitter — a pooled, lifecycle-managed swarm of
 * dynamic bodies. Each particle is a real {@link Body} with a {@link Circle}
 * or {@link Polygon} shape, so it collides with the world, reacts to
 * gravity / fluids / forces, and triggers callbacks like any other body.
 *
 * @example
 * ```ts
 * // Volcano: emit lava drops upward in a 40-deg cone.
 * const volcano = new ParticleEmitter({
 *   space,
 *   origin: new Vec2(400, 100),
 *   velocity: {
 *     kind: "cone",
 *     direction: -Math.PI / 2,
 *     spread: Math.PI / 9,
 *     speedMin: 350,
 *     speedMax: 600,
 *   },
 *   rate: 80,
 *   lifetimeMin: 4,
 *   lifetimeMax: 8,
 *   particleRadius: 3,
 *   maxParticles: 600,
 * });
 *
 * // Each frame, before space.step():
 * volcano.update(1 / 60);
 * space.step(1 / 60);
 * ```
 */
export class ParticleEmitter {
  // ----- public, runtime-mutable -----
  enabled: boolean;
  origin: Vec2 | Body;
  spawn: SpawnPattern;
  velocity: VelocityPattern;
  rate: number;
  burstCount: number;
  burstInterval: number;
  maxParticles: number;
  lifetimeMin: number;
  lifetimeMax: number;
  allowRotation: boolean;
  overflowPolicy: ParticleOverflowPolicy;
  bounds: ParticleBounds | null;
  onSpawn: ((state: ParticleSpawnState, body: Body) => void) | null;
  onUpdate: ((body: Body, age: number, dt: number) => void) | null;
  onDeath: ((body: Body, reason: ParticleDeathReason) => void) | null;
  onCollide: ((body: Body, other: Body) => void) | null;

  // ----- public, read-only after construction -----
  readonly space: Space;
  readonly particleShape: ParticleShape;
  readonly particleRadius: number;
  readonly particlePolygon: Vec2[] | null;
  readonly particleMaterial: Material;
  readonly particleFilter: InteractionFilter;
  readonly particleCbType: CbType | null;
  readonly random: () => number;

  // ----- internal -----
  private _alive: Body[] = [];
  /**
   * Body -> its index in `_alive`, kept in sync by `_spawnOne` / `_killAt`.
   * Turns the per-collision membership tests and `_flushKillSet` lookups from
   * O(alive) scans into O(1) hits.
   */
  private _aliveIndex: Map<Body, number> = new Map();
  private _ages: number[] = [];
  private _lifetimes: number[] = [];
  private _pool: Body[] = [];
  private _totalSpawned = 0;
  private _rateAccumulator = 0;
  private _burstAccumulator = 0;
  private _killSet: Set<Body> | null = null;
  private _listener: InteractionListener | null = null;
  private _destroyed = false;

  constructor(options: ParticleEmitterOptions) {
    if (options == null) throw new Error("options is required");
    if (options.space == null) throw new Error("options.space is required");
    if (options.origin == null) throw new Error("options.origin is required");

    const lifetimeMin = options.lifetimeMin ?? 1;
    const lifetimeMax = options.lifetimeMax ?? 1;
    if (!isFinite(lifetimeMin) || lifetimeMin < 0) {
      throw new Error("options.lifetimeMin must be >= 0");
    }
    if (!isFinite(lifetimeMax) || lifetimeMax < 0) {
      throw new Error("options.lifetimeMax must be >= 0");
    }
    if (lifetimeMax < lifetimeMin) {
      throw new Error("options.lifetimeMax must be >= options.lifetimeMin");
    }

    const maxParticles = options.maxParticles ?? 512;
    if (!Number.isInteger(maxParticles) || maxParticles < 0) {
      throw new Error("options.maxParticles must be a non-negative integer");
    }

    const rate = options.rate ?? 0;
    if (!isFinite(rate) || rate < 0) {
      throw new Error("options.rate must be >= 0");
    }
    const burstCount = options.burstCount ?? 0;
    if (!Number.isInteger(burstCount) || burstCount < 0) {
      throw new Error("options.burstCount must be a non-negative integer");
    }
    const burstInterval = options.burstInterval ?? 0;
    if (!isFinite(burstInterval) || burstInterval < 0) {
      throw new Error("options.burstInterval must be >= 0");
    }

    const radius = options.particleRadius ?? 2;
    if (!isFinite(radius) || radius <= 0) {
      throw new Error("options.particleRadius must be > 0");
    }

    this.space = options.space;
    this.origin = options.origin;
    this.spawn = options.spawn ?? { kind: "point" };
    this.velocity = options.velocity ?? { kind: "fixed", value: new Vec2(0, 0) };
    this.rate = rate;
    this.burstCount = burstCount;
    this.burstInterval = burstInterval;
    this.maxParticles = maxParticles;
    this.lifetimeMin = lifetimeMin;
    this.lifetimeMax = lifetimeMax;
    this.allowRotation = options.allowRotation ?? true;
    this.overflowPolicy = options.overflowPolicy ?? "drop-oldest";
    this.bounds = options.bounds ?? null;
    this.enabled = options.enabled ?? true;

    this.particleShape = options.particleShape ?? "circle";
    this.particleRadius = radius;
    this.particlePolygon = options.particlePolygon ?? null;
    this.particleMaterial = options.particleMaterial ?? new Material();
    this.particleFilter =
      options.particleFilter ??
      (options.selfCollision === true ? new InteractionFilter() : makeSelfExcludingFilter());
    this.particleCbType = options.particleCbType ?? null;
    this.random = options.random ?? Math.random;

    this.onSpawn = options.onSpawn ?? null;
    this.onUpdate = options.onUpdate ?? null;
    this.onDeath = options.onDeath ?? null;
    this.onCollide = options.onCollide ?? null;

    if (this.onCollide && this.particleCbType) {
      this._installCollisionListener();
    }
  }

  // -----------------------------------------------------------------------
  // Public accessors
  // -----------------------------------------------------------------------

  /** Live particle bodies. Read-only — do not mutate. */
  get active(): ReadonlyArray<Body> {
    return this._alive;
  }

  /**
   * Per-particle age in seconds, indexed parallel to {@link active}.
   * Read-only — do not mutate. Useful for renderers that fade particles
   * by `age / lifetime`.
   */
  get ages(): ReadonlyArray<number> {
    return this._ages;
  }

  /**
   * Per-particle lifetime in seconds, indexed parallel to {@link active}.
   * Read-only — do not mutate.
   */
  get lifetimes(): ReadonlyArray<number> {
    return this._lifetimes;
  }

  /** Number of bodies currently in the recycle pool. */
  get poolSize(): number {
    return this._pool.length;
  }

  /** Total spawn count over the lifetime of this emitter. */
  get totalSpawned(): number {
    return this._totalSpawned;
  }

  // -----------------------------------------------------------------------
  // Origin resolution
  // -----------------------------------------------------------------------

  private _originXY(): { x: number; y: number } {
    const o = this.origin;
    if (o instanceof Body) {
      const p = o.position;
      return { x: p.x, y: p.y };
    }
    return { x: o.x, y: o.y };
  }

  // -----------------------------------------------------------------------
  // Sampling
  // -----------------------------------------------------------------------

  /** Sample a position in emitter-local space. */
  private _sampleSpawn(): { lx: number; ly: number } {
    const r = this.random;
    const s = this.spawn;
    switch (s.kind) {
      case "point":
        return { lx: 0, ly: 0 };
      case "rect": {
        const lx = (r() - 0.5) * s.width;
        const ly = (r() - 0.5) * s.height;
        return { lx, ly };
      }
      case "circle": {
        const ang = r() * Math.PI * 2;
        const rad = s.hollow ? s.radius : s.radius * Math.sqrt(r());
        return { lx: Math.cos(ang) * rad, ly: Math.sin(ang) * rad };
      }
      case "arc": {
        const t = r();
        const ang = s.angleStart + (s.angleEnd - s.angleStart) * t;
        return { lx: Math.cos(ang) * s.radius, ly: Math.sin(ang) * s.radius };
      }
      case "custom": {
        const v = s.sample(r);
        return { lx: v.x, ly: v.y };
      }
    }
  }

  /** Sample initial velocity given the local spawn position. */
  private _sampleVelocity(lx: number, ly: number): { vx: number; vy: number } {
    const r = this.random;
    const v = this.velocity;
    switch (v.kind) {
      case "fixed":
        return { vx: v.value.x, vy: v.value.y };
      case "cone": {
        const ang = v.direction + (r() * 2 - 1) * v.spread;
        const speed = v.speedMin + r() * (v.speedMax - v.speedMin);
        return { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed };
      }
      case "radial": {
        const len = Math.sqrt(lx * lx + ly * ly);
        const speed = v.speedMin + r() * (v.speedMax - v.speedMin);
        if (len < 1e-9) {
          const ang = r() * Math.PI * 2;
          return { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed };
        }
        const inv = speed / len;
        return { vx: lx * inv, vy: ly * inv };
      }
      case "custom": {
        const out = v.sample(r, new Vec2(lx, ly));
        return { vx: out.x, vy: out.y };
      }
    }
  }

  private _sampleLifetime(): number {
    if (this.lifetimeMax === this.lifetimeMin) return this.lifetimeMin;
    return this.lifetimeMin + this.random() * (this.lifetimeMax - this.lifetimeMin);
  }

  // -----------------------------------------------------------------------
  // Body construction & pool
  // -----------------------------------------------------------------------

  private _buildBody(): Body {
    const body = new Body(BodyType.DYNAMIC);
    body.allowRotation = this.allowRotation;
    if (this.particleShape === "circle") {
      body.shapes.add(new Circle(this.particleRadius, undefined, this.particleMaterial));
    } else {
      const verts = this.particlePolygon ?? DEFAULT_POLYGON.map(([x, y]) => new Vec2(x, y));
      body.shapes.add(new Polygon(verts, this.particleMaterial));
    }
    // Apply the (possibly self-excluding) filter to every shape.
    for (let i = 0; i < body.shapes.length; i++) {
      body.shapes.at(i).filter = this.particleFilter;
    }
    if (this.particleCbType) body.cbTypes.add(this.particleCbType);
    return body;
  }

  /** Take a body out of the pool, or build a new one. */
  private _acquire(): Body {
    const pooled = this._pool.pop();
    return pooled ?? this._buildBody();
  }

  /**
   * Reset a body's per-life mutable state and add it to the space at the
   * given world position with the given velocity.
   */
  private _reviveBody(
    body: Body,
    wx: number,
    wy: number,
    vx: number,
    vy: number,
    angle: number,
    angularVel: number,
  ): void {
    // Detach first if (somehow) already in a space; otherwise re-assigning
    // body.space throws.
    if (body.space != null) body.space = null;
    body.position = Vec2.weak(wx, wy);
    body.velocity = Vec2.weak(vx, vy);
    body.rotation = angle;
    body.angularVel = angularVel;
    body.force = Vec2.weak(0, 0);
    body.space = this.space;
  }

  // -----------------------------------------------------------------------
  // emit / spawnOne
  // -----------------------------------------------------------------------

  /**
   * Spawn `count` particles immediately. Returns the live bodies that were
   * spawned (length may be < `count` when the emitter is full and
   * `overflowPolicy` is `"drop-new"`).
   */
  emit(count: number): Body[] {
    if (this._destroyed) {
      throw new Error("ParticleEmitter has been destroyed");
    }
    if (!this.enabled) return [];
    if (count <= 0) return [];
    const out: Body[] = [];
    for (let i = 0; i < count; i++) {
      const body = this._spawnOne();
      if (body) out.push(body);
    }
    return out;
  }

  /** Spawn a single particle. Returns the body or `null` if dropped. */
  private _spawnOne(): Body | null {
    if (this._alive.length >= this.maxParticles) {
      if (this.overflowPolicy === "drop-new") return null;
      // drop-oldest: kill index 0, then proceed.
      if (this._alive.length > 0) this._killAt(0, "lifetime");
      // If maxParticles is 0, both branches above are no-ops and we still
      // can't spawn.
      if (this._alive.length >= this.maxParticles) return null;
    }

    const { x: ox, y: oy } = this._originXY();
    const { lx, ly } = this._sampleSpawn();
    const { vx, vy } = this._sampleVelocity(lx, ly);
    const lifetime = this._sampleLifetime();
    const wx = ox + lx;
    const wy = oy + ly;

    const body = this._acquire();
    this._reviveBody(body, wx, wy, vx, vy, 0, 0);

    this._aliveIndex.set(body, this._alive.length);
    this._alive.push(body);
    this._ages.push(0);
    this._lifetimes.push(lifetime);
    this._totalSpawned++;

    if (this.onSpawn) {
      const state: ParticleSpawnState = {
        position: new Vec2(wx, wy),
        velocity: new Vec2(vx, vy),
        angle: 0,
        angularVelocity: 0,
        lifetime,
        userData: body.userData,
      };
      this.onSpawn(state, body);
    }
    return body;
  }

  // -----------------------------------------------------------------------
  // Death / pool return
  // -----------------------------------------------------------------------

  /** Remove the live particle at `index` (swap-pop) and return it to the pool. */
  private _killAt(index: number, reason: ParticleDeathReason): void {
    const body = this._alive[index];
    const last = this._alive.length - 1;
    if (index !== last) {
      const moved = this._alive[last];
      this._alive[index] = moved;
      this._ages[index] = this._ages[last];
      this._lifetimes[index] = this._lifetimes[last];
      this._aliveIndex.set(moved, index);
    }
    this._aliveIndex.delete(body);
    this._alive.pop();
    this._ages.pop();
    this._lifetimes.pop();

    if (body.space === this.space) body.space = null;
    body.velocity = Vec2.weak(0, 0);
    body.angularVel = 0;
    this._pool.push(body);

    if (this.onDeath) this.onDeath(body, reason);
  }

  /**
   * Mark a body for death at the start of the next `update()` call. Safe to
   * call from inside collision callbacks. No-op if the body is not a live
   * particle of this emitter.
   */
  requestKill(body: Body): void {
    if (!this._killSet) this._killSet = new Set();
    this._killSet.add(body);
  }

  private _flushKillSet(): void {
    const set = this._killSet;
    if (!set || set.size === 0) return;
    // Iterate a snapshot — _killAt mutates `_alive`.
    for (const body of set) {
      const idx = this._aliveIndex.get(body);
      if (idx !== undefined) this._killAt(idx, "manual");
    }
    set.clear();
  }

  /** Kill every live particle. Bodies return to the pool. */
  killAll(): void {
    while (this._alive.length > 0) {
      this._killAt(this._alive.length - 1, "manual");
    }
  }

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  /**
   * Advance lifetimes, fire `onUpdate`, kill expired / out-of-bounds
   * particles, and run continuous / periodic spawning.
   *
   * Call once per frame, **before** `space.step()`. `dt` should match the
   * step size you'll pass to `space.step()`.
   */
  update(dt: number): void {
    if (this._destroyed) {
      throw new Error("ParticleEmitter has been destroyed");
    }
    if (dt < 0) throw new Error("dt must be >= 0");

    // 1) deferred kills first so `_alive` reflects user requests before we
    //    apply lifetime / bounds checks.
    this._flushKillSet();

    // 2) Age + lifetime / bounds checks. Iterate backwards so swap-pop is
    //    safe.
    const bounds = this.bounds;
    for (let i = this._alive.length - 1; i >= 0; i--) {
      const body = this._alive[i];
      const newAge = this._ages[i] + dt;
      this._ages[i] = newAge;

      if (this._lifetimes[i] > 0 && newAge >= this._lifetimes[i]) {
        this._killAt(i, "lifetime");
        continue;
      }
      if (bounds) {
        const p = body.position;
        if (
          p.x < bounds.x ||
          p.y < bounds.y ||
          p.x > bounds.x + bounds.w ||
          p.y > bounds.y + bounds.h
        ) {
          this._killAt(i, "bounds");
          continue;
        }
      }
      if (this.onUpdate) this.onUpdate(body, newAge, dt);
    }

    if (!this.enabled) return;

    // 3) Continuous emission.
    if (this.rate > 0) {
      this._rateAccumulator += this.rate * dt;
      // Cap by available room so we don't loop forever if rate is huge.
      const room = this.maxParticles - this._alive.length;
      let n = Math.floor(this._rateAccumulator);
      if (this.overflowPolicy === "drop-new" && n > room) n = Math.max(0, room);
      // drop-oldest can produce up to maxParticles per frame even when full,
      // so don't cap it here.
      if (n > 0) {
        for (let i = 0; i < n; i++) this._spawnOne();
        this._rateAccumulator -= n;
      }
    }

    // 4) Periodic bursts.
    if (this.burstCount > 0 && this.burstInterval > 0) {
      this._burstAccumulator += dt;
      while (this._burstAccumulator >= this.burstInterval) {
        this._burstAccumulator -= this.burstInterval;
        for (let i = 0; i < this.burstCount; i++) this._spawnOne();
      }
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  /**
   * Remove every body (live + pooled) from the space, drop the listener,
   * and mark the emitter unusable. Subsequent `update` / `emit` calls
   * throw.
   */
  destroy(): void {
    if (this._destroyed) return;
    this.killAll();
    for (const body of this._pool) {
      if (body.space === this.space) body.space = null;
    }
    this._pool.length = 0;
    if (this._listener) {
      this._listener.space = null;
      this._listener = null;
    }
    this._destroyed = true;
  }

  // -----------------------------------------------------------------------
  // Collision listener
  // -----------------------------------------------------------------------

  private _installCollisionListener(): void {
    if (!this.particleCbType || !this.onCollide) return;
    const listener = new InteractionListener(
      CbEvent.BEGIN,
      InteractionType.COLLISION,
      this.particleCbType,
      CbType.ANY_BODY,
      (cb: InteractionCallback) => {
        if (!this.onCollide) return;
        // Resolve which interactor is the particle (shares particleCbType)
        // and which is the "other" body. The two interactors here are
        // shapes' parent bodies (or bodies, depending on internal mapping).
        const a = cb.int1 as unknown as Body;
        const b = cb.int2 as unknown as Body;
        const aIsParticle = this._aliveIndex.has(a);
        const bIsParticle = this._aliveIndex.has(b);
        if (aIsParticle) this.onCollide(a, b);
        else if (bIsParticle) this.onCollide(b, a);
      },
    );
    this.space.listeners.add(listener);
    this._listener = listener;
  }
}

// ---------------------------------------------------------------------------
// ParticleEmitterGroup
// ---------------------------------------------------------------------------

/**
 * Composable collection of {@link ParticleEmitter}s — analogous to
 * {@link RadialGravityFieldGroup}. One `update(dt)` runs every member emitter.
 */
export class ParticleEmitterGroup {
  /** Ordered list of emitters. Mutate via {@link add} / {@link remove}. */
  readonly emitters: ParticleEmitter[] = [];

  /** Add an emitter to the group and return it. */
  add(emitter: ParticleEmitter): ParticleEmitter {
    this.emitters.push(emitter);
    return emitter;
  }

  /** Remove an emitter from the group. Returns `true` if it was present. */
  remove(emitter: ParticleEmitter): boolean {
    const i = this.emitters.indexOf(emitter);
    if (i < 0) return false;
    this.emitters.splice(i, 1);
    return true;
  }

  /** Remove all emitters (does NOT call `destroy` on them). */
  clear(): void {
    this.emitters.length = 0;
  }

  /** Number of emitters currently in the group. */
  get length(): number {
    return this.emitters.length;
  }

  /** Advance every emitter. */
  update(dt: number): void {
    for (const e of this.emitters) e.update(dt);
  }

  /** Call `destroy()` on every emitter and clear the group. */
  destroyAll(): void {
    for (const e of this.emitters) e.destroy();
    this.emitters.length = 0;
  }
}
