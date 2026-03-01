import { getNape } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";

type Any = any;

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
    return CbEvent.get_BEGIN();
  }
  static get ONGOING(): CbEvent {
    return CbEvent.get_ONGOING();
  }
  static get END(): CbEvent {
    return CbEvent.get_END();
  }
  static get WAKE(): CbEvent {
    return CbEvent.get_WAKE();
  }
  static get SLEEP(): CbEvent {
    return CbEvent.get_SLEEP();
  }
  static get BREAK(): CbEvent {
    return CbEvent.get_BREAK();
  }
  static get PRE(): CbEvent {
    return CbEvent.get_PRE();
  }

  // --- Lazy singleton accessors (used by compiled code) ---

  static get_BEGIN(): CbEvent {
    if (ZPP_Flags.CbEvent_BEGIN == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_BEGIN = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_BEGIN;
  }

  static get_ONGOING(): CbEvent {
    if (ZPP_Flags.CbEvent_ONGOING == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_ONGOING = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_ONGOING;
  }

  static get_END(): CbEvent {
    if (ZPP_Flags.CbEvent_END == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_END = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_END;
  }

  static get_WAKE(): CbEvent {
    if (ZPP_Flags.CbEvent_WAKE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_WAKE = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_WAKE;
  }

  static get_SLEEP(): CbEvent {
    if (ZPP_Flags.CbEvent_SLEEP == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_SLEEP = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_SLEEP;
  }

  static get_BREAK(): CbEvent {
    if (ZPP_Flags.CbEvent_BREAK == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_BREAK = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_BREAK;
  }

  static get_PRE(): CbEvent {
    if (ZPP_Flags.CbEvent_PRE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_PRE = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_PRE;
  }

  toString(): string {
    if (this === CbEvent.get_BEGIN()) return "BEGIN";
    if (this === CbEvent.get_ONGOING()) return "ONGOING";
    if (this === CbEvent.get_END()) return "END";
    if (this === CbEvent.get_WAKE()) return "WAKE";
    if (this === CbEvent.get_SLEEP()) return "SLEEP";
    if (this === CbEvent.get_BREAK()) return "BREAK";
    if (this === CbEvent.get_PRE()) return "PRE";
    return "";
  }
}

// ---------------------------------------------------------------------------
// Register this class in the compiled namespace
// ---------------------------------------------------------------------------
const nape = getNape();

// Fix prototypes of singletons created by the compiled stub at init time.
const flagKeys = [
  "CbEvent_BEGIN",
  "CbEvent_ONGOING",
  "CbEvent_END",
  "CbEvent_WAKE",
  "CbEvent_SLEEP",
  "CbEvent_BREAK",
  "CbEvent_PRE",
];
for (const key of flagKeys) {
  if ((ZPP_Flags as Any)[key] != null) {
    Object.setPrototypeOf((ZPP_Flags as Any)[key], CbEvent.prototype);
  }
}

nape.callbacks.CbEvent = CbEvent;
(CbEvent.prototype as Any).__class__ = CbEvent;
