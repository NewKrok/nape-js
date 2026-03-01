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
    const a = InteractionType.get_COLLISION();
    const b = InteractionType.get_COLLISION();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return SENSOR singleton", () => {
    const a = InteractionType.get_SENSOR();
    const b = InteractionType.get_SENSOR();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return FLUID singleton", () => {
    const a = InteractionType.get_FLUID();
    const b = InteractionType.get_FLUID();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return ANY singleton", () => {
    const a = InteractionType.get_ANY();
    const b = InteractionType.get_ANY();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(InteractionType);
  });

  it("should return distinct instances for each type", () => {
    expect(InteractionType.get_COLLISION()).not.toBe(InteractionType.get_SENSOR());
    expect(InteractionType.get_COLLISION()).not.toBe(InteractionType.get_FLUID());
    expect(InteractionType.get_COLLISION()).not.toBe(InteractionType.get_ANY());
    expect(InteractionType.get_SENSOR()).not.toBe(InteractionType.get_FLUID());
    expect(InteractionType.get_SENSOR()).not.toBe(InteractionType.get_ANY());
    expect(InteractionType.get_FLUID()).not.toBe(InteractionType.get_ANY());
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.InteractionType_COLLISION).toBe(InteractionType.get_COLLISION());
  });

  it("COLLISION toString should return 'COLLISION'", () => {
    expect(InteractionType.get_COLLISION().toString()).toBe("COLLISION");
  });

  it("SENSOR toString should return 'SENSOR'", () => {
    expect(InteractionType.get_SENSOR().toString()).toBe("SENSOR");
  });

  it("FLUID toString should return 'FLUID'", () => {
    expect(InteractionType.get_FLUID().toString()).toBe("FLUID");
  });

  it("ANY toString should return 'ANY'", () => {
    expect(InteractionType.get_ANY().toString()).toBe("ANY");
  });

  it("static getters should work (InteractionType.COLLISION etc.)", () => {
    expect(InteractionType.COLLISION).toBe(InteractionType.get_COLLISION());
    expect(InteractionType.SENSOR).toBe(InteractionType.get_SENSOR());
    expect(InteractionType.FLUID).toBe(InteractionType.get_FLUID());
    expect(InteractionType.ANY).toBe(InteractionType.get_ANY());
  });

  it("should have __class__ set on prototype", () => {
    expect((InteractionType.get_COLLISION() as any).__class__).toBe(InteractionType);
  });
});
