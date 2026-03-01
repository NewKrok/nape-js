import { getNape } from "../core/engine";
import { Callback } from "./Callback";

type Any = any;

/**
 * Callback for constraint events (WAKE/SLEEP/BREAK).
 *
 * Cannot be instantiated directly — instances are created internally by the engine.
 *
 * Converted from nape-compiled.js lines 1262–1292.
 */
export class ConstraintCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "ConstraintCallback"];

  get constraint(): Any {
    return this.zpp_inner!.constraint.outer;
  }

  toString(): string {
    const ret =
      "Cb:" +
      ["WAKE", "SLEEP", "BREAK"][this.zpp_inner!.event - 2] +
      ":" +
      this.zpp_inner!.constraint.outer.toString() +
      " : listener: " +
      String(this.zpp_inner!.listener.outer);
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.ConstraintCallback = ConstraintCallback;
(ConstraintCallback as Any).__super__ = Callback;
(ConstraintCallback.prototype as Any).__class__ = ConstraintCallback;
