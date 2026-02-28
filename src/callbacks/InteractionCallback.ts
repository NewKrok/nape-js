import { getNape } from "../core/engine";
import { Callback } from "./Callback";

type Any = any;

/**
 * Callback for interaction events (BEGIN/END/ONGOING).
 *
 * Cannot be instantiated directly — instances are created internally by the engine.
 *
 * Converted from nape-compiled.js lines 1398–1445.
 */
export class InteractionCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "InteractionCallback"];

  get int1(): Any {
    return this.zpp_inner!.int1.outer_i;
  }

  get int2(): Any {
    return this.zpp_inner!.int2.outer_i;
  }

  get arbiters(): Any {
    return this.zpp_inner!.wrap_arbiters;
  }

  toString(): string {
    const ret =
      "Cb:" +
      ["BEGIN", "END", "", "", "", "", "ONGOING"][this.zpp_inner!.event] +
      ":" +
      this.zpp_inner!.int1.outer_i.toString() +
      "/" +
      this.zpp_inner!.int2.outer_i.toString() +
      " : " +
      this.zpp_inner!.wrap_arbiters.toString() +
      " : listener: " +
      String(this.zpp_inner!.listener.outer);
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.InteractionCallback = InteractionCallback;
(InteractionCallback as Any).__super__ = Callback;
(InteractionCallback.prototype as Any).__class__ = InteractionCallback;
