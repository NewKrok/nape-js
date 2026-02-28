import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Gravity mass mode for a body.
 *
 * - `DEFAULT` — use computed mass for gravity
 * - `FIXED`   — use a fixed gravity mass value
 * - `SCALED`  — scale the computed gravity mass
 *
 * Converted from nape-compiled.js lines 26272–26342.
 */
export class GravMassMode {
  static __name__ = ["nape", "phys", "GravMassMode"];

  static DEFAULT: GravMassMode | null = null;
  static FIXED: GravMassMode | null = null;
  static SCALED: GravMassMode | null = null;

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate GravMassMode derp!");
    }
  }

  static get_DEFAULT(): GravMassMode {
    if (ZPP_Flags.GravMassMode_DEFAULT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.GravMassMode_DEFAULT = new GravMassMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.GravMassMode_DEFAULT;
  }

  static get_FIXED(): GravMassMode {
    if (ZPP_Flags.GravMassMode_FIXED == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.GravMassMode_FIXED = new GravMassMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.GravMassMode_FIXED;
  }

  static get_SCALED(): GravMassMode {
    if (ZPP_Flags.GravMassMode_SCALED == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.GravMassMode_SCALED = new GravMassMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.GravMassMode_SCALED;
  }

  toString(): string {
    if (this === GravMassMode.get_DEFAULT()) return "DEFAULT";
    if (this === GravMassMode.get_FIXED()) return "FIXED";
    if (this === GravMassMode.get_SCALED()) return "SCALED";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.phys.GravMassMode = GravMassMode;
(GravMassMode.prototype as Any).__class__ = GravMassMode;
