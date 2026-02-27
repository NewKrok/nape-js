import { getOrCreate } from "../core/cache";
import { Space } from "../space/Space";
import type { NapeInner, Writable } from "../geom/Vec2";

/**
 * Base class for all listener types.
 * Not instantiated directly — use BodyListener, InteractionListener, etc.
 */
export class Listener {
  /** @internal */
  readonly _inner: NapeInner;

  /** @internal */
  protected constructor() {
    (this as Writable<Listener>)._inner = undefined!;
  }

  /** @internal */
  static _wrap(inner: NapeInner): Listener {
    return getOrCreate(inner, (raw) => {
      const l = Object.create(Listener.prototype) as Listener;
      (l as Writable<Listener>)._inner = raw;
      return l;
    });
  }

  get space(): Space {
    return Space._wrap(this._inner.get_space());
  }
  set space(value: Space | null) {
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
