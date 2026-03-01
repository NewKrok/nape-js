import { getNape } from "../core/engine";
import { Callback } from "./Callback";

type Any = any;

/**
 * Callback for body events (WAKE/SLEEP).
 *
 * Cannot be instantiated directly — instances are created internally by the engine.
 *
 * Converted from nape-compiled.js lines 239–261.
 */
export class BodyCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "BodyCallback"];

  get body(): Any {
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
const nape = getNape();
nape.callbacks.BodyCallback = BodyCallback;
(BodyCallback as Any).__super__ = Callback;
(BodyCallback.prototype as Any).__class__ = BodyCallback;
