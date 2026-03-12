import { describe, it, expect } from "vitest";
import { ShapeType } from "../../src/shape/ShapeType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("ShapeType", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new ShapeType()).toThrow("Cannot instantiate");
  });

  it("should return CIRCLE singleton", () => {
    const a = ShapeType.CIRCLE;
    const b = ShapeType.CIRCLE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ShapeType);
  });

  it("should return POLYGON singleton", () => {
    const a = ShapeType.POLYGON;
    const b = ShapeType.POLYGON;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ShapeType);
  });

  it("should return distinct instances for each type", () => {
    expect(ShapeType.CIRCLE).not.toBe(ShapeType.POLYGON);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.ShapeType_CIRCLE).toBe(ShapeType.CIRCLE);
    expect(ZPP_Flags.ShapeType_POLYGON).toBe(ShapeType.POLYGON);
  });

  it("CIRCLE toString should return 'CIRCLE'", () => {
    expect(ShapeType.CIRCLE.toString()).toBe("CIRCLE");
  });

  it("POLYGON toString should return 'POLYGON'", () => {
    expect(ShapeType.POLYGON.toString()).toBe("POLYGON");
  });
});
