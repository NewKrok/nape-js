import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2, type NapeInner, type Writable } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";

/**
 * Pulley joint — constrains the sum of distances between four anchor points
 * on four bodies.
 */
export class PulleyJoint extends Constraint {
  constructor(
    body1: Body | null,
    body2: Body | null,
    body3: Body | null,
    body4: Body | null,
    anchor1: Vec2,
    anchor2: Vec2,
    anchor3: Vec2,
    anchor4: Vec2,
    jointMin: number,
    jointMax: number,
    ratio: number = 1.0,
  ) {
    super();
    (this as Writable<PulleyJoint>)._inner = new (getNape().constraint.PulleyJoint)(
      body1?._inner ?? null,
      body2?._inner ?? null,
      body3?._inner ?? null,
      body4?._inner ?? null,
      anchor1._inner,
      anchor2._inner,
      anchor3._inner,
      anchor4._inner,
      jointMin,
      jointMax,
      ratio,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): PulleyJoint {
    return getOrCreate(inner, (raw) => {
      const j = Object.create(PulleyJoint.prototype) as PulleyJoint;
      (j as Writable<PulleyJoint>)._inner = raw;
      return j;
    });
  }

  get body1(): Body {
    return Body._wrap(this._inner.get_body1());
  }
  set body1(value: Body | null) {
    this._inner.set_body1(value?._inner ?? null);
  }

  get body2(): Body {
    return Body._wrap(this._inner.get_body2());
  }
  set body2(value: Body | null) {
    this._inner.set_body2(value?._inner ?? null);
  }

  get body3(): Body {
    return Body._wrap(this._inner.get_body3());
  }
  set body3(value: Body | null) {
    this._inner.set_body3(value?._inner ?? null);
  }

  get body4(): Body {
    return Body._wrap(this._inner.get_body4());
  }
  set body4(value: Body | null) {
    this._inner.set_body4(value?._inner ?? null);
  }

  get anchor1(): Vec2 {
    return Vec2._wrap(this._inner.get_anchor1());
  }
  set anchor1(value: Vec2) {
    this._inner.set_anchor1(value._inner);
  }

  get anchor2(): Vec2 {
    return Vec2._wrap(this._inner.get_anchor2());
  }
  set anchor2(value: Vec2) {
    this._inner.set_anchor2(value._inner);
  }

  get anchor3(): Vec2 {
    return Vec2._wrap(this._inner.get_anchor3());
  }
  set anchor3(value: Vec2) {
    this._inner.set_anchor3(value._inner);
  }

  get anchor4(): Vec2 {
    return Vec2._wrap(this._inner.get_anchor4());
  }
  set anchor4(value: Vec2) {
    this._inner.set_anchor4(value._inner);
  }

  get jointMin(): number {
    return this._inner.get_jointMin();
  }
  set jointMin(value: number) {
    this._inner.set_jointMin(value);
  }

  get jointMax(): number {
    return this._inner.get_jointMax();
  }
  set jointMax(value: number) {
    this._inner.set_jointMax(value);
  }

  get ratio(): number {
    return this._inner.get_ratio();
  }
  set ratio(value: number) {
    this._inner.set_ratio(value);
  }
}
