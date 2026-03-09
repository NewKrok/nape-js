import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import type { CbEvent } from "./CbEvent";
import type { Listener } from "./Listener";

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

  get event(): CbEvent {
    return ZPP_Listener.events[this.zpp_inner!.event];
  }

  get listener(): Listener {
    return this.zpp_inner!.listener.outer;
  }

  toString(): string {
    return "";
  }
}

