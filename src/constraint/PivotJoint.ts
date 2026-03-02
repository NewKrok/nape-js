import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";

type Any = any;

/**
 * A pivot (pin) joint that constrains two bodies to share an anchor point.
 */
export class PivotJoint extends Constraint {
  constructor(body1: Body | null, body2: Body | null, anchor1: Vec2, anchor2: Vec2) {
    super();
    const compiled = new (getNape().constraint.PivotJoint)(
      body1?._inner ?? null,
      body2?._inner ?? null,
      anchor1._inner,
      anchor2._inner,
    );
    this.zpp_inner = compiled.zpp_inner;
    this.zpp_inner.outer = this;
    this._inner = compiled;
  }

  /** @internal */
  static _wrap(inner: Any): PivotJoint {
    if (inner == null) return null!;
    if (inner instanceof PivotJoint) return inner;
    if (inner.zpp_inner?.outer instanceof PivotJoint) return inner.zpp_inner.outer;
    return getOrCreate(inner, (raw: Any) => {
      const j = Object.create(PivotJoint.prototype) as PivotJoint;
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
}
