import { getNape, ensureEnumsReady } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

/**
 * Shape type classification.
 *
 * - `CIRCLE`  — circle shape
 * - `POLYGON` — polygon shape
 *
 * Converted from nape-compiled.js lines 30435–30482.
 */
export class ShapeType {
  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate ShapeType derp!");
    }
  }

  // --- Static getters for convenient access ---

  static get CIRCLE(): ShapeType {
    if (ZPP_Flags.ShapeType_CIRCLE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ShapeType_CIRCLE = new ShapeType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ShapeType_CIRCLE;
  }
  static get POLYGON(): ShapeType {
    if (ZPP_Flags.ShapeType_POLYGON == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ShapeType_POLYGON = new ShapeType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ShapeType_POLYGON;
  }
  static get CAPSULE(): ShapeType {
    if (ZPP_Flags.ShapeType_CAPSULE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ShapeType_CAPSULE = new ShapeType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ShapeType_CAPSULE;
  }

  toString(): string {
    if (this === ZPP_Flags.ShapeType_CIRCLE) return "CIRCLE";
    if (this === ZPP_Flags.ShapeType_POLYGON) return "POLYGON";
    if (this === ZPP_Flags.ShapeType_CAPSULE) return "CAPSULE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.shape.ShapeType = ShapeType;
ensureEnumsReady();
