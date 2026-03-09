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

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate ListenerType derp!");
    }
  }

  static get BODY(): ListenerType {
    if (ZPP_Flags.ListenerType_BODY == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_BODY = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_BODY;
  }

  static get CONSTRAINT(): ListenerType {
    if (ZPP_Flags.ListenerType_CONSTRAINT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_CONSTRAINT = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_CONSTRAINT;
  }

  static get INTERACTION(): ListenerType {
    if (ZPP_Flags.ListenerType_INTERACTION == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_INTERACTION = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_INTERACTION;
  }

  static get PRE(): ListenerType {
    if (ZPP_Flags.ListenerType_PRE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.ListenerType_PRE = new ListenerType();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.ListenerType_PRE;
  }

  toString(): string {
    if (this === ZPP_Flags.ListenerType_BODY) return "BODY";
    if (this === ZPP_Flags.ListenerType_CONSTRAINT) return "CONSTRAINT";
    if (this === ZPP_Flags.ListenerType_INTERACTION) return "INTERACTION";
    if (this === ZPP_Flags.ListenerType_PRE) return "PRE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.ListenerType = ListenerType;
ensureEnumsReady();
