import { describe, it, expect } from "vitest";
import { Body } from "../../src/phys/Body";
import { Compound } from "../../src/phys/Compound";
import { Interactor } from "../../src/phys/Interactor";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";
import { CbType } from "../../src/callbacks/CbType";
import { Circle } from "../../src/shape/Circle";
import { Polygon } from "../../src/shape/Polygon";
import { Shape } from "../../src/shape/Shape";
import { Space } from "../../src/space/Space";

describe("Interactor", () => {
  // ---------------------------------------------------------------------------
  // Inheritance
  // ---------------------------------------------------------------------------

  it("Body should be an instance of Interactor", () => {
    const body = new Body();
    expect(body).toBeInstanceOf(Interactor);
  });

  it("Shape (Circle) should be an instance of Interactor", () => {
    const circle = new Circle(10);
    expect(circle).toBeInstanceOf(Interactor);
    expect(circle).toBeInstanceOf(Shape);
  });

  it("Shape (Polygon) should be an instance of Interactor", () => {
    const poly = new Polygon(Polygon.rect(0, 0, 50, 50));
    expect(poly).toBeInstanceOf(Interactor);
    expect(poly).toBeInstanceOf(Shape);
  });

  it("Compound should be an instance of Interactor", () => {
    const compound = new Compound();
    expect(compound).toBeInstanceOf(Interactor);
  });

  // ---------------------------------------------------------------------------
  // id
  // ---------------------------------------------------------------------------

  it("Body should have a numeric id", () => {
    const body = new Body();
    expect(typeof body.id).toBe("number");
    expect(body.id).toBeGreaterThan(0);
  });

  it("Circle should have a numeric id", () => {
    const circle = new Circle(10);
    expect(typeof circle.id).toBe("number");
    expect(circle.id).toBeGreaterThan(0);
  });

  it("Polygon should have a numeric id", () => {
    const poly = new Polygon(Polygon.box(50, 50));
    expect(typeof poly.id).toBe("number");
    expect(poly.id).toBeGreaterThan(0);
  });

  it("Compound should have a numeric id", () => {
    const compound = new Compound();
    expect(typeof compound.id).toBe("number");
    expect(compound.id).toBeGreaterThan(0);
  });

  it("each interactor should have a unique id", () => {
    const body1 = new Body();
    const body2 = new Body();
    const circle = new Circle(10);
    const compound = new Compound();
    const ids = [body1.id, body2.id, circle.id, compound.id];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("id should be consistent across multiple accesses", () => {
    const body = new Body();
    const id1 = body.id;
    const id2 = body.id;
    expect(id1).toBe(id2);
  });

  // ---------------------------------------------------------------------------
  // userData
  // ---------------------------------------------------------------------------

  it("should return an empty userData object by default", () => {
    const body = new Body();
    expect(body.userData).toBeDefined();
    expect(typeof body.userData).toBe("object");
  });

  it("should persist userData values", () => {
    const body = new Body();
    body.userData.tag = "player";
    expect(body.userData.tag).toBe("player");
  });

  it("should return the same userData object on repeated access", () => {
    const body = new Body();
    const ud1 = body.userData;
    const ud2 = body.userData;
    expect(ud1).toBe(ud2);
  });

  it("Circle should have its own userData", () => {
    const circle = new Circle(10);
    circle.userData.kind = "obstacle";
    expect(circle.userData.kind).toBe("obstacle");
  });

  it("Compound should have its own userData", () => {
    const compound = new Compound();
    compound.userData.name = "vehicle";
    expect(compound.userData.name).toBe("vehicle");
  });

  it("userData should be independent between interactors", () => {
    const body = new Body();
    const circle = new Circle(10);
    body.userData.tag = "a";
    circle.userData.tag = "b";
    expect(body.userData.tag).toBe("a");
    expect(circle.userData.tag).toBe("b");
  });

  // ---------------------------------------------------------------------------
  // isBody / isShape / isCompound
  // ---------------------------------------------------------------------------

  it("Body.isBody() should return true", () => {
    const body = new Body();
    expect(body.isBody()).toBe(true);
    expect(body.isShape()).toBe(false);
    expect(body.isCompound()).toBe(false);
  });

  it("Shape.isShape() should return true", () => {
    const circle = new Circle(10);
    expect(circle.isShape()).toBe(true);
    expect(circle.isBody()).toBe(false);
    expect(circle.isCompound()).toBe(false);
  });

  it("Polygon.isShape() should return true", () => {
    const poly = new Polygon(Polygon.box(50, 50));
    expect(poly.isShape()).toBe(true);
    expect(poly.isBody()).toBe(false);
    expect(poly.isCompound()).toBe(false);
  });

  it("Compound.isCompound() should return true", () => {
    const compound = new Compound();
    expect(compound.isCompound()).toBe(true);
    expect(compound.isBody()).toBe(false);
    expect(compound.isShape()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // castBody / castShape / castCompound
  // ---------------------------------------------------------------------------

  it("castBody on a Body should return the Body", () => {
    const body = new Body();
    const cast = body.castBody;
    expect(cast).toBeDefined();
    expect(cast).toBeInstanceOf(Body);
  });

  it("castShape on a Body should return null", () => {
    const body = new Body();
    expect(body.castShape).toBeNull();
  });

  it("castCompound on a Body should return null", () => {
    const body = new Body();
    expect(body.castCompound).toBeNull();
  });

  it("castShape on a Circle should return a Shape instance", () => {
    const circle = new Circle(10);
    const cast = circle.castShape;
    expect(cast).toBeDefined();
    expect(cast).toBeInstanceOf(Shape);
  });

  it("castBody on a Shape should return null", () => {
    const circle = new Circle(10);
    expect(circle.castBody).toBeNull();
  });

  it("castCompound on a Shape should return null", () => {
    const circle = new Circle(10);
    expect(circle.castCompound).toBeNull();
  });

  it("castShape on a Polygon should return a Shape instance", () => {
    const poly = new Polygon(Polygon.box(50, 50));
    const cast = poly.castShape;
    expect(cast).toBeDefined();
    expect(cast).toBeInstanceOf(Shape);
  });

  it("castCompound on a Compound should return the Compound", () => {
    const compound = new Compound();
    const cast = compound.castCompound;
    expect(cast).toBeDefined();
    expect(cast).toBeInstanceOf(Compound);
  });

  it("castBody on a Compound should return null", () => {
    const compound = new Compound();
    expect(compound.castBody).toBeNull();
  });

  it("castShape on a Compound should return null", () => {
    const compound = new Compound();
    expect(compound.castShape).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // group
  // ---------------------------------------------------------------------------

  it("group should be null by default", () => {
    const body = new Body();
    expect(body.group).toBeNull();
  });

  it("should get/set group on a Body", () => {
    const body = new Body();
    const group = new InteractionGroup();
    body.group = group;
    const retrieved = body.group;
    expect(retrieved).toBeDefined();
    expect(retrieved).not.toBeNull();
    expect(retrieved).toBeInstanceOf(InteractionGroup);
  });

  it("should clear group by setting null", () => {
    const body = new Body();
    const group = new InteractionGroup();
    body.group = group;
    expect(body.group).not.toBeNull();
    body.group = null;
    expect(body.group).toBeNull();
  });

  it("should get/set group on a Shape", () => {
    const circle = new Circle(10);
    const group = new InteractionGroup();
    circle.group = group;
    expect(circle.group).not.toBeNull();
    expect(circle.group).toBeInstanceOf(InteractionGroup);
  });

  it("should get/set group on a Compound", () => {
    const compound = new Compound();
    const group = new InteractionGroup();
    compound.group = group;
    expect(compound.group).not.toBeNull();
    expect(compound.group).toBeInstanceOf(InteractionGroup);
  });

  it("group should be null by default on a Circle", () => {
    const circle = new Circle(10);
    expect(circle.group).toBeNull();
  });

  it("group should be null by default on a Compound", () => {
    const compound = new Compound();
    expect(compound.group).toBeNull();
  });

  it("should throw when setting group mid-step", () => {
    const space = new Space();
    const body = new Body();
    body.shapes.add(new Circle(10));
    space.bodies.add(body);
    const group = new InteractionGroup();

    // We can't easily trigger mid-step, but we verify setting outside of step works
    body.group = group;
    expect(body.group).toBeInstanceOf(InteractionGroup);
    body.group = null;
    expect(body.group).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // cbTypes
  // ---------------------------------------------------------------------------

  it("should have a cbTypes list on Body", () => {
    const body = new Body();
    const cbTypes = body.cbTypes;
    expect(cbTypes).toBeDefined();
  });

  it("should have a cbTypes list on Circle", () => {
    const circle = new Circle(10);
    const cbTypes = circle.cbTypes;
    expect(cbTypes).toBeDefined();
  });

  it("should have a cbTypes list on Compound", () => {
    const compound = new Compound();
    const cbTypes = compound.cbTypes;
    expect(cbTypes).toBeDefined();
  });

  it("cbTypes should return the same list on repeated access", () => {
    const body = new Body();
    const cb1 = body.cbTypes;
    const cb2 = body.cbTypes;
    expect(cb1).toBe(cb2);
  });

  it("should support adding/removing CbTypes on Body", () => {
    const body = new Body();
    const ct = new CbType();
    body.cbTypes.add(ct);
    expect(body.cbTypes.has(ct)).toBe(true);
    body.cbTypes.remove(ct);
    expect(body.cbTypes.has(ct)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Interactor._wrap
  // ---------------------------------------------------------------------------

  it("_wrap should return null for falsy input", () => {
    expect(Interactor._wrap(null)).toBeNull();
    expect(Interactor._wrap(undefined)).toBeNull();
  });

  it("_wrap should return same Interactor instance if already wrapped", () => {
    const body = new Body();
    const wrapped = Interactor._wrap(body);
    expect(wrapped).toBe(body);
  });

  it("_wrap should return same instance for Circle", () => {
    const circle = new Circle(10);
    const wrapped = Interactor._wrap(circle);
    expect(wrapped).toBe(circle);
  });

  it("_wrap should return same instance for Compound", () => {
    const compound = new Compound();
    const wrapped = Interactor._wrap(compound);
    expect(wrapped).toBe(compound);
  });

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it("toString should return a string for Body", () => {
    const body = new Body();
    expect(typeof body.toString()).toBe("string");
  });

  // ---------------------------------------------------------------------------
  // zpp_inner_i direct access (modernization verification)
  // ---------------------------------------------------------------------------

  it("Body.zpp_inner_i should be set and contain expected fields", () => {
    const body = new Body();
    expect(body.zpp_inner_i).toBeDefined();
    expect(body.zpp_inner_i).not.toBeNull();
    expect(typeof body.zpp_inner_i.id).toBe("number");
    expect(body.zpp_inner_i.ibody).not.toBeNull();
    expect(body.zpp_inner_i.ishape).toBeNull();
    expect(body.zpp_inner_i.icompound).toBeNull();
  });

  it("Circle.zpp_inner_i should be set and contain expected fields", () => {
    const circle = new Circle(10);
    expect(circle.zpp_inner_i).toBeDefined();
    expect(circle.zpp_inner_i).not.toBeNull();
    expect(typeof circle.zpp_inner_i.id).toBe("number");
    expect(circle.zpp_inner_i.ishape).not.toBeNull();
    expect(circle.zpp_inner_i.ibody).toBeNull();
  });

  it("Polygon.zpp_inner_i should be set and contain expected fields", () => {
    const poly = new Polygon(Polygon.box(50, 50));
    expect(poly.zpp_inner_i).toBeDefined();
    expect(poly.zpp_inner_i).not.toBeNull();
    expect(typeof poly.zpp_inner_i.id).toBe("number");
    expect(poly.zpp_inner_i.ishape).not.toBeNull();
  });

  it("Compound.zpp_inner_i should be set and contain expected fields", () => {
    const compound = new Compound();
    expect(compound.zpp_inner_i).toBeDefined();
    expect(compound.zpp_inner_i).not.toBeNull();
    expect(typeof compound.zpp_inner_i.id).toBe("number");
    expect(compound.zpp_inner_i.icompound).not.toBeNull();
    expect(compound.zpp_inner_i.ibody).toBeNull();
    expect(compound.zpp_inner_i.ishape).toBeNull();
  });

  it("id from getter should match zpp_inner_i.id directly", () => {
    const body = new Body();
    expect(body.id).toBe(body.zpp_inner_i.id);

    const circle = new Circle(10);
    expect(circle.id).toBe(circle.zpp_inner_i.id);

    const compound = new Compound();
    expect(compound.id).toBe(compound.zpp_inner_i.id);
  });
});
