import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { CbType } from "./CbType";
import { OptionType } from "./OptionType";
import { InteractionType } from "./InteractionType";
import { PreFlag } from "./PreFlag";
import { Listener } from "./Listener";
import type { NapeInner, Writable } from "../geom/Vec2";

/**
 * Listener that fires before collision resolution, allowing
 * the handler to accept/ignore the interaction.
 */
export class PreListener extends Listener {
  constructor(
    interactionType: InteractionType,
    options1: CbType | OptionType,
    options2: CbType | OptionType,
    handler: (callback: NapeInner) => PreFlag | NapeInner,
    precedence: number = 0,
    pure: boolean = false,
  ) {
    super();

    (this as Writable<PreListener>)._inner = new (getNape().callbacks.PreListener)(
      interactionType,
      options1._inner,
      options2._inner,
      handler,
      precedence,
      pure,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): PreListener {
    return getOrCreate(inner, (raw) => {
      const l = Object.create(PreListener.prototype) as PreListener;
      (l as Writable<PreListener>)._inner = raw;
      return l;
    });
  }
}
