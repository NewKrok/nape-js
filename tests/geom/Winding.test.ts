import { describe, it, expect } from "vitest";
import { Winding } from "../../src/geom/Winding";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("Winding", () => {
  it("should have correct __name__", () => {
    expect(Winding.__name__).toEqual(["nape", "geom", "Winding"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new Winding()).toThrow("Cannot instantiate");
  });

  it("should return UNDEFINED singleton", () => {
    const a = Winding.UNDEFINED;
    const b = Winding.UNDEFINED;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Winding);
  });

  it("should return CLOCKWISE singleton", () => {
    const a = Winding.CLOCKWISE;
    const b = Winding.CLOCKWISE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Winding);
  });

  it("should return ANTICLOCKWISE singleton", () => {
    const a = Winding.ANTICLOCKWISE;
    const b = Winding.ANTICLOCKWISE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Winding);
  });

  it("should return distinct instances for each value", () => {
    expect(Winding.UNDEFINED).not.toBe(Winding.CLOCKWISE);
    expect(Winding.UNDEFINED).not.toBe(Winding.ANTICLOCKWISE);
    expect(Winding.CLOCKWISE).not.toBe(Winding.ANTICLOCKWISE);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.Winding_UNDEFINED).toBe(Winding.UNDEFINED);
  });

  it("UNDEFINED toString should return 'UNDEFINED'", () => {
    expect(Winding.UNDEFINED.toString()).toBe("UNDEFINED");
  });

  it("CLOCKWISE toString should return 'CLOCKWISE'", () => {
    expect(Winding.CLOCKWISE.toString()).toBe("CLOCKWISE");
  });

  it("ANTICLOCKWISE toString should return 'ANTICLOCKWISE'", () => {
    expect(Winding.ANTICLOCKWISE.toString()).toBe("ANTICLOCKWISE");
  });
});
