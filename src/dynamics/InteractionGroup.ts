import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import type { NapeInner, Writable } from "../geom/Vec2";

/**
 * Hierarchical interaction group for controlling interactions
 * between sets of interactors.
 */
export class InteractionGroup {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(ignore: boolean = false) {
    this._inner = new (getNape().dynamics.InteractionGroup)(ignore);
  }

  /** @internal */
  static _wrap(inner: NapeInner): InteractionGroup {
    return getOrCreate(inner, (raw) => {
      const g = Object.create(InteractionGroup.prototype) as InteractionGroup;
      (g as Writable<InteractionGroup>)._inner = raw;
      return g;
    });
  }

  get group(): InteractionGroup {
    return InteractionGroup._wrap(this._inner.get_group());
  }
  set group(value: InteractionGroup | null) {
    this._inner.set_group(value?._inner ?? null);
  }

  get ignore(): boolean {
    return this._inner.get_ignore();
  }
  set ignore(value: boolean) {
    this._inner.set_ignore(value);
  }

  toString(): string {
    return this._inner.toString();
  }
}
