import { getNape } from "../core/engine";
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
    const nape = getNape();
    this._inner = new nape.constraint.MotorJoint(
      body1?._inner ?? null,
      body2?._inner ?? null,
      rate,
      ratio,
    );
  }

  /** @internal */
  static _wrap(inner: any): MotorJoint {
    if (!inner) return null as unknown as MotorJoint;
    const j = Object.create(MotorJoint.prototype) as MotorJoint;
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
