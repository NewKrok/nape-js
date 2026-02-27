import { getNape } from "../core/engine";
import { CbType } from "./CbType";

/**
 * Composite callback type option — allows including and excluding CbTypes.
 */
export class OptionType {
  /** @internal */
  _inner: any;

  constructor(cbTypes?: CbType | CbType[]) {
    const nape = getNape();
    if (cbTypes instanceof CbType) {
      this._inner = new nape.callbacks.OptionType(cbTypes._inner);
    } else if (Array.isArray(cbTypes) && cbTypes.length > 0) {
      this._inner = new nape.callbacks.OptionType(cbTypes[0]._inner);
      for (let i = 1; i < cbTypes.length; i++) {
        this._inner.including(cbTypes[i]._inner);
      }
    } else {
      this._inner = new nape.callbacks.OptionType();
    }
  }

  /** @internal */
  static _wrap(inner: any): OptionType {
    if (!inner) return null as unknown as OptionType;
    const o = Object.create(OptionType.prototype) as OptionType;
    o._inner = inner;
    return o;
  }
}
