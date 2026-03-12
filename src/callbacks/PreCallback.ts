import { Callback } from "./Callback";
import type { Arbiter } from "../dynamics/Arbiter";
import type { Interactor } from "../phys/Interactor";

/**
 * Callback object passed to {@link PreListener} handlers.
 *
 * Provides both interactors, the arbiter, and a `swapped` flag indicating
 * whether the pair order was swapped relative to the listener's `options1`/`options2`.
 *
 * The handler should return a {@link PreFlag} to control the interaction.
 * Do not store this object beyond the handler scope — it is pooled and reused.
 *
 * Converted from nape-compiled.js lines 2590–2634.
 */
export class PreCallback extends Callback {
  /** The arbiter representing the potential interaction. Use to inspect collision normal, etc. */
  get arbiter(): Arbiter {
    return this.zpp_inner!.pre_arbiter.wrapper();
  }

  /** The first interactor in the pair (matches `options1` unless `swapped` is `true`). */
  get int1(): Interactor {
    return this.zpp_inner!.int1.outer_i;
  }

  /** The second interactor in the pair (matches `options2` unless `swapped` is `true`). */
  get int2(): Interactor {
    return this.zpp_inner!.int2.outer_i;
  }

  /**
   * `true` when the pair order is swapped relative to the listener's `options1`/`options2`.
   * Check this if you need to know which interactor matched which filter.
   */
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
