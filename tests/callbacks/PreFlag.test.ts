import { describe, it, expect } from "vitest";
import { PreFlag } from "../../src/callbacks/PreFlag";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("PreFlag", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new PreFlag()).toThrow("Cannot instantiate");
  });

  it("should return ACCEPT singleton", () => {
    const a = PreFlag.ACCEPT;
    const b = PreFlag.ACCEPT;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return IGNORE singleton", () => {
    const a = PreFlag.IGNORE;
    const b = PreFlag.IGNORE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return ACCEPT_ONCE singleton", () => {
    const a = PreFlag.ACCEPT_ONCE;
    const b = PreFlag.ACCEPT_ONCE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return IGNORE_ONCE singleton", () => {
    const a = PreFlag.IGNORE_ONCE;
    const b = PreFlag.IGNORE_ONCE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(PreFlag);
  });

  it("should return distinct instances for each type", () => {
    expect(PreFlag.ACCEPT).not.toBe(PreFlag.IGNORE);
    expect(PreFlag.ACCEPT).not.toBe(PreFlag.ACCEPT_ONCE);
    expect(PreFlag.ACCEPT).not.toBe(PreFlag.IGNORE_ONCE);
    expect(PreFlag.IGNORE).not.toBe(PreFlag.ACCEPT_ONCE);
    expect(PreFlag.IGNORE).not.toBe(PreFlag.IGNORE_ONCE);
    expect(PreFlag.ACCEPT_ONCE).not.toBe(PreFlag.IGNORE_ONCE);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.PreFlag_ACCEPT).toBe(PreFlag.ACCEPT);
  });

  it("ACCEPT toString should return 'ACCEPT'", () => {
    expect(PreFlag.ACCEPT.toString()).toBe("ACCEPT");
  });

  it("IGNORE toString should return 'IGNORE'", () => {
    expect(PreFlag.IGNORE.toString()).toBe("IGNORE");
  });

  it("ACCEPT_ONCE toString should return 'ACCEPT_ONCE'", () => {
    expect(PreFlag.ACCEPT_ONCE.toString()).toBe("ACCEPT_ONCE");
  });

  it("IGNORE_ONCE toString should return 'IGNORE_ONCE'", () => {
    expect(PreFlag.IGNORE_ONCE.toString()).toBe("IGNORE_ONCE");
  });
});
