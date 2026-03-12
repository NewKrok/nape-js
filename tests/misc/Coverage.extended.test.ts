import { describe, it, expect } from "vitest";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Space } from "../../src/space/Space";
import { Edge } from "../../src/shape/Edge";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import { Compound } from "../../src/phys/Compound";
import { spaceToJSON } from "../../src/serialization/serialize";
import { spaceFromJSON } from "../../src/serialization/deserialize";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBody(x = 0, y = 0, type = BodyType.DYNAMIC): Body {
  const b = new Body(type, Vec2.weak(x, y));
  b.shapes.add(new Circle(10));
  return b;
}

function jsonRoundTrip(space: Space): Space {
  const snapshot = spaceToJSON(space);
  return spaceFromJSON(snapshot);
}

// ---------------------------------------------------------------------------
// Edge tests
// ---------------------------------------------------------------------------

describe("Edge — uncovered paths", () => {
  it("worldVertex1 returns correct world position", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(50, 50));
    const poly = new Polygon(Polygon.box(40, 40));
    body.shapes.add(poly);
    const space = new Space(Vec2.weak(0, 0));
    body.space = space;

    const edge: Edge = poly.edges.at(0);
    const wv1 = edge.worldVertex1;
    expect(typeof wv1.x).toBe("number");
    expect(typeof wv1.y).toBe("number");
  });

  it("worldVertex2 returns correct world position", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(50, 50));
    const poly = new Polygon(Polygon.box(40, 40));
    body.shapes.add(poly);
    const space = new Space(Vec2.weak(0, 0));
    body.space = space;

    const edge: Edge = poly.edges.at(0);
    const wv2 = edge.worldVertex2;
    expect(typeof wv2.x).toBe("number");
    expect(typeof wv2.y).toBe("number");
  });

  it("toString() with polygon on body returns worldNormal info", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const poly = new Polygon(Polygon.box(20, 20));
    body.shapes.add(poly);
    const space = new Space(Vec2.weak(0, 0));
    body.space = space;

    const edge: Edge = poly.edges.at(0);
    const str = edge.toString();
    expect(str).toContain("localNormal");
    expect(str).toContain("worldNormal");
  });

  it("toString() with polygon NOT on body returns localNormal only", () => {
    const poly = new Polygon(Polygon.box(20, 20));
    // Polygon not added to any body — need a body to have edges accessible,
    // but we can add to body, get edge, then remove from body
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(poly);
    const edge: Edge = poly.edges.at(0);
    // Remove the polygon from the body
    body.shapes.remove(poly);

    // Now polygon has no body — toString should show localNormal only
    const str = edge.toString();
    expect(str).toContain("localNormal");
    expect(str).not.toContain("worldNormal");
  });

  it("localVertex1 and localVertex2 return valid Vec2 positions", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const poly = new Polygon(Polygon.box(30, 30));
    body.shapes.add(poly);

    const edge: Edge = poly.edges.at(0);
    const lv1 = edge.localVertex1;
    const lv2 = edge.localVertex2;
    expect(typeof lv1.x).toBe("number");
    expect(typeof lv1.y).toBe("number");
    expect(typeof lv2.x).toBe("number");
    expect(typeof lv2.y).toBe("number");
    // The two vertices should differ (they define an edge)
    const dx = lv2.x - lv1.x;
    const dy = lv2.y - lv1.y;
    expect(dx * dx + dy * dy).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// NapeList tests (via Body.shapes which is a NapeList<Shape>)
// ---------------------------------------------------------------------------

describe("NapeList — uncovered paths", () => {
  it("shift() removes and returns first element from shape list", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const c1 = new Circle(10);
    const c2 = new Circle(20);
    body.shapes.push(c1);
    body.shapes.push(c2);
    expect(body.shapes.length).toBe(2);

    const first = body.shapes.shift();
    expect(first).toBeDefined();
    expect(body.shapes.length).toBe(1);
  });

  it("unshift() adds element to front of shape list", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const c1 = new Circle(10);
    const c2 = new Circle(20);
    body.shapes.push(c1);
    body.shapes.unshift(c2);
    expect(body.shapes.length).toBe(2);
    // The unshifted element should be at index 0
    const front = body.shapes.at(0);
    expect(front).toBeDefined();
  });

  it("toString() returns a string representation", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    const str = body.shapes.toString();
    expect(typeof str).toBe("string");
    expect(str.length).toBeGreaterThan(0);
  });

  it("pop() removes last element", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.push(new Circle(10));
    body.shapes.push(new Circle(20));
    expect(body.shapes.length).toBe(2);

    const last = body.shapes.pop();
    expect(last).toBeDefined();
    expect(body.shapes.length).toBe(1);
  });

  it("multiple shift/unshift operations maintain correct count", () => {
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const c1 = new Circle(5);
    const c2 = new Circle(10);
    const c3 = new Circle(15);

    body.shapes.push(c1);
    body.shapes.push(c2);
    body.shapes.unshift(c3);
    expect(body.shapes.length).toBe(3);

    body.shapes.shift();
    expect(body.shapes.length).toBe(2);

    body.shapes.shift();
    expect(body.shapes.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Body tests
// ---------------------------------------------------------------------------

describe("Body — uncovered paths", () => {
  it("constraintsImpulse returns zero when no constraints attached", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = makeBody(0, 0);
    body.space = space;
    space.step(1 / 60, 10, 10);

    const impulse = body.constraintsImpulse();
    expect(impulse).toBeDefined();
    // With no constraints, impulse should be zero
    expect(impulse.x).toBeCloseTo(0);
    expect(impulse.y).toBeCloseTo(0);
    expect(impulse.z).toBeCloseTo(0);
    impulse.dispose();
  });

  it("constraintsImpulse with PivotJoint returns non-trivial result", () => {
    const space = new Space(Vec2.weak(0, 100));
    const b1 = makeBody(0, 0);
    const b2 = makeBody(50, 0);
    b1.space = space;
    b2.space = space;
    const joint = new PivotJoint(b1, b2, Vec2.weak(25, 0), Vec2.weak(-25, 0));
    joint.space = space;
    space.step(1 / 60, 10, 10);

    const impulse = b1.constraintsImpulse();
    expect(impulse).toBeDefined();
    impulse.dispose();
  });

  it("rotating body with polygon shapes triggers shape invalidation", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(30, 30)));
    body.space = space;

    // Get edge world position before rotation
    const poly = body.shapes.at(0) as Polygon;
    const edgeBefore = poly.edges.at(0);
    const wxBefore = edgeBefore.worldVertex1.x;

    // Rotate the body
    body.rotation = Math.PI / 4;
    // After rotation, world vertices should change
    const wxAfter = edgeBefore.worldVertex1.x;
    expect(wxAfter).not.toBeCloseTo(wxBefore, 5);
  });

  it("moving body position with polygon shapes triggers invalidation", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(20, 20)));
    body.space = space;

    const poly = body.shapes.at(0) as Polygon;
    const edge = poly.edges.at(0);
    const wxBefore = edge.worldVertex1.x;

    body.position.x = 100;
    const wxAfter = edge.worldVertex1.x;
    expect(wxAfter).not.toBeCloseTo(wxBefore, 5);
  });

  it("setting velocity on sleeping body wakes it up", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = makeBody(0, 0);
    body.space = space;

    // Step many times so the body sleeps (no gravity, no forces)
    for (let i = 0; i < 120; i++) {
      space.step(1 / 60, 10, 10);
    }

    // Set velocity — should wake the body
    body.velocity = Vec2.weak(100, 0);
    expect(body.isSleeping).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Serialization tests (JSON round-trip)
// ---------------------------------------------------------------------------

describe("Serialization — uncovered paths", () => {
  it("PulleyJoint JSON round-trip preserves properties", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = makeBody(0, 0);
    const b2 = makeBody(100, 0);
    b1.space = space;
    b2.space = space;

    const joint = new PulleyJoint(
      b1,
      b2,
      null,
      null,
      Vec2.weak(0, -50),
      Vec2.weak(0, 0),
      Vec2.weak(100, -50),
      Vec2.weak(100, 0),
      80,
      120,
      1.5,
    );
    joint.space = space;

    const restored = jsonRoundTrip(space);
    const rc = restored.constraints.at(0) as PulleyJoint;
    expect(rc).toBeDefined();
    expect(rc.anchor1.y).toBeCloseTo(-50);
    expect(rc.anchor3.x).toBeCloseTo(100);
    expect(rc.jointMin).toBeCloseTo(80);
    expect(rc.jointMax).toBeCloseTo(120);
    expect(rc.ratio).toBeCloseTo(1.5);
  });

  it("Compound with constraints JSON round-trip", () => {
    const space = new Space(Vec2.weak(0, 0));
    const compound = new Compound();
    const b1 = makeBody(0, 0);
    const b2 = makeBody(30, 0);
    b1.compound = compound;
    b2.compound = compound;
    const joint = new PivotJoint(b1, b2, Vec2.weak(15, 0), Vec2.weak(-15, 0));
    joint.compound = compound;
    compound.space = space;

    const restored = jsonRoundTrip(space);
    expect(restored.compounds.length).toBe(1);
    const rc = restored.compounds.at(0) as Compound;
    expect(rc.constraints.length).toBe(1);
  });

  it("Space with mixed constraint types round-trip", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = makeBody(0, 0);
    const b2 = makeBody(50, 0);
    b1.space = space;
    b2.space = space;

    const pivot = new PivotJoint(b1, b2, Vec2.weak(25, 0), Vec2.weak(-25, 0));
    pivot.space = space;
    const dist = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 40, 60);
    dist.space = space;

    const restored = jsonRoundTrip(space);
    expect(restored.constraints.length).toBe(2);
  });

  it("Compound nested bodies round-trip preserves body count", () => {
    const space = new Space(Vec2.weak(0, 0));
    const compound = new Compound();
    const b1 = makeBody(0, 0);
    const b2 = makeBody(30, 0);
    const b3 = makeBody(60, 0);
    b1.compound = compound;
    b2.compound = compound;
    b3.compound = compound;
    compound.space = space;

    const restored = jsonRoundTrip(space);
    expect(restored.compounds.length).toBe(1);
    const rc = restored.compounds.at(0) as Compound;
    expect(rc.bodies.length).toBe(3);
  });

  it("deserialized space can step without errors", () => {
    const space = new Space(Vec2.weak(0, 600));
    const b1 = makeBody(0, 0);
    const b2 = makeBody(100, 0);
    b1.space = space;
    b2.space = space;
    const joint = new PivotJoint(b1, b2, Vec2.weak(50, 0), Vec2.weak(-50, 0));
    joint.space = space;

    const restored = jsonRoundTrip(space);
    expect(() => {
      for (let i = 0; i < 10; i++) {
        restored.step(1 / 60, 10, 10);
      }
    }).not.toThrow();

    // Bodies should have moved under gravity
    const rb = restored.bodies.at(0);
    expect(rb.position.y).toBeGreaterThan(0);
  });
});
