import { describe, it, expect } from "vitest";
import { Space } from "../../src/space/Space";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Material } from "../../src/phys/Material";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { PivotJoint } from "../../src/constraint/PivotJoint";
import { DistanceJoint } from "../../src/constraint/DistanceJoint";
import { AngleJoint } from "../../src/constraint/AngleJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { Compound } from "../../src/phys/Compound";
import { Broadphase } from "../../src/space/Broadphase";
import { spaceToJSON, spaceFromJSON, SNAPSHOT_VERSION } from "../../src/serialization/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSimpleSpace(): Space {
  const space = new Space(Vec2.weak(0, 600));
  const body = new Body(BodyType.DYNAMIC, Vec2.weak(100, 200));
  body.shapes.add(new Circle(20));
  body.space = space;
  return space;
}

function roundTrip(space: Space): Space {
  const snapshot = spaceToJSON(space);
  const json = JSON.stringify(snapshot);
  return spaceFromJSON(JSON.parse(json));
}

// ---------------------------------------------------------------------------
// SNAPSHOT_VERSION
// ---------------------------------------------------------------------------

describe("SNAPSHOT_VERSION", () => {
  it("is 1", () => {
    expect(SNAPSHOT_VERSION).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// spaceToJSON — basic structure
// ---------------------------------------------------------------------------

describe("spaceToJSON", () => {
  it("produces a snapshot with correct version", () => {
    const snap = spaceToJSON(makeSimpleSpace());
    expect(snap.version).toBe(1);
  });

  it("captures gravity", () => {
    const space = new Space(Vec2.weak(10, 20));
    const snap = spaceToJSON(space);
    expect(snap.gravity.x).toBeCloseTo(10);
    expect(snap.gravity.y).toBeCloseTo(20);
  });

  it("captures worldLinearDrag and worldAngularDrag", () => {
    const space = new Space(Vec2.weak(0, 0));
    space.worldLinearDrag = 0.5;
    space.worldAngularDrag = 0.3;
    const snap = spaceToJSON(space);
    expect(snap.worldLinearDrag).toBeCloseTo(0.5);
    expect(snap.worldAngularDrag).toBeCloseTo(0.3);
  });

  it("captures sortContacts", () => {
    const space = new Space(Vec2.weak(0, 0));
    space.sortContacts = false;
    const snap = spaceToJSON(space);
    expect(snap.sortContacts).toBe(false);
  });

  it("captures broadphase SWEEP_AND_PRUNE", () => {
    const space = new Space(Vec2.weak(0, 0), Broadphase.SWEEP_AND_PRUNE);
    const snap = spaceToJSON(space);
    expect(snap.broadphase).toBe("SWEEP_AND_PRUNE");
  });

  it("captures broadphase DYNAMIC_AABB_TREE", () => {
    const space = new Space(Vec2.weak(0, 0), Broadphase.DYNAMIC_AABB_TREE);
    const snap = spaceToJSON(space);
    expect(snap.broadphase).toBe("DYNAMIC_AABB_TREE");
  });

  it("captures body position and rotation", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(42, 99));
    body.rotation = 1.5;
    body.shapes.add(new Circle(10));
    body.space = space;
    const snap = spaceToJSON(space);
    expect(snap.bodies).toHaveLength(1);
    expect(snap.bodies[0].position.x).toBeCloseTo(42);
    expect(snap.bodies[0].position.y).toBeCloseTo(99);
    expect(snap.bodies[0].rotation).toBeCloseTo(1.5);
  });

  it("captures body type STATIC", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.STATIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(100, 10)));
    body.space = space;
    const snap = spaceToJSON(space);
    expect(snap.bodies[0].type).toBe("STATIC");
  });

  it("captures body type KINEMATIC", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.KINEMATIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(5));
    body.space = space;
    const snap = spaceToJSON(space);
    expect(snap.bodies[0].type).toBe("KINEMATIC");
  });

  it("captures circle shape radius", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(37));
    body.space = space;
    const snap = spaceToJSON(space);
    const shape = snap.bodies[0].shapes[0];
    expect(shape.type).toBe("circle");
    if (shape.type === "circle") {
      expect(shape.radius).toBeCloseTo(37);
    }
  });

  it("captures polygon shape vertices", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(40, 20)));
    body.space = space;
    const snap = spaceToJSON(space);
    const shape = snap.bodies[0].shapes[0];
    expect(shape.type).toBe("polygon");
    if (shape.type === "polygon") {
      expect(shape.localVerts).toHaveLength(4);
    }
  });

  it("captures material properties", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const mat = new Material(0.8, 0.4, 0.6, 1.2, 0.002);
    body.shapes.add(new Circle(10, undefined, mat));
    body.space = space;
    const snap = spaceToJSON(space);
    const m = snap.bodies[0].shapes[0].material;
    expect(m.elasticity).toBeCloseTo(0.8);
    expect(m.dynamicFriction).toBeCloseTo(0.4);
    expect(m.staticFriction).toBeCloseTo(0.6);
    expect(m.density).toBeCloseTo(1.2);
    expect(m.rollingFriction).toBeCloseTo(0.002);
  });

  it("captures interaction filter", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const filter = new InteractionFilter();
    filter.collisionGroup = 2;
    filter.collisionMask = 3;
    body.shapes.add(new Circle(10, undefined, undefined, filter));
    body.space = space;
    const snap = spaceToJSON(space);
    const f = snap.bodies[0].shapes[0].filter;
    expect(f.collisionGroup).toBe(2);
    expect(f.collisionMask).toBe(3);
  });

  it("captures sensorEnabled", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const shape = new Circle(10);
    shape.sensorEnabled = true;
    body.shapes.add(shape);
    body.space = space;
    const snap = spaceToJSON(space);
    expect(snap.bodies[0].shapes[0].sensorEnabled).toBe(true);
  });

  it("captures fluidEnabled and fluidProperties", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const shape = new Circle(10);
    shape.fluidEnabled = true;
    const fp = new FluidProperties(2, 0.5);
    shape.fluidProperties = fp;
    body.shapes.add(shape);
    body.space = space;
    const snap = spaceToJSON(space);
    const s = snap.bodies[0].shapes[0];
    expect(s.fluidEnabled).toBe(true);
    expect(s.fluidProperties).not.toBeNull();
    if (s.fluidProperties) {
      expect(s.fluidProperties.density).toBeCloseTo(2);
      expect(s.fluidProperties.viscosity).toBeCloseTo(0.5);
    }
  });

  it("captures body velocity and angularVel", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.velocity = Vec2.weak(5, -3);
    body.angularVel = 1.2;
    const snap = spaceToJSON(space);
    expect(snap.bodies[0].velocity.x).toBeCloseTo(5);
    expect(snap.bodies[0].velocity.y).toBeCloseTo(-3);
    expect(snap.bodies[0].angularVel).toBeCloseTo(1.2);
  });

  it("captures fixed mass", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.mass = 5;
    const snap = spaceToJSON(space);
    expect(snap.bodies[0].massMode).toBe("FIXED");
    expect(snap.bodies[0].mass).toBeCloseTo(5);
  });

  it("captures PivotJoint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new PivotJoint(b1, b2, Vec2.weak(5, 0), Vec2.weak(-5, 0));
    joint.space = space;
    const snap = spaceToJSON(space);
    expect(snap.constraints).toHaveLength(1);
    const c = snap.constraints[0];
    expect(c.type).toBe("PivotJoint");
    if (c.type === "PivotJoint") {
      expect(c.anchor1.x).toBeCloseTo(5);
      expect(c.anchor2.x).toBeCloseTo(-5);
    }
  });

  it("captures DistanceJoint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(100, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 80, 120);
    joint.space = space;
    const snap = spaceToJSON(space);
    const c = snap.constraints[0];
    expect(c.type).toBe("DistanceJoint");
    if (c.type === "DistanceJoint") {
      expect(c.jointMin).toBeCloseTo(80);
      expect(c.jointMax).toBeCloseTo(120);
    }
  });

  it("captures body userData (JSON-serializable fields)", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.userData.playerId = 42;
    body.userData.label = "hero";
    const snap = spaceToJSON(space);
    expect(snap.bodies[0].userData?.playerId).toBe(42);
    expect(snap.bodies[0].userData?.label).toBe("hero");
  });

  it("skips non-JSON-serializable userData values", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    (body.userData as any).fn = () => {};
    const snap = spaceToJSON(space);
    // Function values are stripped by JSON.stringify
    const ud = snap.bodies[0].userData;
    expect(ud == null || ud.fn == null).toBe(true);
  });

  it("captures multiple bodies", () => {
    const space = new Space(Vec2.weak(0, 0));
    for (let i = 0; i < 5; i++) {
      const b = new Body(BodyType.DYNAMIC, Vec2.weak(i * 10, 0));
      b.shapes.add(new Circle(5));
      b.space = space;
    }
    const snap = spaceToJSON(space);
    expect(snap.bodies).toHaveLength(5);
  });

  it("captures allowMovement and allowRotation", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.allowMovement = false;
    body.allowRotation = false;
    body.space = space;
    const snap = spaceToJSON(space);
    expect(snap.bodies[0].allowMovement).toBe(false);
    expect(snap.bodies[0].allowRotation).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: spaceFromJSON(spaceToJSON(space))
// ---------------------------------------------------------------------------

describe("round-trip", () => {
  it("restores gravity", () => {
    const space = new Space(Vec2.weak(0, 600));
    const restored = roundTrip(space);
    expect(restored.gravity.x).toBeCloseTo(0);
    expect(restored.gravity.y).toBeCloseTo(600);
  });

  it("restores worldLinearDrag and worldAngularDrag", () => {
    const space = new Space(Vec2.weak(0, 0));
    space.worldLinearDrag = 0.7;
    space.worldAngularDrag = 0.2;
    const restored = roundTrip(space);
    expect(restored.worldLinearDrag).toBeCloseTo(0.7);
    expect(restored.worldAngularDrag).toBeCloseTo(0.2);
  });

  it("restores sortContacts", () => {
    const space = new Space(Vec2.weak(0, 0));
    space.sortContacts = false;
    const restored = roundTrip(space);
    expect(restored.sortContacts).toBe(false);
  });

  it("restores broadphase", () => {
    const space = new Space(Vec2.weak(0, 0), Broadphase.SWEEP_AND_PRUNE);
    const restored = roundTrip(space);
    expect(restored.broadphase.toString()).toBe("SWEEP_AND_PRUNE");
  });

  it("restores body count", () => {
    const space = new Space(Vec2.weak(0, 0));
    for (let i = 0; i < 3; i++) {
      const b = new Body(BodyType.DYNAMIC, Vec2.weak(i * 20, 0));
      b.shapes.add(new Circle(5));
      b.space = space;
    }
    const restored = roundTrip(space);
    expect(restored.bodies.length).toBe(3);
  });

  it("restores body position and rotation", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(77, 33));
    body.rotation = 2.1;
    body.shapes.add(new Circle(10));
    body.space = space;
    const restored = roundTrip(space);
    const rb = restored.bodies.at(0);
    expect(rb.position.x).toBeCloseTo(77);
    expect(rb.position.y).toBeCloseTo(33);
    expect(rb.rotation).toBeCloseTo(2.1);
  });

  it("restores body type STATIC", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.STATIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(100, 10)));
    body.space = space;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).type.toString()).toBe("STATIC");
  });

  it("restores body velocity", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.velocity = Vec2.weak(3, -7);
    body.angularVel = 0.5;
    const restored = roundTrip(space);
    const rb = restored.bodies.at(0);
    expect(rb.velocity.x).toBeCloseTo(3);
    expect(rb.velocity.y).toBeCloseTo(-7);
    expect(rb.angularVel).toBeCloseTo(0.5);
  });

  it("restores circle shape radius", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(25));
    body.space = space;
    const restored = roundTrip(space);
    const shape = restored.bodies.at(0).shapes.at(0) as any;
    expect(shape.radius).toBeCloseTo(25);
  });

  it("restores polygon vertex count", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Polygon(Polygon.box(30, 20)));
    body.space = space;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).shapes.length).toBe(1);
    expect(restored.bodies.at(0).shapes.at(0).isPolygon()).toBe(true);
  });

  it("restores material elasticity", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const mat = new Material(0.9, 0.1, 0.2, 1.0, 0.001);
    body.shapes.add(new Circle(10, undefined, mat));
    body.space = space;
    const restored = roundTrip(space);
    const rmat = restored.bodies.at(0).shapes.at(0).material;
    expect(rmat.elasticity).toBeCloseTo(0.9);
    expect(rmat.dynamicFriction).toBeCloseTo(0.1);
  });

  it("restores fixed mass", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.mass = 3.5;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).mass).toBeCloseTo(3.5);
    expect(restored.bodies.at(0).massMode.toString()).toBe("FIXED");
  });

  it("restores PivotJoint between two bodies", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(60, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new PivotJoint(b1, b2, Vec2.weak(10, 0), Vec2.weak(-10, 0));
    joint.space = space;

    const restored = roundTrip(space);
    expect(restored.constraints.length).toBe(1);
    const rc = restored.constraints.at(0) as PivotJoint;
    expect(rc.anchor1.x).toBeCloseTo(10);
    expect(rc.anchor2.x).toBeCloseTo(-10);
    expect(rc.body1).not.toBeNull();
    expect(rc.body2).not.toBeNull();
  });

  it("restores DistanceJoint min/max", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(100, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 70, 130);
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as DistanceJoint;
    expect(rc.jointMin).toBeCloseTo(70);
    expect(rc.jointMax).toBeCloseTo(130);
  });

  it("restores AngleJoint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new AngleJoint(b1, b2, -1, 1, 2);
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as AngleJoint;
    expect(rc.jointMin).toBeCloseTo(-1);
    expect(rc.jointMax).toBeCloseTo(1);
    expect(rc.ratio).toBeCloseTo(2);
  });

  it("restores WeldJoint phase", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(20, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new WeldJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 0.5);
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as WeldJoint;
    expect(rc.phase).toBeCloseTo(0.5);
  });

  it("restores constraint with null body (static anchor)", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b.shapes.add(new Circle(10));
    b.space = space;
    const joint = new PivotJoint(null, b, Vec2.weak(0, 0), Vec2.weak(0, 0));
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as PivotJoint;
    expect(rc.body1).toBeNull();
    expect(rc.body2).not.toBeNull();
  });

  it("restores constraint active/stiff/frequency/damping", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new DistanceJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), 50, 50);
    joint.stiff = false;
    joint.frequency = 4;
    joint.damping = 0.8;
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as DistanceJoint;
    expect(rc.stiff).toBe(false);
    expect(rc.frequency).toBeCloseTo(4);
    expect(rc.damping).toBeCloseTo(0.8);
  });

  it("restores body userData", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.userData.id = 7;
    body.userData.team = "blue";
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).userData.id).toBe(7);
    expect(restored.bodies.at(0).userData.team).toBe("blue");
  });

  it("restored space can step simulation", () => {
    const space = new Space(Vec2.weak(0, 600));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;

    const restored = roundTrip(space);
    const rb = restored.bodies.at(0);
    const y0 = rb.position.y;
    restored.step(1 / 60, 10, 10);
    expect(rb.position.y).toBeGreaterThan(y0);
  });

  it("restores multiple shapes per body", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.shapes.add(new Circle(5));
    body.space = space;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).shapes.length).toBe(2);
  });

  it("snapshot is valid JSON", () => {
    const space = makeSimpleSpace();
    const snap = spaceToJSON(space);
    expect(() => JSON.stringify(snap)).not.toThrow();
    expect(typeof JSON.stringify(snap)).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// spaceFromJSON — version guard
// ---------------------------------------------------------------------------

describe("spaceFromJSON version guard", () => {
  it("throws on incompatible snapshot version", () => {
    const snap = spaceToJSON(makeSimpleSpace());
    (snap as any).version = 999;
    expect(() => spaceFromJSON(snap as any)).toThrow(/unsupported snapshot version/);
  });
});

// ---------------------------------------------------------------------------
// Compound round-trip
// ---------------------------------------------------------------------------

describe("compound round-trip", () => {
  it("restores compound body count", () => {
    const space = new Space(Vec2.weak(0, 0));
    const compound = new Compound();
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.compound = compound;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(30, 0));
    b2.shapes.add(new Circle(10));
    b2.compound = compound;
    compound.space = space;

    const restored = roundTrip(space);
    // Compound bodies should be available in the space
    expect(restored.compounds.length).toBe(1);
  });
});
