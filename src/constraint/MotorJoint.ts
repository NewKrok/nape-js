import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { type NapeInner, type Writable } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";

/**
 * Motor joint — applies angular velocity to rotate bodies relative to each other.
 */
export class MotorJoint extends Constraint {
  constructor(
    body1: Body | null,
    body2: Body | null,
    rate: number,
    ratio: number = 1.0,
  ) {
    super();
    (this as Writable<MotorJoint>)._inner = new (getNape()).constraint.MotorJoint(
      body1?._inner ?? null,
      body2?._inner ?? null,
      rate,
      ratio,
    );
  }

  /** @internal */
  static _wrap(inner: NapeInner): MotorJoint {
    return getOrCreate(inner, (raw) => {
      const j = Object.create(MotorJoint.prototype) as MotorJoint;
      (j as Writable<MotorJoint>)._inner = raw;
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

  get rate(): number {
    return this._inner.get_rate();
  }
  set rate(value: number) {
    this._inner.set_rate(value);
  }

  get ratio(): number {
    return this._inner.get_ratio();
  }
  set ratio(value: number) {
    this._inner.set_ratio(value);
  }
}
