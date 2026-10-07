/**
 * Body / Polygon edge cases the existing suites don't reach, each checked by
 * its observable outcome:
 *
 * - empty bodies / polygons: bounds, COM, angDrag are refused with a clear error
 * - static bodies inside a space can't be moved or reshaped
 * - moving a shape from one body to another; adding a shape to a sleeper
 * - the space's world body exposes immutable position / velocity wrappers
 * - live edge-normal wrappers follow vertex edits and body motion
 * - a clockwise polygon is re-wound, and its live vertex/edge lists follow
 * - degenerate (1- and 2-vertex) polygon centre of mass
 */
import { describe, it, expect } from "vitest";
import "../../src/index";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";

const DT = 1 / 60;

describe("empty bodies and polygons", () => {
  // Validation is lazy: the error surfaces when a value is read.
  it("a body without shapes has no bounds or centre of mass", () => {
    const b = new Body();
    expect(() => b.bounds.min.x).toThrow("bounds only makes sense when Body has shapes");
    expect(() => b.localCOM.x).toThrow("Body has no shapes so cannot compute its localCOM");
    expect(() => b.worldCOM.x).toThrow("Body has no shapes so cannot compute its worldCOM");
  });

  it("an empty polygon has no bounds / COM; a 2-vertex one has no angDrag", () => {
    const empty = new Polygon([new Vec2(0, 0), new Vec2(1, 0), new Vec2(0, 1)]);
    empty.localVerts.clear();
    expect(() => empty.bounds.min.x).toThrow(
      "bounds only makes sense when Shape belongs to a Body",
    );
    new Body().shapes.add(empty);
    expect(() => empty.bounds.min.x).toThrow("An empty polygon has no meaningful bounds");
    expect(() => empty.localCOM.x).toThrow(/empty polygon/);
    const seg = new Polygon([new Vec2(0, 0), new Vec2(1, 0), new Vec2(0, 1)]);
    seg.localVerts.pop();
    expect(() => seg.angDrag).toThrow(
      "Polygon's with less than 3 vertices have no meaningful angDrag",
    );
  });

  it("degenerate polygons: the COM of 1 vertex is the vertex, of 2 the midpoint; area 0", () => {
    const p = new Polygon([new Vec2(0, 0), new Vec2(1, 0), new Vec2(0, 1)]);
    p.localVerts.clear();
    p.localVerts.push(new Vec2(4, 6));
    expect([p.localCOM.x, p.localCOM.y]).toEqual([4, 6]);
    p.localVerts.push(new Vec2(8, 2));
    expect([p.localCOM.x, p.localCOM.y]).toEqual([6, 4]);
    expect(p.area).toBe(0);
    expect(p.inertia).toBe(0);
  });
});

describe("a dynamic body without shapes in a space", () => {
  function stepWith(allowMovement: boolean, allowRotation: boolean) {
    const space = new Space(new Vec2(0, 10));
    const b = new Body();
    b.allowMovement = allowMovement;
    b.allowRotation = allowRotation;
    b.space = space;
    return () => space.step(DT);
  }

  it("can't be simulated until both movement and rotation are disabled", () => {
    expect(stepWith(true, true)).toThrow(
      "Dynamic Body cannot be simulated with 0 mass unless allowMovement is false",
    );
    expect(stepWith(false, true)).toThrow(
      "Dynamic Body cannot be simulated with 0 inertia unless allowRotation is false",
    );
    expect(stepWith(false, false)).not.toThrow();
  });
});

describe("static bodies in a space", () => {
  it("can't be moved or have their shapes changed", () => {
    const space = new Space();
    const s = new Body(BodyType.STATIC, new Vec2(0, 0));
    s.shapes.add(new Circle(5));
    s.space = space;
    expect(() => {
      s.position = new Vec2(1, 1);
    }).toThrow("Cannot move a static object once inside a Space");
    expect(() => s.shapes.add(new Circle(3))).toThrow(
      "Cannot modifiy shapes of static object once added to Space",
    );
    // Outside the space both are fine again.
    s.space = null;
    s.position = new Vec2(1, 1);
    s.shapes.add(new Circle(3));
    expect(s.shapes.length).toBe(2);
  });
});

describe("shape ownership", () => {
  it("assigning a shape to another body removes it from the first", () => {
    const a = new Body();
    const b = new Body();
    const c = new Circle(5);
    a.shapes.add(c);
    b.shapes.add(c);
    expect(c.body).toBe(b);
    expect(a.shapes.length).toBe(0);
    expect(b.shapes.has(c)).toBe(true);
    // Re-adding to the current owner is a no-op.
    expect(b.shapes.add(c)).toBe(false);
  });

  it("adding a shape to a sleeping body wakes it", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    b.shapes.add(new Circle(5));
    b.space = space;
    for (let i = 0; i < 300; i++) space.step(DT);
    expect(b.isSleeping).toBe(true);
    b.shapes.add(new Circle(3, new Vec2(10, 0)));
    expect(b.isSleeping).toBe(false);
  });

  it("adding a shape to a sleeping kinematic body wakes it too", () => {
    const space = new Space(new Vec2(0, 0));
    const k = new Body(BodyType.KINEMATIC, new Vec2(0, 0));
    k.shapes.add(new Circle(5));
    k.space = space;
    for (let i = 0; i < 120; i++) space.step(DT);
    expect(k.isSleeping).toBe(true);
    k.shapes.add(new Circle(3, new Vec2(10, 0)));
    expect(k.isSleeping).toBe(false);
  });
});

describe("the space's world body", () => {
  it("exposes immutable position / velocity / kinematic velocity / force wrappers", () => {
    const w = new Space().world;
    for (const get of [
      () => w.position,
      () => w.velocity,
      () => w.kinematicVel,
      () => w.surfaceVel,
      () => w.force,
    ]) {
      const v = get();
      expect(v.x).toBe(0);
      expect(() => {
        v.x = 1;
      }).toThrow(/immutable/);
    }
  });
});

describe("live normal wrappers", () => {
  const normalOf = (a: Vec2, b: Vec2) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy);
    return [dy / l, -dx / l];
  };

  it("an edge's localNormal wrapper follows vertex edits", () => {
    const p = new Polygon(Polygon.box(20, 20));
    const e = p.edges.at(0);
    const n = e.localNormal;
    const before = [n.x, n.y];
    p.localVerts.at(0).y -= 10;
    // Same wrapper object, new value.
    expect(e.localNormal).toBe(n);
    const v0 = p.localVerts.at(0);
    const v1 = p.localVerts.at(1);
    const want = normalOf(v0, v1);
    expect(n.x).toBeCloseTo(want[0], 12);
    expect(n.y).toBeCloseTo(want[1], 12);
    expect([n.x, n.y]).not.toEqual(before);
  });

  it("an edge's worldNormal wrapper follows the body's rotation", () => {
    const space = new Space(new Vec2(0, 0));
    const b = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    const p = new Polygon(Polygon.box(20, 20));
    b.shapes.add(p);
    b.space = space;
    const n = p.edges.at(0).worldNormal;
    const ln = p.edges.at(0).localNormal;
    b.rotation = Math.PI / 2;
    space.step(DT);
    const c = Math.cos(b.rotation);
    const s = Math.sin(b.rotation);
    expect(n.x).toBeCloseTo(c * ln.x - s * ln.y, 9);
    expect(n.y).toBeCloseTo(s * ln.x + c * ln.y, 9);
  });
});

describe("clockwise polygons are re-wound", () => {
  it("live vertex and edge lists keep matching the re-wound polygon", () => {
    const b = new Body(BodyType.DYNAMIC, new Vec2(100, 0));
    const cw = new Polygon([new Vec2(0, 0), new Vec2(0, 10), new Vec2(10, 10), new Vec2(10, 0)]);
    b.shapes.add(cw);
    // Grab the live wrappers before anything validated the polygon.
    const world = cw.worldVerts;
    const edges = cw.edges;
    expect(cw.area).toBeGreaterThan(0);
    // World verts are the local verts offset by the body position, in order.
    expect(world.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(world.at(i).x).toBeCloseTo(cw.localVerts.at(i).x + 100, 12);
      expect(world.at(i).y).toBeCloseTo(cw.localVerts.at(i).y, 12);
    }
    // Every edge normal points outwards (away from the centroid).
    const com = cw.localCOM;
    expect(edges.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      const e = edges.at(i);
      const mid = {
        x: (e.localVertex1.x + e.localVertex2.x) / 2,
        y: (e.localVertex1.y + e.localVertex2.y) / 2,
      };
      const out = (mid.x - com.x) * e.localNormal.x + (mid.y - com.y) * e.localNormal.y;
      expect(out).toBeGreaterThan(0);
    }
  });
});
