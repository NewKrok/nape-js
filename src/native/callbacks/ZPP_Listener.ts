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
  static __name__ = ["zpp_nape", "callbacks", "ZPP_Listener"];

  // --- Static: namespace references ---
  static _nape: any = null;
  static _zpp: any = null;

  // --- Static: internal flag (prevents direct instantiation from public API) ---
  static internal = false;

  // --- Static: types and events arrays (initialized at engine init time) ---
  static types: any[] = [];
  static events: any[] = [];

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

  /**
   * Initialize singleton enum arrays. Called once from compiled factory after
   * nape.callbacks.ListenerType and nape.callbacks.CbEvent stubs exist.
   */
  static _initEnums(nape: any, ZPP_Flags: any): void {
    // ListenerType singletons
    const mkLT = () => {
      ZPP_Flags.internal = true;
      const o = new nape.callbacks.ListenerType();
      ZPP_Flags.internal = false;
      return o;
    };
    if (ZPP_Flags.ListenerType_BODY == null) ZPP_Flags.ListenerType_BODY = mkLT();
    if (ZPP_Flags.ListenerType_CONSTRAINT == null) ZPP_Flags.ListenerType_CONSTRAINT = mkLT();
    if (ZPP_Flags.ListenerType_INTERACTION == null) ZPP_Flags.ListenerType_INTERACTION = mkLT();
    if (ZPP_Flags.ListenerType_PRE == null) ZPP_Flags.ListenerType_PRE = mkLT();
    ZPP_Listener.types = [
      ZPP_Flags.ListenerType_BODY,
      ZPP_Flags.ListenerType_CONSTRAINT,
      ZPP_Flags.ListenerType_INTERACTION,
      ZPP_Flags.ListenerType_PRE,
    ];

    // CbEvent singletons
    const mkCE = () => {
      ZPP_Flags.internal = true;
      const o = new nape.callbacks.CbEvent();
      ZPP_Flags.internal = false;
      return o;
    };
    if (ZPP_Flags.CbEvent_BEGIN == null) ZPP_Flags.CbEvent_BEGIN = mkCE();
    if (ZPP_Flags.CbEvent_END == null) ZPP_Flags.CbEvent_END = mkCE();
    if (ZPP_Flags.CbEvent_WAKE == null) ZPP_Flags.CbEvent_WAKE = mkCE();
    if (ZPP_Flags.CbEvent_SLEEP == null) ZPP_Flags.CbEvent_SLEEP = mkCE();
    if (ZPP_Flags.CbEvent_BREAK == null) ZPP_Flags.CbEvent_BREAK = mkCE();
    if (ZPP_Flags.CbEvent_PRE == null) ZPP_Flags.CbEvent_PRE = mkCE();
    if (ZPP_Flags.CbEvent_ONGOING == null) ZPP_Flags.CbEvent_ONGOING = mkCE();
    ZPP_Listener.events = [
      ZPP_Flags.CbEvent_BEGIN,
      ZPP_Flags.CbEvent_END,
      ZPP_Flags.CbEvent_WAKE,
      ZPP_Flags.CbEvent_SLEEP,
      ZPP_Flags.CbEvent_BREAK,
      ZPP_Flags.CbEvent_PRE,
      ZPP_Flags.CbEvent_ONGOING,
    ];
  }
}
