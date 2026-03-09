import { getNape } from "../core/engine";
import { getOrCreate } from "../core/cache";
import { Vec2 } from "../geom/Vec2";
import { Body } from "../phys/Body";
import { MatMN } from "../geom/MatMN";
import { Vec3 } from "../geom/Vec3";
import { Constraint } from "./Constraint";
import { ZPP_PivotJoint } from "../native/constraint/ZPP_PivotJoint";


/** Read validated x from a Vec2 input. */
function _readVec2X(v: Vec2): number {
  if ((v as any).zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.x;
}

/** Read validated y from a Vec2 input. */
function _readVec2Y(v: Vec2): number {
  if ((v as any).zpp_disp) {
    throw new Error("Error: Vec2 has been disposed and cannot be used!");
  }
  const inner = v.zpp_inner;
  if (inner._validate != null) inner._validate();
  return inner.y;
}

/** Dispose a Vec2 if it is weak. */
function _disposeWeakVec2(v: Vec2): void {
  if (v.zpp_inner.weak) {
    v.dispose();
  }
}

/**
 * A pivot (pin) joint that constrains two bodies to share an anchor point.
 *
 * Fully modernized — uses ZPP_PivotJoint directly (extracted to TypeScript).
 */
export class PivotJoint extends Constraint {
  declare zpp_inner: ZPP_PivotJoint;

  constructor(body1: Body | null, body2: Body | null, anchor1: Vec2, anchor2: Vec2) {
    super();

    const zpp = new ZPP_PivotJoint();
    this.zpp_inner = zpp;
    zpp.outer = this;
    zpp.outer_zn = this;

    // Set bodies
    this._setBody1(body1);
    this._setBody2(body2);

    // Set anchor1
    if ((anchor1 as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (anchor1 == null) {
      throw new Error("Error: Constraint::anchor1 cannot be null");
    }
    zpp.a1localx = _readVec2X(anchor1);
    zpp.a1localy = _readVec2Y(anchor1);
    _disposeWeakVec2(anchor1);

    // Set anchor2
    if ((anchor2 as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (anchor2 == null) {
      throw new Error("Error: Constraint::anchor2 cannot be null");
    }
    zpp.a2localx = _readVec2X(anchor2);
    zpp.a2localy = _readVec2Y(anchor2);
    _disposeWeakVec2(anchor2);
  }

  /** @internal */
  static _wrap(inner: any): PivotJoint {
    if (inner == null) return null!;
    if (inner instanceof PivotJoint) return inner;
    if (inner.zpp_inner?.outer instanceof PivotJoint) return inner.zpp_inner.outer;

    if (inner instanceof ZPP_PivotJoint) {
      return getOrCreate(inner, (zpp: ZPP_PivotJoint) => {
        const j = Object.create(PivotJoint.prototype) as PivotJoint;
        j.zpp_inner = zpp;
        zpp.outer = j;
        zpp.outer_zn = j;
        j.debugDraw = true;
        return j;
      });
    }

    return getOrCreate(inner, (raw: any) => {
      const j = Object.create(PivotJoint.prototype) as PivotJoint;
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
  // Anchor properties — lazy Vec2 wrapper setup
  // ---------------------------------------------------------------------------

  get anchor1(): Vec2 {
    if (this.zpp_inner.wrap_a1 == null) {
      this.zpp_inner.setup_a1();
    }
    return this.zpp_inner.wrap_a1;
  }
  set anchor1(value: Vec2) {
    if ((value as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor1 cannot be null");
    }
    if (this.zpp_inner.wrap_a1 == null) {
      this.zpp_inner.setup_a1();
    }
    this.zpp_inner.wrap_a1.set(value);
    _disposeWeakVec2(value);
  }

  get anchor2(): Vec2 {
    if (this.zpp_inner.wrap_a2 == null) {
      this.zpp_inner.setup_a2();
    }
    return this.zpp_inner.wrap_a2;
  }
  set anchor2(value: Vec2) {
    if ((value as any)?.zpp_disp) {
      throw new Error("Error: Vec2 has been disposed and cannot be used!");
    }
    if (value == null) {
      throw new Error("Error: Constraint::anchor2 cannot be null");
    }
    if (this.zpp_inner.wrap_a2 == null) {
      this.zpp_inner.setup_a2();
    }
    this.zpp_inner.wrap_a2.set(value);
    _disposeWeakVec2(value);
  }

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  override impulse(): MatMN {
    const nape = getNape();
    const ret = new nape.geom.MatMN(2, 1);
    ret.zpp_inner.x[0] = this.zpp_inner.jAccx;
    ret.zpp_inner.x[1] = this.zpp_inner.jAccy;
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
      return nape.geom.Vec3.get();
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

  /** @internal backward compat alias for zpp_inner */
  get zpp_inner_zn(): ZPP_PivotJoint {
    return this.zpp_inner;
  }
  set zpp_inner_zn(v: ZPP_PivotJoint) {
    this.zpp_inner = v;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

ZPP_PivotJoint._wrapFn = (zpp: ZPP_PivotJoint): PivotJoint => {
  return getOrCreate(zpp, (raw: ZPP_PivotJoint) => {
    const j = Object.create(PivotJoint.prototype) as PivotJoint;
    j.zpp_inner = raw;
    raw.outer = j;
    raw.outer_zn = j;
    j.debugDraw = true;
    return j;
  });
};


