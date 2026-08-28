import { ZPP_Callback } from "../native/callbacks/ZPP_Callback";
import type { CbEvent } from "./CbEvent";
import type { Listener } from "./Listener";
import { cbEventOf } from "./Listener";

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
      throw new Error("Callback cannot be instantiated derp!");
    }
  }

  /** The event type that caused this callback to fire (e.g., `CbEvent.BEGIN`). */
  get event(): CbEvent {
    return cbEventOf(this.zpp_inner!.event);
  }

  /** The listener that this callback was fired from. */
  get listener(): Listener {
    return this.zpp_inner!.listener.outer;
  }

  toString(): string {
    return "";
  }
}
