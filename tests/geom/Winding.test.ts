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
    const a = Winding.get_UNDEFINED();
    const b = Winding.get_UNDEFINED();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Winding);
  });

  it("should return CLOCKWISE singleton", () => {
    const a = Winding.get_CLOCKWISE();
    const b = Winding.get_CLOCKWISE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Winding);
  });

  it("should return ANTICLOCKWISE singleton", () => {
    const a = Winding.get_ANTICLOCKWISE();
    const b = Winding.get_ANTICLOCKWISE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(Winding);
  });

  it("should return distinct instances for each value", () => {
    expect(Winding.get_UNDEFINED()).not.toBe(Winding.get_CLOCKWISE());
    expect(Winding.get_UNDEFINED()).not.toBe(Winding.get_ANTICLOCKWISE());
    expect(Winding.get_CLOCKWISE()).not.toBe(Winding.get_ANTICLOCKWISE());
  });

  it("should store singletons in ZPP_Flags", () => {
    const undef = Winding.get_UNDEFINED();
    expect(ZPP_Flags.Winding_UNDEFINED).toBe(undef);
  });

  it("UNDEFINED toString should return 'UNDEFINED'", () => {
    expect(Winding.get_UNDEFINED().toString()).toBe("UNDEFINED");
  });

  it("CLOCKWISE toString should return 'CLOCKWISE'", () => {
    expect(Winding.get_CLOCKWISE().toString()).toBe("CLOCKWISE");
  });

  it("ANTICLOCKWISE toString should return 'ANTICLOCKWISE'", () => {
    expect(Winding.get_ANTICLOCKWISE().toString()).toBe("ANTICLOCKWISE");
  });

  it("should have __class__ set on prototype", () => {
    expect((Winding.get_CLOCKWISE() as any).__class__).toBe(Winding);
  });
});
