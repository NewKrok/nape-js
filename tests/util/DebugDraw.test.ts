import { describe, it, expect } from "vitest";
import { DebugDraw, type DebugVec2 } from "../../src/util/DebugDraw";
import { DebugDrawFlags } from "../../src/util/DebugDrawFlags";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { PivotJoint } from "../../src/constraint/PivotJoint";

// ---------------------------------------------------------------------------
// Test double — records every call for assertion
// ---------------------------------------------------------------------------

class RecordingDrawer extends DebugDraw {
  segments: { p1: DebugVec2; p2: DebugVec2; colour?: number }[] = [];
  circles: { centre: DebugVec2; radius: number; colour?: number }[] = [];
  solidCircles: { centre: DebugVec2; radius: number; axis: DebugVec2; colour?: number }[] = [];
  polygons: { vertices: DebugVec2[]; colour?: number }[] = [];
  solidPolygons: { vertices: DebugVec2[]; colour?: number }[] = [];
  points: { position: DebugVec2; colour?: number }[] = [];

  reset(): void {
    this.segments = [];
    this.circles = [];
    this.solidCircles = [];
    this.polygons = [];
    this.solidPolygons = [];
    this.points = [];
  }

  override drawSegment(p1: DebugVec2, p2: DebugVec2, colour?: number): void {
    this.segments.push({ p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y }, colour });
  }
  override drawCircle(centre: DebugVec2, radius: number, colour?: number): void {
    this.circles.push({ centre: { x: centre.x, y: centre.y }, radius, colour });
  }
  override drawSolidCircle(
    centre: DebugVec2,
    radius: number,
    axis: DebugVec2,
    colour?: number,
  ): void {
    this.solidCircles.push({
      centre: { x: centre.x, y: centre.y },
      radius,
      axis: { x: axis.x, y: axis.y },
      colour,
    });
  }
  override drawPolygon(vertices: DebugVec2[], colour?: number): void {
    this.polygons.push({ vertices: vertices.map((v) => ({ x: v.x, y: v.y })), colour });
  }
  override drawSolidPolygon(vertices: DebugVec2[], colour?: number): void {
    this.solidPolygons.push({ vertices: vertices.map((v) => ({ x: v.x, y: v.y })), colour });
  }
  override drawPoint(position: DebugVec2, colour?: number): void {
    this.points.push({ position: { x: position.x, y: position.y }, colour });
  }
}

// ---------------------------------------------------------------------------
// DebugDrawFlags
// ---------------------------------------------------------------------------

describe("DebugDrawFlags", () => {
  it("each flag is a distinct power of two", () => {
    const flags = [
      DebugDrawFlags.SHAPES,
      DebugDrawFlags.JOINTS,
      DebugDrawFlags.CONTACTS,
      DebugDrawFlags.AABB,
      DebugDrawFlags.CENTER_OF_MASS,
      DebugDrawFlags.VELOCITIES,
    ];
    const set = new Set(flags);
    expect(set.size).toBe(flags.length);
    for (const f of flags) {
      expect(f & (f - 1)).toBe(0); // power of two check
    }
  });

  it("ALL combines all individual flags", () => {
    const individual =
      DebugDrawFlags.SHAPES |
      DebugDrawFlags.JOINTS |
      DebugDrawFlags.CONTACTS |
      DebugDrawFlags.AABB |
      DebugDrawFlags.CENTER_OF_MASS |
      DebugDrawFlags.VELOCITIES;
    expect(DebugDrawFlags.ALL).toBe(individual);
  });

  it("flags can be combined with bitwise OR", () => {
    const combined = DebugDrawFlags.SHAPES | DebugDrawFlags.JOINTS;
    expect(combined & DebugDrawFlags.SHAPES).toBeTruthy();
    expect(combined & DebugDrawFlags.JOINTS).toBeTruthy();
    expect(combined & DebugDrawFlags.CONTACTS).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// DebugDraw base class
// ---------------------------------------------------------------------------

describe("DebugDraw base class", () => {
  it("all methods are no-ops by default", () => {
    class MinimalDraw extends DebugDraw {}
    const d = new MinimalDraw();
    const p = { x: 0, y: 0 };
    // None of these should throw
    expect(() => d.drawSegment(p, p)).not.toThrow();
    expect(() => d.drawCircle(p, 10)).not.toThrow();
    expect(() => d.drawSolidCircle(p, 10, p)).not.toThrow();
    expect(() => d.drawPolygon([p, p, p])).not.toThrow();
    expect(() => d.drawSolidPolygon([p, p, p])).not.toThrow();
    expect(() => d.drawPoint(p)).not.toThrow();
  });

  it("can be subclassed and overridden", () => {
    const drawer = new RecordingDrawer();
    drawer.drawPoint({ x: 5, y: 10 });
    expect(drawer.points).toHaveLength(1);
    expect(drawer.points[0].position.x).toBe(5);
    expect(drawer.points[0].position.y).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — error handling
// ---------------------------------------------------------------------------

describe("Space.debugDraw — validation", () => {
  it("throws when drawer is null", () => {
    const space = new Space();
    expect(() => space.debugDraw(null as any)).toThrow(/drawer cannot be null/);
  });

  it("accepts empty flags (draws nothing)", () => {
    const space = new Space();
    const drawer = new RecordingDrawer();
    expect(() => space.debugDraw(drawer, 0)).not.toThrow();
    expect(drawer.segments).toHaveLength(0);
    expect(drawer.solidCircles).toHaveLength(0);
  });

  it("defaults to DebugDrawFlags.ALL", () => {
    const space = new Space();
    const drawer = new RecordingDrawer();
    expect(() => space.debugDraw(drawer)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — SHAPES flag
// ---------------------------------------------------------------------------

describe("Space.debugDraw — SHAPES", () => {
  it("draws a dynamic circle as solid circle", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(100, 200));
    body.shapes.add(new Circle(30));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.solidCircles).toHaveLength(1);
    expect(drawer.solidCircles[0].radius).toBeCloseTo(30);
    expect(drawer.circles).toHaveLength(0);
  });

  it("draws a static circle as outline", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.STATIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(20));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.circles).toHaveLength(1);
    expect(drawer.circles[0].radius).toBeCloseTo(20);
    expect(drawer.solidCircles).toHaveLength(0);
  });

  it("draws a kinematic circle as outline", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.KINEMATIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(15));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.circles).toHaveLength(1);
    expect(drawer.solidCircles).toHaveLength(0);
  });

  it("draws a dynamic polygon as solid polygon", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(40, 40)));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.solidPolygons).toHaveLength(1);
    expect(drawer.solidPolygons[0].vertices.length).toBeGreaterThanOrEqual(3);
    expect(drawer.polygons).toHaveLength(0);
  });

  it("draws a static polygon as outline", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.STATIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(50, 50)));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.polygons).toHaveLength(1);
    expect(drawer.polygons[0].vertices.length).toBeGreaterThanOrEqual(3);
    expect(drawer.solidPolygons).toHaveLength(0);
  });

  it("draws multiple shapes from a single body", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.shapes.add(new Polygon(Polygon.box(20, 20)));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.solidCircles).toHaveLength(1);
    expect(drawer.solidPolygons).toHaveLength(1);
  });

  it("draws shapes for all bodies in the space", () => {
    const space = new Space(Vec2.weak(0, 0));
    for (let i = 0; i < 3; i++) {
      const b = new Body(BodyType.DYNAMIC, Vec2.weak(i * 50, 0));
      b.shapes.add(new Circle(10));
      b.space = space;
    }

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.solidCircles).toHaveLength(3);
  });

  it("draws nothing when no shapes flag", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.AABB); // not SHAPES

    expect(drawer.solidCircles).toHaveLength(0);
    expect(drawer.circles).toHaveLength(0);
  });

  it("solid circle centre matches body position when localCOM is origin", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(100, 200));
    body.shapes.add(new Circle(10, Vec2.weak(0, 0)));
    body.space = space;
    // Step once (zero gravity) so worldCOM is validated by the engine
    space.step(1 / 60, 1, 1);

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.solidCircles[0].centre.x).toBeCloseTo(100, 0);
    expect(drawer.solidCircles[0].centre.y).toBeCloseTo(200, 0);
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — AABB flag
// ---------------------------------------------------------------------------

describe("Space.debugDraw — AABB", () => {
  it("draws 4 segments per body (AABB rectangle)", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(20));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.AABB);

    expect(drawer.segments).toHaveLength(4);
  });

  it("draws no AABB when flag is not set", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(20));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.segments).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — CENTER_OF_MASS flag
// ---------------------------------------------------------------------------

describe("Space.debugDraw — CENTER_OF_MASS", () => {
  it("draws a point at body worldCOM", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(50, 75));
    body.shapes.add(new Circle(10, Vec2.weak(0, 0)));
    body.space = space;
    // One step ensures worldCOM is computed by the physics engine
    space.step(1 / 60, 1, 1);

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.CENTER_OF_MASS);

    expect(drawer.points).toHaveLength(1);
    // After one step under zero gravity, body should be near (50, 75)
    expect(drawer.points[0].position.x).toBeCloseTo(50, 0);
    expect(drawer.points[0].position.y).toBeCloseTo(75, 0);
  });

  it("draws no COM points when flag is not set", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.points).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — VELOCITIES flag
// ---------------------------------------------------------------------------

describe("Space.debugDraw — VELOCITIES", () => {
  it("draws velocity segment for dynamic body with non-zero velocity", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.velocity = new Vec2(100, 50);

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.VELOCITIES);

    expect(drawer.segments).toHaveLength(1);
  });

  it("does not draw velocity for static body", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.STATIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.VELOCITIES);

    expect(drawer.segments).toHaveLength(0);
  });

  it("draws no velocity segments when flag is not set", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.velocity = new Vec2(100, 0);

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.segments).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — JOINTS flag
// ---------------------------------------------------------------------------

describe("Space.debugDraw — JOINTS", () => {
  it("draws segment + 2 anchor points for a PivotJoint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(-50, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const joint = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
    joint.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.JOINTS);

    // 1 segment (b1 anchor → b2 anchor) + 2 points (one per anchor)
    expect(drawer.segments).toHaveLength(1);
    expect(drawer.points).toHaveLength(2);
  });

  it("does not draw joints when flag is not set", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(100, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
    joint.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.segments).toHaveLength(0);
    expect(drawer.points).toHaveLength(0);
  });

  it("skips joint when debugDraw=false on the constraint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(100, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;

    const joint = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
    joint.debugDraw = false;
    joint.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.JOINTS);

    expect(drawer.segments).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — combined flags
// ---------------------------------------------------------------------------

describe("Space.debugDraw — combined flags", () => {
  it("renders only selected layers when flags are combined", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.velocity = new Vec2(100, 0);

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES | DebugDrawFlags.CENTER_OF_MASS);

    expect(drawer.solidCircles).toHaveLength(1); // SHAPES
    expect(drawer.points).toHaveLength(1); // CENTER_OF_MASS
    expect(drawer.segments).toHaveLength(0); // no VELOCITIES or AABB
  });

  it("ALL flag renders shapes, COM and AABB for a body", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10, Vec2.weak(0, 0)));
    body.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.ALL);

    expect(drawer.solidCircles).toHaveLength(1);
    expect(drawer.points.length).toBeGreaterThanOrEqual(1); // at least COM
    expect(drawer.segments.length).toBeGreaterThanOrEqual(4); // at least AABB 4 edges
  });

  it("empty space produces no draw calls", () => {
    const space = new Space(Vec2.weak(0, 0));
    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.ALL);

    expect(drawer.segments).toHaveLength(0);
    expect(drawer.circles).toHaveLength(0);
    expect(drawer.solidCircles).toHaveLength(0);
    expect(drawer.polygons).toHaveLength(0);
    expect(drawer.solidPolygons).toHaveLength(0);
    expect(drawer.points).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Space.debugDraw — CONTACTS flag (post-step)
// ---------------------------------------------------------------------------

describe("Space.debugDraw — CONTACTS", () => {
  it("draws contact points after a collision step", () => {
    const space = new Space(Vec2.weak(0, 0));

    // Two circles overlapping — will generate a contact after step
    const b1 = new Body(BodyType.STATIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(20));
    b1.space = space;

    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(25, 0)); // overlapping b1
    b2.shapes.add(new Circle(20));
    b2.space = space;

    space.step(1 / 60, 10, 10);

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.CONTACTS);

    // At least one contact point drawn
    expect(drawer.points.length).toBeGreaterThanOrEqual(1);
  });

  it("draws no contacts when flag is not set", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.STATIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(20));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(25, 0));
    b2.shapes.add(new Circle(20));
    b2.space = space;

    space.step(1 / 60, 10, 10);

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    // SHAPES only — no contact points (CONTACTS flag not set)
    expect(drawer.points).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Drawer receives correct colour categories
// ---------------------------------------------------------------------------

describe("Space.debugDraw — colours", () => {
  it("dynamic and static shapes receive different colours", () => {
    const space = new Space(Vec2.weak(0, 0));

    const dyn = new Body(BodyType.DYNAMIC, Vec2.weak(-100, 0));
    dyn.shapes.add(new Circle(10));
    dyn.space = space;

    const sta = new Body(BodyType.STATIC, Vec2.weak(100, 0));
    sta.shapes.add(new Circle(10));
    sta.space = space;

    const drawer = new RecordingDrawer();
    space.debugDraw(drawer, DebugDrawFlags.SHAPES);

    expect(drawer.solidCircles).toHaveLength(1);
    expect(drawer.circles).toHaveLength(1);
    expect(drawer.solidCircles[0].colour).toBeDefined();
    expect(drawer.circles[0].colour).toBeDefined();
    expect(drawer.solidCircles[0].colour).not.toBe(drawer.circles[0].colour);
  });
});
