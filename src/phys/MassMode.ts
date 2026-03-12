import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

/**
 * Mass mode for a body.
 *
 * - `DEFAULT` — use computed mass from shapes
 * - `FIXED`   — use a fixed mass value
 *
 * Converted from nape-compiled.js lines 26966–27013.
 */
export class MassMode {
  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate MassMode derp!");
    }
  }

  static get DEFAULT(): MassMode {
    if (ZPP_Flags.MassMode_DEFAULT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.MassMode_DEFAULT = new MassMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.MassMode_DEFAULT;
  }

  static get FIXED(): MassMode {
    if (ZPP_Flags.MassMode_FIXED == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.MassMode_FIXED = new MassMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.MassMode_FIXED;
  }

  toString(): string {
    if (this === ZPP_Flags.MassMode_DEFAULT) return "DEFAULT";
    if (this === ZPP_Flags.MassMode_FIXED) return "FIXED";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.phys.MassMode = MassMode;
