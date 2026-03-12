import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

/**
 * Enumeration of interaction categories used to filter {@link InteractionListener}
 * and {@link PreListener} callbacks.
 *
 * - `COLLISION` — physical collisions between solid shapes
 * - `SENSOR`    — sensor (trigger) interactions where shapes overlap but don't resolve
 * - `FLUID`     — fluid buoyancy/drag interactions
 * - `ANY`       — all of the above
 *
 * Converted from nape-compiled.js lines 1785–1883.
 */
export class InteractionType {
  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate InteractionType derp!");
    }
  }

  // --- Static getters for convenient access ---

  /** Physical collision between solid shapes (default for most shapes). */
  static get COLLISION(): InteractionType {
    if (ZPP_Flags.InteractionType_COLLISION == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InteractionType_COLLISION = new InteractionType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InteractionType_COLLISION;
  }
  /** Sensor/trigger overlap — shapes overlap but collision is not resolved. */
  static get SENSOR(): InteractionType {
    if (ZPP_Flags.InteractionType_SENSOR == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InteractionType_SENSOR = new InteractionType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InteractionType_SENSOR;
  }
  /** Fluid buoyancy/drag interaction between a fluid shape and a body. */
  static get FLUID(): InteractionType {
    if (ZPP_Flags.InteractionType_FLUID == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.InteractionType_FLUID = new InteractionType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.InteractionType_FLUID;
  }
  /** Matches all interaction types (COLLISION, SENSOR, and FLUID). */
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
