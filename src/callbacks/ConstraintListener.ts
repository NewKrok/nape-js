/**
 * ConstraintListener — Listens for constraint events (WAKE/SLEEP/BREAK).
 *
 * Fully modernized from nape-compiled.js lines 546–649.
 */

import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import { ZPP_ConstraintListener } from "../native/callbacks/ZPP_ConstraintListener";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import { Listener } from "./Listener";
import { CbEvent } from "./CbEvent";
import type { OptionType } from "./OptionType";
import type { CbType } from "./CbType";
import type { ConstraintCallback } from "./ConstraintCallback";

/**
 * Listener for constraint lifecycle events.
 *
 * Fires when a constraint matching the `options` filter wakes, sleeps, or breaks.
 *
 * Valid events: {@link CbEvent.WAKE}, {@link CbEvent.SLEEP}, {@link CbEvent.BREAK}.
 *
 * A `BREAK` event fires when the constraint exceeds its `maxForce` or `maxError` limit.
 * If `removeOnBreak` is `true` on the constraint it is also removed from the space.
 *
 * @example
 * ```ts
 * const listener = new ConstraintListener(
 *   CbEvent.BREAK,
 *   myConstraintType,
 *   (cb) => { console.log(cb.constraint, 'broke!'); },
 * );
 * space.listeners.add(listener);
 * ```
 *
 * Fully modernized from nape-compiled.js lines 546–649.
 */
export class ConstraintListener extends Listener {
  /** @internal */
  zpp_inner_zn: ZPP_ConstraintListener;

  /**
   * @param event - Must be `CbEvent.WAKE`, `CbEvent.SLEEP`, or `CbEvent.BREAK`.
   * @param options - `CbType` or `OptionType` filter, or `null` to match all constraints.
   * @param handler - Called with a {@link ConstraintCallback} each time the event fires.
   * @param precedence - Execution order relative to other listeners (higher = first). Default `0`.
   */
  constructor(
    event: CbEvent,
    options: OptionType | CbType | null,
    handler: (cb: ConstraintCallback) => void,
    precedence = 0,
  ) {
    ZPP_Listener.internal = true;
    super();
    ZPP_Listener.internal = false;

    if (handler == null) {
      throw new Error("Error: ConstraintListener::handler cannot be null");
    }

    let xevent: number;
    if (event === CbEvent.WAKE) {
      xevent = 2;
    } else if (event === CbEvent.SLEEP) {
      xevent = 3;
    } else if (event === CbEvent.BREAK) {
      xevent = 4;
    } else {
      throw new Error(
        "Error: cbEvent '" +
          event.toString() +
          "' is not a valid event type for a ConstraintListener",
      );
    }

    this.zpp_inner_zn = new ZPP_ConstraintListener(
      ZPP_OptionType.argument(options),
      xevent,
      handler,
    );
    this.zpp_inner = this.zpp_inner_zn;
    this.zpp_inner.outer = this;
    this.zpp_inner_zn.outer_zn = this;
    this.zpp_inner.precedence = precedence;
  }

  /**
   * The filter used to match constraints. Returns an {@link OptionType} representing
   * the current include/exclude configuration.
   */
  get options(): OptionType {
    return this.zpp_inner_zn.options.outer;
  }

  set options(options: OptionType | CbType) {
    this.zpp_inner_zn.options.set((options as any).zpp_inner);
  }

  /** The callback function invoked when the event fires. Cannot be set to null. */
  get handler(): (cb: ConstraintCallback) => void {
    return this.zpp_inner_zn.handler;
  }

  set handler(handler: (cb: ConstraintCallback) => void) {
    if (handler == null) {
      throw new Error("Error: ConstraintListener::handler cannot be null");
    }
    this.zpp_inner_zn.handler = handler;
  }
}

// Self-register in the compiled namespace
