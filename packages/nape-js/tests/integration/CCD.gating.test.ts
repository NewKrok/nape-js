import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Broadphase } from "../../src/space/Broadphase";
import { InteractionListener } from "../../src/callbacks/InteractionListener";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { CbType } from "../../src/callbacks/CbType";

// ---------------------------------------------------------------------------
// `ZPP_Space.continuousCollisions` skips its broadphase pass entirely when every
// live and kinematic body is `sweepFrozen` (see `_ccdCanSkip`). That pass shares
// pair bookkeeping with the discrete broadphase, so the risk is not a wrong
// position but a BEGIN/END callback drifting by a step.
//
// These tests pin the equivalence directly: the gate is forced off by patching
// `_ccdCanSkip` to return false, and the gated and ungated runs must agree
// exactly — same callbacks in the same order on the same steps, and bit-exact
// body state.
// ---------------------------------------------------------------------------

type Inner = { _ccdCanSkip: () => boolean };

/** Run `fn` with CCD gating disabled, so the continuous pass always runs. */
function withoutGating<T>(space: Space, fn: () => T): T {
  const inner = space.zpp_inner as unknown as Inner;
  const original = inner._ccdCanSkip;
  inner._ccdCanSkip = () => false;
  try {
    return fn();
  } finally {
    inner._ccdCanSkip = original;
  }
}

const BROADPHASES: ReadonlyArray<[string, Broadphase | undefined]> = [
  ["DYNAMIC_AABB_TREE", undefined],
  ["SWEEP_AND_PRUNE", Broadphase.SWEEP_AND_PRUNE],
  ["SPATIAL_HASH", Broadphase.SPATIAL_HASH],
];

interface SceneOptions {
  /** Fire a bullet long after the pile has settled and the gate is skipping. */
  lateBullet?: boolean;
  /** Jolt the settled pile awake mid-run. */
  wake?: boolean;
  /** Bodies that start out as fast-moving bullets. */
  bullets?: number;
  /**
   * Add a kinematic platform that starts moving only after the pile settles.
   * Kinematic bodies live on `kinematics`, not `live`, so this is what covers
   * the second half of `_ccdCanSkip`.
   */
  kinematic?: boolean;
}

interface Scene {
  space: Space;
  bodies: Body[];
  bullet: Body;
  platform: Body | null;
  log: string[];
  /** Mutable step cursor the listeners read when they fire. */
  cursor: { step: number };
}

function buildScene(broadphase: Broadphase | undefined, opts: SceneOptions): Scene {
  const space = broadphase ? new Space(new Vec2(0, 600), broadphase) : new Space(new Vec2(0, 600));
  const cb = new CbType();
  const log: string[] = [];
  const cursor = { step: 0 };
  // Body ids are process-global and keep climbing across runs, so record each
  // interactor by its index within this scene instead of its raw id.
  const label = new Map<number, string>();
  const nameOf = (id: number): string => label.get(id) ?? `?${id}`;

  // Record every collision event with the step it fired on, so a one-step drift
  // shows up as a sequence mismatch rather than being averaged away.
  for (const [event, name] of [
    [CbEvent.BEGIN, "BEGIN"],
    [CbEvent.END, "END"],
  ] as const) {
    space.listeners.add(
      new InteractionListener(event, InteractionType.COLLISION, cb, CbType.ANY_BODY, (c) => {
        const a = c.int1 as unknown as { zpp_inner?: { id: number } } | null;
        const b = c.int2 as unknown as { zpp_inner?: { id: number } } | null;
        const na = nameOf(a?.zpp_inner?.id ?? -1);
        const nb = nameOf(b?.zpp_inner?.id ?? -1);
        const pair = na < nb ? `${na}-${nb}` : `${nb}-${na}`;
        log.push(`${cursor.step}:${name}:${pair}`);
      }),
    );
  }

  const floor = new Body(BodyType.STATIC, new Vec2(0, 500));
  floor.shapes.add(new Polygon(Polygon.box(2000, 40)));
  floor.cbTypes.add(cb);
  floor.space = space;
  label.set(floor.zpp_inner.id, "floor");

  const wall = new Body(BodyType.STATIC, new Vec2(420, 430));
  wall.shapes.add(new Polygon(Polygon.box(6, 180)));
  wall.cbTypes.add(cb);
  wall.space = space;
  label.set(wall.zpp_inner.id, "wall");

  const bodies: Body[] = [];
  for (let i = 0; i < 30; i++) {
    const b = new Body(BodyType.DYNAMIC);
    b.shapes.add(i % 2 ? new Circle(9) : new Polygon(Polygon.box(18, 18)));
    b.position = new Vec2(-200 + (i % 15) * 21, 100 - Math.floor(i / 15) * 26);
    b.cbTypes.add(cb);
    if (opts.bullets && i < opts.bullets) {
      b.isBullet = true;
      b.velocity = new Vec2(2500, -50);
    }
    b.space = space;
    label.set(b.zpp_inner.id, `b${i}`);
    bodies.push(b);
  }

  let platform: Body | null = null;
  if (opts.kinematic) {
    platform = new Body(BodyType.KINEMATIC, new Vec2(-320, 460));
    platform.shapes.add(new Polygon(Polygon.box(120, 12)));
    platform.cbTypes.add(cb);
    platform.space = space;
    label.set(platform.zpp_inner.id, "platform");
  }

  const bullet = new Body(BodyType.DYNAMIC, new Vec2(-380, 470));
  bullet.shapes.add(new Circle(8));
  bullet.isBullet = true;
  bullet.cbTypes.add(cb);
  bullet.space = space;
  label.set(bullet.zpp_inner.id, "bullet");
  bodies.push(bullet);

  return { space, bodies, bullet, platform, log, cursor };
}

/** Bit-exact state digest — exponential notation keeps every mantissa bit. */
function digest(bodies: Body[]): string {
  let out = "";
  for (const b of bodies) {
    out += `${b.position.x.toExponential(17)},${b.position.y.toExponential(17)},`;
    out += `${b.rotation.toExponential(17)},`;
    out += `${b.velocity.x.toExponential(17)},${b.velocity.y.toExponential(17)};`;
  }
  return out;
}

interface RunResult {
  log: string[];
  samples: string[];
}

function simulate(
  broadphase: Broadphase | undefined,
  opts: SceneOptions,
  gated: boolean,
): RunResult {
  const scene = buildScene(broadphase, opts);
  const { space, bodies, bullet, platform, log, cursor } = scene;
  const samples: string[] = [];
  const STEPS = 340;

  const body = () => {
    for (let s = 0; s < STEPS; s++) {
      cursor.step = s;
      // Step 250 is deep into the settled window, where the gate has been
      // skipping for many steps — the pass must resume for this bullet.
      if (opts.lateBullet && s === 250) bullet.velocity = new Vec2(4200, 0);
      if (opts.wake && s === 250) {
        for (const b of bodies) b.applyImpulse(new Vec2(0, -900));
      }
      // A kinematic body only ever moves because it was told to, so this is the
      // one case where `live` is fully frozen but the pass must still run.
      if (opts.kinematic && platform && s === 250) {
        platform.velocity = new Vec2(220, 0);
      }
      space.step(1 / 60);
      // Sample densely around the resumption point, sparsely elsewhere.
      if (s % 20 === 0 || (s > 245 && s < 265)) {
        samples.push(`${s}|${digest(platform ? [...bodies, platform] : bodies)}`);
      }
    }
  };

  if (gated) body();
  else withoutGating(space, body);

  return { log, samples };
}

describe("CCD gating — skipping the continuous pass is unobservable", () => {
  for (const [name, broadphase] of BROADPHASES) {
    describe(name, () => {
      const cases: ReadonlyArray<[string, SceneOptions]> = [
        ["settling pile", {}],
        ["bullets from the first step", { bullets: 3 }],
        ["bullet fired after the pile settles", { lateBullet: true }],
        ["settled pile jolted awake", { wake: true }],
        ["kinematic platform starts moving after settling", { kinematic: true }],
      ];

      for (const [label, opts] of cases) {
        it(`${label}: identical collision callbacks`, () => {
          const gated = simulate(broadphase, opts, true);
          const ungated = simulate(broadphase, opts, false);

          // Guard the guard: a scenario that produced no callbacks would make
          // this assertion vacuous.
          expect(gated.log.length).toBeGreaterThan(0);
          expect(gated.log).toEqual(ungated.log);
        });

        it(`${label}: bit-exact body state`, () => {
          const gated = simulate(broadphase, opts, true);
          const ungated = simulate(broadphase, opts, false);

          expect(gated.samples.length).toBeGreaterThan(0);
          expect(gated.samples).toEqual(ungated.samples);
        });
      }
    });
  }

  it("actually skips during a settled scene, and resumes for a bullet", () => {
    const scene = buildScene(undefined, {});
    const inner = scene.space.zpp_inner as unknown as Inner;
    const canSkip = inner._ccdCanSkip.bind(inner);

    let skipped = 0;
    let ran = 0;
    for (let s = 0; s < 260; s++) {
      if (canSkip()) skipped++;
      else ran++;
      scene.space.step(1 / 60);
    }
    // The pile settles well within 260 steps, so the gate must fire often —
    // otherwise the optimization is dead code and the tests above prove nothing.
    expect(skipped).toBeGreaterThan(50);
    expect(ran).toBeGreaterThan(0);

    // Firing a bullet must re-open the pass on the very next step.
    scene.bullet.velocity = new Vec2(4200, 0);
    scene.space.step(1 / 60);
    expect(canSkip()).toBe(false);
  });

  // `updatePos` clears `sweepFrozen` for every kinematic body unconditionally —
  // the bullet-threshold check next to it is guarded on `type == 2` (dynamic).
  // So a kinematic body is never frozen, even parked at zero velocity, and the
  // gate is permanently vetoed in any scene containing one. That is conservative
  // (never skips when a sweep might be needed) but it does mean scenes with
  // moving platforms get no benefit. Pinned here so the limitation is visible
  // and a future change to kinematic freezing shows up as a failure here.
  it("any kinematic body vetoes the skip, even when stationary", () => {
    const scene = buildScene(undefined, { kinematic: true });
    const inner = scene.space.zpp_inner as unknown as Inner;
    const canSkip = inner._ccdCanSkip.bind(inner);
    expect(scene.platform).not.toBeNull();

    let everSkipped = false;
    for (let s = 0; s < 400; s++) {
      scene.space.step(1 / 60);
      if (canSkip()) everSkipped = true;
    }
    // The dynamic pile definitely settles in 400 steps; the only thing keeping
    // the pass alive is the kinematic platform.
    expect(everSkipped).toBe(false);

    // Sanity-check the counterfactual: the identical scene without the platform
    // does reach a skippable state, so it really is the kinematic body vetoing.
    const noPlatform = buildScene(undefined, {});
    const inner2 = noPlatform.space.zpp_inner as unknown as Inner;
    const canSkip2 = inner2._ccdCanSkip.bind(inner2);
    let skippedWithout = false;
    for (let s = 0; s < 400; s++) {
      noPlatform.space.step(1 / 60);
      if (canSkip2()) skippedWithout = true;
    }
    expect(skippedWithout).toBe(true);
  });
});
