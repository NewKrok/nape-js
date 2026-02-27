import { getNape } from "../core/engine";
import { Vec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";

/**
 * Weld joint — constrains two bodies to maintain a fixed relative
 * position and angle (like gluing them together).
 */
export class WeldJoint extends Constraint {
  constructor(
    body1: Body | null,
    body2: Body | null,
    anchor1: Vec2,
    anchor2: Vec2,
    phase: number = 0.0,
  ) {
    super();
    const nape = getNape();
    this._inner = new nape.constraint.WeldJoint(
      body1?._inner ?? null,
      body2?._inner ?? null,
      anchor1._inner,
      anchor2._inner,
      phase,
    );
  }

  /** @internal */
  static _wrap(inner: any): WeldJoint {
    if (!inner) return null as unknown as WeldJoint;
    const j = Object.create(WeldJoint.prototype) as WeldJoint;
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

  get phase(): number {
    return this._inner.get_phase();
  }
  set phase(value: number) {
    this._inner.set_phase(value);
  }
}
