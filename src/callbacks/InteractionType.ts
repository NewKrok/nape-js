import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";


/**
 * Interaction type filter for interaction listeners.
 *
 * - `COLLISION` — collision interactions only
 * - `SENSOR`    — sensor interactions only
 * - `FLUID`     — fluid interactions only
 * - `ANY`       — any interaction type
 *
 * Converted from nape-compiled.js lines 1785–1883.
 */
export class InteractionType {
  static __name__ = ["nape", "callbacks", "InteractionType"];

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate InteractionType derp!");
    }
  }

  // --- Static getters for convenient access ---

  static get COLLISION(): InteractionType {
    if (ZPP_Flags.InteractionType_COLLISION == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InteractionType_COLLISION = new InteractionType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InteractionType_COLLISION;
  }
  static get SENSOR(): InteractionType {
    if (ZPP_Flags.InteractionType_SENSOR == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InteractionType_SENSOR = new InteractionType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InteractionType_SENSOR;
  }
  static get FLUID(): InteractionType {
    if (ZPP_Flags.InteractionType_FLUID == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InteractionType_FLUID = new InteractionType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InteractionType_FLUID;
  }
  static get ANY(): InteractionType {
    if (ZPP_Flags.InteractionType_ANY == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InteractionType_ANY = new InteractionType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InteractionType_ANY;
  }

  toString(): string {
    if (this === ZPP_Flags.InteractionType_COLLISION) return "COLLISION";
    if (this === ZPP_Flags.InteractionType_SENSOR) return "SENSOR";
    if (this === ZPP_Flags.InteractionType_FLUID) return "FLUID";
    if (this === ZPP_Flags.InteractionType_ANY) return "ANY";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.InteractionType = InteractionType;

