/**
 * PreListener — Listens for pre-interaction events.
 *
 * Allows the handler to accept/ignore interactions before collision resolution.
 *
 * Fully modernized from nape-compiled.js lines 1142–1338.
 */

import { getNape } from "../core/engine";
import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import { ZPP_InteractionListener } from "../native/callbacks/ZPP_InteractionListener";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import { Listener } from "./Listener";
import { InteractionType } from "./InteractionType";
import { interactionTypeToNumber, numberToInteractionType } from "./InteractionListener";

type Any = any;

export class PreListener extends Listener {
  static __name__ = ["nape", "callbacks", "PreListener"];

  zpp_inner_zn: ZPP_InteractionListener;

  constructor(
    interactionType: InteractionType,
    options1: Any,
    options2: Any,
    handler: (cb: Any) => Any,
    precedence = 0,
    pure = false,
  ) {
    ZPP_Listener.internal = true;
    super();
    ZPP_Listener.internal = false;

    if (handler == null) {
      throw new Error("Error: PreListener must take a handler!");
    }

    this.zpp_inner_zn = new ZPP_InteractionListener(
      ZPP_OptionType.argument(options1),
      ZPP_OptionType.argument(options2),
      5, // event = PRE
      3, // type = PRE
    );
    this.zpp_inner = this.zpp_inner_zn;
    this.zpp_inner.outer = this;
    this.zpp_inner_zn.outer_znp = this;
    this.zpp_inner.precedence = precedence;
    this.zpp_inner_zn.pure = pure;
    this.zpp_inner_zn.handlerp = handler;

    // Set interaction type
    if (interactionType == null) {
      throw new Error("Error: Cannot set listener interaction type to null");
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

  get handler(): (cb: Any) => Any {
    return this.zpp_inner_zn.handlerp;
  }

  set handler(handler: (cb: Any) => Any) {
    if (handler == null) {
      throw new Error("Error: PreListener must take a non-null handler!");
    }
    this.zpp_inner_zn.handlerp = handler;
    this.zpp_inner_zn.wake();
  }

  get pure(): boolean {
    return this.zpp_inner_zn.pure;
  }

  set pure(pure: boolean) {
    if (!pure) {
      this.zpp_inner_zn.wake();
    }
    this.zpp_inner_zn.pure = pure;
  }

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
}

// Self-register in the compiled namespace
const nape = getNape();
nape.callbacks.PreListener = PreListener;
(PreListener.prototype as Any).__class__ = PreListener;
