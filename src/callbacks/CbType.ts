import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import type { NapeInner, Writable } from "../geom/Vec2";

/**
 * Callback type — used to tag interactors so that listeners
 * can filter which interactions they respond to.
 */
export class CbType {
  /** @internal */
  readonly _inner: NapeInner;

  constructor() {
    (this as Writable<CbType>)._inner = new (getNape()).callbacks.CbType();
  }

  /** @internal */
  static _wrap(inner: NapeInner): CbType {
    return getOrCreate(inner, (raw) => {
      const c = Object.create(CbType.prototype) as CbType;
      (c as Writable<CbType>)._inner = raw;
      return c;
    });
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
