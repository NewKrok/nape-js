/**
 * BodyListener — Listens for body events (WAKE/SLEEP).
 *
 * Fully modernized from nape-compiled.js lines 434–515.
 */

import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import { ZPP_BodyListener } from "../native/callbacks/ZPP_BodyListener";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import { Listener } from "./Listener";
import { CbEvent } from "./CbEvent";
import type { OptionType } from "./OptionType";
import type { CbType } from "./CbType";
import type { BodyCallback } from "./BodyCallback";

/**
 * Listener for body lifecycle events.
 *
 * Fires when a body matching the `options` filter wakes or sleeps.
 *
 * Valid events: {@link CbEvent.WAKE}, {@link CbEvent.SLEEP}.
 *
 * @example
 * ```ts
 * const listener = new BodyListener(
 *   CbEvent.WAKE,
 *   CbType.ANY_BODY,
 *   (cb) => { console.log(cb.body, 'woke up'); },
 * );
 * space.listeners.add(listener);
 * ```
 *
 * Fully modernized from nape-compiled.js lines 434–515.
 */
export class BodyListener extends Listener {
  static __name__ = ["nape", "callbacks", "BodyListener"];

  zpp_inner_zn: ZPP_BodyListener;

  /**
   * @param event - Must be `CbEvent.WAKE` or `CbEvent.SLEEP`.
   * @param options - `CbType` or `OptionType` filter, or `null` to match all bodies.
   * @param handler - Called with a {@link BodyCallback} each time the event fires.
   * @param precedence - Execution order relative to other listeners (higher = first). Default `0`.
   */
  constructor(event: CbEvent, options: OptionType | CbType | null, handler: (cb: BodyCallback) => void, precedence = 0) {
    ZPP_Listener.internal = true;
    super();
    ZPP_Listener.internal = false;

    if (handler == null) {
      throw new Error("Error: BodyListener::handler cannot be null");
    }

    let xevent: number;
    if (event === CbEvent.WAKE) {
      xevent = 2;
    } else if (event === CbEvent.SLEEP) {
      xevent = 3;
    } else {
      throw new Error(
        "Error: cbEvent '" + event.toString() + "' is not a valid event type for a BodyListener",
      );
    }

    this.zpp_inner_zn = new ZPP_BodyListener(ZPP_OptionType.argument(options), xevent, handler);
    this.zpp_inner = this.zpp_inner_zn;
    this.zpp_inner.outer = this;
    this.zpp_inner_zn.outer_zn = this;
    this.zpp_inner.precedence = precedence;
  }

  /**
   * The filter used to match bodies. Returns an {@link OptionType} representing
   * the current include/exclude configuration.
   */
  get options(): OptionType {
    return this.zpp_inner_zn.options.outer;
  }

  set options(options: OptionType | CbType) {
    this.zpp_inner_zn.options.set((options as any).zpp_inner);
  }

  /** The callback function invoked when the event fires. Cannot be set to null. */
  get handler(): (cb: BodyCallback) => void {
    return this.zpp_inner_zn.handler;
  }

  set handler(handler: (cb: BodyCallback) => void) {
    if (handler == null) {
      throw new Error("Error: BodyListener::handler cannot be null");
    }
    this.zpp_inner_zn.handler = handler;
  }
}

// Self-register in the compiled namespace
