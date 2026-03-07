import { Callback } from "./Callback";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import type { Arbiter } from "../dynamics/Arbiter";
import type { Interactor } from "../phys/Interactor";

/**
 * Callback for pre-interaction events.
 *
 * Cannot be instantiated directly — instances are created internally by the engine.
 *
 * Converted from nape-compiled.js lines 2590–2634.
 */
export class PreCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "PreCallback"];

  get arbiter(): Arbiter {
    return this.zpp_inner!.pre_arbiter.wrapper();
  }

  get int1(): Interactor {
    return this.zpp_inner!.int1.outer_i;
  }

  get int2(): Interactor {
    return this.zpp_inner!.int2.outer_i;
  }

  get swapped(): boolean {
    return this.zpp_inner!.pre_swapped;
  }

  toString(): string {
    const ret =
      "Cb:PRE:" +
      ":" +
      this.zpp_inner!.int1.outer_i.toString() +
      "/" +
      this.zpp_inner!.int2.outer_i.toString() +
      " : " +
      this.zpp_inner!.pre_arbiter.wrapper().toString() +
      " : listnener: " +
      String(this.zpp_inner!.listener.outer);
    return ret;
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
(PreCallback as any).__super__ = Callback;
ZPP_Callback._createPreCb = () => new PreCallback();
