import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

/**
 * Return value flags for PreListener handlers.
 *
 * - `ACCEPT`      — accept the interaction
 * - `IGNORE`      — ignore the interaction
 * - `ACCEPT_ONCE` — accept once, then revert
 * - `IGNORE_ONCE` — ignore once, then revert
 *
 * Converted from nape-compiled.js lines 2504–2591.
 */
export class PreFlag {
  static __name__ = ["nape", "callbacks", "PreFlag"];

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate PreFlag derp!");
    }
  }

  // --- Static getters for convenient access ---

  static get ACCEPT(): PreFlag { return PreFlag.get_ACCEPT(); }
  static get IGNORE(): PreFlag { return PreFlag.get_IGNORE(); }
  static get ACCEPT_ONCE(): PreFlag { return PreFlag.get_ACCEPT_ONCE(); }
  static get IGNORE_ONCE(): PreFlag { return PreFlag.get_IGNORE_ONCE(); }

  // --- Lazy singleton accessors (used by compiled code) ---

  static get_ACCEPT(): PreFlag {
    if (ZPP_Flags.PreFlag_ACCEPT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_ACCEPT = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_ACCEPT;
  }

  static get_IGNORE(): PreFlag {
    if (ZPP_Flags.PreFlag_IGNORE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_IGNORE = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_IGNORE;
  }

  static get_ACCEPT_ONCE(): PreFlag {
    if (ZPP_Flags.PreFlag_ACCEPT_ONCE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_ACCEPT_ONCE = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_ACCEPT_ONCE;
  }

  static get_IGNORE_ONCE(): PreFlag {
    if (ZPP_Flags.PreFlag_IGNORE_ONCE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_IGNORE_ONCE = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_IGNORE_ONCE;
  }

  toString(): string {
    if (this === PreFlag.get_ACCEPT()) return "ACCEPT";
    if (this === PreFlag.get_IGNORE()) return "IGNORE";
    if (this === PreFlag.get_ACCEPT_ONCE()) return "ACCEPT_ONCE";
    if (this === PreFlag.get_IGNORE_ONCE()) return "IGNORE_ONCE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.PreFlag = PreFlag;
(PreFlag.prototype as Any).__class__ = PreFlag;
