import { describe, it, expect } from "vitest";
import { BodyType } from "../../src/phys/BodyType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("BodyType", () => {
  it("should have correct __name__", () => {
    expect(BodyType.__name__).toEqual(["nape", "phys", "BodyType"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new BodyType()).toThrow("Cannot instantiate");
  });

  it("should return STATIC singleton", () => {
    const a = BodyType.get_STATIC();
    const b = BodyType.get_STATIC();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(BodyType);
  });

  it("should return DYNAMIC singleton", () => {
    const a = BodyType.get_DYNAMIC();
    const b = BodyType.get_DYNAMIC();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(BodyType);
  });

  it("should return KINEMATIC singleton", () => {
    const a = BodyType.get_KINEMATIC();
    const b = BodyType.get_KINEMATIC();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(BodyType);
  });

  it("should return distinct instances for each type", () => {
    expect(BodyType.get_STATIC()).not.toBe(BodyType.get_DYNAMIC());
    expect(BodyType.get_STATIC()).not.toBe(BodyType.get_KINEMATIC());
    expect(BodyType.get_DYNAMIC()).not.toBe(BodyType.get_KINEMATIC());
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.BodyType_STATIC).toBe(BodyType.get_STATIC());
    expect(ZPP_Flags.BodyType_DYNAMIC).toBe(BodyType.get_DYNAMIC());
    expect(ZPP_Flags.BodyType_KINEMATIC).toBe(BodyType.get_KINEMATIC());
  });

  it("STATIC toString should return 'STATIC'", () => {
    expect(BodyType.get_STATIC().toString()).toBe("STATIC");
  });

  it("DYNAMIC toString should return 'DYNAMIC'", () => {
    expect(BodyType.get_DYNAMIC().toString()).toBe("DYNAMIC");
  });

  it("KINEMATIC toString should return 'KINEMATIC'", () => {
    expect(BodyType.get_KINEMATIC().toString()).toBe("KINEMATIC");
  });

  it("static getters should work (BodyType.DYNAMIC etc.)", () => {
    expect(BodyType.STATIC).toBe(BodyType.get_STATIC());
    expect(BodyType.DYNAMIC).toBe(BodyType.get_DYNAMIC());
    expect(BodyType.KINEMATIC).toBe(BodyType.get_KINEMATIC());
  });

  it("should have __class__ set on prototype", () => {
    expect((BodyType.get_DYNAMIC() as any).__class__).toBe(BodyType);
  });
});
