import { getNape } from "../core/engine";
import { CbType } from "./CbType";
import { OptionType } from "./OptionType";
import { InteractionType, toNativeInteractionType } from "./InteractionType";
import { PreFlag, toNativePreFlag } from "./PreFlag";
import { Listener } from "./Listener";

/**
 * Listener that fires before collision resolution, allowing
 * the handler to accept/ignore the interaction.
 */
export class PreListener extends Listener {
  constructor(
    interactionType: InteractionType,
    options1: CbType | OptionType,
    options2: CbType | OptionType,
    handler: (callback: any) => any,
    precedence: number = 0,
    pure: boolean = false,
  ) {
    super();
    const nape = getNape();

    // Wrap handler to auto-convert PreFlag enum values to native
    const wrappedHandler = (cb: any) => {
      const result = handler(cb);
      if (typeof result === "string" && result in PreFlag) {
        return toNativePreFlag(result as PreFlag);
      }
      return result;
    };

    this._inner = new nape.callbacks.PreListener(
      toNativeInteractionType(interactionType),
      options1._inner,
      options2._inner,
      wrappedHandler,
      precedence,
      pure,
    );
  }

  /** @internal */
  static _wrap(inner: any): PreListener {
    if (!inner) return null as unknown as PreListener;
    const l = Object.create(PreListener.prototype) as PreListener;
    l._inner = inner;
    return l;
  }
}
