import { describe, it, expect } from "vitest";
import { GravMassMode } from "../../src/phys/GravMassMode";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("GravMassMode", () => {
  it("should have correct __name__", () => {
    expect(GravMassMode.__name__).toEqual(["nape", "phys", "GravMassMode"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new GravMassMode()).toThrow("Cannot instantiate");
  });

  it("should return DEFAULT singleton", () => {
    const a = GravMassMode.get_DEFAULT();
    const b = GravMassMode.get_DEFAULT();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(GravMassMode);
  });

  it("should return FIXED singleton", () => {
    const a = GravMassMode.get_FIXED();
    const b = GravMassMode.get_FIXED();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(GravMassMode);
  });

  it("should return SCALED singleton", () => {
    const a = GravMassMode.get_SCALED();
    const b = GravMassMode.get_SCALED();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(GravMassMode);
  });

  it("should return distinct instances for each mode", () => {
    expect(GravMassMode.get_DEFAULT()).not.toBe(GravMassMode.get_FIXED());
    expect(GravMassMode.get_DEFAULT()).not.toBe(GravMassMode.get_SCALED());
    expect(GravMassMode.get_FIXED()).not.toBe(GravMassMode.get_SCALED());
  });

  it("should store singletons in ZPP_Flags", () => {
    const def = GravMassMode.get_DEFAULT();
    expect(ZPP_Flags.GravMassMode_DEFAULT).toBe(def);
  });

  it("DEFAULT toString should return 'DEFAULT'", () => {
    expect(GravMassMode.get_DEFAULT().toString()).toBe("DEFAULT");
  });

  it("FIXED toString should return 'FIXED'", () => {
    expect(GravMassMode.get_FIXED().toString()).toBe("FIXED");
  });

  it("SCALED toString should return 'SCALED'", () => {
    expect(GravMassMode.get_SCALED().toString()).toBe("SCALED");
  });

  it("should have __class__ set on prototype", () => {
    expect((GravMassMode.get_DEFAULT() as any).__class__).toBe(GravMassMode);
  });
});
