import { Callback } from "./Callback";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import type { Body } from "../phys/Body";

/**
 * Callback for body events (WAKE/SLEEP).
 *
 * Cannot be instantiated directly — instances are created internally by the engine.
 *
 * Converted from nape-compiled.js lines 239–261.
 */
export class BodyCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "BodyCallback"];

  get body(): Body {
    return this.zpp_inner!.body.outer;
  }

  toString(): string {
    const ret =
      "Cb:" +
      ["WAKE", "SLEEP"][this.zpp_inner!.event - 2] +
      ":" +
      this.zpp_inner!.body.outer.toString() +
      " : listener: " +
      String(this.zpp_inner!.listener.outer);
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
(BodyCallback as any).__super__ = Callback;
ZPP_Callback._createBodyCb = () => new BodyCallback();
