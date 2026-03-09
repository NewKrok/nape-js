import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

/**
 * Return value for {@link PreListener} handlers — controls whether the interaction
 * is resolved this step and in future steps.
 *
 * - `ACCEPT`      — resolve the interaction (default if handler returns `null`)
 * - `IGNORE`      — suppress the interaction permanently until the next `BEGIN`
 * - `ACCEPT_ONCE` — accept this step only, then revert to the previous flag
 * - `IGNORE_ONCE` — ignore this step only, then revert to the previous flag
 *
 * Use `IGNORE`/`ACCEPT` for stateful decisions (e.g., one-way platforms).
 * Use `*_ONCE` variants for single-step overrides.
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

  /** Accept and resolve the interaction normally. */
  static get ACCEPT(): PreFlag {
    if (ZPP_Flags.PreFlag_ACCEPT == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_ACCEPT = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_ACCEPT;
  }
  /** Suppress the interaction permanently until the next `BEGIN` event. */
  static get IGNORE(): PreFlag {
    if (ZPP_Flags.PreFlag_IGNORE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_IGNORE = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_IGNORE;
  }
  /** Accept this step only; revert to the previous flag next step. */
  static get ACCEPT_ONCE(): PreFlag {
    if (ZPP_Flags.PreFlag_ACCEPT_ONCE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_ACCEPT_ONCE = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_ACCEPT_ONCE;
  }
  /** Ignore this step only; revert to the previous flag next step. */
  static get IGNORE_ONCE(): PreFlag {
    if (ZPP_Flags.PreFlag_IGNORE_ONCE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.PreFlag_IGNORE_ONCE = new PreFlag();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.PreFlag_IGNORE_ONCE;
  }

  toString(): string {
    if (this === ZPP_Flags.PreFlag_ACCEPT) return "ACCEPT";
    if (this === ZPP_Flags.PreFlag_IGNORE) return "IGNORE";
    if (this === ZPP_Flags.PreFlag_ACCEPT_ONCE) return "ACCEPT_ONCE";
    if (this === ZPP_Flags.PreFlag_IGNORE_ONCE) return "IGNORE_ONCE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.PreFlag = PreFlag;
