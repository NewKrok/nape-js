import { Callback } from "./Callback";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import type { Interactor } from "../phys/Interactor";

/**
 * Callback object passed to {@link InteractionListener} handlers.
 *
 * Provides both interactors and the list of active arbiters between them.
 * Do not store this object beyond the handler scope — it is pooled and reused.
 *
 * Converted from nape-compiled.js lines 1398–1445.
 */
export class InteractionCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "InteractionCallback"];

  /** The first interactor involved in the interaction. */
  get int1(): Interactor {
    return this.zpp_inner!.int1.outer_i;
  }

  /** The second interactor involved in the interaction. */
  get int2(): Interactor {
    return this.zpp_inner!.int2.outer_i;
  }

  /**
   * The list of arbiters currently active between `int1` and `int2`.
   *
   * For `ONGOING` callbacks, arbiters are valid for the entire step.
   * For `BEGIN`/`END` callbacks, the list reflects the state at the moment
   * the event fired.
   */
  // ArbiterList is a factory-generated list class; no static TS type available
  get arbiters(): object {
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
