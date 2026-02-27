import { getNape } from "../core/engine";

/**
 * Callback type — used to tag interactors so that listeners
 * can filter which interactions they respond to.
 */
export class CbType {
  /** @internal */
  _inner: any;

  constructor() {
    const nape = getNape();
    this._inner = new nape.callbacks.CbType();
  }

  /** @internal */
  static _wrap(inner: any): CbType {
    if (!inner) return null as unknown as CbType;
    const c = Object.create(CbType.prototype) as CbType;
    c._inner = inner;
    return c;
  }

  /** Built-in type matching any body. */
  static get ANY_BODY(): CbType {
    return CbType._wrap(getNape().callbacks.CbType.get_ANY_BODY());
  }

  /** Built-in type matching any constraint. */
  static get ANY_CONSTRAINT(): CbType {
    return CbType._wrap(getNape().callbacks.CbType.get_ANY_CONSTRAINT());
  }

  /** Built-in type matching any shape. */
  static get ANY_SHAPE(): CbType {
    return CbType._wrap(getNape().callbacks.CbType.get_ANY_SHAPE());
  }

  /** Built-in type matching any compound. */
  static get ANY_COMPOUND(): CbType {
    return CbType._wrap(getNape().callbacks.CbType.get_ANY_COMPOUND());
  }
}
