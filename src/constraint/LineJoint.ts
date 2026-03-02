import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";

type Any = any;

/**
 * Line joint — constrains body2's anchor to slide along a line
 * defined by body1's anchor and direction.
 */
export class LineJoint extends Constraint {
  constructor(
    body1: Body | null,
    body2: Body | null,
    anchor1: Vec2,
    anchor2: Vec2,
    direction: Vec2,
    jointMin: number,
    jointMax: number,
  ) {
    super();
    const compiled = new (getNape().constraint.LineJoint)(
      body1?._inner ?? null,
      body2?._inner ?? null,
      anchor1._inner,
      anchor2._inner,
      direction._inner,
      jointMin,
      jointMax,
    );
    this.zpp_inner = compiled.zpp_inner;
    this.zpp_inner.outer = this;
    this._inner = compiled;
  }

  /** @internal */
  static _wrap(inner: Any): LineJoint {
    if (inner == null) return null!;
    if (inner instanceof LineJoint) return inner;
    if (inner.zpp_inner?.outer instanceof LineJoint) return inner.zpp_inner.outer;
    return getOrCreate(inner, (raw: Any) => {
      const j = Object.create(LineJoint.prototype) as LineJoint;
      j.zpp_inner = raw.zpp_inner ?? raw;
      j._inner = raw;
      j.zpp_inner.outer = j;
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

  get direction(): Vec2 {
    return Vec2._wrap(this._inner.get_direction());
  }
  set direction(value: Vec2) {
    this._inner.set_direction(value._inner);
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
