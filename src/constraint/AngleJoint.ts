import { getNape } from "../core/engine";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";

/**
 * Constrains the relative angle between two bodies.
 */
export class AngleJoint extends Constraint {
  constructor(
    body1: Body | null,
    body2: Body | null,
    jointMin: number,
    jointMax: number,
    ratio: number = 1.0,
  ) {
    super();
    const nape = getNape();
    this._inner = new nape.constraint.AngleJoint(
      body1?._inner ?? null,
      body2?._inner ?? null,
      jointMin,
      jointMax,
      ratio,
    );
  }

  /** @internal */
  static _wrap(inner: any): AngleJoint {
    if (!inner) return null as unknown as AngleJoint;
    const j = Object.create(AngleJoint.prototype) as AngleJoint;
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
