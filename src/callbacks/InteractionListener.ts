/**
 * InteractionListener — Listens for interaction events (BEGIN/END/ONGOING).
 *
 * Fully modernized from nape-compiled.js lines 659–1091.
 */

import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import { ZPP_InteractionListener } from "../native/callbacks/ZPP_InteractionListener";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import { Listener } from "./Listener";
import { CbEvent } from "./CbEvent";
import { InteractionType } from "./InteractionType";
import type { OptionType } from "./OptionType";
import type { CbType } from "./CbType";
import type { InteractionCallback } from "./InteractionCallback";

/**
 * Convert an InteractionType singleton to the internal numeric code.
 */
export function interactionTypeToNumber(interactionType: InteractionType): number {
  if (interactionType === InteractionType.COLLISION) return 1;
  if (interactionType === InteractionType.SENSOR) return 2;
  if (interactionType === InteractionType.FLUID) return 4;
  return 7; // ANY
}

/**
 * Convert internal numeric itype to InteractionType singleton.
 */
export function numberToInteractionType(itype: number): InteractionType | null {
  if (itype == 1) return InteractionType.COLLISION;
  if (itype == 2) return InteractionType.SENSOR;
  if (itype == 4) return InteractionType.FLUID;
  if (itype == 7) return InteractionType.ANY;
  return null;
}

/**
 * Listener for interaction events between two interactors.
 *
 * Fires when two objects matching `options1` and `options2` start, continue, or
 * stop interacting with each other according to `interactionType`.
 *
 * Valid events: {@link CbEvent.BEGIN}, {@link CbEvent.ONGOING}, {@link CbEvent.END}.
 *
 * - `BEGIN` fires once when the interaction starts.
 * - `ONGOING` fires every simulation step while the interaction persists.
 * - `END` fires once when the interaction ends.
 *
 * @example
 * ```ts
 * const listener = new InteractionListener(
 *   CbEvent.BEGIN,
 *   InteractionType.COLLISION,
 *   playerType,
 *   groundType,
 *   (cb) => { console.log('player landed'); },
 * );
 * space.listeners.add(listener);
 * ```
 *
 * Fully modernized from nape-compiled.js lines 659–1091.
 */
export class InteractionListener extends Listener {
  /** @internal */
  zpp_inner_zn: ZPP_InteractionListener;

  /**
   * @param event - Must be `CbEvent.BEGIN`, `CbEvent.ONGOING`, or `CbEvent.END`.
   * @param interactionType - The kind of interaction to listen for (COLLISION, SENSOR, FLUID, or ANY).
   * @param options1 - Filter for the first interactor, or `null` to match any.
   * @param options2 - Filter for the second interactor, or `null` to match any.
   * @param handler - Called with an {@link InteractionCallback} each time the event fires.
   * @param precedence - Execution order relative to other listeners (higher = first). Default `0`.
   */
  constructor(
    event: CbEvent,
    interactionType: InteractionType,
    options1: OptionType | CbType | null,
    options2: OptionType | CbType | null,
    handler: (cb: InteractionCallback) => void,
    precedence = 0,
  ) {
    ZPP_Listener.internal = true;
    super();
    ZPP_Listener.internal = false;

    if (handler == null) {
      throw new Error("Error: InteractionListener::handler cannot be null");
    }
    if (event == null) {
      throw new Error("Error: CbEvent cannot be null for InteractionListener");
    }

    let xevent: number;
    if (event === CbEvent.BEGIN) {
      xevent = 0;
    } else if (event === CbEvent.END) {
      xevent = 1;
    } else if (event === CbEvent.ONGOING) {
      xevent = 6;
    } else {
      throw new Error(
        "Error: CbEvent '" +
          event.toString() +
          "' is not a valid event type for InteractionListener",
      );
    }

    this.zpp_inner_zn = new ZPP_InteractionListener(
      ZPP_OptionType.argument(options1),
      ZPP_OptionType.argument(options2),
      xevent,
      2, // type = INTERACTION
    );
    this.zpp_inner = this.zpp_inner_zn;
    this.zpp_inner.outer = this;
    this.zpp_inner_zn.outer_zni = this;
    this.zpp_inner.precedence = precedence;
    this.zpp_inner_zn.handleri = handler as (cb: any) => void;

    // Set interaction type
    if (interactionType == null) {
      throw new Error("Error: Cannot set listener interaction type to null");
    }
    const currentType = numberToInteractionType(this.zpp_inner_zn.itype);
    if (currentType != interactionType) {
      this.zpp_inner_zn.itype = interactionTypeToNumber(interactionType);
    }
  }

  /** Filter for the first interactor. Order between `options1`/`options2` does not matter. */
  get options1(): OptionType {
    return this.zpp_inner_zn.options1.outer;
  }

  set options1(options1: OptionType | CbType) {
    this.zpp_inner_zn.options1.set((options1 as any).zpp_inner);
  }

  /** Filter for the second interactor. Order between `options1`/`options2` does not matter. */
  get options2(): OptionType {
    return this.zpp_inner_zn.options2.outer;
  }

  set options2(options2: OptionType | CbType) {
    this.zpp_inner_zn.options2.set((options2 as any).zpp_inner);
  }

  /** The callback function invoked when the event fires. Cannot be set to null. */
  get handler(): (cb: InteractionCallback) => void {
    return this.zpp_inner_zn.handleri;
  }

  set handler(handler: (cb: InteractionCallback) => void) {
    if (handler == null) {
      throw new Error("Error: InteractionListener::handler cannot be null");
    }
    this.zpp_inner_zn.handleri = handler as (cb: any) => void;
  }

  /** The type of interaction this listener responds to (COLLISION, SENSOR, FLUID, or ANY). */
  get interactionType(): InteractionType | null {
    return numberToInteractionType(this.zpp_inner_zn.itype);
  }

  set interactionType(interactionType: InteractionType | null) {
    if (interactionType == null) {
      throw new Error("Error: Cannot set listener interaction type to null");
    }
    const currentType = numberToInteractionType(this.zpp_inner_zn.itype);
    if (currentType != interactionType) {
      this.zpp_inner_zn.itype = interactionTypeToNumber(interactionType);
    }
  }

  /**
   * When `true`, `ONGOING` callbacks are also fired while both interactors are sleeping.
   * Default is `false` (callbacks are suppressed when both are asleep).
   */
  get allowSleepingCallbacks(): boolean {
    return this.zpp_inner_zn.allowSleepingCallbacks;
  }

  set allowSleepingCallbacks(value: boolean) {
    this.zpp_inner_zn.allowSleepingCallbacks = value;
  }
}

// Self-register in the compiled namespace
