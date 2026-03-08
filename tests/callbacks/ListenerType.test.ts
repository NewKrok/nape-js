import { describe, it, expect } from "vitest";
import { ListenerType } from "../../src/callbacks/ListenerType";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("ListenerType", () => {
  it("should have correct __name__", () => {
    expect(ListenerType.__name__).toEqual(["nape", "callbacks", "ListenerType"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new ListenerType()).toThrow("Cannot instantiate");
  });

  it("should return BODY singleton", () => {
    const a = ListenerType.BODY;
    const b = ListenerType.BODY;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return CONSTRAINT singleton", () => {
    const a = ListenerType.CONSTRAINT;
    const b = ListenerType.CONSTRAINT;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return INTERACTION singleton", () => {
    const a = ListenerType.INTERACTION;
    const b = ListenerType.INTERACTION;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return PRE singleton", () => {
    const a = ListenerType.PRE;
    const b = ListenerType.PRE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return distinct instances for each type", () => {
    expect(ListenerType.BODY).not.toBe(ListenerType.CONSTRAINT);
    expect(ListenerType.BODY).not.toBe(ListenerType.INTERACTION);
    expect(ListenerType.BODY).not.toBe(ListenerType.PRE);
    expect(ListenerType.CONSTRAINT).not.toBe(ListenerType.INTERACTION);
    expect(ListenerType.CONSTRAINT).not.toBe(ListenerType.PRE);
    expect(ListenerType.INTERACTION).not.toBe(ListenerType.PRE);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.ListenerType_BODY).toBe(ListenerType.BODY);
  });

  it("BODY toString should return 'BODY'", () => {
    expect(ListenerType.BODY.toString()).toBe("BODY");
  });

  it("CONSTRAINT toString should return 'CONSTRAINT'", () => {
    expect(ListenerType.CONSTRAINT.toString()).toBe("CONSTRAINT");
  });

  it("INTERACTION toString should return 'INTERACTION'", () => {
    expect(ListenerType.INTERACTION.toString()).toBe("INTERACTION");
  });

  it("PRE toString should return 'PRE'", () => {
    expect(ListenerType.PRE.toString()).toBe("PRE");
  });
});
