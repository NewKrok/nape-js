import { Callback } from "./Callback";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import type { Constraint } from "../constraint/Constraint";

/**
 * Callback object passed to {@link ConstraintListener} handlers.
 *
 * Provides the constraint that triggered the event. Do not store this object
 * beyond the handler scope — it is pooled and reused.
 *
 * Converted from nape-compiled.js lines 1262–1292.
 */
export class ConstraintCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "ConstraintCallback"];

  /** The constraint that woke, fell asleep, or broke. */
  get constraint(): Constraint {
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
