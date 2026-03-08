import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Body } from "../phys/Body";
import { MatMN } from "../geom/MatMN";
import { Vec3 } from "../geom/Vec3";
import { Constraint } from "./Constraint";
import { ZPP_AngleJoint } from "../native/constraint/ZPP_AngleJoint";


/**
 * Constrains the relative angle between two bodies.
 *
 * Fully modernized — uses ZPP_AngleJoint directly (extracted to TypeScript).
 */
export class AngleJoint extends Constraint {
  declare zpp_inner: ZPP_AngleJoint;

  constructor(
    body1: Body | null,
    body2: Body | null,
    jointMin: number,
    jointMax: number,
    ratio: number = 1.0,
  ) {
    super();

    const zpp = new ZPP_AngleJoint();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;

    // Set bodies (full constraint-space integration logic)
    this._setBody1(body1);
    this._setBody2(body2);

    // Set joint parameters with validation
    this.zpp_inner.immutable_midstep("AngleJoint::jointMin");
    if (jointMin !== jointMin) {
      throw new Error("Error: AngleJoint::jointMin cannot be NaN");
    }
    if (zpp.jointMin != jointMin) {
      zpp.jointMin = jointMin;
      zpp.wake();
    }

    this.zpp_inner.immutable_midstep("AngleJoint::jointMax");
    if (jointMax !== jointMax) {
      throw new Error("Error: AngleJoint::jointMax cannot be NaN");
    }
    if (zpp.jointMax != jointMax) {
      zpp.jointMax = jointMax;
      zpp.wake();
    }

    this.zpp_inner.immutable_midstep("AngleJoint::ratio");
    if (ratio !== ratio) {
      throw new Error("Error: AngleJoint::ratio cannot be NaN");
    }
    if (zpp.ratio != ratio) {
      zpp.ratio = ratio;
      zpp.wake();
    }
  }

  /** @internal */
  static _wrap(inner: any): AngleJoint {
    if (inner == null) return null!;
    if (inner instanceof AngleJoint) return inner;
    if (inner.zpp_inner?.outer instanceof AngleJoint) return inner.zpp_inner.outer;

    if (inner instanceof ZPP_AngleJoint) {
      return getOrCreate(inner, (zpp: ZPP_AngleJoint) => {
        const j = Object.create(AngleJoint.prototype) as AngleJoint;
        j.zpp_inner = zpp;
        zpp.outer = j;
        zpp.outer_zn = j;
        j.debugDraw = true;
        return j;
      });
    }

    return getOrCreate(inner, (raw: any) => {
      const j = Object.create(AngleJoint.prototype) as AngleJoint;
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
    const inbody1 = body1 == null ? null : (body1 as any).zpp_inner;
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
    const inbody2 = body2 == null ? null : (body2 as any).zpp_inner;
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

  get jointMin(): number {
    return this.zpp_inner.jointMin;
  }
  set jointMin(value: number) {
    this.zpp_inner.immutable_midstep("AngleJoint::jointMin");
    if (value !== value) {
      throw new Error("Error: AngleJoint::jointMin cannot be NaN");
    }
    if (this.zpp_inner.jointMin != value) {
      this.zpp_inner.jointMin = value;
      this.zpp_inner.wake();
    }
  }

  get jointMax(): number {
    return this.zpp_inner.jointMax;
  }
  set jointMax(value: number) {
    this.zpp_inner.immutable_midstep("AngleJoint::jointMax");
    if (value !== value) {
      throw new Error("Error: AngleJoint::jointMax cannot be NaN");
    }
    if (this.zpp_inner.jointMax != value) {
      this.zpp_inner.jointMax = value;
      this.zpp_inner.wake();
    }
  }

  get ratio(): number {
    return this.zpp_inner.ratio;
  }
  set ratio(value: number) {
    this.zpp_inner.immutable_midstep("AngleJoint::ratio");
    if (value !== value) {
      throw new Error("Error: AngleJoint::ratio cannot be NaN");
    }
    if (this.zpp_inner.ratio != value) {
      this.zpp_inner.ratio = value;
      this.zpp_inner.wake();
    }
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  isSlack(): boolean {
    if (this.zpp_inner.b1 == null || this.zpp_inner.b2 == null) {
      throw new Error("Error: Cannot compute slack for AngleJoint if either body is null.");
    }
    return this.zpp_inner.is_slack();
  }

  override impulse(): MatMN {
    const nape = getNape();
    const ret = new nape.geom.MatMN(1, 1);
    if (0 >= ret.zpp_inner.m || 0 >= ret.zpp_inner.n) {
      throw new Error("Error: MatMN indices out of range");
    }
    ret.zpp_inner.x[0 * ret.zpp_inner.n] = this.zpp_inner.jAcc;
    return ret;
  }

  override bodyImpulse(body: Body): Vec3 {
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
      return nape.geom.Vec3.get(0, 0, 0);
    } else {
      return this.zpp_inner.bodyImpulse((body as any).zpp_inner);
    }
  }

  override visitBodies(lambda: (body: Body) => void): void {
    if (lambda == null) {
      throw new Error("Error: Cannot apply null lambda to bodies");
    }
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

  /** @internal */ get_body1(): Body | null {
    return this.body1;
  }
  /** @internal */ set_body1(v: Body | null): Body | null {
    this.body1 = v;
    return this.body1;
  }
  /** @internal */ get_body2(): Body | null {
    return this.body2;
  }
  /** @internal */ set_body2(v: Body | null): Body | null {
    this.body2 = v;
    return this.body2;
  }
  /** @internal */ get_jointMin(): number {
    return this.jointMin;
  }
  /** @internal */ set_jointMin(v: number): number {
    this.jointMin = v;
    return this.zpp_inner.jointMin;
  }
  /** @internal */ get_jointMax(): number {
    return this.jointMax;
  }
  /** @internal */ set_jointMax(v: number): number {
    this.jointMax = v;
    return this.zpp_inner.jointMax;
  }
  /** @internal */ get_ratio(): number {
    return this.ratio;
  }
  /** @internal */ set_ratio(v: number): number {
    this.ratio = v;
    return this.zpp_inner.ratio;
  }

  /** @internal backward compat alias for zpp_inner */
  get zpp_inner_zn(): ZPP_AngleJoint {
    return this.zpp_inner;
  }
  set zpp_inner_zn(v: ZPP_AngleJoint) {
    this.zpp_inner = v;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

ZPP_AngleJoint._wrapFn = (zpp: ZPP_AngleJoint): AngleJoint => {
  return getOrCreate(zpp, (raw: ZPP_AngleJoint) => {
    const j = Object.create(AngleJoint.prototype) as AngleJoint;
    j.zpp_inner = raw;
    raw.outer = j;
    raw.outer_zn = j;
    j.debugDraw = true;
    return j;
  });
};

