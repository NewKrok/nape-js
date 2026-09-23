/**
 * Space.convexCast / convexMultiCast — time of impact against analytic answers.
 *
 * Existing tests check that a cast "hits something". These pin the result:
 * `toi`, contact normal and the hit shape, for cases with a closed-form or
 * independently computed time of impact:
 *
 *   - moving circle vs circle: solve |Δp + Δv·t| = r1 + r2
 *   - moving circle vs static convex polygon: bisection on the exact
 *     point-to-polygon distance
 *   - a spinning bar vs a post: acos-based contact angle
 *
 * and drive the paths no suite reached: `liveSweep = true` against moving
 * and rotating polygon targets, multi-cast result ordering, InteractionFilter
 * rejection, and a caller-supplied output list.
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Polygon } from "../../src/shape/Polygon";
import { Circle } from "../../src/shape/Circle";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";

type Pt = [number, number];

function body(
  space: Space,
  type: BodyType,
  x: number,
  y: number,
  shape: any,
  vx = 0,
  vy = 0,
  w = 0,
) {
  const b = new Body(type, new Vec2(x, y));
  b.shapes.add(shape);
  if (type !== BodyType.STATIC) {
    b.velocity = new Vec2(vx, vy);
    b.angularVel = w;
  }
  b.space = space;
  return { body: b, shape };
}

/** Earliest t >= 0 with |p + v t| = R, or null if they never touch. */
function circleToi(px: number, py: number, vx: number, vy: number, R: number): number | null {
  const a = vx * vx + vy * vy;
  const b = 2 * (px * vx + py * vy);
  const c = px * px + py * py - R * R;
  if (c <= 0) return 0;
  const disc = b * b - 4 * a * c;
  if (a === 0 || disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 ? t : null;
}

function distToConvex(p: Pt, poly: Pt[]): number {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const cross = ex * (p[1] - a[1]) - ey * (p[0] - a[0]);
    if (cross < 0) inside = false;
    const len2 = ex * ex + ey * ey;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / len2));
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * ex), p[1] - (a[1] + t * ey)));
  }
  return inside ? 0 : best;
}

/** First t in [0, T] where a circle moving from c with velocity v touches `poly` (ccw). */
function circlePolyToi(c: Pt, v: Pt, r: number, poly: Pt[], T: number): number | null {
  const gap = (t: number) => distToConvex([c[0] + v[0] * t, c[1] + v[1] * t], poly) - r;
  const N = 2000;
  let prev = 0;
  for (let i = 1; i <= N; i++) {
    const t = (T * i) / N;
    if (gap(t) <= 0) {
      let lo = prev;
      let hi = t;
      for (let k = 0; k < 60; k++) {
        const m = (lo + hi) / 2;
        if (gap(m) <= 0) hi = m;
        else lo = m;
      }
      return hi;
    }
    prev = t;
  }
  return null;
}

function regular(n: number, r: number, phase = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (2 * Math.PI * i) / n;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

const toVec = (pts: Pt[]) => pts.map(([x, y]) => new Vec2(x, y));

// Nape's sweep stops within its linear slop of contact, not exactly at it.
const TOI_TOL = 2e-3;

// ---------------------------------------------------------------------------

describe("convexCast — static targets", () => {
  it("circle into a wall: toi, normal, and contact position", () => {
    const space = new Space(new Vec2(0, 0));
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(10), 100, 0);
    body(space, BodyType.STATIC, 100, 0, new Polygon(Polygon.box(20, 200)));
    const r = space.convexCast(caster.shape, 2)!;
    expect(r).not.toBeNull();
    expect(r.toi).toBeCloseTo(0.8, 6);
    expect(r.normal.x).toBeCloseTo(-1, 6);
    expect(r.normal.y).toBeCloseTo(0, 6);
    expect(r.position.x).toBeCloseTo(90, 4);
  });

  it("returns null when the target is beyond deltaTime", () => {
    const space = new Space(new Vec2(0, 0));
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(10), 100, 0);
    body(space, BodyType.STATIC, 100, 0, new Polygon(Polygon.box(20, 200)));
    expect(space.convexCast(caster.shape, 0.5)).toBeNull();
  });

  it("seeded random circle vs static convex polygon", () => {
    let s = 4242;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = 0; i < 25; i++) {
      const space = new Space(new Vec2(0, 0));
      const local = regular(3 + Math.floor(rnd() * 6), 10 + rnd() * 30, rnd() * 6);
      const px = 150 + rnd() * 50;
      const py = (rnd() - 0.5) * 40;
      body(space, BodyType.STATIC, px, py, new Polygon(toVec(local)));
      const r = 3 + rnd() * 10;
      const vx = 80 + rnd() * 80;
      const vy = (rnd() - 0.5) * 30;
      const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(r), vx, vy);
      const world = local.map(([x, y]) => [x + px, y + py] as Pt);
      const want = circlePolyToi([0, 0], [vx, vy], r, world, 3);
      const got = space.convexCast(caster.shape, 3);
      if (want == null) {
        expect(got).toBeNull();
      } else {
        expect(got).not.toBeNull();
        expect(Math.abs(got!.toi - want)).toBeLessThan(TOI_TOL);
      }
    }
  });
});

describe("convexCast — liveSweep against moving targets", () => {
  it("a target moving toward the caster: liveSweep uses its velocity", () => {
    const space = new Space(new Vec2(0, 0));
    const mover = body(space, BodyType.DYNAMIC, 0, 100, new Circle(5), 0, -50);
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(5), 0, 50);
    const frozen = space.convexCast(caster.shape, 3, false)!;
    const live = space.convexCast(caster.shape, 3, true)!;
    expect(frozen.shape).toBe(mover.shape);
    expect(live.shape).toBe(mover.shape);
    expect(frozen.toi).toBeCloseTo(90 / 50, 6);
    expect(live.toi).toBeCloseTo(90 / 100, 6);
  });

  it("seeded random moving circle pairs match the closed form", () => {
    let s = 99;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const T = 4;
    let checked = 0;
    for (let i = 0; i < 60; i++) {
      const space = new Space(new Vec2(0, 0));
      const r1 = 3 + rnd() * 10;
      const r2 = 3 + rnd() * 10;
      const tx = 60 + rnd() * 80;
      const ty = (rnd() - 0.5) * 60;
      const tvx = (rnd() - 0.5) * 60;
      const tvy = (rnd() - 0.5) * 60;
      const cvx = 40 + rnd() * 60;
      const cvy = (rnd() - 0.5) * 20;
      // Candidates are the shapes whose current AABB meets the caster's
      // swept AABB (see the limitation test below); keep only those.
      const sweptMinY = Math.min(0, cvy * T) - r1;
      const sweptMaxY = Math.max(0, cvy * T) + r1;
      if (ty + r2 < sweptMinY || ty - r2 > sweptMaxY) continue;
      body(space, BodyType.DYNAMIC, tx, ty, new Circle(r2), tvx, tvy);
      const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(r1), cvx, cvy);
      const want = circleToi(tx, ty, tvx - cvx, tvy - cvy, r1 + r2);
      const got = space.convexCast(caster.shape, T, true);
      checked++;
      if (want == null || want > T) {
        expect(got).toBeNull();
      } else {
        expect(got).not.toBeNull();
        expect(Math.abs(got!.toi - want)).toBeLessThan(TOI_TOL);
      }
    }
    expect(checked).toBeGreaterThan(15);
  });

  it("only targets whose AABB meets the caster's swept AABB are considered", () => {
    // Limitation (inherited from Nape): candidates come from a broadphase
    // query with the caster's swept AABB against the targets' *current*
    // AABBs. With liveSweep, a target that starts outside that box is never
    // tested, even when its own motion carries it into the caster's path.
    const space = new Space(new Vec2(0, 0));
    // Caster sweeps x ∈ [-5, 105] along y = 0; the target starts at y = 60 and
    // falls through the path (it would be hit at t = 0.5 if considered).
    body(space, BodyType.DYNAMIC, 50, 60, new Circle(5), 0, -100);
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(5), 100, 0);
    expect(space.convexCast(caster.shape, 1, true)).toBeNull();
  });

  it("liveSweep drops a target that moves out of the path in time", () => {
    const space = new Space(new Vec2(0, 0));
    const dodger = body(space, BodyType.DYNAMIC, 100, 0, new Circle(5), 0, 200);
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(5), 100, 0);
    const frozen = space.convexCast(caster.shape, 2, false)!;
    expect(frozen.shape).toBe(dodger.shape);
    expect(frozen.toi).toBeCloseTo(0.9, 6);
    expect(space.convexCast(caster.shape, 2, true)).toBeNull();
  });

  it("a moving polygon target (liveSweep integrates its vertices)", () => {
    const space = new Space(new Vec2(0, 0));
    // Box of half-width 10 at x=100 moving left at 40; circle r=5 moving right at 60.
    body(space, BodyType.DYNAMIC, 100, 0, new Polygon(Polygon.box(20, 20)), -40, 0);
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(5), 60, 0);
    const got = space.convexCast(caster.shape, 3, true)!;
    expect(got).not.toBeNull();
    expect(got.toi).toBeCloseTo((100 - 10 - 5) / 100, 3);
  });

  it("a rotating polygon target sweeps into a stationary caster", () => {
    const space = new Space(new Vec2(0, 0));
    // A 40×4 bar at 45°, spinning at 3 rad/s about its centre, towards a
    // radius-2 post at (0, 14) that sits inside the bar's AABB. Contact when
    // the post's distance to the bar axis, 14·sin(π/2 − θ), reaches 2 + 2.
    const bar = body(space, BodyType.DYNAMIC, 0, 0, new Polygon(Polygon.box(40, 4)), 0, 0, 3);
    bar.body.rotation = Math.PI / 4;
    const caster = body(space, BodyType.KINEMATIC, 0, 14, new Circle(2));
    const theta = Math.PI / 2 - Math.asin(4 / 14);
    const got = space.convexCast(caster.shape, 1, true)!;
    expect(got).not.toBeNull();
    expect(got.shape).toBe(bar.shape);
    expect(Math.abs(got.toi - (theta - Math.PI / 4) / 3)).toBeLessThan(TOI_TOL);
    expect(space.convexCast(caster.shape, 1, false)).toBeNull();
  });

  it("a rotating caster against a static post", () => {
    const space = new Space(new Vec2(0, 0));
    const bar = body(space, BodyType.DYNAMIC, 0, -100, new Polygon(Polygon.box(40, 4)), 0, 0, 3);
    body(space, BodyType.STATIC, 0, -80, new Circle(2));
    const got = space.convexCast(bar.shape, 1)!;
    expect(got.toi).toBeCloseTo(Math.acos(0.2) / 3, 3);
  });
});

describe("convexMultiCast", () => {
  function row(space: Space, live: boolean) {
    // Three posts in a row and one moving towards the caster.
    const hits = [
      body(space, BodyType.STATIC, 50, 0, new Circle(5)),
      body(space, BodyType.STATIC, 100, 0, new Polygon(Polygon.box(10, 10))),
      body(space, BodyType.STATIC, 150, 0, new Polygon(toVec(regular(5, 6)))),
      body(space, BodyType.DYNAMIC, 260, 0, new Circle(5), -100, 0),
    ];
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(5), 100, 0);
    return { hits, caster, results: space.convexMultiCast(caster.shape, 2, live) };
  }

  it("returns every hit, sorted by time of impact", () => {
    const space = new Space(new Vec2(0, 0));
    const { hits, results } = row(space, false);
    // Frozen targets: the mover (at 260) is reached at (260-10)/100 = 2.5 > 2.
    expect(results.length).toBe(3);
    const tois = Array.from({ length: results.length }, (_, i) => results.at(i).toi);
    for (let i = 1; i < tois.length; i++) expect(tois[i]).toBeGreaterThanOrEqual(tois[i - 1]);
    expect(results.at(0).shape).toBe(hits[0].shape);
    expect(tois[0]).toBeCloseTo(0.4, 6);
    expect(tois[1]).toBeCloseTo(0.9, 6);
  });

  it("liveSweep changes which targets are hit and when", () => {
    const space = new Space(new Vec2(0, 0));
    const posts = [
      body(space, BodyType.STATIC, 50, 0, new Circle(5)),
      body(space, BodyType.STATIC, 150, 0, new Circle(5)),
    ];
    // Moves out of the path before the caster arrives.
    const dodger = body(space, BodyType.DYNAMIC, 100, 0, new Circle(5), 0, 300);
    // Comes towards the caster along the path.
    const oncoming = body(space, BodyType.DYNAMIC, 190, 0, new Circle(5), -60, 0);
    const caster = body(space, BodyType.DYNAMIC, 0, 0, new Circle(5), 100, 0);
    const shapesOf = (list: any) => Array.from({ length: list.length }, (_, i) => list.at(i).shape);

    const frozen = space.convexMultiCast(caster.shape, 2, false);
    expect(shapesOf(frozen)).toEqual([
      posts[0].shape,
      dodger.shape,
      posts[1].shape,
      oncoming.shape,
    ]);

    const live = space.convexMultiCast(caster.shape, 2, true);
    const liveShapes = shapesOf(live);
    expect(liveShapes).not.toContain(dodger.shape);
    expect(liveShapes).toContain(oncoming.shape);
    const hit = live.at(liveShapes.indexOf(oncoming.shape));
    expect(hit.toi).toBeCloseTo((190 - 10) / 160, 6);
  });

  it("an InteractionFilter excludes shapes from the cast", () => {
    const space = new Space(new Vec2(0, 0));
    const { hits, caster } = row(space, false);
    hits[0].shape.filter.collisionGroup = 2;
    const filter = new InteractionFilter(1, ~2);
    const results = space.convexMultiCast(caster.shape, 2, false, filter);
    const shapes = Array.from({ length: results.length }, (_, i) => results.at(i).shape);
    expect(shapes).not.toContain(hits[0].shape);
    expect(results.length).toBe(2);

    const single = space.convexCast(caster.shape, 2, false, filter)!;
    expect(single.shape).toBe(hits[1].shape);
  });

  it("appends to a caller-supplied output list", () => {
    const space = new Space(new Vec2(0, 0));
    const { caster } = row(space, false);
    const out = space.convexMultiCast(caster.shape, 2, false);
    const n = out.length;
    const again = space.convexMultiCast(caster.shape, 2, false, null, out);
    expect(again).toBe(out);
    expect(out.length).toBe(2 * n);
  });

  it("liveSweep multi-cast against moving and rotating polygons", () => {
    const space = new Space(new Vec2(0, 0));
    body(space, BodyType.DYNAMIC, 120, 0, new Polygon(Polygon.box(20, 20)), -40, 0, 1.5);
    body(space, BodyType.DYNAMIC, 60, 40, new Polygon(toVec(regular(6, 8))), 0, -40, -2);
    const caster = body(
      space,
      BodyType.DYNAMIC,
      0,
      0,
      new Polygon(Polygon.box(10, 10)),
      60,
      0,
      0.5,
    );
    const results = space.convexMultiCast(caster.shape, 3, true);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 0; i < results.length; i++) {
      const r = results.at(i);
      expect(r.toi).toBeGreaterThan(0);
      expect(r.toi).toBeLessThanOrEqual(3);
      expect(Math.hypot(r.normal.x, r.normal.y)).toBeCloseTo(1, 6);
    }
  });
});
