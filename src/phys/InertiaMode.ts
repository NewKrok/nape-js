import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

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

  static DEFAULT: InertiaMode | null = null;
  static FIXED: InertiaMode | null = null;

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate InertiaMode derp!");
    }
  }

  static get_DEFAULT(): InertiaMode {
    if (ZPP_Flags.InertiaMode_DEFAULT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InertiaMode_DEFAULT = new InertiaMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InertiaMode_DEFAULT;
  }

  static get_FIXED(): InertiaMode {
    if (ZPP_Flags.InertiaMode_FIXED == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InertiaMode_FIXED = new InertiaMode();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InertiaMode_FIXED;
  }

  toString(): string {
    if (this === InertiaMode.get_DEFAULT()) return "DEFAULT";
    if (this === InertiaMode.get_FIXED()) return "FIXED";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.phys.InertiaMode = InertiaMode;
(InertiaMode.prototype as Any).__class__ = InertiaMode;
