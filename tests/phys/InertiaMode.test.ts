import { describe, it, expect } from "vitest";
import { InertiaMode } from "../../src/phys/InertiaMode";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("InertiaMode", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new InertiaMode()).toThrow("Cannot instantiate");
  });

  it("should return DEFAULT singleton", () => {
    const a = InertiaMode.DEFAULT;
    const b = InertiaMode.DEFAULT;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InertiaMode);
  });

  it("should return FIXED singleton", () => {
    const a = InertiaMode.FIXED;
    const b = InertiaMode.FIXED;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InertiaMode);
  });

  it("should return distinct instances for each mode", () => {
    expect(InertiaMode.DEFAULT).not.toBe(InertiaMode.FIXED);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.InertiaMode_DEFAULT).toBe(InertiaMode.DEFAULT);
  });

  it("DEFAULT toString should return 'DEFAULT'", () => {
    expect(InertiaMode.DEFAULT.toString()).toBe("DEFAULT");
  });

  it("FIXED toString should return 'FIXED'", () => {
    expect(InertiaMode.FIXED.toString()).toBe("FIXED");
  });
});
