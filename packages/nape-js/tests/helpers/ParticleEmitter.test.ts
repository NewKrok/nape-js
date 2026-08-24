import { describe, it, expect, beforeEach } from "vitest";
import "../../src/core/engine";
import { ParticleEmitter, ParticleEmitterGroup } from "../../src/helpers/ParticleEmitter";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Space } from "../../src/space/Space";
import { CbType } from "../../src/callbacks/CbType";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpace(): Space {
  const s = new Space();
  s.gravity = new Vec2(0, 0);
  return s;
}

/** Tiny linear-congruential RNG for deterministic tests. */
function makeRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

// ---------------------------------------------------------------------------
// Construction & validation
// ---------------------------------------------------------------------------

describe("ParticleEmitter — construction", () => {
  it("constructs with required options + sensible defaults", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    expect(e.enabled).toBe(true);
    expect(e.rate).toBe(0);
    expect(e.maxParticles).toBe(512);
    expect(e.lifetimeMin).toBe(1);
    expect(e.lifetimeMax).toBe(1);
    expect(e.particleShape).toBe("circle");
    expect(e.particleRadius).toBe(2);
    expect(e.overflowPolicy).toBe("drop-oldest");
    expect(e.allowRotation).toBe(true);
    expect(e.totalSpawned).toBe(0);
    expect(e.active.length).toBe(0);
    expect(e.poolSize).toBe(0);
  });

  it("throws on missing space / origin", () => {
    expect(() => new ParticleEmitter(null as never)).toThrow();
    expect(() => new ParticleEmitter({ origin: new Vec2(0, 0) } as never)).toThrow(/space/);
    expect(() => new ParticleEmitter({ space: makeSpace() } as never)).toThrow(/origin/);
  });

  it("throws on invalid lifetime range", () => {
    const space = makeSpace();
    expect(
      () =>
        new ParticleEmitter({
          space,
          origin: new Vec2(0, 0),
          lifetimeMin: 2,
          lifetimeMax: 1,
        }),
    ).toThrow(/lifetimeMax/);
    expect(() => new ParticleEmitter({ space, origin: new Vec2(0, 0), lifetimeMin: -1 })).toThrow();
  });

  it("throws on invalid maxParticles / rate / radius", () => {
    const space = makeSpace();
    expect(
      () => new ParticleEmitter({ space, origin: new Vec2(0, 0), maxParticles: -1 }),
    ).toThrow();
    expect(
      () => new ParticleEmitter({ space, origin: new Vec2(0, 0), maxParticles: 1.5 }),
    ).toThrow();
    expect(() => new ParticleEmitter({ space, origin: new Vec2(0, 0), rate: -1 })).toThrow();
    expect(
      () => new ParticleEmitter({ space, origin: new Vec2(0, 0), particleRadius: 0 }),
    ).toThrow();
  });

  it("accepts a Body as origin and tracks its position", () => {
    const space = makeSpace();
    const anchor = new Body(BodyType.KINEMATIC, new Vec2(100, 50));
    anchor.shapes.add(new Circle(5));
    anchor.space = space;
    const e = new ParticleEmitter({
      space,
      origin: anchor,
      velocity: { kind: "fixed", value: new Vec2(0, 0) },
    });
    e.emit(1);
    expect(e.active[0].position.x).toBeCloseTo(100, 5);
    expect(e.active[0].position.y).toBeCloseTo(50, 5);

    anchor.position = new Vec2(200, 80);
    e.emit(1);
    expect(e.active[1].position.x).toBeCloseTo(200, 5);
    expect(e.active[1].position.y).toBeCloseTo(80, 5);
  });
});

// ---------------------------------------------------------------------------
// Burst emit
// ---------------------------------------------------------------------------

describe("ParticleEmitter — emit()", () => {
  it("spawns exactly N bodies on emit(N)", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    const out = e.emit(7);
    expect(out.length).toBe(7);
    expect(e.active.length).toBe(7);
    expect(e.totalSpawned).toBe(7);
  });

  it("emit(0) and negative count are no-ops", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    expect(e.emit(0)).toEqual([]);
    expect(e.emit(-3)).toEqual([]);
    expect(e.active.length).toBe(0);
  });

  it("emit() while disabled is a no-op", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    e.enabled = false;
    expect(e.emit(5)).toEqual([]);
    expect(e.active.length).toBe(0);
  });

  it("returned bodies are dynamic and added to the space", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(10, 20) });
    const [body] = e.emit(1);
    expect(body.isDynamic()).toBe(true);
    expect(body.space).toBe(space);
    expect(body.shapes.length).toBe(1);
  });

  it("respects maxParticles with drop-new policy", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      maxParticles: 3,
      overflowPolicy: "drop-new",
    });
    e.emit(5);
    expect(e.active.length).toBe(3);
    expect(e.totalSpawned).toBe(3);
  });

  it("drop-oldest policy kills the oldest particle to make room", () => {
    const space = makeSpace();
    const deaths: string[] = [];
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      maxParticles: 3,
      overflowPolicy: "drop-oldest",
      onDeath: (_b, r) => deaths.push(r),
    });
    e.emit(3);
    e.emit(2);
    // Active never exceeds the cap.
    expect(e.active.length).toBe(3);
    // All 5 are counted as spawned.
    expect(e.totalSpawned).toBe(5);
    // Two deaths fired (the two oldest), each tagged as lifetime — that's
    // the synthetic reason drop-oldest reuses internally.
    expect(deaths.length).toBe(2);
  });

  it("maxParticles=0 disables spawning entirely", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      maxParticles: 0,
    });
    e.emit(10);
    expect(e.active.length).toBe(0);
    expect(e.totalSpawned).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Continuous emit (rate)
// ---------------------------------------------------------------------------

describe("ParticleEmitter — continuous rate", () => {
  it("rate=10 spawns 10 in 1 second of dt", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      rate: 10,
    });
    e.update(1.0);
    expect(e.active.length).toBe(10);
    expect(e.totalSpawned).toBe(10);
  });

  it("fractional rate accumulates correctly", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      rate: 0.5, // one every 2s
      lifetimeMin: 100,
      lifetimeMax: 100,
    });
    e.update(1.0); // 1s
    expect(e.totalSpawned).toBe(0);
    e.update(1.5); // 2.5s total → 1 spawn
    expect(e.totalSpawned).toBe(1);
  });

  it("rate=0 spawns nothing", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    for (let i = 0; i < 120; i++) e.update(1 / 60);
    expect(e.totalSpawned).toBe(0);
  });

  it("disabled emitter still ages existing particles", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 0.5,
      lifetimeMax: 0.5,
      rate: 100,
    });
    for (let i = 0; i < 6; i++) e.update(1 / 60); // 0.1s of spawning
    const before = e.active.length;
    expect(before).toBeGreaterThan(0);
    e.enabled = false;
    // Simulate enough time for everyone to die (lifetime 0.5s).
    for (let i = 0; i < 60; i++) e.update(1 / 60);
    expect(e.active.length).toBe(0);
  });

  it("does not exceed maxParticles when rate is large (drop-new)", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      rate: 10000,
      maxParticles: 50,
      lifetimeMin: 100,
      lifetimeMax: 100,
      overflowPolicy: "drop-new",
    });
    e.update(1);
    expect(e.active.length).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Periodic burst
// ---------------------------------------------------------------------------

describe("ParticleEmitter — periodic burst", () => {
  it("fires burstCount every burstInterval seconds", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      burstCount: 5,
      burstInterval: 0.5,
      lifetimeMin: 100,
      lifetimeMax: 100,
    });
    e.update(1.01); // just over 1s — 2 bursts
    expect(e.totalSpawned).toBe(10);
  });

  it("burstCount=0 disables bursts even with interval set", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      burstCount: 0,
      burstInterval: 0.5,
    });
    for (let i = 0; i < 120; i++) e.update(1 / 60);
    expect(e.totalSpawned).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Spawn patterns
// ---------------------------------------------------------------------------

describe("ParticleEmitter — spawn patterns", () => {
  it("point pattern always spawns at origin", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(50, 70) });
    e.emit(20);
    for (const b of e.active) {
      expect(b.position.x).toBeCloseTo(50, 5);
      expect(b.position.y).toBeCloseTo(70, 5);
    }
  });

  it("rect pattern produces positions inside the bounding rect", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      spawn: { kind: "rect", width: 100, height: 40 },
      random: makeRng(42),
    });
    e.emit(50);
    for (const b of e.active) {
      expect(b.position.x).toBeGreaterThanOrEqual(-50);
      expect(b.position.x).toBeLessThanOrEqual(50);
      expect(b.position.y).toBeGreaterThanOrEqual(-20);
      expect(b.position.y).toBeLessThanOrEqual(20);
    }
  });

  it("circle pattern keeps positions inside disk; hollow stays on rim", () => {
    const space = makeSpace();
    const filled = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      spawn: { kind: "circle", radius: 30 },
      random: makeRng(7),
    });
    filled.emit(30);
    for (const b of filled.active) {
      const d = Math.hypot(b.position.x, b.position.y);
      expect(d).toBeLessThanOrEqual(30 + 1e-6);
    }

    const hollow = new ParticleEmitter({
      space: makeSpace(),
      origin: new Vec2(0, 0),
      spawn: { kind: "circle", radius: 30, hollow: true },
      random: makeRng(8),
    });
    hollow.emit(30);
    for (const b of hollow.active) {
      const d = Math.hypot(b.position.x, b.position.y);
      expect(d).toBeCloseTo(30, 5);
    }
  });

  it("arc pattern stays inside the angular slice", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      spawn: { kind: "arc", radius: 20, angleStart: 0, angleEnd: Math.PI / 2 },
      random: makeRng(11),
    });
    e.emit(40);
    for (const b of e.active) {
      const ang = Math.atan2(b.position.y, b.position.x);
      expect(ang).toBeGreaterThanOrEqual(-1e-6);
      expect(ang).toBeLessThanOrEqual(Math.PI / 2 + 1e-6);
      const d = Math.hypot(b.position.x, b.position.y);
      expect(d).toBeCloseTo(20, 5);
    }
  });

  it("custom spawn pattern receives RNG and is honoured", () => {
    const space = makeSpace();
    const seen: Array<() => number> = [];
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      spawn: {
        kind: "custom",
        sample: (rng) => {
          seen.push(rng);
          return new Vec2(123, 456);
        },
      },
    });
    e.emit(3);
    expect(seen.length).toBe(3);
    for (const b of e.active) {
      expect(b.position.x).toBeCloseTo(123, 5);
      expect(b.position.y).toBeCloseTo(456, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// Velocity patterns
// ---------------------------------------------------------------------------

describe("ParticleEmitter — velocity patterns", () => {
  it("fixed velocity is identical for every particle", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      velocity: { kind: "fixed", value: new Vec2(50, -20) },
    });
    e.emit(5);
    for (const b of e.active) {
      expect(b.velocity.x).toBeCloseTo(50, 5);
      expect(b.velocity.y).toBeCloseTo(-20, 5);
    }
  });

  it("cone velocity stays within direction +/- spread and speed range", () => {
    const space = makeSpace();
    const dir = Math.PI / 4;
    const spread = Math.PI / 6;
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      velocity: {
        kind: "cone",
        direction: dir,
        spread,
        speedMin: 100,
        speedMax: 200,
      },
      random: makeRng(99),
    });
    e.emit(50);
    for (const b of e.active) {
      const speed = Math.hypot(b.velocity.x, b.velocity.y);
      expect(speed).toBeGreaterThanOrEqual(100 - 1e-6);
      expect(speed).toBeLessThanOrEqual(200 + 1e-6);
      const ang = Math.atan2(b.velocity.y, b.velocity.x);
      // Account for wraparound — easiest: project onto direction.
      const dx = Math.cos(ang) * Math.cos(dir) + Math.sin(ang) * Math.sin(dir);
      expect(Math.acos(Math.min(1, dx))).toBeLessThanOrEqual(spread + 1e-6);
    }
  });

  it("radial velocity points outward from spawn position", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      spawn: { kind: "circle", radius: 20, hollow: true },
      velocity: { kind: "radial", speedMin: 100, speedMax: 100 },
      random: makeRng(33),
    });
    e.emit(30);
    for (const b of e.active) {
      // velocity should be parallel to position
      const px = b.position.x;
      const py = b.position.y;
      const vx = b.velocity.x;
      const vy = b.velocity.y;
      const cross = px * vy - py * vx;
      expect(Math.abs(cross)).toBeLessThan(1e-3);
      const dot = px * vx + py * vy;
      expect(dot).toBeGreaterThan(0); // outward
    }
  });
});

// ---------------------------------------------------------------------------
// Lifetime
// ---------------------------------------------------------------------------

describe("ParticleEmitter — lifetime", () => {
  it("particles die when their age reaches lifetime", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 0.5,
      lifetimeMax: 0.5,
    });
    e.emit(3);
    e.update(0.4);
    expect(e.active.length).toBe(3);
    e.update(0.2);
    expect(e.active.length).toBe(0);
  });

  it("lifetime=0 disables auto-death", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 0,
      lifetimeMax: 0,
    });
    e.emit(2);
    for (let i = 0; i < 600; i++) e.update(1 / 60); // 10 sim seconds
    expect(e.active.length).toBe(2);
  });

  it("lifetime range produces values inside [min, max]", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 0.5,
      lifetimeMax: 1.5,
      random: makeRng(123),
    });
    const seen: number[] = [];
    e.onSpawn = (state) => seen.push(state.lifetime);
    e.emit(50);
    for (const lt of seen) {
      expect(lt).toBeGreaterThanOrEqual(0.5);
      expect(lt).toBeLessThanOrEqual(1.5);
    }
  });
});

// ---------------------------------------------------------------------------
// Pool reuse
// ---------------------------------------------------------------------------

describe("ParticleEmitter — pool reuse", () => {
  it("dead particles return to the pool and are reused", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 0.1,
      lifetimeMax: 0.1,
    });
    const first = e.emit(3).slice();
    e.update(0.2); // all dead
    expect(e.active.length).toBe(0);
    expect(e.poolSize).toBe(3);
    const second = e.emit(3);
    // Same body objects (referential equality), order may differ.
    for (const b of second) expect(first).toContain(b);
    expect(e.poolSize).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bounds kill
// ---------------------------------------------------------------------------

describe("ParticleEmitter — bounds", () => {
  it("particles outside bounds die immediately on update", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(1000, 1000), // outside the bounds below
      bounds: { x: 0, y: 0, w: 100, h: 100 },
    });
    e.emit(5);
    expect(e.active.length).toBe(5);
    e.update(0.001);
    expect(e.active.length).toBe(0);
  });

  it("particles inside bounds survive", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(50, 50),
      bounds: { x: 0, y: 0, w: 100, h: 100 },
      lifetimeMin: 100,
      lifetimeMax: 100,
    });
    e.emit(5);
    e.update(0.1);
    expect(e.active.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

describe("ParticleEmitter — hooks", () => {
  it("onSpawn fires once per particle with its initial state", () => {
    const space = makeSpace();
    const calls: number[] = [];
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(10, 20),
      velocity: { kind: "fixed", value: new Vec2(5, 0) },
      lifetimeMin: 2,
      lifetimeMax: 2,
      onSpawn: (state) => {
        calls.push(state.lifetime);
        expect(state.position.x).toBeCloseTo(10, 5);
        expect(state.velocity.x).toBeCloseTo(5, 5);
      },
    });
    e.emit(4);
    expect(calls.length).toBe(4);
    expect(calls.every((l) => l === 2)).toBe(true);
  });

  it("onUpdate fires for every live particle each update", () => {
    const space = makeSpace();
    let count = 0;
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 100,
      lifetimeMax: 100,
      onUpdate: () => count++,
    });
    e.emit(3);
    e.update(0.1);
    e.update(0.1);
    expect(count).toBe(6);
  });

  it("onDeath fires with the correct reason", () => {
    const space = makeSpace();
    const reasons: string[] = [];
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 0.05,
      lifetimeMax: 0.05,
      onDeath: (_b, r) => reasons.push(r),
    });
    e.emit(2);
    e.update(0.1); // both die from lifetime
    expect(reasons).toEqual(["lifetime", "lifetime"]);

    reasons.length = 0;
    const space2 = makeSpace();
    const e2 = new ParticleEmitter({
      space: space2,
      origin: new Vec2(0, 0),
      bounds: { x: -1, y: -1, w: 2, h: 2 },
      lifetimeMin: 100,
      lifetimeMax: 100,
      velocity: { kind: "fixed", value: new Vec2(1000, 0) },
      onDeath: (_b, r) => reasons.push(r),
    });
    e2.emit(1);
    space2.step(0.1); // physics integrates the particle out of bounds
    e2.update(0.1); // bounds check now fires
    expect(reasons).toEqual(["bounds"]);

    reasons.length = 0;
    const e3 = new ParticleEmitter({
      space: makeSpace(),
      origin: new Vec2(0, 0),
      lifetimeMin: 100,
      lifetimeMax: 100,
      onDeath: (_b, r) => reasons.push(r),
    });
    e3.emit(2);
    e3.killAll();
    expect(reasons).toEqual(["manual", "manual"]);
  });

  it("requestKill defers death until next update()", () => {
    const space = makeSpace();
    const reasons: string[] = [];
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      lifetimeMin: 100,
      lifetimeMax: 100,
      onDeath: (_b, r) => reasons.push(r),
    });
    const [body] = e.emit(1);
    e.requestKill(body);
    // Still alive immediately after requestKill
    expect(e.active.length).toBe(1);
    e.update(0.01);
    expect(e.active.length).toBe(0);
    expect(reasons).toEqual(["manual"]);
  });

  // The alive list is maintained by swap-pop alongside a Body -> index map.
  // A stale map entry (e.g. a missed update for the swapped-in body) would let
  // requestKill kill the wrong particle or silently no-op, so exercise kills
  // from the middle of the list and in bulk.
  it("requestKill targets the right particle after swap-pop reordering", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      maxParticles: 10,
      lifetimeMin: 100,
      lifetimeMax: 100,
    });
    const bodies = e.emit(5);
    expect(bodies.length).toBe(5);

    // Kill from the middle: forces the last element to be swapped into its slot.
    e.requestKill(bodies[1]);
    e.update(0.01);
    expect(e.active.length).toBe(4);
    expect(e.active).not.toContain(bodies[1]);

    // The body that got swapped into index 1 must still be killable.
    e.requestKill(bodies[4]);
    e.update(0.01);
    expect(e.active.length).toBe(3);
    expect(e.active).not.toContain(bodies[4]);

    // Killing an already-dead body is a no-op, not a mis-targeted kill.
    e.requestKill(bodies[1]);
    e.update(0.01);
    expect(e.active.length).toBe(3);

    // Remaining bodies are exactly the ones never killed.
    expect(new Set(e.active)).toEqual(new Set([bodies[0], bodies[2], bodies[3]]));

    // Bulk-kill the rest, then confirm the emitter can spawn cleanly again
    // (a leaked map entry would make a recycled pool body look still-alive).
    for (const b of [bodies[0], bodies[2], bodies[3]]) e.requestKill(b);
    e.update(0.01);
    expect(e.active.length).toBe(0);

    const respawned = e.emit(3);
    expect(respawned.length).toBe(3);
    expect(e.active.length).toBe(3);
    e.requestKill(respawned[1]);
    e.update(0.01);
    expect(e.active.length).toBe(2);
    expect(e.active).not.toContain(respawned[1]);
  });
});

// ---------------------------------------------------------------------------
// Self-collision filter
// ---------------------------------------------------------------------------

describe("ParticleEmitter — self-collision filter", () => {
  it("default selfCollision: false produces a self-excluding filter", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    const f = e.particleFilter;
    // collisionGroup & collisionMask should NOT overlap (i.e., filter excludes
    // its own group bit).
    expect((f.collisionGroup & f.collisionMask) >>> 0).toBe(0);
  });

  it("selfCollision: true uses a default-everything filter", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      selfCollision: true,
    });
    const f = e.particleFilter;
    expect((f.collisionGroup & f.collisionMask) >>> 0).not.toBe(0);
  });

  it("custom particleFilter overrides selfCollision logic", () => {
    const space = makeSpace();
    const myFilter = new InteractionFilter(4, 8);
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      particleFilter: myFilter,
      selfCollision: false, // ignored when filter is explicit
    });
    expect(e.particleFilter).toBe(myFilter);
  });
});

// ---------------------------------------------------------------------------
// Polygon shape
// ---------------------------------------------------------------------------

describe("ParticleEmitter — polygon particles", () => {
  it("uses a polygon shape with the default shape spec", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      particleShape: "polygon",
    });
    e.emit(1);
    const shape = e.active[0].shapes.at(0);
    expect(shape).toBeInstanceOf(Polygon);
  });

  it("respects a custom particlePolygon", () => {
    const space = makeSpace();
    const verts = [new Vec2(-3, -1), new Vec2(3, -1), new Vec2(3, 1), new Vec2(-3, 1)];
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      particleShape: "polygon",
      particlePolygon: verts,
    });
    e.emit(1);
    const shape = e.active[0].shapes.at(0);
    expect(shape).toBeInstanceOf(Polygon);
  });
});

// ---------------------------------------------------------------------------
// allowRotation
// ---------------------------------------------------------------------------

describe("ParticleEmitter — allowRotation", () => {
  it("default true: bodies allow rotation", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    e.emit(1);
    expect(e.active[0].allowRotation).toBe(true);
  });

  it("allowRotation: false freezes rotation", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      allowRotation: false,
    });
    e.emit(1);
    expect(e.active[0].allowRotation).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group
// ---------------------------------------------------------------------------

describe("ParticleEmitterGroup", () => {
  let space: Space;
  let group: ParticleEmitterGroup;
  let a: ParticleEmitter;
  let b: ParticleEmitter;

  beforeEach(() => {
    space = makeSpace();
    group = new ParticleEmitterGroup();
    a = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      rate: 60,
      lifetimeMin: 100,
      lifetimeMax: 100,
    });
    b = new ParticleEmitter({
      space,
      origin: new Vec2(100, 0),
      rate: 30,
      lifetimeMin: 100,
      lifetimeMax: 100,
    });
  });

  it("add returns the emitter and grows length", () => {
    const ret = group.add(a);
    expect(ret).toBe(a);
    expect(group.length).toBe(1);
    group.add(b);
    expect(group.length).toBe(2);
  });

  it("update runs all members", () => {
    group.add(a);
    group.add(b);
    for (let i = 0; i < 60; i++) group.update(1 / 60);
    expect(a.totalSpawned).toBe(60);
    expect(b.totalSpawned).toBe(30);
  });

  it("remove returns true on hit, false on miss", () => {
    group.add(a);
    expect(group.remove(a)).toBe(true);
    expect(group.remove(a)).toBe(false);
    expect(group.length).toBe(0);
  });

  it("clear empties the group without destroying members", () => {
    group.add(a);
    group.add(b);
    group.clear();
    expect(group.length).toBe(0);
    // a, b are still usable
    a.emit(1);
    expect(a.active.length).toBe(1);
  });

  it("destroyAll calls destroy on every member", () => {
    group.add(a);
    group.add(b);
    group.destroyAll();
    expect(group.length).toBe(0);
    expect(() => a.emit(1)).toThrow(/destroyed/);
    expect(() => b.update(1 / 60)).toThrow(/destroyed/);
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe("ParticleEmitter — destroy()", () => {
  it("destroy removes all bodies from the space and the listener", () => {
    const space = makeSpace();
    const cb = new CbType();
    const e = new ParticleEmitter({
      space,
      origin: new Vec2(0, 0),
      particleCbType: cb,
      onCollide: () => {},
    });
    e.emit(5);
    const before = space.bodies.length;
    expect(before).toBeGreaterThanOrEqual(5);

    // Force a few of them to die so they pool up.
    e.update(2); // lifetime default 1s, so all die

    e.destroy();
    expect(space.bodies.length).toBe(0);
  });

  it("update() and emit() throw after destroy()", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    e.destroy();
    expect(() => e.update(1 / 60)).toThrow(/destroyed/);
    expect(() => e.emit(1)).toThrow(/destroyed/);
  });

  it("destroy() is idempotent", () => {
    const space = makeSpace();
    const e = new ParticleEmitter({ space, origin: new Vec2(0, 0) });
    e.destroy();
    expect(() => e.destroy()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("ParticleEmitter — determinism", () => {
  it("identical RNG seeds produce identical particle trajectories", () => {
    function run(seed: number): Array<[number, number]> {
      const space = makeSpace();
      space.gravity = new Vec2(0, 200);
      const e = new ParticleEmitter({
        space,
        origin: new Vec2(0, 0),
        velocity: {
          kind: "cone",
          direction: -Math.PI / 2,
          spread: Math.PI / 8,
          speedMin: 80,
          speedMax: 120,
        },
        rate: 60,
        lifetimeMin: 5,
        lifetimeMax: 5,
        random: makeRng(seed),
        // Self-exclude bit varies between emitters; pin it explicitly so
        // determinism is testable.
        selfCollision: true,
      });
      for (let i = 0; i < 30; i++) {
        e.update(1 / 60);
        space.step(1 / 60);
      }
      return e.active.map((b) => [b.position.x, b.position.y] as [number, number]);
    }
    const a = run(42);
    const b = run(42);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i][0]).toBeCloseTo(b[i][0], 3);
      expect(a[i][1]).toBeCloseTo(b[i][1], 3);
    }
  });
});
