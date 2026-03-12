import { describe, it, expect } from "vitest";
import { BodyType } from "../../src/phys/BodyType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("BodyType", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new BodyType()).toThrow("Cannot instantiate");
  });

  it("should return STATIC singleton", () => {
    const a = BodyType.STATIC;
    const b = BodyType.STATIC;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(BodyType);
  });

  it("should return DYNAMIC singleton", () => {
    const a = BodyType.DYNAMIC;
    const b = BodyType.DYNAMIC;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(BodyType);
  });

  it("should return KINEMATIC singleton", () => {
    const a = BodyType.KINEMATIC;
    const b = BodyType.KINEMATIC;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(BodyType);
  });

  it("should return distinct instances for each type", () => {
    expect(BodyType.STATIC).not.toBe(BodyType.DYNAMIC);
    expect(BodyType.STATIC).not.toBe(BodyType.KINEMATIC);
    expect(BodyType.DYNAMIC).not.toBe(BodyType.KINEMATIC);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.BodyType_STATIC).toBe(BodyType.STATIC);
    expect(ZPP_Flags.BodyType_DYNAMIC).toBe(BodyType.DYNAMIC);
    expect(ZPP_Flags.BodyType_KINEMATIC).toBe(BodyType.KINEMATIC);
  });

  it("STATIC toString should return 'STATIC'", () => {
    expect(BodyType.STATIC.toString()).toBe("STATIC");
  });

  it("DYNAMIC toString should return 'DYNAMIC'", () => {
    expect(BodyType.DYNAMIC.toString()).toBe("DYNAMIC");
  });

  it("KINEMATIC toString should return 'KINEMATIC'", () => {
    expect(BodyType.KINEMATIC.toString()).toBe("KINEMATIC");
  });
});
