import { Callback } from "./Callback";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import type { Interactor } from "../phys/Interactor";

/**
 * Callback for interaction events (BEGIN/END/ONGOING).
 *
 * Cannot be instantiated directly — instances are created internally by the engine.
 *
 * Converted from nape-compiled.js lines 1398–1445.
 */
export class InteractionCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "InteractionCallback"];

  get int1(): Interactor {
    return this.zpp_inner!.int1.outer_i;
  }

  get int2(): Interactor {
    return this.zpp_inner!.int2.outer_i;
  }

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
