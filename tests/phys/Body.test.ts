import { describe, it, expect } from "vitest";
import { Body } from "../../src/phys/Body";
import { BodyType } from "../../src/phys/BodyType";
import { MassMode } from "../../src/phys/MassMode";
import { InertiaMode } from "../../src/phys/InertiaMode";
import { GravMassMode } from "../../src/phys/GravMassMode";
import { Vec2 } from "../../src/geom/Vec2";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Material } from "../../src/phys/Material";
import { FluidProperties } from "../../src/phys/FluidProperties";
import { InteractionFilter } from "../../src/dynamics/InteractionFilter";
import { Space } from "../../src/space/Space";
import { Compound } from "../../src/phys/Compound";

describe("Body", () => {
  // --- Constructor ---

  it("should construct with default dynamic type", () => {
    const body = new Body();
    expect(body.type).toBe(BodyType.DYNAMIC);
    expect(body.isDynamic()).toBe(true);
    expect(body.isStatic()).toBe(false);
    expect(body.isKinematic()).toBe(false);
  });

  it("should construct with a specific type", () => {
    const body = new Body(BodyType.STATIC);
    expect(body.type).toBe(BodyType.STATIC);
    expect(body.isStatic()).toBe(true);
  });

  it("should construct with a position", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(100, 200));
    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(200);
  });

  it("should construct kinematic body", () => {
    const body = new Body(BodyType.KINEMATIC);
    expect(body.type).toBe(BodyType.KINEMATIC);
    expect(body.isKinematic()).toBe(true);
    expect(body.isDynamic()).toBe(false);
    expect(body.isStatic()).toBe(false);
  });

  // --- Position & rotation ---

  it("should get/set position", () => {
    const body = new Body();
    body.position.x = 50;
    body.position.y = 75;
    expect(body.position.x).toBeCloseTo(50);
    expect(body.position.y).toBeCloseTo(75);
  });

  it("should set position via Vec2", () => {
    const body = new Body();
    body.position = new Vec2(42, 99);
    expect(body.position.x).toBeCloseTo(42);
    expect(body.position.y).toBeCloseTo(99);
  });

  it("should get/set rotation", () => {
    const body = new Body();
    body.rotation = Math.PI / 4;
    expect(body.rotation).toBeCloseTo(Math.PI / 4);
  });

  it("should throw on NaN rotation", () => {
    const body = new Body();
    expect(() => {
      body.rotation = NaN;
    }).toThrow("NaN");
  });

  // --- Velocity ---

  it("should get/set velocity", () => {
    const body = new Body();
    body.velocity.x = 10;
    body.velocity.y = -5;
    expect(body.velocity.x).toBeCloseTo(10);
    expect(body.velocity.y).toBeCloseTo(-5);
  });

  it("should set velocity via Vec2", () => {
    const body = new Body();
    body.velocity = new Vec2(33, -11);
    expect(body.velocity.x).toBeCloseTo(33);
    expect(body.velocity.y).toBeCloseTo(-11);
  });

  it("should get/set angular velocity", () => {
    const body = new Body();
    body.angularVel = 2.5;
    expect(body.angularVel).toBeCloseTo(2.5);
  });

  it("should throw on NaN angularVel", () => {
    const body = new Body();
    expect(() => {
      body.angularVel = NaN;
    }).toThrow("NaN");
  });

  it("should throw when setting angularVel on static body", () => {
    const body = new Body(BodyType.STATIC);
    expect(() => {
      body.angularVel = 1;
    }).toThrow("static");
  });

  // --- Kinematic velocity ---

  it("should get/set kinematicVel", () => {
    const body = new Body(BodyType.KINEMATIC);
    body.kinematicVel.x = 5;
    body.kinematicVel.y = -3;
    expect(body.kinematicVel.x).toBeCloseTo(5);
    expect(body.kinematicVel.y).toBeCloseTo(-3);
  });

  it("should set kinematicVel via Vec2", () => {
    const body = new Body(BodyType.KINEMATIC);
    body.kinematicVel = new Vec2(7, 8);
    expect(body.kinematicVel.x).toBeCloseTo(7);
    expect(body.kinematicVel.y).toBeCloseTo(8);
  });

  it("should get/set kinAngVel", () => {
    const body = new Body(BodyType.KINEMATIC);
    body.kinAngVel = 1.5;
    expect(body.kinAngVel).toBeCloseTo(1.5);
  });

  it("should throw on NaN kinAngVel", () => {
    const body = new Body();
    expect(() => {
      body.kinAngVel = NaN;
    }).toThrow("NaN");
  });

  // --- Surface velocity ---

  it("should get/set surfaceVel", () => {
    const body = new Body();
    body.surfaceVel.x = 3;
    body.surfaceVel.y = 4;
    expect(body.surfaceVel.x).toBeCloseTo(3);
    expect(body.surfaceVel.y).toBeCloseTo(4);
  });

  it("should set surfaceVel via Vec2", () => {
    const body = new Body();
    body.surfaceVel = new Vec2(11, 12);
    expect(body.surfaceVel.x).toBeCloseTo(11);
    expect(body.surfaceVel.y).toBeCloseTo(12);
  });

  // --- Force & torque ---

  it("should get/set force", () => {
    const body = new Body();
    body.force.x = 100;
    body.force.y = -50;
    expect(body.force.x).toBeCloseTo(100);
    expect(body.force.y).toBeCloseTo(-50);
  });

  it("should set force via Vec2", () => {
    const body = new Body();
    body.force = new Vec2(200, 300);
    expect(body.force.x).toBeCloseTo(200);
    expect(body.force.y).toBeCloseTo(300);
  });

  it("should get/set torque", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.torque = 5.0;
    expect(body.torque).toBeCloseTo(5.0);
  });

  it("should throw on NaN torque", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.torque = NaN;
    }).toThrow("NaN");
  });

  it("should throw on non-dynamic torque", () => {
    const body = new Body(BodyType.STATIC);
    expect(() => {
      body.torque = 1;
    }).toThrow("Non-dynamic");
  });

  // --- Mass & inertia ---

  it("should get mass for body with shapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const mass = body.mass;
    expect(mass).toBeGreaterThan(0);
    expect(isFinite(mass)).toBe(true);
  });

  it("should set mass manually", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.mass = 42;
    expect(body.mass).toBeCloseTo(42);
  });

  it("should throw on NaN mass", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.mass = NaN;
    }).toThrow("NaN");
  });

  it("should throw on non-positive mass", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.mass = 0;
    }).toThrow("positive");
    expect(() => {
      body.mass = -1;
    }).toThrow("positive");
  });

  it("should throw on infinite mass", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.mass = Infinity;
    }).toThrow("infinite");
  });

  it("should get inertia for body with shapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const inertia = body.inertia;
    expect(inertia).toBeGreaterThan(0);
    expect(isFinite(inertia)).toBe(true);
  });

  it("should set inertia manually", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.inertia = 100;
    expect(body.inertia).toBeCloseTo(100);
  });

  it("should throw on NaN inertia", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.inertia = NaN;
    }).toThrow("NaN");
  });

  it("should throw on non-positive inertia", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.inertia = 0;
    }).toThrow("positive");
  });

  it("should throw on infinite inertia", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.inertia = Infinity;
    }).toThrow("infinite");
  });

  it("should get constraintMass", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const cm = body.constraintMass;
    expect(cm).toBeDefined();
    expect(typeof cm).toBe("number");
  });

  it("should get constraintInertia", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const ci = body.constraintInertia;
    expect(ci).toBeDefined();
    expect(typeof ci).toBe("number");
  });

  // --- gravMass ---

  it("should get gravMass for body with shapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const gm = body.gravMass;
    expect(gm).toBeGreaterThan(0);
  });

  it("should set gravMass", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.gravMass = 99;
    expect(body.gravMass).toBeCloseTo(99);
  });

  it("should throw on NaN gravMass", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.gravMass = NaN;
    }).toThrow("NaN");
  });

  // --- gravMassScale ---

  it("should set/get gravMassScale", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.gravMassScale = 2.5;
    expect(body.gravMassScale).toBeCloseTo(2.5);
  });

  it("should throw on NaN gravMassScale", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => {
      body.gravMassScale = NaN;
    }).toThrow("NaN");
  });

  // --- disableCCD ---

  it("should get/set disableCCD", () => {
    const body = new Body();
    expect(body.disableCCD).toBe(false);
    body.disableCCD = true;
    expect(body.disableCCD).toBe(true);
  });

  // --- Flags ---

  it("should get/set isBullet", () => {
    const body = new Body();
    expect(body.isBullet).toBe(false);
    body.isBullet = true;
    expect(body.isBullet).toBe(true);
  });

  it("should get/set allowMovement and allowRotation", () => {
    const body = new Body();
    expect(body.allowMovement).toBe(true);
    body.allowMovement = false;
    expect(body.allowMovement).toBe(false);

    expect(body.allowRotation).toBe(true);
    body.allowRotation = false;
    expect(body.allowRotation).toBe(false);
  });

  // --- isSleeping ---

  it("should throw isSleeping when not in space", () => {
    const body = new Body();
    expect(() => body.isSleeping).toThrow("not contained within a Space");
  });

  it("should return isSleeping for body in space", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;
    expect(typeof body.isSleeping).toBe("boolean");
  });

  // --- Shapes ---

  it("should add shapes", () => {
    const body = new Body();
    const circle = new Circle(25);
    body.shapes.add(circle);
    expect(body.shapes.length).toBe(1);
  });

  it("should add to and remove from a space", () => {
    const space = new Space(new Vec2(0, 100));
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.space = space;
    expect(space.bodies.length).toBe(1);

    body.space = null;
    expect(space.bodies.length).toBe(0);
  });

  it("should compute bounds after adding shapes", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Polygon(Polygon.box(100, 50)));
    const bounds = body.bounds;
    expect(bounds.width).toBeCloseTo(100);
    expect(bounds.height).toBeCloseTo(50);
  });

  // --- Mode getters/setters ---

  it("should get/set massMode", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(body.massMode).toBe(MassMode.DEFAULT);
    body.mass = 5; // switches to FIXED
    expect(body.massMode).toBe(MassMode.FIXED);
  });

  it("should set massMode back to DEFAULT", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.mass = 5;
    expect(body.massMode).toBe(MassMode.FIXED);
    body.massMode = MassMode.DEFAULT;
    expect(body.massMode).toBe(MassMode.DEFAULT);
  });

  it("should throw on null massMode", () => {
    const body = new Body();
    expect(() => {
      body.massMode = null as any;
    }).toThrow("null");
  });

  it("should get/set inertiaMode", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(body.inertiaMode).toBe(InertiaMode.DEFAULT);
    body.inertia = 100;
    expect(body.inertiaMode).toBe(InertiaMode.FIXED);
  });

  it("should set inertiaMode back to DEFAULT", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.inertia = 100;
    body.inertiaMode = InertiaMode.DEFAULT;
    expect(body.inertiaMode).toBe(InertiaMode.DEFAULT);
  });

  it("should throw on null inertiaMode", () => {
    const body = new Body();
    expect(() => {
      body.inertiaMode = null as any;
    }).toThrow("null");
  });

  it("should get/set gravMassMode", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(body.gravMassMode).toBe(GravMassMode.DEFAULT);

    body.gravMass = 42;
    expect(body.gravMassMode).toBe(GravMassMode.FIXED);

    body.gravMassScale = 2.0;
    expect(body.gravMassMode).toBe(GravMassMode.SCALED);

    body.gravMassMode = GravMassMode.DEFAULT;
    expect(body.gravMassMode).toBe(GravMassMode.DEFAULT);
  });

  it("should throw on null gravMassMode", () => {
    const body = new Body();
    expect(() => {
      body.gravMassMode = null as any;
    }).toThrow("null");
  });

  // --- Coordinate transforms ---

  it("should transform localPointToWorld", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    body.rotation = 0;
    const world = body.localPointToWorld(new Vec2(5, 0));
    expect(world.x).toBeCloseTo(15);
    expect(world.y).toBeCloseTo(20);
  });

  it("should transform worldPointToLocal", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    body.rotation = 0;
    const local = body.worldPointToLocal(new Vec2(15, 20));
    expect(local.x).toBeCloseTo(5);
    expect(local.y).toBeCloseTo(0);
  });

  it("should round-trip local→world→local", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(50, 100));
    body.rotation = Math.PI / 3;
    const original = new Vec2(7, 13);
    const world = body.localPointToWorld(new Vec2(7, 13));
    const back = body.worldPointToLocal(world);
    expect(back.x).toBeCloseTo(original.x, 4);
    expect(back.y).toBeCloseTo(original.y, 4);
  });

  it("should transform localVectorToWorld", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    body.rotation = 0;
    const world = body.localVectorToWorld(new Vec2(5, 0));
    // Vector transform doesn't add position
    expect(world.x).toBeCloseTo(5);
    expect(world.y).toBeCloseTo(0);
  });

  it("should transform worldVectorToLocal", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    body.rotation = 0;
    const local = body.worldVectorToLocal(new Vec2(5, 0));
    expect(local.x).toBeCloseTo(5);
    expect(local.y).toBeCloseTo(0);
  });

  it("should throw on null in transforms", () => {
    const body = new Body();
    expect(() => body.localPointToWorld(null as any)).toThrow("null");
    expect(() => body.worldPointToLocal(null as any)).toThrow("null");
    expect(() => body.localVectorToWorld(null as any)).toThrow("null");
    expect(() => body.worldVectorToLocal(null as any)).toThrow("null");
  });

  // --- Impulse application ---

  it("should applyImpulse", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const before = body.velocity.x;
    body.applyImpulse(new Vec2(100, 0));
    expect(body.velocity.x).not.toBeCloseTo(before);
  });

  it("should applyImpulse at point (angular)", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.applyImpulse(new Vec2(0, 100), new Vec2(10, 0));
    // Should produce both linear and angular velocity change
    expect(body.velocity.y).not.toBeCloseTo(0);
    expect(body.angularVel).not.toBeCloseTo(0);
  });

  it("should throw on null impulse", () => {
    const body = new Body();
    expect(() => body.applyImpulse(null as any)).toThrow("null");
  });

  it("should applyAngularImpulse", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.applyAngularImpulse(50);
    expect(body.angularVel).not.toBeCloseTo(0);
  });

  // --- setVelocityFromTarget ---

  it("should setVelocityFromTarget", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.setVelocityFromTarget(new Vec2(100, 0), 0, 1.0);
    expect(body.velocity.x).toBeCloseTo(100);
    expect(body.velocity.y).toBeCloseTo(0);
  });

  it("should throw on deltaTime 0", () => {
    const body = new Body();
    expect(() => body.setVelocityFromTarget(new Vec2(0, 0), 0, 0)).toThrow("deltaTime");
  });

  // --- integrate ---

  it("should integrate position by velocity", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    body.velocity.x = 100;
    body.velocity.y = 0;
    body.integrate(1.0);
    expect(body.position.x).toBeCloseTo(100);
    expect(body.position.y).toBeCloseTo(0);
  });

  it("should return this on zero deltaTime", () => {
    const body = new Body();
    expect(body.integrate(0)).toBe(body);
  });

  it("should throw on NaN deltaTime", () => {
    const body = new Body();
    expect(() => body.integrate(NaN)).toThrow("NaN");
  });

  // --- Shape operations ---

  it("should translateShapes", () => {
    const body = new Body();
    const circle = new Circle(10);
    body.shapes.add(circle);
    body.translateShapes(new Vec2(5, 5));
    // Shape local offset should have changed
    expect(circle.localCOM.x).toBeCloseTo(5);
    expect(circle.localCOM.y).toBeCloseTo(5);
  });

  it("should rotateShapes", () => {
    const body = new Body();
    body.shapes.add(new Polygon(Polygon.box(20, 10)));
    body.rotateShapes(Math.PI / 2);
    // Bounds should swap width/height (approximately)
    const bounds = body.bounds;
    expect(bounds.width).toBeCloseTo(10, 0);
    expect(bounds.height).toBeCloseTo(20, 0);
  });

  it("should scaleShapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.scaleShapes(2, 2);
    const bounds = body.bounds;
    expect(bounds.width).toBeCloseTo(40, 0);
    expect(bounds.height).toBeCloseTo(40, 0);
  });

  it("should throw translateShapes with null", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    expect(() => body.translateShapes(null as any)).toThrow("null");
  });

  // --- align ---

  it("should align body (center shapes on COM)", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.translateShapes(new Vec2(20, 0));
    body.align();
    // After align, localCOM should be near zero
    const lcom = body.localCOM;
    expect(lcom.x).toBeCloseTo(0, 1);
    expect(lcom.y).toBeCloseTo(0, 1);
  });

  it("should throw align on empty body", () => {
    const body = new Body();
    expect(() => body.align()).toThrow("empty");
  });

  // --- rotate (body around a point) ---

  it("should rotate around a centre point", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 0));
    body.shapes.add(new Circle(5));
    body.rotate(new Vec2(0, 0), Math.PI / 2);
    expect(body.position.x).toBeCloseTo(0, 0);
    expect(body.position.y).toBeCloseTo(10, 0);
    expect(body.rotation).toBeCloseTo(Math.PI / 2);
  });

  it("should throw rotate with null centre", () => {
    const body = new Body();
    expect(() => body.rotate(null as any, 0)).toThrow("null");
  });

  it("should throw rotate with NaN angle", () => {
    const body = new Body();
    expect(() => body.rotate(new Vec2(0, 0), NaN)).toThrow("NaN");
  });

  // --- setShapeMaterials / setShapeFilters / setShapeFluidProperties ---

  it("should set material for all shapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.shapes.add(new Circle(20));
    const mat = new Material(0.5, 0.3, 0.4, 2.0);
    body.setShapeMaterials(mat);
    const shapeMat = body.shapes.at(0).material;
    expect(shapeMat.elasticity).toBeCloseTo(0.5);
    expect(shapeMat.density).toBeCloseTo(2.0);
  });

  it("should set filter for all shapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    body.shapes.add(new Circle(20));
    const filter = new InteractionFilter(1, 2, 3, 4);
    body.setShapeFilters(filter);
    const f = body.shapes.at(0).filter;
    expect(f.collisionGroup).toBe(1);
    expect(f.collisionMask).toBe(2);
  });

  it("should set fluid properties for all shapes", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const fp = new FluidProperties(3.0, 0.5);
    body.setShapeFluidProperties(fp);
    const sfp = body.shapes.at(0).fluidProperties;
    expect(sfp.density).toBeCloseTo(3.0);
    expect(sfp.viscosity).toBeCloseTo(0.5);
  });

  // --- localCOM / worldCOM ---

  it("should get localCOM", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const lcom = body.localCOM;
    expect(typeof lcom.x).toBe("number");
    expect(typeof lcom.y).toBe("number");
  });

  it("should get worldCOM", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(50, 100));
    body.shapes.add(new Circle(10));
    const wcom = body.worldCOM;
    expect(wcom.x).toBeCloseTo(50, 0);
    expect(wcom.y).toBeCloseTo(100, 0);
  });

  // --- constraintVelocity ---

  it("should get constraintVelocity", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const cv = body.constraintVelocity;
    expect(typeof cv.x).toBe("number");
    expect(typeof cv.y).toBe("number");
  });

  // --- compound ---

  it("should get/set compound", () => {
    const body = new Body();
    body.shapes.add(new Circle(10));
    const compound = new Compound();
    body.compound = compound;
    expect(body.compound).toBe(compound);
    body.compound = null;
    expect(body.compound).toBeNull();
  });

  // --- copy ---

  it("should copy a body", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    body.shapes.add(new Circle(15));
    body.rotation = 1.0;

    const copy = body.copy();
    expect(copy.position.x).toBeCloseTo(10);
    expect(copy.position.y).toBeCloseTo(20);
    expect(copy.rotation).toBeCloseTo(1.0);
    expect(copy.shapes.length).toBe(1);
  });

  it("should produce independent copy", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(10, 20));
    body.shapes.add(new Circle(15));
    const copy = body.copy();
    copy.position.x = 999;
    expect(body.position.x).toBeCloseTo(10);
  });

  // --- toString ---

  it("should have toString", () => {
    const body = new Body();
    const str = body.toString();
    expect(str).toContain("dynamic");
    expect(str).toContain("#");
  });

  it("should show static in toString", () => {
    const body = new Body(BodyType.STATIC);
    expect(body.toString()).toContain("static");
  });

  it("should show kinematic in toString", () => {
    const body = new Body(BodyType.KINEMATIC);
    expect(body.toString()).toContain("kinematic");
  });

  // --- contains ---

  it("should check contains point", () => {
    const body = new Body(BodyType.DYNAMIC, new Vec2(0, 0));
    body.shapes.add(new Circle(10));
    expect(body.contains(new Vec2(0, 0))).toBe(true);
    expect(body.contains(new Vec2(100, 100))).toBe(false);
  });

  // --- Type change ---

  it("should change body type", () => {
    const body = new Body(BodyType.DYNAMIC);
    body.type = BodyType.KINEMATIC;
    expect(body.type).toBe(BodyType.KINEMATIC);
    expect(body.isKinematic()).toBe(true);
  });

  it("should throw on null type", () => {
    const body = new Body();
    expect(() => {
      body.type = null as any;
    }).toThrow("null");
  });
});
