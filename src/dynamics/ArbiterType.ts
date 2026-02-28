import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Arbiter type classification.
 *
 * - `COLLISION` — collision arbiter
 * - `SENSOR`    — sensor arbiter
 * - `FLUID`     — fluid arbiter
 *
 * Converted from nape-compiled.js lines 11653–11725.
 */
export class ArbiterType {
  static __name__ = ["nape", "dynamics", "ArbiterType"];

  static COLLISION: ArbiterType | null = null;
  static SENSOR: ArbiterType | null = null;
  static FLUID: ArbiterType | null = null;

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate ArbiterType derp!");
    }
  }

  static get_COLLISION(): ArbiterType {
    if (ZPP_Flags.ArbiterType_COLLISION == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ArbiterType_COLLISION = new ArbiterType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ArbiterType_COLLISION;
  }

  static get_SENSOR(): ArbiterType {
    if (ZPP_Flags.ArbiterType_SENSOR == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ArbiterType_SENSOR = new ArbiterType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ArbiterType_SENSOR;
  }

  static get_FLUID(): ArbiterType {
    if (ZPP_Flags.ArbiterType_FLUID == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ArbiterType_FLUID = new ArbiterType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ArbiterType_FLUID;
  }

  toString(): string {
    if (this === ArbiterType.get_COLLISION()) return "COLLISION";
    if (this === ArbiterType.get_SENSOR()) return "SENSOR";
    if (this === ArbiterType.get_FLUID()) return "FLUID";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();

// Fix prototypes of singletons created by the compiled stub at init time.
// These were created as instances of the stub constructor before this module loaded.
if (ZPP_Flags.ArbiterType_COLLISION != null) {
  Object.setPrototypeOf(ZPP_Flags.ArbiterType_COLLISION, ArbiterType.prototype);
}
if (ZPP_Flags.ArbiterType_SENSOR != null) {
  Object.setPrototypeOf(ZPP_Flags.ArbiterType_SENSOR, ArbiterType.prototype);
}
if (ZPP_Flags.ArbiterType_FLUID != null) {
  Object.setPrototypeOf(ZPP_Flags.ArbiterType_FLUID, ArbiterType.prototype);
}

nape.dynamics.ArbiterType = ArbiterType;
(ArbiterType.prototype as Any).__class__ = ArbiterType;
