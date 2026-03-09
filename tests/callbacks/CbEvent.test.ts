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
    const a = CbEvent.BEGIN;
    const b = CbEvent.BEGIN;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return ONGOING singleton", () => {
    const a = CbEvent.ONGOING;
    const b = CbEvent.ONGOING;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return END singleton", () => {
    const a = CbEvent.END;
    const b = CbEvent.END;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return WAKE singleton", () => {
    const a = CbEvent.WAKE;
    const b = CbEvent.WAKE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return SLEEP singleton", () => {
    const a = CbEvent.SLEEP;
    const b = CbEvent.SLEEP;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return BREAK singleton", () => {
    const a = CbEvent.BREAK;
    const b = CbEvent.BREAK;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return PRE singleton", () => {
    const a = CbEvent.PRE;
    const b = CbEvent.PRE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(CbEvent);
  });

  it("should return distinct instances for each type", () => {
    const all = [
      CbEvent.BEGIN,
      CbEvent.ONGOING,
      CbEvent.END,
      CbEvent.WAKE,
      CbEvent.SLEEP,
      CbEvent.BREAK,
      CbEvent.PRE,
    ];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(all[i]).not.toBe(all[j]);
      }
    }
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.CbEvent_BEGIN).toBe(CbEvent.BEGIN);
    expect(ZPP_Flags.CbEvent_ONGOING).toBe(CbEvent.ONGOING);
    expect(ZPP_Flags.CbEvent_END).toBe(CbEvent.END);
  });

  it("BEGIN toString should return 'BEGIN'", () => {
    expect(CbEvent.BEGIN.toString()).toBe("BEGIN");
  });

  it("ONGOING toString should return 'ONGOING'", () => {
    expect(CbEvent.ONGOING.toString()).toBe("ONGOING");
  });

  it("END toString should return 'END'", () => {
    expect(CbEvent.END.toString()).toBe("END");
  });

  it("WAKE toString should return 'WAKE'", () => {
    expect(CbEvent.WAKE.toString()).toBe("WAKE");
  });

  it("SLEEP toString should return 'SLEEP'", () => {
    expect(CbEvent.SLEEP.toString()).toBe("SLEEP");
  });

  it("BREAK toString should return 'BREAK'", () => {
    expect(CbEvent.BREAK.toString()).toBe("BREAK");
  });

  it("PRE toString should return 'PRE'", () => {
    expect(CbEvent.PRE.toString()).toBe("PRE");
  });
});
