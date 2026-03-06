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
import type { OptionType } from "./OptionType";
import type { CbType } from "./CbType";
import type { PreCallback } from "./PreCallback";
import type { PreFlag } from "./PreFlag";

export class PreListener extends Listener {
  static __name__ = ["nape", "callbacks", "PreListener"];

  zpp_inner_zn: ZPP_InteractionListener;

  constructor(
    interactionType: InteractionType,
    options1: OptionType | CbType | null,
    options2: OptionType | CbType | null,
    handler: (cb: PreCallback) => PreFlag | null,
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
    this.zpp_inner_zn.handlerp = handler as (cb: any) => any;

    // Set interaction type
    if (interactionType == null) {
      throw new Error("Error: Cannot set listener interaction type to null");
    }
    const currentType = numberToInteractionType(this.zpp_inner_zn.itype);
    if (currentType != interactionType) {
      this.zpp_inner_zn.itype = interactionTypeToNumber(interactionType);
    }
  }

  get options1(): OptionType {
    return this.zpp_inner_zn.options1.outer;
  }

  set options1(options1: OptionType | CbType) {
    this.zpp_inner_zn.options1.set((options1 as any).zpp_inner);
  }

  get options2(): OptionType {
    return this.zpp_inner_zn.options2.outer;
  }

  set options2(options2: OptionType | CbType) {
    this.zpp_inner_zn.options2.set((options2 as any).zpp_inner);
  }

  get handler(): (cb: PreCallback) => PreFlag | null {
    return this.zpp_inner_zn.handlerp;
  }

  set handler(handler: (cb: PreCallback) => PreFlag | null) {
    if (handler == null) {
      throw new Error("Error: PreListener must take a non-null handler!");
    }
    this.zpp_inner_zn.handlerp = handler as (cb: any) => any;
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
