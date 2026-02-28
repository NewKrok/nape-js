import { describe, it, expect } from "vitest";
import { ValidationResult } from "../../src/shape/ValidationResult";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("ValidationResult", () => {
  it("should have correct __name__", () => {
    expect(ValidationResult.__name__).toEqual(["nape", "shape", "ValidationResult"]);
  });

  it("should throw on direct instantiation", () => {
    expect(() => new ValidationResult()).toThrow("Cannot instantiate");
  });

  it("should return VALID singleton", () => {
    const a = ValidationResult.get_VALID();
    const b = ValidationResult.get_VALID();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return DEGENERATE singleton", () => {
    const a = ValidationResult.get_DEGENERATE();
    const b = ValidationResult.get_DEGENERATE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return CONCAVE singleton", () => {
    const a = ValidationResult.get_CONCAVE();
    const b = ValidationResult.get_CONCAVE();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return SELF_INTERSECTING singleton", () => {
    const a = ValidationResult.get_SELF_INTERSECTING();
    const b = ValidationResult.get_SELF_INTERSECTING();
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return distinct instances for each result", () => {
    expect(ValidationResult.get_VALID()).not.toBe(ValidationResult.get_DEGENERATE());
    expect(ValidationResult.get_VALID()).not.toBe(ValidationResult.get_CONCAVE());
    expect(ValidationResult.get_VALID()).not.toBe(ValidationResult.get_SELF_INTERSECTING());
    expect(ValidationResult.get_DEGENERATE()).not.toBe(ValidationResult.get_CONCAVE());
    expect(ValidationResult.get_DEGENERATE()).not.toBe(ValidationResult.get_SELF_INTERSECTING());
    expect(ValidationResult.get_CONCAVE()).not.toBe(ValidationResult.get_SELF_INTERSECTING());
  });

  it("should store singletons in ZPP_Flags", () => {
    const valid = ValidationResult.get_VALID();
    expect(ZPP_Flags.ValidationResult_VALID).toBe(valid);
  });

  it("VALID toString should return 'VALID'", () => {
    expect(ValidationResult.get_VALID().toString()).toBe("VALID");
  });

  it("DEGENERATE toString should return 'DEGENERATE'", () => {
    expect(ValidationResult.get_DEGENERATE().toString()).toBe("DEGENERATE");
  });

  it("CONCAVE toString should return 'CONCAVE'", () => {
    expect(ValidationResult.get_CONCAVE().toString()).toBe("CONCAVE");
  });

  it("SELF_INTERSECTING toString should return 'SELF_INTERSECTING'", () => {
    expect(ValidationResult.get_SELF_INTERSECTING().toString()).toBe("SELF_INTERSECTING");
  });

  it("should have __class__ set on prototype", () => {
    expect((ValidationResult.get_VALID() as any).__class__).toBe(ValidationResult);
  });
});
