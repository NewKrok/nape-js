import { wrapWith } from "../core/registry";

/**
 * Base class for all listener types.
 * Not instantiated directly — use BodyListener, InteractionListener, etc.
 */
export class Listener {
  /** @internal */
  _inner: any;

  /** @internal */
  protected constructor() {}

  /** @internal */
  static _wrap(inner: any): Listener {
    if (!inner) return null as unknown as Listener;
    const l = Object.create(Listener.prototype) as Listener;
    l._inner = inner;
    return l;
  }

  get space(): any {
    return wrapWith("Space", this._inner.get_space());
  }
  set space(value: any) {
    this._inner.set_space(value?._inner ?? null);
  }

  get precedence(): number {
    return this._inner.get_precedence();
  }
  set precedence(value: number) {
    this._inner.set_precedence(value);
  }

  get enabled(): boolean {
    return this._inner.get_enabled();
  }
  set enabled(value: boolean) {
    this._inner.set_enabled(value);
  }

  toString(): string {
    return this._inner.toString();
  }
}
