import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import { ZPP_Listener } from "../native/callbacks/ZPP_Listener";
import type { CbEvent } from "./CbEvent";
import type { Listener } from "./Listener";

/**
 * Base class for all physics engine callback objects.
 *
 * Callback instances are created internally by the engine and passed to listener
 * handler functions. They must not be stored beyond the scope of the handler —
 * they are pooled and reused after the handler returns.
 *
 * Concrete subclasses:
 * - {@link BodyCallback} — passed to {@link BodyListener} handlers
 * - {@link ConstraintCallback} — passed to {@link ConstraintListener} handlers
 * - {@link InteractionCallback} — passed to {@link InteractionListener} handlers
 * - {@link PreCallback} — passed to {@link PreListener} handlers
 *
 * Converted from nape-compiled.js lines 212–238.
 */
export class Callback {
  /** @internal */
  zpp_inner: ZPP_Callback | null = null;

  constructor() {
    if (!ZPP_Callback.internal) {
      throw new Error("Error: Callback cannot be instantiated derp!");
    }
  }

  /** The event type that caused this callback to fire (e.g., `CbEvent.BEGIN`). */
  get event(): CbEvent {
    return ZPP_Listener.events[this.zpp_inner!.event];
  }

  /** The listener that this callback was fired from. */
  get listener(): Listener {
    return this.zpp_inner!.listener.outer;
  }

  toString(): string {
    return "";
  }
}
