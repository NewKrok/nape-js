import { getNape } from "../core/engine";

/**
 * Hierarchical interaction group for controlling interactions
 * between sets of interactors.
 */
export class InteractionGroup {
  /** @internal */
  _inner: any;

  constructor(ignore: boolean = false) {
    const nape = getNape();
    this._inner = new nape.dynamics.InteractionGroup(ignore);
  }

  /** @internal */
  static _wrap(inner: any): InteractionGroup {
    if (!inner) return null as unknown as InteractionGroup;
    const g = Object.create(InteractionGroup.prototype) as InteractionGroup;
    g._inner = inner;
    return g;
  }

  /** Parent group. */
  get group(): InteractionGroup {
    return InteractionGroup._wrap(this._inner.get_group());
  }
  set group(value: InteractionGroup | null) {
    this._inner.set_group(value?._inner ?? null);
  }

  /** If true, interactions between members of this group are ignored. */
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
