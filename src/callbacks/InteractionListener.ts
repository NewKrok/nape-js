import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import type { NapeInner, Writable } from "../geom/Vec2";
import { CbEvent, toNativeCbEvent } from "./CbEvent";
import { CbType } from "./CbType";
import { OptionType } from "./OptionType";
import { InteractionType, toNativeInteractionType } from "./InteractionType";
import { Listener } from "./Listener";

/**
 * Listener that fires on collision/sensor/fluid interactions between bodies.
 */
export class InteractionListener extends Listener {
  /**
   * @param event           BEGIN, ONGOING, or END.
   * @param interactionType COLLISION, SENSOR, FLUID, or ANY.
   * @param options1        CbType/OptionType for the first interactor.
   * @param options2        CbType/OptionType for the second interactor.
   * @param handler         Callback receiving an InteractionCallback.
   * @param precedence      Lower values fire first (default 0).
   */
  constructor(
    event: CbEvent,
    interactionType: InteractionType,
    options1: CbType | OptionType,
    options2: CbType | OptionType,
    handler: (callback: any) => void,
    precedence: number = 0,
  ) {
    super();
    (this as Writable<InteractionListener>)._inner = new (getNape()).callbacks.InteractionListener(
      toNativeCbEvent(event),
      toNativeInteractionType(interactionType),
      options1._inner,
      options2._inner,
      handler,
      precedence,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): InteractionListener {
    return getOrCreate(inner, (raw) => {
      const l = Object.create(
        InteractionListener.prototype,
      ) as InteractionListener;
      (l as Writable<InteractionListener>)._inner = raw;
      return l;
    });
  }
}
