import { getNape } from "../core/engine";
import { Vec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";

/**
 * Constrains the distance between two anchor points on two bodies.
 */
export class DistanceJoint extends Constraint {
  constructor(
    body1: Body | null,
    body2: Body | null,
    anchor1: Vec2,
    anchor2: Vec2,
    jointMin: number,
    jointMax: number,
  ) {
    super();
    const nape = getNape();
    this._inner = new nape.constraint.DistanceJoint(
      body1?._inner ?? null,
      body2?._inner ?? null,
      anchor1._inner,
      anchor2._inner,
      jointMin,
      jointMax,
    );
  }

  /** @internal */
  static _wrap(inner: any): DistanceJoint {
    if (!inner) return null as unknown as DistanceJoint;
    const j = Object.create(DistanceJoint.prototype) as DistanceJoint;
    j._inner = inner;
    return j;
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
}
