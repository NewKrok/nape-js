/**
 * InteractionListener — Listens for interaction events (BEGIN/END/ONGOING).
 *
 * Fully modernized from nape-compiled.js lines 659–1091.
 */

import { getNape } from "../core/engine";
import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import { ZPP_InteractionListener } from "../native/callbacks/ZPP_InteractionListener";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import { ZPP_Flags } from "../native/util/ZPP_Flags";
import { Listener } from "./Listener";
import { CbEvent } from "./CbEvent";
import { InteractionType } from "./InteractionType";

type Any = any;

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

export class InteractionListener extends Listener {
  static __name__ = ["nape", "callbacks", "InteractionListener"];

  zpp_inner_zn: ZPP_InteractionListener;

  constructor(
    event: CbEvent,
    interactionType: InteractionType,
    options1: Any,
    options2: Any,
    handler: (cb: Any) => void,
    precedence = 0,
  ) {
    ZPP_Listener.internal = true;
    super();
    ZPP_Listener.internal = false;

    if (handler == null) {
      throw new Error("Error: InteractionListener::handler cannot be null");
    }
    if (event == null) {
      throw new Error(
        "Error: CbEvent cannot be null for InteractionListener",
      );
    }

    let xevent = -1;
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
    this.zpp_inner_zn.handleri = handler;

    // Set interaction type
    if (interactionType == null) {
      throw new Error(
        "Error: Cannot set listener interaction type to null",
      );
    }
    const currentType = numberToInteractionType(this.zpp_inner_zn.itype);
    if (currentType != interactionType) {
      this.zpp_inner_zn.itype = interactionTypeToNumber(interactionType);
    }
  }

  get options1(): Any {
    return this.zpp_inner_zn.options1.outer;
  }

  set options1(options1: Any) {
    this.zpp_inner_zn.options1.set(options1.zpp_inner);
  }

  get options2(): Any {
    return this.zpp_inner_zn.options2.outer;
  }

  set options2(options2: Any) {
    this.zpp_inner_zn.options2.set(options2.zpp_inner);
  }

  get handler(): (cb: Any) => void {
    return this.zpp_inner_zn.handleri;
  }

  set handler(handler: (cb: Any) => void) {
    if (handler == null) {
      throw new Error("Error: InteractionListener::handler cannot be null");
    }
    this.zpp_inner_zn.handleri = handler;
  }

  get interactionType(): InteractionType | null {
    return numberToInteractionType(this.zpp_inner_zn.itype);
  }

  set interactionType(interactionType: InteractionType | null) {
    if (interactionType == null) {
      throw new Error(
        "Error: Cannot set listener interaction type to null",
      );
    }
    const currentType = numberToInteractionType(this.zpp_inner_zn.itype);
    if (currentType != interactionType) {
      this.zpp_inner_zn.itype = interactionTypeToNumber(interactionType);
    }
  }

  get allowSleepingCallbacks(): boolean {
    return this.zpp_inner_zn.allowSleepingCallbacks;
  }

  set allowSleepingCallbacks(value: boolean) {
    this.zpp_inner_zn.allowSleepingCallbacks = value;
  }
}

// Self-register in the compiled namespace
const nape = getNape();
nape.callbacks.InteractionListener = InteractionListener;
(InteractionListener.prototype as Any).__class__ = InteractionListener;
