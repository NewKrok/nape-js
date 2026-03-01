import { describe, it, expect } from "vitest";
import { CbEvent } from "../../src/callbacks/CbEvent";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("CbEvent", () => {
  it("should have correct __name__", () => {
    expect(CbEvent.__name__).toEqual(["nape", "callbacks", "CbEvent"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new CbEvent()).toThrow("Cannot instantiate");
  });

  it("should return BEGIN singleton", () => {
    const a = CbEvent.get_BEGIN();
    const b = CbEvent.get_BEGIN();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return ONGOING singleton", () => {
    const a = CbEvent.get_ONGOING();
    const b = CbEvent.get_ONGOING();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return END singleton", () => {
    const a = CbEvent.get_END();
    const b = CbEvent.get_END();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return WAKE singleton", () => {
    const a = CbEvent.get_WAKE();
    const b = CbEvent.get_WAKE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return SLEEP singleton", () => {
    const a = CbEvent.get_SLEEP();
    const b = CbEvent.get_SLEEP();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return BREAK singleton", () => {
    const a = CbEvent.get_BREAK();
    const b = CbEvent.get_BREAK();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return PRE singleton", () => {
    const a = CbEvent.get_PRE();
    const b = CbEvent.get_PRE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return distinct instances for each type", () => {
    const all = [
      CbEvent.get_BEGIN(),
      CbEvent.get_ONGOING(),
      CbEvent.get_END(),
      CbEvent.get_WAKE(),
      CbEvent.get_SLEEP(),
      CbEvent.get_BREAK(),
      CbEvent.get_PRE(),
    ];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(all[i]).not.toBe(all[j]);
      }
    }
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.CbEvent_BEGIN).toBe(CbEvent.get_BEGIN());
    expect(ZPP_Flags.CbEvent_ONGOING).toBe(CbEvent.get_ONGOING());
    expect(ZPP_Flags.CbEvent_END).toBe(CbEvent.get_END());
  });

  it("BEGIN toString should return 'BEGIN'", () => {
    expect(CbEvent.get_BEGIN().toString()).toBe("BEGIN");
  });

  it("ONGOING toString should return 'ONGOING'", () => {
    expect(CbEvent.get_ONGOING().toString()).toBe("ONGOING");
  });

  it("END toString should return 'END'", () => {
    expect(CbEvent.get_END().toString()).toBe("END");
  });

  it("WAKE toString should return 'WAKE'", () => {
    expect(CbEvent.get_WAKE().toString()).toBe("WAKE");
  });

  it("SLEEP toString should return 'SLEEP'", () => {
    expect(CbEvent.get_SLEEP().toString()).toBe("SLEEP");
  });

  it("BREAK toString should return 'BREAK'", () => {
    expect(CbEvent.get_BREAK().toString()).toBe("BREAK");
  });

  it("PRE toString should return 'PRE'", () => {
    expect(CbEvent.get_PRE().toString()).toBe("PRE");
  });

  it("static getters should work (CbEvent.BEGIN etc.)", () => {
    expect(CbEvent.BEGIN).toBe(CbEvent.get_BEGIN());
    expect(CbEvent.ONGOING).toBe(CbEvent.get_ONGOING());
    expect(CbEvent.END).toBe(CbEvent.get_END());
    expect(CbEvent.WAKE).toBe(CbEvent.get_WAKE());
    expect(CbEvent.SLEEP).toBe(CbEvent.get_SLEEP());
    expect(CbEvent.BREAK).toBe(CbEvent.get_BREAK());
    expect(CbEvent.PRE).toBe(CbEvent.get_PRE());
  });

  it("should have __class__ set on prototype", () => {
    expect((CbEvent.get_BEGIN() as any).__class__).toBe(CbEvent);
  });
});
