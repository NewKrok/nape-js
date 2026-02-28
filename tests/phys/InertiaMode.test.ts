import { describe, it, expect } from "vitest";
import { InertiaMode } from "../../src/phys/InertiaMode";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("InertiaMode", () => {
  it("should have correct __name__", () => {
    expect(InertiaMode.__name__).toEqual(["nape", "phys", "InertiaMode"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new InertiaMode()).toThrow("Cannot instantiate");
  });

  it("should return DEFAULT singleton", () => {
    const a = InertiaMode.get_DEFAULT();
    const b = InertiaMode.get_DEFAULT();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InertiaMode);
  });

  it("should return FIXED singleton", () => {
    const a = InertiaMode.get_FIXED();
    const b = InertiaMode.get_FIXED();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InertiaMode);
  });

  it("should return distinct instances for each mode", () => {
    expect(InertiaMode.get_DEFAULT()).not.toBe(InertiaMode.get_FIXED());
  });

  it("should store singletons in ZPP_Flags", () => {
    const def = InertiaMode.get_DEFAULT();
    expect(ZPP_Flags.InertiaMode_DEFAULT).toBe(def);
  });

  it("DEFAULT toString should return 'DEFAULT'", () => {
    expect(InertiaMode.get_DEFAULT().toString()).toBe("DEFAULT");
  });

  it("FIXED toString should return 'FIXED'", () => {
    expect(InertiaMode.get_FIXED().toString()).toBe("FIXED");
  });

  it("should have __class__ set on prototype", () => {
    expect((InertiaMode.get_DEFAULT() as any).__class__).toBe(InertiaMode);
  });
});
