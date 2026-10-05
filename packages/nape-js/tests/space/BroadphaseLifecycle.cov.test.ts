/**
 * Broadphase lifecycle tests — exercises the add / query / move / remove /
 * clear orderings that drive the internal sync/move lists of each broadphase,
 * and checks the resulting pairs (arbiters) and query results against a
 * brute-force overlap oracle on all three broadphase types.
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
import { BodyList, ShapeList } from "../../src/util/registerLists";
import { ZPP_Broadphase } from "../../src/native/space/ZPP_Broadphase";
import { ZPP_SpatialHashPhase } from "../../src/native/space/ZPP_SpatialHashPhase";
import { ZPP_AABB } from "../../src/native/geom/ZPP_AABB";

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

function circleBody(type: BodyType, x: number, y: number, r: number, tag: number): Body {
  const b = new Body(type, new Vec2(x, y));
  const s = new Circle(r);
  (s.userData as any).tag = tag;
  (b.userData as any).tag = tag;
  b.shapes.add(s);
  return b;
}

function boxBody(type: BodyType, x: number, y: number, w: number, h: number, tag: number): Body {
  const b = new Body(type, new Vec2(x, y));
  const s = new Polygon(Polygon.box(w, h));
  (s.userData as any).tag = tag;
  (b.userData as any).tag = tag;
  b.shapes.add(s);
  return b;
}

function tagList(list: any): number[] {
  const out: number[] = [];
  for (let i = 0; i < list.length; i++) out.push((list.at(i).userData as any).tag);
  return out.sort((a, b) => a - b);
}

function probeShape(x: number, y: number, r: number): Shape {
  const b = new Body(BodyType.KINEMATIC, new Vec2(x, y));
  const s = new Circle(r);
  b.shapes.add(s);
  return s;
}

/** Collision-arbiter shape pairs attached to the given bodies (includes sleeping ones). */
function bodyArbiterPairs(bodies: Body[]): string[] {
  const out = new Set<string>();
  for (const b of bodies) {
    const arbs = b.arbiters;
    for (let i = 0; i < arbs.length; i++) {
      // sleeping arbiters are flagged inactive, so read the shapes from the internals
      const a = arbs.at(i).zpp_inner as any;
      if (!arbs.at(i).isCollisionArbiter()) continue;
      const t1 = (a.ws1.outer.userData as any).tag;
      const t2 = (a.ws2.outer.userData as any).tag;
      out.add(t1 < t2 ? `${t1}-${t2}` : `${t2}-${t1}`);
    }
  }
  return [...out].sort();
}

/** Collision-arbiter shape pairs currently in the space, as sorted "a-b" keys. */
function arbiterPairs(space: Space): string[] {
  const out: string[] = [];
  const arbs = space.arbiters;
  for (let i = 0; i < arbs.length; i++) {
    const a = arbs.at(i);
    if (!a.isCollisionArbiter()) continue;
    const t1 = (a.shape1.userData as any).tag;
    const t2 = (a.shape2.userData as any).tag;
    out.push(t1 < t2 ? `${t1}-${t2}` : `${t2}-${t1}`);
  }
  return out.sort();
}

type Snap = Map<Shape, [number, number, number]>;

/** Record world centres before a step: the step's broadphase sees these positions. */
function snapshot(shapes: Shape[]): Snap {
  const m: Snap = new Map();
  for (const s of shapes) {
    if (s.body?.space == null) continue;
    const c = s.worldCOM;
    m.set(s, [c.x, c.y, (s as Circle).radius]);
  }
  return m;
}

/**
 * Brute force: pairs of circles (on different bodies, at least one dynamic,
 * filters agreeing) that overlap by more than `margin`. Pairs within ±margin
 * of touching are returned separately as ambiguous.
 */
function circlePairOracle(snap: Snap, margin = 0.25): { must: string[]; amb: Set<string> } {
  const must: string[] = [];
  const amb = new Set<string>();
  const live = [...snap.keys()];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      if (a.body === b.body) continue;
      if (!a.body.isDynamic() && !b.body.isDynamic()) continue;
      if (!a.filter.shouldCollide(b.filter)) continue;
      const t1 = (a.userData as any).tag;
      const t2 = (b.userData as any).tag;
      const key = t1 < t2 ? `${t1}-${t2}` : `${t2}-${t1}`;
      const pa = snap.get(a)!;
      const pb = snap.get(b)!;
      const m = pa[2] + pb[2] - Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
      if (Math.abs(m) <= margin) amb.add(key);
      else if (m > 0) must.push(key);
    }
  }
  return { must: must.sort(), amb };
}

/** Take a tiny step and compare the resulting arbiters with the brute-force oracle. */
function stepAndExpectPairs(space: Space, shapes: Shape[], label: string) {
  const snap = snapshot(shapes);
  space.step(1e-7, 1, 1);
  const { must, amb } = circlePairOracle(snap);
  const got = arbiterPairs(space).filter((k) => !amb.has(k));
  expect(got, label).toEqual(must);
  expect(must.length, `${label}: oracle should not be vacuous`).toBeGreaterThan(0);
}

/** Random circle field: mix of static / kinematic / dynamic, overlapping on purpose. */
function circleField(space: Space, seed: number, n: number): { bodies: Body[]; shapes: Shape[] } {
  const rng = mulberry32(seed);
  const bodies: Body[] = [];
  const shapes: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const r = rng();
    const type = r < 0.2 ? BodyType.STATIC : r < 0.3 ? BodyType.KINEMATIC : BodyType.DYNAMIC;
    const b = circleBody(type, (rng() - 0.5) * 300, (rng() - 0.5) * 300, 4 + rng() * 14, i);
    const s = b.shapes.at(0);
    if (rng() < 0.3)
      s.filter = new InteractionFilter(1 << Math.floor(rng() * 2), rng() < 0.5 ? 1 : 2);
    b.space = space;
    bodies.push(b);
    shapes.push(s);
  }
  return { bodies, shapes };
}

// ---------------------------------------------------------------------------

for (const [name, get] of BPS) {
  describe(`${name} — pairs and lifecycle`, () => {
    it("arbiters after the first step match a brute-force overlap oracle", () => {
      for (const seed of [1, 2, 3]) {
        const space = new Space(new Vec2(0, 0), get());
        const { shapes } = circleField(space, seed, 70);
        // tiny step: pre-step overlap decides the pairs
        stepAndExpectPairs(space, shapes, `${name} seed ${seed}`);
      }
    });

    it("pairs track bodies that are teleported, removed and re-added between steps", () => {
      const space = new Space(new Vec2(0, 0), get());
      const { bodies, shapes } = circleField(space, 9, 50);
      space.step(1e-7, 1, 1);
      const rng = mulberry32(10);
      for (let round = 0; round < 6; round++) {
        for (const b of bodies) {
          const r = rng();
          if (r < 0.15 && b.space != null) b.space = null;
          else if (r < 0.3 && b.space == null) b.space = space;
          else if (r < 0.5 && b.space != null && !b.isStatic()) {
            b.position = new Vec2((rng() - 0.5) * 300, (rng() - 0.5) * 300);
          }
        }
        // queries in-between push the broadphase's internal sync state forward
        if (round % 2 === 0) space.bodiesInAABB(new AABB(-200, -200, 400, 400));
        stepAndExpectPairs(space, shapes, `${name} round ${round}`);
      }
    });

    it("body added, queried, then removed before any step is fully forgotten", () => {
      const space = new Space(new Vec2(0, 0), get());
      const a = circleBody(BodyType.DYNAMIC, 0, 0, 10, 1);
      const b = circleBody(BodyType.DYNAMIC, 5, 0, 10, 2);
      a.space = space;
      b.space = space;
      expect(tagList(space.shapesUnderPoint(new Vec2(2, 0)))).toEqual([1, 2]);
      b.space = null;
      expect(tagList(space.shapesUnderPoint(new Vec2(2, 0)))).toEqual([1]);
      space.step(1 / 60);
      expect(arbiterPairs(space)).toEqual([]);
      b.space = space;
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["1-2"]);
    });

    it("removing an earlier-added body after a query (before stepping) leaves the others intact", () => {
      const space = new Space(new Vec2(0, 0), get());
      const a = circleBody(BodyType.DYNAMIC, 0, 0, 10, 1);
      const b = circleBody(BodyType.DYNAMIC, 5, 0, 10, 2);
      const c = circleBody(BodyType.DYNAMIC, 10, 0, 10, 3);
      for (const x of [a, b, c]) x.space = space;
      expect(tagList(space.bodiesUnderPoint(new Vec2(5, 0)))).toEqual([1, 2, 3]);
      a.space = null; // first added: not at the head of the internal lists
      expect(tagList(space.bodiesUnderPoint(new Vec2(5, 0)))).toEqual([2, 3]);
      b.space = null;
      expect(tagList(space.bodiesUnderPoint(new Vec2(5, 0)))).toEqual([3]);
      b.space = space;
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["2-3"]);
    });

    it("query, then move, then step (no query in between) picks up the new overlap", () => {
      const space = new Space(new Vec2(0, 0), get());
      const a = circleBody(BodyType.DYNAMIC, 0, 0, 5, 1);
      const b = circleBody(BodyType.DYNAMIC, 100, 0, 5, 2);
      a.space = space;
      b.space = space;
      space.step(1e-7, 1, 1);
      expect(tagList(space.shapesInAABB(new AABB(90, -10, 20, 20)))).toEqual([2]);
      b.position = new Vec2(6, 0);
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["1-2"]);
      expect(tagList(space.shapesInAABB(new AABB(90, -10, 20, 20)))).toEqual([]);
    });

    it("query, move, query, move again, then step: pairs reflect the final positions", () => {
      const space = new Space(new Vec2(0, 0), get());
      const a = circleBody(BodyType.DYNAMIC, 0, 0, 5, 1);
      const b = circleBody(BodyType.DYNAMIC, 100, 0, 5, 2);
      const c = circleBody(BodyType.STATIC, 200, 0, 5, 3);
      for (const x of [a, b, c]) x.space = space;
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual([]);
      expect(tagList(space.bodiesInCircle(new Vec2(100, 0), 1))).toEqual([2]);
      b.position = new Vec2(4, 0); // overlap a
      expect(tagList(space.bodiesInCircle(new Vec2(4, 0), 1))).toEqual([1, 2]);
      b.position = new Vec2(196, 0); // overlap c instead
      a.position = new Vec2(204, 0); // a also overlaps c
      expect(tagList(space.bodiesInCircle(new Vec2(200, 0), 1))).toEqual([1, 2, 3]);
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["1-2", "1-3", "2-3"]);
    });

    it("removing a shape from a colliding body drops its arbiter; adding one back restores it", () => {
      const space = new Space(new Vec2(0, 0), get());
      const a = circleBody(BodyType.DYNAMIC, 0, 0, 10, 1);
      const extra = new Circle(5, new Vec2(30, 0));
      (extra.userData as any).tag = 9;
      a.shapes.add(extra);
      const b = circleBody(BodyType.STATIC, 33, 0, 5, 2);
      a.space = space;
      b.space = space;
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["2-9"]);
      a.shapes.remove(extra);
      expect(tagList(space.shapesInCircle(new Vec2(30, 0), 4))).toEqual([2]);
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual([]);
      a.shapes.add(extra);
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["2-9"]);
    });

    it("changing a filter mid-contact removes and later restores the arbiter", () => {
      const space = new Space(new Vec2(0, 0), get());
      const a = circleBody(BodyType.DYNAMIC, 0, 0, 10, 1);
      const b = circleBody(BodyType.DYNAMIC, 15, 0, 10, 2);
      a.space = space;
      b.space = space;
      a.velocity = new Vec2(0.001, 0);
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["1-2"]);
      a.shapes.at(0).filter = new InteractionFilter(1, 2);
      b.shapes.at(0).filter = new InteractionFilter(4, 4);
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual([]);
      a.shapes.at(0).filter = new InteractionFilter();
      b.shapes.at(0).filter = new InteractionFilter();
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["1-2"]);
    });

    it("space.clear() after a query empties the broadphase; re-adding works", () => {
      const space = new Space(new Vec2(0, 0), get());
      const { bodies, shapes } = circleField(space, 21, 30);
      // pending sync state (no step yet) + a query
      expect(space.shapesInAABB(new AABB(-500, -500, 1000, 1000)).length).toBe(30);
      space.clear();
      expect(space.shapesInAABB(new AABB(-500, -500, 1000, 1000)).length).toBe(0);
      expect(space.rayMultiCast(new Ray(new Vec2(-500, 0), new Vec2(1, 0))).length).toBe(0);
      space.step(1 / 60);
      for (const b of bodies) b.space = space;
      stepAndExpectPairs(space, shapes, `${name} after clear`);
      expect(space.shapesInAABB(new AABB(-500, -500, 1000, 1000)).length).toBe(30);
      // clear after stepping too
      space.clear();
      expect(space.bodiesUnderPoint(new Vec2(0, 0)).length).toBe(0);
    });

    it("sleeping contacts persist, and wake up correctly when a body is disturbed", () => {
      const space = new Space(new Vec2(0, 0), get());
      const floor = boxBody(BodyType.STATIC, 0, 20, 400, 20, 100);
      floor.space = space;
      const shapes: Shape[] = [];
      const balls: Body[] = [];
      for (let i = 0; i < 6; i++) {
        const b = circleBody(BodyType.DYNAMIC, -100 + i * 40, 0, 10.5, i);
        b.space = space;
        balls.push(b);
        shapes.push(b.shapes.at(0));
      }
      let n = 0;
      while (n < 500 && !balls.every((b) => b.isSleeping)) {
        space.step(1 / 60);
        n++;
      }
      expect(balls.every((b) => b.isSleeping)).toBe(true);
      const sleepingPairs = bodyArbiterPairs(balls);
      // every ball rests on the floor
      expect(sleepingPairs).toEqual(["0-100", "1-100", "2-100", "3-100", "4-100", "5-100"]);
      for (let i = 0; i < 20; i++) space.step(1 / 60);
      expect(bodyArbiterPairs(balls)).toEqual(sleepingPairs);
      // queries on sleeping bodies
      expect(tagList(space.bodiesInAABB(new AABB(-115, -15, 30, 30), true))).toEqual([0]);
      // wake one ball by moving it onto its neighbour
      balls[0].position = new Vec2(-75, -2);
      space.step(1e-7, 1, 1);
      expect(balls[0].isSleeping).toBe(false);
      const pairs = arbiterPairs(space);
      expect(pairs).toContain("0-1");
      expect(pairs).toContain("1-100");
      expect(bodyArbiterPairs(balls)).toContain("5-100");
    });

    it("compound added, queried, removed and re-added", () => {
      const space = new Space(new Vec2(0, 0), get());
      const comp = new Compound();
      const parts: Body[] = [];
      for (let i = 0; i < 4; i++) {
        const b = circleBody(BodyType.DYNAMIC, i * 15, 0, 10, i);
        b.compound = comp;
        parts.push(b);
      }
      const other = circleBody(BodyType.DYNAMIC, 0, 15, 10, 50);
      other.space = space;
      comp.space = space;
      expect(tagList(space.bodiesInAABB(new AABB(-20, -20, 100, 40)))).toEqual([0, 1, 2, 3, 50]);
      space.step(1e-7, 1, 1);
      // compound members overlap each other (different bodies) and `other`
      expect(arbiterPairs(space)).toEqual(["0-1", "0-50", "1-2", "2-3"]);
      comp.space = null;
      expect(tagList(space.bodiesInAABB(new AABB(-20, -20, 100, 40)))).toEqual([50]);
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual([]);
      comp.space = space;
      space.step(1e-7, 1, 1);
      expect(arbiterPairs(space)).toEqual(["0-1", "0-50", "1-2", "2-3"]);
    });

    it("kinematic body sweeping through static and dynamic bodies forms and drops pairs", () => {
      const space = new Space(new Vec2(0, 0), get());
      const k = boxBody(BodyType.KINEMATIC, -200, 0, 10, 10, 1);
      k.velocity = new Vec2(600, 0);
      k.space = space;
      const st = circleBody(BodyType.STATIC, 0, 0, 10, 2);
      st.space = space;
      const d = circleBody(BodyType.DYNAMIC, 100, 0, 10, 3);
      d.space = space;
      let sawDynamic = false;
      for (let i = 0; i < 60; i++) {
        space.step(1 / 60);
        const pairs = arbiterPairs(space);
        // kinematic vs static never interacts
        expect(pairs).not.toContain("1-2");
        if (pairs.includes("1-3")) sawDynamic = true;
      }
      expect(sawDynamic).toBe(true);
    });

    it("query output lists are appended to without duplicating bodies", () => {
      const space = new Space(new Vec2(0, 0), get());
      const a = boxBody(BodyType.STATIC, 0, 0, 20, 20, 1);
      const extra = new Polygon(Polygon.box(4, 4));
      extra.translate(new Vec2(3, 3));
      (extra.userData as any).tag = 11;
      a.shapes.add(extra);
      const b = circleBody(BodyType.DYNAMIC, 50, 0, 5, 2);
      const c = circleBody(BodyType.DYNAMIC, -50, 0, 5, 3);
      for (const x of [a, b, c]) x.space = space;

      const bl = new BodyList();
      bl.add(a);
      bl.add(c);
      space.bodiesInAABB(new AABB(-15, -15, 30, 30), false, false, null, bl);
      expect(tagList(bl)).toEqual([1, 3]);
      space.bodiesInAABB(new AABB(-15, -15, 30, 30), false, true, null, bl);
      expect(tagList(bl)).toEqual([1, 3]);
      // non-strict, partially overlapping: `a` is already in the output list
      space.bodiesInAABB(new AABB(-5, -5, 30, 30), false, false, null, bl);
      expect(tagList(bl)).toEqual([1, 3]);
      // ...and is reported because its small extra shape is fully inside
      expect(tagList(space.bodiesInAABB(new AABB(-5, -5, 30, 30), false, false))).toEqual([1]);
      expect(tagList(space.bodiesInAABB(new AABB(2, 2, 30, 30), false, false))).toEqual([]);
      space.bodiesUnderPoint(new Vec2(4, 4), null, bl);
      expect(tagList(bl)).toEqual([1, 3]);
      space.bodiesInCircle(new Vec2(50, 0), 2, false, null, bl);
      expect(tagList(bl)).toEqual([1, 2, 3]);
      const q = circleBody(BodyType.KINEMATIC, 0, 0, 60, 99);
      space.bodiesInShape(q.shapes.at(0), false, null, bl);
      expect(tagList(bl)).toEqual([1, 2, 3]);

      const sl = new ShapeList();
      space.shapesUnderPoint(new Vec2(4, 4), null, sl);
      expect(tagList(sl)).toEqual([1, 11]);
      space.shapesInCircle(new Vec2(50, 0), 2, false, null, sl);
      expect(tagList(sl)).toEqual([1, 2, 11]);
    });

    it("multi-shape body containment: included only when every visited shape is contained", () => {
      const space = new Space(new Vec2(0, 0), get());
      const two = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      const s1 = new Circle(5, new Vec2(-10, 0));
      const s2 = new Circle(5, new Vec2(10, 0));
      two.shapes.add(s1);
      two.shapes.add(s2);
      (two.userData as any).tag = 1;
      two.space = space;
      // both shapes inside
      expect(tagList(space.bodiesInAABB(new AABB(-20, -10, 40, 20), true, true))).toEqual([1]);
      expect(tagList(space.bodiesInAABB(new AABB(-20, -10, 40, 20), true, false))).toEqual([1]);
      expect(tagList(space.bodiesInCircle(new Vec2(0, 0), 16, true))).toEqual([1]);
      // right shape straddles the circle boundary → body rejected
      expect(tagList(space.bodiesInCircle(new Vec2(-4, 0), 15, true))).toEqual([]);
      expect(tagList(space.bodiesInShape(probeShape(-4, 0, 15), true))).toEqual([]);
      // ...but it still intersects
      expect(tagList(space.bodiesInAABB(new AABB(-20, -10, 32, 20), false, true))).toEqual([1]);
      expect(tagList(space.bodiesInCircle(new Vec2(-4, 0), 15, false))).toEqual([1]);
    });

    // A body whose other shape straddles the query boundary is not contained.
    // Upstream DynAABBPhase's fully-inside fast path ignored the `failed`
    // list and re-added it on DYNAMIC_AABB_TREE; fixed in nape-js.
    const straddle = it;
    straddle("multi-shape body with one shape straddling the AABB is not contained", () => {
      const space = new Space(new Vec2(0, 0), get());
      const two = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
      two.shapes.add(new Circle(5, new Vec2(-10, 0)));
      two.shapes.add(new Circle(5, new Vec2(10, 0)));
      (two.userData as any).tag = 1;
      two.space = space;
      expect(tagList(space.bodiesInAABB(new AABB(-20, -10, 32, 20), true, true))).toEqual([]);
      expect(tagList(space.bodiesInAABB(new AABB(-20, -10, 32, 20), true, false))).toEqual([]);
    });

    it("point query outside every shape (left of all AABBs) is empty", () => {
      const space = new Space(new Vec2(0, 0), get());
      for (let i = 0; i < 5; i++) circleBody(BodyType.DYNAMIC, i * 30, 0, 10, i).space = space;
      expect(space.shapesUnderPoint(new Vec2(-1000, 0)).length).toBe(0);
      expect(space.bodiesUnderPoint(new Vec2(-1000, 0)).length).toBe(0);
      expect(tagList(space.shapesUnderPoint(new Vec2(60, 0)))).toEqual([2]);
    });

    it("first query on a fresh space may be any query type (lazy internal stacks)", () => {
      const make = () => {
        const space = new Space(new Vec2(0, 0), get());
        for (let i = 0; i < 12; i++) {
          boxBody(BodyType.STATIC, (i % 4) * 30, Math.floor(i / 4) * 30, 10, 10, i).space = space;
        }
        for (let i = 0; i < 6; i++)
          circleBody(BodyType.DYNAMIC, i * 20, 120, 5, 20 + i).space = space;
        return space;
      };
      const all = [...Array(12).keys(), 20, 21, 22, 23, 24, 25];
      expect(tagList(make().bodiesInAABB(new AABB(-50, -50, 300, 300), false, false))).toEqual(all);
      expect(tagList(make().bodiesInAABB(new AABB(-50, -50, 300, 300), true, true))).toEqual(all);
      const qb = new Body(BodyType.KINEMATIC, new Vec2(46, 30));
      qb.shapes.add(new Polygon(Polygon.box(40, 40)));
      expect(tagList(make().shapesInShape(qb.shapes.at(0), false))).toEqual([5, 6]);
      expect(tagList(make().bodiesInShape(qb.shapes.at(0), true))).toEqual([6]);
      expect(tagList(make().shapesInCircle(new Vec2(60, 120), 6, false))).toEqual([23]);
      expect(tagList(make().bodiesInCircle(new Vec2(60, 120), 6, false))).toEqual([23]);
      const r = make().rayCast(new Ray(new Vec2(-100, 120), new Vec2(1, 0)));
      expect((r!.shape.userData as any).tag).toBe(20);
      expect(r!.distance).toBeCloseTo(95, 6);
      expect(make().rayMultiCast(new Ray(new Vec2(-100, 120), new Vec2(1, 0))).length).toBe(6);
    });

    it("very large and very small shapes coexist", () => {
      const space = new Space(new Vec2(0, 0), get());
      const ground = boxBody(BodyType.STATIC, 0, 0, 1e5, 10, 1);
      ground.space = space;
      const dust: Body[] = [];
      for (let i = 0; i < 20; i++) {
        const b = circleBody(BodyType.DYNAMIC, -4e4 + i * 4000, -5.02, 0.05, 10 + i);
        b.space = space;
        dust.push(b);
      }
      const far = circleBody(BodyType.DYNAMIC, 0, -1e4, 0.01, 99);
      far.space = space;
      space.step(1e-7, 1, 1);
      const pairs = arbiterPairs(space);
      expect(pairs.length).toBe(20);
      for (let i = 0; i < 20; i++) expect(pairs).toContain(`1-${10 + i}`);
      expect(tagList(space.bodiesUnderPoint(new Vec2(-4e4, -5.02)))).toEqual([10]);
      expect(tagList(space.bodiesUnderPoint(new Vec2(0, -1e4)))).toEqual([99]);
      expect(tagList(space.shapesInCircle(new Vec2(3.6e4, -5.02), 0.01))).toEqual([29]);
      const hit = space.rayCast(new Ray(new Vec2(0, -2e4), new Vec2(0, 1)));
      expect((hit!.shape.userData as any).tag).toBe(99);
      expect(hit!.distance).toBeCloseTo(1e4 - 0.01, 6);
    });
  });
}

// ---------------------------------------------------------------------------
// Spatial hash specifics
// ---------------------------------------------------------------------------

describe("ZPP_SpatialHashPhase specifics", () => {
  it("auto-tunes its cell size from the average shape size", () => {
    const space = new Space(new Vec2(0, 0), Broadphase.SPATIAL_HASH);
    const bp = (space as any).zpp_inner.bphase as ZPP_SpatialHashPhase;
    expect(bp.cellSize).toBe(64);
    space.step(1 / 60); // empty space: no tuning yet
    expect(bp.cellSize).toBe(64);
    for (let i = 0; i < 10; i++) circleBody(BodyType.DYNAMIC, i * 100, 0, 10, i).space = space;
    space.step(1 / 60);
    // average AABB extent is 20 → cell size 40
    expect(bp.cellSize).toBeCloseTo(40, 9);
    expect(bp.invCellSize).toBeCloseTo(1 / 40, 12);
    expect(bp.cellKey(3, -2)).toBe((3 * 73856093) ^ (-2 * 19349663));
  });

  it("honours an explicit cell size (never re-tuned) and still finds every pair", () => {
    const space = new Space(new Vec2(0, 0), Broadphase.SPATIAL_HASH);
    const zpp = (space as any).zpp_inner;
    const fixed = new ZPP_SpatialHashPhase(zpp, 7);
    zpp.bphase = fixed;
    expect(fixed.fixedCellSize).toBe(true);
    const { bodies, shapes } = circleField(space, 77, 60);
    stepAndExpectPairs(space, shapes, "fixed cell 7");
    for (let i = 0; i < 125; i++) space.step(1 / 60);
    expect(fixed.cellSize).toBe(7);
    const rng = mulberry32(3);
    for (const b of bodies)
      if (!b.isStatic()) b.position = new Vec2((rng() - 0.5) * 200, (rng() - 0.5) * 200);
    stepAndExpectPairs(space, shapes, "fixed cell 7, after teleport");
    fixed.autoTuneCellSize();
    expect(fixed.cellSize).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// ZPP_Broadphase base class & query-shape helpers
// ---------------------------------------------------------------------------

describe("ZPP_Broadphase base", () => {
  it("_initFields resets every field and base query stubs return null", () => {
    const o: any = {
      space: 1,
      is_sweep: true,
      is_spatial_hash: true,
      sweep: 1,
      dynab: 1,
      aabbShape: 1,
      matrix: 1,
      circShape: 1,
    };
    ZPP_Broadphase._initFields(o);
    expect(o).toEqual({
      space: null,
      is_sweep: false,
      is_spatial_hash: false,
      sweep: null,
      dynab: null,
      aabbShape: null,
      matrix: null,
      circShape: null,
    });
    const base = new ZPP_Broadphase();
    expect(base.shapesUnderPoint(0, 0, null, null)).toBeNull();
    expect(base.bodiesUnderPoint(0, 0, null, null)).toBeNull();
    expect(base.shapesInAABB(null, false, false, null, null)).toBeNull();
    expect(base.bodiesInAABB(null, false, false, null, null)).toBeNull();
    expect(base.shapesInCircle(0, 0, 1, false, null, null)).toBeNull();
    expect(base.bodiesInCircle(0, 0, 1, false, null, null)).toBeNull();
    expect(base.shapesInShape(null, false, null, null)).toBeNull();
    expect(base.bodiesInShape(null, false, null, null)).toBeNull();
    expect(base.rayCast(null, false, null)).toBeNull();
    expect(base.rayMultiCast(null, false, null, null)).toBeNull();
    expect(() => base.broadphase(null, true)).not.toThrow();
    expect(() => base.clear()).not.toThrow();
  });

  for (const [name, get] of BPS) {
    it(`${name}: query helper shapes are rescaled exactly for each query`, () => {
      const space = new Space(new Vec2(0, 0), get());
      const bp = (space as any).zpp_inner.bphase;
      const sizes: Array<[number, number, number, number]> = [
        [-10, -10, 20, 20],
        [3, -7, 0.5, 400],
        [-1000, 50, 2000, 0.25],
        [1, 1, 1, 1],
      ];
      for (const [x, y, w, h] of sizes) {
        space.shapesInAABB(new AABB(x, y, w, h));
        const ab = bp.aabbShape.zpp_inner.aabb;
        expect(ab.minx).toBeCloseTo(x, 9);
        expect(ab.miny).toBeCloseTo(y, 9);
        expect(ab.maxx).toBeCloseTo(x + w, 9);
        expect(ab.maxy).toBeCloseTo(y + h, 9);
      }
      for (const [x, y, r] of [
        [0, 0, 10],
        [50, -20, 0.5],
        [-300, 7, 250],
      ]) {
        space.shapesInCircle(new Vec2(x, y), r);
        const c = bp.circShape.zpp_inner;
        expect(c.circle.radius).toBeCloseTo(r, 9);
        const ab = c.aabb;
        expect(ab.minx).toBeCloseTo(x - r, 9);
        expect(ab.maxy).toBeCloseTo(y + r, 9);
      }
    });

    it(`${name}: NaN query parameters are rejected by the helper-shape guards`, () => {
      const space = new Space(new Vec2(0, 0), get());
      const bp = (space as any).zpp_inner.bphase;
      space.shapesInAABB(new AABB(0, 0, 10, 10));
      space.shapesInCircle(new Vec2(0, 0), 10);
      const bad = new ZPP_AABB();
      bad.minx = 0;
      bad.miny = 0;
      bad.maxx = NaN;
      bad.maxy = 10;
      expect(() => bp.updateAABBShape(bad)).toThrow("cannot be NaN");
      bad.maxx = 10;
      bad.maxy = NaN;
      expect(() => bp.updateAABBShape(bad)).toThrow("cannot be NaN");
      expect(() => bp.updateCircShape(0, 0, NaN)).toThrow("Mat23::d cannot be NaN");
      expect(() => bp.updateCircShape(NaN, 0, 5)).toThrow("Mat23::tx cannot be NaN");
      expect(() => bp.updateCircShape(0, NaN, 5)).toThrow("Mat23::ty cannot be NaN");
    });

    it(`${name}: first circle query can reuse a pooled public Vec2`, () => {
      const space = new Space(new Vec2(0, 0), get());
      circleBody(BodyType.STATIC, 0, 0, 5, 1).space = space;
      circleBody(BodyType.STATIC, 30, 0, 5, 2).space = space;
      // return a public Vec2 (with its inner) to the pool before the first circle query
      Vec2.get(123, 456).dispose();
      expect(tagList(space.shapesInCircle(new Vec2(28, 0), 4))).toEqual([2]);
      expect(tagList(space.bodiesInCircle(new Vec2(2, 0), 4))).toEqual([1]);
    });

    // Upstream rescaled the cached query polygon with tx = minx - sx*oldMinx;
    // after a tiny AABB far from the origin that cancelled catastrophically
    // and the *next* query ran over the wrong region. nape-js sets the
    // corners directly: a query must not depend on previous queries.
    it(`${name}: query region does not depend on a previous far-away tiny query`, () => {
      const space = new Space(new Vec2(0, 0), get());
      const probe = circleBody(BodyType.STATIC, -9.5, 0, 0.4, 1);
      probe.space = space;
      expect(tagList(space.shapesInAABB(new AABB(-10, -10, 20, 20)))).toEqual([1]);
      space.shapesInAABB(new AABB(1e12, 1e12, 1e-3, 1e-3));
      expect(tagList(space.shapesInAABB(new AABB(-10, -10, 20, 20)))).toEqual([1]);
    });
  }
});
