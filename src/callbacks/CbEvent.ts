import { getNape, ensureEnumsReady } from "../core/engine";
import { ZPP_Flags } from "../native/util/ZPP_Flags";


/**
 * Enumeration of physics callback event types.
 *
 * Use these singletons to specify which phase of an interaction a listener
 * should respond to:
 *
 * - `BEGIN`   — fired once when two interactors first make contact
 * - `ONGOING` — fired every simulation step while the interaction persists
 * - `END`     — fired once when two interactors separate
 * - `WAKE`    — fired when a body or constraint wakes from sleep
 * - `SLEEP`   — fired when a body or constraint falls asleep
 * - `BREAK`   — fired when a constraint exceeds its `maxForce`/`maxError` and breaks
 * - `PRE`     — fired before collision resolution; allows per-step accept/ignore decisions
 *
 * Valid events per listener type:
 * - {@link BodyListener}: `WAKE`, `SLEEP`
 * - {@link ConstraintListener}: `WAKE`, `SLEEP`, `BREAK`
 * - {@link InteractionListener}: `BEGIN`, `ONGOING`, `END`
 * - {@link PreListener}: always `PRE` (set internally)
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

  /** Interaction-start event. Fired once when two interactors first make contact. */
  static get BEGIN(): CbEvent {
    if (ZPP_Flags.CbEvent_BEGIN == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_BEGIN = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_BEGIN;
  }
  /** Interaction-continue event. Fired every step while the interaction persists. */
  static get ONGOING(): CbEvent {
    if (ZPP_Flags.CbEvent_ONGOING == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_ONGOING = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_ONGOING;
  }
  /** Interaction-end event. Fired once when two interactors separate. */
  static get END(): CbEvent {
    if (ZPP_Flags.CbEvent_END == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_END = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_END;
  }
  /** Wake event. Fired when a body or constraint wakes from sleep. */
  static get WAKE(): CbEvent {
    if (ZPP_Flags.CbEvent_WAKE == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_WAKE = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_WAKE;
  }
  /** Sleep event. Fired when a body or constraint falls asleep. */
  static get SLEEP(): CbEvent {
    if (ZPP_Flags.CbEvent_SLEEP == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_SLEEP = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_SLEEP;
  }
  /** Break event. Fired when a constraint exceeds its `maxForce` or `maxError` limit. */
  static get BREAK(): CbEvent {
    if (ZPP_Flags.CbEvent_BREAK == null) {
      ZPP_Flags.internal = true;
      ZPP_Flags.CbEvent_BREAK = new CbEvent();
      ZPP_Flags.internal = false;
    }
    return ZPP_Flags.CbEvent_BREAK;
  }
  /** Pre-interaction event. Fired before collision resolution; handler can accept or ignore. */
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
