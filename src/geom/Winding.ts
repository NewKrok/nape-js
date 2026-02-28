import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Polygon winding order.
 *
 * - `UNDEFINED`     — winding is not determined
 * - `CLOCKWISE`     — clockwise winding
 * - `ANTICLOCKWISE` — counter-clockwise winding
 *
 * Converted from nape-compiled.js lines 19050–19116.
 */
export class Winding {
  static __name__ = ["nape", "geom", "Winding"];

  static UNDEFINED: Winding | null = null;
  static CLOCKWISE: Winding | null = null;
  static ANTICLOCKWISE: Winding | null = null;

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate Winding derp!");
    }
  }

  static get_UNDEFINED(): Winding {
    if (ZPP_Flags.Winding_UNDEFINED == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Winding_UNDEFINED = new Winding();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Winding_UNDEFINED;
  }

  static get_CLOCKWISE(): Winding {
    if (ZPP_Flags.Winding_CLOCKWISE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Winding_CLOCKWISE = new Winding();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Winding_CLOCKWISE;
  }

  static get_ANTICLOCKWISE(): Winding {
    if (ZPP_Flags.Winding_ANTICLOCKWISE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.Winding_ANTICLOCKWISE = new Winding();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.Winding_ANTICLOCKWISE;
  }

  toString(): string {
    if (this === Winding.get_UNDEFINED()) return "UNDEFINED";
    if (this === Winding.get_CLOCKWISE()) return "CLOCKWISE";
    if (this === Winding.get_ANTICLOCKWISE()) return "ANTICLOCKWISE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.geom.Winding = Winding;
(Winding.prototype as Any).__class__ = Winding;
