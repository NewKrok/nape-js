import { describe, it, expect } from "vitest";
import { GravMassMode } from "../../src/phys/GravMassMode";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("GravMassMode", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new GravMassMode()).toThrow("Cannot instantiate");
  });

  it("should return DEFAULT singleton", () => {
    const a = GravMassMode.DEFAULT;
    const b = GravMassMode.DEFAULT;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(GravMassMode);
  });

  it("should return FIXED singleton", () => {
    const a = GravMassMode.FIXED;
    const b = GravMassMode.FIXED;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(GravMassMode);
  });

  it("should return SCALED singleton", () => {
    const a = GravMassMode.SCALED;
    const b = GravMassMode.SCALED;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(GravMassMode);
  });

  it("should return distinct instances for each mode", () => {
    expect(GravMassMode.DEFAULT).not.toBe(GravMassMode.FIXED);
    expect(GravMassMode.DEFAULT).not.toBe(GravMassMode.SCALED);
    expect(GravMassMode.FIXED).not.toBe(GravMassMode.SCALED);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.GravMassMode_DEFAULT).toBe(GravMassMode.DEFAULT);
  });

  it("DEFAULT toString should return 'DEFAULT'", () => {
    expect(GravMassMode.DEFAULT.toString()).toBe("DEFAULT");
  });

  it("FIXED toString should return 'FIXED'", () => {
    expect(GravMassMode.FIXED.toString()).toBe("FIXED");
  });

  it("SCALED toString should return 'SCALED'", () => {
    expect(GravMassMode.SCALED.toString()).toBe("SCALED");
  });
});
