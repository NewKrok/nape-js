import { Callback } from "./Callback";
import type { Body } from "../phys/Body";

/**
 * Callback object passed to {@link BodyListener} handlers.
 *
 * Provides the body that triggered the event. Do not store this object beyond
 * the handler scope — it is pooled and reused.
 */
export class BodyCallback extends Callback {
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
// Register this class in the nape namespace
// ---------------------------------------------------------------------------
