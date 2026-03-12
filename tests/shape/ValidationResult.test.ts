import { describe, it, expect } from "vitest";
import { ValidationResult } from "../../src/shape/ValidationResult";
import { ZPP_Flags } from "../../src/native/util/ZPP_Flags";

describe("ValidationResult", () => {
  it("should throw on direct instantiation", () => {
    expect(() => new ValidationResult()).toThrow("Cannot instantiate");
  });

  it("should return VALID singleton", () => {
    const a = ValidationResult.VALID;
    const b = ValidationResult.VALID;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return DEGENERATE singleton", () => {
    const a = ValidationResult.DEGENERATE;
    const b = ValidationResult.DEGENERATE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return CONCAVE singleton", () => {
    const a = ValidationResult.CONCAVE;
    const b = ValidationResult.CONCAVE;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return SELF_INTERSECTING singleton", () => {
    const a = ValidationResult.SELF_INTERSECTING;
    const b = ValidationResult.SELF_INTERSECTING;
    expect(a).toBe(b);
    expect(a).toBeInstanceOf(ValidationResult);
  });

  it("should return distinct instances for each result", () => {
    expect(ValidationResult.VALID).not.toBe(ValidationResult.DEGENERATE);
    expect(ValidationResult.VALID).not.toBe(ValidationResult.CONCAVE);
    expect(ValidationResult.VALID).not.toBe(ValidationResult.SELF_INTERSECTING);
    expect(ValidationResult.DEGENERATE).not.toBe(ValidationResult.CONCAVE);
    expect(ValidationResult.DEGENERATE).not.toBe(ValidationResult.SELF_INTERSECTING);
    expect(ValidationResult.CONCAVE).not.toBe(ValidationResult.SELF_INTERSECTING);
  });

  it("should store singletons in ZPP_Flags", () => {
    expect(ZPP_Flags.ValidationResult_VALID).toBe(ValidationResult.VALID);
  });

  it("VALID toString should return 'VALID'", () => {
    expect(ValidationResult.VALID.toString()).toBe("VALID");
  });

  it("DEGENERATE toString should return 'DEGENERATE'", () => {
    expect(ValidationResult.DEGENERATE.toString()).toBe("DEGENERATE");
  });

  it("CONCAVE toString should return 'CONCAVE'", () => {
    expect(ValidationResult.CONCAVE.toString()).toBe("CONCAVE");
  });

  it("SELF_INTERSECTING toString should return 'SELF_INTERSECTING'", () => {
    expect(ValidationResult.SELF_INTERSECTING.toString()).toBe("SELF_INTERSECTING");
  });
});
