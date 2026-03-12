import { describe, it, expect } from "vitest";
import { MassMode } from "../../src/phys/MassMode";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("MassMode", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new MassMode()).toThrow("Cannot instantiate");
  });

  it("should return DEFAULT singleton", () => {
    const a = MassMode.DEFAULT;
    const b = MassMode.DEFAULT;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(MassMode);
  });

  it("should return FIXED singleton", () => {
    const a = MassMode.FIXED;
    const b = MassMode.FIXED;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(MassMode);
  });

  it("should return distinct instances for each mode", () => {
    expect(MassMode.DEFAULT).not.toBe(MassMode.FIXED);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.MassMode_DEFAULT).toBe(MassMode.DEFAULT);
  });

  it("DEFAULT toString should return 'DEFAULT'", () => {
    expect(MassMode.DEFAULT.toString()).toBe("DEFAULT");
  });

  it("FIXED toString should return 'FIXED'", () => {
    expect(MassMode.FIXED.toString()).toBe("FIXED");
  });
});
