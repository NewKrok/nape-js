/**
 * Issue #244 (b): broadphase AABB queries with always-matching and
 * never-matching InteractionFilters, under every broadphase implementation
 * (each one has its own shapesInAABB / bodiesInAABB code).
 *
 * Filter semantics (upstream nape): a shape is reported iff
 *   (shape.group & query.mask) != 0 && (query.group & shape.mask) != 0
 * Default shape filter is group=1, mask=-1, so
 *   new InteractionFilter(1, 1) matches every default shape,
 *   new InteractionFilter(1, 0) matches none.
 *
 * Note on the `strict` flag: with strict=false and containment=false,
 * bodiesInAABB only reports a body whose shape AABB is fully inside the query
 * box (upstream quirk). The scene therefore keeps a "straddler" body on the
 * edge so the tests can tell the flag combinations apart.
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Broadphase } from "../../src/space/Broadphase";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { AABB } from "../../src/geom/AABB";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import type { Shape } from "../../src/shape/Shape";
import type { ShapeList } from "../../src/shape/ShapeList";
import type { BodyList } from "../../src/phys/BodyList";

const BROADPHASES: Array<[string, () => Broadphase]> = [
  ["SWEEP_AND_PRUNE", () => Broadphase.SWEEP_AND_PRUNE],
  ["DYNAMIC_AABB_TREE", () => Broadphase.DYNAMIC_AABB_TREE],
  ["SPATIAL_HASH", () => Broadphase.SPATIAL_HASH],
];

/** Query box: x in [-200, 200], y in [-200, 200]. */
const box = () => new AABB(-200, -200, 400, 400);
const ALWAYS = () => new InteractionFilter(1, 1);
const NEVER = () => new InteractionFilter(1, 0);

function scene(bp: Broadphase, step: boolean) {
  const space = new Space(new Vec2(0, 0), bp);

  const floor = new Body(BodyType.STATIC, new Vec2(0, 150));
  floor.shapes.add(new Polygon(Polygon.box(300, 20)));
  floor.space = space;

  const ball = new Body(BodyType.DYNAMIC, new Vec2(-50, 0));
  ball.shapes.add(new Circle(10));
  ball.space = space;

  const kin = new Body(BodyType.KINEMATIC, new Vec2(50, 0));
  kin.shapes.add(new Polygon(Polygon.box(20, 20)));
  kin.space = space;

  // Two shapes on one body: a body must still be reported once.
  const multi = new Body(BodyType.DYNAMIC, new Vec2(0, -100));
  multi.shapes.add(new Circle(8, new Vec2(-15, 0)));
  multi.shapes.add(new Circle(8, new Vec2(15, 0)));
  multi.space = space;

  // Straddles the right edge (x=200): centre 200, radius 10.
  const straddler = new Body(BodyType.DYNAMIC, new Vec2(200, 0));
  straddler.shapes.add(new Circle(10));
  straddler.space = space;

  // Completely outside the query box.
  const outside = new Body(BodyType.DYNAMIC, new Vec2(1000, 1000));
  outside.shapes.add(new Circle(10));
  outside.space = space;

  if (step) for (let i = 0; i < 3; i++) space.step(1 / 60);

  const inside = [floor, ball, kin, multi];
  const insideShapes: Shape[] = [];
  for (const b of inside)
    for (let i = 0; i < b.shapes.length; i++) insideShapes.push(b.shapes.at(i));
  return { space, inside, insideShapes, straddler, outside };
}

const ids = (xs: { id: number }[]) => xs.map((x) => x.id).sort((a, b) => a - b);
function bodyArr(list: BodyList): Body[] {
  const out: Body[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.at(i));
  return out;
}
function shapeArr(list: ShapeList): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < list.length; i++) out.push(list.at(i));
  return out;
}

/** [containment, strict] combinations. */
const FLAGS: Array<[boolean, boolean]> = [
  [false, true],
  [false, false],
  [true, true],
  [true, false],
];

for (const [name, get] of BROADPHASES) {
  for (const stepped of [false, true]) {
    const when = stepped ? "after stepping" : "before the first step";

    describe(`AABB queries with filters — ${name}, ${when}`, () => {
      it("always-matching filter returns exactly what the unfiltered query returns", () => {
        const { space } = scene(get(), stepped);
        for (const [containment, strict] of FLAGS) {
          const plainB = bodyArr(space.bodiesInAABB(box(), containment, strict));
          const filtB = bodyArr(space.bodiesInAABB(box(), containment, strict, ALWAYS()));
          expect(ids(filtB)).toEqual(ids(plainB));

          const plainS = shapeArr(space.shapesInAABB(box(), containment, strict));
          const filtS = shapeArr(space.shapesInAABB(box(), containment, strict, ALWAYS()));
          expect(ids(filtS)).toEqual(ids(plainS));
        }
      });

      it("always-matching filter: concrete result sets per flag combination", () => {
        const { space, inside, insideShapes, straddler, outside } = scene(get(), stepped);
        const straddlerShape = straddler.shapes.at(0);

        // strict, overlap: everything touching the box, straddler included.
        let bodies = bodyArr(space.bodiesInAABB(box(), false, true, ALWAYS()));
        expect(ids(bodies)).toEqual(ids([...inside, straddler]));
        expect(bodies).not.toContain(outside);
        // each body reported once even with two shapes
        expect(bodies.length).toBe(inside.length + 1);

        // non-strict, overlap: bodiesInAABB only keeps fully-contained AABBs.
        bodies = bodyArr(space.bodiesInAABB(box(), false, false, ALWAYS()));
        expect(ids(bodies)).toEqual(ids(inside));

        // containment (either strictness): straddler is not contained.
        expect(ids(bodyArr(space.bodiesInAABB(box(), true, true, ALWAYS())))).toEqual(ids(inside));
        expect(ids(bodyArr(space.bodiesInAABB(box(), true, false, ALWAYS())))).toEqual(ids(inside));

        // shapesInAABB: overlap includes the straddler in both strictness modes.
        expect(ids(shapeArr(space.shapesInAABB(box(), false, true, ALWAYS())))).toEqual(
          ids([...insideShapes, straddlerShape]),
        );
        expect(ids(shapeArr(space.shapesInAABB(box(), false, false, ALWAYS())))).toEqual(
          ids([...insideShapes, straddlerShape]),
        );
        expect(ids(shapeArr(space.shapesInAABB(box(), true, true, ALWAYS())))).toEqual(
          ids(insideShapes),
        );
        expect(ids(shapeArr(space.shapesInAABB(box(), true, false, ALWAYS())))).toEqual(
          ids(insideShapes),
        );
      });

      it("never-matching filter returns nothing for every flag combination", () => {
        const { space } = scene(get(), stepped);
        for (const [containment, strict] of FLAGS) {
          expect(space.bodiesInAABB(box(), containment, strict, NEVER()).length).toBe(0);
          expect(space.shapesInAABB(box(), containment, strict, NEVER()).length).toBe(0);
        }
        // Sanity: the same box without a filter is not empty.
        expect(space.bodiesInAABB(box()).length).toBeGreaterThan(0);
      });

      it("never-matching filter leaves a caller-supplied output list untouched", () => {
        const { space } = scene(get(), stepped);
        const outB = space.bodiesInAABB(box());
        const before = ids(bodyArr(outB));
        space.bodiesInAABB(box(), false, true, NEVER(), outB);
        expect(ids(bodyArr(outB))).toEqual(before);

        const outS = space.shapesInAABB(box());
        const beforeS = ids(shapeArr(outS));
        space.shapesInAABB(box(), false, true, NEVER(), outS);
        expect(ids(shapeArr(outS))).toEqual(beforeS);
      });

      it("a group-selective filter reports only the shapes whose group it masks", () => {
        const { space, inside } = scene(get(), stepped);
        const [, ball, , multi] = inside;
        ball.shapes.at(0).filter = new InteractionFilter(2, -1);
        multi.shapes.at(1).filter = new InteractionFilter(2, -1);
        const pick = new InteractionFilter(1, 2);

        const shapes = shapeArr(space.shapesInAABB(box(), false, true, pick));
        expect(ids(shapes)).toEqual(ids([ball.shapes.at(0), multi.shapes.at(1)]));
        const bodies = bodyArr(space.bodiesInAABB(box(), false, true, pick));
        expect(ids(bodies)).toEqual(ids([ball, multi]));

        // Containment: multi's *other* shape is filtered out, not "failed",
        // so multi still counts as contained.
        const contained = bodyArr(space.bodiesInAABB(box(), true, true, pick));
        expect(ids(contained)).toEqual(ids([ball, multi]));

        // The shape's mask side matters too: a shape whose mask excludes the
        // query group is dropped even though its group is selected.
        ball.shapes.at(0).filter = new InteractionFilter(2, 4);
        expect(ids(bodyArr(space.bodiesInAABB(box(), false, true, pick)))).toEqual(ids([multi]));
      });
    });
  }
}
