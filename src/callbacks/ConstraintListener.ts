import { getNape } from "../core/engine";
import { CbEvent, toNativeCbEvent } from "./CbEvent";
import { CbType } from "./CbType";
import { OptionType } from "./OptionType";
import { Listener } from "./Listener";

/**
 * Listener that fires on constraint events (WAKE, SLEEP, BREAK).
 */
export class ConstraintListener extends Listener {
  constructor(
    event: CbEvent,
    options: CbType | OptionType,
    handler: (callback: any) => void,
    precedence: number = 0,
  ) {
    super();
    const nape = getNape();
    this._inner = new nape.callbacks.ConstraintListener(
      toNativeCbEvent(event),
      options._inner,
      handler,
      precedence,
    );
  }

  /** @internal */
  static _wrap(inner: any): ConstraintListener {
    if (!inner) return null as unknown as ConstraintListener;
    const l = Object.create(
      ConstraintListener.prototype,
    ) as ConstraintListener;
    l._inner = inner;
    return l;
  }
}
