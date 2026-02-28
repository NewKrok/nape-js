import { getNape } from "../core/engine";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";

type Any = any;

/**
 * Base class for all physics engine callbacks.
 *
 * Cannot be instantiated directly — instances are created internally by the engine
 * and passed to listener handlers.
 *
 * Converted from nape-compiled.js lines 212–238.
 */
export class Callback {
  static __name__ = ["nape", "callbacks", "Callback"];

  zpp_inner: ZPP_Callback | null = null;

  constructor() {
    if (!ZPP_Callback.internal) {
      throw new Error("Error: Callback cannot be instantiated derp!");
    }
  }

  get event(): Any {
    const nape = getNape();
    return nape.__zpp.callbacks.ZPP_Listener.events[this.zpp_inner!.event];
  }

  get listener(): Any {
    return this.zpp_inner!.listener.outer;
  }

  toString(): string {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.Callback = Callback;
(Callback.prototype as Any).__class__ = Callback;
