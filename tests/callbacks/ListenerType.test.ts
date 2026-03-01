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
    const a = ListenerType.get_BODY();
    const b = ListenerType.get_BODY();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return CONSTRAINT singleton", () => {
    const a = ListenerType.get_CONSTRAINT();
    const b = ListenerType.get_CONSTRAINT();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return INTERACTION singleton", () => {
    const a = ListenerType.get_INTERACTION();
    const b = ListenerType.get_INTERACTION();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return PRE singleton", () => {
    const a = ListenerType.get_PRE();
    const b = ListenerType.get_PRE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ListenerType);
  });

  it("should return distinct instances for each type", () => {
    expect(ListenerType.get_BODY()).not.toBe(ListenerType.get_CONSTRAINT());
    expect(ListenerType.get_BODY()).not.toBe(ListenerType.get_INTERACTION());
    expect(ListenerType.get_BODY()).not.toBe(ListenerType.get_PRE());
    expect(ListenerType.get_CONSTRAINT()).not.toBe(ListenerType.get_INTERACTION());
    expect(ListenerType.get_CONSTRAINT()).not.toBe(ListenerType.get_PRE());
    expect(ListenerType.get_INTERACTION()).not.toBe(ListenerType.get_PRE());
  });

  it("should store singletons in ZPP_Flags", () => {
    const body = ListenerType.get_BODY();
    expect(ZPP_Flags.ListenerType_BODY).toBe(body);
  });

  it("BODY toString should return 'BODY'", () => {
    expect(ListenerType.get_BODY().toString()).toBe("BODY");
  });

  it("CONSTRAINT toString should return 'CONSTRAINT'", () => {
    expect(ListenerType.get_CONSTRAINT().toString()).toBe("CONSTRAINT");
  });

  it("INTERACTION toString should return 'INTERACTION'", () => {
    expect(ListenerType.get_INTERACTION().toString()).toBe("INTERACTION");
  });

  it("PRE toString should return 'PRE'", () => {
    expect(ListenerType.get_PRE().toString()).toBe("PRE");
  });

  it("should have __class__ set on prototype", () => {
    expect((ListenerType.get_BODY() as any).__class__).toBe(ListenerType);
  });
});
