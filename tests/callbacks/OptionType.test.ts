import { describe, it, expect } from "vitest";
import { OptionType } from "../../src/callbacks/OptionType";
import { CbType } from "../../src/callbacks/CbType";
import { ZPP_OptionType } from "../../src/native/callbacks/ZPP_OptionType";
import { getNape } from "../../src/core/engine";

describe("OptionType", () => {
  // --- Construction ---

  it("should construct with no arguments", () => {
    const ot = new OptionType();
    expect(ot).toBeInstanceOf(OptionType);
    expect(ot.zpp_inner).toBeInstanceOf(ZPP_OptionType);
  });

  it("should have _inner return this", () => {
    const ot = new OptionType();
    expect(ot._inner).toBe(ot);
  });

  it("should link zpp_inner.outer back to the instance", () => {
    const ot = new OptionType();
    expect(ot.zpp_inner.outer).toBe(ot);
  });

  it("should construct with a CbType includes argument", () => {
    const ct = new CbType();
    const ot = new OptionType(ct);
    expect(ot).toBeInstanceOf(OptionType);
    // The CbType should be in the includes
    const incList = ot.zpp_inner.includes;
    expect(incList.has(ct.zpp_inner)).toBe(true);
  });

  it("should construct with both includes and excludes arguments", () => {
    const inc = new CbType();
    const exc = new CbType();
    const ot = new OptionType(inc, exc);
    expect(ot.zpp_inner.includes.has(inc.zpp_inner)).toBe(true);
    expect(ot.zpp_inner.excludes.has(exc.zpp_inner)).toBe(true);
  });

  // --- includes / excludes getters ---

  it("should return includes list", () => {
    const ot = new OptionType();
    const inc = ot.includes;
    expect(inc).toBeDefined();
  });

  it("should return the same includes list on repeated access", () => {
    const ot = new OptionType();
    expect(ot.includes).toBe(ot.includes);
  });

  it("should return excludes list", () => {
    const ot = new OptionType();
    const exc = ot.excludes;
    expect(exc).toBeDefined();
  });

  it("should return the same excludes list on repeated access", () => {
    const ot = new OptionType();
    expect(ot.excludes).toBe(ot.excludes);
  });

  // --- get_includes / get_excludes (compiled code compat) ---

  it("should have get_includes matching includes getter", () => {
    const ot = new OptionType();
    expect(ot.get_includes()).toBe(ot.includes);
  });

  it("should have get_excludes matching excludes getter", () => {
    const ot = new OptionType();
    expect(ot.get_excludes()).toBe(ot.excludes);
  });

  // --- including ---

  it("should include a CbType", () => {
    const ot = new OptionType();
    const ct = new CbType();
    const result = ot.including(ct);
    expect(result).toBe(ot); // returns this
    expect(ot.zpp_inner.includes.has(ct.zpp_inner)).toBe(true);
  });

  it("should chain multiple including calls", () => {
    const a = new CbType();
    const b = new CbType();
    const ot = new OptionType().including(a).including(b);
    expect(ot.zpp_inner.includes.has(a.zpp_inner)).toBe(true);
    expect(ot.zpp_inner.includes.has(b.zpp_inner)).toBe(true);
  });

  it("should include an array of CbTypes", () => {
    const a = new CbType();
    const b = new CbType();
    const ot = new OptionType().including([a, b]);
    expect(ot.zpp_inner.includes.has(a.zpp_inner)).toBe(true);
    expect(ot.zpp_inner.includes.has(b.zpp_inner)).toBe(true);
  });

  // --- excluding ---

  it("should exclude a CbType", () => {
    const ot = new OptionType();
    const ct = new CbType();
    const result = ot.excluding(ct);
    expect(result).toBe(ot); // returns this
    expect(ot.zpp_inner.excludes.has(ct.zpp_inner)).toBe(true);
  });

  it("should chain including and excluding", () => {
    const inc = new CbType();
    const exc = new CbType();
    const ot = new OptionType().including(inc).excluding(exc);
    expect(ot.zpp_inner.includes.has(inc.zpp_inner)).toBe(true);
    expect(ot.zpp_inner.excludes.has(exc.zpp_inner)).toBe(true);
  });

  it("should remove from includes when excluding an included type", () => {
    const ct = new CbType();
    const ot = new OptionType().including(ct).excluding(ct);
    // append_type removes from includes but doesn't add to excludes in the same call
    expect(ot.zpp_inner.includes.has(ct.zpp_inner)).toBe(false);
  });

  it("should remove from excludes when including an excluded type", () => {
    const ct = new CbType();
    const ot = new OptionType().excluding(ct).including(ct);
    // append_type removes from excludes but doesn't add to includes in the same call
    expect(ot.zpp_inner.excludes.has(ct.zpp_inner)).toBe(false);
  });

  // --- toString ---

  it("should produce string representation", () => {
    const ot = new OptionType();
    const s = ot.toString();
    expect(s).toContain("@{");
    expect(s).toContain("excluding");
    expect(s).toContain("}");
  });

  // --- _wrap ---

  it("should wrap an OptionType instance (identity)", () => {
    const ot = new OptionType();
    expect(OptionType._wrap(ot)).toBe(ot);
  });

  it("should wrap a ZPP_OptionType inner", () => {
    const ot = new OptionType();
    const wrapped = OptionType._wrap(ot.zpp_inner);
    expect(wrapped).toBeInstanceOf(OptionType);
    expect(wrapped.zpp_inner).toBe(ot.zpp_inner);
  });

  it("should wrap an object with zpp_inner", () => {
    const ot = new OptionType();
    const obj = { zpp_inner: ot.zpp_inner };
    const wrapped = OptionType._wrap(obj);
    expect(wrapped).toBeInstanceOf(OptionType);
    expect(wrapped.zpp_inner).toBe(ot.zpp_inner);
  });

  it("should return null for falsy values", () => {
    expect(OptionType._wrap(null)).toBeNull();
    expect(OptionType._wrap(undefined)).toBeNull();
    expect(OptionType._wrap(0)).toBeNull();
  });

  // --- __name__ ---

  it("should have correct __name__ metadata", () => {
    expect(OptionType.__name__).toEqual(["nape", "callbacks", "OptionType"]);
  });

  // --- Namespace registration ---

  it("should be registered in the nape namespace", () => {
    const nape = getNape();
    expect(nape.callbacks.OptionType).toBe(OptionType);
  });

  // --- Integration with CbType.including/excluding ---

  it("should work with CbType.including", () => {
    const ct = new CbType();
    const ct2 = new CbType();
    const ot = ct.including(ct2);
    expect(ot).toBeDefined();
    expect(ot.toString()).toContain("@{");
  });

  it("should work with CbType.excluding", () => {
    const ct = new CbType();
    const ct2 = new CbType();
    const ot = ct.excluding(ct2);
    expect(ot).toBeDefined();
    expect(ot.toString()).toContain("@{");
  });

  // --- Error handling ---

  it("should throw when including null", () => {
    const ot = new OptionType();
    expect(() => ot.including(null)).toThrow(/null/);
  });

  it("should throw when excluding null", () => {
    const ot = new OptionType();
    expect(() => ot.excluding(null)).toThrow(/null/);
  });

  it("should throw when including invalid type", () => {
    const ot = new OptionType();
    expect(() => ot.including(42)).toThrow(/non-CbType/i);
  });
});
