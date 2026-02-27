import { getNape } from "../core/engine";
import { CbEvent, toNativeCbEvent } from "./CbEvent";
import { CbType } from "./CbType";
import { OptionType } from "./OptionType";
import { Listener } from "./Listener";

/**
 * Listener that fires when a body wakes, sleeps, etc.
 */
export class BodyListener extends Listener {
  /**
   * @param event     The event to listen for (WAKE, SLEEP).
   * @param options   CbType or OptionType to filter which bodies trigger this.
   * @param handler   Callback function receiving a BodyCallback.
   * @param precedence  Lower precedence listeners fire first (default 0).
   */
  constructor(
    event: CbEvent,
    options: CbType | OptionType,
    handler: (callback: any) => void,
    precedence: number = 0,
  ) {
    super();
    const nape = getNape();
    this._inner = new nape.callbacks.BodyListener(
      toNativeCbEvent(event),
      options._inner,
      handler,
      precedence,
    );
  }

  /** @internal */
  static _wrap(inner: any): BodyListener {
    if (!inner) return null as unknown as BodyListener;
    const l = Object.create(BodyListener.prototype) as BodyListener;
    l._inner = inner;
    return l;
  }
}
