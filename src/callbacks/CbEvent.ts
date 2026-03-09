import { getNape, ensureEnumsReady } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";


/**
 * Callback event types.
 *
 * - `BEGIN`   — interaction just started
 * - `ONGOING` — interaction continues
 * - `END`     — interaction just ended
 * - `WAKE`    — body/constraint woke up
 * - `SLEEP`   — body/constraint went to sleep
 * - `BREAK`   — constraint was broken
 * - `PRE`     — pre-interaction callback
 *
 * Converted from nape-compiled.js lines 516–657.
 */
export class CbEvent {
  static __name__ = ["nape", "callbacks", "CbEvent"];

  constructor() {
    if (!ZPP_Flags.internal) {
      throw new Error("Error: Cannot instantiate CbEvent derp!");
    }
  }

  // --- Static getters for convenient access (CbEvent.BEGIN etc.) ---

  static get BEGIN(): CbEvent {
    if (ZPP_Flags.CbEvent_BEGIN == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_BEGIN = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_BEGIN;
  }
  static get ONGOING(): CbEvent {
    if (ZPP_Flags.CbEvent_ONGOING == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_ONGOING = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_ONGOING;
  }
  static get END(): CbEvent {
    if (ZPP_Flags.CbEvent_END == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_END = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_END;
  }
  static get WAKE(): CbEvent {
    if (ZPP_Flags.CbEvent_WAKE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_WAKE = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_WAKE;
  }
  static get SLEEP(): CbEvent {
    if (ZPP_Flags.CbEvent_SLEEP == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_SLEEP = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_SLEEP;
  }
  static get BREAK(): CbEvent {
    if (ZPP_Flags.CbEvent_BREAK == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_BREAK = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_BREAK;
  }
  static get PRE(): CbEvent {
    if (ZPP_Flags.CbEvent_PRE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_PRE = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_PRE;
  }

  toString(): string {
    if (this === ZPP_Flags.CbEvent_BEGIN) return "BEGIN";
    if (this === ZPP_Flags.CbEvent_ONGOING) return "ONGOING";
    if (this === ZPP_Flags.CbEvent_END) return "END";
    if (this === ZPP_Flags.CbEvent_WAKE) return "WAKE";
    if (this === ZPP_Flags.CbEvent_SLEEP) return "SLEEP";
    if (this === ZPP_Flags.CbEvent_BREAK) return "BREAK";
    if (this === ZPP_Flags.CbEvent_PRE) return "PRE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();
nape.callbacks.CbEvent = CbEvent;
ensureEnumsReady();
