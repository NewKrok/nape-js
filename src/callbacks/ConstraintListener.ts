import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import type { NapeInner, Writable } from "../geom/Vec2";
import { CbEvent } from "./CbEvent";
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
    (this as Writable<ConstraintListener>)._inner = new (getNape().callbacks.ConstraintListener)(
      event,
      options._inner,
      handler,
      precedence,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): ConstraintListener {
    return getOrCreate(inner, (raw) => {
      const l = Object.create(ConstraintListener.prototype) as ConstraintListener;
      (l as Writable<ConstraintListener>)._inner = raw;
      return l;
    });
  }
}
