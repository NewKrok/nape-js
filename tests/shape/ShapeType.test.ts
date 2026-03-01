import { describe, it, expect } from "vitest";
import { ShapeType } from "../../src/shape/ShapeType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("ShapeType", () => {
  it("should have correct __name__", () => {
    expect(ShapeType.__name__).toEqual(["nape", "shape", "ShapeType"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new ShapeType()).toThrow("Cannot instantiate");
  });

  it("should return CIRCLE singleton", () => {
    const a = ShapeType.get_CIRCLE();
    const b = ShapeType.get_CIRCLE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ShapeType);
  });

  it("should return POLYGON singleton", () => {
    const a = ShapeType.get_POLYGON();
    const b = ShapeType.get_POLYGON();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ShapeType);
  });

  it("should return distinct instances for each type", () => {
    expect(ShapeType.get_CIRCLE()).not.toBe(ShapeType.get_POLYGON());
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.ShapeType_CIRCLE).toBe(ShapeType.get_CIRCLE());
    expect(ZPP_Flags.ShapeType_POLYGON).toBe(ShapeType.get_POLYGON());
  });

  it("CIRCLE toString should return 'CIRCLE'", () => {
    expect(ShapeType.get_CIRCLE().toString()).toBe("CIRCLE");
  });

  it("POLYGON toString should return 'POLYGON'", () => {
    expect(ShapeType.get_POLYGON().toString()).toBe("POLYGON");
  });

  it("static getters should work (ShapeType.CIRCLE etc.)", () => {
    expect(ShapeType.CIRCLE).toBe(ShapeType.get_CIRCLE());
    expect(ShapeType.POLYGON).toBe(ShapeType.get_POLYGON());
  });

  it("should have __class__ set on prototype", () => {
    expect((ShapeType.get_CIRCLE() as any).__class__).toBe(ShapeType);
  });
});
