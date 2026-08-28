/**
 * ZPP_Listener — Internal listener base class for the nape physics engine.
 *
 * Base class for ZPP_BodyListener, ZPP_ConstraintListener, and
 * ZPP_InteractionListener. Holds common properties (space, precedence,
 * event type, listener type) and provides stub methods for subclass override.
 *
 * Converted from nape-compiled.js lines 27259–27304, 112053–112139.
 */

import { ZPP_ID } from "../util/ZPP_ID";

export class ZPP_Listener {
  // --- Static: Haxe metadata ---

  // --- Static: namespace references ---
  static _nape: any = null;
  static _zpp: any = null;

  // --- Static: internal flag (prevents direct instantiation from public API) ---
  static internal = false;

  // --- Static: types and events arrays (initialized at engine init time) ---

  // --- Instance ---
  space: any = null;
  interaction: any = null;
  constraint: any = null;
  body: any = null;
  precedence = 0;
  event = 0;
  type = 0;
  id = 0;
  outer: any = null;

  constructor() {
    this.id = ZPP_ID.Listener();
  }

  /** Sort comparator: higher precedence first, then by id descending. */
  static setlt(a: ZPP_Listener, b: ZPP_Listener): boolean {
    if (a.precedence <= b.precedence) {
      if (a.precedence == b.precedence) {
        return a.id > b.id;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  // --- Subclass hooks (overridden by ZPP_BodyListener, etc.) ---
  swapEvent(_event?: number): void {}
  invalidate_precedence(): void {}
  addedToSpace(): void {}
  removedFromSpace(): void {}
}
