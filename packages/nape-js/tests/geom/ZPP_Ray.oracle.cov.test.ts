/**
 * ZPP_Ray / Space.rayCast / Space.rayMultiCast — against an analytic oracle.
 *
 * Scenes of circles and convex polygons with known world geometry (computed
 * here from the body transform, not read back from the engine) are probed
 * with random rays in every broadphase. Expected hits come from an
 * independent ray–circle quadratic and ray–segment intersection:
 *
 *   - circle: outer hit at the smaller root when the origin is outside; with
 *     `inner`, also the exit root (from inside: only the exit)
 *   - convex polygon: without `inner` only front-facing edges count (entry);
 *     with `inner` the nearest edge of any facing (entry from outside, exit
 *     from inside), and multi-cast reports entry and exit
 *   - maxDistance drops hits beyond it; filters drop shapes whose
 *     InteractionFilter does not collide with the ray's
 *   - normals are unit, face against the ray, and are the outward surface
 *     normal (outer hits) or its negation (inner hits)
 *
 * Capsules (stadium polygons) are checked against the analytic stadium: the
 * hit lies on the boundary band of the inscribed polygon and never before
 * the stadium entry.
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Broadphase } from "../../src/space/Broadphase";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Ray } from "../../src/geom/Ray";
import { Vec2 } from "../../src/geom/Vec2";

type Pt = [number, number];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Hit {
  t: number;
  inner: boolean;
  nx: number;
  ny: number;
  shape: any;
}

interface Item {
  shape: any;
  /** All oracle hits along the (unit) ray, any distance > 0. */
  hits(o: Pt, d: Pt, inner: boolean, multi: boolean): Hit[];
}

function circleItem(shape: any, c: Pt, r: number): Item {
  return {
    shape,
    hits(o, d, inner) {
      const ax = o[0] - c[0];
      const ay = o[1] - c[1];
      const B = 2 * (ax * d[0] + ay * d[1]);
      const C = ax * ax + ay * ay - r * r;
      const det = B * B - 4 * C;
      if (det < 0) return [];
      const s = Math.sqrt(det);
      const t0 = (-B - s) / 2;
      const t1 = (-B + s) / 2;
      const at = (t: number, flip: boolean): Hit => {
        const px = o[0] + d[0] * t - c[0];
        const py = o[1] + d[1] * t - c[1];
        const l = Math.hypot(px, py);
        return { t, inner: flip, nx: (flip ? -px : px) / l, ny: (flip ? -py : py) / l, shape };
      };
      const out: Hit[] = [];
      if (t0 > 0) out.push(at(t0, false));
      if (inner && t1 > 0) out.push(at(t1, true));
      return out;
    },
  };
}

/** Convex polygon from world vertices (any winding). */
function polyItem(shape: any, verts: Pt[]): Item {
  const cx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
  const cy = verts.reduce((s, v) => s + v[1], 0) / verts.length;
  return {
    shape,
    hits(o, d, inner, multi) {
      const cand: Hit[] = [];
      for (let i = 0; i < verts.length; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % verts.length];
        const ex = b[0] - a[0];
        const ey = b[1] - a[1];
        // Outward normal: perpendicular pointing away from the centroid.
        let nx = ey;
        let ny = -ex;
        if (nx * (a[0] - cx) + ny * (a[1] - cy) < 0) {
          nx = -nx;
          ny = -ny;
        }
        const nl = Math.hypot(nx, ny);
        nx /= nl;
        ny /= nl;
        const facing = nx * d[0] + ny * d[1] < 0;
        if (!inner && !facing) continue;
        const den = ex * d[1] - ey * d[0];
        if (Math.abs(den) < 1e-12) continue;
        const sx = a[0] - o[0];
        const sy = a[1] - o[1];
        const t = (ex * sy - ey * sx) / den;
        const u = (d[0] * sy - d[1] * sx) / den;
        if (t > 0 && u >= 0 && u <= 1) {
          cand.push({ t, inner: !facing, nx: facing ? nx : -nx, ny: facing ? ny : -ny, shape });
        }
      }
      if (cand.length === 0) return [];
      cand.sort((p, q) => p.t - q.t);
      const first = cand[0];
      const last = cand[cand.length - 1];
      if (!multi || last === first) return [first];
      return [first, last];
    },
  };
}

function rot(local: Pt[], pos: Pt, ang: number): Pt[] {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return local.map(([x, y]) => [pos[0] + c * x - s * y, pos[1] + s * x + c * y]);
}

function buildScene(rnd: () => number, bp: Broadphase, filters = false) {
  const space = new Space(Vec2.weak(0, 0), bp);
  const items: (Item & { group: number })[] = [];
  for (let k = 0; k < 14; k++) {
    // Grid of cells so shapes never overlap (keeps the oracle's ordering
    // unambiguous), jittered inside each cell.
    const gx = (k % 4) * 60 - 90 + (rnd() - 0.5) * 10;
    const gy = Math.floor(k / 4) * 60 - 90 + (rnd() - 0.5) * 10;
    const body = new Body(rnd() < 0.5 ? BodyType.STATIC : BodyType.DYNAMIC, Vec2.weak(gx, gy));
    const ang = rnd() * Math.PI * 2;
    body.rotation = ang;
    const group = 1 << Math.floor(rnd() * 3);
    const filter = filters ? new InteractionFilter(group, -1) : undefined;
    if (rnd() < 0.45) {
      const r = 8 + rnd() * 16;
      const off: Pt = [(rnd() - 0.5) * 6, (rnd() - 0.5) * 6];
      const shape = new Circle(r, Vec2.weak(off[0], off[1]), undefined, filter);
      body.shapes.add(shape);
      items.push({ ...circleItem(shape, rot([off], [gx, gy], ang)[0], r), group });
    } else {
      const n = 3 + Math.floor(rnd() * 6);
      const R = 10 + rnd() * 14;
      const squash = 0.6 + 0.4 * rnd(); // one affine squash keeps it convex
      const local: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.3 * rnd()) / n) * Math.PI * 2;
        local.push([Math.cos(a) * R, Math.sin(a) * R * squash]);
      }
      const shape = new Polygon(
        local.map(([x, y]) => Vec2.weak(x, y)),
        undefined,
        filter,
      );
      body.shapes.add(shape);
      items.push({ ...polyItem(shape, rot(local, [gx, gy], ang)), group });
    }
    body.space = space;
  }
  return { space, items };
}

function expected(
  items: (Item & { group: number })[],
  o: Pt,
  d: Pt,
  inner: boolean,
  multi: boolean,
  maxDist: number,
  mask = -1,
): Hit[] {
  const all: Hit[] = [];
  for (const it of items) {
    if ((it.group & mask) === 0) continue;
    for (const h of it.hits(o, d, inner, multi)) if (h.t <= maxDist) all.push(h);
  }
  return all.sort((p, q) => p.t - q.t);
}

function checkResult(res: any, want: Hit, label: string) {
  expect(res, label).not.toBeNull();
  expect(res.distance, `${label}: distance`).toBeCloseTo(want.t, 6);
  expect(res.shape, `${label}: shape`).toBe(want.shape);
  expect(res.inner, `${label}: inner`).toBe(want.inner);
  expect(res.normal.x, `${label}: nx`).toBeCloseTo(want.nx, 6);
  expect(res.normal.y, `${label}: ny`).toBeCloseTo(want.ny, 6);
}

const BROADPHASES: [string, () => Broadphase][] = [
  ["DYNAMIC_AABB_TREE", () => Broadphase.DYNAMIC_AABB_TREE],
  ["SWEEP_AND_PRUNE", () => Broadphase.SWEEP_AND_PRUNE],
  ["SPATIAL_HASH", () => Broadphase.SPATIAL_HASH],
];

describe("Space.rayCast / rayMultiCast — analytic oracle", () => {
  for (const [bpName, bp] of BROADPHASES) {
    for (const inner of [false, true]) {
      it(`${bpName}, inner=${inner}: nearest hit and all hits match`, () => {
        const rnd = mulberry32(inner ? 7 : 3);
        let hitsSeen = 0;
        let innerSeen = 0;
        for (let scene = 0; scene < 4; scene++) {
          const { space, items } = buildScene(rnd, bp());
          for (let k = 0; k < 60; k++) {
            // Half the rays start inside the scene's cloud (often inside a
            // shape), half from far outside.
            const o: Pt =
              k % 2 === 0
                ? [(rnd() - 0.5) * 240, (rnd() - 0.5) * 240]
                : [Math.cos(k) * 400, Math.sin(k) * 400];
            const a = rnd() * Math.PI * 2;
            const d: Pt = [Math.cos(a), Math.sin(a)];
            const maxDist = rnd() < 0.3 ? 40 + rnd() * 150 : Infinity;
            const ray = new Ray(Vec2.weak(o[0], o[1]), Vec2.weak(d[0] * 3, d[1] * 3));
            ray.maxDistance = maxDist;

            const want = expected(items, o, d, inner, false, maxDist);
            const res = space.rayCast(ray, inner);
            const label = `${bpName} scene ${scene} ray ${k}`;
            if (want.length === 0) {
              expect(res, label).toBeNull();
            } else {
              // Skip near-ties between different shapes.
              if (want.length < 2 || want[1].t - want[0].t > 1e-6) {
                checkResult(res, want[0], label);
                hitsSeen++;
                if (want[0].inner) innerSeen++;
              }
            }

            const wantAll = expected(items, o, d, inner, true, maxDist);
            const list = space.rayMultiCast(ray, inner);
            expect(list.length, `${label}: multi count`).toBe(wantAll.length);
            for (let i = 0; i < list.length; i++) {
              const r = list.at(i);
              const w = wantAll[i];
              expect(r.distance, `${label}: multi[${i}] distance`).toBeCloseTo(w.t, 6);
              expect(r.inner, `${label}: multi[${i}] inner`).toBe(w.inner);
              expect(r.normal.x * d[0] + r.normal.y * d[1]).toBeLessThan(0);
              expect(Math.hypot(r.normal.x, r.normal.y)).toBeCloseTo(1, 9);
            }
          }
        }
        expect(hitsSeen).toBeGreaterThan(40);
        if (inner) expect(innerSeen).toBeGreaterThan(5);
        else expect(innerSeen).toBe(0);
      });
    }

    it(`${bpName}: filters exclude shapes whose groups the ray masks out`, () => {
      const rnd = mulberry32(41);
      const { space, items } = buildScene(rnd, bp(), true);
      let filtered = 0;
      for (let k = 0; k < 80; k++) {
        const o: Pt = [Math.cos(k * 1.3) * 400, Math.sin(k * 1.3) * 400];
        const a = Math.atan2(-o[1], -o[0]) + (rnd() - 0.5) * 0.8;
        const d: Pt = [Math.cos(a), Math.sin(a)];
        const mask = 1 + Math.floor(rnd() * 7);
        const filter = new InteractionFilter(1, mask);
        const ray = new Ray(Vec2.weak(o[0], o[1]), Vec2.weak(d[0], d[1]));
        const want = expected(items, o, d, true, true, Infinity, mask);
        const unfiltered = expected(items, o, d, true, true, Infinity);
        if (unfiltered.length !== want.length) filtered++;
        const list = space.rayMultiCast(ray, true, filter);
        expect(list.length).toBe(want.length);
        for (let i = 0; i < list.length; i++) expect(list.at(i).shape).toBe(want[i].shape);
        const res = space.rayCast(ray, true, filter);
        if (want.length === 0) expect(res).toBeNull();
        else expect(res.shape).toBe(want[0].shape);
      }
      expect(filtered).toBeGreaterThan(10);
    });
  }
});

describe("ZPP_Ray — single-shape edge cases", () => {
  const space = new Space(Vec2.weak(0, 0));
  const body = new Body(BodyType.STATIC);
  const circle = new Circle(5);
  body.shapes.add(circle);
  body.space = space;

  it("a ray exactly tangent to a circle hits at the tangent point", () => {
    // From (-10, 5) along +x, touching the radius-5 circle at (0, 5).
    for (const inner of [false, true]) {
      const ray = new Ray(new Vec2(-10, 5), new Vec2(1, 0));
      const res = space.rayCast(ray, inner);
      expect(res).not.toBeNull();
      expect(res!.distance).toBeCloseTo(10, 12);
      expect(res!.normal.x).toBeCloseTo(0, 12);
      expect(res!.normal.y).toBeCloseTo(1, 12);
      expect(res!.inner).toBe(false);
      const list = space.rayMultiCast(ray, inner);
      expect(list.length).toBe(1);
      expect(list.at(0).distance).toBeCloseTo(10, 12);
    }
  });

  it("a tangent ray beyond maxDistance misses", () => {
    const ray = new Ray(new Vec2(-10, 5), new Vec2(1, 0));
    ray.maxDistance = 9.5;
    expect(space.rayCast(ray)).toBeNull();
    expect(space.rayMultiCast(ray).length).toBe(0);
  });

  it("from inside a circle: no hit without inner, exit hit with inner", () => {
    const ray = new Ray(new Vec2(1, 0), new Vec2(-1, 0));
    expect(space.rayCast(ray, false)).toBeNull();
    const res = space.rayCast(ray, true)!;
    expect(res.distance).toBeCloseTo(6, 12);
    expect(res.inner).toBe(true);
    expect(res.normal.x).toBeCloseTo(1, 12); // faces back along the ray
    ray.maxDistance = 5.9;
    expect(space.rayCast(ray, true)).toBeNull();
    expect(space.rayMultiCast(ray, true).length).toBe(0);
  });
});

describe("ZPP_Ray — polygons and capsules", () => {
  it("from inside a box with inner: single exit hit, normal flipped", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.STATIC);
    body.shapes.add(new Polygon(Polygon.box(10, 10)));
    body.space = space;
    const ray = new Ray(new Vec2(1, 2), new Vec2(1, 0));
    expect(space.rayCast(ray, false)).toBeNull();
    const res = space.rayCast(ray, true)!;
    expect(res.distance).toBeCloseTo(4, 12);
    expect(res.inner).toBe(true);
    expect(res.normal.x).toBeCloseTo(-1, 12);
    const list = space.rayMultiCast(ray, true);
    expect(list.length).toBe(1);
    // From outside: entry and exit, entry first.
    const through = new Ray(new Vec2(-20, 2), new Vec2(1, 0));
    const both = space.rayMultiCast(through, true);
    expect(both.length).toBe(2);
    expect(both.at(0).distance).toBeCloseTo(15, 12);
    expect(both.at(0).inner).toBe(false);
    expect(both.at(1).distance).toBeCloseTo(25, 12);
    expect(both.at(1).inner).toBe(true);
    expect(both.at(1).normal.x).toBeCloseTo(-1, 12);
  });

  it("capsule hits lie on the stadium boundary band and never before the stadium entry", () => {
    const rnd = mulberry32(9);
    const space = new Space(Vec2.weak(0, 0));
    const width = 60;
    const height = 20;
    const r = height / 2;
    const hl = width / 2 - r;
    const body = new Body(BodyType.STATIC, Vec2.weak(5, -3));
    const ang = 0.7;
    body.rotation = ang;
    body.shapes.add(new Capsule(width, height));
    body.space = space;
    const toLocal = (x: number, y: number): Pt => {
      const dx = x - 5;
      const dy = y + 3;
      return [Math.cos(ang) * dx + Math.sin(ang) * dy, -Math.sin(ang) * dx + Math.cos(ang) * dy];
    };
    /** Distance from a local point to the spine segment (-hl,0)-(hl,0). */
    const spineDist = ([x, y]: Pt) => Math.hypot(x - Math.max(-hl, Math.min(hl, x)), y);
    // The polygon approximation is inscribed: every boundary point is within
    // r (1 - cos(pi/8 / 2)) of the true stadium (8 segments per cap).
    const band = r * (1 - Math.cos(Math.PI / 16)) + 1e-9;
    let hits = 0;
    for (let k = 0; k < 300; k++) {
      const a = rnd() * Math.PI * 2;
      const o: Pt = [5 + Math.cos(a) * 100, -3 + Math.sin(a) * 100];
      // Aim near the capsule.
      const tx = 5 + (rnd() - 0.5) * 80;
      const ty = -3 + (rnd() - 0.5) * 40;
      const d0 = [tx - o[0], ty - o[1]];
      const l = Math.hypot(d0[0], d0[1]);
      const d: Pt = [d0[0] / l, d0[1] / l];
      // Analytic stadium entry: march coarsely then bisect on spineDist = r.
      let tEntry = Infinity;
      for (let t = 0; t < 200; t += 0.25) {
        if (spineDist(toLocal(o[0] + d[0] * t, o[1] + d[1] * t)) <= r) {
          let lo = t - 0.25;
          let hi = t;
          for (let i = 0; i < 60; i++) {
            const m = (lo + hi) / 2;
            if (spineDist(toLocal(o[0] + d[0] * m, o[1] + d[1] * m)) <= r) hi = m;
            else lo = m;
          }
          tEntry = hi;
          break;
        }
      }
      // Deepest approach of the ray to the spine.
      let minSpine = Infinity;
      for (let t = 0; t < 200; t += 0.05) {
        minSpine = Math.min(minSpine, spineDist(toLocal(o[0] + d[0] * t, o[1] + d[1] * t)));
      }
      const res = space.rayCast(new Ray(Vec2.weak(o[0], o[1]), Vec2.weak(d[0], d[1])));
      if (minSpine < r - band - 0.05) {
        // Clearly passes through the inscribed polygon: must hit.
        expect(res).not.toBeNull();
      }
      if (minSpine > r + 0.05) expect(res).toBeNull();
      if (res != null) {
        hits++;
        expect(res.distance).toBeGreaterThanOrEqual(tEntry - 1e-6);
        const p = toLocal(o[0] + d[0] * res.distance, o[1] + d[1] * res.distance);
        const sd = spineDist(p);
        expect(sd).toBeLessThanOrEqual(r + 1e-6);
        expect(sd).toBeGreaterThanOrEqual(r - band - 1e-6);
      }
    }
    expect(hits).toBeGreaterThan(100);
  });
});

describe("Ray — construction and validation", () => {
  it("rays built after disposing Vec2s (pooled wrappers) keep their own origin/direction", () => {
    // Dispose a few non-zero Vec2s so the next Ray takes its origin and
    // direction wrappers from the public pool.
    for (let i = 0; i < 4; i++) new Vec2(3 + i, 4 + i).dispose();
    const ray = new Ray(new Vec2(-2, 1), new Vec2(0, 2));
    expect([ray.origin.x, ray.origin.y]).toEqual([-2, 1]);
    expect([ray.direction.x, ray.direction.y]).toEqual([0, 2]);
    const p = ray.at(3);
    expect([p.x, p.y]).toEqual([-2, 4]);
    // The ray's vectors are live: editing origin moves the ray.
    ray.origin.x = 10;
    expect(ray.at(1).x).toBe(10);
  });

  it("ray results recycled through the pool report fresh normals", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.STATIC);
    body.shapes.add(new Circle(5));
    body.space = space;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      const ray = new Ray(
        new Vec2(Math.cos(a) * 20, Math.sin(a) * 20),
        new Vec2(-Math.cos(a), -Math.sin(a)),
      );
      const res = space.rayCast(ray)!;
      expect(res.distance).toBeCloseTo(15, 12);
      expect(res.normal.x).toBeCloseTo(Math.cos(a), 12);
      expect(res.normal.y).toBeCloseTo(Math.sin(a), 12);
      res.dispose();
      new Vec2(7, 7).dispose();
    }
  });

  it("disposed Vec2 arguments are rejected", () => {
    const dead = new Vec2(1, 1);
    dead.dispose();
    const msg = "Vec2 has been disposed and cannot be used!";
    expect(() => new Ray(dead, new Vec2(1, 0))).toThrow(msg);
    expect(() => new Ray(new Vec2(0, 0), dead)).toThrow(msg);
    expect(() => Ray.fromSegment(dead, new Vec2(1, 0))).toThrow(msg);
    expect(() => Ray.fromSegment(new Vec2(0, 0), dead)).toThrow(msg);
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(() => {
      ray.origin = dead;
    }).toThrow(msg);
    expect(() => {
      ray.direction = dead;
    }).toThrow(msg);
  });

  it("fromSegment rejects a NaN length (infinite endpoints) and reads lazy Vec2s", () => {
    expect(() => Ray.fromSegment(new Vec2(Infinity, 0), new Vec2(Infinity, 0))).toThrow(
      "maxDistance cannot be NaN",
    );
    const a = new Body();
    a.position.setxy(1, 2);
    const b = new Body();
    b.position.setxy(4, 6);
    // body.position goes through a _validate hook.
    const ray = Ray.fromSegment(a.position, b.position);
    expect(ray.maxDistance).toBeCloseTo(5, 12);
    expect([ray.origin.x, ray.origin.y]).toEqual([1, 2]);
  });

  it("maxDistance rejects NaN and a degenerate direction is rejected at query time", () => {
    const ray = new Ray(new Vec2(0, 0), new Vec2(1, 0));
    expect(() => {
      ray.maxDistance = NaN;
    }).toThrow("maxDistance cannot be NaN");
    const space = new Space(Vec2.weak(0, 0));
    const zero = new Ray(new Vec2(0, 0), new Vec2(0, 0));
    expect(() => space.rayCast(zero)).toThrow("Ray::direction is degenerate");
  });

  it("aabb() spans origin to origin + maxDistance * unit direction, unbounded when infinite", () => {
    const ray = new Ray(new Vec2(2, 3), new Vec2(-3, 4));
    ray.maxDistance = 10;
    ray.at(0); // validates (normalises) the direction
    const box = ray.aabb();
    expect(box.min.x).toBeCloseTo(-4, 12);
    expect(box.max.x).toBeCloseTo(2, 12);
    expect(box.min.y).toBeCloseTo(3, 12);
    expect(box.max.y).toBeCloseTo(11, 12);
    ray.maxDistance = Infinity;
    const inf = ray.aabb();
    expect(inf.min.x).toBe(-Infinity);
    expect(inf.max.y).toBe(Infinity);
    expect(inf.max.x).toBe(2);
    expect(inf.min.y).toBe(3);
  });
});
