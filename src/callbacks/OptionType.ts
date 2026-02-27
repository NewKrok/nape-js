import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import type { NapeInner, Writable } from "../geom/Vec2";
import { CbType } from "./CbType";

/**
 * Composite callback type option — allows including and excluding CbTypes.
 */
export class OptionType {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(cbTypes?: CbType | CbType[]) {
    const nape = getNape();
    if (cbTypes instanceof CbType) {
      (this as Writable<OptionType>)._inner = new nape.callbacks.OptionType(cbTypes._inner);
    } else if (Array.isArray(cbTypes) && cbTypes.length > 0) {
      (this as Writable<OptionType>)._inner = new nape.callbacks.OptionType(cbTypes[0]._inner);
      for (let i = 1; i < cbTypes.length; i++) {
        this._inner.including(cbTypes[i]._inner);
      }
    } else {
      (this as Writable<OptionType>)._inner = new nape.callbacks.OptionType();
    }
  }

  /** @internal */
  static _wrap(inner: NapeInner): OptionType {
    return getOrCreate(inner, (raw) => {
      const o = Object.create(OptionType.prototype) as OptionType;
      (o as Writable<OptionType>)._inner = raw;
      return o;
    });
  }
}
