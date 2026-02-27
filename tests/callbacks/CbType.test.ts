import { describe, it, expect } from "vitest";
import { CbType } from "../../src/callbacks/CbType";

describe("CbType", () => {
  it("should construct a new CbType instance", () => {
    const ct = new CbType();
    expect(ct).toBeInstanceOf(CbType);
    expect(ct._inner).toBeDefined();
  });

  it("should provide static ANY_BODY singleton", () => {
    const anyBody = CbType.ANY_BODY;
    expect(anyBody).toBeInstanceOf(CbType);
    expect(anyBody._inner).toBeDefined();
    // Subsequent access should return the same wrapped object
    const anyBody2 = CbType.ANY_BODY;
    expect(anyBody._inner).toBe(anyBody2._inner);
  });

  it("should provide static ANY_SHAPE singleton", () => {
    const anyShape = CbType.ANY_SHAPE;
    expect(anyShape).toBeInstanceOf(CbType);
    expect(anyShape._inner).toBeDefined();
  });

  it("should provide static ANY_CONSTRAINT and ANY_COMPOUND singletons", () => {
    const anyConstraint = CbType.ANY_CONSTRAINT;
    expect(anyConstraint).toBeInstanceOf(CbType);
    expect(anyConstraint._inner).toBeDefined();

    const anyCompound = CbType.ANY_COMPOUND;
    expect(anyCompound).toBeInstanceOf(CbType);
    expect(anyCompound._inner).toBeDefined();
  });
});
