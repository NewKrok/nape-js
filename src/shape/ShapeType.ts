import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Shape type classification.
 *
 * - `CIRCLE`  — circle shape
 * - `POLYGON` — polygon shape
 *
 * Converted from nape-compiled.js lines 30435–30482.
 */
export class ShapeType {
  static __name__ = ["nape", "shape", "ShapeType"];

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate ShapeType derp!");
    }
  }

  // --- Static getters for convenient access ---

  static get CIRCLE(): ShapeType {
    return ShapeType.get_CIRCLE();
  }
  static get POLYGON(): ShapeType {
    return ShapeType.get_POLYGON();
  }

  // --- Lazy singleton accessors (used by compiled code) ---

  static get_CIRCLE(): ShapeType {
    if (ZPP_Flags.ShapeType_CIRCLE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ShapeType_CIRCLE = new ShapeType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ShapeType_CIRCLE;
  }

  static get_POLYGON(): ShapeType {
    if (ZPP_Flags.ShapeType_POLYGON == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ShapeType_POLYGON = new ShapeType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ShapeType_POLYGON;
  }

  toString(): string {
    if (this === ShapeType.get_CIRCLE()) return "CIRCLE";
    if (this === ShapeType.get_POLYGON()) return "POLYGON";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();

// Fix prototypes of singletons created by the compiled stub at init time.
if (ZPP_Flags.ShapeType_CIRCLE != null) {
  Object.setPrototypeOf(ZPP_Flags.ShapeType_CIRCLE, ShapeType.prototype);
}
if (ZPP_Flags.ShapeType_POLYGON != null) {
  Object.setPrototypeOf(ZPP_Flags.ShapeType_POLYGON, ShapeType.prototype);
}

nape.shape.ShapeType = ShapeType;
(ShapeType.prototype as Any).__class__ = ShapeType;
