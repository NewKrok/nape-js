/**
 * ZPP_Cutter — bounded cuts checked chord by chord.
 *
 * The line through `start`/`end` meets a simple polygon in general position
 * in an even number of crossings; consecutive pairs bound the "chords" — the
 * maximal pieces of the line inside the polygon. nape's semantics for a
 * bounded cut (Haxe GeomPoly.cut docs): a chord is cut only when it lies
 * entirely inside the parameter range [boundedStart ? 0 : -inf,
 * boundedEnd ? 1 : +inf]; a segment that stops inside the polygon does not
 * leave a slit.
 *
 * Independent oracle (no use of the cutter):
 *   - piece count = 1 + number of covered chords (each chord through a
 *     simple polygon splits one simply connected piece into exactly two)
 *   - for every chord, the two points just either side of its midpoint lie
 *     in different pieces iff the chord is covered
 *   - piece areas sum to the input area, every piece keeps the winding
 *
 * Exercises the cutter's "virtual intersection" paths (crossings outside the
 * range, paired with real ones) for segments starting and/or ending inside,
 * rays in both directions, and lazily validated Vec2 inputs.
 */

import { describe, it, expect } from "vitest";
import "../../src/index";
import { GeomPoly } from "../../src/geom/GeomPoly";
import { Vec2 } from "../../src/geom/Vec2";
import { Body } from "../../src/phys/Body";
import { GeomPolyList } from "../../src/util/registerLists";

type Pt = [number, number];

const poly = (pts: Pt[]) => new GeomPoly(pts.map(([x, y]) => new Vec2(x, y)));

function ring(p: any): Pt[] {
  const out: Pt[] = [];
  const it = p.iterator();
  while (it.hasNext()) {
    const v = it.next();
    out.push([v.x, v.y]);
  }
  return out;
}

function pieces(list: any): Pt[][] {
  const out: Pt[][] = [];
  for (let i = 0; i < list.length; i++) out.push(ring(list.at(i)));
  return out;
}

function signedArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    a += ax * by - bx * ay;
  }
  return a / 2;
}

function evenOdd(pts: Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    if (ay > y !== by > y && x < ax + ((y - ay) * (bx - ax)) / (by - ay)) inside = !inside;
  }
  return inside;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Star-shaped around the origin (so simple), strongly concave. */
function star(rnd: () => number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.2 + rnd() * 0.6) / n) * Math.PI * 2;
    const r = i % 2 === 0 ? 60 + rnd() * 40 : 10 + rnd() * 30;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/** Line parameters (S + t (E - S)) where the line crosses the ring, sorted. */
function crossings(pts: Pt[], S: Pt, E: Pt): number[] {
  const dx = E[0] - S[0];
  const dy = E[1] - S[1];
  const ts: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const sa = dx * (ay - S[1]) - dy * (ax - S[0]);
    const sb = dx * (by - S[1]) - dy * (bx - S[0]);
    if (sa === 0 || sb === 0) throw new Error("line through a vertex: not general position");
    if (sa > 0 === sb > 0) continue;
    const u = sa / (sa - sb);
    const x = ax + (bx - ax) * u;
    const y = ay + (by - ay) * u;
    ts.push(Math.abs(dx) > Math.abs(dy) ? (x - S[0]) / dx : (y - S[1]) / dy);
  }
  return ts.sort((a, b) => a - b);
}

let coveredTotal = 0;
let uncoveredTotal = 0;

function checkBoundedCut(input: Pt[], S: Pt, E: Pt, bs: boolean, be: boolean, cut?: any) {
  const out = pieces(cut ?? poly(input).cut(new Vec2(...S), new Vec2(...E), bs, be));
  const ts = crossings(input, S, E);
  expect(ts.length % 2).toBe(0);
  const lo = bs ? 0 : -Infinity;
  const hi = be ? 1 : Infinity;
  const dx = E[0] - S[0];
  const dy = E[1] - S[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const which = (x: number, y: number) => {
    const idx = out.map((p, k) => (evenOdd(p, x, y) ? k : -1)).filter((k) => k >= 0);
    expect(idx.length).toBe(1);
    return idx[0];
  };

  let covered = 0;
  for (let k = 0; k < ts.length; k += 2) {
    const isCovered = ts[k] >= lo && ts[k + 1] <= hi;
    if (isCovered) covered++;
    else uncoveredTotal++;
    const tm = (ts[k] + ts[k + 1]) / 2;
    const mx = S[0] + dx * tm;
    const my = S[1] + dy * tm;
    const off = 1e-6;
    const above = which(mx + nx * off, my + ny * off);
    const below = which(mx - nx * off, my - ny * off);
    expect(above !== below, `chord ${k / 2} [${ts[k]}, ${ts[k + 1]}] covered=${isCovered}`).toBe(
      isCovered,
    );
  }
  coveredTotal += covered;
  expect(out.length).toBe(1 + covered);

  const inputArea = signedArea(input);
  let sum = 0;
  for (const p of out) {
    const a = signedArea(p);
    expect(Math.sign(a)).toBe(Math.sign(inputArea));
    sum += a;
  }
  expect(sum).toBeCloseTo(inputArea, 6);
  return out;
}

/** Random point inside the polygon (rejection sampling), often in a spike. */
function innerPoint(rnd: () => number, input: Pt[]): Pt {
  for (;;) {
    const p: Pt = [(rnd() - 0.5) * 200, (rnd() - 0.5) * 200];
    if (evenOdd(input, ...p)) return p;
  }
}

function outerPoint(rnd: () => number): Pt {
  const a = rnd() * Math.PI * 2;
  return [Math.cos(a) * 150, Math.sin(a) * 150];
}

describe("ZPP_Cutter — bounded cuts, chord oracle", () => {
  type Gen = (r: () => number, input: Pt[]) => [Pt, Pt, boolean, boolean];
  // [name, generator, expect uncovered chords to occur]
  const modes: [string, Gen, boolean][] = [
    [
      "segment, start inside, end outside",
      (r, P) => [innerPoint(r, P), outerPoint(r), true, true],
      true,
    ],
    [
      "segment, start outside, end inside",
      (r, P) => [outerPoint(r), innerPoint(r, P), true, true],
      true,
    ],
    ["segment, both ends inside", (r, P) => [innerPoint(r, P), innerPoint(r, P), true, true], true],
    [
      "ray from inside (boundedStart only)",
      (r, P) => [innerPoint(r, P), outerPoint(r), true, false],
      true,
    ],
    [
      "ray ending inside (boundedEnd only)",
      (r, P) => [outerPoint(r), innerPoint(r, P), false, true],
      true,
    ],
    // Starting far outside, nothing lies behind the start: every chord is covered.
    [
      "ray from outside (boundedStart only)",
      (r) => [outerPoint(r), outerPoint(r), true, false],
      false,
    ],
    [
      "ray ending outside (boundedEnd only)",
      (r) => [outerPoint(r), outerPoint(r), false, true],
      false,
    ],
    [
      "segment between two random points anywhere",
      (r) => {
        const p = (): Pt => [(r() - 0.5) * 220, (r() - 0.5) * 220];
        return [p(), p(), true, true];
      },
      true,
    ],
  ];
  modes.forEach(([name, gen, wantUncovered], mi) => {
    it(name, () => {
      const rnd = mulberry32(101 + mi);
      coveredTotal = 0;
      uncoveredTotal = 0;
      for (let trial = 0; trial < 120; trial++) {
        const input = star(rnd, 9 + Math.floor(rnd() * 16));
        const [S, E, bs, be] = gen(rnd, input);
        checkBoundedCut(input, S, E, bs, be);
      }
      // The chord kinds this mode can produce really occur, so the
      // covered / uncovered branches of the oracle are not vacuous.
      expect(coveredTotal).toBeGreaterThan(5);
      if (wantUncovered) expect(uncoveredTotal).toBeGreaterThan(5);
    });
  });

  it("a short segment wholly inside a convex polygon cuts nothing", () => {
    const sq: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const out = checkBoundedCut(sq, [3, 3], [7, 6], true, true);
    expect(out.length).toBe(1);
    expect(Math.abs(signedArea(out[0]))).toBeCloseTo(100, 12);
  });

  it("a segment that enters a U-shape, crosses one arm fully and stops in the other", () => {
    // U: two arms x in [0,2] and [4,6], joined at the bottom y in [0,2].
    const U: Pt[] = [
      [0, 0],
      [6, 0],
      [6, 10],
      [4, 10],
      [4, 2],
      [2, 2],
      [2, 10],
      [0, 10],
    ];
    // Horizontal at y=6 from x=-1 to x=5: covers chord [0,2] fully,
    // chord [4,6] only partially.
    const out = checkBoundedCut(U, [-1, 6], [5, 6], true, true);
    expect(out.length).toBe(2);
    const areas = out.map((p) => Math.abs(signedArea(p))).sort((a, b) => a - b);
    // U area = 60 - 2*8 = 44. Left arm above y=6: 2x4 = 8; the rest 36.
    expect(areas[0]).toBeCloseTo(8, 9);
    expect(areas[1]).toBeCloseTo(36, 9);
  });

  it("boundedEnd alone is the mirror image of boundedStart alone", () => {
    const rnd = mulberry32(77);
    for (let trial = 0; trial < 30; trial++) {
      const input = star(rnd, 11 + Math.floor(rnd() * 10));
      const A = innerPoint(rnd, input);
      const B = outerPoint(rnd);
      const f = pieces(poly(input).cut(new Vec2(...A), new Vec2(...B), true, false));
      const g = pieces(poly(input).cut(new Vec2(...B), new Vec2(...A), false, true));
      const areas = (ps: Pt[][]) => ps.map((p) => Math.abs(signedArea(p))).sort((a, b) => a - b);
      expect(g.length).toBe(f.length);
      const fa = areas(f);
      const ga = areas(g);
      for (let i = 0; i < fa.length; i++) expect(ga[i]).toBeCloseTo(fa[i], 6);
    }
  });

  it("accepts lazily validated Vec2s (body.position) as cut endpoints", () => {
    const body = new Body();
    body.position.setxy(-5, 5);
    const end = new Body();
    end.position.setxy(15, 5);
    const sq: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const cut = poly(sq).cut(body.position, end.position, true, true);
    const out = checkBoundedCut(sq, [-5, 5], [15, 5], true, true, cut);
    expect(out.map((p) => Math.abs(signedArea(p)))).toEqual([50, 50]);
  });

  it("appends to a caller-supplied output list and returns it", () => {
    const list = new GeomPolyList();
    const sq: Pt[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const ret = poly(sq).cut(new Vec2(-1, 4), new Vec2(11, 4), false, false, list);
    expect(ret).toBe(list);
    poly(sq).cut(new Vec2(4, -1), new Vec2(4, 11), false, false, list);
    expect(list.length).toBe(4);
    const areas = pieces(list)
      .map((p) => Math.abs(signedArea(p)))
      .sort((a, b) => a - b);
    expect(areas).toEqual([40, 40, 60, 60].map((a) => expect.closeTo(a, 9)));
  });
});
