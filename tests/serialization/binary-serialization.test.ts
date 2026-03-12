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
import { MotorJoint } from "../../src/constraint/MotorJoint";
import { LineJoint } from "../../src/constraint/LineJoint";
import { PulleyJoint } from "../../src/constraint/PulleyJoint";
import { WeldJoint } from "../../src/constraint/WeldJoint";
import { Compound } from "../../src/phys/Compound";
import { Broadphase } from "../../src/space/Broadphase";
import {
  spaceToBinary,
  spaceFromBinary,
  BINARY_SNAPSHOT_VERSION,
} from "../../src/serialization/index";

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
  return spaceFromBinary(spaceToBinary(space));
}

// ---------------------------------------------------------------------------
// BINARY_SNAPSHOT_VERSION
// ---------------------------------------------------------------------------

describe("BINARY_SNAPSHOT_VERSION", () => {
  it("is 1", () => {
    expect(BINARY_SNAPSHOT_VERSION).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// spaceToBinary — basic structure
// ---------------------------------------------------------------------------

describe("spaceToBinary", () => {
  it("returns a Uint8Array", () => {
    const result = spaceToBinary(makeSimpleSpace());
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it("starts with NAPE magic bytes", () => {
    const result = spaceToBinary(makeSimpleSpace());
    const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
    // Magic 0x4e415045 written as uint32 little-endian
    expect(view.getUint32(0, true)).toBe(0x4e415045);
  });

  it("produces output smaller than JSON for simple scenes", () => {
    const space = makeSimpleSpace();
    const binary = spaceToBinary(space);
    // Binary should be significantly smaller than equivalent JSON
    // A single body + circle scene JSON is typically 500+ bytes, binary ~300 bytes
    expect(binary.byteLength).toBeLessThan(500);
  });

  it("produces output for empty space", () => {
    const space = new Space(Vec2.weak(0, 0));
    const result = spaceToBinary(space);
    expect(result.byteLength).toBeGreaterThan(0);
    // Should round-trip cleanly
    const restored = spaceFromBinary(result);
    expect(restored.bodies.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// spaceFromBinary — error handling
// ---------------------------------------------------------------------------

describe("spaceFromBinary error handling", () => {
  it("throws on invalid magic bytes", () => {
    const bad = new Uint8Array(64);
    expect(() => spaceFromBinary(bad)).toThrow(/invalid magic bytes/);
  });

  it("throws on unsupported version", () => {
    const good = spaceToBinary(makeSimpleSpace());
    const view = new DataView(good.buffer, good.byteOffset, good.byteLength);
    // Version is at offset 4 (after 4-byte magic), uint16 LE
    view.setUint16(4, 999, true);
    expect(() => spaceFromBinary(good)).toThrow(/unsupported version/);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: spaceFromBinary(spaceToBinary(space))
// ---------------------------------------------------------------------------

describe("binary round-trip", () => {
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

  it("restores broadphase SWEEP_AND_PRUNE", () => {
    const space = new Space(Vec2.weak(0, 0), Broadphase.SWEEP_AND_PRUNE);
    const restored = roundTrip(space);
    expect(restored.broadphase.toString()).toBe("SWEEP_AND_PRUNE");
  });

  it("restores broadphase DYNAMIC_AABB_TREE", () => {
    const space = new Space(Vec2.weak(0, 0), Broadphase.DYNAMIC_AABB_TREE);
    const restored = roundTrip(space);
    expect(restored.broadphase.toString()).toBe("DYNAMIC_AABB_TREE");
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

  it("restores body type KINEMATIC", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.KINEMATIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(5));
    body.space = space;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).type.toString()).toBe("KINEMATIC");
  });

  it("restores body velocity and angularVel", () => {
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

  it("restores circle localCOM", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10, Vec2.weak(5, -3)));
    body.space = space;
    const restored = roundTrip(space);
    const shape = restored.bodies.at(0).shapes.at(0);
    expect(shape.localCOM.x).toBeCloseTo(5);
    expect(shape.localCOM.y).toBeCloseTo(-3);
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

  it("restores material properties", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const mat = new Material(0.9, 0.1, 0.2, 1.0, 0.001);
    body.shapes.add(new Circle(10, undefined, mat));
    body.space = space;
    const restored = roundTrip(space);
    const rmat = restored.bodies.at(0).shapes.at(0).material;
    expect(rmat.elasticity).toBeCloseTo(0.9);
    expect(rmat.dynamicFriction).toBeCloseTo(0.1);
    expect(rmat.staticFriction).toBeCloseTo(0.2);
    expect(rmat.density).toBeCloseTo(1.0);
    expect(rmat.rollingFriction).toBeCloseTo(0.001);
  });

  it("restores interaction filter", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const filter = new InteractionFilter();
    filter.collisionGroup = 2;
    filter.collisionMask = 3;
    filter.sensorGroup = 4;
    filter.sensorMask = 5;
    filter.fluidGroup = 6;
    filter.fluidMask = 7;
    body.shapes.add(new Circle(10, undefined, undefined, filter));
    body.space = space;
    const restored = roundTrip(space);
    const f = restored.bodies.at(0).shapes.at(0).filter;
    expect(f.collisionGroup).toBe(2);
    expect(f.collisionMask).toBe(3);
    expect(f.sensorGroup).toBe(4);
    expect(f.sensorMask).toBe(5);
    expect(f.fluidGroup).toBe(6);
    expect(f.fluidMask).toBe(7);
  });

  it("restores sensorEnabled", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const shape = new Circle(10);
    shape.sensorEnabled = true;
    body.shapes.add(shape);
    body.space = space;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).shapes.at(0).sensorEnabled).toBe(true);
  });

  it("restores fluidEnabled and fluidProperties", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const shape = new Circle(10);
    shape.fluidEnabled = true;
    const fp = new FluidProperties(2, 0.5);
    shape.fluidProperties = fp;
    body.shapes.add(shape);
    body.space = space;
    const restored = roundTrip(space);
    const rs = restored.bodies.at(0).shapes.at(0);
    expect(rs.fluidEnabled).toBe(true);
    expect(rs.fluidProperties.density).toBeCloseTo(2);
    expect(rs.fluidProperties.viscosity).toBeCloseTo(0.5);
  });

  it("restores fluidProperties with gravity override", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    const shape = new Circle(10);
    shape.fluidEnabled = true;
    const fp = new FluidProperties(1.5, 0.3);
    fp.gravity = Vec2.get(0, -100);
    shape.fluidProperties = fp;
    body.shapes.add(shape);
    body.space = space;
    const restored = roundTrip(space);
    const rs = restored.bodies.at(0).shapes.at(0);
    expect(rs.fluidProperties.gravity.x).toBeCloseTo(0);
    expect(rs.fluidProperties.gravity.y).toBeCloseTo(-100);
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

  it("restores fixed inertia", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.space = space;
    body.inertia = 42;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).inertia).toBeCloseTo(42);
    expect(restored.bodies.at(0).inertiaMode.toString()).toBe("FIXED");
  });

  it("restores allowMovement and allowRotation", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.allowMovement = false;
    body.allowRotation = false;
    body.space = space;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).allowMovement).toBe(false);
    expect(restored.bodies.at(0).allowRotation).toBe(false);
  });

  it("restores isBullet", () => {
    const space = new Space(Vec2.weak(0, 0));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    body.shapes.add(new Circle(10));
    body.isBullet = true;
    body.space = space;
    const restored = roundTrip(space);
    expect(restored.bodies.at(0).isBullet).toBe(true);
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

  // -----------------------------------------------------------------------
  // Constraints
  // -----------------------------------------------------------------------

  it("restores PivotJoint", () => {
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

  it("restores DistanceJoint", () => {
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

  it("restores MotorJoint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new MotorJoint(b1, b2, 3.14, 0.5);
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as MotorJoint;
    expect(rc.rate).toBeCloseTo(3.14);
    expect(rc.ratio).toBeCloseTo(0.5);
  });

  it("restores LineJoint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new LineJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0), Vec2.weak(1, 0), -10, 10);
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as LineJoint;
    expect(rc.direction.x).toBeCloseTo(1);
    expect(rc.direction.y).toBeCloseTo(0);
    expect(rc.jointMin).toBeCloseTo(-10);
    expect(rc.jointMax).toBeCloseTo(10);
  });

  it("restores PulleyJoint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(100, 0));
    b2.shapes.add(new Circle(10));
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

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as PulleyJoint;
    expect(rc.anchor1.y).toBeCloseTo(-50);
    expect(rc.anchor3.x).toBeCloseTo(100);
    expect(rc.jointMin).toBeCloseTo(80);
    expect(rc.jointMax).toBeCloseTo(120);
    expect(rc.ratio).toBeCloseTo(1.5);
  });

  it("restores WeldJoint", () => {
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

  it("restores constraint stiff/frequency/damping", () => {
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

  it("restores constraint breakUnderForce and removeOnBreak", () => {
    const space = new Space(Vec2.weak(0, 0));
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.space = space;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(50, 0));
    b2.shapes.add(new Circle(10));
    b2.space = space;
    const joint = new PivotJoint(b1, b2, Vec2.weak(0, 0), Vec2.weak(0, 0));
    joint.breakUnderForce = true;
    joint.removeOnBreak = true;
    joint.maxForce = 500;
    joint.space = space;

    const restored = roundTrip(space);
    const rc = restored.constraints.at(0) as PivotJoint;
    expect(rc.breakUnderForce).toBe(true);
    expect(rc.removeOnBreak).toBe(true);
    expect(rc.maxForce).toBeCloseTo(500);
  });

  // -----------------------------------------------------------------------
  // Compound
  // -----------------------------------------------------------------------

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
    expect(restored.compounds.length).toBe(1);
  });

  it("restores compound with constraint", () => {
    const space = new Space(Vec2.weak(0, 0));
    const compound = new Compound();
    const b1 = new Body(BodyType.DYNAMIC, Vec2.weak(0, 0));
    b1.shapes.add(new Circle(10));
    b1.compound = compound;
    const b2 = new Body(BodyType.DYNAMIC, Vec2.weak(30, 0));
    b2.shapes.add(new Circle(10));
    b2.compound = compound;
    const joint = new PivotJoint(b1, b2, Vec2.weak(15, 0), Vec2.weak(-15, 0));
    joint.compound = compound;
    compound.space = space;

    const restored = roundTrip(space);
    expect(restored.compounds.length).toBe(1);
    // Constraint is inside the compound, not at top-level space.constraints
    const rc = restored.compounds.at(0) as Compound;
    expect(rc.constraints.length).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Simulation after restore
  // -----------------------------------------------------------------------

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

  it("produces deterministic results matching original simulation", () => {
    // Create and step original space
    const space = new Space(Vec2.weak(0, 600));
    const body = new Body(BodyType.DYNAMIC, Vec2.weak(100, 0));
    body.shapes.add(new Circle(15));
    body.space = space;
    space.step(1 / 60, 10, 10);

    // Snapshot at frame 1, then step both for 10 more frames
    const snapshot = spaceToBinary(space);

    for (let i = 0; i < 10; i++) space.step(1 / 60, 10, 10);
    const originalY = space.bodies.at(0).position.y;

    const restored = spaceFromBinary(snapshot);
    for (let i = 0; i < 10; i++) restored.step(1 / 60, 10, 10);
    const restoredY = restored.bodies.at(0).position.y;

    expect(restoredY).toBeCloseTo(originalY, 5);
  });

  // -----------------------------------------------------------------------
  // Complex scene
  // -----------------------------------------------------------------------

  it("handles a complex scene with mixed shapes, bodies, and constraints", () => {
    const space = new Space(Vec2.weak(0, 600));

    // Static ground
    const ground = new Body(BodyType.STATIC, Vec2.weak(400, 580));
    ground.shapes.add(new Polygon(Polygon.box(800, 40)));
    ground.space = space;

    // Dynamic bodies
    for (let i = 0; i < 10; i++) {
      const b = new Body(BodyType.DYNAMIC, Vec2.weak(100 + i * 50, 100 + i * 30));
      if (i % 2 === 0) {
        b.shapes.add(new Circle(15));
      } else {
        b.shapes.add(new Polygon(Polygon.box(20, 20)));
      }
      b.space = space;
    }

    // Add constraints between some bodies
    const bodies = [];
    for (let i = 0; i < space.bodies.length; i++) {
      bodies.push(space.bodies.at(i));
    }
    const joint = new DistanceJoint(bodies[1], bodies[2], Vec2.weak(0, 0), Vec2.weak(0, 0), 30, 60);
    joint.space = space;

    // Step a few frames
    for (let i = 0; i < 5; i++) space.step(1 / 60, 10, 10);

    const restored = roundTrip(space);
    expect(restored.bodies.length).toBe(11); // ground + 10
    expect(restored.constraints.length).toBe(1);

    // Verify restored space can step
    restored.step(1 / 60, 10, 10);
  });
});
