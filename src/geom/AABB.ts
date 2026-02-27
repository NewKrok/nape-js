import { getNape } from "../core/engine";
import { Vec2 } from "./Vec2";

/**
 * Axis-aligned bounding box defined by min/max corners or x/y/width/height.
 */
export class AABB {
  /** @internal */
  _inner: any;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    const nape = getNape();
    this._inner = new nape.geom.AABB(x, y, width, height);
  }

  /** @internal */
  static _wrap(inner: any): AABB {
    if (!inner) return null as unknown as AABB;
    const a = Object.create(AABB.prototype) as AABB;
    a._inner = inner;
    return a;
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  get min(): Vec2 {
    return Vec2._wrap(this._inner.get_min());
  }
  set min(value: Vec2) {
    this._inner.set_min(value._inner);
  }

  get max(): Vec2 {
    return Vec2._wrap(this._inner.get_max());
  }
  set max(value: Vec2) {
    this._inner.set_max(value._inner);
  }

  get x(): number {
    return this._inner.get_x();
  }
  set x(value: number) {
    this._inner.set_x(value);
  }

  get y(): number {
    return this._inner.get_y();
  }
  set y(value: number) {
    this._inner.set_y(value);
  }

  get width(): number {
    return this._inner.get_width();
  }
  set width(value: number) {
    this._inner.set_width(value);
  }

  get height(): number {
    return this._inner.get_height();
  }
  set height(value: number) {
    this._inner.set_height(value);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  copy(): AABB {
    return AABB._wrap(this._inner.copy());
  }

  toString(): string {
    return this._inner.toString();
  }
}
