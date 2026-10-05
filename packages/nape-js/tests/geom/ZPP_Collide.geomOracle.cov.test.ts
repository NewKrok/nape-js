/**
 * ZPP_Collide via Geom.intersects / Geom.contains / Geom.distance and
 * narrowphase contacts — against independent convex geometry.
 *
 * Random circles and convex polygons (world geometry computed here from the
 * body transform) are paired in every combination and checked against:
 *   - intersection: circle–circle centre distance, circle–polygon point to
 *     convex polygon distance, polygon–polygon separating-axis test
 *   - containment: half-plane tests of the contained shape's vertices
 *     (or the circle's centre with its radius) against the container
 *   - distance (disjoint pairs): the closed-form minimum distance, with the
 *     two returned witness points on the respective shapes' boundaries and
 *     exactly that far apart
 * Pairs within 1e-6 of touching are skipped (either answer is fine there).
 *
 * Capsules are polygons inscribed in a stadium; they are checked against the
 * analytic stadium with a tolerance band equal to the inscription error.
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import { Geom } from "../../src/geom/Geom";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Capsule } from "../../src/shape/Capsule";
import { Space } from "../../src/space/Space";

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

type G =
  | { kind: "circle"; c: Pt; r: number; shape: any }
  | { kind: "poly"; v: Pt[]; shape: any }
  | { kind: "capsule"; a: Pt; b: Pt; r: number; band: number; shape: any };

function segPointDist(a: Pt, b: Pt, p: Pt): number {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const l2 = ex * ex + ey * ey;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / l2)) : 0;
  return Math.hypot(a[0] + ex * t - p[0], a[1] + ey * t - p[1]);
}

function cross(o: Pt, a: Pt, b: Pt) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function segsCross(a: Pt, b: Pt, c: Pt, d: Pt) {
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
}

function segSegDist(a: Pt, b: Pt, c: Pt, d: Pt): number {
  if (segsCross(a, b, c, d)) return 0;
  return Math.min(
    segPointDist(a, b, c),
    segPointDist(a, b, d),
    segPointDist(c, d, a),
    segPointDist(c, d, b),
  );
}

/** Signed distance from p to a convex polygon (negative inside). */
function polySigned(v: Pt[], p: Pt): number {
  let inside = true;
  let maxOut = -Infinity;
  const ccw = cross(v[0], v[1], v[2]) > 0;
  for (let i = 0; i < v.length; i++) {
    const a = v[i];
    const b = v[(i + 1) % v.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const l = Math.hypot(ex, ey);
    // Outward normal.
    const nx = (ccw ? ey : -ey) / l;
    const ny = (ccw ? -ex : ex) / l;
    const s = nx * (p[0] - a[0]) + ny * (p[1] - a[1]);
    if (s > 0) inside = false;
    maxOut = Math.max(maxOut, s);
  }
  if (inside) return maxOut; // <= 0: minus distance to the nearest edge line
  let best = Infinity;
  for (let i = 0; i < v.length; i++)
    best = Math.min(best, segPointDist(v[i], v[(i + 1) % v.length], p));
  return best;
}

function segPolyDist(a: Pt, b: Pt, v: Pt[]): number {
  if (polySigned(v, a) <= 0 || polySigned(v, b) <= 0) return 0;
  let best = Infinity;
  for (let i = 0; i < v.length; i++)
    best = Math.min(best, segSegDist(a, b, v[i], v[(i + 1) % v.length]));
  return best;
}

function polyPolyDist(p: Pt[], q: Pt[]): number {
  // Overlap (SAT) → 0, else min edge-edge distance.
  if (p.some((x) => polySigned(q, x) <= 0) || q.some((x) => polySigned(p, x) <= 0)) return 0;
  let best = Infinity;
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      best = Math.min(best, segSegDist(p[i], p[(i + 1) % p.length], q[j], q[(j + 1) % q.length]));
    }
  }
  return best;
}

/** Gap between two shapes: > 0 disjoint (exact distance), <= 0 overlapping. */
function gap(A: G, B: G): number {
  if (A.kind === "capsule" || B.kind === "capsule") {
    const [C, O] = A.kind === "capsule" ? [A, B] : [B as G & { kind: "capsule" }, A];
    const cap = C as G & { kind: "capsule" };
    if (O.kind === "circle") return segPointDist(cap.a, cap.b, O.c) - cap.r - O.r;
    if (O.kind === "poly") return segPolyDist(cap.a, cap.b, O.v) - cap.r;
    return segSegDist(cap.a, cap.b, O.a, O.b) - cap.r - O.r;
  }
  if (A.kind === "circle" && B.kind === "circle")
    return Math.hypot(A.c[0] - B.c[0], A.c[1] - B.c[1]) - A.r - B.r;
  if (A.kind === "circle" && B.kind === "poly") return polySigned(B.v, A.c) - A.r;
  if (A.kind === "poly" && B.kind === "circle") return polySigned(A.v, B.c) - B.r;
  return polyPolyDist((A as any).v, (B as any).v);
}

/** Containment margin: > 0 strictly contains, < 0 does not. */
function containMargin(A: G, B: G): number {
  if (A.kind === "circle") {
    if (B.kind === "circle") return A.r - Math.hypot(A.c[0] - B.c[0], A.c[1] - B.c[1]) - B.r;
    if (B.kind === "poly")
      return Math.min(...B.v.map((p) => A.r - Math.hypot(p[0] - A.c[0], p[1] - A.c[1])));
  }
  if (A.kind === "poly") {
    if (B.kind === "circle") return -polySigned(A.v, B.c) - B.r;
    if (B.kind === "poly") return Math.min(...B.v.map((p) => -polySigned(A.v, p)));
  }
  throw new Error("unsupported");
}

function rot(local: Pt[], pos: Pt, ang: number): Pt[] {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return local.map(([x, y]) => [pos[0] + c * x - s * y, pos[1] + s * x + c * y]);
}

function makeShape(rnd: () => number, kinds: G["kind"][], spread: number): G {
  const pos: Pt = [(rnd() - 0.5) * spread, (rnd() - 0.5) * spread];
  const ang = rnd() * Math.PI * 2;
  const body = new Body(BodyType.DYNAMIC, Vec2.weak(pos[0], pos[1]));
  body.rotation = ang;
  const kind = kinds[Math.floor(rnd() * kinds.length)];
  if (kind === "circle") {
    const r = 2 + rnd() * 10;
    const off: Pt = [(rnd() - 0.5) * 4, (rnd() - 0.5) * 4];
    const shape = new Circle(r, Vec2.weak(off[0], off[1]));
    body.shapes.add(shape);
    return { kind, c: rot([off], pos, ang)[0], r, shape };
  }
  if (kind === "capsule") {
    const h = 4 + rnd() * 8;
    const w = h + 2 + rnd() * 16;
    const shape = new Capsule(w, h);
    body.shapes.add(shape);
    const r = h / 2;
    const hl = w / 2 - r;
    const [a, b] = rot(
      [
        [-hl, 0],
        [hl, 0],
      ],
      pos,
      ang,
    );
    return { kind, a, b, r, band: r * (1 - Math.cos(Math.PI / 16)), shape };
  }
  const n = 3 + Math.floor(rnd() * 6);
  const R = 3 + rnd() * 10;
  const squash = 0.5 + 0.5 * rnd();
  const local: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.3 * rnd()) / n) * Math.PI * 2;
    local.push([Math.cos(a) * R, Math.sin(a) * R * squash]);
  }
  const shape = new Polygon(local.map(([x, y]) => Vec2.weak(x, y)));
  body.shapes.add(shape);
  return { kind: "poly", v: rot(local, pos, ang), shape };
}

describe("ZPP_Collide — Geom queries against convex geometry", () => {
  it("intersects() matches the oracle for circle/polygon pairs in every order", () => {
    const rnd = mulberry32(1);
    let yes = 0;
    let no = 0;
    for (let k = 0; k < 1500; k++) {
      const A = makeShape(rnd, ["circle", "poly"], 40);
      const B = makeShape(rnd, ["circle", "poly"], 40);
      const g = gap(A, B);
      if (Math.abs(g) < 1e-6) continue;
      const want = g < 0;
      expect(Geom.intersects(A.shape, B.shape), `pair ${k} gap ${g}`).toBe(want);
      expect(Geom.intersects(B.shape, A.shape), `pair ${k} reversed`).toBe(want);
      expect(Geom.intersectsBody(A.shape.body, B.shape.body)).toBe(want);
      if (want) yes++;
      else no++;
    }
    expect(yes).toBeGreaterThan(200);
    expect(no).toBeGreaterThan(200);
  });

  it("intersects() with capsules agrees with the analytic stadium outside the inscription band", () => {
    const rnd = mulberry32(2);
    let decided = 0;
    for (let k = 0; k < 1500; k++) {
      const A = makeShape(rnd, ["capsule"], 40);
      const B = makeShape(rnd, ["circle", "poly", "capsule"], 40);
      const band = (A as any).band + (B.kind === "capsule" ? (B as any).band : 0);
      const g = gap(A, B);
      // The capsule polygon is inside the stadium: clearly separated
      // stadiums never intersect; clearly overlapping ones (deeper than the
      // band) always do.
      if (g > 1e-6) {
        expect(Geom.intersects(A.shape, B.shape), `pair ${k}`).toBe(false);
        decided++;
      } else if (g < -band - 1e-6) {
        expect(Geom.intersects(A.shape, B.shape), `pair ${k}`).toBe(true);
        expect(Geom.intersects(B.shape, A.shape), `pair ${k} reversed`).toBe(true);
        decided++;
      }
    }
    expect(decided).toBeGreaterThan(1200);
  });

  it("contains() matches the oracle (circle/polygon in every combination)", () => {
    const rnd = mulberry32(3);
    let yes = 0;
    let no = 0;
    for (let k = 0; k < 3000; k++) {
      // Big container, small candidate near it, so containment is common
      // and AABB-inside-AABB but shape-not-inside cases occur.
      const A = makeShape(rnd, ["circle", "poly"], 6);
      const B = makeShape(rnd, ["circle", "poly"], 14);
      const m = containMargin(A, B);
      if (Math.abs(m) < 1e-6) continue;
      const want = m > 0;
      expect(Geom.contains(A.shape, B.shape), `pair ${k} margin ${m}`).toBe(want);
      if (want) yes++;
      else no++;
    }
    expect(yes).toBeGreaterThan(100);
    expect(no).toBeGreaterThan(100);
  });

  it("contains(): AABB nested but the shape pokes out", () => {
    // Square of half-size 4 inside a radius-5 circle's AABB, corners at
    // distance 5.66 > 5: not contained.
    const cb = new Body();
    const circle = new Circle(5);
    cb.shapes.add(circle);
    const pb = new Body();
    const square = new Polygon(Polygon.box(8, 8));
    pb.shapes.add(square);
    expect(Geom.contains(circle, square)).toBe(false);
    // Circle of radius 3 inside a triangle's AABB but crossing the hypotenuse.
    const tb = new Body();
    const tri = new Polygon([new Vec2(0, 0), new Vec2(10, 0), new Vec2(0, 10)]);
    tb.shapes.add(tri);
    const sb = new Body(BodyType.DYNAMIC, new Vec2(4, 4));
    const small = new Circle(1.5);
    sb.shapes.add(small);
    expect(Geom.contains(tri, small)).toBe(false);
    sb.position.setxy(2.5, 2.5);
    expect(Geom.contains(tri, small)).toBe(true);
    // Square whose AABB [2.5,5.5]^2 lies inside the triangle's AABB, but
    // whose corner (5.5,5.5) is beyond the hypotenuse x + y = 10.
    const qb = new Body(BodyType.DYNAMIC, new Vec2(4, 4));
    const sq = new Polygon(Polygon.box(3, 3));
    qb.shapes.add(sq);
    expect(Geom.contains(tri, sq)).toBe(false);
    qb.position.setxy(3, 3);
    expect(Geom.contains(tri, sq)).toBe(true);
    // A box rotated by 45° inside an axis-aligned box: half-diagonal
    // 3.25 * sqrt(2) = 4.6 < 5, contained.
    const ob = new Body();
    const outer = new Polygon(Polygon.box(10, 10));
    ob.shapes.add(outer);
    const db = new Body();
    db.rotation = Math.PI / 4;
    const diamond = new Polygon(Polygon.box(6.5, 6.5));
    db.shapes.add(diamond);
    expect(Geom.contains(outer, diamond)).toBe(true);
  });

  it("distance() on disjoint pairs equals the closed-form distance, witnesses on the boundaries", () => {
    const rnd = mulberry32(4);
    let checked = 0;
    for (let k = 0; k < 800; k++) {
      const A = makeShape(rnd, ["circle", "poly"], 60);
      const B = makeShape(rnd, ["circle", "poly"], 60);
      const g = gap(A, B);
      if (g < 1e-3) continue;
      const o1 = new Vec2();
      const o2 = new Vec2();
      const d = Geom.distance(A.shape, B.shape, o1, o2);
      expect(d, `pair ${k}`).toBeCloseTo(g, 6);
      expect(Math.hypot(o1.x - o2.x, o1.y - o2.y)).toBeCloseTo(g, 6);
      const onBoundary = (S: G, p: Pt) =>
        S.kind === "circle"
          ? Math.hypot(p[0] - S.c[0], p[1] - S.c[1]) - S.r
          : polySigned((S as any).v, p);
      expect(onBoundary(A, [o1.x, o1.y])).toBeCloseTo(0, 6);
      expect(onBoundary(B, [o2.x, o2.y])).toBeCloseTo(0, 6);
      const db = Geom.distanceBody(A.shape.body, B.shape.body, new Vec2(), new Vec2());
      expect(db).toBeCloseTo(g, 6);
      checked++;
    }
    expect(checked).toBeGreaterThan(300);
  });
});

describe("ZPP_Collide.contactCollide — degenerate circle/polygon contacts", () => {
  it("a circle centred exactly on a box corner gets one contact of depth = radius at the corner", () => {
    const space = new Space(Vec2.weak(0, 0));
    const box = new Body(BodyType.STATIC);
    box.shapes.add(new Polygon(Polygon.box(10, 10)));
    box.space = space;
    const corners: Pt[] = [
      [5, 5],
      [-5, 5],
      [5, -5],
      [-5, -5],
    ];
    for (const [x, y] of corners) {
      const ball = new Body(BodyType.DYNAMIC, new Vec2(x, y));
      ball.shapes.add(new Circle(2));
      ball.space = space;
    }
    space.step(1 / 60);
    const arbs = space.arbiters;
    expect(arbs.length).toBe(4);
    const seen = new Set<string>();
    for (let i = 0; i < arbs.length; i++) {
      const a = arbs.at(i).collisionArbiter!;
      expect(a.contacts.length).toBe(1);
      const c = a.contacts.at(0);
      expect(c.penetration).toBeCloseTo(2, 9);
      // The normal is an arbitrary fallback axis (centre on the vertex has
      // no direction), but it must be a unit vector.
      expect(Math.hypot(a.normal.x, a.normal.y)).toBeCloseTo(1, 12);
      seen.add(`${c.position.x},${c.position.y}`);
    }
    expect([...seen].sort()).toEqual(corners.map(([x, y]) => `${x},${y}`).sort());
  });
});
