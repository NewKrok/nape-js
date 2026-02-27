import { getNape } from "../core/engine";

/**
 * Callback event types.
 */
export enum CbEvent {
  BEGIN = "BEGIN",
  ONGOING = "ONGOING",
  END = "END",
  WAKE = "WAKE",
  SLEEP = "SLEEP",
  BREAK = "BREAK",
  PRE = "PRE",
}

/** @internal */
export function toNativeCbEvent(event: CbEvent): any {
  const nape = getNape();
  switch (event) {
    case CbEvent.BEGIN:
      return nape.callbacks.CbEvent.get_BEGIN();
    case CbEvent.ONGOING:
      return nape.callbacks.CbEvent.get_ONGOING();
    case CbEvent.END:
      return nape.callbacks.CbEvent.get_END();
    case CbEvent.WAKE:
      return nape.callbacks.CbEvent.get_WAKE();
    case CbEvent.SLEEP:
      return nape.callbacks.CbEvent.get_SLEEP();
    case CbEvent.BREAK:
      return nape.callbacks.CbEvent.get_BREAK();
    case CbEvent.PRE:
      return nape.callbacks.CbEvent.get_PRE();
  }
}
