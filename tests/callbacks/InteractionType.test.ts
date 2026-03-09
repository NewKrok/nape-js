import { describe, it, expect } from "vitest";
import { InteractionType } from "../../src/callbacks/InteractionType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("InteractionType", () => {
  it("should have correct __name__", () => {
    expect(InteractionType.__name__).toEqual(["nape", "callbacks", "InteractionType"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new InteractionType()).toThrow("Cannot instantiate");
  });

  it("should return COLLISION singleton", () => {
    const a = InteractionType.COLLISION;
    const b = InteractionType.COLLISION;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return SENSOR singleton", () => {
    const a = InteractionType.SENSOR;
    const b = InteractionType.SENSOR;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return FLUID singleton", () => {
    const a = InteractionType.FLUID;
    const b = InteractionType.FLUID;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return ANY singleton", () => {
    const a = InteractionType.ANY;
    const b = InteractionType.ANY;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return distinct instances for each type", () => {
    expect(InteractionType.COLLISION).not.toBe(InteractionType.SENSOR);
    expect(InteractionType.COLLISION).not.toBe(InteractionType.FLUID);
    expect(InteractionType.COLLISION).not.toBe(InteractionType.ANY);
    expect(InteractionType.SENSOR).not.toBe(InteractionType.FLUID);
    expect(InteractionType.SENSOR).not.toBe(InteractionType.ANY);
    expect(InteractionType.FLUID).not.toBe(InteractionType.ANY);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.InteractionType_COLLISION).toBe(InteractionType.COLLISION);
  });

  it("COLLISION toString should return 'COLLISION'", () => {
    expect(InteractionType.COLLISION.toString()).toBe("COLLISION");
  });

  it("SENSOR toString should return 'SENSOR'", () => {
    expect(InteractionType.SENSOR.toString()).toBe("SENSOR");
  });

  it("FLUID toString should return 'FLUID'", () => {
    expect(InteractionType.FLUID.toString()).toBe("FLUID");
  });

  it("ANY toString should return 'ANY'", () => {
    expect(InteractionType.ANY.toString()).toBe("ANY");
  });
});
