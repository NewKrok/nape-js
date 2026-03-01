import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Result of polygon shape validation.
 *
 * - `VALID`              — shape is valid
 * - `DEGENERATE`         — shape is degenerate (e.g., zero area)
 * - `CONCAVE`            — shape is concave (must be convex)
 * - `SELF_INTERSECTING`  — shape edges self-intersect
 *
 * Converted from nape-compiled.js lines 30760–30856.
 */
export class ValidationResult {
  static __name__ = ["nape", "shape", "ValidationResult"];

  static VALID: ValidationResult | null = null;
  static DEGENERATE: ValidationResult | null = null;
  static CONCAVE: ValidationResult | null = null;
  static SELF_INTERSECTING: ValidationResult | null = null;

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate ValidationResult derp!");
    }
  }

  static get_VALID(): ValidationResult {
    if (ZPP_Flags.ValidationResult_VALID == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ValidationResult_VALID = new ValidationResult();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ValidationResult_VALID;
  }

  static get_DEGENERATE(): ValidationResult {
    if (ZPP_Flags.ValidationResult_DEGENERATE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ValidationResult_DEGENERATE = new ValidationResult();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ValidationResult_DEGENERATE;
  }

  static get_CONCAVE(): ValidationResult {
    if (ZPP_Flags.ValidationResult_CONCAVE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ValidationResult_CONCAVE = new ValidationResult();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ValidationResult_CONCAVE;
  }

  static get_SELF_INTERSECTING(): ValidationResult {
    if (ZPP_Flags.ValidationResult_SELF_INTERSECTING == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ValidationResult_SELF_INTERSECTING = new ValidationResult();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ValidationResult_SELF_INTERSECTING;
  }

  toString(): string {
    if (this === ValidationResult.get_VALID()) return "VALID";
    if (this === ValidationResult.get_DEGENERATE()) return "DEGENERATE";
    if (this === ValidationResult.get_CONCAVE()) return "CONCAVE";
    if (this === ValidationResult.get_SELF_INTERSECTING()) return "SELF_INTERSECTING";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.shape.ValidationResult = ValidationResult;
(ValidationResult.prototype as Any).__class__ = ValidationResult;
