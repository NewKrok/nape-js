import { describe, it, expect } from "vitest";
import { MassMode } from "../../src/phys/MassMode";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("MassMode", () => {
  it("should have correct __name__", () => {
    expect(MassMode.__name__).toEqual(["nape", "phys", "MassMode"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new MassMode()).toThrow("Cannot instantiate");
  });

  it("should return DEFAULT singleton", () => {
    const a = MassMode.get_DEFAULT();
    const b = MassMode.get_DEFAULT();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(MassMode);
  });

  it("should return FIXED singleton", () => {
    const a = MassMode.get_FIXED();
    const b = MassMode.get_FIXED();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(MassMode);
  });

  it("should return distinct instances for each mode", () => {
    expect(MassMode.get_DEFAULT()).not.toBe(MassMode.get_FIXED());
  });

  it("should store singletons in ZPP_Flags", () => {
    const def = MassMode.get_DEFAULT();
    expect(ZPP_Flags.MassMode_DEFAULT).toBe(def);
  });

  it("DEFAULT toString should return 'DEFAULT'", () => {
    expect(MassMode.get_DEFAULT().toString()).toBe("DEFAULT");
  });

  it("FIXED toString should return 'FIXED'", () => {
    expect(MassMode.get_FIXED().toString()).toBe("FIXED");
  });

  it("should have __class__ set on prototype", () => {
    expect((MassMode.get_DEFAULT() as any).__class__).toBe(MassMode);
  });
});
