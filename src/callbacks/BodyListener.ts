/**
 * BodyListener — Listens for body events (WAKE/SLEEP).
 *
 * Fully modernized from nape-compiled.js lines 434–515.
 */

import { getNape } from "../core/engine";
import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import { ZPP_BodyListener } from "../native/callbacks/ZPP_BodyListener";
import { ZPP_OptionType } from "../native/callbacks/ZPP_OptionType";
import { Listener } from "./Listener";
import { CbEvent } from "./CbEvent";
import type { OptionType } from "./OptionType";
import type { CbType } from "./CbType";
import type { BodyCallback } from "./BodyCallback";

export class BodyListener extends Listener {
  static __name__ = ["nape", "callbacks", "BodyListener"];

  zpp_inner_zn: ZPP_BodyListener;

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

  get options(): OptionType {
    return this.zpp_inner_zn.options.outer;
  }

  set options(options: OptionType | CbType) {
    this.zpp_inner_zn.options.set((options as any).zpp_inner);
  }

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
