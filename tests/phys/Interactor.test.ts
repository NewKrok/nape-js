import { describe, it, expect } from "vitest";
import { Body } from "../../src/phys/Body";
import { Interactor } from "../../src/phys/Interactor";
import { InteractionGroup } from "../../src/dynamics/InteractionGroup";
import { Circle } from "../../src/shape/Circle";
import { Shape } from "../../src/shape/Shape";

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

  // ---------------------------------------------------------------------------
  // id
  // ---------------------------------------------------------------------------

  it("Body should have a numeric id", () => {
    const body = new Body();
    expect(typeof body.id).toBe("number");
    expect(body.id).toBeGreaterThan(0);
  });

  it("each interactor should have a unique id", () => {
    const body1 = new Body();
    const body2 = new Body();
    const circle = new Circle(10);
    expect(body1.id).not.toBe(body2.id);
    expect(body1.id).not.toBe(circle.id);
    expect(body2.id).not.toBe(circle.id);
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

  it("castShape on a Shape should return the Shape", () => {
    const circle = new Circle(10);
    const cast = circle.castShape;
    expect(cast).toBeDefined();
    expect(cast).toBeInstanceOf(Shape);
  });

  it("castBody on a Shape should return null", () => {
    const circle = new Circle(10);
    expect(circle.castBody).toBeNull();
  });

  it("castCompound on a Body should return null", () => {
    const body = new Body();
    expect(body.castCompound).toBeNull();
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
  });

  // ---------------------------------------------------------------------------
  // cbTypes
  // ---------------------------------------------------------------------------

  it("should have a cbTypes list on Body", () => {
    const body = new Body();
    const cbTypes = body.cbTypes;
    expect(cbTypes).toBeDefined();
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

  // ---------------------------------------------------------------------------
  // toString
  // ---------------------------------------------------------------------------

  it("toString should return a string", () => {
    const body = new Body();
    expect(typeof body.toString()).toBe("string");
  });
});
