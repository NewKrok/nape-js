import { describe, it, expect } from "vitest";
import { ArbiterType } from "../../src/dynamics/ArbiterType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("ArbiterType", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new ArbiterType()).toThrow("Cannot instantiate");
  });

  it("should return COLLISION singleton", () => {
    const a = ArbiterType.COLLISION;
    const b = ArbiterType.COLLISION;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ArbiterType);
  });

  it("should return SENSOR singleton", () => {
    const a = ArbiterType.SENSOR;
    const b = ArbiterType.SENSOR;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ArbiterType);
  });

  it("should return FLUID singleton", () => {
    const a = ArbiterType.FLUID;
    const b = ArbiterType.FLUID;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ArbiterType);
  });

  it("should return distinct instances for each type", () => {
    expect(ArbiterType.COLLISION).not.toBe(ArbiterType.SENSOR);
    expect(ArbiterType.COLLISION).not.toBe(ArbiterType.FLUID);
    expect(ArbiterType.SENSOR).not.toBe(ArbiterType.FLUID);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.ArbiterType_COLLISION).toBe(ArbiterType.COLLISION);
  });

  it("COLLISION toString should return 'COLLISION'", () => {
    expect(ArbiterType.COLLISION.toString()).toBe("COLLISION");
  });

  it("SENSOR toString should return 'SENSOR'", () => {
    expect(ArbiterType.SENSOR.toString()).toBe("SENSOR");
  });

  it("FLUID toString should return 'FLUID'", () => {
    expect(ArbiterType.FLUID.toString()).toBe("FLUID");
  });
});
