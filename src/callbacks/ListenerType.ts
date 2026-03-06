import { getNape, ensureEnumsReady } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";


/**
 * Listener type classification.
 *
 * - `BODY`        — body event listener
 * - `CONSTRAINT`  — constraint event listener
 * - `INTERACTION` — interaction event listener
 * - `PRE`         — pre-interaction listener
 *
 * Converted from nape-compiled.js lines 2554–2646.
 */
export class ListenerType {
  static __name__ = ["nape", "callbacks", "ListenerType"];

  static BODY: ListenerType | null = null;
  static CONSTRAINT: ListenerType | null = null;
  static INTERACTION: ListenerType | null = null;
  static PRE: ListenerType | null = null;

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate ListenerType derp!");
    }
  }

  static get_BODY(): ListenerType {
    if (ZPP_Flags.ListenerType_BODY == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_BODY = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_BODY;
  }

  static get_CONSTRAINT(): ListenerType {
    if (ZPP_Flags.ListenerType_CONSTRAINT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_CONSTRAINT = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_CONSTRAINT;
  }

  static get_INTERACTION(): ListenerType {
    if (ZPP_Flags.ListenerType_INTERACTION == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_INTERACTION = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_INTERACTION;
  }

  static get_PRE(): ListenerType {
    if (ZPP_Flags.ListenerType_PRE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_PRE = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_PRE;
  }

  toString(): string {
    if (this === ListenerType.get_BODY()) return "BODY";
    if (this === ListenerType.get_CONSTRAINT()) return "CONSTRAINT";
    if (this === ListenerType.get_INTERACTION()) return "INTERACTION";
    if (this === ListenerType.get_PRE()) return "PRE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.ListenerType = ListenerType;
ensureEnumsReady();

