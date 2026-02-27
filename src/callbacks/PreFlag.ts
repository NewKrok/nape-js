import { getNape } from "../core/engine";

/**
 * Return value flags for PreListener handlers.
 */
export enum PreFlag {
  ACCEPT = "ACCEPT",
  IGNORE = "IGNORE",
  ACCEPT_ONCE = "ACCEPT_ONCE",
  IGNORE_ONCE = "IGNORE_ONCE",
}

/** @internal */
export function toNativePreFlag(flag: PreFlag): any {
  const nape = getNape();
  switch (flag) {
    case PreFlag.ACCEPT:
      return nape.callbacks.PreFlag.get_ACCEPT();
    case PreFlag.IGNORE:
      return nape.callbacks.PreFlag.get_IGNORE();
    case PreFlag.ACCEPT_ONCE:
      return nape.callbacks.PreFlag.get_ACCEPT_ONCE();
    case PreFlag.IGNORE_ONCE:
      return nape.callbacks.PreFlag.get_IGNORE_ONCE();
  }
}
