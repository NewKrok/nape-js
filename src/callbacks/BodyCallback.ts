import { Callback } from "./Callback";
import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import type { Body } from "../phys/Body";

/**
 * Callback object passed to {@link BodyListener} handlers.
 *
 * Provides the body that triggered the event. Do not store this object beyond
 * the handler scope — it is pooled and reused.
 *
 * Converted from nape-compiled.js lines 239–261.
 */
export class BodyCallback extends Callback {
  static override __name__ = ["nape", "callbacks", "BodyCallback"];

  /** The body that woke or fell asleep. */
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
