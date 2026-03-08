import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

/**
 * Inertia mode for a body.
 *
 * - `DEFAULT` — use computed inertia from shapes
 * - `FIXED`   — use a fixed inertia value
 *
 * Converted from nape-compiled.js lines 26343–26390.
 */
export class InertiaMode {
  static __name__ = ["nape", "phys", "InertiaMode"];

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate InertiaMode derp!");
    }
  }

  static get DEFAULT(): InertiaMode {
    if (ZPP_Flags.InertiaMode_DEFAULT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InertiaMode_DEFAULT = new InertiaMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InertiaMode_DEFAULT;
  }

  static get FIXED(): InertiaMode {
    if (ZPP_Flags.InertiaMode_FIXED == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InertiaMode_FIXED = new InertiaMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InertiaMode_FIXED;
  }

  toString(): string {
    if (this === ZPP_Flags.InertiaMode_DEFAULT) return "DEFAULT";
    if (this === ZPP_Flags.InertiaMode_FIXED) return "FIXED";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.phys.InertiaMode = InertiaMode;

