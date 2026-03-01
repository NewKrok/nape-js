import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "./Vec2";
import { AABB } from "./AABB";

/**
 * A ray for raycasting queries.
 *
 * Thin wrapper around the compiled Ray implementation.
 * Full modernization (replacing compiled code) is pending ZPP_Ray extraction.
 */
export class Ray {
  /** @internal */
  readonly _inner: NapeInner;

  constructor(origin: Vec2, direction: Vec2) {
    this._inner = new (getNape().geom.Ray)(origin._inner, direction._inner);
  }

  /** @internal */
  static _wrap(inner: NapeInner): Ray {
    return getOrCreate(inner, (raw) => {
      const r = Object.create(Ray.prototype) as Ray;
      (r as Writable<Ray>)._inner = raw;
      return r;
    });
  }

  // ---------------------------------------------------------------------------
  // Static factories
  // ---------------------------------------------------------------------------

  static fromSegment(start: Vec2, end: Vec2): Ray {
    return Ray._wrap(getNape().geom.Ray.fromSegment(start._inner, end._inner));
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get origin(): Vec2 {
    return Vec2._wrap(this._inner.get_origin());
  }
  set origin(value: Vec2) {
    this._inner.set_origin(value._inner);
  }

  get direction(): Vec2 {
    return Vec2._wrap(this._inner.get_direction());
  }
  set direction(value: Vec2) {
    this._inner.set_direction(value._inner);
  }

  get maxDistance(): number {
    return this._inner.get_maxDistance();
  }
  set maxDistance(value: number) {
    this._inner.set_maxDistance(value);
  }

  get userData(): Record<string, unknown> {
    return this._inner.get_userData();
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  aabb(): AABB {
    return AABB._wrap(this._inner.aabb());
  }

  at(distance: number, weak: boolean = false): Vec2 {
    return Vec2._wrap(this._inner.at(distance, weak));
  }

  copy(): Ray {
    return Ray._wrap(this._inner.copy());
  }
}
