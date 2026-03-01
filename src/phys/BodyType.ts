import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Body type enumeration.
 *
 * - `STATIC`    — immovable, infinite mass (walls, floors)
 * - `DYNAMIC`   — fully simulated (default)
 * - `KINEMATIC` — moves only via velocity, not affected by forces
 *
 * Converted from nape-compiled.js lines 24640–24705.
 */
export class BodyType {
  static __name__ = ["nape", "phys", "BodyType"];

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate BodyType derp!");
    }
  }

  // --- Static getters for convenient access (BodyType.DYNAMIC etc.) ---

  static get STATIC(): BodyType {
    return BodyType.get_STATIC();
  }
  static get DYNAMIC(): BodyType {
    return BodyType.get_DYNAMIC();
  }
  static get KINEMATIC(): BodyType {
    return BodyType.get_KINEMATIC();
  }

  // --- Lazy singleton accessors (used by compiled code) ---

  static get_STATIC(): BodyType {
    if (ZPP_Flags.BodyType_STATIC == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.BodyType_STATIC = new BodyType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.BodyType_STATIC;
  }

  static get_DYNAMIC(): BodyType {
    if (ZPP_Flags.BodyType_DYNAMIC == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.BodyType_DYNAMIC = new BodyType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.BodyType_DYNAMIC;
  }

  static get_KINEMATIC(): BodyType {
    if (ZPP_Flags.BodyType_KINEMATIC == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.BodyType_KINEMATIC = new BodyType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.BodyType_KINEMATIC;
  }

  toString(): string {
    if (this === BodyType.get_STATIC()) return "STATIC";
    if (this === BodyType.get_DYNAMIC()) return "DYNAMIC";
    if (this === BodyType.get_KINEMATIC()) return "KINEMATIC";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();

// Fix prototypes of singletons created by the compiled stub at init time.
if (ZPP_Flags.BodyType_STATIC != null) {
  Object.setPrototypeOf(ZPP_Flags.BodyType_STATIC, BodyType.prototype);
}
if (ZPP_Flags.BodyType_DYNAMIC != null) {
  Object.setPrototypeOf(ZPP_Flags.BodyType_DYNAMIC, BodyType.prototype);
}
if (ZPP_Flags.BodyType_KINEMATIC != null) {
  Object.setPrototypeOf(ZPP_Flags.BodyType_KINEMATIC, BodyType.prototype);
}

nape.phys.BodyType = BodyType;
(BodyType.prototype as Any).__class__ = BodyType;
