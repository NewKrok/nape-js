/**
 * Broadphase oracle tests — builds seeded random scenes and runs every space
 * query on all three broadphases (DYNAMIC_AABB_TREE, SWEEP_AND_PRUNE,
 * SPATIAL_HASH), comparing each result against an independent brute-force
 * geometric oracle (own SAT / ray / containment maths, no engine collision code).
 *
 * Shapes whose classification is within a tiny epsilon of a boundary are
 * treated as "ambiguous" and excluded from the comparison on both sides.
 *
 * Known upstream (Haxe nape) semantics encoded in the oracle:
 *  - bodiesIn*(containment=true) only considers the body's shapes whose AABB
 *    overlaps the query region; multi-shape bodies are therefore excluded from
 *    random containment comparisons (they are covered deterministically below).
 *  - bodiesInAABB(strict=false, containment=false) includes a body only if one
 *    of its shapes' AABBs is fully contained in the query AABB.
 *  - shapesInAABB(strict=false, containment=false) under DYNAMIC_AABB_TREE
 *    tests the *fattened* tree AABB (FATTEN = 3), so it may return shapes up to
 *    2*FATTEN outside the query; it is checked as a sandwich instead of equality.
 */
import "../../src/index";
import { describe, it, expect } from "vitest";
import {
  Space,
  Broadphase,
  Body,
  BodyType,
  Vec2,
  AABB,
  Ray,
  Circle,
  Polygon,
  Compound,
  InteractionFilter,
  Shape,
} from "../../src/index";

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BPS: Array<[string, () => Broadphase]> = [
  ["DYNAMIC_AABB_TREE", () => Broadphase.DYNAMIC_AABB_TREE],
  ["SWEEP_AND_PRUNE", () => Broadphase.SWEEP_AND_PRUNE],
  ["SPATIAL_HASH", () => Broadphase.SPATIAL_HASH],
];

const EPS = 1e-6;
const FAT = 3;

// ---------------------------------------------------------------------------
// Independent geometry
// ---------------------------------------------------------------------------

type Pt = [number, number];
type G = { k: "c"; x: number; y: number; r: number } | { k: "p"; v: Pt[] };
type Box = [number, number, number, number];

function geomOf(s: Shape): G {
  if (s.isCircle()) {
    const c = s.worldCOM;
    return { k: "c", x: c.x, y: c.y, r: (s as Circle).radius };
  }
  const wv = (s as Polygon).worldVerts;
  const v: Pt[] = [];
  for (let i = 0; i < wv.length; i++) {
    const p = wv.at(i);
    v.push([p.x, p.y]);
  }
  // orient counter-clockwise (positive signed area)
  let area = 0;
  for (let i = 0; i < v.length; i++) {
    const a = v[i];
    const b = v[(i + 1) % v.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  if (area < 0) v.reverse();
  return { k: "p", v };
}

function boxOf(g: G): Box {
  if (g.k === "c") return [g.x - g.r, g.y - g.r, g.x + g.r, g.y + g.r];
  let a = Infinity,
    b = Infinity,
    c = -Infinity,
    d = -Infinity;
  for (const [x, y] of g.v) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [a, b, c, d];
}

/** >0 overlap, <0 separated (inclusive edges count as overlap at 0). */
function boxOverlap(a: Box, b: Box): number {
  return Math.min(a[2] - b[0], b[2] - a[0], a[3] - b[1], b[3] - a[1]);
}
/** >0 when `inner` is strictly inside `outer`. */
function boxContain(outer: Box, inner: Box): number {
  return Math.min(
    inner[0] - outer[0],
    inner[1] - outer[1],
    outer[2] - inner[2],
    outer[3] - inner[3],
  );
}

/** Signed distance of a point inside a CCW convex polygon (positive inside). */
function insideMargin(v: Pt[], px: number, py: number): number {
  let m = Infinity;
  for (let i = 0; i < v.length; i++) {
    const a = v[i];
    const b = v[(i + 1) % v.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    // inward normal for CCW polygon is (-ey, ex)
    const d = (-ey * (px - a[0]) + ex * (py - a[1])) / len;
    m = Math.min(m, d);
  }
  return m;
}

function segDist(px: number, py: number, a: Pt, b: Pt): number {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  let t = ((px - a[0]) * ex + (py - a[1]) * ey) / (ex * ex + ey * ey);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a[0] + t * ex), py - (a[1] + t * ey));
}

function pointMargin(g: G, px: number, py: number): number {
  if (g.k === "c") return g.r - Math.hypot(px - g.x, py - g.y);
  return insideMargin(g.v, px, py);
}

function polyPolySep(A: Pt[], B: Pt[]): number {
  let best = -Infinity;
  for (const [P, Q] of [
    [A, B],
    [B, A],
  ]) {
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      const b = P[(i + 1) % P.length];
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const len = Math.hypot(ex, ey);
      const nx = ey / len;
      const ny = -ex / len; // outward normal for CCW
      let mn = Infinity;
      for (const q of Q) mn = Math.min(mn, nx * (q[0] - a[0]) + ny * (q[1] - a[1]));
      best = Math.max(best, mn);
    }
  }
  return best;
}

/** >0 when the two shapes overlap. */
function intersectMargin(a: G, b: G): number {
  if (a.k === "c" && b.k === "c") return a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y);
  if (a.k === "p" && b.k === "p") return -polyPolySep(a.v, b.v);
  const c = (a.k === "c" ? a : b) as { x: number; y: number; r: number };
  const p = (a.k === "p" ? a : b) as { v: Pt[] };
  const im = insideMargin(p.v, c.x, c.y);
  if (im >= 0) return c.r + im;
  let d = Infinity;
  for (let i = 0; i < p.v.length; i++)
    d = Math.min(d, segDist(c.x, c.y, p.v[i], p.v[(i + 1) % p.v.length]));
  return c.r - d;
}

/** >0 when `outer` fully contains `inner`. */
function containMargin(outer: G, inner: G): number {
  if (outer.k === "c") {
    if (inner.k === "c")
      return outer.r - inner.r - Math.hypot(outer.x - inner.x, outer.y - inner.y);
    let m = Infinity;
    for (const [x, y] of inner.v) m = Math.min(m, outer.r - Math.hypot(x - outer.x, y - outer.y));
    return m;
  }
  if (inner.k === "c") return insideMargin(outer.v, inner.x, inner.y) - inner.r;
  let m = Infinity;
  for (const [x, y] of inner.v) m = Math.min(m, insideMargin(outer.v, x, y));
  return m;
}

function rectG(b: Box): G {
  return {
    k: "p",
    v: [
      [b[0], b[1]],
      [b[2], b[1]],
      [b[2], b[3]],
      [b[0], b[3]],
    ],
  };
}

/** First entry distance of a ray against a shape, or null. ok=false when grazing. */
function rayEntry(
  g: G,
  ox: number,
  oy: number,
  dx: number,
  dy: number,
): { t: number; graze: boolean } | null {
  if (g.k === "c") {
    const fx = ox - g.x;
    const fy = oy - g.y;
    const b = fx * dx + fy * dy;
    const c = fx * fx + fy * fy - g.r * g.r;
    const disc = b * b - c;
    if (disc < -1e-9 * g.r * g.r) return null;
    const sq = Math.sqrt(Math.max(0, disc));
    const t = -b - sq;
    if (t < 0) return null;
    return { t, graze: sq < 1e-4 * g.r };
  }
  let tin = -Infinity;
  let tout = Infinity;
  for (let i = 0; i < g.v.length; i++) {
    const a = g.v[i];
    const b = g.v[(i + 1) % g.v.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    const nx = ey / len;
    const ny = -ex / len;
    const num = nx * (ox - a[0]) + ny * (oy - a[1]); // >0 outside this edge
    const den = nx * dx + ny * dy;
    if (Math.abs(den) < 1e-14) {
      if (num > 0) return null;
      continue;
    }
    const t = -num / den;
    if (den < 0) tin = Math.max(tin, t);
    else tout = Math.min(tout, t);
  }
  if (tin > tout + 1e-9 || tin < 0) return null;
  return { t: tin, graze: tout - tin < 1e-4 };
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

interface Scene {
  space: Space;
  bodies: Body[];
  shapes: Shape[];
  compound: Compound;
}

function tagOf(x: Shape | Body): number {
  return (x.userData as any).tag as number;
}

function makeShape(rng: () => number, cls: number): Shape {
  let size: number;
  if (cls < 0.1) size = 0.05 + rng() * 0.4;
  else if (cls < 0.13) size = 120 + rng() * 180;
  else size = 2 + rng() * 35;
  const ox = (rng() - 0.5) * size;
  const oy = (rng() - 0.5) * size;
  const kind = rng();
  if (kind < 0.4) return new Circle(size, new Vec2(ox, oy));
  if (kind < 0.7) {
    const p = new Polygon(Polygon.box(size * (0.5 + rng()), size * (0.5 + rng())));
    p.translate(new Vec2(ox, oy));
    return p;
  }
  const p = new Polygon(
    Polygon.regular(size, size * (0.5 + rng() * 0.8), 3 + Math.floor(rng() * 5)),
  );
  p.rotate(rng() * Math.PI);
  p.translate(new Vec2(ox, oy));
  return p;
}

function randomFilter(rng: () => number): InteractionFilter {
  const group = 1 << Math.floor(rng() * 3);
  const mask = rng() < 0.4 ? -1 : 1 + Math.floor(rng() * 7);
  return new InteractionFilter(group, mask);
}

function buildScene(bp: Broadphase, seed: number, n = 110): Scene {
  const rng = mulberry32(seed);
  const space = new Space(new Vec2(0, 0), bp);
  const bodies: Body[] = [];
  const shapes: Shape[] = [];
  const addBody = (b: Body, nShapes: number) => {
    (b.userData as any).tag = bodies.length;
    bodies.push(b);
    for (let k = 0; k < nShapes; k++) {
      const s = makeShape(rng, rng());
      s.filter = randomFilter(rng);
      (s.userData as any).tag = shapes.length;
      shapes.push(s);
      b.shapes.add(s);
    }
    b.rotation = rng() * Math.PI * 2;
  };
  for (let i = 0; i < n; i++) {
    const r = rng();
    const type = r < 0.25 ? BodyType.STATIC : r < 0.4 ? BodyType.KINEMATIC : BodyType.DYNAMIC;
    const b = new Body(type, new Vec2((rng() - 0.5) * 800, (rng() - 0.5) * 800));
    addBody(b, rng() < 0.2 ? 2 : 1);
    b.space = space;
  }
  // a cluster of heavily overlapping small bodies
  for (let i = 0; i < 8; i++) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(50 + rng() * 6, -60 + rng() * 6));
    addBody(b, 1);
    b.space = space;
  }
  const compound = new Compound();
  for (let i = 0; i < 3; i++) {
    const b = new Body(BodyType.DYNAMIC, new Vec2(-150 + i * 9, 150 + rng() * 5));
    addBody(b, 1);
    b.compound = compound;
  }
  compound.space = space;
  return { space, bodies, shapes, compound };
}

// ---------------------------------------------------------------------------
// Oracles
// ---------------------------------------------------------------------------

interface Oracle {
  inn: Set<number>;
  amb: Set<number>;
}

function classify(m: number, o: Oracle, tag: number) {
  if (Math.abs(m) < EPS) o.amb.add(tag);
  else if (m > 0) o.inn.add(tag);
}

function passes(s: Shape, f: InteractionFilter | null): boolean {
  if (f == null) return true;
  const a = s.filter;
  return (a.collisionMask & f.collisionGroup) !== 0 && (f.collisionMask & a.collisionGroup) !== 0;
}

function liveShapes(sc: Scene): Shape[] {
  return sc.shapes.filter((s) => s.body != null && s.body.space === sc.space);
}

type ShapePred = (g: G, s: Shape) => number;

function shapeOracle(sc: Scene, f: InteractionFilter | null, pred: ShapePred): Oracle {
  const o: Oracle = { inn: new Set(), amb: new Set() };
  for (const s of liveShapes(sc)) {
    if (!passes(s, f)) continue;
    classify(pred(geomOf(s), s), o, tagOf(s));
  }
  return o;
}

/**
 * Body oracle following the engine's upstream semantics.
 * visit: margin that the shape is visited (AABB overlap); test: margin of the per-shape test.
 */
function bodyOracle(
  sc: Scene,
  f: InteractionFilter | null,
  visit: (g: G) => number,
  test: (g: G) => number,
  containment: boolean,
): Oracle {
  const o: Oracle = { inn: new Set(), amb: new Set() };
  const byBody = new Map<Body, Shape[]>();
  for (const s of liveShapes(sc)) {
    if (!passes(s, f)) continue;
    const arr = byBody.get(s.body) ?? [];
    arr.push(s);
    byBody.set(s.body, arr);
  }
  for (const [b, ss] of byBody) {
    const tag = tagOf(b);
    if (containment && b.shapes.length > 1) {
      o.amb.add(tag);
      continue;
    }
    let anyAmb = false;
    let anyIn = false;
    let anyFail = false;
    for (const s of ss) {
      const g = geomOf(s);
      const vm = visit(g);
      if (Math.abs(vm) < EPS) {
        anyAmb = true;
        continue;
      }
      if (vm < 0) continue;
      const tm = test(g);
      if (Math.abs(tm) < EPS) anyAmb = true;
      else if (tm > 0) anyIn = true;
      else anyFail = true;
    }
    if (anyAmb) o.amb.add(tag);
    else if (containment ? anyIn && !anyFail : anyIn) o.inn.add(tag);
  }
  return o;
}

function tags(list: any): number[] {
  const out: number[] = [];
  for (let i = 0; i < list.length; i++) out.push(tagOf(list.at(i)));
  return out;
}

/** Count of non-empty expected results, used to prove the battery is not vacuous. */
let nonEmptyExpectations = 0;

function expectMatches(label: string, got: number[], o: Oracle) {
  // no duplicates
  expect(new Set(got).size, `${label}: duplicate entries`).toBe(got.length);
  const g = got.filter((t) => !o.amb.has(t)).sort((a, b) => a - b);
  const e = [...o.inn].filter((t) => !o.amb.has(t)).sort((a, b) => a - b);
  if (e.length > 0) nonEmptyExpectations++;
  expect(g, label).toEqual(e);
}

// ---------------------------------------------------------------------------
// Query battery
// ---------------------------------------------------------------------------

function randomBox(rng: () => number): Box {
  const big = rng() < 0.15;
  const w = big ? 400 + rng() * 800 : rng() < 0.15 ? 0.5 + rng() * 2 : 10 + rng() * 200;
  const h = big ? 400 + rng() * 800 : rng() < 0.15 ? 0.5 + rng() * 2 : 10 + rng() * 200;
  const x = (rng() - 0.5) * 900 - w / 2;
  const y = (rng() - 0.5) * 900 - h / 2;
  return [x, y, x + w, y + h];
}

function maybeFilter(rng: () => number): InteractionFilter | null {
  return rng() < 0.5 ? null : randomFilter(rng);
}

function runAreaQueries(sc: Scene, rng: () => number, isDyn: boolean, iters: number) {
  const { space } = sc;
  const before = nonEmptyExpectations;
  for (let q = 0; q < iters; q++) {
    // ---- point ----
    const px = (rng() - 0.5) * 800;
    const py = (rng() - 0.5) * 800;
    let f = maybeFilter(rng);
    expectMatches(
      `shapesUnderPoint #${q}`,
      tags(space.shapesUnderPoint(new Vec2(px, py), f)),
      shapeOracle(sc, f, (g) => pointMargin(g, px, py)),
    );
    expectMatches(
      `bodiesUnderPoint #${q}`,
      tags(space.bodiesUnderPoint(new Vec2(px, py), f)),
      bodyOracle(
        sc,
        f,
        (g) => boxOverlap(boxOf(g), [px, py, px, py]),
        (g) => pointMargin(g, px, py),
        false,
      ),
    );

    // ---- AABB ----
    const qb = randomBox(rng);
    const aabb = new AABB(qb[0], qb[1], qb[2] - qb[0], qb[3] - qb[1]);
    const rect = rectG(qb);
    f = maybeFilter(rng);
    for (const containment of [false, true]) {
      for (const strict of [false, true]) {
        const label = `#${q} AABB c=${containment} s=${strict}`;
        const got = tags(space.shapesInAABB(aabb, containment, strict, f));
        let pred: ShapePred;
        if (strict)
          pred = containment ? (g) => containMargin(rect, g) : (g) => intersectMargin(g, rect);
        else pred = containment ? (g) => boxContain(qb, boxOf(g)) : (g) => boxOverlap(boxOf(g), qb);
        const o = shapeOracle(sc, f, pred);
        if (isDyn && !strict && !containment) {
          // sandwich: tight overlap ⊆ result ⊆ overlap with (2*FAT)-expanded box
          const outer = shapeOracle(sc, f, (g) => {
            const b = boxOf(g);
            return boxOverlap([b[0] - 2 * FAT, b[1] - 2 * FAT, b[2] + 2 * FAT, b[3] + 2 * FAT], qb);
          });
          const gs = new Set(got);
          for (const t of o.inn)
            if (!o.amb.has(t)) expect(gs.has(t), `${label} missing ${t}`).toBe(true);
          for (const t of got)
            expect(outer.inn.has(t) || outer.amb.has(t), `${label} extra ${t}`).toBe(true);
          expect(gs.size).toBe(got.length);
        } else {
          expectMatches(`shapesIn${label}`, got, o);
        }
        const bgot = tags(space.bodiesInAABB(aabb, containment, strict, f));
        const visit = (g: G) => boxOverlap(boxOf(g), qb);
        let test: (g: G) => number;
        if (strict)
          test = containment ? (g) => containMargin(rect, g) : (g) => intersectMargin(g, rect);
        else test = (g) => boxContain(qb, boxOf(g));
        expectMatches(`bodiesIn${label}`, bgot, bodyOracle(sc, f, visit, test, containment));
      }
    }

    // ---- circle ----
    const cx = (rng() - 0.5) * 800;
    const cy = (rng() - 0.5) * 800;
    const cr = rng() < 0.15 ? 0.2 + rng() : rng() < 0.15 ? 300 + rng() * 400 : 5 + rng() * 120;
    const circ: G = { k: "c", x: cx, y: cy, r: cr };
    const cbox = boxOf(circ);
    f = maybeFilter(rng);
    for (const containment of [false, true]) {
      const pred: ShapePred = containment
        ? (g) => containMargin(circ, g)
        : (g) => intersectMargin(g, circ);
      expectMatches(
        `#${q} shapesInCircle c=${containment}`,
        tags(space.shapesInCircle(new Vec2(cx, cy), cr, containment, f)),
        shapeOracle(sc, f, pred),
      );
      expectMatches(
        `#${q} bodiesInCircle c=${containment}`,
        tags(space.bodiesInCircle(new Vec2(cx, cy), cr, containment, f)),
        bodyOracle(sc, f, (g) => boxOverlap(boxOf(g), cbox), pred, containment),
      );
    }

    // ---- shape (query body not in space) ----
    const qbody = new Body(BodyType.KINEMATIC, new Vec2((rng() - 0.5) * 800, (rng() - 0.5) * 800));
    const qs = makeShape(rng, 0.5 + rng() * 0.5);
    qbody.shapes.add(qs);
    qbody.rotation = rng() * 6;
    const qg = geomOf(qs);
    const qbox = boxOf(qg);
    f = maybeFilter(rng);
    for (const containment of [false, true]) {
      const pred: ShapePred = containment
        ? (g) => containMargin(qg, g)
        : (g) => intersectMargin(g, qg);
      expectMatches(
        `#${q} shapesInShape c=${containment}`,
        tags(space.shapesInShape(qs, containment, f)),
        shapeOracle(sc, f, pred),
      );
      expectMatches(
        `#${q} bodiesInShape c=${containment}`,
        tags(space.bodiesInShape(qs, containment, f)),
        bodyOracle(sc, f, (g) => boxOverlap(boxOf(g), qbox), pred, containment),
      );
    }
    expectMatches(
      `#${q} shapesInBody`,
      tags(space.shapesInBody(qbody, f)),
      shapeOracle(sc, f, (g) => intersectMargin(g, qg)),
    );
    expectMatches(
      `#${q} bodiesInBody`,
      tags(space.bodiesInBody(qbody, f)),
      bodyOracle(
        sc,
        f,
        (g) => boxOverlap(boxOf(g), qbox),
        (g) => intersectMargin(g, qg),
        false,
      ),
    );
  }
  // at least a few results per query round must be non-empty
  expect(nonEmptyExpectations - before).toBeGreaterThan(iters * 3);
}

function randomRayOrigin(sc: Scene, rng: () => number): [number, number] {
  const live = liveShapes(sc).map(geomOf);
  for (let attempt = 0; ; attempt++) {
    if (attempt > 5000) throw new Error("no free ray origin");
    const x = (rng() - 0.5) * 900;
    const y = (rng() - 0.5) * 900;
    if (live.every((g) => pointMargin(g, x, y) < -1e-3)) return [x, y];
  }
}

function runRayQueries(sc: Scene, rng: () => number, iters: number) {
  const { space } = sc;
  for (let q = 0; q < iters; q++) {
    const [ox, oy] = randomRayOrigin(sc, rng);
    const mode = q % 4;
    let ang = rng() * Math.PI * 2;
    if (mode === 0) ang = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2; // dirx == 0
    let dx = Math.cos(ang);
    let dy = Math.sin(ang);
    if (mode === 0) dx = 0;
    if (mode === 1) dy = 0; // horizontal
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const ray = new Ray(new Vec2(ox, oy), new Vec2(dx * 3, dy * 3));
    const maxd = rng() < 0.5 ? Infinity : 50 + rng() * 600;
    ray.maxDistance = maxd;
    const f = maybeFilter(rng);

    // oracle
    let best = Infinity;
    let ambiguous = false;
    const hits = new Map<number, number>();
    const amb = new Set<number>();
    for (const s of liveShapes(sc)) {
      if (!passes(s, f)) continue;
      const g = geomOf(s);
      const e = rayEntry(g, ox, oy, dx, dy);
      if (e == null) continue;
      const tag = tagOf(s);
      if (e.graze || Math.abs(e.t - maxd) < 1e-4) {
        amb.add(tag);
        if (e.t <= best + 1e-4) ambiguous = true;
        continue;
      }
      if (e.t > maxd) continue;
      hits.set(tag, e.t);
      if (e.t < best) best = e.t;
    }

    const res = space.rayCast(ray, false, f);
    if (!ambiguous) {
      if (best === Infinity) {
        expect(res, `rayCast #${q} expected miss`).toBeNull();
      } else {
        expect(res, `rayCast #${q} expected hit`).not.toBeNull();
        expect(res!.distance).toBeCloseTo(best, 5);
        const t = hits.get(tagOf(res!.shape));
        expect(t).toBeDefined();
        expect(t!).toBeCloseTo(best, 5);
      }
    }
    if (res) res.dispose();

    const multi = space.rayMultiCast(ray, false, f);
    const got = new Map<number, number>();
    let prev = -Infinity;
    for (let i = 0; i < multi.length; i++) {
      const r = multi.at(i);
      expect(r.distance).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = r.distance;
      const tag = tagOf(r.shape);
      expect(got.has(tag), `rayMultiCast #${q} duplicate ${tag}`).toBe(false);
      got.set(tag, r.distance);
    }
    const gotKeys = [...got.keys()].filter((t) => !amb.has(t)).sort((a, b) => a - b);
    const expKeys = [...hits.keys()].filter((t) => !amb.has(t)).sort((a, b) => a - b);
    expect(gotKeys, `rayMultiCast #${q}`).toEqual(expKeys);
    for (const t of expKeys) expect(got.get(t)!).toBeCloseTo(hits.get(t)!, 5);
    multi.foreach((r: any) => r.dispose());
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("broadphase vs brute-force oracle — fresh scene (no step)", () => {
  for (const [name, get] of BPS) {
    it(`${name}: area queries match oracle`, () => {
      for (const seed of [1, 2, 3]) {
        const sc = buildScene(get(), seed);
        runAreaQueries(sc, mulberry32(seed * 7919), name === "DYNAMIC_AABB_TREE", 12);
      }
    });
    it(`${name}: ray queries match oracle`, () => {
      for (const seed of [4, 5]) {
        const sc = buildScene(get(), seed);
        runRayQueries(sc, mulberry32(seed * 104729), 40);
      }
    });
  }
});

describe("broadphase vs oracle — after stepping, moving, sleeping, removing", () => {
  for (const [name, get] of BPS) {
    const isDyn = name === "DYNAMIC_AABB_TREE";
    it(`${name}: queries after simulation steps with moving bodies`, () => {
      const sc = buildScene(get(), 11);
      const rng = mulberry32(99);
      for (const b of sc.bodies) {
        if (!b.isStatic()) b.velocity = new Vec2((rng() - 0.5) * 200, (rng() - 0.5) * 200);
        if (b.isKinematic()) b.angularVel = rng() - 0.5;
      }
      for (let i = 0; i < 20; i++) sc.space.step(1 / 60);
      runAreaQueries(sc, mulberry32(5), isDyn, 6);
      runRayQueries(sc, mulberry32(6), 15);
    });

    it(`${name}: queries after teleporting bodies by setting position (no step)`, () => {
      const sc = buildScene(get(), 12);
      const rng = mulberry32(1234);
      // prime the broadphase state with a step and a query
      sc.space.step(1 / 60);
      sc.space.shapesUnderPoint(new Vec2(0, 0));
      for (const b of sc.bodies) {
        if (rng() < 0.5) {
          // static bodies cannot be moved while in a space: take out, move, re-add
          const st = b.isStatic() && b.compound == null;
          if (b.isStatic() && !st) continue;
          if (st) b.space = null;
          b.position = new Vec2((rng() - 0.5) * 800, (rng() - 0.5) * 800);
          b.rotation += rng();
          if (st) b.space = sc.space;
        }
      }
      runAreaQueries(sc, mulberry32(7), isDyn, 5);
      // move again, between queries
      for (const b of sc.bodies) {
        if (!b.isStatic() && rng() < 0.3) b.position = new Vec2((rng() - 0.5) * 800, 0);
      }
      runAreaQueries(sc, mulberry32(8), isDyn, 3);
      runRayQueries(sc, mulberry32(9), 10);
      // and continue simulating afterwards
      for (let i = 0; i < 3; i++) sc.space.step(1 / 60);
      runAreaQueries(sc, mulberry32(10), isDyn, 3);
    });

    it(`${name}: queries over sleeping bodies, then after waking some`, () => {
      const sc = buildScene(get(), 13, 40);
      let n = 0;
      const dyn = () => sc.bodies.filter((b) => b.isDynamic() && b.space != null);
      while (n < 600 && !dyn().every((b) => b.isSleeping)) {
        sc.space.step(1 / 60);
        n++;
      }
      expect(dyn().every((b) => b.isSleeping)).toBe(true);
      runAreaQueries(sc, mulberry32(21), isDyn, 6);
      runRayQueries(sc, mulberry32(22), 10);
      const rng = mulberry32(23);
      for (const b of dyn()) {
        if (rng() < 0.4) b.position = new Vec2((rng() - 0.5) * 700, (rng() - 0.5) * 700);
        else if (rng() < 0.3) b.velocity = new Vec2(50, 0);
      }
      runAreaQueries(sc, mulberry32(24), isDyn, 4);
      sc.space.step(1 / 60);
      runAreaQueries(sc, mulberry32(25), isDyn, 4);
    });

    it(`${name}: queries after removing bodies, shapes and the compound mid-simulation`, () => {
      const sc = buildScene(get(), 14);
      const rng = mulberry32(31);
      for (const b of sc.bodies)
        if (b.isDynamic()) b.velocity = new Vec2(rng() * 40 - 20, rng() * 40 - 20);
      sc.space.step(1 / 60);
      // remove a third of the free bodies
      for (const b of sc.bodies) {
        if (b.compound == null && rng() < 0.33) b.space = null;
      }
      // remove/add shapes on bodies that remain in the space
      for (const b of sc.bodies) {
        if (b.space == null || b.compound != null) continue;
        const st = b.isStatic();
        if (st) b.space = null;
        if (b.shapes.length > 1 && rng() < 0.7) b.shapes.remove(b.shapes.at(0));
        else if (rng() < 0.2) {
          const s = makeShape(rng, 0.5);
          (s.userData as any).tag = sc.shapes.length;
          sc.shapes.push(s);
          b.shapes.add(s);
        }
        if (st) b.space = sc.space;
      }
      runAreaQueries(sc, mulberry32(32), isDyn, 4);
      sc.space.step(1 / 60);
      sc.compound.space = null;
      runAreaQueries(sc, mulberry32(33), isDyn, 4);
      runRayQueries(sc, mulberry32(34), 10);
      sc.compound.space = sc.space;
      runAreaQueries(sc, mulberry32(35), isDyn, 3);
      sc.space.step(1 / 60);
      runAreaQueries(sc, mulberry32(36), isDyn, 3);
    });
  }
});

describe("cross-broadphase agreement (identical static scene)", () => {
  function sorted(xs: number[]) {
    return [...xs].sort((a, b) => a - b);
  }

  it("strict queries, rays and convex casts are identical on all three broadphases", () => {
    const scenes = BPS.map(([, get]) => buildScene(get(), 77));
    const rngs = BPS.map(() => mulberry32(4242));
    for (let q = 0; q < 25; q++) {
      const results = scenes.map((sc, i) => {
        const rng = rngs[i];
        const out: any = {};
        const qb = randomBox(rng);
        const aabb = new AABB(qb[0], qb[1], qb[2] - qb[0], qb[3] - qb[1]);
        const f = maybeFilter(rng);
        out.sa = sorted(tags(sc.space.shapesInAABB(aabb, false, true, f)));
        out.sac = sorted(tags(sc.space.shapesInAABB(aabb, true, true, f)));
        out.sanc = sorted(tags(sc.space.shapesInAABB(aabb, true, false, f)));
        out.ba = sorted(tags(sc.space.bodiesInAABB(aabb, false, true, f)));
        out.ban = sorted(tags(sc.space.bodiesInAABB(aabb, false, false, f)));
        const c = new Vec2((rng() - 0.5) * 800, (rng() - 0.5) * 800);
        const r = 5 + rng() * 150;
        out.sc = sorted(tags(sc.space.shapesInCircle(c, r, false, f)));
        out.bcc = sorted(tags(sc.space.bodiesInCircle(c, r, true, f)));
        const ox = (rng() - 0.5) * 900;
        const oy = (rng() - 0.5) * 900;
        const ang = rng() * Math.PI * 2;
        const ray = new Ray(new Vec2(ox, oy), new Vec2(Math.cos(ang), Math.sin(ang)));
        const inner = rng() < 0.5;
        const rr = sc.space.rayCast(ray, inner, f);
        out.ray = rr ? [tagOf(rr.shape), +rr.distance.toFixed(6)] : null;
        const rm = sc.space.rayMultiCast(ray, inner, f);
        out.rm = [];
        for (let k = 0; k < rm.length; k++)
          out.rm.push([tagOf(rm.at(k).shape), +rm.at(k).distance.toFixed(6)]);
        out.rm.sort((a: number[], b: number[]) => a[1] - b[1] || a[0] - b[0]);

        // convex cast of a free circle body
        const caster = new Body(
          BodyType.DYNAMIC,
          new Vec2((rng() - 0.5) * 800, (rng() - 0.5) * 800),
        );
        const cs =
          rng() < 0.5 ? new Circle(3 + rng() * 10) : new Polygon(Polygon.box(4 + rng() * 10, 6));
        caster.shapes.add(cs);
        const va = rng() * Math.PI * 2;
        caster.velocity = new Vec2(Math.cos(va) * 400, Math.sin(va) * 400);
        const cr = sc.space.convexCast(cs, 1, false, f);
        out.cc = cr ? [tagOf(cr.shape), +cr.toi.toFixed(4)] : null;
        const cm = sc.space.convexMultiCast(cs, 1, false, f);
        out.cm = [];
        for (let k = 0; k < cm.length; k++) out.cm.push(tagOf(cm.at(k).shape));
        out.cm.sort((a: number, b: number) => a - b);
        return out;
      });
      expect(results[1], `query #${q} SAP vs DYN`).toEqual(results[0]);
      expect(results[2], `query #${q} HASH vs DYN`).toEqual(results[0]);
    }
  });

  it("convexCast of a circle matches an analytic swept-circle oracle", () => {
    for (const [name, get] of BPS) {
      const sc = buildScene(get(), 78, 50);
      const rng = mulberry32(55);
      let checked = 0;
      for (let q = 0; q < 30; q++) {
        const rad = 2 + rng() * 8;
        let ox: number;
        let oy: number;
        const live = liveShapes(sc);
        for (let attempt = 0; ; attempt++) {
          if (attempt > 5000) throw new Error("no free caster position");
          ox = (rng() - 0.5) * 800;
          oy = (rng() - 0.5) * 800;
          const me: G = { k: "c", x: ox, y: oy, r: rad };
          if (live.every((s) => intersectMargin(geomOf(s), me) < -0.5)) break;
        }
        const ang = rng() * Math.PI * 2;
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        const speed = 300;
        // oracle: ray from centre vs each shape inflated by rad
        let best = Infinity;
        for (const s of live) {
          const g = geomOf(s);
          let t: number | null = null;
          if (g.k === "c") {
            t = rayEntry({ k: "c", x: g.x, y: g.y, r: g.r + rad }, ox, oy, dx, dy)?.t ?? null;
          } else {
            const cands: number[] = [];
            for (const [vx, vy] of g.v) {
              const e = rayEntry({ k: "c", x: vx, y: vy, r: rad }, ox, oy, dx, dy);
              if (e) cands.push(e.t);
            }
            // edges offset outward by rad: test via polygon of offset edge quad
            for (let i = 0; i < g.v.length; i++) {
              const a = g.v[i];
              const b = g.v[(i + 1) % g.v.length];
              const ex = b[0] - a[0];
              const ey = b[1] - a[1];
              const l = Math.hypot(ex, ey);
              const nx = (ey / l) * rad;
              const ny = (-ex / l) * rad;
              const quad: G = {
                k: "p",
                v: [
                  [a[0], a[1]],
                  [b[0], b[1]],
                  [b[0] + nx, b[1] + ny],
                  [a[0] + nx, a[1] + ny],
                ].reverse() as Pt[],
              };
              // ensure CCW
              const gq = quad as { k: "p"; v: Pt[] };
              let area = 0;
              for (let k = 0; k < 4; k++) {
                const p = gq.v[k];
                const r2 = gq.v[(k + 1) % 4];
                area += p[0] * r2[1] - r2[0] * p[1];
              }
              if (area < 0) gq.v.reverse();
              const e = rayEntry(gq, ox, oy, dx, dy);
              if (e) cands.push(e.t);
            }
            if (cands.length) t = Math.min(...cands);
          }
          if (t != null && t < best) best = t;
        }
        const caster = new Body(BodyType.DYNAMIC, new Vec2(ox, oy));
        const cs = new Circle(rad);
        caster.shapes.add(cs);
        caster.velocity = new Vec2(dx * speed, dy * speed);
        const res = sc.space.convexCast(cs, 1, false, null);
        if (best > speed) {
          expect(res, `${name} convexCast #${q} should miss`).toBeNull();
        } else {
          expect(res, `${name} convexCast #${q} should hit at ${best}`).not.toBeNull();
          expect(Math.abs(res!.toi * speed - best), `${name} #${q}`).toBeLessThan(0.1);
          checked++;
        }
        if (res) res.dispose();
      }
      expect(checked).toBeGreaterThan(3);
    }
  });
});
