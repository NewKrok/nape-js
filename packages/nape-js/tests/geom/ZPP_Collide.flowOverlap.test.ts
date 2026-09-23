/**
 * ZPP_Collide.flowCollide — fluid overlap area and centroid against geometry.
 *
 * flowCollide computes the intersection of a fluid shape with another shape
 * (area → `FluidArbiter.overlap`, centroid → `FluidArbiter.position`), which
 * drives buoyancy. The existing fluid suites only assert that bodies float;
 * nothing pinned the overlap itself, and the polygon–polygon clipper's
 * "no vertex of either polygon inside the other" path (two crossing bars)
 * never ran.
 *
 * Each case places a static fluid shape and a dynamic shape in a zero-gravity
 * space, steps once (no gravity → no buoyancy force, no drag at rest, so
 * nothing moves) and compares the arbiter with an independent computation:
 *   - convex polygon ∩ convex polygon: Sutherland–Hodgman clipping
 *   - circle ∩ polygon: the circle as a 4096-gon, clipped the same way
 *   - circle ∩ circle: the closed-form lens area and centroid
 */

import { describe, it, expect } from "vitest";
import "../../src/core/engine";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Polygon } from "../../src/shape/Polygon";
import { Circle } from "../../src/shape/Circle";

type Pt = [number, number];

type ShapeSpec =
  | { kind: "poly"; local: Pt[]; x: number; y: number; rot: number }
  | { kind: "circle"; r: number; x: number; y: number };

const CIRCLE_SEGMENTS = 4096;

function worldPoly(s: Extract<ShapeSpec, { kind: "poly" }>): Pt[] {
  const c = Math.cos(s.rot);
  const n = Math.sin(s.rot);
  return s.local.map(([x, y]) => [s.x + c * x - n * y, s.y + n * x + c * y]);
}

function asPolygon(s: ShapeSpec): Pt[] {
  if (s.kind === "poly") return worldPoly(s);
  const out: Pt[] = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a = (2 * Math.PI * i) / CIRCLE_SEGMENTS;
    out.push([s.x + s.r * Math.cos(a), s.y + s.r * Math.sin(a)]);
  }
  return out;
}

/** Signed area; positive for counter-clockwise rings. */
function signedArea(p: Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[(i + 1) % p.length];
    a += ax * by - bx * ay;
  }
  return a / 2;
}

function ccw(p: Pt[]): Pt[] {
  return signedArea(p) < 0 ? [...p].reverse() : p;
}

function areaAndCentroid(p: Pt[]): { area: number; cx: number; cy: number } {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[(i + 1) % p.length];
    const cr = ax * by - bx * ay;
    a += cr;
    cx += (ax + bx) * cr;
    cy += (ay + by) * cr;
  }
  a /= 2;
  return a === 0
    ? { area: 0, cx: 0, cy: 0 }
    : { area: Math.abs(a), cx: cx / (6 * a), cy: cy / (6 * a) };
}

/** Sutherland–Hodgman: clip `subject` by the convex, counter-clockwise `clip`. */
function clipConvex(subject: Pt[], clip: Pt[]): Pt[] {
  let out = ccw(subject);
  const c = ccw(clip);
  for (let i = 0; i < c.length && out.length > 0; i++) {
    const [ax, ay] = c[i];
    const [bx, by] = c[(i + 1) % c.length];
    const side = ([x, y]: Pt) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
  }
  return out;
}

function lens(
  a: Extract<ShapeSpec, { kind: "circle" }>,
  b: Extract<ShapeSpec, { kind: "circle" }>,
) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d >= a.r + b.r) return { area: 0, cx: 0, cy: 0 };
  if (d <= Math.abs(a.r - b.r)) {
    const small = a.r < b.r ? a : b;
    return { area: Math.PI * small.r * small.r, cx: small.x, cy: small.y };
  }
  // Each side of the chord is a circular segment; the lens is their union.
  const x = (d * d + a.r * a.r - b.r * b.r) / (2 * d); // chord offset from a
  const segment = (r: number, h: number) => {
    // Segment of radius r cut by a chord at distance h from the centre.
    const th = 2 * Math.acos(h / r);
    const area = (r * r * (th - Math.sin(th))) / 2;
    const dist = (4 * r * Math.sin(th / 2) ** 3) / (3 * (th - Math.sin(th)));
    return { area, dist };
  };
  const sa = segment(a.r, x); // segment of a beyond the chord, towards b
  const sb = segment(b.r, d - x); // segment of b beyond the chord, towards a
  const ux = (b.x - a.x) / d;
  const uy = (b.y - a.y) / d;
  const area = sa.area + sb.area;
  const along = (sa.area * sa.dist + sb.area * (d - sb.dist)) / area;
  return { area, cx: a.x + ux * along, cy: a.y + uy * along };
}

function expected(fluid: ShapeSpec, other: ShapeSpec) {
  if (fluid.kind === "circle" && other.kind === "circle") return lens(fluid, other);
  const polyFirst = fluid.kind === "poly" ? fluid : other;
  const second = polyFirst === fluid ? other : fluid;
  return areaAndCentroid(clipConvex(asPolygon(second), asPolygon(polyFirst)));
}

function makeBody(spec: ShapeSpec, type: BodyType, fluid: boolean): Body {
  const b = new Body(type, new Vec2(spec.x, spec.y));
  const shape =
    spec.kind === "circle"
      ? new Circle(spec.r)
      : new Polygon(spec.local.map(([x, y]) => new Vec2(x, y)));
  shape.fluidEnabled = fluid;
  b.shapes.add(shape);
  if (spec.kind === "poly") b.rotation = spec.rot;
  return b;
}

/** Step once and return the fluid arbiter's overlap/position, or null. */
function measure(fluid: ShapeSpec, other: ShapeSpec) {
  const space = new Space(new Vec2(0, 0));
  const pool = makeBody(fluid, BodyType.STATIC, true);
  const body = makeBody(other, BodyType.DYNAMIC, false);
  pool.space = space;
  body.space = space;
  space.step(1 / 60);
  expect(body.position.x).toBeCloseTo(other.x, 9);
  expect(body.position.y).toBeCloseTo(other.y, 9);
  const arbs = body.arbiters;
  for (let i = 0; i < arbs.length; i++) {
    const a = arbs.at(i);
    if (a.isFluidArbiter()) {
      const f = a.fluidArbiter!;
      return { area: f.overlap, cx: f.position.x, cy: f.position.y };
    }
  }
  return null;
}

function expectOverlap(fluid: ShapeSpec, other: ShapeSpec, circleTol = 1e-5): void {
  const want = expected(fluid, other);
  const got = measure(fluid, other);
  const approx = fluid.kind === "circle" || other.kind === "circle" ? circleTol : 1e-9;
  if (want.area <= 1e-9) {
    expect(got == null || got.area <= 1e-9).toBe(true);
    return;
  }
  expect(got).not.toBeNull();
  const scale = Math.max(1, want.area);
  expect(Math.abs(got!.area - want.area) / scale).toBeLessThan(approx);
  const len = Math.sqrt(want.area);
  expect(Math.abs(got!.cx - want.cx) / len).toBeLessThan(Math.sqrt(approx));
  expect(Math.abs(got!.cy - want.cy) / len).toBeLessThan(Math.sqrt(approx));
}

const box = (w: number, h: number): Pt[] => [
  [-w / 2, -h / 2],
  [w / 2, -h / 2],
  [w / 2, h / 2],
  [-w / 2, h / 2],
];

function regular(n: number, r: number, phase = 0): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (2 * Math.PI * i) / n;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

const poly = (local: Pt[], x = 0, y = 0, rot = 0): ShapeSpec => ({
  kind: "poly",
  local,
  x,
  y,
  rot,
});
const circle = (r: number, x = 0, y = 0): ShapeSpec => ({ kind: "circle", r, x, y });

// ---------------------------------------------------------------------------

describe("flowCollide — polygon ∩ polygon", () => {
  it("crossing bars: no vertex of either polygon lies inside the other", () => {
    expectOverlap(poly(box(100, 20)), poly(box(20, 100)));
    expectOverlap(poly(box(20, 100)), poly(box(100, 20), 7, -3));
  });

  it("crossing bars at an angle", () => {
    expectOverlap(poly(box(120, 16)), poly(box(120, 16), 5, 2, 0.7));
    expectOverlap(poly(box(120, 16), 0, 0, 0.3), poly(box(16, 120), -4, 6, 0.1));
  });

  it("star-of-David: two triangles, no vertex of either inside the other", () => {
    expectOverlap(poly(regular(3, 40, Math.PI / 2)), poly(regular(3, 40, -Math.PI / 2)));
  });

  it("the dynamic polygon is entirely inside the fluid", () => {
    expectOverlap(poly(box(200, 200)), poly(regular(5, 20), 10, -15, 0.4));
  });

  it("the fluid polygon is entirely inside the dynamic one", () => {
    expectOverlap(poly(regular(6, 15)), poly(box(200, 200), 3, 4, 0.2));
  });

  it("corner overlaps with one vertex inside", () => {
    expectOverlap(poly(box(50, 50)), poly(box(50, 50), 40, 40, 0));
    expectOverlap(poly(box(50, 50)), poly(box(50, 50), 35, 30, Math.PI / 4));
  });

  it("disjoint polygons produce no overlap", () => {
    expectOverlap(poly(box(20, 20)), poly(box(20, 20), 100, 0));
  });

  it("seeded random convex pairs", () => {
    let s = 12345;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = 0; i < 40; i++) {
      const a = poly(regular(3 + Math.floor(rnd() * 6), 10 + rnd() * 40, rnd() * 6));
      const b = poly(
        regular(3 + Math.floor(rnd() * 6), 10 + rnd() * 40, rnd() * 6),
        (rnd() - 0.5) * 80,
        (rnd() - 0.5) * 80,
        rnd() * 6,
      );
      expectOverlap(a, b);
      expectOverlap(b, a);
    }
  });
});

describe("flowCollide — circle ∩ polygon", () => {
  it("circle fully inside a fluid polygon", () => {
    expectOverlap(poly(box(200, 200)), circle(20, 10, -5));
  });

  it("fluid circle fully inside a polygon", () => {
    expectOverlap(circle(20, 3, 4), poly(box(200, 200)));
  });

  it("polygon fully inside a fluid circle", () => {
    expectOverlap(circle(100), poly(regular(5, 30), 10, 10, 0.3));
  });

  it("circle crossing one polygon edge", () => {
    expectOverlap(poly(box(100, 100)), circle(20, 55, 0));
    expectOverlap(circle(20, 55, 0), poly(box(100, 100)));
  });

  it("circle over a polygon corner", () => {
    expectOverlap(poly(box(100, 100)), circle(25, 50, 50));
    expectOverlap(circle(25, 50, 50), poly(box(100, 100)));
  });

  it("thin bar crossing a circle (circle cut on both sides)", () => {
    expectOverlap(circle(40), poly(box(200, 10), 0, 12));
    expectOverlap(poly(box(200, 10), 0, 12), circle(40));
  });

  it("polygon vertices poke out of the circle on every side", () => {
    expectOverlap(circle(30), poly(regular(6, 36), 0, 0, 0.2));
    expectOverlap(poly(regular(6, 36), 0, 0, 0.2), circle(30));
  });

  it("seeded random circle / polygon pairs", () => {
    let s = 777;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = 0; i < 30; i++) {
      const c = circle(8 + rnd() * 40, (rnd() - 0.5) * 60, (rnd() - 0.5) * 60);
      const p = poly(regular(3 + Math.floor(rnd() * 6), 10 + rnd() * 40, rnd() * 6), 0, 0, rnd());
      expectOverlap(c, p);
      expectOverlap(p, c);
    }
  });
});

describe("flowCollide — polygon cutting a circle along several chords", () => {
  // Regression: with no polygon vertex inside the circle, the circle ∩ polygon
  // walk recorded the circular segment between consecutive edge crossings but
  // not the closing one. A single chord had its own code path and was exact;
  // two or more chords lost one circular segment (-21.6% for the 70-high
  // strip below).

  /** Exact area / centroid-y of a circle (radius R, at origin) ∩ strip y∈[y0,y1]. */
  function strip(R: number, y0: number, y1: number) {
    const a = Math.max(-R, y0);
    const b = Math.min(R, y1);
    const F = (y: number) => y * Math.sqrt(R * R - y * y) + R * R * Math.asin(y / R);
    const area = F(b) - F(a);
    const My = (-2 / 3) * ((R * R - b * b) ** 1.5 - (R * R - a * a) ** 1.5);
    return { area, cy: My / area };
  }

  for (const [h, oy] of [
    [10, 0],
    [10, 12],
    [30, 5],
    [70, 0],
    [60, -8],
  ]) {
    it(`strip of height ${h} at y=${oy} across a radius-40 circle`, () => {
      const want = strip(40, oy - h / 2, oy + h / 2);
      for (const circleIsFluid of [true, false]) {
        const c = circle(40);
        const bar = poly(box(200, h), 0, oy);
        const got = circleIsFluid ? measure(c, bar) : measure(bar, c);
        expect(got).not.toBeNull();
        expect(got!.area).toBeCloseTo(want.area, 9);
        expect(got!.cy).toBeCloseTo(want.cy, 9);
        expect(got!.cx).toBeCloseTo(0, 9);
      }
    });
  }

  it("triangle whose three edges each cut the circle (no vertex inside)", () => {
    expectOverlap(circle(30), poly(regular(3, 45, 0.3)));
    expectOverlap(poly(regular(3, 45, 0.3)), circle(30));
  });

  it("square whose four edges each cut the circle (no vertex inside)", () => {
    expectOverlap(circle(30), poly(box(50, 50), 2, -1, 0.4));
    expectOverlap(poly(box(50, 50), 2, -1, 0.4), circle(30));
  });

  it("hexagon cutting the circle six times", () => {
    expectOverlap(circle(30), poly(regular(6, 33), 0.5, 0.25, 0.1));
  });
});

describe("flowCollide — circle ∩ circle", () => {
  it("partial lens overlaps", () => {
    expectOverlap(circle(30), circle(20, 35, 0));
    expectOverlap(circle(20), circle(30, 0, -35));
    expectOverlap(circle(25), circle(25, 30, 20));
  });

  it("one circle inside the other", () => {
    expectOverlap(circle(50), circle(10, 12, -8));
    expectOverlap(circle(10, 2, 3), circle(50));
  });

  it("disjoint circles produce no overlap", () => {
    expectOverlap(circle(10), circle(10, 25, 0));
  });
});
