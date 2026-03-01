import { describe, it, expect } from "vitest";
import { ArbiterType } from "../../src/dynamics/ArbiterType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("ArbiterType", () => {
  it("should have correct __name__", () => {
    expect(ArbiterType.__name__).toEqual(["nape", "dynamics", "ArbiterType"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new ArbiterType()).toThrow("Cannot instantiate");
  });

  it("should return COLLISION singleton", () => {
    const a = ArbiterType.get_COLLISION();
    const b = ArbiterType.get_COLLISION();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ArbiterType);
  });

  it("should return SENSOR singleton", () => {
    const a = ArbiterType.get_SENSOR();
    const b = ArbiterType.get_SENSOR();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ArbiterType);
  });

  it("should return FLUID singleton", () => {
    const a = ArbiterType.get_FLUID();
    const b = ArbiterType.get_FLUID();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ArbiterType);
  });

  it("should return distinct instances for each type", () => {
    expect(ArbiterType.get_COLLISION()).not.toBe(ArbiterType.get_SENSOR());
    expect(ArbiterType.get_COLLISION()).not.toBe(ArbiterType.get_FLUID());
    expect(ArbiterType.get_SENSOR()).not.toBe(ArbiterType.get_FLUID());
  });

  it("should store singletons in ZPP_Flags", () => {
    const col = ArbiterType.get_COLLISION();
    expect(ZPP_Flags.ArbiterType_COLLISION).toBe(col);
  });

  it("COLLISION toString should return 'COLLISION'", () => {
    expect(ArbiterType.get_COLLISION().toString()).toBe("COLLISION");
  });

  it("SENSOR toString should return 'SENSOR'", () => {
    expect(ArbiterType.get_SENSOR().toString()).toBe("SENSOR");
  });

  it("FLUID toString should return 'FLUID'", () => {
    expect(ArbiterType.get_FLUID().toString()).toBe("FLUID");
  });

  it("should have __class__ set on prototype", () => {
    expect((ArbiterType.get_COLLISION() as any).__class__).toBe(ArbiterType);
  });
});
