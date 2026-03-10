/**
 * PreListener — Listens for pre-interaction events.
 *
 * Allows the handler to accept/ignore interactions before collision resolution.
 *
 * Fully modernized from nape-compiled.js lines 1142–1338.
 */

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

/**
 * Pre-interaction listener — called before collision resolution each step.
 *
 * The handler receives a {@link PreCallback} and returns a {@link PreFlag} that
 * determines whether and how the interaction should be processed:
 * - `PreFlag.ACCEPT` — resolve the interaction normally (default).
 * - `PreFlag.IGNORE` — suppress the interaction permanently (until next `BEGIN`).
 * - `PreFlag.ACCEPT_ONCE` — accept this step, then revert to default.
 * - `PreFlag.IGNORE_ONCE` — ignore this step only.
 *
 * Returning `null` is equivalent to `ACCEPT`.
 *
 * The event is always {@link CbEvent.PRE} and cannot be changed.
 *
 * **Pure mode**: when `pure` is `true` the engine caches the handler result and
 * does not re-invoke it until the result is reset. This is an optimisation — only
 * use `pure` when the handler will always return the same flag for a given pair.
 *
 * @example
 * ```ts
 * const preListener = new PreListener(
 *   InteractionType.COLLISION,
 *   playerType,
 *   onewayPlatformType,
 *   (cb) => cb.arbiter.collisionArbiter!.normal.y > 0
 *     ? PreFlag.ACCEPT
 *     : PreFlag.IGNORE,
 * );
 * space.listeners.add(preListener);
 * ```
 *
 * Fully modernized from nape-compiled.js lines 1142–1338.
 */
export class PreListener extends Listener {
  static __name__ = ["nape", "callbacks", "PreListener"];

  /** @internal */
  zpp_inner_zn: ZPP_InteractionListener;

  /**
   * @param interactionType - The kind of interaction to intercept (COLLISION, SENSOR, FLUID, or ANY).
   * @param options1 - Filter for the first interactor, or `null` to match any.
   * @param options2 - Filter for the second interactor, or `null` to match any.
   * @param handler - Called each step; return a {@link PreFlag} to control the interaction.
   * @param precedence - Execution order relative to other listeners (higher = first). Default `0`.
   * @param pure - Enable caching of the handler result. Default `false`.
   */
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

  /** Filter for the first interactor. Order does not matter. */
  get options1(): OptionType {
    return this.zpp_inner_zn.options1.outer;
  }

  set options1(options1: OptionType | CbType) {
    this.zpp_inner_zn.options1.set((options1 as any).zpp_inner);
  }

  /** Filter for the second interactor. Order does not matter. */
  get options2(): OptionType {
    return this.zpp_inner_zn.options2.outer;
  }

  set options2(options2: OptionType | CbType) {
    this.zpp_inner_zn.options2.set((options2 as any).zpp_inner);
  }

  /**
   * The handler called before each collision resolution step.
   * Return a {@link PreFlag} to accept/ignore the interaction, or `null` to accept.
   */
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

  /**
   * When `true`, the engine caches the handler return value and does not
   * re-invoke the handler until the cached result is invalidated.
   *
   * Only use `pure` mode when the handler always returns the same flag for a
   * given pair of interactors. Setting `pure` to `false` immediately invalidates
   * any cached result.
   */
  get pure(): boolean {
    return this.zpp_inner_zn.pure;
  }

  set pure(pure: boolean) {
    if (!pure) {
      this.zpp_inner_zn.wake();
    }
    this.zpp_inner_zn.pure = pure;
  }

  /** The type of interaction this pre-listener intercepts (COLLISION, SENSOR, FLUID, or ANY). */
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
