import { describe, it, expect } from "vitest";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("PreFlag", () => {
  it("should have correct __name__", () => {
    expect(PreFlag.__name__).toEqual(["nape", "callbacks", "PreFlag"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new PreFlag()).toThrow("Cannot instantiate");
  });

  it("should return ACCEPT singleton", () => {
    const a = PreFlag.get_ACCEPT();
    const b = PreFlag.get_ACCEPT();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return IGNORE singleton", () => {
    const a = PreFlag.get_IGNORE();
    const b = PreFlag.get_IGNORE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return ACCEPT_ONCE singleton", () => {
    const a = PreFlag.get_ACCEPT_ONCE();
    const b = PreFlag.get_ACCEPT_ONCE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return IGNORE_ONCE singleton", () => {
    const a = PreFlag.get_IGNORE_ONCE();
    const b = PreFlag.get_IGNORE_ONCE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return distinct instances for each type", () => {
    expect(PreFlag.get_ACCEPT()).not.toBe(PreFlag.get_IGNORE());
    expect(PreFlag.get_ACCEPT()).not.toBe(PreFlag.get_ACCEPT_ONCE());
    expect(PreFlag.get_ACCEPT()).not.toBe(PreFlag.get_IGNORE_ONCE());
    expect(PreFlag.get_IGNORE()).not.toBe(PreFlag.get_ACCEPT_ONCE());
    expect(PreFlag.get_IGNORE()).not.toBe(PreFlag.get_IGNORE_ONCE());
    expect(PreFlag.get_ACCEPT_ONCE()).not.toBe(PreFlag.get_IGNORE_ONCE());
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.PreFlag_ACCEPT).toBe(PreFlag.get_ACCEPT());
  });

  it("ACCEPT toString should return 'ACCEPT'", () => {
    expect(PreFlag.get_ACCEPT().toString()).toBe("ACCEPT");
  });

  it("IGNORE toString should return 'IGNORE'", () => {
    expect(PreFlag.get_IGNORE().toString()).toBe("IGNORE");
  });

  it("ACCEPT_ONCE toString should return 'ACCEPT_ONCE'", () => {
    expect(PreFlag.get_ACCEPT_ONCE().toString()).toBe("ACCEPT_ONCE");
  });

  it("IGNORE_ONCE toString should return 'IGNORE_ONCE'", () => {
    expect(PreFlag.get_IGNORE_ONCE().toString()).toBe("IGNORE_ONCE");
  });

  it("static getters should work (PreFlag.ACCEPT etc.)", () => {
    expect(PreFlag.ACCEPT).toBe(PreFlag.get_ACCEPT());
    expect(PreFlag.IGNORE).toBe(PreFlag.get_IGNORE());
    expect(PreFlag.ACCEPT_ONCE).toBe(PreFlag.get_ACCEPT_ONCE());
    expect(PreFlag.IGNORE_ONCE).toBe(PreFlag.get_IGNORE_ONCE());
  });

  it("should have __class__ set on prototype", () => {
    expect((PreFlag.get_ACCEPT() as any).__class__).toBe(PreFlag);
  });
});
