import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Body } from "../phys/Body";
import { Constraint } from "./Constraint";
import { ZPP_MotorJoint } from "../native/constraint/ZPP_MotorJoint";

type Any = any;

/**
 * Motor joint — applies angular velocity to rotate bodies relative to each other.
 *
 * Fully modernized — uses ZPP_MotorJoint directly (extracted to TypeScript).
 */
export class MotorJoint extends Constraint {
  declare zpp_inner: ZPP_MotorJoint;

  constructor(body1: Body | null, body2: Body | null, rate: number = 0.0, ratio: number = 1.0) {
    super();

    const zpp = new ZPP_MotorJoint();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;

    // Set bodies (full constraint-space integration logic)
    this._setBody1(body1);
    this._setBody2(body2);

    // Set joint parameters with validation
    this.zpp_inner.immutable_midstep("MotorJoint::rate");
    if (rate !== rate) {
      throw new Error("Error: MotorJoint::rate cannot be NaN");
    }
    if (zpp.rate != rate) {
      zpp.rate = rate;
      zpp.wake();
    }

    this.zpp_inner.immutable_midstep("MotorJoint::ratio");
    if (ratio !== ratio) {
      throw new Error("Error: MotorJoint::ratio cannot be NaN");
    }
    if (zpp.ratio != ratio) {
      zpp.ratio = ratio;
      zpp.wake();
    }
  }

  /** @internal */
  static _wrap(inner: Any): MotorJoint {
    if (inner == null) return null!;
    if (inner instanceof MotorJoint) return inner;
    if (inner.zpp_inner?.outer instanceof MotorJoint) return inner.zpp_inner.outer;

    if (inner instanceof ZPP_MotorJoint) {
      return getOrCreate(inner, (zpp: ZPP_MotorJoint) => {
        const j = Object.create(MotorJoint.prototype) as MotorJoint;
        j.zpp_inner = zpp;
        zpp.outer = j;
        zpp.outer_zn = j;
        j.debugDraw = true;
        return j;
      });
    }

    return getOrCreate(inner, (raw: Any) => {
      const j = Object.create(MotorJoint.prototype) as MotorJoint;
      j.zpp_inner = raw.zpp_inner ?? raw;
      j.zpp_inner.outer = j;
      j.zpp_inner.outer_zn = j;
      return j;
    });
  }

  // ---------------------------------------------------------------------------
  // body1 / body2 — full constraint-space integration
  // ---------------------------------------------------------------------------

  get body1(): Body {
    if (this.zpp_inner.b1 == null) return null!;
    return Body._wrap(this.zpp_inner.b1);
  }
  set body1(value: Body | null) {
    this._setBody1(value);
  }

  /** @internal */
  private _setBody1(body1: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body1");
    const inbody1 = body1 == null ? null : (body1 as Any).zpp_inner;
    if (inbody1 != this.zpp_inner.b1) {
      if (this.zpp_inner.b1 != null) {
        if (this.zpp_inner.space != null && this.zpp_inner.b2 != this.zpp_inner.b1) {
          this.zpp_inner.b1.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b1.wake();
        }
      }
      this.zpp_inner.b1 = inbody1;
      if (this.zpp_inner.space != null && inbody1 != null && this.zpp_inner.b2 != inbody1) {
        inbody1.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody1 != null) {
          inbody1.wake();
        }
      }
    }
  }

  get body2(): Body {
    if (this.zpp_inner.b2 == null) return null!;
    return Body._wrap(this.zpp_inner.b2);
  }
  set body2(value: Body | null) {
    this._setBody2(value);
  }

  /** @internal */
  private _setBody2(body2: Body | null): void {
    this.zpp_inner.immutable_midstep("Constraint::body2");
    const inbody2 = body2 == null ? null : (body2 as Any).zpp_inner;
    if (inbody2 != this.zpp_inner.b2) {
      if (this.zpp_inner.b2 != null) {
        if (this.zpp_inner.space != null && this.zpp_inner.b1 != this.zpp_inner.b2) {
          this.zpp_inner.b2.constraints.remove(this.zpp_inner);
        }
        if (this.zpp_inner.active && this.zpp_inner.space != null) {
          this.zpp_inner.b2.wake();
        }
      }
      this.zpp_inner.b2 = inbody2;
      if (this.zpp_inner.space != null && inbody2 != null && this.zpp_inner.b1 != inbody2) {
        inbody2.constraints.add(this.zpp_inner);
      }
      if (this.zpp_inner.active && this.zpp_inner.space != null) {
        this.zpp_inner.wake();
        if (inbody2 != null) {
          inbody2.wake();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Joint-specific properties
  // ---------------------------------------------------------------------------

  get rate(): number {
    return this.zpp_inner.rate;
  }
  set rate(value: number) {
    this.zpp_inner.immutable_midstep("MotorJoint::rate");
    if (value !== value) {
      throw new Error("Error: MotorJoint::rate cannot be NaN");
    }
    if (this.zpp_inner.rate != value) {
      this.zpp_inner.rate = value;
      this.zpp_inner.wake();
    }
  }

  get ratio(): number {
    return this.zpp_inner.ratio;
  }
  set ratio(value: number) {
    this.zpp_inner.immutable_midstep("MotorJoint::ratio");
    if (value !== value) {
      throw new Error("Error: MotorJoint::ratio cannot be NaN");
    }
    if (this.zpp_inner.ratio != value) {
      this.zpp_inner.ratio = value;
      this.zpp_inner.wake();
    }
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  override impulse(): Any {
    const nape = getNape();
    const ret = new nape.geom.MatMN(1, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new Error("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner.jAcc;
    return ret;
  }

  override bodyImpulse(body: Body): Any {
    const nape = getNape();
    if (body == null) {
      throw new Error("Error: Cannot evaluate impulse on null body");
    }
    const b1outer = this.zpp_inner.b1 == null ? null : this.zpp_inner.b1.outer;
    const b2outer = this.zpp_inner.b2 == null ? null : this.zpp_inner.b2.outer;
    if (body != b1outer && body != b2outer) {
      throw new Error("Error: Body is not linked to this constraint");
    }
    if (!this.zpp_inner.active) {
      return nape.geom.Vec3.get();
    } else {
      return this.zpp_inner.bodyImpulse((body as Any).zpp_inner);
    }
  }

  override visitBodies(lambda: (body: Body) => void): void {
    const b1outer = this.zpp_inner.b1 == null ? null : this.zpp_inner.b1.outer;
    if (b1outer != null) {
      lambda(b1outer);
    }
    const b2outer = this.zpp_inner.b2 == null ? null : this.zpp_inner.b2.outer;
    if (b2outer != null && b2outer != b1outer) {
      lambda(b2outer);
    }
  }

  // ---------------------------------------------------------------------------
  // Backward-compat get_*/set_* methods for compiled code
  // ---------------------------------------------------------------------------

  /** @internal */ get_body1(): Any {
    return this.body1;
  }
  /** @internal */ set_body1(v: Any): Any {
    this.body1 = v;
    return this.body1;
  }
  /** @internal */ get_body2(): Any {
    return this.body2;
  }
  /** @internal */ set_body2(v: Any): Any {
    this.body2 = v;
    return this.body2;
  }
  /** @internal */ get_rate(): number {
    return this.rate;
  }
  /** @internal */ set_rate(v: number): number {
    this.rate = v;
    return this.zpp_inner.rate;
  }
  /** @internal */ get_ratio(): number {
    return this.ratio;
  }
  /** @internal */ set_ratio(v: number): number {
    this.ratio = v;
    return this.zpp_inner.ratio;
  }

  /** @internal backward compat alias for zpp_inner */
  get zpp_inner_zn(): ZPP_MotorJoint {
    return this.zpp_inner;
  }
  set zpp_inner_zn(v: ZPP_MotorJoint) {
    this.zpp_inner = v;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

ZPP_MotorJoint._wrapFn = (zpp: ZPP_MotorJoint): MotorJoint => {
  return getOrCreate(zpp, (raw: ZPP_MotorJoint) => {
    const j = Object.create(MotorJoint.prototype) as MotorJoint;
    j.zpp_inner = raw;
    raw.outer = j;
    raw.outer_zn = j;
    j.debugDraw = true;
    return j;
  });
};

const nape = getNape();
nape.constraint.MotorJoint = MotorJoint;
(MotorJoint.prototype as Any).__class__ = MotorJoint;

ZPP_MotorJoint._createFn = (...args: any[]) => new (MotorJoint as any)(...args);
const zpp = nape.__zpp;
zpp.constraint.ZPP_MotorJoint = ZPP_MotorJoint;
